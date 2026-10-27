// AFF Studio — เว็บสั่งงานคลิป (มือถือ) : เก็บงาน / อัปโหลด / เรียก n8n (Gemini, ElevenLabs) / สั่งตัวตัดต่อ
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3100);
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const JOBS_DIR = path.join(DATA, 'jobs');
const DB_FILE = path.join(DATA, 'db.json');
const PASSWORD = process.env.STUDIO_PASSWORD || '';
const SECRET = process.env.STUDIO_SECRET || crypto.randomBytes(32).toString('hex');
const N8N = (process.env.N8N_INTERNAL || 'http://n8n:5678').replace(/\/$/, '');
const RENDERER = (process.env.RENDERER_URL || 'http://aff-renderer:3000').replace(/\/$/, '');
const RENDER_TOKEN = process.env.RENDER_TOKEN || '';
const SELF = (process.env.SELF_INTERNAL || `http://aff-studio:${PORT}`).replace(/\/$/, '');
const VOICE_ID = process.env.VOICE_ID || 'XrExE9yKIg1WjnnlVkGX';
fs.mkdirSync(JOBS_DIR, { recursive: true });

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- ที่เก็บงาน (ไฟล์ JSON เดียว — งานของคนเดียว ปริมาณไม่มาก) ----------
let db = { seq: 0, jobs: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { /* เริ่มใหม่ */ }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 50);
}
const now = () => new Date().toISOString();
function update(job, patch) {
  Object.assign(job, patch, { updatedAt: now() });
  save();
  return job;
}

// ---------- ล็อกอิน ----------
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
function makeSession() {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  return `${exp}.${sign(String(exp))}`;
}
function validSession(s) {
  if (!s) return false;
  const [exp, sig] = s.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
const cookie = (req, name) => {
  const m = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
};
const attempts = new Map();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'x';
  const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60 * 1000) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 10) return res.status(429).json({ error: 'ลองผิดหลายครั้ง รอ 15 นาที' });
  const pw = String(req.body?.password || '');
  const ok = PASSWORD && pw.length === PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pw), Buffer.from(PASSWORD));
  if (!ok) { a.n++; attempts.set(ip, a); return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' }); }
  attempts.delete(ip);
  res.setHeader('Set-Cookie', `aff_sid=${makeSession()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`);
  res.json({ ok: true });
});
app.post('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'aff_sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.json({ ok: true });
});

// ไฟล์สื่อของงาน — ให้ตัวตัดต่อดึงได้ด้วยลิงก์ที่มีรหัสลับประจำงาน
app.get('/m/:id/:tok/:file', (req, res) => {
  const job = db.jobs[req.params.id];
  if (!job || job.tok !== req.params.tok) return res.status(404).end();
  const f = path.basename(req.params.file);
  res.sendFile(path.join(JOBS_DIR, job.id, f), (e) => e && res.status(404).end());
});

// ตัวตัดต่อแจ้งผล
app.post('/api/render-done', (req, res) => {
  res.json({ ok: true });
  let meta = {};
  try { meta = JSON.parse(req.body?.metadata || '{}'); } catch { /* */ }
  const job = db.jobs[meta.job];
  if (!job || job.tok !== meta.tok) return;
  if (req.body.status === 'succeeded') {
    update(job, { status: 'done', clip: { url: req.body.url, snapshot: req.body.snapshot_url, renderId: req.body.id, at: now() }, error: '' });
    log('คลิปเสร็จ', job.code);
  } else {
    update(job, { status: 'failed', error: 'ตัดต่อไม่สำเร็จ: ' + (req.body.error_message || 'unknown') });
  }
});

app.get('/api/health', (_q, r) => r.json({ ok: true, jobs: Object.keys(db.jobs).length }));

// ทุกอย่างด้านล่างต้องล็อกอิน
const auth = (req, res, next) => (validSession(cookie(req, 'aff_sid')) ? next() : res.status(401).json({ error: 'login' }));
app.get('/api/me', auth, (_q, r) => r.json({ ok: true }));

