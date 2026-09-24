/**
 * Centralized Theme Palette for CRIF Credit Information Report PROV2
 * Matched with pixel-accurate fidelity to official reference document.
 */
export const REPORT_THEME = {
  // Brand & Header Colors
  primaryNavy: [10 / 255, 54 / 255, 98 / 255],         // #0A3662 (Reference Navy Blue)
  cyanAccent: [0 / 255, 163 / 255, 224 / 255],         // #00A3E0 (Logo Swoosh & Accents)
  
  // Table & Background Colors
  tableHeaderBg: [232 / 255, 237 / 255, 248 / 255],    // #E8EDF8 (Reference Light Blue Table Headers)
  tableAltBg: [239 / 255, 244 / 255, 252 / 255],       // #EFF4FC (Reference Subtle Alternating Rows)
  metaStripBg: [232 / 255, 237 / 255, 248 / 255],      // #E8EDF8 (Account Meta Ribbon)
  borderGrey: [197 / 255, 211 / 255, 234 / 255],       // #C5D3EA (Reference Light Blue-Grey Borders)
  bgWhite: [1, 1, 1],                                  // White
  cardBorder: [197 / 255, 211 / 255, 234 / 255],

  // Text Colors
  textBlack: [26 / 255, 26 / 255, 26 / 255],           // #1A1A1A (Reference Charcoal Text)
  textMuted: [100 / 255, 116 / 255, 139 / 255],        // #64748B (Muted Tips, Footers, Subtitles)
  textWhite: [1, 1, 1],                                 // #FFFFFF (Header Banner Text)

  // Status Badges & Flags
  closedRed: [224 / 255, 36 / 255, 36 / 255],          // #E02424 (Closed Text & XXX Delinquent)
  closedBg: [252 / 255, 232 / 255, 232 / 255],         // #FCE8E8 (Closed Ribbon Background)
  closedBorder: [247 / 255, 163 / 255, 163 / 255],
  activeGreen: [3 / 255, 84 / 255, 63 / 255],          // #03543F (Active Text)
  activeBg: [226 / 255, 246 / 255, 234 / 255],         // #E2F6EA (Active Ribbon Background)
  activeBorder: [132 / 255, 225 / 255, 188 / 255],

  // Demo Watermark & Banner
  demoRed: [220 / 255, 38 / 255, 38 / 255],            // #DC2626
  demoBannerBg: [254 / 255, 242 / 255, 242 / 255],     // #FEF2F2
  watermarkColor: [200 / 255, 200 / 255, 200 / 255],   // Subtle watermark text
};

export const REPORT_DIMENSIONS = {
  PAGE_WIDTH: 595.28,    // A4 Width in Points
  PAGE_HEIGHT: 841.89,   // A4 Height in Points
  MARGIN_X: 30.0,        // 30pt Left/Right Margins (Matches Reference)
  CONTENT_WIDTH: 535.28, // Usable Width (595.28 - 60)
  PAGE_BOTTOM_LIMIT: 32.0 // Bottom Margin (Matches Reference)
};

export default { REPORT_THEME, REPORT_DIMENSIONS };
