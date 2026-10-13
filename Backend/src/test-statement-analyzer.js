import assert from 'node:assert';
import StatementAnalyzerController from './modules/verification/statement_analyzer/statementAnalyzer.controller.js';
import StatementAnalyzerService from './modules/verification/statement_analyzer/statementAnalyzer.service.js';
import StatementAnalyzerClient from './modules/verification/statement_analyzer/statementAnalyzer.client.js';

// Sample Analytical Fixture representing upstream JSON contract
const sampleAnalyticalFixture = {
  status: {
    code: 200,
    type: "success",
    message: "Request successful.",
  },
  message: "Request successful.",
  data: {
    client_ref_num: "17898294225845839975",
    request_id: 91181922,
    txn_id: "da533eed0",
    start_date: "2025-09-01",
    end_date: "2026-08-31",
    duration_in_month: "12",
    source_of_data: "Uploaded Statements",
    statement_start_date: "2026-06-16",
    statement_end_date: "2026-09-10",
    customer_info: {
      name: "PUNEET HAZRATI",
      email: "",
      contact_number: "",
      address: "4/71,NEAR CAMBRIDGE FOUND,SCHOOL, SUBHASH NAGAR,TAGORE GARDEN WEST DELHI DELHI - INDIA - 110027",
      pan: "",
      dob: "",
    },
    accounts: [
      {
        bank: "ICICI BANK",
        institution_id: 3,
        location: "",
        ifsc_code: "",
        micr_code: "",
        account_number: "036401520890",
        account_type: "Saving",
        account_description: "",
        account_opening_date: "",
        od_limit: "",
        drawing_power: "",
        transaction_start_date: "2026-06-16",
        transaction_end_date: "2026-09-10",
        transactions: [
          {
            amount: 8820,
            balance: "8847.71",
            balance_difference: "0.0",
            cheque_num: "",
            date: "2026-06-16",
            narration: "SEED CAPITMMT/IMPS/616718234560/DISBURSE/SEEDCAPIT/Kotak Mahindra",
            tamper_flag: "GREEN",
            category: "Loan Disbursed",
            sub_category: "",
            category_confidence: "",
            is_autopay: false,
            payment_mode: "IMPS",
            bankref_id: "616718234560",
          },
        ],
        ifscCode: "",
        credit_count_threshold: "Credit Count Threshold Met",
      },
    ],
    tamper_detection_details: [
      {
        statement_id: "sm248b6ae",
        filename: "394_last_6_months_bank_statement_pdf_1789813704.pdf",
        original_pdf_confidence_score: 100,
        secondary_pdf_confidence_score: 100,
        additional_fraud_analysis_score: 70,
        is_standard_bank_font: 1,
        is_standard_pdf_font: 0,
        txn_amt_bal_tampering_detected: "NO",
        specific_amt_bal_tampered_txn_detected: "NA",
        overall_balance_difference: "0.0",
      },
    ],
    max_pages_in_pdf: 5,
    multiple_accounts_found: "no",
    statement_period_days: 87,
    analysis_data: {
      "June 2026*": {
        "Min Opening Balance": 0.02,
        "Max Opening Balance": 88.56,
        "Min Balance": 0.02,
        "Total No of Salary Credits": 1,
      },
      Overall: {
        "Total No. of Credit Transactions": 38,
        "Total Net Credit Amount": 1146218,
      },
    },
    raw_data: [
      {
        SN: 1,
        Date: "16-June-2026",
        Description: "OPENING BALANCE",
        Category: "Opening Balance",
        Debit: "",
        Credit: 27.71,
        Balance: 27.71,
      },
    ],
    daily_open_close_balances: [
      {
        month: "June 2026",
        dailyBalance: [
          {
            timestamp: 1781568000,
            transaction_date: "2026-06-16",
            opening_balance: 27.71,
            closing_balance: 47.71,
          },
        ],
      },
    ],
    loan_analysis: [
      {
        amount: 8820,
        balance: "8847.71",
        date: "2026-06-16",
        narration: "SEED CAPITMMT/IMPS/616718234560/DISBURSE/SEEDCAPIT/Kotak Mahindra",
        category: "Loan Disbursed",
        payment_mode: "IMPS",
      },
    ],
    top_spent_categories: [
      {
        category: "Transfer out",
        amount: 10280,
        percentage: 71.87,
      },
    ],
    salary_analysis: [
      {
        amount: 108825,
        balance: "108913.56",
        date: "2026-06-30",
        narration: "Credit trxnICSP/Salary",
        category: "Salary",
        category_confidence: "100",
      },
    ],
    fraud_analysis: [
      {
        type: "Instant big debit after Salary Credit",
        dg_bdtin_code: "BDTIN_0001",
        result: "applicable",
        transactions: [],
      },
    ],
    custom_unknown_future_field: {
      scoring_model: "v2.5",
      risk_bucket: "LOW",
    },
  },
};

