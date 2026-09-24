# Production-Quality CRIF High Mark PROV2 Credit Information Report Generator

## 📌 Overview
This module provides a production-grade, pixel-accurate PDF generator for the **CRIF High Mark Credit Information™ Report PROV2**, reproducing the exact visual hierarchy, typography, table geometry, account status ribbons, and repayment calendar matrix from the official bureau format.

For internal development and QA testing, all generated testing PDFs include a prominent **`DEMO / TEST REPORT – NOT AN OFFICIAL CREDIT REPORT`** watermark and banner.

---

## 🏛️ System Architecture

The PDF rendering layer is completely decoupled from data sources using a 3-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│              Data Sources (Mock JSON / API)             │
│  - Internal Test Dataset: data/mockCreditReport.json     │
│  - Live Upstream API: /crif/Credit-ScoreV4 (Future)     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                Data Normalizer / Mapper                 │
│      (src/modules/verification/crif/normalizer)         │
│  - normalizeReportData(input)                           │
│  - Enforces NormalizedCreditReport schema               │
│  - Sanitizes currency, dates, nulls, arrays             │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Normalized Credit Report JSON             │
│  - applicant, reportMeta, score, scoreTrend             │
│  - primaryAccountSummary, secondaryAccountSummary       │
│  - groupAccountSummary, additionalSummary, performAttrs │
│  - personalInfoVariations, employment, accounts         │
│  - inquiries, appendix                                  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   PDF Rendering Engine                  │
│       (src/modules/verification/crif/renderer)          │
│  - renderCreditReportPdf(normalizedReport)              │
│  - Reusable <AccountInformationCard /> component        │
│  - Dynamic column width horizontal trend table          │
│  - Multi-tier group summary table                       │
│  - 12-Month repayment calendar matrix                   │
│  - Intelligent page break & anti-collision manager      │
│  - Demo watermark & running headers/footers             │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Output PDF File                     │
│               output/demo-credit-report.pdf             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Generate the Test Report

### Command:
```bash
# In the Backend directory
npm run generate:test-report

# Or run directly via Node:
node scripts/generateTestReport.js
```

### Output:
- File generated at: **`output/demo-credit-report.pdf`**
