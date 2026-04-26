/**
 * Provider keys (BYOK) — manage user-supplied third-party AI keys.
 *
 * Each user can stash their own Anthropic / OpenAI / OpenRouter / Stability /
 * ElevenLabs / etc. keys, and the agent runtime picks them up automatically
 * for tool calls so the user pays the provider directly instead of FLOW
 * mark-up.
 *
 * Wire format docs: https://docs.agentflow.website/en/wallet/provider-keys.
 *
 * Plaintext keys leave the cabinet exactly once — when calling `.add()`. The
 * server seals them with the same AES-256-GCM envelope as `git_tokens`
 * (master key in `AGENTS_MASTER_KEY`) and only ever returns a masked
 * 8-char prefix on subsequent reads.
 */

import type { HttpClient } from '../client.js';
import type {
  OkResponse,
  ProviderCatalogResponse,
  ProviderKeyAddRequest,
  ProviderKeyResponse,
  ProviderKeyTestResponse,
  ProviderKeyUpdateRequest,
  ProviderKeysListResponse,
} from '../types.js';

export class ProviderKeysResource {
  constructor(private readonly http: HttpClient) {}

  /** Static catalog of supported providers grouped by category. */
  catalog(opts: { signal?: AbortSignal } = {}): Promise<ProviderCatalogResponse> {
    return this.http.request<ProviderCatalogResponse>('/me/provider-keys/catalog', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** List the caller's active provider keys (masked). */
  list(opts: { signal?: AbortSignal } = {}): Promise<ProviderKeysListResponse> {
    return this.http.request<ProviderKeysListResponse>('/me/provider-keys', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /**
   * Add a new key. The plaintext `value` is sealed server-side; the response
   * already returns only the masked shape. Validates required fields locally
   * to surface a clearer error than the server's generic 400.
   */
  add(
    input: ProviderKeyAddRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ProviderKeyResponse> {
    if (!input || typeof input !== 'object') {
      throw new TypeError('providerKeys.add: input is required');
    }
    if (!input.category) throw new TypeError('providerKeys.add: category is required');
    if (!input.provider) throw new TypeError('providerKeys.add: provider is required');
    if (!input.auth_type) throw new TypeError('providerKeys.add: auth_type is required');
    if (!input.value) throw new TypeError('providerKeys.add: value is required');
    return this.http.request<ProviderKeyResponse>('/me/provider-keys', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** Patch a key. Useful for reorder (rotation_priority) and label. */
  update(
    id: number | string,
    patch: ProviderKeyUpdateRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ProviderKeyResponse> {
    return this.http.request<ProviderKeyResponse>(
      `/me/provider-keys/${encodeURIComponent(String(id))}`,
      {
        method: 'PATCH',
        body: patch,
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  /** Soft-revoke. The key vanishes from `list()` and the runtime stops using it. */
  revoke(id: number | string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/me/provider-keys/${encodeURIComponent(String(id))}`,
      {
        method: 'DELETE',
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  /**
   * Best-effort key validation — for catalog entries with a documented
   * `testUrl`, the server hits it with the unsealed value and records the
   * outcome on the row. For providers without a cheap test endpoint
   * (Pika, Cartesia, Runway) the server returns ok=true without making
   * any network call.
   */
  test(
    id: number | string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ProviderKeyTestResponse> {
    return this.http.request<ProviderKeyTestResponse>(
      `/me/provider-keys/${encodeURIComponent(String(id))}/test`,
      {
        method: 'POST',
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }
}
