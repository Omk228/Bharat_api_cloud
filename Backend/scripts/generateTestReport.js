import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mockData from '../src/modules/verification/crif/data/mockCreditReport.json' with { type: 'json' };
import { normalizeReportData } from '../src/modules/verification/crif/normalizer/reportNormalizer.js';
import { renderCreditReportPdf } from '../src/modules/verification/crif/renderer/crifPdfRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestReport() {
  console.log('📄 [PHASE 1 - REVISED] Initializing CRIF High Mark PROV2 Demo Credit Report Generator...');
  
  // 1. Normalize mock JSON data through data normalizer
  console.log('🔄 Normalizing 39-account synthetic mock dataset...');
  const normalizedReport = normalizeReportData({
    ...mockData,
    reportMeta: {
      ...mockData.reportMeta,
      isDemo: true,
    }
  });

  // 2. Render PDF using pixel-accurate modular renderer with official logo asset
  console.log('🎨 Rendering dynamic PDF with official CRIF logo, repeated account headers & 12-page natural pagination...');
  const pdfBuffer = await renderCreditReportPdf(normalizedReport);

  // 3. Define output directories
  const backendOutputDir = path.join(__dirname, '..', 'output');
  const workspaceOutputDir = path.join(__dirname, '..', '..', 'output');

  [backendOutputDir, workspaceOutputDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Write demo-credit-report-v3.pdf, demo-credit-report-v2.pdf and demo-credit-report.pdf
  const filesToWrite = [
    path.join(backendOutputDir, 'demo-credit-report.pdf'),
    path.join(backendOutputDir, 'demo-credit-report-v2.pdf'),
    path.join(backendOutputDir, 'demo-credit-report-v3.pdf'),
    path.join(workspaceOutputDir, 'demo-credit-report.pdf'),
    path.join(workspaceOutputDir, 'demo-credit-report-v2.pdf'),
    path.join(workspaceOutputDir, 'demo-credit-report-v3.pdf'),
  ];

  filesToWrite.forEach((fp) => fs.writeFileSync(fp, pdfBuffer));

  console.log(`\n======================================================`);
  console.log(`✅ SUCCESS! Demo Credit Report PDF Generated!`);
  console.log(`📁 File Saved: ${path.join(workspaceOutputDir, 'demo-credit-report-v3.pdf')}`);
  console.log(`📁 File Saved: ${path.join(workspaceOutputDir, 'demo-credit-report-v2.pdf')}`);
  console.log(`📁 File Saved: ${path.join(workspaceOutputDir, 'demo-credit-report.pdf')}`);
  console.log(`📊 Total Bytes: ${pdfBuffer.length}`);
  console.log(`======================================================\n`);
}

generateTestReport().catch((err) => {
  console.error('❌ Error generating test report:', err);
  process.exit(1);
});
