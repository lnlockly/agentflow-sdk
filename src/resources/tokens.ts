import type { HttpClient } from '../client.js';
import type {
  ListOptions,
  TokenCreateRequest,
  TokenHoldersResponse,
  TokenItem,
  TokenListResponse,
} from '../types.js';

export interface TokenGetResponse {
  ok: true;
  token: TokenItem;
  [k: string]: unknown;
}

export class TokensResource {
  constructor(private readonly http: HttpClient) {}

  list(opts: ListOptions & { signal?: AbortSignal } = {}): Promise<TokenListResponse> {
    return this.http.request<TokenListResponse>('/tokens', {
      query: { limit: opts.limit, cursor: opts.cursor },
      signal: opts.signal,
    });
  }

  /** Auto-paginate over all tokens via cursor. */
  async *listAll(
    opts: { limit?: number; signal?: AbortSignal } = {},
  ): AsyncIterable<TokenItem> {
    let cursor: string | undefined;
    while (true) {
      const page: TokenListResponse = await this.list({
        limit: opts.limit,
        cursor,
        signal: opts.signal,
      });
      for (const item of page.items) yield item;
      if (!page.next_cursor) return;
      cursor = page.next_cursor;
    }
  }

  get(slug: string, opts: { signal?: AbortSignal } = {}): Promise<TokenGetResponse> {
    return this.http.request<TokenGetResponse>(`/tokens/${encodeURIComponent(slug)}`, {
      signal: opts.signal,
    });
  }

  holders(
    slug: string,
    opts: ListOptions & { signal?: AbortSignal } = {},
  ): Promise<TokenHoldersResponse> {
    return this.http.request<TokenHoldersResponse>(
      `/tokens/${encodeURIComponent(slug)}/holders`,
      {
        query: { limit: opts.limit, cursor: opts.cursor },
        signal: opts.signal,
      },
    );
  }

  /** Create a new launchpad token. Auth required. */
  create(input: TokenCreateRequest, opts: { signal?: AbortSignal } = {}): Promise<{ ok: true; token: TokenItem }> {
    return this.http.request('/tokens', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }
}
