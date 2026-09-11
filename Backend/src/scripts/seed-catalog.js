import { dbPool } from '../core/config/db.config.js';

const CATALOG_ITEMS = [
  /* ---------------- 16 ACTIVE APIS (Test Console Available) ---------------- */
  {
    id: 'api_cat_03',
    service_name: 'Verify PAN',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/srv2/validation/pan',
    upstream_provider: 'Income Tax Department (NSDL/ITD)',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 1400,
    uptime_24h: 99.95,
    description: 'Validates a Permanent Account Number against the Income Tax Department database, with optional name and date-of-birth matching.'
  },
  {
    id: 'api_verify_pan_plus',
    service_name: 'Pan Details Plus',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/srv2/validation/pan/plus',
    upstream_provider: 'Income Tax Department (ITD)',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 1800,
    uptime_24h: 99.90,
    description: 'Comprehensive Permanent Account Number verification with demographic details, Aadhaar seeding status, allotment date, and corporate/salaried profile.'
  },
  {
    id: 'api_aadhaar_without_otp',
    service_name: 'Aadhar Fetch (Without OTP)',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/srv3/verification/aadhar',
    upstream_provider: 'UIDAI / Bharat API Gateway',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 1200,
    uptime_24h: 99.99,
    description: 'Instant Aadhaar number validation and demographic verification without requiring mobile OTP. Returns Aadhaar validity, age band, gender, state and masked mobile digits.'
  },
  {
    id: 'api_digilocker_digital_kyc',
    service_name: 'Digi Locker Digital KYC',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/srv2/validation/digilocker-digital-kyc',
    upstream_provider: 'DigiLocker / MeitY',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 800,
    uptime_24h: 99.92,
    description: 'Generate instant DigiLocker Digital KYC OAuth token and consent session URL for paperless user identity verification.'
  },
  {
    id: 'api_bank_penny_less',
    service_name: 'Bank Verification Penny Less V2',
    category: 'Banking & IFSC',
    method: 'POST',
    endpoint_path: '/bank/verify/penny-less',
    upstream_provider: 'IDFC Bank API / NPCI',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 1500,
    uptime_24h: 99.89,
    description: 'Instant bank account validation and beneficiary name verification without performing a financial penny deposit. Validates bank account status, registered name, and IFSC details directly.'
  },
  {
    id: 'api_bank_validation',
    service_name: 'Bank Account Validation',
    category: 'Banking & IFSC',
    method: 'POST',
    endpoint_path: '/api/v1/validate_bank_account',
    upstream_provider: 'NPCI / IMPS Rail',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 2100,
    uptime_24h: 99.91,
    description: 'Validates Indian bank account number and IFSC code using asynchronous penny-less bank verification engine.'
  },
  {
    id: 'api_mobile_to_bank_advance',
    service_name: 'Mobile To Bank Advance',
    category: 'Banking & IFSC',
    method: 'POST',
    endpoint_path: '/srv3/mobile-to-bank/advance',
    upstream_provider: 'IDSpay Gateway',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 400,
    uptime_24h: 99.90,
    description: 'Advanced mobile-to-bank account lookup and verification powered by IDSpay. Retrieve verified bank accounts and beneficiary details linked with an Indian mobile number.'
  },
  {
    id: 'api_cat_01',
    service_name: 'IFSC Lookup',
    category: 'Banking & IFSC',
    method: 'GET',
    endpoint_path: '/ifsc',
    upstream_provider: 'RBI IFSC Directory',
    current_price: 1.00,
    status: 'Active',
    latency_p95: 120,
    uptime_24h: 99.99,
    description: 'Returns branch details, MICR, address, and supported payment rails (NEFT, RTGS, IMPS, UPI) for an IFSC code.'
  },
  {
    id: 'api_mobile_to_upi',
    service_name: 'Mobile to UPI Lookup Advance',
    category: 'Payments & Collections',
    method: 'POST',
    endpoint_path: '/srv2/mobile-upi-lookup/enhanced',
    upstream_provider: 'NPCI UPI Gateway',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 250,
    uptime_24h: 99.95,
    description: 'Real-time Mobile to UPI ID (VPA) and bank-registered account holder name verification powered by NPCI gateway.'
  },
  {
    id: 'api_mobile_to_prefill',
    service_name: 'Mobile to Prefill',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/srv4/credit-report/prefill',
    upstream_provider: 'Telecom & Credit Bureau',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 1100,
    uptime_24h: 99.90,
    description: 'Fetch verified identity profile, PAN, Date of Birth, age, gender, email, and registered addresses pre-filled directly from user registered mobile number and name.'
  },
  {
    id: 'api_mobile_name_finder',
    service_name: 'Mobile To Name Finder',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/srv2/mobile-name-finder',
    upstream_provider: 'Telecom Circle Registry',
    current_price: 5.00,
    status: 'Active',
    latency_p95: 1000,
    uptime_24h: 99.88,
    description: 'Instant name lookup and telecom subscriber verification. Fetch the registered subscriber legal name and telecom circle details directly from a 10-digit mobile number.'
  },
  {
    id: 'api_mobile_to_uan',
    service_name: 'Mobile to UAN V2',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/api/v1/srv3/uan-mobile',
    upstream_provider: 'EPFO India',
    current_price: 5.00,
    status: 'Active',
    latency_p95: 400,
    uptime_24h: 99.92,
    description: 'Resolve Universal Account Number (UAN), active EPFO membership, establishment details, and employment history from mobile number.'
  },
  {
    id: 'api_uan_to_employment',
    service_name: 'UAN to Employment History V2',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/api/v1/srv3/uan-direct',
    upstream_provider: 'EPFO India',
    current_price: 5.00,
    status: 'Active',
    latency_p95: 400,
    uptime_24h: 99.93,
    description: 'Directly verify EPFO Universal Account Number (UAN) to fetch complete employment history, establishment details, joining/exit dates, and employee identity profile without requiring OTP.'
  },
  {
    id: 'api_domain_age',
    service_name: 'Domain Age Verification API',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/dosvak/domain-age',
    upstream_provider: 'WHOIS & Registry Network',
    current_price: 2.00,
    status: 'Active',
    latency_p95: 25,
    uptime_24h: 99.99,
    description: 'Calculates the exact domain registration age, creation date, and lifespan in days and years using authoritative registries and smart caching.'
  },
  {
    id: 'api_requester_ip_lookup',
    service_name: 'Requester IP Lookup',
    category: 'KYC & Verification',
    method: 'GET',
    endpoint_path: '/check',
    upstream_provider: 'IPStack & GeoIP Network',
    current_price: 0.15,
    status: 'Active',
    latency_p95: 700,
    uptime_24h: 99.98,
    description: 'Instant geolocation and network intelligence for incoming or specified IP addresses. Returns city, region, coordinates, country flag, calling code, and connection profile.'
  },
  {
    id: 'api_reverse_geocoding',
    service_name: 'Reverse Geocoding',
    category: 'KYC & Verification',
    method: 'GET',
    endpoint_path: '/reverse',
    upstream_provider: 'OpenStreetMap / Bharat Geocoding Engine',
    current_price: 0.20,
    status: 'Active',
    latency_p95: 320,
    uptime_24h: 99.94,
    description: 'Resolve GPS coordinates (latitude & longitude) into full geographic address, road, landmark, city, state, postal code, and administrative boundaries using Bharat API Geocoding Engine.'
  },
  {
    id: 'api_transunion_cibil_v5',
    service_name: 'Transunion Credit Report V5',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/srv5/transunion-Score-Hybrid',
    upstream_provider: 'TransUnion CIBIL',
    current_price: 15.00,
    status: 'Active',
    latency_p95: 1200,
    uptime_24h: 99.90,
    description: 'Fetch TransUnion CIBIL credit score, detailed loan accounts, past repayment track record (STD/0/XXX), inquiry partitions, and instant viewable PDF report.'
  },

  /* ---------------- 22 INACTIVE APIS (Catalog/Docs Only) ---------------- */
  {
    id: 'api_aadhaar_otp',
    service_name: 'Aadhaar OTP (DigiLocker)',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/verify/aadhaar/otp',
    upstream_provider: 'UIDAI',
    current_price: 2.20,
    status: 'Disabled',
    latency_p95: 75,
    uptime_24h: 99.85,
    description: 'Step 1 of consent-based Aadhaar verification: sends an OTP to the Aadhaar-linked mobile number and returns a transaction id.'
  },
  {
    id: 'api_aadhaar_otp_confirm',
    service_name: 'Confirm Aadhaar OTP',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/verify/aadhaar/otp/confirm',
    upstream_provider: 'Bharat API Gateway',
    current_price: 1.00,
    status: 'Disabled',
    latency_p95: 62,
    uptime_24h: 99.96,
    description: 'Step 2 of Aadhaar verification: exchanges the OTP for the verified demographic KYC record and photo.'
  },
  {
    id: 'api_verify_gstin',
    service_name: 'Verify GSTIN',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/verify/gstin',
    upstream_provider: 'GSTN Portal',
    current_price: 2.50,
    status: 'Disabled',
    latency_p95: 55,
    uptime_24h: 99.90,
    description: 'Fetches GST registration details, filing status and the registered business address for a GSTIN.'
  },
  {
    id: 'api_verify_cin',
    service_name: 'Verify CIN (MCA)',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/verify/cin',
    upstream_provider: 'MCA Portal',
    current_price: 3.00,
    status: 'Disabled',
    latency_p95: 80,
    uptime_24h: 99.85,
    description: 'Looks up company master data from the MCA registry, including directors, status and paid-up capital.'
  },
  {
    id: 'api_document_ocr',
    service_name: 'Document OCR',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/kyc/ocr',
    upstream_provider: 'AI OCR Vision Engine',
    current_price: 3.50,
    status: 'Disabled',
    latency_p95: 120,
    uptime_24h: 99.80,
    description: 'Extracts structured fields from an ID document image or PDF and flags tampering signals.'
  },
  {
    id: 'api_face_liveness',
    service_name: 'Face Match & Liveness',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/kyc/face-match',
    upstream_provider: 'Biometric AI Engine',
    current_price: 3.00,
    status: 'Disabled',
    latency_p95: 90,
    uptime_24h: 99.88,
    description: 'Compares a selfie against an ID photo and returns a passive liveness score to block spoof attempts.'
  },
  {
    id: 'api_verify_voter_id',
    service_name: 'Verify Voter ID',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/verify/voter-id',
    upstream_provider: 'ECI Roll',
    current_price: 2.00,
    status: 'Disabled',
    latency_p95: 65,
    uptime_24h: 99.90,
    description: 'Validates an EPIC number against the Election Commission roll and returns the elector record.'
  },
  {
    id: 'api_verify_dl',
    service_name: 'Verify Driving Licence',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/verify/driving-licence',
    upstream_provider: 'Sarathi / Parivahan',
    current_price: 2.00,
    status: 'Disabled',
    latency_p95: 70,
    uptime_24h: 99.85,
    description: 'Validates a driving licence number against the Sarathi/Parivahan database with vehicle class details.'
  },
  {
    id: 'api_verify_passport',
    service_name: 'Verify Passport',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/verify/passport',
    upstream_provider: 'Passport Seva Kendra',
    current_price: 4.00,
    status: 'Disabled',
    latency_p95: 85,
    uptime_24h: 99.80,
    description: 'Validates a passport file number and date of birth against the Passport Seva records.'
  },
  {
    id: 'api_aml_screening',
    service_name: 'AML / PEP Screening',
    category: 'KYC & Verification',
    method: 'POST',
    endpoint_path: '/kyc/aml-screen',
    upstream_provider: 'Global AML Watchlist',
    current_price: 4.50,
    status: 'Disabled',
    latency_p95: 40,
    uptime_24h: 99.97,
    description: 'Screens a name against global sanctions, PEP and adverse-media watchlists with fuzzy matching.'
  },
  {
    id: 'api_bank_penny_drop',
    service_name: 'Bank Verification (Penny Drop)',
    category: 'Banking & IFSC',
    method: 'POST',
    endpoint_path: '/bank/verify',
    upstream_provider: 'NPCI IMPS',
    current_price: 1.80,
    status: 'Disabled',
    latency_p95: 47,
    uptime_24h: 99.95,
    description: 'Credits ₹1 to the account to confirm it is live and returns the beneficiary name registered with the bank.'
  },
  {
    id: 'api_bank_reverse_penny',
    service_name: 'Reverse Penny Drop',
    category: 'Banking & IFSC',
    method: 'POST',
    endpoint_path: '/bank/reverse-penny-drop',
    upstream_provider: 'NPCI UPI Collect',
    current_price: 0.75,
    status: 'Disabled',
    latency_p95: 71,
    uptime_24h: 99.92,
    description: 'Creates a collect request the user pays ₹1 against, verifying account ownership without a name match.'
  },
  {
    id: 'api_upi_vpa',
    service_name: 'Validate UPI VPA',
    category: 'Banking & IFSC',
    method: 'POST',
    endpoint_path: '/bank/upi/validate',
    upstream_provider: 'NPCI UPI PSP',
    current_price: 0.50,
    status: 'Disabled',
    latency_p95: 50,
    uptime_24h: 99.95,
    description: 'Checks whether a UPI ID is active and returns the registered payee name.'
  },
  {
    id: 'api_bank_statement',
    service_name: 'Bank Statement Analysis',
    category: 'Banking & IFSC',
    method: 'POST',
    endpoint_path: '/bank/statement/analyse',
    upstream_provider: 'Financial Analytics Parser',
    current_price: 15.00,
    status: 'Disabled',
    latency_p95: 350,
    uptime_24h: 99.70,
    description: 'Parses a PDF bank statement and returns income, obligations, bounce count and a cash-flow summary.'
  },
  {
    id: 'api_aa_consent',
    service_name: 'Create Consent Request',
    category: 'Account Aggregator',
    method: 'POST',
    endpoint_path: '/aa/consent',
    upstream_provider: 'RBI Account Aggregator',
    current_price: 4.00,
    status: 'Disabled',
    latency_p95: 62,
    uptime_24h: 99.93,
    description: 'Creates an RBI Account Aggregator consent request and returns the redirect URL for the user journey.'
  },
  {
    id: 'api_aa_consent_status',
    service_name: 'Consent Status',
    category: 'Account Aggregator',
    method: 'GET',
    endpoint_path: '/aa/consent/{consent_handle}',
    upstream_provider: 'RBI AA Hub',
    current_price: 0.50,
    status: 'Disabled',
    latency_p95: 41,
    uptime_24h: 99.90,
    description: 'Returns the current state of a consent handle and the linked accounts once approved.'
  },
  {
    id: 'api_aa_fetch_fi',
    service_name: 'Fetch Financial Data (AA)',
    category: 'Account Aggregator',
    method: 'POST',
    endpoint_path: '/aa/fi/fetch',
    upstream_provider: 'Financial Info Provider',
    current_price: 6.00,
    status: 'Disabled',
    latency_p95: 36,
    uptime_24h: 99.94,
    description: 'Requests a financial information session for an active consent and returns decrypted transaction data.'
  },
  {
    id: 'api_create_payout',
    service_name: 'Create Payout',
    category: 'Payments & Collections',
    method: 'POST',
    endpoint_path: '/payouts',
    upstream_provider: 'Banking Rail',
    current_price: 3.00,
    status: 'Disabled',
    latency_p95: 110,
    uptime_24h: 99.90,
    description: 'Sends money to a bank account or UPI handle over IMPS, NEFT, RTGS or UPI with idempotency support.'
  },
  {
    id: 'api_payout_status',
    service_name: 'Payout Status',
    category: 'Payments & Collections',
    method: 'GET',
    endpoint_path: '/payouts/{payout_id}',
    upstream_provider: 'Banking Rail',
    current_price: 0.20,
    status: 'Disabled',
    latency_p95: 35,
    uptime_24h: 99.95,
    description: 'Returns the current state of a payout including the bank UTR once settled.'
  },
  {
    id: 'api_create_va',
    service_name: 'Create Virtual Account',
    category: 'Payments & Collections',
    method: 'POST',
    endpoint_path: '/virtual-accounts',
    upstream_provider: 'YES Bank Virtual Rails',
    current_price: 2.00,
    status: 'Disabled',
    latency_p95: 75,
    uptime_24h: 99.90,
    description: 'Issues a dedicated virtual account and UPI handle so inbound collections auto-reconcile to one customer.'
  },
  {
    id: 'api_va_transactions',
    service_name: 'VA Transactions',
    category: 'Payments & Collections',
    method: 'GET',
    endpoint_path: '/virtual-accounts/{va_id}/transactions',
    upstream_provider: 'Banking Rail',
    current_price: 0.25,
    status: 'Disabled',
    latency_p95: 45,
    uptime_24h: 99.95,
    description: 'Lists credits received on a virtual account with payer details for reconciliation.'
  },
  {
    id: 'api_refund_payout',
    service_name: 'Reverse a Payout',
    category: 'Payments & Collections',
    method: 'POST',
    endpoint_path: '/payouts/{payout_id}/reverse',
    upstream_provider: 'Banking Rail',
    current_price: 1.00,
    status: 'Disabled',
    latency_p95: 80,
    uptime_24h: 99.85,
    description: 'Requests reversal of a payout that failed at the beneficiary bank and returns the reversal reference.'
  }
];

