import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { useMemo } from "react";

import {
  INCIDENTS,
  STATE_LABEL,
  STATUS_COMPONENTS,
  type ComponentState,
  type Incident,
} from "@/lib/status-data";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "API Status & Uptime — Bharat API Cloud" },
      {
        name: "description",
        content:
          "Live Bharat API Cloud API status: uptime for KYC, banking, Account Aggregator and payout endpoints plus a full incident history with postmortem updates.",
      },
      { property: "og:title", content: "API Status & Uptime — Bharat API Cloud" },
      {
        property: "og:description",
        content: "Uptime, latency and incident history for every Bharat API Cloud KYC and banking endpoint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatusPage,
});

const stateTone: Record<ComponentState, string> = {
  operational: "text-success",
  degraded: "text-primary",
  partial_outage: "text-destructive",
  maintenance: "text-muted-foreground",
};

function StatusPage() {
  const overall = useMemo<ComponentState>(() => {
    if (STATUS_COMPONENTS.some((c) => c.state === "partial_outage")) return "partial_outage";
    if (STATUS_COMPONENTS.some((c) => c.state === "degraded")) return "degraded";
    if (STATUS_COMPONENTS.some((c) => c.state === "maintenance")) return "maintenance";
    return "operational";
  }, []);

  const avgUptime =
    STATUS_COMPONENTS.reduce((sum, c) => sum + c.uptime30d, 0) / STATUS_COMPONENTS.length;

  const active = INCIDENTS.filter((i) => i.status !== "resolved");
  const past = INCIDENTS.filter((i) => i.status === "resolved");

  const groups = [...new Set(STATUS_COMPONENTS.map((c) => c.group))];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-6">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Bharat API Cloud</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">Status</span>
          <Link
            to="/docs"
            className="ml-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">API status</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Real-time health for every Bharat API Cloud endpoint, with 30- and 90-day uptime, p95 latency and the
          full incident history so you know exactly when something is degraded.
        </p>

        <div
          className={`mt-8 flex flex-wrap items-center gap-3 rounded-2xl border p-5 ${
            overall === "operational" ? "border-success/40 bg-success/5" : "border-primary/40 bg-primary/5"
          }`}
        >
          {overall === "operational" ? (
            <CheckCircle2 className="h-6 w-6 text-success" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-primary" />
          )}
          <div>
            <p className="text-base font-semibold">
              {overall === "operational" ? "All systems operational" : "Some systems are degraded"}
            </p>
            <p className="text-xs text-muted-foreground">
              Updated {new Date().toLocaleString("en-IN")} · refreshed every 60 seconds
            </p>
          </div>
          <div className="ml-auto flex gap-6">
            <Metric label="30-day uptime" value={`${avgUptime.toFixed(2)}%`} />
            <Metric label="Open incidents" value={String(active.length)} />
          </div>
        </div>

        {active.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="h-4 w-4 text-primary" /> Active incident
            </h2>
            <div className="space-y-4">
              {active.map((i) => (
                <IncidentCard key={i.id} incident={i} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Components
          </h2>
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group} className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border bg-secondary/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </div>
                {STATUS_COMPONENTS.filter((c) => c.group === group).map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-4 last:border-0"
                  >
                    <div className="min-w-52 flex-1">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className={`mt-0.5 text-xs ${stateTone[c.state]}`}>{STATE_LABEL[c.state]}</p>
                    </div>
                    <div className="flex items-end gap-[2px]" aria-hidden>
                      {c.history.map((v, idx) => (
                        <span
                          key={idx}
                          title={`${45 - idx} days ago`}
                          className={`h-7 w-1.5 rounded-sm ${
                            v === 0 ? "bg-success/70" : v === 1 ? "bg-primary/80" : "bg-destructive/80"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-5 font-mono text-xs text-muted-foreground">
                      <span title="30-day uptime">{c.uptime30d.toFixed(2)}%</span>
                      <span title="90-day uptime">{c.uptime90d.toFixed(2)}%</span>
                      <span title="p95 latency">{c.p95LatencyMs} ms</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Bars show the last 45 days. Columns: 30-day uptime · 90-day uptime · p95 latency.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-4 w-4 text-primary" /> Incident history
          </h2>
          <div className="space-y-4">
            {past.map((i) => (
              <IncidentCard key={i.id} incident={i} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Status data is live. Subscribe to{" "}
        <span className="font-mono">status.bharatapicloud.io</span> for production alerts.
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const names = incident.components
    .map((id) => STATUS_COMPONENTS.find((c) => c.id === id)?.name ?? id)
    .join(", ");

  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold">{incident.title}</h3>
        <span
          className={`rounded px-2 py-0.5 text-xs capitalize ${
            incident.status === "resolved"
              ? "bg-success/15 text-success"
              : "bg-primary/15 text-primary"
          }`}
        >
          {incident.status}
        </span>
        <span className="rounded bg-secondary px-2 py-0.5 text-xs capitalize text-muted-foreground">
          {incident.impact} impact
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(incident.startedAt).toLocaleString("en-IN")}
        {incident.resolvedAt
          ? ` → ${new Date(incident.resolvedAt).toLocaleString("en-IN")}`
          : " → ongoing"}{" "}
        · {names}
      </p>
      <ol className="mt-4 space-y-3 border-l border-border pl-4">
        {incident.updates.map((u, idx) => (
          <li key={idx}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{u.status}</p>
            <p className="text-xs text-muted-foreground">{new Date(u.at).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90">{u.body}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
