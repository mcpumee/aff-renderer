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
const CUTOUT_PY = process.env.CUTOUT_PY || 'python3';
const OPEN_PHRASE = 'ระเบิดกล่องสินค้า แนะนำ';

/** ตัดพื้นหลังหลายรูปในครั้งเดียว (โหลดโมเดลครั้งเดียว) */
async function cutouts(files) {
  if (!files.length) return [];
  const args = [path.join(ROOT, 'server', 'cutout.py')];
  for (const f of files) args.push(f, f.replace(/\.jpg$/, '-cut.png'));
  try {
    const { stdout } = await run(CUTOUT_PY, args, { timeout: 180000, maxBuffer: 1 << 20 });
    const res = JSON.parse(stdout.trim().split('\n').pop());
    return res.map((r, i) => ({ ...r, file: files[i].replace(/\.jpg$/, '-cut.png') }));
  } catch (e) {
    log('ตัดพื้นหลังไม่สำเร็จ ใช้แบบการ์ดแทน', e.message.slice(0, 200));
    return files.map(() => ({ ok: false, reason: 'cutout error' }));
  }
}

/** ธีมกล่องของขวัญ — เลือกให้ตัดกับสีสินค้า และสุ่มคงที่ตามงาน */
const THEMES = {
  goldRed: { bg: ['#F6E7C8', '#C49A5A'], box: '#A3192A', boxDark: '#6E0F1B', ribbon: '#FFF4DE', baubles: ['#C8102E', '#D9AE3B'], confetti: ['#C8102E', '#E9C46A', '#FFFFFF', '#8B0000'] },
  navy: { bg: ['#2A3F6B', '#0C1428'], box: '#D9AE3B', boxDark: '#9C7A20', ribbon: '#1E2E55', baubles: ['#D9AE3B', '#DDE3EE'], confetti: ['#D9AE3B', '#FFFFFF', '#8FB3FF', '#F4D58D'] },
  emerald: { bg: ['#EEF6EE', '#8FC2A0'], box: '#17694A', boxDark: '#0C4430', ribbon: '#F4D35E', baubles: ['#F4D35E', '#C8102E'], confetti: ['#F4D35E', '#FFFFFF', '#17694A', '#C8102E'] },
  pink: { bg: ['#FFE9F0', '#F2A1B8'], box: '#D93D68', boxDark: '#9E1F44', ribbon: '#FFFFFF', baubles: ['#FF8FB1', '#E8C26B'], confetti: ['#FFFFFF', '#FF8FB1', '#E8C26B', '#D93D68'] },
  purple: { bg: ['#F1E9FF', '#AE93E6'], box: '#5A2CA0', boxDark: '#3A1870', ribbon: '#F7D774', baubles: ['#F7D774', '#C9B6FF'], confetti: ['#F7D774', '#FFFFFF', '#9B6BFF', '#5A2CA0'] },
  orange: { bg: ['#FFF2E8', '#FFB27D'], box: '#EE4D2D', boxDark: '#B5321A', ribbon: '#FFFFFF', baubles: ['#EE4D2D', '#FFD23F'], confetti: ['#FFD23F', '#FFFFFF', '#EE4D2D', '#FF9F68'] },
};
function pickTheme(hue, seed) {
  let pool;
  if (hue == null) pool = Object.keys(THEMES);
  else if (hue < 40 || hue >= 330) pool = ['navy', 'emerald']; // สินค้าสีแดง/ส้ม/ชมพู
  else if (hue < 170) pool = ['goldRed', 'purple', 'pink']; // เหลือง/เขียว
  else if (hue < 260) pool = ['orange', 'goldRed']; // ฟ้า/น้ำเงิน
  else pool = ['goldRed', 'emerald']; // ม่วง
  const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return THEMES[pool[h % pool.length]];
}

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

/** ขนาดรูปจริง (กว้าง×สูง) */
async function probeSize(file) {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]);
    const [w, h] = stdout.trim().split('x').map(Number);
    return w && h ? { w, h } : null;
  } catch { return null; }
}

