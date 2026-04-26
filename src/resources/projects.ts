import type { HttpClient } from '../client.js';
import { consumeSseResponse } from '../streaming.js';
import type {
  OkResponse,
  ProjectCreateRequest,
  ProjectGetResponse,
  ProjectStreamMessage,
} from '../types.js';

export interface ProjectStreamHandle {
  /** Resolves when the stream closes naturally. Rejects on abort/network error. */
  done: Promise<void>;
  /** Stop the stream early. */
  close(): void;
}

export class ProjectsResource {
  constructor(private readonly http: HttpClient) {}

  get(slug: string, opts: { signal?: AbortSignal } = {}): Promise<ProjectGetResponse> {
    return this.http.request<ProjectGetResponse>(
      `/projects/${encodeURIComponent(slug)}`,
      { signal: opts.signal },
    );
  }

  create(input: ProjectCreateRequest, opts: { signal?: AbortSignal } = {}): Promise<ProjectGetResponse> {
    return this.http.request<ProjectGetResponse>('/projects', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  start(slug: string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(`/projects/${encodeURIComponent(slug)}/start`, {
      method: 'POST',
      requireAuth: true,
      signal: opts.signal,
    });
  }

  subscribe(
    slug: string,
    input: Record<string, unknown> = {},
    opts: { signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/projects/${encodeURIComponent(slug)}/subscribe`,
      {
        method: 'POST',
        body: input,
        signal: opts.signal,
      },
    );
  }

  /**
   * Connect to the project's SSE event feed.
   *
   * The handler is called for each incoming event (`event`, `backfill_done`,
   * `ping`, ...). The returned `done` promise resolves when the server closes
   * the connection; call `close()` to stop early.
   */
  stream(
    slug: string,
    onEvent: (msg: ProjectStreamMessage) => void,
    opts: { signal?: AbortSignal; onError?: (e: Error) => void } = {},
  ): ProjectStreamHandle {
    const ctrl = new AbortController();
    const onParentAbort = () => ctrl.abort(opts.signal?.reason);
    if (opts.signal) {
      if (opts.signal.aborted) ctrl.abort(opts.signal.reason);
      else opts.signal.addEventListener('abort', onParentAbort, { once: true });
    }

    const done = (async () => {
      try {
        const res = await this.http.request<Response>(
          `/projects/${encodeURIComponent(slug)}/stream`,
          {
            parse: 'stream',
            // Don't auto-retry SSE — caller handles reconnection.
            retries: 0,
            headers: { accept: 'text/event-stream' },
            signal: ctrl.signal,
          },
        );
        await consumeSseResponse(res, {
          signal: ctrl.signal,
          onEvent,
          ...(opts.onError ? { onError: opts.onError } : {}),
        });
      } finally {
        opts.signal?.removeEventListener('abort', onParentAbort);
      }
    })();

    return {
      done,
      close: () => ctrl.abort(new Error('Stream closed by caller')),
    };
  }
}
