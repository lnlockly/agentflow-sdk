/**
 * Example 03 — Publish an agent to the marketplace.
 *
 * This flow needs an authenticated session. Two ways:
 *  (a) SIWE: sign nonce externally, call af.auth.verify(...)
 *  (b) Bearer/JWT: af.setBearerToken(process.env.AGENTFLOW_TOKEN)
 *
 * Commented out — replace placeholders before running.
 */
import { AgentFlow } from '../src/index.js';

async function main() {
  const af = new AgentFlow({ bearerToken: process.env['AGENTFLOW_TOKEN'] });

  // 1. Sanity: who am I?
  // const me = await af.me.get();
  // console.log('me:', me.user);

  // 2. Configure prices for the agent's tools.
  // await af.marketplace.setToolPrices('my-agent-slug', [
  //   { tool: 'search', flow: '0.5' },
  //   { tool: 'summarize', flow: '0.2' },
  // ]);

  // 3. Publish.
  // const r = await af.marketplace.publish('my-agent-slug', {
  //   marketplace_meta: {
  //     category: 'general',
  //     model: 'claude-haiku-4-5',
  //     description: 'My helpful agent',
  //   },
  // });
  // console.log('published:', r);

  console.log('Edit this file and uncomment the steps you want to run.');
  void af;
}

main();
