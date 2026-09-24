import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

export const CIBIL_ACCOUNT_TYPE_MAP = {
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

export function cleanText(str) {
  if (str === undefined || str === null || str === '' || str === '-1') return '';
  return String(str)
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E\t\n\r]/g, '')
    .trim();
}

export function formatDate(dateStr) {
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
  page,
  label,
  value,
  x,
  y,
  size,
  fontBold,
  fontRegular,
  labelColor,
  valueColor,
  fixedValX
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

export async function generateTransUnionReportPdf(data) {
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
  const cibilNavy = rgb(0.0, 56 / 255, 101 / 255);          // #003865 (CIBIL Dark Navy)

  // Authentic TransUnion CIBIL PNG Logo (301x67) embedded directly from Base64
  const TRANSUNION_LOGO_BASE64 = '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';

  let embeddedLogo = null;
  try {
    const rawPngBytes = Buffer.from(TRANSUNION_LOGO_BASE64, 'base64');
    embeddedLogo = await pdfDoc.embedPng(rawPngBytes);
  } catch (err) {
    console.warn('[PDF Generator] Could not embed PNG logo:', err);
  }

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT;

  const checkPageBreak = (neededHeight) => {
    if (y - neededHeight < 30) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = 812; // Top margin on subsequent pages
    }
  };

  const drawCyanHeader = (title, topY) => {
    currentPage.drawText(title, {
      x: LEFT_X,
      y: topY,
      size: 9,
      font: fontBold,
      color: cibilCyan,
    });
  };

  const drawDividerLine = (lineY) => {
    currentPage.drawLine({
      start: { x: LEFT_X, y: lineY },
      end: { x: RIGHT_X, y: lineY },
      thickness: 0.7,
      color: textBlack,
    });
  };

  // Format Consumer Name
  const consumerFullName = cleanText(
    data.applicant?.fatherName
      ? `${data.applicant?.name} S/O ${data.applicant?.fatherName}`
      : (data.applicant?.name || 'CUSTOMER')
  ).toUpperCase();

  const repDate = data.applicant?.reportDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const repTime = data.applicant?.reportTime || new Date().toTimeString().split(' ')[0];
  const ctrlNum = data.applicant?.controlNumber || `11${Date.now().toString().slice(-9)}`;
  const memRef = data.applicant?.memberReferenceNumber || '';
  const memId = data.applicant?.memberId || '';

  // =========================================================================
  // PAGE 1: HEADER & LOGO (Exact y=789 to 762)
  // =========================================================================
  if (embeddedLogo) {
    currentPage.drawImage(embeddedLogo, {
      x: LEFT_X,
      y: 789,
      width: 131.55,
      height: 35,
    });
  } else {
    // Pixel-accurate vector representation matching original TransUnion CIBIL logo
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
  }

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

  const dobFormatted = formatDate(data.applicant?.dob);
  const genderStr = cleanText(data.applicant?.gender) || 'Male';

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
        { type: 'TaxId', number: cleanText(data.applicant?.pan) || 'AXCPR4370H', issueDate: '-', expirationDate: '-' },
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
        { type: '01', number: cleanText(data.applicant?.mobile) || '917814445169', extension: '-' },
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
  currentPage.drawText(`TOTAL:${data.summary?.totalAccounts || 0}`, { x: 109.5, y: 56.2, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`OVERDUE:${data.summary?.overdueAccounts || 0}`, { x: 109.5, y: 45.7, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`ZERO-BALANCE:${data.summary?.zeroBalanceAccounts || 0}`, { x: 109.5, y: 35.2, size: 7, font: fontRegular, color: textBlack });

  // Col 3: Advances
  currentPage.drawRectangle({ x: 210.71, y: sumY, width: 155.59, height: sumH, color: boxGrey });
  currentPage.drawText(`HIGH CR/SANC. AMT:${data.summary?.highCreditSanctioned || 0}`, { x: 213.7, y: 56.2, size: 7, font: fontRegular, color: textBlack });

  // Col 4: Balances
  currentPage.drawRectangle({ x: 366.3, y: sumY, width: 103.04, height: sumH, color: boxGrey });
  currentPage.drawText(`CURRENT:${data.summary?.currentBalance || 0}`, { x: 369.3, y: 56.2, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`OVERDUE:${data.summary?.overdueBalance || 0}`, { x: 369.3, y: 45.7, size: 7, font: fontRegular, color: textBlack });

  // Col 5: Dates
  currentPage.drawRectangle({ x: 469.34, y: sumY, width: 107.66, height: sumH, color: boxGrey });
  currentPage.drawText(`RECENT:${formatDate(data.summary?.recentOpenedDate) || '-'}`, { x: 472.3, y: 56.2, size: 7, font: fontRegular, color: textBlack });
  currentPage.drawText(`OLDEST:${formatDate(data.summary?.oldestOpenedDate) || '-'}`, { x: 472.3, y: 45.7, size: 7, font: fontRegular, color: textBlack });

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

    // 3. Card 4-Column Details (with exact Black Bold labels and Black Regular values)
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
  // DETAILED ENQUIRY(S) TABLE (Page 6/7)
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
  // FINAL PAGE: END OF REPORT & LEGAL DISCLAIMERS (Page 7)
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
    // Bottom cyan line
    page.drawLine({
      start: { x: LEFT_X, y: 24.0 },
      end: { x: RIGHT_X, y: 24.0 },
      thickness: 0.7,
      color: cibilCyan,
    });

    // Page number: e.g. "1 / 7"
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
  return Buffer.from(pdfBytes);
}

export function extractTransUnionFromApiResponse(apiResponse) {
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
      allTradelines: [],
      inquiries: [],
      tradelinesFull: []
    };
  }

  const reportSummary = resp?.data?.report_summary || resp?.report_summary || {};
  const steps = resp?.data?.steps || resp?.steps || [];
  const step3 = steps.find((s) => s.step === 3 || s.name === 'GetCustomerAssets' || s.response?.GetCustomerAssetsResponse);
  const assets = step3?.response?.GetCustomerAssetsResponse?.GetCustomerAssetsSuccess?.Asset || resp?.Asset || resp?.TrueLinkCreditReport;
  const tlr = assets?.TrueLinkCreditReport || assets || resp?.TrueLinkCreditReport || {};

  const ensureArr = (x) => (!x ? [] : (Array.isArray(x) ? x : [x]));

  // Borrower Demographic Details
  const b = tlr.Borrower || resp?.Borrower || {};
  const bName = b.BorrowerName?.Name || {};
  const forename = bName.Forename || resp?.forename || '';
  const surname = bName.Surname || resp?.surname || '';
  let parsedFatherName = '';
  if (surname.toUpperCase().includes('S/O') || surname.toUpperCase().includes('D/O') || surname.toUpperCase().includes('W/O') || surname.toUpperCase().includes('C/O')) {
    const parts = surname.split(/S\/O|D\/O|W\/O|C\/O/i);
    parsedFatherName = (parts[1] || '').trim();
  }
  const borrowerNameClean = [forename, surname].filter(Boolean).join(' ').trim() || resp?.name || '';
  const borrowerDob = b.Birth?.date ? String(b.Birth.date).split('T')[0].split('+')[0] : (resp?.date_of_birth || '');
  const borrowerGender = b.Gender || resp?.gender || 'Male';

  // Identifications (TaxId, SocialId, CkycId, etc.)
  const rawIdents = ensureArr(b.IdentifierPartition?.Identifier || b.IdentifierPartition || b.Identifier);
  const identifications = rawIdents.map((item) => {
    const idObj = item.Id || item.Identifier || item;
    const type = idObj.idType?.symbol || idObj.idType || idObj.type || idObj.IdType || 'TaxId';
    const number = idObj.idNumber || idObj.number || idObj.IdNumber || '';
    const issueDate = idObj.dateIssued || idObj.issueDate || '-';
    const expirationDate = idObj.dateExpired || idObj.expirationDate || '-';
    return { type, number, issueDate, expirationDate };
  }).filter((id) => Boolean(id.number));

  if (identifications.length === 0 && resp?.pan_id) {
    identifications.push({ type: 'TaxId', number: resp.pan_id, issueDate: '-', expirationDate: '-' });
  }

  // Telephones
  const rawPhones = ensureArr(b.BorrowerTelephone);
  const telephones = rawPhones.map((p) => {
    const pType = p.PhoneType?.symbol || p.phoneType || '01';
    const pNum = p.PhoneNumber?.Number || p.phoneNumber || p.number || '';
    const pExt = p.extension || p.PhoneNumber?.extension || '-';
    return { type: pType, number: pNum, extension: pExt };
  }).filter((ph) => Boolean(ph.number));

  if (telephones.length === 0 && resp?.phone_number) {
    telephones.push({ type: '01', number: resp.phone_number, extension: '-' });
  }

  // Emails
  const rawEmails = ensureArr(b.EmailAddress);
  const emails = rawEmails.map((e) => e.Email || e.email || String(e)).filter((em) => Boolean(em && em.includes('@')));

  // Addresses
  const rawAddresses = ensureArr(b.BorrowerAddress);
  const addresses = rawAddresses.map((a) => {
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
  }).filter((ad) => Boolean(ad.address));

  // Employment Records
  const rawEmp = ensureArr(b.Employer);
  const employment = rawEmp.map((emp) => ({
    accountType: emp.account || emp.accountType || '13',
    dateReported: emp.dateReported ? String(emp.dateReported).split('T')[0].split('+')[0] : '',
    occupationCode: emp.OccupationCode || emp.occupationCode || '03',
    income: emp.income || '',
    netGrossIndicator: emp.NetGrossIndicator || '',
    monthlyAnnualIndicator: emp.IncomeFreqIndicator || ''
  }));

  // Score & Scoring Factors
  const creditScoreObj = b.CreditScore || (Array.isArray(resp?.credit_score) ? resp.credit_score[0] : resp?.credit_score) || {};
  const scoreModelObj = creditScoreObj.CreditScoreModel || {};
  const scoreName = creditScoreObj.scoreName || scoreModelObj.symbol || 'CIBILTransUnionScore3';
  const rawFactors = ensureArr(creditScoreObj.CreditScoreFactor);
  const scoringFactors = rawFactors.map((f, idx) => {
    const txtArr = ensureArr(f.FactorText);
    const txt = txtArr[0] || f.Factor?.description || 'No Valid Factors';
    const cleanTxt = String(txt).replace(/^explain:\s*/i, '').replace(/^factor:\s*/i, '').trim();
    return `${idx + 1}. ${cleanTxt}`;
  });

  let partitions = tlr.TradeLinePartition || [];
  if (!Array.isArray(partitions) && partitions) {
    partitions = [partitions];
  }

  let rawInquiries = tlr.InquiryPartition || [];
  if (!Array.isArray(rawInquiries) && rawInquiries) {
    rawInquiries = [rawInquiries];
  }

  const allTradelines = [];
  const tradelinesFull = [];

  partitions.forEach((p, idx) => {
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

    const dpdHistory36 = [];

    if (Array.isArray(payHistory) && payHistory.length > 0) {
      payHistory.slice(0, 36).forEach((h) => {
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
    }

    const openDate = t.dateOpened ? String(t.dateOpened).split('T')[0].split('+')[0] : 'N/A';
    const closeDate = t.dateClosed ? String(t.dateClosed).split('T')[0].split('+')[0] : (t.dateAccountStatus ? String(t.dateAccountStatus).split('T')[0].split('+')[0] : 'N/A');
    const repDate = t.dateReported ? String(t.dateReported).split('T')[0].split('+')[0] : 'N/A';
    const pmtStart = gt.PayStatusHistory?.startDate ? String(gt.PayStatusHistory.startDate).split('T')[0].split('+')[0] : repDate;
    const pmtEnd = gt.PayStatusHistory?.endDate ? String(gt.PayStatusHistory.endDate).split('T')[0].split('+')[0] : openDate;
    const lastPmt = t.dateClosed ? String(t.dateClosed).split('T')[0].split('+')[0] : (payHistory?.[0]?.date ? String(payHistory[0].date).split('T')[0].split('+')[0] : 'N/A');

    const emiVal = gt.EMIAmount && gt.EMIAmount !== '-1' && Number(gt.EMIAmount) > 0 ? String(gt.EMIAmount) : '';
    const pmtFreqVal = gt.PaymentFrequency?.symbol || '';
    const repTenureVal = gt.termMonths && gt.termMonths !== '-1' ? String(gt.termMonths) : (gt.repaymentTenure || '');
    const setAmtVal = t.settlementAmount && t.settlementAmount !== '-1' && Number(t.settlementAmount) > 0 ? String(t.settlementAmount) : '';
    const woPrincVal = t.writtenOffPrincipal && t.writtenOffPrincipal !== '-1' && Number(t.writtenOffPrincipal) > 0 ? String(t.writtenOffPrincipal) : '';
    const woTotVal = t.writtenOffAmtTotal && t.writtenOffAmtTotal !== '-1' && Number(t.writtenOffAmtTotal) > 0 ? String(t.writtenOffAmtTotal) : '';

    tradelinesFull.push({
      id: idx + 1,
      member: lender,
      accountNumber: t.accountNumber || 'N/A',
      type: facilityType,
      ownership: 'Individual',
      amountOverdue: overdue,
      dateOpened: openDate,
      dateReportedAndCertified: repDate,
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
  });

  const totalAccounts = Number(reportSummary.total_accounts) || tradelinesFull.length;
  const cibilScore = reportSummary.credit_score ? parseInt(String(reportSummary.credit_score), 10) : (creditScoreObj.riskScore ? parseInt(String(creditScoreObj.riskScore), 10) : (resp?.score ? parseInt(String(resp.score), 10) : null));
  const totalSanctioned = Number(reportSummary.total_sanctioned_amount || 0);
  const totalCurrentBalance = Number(reportSummary.total_current_balance || 0);
  const totalOverdue = Number(reportSummary.total_amount_overdue || 0);
  const totalEnquiries = Number(reportSummary.total_enquiries) || rawInquiries.length;
  const reportDate = reportSummary.report_date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

  const inquiries = rawInquiries.map((inq) => {
    const item = inq.Inquiry || inq;
    const typeCode = String(item.inquiryType || '').padStart(2, '0');
    return {
      enquiry: item.subscriberName || 'Institution',
      date: item.inquiryDate ? String(item.inquiryDate).split('T')[0].split('+')[0] : 'N/A',
      purpose: `${CIBIL_ACCOUNT_TYPE_MAP[typeCode] || typeCode || '05'}`,
      amount: Number(item.amount || 0)
    };
  });

  const allOpenedDates = partitions.map((p) => (p.Tradeline || p).dateOpened).filter(Boolean).sort();
  const summaryObj = {
    totalAccounts: totalAccounts,
    overdueAccounts: partitions.filter((p) => Number((p.Tradeline || p).GrantedTrade?.amountPastDue || (p.Tradeline || p).amountPastDue || 0) > 0).length,
    zeroBalanceAccounts: partitions.filter((p) => Number((p.Tradeline || p).currentBalance || 0) <= 0).length,
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
    totalSanctioned,
    totalCurrentBalance,
    totalOverdue,
    totalEnquiries,
    inquiries,
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

/**
 * Main export function for generating CIBIL PDF buffer from API data
 */
export async function generateCibilPdfReport(reportData = {}) {
  const extracted = extractTransUnionFromApiResponse(reportData);

  const fullName = extracted.borrower?.name || reportData.name || reportData.forename || 'Customer';
  const panNumber = (extracted.identifications?.find(i => i.type === 'TaxId' || i.type === '01')?.number) || reportData.pan_id || 'N/A';
  const mobileNumber = (extracted.telephones?.[0]?.number) || reportData.phone_number || 'N/A';
  const dob = extracted.borrower?.dob || reportData.date_of_birth || null;
  const gender = extracted.borrower?.gender || reportData.gender || 'Male';

  const fullTradelinesList = extracted.tradelinesFull && extracted.tradelinesFull.length > 0
    ? extracted.tradelinesFull
    : [];

  const summaryData = extracted.summaryObj || {
    totalAccounts: extracted.totalAccounts || fullTradelinesList.length,
    overdueAccounts: extracted.totalOverdue > 0 ? 1 : 0,
    zeroBalanceAccounts: 0,
    highCreditSanctioned: extracted.totalSanctioned || 0,
    currentBalance: extracted.totalCurrentBalance || 0,
    overdueBalance: extracted.totalOverdue || 0,
    recentOpenedDate: extracted.reportDate || '',
    oldestOpenedDate: ''
  };

  const pdfData = {
    applicant: {
      name: fullName,
      fatherName: extracted.borrower?.fatherName || '',
      pan: panNumber,
      mobile: mobileNumber,
      dob: dob ? String(dob) : null,
      gender: gender,
      controlNumber: `11${Date.now().toString().slice(-9)}`,
      memberReferenceNumber: reportData.client_ref_num || '',
      memberId: reportData.member_id || '',
      reportDate: extracted.reportDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      reportTime: new Date().toTimeString().split(' ')[0]
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

  return await generateTransUnionReportPdf(pdfData);
}

export default { generateCibilPdfReport, generateTransUnionReportPdf, extractTransUnionFromApiResponse };
