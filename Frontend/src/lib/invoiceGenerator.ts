/**
 * Bharat API Cloud — Professional Tax Invoice Generator
 * Generates exact B2B Tax Invoices with GST breakdown for client recharges and float credits.
 */

export interface InvoiceTransactionItem {
  id: string;
  amount: number;
  description?: string;
  reference_id?: string;
  utr_number?: string;
  created_at: string;
}

export interface InvoiceClientInfo {
  name: string;
  companyName?: string;
  email: string;
  clientId?: string | number;
  walletId?: string;
  gstin?: string;
}

export interface InvoiceGenerateOptions {
  client: InvoiceClientInfo;
  periodLabel: string; // e.g. "01-Sep-2026 to 30-Sep-2026" or "September 2026"
  billingDate?: string;
  transactions: InvoiceTransactionItem[];
}

function numberToWordsIndian(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(val: number): string {
    let str = "";
    if (val > 19) {
      str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
    } else {
      str += a[val];
    }
    return str;
  }

  let words = "";
  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  const hundred = Math.floor(remainder / 100);
  const tensAndOnes = remainder % 100;

  if (crore > 0) words += inWords(crore) + " Crore ";
  if (lakh > 0) words += inWords(lakh) + " Lakh ";
  if (thousand > 0) words += inWords(thousand) + " Thousand ";
  if (hundred > 0) words += inWords(hundred) + " Hundred ";
  if (tensAndOnes > 0) {
    if (words !== "") words += "and ";
    words += inWords(tensAndOnes);
  }

  return words.trim();
}

