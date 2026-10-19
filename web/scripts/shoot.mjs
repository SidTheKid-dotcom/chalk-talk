#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const webRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outDir = join(webRoot, 'screenshots');
const base = process.env.LAB_URL ?? 'http://127.0.0.1:3000';

const shots = [
  { name: 'slide-1-tip-off', path: '/lab?slide=s1_tipoff&shot=1', size: [1920, 1080] },
  { name: 'slide-2-stop-lebron', path: '/lab?slide=s2_lebron&shot=1', size: [1920, 1080] },
  { name: 'slide-3-kyrie-iso', path: '/lab?slide=s3_kyrie&shot=1', size: [1920, 1080] },
  { name: 'slide-4-our-offense', path: '/lab?slide=s4_offense&shot=1', size: [1920, 1080] },
  { name: 'slide-5-x-factors', path: '/lab?slide=s5_xfactors&shot=1', size: [1920, 1080] },
  { name: 'slide-6-last-two-minutes', path: '/lab?slide=s6_last_two&shot=1', size: [1920, 1080] },
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
    name: 'reduced-motion',
    path: '/lab?view=motion',
    size: [1920, 1080],
    reducedMotion: true,
  },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.size[0], height: shot.size[1] },
    deviceScaleFactor: 1,
    reducedMotion: shot.reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const url = `${base}${shot.path}`;
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  if (!response || response.status() >= 400) {
    errors.push(`${shot.name}: ${url} status ${response?.status()}`);
  }
  await page.waitForTimeout(400);
  if (shot.name.startsWith('slide-')) {
    const fact = await page.locator('[data-note-kind="fact"]').first().boundingBox();
    const obstacles = await page
      .locator('.photo-credits-link, .cutout-photo, .cutout-caption, .slide-court circle')
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
  }
  const dest = join(outDir, `${shot.name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`wrote ${dest}`);
  await context.close();
}

await browser.close();

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
