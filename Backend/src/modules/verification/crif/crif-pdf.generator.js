import { normalizeReportData } from './normalizer/reportNormalizer.js';
import { renderCreditReportPdf } from './renderer/crifPdfRenderer.js';

/**
 * Main CRIF High Mark Report PDF Generator entry point
 * 
 * Flow:
 * rawData / API response / Mock JSON -> normalizeReportData() -> renderCreditReportPdf() -> PDF Buffer
 */
export async function generateCrifReportPdf(rawData = {}) {
  const normalized = normalizeReportData(rawData);
  return await renderCreditReportPdf(normalized);
}

export default { generateCrifReportPdf };