export function generateInvoiceHtml(options: InvoiceGenerateOptions): string {
  const { client, periodLabel, billingDate, transactions } = options;

  const totalGross = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const taxableValue = Math.round((totalGross / 1.18) * 100) / 100;
  const totalGst = Math.round((totalGross - taxableValue) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = Math.round((totalGst - cgst) * 100) / 100;

  const words = numberToWordsIndian(totalGross);
  const now = new Date();
  const displayBillingDate = billingDate || now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const invoiceNum = `BAC/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}/FLT-${Math.floor(100 + Math.random() * 900)}`;
  const tokenNum = `BAC-TXN-FLT-${now.getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const clientName = client.companyName || client.name || "Valued Client";
  const clientEmail = client.email || "support@client.com";
  const clientId = client.clientId ? `BAC-U00${client.clientId}` : "BAC-U003";
  const walletId = client.walletId || `WLT-${client.clientId || "03"}-${clientName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

  const tableRowsHtml = transactions.map((t, idx) => {
    const itemGross = Number(t.amount) || 0;
    const itemTaxable = Math.round((itemGross / 1.18) * 100) / 100;
    const itemGst = Math.round((itemGross - itemTaxable) * 100) / 100;

    const dateObj = new Date(t.created_at);
    const dateFormatted = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
      : "Recent";
    const timeFormatted = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) + " IST"
      : "";

    const desc = t.description || "Wallet Recharge / Advance API Credit Float";
    const ref = t.utr_number ? `UTR: ${t.utr_number}` : (t.reference_id ? `Ref: ${t.reference_id}` : `ID: ${t.id}`);

    return `
      <tr>
        <td class="text-center font-mono">${String(idx + 1).padStart(2, "0")}</td>
        <td>
          <div class="font-bold" style="font-size: 11px;">${dateFormatted}</div>
          <div class="font-mono" style="font-size: 9.5px; color: var(--slate-400);">${timeFormatted}</div>
        </td>
        <td>
          <div class="item-title">
            ${desc} <span class="badge-float">Float Credit</span>
          </div>
          <div class="item-meta">${ref} &bull; User ID: ${client.clientId || "3"}</div>
        </td>
        <td class="text-center font-mono">998313</td>
        <td class="text-right font-mono">₹${itemTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-right font-mono" style="color: #ea580c;">₹${itemGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-right font-mono font-bold">₹${itemGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - Bharat API Cloud - ${clientName} (${periodLabel})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-accent: #2563eb;
      --primary-light: #eff6ff;
      --primary-dark: #0f172a;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-300: #cbd5e1;
      --slate-400: #94a3b8;
      --slate-500: #64748b;
      --slate-600: #475569;
      --slate-700: #334155;
      --slate-800: #1e293b;
      --slate-900: #0f172a;
      --success: #15803d;
      --success-bg: #dcfce7;
      --success-border: #86efac;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #0b0f19;
      background-image: 
        radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.15) 0px, transparent 50%);
      color: var(--slate-800);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 30px 15px 60px;
      -webkit-font-smoothing: antialiased;
    }

    .top-action-bar {
      max-width: 860px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 20px;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }

    .top-bar-title {
      color: #f8fafc;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background-color: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 10px #22c55e;
    }

    .btn-group {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      transform: translateY(-1px);
    }

    .invoice-wrapper {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4);
      padding: 44px 48px;
      border: 1px solid var(--slate-200);
      position: relative;
      overflow: hidden;
    }

    .invoice-wrapper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #1e3a8a, #2563eb, #60a5fa, #3b82f6, #1d4ed8);
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--slate-200);
    }

    .brand-section {
      max-width: 460px;
    }

    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }

    .logo-text h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.6px;
      color: var(--slate-900);
      line-height: 1.1;
    }

    .logo-text span {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--primary-accent);
    }

    .company-desc {
      font-size: 12px;
      color: var(--slate-500);
      line-height: 1.5;
      margin-top: 4px;
    }

    .header-meta {
      text-align: right;
    }

    .tax-invoice-pill {
      display: inline-block;
      font-size: 20px;
      font-weight: 800;
      color: var(--primary-dark);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .invoice-subtag {
      font-size: 11px;
      font-weight: 700;
      color: var(--primary-accent);
      background: var(--primary-light);
      padding: 3px 10px;
      border-radius: 6px;
      display: inline-block;
      border: 1px solid #bfdbfe;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .meta-table {
      font-size: 12px;
      color: var(--slate-600);
      margin-left: auto;
    }

    .meta-table td {
      padding: 2.5px 0;
    }

    .meta-table td:first-child {
      padding-right: 14px;
      color: var(--slate-400);
      font-weight: 500;
      text-align: right;
    }

    .meta-table td:last-child {
      font-weight: 700;
      color: var(--slate-900);
      font-family: 'JetBrains Mono', monospace;
      text-align: right;
    }

    .party-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 24px 0;
    }

    .party-card {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 14px;
      padding: 18px 20px;
      position: relative;
    }

    .card-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 700;
      color: var(--slate-400);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .party-name {
      font-size: 16px;
      font-weight: 800;
      color: var(--slate-900);
      margin-bottom: 6px;
    }

    .party-details {
      font-size: 12px;
      color: var(--slate-600);
      line-height: 1.6;
    }

    .party-details strong {
      color: var(--slate-800);
    }

    .client-badge {
      position: absolute;
      top: 16px;
      right: 18px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #e0e7ff;
      color: #3730a3;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .table-section {
      margin: 24px 0 16px 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--slate-200);
    }

    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    table.invoice-table thead {
      background: #f8fafc;
      border-bottom: 1px solid var(--slate-200);
    }

    table.invoice-table th {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--slate-500);
      padding: 10px 12px;
      white-space: nowrap;
    }

    table.invoice-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }

    table.invoice-table tbody tr:last-child {
      border-bottom: none;
    }

    table.invoice-table td {
      padding: 10px 12px;
      font-size: 11.5px;
      color: var(--slate-700);
      vertical-align: middle;
    }

    .item-title {
      font-weight: 600;
      color: var(--slate-900);
      font-size: 11px;
      line-height: 1.4;
      display: block;
      word-break: normal;
    }

    .badge-float {
      font-size: 9.5px;
      font-weight: 700;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 1.5px 5px;
      border-radius: 4px;
      display: inline-block;
      vertical-align: middle;
      margin-left: 5px;
      white-space: nowrap;
    }

    .item-meta {
      font-size: 10px;
      color: var(--slate-400);
      margin-top: 3px;
      font-family: 'JetBrains Mono', monospace;
      line-height: 1.3;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .font-bold { font-weight: 700; }

    /* GST Breakdown Cards Component */
    .gst-breakdown-wrapper {
      margin: 18px 0 22px 0;
      background: #ffffff;
      border: 1px solid var(--slate-200);
      border-radius: 14px;
      padding: 16px 18px;
    }

    .gst-grid-row-1 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 14px;
    }

    .gst-grid-row-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-bottom: 12px;
    }

    .gst-card {
      background: #ffffff;
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .gst-card-head {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gst-icon-box {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gst-icon-orange { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
    .gst-icon-green { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
    .gst-icon-blue { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }
    .gst-icon-slate { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }

    .gst-card-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--slate-600);
    }

    .gst-card-val {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 6px;
      letter-spacing: -0.4px;
    }

    .gst-formula-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 11.5px;
      color: var(--slate-600);
      background: #f8fafc;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .gst-formula-box strong {
      color: var(--slate-900);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      align-items: flex-start;
      margin-top: 12px;
    }

    .words-and-notes {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .amount-words-card {
      background: var(--primary-light);
      border-left: 4px solid var(--primary-accent);
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #1e40af;
      line-height: 1.5;
    }

    .amount-words-card strong {
      color: #1e3a8a;
      display: block;
      margin-bottom: 2px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .disclaimer-box {
      font-size: 11px;
      color: var(--slate-500);
      line-height: 1.5;
      background: #fafafa;
      border: 1px dashed var(--slate-200);
      padding: 12px 14px;
      border-radius: 8px;
    }

    .totals-card {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: 16px 18px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 12.5px;
      color: var(--slate-600);
    }

    .totals-row.grand-total {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px dashed var(--slate-300);
      color: var(--slate-900);
      font-size: 16px;
      font-weight: 800;
    }

    .grand-total .amount {
      color: var(--primary-accent);
      font-size: 20px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
    }

    .status-stamp-bar {
      margin-top: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      color: var(--success);
      padding: 7px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 11.5px;
      letter-spacing: 0.5px;
    }

    .bank-card {
      margin-top: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: 16px 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .bank-header {
      grid-column: span 4;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--primary-accent);
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--slate-200);
    }

    .bank-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .bank-cell .lbl {
      font-size: 10.5px;
      color: var(--slate-400);
      text-transform: uppercase;
      font-weight: 600;
    }

    .bank-cell .val {
      font-size: 12px;
      font-weight: 700;
      color: var(--slate-800);
    }

    .sign-section {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--slate-200);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .qr-and-verification {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .verification-info {
      font-size: 11px;
      color: var(--slate-500);
      line-height: 1.5;
    }

    .verification-info strong {
      color: var(--slate-800);
    }

    .seal-and-signature {
      text-align: right;
    }

    .digital-seal-wrap {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .official-seal {
      width: 76px;
      height: 76px;
      border: 2px dashed #2563eb;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #2563eb;
      transform: rotate(-10deg);
      background: rgba(37, 99, 235, 0.04);
      padding: 6px;
      text-align: center;
      line-height: 1.15;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .top-action-bar {
        display: none !important;
      }
      .invoice-wrapper {
        border: none !important;
        box-shadow: none !important;
        padding: 20px 24px !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      @page {
        size: A4;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>

  <div class="top-action-bar">
    <div class="top-bar-title">
      <div class="live-dot"></div>
      Bharat API Cloud &bull; B2B Tax Invoice (${invoiceNum})
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
        </svg>
        Print / Save as PDF
      </button>
    </div>
  </div>

  <div class="invoice-wrapper">
    <!-- Header -->
    <div class="invoice-header">
      <div class="brand-section">
        <div class="logo-badge">
          <div class="logo-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"></path>
            </svg>
          </div>
          <div class="logo-text">
            <h1>Bharat API Cloud</h1>
            <span>Enterprise FinTech Infrastructure</span>
          </div>
        </div>
        <p class="company-desc">
          Technosys Future Technologies<br>
          Web: <strong>https://bharatapi.cloud</strong>
        </p>
      </div>

      <div class="header-meta">
        <div class="tax-invoice-pill">TAX INVOICE</div><br>
        <div class="invoice-subtag">STATEMENT OF ADVANCE FLOAT</div>
        <table class="meta-table">
          <tr>
            <td>INVOICE NO:</td>
            <td>${invoiceNum}</td>
          </tr>
          <tr>
            <td>BILLING DATE:</td>
            <td>${displayBillingDate.toUpperCase()}</td>
          </tr>
          <tr>
            <td>BILLING PERIOD:</td>
            <td>${periodLabel.toUpperCase()}</td>
          </tr>
          <tr>
            <td>DISBURSAL MODE:</td>
            <td>Advance Float Credit</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Parties Section -->
    <div class="party-container">
      <div class="party-card">
        <div class="card-label">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
          ISSUER / SERVICE PROVIDER
        </div>
        <div class="party-name">Bharat API Cloud</div>
        <div class="party-details">
          <strong>Technosys Future</strong><br>
          FinTech &amp; Cloud Verification API Network<br>
          Operating Office: India<br>
          Support Desk: support@bharatapi.cloud
        </div>
      </div>

      <div class="party-card">
        <span class="client-badge">PROD CLIENT</span>
        <div class="card-label">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          BILLED TO / BENEFICIARY CLIENT
        </div>
        <div class="party-name">${clientName}</div>
        <div class="party-details">
          <strong>${client.companyName ? client.companyName : clientName}</strong><br>
          Primary Billing Email: <strong>${clientEmail}</strong><br>
          Client Account ID: <span class="font-mono font-bold">${clientId}</span><br>
          Wallet Account: <span class="font-mono">${walletId}</span>
        </div>
      </div>
    </div>

    <!-- Itemized Disbursal Table -->
    <div class="table-section">
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 32px;" class="text-center">#</th>
            <th style="width: 110px;">Disbursal Date (IST)</th>
            <th>Description &amp; Audit Reference</th>
            <th style="width: 65px;" class="text-center">SAC</th>
            <th style="width: 90px;" class="text-right">Taxable (₹)</th>
            <th style="width: 85px;" class="text-right">GST 18% (₹)</th>
            <th style="width: 95px;" class="text-right">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml || `<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--slate-400);">No recharge records found for this period.</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- GST Breakdown Cards Component (Exact Match to User Specification) -->
    <div class="gst-breakdown-wrapper">
      <div class="gst-grid-row-1">
        <div class="gst-card">
          <div class="gst-card-head">
            <div class="gst-icon-box gst-icon-orange">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
              </svg>
            </div>
            <span class="gst-card-label">GST Amount</span>
          </div>
          <div class="gst-card-val">₹${totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div class="gst-card">
          <div class="gst-card-head">
            <div class="gst-icon-box gst-icon-green">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 6m-3-6h6m6-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span class="gst-card-label">Amount with GST</span>
          </div>
          <div class="gst-card-val">₹${totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div class="gst-card">
          <div class="gst-card-head">
            <div class="gst-icon-box gst-icon-blue">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <span class="gst-card-label">Taxable Value</span>
          </div>
          <div class="gst-card-val">₹${taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div class="gst-grid-row-2">
        <div class="gst-card">
          <div class="gst-card-head">
            <div class="gst-icon-box gst-icon-slate">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
              </svg>
            </div>
            <span class="gst-card-label">CGST (9.00%)</span>
          </div>
          <div class="gst-card-val">₹${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div class="gst-card">
          <div class="gst-card-head">
            <div class="gst-icon-box gst-icon-slate">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
              </svg>
            </div>
            <span class="gst-card-label">SGST/UTGST (9.00%)</span>
          </div>
          <div class="gst-card-val">₹${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div class="gst-formula-box">
        <strong>Formula:</strong> GST Amount = (Taxable Value &times; GST Rate) / 100
      </div>
    </div>

    <!-- Summary & Totals -->
    <div class="summary-grid">
      <div class="words-and-notes">
        <div class="amount-words-card">
          <strong>Total Disbursed in Words:</strong>
          INR ${words} Only (Inclusive of 18% GST)
        </div>
        <div class="disclaimer-box">
          <strong>Tax Note:</strong> Services categorized under Information Technology Software &amp; Cloud API Services (SAC 998313). GST split equally between CGST (9%) and SGST (9%). Eligible for B2B Input Tax Credit (ITC).
        </div>
      </div>

      <div class="totals-card">
        <div class="totals-row">
          <span>Taxable Value (Base):</span>
          <span class="font-mono font-bold">₹${taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>CGST (9.00%):</span>
          <span class="font-mono font-bold">₹${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>SGST / UTGST (9.00%):</span>
          <span class="font-mono font-bold">₹${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row" style="border-top: 1px solid var(--slate-200); padding-top: 6px; margin-top: 4px;">
          <span>Total GST (18.00%):</span>
          <span class="font-mono font-bold" style="color: #ea580c;">₹${totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row grand-total">
          <span>AMOUNT WITH GST:</span>
          <span class="amount">₹${totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="status-stamp-bar">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          DISBURSED &amp; CREDITED IN FULL
        </div>
      </div>
    </div>

    <!-- Settlement Bank Info -->
    <div class="bank-card">
      <div class="bank-header">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
        </svg>
        Bharat API Cloud &bull; Official Settlement Bank Details
      </div>
      <div class="bank-cell">
        <span class="lbl">Beneficiary Name</span>
        <span class="val">Technosys Future</span>
      </div>
      <div class="bank-cell">
        <span class="lbl">Bank Name</span>
        <span class="val">Indusind Bank</span>
      </div>
      <div class="bank-cell">
        <span class="lbl">Account Number</span>
        <span class="val font-mono">258964362910</span>
      </div>
      <div class="bank-cell">
        <span class="lbl">IFSC Code</span>
        <span class="val font-mono">INDB0001032</span>
      </div>
    </div>

    <!-- Sign and Verification Seal -->
    <div class="sign-section">
      <div class="qr-and-verification">
        <div class="verification-info">
          Digital Token: <strong class="font-mono">${tokenNum}</strong><br>
          Portal: <span class="font-mono">https://bharatapi.cloud</span>
        </div>
      </div>

      <div class="seal-and-signature">
        <div class="digital-seal-wrap">
          <div class="official-seal">
            ★ BHARAT API ★<br>
            DISBURSED<br>
            &amp; AUDITED<br>
            ${periodLabel.slice(0, 9).toUpperCase()}
          </div>
          <div style="text-align: right; font-size: 11.5px; color: var(--slate-500); line-height: 1.5;">
            <strong style="color: var(--slate-800);">Computer-Generated Document</strong><br>
            Electronic Invoice Authorization<br>
            <span style="font-size: 10.5px; color: var(--slate-400);">No physical signature required</span>
          </div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

export function openOrDownloadInvoice(options: InvoiceGenerateOptions) {
  const html = generateInvoiceHtml(options);
  const win = window.open("", "_blank");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    // Fallback direct file download if popup blocked
    const cleanPeriod = options.periodLabel.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const filename = `Bharat_API_Cloud_Invoice_${cleanPeriod}_${Date.now()}.html`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
