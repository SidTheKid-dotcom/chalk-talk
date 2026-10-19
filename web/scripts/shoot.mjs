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
