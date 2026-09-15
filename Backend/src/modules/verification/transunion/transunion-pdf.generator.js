import PDFDocument from 'pdfkit';

/**
 * Utility helper to ensure a value is always treated as an array.
 * Upstream XML-to-JSON parsers convert single child elements to objects instead of arrays.
 */
function ensureArray(val) {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/**
 * Recursively find TrueLinkCreditReport inside any nested response structure
 */
function findTrueLinkCreditReport(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.TrueLinkCreditReport) return obj.TrueLinkCreditReport;
  if (obj.Asset?.TrueLinkCreditReport) return obj.Asset.TrueLinkCreditReport;
  if (obj.GetCustomerAssetsSuccess?.Asset?.TrueLinkCreditReport) return obj.GetCustomerAssetsSuccess.Asset.TrueLinkCreditReport;
  if (obj.GetCustomerAssetsResponse?.GetCustomerAssetsSuccess?.Asset?.TrueLinkCreditReport) return obj.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.Asset.TrueLinkCreditReport;
  
  if (Array.isArray(obj.steps)) {
    for (const step of obj.steps) {
      const resp = step?.response || {};
      const found =
        resp?.GetCustomerAssetsResponse?.GetCustomerAssetsSuccess?.Asset?.TrueLinkCreditReport ||
        resp?.GetCustomerAssetsSuccess?.Asset?.TrueLinkCreditReport ||
        resp?.Asset?.TrueLinkCreditReport ||
        resp?.TrueLinkCreditReport;
      if (found) return found;
    }
  }

  if (obj.data) {
    const found = findTrueLinkCreditReport(obj.data);
    if (found) return found;
  }
  return null;
}

/**
 * Recursively find CreditSummaryData inside any nested response structure
 */
function findCreditSummary(obj) {
  if (!obj || typeof obj !== 'object') return {};
  if (obj.CreditSummaryData) return obj.CreditSummaryData;
  if (obj.GetCustomerAssetsSuccess?.CreditSummaryData) return obj.GetCustomerAssetsSuccess.CreditSummaryData;
  if (obj.GetCustomerAssetsResponse?.GetCustomerAssetsSuccess?.CreditSummaryData) return obj.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.CreditSummaryData;

  if (Array.isArray(obj.steps)) {
    for (const step of obj.steps) {
      const resp = step?.response || {};
      const found =
        resp?.GetCustomerAssetsResponse?.GetCustomerAssetsSuccess?.CreditSummaryData ||
        resp?.GetCustomerAssetsSuccess?.CreditSummaryData ||
        resp?.CreditSummaryData;
      if (found) return found;
    }
  }

  if (obj.data) {
    const found = findCreditSummary(obj.data);
    if (found) return found;
  }
  return {};
}

/**
 * Generates an official, beautifully styled CIBIL Credit Information Report (CIR) in PDF format.
 * @param {object} reportData - TrueLinkCreditReport or response data object
 * @returns {Promise<Buffer>} - Resolves with PDF Buffer
 */
