import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Activity,
  Loader2,
  LogOut,
  BookOpen,
  Download,
  RefreshCw,
  Ban,
  Webhook,
  Send,
  ScrollText,
  Radio,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  createApiKey,
  deleteApiKey,
  downloadCsv,
  endpointLabel,
  getDashboard,
  replayWebhookEvent,
  revokeApiKey,
  rotateApiKey,
  saveProfile,
  signOut,
  toCsv,
  type ApiKeyRow,
  type AuditRow,
  type PlanId,
  type UsageRow,
  type WebhookEventRow,
} from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Developer Dashboard — VeroKYC API Keys, Usage & Webhooks" },
      {
        name: "description",
        content:
          "Manage VeroKYC API keys with rotation and revocation, monitor monthly usage, export CSV usage and audit logs, and replay signed webhook events.",
      },
      { property: "og:title", content: "Developer Dashboard — VeroKYC" },
      {
        property: "og:description",
        content: "API key rotation, usage and audit CSV exports, and webhook replay controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">Could not load dashboard: {error.message}</div>
  ),
});

function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => getDashboard(),
  });

  function handleSignOut() {
    signOut();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">VeroKYC</span>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              Console
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/status"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <Radio className="h-4 w-4" /> Status
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" /> Docs
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {!data.profile.onboarded ? (
          <Onboarding
            defaults={{
              display_name: data.profile.display_name,
              company_name:
                data.profile.company_name ||
                (typeof window !== "undefined"
                  ? (window.sessionStorage.getItem("verokyc.signup.company") ?? "")
                  : ""),
              contact_email: data.profile.contact_email,
            }}
          />
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back{data.profile.display_name ? `, ${data.profile.display_name}` : ""}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.profile.company_name} · {data.limits.label} plan
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Requests this month"
                value={`${data.monthlyUsage.toLocaleString("en-IN")} / ${data.limits.monthly_requests.toLocaleString("en-IN")}`}
              />
              <Stat label="Rate limit" value={`${data.limits.rate_limit_per_minute} req/min`} />
              <Stat
                label="Active keys"
                value={`${data.keys.filter((k) => !k.revoked).length} / ${data.limits.max_keys}`}
              />
            </div>

            <UsageBar used={data.monthlyUsage} quota={data.limits.monthly_requests} />

            <ApiKeys keys={data.keys} />

            <WebhookHistory events={data.webhooks} />

            <UsageLog usage={data.usage} />

            <AuditLog audit={data.audit} />
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function UsageBar({ used, quota }: { used: number; quota: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(quota, 1)) * 100));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Monthly quota</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${pct > 90 ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon} {title}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function ExportButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <Download className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Onboarding({
  defaults,
}: {
  defaults: { display_name: string; company_name: string; contact_email: string };
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    display_name: defaults.display_name,
    company_name: defaults.company_name,
    contact_email: defaults.contact_email,
    plan: "free" as PlanId,
  });

  const mutation = useMutation({
    mutationFn: async () => saveProfile(form),
    onSuccess: () => {
      toast.success("Profile saved — you can create API keys now.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 1 of 2</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Tell us about your integration</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This sets your plan limits and appears on your API key audit trail.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        {(
          [
            ["display_name", "Your name", "Aarav Sharma"],
            ["company_name", "Company", "Acme Fintech Pvt Ltd"],
            ["contact_email", "Technical contact email", "dev@company.com"],
          ] as const
        ).map(([field, label, placeholder]) => (
          <label key={field} className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <input
              required
              maxLength={200}
              value={form[field]}
              placeholder={placeholder}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
        ))}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Plan
          </span>
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value as PlanId })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="free">Sandbox — 500 requests/month</option>
            <option value="growth">Growth — 50,000 requests/month</option>
            <option value="scale">Scale — 1,000,000 requests/month</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Continue
        </button>
      </form>
    </div>
  );
}

