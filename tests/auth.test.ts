import { describe, expect, it, vi } from 'vitest';
import { AgentFlow } from '../src/index.js';
import { AuthRequiredError } from '../src/errors.js';

function ok(body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...extra },
  });
}

describe('auth resource', () => {
  it('nonce → verify happy path captures cookie', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/auth/nonce')) {
        return Promise.resolve(ok({ ok: true, nonce: 'NONCE', expires_at: '2099-01-01' }));
      }
      if (url.endsWith('/auth/verify')) {
        return Promise.resolve(
          ok({ ok: true, user: { id: 1, address: '0xabc' } }, { 'set-cookie': 'af_session=sess; Path=/' }),
        );
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });

    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const n = await af.auth.nonce({ address: '0xabc' });
    expect(n.nonce).toBe('NONCE');
    const v = await af.auth.verify({ address: '0xabc', signature: 'sig', message: 'msg' });
    expect(v.user.id).toBe(1);
    expect(af.http.cookie ?? '').toContain('af_session=sess');
  });

  it('me without auth throws AuthRequiredError pre-flight', async () => {
    const fetchMock = vi.fn();
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    await expect(af.me.get()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
