/**
 * Unified marketplace + launchpad search.
 *
 *   af.search.query('vpn')             — agents + tokens, up to 20 hits
 *   af.search.query('vpn', { type: 'agent' })  — agents only
 *
 * Public endpoint — no auth required.
 */

import type { HttpClient } from '../client.js';
import type { SearchHit, SearchResponse } from '../types.js';

export interface SearchOptions {
  type?: 'agent' | 'token' | 'all';
  limit?: number;
  signal?: AbortSignal;
}

export class SearchResource {
  constructor(private readonly http: HttpClient) {}

  query(q: string, opts: SearchOptions = {}): Promise<SearchResponse> {
    return this.http.request<SearchResponse>('/search', {
      query: { q, type: opts.type ?? 'all', limit: opts.limit },
      signal: opts.signal,
    });
  }

  /** Convenience that returns just the items array. */
  async items(q: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
    const r = await this.query(q, opts);
    return r.items;
  }
}
