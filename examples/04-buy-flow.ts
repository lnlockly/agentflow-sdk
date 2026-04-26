/**
 * Example 04 — Subscribe to a tier (checkout).
 *
 * Auth required. Replace the bearer token / use cookie auth as appropriate.
 * Commented out so this doesn't accidentally create invoices.
 */
import { AgentFlow } from '../src/index.js';

async function main() {
  const af = new AgentFlow({ bearerToken: process.env['AGENTFLOW_TOKEN'] });

  // const r = await af.subscriptions.checkout({
  //   tier: 'pro',
  //   provider: 'cryptobot',
  // });
  // console.log('open this URL to pay:', r.invoice_url);

  // After payment + webhook, check current sub:
  // const sub = await af.subscriptions.current();
  // console.log('subscription:', sub);

  console.log('Edit this file and uncomment the steps you want to run.');
  void af;
}

main();
