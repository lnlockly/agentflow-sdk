import { describe, expect, it } from 'vitest';
import { AgentFlow } from '../src/index.js';

const E2E = process.env['AGENTFLOW_E2E'] === '1';
const desc = E2E ? describe : describe.skip;

const TEST_BEARER = process.env['AGENTFLOW_TEST_BEARER'];
const authedDesc = E2E && TEST_BEARER ? describe : describe.skip;

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

/**
 * Authenticated e2e for the API key lifecycle. Skipped unless both
 *   AGENTFLOW_E2E=1
 *   AGENTFLOW_TEST_BEARER=<JWT for a test user>
 * are set. Mint a JWT via `agentflow-api/scripts/mint-jwt.mjs <userId>`
 * or by running through the SIWE / Telegram login flow once.
 *
 * The test exercises the full lifecycle:
 *   1. SDK with bearer mints a key.
 *   2. List contains it.
 *   3. A second SDK instance configured with apiKey-only reads /me.
 *   4. Owner revokes the key.
 *   5. Revoked key now returns 401.
 */
authedDesc('prod e2e — API key lifecycle (authed)', () => {
  it(
    'create → list → use as x-api-key → revoke → 401',
    { timeout: 30_000 },
    async () => {
      const owner = new AgentFlow({ bearerToken: TEST_BEARER });
      const name = `sdk-e2e-${Date.now()}`;

      const created = await owner.apiKeys.create({ name });
      expect(created.ok).toBe(true);
      expect(created.name).toBe(name);
      expect(created.key.startsWith('af_live_')).toBe(true);
      expect(created.prefix).toBe(created.key.slice(0, 12));

      try {
        const list = await owner.apiKeys.list();
        expect(list.ok).toBe(true);
        const found = list.items.find((k) => k.id === created.id);
        expect(found).toBeTruthy();
        expect(found?.name).toBe(name);
        // The hash MUST NOT leak.
        expect((found as Record<string, unknown> | undefined)?.['key_hash']).toBeUndefined();

        // Use the key as the only credential on a second client.
        const consumer = new AgentFlow({ apiKey: created.key });
        const me = await consumer.me.get();
        expect(me.ok).toBe(true);
      } finally {
        // Revoke even if the assertions above fail — keeps prod clean.
        const rev = await owner.apiKeys.revoke(created.id);
        expect(rev.ok).toBe(true);
      }

      // Post-revoke: x-api-key should fail.
      const consumerAfter = new AgentFlow({ apiKey: created.key, maxRetries: 0 });
      let threw = false;
      try {
        await consumerAfter.me.get();
      } catch (err) {
        threw = true;
        expect((err as { status?: number }).status).toBe(401);
      }
      expect(threw).toBe(true);
    },
  );
});
