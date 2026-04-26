/**
 * API key management — CRUD against /me/api-keys.
 *
 * The wire format is documented at https://docs.agentflow.website/en/api/api-keys.
 *
 * IMPORTANT: `create()` returns the raw key in the `key` field exactly
 * once. Subsequent calls (including `list()`) only echo the prefix. Save
 * the key into your secret store immediately — there is no recovery flow.
 *
 * To rotate: create a new key, swap your service config, then revoke the
 * old key. Both can co-exist while you redeploy.
 */

import type { HttpClient } from '../client.js';
import type {
  ApiKey,
  ApiKeyCreated,
  ApiKeyCreateRequest,
  ApiKeysListResponse,
  OkResponse,
} from '../types.js';

export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Mint a new API key. Auth required (cookie / bearer / x-api-key).
   * The returned `key` is shown ONCE — persist it immediately.
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
}
