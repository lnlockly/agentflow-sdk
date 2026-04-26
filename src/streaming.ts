/**
 * Hand-rolled SSE parser that works on top of the WHATWG Fetch streams API.
 *
 * Why not the `eventsource` package? It's Node-only, doesn't propagate
 * cookies/Authorization headers cleanly, and lacks AbortSignal support. The
 * fetch + ReadableStream approach works in Node 18+, modern browsers, and Bun.
 */

import { NetworkError } from './errors.js';
import type { ProjectStreamMessage } from './types.js';

export interface SseConnectOptions {
  signal?: AbortSignal;
  /** Receive every parsed event. */
  onEvent: (msg: ProjectStreamMessage) => void;
  /** Optional handler for parse errors (does not abort the stream). */
  onError?: (err: Error) => void;
}

/**
 * Consume an SSE stream from a `Response` whose body is a ReadableStream.
 * Resolves when the stream closes naturally; rejects on network errors or abort.
 */
export async function consumeSseResponse(
  response: Response,
  opts: SseConnectOptions,
): Promise<void> {
  if (!response.body) {
    throw new NetworkError('SSE response has no body');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const onAbort = () => {
    reader.cancel(opts.signal?.reason).catch(() => {});
  };
  if (opts.signal) {
    if (opts.signal.aborted) {
      reader.cancel(opts.signal.reason).catch(() => {});
      throw opts.signal.reason ?? new NetworkError('SSE aborted');
    }
    opts.signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by a blank line (\n\n or \r\n\r\n).
      let idx: number;
      while ((idx = findMessageBoundary(buffer)) !== -1) {
        const raw = buffer.slice(0, idx);
        // boundary is either \n\n or \r\n\r\n
        const advance = buffer.startsWith('\r\n\r\n', idx) ? 4 : buffer[idx + 1] === '\n' ? 2 : 2;
        buffer = buffer.slice(idx + advance);
        if (!raw.trim()) continue;
        try {
          const msg = parseSseBlock(raw);
          if (msg) opts.onEvent(msg);
        } catch (err) {
          opts.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }
    // Flush any trailing partial.
    if (buffer.trim()) {
      try {
        const msg = parseSseBlock(buffer);
        if (msg) opts.onEvent(msg);
      } catch (err) {
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  } finally {
    opts.signal?.removeEventListener('abort', onAbort);
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}

function findMessageBoundary(buf: string): number {
  const a = buf.indexOf('\n\n');
  const b = buf.indexOf('\r\n\r\n');
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

/**
 * Parse a single SSE message block (without the trailing blank line).
 * Returns null for comment-only blocks.
 */
export function parseSseBlock(block: string): ProjectStreamMessage | null {
  let event = 'message';
  let id: string | undefined;
  const dataLines: string[] = [];
  let sawAnyField = false;

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine) continue;
    if (rawLine.startsWith(':')) continue; // comment
    const colon = rawLine.indexOf(':');
    let field: string;
    let value: string;
    if (colon === -1) {
      field = rawLine;
      value = '';
    } else {
      field = rawLine.slice(0, colon);
      value = rawLine.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
    }
    sawAnyField = true;
    switch (field) {
      case 'event':
        event = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        id = value;
        break;
      default:
        // ignore retry/unknown
        break;
    }
  }

  if (!sawAnyField) return null;
  const dataStr = dataLines.join('\n');
  let data: unknown = dataStr;
  if (dataStr) {
    try {
      data = JSON.parse(dataStr);
    } catch {
      data = dataStr;
    }
  } else {
    data = '';
  }
  return { event, data, ...(id !== undefined ? { id } : {}) };
}
