/**
 * Example 01 — List launchpad tokens.
 *
 * Run:  npx tsx examples/01-list-tokens.ts
 */
import { AgentFlow } from '../src/index.js';

async function main() {
  const af = new AgentFlow();
  const health = await af.health();
  console.log('health:', health);

  const page = await af.tokens.list({ limit: 10 });
  console.log(`tokens: ${page.items.length} item(s), next_cursor=${page.next_cursor}`);
  for (const t of page.items) {
    console.log(' -', t.slug, t.name, t.ticker ?? '(no ticker)');
  }

  // Marketplace too
  const mp = await af.marketplace.listAgents({ limit: 5 });
  console.log(`marketplace: ${mp.items.length} agent(s)`);
  for (const a of mp.items) {
    console.log(' -', a.slug, a.name, 'min_flow=', a.min_flow_per_call ?? 'n/a');
  }
}

main().catch((err) => {
  console.error('failed:', err);
  process.exit(1);
});
