/**
 * API key management — CRUD + metering against /me/api-keys.
 *
 * The wire format is documented at https://docs.agentflow.website/en/api/api-keys.
 *
 * IMPORTANT: `create()` returns the raw key in the `key` field exactly
 * once. Subsequent calls (including `list()`) only echo the prefix. Save
 * the key into your secret store immediately — there is no recovery flow.
 *
 * To rotate: create a new key, swap your service config, then revoke the
 * old key. Both can co-exist while you redeploy.
 *
 * Per-key metering (rate limit + spend cap) is enforced server-side. The
 * SDK simply passes the configured limits at creation/update time and lets
 * the API surface 429 / 402 responses, which the HttpClient maps to
 * RateLimitError / ApiError respectively.
 */

import type { HttpClient } from '../client.js';
import type {
  ApiKey,
  ApiKeyCreated,
  ApiKeyCreateRequest,
  ApiKeyGetResponse,
  ApiKeyRecentResponse,
  ApiKeyUpdateRequest,
  ApiKeyUsageStats,
  ApiKeyUsageWindow,
  ApiKeysListResponse,
  OkResponse,
} from '../types.js';

export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Mint a new API key. Auth required (cookie / bearer / x-api-key).
   * The returned `key` is shown ONCE — persist it immediately.
   *
   * Optional limits:
   *   - `rate_limit_rpm` — requests/min cap (0 = unlimited; default 60).
   *   - `spend_limit_flow` — FLOW per period cap (string/number; null = no cap).
   *   - `spend_period` — `'day' | 'week' | 'month' | 'forever'` (default 'month').
   */
  create(
    input: ApiKeyCreateRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ApiKeyCreated> {
    return this.http.request<ApiKeyCreated>('/me/api-keys', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** List the caller's active (non-revoked) API keys. */
  list(opts: { signal?: AbortSignal } = {}): Promise<ApiKeysListResponse> {
    return this.http.request<ApiKeysListResponse>('/me/api-keys', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /**
   * Convenience: same as `list()` but returns just the items array.
   * Useful when you don't care about the response envelope.
   */
  async listItems(opts: { signal?: AbortSignal } = {}): Promise<ApiKey[]> {
    const r = await this.list(opts);
    return r.items;
  }

  /** Fetch a single key by id (active keys only — revoked → 404). */
  get(
    id: number | string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ApiKeyGetResponse> {
    return this.http.request<ApiKeyGetResponse>(
      `/me/api-keys/${encodeURIComponent(String(id))}`,
      { requireAuth: true, signal: opts.signal },
    );
  }

  /**
   * Patch one or more fields on an existing key. Updating `spend_period`
   * resets `spend_period_used` to 0 — switching periods would otherwise
   * leave the cap accounting in an ambiguous state.
   */
  update(
    id: number | string,
    patch: ApiKeyUpdateRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ApiKeyGetResponse> {
    return this.http.request<ApiKeyGetResponse>(
      `/me/api-keys/${encodeURIComponent(String(id))}`,
      {
        method: 'PATCH',
        body: patch,
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  /**
   * Soft-revoke a key by id. Subsequent requests sending the revoked
   * key in `x-api-key` will be rejected with 401.
   */
  revoke(id: number | string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/me/api-keys/${encodeURIComponent(String(id))}`,
      {
        method: 'DELETE',
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  /**
   * Aggregated usage stats for the key. `since` defaults to `'month'`
   * (rolling 30 days). The `'all'` window pulls every row ever logged
   * for the key — fine for dashboards, slow for very chatty keys.
   */
  usage(
    id: number | string,
    args: { since?: ApiKeyUsageWindow; signal?: AbortSignal } = {},
  ): Promise<ApiKeyUsageStats> {
    const since = args.since ?? 'month';
    return this.http.request<ApiKeyUsageStats>(
      `/me/api-keys/${encodeURIComponent(String(id))}/usage`,
      {
        query: { since },
        requireAuth: true,
        signal: args.signal,
      },
    );
  }

  /**
   * Recent calls (newest first) for the key. `limit` is clamped server-side
   * to 200. Each row carries endpoint / status / flow_charged / tokens /
   * model / duration_ms — same shape as `ApiKeyUsageRow`.
   */
  recent(
    id: number | string,
    args: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<ApiKeyRecentResponse> {
    return this.http.request<ApiKeyRecentResponse>(
      `/me/api-keys/${encodeURIComponent(String(id))}/recent`,
      {
        query: args.limit ? { limit: args.limit } : undefined,
        requireAuth: true,
        signal: args.signal,
      },
    );
  }
}
