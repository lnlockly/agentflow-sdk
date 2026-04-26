import type { HttpClient } from '../client.js';
import type {
  ListOptions,
  MarketplaceAgent,
  MarketplaceListResponse,
  OkResponse,
  ToolPrice,
} from '../types.js';

export interface MarketplaceAgentResponse {
  ok: true;
  agent: MarketplaceAgent;
  [k: string]: unknown;
}

export class MarketplaceResource {
  constructor(private readonly http: HttpClient) {}

  listAgents(
    opts: ListOptions & { signal?: AbortSignal } = {},
  ): Promise<MarketplaceListResponse> {
    return this.http.request<MarketplaceListResponse>('/marketplace/agents', {
      query: { limit: opts.limit, cursor: opts.cursor },
      signal: opts.signal,
    });
  }

  async *listAllAgents(
    opts: { limit?: number; signal?: AbortSignal } = {},
  ): AsyncIterable<MarketplaceAgent> {
    let cursor: string | undefined;
    while (true) {
      const page = await this.listAgents({ limit: opts.limit, cursor, signal: opts.signal });
      for (const item of page.items) yield item;
      if (!page.next_cursor) return;
      cursor = page.next_cursor;
    }
  }

  getAgent(slug: string, opts: { signal?: AbortSignal } = {}): Promise<MarketplaceAgentResponse> {
    return this.http.request<MarketplaceAgentResponse>(
      `/marketplace/agents/${encodeURIComponent(slug)}`,
      { signal: opts.signal },
    );
  }

  publish(
    slug: string,
    input: { marketplace_meta?: Record<string, unknown> } = {},
    opts: { signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.http.request<OkResponse>(`/agents/${encodeURIComponent(slug)}/publish`, {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  unpublish(slug: string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(`/agents/${encodeURIComponent(slug)}/unpublish`, {
      method: 'POST',
      requireAuth: true,
      signal: opts.signal,
    });
  }

  setToolPrices(
    slug: string,
    prices: ToolPrice[],
    opts: { signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/agents/${encodeURIComponent(slug)}/tool-prices`,
      {
        method: 'POST',
        body: { prices },
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }
}
