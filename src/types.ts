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
