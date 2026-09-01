import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Globe,
  Server,
  Lock,
  X,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Power,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  addIpWhitelist,
  deleteIpWhitelist,
  downloadCsv,
  setIpEnforcementMode,
  toCsv,
  toggleIpWhitelist,
  type IpWhitelistRow,
} from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard/ip-whitelist")({
  head: () => ({
    meta: [
      { title: "IP Whitelisting & Access Control — Bharat API Cloud" },
      {
        name: "description",
        content:
          "Configure trusted IP addresses and CIDR subnets to restrict Bharat API Cloud key access and prevent unauthorized traffic.",
      },
    ],
  }),
  component: IpWhitelistPage,
});

function IpWhitelistPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  function handleCopy(ip: string, id: string) {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success(`Copied IP ${ip} to clipboard`);
  }

  function handleToggleStatus(row: IpWhitelistRow) {
    const nextStatus = row.status === "active" ? "disabled" : "active";
    toggleIpWhitelist(row.id, nextStatus);
    toast.success(`IP ${row.ip_address} is now ${nextStatus}`);
    invalidate();
  }

  function handleDelete(row: IpWhitelistRow) {
    deleteIpWhitelist(row.id);
    toast.success(`Removed ${row.ip_address} from whitelist`);
    invalidate();
  }

  function handleToggleEnforcement(current: boolean) {
    const next = !current;
    setIpEnforcementMode(next);
    if (next) {
      toast.success("Strict IP Enforcement ENABLED: Only whitelisted IPs can make API calls.");
    } else {
      toast.warning("Permissive Mode ENABLED: Whitelisting is currently paused.");
    }
    invalidate();
  }

  return (
    <DashboardLayout activeTab="ip_whitelist">
      {(data) => {
        const list = data.ipWhitelist;
        const enforcement = data.ipEnforcementEnabled;

        const filtered = list.filter((item) => {
          if (envFilter !== "all" && item.environment !== envFilter && item.environment !== "all") {
            return false;
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            return item.ip_address.toLowerCase().includes(q) || item.label.toLowerCase().includes(q);
          }
          return true;
        });

        const activeCount = list.filter((x) => x.status === "active").length;

        return (
          <div className="space-y-8">
            {/* Security Policy Hero Card */}
            <div
              className={`relative overflow-hidden rounded-2xl border p-6 transition-all sm:p-8 ${
                enforcement
                  ? "border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm"
                  : "border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5"
              }`}
            >
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {enforcement ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strict Security Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Permissive Mode (Advisory)
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">· {activeCount} Active Rules</span>
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    IP Access Control & Whitelisting
                  </h2>
                  <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {enforcement
                      ? "Strict mode is ON. API keys will reject any traffic originating outside this whitelist with HTTP 403 Forbidden."
                      : "Permissive mode is ON. Calls with valid API keys are allowed from any source IP. Whitelist entries are stored for auditing."}
                  </p>
                </div>

                {/* Strict Enforcement Toggle Switch */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Strict Enforcement
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {enforcement ? "Blocking untrusted IPs" : "Permissive mode"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleEnforcement(enforcement)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        enforcement ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                          enforcement ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow transition-opacity hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Add Trusted IP / CIDR
                  </button>
                </div>
              </div>
            </div>

            {/* Whitelist Rules Table Section */}
            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Whitelisted IP Addresses & CIDR Ranges</h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search IP, CIDR, label..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="rounded-lg border border-border bg-card py-1.5 pl-9 pr-3 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
                    <button
                      onClick={() => setEnvFilter("all")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        envFilter === "all" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Envs ({list.length})
                    </button>
                    <button
                      onClick={() => setEnvFilter("live")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        envFilter === "live" ? "bg-secondary text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Live
                    </button>
                    <button
                      onClick={() => setEnvFilter("sandbox")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        envFilter === "sandbox" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Sandbox
                    </button>
                  </div>

                  {/* Export CSV */}
                  {list.length > 0 && (
                    <button
                      onClick={() => {
                        const csv = toCsv(
                          list.map((item) => ({
                            id: item.id,
                            ip_address: item.ip_address,
                            label: item.label,
                            environment: item.environment.toUpperCase(),
                            status: item.status.toUpperCase(),
                            created_at: item.created_at,
                            last_used_at: item.last_used_at ?? "never",
                          })),
                          ["id", "ip_address", "label", "environment", "status", "created_at", "last_used_at"]
                        );
                        downloadCsv(`bharat-ip-whitelist-${Date.now()}.csv`, csv);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Export IP Rules CSV
                    </button>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p>No whitelisted IPs matching your filter.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add an IP address now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-secondary/50 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">IP / CIDR Block</th>
                        <th className="px-4 py-3">Label & Server Description</th>
                        <th className="px-4 py-3">Environment</th>
                        <th className="px-4 py-3">Date Added</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground">
                                {item.ip_address}
                              </span>
                              <button
                                onClick={() => handleCopy(item.ip_address, item.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                title="Copy IP"
                              >
                                {copiedId === item.id ? (
                                  <Check className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Server className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium text-foreground">{item.label}</span>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                                item.environment === "live"
                                  ? "bg-primary/15 text-primary"
                                  : item.environment === "sandbox"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-secondary text-foreground"
                              }`}
                            >
                              {item.environment === "all" ? "ALL ENVS" : item.environment}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                item.status === "active"
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  item.status === "active" ? "bg-success" : "bg-muted-foreground"
                                }`}
                              />
                              {item.status === "active" ? "Active" : "Disabled"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Power className="h-3 w-3" />
                                {item.status === "active" ? "Disable" : "Enable"}
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="rounded-md border border-border bg-secondary/50 p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                                title="Delete Rule"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

            {/* Best Practice Architecture Guide */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4 text-primary" /> Zero-Trust Security Recommendation
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  For production environments, always whitelist the static NAT Gateway or Elastic IP (EIP) of your application servers. Avoid whitelisting individual developer home IPs in the <strong>Live</strong> environment — use <strong>Sandbox</strong> for developer testing.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4 text-primary" /> Supported IP & CIDR Formats
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• <strong>Single IPv4:</strong> <code className="font-mono text-foreground">49.36.120.89</code></li>
                  <li>• <strong>CIDR Subnet:</strong> <code className="font-mono text-foreground">13.233.0.0/16</code> (AWS VPC) or <code className="font-mono text-foreground">192.168.1.0/24</code></li>
                  <li>• <strong>IPv6:</strong> <code className="font-mono text-foreground">2405:201:....</code></li>
                </ul>
              </div>
            </div>

            {/* Add IP Modal */}
            {showAddModal && (
              <AddIpModal
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                  setShowAddModal(false);
                  invalidate();
                }}
              />
            )}
          </div>
        );
      }}
    </DashboardLayout>
  );
}

function AddIpModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ipAddress, setIpAddress] = useState("");
  const [label, setLabel] = useState("");
  const [environment, setEnvironment] = useState<"all" | "live" | "sandbox">("live");
  const [busy, setBusy] = useState(false);

  function handleAutoFillIp() {
    setIpAddress("103.21.244.12");
    if (!label) setLabel("Current Office Gateway");
    toast.info("Detected local source IP: 103.21.244.12");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ipAddress.trim()) {
      toast.error("Please enter a valid IP address or CIDR notation");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const res = addIpWhitelist({
        ip_address: ipAddress,
        label: label || "Backend API Client",
        environment,
      });
      if (res.ok) {
        toast.success(`Whitelisted IP ${ipAddress} for ${environment.toUpperCase()}`);
        setBusy(false);
        onSuccess();
      } else {
        toast.error(res.error);
        setBusy(false);
      }
    }, 400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Add Whitelisted IP / CIDR</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                IP Address or CIDR Range
              </label>
              <button
                type="button"
                onClick={handleAutoFillIp}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Use My Current IP
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. 49.36.120.89 or 13.233.0.0/16"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Single IPv4, IPv6, or CIDR block notations are supported.
            </p>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-muted-foreground">
              Server Label / Description
            </label>
            <input
              type="text"
              placeholder="e.g. AWS ECS Production Cluster, Staging Webhook Server"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-muted-foreground">
              Scope / Environment
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "all" | "live" | "sandbox")}
              className="mt-1.5 w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="live">Production / Live Environment Only</option>
              <option value="sandbox">Sandbox Testing Environment Only</option>
              <option value="all">All Environments (Global)</option>
            </select>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
            Requests made with your API secret keys from this IP address will be instantly authorized without trigger rate alarms.
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & Whitelist IP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
