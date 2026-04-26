import { describe, expect, it, vi } from 'vitest';
import { AgentFlow } from '../src/index.js';

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('search resource', () => {
  it('builds query with q + type + limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({ ok: true, items: [{ kind: 'agent', slug: 'a', name: 'A', ticker: null }] }),
    );
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const r = await af.search.query('vpn', { type: 'agent', limit: 5 });
    expect(r.items[0]?.slug).toBe('a');
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('q=vpn');
    expect(url).toContain('type=agent');
    expect(url).toContain('limit=5');
  });

  it('items() returns array directly', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({ ok: true, items: [{ kind: 'token', slug: 't', name: 'T', ticker: 'T' }] }),
    );
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const items = await af.search.items('t');
    expect(items.length).toBe(1);
  });
});

describe('webhooks resource', () => {
  it('events() lists known event names', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({ ok: true, events: ['payment.received', 'payout.sent'] }),
    );
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    const r = await af.webhooks.events();
    expect(r.events).toContain('payment.received');
  });

  it('create posts url + events', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({
        ok: true,
        webhook: {
          id: 1,
          url: 'https://example.com/h',
          secret: 'whsec_x',
          events: ['payment.received'],
          active: true,
          created_at: new Date().toISOString(),
          last_delivered_at: null,
          last_error: null,
        },
      }),
    );
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    const r = await af.webhooks.create({
      url: 'https://example.com/h',
      events: ['payment.received'],
    });
    expect(r.webhook.id).toBe(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).toContain('"events":["payment.received"]');
  });
});

describe('referrals resource', () => {
  it('stats() requires auth', async () => {
    const fetchMock = vi.fn();
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    await expect(af.referrals.stats()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stats() returns shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({
        ok: true,
        direct: 1,
        total: 2,
        by_level: [{ level: 1, count: 1 }],
        earned_micro: '0',
      }),
    );
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    const r = await af.referrals.stats();
    expect(r.direct).toBe(1);
    expect(r.total).toBe(2);
  });
});

describe('agents.chat (buffered)', () => {
  function sse(events: Array<{ event: string; data: unknown }>): Response {
    const body = events
      .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
      .join('');
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  }

  it('drains stream into content + tools + flow_balance_remaining', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sse([
        { event: 'status', data: { stage: 'thinking' } },
        {
          event: 'done',
          data: { text: 'hello world', tools: [{ name: 'echo', content: 'pong' }] },
        },
        { event: 'flow_meta', data: { balance_remaining: '12.345' } },
      ]),
    );
    const af = new AgentFlow({
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: 'af_live_test',
      maxRetries: 0,
    });
    const r = await af.agents.chat('tg-457c1d', { text: 'hi' });
    expect(r.content).toBe('hello world');
    expect(r.tools[0]?.name).toBe('echo');
    expect(r.flow_balance_remaining).toBe('12.345');
  });
});

describe('leads resource', () => {
  it('create posts intake form payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ok: true, id: 7 }));
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const r = await af.leads.create({
      track: 'demo',
      contact: 'a@b.c',
      payload: { plan: 'pro' },
    });
    expect(r.id).toBe(7);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).toContain('"track":"demo"');
  });
});
