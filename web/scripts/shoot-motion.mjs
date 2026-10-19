#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const webRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outDir = process.env.SHOT_DIR ?? join(webRoot, 'screenshots');
const evidenceDir = process.env.EVIDENCE_DIR ?? '/tmp/task12-evidence';
const base = process.env.LAB_URL ?? 'http://127.0.0.1:3000';

mkdirSync(outDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

function txOf(transform) {
  if (!transform || transform === 'none') return 0;
  const matrix3d = transform.match(/matrix3d\((.+)\)/);
  if (matrix3d) {
    const parts = matrix3d[1].split(',').map((part) => Number(part.trim()));
    return parts[12] ?? 0;
  }
  const matrix = transform.match(/matrix\((.+)\)/);
  if (matrix) {
    const parts = matrix[1].split(',').map((part) => Number(part.trim()));
    return parts[4] ?? 0;
  }
  return 0;
}

async function record(name, path, { reducedMotion = false, frames = 10, gap = 80 } = {}) {
  const dir = join(evidenceDir, name);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    recordVideo: { dir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const response = await page.goto(`${base}${path}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.addStyleTag({
    content:
      'nextjs-portal, [data-next-badge-root], #__next-build-watcher { display: none !important; }',
  });
  if (!response || response.status() >= 400) {
    errors.push(`${name}: status ${response?.status()}`);
    await context.close();
    return;
  }
  const fromId = new URL(path, 'http://lab.local').searchParams.get('from') ?? 's1_tipoff';
  await page.waitForSelector(`[data-slide-layer="${fromId}"][data-seq="1"]`, { timeout: 15000 });
  await page.evaluate(() => {
    window.__pushSamples = [];
    const started = performance.now();
    const tick = () => {
      window.__pushSamples.push({
        t: Math.round(performance.now() - started),
        layers: [...document.querySelectorAll('[data-slide-layer]')].map((el) => ({
          id: el.getAttribute('data-slide-layer'),
          seq: el.getAttribute('data-seq'),
          state: el.getAttribute('data-state'),
          dir: el.getAttribute('data-dir'),
          transform: getComputedStyle(el).transform,
        })),
      });
      if (performance.now() - started < 1400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const layers = [];
  for (let i = 0; i < frames; i += 1) {
    const file = join(dir, `frame-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, fullPage: false, animations: 'allow' });
    const state = await page.evaluate(() =>
      [...document.querySelectorAll('[data-slide-layer]')].map((el) => ({
        id: el.getAttribute('data-slide-layer'),
        seq: el.getAttribute('data-seq'),
        state: el.getAttribute('data-state'),
        dir: el.getAttribute('data-dir'),
        transform: getComputedStyle(el).transform,
      }))
    );
    layers.push({ frame: i, state });
    await page.waitForTimeout(gap);
  }
  const samples = await page.evaluate(() => window.__pushSamples ?? []);
  writeFileSync(join(dir, 'frames.json'), JSON.stringify({ layers, samples }, null, 2));
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: false });
  const video = page.video();
  await context.close();
  if (video) {
    await video.saveAs(join(evidenceDir, `${name}.webm`));
    await video.delete().catch(() => undefined);
  }
  console.log(`${name}: ${layers.length} frames, ${samples.length} samples`);
  return { layers, samples };
}

const forward = await record('push-forward', '/lab?view=push&from=s1_tipoff&to=s2_lebron');
const backward = await record('push-backward', '/lab?view=push&from=s3_kyrie&to=s2_lebron');
const rapid = await record('push-rapid', '/lab?view=push&from=s1_tipoff&to=s2_lebron&rapid=1');
const reduced = await record('push-reduced', '/lab?view=push&from=s1_tipoff&to=s2_lebron', {
  reducedMotion: true,
});

function lastPresent(run) {
  const frames = run?.layers ?? [];
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    const present = frames[i].state.find(
      (layer) => layer.state === 'present' || layer.state === 'enter'
    );
    if (present) return present.id;
  }
  return frames.at(-1)?.state.at(-1)?.id ?? null;
}

function translated(run) {
  const rows = [
    ...(run?.samples ?? []),
    ...(run?.layers ?? []).map((frame) => ({ layers: frame.state })),
  ];
  return rows.some((row) =>
    (row.layers ?? []).some((layer) => Math.abs(txOf(layer.transform)) > 40)
  );
}

if (forward?.layers?.[0]?.state?.[0]?.id !== 's1_tipoff') {
  errors.push(`forward started on ${forward?.layers?.[0]?.state?.[0]?.id} not s1_tipoff`);
}
if (backward?.layers?.[0]?.state?.[0]?.id !== 's3_kyrie') {
  errors.push(`backward started on ${backward?.layers?.[0]?.state?.[0]?.id} not s3_kyrie`);
}
if (lastPresent(forward) !== 's2_lebron') {
  errors.push(`forward settled on ${lastPresent(forward)} not s2_lebron`);
}
if (lastPresent(backward) !== 's2_lebron') {
  errors.push(`backward settled on ${lastPresent(backward)} not s2_lebron`);
}
if (lastPresent(rapid) !== 's4_offense') {
  errors.push(`rapid interrupt settled on ${lastPresent(rapid)} not s4_offense`);
}
if (lastPresent(reduced) !== 's2_lebron') {
  errors.push(`reduced motion settled on ${lastPresent(reduced)} not s2_lebron`);
}
if (!translated(forward)) errors.push('forward capture missed a horizontal push');
if (!translated(backward)) errors.push('backward capture missed a horizontal push');
const reducedAnimated = (reduced?.samples ?? []).some((sample) =>
  sample.layers.some((layer) => layer.state === 'enter' || layer.state === 'exit')
);
if (reducedAnimated) {
  errors.push('reduced motion still used enter/exit layers');
}
if (translated(reduced)) {
  errors.push('reduced motion still translated layers');
}

await browser.close();

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('slide push forward, backward, rapid, and reduced-motion checks passed');
