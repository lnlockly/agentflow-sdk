/**
 * Full FLOW ledger — append-only audit trail of every credit, debit, split.
 * Most users want `me.flowBalance()` for the rolled-up value; reach for this
 * when you need the line-by-line breakdown (accounting, taxes, dashboards).
 */

import type { HttpClient } from '../client.js';
import type { LedgerResponse } from '../types.js';

export interface LedgerListOptions {
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export class LedgerResource {
  constructor(private readonly http: HttpClient) {}

  list(opts: LedgerListOptions = {}): Promise<LedgerResponse> {
    return this.http.request<LedgerResponse>('/ledger', {
      query: { limit: opts.limit, cursor: opts.cursor },
      requireAuth: true,
      signal: opts.signal,
    });
  }
}
