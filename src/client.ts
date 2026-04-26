/**
 * Low-level HTTP client used by all resource modules.
 *
 * Responsibilities:
 *  - URL building + JSON / FormData / Blob bodies
 *  - Auth (cookie / bearer / api-key)
 *  - Retry with full-jitter exponential backoff on 502/503/504/429 + network
 *  - Map HTTP status to typed errors
 *  - Honour AbortSignal end-to-end
 */

import {
  ApiError,
  AuthRequiredError,
  ForbiddenError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from './errors.js';
import { buildQuery, jitterBackoff, parseRetryAfter, sleep } from './utils.js';

export const DEFAULT_BASE_URL = 'https://api.agentflow.website';

export interface AgentFlowConfig {
  /** Base URL for the API. Defaults to https://api.agentflow.website. */
  baseUrl?: string;
  /**
   * API key for service-to-service calls (sent as `x-api-key` header).
   * Mutually compatible with `bearerToken`; `bearerToken` takes precedence.
   */
  apiKey?: string;
  /** Explicit JWT bearer token. Sent as `Authorization: Bearer <token>`. */
  bearerToken?: string;
  /**
   * Pre-baked cookie string (e.g. `af_session=...`). Useful for server-side
   * code that re-uses the cookie set by `auth.verify()` in a browser.
   */
  cookie?: string;
  /**
   * Whether to send/receive cookies on the underlying fetch. Defaults to
   * `'include'` so browser-side `af_session` cookies flow naturally.
   */
  credentials?: RequestCredentials;
  /** Override fetch implementation (mostly for testing). */
  fetch?: typeof fetch;
  /** Default timeout for requests in ms. Default 30_000. */
  timeoutMs?: number;
  /** Number of retries for retriable failures. Default 3. */
  maxRetries?: number;
  /** Extra default headers. */
  headers?: Record<string, string>;
  /** User-Agent suffix. */
  userAgent?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, unknown>;
  body?: unknown;
  /** Parse response as: 'json' (default), 'text', 'blob', 'stream' (raw Response). */
  parse?: 'json' | 'text' | 'blob' | 'stream';
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Override retries for this request. */
  retries?: number;
  /** Mark request as auth-required; throws AuthRequiredError pre-flight if no creds. */
  requireAuth?: boolean;
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export class HttpClient {
  public readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly defaultHeaders: Record<string, string>;
  /** Mutable so resources/auth can update after login. */
  public apiKey: string | undefined;
  public bearerToken: string | undefined;
  public cookie: string | undefined;
  public readonly credentials: RequestCredentials;

  constructor(config: AgentFlowConfig = {}) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl =
      config.fetch ??
      (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined as unknown as typeof fetch);
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('AgentFlow SDK: global fetch is not available. Please use Node 18+ or pass a custom fetch.');
    }
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.apiKey = config.apiKey;
    this.bearerToken = config.bearerToken;
    this.cookie = config.cookie;
    this.credentials = config.credentials ?? 'include';
    this.defaultHeaders = {
      accept: 'application/json',
      'user-agent': config.userAgent ?? `agentflow-sdk/0.1.0 (+https://agentflow.website)`,
      ...(config.headers ?? {}),
    };
  }

  /** Returns true if any credential is configured. */
  hasAuth(): boolean {
    return Boolean(this.bearerToken || this.apiKey || this.cookie);
  }

  buildUrl(path: string, query?: Record<string, unknown>): string {
    const p = path.startsWith('/') ? path : '/' + path;
    return this.baseUrl + p + buildQuery(query);
  }

  private buildHeaders(opts: RequestOptions, hasJsonBody: boolean): Headers {
    const headers = new Headers(this.defaultHeaders);
    if (this.bearerToken) headers.set('authorization', `Bearer ${this.bearerToken}`);
    else if (this.apiKey) headers.set('x-api-key', this.apiKey);
    if (this.cookie) headers.set('cookie', this.cookie);
    if (hasJsonBody) headers.set('content-type', 'application/json');
    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) headers.set(k, v);
    }
    return headers;
  }

  /**
   * Issue an HTTP request. Returns parsed body based on `opts.parse`.
   * `parse: 'stream'` returns the raw Response so callers can pull the body.
   */
  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    if (opts.requireAuth && !this.hasAuth()) {
      throw new AuthRequiredError('This endpoint requires authentication. Configure apiKey, bearerToken, or call auth.verify() to receive a session cookie.');
    }

    const url = this.buildUrl(path, opts.query);
    const method = opts.method ?? 'GET';

    let body: BodyInit | undefined;
    let hasJsonBody = false;
    if (opts.body !== undefined && opts.body !== null) {
      if (
        opts.body instanceof FormData ||
        opts.body instanceof Blob ||
        opts.body instanceof ArrayBuffer ||
        opts.body instanceof URLSearchParams ||
        typeof opts.body === 'string' ||
        (typeof ReadableStream !== 'undefined' && opts.body instanceof ReadableStream) ||
        ArrayBuffer.isView(opts.body as ArrayBufferView)
      ) {
        body = opts.body as BodyInit;
      } else {
        body = JSON.stringify(opts.body);
        hasJsonBody = true;
      }
    }

    const maxRetries = opts.retries ?? this.maxRetries;
    let attempt = 0;
    let lastErr: unknown;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const onParentAbort = () => controller.abort(opts.signal?.reason);
      if (opts.signal) {
        if (opts.signal.aborted) {
          throw opts.signal.reason ?? new NetworkError('Request aborted');
        }
        opts.signal.addEventListener('abort', onParentAbort, { once: true });
      }
      const timeout = setTimeout(() => controller.abort(new NetworkError('Request timed out')), this.timeoutMs);

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method,
          headers: this.buildHeaders(opts, hasJsonBody),
          body,
          signal: controller.signal,
          credentials: this.credentials,
        });
      } catch (err) {
        clearTimeout(timeout);
        opts.signal?.removeEventListener('abort', onParentAbort);
        // Aborted by parent
        if (opts.signal?.aborted) throw opts.signal.reason ?? new NetworkError('Request aborted');
        lastErr = new NetworkError((err as Error)?.message ?? 'Network error', { cause: err });
        if (attempt >= maxRetries) throw lastErr;
        await sleep(jitterBackoff(attempt), opts.signal);
        attempt += 1;
        continue;
      }
      clearTimeout(timeout);
      opts.signal?.removeEventListener('abort', onParentAbort);

      // Capture session cookie if returned (Node fetch). Browser handles it natively.
      this.maybeCaptureCookie(response);

      if (response.ok) {
        if (opts.parse === 'stream') return response as unknown as T;
        if (opts.parse === 'blob') return (await response.blob()) as T;
        if (opts.parse === 'text') return (await response.text()) as T;
        // default JSON
        const ct = response.headers.get('content-type') ?? '';
        if (response.status === 204 || !ct.includes('json')) {
          // Let callers that requested JSON still get something sensible.
          return undefined as T;
        }
        return (await response.json()) as T;
      }

      // Error path
      const requestId = response.headers.get('x-request-id') ?? undefined;
      const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
      const bodyText = await response.text().catch(() => '');
      let parsedBody: unknown = bodyText;
      try {
        if (bodyText) parsedBody = JSON.parse(bodyText);
      } catch {
        /* keep as text */
      }

      const status = response.status;
      const message = extractErrorMessage(parsedBody) ?? `HTTP ${status}`;

      if (RETRYABLE_STATUS.has(status) && attempt < maxRetries) {
        const wait = retryAfterMs ?? jitterBackoff(attempt);
        await sleep(wait, opts.signal);
        attempt += 1;
        continue;
      }

      throw mapError(status, message, { requestId, body: parsedBody, retryAfterMs });
    }

    // Unreachable, but TypeScript wants it.
    throw lastErr ?? new ApiError('Request failed');
  }

  /** Capture `Set-Cookie: af_session=...` from a Response into `this.cookie`. */
  private maybeCaptureCookie(response: Response): void {
    // `getSetCookie` exists on Undici (Node 20+) and recent browsers.
    type WithGetSetCookie = Headers & { getSetCookie?: () => string[] };
    const headers = response.headers as WithGetSetCookie;
    const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
    if (!setCookies || setCookies.length === 0) {
      // Fallback: single set-cookie header
      const sc = response.headers.get('set-cookie');
      if (!sc) return;
      this.applyCookieString(sc);
      return;
    }
    for (const sc of setCookies) this.applyCookieString(sc);
  }

  private applyCookieString(setCookie: string): void {
    // Strip attributes after the first `;`
    const idx = setCookie.indexOf(';');
    const pair = idx === -1 ? setCookie : setCookie.slice(0, idx);
    const eq = pair.indexOf('=');
    if (eq === -1) return;
    const name = pair.slice(0, eq).trim();
    if (!name) return;
    // Merge into existing cookie string
    const existing = this.cookie ?? '';
    const parts = existing.split(';').map((s) => s.trim()).filter(Boolean);
    const filtered = parts.filter((p) => !p.startsWith(name + '='));
    filtered.push(pair.trim());
    this.cookie = filtered.join('; ');
  }
}

function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body || undefined;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b['error'] === 'string') return b['error'] as string;
    if (typeof b['message'] === 'string') return b['message'] as string;
  }
  return undefined;
}

function mapError(
  status: number,
  message: string,
  ctx: { requestId?: string; body?: unknown; retryAfterMs?: number },
): Error {
  const base = { status, message, requestId: ctx.requestId, body: ctx.body };
  switch (status) {
    case 400:
      return new ValidationError(message, { ...base, issues: extractIssues(ctx.body) });
    case 401:
      return new AuthRequiredError(message, base);
    case 403:
      return new ForbiddenError(message, base);
    case 404:
      return new NotFoundError(message, base);
    case 422:
      return new ValidationError(message, { ...base, issues: extractIssues(ctx.body) });
    case 429:
      return new RateLimitError(message, { ...base, retryAfterMs: ctx.retryAfterMs });
    default:
      return new ApiError(message, base);
  }
}

function extractIssues(body: unknown): unknown {
  if (body && typeof body === 'object' && 'issues' in (body as Record<string, unknown>)) {
    return (body as Record<string, unknown>)['issues'];
  }
  return undefined;
}
