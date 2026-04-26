/**
 * Public leads intake — feeds the same backend the landing page uses for
 * its forms. No auth required. Use this when wiring an external form or
 * intake bot to AgentFlow's lead pipeline.
 */

import type { HttpClient } from '../client.js';
import type { LeadCreateRequest, LeadCreateResponse } from '../types.js';

export class LeadsResource {
  constructor(private readonly http: HttpClient) {}

  create(
    input: LeadCreateRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<LeadCreateResponse> {
    return this.http.request<LeadCreateResponse>('/leads', {
      method: 'POST',
      body: input,
      signal: opts.signal,
    });
  }
}
