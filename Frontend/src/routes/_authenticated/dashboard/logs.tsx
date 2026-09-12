import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Calendar,
  Download,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  downloadCsv,
  toCsv,
  type DashboardData,
  type ApiHitLogRow,
} from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard/logs")({
  head: () => ({
    meta: [
      { title: "Real-Time API Hit Logs & History — Bharat API Cloud" },
      {
        name: "description",
        content: "Complete live stream and history of API hits with response times, HTTP statuses, date range filtering, and full Excel export.",
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
  "/srv5/transunion-Score-Hybrid": "Transunion Credit Report V5",
  "/transunion-Score-Hybrid": "Transunion Credit Report V5",
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
  "/statement-analyzer": "Bank Statement Analyzer V2",
  "/srv2/statement-analyzer": "Bank Statement Analyzer V2",
  "/statement-upload": "Bank Statement Analyzer V2",
  "/srv2/statement-upload": "Bank Statement Analyzer V2",
  "/crif/Credit-ScoreV4": "CRIF High Mark Credit Score V4",
  "/api/v1/crif/Credit-ScoreV4": "CRIF High Mark Credit Score V4",
  "/Credit-ScoreV4": "CRIF High Mark Credit Score V4",
  "/reports/cibil": "Transunion PDF Report",
  "/api/v1/reports/cibil": "Transunion PDF Report",
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

function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function LogsPage() {
  return (
    <DashboardLayout activeTab="logs">
      {(data) => <LogsContent data={data} />}
    </DashboardLayout>
  );
}

function LogsContent({ data }: { data: DashboardData }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "7days" | "month" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const rawLogs = data.apiHitLogs || [];

  // Helper to handle date preset selection
  const handleDatePreset = (preset: "all" | "today" | "yesterday" | "7days" | "month" | "custom") => {
    setDatePreset(preset);
    setCurrentPage(1);

    const today = new Date();
    const toYMD = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const todayStr = toYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toYMD(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === "7days") {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      setStartDate(toYMD(sevenDaysAgo));
      setEndDate(toYMD(today));
    } else if (preset === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(today));
    }
  };

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    toast.info("All filters cleared.");
  };

  // Apply filters
  const filteredLogs = useMemo(() => {
    return rawLogs.filter((log) => {
      // 1. Status Filter
      if (statusFilter === "200" && log.status_code !== 200) return false;
      if (statusFilter === "error" && log.status_code === 200) return false;

      // 2. Date Filter
      if (startDate || endDate) {
        const logDate = new Date(log.created_at);
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`);
          if (logDate < start) return false;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59.999`);
          if (logDate > end) return false;
        }
      }

      // 3. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const sName = resolveLogServiceName(log).toLowerCase();
        const refNum = (log.client_ref_num || "").toLowerCase();
        const reqId = (log.request_id || "").toLowerCase();
        const endpoint = (log.endpoint || "").toLowerCase();
        const apiKey = (log.api_key_used || "").toLowerCase();
        const group = (log.group || "").toLowerCase();
        const ip = (log.ip_address || "").toLowerCase();

        return (
          sName.includes(q) ||
          refNum.includes(q) ||
          reqId.includes(q) ||
          endpoint.includes(q) ||
          apiKey.includes(q) ||
          group.includes(q) ||
          ip.includes(q)
        );
      }

      return true;
    });
  }, [rawLogs, statusFilter, startDate, endDate, search]);

  // Aggregates for filtered data
  const totalFilteredSpend = useMemo(() => {
    return filteredLogs.reduce((acc, l) => acc + (parseFloat(String(l.cost_deducted)) || 0), 0);
  }, [filteredLogs]);

  const totalFilteredSuccess = useMemo(() => {
    return filteredLogs.filter((l) => l.status_code === 200).length;
  }, [filteredLogs]);

  const successRate = filteredLogs.length > 0
    ? ((totalFilteredSuccess / filteredLogs.length) * 100).toFixed(1)
    : "100";

  // Pagination calculation
  const effectivePageSize = pageSize === -1 ? filteredLogs.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * effectivePageSize;
  const endIndex = pageSize === -1 ? filteredLogs.length : Math.min(startIndex + effectivePageSize, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Export CSV handler
  const handleExportCsv = (exportAll = false) => {
    const exportList = exportAll ? rawLogs : filteredLogs;
    if (exportList.length === 0) {
      toast.error("No API logs available to export.");
      return;
    }

    const csvData = exportList.map((l) => ({
      timestamp: formatDate(l.created_at),
      service_name: resolveLogServiceName(l),
      endpoint: l.endpoint,
      method: l.method,
      request_id: l.request_id,
      client_ref_num: l.client_ref_num || "-",
      status_code: l.status_code,
      response_time_ms: l.response_time_ms,
      cost_deducted_inr: l.cost_deducted,
      api_key_used: l.api_key_used,
      key_label: l.key_label || "Default Key",
      ip_address: l.ip_address || "127.0.0.1",
      environment: l.environment || "production",
    }));

    const headers = [
      "timestamp",
      "service_name",
      "endpoint",
      "method",
      "request_id",
      "client_ref_num",
      "status_code",
      "response_time_ms",
      "cost_deducted_inr",
      "api_key_used",
      "key_label",
      "ip_address",
      "environment",
    ];

    const csvContent = toCsv(csvData, headers);
    const dateTag = new Date().toISOString().split("T")[0];
    downloadCsv(`bharat-api-hit-logs-total-${exportList.length}hits-${dateTag}.csv`, csvContent);
    toast.success(`🎉 Exported ${exportList.length} total API hit logs to Excel/CSV.`);
  };

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter !== "all" || datePreset !== "all" || startDate || endDate
  );

  return (
    <div className="space-y-6">
      {/* Header Title & Counters */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Real-Time API Hit Logs
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary border border-primary/20">
              {rawLogs.length.toLocaleString("en-IN")} Total Hits
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Complete audit ledger of every API hit processed for your account with exact timestamps, status codes, latencies, and billing deductions.
          </p>
        </div>

        {/* Action Buttons: Full Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExportCsv(false)}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export {filteredLogs.length.toLocaleString("en-IN")} Hits (Excel/CSV)
          </button>

          {rawLogs.length > filteredLogs.length && (
            <button
              type="button"
              onClick={() => handleExportCsv(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              Export All {rawLogs.length.toLocaleString("en-IN")} Total
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Hits Displayed</span>
          <p className="mt-1 font-mono text-lg font-bold text-foreground">
            {filteredLogs.length.toLocaleString("en-IN")}
            <span className="text-xs text-muted-foreground font-normal ml-1">/ {rawLogs.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">Successful Hits (200 OK)</span>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-500">
            {totalFilteredSuccess.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">Success Rate</span>
          <p className="mt-1 font-mono text-lg font-bold text-primary">
            {successRate}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">Total API Spend (View)</span>
          <p className="mt-1 font-mono text-lg font-bold text-foreground">
            ₹{totalFilteredSpend.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Advanced Filters & Date Range Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Presets Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Date Filter:
            </span>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7days", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => {
              const isSelected = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDatePreset(p.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Clear All Filters
            </button>
          )}
        </div>

        {/* Search, Status, Date Pickers, Rows-Per-Page */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-border/60 text-xs">
          {/* Search Box (4 cols) */}
          <div className="relative sm:col-span-4">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Service, Request ID, Client Ref, Endpoint..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Status Selector (2 cols) */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-primary text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="200">200 OK (Success)</option>
              <option value="error">4xx / 5xx (Errors)</option>
            </select>
          </div>

          {/* Start Date Picker (2 cols) */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent text-xs text-foreground outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* End Date Picker (2 cols) */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent text-xs text-foreground outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Page Size Selector (2 cols) */}
          <div className="sm:col-span-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-primary text-foreground"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={250}>250 / page</option>
              <option value={500}>500 / page</option>
              <option value={-1}>Show All ({filteredLogs.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">No API hits recorded matching your filter criteria.</p>
          <p className="text-xs text-muted-foreground">Try clearing date or search filters to view your complete log history.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 mt-2 cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5">Timestamp (Date &amp; Time)</th>
                  <th className="px-4 py-3.5">Service Name</th>
                  <th className="px-4 py-3.5">Method &amp; Endpoint</th>
                  <th className="px-4 py-3.5">Request &amp; Client Ref</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Latency</th>
                  <th className="px-4 py-3.5 text-right">Cost Deducted</th>
                  <th className="px-4 py-3.5">API Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedLogs.map((log) => {
                  const serviceTitle = resolveLogServiceName(log);
                  return (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground font-mono text-[11px]">
                        {formatDate(log.created_at)}
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

                      {/* Request ID & Ref */}
                      <td className="px-4 py-3 font-mono text-xs">
                        <p className="font-medium text-foreground">{log.request_id}</p>
                        {log.client_ref_num && (
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            Ref: {log.client_ref_num}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            log.status_code === 200
                              ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-500 border-rose-500/30"
                          }`}
                        >
                          {log.status_code === 200 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {log.status_code} {log.status_code === 200 ? "OK" : "Error"}
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium text-muted-foreground">
                        {log.response_time_ms}ms
                      </td>

                      {/* Cost Deducted */}
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-foreground">
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

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{startIndex + 1}</strong> to{" "}
              <strong className="text-foreground">{endIndex}</strong> of{" "}
              <strong className="text-foreground">{filteredLogs.length.toLocaleString("en-IN")}</strong> logs
              {rawLogs.length > filteredLogs.length && (
                <span className="text-[11px] text-muted-foreground ml-1">
                  (filtered from {rawLogs.length.toLocaleString("en-IN")} total)
                </span>
              )}
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <span className="px-2 font-mono text-xs font-semibold text-foreground">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
