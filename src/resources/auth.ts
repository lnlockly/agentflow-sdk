import type { HttpClient } from '../client.js';
import type {
  NonceResponse,
  OkResponse,
  VerifyRequest,
  VerifyResponse,
} from '../types.js';

export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /** Request a SIWE nonce for a wallet address. */
  nonce(input: { address: string }, opts: { signal?: AbortSignal } = {}): Promise<NonceResponse> {
    return this.http.request<NonceResponse>('/auth/nonce', {
      method: 'POST',
      body: input,
      signal: opts.signal,
    });
  }

  /**
   * Verify SIWE signature. On success the API issues a `Set-Cookie: af_session=...`
   * which the client captures so subsequent requests are authenticated.
   */
  verify(
    input: VerifyRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<VerifyResponse> {
    return this.http.request<VerifyResponse>('/auth/verify', {
      method: 'POST',
      body: input,
      signal: opts.signal,
    });
  }

  /** Submit a one-time access code (early-access gating). */
  accessCode(input: { code: string }, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>('/auth/access-code', {
      method: 'POST',
      body: input,
      signal: opts.signal,
    });
  }

  /** Complete login via Telegram Login Widget payload. */
  telegram(payload: Record<string, unknown>, opts: { signal?: AbortSignal } = {}): Promise<VerifyResponse> {
    return this.http.request<VerifyResponse>('/auth/telegram', {
      method: 'POST',
      body: payload,
      signal: opts.signal,
    });
  }

  /** Drop the current session (clears the `af_session` cookie). */
  async logout(opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    const res = await this.http.request<OkResponse>('/auth/logout', {
      method: 'POST',
      signal: opts.signal,
    });
    this.http.cookie = undefined;
    this.http.bearerToken = undefined;
    return res;
  }
}
