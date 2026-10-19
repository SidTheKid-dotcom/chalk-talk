#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const webRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outDir = process.env.SHOT_DIR ?? join(webRoot, 'screenshots');
const evidenceDir = process.env.EVIDENCE_DIR ?? '/tmp/task12-evidence';
const base = process.env.LAB_URL ?? 'http://127.0.0.1:3000';

const slideShots = [
  { name: 'slide-1-tip-off', path: '/lab?slide=s1_tipoff&shot=1' },
  { name: 'slide-2-stop-lebron', path: '/lab?slide=s2_lebron&shot=1' },
  { name: 'slide-3-kyrie-iso', path: '/lab?slide=s3_kyrie&shot=1' },
  { name: 'slide-4-our-offense', path: '/lab?slide=s4_offense&shot=1' },
  { name: 'slide-5-x-factors', path: '/lab?slide=s5_xfactors&shot=1' },
  { name: 'slide-6-last-two-minutes', path: '/lab?slide=s6_last_two&shot=1' },
];

const extraShots = [
  { name: 'coach-view', path: '/lab?view=coach', size: [390, 844] },
  {
    name: 'fallback-cutout',
    path: '/lab?slide=s2_lebron&fallback=cutout&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'fallback-jr',
    path: '/lab?slide=s6_last_two&highlight=k_jr_card&fallback=jr&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'highlight-lebron',
    path: '/lab?slide=s2_lebron&highlight=cle_james&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'play-lebron',
    path: '/lab?slide=s2_lebron&play=p_blitz_lebron_pnr&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'callout-coach-note',
    path: '/lab?slide=s2_lebron&callout=text&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'state-listening',
    path: '/lab?slide=s2_lebron&state=listening&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'state-thinking',
    path: '/lab?slide=s2_lebron&state=thinking&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'state-speaking',
    path: '/lab?slide=s2_lebron&state=speaking&shot=1',
    size: [1920, 1080],
  },
  {
    name: 'reduced-motion',
    path: '/lab?view=motion',
    size: [1920, 1080],
    reducedMotion: true,
  },
  { name: 'player-welcome', path: '/lab?view=lobby', size: [1920, 1080] },
  { name: 'session-ended', path: '/lab?view=ended', size: [1920, 1080] },
  { name: 'responsive-1280x800', path: '/lab?slide=s2_lebron&scale=1', size: [1280, 800] },
  { name: 'responsive-390x844', path: '/lab?slide=s2_lebron&scale=1', size: [390, 844] },
  { name: 'photo-credits', path: '/lab/credits', size: [1920, 1080] },
];

