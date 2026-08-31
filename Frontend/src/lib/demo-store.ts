/**
 * Browser-only demo data layer. There is no database in this build: the whole
 * developer console (account, API keys, usage, audit log, webhook history) is
 * persisted in localStorage so every feature is explorable with dummy
 * credentials.
 */
import { buildApiKey, hmacSha256Hex, randomHex, timingSafeEqualHex } from "./demo-crypto";
import { getEndpoint, type ApiEndpoint } from "./api-catalog";

export const DEMO_EMAIL = "demo@verokyc.io";
export const DEMO_PASSWORD = "verokyc123";

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
  usage: UsageRow[];
  audit: AuditRow[];
  webhooks: WebhookEventRow[];
};

const STORAGE_KEY = "verokyc.console.v1";

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
  window.dispatchEvent(new Event("verokyc:state"));
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
    usage: state.usage,
    audit: state.audit,
    webhooks: state.webhooks,
  };
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
    endpoint_url: input.endpointUrl?.trim() || "https://example.com/webhooks/verokyc",
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
