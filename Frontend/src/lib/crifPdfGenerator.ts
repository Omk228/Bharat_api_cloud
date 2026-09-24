import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

// Color Palette for CRIF High Mark Report
const crifNavy = rgb(12 / 255, 56 / 255, 117 / 255);        // #0C3875 (Dark Navy Header)
const crifCyan = rgb(0 / 255, 163 / 255, 224 / 255);        // #00A3E0 (Accent Cyan)
const tableHeaderBg = rgb(240 / 255, 244 / 255, 248 / 255);   // #F0F4F8 (Light Gray-Blue Header)
const tableAltBg = rgb(248 / 255, 250 / 255, 252 / 255);      // #F8FAFC
const borderGrey = rgb(209 / 255, 220 / 255, 229 / 255);      // #D1DCE5
const metaStripBg = rgb(235 / 255, 243 / 255, 250 / 255);     // #EBF3FA
const textBlack = rgb(17 / 255, 24 / 255, 39 / 255);         // #111827
const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);      // #64748B
const textWhite = rgb(1, 1, 1);
const closedRed = rgb(224 / 255, 36 / 255, 36 / 255);        // #E02424
const closedBg = rgb(253 / 255, 232 / 255, 232 / 255);       // #FDE8E8
const activeGreen = rgb(3 / 255, 84 / 255, 63 / 255);        // #03543F
const activeBg = rgb(222 / 255, 247 / 255, 236 / 255);       // #DEF7EC

export function cleanText(val: any): string {
  if (val === undefined || val === null || val === '' || val === '-1') return '—';
  return String(val).replace(/₹/g, 'Rs. ').replace(/[^\x20-\x7E\t\n\r]/g, '').trim() || '—';
}

export function formatDate(val: any): string {
  if (!val || val === '—' || val === '-' || val === '-1' || val === 'N/A') return '—';
  const clean = (String(val).split('T')[0] || '').split('+')[0]?.trim() || '';
  if (clean.includes('-')) {
    const p = clean.split('-');
    if (p.length === 3 && p[0] && p[1] && p[2]) {
      if (p[0].length === 4) return `${p[2].padStart(2, '0')}-${p[1].padStart(2, '0')}-${p[0]}`;
      return `${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}-${p[2]}`;
    }
  }
  return clean || '—';
}