const view = (j) => {
  const m = (f) => `m/${j.id}/${j.tok}/${f}`;
  return { ...j, tok: undefined, files: (j.files || []).map((f) => ({ ...f, url: m(f.name) })), media: m('') };
};

app.get('/api/jobs', auth, (_q, r) => {
  const list = Object.values(db.jobs).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(view);
  const month = now().slice(0, 7);
  const thisMonth = list.filter((j) => j.createdAt.startsWith(month));
  r.json({
    jobs: list,
    stats: {
      month: thisMonth.length,
      done: thisMonth.filter((j) => j.status === 'done').length,
      posted: thisMonth.filter((j) => Object.values(j.posted || {}).some(Boolean)).length,
    },
  });
});
app.get('/api/jobs/:id', auth, (q, r) => {
  const j = db.jobs[q.params.id];
  return j ? r.json(view(j)) : r.status(404).json({ error: 'ไม่พบงาน' });
});

app.post('/api/jobs', auth, (q, r) => {
  const id = crypto.randomUUID();
  db.seq = (db.seq || 0) + 1;
  const job = {
    id, code: 'S' + String(db.seq).padStart(4, '0'), tok: crypto.randomBytes(12).toString('hex'),
    type: ['box', 'long', 'self', 'story'].includes(q.body?.type) ? q.body.type : 'box',
    status: 'draft', link: String(q.body?.link || ''), files: [], hero: '', product: {}, reviews: {}, extra: String(q.body?.extra || ''),
    length: q.body?.length || '30 วิ', script: null, clip: null, error: '',
    posted: { tiktok: false, shopee: false, facebook: false, instagram: false },
    createdAt: now(), updatedAt: now(),
  };
  fs.mkdirSync(path.join(JOBS_DIR, id), { recursive: true });
  db.jobs[id] = job;
  save();
  r.json(view(job));
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024, files: 20 } });
app.post('/api/jobs/:id/files', auth, upload.array('files', 20), async (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  const dir = path.join(JOBS_DIR, job.id);
  for (const f of q.files || []) {
    const n = (job.files.length + 1).toString().padStart(2, '0');
    if (f.mimetype.startsWith('video/')) {
      const name = `v${n}.mp4`;
      fs.writeFileSync(path.join(dir, name), f.buffer);
      job.files.push({ name, kind: 'video', mime: f.mimetype });
    } else if (f.mimetype.startsWith('image/')) {
      const name = `i${n}.jpg`;
      try {
        const out = await sharp(f.buffer).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 86 }).toFile(path.join(dir, name));
        job.files.push({ name, kind: 'unsorted', w: out.width, h: out.height });
      } catch (e) { log('อ่านรูปไม่ได้', f.originalname, e.message); }
    }
  }
  update(job, {});
  r.json(view(job));
});

app.delete('/api/jobs/:id/files/:name', auth, (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  job.files = job.files.filter((f) => f.name !== q.params.name);
  if (job.hero === q.params.name) job.hero = '';
  fs.rmSync(path.join(JOBS_DIR, job.id, path.basename(q.params.name)), { force: true });
  r.json(view(update(job, {})));
});

// แก้ข้อมูล: ช่องสินค้า / กลุ่มรูป / รูปหลัก / บท / สถานะโพสต์
app.patch('/api/jobs/:id', auth, (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  const b = q.body || {};
  const patch = {};
  for (const k of ['link', 'extra', 'length', 'type', 'hero']) if (k in b) patch[k] = b[k];
  if (b.product) patch.product = { ...job.product, ...b.product };
  if (b.script) patch.script = { ...(job.script || {}), ...b.script };
  if (b.posted) patch.posted = { ...job.posted, ...b.posted };
  if (b.kinds) job.files.forEach((f) => { if (b.kinds[f.name]) f.kind = b.kinds[f.name]; });
  r.json(view(update(job, patch)));
});