mkdirSync(outDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const geometry = [];

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function measure(page) {
  return page.evaluate(() => {
    const boxOf = (el) => {
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    };
    return {
      stage: boxOf(document.querySelector('[data-slide-desk]')),
      scoreboard: boxOf(document.querySelector('[data-scoreboard]')),
      clip: boxOf(document.querySelector('[data-stage-clip]')),
      rail: boxOf(document.querySelector('[data-rail]')),
      court: boxOf(document.querySelector('[data-court-wrap], [data-court]')),
      camera: boxOf(document.querySelector('[data-camera-reserve]')),
      transcript:
        document.querySelector('.caption-line, [data-caption-row], [data-player-question]') !==
        null,
      question:
        document.querySelector('#player-question, [data-player-question], .player-command-bar') !==
        null,
    };
  });
}

async function shotPage(shot) {
  const size = shot.size ?? [1920, 1080];
  const context = await browser.newContext({
    viewport: { width: size[0], height: size[1] },
    deviceScaleFactor: 1,
    reducedMotion: shot.reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const url = `${base}${shot.path}`;
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  if (!response || response.status() >= 400) {
    errors.push(`${shot.name}: ${url} status ${response?.status()}`);
  }
  await page.addStyleTag({
    content:
      'nextjs-portal, [data-next-badge-root], #__next-build-watcher { display: none !important; }',
  });
  await page.waitForTimeout(400);
  const inspectLayout =
    shot.name.startsWith('slide-') &&
    (shot.size ?? [1920, 1080])[0] === 1920 &&
    !shot.name.includes('thumb');
  if (inspectLayout) {
    const creditsCount = await page.locator('.photo-credits-link').count();
    if (creditsCount === 0) {
      errors.push(`${shot.name}: photo credits link is missing`);
    }
    if ((await page.locator('[data-camera-reserve]').count()) === 0) {
      errors.push(`${shot.name}: camera reserve is missing`);
    }
    if ((await page.locator('[data-player-controls]').count()) === 0) {
      errors.push(`${shot.name}: session controls are missing`);
    }
    const fact = await page.locator('[data-note-kind="fact"]').first().boundingBox();
    const obstacles = await page
      .locator('.photo-credits-link, .cutout-photo, .cutout-caption, [data-court] circle')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          label:
            element.getAttribute('aria-label') ||
            element.getAttribute('alt') ||
            element.textContent?.trim() ||
            element.tagName.toLowerCase(),
          box: element.getBoundingClientRect().toJSON(),
        }))
      );
    if (!fact) {
      errors.push(`${shot.name}: fact card is missing`);
    } else {
      const collisions = obstacles
        .filter(({ box }) => box.width > 0 && box.height > 0 && overlaps(fact, box))
        .map(({ label }) => label);
      if (collisions.length > 0) {
        errors.push(`${shot.name}: fact card overlaps ${collisions.join(', ')}`);
      } else {
        console.log(`${shot.name}: fact card clears credits, cutouts, and court markers`);
      }
    }
    const metrics = await measure(page);
    geometry.push({ name: shot.name, size, ...metrics });
    if (metrics.transcript || metrics.question) {
      errors.push(`${shot.name}: transcript or question UI is present`);
    }
  }
  const dest = join(outDir, `${shot.name}.png`);
  const copy = join(evidenceDir, `${shot.name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  await page.screenshot({ path: copy, fullPage: false });
  console.log(`wrote ${dest}`);
  await context.close();
}

for (const shot of slideShots) {
  await shotPage({ ...shot, size: [1920, 1080] });
  const scaled = shot.path.replace('shot=1', 'scale=1');
  await shotPage({ ...shot, name: `${shot.name}-1280x720`, path: scaled, size: [1280, 720] });
  await shotPage({ ...shot, name: `${shot.name}-thumb`, path: scaled, size: [480, 270] });
}

for (const shot of extraShots) {
  await shotPage(shot);
}

const first = geometry[0];
if (first?.stage) {
  for (const row of geometry) {
    if (!row.stage || !first.stage) continue;
    if (row.size[0] !== 1920) continue;
    for (const key of ['stage', 'scoreboard', 'clip', 'rail']) {
      const a = first[key];
      const b = row[key];
      if (!a || !b) {
        errors.push(`${row.name}: missing ${key} geometry`);
        continue;
      }
      const drift = ['x', 'y', 'width', 'height'].filter(
        (field) => Math.abs(a[field] - b[field]) > 1
      );
      if (drift.length > 0) {
        errors.push(`${row.name}: ${key} moved (${drift.join(', ')}) vs ${first.name}`);
      }
    }
  }
}

writeFileSync(join(evidenceDir, 'geometry.json'), JSON.stringify(geometry, null, 2));
console.log(`geometry rows ${geometry.length}`);

const thumbs = slideShots.map((shot) => ({
  name: shot.name.replace('slide-', ''),
  src: join(outDir, `${shot.name}-thumb.png`),
}));
const sheet = `<!doctype html>
<html><head><meta charset="utf-8"><title>25% thumbs</title>
<style>
  html,body{margin:0;background:#0b0b0c;color:#f4f1ea;font:14px/1.3 system-ui}
  h1{margin:16px 24px 8px;font-size:22px;letter-spacing:.12em;text-transform:uppercase}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px 24px 24px}
  figure{margin:0;background:#161616;border:1px solid #333}
  img{display:block;width:100%;height:auto}
  figcaption{padding:8px 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#b9b4aa}
</style></head><body>
<h1>Hardwood slides at 25% (480×270 of 1920×1080)</h1>
<div class="grid">${thumbs
  .map(
    (thumb) =>
      `<figure><img src="${thumb.src}" alt="${thumb.name}"><figcaption>${thumb.name}</figcaption></figure>`
  )
  .join('')}</div>
</body></html>`;
writeFileSync(join(evidenceDir, 'contact-sheet.html'), sheet);
const sheetContext = await browser.newContext({
  viewport: { width: 1600, height: 980 },
  deviceScaleFactor: 1,
});
const sheetPage = await sheetContext.newPage();
await sheetPage.goto(`file://${join(evidenceDir, 'contact-sheet.html')}`);
await sheetPage.screenshot({
  path: join(evidenceDir, 'contact-sheet-25pct.png'),
  fullPage: true,
});
await sheetPage.screenshot({ path: join(outDir, 'contact-sheet-25pct.png'), fullPage: true });
await sheetContext.close();
console.log('wrote contact-sheet-25pct.png');

await browser.close();

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
