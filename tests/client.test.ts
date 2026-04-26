import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../src/client.js';
import {
  ApiError,
  AuthRequiredError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../src/errors.js';

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

describe('HttpClient', () => {
  it('parses JSON body on 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, foo: 'bar' }));
    const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const res = await c.request<{ foo: string }>('/x');
    expect(res.foo).toBe('bar');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps 401 to AuthRequiredError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { ok: false, error: 'unauth' }));
    const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    await expect(c.request('/x')).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('maps 403 / 404 / 400 / 429 / 500', async () => {
    for (const [status, klass] of [
      [403, ForbiddenError],
      [404, NotFoundError],
      [400, ValidationError],
      [429, RateLimitError],
      [500, ApiError],
    ] as const) {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(status, { ok: false, error: 'x' }));
      const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
      await expect(c.request('/x')).rejects.toBeInstanceOf(klass);
    }
  });

  it('retries on 503 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { ok: false, error: 'down' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 2 });
    const res = await c.request<{ ok: true }>('/x');
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 400', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(400, { ok: false, error: 'bad' }));
    const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 3 });
    await expect(c.request('/x')).rejects.toBeInstanceOf(ValidationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honours requireAuth pre-flight when no creds', async () => {
    const fetchMock = vi.fn();
    const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    await expect(c.request('/me', { requireAuth: true })).rejects.toBeInstanceOf(AuthRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('captures Set-Cookie into client.cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'set-cookie': 'af_session=abc123; Path=/; HttpOnly' },
      }),
    );
    const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    await c.request('/auth/verify', { method: 'POST', body: { x: 1 } });
    expect(c.cookie ?? '').toContain('af_session=abc123');
  });

  it('respects AbortSignal', async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const c = new HttpClient({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const ctrl = new AbortController();
    const p = c.request('/x', { signal: ctrl.signal });
    ctrl.abort(new Error('user-abort'));
    await expect(p).rejects.toBeTruthy();
  });

  it('builds URL with query string', () => {
    const c = new HttpClient({ baseUrl: 'https://example.com', fetch: (() => {}) as unknown as typeof fetch });
    const url = c.buildUrl('/x', { a: 1, b: 'two', skip: undefined });
    expect(url).toBe('https://example.com/x?a=1&b=two');
  });

  it('sends Bearer token when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const c = new HttpClient({
      fetch: fetchMock as unknown as typeof fetch,
      bearerToken: 'tok-xyz',
      maxRetries: 0,
    });
    await c.request('/x');
    const init = (fetchMock.mock.calls[0]?.[1] ?? {}) as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer tok-xyz');
  });
});
