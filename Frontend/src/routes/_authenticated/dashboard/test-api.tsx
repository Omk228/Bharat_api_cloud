import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Terminal,
  Copy,
  Check,
  Send,
  Loader2,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  User,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Percent,
  FileText,
  Sparkles,
  Fingerprint,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import { apiClient } from "@/lib/api-client";

export type VerificationResult = {
  pan?: string;
  pan_type?: string;
  pan_status?: string;
  aadhaar?: string;
  aadhaar_number?: string;
  aadhaar_status?: string;
  status?: string;
  is_valid?: boolean;
  fullname?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  name?: string;
  gender?: string;
  aadhaar_seeding_status?: string;
  aadhaar_linked?: boolean | string;
  dob?: string;
  age_band?: string;
  state?: string;
  mobile?: string;
  mobile_digits?: string;
  email?: string;
  name_match?: boolean;
  name_match_score?: number | string;
  address?:
    | string
    | {
        building_name?: string;
        locality?: string;
        street_name?: string;
        pincode?: string;
        city?: string;
        state?: string;
        country?: string;
      };
};

export type ApiResponseEnvelope = {
  http_response_code?: number;
  result_code?: number;
  message?: string;
  status_message?: string;
  status?: {
    code?: number;
    type?: string;
    message?: string;
  };
  data?: VerificationResult;
  result?: VerificationResult;
  [key: string]: unknown;
};

export type TestApiSearch = {
  service?: "pan" | "aadhaar" | undefined;
};

export const Route = createFileRoute("/_authenticated/dashboard/test-api")({
  validateSearch: (search: Record<string, unknown>): TestApiSearch => ({
    service: search["service"] === "aadhaar" ? "aadhaar" : "pan",
  }),
  head: () => ({
    meta: [
      { title: "Test API Console — Interactive Gateway — Bharat API Cloud" },
      {
        name: "description",
        content: "Live sandbox test console for PAN Details V2 and Aadhaar Fetch Without OTP verification APIs.",
      },
    ],
  }),
  component: TestApiPage,
});

