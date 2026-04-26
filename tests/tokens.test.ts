import { describe, expect, it, vi } from 'vitest';
import { AgentFlow } from '../src/index.js';

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('tokens resource', () => {
  it('list returns items', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ok: true, items: [{ id: 1, slug: 'a', name: 'A' }], next_cursor: null }));
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const r = await af.tokens.list();
    expect(r.items.length).toBe(1);
    expect(r.items[0]?.slug).toBe('a');
  });

  it('listAll iterates cursor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ ok: true, items: [{ id: 1, slug: 'a', name: 'A' }], next_cursor: 'c1' }))
      .mockResolvedValueOnce(ok({ ok: true, items: [{ id: 2, slug: 'b', name: 'B' }], next_cursor: null }));
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const collected: string[] = [];
    for await (const t of af.tokens.listAll()) collected.push(t.slug);
    expect(collected).toEqual(['a', 'b']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('create requires auth', async () => {
    const fetchMock = vi.fn();
    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    await expect(af.tokens.create({ ticker: 'X', name: 'X', supply: 1000 })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
