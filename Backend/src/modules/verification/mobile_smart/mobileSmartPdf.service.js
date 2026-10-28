import PDFDocument from 'pdfkit';

/**
 * Mobile Smart PDF Generation Service
 * Generates an executive, white-labeled intelligence report combining:
 * 1. CIBIL Active Loans count & details
 * 2. CIBIL Closed Loans count & details
 * 3. All Phone Numbers discovered from CIBIL along with their Mobile Intelligence Alternate Numbers
 */
export class MobileSmartPdfService {
  /**
   * Generate PDF Report Buffer for Mobile Smart
   * @param {Object} reportData
   * @returns {Promise<Buffer>}
   */
  static async generatePdf(reportData = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36,
          bufferPages: true,
          info: {
            Title: `Mobile Smart Intelligence Report - ${reportData.primary_phone || reportData.phone || 'Report'}`,
            Author: 'Enterprise Verification Platform',
            Subject: 'CIBIL Credit Summary & Telecom Alternate Network Analysis',
            Creator: 'Enterprise Verification Platform',
          },
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 36;
        const contentWidth = pageWidth - margin * 2; // 523.28 pt

        const summary = reportData.summary || {};
        const borrower = reportData.data?.borrower || reportData.borrower || {};
        const loansSummary = reportData.data?.loans_summary || reportData.loans_summary || {};
        const activeLoans = loansSummary.active_loans || [];
        const closedLoans = loansSummary.closed_loans || [];
        const cibilContacts = reportData.data?.cibil_contacts || reportData.cibil_contacts || [];

        const targetName = borrower.name || summary.name || 'Verified Subject';
        const rawPan = borrower.pan || summary.pan || '';
        const maskedPan = rawPan.length === 10 ? `${rawPan.slice(0, 5)}XXXX${rawPan.slice(-1)}` : (rawPan || 'N/A');
        const primaryPhone = borrower.primary_phone || summary.primary_phone || reportData.phone || 'N/A';
        const requestId = reportData.request_id || 'N/A';
        const clientRef = reportData.client_ref_num || 'N/A';
        const isSuccess = (reportData.status || 'success').toLowerCase() === 'success';

        let totalAlternates = 0;
        cibilContacts.forEach((c) => {
          totalAlternates += (c.alternate_numbers?.length || 0);
        });

        const dateStr = new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        let currentY = margin;

        // Space checker & auto page-break
        const ensureSpace = (neededHeight) => {
          if (currentY + neededHeight > pageHeight - margin - 35) {
            doc.addPage();
            currentY = margin;
            drawCompactRunningHeader();
          }
        };

        const drawCompactRunningHeader = () => {
          doc.rect(margin, currentY, contentWidth, 22).fill('#0F172A');
          doc.fillColor('#38BDF8').fontSize(8).font('Helvetica-Bold')
            .text('MOBILE SMART INTELLIGENCE REPORT', margin + 10, currentY + 7);
          doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
            .text(`TARGET: +91 ${primaryPhone}  |  REF: ${clientRef}`, margin, currentY + 7, {
              align: 'right',
              width: contentWidth - 10,
            });
          currentY += 28;
        };

        // ==========================================
        // 1. PRIMARY COVER HEADER (Page 1)
        // ==========================================
        doc.rect(margin, currentY, contentWidth, 68).fill('#0B132B');

        // Cyan Left Accent Strip
        doc.rect(margin, currentY, 4, 68).fill('#38BDF8');

        // Report Title & Subtitle
        doc.fillColor('#38BDF8').fontSize(13.5).font('Helvetica-Bold')
          .text('MOBILE SMART INTELLIGENCE REPORT', margin + 16, currentY + 12);
        doc.fillColor('#F8FAFC').fontSize(8.5).font('Helvetica-Bold')
          .text('CIBIL CREDIT PORTFOLIO & TELECOM ALTERNATE NETWORK DOSSIER', margin + 16, currentY + 30);
        doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
          .text(`Target: ${targetName}  |  PAN: ${maskedPan}  |  Generated: ${dateStr} IST`, margin + 16, currentY + 46);

        // Status Badge Box
        const badgeBg = isSuccess ? '#064E3B' : '#7F1D1D';
        const badgeTextColor = isSuccess ? '#34D399' : '#FCA5A5';
        const badgeLabel = isSuccess ? 'VERIFIED RECORD' : 'NO RECORDS';

        const badgeW = 110;
        const badgeH = 20;
        const badgeX = margin + contentWidth - badgeW - 12;
        doc.roundedRect(badgeX, currentY + 12, badgeW, badgeH, 3).fill(badgeBg);
        doc.roundedRect(badgeX, currentY + 12, badgeW, badgeH, 3).lineWidth(0.8).stroke(badgeTextColor);
        doc.fillColor(badgeTextColor).fontSize(8).font('Helvetica-Bold')
          .text(badgeLabel, badgeX, currentY + 17, { width: badgeW, align: 'center' });

        doc.fillColor('#CBD5E1').fontSize(7).font('Helvetica')
          .text(`REQ: ${String(requestId).slice(0, 22)}`, margin + contentWidth - 160, currentY + 38, {
            width: 148,
            align: 'right',
          });
        doc.text(`REF: ${String(clientRef).slice(0, 22)}`, margin + contentWidth - 160, currentY + 50, {
          width: 148,
          align: 'right',
        });

        currentY += 76;

        // ==========================================
        // 2. EXECUTIVE KPI METRICS BAR
        // ==========================================
        const kpiWidth = (contentWidth - 18) / 4;
        const kpiHeight = 44;

        const kpiItems = [
          { label: 'ACTIVE LOANS', val: `${activeLoans.length} Active`, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'CLOSED LOANS', val: `${closedLoans.length} Closed`, color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
          { label: 'CIBIL NUMBERS', val: `${cibilContacts.length} Discovered`, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'ALTERNATE NUMBERS', val: `${totalAlternates} Discovered`, color: '#7C3AED', bg: '#FAF5FF', border: '#DDD6FE' },
        ];

        kpiItems.forEach((kpi, idx) => {
          const kpiX = margin + idx * (kpiWidth + 6);
          doc.roundedRect(kpiX, currentY, kpiWidth, kpiHeight, 4).fill(kpi.bg);
          doc.roundedRect(kpiX, currentY, kpiWidth, kpiHeight, 4).lineWidth(0.8).stroke(kpi.border);

          doc.fillColor('#64748B').fontSize(6.5).font('Helvetica-Bold')
            .text(kpi.label, kpiX + 8, currentY + 8, { width: kpiWidth - 16 });
          doc.fillColor(kpi.color).fontSize(9.5).font('Helvetica-Bold')
            .text(kpi.val, kpiX + 8, currentY + 22, { width: kpiWidth - 16 });
        });

        currentY += 52;

        // ==========================================
        // 3. SECTION 1: CIBIL NUMBERS & ALTERNATES
        // ==========================================
        ensureSpace(70);
        doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text(`SECTION 1: CIBIL PHONE NUMBERS & TELECOM ALTERNATES (${cibilContacts.length} Contacts)`, margin + 10, currentY + 6);
        currentY += 26;

        if (cibilContacts.length === 0) {
          ensureSpace(30);
          doc.roundedRect(margin, currentY, contentWidth, 26, 3).fill('#F8FAFC');
          doc.fillColor('#64748B').fontSize(8).font('Helvetica-Oblique')
            .text('No telephone numbers discovered in CIBIL credit records.', margin + 12, currentY + 8);
          currentY += 32;
        } else {
          cibilContacts.forEach((contact, idx) => {
            const alts = Array.isArray(contact.alternate_numbers) ? contact.alternate_numbers : [];
            const isPrimary = Boolean(contact.is_primary || contact.phone === primaryPhone);
            const contactName = contact.name || targetName || 'Registered Contact';

            // Calculate card height dynamically
            let altsText = '';
            let altsH = 0;
            if (alts.length > 0) {
              altsText = `Discovered Alternates (${alts.length}):  ${alts.map((n) => `+91 ${n}`).join('    |    ')}`;
              doc.fontSize(7.5).font('Helvetica-Bold');
              altsH = Math.max(14, doc.heightOfString(altsText, { width: contentWidth - 28 }));
            } else {
              altsH = 12;
            }

            const cardHeight = 8 + 16 + 4 + altsH + 8;
            ensureSpace(cardHeight + 6);

            // Card background & border
            doc.roundedRect(margin, currentY, contentWidth, cardHeight, 4).fill(isPrimary ? '#F0F9FF' : '#FFFFFF');
            doc.roundedRect(margin, currentY, contentWidth, cardHeight, 4).lineWidth(0.8).stroke(isPrimary ? '#BAE6FD' : '#E2E8F0');

            // Left stripe
            doc.rect(margin, currentY, 4, cardHeight).fill(isPrimary ? '#0284C7' : '#3B82F6');

            let rowY = currentY + 7;
            const leftX = margin + 12;

            // Row 1: Phone pill, Source badge, Caller Name
            doc.roundedRect(leftX, rowY - 1, 98, 15, 3).fill(isPrimary ? '#E0F2FE' : '#F1F5F9');
            doc.roundedRect(leftX, rowY - 1, 98, 15, 3).lineWidth(0.6).stroke(isPrimary ? '#38BDF8' : '#CBD5E1');
            doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold')
              .text(`+91 ${contact.phone || 'N/A'}`, leftX + 4, rowY + 2, { width: 90, align: 'center' });

            // Tag badge
            const tagLabel = isPrimary ? '[ PRIMARY TARGET ]' : '[ CIBIL LINKED ]';
            doc.fillColor(isPrimary ? '#0369A1' : '#475569').fontSize(7.5).font('Helvetica-Bold')
              .text(tagLabel, leftX + 106, rowY + 3);

            // Name
            doc.fillColor('#334155').fontSize(8).font('Helvetica')
              .text(`Telecom Name: ${contactName}`, leftX + 220, rowY + 3, { width: 170, ellipsis: true });

            // Alternates count badge on right
            const badgeW = 120;
            const badgeH = 14;
            const badgeX = margin + contentWidth - badgeW - 10;
            const altColor = alts.length > 0 ? '#15803D' : '#64748B';
            const altBg = alts.length > 0 ? '#DCFCE7' : '#F1F5F9';
            const altBorder = alts.length > 0 ? '#86EFAC' : '#CBD5E1';

            doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).fill(altBg);
            doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).lineWidth(0.6).stroke(altBorder);
            doc.fillColor(altColor).fontSize(6.8).font('Helvetica-Bold')
              .text(alts.length > 0 ? `${alts.length} ALTERNATE(S) FOUND` : 'NO ALTERNATES', badgeX, rowY + 3, {
                width: badgeW,
                align: 'center',
              });

            rowY += 19;

            // Row 2: Alternates Numbers preview
            if (alts.length > 0) {
              doc.fillColor('#1E40AF').fontSize(7.5).font('Helvetica-Bold')
                .text(altsText, leftX, rowY, { width: contentWidth - 28, lineBreak: true });
            } else {
              doc.fillColor('#94A3B8').fontSize(7.2).font('Helvetica-Oblique')
                .text('No alternate mobile numbers discovered for this contact in telecom records.', leftX, rowY);
            }

            currentY += cardHeight + 6;
          });
        }

