/**
 * Outbound webhook subscriptions — subscribe to platform events scoped to
 * the caller's user. Receivers verify the `X-AgentFlow-Signature` header
 * (Stripe-style: `t=<unix>,v1=<hex>`).
 *
 * Verification example (Node):
 *
 *   import { createHmac, timingSafeEqual } from 'node:crypto';
 *   function verify(secret, header, body) {
 *     const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
 *     const expected = createHmac('sha256', secret)
 *       .update(`${parts.t}.${body}`).digest('hex');
 *     const a = Buffer.from(expected, 'hex');
 *     const b = Buffer.from(parts.v1, 'hex');
 *     return a.length === b.length && timingSafeEqual(a, b);
 *   }
 */

import type { HttpClient } from '../client.js';
import type {
  OkResponse,
  WebhookCreateRequest,
  WebhookEventsResponse,
  WebhookResponse,
  WebhooksListResponse,
} from '../types.js';

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /** List subscribable event names the API knows about. */
  events(opts: { signal?: AbortSignal } = {}): Promise<WebhookEventsResponse> {
    return this.http.request<WebhookEventsResponse>('/me/webhooks/events', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  create(
    input: WebhookCreateRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<WebhookResponse> {
    return this.http.request<WebhookResponse>('/me/webhooks', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  list(opts: { signal?: AbortSignal } = {}): Promise<WebhooksListResponse> {
    return this.http.request<WebhooksListResponse>('/me/webhooks', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  delete(id: number | string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/me/webhooks/${encodeURIComponent(String(id))}`,
      {
        method: 'DELETE',
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  /** Fire a synthetic test ping at the registered URL. */
  test(id: number | string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/me/webhooks/${encodeURIComponent(String(id))}/test`,
      {
        method: 'POST',
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }
}
