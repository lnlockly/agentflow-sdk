/**
 * Knowledge base — per-agent document store with embedding-backed search.
 * Backing routes live at /agents/:slug/knowledge on the agents service.
 *
 * Upload is a JSON body for now (`{ title, content }`); the route accepts
 * larger files via the same path with `content-type: application/json`. A
 * multipart variant is on the roadmap; until then chunk client-side.
 */

import type { HttpClient } from '../client.js';
import type { KbListResponse, KbSearchResponse, OkResponse } from '../types.js';

export class KnowledgeResource {
  constructor(private readonly http: HttpClient) {}

  list(slug: string, opts: { signal?: AbortSignal } = {}): Promise<KbListResponse> {
    return this.http.request<KbListResponse>(
      `/agents/${encodeURIComponent(slug)}/knowledge`,
      { requireAuth: true, signal: opts.signal },
    );
  }

  /** Upload a document — `{ title, content }`. Returns the persisted row. */
  upload<T = unknown>(
    slug: string,
    doc: { title: string; content: string; meta?: Record<string, unknown> },
    opts: { signal?: AbortSignal } = {},
  ): Promise<T> {
    return this.http.request<T>(
      `/agents/${encodeURIComponent(slug)}/knowledge`,
      {
        method: 'POST',
        body: doc,
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  search(
    slug: string,
    q: string,
    opts: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<KbSearchResponse> {
    return this.http.request<KbSearchResponse>(
      `/agents/${encodeURIComponent(slug)}/knowledge/search`,
      {
        query: { q, limit: opts.limit },
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  delete(
    slug: string,
    docId: number | string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/agents/${encodeURIComponent(slug)}/knowledge/${encodeURIComponent(String(docId))}`,
      {
        method: 'DELETE',
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }
}
