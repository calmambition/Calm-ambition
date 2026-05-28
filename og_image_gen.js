'use strict';
/**
 * Calm Ambition — OG social share image generator
 * Produces og-image.png (1200×630) using resvg-js (WASM, no native deps)
 * Fonts are embedded as base64 WOFF so the image renders correctly in crawlers
 */

const { Resvg } = require('@resvg/resvg-js');
const fs   = require('fs');
const path = require('path');

const NM   = path.join(__dirname, 'node_modules');
const FONTS = {
  cg:   path.join(NM, '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-latin-400-normal.woff'),
  jost: path.join(NM, '@fontsource', 'jost', 'files', 'jost-latin-300-normal.woff'),
};

// Read and base64-encode fonts
const b64 = f => fs.readFileSync(f).toString('base64');
const cgB64   = b64(FONTS.cg);
const jostB64 = b64(FONTS.jost);

const W = 1200, H = 630;

// Brand colours
const BG     = '#FAF8F4';
const DARK   = '#1E2820';
const SAGE   = '#5C7A5C';
const CREAM  = '#F5F0E8';
const SAND   = '#D8E4D4';
const STONE  = '#A8B8A0';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'CG';
        src: url('data:font/woff;base64,${cgB64}') format('woff');
        font-weight: 400;
      }
      @font-face {
        font-family: 'Jost';
        src: url('data:font/woff;base64,${jostB64}') format('woff');
        font-weight: 300;
      }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Left sage accent bar -->
  <rect x="0" y="0" width="6" height="${H}" fill="${SAGE}"/>

  <!-- Top rule -->
  <rect x="80" y="80" width="${W - 160}" height="0.5" fill="${SAND}"/>

  <!-- Bottom rule -->
  <rect x="80" y="${H - 80}" width="${W - 160}" height="0.5" fill="${SAND}"/>

  <!-- Eyebrow label -->
  <text x="80" y="130"
        font-family="Jost, sans-serif" font-weight="300"
        font-size="18" fill="${STONE}"
        letter-spacing="5">BRAND IDENTITY · BURNOUT RECOVERY COACHING</text>

  <!-- Wordmark -->
  <text x="80" y="310"
        font-family="CG, 'Cormorant Garamond', Georgia, serif" font-weight="400"
        font-size="112" fill="${DARK}">Calm Ambition</text>

  <!-- Hair rule below wordmark -->
  <rect x="80" y="338" width="120" height="1" fill="${SAGE}"/>

  <!-- Tagline -->
  <text x="80" y="400"
        font-family="Jost, sans-serif" font-weight="300"
        font-size="26" fill="${STONE}"
        letter-spacing="1">Perform sustainably. Live fully.</text>

  <!-- Bottom detail — URL -->
  <text x="80" y="${H - 100}"
        font-family="Jost, sans-serif" font-weight="300"
        font-size="18" fill="${STONE}"
        letter-spacing="2">calmambition.com</text>

  <!-- Decorative sage circle (top right) -->
  <circle cx="${W - 100}" cy="100" r="60" fill="none" stroke="${SAND}" stroke-width="1"/>
  <circle cx="${W - 100}" cy="100" r="40" fill="none" stroke="${SAGE}" stroke-width="0.5" opacity="0.4"/>

</svg>`;

// Render SVG → PNG via resvg-js
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { loadSystemFonts: false },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

const OUTPUT = path.join(__dirname, 'og-image.png');
fs.writeFileSync(OUTPUT, pngBuffer);

const kb = (pngBuffer.length / 1024).toFixed(1);
console.log(`OG image saved: og-image.png (${kb} KB)`);
