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

---

## 📂 Directory Structure

```
Backend/
├── scripts/
│   └── generateTestReport.js          # CLI script to generate test PDF
├── output/
│   └── demo-credit-report.pdf         # Generated demo PDF output
└── src/modules/verification/crif/
    ├── data/
    │   └── mockCreditReport.json      # Complete synthetic 39-account test dataset
    ├── normalizer/
    │   └── reportNormalizer.js        # Data mapper & normalizer
    ├── renderer/
    │   └── crifPdfRenderer.js         # Pixel-accurate pdf-lib layout engine
    ├── utils/
    │   ├── theme.js                   # Color palette & layout dimensions
    │   └── formatters.js              # Currency, date, string & masking helpers
    └── crif-pdf.generator.js          # Main service entry point
```

---

## 📋 Normalized Data Schema (`NormalizedCreditReport`)

| Section | Type | Description |
|---|---|---|
| `applicant` | `Object` | Name, DOB, Gender, Phone, PAN, Email, Addresses |
| `reportMeta` | `Object` | Reference #, Application ID, Dates, `isDemo` flag |
| `score` | `Object` | Score Type, Range (`300-900`), Value, Scoring Factors |
| `scoreTrend` | `Array` | Dynamic quarterly score trend history (`retroDate`, `score`) |
| `primaryAccountSummary` | `Object` | 12 summary metrics for primary credit accounts |
| `secondaryAccountSummary` | `Object` | 10 summary metrics for secondary credit accounts |
| `groupAccountSummary` | `Object` | Multi-tier MFI & Joint account summary (`Own` / `Other`) |
| `additionalSummary` | `Object` | Grantor count statistics |
| `performAttributes` | `Array` | Key-value credit attributes (inquiries, history length, etc.) |
| `personalInfoVariations` | `Object` | Name, Email, DOB, Phone, ID, and Address variations |
| `employment` | `Object` | Occupation & reporting dates |
| `accounts` | `Array` | Full tradeline list with status (`Closed`/`Active`), details & 12-month payment history matrix |
| `inquiries` | `Array` | Inquiries past 24 months |
| `appendix` | `Array` | Code definitions and glossary |

---

## 🛡️ Security & Privacy Guidelines
1. **Masked Identifiers:** Sensitive identifiers (PAN, Aadhaar, full account numbers) are masked in consumer presentations.
2. **Zero Sensitive Logging:** Never log raw PAN or unmasked PII to standard log sinks.
3. **Internal Test Safeguards:** All non-production reports are rendered with `DEMO / TEST REPORT – NOT AN OFFICIAL CREDIT REPORT` markings.
