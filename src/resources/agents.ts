/**
 * Agents resource — CRUD + chat against the user's own agents.
 *
 * `chat()` is the headline method: pass `{ text }` or `{ messages }` and a
 * stream flag, get either an async-iterable of SSE events or a buffered
 * result. The endpoint bills via FLOW (pre-charge gate, settle on completion);
 * see headers `x-flow-balance` and `x-flow-precharge` for context.
 *
 * The chat path proxies an Eliza session under the hood — Eliza tracks turn
 * history per session, so `messages[]` is a convenience for OpenAI-style
 * clients. Only the LAST user message drives the turn; other roles are
 * dropped (Eliza already has them server-side).
 *
 * Note on auth: chat works with cookie / bearer / x-api-key. For third-
 * party automations we recommend minting a key via /me/api-keys and setting
 * `apiKey` on the SDK.
 */

import type { HttpClient } from '../client.js';
import { consumeSseResponse } from '../streaming.js';
import type {
  AgentChatEvent,
  AgentChatRequest,
  AgentChatResult,
  AgentCreateRequest,
  AgentResponse,
  AgentsListResponse,
  AgentStateResponse,
  AgentSummary,
  OkResponse,
} from '../types.js';

export class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  /** List the caller's own agents. Auth required. */
  list(opts: { signal?: AbortSignal } = {}): Promise<AgentsListResponse> {
    return this.http.request<AgentsListResponse>('/agents', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  get(slug: string, opts: { signal?: AbortSignal } = {}): Promise<AgentResponse> {
    return this.http.request<AgentResponse>(`/agents/${encodeURIComponent(slug)}`, {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  create(input: AgentCreateRequest, opts: { signal?: AbortSignal } = {}): Promise<AgentResponse> {
    return this.http.request<AgentResponse>('/agents', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** Patch the system prompt — `system` is the only field exposed today. */
  update(
    slug: string,
    patch: { system?: string },
    opts: { signal?: AbortSignal } = {},
  ): Promise<{ ok: true; agent?: AgentSummary }> {
    return this.http.request(`/agents/${encodeURIComponent(slug)}/settings`, {
      method: 'POST',
      body: patch,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  delete(slug: string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(`/agents/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      requireAuth: true,
      signal: opts.signal,
    });
  }

  state(slug: string, opts: { signal?: AbortSignal } = {}): Promise<AgentStateResponse> {
    return this.http.request<AgentStateResponse>(`/agents/${encodeURIComponent(slug)}/state`, {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  redeploy(slug: string, opts: { signal?: AbortSignal } = {}): Promise<AgentResponse> {
    return this.http.request<AgentResponse>(`/agents/${encodeURIComponent(slug)}/redeploy`, {
      method: 'POST',
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /**
   * Streaming chat — yields parsed SSE events as they arrive. Use this when
   * you want token-by-token UI rendering or to inspect tool invocations.
   *
   *   for await (const ev of af.agents.chatStream('tg-457c1d', { text: 'hi' })) {
   *     console.log(ev.event, ev.data);
   *   }
   */
  async *chatStream(
    slug: string,
    body: AgentChatRequest,
    opts: { signal?: AbortSignal } = {},
  ): AsyncIterable<AgentChatEvent> {
    const response = await this.http.request<Response>(
      `/agents/${encodeURIComponent(slug)}/chat`,
      {
        method: 'POST',
        body: { ...body, stream: true },
        parse: 'stream',
        requireAuth: true,
        signal: opts.signal,
        // SSE responses can stay open for minutes — disable retry to avoid
        // duplicating user-visible turns.
        retries: 0,
      },
    );

    // Push events through a queue so we can yield them from the consumer.
    const queue: AgentChatEvent[] = [];
    let resolveNext: (() => void) | null = null;
    let done = false;
    let error: Error | null = null;

    const consumer = consumeSseResponse(response, {
      signal: opts.signal,
      onEvent: (ev) => {
        queue.push(ev as AgentChatEvent);
        resolveNext?.();
        resolveNext = null;
      },
      onError: (err) => {
        error = err;
        resolveNext?.();
        resolveNext = null;
      },
    })
      .catch((err) => {
        error = err instanceof Error ? err : new Error(String(err));
      })
      .finally(() => {
        done = true;
        resolveNext?.();
        resolveNext = null;
      });

    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
          continue;
        }
        if (done) break;
        await new Promise<void>((res) => {
          resolveNext = res;
        });
      }
      if (error) throw error;
    } finally {
      // Ensure the consumer doesn't leak even if the caller breaks early.
      await consumer;
    }
  }

  /**
   * Buffered chat — drains the SSE stream into a single result. The agent's
   * final reply is in `content`; tool calls (if any) are listed under
   * `tools`. Use `chatStream()` if you want the events as they arrive.
   */
  async chat(
    slug: string,
    body: AgentChatRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<AgentChatResult> {
    const events: AgentChatEvent[] = [];
    let content = '';
    const tools: Array<{ name: string | null; content: string }> = [];
    let balanceRemaining: string | null = null;

    for await (const ev of this.chatStream(slug, body, opts)) {
      events.push(ev);
      const data = ev.data as Record<string, unknown> | undefined;
      switch (ev.event) {
        case 'done': {
          // Eliza's terminal frame carries the parsed assistant text under
          // a few possible shapes — accept any string field that looks
          // right so we tolerate framing changes.
          if (data && typeof data === 'object') {
            const d = data as Record<string, unknown>;
            const text =
              (typeof d['text'] === 'string' && d['text']) ||
              (typeof d['content'] === 'string' && d['content']) ||
              '';
            if (text) content = text;
            const toolList = d['tools'];
            if (Array.isArray(toolList)) {
              for (const t of toolList) {
                if (t && typeof t === 'object') {
                  const tt = t as Record<string, unknown>;
                  tools.push({
                    name: typeof tt['name'] === 'string' ? tt['name'] : null,
                    content: typeof tt['content'] === 'string' ? tt['content'] : '',
                  });
                }
              }
            }
          }
          break;
        }
        case 'flow_meta': {
          if (data && typeof data === 'object') {
            const d = data as Record<string, unknown>;
            const b = d['balance_remaining'];
            if (typeof b === 'string' || typeof b === 'number') {
              balanceRemaining = String(b);
            }
          }
          break;
        }
        default:
          break;
      }
    }

    return {
      ok: true,
      content,
      tools,
      flow_balance_remaining: balanceRemaining,
      raw_events: events,
    };
  }
}
