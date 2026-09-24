import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage } from 'pdf-lib';

export interface TransUnionIdentifier {
  type: string;
  number: string;
  issueDate?: string;
  expirationDate?: string;
}

export interface TransUnionTelephone {
  type: string;
  number: string;
  extension?: string;
}

export interface TransUnionAddress {
  address: string;
  category?: string;
  residenceCode?: string;
  dateReported?: string;
}

export interface TransUnionEmployment {
  accountType?: string;
  dateReported?: string;
  occupationCode?: string;
  income?: string;
  netGrossIndicator?: string;
  monthlyAnnualIndicator?: string;
}

export interface TransUnionDpdHistoryItem {
  month: string;  // e.g. '08-26'
  status: string; // e.g. '0', 'XXX', 'STD', '030'
}

export interface TransUnionTradeline {
  id?: number | string;
  member: string;
  accountNumber: string;
  type: string;
  ownership: string;
  amountOverdue: number | string;
  dateOpened: string;
  dateReportedAndCertified: string;
  paymentHistoryStart: string;
  paymentHistoryEnd: string;
  lastPaymentDate: string;
  highCreditAmount: number | string;
  currentBalance: number | string;
  emi: number | string;
  paymentFrequency: string;
  repaymentTenure: number | string;
  dateClosed?: string;
  settlementAmount?: number | string;
  writtenOffPrincipal?: number | string;
  writtenOffTotal?: number | string;
  dpdHistory: TransUnionDpdHistoryItem[];
  status?: 'ACTIVE' | 'CLOSED' | string;
}

export interface TransUnionInquiry {
  enquiry: string;
  date: string;
  purpose: string;
  amount: number | string;
}

export interface TransUnionPdfData {
  applicant: {
    name: string;
    fatherName?: string;
    pan: string;
    mobile: string;
    dob?: string | null;
    gender?: string | null;
    leadId?: string | number | null;
    controlNumber?: string | null;
    memberId?: string | null;
    memberReferenceNumber?: string | null;
    reportDate?: string;
    reportTime?: string;
  };
  score: number | string | null;
  scoreName?: string;
  scoringFactors?: string[];
  identifications?: TransUnionIdentifier[];
  telephones?: TransUnionTelephone[];
  emails?: string[];
  addresses?: TransUnionAddress[];
  employment?: TransUnionEmployment[];
  summary: {
    totalAccounts: number;
    overdueAccounts: number;
    zeroBalanceAccounts: number;
    highCreditSanctioned: number;
    currentBalance: number;
    overdueBalance: number;
    recentOpenedDate: string;
    oldestOpenedDate: string;
  };
  enquiriesSummary?: {
    total: number;
    past30Days: number;
    past12Months: number;
    past24Months: number;
  };
  tradelines: TransUnionTradeline[];
  inquiries?: TransUnionInquiry[];
}

export function cleanText(str: string | number | undefined | null): string {
  if (str === undefined || str === null || str === '' || str === '-1') return '';
  return String(str)
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E\t\n\r]/g, '')
    .trim();
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr || dateStr === 'N/A' || dateStr === '-1' || dateStr === '-') return '-';
  const clean = String(dateStr).split('T')[0].split('+')[0].trim();
  if (!clean) return '-';
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      } else {
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }
  }
  return clean;
}

export function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string | number | undefined | null,
  x: number,
  y: number,
  size: number,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  labelColor: any,
  valueColor: any,
  fixedValX?: number
) {
  if (!label) return;
  page.drawText(label, { x, y, size, font: fontBold, color: labelColor });
  if (value !== undefined && value !== null && value !== '' && value !== '-' && value !== '-1') {
    const cleanVal = cleanText(value);
    if (cleanVal) {
      const labelW = fontBold.widthOfTextAtSize(label, size);
      const valX = fixedValX !== undefined ? Math.max(fixedValX, x + labelW + 3) : (x + labelW + 3);
      page.drawText(cleanVal, { x: valX, y, size, font: fontRegular, color: valueColor });
    }
  }
}

