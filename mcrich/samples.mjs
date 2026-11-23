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

// ข้อมูลตัวอย่างของแต่ละแนวงานภาพ (ให้ภาพตัวอย่างตรงประเภทงาน)
const ORG = { org: 'องค์กรตัวอย่าง' };
const STYLE_DEMO = {
  poster_menu: { product: 'ข้าวมันไก่ต้ม', headline: 'เมนูแนะนำ อร่อยต้องลอง', price: '฿50' },
  product_luxury: { product: 'เซรั่มวิตามินซี', details: 'ขวดแก้วหยด 30 ml' },
  product_life: { product: 'แก้วเก็บความเย็นสแตนเลส', details: 'วางบนโต๊ะทำงาน แสงเช้า' },
  sale_banner: { product: 'รองเท้าผ้าใบ', headline: 'ลดแรง 50%', price: 'เหลือ ฿390' },
  aff_cover: { product: 'หม้อทอดไร้น้ำมัน', headline: 'ของมันต้องมี!' },
  before_after: { product: 'น้ำยาขัดรองเท้า', headline: 'สะอาดเหมือนใหม่' },
  shop_news: { product: 'ร้านกาแฟบ้านสวน', headline: 'เปิดใหม่!', price: 'ลด 20% สัปดาห์แรก' },
  knowledge: { product: 'วิธีเก็บผักให้สดนาน', headline: '5 เคล็ดลับเก็บผักให้สด' },
  pr_announce: { product: 'ประกาศวันหยุด', headline: 'ประกาศหยุดทำการ', price: 'วันที่ 5 ธันวาคม', info: ORG },
  pr_event: { product: 'งานวันเด็ก', headline: 'ขอเชิญร่วมงานวันเด็ก', info: { ...ORG, date: '10 มกราคม', place: 'ลานกิจกรรม' } },
  pr_news: { product: 'กิจกรรมปลูกป่าชายเลน', headline: 'ข่าวประชาสัมพันธ์', info: ORG },
  pr_congrats: { product: 'ความสำเร็จของทีม', headline: 'ขอแสดงความยินดี', info: ORG },
  pr_hiring: { product: 'รับสมัครพนักงานขาย', headline: 'รับสมัครงาน', price: 'หลายตำแหน่ง', info: ORG },
  pr_festival: { product: 'วันขึ้นปีใหม่', headline: 'สวัสดีปีใหม่', info: ORG },
  agent_plan: { product: 'ประกันสุขภาพเหมาจ่าย', headline: 'คุ้มครองค่ารักษาเหมาจ่าย', price: 'ปรึกษาฟรี', agentType: 'insurance', details: 'ค่าห้อง ค่าผ่าตัด ผู้ป่วยใน' },
  agent_listing: { product: 'บ้านเดี่ยว 2 ชั้น 3 ห้องนอน', headline: 'ขายบ้านพร้อมอยู่', price: '2.59 ล้าน', agentType: 'property', info: { place: 'ใกล้ถนนใหญ่ หาดใหญ่' } },
  agent_tips: { product: 'เลือกประกันสุขภาพยังไงไม่พลาด', headline: '4 เรื่องต้องรู้ก่อนทำประกันสุขภาพ', agentType: 'insurance' },
  agent_case: { product: 'ลูกค้าแอดมิทผ่าตัดไส้ติ่ง', headline: 'เคสเคลมจริงของลูกค้า', agentType: 'insurance' },
  agent_profile: { product: 'ตัวแทนประกันชีวิต', headline: 'ปรึกษาประกันฟรี ดูแลตลอดสัญญา', agentType: 'insurance' },
  agent_compare: { product: 'เช่าคอนโด vs ซื้อคอนโด', headline: 'เช่าหรือซื้อ คุ้มกว่า?', agentType: 'property' },
  pr_condolence: { product: 'ไว้อาลัย', headline: 'ขอแสดงความเสียใจอย่างสุดซึ้ง', price: 'ด้วยความอาลัยยิ่ง', info: ORG },
};

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
  // ---------- ภาพตัวอย่างของแต่ละแนวงานภาพ ----------
  async function styleStep() {
    const ids = Object.keys(STYLE_DEMO);
    const rows = Object.fromEntries((await q('SELECT * FROM style_samples')).rows.map((r) => [r.style, r]));
    const cur = ids.map((id) => rows[id]).find((r) => r?.status === 'render') || ids.map((id) => rows[id]).find((r) => r?.status === 'queued') || (ids.find((id) => !rows[id]) && { style: ids.find((id) => !rows[id]), status: 'new' });
    if (!cur) return false;
    const set = (o) => q(`INSERT INTO style_samples(style,file,status,work_id,error,at) VALUES($1,$2,$3,$4,$5,now())
      ON CONFLICT (style) DO UPDATE SET file=EXCLUDED.file, status=EXCLUDED.status, work_id=EXCLUDED.work_id, error=EXCLUDED.error, at=now()`, [cur.style, o.file ?? cur.file ?? '', o.status, o.work_id ?? null, o.error || '']);
    if (cur.status !== 'render') {
      const d = STYLE_DEMO[cur.style];
      const r = await create.createInternal(await sysUser(), { kind: 'image', style: cur.style, goal: cur.style.startsWith('pr_') ? 'pr' : cur.style.startsWith('agent_') ? 'agent' : 'sell', tier: 'std', versions: 1, tone: 'เป็นกันเอง', ...d }, [], 'ตัวอย่างแนวงาน', { system: true });
      await set(r.error ? { status: 'failed', error: r.error } : { status: 'render', work_id: r.id });
      return true;
    }
    const w = await work(cur.work_id);
    if (!w || w.status === 'failed') { await set({ status: 'failed', error: w?.error || 'สร้างไม่สำเร็จ' }); return true; }
    if (w.status !== 'done') { if (Date.now() - new Date(cur.at) > 30 * 60e3) await set({ status: 'failed', error: 'ใช้เวลานานเกินไป' }); return true; }
    const f = w.files?.[0];
    const src = f && path.join(create.WORK_DIR, path.basename(f.thumb || f.name));
    if (!src || !fs.existsSync(src)) { await set({ status: 'failed', error: 'ไม่มีไฟล์' }); return true; }
    const file = `s-${cur.style}-${Date.now().toString(36)}${path.extname(src)}`;
    fs.copyFileSync(src, path.join(DIR, file));
    if (cur.file) fs.rm(path.join(DIR, path.basename(cur.file)), () => {});
    await set({ status: 'done', file, work_id: w.id });
    log('style sample done', cur.style);
    return true;
  }
  app.get('/api/style-samples', auth, wrap(async (_req, res) => {
    const img = Object.fromEntries((await q("SELECT style, file, at FROM style_samples WHERE file<>''")).rows.map((r) => [r.style, `api/style-samples/${r.style}?v=${new Date(r.at).getTime()}`]));
    const vid = {};
    for (const t of (await q("SELECT id, style, sample FROM trends WHERE active AND sample->>'poster' IS NOT NULL ORDER BY sort, id")).rows) if (!vid[t.style]) vid[t.style] = `api/trends/${t.id}/sample?poster=1&v=${t.sample.at}`;
    res.setHeader('cache-control', 'private, max-age=300');
    res.json({ image: img, video: vid });
  }));
  app.get('/api/style-samples/:style', auth, wrap(async (req, res) => {
    const r = (await q('SELECT file FROM style_samples WHERE style=$1', [String(req.params.style)])).rows[0];
    const f = r?.file && path.join(DIR, path.basename(r.file));
    if (!f || !fs.existsSync(f)) return res.status(404).end();
    res.setHeader('cache-control', 'private, max-age=86400'); res.sendFile(f);
  }));
  app.get('/api/admin/style-samples', auth, admin, wrap(async (_req, res) => {
    const rows = Object.fromEntries((await q('SELECT * FROM style_samples')).rows.map((r) => [r.style, r]));
    res.json({ items: Object.keys(STYLE_DEMO).map((id) => ({ style: id, status: rows[id]?.status || 'none', error: rows[id]?.error || '', src: rows[id]?.file ? `api/style-samples/${id}?v=${new Date(rows[id].at).getTime()}` : '' })) });
  }));
  app.post('/api/admin/style-samples/:style', auth, admin, wrap(async (req, res) => {
    if (!STYLE_DEMO[req.params.style]) return res.status(404).json({ error: 'ไม่พบแนวงาน' });
    await q(`INSERT INTO style_samples(style,status) VALUES($1,'queued') ON CONFLICT (style) DO UPDATE SET status='queued', error='', at=now() WHERE style_samples.status<>'render'`, [req.params.style]);
    setTimeout(() => tick(), 500);
    res.json({ ok: true });
  }));

  let busy = false;
  async function tick() {
    if (busy) return; busy = true;
    try {
      // ทำทีละการ์ด กันใช้ AI พร้อมกันเยอะ · การ์ดที่ยังไม่มีตัวอย่างเลย สร้างให้อัตโนมัติ
      const rows = (await q("SELECT * FROM trends WHERE active ORDER BY sort, id")).rows;
      const cur = rows.find((t) => ['photo', 'render'].includes(t.sample?.status)) || rows.find((t) => t.sample?.status === 'queued') || rows.find((t) => !t.sample);
      if (cur) await step(cur);
      await styleStep(); // ภาพตัวอย่างแนวงานภาพ ทำคู่ขนานทีละแบบ
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
