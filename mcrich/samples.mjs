// Mc Rich — ตัวอย่างจริงของการ์ด "แนวงานฮิต": ระบบสร้างภาพ/คลิปตัวอย่างให้อัตโนมัติ (ไม่ตัดดาว) เก็บถาวรแยกจากผลงานลูกค้า
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { STYLES } from './create.mjs';
import * as V from './video.mjs';

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
  model_show: { product: 'ชุดว่ายน้ำวันพีซสีขาว', headline: 'คอลเลกชันซัมเมอร์', modelWho: 'female', modelLook: 'clean' },
  agent_plan: { product: 'ประกันสุขภาพเหมาจ่าย', headline: 'คุ้มครองค่ารักษาเหมาจ่าย', price: 'ปรึกษาฟรี', agentType: 'insurance', details: 'ค่าห้อง ค่าผ่าตัด ผู้ป่วยใน' },
  agent_listing: { product: 'บ้านเดี่ยว 2 ชั้น 3 ห้องนอน', headline: 'ขายบ้านพร้อมอยู่', price: '2.59 ล้าน', agentType: 'property', info: { place: 'ใกล้ถนนใหญ่ หาดใหญ่' } },
  agent_tips: { product: 'เลือกประกันสุขภาพยังไงไม่พลาด', headline: '4 เรื่องต้องรู้ก่อนทำประกันสุขภาพ', agentType: 'insurance' },
  agent_case: { product: 'ลูกค้าแอดมิทผ่าตัดไส้ติ่ง', headline: 'เคสเคลมจริงของลูกค้า', agentType: 'insurance' },
  agent_profile: { product: 'ตัวแทนประกันชีวิต', headline: 'ปรึกษาประกันฟรี ดูแลตลอดสัญญา', agentType: 'insurance' },
  agent_compare: { product: 'เช่าคอนโด vs ซื้อคอนโด', headline: 'เช่าหรือซื้อ คุ้มกว่า?', agentType: 'property' },
  pr_condolence: { product: 'ไว้อาลัย', headline: 'ขอแสดงความเสียใจอย่างสุดซึ้ง', price: 'ด้วยความอาลัยยิ่ง', info: ORG },
};

