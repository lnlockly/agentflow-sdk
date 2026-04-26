/**
 * Referral analytics — direct + multi-level invite tree, plus the ledger
 * slice scoped to `referral_reward` entries.
 *
 *   await af.referrals.stats();
 *   await af.referrals.tree({ depth: 2, limit: 50 });
 *   await af.referrals.earnings({ limit: 100 });
 */

import type { HttpClient } from '../client.js';
import type {
  ReferralEarningsResponse,
  ReferralStats,
} from '../types.js';

export interface ReferralTreeOptions {
  depth?: number;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export interface ReferralEarningsOptions {
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export class ReferralsResource {
  constructor(private readonly http: HttpClient) {}

  stats(opts: { signal?: AbortSignal } = {}): Promise<ReferralStats> {
    return this.http.request<ReferralStats>('/referrals/stats', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  tree<T = unknown>(opts: ReferralTreeOptions = {}): Promise<T> {
    return this.http.request<T>('/referrals/tree', {
      query: { depth: opts.depth, limit: opts.limit, cursor: opts.cursor },
      requireAuth: true,
      signal: opts.signal,
    });
  }

  earnings(opts: ReferralEarningsOptions = {}): Promise<ReferralEarningsResponse> {
    return this.http.request<ReferralEarningsResponse>('/referrals/earnings', {
      query: { limit: opts.limit, cursor: opts.cursor },
      requireAuth: true,
      signal: opts.signal,
    });
  }
}
