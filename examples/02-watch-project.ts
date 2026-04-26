/**
 * Example 02 — Watch a project's SSE event stream.
 *
 * Run:  npx tsx examples/02-watch-project.ts <project-slug>
 *
 * The slug is required because /projects/:slug/stream is per-project.
 */
import { AgentFlow } from '../src/index.js';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('usage: tsx examples/02-watch-project.ts <project-slug>');
    process.exit(2);
  }

  const af = new AgentFlow();
  console.log(`connecting to /projects/${slug}/stream …`);
  const handle = af.projects.stream(
    slug,
    (msg) => {
      console.log(`[${msg.event}]`, msg.data);
    },
    {
      onError: (e) => console.error('stream error:', e.message),
    },
  );

  // Stop after 30s for demo purposes.
  setTimeout(() => handle.close(), 30_000);
  await handle.done.catch(() => {});
  console.log('stream ended');
}

main();
