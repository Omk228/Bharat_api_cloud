import PDFDocument from 'pdfkit';

/**
 * Mobile Advance Lookup PDF Generation Service
 * Generates executive, overlap-free, multi-page intelligence & alternate network reports.
 */
export class MobileAdvanceLookupPdfService {
  /**
   * Generate PDF Report Buffer for Mobile Advance Lookup
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
            Title: `Mobile Advance Intelligence Report - ${reportData.phone || 'Report'}`,
            Author: 'Enterprise Verification Platform',
            Subject: 'Mobile Intelligence & Multi-Tier Alternate Network Analysis',
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

        const profile = reportData?.data?.unified_profile || reportData?.unified_profile || {};
        const summary = reportData?.summary || {};
        const graph = reportData?.data?.network_graph || reportData?.network_graph || {
          levels: { level_1: [], level_2: [], level_3: [] },
          unique_numbers_count: 1,
          loops_prevented_count: 0,
        };
        const levels = graph.levels || { level_1: [], level_2: [], level_3: [] };

        const rootPhone = reportData.phone || profile.phone || summary.phone || 'N/A';
        const requestId = reportData.request_id || 'N/A';
        const clientRef = reportData.client_ref_num || 'N/A';
        const isSuccess = (reportData.status || 'success').toLowerCase() === 'success';

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

        // Space checker & auto-page break
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
            .text('ADVANCE MOBILE INTELLIGENCE REPORT', margin + 10, currentY + 7);
          doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
            .text(`TARGET: +91 ${rootPhone}  |  REF: ${clientRef}`, margin, currentY + 7, {
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
          .text('ADVANCE MOBILE INTELLIGENCE REPORT', margin + 16, currentY + 12);
        doc.fillColor('#F8FAFC').fontSize(8.5).font('Helvetica-Bold')
          .text('MULTI-TIER SUBSCRIBER & ALTERNATE NETWORK DOSSIER', margin + 16, currentY + 30);
        doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
          .text(`Generated: ${dateStr} IST  |  Multi-Tier Traversal: Depth 1 -> 2 -> 3`, margin + 16, currentY + 46);

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
          .text(`REQ: ${requestId.slice(0, 22)}`, margin + contentWidth - 160, currentY + 38, {
            width: 148,
            align: 'right',
          });
        doc.text(`REF: ${clientRef.slice(0, 22)}`, margin + contentWidth - 160, currentY + 50, {
          width: 148,
          align: 'right',
        });

        currentY += 76;

        // ==========================================
        // 2. EXECUTIVE KPI METRICS BAR
        // ==========================================
        const totalL1 = levels.level_1?.length || 0;
        const totalL2 = levels.level_2?.length || 0;
        const totalL3 = levels.level_3?.length || 0;
        const totalUnique = graph.unique_numbers_count || (1 + totalL1 + totalL2 + totalL3);
        const loopsAvoided = graph.loops_prevented_count || 0;

        const kpiWidth = (contentWidth - 18) / 4;
        const kpiHeight = 44;

        const kpiItems = [
          { label: 'TARGET SUBSCRIBER', val: `+91 ${rootPhone}`, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'UNIQUE CONTACTS', val: `${totalUnique} Discovered`, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'MAX SCAN DEPTH', val: 'Depth 3 Scanned', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
          { label: 'CYCLES PREVENTED', val: `${loopsAvoided} Loops Stopped`, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
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
        // 3. SECTION 1: TARGET SUBSCRIBER (LEVEL 0)
        // ==========================================
        ensureSpace(130);

        doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text('SECTION 1: PRIMARY SUBSCRIBER PROFILE (LEVEL 0 - ROOT)', margin + 10, currentY + 6);
        currentY += 24;

        // Dynamic Profile Content Box
        const startProfileY = currentY;
        const colW = (contentWidth - 24) / 3;

        // Pre-extract address text
        const rawAddr = Array.isArray(profile.addresses) && profile.addresses.length > 0
          ? (typeof profile.addresses[0] === 'string' ? profile.addresses[0] : (profile.addresses[0].first_line_of_address || profile.addresses[0].address || JSON.stringify(profile.addresses[0])))
          : 'No registered address footprint available.';

        // Measure address height cleanly
        doc.fontSize(7.5).font('Helvetica');
        const addrHeight = Math.max(16, doc.heightOfString(rawAddr, { width: contentWidth - 24 }));
        const profileBoxHeight = 12 + 28 + 28 + 14 + addrHeight + 10;

        doc.roundedRect(margin, startProfileY, contentWidth, profileBoxHeight, 4).fill('#F8FAFC');
        doc.roundedRect(margin, startProfileY, contentWidth, profileBoxHeight, 4).lineWidth(0.8).stroke('#CBD5E1');

        let pY = startProfileY + 8;

        // Row 1: Name, Father, PAN
        doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('FULL NAME (VERIFIED):', margin + 10, pY);
        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(profile.name || 'Identity Unknown', margin + 10, pY + 10, { width: colW, ellipsis: true });

        doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('FATHER / RELATION NAME:', margin + 10 + colW + 6, pY);
        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(profile.father_name || 'Not Available', margin + 10 + colW + 6, pY + 10, { width: colW, ellipsis: true });

        doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('PAN CARD NUMBER:', margin + 10 + (colW + 6) * 2, pY);
        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(profile.pan || 'Not Linked', margin + 10 + (colW + 6) * 2, pY + 10, { width: colW });

        // Row 2: DOB/Gender, Email, Telecom
        pY += 28;
        doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('DOB / GENDER:', margin + 10, pY);
        const dobGender = [profile.dob, profile.gender].filter(Boolean).join(' / ') || 'Not Available';
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(dobGender, margin + 10, pY + 10, { width: colW });

        doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('REGISTERED EMAIL:', margin + 10 + colW + 6, pY);
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(profile.email || 'Not Available', margin + 10 + colW + 6, pY + 10, { width: colW, ellipsis: true });

        doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('OPERATOR & CIRCLE:', margin + 10 + (colW + 6) * 2, pY);
        const telecom = [profile.telecom_operator, profile.telecom_circle].filter(Boolean).join(', ') || 'Telecom info available';
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(telecom, margin + 10 + (colW + 6) * 2, pY + 10, { width: colW, ellipsis: true });

        // Row 3: Full Address (Flows smoothly without overlapping)
        pY += 28;
        doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('PRIMARY REGISTERED ADDRESS:', margin + 10, pY);
        pY += 11;
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
          .text(rawAddr, margin + 10, pY, { width: contentWidth - 20, lineBreak: true });

        currentY += profileBoxHeight + 16;

        // ==========================================
        // 4. SECTION 2: MULTI-TIER NETWORK TREE
        // ==========================================
        ensureSpace(45);
        doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text('SECTION 2: RECURSIVE ALTERNATE NETWORK (DEPTH 1 -> 2 -> 3 TREE)', margin + 10, currentY + 6);
        currentY += 26;

        // Render Helper for Individual Node Cards with Dynamic Heights
        const renderNetworkLevel = (levelNumber, title, nodes, badgeBg, badgeTextColor, borderColor, leftStripeColor) => {
          ensureSpace(40);

          // Level Header Banner
          doc.roundedRect(margin, currentY, contentWidth, 18, 3).fill(badgeBg);
          doc.roundedRect(margin, currentY, contentWidth, 18, 3).lineWidth(0.8).stroke(borderColor);
          doc.fillColor(badgeTextColor).fontSize(8).font('Helvetica-Bold')
            .text(`LEVEL ${levelNumber}: ${title} (${nodes?.length || 0} Contacts)`, margin + 10, currentY + 5);
          currentY += 24;

          if (!nodes || nodes.length === 0) {
            ensureSpace(24);
            doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#F8FAFC');
            doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Oblique')
              .text(`No alternate numbers discovered at Level ${levelNumber}.`, margin + 12, currentY + 6);
            currentY += 26;
            return;
          }

          nodes.forEach((node) => {
            const isLoop = Boolean(node.loop_detected || node.is_duplicate);
            const parentPhone = node.parent_phone || rootPhone;

            // Compute dynamic card height based on actual text lengths
            doc.fontSize(7.5).font('Helvetica');
            const addressText = node.address || (node.father_name ? `Father/Relative: ${node.father_name}` : null) || 'No registered location available';
            const addressH = Math.max(12, doc.heightOfString(`Address: ${addressText}`, { width: contentWidth - 26 }));

            let altsPreview = '';
            let altsH = 0;
            if (!isLoop && Array.isArray(node.alternate_numbers) && node.alternate_numbers.length > 0) {
              altsPreview = `Discovered Alternates: ${node.alternate_numbers.map(n => `+91 ${n}`).join(', ')}`;
              altsH = Math.max(12, doc.heightOfString(altsPreview, { width: contentWidth - 26 }));
            }

            // Total dynamic height calculation:
            // Top padding (8) + Row 1 Phone/Name (16) + Row 2 Operator/Lineage (13) + Row 3 Address (addressH + 4) + Row 4 Alts/Notice (altsH or 12) + Bottom padding (8)
            const nodeNoticeH = isLoop ? 12 : (levelNumber === 3 ? 12 : altsH);
            const cardHeight = 8 + 16 + 13 + addressH + 4 + (nodeNoticeH > 0 ? nodeNoticeH + 4 : 0) + 6;

            ensureSpace(cardHeight + 8);

            const cardBg = isLoop ? '#FFFBEB' : '#FFFFFF';
            const cardBorder = isLoop ? '#FDE68A' : '#E2E8F0';
            const stripeColor = isLoop ? '#F59E0B' : leftStripeColor;

            // Background Card
            doc.roundedRect(margin, currentY, contentWidth, cardHeight, 4).fill(cardBg);
            doc.roundedRect(margin, currentY, contentWidth, cardHeight, 4).lineWidth(0.8).stroke(cardBorder);

            // Left colored stripe
            doc.rect(margin, currentY, 4, cardHeight).fill(stripeColor);

            let rowY = currentY + 7;
            const leftX = margin + 12;

            // --- Row 1: Phone Pill, Name, and Status Badge ---
            // Phone Pill Box
            doc.roundedRect(leftX, rowY - 1, 98, 15, 3).fill(isLoop ? '#FEF3C7' : '#F1F5F9');
            doc.roundedRect(leftX, rowY - 1, 98, 15, 3).lineWidth(0.6).stroke(isLoop ? '#F59E0B' : '#CBD5E1');
            doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold')
              .text(`+91 ${node.phone || 'N/A'}`, leftX + 4, rowY + 2, { width: 90, align: 'center' });

            const nodeName = node.caller_name || node.name || 'Identity Unknown';
            doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
              .text(`Name: ${nodeName}`, leftX + 108, rowY + 2, { width: 230, ellipsis: true });

            // Right Badge
            const badgeW = 142;
            const badgeH = 14;
            const badgeX = margin + contentWidth - badgeW - 10;

            if (isLoop) {
              doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).fill('#FEF3C7');
              doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).lineWidth(0.6).stroke('#F59E0B');
              doc.fillColor('#92400E').fontSize(6.5).font('Helvetica-Bold')
                .text('[ LOOP DETECTED - STOPPED ]', badgeX, rowY + 3, { width: badgeW, align: 'center' });
            } else if (levelNumber === 3) {
              doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).fill('#ECFDF5');
              doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).lineWidth(0.6).stroke('#10B981');
              doc.fillColor('#065F46').fontSize(6.5).font('Helvetica-Bold')
                .text('[ LEVEL 3 LIMIT REACHED ]', badgeX, rowY + 3, { width: badgeW, align: 'center' });
            } else {
              const altCount = node.alternate_numbers?.length || 0;
              doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).fill('#EFF6FF');
              doc.roundedRect(badgeX, rowY, badgeW, badgeH, 3).lineWidth(0.6).stroke('#3B82F6');
              doc.fillColor('#1E40AF').fontSize(6.5).font('Helvetica-Bold')
                .text(`[ ${altCount} ALTERNATE(S) DISCOVERED ]`, badgeX, rowY + 3, { width: badgeW, align: 'center' });
            }

            rowY += 17;

            // --- Row 2: Telecom Details & Lineage ---
            const operatorStr = [node.operator, node.circle].filter(Boolean).join(' | ') || 'Telecom active';
            const lineageStr = `Connected Via: +91 ${parentPhone}`;

            doc.fillColor('#64748B').fontSize(7.2).font('Helvetica')
              .text(`Operator / Circle: ${operatorStr}`, leftX, rowY, { width: 220, ellipsis: true });
            doc.fillColor('#475569').fontSize(7.2).font('Helvetica-Bold')
              .text(lineageStr, leftX + 230, rowY, { width: contentWidth - 250, ellipsis: true });

            rowY += 13;

            // --- Row 3: Address (Dynamic Height, Never Overlaps!) ---
            doc.fillColor('#334155').fontSize(7.2).font('Helvetica')
              .text(`Address: ${addressText}`, leftX, rowY, { width: contentWidth - 24, lineBreak: true });

            rowY += addressH + 3;

            // --- Row 4: Alternates or Loop Notice ---
            if (!isLoop && altsPreview) {
              doc.fillColor('#2563EB').fontSize(7).font('Helvetica-Bold')
                .text(altsPreview, leftX, rowY, { width: contentWidth - 24, lineBreak: true });
            } else if (isLoop) {
              doc.fillColor('#B45309').fontSize(7).font('Helvetica-Oblique')
                .text('Loop Rule Applied: Number already visited in prior branches. Sub-query halted.', leftX, rowY, { width: contentWidth - 24 });
            } else if (levelNumber === 3) {
              doc.fillColor('#059669').fontSize(7).font('Helvetica-Oblique')
                .text('Depth Limit Rule Applied: Depth 3 achieved. No further child exploration performed.', leftX, rowY, { width: contentWidth - 24 });
            }

            currentY += cardHeight + 6;
          });

          currentY += 6;
        };

        // Render Level 1
        renderNetworkLevel(
          1,
          'DIRECT ALTERNATES (Discovered from Root Target)',
          levels.level_1,
          '#EFF6FF',
          '#1D4ED8',
          '#93C5FD',
          '#2563EB'
        );

        // Render Level 2
        renderNetworkLevel(
          2,
          'SECONDARY ALTERNATES (Discovered from Level 1 Nodes)',
          levels.level_2,
          '#FAF5FF',
          '#6B21A8',
          '#D8B4FE',
          '#7C3AED'
        );

        // Render Level 3
        renderNetworkLevel(
          3,
          'TERTIARY CONNECTIONS (Leaf Nodes - Depth Limit 3)',
          levels.level_3,
          '#ECFDF5',
          '#047857',
          '#A7F3D0',
          '#059669'
        );

        // ==========================================
        // 5. SECTION 3: RECONCILIATION SUMMARY
        // ==========================================
        ensureSpace(70);
        doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text('SECTION 3: NETWORK RECONCILIATION & EXECUTION METRICS', margin + 10, currentY + 6);
        currentY += 24;

        const tableY = currentY;
        const tableH = 46;
        doc.roundedRect(margin, tableY, contentWidth, tableH, 4).fill('#F8FAFC');
        doc.roundedRect(margin, tableY, contentWidth, tableH, 4).lineWidth(0.8).stroke('#CBD5E1');

        const metrics = [
          { label: 'Level 1 Contacts', value: totalL1 },
          { label: 'Level 2 Contacts', value: totalL2 },
          { label: 'Level 3 Contacts', value: totalL3 },
          { label: 'Total Unique Contacts', value: totalUnique },
          { label: 'Circular Loops Stopped', value: loopsAvoided },
        ];

        const metricW = (contentWidth - 16) / metrics.length;
        metrics.forEach((m, idx) => {
          const mX = margin + 8 + idx * metricW;
          doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold')
            .text(m.label, mX, tableY + 9, { width: metricW - 4, align: 'center' });
          doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold')
            .text(String(m.value), mX, tableY + 23, { width: metricW - 4, align: 'center' });
        });

        currentY += tableH + 16;

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

export default MobileAdvanceLookupPdfService;