async function runTests() {
  console.log('🧪 =========================================================');
  console.log('🧪 Statement Analyzer PDF (Srv2) Automated Test Suite (MOCK)');
  console.log('🧪 =========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. PDF FILE VALIDATION TESTS
  console.log('📄 [1/5] PDF File & Multipart Extraction Tests');
  test('Should reject missing/empty PDF file buffer', () => {
    assert.throws(
      () => StatementAnalyzerController.validatePdfFile(null),
      /PDF bank statement file is required/
    );
    assert.throws(
      () => StatementAnalyzerController.validatePdfFile(Buffer.alloc(0)),
      /PDF bank statement file is required/
    );
  });

  test('Should reject non-PDF content (invalid magic bytes)', () => {
    const invalidBuffer = Buffer.from('NOT A PDF FILE AT ALL');
    assert.throws(
      () => StatementAnalyzerController.validatePdfFile(invalidBuffer),
      /Invalid PDF signature/
    );
  });

  test('Should accept valid PDF buffer with %PDF- magic bytes', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    assert.doesNotThrow(() => StatementAnalyzerController.validatePdfFile(validPdfBuffer));
  });

  test('Should parse multipart req.file correctly in Controller', () => {
    const dummyReq = {
      file: {
        buffer: Buffer.from('%PDF-1.4 test data'),
        originalname: 'my_hdfc_statement.pdf',
      },
      body: {
        method: 'INITIATE_UPLOAD',
        token: 'tok_abc',
      },
    };
    const { body, fileBuffer, filename } = StatementAnalyzerController.parseRequestBody(dummyReq);
    assert.strictEqual(filename, 'my_hdfc_statement.pdf');
    assert.strictEqual(fileBuffer.toString(), '%PDF-1.4 test data');
    assert.strictEqual(body.token, 'tok_abc');
  });

  test('Should reject oversized PDF buffer (> 25MB)', () => {
    const hugeBuffer = Buffer.alloc(30 * 1024 * 1024);
    hugeBuffer.write('%PDF-');
    assert.throws(
      () => StatementAnalyzerController.validatePdfFile(hugeBuffer),
      /exceeds maximum allowed limit/
    );
  });

  // 2. REPORT TYPE / SUBTYPE VALIDATION TESTS
  console.log('\n📊 [2/5] Report Type & Subtype Validation Tests');
  test('Should allow report_type json with any subtype', () => {
    assert.doesNotThrow(() => StatementAnalyzerController.validateReportOptions('json', 'type1'));
    assert.doesNotThrow(() => StatementAnalyzerController.validateReportOptions('json', 'type2'));
    assert.doesNotThrow(() => StatementAnalyzerController.validateReportOptions('json', 'type3'));
  });

  test('Should allow report_type xlsx only with subtype type3', () => {
    assert.doesNotThrow(() => StatementAnalyzerController.validateReportOptions('xlsx', 'type3'));
  });

  test('Should reject report_type xlsx with type1 or type2', () => {
    assert.throws(
      () => StatementAnalyzerController.validateReportOptions('xlsx', 'type1'),
      /only report_subtype 'type3' is supported/
    );
    assert.throws(
      () => StatementAnalyzerController.validateReportOptions('xlsx', 'type2'),
      /only report_subtype 'type3' is supported/
    );
  });

  test('Should reject invalid report_type', () => {
    assert.throws(
      () => StatementAnalyzerController.validateReportOptions('csv', 'type3'),
      /Invalid report_type/
    );
  });

  // 3. INDIVIDUAL WORKFLOW STEP CLIENT MOCK TESTS
  console.log('\n🔄 [3/5] Individual Workflow Step Execution & Error Mapping Tests');

  // Save original client methods
  const originalJson = StatementAnalyzerClient.sendUpstreamJsonRequest;
  const originalUpload = StatementAnalyzerClient.uploadFile;

  await testAsync('Step 1 (INITIATE_UPLOAD) should format correct JSON payload', async () => {
    StatementAnalyzerClient.sendUpstreamJsonRequest = async (payload) => {
      assert.strictEqual(payload.method, 'INITIATE_UPLOAD');
      assert.strictEqual(payload.acceptance_policy, 'atLeastOneTransactionInRange');
      assert.strictEqual(payload.client_ref_num, undefined, 'client_ref_num must not be forwarded upstream in Step 1');
      return {
        status: 200,
        ok: true,
        data: {
          status: { code: 200, type: 'success', message: 'Session initiated.' },
          message: 'Session initiated.',
          data: { token: 'tok_test_123', request_id: 'req_test_123' },
        },
      };
    };

    const res = await StatementAnalyzerClient.initiateUpload({ acceptance_policy: 'atLeastOneTransactionInRange' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.data.token, 'tok_test_123');
  });

  await testAsync('Step 2 (uploadFile) should dispatch binary FormData multipart upload', async () => {
    const dummyPdf = Buffer.from('%PDF-1.4 test');
    StatementAnalyzerClient.uploadFile = async ({ token, request_id, file }) => {
      assert.strictEqual(token, 'tok_test_123');
      assert.strictEqual(request_id, 'req_test_123');
      assert.ok(file, 'Binary file buffer must be attached');
      return {
        status: 200,
        ok: true,
        data: { status: { code: 200, type: 'success', message: 'File received.' }, message: 'File received.' },
      };
    };

    const res = await StatementAnalyzerClient.uploadFile({
      token: 'tok_test_123',
      request_id: 'req_test_123',
      file: dummyPdf,
    });
    assert.strictEqual(res.ok, true);
  });

  await testAsync('Step 3 (COMPLETE_UPLOAD) should send request_id via JSON', async () => {
    StatementAnalyzerClient.sendUpstreamJsonRequest = async (payload) => {
      assert.strictEqual(payload.method, 'COMPLETE_UPLOAD');
      assert.strictEqual(payload.request_id, 'req_test_123');
      return {
        status: 200,
        ok: true,
        data: { status: { code: 200, type: 'success', message: 'Upload completed.' }, txn_id: 'txn_999' },
      };
    };

    const res = await StatementAnalyzerClient.completeUpload({ request_id: 'req_test_123' });
    assert.strictEqual(res.ok, true);
  });

  await testAsync('Step 4 (CHECK_STATUS) should poll status with request_id via JSON', async () => {
    StatementAnalyzerClient.sendUpstreamJsonRequest = async (payload) => {
      assert.strictEqual(payload.method, 'CHECK_STATUS');
      assert.strictEqual(payload.request_id, 'req_test_123');
      return {
        status: 200,
        ok: true,
        data: { status: { code: 200, type: 'success', message: 'Processing' }, data: { status: 'COMPLETED' } },
      };
    };

    const res = await StatementAnalyzerClient.checkStatus({ request_id: 'req_test_123' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.data.status, 'COMPLETED');
  });

  await testAsync('Step 5 (RETRIEVE_STATEMENT) should retrieve full report for txn_id via JSON', async () => {
    StatementAnalyzerClient.sendUpstreamJsonRequest = async (payload) => {
      assert.strictEqual(payload.method, 'RETRIEVE_STATEMENT');
      assert.strictEqual(payload.txn_id, 'da533eed0');
      assert.strictEqual(payload.report_type, 'json');
      assert.strictEqual(payload.report_subtype, 'type3');
      return {
        status: 200,
        ok: true,
        data: sampleAnalyticalFixture,
      };
    };

    const res = await StatementAnalyzerClient.retrieveStatement({
      txn_id: 'da533eed0',
      report_type: 'json',
      report_subtype: 'type3',
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.data.txn_id, 'da533eed0');
  });

  await testAsync('Step 6 (CANCEL_REQUEST) should send cancel command with request_id via JSON', async () => {
    StatementAnalyzerClient.sendUpstreamJsonRequest = async (payload) => {
      assert.strictEqual(payload.method, 'CANCEL_REQUEST');
      assert.strictEqual(payload.request_id, 'req_test_123');
      return {
        status: 200,
        ok: true,
        data: { status: { code: 200, type: 'success', message: 'Request cancelled.' }, message: 'Request cancelled.' },
      };
    };

    const res = await StatementAnalyzerClient.cancelRequest({ request_id: 'req_test_123' });
    assert.strictEqual(res.ok, true);
  });

  // Standard BAC Error Mapping Tests
  test('Standard BAC Error Mapping: Maps 422, 502, 504 correctly', () => {
    const err422 = StatementAnalyzerService.mapUpstreamError(
      422,
      { status: { code: 422, message: 'Invalid acceptance policy' } },
      'Step 1: Initiate Upload'
    );
    assert.strictEqual(err422.httpCode, 422);
    assert.strictEqual(err422.response.status.code, 422);
    assert.strictEqual(err422.response.status.message, 'Invalid acceptance policy');

    const err502 = StatementAnalyzerService.mapUpstreamError(
      500,
      { status: { code: 500, message: 'OCR Engine Failed' } },
      'Step 4: Status Check'
    );
    assert.strictEqual(err502.httpCode, 502);
    assert.strictEqual(err502.response.status.code, 502);

    const err504 = StatementAnalyzerService.mapUpstreamError(
      504,
      { status: { code: 504, message: 'Gateway Timeout' } },
      'Step 5: Retrieve Report'
    );
    assert.strictEqual(err504.httpCode, 504);
    assert.strictEqual(err504.response.status.code, 504);
  });

  // 4. 1-SHOT AUTOMATED PIPELINE & TIMEOUT (HTTP 202) TESTS
  console.log('\n⚡ [4/5] 1-Shot Automated Pipeline & Polling Timeout Tests');

  await testAsync('1-Shot Pipeline: Completes Steps 1->2->3->4->5 and preserves entire analytical JSON', async () => {
    const validPdf = Buffer.from('%PDF-1.4 sample bank statement');

    StatementAnalyzerClient.sendUpstreamJsonRequest = async (payload) => {
      if (payload.method === 'INITIATE_UPLOAD') {
        return { status: 200, ok: true, data: { status: { code: 200, type: 'success' }, data: { token: 'tok_auto_1', request_id: 'req_auto_1' } } };
      }
      if (payload.method === 'COMPLETE_UPLOAD') {
        return { status: 200, ok: true, data: { status: { code: 200, type: 'success' }, data: { txn_id: 'txn_auto_1' } } };
      }
      if (payload.method === 'CHECK_STATUS') {
        return { status: 200, ok: true, data: { status: { code: 200, type: 'success' }, data: { status: 'COMPLETED' } } };
      }
      if (payload.method === 'RETRIEVE_STATEMENT') {
        return { status: 200, ok: true, data: sampleAnalyticalFixture };
      }
      throw new Error(`Unexpected JSON method: ${payload.method}`);
    };

    StatementAnalyzerClient.uploadFile = async ({ token, request_id, file }) => {
      assert.strictEqual(token, 'tok_auto_1');
      assert.strictEqual(request_id, 'req_auto_1');
      assert.ok(file);
      return { status: 200, ok: true, data: { status: { code: 200, type: 'success' }, message: 'Uploaded' } };
    };

    const result = await StatementAnalyzerService.processStatementAnalyzerRequest({
      file: validPdf,
      apiClient: { user_id: 1, wallet_balance: 50.0, credential_id: 1, client_ip: '127.0.0.1' },
    });

    assert.strictEqual(result.httpCode, 200);
    assert.strictEqual(result.body.data.txn_id, 'da533eed0');
    assert.strictEqual(result.body.data.customer_info.name, 'PUNEET HAZRATI');
    assert.strictEqual(result.body.data.accounts[0].account_number, '036401520890');
    assert.strictEqual(result.body.data.custom_unknown_future_field.scoring_model, 'v2.5', 'Preserves future unknown analytical fields');
  });

  await testAsync('1-Shot Pipeline Timeout: Returns HTTP 202 Accepted when OCR is still processing', async () => {
    const processingPdf = Buffer.from('%PDF-1.4 processing statement ' + Date.now());

    StatementAnalyzerClient.sendUpstreamJsonRequest = async (payload) => {
      if (payload.method === 'INITIATE_UPLOAD') {
        return { status: 200, ok: true, data: { status: { code: 200, type: 'success' }, data: { token: 'tok_pending_1', request_id: 'req_pending_1' } } };
      }
      if (payload.method === 'COMPLETE_UPLOAD') {
        return { status: 200, ok: true, data: { status: { code: 200, type: 'success' }, data: { txn_id: 'txn_pending_1' } } };
      }
      if (payload.method === 'CHECK_STATUS') {
        return { status: 200, ok: true, data: { status: { code: 200, type: 'processing' }, data: { status: 'PROCESSING' } } };
      }
      throw new Error(`Unexpected JSON method: ${payload.method}`);
    };

    StatementAnalyzerClient.uploadFile = async ({ token, request_id, file }) => {
      assert.strictEqual(token, 'tok_pending_1');
      assert.strictEqual(request_id, 'req_pending_1');
      assert.ok(file);
      return { status: 200, ok: true, data: { status: { code: 200, type: 'success' }, message: 'Uploaded' } };
    };

    // Override poll settings for fast test execution
    process.env.STATEMENT_ANALYZER_MAX_POLL_ATTEMPTS = '2';
    process.env.STATEMENT_ANALYZER_POLL_INTERVAL_MS = '10';

    const result = await StatementAnalyzerService.processStatementAnalyzerRequest({
      file: processingPdf,
      apiClient: { user_id: 1, wallet_balance: 50.0, credential_id: 1, client_ip: '127.0.0.1' },
    });

    assert.strictEqual(result.httpCode, 202, 'Must return HTTP 202 Accepted when still processing');
    assert.strictEqual(result.body.status.code, 202);
    assert.strictEqual(result.body.status.type, 'processing');
    assert.strictEqual(result.body.message, 'Statement analysis is still processing.');
  });

  await testAsync('DB Cache Replay: Re-uploading identical statement returns cached report with ZERO upstream hits', async () => {
    // When called with the first test's validPdf, it should be served from DB cache without calling StatementAnalyzerClient
    const validPdf = Buffer.from('%PDF-1.4 sample bank statement');
    let upstreamCalled = false;
    StatementAnalyzerClient.sendUpstreamJsonRequest = async () => {
      upstreamCalled = true;
      throw new Error('Upstream should not be called on cache hit');
    };
    StatementAnalyzerClient.uploadFile = async () => {
      upstreamCalled = true;
      throw new Error('Upstream should not be called on cache hit');
    };

    const cachedResult = await StatementAnalyzerService.processStatementAnalyzerRequest({
      file: validPdf,
      apiClient: { user_id: 1, wallet_balance: 50.0, credential_id: 1, client_ip: '127.0.0.1' },
    });

    assert.strictEqual(cachedResult.httpCode, 200);
    assert.strictEqual(upstreamCalled, false, 'No upstream calls allowed on cache replay');
    assert.strictEqual(cachedResult.body.data.txn_id, 'da533eed0');
    assert.strictEqual(cachedResult.body.data.customer_info.name, 'PUNEET HAZRATI');
  });

  // 5. RESPONSE INTEGRITY & WHITE-LABELING TESTS
  console.log('\n🛡️ [5/5] Response Integrity & White-Label Isolation Tests');

  test('Analytical JSON response must preserve 100% of exact upstream data keys and values', () => {
    const keys = Object.keys(sampleAnalyticalFixture.data);
    assert.ok(keys.includes('customer_info'));
    assert.ok(keys.includes('accounts'));
    assert.ok(keys.includes('transactions') || keys.includes('accounts'));
    assert.ok(keys.includes('tamper_detection_details'));
    assert.ok(keys.includes('analysis_data'));
    assert.ok(keys.includes('raw_data'));
    assert.ok(keys.includes('daily_open_close_balances'));
    assert.ok(keys.includes('loan_analysis'));
    assert.ok(keys.includes('top_spent_categories'));
    assert.ok(keys.includes('salary_analysis'));
    assert.ok(keys.includes('fraud_analysis'));
    assert.ok(keys.includes('custom_unknown_future_field'));
  });

  // Restore client methods
  StatementAnalyzerClient.sendUpstreamJsonRequest = originalJson;
  StatementAnalyzerClient.uploadFile = originalUpload;

  console.log('\n=========================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
