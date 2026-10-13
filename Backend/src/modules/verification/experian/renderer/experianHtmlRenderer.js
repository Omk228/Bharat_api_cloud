/**
 * Production-Grade White-labeled Experian Credit Report HTML/PDF Renderer
 * 100% Bharat API Cloud Branding — Zero Upstream Dependencies
 */

export function renderExperianReportHtml(reportData, reference = '') {
  const profile = reportData?.INProfileResponse || reportData?.result_json?.INProfileResponse || reportData?.data || reportData || {};
  
  // 1. Header Information
  const header = profile.Header || {};
  const creditProfileHeader = profile.CreditProfileHeader || {};
  const reportNumber = creditProfileHeader.ReportNumber || reference || 'N/A';
  const reportDateRaw = creditProfileHeader.ReportDate || header.ReportDate || '';
  const reportTimeRaw = creditProfileHeader.ReportTime || header.ReportTime || '';
  const reportVersion = creditProfileHeader.Version || 'V2.4';
  const subscriberName = creditProfileHeader.Subscriber_Name || 'BUREAU DISCLOSURE REPORT WITH CUSTOMIZED MATCH';

  // Format Dates
  const formatBureauDate = (dStr) => {
    if (!dStr || dStr.length < 8) return dStr || '—';
    const y = dStr.slice(0, 4);
    const m = dStr.slice(4, 6);
    const d = dStr.slice(6, 8);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mName = monthNames[parseInt(m, 10) - 1] || m;
    return `${d} ${mName} ${y}`;
  };

  const formatBureauTime = (tStr) => {
    if (!tStr || tStr.length < 6) return tStr || '';
    return `${tStr.slice(0, 2)}:${tStr.slice(2, 4)}:${tStr.slice(4, 6)}`;
  };

  const reportDateFormatted = formatBureauDate(reportDateRaw);
  const reportTimeFormatted = formatBureauTime(reportTimeRaw);

  // 2. Score Details
  const scoreObj = profile.SCORE || {};
  const rawScore = parseInt(scoreObj.BureauScore, 10);
  const hasValidScore = !isNaN(rawScore) && rawScore > 0;
  const score = hasValidScore ? rawScore : (rawScore === 0 || scoreObj.BureauScore === '0' ? 'N/A' : (scoreObj.BureauScore || 'N/A'));
  
  // Score interpretation
  let scoreStatus = 'No History / Insufficient Credit';
  let scoreColor = '#64748b'; // slate
  let scoreBg = 'rgba(100, 116, 139, 0.1)';
  let scorePercent = 0;

  if (hasValidScore) {
    scorePercent = Math.min(100, Math.max(0, ((rawScore - 300) / 600) * 100));
    if (rawScore >= 750) {
      scoreStatus = 'Excellent Credit Health';
      scoreColor = '#10b981'; // emerald
      scoreBg = 'rgba(16, 185, 129, 0.1)';
    } else if (rawScore >= 700) {
      scoreStatus = 'Good Credit Standing';
      scoreColor = '#0284c7'; // sky
      scoreBg = 'rgba(2, 132, 199, 0.1)';
    } else if (rawScore >= 650) {
      scoreStatus = 'Fair / Moderate Risk';
      scoreColor = '#f59e0b'; // amber
      scoreBg = 'rgba(245, 158, 11, 0.1)';
    } else {
      scoreStatus = 'Poor / High Credit Risk';
      scoreColor = '#ef4444'; // rose
      scoreBg = 'rgba(239, 68, 68, 0.1)';
    }
  }

  // 3. Current Applicant Information
  const currentApp = profile.Current_Application?.Current_Application_Details || {};
  const applicantDetails = currentApp.Current_Applicant_Details || {};
  const caisHolderFirst = Array.isArray(profile.CAIS_Account?.CAIS_Account_DETAILS) 
    ? profile.CAIS_Account?.CAIS_Account_DETAILS[0]?.CAIS_Holder_Details?.[0]
    : profile.CAIS_Account?.CAIS_Account_DETAILS?.CAIS_Holder_Details?.[0];

  const firstName = applicantDetails.First_Name || caisHolderFirst?.First_Name_Non_Normalized || '';
  const lastName = applicantDetails.Last_Name || caisHolderFirst?.Surname_Non_Normalized || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || caisHolderFirst?.Surname_Non_Normalized || 'N/A';
  const pan = applicantDetails.IncomeTaxPan || caisHolderFirst?.Income_TAX_PAN || 'N/A';
  const mobile = applicantDetails.MobilePhoneNumber || 'N/A';
  const dobRaw = applicantDetails.Date_Of_Birth_Applicant || caisHolderFirst?.Date_of_birth || '';
  const dobFormatted = formatBureauDate(dobRaw);
  const genderCode = applicantDetails.Gender_Code || caisHolderFirst?.Gender_Code;
  const gender = genderCode === '1' ? 'Male' : (genderCode === '2' ? 'Female' : 'N/A');

  // Aggregated addresses & phones from CAIS accounts if applicant details are empty
  const rawAddressList = currentApp.Current_Applicant_Address_Details || [];
  const addressList = [];
  if (Array.isArray(rawAddressList)) {
    rawAddressList.forEach(addr => {
      const parts = [addr.FlatNoPlotNoHouseNo, addr.BldgNoSocietyName, addr.RoadNoNameAreaLocality, addr.City, addr.State, addr.PINCode].filter(Boolean);
      if (parts.length > 0) addressList.push(parts.join(', '));
    });
  }

  // 4. CAIS Summary & Details
  const caisSummary = profile.CAIS_Account?.CAIS_Summary || {};
  const creditAccountSummary = caisSummary.Credit_Account || {};
  const totalBalanceSummary = caisSummary.Total_Outstanding_Balance || {};

  const totalAccounts = creditAccountSummary.CreditAccountTotal || '0';
  const activeAccounts = creditAccountSummary.CreditAccountActive || '0';
  const closedAccounts = creditAccountSummary.CreditAccountClosed || '0';
  const defaultAccounts = creditAccountSummary.CreditAccountDefault || '0';

  const formatCurrency = (val) => {
    if (!val || isNaN(Number(val))) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN');
  };

  const totalOutstanding = formatCurrency(totalBalanceSummary.Outstanding_Balance_All);
  const securedBalance = formatCurrency(totalBalanceSummary.Outstanding_Balance_Secured);
  const unsecuredBalance = formatCurrency(totalBalanceSummary.Outstanding_Balance_UnSecured);
  const unsecuredPct = totalBalanceSummary.Outstanding_Balance_UnSecured_Percentage ? `${totalBalanceSummary.Outstanding_Balance_UnSecured_Percentage}%` : '0%';

  // 5. CAIS Account Details
  let rawAccounts = profile.CAIS_Account?.CAIS_Account_DETAILS || [];
  if (!Array.isArray(rawAccounts) && rawAccounts && typeof rawAccounts === 'object') {
    rawAccounts = [rawAccounts];
  }

  // Helper mapping for Account Types
  const getAccountTypeName = (code) => {
    const types = {
      '01': 'Auto Loan',
      '02': 'Housing / Home Loan',
      '03': 'Property Loan / LAP',
      '04': 'Loan Against Shares',
      '05': 'Personal Loan',
      '06': 'Consumer Durable Loan',
      '07': 'Gold Loan',
      '08': 'Education Loan',
      '09': 'Loan to Professional',
      '10': 'Credit Card',
      '11': 'Lease',
      '12': 'Overdraft / Cash Credit',
      '13': 'Two-Wheeler Loan',
      '14': 'Commercial Vehicle Loan',
      '15': 'Commercial Equipment Loan',
      '16': 'Construction Equipment Loan',
      '17': 'Tractor Loan',
      '18': 'Corporate Credit Card',
      '19': 'Kisan Credit Card',
      '31': 'Secured Business Loan',
      '32': 'Unsecured Business Loan',
      '51': 'Microfinance Business',
      '52': 'Microfinance Personal',
      '53': 'Microfinance Housing',
      '00': 'Other Facility',
    };
    return types[code] || `Credit Facility (${code || 'Standard'})`;
  };

  // 6. CAPS Enquiries
  const capsSummary = profile.CAPS?.CAPS_Summary || profile.TotalCAPS_Summary || {};
  let capsList = profile.CAPS?.CAPS_Application_Details || profile.CAPS?.CAPS_Details || [];
  if (!Array.isArray(capsList) && capsList && typeof capsList === 'object') {
    capsList = [capsList];
  }

  // Pre-process CAIS accounts list
  const processedAccounts = rawAccounts.map((acc, index) => {
    const isClosed = Boolean(acc.Date_Closed && acc.Date_Closed.trim() !== '');
    const isDefault = Number(acc.Amount_Past_Due || 0) > 0 || acc.Account_Status === '78' || Boolean(acc.SuitFiledWillfulDefaultWrittenOffStatus);
    const statusLabel = isClosed ? 'Closed' : (isDefault ? 'Overdue' : 'Active');
    const statusClass = isClosed ? 'status-closed' : (isDefault ? 'status-overdue' : 'status-active');
    
    const bankName = acc.Subscriber_Name || 'Financial Institution';
    const accNumber = acc.Account_Number || `AC-${index + 1}`;
    const accType = getAccountTypeName(acc.Account_Type);
    const openDate = formatBureauDate(acc.Open_Date);
    const closedDate = formatBureauDate(acc.Date_Closed);
    const reportedDate = formatBureauDate(acc.Date_Reported);
    const sanctionAmount = formatCurrency(acc.Highest_Credit_or_Original_Loan_Amount || acc.Credit_Limit_Amount);
    const currentBal = formatCurrency(acc.Current_Balance);
    const pastDue = formatCurrency(acc.Amount_Past_Due);
    const interestRate = acc.Rate_of_Interest ? `${acc.Rate_of_Interest}%` : '—';
    const tenure = acc.Repayment_Tenure ? `${acc.Repayment_Tenure} Months` : '—';

    // Payment History Array
    let history = acc.CAIS_Account_History || [];
    if (!Array.isArray(history) && history && typeof history === 'object') {
      history = [history];
    }

    return {
      index: index + 1,
      bankName,
      accNumber,
      accType,
      statusLabel,
      statusClass,
      openDate,
      closedDate,
      reportedDate,
      sanctionAmount,
      currentBal,
      pastDue,
      interestRate,
      tenure,
      isClosed,
      isDefault,
      history,
    };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Experian Credit Report — ${fullName} — Bharat API Cloud</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --card-hover: #172237;
      --text-main: #f3f4f6;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #0284c7;
      --primary-light: #38bdf8;
      --accent: #6366f1;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 80px;
    }

    /* Top Sticky Action Toolbar */
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%);
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
      color: #ffffff;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .brand-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 9999px;
    }

    .btn-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #0369a1, #1d4ed8);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background: #334155;
      color: #ffffff;
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 28px auto;
      padding: 0 20px;
    }

    /* Official Bureau Header */
    .bureau-header-card {
      background: linear-gradient(180deg, #131d31 0%, #0f172a 100%);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }

    .bureau-header-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #0284c7, #6366f1, #10b981);
    }

    .bureau-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-dim);
      letter-spacing: 0.05em;
    }

    .meta-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-mono);
      margin-top: 2px;
    }

    /* Top Grid: Score & Demographics */
    .top-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    @media (max-width: 900px) {
      .top-grid { grid-template-columns: 1fr; }
    }

    .score-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
    }

    .score-circle-wrapper {
      position: relative;
      width: 190px;
      height: 190px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .score-svg {
      transform: rotate(-90deg);
      width: 190px;
      height: 190px;
    }

    .score-circle-bg {
      fill: none;
      stroke: #1e293b;
      stroke-width: 12;
    }

    .score-circle-progress {
      fill: none;
      stroke: ${scoreColor};
      stroke-width: 12;
      stroke-linecap: round;
      stroke-dasharray: 471;
      stroke-dashoffset: ${471 - (471 * scorePercent) / 100};
      transition: stroke-dashoffset 1s ease-in-out;
    }

    .score-value-box {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .score-num {
      font-size: 44px;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #ffffff;
      line-height: 1;
    }

    .score-max {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-dim);
      margin-top: 4px;
    }

    .score-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      color: ${scoreColor};
      background: ${scoreBg};
      border: 1px solid ${scoreColor}44;
      margin-top: 8px;
    }

    /* Demographics Card */
    .demographics-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .info-box {
      background: #0d131f;
      border: 1px solid #1a2333;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .info-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-dim);
      letter-spacing: 0.04em;
    }

    .info-val {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      margin-top: 2px;
      word-break: break-word;
    }

    /* Summary Metrics Bar */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .metric-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .metric-blue { background: rgba(2, 132, 199, 0.15); color: #38bdf8; }
    .metric-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .metric-slate { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }
    .metric-red { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    .metric-data {
      display: flex;
      flex-direction: column;
    }

    .metric-num {
      font-size: 20px;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #ffffff;
      line-height: 1.2;
    }

    .metric-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Section Card */
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--card-border);
    }

    /* Filter Tabs */
    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #0b0f19;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #1e293b;
    }

    .tab-btn {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn.active {
      background: #1e293b;
      color: #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    /* Account List Items */
    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .account-item {
      background: #0c121e;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px 20px;
      transition: border-color 0.2s;
    }

    .account-item:hover {
      border-color: #334155;
    }

    .acc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }

    .acc-bank {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
    }

    .acc-badges {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .status-active { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-closed { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
    .status-overdue { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .type-badge { background: rgba(2, 132, 199, 0.15); color: #38bdf8; border: 1px solid rgba(2, 132, 199, 0.3); }

    .acc-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      background: #111827;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #1e293b;
    }

    .acc-field-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-dim);
    }

    .acc-field-val {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-mono);
      margin-top: 1px;
    }

    /* Payment History Grid */
    .history-container {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #1e293b;
    }

    .history-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .history-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .dpd-chip {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 10px;
      min-width: 48px;
    }

    .dpd-std { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; }
    .dpd-late { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; }
    .dpd-def { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }

    .dpd-date { font-size: 9px; opacity: 0.8; font-weight: 500; }
    .dpd-val { font-size: 11px; font-weight: 800; }

    /* Tables */
    .data-table-wrapper {
      width: 100%;
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .data-table th {
      background: #0f172a;
      padding: 10px 14px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-dim);
      border-bottom: 1px solid var(--card-border);
    }

    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #1a2333;
      color: var(--text-main);
    }

    .data-table tr:last-child td {
      border-bottom: none;
    }

    /* Footer Disclaimer */
    .bureau-disclaimer {
      background: #0c101a;
      border: 1px solid #1a2233;
      border-radius: 12px;
      padding: 20px;
      font-size: 11px;
      color: var(--text-dim);
      line-height: 1.6;
      text-align: center;
      margin-top: 32px;
    }

    /* PRINT STYLESHEET */
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        padding-bottom: 0 !important;
      }

      .action-bar, .filter-tabs, .btn-group {
        display: none !important;
      }

      .container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .bureau-header-card, .score-card, .demographics-card, .section-card, .metric-card, .account-item, .info-box, .acc-details-grid {
        background: #ffffff !important;
        border: 1px solid #d1d5db !important;
        color: #000000 !important;
        box-shadow: none !important;
        page-break-inside: avoid !important;
      }

      .score-circle-bg { stroke: #e5e7eb !important; }
      .score-num, .card-title, .brand-title, .meta-val, .info-val, .acc-bank, .metric-num {
        color: #000000 !important;
      }

      .meta-label, .info-label, .acc-field-label, .metric-label, .bureau-disclaimer {
        color: #4b5563 !important;
      }

      .badge, .score-status-badge {
        border: 1px solid #9ca3af !important;
        color: #000000 !important;
        background: transparent !important;
      }

      .data-table th {
        background: #f3f4f6 !important;
        color: #000000 !important;
        border-bottom: 2px solid #9ca3af !important;
      }

      .data-table td {
        border-bottom: 1px solid #e5e7eb !important;
        color: #000000 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Top Fixed Action Bar -->
  <header class="action-bar">
    <div class="brand-group">
      <div class="brand-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
      <div>
        <div class="brand-title">
          Bharat API Cloud
          <span class="brand-badge">Official Bureau Report</span>
        </div>
      </div>
    </div>
    
    <div class="btn-group">
      <button class="btn btn-secondary" onclick="copyReportRef('${reference}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        Copy Ref
      </button>
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print / Save PDF
      </button>
    </div>
  </header>

  <main class="container">
    
    <!-- Bureau Header Card -->
    <div class="bureau-header-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Experian Credit Information Report</h1>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Verified & Generated via Bharat API Cloud Bureau Gateway</p>
        </div>
        <div style="text-align: right;">
          <span class="badge status-active" style="padding: 5px 12px; font-size: 12px;">
            ● Active Bureau Verification
          </span>
        </div>
      </div>

      <div class="bureau-meta-grid">
        <div class="meta-item">
          <span class="meta-label">Report Number</span>
          <span class="meta-val">${reportNumber}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Report Date & Time</span>
          <span class="meta-val">${reportDateFormatted} ${reportTimeFormatted}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Bureau Engine</span>
          <span class="meta-val">Experian ${reportVersion}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Subscriber Reference</span>
          <span class="meta-val" title="${subscriberName}">${subscriberName.slice(0, 24)}...</span>
        </div>
      </div>
    </div>

    <!-- Top Grid: Score & Demographics -->
    <div class="top-grid">
      
      <!-- Score Radial Card -->
      <div class="score-card">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.05em;">
          Experian Credit Score
        </div>
        
        <div class="score-circle-wrapper">
          <svg class="score-svg" viewBox="0 0 170 170">
            <circle class="score-circle-bg" cx="85" cy="85" r="75"></circle>
            <circle class="score-circle-progress" cx="85" cy="85" r="75"></circle>
          </svg>
          <div class="score-value-box">
            <span class="score-num">${score}</span>
            <span class="score-max">OUT OF 900</span>
          </div>
        </div>

        <div class="score-status-badge">
          <span>●</span> ${scoreStatus}
        </div>

        <div style="display: flex; justify-content: space-between; width: 100%; margin-top: 20px; font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
          <span>300 (Poor)</span>
          <span>650 (Fair)</span>
          <span>750 (Good)</span>
          <span>900 (Max)</span>
        </div>
      </div>

      <!-- Demographics Card -->
      <div class="demographics-card">
        <div>
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Applicant Demographics
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Full Name</div>
              <div class="info-val" style="color: #38bdf8; text-transform: uppercase;">${fullName}</div>
            </div>
            <div class="info-box">
              <div class="info-label">PAN Number</div>
              <div class="info-val font-mono" style="color: #34d399;">${pan}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Mobile Number</div>
              <div class="info-val font-mono">${mobile}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Date of Birth</div>
              <div class="info-val">${dobFormatted || '—'}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Gender</div>
              <div class="info-val">${gender}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Primary Address</div>
              <div class="info-val" style="font-size: 12px;">${addressList[0] || 'Registered with Lending Institutions'}</div>
            </div>
          </div>
        </div>

        <div style="font-size: 11px; color: var(--text-dim); margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
          Identity authenticated via Permanent Account Number (PAN) & Mobile KYC records.
        </div>
      </div>

    </div>

    <!-- Summary Metrics -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon metric-blue">📊</div>
        <div class="metric-data">
          <span class="metric-num">${totalAccounts}</span>
          <span class="metric-label">Total Credit Facilities</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon metric-green">✅</div>
        <div class="metric-data">
          <span class="metric-num">${activeAccounts}</span>
          <span class="metric-label">Active Accounts</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon metric-slate">📁</div>
        <div class="metric-data">
          <span class="metric-num">${closedAccounts}</span>
          <span class="metric-label">Closed Accounts</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon ${Number(defaultAccounts) > 0 ? 'metric-red' : 'metric-green'}">⚠️</div>
        <div class="metric-data">
          <span class="metric-num">${defaultAccounts}</span>
          <span class="metric-label">Defaults / Overdue</span>
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon metric-blue">💳</div>
        <div class="metric-data">
          <span class="metric-num">${totalOutstanding}</span>
          <span class="metric-label">Total Outstanding Balance</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon metric-green">🔒</div>
        <div class="metric-data">
          <span class="metric-num">${securedBalance}</span>
          <span class="metric-label">Secured Portfolio</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon metric-slate">🔓</div>
        <div class="metric-data">
          <span class="metric-num">${unsecuredBalance} (${unsecuredPct})</span>
          <span class="metric-label">Unsecured Portfolio</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon metric-blue">🔍</div>
        <div class="metric-data">
          <span class="metric-num">${capsSummary.CAPSLast30Days || capsSummary.TotalCAPSLast30Days || '0'} / ${capsSummary.CAPSLast180Days || capsSummary.TotalCAPSLast180Days || '0'}</span>
          <span class="metric-label">Enquiries (30d / 180d)</span>
        </div>
      </div>
    </div>

    <!-- CAIS Credit Accounts Breakdown -->
    <div class="section-card">
      <div class="section-header">
        <div>
          <h2 style="font-size: 16px; font-weight: 700; color: #ffffff;">Credit Accounts & Trade Lines (${processedAccounts.length})</h2>
          <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">Comprehensive repayment history reported by member institutions</p>
        </div>
        
        <div class="filter-tabs">
          <button class="tab-btn active" onclick="filterAccounts('all', this)">All (${processedAccounts.length})</button>
          <button class="tab-btn" onclick="filterAccounts('active', this)">Active (${activeAccounts})</button>
          <button class="tab-btn" onclick="filterAccounts('closed', this)">Closed (${closedAccounts})</button>
          <button class="tab-btn" onclick="filterAccounts('overdue', this)">Overdue (${defaultAccounts})</button>
        </div>
      </div>

      <div class="accounts-list" id="accountsContainer">
        ${processedAccounts.length === 0 ? `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-dim);">
            No credit account records reported under this profile.
          </div>
        ` : processedAccounts.map(acc => `
          <div class="account-item" data-status="${acc.isClosed ? 'closed' : (acc.isDefault ? 'overdue' : 'active')}">
            <div class="acc-header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-dim);">#${acc.index}</span>
                <span class="acc-bank">${acc.bankName}</span>
              </div>
              <div class="acc-badges">
                <span class="badge type-badge">${acc.accType}</span>
                <span class="badge ${acc.statusClass}">${acc.statusLabel}</span>
              </div>
            </div>

            <div class="acc-details-grid">
              <div>
                <div class="acc-field-label">Account No</div>
                <div class="acc-field-val">${acc.accNumber}</div>
              </div>
              <div>
                <div class="acc-field-label">Sanctioned / Limit</div>
                <div class="acc-field-val" style="color: #38bdf8;">${acc.sanctionAmount}</div>
              </div>
              <div>
                <div class="acc-field-label">Current Balance</div>
                <div class="acc-field-val" style="color: #ffffff;">${acc.currentBal}</div>
              </div>
              <div>
                <div class="acc-field-label">Amount Past Due</div>
                <div class="acc-field-val" style="color: ${acc.isDefault ? '#f87171' : '#34d399'};">${acc.pastDue}</div>
              </div>
              <div>
                <div class="acc-field-label">Open Date</div>
                <div class="acc-field-val">${acc.openDate}</div>
              </div>
              <div>
                <div class="acc-field-label">Reported / Closed</div>
                <div class="acc-field-val">${acc.closedDate !== '—' ? acc.closedDate : acc.reportedDate}</div>
              </div>
              <div>
                <div class="acc-field-label">Interest Rate</div>
                <div class="acc-field-val">${acc.interestRate}</div>
              </div>
              <div>
                <div class="acc-field-label">Tenure</div>
                <div class="acc-field-val">${acc.tenure}</div>
              </div>
            </div>

            ${acc.history.length > 0 ? `
              <div class="history-container">
                <div class="history-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Payment History & DPD Breakdown
                </div>
                <div class="history-chips">
                  ${acc.history.slice(0, 12).map(h => {
                    const dpd = h.Days_Past_Due || '0';
                    const isLate = Number(dpd) > 0 && Number(dpd) <= 30;
                    const isDef = Number(dpd) > 30;
                    const chipClass = isDef ? 'dpd-def' : (isLate ? 'dpd-late' : 'dpd-std');
                    const dpdText = dpd === '0' || dpd === '000' ? 'STD' : `${dpd} DPD`;
                    return `
                      <div class="dpd-chip ${chipClass}" title="Month: ${h.Month}/${h.Year} | Days Past Due: ${dpd}">
                        <span class="dpd-date">${h.Month}/${String(h.Year).slice(2)}</span>
                        <span class="dpd-val">${dpdText}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- CAPS Credit Inquiries -->
    ${capsList.length > 0 ? `
      <div class="section-card">
        <div class="section-header">
          <div>
            <h2 style="font-size: 16px; font-weight: 700; color: #ffffff;">Credit Enquiries (CAPS History)</h2>
            <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">Inquiries initiated by financial institutions for loan or credit applications</p>
          </div>
          <span class="badge type-badge">${capsList.length} Total Enquiries</span>
        </div>

        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Enquiry Date</th>
                <th>Financial Institution / Bank</th>
                <th>Purpose / Reason</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${capsList.map((c, i) => `
                <tr>
                  <td style="font-family: var(--font-mono); color: var(--text-dim);">${i + 1}</td>
                  <td style="font-family: var(--font-mono); font-weight: 600;">${formatBureauDate(c.Date_of_Request || c.Enquiry_Date)}</td>
                  <td style="font-weight: 700; color: #ffffff;">${c.Subscriber_Name || 'Financial Institution'}</td>
                  <td>${getAccountTypeName(c.Finance_Purpose || c.Enquiry_Reason)}</td>
                  <td style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">${formatCurrency(c.Amount_Financed)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <!-- Official Bureau Footer Disclaimer -->
    <div class="bureau-disclaimer">
      <strong>OFFICIAL BUREAU DISCLOSURE & CONFIDENTIALITY NOTICE:</strong><br>
      This credit report has been verified and securely retrieved through the <strong>Bharat API Cloud</strong> Bureau Integration Gateway in full compliance with the Credit Information Companies (Regulation) Act (CICRA) and RBI regulatory frameworks.
      The credit score and credit profile information contained herein are proprietary to Experian India and Bharat API Cloud enterprise customers.<br>
      For developer documentation, API webhooks, and sandbox testing, visit <strong>https://bharatapi.cloud</strong>.
    </div>

  </main>

  <script>
    function filterAccounts(status, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const items = document.querySelectorAll('.account-item');
      items.forEach(item => {
        if (status === 'all' || item.getAttribute('data-status') === status) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }

    function copyReportRef(ref) {
      if (!ref) return;
      navigator.clipboard.writeText(ref).then(() => {
        alert('Report Reference copied to clipboard: ' + ref);
      }).catch(() => {});
    }
  </script>
</body>
</html>`;
}

export function renderExperianErrorHtml(errorMessage = 'Report not available or expired', reference = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Experian Credit Report Unavailable — Bharat API Cloud</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --text-main: #f3f4f6;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #0284c7;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font-sans);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .error-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 36px 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    h1 {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .ref-box {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px;
      font-size: 12px;
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="error-card">
    <div class="icon-box">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <h1>Report Unavailable or Expired</h1>
    <p>${errorMessage}</p>
    ${reference ? `<div class="ref-box">Reference: ${reference}</div>` : ''}
    <button class="btn" onclick="window.history.back()">Go Back</button>
  </div>
</body>
</html>`;
}

