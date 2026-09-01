import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Webhook,
  Send,
  ScrollText,
  Download,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  downloadCsv,
  replayWebhookEvent,
  toCsv,
  type AuditRow,
  type WebhookEventRow,
} from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks & Security Audit — Bharat API Cloud" },
      {
        name: "description",
        content: "Replay signed webhook events and inspect the immutable security audit trail.",
      },
    ],
  }),
  component: WebhooksPage,
});

function WebhooksPage() {
  return (
    <DashboardLayout activeTab="webhooks">
      {(data) => (
        <div className="space-y-8">
          <WebhookHistory events={data.webhooks} />
          <AuditLog audit={data.audit} />
        </div>
      )}
    </DashboardLayout>
  );
}

function WebhookHistory({ events }: { events: WebhookEventRow[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [resign, setResign] = useState(true);

  const replay = useMutation({
    mutationFn: async (id: string) => replayWebhookEvent({ eventId: id, resign }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Webhook replayed (HTTP ${res.statusCode})`);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Webhook className="h-4 w-4 text-primary" /> Webhook events & replay
        </h2>
        {events.length > 0 && (
          <button
            onClick={() => {
              const csv = toCsv(
                events.map((e) => ({
                  id: e.id,
                  type: e.type,
                  key_label: e.key_label,
                  endpoint_url: e.endpoint_url,
                  created_at: e.created_at,
                  attempts: e.deliveries.length,
                  last_status: e.deliveries.at(-1)?.status_code ?? "",
                  signature_header: e.header,
                })),
                [
                  "id",
                  "type",
                  "key_label",
                  "endpoint_url",
                  "created_at",
                  "attempts",
                  "last_status",
                  "signature_header",
                ]
              );
              downloadCsv(`bharat-webhook-events-${Date.now()}.csv`, csv);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Export webhook CSV
          </button>
        )}
      </div>

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
                        Bharat-API-Signature
                      </p>
                      <code className="block break-all rounded bg-terminal px-3 py-2 font-mono">
                        {e.header}
                      </code>
                    </div>
                    <div>
                      <p className="mb-1 uppercase tracking-wider text-muted-foreground">Payload</p>
                      <pre className="overflow-x-auto rounded bg-terminal p-3 font-mono">
                        {JSON.stringify(JSON.parse(e.body), null, 2)}
                      </pre>
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

function AuditLog({ audit }: { audit: AuditRow[] }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ScrollText className="h-4 w-4 text-primary" /> Audit log
        </h2>
        {audit.length > 0 && (
          <button
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
                ["id", "created_at", "actor", "action", "target", "detail"]
              );
              downloadCsv(`bharat-audit-${Date.now()}.csv`, csv);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Export audit CSV
          </button>
        )}
      </div>

      {audit.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Key creation, rotation, revocation, webhook and request events will be recorded here.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="divide-y divide-border text-xs">
            {audit.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-primary">{a.action}</span>
                  <span className="text-muted-foreground">{a.target}</span>
                  <span className="text-muted-foreground">· {a.detail}</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
