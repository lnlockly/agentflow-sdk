/** Small internal helpers. Not part of the public surface. */

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal?.reason ?? new Error('Aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function jitterBackoff(attempt: number, baseMs = 300, capMs = 5_000): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  // Full jitter
  return Math.floor(Math.random() * exp);
}

export function buildQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const entries: [string, string][] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) entries.push([k, String(item)]);
    } else {
      entries.push([k, String(v)]);
    }
  }
  if (entries.length === 0) return '';
  const usp = new URLSearchParams(entries);
  return '?' + usp.toString();
}

export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return undefined;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
