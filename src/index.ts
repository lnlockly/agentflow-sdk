/**
 * AgentFlow TypeScript SDK
 *
 * Main entry. Construct an `AgentFlow` and use the typed namespaces:
 *
 *   const af = new AgentFlow();
 *   const tokens = await af.tokens.list();
 *   const balance = await af.me.flowBalanceValue(); // requires auth
 */

import { type AgentFlowConfig, HttpClient } from './client.js';
import { AiAssistResource } from './resources/aiAssist.js';
import { ApiKeysResource } from './resources/apiKeys.js';
import { AuthResource } from './resources/auth.js';
import { MarketplaceResource } from './resources/marketplace.js';
import { MeResource } from './resources/me.js';
import { PayoutsResource } from './resources/payouts.js';
import { ProjectsResource } from './resources/projects.js';
import { SubscriptionsResource } from './resources/subscriptions.js';
import { TokensResource } from './resources/tokens.js';
import { VoiceResource } from './resources/voice.js';

export class AgentFlow {
  public readonly http: HttpClient;
  public readonly auth: AuthResource;
  public readonly apiKeys: ApiKeysResource;
  public readonly me: MeResource;
  public readonly tokens: TokensResource;
  public readonly projects: ProjectsResource;
  public readonly marketplace: MarketplaceResource;
  public readonly subscriptions: SubscriptionsResource;
  public readonly payouts: PayoutsResource;
  public readonly aiAssist: AiAssistResource;
  public readonly voice: VoiceResource;

  constructor(config: AgentFlowConfig = {}) {
    this.http = new HttpClient(config);
    this.auth = new AuthResource(this.http);
    this.apiKeys = new ApiKeysResource(this.http);
    this.me = new MeResource(this.http);
    this.tokens = new TokensResource(this.http);
    this.projects = new ProjectsResource(this.http);
    this.marketplace = new MarketplaceResource(this.http);
    this.subscriptions = new SubscriptionsResource(this.http);
    this.payouts = new PayoutsResource(this.http);
    this.aiAssist = new AiAssistResource(this.http);
    this.voice = new VoiceResource(this.http);
  }

  /** Set or update the bearer token after construction (e.g. after refresh). */
  setBearerToken(token: string | undefined): void {
    this.http.bearerToken = token;
  }

  /** Set or update the API key after construction. */
  setApiKey(key: string | undefined): void {
    this.http.apiKey = key;
  }

  /** Replace the cookie string (advanced; usually managed automatically). */
  setCookie(cookie: string | undefined): void {
    this.http.cookie = cookie;
  }

  /** Health check — useful for SDK smoke tests. */
  async health(opts: { signal?: AbortSignal } = {}): Promise<{ ok: boolean; version?: string; db_ok?: boolean; db_latency_ms?: number }> {
    return this.http.request('/health', { signal: opts.signal });
  }
}

export default AgentFlow;

// Public surface re-exports
export { HttpClient, DEFAULT_BASE_URL } from './client.js';
export type { AgentFlowConfig, RequestOptions } from './client.js';
export {
  AgentFlowError,
  ApiError,
  AuthRequiredError,
  ForbiddenError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from './errors.js';
export type * from './types.js';
export { parseSseBlock, consumeSseResponse } from './streaming.js';
export type { SseConnectOptions } from './streaming.js';
export type { ProjectStreamHandle } from './resources/projects.js';