function SecretCallout({ secret, title }: { secret: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
      <p className="text-xs uppercase tracking-wider text-primary">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-terminal px-3 py-2 font-mono text-xs">{secret}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
          aria-label="Copy API key"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ApiKeys({ keys }: { keys: ApiKeyRow[] }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("Server key");
  const [environment, setEnvironment] = useState<"sandbox" | "live">("sandbox");
  const [fresh, setFresh] = useState<{ secret: string; title: string } | null>(null);
  const [graceRotation, setGraceRotation] = useState(true);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  const createMutation = useMutation({
    mutationFn: async () => createApiKey({ label, environment }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFresh({ secret: res.plaintext, title: "Copy your new key — it is only shown once" });
      toast.success("API key created.");
      invalidate();
    },
  });

  const rotateMutation = useMutation({
    mutationFn: async (id: string) => rotateApiKey({ id, revokeOldImmediately: !graceRotation }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFresh({ secret: res.plaintext, title: "Rotated key — update your servers now" });
      toast.success(
        graceRotation
          ? "Key rotated. The old key stays active until you revoke it."
          : "Key rotated and the old secret was revoked immediately.",
      );
      invalidate();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => revokeApiKey({ id }),
    onSuccess: () => {
      toast.success("Key revoked.");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteApiKey({ id }),
    onSuccess: () => {
      toast.success("Key deleted.");
      invalidate();
    },
  });

  return (
    <section>
      <SectionHeading
        icon={<KeyRound className="h-4 w-4 text-primary" />}
        title="API keys"
        action={
          keys.length > 0 ? (
            <ExportButton
              label="Export keys CSV"
              onClick={() => {
                const csv = toCsv(
                  keys.map((k) => ({
                    id: k.id,
                    label: k.label,
                    environment: k.environment,
                    masked: `${k.key_prefix}****${k.last_four}`,
                    status: k.revoked ? "revoked" : "active",
                    created_at: k.created_at,
                    rotated_at: k.rotated_at ?? "",
                    revoked_at: k.revoked_at ?? "",
                    last_used_at: k.last_used_at ?? "",
                  })),
                  [
                    "id",
                    "label",
                    "environment",
                    "masked",
                    "status",
                    "created_at",
                    "rotated_at",
                    "revoked_at",
                    "last_used_at",
                  ],
                );
                downloadCsv(`verokyc-api-keys-${Date.now()}.csv`, csv);
              }}
            />
          ) : undefined
        }
      />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-40 flex-1">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Label
            </span>
            <input
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Environment
            </span>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "sandbox" | "live")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </label>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate key
          </button>
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={graceRotation}
            onChange={(e) => setGraceRotation(e.target.checked)}
            className="h-3.5 w-3.5 accent-current"
          />
          On rotation, keep the old key active as a grace period (uncheck to revoke it instantly)
        </label>

        {fresh && <SecretCallout secret={fresh.secret} title={fresh.title} />}
      </div>

      {keys.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Label</th>
                <th className="px-4 py-2.5 font-medium">Key</th>
                <th className="px-4 py-2.5 font-medium">Env</th>
                <th className="px-4 py-2.5 font-medium">Last used</th>
                <th className="px-4 py-2.5 font-medium">Controls</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    {k.label}
                    {k.revoked && (
                      <span className="ml-2 rounded bg-destructive/15 px-1.5 py-0.5 text-xs text-destructive">
                        revoked
                      </span>
                    )}
                    {k.rotated_at && !k.revoked && (
                      <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                        rotated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {k.key_prefix}••••{k.last_four}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{k.environment}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString("en-IN") : "never"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {!k.revoked && (
                        <>
                          <button
                            onClick={() => rotateMutation.mutate(k.id)}
                            disabled={rotateMutation.isPending}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Rotate
                          </button>
                          <button
                            onClick={() => revokeMutation.mutate(k.id)}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                          >
                            <Ban className="h-3.5 w-3.5" /> Revoke
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(k.id)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function WebhookHistory({ events }: { events: WebhookEventRow[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [resign, setResign] = useState(true);

  const replay = useMutation({
    mutationFn: async (eventId: string) => replayWebhookEvent({ eventId, resign }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.statusCode >= 400) toast.error(`Receiver responded ${res.statusCode} — check the log.`);
      else toast.success("Event re-delivered with a valid signature.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <section>
      <SectionHeading
        icon={<Webhook className="h-4 w-4 text-primary" />}
        title="Webhook event history"
        action={
          events.length > 0 ? (
            <ExportButton
              label="Export events CSV"
              onClick={() => {
                const csv = toCsv(
                  events.map((e) => ({
                    event_id: e.id,
                    type: e.type,
                    key_label: e.key_label,
                    endpoint_url: e.endpoint_url,
                    created_at: e.created_at,
                    attempts: e.deliveries.length,
                    last_status: e.deliveries.at(-1)?.status_code ?? "",
                    signature_header: e.header,
                  })),
                  [
                    "event_id",
                    "type",
                    "key_label",
                    "endpoint_url",
                    "created_at",
                    "attempts",
                    "last_status",
                    "signature_header",
                  ],
                );
                downloadCsv(`verokyc-webhook-events-${Date.now()}.csv`, csv);
              }}
            />
          ) : undefined
        }
      />

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No webhook events yet. Generate a signed test event from the{" "}
          <Link to="/docs" className="text-primary hover:underline">
            docs webhook tester
          </Link>{" "}
          and it will appear here with replay controls.
        </p>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={resign}
              onChange={(e) => setResign(e.target.checked)}
              className="h-3.5 w-3.5 accent-current"
            />
            Re-sign with a fresh timestamp on replay (uncheck to test your replay-window rejection)
          </label>

          {events.map((e) => {
            const last = e.deliveries.at(-1);
            return (
              <div key={e.id} className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="font-mono text-xs text-primary">{e.type}</span>
                  <span className="font-mono text-xs text-muted-foreground">{e.id}</span>
                  <span
                    className={`font-mono text-xs ${
                      (last?.status_code ?? 0) < 400 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {last?.status_code}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {e.deliveries.length} attempt{e.deliveries.length > 1 ? "s" : ""} ·{" "}
                    {new Date(e.created_at).toLocaleString("en-IN")}
                  </span>
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <button
                      onClick={() => replay.mutate(e.id)}
                      disabled={replay.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" /> Replay
                    </button>
                    <button
                      onClick={() => setOpen(open === e.id ? null : e.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {open === e.id ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>

                {open === e.id && (
                  <div className="space-y-3 border-t border-border px-4 py-3 text-xs">
                    <div>
                      <p className="mb-1 uppercase tracking-wider text-muted-foreground">
                        Destination
                      </p>
                      <code className="font-mono">{e.endpoint_url}</code>
                    </div>
                    <div>
                      <p className="mb-1 uppercase tracking-wider text-muted-foreground">
                        VeroKYC-Signature
                      </p>
                      <code className="block break-all rounded bg-terminal px-3 py-2 font-mono">
                        {e.header}
                      </code>
                    </div>
                    <div>
                      <p className="mb-1 uppercase tracking-wider text-muted-foreground">Payload</p>
                      <pre className="overflow-x-auto rounded bg-terminal px-3 py-2 font-mono leading-relaxed">
                        {e.body}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 uppercase tracking-wider text-muted-foreground">
                        Delivery attempts
                      </p>
                      <ul className="space-y-1">
                        {e.deliveries.map((d) => (
                          <li key={d.attempt} className="font-mono text-muted-foreground">
                            #{d.attempt} · {new Date(d.at).toLocaleString("en-IN")} ·{" "}
                            <span className={d.status_code < 400 ? "text-success" : "text-destructive"}>
                              {d.status_code}
                            </span>{" "}
                            · {d.response}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function UsageLog({ usage }: { usage: UsageRow[] }) {
  const [keyFilter, setKeyFilter] = useState("all");
  const keyLabels = [...new Set(usage.map((u) => u.key_label))];
  const rows = usage.filter((u) => keyFilter === "all" || u.key_label === keyFilter);

  return (
    <section>
      <SectionHeading
        icon={<Activity className="h-4 w-4 text-primary" />}
        title="Usage log"
        action={
          <div className="flex items-center gap-3">
            {keyLabels.length > 1 && (
              <select
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="all">All keys</option>
                {keyLabels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            )}
            {rows.length > 0 && (
              <ExportButton
                label="Export usage CSV"
                onClick={() => {
                  const csv = toCsv(
                    rows.map((r) => ({
                      request_id: r.id,
                      created_at: r.created_at,
                      endpoint: endpointLabel(r.endpoint_id),
                      method: r.method,
                      path: r.path,
                      status_code: r.status_code,
                      duration_ms: r.duration_ms,
                      mode: r.mode,
                      api_key: r.key_label,
                    })),
                    [
                      "request_id",
                      "created_at",
                      "endpoint",
                      "method",
                      "path",
                      "status_code",
                      "duration_ms",
                      "mode",
                      "api_key",
                    ],
                  );
                  downloadCsv(`verokyc-usage-${Date.now()}.csv`, csv);
                }}
              />
            )}
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No requests yet. Head to the{" "}
          <Link to="/docs" className="text-primary hover:underline">
            docs Try-It console
          </Link>{" "}
          and run your first call.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Endpoint</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Latency</th>
                <th className="px-4 py-2.5 font-medium">Key</th>
                <th className="px-4 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <span className="text-muted-foreground">{r.method}</span> {r.path}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        r.status_code < 300
                          ? "text-success"
                          : r.status_code < 500
                            ? "text-primary"
                            : "text-destructive"
                      }
                    >
                      {r.status_code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.duration_ms} ms</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.key_label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AuditLog({ audit }: { audit: AuditRow[] }) {
  return (
    <section>
      <SectionHeading
        icon={<ScrollText className="h-4 w-4 text-primary" />}
        title="Audit log"
        action={
          audit.length > 0 ? (
            <ExportButton
              label="Export audit CSV"
              onClick={() => {
                const csv = toCsv(
                  audit.map((a) => ({
                    id: a.id,
                    created_at: a.created_at,
                    actor: a.actor,
                    action: a.action,
                    target: a.target,
                    detail: a.detail,
                  })),
                  ["id", "created_at", "actor", "action", "target", "detail"],
                );
                downloadCsv(`verokyc-audit-${Date.now()}.csv`, csv);
              }}
            />
          ) : undefined
        }
      />

      {audit.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Key creation, rotation, revocation, webhook and request events will be recorded here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 50).map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-primary">{a.action}</td>
                  <td className="px-4 py-2.5">{a.target}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