function TestApiPage() {
  const searchParams = Route.useSearch();
  const [selectedService, setSelectedService] = useState<"pan" | "aadhaar">(
    searchParams.service === "aadhaar" ? "aadhaar" : "pan"
  );

  const { data: creds, isLoading: credsLoading } = useQuery({
    queryKey: ["credentials"],
    queryFn: async () => {
      try {
        return await apiClient.getCredentials();
      } catch {
        return [];
      }
    },
  });

  const activeCred = creds && creds.length > 0 ? creds[0] : null;

  const [apiId, setApiId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tokenId, setTokenId] = useState("");
  
  // PAN fields
  const [pan, setPan] = useState("");
  const [name, setName] = useState("");
  const [panDisplayName, setPanDisplayName] = useState("false");
  const [nameMatchMethod, setNameMatchMethod] = useState("fuzzy");

  // Aadhaar fields
  const [aadhaar, setAadhaar] = useState("");

  const [loading, setLoading] = useState(false);
  const [copiedReq, setCopiedReq] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseJson, setResponseJson] = useState<ApiResponseEnvelope | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"visual" | "json">("visual");

  // Sync credentials when loaded
  useEffect(() => {
    if (activeCred) {
      setApiId(activeCred.api_id || "");
      setApiKey(activeCred.api_key || "");
      setTokenId(activeCred.token_id || activeCred.token_id_preview || "");
    }
  }, [activeCred]);

  // Sync selectedService from URL param
  useEffect(() => {
    if (searchParams.service) {
      setSelectedService(searchParams.service);
    }
  }, [searchParams.service]);

  // Dynamic request payload based on selected service
  const requestPayload =
    selectedService === "pan"
      ? {
          api_id: apiId || (activeCred ? activeCred.api_id : ""),
          api_key: apiKey || (activeCred ? activeCred.api_key : ""),
          token_id: tokenId || (activeCred ? activeCred.token_id : ""),
          pan: pan.trim().toUpperCase(),
          name: name.trim(),
          pan_display_name: panDisplayName,
          name_match_method: nameMatchMethod,
        }
      : {
          api_id: apiId || (activeCred ? activeCred.api_id : ""),
          api_key: apiKey || (activeCred ? activeCred.api_key : ""),
          token_id: tokenId || (activeCred ? activeCred.token_id : ""),
          aadhaar: aadhaar.trim().replace(/\s|-/g, ""),
          ...(name.trim() ? { name: name.trim() } : {}),
        };

  const handleSendRequest = async () => {
    if (selectedService === "pan" && !pan.trim()) {
      toast.error("Please enter a PAN number");
      return;
    }
    if (selectedService === "aadhaar" && !aadhaar.trim()) {
      toast.error("Please enter an Aadhaar number");
      return;
    }

    setLoading(true);
    const start = performance.now();
    try {
      const rawData =
        selectedService === "pan"
          ? await apiClient.verifyPan(requestPayload as Parameters<typeof apiClient.verifyPan>[0])
          : await apiClient.verifyAadhaar(requestPayload as Parameters<typeof apiClient.verifyAadhaar>[0]);

      const data = rawData as ApiResponseEnvelope;
      const latency = Math.round(performance.now() - start);
      setResponseTime(latency);

      const statusCode =
        data.http_response_code ||
        data.status?.code ||
        200;

      setResponseStatus(statusCode);
      setResponseJson(data);

      const resultCode = data.result_code;
      const statusType = data.status?.type;

      if (resultCode === 101 || statusType === "success" || statusCode === 200) {
        toast.success(`Verified successfully (${latency}ms)`);
        setActiveViewTab("visual");
      } else if (resultCode === 102 || resultCode === 103) {
        toast.info(data.message || "Result Code: Invalid Input · Refund Processed");
      } else {
        toast.success(`Response received in ${latency}ms`);
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - start);
      setResponseTime(latency);
      setResponseStatus(500);
      const errMsg = err instanceof Error ? err.message : "Request failed";
      setResponseJson({
        status: {
          code: 500,
          type: "error",
          message: errMsg,
        },
        message: errMsg,
        status_message: "Refund processed",
      });
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic extraction from server response (zero hardcoding)
  const resData: VerificationResult =
    responseJson?.data ||
    responseJson?.result ||
    (responseJson as unknown as VerificationResult) ||
    {};

  const isSuccess =
    (responseStatus === 200 &&
      (responseJson?.result_code === 101 ||
        responseJson?.status?.type === "success" ||
        Boolean(resData.pan) ||
        Boolean(resData.aadhaar) ||
        Boolean(resData.aadhaar_number))) &&
    responseJson?.result_code !== 102 &&
    responseJson?.result_code !== 103 &&
    resData.pan_status !== "Invalid" &&
    resData.aadhaar_status !== "Invalid";

  const extractedFullName =
    resData.fullname ||
    [resData.first_name, resData.middle_name, resData.last_name].filter(Boolean).join(" ") ||
    resData.name ||
    "";

  const extractedAddress = (() => {
    const addr = resData.address;
    if (!addr) return null;
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      return [
        addr.building_name,
        addr.street_name,
        addr.locality,
        addr.city,
        addr.state,
        addr.pincode,
        addr.country,
      ]
        .filter(Boolean)
        .join(", ");
    }
    return null;
  })();

  const currentEndpoint = selectedService === "pan" ? "/srv2/validation/pan" : "/srv3/verification/aadhar";
  const currentServiceName = selectedService === "pan" ? "PAN Verification API (Pan Details V2)" : "Aadhar Fetch Without OTP";

  return (
    <DashboardLayout activeTab="test_api">
      {() => (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{currentServiceName}</h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  Bharat API Production Gateway
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Direct live verification gateway powered by Bharat API Cloud with automatic wallet debit & refunds.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/docs"
                search={{ endpoint: selectedService === "pan" ? "verify-pan" : "aadhaar-without-otp" }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Full API Docs
              </Link>
            </div>
          </div>

          {/* Service Selector Tabs & Environment Notice */}
          <div className="rounded-xl border border-border bg-card/60 p-4 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              {/* Service Toggle */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Select Service:</span>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background p-1">
                  <button
                    onClick={() => {
                      setSelectedService("pan");
                      setResponseJson(null);
                      setResponseStatus(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      selectedService === "pan"
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Pan Details V2
                  </button>
                  <button
                    onClick={() => {
                      setSelectedService("aadhaar");
                      setResponseJson(null);
                      setResponseStatus(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      selectedService === "aadhaar"
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-400" /> Aadhar Fetch (Without OTP)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Gateway Status:</span>
                <span className="rounded px-2 py-0.5 font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ONLINE · LIVE
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Base Gateway URL:</span>{" "}
                <code className="font-mono text-primary">http://localhost:5000</code>
              </div>
              <div>
                <span className="font-medium text-foreground">Endpoint:</span>{" "}
                <code className="font-mono text-primary">{currentEndpoint}</code>
              </div>
            </div>
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Form Controls */}
            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" /> Request Parameters
                  </h2>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    POST
                  </span>
                </div>

                {/* API Credentials */}
                <div className="space-y-3">
                  <label className="block">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>API ID (Bharat API Credential)</span>
                      {credsLoading && <span className="text-[10px]">Loading...</span>}
                    </div>
                    <input
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      placeholder="e.g. APIDC9272C"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                    />
                  </label>

                  <label className="block">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>API Key</span>
                    </div>
                    <input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="e.g. fc62efa1-4aff-478d-9b1b-6589e6262cba"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                    />
                  </label>

                  <label className="block">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Token ID</span>
                    </div>
                    <input
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                      placeholder="e.g. 1_jXBOXY4fBxo9XOw2t3kw7wBMTRVuO9"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                    />
                  </label>
                </div>

                {/* Verification Fields - Service Specific */}
                <div className="border-t border-border pt-3 space-y-3">
                  {selectedService === "pan" ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">PAN Number *</span>
                          <span className="text-[11px] text-muted-foreground">10 Alphanumeric</span>
                        </div>
                        <input
                          value={pan}
                          maxLength={10}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          placeholder="Enter PAN (e.g. EHMPG2091E)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider uppercase outline-none focus:border-primary"
                        />
                      </div>

                      <label className="block">
                        <span className="block text-xs text-muted-foreground mb-1">Full Name (Optional for Name Match)</span>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter full name (e.g. Shubham Gupta)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-xs text-muted-foreground mb-1">PAN Display Name</span>
                          <select
                            value={panDisplayName}
                            onChange={(e) => setPanDisplayName(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                          >
                            <option value="false">false</option>
                            <option value="true">true</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="block text-xs text-muted-foreground mb-1">Name Match Method</span>
                          <select
                            value={nameMatchMethod}
                            onChange={(e) => setNameMatchMethod(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                          >
                            <option value="fuzzy">fuzzy (recommended)</option>
                            <option value="exact">exact</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Aadhaar Number *</span>
                          <span className="text-[11px] text-muted-foreground">12 Digits (No OTP required)</span>
                        </div>
                        <input
                          value={aadhaar}
                          maxLength={14}
                          onChange={(e) => setAadhaar(e.target.value)}
                          placeholder="Enter Aadhaar (e.g. 975589822424)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-primary"
                        />
                      </div>

                      <label className="block">
                        <span className="block text-xs text-muted-foreground mb-1">Full Name (Optional for Name Match)</span>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter full name for verification"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                        />
                      </label>
                    </>
                  )}
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendRequest}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all disabled:opacity-60 shadow-md hover:shadow-lg active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying with Bharat API Cloud Gateway...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Request
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Live Output Display (Visual Card & Raw JSON Tabs) */}
            <div className="space-y-4 lg:col-span-7">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                {/* Header & Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                      POST
                    </span>
                    <span className="font-mono text-xs text-foreground font-semibold">
                      {currentEndpoint}
                    </span>
                  </div>

                  {/* View Tabs */}
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
                    <button
                      onClick={() => setActiveViewTab("visual")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                        activeViewTab === "visual"
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Visual Identity Card
                    </button>
                    <button
                      onClick={() => setActiveViewTab("json")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                        activeViewTab === "json"
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" /> Raw JSON Response
                    </button>
                  </div>
                </div>

                {/* Status Bar */}
                {responseStatus !== null && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          isSuccess
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        HTTP {responseStatus} · {isSuccess ? "VERIFIED" : "VERIFICATION FAILED"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                      {responseTime !== null && (
                        <span className="inline-flex items-center gap-1 font-mono text-xs">
                          <Clock className="h-3.5 w-3.5 text-primary" /> {responseTime}ms
                        </span>
                      )}
                      {responseJson && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
                            setCopiedRes(true);
                            toast.success("Full response copied!");
                            setTimeout(() => setCopiedRes(false), 1500);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {copiedRes ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy JSON
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-background/50 p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Querying Bharat API Cloud Gateway...</p>
                      <p className="mt-1 text-xs text-muted-foreground font-mono">
                        POST http://localhost:5000{currentEndpoint}
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !responseJson && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-background/30 p-8 text-center text-muted-foreground">
                    {selectedService === "pan" ? (
                      <CreditCard className="h-8 w-8 opacity-40 text-primary" />
                    ) : (
                      <Fingerprint className="h-8 w-8 opacity-40 text-primary" />
                    )}
                    <p className="text-sm font-medium">No verification request sent yet</p>
                    <p className="text-xs">
                      Enter {selectedService === "pan" ? "a PAN number" : "an Aadhaar number"} on the left and click &quot;Send Request&quot; to fetch live verified details.
                    </p>
                  </div>
                )}

                {/* 1. Visual Card Tab (100% Dynamic from Server) */}
                {!loading && responseJson && activeViewTab === "visual" && (
                  <div className="space-y-4">
                    {/* Success Verification Card */}
                    {isSuccess ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent p-5 space-y-4">
                        {/* Top Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            <div>
                              <p className="text-sm font-bold text-foreground">
                                {extractedFullName || (resData.pan ? `PAN Verified: ${resData.pan}` : "Aadhaar Verified & Active")}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {resData.pan && `PAN: ${resData.pan} · `}
                                {resData.aadhaar_number || resData.aadhaar ? `Aadhaar: ${resData.aadhaar_number || resData.aadhaar}` : `Type: ${resData.pan_type || "Individual"}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {(resData.aadhaar_linked !== undefined || resData.is_valid !== undefined) && (
                              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> {resData.is_valid !== undefined ? "Valid & Active" : "Aadhaar Linked"}
                              </span>
                            )}
                            {resData.aadhaar_seeding_status && (
                              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                                Seeding: {String(resData.aadhaar_seeding_status)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Demographic Grid */}
                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                          {/* Full Name */}
                          {extractedFullName && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <User className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium uppercase tracking-wider text-[10px]">Full Name</span>
                              </div>
                              <p className="font-semibold text-foreground text-sm">
                                {extractedFullName}
                              </p>
                              {(resData.first_name || resData.last_name) && (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  First: {String(resData.first_name || "")} · Last: {String(resData.last_name || "")}
                                </p>
                              )}
                            </div>
                          )}

                          {/* PAN Number (if returned) */}
                          {resData.pan && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <CreditCard className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium uppercase tracking-wider text-[10px]">PAN Number</span>
                              </div>
                              <p className="font-mono font-bold text-primary text-base">
                                {String(resData.pan)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Type: {String(resData.pan_type || "Individual")}
                              </p>
                            </div>
                          )}

                          {/* Aadhaar Number */}
                          {(resData.aadhaar_number || resData.aadhaar) && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="font-medium uppercase tracking-wider text-[10px]">Aadhaar Number</span>
                              </div>
                              <p className="font-mono font-semibold text-foreground">
                                {String(resData.aadhaar_number || resData.aadhaar)}
                              </p>
                              <p className="text-[11px] text-emerald-400">
                                Status: {String(resData.status || resData.aadhaar_seeding_status || "Active / Valid")}
                              </p>
                            </div>
                          )}

                          {/* Age Band / State */}
                          {(resData.age_band || resData.state) && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium uppercase tracking-wider text-[10px]">Demographic Info</span>
                              </div>
                              <p className="font-semibold text-foreground">
                                {resData.state || "India"}
                              </p>
                              {resData.age_band && (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Age Band: {String(resData.age_band)}
                                </p>
                              )}
                            </div>
                          )}

                          {/* DOB & Gender */}
                          {(resData.dob || resData.gender) && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium uppercase tracking-wider text-[10px]">DOB & Gender</span>
                              </div>
                              <p className="font-semibold text-foreground">
                                {String(resData.dob || "—")}
                              </p>
                              <p className="text-[11px] text-muted-foreground uppercase">
                                Gender: {String(resData.gender || "—")}
                              </p>
                            </div>
                          )}

                          {/* Contact Info */}
                          {(resData.mobile || resData.mobile_digits || resData.email) && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium uppercase tracking-wider text-[10px]">Contact Details</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs">
                                {(resData.mobile || resData.mobile_digits) && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-muted-foreground" /> {String(resData.mobile || resData.mobile_digits)}
                                  </span>
                                )}
                                {resData.email && (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-muted-foreground" /> {String(resData.email)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Name Match Score */}
                          {resData.name_match_score !== undefined && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Percent className="h-3.5 w-3.5 text-primary" /> Name Match Score
                                </span>
                                <span className="font-bold text-emerald-400 font-mono">
                                  {String(resData.name_match_score)}% Match
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${Number(resData.name_match_score)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Address */}
                          {extractedAddress && (
                            <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium uppercase tracking-wider text-[10px]">Registered Address</span>
                              </div>
                              <p className="text-xs leading-relaxed text-foreground/90 pt-0.5">
                                {extractedAddress}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Failure / Invalid Card */
                      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-400" />
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {responseJson.message || "Verification Failed"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {responseJson.status_message || "Refund processed"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg bg-background p-3 text-xs font-mono text-muted-foreground">
                          <p>Target: {selectedService === "pan" ? `PAN: ${pan}` : `Aadhaar: ${aadhaar}`}</p>
                          <p>Status: {String(resData.pan_status || resData.aadhaar_status || "Invalid / Not Found")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Raw JSON Tab */}
                {!loading && responseJson && activeViewTab === "json" && (
                  <pre className="max-h-[460px] overflow-auto rounded-lg border border-zinc-800/80 bg-[#080b10] p-4 font-mono text-xs leading-relaxed text-emerald-400 shadow-inner">
                    {JSON.stringify(responseJson, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
