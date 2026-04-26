/**
 * Public response/request types for AgentFlow API.
 *
 * These mirror the wire format returned by api.agentflow.website. Where the
 * server returns numeric strings (e.g. `"0.100000"`) we keep them as strings
 * so callers can decide on the parsing strategy.
 */

export interface OkResponse {
  ok: true;
}

export interface ErrorResponse {
  ok: false;
  error?: string;
  message?: string;
  [k: string]: unknown;
}

// ---------------- Auth ----------------

export interface NonceResponse {
  ok: true;
  nonce: string;
  expires_at: string;
}

export interface VerifyRequest {
  address: string;
  signature: string;
  message: string;
  ref_code?: string;
}

export interface AuthUser {
  id: number | string;
  address?: string | null;
  username?: string | null;
  ref_code?: string | null;
  invited_by?: string | null;
  [k: string]: unknown;
}

export interface VerifyResponse {
  ok: true;
  user: AuthUser;
}

// ---------------- Me ----------------

export interface MeResponse {
  ok: true;
  user: AuthUser;
  wallet?: string | null;
  balance_micro?: string | number | null;
  ref_code?: string | null;
  invited_by?: string | null;
  [k: string]: unknown;
}

export interface FlowBalanceResponse {
  ok: true;
  balance_flow: string;
  balance_micro: string;
}

export interface SubscriptionResponse {
  ok: true;
  tier: string | null;
  active: boolean;
  expires_at?: string | null;
  [k: string]: unknown;
}

// ---------------- Tokens (Launchpad) ----------------

