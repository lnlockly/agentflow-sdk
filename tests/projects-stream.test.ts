import { describe, expect, it, vi } from 'vitest';
import { AgentFlow } from '../src/index.js';
import { parseSseBlock } from '../src/streaming.js';
import type { ProjectStreamMessage } from '../src/types.js';

describe('SSE parsing', () => {
  it('parses a simple event with JSON data', () => {
    const block = 'event: ping\ndata: {"t":1}';
    const msg = parseSseBlock(block);
    expect(msg).toEqual({ event: 'ping', data: { t: 1 } });
  });

  it('parses default event=message and joins multi-line data', () => {
    const block = 'data: line1\ndata: line2';
    const msg = parseSseBlock(block);
    expect(msg?.event).toBe('message');
    expect(msg?.data).toBe('line1\nline2');
  });

  it('skips comments', () => {
    expect(parseSseBlock(': just a comment')).toBeNull();
  });
});

describe('projects.stream', () => {
  it('reads SSE events from a mocked Response and resolves on stream close', async () => {
    const sse =
      'event: backfill_start\ndata: {"k":1}\n\n' +
      'event: event\ndata: {"id":42,"type":"ai_turn"}\n\n' +
      'event: backfill_done\ndata: {}\n\n' +
      ': comment\n\n' +
      'event: ping\ndata: {}\n\n';

    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        // chunk it so the parser handles partials
        controller.enqueue(enc.encode(sse.slice(0, 40)));
        controller.enqueue(enc.encode(sse.slice(40)));
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    );

    const af = new AgentFlow({ fetch: fetchMock as unknown as typeof fetch, maxRetries: 0 });
    const events: ProjectStreamMessage[] = [];
    const handle = af.projects.stream('demo', (msg) => events.push(msg));
    await handle.done;

    expect(events.map((e) => e.event)).toEqual(['backfill_start', 'event', 'backfill_done', 'ping']);
    expect((events[1]?.data as { type?: string }).type).toBe('ai_turn');
  });
});
