import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Search,
  Eye,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  downloadCsv,
  toCsv,
  type ApiHitLogRow,
} from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard/logs")({
  head: () => ({
    meta: [
      { title: "Real-Time API Hit Logs — Bharat API Cloud" },
      {
        name: "description",
        content: "Live stream of API hits with response times, HTTP statuses, and cost deductions.",
      },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ApiHitLogRow | null>(null);

  return (
    <DashboardLayout activeTab="logs">
      {(data) => {
        const logs = data.apiHitLogs;

        const filteredLogs = logs.filter((log) => {
          if (statusFilter === "200" && log.status_code !== 200) return false;
          if (statusFilter === "error" && log.status_code === 200) return false;
          if (search.trim()) {
            const q = search.toLowerCase();
            return (
              log.request_id.toLowerCase().includes(q) ||
              log.endpoint.toLowerCase().includes(q) ||
              log.api_key_used.toLowerCase().includes(q) ||
              log.group.toLowerCase().includes(q)
            );
          }
          return true;
        });

        return (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
                  <h2 className="text-xl font-bold tracking-tight">Real-Time API Hit Logs</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live stream of every API request processed by Bharat API Cloud with status codes, latencies, and billing deductions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search Request ID, endpoint..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-lg border border-border bg-card py-1.5 pl-9 pr-3 text-xs outline-none focus:border-primary"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary text-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="200">200 OK (Success)</option>
                  <option value="error">4xx / 5xx (Errors)</option>
                </select>

                {/* Export CSV */}
                {logs.length > 0 && (
                  <button
                    onClick={() => {
                      const csv = toCsv(
                        logs.map((l) => ({
                          request_id: l.request_id,
                          endpoint: l.endpoint,
                          method: l.method,
                          status_code: l.status_code,
                          response_time_ms: l.response_time_ms,
                          cost_deducted: l.cost_deducted,
                          api_key: l.api_key_used,
                          ip_address: l.ip_address,
                          created_at: l.created_at,
                        })),
                        ["request_id", "endpoint", "method", "status_code", "response_time_ms", "cost_deducted", "api_key", "ip_address", "created_at"]
                      );
                      downloadCsv(`bharat-api-hit-logs-${Date.now()}.csv`, csv);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Export Hit Logs CSV
                  </button>
                )}
              </div>
            </div>

            {/* Logs Table */}
            {filteredLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No API hits recorded matching this filter.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-secondary/50 font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Request ID</th>
                      <th className="px-4 py-3">Method & Endpoint</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Latency</th>
                      <th className="px-4 py-3 text-right">Cost Deducted</th>
                      <th className="px-4 py-3">API Key</th>
                      <th className="px-4 py-3 text-center">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          {log.request_id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                log.method === "POST"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-blue-500/15 text-blue-400"
                              }`}
                            >
                              {log.method}
                            </span>
                            <span className="font-mono text-xs text-foreground">{log.endpoint}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                              log.status_code === 200
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {log.status_code} {log.status_code === 200 ? "OK" : "Error"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium text-muted-foreground">
                          {log.response_time_ms}ms
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-foreground">
                          ₹{log.cost_deducted.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {log.api_key_used}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium hover:bg-secondary transition-colors"
                          >
                            <Eye className="h-3 w-3" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payload Inspector Modal */}
            {selectedLog && (
              <PayloadInspectorModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}
          </div>
        );
      }}
    </DashboardLayout>
  );
}

function PayloadInspectorModal({
  log,
  onClose,
}: {
  log: ApiHitLogRow;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyAll() {
    navigator.clipboard.writeText(
      JSON.stringify(
        {
          request_id: log.request_id,
          endpoint: log.endpoint,
          status: log.status_code,
          request_payload: log.request_payload,
          response_payload: log.response_payload,
        },
        null,
        2
      )
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Payload JSON copied to clipboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">{log.method} {log.endpoint}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  log.status_code === 200 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}
              >
                {log.status_code}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Request ID: {log.request_id} · Latency: {log.response_time_ms}ms · Deducted: ₹{log.cost_deducted.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAll}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-xs">
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">
              Request Body Payload
            </p>
            <pre className="overflow-x-auto rounded-lg bg-terminal p-3 font-mono text-foreground border border-border">
              {JSON.stringify(log.request_payload ?? {}, null, 2)}
            </pre>
          </div>

          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">
              Response Body Payload
            </p>
            <pre className="overflow-x-auto rounded-lg bg-terminal p-3 font-mono text-foreground border border-border">
              {JSON.stringify(log.response_payload ?? {}, null, 2)}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
            <div>
              <span>Caller IP: </span>
              <span className="text-foreground">{log.ip_address}</span>
            </div>
            <div>
              <span>Environment: </span>
              <span className="text-foreground uppercase">{log.environment}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
