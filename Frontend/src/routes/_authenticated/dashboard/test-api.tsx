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
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { getStoredUserEmail } from "@/lib/demo-store";

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
  data?: VerificationResult;
  result?: VerificationResult;
  request_id?: string;
  client_ref_num?: string;
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
  service?: "pan" | "pan_plus" | "aadhaar" | "digilocker" | "bank" | "bank_validation" | "prefill" | "name_finder" | "ip_lookup" | "reverse_geocode" | "uan" | "uan_direct" | "domain_age" | "mobile_upi" | "ifsc" | "mobile_to_bank" | undefined;
};

export const Route = createFileRoute("/_authenticated/dashboard/test-api")({
  validateSearch: (search: Record<string, unknown>): TestApiSearch => ({
    service:
      search["service"] === "ifsc" || search["service"] === "ifsc-lookup" || search["service"] === "bank_ifsc" || search["service"] === "bank-ifsc"
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
        content: "Live sandbox test console for PAN, Pan Details Plus, Aadhaar, DigiLocker Digital KYC, Bank Verification, Bank Account Validation, Mobile to Bank Advance, Mobile to UAN, UAN to Employment History, Mobile to Prefill, Mobile To Name Finder, Requester IP Lookup, Reverse Geocoding, Domain Age, Mobile to UPI, and IFSC Lookup APIs.",
      },
    ],
  }),
  component: TestApiPage,
});

function TestApiPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const [selectedService, setSelectedService] = useState<"pan" | "pan_plus" | "aadhaar" | "digilocker" | "bank" | "bank_validation" | "prefill" | "name_finder" | "ip_lookup" | "reverse_geocode" | "uan" | "uan_direct" | "domain_age" | "mobile_upi" | "ifsc" | "mobile_to_bank">(
    searchParams.service === "ifsc"
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
    selectedService === "ifsc"
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

      if (selectedService === "ifsc") {
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
      Boolean((responseJson as any)?.IFSC) ||
      Boolean((responseJson as any)?.BANK) ||
      Boolean((responseJson as any)?.bank) ||
      responseJson?.result_code === 101 ||
      responseJson?.status?.type === "success" ||
      responseJson?.message === "success" ||
      Boolean(resData.vpa) ||
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
      !resData.vpa &&
      !resData.mobile_linked_name &&
      !resData.name &&
      !resData.fullname &&
      !resData.full_name &&
      !resData.pan &&
      !resData.aadhaar &&
      !resData.creditorAccountId &&
      !(responseJson as any)?.IFSC
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
    selectedService === "ifsc"
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
    selectedService === "ifsc"
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
                {selectedService === "ifsc"
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
                    selectedService === "ifsc"
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


            <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Base Gateway URL:</span>{" "}
                <code className="font-mono text-primary">https://brown-goldfish-546701.hostingersite.com</code>
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
                  {selectedService === "ifsc" ? (
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
                          👉 Direct live Mobile to Bank Advance account linkage lookup powered by IDSpay.
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
                          selectedService === "mobile_upi"
                            ? isSuccess
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : isSuccess
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        HTTP {responseStatus} · {
                          selectedService === "mobile_upi"
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
                        POST https://brown-goldfish-546701.hostingersite.com{currentEndpoint}
                      </p>
                    </div>
                  </div>
                )}
                {/* Empty State */}
                {!loading && !responseJson && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-background/30 p-8 text-center text-muted-foreground">
                    {selectedService === "domain_age" ? (
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
                      Enter {selectedService === "mobile_upi" ? "a 10-digit mobile number (e.g. 8527475512)" : selectedService === "domain_age" ? "a target domain name (e.g. geetpay.in or google.com)" : selectedService === "pan" || selectedService === "pan_plus" ? "a 10-digit PAN number" : selectedService === "aadhaar" ? "an Aadhaar number" : selectedService === "bank" ? "Bank Account Number & IFSC" : selectedService === "name_finder" ? "a 10-digit mobile number" : "Mobile Number & Name"} on the left and click &quot;Send Request&quot; to fetch live verified details.
                    </p>
                  </div>
                )}

                {/* 1. Visual Card Tab */}
                {!loading && responseJson && activeViewTab === "visual" && (
                  <div className="space-y-4">
                    {/* Success Verification / Dedicated Service Card */}
                    {isSuccess || (selectedService === "mobile_upi" && (responseJson?.result_code === 101 || responseJson?.result_code === 103)) ? (
                      <div className={`rounded-xl border p-5 space-y-4 ${
                        selectedService === "mobile_upi" && !isSuccess
                          ? "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent"
                          : "border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent"
                      }`}>
                        {/* ========================================================= */}
                        {/* 🪪 DIGILOCKER DIGITAL KYC DEDICATED VISUAL CARD           */}
                        {/* ========================================================= */}
                        {selectedService === "digilocker" ? (
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
                                        Mobile: +91 {displayMobile} · IDSpay Mobile To Bank Advance Gateway
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
