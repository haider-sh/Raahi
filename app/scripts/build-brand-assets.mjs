// Generates every icon and splash PNG from one logo definition (D36).
//
// The mark: a hollow start stop (bottom-left), a road-like route line, and an amber destination
// dot (top-right), the "get off here" colour. Geometry lives in src/features/splash/logo.json,
// shared with the animated splash so its moving dot follows the exact same curve.
//
// Usage (from app/): node scripts/build-brand-assets.mjs

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = (f) => resolve(here, '../assets/images', f);

const LOGO = JSON.parse(readFileSync(resolve(here, '../src/features/splash/logo.json'), 'utf8'));
const BRAND = LOGO.colors;

function mark({ scale = 1, line = BRAND.line, dot = BRAND.amber, ring = BRAND.line } = {}) {
  const { size, start, end, lineStart, c1, c2, stroke } = LOGO;
  const c = size / 2;
  return `<g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">
    <path d="M${lineStart.x} ${lineStart.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}"
      fill="none" stroke="${line}" stroke-width="${stroke}" stroke-linecap="round"/>
    <circle cx="${start.x}" cy="${start.y}" r="${start.r}" fill="none" stroke="${ring}" stroke-width="${start.ring}"/>
    <circle cx="${end.x}" cy="${end.y}" r="${end.r}" fill="${dot}"/>
  </g>`;
}

const background = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.greenLight}"/>
      <stop offset="1" stop-color="${BRAND.greenDark}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;

function png(file, body, width = 1024) {
  const r = new Resvg(svg(body), { fitTo: { mode: 'width', value: width }, background: 'rgba(0,0,0,0)' });
  writeFileSync(out(file), r.render().asPng());
  console.log('wrote', file, `${width}px`);
}

// App icon (iOS + store listing): opaque, square, no rounded corners; the OS masks it.
png('icon.png', background + mark({ scale: 0.92 }));
// Android adaptive icon: the foreground must fit the 66/108 safe circle, so the mark is smaller.
png('android-icon-foreground.png', mark({ scale: 0.72 }));
png('android-icon-background.png', background);
png('android-icon-monochrome.png', mark({ scale: 0.72, line: '#FFFFFF', dot: '#FFFFFF', ring: '#FFFFFF' }));
// Native splash: the mark alone on the brand green (set in app.config.ts).
png('splash-icon.png', mark());
// The animated splash draws the line + ring from this, and animates the dot itself.
png('splash-mark.png', mark({ dot: 'none' }));
png('favicon.png', background + mark({ scale: 0.92 }), 48);
// Vector master of the icon, for store listings and print (not used by the app).
writeFileSync(out('logo.svg'), svg(background + mark({ scale: 0.92 })));
writeFileSync(out('logo-mark.svg'), svg(mark()));
