import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Landmark,
  Building,
  ChevronDown,
  Smartphone,
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
  creditorAccountId?: string;
  account_number?: string;
  ifscCode?: string;
  ifsc?: string;
  beneficiary_name?: string;
  creditorName?: string;
  rrn?: string;
  transactionReferenceNumber?: string;
  transactionId?: string;
  bank_name?: string;
  branch?: string;
  city?: string;
  micr?: string;
  account_status?: string;
  account_exists?: boolean;
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
  age?: string | number;
  age_band?: string;
  state?: string;
  mobile?: string;
  mobile_digits?: string;
  email?: string;
  name_match?: boolean;
  name_match_score?: number | string;
  address?:
    | string
    | Array<{
        first_line_of_address?: string;
        second_line_of_address?: string;
        third_line_of_address?: string;
      }>
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
  _cached?: boolean;
  [key: string]: unknown;
};

export type TestApiSearch = {
  service?: "pan" | "aadhaar" | "bank" | "prefill" | undefined;
};

export const Route = createFileRoute("/_authenticated/dashboard/test-api")({
  validateSearch: (search: Record<string, unknown>): TestApiSearch => ({
    service:
      search["service"] === "aadhaar"
        ? "aadhaar"
        : search["service"] === "bank"
        ? "bank"
        : search["service"] === "prefill"
        ? "prefill"
        : "pan",
  }),
  head: () => ({
    meta: [
      { title: "Test API Console — Interactive Gateway — Bharat API Cloud" },
      {
        name: "description",
        content: "Live sandbox test console for PAN, Aadhaar, Bank Verification Penny Less V2, and Mobile to Prefill verification APIs.",
      },
    ],
  }),
  component: TestApiPage,
});

function TestApiPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const [selectedService, setSelectedService] = useState<"pan" | "aadhaar" | "bank" | "prefill">(
    searchParams.service === "aadhaar"
      ? "aadhaar"
      : searchParams.service === "bank"
      ? "bank"
      : searchParams.service === "prefill"
      ? "prefill"
      : "pan"
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

  // Bank fields
  const [creditorAccountId, setCreditorAccountId] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  // Prefill fields
  const [mobileNumber, setMobileNumber] = useState("9876543210");
  const [firstName, setFirstName] = useState("Som");
  const [lastName, setLastName] = useState("Kumar");

  const [loading, setLoading] = useState(false);
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
      : selectedService === "aadhaar"
      ? {
          api_id: apiId || (activeCred ? activeCred.api_id : ""),
          api_key: apiKey || (activeCred ? activeCred.api_key : ""),
          token_id: tokenId || (activeCred ? activeCred.token_id : ""),
          aadhaar: aadhaar.trim().replace(/\s|-/g, ""),
          ...(name.trim() ? { name: name.trim() } : {}),
        }
      : selectedService === "bank"
      ? {
          api_id: apiId || (activeCred ? activeCred.api_id : ""),
          api_key: apiKey || (activeCred ? activeCred.api_key : ""),
          token_id: tokenId || (activeCred ? activeCred.token_id : ""),
          creditorAccountId: creditorAccountId.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
        }
      : {
          api_id: apiId || (activeCred ? activeCred.api_id : ""),
          api_key: apiKey || (activeCred ? activeCred.api_key : ""),
          token_id: tokenId || (activeCred ? activeCred.token_id : ""),
          mobile_number: mobileNumber.trim().replace(/\D/g, ""),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
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
    if (selectedService === "bank" && (!creditorAccountId.trim() || !ifscCode.trim())) {
      toast.error("Please enter Account Number and IFSC Code");
      return;
    }
    if (selectedService === "prefill" && (!mobileNumber.trim() || !firstName.trim())) {
      toast.error("Please enter Mobile Number and First Name");
      return;
    }

    setLoading(true);
    const start = performance.now();
    try {
      let rawData: Record<string, unknown>;

      if (selectedService === "pan") {
        rawData = await apiClient.verifyPan(requestPayload as Parameters<typeof apiClient.verifyPan>[0]);
      } else if (selectedService === "aadhaar") {
        rawData = await apiClient.verifyAadhaar(requestPayload as Parameters<typeof apiClient.verifyAadhaar>[0]);
      } else if (selectedService === "bank") {
        rawData = await apiClient.verifyBankPennyLess(requestPayload as Parameters<typeof apiClient.verifyBankPennyLess>[0]);
      } else {
        rawData = await apiClient.verifyMobilePrefill(requestPayload as Parameters<typeof apiClient.verifyMobilePrefill>[0]);
      }

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
      // Immediately invalidate dashboard queries to refresh live wallet balance in header pill
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  };

  // Dynamic extraction from server response (supporting IDSPay beneValidationResp, result, data)
  const rawData = responseJson?.data as Record<string, unknown> | undefined;
  const beneResp = rawData?.beneValidationResp as Record<string, unknown> | undefined;
  const resourceData = (beneResp?.resourceData || responseJson?.result || responseJson?.data || responseJson || {}) as Record<string, unknown>;
  const rawRes = { ...((responseJson?.result as Record<string, unknown>) || {}), ...resourceData };

  const extractedCreditorName = (
    resourceData.creditorName ||
    resourceData.creditor_name ||
    resourceData.beneficiary_name ||
    resourceData.fullname ||
    resourceData.name ||
    rawRes.creditorName ||
    rawRes.beneficiary_name ||
    rawRes.fullname ||
    rawRes.name ||
    ""
  ) as string;

  const extractedAccountNum = (
    resourceData.creditorAccountId ||
    resourceData.account_number ||
    resourceData.account ||
    rawRes.creditorAccountId ||
    rawRes.account_number ||
    creditorAccountId
  ) as string;

  const extractedRrn = (
    resourceData.rrn ||
    rawRes.rrn ||
    ""
  ) as string;

  const extractedRefNum = (
    resourceData.transactionReferenceNumber ||
    resourceData.clientRefNum ||
    resourceData.transactionId ||
    rawRes.transactionReferenceNumber ||
    rawRes.client_ref_num ||
    ""
  ) as string;

  const extractedAddresses = Array.isArray(resourceData.address)
    ? (resourceData.address as Array<{ first_line_of_address?: string; second_line_of_address?: string; third_line_of_address?: string }>)
    : Array.isArray(rawRes.address)
    ? (rawRes.address as Array<{ first_line_of_address?: string; second_line_of_address?: string; third_line_of_address?: string }>)
    : [];

  const resData: VerificationResult = {
    ...rawRes,
    beneficiary_name: extractedCreditorName,
    creditorName: extractedCreditorName,
    name: (resourceData.name || rawRes.name || extractedCreditorName) as string,
    fullname: (resourceData.fullname || rawRes.fullname || resourceData.name || rawRes.name || extractedCreditorName) as string,
    account_number: extractedAccountNum,
    creditorAccountId: extractedAccountNum,
    rrn: extractedRrn,
    transactionReferenceNumber: extractedRefNum,
    bank_name: (rawRes.bank_name || rawRes.bankName || rawRes.bank || "") as string,
    branch: (rawRes.branch || rawRes.branchName || rawRes.branch_name || "") as string,
    city: (rawRes.city || "") as string,
    state: (rawRes.state || "") as string,
    micr: (rawRes.micr || rawRes.micr_code || rawRes.micrCode || "") as string,
    ifscCode: (rawRes.ifscCode || rawRes.ifsc || rawRes.ifsc_code || ifscCode) as string,
    ifsc: (rawRes.ifsc || rawRes.ifscCode || rawRes.ifsc_code || ifscCode) as string,
    account_status: ((beneResp?.metaData as Record<string, unknown>)?.status || rawRes.account_status || rawRes.accountStatus || rawRes.status || "ACTIVE") as string,
    is_valid: rawRes.is_valid !== undefined ? Boolean(rawRes.is_valid) : true,
    account_exists: rawRes.account_exists !== undefined ? Boolean(rawRes.account_exists) : true,
    pan: (resourceData.pan || rawRes.pan || "") as string,
    pan_type: (rawRes.pan_type || rawRes.panType || "Individual") as string,
    pan_status: (rawRes.pan_status || "") as string,
    aadhaar: (rawRes.aadhaar || rawRes.aadhaar_number || "") as string,
    aadhaar_number: (rawRes.aadhaar_number || rawRes.aadhaar || "") as string,
    aadhaar_status: (rawRes.aadhaar_status || rawRes.status || "") as string,
    dob: (resourceData.dob || rawRes.dob || "") as string,
    age: (resourceData.age || rawRes.age || "") as string,
    gender: (resourceData.gender || rawRes.gender || "") as string,
    email: (resourceData.email || rawRes.email || "") as string,
    address: extractedAddresses.length > 0 ? extractedAddresses : (rawRes.address as any),
  };

  const isSuccess =
    responseStatus === 200 &&
    (
      responseJson?.result_code === 101 ||
      responseJson?.status?.type === "success" ||
      responseJson?.message === "success" ||
      Boolean(resData.name) ||
      Boolean(resData.fullname) ||
      Boolean(resData.pan && resData.pan_status !== "Invalid") ||
      Boolean(resData.aadhaar && resData.aadhaar_status !== "Invalid") ||
      Boolean(resData.creditorAccountId && resData.account_status !== "INVALID")
    ) &&
    !(
      (responseJson?.result_code === 102 || responseJson?.result_code === 103) &&
      !resData.name &&
      !resData.fullname &&
      !resData.pan &&
      !resData.aadhaar &&
      !resData.creditorAccountId
    );

  const extractedFullName =
    resData.name ||
    resData.fullname ||
    resData.beneficiary_name ||
    [resData.first_name, resData.middle_name, resData.last_name].filter(Boolean).join(" ") ||
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

  const currentEndpoint =
    selectedService === "pan"
      ? "/srv2/validation/pan"
      : selectedService === "aadhaar"
      ? "/srv3/verification/aadhar"
      : selectedService === "bank"
      ? "/idfc/beneficiary"
      : "/srv4/credit-report/prefill";

  const currentServiceName =
    selectedService === "pan"
      ? "PAN Verification API (Pan Details V2)"
      : selectedService === "aadhaar"
      ? "Aadhar Fetch Without OTP"
      : selectedService === "bank"
      ? "Bank Verification Penny Less V2"
      : "Mobile to Prefill Verification";

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
                search={{
                  endpoint:
                    selectedService === "pan"
                      ? "verify-pan"
                      : selectedService === "aadhaar"
                      ? "aadhaar-without-otp"
                      : selectedService === "bank"
                      ? "bank-penny-less"
                      : "mobile-to-prefill",
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Full API Docs
              </Link>
            </div>
          </div>

          {/* Service Selector Tabs & Environment Notice */}
          <div className="rounded-xl border border-border bg-card/60 p-4 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              {/* Service Dropdown */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  Select Service:
                </span>
                <div className="relative min-w-[260px] sm:min-w-[310px]">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-primary">
                    {selectedService === "pan" && <CreditCard className="h-4 w-4" />}
                    {selectedService === "aadhaar" && <Fingerprint className="h-4 w-4 text-emerald-400" />}
                    {selectedService === "bank" && <Landmark className="h-4 w-4 text-blue-400" />}
                    {selectedService === "prefill" && <Smartphone className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <select
                    value={selectedService}
                    onChange={(e) => {
                      setSelectedService(e.target.value as "pan" | "aadhaar" | "bank" | "prefill");
                      setResponseJson(null);
                      setResponseStatus(null);
                    }}
                    className="w-full appearance-none rounded-lg border border-border bg-background pl-8 pr-8 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm cursor-pointer transition-all hover:border-primary/50"
                  >
                    <option value="pan" className="bg-card text-foreground py-1.5">
                      Pan Details V2 (/srv2/validation/pan)
                    </option>
                    <option value="aadhaar" className="bg-card text-foreground py-1.5">
                      Aadhar Fetch - Without OTP (/srv3/verification/aadhar)
                    </option>
                    <option value="bank" className="bg-card text-foreground py-1.5">
                      Bank Verification - Penny Less V2 (/idfc/beneficiary)
                    </option>
                    <option value="prefill" className="bg-card text-foreground py-1.5">
                      Mobile to Prefill (/srv4/credit-report/prefill)
                    </option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted-foreground">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
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
                  ) : selectedService === "aadhaar" ? (
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
                  ) : selectedService === "bank" ? (
                    /* Bank Penny Less Form */
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Bank Account Number *</span>
                          <span className="text-[11px] text-muted-foreground">creditorAccountId (9-18 Digits)</span>
                        </div>
                        <input
                          value={creditorAccountId}
                          onChange={(e) => setCreditorAccountId(e.target.value.trim())}
                          placeholder="Enter Account Number (e.g. 50100234567890)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Bank IFSC Code *</span>
                          <span className="text-[11px] text-muted-foreground">11 Characters (e.g. HDFC0000001)</span>
                        </div>
                        <input
                          value={ifscCode}
                          maxLength={11}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          placeholder="Enter IFSC Code (e.g. HDFC0000001)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider uppercase outline-none focus:border-primary"
                        />
                      </div>
                    </>
                  ) : (
                    /* Mobile to Prefill Form */
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Mobile Number *</span>
                          <span className="text-[11px] text-muted-foreground">10 Digits</span>
                        </div>
                        <input
                          value={mobileNumber}
                          maxLength={10}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 10-digit mobile number"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-xs text-muted-foreground mb-1">First Name *</span>
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="e.g. Som"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                          />
                        </label>

                        <label className="block">
                          <span className="block text-xs text-muted-foreground mb-1">Last Name</span>
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="e.g. Kumar"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                          />
                        </label>
                      </div>
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
                    ) : selectedService === "aadhaar" ? (
                      <Fingerprint className="h-8 w-8 opacity-40 text-primary" />
                    ) : selectedService === "bank" ? (
                      <Landmark className="h-8 w-8 opacity-40 text-blue-400" />
                    ) : (
                      <Smartphone className="h-8 w-8 opacity-40 text-emerald-400" />
                    )}
                    <p className="text-sm font-medium">No verification request sent yet</p>
                    <p className="text-xs">
                      Enter {selectedService === "pan" ? "a PAN number" : selectedService === "aadhaar" ? "an Aadhaar number" : selectedService === "bank" ? "Bank Account Number & IFSC" : "Mobile Number & Name"} on the left and click &quot;Send Request&quot; to fetch live verified details.
                    </p>
                  </div>
                )}

                {/* 1. Visual Card Tab */}
                {!loading && responseJson && activeViewTab === "visual" && (
                  <div className="space-y-4">
                    {/* Success Verification Card */}
                    {isSuccess ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent p-5 space-y-4">
                        {/* ========================================================= */}
                        {/* 📱 MOBILE TO PREFILL DEDICATED CARD                      */}
                        {/* ========================================================= */}
                        {selectedService === "prefill" ? (
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400 border border-emerald-500/30">
                                  <Smartphone className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground">
                                    {resData.name || resData.fullname || `${firstName} ${lastName}`.trim() || "Prefilled Identity Record"}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Mobile: {mobileNumber} · PAN: {resData.pan || "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> IDENTITY PREFILLED
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {/* Full Name */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <User className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Full Name</span>
                                </div>
                                <p className="font-bold text-foreground text-sm">
                                  {resData.name || resData.fullname || "—"}
                                </p>
                              </div>

                              {/* Linked PAN */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <CreditCard className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Registered PAN</span>
                                </div>
                                <p className="font-mono font-bold text-primary text-base">
                                  {resData.pan || "—"}
                                </p>
                              </div>

                              {/* DOB & Age */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">DOB & Age</span>
                                </div>
                                <p className="font-semibold text-foreground text-sm">
                                  {resData.dob || "—"} {resData.age ? `(Age: ${resData.age})` : ""}
                                </p>
                                <p className="text-[11px] text-muted-foreground">Gender: {resData.gender || "—"}</p>
                              </div>

                              {/* Email & Mobile */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Contact Info</span>
                                </div>
                                <p className="font-semibold text-foreground text-xs truncate">
                                  {resData.email || "—"}
                                </p>
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  Phone: {mobileNumber}
                                </p>
                              </div>
                            </div>

                            {/* Registered Addresses Section */}
                            {extractedAddresses.length > 0 && (
                              <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Registered Addresses ({extractedAddresses.length})</span>
                                </div>
                                <div className="space-y-2 divide-y divide-border/40">
                                  {extractedAddresses.map((addr, idx) => (
                                    <div key={idx} className="pt-2 first:pt-0 text-[11px] text-muted-foreground space-y-0.5">
                                      {addr.first_line_of_address && <p className="text-foreground font-medium">{addr.first_line_of_address}</p>}
                                      {addr.second_line_of_address && <p>{addr.second_line_of_address}</p>}
                                      {addr.third_line_of_address && <p>{addr.third_line_of_address}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : selectedService === "bank" ? (
                          /* ========================================================= */
                          /* 🏦 BANK VERIFICATION DEDICATED CARD                      */
                          /* ========================================================= */
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-blue-500/15 p-2 text-blue-400 border border-blue-500/30">
                                  <Landmark className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground">
                                    {resData.creditorName || resData.beneficiary_name || resData.fullname || "Bank Account Verified"}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Account: {resData.creditorAccountId || resData.account_number || creditorAccountId} · IFSC: {resData.ifscCode || resData.ifsc || ifscCode}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> {resData.account_status || (resData.is_valid ? "ACTIVE · VERIFIED" : "VERIFIED")}
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {/* Beneficiary Name */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <User className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Beneficiary Name (Live Bank Record)</span>
                                </div>
                                <p className="font-bold text-foreground text-sm">
                                  {resData.creditorName || resData.beneficiary_name || resData.fullname || resData.name || "—"}
                                </p>
                                <p className="text-[11px] text-emerald-400 font-medium">
                                  ✓ Beneficiary Name Live Verified
                                </p>
                              </div>

                              {/* Account Number */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Account Number & IFSC</span>
                                </div>
                                <p className="font-mono font-bold text-primary text-base">
                                  {resData.creditorAccountId || resData.account_number || creditorAccountId}
                                </p>
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  IFSC: <span className="text-foreground font-semibold">{resData.ifscCode || resData.ifsc || ifscCode}</span>
                                </p>
                              </div>

                              {/* Bank Transaction Reference */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Building className="h-3.5 w-3.5 text-blue-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Transaction & Audit Info</span>
                                </div>
                                <p className="font-mono font-semibold text-foreground text-xs truncate">
                                  RRN: {resData.rrn || resData.transactionReferenceNumber || "—"}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono truncate">
                                  Ref: {resData.transactionReferenceNumber || resData.transactionId || "—"}
                                </p>
                              </div>

                              {/* Account Status & Verification */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Landmark className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Bank Verification Status</span>
                                </div>
                                <p className="font-semibold text-emerald-400 text-sm">
                                  {resData.account_status || "ACTIVE / VALID"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Validation: {resData.is_valid !== false ? "SUCCESSFUL" : "FAILED"}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : selectedService === "pan" ? (
                          /* ========================================================= */
                          /* 💳 PAN VERIFICATION DEDICATED CARD                       */
                          /* ========================================================= */
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                <div>
                                  <p className="text-sm font-bold text-foreground">
                                    {extractedFullName || `PAN Verified: ${resData.pan || pan}`}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    PAN: {resData.pan || pan} · Type: {resData.pan_type || "Individual"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" /> {resData.aadhaar_linked !== undefined ? "Aadhaar Linked" : "Active"}
                                </span>
                                {resData.aadhaar_seeding_status && (
                                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                                    Seeding: {String(resData.aadhaar_seeding_status)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {extractedFullName && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Full Name</span>
                                  </div>
                                  <p className="font-semibold text-foreground text-sm">{extractedFullName}</p>
                                </div>
                              )}

                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <CreditCard className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">PAN Number</span>
                                </div>
                                <p className="font-mono font-bold text-primary text-base">{resData.pan || pan}</p>
                                <p className="text-[11px] text-muted-foreground">Type: {resData.pan_type || "Individual"}</p>
                              </div>

                              {(resData.dob || resData.gender) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">DOB & Gender</span>
                                  </div>
                                  <p className="font-semibold text-foreground">{String(resData.dob || "—")}</p>
                                  <p className="text-[11px] text-muted-foreground uppercase">Gender: {String(resData.gender || "—")}</p>
                                </div>
                              )}

                              {(resData.mobile || resData.email) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Contact Info</span>
                                  </div>
                                  <p className="font-mono text-xs text-foreground">{resData.mobile || "—"}</p>
                                  <p className="font-mono text-[11px] text-muted-foreground">{resData.email || ""}</p>
                                </div>
                              )}

                              {extractedAddress && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Registered Address</span>
                                  </div>
                                  <p className="text-xs leading-relaxed text-foreground/90 pt-0.5">{extractedAddress}</p>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          /* ========================================================= */
                          /* 🪪 AADHAAR VERIFICATION DEDICATED CARD                   */
                          /* ========================================================= */
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                <div>
                                  <p className="text-sm font-bold text-foreground">
                                    {extractedFullName || "Aadhaar Verified & Active"}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Aadhaar: {resData.aadhaar_number || resData.aadhaar || aadhaar}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" /> Valid & Active
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {extractedFullName && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Full Name</span>
                                  </div>
                                  <p className="font-semibold text-foreground text-sm">{extractedFullName}</p>
                                </div>
                              )}

                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Aadhaar Number</span>
                                </div>
                                <p className="font-mono font-semibold text-foreground">{resData.aadhaar_number || resData.aadhaar || aadhaar}</p>
                                <p className="text-[11px] text-emerald-400">Status: Active / Valid</p>
                              </div>

                              {(resData.age_band || resData.state) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Demographic Info</span>
                                  </div>
                                  <p className="font-semibold text-foreground">{resData.state || "India"}</p>
                                  {resData.age_band && <p className="text-[11px] text-muted-foreground font-mono">Age Band: {String(resData.age_band)}</p>}
                                </div>
                              )}

                              {resData.gender && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Gender</span>
                                  </div>
                                  <p className="font-semibold text-foreground uppercase">{String(resData.gender)}</p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
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
                          <p>
                            Target:{" "}
                            {selectedService === "pan"
                              ? `PAN: ${pan}`
                              : selectedService === "aadhaar"
                              ? `Aadhaar: ${aadhaar}`
                              : selectedService === "bank"
                              ? `Account: ${creditorAccountId} · IFSC: ${ifscCode}`
                              : `Mobile: ${mobileNumber} · Name: ${firstName} ${lastName}`}
                          </p>
                          <p>Status: {String(resData.account_status || resData.pan_status || resData.aadhaar_status || responseJson.message || "Invalid / Not Found")}</p>
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