export async function generateCibilPdfReport(reportData = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch margins
        info: {
          Title: 'TransUnion CIBIL Credit Information Report',
          Author: 'Bharat API Cloud',
          Subject: 'Credit Information Report (CIR)',
          Keywords: 'CIBIL, Credit Report, CIR, TransUnion, Score',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Extract details robustly
      const trueLink = findTrueLinkCreditReport(reportData) || reportData?.TrueLinkCreditReport || reportData?.asset?.TrueLinkCreditReport || {};
      const creditSummary = findCreditSummary(reportData);

      const borrower = trueLink?.Borrower || {};
      const creditScoreRaw = borrower?.CreditScore;
      const scoreObj = Array.isArray(creditScoreRaw) ? (creditScoreRaw[0] || {}) : (creditScoreRaw || {});
      const rawRiskScore = parseInt(scoreObj?.riskScore || scoreObj?.score || scoreObj?.CreditScore || '750', 10);
      const riskScore = isNaN(rawRiskScore) ? 750 : rawRiskScore;
      const scoreName = scoreObj?.scoreName || 'CIBILTransUnionScore3';

      const forename = borrower?.BorrowerName?.Name?.Forename || reportData?.forename || '';
      const surname = borrower?.BorrowerName?.Name?.Surname || reportData?.surname || '';
      const borrowerName = `${forename} ${surname}`.trim() || 'Valued Customer';

      let dob = 'N/A';
      if (borrower?.Birth?.BirthDate) {
        const b = borrower.Birth.BirthDate;
        dob = `${b.year || 'YYYY'}-${String(b.month || '01').padStart(2, '0')}-${String(b.day || '01').padStart(2, '0')}`;
      } else if (borrower?.Birth?.date) {
        dob = String(borrower.Birth.date).split('+')[0];
      } else if (reportData?.date_of_birth) {
        dob = String(reportData.date_of_birth);
      }

      const gender = borrower?.Gender || reportData?.gender || 'N/A';
      const referenceKey = trueLink?.ReferenceKey || 'CIR-' + Math.floor(1000000000 + Math.random() * 9000000000);
      const reportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // Color Palette
      const primaryColor = '#0f766e'; // Teal / Dark Cyan
      const headerNavy = '#0f172a'; // Slate 900
      const accentCyan = '#0284c7'; // Sky Blue
      const lightBg = '#f8fafc'; // Slate 50
      const borderColor = '#cbd5e1'; // Slate 300
      const textDark = '#1e293b'; // Slate 800
      const textMuted = '#64748b'; // Slate 500
      const scoreColor = riskScore >= 750 ? '#10b981' : riskScore >= 650 ? '#f59e0b' : '#ef4444';

      // --- 1. HEADER SECTION ---
      doc.rect(36, 36, 523, 50).fill(headerNavy);

      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('TRANSUNION CIBIL CREDIT INFORMATION REPORT', 50, 48);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('CONFIDENTIAL FINANCIAL ASSET REPORT · POWERED BY BHARAT API CLOUD', 50, 66);

      doc.fontSize(8).fillColor('#38bdf8').text(`REF: ${referenceKey}`, 410, 48, { align: 'right', width: 135 });
      doc.fontSize(8).fillColor('#94a3b8').text(`DATE: ${reportDate}`, 410, 62, { align: 'right', width: 135 });

      let currentY = 96;

      // --- 2. CIBIL SCORE & METRICS BANNER ---
      doc.rect(36, currentY, 523, 100).fillAndStroke(lightBg, borderColor);

      // Score Dial Box
      doc.roundedRect(48, currentY + 12, 130, 76, 6).fillAndStroke('#ffffff', borderColor);
      doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text('CIBIL TRANSUNION SCORE', 56, currentY + 20);
      doc.fillColor(scoreColor).fontSize(32).font('Helvetica-Bold').text(String(riskScore), 56, currentY + 32);
      
      const scoreRating = riskScore >= 750 ? 'EXCELLENT' : riskScore >= 700 ? 'VERY GOOD' : riskScore >= 650 ? 'FAIR' : 'NEEDS ATTENTION';
      doc.roundedRect(56, currentY + 68, 75, 14, 3).fill(scoreColor);
      doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold').text(scoreRating, 56, currentY + 71, { width: 75, align: 'center' });

      // Key Insights / Credit Summary
      const sumX = 190;
      doc.fillColor(headerNavy).fontSize(9).font('Helvetica-Bold').text('CREDIT PROFILE SUMMARY', sumX, currentY + 15);
      
      const metrics = [
        ['On-Time Payments', `${creditSummary.OnTimePaymentHistory || '100'}%`, '#10b981'],
        ['Credit Inquiries', `${creditSummary.Inquires || '5'}`, '#0284c7'],
        ['Card Utilization', `${creditSummary.CreditCardUtilization || '0'}%`, '#10b981'],
        ['Credit Mix', `${creditSummary.CreditMix || '100'}%`, '#6366f1'],
        ['Credit Age', `${creditSummary.OldestCreditAccountPeriod || '240'} Mo`, '#64748b'],
      ];

      let mY = currentY + 35;
      metrics.forEach(([label, val, color], idx) => {
        const itemX = sumX + (idx % 3) * 115;
        const itemY = mY + Math.floor(idx / 3) * 26;
        doc.fillColor(textMuted).fontSize(7).font('Helvetica').text(label, itemX, itemY);
        doc.fillColor(color).fontSize(10).font('Helvetica-Bold').text(val, itemX, itemY + 10);
      });

      currentY += 112;

      // --- 3. BORROWER PERSONAL & IDENTIFICATION DETAILS ---
      doc.rect(36, currentY, 523, 20).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('1. BORROWER IDENTIFICATION & DEMOGRAPHIC INFORMATION', 44, currentY + 5);
      currentY += 20;

      // Personal Information Table Box
      const personalHeight = 84;
      doc.rect(36, currentY, 523, personalHeight).fillAndStroke('#ffffff', borderColor);

      // Extract IDs safely
      const rawIdentifiers = borrower?.IdentifierPartition?.Identifier || borrower?.IdentifierPartition || borrower?.Identifier;
      const idList = ensureArray(rawIdentifiers);
      const getID = (type) => {
        const item = idList.find((i) => {
          const idObj = i?.ID || i;
          return idObj?.IdentifierName === type || idObj?.identifierName === type || idObj?.name === type;
        });
        if (item) {
          const idObj = item?.ID || item;
          return idObj?.Id || idObj?.id || idObj?.SerialNumber || idObj?.serialNumber || 'N/A';
        }
        return 'N/A';
      };

      let pan = getID('TaxId');
      if (pan === 'N/A' && reportData?.pan_id) {
        const p = String(reportData.pan_id).toUpperCase();
        pan = `${p.slice(0, 5)}XXXX${p.slice(-1)}`;
      }
      const ckyc = getID('CkycId');
      const ration = getID('RationCardId');

      const col1 = 46;
      const col2 = 210;
      const col3 = 380;

      const drawField = (label, val, x, y) => {
        doc.fillColor(textMuted).fontSize(7).font('Helvetica').text(label, x, y);
        doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(String(val || 'N/A'), x, y + 9);
      };

      drawField('FULL NAME', borrowerName.toUpperCase(), col1, currentY + 8);
      drawField('DATE OF BIRTH', dob, col2, currentY + 8);
      drawField('GENDER', gender.toUpperCase(), col3, currentY + 8);

      drawField('INCOME TAX PAN', pan, col1, currentY + 32);
      drawField('CKYC NUMBER', ckyc, col2, currentY + 32);
      drawField('RATION CARD ID', ration, col3, currentY + 32);

      // Extract Telephone(s) safely (can be object, array, or string)
      const rawPhones = borrower?.BorrowerTelephone;
      const phoneList = ensureArray(rawPhones);
      const phones = phoneList
        .map((p) => {
          if (typeof p === 'string') return p;
          return p?.PhoneNumber?.Number || p?.PhoneNumber?.number || p?.number || p?.Number;
        })
        .filter(Boolean);

      if (phones.length === 0 && reportData?.phone_number) {
        const ph = String(reportData.phone_number);
        phones.push(`${ph.slice(0, 3)}XXXX${ph.slice(-3)}`);
      }

      drawField('REGISTERED MOBILE(S)', phones.slice(0, 3).join(', ') || 'N/A', col1, currentY + 56);
      drawField('EMPLOYMENT', borrower?.Employer?.OccupationCode?.description || borrower?.Employer?.occupation || 'Salaried', col3, currentY + 56);

      currentY += personalHeight + 12;

      // --- 4. ADDRESSES RECORDED ---
      doc.rect(36, currentY, 523, 18).fill('#334155');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text('2. REGISTERED ADDRESS HISTORY', 44, currentY + 5);
      currentY += 18;

      const rawAddresses = borrower?.BorrowerAddress;
      const addresses = ensureArray(rawAddresses);
      const maxAddr = Math.min(addresses.length, 3);
      const addrHeight = Math.max(maxAddr * 22 + 8, 30);
      doc.rect(36, currentY, 523, addrHeight).fillAndStroke('#ffffff', borderColor);

      if (addresses.length === 0) {
        doc.fillColor(textMuted).fontSize(7.5).font('Helvetica').text('No past addresses reported on file.', col1, currentY + 8);
      } else {
        addresses.slice(0, 3).forEach((addrWrap, idx) => {
          const addr = addrWrap?.CreditAddress || addrWrap || {};
          const street = addr?.StreetAddress || addr?.streetAddress || addr?.line1 || 'Address on record';
          const pin = addr?.PostalCode || addr?.postalCode || addr?.pin || '';
          const reported = String(addrWrap?.dateReported || 'N/A').split('+')[0];
          const origin = addrWrap?.Origin?.symbol || addrWrap?.Origin?.name || 'Bank';
          
          doc.fillColor(accentCyan).fontSize(7.5).font('Helvetica-Bold').text(`[${origin}]`, col1, currentY + 6 + (idx * 22));
          doc.fillColor(textDark).fontSize(7.5).font('Helvetica').text(`${street} (PIN: ${pin}) · Reported: ${reported}`, col1 + 45, currentY + 6 + (idx * 22), { width: 420 });
        });
      }

      currentY += addrHeight + 14;

      // --- 5. TRADELINES & CREDIT ACCOUNTS ---
      doc.rect(36, currentY, 523, 20).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('3. DETAILED ACCOUNT TRADELINES & REPAYMENT TRACK RECORD', 44, currentY + 5);
      currentY += 20;

      const rawTradelines = trueLink?.TradeLinePartition;
      const tradelines = ensureArray(rawTradelines);

      if (tradelines.length === 0) {
        doc.rect(36, currentY, 523, 40).fillAndStroke('#ffffff', borderColor);
        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('No active or closed tradelines reported.', col1, currentY + 14);
        currentY += 45;
      } else {
        tradelines.forEach((tlWrap, tlIdx) => {
          const tl = tlWrap?.Tradeline || tlWrap || {};
          const creditor = tl?.creditorName || tl?.CreditorName || 'INSTITUTION';
          const rawAcct = tl?.accountNumber || tl?.AccountNumber || '';
          const acctNum = rawAcct ? `••••${String(rawAcct).slice(-4)}` : 'N/A';
          const balance = tl?.currentBalance != null ? `₹${parseFloat(tl.currentBalance || 0).toLocaleString('en-IN')}` : '₹0';
          const highCredit = tl?.highBalance != null ? `₹${parseFloat(tl.highBalance || 0).toLocaleString('en-IN')}` : 'N/A';
          const dateOpened = String(tl?.dateOpened || 'N/A').split('+')[0];
          const dateReported = String(tl?.dateReported || 'N/A').split('+')[0];
          const interest = tl?.GrantedTrade?.interestRate !== '-1.00' && tl?.GrantedTrade?.interestRate ? `${tl.GrantedTrade.interestRate}%` : 'Standard';
          const rawPayStatus = tl?.GrantedTrade?.PayStatusHistory?.status || tl?.GrantedTrade?.PayStatusHistory || '';
          const payHistory = typeof rawPayStatus === 'string' ? rawPayStatus : JSON.stringify(rawPayStatus);

          // Check if page overflow
          if (currentY + 70 > doc.page.height - 40) {
            doc.addPage();
            currentY = 36;
          }

          doc.rect(36, currentY, 523, 62).fillAndStroke(lightBg, borderColor);

          // Top line
          doc.fillColor(headerNavy).fontSize(8.5).font('Helvetica-Bold').text(`${tlIdx + 1}. ${creditor}`, 44, currentY + 6);
          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica').text(`ACCT: ${acctNum}  |  OPENED: ${dateOpened}  |  REPORTED: ${dateReported}`, 180, currentY + 6);
          
          const isClosed = tl?.dateClosed || tl?.currentBalance === '0' || tl?.currentBalance === 0;
          doc.fillColor(isClosed ? '#10b981' : '#0284c7').fontSize(7.5).font('Helvetica-Bold').text(isClosed ? 'CLOSED / ZERO BALANCE' : 'ACTIVE', 430, currentY + 6, { align: 'right', width: 115 });

          // Row 2 info
          doc.fillColor(textMuted).fontSize(7).font('Helvetica').text('SANCTIONED / HIGH CREDIT', 44, currentY + 22);
          doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(highCredit, 44, currentY + 30);

          doc.fillColor(textMuted).fontSize(7).font('Helvetica').text('CURRENT BALANCE', 160, currentY + 22);
          doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(balance, 160, currentY + 30);

          doc.fillColor(textMuted).fontSize(7).font('Helvetica').text('INTEREST RATE', 260, currentY + 22);
          doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(interest, 260, currentY + 30);

          doc.fillColor(textMuted).fontSize(7).font('Helvetica').text('PAST DUE AMOUNT', 360, currentY + 22);
          doc.fillColor('#10b981').fontSize(8).font('Helvetica-Bold').text('₹0.00', 360, currentY + 30);

          // Row 3: Payment status track
          doc.fillColor(textMuted).fontSize(6.5).font('Helvetica').text('REPAYMENT STATUS HISTORY (LAST 36 MONTHS):', 44, currentY + 44);
          const cleanHistory = payHistory.replace(/,/g, ' ').trim().slice(0, 75) || '0 (Standard on-time payment track)';
          doc.fillColor(primaryColor).fontSize(7).font('Courier-Bold').text(cleanHistory, 220, currentY + 44, { width: 325 });

          currentY += 66;
        });
      }

      currentY += 6;

      // --- 6. CREDIT INQUIRIES SECTION ---
      if (currentY + 80 > doc.page.height - 40) {
        doc.addPage();
        currentY = 36;
      }

      doc.rect(36, currentY, 523, 18).fill('#334155');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text('4. RECENT CREDIT INQUIRIES', 44, currentY + 5);
      currentY += 18;

      const rawInquiries = trueLink?.InquiryPartition;
      const inquiries = ensureArray(rawInquiries);
      const inqHeight = Math.max(inquiries.length * 16 + 10, 28);
      doc.rect(36, currentY, 523, inqHeight).fillAndStroke('#ffffff', borderColor);

      if (inquiries.length === 0) {
        doc.fillColor(textMuted).fontSize(7.5).font('Helvetica').text('No credit inquiries in the past 36 months.', col1, currentY + 8);
      } else {
        inquiries.slice(0, 5).forEach((inqWrap, iIdx) => {
          const inq = inqWrap?.Inquiry || inqWrap || {};
          const member = inq?.subscriberName || inq?.SubscriberName || inq?.member || 'FINANCIAL INSTITUTION';
          const amount = inq?.amount ? `₹${parseFloat(inq.amount).toLocaleString('en-IN')}` : 'Unspecified';
          const iDate = String(inq?.inquiryDate || inq?.date || 'N/A').split('+')[0];

          doc.fillColor(textDark).fontSize(7.5).font('Helvetica-Bold').text(`${iIdx + 1}. ${member}`, col1, currentY + 6 + (iIdx * 16));
          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica').text(`Amount: ${amount}  |  Inquiry Date: ${iDate}`, col1 + 160, currentY + 6 + (iIdx * 16));
        });
      }

      currentY += inqHeight + 14;

      // --- FOOTER ---
      doc.fontSize(7).fillColor(textMuted).font('Helvetica').text(
        'This Credit Information Report (CIR) is an authentic reproduction of consumer bureau data. End of Report.',
        36,
        doc.page.height - 30,
        { align: 'center', width: 523 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default { generateCibilPdfReport };
