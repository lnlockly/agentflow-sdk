import { describe, expect, it, vi } from 'vitest';
import { AgentFlow } from '../src/index.js';

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('providerKeys resource', () => {
  it('add() validates required fields BEFORE calling fetch', async () => {
    const fetchMock = vi.fn();
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    expect(() =>
      af.providerKeys.add({} as any),
    ).toThrow(/category/);
    expect(() =>
      af.providerKeys.add({ category: 'llm' } as any),
    ).toThrow(/provider/);
    expect(() =>
      af.providerKeys.add({ category: 'llm', provider: 'anthropic' } as any),
    ).toThrow(/auth_type/);
    expect(() =>
      af.providerKeys.add({
        category: 'llm',
        provider: 'anthropic',
        auth_type: 'api_key',
      } as any),
    ).toThrow(/value/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('list() parses the response shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({
        ok: true,
        items: [
          {
            id: 1,
            category: 'llm',
            provider: 'anthropic',
            auth_type: 'api_key',
            label: 'main',
            masked_prefix: 'sk-ant-x***',
            rotation_priority: 0,
            rentable: false,
            rent_price_flow: null,
            is_active: true,
            created_at: new Date().toISOString(),
            last_used_at: null,
            total_calls: 0,
            last_test_at: null,
            last_test_ok: null,
            last_test_error: null,
            meta: { masked_prefix: 'sk-ant-x***' },
          },
        ],
      }),
    );
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    const r = await af.providerKeys.list();
    expect(r.items.length).toBe(1);
    expect(r.items[0]?.provider).toBe('anthropic');
    expect(r.items[0]?.masked_prefix).toBe('sk-ant-x***');
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/me/provider-keys');
  });

  it('test() returns ok=true on a passing key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ok: true, status: 200 }));
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    const r = await af.providerKeys.test(42);
    expect(r.ok).toBe(true);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init?.method).toBe('POST');
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/me/provider-keys/42/test');
  });

  it('revoke() issues a DELETE and returns ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ok: true }));
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    const r = await af.providerKeys.revoke(7);
    expect(r.ok).toBe(true);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init?.method).toBe('DELETE');
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/me/provider-keys/7');
  });
});
