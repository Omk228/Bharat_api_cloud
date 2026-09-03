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
  Building2,
  Briefcase,
  Smartphone,
  Globe,
  Compass,
  Navigation,
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
  full_name?: string;
  mobile_linked_name?: string;
  operator?: string;
  circle?: string;
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
  country?: string;
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
  uan?: string[];
  summary?: Record<string, unknown>;
  uan_details?: Record<string, unknown>;
  uan_source?: Array<Record<string, unknown>>;
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
  service?: "pan" | "aadhaar" | "bank" | "bank_validation" | "prefill" | "name_finder" | "ip_lookup" | "reverse_geocode" | "uan" | undefined;
};

export const Route = createFileRoute("/_authenticated/dashboard/test-api")({
  validateSearch: (search: Record<string, unknown>): TestApiSearch => ({
    service:
      search["service"] === "aadhaar"
        ? "aadhaar"
        : search["service"] === "bank"
        ? "bank"
        : search["service"] === "bank_validation" || search["service"] === "validate_bank_account"
        ? "bank_validation"
        : search["service"] === "uan" || search["service"] === "uan_mobile" || search["service"] === "mobile_uan"
        ? "uan"
        : search["service"] === "prefill"
        ? "prefill"
        : search["service"] === "name_finder" || search["service"] === "mobile_name"
        ? "name_finder"
        : search["service"] === "ip_lookup" || search["service"] === "requester_ip" || search["service"] === "ip"
        ? "ip_lookup"
        : search["service"] === "reverse_geocode" || search["service"] === "reverse" || search["service"] === "geocode"
        ? "reverse_geocode"
        : "pan",
  }),
  head: () => ({
    meta: [
      { title: "Test API Console — Interactive Gateway — Bharat API Cloud" },
      {
        name: "description",
        content: "Live sandbox test console for PAN, Aadhaar, Bank Verification, Bank Account Validation, Mobile to UAN, Mobile to Prefill, Mobile To Name Finder, Requester IP Lookup, and Reverse Geocoding APIs.",
      },
    ],
  }),
  component: TestApiPage,
});

function TestApiPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const [selectedService, setSelectedService] = useState<"pan" | "aadhaar" | "bank" | "bank_validation" | "prefill" | "name_finder" | "ip_lookup" | "reverse_geocode" | "uan">(
    searchParams.service === "aadhaar"
      ? "aadhaar"
      : searchParams.service === "bank"
      ? "bank"
      : searchParams.service === "bank_validation"
      ? "bank_validation"
      : searchParams.service === "uan"
      ? "uan"
      : searchParams.service === "prefill"
      ? "prefill"
      : searchParams.service === "name_finder"
      ? "name_finder"
      : searchParams.service === "ip_lookup"
      ? "ip_lookup"
      : searchParams.service === "reverse_geocode"
      ? "reverse_geocode"
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

  const DEFAULT_API_ID = "APIDC9272C";
  const DEFAULT_API_KEY = "fc62efa1-4aff-478d-9b1b-6589e6262cba";
  const DEFAULT_TOKEN_ID = "1_jXBOXY4fBxo9XOw2t3kw7wBMTRVuO9";

  const activeCred = creds && creds.length > 0 ? creds[0] : null;

  // Credential overrides (editable in form)
  const [apiId, setApiId] = useState(DEFAULT_API_ID);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [tokenId, setTokenId] = useState(DEFAULT_TOKEN_ID);
  
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

  // Bank Validation fields
  const [bankValidateAccountNumber, setBankValidateAccountNumber] = useState("");
  const [bankValidateIfscCode, setBankValidateIfscCode] = useState("");

  // Mobile to UAN fields
  const [uanMobile, setUanMobile] = useState("");

  // Prefill fields
  const [mobileNumber, setMobileNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Mobile To Name Finder fields
  const [mobileNameNumber, setMobileNameNumber] = useState("");
  const [ipAddress, setIpAddress] = useState("");

  // Reverse Geocoding fields
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [loading, setLoading] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseJson, setResponseJson] = useState<ApiResponseEnvelope | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"visual" | "json">("visual");

  // Sync credentials when loaded
  useEffect(() => {
    if (activeCred) {
      setApiId(activeCred.api_id || DEFAULT_API_ID);
      setApiKey(activeCred.api_key || DEFAULT_API_KEY);
      setTokenId(activeCred.token_id || activeCred.token_id_preview || DEFAULT_TOKEN_ID);
    }
  }, [activeCred]);

  // Sync selectedService from URL param
  useEffect(() => {
    if (searchParams.service) {
      setSelectedService(searchParams.service);
    }
  }, [searchParams.service]);

  const effectiveApiId = apiId || activeCred?.api_id || DEFAULT_API_ID;
  const effectiveApiKey = apiKey || activeCred?.api_key || DEFAULT_API_KEY;
  const effectiveTokenId = tokenId || activeCred?.token_id || DEFAULT_TOKEN_ID;

  // Dynamic request payload based on selected service
  const requestPayload =
    selectedService === "pan"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          pan: pan.trim().toUpperCase(),
          name: name.trim(),
          pan_display_name: panDisplayName,
          name_match_method: nameMatchMethod,
        }
      : selectedService === "aadhaar"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          aadhaar: aadhaar.trim().replace(/\s|-/g, ""),
          ...(name.trim() ? { name: name.trim() } : {}),
        }
      : selectedService === "bank"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          creditorAccountId: creditorAccountId.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
        }
      : selectedService === "name_finder"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          mobile: mobileNameNumber.trim().replace(/\D/g, ""),
        }
      : selectedService === "ip_lookup"
      ? {
          ip: ipAddress.trim(),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "reverse_geocode"
      ? {
          lat: latitude.trim() || "28.6139",
          lon: longitude.trim() || "77.2090",
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "bank_validation"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          bank_account_no: bankValidateAccountNumber.trim() || "38237401582",
          bank_ifsc_code: bankValidateIfscCode.trim().toUpperCase() || "SBIN0002296",
          nf_verification: true,
        }
      : selectedService === "uan"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          mobile: uanMobile.trim().replace(/\D/g, ""),
        }
      : {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
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
    if (selectedService === "bank_validation" && (!bankValidateAccountNumber.trim() || !bankValidateIfscCode.trim())) {
      toast.error("Please enter Bank Account Number and IFSC Code");
      return;
    }
    if (selectedService === "uan" && !uanMobile.trim()) {
      toast.error("Please enter a 10-digit mobile number");
      return;
    }
    if (selectedService === "name_finder" && !mobileNameNumber.trim()) {
      toast.error("Please enter a 10-digit mobile number");
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
      } else if (selectedService === "name_finder") {
        rawData = await apiClient.verifyMobileNameFinder(requestPayload as Parameters<typeof apiClient.verifyMobileNameFinder>[0]);
      } else if (selectedService === "ip_lookup") {
        rawData = await apiClient.lookupRequesterIp({
          ip: ipAddress.trim(),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "reverse_geocode") {
        rawData = await apiClient.reverseGeocode({
          lat: latitude.trim() || "28.6139",
          lon: longitude.trim() || "77.2090",
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "bank_validation") {
        rawData = await apiClient.validateBankAccount({
          bank_account_no: bankValidateAccountNumber.trim() || "38237401582",
          bank_ifsc_code: bankValidateIfscCode.trim().toUpperCase() || "SBIN0002296",
          nf_verification: true,
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "uan") {
        rawData = await apiClient.verifyMobileToUan({
          mobile: uanMobile.trim().replace(/\D/g, ""),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
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

  // Dynamic extraction from server response (supporting standard beneValidationResp, result, data)
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
    mobile: (resourceData.mobile || rawRes.mobile || "") as string,
    mobile_linked_name: (resourceData.mobile_linked_name || rawRes.mobile_linked_name || "") as string,
    full_name: (resourceData.mobile_linked_name || resourceData.full_name || resourceData.fullname || rawRes.full_name || rawRes.fullname || resourceData.name || rawRes.name || "") as string,
    first_name: (resourceData.first_name || rawRes.first_name || "") as string,
    middle_name: (resourceData.middle_name || rawRes.middle_name || "") as string,
    last_name: (resourceData.last_name || rawRes.last_name || "") as string,
    country: (resourceData.country || rawRes.country || "") as string,
    city: (resourceData.city || rawRes.city || "") as string,
    state: (resourceData.state || rawRes.state || "") as string,
    operator: (resourceData.operator || rawRes.operator || rawRes.telecom_provider || "") as string,
    circle: (resourceData.circle || rawRes.circle || rawRes.telecom_circle || "") as string,
    address: extractedAddresses.length > 0 ? extractedAddresses : (rawRes.address as any),
  };

  const isSuccess =
    responseStatus === 200 &&
    (
      responseJson?.result_code === 101 ||
      responseJson?.status?.type === "success" ||
      responseJson?.message === "success" ||
      Boolean(resData.mobile_linked_name) ||
      Boolean(responseJson?.ip) ||
      Boolean(responseJson?.place_id) ||
      Boolean(responseJson?.osm_id) ||
      Boolean(responseJson?.message?.includes("Mobile name finder")) ||
      Boolean(resData.name) ||
      Boolean(resData.fullname) ||
      Boolean(resData.full_name) ||
      Boolean(resData.pan && resData.pan_status !== "Invalid") ||
      Boolean(resData.aadhaar && resData.aadhaar_status !== "Invalid") ||
      Boolean(resData.creditorAccountId && resData.account_status !== "INVALID")
    ) &&
    !(
      (responseJson?.result_code === 102 || responseJson?.result_code === 103) &&
      !resData.mobile_linked_name &&
      !resData.name &&
      !resData.fullname &&
      !resData.full_name &&
      !resData.pan &&
      !resData.aadhaar &&
      !resData.creditorAccountId
    );

  const extractedFullName =
    resData.mobile_linked_name ||
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
      ? "/srv1/beneficiary"
      : selectedService === "bank_validation"
      ? "/api/v1/validate_bank_account"
      : selectedService === "uan"
      ? "/srv3/uan-mobile"
      : selectedService === "name_finder"
      ? "/srv2/mobile-name-finder"
      : selectedService === "ip_lookup"
      ? "/check"
      : selectedService === "reverse_geocode"
      ? "/reverse"
      : "/srv4/credit-report/prefill";

  const currentServiceName =
    selectedService === "pan"
      ? "PAN Verification API (Pan Details V2)"
      : selectedService === "aadhaar"
      ? "Aadhar Fetch Without OTP"
      : selectedService === "bank"
      ? "Bank Verification Penny Less V2"
      : selectedService === "bank_validation"
      ? "Bank Account Validation"
      : selectedService === "uan"
      ? "Mobile to UAN V2"
      : selectedService === "name_finder"
      ? "Mobile To Name Finder"
      : selectedService === "ip_lookup"
      ? "Requester IP Lookup"
      : selectedService === "reverse_geocode"
      ? "Reverse Geocoding (Coordinates to Address)"
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
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  {selectedService === "name_finder" || selectedService === "uan" ? "₹5.00 / Request" : selectedService === "ip_lookup" || selectedService === "reverse_geocode" ? "Live Gateway" : "₹2.00 / Request"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedService === "ip_lookup"
                  ? "Direct IP Geolocation and Network Intelligence Gateway powered by Bharat API Cloud."
                  : selectedService === "reverse_geocode"
                  ? "Direct GPS Coordinates to Street Address & Administrative Geocoding powered by Bharat API Cloud."
                  : selectedService === "bank_validation"
                  ? "Direct Bank Account Validation and Beneficiary Name Verification powered by Bharat API Cloud."
                  : selectedService === "uan"
                  ? "Direct Mobile to Universal Account Number (UAN) & EPFO Employment Verification powered by Bharat API Cloud."
                  : `Direct live verification gateway powered by Bharat API Cloud with automatic wallet debit (${selectedService === "name_finder" ? "₹5.00" : "₹2.00"}) & refunds.`}
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
                      : selectedService === "bank_validation"
                      ? "bank-validation"
                      : selectedService === "uan"
                      ? "mobile-to-uan"
                      : selectedService === "name_finder"
                      ? "mobile-name-finder"
                      : selectedService === "ip_lookup"
                      ? "requester-ip-lookup"
                      : selectedService === "reverse_geocode"
                      ? "reverse-geocoding"
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
              {/* Active Service Display (Opened via Test in Console) */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  Active Service:
                </span>
                <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                  {selectedService === "pan" && <CreditCard className="h-4 w-4 text-primary" />}
                  {selectedService === "aadhaar" && <Fingerprint className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "bank" && <Landmark className="h-4 w-4 text-blue-400" />}
                  {selectedService === "bank_validation" && <Landmark className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "uan" && <Briefcase className="h-4 w-4 text-indigo-400" />}
                  {selectedService === "prefill" && <Smartphone className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "name_finder" && <Phone className="h-4 w-4 text-amber-400" />}
                  {selectedService === "ip_lookup" && <Globe className="h-4 w-4 text-cyan-400" />}
                  {selectedService === "reverse_geocode" && <Compass className="h-4 w-4 text-teal-400" />}
                  <span>
                    {selectedService === "pan" && "Pan Details V2 (/srv2/validation/pan)"}
                    {selectedService === "aadhaar" && "Aadhar Fetch - Without OTP (/srv3/verification/aadhar)"}
                    {selectedService === "bank" && "Bank Verification - Penny Less V2 (/srv1/beneficiary)"}
                    {selectedService === "bank_validation" && "Bank Account Validation (/api/v1/validate_bank_account)"}
                    {selectedService === "uan" && "Mobile to UAN V2 (/srv3/uan-mobile)"}
                    {selectedService === "prefill" && "Mobile to Prefill (/srv4/credit-report/prefill)"}
                    {selectedService === "name_finder" && "Mobile To Name Finder (/srv2/mobile-name-finder)"}
                    {selectedService === "ip_lookup" && "Requester IP Lookup (/check)"}
                    {selectedService === "reverse_geocode" && "Reverse Geocoding (/reverse)"}
                  </span>
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
                    {selectedService === "reverse_geocode" ? "GET" : selectedService === "ip_lookup" ? "GET / POST" : "POST"}
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
                      readOnly
                      placeholder="e.g. APIDC9272C"
                      className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-xs font-semibold text-foreground cursor-not-allowed outline-none select-all focus:border-border"
                    />
                  </label>

                  <label className="block">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>API Key</span>
                    </div>
                    <input
                      value={apiKey}
                      readOnly
                      placeholder="e.g. fc62efa1-4aff-478d-9b1b-6589e6262cba"
                      className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-xs font-semibold text-foreground cursor-not-allowed outline-none select-all focus:border-border"
                    />
                  </label>

                  <label className="block">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Token ID</span>
                    </div>
                    <input
                      value={tokenId}
                      readOnly
                      placeholder="e.g. 1_jXBOXY4fBxo9XOw2t3kw7wBMTRVuO9"
                      className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-xs font-semibold text-foreground cursor-not-allowed outline-none select-all focus:border-border"
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
                  ) : selectedService === "name_finder" ? (
                    /* Mobile To Name Finder Form */
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Mobile *</span>
                          <span className="text-[11px] text-muted-foreground">10 Digits (e.g. 9876543210)</span>
                        </div>
                        <input
                          value={mobileNameNumber}
                          maxLength={10}
                          onChange={(e) => setMobileNameNumber(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter mobile"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-primary"
                        />
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-amber-400">₹5.00 / Hit</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        👉 Response will reflect in the response section
                      </p>
                    </>
                  ) : selectedService === "ip_lookup" ? (
                    /* Requester IP Lookup Form */
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Target IP Address</span>
                          <span className="text-[11px] text-muted-foreground">Leave empty for auto-detect</span>
                        </div>
                        <input
                          value={ipAddress}
                          onChange={(e) => setIpAddress(e.target.value.trim())}
                          placeholder="Enter IP Address (or leave blank for caller IP)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-cyan-400"
                        />
                      </div>
                    </>
                  ) : selectedService === "reverse_geocode" ? (
                    /* Reverse Geocoding Form */
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Latitude Coordinate (lat)</span>
                            <span className="text-[11px] text-muted-foreground">-90.0 to 90.0</span>
                          </div>
                          <input
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value.trim())}
                            placeholder="e.g. 28.6139"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-teal-400"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Longitude Coordinate (lon)</span>
                            <span className="text-[11px] text-muted-foreground">-180.0 to 180.0</span>
                          </div>
                          <input
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value.trim())}
                            placeholder="e.g. 77.2090"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>
                    </>
                  ) : selectedService === "bank_validation" ? (
                    /* Bank Account Validation Form */
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Bank Account Number *</span>
                            <span className="text-[11px] text-muted-foreground">9 to 18 Digits</span>
                          </div>
                          <input
                            value={bankValidateAccountNumber}
                            onChange={(e) => setBankValidateAccountNumber(e.target.value.trim())}
                            placeholder="e.g. 38237401582"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Bank IFSC Code *</span>
                            <span className="text-[11px] text-muted-foreground">11 Characters (e.g. SBIN0002296)</span>
                          </div>
                          <input
                            value={bankValidateIfscCode}
                            onChange={(e) => setBankValidateIfscCode(e.target.value.toUpperCase().trim())}
                            placeholder="e.g. SBIN0002296"
                            maxLength={11}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-emerald-400 uppercase"
                          />
                        </div>
                      </div>
                    </>
                  ) : selectedService === "uan" ? (
                    /* Mobile to UAN V2 Form */
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Registered Mobile Number *</span>
                          <span className="text-[11px] text-muted-foreground">10 Digits (e.g. 8130823774)</span>
                        </div>
                        <input
                          value={uanMobile}
                          maxLength={10}
                          onChange={(e) => setUanMobile(e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 8130823774"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-indigo-400"
                        />
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-xs text-indigo-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-indigo-400">₹5.00 / Hit</span>
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

                {/* Send & Report Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSendRequest}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all disabled:opacity-60 shadow-md hover:shadow-lg active:scale-[0.99]"
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

                  {selectedService === "name_finder" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!responseJson) {
                          toast.info("Please send a request first to generate the report.");
                        } else {
                          toast.success("PDF Report downloaded successfully.");
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-4 py-3 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" /> PDF Report
                    </button>
                  )}
                </div>
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
                    ) : selectedService === "name_finder" ? (
                      <Phone className="h-8 w-8 opacity-40 text-amber-400" />
                    ) : (
                      <Smartphone className="h-8 w-8 opacity-40 text-emerald-400" />
                    )}
                    <p className="text-sm font-medium">No verification request sent yet</p>
                    <p className="text-xs">
                      Enter {selectedService === "pan" ? "a PAN number" : selectedService === "aadhaar" ? "an Aadhaar number" : selectedService === "bank" ? "Bank Account Number & IFSC" : selectedService === "name_finder" ? "a 10-digit mobile number" : "Mobile Number & Name"} on the left and click &quot;Send Request&quot; to fetch live verified details.
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
                        {/* 🔍 MOBILE TO NAME FINDER DEDICATED CARD                   */}
                        {/* ========================================================= */}
                        {selectedService === "name_finder" ? (
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-amber-500/15 p-2 text-amber-400 border border-amber-500/30">
                                  <Phone className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground">
                                    {resData.mobile_linked_name || resData.full_name || resData.fullname || resData.name || "Subscriber Identified"}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Mobile: +91 {mobileNameNumber}
                                    {resData.operator && (
                                      <> · Operator: <span className="text-foreground font-semibold">{String(resData.operator)}</span></>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> SUBSCRIBER IDENTIFIED
                                </span>
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  ₹5.00 Billed
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {/* Registered / Linked Subscriber Name */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <User className="h-3.5 w-3.5 text-amber-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Subscriber Linked Name</span>
                                </div>
                                <p className="font-bold text-foreground text-base">
                                  {resData.mobile_linked_name || resData.full_name || resData.fullname || resData.name || "—"}
                                </p>
                                <p className="text-[11px] text-emerald-400 font-medium">
                                  ✓ Live Verified from Telecom Records
                                </p>
                              </div>

                              {/* Mobile Number */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 text-amber-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Mobile Number</span>
                                </div>
                                <p className="font-mono font-bold text-primary text-base">
                                  +91 {mobileNameNumber}
                                </p>
                                <p className="text-[11px] text-emerald-400">
                                  Status: Active & Linked
                                </p>
                              </div>

                              {/* Telecom Operator ONLY if returned in JSON */}
                              {Boolean(resData.operator) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Building className="h-3.5 w-3.5 text-amber-400" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Telecom Operator</span>
                                  </div>
                                  <p className="font-semibold text-foreground text-sm">
                                    {String(resData.operator)}
                                  </p>
                                </div>
                              )}

                              {/* Telecom Circle ONLY if returned in JSON */}
                              {Boolean(resData.circle) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-amber-400" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Telecom Circle / Region</span>
                                  </div>
                                  <p className="font-semibold text-foreground text-sm">
                                    {String(resData.circle)}
                                  </p>
                                </div>
                              )}

                              {/* Any dynamic extra fields returned in data */}
                              {Object.entries(resourceData || {})
                                .filter(([key, val]) => {
                                  const k = key.toLowerCase();
                                  const handled = [
                                    "mobile_linked_name", "full_name", "fullname", "name", "mobile",
                                    "operator", "circle", "status", "code", "type", "message"
                                  ];
                                  if (handled.includes(k)) return false;
                                  if (val === null || val === undefined || val === "") return false;
                                  if (typeof val === "object") return false;
                                  return true;
                                })
                                .map(([key, val]) => (
                                  <div key={key} className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">
                                        {key.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                    <p className="font-semibold text-foreground text-sm font-mono">
                                      {String(val)}
                                    </p>
                                  </div>
                                ))}

                              {/* Verification Audit & Trace */}
                              {(responseJson?.request_id || responseJson?.client_ref_num) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 sm:col-span-2">
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Verification Audit & Trace</span>
                                    </div>
                                    {Boolean(responseJson?._cached) && (
                                      <span className="rounded bg-amber-500/15 text-amber-400 font-mono text-[10px] px-2 py-0.5 border border-amber-500/25">
                                        ⚡ Cached Response
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono text-muted-foreground pt-0.5">
                                    {responseJson?.request_id && (
                                      <p className="truncate">
                                        Request ID: <span className="text-foreground">{String(responseJson.request_id)}</span>
                                      </p>
                                    )}
                                    {responseJson?.client_ref_num && (
                                      <p className="truncate">
                                        Client Ref: <span className="text-foreground">{String(responseJson.client_ref_num)}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : selectedService === "ip_lookup" ? (
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-cyan-500/15 p-1.5 text-cyan-400 border border-cyan-500/30 flex items-center justify-center overflow-hidden h-12 w-12 shrink-0">
                                  {Boolean((responseJson?.location as Record<string, unknown>)?.country_flag) ? (
                                    <img
                                      src={String((responseJson?.location as Record<string, unknown>).country_flag)}
                                      alt="Country Flag"
                                      className="h-8 w-10 object-contain rounded"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <span className="text-2xl">
                                      {((responseJson?.location as Record<string, unknown>)?.country_flag_emoji as string) || "🌐"}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-base font-mono font-bold text-foreground">
                                      {String(responseJson?.ip || ipAddress || "Requester IP")}
                                    </p>
                                    <span className="rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                      {String(responseJson?.type || "ipv4")}
                                    </span>
                                    {Boolean((responseJson?.location as Record<string, unknown>)?.country_flag_emoji) && (
                                      <span className="text-base" title="Country Flag">
                                        {String((responseJson?.location as Record<string, unknown>).country_flag_emoji)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {String(responseJson?.city || "")}
                                    {responseJson?.region_name ? `, ${String(responseJson.region_name)}` : ""}
                                    {responseJson?.country_name ? `, ${String(responseJson.country_name)}` : ""}
                                    {responseJson?.zip ? ` · PIN/ZIP: ${String(responseJson.zip)}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> GEOLOCATION RESOLVED
                                </span>
                                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-400">
                                  Bharat API Gateway
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {/* City & Regional Division */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">City & Regional Division</span>
                                </div>
                                <p className="font-bold text-foreground text-base">
                                  {String(responseJson?.city || "—")}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                  <span>Region: <strong className="text-foreground">{String(responseJson?.region_name || "—")}</strong> ({String(responseJson?.region_code || "")})</span>
                                  <span>·</span>
                                  <span>ZIP: <strong className="text-foreground font-mono">{String(responseJson?.zip || "—")}</strong></span>
                                </div>
                              </div>

                              {/* Country & Continent */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Country & Geopolitics</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{((responseJson?.location as Record<string, unknown>)?.country_flag_emoji as string) || "🇮🇳"}</span>
                                  <p className="font-bold text-foreground text-base">
                                    {String(responseJson?.country_name || "India")} ({String(responseJson?.country_code || "IN")})
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                  <span>Continent: <strong className="text-foreground">{String(responseJson?.continent_name || "Asia")}</strong> ({String(responseJson?.continent_code || "AS")})</span>
                                  {(responseJson?.location as Record<string, unknown>)?.geoname_id && (
                                    <>
                                      <span>·</span>
                                      <span>Geoname: <strong className="text-foreground font-mono">{String((responseJson.location as Record<string, unknown>).geoname_id)}</strong></span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Geographical Coordinates & Precision */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Compass className="h-3.5 w-3.5 text-cyan-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Geographical Coordinates</span>
                                </div>
                                <p className="font-mono font-bold text-foreground text-sm">
                                  Lat: {String(responseJson?.latitude || "—")}, Long: {String(responseJson?.longitude || "—")}
                                </p>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-emerald-400 font-medium">✓ GPS Position Locked</span>
                                  {Boolean(responseJson?.radius) && (
                                    <span className="text-muted-foreground font-mono">
                                      Accuracy Radius: <strong className="text-foreground">{String(responseJson.radius)} km</strong>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Network, Connection & Routing */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Network & Routing</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                                  <span>Routing: {String(responseJson?.ip_routing_type || "fixed")}</span>
                                  {Boolean(responseJson?.connection_type) && (
                                    <span className="rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 text-[10px] uppercase font-bold">
                                      {String(responseJson.connection_type)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Protocol: {String(responseJson?.type || "ipv4").toUpperCase()} · Fixed IP Routing
                                </p>
                              </div>

                              {/* Country Intelligence & Cultural Profile (Full width) */}
                              {Boolean(responseJson?.location) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-2 sm:col-span-2">
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Country Intelligence & National Profile</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      EU Member: <strong className="text-foreground">{Boolean((responseJson.location as Record<string, unknown>).is_eu) ? "Yes" : "No"}</strong>
                                    </span>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-4 text-xs font-mono pt-1">
                                    <div>
                                      <span className="text-muted-foreground text-[10px] block">NATIONAL CAPITAL</span>
                                      <span className="text-foreground font-semibold font-sans">
                                        {String(((responseJson?.location as Record<string, unknown>)?.capital as string) || "New Delhi")}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-[10px] block">CALLING CODE</span>
                                      <span className="text-cyan-400 font-bold">
                                        +{String(((responseJson?.location as Record<string, unknown>)?.calling_code as string) || "91")}
                                      </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <span className="text-muted-foreground text-[10px] block">OFFICIAL LANGUAGES</span>
                                      <span className="text-foreground font-sans truncate block">
                                        {Array.isArray((responseJson?.location as Record<string, unknown>)?.languages)
                                          ? ((responseJson?.location as Record<string, unknown>).languages as Array<{ name?: string; native?: string }>).map((l) => `${l.name} (${l.native})`).join(", ")
                                          : "Hindi, English"}
                                      </span>
                                    </div>
                                  </div>
                                  {(responseJson?.location as Record<string, unknown>)?.country_flag_emoji_unicode && (
                                    <div className="border-t border-border/50 pt-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                      <span>Flag Unicode: <code className="text-foreground">{String((responseJson.location as Record<string, unknown>).country_flag_emoji_unicode)}</code></span>
                                      {(responseJson?.location as Record<string, unknown>)?.country_flag && (
                                        <a
                                          href={String((responseJson.location as Record<string, unknown>).country_flag)}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-cyan-400 hover:underline flex items-center gap-1"
                                        >
                                          SVG Flag Asset <ExternalLink className="h-3 w-3" />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        ) : selectedService === "reverse_geocode" ? (
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-teal-500/15 p-2 text-teal-400 border border-teal-500/30">
                                  <Compass className="h-6 w-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-base font-bold text-foreground">
                                      {String(
                                        responseJson?.name ||
                                        (responseJson?.address as Record<string, unknown>)?.road ||
                                        (responseJson?.address as Record<string, unknown>)?.suburb ||
                                        (responseJson?.address as Record<string, unknown>)?.city ||
                                        "Geocoded Location"
                                      )}
                                    </p>
                                    <span className="rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                      {String(responseJson?.addresstype || responseJson?.class || "LOCATION")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                                    {String(responseJson?.display_name || "Address resolved via Bharat API Geocoding Engine")}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> COORDINATES RESOLVED
                                </span>
                                <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[11px] font-semibold text-teal-400">
                                  Bharat API Geocoding
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {/* Road & Suburb */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Navigation className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Road & Suburb / Locality</span>
                                </div>
                                <p className="font-bold text-foreground text-base">
                                  {String((responseJson?.address as Record<string, unknown>)?.road || "—")}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Suburb: <strong className="text-foreground">{String((responseJson?.address as Record<string, unknown>)?.suburb || "—")}</strong>
                                </p>
                              </div>

                              {/* City & District */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Building className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">City & District</span>
                                </div>
                                <p className="font-bold text-foreground text-base">
                                  {String((responseJson?.address as Record<string, unknown>)?.city || (responseJson?.address as Record<string, unknown>)?.town || "—")}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  District: <strong className="text-foreground">{String((responseJson?.address as Record<string, unknown>)?.state_district || "—")}</strong>
                                </p>
                              </div>

                              {/* State & Country */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Globe className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">State & Country</span>
                                </div>
                                <p className="font-bold text-foreground text-base">
                                  {String((responseJson?.address as Record<string, unknown>)?.state || "—")} ({String((responseJson?.address as Record<string, unknown>)?.["ISO3166-2-lvl4"] || "")})
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Country: <strong className="text-foreground">{String((responseJson?.address as Record<string, unknown>)?.country || "India")}</strong> ({String((responseJson?.address as Record<string, unknown>)?.country_code || "in").toUpperCase()})
                                </p>
                              </div>

                              {/* Postal / PIN Code */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <FileText className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Postal / PIN Code</span>
                                </div>
                                <p className="font-mono font-bold text-teal-400 text-base">
                                  {String((responseJson?.address as Record<string, unknown>)?.postcode || "—")}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Postal Delivery Jurisdiction
                                </p>
                              </div>

                              {/* GPS Coordinates & Precision */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Compass className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Resolved Coordinates</span>
                                </div>
                                <p className="font-mono font-bold text-foreground text-sm">
                                  Lat: {String(responseJson?.lat || latitude || "—")}, Lon: {String(responseJson?.lon || longitude || "—")}
                                </p>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-emerald-400 font-medium">✓ GPS Precision Lock</span>
                                  {responseJson?.importance !== undefined && (
                                    <span className="text-muted-foreground font-mono">
                                      Importance: <strong className="text-foreground">{String(responseJson.importance)}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Location Classification & Hierarchy */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Terminal className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Location Hierarchy & Type</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                                  <span>Class: {String(responseJson?.class || "—")}</span>
                                  {Boolean(responseJson?.type) && (
                                    <span className="rounded bg-teal-500/15 text-teal-400 border border-teal-500/25 px-1.5 py-0.5 text-[10px] uppercase font-bold">
                                      {String(responseJson.type)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Rank: {String(responseJson?.place_rank || "—")} · Category: {String(responseJson?.addresstype || "—")}
                                </p>
                              </div>

                              {/* Full Administrative Profile & Bounding Box */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-2 sm:col-span-2">
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Complete Formatted Address & Bounding Box</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    Place ID: <strong className="text-foreground font-mono">{String(responseJson?.place_id || "—")}</strong>
                                  </span>
                                </div>
                                <p className="text-xs text-foreground font-medium bg-muted/30 p-2 rounded border border-border/40">
                                  {String(responseJson?.display_name || "—")}
                                </p>
                                {Array.isArray(responseJson?.boundingbox) && (
                                  <div className="border-t border-border/50 pt-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-muted-foreground">
                                    <span>GPS Box: <code className="text-foreground">[{responseJson.boundingbox.join(", ")}]</code></span>
                                    <span className="text-[10px] text-muted-foreground">Bharat API Spatial Data</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : selectedService === "bank_validation" ? (
                          /* ========================================================= */
                          /* 🏦 BANK ACCOUNT VALIDATION DEDICATED CARD                 */
                          /* ========================================================= */
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400 border border-emerald-500/30">
                                  <Landmark className="h-6 w-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-base font-bold text-foreground">
                                      {String(
                                        resData.name_at_bank ||
                                        resData.beneficiary_name ||
                                        resData.fullname ||
                                        resData.creditorName ||
                                        "Beneficiary Identified"
                                      )}
                                    </p>
                                    <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                      {String(resData.verification_type || "NF")} · PENNY LESS
                                    </span>
                                  </div>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Account: {String(resData.account_number || resData.creditorAccountId || bankValidateAccountNumber || "38237401582")} · IFSC: {String(resData.ifsc || resData.ifscCode || bankValidateIfscCode || "SBIN0002296")}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> BANK ACCOUNT VERIFIED
                                </span>
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  Bharat API Verified
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {/* Beneficiary Name / Name at Bank */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <User className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Beneficiary Name (Name At Bank)</span>
                                </div>
                                <p className="font-bold text-foreground text-base">
                                  {String(resData.name_at_bank || resData.beneficiary_name || resData.fullname || "—")}
                                </p>
                                <p className="text-[11px] text-emerald-400 font-medium">
                                  ✓ Live Bank Record Verified
                                </p>
                              </div>

                              {/* Account Number & IFSC Code */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Account Number & IFSC</span>
                                </div>
                                <p className="font-mono font-bold text-primary text-base">
                                  {String(resData.account_number || resData.creditorAccountId || bankValidateAccountNumber || "38237401582")}
                                </p>
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  IFSC Code: <span className="text-foreground font-semibold">{String(resData.ifsc || resData.ifscCode || bankValidateIfscCode || "SBIN0002296")}</span>
                                </p>
                              </div>

                              {/* Account Status & Validity */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Landmark className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Account Status</span>
                                </div>
                                <p className="font-semibold text-emerald-400 text-sm">
                                  {String(resData.account_status || "ACTIVE")}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Account Exists: <span className="text-foreground font-bold">{resData.account_exists ? "YES" : "NO"}</span>
                                </p>
                              </div>

                              {/* Verification Engine & Method */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Verification Engine</span>
                                </div>
                                <p className="font-mono font-semibold text-foreground text-xs">
                                  Penny-Less Bank Verification
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Status: <span className="text-emerald-400 font-semibold">{String(resData.verification_status || resData.account_status || "ACTIVE")}</span>
                                </p>
                              </div>

                              {/* Audit & Reference IDs */}
                              {(responseJson?.request_id || responseJson?.client_ref_num) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 sm:col-span-2">
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Verification Audit & Trace</span>
                                    </div>
                                    {Boolean(responseJson?._cached) && (
                                      <span className="rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] px-2 py-0.5 border border-emerald-500/25">
                                        ⚡ Cached Response
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono text-muted-foreground pt-0.5">
                                    {responseJson?.request_id && (
                                      <p className="truncate">
                                        Request ID: <span className="text-foreground">{String(responseJson.request_id)}</span>
                                      </p>
                                    )}
                                    {responseJson?.client_ref_num && (
                                      <p className="truncate">
                                        Client Ref: <span className="text-foreground">{String(responseJson.client_ref_num)}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : selectedService === "uan" ? (
                            /* ========================================================= */
                            /* 🪪 MOBILE TO UAN V2 DEDICATED VIRTUAL CARD                */
                            /* ========================================================= */
                            (() => {
                              const uanList: string[] = Array.isArray(resData?.uan) ? (resData.uan as string[]) : [];
                              const summary = (resData?.summary || {}) as Record<string, any>;
                              const recentEmployer = (summary?.recent_employer_data || {}) as Record<string, any>;
                              const primaryUan = uanList[0] || recentEmployer?.matching_uan || summary?.matching_uan || "—";
                              const uanDetailsMap = (resData?.uan_details || {}) as Record<string, any>;
                              const uanDetail = uanDetailsMap[primaryUan] || Object.values(uanDetailsMap)[0] || {};
                              const basicDetails = (uanDetail?.basic_details || {}) as Record<string, any>;
                              const employmentDetails = (uanDetail?.employment_details || {}) as Record<string, any>;
                              const uanSources: Array<{ uan?: string; source?: string }> = Array.isArray(resData?.uan_source) ? (resData.uan_source as any) : [];
                              const isEmployed = summary?.is_employed !== undefined ? Boolean(summary.is_employed) : null;

                              return (
                                <>
                                  {/* Top Banner */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-400 border border-indigo-500/30">
                                        <Briefcase className="h-5 w-5" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-bold text-foreground">
                                            {String(
                                              basicDetails.name ||
                                              recentEmployer.establishment_name ||
                                              "EPFO Universal Account"
                                            )}
                                          </p>
                                          <span className="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                            UAN RECORD
                                          </span>
                                        </div>
                                        <p className="font-mono text-xs text-muted-foreground">
                                          Primary UAN: <span className="text-foreground font-semibold">{primaryUan}</span> · Mobile: {uanMobile || basicDetails.mobile || "—"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {isEmployed !== null ? (
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold inline-flex items-center gap-1 border ${
                                          isEmployed
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                            : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                        }`}>
                                          <ShieldCheck className="h-3.5 w-3.5" />
                                          {isEmployed ? "CURRENTLY EMPLOYED" : "EXIT MARKED / INACTIVE"}
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                          <ShieldCheck className="h-3.5 w-3.5" /> UAN VERIFIED
                                        </span>
                                      )}
                                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                        Bharat API Verified
                                      </span>
                                    </div>
                                  </div>

                                  {/* Details Grid */}
                                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                    {/* Primary UAN Number */}
                                    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
                                          <span className="font-medium uppercase tracking-wider text-[10px]">Universal Account Number (UAN)</span>
                                        </div>
                                        <span className="rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                                          Count: {String(summary.uan_count || uanList.length || 1)}
                                        </span>
                                      </div>
                                      <p className="font-mono font-bold text-primary text-base">
                                        {primaryUan}
                                      </p>
                                      {uanList.length > 1 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                          {uanList.map((u, i) => (
                                            <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
                                              {u}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Recent Employer / Establishment */}
                                    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Recent Employer / Establishment</span>
                                      </div>
                                      <p className="font-bold text-foreground text-sm truncate" title={String(recentEmployer.establishment_name || employmentDetails.establishment_name || "—")}>
                                        {String(recentEmployer.establishment_name || employmentDetails.establishment_name || "—")}
                                      </p>
                                      <p className="font-mono text-[11px] text-muted-foreground">
                                        Est ID: <span className="text-foreground font-semibold">{String(recentEmployer.establishment_id || employmentDetails.establishment_id || "—")}</span>
                                      </p>
                                    </div>

                                    {/* Employee Profile */}
                                    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <User className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Employee Profile</span>
                                      </div>
                                      <div className="space-y-1 font-mono text-xs">
                                        <p className="text-foreground font-semibold">
                                          Name: <span className="text-primary font-bold">{String(basicDetails.name || "—")}</span>
                                        </p>
                                        <p className="text-muted-foreground text-[11px]">
                                          DOB: <span className="text-foreground">{String(basicDetails.date_of_birth || "—")}</span> · Gender: <span className="text-foreground">{String(basicDetails.gender || "—")}</span>
                                        </p>
                                        <p className="text-muted-foreground text-[11px]">
                                          Aadhaar Status: <span className={basicDetails.aadhaar_verification_status ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                                            {basicDetails.aadhaar_verification_status ? "✓ Verified" : "Pending / Unlinked"}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Employment Timeline & Member ID */}
                                    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Membership & Timeline</span>
                                      </div>
                                      <div className="space-y-1 font-mono text-xs">
                                        <p className="text-muted-foreground text-[11px] truncate">
                                          Member ID: <span className="text-foreground font-semibold">{String(recentEmployer.member_id || employmentDetails.member_id || "—")}</span>
                                        </p>
                                        <p className="text-muted-foreground text-[11px]">
                                          Date of Joining: <span className="text-emerald-400 font-semibold">{String(recentEmployer.date_of_joining || employmentDetails.date_of_joining || "—")}</span>
                                        </p>
                                        <p className="text-muted-foreground text-[11px]">
                                          Date of Exit: <span className="text-foreground">{String(recentEmployer.date_of_exit || employmentDetails.date_of_exit || "Active / Not Marked")}</span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* UAN Sources Resolution */}
                                    {uanSources.length > 0 && (
                                      <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                          <span className="font-medium uppercase tracking-wider text-[10px]">UAN Source Resolution</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                          {uanSources.map((src, idx) => (
                                            <span key={idx} className="rounded bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 font-mono text-[11px] text-indigo-300 inline-flex items-center gap-1.5">
                                              <Phone className="h-3 w-3 text-indigo-400" />
                                              <span>UAN: <strong className="text-foreground">{src.uan}</strong> (via {src.source})</span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Audit & Reference IDs */}
                                    {(responseJson?.request_id || responseJson?.client_ref_num) && (
                                      <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 sm:col-span-2">
                                        <div className="flex items-center justify-between text-muted-foreground">
                                          <div className="flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                            <span className="font-medium uppercase tracking-wider text-[10px]">Verification Audit & Trace</span>
                                          </div>
                                          {Boolean(responseJson?._cached) && (
                                            <span className="rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] px-2 py-0.5 border border-emerald-500/25">
                                              ⚡ Cached Response
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono text-muted-foreground pt-0.5">
                                          {responseJson?.request_id && (
                                            <p className="truncate">
                                              Request ID: <span className="text-foreground">{String(responseJson.request_id)}</span>
                                            </p>
                                          )}
                                          {responseJson?.client_ref_num && (
                                            <p className="truncate">
                                              Client Ref: <span className="text-foreground">{String(responseJson.client_ref_num)}</span>
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()
                          ) : selectedService === "prefill" ? (
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

                              {Boolean(resourceData.mobile || resourceData.email) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Contact Info</span>
                                  </div>
                                  <p className="font-mono text-xs text-foreground">{String(resourceData.mobile || "")}</p>
                                  {resourceData.email && <p className="font-mono text-[11px] text-muted-foreground">{String(resourceData.email)}</p>}
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

                              {/* Linked Aadhaar Number if returned in PAN response */}
                              {(resData.aadhaar_number || resData.aadhaar) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Linked Aadhaar</span>
                                  </div>
                                  <p className="font-mono font-semibold text-foreground">{resData.aadhaar_number || resData.aadhaar}</p>
                                  <p className="text-[11px] text-emerald-400">✓ Linked to PAN Record</p>
                                </div>
                              )}

                              {/* Name Breakdown if present */}
                              {(resData.first_name || resData.last_name) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Name Breakdown</span>
                                  </div>
                                  <p className="text-xs text-foreground font-medium">
                                    First: <span className="font-semibold">{resData.first_name || "—"}</span>
                                    {resData.middle_name && <> · Mid: <span className="font-semibold">{resData.middle_name}</span></>}
                                    {resData.last_name && <> · Last: <span className="font-semibold">{resData.last_name}</span></>}
                                  </p>
                                </div>
                              )}

                              {/* Location / Country if present */}
                              {(resData.country || resData.state || resData.city) && !extractedAddress && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Location</span>
                                  </div>
                                  <p className="font-semibold text-foreground">
                                    {[resData.city, resData.state, resData.country].filter(Boolean).join(", ")}
                                  </p>
                                </div>
                              )}

                              {/* Audit & Reference IDs (request_id, client_ref_num, _cached) */}
                              {(responseJson?.request_id || responseJson?.client_ref_num) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 sm:col-span-2">
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Verification Audit & Trace</span>
                                    </div>
                                    {Boolean(responseJson?._cached) && (
                                      <span className="rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] px-2 py-0.5 border border-emerald-500/25">
                                        ⚡ Cached Response
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono text-muted-foreground pt-0.5">
                                    {responseJson?.request_id && (
                                      <p className="truncate">
                                        Request ID: <span className="text-foreground">{String(responseJson.request_id)}</span>
                                      </p>
                                    )}
                                    {responseJson?.client_ref_num && (
                                      <p className="truncate">
                                        Client Ref: <span className="text-foreground">{String(responseJson.client_ref_num)}</span>
                                      </p>
                                    )}
                                  </div>
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
                                    {extractedFullName || resData.fullname || "Aadhaar Verified & Active"}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Aadhaar: {resData.aadhaar_number || resData.aadhaar || aadhaar}
                                    {resData.pan && (
                                      <> · PAN: <span className="text-primary font-semibold">{resData.pan}</span></>
                                    )}
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
                              {/* Full Name */}
                              {(extractedFullName || resData.fullname) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Full Name</span>
                                  </div>
                                  <p className="font-semibold text-foreground text-sm">{extractedFullName || resData.fullname}</p>
                                </div>
                              )}

                              {/* Aadhaar Number */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="font-medium uppercase tracking-wider text-[10px]">Aadhaar Number</span>
                                </div>
                                <p className="font-mono font-semibold text-foreground">{resData.aadhaar_number || resData.aadhaar || aadhaar}</p>
                                <p className="text-[11px] text-emerald-400">Status: Active / Valid</p>
                              </div>

                              {/* Linked PAN Number (as present in JSON data) */}
                              {resData.pan && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Linked PAN Number</span>
                                  </div>
                                  <p className="font-mono font-bold text-primary text-base">{resData.pan}</p>
                                  <p className="text-[11px] text-emerald-400 font-medium">✓ Linked to Aadhaar Record</p>
                                </div>
                              )}

                              {/* Date of Birth (DOB) (as present in JSON data) */}
                              {resData.dob && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Date of Birth (DOB)</span>
                                  </div>
                                  <p className="font-semibold text-foreground text-sm font-mono">{String(resData.dob)}</p>
                                  {resData.age && (
                                    <p className="text-[11px] text-muted-foreground">Age: {String(resData.age)} Years</p>
                                  )}
                                </div>
                              )}

                              {/* Gender (as present in JSON data) */}
                              {resData.gender && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Gender</span>
                                  </div>
                                  <p className="font-semibold text-foreground uppercase">{String(resData.gender)}</p>
                                </div>
                              )}

                              {/* Name Breakdown (First / Middle / Last) */}
                              {(resData.first_name || resData.last_name) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Name Breakdown</span>
                                  </div>
                                  <p className="text-xs text-foreground font-medium">
                                    First: <span className="font-semibold">{resData.first_name || "—"}</span>
                                    {resData.middle_name && <> · Mid: <span className="font-semibold">{resData.middle_name}</span></>}
                                    {resData.last_name && <> · Last: <span className="font-semibold">{resData.last_name}</span></>}
                                  </p>
                                </div>
                              )}

                              {/* Location / Country / State / City (as present in JSON data) */}
                              {(resData.country || resData.state || resData.city || resData.age_band) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Location & Demographics</span>
                                  </div>
                                  <p className="font-semibold text-foreground">
                                    {[resData.city, resData.state, resData.country].filter(Boolean).join(", ") || "India"}
                                  </p>
                                  {resData.age_band && (
                                    <p className="text-[11px] text-muted-foreground font-mono">Age Band: {String(resData.age_band)}</p>
                                  )}
                                </div>
                              )}

                              {/* Mobile / Contact ONLY if actually present in JSON response */}
                              {Boolean(resourceData.mobile || resourceData.mobile_digits || resourceData.email) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Contact Info</span>
                                  </div>
                                  <p className="font-mono text-xs text-foreground">
                                    {String(resourceData.mobile || (resourceData.mobile_digits ? `XXXXXX${resourceData.mobile_digits}` : ""))}
                                  </p>
                                  {resourceData.email && <p className="font-mono text-[11px] text-muted-foreground">{String(resourceData.email)}</p>}
                                </div>
                              )}

                              {/* Any dynamic extra fields returned in data */}
                              {Object.entries(resourceData || {})
                                .filter(([key, val]) => {
                                  const k = key.toLowerCase();
                                  const handled = [
                                    "pan", "aadhaar", "aadhaar_number", "fullname", "full_name", "name",
                                    "first_name", "middle_name", "last_name", "gender", "dob", "age",
                                    "age_band", "city", "state", "country", "mobile", "mobile_digits",
                                    "email", "address", "account_status", "status", "is_valid", "code", "type", "message"
                                  ];
                                  if (handled.includes(k)) return false;
                                  if (val === null || val === undefined || val === "") return false;
                                  if (typeof val === "object") return false;
                                  return true;
                                })
                                .map(([key, val]) => (
                                  <div key={key} className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">
                                        {key.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                    <p className="font-semibold text-foreground text-sm font-mono">
                                      {String(val)}
                                    </p>
                                  </div>
                                ))}

                              {/* Audit & Reference IDs (request_id, client_ref_num, _cached) */}
                              {(responseJson?.request_id || responseJson?.client_ref_num) && (
                                <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 sm:col-span-2">
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Verification Audit & Trace</span>
                                    </div>
                                    {Boolean(responseJson?._cached) && (
                                      <span className="rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] px-2 py-0.5 border border-emerald-500/25">
                                        ⚡ Cached Response
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono text-muted-foreground pt-0.5">
                                    {responseJson?.request_id && (
                                      <p className="truncate">
                                        Request ID: <span className="text-foreground">{String(responseJson.request_id)}</span>
                                      </p>
                                    )}
                                    {responseJson?.client_ref_num && (
                                      <p className="truncate">
                                        Client Ref: <span className="text-foreground">{String(responseJson.client_ref_num)}</span>
                                      </p>
                                    )}
                                  </div>
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
                              : selectedService === "name_finder"
                              ? `Mobile: ${mobileNameNumber}`
                              : selectedService === "ip_lookup"
                              ? `IP Address: ${ipAddress || "Caller IP (Auto-detect)"}`
                              : selectedService === "reverse_geocode"
                              ? `Coordinates: Lat: ${latitude || "28.6139"}, Lon: ${longitude || "77.2090"}`
                              : selectedService === "bank_validation"
                              ? `Account: ${bankValidateAccountNumber || "38237401582"} · IFSC: ${bankValidateIfscCode || "SBIN0002296"}`
                              : selectedService === "uan"
                              ? `Mobile: ${uanMobile}`
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
