import type { HttpClient } from '../client.js';
import type {
  ListOptions,
  OkResponse,
  PayoutItem,
  PayoutListResponse,
  PayoutRequestInput,
} from '../types.js';

export interface PayoutResponse {
  ok: true;
  payout: PayoutItem;
  [k: string]: unknown;
}

export class PayoutsResource {
  constructor(private readonly http: HttpClient) {}

  request(input: PayoutRequestInput, opts: { signal?: AbortSignal } = {}): Promise<PayoutResponse> {
    return this.http.request<PayoutResponse>('/me/payouts/request', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  list(opts: ListOptions & { signal?: AbortSignal } = {}): Promise<PayoutListResponse> {
    return this.http.request<PayoutListResponse>('/me/payouts', {
      query: { limit: opts.limit, cursor: opts.cursor },
      requireAuth: true,
      signal: opts.signal,
    });
  }

  get(id: number | string, opts: { signal?: AbortSignal } = {}): Promise<PayoutResponse> {
    return this.http.request<PayoutResponse>(`/me/payouts/${encodeURIComponent(String(id))}`, {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  cancel(id: number | string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(`/me/payouts/${encodeURIComponent(String(id))}/cancel`, {
      method: 'POST',
      requireAuth: true,
      signal: opts.signal,
    });
  }
}