        currentY += 10;

        // ==========================================
        // 4. SECTION 2: ACTIVE LOANS SUMMARY
        // ==========================================
        ensureSpace(70);
        doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text(`SECTION 2: ACTIVE LOAN ACCOUNTS IN CIBIL (${activeLoans.length} Active)`, margin + 10, currentY + 6);
        currentY += 26;

        if (activeLoans.length === 0) {
          ensureSpace(30);
          doc.roundedRect(margin, currentY, contentWidth, 26, 3).fill('#F8FAFC');
          doc.fillColor('#64748B').fontSize(8).font('Helvetica-Oblique')
            .text('No active loan accounts reported in CIBIL credit profile.', margin + 12, currentY + 8);
          currentY += 32;
        } else {
          // Table Header
          ensureSpace(20);
          doc.roundedRect(margin, currentY, contentWidth, 18, 2).fill('#1E293B');
          doc.fillColor('#94A3B8').fontSize(6.8).font('Helvetica-Bold');

          const col1 = margin + 8;
          const col2 = margin + 150;
          const col3 = margin + 250;
          const col4 = margin + 330;
          const col5 = margin + 410;
          const col6 = margin + 470;

          doc.text('LENDER / INSTITUTION', col1, currentY + 5, { width: 138 });
          doc.text('ACCOUNT TYPE', col2, currentY + 5, { width: 95 });
          doc.text('SANCTIONED', col3, currentY + 5, { width: 75, align: 'right' });
          doc.text('BALANCE', col4, currentY + 5, { width: 75, align: 'right' });
          doc.text('OVERDUE', col5, currentY + 5, { width: 55, align: 'right' });
          doc.text('OPENED', col6, currentY + 5, { width: 45, align: 'center' });
          currentY += 22;

          // Table Rows
          activeLoans.forEach((loan, idx) => {
            ensureSpace(22);
            const isEven = idx % 2 === 0;
            doc.roundedRect(margin, currentY, contentWidth, 20, 2).fill(isEven ? '#FFFFFF' : '#F8FAFC');
            doc.roundedRect(margin, currentY, contentWidth, 20, 2).lineWidth(0.5).stroke('#E2E8F0');

            const lender = loan.member || loan.lender || 'Lender';
            const accType = loan.type || loan.account_type || 'Personal Loan';
            const sanctioned = Number(loan.highCreditAmount || loan.sanctioned_amount || loan.highBalance || 0);
            const balance = Number(loan.currentBalance || loan.balance || 0);
            const overdue = Number(loan.amountOverdue || loan.overdue || 0);
            const opened = loan.dateOpened || loan.opened_date || '-';

            const rowY = currentY + 5;
            doc.fillColor('#0F172A').fontSize(7.2).font('Helvetica-Bold')
              .text(lender, col1, rowY, { width: 138, ellipsis: true });
            doc.fillColor('#475569').fontSize(7).font('Helvetica')
              .text(accType, col2, rowY, { width: 95, ellipsis: true });
            doc.fillColor('#0F172A').fontSize(7).font('Helvetica')
              .text(sanctioned > 0 ? `Rs. ${sanctioned.toLocaleString('en-IN')}` : '-', col3, rowY, { width: 75, align: 'right' });
            doc.fillColor('#0284C7').fontSize(7).font('Helvetica-Bold')
              .text(balance > 0 ? `Rs. ${balance.toLocaleString('en-IN')}` : 'Rs. 0', col4, rowY, { width: 75, align: 'right' });

            const overdueColor = overdue > 0 ? '#DC2626' : '#64748B';
            doc.fillColor(overdueColor).fontSize(7).font(overdue > 0 ? 'Helvetica-Bold' : 'Helvetica')
              .text(overdue > 0 ? `Rs. ${overdue.toLocaleString('en-IN')}` : 'Rs. 0', col5, rowY, { width: 55, align: 'right' });

            doc.fillColor('#64748B').fontSize(7).font('Helvetica')
              .text(opened, col6, rowY, { width: 45, align: 'center' });

            currentY += 23;
          });
        }

