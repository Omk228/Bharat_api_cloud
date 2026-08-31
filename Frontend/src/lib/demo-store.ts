/**
 * Browser-only demo data layer. There is no database in this build: the whole
 * developer console (account, API keys, usage, audit log, webhook history) is
 * persisted in localStorage so every feature is explorable with dummy
 * credentials.
 */
import { buildApiKey, hmacSha256Hex, randomHex, timingSafeEqualHex } from "./demo-crypto";
import { getEndpoint, type ApiEndpoint } from "./api-catalog";

export const DEMO_EMAIL = "demo@bharatapicloud.io";
export const DEMO_PASSWORD = "bharatapi123";

export type PlanId = "free" | "growth" | "scale";

export type PlanLimit = {
  plan: PlanId;
  label: string;
  monthly_requests: number;
  max_keys: number;
  rate_limit_per_minute: number;
};

export const PLAN_LIMITS: PlanLimit[] = [
  { plan: "free", label: "Sandbox", monthly_requests: 500, max_keys: 3, rate_limit_per_minute: 60 },
  { plan: "growth", label: "Growth", monthly_requests: 50_000, max_keys: 10, rate_limit_per_minute: 600 },
  { plan: "scale", label: "Scale", monthly_requests: 1_000_000, max_keys: 50, rate_limit_per_minute: 3000 },
];

export type Profile = {
  display_name: string;
  company_name: string;
  contact_email: string;
  plan: PlanId;
  onboarded: boolean;
};

export type ApiKeyRow = {
  id: string;
  label: string;
  environment: "sandbox" | "live";
  key_prefix: string;
  last_four: string;
  secret: string;
  webhook_secret: string;
  revoked: boolean;
  revoked_at: string | null;
  rotated_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export type UsageRow = {
  id: string;
  api_key_id: string | null;
  key_label: string;
  endpoint_id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  mode: string;
  created_at: string;
};

export type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  target: string;
  actor: string;
  detail: string;
};

export type WalletTransactionRow = {
  id: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  description: string;
  category: "topup" | "api_usage" | "refund" | "bonus";
  reference_id: string;
  payment_method?: string;
  api_endpoint?: string;
  status: "success" | "pending" | "failed";
  created_at: string;
};

export type ApiHitLogRow = {
  id: string;
  request_id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  group: string;
  status_code: number;
  response_time_ms: number;
  cost_deducted: number;
  api_key_used: string;
  key_label: string;
  environment: "live" | "sandbox";
  ip_address: string;
  request_payload?: Record<string, unknown> | null;
  response_payload?: Record<string, unknown> | null;
  created_at: string;
};

export type WebhookDelivery = {
  attempt: number;
  at: string;
  status_code: number;
  response: string;
};

export type WebhookEventRow = {
  id: string;
  key_id: string;
  key_label: string;
  type: string;
  timestamp: string;
  body: string;
  signature: string;
  header: string;
  endpoint_url: string;
  created_at: string;
  deliveries: WebhookDelivery[];
};

export type Session = { email: string; display_name: string; signed_in_at: string };

type DemoState = {
  version: 1;
  session: Session | null;
  profile: Profile;
  keys: ApiKeyRow[];
  wallet_balance: number;
  wallet_transactions: WalletTransactionRow[];
  api_hit_logs: ApiHitLogRow[];
  usage: UsageRow[];
  audit: AuditRow[];
  webhooks: WebhookEventRow[];
};

const STORAGE_KEY = "bharatapi.console.v1";

