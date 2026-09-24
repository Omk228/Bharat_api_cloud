import { normalizeReportData } from '../src/modules/verification/crif/normalizer/reportNormalizer.js';
import { renderCreditReportPdf } from '../src/modules/verification/crif/renderer/crifPdfRenderer.js';
import { generateCrifReportPdf } from '../src/modules/verification/crif/crif-pdf.generator.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDynamicTests() {
  console.log('🧪 Starting Dynamic CRIF High Mark Report Pipeline Tests...\n');

  // TEST 1: Real Upstream IDSPay / CRIF response format with 1 account
  console.log('--- TEST 1: 1-Account Dynamic Bureau Response ---');
  const payload1 = {
    status: { code: 200, type: 'success', message: 'success' },
    message: 'success',
    data: {
      result_json: {
        credit_report: {
          customer_identity: {
            name: 'RAHUL SHARMA',
            dob: '15-08-1992',
            gender: 'Male',
            pan: 'ABCPS1234F',
            phone: '9812345678',
            email: 'rahul.sharma@example.com',
            address: 'FLAT 402, BLOCK B, SUNSHINE APARTMENTS, SECTOR 62, NOIDA 201301 UP'
          },
          score: {
            scoreName: 'PERFORM CONSUMER 2.2',
            range: '300-900',
            value: 785,
            scoringFactors: ['SF01', 'SF04']
          },
          account_summary: {
            primary_accounts_summary: {
              primary_number_of_accounts: 1,
              primary_active_number_of_accounts: 1,
              primary_current_balance: 45000,
              primary_current_balance_unsecured: 45000,
              primary_sanctioned_amount: 50000,
              primary_disbursed_amount: 50000
            }
          },
          personal_info_variation: {
            name_variations: { variation: [{ value: 'RAHUL SHARMA', reported_date: '10-01-2025' }] },
            email_variations: { variation: [{ value: 'rahul.sharma@example.com', reported_date: '10-01-2025' }] },
            address_variations: { variation: [{ value: 'FLAT 402, BLOCK B, SUNSHINE APARTMENTS, SECTOR 62, NOIDA 201301 UP', reported_date: '10-01-2025' }] }
          },
          employment_details: {
            occupation: 'Software Engineer',
            date_reported: '10-01-2025',
            acct_type: 'Professional',
            source_indicator: 'FRB'
          },
          response: [
            {
              acct_type: 'Personal Loan',
              credit_grantor: 'HDFC BANK LIMITED',
              acct_number: 'HDFCPL99887766',
              credit_grantor_type: 'FRB',
              date_reported: '31-01-2026',
              account_status: 'Active',
              ownership_ind: 'Individual',
              disbursed_dt: '12-05-2024',
              disbursed_amt: 50000,
              current_bal: 45000,
              last_payment_date: '10-01-2026',
              last_paid_amount: '2500',
              installment_amt: 2500,
              repayment_tenure: 24,
              combined_payment_history: 'Jan:2026,000/000|Feb:2026,000/000|Dec:2025,000/000|Nov:2025,000/000'
            }
          ],
          inquiry_history: {
            history: [
              { member_name: 'ICICI BANK LTD', date_of_inquiry: '05-12-2025', purpose: 'Credit Card', inquiry_amount: 100000 }
            ]
          }
        }
      }
    }
  };

  const pdf1 = await generateCrifReportPdf(payload1);
  console.log(`✅ Test 1 PDF Generated successfully: ${pdf1.length} bytes`);

  // TEST 2: 0-Account No Match / Clean Response
  console.log('\n--- TEST 2: 0-Account Dynamic Bureau Response ---');
  const payload2 = {
    customer_identity: {
      name: 'PRIYA VERMA',
      pan: 'BKPPA9988Z',
      phone: '9988776655'
    },
    score: { value: 720 },
    accounts: [],
    inquiries: []
  };

  const pdf2 = await generateCrifReportPdf(payload2);
  console.log(`✅ Test 2 PDF Generated successfully: ${pdf2.length} bytes`);

  console.log('\n🎉 ALL DYNAMIC PIPELINE TESTS PASSED!');
}

runDynamicTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
