import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
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
                downloadCsv(`bharat-api-keys-${Date.now()}.csv`, csv);
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
