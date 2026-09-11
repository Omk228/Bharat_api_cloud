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
  is_active?: boolean;
  is_suspended?: boolean;
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
  numeric_id?: number;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  description: string;
  category: "topup" | "api_usage" | "refund" | "bonus";
  reference_id: string;
  payment_method?: string;
  api_endpoint?: string;
  status: "success" | "pending" | "rejected";
  utr_number?: string;
  admin_notes?: string;
  payment_screenshot?: string | null;
  created_at: string;
};

export type ApiHitLogRow = {
  id: string;
  request_id: string;
  service_name?: string;
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

export type IpWhitelistRow = {
  id: string;
  ip_address: string;
  label: string;
  environment: "all" | "live" | "sandbox";
  status: "active" | "disabled";
  created_at: string;
  last_used_at?: string | null;
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
  ip_whitelist: IpWhitelistRow[];
  ip_enforcement_enabled: boolean;
  usage: UsageRow[];
  audit: AuditRow[];
  webhooks: WebhookEventRow[];
};

const STORAGE_KEY = "bharatapi.console.v1";

function getDefaultWalletTransactions(): WalletTransactionRow[] {
  return [];
}

function getDefaultApiHitLogs(): ApiHitLogRow[] {
  return [];
}

function getDefaultIpWhitelist(): IpWhitelistRow[] {
  return [];
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
      onboarded: true,
    },
    keys: [],
    wallet_balance: 0.00,
    wallet_transactions: [],
    api_hit_logs: [],
    ip_whitelist: [],
    ip_enforcement_enabled: false,
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
    if (parsed.api_hit_logs) {
      parsed.api_hit_logs = parsed.api_hit_logs.filter((l) => !l.id?.startsWith("log_hit_10"));
    }
    if (parsed.wallet_transactions) {
      parsed.wallet_transactions = parsed.wallet_transactions.filter((t) => !t.id?.startsWith("txn_w_10"));
    }
    if (parsed.ip_whitelist) {
      parsed.ip_whitelist = parsed.ip_whitelist.filter((w) => !w.id?.startsWith("ip_wl_10"));
    }
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

export function getStoredUserEmail(): string {
  if (typeof window === "undefined") return "";
  const s = read();
  return (s.session?.email || s.profile?.contact_email || "").trim().toLowerCase();
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
    state.profile.onboarded = true;
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
    localStorage.removeItem(STORAGE_KEY);
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
  isSuspended: boolean;
  keys: ApiKeyRow[];
  limits: PlanLimit;
  allLimits: PlanLimit[];
  monthlyUsage: number;
  totalHits: number;
  todayHits: number;
  monthHits: number;
  successHits: number;
  todaySpend: number;
  monthSpend: number;
  walletBalance: number;
  walletTransactions: WalletTransactionRow[];
  apiHitLogs: ApiHitLogRow[];
  ipWhitelist: IpWhitelistRow[];
  ipEnforcementEnabled: boolean;
  usage: UsageRow[];
  audit: AuditRow[];
  webhooks: WebhookEventRow[];
};

export async function getDashboard(): Promise<DashboardData> {
  const state = read();
  const limits = PLAN_LIMITS.find((l) => l.plan === state.profile.plan) ?? PLAN_LIMITS[0]!;
  const since = monthStart();

  let liveBalance = typeof state.wallet_balance === "number" ? state.wallet_balance : 0.00;
  let liveTodaySpend = 0.00;
  let liveMonthSpend = 0.00;
  let liveTotalHits = 0;
  let liveTodayHits = 0;
  let liveMonthHits = 0;
  let liveSuccessHits = 0;
  let liveTransactions: WalletTransactionRow[] = Array.isArray(state.wallet_transactions) ? state.wallet_transactions : [];
  let liveHitLogs: ApiHitLogRow[] = Array.isArray(state.api_hit_logs) ? state.api_hit_logs : [];
  let liveKeys: ApiKeyRow[] = Array.isArray(state.keys) ? state.keys : [];
  let isSuspended = Boolean(state.profile?.is_suspended || state.profile?.is_active === false);

  if (typeof window !== "undefined" && localStorage.getItem("bharat_api_token")) {
    try {
      const { apiClient } = await import("./api-client");
      const [profileRes, walletRes, txsRes, logsRes, credsRes] = await Promise.allSettled([
        apiClient.getProfile(),
        apiClient.getWalletBalance(),
        apiClient.getWalletTransactions({ limit: 100 }),
        apiClient.getApiHitLogs({ limit: 100 }),
        apiClient.getCredentials(),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value) {
        const p = profileRes.value;
        if (p.is_suspended || p.is_active === false) {
          isSuspended = true;
        }
        state.profile.display_name = p.name || state.profile.display_name || "";
        state.profile.company_name = p.company_name || state.profile.company_name || "";
        state.profile.contact_email = p.email || state.profile.contact_email || "";
        state.profile.plan = (p.plan as PlanId) || state.profile.plan || "free";
        state.profile.is_suspended = isSuspended;
        state.profile.is_active = !isSuspended;
      } else if (profileRes.status === "rejected") {
        const errMsg = String((profileRes.reason as { message?: string })?.message || "");
        if (errMsg.toLowerCase().includes("suspended") || errMsg.toLowerCase().includes("deactivated")) {
          isSuspended = true;
          state.profile.is_suspended = true;
          state.profile.is_active = false;
        }
      }

      if (walletRes.status === "fulfilled" && walletRes.value) {
        const wb = walletRes.value.wallet_balance;
        liveBalance = typeof wb === "number" ? wb : parseFloat(String(wb) || "0") || 0;
        liveTodaySpend = typeof walletRes.value.today_spend === "number" ? walletRes.value.today_spend : 0;
        liveMonthSpend = typeof walletRes.value.month_spend === "number" ? walletRes.value.month_spend : 0;
        liveTotalHits = typeof walletRes.value.total_hits === "number" ? walletRes.value.total_hits : 0;
        liveTodayHits = typeof walletRes.value.today_hits === "number" ? walletRes.value.today_hits : 0;
        liveMonthHits = typeof walletRes.value.month_hits === "number" ? walletRes.value.month_hits : 0;
        liveSuccessHits = typeof walletRes.value.success_hits === "number" ? walletRes.value.success_hits : 0;
      }
      if (txsRes.status === "fulfilled" && Array.isArray(txsRes.value)) {
        liveTransactions = txsRes.value as WalletTransactionRow[];
      }
      if (logsRes.status === "fulfilled" && Array.isArray(logsRes.value)) {
        liveHitLogs = logsRes.value as ApiHitLogRow[];
      }
      if (credsRes.status === "fulfilled" && Array.isArray(credsRes.value)) {
        liveKeys = credsRes.value.map((c: any) => ({
          id: String(c.id),
          label: c.label || "API Key",
          environment: c.environment === "production" ? "live" : "sandbox",
          key_prefix: (c.api_key || "").slice(0, 7),
          last_four: (c.api_key || "").slice(-4),
          secret: c.api_key,
          webhook_secret: "",
          revoked: c.status === "revoked",
          revoked_at: null,
          rotated_at: null,
          last_used_at: c.last_used_at,
          created_at: c.created_at,
        }));
      }
    } catch (err) {
      console.warn("Backend live wallet sync notice:", err);
    }
  }

  const finalTotalHits = liveTotalHits || liveHitLogs.length;
  const finalMonthHits = liveMonthHits || liveHitLogs.filter((u) => u.created_at >= since).length;

  return {
    session: state.session,
    profile: state.profile,
    isSuspended,
    keys: liveKeys,
    limits,
    allLimits: PLAN_LIMITS,
    monthlyUsage: finalMonthHits,
    totalHits: finalTotalHits,
    todayHits: liveTodayHits,
    monthHits: finalMonthHits,
    successHits: liveSuccessHits,
    todaySpend: liveTodaySpend,
    monthSpend: liveMonthSpend,
    walletBalance: liveBalance,
    walletTransactions: liveTransactions,
    apiHitLogs: liveHitLogs,
    ipWhitelist: state.ip_whitelist || [],
    ipEnforcementEnabled: state.ip_enforcement_enabled ?? false,
    usage: state.usage || [],
    audit: state.audit || [],
    webhooks: state.webhooks || [],
  };
}

export function addIpWhitelist(input: {
  ip_address: string;
  label: string;
  environment: "all" | "live" | "sandbox";
}) {
  const trimmedIp = input.ip_address.trim();
  if (!trimmedIp) return { ok: false as const, error: "Please provide a valid IPv4/IPv6 address or CIDR block." };

  const id = `ip_wl_${randomHex(6)}`;
  const row: IpWhitelistRow = {
    id,
    ip_address: trimmedIp,
    label: input.label.trim() || "API Client Server",
    environment: input.environment,
    status: "active",
    created_at: new Date().toISOString(),
    last_used_at: null,
  };

  update((s) => {
    const list = s.ip_whitelist || [];
    s.ip_whitelist = [row, ...list];
    logAudit(s, "ip_whitelist.added", trimmedIp, `${input.label} (${input.environment})`);
  });

  return { ok: true as const, row };
}

export function deleteIpWhitelist(id: string) {
  update((s) => {
    const list = s.ip_whitelist || [];
    const target = list.find((x) => x.id === id);
    s.ip_whitelist = list.filter((x) => x.id !== id);
    if (target) {
      logAudit(s, "ip_whitelist.deleted", target.ip_address, target.label);
    }
  });
  return { ok: true as const };
}

export function toggleIpWhitelist(id: string, newStatus: "active" | "disabled") {
  update((s) => {
    const list = s.ip_whitelist || [];
    const item = list.find((x) => x.id === id);
    if (item) {
      item.status = newStatus;
      logAudit(s, "ip_whitelist.status_change", item.ip_address, `Set to ${newStatus}`);
    }
    s.ip_whitelist = [...list];
  });
  return { ok: true as const };
}

export function setIpEnforcementMode(enabled: boolean) {
  update((s) => {
    s.ip_enforcement_enabled = enabled;
    logAudit(s, "security.ip_enforcement", enabled ? "ENABLED" : "DISABLED", "Strict IP Whitelisting Policy");
  });
  return { ok: true as const };
}

export async function topupWallet(input: { amount: number; paymentMethod: string; note?: string }) {
  const state = read();
  const current = typeof state.wallet_balance === "number" ? state.wallet_balance : 0.00;
  let newBalance = Number((current + input.amount).toFixed(2));
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

  if (typeof window !== "undefined" && localStorage.getItem("bharat_api_token")) {
    try {
      const { apiClient } = await import("./api-client");
      const backendRes = await apiClient.topupWallet({
        amount: input.amount,
        method: input.paymentMethod,
        referenceId: `pay_${randomHex(8)}`,
      });
      if (backendRes) {
        newBalance = backendRes.wallet_balance;
        row.balance_after = newBalance;
      }
    } catch (err) {
      console.warn("Backend topup sync notice:", err);
    }
  }

  update((s) => {
    s.wallet_balance = newBalance;
    s.wallet_transactions = [row, ...(s.wallet_transactions || [])];
    logAudit(s, "wallet.recharge", `₹${input.amount.toFixed(2)}`, `Recharge via ${input.paymentMethod}. New balance: ₹${newBalance.toFixed(2)}`);
  });

  return { ok: true as const, transaction: row, newBalance };
}

export async function submitRechargeRequest(input: {
  amount: number;
  utr_number: string;
  paymentMethod: string;
  screenshot?: string | null;
}) {
  const state = read();
  const current = typeof state.wallet_balance === "number" ? state.wallet_balance : 0.00;
  const cleanUtr = input.utr_number.trim().replace(/[\s-]/g, "");
  const txnId = `txn_w_${randomHex(8)}`;

  const row: WalletTransactionRow = {
    id: txnId,
    type: "credit",
    amount: input.amount,
    balance_after: current, // Balance does NOT change yet!
    description: `Wallet recharge via ${input.paymentMethod} (UTR: ${cleanUtr})`,
    category: "topup",
    reference_id: `utr_${cleanUtr}`,
    payment_method: input.paymentMethod,
    status: "pending",
    utr_number: cleanUtr,
    payment_screenshot: input.screenshot || null,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined" && localStorage.getItem("bharat_api_token")) {
    try {
      const { apiClient } = await import("./api-client");
      const backendRes = await apiClient.submitRechargeRequest({
        amount: input.amount,
        utr_number: cleanUtr,
        method: input.paymentMethod,
        screenshot: input.screenshot || null,
      });
      if (backendRes) {
        row.id = backendRes.transaction_id;
        row.numeric_id = backendRes.numeric_id;
      }
    } catch (err) {
      console.warn("Backend recharge request sync error:", err);
      throw err;
    }
  }

  update((s) => {
    s.wallet_transactions = [row, ...(s.wallet_transactions || [])];
    logAudit(s, "wallet.utr_submitted", `₹${input.amount.toFixed(2)}`, `Submitted UTR ${cleanUtr} & Screenshot for Admin Verification`);
  });

  return { ok: true as const, transaction: row };
}

export async function approveRechargeRequest(transactionId: string, amount: number) {
  if (typeof window !== "undefined" && localStorage.getItem("bharat_api_token")) {
    try {
      const { apiClient } = await import("./api-client");
      await apiClient.approveRecharge(transactionId);
    } catch (err) {
      console.warn("Backend approve recharge error:", err);
      throw err;
    }
  }

  update((s) => {
    const list = s.wallet_transactions || [];
    const target = list.find((t) => t.id === transactionId || String(t.numeric_id) === transactionId);
    if (target) {
      target.status = "success";
      s.wallet_balance = Number(((s.wallet_balance || 0) + amount).toFixed(2));
      target.balance_after = s.wallet_balance;
      logAudit(s, "admin.wallet_approved", `₹${amount.toFixed(2)}`, `Recharge ${transactionId} approved`);
    }
  });

  return { ok: true as const };
}

export async function rejectRechargeRequest(transactionId: string, reason = "Invalid UTR") {
  if (typeof window !== "undefined" && localStorage.getItem("bharat_api_token")) {
    try {
      const { apiClient } = await import("./api-client");
      await apiClient.rejectRecharge(transactionId, { reason });
    } catch (err) {
      console.warn("Backend reject recharge error:", err);
      throw err;
    }
  }

  update((s) => {
    const list = s.wallet_transactions || [];
    const target = list.find((t) => t.id === transactionId || String(t.numeric_id) === transactionId);
    if (target) {
      target.status = "rejected";
      target.admin_notes = reason;
      logAudit(s, "admin.wallet_rejected", reason, `Recharge ${transactionId} rejected`);
    }
  });

  return { ok: true as const };
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
