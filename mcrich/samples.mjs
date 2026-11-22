// Mc Rich — ตัวอย่างจริงของการ์ด "แนวงานฮิต": ระบบสร้างภาพ/คลิปตัวอย่างให้อัตโนมัติ (ไม่ตัดดาว) เก็บถาวรแยกจากผลงานลูกค้า
import fs from 'node:fs';
import path from 'node:path';

// สินค้าตัวอย่างตามหมวด (เลือกจากแท็กของการ์ด)
const DEMO = [
  { tags: ['อาหาร ขนม'], product: 'ขนมเปี๊ยะไส้ทุเรียน', price: '฿59', details: 'แป้งบาง ไส้แน่น หอมทุเรียนหมอนทอง กล่องละ 4 ชิ้น' },
  { tags: ['ความงาม'], product: 'เซรั่มวิตามินซี', price: '฿199', details: 'ผิวดูกระจ่างใส ซึมไว ไม่เหนียวเหนอะหนะ ขวด 30 ml' },
  { tags: ['แฟชั่น'], product: 'กระเป๋าผ้าสะพายข้าง', price: '฿290', details: 'ผ้าแคนวาสหนา ใส่ของได้เยอะ มี 4 สี' },
  { tags: ['ของใช้ในบ้าน'], product: 'ไม้ถูพื้นสเปรย์ 2in1', price: '฿259', details: 'ฉีดน้ำได้ในตัว ผ้าไมโครไฟเบอร์ ซักได้' },
  { tags: ['ไอที แก็ดเจ็ต'], product: 'หูฟังไร้สาย', price: '฿390', details: 'เสียงชัด แบตอึด 24 ชม. ตัดเสียงรบกวน' },
  { tags: ['แม่และเด็ก'], product: 'บล็อกไม้เสริมพัฒนาการ', price: '฿199', details: 'ไม้ธรรมชาติ สีปลอดภัย 50 ชิ้น' },
  { tags: ['สุขภาพ'], product: 'น้ำผักผลไม้สกัดเย็น', price: '฿49', details: 'ไม่มีน้ำตาลเพิ่ม สดใหม่ทุกวัน' },
  { tags: ['เปิดกล่อง / สุ่ม', 'Affiliate'], product: 'กล่องสุ่มของเล่น', price: '฿99', details: 'สุ่มได้ทุกกล่อง ลุ้นตัวพิเศษ' },
];
const demoFor = (t) => DEMO.find((d) => d.tags.some((x) => (t.tags || []).includes(x))) || DEMO[1];

