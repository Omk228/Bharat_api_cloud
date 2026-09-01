import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  Download,
  RefreshCw,
  Ban,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import { apiClient, type ApiCredential } from "@/lib/api-client";
import {
  createApiKey,
  deleteApiKey,
  downloadCsv,
  revokeApiKey,
  rotateApiKey,
  saveProfile,
  toCsv,
  type ApiKeyRow,
  type PlanId,
} from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Developer Dashboard — Bharat API Cloud" },
      {
        name: "description",
        content: "API keys, usage monitoring, and rate limits.",
      },
    ],
  }),
  component: DashboardOverviewPage,
});

function DashboardOverviewPage() {
  return (
    <DashboardLayout activeTab="overview">
      {(data) => {
        if (!data.profile.onboarded) {
          return (
            <Onboarding
              defaults={{
                display_name: data.profile.display_name,
                company_name:
                  data.profile.company_name ||
                  (typeof window !== "undefined"
                    ? (window.sessionStorage.getItem("bharatapi.signup.company") ?? "")
                    : ""),
                contact_email: data.profile.contact_email,
              }}
            />
          );
        }

        return (
          <div className="space-y-8">
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
          </div>
        );
      }}
    </DashboardLayout>
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

function ApiKeys({ keys: fallbackKeys }: { keys: ApiKeyRow[] }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("Client Server Key");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [visibleTokens, setVisibleTokens] = useState<Record<number, boolean>>({});

  const { data: serverCreds, isLoading } = useQuery({
    queryKey: ["credentials"],
    queryFn: async () => {
      try {
        return await apiClient.getCredentials();
      } catch {
        return [];
      }
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["credentials"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => apiClient.generateCredentials({ label, environment }),
    onSuccess: () => {
      toast.success("New API credentials generated successfully!");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rotateMutation = useMutation({
    mutationFn: async (id: number) => apiClient.rotateToken(id),
    onSuccess: () => {
      toast.success("Token ID rotated successfully! Update your server config.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => apiClient.revokeCredential(id),
    onSuccess: () => {
      toast.success("Credential revoked successfully.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const creds = serverCreds || [];

  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<KeyRound className="h-4 w-4 text-primary" />}
        title="API Credentials (API ID, Key & Token)"
      />

      {/* Generator Box */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Key Label
            </span>
            <input
              value={label}
              maxLength={60}
              placeholder="e.g. AWS Production Backend"
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
              onChange={(e) => setEnvironment(e.target.value as "sandbox" | "production")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="sandbox">Sandbox (UAT)</option>
              <option value="production">Production (Live)</option>
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
            Generate New Key
          </button>
        </div>
      </div>

      {/* Credentials Cards List */}
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading credentials...
          </div>
        )}

        {!isLoading && creds.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No active API credentials found. Click &quot;Generate New Key&quot; above to create one.
          </div>
        )}

        {creds.map((c) => {
          const isVisible = visibleTokens[c.id] ?? false;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 transition-all hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">{c.label}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                      c.environment === "production"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {c.environment}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {c.status}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => rotateMutation.mutate(c.id)}
                    disabled={rotateMutation.isPending}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Rotate Token
                  </button>
                  <button
                    onClick={() => revokeMutation.mutate(c.id)}
                    disabled={revokeMutation.isPending}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" /> Revoke
                  </button>
                </div>
              </div>

              {/* 3 Key Rows */}
              <div className="grid gap-3 sm:grid-cols-3">
                {/* 1. API ID */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium uppercase tracking-wider">API ID</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.api_id);
                        toast.success("API ID copied!");
                      }}
                      className="text-muted-foreground hover:text-primary p-1"
                      title="Copy API ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <code className="block font-mono text-xs font-semibold text-primary break-all">
                    {c.api_id}
                  </code>
                </div>

                {/* 2. API Key */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium uppercase tracking-wider">API Key</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.api_key);
                        toast.success("API Key copied!");
                      }}
                      className="text-muted-foreground hover:text-primary p-1"
                      title="Copy API Key"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <code className="block font-mono text-xs text-foreground/90 break-all">
                    {c.api_key}
                  </code>
                </div>

                {/* 3. Token ID */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium uppercase tracking-wider">Token ID</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setVisibleTokens((prev) => ({ ...prev, [c.id]: !isVisible }))
                        }
                        className="text-muted-foreground hover:text-primary p-1"
                        title={isVisible ? "Hide Token" : "Show Token"}
                      >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(c.token_id || c.token_id_preview);
                          toast.success("Token ID copied!");
                        }}
                        className="text-muted-foreground hover:text-primary p-1"
                        title="Copy Token ID"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <code className="block font-mono text-xs text-foreground/90 break-all">
                    {isVisible ? c.token_id || c.token_id_preview : c.token_id_preview}
                  </code>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
