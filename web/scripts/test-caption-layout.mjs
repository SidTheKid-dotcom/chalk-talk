#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const webRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outDir = join(webRoot, 'screenshots');
const base = process.env.LAB_URL ?? 'http://127.0.0.1:3000';
const TOLERANCE_PX = 0.75;

const SHORT_CAPTION = 'We load early help toward the paint.';
const LONG_CAPTION =
  'We load early help toward the paint and keep Iguodala attached on the catch so LeBron cannot turn the corner, then rotate the weak side home before the kick-out, holding the first defender square and denying the middle so the next help can stay connected through the rest of this possession and the next one after that.';

const viewports = [
  { name: 'desktop', size: [1280, 800] },
  { name: 'mobile', size: [390, 844] },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

function boxLabel(box) {
  if (!box) return 'missing';
  return `${box.x.toFixed(2)},${box.y.toFixed(2)} ${box.width.toFixed(2)}x${box.height.toFixed(2)} right=${box.right.toFixed(2)}`;
}

function moved(a, b, keys = ['x', 'y', 'width', 'height', 'right']) {
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
    const caption = document.querySelector('.caption-line');
    const styles = caption ? getComputedStyle(caption) : null;
    return {
      desk: boxOf(document.querySelector('[data-slide-desk]')),
      sheet: boxOf(document.querySelector('.sheet')),
      court: boxOf(document.querySelector('.slide-court')),
      courtFrame: boxOf(document.querySelector('.slide-court-frame')),
      scaled: boxOf(document.querySelector('[data-scaled-slide]')),
      credits: boxOf(document.querySelector('[data-caption-row] .photo-credits-link')),
      captionRow: boxOf(document.querySelector('[data-caption-row]')),
      caption: boxOf(caption),
      captionTitle: caption?.getAttribute('title') ?? '',
      captionAria: caption?.getAttribute('aria-label') ?? '',
      captionText: caption?.textContent ?? '',
      captionStyle: styles
        ? {
            whiteSpace: styles.whiteSpace,
            textOverflow: styles.textOverflow,
            overflow: styles.overflow,
            minWidth: styles.minWidth,
          }
        : null,
      questionInput: document.querySelector('#player-question, [data-player-question]') !== null,
    };
  });
}

function captionUrl(text) {
  const params = new URLSearchParams({
    slide: 's2_lebron',
    shot: '1',
    scale: '1',
    caption: text,
  });
  return `${base}/lab?${params.toString()}`;
}

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.size[0], height: viewport.size[1] },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const shortUrl = captionUrl(SHORT_CAPTION);
  const shortResponse = await page.goto(shortUrl, { waitUntil: 'networkidle', timeout: 60000 });
  if (!shortResponse || shortResponse.status() >= 400) {
    errors.push(`${viewport.name} short: status ${shortResponse?.status()}`);
    await context.close();
    continue;
  }
  await page.waitForSelector('[data-scaled-slide] .caption-line');
  await page.waitForTimeout(400);
  const short = await measure(page);
  await page.screenshot({
    path: join(outDir, `caption-${viewport.name}-short.png`),
    fullPage: false,
  });

  const longUrl = captionUrl(LONG_CAPTION);
  const longResponse = await page.goto(longUrl, { waitUntil: 'networkidle', timeout: 60000 });
  if (!longResponse || longResponse.status() >= 400) {
    errors.push(`${viewport.name} long: status ${longResponse?.status()}`);
    await context.close();
    continue;
  }
  await page.waitForSelector('[data-scaled-slide] .caption-line');
  await page.waitForTimeout(400);
  const long = await measure(page);
  await page.screenshot({
    path: join(outDir, `caption-${viewport.name}-long.png`),
    fullPage: false,
  });

  if (short.questionInput || long.questionInput) {
    errors.push(`${viewport.name}: typed question input is present`);
  }

  if (long.captionTitle !== LONG_CAPTION || long.captionAria !== LONG_CAPTION) {
    errors.push(
      `${viewport.name}: caption title/aria did not keep the full transcript (title=${JSON.stringify(long.captionTitle)} aria=${JSON.stringify(long.captionAria)})`
    );
  }
  if (long.captionText !== LONG_CAPTION) {
    errors.push(`${viewport.name}: caption DOM text was truncated`);
  }
  if (
    !long.captionStyle ||
    long.captionStyle.whiteSpace !== 'nowrap' ||
    long.captionStyle.textOverflow !== 'ellipsis' ||
    long.captionStyle.overflow !== 'hidden'
  ) {
    errors.push(`${viewport.name}: caption is not one-line ellipsis (${JSON.stringify(long.captionStyle)})`);
  }

  const checks = [
    ['sheet', short.sheet, long.sheet],
    ['court', short.court, long.court],
    ['courtFrame', short.courtFrame, long.courtFrame],
    ['scaled', short.scaled, long.scaled],
    ['credits', short.credits, long.credits],
    ['captionRow', short.captionRow, long.captionRow],
  ];
  for (const [label, before, after] of checks) {
    const drift = moved(before, after);
    if (drift) {
      errors.push(`${viewport.name}: ${label} moved (${drift})`);
    }
  }

  const rightEdge = moved(short.court, long.court, ['right']);
  if (rightEdge) {
    errors.push(`${viewport.name}: court right edge moved (${rightEdge})`);
  }

  console.log(
    `${viewport.name}: sheet ${boxLabel(long.sheet)}; court right ${long.court?.right.toFixed(2)}; scaled ${boxLabel(long.scaled)}; credits ${boxLabel(long.credits)}`
  );

  await context.close();
}

const playerContext = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const playerPage = await playerContext.newPage();
const playerResponse = await playerPage.goto(`${base}/player`, {
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
  if (hasQuestionUi) {
    errors.push('/player welcome still has typed-question UI');
  } else {
    console.log('/player welcome: no typed-question UI');
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

console.log('caption layout stable across short and long transcripts');
