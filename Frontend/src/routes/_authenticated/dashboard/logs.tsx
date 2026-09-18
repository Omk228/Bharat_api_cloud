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
  Activity,
  Layers,
  Zap,
  TrendingUp,
  Clock,
  Coins,
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
        content: "Complete live stream and history of API hits with response times, HTTP statuses, service name/endpoint filtering, date range filtering, and full Excel export.",
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
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
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
  const [selectedService, setSelectedService] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "7days" | "month" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const rawLogs = data.apiHitLogs || [];

  // Compute total raw spend across all unfiltered logs
  const totalAccountSpend = useMemo(() => {
    return rawLogs.reduce((acc, l) => acc + (parseFloat(String(l.cost_deducted)) || 0), 0);
  }, [rawLogs]);

  // Extract unique services with total hits, spend, and endpoint for dropdown
  const serviceOptions = useMemo(() => {
    const serviceMap = new Map<
      string,
      { name: string; endpoint: string; totalHits: number; totalSpend: number; group: string }
    >();

    for (const log of rawLogs) {
      const name = resolveLogServiceName(log);
      const ep = (log.endpoint || "").split("?")[0].trim();
      const group = log.group || "KYC";
      const cost = parseFloat(String(log.cost_deducted)) || 0;

      if (!serviceMap.has(name)) {
        serviceMap.set(name, {
          name,
          endpoint: ep,
          totalHits: 0,
          totalSpend: 0,
          group,
        });
      }

      const item = serviceMap.get(name)!;
      item.totalHits += 1;
      item.totalSpend += cost;
      if (!item.endpoint && ep) item.endpoint = ep;
    }

    return Array.from(serviceMap.values()).sort((a, b) => b.totalHits - a.totalHits);
  }, [rawLogs]);

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
    setSelectedService("all");
    setSearch("");
    setStatusFilter("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    toast.info("All log filters have been reset.");
  };

  // Apply all active filters
  const filteredLogs = useMemo(() => {
    return rawLogs.filter((log) => {
      // 1. Service / Endpoint Filter
      if (selectedService !== "all") {
        const sName = resolveLogServiceName(log);
        const ep = (log.endpoint || "").split("?")[0].trim();
        const matchesName = sName.toLowerCase() === selectedService.toLowerCase();
        const matchesEp =
          ep.toLowerCase() === selectedService.toLowerCase() ||
          ep.toLowerCase().includes(selectedService.toLowerCase());
        const rawServiceMatch = (log.service_name || "").toLowerCase() === selectedService.toLowerCase();
        if (!matchesName && !matchesEp && !rawServiceMatch) return false;
      }

      // 2. Status Filter
      if (statusFilter === "200" && log.status_code !== 200) return false;
      if (statusFilter === "error" && log.status_code === 200) return false;

      // 3. Date Filter
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

      // 4. Search Filter
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
  }, [rawLogs, selectedService, statusFilter, startDate, endDate, search]);

  // Aggregates for filtered data (dynamically reflecting selected service + date filter)
  const totalFilteredSpend = useMemo(() => {
    return filteredLogs.reduce((acc, l) => acc + (parseFloat(String(l.cost_deducted)) || 0), 0);
  }, [filteredLogs]);

  const totalFilteredSuccess = useMemo(() => {
    return filteredLogs.filter((l) => l.status_code === 200).length;
  }, [filteredLogs]);

  const totalFilteredErrors = filteredLogs.length - totalFilteredSuccess;

  const successRate =
    filteredLogs.length > 0
      ? ((totalFilteredSuccess / filteredLogs.length) * 100).toFixed(1)
      : "100";

  const avgLatency = useMemo(() => {
    if (filteredLogs.length === 0) return 0;
    const sum = filteredLogs.reduce((acc, l) => acc + (l.response_time_ms || 0), 0);
    return Math.round(sum / filteredLogs.length);
  }, [filteredLogs]);

  // Selected Service metadata for spotlight banner
  const activeServiceInfo = useMemo(() => {
    if (selectedService === "all") return null;
    const found = serviceOptions.find(
      (s) =>
        s.name.toLowerCase() === selectedService.toLowerCase() ||
        s.endpoint.toLowerCase() === selectedService.toLowerCase()
    );
    if (found) return found;
    return {
      name: selectedService,
      endpoint: selectedService,
      totalHits: filteredLogs.length,
      totalSpend: totalFilteredSpend,
      group: "API Service",
    };
  }, [selectedService, serviceOptions, filteredLogs.length, totalFilteredSpend]);

  // Human-readable date range label
  const activeDateLabel = useMemo(() => {
    if (datePreset === "all" && !startDate && !endDate) return "All Time";
    if (datePreset === "today") return "Today";
    if (datePreset === "yesterday") return "Yesterday";
    if (datePreset === "7days") return "Last 7 Days";
    if (datePreset === "month") return "This Month";
    if (startDate && endDate) {
      return startDate === endDate ? `${startDate}` : `${startDate} to ${endDate}`;
    }
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return "Custom Date Range";
  }, [datePreset, startDate, endDate]);

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
    const serviceTag =
      selectedService === "all" || exportAll
        ? "all-services"
        : selectedService.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const dateTag =
      datePreset === "all"
        ? "all-time"
        : startDate
        ? `${startDate}-to-${endDate || startDate}`
        : datePreset;

    downloadCsv(`bharat-api-${serviceTag}-${exportList.length}hits-${dateTag}.csv`, csvContent);
    toast.success(`🎉 Exported ${exportList.length} hit logs to Excel/CSV.`);
  };

  const hasActiveFilters = Boolean(
    selectedService !== "all" ||
      search.trim() ||
      statusFilter !== "all" ||
      datePreset !== "all" ||
      startDate ||
      endDate
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
            Complete audit ledger of every API hit processed for your account with exact timestamps, status codes, latencies, service filtering, and billing deductions.
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

      {/* Active Service Consumption Spotlight Banner (Shown when a service is selected) */}
      {activeServiceInfo && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/30 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/20">
                    {activeServiceInfo.group || "API Service"}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full border border-border">
                    {activeServiceInfo.endpoint || selectedService}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" /> {activeDateLabel}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  {activeServiceInfo.name}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md rounded-xl p-2.5 px-4 border border-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Service Hits
                  </span>
                  <p className="font-mono text-base font-bold text-foreground">
                    {filteredLogs.length.toLocaleString("en-IN")}{" "}
                    <span className="text-[11px] text-muted-foreground font-normal">hits</span>
                  </p>
                </div>
                <div className="h-8 w-px bg-border mx-1" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Total Amount Consumed
                  </span>
                  <p className="font-mono text-base font-bold text-primary">
                    ₹{totalFilteredSpend.toFixed(2)}
                  </p>
                </div>
                <div className="h-8 w-px bg-border mx-1" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Success Rate
                  </span>
                  <p className="font-mono text-base font-bold text-emerald-500">
                    {successRate}%
                  </p>
                </div>
                <div className="h-8 w-px bg-border mx-1" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Avg Latency
                  </span>
                  <p className="font-mono text-base font-bold text-foreground">
                    {avgLatency}ms
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedService("all");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/80 hover:bg-secondary rounded-xl px-3 py-2 border border-border transition-colors cursor-pointer"
                title="Show all services"
              >
                <X className="h-3.5 w-3.5" /> All Services
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground block">Total Hits</span>
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-1 font-mono text-lg font-bold text-foreground">
            {filteredLogs.length.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
            {selectedService === "all" ? "Across all services" : selectedService} · {activeDateLabel}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground block">Total Amount Consumed</span>
            <Coins className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-1 font-mono text-lg font-bold text-primary">
            ₹{totalFilteredSpend.toFixed(2)}
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
            {selectedService === "all" ? `Total account spend: ₹${totalAccountSpend.toFixed(2)}` : `Billed for ${selectedService}`}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground block">Successful Hits</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-500">
            {totalFilteredSuccess.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
            {totalFilteredErrors > 0 ? `${totalFilteredErrors} error hits` : "100% error-free"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground block">Success Rate &amp; Latency</span>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-1 font-mono text-lg font-bold text-foreground">
            {successRate}%{" "}
            <span className="text-xs font-medium text-muted-foreground font-mono">
              ({avgLatency}ms)
            </span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
            Avg API execution speed
          </span>
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

        {/* Filter Dropdowns Grid: Service Selector, Search, Status, Dates, Page Size */}
        <div className="grid grid-cols-12 gap-3 pt-3 border-t border-border/60 text-xs">
          {/* Row 1: 1. API Service / Endpoint Filter Dropdown (7 cols) */}
          <div className="col-span-12 lg:col-span-7">
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full h-10 rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:border-primary text-foreground transition-colors cursor-pointer ${
                selectedService !== "all"
                  ? "border-primary bg-primary/5 font-semibold text-primary"
                  : "border-border"
              }`}
            >
              <option value="all">
                ⚡ All Services &amp; Endpoints ({rawLogs.length.toLocaleString("en-IN")} hits · ₹{totalAccountSpend.toFixed(2)})
              </option>
              {serviceOptions.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.totalHits.toLocaleString("en-IN")} hits · ₹{s.totalSpend.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Row 1: 2. Search Box (5 cols) */}
          <div className="relative col-span-12 lg:col-span-5">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Request ID, Client Ref, IP, Key..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Row 2: 3. Status Selector (3 cols) */}
          <div className="col-span-6 sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary text-foreground cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="200">Success</option>
              <option value="error">Errors</option>
            </select>
          </div>

          {/* Row 2: 4. Start Date Picker (3 cols) */}
          <div className="col-span-6 sm:col-span-3">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 transition-colors focus-within:border-primary">
              <span className="text-xs text-muted-foreground font-semibold shrink-0">From:</span>
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

          {/* Row 2: 5. End Date Picker (3 cols) */}
          <div className="col-span-6 sm:col-span-3">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 transition-colors focus-within:border-primary">
              <span className="text-xs text-muted-foreground font-semibold shrink-0">To:</span>
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

          {/* Row 2: 6. Page Size Selector (3 cols) */}
          <div className="col-span-6 sm:col-span-3">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary text-foreground cursor-pointer"
            >
              <option value={25}>Show 25 / page</option>
              <option value={50}>Show 50 / page</option>
              <option value={100}>Show 100 / page</option>
              <option value={250}>Show 250 / page</option>
              <option value={500}>Show 500 / page</option>
              <option value={-1}>Show All ({filteredLogs.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">No API hits recorded matching your filter criteria.</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting the API service filter, date range, or search keyword to view records.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 mt-2 cursor-pointer"
            >
              Reset All Filters
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
                          {log.status_code === 200 ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {log.status_code === 200 ? "Success" : "Error"}
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
