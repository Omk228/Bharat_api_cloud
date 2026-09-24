import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mockData from '../modules/verification/crif/data/mockCreditReport.json' with { type: 'json' };
import { normalizeReportData } from '../modules/verification/crif/normalizer/reportNormalizer.js';
import { renderCreditReportPdf } from '../modules/verification/crif/renderer/crifPdfRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestReport() {
  console.log('📄 [PHASE 1 - REVISED] Initializing CRIF High Mark PROV2 Demo Credit Report Generator...');
  
  const normalizedReport = normalizeReportData({
    ...mockData,
    reportMeta: {
      ...mockData.reportMeta,
      isDemo: true,
    }
  });

  const pdfBuffer = await renderCreditReportPdf(normalizedReport);

  const backendOutputDir = path.join(__dirname, '..', '..', 'output');
  const workspaceOutputDir = path.join(__dirname, '..', '..', '..', 'output');

  [backendOutputDir, workspaceOutputDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const filesToWrite = [
    path.join(backendOutputDir, 'demo-credit-report.pdf'),
    path.join(backendOutputDir, 'demo-credit-report-v2.pdf'),
    path.join(workspaceOutputDir, 'demo-credit-report.pdf'),
    path.join(workspaceOutputDir, 'demo-credit-report-v2.pdf'),
  ];

  filesToWrite.forEach((fp) => fs.writeFileSync(fp, pdfBuffer));

  console.log(`✅ Demo PDF Generated: ${path.join(workspaceOutputDir, 'demo-credit-report-v2.pdf')}`);
}

generateTestReport().catch(console.error);
