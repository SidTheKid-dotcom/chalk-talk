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
  { name: 'desktop', size: [1280, 800], chrome: true },
  { name: 'hd', size: [1920, 1080], chrome: true },
  { name: 'phone-land', size: [844, 390], chrome: true },
  { name: 'mobile', size: [390, 844], chrome: true, portrait: true },
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
    if (viewport.portrait) {
      await page.waitForSelector('[data-rotate-hint]', { timeout: 5000 });
    }
    await page.waitForTimeout(250);
    readings[variant.name] = await measure(page);
    const chromeError = await page.evaluate((portrait) => {
      const visualFont = (el) => {
        if (!el) return 0;
        const specified = parseFloat(getComputedStyle(el).fontSize);
        const rect = el.getBoundingClientRect();
        const layout = el.offsetWidth || rect.width || 1;
        return specified * (rect.width / layout);
      };
      const misses = [];
      const scaled = document.querySelector('[data-scaled-slide]');
      const stage = scaled?.getBoundingClientRect();
      const controls = [...document.querySelectorAll('[data-player-controls] button')];
      if (controls.length === 0) misses.push('missing session controls');
      for (const button of controls) {
        const box = button.getBoundingClientRect();
        if (box.height < 44)
          misses.push(`${button.textContent?.trim()} height ${box.height.toFixed(1)}`);
        if (box.left < -1 || box.right > window.innerWidth + 1) {
          misses.push(`${button.textContent?.trim()} is outside the viewport`);
        }
        if (scaled?.contains(button))
          misses.push(`${button.textContent?.trim()} is inside the scaled stage`);
        if (portrait && stage && box.top + 1 < stage.bottom) {
          misses.push(`${button.textContent?.trim()} is not below the stage`);
        }
      }
      const mic = document.querySelector('[data-player-mic]');
      if (mic && mic.getAttribute('aria-pressed') == null)
        misses.push('mic toggle missing aria-pressed');
      const credits = document.querySelector('.photo-credits-link');
      if (!credits) misses.push('missing photo credits link');
      else {
        const font = visualFont(credits);
        if (font < 14) misses.push(`photo credits visual font ${font.toFixed(1)}px`);
        if (scaled?.contains(credits)) misses.push('photo credits link is inside the scaled stage');
      }
      const hint = document.querySelector('[data-rotate-hint]');
      const hintVisible = Boolean(hint) && getComputedStyle(hint).display !== 'none';
      if (portrait && !hintVisible) misses.push('portrait rotate hint is hidden');
      if (!portrait && hintVisible) misses.push('rotate hint is visible outside portrait');
      if (portrait && stage && stage.top > 8)
        misses.push(`stage top ${stage.top.toFixed(1)} is not pinned`);
      return misses;
    }, Boolean(viewport.portrait));
    for (const miss of chromeError) {
      errors.push(`${viewport.name} ${variant.name}: ${miss}`);
    }
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