// แนวงานภาพที่ไม่มีข้อมูลเฉพาะ → ใช้สินค้าตัวอย่างกลาง
const imgDemo = (st) => STYLE_DEMO[st.id] || (st.pr ? { product: 'กิจกรรมขององค์กร', headline: st.label, info: ORG } : st.agent ? { product: 'ประกันสุขภาพเหมาจ่าย', headline: st.label, agentType: 'insurance' } : { product: 'เซรั่มวิตามินซี', headline: st.text ? 'ผิวใสใน 7 วัน' : '', price: '฿199', details: 'ขวดแก้วหยด 30 ml' });
const imgGoal = (st) => (st.pr ? 'pr' : st.agent ? 'agent' : 'sell');
// แนวคลิป: ต้องใช้ของจริงของลูกค้า (อวตาร/โปรเจกต์หนัง/คลิปที่ถ่ายเอง) → แอดมินอัปโหลดหรือเลือกจากผลงานแทน
const VID_MANUAL = ['v_film', 'v_avatar', 'v_self'];
const VID_NOPHOTO = ['v_tips', 'v_agent_tips', 'v_agent_plan', 'v_pr_announce', 'v_series'];
const P0 = { product: 'เซรั่มวิตามินซี', price: '฿199', details: 'ผิวดูกระจ่างใส ซึมไว ไม่เหนียวเหนอะหนะ ขวด 30 ml' };
function vidBody(id) {
  const base = { kind: 'video', style: id, goal: 'sell', tier: 'std', versions: 1, tone: 'เป็นกันเอง', length: 15, variant: 'random', music: 'auto', captionStyle: 'pop', ...P0 };
  const info = { ...base, count: 3, length: 30 };
  return ({
    v_tips: { ...info, goal: 'content', product: 'วิธีเลือกเซรั่มให้เหมาะกับผิว' },
    v_shop: { ...info, goal: 'sell', product: 'ร้านกาแฟบ้านสวน', details: 'กาแฟดริป ขนมโฮมเมด บรรยากาศสวน', price: '' },
    v_agent_plan: { ...info, goal: 'agent', agentType: 'insurance', product: 'ประกันสุขภาพเหมาจ่าย', details: 'ค่าห้อง ค่าผ่าตัด ผู้ป่วยใน', price: 'ปรึกษาฟรี' },
    v_agent_tips: { ...info, goal: 'agent', agentType: 'insurance', product: '4 เรื่องต้องรู้ก่อนทำประกันสุขภาพ', price: '' },
    v_agent_listing: { ...info, goal: 'agent', agentType: 'property', product: 'บ้านเดี่ยว 2 ชั้น 3 ห้องนอน', details: 'ใกล้ถนนใหญ่ หาดใหญ่ พร้อมอยู่', price: '2.59 ล้าน' },
    v_pr_announce: { ...info, goal: 'pr', product: 'ประกาศวันหยุดทำการ', details: 'หยุดวันที่ 5 ธันวาคม เปิดปกติวันที่ 6', price: '', info: ORG },
    v_pr_recap: { ...info, goal: 'pr', product: 'กิจกรรมปลูกป่าชายเลน', details: 'พนักงานร่วมปลูกต้นโกงกาง 500 ต้น', price: '', info: ORG },
    v_series: { ...base, goal: 'content', product: 'ไข่มุกวิเศษแห่งทะเลใต้', genre: 'magic', art: 'cartoon3d', scenes: 4 },
    v_drama: { ...base, genre: 'customer', art: 'cartoon3d', scenes: 4 },
    v_motion: { ...base, preset: 'spin' },
  })[id] || base;
}

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
  // ทุกแนวงาน (ภาพ + คลิป) ที่ต้องมีตัวอย่าง
  const ALL = () => [
    ...STYLES.map((x) => ({ id: x.id, kind: 'image', label: x.label })),
    ...V.VIDEO_STYLES.map((x) => ({ id: x.id, kind: 'video', label: x.label, manual: VID_MANUAL.includes(x.id) })),
  ];
  async function styleStep() {
    const all = ALL().filter((x) => !x.manual);
    const rows = Object.fromEntries((await q('SELECT * FROM style_samples')).rows.map((r) => [r.style, r]));
    // คลิปที่มีตัวอย่างจากการ์ดแนวงานฮิตแล้ว ไม่ต้องสร้างซ้ำ (แอดมินกดสร้างใหม่ได้)
    const trendVid = new Set((await q("SELECT style FROM trends WHERE active AND sample->>'file' IS NOT NULL")).rows.map((r) => r.style));
    const pick = (st) => all.map((x) => rows[x.id] && { ...rows[x.id], kind: x.kind }).find((r) => r && st.includes(r.status));
    // ปิดสร้างอัตโนมัติได้ในหลังบ้าน (ยังทำงานที่แอดมินกด "สร้างใหม่" เอง)
    const auto = (await q("SELECT value FROM app_settings WHERE key='auto_samples'")).rows[0]?.value !== false;
    const cur = pick(['render', 'photo']) || pick(['queued'])
      || (auto ? ((x) => x && { style: x.id, kind: x.kind, status: 'new' })(all.find((x) => !rows[x.id] && !(x.kind === 'video' && trendVid.has(x.id)))) : null);
    if (!cur) return false;
    const set = (o) => q(`INSERT INTO style_samples(style,file,poster,kind,status,work_id,photo_work,error,at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())
      ON CONFLICT (style) DO UPDATE SET file=EXCLUDED.file, poster=EXCLUDED.poster, kind=EXCLUDED.kind, status=EXCLUDED.status, work_id=EXCLUDED.work_id, photo_work=EXCLUDED.photo_work, error=EXCLUDED.error, at=now()`,
    [cur.style, o.file ?? cur.file ?? '', o.poster ?? cur.poster ?? '', cur.kind, o.status, o.work_id ?? null, o.photo_work ?? cur.photo_work ?? null, o.error || '']);
    const uid = await sysUser();
    const late = (mins) => cur.at && Date.now() - new Date(cur.at) > mins * 60e3;
    if (cur.status === 'new' || cur.status === 'queued') {
      if (cur.kind === 'image') {
        const st = STYLES.find((x) => x.id === cur.style);
        const r = await create.createInternal(uid, { kind: 'image', style: cur.style, goal: imgGoal(st), tier: 'std', versions: 1, tone: 'เป็นกันเอง', ...imgDemo(st) }, [], 'ตัวอย่างแนวงาน', { system: true });
        await set(r.error ? { status: 'failed', error: r.error } : { status: 'render', work_id: r.id });
        return true;
      }
      if (VID_NOPHOTO.includes(cur.style)) {
        const r = await create.createInternal(uid, vidBody(cur.style), [], 'ตัวอย่างแนวงาน', { system: true });
        await set(r.error ? { status: 'failed', error: r.error } : { status: 'render', work_id: r.id });
        return true;
      }
      // คลิปที่ต้องมีรูปสินค้า: สร้างรูปสินค้าตัวอย่างก่อน
      const r = await create.createInternal(uid, { kind: 'image', style: 'product_luxury', goal: 'sell', tier: 'std', versions: 1, tone: 'เป็นกันเอง', ...P0, headline: '' }, [], 'รูปสินค้าตัวอย่าง', { system: true });
      await set(r.error ? { status: 'failed', error: r.error } : { status: 'photo', photo_work: r.id });
      return true;
    }
    if (cur.status === 'photo') {
      const w = await work(cur.photo_work);
      if (!w || w.status === 'failed') { await set({ status: 'failed', error: w?.error || 'สร้างรูปสินค้าไม่สำเร็จ' }); return true; }
      if (w.status !== 'done') { if (late(20)) await set({ status: 'failed', error: 'ใช้เวลานานเกินไป' }); return true; }
      const photo = path.join(create.WORK_DIR, path.basename(w.files[0].name));
      const r = await create.createInternal(uid, vidBody(cur.style), [photo], 'ตัวอย่างแนวงาน', { system: true });
      await set(r.error ? { status: 'failed', error: r.error } : { status: 'render', work_id: r.id });
      return true;
    }
    const w = await work(cur.work_id);
    if (!w || w.status === 'failed') { await set({ status: 'failed', error: w?.error || 'สร้างไม่สำเร็จ' }); return true; }
    if (w.status === 'review') await q("UPDATE works SET status='queued' WHERE id=$1", [w.id]); // คลิปที่รอตรวจซับ: ตัดต่อเลย
    if (w.status !== 'done') { if (late(cur.kind === 'video' ? 45 : 30)) await set({ status: 'failed', error: 'ใช้เวลานานเกินไป' }); return true; }
    await set({ status: 'done', ...keepStyle(w, cur.style, cur), work_id: w.id });
    log('style sample done', cur.style);
    return true;
  }
  // เก็บไฟล์ผลงานเป็นตัวอย่างของแนวงาน (ภาพ: ใช้ภาพย่อ · คลิป: ไฟล์คลิป + ภาพปก)
  function keepStyle(w, style, old = {}) {
    const f = w.files?.[0]; if (!f) throw new Error('ไม่มีไฟล์');
    const stamp = Date.now().toString(36);
    const cp = (name, tag) => { const src = path.join(create.WORK_DIR, path.basename(name)); if (!fs.existsSync(src)) return ''; const out = `s-${style}-${stamp}${tag}${path.extname(src)}`; fs.copyFileSync(src, path.join(DIR, out)); return out; };
    const video = w.kind === 'video';
    const file = video ? cp(f.name, '') : cp(f.thumb || f.name, '');
    if (!file) throw new Error('ไม่พบไฟล์ผลงาน (อาจหมดอายุแล้ว)');
    const poster = video && f.thumb ? cp(f.thumb, 'p') : '';
    [old.file, old.poster].filter(Boolean).forEach((x) => fs.rm(path.join(DIR, path.basename(x)), () => {}));
    return { file, poster };
  }
  app.get('/api/style-samples', auth, wrap(async (_req, res) => {
    const rows = (await q("SELECT style, kind, file, poster, at FROM style_samples WHERE file<>''")).rows;
    const u = (r, poster) => `api/style-samples/${r.style}?${poster ? 'poster=1&' : ''}v=${new Date(r.at).getTime()}`;
    const img = {}, vid = {}, play = {};
    for (const r of rows) {
      if (r.kind === 'video') { vid[r.style] = r.poster ? u(r, true) : ''; play[r.style] = u(r); }
      else img[r.style] = u(r);
    }
    for (const t of (await q("SELECT id, style, sample FROM trends WHERE active AND sample->>'file' IS NOT NULL ORDER BY sort, id")).rows) {
      if (play[t.style]) continue;
      if (t.sample.poster) vid[t.style] = `api/trends/${t.id}/sample?poster=1&v=${t.sample.at}`;
      play[t.style] = `api/trends/${t.id}/sample?v=${t.sample.at}`;
    }
    res.setHeader('cache-control', 'private, max-age=300');
    res.json({ image: img, video: vid, play });
  }));
  app.get('/api/style-samples/:style', auth, wrap(async (req, res) => {
    const r = (await q('SELECT file, poster FROM style_samples WHERE style=$1', [String(req.params.style)])).rows[0];
    const name = req.query.poster ? r?.poster : r?.file;
    const f = name && path.join(DIR, path.basename(name));
    if (!f || !fs.existsSync(f)) return res.status(404).end();
    res.setHeader('cache-control', 'private, max-age=86400'); res.sendFile(f);
  }));
  app.put('/api/admin/style-samples/auto', auth, admin, wrap(async (req, res) => {
    await q("INSERT INTO app_settings(key,value) VALUES('auto_samples',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [JSON.stringify(!!req.body?.on)]);
    res.json({ ok: true, on: !!req.body?.on });
  }));
  app.get('/api/admin/style-samples', auth, admin, wrap(async (_req, res) => {
    const rows = Object.fromEntries((await q('SELECT * FROM style_samples')).rows.map((r) => [r.style, r]));
    const trendVid = new Set((await q("SELECT style FROM trends WHERE active AND sample->>'file' IS NOT NULL")).rows.map((r) => r.style));
    const auto = (await q("SELECT value FROM app_settings WHERE key='auto_samples'")).rows[0]?.value !== false;
    res.json({ auto, items: ALL().map((x) => {
      const r = rows[x.id]; const v = r ? new Date(r.at).getTime() : 0;
      return { style: x.id, label: x.label, kind: x.kind, manual: !!x.manual, status: r?.status || (x.kind === 'video' && trendVid.has(x.id) ? 'trend' : x.manual ? 'manual' : 'none'), error: r?.error || '',
        src: r?.file ? (x.kind === 'video' ? (r.poster ? `api/style-samples/${x.id}?poster=1&v=${v}` : '') : `api/style-samples/${x.id}?v=${v}`) : '', play: r?.file && x.kind === 'video' ? `api/style-samples/${x.id}?v=${v}` : '' };
    }) });
  }));
  const known = (id) => ALL().find((x) => x.id === id);
  app.post('/api/admin/style-samples/:style', auth, admin, wrap(async (req, res) => {
    const x = known(req.params.style); if (!x) return res.status(404).json({ error: 'ไม่พบแนวงาน' });
    if (x.manual) return res.status(400).json({ error: 'แนวนี้ใช้ของจริงของลูกค้า — อัปโหลดคลิป หรือเลือกจากผลงานแทน' });
    await q(`INSERT INTO style_samples(style,kind,status) VALUES($1,$2,'queued') ON CONFLICT (style) DO UPDATE SET kind=EXCLUDED.kind, status='queued', error='', at=now() WHERE style_samples.status NOT IN ('render','photo')`, [x.id, x.kind]);
    setTimeout(() => tick(), 500);
    res.json({ ok: true });
  }));
  // แอดมินใช้ผลงานที่มีอยู่เป็นตัวอย่าง (เช่น ตอนหนังสั้น/อวตารที่ทำได้ดี)
  app.post('/api/admin/style-samples/:style/from-work', auth, admin, wrap(async (req, res) => {
    const x = known(req.params.style); if (!x) return res.status(404).json({ error: 'ไม่พบแนวงาน' });
    const w = (await q('SELECT id, status, files, kind FROM works WHERE id=$1', [Number(req.body?.workId) || 0])).rows[0];
    if (!w || w.status !== 'done') return res.status(400).json({ error: 'ไม่พบผลงานที่เสร็จแล้วเลขนี้' });
    if ((w.kind === 'video') !== (x.kind === 'video')) return res.status(400).json({ error: x.kind === 'video' ? 'แนวนี้ต้องใช้ผลงานที่เป็นคลิป' : 'แนวนี้ต้องใช้ผลงานที่เป็นภาพ' });
    const old = (await q('SELECT file, poster FROM style_samples WHERE style=$1', [x.id])).rows[0] || {};
    let k; try { k = keepStyle(w, x.id, old); } catch (e) { return res.status(400).json({ error: e.message }); }
    await q(`INSERT INTO style_samples(style,kind,file,poster,status,work_id,error,at) VALUES($1,$2,$3,$4,'done',$5,'',now())
      ON CONFLICT (style) DO UPDATE SET kind=EXCLUDED.kind, file=EXCLUDED.file, poster=EXCLUDED.poster, status='done', work_id=EXCLUDED.work_id, error='', at=now()`, [x.id, x.kind, k.file, k.poster, w.id]);
    res.json({ ok: true });
  }));
  // แอดมินอัปโหลดไฟล์ตัวอย่างเอง (คลิปจาก Seedance/Google Flow ฯลฯ หรือภาพ)
  const up = multer({ dest: path.join(DATA_DIR, 'tmp-up'), limits: { fileSize: 150 * 1024 * 1024, files: 1 } });
  app.post('/api/admin/style-samples/:style/upload', auth, admin, up.single('file'), wrap(async (req, res) => {
    const x = known(req.params.style);
    const rm = () => req.file && fs.rm(req.file.path, () => {});
    if (!x) { rm(); return res.status(404).json({ error: 'ไม่พบแนวงาน' }); }
    if (!req.file) return res.status(400).json({ error: 'เลือกไฟล์ก่อน' });
    const isVid = /^video\//.test(req.file.mimetype || '');
    if (isVid !== (x.kind === 'video')) { rm(); return res.status(400).json({ error: x.kind === 'video' ? 'แนวนี้ต้องเป็นไฟล์คลิป' : 'แนวนี้ต้องเป็นไฟล์ภาพ' }); }
    const stamp = Date.now().toString(36);
    const old = (await q('SELECT file, poster FROM style_samples WHERE style=$1', [x.id])).rows[0] || {};
    let file, poster = '';
    try {
      if (isVid) {
        file = `s-${x.id}-${stamp}u.mp4`;
        // แปลงเป็น mp4 ที่มือถือเล่นได้ทุกเครื่อง ไม่เกิน 60 วิ 720p
        await V.ff(['-i', req.file.path, '-t', '60', '-vf', "scale='min(720,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.join(DIR, file)], 300000);
        const jpg = path.join(DIR, `s-${x.id}-${stamp}p.jpg`);
        try { await V.videoThumb(path.join(DIR, file), jpg); poster = path.basename(jpg); } catch (e) { log('sample poster', e.message); }
      } else {
        file = `s-${x.id}-${stamp}u.webp`;
        const sharp = (await import('sharp')).default;
        await sharp(req.file.path).rotate().resize({ width: 900, height: 1600, fit: 'inside' }).webp({ quality: 82 }).toFile(path.join(DIR, file));
      }
    } catch (e) { rm(); return res.status(400).json({ error: 'อ่านไฟล์ไม่ได้ ลองไฟล์อื่น' }); }
    rm();
    [old.file, old.poster].filter(Boolean).forEach((f) => fs.rm(path.join(DIR, path.basename(f)), () => {}));
    await q(`INSERT INTO style_samples(style,kind,file,poster,status,work_id,error,at) VALUES($1,$2,$3,$4,'done',NULL,'',now())
      ON CONFLICT (style) DO UPDATE SET kind=EXCLUDED.kind, file=EXCLUDED.file, poster=EXCLUDED.poster, status='done', work_id=NULL, error='', at=now()`, [x.id, x.kind, file, poster]);
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