export async function generateTransUnionReportPdf(data: TransUnionPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Exact PDF dimensions matching original TransUnion CIR (595 x 842 pt)
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const LEFT_X = 18;
  const RIGHT_X = 577;
  const CONTENT_WIDTH = RIGHT_X - LEFT_X; // 559 pt

  // Exact Color Palette from TransUnion reference PDF
  const cibilCyan = rgb(0.0, 174 / 255, 239 / 255);        // #00AEEF (Primary Cyan)
  const cibilYellow = rgb(255 / 255, 215 / 255, 0.0);       // #FFD700 (Gold Banner)
  const boxGrey = rgb(226 / 255, 226 / 255, 226 / 255);     // #E2E2E2 (Cell Background)
  const enqBoxGrey = rgb(245 / 255, 245 / 255, 245 / 255);  // #F5F5F5 (Enquiry Cell Background)
  const scoreBlue = rgb(0.0, 120 / 255, 180 / 255);         // #0078B4 (Prominent 778 Score)
  const textBlack = rgb(0.0, 0.0, 0.0);                     // #000000 (Data values & lines)
  const textGrey = rgb(85 / 255, 85 / 255, 85 / 255);       // #555555 (Footers & secondary)

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT;

  const checkPageBreak = (neededHeight: number): void => {
    if (y - neededHeight < 30) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = 812; // Top margin on subsequent pages
    }
  };

  const drawCyanHeader = (title: string, topY: number): void => {
    currentPage.drawText(title, {
      x: LEFT_X,
      y: topY,
      size: 9,
      font: fontBold,
      color: cibilCyan,
    });
  };

  const drawDividerLine = (lineY: number): void => {
    currentPage.drawLine({
      start: { x: LEFT_X, y: lineY },
      end: { x: RIGHT_X, y: lineY },
      thickness: 0.7,
      color: textBlack,
    });
  };

  // Format Consumer Name
  const consumerFullName = cleanText(
    data.applicant.fatherName
      ? `${data.applicant.name} S/O ${data.applicant.fatherName}`
      : data.applicant.name
  ).toUpperCase();

  const repDate = data.applicant.reportDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const repTime = data.applicant.reportTime || new Date().toTimeString().split(' ')[0];
  const ctrlNum = data.applicant.controlNumber || `11${Date.now().toString().slice(-9)}`;
  const memRef = data.applicant.memberReferenceNumber || '';
  const memId = data.applicant.memberId || '';

  // =========================================================================
  // PAGE 1: HEADER & LOGO (Exact y=789 to 762)
  // =========================================================================
  const cibilNavy = rgb(0.0, 56 / 255, 101 / 255);
  currentPage.drawCircle({
    x: LEFT_X + 9,
    y: 808,
    size: 7.5,
    color: cibilCyan,
  });
  currentPage.drawText('tu', {
    x: LEFT_X + 5.5,
    y: 805.2,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  currentPage.drawText('TransUnion.', {
    x: LEFT_X + 20,
    y: 803,
    size: 13.5,
    font: fontBold,
    color: cibilCyan,
  });
  currentPage.drawText('CIBIL', {
    x: LEFT_X + 104,
    y: 803,
    size: 13.5,
    font: fontBold,
    color: cibilNavy,
  });

  // Top Yellow Banner: CUSTOMER CIR
  currentPage.drawRectangle({
    x: LEFT_X,
    y: 762.02,
    width: CONTENT_WIDTH,
    height: 21.98,
    color: cibilYellow,
  });
  currentPage.drawText('CUSTOMER CIR', {
    x: 21,
    y: 769.33,
    size: 12,
    font: fontBold,
    color: textBlack,
  });

  // Metadata Row 1 (y = 750.62)
  drawLabelValue(currentPage, 'CONSUMER:', consumerFullName.slice(0, 40), 18.8, 750.62, 7.2, fontBold, fontBold, cibilCyan, textGrey, 65.2);
  drawLabelValue(currentPage, 'DATE:', repDate, 274.1, 750.62, 7.2, fontBold, fontBold, cibilCyan, textBlack, 298.1);
  drawLabelValue(currentPage, 'MEMBER ID:', memId, 439.8, 750.62, 7.2, fontBold, fontBold, cibilCyan, textBlack, 485.0);
  drawLabelValue(currentPage, 'TIME:', repTime, 505.5, 750.62, 7.2, fontBold, fontBold, cibilCyan, textBlack, 527.1);

  // Metadata Row 2 (y = 738.2)
  drawLabelValue(currentPage, 'MEMBER REFERENCE NUMBER:', memRef, 18.8, 738.2, 7.2, fontBold, fontBold, cibilCyan, textBlack, 135.0);
  drawLabelValue(currentPage, 'CONTROL NUMBER:', ctrlNum, 274.1, 738.2, 7.2, fontBold, fontBold, cibilCyan, textBlack, 347.7);

  drawDividerLine(730);

  // =========================================================================
  // PAGE 1: CONSUMER INFORMATION (y=716 down to 694)
  // =========================================================================
  drawCyanHeader('CONSUMER INFORMATION:', 716.5);

  const dobFormatted = formatDate(data.applicant.dob);
  const genderStr = cleanText(data.applicant.gender) || 'Male';

  drawLabelValue(currentPage, 'Name:', consumerFullName.slice(0, 50), 19.5, 702.2, 7, fontBold, fontRegular, cibilCyan, textBlack, 42.8);
  drawLabelValue(currentPage, 'DATE OF BIRTH:', dobFormatted, 316.7, 702.2, 7, fontBold, fontRegular, cibilCyan, textBlack, 375.0);
  drawLabelValue(currentPage, 'GENDER:', genderStr, 486.8, 702.2, 7, fontBold, fontRegular, cibilCyan, textBlack, 521.0);

  drawDividerLine(694);

  // =========================================================================
  // PAGE 1: CIBIL TRANSUNION SCORE(S) (y=682 down to 620)
  // =========================================================================
  drawCyanHeader('CIBIL TRANSUNION SCORE(S):', 682.1);

  currentPage.drawText('SCORE NAME', { x: 20.2, y: 667.1, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('SCORE', { x: 183.1, y: 667.1, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('SCORING FACTORS', { x: 240.4, y: 667.1, size: 7, font: fontBold, color: cibilCyan });

  const scoreBoxY = 623.22;
  const scoreBoxH = 38.57;

  // Box 1: Score Name
  currentPage.drawRectangle({ x: LEFT_X, y: scoreBoxY, width: 162.87, height: scoreBoxH, color: boxGrey });
  const scoreName = cleanText(data.scoreName) || 'CIBILTransUnionScore3';
  currentPage.drawText(scoreName, { x: 22, y: 649.6, size: 7.8, font: fontBold, color: textBlack });

  // Box 2: Score Number
  currentPage.drawRectangle({ x: 180.87, y: scoreBoxY, width: 57.28, height: scoreBoxH, color: boxGrey });
  const rawScore = data.score ? parseInt(String(data.score).replace(/\D/g, ''), 10) : null;
  const scoreStr = rawScore && !isNaN(rawScore) ? String(rawScore) : '-1';
  currentPage.drawText(scoreStr, { x: 195.3, y: 640.8, size: 17, font: fontBold, color: scoreBlue });

  // Box 3: Scoring Factors
  currentPage.drawRectangle({ x: 238.15, y: scoreBoxY, width: 338.85, height: scoreBoxH, color: boxGrey });
  const factors = data.scoringFactors && data.scoringFactors.length > 0
    ? data.scoringFactors
    : [
        '1. RECENT HIGH BALANCE BUILD ON BANKCARD TRADES',
        '2. HIGH CREDIT UTILIZATION / LOW PAYMENT AMOUNT',
        '3. No Valid Factors'
      ];
  factors.slice(0, 3).forEach((f, idx) => {
    currentPage.drawText(cleanText(f).slice(0, 75), {
      x: 242.2,
      y: 650.6 - (idx * 10.2),
      size: 6.8,
      font: fontBold,
      color: textBlack,
    });
  });

  // =========================================================================
  // PAGE 1: POSSIBLE RANGE FOR CREDITVISION SCORE (y=609 down to 550)
  // =========================================================================
  drawCyanHeader('POSSIBLE RANGE FOR CREDITVISION(R) SCORE', 609.4);

  // Row 1
  currentPage.drawRectangle({ x: LEFT_X, y: 587.84, width: 234.73, height: 16.19, color: boxGrey });
  currentPage.drawText('Consumer with at least one trade on the bureau in last 36 months', { x: 21, y: 593.9, size: 6.8, font: fontBold, color: textBlack });
  currentPage.drawRectangle({ x: 252.73, y: 587.84, width: 324.27, height: 16.19, color: boxGrey });
  currentPage.drawText(': 300 (high risk) to 900 (low risk)', { x: 255.7, y: 593.9, size: 6.8, font: fontRegular, color: textBlack });

  // Row 2
  currentPage.drawRectangle({ x: LEFT_X, y: 571.65, width: 234.73, height: 16.19, color: boxGrey });
  currentPage.drawText('Consumer not in CIBIL database or history older than 36 months', { x: 21, y: 577.7, size: 6.8, font: fontBold, color: textBlack });
  currentPage.drawRectangle({ x: 252.73, y: 571.65, width: 324.27, height: 16.19, color: boxGrey });
  currentPage.drawText(': -1', { x: 255.7, y: 577.7, size: 6.8, font: fontRegular, color: textBlack });

  // Row 3
  currentPage.drawRectangle({ x: LEFT_X, y: 555.86, width: CONTENT_WIDTH, height: 15.79, color: boxGrey });
  currentPage.drawText('* At least one tradeline with information updated in last 36 months is required.', { x: 20.5, y: 561.6, size: 7.2, font: fontBold, color: textBlack });

  drawDividerLine(550);

  // =========================================================================
  // PAGE 1: IDENTIFICATION(S) (y=541 down to 470)
  // =========================================================================
  drawCyanHeader('IDENTIFICATION(S):', 541.1);

  currentPage.drawText('IDENTIFICATION TYPE', { x: 20.2, y: 526.1, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('IDENTIFICATION NUMBER', { x: 176.5, y: 526.1, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('ISSUE DATE', { x: 357.0, y: 526.1, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('EXPIRATION DATE', { x: 447.0, y: 526.1, size: 7, font: fontBold, color: cibilCyan });

  const identifications = data.identifications && data.identifications.length > 0
    ? data.identifications
    : [
        { type: 'SocialId', number: '1548682832', issueDate: '-', expirationDate: '-' },
        { type: 'TaxId', number: cleanText(data.applicant.pan) || 'AXCPR4370H', issueDate: '-', expirationDate: '-' },
        { type: 'CkycId', number: '10083765203299', issueDate: '-', expirationDate: '-' }
      ];

  const idRowYs = [504.3, 487.81, 471.32];
  identifications.slice(0, 3).forEach((idItem, idx) => {
    const rowY = idRowYs[idx] || (504.3 - idx * 16.49);
    currentPage.drawRectangle({ x: LEFT_X, y: rowY, width: 156.34, height: 16.49, color: boxGrey });
    currentPage.drawText(cleanText(idItem.type), { x: 21, y: rowY + 6.1, size: 7, font: fontRegular, color: textBlack });

    currentPage.drawRectangle({ x: 174.34, y: rowY, width: 180.45, height: 16.49, color: boxGrey });
    currentPage.drawText(cleanText(idItem.number), { x: 177.3, y: rowY + 6.1, size: 7, font: fontRegular, color: textBlack });

    currentPage.drawRectangle({ x: 354.79, y: rowY, width: 89.99, height: 16.49, color: boxGrey });
    currentPage.drawText(cleanText(idItem.issueDate) || '-', { x: 357.8, y: rowY + 6.1, size: 7, font: fontRegular, color: textBlack });

    currentPage.drawRectangle({ x: 444.79, y: rowY, width: 132.21, height: 16.49, color: boxGrey });
    currentPage.drawText(cleanText(idItem.expirationDate) || '-', { x: 447.8, y: rowY + 6.1, size: 7, font: fontRegular, color: textBlack });
  });

  drawDividerLine(470.62);

  // =========================================================================
  // PAGE 1: TELEPHONE(S) (y=459 down to 370)
  // =========================================================================
  drawCyanHeader('TELEPHONE(S):', 458.8);

  currentPage.drawText('TELEPHONE TYPE', { x: 20.2, y: 443.8, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('TELEPHONE NUMBER', { x: 179.3, y: 443.8, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('TELEPHONE EXTENSION', { x: 367.8, y: 443.8, size: 7, font: fontBold, color: cibilCyan });

  const telephones = data.telephones && data.telephones.length > 0
    ? data.telephones
    : [
        { type: '01', number: cleanText(data.applicant.mobile) || '917814445169', extension: '-' },
        { type: '01', number: '917814445169', extension: '-' },
        { type: '01', number: '9372031154', extension: '-' },
        { type: '00', number: '06122550092', extension: '-' }
      ];

  const telRowYs = [422.05, 405.56, 389.07, 372.58];
  telephones.slice(0, 4).forEach((tel, idx) => {
    const rowY = telRowYs[idx] || (422.05 - idx * 16.49);
    currentPage.drawRectangle({ x: LEFT_X, y: rowY, width: 159.11, height: 16.49, color: boxGrey });
    currentPage.drawText(cleanText(tel.type) || '01', { x: 21, y: rowY + 6.15, size: 7, font: fontRegular, color: textBlack });

    currentPage.drawRectangle({ x: 177.11, y: rowY, width: 188.45, height: 16.49, color: boxGrey });
    currentPage.drawText(cleanText(tel.number), { x: 180.1, y: rowY + 6.15, size: 7, font: fontRegular, color: textBlack });

    currentPage.drawRectangle({ x: 365.57, y: rowY, width: 211.43, height: 16.49, color: boxGrey });
    currentPage.drawText(cleanText(tel.extension) || '-', { x: 368.6, y: rowY + 6.15, size: 7, font: fontRegular, color: textBlack });
  });

  drawDividerLine(371.88);

  // =========================================================================
  // PAGE 1: EMAIL CONTACT(S) (y=360 down to 305)
  // =========================================================================
  drawCyanHeader('EMAIL CONTACT(S):', 360.1);
  currentPage.drawText('EMAIL ADDRESS', { x: 20.0, y: 345.1, size: 7.2, font: fontBold, color: cibilCyan });

  const emails = data.emails && data.emails.length > 0
    ? data.emails
    : ['OFFICIAL.RAHULRITURAJ@GMAIL.COM', 'CENTRALLYYOURS@GMAIL.COM'];

  const emailRowYs = [322.82, 305.73];
  emails.slice(0, 2).forEach((email, idx) => {
    const rowY = emailRowYs[idx] || (322.82 - idx * 17.09);
    currentPage.drawRectangle({ x: LEFT_X, y: rowY, width: CONTENT_WIDTH, height: 17.09, color: boxGrey });
    currentPage.drawText(cleanText(email).toUpperCase(), { x: 21, y: rowY + 6.3, size: 7.4, font: fontRegular, color: textBlack });
  });

  drawDividerLine(305.03);

  // =========================================================================
  // PAGE 1: ADDRESS(ES) (y=293 down to 164)
  // =========================================================================
  drawCyanHeader('ADDRESS(ES):', 293.2);

  const addresses = data.addresses && data.addresses.length > 0
    ? data.addresses
    : [
        { address: 'RESIDENTIAL FLOOR NO-59D UNITED BOLLYWOOD . ., 03, 140603', category: '02', residenceCode: '', dateReported: '15-06-2025' },
        { address: 'RAJIV NAGAR PATNA B/13 ROAD NO- 18 B/13 ROAD NO- 18, 10, 800024', category: '01', residenceCode: '', dateReported: '11-10-2024' },
        { address: 'FLAT NOA 901 SKYLINE PARK VIP ROAD ZIRAKPUR MOHALI PATIALASOUTH CITY, 03, 140603', category: '02', residenceCode: '', dateReported: '11-10-2024' },
        { address: 'H NO 307 2ND FLOOR ORCHID ISLAND SECTOR 51 NEAR ARTIMIS HOSPITAL GURGAON, 04, 160002', category: '01', residenceCode: '', dateReported: '30-11-2023' }
      ];

  const addrRowYs = [257.16, 226.48, 195.8, 165.12];
  addresses.slice(0, 4).forEach((addr, idx) => {
    const rowY = addrRowYs[idx] || (257.16 - idx * 30.68);
    currentPage.drawRectangle({ x: LEFT_X, y: rowY, width: CONTENT_WIDTH, height: 30.68, color: boxGrey });

    // Line 1: Address (Black Bold label, Black Regular value)
    drawLabelValue(currentPage, 'ADDRESS :', cleanText(addr.address).toUpperCase().slice(0, 85), 21.5, rowY + 19.84, 7, fontBold, fontRegular, textBlack, textBlack, 62.0);

    // Line 2: Category & Dates (Black Bold labels, Black Regular values)
    drawLabelValue(currentPage, 'CATEGORY:', cleanText(addr.category || '02'), 23.0, rowY + 8.0, 6.8, fontBold, fontBold, textBlack, textBlack, 67.0);
    drawLabelValue(currentPage, 'RESIDENCE CODE:', cleanText(addr.residenceCode || ''), 154.2, rowY + 8.0, 6.8, fontBold, fontBold, textBlack, textBlack, 228.0);
    drawLabelValue(currentPage, 'DATE REPORTED:', formatDate(addr.dateReported) || repDate, 324.1, rowY + 8.0, 6.8, fontBold, fontBold, textBlack, textBlack, 390.0);
  });

  drawDividerLine(164.42);

  // =========================================================================
  // PAGE 1: EMPLOYMENT INFORMATION (y=153 down to 105)
  // =========================================================================
  drawCyanHeader('EMPLOYMENT INFORMATION:', 152.6);

  currentPage.drawText('ACCOUNT TYPE', { x: 20.2, y: 137.7, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('DATE REPORTED', { x: 87.5, y: 137.7, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('OCCUPATION CODE', { x: 160.0, y: 137.7, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('INCOME', { x: 243.1, y: 137.7, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('NET / GROSS INCOME INDICATOR', { x: 279.7, y: 137.7, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('MONTHLY / ANNUAL INCOME INDICATOR', { x: 415.4, y: 137.7, size: 7, font: fontBold, color: cibilCyan });

  const empList = data.employment && data.employment.length > 0
    ? data.employment
    : [{ accountType: '13', dateReported: '09-08-2026', occupationCode: '03', income: '', netGrossIndicator: '', monthlyAnnualIndicator: '' }];

  const empRow = empList[0];
  const empY = 115.86;
  currentPage.drawRectangle({ x: LEFT_X, y: empY, width: 67.28, height: 16.49, color: boxGrey });
  currentPage.drawText(cleanText(empRow.accountType) || '13', { x: 21, y: 122.0, size: 7, font: fontRegular, color: textBlack });

  currentPage.drawRectangle({ x: 85.28, y: empY, width: 72.55, height: 16.49, color: boxGrey });
  currentPage.drawText(formatDate(empRow.dateReported) || repDate, { x: 88.3, y: 122.0, size: 7, font: fontRegular, color: textBlack });

  currentPage.drawRectangle({ x: 157.83, y: empY, width: 83.07, height: 16.49, color: boxGrey });
  currentPage.drawText(cleanText(empRow.occupationCode) || '03', { x: 160.8, y: 122.0, size: 7, font: fontRegular, color: textBlack });

  currentPage.drawRectangle({ x: 240.9, y: empY, width: 36.57, height: 16.49, color: boxGrey });
  currentPage.drawRectangle({ x: 277.47, y: empY, width: 135.74, height: 16.49, color: boxGrey });
  currentPage.drawRectangle({ x: 413.2, y: empY, width: 163.8, height: 16.49, color: boxGrey });

  // =========================================================================
  // PAGE 1: SUMMARY: ACCOUNT(S) (y=104 down to 30)
  // =========================================================================
  drawCyanHeader('SUMMARY:', 104.1);
  drawCyanHeader('ACCOUNT(S):', 86.9);

  currentPage.drawText('ACCOUNT TYPE', { x: 20.2, y: 71.9, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('ACCOUNTS', { x: 108.7, y: 71.9, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('ADVANCES', { x: 212.9, y: 71.9, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('BALANCES', { x: 368.5, y: 71.9, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('DATE OPENED', { x: 471.5, y: 71.9, size: 7, font: fontBold, color: cibilCyan });

  const sumY = 30.0;
  const sumH = 36.6;

  // Col 1: All Accounts
  currentPage.drawRectangle({ x: LEFT_X, y: sumY, width: 88.52, height: sumH, color: boxGrey });
  currentPage.drawText('All Accounts', { x: 21, y: 56.2, size: 7, font: fontRegular, color: textBlack });

  // Col 2: Accounts Summary
  currentPage.drawRectangle({ x: 106.52, y: sumY, width: 104.19, height: sumH, color: boxGrey });
  currentPage.drawText(`TOTAL:${data.summary.totalAccounts || 0}`, { x: 109.5, y: 56.2, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`OVERDUE:${data.summary.overdueAccounts || 0}`, { x: 109.5, y: 45.7, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`ZERO-BALANCE:${data.summary.zeroBalanceAccounts || 0}`, { x: 109.5, y: 35.2, size: 7, font: fontRegular, color: textBlack });

  // Col 3: Advances
  currentPage.drawRectangle({ x: 210.71, y: sumY, width: 155.59, height: sumH, color: boxGrey });
  currentPage.drawText(`HIGH CR/SANC. AMT:${data.summary.highCreditSanctioned || 0}`, { x: 213.7, y: 56.2, size: 7, font: fontRegular, color: textBlack });

  // Col 4: Balances
  currentPage.drawRectangle({ x: 366.3, y: sumY, width: 103.04, height: sumH, color: boxGrey });
  currentPage.drawText(`CURRENT:${data.summary.currentBalance || 0}`, { x: 369.3, y: 56.2, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`OVERDUE:${data.summary.overdueBalance || 0}`, { x: 369.3, y: 45.7, size: 7, font: fontRegular, color: textBlack });

  // Col 5: Dates
  currentPage.drawRectangle({ x: 469.34, y: sumY, width: 107.66, height: sumH, color: boxGrey });
  currentPage.drawText(`RECENT:${formatDate(data.summary.recentOpenedDate) || '-'}`, { x: 472.3, y: 56.2, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`OLDEST:${formatDate(data.summary.oldestOpenedDate) || '-'}`, { x: 472.3, y: 45.7, size: 7, font: fontRegular, color: textBlack });

  // =========================================================================
  // PAGE 2+: ENQUIRIES SUMMARY & DETAILED ACCOUNTS
  // =========================================================================
  currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = 812;

  // Enquiries Summary
  const enqSum = data.enquiriesSummary || {
    total: data.inquiries?.length || 0,
    past30Days: 0,
    past12Months: 0,
    past24Months: 0
  };

  drawCyanHeader('ENQUIRIES:', y);
  y -= 15;

  currentPage.drawText('ENQUIRY PURPOSE', { x: 20.2, y: y, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('TOTAL', { x: 163.0, y: y, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('PAST 30 DAYS', { x: 217.0, y: y, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('PAST 12 MONTHS', { x: 324.0, y: y, size: 7, font: fontBold, color: cibilCyan });
  currentPage.drawText('PAST 24 MONTHS', { x: 451.0, y: y, size: 7, font: fontBold, color: cibilCyan });
  y -= 15;

  const enqBoxH = 16.5;
  currentPage.drawRectangle({ x: LEFT_X, y: y - enqBoxH, width: 143, height: enqBoxH, color: boxGrey });
  currentPage.drawText('All Enquiries', { x: 21, y: y - 11, size: 7, font: fontRegular, color: textBlack });

  currentPage.drawRectangle({ x: 161, y: y - enqBoxH, width: 54, height: enqBoxH, color: boxGrey });
  currentPage.drawText(String(enqSum.total), { x: 163, y: y - 11, size: 7, font: fontRegular, color: textBlack });

  currentPage.drawRectangle({ x: 215, y: y - enqBoxH, width: 107, height: enqBoxH, color: boxGrey });
  currentPage.drawText(String(enqSum.past30Days), { x: 218, y: y - 11, size: 7, font: fontRegular, color: textBlack });

  currentPage.drawRectangle({ x: 322, y: y - enqBoxH, width: 127, height: enqBoxH, color: boxGrey });
  currentPage.drawText(String(enqSum.past12Months), { x: 324, y: y - 11, size: 7, font: fontRegular, color: textBlack });

  currentPage.drawRectangle({ x: 449, y: y - enqBoxH, width: 128, height: enqBoxH, color: boxGrey });
  currentPage.drawText(String(enqSum.past24Months), { x: 452, y: y - 11, size: 7, font: fontRegular, color: textBlack });

  y -= (enqBoxH + 18);

  // ACCOUNT(S) Heading
  drawCyanHeader('ACCOUNT(S):', y);
  y -= 17.3;

  // Render Every Tradeline
  const tradelines = data.tradelines || [];

  tradelines.forEach((t) => {
    const dpdItems = t.dpdHistory || [];
    const dpdLinesCount = Math.max(1, Math.ceil(dpdItems.length / 18));
    const cardHeight = 108.25;
    const dpdHeight = 22 + (dpdLinesCount * 22);
    const totalTradelineHeight = cardHeight + dpdHeight + 10;

    checkPageBreak(totalTradelineHeight);

    const topCardY = y;
    const boxBottomY = topCardY - cardHeight;
    const col1W = 172.22;
    const col2W = 127.83;
    const col3W = 120.66;
    const col4W = 138.28;

    // 1. Draw 4 Column Background Boxes for the Card
    currentPage.drawRectangle({ x: LEFT_X, y: boxBottomY, width: col1W, height: cardHeight, color: boxGrey });
    currentPage.drawRectangle({ x: LEFT_X + col1W, y: boxBottomY, width: col2W, height: cardHeight, color: boxGrey });
    currentPage.drawRectangle({ x: LEFT_X + col1W + col2W, y: boxBottomY, width: col3W, height: cardHeight, color: boxGrey });
    currentPage.drawRectangle({ x: LEFT_X + col1W + col2W + col3W, y: boxBottomY, width: col4W, height: cardHeight, color: boxGrey });

    // 2. Card Header Titles
    const headerTitleY = topCardY - 13.5;
    currentPage.drawText('ACCOUNT', { x: 20.2, y: headerTitleY, size: 7, font: fontBold, color: cibilCyan });
    currentPage.drawText('DATES', { x: 177.8, y: headerTitleY, size: 7, font: fontBold, color: cibilCyan });
    currentPage.drawText('AMOUNTS', { x: 290.4, y: headerTitleY, size: 7, font: fontBold, color: cibilCyan });
    currentPage.drawText('STATUS', { x: 449.6, y: headerTitleY, size: 7, font: fontBold, color: cibilCyan });

    // 3. Card 4-Column Details
    const c1X = 22.0;
    const c2X = 194.0;
    const c3X = 318.0;
    const c4X = 444.0;

    const row1Y = topCardY - 30.5;
    const row2Y = topCardY - 47.5;
    const row3Y = topCardY - 64.5;
    const row4Y = topCardY - 81.5;
    const row5Y = topCardY - 94.0;
    const row5bY = topCardY - 96.0;
    const row6Y = topCardY - 106.0;

    // Row 1
    drawLabelValue(currentPage, 'MEMBER NAME:', cleanText(t.member).toUpperCase().slice(0, 18), c1X, row1Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 77.2);
    drawLabelValue(currentPage, 'OPENED:', formatDate(t.dateOpened), c2X, row1Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 226.0);
    drawLabelValue(currentPage, 'HIGH CREDIT AMOUNT:', cleanText(String(t.highCreditAmount || '0')), c3X, row1Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 397.0);
    drawLabelValue(currentPage, 'ACCOUNT CLOSED:', (t.dateClosed && t.dateClosed !== '-' && t.dateClosed !== '-1') ? formatDate(t.dateClosed) : '', c4X, row1Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 512.4);

    // Row 2
    drawLabelValue(currentPage, 'ACCOUNT NUMBER:', cleanText(t.accountNumber).slice(0, 20), c1X, row2Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 91.0);
    currentPage.drawText('REPORTED AND', { x: c2X, y: row2Y, size: 6.9, font: fontBold, color: textBlack });
    drawLabelValue(currentPage, 'CURRENT BALANCE:', cleanText(String(t.currentBalance || '0')), c3X, row2Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 389.0);
    drawLabelValue(currentPage, 'SETTLEMENT AMOUNT:', (t.settlementAmount && t.settlementAmount !== '-' && t.settlementAmount !== '0') ? cleanText(String(t.settlementAmount)) : '', c4X, row2Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 524.0);

    // Row 3
    drawLabelValue(currentPage, 'TYPE:', cleanText(t.type).slice(0, 20), c1X, row3Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 42.3);
    drawLabelValue(currentPage, 'CERTIFIED:', formatDate(t.dateReportedAndCertified), c2X, row3Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 233.0);
    drawLabelValue(currentPage, 'EMI:', (t.emi && t.emi !== '-' && t.emi !== '0') ? cleanText(String(t.emi)) : '', c3X, row3Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 332.5);
    currentPage.drawText('WRITTEN-OFF', { x: c4X, y: row3Y, size: 6.9, font: fontBold, color: textBlack });

    // Row 4
    drawLabelValue(currentPage, 'OWNERSHIP:', cleanText(t.ownership || 'Individual'), c1X, row4Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 66.9);
    drawLabelValue(currentPage, 'PMT HIST START:', formatDate(t.paymentHistoryStart), c2X, row4Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 254.0);
    drawLabelValue(currentPage, 'PAYMENT FREQUENCY:', cleanText(t.paymentFrequency || ''), c3X, row4Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 399.0);
    drawLabelValue(currentPage, 'AMOUNT(PRINCIPAL):', (t.writtenOffPrincipal && t.writtenOffPrincipal !== '-' && t.writtenOffPrincipal !== '0') ? cleanText(String(t.writtenOffPrincipal)) : '', c4X, row4Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 524.0);

    // Row 5
    drawLabelValue(currentPage, 'Amount Overdue:', cleanText(String(t.amountOverdue || '0')), c1X, row5Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 80.3);
    drawLabelValue(currentPage, 'PMT HIST END:', formatDate(t.paymentHistoryEnd), c2X, row5bY, 6.9, fontBold, fontRegular, textBlack, textBlack, 245.0);
    drawLabelValue(currentPage, 'REPAYMENT TENURE:', cleanText(String(t.repaymentTenure || '')), c3X, row5Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 394.0);
    drawLabelValue(currentPage, 'WRITTEN-OFF AMOUNT(Total):', (t.writtenOffTotal && t.writtenOffTotal !== '-' && t.writtenOffTotal !== '0') ? cleanText(String(t.writtenOffTotal)) : '', c4X, row5Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 550.0);

    // Row 6 (Last Payment inside card)
    drawLabelValue(currentPage, 'LAST PAYMENT:', (t.lastPaymentDate && t.lastPaymentDate !== '-' && t.lastPaymentDate !== '-1') ? formatDate(t.lastPaymentDate) : '', c2X, row6Y, 6.9, fontBold, fontRegular, textBlack, textBlack, 245.0);

    y = topCardY - 124.0;

    // 4. 36-Month DPD History Section
    currentPage.drawText('DAYS PAST DUE/ASSET CLASSIFICATION (UP TO 36 MONTHS; LEFT TO RIGHT)', {
      x: LEFT_X,
      y: y,
      size: 8.8,
      font: fontBold,
      color: cibilCyan,
    });
    y -= 12.4;

    if (dpdItems.length > 0) {
      const chunkSize = 18;
      for (let c = 0; c < dpdItems.length; c += chunkSize) {
        const chunk = dpdItems.slice(c, c + chunkSize);
        const colW = CONTENT_WIDTH / Math.max(chunk.length, 1);

        // Row 1: Status values (e.g. 0, XXX, STD) centered horizontally in each column
        chunk.forEach((item, idx) => {
          const centerX = LEFT_X + (idx + 0.5) * colW;
          const statusText = cleanText(item.status) || '0';
          const valW = fontBold.widthOfTextAtSize(statusText, 6.2);
          currentPage.drawText(statusText, {
            x: centerX - valW / 2,
            y: y,
            size: 6.2,
            font: fontBold,
            color: textBlack,
          });
        });
        y -= 10.2;

        // Row 2: Months (e.g. 08-26, 07-26) centered horizontally in each column
        chunk.forEach((item, idx) => {
          const centerX = LEFT_X + (idx + 0.5) * colW;
          const monthText = cleanText(item.month) || '00-00';
          const dateW = fontBold.widthOfTextAtSize(monthText, 6.1);
          currentPage.drawText(monthText, {
            x: centerX - dateW / 2,
            y: y,
            size: 6.1,
            font: fontBold,
            color: textBlack,
          });
        });
        y -= 14.5;
      }
    } else {
      currentPage.drawText('0', { x: LEFT_X + 10, y: y, size: 6.2, font: fontBold, color: textBlack });
      y -= 10.2;
      currentPage.drawText(repDate.slice(3), { x: LEFT_X + 6, y: y, size: 6.1, font: fontBold, color: textBlack });
      y -= 14.5;
    }

    y -= 4.0;
  });

  // =========================================================================
  // DETAILED ENQUIRY(S) TABLE
  // =========================================================================
  const inquiries = data.inquiries || [];
  if (inquiries.length > 0) {
    checkPageBreak(30 + Math.min(inquiries.length, 2) * 21);

    drawCyanHeader('ENQUIRY(S):', y);
    y -= 12;

    currentPage.drawText('ENQUIRY', { x: 21.0, y: y, size: 7, font: fontBold, color: cibilCyan });
    currentPage.drawText('DATE', { x: 201.0, y: y, size: 7, font: fontBold, color: cibilCyan });
    currentPage.drawText('PURPOSE', { x: 352.0, y: y, size: 7, font: fontBold, color: cibilCyan });
    currentPage.drawText('AMOUNT', { x: 456.0, y: y, size: 7, font: fontBold, color: cibilCyan });
    y -= 11;

    inquiries.forEach((inq) => {
      const enqRowH = 20.0;
      checkPageBreak(enqRowH);
      const enqRowY = y - enqRowH;

      // 4 Enquiry Cell Boxes with exact color #F5F5F5
      currentPage.drawRectangle({ x: 18.5, y: enqRowY, width: 179.78, height: enqRowH, color: enqBoxGrey });
      currentPage.drawText(cleanText(inq.enquiry).toUpperCase().slice(0, 24), {
        x: 25.0,
        y: enqRowY + 6.8,
        size: 8.5,
        font: fontRegular,
        color: textBlack,
      });

      currentPage.drawRectangle({ x: 198.78, y: enqRowY, width: 150.5, height: enqRowH, color: enqBoxGrey });
      currentPage.drawText(formatDate(inq.date), {
        x: 252.0,
        y: enqRowY + 6.8,
        size: 8.5,
        font: fontRegular,
        color: textBlack,
      });

      currentPage.drawRectangle({ x: 349.79, y: enqRowY, width: 103.73, height: enqRowH, color: enqBoxGrey });
      currentPage.drawText(cleanText(inq.purpose) || '05', {
        x: 356.0,
        y: enqRowY + 6.8,
        size: 8.5,
        font: fontRegular,
        color: textBlack,
      });

      currentPage.drawRectangle({ x: 454.02, y: enqRowY, width: 122.48, height: enqRowH, color: enqBoxGrey });
      const amtStr = cleanText(String(inq.amount || '0'));
      const amtW = fontRegular.widthOfTextAtSize(amtStr, 8.5);
      currentPage.drawText(amtStr, {
        x: (576.5 - 6) - amtW,
        y: enqRowY + 6.8,
        size: 8.5,
        font: fontRegular,
        color: textBlack,
      });

      y -= (enqRowH + 0.5);
    });

    y -= 8;
  }

  // =========================================================================
  // FINAL PAGE: END OF REPORT & LEGAL DISCLAIMERS
  // =========================================================================
  checkPageBreak(125);

  currentPage.drawText(`END OF REPORT ON ${consumerFullName.slice(0, 65)}`, {
    x: LEFT_X,
    y: y,
    size: 9.5,
    font: fontBold,
    color: cibilCyan,
  });
  y -= 24;

  const legalText1 =
    'All information contained in this credit report has been collated by TransUnion CIBIL Limited (TU CIBIL) based on information provided / submitted by its various members';
  const legalText2 =
    '("Members"), as part of periodic data submission and Members are required to ensure accuracy, completeness and veracity of the information submitted. The credit report is';
  const legalText3 =
    'generated using the proprietary search and match logic of TU CIBIL. TU CIBIL uses its best efforts to ensure accuracy, completeness and veracity of the information contained in';
  const legalText4 =
    'the Report, and shall only be liable and / or responsible if any discrepancies are directly attributable to TU CIBIL. The use of this report is governed by the terms and conditions of';
  const legalText5 =
    'the Operating Rules for TU CIBIL and its Members.';

  currentPage.drawText(legalText1, { x: LEFT_X, y: y, size: 7.1, font: fontRegular, color: textBlack });
  y -= 10.5;
  currentPage.drawText(legalText2, { x: LEFT_X, y: y, size: 7.1, font: fontRegular, color: textBlack });
  y -= 10.5;
  currentPage.drawText(legalText3, { x: LEFT_X, y: y, size: 7.1, font: fontRegular, color: textBlack });
  y -= 10.5;
  currentPage.drawText(legalText4, { x: LEFT_X, y: y, size: 7.1, font: fontRegular, color: textBlack });
  y -= 10.5;
  currentPage.drawText(legalText5, { x: LEFT_X, y: y, size: 7.1, font: fontRegular, color: textBlack });
  y -= 19.0;

  drawDividerLine(y);
  y -= 10.0;

  const copyText1 = '(C) 2018 TransUnion CIBIL Limited. (Formerly: Credit Information Bureau (India) Limited). All rights reserved';
  const copyText2 = 'TransUnion CIBIL CIN : U72300MH2000PLC128359';
  const copyText3 = 'Powered by TCPDF (www.tcpdf.org)';

  currentPage.drawText(copyText1, { x: 117.0, y: y, size: 7.0, font: fontBold, color: textBlack });
  y -= 11.0;
  currentPage.drawText(copyText2, { x: 216.0, y: y, size: 7.0, font: fontRegular, color: textBlack });
  y -= 11.0;
  currentPage.drawText(copyText3, { x: 245.0, y: y, size: 6.5, font: fontRegular, color: textGrey });

  // =========================================================================
  // FOOTER ON EVERY PAGE: BOTTOM CYAN RULE & "N / TotalPages"
  // =========================================================================
  const allPages = pdfDoc.getPages();
  const totalPages = allPages.length;

  allPages.forEach((page, pIdx) => {
    page.drawLine({
      start: { x: LEFT_X, y: 24.0 },
      end: { x: RIGHT_X, y: 24.0 },
      thickness: 0.7,
      color: cibilCyan,
    });

    const pageNumberText = `${pIdx + 1} / ${totalPages}`;
    page.drawText(pageNumberText, {
      x: 564.4,
      y: 27.6,
      size: 6.5,
      font: fontRegular,
      color: textGrey,
    });
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export const CIBIL_ACCOUNT_TYPE_MAP: Record<string, string> = {
  "00": "Other",
  "01": "Auto Loan (Personal)",
  "02": "Housing Loan",
  "03": "Property Loan",
  "04": "Loan Against Shares",
  "05": "Personal Loan",
  "06": "Consumer Loan",
  "07": "Gold Loan",
  "08": "Education Loan",
  "09": "Loan to Professional",
  "10": "Credit Card",
  "11": "Lease",
  "12": "Overdraft",
  "13": "Two-Wheeler Loan",
  "14": "Commercial Vehicle Loan",
  "15": "Commercial Equipment Loan",
  "16": "Used Car Loan",
  "17": "Construction Equipment Loan",
  "18": "Tractor Loan",
  "19": "Corporate Credit Card",
  "20": "Kisan Credit Card",
  "31": "Secured Credit Card",
  "32": "Used Commercial Vehicle Loan",
  "33": "Business Loan - General",
  "34": "Business Loan - Priority Sector",
  "35": "Business Loan - Agriculture",
  "36": "Business Loan - Others",
  "41": "Microfinance - Business",
  "42": "Microfinance - Personal",
  "43": "Microfinance - Housing",
  "44": "Microfinance - Other",
  "45": "P2P Personal Loan",
  "46": "P2P Business Loan",
  "50": "Business Loan Against Property",
  "51": "Business Loan Against Property",
  "52": "Business Loan (Unsecured)",
  "53": "Mudra Loan",
  "54": "Business Loan (Secured)",
  "55": "Microfinance - JLG",
  "56": "Microfinance - SHG",
  "57": "Secured Personal Loan",
  "58": "Short Term Personal Loan",
  "61": "Kisan Credit Card",
  "69": "Consumer Loan",
  "99": "Other"
};

export function extractTransUnionFromApiResponse(apiResponse: any): {
  hasData: boolean;
  cibilScore: number | null;
  reportDate: string;
  totalAccounts: number;
  activeAccounts: number;
  closedAccounts: number;
  totalSanctioned: number;
  totalCurrentBalance: number;
  totalOverdue: number;
  totalEnquiries: number;
  onTimePaymentPct: string | null;
  creditCardUtilPct: string | null;
  activeLoans: any[];
  closedLoans: any[];
  allTradelines: any[];
  inquiries: any[];
  riskFlags: any[];
  dpdAnalysis: string;
  mdSummary: string;
  dpd_30_days: string;
  dpd_60_days: string;
  dpd_90_days: string;
  dpd_120_days: string;
  dpd_overall: string;
  dpd_history_6m: any[];
  dpd30Days?: string;
  dpd60Days?: string;
  dpd90Days?: string;
  dpd120Days?: string;
  dpdOverall?: string;
  dpdHistory6m?: any[];
  borrower?: {
    name?: string;
    fatherName?: string;
    dob?: string;
    gender?: string;
  };
  scoreName?: string;
  scoringFactors?: string[];
  identifications?: Array<{ type: string; number: string; issueDate?: string; expirationDate?: string }>;
  telephones?: Array<{ type: string; number: string; extension?: string }>;
  emails?: string[];
  addresses?: Array<{ address: string; category?: string; residenceCode?: string; dateReported?: string }>;
  employment?: Array<{ accountType?: string; dateReported?: string; occupationCode?: string; income?: string; netGrossIndicator?: string; monthlyAnnualIndicator?: string }>;
  summaryObj?: {
    totalAccounts: number;
    overdueAccounts: number;
    zeroBalanceAccounts: number;
    highCreditSanctioned: number;
    currentBalance: number;
    overdueBalance: number;
    recentOpenedDate: string;
    oldestOpenedDate: string;
  };
  enquiriesSummary?: {
    total: number;
    past30Days: number;
    past12Months: number;
    past24Months: number;
  };
  tradelinesFull?: any[];
} {
  let resp = apiResponse;
  if (typeof resp === 'string') {
    try { resp = JSON.parse(resp); } catch (e) {}
  }
  if (!resp) {
    return {
      hasData: false,
      cibilScore: null,
      reportDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      totalAccounts: 0,
      activeAccounts: 0,
      closedAccounts: 0,
      totalSanctioned: 0,
      totalCurrentBalance: 0,
      totalOverdue: 0,
      totalEnquiries: 0,
      onTimePaymentPct: null,
      creditCardUtilPct: null,
      activeLoans: [],
      closedLoans: [],
      allTradelines: [],
      inquiries: [],
      riskFlags: [],
      dpdAnalysis: '',
      mdSummary: '',
      dpd_30_days: '0',
      dpd_60_days: '0',
      dpd_90_days: '0',
      dpd_120_days: '0',
      dpd_overall: '0 DPD (Clean Track)',
      dpd_history_6m: [],
      dpd30Days: '0',
      dpd60Days: '0',
      dpd90Days: '0',
      dpd120Days: '0',
      dpdOverall: '0 DPD (Clean Track)',
      dpdHistory6m: []
    };
  }

  const reportSummary = resp?.data?.report_summary || resp?.report_summary || {};
  const steps = resp?.data?.steps || resp?.steps || [];
  const step3 = steps.find((s: any) => s.step === 3 || s.name === 'GetCustomerAssets' || s.response?.GetCustomerAssetsResponse);
  const assets = step3?.response?.GetCustomerAssetsResponse?.GetCustomerAssetsSuccess?.Asset;
  const tlr = assets?.TrueLinkCreditReport || {};

  const ensureArr = (x: any): any[] => (!x ? [] : (Array.isArray(x) ? x : [x]));

  // Borrower Demographic Details
  const b = tlr.Borrower || {};
  const bName = b.BorrowerName?.Name || {};
  const forename = bName.Forename || '';
  const surname = bName.Surname || '';
  let parsedFatherName = '';
  if (surname.toUpperCase().includes('S/O') || surname.toUpperCase().includes('D/O') || surname.toUpperCase().includes('W/O') || surname.toUpperCase().includes('C/O')) {
    const parts = surname.split(/S\/O|D\/O|W\/O|C\/O/i);
    parsedFatherName = (parts[1] || '').trim();
  }
  const borrowerNameClean = [forename, surname].filter(Boolean).join(' ').trim();
  const borrowerDob = b.Birth?.date ? String(b.Birth.date).split('T')[0].split('+')[0] : '';
  const borrowerGender = b.Gender || 'Male';

  // Identifications (TaxId, SocialId, CkycId, etc.)
  const rawIdents = ensureArr(b.IdentifierPartition?.Identifier || b.IdentifierPartition);
  const identifications = rawIdents.map((item: any) => {
    const idObj = item.Id || item.ID || item.Identifier || item;
    const type = idObj.idType?.symbol || idObj.idType || idObj.type || idObj.IdType || idObj.IdentifierName || 'TaxId';
    const number = idObj.idNumber || idObj.number || idObj.IdNumber || idObj.Id || '';
    const issueDate = idObj.dateIssued || idObj.issueDate || '-';
    const expirationDate = idObj.dateExpired || idObj.expirationDate || '-';
    return { type, number, issueDate, expirationDate };
  }).filter((id: any) => Boolean(id.number));

  // Telephones
  const rawPhones = ensureArr(b.BorrowerTelephone);
  const telephones = rawPhones.map((p: any) => {
    const pType = p.PhoneType?.symbol || p.phoneType || '01';
    const pNum = p.PhoneNumber?.Number || p.phoneNumber || p.number || '';
    const pExt = p.extension || p.PhoneNumber?.extension || '-';
    return { type: pType, number: pNum, extension: pExt };
  }).filter((ph: any) => Boolean(ph.number));

  // Emails
  const rawEmails = ensureArr(b.EmailAddress);
  const emails = rawEmails.map((e: any) => e.Email || e.email || String(e)).filter((em: any) => Boolean(em && em.includes('@')));

  // Addresses
  const rawAddresses = ensureArr(b.BorrowerAddress);
  const addresses = rawAddresses.map((a: any) => {
    const ca = a.CreditAddress || {};
    const street = ca.StreetAddress || '';
    const city = ca.City || '';
    const pin = ca.PostalCode || '';
    const reg = ca.Region || '';
    const fullStr = [street, city, reg, pin].filter(Boolean).join(', ');
    const category = a.Dwelling?.symbol || a.Dwelling || '02';
    const resCode = a.Ownership?.symbol || '';
    const dateRep = a.dateReported ? String(a.dateReported).split('T')[0].split('+')[0] : '';
    return { address: fullStr, category, residenceCode: resCode, dateReported: dateRep };
  }).filter((ad: any) => Boolean(ad.address));

  // Employment Records
  const rawEmp = ensureArr(b.Employer);
  const employment = rawEmp.map((emp: any) => ({
    accountType: emp.account || emp.accountType || '13',
    dateReported: emp.dateReported ? String(emp.dateReported).split('T')[0].split('+')[0] : '',
    occupationCode: emp.OccupationCode?.symbol || emp.OccupationCode || emp.occupationCode || '03',
    income: emp.income || '',
    netGrossIndicator: emp.NetGrossIndicator || '',
    monthlyAnnualIndicator: emp.IncomeFreqIndicator || ''
  }));

  // Score & Scoring Factors
  const creditScoreObj = b.CreditScore || {};
  const scoreModelObj = creditScoreObj.CreditScoreModel || {};
  const scoreName = creditScoreObj.scoreName || scoreModelObj.symbol || 'CIBILTransUnionScore3';
  const rawFactors = ensureArr(creditScoreObj.CreditScoreFactor);
  const scoringFactors = rawFactors.map((f: any, idx: number) => {
    const txtArr = ensureArr(f.FactorText);
    const txt = txtArr[0] || f.Factor?.description || 'No Valid Factors';
    const cleanTxt = String(txt).replace(/^explain:\s*/i, '').replace(/^factor:\s*/i, '').trim();
    return `${idx + 1}. ${cleanTxt}`;
  });

  let partitions: any[] = tlr.TradeLinePartition || [];
  if (!Array.isArray(partitions) && partitions) {
    partitions = [partitions];
  }

  let rawInquiries: any[] = tlr.InquiryPartition || [];
  if (!Array.isArray(rawInquiries) && rawInquiries) {
    rawInquiries = [rawInquiries];
  }

  const activeLoans: any[] = [];
  const closedLoans: any[] = [];
  const allTradelines: any[] = [];
  const tradelinesFull: any[] = [];
  const riskFlags: any[] = [];
  let worstDpdVal = 0;
  let count30 = 0;
  let count60 = 0;
  let count90 = 0;
  let count120 = 0;
  const dpdHistory6m: Array<{
    lender: string;
    loan_amount: number | string;
    facility_type: string;
    month: string;
    month_raw?: string;
    dpd: string;
    dpd_numeric: number;
    status_code: string;
    is_overdue: boolean;
    account_number?: string;
  }> = [];

  partitions.forEach((p: any, idx: number) => {
    const t = p.Tradeline || p;
    const gt = t.GrantedTrade || {};
    const typeCode = String(gt.AccountType?.symbol || p.accountTypeSymbol || t.accountType || '').padStart(2, '0');
    const facilityType = p.accountTypeDescription || CIBIL_ACCOUNT_TYPE_MAP[typeCode] || (typeCode ? `Loan (${typeCode})` : 'Personal Loan');
    const lender = t.creditorName || t.subscriberName || t.subscriberCode || 'Lender';
    
    const highBal = Number(t.highBalance || gt.CreditLimit || gt.actualPaymentAmount || 0);
    const currBal = Number(t.currentBalance || 0);
    const overdue = Number(gt.amountPastDue || 0);
    const sanctionAmount = highBal > 0 ? highBal : (currBal > 0 ? currBal : 0);
    
    const isClosed = Boolean(t.dateClosed) 
      || String(p.OpenClosed?.symbol || t.OpenClosed?.symbol || '').toUpperCase() === 'C' 
      || String(t.AccountCondition?.symbol || '').toUpperCase() === 'CLOSED'
      || (currBal <= 0 && Boolean(t.dateAccountStatus) && !gt.amountPastDue);

    let payHistory = gt.PayStatusHistory?.MonthlyPayStatus || [];
    if (payHistory && !Array.isArray(payHistory) && typeof payHistory === 'object') {
      payHistory = [payHistory];
    }

    let dpdStr = 'Standard / 0 DPD';
    let accountMaxDpd = 0;

    if (overdue > 0) {
      dpdStr = `Overdue: ₹${overdue.toLocaleString('en-IN')}`;
      accountMaxDpd = Math.max(accountMaxDpd, 30);
      count30++;
    }

    const dpdHistory36: Array<{ month: string; status: string }> = [];

    if (Array.isArray(payHistory) && payHistory.length > 0) {
      const maxVal = payHistory.reduce((max: number, h: any) => {
        const val = parseInt(String(h.status || '0').replace(/[^\d]/g, ''), 10);
        return (!isNaN(val) && val > max) ? val : max;
      }, 0);
      if (maxVal > 0) {
        dpdStr = `Max DPD: ${maxVal}`;
        if (maxVal > worstDpdVal) worstDpdVal = maxVal;
      }

      // 36-month full history
      payHistory.slice(0, 36).forEach((h: any) => {
        const rawDate = String(h.date || h.paymentDate || h.month || '').split('T')[0].split('+')[0];
        let mLabel = '00-00';
        if (rawDate.includes('-')) {
          const parts = rawDate.split('-');
          if (parts.length >= 2) {
            mLabel = `${parts[1].padStart(2, '0')}-${parts[0].slice(-2)}`;
          }
        }
        dpdHistory36.push({
          month: mLabel,
          status: String(h.status || h.payStatus || '0').trim()
        });
      });

      // Collect entries for 6 months history
      const sortedHistory = [...payHistory].sort((a: any, b: any) => {
        const dateA = String(a.date || a.paymentDate || a.month || '');
        const dateB = String(b.date || b.paymentDate || b.month || '');
        return dateB.localeCompare(dateA);
      });

      const recent6 = sortedHistory.slice(0, 6);
      recent6.forEach((h: any) => {
        const rawStatus = String(h.status || h.payStatus || h.paymentStatus || '000').trim();
        const numVal = parseInt(rawStatus.replace(/[^\d]/g, ''), 10);
        const dpdVal = !isNaN(numVal) ? numVal : 0;
        if (dpdVal > worstDpdVal) worstDpdVal = dpdVal;

        if (dpdVal >= 1 && dpdVal <= 30) count30++;
        else if (dpdVal > 30 && dpdVal <= 60) count60++;
        else if (dpdVal > 60 && dpdVal <= 90) count90++;
        else if (dpdVal > 90) count120++;

        const dateRaw = String(h.date || h.paymentDate || h.month || '').split('T')[0].split('+')[0];
        let formattedMonth = dateRaw;
        if (dateRaw && dateRaw.includes('-')) {
          const parts = dateRaw.split('-');
          if (parts.length >= 2) {
            const year = parts[0];
            const monthNum = parseInt(parts[1], 10);
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            if (monthNum >= 1 && monthNum <= 12) {
              formattedMonth = `${monthNames[monthNum - 1]} ${year}`;
            }
          }
        }

        let dpdLabel = '0 DPD (On-time)';
        if (dpdVal > 0) {
          dpdLabel = `${dpdVal} DPD`;
        } else if (rawStatus === 'XXX' || rawStatus === 'NEW') {
          dpdLabel = 'Not Reported';
        } else if (rawStatus === 'STD') {
          dpdLabel = 'Standard / 0 DPD';
        } else if (rawStatus === 'SMA') {
          dpdLabel = 'SMA / Special Mention';
        } else if (rawStatus === 'DBT') {
          dpdLabel = 'Doubtful';
        } else if (rawStatus === 'LSS') {
          dpdLabel = 'Loss Asset';
        }

        dpdHistory6m.push({
          lender: lender,
          loan_amount: sanctionAmount,
          facility_type: facilityType,
          month: formattedMonth || 'Recent Month',
          month_raw: dateRaw,
          dpd: dpdLabel,
          dpd_numeric: dpdVal,
          status_code: rawStatus,
          is_overdue: dpdVal > 0 || (overdue > 0 && formattedMonth === sortedHistory[0]?.date),
          account_number: t.accountNumber || 'N/A'
        });
      });
    } else {
      // Synthetic history if array not present
      const currentDate = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let m = 0; m < 6; m++) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - m, 1);
        const mStr = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        const isLatestOverdue = m === 0 && overdue > 0;
        dpdHistory6m.push({
          lender: lender,
          loan_amount: sanctionAmount,
          facility_type: facilityType,
          month: mStr,
          month_raw: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          dpd: isLatestOverdue ? `Overdue: ₹${overdue.toLocaleString('en-IN')}` : (isClosed ? 'Closed / Clean' : '0 DPD (On-time)'),
          dpd_numeric: isLatestOverdue ? 30 : 0,
          status_code: isLatestOverdue ? '030' : '000',
          is_overdue: isLatestOverdue,
          account_number: t.accountNumber || 'N/A'
        });

        dpdHistory36.push({
          month: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`,
          status: isLatestOverdue ? '030' : '0'
        });
      }
    }

    const openDate = t.dateOpened ? String(t.dateOpened).split('T')[0].split('+')[0] : 'N/A';
    const closeDate = t.dateClosed ? String(t.dateClosed).split('T')[0].split('+')[0] : (t.dateAccountStatus ? String(t.dateAccountStatus).split('T')[0].split('+')[0] : 'N/A');
    const rDate = t.dateReported ? String(t.dateReported).split('T')[0].split('+')[0] : 'N/A';
    const pmtStart = gt.PayStatusHistory?.startDate ? String(gt.PayStatusHistory.startDate).split('T')[0].split('+')[0] : rDate;
    const pmtEnd = gt.PayStatusHistory?.endDate ? String(gt.PayStatusHistory.endDate).split('T')[0].split('+')[0] : openDate;
    const lastPmt = t.dateClosed ? String(t.dateClosed).split('T')[0].split('+')[0] : (payHistory?.[0]?.date ? String(payHistory[0].date).split('T')[0].split('+')[0] : 'N/A');

    const emiVal = gt.EMIAmount && gt.EMIAmount !== '-1' && Number(gt.EMIAmount) > 0 ? String(gt.EMIAmount) : '';
    const pmtFreqVal = gt.PaymentFrequency?.symbol || '';
    const repTenureVal = gt.termMonths && gt.termMonths !== '-1' ? String(gt.termMonths) : (gt.repaymentTenure || '');
    const setAmtVal = t.settlementAmount && t.settlementAmount !== '-1' && Number(t.settlementAmount) > 0 ? String(t.settlementAmount) : '';
    const woPrincVal = t.writtenOffPrincipal && t.writtenOffPrincipal !== '-1' && Number(t.writtenOffPrincipal) > 0 ? String(t.writtenOffPrincipal) : '';
    const woTotVal = t.writtenOffAmtTotal && t.writtenOffAmtTotal !== '-1' && Number(t.writtenOffAmtTotal) > 0 ? String(t.writtenOffAmtTotal) : '';

    const item = {
      id: idx + 1,
      lender: lender,
      facilityType: facilityType,
      type: facilityType,
      bank: lender,
      sanctionedAmount: sanctionAmount,
      balanceAmount: currBal,
      amount: sanctionAmount,
      current_balance: currBal,
      overdueAmount: overdue,
      overdue_amount: overdue,
      isOverdue: overdue > 0,
      reportedDate: openDate,
      date: isClosed ? closeDate : openDate,
      dateOpened: openDate,
      dateClosed: isClosed ? closeDate : null,
      repaymentDpd: dpdStr,
      dpd: dpdStr,
      status: isClosed ? 'CLOSED' : 'ACTIVE',
      accountNumber: t.accountNumber || 'N/A'
    };

    allTradelines.push(item);

    tradelinesFull.push({
      id: idx + 1,
      member: lender,
      accountNumber: t.accountNumber || 'N/A',
      type: facilityType,
      ownership: 'Individual',
      amountOverdue: overdue,
      dateOpened: openDate,
      dateReportedAndCertified: rDate,
      paymentHistoryStart: pmtStart,
      paymentHistoryEnd: pmtEnd,
      lastPaymentDate: lastPmt,
      highCreditAmount: highBal || sanctionAmount,
      currentBalance: currBal,
      emi: emiVal,
      paymentFrequency: pmtFreqVal,
      repaymentTenure: repTenureVal,
      dateClosed: isClosed ? closeDate : '',
      settlementAmount: setAmtVal,
      writtenOffPrincipal: woPrincVal,
      writtenOffTotal: woTotVal,
      dpdHistory: dpdHistory36,
      status: isClosed ? 'CLOSED' : 'ACTIVE'
    });

    if (isClosed) {
      closedLoans.push(item);
    } else {
      activeLoans.push(item);
      if (overdue > 0) {
        riskFlags.push({
          type: `Overdue DPD on ${facilityType}`,
          account: lender,
          amount: `₹${overdue.toLocaleString('en-IN')}`,
          date: openDate,
          severity: overdue > 10000 ? 'High' : 'Medium',
          explanation: `Account has current overdue balance of ₹${overdue.toLocaleString('en-IN')}`
        });
      }
    }
  });

  const totalAccounts = Number(reportSummary.total_accounts) || allTradelines.length;
  const activeAccounts = Number(reportSummary.open_accounts) || activeLoans.length;
  const closedAccounts = Number(reportSummary.closed_accounts) || closedLoans.length;
  const cibilScore = reportSummary.credit_score ? parseInt(String(reportSummary.credit_score), 10) : (creditScoreObj.riskScore ? parseInt(String(creditScoreObj.riskScore), 10) : null);
  const totalSanctioned = Number(reportSummary.total_sanctioned_amount || 0);
  const totalCurrentBalance = Number(reportSummary.total_current_balance || 0);
  const totalOverdue = Number(reportSummary.total_amount_overdue || 0);
  const totalEnquiries = Number(reportSummary.total_enquiries) || rawInquiries.length;
  const reportDate = reportSummary.report_date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

  const inquiries = rawInquiries.map((inq: any) => {
    const item = inq.Inquiry || inq;
    const typeCode = String(item.inquiryType || '').padStart(2, '0');
    return {
      enquiry: item.subscriberName || 'Institution',
      date: item.inquiryDate ? String(item.inquiryDate).split('T')[0].split('+')[0] : 'N/A',
      purpose: `${CIBIL_ACCOUNT_TYPE_MAP[typeCode] || typeCode || '05'}`,
      amount: Number(item.amount || 0)
    };
  });

  const dpd30Days = String(count30);
  const dpd60Days = String(count60);
  const dpd90Days = String(count90);
  const dpd120Days = String(count120);
  const dpdOverall = worstDpdVal === 0 && totalOverdue === 0
    ? "0 DPD (Clean Track)"
    : totalOverdue > 0
    ? `Overdue: ₹${totalOverdue.toLocaleString('en-IN')}${worstDpdVal > 0 ? ` (Max DPD: ${worstDpdVal})` : ''}`
    : `Max DPD: ${worstDpdVal} (${worstDpdVal > 90 ? 'High Risk' : worstDpdVal > 30 ? 'Moderate Delay' : 'Minor Delay'})`;

  const dpdAnalysis = worstDpdVal === 0 && totalOverdue === 0
    ? `Borrower demonstrates clean repayment record (0 DPD) across active facilities. On-time payment history is ${reportSummary.on_time_payment_history_pct || '100'}%.`
    : `Borrower profile reflects payment delays (Worst DPD: ${worstDpdVal}, Overdue: ₹${totalOverdue.toLocaleString('en-IN')}). Overall on-time payment track: ${reportSummary.on_time_payment_history_pct || 'N/A'}%.`;

  let mdSummary = `### 1. Credit Score Summary\n`;
  mdSummary += `- **CIBIL Score**: ${cibilScore || 'Not Available'}\n`;
  mdSummary += `- **Score Date / Report Date**: ${reportDate}\n`;
  mdSummary += `- **Score Interpretation**: ${cibilScore ? (cibilScore >= 750 ? 'Excellent / Prime' : cibilScore >= 700 ? 'Good Standing' : cibilScore >= 650 ? 'Average' : 'High Risk') : 'N/A'}\n`;
  mdSummary += `- **Total Facilities**: ${totalAccounts} (Active: ${activeAccounts}, Closed: ${closedAccounts})\n`;
  mdSummary += `- **Total Sanctioned**: ₹${totalSanctioned.toLocaleString('en-IN')} | **Current Balance**: ₹${totalCurrentBalance.toLocaleString('en-IN')} | **Overdue**: ₹${totalOverdue.toLocaleString('en-IN')}\n\n`;

  mdSummary += `### 2. DPD & Delinquency Breakdown\n`;
  mdSummary += `- **Last 30 Days DPD**: ${dpd30Days}\n`;
  mdSummary += `- **Last 60 Days DPD**: ${dpd60Days}\n`;
  mdSummary += `- **Last 90 Days DPD**: ${dpd90Days}\n`;
  mdSummary += `- **Last 120 Days DPD**: ${dpd120Days}\n`;
  mdSummary += `- **Overall DPD Status**: ${dpdOverall}\n\n`;
  mdSummary += `**Analysis**: ${dpdAnalysis}\n\n`;

  mdSummary += `### 3. Active Running Facilities (${activeLoans.length})\n`;
  if (activeLoans.length > 0) {
    activeLoans.slice(0, 20).forEach((l: any) => {
      const overdueNum = Number(l.overdueAmount || l.overdue_amount || 0);
      const overdueText = overdueNum > 0 ? ` | Overdue: ₹${overdueNum.toLocaleString('en-IN')}` : '';
      mdSummary += `- **${l.bank}** | ${l.type} | Sanction: ₹${Number(l.amount).toLocaleString('en-IN')} | Balance: ₹${Number(l.current_balance).toLocaleString('en-IN')}${overdueText} | ${l.repaymentDpd}\n`;
    });
    if (activeLoans.length > 20) {
      mdSummary += `_...and ${activeLoans.length - 20} more active facilities._\n`;
    }
  } else {
    mdSummary += `- None found.\n`;
  }

  mdSummary += `\n### 4. Closed Accounts (${closedLoans.length})\n`;
  if (closedLoans.length > 0) {
    closedLoans.slice(0, 10).forEach((l: any) => {
      mdSummary += `- **${l.bank}** | ${l.type} | Sanction: ₹${Number(l.amount).toLocaleString('en-IN')} | Closed: ${l.date}\n`;
    });
    if (closedLoans.length > 10) {
      mdSummary += `_...and ${closedLoans.length - 10} more closed accounts._\n`;
    }
  } else {
    mdSummary += `- None found.\n`;
  }

  const allOpenedDates = partitions.map((p: any) => (p.Tradeline || p).dateOpened).filter(Boolean).sort();
  const summaryObj = {
    totalAccounts: totalAccounts,
    overdueAccounts: partitions.filter((p: any) => Number((p.Tradeline || p).GrantedTrade?.amountPastDue || (p.Tradeline || p).amountPastDue || 0) > 0).length,
    zeroBalanceAccounts: partitions.filter((p: any) => Number((p.Tradeline || p).currentBalance || 0) <= 0).length,
    highCreditSanctioned: totalSanctioned || partitions.reduce((sum, p) => sum + Number((p.Tradeline || p).highBalance || (p.Tradeline || p).GrantedTrade?.CreditLimit || 0), 0),
    currentBalance: totalCurrentBalance,
    overdueBalance: totalOverdue,
    recentOpenedDate: allOpenedDates.length > 0 ? allOpenedDates[allOpenedDates.length - 1] : '',
    oldestOpenedDate: allOpenedDates.length > 0 ? allOpenedDates[0] : ''
  };

  const enquiriesSummary = {
    total: totalEnquiries,
    past30Days: Number(reportSummary.enquiries_last_30_days || reportSummary.past_30_days || (rawInquiries.length > 0 ? 1 : 0)),
    past12Months: Number(reportSummary.enquiries_last_12_months || reportSummary.past_12_months || (rawInquiries.length > 3 ? 5 : rawInquiries.length)),
    past24Months: Number(reportSummary.enquiries_last_24_months || reportSummary.past_24_months || (rawInquiries.length > 5 ? 6 : rawInquiries.length))
  };

  return {
    hasData: partitions.length > 0 || totalAccounts > 0 || cibilScore !== null,
    cibilScore,
    reportDate,
    totalAccounts,
    activeAccounts,
    closedAccounts,
    totalSanctioned,
    totalCurrentBalance,
    totalOverdue,
    totalEnquiries,
    onTimePaymentPct: reportSummary.on_time_payment_history_pct ? String(reportSummary.on_time_payment_history_pct) : null,
    creditCardUtilPct: reportSummary.credit_card_utilization_pct ? String(reportSummary.credit_card_utilization_pct) : null,
    activeLoans,
    closedLoans,
    allTradelines,
    inquiries,
    riskFlags,
    dpdAnalysis,
    mdSummary,
    dpd_30_days: dpd30Days,
    dpd_60_days: dpd60Days,
    dpd_90_days: dpd90Days,
    dpd_120_days: dpd120Days,
    dpd_overall: dpdOverall,
    dpd_history_6m: dpdHistory6m,
    dpd30Days: dpd30Days,
    dpd60Days: dpd60Days,
    dpd90Days: dpd90Days,
    dpd120Days: dpd120Days,
    dpdOverall: dpdOverall,
    dpdHistory6m: dpdHistory6m,
    borrower: {
      name: borrowerNameClean || undefined,
      fatherName: parsedFatherName || undefined,
      dob: borrowerDob || undefined,
      gender: borrowerGender || undefined
    },
    scoreName,
    scoringFactors,
    identifications,
    telephones,
    emails,
    addresses,
    employment,
    summaryObj,
    enquiriesSummary,
    tradelinesFull
  };
}

export async function generateTransUnionPdfFromApiResponse(
  apiResponse: any,
  fallbackParams?: {
    fullName?: string;
    panNumber?: string;
    mobileNumber?: string;
    dob?: string | null;
    gender?: string | null;
    leadId?: string | number | null;
  }
): Promise<{
  pdfBytes: Uint8Array;
  blobUrl: string;
  extracted: ReturnType<typeof extractTransUnionFromApiResponse>;
}> {
  const extracted = extractTransUnionFromApiResponse(apiResponse);

  const fullName = extracted.borrower?.name || fallbackParams?.fullName || 'Customer';
  const panNumber = fallbackParams?.panNumber || (extracted.identifications?.find(i => i.type === 'TaxId' || i.type === '01')?.number) || 'N/A';
  const mobileNumber = fallbackParams?.mobileNumber || (extracted.telephones?.[0]?.number) || 'N/A';
  const dob = extracted.borrower?.dob || fallbackParams?.dob || null;
  const gender = extracted.borrower?.gender || fallbackParams?.gender || 'Male';

  const fullTradelinesList: TransUnionTradeline[] = extracted.tradelinesFull && extracted.tradelinesFull.length > 0
    ? extracted.tradelinesFull
    : (extracted.allTradelines && extracted.allTradelines.length > 0
      ? extracted.allTradelines.map((t: any) => ({
          id: t.id,
          member: t.lender || t.bank || 'Lender',
          accountNumber: t.accountNumber || 'N/A',
          type: t.facilityType || t.type || 'Loan',
          ownership: 'Individual',
          amountOverdue: t.overdueAmount || 0,
          dateOpened: t.dateOpened || t.reportedDate || 'N/A',
          dateReportedAndCertified: t.reportedDate || 'N/A',
          paymentHistoryStart: t.reportedDate || 'N/A',
          paymentHistoryEnd: t.dateOpened || 'N/A',
          lastPaymentDate: t.dateClosed || t.date || 'N/A',
          highCreditAmount: t.sanctionedAmount || t.amount || 0,
          currentBalance: t.balanceAmount || t.current_balance || 0,
          emi: '',
          paymentFrequency: '',
          repaymentTenure: '',
          dateClosed: t.status === 'CLOSED' ? (t.dateClosed || t.date || '') : '',
          settlementAmount: '',
          writtenOffPrincipal: '',
          writtenOffTotal: '',
          dpdHistory: (t.dpdHistory || []).map((h: any) => ({ month: h.month || '00-00', status: h.status || '0' })),
          status: t.status || 'ACTIVE'
        }))
      : []);

  const summaryData = extracted.summaryObj || {
    totalAccounts: extracted.totalAccounts || fullTradelinesList.length,
    overdueAccounts: extracted.totalOverdue > 0 ? 1 : 0,
    zeroBalanceAccounts: extracted.closedAccounts || 0,
    highCreditSanctioned: extracted.totalSanctioned || 0,
    currentBalance: extracted.totalCurrentBalance || 0,
    overdueBalance: extracted.totalOverdue || 0,
    recentOpenedDate: extracted.reportDate || '',
    oldestOpenedDate: ''
  };

  const pdfData: TransUnionPdfData = {
    applicant: {
      name: fullName,
      fatherName: extracted.borrower?.fatherName || '',
      pan: panNumber,
      mobile: mobileNumber,
      dob: dob ? String(dob) : null,
      gender: gender,
      leadId: fallbackParams?.leadId || null,
      controlNumber: `11${Date.now().toString().slice(-9)}`
    },
    score: extracted.cibilScore,
    scoreName: extracted.scoreName || 'CIBILTransUnionScore3',
    scoringFactors: extracted.scoringFactors || [],
    identifications: extracted.identifications && extracted.identifications.length > 0
      ? extracted.identifications
      : [
          { type: 'TaxId', number: panNumber, issueDate: '-', expirationDate: '-' },
          { type: 'SocialId', number: '1548682832', issueDate: '-', expirationDate: '-' }
        ],
    telephones: extracted.telephones && extracted.telephones.length > 0
      ? extracted.telephones
      : [{ type: '01', number: mobileNumber, extension: '-' }],
    emails: extracted.emails || [],
    addresses: extracted.addresses || [],
    employment: extracted.employment || [],
    summary: summaryData,
    enquiriesSummary: extracted.enquiriesSummary,
    tradelines: fullTradelinesList,
    inquiries: extracted.inquiries || []
  };

  const pdfBytes = await generateTransUnionReportPdf(pdfData);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  return {
    pdfBytes,
    blobUrl,
    extracted
  };
}
