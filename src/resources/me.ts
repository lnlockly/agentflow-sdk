import type { HttpClient } from '../client.js';
import type {
  FlowBalanceResponse,
  MeResponse,
  OkResponse,
  SubscriptionResponse,
} from '../types.js';

export class MeResource {
  constructor(private readonly http: HttpClient) {}

  /** Current user with wallet, balance, ref code. Auth required. */
  get(opts: { signal?: AbortSignal } = {}): Promise<MeResponse> {
    return this.http.request<MeResponse>('/me', { requireAuth: true, signal: opts.signal });
  }

  /** List agents owned by the current user. Auth required. */
  agents<T = unknown>(opts: { signal?: AbortSignal } = {}): Promise<T> {
    return this.http.request<T>('/me/agents', { requireAuth: true, signal: opts.signal });
  }

  /** Current subscription tier and validity. */
  subscription(opts: { signal?: AbortSignal } = {}): Promise<SubscriptionResponse> {
    return this.http.request<SubscriptionResponse>('/me/subscription', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** FLOW balance breakdown. */
  flowBalance(opts: { signal?: AbortSignal } = {}): Promise<FlowBalanceResponse> {
    return this.http.request<FlowBalanceResponse>('/me/flow-balance', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** Initiate a Telegram link (returns provisional state). */
  linkTelegram<T = unknown>(input: Record<string, unknown> = {}, opts: { signal?: AbortSignal } = {}): Promise<T> {
    return this.http.request<T>('/me/link-telegram', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** Convenience: just the FLOW balance string. */
  async flowBalanceValue(opts: { signal?: AbortSignal } = {}): Promise<string> {
    const r = await this.flowBalance(opts);
    return r.balance_flow;
  }

  /** Mark this method explicitly: clearer for SDK users than chasing `subscription()`. */
  hasActiveSubscription = async (opts: { signal?: AbortSignal } = {}): Promise<boolean> => {
    const r = await this.subscription(opts);
    return Boolean(r.active);
  };

  /**
   * Returned only because some SDK users want a single object dump.
   * `_raw('/me')` is escape-hatch territory; prefer typed methods above.
   */
  _raw<T = OkResponse>(path: string, opts: { signal?: AbortSignal } = {}): Promise<T> {
    return this.http.request<T>(path, { requireAuth: true, signal: opts.signal });
  }
}
