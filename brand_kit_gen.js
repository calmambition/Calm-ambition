'use strict';
/**
 * Calm Ambition Brand Kit PDF Generator
 * Generates a 6-page brand reference PDF using PDFKit
 * Fonts sourced from @fontsource npm packages (WOFF, supported by PDFKit/fontkit)
 */

const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const W = 595.28, H = 841.89;   // A4 in points

// ── Brand palette ──────────────────────────────────────────────────────────────
const C = {
  warm_white:   '#FAF8F4',
  cream:        '#F5F0E8',
  sand:         '#D8E4D4',
  taupe:        '#A8B8A0',
  accent:       '#5C7A5C',
  accent_light: '#B8CEB4',
  dark:         '#1E2820',
  charcoal:     '#2E3D30',
};

// ── Font setup — WOFF files from installed @fontsource packages ─────────────────
const NM = path.join(__dirname, 'node_modules');
const FONTS = {
  'CG-Light':    path.join(NM, '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-latin-300-normal.woff'),
  'CG-Regular':  path.join(NM, '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-latin-400-normal.woff'),
  'CG-SemiBold': path.join(NM, '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-latin-600-normal.woff'),
  'Jost-Light':  path.join(NM, '@fontsource', 'jost', 'files', 'jost-latin-300-normal.woff'),
  'Jost-Regular':path.join(NM, '@fontsource', 'jost', 'files', 'jost-latin-400-normal.woff'),
  'Jost-Medium': path.join(NM, '@fontsource', 'jost', 'files', 'jost-latin-500-normal.woff'),
};

function fp(name) { return FONTS[name]; }

// ── Drawing helpers ────────────────────────────────────────────────────────────
// All y = 0 at top, increases downward (PDFKit native)

function bg(doc, color) {
  doc.save().rect(0, 0, W, H).fill(color).restore();
}

function drawLine(doc, x1, y1, x2, y2, color, lw = 1) {
  doc.save()
    .moveTo(x1, y1).lineTo(x2, y2)
    .strokeColor(color).lineWidth(lw).stroke()
    .restore();
}

function fillRect(doc, x, y, w, h, fill, strokeCol = null, lw = 0.5) {
  doc.save().rect(x, y, w, h);
  if (strokeCol) {
    doc.fillColor(fill).fillAndStroke(fill, strokeCol).lineWidth(lw);
  } else {
    doc.fill(fill);
  }
  doc.restore();
}

function fillRoundRect(doc, x, y, w, h, r, fill, strokeCol = null, lw = 0.5) {
  doc.save().roundedRect(x, y, w, h, r);
  if (strokeCol) {
    doc.lineWidth(lw).fillAndStroke(fill, strokeCol);
  } else {
    doc.fill(fill);
  }
  doc.restore();
}

function txt(doc, str, x, y, font, size, color, opts = {}) {
  doc.save()
    .font(font).fontSize(size).fillColor(color)
    .text(str, x, y, { lineBreak: false, ...opts })
    .restore();
}

function centredTxt(doc, str, y, font, size, color) {
  doc.save()
    .font(font).fontSize(size).fillColor(color)
    .text(str, 0, y, { align: 'center', width: W, lineBreak: false })
    .restore();
}

function rightTxt(doc, str, y, font, size, color, rightEdge = W - 60) {
  doc.save()
    .font(font).fontSize(size).fillColor(color)
    .text(str, 60, y, { align: 'right', width: rightEdge - 60, lineBreak: false })
    .restore();
}

function dot(doc, x, y, color = C.accent, r = 2) {
  doc.save().circle(x, y, r).fill(color).restore();
}

function topRule(doc) { drawLine(doc, 60, 60, W - 60, 60, C.accent, 1); }

function sectionLabel(doc, label, x = 60, y = 88) {
  txt(doc, label.toUpperCase(), x, y, fp('Jost-Regular'), 7, C.taupe);
}

function pageTitle(doc, title, y = 118) {
  txt(doc, title, 60, y, fp('CG-SemiBold'), 34, C.dark);
  drawLine(doc, 60, y + 42, 100, y + 42, C.accent, 0.5);
}