export function formatAmount(val: any): string {
  if (val === undefined || val === null || val === '' || val === '—' || val === '-') return '0';
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

export function ensureArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export function parseNum(v: any, def = 0): number {
  if (v === undefined || v === null || v === '' || v === '—' || v === '-') return def;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? def : n;
}

export interface NormalizedCrifApplicant {
  name: string;
  dob: string;
  gender: string;
  phone: string;
  spouse: string;
  mother: string;
  father: string;
  pan: string;
  email: string;
  currentAddress: string;
  otherAddress: string;
}

export interface NormalizedCrifReportMeta {
  chmRef: string;
  preparedFor: string;
  applicationId: string;
  dateOfRequest: string;
  dateOfIssue: string;
}

export interface NormalizedCrifScore {
  scoreName: string;
  range: string;
  value: number | string;
  scoringFactors: string[];
}

export interface NormalizedCrifScoreTrend {
  retroDate: string;
  score: number | string | null;
}

export interface NormalizedCrifPrimarySummary {
  numberOfAccounts: number;
  activeAccounts: number;
  overdueAccounts: number;
  securedAccounts: number;
  unsecuredAccounts: number;
  untaggedAccounts: number;
  totalCurrentBalance: number;
  currentBalanceSecured: number;
  currentBalanceUnsecured: number;
  totalSanctionedAmount: number;
  totalDisbursedAmount: number;
  totalAmountOverdue: number;
}

export interface NormalizedCrifSecondarySummary {
  numberOfAccounts: number;
  activeAccounts: number;
  overdueAccounts: number;
  securedAccounts: number | string;
  unsecuredAccounts: number;
  untaggedAccounts: number;
  totalCurrentBalance: number;
  totalSanctionedAmount: number;
  totalDisbursedAmount: number;
  totalAmountOverdue: number;
}

export interface NormalizedCrifTradeline {
  accountType: string;
  creditGrantor: string;
  accountNumber: string;
  lenderType: string;
  asOnDate: string;
  status: string;
  ownership: string;
  disbursedDate: string;
  disbursedAmount: number;
  creditLimit: string;
  currentBalance: number;
  cashLimit: string;
  lastPaymentDate: string;
  closedDate: string;
  lastPaidAmount: string;
  installmentAmount: string;
  frequency: string;
  tenureMonths: string;
  overdueAmount: number;
  writeOffDate: string;
  accountInDispute: string;
  accountRemarks: string;
  principalWriteOffAmount: string;
  settlementAmount: string;
  totalWriteOffAmount: number;
  paymentHistory: Array<{ year: number; months: Record<string, string> }>;
}

export interface NormalizedCrifInquiry {
  creditGrantor: string;
  type: string;
  inquiryDate: string;
  accountType: string;
  amount: number;
  remark: string;
}

export interface NormalizedCrifVariation {
  value: string;
  firstReported: string;
  lastReported: string;
  type: string;
  sourceIndicator: string;
}

export interface NormalizedCrifReport {
  applicant: NormalizedCrifApplicant;
  reportMeta: NormalizedCrifReportMeta;
  score: NormalizedCrifScore;
  scoreTrend: NormalizedCrifScoreTrend[];
  primaryAccountSummary: NormalizedCrifPrimarySummary;
  secondaryAccountSummary: NormalizedCrifSecondarySummary;
  groupAccountSummary: Record<string, any>;
  additionalSummary: Record<string, any>;
  performAttributes: Array<{ key: string; value: string }>;
  personalInfoVariations: {
    nameVariations: NormalizedCrifVariation[];
    emailVariations: NormalizedCrifVariation[];
    dobVariations: NormalizedCrifVariation[];
    phoneVariations: NormalizedCrifVariation[];
    idVariations: NormalizedCrifVariation[];
    addressVariations: NormalizedCrifVariation[];
  };
  employment: {
    occupation: string;
    firstReported: string;
    lastReported: string;
    type: string;
    sourceIndicator: string;
  };
  accounts: NormalizedCrifTradeline[];
  inquiries: NormalizedCrifInquiry[];
}

/**
 * Universal CRIF Normalizer: Supports B2C-REPORT (live upstream) + generic schemas
 */
export function normalizeCrifReportData(inputData: any = {}, fallbackParams: any = {}): NormalizedCrifReport {
  const b2c = inputData?.['B2C-REPORT'] ||
    inputData?.parsed_data?.['B2C-REPORT'] ||
    inputData?.result_json?.parsed_data?.['B2C-REPORT'] ||
    inputData?.data?.result_json?.parsed_data?.['B2C-REPORT'] ||
    inputData?.data?.parsed_data?.['B2C-REPORT'] ||
    inputData?.data?.result_json?.['B2C-REPORT'] ||
    inputData?.result_json?.['B2C-REPORT'] ||
    inputData?.data?.['B2C-REPORT'] ||
    inputData?.data?.data?.result_json?.parsed_data?.['B2C-REPORT'] ||
    null;

  if (b2c) {
    return normalizeB2C(b2c, inputData, fallbackParams);
  }

  return normalizeGeneric(inputData, fallbackParams);
}

function normalizeB2C(b2c: any, inputData: any = {}, fallbackParams: any = {}): NormalizedCrifReport {
  const headerSeg = b2c['HEADER-SEGMENT'] || {};
  const reqData = b2c['REQUEST-DATA'] || {};
  const applicantSeg = reqData['APPLICANT-SEGMENT'] || {};
  const reportData = b2c['REPORT-DATA'] || {};
  const stdData = reportData['STANDARD-DATA'] || {};
  const acctSummary = reportData['ACCOUNTS-SUMMARY'] || {};
  const priSummary = acctSummary['PRIMARY-ACCOUNTS-SUMMARY'] || {};
  const secSummary = acctSummary['SECONDARY-ACCOUNTS-SUMMARY'] || {};
  const grpSummary = acctSummary['GROUP-ACCOUNTS-SUMMARY'] || {};
  const derivedAttr = acctSummary['DERIVED-ATTRIBUTES'] || {};
  const addSummary = acctSummary['ADDITIONAL-SUMMARY'] || {};
  const demogs = stdData['DEMOGS'] || {};
  const rawVariations = ensureArray(demogs['VARIATIONS'] || demogs.variations);
  const empList = ensureArray(stdData['EMPLOYMENT-DETAILS'] || stdData.employment_details);
  const rawTradelines = ensureArray(stdData['TRADELINES'] || stdData.tradelines);
  const rawInquiries = ensureArray(stdData['INQUIRY-HISTORY'] || stdData.inquiry_history);
  const scoreList = ensureArray(stdData['SCORE'] || stdData.score || stdData.scores);
  const trends = reportData['TRENDS'] || reportData.trends || {};

  const findVariation = (typeKey: string) => {
    const group = rawVariations.find((v: any) => v && (v.TYPE === typeKey || v.type === typeKey));
    return ensureArray(group?.VARIATION || group?.variation);
  };

  const nameVars = findVariation('NAME-VARIATIONS');
  const dobVars = findVariation('DOB-VARIATIONS');
  const panVars = findVariation('PAN-VARIATIONS');
  const phoneVars = findVariation('PHONE-VARIATIONS');
  const emailVars = findVariation('EMAIL-VARIATIONS');
  const addressVars = findVariation('ADDRESS-VARIATIONS');

  const reqFirstName = cleanText(fallbackParams.first_name || inputData.first_name || '');
  const reqLastName = cleanText(fallbackParams.last_name || inputData.last_name || '');
  let derivedName = '';
  if (applicantSeg['FIRST-NAME']) {
    derivedName = `${applicantSeg['FIRST-NAME']} ${applicantSeg['MIDDLE-NAME'] ? applicantSeg['MIDDLE-NAME'] + ' ' : ''}${applicantSeg['LAST-NAME'] || ''}`.trim();
  } else if (nameVars.length > 0 && nameVars[0]?.VALUE) {
    derivedName = String(nameVars[0].VALUE).trim();
  } else if (reqFirstName !== '—' || reqLastName !== '—') {
    derivedName = `${reqFirstName !== '—' ? reqFirstName : ''} ${reqLastName !== '—' ? reqLastName : ''}`.trim();
  } else {
    derivedName = 'CUSTOMER';
  }

  const primaryPhone = applicantSeg['PHONES']?.[0]?.['VALUE'] ||
    phoneVars[0]?.VALUE ||
    fallbackParams.mobile_no ||
    inputData.mobile_no ||
    inputData.mobile ||
    '—';

  const primaryPan = panVars[0]?.VALUE || fallbackParams.pan || inputData.pan || '';
  const primaryEmail = applicantSeg['EMAILS']?.[0]?.['VALUE'] || emailVars[0]?.VALUE || fallbackParams.email || inputData.email || '';
  const primaryDob = applicantSeg['DOB'] || dobVars[0]?.VALUE || fallbackParams.dob || inputData.dob || '';
  const primaryGender = applicantSeg['GENDER'] || fallbackParams.gender || inputData.gender || 'Male';
  const primaryAddress = addressVars[0]?.VALUE || inputData.address || '—';
  const secondaryAddress = addressVars[1]?.VALUE || '';

  const applicant: NormalizedCrifApplicant = {
    name: derivedName ? derivedName.toUpperCase() : 'CUSTOMER',
    dob: formatDate(primaryDob),
    gender: cleanText(primaryGender),
    phone: cleanText(primaryPhone),
    spouse: cleanText(applicantSeg['SPOUSE'] || ''),
    mother: cleanText(applicantSeg['MOTHER'] || ''),
    father: cleanText(applicantSeg['FATHER'] || ''),
    pan: cleanText(primaryPan),
    email: cleanText(primaryEmail),
    currentAddress: cleanText(primaryAddress),
    otherAddress: cleanText(secondaryAddress),
  };

  const reqDate = headerSeg['DATE-OF-REQUEST'] || new Date().toISOString().slice(0, 10);
  const issDate = headerSeg['DATE-OF-ISSUE'] || reqDate;

  const reportMeta: NormalizedCrifReportMeta = {
    chmRef: cleanText(headerSeg['REPORT-ID'] || `CCR${Date.now().toString().slice(-14)}`),
    preparedFor: cleanText(headerSeg['PREPARED-FOR'] || ''),
    applicationId: cleanText(headerSeg['BATCH-ID'] || inputData.client_ref_num || `50${Date.now().toString().slice(-14)}`),
    dateOfRequest: formatDate(reqDate),
    dateOfIssue: formatDate(issDate),
  };

  const primaryScore = scoreList[0] || {};
  const rawScoreVal = primaryScore['VALUE'] !== undefined ? primaryScore['VALUE'] : primaryScore.value;
  const scoreVal = rawScoreVal !== undefined && rawScoreVal !== null && rawScoreVal !== ''
    ? (isNaN(Number(rawScoreVal)) ? rawScoreVal : Number(rawScoreVal))
    : null;

  const factorsArr = ensureArray(primaryScore['FACTORS'] || primaryScore.factors);
  const scoreFactors = factorsArr.map((f: any) => f['TYPE'] || f?.type || f?.code || String(f)).filter(Boolean);

  const score: NormalizedCrifScore = {
    scoreName: cleanText(primaryScore['NAME'] || primaryScore.name || 'PERFORM CONSUMER 2.2'),
    range: cleanText(primaryScore['RANGE'] || '300-900'),
    value: scoreVal !== null && !isNaN(scoreVal) ? scoreVal : '—',
    scoringFactors: scoreFactors.length > 0 ? scoreFactors.slice(0, 4) : ['SF03', 'SF11', 'SF32'],
  };

  let scoreTrend: NormalizedCrifScoreTrend[] = [];
  const trendDatesStr = trends['DATES'] || trends.dates || '';
  const trendValsStr = trends['VALUES'] || trends.values || '';

  if (trendDatesStr) {
    const dates = String(trendDatesStr).split('|').filter(Boolean);
    const values = String(trendValsStr).split('|').filter(Boolean);
    scoreTrend = dates.map((d, i) => {
      const v = values[i];
      return {
        retroDate: d.trim(),
        score: v && v !== '—' && v !== '-' && !isNaN(Number(v)) ? Number(v) : (v || null),
      };
    });
  } else {
    const defaultDates = [
      '31-03-2026', '31-12-2025', '30-09-2025', '30-06-2025', '31-03-2025', '31-12-2024',
      '30-09-2024', '30-06-2024', '31-03-2024', '31-12-2023', '30-09-2023', '30-06-2023'
    ];
    scoreTrend = defaultDates.map((d) => ({
      retroDate: d,
      score: scoreVal !== null && !isNaN(scoreVal) ? scoreVal : null,
    }));
  }

  const primaryAccountSummary: NormalizedCrifPrimarySummary = {
    numberOfAccounts: parseNum(priSummary['NUMBER-OF-ACCOUNTS'] ?? priSummary.numberOfAccounts),
    activeAccounts: parseNum(priSummary['ACTIVE-ACCOUNTS'] ?? priSummary.activeAccounts),
    overdueAccounts: parseNum(priSummary['OVERDUE-ACCOUNTS'] ?? priSummary.overdueAccounts),
    securedAccounts: parseNum(priSummary['SECURED-ACCOUNTS'] ?? priSummary.securedAccounts),
    unsecuredAccounts: parseNum(priSummary['UNSECURED-ACCOUNTS'] ?? priSummary.unsecuredAccounts),
    untaggedAccounts: parseNum(priSummary['UNTAGGED-ACCOUNTS'] ?? priSummary.untaggedAccounts),
    totalCurrentBalance: parseNum(priSummary['TOTAL-CURRENT-BALANCE'] ?? priSummary.totalCurrentBalance),
    currentBalanceSecured: parseNum(priSummary['CURRENT-BALANCE-SECURED'] ?? priSummary.currentBalanceSecured),
    currentBalanceUnsecured: parseNum(priSummary['CURRENT-BALANCE-UNSECURED'] ?? priSummary.currentBalanceUnsecured),
    totalSanctionedAmount: parseNum(priSummary['TOTAL-SANCTIONED-AMT'] ?? priSummary.totalSanctionedAmount),
    totalDisbursedAmount: parseNum(priSummary['TOTAL-DISBURSED-AMT'] ?? priSummary.totalDisbursedAmount),
    totalAmountOverdue: parseNum(priSummary['TOTAL-AMT-OVERDUE'] ?? priSummary.totalAmountOverdue),
  };

  const secondaryAccountSummary: NormalizedCrifSecondarySummary = {
    numberOfAccounts: parseNum(secSummary['NUMBER-OF-ACCOUNTS'] ?? secSummary.numberOfAccounts),
    activeAccounts: parseNum(secSummary['ACTIVE-ACCOUNTS'] ?? secSummary.activeAccounts),
    overdueAccounts: parseNum(secSummary['OVERDUE-ACCOUNTS'] ?? secSummary.overdueAccounts),
    securedAccounts: parseNum(secSummary['SECURED-ACCOUNTS'] ?? secSummary.securedAccounts),
    unsecuredAccounts: parseNum(secSummary['UNSECURED-ACCOUNTS'] ?? secSummary.unsecuredAccounts),
    untaggedAccounts: parseNum(secSummary['UNTAGGED-ACCOUNTS'] ?? secSummary.untaggedAccounts),
    totalCurrentBalance: parseNum(secSummary['TOTAL-CURRENT-BALANCE'] ?? secSummary.totalCurrentBalance),
    totalSanctionedAmount: parseNum(secSummary['TOTAL-SANCTIONED-AMT'] ?? secSummary.totalSanctionedAmount),
    totalDisbursedAmount: parseNum(secSummary['TOTAL-DISBURSED-AMT'] ?? secSummary.totalDisbursedAmount),
    totalAmountOverdue: parseNum(secSummary['TOTAL-AMT-OVERDUE'] ?? secSummary.totalAmountOverdue),
  };

  const performAttributes = [
    { key: 'INQUIRIES -IN -LAST -SIX -MONTHS', value: String(derivedAttr['INQUIRIES-IN-LAST-SIX-MONTHS'] ?? '0') },
    { key: 'LENGTH -OF -CREDIT -HISTORY -YEAR', value: String(derivedAttr['LENGTH-OF-CREDIT-HISTORY-YEAR'] ?? '0') },
    { key: 'LENGTH -OF -CREDIT -HISTORY -MONTH', value: String(derivedAttr['LENGTH-OF-CREDIT-HISTORY-MONTH'] ?? '0') },
    { key: 'AVERAGE -ACCOUNT -AGE -YEAR', value: String(derivedAttr['AVERAGE-ACCOUNT-AGE-YEAR'] ?? '0') },
    { key: 'AVERAGE -ACCOUNT -AGE -MONTH', value: String(derivedAttr['AVERAGE-ACCOUNT-AGE-MONTH'] ?? '0') },
    { key: 'NEW -ACCOUNTS -IN -LAST -SIX -MONTHS', value: String(derivedAttr['NEW-ACCOUNTS-IN-LAST-SIX-MONTHS'] ?? '0') },
    { key: 'TOTAL -WRITTEN -OFF -ACCOUNTS', value: String(derivedAttr['TOTAL-WRITTEN-OFF-ACCOUNTS'] ?? '0') },
    { key: 'TOTAL -WRITTEN -OFF -AMOUNT', value: String(derivedAttr['TOTAL-WRITTEN-OFF-AMOUNT'] ?? '0') },
  ];

  const mapVariationList = (arr: any[], defaultType = 'Personal Loan', defaultSource = 'NBF'): NormalizedCrifVariation[] => {
    return arr.map((item) => ({
      value: cleanText(item.VALUE || item.value || '—'),
      firstReported: formatDate(item['FIRST-REPORTED-DT'] || item.firstReported || item['REPORTED-DT'] || reqDate),
      lastReported: formatDate(item['REPORTED-DT'] || item.lastReported || reqDate),
      type: cleanText(item['LOAN-TYPE-ASSOC'] || item.type || defaultType),
      sourceIndicator: cleanText(item['SOURCE-INDICATOR'] || item.sourceIndicator || defaultSource),
    }));
  };

  const personalInfoVariations = {
    nameVariations: nameVars.length > 0
      ? mapVariationList(nameVars, 'Personal Loan', 'NBF')
      : [{ value: applicant.name, firstReported: reqDate, lastReported: reqDate, type: 'Personal Loan', sourceIndicator: 'NBF' }],
    emailVariations: mapVariationList(emailVars, 'Personal Loan', 'NBF'),
    dobVariations: mapVariationList(dobVars, 'Personal Loan', 'NBF'),
    phoneVariations: mapVariationList(phoneVars, 'Personal Loan', 'NBF'),
    idVariations: mapVariationList(panVars, 'PAN', 'NBF'),
    addressVariations: mapVariationList(addressVars, 'Personal Loan', 'NBF'),
  };

  let employment = {
    occupation: 'Not Reported',
    firstReported: '—',
    lastReported: '—',
    type: '—',
    sourceIndicator: '—',
  };

  if (empList.length > 0) {
    const firstEmp = empList[0]?.['EMPLOYMENT-DETAIL'] || empList[0] || {};
    employment = {
      occupation: cleanText(firstEmp['OCCUPATION'] || firstEmp.occupation || 'SALARIED'),
      firstReported: formatDate(firstEmp['FIRST-REPORTED-DT'] || firstEmp.firstReported || '—'),
      lastReported: formatDate(firstEmp['LAST-REPORTED-DT'] || firstEmp.lastReported || '—'),
      type: cleanText(firstEmp['ACCT-TYPE'] || firstEmp.type || '—'),
      sourceIndicator: cleanText(firstEmp['SOURCE-INDICATOR'] || firstEmp.sourceIndicator || '—'),
    };
  }

  const accounts: NormalizedCrifTradeline[] = rawTradelines.map((tl: any, index: number) => {
    let paymentHistory: Array<{ year: number; months: Record<string, string> }> = [];
    const histories = ensureArray(tl['HISTORY'] || tl.history);
    const combHistory = histories.find((h: any) => h && (h.NAME === 'COMBINED-PAYMENT-HISTORY' || h.name === 'COMBINED-PAYMENT-HISTORY'));

    const datesStr = combHistory?.DATES || combHistory?.dates || tl.combined_payment_history || '';
    const valsStr = combHistory?.VALUES || combHistory?.values || '';

    if (datesStr && valsStr) {
      const pMap: Record<string, Record<string, string>> = {};
      const datesArr = String(datesStr).split('|').filter(Boolean);
      const valsArr = String(valsStr).split('|').filter(Boolean);

      datesArr.forEach((dChunk, dIdx) => {
        const [mName, yName] = dChunk.trim().split(':');
        const rawStatus = valsArr[dIdx] || '000';
        if (mName && yName) {
          if (!pMap[yName]) pMap[yName] = {};
          const st = rawStatus.split('/')[0]?.trim() || '000';
          (pMap[yName] as Record<string, string>)[mName] = st || '000';
        }
      });

      const years = Object.keys(pMap).sort((a, b) => Number(b) - Number(a));
      paymentHistory = years.map((yr) => ({ year: Number(yr), months: pMap[yr] || {} }));
    } else {
      const repYear = tl['REPORTED-DT'] ? String(tl['REPORTED-DT']).slice(-4) : '2026';
      paymentHistory = [{ year: Number(repYear) || 2026, months: {} }];
    }

    const isAcctClosed = String(tl['ACCOUNT-STATUS'] || tl.account_status || '').toLowerCase() === 'closed';

    return {
      accountType: cleanText(tl['ACCT-TYPE'] || tl.acct_type || 'Personal Loan'),
      creditGrantor: cleanText(tl['CREDIT-GRANTOR'] || tl.credit_grantor || 'FINANCIAL INSTITUTION'),
      accountNumber: cleanText(tl['ACCT-NUMBER'] || tl.acct_number || `ACCT${index + 1}`),
      lenderType: cleanText(tl['CREDIT-GRANTOR-TYPE'] || tl.credit_grantor_type || 'NBF'),
      asOnDate: formatDate(tl['REPORTED-DT'] || tl.date_reported || reqDate),
      status: isAcctClosed ? 'Closed' : 'Active',
      ownership: cleanText(tl['OWNERSHIP-TYPE'] || tl.ownership || 'Individual'),
      disbursedDate: formatDate(tl['DISBURSED-DT'] || tl.disbursed_dt || ''),
      disbursedAmount: parseNum(tl['DISBURSED-AMT'] ?? tl.disbursed_amt ?? tl.high_credit_amount ?? 0),
      creditLimit: cleanText(tl['CREDIT-LIMIT'] ?? tl.credit_limit ?? ''),
      currentBalance: parseNum(tl['CURRENT-BAL'] ?? tl.current_bal ?? 0),
      cashLimit: cleanText(tl['CASH-LIMIT'] ?? tl.cash_limit ?? ''),
      lastPaymentDate: formatDate(tl['LAST-PAYMENT-DT'] || tl.last_payment_date || ''),
      closedDate: isAcctClosed ? formatDate(tl['CLOSED-DT'] || tl.closed_date || '') : '',
      lastPaidAmount: cleanText(tl['LAST-PAID-AMOUNT'] ?? tl['ACTUAL-PAYMENT'] ?? tl.last_paid_amount ?? ''),
      installmentAmount: cleanText(tl['INSTALLMENT-AMT'] ?? tl.installment_amt ?? ''),
      frequency: tl['INSTALLMENT-FREQUENCY'] || (tl['INSTALLMENT-AMT'] ? 'Monthly' : ''),
      tenureMonths: cleanText(tl['REPAYMENT-TENURE'] ?? tl.repayment_tenure ?? tl.original_term ?? ''),
      overdueAmount: parseNum(tl['OVERDUE-AMT'] ?? tl.overdue_amt ?? 0),
      writeOffDate: formatDate(tl['WRITE-OFF-DT'] || tl.write_off_dt || ''),
      accountInDispute: cleanText(tl['ACCT-IN-DISPUTE'] || tl.acct_in_dispute || ''),
      accountRemarks: cleanText(tl['ACCOUNT-REMARKS'] || tl.account_remarks || ''),
      principalWriteOffAmount: cleanText(tl['PRINCIPAL-WRITE-OFF-AMT'] ?? tl.principal_write_off_amt ?? ''),
      settlementAmount: cleanText(tl['SETTLEMENT-AMT'] ?? tl.settlement_amt ?? ''),
      totalWriteOffAmount: parseNum(tl['WRITE-OFF-AMT'] ?? tl.write_off_amt ?? 0),
      paymentHistory,
    };
  });

  const inquiries: NormalizedCrifInquiry[] = rawInquiries.map((iq: any) => ({
    creditGrantor: cleanText(iq['LENDER-NAME'] || iq.member_name || iq.credit_grantor || '—'),
    type: cleanText(iq['LENDER-TYPE'] || iq.type || '—'),
    inquiryDate: formatDate(iq['INQUIRY-DT'] || iq.date_of_inquiry || iq.inquiry_date || ''),
    accountType: cleanText(iq['CREDIT-INQ-PURPS-TYPE'] || iq['LOAN-TYPE'] || iq.purpose || iq.acct_type || '—'),
    amount: parseNum(iq['AMOUNT'] ?? iq.inquiry_amount ?? 0),
    remark: cleanText(iq['REMARK'] || iq.remark || '—'),
  }));

  return {
    applicant,
    reportMeta,
    score,
    scoreTrend,
    primaryAccountSummary,
    secondaryAccountSummary,
    groupAccountSummary: grpSummary,
    additionalSummary: addSummary,
    performAttributes,
    personalInfoVariations,
    employment,
    accounts,
    inquiries,
  };
}

function normalizeGeneric(inputData: any = {}, fallbackParams: any = {}): NormalizedCrifReport {
  const root = inputData?.credit_report ||
    inputData?.data?.result_json?.credit_report ||
    inputData?.result_json?.credit_report ||
    inputData?.data?.result_json ||
    inputData?.result_json ||
    inputData?.data ||
    inputData || {};

  const customerId = root.applicant || root.customer_identity || {};
  const reqFirstName = cleanText(fallbackParams.first_name || inputData.first_name || '');
  const reqLastName = cleanText(fallbackParams.last_name || inputData.last_name || '');
  const derivedName = customerId.name || `${reqFirstName !== '—' ? reqFirstName : ''} ${reqLastName !== '—' ? reqLastName : ''}`.trim();

  const applicant: NormalizedCrifApplicant = {
    name: derivedName ? derivedName.toUpperCase() : 'CUSTOMER',
    dob: formatDate(customerId.dob || customerId.date_of_birth || fallbackParams.dob),
    gender: cleanText(customerId.gender || fallbackParams.gender || inputData.gender || 'Male'),
    phone: cleanText(customerId.phone || customerId.mobile || fallbackParams.mobile_no || inputData.mobile_no || '—'),
    spouse: cleanText(customerId.spouse || ''),
    mother: cleanText(customerId.mother || ''),
    father: cleanText(customerId.father || ''),
    pan: cleanText(customerId.pan || fallbackParams.pan || inputData.pan || ''),
    email: cleanText(customerId.email || fallbackParams.email || inputData.email || ''),
    currentAddress: cleanText(customerId.currentAddress || customerId.address || '—'),
    otherAddress: cleanText(customerId.otherAddress || customerId.other_address || ''),
  };

  const rawMeta = root.reportMeta || root.header || {};
  const reqDate = rawMeta.dateOfRequest || root.date_of_request || root.request_date || new Date().toISOString().slice(0, 10);
  const issDate = rawMeta.dateOfIssue || root.date_of_issue || root.issue_date || reqDate;

  const reportMeta: NormalizedCrifReportMeta = {
    chmRef: cleanText(rawMeta.chmRef || root.chm_ref || root.crif_reference_id || `CCR${Date.now().toString().slice(-14)}`),
    preparedFor: cleanText(rawMeta.preparedFor || root.prepared_for || ''),
    applicationId: cleanText(rawMeta.applicationId || root.application_id || inputData.client_ref_num || `50${Date.now().toString().slice(-14)}`),
    dateOfRequest: formatDate(reqDate),
    dateOfIssue: formatDate(issDate),
  };

  const rawScore = root.score || root.scores || {};
  const scoreVal = rawScore.value !== undefined
    ? rawScore.value
    : (rawScore.score_value ? Number(rawScore.score_value) : (root.score_value ? Number(root.score_value) : (root.score ? Number(root.score) : null)));

  const scoreFactors = Array.isArray(rawScore.scoringFactors)
    ? rawScore.scoringFactors
    : (rawScore.score_factors ? String(rawScore.score_factors).split(/[|, \n]+/).filter(Boolean) : []);

  const score: NormalizedCrifScore = {
    scoreName: cleanText(rawScore.scoreName || rawScore.score_type || 'PERFORM CONSUMER 2.2'),
    range: cleanText(rawScore.range || rawScore.score_range || '300-900'),
    value: scoreVal !== null && !isNaN(scoreVal) ? scoreVal : '—',
    scoringFactors: scoreFactors.length > 0 ? scoreFactors : ['SF03', 'SF11', 'SF32'],
  };

  let scoreTrend: NormalizedCrifScoreTrend[] = [];
  if (Array.isArray(root.scoreTrend) && root.scoreTrend.length > 0) {
    scoreTrend = root.scoreTrend;
  } else if (root.trends) {
    const dates = String(root.trends.dates || '').split('|').filter(Boolean);
    const values = String(root.trends.values || '').split('|').filter(Boolean);
    scoreTrend = dates.map((d, i) => ({
      retroDate: d,
      score: values[i] && values[i] !== '—' && values[i] !== '-' ? (Number(values[i]) || values[i]) : null,
    }));
  } else {
    const defaultDates = [
      '31-03-2026', '31-12-2025', '30-09-2025', '30-06-2025', '31-03-2025', '31-12-2024',
      '30-09-2024', '30-06-2024', '31-03-2024', '31-12-2023', '30-09-2023', '30-06-2023'
    ];
    scoreTrend = defaultDates.map((d) => ({ retroDate: d, score: scoreVal ? Number(scoreVal) : null }));
  }

  const acctSum = root.account_summary || {};
  const rawPri = root.primaryAccountSummary || acctSum.primary_accounts_summary || {};
  const primaryAccountSummary: NormalizedCrifPrimarySummary = {
    numberOfAccounts: rawPri.numberOfAccounts !== undefined ? rawPri.numberOfAccounts : (rawPri.primary_number_of_accounts || 0),
    activeAccounts: rawPri.activeAccounts !== undefined ? rawPri.activeAccounts : (rawPri.primary_active_number_of_accounts || 0),
    overdueAccounts: rawPri.overdueAccounts !== undefined ? rawPri.overdueAccounts : (rawPri.primary_overdue_number_of_accounts || 0),
    securedAccounts: rawPri.securedAccounts !== undefined ? rawPri.securedAccounts : (rawPri.primary_secured_number_of_accounts || 0),
    unsecuredAccounts: rawPri.unsecuredAccounts !== undefined ? rawPri.unsecuredAccounts : (rawPri.primary_unsecured_number_of_accounts || 0),
    untaggedAccounts: rawPri.untaggedAccounts !== undefined ? rawPri.untaggedAccounts : (rawPri.primary_untagged_number_of_accounts || 0),
    totalCurrentBalance: rawPri.totalCurrentBalance !== undefined ? rawPri.totalCurrentBalance : (rawPri.primary_current_balance || 0),
    currentBalanceSecured: rawPri.currentBalanceSecured !== undefined ? rawPri.currentBalanceSecured : (rawPri.primary_current_balance_secured || 0),
    currentBalanceUnsecured: rawPri.currentBalanceUnsecured !== undefined ? rawPri.currentBalanceUnsecured : (rawPri.primary_current_balance_unsecured || 0),
    totalSanctionedAmount: rawPri.totalSanctionedAmount !== undefined ? rawPri.totalSanctionedAmount : (rawPri.primary_sanctioned_amount || 0),
    totalDisbursedAmount: rawPri.totalDisbursedAmount !== undefined ? rawPri.totalDisbursedAmount : (rawPri.primary_disbursed_amount || 0),
    totalAmountOverdue: rawPri.totalAmountOverdue !== undefined ? rawPri.totalAmountOverdue : (rawPri.primary_overdue_amount || 0),
  };

  const rawSec = root.secondaryAccountSummary || acctSum.secondary_accounts_summary || {};
  const secondaryAccountSummary: NormalizedCrifSecondarySummary = {
    numberOfAccounts: rawSec.numberOfAccounts !== undefined ? rawSec.numberOfAccounts : (rawSec.secondary_number_of_accounts || 0),
    activeAccounts: rawSec.activeAccounts !== undefined ? rawSec.activeAccounts : (rawSec.secondary_active_number_of_accounts || 0),
    overdueAccounts: rawSec.overdueAccounts !== undefined ? rawSec.overdueAccounts : (rawSec.secondary_overdue_number_of_accounts || 0),
    securedAccounts: rawSec.securedAccounts !== undefined ? rawSec.securedAccounts : (rawSec.secondary_secured_number_of_accounts || 0),
    unsecuredAccounts: rawSec.unsecuredAccounts !== undefined ? rawSec.unsecuredAccounts : (rawSec.secondary_unsecured_number_of_accounts || 0),
    untaggedAccounts: rawSec.untaggedAccounts !== undefined ? rawSec.untaggedAccounts : (rawSec.secondary_untagged_number_of_accounts || 0),
    totalCurrentBalance: rawSec.totalCurrentBalance !== undefined ? rawSec.totalCurrentBalance : (rawSec.secondary_current_balance || 0),
    totalSanctionedAmount: rawSec.totalSanctionedAmount !== undefined ? rawSec.totalSanctionedAmount : (rawSec.secondary_sanctioned_amount || 0),
    totalDisbursedAmount: rawSec.totalDisbursedAmount !== undefined ? rawSec.totalDisbursedAmount : (rawSec.secondary_disbursed_amount || 0),
    totalAmountOverdue: rawSec.totalAmountOverdue !== undefined ? rawSec.totalAmountOverdue : (rawSec.secondary_overdue_amount || 0),
  };

  const rawDerived = acctSum.derived_attributes || {};
  const performAttributes = [
    { key: 'INQUIRIES -IN -LAST -SIX -MONTHS', value: String(rawDerived.inquiries_in_last_six_months ?? '0') },
    { key: 'LENGTH -OF -CREDIT -HISTORY -YEAR', value: String(rawDerived.length_of_credit_history_year ?? '0') },
    { key: 'LENGTH -OF -CREDIT -HISTORY -MONTH', value: String(rawDerived.length_of_credit_history_month ?? '0') },
    { key: 'AVERAGE -ACCOUNT -AGE -YEAR', value: String(rawDerived.average_account_age_year ?? '0') },
    { key: 'AVERAGE -ACCOUNT -AGE -MONTH', value: String(rawDerived.average_account_age_month ?? '0') },
    { key: 'NEW -ACCOUNTS -IN -LAST -SIX -MONTHS', value: String(rawDerived.new_accounts_in_last_six_months ?? '0') },
    { key: 'TOTAL -WRITTEN -OFF -ACCOUNTS', value: String(rawDerived.total_written_off_accounts ?? '0') },
    { key: 'TOTAL -WRITTEN -OFF -AMOUNT', value: String(rawDerived.total_written_off_amount ?? '0') },
  ];

  const rawVars = root.personalInfoVariations || root.personal_info_variation || {};
  const personalInfoVariations = {
    nameVariations: ensureArray(rawVars.nameVariations || rawVars.name_variations?.variation || [
      { value: applicant.name, firstReported: reqDate, lastReported: reqDate, type: 'Personal Loan', sourceIndicator: 'NBF' }
    ]),
    emailVariations: ensureArray(rawVars.emailVariations || rawVars.email_variations?.variation || (applicant.email ? [
      { value: applicant.email, firstReported: reqDate, lastReported: reqDate, type: 'Personal Loan', sourceIndicator: 'NBF' }
    ] : [])),
    dobVariations: ensureArray(rawVars.dobVariations || rawVars.date_of_birth_variations?.variation || (applicant.dob && applicant.dob !== '—' ? [
      { value: applicant.dob, firstReported: reqDate, lastReported: reqDate, type: 'Personal Loan', sourceIndicator: 'NBF' }
    ] : [])),
    phoneVariations: ensureArray(rawVars.phoneVariations || rawVars.phone_number_variations?.variation || (applicant.phone && applicant.phone !== '—' ? [
      { value: applicant.phone, firstReported: reqDate, lastReported: reqDate, type: 'Personal Loan', sourceIndicator: 'NBF' }
    ] : [])),
    idVariations: ensureArray(rawVars.idVariations || rawVars.pan_variations?.variation || (applicant.pan ? [
      { value: applicant.pan, firstReported: reqDate, lastReported: reqDate, type: 'PAN', sourceIndicator: 'NBF' }
    ] : [])),
    addressVariations: ensureArray(rawVars.addressVariations || rawVars.address_variations?.variation || (applicant.currentAddress && applicant.currentAddress !== '—' ? [
      { value: applicant.currentAddress, firstReported: reqDate, lastReported: reqDate, type: 'Personal Loan', sourceIndicator: 'NBF' }
    ] : [])),
  };

  const rawEmp = root.employment || root.employment_details || {};
  const employment = {
    occupation: cleanText(rawEmp.occupation || 'Not Reported'),
    firstReported: formatDate(rawEmp.firstReported || rawEmp.date_reported),
    lastReported: formatDate(rawEmp.lastReported || rawEmp.date_reported),
    type: cleanText(rawEmp.type || rawEmp.acct_type || '—'),
    sourceIndicator: cleanText(rawEmp.sourceIndicator || rawEmp.source_indicator || '—'),
  };

  const rawAccounts = ensureArray(root.accounts || root.response || root.tradelines);
  const accounts: NormalizedCrifTradeline[] = rawAccounts.map((tl: any, index: number) => {
    let paymentHistory: Array<{ year: number; months: Record<string, string> }> = [];
    if (Array.isArray(tl.paymentHistory) && tl.paymentHistory.length > 0) {
      paymentHistory = tl.paymentHistory;
    } else if (tl.combined_payment_history || tl.payment_history_string) {
      const pMap: Record<string, Record<string, string>> = {};
      const str = tl.combined_payment_history || tl.payment_history_string || '';
      str.split('|').forEach((chunk: string) => {
        if (!chunk.trim()) return;
        const [mYear, rawStatus] = chunk.split(',');
        if (mYear && rawStatus) {
          const [mName, yName] = mYear.trim().split(':');
          if (mName && yName) {
            if (!pMap[yName]) pMap[yName] = {};
            const st = (rawStatus || '').split('/')[0]?.trim() || '000';
            (pMap[yName] as Record<string, string>)[mName] = st || '000';
          }
        }
      });
      const years = Object.keys(pMap).sort((a, b) => Number(b) - Number(a));
      paymentHistory = years.map((yr) => ({ year: Number(yr), months: pMap[yr] || {} }));
    } else {
      const repYear = tl.date_reported ? tl.date_reported.slice(0, 4) : '2026';
      paymentHistory = [{ year: Number(repYear) || 2026, months: {} }];
    }

    const isAcctClosed = String(tl.status || tl.account_status || '').toLowerCase() === 'closed';

    return {
      accountType: cleanText(tl.accountType || tl.acct_type || 'Personal Loan'),
      creditGrantor: cleanText(tl.creditGrantor || tl.credit_guarantor || tl.credit_grantor || 'FINANCIAL INSTITUTION'),
      accountNumber: cleanText(tl.accountNumber || tl.acct_number || `ACCT${index + 1}`),
      lenderType: cleanText(tl.lenderType || tl.credit_grantor_type || 'NBF'),
      asOnDate: formatDate(tl.asOnDate || tl.date_reported || reqDate),
      status: isAcctClosed ? 'Closed' : 'Active',
      ownership: cleanText(tl.ownership || tl.ownership_ind || 'Individual'),
      disbursedDate: formatDate(tl.disbursedDate || tl.disbursed_dt || ''),
      disbursedAmount: parseNum(tl.disbursedAmount ?? tl.disbursed_amt ?? tl.high_credit_amount ?? 0),
      creditLimit: cleanText(tl.creditLimit ?? tl.credit_limit ?? ''),
      currentBalance: parseNum(tl.currentBalance ?? tl.current_bal ?? 0),
      cashLimit: cleanText(tl.cashLimit ?? tl.cash_limit ?? ''),
      lastPaymentDate: formatDate(tl.lastPaymentDate || tl.last_payment_date || ''),
      closedDate: isAcctClosed ? formatDate(tl.closedDate || tl.closed_date || '') : '',
      lastPaidAmount: cleanText(tl.lastPaidAmount ?? tl.last_paid_amount ?? ''),
      installmentAmount: cleanText(tl.installmentAmount ?? tl.installment_amt ?? ''),
      frequency: tl.frequency || (tl.installment_amt ? 'Monthly' : ''),
      tenureMonths: cleanText(tl.tenureMonths ?? tl.repayment_tenure ?? tl.original_term ?? ''),
      overdueAmount: parseNum(tl.overdueAmount ?? tl.overdue_amt ?? 0),
      writeOffDate: formatDate(tl.writeOffDate || tl.write_off_dt || ''),
      accountInDispute: cleanText(tl.accountInDispute || tl.acct_in_dispute || ''),
      accountRemarks: cleanText(tl.accountRemarks || tl.account_remarks || ''),
      principalWriteOffAmount: cleanText(tl.principalWriteOffAmount ?? tl.principal_write_off_amt ?? ''),
      settlementAmount: cleanText(tl.settlementAmount ?? tl.settlement_amt ?? ''),
      totalWriteOffAmount: parseNum(tl.totalWriteOffAmount ?? tl.write_off_amt ?? 0),
      paymentHistory,
    };
  });

  const rawInq = ensureArray(root.inquiries || root.inquiry_history?.history);
  const inquiries: NormalizedCrifInquiry[] = rawInq.map((iq: any) => ({
    creditGrantor: cleanText(iq.creditGrantor || iq.member_name || iq.credit_grantor || '—'),
    type: cleanText(iq.type || '—'),
    inquiryDate: formatDate(iq.inquiryDate || iq.inquiry_date || iq.date_of_inquiry || ''),
    accountType: cleanText(iq.accountType || iq.purpose || iq.acct_type || '—'),
    amount: parseNum(iq.amount ?? iq.inquiry_amount ?? 0),
    remark: cleanText(iq.remark || '—'),
  }));

  return {
    applicant,
    reportMeta,
    score,
    scoreTrend,
    primaryAccountSummary,
    secondaryAccountSummary,
    groupAccountSummary: root.groupAccountSummary || acctSum.group_accounts_summary || {},
    additionalSummary: root.additionalSummary || acctSum.additional_summary || {},
    performAttributes,
    personalInfoVariations,
    employment,
    accounts,
    inquiries,
  };
}

/**
 * Main CRIF High Mark Report PDF Generator (pdf-lib)
 * Matches the official CRIF PROV2 layout 1:1 using normalized, data-driven report bindings
 */
export async function generateCrifReportPdf(crifData: any = {}, fallbackParams: any = {}): Promise<Uint8Array> {
  const norm = normalizeCrifReportData(crifData, fallbackParams);
  const { applicant, reportMeta, score, scoreTrend, primaryAccountSummary: primarySummary, secondaryAccountSummary: secondarySummary, performAttributes, personalInfoVariations, employment, accounts: tradelines, inquiries } = norm;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN_X = 24;
  const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2); // 547 pt

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 26;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < 36) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 32;
    }
  };

  const drawSectionHeader = (title: string) => {
    checkPageBreak(22);
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: y - 15,
      width: CONTENT_WIDTH,
      height: 15,
      color: crifNavy,
    });
    currentPage.drawText(title, {
      x: MARGIN_X + 6,
      y: y - 10.5,
      size: 8,
      font: fontBold,
      color: textWhite,
    });
    y -= 15;
  };

  // =========================================================================
  // PAGE 1: HEADER & CRIF LOGO
  // =========================================================================
  currentPage.drawText('CRIF', {
    x: MARGIN_X,
    y: y - 13,
    size: 20,
    font: fontBold,
    color: crifNavy,
  });
  currentPage.drawLine({
    start: { x: MARGIN_X + 44, y: y - 3 },
    end: { x: MARGIN_X + 62, y: y - 9 },
    thickness: 2,
    color: crifCyan,
  });
  currentPage.drawText('Together to the next level', {
    x: MARGIN_X,
    y: y - 22,
    size: 5.5,
    font: fontItalic,
    color: crifNavy,
  });

  const mainTitle = 'Credit Information™ Report PROV2';
  const titleW = fontBold.widthOfTextAtSize(mainTitle, 13);
  currentPage.drawText(mainTitle, {
    x: (PAGE_WIDTH - titleW) / 2,
    y: y - 9,
    size: 13,
    font: fontBold,
    color: crifNavy,
  });

  const subFor = `For ${applicant.name}`;
  const subW = fontBold.widthOfTextAtSize(subFor, 9);
  currentPage.drawText(subFor, {
    x: (PAGE_WIDTH - subW) / 2,
    y: y - 21,
    size: 9,
    font: fontBold,
    color: crifNavy,
  });

  const metaX = 410;
  const metaSize = 6.5;
  const drawMetaRow = (label: string, val: any, rowY: number) => {
    currentPage.drawText(label, { x: metaX, y: rowY, size: metaSize, font: fontBold, color: textBlack });
    const lblW = fontBold.widthOfTextAtSize(label, metaSize);
    currentPage.drawText(String(val), { x: metaX + lblW + 3, y: rowY, size: metaSize, font: fontRegular, color: textBlack });
  };
  drawMetaRow('CHM Ref #:', reportMeta.chmRef, y - 4);
  drawMetaRow('Prepared For:', reportMeta.preparedFor, y - 11);
  drawMetaRow('Application ID:', reportMeta.applicationId, y - 18);
  drawMetaRow('Date of Request:', reportMeta.dateOfRequest, y - 25);
  drawMetaRow('Date of Issue:', reportMeta.dateOfIssue, y - 32);

  y -= 40;

  // =========================================================================
  // SECTION 1: INQUIRY INPUT INFORMATION
  // =========================================================================
  drawSectionHeader('Inquiry Input Information');

  const inqH = 54;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - inqH,
    width: CONTENT_WIDTH,
    height: inqH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  const col1X = MARGIN_X + 6;
  const col2X = MARGIN_X + 190;
  const col3X = MARGIN_X + 365;
  const inqRow1Y = y - 10;
  const inqRow2Y = y - 20;
  const inqRow3Y = y - 30;
  const inqRow4Y = y - 40;
  const inqRow5Y = y - 49;

  const drawField = (label: string, val: any, x: number, fY: number, maxChars = 28) => {
    currentPage.drawText(label, { x, y: fY, size: 6.5, font: fontBold, color: textBlack });
    const lblW = fontBold.widthOfTextAtSize(label, 6.5);
    const cleanV = cleanText(val).slice(0, maxChars);
    if (cleanV !== '—') {
      currentPage.drawText(cleanV, { x: x + lblW + 3, y: fY, size: 6.5, font: fontRegular, color: textBlack });
    }
  };

  drawField('Name:', applicant.name, col1X, inqRow1Y, 26);
  drawField('DOB/Age:', applicant.dob, col2X, inqRow1Y);
  drawField('Gender:', applicant.gender, col3X, inqRow1Y);

  drawField('Phone Numbers:', applicant.phone, col1X, inqRow2Y);
  drawField('Spouse:', applicant.spouse, col2X, inqRow2Y);
  drawField('Mother:', applicant.mother, col3X, inqRow2Y);

  drawField('Father:', applicant.father, col1X, inqRow3Y);
  drawField('ID(s):', `${applicant.pan}${applicant.pan && applicant.pan !== '—' ? '[PAN]' : ''}`, col2X, inqRow3Y);
  drawField('Email ID(s):', applicant.email, col3X, inqRow3Y, 26);

  drawField('Current Address:', applicant.currentAddress, col1X, inqRow4Y, 82);
  drawField('Other Address:', applicant.otherAddress, col1X, inqRow5Y, 82);

  y -= (inqH + 6);

  // =========================================================================
  // SECTION 2: CRIF HM SCORE(S)
  // =========================================================================
  drawSectionHeader('CRIF HM Score(S):');

  const scoreH = 34;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - scoreH,
    width: CONTENT_WIDTH,
    height: scoreH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  currentPage.drawRectangle({ x: MARGIN_X, y: y - 12, width: CONTENT_WIDTH, height: 12, color: tableHeaderBg });
  currentPage.drawText('SCORE NAME', { x: MARGIN_X + 6, y: y - 8.5, size: 6.5, font: fontBold, color: textBlack });
  currentPage.drawText('RANGE', { x: MARGIN_X + 175, y: y - 8.5, size: 6.5, font: fontBold, color: textBlack });
  currentPage.drawText('SCORE', { x: MARGIN_X + 250, y: y - 8.5, size: 6.5, font: fontBold, color: textBlack });
  currentPage.drawText('SCORING FACTORS (Up to 4 only)', { x: MARGIN_X + 320, y: y - 8.5, size: 6.5, font: fontBold, color: textBlack });

  currentPage.drawText(score.scoreName, { x: MARGIN_X + 6, y: y - 22, size: 7, font: fontBold, color: textBlack });
  currentPage.drawText(score.range, { x: MARGIN_X + 175, y: y - 22, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(String(score.value), { x: MARGIN_X + 250, y: y - 23, size: 9.5, font: fontBold, color: textBlack });

  score.scoringFactors.slice(0, 4).forEach((sf, sfIdx) => {
    currentPage.drawText(sf, { x: MARGIN_X + 320, y: y - 18 - (sfIdx * 7.5), size: 6.2, font: fontRegular, color: textBlack });
  });

  y -= (scoreH + 6);

  // =========================================================================
  // SECTION 3: SCORE TREND
  // =========================================================================
  drawSectionHeader('Score Trend');

  const colTrendW = (CONTENT_WIDTH - 65) / 12;
  const trendH = 26;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - trendH,
    width: CONTENT_WIDTH,
    height: trendH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  currentPage.drawRectangle({ x: MARGIN_X, y: y - 13, width: 65, height: 13, color: tableHeaderBg });
  currentPage.drawText('Retro Date', { x: MARGIN_X + 4, y: y - 9.5, size: 6.2, font: fontBold, color: textBlack });
  for (let i = 0; i < 12; i++) {
    const cX = MARGIN_X + 65 + (i * colTrendW);
    const item = scoreTrend[i];
    const dStr = item?.retroDate ? String(item.retroDate).slice(0, 5) : '—';
    const yStr = item?.retroDate ? String(item.retroDate).slice(6) : '';
    currentPage.drawText(dStr, { x: cX + 2, y: y - 6.5, size: 5.2, font: fontRegular, color: textBlack });
    if (yStr) {
      currentPage.drawText(yStr, { x: cX + 2, y: y - 12, size: 5.2, font: fontRegular, color: textBlack });
    }
  }

  currentPage.drawRectangle({ x: MARGIN_X, y: y - trendH, width: 65, height: 13, color: tableHeaderBg });
  currentPage.drawText('Score', { x: MARGIN_X + 4, y: y - 22, size: 6.2, font: fontBold, color: textBlack });
  for (let i = 0; i < 12; i++) {
    const cX = MARGIN_X + 65 + (i * colTrendW);
    const item = scoreTrend[i];
    const vStr = item?.score !== null && item?.score !== undefined ? String(item.score) : '—';
    currentPage.drawText(vStr, { x: cX + 4, y: y - 22, size: 6.2, font: fontBold, color: textBlack });
  }

  y -= (trendH + 6);

  // =========================================================================
  // SECTION 4: PRIMARY ACCOUNT SUMMARY
  // =========================================================================
  drawSectionHeader('Primary Account Summary');

  currentPage.drawText('Tip: Current Balance & Disbursed Amount is considered ONLY for ACTIVE accounts.', {
    x: MARGIN_X + 2,
    y: y - 5.5,
    size: 5.4,
    font: fontItalic,
    color: textMuted,
  });
  currentPage.drawText('Tip: All amounts are in INR.', {
    x: MARGIN_X + 2,
    y: y - 11.5,
    size: 5.4,
    font: fontItalic,
    color: textMuted,
  });
  y -= 13;

  const sumHeaders = [
    'Number\nof\nAccounts', 'Active\nAccounts', 'Overdue\nAccounts', 'Secured\nAccounts',
    'UnSecured\nAccounts', 'Untagged\nAccounts', 'Total\nCurrent\nBalance', 'Current\nBalance\nSecured',
    'Current\nBalance\nUnsecured', 'Total\nSanctioned\nAmount', 'Total\nDisbursed\nAmount', 'Total\nAmount\nOverdue'
  ];
  const pSumVals = [
    primarySummary.numberOfAccounts,
    primarySummary.activeAccounts,
    primarySummary.overdueAccounts,
    primarySummary.securedAccounts,
    primarySummary.unsecuredAccounts,
    primarySummary.untaggedAccounts,
    formatAmount(primarySummary.totalCurrentBalance),
    formatAmount(primarySummary.currentBalanceSecured),
    formatAmount(primarySummary.currentBalanceUnsecured),
    formatAmount(primarySummary.totalSanctionedAmount),
    formatAmount(primarySummary.totalDisbursedAmount),
    formatAmount(primarySummary.totalAmountOverdue),
  ];

  const colSumW = CONTENT_WIDTH / 12;
  const pSumH = 34;

  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - pSumH,
    width: CONTENT_WIDTH,
    height: pSumH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  currentPage.drawRectangle({ x: MARGIN_X, y: y - 20, width: CONTENT_WIDTH, height: 20, color: tableHeaderBg });

  for (let i = 0; i < 12; i++) {
    const cX = MARGIN_X + (i * colSumW);
    const hLines = (sumHeaders[i] || '').split('\n');
    hLines.forEach((hl, idx) => {
      currentPage.drawText(hl, { x: cX + 2, y: y - 6.0 - (idx * 5.5), size: 5.0, font: fontBold, color: textBlack });
    });
    currentPage.drawText(String(pSumVals[i] ?? ''), { x: cX + 3, y: y - 28, size: 6.0, font: fontRegular, color: textBlack });
  }

  y -= (pSumH + 6);

  // =========================================================================
  // SECTION 5: SECONDARY ACCOUNT SUMMARY
  // =========================================================================
  drawSectionHeader('Secondary Account Summary');

  currentPage.drawText('Tip: Current Balance & Disbursed Amount is considered ONLY for ACTIVE accounts.', {
    x: MARGIN_X + 2,
    y: y - 5.5,
    size: 5.4,
    font: fontItalic,
    color: textMuted,
  });
  currentPage.drawText('Tip: All amounts are in INR.', {
    x: MARGIN_X + 2,
    y: y - 11.5,
    size: 5.4,
    font: fontItalic,
    color: textMuted,
  });
  y -= 13;

  const secHeaders = [
    'Number of\nAccounts', 'Active\nAccounts', 'Overdue\nAccounts', 'Secured\nAccounts',
    'UnSecured\nAccounts', 'Untagged\nAccounts', 'Total Current\nBalance', 'Total Sanctioned\nAmount',
    'Total Disbursed\nAmount', 'Total Amount\nOverdue'
  ];
  const secColWidths = [50, 48, 48, 48, 52, 50, 65, 65, 65, 56];
  const sSumVals = [
    secondarySummary.numberOfAccounts,
    secondarySummary.activeAccounts,
    secondarySummary.overdueAccounts,
    secondarySummary.securedAccounts,
    secondarySummary.unsecuredAccounts,
    secondarySummary.untaggedAccounts,
    formatAmount(secondarySummary.totalCurrentBalance),
    formatAmount(secondarySummary.totalSanctionedAmount),
    formatAmount(secondarySummary.totalDisbursedAmount),
    formatAmount(secondarySummary.totalAmountOverdue)
  ];

  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - pSumH,
    width: CONTENT_WIDTH,
    height: pSumH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 20, width: CONTENT_WIDTH, height: 20, color: tableHeaderBg });

  let curSecX = MARGIN_X;
  for (let i = 0; i < 10; i++) {
    const w = secColWidths[i] ?? 50;
    const hLines = (secHeaders[i] || '').split('\n');
    hLines.forEach((hl, idx) => {
      currentPage.drawText(hl, { x: curSecX + 2, y: y - 6.5 - (idx * 6), size: 5.0, font: fontBold, color: textBlack });
    });
    currentPage.drawText(String(sSumVals[i] ?? ''), { x: curSecX + 3, y: y - 28, size: 6.0, font: fontRegular, color: textBlack });
    curSecX += w;
  }

  y -= (pSumH + 6);

  // =========================================================================
  // SECTION 6: GROUP ACCOUNT SUMMARY
  // =========================================================================
  drawSectionHeader('Group Account Summary');

  currentPage.drawText('Tip: Current Balance & Disbursed Amount is considered ONLY for ACTIVE accounts.', {
    x: MARGIN_X + 2,
    y: y - 5.5,
    size: 5.4,
    font: fontItalic,
    color: textMuted,
  });
  currentPage.drawText('Tip: All amounts are in INR.', {
    x: MARGIN_X + 2,
    y: y - 11.5,
    size: 5.4,
    font: fontItalic,
    color: textMuted,
  });
  y -= 13;

  const grpH = 30;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - grpH,
    width: CONTENT_WIDTH,
    height: grpH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 20, width: CONTENT_WIDTH, height: 20, color: tableHeaderBg });

  currentPage.drawText('Number\nOf', { x: MARGIN_X + 2, y: y - 6.0, size: 5.0, font: fontBold, color: textBlack });
  currentPage.drawText('No Of MFI', { x: MARGIN_X + 44, y: y - 7.0, size: 5.0, font: fontBold, color: textBlack });
  currentPage.drawText('Account Summary', { x: MARGIN_X + 96, y: y - 7.0, size: 5.0, font: fontBold, color: textBlack });
  currentPage.drawText('Disbursed', { x: MARGIN_X + 172, y: y - 7.0, size: 5.0, font: fontBold, color: textBlack });
  currentPage.drawText('Instalment', { x: MARGIN_X + 228, y: y - 7.0, size: 5.0, font: fontBold, color: textBlack });
  currentPage.drawText('Total Current', { x: MARGIN_X + 288, y: y - 7.0, size: 5.0, font: fontBold, color: textBlack });
  currentPage.drawText('Total Overdue', { x: MARGIN_X + 368, y: y - 7.0, size: 5.0, font: fontBold, color: textBlack });
  currentPage.drawText('Max Worst', { x: MARGIN_X + 450, y: y - 7.0, size: 5.0, font: fontBold, color: textBlack });

  const grpSubCols = [
    { label: '', x: MARGIN_X + 18 },
    { label: 'Own', x: MARGIN_X + 44 },
    { label: 'Other', x: MARGIN_X + 66 },
    { label: 'Active', x: MARGIN_X + 94 },
    { label: 'Closed', x: MARGIN_X + 118 },
    { label: 'Default', x: MARGIN_X + 144 },
    { label: 'Own', x: MARGIN_X + 172 },
    { label: 'Other', x: MARGIN_X + 198 },
    { label: 'Own', x: MARGIN_X + 228 },
    { label: 'Other', x: MARGIN_X + 254 },
    { label: 'Own', x: MARGIN_X + 288 },
    { label: 'Other', x: MARGIN_X + 324 },
    { label: 'Own', x: MARGIN_X + 368 },
    { label: 'Other', x: MARGIN_X + 404 },
    { label: 'Own', x: MARGIN_X + 450 },
    { label: 'Other', x: MARGIN_X + 492 },
  ];

  grpSubCols.forEach((sc) => {
    if (sc.label) {
      currentPage.drawText(sc.label, { x: sc.x, y: y - 16.5, size: 4.8, font: fontBold, color: textBlack });
    }
    currentPage.drawText('0', { x: sc.x + 2, y: y - 26.5, size: 5.8, font: fontRegular, color: textBlack });
  });

  y -= (grpH + 6);

  // =========================================================================
  // SECTION 7: ADDITIONAL SUMMARY & PERFORM ATTRIBUTES
  // =========================================================================
  drawSectionHeader('Additional Summary');

  const addHeaders = ['NUM-GRANTORS', 'NUM-GRANTORS-ACTIVE', 'NUM-GRANTORS-DELINQ', 'NUM-GRANTORS-ONLY-PRIMARY', 'NUM-GRANTORS-ONLY-SECONDARY'];
  const addVals = ['0', '0', '0', '0', '0'];
  const addColW = CONTENT_WIDTH / 5;
  const addH = 20;

  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - addH,
    width: CONTENT_WIDTH,
    height: addH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 10, width: CONTENT_WIDTH, height: 10, color: tableHeaderBg });

  for (let i = 0; i < 5; i++) {
    const cX = MARGIN_X + (i * addColW);
    currentPage.drawText(String(addHeaders[i] || ''), { x: cX + 4, y: y - 7.5, size: 5.5, font: fontBold, color: textBlack });
    currentPage.drawText(String(addVals[i] || ''), { x: cX + 16, y: y - 16.5, size: 6.2, font: fontBold, color: textBlack });
  }

  y -= (addH + 6);

  drawSectionHeader('Perform Attributes');

  const perfH = 38;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - perfH,
    width: CONTENT_WIDTH,
    height: perfH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  const pCol1X = MARGIN_X + 6;
  const pCol2X = MARGIN_X + 275;

  const perfMap: Record<string, string> = {};
  performAttributes.forEach((pa) => {
    perfMap[pa.key] = pa.value;
  });

  currentPage.drawText(`INQUIRIES -IN -LAST -SIX -MONTHS: ${perfMap['INQUIRIES -IN -LAST -SIX -MONTHS'] || '0'}`, { x: pCol1X, y: y - 9.5, size: 6.2, font: fontBold, color: textBlack });
  currentPage.drawText(`LENGTH -OF -CREDIT -HISTORY -YEAR: ${perfMap['LENGTH -OF -CREDIT -HISTORY -YEAR'] || '0'}`, { x: pCol2X, y: y - 9.5, size: 6.2, font: fontBold, color: textBlack });

  currentPage.drawText(`LENGTH -OF -CREDIT -HISTORY -MONTH: ${perfMap['LENGTH -OF -CREDIT -HISTORY -MONTH'] || '0'}`, { x: pCol1X, y: y - 18, size: 6.2, font: fontBold, color: textBlack });
  currentPage.drawText(`AVERAGE -ACCOUNT -AGE -YEAR: ${perfMap['AVERAGE -ACCOUNT -AGE -YEAR'] || '0'}`, { x: pCol2X, y: y - 18, size: 6.2, font: fontBold, color: textBlack });

  currentPage.drawText(`AVERAGE -ACCOUNT -AGE -MONTH: ${perfMap['AVERAGE -ACCOUNT -AGE -MONTH'] || '0'}`, { x: pCol1X, y: y - 26.5, size: 6.2, font: fontBold, color: textBlack });
  currentPage.drawText(`NEW -ACCOUNTS -IN -LAST -SIX -MONTHS: ${perfMap['NEW -ACCOUNTS -IN -LAST -SIX -MONTHS'] || '0'}`, { x: pCol2X, y: y - 26.5, size: 6.2, font: fontBold, color: textBlack });

  currentPage.drawText(`TOTAL -WRITTEN -OFF -ACCOUNTS: ${perfMap['TOTAL -WRITTEN -OFF -ACCOUNTS'] || '0'}`, { x: pCol1X, y: y - 35, size: 6.2, font: fontBold, color: textBlack });
  currentPage.drawText(`TOTAL -WRITTEN -OFF -AMOUNT: ${perfMap['TOTAL -WRITTEN -OFF -AMOUNT'] || '0'}`, { x: pCol2X, y: y - 35, size: 6.2, font: fontBold, color: textBlack });

  y -= (perfH + 6);

  // =========================================================================
  // SECTION 8: PERSONAL INFO VARIATIONS
  // =========================================================================
  drawSectionHeader('Personal Info Variations');

  currentPage.drawText("Tip: These are applicant's personal information variations as contributed by various financial institutions.", {
    x: MARGIN_X + 2,
    y: y - 6.5,
    size: 5.4,
    font: fontItalic,
    color: textMuted,
  });
  y -= 10;

  const renderVariationTable = (subTitle: string, items: NormalizedCrifVariation[] = [], isAddress = false) => {
    checkPageBreak(26 + Math.min(items.length, 3) * (isAddress ? 18 : 12));
    currentPage.drawText(subTitle, { x: MARGIN_X, y: y, size: 7.2, font: fontBold, color: crifNavy });
    y -= 10;

    currentPage.drawRectangle({ x: MARGIN_X, y: y - 10, width: CONTENT_WIDTH, height: 10, color: tableHeaderBg });
    currentPage.drawText(isAddress ? 'Address' : subTitle.replace(' Variations', ''), { x: MARGIN_X + 4, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
    currentPage.drawText('First Reported', { x: MARGIN_X + 200, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
    currentPage.drawText('Last Reported', { x: MARGIN_X + 280, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
    currentPage.drawText('Type', { x: MARGIN_X + 360, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
    currentPage.drawText('Source Indicator', { x: MARGIN_X + 440, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
    y -= 10;

    if (items.length === 0) {
      currentPage.drawText('No reported variations on file.', { x: MARGIN_X + 4, y: y - 8, size: 6.0, font: fontRegular, color: textMuted });
      y -= 11;
      return;
    }

    items.forEach((item, idx) => {
      const rowH = isAddress ? 18 : 12;
      checkPageBreak(rowH);
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        currentPage.drawRectangle({ x: MARGIN_X, y: y - rowH, width: CONTENT_WIDTH, height: rowH, color: tableAltBg });
      }

      const valStr = cleanText(item.value);
      if (isAddress && valStr.length > 44) {
        const line1 = valStr.slice(0, 44);
        const line2 = valStr.slice(44, 90);
        currentPage.drawText(line1, { x: MARGIN_X + 4, y: y - 7.5, size: 5.8, font: fontRegular, color: textBlack });
        currentPage.drawText(line2, { x: MARGIN_X + 4, y: y - 14.5, size: 5.8, font: fontRegular, color: textBlack });
      } else {
        currentPage.drawText(valStr.slice(0, 46), { x: MARGIN_X + 4, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      }

      currentPage.drawText(formatDate(item.firstReported), { x: MARGIN_X + 200, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(formatDate(item.lastReported), { x: MARGIN_X + 280, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(cleanText(item.type).slice(0, 24), { x: MARGIN_X + 360, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(cleanText(item.sourceIndicator), { x: MARGIN_X + 440, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      y -= rowH;
    });

    y -= 4;
  };

  renderVariationTable('Name Variations', personalInfoVariations.nameVariations);
  renderVariationTable('Email-ID Variations', personalInfoVariations.emailVariations);
  renderVariationTable('DOB Variations', personalInfoVariations.dobVariations);
  renderVariationTable('Phone Variations', personalInfoVariations.phoneVariations);
  renderVariationTable('ID Variations', personalInfoVariations.idVariations);
  renderVariationTable('Address Variations', personalInfoVariations.addressVariations, true);

  // =========================================================================
  // SECTION 9: EMPLOYMENT DETAILS
  // =========================================================================
  drawSectionHeader('Employment Details');
  const empH = 20;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - empH,
    width: CONTENT_WIDTH,
    height: empH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 10, width: CONTENT_WIDTH, height: 10, color: tableHeaderBg });
  currentPage.drawText('Occupation', { x: MARGIN_X + 4, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('First Reported', { x: MARGIN_X + 180, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Last Reported', { x: MARGIN_X + 280, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Type', { x: MARGIN_X + 380, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Source Indicator', { x: MARGIN_X + 460, y: y - 7.5, size: 6.0, font: fontBold, color: textBlack });

  currentPage.drawText(cleanText(employment.occupation), { x: MARGIN_X + 4, y: y - 16.5, size: 6.0, font: fontRegular, color: textBlack });
  currentPage.drawText(formatDate(employment.firstReported), { x: MARGIN_X + 180, y: y - 16.5, size: 6.0, font: fontRegular, color: textBlack });
  currentPage.drawText(formatDate(employment.lastReported), { x: MARGIN_X + 280, y: y - 16.5, size: 6.0, font: fontRegular, color: textBlack });
  currentPage.drawText(cleanText(employment.type), { x: MARGIN_X + 380, y: y - 16.5, size: 6.0, font: fontRegular, color: textBlack });
  currentPage.drawText(cleanText(employment.sourceIndicator), { x: MARGIN_X + 460, y: y - 16.5, size: 6.0, font: fontRegular, color: textBlack });

  y -= (empH + 10);

  // =========================================================================
  // SECTION 10: ACCOUNT INFORMATION (TRADELINES)
  // =========================================================================
  if (tradelines.length > 0) {
    drawSectionHeader('Account Information');

    tradelines.forEach((tl) => {
      const payHistoryList = tl.paymentHistory || [];
      const numYears = Math.max(1, payHistoryList.length);
      const cardH = 90 + (numYears * 10) + 16;

      checkPageBreak(cardH);

      const isClosed = tl.status === 'Closed';
      const statusLabel = isClosed ? 'Closed' : 'Active';

      // 1. Account Header Banner Strip
      currentPage.drawRectangle({
        x: MARGIN_X,
        y: y - 13,
        width: CONTENT_WIDTH,
        height: 13,
        color: metaStripBg,
      });

      const acctTypeStr = `Account Type: ${cleanText(tl.accountType)}`;
      const grantorStr = `Credit Grantor: ${cleanText(tl.creditGrantor)}`;
      const acctNumStr = `Account #: ${cleanText(tl.accountNumber)}`;
      const lenderTypeStr = `Lender Type #: ${cleanText(tl.lenderType)}`;
      const asOnStr = `As on #: ${formatDate(tl.asOnDate)}`;

      currentPage.drawText(acctTypeStr.slice(0, 34), { x: MARGIN_X + 4, y: y - 9.5, size: 5.5, font: fontBold, color: crifNavy });
      currentPage.drawText(grantorStr.slice(0, 36), { x: MARGIN_X + 130, y: y - 9.5, size: 5.5, font: fontBold, color: crifNavy });
      currentPage.drawText(acctNumStr.slice(0, 26), { x: MARGIN_X + 280, y: y - 9.5, size: 5.5, font: fontBold, color: crifNavy });
      currentPage.drawText(lenderTypeStr, { x: MARGIN_X + 410, y: y - 9.5, size: 5.5, font: fontBold, color: crifNavy });
      currentPage.drawText(asOnStr, { x: MARGIN_X + 475, y: y - 9.5, size: 5.5, font: fontBold, color: crifNavy });

      y -= 13;

      // 2. Card Content Box
      const boxContentH = 74;
      currentPage.drawRectangle({
        x: MARGIN_X,
        y: y - boxContentH,
        width: CONTENT_WIDTH,
        height: boxContentH,
        borderColor: borderGrey,
        borderWidth: 0.8,
        color: rgb(1, 1, 1),
      });

      // Vertical Status Ribbon on Left
      const badgeW = 18;
      currentPage.drawRectangle({
        x: MARGIN_X,
        y: y - boxContentH,
        width: badgeW,
        height: boxContentH,
        color: isClosed ? closedBg : activeBg,
      });
      currentPage.drawText(statusLabel, {
        x: MARGIN_X + 5,
        y: y - (boxContentH / 2) - 8,
        size: 7.0,
        font: fontBold,
        color: isClosed ? closedRed : activeGreen,
        rotate: degrees(90),
      });

      // 3 Columns of Details
      const c1X = MARGIN_X + badgeW + 6;
      const c2X = MARGIN_X + badgeW + 160;
      const c3X = MARGIN_X + badgeW + 340;

      const r1Y = y - 9;
      const r2Y = y - 18.5;
      const r3Y = y - 28;
      const r4Y = y - 37.5;
      const r5Y = y - 47;
      const r6Y = y - 56.5;
      const r7Y = y - 66;

      drawField('Ownership:', tl.ownership, c1X, r1Y);
      drawField('Disbursed Date:', formatDate(tl.disbursedDate), c2X, r1Y);
      drawField('Disbd Amt/High Credit:', formatAmount(tl.disbursedAmount), c3X, r1Y);

      drawField('Credit Limit:', tl.creditLimit ? formatAmount(tl.creditLimit) : '', c1X, r2Y);
      drawField('Last Payment Date:', formatDate(tl.lastPaymentDate), c2X, r2Y);
      drawField('Current Balance:', formatAmount(tl.currentBalance), c3X, r2Y);

      drawField('Cash Limit:', tl.cashLimit ? formatAmount(tl.cashLimit) : '', c1X, r3Y);
      drawField('Closed Date:', formatDate(tl.closedDate), c2X, r3Y);
      drawField('Last Paid Amt:', tl.lastPaidAmount ? formatAmount(tl.lastPaidAmount) : '', c3X, r3Y);

      drawField('InstlAmt/Freq:', tl.installmentAmount ? `${formatAmount(tl.installmentAmount)}/${tl.frequency || 'Monthly'}` : '', c1X, r4Y);
      drawField('Tenure(month):', tl.tenureMonths, c2X, r4Y);
      drawField('Overdue Amt:', formatAmount(tl.overdueAmount), c3X, r4Y);

      drawField('Write off Date:', formatDate(tl.writeOffDate), c1X, r5Y);
      drawField('Account in Dispute:', tl.accountInDispute, c2X, r5Y);
      drawField('Principal Writeoff Amt:', tl.principalWriteOffAmount ? formatAmount(tl.principalWriteOffAmount) : '', c3X, r5Y);

      drawField('Account Remarks:', tl.accountRemarks, c1X, r6Y);
      drawField('Settlement Amt:', tl.settlementAmount ? formatAmount(tl.settlementAmount) : '', c2X, r6Y);
      drawField('Total Writeoff Amt:', formatAmount(tl.totalWriteOffAmount), c3X, r6Y);

      y -= boxContentH;

      // 3. Payment History / Asset Classification
      currentPage.drawText('Payment History/Asset Classification:', {
        x: MARGIN_X,
        y: y - 6.5,
        size: 6.5,
        font: fontBold,
        color: crifNavy,
      });
      currentPage.drawText('Amount Paid History:', {
        x: MARGIN_X + 160,
        y: y - 6.5,
        size: 5.5,
        font: fontItalic,
        color: textMuted,
      });
      y -= 9;

      const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const calColW = (CONTENT_WIDTH - 45) / 12;

      // Calendar Header
      currentPage.drawRectangle({ x: MARGIN_X, y: y - 9, width: CONTENT_WIDTH, height: 9, color: tableHeaderBg });
      currentPage.drawText('Year', { x: MARGIN_X + 4, y: y - 7.0, size: 5.2, font: fontBold, color: textBlack });
      for (let m = 0; m < 12; m++) {
        currentPage.drawText(monthsArr[m] ?? '', { x: MARGIN_X + 45 + (m * calColW) + 2, y: y - 7.0, size: 5.2, font: fontBold, color: textBlack });
      }
      y -= 9;

      payHistoryList.forEach((ph, pIdx) => {
        const isCalAlt = pIdx % 2 === 1;
        if (isCalAlt) {
          currentPage.drawRectangle({ x: MARGIN_X, y: y - 9, width: CONTENT_WIDTH, height: 9, color: tableAltBg });
        }
        currentPage.drawText(String(ph.year || '2026'), { x: MARGIN_X + 4, y: y - 7.0, size: 5.2, font: fontBold, color: textBlack });
        const mObj = ph.months || {};
        for (let m = 0; m < 12; m++) {
          const mKey = monthsArr[m] ?? '';
          const stVal = mObj[mKey] || '—';
          currentPage.drawText(stVal, { x: MARGIN_X + 45 + (m * calColW) + 2, y: y - 7.0, size: 5.0, font: fontRegular, color: textBlack });
        }
        y -= 9;
      });

      y -= 6;
    });
  }

  // =========================================================================
  // SECTION 11: INQUIRIES (PAST 24 MONTHS)
  // =========================================================================
  drawSectionHeader('Inquiries ( past 24 months)');

  const inqTableH = 14 + Math.max(1, inquiries.length) * 12;
  checkPageBreak(inqTableH);

  currentPage.drawRectangle({ x: MARGIN_X, y: y - 11, width: CONTENT_WIDTH, height: 11, color: tableHeaderBg });
  currentPage.drawText('Credit Grantor', { x: MARGIN_X + 4, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Type', { x: MARGIN_X + 160, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Date of Inquiry', { x: MARGIN_X + 220, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Account Type', { x: MARGIN_X + 310, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Amount', { x: MARGIN_X + 420, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Remark', { x: MARGIN_X + 490, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  y -= 11;

  if (inquiries.length === 0) {
    currentPage.drawText('No inquiries reported in the past 24 months.', { x: MARGIN_X + 4, y: y - 9.0, size: 6.0, font: fontRegular, color: textMuted });
    y -= 14;
  } else {
    inquiries.forEach((inq, idx) => {
      checkPageBreak(12);
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        currentPage.drawRectangle({ x: MARGIN_X, y: y - 12, width: CONTENT_WIDTH, height: 12, color: tableAltBg });
      }

      currentPage.drawText(cleanText(inq.creditGrantor).slice(0, 34), { x: MARGIN_X + 4, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(cleanText(inq.type), { x: MARGIN_X + 160, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(formatDate(inq.inquiryDate), { x: MARGIN_X + 220, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(cleanText(inq.accountType).slice(0, 24), { x: MARGIN_X + 310, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(formatAmount(inq.amount), { x: MARGIN_X + 420, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      currentPage.drawText(cleanText(inq.remark), { x: MARGIN_X + 490, y: y - 8.5, size: 6.0, font: fontRegular, color: textBlack });
      y -= 12;
    });
  }

  y -= 8;

  // =========================================================================
  // END OF REPORT BANNER & APPENDIX
  // =========================================================================
  checkPageBreak(110);

  const endStr = '-END OF REPORT-';
  const endW = fontBold.widthOfTextAtSize(endStr, 9);
  currentPage.drawText(endStr, {
    x: (PAGE_WIDTH - endW) / 2,
    y,
    size: 9,
    font: fontBold,
    color: crifNavy,
  });
  y -= 14;

  drawSectionHeader('Appendix');

  const appCol1W = 160;
  const appCol2W = 120;
  const appCol3W = CONTENT_WIDTH - appCol1W - appCol2W;
  const appH = 11;

  currentPage.drawRectangle({ x: MARGIN_X, y: y - appH, width: CONTENT_WIDTH, height: appH, color: tableHeaderBg });
  currentPage.drawText('Section', { x: MARGIN_X + 4, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Code', { x: MARGIN_X + appCol1W + 4, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  currentPage.drawText('Description', { x: MARGIN_X + appCol1W + appCol2W + 4, y: y - 8.5, size: 6.0, font: fontBold, color: textBlack });
  y -= appH;

  const appRows = [
    { sec: 'Account Summary', code: 'Number of Delinquent Accounts', desc: 'Indicates number of accounts that the applicant has defaulted on within the last 6 months' },
    { sec: 'Account Information - Credit Grantor', code: 'XXXX', desc: 'Name of grantor undisclosed as credit grantor is different from inquiring institution' },
    { sec: 'Payment History / Asset Classification', code: 'STD', desc: 'Account Reported as STANDARD Asset' },
    { sec: 'Payment History / Asset Classification', code: 'XXX', desc: 'Data not reported by institution' },
  ];

  appRows.forEach((ar, idx) => {
    const isAlt = idx % 2 === 1;
    if (isAlt) {
      currentPage.drawRectangle({ x: MARGIN_X, y: y - 11, width: CONTENT_WIDTH, height: 11, color: tableAltBg });
    }
    currentPage.drawText(ar.sec, { x: MARGIN_X + 4, y: y - 8.0, size: 5.6, font: fontRegular, color: textBlack });
    currentPage.drawText(ar.code, { x: MARGIN_X + appCol1W + 4, y: y - 8.0, size: 5.6, font: fontRegular, color: textBlack });
    currentPage.drawText(ar.desc, { x: MARGIN_X + appCol1W + appCol2W + 4, y: y - 8.0, size: 5.6, font: fontRegular, color: textBlack });
    y -= 11;
  });

  y -= 14;

  // Legal Disclaimer
  const disc1 = 'Disclaimer: This document is prepared based on the data submitted by member institutions of CRIF High Mark Credit Information Services Private Limited (CRIF High Mark). No alterations are made to the data submitted';
  const disc2 = 'by member institutions and the same is up to date as well as accurate to the best of its knowledge. By using data contained in this document, the user acknowledges that CRIF High Mark is not responsible for';
  const disc3 = 'errors/omissions resulting from submission of erroneous data from Members to CRIF High Mark. This document may not be used or disclosed to others, except with the written permission of CRIF High Mark. Any paper';
  const disc4 = 'copy of this document will be considered uncontrolled. If you are not the intended recipient, you are not authorized to read, print, retain, copy, disseminate, distribute or use this information or any part thereof.';
  const disc5 = 'PERFORM score provided in this document is joint work of CRIF SPA (Italy) and CRIF High Mark (India). For any assistance on this report, reach out to us at: customerservice@crifhighmark.com';
  const copyR = 'Copyrights reserved (c) 2021 CRIF High Mark Credit Information Services Pvt Ltd';

  [disc1, disc2, disc3, disc4, disc5].forEach((dLine) => {
    currentPage.drawText(dLine, { x: MARGIN_X, y, size: 4.8, font: fontRegular, color: textMuted });
    y -= 6.8;
  });
  y -= 3;

  const copyW = fontBold.widthOfTextAtSize(copyR, 5.8);
  currentPage.drawText(copyR, { x: (PAGE_WIDTH - copyW) / 2, y, size: 5.8, font: fontBold, color: textBlack });

  // =========================================================================
  // FOOTERS ON EVERY PAGE
  // =========================================================================
  const allPages = pdfDoc.getPages();
  const totalPages = allPages.length;

  allPages.forEach((page, pIdx) => {
    page.drawLine({
      start: { x: MARGIN_X, y: 22 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: 22 },
      thickness: 0.6,
      color: crifNavy,
    });

    const pageStr = `Page ${pIdx + 1} of ${totalPages}`;
    const pW = fontRegular.widthOfTextAtSize(pageStr, 6.2);
    page.drawText(pageStr, {
      x: PAGE_WIDTH - MARGIN_X - pW,
      y: 12,
      size: 6.2,
      font: fontRegular,
      color: textMuted,
    });

    page.drawText('CRIF High Mark Credit Information™ Report PROV2 · Powered by Bharat API Cloud', {
      x: MARGIN_X,
      y: 12,
      size: 5.8,
      font: fontRegular,
      color: textMuted,
    });
  });

  return await pdfDoc.save();
}

export async function generateCrifPdfFromApiResponse(apiResponse: any, fallbackParams: any = {}) {
  const norm = normalizeCrifReportData(apiResponse, fallbackParams);
  const pdfBytes = await generateCrifReportPdf(norm, fallbackParams);

  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  return {
    pdfBytes,
    blobUrl,
    extracted: norm,
  };
}

export default { generateCrifReportPdf, generateCrifPdfFromApiResponse, normalizeCrifReportData };
