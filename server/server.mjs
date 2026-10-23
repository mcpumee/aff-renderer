// โรงงานตัดต่อคลิป Affiliate — รับงานจาก n8n แล้วเรนเดอร์ด้วย Remotion
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import { captionsFromAlignment } from './captions.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const OUT = path.join(DATA, 'out');
const TMP = path.join(DATA, 'tmp');
const PUBLIC_BASE = (process.env.PUBLIC_BASE || `http://localhost:${PORT}/files/`).replace(/\/?$/, '/');
const TOKEN = process.env.RENDER_TOKEN || '';
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 30);
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
const BROWSER = process.env.BROWSER_EXECUTABLE || null;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const LOCAL = `http://127.0.0.1:${PORT}`;
const HOOK_SEC = 3.6, END_SEC = 5, OUTRO_SEC = 2.5;

let serveUrl;
const queue = [];
let busy = false;
const jobs = new Map();

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function download(url, dest) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`ดาวน์โหลดไม่ได้ (${r.status}): ${url}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return dest;
}

/** ดาวน์โหลดไฟล์มาไว้ในเครื่อง (ดึงจาก n8n ครั้งเดียว) แล้วคืนลิงก์ภายใน */
async function localize(id, url, i, ext) {
  if (!url) return '';
  const name = `${id}-${i}.${ext}`;
  await download(url, path.join(TMP, name));
  return `${LOCAL}/tmp/${name}`;
}

async function probeSeconds(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim()) || 0;
}

async function buildProps(id, req) {
  if (req.type === 'review') {
    let audioUrl = '', captions = [], speechEnd = 0;
    if (req.voiceover?.audio_base64) {
      fs.writeFileSync(path.join(TMP, `${id}-vo.mp3`), Buffer.from(req.voiceover.audio_base64, 'base64'));
      audioUrl = `${LOCAL}/tmp/${id}-vo.mp3`;
      const al = req.voiceover.normalized_alignment || req.voiceover.alignment;
      captions = captionsFromAlignment(al);
      speechEnd = al?.character_end_times_seconds?.at(-1) || (await probeSeconds(path.join(TMP, `${id}-vo.mp3`)));
    }
    const imgs = async (arr, tag) => Promise.all((arr || []).filter(Boolean).map((u, i) => localize(id, u, `${tag}${i}`, 'jpg')));
    const [hero] = await imgs([req.hero], 'h');
    const reviewUrls = await imgs(req.reviews, 'r');
    const shotUrls = await imgs(req.shots, 's');
    const durationSec = Math.max(HOOK_SEC + END_SEC + 2, speechEnd + 0.8);
    return {
      comp: 'ReviewClip',
      props: {
        durationSec, audioUrl, captions,
        hookText: req.hookText || 'เอาตรงๆเลยนะ\nจากรีวิว',
        heroUrl: hero || shotUrls[0] || reviewUrls[0] || '',
        reviewUrls, shotUrls,
        price: req.price || '', cta: req.cta || 'กดตะกร้าได้เลย 👇',
      },
    };
  }
  if (req.type === 'self') {
    const dest = path.join(TMP, `${id}-v.mp4`);
    await download(req.videoUrl, dest);
    const videoSec = await probeSeconds(dest);
    if (!videoSec) throw new Error('อ่านความยาวคลิปไม่ได้ (ไฟล์อาจเสีย)');
    return {
      comp: 'SelfClip',
      props: {
        durationSec: videoSec + OUTRO_SEC, videoSec, videoUrl: `${LOCAL}/tmp/${id}-v.mp4`,
        captions: (req.captions || []).filter((c) => c && c.text && c.end > c.start),
        price: req.price || '', cta: req.cta || 'กดตะกร้าได้เลย\n👇',
      },
    };
  }
  throw new Error('type ต้องเป็น review หรือ self');
}

async function callback(job, body) {
  if (!job.webhook_url) return;
  try {
    await fetch(job.webhook_url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { log('callback ล้มเหลว', job.id, e.message); }
}

async function work(job) {
  const t0 = Date.now();
  job.status = 'rendering';
  try {
    const { comp, props } = await buildProps(job.id, job.req);
    const composition = await selectComposition({ serveUrl, id: comp, inputProps: props, browserExecutable: BROWSER });
    const out = path.join(OUT, `${job.id}.mp4`);
    await renderMedia({
      composition, serveUrl, browserExecutable: BROWSER, codec: 'h264', crf: 20, outputLocation: out, inputProps: props,
      concurrency: CONCURRENCY, chromiumOptions: { gl: 'swangle' }, timeoutInMilliseconds: 120000,
      onProgress: ({ progress }) => { job.progress = Math.round(progress * 100); },
    });
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.5', '-i', out, '-frames:v', '1', '-vf', 'scale=540:-2', path.join(OUT, `${job.id}.jpg`)]);
    job.status = 'succeeded';
    log('เสร็จ', job.id, comp, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await callback(job, { id: job.id, status: 'succeeded', url: `${PUBLIC_BASE}${job.id}.mp4`, snapshot_url: `${PUBLIC_BASE}${job.id}.jpg`, metadata: job.metadata });
  } catch (e) {
    job.status = 'failed';
    job.error = e.message;
    log('ล้มเหลว', job.id, e.stack || e.message);
    await callback(job, { id: job.id, status: 'failed', error_message: String(e.message).slice(0, 500), metadata: job.metadata });
  } finally {
    for (const f of fs.readdirSync(TMP)) if (f.startsWith(job.id)) fs.rmSync(path.join(TMP, f), { force: true });
  }
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) await work(queue.shift());
  busy = false;
}

function cleanup() {
  const limit = Date.now() - KEEP_DAYS * 864e5;
  for (const f of fs.readdirSync(OUT)) {
    const p = path.join(OUT, f);
    if (fs.statSync(p).mtimeMs < limit) fs.rmSync(p, { force: true });
  }
}

const app = express();
app.use(express.json({ limit: '30mb' }));
app.use('/files', express.static(OUT, { maxAge: '7d' }));
app.use('/tmp', express.static(TMP));
app.get('/health', (_q, r) => r.json({ ok: !!serveUrl, queue: queue.length, busy }));
app.get('/renders/:id', (q, r) => {
  const j = jobs.get(q.params.id);
  if (!j) return r.status(404).json({ error: 'not found' });
  r.json({ id: j.id, status: j.status, progress: j.progress || 0, error: j.error });
});
app.post('/render', (q, r) => {
  if (TOKEN && q.get('x-render-token') !== TOKEN) return r.status(401).json({ error: 'unauthorized' });
  if (!serveUrl) return r.status(503).json({ error: 'กำลังเริ่มระบบ ลองใหม่อีกสักครู่' });
  const body = q.body || {};
  const id = crypto.randomUUID();
  const job = { id, status: 'queued', req: body, webhook_url: body.webhook_url, metadata: body.metadata };
  jobs.set(id, job);
  queue.push(job);
  pump();
  r.status(202).json({ id, status: 'queued', position: queue.length });
});

app.listen(PORT, async () => {
  log(`aff-renderer ฟังที่พอร์ต ${PORT}`);
  await ensureBrowser({ browserExecutable: BROWSER });
  serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
  log('พร้อมเรนเดอร์');
  cleanup();
  setInterval(cleanup, 3600e3);
});