app.delete('/api/jobs/:id', auth, (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  delete db.jobs[job.id];
  fs.rmSync(path.join(JOBS_DIR, job.id), { recursive: true, force: true });
  save();
  r.json({ ok: true });
});

// ---------- เรียก n8n (เก็บคีย์ Gemini/ElevenLabs ไว้ที่ n8n ที่เดียว) ----------
async function n8n(pathName, body, timeoutMs = 180000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(`${N8N}/webhook/${pathName}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal,
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`n8n ${pathName} ${r.status}: ${text.slice(0, 300)}`);
    let j = JSON.parse(text);
    if (Array.isArray(j)) j = j[0];
    if (j && j.error) throw new Error(String(j.error));
    return j;
  } finally { clearTimeout(t); }
}

const b64 = (job, name) => fs.readFileSync(path.join(JOBS_DIR, job.id, name)).toString('base64');

// 1) AI แยกรูป + อ่านข้อมูลสินค้า/รีวิว
app.post('/api/jobs/:id/analyze', auth, async (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  const imgs = job.files.filter((f) => f.kind !== 'video');
  if (!imgs.length && !job.link) return r.status(400).json({ error: 'ใส่ลิงก์หรืออัปรูปก่อน' });
  update(job, { status: 'analyzing', error: '' });
  r.json(view(job));
  try {
    const small = await Promise.all(imgs.map(async (f) => ({
      id: f.name, mime: 'image/jpeg',
      data: (await sharp(path.join(JOBS_DIR, job.id, f.name)).resize({ width: 1100, height: 1100, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()).toString('base64'),
    })));
    const res = await n8n('studio-analyze', { type: job.type, link: job.link, extra: job.extra, images: small });
    const kinds = Object.fromEntries((res.images || []).map((i) => [i.id, i.kind]));
    job.files.forEach((f) => { if (f.kind !== 'video' && kinds[f.id || f.name]) f.kind = kinds[f.name]; });
    const p = res.product || {};
    const keep = (k) => (job.product?.[k] ? job.product[k] : p[k] || '');
    update(job, {
      status: 'ready',
      hero: job.hero || res.hero || (job.files.find((f) => f.kind === 'product') || {}).name || '',
      product: { name: keep('name'), price: keep('price'), shop: keep('shop'), rating: keep('rating'), sold: keep('sold'), features: keep('features') },
      reviews: res.reviews || {},
      src: res.sources || {},
    });
  } catch (e) {
    log('analyze', e.message);
    update(job, { status: 'failed', error: 'AI อ่านรูปไม่สำเร็จ: ' + e.message.slice(0, 200) });
  }
});

// 2) AI เขียนบท + แคปชัน 4 แพลตฟอร์ม
app.post('/api/jobs/:id/script', auth, async (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  if (q.body && Object.keys(q.body).length) {
    if (q.body.product) job.product = { ...job.product, ...q.body.product };
    if ('extra' in q.body) job.extra = q.body.extra;
    if ('length' in q.body) job.length = q.body.length;
  }
  update(job, { status: 'scripting', error: '' });
  r.json(view(job));
  try {
    const res = await n8n('studio-script', { type: job.type, length: job.length, product: job.product, reviews: job.reviews, extra: job.extra, link: job.link });
    update(job, { status: 'script', script: res });
  } catch (e) {
    log('script', e.message);
    update(job, { status: 'failed', error: 'AI เขียนบทไม่สำเร็จ: ' + e.message.slice(0, 200) });
  }
});

// 2b) AI เขียนบทภาพ (คลิปเรื่องเล่า)
app.post('/api/jobs/:id/storyboard', auth, async (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  if (q.body?.product) job.product = { ...job.product, ...q.body.product };
  if ('extra' in (q.body || {})) job.extra = q.body.extra;
  if ('length' in (q.body || {})) job.length = q.body.length;
  update(job, { status: 'scripting', error: '' });
  r.json(view(job));
  try {
    const res = await n8n('studio-story', { product: job.product, plot: job.extra, length: job.length });
    if (!Array.isArray(res.shots) || !res.shots.length) throw new Error('AI ไม่ได้ส่งช็อตกลับมา');
    res.shots = res.shots.slice(0, 8).map((s, i) => ({ ...s, n: i + 1 }));
    update(job, { status: 'script', script: res });
  } catch (e) {
    log('storyboard', e.message);
    update(job, { status: 'failed', error: 'AI เขียนบทภาพไม่สำเร็จ: ' + e.message.slice(0, 200) });
  }
});

const SHOT_COST = 0.8; // ~8 วิ x $0.10 (720p)
async function renderStory(job) {
  const dir = path.join(JOBS_DIR, job.id);
  const m = (f) => `${SELF}/m/${job.id}/${job.tok}/${f}`;
  const products = job.files.filter((f) => f.kind === 'product');
  const hero = job.hero || products[0]?.name || '';
  let heroB64 = '';
  if (hero) heroB64 = (await sharp(path.join(dir, hero)).resize({ width: 1024, height: 1024, fit: 'inside' }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
  const shots = job.script.shots;
  update(job, { status: 'shooting', progress: { done: 0, total: shots.length } });
  let spent = 0;
  const one = async (sh, i) => {
    const file = `shot${i + 1}.mp4`;
    const key = sh.visual + '|' + (sh.useProduct ? hero : '');
    if (sh.file === file && sh.key === key && fs.existsSync(path.join(dir, file))) return; // ใช้ช็อตเดิม ไม่เสียเงินซ้ำ
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await n8n('studio-shot', { prompt: sh.visual, image: sh.useProduct && attempt === 0 ? heroB64 : '' }, 420000);
        if (!res.video_base64) throw new Error('ไม่ได้วิดีโอ');
        fs.writeFileSync(path.join(dir, file), Buffer.from(res.video_base64, 'base64'));
        Object.assign(sh, { file, key, failed: false });
        spent += SHOT_COST;
        return;
      } catch (e) { log('shot', i + 1, attempt, e.message.slice(0, 200)); }
    }
    Object.assign(sh, { file: '', key: '', failed: true }); // ใช้รูปสินค้าแทน
  };
  let next = 0, done = 0;
  const worker = async () => {
    while (next < shots.length) {
      const i = next++;
      await one(shots[i], i);
      done++;
      update(job, { progress: { done, total: shots.length } });
    }
  };
  await Promise.all([worker(), worker()]);
  const fallback = (i) => (products.length ? products[i % products.length].name : hero);
  const voText = [...shots.map((s) => String(s.vo || '').trim()), String(job.script.endVo || '').trim()].filter(Boolean).join(' ');
  update(job, { status: 'voicing', cost: { ...(job.cost || {}), video: Math.round(((job.cost?.video || 0) + spent) * 100) / 100 } });
  const voice = await n8n('studio-voice', { text: voText, voice_id: VOICE_ID });
  if (!voice?.audio_base64) throw new Error('ไม่ได้ไฟล์เสียง');
  update(job, { status: 'rendering' });
  const rr = await fetch(`${RENDERER}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-render-token': RENDER_TOKEN },
    body: JSON.stringify({
      type: 'story',
      voiceover: { audio_base64: voice.audio_base64, alignment: voice.alignment, normalized_alignment: voice.normalized_alignment, text: voText },
      shots: shots.map((s, i) => (s.file ? { url: m(s.file), kind: 'video', vo: s.vo, onscreen: s.onscreen || '' } : { url: m(fallback(i)), kind: 'image', vo: s.vo, onscreen: s.onscreen || '' })),
      endVo: job.script.endVo || '', endImage: hero ? m(hero) : '',
      price: job.script.price || job.product.price || '', cta: (job.script.cta || 'กดตะกร้าเลย') + ' 👇',
      webhook_url: `${SELF}/api/render-done`, metadata: JSON.stringify({ job: job.id, tok: job.tok }),
    }),
  });
  if (!rr.ok) throw new Error(`ตัวตัดต่อตอบ ${rr.status}: ${(await rr.text()).slice(0, 200)}`);
  const { id } = await rr.json();
  update(job, { renderId: id });
}