/** รูปเล็กกว่าจอ: ขยายด้วย lanczos + เพิ่มความคมเล็กน้อย (ดีกว่าให้เบราว์เซอร์ยืดเอง) */
async function enhanceImage(file) {
  const size = await probeSize(file);
  if (!size) return { w: 1080, h: 1920 };
  if (size.w >= 1080) return size;
  const out = file.replace(/\.jpg$/, '-hd.jpg');
  try {
    await run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf',
      'scale=1080:-2:flags=lanczos,unsharp=5:5:0.6:5:5:0.0', '-q:v', '2', out]);
    fs.renameSync(out, file);
  } catch (e) { log('enhance ไม่สำเร็จ ใช้รูปเดิม', e.message); }
  return size; // ขนาดต้นฉบับ (ใช้ตัดสินว่ารูปเล็กไหม)
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
      let al = req.voiceover.normalized_alignment || req.voiceover.alignment;
      const audioSec = await probeSeconds(path.join(TMP, `${id}-vo.mp3`));
      if (!al?.characters?.length && req.voiceover.text && audioSec) {
        // ไม่มีเวลาต่อตัวอักษร → กระจายข้อความเท่า ๆ กันตามความยาวเสียง (ซับยังขึ้น แม้ไม่ตรงเป๊ะ)
        const ch = [...String(req.voiceover.text)], per = audioSec / ch.length;
        al = { characters: ch, character_start_times_seconds: ch.map((_, i) => i * per), character_end_times_seconds: ch.map((_, i) => (i + 1) * per) };
      }
      captions = captionsFromAlignment(al);
      speechEnd = al?.character_end_times_seconds?.at(-1) || audioSec;
    }
    const sizes = {};
    const imgs = async (arr, tag, enhance) => Promise.all((arr || []).filter(Boolean).map(async (u, i) => {
      const url = await localize(id, u, `${tag}${i}`, 'jpg');
      if (enhance) sizes[url] = await enhanceImage(path.join(TMP, `${id}-${tag}${i}.jpg`));
      return url;
    }));
    const [hero] = await imgs([req.hero], 'h', true);
    const reviewUrls = await imgs(req.reviews, 'r', false);
    const shotUrls = await imgs(req.shots, 's', true);

    // ฉากเปิด: ตัดพื้นหลังรูปสินค้า (รูปหลัก + มุมอื่นอีกไม่เกิน 2) — ตัดไม่สวยใช้แบบการ์ด
    const local = (u) => path.join(TMP, path.basename(u));
    const heroSrc = hero || shotUrls[0] || '';
    const extraSrc = shotUrls.filter((u) => u !== heroSrc).slice(0, 3);
    const cuts = heroSrc ? await cutouts([heroSrc, ...extraSrc].map(local)) : [];
    const asUrl = (f) => `${LOCAL}/tmp/${path.basename(f)}`;
    let products = [];
    if (cuts[0]?.ok) {
      products.push({ url: asUrl(cuts[0].file), w: cuts[0].w, h: cuts[0].h, cut: true });
      for (const c of cuts.slice(1)) if (c.ok && products.length < 3) products.push({ url: asUrl(c.file), w: c.w, h: c.h, cut: true });
    } else if (heroSrc) {
      const sz = sizes[heroSrc] || { w: 1080, h: 1350 };
      products.push({ url: heroSrc, w: sz.w, h: sz.h, cut: false });
    }
    log('ฉากเปิด', id, cuts.map((c) => (c.ok ? 'ตัดได้' : `การ์ด(${c.reason})`)).join(', '));
    const theme = pickTheme(cuts[0]?.hue ?? null, id);

    // จังหวะระเบิด = ตอนพูด "ระเบิดกล่องสินค้า แนะนำ" จบ
    let burstSec = 1.6;
    const alN = req.voiceover?.normalized_alignment || req.voiceover?.alignment;
    if (alN?.characters?.length) {
      const txt = alN.characters.join('');
      const at = txt.indexOf(OPEN_PHRASE);
      if (at >= 0 && at < 5) burstSec = alN.character_end_times_seconds[at + OPEN_PHRASE.length - 1] + 0.1;
    }
    burstSec = Math.min(3, Math.max(1.1, burstSec));
    const nRev = Math.min(3, reviewUrls.length);
    const introSec = burstSec + 1.4 + nRev * 0.75 + 1.2;
    const durationSec = Math.max(introSec + END_SEC + 2, speechEnd + 0.8);
    return {
      comp: 'ReviewClip',
      props: {
        durationSec, audioUrl, captions,
        hookText: req.hookText || 'ระเบิดกล่องสินค้า\nแนะนำ!',
        burstSec, introSec, products, theme,
        snapshotSec: burstSec + 1.1,
        heroUrl: hero || shotUrls[0] || reviewUrls[0] || '',
        reviewUrls, shotUrls, sizes,
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
    // ย้าย moov ไว้หน้าไฟล์ ให้มือถือ/LINE เล่นได้ทันทีขณะโหลด
    const fast = out.replace(/\.mp4$/, '.fs.mp4');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-c', 'copy', '-movflags', '+faststart', fast]);
    fs.renameSync(fast, out);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(props.snapshotSec || 1.5), '-i', out, '-frames:v', '1', '-vf', 'scale=540:-2', path.join(OUT, `${job.id}.jpg`)]);
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
