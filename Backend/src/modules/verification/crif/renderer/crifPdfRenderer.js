import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { REPORT_THEME, REPORT_DIMENSIONS } from '../utils/theme.js';
import { cleanText, formatDate, formatCurrency } from '../utils/formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Production-Quality Modular CRIF Credit Information Report PROV2 PDF Renderer
 * 
 * Pixel-accurate implementation matched directly with the official 12-page reference specification:
 * - Page 1: Official CRIF Logo + Header + Summaries + Name Variations
 * - Page 2: Email, DOB, Phone, ID Variations + Address Variations Header Banner
 * - Page 3: Address Variations Table + Employment Details Header Banner
 * - Page 4: Occupation Table + Accounts 1 to 4
 * - Pages 5 to 11: Accounts 5 to 38 (4 to 5 accounts per page, repeated dark-navy header per card)
 * - Page 12: Account 39 + Inquiries (past 24 months) + -END OF REPORT- + Appendix + Legal Disclaimer
 */
export async function renderCreditReportPdf(normalizedReport) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Load official CRIF Logo Asset (extracted from reference PDF)
  let logoImage = null;
  try {
    const logoPath = path.join(__dirname, '..', 'assets', 'crif-logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    }
  } catch (err) {
    console.warn('⚠️ Could not load crif-logo.png:', err.message);
  }

  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_X, CONTENT_WIDTH, PAGE_BOTTOM_LIMIT } = REPORT_DIMENSIONS;

  const crifNavy = rgb(...REPORT_THEME.primaryNavy);
  const tableHeaderBg = rgb(...REPORT_THEME.tableHeaderBg);
  const tableAltBg = rgb(...REPORT_THEME.tableAltBg);
  const metaStripBg = rgb(...REPORT_THEME.metaStripBg);
  const borderGrey = rgb(...REPORT_THEME.borderGrey);
  const textBlack = rgb(...REPORT_THEME.textBlack);
  const textMuted = rgb(...REPORT_THEME.textMuted);
  const textWhite = rgb(...REPORT_THEME.textWhite);
  const closedRed = rgb(...REPORT_THEME.closedRed);
  const closedBg = rgb(...REPORT_THEME.closedBg);
  const closedBorder = rgb(...REPORT_THEME.closedBorder);
  const activeGreen = rgb(...REPORT_THEME.activeGreen);
  const activeBg = rgb(...REPORT_THEME.activeBg);
  const activeBorder = rgb(...REPORT_THEME.activeBorder);
  const demoRed = rgb(...REPORT_THEME.demoRed);
  const demoBannerBg = rgb(...REPORT_THEME.demoBannerBg);

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 30.0; // Top margin matches reference (y=30.0 from top)

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - 30.0;
  };

  const checkPageBreak = (neededHeight) => {
    if (y - neededHeight < PAGE_BOTTOM_LIMIT) {
      addNewPage();
      return true;
    }
    return false;
  };

  const drawSectionHeader = (title) => {
    checkPageBreak(18.0);
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: y - 14.0,
      width: CONTENT_WIDTH,
      height: 14.0,
      color: crifNavy,
    });
    currentPage.drawText(title, {
      x: MARGIN_X + 6.0,
      y: y - 10.5,
      size: 7.5,
      font: fontBold,
      color: textWhite,
    });
    y -= 14.0;
  };

  const {
    applicant,
    reportMeta,
    score,
    scoreTrend,
    primaryAccountSummary,
    secondaryAccountSummary,
    groupAccountSummary,
    additionalSummary,
    performAttributes,
    personalInfoVariations,
    employment,
    accounts,
    inquiries,
    appendix,
  } = normalizedReport;

  // =========================================================================
  // PAGE 1: HEADER & LOGO (Exact 3-Zone Layout Matching Reference)
  // =========================================================================
  // ZONE 1 (LEFT): Official CRIF Logo (x=30, y_top=29.6, w=72, h=34.4)
  if (logoImage) {
    const logoW = 72.0;
    const logoH = 34.4;
    currentPage.drawImage(logoImage, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 29.6 - logoH,
      width: logoW,
      height: logoH,
    });
  } else {
    currentPage.drawText('CRIF', {
      x: MARGIN_X,
      y: y - 16,
      size: 20,
      font: fontBold,
      color: crifNavy,
    });
    currentPage.drawText('Together to the next level', {
      x: MARGIN_X,
      y: y - 24,
      size: 5.5,
      font: fontItalic,
      color: crifNavy,
    });
  }

  // ZONE 2 (CENTER): Main Title & Dynamic Applicant Subtitle
  const mainTitle = 'Credit Information™ Report PROV2';
  const titleW = fontBold.widthOfTextAtSize(mainTitle, 13.0);
  currentPage.drawText(mainTitle, {
    x: (PAGE_WIDTH - titleW) / 2,
    y: PAGE_HEIGHT - 26.1 - 13.0,
    size: 13.0,
    font: fontBold,
    color: crifNavy,
  });

  const subFor = `For ${applicant.name || 'DEMO APPLICANT'}`;
  const subW = fontBold.widthOfTextAtSize(subFor, 7.5);
  currentPage.drawText(subFor, {
    x: (PAGE_WIDTH - subW) / 2,
    y: PAGE_HEIGHT - 46.0 - 7.5,
    size: 7.5,
    font: fontBold,
    color: textBlack,
  });

  // ZONE 3 (RIGHT): Reference Metadata (x=415.3)
  const metaX = 415.3;
  const metaSize = 6.2;
  const drawHeaderMeta = (label, val, yTop, isBold = false) => {
    const textY = PAGE_HEIGHT - yTop - metaSize;
    currentPage.drawText(label, {
      x: metaX,
      y: textY,
      size: metaSize,
      font: isBold ? fontBold : fontRegular,
      color: textBlack,
    });
    const lblW = (isBold ? fontBold : fontRegular).widthOfTextAtSize(label, metaSize);
    const cleanV = cleanText(val);
    if (cleanV && cleanV !== '—') {
      currentPage.drawText(` ${cleanV}`, {
        x: metaX + lblW,
        y: textY,
        size: metaSize,
        font: fontRegular,
        color: textBlack,
      });
    }
  };

  drawHeaderMeta('CHM Ref #:', reportMeta.chmRef, 27.4, true);
  drawHeaderMeta('Prepared For:', reportMeta.preparedFor, 35.8, false);
  drawHeaderMeta('Application ID:', reportMeta.applicationId, 44.3, false);
  drawHeaderMeta('Date of Request:', reportMeta.dateOfRequest, 52.8, false);
  drawHeaderMeta('Date of Issue:', reportMeta.dateOfIssue, 61.4, true);

  // Set Y exactly to where Inquiry Input starts (y_top = 74.0)
  y = PAGE_HEIGHT - 74.0;

  // =========================================================================
  // PAGE 1 - SECTION 1: INQUIRY INPUT INFORMATION (y_top=74 to 156)
  // =========================================================================
  drawSectionHeader('Inquiry Input Information');

  const inqH = 68.0;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - inqH,
    width: CONTENT_WIDTH,
    height: inqH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  const inqCol1X = MARGIN_X + 6.0;
  const inqCol2X = MARGIN_X + 185.0;
  const inqCol3X = MARGIN_X + 350.0;

  const drawInqField = (label, val, x, fY, maxChars = 40) => {
    currentPage.drawText(label, { x, y: fY, size: 6.2, font: fontBold, color: textBlack });
    const lblW = fontBold.widthOfTextAtSize(label, 6.2);
    const cleanV = cleanText(val);
    if (cleanV !== '—') {
      const displayV = maxChars ? cleanV.slice(0, maxChars) : cleanV;
      currentPage.drawText(` ${displayV}`, { x: x + lblW, y: fY, size: 6.2, font: fontRegular, color: textBlack });
    }
  };

  drawInqField('Name:', applicant.name, inqCol1X, y - 12.0, 30);
  drawInqField('DOB/Age:', applicant.dob, inqCol2X, y - 12.0);
  drawInqField('Gender:', applicant.gender, inqCol3X, y - 12.0);

  drawInqField('Phone Numbers:', applicant.phone, inqCol1X, y - 24.0);
  drawInqField('Spouse:', applicant.spouse, inqCol2X, y - 24.0);
  drawInqField('Mother:', applicant.mother, inqCol3X, y - 24.0);

  drawInqField('Father:', applicant.father, inqCol1X, y - 36.0);
  drawInqField('ID(s):', `${applicant.pan}${applicant.pan && applicant.pan !== '—' ? '[PAN]' : ''}`, inqCol2X, y - 36.0);
  drawInqField('Email ID(s):', applicant.email, inqCol3X, y - 36.0, 32);

  drawInqField('Current Address:', applicant.currentAddress, inqCol1X, y - 48.0, 90);
  drawInqField('Other Address:', applicant.otherAddress, inqCol1X, y - 59.0, 90);

  y -= (inqH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 2: CRIF HM SCORE(S) (y_top=164 to 214)
  // =========================================================================
  drawSectionHeader('CRIF HM Score(S):');

  const scoreH = 36.0;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - scoreH,
    width: CONTENT_WIDTH,
    height: scoreH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  currentPage.drawRectangle({ x: MARGIN_X, y: y - 13.0, width: CONTENT_WIDTH, height: 13.0, color: tableHeaderBg });
  currentPage.drawText('SCORE NAME', { x: MARGIN_X + 6.0, y: y - 9.5, size: 6.2, font: fontBold, color: textBlack });
  currentPage.drawText('RANGE', { x: MARGIN_X + 165.0, y: y - 9.5, size: 6.2, font: fontBold, color: textBlack });
  currentPage.drawText('SCORE', { x: MARGIN_X + 235.0, y: y - 9.5, size: 6.2, font: fontBold, color: textBlack });
  currentPage.drawText('SCORING FACTORS (Up to 4 only)', { x: MARGIN_X + 305.0, y: y - 9.5, size: 6.2, font: fontBold, color: textBlack });

  currentPage.drawText(cleanText(score.scoreName || 'PERFORM CONSUMER 2.2'), { x: MARGIN_X + 6.0, y: y - 23.0, size: 6.8, font: fontBold, color: textBlack });
  currentPage.drawText(cleanText(score.range || '300-900'), { x: MARGIN_X + 165.0, y: y - 23.0, size: 6.8, font: fontRegular, color: textBlack });
  currentPage.drawText(String(score.value || '—'), { x: MARGIN_X + 235.0, y: y - 24.0, size: 9.5, font: fontBold, color: textBlack });

  (score.scoringFactors || ['SF03', 'SF11', 'SF32']).slice(0, 4).forEach((sf, sfIdx) => {
    currentPage.drawText(sf, { x: MARGIN_X + 305.0, y: y - 20.0 - (sfIdx * 7.5), size: 6.0, font: fontRegular, color: textBlack });
  });

  y -= (scoreH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 3: SCORE TREND (y_top=222 to 264)
  // =========================================================================
  drawSectionHeader('Score Trend');

  const numTrendCols = Math.max(scoreTrend.length, 1);
  const trendColW = (CONTENT_WIDTH - 65.0) / numTrendCols;
  const trendH = 28.0;

  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - trendH,
    width: CONTENT_WIDTH,
    height: trendH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  // Retro Date Row
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 14.0, width: 65.0, height: 14.0, color: tableHeaderBg });
  currentPage.drawText('Retro Date', { x: MARGIN_X + 4.0, y: y - 10.0, size: 6.0, font: fontBold, color: textBlack });

  scoreTrend.forEach((item, i) => {
    const cX = MARGIN_X + 65.0 + (i * trendColW);
    const dStr = item.retroDate ? item.retroDate.slice(0, 5) : '—';
    const yStr = item.retroDate ? item.retroDate.slice(6) : '';
    currentPage.drawText(dStr, { x: cX + 2.0, y: y - 7.0, size: 5.0, font: fontRegular, color: textBlack });
    if (yStr) {
      currentPage.drawText(yStr, { x: cX + 2.0, y: y - 12.5, size: 5.0, font: fontRegular, color: textBlack });
    }
  });

  // Score Row
  currentPage.drawRectangle({ x: MARGIN_X, y: y - trendH, width: 65.0, height: 14.0, color: tableHeaderBg });
  currentPage.drawText('Score', { x: MARGIN_X + 4.0, y: y - 23.0, size: 6.0, font: fontBold, color: textBlack });

  scoreTrend.forEach((item, i) => {
    const cX = MARGIN_X + 65.0 + (i * trendColW);
    const vStr = item.score !== null && item.score !== undefined ? String(item.score) : '—';
    currentPage.drawText(vStr, { x: cX + 3.0, y: y - 23.0, size: 6.0, font: fontBold, color: textBlack });
  });

  y -= (trendH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 4: PRIMARY ACCOUNT SUMMARY (y_top=272 to 330)
  // =========================================================================
  drawSectionHeader('Primary Account Summary');

  currentPage.drawText('Tip: Current Balance & Disbursed Amount is considered ONLY for ACTIVE accounts.', {
    x: MARGIN_X + 2.0,
    y: y - 5.0,
    size: 5.2,
    font: fontItalic,
    color: textMuted,
  });
  currentPage.drawText('Tip: All amounts are in INR.', {
    x: MARGIN_X + 2.0,
    y: y - 10.5,
    size: 5.2,
    font: fontItalic,
    color: textMuted,
  });
  y -= 12.0;

  const priHeaders = [
    'Number\nof\nAccounts', 'Active\nAccounts', 'Overdue\nAccounts', 'Secured\nAccounts',
    'UnSecured\nAccounts', 'Untagged\nAccounts', 'Total\nCurrent\nBalance', 'Current\nBalance\nSecured',
    'Current\nBalance\nUnsecured', 'Total\nSanctioned\nAmount', 'Total\nDisbursed\nAmount', 'Total\nAmount\nOverdue'
  ];
  const pSumVals = [
    primaryAccountSummary.numberOfAccounts,
    primaryAccountSummary.activeAccounts,
    primaryAccountSummary.overdueAccounts,
    primaryAccountSummary.securedAccounts,
    primaryAccountSummary.unsecuredAccounts,
    primaryAccountSummary.untaggedAccounts,
    formatCurrency(primaryAccountSummary.totalCurrentBalance),
    formatCurrency(primaryAccountSummary.currentBalanceSecured),
    formatCurrency(primaryAccountSummary.currentBalanceUnsecured),
    formatCurrency(primaryAccountSummary.totalSanctionedAmount),
    formatCurrency(primaryAccountSummary.totalDisbursedAmount),
    formatCurrency(primaryAccountSummary.totalAmountOverdue),
  ];

  const colSumW = CONTENT_WIDTH / 12;
  const pSumH = 31.0;

  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - pSumH,
    width: CONTENT_WIDTH,
    height: pSumH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 20.0, width: CONTENT_WIDTH, height: 20.0, color: tableHeaderBg });

  for (let i = 0; i < 12; i++) {
    const cX = MARGIN_X + (i * colSumW);
    const hLines = priHeaders[i].split('\n');
    hLines.forEach((hl, idx) => {
      currentPage.drawText(hl, { x: cX + 2.0, y: y - 5.5 - (idx * 5.2), size: 4.8, font: fontBold, color: textBlack });
    });
    currentPage.drawText(String(pSumVals[i]), { x: cX + 3.0, y: y - 26.5, size: 5.8, font: fontRegular, color: textBlack });
  }

  y -= (pSumH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 5: SECONDARY ACCOUNT SUMMARY (y_top=338 to 390)
  // =========================================================================
  drawSectionHeader('Secondary Account Summary');

  currentPage.drawText('Tip: Current Balance & Disbursed Amount is considered ONLY for ACTIVE accounts.', {
    x: MARGIN_X + 2.0,
    y: y - 5.0,
    size: 5.2,
    font: fontItalic,
    color: textMuted,
  });
  currentPage.drawText('Tip: All amounts are in INR.', {
    x: MARGIN_X + 2.0,
    y: y - 10.5,
    size: 5.2,
    font: fontItalic,
    color: textMuted,
  });
  y -= 12.0;

  const secHeaders = [
    'Number of\nAccounts', 'Active\nAccounts', 'Overdue\nAccounts', 'Secured\nAccounts',
    'UnSecured\nAccounts', 'Untagged\nAccounts', 'Total Current\nBalance', 'Total Sanctioned\nAmount',
    'Total Disbursed\nAmount', 'Total Amount\nOverdue'
  ];
  const secColWidths = [48.0, 46.0, 46.0, 46.0, 50.0, 48.0, 64.0, 64.0, 64.0, 59.28];
  const sSumVals = [
    secondaryAccountSummary.numberOfAccounts,
    secondaryAccountSummary.activeAccounts,
    secondaryAccountSummary.overdueAccounts,
    secondaryAccountSummary.securedAccounts,
    secondaryAccountSummary.unsecuredAccounts,
    secondaryAccountSummary.untaggedAccounts,
    formatCurrency(secondaryAccountSummary.totalCurrentBalance),
    formatCurrency(secondaryAccountSummary.totalSanctionedAmount),
    formatCurrency(secondaryAccountSummary.totalDisbursedAmount),
    formatCurrency(secondaryAccountSummary.totalAmountOverdue),
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
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 20.0, width: CONTENT_WIDTH, height: 20.0, color: tableHeaderBg });

  let curSecX = MARGIN_X;
  for (let i = 0; i < 10; i++) {
    const w = secColWidths[i];
    const hLines = secHeaders[i].split('\n');
    hLines.forEach((hl, idx) => {
      currentPage.drawText(hl, { x: curSecX + 2.0, y: y - 6.0 - (idx * 5.8), size: 4.8, font: fontBold, color: textBlack });
    });
    currentPage.drawText(String(sSumVals[i]), { x: curSecX + 3.0, y: y - 26.5, size: 5.8, font: fontRegular, color: textBlack });
    curSecX += w;
  }

  y -= (pSumH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 6: GROUP ACCOUNT SUMMARY (y_top=398 to 462)
  // =========================================================================
  drawSectionHeader('Group Account Summary');

  currentPage.drawText('Tip: Current Balance & Disbursed Amount is considered ONLY for ACTIVE accounts.', {
    x: MARGIN_X + 2.0,
    y: y - 5.0,
    size: 5.2,
    font: fontItalic,
    color: textMuted,
  });
  currentPage.drawText('Tip: All amounts are in INR.', {
    x: MARGIN_X + 2.0,
    y: y - 10.5,
    size: 5.2,
    font: fontItalic,
    color: textMuted,
  });
  y -= 12.0;

  const grpH = 42.0;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - grpH,
    width: CONTENT_WIDTH,
    height: grpH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  // Top header (h=20)
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 20.0, width: CONTENT_WIDTH, height: 20.0, color: tableHeaderBg });
  // Sub header (h=10)
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 30.0, width: CONTENT_WIDTH, height: 10.0, color: tableAltBg });

  currentPage.drawText('Number\nOf', { x: MARGIN_X + 2.0, y: y - 6.5, size: 4.8, font: fontBold, color: textBlack });
  currentPage.drawText('No Of MFI', { x: MARGIN_X + 44.0, y: y - 8.0, size: 4.8, font: fontBold, color: textBlack });
  currentPage.drawText('Account Summary', { x: MARGIN_X + 94.0, y: y - 8.0, size: 4.8, font: fontBold, color: textBlack });
  currentPage.drawText('Disbursed', { x: MARGIN_X + 172.0, y: y - 8.0, size: 4.8, font: fontBold, color: textBlack });
  currentPage.drawText('Instalment', { x: MARGIN_X + 228.0, y: y - 8.0, size: 4.8, font: fontBold, color: textBlack });
  currentPage.drawText('Total Current', { x: MARGIN_X + 288.0, y: y - 8.0, size: 4.8, font: fontBold, color: textBlack });
  currentPage.drawText('Total Overdue', { x: MARGIN_X + 368.0, y: y - 8.0, size: 4.8, font: fontBold, color: textBlack });
  currentPage.drawText('Max Worst', { x: MARGIN_X + 448.0, y: y - 8.0, size: 4.8, font: fontBold, color: textBlack });

  const grpSubCols = [
    { label: '', x: MARGIN_X + 14.0, val: groupAccountSummary.numberOfAccounts },
    { label: 'Own', x: MARGIN_X + 44.0, val: groupAccountSummary.noOfMfiOwn },
    { label: 'Other', x: MARGIN_X + 66.0, val: groupAccountSummary.noOfMfiOther },
    { label: 'Active', x: MARGIN_X + 94.0, val: groupAccountSummary.activeOwn },
    { label: 'Closed', x: MARGIN_X + 118.0, val: groupAccountSummary.closedOwn },
    { label: 'Default', x: MARGIN_X + 144.0, val: groupAccountSummary.defaultOwn },
    { label: 'Own', x: MARGIN_X + 172.0, val: groupAccountSummary.disbursedOwn },
    { label: 'Other', x: MARGIN_X + 198.0, val: groupAccountSummary.disbursedOther },
    { label: 'Own', x: MARGIN_X + 228.0, val: groupAccountSummary.instalmentOwn },
    { label: 'Other', x: MARGIN_X + 254.0, val: groupAccountSummary.instalmentOther },
    { label: 'Own', x: MARGIN_X + 288.0, val: groupAccountSummary.totalCurrentOwn },
    { label: 'Other', x: MARGIN_X + 324.0, val: groupAccountSummary.totalCurrentOther },
    { label: 'Own', x: MARGIN_X + 368.0, val: groupAccountSummary.totalOverdueOwn },
    { label: 'Other', x: MARGIN_X + 404.0, val: groupAccountSummary.totalOverdueOther },
    { label: 'Own', x: MARGIN_X + 448.0, val: groupAccountSummary.maxWorstOwn },
    { label: 'Other', x: MARGIN_X + 488.0, val: groupAccountSummary.maxWorstOther },
  ];

  grpSubCols.forEach((sc) => {
    if (sc.label) {
      currentPage.drawText(sc.label, { x: sc.x, y: y - 27.0, size: 4.6, font: fontBold, color: textBlack });
    }
    currentPage.drawText(String(sc.val !== undefined ? sc.val : 0), { x: sc.x + 2.0, y: y - 37.0, size: 5.5, font: fontRegular, color: textBlack });
  });

  y -= (grpH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 7: ADDITIONAL SUMMARY (y_top=470 to 505)
  // =========================================================================
  drawSectionHeader('Additional Summary');

  const addHeaders = ['NUM-GRANTORS', 'NUM-GRANTORS-ACTIVE', 'NUM-GRANTORS-DELINQ', 'NUM-GRANTORS-ONLY-PRIMARY', 'NUM-GRANTORS-ONLY-SECONDARY'];
  const addVals = [
    cleanText(additionalSummary.numGrantors),
    cleanText(additionalSummary.numGrantorsActive),
    cleanText(additionalSummary.numGrantorsDelinq),
    cleanText(additionalSummary.numGrantorsOnlyPrimary),
    cleanText(additionalSummary.numGrantorsOnlySecondary),
  ];
  const addColW = CONTENT_WIDTH / 5;
  const addH = 22.0;

  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - addH,
    width: CONTENT_WIDTH,
    height: addH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 11.0, width: CONTENT_WIDTH, height: 11.0, color: tableHeaderBg });

  for (let i = 0; i < 5; i++) {
    const cX = MARGIN_X + (i * addColW);
    currentPage.drawText(addHeaders[i], { x: cX + 4.0, y: y - 8.0, size: 5.2, font: fontBold, color: textBlack });
    currentPage.drawText(addVals[i], { x: cX + 16.0, y: y - 18.0, size: 6.0, font: fontBold, color: textBlack });
  }

  y -= (addH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 8: PERFORM ATTRIBUTES (y_top=513 to 564)
  // =========================================================================
  drawSectionHeader('Perform Attributes');

  const perfH = 37.0;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - perfH,
    width: CONTENT_WIDTH,
    height: perfH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  const pCol1X = MARGIN_X + 6.0;
  const pCol2X = MARGIN_X + 270.0;

  performAttributes.forEach((attr, idx) => {
    const isCol2 = idx % 2 === 1;
    const rowIdx = Math.floor(idx / 2);
    const itemX = isCol2 ? pCol2X : pCol1X;
    const itemY = y - 9.0 - (rowIdx * 8.8);
    currentPage.drawText(`${attr.key}: ${attr.value}`, { x: itemX, y: itemY, size: 6.0, font: fontBold, color: textBlack });
  });

  y -= (perfH + 8.0);

  // =========================================================================
  // PAGE 1 - SECTION 9: PERSONAL INFO VARIATIONS & NAME VARIATIONS TABLE
  // =========================================================================
  drawSectionHeader('Personal Info Variations');

  currentPage.drawText("Tip: These are applicant's personal information variations as contributed by various financial institutions.", {
    x: MARGIN_X + 2.0,
    y: y - 6.0,
    size: 5.2,
    font: fontItalic,
    color: textMuted,
  });
  y -= 12.0;

  const renderVariationTable = (subTitle, items = [], isAddress = false) => {
    currentPage.drawText(subTitle, { x: MARGIN_X, y: y - 1.0, size: 7.2, font: fontBold, color: crifNavy });
    y -= 10.0;

    currentPage.drawRectangle({ x: MARGIN_X, y: y - 11.0, width: CONTENT_WIDTH, height: 11.0, color: tableHeaderBg });
    currentPage.drawText(isAddress ? 'Address' : subTitle.replace(' Variations', ''), { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
    currentPage.drawText('First Reported', { x: MARGIN_X + 200.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
    currentPage.drawText('Last Reported', { x: MARGIN_X + 280.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
    currentPage.drawText('Type', { x: MARGIN_X + 360.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
    currentPage.drawText('Source Indicator', { x: MARGIN_X + 440.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
    y -= 11.0;

    if (items.length === 0) {
      currentPage.drawText('No reported variations on file.', { x: MARGIN_X + 4.0, y: y - 8.5, size: 5.8, font: fontRegular, color: textMuted });
      y -= 12.0;
      return;
    }

    items.forEach((item, idx) => {
      const isAlt = idx % 2 === 1;
      const valStr = cleanText(item.value || item.address || item);
      const isMultiLine = isAddress && valStr.length > 44;
      const rowH = isMultiLine ? 19.0 : 11.0;

      if (isAlt) {
        currentPage.drawRectangle({ x: MARGIN_X, y: y - rowH, width: CONTENT_WIDTH, height: rowH, color: tableAltBg });
      }

      if (isMultiLine) {
        const line1 = valStr.slice(0, 44);
        const line2 = valStr.slice(44, 90);
        currentPage.drawText(line1, { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.6, font: fontRegular, color: textBlack });
        currentPage.drawText(line2, { x: MARGIN_X + 4.0, y: y - 15.5, size: 5.6, font: fontRegular, color: textBlack });
      } else {
        currentPage.drawText(valStr.slice(0, 46), { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
      }

      currentPage.drawText(formatDate(item.firstReported || item.reported_date), { x: MARGIN_X + 200.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
      currentPage.drawText(formatDate(item.lastReported || item.reported_date), { x: MARGIN_X + 280.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
      currentPage.drawText(cleanText(item.type || 'Personal Loan').slice(0, 24), { x: MARGIN_X + 360.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
      currentPage.drawText(cleanText(item.sourceIndicator || 'NBF'), { x: MARGIN_X + 440.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
      y -= rowH;
    });

    y -= 8.0;
  };

  // Page 1 ends cleanly after Name Variations!
  renderVariationTable('Name Variations', personalInfoVariations.nameVariations);

  // =========================================================================
  // PAGE 2: EMAIL, DOB, PHONE, ID VARIATIONS & ADDRESS VARIATIONS BANNER
  // =========================================================================
  addNewPage();
  renderVariationTable('Email-ID Variations', personalInfoVariations.emailVariations);
  renderVariationTable('DOB Variations', personalInfoVariations.dobVariations);
  renderVariationTable('Phone Variations', personalInfoVariations.phoneVariations);
  renderVariationTable('ID Variations', personalInfoVariations.idVariations);

  // Address Variations header banner positioned cleanly at bottom of Page 2 (y_top=181)
  drawSectionHeader('Address Variations');

  // =========================================================================
  // PAGE 3: ADDRESS VARIATIONS TABLE & EMPLOYMENT DETAILS BANNER
  // =========================================================================
  addNewPage();
  renderVariationTable('Address Variations', personalInfoVariations.addressVariations, true);

  // Employment Details header banner positioned cleanly at bottom of Page 3 (y_top=96)
  drawSectionHeader('Employment Details');

  // =========================================================================
  // PAGE 4: EMPLOYMENT DETAILS TABLE + ACCOUNTS 1 TO 4
  // =========================================================================
  addNewPage();

  // Employment Details Occupation Table at top of Page 4
  const empH = 22.0;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - empH,
    width: CONTENT_WIDTH,
    height: empH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  currentPage.drawRectangle({ x: MARGIN_X, y: y - 11.0, width: CONTENT_WIDTH, height: 11.0, color: tableHeaderBg });
  currentPage.drawText('Occupation', { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('First Reported', { x: MARGIN_X + 180.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Last Reported', { x: MARGIN_X + 280.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Type', { x: MARGIN_X + 380.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Source Indicator', { x: MARGIN_X + 460.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });

  currentPage.drawText(cleanText(employment.occupation), { x: MARGIN_X + 4.0, y: y - 18.0, size: 5.8, font: fontRegular, color: textBlack });
  currentPage.drawText(formatDate(employment.firstReported), { x: MARGIN_X + 180.0, y: y - 18.0, size: 5.8, font: fontRegular, color: textBlack });
  currentPage.drawText(formatDate(employment.lastReported), { x: MARGIN_X + 280.0, y: y - 18.0, size: 5.8, font: fontRegular, color: textBlack });
  currentPage.drawText(cleanText(employment.type), { x: MARGIN_X + 380.0, y: y - 18.0, size: 5.8, font: fontRegular, color: textBlack });
  currentPage.drawText(cleanText(employment.sourceIndicator), { x: MARGIN_X + 460.0, y: y - 18.0, size: 5.8, font: fontRegular, color: textBlack });

  y -= (empH + 12.0);

  // =========================================================================
  // PAGES 4 TO 12: ACCOUNT INFORMATION (TRADELINES)
  // =========================================================================
  accounts.forEach((tl, acctIdx) => {
    const numYears = Math.max(tl.paymentHistory.length, 1);
    // Calculated exact card height:
    // Header (14) + Gap (3) + Meta Ribbon (14) + Details (66) + Labels (24) + Months Header (10) + (numYears * 10)
    const cardContentH = 14.0 + 3.0 + 14.0 + 66.0 + 24.0 + 10.0 + (numYears * 10.0);

    // If card cannot fit on current page, cleanly transition to next page
    checkPageBreak(cardContentH);

    const isClosed = String(tl.status || '').toLowerCase() === 'closed';
    const statusLabel = isClosed ? 'Closed' : 'Active';

    // 1. Dark Navy "Account Information" Section Header Banner (Repeats for EVERY Account)
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: y - 14.0,
      width: CONTENT_WIDTH,
      height: 14.0,
      color: crifNavy,
    });
    currentPage.drawText('Account Information', {
      x: MARGIN_X + 6.0,
      y: y - 10.5,
      size: 7.5,
      font: fontBold,
      color: textWhite,
    });
    y -= 14.0;
    y -= 3.0; // 3pt gap before metadata ribbon (matching reference)

    // 2. Light-Blue Account Metadata Strip (Full values without artificial truncation)
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: y - 14.0,
      width: CONTENT_WIDTH,
      height: 14.0,
      color: metaStripBg,
      borderColor: borderGrey,
      borderWidth: 0.6,
    });

    const acctTypeStr = `Account Type: ${cleanText(tl.accountType)}`;
    const grantorStr = `Credit Grantor: ${cleanText(tl.creditGrantor)}`;
    const acctNumStr = `Account #: ${cleanText(tl.accountNumber)}`;
    const lenderTypeStr = `Lender Type #: ${cleanText(tl.lenderType)}`;
    const asOnStr = `As on #: ${formatDate(tl.asOnDate)}`;

    currentPage.drawText(acctTypeStr, { x: MARGIN_X + 4.0, y: y - 9.5, size: 5.2, font: fontBold, color: crifNavy });
    currentPage.drawText(grantorStr, { x: MARGIN_X + 130.0, y: y - 9.5, size: 5.2, font: fontBold, color: crifNavy });
    currentPage.drawText(acctNumStr, { x: MARGIN_X + 270.0, y: y - 9.5, size: 5.2, font: fontBold, color: crifNavy });
    currentPage.drawText(lenderTypeStr, { x: MARGIN_X + 395.0, y: y - 9.5, size: 5.2, font: fontBold, color: crifNavy });
    currentPage.drawText(asOnStr, { x: MARGIN_X + 455.0, y: y - 9.5, size: 5.2, font: fontBold, color: crifNavy });

    y -= 14.0;

    // 3. Card Content Box (h=66.0)
    const boxContentH = 66.0;
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: y - boxContentH,
      width: CONTENT_WIDTH,
      height: boxContentH,
      borderColor: borderGrey,
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });

    // Left Vertical Status Badge (x=30.5, y_top=61.5, w=18.0, h=65.0)
    const badgeW = 18.0;
    currentPage.drawRectangle({
      x: MARGIN_X + 0.5,
      y: y - boxContentH + 0.5,
      width: badgeW,
      height: boxContentH - 1.0,
      color: isClosed ? closedBg : activeBg,
      borderColor: isClosed ? closedBorder : activeBorder,
      borderWidth: 0.5,
    });
    currentPage.drawText(statusLabel, {
      x: MARGIN_X + 6.0,
      y: y - (boxContentH / 2) - 8.0,
      size: 6.8,
      font: fontBold,
      color: isClosed ? closedRed : activeGreen,
      rotate: degrees(90),
    });

    // 3 Columns of Detail Fields
    const c1X = MARGIN_X + badgeW + 8.0;
    const c2X = MARGIN_X + badgeW + 155.0;
    const c3X = MARGIN_X + badgeW + 320.0;

    const drawCardField = (label, val, x, fY) => {
      currentPage.drawText(label, { x, y: fY, size: 5.6, font: fontBold, color: textBlack });
      const lblW = fontBold.widthOfTextAtSize(label, 5.6);
      const cleanV = cleanText(val);
      if (cleanV && cleanV !== '—') {
        currentPage.drawText(` ${cleanV}`, { x: x + lblW, y: fY, size: 5.6, font: fontRegular, color: textBlack });
      }
    };

    const rowStep = 8.5;
    const r1Y = y - 8.5;
    const r2Y = r1Y - rowStep;
    const r3Y = r2Y - rowStep;
    const r4Y = r3Y - rowStep;
    const r5Y = r4Y - rowStep;
    const r6Y = r5Y - rowStep;
    const r7Y = r6Y - rowStep;

    drawCardField('Ownership:', tl.ownership, c1X, r1Y);
    drawCardField('Disbursed Date:', formatDate(tl.disbursedDate), c2X, r1Y);
    drawCardField('Disbd Amt/High Credit:', formatCurrency(tl.disbursedAmount), c3X, r1Y);

    drawCardField('Credit Limit:', tl.creditLimit ? formatCurrency(tl.creditLimit) : '', c1X, r2Y);
    drawCardField('Last Payment Date:', formatDate(tl.lastPaymentDate), c2X, r2Y);
    drawCardField('Current Balance:', formatCurrency(tl.currentBalance), c3X, r2Y);

    drawCardField('Cash Limit:', tl.cashLimit ? formatCurrency(tl.cashLimit) : '', c1X, r3Y);
    drawCardField('Closed Date:', isClosed ? formatDate(tl.closedDate) : '', c2X, r3Y);
    drawCardField('Last Paid Amt:', tl.lastPaidAmount ? formatCurrency(tl.lastPaidAmount) : '', c3X, r3Y);

    drawCardField('InstlAmt/Freq:', tl.installmentAmount ? `${formatCurrency(tl.installmentAmount)}${tl.frequency ? `/${tl.frequency}` : ''}` : '', c1X, r4Y);
    drawCardField('Tenure(month):', cleanText(tl.tenureMonths), c2X, r4Y);
    drawCardField('Overdue Amt:', formatCurrency(tl.overdueAmount), c3X, r4Y);

    drawCardField('Write off Date:', formatDate(tl.writeOffDate), c1X, r5Y);
    drawCardField('Account in Dispute:', cleanText(tl.accountInDispute), c2X, r5Y);
    drawCardField('Principal Writeoff Amt:', tl.principalWriteOffAmount ? formatCurrency(tl.principalWriteOffAmount) : '', c3X, r5Y);

    drawCardField('Account Remarks:', cleanText(tl.accountRemarks), c1X, r6Y);
    drawCardField('Settlement Amt:', tl.settlementAmount ? formatCurrency(tl.settlementAmount) : '', c2X, r6Y);
    drawCardField('Total Writeoff Amt:', formatCurrency(tl.totalWriteOffAmount), c3X, r6Y);

    y -= boxContentH;

    // 4. Payment History Label Row
    currentPage.drawText('Payment History/Asset Classification:', {
      x: MARGIN_X,
      y: y - 10.0,
      size: 6.2,
      font: fontBold,
      color: crifNavy,
    });
    currentPage.drawText('Amount Paid History:', {
      x: MARGIN_X,
      y: y - 19.0,
      size: 5.2,
      font: fontItalic,
      color: textMuted,
    });
    y -= 24.0;

    // 5. Monthly Calendar Grid (Exact Column Grid Matching Reference)
    const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthColW = (CONTENT_WIDTH - 45.0) / 12;
    const gridH = 10.0 + (numYears * 10.0);

    currentPage.drawRectangle({
      x: MARGIN_X,
      y: y - gridH,
      width: CONTENT_WIDTH,
      height: gridH,
      borderColor: borderGrey,
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });

    currentPage.drawRectangle({ x: MARGIN_X, y: y - 10.0, width: CONTENT_WIDTH, height: 10.0, color: tableHeaderBg });
    for (let m = 0; m < 12; m++) {
      const mX = MARGIN_X + 45.0 + (m * monthColW);
      currentPage.drawText(monthsArr[m], { x: mX + 4.0, y: y - 7.5, size: 5.2, font: fontBold, color: textBlack });
    }
    y -= 10.0;

    tl.paymentHistory.forEach((yrObj) => {
      currentPage.drawText(String(yrObj.year), { x: MARGIN_X + 4.0, y: y - 7.5, size: 5.2, font: fontBold, color: textBlack });
      for (let m = 0; m < 12; m++) {
        const mX = MARGIN_X + 45.0 + (m * monthColW);
        const stVal = yrObj.months?.[monthsArr[m]] || '';
        if (stVal) {
          currentPage.drawText(stVal, {
            x: mX + 4.0,
            y: y - 7.5,
            size: 5.2,
            font: stVal === 'XXX' ? fontBold : fontRegular,
            color: stVal === 'XXX' ? closedRed : textBlack,
          });
        }
      }
      y -= 10.0;
    });

    y -= 12.0; // 12pt gap before next account
  });

  // =========================================================================
  // SECTION 11: INQUIRIES (PAST 24 MONTHS) (PAGE 12)
  // =========================================================================
  checkPageBreak(55.0);
  drawSectionHeader('Inquiries ( past 24 months)');

  const inqTableH = 11.0 + Math.max(inquiries.length, 1) * 11.0;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - inqTableH,
    width: CONTENT_WIDTH,
    height: inqTableH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  currentPage.drawRectangle({ x: MARGIN_X, y: y - 11.0, width: CONTENT_WIDTH, height: 11.0, color: tableHeaderBg });
  currentPage.drawText('Credit Grantor', { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Type', { x: MARGIN_X + 160.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Date of Inquiry', { x: MARGIN_X + 230.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Account Type', { x: MARGIN_X + 320.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Amount', { x: MARGIN_X + 420.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  currentPage.drawText('Remark', { x: MARGIN_X + 490.0, y: y - 8.0, size: 5.8, font: fontBold, color: textBlack });
  y -= 11.0;

  inquiries.forEach((inq) => {
    currentPage.drawText(cleanText(inq.creditGrantor).slice(0, 32), { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
    currentPage.drawText(cleanText(inq.type), { x: MARGIN_X + 160.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
    currentPage.drawText(formatDate(inq.inquiryDate), { x: MARGIN_X + 230.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
    currentPage.drawText(cleanText(inq.accountType).slice(0, 20), { x: MARGIN_X + 320.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
    currentPage.drawText(formatCurrency(inq.amount), { x: MARGIN_X + 420.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
    currentPage.drawText(cleanText(inq.remark), { x: MARGIN_X + 490.0, y: y - 8.0, size: 5.8, font: fontRegular, color: textBlack });
    y -= 11.0;
  });

  y -= 14.0;

  // =========================================================================
  // SECTION 12: END OF REPORT, APPENDIX & LEGAL DISCLAIMER (PAGE 12)
  // =========================================================================
  checkPageBreak(130.0);

  const endText = '-END OF REPORT-';
  const endW = fontBold.widthOfTextAtSize(endText, 9.0);
  currentPage.drawText(endText, { x: (PAGE_WIDTH - endW) / 2, y, size: 9.0, font: fontBold, color: crifNavy });
  y -= 12.0;

  drawSectionHeader('Appendix');

  const appH = 11.0 + (appendix.length * 11.0);
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: y - appH,
    width: CONTENT_WIDTH,
    height: appH,
    borderColor: borderGrey,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  currentPage.drawRectangle({ x: MARGIN_X, y: y - 11.0, width: CONTENT_WIDTH, height: 11.0, color: tableHeaderBg });
  currentPage.drawText('Section', { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.4, font: fontBold, color: textBlack });
  currentPage.drawText('Code', { x: MARGIN_X + 160.0, y: y - 8.0, size: 5.4, font: fontBold, color: textBlack });
  currentPage.drawText('Description', { x: MARGIN_X + 280.0, y: y - 8.0, size: 5.4, font: fontBold, color: textBlack });
  y -= 11.0;

  appendix.forEach((ar) => {
    currentPage.drawText(ar.section, { x: MARGIN_X + 4.0, y: y - 8.0, size: 5.0, font: fontRegular, color: textBlack });
    currentPage.drawText(ar.code, { x: MARGIN_X + 160.0, y: y - 8.0, size: 5.0, font: fontRegular, color: textBlack });
    currentPage.drawText(ar.description, { x: MARGIN_X + 280.0, y: y - 8.0, size: 5.0, font: fontRegular, color: textBlack });
    y -= 11.0;
  });

  y -= 12.0;

  // Disclaimer text (Exact verbatim copy from reference)
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
  y -= 4.0;
  const copyW = fontBold.widthOfTextAtSize(copyR, 5.8);
  currentPage.drawText(copyR, { x: (PAGE_WIDTH - copyW) / 2, y, size: 5.8, font: fontBold, color: textBlack });

  // Main page content remains clean white exactly like reference PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export default { renderCreditReportPdf };

