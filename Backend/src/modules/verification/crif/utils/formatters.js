/**
 * Centralized Formatting & Sanitization Utilities for Credit Report PDF
 */

export function cleanText(val) {
  if (val === undefined || val === null || val === '' || val === '-1') return '—';
  return String(val).replace(/₹/g, 'Rs. ').replace(/[^\x20-\x7E\t\n\r]/g, '').trim() || '—';
}

export function formatDate(val) {
  if (!val || val === '—' || val === '-' || val === '-1' || val === 'N/A') return '—';
  const clean = String(val).split('T')[0].split('+')[0].trim();
  if (clean.includes('-')) {
    const p = clean.split('-');
    if (p.length === 3) {
      if (p[0].length === 4) return `${p[2].padStart(2, '0')}-${p[1].padStart(2, '0')}-${p[0]}`;
      return `${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}-${p[2]}`;
    }
  }
  return clean || '—';
}

export function formatCurrency(val) {
  if (val === undefined || val === null || val === '' || val === '—' || val === '-') return '0';
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

export function formatPhone(phone) {
  const clean = String(phone || '').replace(/\D/g, '');
  if (!clean) return '—';
  if (clean.length === 10) return clean;
  if (clean.length > 10) return clean.slice(-10);
  return clean;
}

export function maskIdentifier(id, keepChars = 4) {
  if (!id || id === '—') return '—';
  const str = String(id).trim();
  if (str.length <= keepChars) return str;
  return 'X'.repeat(str.length - keepChars) + str.slice(-keepChars);
}

export function ensureArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export default {
  cleanText,
  formatDate,
  formatCurrency,
  formatPhone,
  maskIdentifier,
  ensureArray,
};
