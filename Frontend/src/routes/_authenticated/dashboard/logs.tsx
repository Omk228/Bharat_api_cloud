import { createFileRoute } from "@tanstack/react-router";
import { Search, Sparkles, Server } from "lucide-react";
import { useState } from "react";

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

const SERVICE_NAME_MAP: Record<string, string> = {
  "/srv2/validation/pan": "Verify PAN",
  "/verify/pan": "Verify PAN",
  "/pan": "Verify PAN",
  "/srv2/validation/pan/plus": "Pan Details Plus",
  "/srv3/verification/aadhar": "Aadhar Fetch (Without OTP)",
  "/verify/aadhar": "Aadhar Fetch (Without OTP)",
  "/srv2/validation/digilocker-digital-kyc": "Digi Locker Digital KYC",
  "/bank/verify/penny-less": "Bank Verification Penny Less V2",
  "/idfc/beneficiary": "Bank Verification Penny Less V2",
  "/api/v1/validate_bank_account": "Bank Account Validation",
  "/validate_bank_account": "Bank Account Validation",
  "/srv3/mobile-to-bank/advance": "Mobile To Bank Advance",
  "/ifsc": "IFSC Lookup",
  "/bank/ifsc": "IFSC Lookup",
  "/srv2/mobile-upi-lookup/enhanced": "Mobile to UPI Lookup Advance",
  "/srv4/credit-report/prefill": "Mobile to Prefill",
  "/kyc/mobile-prefill": "Mobile to Prefill",
  "/srv2/mobile-name-finder": "Mobile To Name Finder",
  "/api/v1/srv3/uan-mobile": "Mobile to UAN V2",
  "/srv3/uan-mobile": "Mobile to UAN V2",
  "/api/v1/srv3/uan-direct": "UAN to Employment History V2",
  "/srv3/uan-direct": "UAN to Employment History V2",
  "/dosvak/domain-age": "Domain Age Verification API",
  "/check": "Requester IP Lookup",
  "/reverse": "Reverse Geocoding",
  "/reverse-geocode": "Reverse Geocoding",
  "/verify/aadhaar/otp": "Aadhaar OTP (DigiLocker)",
  "/verify/aadhaar/otp/confirm": "Confirm Aadhaar OTP",
  "/verify/gstin": "Verify GSTIN",
  "/verify/cin": "Verify CIN (MCA)",
  "/kyc/ocr": "Document OCR",
  "/kyc/face-match": "Face Match & Liveness",
  "/verify/voter-id": "Verify Voter ID",
  "/verify/driving-licence": "Verify Driving Licence",
  "/verify/passport": "Verify Passport",
  "/kyc/aml-screen": "AML / PEP Screening",
  "/bank/verify": "Bank Verification (Penny Drop)",
  "/bank/penny-drop": "Bank Verification (Penny Drop)",
  "/bank/reverse-penny-drop": "Reverse Penny Drop",
  "/bank/upi/validate": "Validate UPI VPA",
  "/bank/statement/analyse": "Bank Statement Analysis",
  "/aa/consent": "Create Consent Request",
  "/v1/aa/consent": "Create Consent Request",
  "/aa/fi/fetch": "Fetch Financial Data (AA)",
  "/payouts": "Create Payout",
  "/virtual-accounts": "Create Virtual Account",
};

function resolveLogServiceName(log: ApiHitLogRow): string {
  if (log.service_name && log.service_name.trim()) return log.service_name.trim();
  const ep = log.endpoint || "";
  const clean = (ep.split("?")[0] || "").trim();
  if (SERVICE_NAME_MAP[clean]) return SERVICE_NAME_MAP[clean];
  for (const [pattern, name] of Object.entries(SERVICE_NAME_MAP)) {
    if (clean.endsWith(pattern) || clean.includes(pattern)) return name;
  }
  const parts = clean.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    return lastPart
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return log.endpoint || "API Request";
}

function LogsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  return (
    <DashboardLayout activeTab="logs">
      {(data) => {
        const logs = data.apiHitLogs;

        const filteredLogs = logs.filter((log) => {
          if (statusFilter === "200" && log.status_code !== 200) return false;
          if (statusFilter === "error" && log.status_code === 200) return false;
          if (search.trim()) {
            const q = search.toLowerCase();
            const sName = resolveLogServiceName(log).toLowerCase();
            return (
              sName.includes(q) ||
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
                  Live stream of every API request processed by Bharat API Cloud with service names, status codes, latencies, and billing deductions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search Service, Request ID, endpoint..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-lg border border-border bg-card py-1.5 pl-9 pr-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
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
                          service_name: resolveLogServiceName(l),
                          endpoint: l.endpoint,
                          method: l.method,
                          status_code: l.status_code,
                          response_time_ms: l.response_time_ms,
                          cost_deducted: l.cost_deducted,
                          api_key: l.api_key_used,
                          ip_address: l.ip_address,
                          created_at: l.created_at,
                        })),
                        [
                          "request_id",
                          "service_name",
                          "endpoint",
                          "method",
                          "status_code",
                          "response_time_ms",
                          "cost_deducted",
                          "api_key",
                          "ip_address",
                          "created_at",
                        ]
                      );
                      downloadCsv(`bharat-api-hit-logs-${Date.now()}.csv`, csv);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-secondary/50 font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Service Name</th>
                      <th className="px-4 py-3">Method & Endpoint</th>
                      <th className="px-4 py-3">Request ID</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Latency</th>
                      <th className="px-4 py-3 text-right">Cost Deducted</th>
                      <th className="px-4 py-3">API Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log) => {
                      const serviceTitle = resolveLogServiceName(log);
                      return (
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

                          {/* Service Name */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground text-xs tracking-tight">
                                {serviceTitle}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {log.group || "KYC & Verification"}
                              </span>
                            </div>
                          </td>

                          {/* Method & Endpoint */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                  log.method === "POST"
                                    ? "bg-primary/15 text-primary border border-primary/20"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                }`}
                              >
                                {log.method}
                              </span>
                              <span className="font-mono text-xs text-foreground/90">{log.endpoint}</span>
                            </div>
                          </td>

                          {/* Request ID */}
                          <td className="px-4 py-3 font-mono font-medium text-foreground text-xs">
                            {log.request_id}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                log.status_code === 200
                                  ? "bg-success/15 text-success border border-success/30"
                                  : "bg-destructive/15 text-destructive border border-destructive/30"
                              }`}
                            >
                              {log.status_code} {log.status_code === 200 ? "OK" : "Error"}
                            </span>
                          </td>

                          {/* Latency */}
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium text-muted-foreground">
                            {log.response_time_ms}ms
                          </td>

                          {/* Cost Deducted */}
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-foreground">
                            ₹{log.cost_deducted.toFixed(2)}
                          </td>

                          {/* API Key */}
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                            {log.api_key_used}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }}
    </DashboardLayout>
  );
}
