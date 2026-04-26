import { describe, expect, it } from 'vitest';
import { AgentFlow } from '../src/index.js';

const E2E = process.env['AGENTFLOW_E2E'] === '1';
const desc = E2E ? describe : describe.skip;

desc('prod e2e (api.agentflow.website)', () => {
  it('GET /health returns ok', async () => {
    const af = new AgentFlow();
    const r = await af.health();
    expect(r.ok).toBe(true);
  });

  it('GET /tokens returns 200 with items array', async () => {
    const af = new AgentFlow();
    const r = await af.tokens.list({ limit: 5 });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.items)).toBe(true);
  });

  it('GET /marketplace/agents returns 200', async () => {
    const af = new AgentFlow();
    const r = await af.marketplace.listAgents({ limit: 5 });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.items)).toBe(true);
  });
});