async function seedCatalog() {
  console.log('🔄 Starting Catalog Reset & Seed on configured database...');
  
  try {
    // 0. Ensure catalog table exists
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`catalog\` (
        \`id\` varchar(64) NOT NULL,
        \`service_name\` varchar(255) NOT NULL,
        \`category\` varchar(128) NOT NULL,
        \`method\` varchar(10) NOT NULL DEFAULT 'GET',
        \`endpoint_path\` varchar(255) NOT NULL,
        \`upstream_provider\` varchar(128) NOT NULL,
        \`current_price\` decimal(10,2) NOT NULL DEFAULT '0.15',
        \`status\` enum('Active','Maintenance','Disabled') NOT NULL DEFAULT 'Active',
        \`latency_p95\` int NOT NULL DEFAULT '50',
        \`uptime_24h\` decimal(5,2) NOT NULL DEFAULT '99.90',
        \`description\` text,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_endpoint\` (\`endpoint_path\`,\`method\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Checked/created table `catalog`.');

    // 1. Clear existing catalog table
    await dbPool.query('DELETE FROM catalog;');
    console.log('✅ Cleared old catalog records from table `catalog`.');

    // 2. Insert all 38 items
    const insertQuery = `
      INSERT INTO catalog (
        id, service_name, category, method, endpoint_path, 
        upstream_provider, current_price, status, latency_p95, 
        uptime_24h, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        service_name = VALUES(service_name),
        category = VALUES(category),
        method = VALUES(method),
        endpoint_path = VALUES(endpoint_path),
        upstream_provider = VALUES(upstream_provider),
        current_price = VALUES(current_price),
        status = VALUES(status),
        latency_p95 = VALUES(latency_p95),
        uptime_24h = VALUES(uptime_24h),
        description = VALUES(description),
        updated_at = NOW();
    `;

    for (const item of CATALOG_ITEMS) {
      await dbPool.query(insertQuery, [
        item.id,
        item.service_name,
        item.category,
        item.method,
        item.endpoint_path,
        item.upstream_provider,
        item.current_price,
        item.status,
        item.latency_p95 || 50,
        item.uptime_24h || 99.90,
        item.description || ''
      ]);
    }

    console.log(`✅ Successfully inserted ${CATALOG_ITEMS.length} APIs into \`catalog\` table.`);
    console.log(`   - 🟢 Active APIs (with Test Console): 16`);
    console.log(`   - ⚪ Inactive APIs (Disabled/Docs): 22`);

    // Verify count in DB
    const [counts] = await dbPool.query('SELECT status, COUNT(*) as count FROM catalog GROUP BY status;');
    console.log('📊 Verified DB Catalog Status:', counts);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed catalog:', error);
    process.exit(1);
  }
}

seedCatalog();
