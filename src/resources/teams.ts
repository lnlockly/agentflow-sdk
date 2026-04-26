/**
 * Teams — multi-agent orchestration. Maps to /me/teams on the agents
 * service. The full management surface (members, dispatch, recurring
 * schedules) is exposed as raw passthroughs since the backing schema is
 * still iterating; concrete typed methods land once the shape stabilises.
 */

import type { HttpClient } from '../client.js';
import type { OkResponse, TeamsListResponse, TeamSummary } from '../types.js';

export class TeamsResource {
  constructor(private readonly http: HttpClient) {}

  list(opts: { signal?: AbortSignal } = {}): Promise<TeamsListResponse> {
    return this.http.request<TeamsListResponse>('/me/teams', {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  get(id: number | string, opts: { signal?: AbortSignal } = {}): Promise<{ ok: true; team: TeamSummary }> {
    return this.http.request(`/me/teams/${encodeURIComponent(String(id))}`, {
      requireAuth: true,
      signal: opts.signal,
    });
  }

  create<T = unknown>(input: Record<string, unknown>, opts: { signal?: AbortSignal } = {}): Promise<T> {
    return this.http.request<T>('/me/teams', {
      method: 'POST',
      body: input,
      requireAuth: true,
      signal: opts.signal,
    });
  }

  addMember(
    id: number | string,
    member: { slug: string; role?: string },
    opts: { signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/me/teams/${encodeURIComponent(String(id))}/members`,
      {
        method: 'POST',
        body: member,
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  removeMember(
    id: number | string,
    slug: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.http.request<OkResponse>(
      `/me/teams/${encodeURIComponent(String(id))}/members/${encodeURIComponent(slug)}`,
      {
        method: 'DELETE',
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }

  /** Dispatch a task to the team — orchestration entrypoint. */
  dispatch<T = unknown>(
    id: number | string,
    task: Record<string, unknown>,
    opts: { signal?: AbortSignal } = {},
  ): Promise<T> {
    return this.http.request<T>(
      `/me/teams/${encodeURIComponent(String(id))}/dispatch`,
      {
        method: 'POST',
        body: task,
        requireAuth: true,
        signal: opts.signal,
      },
    );
  }
}
