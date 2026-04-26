import type { HttpClient } from '../client.js';
import type { AiAssistRequest, AiAssistResponse } from '../types.js';

export class AiAssistResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Generic AI assist call. Convenience wrappers below set `mode` for you.
   */
  call(input: AiAssistRequest, opts: { signal?: AbortSignal } = {}): Promise<AiAssistResponse> {
    return this.http.request<AiAssistResponse>('/tokens/ai-assist', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  token(
    brief: string,
    opts: { regenerate?: boolean; image?: boolean; signal?: AbortSignal } = {},
  ): Promise<AiAssistResponse> {
    return this.call(
      { brief, mode: 'token', regenerate: opts.regenerate, image: opts.image },
      { ...(opts.signal ? { signal: opts.signal } : {}) },
    );
  }

  project(
    brief: string,
    opts: { regenerate?: boolean; image?: boolean; signal?: AbortSignal } = {},
  ): Promise<AiAssistResponse> {
    return this.call(
      { brief, mode: 'project', regenerate: opts.regenerate, image: opts.image },
      { ...(opts.signal ? { signal: opts.signal } : {}) },
    );
  }

  listing(
    brief: string,
    opts: { regenerate?: boolean; image?: boolean; signal?: AbortSignal } = {},
  ): Promise<AiAssistResponse> {
    return this.call(
      { brief, mode: 'listing', regenerate: opts.regenerate, image: opts.image },
      { ...(opts.signal ? { signal: opts.signal } : {}) },
    );
  }
}
