// Mc Rich — โหมดอัตโนมัติ: สร้างภาพ/คลิปให้ตามวันเวลา หมุนแนวงานไม่ซ้ำ ตั้งเวลาโพสต์ให้ มีเพดานดาวต่อเดือน
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { TIERS } from './create.mjs';

export const AUTO_STYLES = [
  { id: 'sale_banner', kind: 'image', label: 'ป้ายโปรแรง', est: 5 },
  { id: 'product_luxury', kind: 'image', label: 'ภาพสินค้าพื้นหรู', est: 5 },
  { id: 'product_life', kind: 'image', label: 'สินค้าในชีวิตจริง', est: 5 },
  { id: 'aff_cover', kind: 'image', label: 'ภาพป้ายยา', est: 5 },
  { id: 'poster_menu', kind: 'image', label: 'โปสเตอร์เมนู', est: 5 },
  { id: 'v_mystery', kind: 'video', label: 'คลิปกล่องสุ่ม', est: 0 },
  { id: 'v_egg', kind: 'video', label: 'คลิปไข่ปริศนา', est: 0 },
  { id: 'v_gift', kind: 'video', label: 'คลิประเบิดกล่อง', est: 0 },
  { id: 'v_gacha', kind: 'video', label: 'คลิปกาชาปอง', est: 0 },
  { id: 'v_claw', kind: 'video', label: 'คลิปตู้คีบตุ๊กตา', est: 0 },
  { id: 'v_rocket', kind: 'video', label: 'คลิปจรวดพลุ', est: 0 },
  { id: 'v_show', kind: 'video', label: 'คลิปโชว์สินค้า', est: 0 },
  { id: 'v_sell', kind: 'video', label: 'คลิปป้ายยา', est: 0 },
  { id: 'v_tips', kind: 'video', label: 'คลิปทิปน่ารู้', est: 0 },
];
const PLAT = ['tiktok', 'facebook', 'instagram', 'youtube', 'line', 'shopee', 'lazada'];
const LEAD_MIN = 40; // สร้างล่วงหน้าก่อนเวลาโพสต์