function getDefaultWalletTransactions(): WalletTransactionRow[] {
  const now = Date.now();
  return [
    {
      id: "txn_w_106",
      type: "debit",
      amount: 1.00,
      balance_after: 4993.40,
      description: "Account Aggregator Consent API (/v1/aa/consent)",
      category: "api_usage",
      reference_id: "req_aa_88eb",
      api_endpoint: "/v1/aa/consent",
      status: "success",
      created_at: new Date(now - 15 * 60 * 1000).toISOString(),
    },
    {
      id: "txn_w_105",
      type: "debit",
      amount: 0.80,
      balance_after: 4994.40,
      description: "GSTIN Business Verification API (/v1/verify/gstin)",
      category: "api_usage",
      reference_id: "req_gst_31da",
      api_endpoint: "/v1/verify/gstin",
      status: "success",
      created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "txn_w_104",
      type: "debit",
      amount: 1.50,
      balance_after: 4995.20,
      description: "Bank Account Penny Drop Verification (/v1/bank/penny-drop)",
      category: "api_usage",
      reference_id: "req_bnk_42fa",
      api_endpoint: "/v1/bank/penny-drop",
      status: "success",
      created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "txn_w_103",
      type: "debit",
      amount: 2.10,
      balance_after: 4996.70,
      description: "Aadhaar OTP Generation API (/v1/verify/aadhaar/otp)",
      category: "api_usage",
      reference_id: "req_adh_71cd",
      api_endpoint: "/v1/verify/aadhaar/otp",
      status: "success",
      created_at: new Date(now - 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "txn_w_102",
      type: "debit",
      amount: 1.20,
      balance_after: 4998.80,
      description: "PAN Card Verification API (/v1/verify/pan)",
      category: "api_usage",
      reference_id: "req_pan_9a81",
      api_endpoint: "/v1/verify/pan",
      status: "success",
      created_at: new Date(now - 28 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "txn_w_101",
      type: "credit",
      amount: 5000.00,
      balance_after: 5000.00,
      description: "Wallet recharge via UPI Instant Transfer",
      category: "topup",
      reference_id: "pay_upi_91823a",
      payment_method: "UPI (bharatpe@hdfc)",
      status: "success",
      created_at: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getDefaultApiHitLogs(): ApiHitLogRow[] {
  const now = Date.now();
  return [
    {
      id: "log_hit_101",
      request_id: "req_aa_88eb",
      endpoint: "/v1/aa/consent",
      method: "POST",
      group: "Account Aggregator",
      status_code: 200,
      response_time_ms: 110,
      cost_deducted: 1.00,
      api_key_used: "sk_live_••••3f2c",
      key_label: "Production Server Key",
      environment: "live",
      ip_address: "103.21.244.12",
      request_payload: { customer_mobile: "9876543210", fi_types: ["DEPOSIT"], purpose_code: "101", duration_days: 30 },
      response_payload: { status: "PENDING", consent_handle: "cn_8f2a1b7c", expires_at: "2026-09-30T08:00:00Z" },
      created_at: new Date(now - 15 * 60 * 1000).toISOString(),
    },
    {
      id: "log_hit_102",
      request_id: "req_gst_31da",
      endpoint: "/v1/verify/gstin",
      method: "POST",
      group: "KYC",
      status_code: 200,
      response_time_ms: 95,
      cost_deducted: 0.80,
      api_key_used: "sk_live_••••3f2c",
      key_label: "Production Server Key",
      environment: "live",
      ip_address: "103.21.244.12",
      request_payload: { gstin: "27AAECV1234C1ZP" },
      response_payload: { status: "verified", legal_name: "Bharat API Cloud Technologies Pvt Ltd", gst_status: "Active" },
      created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log_hit_103",
      request_id: "req_bnk_42fa",
      endpoint: "/v1/bank/penny-drop",
      method: "POST",
      group: "Banking",
      status_code: 200,
      response_time_ms: 1240,
      cost_deducted: 1.50,
      api_key_used: "sk_live_••••3f2c",
      key_label: "Production Server Key",
      environment: "live",
      ip_address: "103.21.244.12",
      request_payload: { account_number: "50100234567890", ifsc: "HDFC0000123", name: "Aarav Sharma" },
      response_payload: { status: "verified", account_exists: true, beneficiary_name: "AARAV SHARMA", rrn: "421908123456" },
      created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log_hit_104",
      request_id: "req_adh_71cd",
      endpoint: "/v1/verify/aadhaar/otp",
      method: "POST",
      group: "KYC",
      status_code: 200,
      response_time_ms: 480,
      cost_deducted: 2.10,
      api_key_used: "sk_live_••••3f2c",
      key_label: "Production Server Key",
      environment: "live",
      ip_address: "103.21.244.12",
      request_payload: { aadhaar_number: "999999991234", consent: true, consent_id: "cns_9f21" },
      response_payload: { txn_id: "txn_digilocker_9a81f2", otp_sent: true, mobile_hint: "XXXXXX78XX" },
      created_at: new Date(now - 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log_hit_105",
      request_id: "req_pan_9a81",
      endpoint: "/v1/verify/pan",
      method: "POST",
      group: "KYC",
      status_code: 200,
      response_time_ms: 240,
      cost_deducted: 1.20,
      api_key_used: "sk_live_••••3f2c",
      key_label: "Production Server Key",
      environment: "live",
      ip_address: "103.21.244.12",
      request_payload: { pan: "ABCDE1234F", name: "Aarav Sharma", dob: "1990-04-12" },
      response_payload: { status: "verified", pan_valid: true, name_match: "exact", match_score: 0.98 },
      created_at: new Date(now - 28 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log_hit_106",
      request_id: "req_pan_err2",
      endpoint: "/v1/verify/pan",
      method: "POST",
      group: "KYC",
      status_code: 400,
      response_time_ms: 45,
      cost_deducted: 0.00,
      api_key_used: "sk_test_••••881a",
      key_label: "Sandbox Test Key",
      environment: "sandbox",
      ip_address: "49.36.120.4",
      request_payload: { pan: "INVALID_PAN" },
      response_payload: { error: "Invalid PAN format. Must be 10 alphanumeric characters." },
      created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function emptyState(): DemoState {
  return {
    version: 1,
    session: null,
    profile: {
      display_name: "",
      company_name: "",
      contact_email: "",
      plan: "free",
      onboarded: false,
    },
    keys: [],
    wallet_balance: 4993.40,
    wallet_transactions: getDefaultWalletTransactions(),
    api_hit_logs: getDefaultApiHitLogs(),
    usage: [],
    audit: [],
    webhooks: [],
  };
}

function read(): DemoState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as DemoState;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

function write(state: DemoState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("bharatapi:state"));
}

function update(fn: (state: DemoState) => void): DemoState {
  const state = read();
  fn(state);
  write(state);
  return state;
}

function logAudit(state: DemoState, action: string, target: string, detail: string) {
  state.audit.unshift({
    id: `aud_${randomHex(6)}`,
    created_at: new Date().toISOString(),
    action,
    target,
    actor: state.session?.email ?? "system",
    detail,
  });
  state.audit = state.audit.slice(0, 400);
}

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/* ------------------------------------------------------------------ auth --- */

export function getSession(): Session | null {
  return read().session;
}

export function setSessionFromBackend(user: { id: number; name: string; email: string; company_name?: string | null; plan?: PlanId; onboarded?: boolean }) {
  const session: Session = {
    email: user.email,
    display_name: user.name || user.email.split('@')[0]!,
    signed_in_at: new Date().toISOString(),
  };

  update((state) => {
    state.session = session;
    state.profile.contact_email = user.email;
    state.profile.display_name = user.name || user.email.split('@')[0]!;
    state.profile.company_name = user.company_name || '';
    state.profile.plan = (user.plan as PlanId) || 'free';
    state.profile.onboarded = Boolean(user.onboarded);
    logAudit(state, "auth.sign_in", user.email, "Signed in via MySQL Backend API");
  });

  return session;
}

export function signIn(email: string, password: string, displayName?: string): Session {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) throw new Error("Enter a valid email address.");
  if (password.trim().length < 6) throw new Error("Password must be at least 6 characters.");

  const session: Session = {
    email: trimmed,
    display_name: displayName?.trim() || trimmed.split("@")[0]!,
    signed_in_at: new Date().toISOString(),
  };

  update((state) => {
    state.session = session;
    if (!state.profile.contact_email) state.profile.contact_email = trimmed;
    if (!state.profile.display_name) state.profile.display_name = session.display_name;
    logAudit(state, "auth.sign_in", trimmed, "Signed in with credentials");
  });
  return session;
}

export function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bharat_api_token");
  }
  update((state) => {
    logAudit(state, "auth.sign_out", state.session?.email ?? "unknown", "Signed out");
    state.session = null;
  });
}

/* ------------------------------------------------------------- dashboard --- */

export type DashboardData = {
  session: Session | null;
  profile: Profile;
  keys: ApiKeyRow[];
  limits: PlanLimit;
  allLimits: PlanLimit[];
  monthlyUsage: number;
  walletBalance: number;
  walletTransactions: WalletTransactionRow[];
  apiHitLogs: ApiHitLogRow[];
  usage: UsageRow[];
  audit: AuditRow[];
  webhooks: WebhookEventRow[];
};

export function getDashboard(): DashboardData {
  const state = read();
  const limits = PLAN_LIMITS.find((l) => l.plan === state.profile.plan) ?? PLAN_LIMITS[0]!;
  const since = monthStart();
  return {
    session: state.session,
    profile: state.profile,
    keys: state.keys,
    limits,
    allLimits: PLAN_LIMITS,
    monthlyUsage: state.usage.filter((u) => u.created_at >= since).length,
    walletBalance: typeof state.wallet_balance === "number" ? state.wallet_balance : 4993.40,
    walletTransactions: state.wallet_transactions?.length ? state.wallet_transactions : getDefaultWalletTransactions(),
    apiHitLogs: state.api_hit_logs?.length ? state.api_hit_logs : getDefaultApiHitLogs(),
    usage: state.usage,
    audit: state.audit,
    webhooks: state.webhooks,
  };
}

export function topupWallet(input: { amount: number; paymentMethod: string; note?: string }) {
  const state = read();
  const current = typeof state.wallet_balance === "number" ? state.wallet_balance : 4993.40;
  const newBalance = Number((current + input.amount).toFixed(2));
  const txnId = `txn_w_${randomHex(8)}`;
  const row: WalletTransactionRow = {
    id: txnId,
    type: "credit",
    amount: input.amount,
    balance_after: newBalance,
    description: `Wallet recharge via ${input.paymentMethod}${input.note ? ` (${input.note})` : ""}`,
    category: "topup",
    reference_id: `pay_${randomHex(8)}`,
    payment_method: input.paymentMethod,
    status: "success",
    created_at: new Date().toISOString(),
  };

  update((s) => {
    s.wallet_balance = newBalance;
    s.wallet_transactions = [row, ...(s.wallet_transactions || getDefaultWalletTransactions())];
    logAudit(s, "wallet.recharge", `₹${input.amount.toFixed(2)}`, `Recharge via ${input.paymentMethod}. New balance: ₹${newBalance.toFixed(2)}`);
  });

  return { ok: true as const, transaction: row, newBalance };
}

export async function saveProfile(input: {
  display_name: string;
  company_name: string;
  contact_email: string;
  plan: PlanId;
}) {
  try {
    if (typeof window !== "undefined" && localStorage.getItem("bharat_api_token")) {
      const { apiClient } = await import("./api-client");
      await apiClient.updateProfile({
        display_name: input.display_name,
        company_name: input.company_name,
        plan: input.plan,
      });
    }
  } catch (err) {
    console.warn("Backend profile sync notice:", err);
  }

  update((state) => {
    state.profile = { ...state.profile, ...input, onboarded: true };
    logAudit(state, "profile.updated", input.company_name, `Plan set to ${input.plan}`);
  });
  return { ok: true as const };
}

/* ------------------------------------------------------------------ keys --- */

export function createApiKey(input: { label: string; environment: "sandbox" | "live" }) {
  const state = read();
  const limits = PLAN_LIMITS.find((l) => l.plan === state.profile.plan) ?? PLAN_LIMITS[0]!;
  const active = state.keys.filter((k) => !k.revoked).length;
  if (active >= limits.max_keys) {
    return {
      ok: false as const,
      error: `Your ${limits.label} plan allows ${limits.max_keys} active keys. Revoke one first or upgrade.`,
    };
  }

  const { plaintext, prefix, lastFour } = buildApiKey(input.environment);
  const row: ApiKeyRow = {
    id: `key_${randomHex(8)}`,
    label: input.label,
    environment: input.environment,
    key_prefix: prefix,
    last_four: lastFour,
    secret: plaintext,
    webhook_secret: `whsec_${randomHex(20)}`,
    revoked: false,
    revoked_at: null,
    rotated_at: null,
    last_used_at: null,
    created_at: new Date().toISOString(),
  };

  update((s) => {
    s.keys.unshift(row);
    logAudit(s, "api_key.created", row.label, `${input.environment} key ${prefix}••••${lastFour}`);
  });

  return { ok: true as const, key: row, plaintext };
}

/** Issues a new secret for an existing key, keeping its label and history. */
export function rotateApiKey(input: { id: string; revokeOldImmediately: boolean }) {
  const state = read();
  const existing = state.keys.find((k) => k.id === input.id);
  if (!existing) return { ok: false as const, error: "Key not found." };
  if (existing.revoked) return { ok: false as const, error: "Revoked keys cannot be rotated." };

  const { plaintext, prefix, lastFour } = buildApiKey(existing.environment);
  const now = new Date().toISOString();

  const replacement: ApiKeyRow = {
    ...existing,
    id: `key_${randomHex(8)}`,
    key_prefix: prefix,
    last_four: lastFour,
    secret: plaintext,
    rotated_at: now,
    last_used_at: null,
    created_at: now,
  };

  update((s) => {
    const old = s.keys.find((k) => k.id === input.id);
    if (old) {
      old.label = `${existing.label} (rotated)`;
      if (input.revokeOldImmediately) {
        old.revoked = true;
        old.revoked_at = now;
      }
    }
    s.keys.unshift(replacement);
    logAudit(
      s,
      "api_key.rotated",
      existing.label,
      input.revokeOldImmediately
        ? `Old key revoked immediately, new secret ${prefix}••••${lastFour}`
        : `Old key kept active for grace period, new secret ${prefix}••••${lastFour}`,
    );
  });

  return { ok: true as const, key: replacement, plaintext };
}

export function revokeApiKey(input: { id: string }) {
  update((state) => {
    const key = state.keys.find((k) => k.id === input.id);
    if (!key) return;
    key.revoked = true;
    key.revoked_at = new Date().toISOString();
    logAudit(state, "api_key.revoked", key.label, `${key.key_prefix}••••${key.last_four} disabled`);
  });
  return { ok: true as const };
}

export function deleteApiKey(input: { id: string }) {
  update((state) => {
    const key = state.keys.find((k) => k.id === input.id);
    state.keys = state.keys.filter((k) => k.id !== input.id);
    if (key) logAudit(state, "api_key.deleted", key.label, "Key permanently deleted");
  });
  return { ok: true as const };
}

/* --------------------------------------------------------------- try-it --- */

export type TryResult =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      status: number;
      mode: string;
      durationMs: number;
      note: string | null;
      body: string;
      usage: { used: number; quota: number; plan: PlanId };
    };

export async function tryEndpoint(input: {
  endpointId: string;
  apiKey: string;
  input: Record<string, unknown>;
}): Promise<TryResult> {
  const endpoint = getEndpoint(input.endpointId);
  if (!endpoint) return { ok: false, status: 404, error: "Unknown endpoint." };

  const state = read();
  const key = state.keys.find((k) => k.secret === input.apiKey.trim());
  if (!key) {
    return { ok: false, status: 401, error: "Invalid API key. Paste one of your keys from the dashboard." };
  }
  if (key.revoked) return { ok: false, status: 401, error: "This API key has been revoked." };

  const limits = PLAN_LIMITS.find((l) => l.plan === state.profile.plan) ?? PLAN_LIMITS[0]!;
  const used = state.usage.filter((u) => u.created_at >= monthStart()).length;
  if (used >= limits.monthly_requests) {
    return {
      ok: false,
      status: 429,
      error: `Monthly quota reached (${used}/${limits.monthly_requests} requests on the ${limits.label} plan).`,
    };
  }

  const started = Date.now();
  await new Promise((r) => setTimeout(r, 180 + Math.floor(Math.random() * 220)));
  const durationMs = Date.now() - started;
  const body = JSON.stringify(
    {
      ...(endpoint.sampleResponse as Record<string, unknown>),
      _sandbox: true,
      _echo: input.input,
      _generated_at: new Date().toISOString(),
    },
    null,
    2,
  );

  update((s) => {
    const target = s.keys.find((k) => k.id === key.id);
    if (target) target.last_used_at = new Date().toISOString();
    s.usage.unshift({
      id: `req_${randomHex(6)}`,
      api_key_id: key.id,
      key_label: key.label,
      endpoint_id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
      status_code: 200,
      duration_ms: durationMs,
      mode: key.environment === "live" ? "live-simulated" : "sandbox",
      created_at: new Date().toISOString(),
    });
    s.usage = s.usage.slice(0, 1000);
    logAudit(s, "api.request", `${endpoint.method} ${endpoint.path}`, `200 in ${durationMs}ms via ${key.label}`);
  });

  return {
    ok: true,
    status: 200,
    mode: key.environment === "live" ? "live-simulated" : "sandbox",
    durationMs,
    note: "Demo mode — responses are generated from the documented example payloads.",
    body,
    usage: { used: used + 1, quota: limits.monthly_requests, plan: state.profile.plan },
  };
}

/* -------------------------------------------------------------- webhooks --- */

export async function signWebhookEvent(input: {
  keyId: string;
  eventType: string;
  endpointUrl?: string;
  payload?: Record<string, unknown>;
}) {
  const state = read();
  const key = state.keys.find((k) => k.id === input.keyId);
  if (!key) return { ok: false as const, error: "Key not found." };

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(
    {
      id: `evt_${randomHex(8)}`,
      type: input.eventType,
      created: Number(timestamp),
      livemode: key.environment === "live",
      data: input.payload ?? { object: { status: "verified", request_id: `req_${randomHex(4)}` } },
    },
    null,
    2,
  );
  const signature = await hmacSha256Hex(key.webhook_secret, `${timestamp}.${body}`);
  const header = `t=${timestamp},v1=${signature}`;

  const event: WebhookEventRow = {
    id: `evt_${randomHex(6)}`,
    key_id: key.id,
    key_label: key.label,
    type: input.eventType,
    timestamp,
    body,
    signature,
    header,
    endpoint_url: input.endpointUrl?.trim() || "https://example.com/webhooks/bharatapi",
    created_at: new Date().toISOString(),
    deliveries: [
      {
        attempt: 1,
        at: new Date().toISOString(),
        status_code: 200,
        response: '{"received":true}',
      },
    ],
  };

  update((s) => {
    s.webhooks.unshift(event);
    s.webhooks = s.webhooks.slice(0, 200);
    logAudit(s, "webhook.sent", input.eventType, `Signed event delivered to ${event.endpoint_url}`);
  });

  return {
    ok: true as const,
    event,
    timestamp,
    body,
    header,
    signature,
    secretPreview: `${key.webhook_secret.slice(0, 11)}…${key.webhook_secret.slice(-4)}`,
  };
}

/** Re-delivers a stored event with a fresh timestamp + signature. */
export async function replayWebhookEvent(input: { eventId: string; resign: boolean }) {
  const state = read();
  const event = state.webhooks.find((e) => e.id === input.eventId);
  if (!event) return { ok: false as const, error: "Event not found." };
  const key = state.keys.find((k) => k.id === event.key_id);
  if (!key) return { ok: false as const, error: "Signing key no longer exists." };

  const timestamp = input.resign ? Math.floor(Date.now() / 1000).toString() : event.timestamp;
  const signature = await hmacSha256Hex(key.webhook_secret, `${timestamp}.${event.body}`);
  const header = `t=${timestamp},v1=${signature}`;
  const failed = Math.random() < 0.2;

  update((s) => {
    const target = s.webhooks.find((e) => e.id === input.eventId);
    if (!target) return;
    target.timestamp = timestamp;
    target.signature = signature;
    target.header = header;
    target.deliveries.push({
      attempt: target.deliveries.length + 1,
      at: new Date().toISOString(),
      status_code: failed ? 500 : 200,
      response: failed ? '{"error":"receiver timeout"}' : '{"received":true}',
    });
    logAudit(
      s,
      "webhook.replayed",
      target.type,
      `Attempt ${target.deliveries.length} → ${failed ? 500 : 200}${input.resign ? " (re-signed)" : " (original signature)"}`,
    );
  });

  return { ok: true as const, statusCode: failed ? 500 : 200, header, signature, timestamp };
}

export async function verifyWebhookSignature(input: {
  keyId: string;
  timestamp: string;
  body: string;
  header: string;
  toleranceSeconds?: number;
}) {
  const state = read();
  const key = state.keys.find((k) => k.id === input.keyId);
  if (!key) return { valid: false, reason: "Key not found." } as const;

  const provided = /v1=([a-f0-9]+)/i.exec(input.header)?.[1] ?? input.header.trim();
  const expected = await hmacSha256Hex(key.webhook_secret, `${input.timestamp}.${input.body}`);
  const matches = timingSafeEqualHex(provided.toLowerCase(), expected);

  const tolerance = input.toleranceSeconds ?? 300;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(input.timestamp));
  const fresh = Number.isFinite(age) && age <= tolerance;

  return {
    valid: matches && fresh,
    signatureMatches: matches,
    timestampFresh: fresh,
    ageSeconds: age,
    expected,
    provided,
    reason: !matches
      ? "Signature does not match — the payload, timestamp, or signing secret differs."
      : !fresh
        ? `Timestamp is ${age}s old, outside the ${tolerance}s replay window.`
        : "Signature and timestamp both valid.",
  } as const;
}

/* ------------------------------------------------------------------- csv --- */

export function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function endpointLabel(id: string): string {
  const e: ApiEndpoint | undefined = getEndpoint(id);
  return e ? e.title : id;
}