export function registerSamples(app, { q, auth, wrap, log, DATA_DIR, create }) {
  const DIR = path.join(DATA_DIR, 'samples');
  fs.mkdirSync(DIR, { recursive: true });
  const admin = async (req, res, next) => {
    const u = (await q('SELECT is_admin FROM users WHERE id=$1', [req.uid])).rows[0];
    if (!u?.is_admin) return res.status(403).json({ error: 'เฉพาะแอดมิน' });
    next();
  };
  let SYS = null;
  async function sysUser() {
    if (SYS) return SYS;
    let u = (await q("SELECT id FROM users WHERE public_id='MRSYSTEM'")).rows[0];
    if (!u) {
      u = (await q(`INSERT INTO users(public_id,name,referral_code,onboarded,banned,terms_version) VALUES('MRSYSTEM','Mc Rich ตัวอย่าง','SYSTEMMCR',TRUE,TRUE,'system')
        ON CONFLICT (public_id) DO UPDATE SET name=EXCLUDED.name RETURNING id`)).rows[0];
      await q('INSERT INTO profiles(user_id) VALUES($1) ON CONFLICT DO NOTHING', [u.id]);
      await q('INSERT INTO free_quota(user_id, welcome_left) VALUES($1,0) ON CONFLICT DO NOTHING', [u.id]);
    }
    SYS = Number(u.id);
    return SYS;
  }
  const setSample = (id, s) => q('UPDATE trends SET sample=$2 WHERE id=$1', [id, s]);
  const work = async (id) => (await q('SELECT id, status, error, files, kind FROM works WHERE id=$1', [id])).rows[0];
  const keep = (w, tid) => {
    const f = w.files?.[0]; if (!f) throw new Error('ไม่มีไฟล์');
    const ext = path.extname(f.name) || '.jpg';
    const file = `t${tid}-${Date.now().toString(36)}${ext}`;
    fs.copyFileSync(path.join(create.WORK_DIR, path.basename(f.name)), path.join(DIR, file));
    let poster = '';
    if (f.thumb && fs.existsSync(path.join(create.WORK_DIR, path.basename(f.thumb)))) {
      poster = `t${tid}-${Date.now().toString(36)}p${path.extname(f.thumb)}`;
      fs.copyFileSync(path.join(create.WORK_DIR, path.basename(f.thumb)), path.join(DIR, poster));
    }
    return { file, poster };
  };

  // ขั้นตอน: (คลิป) สร้างรูปสินค้าตัวอย่าง → ใช้เป็นรูปสินค้าทำคลิป · (ภาพ) สร้างภาพตามแนวเลย
  async function step(t) {
    const s = t.sample || {};
    const carry = s.file ? { kind: s.kind, file: s.file, poster: s.poster } : {};
    const setSample = (id, o) => q('UPDATE trends SET sample=$2 WHERE id=$1', [id, o.status === 'done' ? o : { ...carry, ...o }]); // ระหว่างสร้างใหม่ ยังโชว์ตัวอย่างเดิม
    const uid = await sysUser();
    const d = demoFor(t);
    const base = { goal: 'sell', product: d.product, price: d.price, details: d.details, tier: 'std', versions: 1, tone: 'เป็นกันเอง' };
    if (!s.status || s.status === 'queued') {
      if (t.kind === 'image' || t.style === 'v_tips') {
        const r = await create.createInternal(uid, t.kind === 'image' ? { ...base, kind: 'image', style: t.style, headline: d.product } : { ...base, kind: 'video', style: t.style, product: `วิธีเลือก${d.product}`, count: 3, length: 30 }, [], 'ตัวอย่าง', { system: true });
        if (r.error) return setSample(t.id, { status: 'failed', error: r.error, at: Date.now() });
        return setSample(t.id, { status: 'render', workId: r.id, at: Date.now() });
      }
      const r = await create.createInternal(uid, { ...base, kind: 'image', style: 'product_luxury', headline: '' }, [], 'รูปสินค้าตัวอย่าง', { system: true });
      if (r.error) return setSample(t.id, { status: 'failed', error: r.error, at: Date.now() });
      return setSample(t.id, { status: 'photo', photoWork: r.id, at: Date.now() });
    }
    if (s.status === 'photo') {
      const w = await work(s.photoWork);
      if (!w || w.status === 'failed') return setSample(t.id, { status: 'failed', error: w?.error || 'สร้างรูปสินค้าไม่สำเร็จ', at: Date.now() });
      if (w.status !== 'done') return null;
      const photo = path.join(create.WORK_DIR, path.basename(w.files[0].name));
      const body = { ...base, kind: 'video', style: t.style, length: 15, variant: 'random', music: 'auto', captionStyle: 'pop' };
      if (t.style === 'v_drama') Object.assign(body, { genre: /ผี|สยอง/.test(t.title) ? 'ghost' : /ตลาด|แม่ค้า/.test(t.title) ? 'customer' : 'inlaw', art: 'cartoon3d', scenes: 4 });
      const r = await create.createInternal(uid, body, [photo], 'ตัวอย่าง', { system: true });
      if (r.error) return setSample(t.id, { status: 'failed', error: r.error, at: Date.now() });
      return setSample(t.id, { status: 'render', workId: r.id, at: Date.now() });
    }
    if (s.status === 'render') {
      const w = await work(s.workId);
      if (!w || w.status === 'failed') return setSample(t.id, { status: 'failed', error: w?.error || 'สร้างตัวอย่างไม่สำเร็จ', at: Date.now() });
      if (w.status === 'review') await q("UPDATE works SET status='queued' WHERE id=$1", [w.id]); // คลิปที่ต้องตรวจซับ: ให้ตัดต่อเลย
      if (w.status !== 'done') return Date.now() - s.at > 45 * 60e3 ? setSample(t.id, { status: 'failed', error: 'ใช้เวลานานเกินไป', at: Date.now() }) : null;
      const k = keep(w, t.id);
      [s.file, s.poster].filter(Boolean).forEach((f) => fs.rm(path.join(DIR, path.basename(f)), () => {}));
      log('sample done', t.id, t.style, k.file);
      return setSample(t.id, { status: 'done', kind: w.kind, ...k, workId: w.id, at: Date.now() });
    }
    return null;
  }
  let busy = false;
  async function tick() {
    if (busy) return; busy = true;
    try {
      // ทำทีละการ์ด กันใช้ AI พร้อมกันเยอะ · การ์ดที่ยังไม่มีตัวอย่างเลย สร้างให้อัตโนมัติ
      const rows = (await q("SELECT * FROM trends WHERE active ORDER BY sort, id")).rows;
      const cur = rows.find((t) => ['photo', 'render'].includes(t.sample?.status)) || rows.find((t) => t.sample?.status === 'queued') || rows.find((t) => !t.sample);
      if (cur) await step(cur);
    } catch (e) { log('sample tick', e.message); } finally { busy = false; }
  }

  app.get('/api/trends/:id/sample', auth, wrap(async (req, res) => {
    const t = (await q('SELECT sample FROM trends WHERE id=$1', [Number(req.params.id) || 0])).rows[0];
    const name = req.query.poster ? t?.sample?.poster : t?.sample?.file;
    const f = name && path.join(DIR, path.basename(name));
    if (!f || !fs.existsSync(f)) return res.status(404).end();
    res.setHeader('cache-control', 'private, max-age=86400'); res.sendFile(f);
  }));
  app.post('/api/admin/trends/:id/sample', auth, admin, wrap(async (req, res) => {
    const t = (await q('SELECT * FROM trends WHERE id=$1', [Number(req.params.id) || 0])).rows[0];
    if (!t) return res.status(404).json({ error: 'ไม่พบ' });
    if (['photo', 'render'].includes(t.sample?.status)) return res.status(409).json({ error: 'กำลังสร้างตัวอย่างอยู่' });
    await setSample(t.id, { status: 'queued', at: Date.now(), ...(t.sample?.file ? { kind: t.sample.kind, file: t.sample.file, poster: t.sample.poster } : {}) });
    setTimeout(() => tick(), 500);
    res.json({ ok: true });
  }));
  function start() { setTimeout(() => tick(), 30e3).unref(); setInterval(() => tick(), 60e3).unref(); }
  return { start };
}