export function registerAuto(app, { q, auth, wrap, log, DATA_DIR, rand, create, videoPrice, notify }) {
  const DIR = path.join(DATA_DIR, 'auto');
  fs.mkdirSync(DIR, { recursive: true });
  const upload = multer({ dest: path.join(DATA_DIR, 'tmp'), limits: { fileSize: 10 * 1024 * 1024, files: 3 } });
  const est = (st, len) => (st.kind === 'image' ? (TIERS.find((t) => t.id === 'std')?.stars || 5) : videoPrice[len] || videoPrice[15]);
  const thaiNow = () => new Date(Date.now() + 7 * 3600e3);
  const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const monthKey = () => thaiNow().toISOString().slice(0, 7);
  const perMonth = (p) => {
    const sts = p.styles.map((id) => AUTO_STYLES.find((x) => x.id === id)).filter(Boolean);
    const avg = sts.length ? sts.reduce((a, s) => a + est(s, p.video_len), 0) / sts.length : 0;
    return Math.round(avg * p.days.length * 4.35);
  };
  const view = (p) => ({
    id: p.id, name: p.name, active: p.active, goal: p.goal, product: p.product, styles: p.styles, days: p.days, time: p.post_time, platforms: p.platforms,
    videoLen: p.video_len, cap: p.cap_month, spent: p.spent_month === monthKey() ? p.spent_stars : 0, estMonth: perMonth(p), runs: p.runs,
    lastRun: p.last_run_date, lastWorkId: p.last_work_id, lastError: p.last_error, photos: p.refs.length,
    thumb: p.refs[0] ? `api/auto/${p.id}/photo` : '',
  });
  function normalize(b) {
    const product = { name: clean(b.product?.name, 80), price: clean(b.product?.price, 40), details: clean(b.product?.details, 500), link: /^https?:\/\/\S+$/i.test(clean(b.product?.link, 300)) ? clean(b.product?.link, 300) : '' };
    const styles = (Array.isArray(b.styles) ? b.styles : []).filter((id) => AUTO_STYLES.some((s) => s.id === id)).slice(0, 12);
    const days = [...new Set((Array.isArray(b.days) ? b.days : []).map(Number).filter((d) => d >= 0 && d <= 6))].sort();
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(b.time) ? b.time : '19:00';
    const platforms = (Array.isArray(b.platforms) ? b.platforms : []).filter((x) => PLAT.includes(x));
    const cap = Math.min(5000, Math.max(10, Number(b.cap) || 300));
    const goal = ['sell', 'aff', 'promo', 'content'].includes(b.goal) ? b.goal : 'sell';
    if (!product.name) return { error: 'ใส่ชื่อสินค้าก่อน' };
    if (!styles.length) return { error: 'เลือกแนวงานอย่างน้อย 1 แบบ' };
    if (!days.length) return { error: 'เลือกวันอย่างน้อย 1 วัน' };
    return { name: clean(b.name, 60) || product.name, product, styles, days, time, platforms, cap, goal, videoLen: [15, 30].includes(Number(b.videoLen)) ? Number(b.videoLen) : 15 };
  }

  app.get('/api/auto', auth, wrap(async (req, res) => {
    const { rows } = await q('SELECT * FROM auto_plans WHERE user_id=$1 ORDER BY id', [req.uid]);
    res.json({ items: rows.map(view), styles: AUTO_STYLES.map((s) => ({ ...s, est: est(s, 15), est30: est(s, 30) })), leadMin: LEAD_MIN });
  }));
  app.get('/api/auto/:id/photo', auth, wrap(async (req, res) => {
    const p = (await q('SELECT refs FROM auto_plans WHERE id=$1 AND user_id=$2', [Number(req.params.id) || 0, req.uid])).rows[0];
    const f = p?.refs?.[0] && path.join(DIR, path.basename(p.refs[0]));
    if (!f || !fs.existsSync(f)) return res.status(404).end();
    res.setHeader('cache-control', 'private, max-age=3600'); res.sendFile(f);
  }));
  app.post('/api/auto', auth, upload.array('refs', 3), wrap(async (req, res) => {
    const cleanup = () => (req.files || []).forEach((f) => fs.rm(f.path, { force: true }, () => {}));
    try {
      let b; try { b = JSON.parse(req.body?.data || '{}'); } catch { return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' }); }
      const n = normalize(b);
      if (n.error) return res.status(400).json({ error: n.error });
      const cnt = (await q('SELECT count(*)::int n FROM auto_plans WHERE user_id=$1', [req.uid])).rows[0].n;
      if (cnt >= 10) return res.status(429).json({ error: 'ตั้งได้สูงสุด 10 แผน' });
      const needPhoto = n.styles.some((id) => AUTO_STYLES.find((s) => s.id === id)?.kind === 'video' && id !== 'v_tips');
      if (needPhoto && !(req.files || []).length) return res.status(400).json({ error: 'แนวคลิปต้องมีรูปสินค้าอย่างน้อย 1 รูป' });
      const refs = [];
      for (const f of req.files || []) {
        const name = `${req.uid}-${Date.now().toString(36)}${rand(5).toLowerCase()}.jpg`;
        await sharp(f.path).rotate().resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(path.join(DIR, name));
        refs.push(name);
      }
      const p = (await q(`INSERT INTO auto_plans(user_id,name,goal,product,refs,styles,days,post_time,platforms,video_len,cap_month,spent_month)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.uid, n.name, n.goal, n.product, refs, n.styles, n.days, n.time, n.platforms, n.videoLen, n.cap, monthKey()])).rows[0];
      res.json(view(p));
    } finally { cleanup(); }
  }));
  app.patch('/api/auto/:id', auth, wrap(async (req, res) => {
    const p = (await q('SELECT * FROM auto_plans WHERE id=$1 AND user_id=$2', [Number(req.params.id) || 0, req.uid])).rows[0];
    if (!p) return res.status(404).json({ error: 'ไม่พบแผน' });
    const b = req.body || {};
    if (typeof b.active === 'boolean') await q("UPDATE auto_plans SET active=$2, last_error=CASE WHEN $2 THEN '' ELSE last_error END WHERE id=$1", [p.id, b.active]);
    if (b.cap) await q('UPDATE auto_plans SET cap_month=$2 WHERE id=$1', [p.id, Math.min(5000, Math.max(10, Number(b.cap) || p.cap_month))]);
    if (b.full) {
      const n = normalize({ ...b.full, product: { ...p.product, ...(b.full.product || {}) } });
      if (n.error) return res.status(400).json({ error: n.error });
      await q('UPDATE auto_plans SET name=$2,goal=$3,product=$4,styles=$5,days=$6,post_time=$7,platforms=$8,video_len=$9,cap_month=$10 WHERE id=$1',
        [p.id, n.name, n.goal, n.product, n.styles, n.days, n.time, n.platforms, n.videoLen, n.cap]);
    }
    res.json(view((await q('SELECT * FROM auto_plans WHERE id=$1', [p.id])).rows[0]));
  }));
  app.delete('/api/auto/:id', auth, wrap(async (req, res) => {
    const p = (await q('DELETE FROM auto_plans WHERE id=$1 AND user_id=$2 RETURNING refs', [Number(req.params.id) || 0, req.uid])).rows[0];
    (p?.refs || []).forEach((r) => fs.rm(path.join(DIR, path.basename(r)), () => {}));
    res.json({ ok: true });
  }));
  app.post('/api/auto/:id/run', auth, wrap(async (req, res) => {
    const p = (await q('SELECT * FROM auto_plans WHERE id=$1 AND user_id=$2', [Number(req.params.id) || 0, req.uid])).rows[0];
    if (!p) return res.status(404).json({ error: 'ไม่พบแผน' });
    const r = await runPlan(p, true);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json(r);
  }));

  // ---------- ตัวรัน ----------
  async function runPlan(p, manual) {
    const now = thaiNow();
    const today = now.toISOString().slice(0, 10);
    const mk = monthKey();
    const spent = p.spent_month === mk ? p.spent_stars : 0;
    const st = AUTO_STYLES.find((s) => s.id === p.styles[p.rot % p.styles.length]) || AUTO_STYLES[0];
    const cost = est(st, p.video_len);
    if (spent + cost > p.cap_month) {
      await q("UPDATE auto_plans SET last_run_date=$2, last_error=$3 WHERE id=$1", [p.id, today, `ครบเพดาน ${p.cap_month} ดาวของเดือนนี้แล้ว`]);
      return { error: `ครบเพดาน ${p.cap_month} ดาวของเดือนนี้แล้ว` };
    }
    const tones = ['เป็นกันเอง', 'ขายตรง ปิดการขาย', 'ตลก ขำๆ'];
    const hashtags = (await q('SELECT hashtags FROM profiles WHERE user_id=$1', [p.user_id])).rows[0]?.hashtags || [];
    const body = {
      kind: st.kind, style: st.id, goal: p.goal, product: p.product.name, price: p.product.price, details: p.product.details, link: p.product.link,
      headline: st.kind === 'image' ? (p.product.price ? p.product.name.slice(0, 30) : '') : '', tier: 'std', versions: 1, length: p.video_len,
      variant: 'random', music: 'auto', tone: tones[p.runs % tones.length], hashtags, useLogo: true, captionStyle: ['pop', 'box', 'karaoke'][p.runs % 3],
      ...(st.id === 'v_tips' ? { count: 3 } : {}),
    };
    const files = p.refs.map((r) => path.join(DIR, path.basename(r)));
    const r = await create.createInternal(p.user_id, body, st.kind === 'image' ? files.slice(0, 1) : files, p.name);
    if (r.error) {
      await q('UPDATE auto_plans SET last_run_date=$2, last_error=$3 WHERE id=$1', [p.id, today, r.lowStars ? `ดาวไม่พอ (ต้องใช้ ${r.cost} มี ${r.bal})` : r.error]);
      if (r.lowStars) notify(p.user_id, `⚠️ โหมดอัตโนมัติ "${p.name}" ข้ามวันนี้เพราะดาวไม่พอ\nเติมดาวแล้วระบบจะทำต่อเอง`).catch(() => {});
      return { error: r.lowStars ? 'ดาวไม่พอ' : r.error };
    }
    // ตั้งเวลาโพสต์ตามเวลาของแผน (ถ้าเลยเวลาแล้วให้เตือนหลังงานเสร็จประมาณ 15 นาที)
    const [hh, mm] = p.post_time.split(':').map(Number);
    let at = new Date(`${today}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+07:00`);
    if (at.getTime() < Date.now() + 15 * 60e3) at = new Date(Date.now() + (st.kind === 'video' ? 20 : 15) * 60e3);
    for (const pf of p.platforms) await q('INSERT INTO schedules(user_id,work_id,platform,at,note) VALUES($1,$2,$3,$4,$5)', [p.user_id, r.id, pf, at, `อัตโนมัติ: ${p.name}`]);
    await q(`UPDATE auto_plans SET rot=rot+1, runs=runs+1, last_run_date=$2, last_work_id=$3, last_error='',
      spent_stars=CASE WHEN spent_month=$4 THEN spent_stars+$5 ELSE $5 END, spent_month=$4 WHERE id=$1`, [p.id, manual ? p.last_run_date : today, r.id, mk, r.cost]);
    log('auto run', p.id, st.id, `work=${r.id}`, `cost=${r.cost}`);
    return { workId: r.id, style: st.label, cost: r.cost, at };
  }
  async function tick() {
    const now = thaiNow();
    const today = now.toISOString().slice(0, 10);
    const dow = now.getUTCDay();
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const { rows } = await q("SELECT * FROM auto_plans WHERE active AND (last_run_date IS NULL OR last_run_date < $1::date) AND $2 = ANY(days)", [today, dow]);
    for (const p of rows) {
      const [hh, mm] = p.post_time.split(':').map(Number);
      const runAt = hh * 60 + mm - LEAD_MIN;
      if (minutes < runAt || minutes > hh * 60 + mm + 120) continue; // ช่วงเวลารัน: 40 นาทีก่อนโพสต์ ถึง 2 ชม.หลัง
      try { await runPlan(p, false); } catch (e) { log('auto fail', p.id, e.message); await q('UPDATE auto_plans SET last_run_date=$2, last_error=$3 WHERE id=$1', [p.id, today, 'ระบบขัดข้อง']); }
    }
  }
  function start() { setInterval(() => tick().catch((e) => log('auto tick', e.message)), 60e3).unref(); }
  return { start };
}