export interface TokenItem {
  id: number;
  slug: string;
  ticker?: string | null;
  name: string;
  supply?: string | null;
  price?: string | null;
  status?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface TokenListResponse {
  ok: true;
  items: TokenItem[];
  next_cursor: string | null;
}

export interface TokenHolder {
  address: string;
  balance: string;
  share?: string;
  [k: string]: unknown;
}

export interface TokenHoldersResponse {
  ok: true;
  items: TokenHolder[];
  next_cursor: string | null;
}

export interface TokenCreateRequest {
  ticker: string;
  name: string;
  supply: string | number;
  price?: string | number;
  brief?: string;
  surfaces?: string[];
  hours?: number;
  [k: string]: unknown;
}

// ---------------- Projects ----------------

export interface ProjectItem {
  slug: string;
  token_slug?: string | null;
  name: string;
  brief?: string | null;
  status?: string;
  surfaces?: string[];
  hours?: number;
  created_at?: string;
  [k: string]: unknown;
}

export interface ProjectGetResponse {
  ok: true;
  project: ProjectItem;
}

export interface ProjectCreateRequest {
  token_slug?: string;
  name: string;
  brief?: string;
  surfaces?: string[];
  hours?: number;
  [k: string]: unknown;
}

/** A single SSE message coming off /projects/:slug/stream. */
export interface ProjectStreamMessage {
  /** Raw SSE event name (`event`, `backfill_done`, `ping`, …). */
  event: string;
  /** Parsed JSON payload, or raw string if not JSON. */
  data: unknown;
  /** Optional `id:` field from SSE. */
  id?: string;
}

// ---------------- Marketplace ----------------

export interface MarketplaceAgent {
  id: number;
  slug: string;
  name: string;
  ticker?: string | null;
  marketplace_meta?: Record<string, unknown> | null;
  published_at?: string | null;
  stats?: {
    total_calls?: number;
    total_flow_earned?: string;
    unique_callers?: number;
    rating_avg?: number | null;
    rating_count?: number;
    last_called_at?: string | null;
  };
  min_flow_per_call?: string | null;
  token?: unknown;
  mock?: boolean;
  [k: string]: unknown;
}

export interface MarketplaceListResponse {
  ok: true;
  items: MarketplaceAgent[];
  next_cursor: string | null;
}

export interface ToolPrice {
  tool: string;
  flow: string | number;
}

// ---------------- Subscriptions ----------------

export type SubscriptionTier = string;
export type SubscriptionProvider = 'platega' | 'cryptobot' | string;

export interface CheckoutRequest {
  tier: SubscriptionTier;
  provider: SubscriptionProvider;
}

export interface CheckoutResponse {
  ok: true;
  invoice_url: string;
  [k: string]: unknown;
}

// ---------------- Payouts ----------------

export type PayoutMethod = 'usdt' | 'flow' | 'card' | string;

export interface PayoutRequestInput {
  amount_flow: string | number;
  method: PayoutMethod;
  address: string;
}

export interface PayoutItem {
  id: number;
  amount_flow: string;
  method: PayoutMethod;
  address: string;
  status: string;
  created_at: string;
  [k: string]: unknown;
}

export interface PayoutListResponse {
  ok: true;
  items: PayoutItem[];
  next_cursor?: string | null;
}

// ---------------- AI Assist ----------------

export type AiAssistMode = 'token' | 'project' | 'listing';

export interface AiAssistRequest {
  brief: string;
  mode: AiAssistMode;
  regenerate?: boolean;
  image?: boolean;
  [k: string]: unknown;
}

export interface AiAssistResponse {
  ok: true;
  suggested?: Record<string, unknown>;
  logo_url?: string | null;
  [k: string]: unknown;
}

// ---------------- Voice ----------------

export interface VoiceTtsRequest {
  text: string;
  voice?: string;
  lang?: string;
}

// ---------------- API Keys ----------------

export type ApiKeySpendPeriod = 'day' | 'week' | 'month' | 'forever';

export interface ApiKey {
  id: number;
  name: string;
  /** First 12 chars of the raw key — safe to render in UIs. */
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  /** Per-key requests-per-minute cap. 0 = unlimited. */
  rate_limit_rpm: number;
  /** Per-period FLOW spend cap, or null for no cap. Decimal string. */
  spend_limit_flow: string | null;
  spend_period: ApiKeySpendPeriod;
  /** FLOW spent this period. Decimal string. */
  spend_period_used: string;
  /** Start of the current spend period (ISO), or null if unused. */
  spend_period_start: string | null;
}

export interface ApiKeysListResponse {
  ok: true;
  items: ApiKey[];
}

export interface ApiKeyGetResponse {
  ok: true;
  item: ApiKey;
}

/**
 * Returned ONCE on creation. Save `key` immediately — the server will
 * never disclose it again; subsequent list responses only carry `prefix`.
 */
export interface ApiKeyCreated {
  ok: true;
  id: number;
  name: string;
  prefix: string;
  /** Full raw key — show to the user once, then drop it. */
  key: string;
  created_at: string;
  /** Human warning the API attaches to the create response. */
  warning?: string;
}

export interface ApiKeyCreateRequest {
  name: string;
  /** Optional per-key rate limit (requests/min). Omit for the 60 rpm default. */
  rate_limit_rpm?: number;
  /** Optional per-period FLOW spend cap. Omit for no cap. */
  spend_limit_flow?: string | number | null;
  /** Defaults to 'month'. */
  spend_period?: ApiKeySpendPeriod;
}

export interface ApiKeyUpdateRequest {
  name?: string;
  rate_limit_rpm?: number;
  spend_limit_flow?: string | number | null;
  spend_period?: ApiKeySpendPeriod;
}

/**
 * Aggregated usage stats for an API key, returned by
 * GET /me/api-keys/:id/usage. All amount fields are decimal strings.
 */
export interface ApiKeyUsageStats {
  ok: true;
  /** ISO timestamp the stats window opens at. */
  since: string;
  total_calls: number;
  total_flow_charged: string;
  total_tokens_in: number;
  total_tokens_out: number;
  by_endpoint: { endpoint: string; count: number; flow: string }[];
  by_model: {
    model: string;
    count: number;
    tokens_in: number;
    tokens_out: number;
    flow: string;
  }[];
  by_day: { day: string; count: number; flow: string }[];
}

export type ApiKeyUsageWindow = 'day' | 'week' | 'month' | 'all';

export interface ApiKeyUsageRow {
  id: number;
  endpoint: string;
  status_code: number;
  flow_charged: string;
  tokens_in: number;
  tokens_out: number;
  model: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ApiKeyRecentResponse {
  ok: true;
  items: ApiKeyUsageRow[];
}

// ---------------- Pagination ----------------

export interface CursorPage<T> {
  ok: true;
  items: T[];
  next_cursor: string | null;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
}

// ---------------- Agents (chat / CRUD) ----------------

export interface AgentCharacterInput {
  name: string;
  bio?: string | string[];
  system?: string;
  plugins?: string[];
  knowledge?: unknown[];
  settings?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface AgentCreateRequest {
  character: AgentCharacterInput;
  secrets?: Record<string, string>;
  ticker?: string;
  contact?: string;
  lang?: 'en' | 'ru' | 'zh';
}

export interface AgentSummary {
  id: number;
  slug: string;
  name: string;
  ticker: string | null;
  state: string;
  engine?: string | null;
  ingress_url?: string | null;
  lang?: string | null;
  contact?: string | null;
  plugins?: string[] | null;
  created_at?: string | null;
  deployed_at?: string | null;
  secret_keys?: string[];
  [k: string]: unknown;
}

export interface AgentResponse {
  ok: true;
  agent: AgentSummary;
}

export interface AgentsListResponse {
  ok: true;
  items: AgentSummary[];
}

export interface AgentChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface AgentChatRequest {
  /** Single-turn shortcut. Mutually exclusive with `messages`. */
  text?: string;
  /** OpenAI-style message list. The last user message drives the turn. */
  messages?: AgentChatMessage[];
  /** Set true to request SSE streaming; omit/false for buffered JSON. */
  stream?: boolean;
  room_id?: string;
}

/** Single SSE event from the chat stream. */
export interface AgentChatEvent {
  event: string;
  data: unknown;
  id?: string;
}

/** Buffered (non-stream) result. */
export interface AgentChatResult {
  ok: true;
  content: string;
  tools: Array<{ name: string | null; content: string }>;
  flow_balance_remaining?: string | null;
  flow_precharge?: string;
  raw_events?: AgentChatEvent[];
}

export interface AgentStateResponse {
  ok: true;
  state: Record<string, Record<string, unknown>>;
}

// ---------------- Webhooks ----------------

export interface WebhookSubscription {
  id: number;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created_at: string;
  last_delivered_at: string | null;
  last_error: string | null;
}

export interface WebhookCreateRequest {
  url: string;
  events?: string[];
  secret?: string;
}

export interface WebhookResponse {
  ok: true;
  webhook: WebhookSubscription;
}

export interface WebhooksListResponse {
  ok: true;
  items: WebhookSubscription[];
}

export interface WebhookEventsResponse {
  ok: true;
  events: readonly string[];
}

// ---------------- Search ----------------

export interface SearchHit {
  kind: 'agent' | 'token';
  slug: string;
  name: string;
  ticker: string | null;
  [k: string]: unknown;
}

export interface SearchResponse {
  ok: true;
  items: SearchHit[];
}

// ---------------- Referrals + Ledger ----------------

export interface ReferralStats {
  ok: true;
  direct: number;
  total: number;
  by_level: Array<{ level: number; count: number }>;
  earned_micro: string;
  [k: string]: unknown;
}

export interface ReferralEarning {
  id: number;
  amount: string;
  kind: string;
  ref_id?: number | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
  [k: string]: unknown;
}

export interface ReferralEarningsResponse {
  ok: true;
  items: ReferralEarning[];
  next_cursor?: string | null;
}

export interface LedgerEntry {
  id: number;
  pool: string;
  amount: string;
  kind: string;
  ref_id?: number | null;
  created_at: string;
  meta?: Record<string, unknown> | null;
  [k: string]: unknown;
}

export interface LedgerResponse {
  ok: true;
  items: LedgerEntry[];
  next_cursor?: string | null;
}

// ---------------- Leads ----------------

export interface LeadCreateRequest {
  track: string;
  contact: string;
  payload?: Record<string, unknown>;
  source?: string;
  lang?: string;
}

export interface LeadCreateResponse {
  ok: true;
  id?: number | string;
  [k: string]: unknown;
}

// ---------------- Teams ----------------

export interface TeamSummary {
  id: number;
  name?: string;
  slug?: string;
  members?: Array<{ slug: string; role?: string }>;
  [k: string]: unknown;
}

export interface TeamsListResponse {
  ok: true;
  items: TeamSummary[];
}

// ---------------- Provider Keys (BYOK) ----------------

export type ProviderKeyCategory =
  | 'llm'
  | 'image'
  | 'video'
  | 'audio'
  | 'research';

export type ProviderKeyAuthType = 'api_key' | 'oauth';

export interface ProviderCatalogEntry {
  provider: string;
  name: string;
  auth: ProviderKeyAuthType[];
  envVar: string;
  testUrl?: string;
  scopes?: string[];
}

export type ProviderCatalog = Record<ProviderKeyCategory, ProviderCatalogEntry[]>;

export interface ProviderCatalogResponse {
  ok: true;
  catalog: ProviderCatalog;
}

export interface ProviderKey {
  id: number;
  category: ProviderKeyCategory | string;
  provider: string;
  auth_type: ProviderKeyAuthType | string;
  label: string | null;
  /** First 8 chars of the raw key + `***` — safe to render anywhere. */
  masked_prefix: string;
  rotation_priority: number;
  rentable: boolean;
  rent_price_flow: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  total_calls: number;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
  meta: Record<string, unknown>;
}

export interface ProviderKeysListResponse {
  ok: true;
  items: ProviderKey[];
}

export interface ProviderKeyResponse {
  ok: true;
  item: ProviderKey;
}

export interface ProviderKeyAddRequest {
  category: ProviderKeyCategory | string;
  provider: string;
  auth_type: ProviderKeyAuthType;
  /** Plaintext API key or OAuth bundle (JSON). Sent ONCE — server seals it. */
  value: string;
  label?: string | null;
  oauth_meta?: Record<string, unknown>;
}

export interface ProviderKeyUpdateRequest {
  label?: string | null;
  rotation_priority?: number;
  rentable?: boolean;
  rent_price_flow?: string | null;
  is_active?: boolean;
}

export interface ProviderKeyTestResponse {
  ok: boolean;
  status?: number;
  error?: string;
}

// ---------------- Knowledge Base ----------------

export interface KbDocument {
  id: number | string;
  title?: string;
  bytes?: number;
  created_at?: string;
  [k: string]: unknown;
}

export interface KbListResponse {
  ok: true;
  items: KbDocument[];
}

export interface KbSearchResponse {
  ok: true;
  items: Array<{ doc_id: number | string; score: number; chunk?: string; [k: string]: unknown }>;
}
