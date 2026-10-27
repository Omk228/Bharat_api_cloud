import PDFDocument from 'pdfkit';

/**
 * Mobile Advance Lookup PDF Generation Service
 * Generates high-fidelity, professional multi-page intelligence & alternate network reports.
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
            Author: 'Bharat API Cloud',
            Subject: 'Mobile Intelligence & Multi-Tier Alternate Network Analysis',
            Creator: 'Bharat API Cloud Platform',
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
        const status = (reportData.status || 'success').toUpperCase();
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

        // Helper to check for page break
        const ensureSpace = (neededHeight) => {
          if (currentY + neededHeight > pageHeight - margin - 30) {
            doc.addPage();
            currentY = margin;
            drawCompactHeader();
          }
        };

        const drawCompactHeader = () => {
          doc.rect(margin, currentY, contentWidth, 22).fill('#0B132B');
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
            .text('BHARAT API CLOUD  |  MOBILE ADVANCE REPORT', margin + 10, currentY + 7);
          doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
            .text(`TARGET: ${rootPhone}  |  REF: ${clientRef}`, margin + 280, currentY + 7, { align: 'right', width: contentWidth - 290 });
          currentY += 28;
        };

        // --- 1. FULL HEADER (Page 1) ---
        doc.rect(margin, currentY, contentWidth, 68).fill('#0B132B');
        
        // Brand & Subtitle
        doc.fillColor('#38BDF8').fontSize(14).font('Helvetica-Bold')
          .text('BHARAT API CLOUD', margin + 14, currentY + 12);
        doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
          .text('CONFIDENTIAL INTELLIGENCE & MULTI-TIER NETWORK REPORT', margin + 14, currentY + 30);
        doc.fillColor('#E2E8F0').fontSize(7).font('Helvetica')
          .text(`Generated: ${dateStr} IST  |  Depth Scanned: Level 3 (Stop on Duplicates)`, margin + 14, currentY + 44);

        // Status Badge Box
        const isSuccess = status === 'SUCCESS';
        const badgeColor = isSuccess ? '#10B981' : '#EF4444';
        const badgeText = isSuccess ? 'VERIFIED' : 'NO RECORDS';
        
        doc.roundedRect(margin + contentWidth - 110, currentY + 12, 96, 22, 4)
          .fill(isSuccess ? '#064E3B' : '#7F1D1D');
        doc.fillColor(badgeColor).fontSize(9).font('Helvetica-Bold')
          .text(badgeText, margin + contentWidth - 110, currentY + 17, { width: 96, align: 'center' });

        doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
          .text(`REQ: ${requestId.slice(0, 20)}`, margin + contentWidth - 130, currentY + 40, { width: 120, align: 'right' });
        doc.text(`REF: ${clientRef.slice(0, 20)}`, margin + contentWidth - 130, currentY + 50, { width: 120, align: 'right' });

        currentY += 76;

        // --- 2. SUMMARY KPI METRIC BOXES ---
        const totalL1 = levels.level_1?.length || 0;
        const totalL2 = levels.level_2?.length || 0;
        const totalL3 = levels.level_3?.length || 0;
        const totalUnique = graph.unique_numbers_count || (1 + totalL1 + totalL2 + totalL3);
        const loopsAvoided = graph.loops_prevented_count || 0;

        const kpiWidth = (contentWidth - 18) / 4;
        const kpiHeight = 44;

        const kpiItems = [
          { label: 'TARGET NUMBER', val: rootPhone, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'UNIQUE CONTACTS', val: `${totalUnique} Found`, color: '#059669', bg: '#ECFDF5' },
          { label: 'NETWORK DEPTH', val: 'Depth 3 Scanned', color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'LOOPS STOPPED', val: `${loopsAvoided} Interconnected`, color: '#D97706', bg: '#FFFBEB' },
        ];

        kpiItems.forEach((kpi, idx) => {
          const kpiX = margin + idx * (kpiWidth + 6);
          doc.roundedRect(kpiX, currentY, kpiWidth, kpiHeight, 4).fill(kpi.bg);
          doc.roundedRect(kpiX, currentY, kpiWidth, kpiHeight, 4).lineWidth(0.8).stroke(kpi.color);

          doc.fillColor('#64748B').fontSize(6.5).font('Helvetica-Bold')
            .text(kpi.label, kpiX + 6, currentY + 7, { width: kpiWidth - 12 });
          doc.fillColor(kpi.color).fontSize(9.5).font('Helvetica-Bold')
            .text(kpi.val, kpiX + 6, currentY + 22, { width: kpiWidth - 12 });
        });

        currentY += 52;

        // --- 3. SECTION: PRIMARY TARGET PROFILE (Level 0) ---
        ensureSpace(120);

        doc.roundedRect(margin, currentY, contentWidth, 18, 3).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text('PRIMARY SUBSCRIBER PROFILE (LEVEL 0 - ROOT)', margin + 8, currentY + 5);
        currentY += 22;

        // Profile Container Box
        const profileBoxY = currentY;
        const profileBoxH = 104;
        doc.roundedRect(margin, profileBoxY, contentWidth, profileBoxH, 4).fill('#F8FAFC');
        doc.roundedRect(margin, profileBoxY, contentWidth, profileBoxH, 4).lineWidth(0.6).stroke('#CBD5E1');

        const colW = (contentWidth - 24) / 3;
        
        // Row 1
        let pY = profileBoxY + 8;
        // Col 1
        doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('FULL NAME (VERIFIED):', margin + 8, pY);
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(profile.name || 'Not Available', margin + 8, pY + 10, { width: colW });

        // Col 2
        doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('FATHER / RELATION NAME:', margin + 8 + colW + 8, pY);
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(profile.father_name || 'Not Available', margin + 8 + colW + 8, pY + 10, { width: colW });

        // Col 3
        doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('PAN CARD NUMBER:', margin + 8 + (colW + 8) * 2, pY);
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(profile.pan || 'Not Linked', margin + 8 + (colW + 8) * 2, pY + 10, { width: colW });

        // Row 2
        pY += 28;
        // Col 1
        doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('DOB / GENDER:', margin + 8, pY);
        const dobGender = [profile.dob, profile.gender].filter(Boolean).join(' / ') || 'Not Available';
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(dobGender, margin + 8, pY + 10, { width: colW });

        // Col 2
        doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('EMAIL ADDRESS:', margin + 8 + colW + 8, pY);
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(profile.email || 'Not Available', margin + 8 + colW + 8, pY + 10, { width: colW });

        // Col 3
        doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('TELECOM OPERATOR & CIRCLE:', margin + 8 + (colW + 8) * 2, pY);
        const telecom = [profile.telecom_operator, profile.telecom_circle].filter(Boolean).join(', ') || 'Not Available';
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(telecom, margin + 8 + (colW + 8) * 2, pY + 10, { width: colW });

        // Row 3
        pY += 28;
        doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('PRIMARY REGISTERED ADDRESS:', margin + 8, pY);
        const addressText = Array.isArray(profile.addresses) && profile.addresses.length > 0
          ? (typeof profile.addresses[0] === 'string' ? profile.addresses[0] : (profile.addresses[0].first_line_of_address || profile.addresses[0].address || JSON.stringify(profile.addresses[0])))
          : 'Not Available';
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(addressText, margin + 8, pY + 10, { width: contentWidth - 16, lineBreak: false });

        currentY += profileBoxH + 14;

        // --- 4. SECTION: MULTI-LEVEL ALTERNATE NETWORK TREE (DEPTH 1 TO 3) ---
        ensureSpace(40);
        doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text('RECURSIVE ALTERNATE NETWORK (DEPTH 1 -> 2 -> 3 HIERARCHY)', margin + 8, currentY + 6);
        currentY += 26;

        // Render Helper for Individual Node Cards
        const renderNetworkLevel = (levelNumber, title, nodes, badgeBg, badgeTextColor, borderColor) => {
          ensureSpace(50);

          // Level Header Banner
          doc.roundedRect(margin, currentY, contentWidth, 18, 3).fill(badgeBg);
          doc.roundedRect(margin, currentY, contentWidth, 18, 3).lineWidth(0.6).stroke(borderColor);
          doc.fillColor(badgeTextColor).fontSize(8).font('Helvetica-Bold')
            .text(`LEVEL ${levelNumber}: ${title} (${nodes?.length || 0} Numbers Discovered)`, margin + 8, currentY + 5);
          currentY += 24;

          if (!nodes || nodes.length === 0) {
            ensureSpace(24);
            doc.roundedRect(margin, currentY, contentWidth, 20, 3).fill('#F8FAFC');
            doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Oblique')
              .text(`No alternate numbers found at Level ${levelNumber}.`, margin + 12, currentY + 6);
            currentY += 26;
            return;
          }

          nodes.forEach((node, nodeIdx) => {
            const cardHeight = 60;
            ensureSpace(cardHeight + 8);

            const isLoop = Boolean(node.loop_detected || node.is_duplicate);
            const cardBg = isLoop ? '#FFFBEB' : '#FFFFFF';
            const cardBorder = isLoop ? '#F59E0B' : '#E2E8F0';

            doc.roundedRect(margin, currentY, contentWidth, cardHeight, 4).fill(cardBg);
            doc.roundedRect(margin, currentY, contentWidth, cardHeight, 4).lineWidth(0.6).stroke(cardBorder);

            // Left accent bar
            doc.rect(margin, currentY, 4, cardHeight).fill(isLoop ? '#F59E0B' : badgeTextColor);

            // Row 1: Phone + Name + Status Badge
            const leftColX = margin + 12;
            doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold')
              .text(`📱 ${node.phone || 'N/A'}`, leftColX, currentY + 7);

            const nodeName = node.caller_name || node.name || 'Identity Unknown';
            doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
              .text(`Name: ${nodeName}`, leftColX + 130, currentY + 7, { width: 220, ellipsis: true });

            if (isLoop) {
              doc.roundedRect(margin + contentWidth - 145, currentY + 6, 138, 14, 3).fill('#FEF3C7');
              doc.fillColor('#92400E').fontSize(6.5).font('Helvetica-Bold')
                .text('⚠️ LOOP / ALREADY VISITED', margin + contentWidth - 145, currentY + 9, { width: 138, align: 'center' });
            } else if (levelNumber === 3) {
              doc.roundedRect(margin + contentWidth - 145, currentY + 6, 138, 14, 3).fill('#ECFDF5');
              doc.fillColor('#065F46').fontSize(6.5).font('Helvetica-Bold')
                .text('✅ LEVEL 3 REACHED (STOPPED)', margin + contentWidth - 145, currentY + 9, { width: 138, align: 'center' });
            } else {
              const altCount = node.alternate_numbers?.length || 0;
              doc.roundedRect(margin + contentWidth - 145, currentY + 6, 138, 14, 3).fill('#EFF6FF');
              doc.fillColor('#1E40AF').fontSize(6.5).font('Helvetica-Bold')
                .text(`🔗 ${altCount} Alternates Discovered`, margin + contentWidth - 145, currentY + 9, { width: 138, align: 'center' });
            }

            // Row 2: Telecom Details & Lineage
            const operatorStr = [node.operator, node.circle].filter(Boolean).join(' | ') || 'Telecom info not found';
            const lineageStr = node.parent_phone ? `Linked From: ${node.parent_phone}` : `Directly Linked to: ${rootPhone}`;

            doc.fillColor('#64748B').fontSize(7).font('Helvetica')
              .text(`Operator/Circle: ${operatorStr}`, leftColX, currentY + 23);
            doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold')
              .text(lineageStr, leftColX + 220, currentY + 23);

            // Row 3: Address or Father Name
            const addressSnippet = node.address || (node.father_name ? `Father: ${node.father_name}` : null) || 'No registered location available';
            doc.fillColor('#64748B').fontSize(6.8).font('Helvetica')
              .text(`Address: ${addressSnippet}`, leftColX, currentY + 36, { width: contentWidth - 24, ellipsis: true });

            // Row 4: Discovered Alternate Numbers List
            if (!isLoop && Array.isArray(node.alternate_numbers) && node.alternate_numbers.length > 0) {
              const altsPreview = node.alternate_numbers.slice(0, 4).join(', ') + (node.alternate_numbers.length > 4 ? ` (+${node.alternate_numbers.length - 4} more)` : '');
              doc.fillColor('#2563EB').fontSize(6.8).font('Helvetica')
                .text(`Discovered Alternates: ${altsPreview}`, leftColX, currentY + 47, { width: contentWidth - 24, ellipsis: true });
            } else if (isLoop) {
              doc.fillColor('#B45309').fontSize(6.8).font('Helvetica-Oblique')
                .text('Stopped further recursion to prevent duplicate requests and infinite cycles.', leftColX, currentY + 47);
            } else if (levelNumber === 3) {
              doc.fillColor('#059669').fontSize(6.8).font('Helvetica-Oblique')
                .text('Max depth limit 3 achieved. No further child exploration performed.', leftColX, currentY + 47);
            }

            currentY += cardHeight + 6;
          });

          currentY += 8;
        };

        // Render Level 1
        renderNetworkLevel(
          1,
          'DIRECT ALTERNATES (Discovered from Root)',
          levels.level_1,
          '#EFF6FF',
          '#1D4ED8',
          '#93C5FD'
        );

        // Render Level 2
        renderNetworkLevel(
          2,
          'SECONDARY ALTERNATES (Discovered from Level 1)',
          levels.level_2,
          '#FAF5FF',
          '#6B21A8',
          '#D8B4FE'
        );

        // Render Level 3
        renderNetworkLevel(
          3,
          'TERTIARY CONNECTIONS (Discovered from Level 2 - Depth Limit 3)',
          levels.level_3,
          '#ECFDF5',
          '#047857',
          '#A7F3D0'
        );

        // --- 5. NETWORK RECONCILIATION SUMMARY TABLE ---
        ensureSpace(70);
        doc.roundedRect(margin, currentY, contentWidth, 18, 3).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
          .text('NETWORK RECONCILIATION & EXECUTION METRICS', margin + 8, currentY + 5);
        currentY += 22;

        const tableY = currentY;
        const tableH = 46;
        doc.roundedRect(margin, tableY, contentWidth, tableH, 4).fill('#F8FAFC');
        doc.roundedRect(margin, tableY, contentWidth, tableH, 4).lineWidth(0.6).stroke('#CBD5E1');

        const metrics = [
          { label: 'Level 1 Contacts', value: totalL1 },
          { label: 'Level 2 Contacts', value: totalL2 },
          { label: 'Level 3 Contacts', value: totalL3 },
          { label: 'Total Unique Discovered', value: totalUnique },
          { label: 'Circular Loops Stopped', value: loopsAvoided },
        ];

        const metricW = (contentWidth - 16) / metrics.length;
        metrics.forEach((m, idx) => {
          const mX = margin + 8 + idx * metricW;
          doc.fillColor('#64748B').fontSize(6.5).font('Helvetica-Bold')
            .text(m.label, mX, tableY + 8, { width: metricW - 4, align: 'center' });
          doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold')
            .text(String(m.value), mX, tableY + 22, { width: metricW - 4, align: 'center' });
        });

        currentY += tableH + 16;

        // --- 6. FOOTER APPLIED TO ALL BUFFERED PAGES ---
        const pageRange = doc.bufferedPageRange();
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i);

          const footerY = pageHeight - margin + 6;
          doc.rect(margin, footerY - 14, contentWidth, 0.5).fill('#CBD5E1');

          doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
            .text('Bharat API Cloud  |  Confidential Advance Mobile Intelligence  |  For Authorized Enterprise Verification Only', margin, footerY);

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