// 3) อนุมัติ → เสียงพากย์ → ตัดต่อ
const OPEN = 'ระเบิดกล่องสินค้า แนะนำ!';
app.post('/api/jobs/:id/render', auth, async (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job) return r.status(404).json({ error: 'ไม่พบงาน' });
  if (!job.script?.voiceover && !job.script?.shots) return r.status(400).json({ error: 'ยังไม่มีบท' });
  if (q.body?.script) job.script = { ...job.script, ...q.body.script };
  if (job.type === 'story') {
    if (q.body?.shots) job.script.shots = q.body.shots.map((s, i) => ({ ...(job.script.shots[i] || {}), ...s }));
    update(job, { error: '', clip: null });
    r.json(view(job));
    try { await renderStory(job); } catch (e) { log('story', e.message); update(job, { status: 'failed', error: e.message.slice(0, 300) }); }
    return;
  }
  update(job, { status: 'voicing', error: '', clip: null });
  r.json(view(job));
  try {
    let vo = String(job.script.voiceover).trim().replace(/^เอาตรงๆเลยนะ\s*จากรีวิว\s*/, '');
    if (job.type === 'box' && !vo.startsWith(OPEN.slice(0, -1))) vo = OPEN + ' ' + vo;
    const voice = await n8n('studio-voice', { text: vo, voice_id: VOICE_ID });
    if (!voice?.audio_base64) throw new Error('ไม่ได้ไฟล์เสียง');
    const m = (f) => `${SELF}/m/${job.id}/${job.tok}/${f}`;
    const products = job.files.filter((f) => f.kind === 'product');
    const hero = job.hero || products[0]?.name || '';
    const reviews = job.files.filter((f) => f.kind === 'review').slice(0, 3);
    const shots = products.filter((f) => f.name !== hero);
    update(job, { status: 'rendering' });
    const rr = await fetch(`${RENDERER}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-render-token': RENDER_TOKEN },
      body: JSON.stringify({
        type: 'review',
        voiceover: { audio_base64: voice.audio_base64, alignment: voice.alignment, normalized_alignment: voice.normalized_alignment, text: vo },
        hero: hero ? m(hero) : '', reviews: reviews.map((f) => m(f.name)), shots: shots.map((f) => m(f.name)),
        price: job.script.price || job.product.price || '', cta: (job.script.cta || 'กดตะกร้าได้เลย') + ' 👇',
        webhook_url: `${SELF}/api/render-done`, metadata: JSON.stringify({ job: job.id, tok: job.tok }),
      }),
    });
    if (!rr.ok) throw new Error(`ตัวตัดต่อตอบ ${rr.status}: ${(await rr.text()).slice(0, 200)}`);
    const { id } = await rr.json();
    update(job, { renderId: id });
  } catch (e) {
    log('render', e.message);
    update(job, { status: 'failed', error: e.message.slice(0, 300) });
  }
});

// ความคืบหน้าการตัดต่อ
app.get('/api/jobs/:id/progress', auth, async (q, r) => {
  const job = db.jobs[q.params.id];
  if (!job?.renderId) return r.json({ progress: null });
  try {
    const x = await fetch(`${RENDERER}/renders/${job.renderId}`).then((y) => y.json());
    r.json({ progress: x.progress ?? null, status: x.status });
  } catch { r.json({ progress: null }); }
});

// หน้าเว็บ
app.use(express.static(path.join(ROOT, 'public'), { index: 'index.html', maxAge: 0 }));
app.get(/^\/(?!api\/|m\/).*/, (_q, r) => r.sendFile(path.join(ROOT, 'public', 'index.html')));

app.listen(PORT, () => log(`AFF Studio ฟังที่พอร์ต ${PORT}${PASSWORD ? '' : ' — ⚠️ ยังไม่ได้ตั้งรหัสผ่าน (STUDIO_PASSWORD)'}`));
