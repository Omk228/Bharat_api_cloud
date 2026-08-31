export type ApiParam = {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
};

export type ApiEndpoint = {
  id: string;
  group: ApiGroup;
  method: "GET" | "POST" | "DELETE";
  path: string;
  title: string;
  desc: string;
  tags: string[];
  params: ApiParam[];
  /** Sample JSON body for POST endpoints */
  sampleBody?: Record<string, unknown>;
  /** Sample query string params for GET endpoints */
  sampleQuery?: Record<string, string>;
  /** Realistic sandbox response used by the Try-It console when no live provider is configured */
  sampleResponse: Record<string, unknown>;
  latency?: string;
};

export type ApiGroup = "KYC" | "Banking" | "Account Aggregator" | "Payments";

export const API_GROUPS: ApiGroup[] = ["KYC", "Banking", "Account Aggregator", "Payments"];

export const BASE_URL = "https://api.bharatapicloud.io/v1";

export const endpoints: ApiEndpoint[] = [
  /* ---------------- KYC ---------------- */
  {
    id: "verify-pan",
    group: "KYC",
    method: "POST",
    path: "/verify/pan",
    title: "Verify PAN",
    desc: "Validates a Permanent Account Number against the Income Tax Department database, with optional name and date-of-birth matching.",
    tags: ["pan", "income tax", "identity", "nsdl"],
    latency: "~1.4s",
    params: [
      { name: "pan", type: "string", required: true, desc: "10-character PAN, e.g. ABCDE1234F." },
      { name: "name", type: "string", desc: "Full name for fuzzy match against PAN records." },
      { name: "dob", type: "string (YYYY-MM-DD)", desc: "Date of birth for an additional match signal." },
    ],
    sampleBody: { pan: "ABCDE1234F", name: "Aarav Sharma", dob: "1990-04-12" },
    sampleResponse: {
      status: "verified",
      pan_valid: true,
      pan_type: "individual",
      name_match: "exact",
      match_score: 0.98,
      aadhaar_linked: true,
      request_id: "kyc_8f3a2c1d",
    },
  },
  {
    id: "aadhaar-otp",
    group: "KYC",
    method: "POST",
    path: "/verify/aadhaar/otp",
    title: "Aadhaar OTP (DigiLocker)",
    desc: "Step 1 of consent-based Aadhaar verification: sends an OTP to the Aadhaar-linked mobile number and returns a transaction id.",
    tags: ["aadhaar", "digilocker", "otp", "uidai", "consent"],
    latency: "~2.1s",
    params: [
      { name: "aadhaar_number", type: "string", required: true, desc: "12-digit Aadhaar number. Transmitted over TLS, never stored." },
      { name: "consent", type: "boolean", required: true, desc: "Must be true. User consent is mandatory." },
      { name: "consent_id", type: "string", desc: "Your reference to the captured consent artifact." },
    ],
    sampleBody: { aadhaar_number: "999999991234", consent: true, consent_id: "cns_9f21" },
    sampleResponse: { txn_id: "txn_digilocker_9a81f2", otp_sent: true, mobile_hint: "XXXXXX78XX", expires_in: 600 },
  },
  {
    id: "aadhaar-otp-confirm",
    group: "KYC",
    method: "POST",
    path: "/verify/aadhaar/otp/confirm",
    title: "Confirm Aadhaar OTP",
    desc: "Step 2 of Aadhaar verification: exchanges the OTP for the verified demographic KYC record and photo.",
    tags: ["aadhaar", "otp", "confirm", "ekyc"],
    latency: "~1.8s",
    params: [
      { name: "txn_id", type: "string", required: true, desc: "Transaction id returned by the OTP request." },
      { name: "otp", type: "string", required: true, desc: "6-digit OTP entered by the user." },
    ],
    sampleBody: { txn_id: "txn_digilocker_9a81f2", otp: "123456" },
    sampleResponse: {
      status: "verified",
      name: "Aarav Sharma",
      dob: "1990-04-12",
      gender: "M",
      address: { house: "12B", street: "MG Road", district: "Pune", state: "Maharashtra", pincode: "411001" },
      photo_base64: "/9j/4AAQSkZJRgABAQ...",
      request_id: "kyc_2c7e9f44",
    },
  },
  {
    id: "verify-gstin",
    group: "KYC",
    method: "POST",
    path: "/verify/gstin",
    title: "Verify GSTIN",
    desc: "Fetches GST registration details, filing status and the registered business address for a GSTIN.",
    tags: ["gstin", "gst", "business", "kyb"],
    latency: "~1.1s",
    params: [
      { name: "gstin", type: "string", required: true, desc: "15-character GSTIN, e.g. 27AAECV1234C1ZP." },
    ],
    sampleBody: { gstin: "27AAECV1234C1ZP" },
    sampleResponse: {
      status: "verified",
      legal_name: "Bharat API Cloud Technologies Private Limited",
      trade_name: "Bharat API Cloud",
      registration_date: "2019-07-01",
      gst_status: "Active",
      taxpayer_type: "Regular",
      state_jurisdiction: "Maharashtra",
      request_id: "kyb_71ac0e",
    },
  },
  {
    id: "verify-cin",
    group: "KYC",
    method: "POST",
    path: "/verify/cin",
    title: "Verify CIN (MCA)",
    desc: "Looks up company master data from the MCA registry, including directors, status and paid-up capital.",
    tags: ["cin", "mca", "company", "kyb", "directors"],
    latency: "~1.9s",
    params: [{ name: "cin", type: "string", required: true, desc: "21-character Corporate Identification Number." }],
    sampleBody: { cin: "U72900PN2019PTC185432" },
    sampleResponse: {
      status: "verified",
      company_name: "Bharat API Cloud Technologies Private Limited",
      company_status: "Active",
      incorporation_date: "2019-06-24",
      paid_up_capital: 1000000,
      registered_address: "5th Floor, Amar Tech Park, Pune 411014",
      directors: [{ din: "08123456", name: "Aarav Sharma" }],
      request_id: "kyb_5cc9a1",
    },
  },
  {
    id: "document-ocr",
    group: "KYC",
    method: "POST",
    path: "/kyc/ocr",
    title: "Document OCR",
    desc: "Extracts structured fields from an ID document image or PDF and flags tampering signals.",
    tags: ["ocr", "document", "extract", "tamper"],
    latency: "~2.6s",
    params: [
      { name: "document_type", type: "string", required: true, desc: "One of pan, aadhaar, passport, dl, voter_id, cheque." },
      { name: "file_url", type: "string", required: true, desc: "HTTPS URL or base64 data URI of the document." },
    ],
    sampleBody: { document_type: "pan", file_url: "https://files.example.com/pan-front.jpg" },
    sampleResponse: {
      status: "extracted",
      document_type: "pan",
      fields: { pan: "ABCDE1234F", name: "AARAV SHARMA", father_name: "RAJESH SHARMA", dob: "12/04/1990" },
      tamper_score: 0.03,
      confidence: 0.97,
      request_id: "ocr_3ab19c",
    },
  },
  {
    id: "face-liveness",
    group: "KYC",
    method: "POST",
    path: "/kyc/face-match",
    title: "Face match & liveness",
    desc: "Compares a selfie against an ID photo and returns a passive liveness score to block spoof attempts.",
    tags: ["face", "liveness", "selfie", "biometric", "spoof"],
    latency: "~1.7s",
    params: [
      { name: "selfie_url", type: "string", required: true, desc: "HTTPS URL or base64 selfie captured live." },
      { name: "id_photo_url", type: "string", required: true, desc: "HTTPS URL or base64 photo cropped from the ID." },
      { name: "check_liveness", type: "boolean", desc: "Defaults to true. Runs passive liveness detection." },
    ],
    sampleBody: { selfie_url: "https://files.example.com/selfie.jpg", id_photo_url: "https://files.example.com/id.jpg", check_liveness: true },
    sampleResponse: { status: "match", match_score: 0.94, liveness: "real", liveness_score: 0.99, request_id: "face_6e2b8f" },
  },
  {
    id: "verify-voter-id",
    group: "KYC",
    method: "POST",
    path: "/verify/voter-id",
    title: "Verify Voter ID",
    desc: "Validates an EPIC number against the Election Commission roll and returns the elector record.",
    tags: ["voter", "epic", "election commission"],
    latency: "~1.5s",
    params: [{ name: "epic_number", type: "string", required: true, desc: "Voter ID / EPIC number." }],
    sampleBody: { epic_number: "ABC1234567" },
    sampleResponse: {
      status: "verified",
      name: "Aarav Sharma",
      relation_name: "Rajesh Sharma",
      assembly_constituency: "Pune Cantonment",
      state: "Maharashtra",
      request_id: "kyc_voter_44a1",
    },
  },
  {
    id: "verify-dl",
    group: "KYC",
    method: "POST",
    path: "/verify/driving-licence",
    title: "Verify Driving Licence",
    desc: "Validates a driving licence number against the Sarathi/Parivahan database with vehicle class details.",
    tags: ["driving licence", "dl", "parivahan", "sarathi"],
    latency: "~2.0s",
    params: [
      { name: "dl_number", type: "string", required: true, desc: "Driving licence number, e.g. MH12 20190001234." },
      { name: "dob", type: "string (YYYY-MM-DD)", required: true, desc: "Date of birth of the licence holder." },
    ],
    sampleBody: { dl_number: "MH1220190001234", dob: "1990-04-12" },
    sampleResponse: {
      status: "verified",
      name: "Aarav Sharma",
      issue_date: "2019-02-11",
      valid_until: "2039-04-11",
      vehicle_classes: ["LMV", "MCWG"],
      issuing_rto: "Pune (MH12)",
      request_id: "kyc_dl_9812",
    },
  },
  {
    id: "verify-passport",
    group: "KYC",
    method: "POST",
    path: "/verify/passport",
    title: "Verify Passport",
    desc: "Validates a passport file number and date of birth against the Passport Seva records.",
    tags: ["passport", "psk", "travel document"],
    latency: "~2.3s",
    params: [
      { name: "file_number", type: "string", required: true, desc: "Passport application file number." },
      { name: "dob", type: "string (YYYY-MM-DD)", required: true, desc: "Date of birth on the passport." },
    ],
    sampleBody: { file_number: "PN1234567890123", dob: "1990-04-12" },
    sampleResponse: {
      status: "verified",
      name: "AARAV SHARMA",
      passport_type: "P",
      application_type: "fresh",
      issue_date: "2021-08-04",
      request_id: "kyc_pp_1f7c",
    },
  },
  {
    id: "aml-screening",
    group: "KYC",
    method: "POST",
    path: "/kyc/aml-screen",
    title: "AML / PEP screening",
    desc: "Screens a name against global sanctions, PEP and adverse-media watchlists with fuzzy matching.",
    tags: ["aml", "pep", "sanctions", "watchlist", "risk"],
    latency: "~1.2s",
    params: [
      { name: "name", type: "string", required: true, desc: "Full legal name of the individual or entity." },
      { name: "dob", type: "string (YYYY-MM-DD)", desc: "Improves precision and reduces false positives." },
      { name: "country", type: "string", desc: "ISO 3166-1 alpha-2 country code." },
    ],
    sampleBody: { name: "Aarav Sharma", dob: "1990-04-12", country: "IN" },
    sampleResponse: {
      status: "clear",
      risk_level: "low",
      matches: [],
      lists_checked: ["OFAC SDN", "UN Consolidated", "EU", "RBI Caution", "Interpol", "Adverse Media"],
      request_id: "aml_7d20b3",
    },
  },

  /* ---------------- Banking ---------------- */
  {
    id: "bank-penny-drop",
    group: "Banking",
    method: "POST",
    path: "/bank/verify",
    title: "Bank verification (penny drop)",
    desc: "Credits ₹1 to the account to confirm it is live and returns the beneficiary name registered with the bank.",
    tags: ["penny drop", "bank account", "beneficiary", "imps"],
    latency: "~3.2s",
    params: [
      { name: "account_number", type: "string", required: true, desc: "Beneficiary bank account number." },
      { name: "ifsc", type: "string", required: true, desc: "11-character IFSC of the branch." },
      { name: "name", type: "string", desc: "Expected account holder name for fuzzy matching." },
    ],
    sampleBody: { account_number: "50100123456789", ifsc: "HDFC0000123", name: "Aarav Sharma" },
    sampleResponse: {
      status: "verified",
      account_exists: true,
      beneficiary_name: "AARAV SHARMA",
      name_match: "exact",
      match_score: 0.99,
      bank: "HDFC Bank",
      branch: "MG Road, Pune",
      utr: "HDFC2408291234567",
      request_id: "bank_4f81cd",
    },
  },
  {
    id: "bank-reverse-penny",
    group: "Banking",
    method: "POST",
    path: "/bank/reverse-penny-drop",
    title: "Reverse penny drop",
    desc: "Creates a collect request the user pays ₹1 against, verifying account ownership without a name match.",
    tags: ["reverse penny drop", "upi collect", "ownership"],
    latency: "~0.9s",
    params: [
      { name: "customer_ref", type: "string", required: true, desc: "Your internal reference for the user." },
      { name: "redirect_url", type: "string", desc: "Where to send the user after payment." },
    ],
    sampleBody: { customer_ref: "user_8812", redirect_url: "https://yourapp.com/kyc/return" },
    sampleResponse: {
      status: "pending",
      collect_id: "rpd_71ba3c",
      payment_link: "https://pay.bharatapicloud.io/rpd_71ba3c",
      expires_in: 900,
      request_id: "bank_rpd_02f9",
    },
  },
  {
    id: "ifsc-lookup",
    group: "Banking",
    method: "GET",
    path: "/bank/ifsc/{ifsc}",
    title: "IFSC lookup",
    desc: "Returns branch details and supported payment rails for an IFSC code.",
    tags: ["ifsc", "branch", "neft", "rtgs", "lookup"],
    latency: "~120ms",
    params: [{ name: "ifsc", type: "path string", required: true, desc: "11-character IFSC code." }],
    sampleQuery: { ifsc: "HDFC0000123" },
    sampleResponse: {
      ifsc: "HDFC0000123",
      bank: "HDFC Bank",
      branch: "MG Road, Pune",
      address: "Nucleus Mall, Church Road, Pune 411001",
      city: "PUNE",
      state: "MAHARASHTRA",
      micr: "411240002",
      rails: { neft: true, rtgs: true, imps: true, upi: true },
    },
  },
  {
    id: "upi-vpa",
    group: "Banking",
    method: "POST",
    path: "/bank/upi/validate",
    title: "Validate UPI VPA",
    desc: "Checks whether a UPI ID is active and returns the registered payee name.",
    tags: ["upi", "vpa", "payee", "validate"],
    latency: "~800ms",
    params: [{ name: "vpa", type: "string", required: true, desc: "UPI handle, e.g. aarav@okhdfcbank." }],
    sampleBody: { vpa: "aarav@okhdfcbank" },
    sampleResponse: { status: "verified", vpa_valid: true, payee_name: "AARAV SHARMA", psp: "okhdfcbank", request_id: "upi_2b91fe" },
  },
  {
    id: "bank-statement",
    group: "Banking",
    method: "POST",
    path: "/bank/statement/analyse",
    title: "Bank statement analysis",
    desc: "Parses a PDF bank statement and returns income, obligations, bounce count and a cash-flow summary.",
    tags: ["statement", "underwriting", "income", "analysis", "lending"],
    latency: "~6.4s",
    params: [
      { name: "file_url", type: "string", required: true, desc: "HTTPS URL of the PDF statement." },
      { name: "password", type: "string", desc: "PDF password if the statement is protected." },
    ],
    sampleBody: { file_url: "https://files.example.com/statement.pdf", password: "AARA1204" },
    sampleResponse: {
      status: "analysed",
      account_holder: "AARAV SHARMA",
      period: { from: "2026-02-01", to: "2026-07-31" },
      average_monthly_credit: 184500,
      average_monthly_debit: 141200,
      salary_detected: true,
      emi_obligations: 23400,
      bounced_cheques: 0,
      request_id: "stmt_9c31a7",
    },
  },

  /* ---------------- Account Aggregator ---------------- */
  {
    id: "aa-consent",
    group: "Account Aggregator",
    method: "POST",
    path: "/aa/consent",
    title: "Create consent request",
    desc: "Creates an RBI Account Aggregator consent request and returns the redirect URL for the user journey.",
    tags: ["account aggregator", "consent", "rbi", "sahamati"],
    latency: "~1.0s",
    params: [
      { name: "customer_mobile", type: "string", required: true, desc: "Mobile number linked to the user's bank accounts." },
      { name: "fi_types", type: "string[]", required: true, desc: "e.g. [\"DEPOSIT\", \"TERM_DEPOSIT\"]." },
      { name: "purpose_code", type: "string", required: true, desc: "AA purpose code, e.g. 101 for wealth management." },
      { name: "duration_days", type: "integer", desc: "Consent validity window. Defaults to 30." },
    ],
    sampleBody: { customer_mobile: "9876543210", fi_types: ["DEPOSIT"], purpose_code: "101", duration_days: 30 },
    sampleResponse: {
      consent_handle: "cn_8f2a1b7c",
      status: "PENDING",
      redirect_url: "https://aa.bharatapicloud.io/consent/cn_8f2a1b7c",
      expires_at: "2026-08-30T08:00:00Z",
    },
  },
  {
    id: "aa-consent-status",
    group: "Account Aggregator",
    method: "GET",
    path: "/aa/consent/{consent_handle}",
    title: "Consent status",
    desc: "Returns the current state of a consent handle and the linked accounts once approved.",
    tags: ["account aggregator", "consent status", "linked accounts"],
    latency: "~150ms",
    params: [{ name: "consent_handle", type: "path string", required: true, desc: "Handle returned when the consent was created." }],
    sampleQuery: { consent_handle: "cn_8f2a1b7c" },
    sampleResponse: {
      consent_handle: "cn_8f2a1b7c",
      status: "ACTIVE",
      consent_id: "cid_44f0a2",
      accounts: [{ fip: "HDFC", masked_account: "XXXXXX6789", fi_type: "DEPOSIT" }],
      approved_at: "2026-08-29T07:55:12Z",
    },
  },
  {
    id: "aa-fetch-fi",
    group: "Account Aggregator",
    method: "POST",
    path: "/aa/fi/fetch",
    title: "Fetch financial data",
    desc: "Requests a financial information session for an active consent and returns decrypted transaction data.",
    tags: ["account aggregator", "fi fetch", "transactions", "session"],
    latency: "~4.8s",
    params: [
      { name: "consent_id", type: "string", required: true, desc: "Active consent id." },
      { name: "from", type: "string (ISO 8601)", required: true, desc: "Start of the data range." },
      { name: "to", type: "string (ISO 8601)", required: true, desc: "End of the data range." },
    ],
    sampleBody: { consent_id: "cid_44f0a2", from: "2026-05-01T00:00:00Z", to: "2026-08-01T00:00:00Z" },
    sampleResponse: {
      session_id: "sess_1ad9c4",
      status: "COMPLETED",
      accounts: [
        {
          masked_account: "XXXXXX6789",
          balance: 148230.55,
          transactions: [
            { date: "2026-07-31", type: "CREDIT", amount: 185000, narration: "SALARY JUL 2026" },
            { date: "2026-07-05", type: "DEBIT", amount: 23400, narration: "EMI HDFC LOAN" },
          ],
        },
      ],
    },
  },

  /* ---------------- Payments ---------------- */
  {
    id: "create-payout",
    group: "Payments",
    method: "POST",
    path: "/payouts",
    title: "Create payout",
    desc: "Sends money to a bank account or UPI handle over IMPS, NEFT, RTGS or UPI with idempotency support.",
    tags: ["payout", "imps", "neft", "disbursal", "transfer"],
    latency: "~2.4s",
    params: [
      { name: "amount", type: "integer (paise)", required: true, desc: "Amount in paise, e.g. 250000 for ₹2,500." },
      { name: "mode", type: "string", required: true, desc: "One of IMPS, NEFT, RTGS, UPI." },
      { name: "beneficiary", type: "object", required: true, desc: "Account number + IFSC, or a UPI VPA." },
      { name: "reference", type: "string", desc: "Your internal payout reference." },
    ],
    sampleBody: {
      amount: 250000,
      mode: "IMPS",
      beneficiary: { name: "Aarav Sharma", account_number: "50100123456789", ifsc: "HDFC0000123" },
      reference: "payout_8812",
    },
    sampleResponse: {
      payout_id: "po_5ab19f",
      status: "processing",
      amount: 250000,
      mode: "IMPS",
      utr: null,
      created_at: "2026-08-29T08:12:44Z",
    },
  },
  {
    id: "payout-status",
    group: "Payments",
    method: "GET",
    path: "/payouts/{payout_id}",
    title: "Payout status",
    desc: "Returns the current state of a payout including the bank UTR once settled.",
    tags: ["payout", "status", "utr", "settlement"],
    latency: "~110ms",
    params: [{ name: "payout_id", type: "path string", required: true, desc: "Payout id returned at creation." }],
    sampleQuery: { payout_id: "po_5ab19f" },
    sampleResponse: {
      payout_id: "po_5ab19f",
      status: "success",
      amount: 250000,
      utr: "HDFCN2408291234567",
      settled_at: "2026-08-29T08:13:02Z",
    },
  },
  {
    id: "create-va",
    group: "Payments",
    method: "POST",
    path: "/virtual-accounts",
    title: "Create virtual account",
    desc: "Issues a dedicated virtual account and UPI handle so inbound collections auto-reconcile to one customer.",
    tags: ["virtual account", "collections", "reconciliation", "va"],
    latency: "~1.3s",
    params: [
      { name: "customer_ref", type: "string", required: true, desc: "Your customer identifier for reconciliation." },
      { name: "name", type: "string", required: true, desc: "Display name on the virtual account." },
    ],
    sampleBody: { customer_ref: "user_8812", name: "Aarav Sharma" },
    sampleResponse: {
      va_id: "va_71cc03",
      account_number: "VERO8812004421",
      ifsc: "YESB0CMSNOC",
      vpa: "vero.user8812@yesbank",
      status: "active",
    },
  },
  {
    id: "va-transactions",
    group: "Payments",
    method: "GET",
    path: "/virtual-accounts/{va_id}/transactions",
    title: "VA transactions",
    desc: "Lists credits received on a virtual account with payer details for reconciliation.",
    tags: ["virtual account", "transactions", "credits", "payer"],
    latency: "~180ms",
    params: [
      { name: "va_id", type: "path string", required: true, desc: "Virtual account id." },
      { name: "limit", type: "integer", desc: "Page size, max 100. Defaults to 25." },
    ],
    sampleQuery: { va_id: "va_71cc03", limit: "25" },
    sampleResponse: {
      va_id: "va_71cc03",
      count: 1,
      transactions: [
        {
          txn_id: "vatxn_9f21a0",
          amount: 500000,
          utr: "SBIN2408291112233",
          payer_name: "MEERA IYER",
          payer_account: "XXXXXX4321",
          received_at: "2026-08-29T06:41:10Z",
        },
      ],
    },
  },
  {
    id: "refund-payout",
    group: "Payments",
    method: "POST",
    path: "/payouts/{payout_id}/reverse",
    title: "Reverse a payout",
    desc: "Requests reversal of a payout that failed at the beneficiary bank and returns the reversal reference.",
    tags: ["reversal", "refund", "failed payout"],
    latency: "~1.6s",
    params: [
      { name: "payout_id", type: "path string", required: true, desc: "Payout to reverse." },
      { name: "reason", type: "string", desc: "Free-text reason recorded on the reversal." },
    ],
    sampleBody: { payout_id: "po_5ab19f", reason: "beneficiary_account_closed" },
    sampleResponse: { reversal_id: "rv_11c8b2", payout_id: "po_5ab19f", status: "initiated", amount: 250000 },
  },
];

export const WEBHOOK_EVENTS = [
  "kyc.verification.completed",
  "kyc.verification.failed",
  "bank.verification.completed",
  "aa.consent.approved",
  "aa.fi.data.ready",
  "payout.success",
  "payout.failed",
  "va.credit.received",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export function getEndpoint(id: string): ApiEndpoint | undefined {
  return endpoints.find((e) => e.id === id);
}

/** Fills path placeholders like /payouts/{payout_id} from a params object. */
export function resolvePath(path: string, values: Record<string, string>): string {
  return path.replace(/\{(\w+)\}/g, (_m, key: string) => values[key] ?? `{${key}}`);
}

export function sampleInput(endpoint: ApiEndpoint): Record<string, unknown> {
  return endpoint.sampleBody ?? endpoint.sampleQuery ?? {};
}
