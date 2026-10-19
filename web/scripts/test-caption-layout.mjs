#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const webRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outDir = join(webRoot, 'screenshots');
const base = process.env.LAB_URL ?? 'http://127.0.0.1:3000';
const TOLERANCE_PX = 1;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

function moved(a, b, keys = ['x', 'y', 'width', 'height']) {
  if (!a || !b) return 'missing box';
  const changes = keys.filter((key) => Math.abs((a[key] ?? 0) - (b[key] ?? 0)) > TOLERANCE_PX);
  return changes.length === 0
    ? null
    : changes.map((key) => `${key} ${a[key].toFixed(2)} -> ${b[key].toFixed(2)}`).join(', ');
}

async function measure(page) {
  return page.evaluate(() => {
    const boxOf = (el) => {
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right };
    };
    const caption = document.querySelector('.caption-line, [data-caption-row]');
    return {
      stage: boxOf(document.querySelector('[data-slide-desk]')),
      clip: boxOf(document.querySelector('[data-stage-clip]')),
      court: boxOf(document.querySelector('.slide-court')),
      courtFrame: boxOf(document.querySelector('.slide-court-frame')),
      scaled: boxOf(document.querySelector('[data-scaled-slide]')),
      scoreboard: boxOf(document.querySelector('[data-scoreboard]')),
      rail: boxOf(document.querySelector('[data-rail]')),
      camera: boxOf(document.querySelector('[data-camera-reserve]')),
      credits: boxOf(document.querySelector('.photo-credits-link')),
      captionPresent: Boolean(caption) && getComputedStyle(caption).display !== 'none',
      questionInput: document.querySelector('#player-question, [data-player-question]') !== null,
    };
  });
}

const variants = [
  { name: 'base', path: '/lab?slide=s2_lebron&scale=1' },
  { name: 'listening', path: '/lab?slide=s2_lebron&scale=1&state=listening' },
  { name: 'speaking', path: '/lab?slide=s2_lebron&scale=1&state=speaking' },
  { name: 'highlight', path: '/lab?slide=s2_lebron&scale=1&highlight=cle_james' },
  { name: 'play', path: '/lab?slide=s2_lebron&scale=1&play=p_blitz_lebron_pnr' },
  { name: 'callout', path: '/lab?slide=s2_lebron&scale=1&callout=text' },
];

const viewports = [
  { name: 'desktop', size: [1280, 800] },
  { name: 'hd', size: [1920, 1080] },
  { name: 'mobile', size: [390, 844] },
];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.size[0], height: viewport.size[1] },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const readings = {};
  for (const variant of variants) {
    const response = await page.goto(`${base}${variant.path}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    if (!response || response.status() >= 400) {
      errors.push(`${viewport.name} ${variant.name}: status ${response?.status()}`);
      continue;
    }
    await page.addStyleTag({
      content:
        'nextjs-portal, [data-next-badge-root], #__next-build-watcher { display: none !important; }',
    });
    await page.waitForSelector('[data-slide-desk]');
    await page.waitForTimeout(250);
    readings[variant.name] = await measure(page);
    await page.screenshot({
      path: join(outDir, `geometry-${viewport.name}-${variant.name}.png`),
      fullPage: false,
    });
  }

  const baseReading = readings.base;
  if (!baseReading) {
    await context.close();
    continue;
  }
  if (baseReading.questionInput) {
    errors.push(`${viewport.name}: typed question input is present`);
  }
  for (const [name, reading] of Object.entries(readings)) {
    if (reading.captionPresent) {
      errors.push(`${viewport.name} ${name}: transcript caption is visible`);
    }
    if (reading.questionInput) {
      errors.push(`${viewport.name} ${name}: typed question input is present`);
    }
    for (const key of ['stage', 'clip', 'scoreboard', 'rail', 'scaled']) {
      const drift = moved(baseReading[key], reading[key]);
      if (drift) {
        errors.push(`${viewport.name} ${name}: ${key} moved (${drift})`);
      }
    }
    const courtDrift = moved(baseReading.courtFrame, reading.courtFrame);
    if (courtDrift) {
      errors.push(`${viewport.name} ${name}: courtFrame moved (${courtDrift})`);
    }
  }
  console.log(
    `${viewport.name}: stage ${baseReading.stage?.width}x${baseReading.stage?.height}; camera ${baseReading.camera ? 'yes' : 'no'}`
  );
  await context.close();
}

const playerContext = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const playerPage = await playerContext.newPage();
const playerResponse = await playerPage.goto(`${base}/lab?view=lobby`, {
  waitUntil: 'networkidle',
  timeout: 60000,
});
if (!playerResponse || playerResponse.status() >= 400) {
  errors.push(`/player: status ${playerResponse?.status()}`);
} else {
  const hasQuestionUi = await playerPage.evaluate(
    () =>
      document.querySelector('#player-question, [data-player-question], .player-command-bar') !==
      null
  );
  const hasCaption = await playerPage.evaluate(() => {
    const caption = document.querySelector('.caption-line, [data-caption-row]');
    return Boolean(caption) && getComputedStyle(caption).display !== 'none';
  });
  if (hasQuestionUi) errors.push('lobby still has typed-question UI');
  if (hasCaption) errors.push('lobby still has transcript captions');
  if (!hasQuestionUi && !hasCaption) {
    console.log('lobby: no typed-question UI and no captions');
  }
  await playerPage.screenshot({
    path: join(outDir, 'player-welcome-no-text-entry.png'),
    fullPage: false,
  });
}
await playerContext.close();
await browser.close();

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('geometry stable across state and overlay variants; no captions or text input');