        currentY += 10;

        // ==========================================
        // 5. SECTION 3: CLOSED LOANS SUMMARY
        // ==========================================
        ensureSpace(70);
        doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text(`SECTION 3: CLOSED LOAN ACCOUNTS IN CIBIL (${closedLoans.length} Closed)`, margin + 10, currentY + 6);
        currentY += 26;

        if (closedLoans.length === 0) {
          ensureSpace(30);
          doc.roundedRect(margin, currentY, contentWidth, 26, 3).fill('#F8FAFC');
          doc.fillColor('#64748B').fontSize(8).font('Helvetica-Oblique')
            .text('No closed loan accounts reported in CIBIL credit profile.', margin + 12, currentY + 8);
          currentY += 32;
        } else {
          // Table Header
          ensureSpace(20);
          doc.roundedRect(margin, currentY, contentWidth, 18, 2).fill('#334155');
          doc.fillColor('#CBD5E1').fontSize(6.8).font('Helvetica-Bold');

          const col1 = margin + 8;
          const col2 = margin + 180;
          const col3 = margin + 310;
          const col4 = margin + 420;

          doc.text('LENDER / INSTITUTION', col1, currentY + 5, { width: 165 });
          doc.text('ACCOUNT TYPE', col2, currentY + 5, { width: 125 });
          doc.text('SANCTIONED / HIGH CREDIT', col3, currentY + 5, { width: 100, align: 'right' });
          doc.text('CLOSED DATE', col4, currentY + 5, { width: 95, align: 'center' });
          currentY += 22;

          // Table Rows
          closedLoans.forEach((loan, idx) => {
            ensureSpace(22);
            const isEven = idx % 2 === 0;
            doc.roundedRect(margin, currentY, contentWidth, 20, 2).fill(isEven ? '#FFFFFF' : '#F8FAFC');
            doc.roundedRect(margin, currentY, contentWidth, 20, 2).lineWidth(0.5).stroke('#E2E8F0');

            const lender = loan.member || loan.lender || 'Lender';
            const accType = loan.type || loan.account_type || 'Loan';
            const sanctioned = Number(loan.highCreditAmount || loan.sanctioned_amount || loan.highBalance || 0);
            const closedDate = loan.dateClosed || loan.closed_date || 'Closed';

            const rowY = currentY + 5;
            doc.fillColor('#0F172A').fontSize(7.2).font('Helvetica-Bold')
              .text(lender, col1, rowY, { width: 165, ellipsis: true });
            doc.fillColor('#475569').fontSize(7).font('Helvetica')
              .text(accType, col2, rowY, { width: 125, ellipsis: true });
            doc.fillColor('#0F172A').fontSize(7).font('Helvetica')
              .text(sanctioned > 0 ? `Rs. ${sanctioned.toLocaleString('en-IN')}` : '-', col3, rowY, { width: 100, align: 'right' });
            doc.fillColor('#059669').fontSize(7).font('Helvetica-Bold')
              .text(closedDate, col4, rowY, { width: 95, align: 'center' });

            currentY += 23;
          });
        }

        // ==========================================
        // 6. RUNNING FOOTER ON EVERY PAGE
        // ==========================================
        const pageRange = doc.bufferedPageRange();
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i);

          const footerY = pageHeight - margin + 6;
          doc.rect(margin, footerY - 12, contentWidth, 0.6).fill('#CBD5E1');

          doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
            .text('Confidential Enterprise Intelligence  |  Authorized Verification Only', margin, footerY);

          doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold')
            .text(`Page ${i + 1} of ${pageRange.count}`, margin, footerY, { align: 'right', width: contentWidth });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default MobileSmartPdfService;