function footer(doc, n) {
  drawLine(doc, 60, H - 44, W - 60, H - 44, C.sand, 0.5);
  txt(doc, 'Calm Ambition — Brand Kit 2026', 60, H - 32, fp('Jost-Light'), 7, C.taupe);
  rightTxt(doc, String(n), H - 32, fp('Jost-Light'), 7, C.taupe);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('Checking brand fonts...');
  Object.entries(FONTS).forEach(([name, fpath]) => {
    if (!fs.existsSync(fpath)) throw new Error(`Font file missing: ${fpath}`);
    console.log(`  ✓ ${name}`);
  });

  const OUTPUT = path.join(os.homedir(), 'OneDrive', 'Desktop', 'Calm-Ambition-Brand-Kit.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  doc.pipe(fs.createWriteStream(OUTPUT));
  doc.info.Title   = 'Calm Ambition — Brand Kit';
  doc.info.Author  = 'Calm Ambition';
  doc.info.Subject = 'Brand Guidelines 2026';

  Object.entries(FONTS).forEach(([n, fpath]) => doc.registerFont(n, fpath));

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 1 — COVER
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  bg(doc, C.dark);
  topRule(doc);

  centredTxt(doc, 'Calm Ambition', H/2 - 66, 'CG-Light', 56, C.cream);
  drawLine(doc, W/2 - 90, H/2 - 16, W/2 + 90, H/2 - 16, C.accent, 0.5);
  centredTxt(doc, 'B R A N D   K I T',    H/2 - 2,  'Jost-Light', 10, C.taupe);
  centredTxt(doc, 'Coaching for high performers',  H/2 + 28, 'CG-Light', 20, C.sand);
  centredTxt(doc, 'who want to sustain what they build.', H/2 + 52, 'CG-Light', 20, C.sand);

  drawLine(doc, 60, H - 72, W - 60, H - 72, C.charcoal, 0.5);
  txt(doc, 'calmambition.com', 60, H - 58, fp('Jost-Light'), 8, C.taupe);
  rightTxt(doc, '2026', H - 58, fp('Jost-Light'), 8, C.taupe);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 2 — COLOUR PALETTE
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  bg(doc, C.warm_white);
  topRule(doc);
  sectionLabel(doc, 'Brand Foundation');
  pageTitle(doc, 'Colour Palette');

  // [brand name, fill, hex, usage, CSS var]
  const palette = [
    ['Dark Forest',  C.dark,         '#1E2820', 'Backgrounds, dark UI',      '--dark'],
    ['Charcoal',     C.charcoal,     '#2E3D30', 'Dark cards, secondary panels', '--charcoal'],
    ['Warm White',   C.warm_white,   '#FAF8F4', 'Main page background',       '--warm-white'],
    ['Cream',        C.cream,        '#F5F0E8', 'Card fills, section panels', '--cream'],
    ['Sand',         C.sand,         '#D8E4D4', 'Borders, dividers',          '--sand'],
    ['Sage',         C.accent,       '#5C7A5C', 'Primary accent, CTAs',       '--accent'],
    ['Sage Light',   C.accent_light, '#B8CEB4', 'Hover states',               '--accent-light'],
    ['Stone',        C.taupe,        '#A8B8A0', 'Secondary text, meta',       '--stone'],
  ];

  const SW = 115, SH = 76, SGAP = 12, sx0 = 60, sy0 = 182;
  const lightKeys = new Set([C.warm_white, C.cream, C.sand, C.accent_light]);

  palette.forEach(([name, fill, hex, usage, cssVar], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = sx0 + col * (SW + SGAP);
    const y = sy0 + row * (SH + 66);
    const isLight = lightKeys.has(fill);

    fillRoundRect(doc, x, y, SW, SH, 3, fill, isLight ? C.sand : null);
    txt(doc, name,   x, y + SH + 8,  fp('Jost-Medium'), 8.5, C.dark);
    txt(doc, hex,    x, y + SH + 20, fp('Jost-Light'),  8,   C.accent);
    txt(doc, cssVar, x, y + SH + 32, fp('Jost-Light'),  7,   C.taupe);
    txt(doc, usage,  x, y + SH + 44, fp('Jost-Light'),  7,   C.taupe);
  });

  const py = sy0 + 2 * (SH + 66) + SH + 52;
  txt(doc, 'Colour Principles', 60, py, fp('CG-Regular'), 15, C.dark);
  const principles = [
    'Sage (#5C7A5C) is the only accent. One use per section — treat it as punctuation.',
    'Never use pure black or white. Every tone should feel organic, not digital.',
    'Warm White (#FAF8F4) is the default background. Cream for cards and inset panels.',
    'High contrast is achieved through Dark Forest on light backgrounds only.',
  ];
  principles.forEach((p, j) => {
    dot(doc, 72, py + 26 + j * 18);
    txt(doc, p, 82, py + 20 + j * 18, fp('Jost-Light'), 8.5, C.charcoal);
  });

  footer(doc, 2);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 3 — TYPOGRAPHY
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  bg(doc, C.warm_white);
  topRule(doc);
  sectionLabel(doc, 'Brand Foundation');
  pageTitle(doc, 'Typography');

  txt(doc, 'PRIMARY TYPEFACE — HEADINGS & DISPLAY', 60, 172, fp('Jost-Light'), 7.5, C.taupe);
  txt(doc, 'Cormorant Garamond', 60, 188, 'CG-Light', 44, C.dark);
  txt(doc, 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz',
      60, 244, 'CG-Regular', 13, C.charcoal);
  txt(doc, 'Weights in use: Light · Regular · SemiBold', 60, 262, fp('Jost-Light'), 8, C.taupe);

  const hScale = [
    ['H1', 'CG-Light',    36, 'Page titles, hero headings'],
    ['H2', 'CG-Regular',  28, 'Section headings'],
    ['H3', 'CG-SemiBold', 22, 'Sub-section headings'],
    ['H4', 'CG-Regular',  17, 'Card titles, feature headings'],
  ];
  let sy = 286;
  hScale.forEach(([label, font, size, desc]) => {
    txt(doc, label, 60, sy, fp('Jost-Light'), 7, C.taupe);
    txt(doc, 'The work beneath the achievement', 90, sy, font, size, C.dark);
    rightTxt(doc, `${size}pt · ${desc}`, sy, fp('Jost-Light'), 7, C.taupe);
    sy += size + 8;
  });

  drawLine(doc, 60, sy + 6, W - 60, sy + 6, C.sand, 0.5);
  sy += 26;

  txt(doc, 'SECONDARY TYPEFACE — BODY, UI & LABELS', 60, sy, fp('Jost-Light'), 7.5, C.taupe);
  txt(doc, 'Jost', 60, sy + 16, 'Jost-Regular', 38, C.dark);
  txt(doc, 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz',
      60, sy + 62, 'Jost-Light', 12, C.charcoal);
  txt(doc, 'Weights in use: Light (300) · Regular (400) · Medium (500)',
      60, sy + 80, fp('Jost-Light'), 8, C.taupe);

  const bScale = [
    ['Body',  'Jost-Light',   10, 'Running text, descriptions, line-height 1.7'],
    ['Small', 'Jost-Light',    8, 'Captions, footnotes, meta'],
    ['Label', 'Jost-Regular',7.5, 'Nav, buttons — uppercase, letter-spaced'],
  ];
  let by = sy + 106;
  bScale.forEach(([label, font, size, desc]) => {
    txt(doc, label, 60, by, fp('Jost-Light'), 7, C.taupe);
    txt(doc, "High performance is not the goal. It's the context.", 106, by, font, size, C.charcoal);
    rightTxt(doc, `${size}pt · ${desc}`, by, fp('Jost-Light'), 7, C.taupe);
    by += 22;
  });

  footer(doc, 3);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 4 — VOICE & TONE
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  bg(doc, C.warm_white);
  topRule(doc);
  sectionLabel(doc, 'Brand Personality');
  pageTitle(doc, 'Voice & Tone');

  const traits = [
    ['Calm',    'Measured and grounded. Not urgent,\nnot anxious. We do not push or hype.'],
    ['Direct',  'Clear and honest. One idea per sentence.\nNo jargon, no hedging.'],
    ['Warm',    'Human and present. We notice the person,\nnot just the problem.'],
    ['Precise', 'Specific over vague. We name things.\nWe avoid soft generalities.'],
  ];
  const CW = (W - 134) / 2, CH = 90, cx0 = 60, cy0 = 178;
  traits.forEach(([trait, desc], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = cx0 + col * (CW + 14), y = cy0 + row * (CH + 12);
    fillRoundRect(doc, x, y, CW, CH, 4, C.cream, C.sand);
    txt(doc, trait, x + 16, y + 14, 'CG-SemiBold', 20, C.accent);
    desc.split('\n').forEach((line, j) =>
      txt(doc, line, x + 16, y + 42 + j * 16, fp('Jost-Light'), 9, C.charcoal)
    );
  });

  const ddy = cy0 + 2 * (CH + 12) + 18;
  txt(doc, 'LANGUAGE — DO',    60,      ddy, fp('Jost-Light'), 7.5, C.taupe);
  txt(doc, 'LANGUAGE — AVOID', W/2 + 12, ddy, fp('Jost-Light'), 7.5, C.taupe);
  drawLine(doc, W/2, ddy + 14, W/2, ddy + 130, C.sand, 0.5);

  const dos   = ['Use plain, grounded language',
                 'Name the experience directly',
                 'Speak to the person behind the role',
                 'Trust the reader to hold complexity',
                 'Short sentences. White space. Breath.'];
  const donts = ['"Crush it", "dominate", hustle framing',
                 'Toxic positivity or empty affirmations',
                 'Jargon: leverage, synergy, optimise',
                 'Urgency tactics or fear-based language',
                 'Exclamation marks'];
  dos.forEach((d, j) => {
    dot(doc, 73, ddy + 26 + j * 22);
    txt(doc, d, 82, ddy + 20 + j * 22, fp('Jost-Light'), 9, C.dark);
    dot(doc, W/2 + 22, ddy + 26 + j * 22, C.taupe);
    txt(doc, donts[j], W/2 + 31, ddy + 20 + j * 22, fp('Jost-Light'), 9, C.dark);
  });

  // Pull quote
  const qy = ddy + 152;
  fillRoundRect(doc, 60, qy, W - 120, 70, 4, C.dark);
  centredTxt(doc, '“The goal is not to do more. It’s to do the right things', qy + 18, 'CG-Light', 16, C.cream);
  centredTxt(doc, 'without disappearing in the process.”', qy + 40, 'CG-Light', 16, C.cream);

  footer(doc, 4);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 5 — UI COMPONENTS
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  bg(doc, C.warm_white);
  topRule(doc);
  sectionLabel(doc, 'Design System');
  pageTitle(doc, 'UI Components');

  // Buttons
  txt(doc, 'BUTTONS & CALLS TO ACTION', 60, 172, fp('Jost-Light'), 7.5, C.taupe);

  // Ghost CTA
  const btnY = 192;
  doc.save().rect(60, btnY, 166, 36).lineWidth(1).strokeColor(C.accent).stroke().restore();
  centredTxt(doc, 'WORK WITH ME', btnY + 14, 'Jost-Regular', 7.5, C.accent);
  txt(doc, 'Default — ghost border, 1px Sage', 60, btnY + 42, fp('Jost-Light'), 7.5, C.taupe);
  txt(doc, 'Jost Regular · 7.5pt · uppercase · letter-spacing 0.16em', 60, btnY + 54, fp('Jost-Light'), 7.5, C.taupe);

  // Hover state
  fillRect(doc, 258, btnY, 166, 36, C.dark);
  txt(doc, 'WORK WITH ME', 258 + 83 - 40, btnY + 14, 'Jost-Regular', 7.5, C.cream);
  txt(doc, 'Hover — Dark Forest fill, Cream text', 258, btnY + 42, fp('Jost-Light'), 7.5, C.taupe);

  // Text link
  const lnkY = btnY + 76;
  txt(doc, 'Read more about the approach', 60, lnkY, fp('Jost-Light'), 10, C.accent);
  drawLine(doc, 60, lnkY + 14, 60 + 196, lnkY + 14, C.accent, 0.4);
  txt(doc, 'Text link — Sage, underline 0.4px', 60, lnkY + 20, fp('Jost-Light'), 7.5, C.taupe);

  // Navigation
  const navY = btnY + 128;
  txt(doc, 'NAVIGATION', 60, navY, fp('Jost-Light'), 7.5, C.taupe);
  ['ABOUT', 'APPROACH', 'BLOG', 'WORK WITH ME'].forEach((item, i) =>
    txt(doc, item, 60 + i * 110, navY + 18, 'Jost-Regular', 8, C.charcoal)
  );
  txt(doc, 'Jost Regular · 8pt · uppercase · letter-spacing 0.18em · Charcoal → Sage on hover',
      60, navY + 34, fp('Jost-Light'), 7.5, C.taupe);

  // Content card
  const cardY = navY + 66;
  txt(doc, 'CONTENT CARD', 60, cardY, fp('Jost-Light'), 7.5, C.taupe);
  fillRoundRect(doc, 60, cardY + 14, 220, 114, 4, C.cream, C.sand);
  txt(doc, 'APPROACH',                    76, cardY + 24,  fp('Jost-Regular'), 7,  C.taupe);
  txt(doc, 'Sustainable Performance',     76, cardY + 40,  'CG-Regular',       16, C.dark);
  txt(doc, 'A framework for doing meaningful',  76, cardY + 64,  fp('Jost-Light'), 9, C.charcoal);
  txt(doc, 'work without the cost of burnout.', 76, cardY + 78,  fp('Jost-Light'), 9, C.charcoal);
  txt(doc, 'Read more', 76, cardY + 98, fp('Jost-Light'), 8.5, C.accent);
  drawLine(doc, 76, cardY + 112, 76 + 62, cardY + 112, C.accent, 0.4);

  const cardSpecs = ['Background: Cream (#F5F0E8)',
    'Border: Sand (#D8E4D4), 0.5px', 'Corner radius: 4px',
    'Label: Jost Regular 7pt, uppercase, Stone',
    'Title: Cormorant Garamond Regular, 16pt',
    'Body: Jost Light, 9pt, line-height 1.7'];
  cardSpecs.forEach((s, j) =>
    txt(doc, `—  ${s}`, 302, cardY + 24 + j * 17, fp('Jost-Light'), 8, C.taupe)
  );

  // Spacing
  const spY = cardY + 142;
  txt(doc, 'SPACING PRINCIPLES', 60, spY, fp('Jost-Light'), 7.5, C.taupe);
  ['Generous white space is part of the brand — it signals calm.',
   'Section padding: 5–8rem vertical. Let elements breathe.',
   'Base unit: 8px. All spacing in multiples of 8.',
   'Max content width: 1200px. Never full-bleed text columns.',
  ].forEach((n, j) => {
    dot(doc, 72, spY + 24 + j * 19);
    txt(doc, n, 82, spY + 18 + j * 19, fp('Jost-Light'), 9, C.charcoal);
  });

  footer(doc, 5);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 6 — IMAGERY & APPLICATION
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  bg(doc, C.warm_white);
  topRule(doc);
  sectionLabel(doc, 'Brand Application');
  pageTitle(doc, 'Imagery & Application');

  txt(doc, 'PHOTOGRAPHY DIRECTION', 60, 172, fp('Jost-Light'), 7.5, C.taupe);

  const imgCols = [
    ['Use',   C.accent, [
      'Natural light, soft shadows, muted palettes',
      'Workspaces, quiet moments, hands, details',
      'People at rest or in thoughtful focus',
      'Warm or desaturated colour grading',
      'Negative space as a compositional choice',
    ]],
    ['Avoid', C.taupe, [
      'High-energy action or group celebrations',
      'Bright, saturated, or cold blue-toned images',
      'Busy or cluttered backgrounds',
      'Stock photos with forced expressions',
      'Anything that reads "hustle" or "grind"',
    ]],
  ];
  imgCols.forEach(([label, col, items], ci) => {
    const cx = 60 + ci * (W / 2 - 30);
    txt(doc, label, cx, 192, 'CG-Regular', 17, col);
    items.forEach((item, j) => {
      dot(doc, cx + 10, 216 + j * 22, col);
      txt(doc, item, cx + 22, 210 + j * 22, fp('Jost-Light'), 9, C.charcoal);
    });
  });

  // Brand name rules
  const bnY = 338;
  drawLine(doc, 60, bnY, W - 60, bnY, C.sand, 0.5);
  txt(doc, 'BRAND NAME USAGE', 60, bnY + 14, fp('Jost-Light'), 7.5, C.taupe);
  [
    'Always two words: "Calm Ambition" — never "CalmAmbition" or "calm ambition"',
    'In body copy, always capitalise both words',
    'In UI / navigation, all caps is acceptable: "CALM AMBITION"',
    'The tagline adapts to context. Core idea: sustainable, not sacrificial, performance.',
  ].forEach((r, j) => {
    dot(doc, 72, bnY + 36 + j * 20);
    txt(doc, r, 82, bnY + 30 + j * 20, fp('Jost-Light'), 9, C.charcoal);
  });

  // Digital touchpoints
  const dtY = bnY + 110;
  drawLine(doc, 60, dtY, W - 60, dtY, C.sand, 0.5);
  txt(doc, 'DIGITAL TOUCHPOINTS', 60, dtY + 14, fp('Jost-Light'), 7.5, C.taupe);
  [
    ['Website',       'calmambition.github.io/Calm-ambition/ — GitHub Pages, static HTML'],
    ['Client Portal', 'React 19 + Tailwind v4 — mirrors brand tokens exactly'],
    ['Email',         'Jost 14pt body, Cormorant Garamond for greeting, plain HTML'],
    ['Social',        'Sage on Warm White. No filters. Square or 4:5 crop.'],
  ].forEach(([tp, detail], j) => {
    txt(doc, tp,     62,       dtY + 32 + j * 20, fp('Jost-Medium'), 8.5, C.dark);
    txt(doc, detail, 62 + 118, dtY + 32 + j * 20, fp('Jost-Light'),  8.5, C.charcoal);
  });

  // Closing panel
  const closeY = dtY + 120;
  fillRoundRect(doc, 60, closeY, W - 120, 74, 4, C.dark);
  centredTxt(doc, '“The brand exists to make people feel seen,', closeY + 16, 'CG-Light', 19, C.cream);
  centredTxt(doc, 'not sold to.”', closeY + 38, 'CG-Light', 19, C.cream);
  centredTxt(doc, 'Every design decision should serve that intention.', closeY + 58, fp('Jost-Light'), 9, C.taupe);

  footer(doc, 6);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 7 — WORDMARK SPEC
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  bg(doc, C.warm_white);
  topRule(doc);
  sectionLabel(doc, 'Brand Foundation');
  pageTitle(doc, 'Wordmark');

  // ── Primary wordmark on warm white ────────────────────────────────────────
  txt(doc, 'PRIMARY — ON LIGHT', 60, 172, fp('Jost-Light'), 7.5, C.taupe);

  // Wordmark specimen box
  fillRoundRect(doc, 60, 186, W - 120, 82, 4, C.cream, C.sand);
  centredTxt(doc, 'Calm Ambition', 186 + 24, 'CG-Light', 38, C.dark);
  txt(doc, 'Cormorant Garamond Light · 38pt displayed above · letter-spacing 0.04em',
      60, 186 + 68, fp('Jost-Light'), 7.5, C.taupe);

  // ── On dark background ────────────────────────────────────────────────────
  txt(doc, 'ON DARK', 60, 290, fp('Jost-Light'), 7.5, C.taupe);
  fillRoundRect(doc, 60, 304, (W - 134) / 2, 62, 4, C.dark);
  const mW = (W - 134) / 2;
  centredTxt(doc, 'Calm Ambition', 304 + 16, 'CG-Light', 26, C.cream);
  doc.save().font(fp('Jost-Light')).fontSize(7).fillColor(C.taupe)
    .text('Cream (#F5F0E8) on Dark Forest', 60, 304 + 50, { lineBreak: false }).restore();

  // ── On Sage accent ────────────────────────────────────────────────────────
  txt(doc, 'ON SAGE', W/2 + 12, 290, fp('Jost-Light'), 7.5, C.taupe);
  fillRoundRect(doc, W/2 + 12, 304, mW, 62, 4, C.accent);
  const cx2 = W/2 + 12 + mW / 2;
  doc.save().font('CG-Light').fontSize(26).fillColor(C.cream)
    .text('Calm Ambition', W/2 + 12, 304 + 16, { lineBreak: false, width: mW, align: 'center' }).restore();
  txt(doc, 'Cream (#F5F0E8) on Sage', W/2 + 12, 304 + 50, fp('Jost-Light'), 7, C.taupe);

  // ── Clear space ───────────────────────────────────────────────────────────
  const csY = 404;
  drawLine(doc, 60, csY, W - 60, csY, C.sand, 0.5);
  txt(doc, 'CLEAR SPACE', 60, csY + 14, fp('Jost-Light'), 7.5, C.taupe);

  // Clear space diagram
  const boxX = 60, boxY = csY + 34, boxW = 220, boxH = 64;
  const unit = 14; // clear space unit = cap-height approx
  fillRoundRect(doc, boxX - unit, boxY - unit, boxW + unit*2, boxH + unit*2, 0, C.sand);
  fillRoundRect(doc, boxX, boxY, boxW, boxH, 0, C.warm_white);
  centredTxt(doc, 'Calm Ambition', boxY + 14, 'CG-Light', 26, C.dark);

  // Clear space labels
  txt(doc, '← x →', boxX - unit + 2, boxY + boxH/2 - 4, fp('Jost-Light'), 7, C.taupe);
  txt(doc, '← x →', boxX + boxW + 2, boxY + boxH/2 - 4, fp('Jost-Light'), 7, C.taupe);

  txt(doc, 'Minimum clear space: one cap-height ("x") on all sides.',
      320, csY + 44, fp('Jost-Light'), 9, C.charcoal);
  txt(doc, 'Never place the wordmark closer than this to any other', 320, csY + 58, fp('Jost-Light'), 9, C.charcoal);
  txt(doc, 'element, edge, or background boundary.', 320, csY + 72, fp('Jost-Light'), 9, C.charcoal);

  // ── Minimum size ──────────────────────────────────────────────────────────
  const msY = csY + 120;
  drawLine(doc, 60, msY, W - 60, msY, C.sand, 0.5);
  txt(doc, 'MINIMUM SIZE', 60, msY + 14, fp('Jost-Light'), 7.5, C.taupe);

  const sizes = [
    [18, 'Minimum digital — favicon, app icon context'],
    [24, 'Minimum print — footnotes, legal documents'],
    [32, 'Body text context — inside articles, bios'],
  ];
  let sizeX = 60;
  sizes.forEach(([sz, label]) => {
    txt(doc, 'Calm Ambition', sizeX, msY + 30, 'CG-Light', sz, C.dark);
    txt(doc, `${sz}pt`, sizeX, msY + 30 + sz + 4, fp('Jost-Light'), 7, C.taupe);
    txt(doc, label, sizeX, msY + 30 + sz + 16, fp('Jost-Light'), 7, C.stone || C.taupe);
    sizeX += 170;
  });

  // ── What not to do ────────────────────────────────────────────────────────
  const wntY = msY + 86;
  drawLine(doc, 60, wntY, W - 60, wntY, C.sand, 0.5);
  txt(doc, 'DO NOT', 60, wntY + 14, fp('Jost-Light'), 7.5, C.taupe);

  const donts2 = [
    'Change the typeface — Cormorant Garamond Light only',
    'Add drop shadows, outlines, or decorative effects',
    'Use on low-contrast or patterned backgrounds',
    'Stretch, condense, or distort the letterforms',
    'Use all-lowercase or all-caps in body copy contexts',
    'Place over photographs without a solid overlay',
  ];
  donts2.forEach((d, j) => {
    const col = j % 2, row = Math.floor(j / 2);
    const x = 60 + col * (W/2 - 30);
    dot(doc, x + 8, wntY + 32 + row * 20, C.taupe);
    txt(doc, d, x + 18, wntY + 26 + row * 20, fp('Jost-Light'), 8.5, C.charcoal);
  });

  footer(doc, 7);

  // ── Finalise ──────────────────────────────────────────────────────────────
  doc.end();
  await new Promise(r => doc.on('end', r));
  console.log(`\nBrand Kit saved to:\n  ${OUTPUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
