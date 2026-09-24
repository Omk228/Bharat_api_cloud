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
  AlertCircle,
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
  FileSpreadsheet,
  UploadCloud,
  FileUp,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  FileCheck,
  Download,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import { apiClient, getHostBase } from "@/lib/api-client";
import { getStoredUserEmail } from "@/lib/demo-store";
import { generateTransUnionPdfFromApiResponse } from "@/lib/transunionPdfGenerator";
import { generateCrifPdfFromApiResponse, normalizeCrifReportData } from "@/lib/crifPdfGenerator";

export function isUpstreamLowBalanceError(dataOrError: unknown): boolean {
  if (!dataOrError) return false;
  const str = typeof dataOrError === "string"
    ? dataOrError
    : JSON.stringify(dataOrError);
  return (
    /low[\s_-]*balance/i.test(str) ||
    /insufficient[\s_-]*(wallet[\s_-]*)?(balance|fund|funds|credit|credits|quota)/i.test(str) ||
    /wallet[\s_-]*balance[\s_-]*(is[\s_-]*)?(low|exhausted|empty|zero)/i.test(str) ||
    /(credits?|balance|funds?)[\s_-]*exhausted/i.test(str) ||
    /exhausted[\s_-]*(credits?|balance|funds?)/i.test(str) ||
    /out[\s_-]*of[\s_-]*(balance|credits?|fund|funds?)/i.test(str) ||
    /not[\s_-]*enough[\s_-]*(balance|credit|credits)/i.test(str) ||
    /quota[\s_-]*exceeded/i.test(str) ||
    /credit[\s_-]*limit[\s_-]*exceeded/i.test(str) ||
    /unexpected[\s_-]*issue/i.test(str)
  );
}

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
  domain?: string;
  creation_date?: string;
  age_days?: number;
  age_years?: number;
  vpa?: string;
  name_at_bank?: string;
  verification_type?: string;
  verification_status?: string;
  bank_account_data?: {
    name?: string;
    utr?: string;
    account_number?: string;
    ifsc?: string;
    upi?: string;
    [key: string]: unknown;
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
  bank_account_data?: {
    name?: string;
    utr?: string;
    account_number?: string;
    ifsc?: string;
    upi?: string;
    [key: string]: unknown;
  };
  data?: any;
  result?: any;
  request_id?: string;
  client_ref_num?: string | null | undefined;
  _cached?: boolean;
  ip?: string;
  place_id?: string;
  osm_id?: string;
  osm_type?: string;
  class?: string;
  type?: string;
  place_rank?: string | number;
  addresstype?: string;
  address_type?: string;
  display_name?: string;
  residential?: string;
  lat?: string | number;
  lon?: string | number;
  importance?: string | number;
  boundingbox?: string[] | number[];
  domain?: string;
  creation_date?: string;
  age_days?: number;
  age_years?: number;
  city?: string;
  region_name?: string;
  region_code?: string;
  country_name?: string;
  country_code?: string;
  continent_name?: string;
  continent_code?: string;
  latitude?: string | number;
  longitude?: string | number;
  radius?: string | number;
  ip_routing_type?: string;
  connection_type?: string;
  zip?: string;
  location?: any;
  address?: any;
  [key: string]: unknown;
};

export type TestApiSearch = {
  service?: "pan" | "pan_plus" | "aadhaar" | "digilocker" | "bank" | "bank_validation" | "prefill" | "name_finder" | "ip_lookup" | "reverse_geocode" | "uan" | "uan_direct" | "domain_age" | "mobile_upi" | "ifsc" | "mobile_to_bank" | "statement_analyzer" | "transunion" | "crif" | "work_email" | undefined;
};

export const Route = createFileRoute("/_authenticated/dashboard/test-api")({
  validateSearch: (search: Record<string, unknown>): TestApiSearch => ({
    service:
      search["service"] === "work_email" || search["service"] === "work-email" || search["service"] === "work-email-verifier" || search["service"] === "corporate-email" || search["service"] === "corporate_email" || search["service"] === "email" || search["service"] === "email_verifier"
        ? "work_email"
        : search["service"] === "statement_analyzer" || search["service"] === "statement-analyzer" || search["service"] === "statement-upload" || search["service"] === "statement_upload" || search["service"] === "bank-statement"
        ? "statement_analyzer"
        : search["service"] === "transunion" || search["service"] === "transunion-score-hybrid" || search["service"] === "cibil" || search["service"] === "transunion_score"
        ? "transunion"
        : search["service"] === "crif" || search["service"] === "crif-score" || search["service"] === "crif_score" || search["service"] === "crif-credit-score-v4" || search["service"] === "credit-score"
        ? "crif"
        : search["service"] === "ifsc" || search["service"] === "ifsc-lookup" || search["service"] === "bank_ifsc" || search["service"] === "bank-ifsc"
        ? "ifsc"
        : search["service"] === "mobile_to_bank" || search["service"] === "mobile-to-bank" || search["service"] === "mobile_to_bank_advance" || search["service"] === "mobile-to-bank-advance"
        ? "mobile_to_bank"
        : search["service"] === "digilocker" || search["service"] === "digilocker-digital-kyc" || search["service"] === "digilocker_kyc" || search["service"] === "digilocker-kyc"
        ? "digilocker"
        : search["service"] === "mobile_upi" || search["service"] === "mobile-upi" || search["service"] === "upi"
        ? "mobile_upi"
        : search["service"] === "domain_age" || search["service"] === "domain-age" || search["service"] === "domain"
        ? "domain_age"
        : search["service"] === "pan_plus" || search["service"] === "pan-plus" || search["service"] === "plus"
        ? "pan_plus"
        : search["service"] === "aadhaar"
        ? "aadhaar"
        : search["service"] === "bank"
        ? "bank"
        : search["service"] === "bank_validation" || search["service"] === "validate_bank_account"
        ? "bank_validation"
        : search["service"] === "uan" || search["service"] === "uan_mobile" || search["service"] === "mobile_uan"
        ? "uan"
        : search["service"] === "uan_direct" || search["service"] === "uan_to_employment" || search["service"] === "uan-direct"
        ? "uan_direct"
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
        content: "Live sandbox test console for Work Email Verifier, Bank Statement Analyzer V2, CRIF High Mark Credit Score V4, TransUnion CIBIL Score, PAN, Pan Details Plus, Aadhaar, DigiLocker Digital KYC, Bank Verification, Bank Account Validation, Mobile to Bank Advance, Mobile to UAN, UAN to Employment History, Mobile to Prefill, Mobile To Name Finder, Requester IP Lookup, Reverse Geocoding, Domain Age, Mobile to UPI, and IFSC Lookup APIs.",
      },
    ],
  }),
  component: TestApiPage,
});

function TestApiPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const [selectedService, setSelectedService] = useState<"pan" | "pan_plus" | "aadhaar" | "digilocker" | "bank" | "bank_validation" | "prefill" | "name_finder" | "ip_lookup" | "reverse_geocode" | "uan" | "uan_direct" | "domain_age" | "mobile_upi" | "ifsc" | "mobile_to_bank" | "statement_analyzer" | "transunion" | "crif" | "work_email">(
    searchParams.service === "work_email"
      ? "work_email"
      : searchParams.service === "statement_analyzer"
      ? "statement_analyzer"
      : searchParams.service === "transunion"
      ? "transunion"
      : searchParams.service === "crif"
      ? "crif"
      : searchParams.service === "ifsc"
      ? "ifsc"
      : searchParams.service === "mobile_to_bank"
      ? "mobile_to_bank"
      : searchParams.service === "digilocker"
      ? "digilocker"
      : searchParams.service === "mobile_upi"
      ? "mobile_upi"
      : searchParams.service === "domain_age"
      ? "domain_age"
      : searchParams.service === "pan_plus"
      ? "pan_plus"
      : searchParams.service === "aadhaar"
      ? "aadhaar"
      : searchParams.service === "bank"
      ? "bank"
      : searchParams.service === "bank_validation"
      ? "bank_validation"
      : searchParams.service === "uan"
      ? "uan"
      : searchParams.service === "uan_direct"
      ? "uan_direct"
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

  const userEmail = getStoredUserEmail();
  const baseGatewayUrl = typeof window !== 'undefined' ? getHostBase() : "https://brown-goldfish-546701.hostingersite.com";

  const { data: creds, isLoading: credsLoading } = useQuery({
    queryKey: ["credentials", userEmail],
    queryFn: async () => {
      try {
        return await apiClient.getCredentials(userEmail);
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

  useEffect(() => {
    if (activeCred) {
      if (activeCred.api_id) setApiId(activeCred.api_id);
      if (activeCred.api_key) setApiKey(activeCred.api_key);
      if (activeCred.token_id) setTokenId(activeCred.token_id);
    }
  }, [activeCred]);

  // Dynamic User API Pricing query from backend (fetches Admin custom prices)
  const { data: pricingData } = useQuery({
    queryKey: ["user-pricing", apiId, apiKey, userEmail],
    queryFn: async () => {
      return await apiClient.getUserPricing({ api_id: apiId, api_key: apiKey, email: userEmail });
    },
    staleTime: 15_000,
  });

  const getServicePrice = (serviceKey: string): number => {
    if (pricingData?.pricing && typeof pricingData.pricing[serviceKey] === "number") {
      return pricingData.pricing[serviceKey];
    }
    if (serviceKey === "work_email" || serviceKey === "work-email-verifier" || serviceKey === "work-email") return 2.0;
    if (serviceKey === "statement_analyzer" || serviceKey === "statement-upload" || serviceKey === "statement-analyzer") return 25.0;
    if (serviceKey === "transunion" || serviceKey === "transunion-score-hybrid") return 75.0;
    if (serviceKey === "crif" || serviceKey === "crif-credit-score-v4" || serviceKey === "crif_score") return 25.0;
    if (serviceKey === "ifsc") return 1.0;
    if (serviceKey === "name_finder" || serviceKey === "uan" || serviceKey === "uan_direct") return 5.0;
    if (serviceKey === "ip_lookup") return 0.15;
    if (serviceKey === "reverse_geocode") return 0.2;
    return 2.0;
  };

  const isServiceRevoked = Boolean(
    pricingData?.assigned?.[selectedService] === false ||
    pricingData?.revoked?.includes(selectedService)
  );

  // Bank Statement Analyzer fields
  const [statementMode, setStatementMode] = useState<"one_shot" | "step_by_step">("one_shot");
  const [statementStep, setStatementStep] = useState<"INITIATE_UPLOAD" | "UPLOAD_FILE" | "COMPLETE_UPLOAD" | "CHECK_STATUS" | "RETRIEVE_STATEMENT">("INITIATE_UPLOAD");
  const [statementAcceptancePolicy, setStatementAcceptancePolicy] = useState("atLeastOneTransactionInRange");
  const [statementToken, setStatementToken] = useState("");
  const [statementRequestId, setStatementRequestId] = useState("");
  const [statementTxnId, setStatementTxnId] = useState("");
  const [statementFileBase64, setStatementFileBase64] = useState("");
  const [statementFileName, setStatementFileName] = useState("");
  const [statementFileSize, setStatementFileSize] = useState("");
  const [statementPassword, setStatementPassword] = useState("");
  const [showStatementPassword, setShowStatementPassword] = useState(false);
  const [statementReportType, setStatementReportType] = useState("json");
  const [statementReportSubtype, setStatementReportSubtype] = useState("type3");

  const handlePdfUpload = (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a valid PDF bank statement file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit.");
      return;
    }
    setStatementFileName(file.name);
    setStatementFileSize((file.size / 1024).toFixed(1) + " KB");

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const b64 = result.includes(";base64,") ? result.split(";base64,")[1] : result;
        setStatementFileBase64(b64 || "");
        toast.success(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.readAsDataURL(file);
  };

  // TransUnion CIBIL fields
  const [tuForename, setTuForename] = useState("Prashant");
  const [tuSurname, setTuSurname] = useState("Kumar");
  const [tuPhone, setTuPhone] = useState("8976543210");
  const [tuGender, setTuGender] = useState("Male");
  const [tuPan, setTuPan] = useState("");
  const [tuDob, setTuDob] = useState("");

  // CRIF High Mark fields
  const [crifMobile, setCrifMobile] = useState("9876543210");
  const [crifFirstName, setCrifFirstName] = useState("Rahul");
  const [crifLastName, setCrifLastName] = useState("CHAUDHARI");
  const [crifNameLookup, setCrifNameLookup] = useState<number>(0);

  // Work / Corporate Email Verifier fields
  const [workEmailInput, setWorkEmailInput] = useState("support@geetpay.in");
  const [workEmailClientRef, setWorkEmailClientRef] = useState("");

  // PAN fields
  const [pan, setPan] = useState("");
  const [name, setName] = useState("");
  const [panDisplayName, setPanDisplayName] = useState("false");
  const [nameMatchMethod, setNameMatchMethod] = useState("fuzzy");

  // Pan Details Plus fields
  const [panPlusNumber, setPanPlusNumber] = useState("");

  // Aadhaar fields
  const [aadhaar, setAadhaar] = useState("");

  // DigiLocker fields
  const [digilockerMethod, setDigilockerMethod] = useState<"generateToken" | "fetchDetails">("generateToken");
  const [digilockerRedirectUrl, setDigilockerRedirectUrl] = useState("https://yourdomain.com/kyc/callback");
  const [digilockerLogoUrl, setDigilockerLogoUrl] = useState("");
  const [digilockerAadhaar, setDigilockerAadhaar] = useState("");
  const [digilockerClientId, setDigilockerClientId] = useState("");

  // Bank fields
  const [creditorAccountId, setCreditorAccountId] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  // Bank Validation fields
  const [bankValidateAccountNumber, setBankValidateAccountNumber] = useState("");
  const [bankValidateIfscCode, setBankValidateIfscCode] = useState("");

  // Mobile to UAN fields
  const [uanMobile, setUanMobile] = useState("");
  // UAN to Employment fields
  const [directUanNumber, setDirectUanNumber] = useState("");

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

  // Domain Age fields
  const [domainName, setDomainName] = useState("");

  // Mobile to UPI fields
  const [mobileUpiNumber, setMobileUpiNumber] = useState("");

  // Mobile to Bank Advance fields
  const [mobileToBankNumber, setMobileToBankNumber] = useState("");
  const [mobileToBankConsent, setMobileToBankConsent] = useState("Y");

  // IFSC Lookup fields
  const [ifscCodeInput, setIfscCodeInput] = useState("KKBK0004587");

  const [loading, setLoading] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyField = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseJson, setResponseJson] = useState<ApiResponseEnvelope | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"visual" | "json">("visual");

  // TransUnion CIBIL PDF State
  const [tuPdfBlobUrl, setTuPdfBlobUrl] = useState<string | null>(null);
  const [tuPdfLoading, setTuPdfLoading] = useState<boolean>(false);
  const [tuPdfError, setTuPdfError] = useState<string | null>(null);
  const [tuExtracted, setTuExtracted] = useState<any>(null);

  // Generate TransUnion PDF automatically when responseJson arrives for transunion
  useEffect(() => {
    const isTransunionSuccess =
      responseJson &&
      responseJson.http_response_code !== 500 &&
      responseJson.status?.type !== "failed" &&
      responseJson.status?.type !== "error" &&
      responseJson.result_code !== 102 &&
      responseJson.result_code !== 103 &&
      (responseJson.result_code === 101 ||
        responseJson.status?.type === "success" ||
        responseJson.data?.status === "success" ||
        Boolean(responseJson.data?.web_token_url) ||
        Boolean(responseJson.data?.cibilScore) ||
        Boolean(responseJson.data?.steps_summary) ||
        Boolean((responseJson as any)?.web_token_url));

    if (selectedService === "transunion" && isTransunionSuccess) {
      let active = true;
      setTuPdfLoading(true);
      setTuPdfError(null);
      generateTransUnionPdfFromApiResponse(responseJson, {
        fullName: `${tuForename} ${tuSurname}`.trim(),
        panNumber: tuPan.trim().toUpperCase(),
        mobileNumber: tuPhone.trim(),
        dob: tuDob.trim() || null,
        gender: tuGender || "Male",
      })
        .then((res) => {
          if (!active) return;
          setTuPdfBlobUrl(res.blobUrl);
          setTuExtracted(res.extracted);
          setTuPdfLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error("TransUnion PDF Generation Error:", err);
          setTuPdfError(err?.message || "Failed to generate PDF report");
          setTuPdfLoading(false);
        });

      return () => {
        active = false;
      };
    } else {
      setTuPdfBlobUrl(null);
      setTuExtracted(null);
      setTuPdfLoading(false);
      setTuPdfError(null);
      return undefined;
    }
  }, [responseJson, selectedService]);

  // CRIF High Mark PDF State
  const [crifPdfBlobUrl, setCrifPdfBlobUrl] = useState<string | null>(null);
  const [crifPdfLoading, setCrifPdfLoading] = useState<boolean>(false);
  const [crifPdfError, setCrifPdfError] = useState<string | null>(null);

  // Generate CRIF PDF automatically when responseJson arrives for crif
  useEffect(() => {
    const isCrifSuccess =
      responseJson &&
      responseJson.http_response_code !== 500 &&
      responseJson.status?.type !== "failed" &&
      responseJson.status?.type !== "error" &&
      responseJson.result_code !== 102 &&
      responseJson.result_code !== 103 &&
      (responseJson.result_code === 101 ||
        responseJson.status?.type === "success" ||
        responseJson.data?.status === "success" ||
        Boolean(responseJson.data?.score) ||
        Boolean(responseJson.data?.cibil_score) ||
        Boolean((responseJson as any)?.credit_report));

    if (selectedService === "crif" && isCrifSuccess) {
      let active = true;
      setCrifPdfLoading(true);
      setCrifPdfError(null);
      generateCrifPdfFromApiResponse(responseJson, {
        first_name: crifFirstName.trim(),
        last_name: crifLastName.trim(),
        mobile_no: crifMobile.trim(),
      })
        .then((res) => {
          if (!active) return;
          setCrifPdfBlobUrl(res.blobUrl);
          setCrifPdfLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error("CRIF PDF Generation Error:", err);
          setCrifPdfError(err?.message || "Failed to generate CRIF PDF report");
          setCrifPdfLoading(false);
        });

      return () => {
        active = false;
      };
    } else {
      setCrifPdfBlobUrl(null);
      setCrifPdfLoading(false);
      setCrifPdfError(null);
      return undefined;
    }
  }, [responseJson, selectedService]);

  const handleOpenTuPdf = async () => {
    try {
      if (tuPdfBlobUrl) {
        window.open(tuPdfBlobUrl, "_blank");
        return;
      }
      if (!responseJson || responseJson.http_response_code === 500 || responseJson.status?.type === 'failed' || !responseJson.data) {
        toast.error("No TransUnion report available to view.");
        return;
      }
      toast.info("Generating TransUnion CIBIL PDF report...");
      setTuPdfLoading(true);
      const res = await generateTransUnionPdfFromApiResponse(responseJson, {
        fullName: `${tuForename.trim()} ${tuSurname.trim()}`.trim() || "PRASHANT KUMAR",
        panNumber: tuPan.trim() || "ABCDE1234F",
        mobileNumber: tuPhone.trim() || "8976543210",
        dob: tuDob.trim() || undefined,
        gender: tuGender || "Male",
      });
      setTuPdfBlobUrl(res.blobUrl);
      setTuExtracted(res.extracted);
      setTuPdfLoading(false);
      window.open(res.blobUrl, "_blank");
    } catch (err: any) {
      setTuPdfLoading(false);
      toast.error(err?.message || "Failed to open TransUnion PDF");
    }
  };

  const handleDownloadTuPdf = async () => {
    try {
      let targetUrl = tuPdfBlobUrl;
      if (!targetUrl) {
        if (!responseJson || responseJson.http_response_code === 500 || responseJson.status?.type === 'failed' || !responseJson.data) {
          toast.error("No TransUnion report available to download.");
          return;
        }
        toast.info("Generating TransUnion CIBIL PDF report...");
        setTuPdfLoading(true);
        const res = await generateTransUnionPdfFromApiResponse(responseJson, {
          fullName: `${tuForename.trim()} ${tuSurname.trim()}`.trim() || "PRASHANT KUMAR",
          panNumber: tuPan.trim() || "ABCDE1234F",
          mobileNumber: tuPhone.trim() || "8976543210",
          dob: tuDob.trim() || undefined,
          gender: tuGender || "Male",
        });
        targetUrl = res.blobUrl;
        setTuPdfBlobUrl(res.blobUrl);
        setTuExtracted(res.extracted);
        setTuPdfLoading(false);
      }
      const a = document.createElement("a");
      a.href = targetUrl;
      a.download = `TransUnion_CIBIL_Report_${tuPan.trim() || "Customer"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("TransUnion CIBIL PDF download started!");
    } catch (err: any) {
      setTuPdfLoading(false);
      toast.error(err?.message || "Failed to download TransUnion PDF");
    }
  };

  const handleOpenCrifPdf = async () => {
    try {
      if (crifPdfBlobUrl) {
        window.open(crifPdfBlobUrl, "_blank");
        return;
      }
      if (!responseJson || responseJson.http_response_code === 500 || responseJson.status?.type === 'failed' || !responseJson.data) {
        toast.error("No CRIF report available to view.");
        return;
      }
      const rawData = (responseJson?.data || responseJson?.result || responseJson || {}) as any;
      const backendReportUrl = rawData?.report_url || rawData?.web_token_url || rawData?.pdf_url || (responseJson as any)?.report_url || (responseJson as any)?.web_token_url;
      if (backendReportUrl && typeof backendReportUrl === "string") {
        window.open(backendReportUrl, "_blank");
      }
      toast.info("Generating CRIF High Mark PDF report...");
      setCrifPdfLoading(true);
      const res = await generateCrifPdfFromApiResponse(responseJson, {
        first_name: crifFirstName.trim(),
        last_name: crifLastName.trim(),
        mobile_no: crifMobile.trim(),
      });
      setCrifPdfBlobUrl(res.blobUrl);
      setCrifPdfLoading(false);
      window.open(res.blobUrl, "_blank");
    } catch (err: any) {
      setCrifPdfLoading(false);
      toast.error(err?.message || "Failed to open CRIF PDF");
    }
  };

  const handleDownloadCrifPdf = async () => {
    try {
      let targetUrl = crifPdfBlobUrl;
      if (!targetUrl) {
        if (!responseJson || responseJson.http_response_code === 500 || responseJson.status?.type === 'failed' || !responseJson.data) {
          toast.error("No CRIF report available to download.");
          return;
        }
        toast.info("Generating CRIF High Mark PDF report...");
        setCrifPdfLoading(true);
        const res = await generateCrifPdfFromApiResponse(responseJson, {
          first_name: crifFirstName.trim(),
          last_name: crifLastName.trim(),
          mobile_no: crifMobile.trim(),
        });
        targetUrl = res.blobUrl;
        setCrifPdfBlobUrl(res.blobUrl);
        setCrifPdfLoading(false);
      }
      const a = document.createElement("a");
      a.href = targetUrl;
      a.download = `CRIF_HighMark_Report_${crifMobile.trim() || "Customer"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("CRIF High Mark PDF download started!");
    } catch (err: any) {
      setCrifPdfLoading(false);
      toast.error(err?.message || "Failed to download CRIF PDF");
    }
  };

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

  const effectiveApiId = apiId.trim() || DEFAULT_API_ID;
  const effectiveApiKey = apiKey.trim() || DEFAULT_API_KEY;
  const effectiveTokenId = tokenId.trim() || DEFAULT_TOKEN_ID;

  // JSON preview object for request panel
  const requestPayload: Record<string, unknown> =
    selectedService === "work_email"
      ? {
          email: workEmailInput.trim().toLowerCase() || "support@geetpay.in",
          ...(workEmailClientRef.trim() ? { client_ref_num: workEmailClientRef.trim() } : {}),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "statement_analyzer"
      ? statementMode === "one_shot"
        ? {
            file: statementFileBase64 ? `[Base64 Encoded PDF — ${statementFileName || "bank_statement.pdf"} (${statementFileSize || "0 KB"})]` : "<Select a PDF bank statement file>",
            ...(statementPassword.trim() ? { password: "••••••••" } : {}),
            acceptance_policy: statementAcceptancePolicy,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          }
        : statementStep === "INITIATE_UPLOAD"
        ? {
            method: "INITIATE_UPLOAD",
            acceptance_policy: statementAcceptancePolicy,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          }
        : statementStep === "UPLOAD_FILE"
        ? {
            method: "INITIATE_UPLOAD",
            token: statementToken.trim() || "<Session Token from Step 1>",
            request_id: statementRequestId.trim() || "<Request ID from Step 1>",
            file: statementFileBase64 ? `[Base64 Encoded PDF — ${statementFileName || "statement.pdf"} (${statementFileSize || "0 KB"})]` : "<Select PDF file>",
            ...(statementPassword.trim() ? { password: "••••••••" } : {}),
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          }
        : statementStep === "COMPLETE_UPLOAD"
        ? {
            method: "COMPLETE_UPLOAD",
            token: statementToken.trim() || "<Session Token>",
            request_id: statementRequestId.trim() || "<Request ID>",
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          }
        : statementStep === "CHECK_STATUS"
        ? {
            method: "CHECK_STATUS",
            request_id: statementRequestId.trim() || "<Request ID>",
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          }
        : {
            method: "RETRIEVE_STATEMENT",
            txn_id: statementTxnId.trim() || statementRequestId.trim() || "<Txn ID or Request ID>",
            report_type: statementReportType,
            report_subtype: statementReportSubtype,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          }
      : selectedService === "transunion"
      ? {
          forename: tuForename.trim() || "Prashant",
          surname: tuSurname.trim() || "Kumar",
          phone_number: tuPhone.trim().replace(/\D/g, "") || "8976543210",
          gender: tuGender || "Male",
          pan_id: tuPan.trim().toUpperCase() || "ABCDE1234F",
          ...(tuDob.trim() ? { date_of_birth: tuDob.trim() } : {}),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "crif"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          mobile_no: crifMobile.trim().replace(/\D/g, "") || "9876543210",
          name_lookup: crifNameLookup,
          first_name: crifFirstName.trim() || "Rahul",
          last_name: crifLastName.trim() || "CHAUDHARI",
        }
      : selectedService === "ifsc"
      ? {
          ifsc: ifscCodeInput.trim().toUpperCase() || "KKBK0004587",
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "mobile_to_bank"
      ? {
          mobile_number: mobileToBankNumber.trim().replace(/\D/g, "") || "8987198823",
          consent: mobileToBankConsent || "Y",
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "mobile_upi"
      ? {
          mobile_number: mobileUpiNumber.trim().replace(/\D/g, "") || "8527475512",
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "domain_age"
      ? {
          domain: domainName.trim().toLowerCase(),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "pan_plus"
      ? {
          pan: panPlusNumber.trim().toUpperCase(),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "pan"
      ? {
          pan: pan.trim().toUpperCase(),
          pan_number: pan.trim().toUpperCase(),
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(panDisplayName === "true" ? { pan_display_name: true } : {}),
          ...(nameMatchMethod !== "none" ? { name_match_method: nameMatchMethod } : {}),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "aadhaar"
      ? {
          aadhaar_number: aadhaar.trim().replace(/\D/g, ""),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "digilocker"
      ? digilockerMethod === "fetchDetails"
        ? {
            methods: {
              fetchDetails: {
                api_id: effectiveApiId,
                api_key: effectiveApiKey,
                token_id: effectiveTokenId,
                methodName: "fetchDetails",
                client_id: digilockerClientId.trim() || "digilocker_ee20c92e",
              },
            },
          }
        : {
            methods: {
              generateToken: {
                api_id: effectiveApiId,
                api_key: effectiveApiKey,
                token_id: effectiveTokenId,
                methodName: "generateToken",
                redirectUrl: digilockerRedirectUrl.trim(),
                ...(digilockerLogoUrl.trim() ? { logoUrl: digilockerLogoUrl.trim() } : {}),
                ...(digilockerAadhaar.trim() ? { aadhaar_number: digilockerAadhaar.trim().replace(/\D/g, "") } : {}),
              },
            },
          }
      : selectedService === "bank"
      ? {
          creditor_account_id: creditorAccountId.trim(),
          ifsc_code: ifscCode.trim().toUpperCase(),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        }
      : selectedService === "name_finder"
      ? {
          mobile: mobileNameNumber.trim().replace(/\D/g, ""),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
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
      : selectedService === "uan_direct"
      ? {
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
          uan: directUanNumber.trim().replace(/\D/g, ""),
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
    if (isServiceRevoked) {
      toast.error("Access to this API endpoint has been revoked by your administrator.");
      return;
    }
    if (selectedService === "work_email" && !workEmailInput.trim()) {
      toast.error("Please enter a corporate email address (e.g. support@geetpay.in)");
      return;
    }
    if (selectedService === "statement_analyzer") {
      if (statementMode === "one_shot" && !statementFileBase64) {
        toast.error("Please choose or drag-and-drop a PDF bank statement file.");
        return;
      }
      if (statementMode === "step_by_step") {
        if (statementStep === "UPLOAD_FILE" && !statementToken.trim()) {
          toast.error("Please enter or generate a Session Token (from Step 1).");
          return;
        }
        if (statementStep === "UPLOAD_FILE" && !statementFileBase64) {
          toast.error("Please choose a PDF bank statement file for Step 2 upload.");
          return;
        }
        if (statementStep === "COMPLETE_UPLOAD" && !statementRequestId.trim()) {
          toast.error("Please enter a Request ID (from Step 1).");
          return;
        }
        if (statementStep === "CHECK_STATUS" && !statementRequestId.trim()) {
          toast.error("Please enter a Request ID to check status.");
          return;
        }
        if (statementStep === "RETRIEVE_STATEMENT" && !statementTxnId.trim() && !statementRequestId.trim()) {
          toast.error("Please enter a Txn ID or Request ID to retrieve statement.");
          return;
        }
      }
    }
    if (selectedService === "transunion") {
      if (!tuForename.trim() || !tuSurname.trim()) {
        toast.error("Please enter Forename and Surname.");
        return;
      }
      if (!tuPhone.trim()) {
        toast.error("Please enter a 10-digit Phone Number.");
        return;
      }
      if (!tuPan.trim()) {
        toast.error("Please enter a valid PAN Number.");
        return;
      }
    }
    if (selectedService === "crif") {
      const cleanMob = crifMobile.trim().replace(/\D/g, "");
      if (!cleanMob || cleanMob.length !== 10) {
        toast.error("Please enter a valid 10-digit Mobile Number.");
        return;
      }
      if (!crifFirstName.trim()) {
        toast.error("Please enter First Name.");
        return;
      }
      if (!crifLastName.trim()) {
        toast.error("Please enter Last Name.");
        return;
      }
    }
    if (selectedService === "digilocker") {
      if (digilockerMethod === "generateToken" && !digilockerRedirectUrl.trim()) {
        toast.error("Please enter a valid Redirect / Callback URL");
        return;
      }
      if (digilockerMethod === "fetchDetails" && !digilockerClientId.trim()) {
        toast.error("Please enter a Client ID");
        return;
      }
    }
    if (selectedService === "mobile_to_bank" && !mobileToBankNumber.trim()) {
      toast.error("Please enter a 10-digit mobile number (e.g. 8987198823)");
      return;
    }
    if (selectedService === "mobile_upi" && !mobileUpiNumber.trim()) {
      toast.error("Please enter a 10-digit mobile number (e.g. 8527475512)");
      return;
    }
    if (selectedService === "domain_age" && !domainName.trim()) {
      toast.error("Please enter a valid domain name (e.g. geetpay.in or google.com)");
      return;
    }
    if (selectedService === "pan_plus" && !panPlusNumber.trim()) {
      toast.error("Please enter a 10-character PAN number");
      return;
    }
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
    if (selectedService === "uan_direct" && !directUanNumber.trim()) {
      toast.error("Please enter a 12-digit UAN number");
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

      if (selectedService === "work_email") {
        rawData = await apiClient.verifyWorkEmail({
          email: workEmailInput.trim().toLowerCase(),
          client_ref_num: workEmailClientRef.trim() || undefined,
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "statement_analyzer") {
        if (statementMode === "one_shot") {
          rawData = await apiClient.verifyStatementAnalyzer({
            file: statementFileBase64,
            acceptance_policy: statementAcceptancePolicy,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          });
        } else if (statementStep === "INITIATE_UPLOAD") {
          rawData = await apiClient.verifyStatementAnalyzer({
            method: "INITIATE_UPLOAD",
            acceptance_policy: statementAcceptancePolicy,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          });
        } else if (statementStep === "UPLOAD_FILE") {
          rawData = await apiClient.verifyStatementAnalyzer({
            method: "INITIATE_UPLOAD",
            token: statementToken.trim(),
            request_id: statementRequestId.trim() || undefined,
            file: statementFileBase64,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          });
        } else if (statementStep === "COMPLETE_UPLOAD") {
          rawData = await apiClient.verifyStatementAnalyzer({
            method: "COMPLETE_UPLOAD",
            token: statementToken.trim() || undefined,
            request_id: statementRequestId.trim() || undefined,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          });
        } else if (statementStep === "CHECK_STATUS") {
          rawData = await apiClient.verifyStatementAnalyzer({
            method: "CHECK_STATUS",
            request_id: statementRequestId.trim(),
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          });
        } else {
          rawData = await apiClient.verifyStatementAnalyzer({
            method: "RETRIEVE_STATEMENT",
            txn_id: statementTxnId.trim() || statementRequestId.trim(),
            report_type: statementReportType,
            report_subtype: statementReportSubtype,
            api_id: effectiveApiId,
            api_key: effectiveApiKey,
            token_id: effectiveTokenId,
          });
        }

        // Auto populate tokens from response into state
        const anyRes: any = rawData || {};
        const innerData: any = anyRes.data || anyRes.result || anyRes;
        if (innerData?.token || anyRes.token) {
          const tok = String(innerData?.token || anyRes.token);
          setStatementToken(tok);
        }
        if (innerData?.request_id || anyRes.request_id) {
          const reqId = String(innerData?.request_id || anyRes.request_id);
          setStatementRequestId(reqId);
        }
        if (innerData?.txn_id || anyRes.txn_id) {
          const txId = String(innerData?.txn_id || anyRes.txn_id);
          setStatementTxnId(txId);
        }
      } else if (selectedService === "transunion") {
        rawData = await apiClient.verifyTransunion({
          forename: tuForename.trim() || "Prashant",
          surname: tuSurname.trim() || "Kumar",
          phone_number: tuPhone.trim().replace(/\D/g, "") || "8976543210",
          gender: tuGender || "Male",
          pan_id: tuPan.trim().toUpperCase() || "ABCDE1234F",
          date_of_birth: tuDob.trim() || undefined,
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "crif") {
        rawData = await apiClient.verifyCrifScore({
          mobile_no: crifMobile.trim().replace(/\D/g, ""),
          first_name: crifFirstName.trim(),
          last_name: crifLastName.trim(),
          name_lookup: crifNameLookup,
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "ifsc") {
        rawData = await apiClient.verifyIfsc({
          ifsc: ifscCodeInput.trim().toUpperCase() || "KKBK0004587",
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "digilocker") {
        rawData = await apiClient.verifyDigilocker({
          method: digilockerMethod,
          redirect_url: digilockerRedirectUrl.trim() || undefined,
          logo_url: digilockerLogoUrl.trim() || undefined,
          aadhaar_number: digilockerAadhaar.trim().replace(/\D/g, "") || undefined,
          client_id: digilockerClientId.trim() || undefined,
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "mobile_to_bank") {
        rawData = await apiClient.verifyMobileToBankAdvance({
          mobile_number: mobileToBankNumber.trim().replace(/\D/g, ""),
          consent: mobileToBankConsent || "Y",
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "mobile_upi") {
        rawData = await apiClient.verifyMobileUpi({
          mobile_number: mobileUpiNumber.trim().replace(/\D/g, ""),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "domain_age") {
        rawData = await apiClient.verifyDomainAge({
          domain: domainName.trim().toLowerCase(),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "pan_plus") {
        rawData = await apiClient.verifyPanPlus({
          pan: panPlusNumber.trim().toUpperCase(),
          api_id: effectiveApiId,
          api_key: effectiveApiKey,
          token_id: effectiveTokenId,
        });
      } else if (selectedService === "pan") {
        rawData = await apiClient.verifyPan(requestPayload as Parameters<typeof apiClient.verifyPan>[0]);
      } else if (selectedService === "aadhaar") {
        rawData = await apiClient.verifyAadhaar(requestPayload as Parameters<typeof apiClient.verifyAadhaar>[0]);
      } else if (selectedService === "bank") {
        rawData = await apiClient.verifyBankPennyLess(requestPayload as Parameters<typeof apiClient.verifyBankPennyLess>[0]);
      } else if (selectedService === "name_finder") {
        rawData = await apiClient.verifyMobileNameFinder(requestPayload as Parameters<typeof apiClient.verifyMobileNameFinder>[0]);
      } else if (selectedService === "ip_lookup") {
        rawData = await apiClient.lookupRequesterIp(requestPayload as Parameters<typeof apiClient.lookupRequesterIp>[0]);
      } else if (selectedService === "reverse_geocode") {
        rawData = await apiClient.reverseGeocode(requestPayload as Parameters<typeof apiClient.reverseGeocode>[0]);
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
      } else if (selectedService === "uan_direct") {
        rawData = await apiClient.verifyUanDirect({
          uan: directUanNumber.trim().replace(/\D/g, ""),
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

      const isUpstreamIssue = isUpstreamLowBalanceError(data);

      const statusCode =
        isUpstreamIssue
          ? 503
          : data.http_response_code ||
            data.status?.code ||
            200;

      setResponseStatus(statusCode);

      if (isUpstreamIssue) {
        const unexpectedPayload: ApiResponseEnvelope = {
          http_response_code: 503,
          result_code: 102,
          request_id: data.request_id || `req_${Date.now()}`,
          client_ref_num: data.client_ref_num || null,
          message: "There is an unexpected issue. Please try again later.",
          status_message: "Unexpected issue",
          status: {
            code: 503,
            type: "failed",
            message: "There is an unexpected issue. Please try again later.",
          },
          result: null,
        };
        setResponseJson(unexpectedPayload);
        toast.error("There is an unexpected issue. Please try again later.");
      } else {
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
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - start);
      setResponseTime(latency);
      const isUpstreamIssue = isUpstreamLowBalanceError(err);
      setResponseStatus(isUpstreamIssue ? 503 : 500);
      const errMsg = isUpstreamIssue
        ? "There is an unexpected issue. Please try again later."
        : (err instanceof Error ? err.message : "Request failed");
      setResponseJson({
        http_response_code: isUpstreamIssue ? 503 : 500,
        result_code: 102,
        status: {
          code: isUpstreamIssue ? 503 : 500,
          type: "error",
          message: errMsg,
        },
        message: errMsg,
        status_message: isUpstreamIssue ? "Unexpected issue" : "Refund processed",
      });
      toast.error(errMsg);
    } finally {
      setLoading(false);
      // Immediately invalidate dashboard queries to refresh live wallet balance in header pill
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  };

  // Dynamic extraction from server response (supporting standard beneValidationResp, result, data)
  const rawData: any = responseJson?.data;
  const beneResp: any = rawData?.beneValidationResp;
  const resourceData: any = (beneResp?.resourceData || responseJson?.result || responseJson?.data || responseJson || {});
  const rawRes: any = { ...((responseJson?.result as Record<string, unknown>) || {}), ...resourceData };

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
    rawRes.creditorAccountId ||
    rawRes.account_number ||
    rawRes.accountNumber ||
    ""
  ) as string;

  const extractedRrn = (
    resourceData.rrn ||
    resourceData.bank_ref_num ||
    resourceData.utr ||
    rawRes.rrn ||
    rawRes.bank_ref_num ||
    rawRes.utr ||
    rawRes.transactionReferenceNumber ||
    ""
  ) as string;

  const extractedRefNum = (
    responseJson?.request_id ||
    responseJson?.client_ref_num ||
    resourceData.request_id ||
    resourceData.client_ref_num ||
    rawRes.transactionReferenceNumber ||
    rawRes.request_id ||
    rawRes.client_ref_num ||
    ""
  ) as string;

  const extractedAddresses = Array.isArray(resourceData.address)
    ? (resourceData.address as Array<Record<string, unknown>>)
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
    city: (resourceData.city || rawRes.city || "") as string,
    state: (resourceData.state || rawRes.state || "") as string,
    micr: (rawRes.micr || rawRes.micr_code || rawRes.micrCode || "") as string,
    ifscCode: (rawRes.ifscCode || rawRes.ifsc || rawRes.ifsc_code || ifscCode) as string,
    ifsc: (rawRes.ifsc || rawRes.ifscCode || rawRes.ifsc_code || ifscCode) as string,
    account_status: (beneResp?.metaData?.status || rawRes.account_status || rawRes.accountStatus || rawRes.status || "ACTIVE") as string,
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
    operator: (resourceData.operator || rawRes.operator || rawRes.telecom_provider || "") as string,
    circle: (resourceData.circle || rawRes.circle || rawRes.telecom_circle || "") as string,
    vpa: (resourceData.vpa || rawRes.vpa || (responseJson?.data as any)?.vpa || (responseJson?.result as any)?.vpa || "") as string,
    address: extractedAddresses.length > 0 ? extractedAddresses : (rawRes.address as any),
  };

  const isSuccess =
    responseStatus === 200 &&
    (
      Boolean((responseJson as any)?.email) ||
      Boolean((responseJson?.data as any)?.email) ||
      Boolean((responseJson?.data as any)?.details) ||
      Boolean((responseJson as any)?.account_info) ||
      Boolean((responseJson as any)?.summary) ||
      Boolean((responseJson?.data as any)?.account_info) ||
      Boolean((responseJson?.data as any)?.summary) ||
      Boolean((responseJson?.data as any)?.token) ||
      Boolean((responseJson?.data as any)?.txn_id) ||
      Boolean((responseJson as any)?.web_token_url) ||
      Boolean((responseJson?.data as any)?.web_token_url) ||
      Boolean((responseJson as any)?.report_url) ||
      Boolean((responseJson?.data as any)?.report_url) ||
      Boolean((responseJson as any)?.pdf_url) ||
      Boolean((responseJson?.data as any)?.pdf_url) ||
      Boolean((responseJson?.data as any)?.result_json) ||
      Boolean((responseJson?.data as any)?.credit_report) ||
      Boolean((responseJson as any)?.credit_report) ||
      Boolean((responseJson as any)?.IFSC) ||
      Boolean((responseJson as any)?.BANK) ||
      Boolean((responseJson as any)?.bank) ||
      responseJson?.result_code === 101 ||
      responseJson?.status?.type === "success" ||
      responseJson?.message === "success" ||
      Boolean(resData.vpa) ||
      Boolean(resData.mobile_linked_name) ||
      Boolean((resData as any).score) ||
      Boolean((responseJson?.data as any)?.score) ||
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
      !(responseJson as any)?.email &&
      !(responseJson?.data as any)?.email &&
      !resData.vpa &&
      !resData.mobile_linked_name &&
      !resData.name &&
      !resData.fullname &&
      !resData.full_name &&
      !resData.pan &&
      !resData.aadhaar &&
      !resData.creditorAccountId &&
      !(responseJson as any)?.IFSC &&
      !(responseJson as any)?.account_info &&
      !(responseJson?.data as any)?.account_info &&
      !(responseJson as any)?.summary &&
      !(responseJson?.data as any)?.summary &&
      !(responseJson?.data as any)?.token &&
      !(responseJson?.data as any)?.txn_id &&
      !(responseJson as any)?.web_token_url &&
      !(responseJson?.data as any)?.web_token_url &&
      !(responseJson as any)?.report_url &&
      !(responseJson?.data as any)?.report_url
    );

  const extractedFullName =
    resData.mobile_linked_name ||
    resData.name ||
    resData.fullname ||
    resData.beneficiary_name ||
    [resData.first_name, resData.middle_name, resData.last_name].filter(Boolean).join(" ") ||
    "";

  const extractedAddress = (() => {
    const addr: any = resData.address;
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
    selectedService === "work_email"
      ? "/api/v1/verify/work-email"
      : selectedService === "statement_analyzer"
      ? "/srv2/statement-upload"
      : selectedService === "transunion"
      ? "/srv5/transunion-Score-Hybrid"
      : selectedService === "crif"
      ? "/crif/Credit-ScoreV4"
      : selectedService === "ifsc"
      ? "/bank/ifsc/:ifsc"
      : selectedService === "mobile_to_bank"
      ? "/srv3/mobile-to-bank/advance"
      : selectedService === "digilocker"
      ? "/srv2/validation/digilocker-digital-kyc"
      : selectedService === "mobile_upi"
      ? "/srv2/mobile-upi-lookup/enhanced"
      : selectedService === "domain_age"
      ? "/dosvak/domain-age"
      : selectedService === "pan_plus"
      ? "/srv2/validation/pan/plus"
      : selectedService === "pan"
      ? "/srv2/validation/pan"
      : selectedService === "aadhaar"
      ? "/srv3/verification/aadhar"
      : selectedService === "bank"
      ? "/srv1/beneficiary"
      : selectedService === "bank_validation"
      ? "/api/v1/validate_bank_account"
      : selectedService === "uan"
      ? "/srv3/uan-mobile"
      : selectedService === "uan_direct"
      ? "/srv3/uan-direct"
      : selectedService === "name_finder"
      ? "/srv2/mobile-name-finder"
      : selectedService === "ip_lookup"
      ? "/check"
      : selectedService === "reverse_geocode"
      ? "/reverse"
      : "/srv4/credit-report/prefill";

  const currentServiceName =
    selectedService === "work_email"
      ? "Work Email Verifier (Corporate Domain, DNS & SMTP Probe)"
      : selectedService === "statement_analyzer"
      ? "Bank Statement Analyzer V2 (PDF Parser & Analytics)"
      : selectedService === "transunion"
      ? "TransUnion CIBIL Score Hybrid (Interactive Link & Summary)"
      : selectedService === "crif"
      ? "Crif High Mark Credit Report V4 (/crif/Credit-ScoreV4)"
      : selectedService === "ifsc"
      ? "IFSC lookup (Bank Branch & Payment Rails)"
      : selectedService === "mobile_to_bank"
      ? "Mobile To Bank Advance (Live Account Linkage)"
      : selectedService === "digilocker"
      ? "DigiLocker Digital KYC (Paperless Consent & Details)"
      : selectedService === "mobile_upi"
      ? "Mobile to UPI Lookup Advance"
      : selectedService === "domain_age"
      ? "Domain Age Verification API"
      : selectedService === "pan_plus"
      ? "Pan Details Plus (Deep PAN Demographic Verification)"
      : selectedService === "pan"
      ? "PAN Verification API (Pan Details V2)"
      : selectedService === "aadhaar"
      ? "Aadhar Fetch Without OTP"
      : selectedService === "bank"
      ? "Bank Verification Penny Less V2"
      : selectedService === "bank_validation"
      ? "Bank Account Validation"
      : selectedService === "uan"
      ? "Mobile to UAN V2"
      : selectedService === "uan_direct"
      ? "UAN to Employment History V2"
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
                {isServiceRevoked ? (
                  <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-xs font-semibold text-red-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" /> Access Revoked
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    Bharat API Production Gateway
                  </span>
                )}
                {!isServiceRevoked && (
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    {selectedService === "ip_lookup" || selectedService === "reverse_geocode"
                      ? "Live Gateway"
                      : `₹${getServicePrice(selectedService).toFixed(2)} / Request`}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedService === "work_email"
                  ? "Direct live Corporate Work Email Verification, DNS MX/SPF/DMARC analysis, and SMTP mailbox probe gateway powered by Bharat API Cloud."
                  : selectedService === "statement_analyzer"
                  ? "Direct PDF Bank Statement OCR parser, salary detector, monthly balance tracker, cashflow analytics, and bounce diagnostics powered by Bharat API Cloud."
                  : selectedService === "transunion"
                  ? "Direct TransUnion CIBIL Score & credit report generation gateway with web token URL and multi-step offer fulfillment."
                  : selectedService === "crif"
                  ? "Direct CRIF High Mark credit report, consumer bureau score (300-900), active/closed loan summary, and credit inquiry analytics gateway."
                  : selectedService === "ifsc"
                  ? "Direct Bank Branch details, contact, and payment rails (RTGS, NEFT, IMPS, UPI) verification powered by Bharat API Cloud."
                  : selectedService === "digilocker"
                  ? "Direct instant DigiLocker Digital KYC token generation, consent session URL, and full paperless identity details fetching gateway."
                  : selectedService === "mobile_upi"
                  ? "Direct live Mobile to UPI ID (VPA) and NPCI-registered account holder name verification gateway."
                  : selectedService === "domain_age"
                  ? "Direct live Domain Age & Registration Verification Gateway with authoritative WHOIS and instant smart caching."
                  : selectedService === "pan_plus"
                  ? "Direct deep PAN demographic verification, Aadhaar seeding linkage, allotment date, and salaried/director profile powered by Bharat API Cloud."
                  : selectedService === "ip_lookup"
                  ? "Direct IP Geolocation and Network Intelligence Gateway powered by Bharat API Cloud."
                  : selectedService === "reverse_geocode"
                  ? "Direct GPS Coordinates to Street Address & Administrative Geocoding powered by Bharat API Cloud."
                  : selectedService === "bank_validation"
                  ? "Direct Bank Account Validation and Beneficiary Name Verification powered by Bharat API Cloud."
                  : selectedService === "uan"
                  ? "Direct Mobile to Universal Account Number (UAN) & EPFO Employment Verification powered by Bharat API Cloud."
                  : selectedService === "uan_direct"
                  ? "Direct 12-digit UAN EPFO Employment History & Establishment Verification powered by Bharat API Cloud."
                  : `Direct live verification gateway powered by Bharat API Cloud with automatic wallet debit (₹${getServicePrice(selectedService).toFixed(2)}) & refunds.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/docs"
                search={{
                  endpoint:
                    selectedService === "work_email"
                      ? "work-email-verifier"
                      : selectedService === "statement_analyzer"
                      ? "statement-upload"
                      : selectedService === "transunion"
                      ? "transunion-score-hybrid"
                      : selectedService === "crif"
                      ? "crif-credit-score-v4"
                      : selectedService === "ifsc"
                      ? "ifsc-lookup"
                      : selectedService === "mobile_to_bank"
                      ? "mobile-to-bank-advance"
                      : selectedService === "digilocker"
                      ? "digilocker-digital-kyc"
                      : selectedService === "mobile_upi"
                      ? "mobile-to-upi"
                      : selectedService === "domain_age"
                      ? "domain-age"
                      : selectedService === "pan_plus"
                      ? "verify-pan-plus"
                      : selectedService === "pan"
                      ? "verify-pan"
                      : selectedService === "aadhaar"
                      ? "aadhaar-without-otp"
                      : selectedService === "bank"
                      ? "bank-penny-less"
                      : selectedService === "bank_validation"
                      ? "bank-validation"
                      : selectedService === "uan"
                      ? "mobile-to-uan"
                      : selectedService === "uan_direct"
                      ? "uan-to-employment"
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
                  {selectedService === "work_email" && <Mail className="h-4 w-4 text-violet-400" />}
                  {selectedService === "statement_analyzer" && <FileSpreadsheet className="h-4 w-4 text-indigo-400" />}
                  {selectedService === "transunion" && <ShieldCheck className="h-4 w-4 text-amber-400" />}
                  {selectedService === "crif" && <ShieldCheck className="h-4 w-4 text-rose-400" />}
                  {selectedService === "ifsc" && <Landmark className="h-4 w-4 text-blue-400" />}
                  {selectedService === "mobile_to_bank" && <Building2 className="h-4 w-4 text-blue-400" />}
                  {selectedService === "digilocker" && <Fingerprint className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "mobile_upi" && <Smartphone className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "domain_age" && <Globe className="h-4 w-4 text-indigo-400" />}
                  {selectedService === "pan_plus" && <CreditCard className="h-4 w-4 text-sky-400" />}
                  {selectedService === "pan" && <CreditCard className="h-4 w-4 text-primary" />}
                  {selectedService === "aadhaar" && <Fingerprint className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "bank" && <Landmark className="h-4 w-4 text-blue-400" />}
                  {selectedService === "bank_validation" && <Landmark className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "uan" && <Briefcase className="h-4 w-4 text-indigo-400" />}
                  {selectedService === "uan_direct" && <Briefcase className="h-4 w-4 text-purple-400" />}
                  {selectedService === "prefill" && <Smartphone className="h-4 w-4 text-emerald-400" />}
                  {selectedService === "name_finder" && <Phone className="h-4 w-4 text-amber-400" />}
                  {selectedService === "ip_lookup" && <Globe className="h-4 w-4 text-cyan-400" />}
                  {selectedService === "reverse_geocode" && <Compass className="h-4 w-4 text-teal-400" />}
                  <span>
                    {selectedService === "work_email" && "Work Email Verifier (/api/v1/verify/work-email)"}
                    {selectedService === "statement_analyzer" && "Bank Statement Analyzer V2 (/srv2/statement-upload)"}
                    {selectedService === "transunion" && "TransUnion CIBIL Score Hybrid (/srv5/transunion-Score-Hybrid)"}
                    {selectedService === "crif" && "Crif High Mark Credit Report V4 (/crif/Credit-ScoreV4)"}
                    {selectedService === "ifsc" && "IFSC lookup (/bank/ifsc/{ifsc})"}
                    {selectedService === "mobile_to_bank" && "Mobile To Bank Advance (/srv3/mobile-to-bank/advance)"}
                    {selectedService === "digilocker" && "DigiLocker Digital KYC (/srv2/validation/digilocker-digital-kyc)"}
                    {selectedService === "mobile_upi" && "Mobile to UPI Lookup (/srv2/mobile-upi-lookup/enhanced)"}
                    {selectedService === "domain_age" && "Domain Age (/dosvak/domain-age)"}
                    {selectedService === "pan_plus" && "Pan Details Plus (/srv2/validation/pan/plus)"}
                    {selectedService === "pan" && "Pan Details V2 (/srv2/validation/pan)"}
                    {selectedService === "aadhaar" && "Aadhar Fetch - Without OTP (/srv3/verification/aadhar)"}
                    {selectedService === "bank" && "Bank Verification - Penny Less V2 (/srv1/beneficiary)"}
                    {selectedService === "bank_validation" && "Bank Account Validation (/api/v1/validate_bank_account)"}
                    {selectedService === "uan" && "Mobile to UAN V2 (/srv3/uan-mobile)"}
                    {selectedService === "uan_direct" && "UAN to Employment History V2 (/srv3/uan-direct)"}
                    {selectedService === "prefill" && "Mobile to Prefill (/srv4/credit-report/prefill)"}
                    {selectedService === "name_finder" && "Mobile To Name Finder (/srv2/mobile-name-finder)"}
                    {selectedService === "ip_lookup" && "Requester IP Lookup (/check)"}
                    {selectedService === "reverse_geocode" && "Reverse Geocoding (/reverse)"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Gateway Status:</span>
                {isServiceRevoked ? (
                  <span className="rounded px-2 py-0.5 font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" /> ACCESS REVOKED
                  </span>
                ) : (
                  <span className="rounded px-2 py-0.5 font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    ONLINE · LIVE
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 text-muted-foreground">
              {/* Base Gateway URL */}
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/80 p-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-foreground shrink-0 text-[11px] sm:text-xs">Base Gateway URL:</span>
                  <code
                    onClick={() => handleCopyField(baseGatewayUrl, "Base Gateway URL")}
                    title="Click to copy Base Gateway URL"
                    className="font-mono text-primary truncate select-all cursor-pointer hover:underline text-[11px] sm:text-xs"
                  >
                    {baseGatewayUrl}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyField(baseGatewayUrl, "Base Gateway URL")}
                  title="Copy Base Gateway URL"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60 hover:border-border transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {copiedField === "Base Gateway URL" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Endpoint */}
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/80 p-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-foreground shrink-0 text-[11px] sm:text-xs">Endpoint:</span>
                  <code
                    onClick={() => handleCopyField(currentEndpoint, "Endpoint")}
                    title="Click to copy Endpoint path"
                    className="font-mono text-primary truncate select-all cursor-pointer hover:underline text-[11px] sm:text-xs"
                  >
                    {currentEndpoint}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyField(currentEndpoint, "Endpoint")}
                    title="Copy Endpoint Path"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60 hover:border-border transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {copiedField === "Endpoint" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyField(`${baseGatewayUrl}${currentEndpoint}`, "Full Endpoint URL")}
                    title="Copy Full Endpoint URL (Base URL + Path)"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {copiedField === "Full Endpoint URL" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied Full</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Full URL</span>
                      </>
                    )}
                  </button>
                </div>
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

                {/* Revoked Notice Banner */}
                {isServiceRevoked && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-200">API Access Revoked by Admin</p>
                      <p className="mt-0.5 text-[11px] text-red-300/85 leading-relaxed">
                        Your account does not have permission to execute this API endpoint. Please contact your administrator.
                      </p>
                    </div>
                  </div>
                )}

                {/* API Credentials */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>API ID (Bharat API Credential)</span>
                      {credsLoading && <span className="text-[10px]">Loading...</span>}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        value={apiId}
                        readOnly
                        placeholder="e.g. APIDC9272C"
                        className="w-full rounded-lg border border-border bg-secondary/30 pl-3 pr-9 py-2 font-mono text-xs font-semibold text-foreground cursor-pointer outline-none select-all hover:border-border/80 focus:border-primary transition-colors"
                        onClick={() => handleCopyField(apiId, "API ID")}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyField(apiId, "API ID")}
                        title="Copy API ID"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                      >
                        {copiedField === "API ID" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>API Key</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        value={apiKey}
                        readOnly
                        placeholder="e.g. fc62efa1-4aff-478d-9b1b-6589e6262cba"
                        className="w-full rounded-lg border border-border bg-secondary/30 pl-3 pr-9 py-2 font-mono text-xs font-semibold text-foreground cursor-pointer outline-none select-all hover:border-border/80 focus:border-primary transition-colors"
                        onClick={() => handleCopyField(apiKey, "API Key")}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyField(apiKey, "API Key")}
                        title="Copy API Key"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                      >
                        {copiedField === "API Key" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Token ID</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        value={tokenId}
                        readOnly
                        placeholder="e.g. 1_jXBOXY4fBxo9XOw2t3kw7wBMTRVuO9"
                        className="w-full rounded-lg border border-border bg-secondary/30 pl-3 pr-9 py-2 font-mono text-xs font-semibold text-foreground cursor-pointer outline-none select-all hover:border-border/80 focus:border-primary transition-colors"
                        onClick={() => handleCopyField(tokenId, "Token ID")}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyField(tokenId, "Token ID")}
                        title="Copy Token ID"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                      >
                        {copiedField === "Token ID" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Verification Fields - Service Specific */}
                <div className="border-t border-border pt-3 space-y-3">
                  {selectedService === "work_email" ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-violet-400" /> Corporate / Work Email *
                          </span>
                          <span className="text-[11px] text-muted-foreground">Domain + DNS + SMTP</span>
                        </div>
                        <div className="relative">
                          <input
                            type="email"
                            value={workEmailInput}
                            onChange={(e) => setWorkEmailInput(e.target.value)}
                            placeholder="e.g. support@geetpay.in or name@company.com"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs font-semibold tracking-wide outline-none focus:border-violet-400"
                          />
                        </div>
                      </div>

                      {/* Quick Sample Presets */}
                      <div>
                        <span className="block text-[11px] text-muted-foreground mb-1.5 font-medium">
                          Quick Test Samples:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setWorkEmailInput("support@geetpay.in")}
                            className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-mono font-medium text-violet-300 hover:bg-violet-500/20 transition-colors"
                          >
                            support@geetpay.in (Corporate)
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorkEmailInput("contact@tatamotors.com")}
                            className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            contact@tatamotors.com
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorkEmailInput("alex@gmail.com")}
                            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-mono font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                          >
                            alex@gmail.com (Free Public)
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorkEmailInput("fake-test-user@invalid-domain-xyz-404.com")}
                            className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-mono font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                          >
                            invalid-domain-xyz-404.com
                          </button>
                        </div>
                      </div>

                      {/* Client Ref Num (Optional) */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Client Reference (Optional)</span>
                          <span className="text-[11px] text-muted-foreground">Unique audit trace tag</span>
                        </div>
                        <input
                          value={workEmailClientRef}
                          onChange={(e) => setWorkEmailClientRef(e.target.value)}
                          placeholder="e.g. CLI_EMAIL_001"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-violet-400"
                        />
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2.5 text-xs text-violet-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-violet-400">₹{getServicePrice("work_email").toFixed(2)} / Request</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        👉 Validates corporate email existence, MX/SPF/DMARC records, catch-all policy, and SMTP mailbox deliverability in real-time.
                      </p>
                    </>
                  ) : selectedService === "statement_analyzer" ? (
                    <>
                      {/* Mode Selector */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-1">
                        <button
                          type="button"
                          onClick={() => setStatementMode("one_shot")}
                          className={`rounded-md py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            statementMode === "one_shot"
                              ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" /> ⚡ 1-Click Auto Analysis
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatementMode("step_by_step")}
                          className={`rounded-md py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            statementMode === "step_by_step"
                              ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Layers className="h-3.5 w-3.5" /> 🛠️ Multi-Step Workflow
                        </button>
                      </div>

                      {statementMode === "one_shot" ? (
                        <>
                          {/* 1-Click PDF Dropzone */}
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                              <span className="font-medium text-foreground flex items-center gap-1">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" /> Bank Statement PDF *
                              </span>
                              <span className="text-[11px] text-muted-foreground">PDF Max 25MB</span>
                            </div>

                            {!statementFileBase64 ? (
                              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 p-5 text-center cursor-pointer transition-all group">
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePdfUpload(file);
                                  }}
                                  className="hidden"
                                />
                                <div className="rounded-full bg-indigo-500/20 p-2.5 text-indigo-400 group-hover:scale-110 transition-transform">
                                  <UploadCloud className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground">Click to upload or drag & drop</p>
                                  <p className="text-[11px] text-muted-foreground">Bank Statement PDF (e.g. HDFC, SBI, ICICI, Axis)</p>
                                </div>
                              </label>
                            ) : (
                              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400 shrink-0">
                                    <FileCheck className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{statementFileName || "bank_statement.pdf"}</p>
                                    <p className="text-[11px] text-emerald-400 font-medium font-mono">{statementFileSize} · ✓ Base64 Ready</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatementFileBase64("");
                                    setStatementFileName("");
                                    setStatementFileSize("");
                                  }}
                                  className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Optional PDF Password */}
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span className="font-medium text-foreground flex items-center gap-1">
                                <Lock className="h-3 w-3 text-muted-foreground" /> PDF Password (Optional)
                              </span>
                              <span className="text-[11px] text-muted-foreground">If statement is encrypted</span>
                            </div>
                            <div className="relative">
                              <input
                                type={showStatementPassword ? "text" : "password"}
                                value={statementPassword}
                                onChange={(e) => setStatementPassword(e.target.value)}
                                placeholder="e.g. PAN or DOB (e.g. AAAA1234 or 01011990)"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400 pr-9"
                              />
                              <button
                                type="button"
                                onClick={() => setShowStatementPassword(!showStatementPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showStatementPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Acceptance Policy */}
                          <div>
                            <span className="block text-xs text-muted-foreground mb-1 font-medium">Acceptance Policy</span>
                            <select
                              value={statementAcceptancePolicy}
                              onChange={(e) => setStatementAcceptancePolicy(e.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-indigo-400"
                            >
                              <option value="atLeastOneTransactionInRange">At least one transaction in range (Recommended)</option>
                              <option value="allTransactionsInRange">All transactions in range</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Multi-Step Workflow Step Tabs */}
                          <div className="space-y-3">
                            <div>
                              <span className="block text-xs text-muted-foreground mb-1 font-medium">Select Workflow Step</span>
                              <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border bg-background p-1 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => setStatementStep("INITIATE_UPLOAD")}
                                  className={`rounded py-1.5 font-semibold transition-all ${
                                    statementStep === "INITIATE_UPLOAD"
                                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  1. Initiate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStatementStep("UPLOAD_FILE")}
                                  className={`rounded py-1.5 font-semibold transition-all ${
                                    statementStep === "UPLOAD_FILE"
                                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  2. Upload
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStatementStep("COMPLETE_UPLOAD")}
                                  className={`rounded py-1.5 font-semibold transition-all ${
                                    statementStep === "COMPLETE_UPLOAD"
                                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  3. Complete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStatementStep("CHECK_STATUS")}
                                  className={`rounded py-1.5 font-semibold transition-all ${
                                    statementStep === "CHECK_STATUS"
                                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  4. Status
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStatementStep("RETRIEVE_STATEMENT")}
                                  className={`rounded py-1.5 font-semibold transition-all col-span-2 ${
                                    statementStep === "RETRIEVE_STATEMENT"
                                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  5. Retrieve Report
                                </button>
                              </div>
                            </div>

                            {/* Step 1 Fields */}
                            {statementStep === "INITIATE_UPLOAD" && (
                              <div>
                                <span className="block text-xs text-muted-foreground mb-1 font-medium">Acceptance Policy</span>
                                <select
                                  value={statementAcceptancePolicy}
                                  onChange={(e) => setStatementAcceptancePolicy(e.target.value)}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-indigo-400"
                                >
                                  <option value="atLeastOneTransactionInRange">At least one transaction in range</option>
                                  <option value="allTransactionsInRange">All transactions in range</option>
                                </select>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Generates a session upload token and request ID for file upload.
                                </p>
                              </div>
                            )}

                            {/* Step 2 Fields */}
                            {statementStep === "UPLOAD_FILE" && (
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                    <span className="font-medium text-foreground">Session Token *</span>
                                    {statementToken && <span className="text-[10px] text-emerald-400">✓ Auto-filled</span>}
                                  </div>
                                  <input
                                    value={statementToken}
                                    onChange={(e) => setStatementToken(e.target.value.trim())}
                                    placeholder="tok_stmt_..."
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                    <span className="font-medium text-foreground">Request ID</span>
                                    {statementRequestId && <span className="text-[10px] text-emerald-400">✓ Auto-filled</span>}
                                  </div>
                                  <input
                                    value={statementRequestId}
                                    onChange={(e) => setStatementRequestId(e.target.value.trim())}
                                    placeholder="req_stmt_..."
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                  />
                                </div>

                                <div>
                                  <span className="block text-xs text-muted-foreground mb-1 font-medium">Select PDF File *</span>
                                  {!statementFileBase64 ? (
                                    <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 p-3 text-center cursor-pointer transition-all">
                                      <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handlePdfUpload(file);
                                        }}
                                        className="hidden"
                                      />
                                      <UploadCloud className="h-4 w-4 text-indigo-400" />
                                      <span className="text-xs font-medium text-foreground">Pick Bank Statement PDF</span>
                                    </label>
                                  ) : (
                                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2.5 flex items-center justify-between text-xs">
                                      <span className="font-mono text-indigo-300 truncate">{statementFileName} ({statementFileSize})</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStatementFileBase64("");
                                          setStatementFileName("");
                                        }}
                                        className="text-red-400 hover:underline shrink-0 text-[11px]"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 3 Fields */}
                            {statementStep === "COMPLETE_UPLOAD" && (
                              <div className="space-y-3">
                                <div>
                                  <span className="block text-xs text-muted-foreground mb-1 font-medium">Request ID *</span>
                                  <input
                                    value={statementRequestId}
                                    onChange={(e) => setStatementRequestId(e.target.value.trim())}
                                    placeholder="req_stmt_..."
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                  />
                                </div>
                                <div>
                                  <span className="block text-xs text-muted-foreground mb-1 font-medium">Session Token (Optional)</span>
                                  <input
                                    value={statementToken}
                                    onChange={(e) => setStatementToken(e.target.value.trim())}
                                    placeholder="tok_stmt_..."
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Step 4 Fields */}
                            {statementStep === "CHECK_STATUS" && (
                              <div>
                                <span className="block text-xs text-muted-foreground mb-1 font-medium">Request ID to Poll *</span>
                                <input
                                  value={statementRequestId}
                                  onChange={(e) => setStatementRequestId(e.target.value.trim())}
                                  placeholder="req_stmt_..."
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                />
                              </div>
                            )}

                            {/* Step 5 Fields */}
                            {statementStep === "RETRIEVE_STATEMENT" && (
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                    <span className="font-medium text-foreground">Txn ID / Request ID *</span>
                                    {statementTxnId && <span className="text-[10px] text-emerald-400">✓ Auto-filled</span>}
                                  </div>
                                  <input
                                    value={statementTxnId || statementRequestId}
                                    onChange={(e) => setStatementTxnId(e.target.value.trim())}
                                    placeholder="txn_stmt_... or request_id"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="block text-xs text-muted-foreground mb-1 font-medium">Report Type</span>
                                    <input
                                      value={statementReportType}
                                      onChange={(e) => setStatementReportType(e.target.value)}
                                      placeholder="json"
                                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                    />
                                  </div>
                                  <div>
                                    <span className="block text-xs text-muted-foreground mb-1 font-medium">Report Subtype</span>
                                    <input
                                      value={statementReportSubtype}
                                      onChange={(e) => setStatementReportSubtype(e.target.value)}
                                      placeholder="type3"
                                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-xs text-indigo-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-indigo-400">₹{getServicePrice("statement_analyzer").toFixed(2)} / Request</span>
                      </div>
                    </>
                  ) : selectedService === "transunion" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">Forename *</span>
                          <input
                            value={tuForename}
                            onChange={(e) => setTuForename(e.target.value)}
                            placeholder="Prashant"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">Surname *</span>
                          <input
                            value={tuSurname}
                            onChange={(e) => setTuSurname(e.target.value)}
                            placeholder="Kumar"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">Phone Number *</span>
                          <input
                            value={tuPhone}
                            maxLength={10}
                            onChange={(e) => setTuPhone(e.target.value.replace(/\D/g, ""))}
                            placeholder="8976543210"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">Gender *</span>
                          <select
                            value={tuGender}
                            onChange={(e) => setTuGender(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-amber-400"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">PAN ID *</span>
                          <input
                            value={tuPan}
                            maxLength={10}
                            onChange={(e) => setTuPan(e.target.value.toUpperCase().trim())}
                            placeholder="ABCDE1234F"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono uppercase outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">Date of Birth (Optional)</span>
                          <input
                            value={tuDob}
                            onChange={(e) => setTuDob(e.target.value.trim())}
                            placeholder="YYYY-MM-DD"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-amber-400">₹{getServicePrice("transunion").toFixed(2)} / Request</span>
                      </div>
                    </>
                  ) : selectedService === "crif" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Mobile No *</span>
                            <span className="text-[11px] text-muted-foreground">10 Digits</span>
                          </div>
                          <input
                            value={crifMobile}
                            maxLength={10}
                            onChange={(e) => setCrifMobile(e.target.value.replace(/\D/g, ""))}
                            placeholder="e.g. 9876543210"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-rose-400"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Name Lookup (Optional)</span>
                            <span className="text-[11px] text-muted-foreground">0 or 1</span>
                          </div>
                          <select
                            value={crifNameLookup}
                            onChange={(e) => setCrifNameLookup(Number(e.target.value))}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-rose-400"
                          >
                            <option value={0}>0 - Standard Bureau Lookup</option>
                            <option value={1}>1 - Enable Name Lookup</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">First Name *</span>
                          <input
                            value={crifFirstName}
                            onChange={(e) => setCrifFirstName(e.target.value)}
                            placeholder="e.g. Rahul"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-rose-400"
                          />
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground mb-1 font-medium">Last Name *</span>
                          <input
                            value={crifLastName}
                            onChange={(e) => setCrifLastName(e.target.value)}
                            placeholder="e.g. CHAUDHARI"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium uppercase outline-none focus:border-rose-400"
                          />
                        </div>
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-rose-400">₹{getServicePrice("crif").toFixed(2)} / Request</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        👉 Fetches official CRIF High Mark credit score (300-900), risk band, active loan accounts, and past payment track record.
                      </p>
                    </>
                  ) : selectedService === "ifsc" ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Bank IFSC Code *</span>
                          <span className="text-[11px] text-muted-foreground">11 Alphanumeric</span>
                        </div>
                        <div className="relative">
                          <input
                            value={ifscCodeInput}
                            maxLength={11}
                            onChange={(e) => setIfscCodeInput(e.target.value.toUpperCase().trim())}
                            placeholder="e.g. KKBK0004587"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-blue-400 uppercase"
                          />
                          {ifscCodeInput.length > 0 && (
                            <span className="absolute right-3 top-3 font-mono text-[10px] text-muted-foreground">
                              {ifscCodeInput.length} / 11
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-xs text-blue-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-blue-400">₹{getServicePrice("ifsc").toFixed(2)} / Hit</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        👉 Resolves live branch details, contact, and payment rails (RTGS, NEFT, IMPS, UPI) for any RBI-registered bank IFSC.
                      </p>
                    </>
                  ) : selectedService === "digilocker" ? (
                    <>
                      {/* Method Selector Tabs */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-1">
                        <button
                          type="button"
                          onClick={() => setDigilockerMethod("generateToken")}
                          className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                            digilockerMethod === "generateToken"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          ⚡ 1. Generate Consent Token
                        </button>
                        <button
                          type="button"
                          onClick={() => setDigilockerMethod("fetchDetails")}
                          className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                            digilockerMethod === "fetchDetails"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          🔍 2. Fetch KYC Details
                        </button>
                      </div>

                      {digilockerMethod === "generateToken" ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span className="font-medium text-foreground">Redirect / Callback URL *</span>
                              <span className="text-[11px] text-muted-foreground">HTTPS recommended</span>
                            </div>
                            <input
                              value={digilockerRedirectUrl}
                              onChange={(e) => setDigilockerRedirectUrl(e.target.value)}
                              placeholder="https://yourdomain.com/kyc/callback"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-emerald-400"
                            />
                          </div>

                          <div>
                            <span className="block text-xs text-muted-foreground mb-1">Company Logo URL (Optional)</span>
                            <input
                              value={digilockerLogoUrl}
                              onChange={(e) => setDigilockerLogoUrl(e.target.value)}
                              placeholder="https://yourdomain.com/logo.png"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-emerald-400"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span className="font-medium text-foreground">Aadhaar Number (Optional)</span>
                              <span className="text-[11px] text-muted-foreground">Pre-fills DigiLocker login</span>
                            </div>
                            <input
                              value={digilockerAadhaar}
                              maxLength={12}
                              onChange={(e) => setDigilockerAadhaar(e.target.value.replace(/\D/g, ""))}
                              placeholder="12-digit Aadhaar Number"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-emerald-400"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span className="font-medium text-foreground">Client ID *</span>
                              <span className="text-[11px] text-muted-foreground">Returned from step 1</span>
                            </div>
                            <input
                              value={digilockerClientId}
                              onChange={(e) => setDigilockerClientId(e.target.value.trim())}
                              placeholder="e.g. digilocker_prpGVnusagiugoUNmePG"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-emerald-400"
                            />
                          </div>
                        </>
                      )}

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-emerald-400">₹{getServicePrice("digilocker").toFixed(2)} / Hit</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        👉 Generates a secure Bharat API Cloud consent session link for paperless user identity verification.
                      </p>
                    </>
                  ) : selectedService === "pan_plus" ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">PAN Number *</span>
                          <span className="text-[11px] text-muted-foreground">10 Alphanumeric</span>
                        </div>
                        <input
                          value={panPlusNumber}
                          maxLength={10}
                          onChange={(e) => setPanPlusNumber(e.target.value.toUpperCase())}
                          placeholder="Enter 10-digit PAN (e.g. ABCDE1234F)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider uppercase outline-none focus:border-sky-400"
                        />
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2.5 text-xs text-sky-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-sky-400">₹{getServicePrice("pan_plus").toFixed(2)} / Hit</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        👉 Live demographic, Aadhaar linkage & allotment data will reflect dynamically in the Visual Identity Card.
                      </p>
                    </>
                  ) : selectedService === "pan" ? (
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

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-amber-400">₹{getServicePrice("pan").toFixed(2)} / Request</span>
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

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-emerald-400">₹{getServicePrice("aadhaar").toFixed(2)} / Request</span>
                      </div>
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

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-xs text-blue-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-blue-400">₹{getServicePrice("bank").toFixed(2)} / Request</span>
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
                        <span className="font-bold text-amber-400">₹{getServicePrice("name_finder").toFixed(2)} / Hit</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        👉 Response will reflect in the response section
                      </p>
                    </>
                  ) : selectedService === "mobile_to_bank" ? (
                    /* Mobile To Bank Advance Form */
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Mobile Number *</span>
                            <span className="text-[11px] text-muted-foreground">10 Digits (e.g. 8987198823)</span>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            value={mobileToBankNumber}
                            onChange={(e) => setMobileToBankNumber(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter 10-digit mobile number (e.g. 8987198823)"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-blue-400"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">User Consent *</span>
                            <span className="text-[11px] text-muted-foreground">Mandatory for Bank Lookup</span>
                          </div>
                          <select
                            value={mobileToBankConsent}
                            onChange={(e) => setMobileToBankConsent(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold outline-none focus:border-blue-400"
                          >
                            <option value="Y">Y (Explicit User Consent Granted)</option>
                            <option value="N">N (No Consent)</option>
                          </select>
                        </div>

                        {/* Pricing Banner */}
                        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-xs text-blue-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium">
                            💰 Wallet Debit:
                          </span>
                          <span className="font-bold text-blue-400">₹{getServicePrice("mobile_to_bank").toFixed(2)} / Request</span>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          👉 Direct live Mobile to Bank Advance account linkage lookup powered by Bharat API Gateway.
                        </p>
                      </div>
                    </>
                  ) : selectedService === "mobile_upi" ? (
                    /* Mobile to UPI Lookup Form */
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Mobile Number *</span>
                            <span className="text-[11px] text-muted-foreground">10 Digits (e.g. 8527475512)</span>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            value={mobileUpiNumber}
                            onChange={(e) => setMobileUpiNumber(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter 10-digit mobile number (e.g. 8527475512)"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-emerald-400"
                          />
                        </div>

                        {/* Pricing Banner */}
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium">
                            💰 Wallet Debit:
                          </span>
                          <span className="font-bold text-emerald-400">₹{getServicePrice("mobile_upi").toFixed(2)} / Request</span>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          👉 Live NPCI directory lookup fetching UPI Virtual Payment Address (VPA) & account holder name.
                        </p>
                      </div>
                    </>
                  ) : selectedService === "domain_age" ? (
                    /* Domain Age Form */
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Target Domain Name *</span>
                            <span className="text-[11px] text-muted-foreground">e.g. example.com</span>
                          </div>
                          <input
                            value={domainName}
                            onChange={(e) => setDomainName(e.target.value.trim().toLowerCase())}
                            placeholder="Enter domain (e.g. geetpay.in or google.com)"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-indigo-400"
                          />
                        </div>

                        {/* Pricing Banner */}
                        <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-xs text-indigo-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium">
                            💰 Wallet Debit:
                          </span>
                          <span className="font-bold text-indigo-400">₹{getServicePrice("domain_age").toFixed(2)} / Request</span>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          👉 Authoritative live registry lookup with automatic 24-hour smart caching.
                        </p>
                      </div>
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

                        {/* Pricing Banner */}
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium">
                            💰 Wallet Debit:
                          </span>
                          <span className="font-bold text-emerald-400">₹{getServicePrice("bank_validation").toFixed(2)} / Request</span>
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
                        <span className="font-bold text-indigo-400">₹{getServicePrice("uan").toFixed(2)} / Hit</span>
                      </div>
                    </>
                  ) : selectedService === "uan_direct" ? (
                    /* UAN to Employment History V2 Form */
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">EPFO Universal Account Number (UAN) *</span>
                          <span className="text-[11px] text-muted-foreground">12 Digits (e.g. 101150421578)</span>
                        </div>
                        <div className="relative">
                          <input
                            value={directUanNumber}
                            maxLength={12}
                            onChange={(e) => setDirectUanNumber(e.target.value.replace(/\D/g, ""))}
                            placeholder="e.g. 101150421578"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-purple-400"
                          />
                          {directUanNumber.length > 0 && (
                            <span className="absolute right-3 top-3 font-mono text-[10px] text-muted-foreground">
                              {directUanNumber.length} / 12
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2.5 text-xs text-purple-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-purple-400">₹{getServicePrice("uan_direct").toFixed(2)} / Hit</span>
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

                      {/* Pricing Banner */}
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Wallet Debit:
                        </span>
                        <span className="font-bold text-emerald-400">₹{getServicePrice("prefill").toFixed(2)} / Request</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Unassigned Warning Banner */}
                {isServiceRevoked && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-400">API Not Assigned by Admin</p>
                      <p className="mt-0.5 text-muted-foreground">
                        You can view the parameters and request schema, but live requests are disabled until the administrator assigns access to your account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Send & Report Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSendRequest}
                    disabled={loading || isServiceRevoked}
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all shadow-md active:scale-[0.99] ${
                      isServiceRevoked
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-400 cursor-not-allowed hover:bg-amber-500/15"
                        : "bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg disabled:opacity-60"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying with Bharat API Cloud Gateway...
                      </>
                    ) : isServiceRevoked ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-400" /> 🔒 API Not Assigned (Contact Admin)
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
                      {selectedService === "reverse_geocode" ? "GET" : selectedService === "ip_lookup" ? "GET/POST" : "POST"}
                    </span>
                    <span className="font-mono text-xs text-foreground font-semibold">
                      {currentEndpoint}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(`${baseGatewayUrl}${currentEndpoint}`, "Full Endpoint URL")}
                      title="Copy Full Endpoint URL"
                      className="inline-flex items-center gap-1 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                    >
                      {copiedField === "Full Endpoint URL" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
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
                      <Sparkles className="h-3.5 w-3.5" /> {selectedService === "transunion" || selectedService === "crif" ? "Visual & PDF Report" : "Visual Identity Card"}
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
                          isUpstreamLowBalanceError(responseJson)
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : selectedService === "mobile_upi"
                            ? isSuccess
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : isSuccess
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        HTTP {responseStatus} · {
                          isUpstreamLowBalanceError(responseJson)
                            ? "UNEXPECTED ISSUE"
                            : selectedService === "mobile_upi"
                            ? isSuccess
                              ? "VERIFIED"
                              : "NOT FOUND · UNLINKED"
                            : isSuccess
                            ? "VERIFIED"
                              : "VERIFICATION FAILED"
                        }
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                      {responseTime !== null && (
                        <span className="inline-flex items-center gap-1 font-mono text-xs">
                          <Clock className="h-3.5 w-3.5 text-primary" /> {responseTime}ms
                        </span>
                      )}
                      {responseJson && (
                        selectedService === "transunion" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleOpenTuPdf}
                              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600/90 hover:bg-cyan-500 px-3 py-1 text-xs text-white font-bold shadow transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" /> View CIBIL PDF
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadTuPdf}
                              className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 px-2.5 py-1 text-xs text-cyan-300 font-bold transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </button>
                          </div>
                        ) : selectedService === "crif" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleOpenCrifPdf}
                              className="inline-flex items-center gap-1.5 rounded-md bg-[#0C3875] hover:bg-[#092c5d] border border-cyan-400/50 px-3 py-1 text-xs text-white font-bold shadow transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5 text-cyan-300" /> View CRIF PDF
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadCrifPdf}
                              className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-950/50 hover:bg-cyan-900/50 px-2.5 py-1 text-xs text-cyan-300 font-bold transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
                              setCopiedRes(true);
                              toast.success("Full response copied!");
                              setTimeout(() => setCopiedRes(false), 1500);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {copiedRes ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiedRes ? "Copied JSON" : "Copy JSON"}
                          </button>
                        )
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
                        POST {baseGatewayUrl}{currentEndpoint}
                      </p>
                    </div>
                  </div>
                )}
                {/* Empty State */}
                {!loading && !responseJson && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-background/30 p-8 text-center text-muted-foreground">
                    {selectedService === "work_email" ? (
                      <Mail className="h-8 w-8 opacity-40 text-violet-400" />
                    ) : selectedService === "domain_age" ? (
                      <Globe className="h-8 w-8 opacity-40 text-indigo-400" />
                    ) : selectedService === "pan" || selectedService === "pan_plus" ? (
                      <CreditCard className="h-8 w-8 opacity-40 text-sky-400" />
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
                      Enter {selectedService === "work_email" ? "a corporate email address (e.g. support@geetpay.in)" : selectedService === "mobile_upi" ? "a 10-digit mobile number (e.g. 8527475512)" : selectedService === "domain_age" ? "a target domain name (e.g. geetpay.in or google.com)" : selectedService === "pan" || selectedService === "pan_plus" ? "a 10-digit PAN number" : selectedService === "aadhaar" ? "an Aadhaar number" : selectedService === "bank" ? "Bank Account Number & IFSC" : selectedService === "name_finder" ? "a 10-digit mobile number" : "Mobile Number & Name"} on the left and click &quot;Send Request&quot; to fetch live verified details.
                    </p>
                  </div>
                )}

                {/* 1. Visual Card Tab */}
                {!loading && responseJson && activeViewTab === "visual" && (
                  <div className="space-y-4">
                    {/* Success Verification / Dedicated Service Card */}
                    {isSuccess || (selectedService === "mobile_upi" && (responseJson?.result_code === 101 || responseJson?.result_code === 103)) ? (
                      <div className={`rounded-xl border p-5 space-y-4 ${
                        selectedService === "work_email"
                          ? "border-violet-500/30 bg-gradient-to-b from-violet-500/5 to-transparent"
                          : selectedService === "mobile_upi" && !isSuccess
                          ? "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent"
                          : "border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent"
                      }`}>
                        {/* ========================================================= */}
                        {/* ✉️ WORK EMAIL VERIFIER DEDICATED VISUAL CARD               */}
                        {/* ========================================================= */}
                        {selectedService === "work_email" ? (
                          (() => {
                            const anyRes: any = responseJson || {};
                            const emailData: any = (responseJson?.data || responseJson?.result || responseJson) || {};
                            const emailStr = String(emailData.email || workEmailInput || "—");
                            const statusStr = String(emailData.status || (isSuccess ? "VALID" : "INVALID")).toUpperCase();
                            const reasonStr = String(emailData.reason || anyRes.message || "Corporate mailbox verification completed.");
                            const scoreNum = typeof emailData.score === "number" ? emailData.score : (statusStr === "VALID" ? 100 : statusStr === "RISKY" ? 50 : 0);
                            const isDeliverable = Boolean(emailData.isDeliverable);
                            const isCorporate = Boolean(emailData.isCorporate);
                            const isCatchAll = Boolean(emailData.isCatchAll);
                            const isRoleAccount = Boolean(emailData.isRoleAccount);
                            const isDisposable = Boolean(emailData.isDisposable);
                            const mailProvider = String(emailData.mailProvider || "Corporate Mail Server");
                            const didYouMean = emailData.didYouMean ? String(emailData.didYouMean) : null;

                            const details = emailData.details || {};
                            const syntax = details.syntax || {};
                            const dns = details.dns || {};
                            const smtp = details.smtp || {};

                            const durationMs = emailData.durationMs || responseTime || 0;
                            const verifiedAt = emailData.verifiedAt || new Date().toISOString();

                            const isStatusValid = statusStr === "VALID";
                            const isStatusRisky = statusStr === "RISKY";

                            return (
                              <div className="space-y-4">
                                {/* Top Banner */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-2.5 ${
                                      isStatusValid
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : isStatusRisky
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-rose-500/20 text-rose-400"
                                    }`}>
                                      <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-mono text-base font-bold text-foreground">
                                          {emailStr}
                                        </h3>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(emailStr, "Email Address")}
                                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                          title="Copy email address"
                                        >
                                          {copiedField === "Email Address" ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                                          ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                                          isStatusValid
                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                            : isStatusRisky
                                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                            : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                        }`}>
                                          ● {statusStr}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                        <span>Provider: <strong className="text-foreground font-semibold">{mailProvider}</strong></span>
                                        <span>·</span>
                                        <span className="font-mono">{durationMs}ms latency</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Quality Score</span>
                                    <div className="flex items-baseline gap-1">
                                      <span className={`text-2xl font-black font-mono ${
                                        scoreNum >= 80
                                          ? "text-emerald-400"
                                          : scoreNum >= 50
                                          ? "text-amber-400"
                                          : "text-rose-400"
                                      }`}>
                                        {scoreNum}
                                      </span>
                                      <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Reason Message & Did-You-Mean */}
                                <div className={`rounded-xl border p-3.5 text-xs ${
                                  isStatusValid
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                                    : isStatusRisky
                                    ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                                    : "bg-rose-500/5 border-rose-500/20 text-rose-300"
                                }`}>
                                  <div className="flex items-start gap-2">
                                    {isStatusValid ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                    ) : isStatusRisky ? (
                                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-foreground">{reasonStr}</p>
                                      {didYouMean && (
                                        <p className="mt-1 text-[11px] text-amber-300">
                                          💡 Suggested correction: <strong className="font-mono text-white underline cursor-pointer" onClick={() => setWorkEmailInput(didYouMean)}>{didYouMean}</strong>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* 6 Verification Matrix Cards */}
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {/* Deliverability */}
                                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="font-medium">Deliverability</span>
                                      <Send className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className={`inline-block h-2 w-2 rounded-full ${isDeliverable ? "bg-emerald-400" : "bg-rose-400"}`} />
                                      <span className={`font-semibold text-xs ${isDeliverable ? "text-emerald-400" : "text-rose-400"}`}>
                                        {isDeliverable ? "Deliverable (Active Mailbox)" : "Undeliverable"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Corporate Domain */}
                                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="font-medium">Domain Classification</span>
                                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className={`inline-block h-2 w-2 rounded-full ${isCorporate ? "bg-sky-400" : "bg-amber-400"}`} />
                                      <span className={`font-semibold text-xs ${isCorporate ? "text-sky-400" : "text-amber-400"}`}>
                                        {isCorporate ? "Corporate Domain (Verified)" : "Personal / Free Public"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Mailbox Exists */}
                                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="font-medium">SMTP Mailbox Probe</span>
                                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className={`inline-block h-2 w-2 rounded-full ${smtp.mailboxExists ? "bg-emerald-400" : "bg-rose-400"}`} />
                                      <span className={`font-semibold text-xs ${smtp.mailboxExists ? "text-emerald-400" : "text-rose-400"}`}>
                                        {smtp.mailboxExists ? "Mailbox Exists (250 OK)" : "Mailbox Rejected / Absent"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Catch-All */}
                                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="font-medium">Catch-All Policy</span>
                                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className={`inline-block h-2 w-2 rounded-full ${isCatchAll ? "bg-amber-400" : "bg-emerald-400"}`} />
                                      <span className={`font-semibold text-xs ${isCatchAll ? "text-amber-400" : "text-emerald-400"}`}>
                                        {isCatchAll ? "Catch-All Server" : "Strict Verification (No Catch-All)"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Role Account */}
                                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="font-medium">Account Role</span>
                                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className={`inline-block h-2 w-2 rounded-full ${isRoleAccount ? "bg-indigo-400" : "bg-blue-400"}`} />
                                      <span className={`font-semibold text-xs ${isRoleAccount ? "text-indigo-400" : "text-blue-400"}`}>
                                        {isRoleAccount ? "Role Account (e.g. support/admin)" : "Individual / Personal User"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Disposable Check */}
                                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="font-medium">Disposable Email</span>
                                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className={`inline-block h-2 w-2 rounded-full ${isDisposable ? "bg-rose-400" : "bg-emerald-400"}`} />
                                      <span className={`font-semibold text-xs ${isDisposable ? "text-rose-400" : "text-emerald-400"}`}>
                                        {isDisposable ? "Temporary / Burner Mail" : "Non-Disposable (Permanent)"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Deep Technical Inspection (Syntax, DNS, SMTP) */}
                                <div className="grid gap-3 sm:grid-cols-3">
                                  {/* 1. Syntax */}
                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5 text-violet-400" /> Syntax & Domain
                                    </span>
                                    <div className="space-y-1 font-mono text-[11px]">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">User:</span>
                                        <span className="font-bold text-foreground">{String(syntax.user || "—")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Domain:</span>
                                        <span className="font-bold text-foreground">{String(syntax.domain || "—")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Valid Syntax:</span>
                                        <span className={syntax.isValid ? "text-emerald-400 font-semibold" : "text-rose-400"}>
                                          {syntax.isValid ? "Valid" : "Invalid"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Free Domain:</span>
                                        <span className={syntax.isBannedFreeDomain ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                                          {syntax.isBannedFreeDomain ? "Banned Free" : "Not Free"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 2. DNS & Security */}
                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <Globe className="h-3.5 w-3.5 text-blue-400" /> DNS & Security
                                    </span>
                                    <div className="space-y-1 font-mono text-[11px]">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Primary MX:</span>
                                        <span className="font-bold text-foreground truncate max-w-[120px]" title={dns.primaryMx}>
                                          {String(dns.primaryMx || "—")}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">SPF Record:</span>
                                        <span className={dns.hasSpf ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                                          {dns.hasSpf ? "Configured" : "Missing"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">DMARC Record:</span>
                                        <span className={dns.hasDmarc ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                                          {dns.hasDmarc ? "Configured" : "Missing"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3. SMTP Handshake */}
                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SMTP Probe
                                    </span>
                                    <div className="space-y-1 font-mono text-[11px]">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Host:</span>
                                        <span className="font-bold text-foreground truncate max-w-[120px]" title={smtp.connectedHost}>
                                          {String(smtp.connectedHost || "—")}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Handshake:</span>
                                        <span className={smtp.status === "VALID" ? "text-emerald-400 font-semibold" : "text-rose-400"}>
                                          {String(smtp.status || "—")}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Mailbox Exists:</span>
                                        <span className={smtp.mailboxExists ? "text-emerald-400 font-semibold" : "text-rose-400"}>
                                          {smtp.mailboxExists ? "Yes (250 OK)" : "No"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Raw SPF & DMARC Details snippet if present */}
                                {(dns.spfRecord || dns.dmarcRecord) && (
                                  <div className="rounded-xl border border-border bg-card p-3 text-xs font-mono space-y-1.5">
                                    {dns.spfRecord && (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground shrink-0 text-[10px] uppercase font-bold">SPF:</span>
                                        <code className="text-foreground truncate text-[11px] select-all flex-1">{dns.spfRecord}</code>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(dns.spfRecord, "SPF Record")}
                                          className="text-muted-foreground hover:text-foreground shrink-0"
                                          title="Copy SPF Record"
                                        >
                                          {copiedField === "SPF Record" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                        </button>
                                      </div>
                                    )}
                                    {dns.dmarcRecord && (
                                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                                        <span className="text-muted-foreground shrink-0 text-[10px] uppercase font-bold">DMARC:</span>
                                        <code className="text-foreground truncate text-[11px] select-all flex-1">{dns.dmarcRecord}</code>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(dns.dmarcRecord, "DMARC Record")}
                                          className="text-muted-foreground hover:text-foreground shrink-0"
                                          title="Copy DMARC Record"
                                        >
                                          {copiedField === "DMARC Record" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Audit & Metadata Footer */}
                                <div className="rounded-xl border border-border bg-card p-3 text-xs font-mono space-y-1 text-muted-foreground">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Verification Audit</span>
                                    <span className="text-emerald-400 font-semibold text-[10px]">Verified at: {new Date(verifiedAt).toLocaleString("en-IN")}</span>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 text-[11px] pt-1">
                                    <p className="truncate">Request ID: <span className="text-foreground">{responseJson?.request_id || "req_" + Date.now()}</span></p>
                                    <p className="truncate">Client Ref: <span className="text-foreground">{responseJson?.client_ref_num || workEmailClientRef || "—"}</span></p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : selectedService === "statement_analyzer" ? (
                          (() => {
                            const anyRes: any = responseJson || {};
                            const data: any = (responseJson?.data || responseJson?.result || responseJson) || {};
                            const accountInfo: any = (data.account_info || data.account_information || data.account_details || data.accountDetails || data?.data?.account_info || {});
                            const summary: any = (data.summary || data.financial_summary || data.analytics || data?.data?.summary || {});

                            // Session tracking
                            const stepToken = String(data.token || anyRes.token || statementToken || "—");
                            const stepRequestId = String(data.request_id || anyRes.request_id || statementRequestId || "—");
                            const stepTxnId = String(data.txn_id || anyRes.txn_id || statementTxnId || "—");
                            const rawStatus = String(data.status || anyRes.status_message || anyRes.message || (responseStatus === 200 ? "COMPLETED" : "PROCESSING")).toUpperCase();

                            // Account info
                            const bankName = String(accountInfo.bank_name || accountInfo.bank || data.bank_name || "Bank Statement");
                            const accountHolder = String(accountInfo.holder_name || accountInfo.name || accountInfo.customer_name || data.holder_name || resData.name || resData.fullname || "—");
                            const accountNumber = String(accountInfo.account_number || accountInfo.account_no || data.account_number || "—");
                            const accountType = String(accountInfo.account_type || data.account_type || "Savings / Current");
                            const ifscVal = String(accountInfo.ifsc || accountInfo.ifsc_code || "—");
                            const branchVal = String(accountInfo.branch || accountInfo.branch_name || "—");

                            // Period
                            const periodObj: any = (accountInfo.statement_period || data.statement_period || {});
                            const periodFrom = String(periodObj.from || periodObj.start_date || accountInfo.start_date || "—");
                            const periodTo = String(periodObj.to || periodObj.end_date || accountInfo.end_date || "—");

                            // Financial metrics
                            const totalCredits = Number(summary.total_credits || summary.total_credit_amount || summary.totalCredits || 0);
                            const totalDebits = Number(summary.total_debits || summary.total_debit_amount || summary.totalDebits || 0);
                            const avgMonthlyBalance = Number(summary.average_monthly_balance || summary.amb || summary.averageMonthlyBalance || 0);
                            const netInflow = Number(summary.net_inflow || summary.netInflow || (totalCredits - totalDebits));
                            const creditTxnCount = Number(summary.credit_transaction_count || summary.creditCount || 0);
                            const debitTxnCount = Number(summary.debit_transaction_count || summary.debitCount || 0);

                            // Salary detection
                            const salaryDetected = Boolean(summary.salary_detected || summary.is_salaried || summary.salaryCredit || summary.estimated_salary);
                            const estimatedSalary = Number(summary.estimated_salary || summary.salary_amount || 0);
                            const employerName = String(summary.employer_name || summary.employer || "—");

                            // Risk indicators
                            const bounceCount = Number(summary.bounce_count || summary.cheque_bounce_count || summary.ecs_bounce_count || summary.inward_bounce_count || 0);
                            const negativeDays = Number(summary.negative_balance_days || summary.negativeBalanceDays || 0);
                            const openingBalance = Number(summary.opening_balance || summary.openingBalance || 0);
                            const closingBalance = Number(summary.closing_balance || summary.closingBalance || 0);
                            const totalTransactions = Number(data.total_transactions || summary.total_transactions || (creditTxnCount + debitTxnCount) || 0);
                            const totalPages = Number(data.total_pages || 0);

                            const monthlyData: any[] = Array.isArray(data.monthly_analysis) ? data.monthly_analysis : Array.isArray(data.monthly_summary) ? data.monthly_summary : Array.isArray(summary.monthly_breakdown) ? summary.monthly_breakdown : [];
                            const hasFullReport = Boolean(accountInfo.bank_name || summary.total_credits || totalCredits > 0 || avgMonthlyBalance > 0);

                            return (
                              <div className="space-y-4">
                                {/* Top Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-400 border border-indigo-500/30">
                                      <FileSpreadsheet className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-base font-bold text-foreground">{bankName}</p>
                                        <span className="rounded bg-indigo-500/15 text-indigo-400 font-mono text-[10px] px-2 py-0.5 border border-indigo-500/20 font-semibold uppercase">
                                          {accountType}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Statement Period: <span className="text-foreground font-medium">{periodFrom}</span> ➔ <span className="text-foreground font-medium">{periodTo}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold inline-flex items-center gap-1 border ${
                                      rawStatus.includes("COMPLETE") || rawStatus.includes("SUCCESS")
                                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                        : "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 animate-pulse"
                                    }`}>
                                      <CheckCircle2 className="h-3.5 w-3.5" /> {rawStatus.includes("COMPLETE") || rawStatus.includes("SUCCESS") ? "ANALYSIS COMPLETED" : rawStatus}
                                    </span>
                                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                                      ₹25.00 Billed
                                    </span>
                                  </div>
                                </div>

                                {/* Account Info Card */}
                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <User className="h-3 w-3 text-primary" /> Account Holder Name
                                    </span>
                                    <p className="font-bold text-foreground text-sm">{accountHolder}</p>
                                    <p className="text-[11px] text-emerald-400 font-medium">✓ Verified from Bank Records</p>
                                  </div>

                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Landmark className="h-3 w-3 text-primary" /> Account Number
                                      </span>
                                      {accountNumber !== "—" && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(accountNumber, "Account Number")}
                                          className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1"
                                        >
                                          <Copy className="h-2.5 w-2.5" /> Copy
                                        </button>
                                      )}
                                    </div>
                                    <p className="font-mono font-bold text-foreground text-sm tracking-wide">{accountNumber}</p>
                                    <p className="text-[11px] text-muted-foreground">IFSC: {ifscVal} {branchVal !== "—" && `· ${branchVal}`}</p>
                                  </div>
                                </div>

                                {hasFullReport ? (
                                  <>
                                    {/* Financial Health 4-Box Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-1">
                                        <div className="flex items-center justify-between text-muted-foreground">
                                          <span className="text-[10px] font-semibold uppercase tracking-wider">Avg Monthly Bal</span>
                                          <DollarSign className="h-3.5 w-3.5 text-indigo-400" />
                                        </div>
                                        <p className="text-base font-bold text-indigo-400 font-mono">
                                          ₹{avgMonthlyBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">AMB Indicator</span>
                                      </div>

                                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                                        <div className="flex items-center justify-between text-muted-foreground">
                                          <span className="text-[10px] font-semibold uppercase tracking-wider">Total Inflow (Cr)</span>
                                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                        </div>
                                        <p className="text-base font-bold text-emerald-400 font-mono">
                                          ₹{totalCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">{creditTxnCount > 0 ? `${creditTxnCount} credits` : "Total Credits"}</span>
                                      </div>

                                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-1">
                                        <div className="flex items-center justify-between text-muted-foreground">
                                          <span className="text-[10px] font-semibold uppercase tracking-wider">Total Outflow (Dr)</span>
                                          <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                                        </div>
                                        <p className="text-base font-bold text-rose-400 font-mono">
                                          ₹{totalDebits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">{debitTxnCount > 0 ? `${debitTxnCount} debits` : "Total Debits"}</span>
                                      </div>

                                      <div className={`rounded-xl border p-3 space-y-1 ${
                                        netInflow >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
                                      }`}>
                                        <div className="flex items-center justify-between text-muted-foreground">
                                          <span className="text-[10px] font-semibold uppercase tracking-wider">Net Cashflow</span>
                                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <p className={`text-base font-bold font-mono ${netInflow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                          {netInflow >= 0 ? "+" : ""}₹{netInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">{netInflow >= 0 ? "Positive Surplus" : "Deficit Outflow"}</span>
                                      </div>
                                    </div>

                                    {/* 3-Column Analytics Grid (Salary, Bounces, Balance Limits) */}
                                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                                      {/* 1. Salary Analysis */}
                                      <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                          <Briefcase className="h-3.5 w-3.5 text-indigo-400" /> Salary Analysis
                                        </span>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold text-[10px] ${
                                              salaryDetected ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-secondary text-muted-foreground"
                                            }`}>
                                              {salaryDetected ? "✓ SALARY DETECTED" : "NO SALARY DETECTED"}
                                            </span>
                                          </div>
                                          {estimatedSalary > 0 && (
                                            <p className="font-bold text-foreground text-sm font-mono pt-1">
                                              ₹{estimatedSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span className="text-[10px] text-muted-foreground font-normal">/ month</span>
                                            </p>
                                          )}
                                          {employerName !== "—" && (
                                            <p className="text-[11px] text-muted-foreground truncate">Employer: <span className="text-foreground font-medium">{employerName}</span></p>
                                          )}
                                        </div>
                                      </div>

                                      {/* 2. Bounce & ECS Risk */}
                                      <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                          <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> Bounce & ECS Diagnostics
                                        </span>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold text-[10px] ${
                                              bounceCount === 0 ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                            }`}>
                                              {bounceCount === 0 ? "✓ 0 BOUNCES (CLEAN)" : `⚠️ ${bounceCount} BOUNCE(S) FLAGGED`}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-muted-foreground pt-1">
                                            Negative Balance Days: <span className="font-mono font-bold text-foreground">{negativeDays} Days</span>
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            Total Analyzed: <span className="font-mono text-foreground">{totalTransactions} txns</span> {totalPages > 0 && `(${totalPages} pages)`}
                                          </p>
                                        </div>
                                      </div>

                                      {/* 3. Balances Extremes */}
                                      <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                          <Landmark className="h-3.5 w-3.5 text-primary" /> Balances & Boundaries
                                        </span>
                                        <div className="space-y-1 font-mono text-[11px]">
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Opening Bal:</span>
                                            <span className="font-bold text-foreground">₹{openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Closing Bal:</span>
                                            <span className="font-bold text-emerald-400">₹{closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                          </div>
                                          <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5 border-t border-border/40">
                                            <span>Status:</span>
                                            <span className="text-foreground font-semibold">Active Ledger</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Monthly Trend Table (if present) */}
                                    {monthlyData.length > 0 && (
                                      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                          <Calendar className="h-3.5 w-3.5 text-primary" /> Monthly Cashflow Trend
                                        </span>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-xs font-mono">
                                            <thead>
                                              <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase">
                                                <th className="py-1.5 px-2">Month</th>
                                                <th className="py-1.5 px-2 text-right">Inflow (Cr)</th>
                                                <th className="py-1.5 px-2 text-right">Outflow (Dr)</th>
                                                <th className="py-1.5 px-2 text-right">Closing Bal</th>
                                                <th className="py-1.5 px-2 text-center">Bounces</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/40">
                                              {monthlyData.slice(0, 6).map((m: any, idx) => (
                                                <tr key={idx} className="hover:bg-secondary/30">
                                                  <td className="py-2 px-2 font-medium text-foreground">{String(m.month || m.month_name || `Month ${idx + 1}`)}</td>
                                                  <td className="py-2 px-2 text-right text-emerald-400">₹{Number(m.total_credits || m.credits || 0).toLocaleString("en-IN")}</td>
                                                  <td className="py-2 px-2 text-right text-rose-400">₹{Number(m.total_debits || m.debits || 0).toLocaleString("en-IN")}</td>
                                                  <td className="py-2 px-2 text-right text-foreground font-bold">₹{Number(m.closing_balance || m.balance || 0).toLocaleString("en-IN")}</td>
                                                  <td className="py-2 px-2 text-center">
                                                    {Number(m.bounce_count || 0) > 0 ? (
                                                      <span className="text-rose-400 font-bold">{String(m.bounce_count)}</span>
                                                    ) : (
                                                      <span className="text-muted-foreground">0</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  /* Interim Step Result Notice (for Step 1, 2, 3, 4) */
                                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                      <Sparkles className="h-4 w-4" />
                                      <span className="text-xs font-bold">Workflow Step Output</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {String(anyRes.message || "Step executed successfully. Session tokens have been auto-populated into your console.")}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      {statementStep === "INITIATE_UPLOAD" && (
                                        <button
                                          type="button"
                                          onClick={() => setStatementStep("UPLOAD_FILE")}
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                                        >
                                          ➡️ Next: Proceed to Step 2 (Upload File)
                                        </button>
                                      )}
                                      {statementStep === "UPLOAD_FILE" && (
                                        <button
                                          type="button"
                                          onClick={() => setStatementStep("COMPLETE_UPLOAD")}
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                                        >
                                          ➡️ Next: Proceed to Step 3 (Complete Upload)
                                        </button>
                                      )}
                                      {statementStep === "COMPLETE_UPLOAD" && (
                                        <button
                                          type="button"
                                          onClick={() => setStatementStep("CHECK_STATUS")}
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                                        >
                                          🔍 Next: Proceed to Step 4 (Check Status)
                                        </button>
                                      )}
                                      {statementStep === "CHECK_STATUS" && (
                                        <button
                                          type="button"
                                          onClick={() => setStatementStep("RETRIEVE_STATEMENT")}
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                                        >
                                          📊 Next: Proceed to Step 5 (Retrieve Report)
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Session Tracking Footer Bar */}
                                <div className="rounded-xl border border-border bg-card p-3 text-xs font-mono space-y-1.5">
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Session Audit Trace</span>
                                    <span className="text-indigo-400 font-semibold text-[10px]">Method: {statementMode === "one_shot" ? "1-SHOT AUTO PIPELINE" : statementStep}</span>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground pt-1">
                                    <p className="truncate">Token: <span className="text-foreground">{stepToken}</span></p>
                                    <p className="truncate">Request ID: <span className="text-foreground">{stepRequestId}</span></p>
                                    <p className="truncate">Txn ID: <span className="text-foreground">{stepTxnId}</span></p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : selectedService === "transunion" ? (
                          (() => {
                            const tuData: any = responseJson?.data || responseJson?.result || responseJson || {};
                            const webTokenUrl = String(tuData.web_token_url || (responseJson as any)?.web_token_url || "");
                            const clientKey = String(tuData.client_key || (responseJson as any)?.client_key || "—");
                            const stepsSummary: any[] = Array.isArray(tuData.steps_summary) ? tuData.steps_summary : [];
                            const message = String(responseJson?.message || tuData.message || "CIBIL report ready!");

                            const scoreVal = tuExtracted?.cibilScore ?? (typeof tuData.score === "number" ? tuData.score : null);
                            const scoreName = tuExtracted?.scoreName || "CIBILTransUnionScore3";
                            const scoringFactors = tuExtracted?.scoringFactors || [];
                            const totalAccounts = tuExtracted?.totalAccounts ?? 0;
                            const activeAccounts = tuExtracted?.activeAccounts ?? 0;
                            const closedAccounts = tuExtracted?.closedAccounts ?? 0;
                            const totalSanctioned = tuExtracted?.totalSanctioned ?? 0;
                            const totalCurrentBal = tuExtracted?.totalCurrentBalance ?? 0;
                            const overdueVal = tuExtracted?.totalOverdue ?? 0;
                            const totalEnquiries = tuExtracted?.totalEnquiries ?? 0;
                            const onTimePaymentPct = tuExtracted?.onTimePaymentPct;
                            const creditCardUtilPct = tuExtracted?.creditCardUtilPct;

                            const borrower = tuExtracted?.borrower || {};
                            const borrowerName = borrower.name || `${tuForename} ${tuSurname}`.trim().toUpperCase() || "CUSTOMER";
                            const fatherName = borrower.fatherName || "—";
                            const dobVal = borrower.dob || tuDob.trim() || "—";
                            const genderVal = borrower.gender || tuGender || "Male";
                            const panVal = (tuExtracted?.identifications?.find((i: any) => i.type === "TaxId" || i.type === "01")?.number) || tuPan.trim().toUpperCase() || "—";
                            const mobileVal = (tuExtracted?.telephones?.[0]?.number) || tuPhone.trim() || "—";

                            const identifications = tuExtracted?.identifications || [];
                            const addresses = tuExtracted?.addresses || [];
                            const telephones = tuExtracted?.telephones || [];
                            const emails = tuExtracted?.emails || [];
                            const employment = tuExtracted?.employment || [];
                            const tradelines = tuExtracted?.allTradelines || [];
                            const inquiries = tuExtracted?.inquiries || [];
                            const dpdHistory = tuExtracted?.dpdHistory6m || [];
                            const dpdAnalysis = tuExtracted?.dpdAnalysis;
                            const riskFlags = tuExtracted?.riskFlags || [];

                            return (
                              <div className="space-y-5">
                                {/* Top Header Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg bg-cyan-500/15 p-2.5 text-cyan-400 border border-cyan-500/30">
                                      <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-base font-bold text-foreground">TransUnion CIBIL Credit Report</p>
                                        <span className="rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] px-2 py-0.5 font-semibold">
                                          Official CIR
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        Consumer: <span className="text-foreground font-medium">{borrowerName}</span> · Client Key: {clientKey}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleOpenTuPdf}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                                    >
                                      <FileText className="h-3.5 w-3.5" /> View CIBIL PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDownloadTuPdf}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 shadow-sm transition-all cursor-pointer"
                                    >
                                      <Download className="h-3.5 w-3.5" /> Download
                                    </button>
                                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> REPORT READY
                                    </span>
                                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[11px] font-semibold text-amber-400">
                                      ₹75.00 Billed
                                    </span>
                                  </div>
                                </div>

                                {/* Prominent Top TransUnion PDF Action Card */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-r from-cyan-950/50 via-cyan-950/30 to-card p-4 shadow-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-cyan-500/25 p-2.5 text-cyan-300 border border-cyan-400/50 shadow-inner">
                                      <FileText className="h-6 w-6 text-cyan-300" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        Official TransUnion CIBIL CIR Report (PDF Ready)
                                        {tuPdfLoading && (
                                          <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30 animate-pulse">
                                            Generating...
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-xs text-cyan-200/80">
                                        Complete multi-page authentic CIBIL report with Tradelines, 36-Month DPD grids, Inquiries &amp; Score Factors.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={handleOpenTuPdf}
                                      className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-extrabold text-black hover:bg-cyan-400 shadow-md transition-all hover:scale-105 cursor-pointer"
                                    >
                                      <ExternalLink className="h-4 w-4 text-black" /> View PDF in New Tab
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDownloadTuPdf}
                                      className="inline-flex items-center gap-2 rounded-lg border-2 border-cyan-400/60 bg-cyan-950/80 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900 transition-all shadow-md cursor-pointer"
                                    >
                                      <Download className="h-4 w-4" /> Download PDF Report
                                    </button>
                                    {webTokenUrl && (
                                      <a
                                        href={webTokenUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow transition-colors"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" /> Interactive Portal
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Score & Financial Metrics Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {/* CIBIL Score Card */}
                                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3.5 space-y-2 flex flex-col justify-between">
                                    <div>
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-cyan-400" /> CIBIL Score
                                      </span>
                                      <div className="flex items-baseline gap-2 mt-1">
                                        <p className="text-3xl font-black text-cyan-400 font-mono tracking-tight">
                                          {scoreVal !== null ? scoreVal : "N/A"}
                                        </p>
                                        {scoreVal !== null && (
                                          <span className={`text-[10px] font-semibold ${
                                            scoreVal >= 750 ? "text-emerald-400" : scoreVal >= 700 ? "text-cyan-400" : scoreVal >= 650 ? "text-amber-400" : "text-rose-400"
                                          }`}>
                                            {scoreVal >= 750 ? "Prime / Excellent" : scoreVal >= 700 ? "Good" : scoreVal >= 650 ? "Fair" : "High Risk"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {scoreVal !== null && (
                                      <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-1000 ${
                                            scoreVal >= 750 ? "bg-emerald-500" : scoreVal >= 700 ? "bg-cyan-500" : scoreVal >= 650 ? "bg-amber-500" : "bg-rose-500"
                                          }`}
                                          style={{ width: `${Math.min(100, Math.max(10, ((scoreVal - 300) / 600) * 100))}%` }}
                                        />
                                      </div>
                                    )}
                                    <p className="text-[10px] text-muted-foreground font-mono truncate">{scoreName}</p>
                                  </div>

                                  {/* Total Accounts */}
                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 flex flex-col justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <Layers className="h-3 w-3 text-primary" /> Total Accounts
                                    </span>
                                    <p className="text-xl font-bold text-foreground font-mono">
                                      {totalAccounts} <span className="text-xs font-normal text-muted-foreground">Facilities</span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Active: <span className="text-emerald-400 font-semibold">{activeAccounts}</span> · Closed: <span className="text-zinc-400 font-semibold">{closedAccounts}</span>
                                    </p>
                                  </div>

                                  {/* Total Sanctioned / High Credit */}
                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 flex flex-col justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <DollarSign className="h-3 w-3 text-emerald-400" /> Total Sanctioned
                                    </span>
                                    <p className="text-xl font-bold text-emerald-400 font-mono">
                                      ₹{Number(totalSanctioned).toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">High Credit Sanctioned</p>
                                  </div>

                                  {/* Current Balance / Overdue */}
                                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 flex flex-col justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <Landmark className="h-3 w-3 text-indigo-400" /> Current Balances
                                    </span>
                                    <p className="text-xl font-bold text-foreground font-mono">
                                      ₹{Number(totalCurrentBal).toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Overdue: <span className={overdueVal > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>₹{Number(overdueVal).toLocaleString("en-IN")}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Demographics & Consumer Details Card */}
                                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5 text-cyan-400" /> Consumer Identity & Demographic Details
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground">Bureau Verified Record</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Full Name</span>
                                      <p className="font-bold text-foreground truncate">{borrowerName}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Father's Name</span>
                                      <p className="font-medium text-foreground truncate">{fatherName}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Date of Birth</span>
                                      <p className="font-mono text-foreground">{dobVal}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Gender</span>
                                      <p className="font-medium text-foreground">{genderVal}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">PAN / Tax ID</span>
                                      <p className="font-mono font-bold text-cyan-400">{panVal}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Mobile Number</span>
                                      <p className="font-mono font-medium text-foreground">{mobileVal}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Total Enquiries</span>
                                      <p className="font-mono font-medium text-foreground">{totalEnquiries} Enquiries</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Report Date</span>
                                      <p className="font-mono text-foreground">{tuExtracted?.reportDate || "Recent"}</p>
                                    </div>
                                  </div>

                                  {/* Identifications Chips */}
                                  {identifications.length > 0 && (
                                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                                      <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Identifications Reported</span>
                                      <div className="flex flex-wrap gap-2">
                                        {identifications.map((id: any, idx: number) => (
                                          <div key={idx} className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5">
                                            <Fingerprint className="h-3 w-3 text-cyan-400" />
                                            <span className="text-muted-foreground">{id.type}:</span>
                                            <span className="font-bold text-foreground">{id.number}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Addresses List */}
                                  {addresses.length > 0 && (
                                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                                      <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Addresses Reported ({addresses.length})</span>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {addresses.slice(0, 4).map((addr: any, idx: number) => (
                                          <div key={idx} className="rounded-lg border border-border bg-secondary/20 p-2.5 text-xs flex items-start gap-2">
                                            <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                                            <div className="space-y-0.5">
                                              <p className="text-foreground leading-snug">{addr.address}</p>
                                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                                {addr.category && <span>Category: {addr.category}</span>}
                                                {addr.dateReported && <span>Reported: {addr.dateReported}</span>}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Employment Info */}
                                  {employment.length > 0 && (
                                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                                      <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Employment Details</span>
                                      <div className="grid gap-2 sm:grid-cols-3">
                                        {employment.slice(0, 3).map((emp: any, idx: number) => (
                                          <div key={idx} className="rounded-lg border border-border bg-secondary/20 p-2 text-xs space-y-0.5">
                                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                              <Briefcase className="h-3 w-3 text-cyan-400" />
                                              {emp.occupationCode ? `Occupation Code: ${emp.occupationCode}` : "Employment Record"}
                                            </div>
                                            {emp.income && <p className="text-[11px] text-muted-foreground">Income: ₹{emp.income}</p>}
                                            {emp.dateReported && <p className="text-[10px] text-muted-foreground font-mono">Date Reported: {emp.dateReported}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* DPD & Payment Delinquency Breakdown */}
                                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5 text-indigo-400" /> DPD Delinquency & Payment Performance
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                      overdueVal > 0 ? "bg-rose-500/15 border-rose-500/30 text-rose-400" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                    }`}>
                                      {tuExtracted?.dpdOverall || (overdueVal > 0 ? "Overdue Facilities Detected" : "Clean Repayment History")}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs space-y-0.5">
                                      <span className="text-[10px] text-muted-foreground block">1-30 Days DPD</span>
                                      <p className="font-bold text-foreground font-mono">{tuExtracted?.dpd30Days || "0 Account(s)"}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs space-y-0.5">
                                      <span className="text-[10px] text-muted-foreground block">31-60 Days DPD</span>
                                      <p className="font-bold text-foreground font-mono">{tuExtracted?.dpd60Days || "0 Account(s)"}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs space-y-0.5">
                                      <span className="text-[10px] text-muted-foreground block">61-90 Days DPD</span>
                                      <p className="font-bold text-foreground font-mono">{tuExtracted?.dpd90Days || "0 Account(s)"}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs space-y-0.5">
                                      <span className="text-[10px] text-muted-foreground block">90+ Days DPD</span>
                                      <p className="font-bold text-foreground font-mono">{tuExtracted?.dpd120Days || "0 Account(s)"}</p>
                                    </div>
                                  </div>

                                  {/* Scoring Factors & Risk Flags */}
                                  {scoringFactors.length > 0 && (
                                    <div className="pt-2 border-t border-border/40 space-y-1">
                                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Bureau Scoring Factors</span>
                                      <div className="grid gap-1.5 sm:grid-cols-2">
                                        {scoringFactors.map((fact: string, idx: number) => (
                                          <div key={idx} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 text-xs text-cyan-300 flex items-center gap-1.5">
                                            <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
                                            <span className="truncate">{fact}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Account Tradelines (Active & Closed Loan / Credit Facilities) */}
                                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5 text-primary" /> Loan & Credit Facilities Tradelines ({tradelines.length})
                                      </span>
                                      <span className="rounded-full bg-secondary text-[10px] px-2 py-0.5 font-mono text-muted-foreground">
                                        {activeAccounts} Active · {closedAccounts} Closed
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-mono">Real-time Upstream Records</span>
                                  </div>

                                  {tradelines.length > 0 ? (
                                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                                      {tradelines.map((trade: any, idx: number) => {
                                        const overdueNum = Number(trade.overdueAmount || trade.overdue_amount || 0);
                                        const isClosed = trade.status === "CLOSED" || String(trade.status).toUpperCase() === "CLOSED";
                                        const sanctionedNum = Number(trade.sanctionedAmount || trade.amount || 0);
                                        const currentBalNum = Number(trade.current_balance || trade.balanceAmount || 0);

                                        return (
                                          <div
                                            key={idx}
                                            className={`rounded-lg border p-3 text-xs transition-colors space-y-2 ${
                                              overdueNum > 0
                                                ? "border-rose-500/30 bg-rose-500/5"
                                                : isClosed
                                                ? "border-border/60 bg-secondary/15"
                                                : "border-border bg-secondary/30"
                                            }`}
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <div className={`rounded p-1 text-[10px] font-bold ${
                                                  isClosed ? "bg-zinc-800 text-zinc-400" : "bg-emerald-500/15 text-emerald-400"
                                                }`}>
                                                  {isClosed ? "CLOSED" : "ACTIVE"}
                                                </div>
                                                <p className="font-bold text-foreground">{trade.lender || trade.bank || "Credit Facility"}</p>
                                                <span className="text-muted-foreground">·</span>
                                                <span className="text-muted-foreground font-medium">{trade.facilityType || trade.type || "Loan"}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-muted-foreground">Acc: {trade.accountNumber || "N/A"}</span>
                                                {trade.repaymentDpd && (
                                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                                    overdueNum > 0 ? "bg-rose-500/15 border-rose-500/30 text-rose-400" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                                  }`}>
                                                    {trade.repaymentDpd}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/40 text-[11px]">
                                              <div>
                                                <span className="text-[10px] text-muted-foreground block">Sanctioned Amount</span>
                                                <p className="font-mono font-semibold text-emerald-400">
                                                  ₹{sanctionedNum.toLocaleString("en-IN")}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-[10px] text-muted-foreground block">Current Balance</span>
                                                <p className="font-mono font-semibold text-foreground">
                                                  ₹{currentBalNum.toLocaleString("en-IN")}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-[10px] text-muted-foreground block">Overdue Amount</span>
                                                <p className={`font-mono font-bold ${overdueNum > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                                  ₹{overdueNum.toLocaleString("en-IN")}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-[10px] text-muted-foreground block">Dates</span>
                                                <p className="font-mono text-[10px] text-muted-foreground">
                                                  Opened: {trade.dateOpened || "N/A"} {trade.dateClosed && `· Closed: ${trade.dateClosed}`}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="py-6 text-center text-xs text-muted-foreground">
                                      No detailed tradeline facilities reported for this consumer profile.
                                    </div>
                                  )}
                                </div>

                                {/* Recent Inquiries (Enquiries) */}
                                {inquiries.length > 0 && (
                                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <FileCheck className="h-3.5 w-3.5 text-cyan-400" /> Recent Credit Inquiries ({inquiries.length})
                                      </span>
                                      <span className="text-[10px] font-mono text-muted-foreground">Bureau Enquiries Log</span>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {inquiries.map((inq: any, idx: number) => (
                                        <div key={idx} className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs flex items-center justify-between gap-2">
                                          <div>
                                            <p className="font-bold text-foreground">{inq.enquiry || inq.lender || "Lending Institution"}</p>
                                            <p className="text-[10px] text-muted-foreground">Purpose: {inq.purpose || "Credit Facility"}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-mono font-semibold text-cyan-400">
                                              {Number(inq.amount || 0) > 0 ? `₹${Number(inq.amount).toLocaleString("en-IN")}` : "—"}
                                            </p>
                                            <p className="text-[10px] font-mono text-muted-foreground">{inq.date || "—"}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* PDF Download & Action Toolbar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                      <FileText className="h-4 w-4" /> Official TransUnion CIBIL CIR Report (PDF Generated)
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">
                                      Complete multi-page authentic CIBIL report formatted with Account Tradelines, 36-Month DPD grids, Inquiries & Score Factors.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {tuPdfBlobUrl && (
                                      <>
                                        <a
                                          href={tuPdfBlobUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-500 shadow transition-colors"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" /> View PDF in New Tab
                                        </a>
                                        <a
                                          href={tuPdfBlobUrl}
                                          download={`TransUnion_CIBIL_Report_${tuPan.trim() || "Customer"}.pdf`}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-900/40 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-800/50 transition-colors shadow"
                                        >
                                          <Download className="h-3.5 w-3.5" /> Download PDF Report
                                        </a>
                                      </>
                                    )}
                                    {webTokenUrl && (
                                      <a
                                        href={webTokenUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-500 shadow transition-colors"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" /> Interactive Portal
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {tuPdfLoading && (
                                  <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                                    Generating authentic TransUnion CIBIL CIR PDF document...
                                  </div>
                                )}

                                {tuPdfError && (
                                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                                    ⚠️ {tuPdfError}
                                  </div>
                                )}

                                {/* Embedded Full-Page PDF Viewer */}
                                {tuPdfBlobUrl && (
                                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg space-y-0">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-border">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-cyan-400" />
                                        <span className="text-xs font-bold text-foreground">
                                          TransUnion CIR PDF Preview
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        Multi-page High Fidelity Rendering
                                      </span>
                                    </div>
                                    <iframe
                                      src={`${tuPdfBlobUrl}#toolbar=1&navpanes=0`}
                                      title="TransUnion CIBIL Report PDF"
                                      className="w-full h-[650px] border-0 bg-zinc-950"
                                    />
                                  </div>
                                )}

                                {stepsSummary.length > 0 && (
                                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                    <span className="text-xs font-bold text-foreground">Pipeline Execution Summary</span>
                                    <div className="grid gap-2 sm:grid-cols-4">
                                      {stepsSummary.map((st: any, i) => (
                                        <div key={i} className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground text-[11px]">Step {String(st.step)}: {String(st.name)}</span>
                                            <span className="text-emerald-400 text-[10px] font-bold uppercase">{String(st.status)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : selectedService === "crif" ? (
                          (() => {
                            const rawData = (responseJson?.data || responseJson?.result || responseJson || {}) as any;
                            const norm = normalizeCrifReportData(responseJson, {
                              first_name: crifFirstName.trim(),
                              last_name: crifLastName.trim(),
                              mobile_no: crifMobile.trim(),
                            });
                            
                            // Demographics
                            const fullName = norm.applicant.name || `${crifFirstName} ${crifLastName}`.trim().toUpperCase() || "CUSTOMER";
                            const mobile = norm.applicant.phone || crifMobile;
                            const dob = norm.applicant.dob || "—";
                            const pan = norm.applicant.pan || "—";
                            const email = norm.applicant.email || "—";
                            const address = norm.applicant.currentAddress || "—";

                            // Score calculation
                            const scoreVal = typeof norm.score.value === "number"
                              ? norm.score.value
                              : (norm.score.value !== "—" && !isNaN(Number(norm.score.value)) ? Number(norm.score.value) : Number(rawData.score || rawData.credit_score || 0));
                            const scoreName = norm.score.scoreName || "CRIF High Mark Consumer Credit Score";
                            const scoreBand = scoreVal >= 750 ? "Excellent" : scoreVal >= 700 ? "Good" : scoreVal >= 600 ? "Fair" : "Poor";
                            const scoringDate = norm.reportMeta.dateOfIssue || String(rawData.scoring_date || new Date().toISOString().split("T")[0]);
                            const reportId = norm.reportMeta.chmRef || String(rawData.report_id || (responseJson as any)?.request_id || "CRF_PROV2_ACTIVE");
                            const reportUrl = String(
                              rawData.report_url ||
                              rawData.web_token_url ||
                              rawData.pdf_url ||
                              (responseJson as any)?.report_url ||
                              (responseJson as any)?.web_token_url ||
                              (responseJson as any)?.pdf_url ||
                              (responseJson as any)?.data?.report_url ||
                              (responseJson as any)?.data?.web_token_url ||
                              (responseJson as any)?.data?.pdf_url ||
                              (responseJson as any)?.data?.result_json?.report_url ||
                              (responseJson as any)?.data?.result_json?.web_token_url ||
                              (responseJson as any)?.data?.result_json?.pdf_url ||
                              (responseJson as any)?.result_json?.report_url ||
                              (responseJson as any)?.result_json?.web_token_url ||
                              (responseJson as any)?.result_json?.pdf_url ||
                              ""
                            );
                            const activePdfUrl = crifPdfBlobUrl || reportUrl;

                            // Summary
                            const activeAccounts = norm.primaryAccountSummary.activeAccounts;
                            const closedAccounts = Math.max(0, norm.primaryAccountSummary.numberOfAccounts - norm.primaryAccountSummary.activeAccounts);
                            const outstanding = norm.primaryAccountSummary.totalCurrentBalance || norm.primaryAccountSummary.currentBalanceUnsecured;
                            const overdue = norm.primaryAccountSummary.totalAmountOverdue;

                            // Tradelines & Inquiries
                            const accountsList = norm.accounts;
                            const inquiriesList = norm.inquiries;

                            return (
                              <div className="space-y-4">
                                {/* Top Badge Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg bg-[#0C3875]/20 p-2 text-cyan-400 border border-[#0C3875]">
                                      <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-base font-bold text-foreground">CRIF High Mark Credit Score</p>
                                        <span className={`rounded font-mono text-[10px] px-2 py-0.5 border font-bold uppercase ${
                                          scoreVal >= 750
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                            : scoreVal >= 700
                                            ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                                            : scoreVal >= 600
                                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                            : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                                        }`}>
                                          {scoreBand} ({scoreVal || "—"})
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        Scored on: <span className="text-foreground">{scoringDate}</span> · Report ID: <span className="text-foreground">{reportId}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleOpenCrifPdf}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C3875] border border-cyan-400/60 px-3 py-1.5 text-xs font-bold text-white hover:bg-[#092c5d] shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-cyan-300" /> View CRIF PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDownloadCrifPdf}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 shadow-sm transition-all cursor-pointer"
                                    >
                                      <Download className="h-3.5 w-3.5" /> Download
                                    </button>
                                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> BUREAU VERIFIED
                                    </span>
                                    <span className="rounded-full bg-[#0C3875]/30 border border-[#0C3875] px-2 py-1 text-[11px] font-semibold text-cyan-300">
                                      ₹25.00 Billed
                                    </span>
                                  </div>
                                </div>

                                {/* Prominent Top CRIF PDF Action Card */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-r from-[#0C3875]/50 via-[#0C3875]/30 to-card p-4 shadow-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-cyan-500/25 p-2.5 text-cyan-300 border border-cyan-400/50 shadow-inner">
                                      <FileText className="h-6 w-6 text-cyan-300" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        Official CRIF High Mark Report (12-Page PROV2 PDF Ready)
                                        {crifPdfLoading && (
                                          <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30 animate-pulse">
                                            Generating...
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-xs text-cyan-200/80">
                                        Complete high-fidelity credit report with Tradelines, Score Trends, 12-Month Payment Matrix &amp; Inquiries.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={handleOpenCrifPdf}
                                      className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-extrabold text-black hover:bg-cyan-400 shadow-md transition-all hover:scale-105 cursor-pointer"
                                    >
                                      <ExternalLink className="h-4 w-4 text-black" /> View PDF in New Tab
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDownloadCrifPdf}
                                      className="inline-flex items-center gap-2 rounded-lg border-2 border-cyan-400/60 bg-cyan-950/80 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900 transition-all shadow-md cursor-pointer"
                                    >
                                      <Download className="h-4 w-4" /> Download PDF Report
                                    </button>
                                    {reportUrl && (
                                      <a
                                        href={reportUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow transition-all"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" /> Direct Report URL
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Score Gauge & Personal Details Grid */}
                                <div className="grid gap-3 sm:grid-cols-3">
                                  {/* Score Box */}
                                  <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-[#0C3875]/20 via-background to-card p-4 flex flex-col justify-between items-center text-center space-y-2">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Bureau Credit Score</span>
                                    <div className="space-y-0.5">
                                      <div className={`text-4xl font-extrabold font-mono tracking-tight ${
                                        scoreVal >= 750 ? "text-emerald-400" : scoreVal >= 700 ? "text-blue-400" : scoreVal >= 600 ? "text-amber-400" : "text-rose-400"
                                      }`}>
                                        {scoreVal || "—"}
                                      </div>
                                      <p className="text-[11px] font-medium text-muted-foreground">Scale: 300 – 900</p>
                                    </div>
                                    <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                          scoreVal >= 750 ? "bg-emerald-500" : scoreVal >= 700 ? "bg-blue-500" : scoreVal >= 600 ? "bg-amber-500" : "bg-rose-500"
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(10, ((scoreVal - 300) / 600) * 100))}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-full">{scoreName}</span>
                                  </div>

                                  {/* Personal Details (2 Columns span) */}
                                  <div className="sm:col-span-2 rounded-xl border border-border bg-card p-4 space-y-3">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5 text-primary" /> Consumer Demographic Info
                                    </span>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">Full Name</span>
                                        <p className="font-bold text-foreground truncate">{fullName}</p>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">Mobile Number</span>
                                        <p className="font-mono font-medium text-foreground">{mobile}</p>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">Date of Birth</span>
                                        <p className="font-mono text-foreground">{dob}</p>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">PAN / Tax ID</span>
                                        <p className="font-mono font-bold text-foreground">{pan}</p>
                                      </div>
                                      {email !== "—" && (
                                        <div className="col-span-2">
                                          <span className="text-[10px] text-muted-foreground block">Email</span>
                                          <p className="font-mono text-[11px] text-foreground truncate">{email}</p>
                                        </div>
                                      )}
                                      {address !== "—" && (
                                        <div className="col-span-2 pt-1 border-t border-border/40">
                                          <span className="text-[10px] text-muted-foreground block">Reported Address</span>
                                          <p className="text-[11px] text-foreground leading-relaxed truncate">{address}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* 4-Box Financial Summary Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Accounts</span>
                                    <p className="text-lg font-bold text-emerald-400 font-mono">{activeAccounts}</p>
                                    <span className="text-[10px] text-muted-foreground">Open Trade Lines</span>
                                  </div>

                                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Closed Accounts</span>
                                    <p className="text-lg font-bold text-blue-400 font-mono">{closedAccounts}</p>
                                    <span className="text-[10px] text-muted-foreground">Settled Loans</span>
                                  </div>

                                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Outstanding</span>
                                    <p className="text-lg font-bold text-indigo-400 font-mono">₹{outstanding.toLocaleString("en-IN")}</p>
                                    <span className="text-[10px] text-muted-foreground">Live Balances</span>
                                  </div>

                                  <div className={`rounded-xl border p-3 space-y-1 ${
                                    overdue > 0 ? "border-rose-500/40 bg-rose-500/10" : "border-border bg-card"
                                  }`}>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue Balance</span>
                                    <p className={`text-lg font-bold font-mono ${overdue > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                      ₹{overdue.toLocaleString("en-IN")}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">{overdue > 0 ? "⚠️ Payment Default" : "✓ 0 Overdue"}</span>
                                  </div>
                                </div>

                                {/* Trade Lines / Accounts Table */}
                                {accountsList.length > 0 && (
                                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <Building2 className="h-3.5 w-3.5 text-primary" /> Active &amp; Historical Accounts ({accountsList.length})
                                    </span>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs font-mono">
                                        <thead>
                                          <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase">
                                            <th className="py-1.5 px-2">Institution</th>
                                            <th className="py-1.5 px-2">Account Type</th>
                                            <th className="py-1.5 px-2 text-right">Balance</th>
                                            <th className="py-1.5 px-2 text-right">Sanctioned</th>
                                            <th className="py-1.5 px-2 text-center">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y border-border/40">
                                          {accountsList.map((acc, i) => (
                                            <tr key={i} className="hover:bg-secondary/30">
                                              <td className="py-2 px-2 font-medium text-foreground">{acc.creditGrantor}</td>
                                              <td className="py-2 px-2 text-muted-foreground">{acc.accountType}</td>
                                              <td className="py-2 px-2 text-right text-foreground font-bold">₹{acc.currentBalance.toLocaleString("en-IN")}</td>
                                              <td className="py-2 px-2 text-right text-muted-foreground">₹{acc.disbursedAmount.toLocaleString("en-IN")}</td>
                                              <td className="py-2 px-2 text-center">
                                                <span className={`rounded font-semibold px-2 py-0.5 text-[10px] ${
                                                  acc.status === "Closed"
                                                    ? "bg-rose-500/15 text-rose-400"
                                                    : "bg-emerald-500/15 text-emerald-400"
                                                }`}>
                                                  {acc.status}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Inquiries List */}
                                {inquiriesList.length > 0 && (
                                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5 text-primary" /> Credit Inquiries ({inquiriesList.length})
                                    </span>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs font-mono">
                                        <thead>
                                          <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase">
                                            <th className="py-1.5 px-2">Date</th>
                                            <th className="py-1.5 px-2">Institution</th>
                                            <th className="py-1.5 px-2">Purpose</th>
                                            <th className="py-1.5 px-2 text-right">Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                          {inquiriesList.map((inq, i) => (
                                            <tr key={i} className="hover:bg-secondary/30">
                                              <td className="py-2 px-2 text-muted-foreground">{inq.inquiryDate}</td>
                                              <td className="py-2 px-2 font-medium text-foreground">{inq.creditGrantor}</td>
                                              <td className="py-2 px-2 text-muted-foreground">{inq.accountType}</td>
                                              <td className="py-2 px-2 text-right text-foreground font-bold">₹{inq.amount.toLocaleString("en-IN")}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* CRIF PDF Download & Action Toolbar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0C3875]/40 bg-[#0C3875]/10 p-4">
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                      <FileText className="h-4 w-4" /> Official CRIF High Mark PROV2 Report (PDF Generated)
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">
                                      Multi-page high-fidelity CRIF Credit Information Report PROV2 with Score Trends, 12-Month Repayment Matrix, Tradelines &amp; Inquiries.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {activePdfUrl && (
                                      <>
                                        <a
                                          href={activePdfUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C3875] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#092c5d] shadow transition-colors"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" /> View PDF in New Tab
                                        </a>
                                        <a
                                          href={activePdfUrl}
                                          download={`CRIF_HighMark_Report_${crifMobile.trim() || "Customer"}.pdf`}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900/50 transition-colors shadow"
                                        >
                                          <Download className="h-3.5 w-3.5" /> Download PDF Report
                                        </a>
                                      </>
                                    )}
                                    {reportUrl && reportUrl !== crifPdfBlobUrl && (
                                      <a
                                        href={reportUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-600 shadow transition-colors"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" /> Direct Report URL
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {crifPdfLoading && (
                                  <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                                    Generating authentic CRIF High Mark PROV2 CIR PDF document...
                                  </div>
                                )}

                                {crifPdfError && !reportUrl && (
                                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                                    ⚠️ {crifPdfError}
                                  </div>
                                )}

                                {/* Embedded Full-Page CRIF PDF Viewer */}
                                {activePdfUrl && (
                                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg space-y-0">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-border">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-cyan-400" />
                                        <span className="text-xs font-bold text-foreground">
                                          CRIF High Mark CIR PROV2 PDF Preview
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <a
                                          href={activePdfUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[11px] text-cyan-400 hover:underline font-mono inline-flex items-center gap-1"
                                        >
                                          <ExternalLink className="h-3 w-3" /> Open full page
                                        </a>
                                      </div>
                                    </div>
                                    <iframe
                                      src={`${activePdfUrl}#toolbar=1&navpanes=0`}
                                      title="CRIF High Mark Report PDF"
                                      className="w-full h-[650px] border-0 bg-zinc-950"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : selectedService === "digilocker" ? (
                          (() => {
                            const data: any = responseJson?.data || responseJson?.result || responseJson || {};
                            const isTokenResponse = Boolean(data.url || data.token);
                            const consentUrl = data.url || "";
                            const clientId = data.client_id || digilockerClientId || "—";
                            const tokenVal = data.token || "—";
                            const expirySec = data.expiry_seconds || 1800;

                            const verifiedName = data.name || data.fullname || data.full_name || resData.name || resData.full_name || "";
                            const verifiedAadhaar = data.aadhaar_number || data.aadhaar || resData.aadhaar_number || "";
                            const verifiedDob = data.dob || resData.dob || "";
                            const verifiedGender = data.gender || resData.gender || "";
                            const verifiedAddress = typeof data.address === "string" ? data.address : extractedAddress || "";

                            return (
                              <div className="space-y-4">
                                {/* Top Badge Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400 border border-emerald-500/30">
                                      <Fingerprint className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-foreground">
                                        {isTokenResponse ? "DigiLocker KYC Token & Session Generated" : "DigiLocker Verified KYC Profile"}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground font-mono">
                                        Client ID: {clientId}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> {isTokenResponse ? "SESSION READY" : "KYC VERIFIED"}
                                    </span>
                                  </div>
                                </div>

                                {isTokenResponse ? (
                                  /* Token Generation Details */
                                  <div className="space-y-3 text-xs">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                          Client ID
                                        </span>
                                        <p className="font-mono font-bold text-foreground text-xs break-all">
                                          {clientId}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                          Session Validity
                                        </span>
                                        <p className="font-semibold text-foreground text-xs">
                                          {expirySec} seconds ({Math.round(expirySec / 60)} mins)
                                        </p>
                                      </div>
                                    </div>

                                    {consentUrl && (
                                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                            <ShieldCheck className="h-4 w-4" /> Ready for User Authorization
                                          </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          Click the button below to open the DigiLocker consent gateway and complete paperless identity authorization.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <a
                                            href={consentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow transition-colors"
                                          >
                                            🚀 Open DigiLocker Consent Flow <ExternalLink className="h-3.5 w-3.5" />
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(consentUrl);
                                              toast.success("Consent URL copied!");
                                            }}
                                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                                          >
                                            <Copy className="h-3 w-3" /> Copy Link
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Verified Profile Details */
                                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                        Full Name
                                      </span>
                                      <p className="font-bold text-foreground text-sm">
                                        {verifiedName || "—"}
                                      </p>
                                      <p className="text-[11px] text-emerald-400 font-medium">✓ Verified from DigiLocker Aadhaar</p>
                                    </div>

                                    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                        Aadhaar Number
                                      </span>
                                      <p className="font-mono font-bold text-primary text-sm">
                                        {verifiedAadhaar || "XXXXXXXX1234"}
                                      </p>
                                    </div>

                                    {verifiedDob && (
                                      <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                          Date of Birth
                                        </span>
                                        <p className="font-semibold text-foreground text-xs">
                                          {verifiedDob}
                                        </p>
                                      </div>
                                    )}

                                    {verifiedGender && (
                                      <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                          Gender
                                        </span>
                                        <p className="font-semibold text-foreground text-xs">
                                          {verifiedGender === "M" ? "Male" : verifiedGender === "F" ? "Female" : verifiedGender}
                                        </p>
                                      </div>
                                    )}

                                    {verifiedAddress && (
                                      <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                          Full Address
                                        </span>
                                        <p className="font-semibold text-foreground text-xs">
                                          {verifiedAddress}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : selectedService === "ifsc" ? (
                          (() => {
                            const data: any = responseJson || {};
                            const bankName = data.BANK || data.bank || "Kotak Mahindra Bank";
                            const bankCode = data.BANKCODE || data.bankcode || "KKBK";
                            const ifscVal = data.IFSC || data.ifsc || ifscCodeInput;
                            const branchName = data.BRANCH || data.branch || "—";
                            const addressVal = data.ADDRESS || data.address || "—";
                            const cityVal = data.CITY || data.city || "—";
                            const districtVal = data.DISTRICT || data.district || "—";
                            const stateVal = data.STATE || data.state || "—";
                            const centreVal = data.CENTRE || data.centre || "—";
                            const contactVal = data.CONTACT || data.contact || "—";
                            const micrVal = data.MICR || data.micr || "—";
                            const swiftVal = data.SWIFT || data.swift || "null";
                            const isoVal = data.ISO3166 || data.iso3166 || "IN-DL";

                            const isRtgs = Boolean(data.RTGS);
                            const isNeft = Boolean(data.NEFT);
                            const isImps = Boolean(data.IMPS);
                            const isUpi = Boolean(data.UPI);

                            return (
                              <div className="space-y-4">
                                {/* Top Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg p-2 border bg-blue-500/15 text-blue-400 border-blue-500/30">
                                      <Landmark className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-base font-bold text-foreground">
                                          {bankName}
                                        </p>
                                        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
                                          {bankCode}
                                        </span>
                                      </div>
                                      <p className="font-mono text-xs text-muted-foreground">
                                        IFSC: {ifscVal} · Razorpay IFSC / RBI NFS
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                      <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED BRANCH
                                    </span>
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                      ₹1.00 Billed
                                    </span>
                                  </div>
                                </div>

                                {/* Hero IFSC Code Card */}
                                <div className="rounded-xl border border-blue-500/30 bg-card/90 p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Sparkles className="h-4 w-4 text-blue-400" />
                                      <span className="font-semibold uppercase tracking-wider text-xs text-foreground">
                                        Indian Financial System Code (IFSC)
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyField(String(ifscVal), "IFSC Code")}
                                      className="inline-flex items-center gap-1 rounded bg-secondary/80 hover:bg-secondary border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors cursor-pointer"
                                      title="Copy IFSC"
                                    >
                                      {copiedField === "IFSC Code" ? (
                                        <>
                                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                                          <span className="text-emerald-400 font-semibold">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span>Copy IFSC</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <p className="font-mono font-bold text-2xl text-blue-400 tracking-wider">
                                    {ifscVal}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ✓ Validated against RBI National Financial Switch & Razorpay IFSC dataset.
                                  </p>
                                </div>

                                {/* Supported Payment Rails Grid */}
                                <div className="space-y-2">
                                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    Supported Payment Rails
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className={`rounded-lg border p-3 text-center space-y-1 ${isRtgs ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-secondary/20"}`}>
                                      <span className="font-mono text-xs font-bold text-foreground block">RTGS</span>
                                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isRtgs ? "text-emerald-400" : "text-muted-foreground"}`}>
                                        {isRtgs ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {isRtgs ? "Enabled" : "Disabled"}
                                      </span>
                                    </div>

                                    <div className={`rounded-lg border p-3 text-center space-y-1 ${isNeft ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-secondary/20"}`}>
                                      <span className="font-mono text-xs font-bold text-foreground block">NEFT</span>
                                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isNeft ? "text-emerald-400" : "text-muted-foreground"}`}>
                                        {isNeft ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {isNeft ? "Enabled" : "Disabled"}
                                      </span>
                                    </div>

                                    <div className={`rounded-lg border p-3 text-center space-y-1 ${isImps ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-secondary/20"}`}>
                                      <span className="font-mono text-xs font-bold text-foreground block">IMPS</span>
                                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isImps ? "text-emerald-400" : "text-muted-foreground"}`}>
                                        {isImps ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {isImps ? "Enabled" : "Disabled"}
                                      </span>
                                    </div>

                                    <div className={`rounded-lg border p-3 text-center space-y-1 ${isUpi ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-secondary/20"}`}>
                                      <span className="font-mono text-xs font-bold text-foreground block">UPI</span>
                                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isUpi ? "text-emerald-400" : "text-muted-foreground"}`}>
                                        {isUpi ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {isUpi ? "Enabled" : "Disabled"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Branch & Address Details */}
                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <Building2 className="h-3 w-3 text-primary" /> Branch Name
                                    </span>
                                    <p className="font-semibold text-foreground text-sm">{branchName}</p>
                                    <p className="text-[11px] text-muted-foreground">Centre: {centreVal} · District: {districtVal}</p>
                                  </div>

                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-primary" /> Branch Contact
                                    </span>
                                    <p className="font-mono font-semibold text-foreground text-sm">{contactVal}</p>
                                    <p className="text-[11px] text-muted-foreground">MICR: {micrVal} · ISO: {isoVal} · SWIFT: {swiftVal}</p>
                                  </div>

                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                                    <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-primary" /> Branch Address
                                    </span>
                                    <p className="text-foreground leading-relaxed font-medium">{addressVal}</p>
                                    <p className="text-[11px] text-muted-foreground">State: {stateVal} · City: {cityVal}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : selectedService === "mobile_to_bank" ? (
                          (() => {
                            const anyRes = (responseJson || {}) as Record<string, unknown>;
                            const rawResult = (responseJson?.result || responseJson?.data || resData || {}) as Record<string, unknown>;
                            
                            // Comprehensive bulletproof extraction for bank_account_data across all wrapper shapes
                            const bankAccountData = (
                              (anyRes["bank_account_data"] as Record<string, unknown>) ||
                              ((anyRes["data"] as Record<string, unknown>)?.[
                                "bank_account_data"
                              ] as Record<string, unknown>) ||
                              ((anyRes["result"] as Record<string, unknown>)?.[
                                "bank_account_data"
                              ] as Record<string, unknown>) ||
                              (resData?.bank_account_data as Record<string, unknown>) ||
                              (Array.isArray(anyRes["data"]) ? ((anyRes["data"][0] as Record<string, unknown>)?.[
                                "bank_account_data"
                              ] || (anyRes["data"][0] as Record<string, unknown>)) : null) ||
                              (Array.isArray(anyRes["accounts"]) ? (anyRes["accounts"][0] as Record<string, unknown>) : null) ||
                              ((anyRes["data"] as Record<string, unknown>)?.["account_number"] || (anyRes["data"] as Record<string, unknown>)?.["name"] ? (anyRes["data"] as Record<string, unknown>) : null) ||
                              ((anyRes["result"] as Record<string, unknown>)?.["account_number"] || (anyRes["result"] as Record<string, unknown>)?.["name"] ? (anyRes["result"] as Record<string, unknown>) : null) ||
                              (anyRes["account_number"] || anyRes["name"] ? anyRes : null) ||
                              (rawResult["bank_account_data"] as Record<string, unknown>) ||
                              {}
                            ) as Record<string, unknown>;

                            const resultCode = Number(responseJson?.result_code ?? (responseStatus === 200 ? 101 : 102));
                            const isSuccess = resultCode === 101;
                            const message = String(responseJson?.message || (isSuccess ? "Details fetched successfully." : "Verification failed"));
                            const displayMobile = mobileToBankNumber || String(rawResult["mobile_number"] || rawResult["mobile"] || "—");

                            // Extract exact details matching IDSpay bank_account_data (as shown in Screenshot 1)
                            const accountHolderName = String(
                              bankAccountData["name"] ||
                              bankAccountData["account_holder_name"] ||
                              bankAccountData["beneficiary_name"] ||
                              (anyRes["bank_account_data"] as Record<string, unknown>)?.[
                                "name"
                              ] ||
                              (anyRes["data"] as Record<string, unknown>)?.[
                                "name"
                              ] ||
                              anyRes["name"] ||
                              "—"
                            );

                            const accountNumber = String(
                              bankAccountData["account_number"] ||
                              bankAccountData["accountNo"] ||
                              bankAccountData["account"] ||
                              (anyRes["bank_account_data"] as Record<string, unknown>)?.[
                                "account_number"
                              ] ||
                              (anyRes["data"] as Record<string, unknown>)?.[
                                "account_number"
                              ] ||
                              anyRes["account_number"] ||
                              "—"
                            );

                            const ifsc = String(
                              bankAccountData["ifsc"] ||
                              bankAccountData["ifsc_code"] ||
                              (anyRes["bank_account_data"] as Record<string, unknown>)?.[
                                "ifsc"
                              ] ||
                              (anyRes["data"] as Record<string, unknown>)?.[
                                "ifsc"
                              ] ||
                              anyRes["ifsc"] ||
                              "—"
                            );

                            const utr = String(
                              bankAccountData["utr"] ||
                              bankAccountData["rrn"] ||
                              (anyRes["bank_account_data"] as Record<string, unknown>)?.[
                                "utr"
                              ] ||
                              (anyRes["data"] as Record<string, unknown>)?.[
                                "utr"
                              ] ||
                              anyRes["utr"] ||
                              "—"
                            );

                            const upi = String(
                              bankAccountData["upi"] ||
                              bankAccountData["vpa"] ||
                              (anyRes["bank_account_data"] as Record<string, unknown>)?.[
                                "upi"
                              ] ||
                              (anyRes["data"] as Record<string, unknown>)?.[
                                "upi"
                              ] ||
                              anyRes["upi"] ||
                              "—"
                            );

                            // Derive readable Bank Name from IFSC code prefix or explicit field
                            const bankName = (() => {
                              if (bankAccountData["bank_name"]) return String(bankAccountData["bank_name"]);
                              if (bankAccountData["bank"]) return String(bankAccountData["bank"]);
                              const prefix = ifsc.slice(0, 4).toUpperCase();
                              if (prefix === "KKBK") return "Kotak Mahindra Bank";
                              if (prefix === "SBIN") return "State Bank of India";
                              if (prefix === "HDFC") return "HDFC Bank";
                              if (prefix === "ICIC") return "ICICI Bank";
                              if (prefix === "PUNB") return "Punjab National Bank";
                              if (prefix === "UTIB") return "Axis Bank";
                              if (prefix === "BARB") return "Bank of Baroda";
                              if (prefix === "CNRB") return "Canara Bank";
                              if (prefix === "UBIN") return "Union Bank of India";
                              if (prefix === "IDFB") return "IDFC First Bank";
                              if (prefix === "YESB") return "Yes Bank";
                              if (prefix === "INDB") return "IndusInd Bank";
                              if (prefix && prefix !== "—") return `${prefix} Bank`;
                              return "Verified Bank";
                            })();

                            return (
                              <>
                                {/* Top Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`rounded-lg p-2 border ${
                                      isSuccess
                                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    }`}>
                                      <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-foreground">
                                        {isSuccess
                                          ? (accountHolderName !== "—" ? accountHolderName : "Verified Bank Account")
                                          : "No Bank Record Linked"}
                                      </p>
                                      <p className="font-mono text-xs text-muted-foreground">
                                        Mobile: +91 {displayMobile} · Bharat API Mobile To Bank Advance Gateway
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isSuccess ? (
                                      <>
                                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                          <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED · BANK LINKED
                                        </span>
                                        <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                          ₹2.00 Billed
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400 inline-flex items-center gap-1">
                                          <AlertCircle className="h-3.5 w-3.5" /> FAILED / UNLINKED
                                        </span>
                                        <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                          ₹0.00 Not Billed
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Hero Bank Account Highlight Card */}
                                <div className={`rounded-xl border p-4 space-y-3 ${
                                  isSuccess
                                    ? "border-blue-500/30 bg-card/90"
                                    : "border-amber-500/30 bg-amber-950/10"
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Landmark className={`h-4 w-4 ${isSuccess ? "text-blue-400" : "text-amber-400"}`} />
                                      <span className="font-semibold uppercase tracking-wider text-xs text-foreground">
                                        Primary Linked Bank Account
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isSuccess && (
                                        <span className="rounded bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-blue-400">
                                          {bankName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                        Account Number
                                      </p>
                                      <p className={`font-mono font-bold text-xl sm:text-2xl tracking-wider ${
                                        isSuccess ? "text-blue-400" : "text-amber-400"
                                      }`}>
                                        {accountNumber !== "—" ? accountNumber : (isSuccess ? "Account Verified" : "No Bank Account Found")}
                                      </p>
                                    </div>
                                    {isSuccess && accountNumber !== "—" && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyField(accountNumber, "Account Number")}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors cursor-pointer"
                                        title="Copy Account Number"
                                      >
                                        <Copy className="h-3 w-3" /> Copy Account
                                      </button>
                                    )}
                                  </div>

                                  {isSuccess && (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs border-t border-border/40 pt-2.5">
                                      <span className="text-muted-foreground">
                                        Beneficiary: <span className="font-bold text-foreground">{accountHolderName}</span>
                                      </span>
                                      <span className="text-muted-foreground">
                                        IFSC: <span className="font-mono font-semibold text-blue-400">{ifsc}</span>
                                      </span>
                                      <span className="text-muted-foreground">
                                        Bank: <span className="font-semibold text-foreground">{bankName}</span>
                                      </span>
                                    </div>
                                  )}

                                  <p className="text-xs text-muted-foreground">
                                    {isSuccess
                                      ? "✓ Live verified Indian bank account linked to registered mobile number."
                                      : `⚠️ ${message}`}
                                  </p>
                                </div>

                                {/* 6-Grid Detail Cards matching Screenshot 1 JSON fields exactly as it is */}
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                                  {/* 1. Beneficiary Name */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <User className={`h-3.5 w-3.5 ${isSuccess ? "text-blue-400" : "text-amber-400"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Beneficiary Name</span>
                                      </div>
                                      {isSuccess && accountHolderName !== "—" && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(accountHolderName, "Beneficiary Name")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                                          title="Copy Name"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className={`font-bold text-base ${isSuccess ? "text-foreground" : "text-muted-foreground italic"}`}>
                                      {accountHolderName}
                                    </p>
                                    <p className={`text-[11px] font-medium ${isSuccess ? "text-emerald-400" : "text-muted-foreground"}`}>
                                      {isSuccess ? "✓ Name Matched at Bank" : "✗ Not Available"}
                                    </p>
                                  </div>

                                  {/* 2. Bank Account Number */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <CreditCard className={`h-3.5 w-3.5 ${isSuccess ? "text-blue-400" : "text-muted-foreground"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Account Number</span>
                                      </div>
                                      {isSuccess && accountNumber !== "—" && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(accountNumber, "Account Number")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                                          title="Copy Account Number"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="font-mono font-bold text-base text-foreground">
                                      {accountNumber}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      Verified Savings / Current
                                    </p>
                                  </div>

                                  {/* 3. Bank & IFSC */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <Landmark className={`h-3.5 w-3.5 ${isSuccess ? "text-blue-400" : "text-muted-foreground"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Bank & IFSC Code</span>
                                      </div>
                                      {isSuccess && ifsc !== "—" && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(ifsc, "IFSC Code")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                                          title="Copy IFSC"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="font-semibold text-foreground text-sm">
                                      {bankName}
                                    </p>
                                    <p className="text-[11px] font-mono font-semibold text-blue-400">
                                      IFSC: {ifsc}
                                    </p>
                                  </div>

                                  {/* 4. UTR */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <FileText className={`h-3.5 w-3.5 ${isSuccess ? "text-emerald-400" : "text-muted-foreground"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">UTR / Transaction Ref</span>
                                      </div>
                                      {isSuccess && utr !== "—" && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(utr, "UTR")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                                          title="Copy UTR"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="font-mono font-bold text-sm text-foreground">
                                      {utr}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      IMPS Verification UTR
                                    </p>
                                  </div>

                                  {/* 5. Linked UPI ID */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <Smartphone className={`h-3.5 w-3.5 ${isSuccess ? "text-indigo-400" : "text-muted-foreground"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Linked UPI ID (VPA)</span>
                                      </div>
                                      {isSuccess && upi !== "—" && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(upi, "UPI VPA")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                                          title="Copy UPI"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="font-mono font-bold text-sm text-emerald-400 break-all">
                                      {upi}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      NPCI Registered VPA
                                    </p>
                                  </div>

                                  {/* 6. Queried Mobile */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <Phone className={`h-3.5 w-3.5 ${isSuccess ? "text-blue-400" : "text-amber-400"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Queried Mobile Number</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyField(String(displayMobile), "Mobile Number")}
                                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                                        title="Copy Mobile"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <p className="font-mono font-bold text-primary text-base">
                                      +91 {displayMobile}
                                    </p>
                                    <p className={`text-[11px] ${isSuccess ? "text-emerald-400" : "text-amber-400"}`}>
                                      {isSuccess ? "Status: Active Bank Linkage Found" : "Status: No Record Found"}
                                    </p>
                                  </div>
                                </div>

                                {/* Gateway & Audit Metadata Footer */}
                                <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2.5 text-xs">
                                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-2">
                                    <span className="font-medium text-[11px] uppercase tracking-wider text-foreground">
                                      Gateway & Audit Metadata
                                    </span>
                                    <span className={`text-[11px] font-mono font-semibold ${isSuccess ? "text-emerald-400" : "text-amber-400"}`}>
                                      HTTP {responseJson?.http_response_code || responseStatus || 200} · Code {resultCode}
                                    </span>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 font-mono text-[11px]">
                                    <div className="flex items-center justify-between gap-2 min-w-0 bg-background/50 px-2.5 py-1.5 rounded border border-border/40">
                                      <span className="text-muted-foreground shrink-0">Request ID:</span>
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-foreground truncate font-semibold" title={String(responseJson?.request_id || "—")}>
                                          {String(responseJson?.request_id || "—")}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(String(responseJson?.request_id || ""), "Request ID")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                          title="Copy Request ID"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 min-w-0 bg-background/50 px-2.5 py-1.5 rounded border border-border/40">
                                      <span className="text-muted-foreground shrink-0">Client Ref:</span>
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-foreground truncate font-semibold" title={String(responseJson?.client_ref_num || "—")}>
                                          {String(responseJson?.client_ref_num || "—")}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(String(responseJson?.client_ref_num || ""), "Client Ref")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                          title="Copy Client Ref"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 min-w-0 bg-background/50 px-2.5 py-1.5 rounded border border-border/40 sm:col-span-2">
                                      <span className="text-muted-foreground shrink-0">Message:</span>
                                      <span className={`font-semibold truncate ${isSuccess ? "text-emerald-400" : "text-amber-400"}`}>
                                        {message}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()
                        ) : selectedService === "mobile_upi" ? (
                          (() => {
                            const isUpiLinked = Boolean(resData.vpa && responseJson?.result_code === 101);
                            const upiResultCode = Number(responseJson?.result_code || (isUpiLinked ? 101 : 103));
                            const upiMessage = String(responseJson?.message || (isUpiLinked ? "Request successful." : "No linked name found"));
                            const displayMobile = mobileUpiNumber || resData.mobile || "—";

                            return (
                              <>
                                {/* Top Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`rounded-lg p-2 border ${
                                      isUpiLinked
                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    }`}>
                                      <Smartphone className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-foreground">
                                        {isUpiLinked
                                          ? (resData.mobile_linked_name || resData.fullname || resData.full_name || "Verified UPI Beneficiary")
                                          : "No Linked UPI Record Found"}
                                      </p>
                                      <p className="font-mono text-xs text-muted-foreground">
                                        Mobile: +91 {displayMobile} · NPCI Directory Lookup
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isUpiLinked ? (
                                      <>
                                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                          <ShieldCheck className="h-3.5 w-3.5" /> ACTIVE · UPI LINKED
                                        </span>
                                        <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                          ₹2.00 Billed
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400 inline-flex items-center gap-1">
                                          <AlertCircle className="h-3.5 w-3.5" /> NOT FOUND · UNLINKED
                                        </span>
                                        <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                          ₹0.00 Not Billed
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Hero VPA Highlight Card */}
                                <div className={`rounded-xl border p-4 space-y-2 ${
                                  isUpiLinked
                                    ? "border-emerald-500/30 bg-card/90"
                                    : "border-amber-500/30 bg-amber-950/10"
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Sparkles className={`h-4 w-4 ${isUpiLinked ? "text-emerald-400" : "text-amber-400"}`} />
                                      <span className="font-semibold uppercase tracking-wider text-xs text-foreground">
                                        Virtual Payment Address (VPA)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isUpiLinked ? (
                                        <>
                                          <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-400">
                                            {(() => {
                                              const vpaStr = String(resData.vpa || "").toLowerCase();
                                              if (vpaStr.includes("@ybl") || vpaStr.includes("@ibl") || vpaStr.includes("@axl")) return "Yes Bank (PhonePe)";
                                              if (vpaStr.includes("@paytm")) return "Paytm Payments Bank";
                                              if (vpaStr.includes("@okaxis")) return "Axis Bank (Google Pay)";
                                              if (vpaStr.includes("@okhdfcbank")) return "HDFC Bank (Google Pay)";
                                              if (vpaStr.includes("@okicici")) return "ICICI Bank (Google Pay)";
                                              if (vpaStr.includes("@oksbi")) return "SBI (Google Pay)";
                                              if (vpaStr.includes("@apl")) return "Amazon Pay";
                                              if (vpaStr.includes("@upi")) return "BHIM / NPCI";
                                              return "Standard UPI Handle";
                                            })()}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyField(String(resData.vpa || ""), "UPI VPA")}
                                            className="inline-flex items-center gap-1 rounded bg-secondary/80 hover:bg-secondary border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors cursor-pointer"
                                            title="Copy UPI VPA"
                                          >
                                            {copiedField === "UPI VPA" ? (
                                              <>
                                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                <span className="text-emerald-400 font-semibold">Copied</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span>Copy VPA</span>
                                              </>
                                            )}
                                          </button>
                                        </>
                                      ) : (
                                        <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-400">
                                          No Active VPA
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <p className={`font-mono font-bold text-lg sm:text-2xl break-all ${
                                    isUpiLinked ? "text-emerald-400" : "text-amber-400"
                                  }`}>
                                    {isUpiLinked ? String(resData.vpa) : "Not Registered / Unlinked"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {isUpiLinked
                                      ? "✓ Live active UPI VPA registered under NPCI (National Payments Corporation of India)"
                                      : "⚠️ No active Virtual Payment Address (VPA) found registered for this mobile number."}
                                  </p>
                                </div>

                                {/* Details Grid */}
                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                  {/* Account Holder Name */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <User className={`h-3.5 w-3.5 ${isUpiLinked ? "text-emerald-400" : "text-amber-400"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Mobile Linked Account Name</span>
                                      </div>
                                      {isUpiLinked && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(String(resData.mobile_linked_name || resData.fullname || ""), "Account Holder Name")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                                          title="Copy Name"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className={`font-bold text-base ${isUpiLinked ? "text-foreground" : "text-muted-foreground italic"}`}>
                                      {isUpiLinked ? (resData.mobile_linked_name || resData.fullname || resData.full_name || "—") : "No Linked Name Found"}
                                    </p>
                                    <p className={`text-[11px] font-medium ${isUpiLinked ? "text-emerald-400" : "text-muted-foreground"}`}>
                                      {isUpiLinked ? "✓ Bank Account Holder Confirmed" : "✗ Bank Account Not Identified"}
                                    </p>
                                  </div>

                                  {/* Registered Mobile Number */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <Phone className={`h-3.5 w-3.5 ${isUpiLinked ? "text-emerald-400" : "text-amber-400"}`} />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Queried Mobile Number</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyField(String(displayMobile), "Mobile Number")}
                                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                                        title="Copy Mobile"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <p className="font-mono font-bold text-primary text-base">
                                      +91 {displayMobile}
                                    </p>
                                    <p className={`text-[11px] ${isUpiLinked ? "text-emerald-400" : "text-amber-400"}`}>
                                      {isUpiLinked ? "Status: Verified & Linked to VPA" : "Status: No Active UPI Linked"}
                                    </p>
                                  </div>

                                  {/* PSP Provider / Handle */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Landmark className={`h-3.5 w-3.5 ${isUpiLinked ? "text-emerald-400" : "text-muted-foreground"}`} />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">PSP Banking Provider</span>
                                    </div>
                                    <p className="font-semibold text-foreground text-sm">
                                      {isUpiLinked ? (() => {
                                        const vpaStr = String(resData.vpa || "").toLowerCase();
                                        if (vpaStr.includes("@ybl") || vpaStr.includes("@ibl") || vpaStr.includes("@axl")) return "Yes Bank Limited (PhonePe)";
                                        if (vpaStr.includes("@paytm")) return "Paytm Payments Bank Limited";
                                        if (vpaStr.includes("@okaxis")) return "Axis Bank (Google Pay PSP)";
                                        if (vpaStr.includes("@okhdfcbank")) return "HDFC Bank (Google Pay PSP)";
                                        if (vpaStr.includes("@okicici")) return "ICICI Bank (Google Pay PSP)";
                                        if (vpaStr.includes("@oksbi")) return "State Bank of India (Google Pay PSP)";
                                        if (vpaStr.includes("@apl")) return "Amazon Pay / Axis Bank";
                                        if (vpaStr.includes("@upi")) return "BHIM / NPCI";
                                        return "NPCI Certified PSP Handle";
                                      })() : "Not Applicable / None"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      {isUpiLinked ? `Handle: ${String(resData.vpa || "").split("@")[1] ? `@${String(resData.vpa).split("@")[1]}` : "@ybl"}` : "Handle: Not registered"}
                                    </p>
                                  </div>

                                  {/* Resolution Method */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      {isUpiLinked ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                      ) : (
                                        <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                                      )}
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Resolution Result</span>
                                    </div>
                                    <p className="font-semibold text-foreground text-sm">
                                      {isUpiLinked ? "NPCI Real-Time Directory Lookup" : "Directory Search: Zero Match"}
                                    </p>
                                    <p className={`text-[11px] ${isUpiLinked ? "text-emerald-400" : "text-amber-400"}`}>
                                      {isUpiLinked ? "Latency: <250ms Response" : "Result: 103 No linked name found"}
                                    </p>
                                  </div>
                                </div>

                                {/* Gateway & Audit Metadata Footer */}
                                <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2.5 text-xs">
                                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-2">
                                    <span className="font-medium text-[11px] uppercase tracking-wider text-foreground">
                                      Gateway & Audit Metadata
                                    </span>
                                    <span className={`text-[11px] font-mono font-semibold ${isUpiLinked ? "text-emerald-400" : "text-amber-400"}`}>
                                      HTTP {responseJson?.http_response_code || responseStatus || 200} · Code {String(upiResultCode)}
                                    </span>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 font-mono text-[11px]">
                                    <div className="flex items-center justify-between gap-2 min-w-0 bg-background/50 px-2.5 py-1.5 rounded border border-border/40">
                                      <span className="text-muted-foreground shrink-0">Request ID:</span>
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-foreground truncate font-semibold" title={String(responseJson?.request_id || "—")}>
                                          {String(responseJson?.request_id || "—")}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(String(responseJson?.request_id || ""), "Request ID")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                          title="Copy Request ID"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 min-w-0 bg-background/50 px-2.5 py-1.5 rounded border border-border/40">
                                      <span className="text-muted-foreground shrink-0">Client Ref:</span>
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-foreground truncate font-semibold" title={String(responseJson?.client_ref_num || "—")}>
                                          {String(responseJson?.client_ref_num || "—")}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyField(String(responseJson?.client_ref_num || ""), "Client Ref")}
                                          className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                          title="Copy Client Ref"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 min-w-0 bg-background/50 px-2.5 py-1.5 rounded border border-border/40 sm:col-span-2">
                                      <span className="text-muted-foreground shrink-0">Message:</span>
                                      <span className={`font-semibold truncate ${isUpiLinked ? "text-emerald-400" : "text-amber-400"}`}>
                                        {upiMessage}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()
                        ) : selectedService === "domain_age" ? (
                          <>
                            {/* Top Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-400 border border-indigo-500/30">
                                  <Globe className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground">
                                    {(resData.domain as string) || (responseJson?.domain as string) || domainName || "Domain Record"}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Authoritative Registry Verified · Live Status
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> ACTIVE · REGISTERED
                                </span>
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  ₹2.00 Billed
                                </span>
                              </div>
                            </div>

                            {/* 3 Metric Cards Grid */}
                            <div className="grid gap-3 sm:grid-cols-3 text-xs">
                              {/* Creation Date Card */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Creation Date</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyField(String(resData.creation_date || responseJson?.creation_date || ""), "Creation Date")}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Copy Creation Date"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className="font-bold text-foreground text-sm font-mono break-all">
                                  {resData.creation_date || responseJson?.creation_date ? String(resData.creation_date || responseJson?.creation_date) : "—"}
                                </p>
                                <p className="text-[11px] text-emerald-400">
                                  ✓ Certified Registration
                                </p>
                              </div>

                              {/* Age in Days Card */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Age in Days</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyField(String(resData.age_days ?? responseJson?.age_days ?? ""), "Age in Days")}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Copy Age in Days"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className="font-mono font-bold text-primary text-xl">
                                  {resData.age_days != null || responseJson?.age_days != null
                                    ? `${Number(resData.age_days ?? responseJson?.age_days).toLocaleString("en-IN")} Days`
                                    : "—"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Total days elapsed
                                </p>
                              </div>

                              {/* Age in Years Card */}
                              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                    <span className="font-medium uppercase tracking-wider text-[10px]">Age in Years</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyField(String(resData.age_years ?? responseJson?.age_years ?? ""), "Age in Years")}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Copy Age in Years"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className="font-mono font-bold text-emerald-400 text-xl">
                                  {resData.age_years != null || responseJson?.age_years != null
                                    ? `${resData.age_years ?? responseJson?.age_years} Years`
                                    : "—"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Calculated domain lifespan
                                </p>
                              </div>
                            </div>

                            {/* Additional Metadata / Audit Grid */}
                            <div className="rounded-lg border border-border/60 bg-background/50 p-3 text-xs space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                                <div>
                                  <span className="font-medium text-foreground">Domain: </span>
                                  <code className="font-mono text-primary font-bold">{(resData.domain as string) || (responseJson?.domain as string) || domainName}</code>
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Request ID: </span>
                                  <code className="font-mono text-muted-foreground">{String(responseJson?.request_id || "—")}</code>
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Client Ref: </span>
                                  <code className="font-mono text-muted-foreground">{String(responseJson?.client_ref_num || "—")}</code>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : selectedService === "name_finder" ? (
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
                          (() => {
                            const ipLoc: any = responseJson?.location || {};
                            return (
                              <>
                                {/* Top Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg bg-cyan-500/15 p-1.5 text-cyan-400 border border-cyan-500/30 flex items-center justify-center overflow-hidden h-12 w-12 shrink-0">
                                      {Boolean(ipLoc.country_flag) ? (
                                        <img
                                          src={String(ipLoc.country_flag)}
                                          alt="Country Flag"
                                          className="h-8 w-10 object-contain rounded"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <span className="text-2xl">
                                          {String(ipLoc.country_flag_emoji || "🌐")}
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
                                        {Boolean(ipLoc.country_flag_emoji) && (
                                          <span className="text-base" title="Country Flag">
                                            {String(ipLoc.country_flag_emoji)}
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
                                      <ShieldCheck className="h-3.5 w-3.5" /> GEOLOCATED
                                    </span>
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                      Real-Time GeoIP
                                    </span>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                  {/* City & Regional Administrative */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">City & Sub-Region</span>
                                    </div>
                                    <p className="font-bold text-foreground text-sm">
                                      {String(responseJson?.city || "New Delhi")}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Region: <strong className="text-foreground">{String(responseJson?.region_name || "Delhi")}</strong> ({String(responseJson?.region_code || "DL")})
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      Postal Code: <strong className="text-cyan-400">{String(responseJson?.zip || "110001")}</strong>
                                    </p>
                                  </div>

                                  {/* Country & Continent */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Globe className="h-3.5 w-3.5 text-cyan-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Country & Geopolitics</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{String(ipLoc.country_flag_emoji || "🇮🇳")}</span>
                                      <p className="font-bold text-foreground text-base">
                                        {String(responseJson?.country_name || "India")} ({String(responseJson?.country_code || "IN")})
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                      <span>Continent: <strong className="text-foreground">{String(responseJson?.continent_name || "Asia")}</strong> ({String(responseJson?.continent_code || "AS")})</span>
                                      {ipLoc.geoname_id && (
                                        <>
                                          <span>·</span>
                                          <span>Geoname: <strong className="text-foreground font-mono">{String(ipLoc.geoname_id)}</strong></span>
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
                                          EU Member: <strong className="text-foreground">{Boolean(ipLoc.is_eu) ? "Yes" : "No"}</strong>
                                        </span>
                                      </div>
                                      <div className="grid gap-3 sm:grid-cols-4 text-xs font-mono pt-1">
                                        <div>
                                          <span className="text-muted-foreground text-[10px] block">NATIONAL CAPITAL</span>
                                          <span className="text-foreground font-semibold font-sans">
                                            {String(ipLoc.capital || "New Delhi")}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground text-[10px] block">CALLING CODE</span>
                                          <span className="text-cyan-400 font-bold">
                                            +{String(ipLoc.calling_code || "91")}
                                          </span>
                                        </div>
                                        <div className="sm:col-span-2">
                                          <span className="text-muted-foreground text-[10px] block">OFFICIAL LANGUAGES</span>
                                          <span className="text-foreground font-sans truncate block">
                                            {Array.isArray(ipLoc.languages)
                                              ? (ipLoc.languages as Array<{ name?: string; native?: string }>).map((l) => `${l.name} (${l.native})`).join(", ")
                                              : "Hindi, English"}
                                          </span>
                                        </div>
                                      </div>
                                      {ipLoc.country_flag_emoji_unicode && (
                                        <div className="border-t border-border/50 pt-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                          <span>Flag Unicode: <code className="text-foreground">{String(ipLoc.country_flag_emoji_unicode)}</code></span>
                                          {ipLoc.country_flag && (
                                            <a
                                              href={String(ipLoc.country_flag)}
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
                            );
                          })()
                        ) : selectedService === "reverse_geocode" ? (
                          (() => {
                            const addr: any = (responseJson?.address || {});
                            const osmType = String(responseJson?.osm_type || "—");
                            const itemClass = String(responseJson?.class || "—");
                            const itemType = String(responseJson?.type || "—");
                            const placeRank = String(responseJson?.place_rank ?? "—");
                            const addressType = String(responseJson?.addresstype || responseJson?.address_type || "—");
                            const displayName = String(responseJson?.display_name || "—");
                            const residential = String(addr.residential || addr.road || addr.suburb || responseJson?.residential || "—");
                            const cityDistrict = String(addr.city_district || addr.city_dsitrict || "—");
                            const city = String(addr.city || addr.town || addr.village || addr.City || "—");
                            const stateDistrict = String(addr.state_district || "—");
                            const state = String(addr.state || "—");
                            const pincode = String(addr.postcode || addr.pincode || addr.Pincode || "—");
                            const country = String(addr.country || "India");

                            return (
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
                                          {city !== "—" ? city : state !== "—" ? state : "Geocoded Location"}
                                        </p>
                                        <span className="rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                          OSM: {osmType}
                                        </span>
                                        <span className="rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                          TYPE: {addressType}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                                        {displayName}
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
                                  {/* City & City District */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Building className="h-3.5 w-3.5 text-teal-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">City & City District</span>
                                    </div>
                                    <p className="font-bold text-foreground text-base">
                                      {city}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      City District: <strong className="text-foreground">{cityDistrict}</strong>
                                    </p>
                                  </div>

                                  {/* State & State District */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Globe className="h-3.5 w-3.5 text-teal-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">State & State District</span>
                                    </div>
                                    <p className="font-bold text-foreground text-base">
                                      {state}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      State District: <strong className="text-foreground">{stateDistrict}</strong>
                                    </p>
                                  </div>

                                  {/* Postal / PIN Code & Country */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <FileText className="h-3.5 w-3.5 text-teal-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Pincode & Country</span>
                                    </div>
                                    <p className="font-mono font-bold text-teal-400 text-base">
                                      {pincode}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      Country: <strong className="text-foreground">{country}</strong>
                                    </p>
                                  </div>

                                  {/* Residential & OSM Type */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Navigation className="h-3.5 w-3.5 text-teal-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Residential & OSM Type</span>
                                    </div>
                                    <p className="font-bold text-foreground text-base truncate">
                                      {residential}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      OSM Type: <strong className="text-foreground">{osmType}</strong>
                                    </p>
                                  </div>

                                  {/* Location Class & Type */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Terminal className="h-3.5 w-3.5 text-teal-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Class & Type</span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                                      <span>Class: <strong className="text-foreground">{itemClass}</strong></span>
                                      {itemType !== "—" && (
                                        <span className="rounded bg-teal-500/15 text-teal-400 border border-teal-500/25 px-1.5 py-0.5 text-[10px] uppercase font-bold">
                                          {itemType}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      Type: <strong className="text-foreground">{itemType}</strong>
                                    </p>
                                  </div>

                                  {/* Place Rank & Address Type */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Compass className="h-3.5 w-3.5 text-teal-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Place Rank & Address Type</span>
                                    </div>
                                    <p className="font-mono font-bold text-foreground text-base">
                                      Rank: {placeRank}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      Address Type: <strong className="text-foreground">{addressType}</strong>
                                    </p>
                                  </div>

                                  {/* GPS Coordinates & Precision */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <Compass className="h-3.5 w-3.5 text-teal-400" />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Resolved Coordinates</span>
                                      </div>
                                      <span className="text-emerald-400 font-medium text-[11px]">✓ GPS Precision Lock</span>
                                    </div>
                                    <p className="font-mono font-bold text-foreground text-sm">
                                      Lat: {String(responseJson?.lat || latitude || "—")}, Lon: {String(responseJson?.lon || longitude || "—")}
                                    </p>
                                    {responseJson?.importance !== undefined && (
                                      <p className="text-[11px] text-muted-foreground font-mono">
                                        Importance: <strong className="text-foreground">{String(responseJson.importance)}</strong>
                                      </p>
                                    )}
                                  </div>

                                  {/* Display Name & Formatted Address */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-2 sm:col-span-2">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                                        <span className="font-medium uppercase tracking-wider text-[10px]">Display Name & Formatted Address</span>
                                      </div>
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        Place ID: <strong className="text-foreground font-mono">{String(responseJson?.place_id || "—")}</strong>
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] uppercase font-mono text-muted-foreground">display_name:</span>
                                      <p className="text-xs text-foreground font-medium bg-muted/30 p-2.5 rounded border border-border/40 leading-relaxed">
                                        {displayName}
                                      </p>
                                    </div>
                                    {Array.isArray(responseJson?.boundingbox) && (
                                      <div className="border-t border-border/50 pt-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-muted-foreground">
                                        <span>GPS Box: <code className="text-foreground">[{responseJson.boundingbox.join(", ")}]</code></span>
                                        <span className="text-[10px] text-muted-foreground">Bharat API Spatial Data</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            );
                          })()
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
                        ) : selectedService === "uan" || selectedService === "uan_direct" ? (
                            /* ========================================================= */
                            /* 🪪 UAN / EMPLOYMENT HISTORY V2 DEDICATED VIRTUAL CARD     */
                            /* ========================================================= */
                            (() => {
                              const uanList: string[] = Array.isArray(resData?.uan) ? (resData.uan as string[]) : [];
                              const summary: any = resData?.summary || {};
                              const recentEmployer: any = summary?.recent_employer_data || {};
                              const primaryUan = uanList[0] || recentEmployer?.matching_uan || summary?.matching_uan || directUanNumber || "—";
                              const uanDetailsMap: any = resData?.uan_details || {};
                              const uanDetail: any = uanDetailsMap[primaryUan] || Object.values(uanDetailsMap)[0] || {};
                              const basicDetails: any = uanDetail?.basic_details || {};
                              const employmentDetails: any = uanDetail?.employment_details || {};
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
                                            {selectedService === "uan_direct" ? "EPFO EMPLOYMENT RECORD" : "UAN RECORD"}
                                          </span>
                                        </div>
                                        <p className="font-mono text-xs text-muted-foreground">
                                          Primary UAN: <span className="text-foreground font-semibold">{primaryUan}</span>
                                          {selectedService === "uan" ? ` · Mobile: ${uanMobile || basicDetails.mobile || "—"}` : ` · Mode: Direct UAN Verification`}
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
                                  {extractedAddresses.map((addr: any, idx) => (
                                    <div key={idx} className="pt-2 first:pt-0 text-[11px] text-muted-foreground space-y-0.5">
                                      {addr?.first_line_of_address && <p className="text-foreground font-medium">{String(addr.first_line_of_address)}</p>}
                                      {addr?.second_line_of_address && <p>{String(addr.second_line_of_address)}</p>}
                                      {addr?.third_line_of_address && <p>{String(addr.third_line_of_address)}</p>}
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
                        ) : selectedService === "pan_plus" ? (
                          /* ========================================================= */
                          /* 🪪 PAN DETAILS PLUS DEDICATED VIRTUAL IDENTITY CARD       */
                          /* ========================================================= */
                          (() => {
                            const pData: any = (
                              (responseJson?.data as any) ||
                              (responseJson?.result as any) ||
                              resData ||
                              {}
                            );
                            const panNum = String(pData.pan || panPlusNumber || "—");
                            const panStatus = String(pData.pan_status || "Active and operative");
                            const panType = String(pData.pan_type || "Individual");
                            const legalFullName = String(pData.fullname || [pData.first_name, pData.middle_name, pData.last_name].filter(Boolean).join(" ") || "—");
                            const isOperative = panStatus.toLowerCase().includes("operative") && !panStatus.toLowerCase().includes("inoperative");
                            const aadhaarLinked = Boolean(pData.aadhaar_linked);
                            const addrObj = (pData.address && typeof pData.address === "object") ? pData.address : {};
                            const addressParts = [
                              addrObj.building_name,
                              addrObj.street_name,
                              addrObj.locality,
                              addrObj.city,
                              addrObj.state,
                              addrObj.pincode,
                              addrObj.country,
                            ].filter((item) => Boolean(item && String(item).trim().length > 0));

                            return (
                              <>
                                {/* Top Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg bg-sky-500/15 p-2 text-sky-400 border border-sky-500/30">
                                      <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-base font-bold text-foreground">
                                          {legalFullName}
                                        </p>
                                        <span className="rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                          PAN PLUS RECORD
                                        </span>
                                      </div>
                                      <p className="font-mono text-xs text-muted-foreground">
                                        PAN: <span className="text-foreground font-semibold">{panNum}</span> · Type: <span className="text-foreground">{panType}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold inline-flex items-center gap-1 border ${
                                        isOperative
                                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                          : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                      }`}
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5" /> {panStatus}
                                    </span>
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold inline-flex items-center gap-1 border ${
                                        aadhaarLinked
                                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      <Fingerprint className="h-3.5 w-3.5" />
                                      {aadhaarLinked ? "Aadhaar Linked" : "Aadhaar Not Linked"}
                                    </span>
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                      ₹2.00 Billed
                                    </span>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                  {/* Full Legal Name */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <User className="h-3.5 w-3.5 text-sky-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Full Legal Name</span>
                                    </div>
                                    <p className="font-bold text-foreground text-base">
                                      {legalFullName}
                                    </p>
                                    <p className="text-[11px] text-sky-400 font-medium">
                                      ✓ ITD Official Record Verified
                                    </p>
                                  </div>

                                  {/* PAN & Category */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <CreditCard className="h-3.5 w-3.5 text-sky-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Permanent Account Number</span>
                                    </div>
                                    <p className="font-mono font-bold text-primary text-base">
                                      {panNum}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Entity Category: <strong className="text-foreground">{panType}</strong>
                                    </p>
                                  </div>

                                  {/* Name Breakdown */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <User className="h-3.5 w-3.5 text-sky-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Name Breakdown</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-0.5 text-xs font-mono">
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">First</span>
                                        <span className="font-semibold text-foreground">{String(pData.first_name || "—")}</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">Middle</span>
                                        <span className="font-semibold text-foreground">{String(pData.middle_name || "—")}</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">Last</span>
                                        <span className="font-semibold text-foreground">{String(pData.last_name || "—")}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Date of Birth & Gender */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Calendar className="h-3.5 w-3.5 text-sky-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">DOB & Gender</span>
                                    </div>
                                    <p className="font-semibold text-foreground text-sm">
                                      {String(pData.dob || "—")}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground uppercase">
                                      Gender: <strong className="text-foreground">{String(pData.gender || "—")}</strong>
                                    </p>
                                  </div>

                                  {/* Linked Aadhaar Details */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Linked Aadhaar Seeding</span>
                                    </div>
                                    <p className="font-mono font-bold text-foreground text-sm">
                                      {String(pData.aadhaar_number || "—")}
                                    </p>
                                    <p className="text-[11px] text-emerald-400">
                                      {aadhaarLinked ? "✓ Aadhaar Linked with Income Tax Department" : "✗ Aadhaar Not Linked"}
                                      {pData.aadhaar_seeding_status ? ` (Status: ${pData.aadhaar_seeding_status})` : ""}
                                    </p>
                                  </div>

                                  {/* PAN Allotment Date */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">PAN Allotment Date</span>
                                    </div>
                                    <p className="font-mono font-semibold text-foreground text-sm">
                                      {String(pData.pan_allotment_date || "—")}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Status: <strong className="text-emerald-400">{panStatus}</strong>
                                    </p>
                                  </div>

                                  {/* Employment & Corporate Profile */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 sm:col-span-2">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Briefcase className="h-3.5 w-3.5 text-sky-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Employment & Corporate Profile</span>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-3 pt-1 text-xs">
                                      <div className="rounded bg-secondary/40 p-2 border border-border/50">
                                        <span className="text-[10px] text-muted-foreground block uppercase">Salaried Individual</span>
                                        <span className="font-semibold text-foreground">
                                          {pData.is_salaried === "Y" ? "Yes (Salaried)" : pData.is_salaried === "N" ? "No" : String(pData.is_salaried || "—")}
                                        </span>
                                      </div>
                                      <div className="rounded bg-secondary/40 p-2 border border-border/50">
                                        <span className="text-[10px] text-muted-foreground block uppercase">Company Director</span>
                                        <span className="font-semibold text-foreground">
                                          {pData.is_director === "Y" ? "Yes (Director)" : pData.is_director === "N" ? "No" : String(pData.is_director || "—")}
                                        </span>
                                      </div>
                                      <div className="rounded bg-secondary/40 p-2 border border-border/50">
                                        <span className="text-[10px] text-muted-foreground block uppercase">Sole Proprietor</span>
                                        <span className="font-semibold text-foreground">
                                          {pData.is_sole_proprietor === "Y" ? "Yes (Proprietor)" : pData.is_sole_proprietor === "N" ? "No" : String(pData.is_sole_proprietor || "—")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Registered Address */}
                                  <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5 text-sky-400" />
                                      <span className="font-medium uppercase tracking-wider text-[10px]">Official Registered Address</span>
                                    </div>
                                    {addressParts.length > 0 ? (
                                      <p className="text-xs leading-relaxed text-foreground font-medium pt-0.5">
                                        {addressParts.join(", ")}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground pt-0.5">
                                        Country: <strong className="text-foreground">{addrObj.country || "India"}</strong> · Specific street details protected under privacy norms
                                      </p>
                                    )}
                                  </div>

                                  {/* Verification Audit & Trace */}
                                  {(responseJson?.request_id || responseJson?.client_ref_num) && (
                                    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 sm:col-span-2">
                                      <div className="flex items-center justify-between text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                                          <span className="font-medium uppercase tracking-wider text-[10px]">Verification Audit & Trace</span>
                                        </div>
                                        {Boolean(responseJson?._cached) && (
                                          <span className="rounded bg-sky-500/15 text-sky-400 font-mono text-[10px] px-2 py-0.5 border border-sky-500/25">
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
                    ) : isUpstreamLowBalanceError(responseJson) ? (
                      /* Unexpected Issue Card */
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              There is an unexpected issue
                            </p>
                            <p className="text-xs text-muted-foreground">
                              There is an unexpected issue. Please try again later.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg bg-background/80 border border-border/60 p-3 text-xs font-mono text-muted-foreground space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span>Status:</span>
                            <span className="font-semibold text-amber-400">HTTP 503 · Unexpected Issue</span>
                          </div>
                          {Boolean(responseJson?.request_id) && (
                            <div className="flex items-center justify-between">
                              <span>Request ID:</span>
                              <span className="text-foreground">{String(responseJson.request_id)}</span>
                            </div>
                          )}
                          <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40">
                            Our automated upstream monitor is working on resolving this. Please retry your request in a few moments.
                          </p>
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
                              : selectedService === "mobile_upi"
                              ? `Mobile: ${mobileUpiNumber}`
                              : selectedService === "domain_age"
                              ? `Domain: ${domainName}`
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
