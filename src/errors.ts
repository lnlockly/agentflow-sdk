/**
 * Typed error hierarchy for the AgentFlow SDK.
 *
 * All errors thrown by the SDK extend `AgentFlowError`, so consumers can
 * `catch (e) { if (e instanceof AgentFlowError) ... }` and discriminate by
 * `instanceof` checks.
 */

export class AgentFlowError extends Error {
  public readonly status: number | undefined;
  public readonly code: string | undefined;
  public readonly requestId: string | undefined;
  public readonly body: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      requestId?: string;
      body?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'AgentFlowError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.body = options.body;
    if (options.cause !== undefined) {
      // ES2022 Error.cause
      (this as unknown as { cause: unknown }).cause = options.cause;
    }
  }
}

export class NetworkError extends AgentFlowError {
  constructor(message: string, opts: { cause?: unknown } = {}) {
    super(message, opts);
    this.name = 'NetworkError';
  }
}

export class AuthRequiredError extends AgentFlowError {
  constructor(message = 'Authentication required', opts: ConstructorParameters<typeof AgentFlowError>[1] = {}) {
    super(message, { ...opts, status: 401 });
    this.name = 'AuthRequiredError';
  }
}

export class ForbiddenError extends AgentFlowError {
  constructor(message = 'Forbidden', opts: ConstructorParameters<typeof AgentFlowError>[1] = {}) {
    super(message, { ...opts, status: 403 });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AgentFlowError {
  constructor(message = 'Not found', opts: ConstructorParameters<typeof AgentFlowError>[1] = {}) {
    super(message, { ...opts, status: 404 });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AgentFlowError {
  public readonly issues: unknown;
  constructor(
    message = 'Validation error',
    opts: ConstructorParameters<typeof AgentFlowError>[1] & { issues?: unknown } = {},
  ) {
    super(message, { ...opts, status: opts.status ?? 400 });
    this.name = 'ValidationError';
    this.issues = opts.issues;
  }
}

export class RateLimitError extends AgentFlowError {
  public readonly retryAfterMs: number | undefined;
  constructor(
    message = 'Rate limit exceeded',
    opts: ConstructorParameters<typeof AgentFlowError>[1] & { retryAfterMs?: number } = {},
  ) {
    super(message, { ...opts, status: 429 });
    this.name = 'RateLimitError';
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export class ApiError extends AgentFlowError {
  constructor(message: string, opts: ConstructorParameters<typeof AgentFlowError>[1] = {}) {
    super(message, opts);
    this.name = 'ApiError';
  }
}
