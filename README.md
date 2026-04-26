# @agentflow/sdk

Official TypeScript SDK for the [AgentFlow](https://agentflow.website) API
(`https://api.agentflow.website`).

Works in Node 18+, modern browsers, and Bun. Dual-published as ESM and CJS.

## Install

```bash
npm install @agentflow/sdk
# or: pnpm add @agentflow/sdk    yarn add @agentflow/sdk    bun add @agentflow/sdk
```

## Quickstart

```ts
import { AgentFlow } from '@agentflow/sdk';

const af = new AgentFlow();

// Public endpoints — no auth needed:
const tokens = await af.tokens.list({ limit: 10 });
console.log(tokens.items);

// Authenticated endpoint:
af.setBearerToken(process.env.AGENTFLOW_TOKEN);
const balance = await af.me.flowBalanceValue();
console.log(`FLOW: ${balance}`);
```

## Auth

The SDK supports three authentication modes:

1. **API key** (service-to-service) — sent as `x-api-key`:
   ```ts
   const af = new AgentFlow({ apiKey: process.env.AGENTFLOW_API_KEY });
   ```
2. **JWT bearer** — sent as `Authorization: Bearer <token>`:
   ```ts
   const af = new AgentFlow({ bearerToken: jwt });
   af.setBearerToken(refreshed); // update later
   ```
3. **Session cookie** (browser-style) — produced automatically when you call
   `auth.verify(...)` after SIWE, or supplied manually:
   ```ts
   const af = new AgentFlow();
   await af.auth.nonce({ address: '0x…' });
   await af.auth.verify({ address: '0x…', signature, message });
   // af_session cookie is now stored on `af.http.cookie` and sent automatically.
   ```

Bearer token wins over API key if both are set. Cookies are layered on top
(both can travel together).

### Errors

All errors extend `AgentFlowError`. Discriminate with `instanceof`:

```ts
import {
  AuthRequiredError, ForbiddenError, NotFoundError,
  ValidationError, RateLimitError, ApiError, NetworkError,
} from '@agentflow/sdk';

try {
  await af.me.get();
} catch (e) {
  if (e instanceof AuthRequiredError) /* re-login */;
  else if (e instanceof RateLimitError) console.log('retry after', e.retryAfterMs);
  else throw e;
}
```

Retries with full-jitter exponential backoff are applied automatically on
`429`, `502`, `503`, `504`, and network-level failures (3 retries by default,
configurable via `maxRetries`). Validation/auth errors are never retried.

Every method accepts `{ signal?: AbortSignal }` for cancellation.

## Real-time updates

Project event feeds are exposed as Server-Sent Events at
`/projects/:slug/stream`. The SDK provides a callback-based wrapper that works
identically in Node, browsers, and Bun (no extra dependency, no `EventSource`
polyfill).

```ts
const handle = af.projects.stream('demo-slug', (msg) => {
  // msg.event:  'event' | 'backfill_done' | 'ping' | ...
  // msg.data:   parsed JSON (or string if non-JSON)
  console.log(msg.event, msg.data);
});

// Stop:
handle.close();

// Or wait for natural end:
await handle.done;
```

## Resources

| Namespace             | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `af.auth`             | SIWE nonce/verify, access codes, Telegram, logout      |
| `af.me`               | Current user, balance, subscription, link Telegram      |
| `af.tokens`           | Launchpad list/get/create/holders + `listAll()` cursor  |
| `af.projects`         | Get/create/start/subscribe + `stream(slug, onEvent)`   |
| `af.marketplace`      | Agent list/get + publish/unpublish/setToolPrices       |
| `af.subscriptions`    | Checkout, current tier                                  |
| `af.payouts`          | Request/list/get/cancel FLOW payouts                   |
| `af.aiAssist`         | `token` / `project` / `listing` AI suggestions         |
| `af.voice`            | `transcribe(audio)` and `tts({ text })`                |

## Pagination

Cursor endpoints expose two helpers — `list({ cursor })` for manual paging,
and `listAll()` for an `AsyncIterable<T>`:

```ts
for await (const t of af.tokens.listAll({ limit: 50 })) {
  console.log(t.slug);
}
```

## Examples

See [`examples/`](./examples):

- [`01-list-tokens.ts`](./examples/01-list-tokens.ts) — public list calls
- [`02-watch-project.ts`](./examples/02-watch-project.ts) — SSE consumer
- [`03-publish-agent.ts`](./examples/03-publish-agent.ts) — auth + publish flow
- [`04-buy-flow.ts`](./examples/04-buy-flow.ts) — subscription checkout

Run any of them:

```bash
npx tsx examples/01-list-tokens.ts
```

## Development

```bash
npm install
npm run build         # ESM + CJS + .d.ts via tsup
npm run test          # unit tests (mocked fetch)
AGENTFLOW_E2E=1 npm test  # also hit prod /health and /tokens
npm run typecheck
```

## License

MIT
