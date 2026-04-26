import type { HttpClient } from '../client.js';
import type {
  CheckoutRequest,
  CheckoutResponse,
  SubscriptionResponse,
} from '../types.js';

export class SubscriptionsResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a checkout session for a subscription tier. */
  checkout(input: CheckoutRequest, opts: { signal?: AbortSignal } = {}): Promise<CheckoutResponse> {
    return this.http.request<CheckoutResponse>('/subscriptions/checkout', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** Convenience mirror of `me.subscription()`. */
  current(opts: { signal?: AbortSignal } = {}): Promise<SubscriptionResponse> {
    return this.http.request<SubscriptionResponse>('/me/subscription', {
      requireAuth: true,
      signal: opts.signal,
    });
  }
}
