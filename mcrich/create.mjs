// Mc Rich — สร้างภาพด้วย AI (Gemini Nano Banana) + แคปชั่น + ผลงานของฉัน
// ตัดดาวตอนกดยืนยันเท่านั้น สร้างไม่สำเร็จคืนดาว/ภาพฟรีอัตโนมัติ ไฟล์ลบจากเซิร์ฟเวอร์เมื่อครบ 7 วัน
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';

const KEY = () => process.env.GEMINI_API_KEY || '';
const API = () => (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const TEXT_MODEL = process.env.MCRICH_TEXT_MODEL || 'gemini-flash-latest';
const KEEP_DAYS = 7;
const WORKERS = Number(process.env.MCRICH_WORKERS || 2);
const MAX_ACTIVE = 3; // งานที่รอ/กำลังทำ ต่อคน

// ระดับคุณภาพ: ต้นทุนจริง (บาท) + 80% ปัดขึ้น
export const TIERS = [
  { id: 'free', label: 'ภาพฟรี', note: 'คมชัดมาตรฐาน มีลายน้ำเล็กๆ', model: 'gemini-3.1-flash-lite-image', size: '1K', stars: 0, free: true },
  { id: 'std', label: 'มาตรฐาน', note: 'คม 1K เหมาะโพสต์โซเชียล', model: 'gemini-nano-banana-2.1', size: '1K', stars: 5 },
  { id: 'hd', label: 'ชัดพิเศษ', note: 'คม 2K ซูมได้ ตัวหนังสือคม', model: 'gemini-nano-banana-2.1', size: '2K', stars: 7 },
  { id: 'pro', label: 'โปร', note: 'รายละเอียดสินค้าเนียนสุด 2K', model: 'gemini-3-pro-image', size: '2K', stars: 9 },
  { id: 'pro4k', label: 'โปร 4K', note: 'สำหรับพิมพ์ป้าย ไวนิล', model: 'gemini-3-pro-image', size: '4K', stars: 16 },
];
const MODEL_OVERRIDE = process.env.MCRICH_IMAGE_MODEL || '';

export const GOALS = [
  { id: 'sell', label: 'ขายของตัวเอง', hint: 'ปิดการขาย ให้ทักแชท/สั่งซื้อ' },
  { id: 'aff', label: 'Affiliate', hint: 'ชวนกดลิงก์ตะกร้า' },
  { id: 'promo', label: 'โปรโมตร้าน', hint: 'ให้คนรู้จักและมาที่ร้าน' },
  { id: 'content', label: 'ทำคอนเทนต์', hint: 'เพิ่มยอดติดตาม ยอดแชร์' },
];
export const RATIOS = [
  { id: '4:5', label: 'ฟีด 4:5' }, { id: '1:1', label: 'จัตุรัส 1:1' }, { id: '9:16', label: 'สตอรี่ 9:16' }, { id: '16:9', label: 'แนวนอน 16:9' },
];
export const TONES = ['เป็นกันเอง', 'ขายตรง ปิดการขาย', 'ตลก ขำๆ', 'หรูหรา พรีเมียม', 'ให้ความรู้', 'อบอุ่น ใส่ใจ'];
export const CONCEPTS = ['สีสดใส', 'มินิมอล', 'หรูหรา', 'น่ารัก', 'ธรรมชาติ', 'ย้อนยุค', 'สตรีทฟู้ด', 'แสงธรรมชาติ', 'พื้นหลังเรียบ', 'มีคนใช้สินค้า', 'ไทยๆ', 'เทศกาล'];

// แนวภาพ (คำสั่งอยู่ฝั่งเซิร์ฟเวอร์ ลูกค้าไม่ต้องเขียน prompt เอง)
export const STYLES = [
  { id: 'poster_menu', label: 'โปสเตอร์เมนู / โปรโมชั่น', emoji: '🍜', color: '#2F6B4A', ratio: '4:5', text: true,
    prompt: 'A mouth-watering promotional food/menu poster. Hero shot of the product, appetizing lighting, clear menu-style layout with the headline and price as bold readable typography, space for the shop name.' },
  { id: 'product_luxury', label: 'ภาพสินค้าพื้นหรู', emoji: '💎', color: '#3B4A8C', ratio: '4:5',
    prompt: 'Premium commercial product photography. The product placed on an elegant pedestal or marble surface, soft studio lighting, subtle reflections, luxury magazine advertising look, generous negative space.' },
  { id: 'product_life', label: 'สินค้าในชีวิตจริง', emoji: '🏡', color: '#7B4A24', ratio: '4:5',
    prompt: 'Authentic lifestyle photo showing the product being used naturally in a real Thai home or daily-life setting, warm natural light, candid feel like a real customer photo, looks like a genuine social media post.' },
  { id: 'sale_banner', label: 'ป้ายลดราคา / โปรแรง', emoji: '🔥', color: '#B33A1E', ratio: '1:1', text: true,
    prompt: 'High-energy sale promotion graphic. Product in the center, bold discount badge, dynamic shapes and bursts, the headline and price as huge eye-catching typography, Thai e-commerce mega-sale style.' },
  { id: 'aff_cover', label: 'ปกคลิป / ภาพป้ายยา', emoji: '🛒', color: '#A3366B', ratio: '9:16', text: true,
    prompt: 'Scroll-stopping vertical cover image for a product recommendation (affiliate) post. Product large and sharp, an excited reaction vibe, short punchy headline text at the top, clean area at the bottom for platform UI.' },
  { id: 'before_after', label: 'ก่อน-หลังใช้', emoji: '✨', color: '#1F6E8C', ratio: '4:5', text: true,
    prompt: 'A clear split before/after comparison image showing the problem on the left and the improved result on the right with the product featured, labels "ก่อน" and "หลัง", realistic and believable, not exaggerated.' },
  { id: 'shop_news', label: 'ประกาศร้าน / เปิดใหม่', emoji: '📣', color: '#5B3A8C', ratio: '4:5', text: true,
    prompt: 'Friendly shop announcement poster (grand opening, new arrival, opening hours or holiday notice). Inviting storefront or product arrangement, festive but clean design, the headline as large readable typography.' },
  { id: 'knowledge', label: 'คอนเทนต์ความรู้ / ทิป', emoji: '💡', color: '#2B5C6B', ratio: '4:5', text: true,
    prompt: 'Clean infographic-style social media card sharing a useful tip related to the product, simple icons, the headline as the main title, minimal readable layout, educational and trustworthy look.' },
];

// ---------- ตัวกรองเนื้อหา ----------
const BLOCK = [
  [/บุหรี่ไฟฟ้า|พอต|vape|ยาเส้น|กัญชา/i, 'สินค้าประเภทบุหรี่ไฟฟ้า/สารเสพติดโฆษณาไม่ได้'],
  [/บาคาร่า|สล็อต|คาสิโน|แทงบอล|เว็บพนัน|หวยออนไลน์|baccarat|slot/i, 'เนื้อหาการพนันสร้างไม่ได้'],
  [/ยาปลุกเซ็กส์|ยาเสียสาว|เพิ่มขนาด/i, 'สินค้าประเภทนี้โฆษณาไม่ได้'],
  [/ปืน|กระสุน|ระเบิด/i, 'อาวุธสร้างไม่ได้'],
];
const CLAIMS = [
  [/รักษา(โรค|หาย|ได้)|หายขาด|รักษามะเร็ง|รักษาเบาหวาน/, 'อ้างรักษาโรค'],
  [/ลด(น้ำหนัก)?\s*\d+\s*(กิโล|โล|kg)|ผอม(ใน|ภายใน)\s*\d+/, 'อ้างลดน้ำหนักเป็นตัวเลข'],
  [/ขาว(ใน|ภายใน)\s*\d+|เห็นผล(ใน|ภายใน)\s*\d+|เห็นผลทันที/, 'อ้างเห็นผลเร็วเกินจริง'],
  [/100\s*%|ร้อยเปอร์เซ็นต์/, 'อ้าง 100%'],
  [/ไม่มีผลข้างเคียง|ปลอดภัยที่สุด|ดีที่สุดในโลก|อันดับ\s*1\s*ของโลก/, 'คำเกินจริง'],
  [/อย\.?\s*รับรอง(ว่า)?รักษา/, 'อ้าง อย. เกินจริง'],
];
export function checkContent(text) {
  const t = String(text || '');
  for (const [re, why] of BLOCK) if (re.test(t)) return { blocked: why, warnings: [] };
  return { blocked: '', warnings: CLAIMS.filter(([re]) => re.test(t)).map(([, w]) => w) };
}

// ---------- เรียก Gemini ----------
// หาภาพ base64 ในคำตอบ (รองรับทั้ง Interactions API และ generateContent)
function findImages(o, out = []) {
  if (!o || typeof o !== 'object') return out;
  if (Array.isArray(o)) { o.forEach((x) => findImages(x, out)); return out; }
  const data = o.data ?? o.inlineData?.data ?? o.inline_data?.data;
  const mime = o.mime_type ?? o.mimeType ?? o.inlineData?.mimeType ?? o.inline_data?.mime_type ?? '';
  if (typeof data === 'string' && data.length > 200 && (o.type === 'image' || /^image\//.test(mime))) out.push(Buffer.from(data, 'base64'));
  else for (const v of Object.values(o)) if (v && typeof v === 'object') findImages(v, out);
  return out;
}
function findText(o) {
  if (!o || typeof o !== 'object') return '';
  if (Array.isArray(o)) return o.map(findText).join('');
  if (typeof o.text === 'string' && (o.type === 'text' || !o.type)) return o.text;
  return Object.values(o).filter((v) => v && typeof v === 'object').map(findText).join('');
}
async function gpost(url, body, timeoutMs) {
  let last;
  for (let i = 0; i < 2; i++) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY() }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    last = new Error(`gemini ${r.status} ${j.error?.message || ''}`.trim());
    last.status = r.status;
    if (r.status !== 429 && r.status < 500) break;
    await new Promise((s) => setTimeout(s, 4000));
  }
  throw last;
}
async function genImage({ model, prompt, refs, ratio, size }) {
  const input = [{ type: 'text', text: prompt }, ...refs.map((b) => ({ type: 'image', mime_type: 'image/jpeg', data: b.toString('base64') }))];
  const response_format = { type: 'image', mime_type: 'image/jpeg', aspect_ratio: ratio };
  if (!/lite/.test(model)) response_format.image_size = size;
  const j = await gpost(`${API()}/v1beta/interactions`, { model, input, response_format }, 240000);
  const imgs = findImages(j.steps || j.outputs || j);
  if (!imgs.length) { const e = new Error('no_image'); e.text = findText(j).slice(0, 300); throw e; }
  return imgs[0];
}
async function genCaptions(prompt) {
  const j = await gpost(`${API()}/v1beta/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
  }, 60000);
  const t = findText(j.candidates?.[0]?.content || j);
  return JSON.parse(t.replace(/^```(json)?|```$/g, '').trim());
}

// ---------- คำสั่ง ----------
const clean = (v, n = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
function buildPrompt(p, style, brand, hasRefs, version) {
  const goal = GOALS.find((g) => g.id === p.goal);
  const lines = [
    style.prompt,
    `Purpose: ${goal?.hint || ''} (${goal?.label || ''}). Audience: Thai social media users.`,
    p.product && `Product / subject: ${p.product}.`,
    p.details && `Details from the seller: ${p.details}.`,
    p.concepts?.length && `Mood & concept: ${p.concepts.join(', ')}.`,
    brand.color && `Brand colors: primary ${brand.color}${brand.accent ? `, secondary ${brand.accent}` : ''}. Use them in the design accents.`,
    hasRefs && 'Use the attached reference photo(s) as the real product: keep its exact shape, packaging, label and colors faithful. Do not invent a different product.',
  ];
  if (style.text && (p.headline || p.price || brand.shopName)) {
    lines.push('Render this Thai text exactly as written, spelled correctly, large and legible, no other text:');
    if (p.headline) lines.push(`- Headline: "${p.headline}"`);
    if (p.price) lines.push(`- Price/offer: "${p.price}"`);
    if (brand.shopName && p.showShop !== false) lines.push(`- Shop name (small): "${brand.shopName}"`);
  } else {
    lines.push('Do not add any text, letters, logos or watermarks to the image.');
  }
  lines.push('Leave the top-right corner area clean (a logo may be placed there). Photorealistic quality, sharp focus, no distorted hands or faces, no misleading health claims.');
  if (version > 0) lines.push(`Variation #${version + 1}: use a noticeably different composition and camera angle from other variations.`);
  return lines.filter(Boolean).join('\n');
}
function captionPrompt(p, style, brand) {
  const goal = GOALS.find((g) => g.id === p.goal);
  return `คุณคือนักเขียนแคปชั่นขายของมือโปรบนโซเชียลไทย เขียนแคปชั่นภาษาไทยสำหรับภาพแนว "${style.label}"
เป้าหมาย: ${goal?.label} (${goal?.hint})
สินค้า/เรื่อง: ${p.product || '-'}
รายละเอียด: ${p.details || '-'}
ราคา/โปร: ${p.price || '-'}
ร้าน: ${brand.shopName || '-'} ${brand.line ? `LINE ${brand.line}` : ''} ${brand.phone ? `โทร ${brand.phone}` : ''}
ลิงก์: ${p.link || '-'}
โทน: ${p.tone || 'เป็นกันเอง'}
กฎ: ห้ามอ้างรักษาโรค ห้ามคำเกินจริง (100%, เห็นผลทันที, ดีที่สุดในโลก) ตามกฎหมาย อย. และคุ้มครองผู้บริโภค · ใช้อีโมจิพอดี · ถ้ามีลิงก์ใส่ลิงก์ในแคปชั่นตามจริงห้ามแต่งลิงก์ · ถ้าเป็น Affiliate ให้ชวนกดตะกร้า/ลิงก์
ตอบเป็น JSON เท่านั้น: {"facebook":"แคปชั่นยาว 3-6 บรรทัด","instagram":"กระชับ 2-4 บรรทัด","tiktok":"สั้นมาก 1-2 บรรทัด มีฮุค","shopee":"แคปชั่นขาย สั้น ชัด","hashtags":["#แท็ก", "... 5-8 แท็กภาษาไทย/อังกฤษที่เกี่ยวข้อง"]}`;
}

// ---------- ลายน้ำ / โลโก้ ----------
async function finish(buf, { logo, watermark }) {
  let img = sharp(buf).rotate();
  const meta = await img.metadata();
  const W = meta.width || 1024, H = meta.height || 1024;
  const layers = [];
  if (logo && fs.existsSync(logo)) {
    const size = Math.round(Math.min(W, H) * 0.16);
    const lg = await sharp(logo).resize({ width: size, height: size, fit: 'inside' }).png().toBuffer();
    const m = Math.round(Math.min(W, H) * 0.035);
    layers.push({ input: lg, top: m, left: W - size - m });
  }
  if (watermark) {
    const fs_ = Math.round(Math.min(W, H) * 0.028);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><text x="${W - fs_}" y="${H - fs_}" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${fs_}" fill="#ffffff" fill-opacity=".85" stroke="#000" stroke-opacity=".35" stroke-width="${Math.max(1, fs_ / 14)}">Made with Mc Rich</text></svg>`;
    layers.push({ input: Buffer.from(svg), top: 0, left: 0 });
  }
  if (layers.length) img = sharp(await img.toBuffer()).composite(layers);
  const out = await img.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { out, w: W, h: H };
}

export function registerCreate(app, { q, pool, auth, wrap, log, DATA_DIR, me, rand }) {
  const WORK_DIR = path.join(DATA_DIR, 'works');
  const REF_DIR = path.join(DATA_DIR, 'refs');
  const LOGO_DIR = path.join(DATA_DIR, 'logos');
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(REF_DIR, { recursive: true });
  const ready = () => !!KEY();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 3 } });
  const thaiToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

  // ตรวจและจัดรูปคำขอ (ใช้ทั้งตอนทบทวนและตอนยืนยัน)
  function normalize(b, brand) {
    const style = STYLES.find((s) => s.id === b.style);
    if (!style) return { error: 'เลือกแนวภาพก่อน' };
    const tier = TIERS.find((t) => t.id === b.tier) || TIERS[1];
    const versions = tier.free ? 1 : Math.min(4, Math.max(1, Number(b.versions) || 1));
    const link = clean(b.link, 300);
    const p = {
      goal: GOALS.some((g) => g.id === b.goal) ? b.goal : 'sell',
      link: /^https?:\/\/\S+$/i.test(link) ? link : '',
      product: clean(b.product, 120), details: clean(b.details, 600), headline: clean(b.headline, 60), price: clean(b.price, 40),
      concepts: (Array.isArray(b.concepts) ? b.concepts : []).filter((c) => CONCEPTS.includes(c)).slice(0, 5),
      ratio: RATIOS.some((r) => r.id === b.ratio) ? b.ratio : style.ratio,
      tone: TONES.includes(b.tone) ? b.tone : TONES[0],
      hashtags: (Array.isArray(b.hashtags) ? b.hashtags : []).map((t) => '#' + String(t).replace(/^#+/, '').replace(/\s+/g, '').slice(0, 40)).filter((t) => t.length > 1).slice(0, 20),
      useLogo: !!b.useLogo && !!brand.logo, showShop: b.showShop !== false,
    };
    if (!p.product && !p.details && !p.headline) return { error: 'ใส่ชื่อสินค้าหรือรายละเอียดอย่างน้อย 1 อย่าง' };
    const c = checkContent([p.product, p.details, p.headline, p.price].join(' '));
    return { style, tier, versions, p, cost: tier.stars * versions, ...c };
  }
  async function freeLeft(c, uid, lock) {
    const f = (await c.query(`SELECT welcome_left, daily_date, daily_used FROM free_quota WHERE user_id=$1 ${lock ? 'FOR UPDATE' : ''}`, [uid])).rows[0];
    if (!f) return { welcome: 0, today: 0 };
    const today = f.daily_date && f.daily_date.toISOString().slice(0, 10) === thaiToday() ? Math.max(0, 1 - f.daily_used) : 1;
    return { welcome: f.welcome_left, today };
  }

  app.get('/api/create/catalog', auth, wrap(async (req, res) => {
    const m = await me(req.uid);
    res.json({
      ready: ready(), goals: GOALS, ratios: RATIOS, tones: TONES, concepts: CONCEPTS,
      styles: STYLES.map(({ id, label, emoji, color, ratio, text }) => ({ id, label, emoji, color, ratio, text: !!text })),
      tiers: TIERS.map(({ id, label, note, stars, free, size }) => ({ id, label, note, stars, free: !!free, size })),
      stars: m.stars, free: m.freeImages, keepDays: KEEP_DAYS,
    });
  }));

  // ทบทวนก่อนสร้าง: คำนวณดาว เช็กเนื้อหา — ไม่ตัดดาว
  app.post('/api/works/quote', auth, wrap(async (req, res) => {
    const m = await me(req.uid);
    const n = normalize(req.body || {}, m.brand || {});
    if (n.error) return res.status(400).json({ error: n.error });
    const freeOk = n.tier.free ? (m.freeImages.today + m.freeImages.welcome) > 0 : true;
    res.json({ cost: n.cost, stars: m.stars, enough: n.tier.free ? freeOk : m.stars >= n.cost, free: !!n.tier.free, freeLeft: m.freeImages, blocked: n.blocked, warnings: n.warnings, versions: n.versions });
  }));

  // ยืนยันสร้าง: ตัดดาว (หรือภาพฟรี) แล้วเข้าคิว
  app.post('/api/works', auth, upload.array('refs', 3), wrap(async (req, res) => {
    if (!ready()) return res.status(503).json({ error: 'ระบบสร้างภาพกำลังตั้งค่า' });
    let body; try { body = JSON.parse(req.body?.data || '{}'); } catch { return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' }); }
    const m = await me(req.uid);
    const n = normalize(body, m.brand || {});
    if (n.error) return res.status(400).json({ error: n.error });
    if (n.blocked) return res.status(400).json({ error: n.blocked });

    // ภาพอ้างอิง: อัปโหลดใหม่ หรือใช้ของงานเดิม
    const refs = [];
    for (const f of req.files || []) {
      const name = `${req.uid}-${Date.now().toString(36)}${rand(5).toLowerCase()}.jpg`;
      try { await sharp(f.buffer).rotate().resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(path.join(REF_DIR, name)); refs.push(name); }
      catch { return res.status(400).json({ error: 'ไฟล์ภาพอ้างอิงไม่ถูกต้อง' }); }
    }
    if (!refs.length && body.fromWork) {
      const old = (await q('SELECT refs FROM works WHERE id=$1 AND user_id=$2 AND NOT purged', [Number(body.fromWork) || 0, req.uid])).rows[0];
      for (const r of old?.refs || []) {
        if (!fs.existsSync(path.join(REF_DIR, r))) continue;
        const name = `${req.uid}-${Date.now().toString(36)}${rand(5).toLowerCase()}.jpg`;
        fs.copyFileSync(path.join(REF_DIR, r), path.join(REF_DIR, name)); refs.push(name);
      }
    }

    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.uid]);
      const active = (await c.query("SELECT count(*)::int n FROM works WHERE user_id=$1 AND status IN ('queued','working')", [req.uid])).rows[0].n;
      if (active >= MAX_ACTIVE) { await c.query('ROLLBACK'); return res.status(429).json({ error: `มีงานกำลังสร้างอยู่ ${active} งาน รอสักครู่` }); }
      let freeSrc = '';
      if (n.tier.free) {
        const fl = await freeLeft(c, req.uid, true);
        if (fl.today > 0) { await c.query('UPDATE free_quota SET daily_date=$2, daily_used=CASE WHEN daily_date=$2 THEN daily_used+1 ELSE 1 END WHERE user_id=$1', [req.uid, thaiToday()]); freeSrc = 'daily'; }
        else if (fl.welcome > 0) { await c.query('UPDATE free_quota SET welcome_left=welcome_left-1 WHERE user_id=$1', [req.uid]); freeSrc = 'welcome'; }
        else { await c.query('ROLLBACK'); return res.status(402).json({ error: 'ภาพฟรีหมดแล้ว เลือกระดับมาตรฐาน (5 ดาว) ได้เลย' }); }
      } else {
        const bal = (await c.query('SELECT COALESCE(sum(delta),0)::int s FROM star_ledger WHERE user_id=$1', [req.uid])).rows[0].s;
        if (bal < n.cost) { await c.query('ROLLBACK'); return res.status(402).json({ error: `ดาวไม่พอ ต้องใช้ ${n.cost} ดาว มีอยู่ ${bal} ดาว` }); }
      }
      const title = n.p.product || n.p.headline || n.style.label;
      const w = (await c.query(`INSERT INTO works(user_id,kind,style,title,params,tier,versions,cost,free,refs,expires_at)
        VALUES($1,'image',$2,$3,$4,$5,$6,$7,$8,$9, now() + interval '${KEEP_DAYS} days') RETURNING id`,
      [req.uid, n.style.id, title.slice(0, 80), { ...n.p, freeSrc, warnings: n.warnings }, n.tier.id, n.versions, n.cost, !!n.tier.free, refs])).rows[0];
      if (n.cost > 0) await c.query("INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'spend',$3,$4)", [req.uid, -n.cost, `work:${w.id}`, `สร้างภาพ ${n.style.label} ×${n.versions}`]);
      await c.query("INSERT INTO audit_log(user_id,action,detail,ip) VALUES($1,'work_create',$2,$3)", [req.uid, { id: w.id, style: n.style.id, tier: n.tier.id, cost: n.cost }, req.ip || '']);
      await c.query('COMMIT');
      kick();
      res.json({ id: w.id, me: await me(req.uid) });
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); throw e; } finally { c.release(); }
  }));

  const view = (w) => ({
    id: w.id, kind: w.kind, style: w.style, styleLabel: STYLES.find((s) => s.id === w.style)?.label || w.style, title: w.title,
    tier: w.tier, versions: w.versions, cost: w.cost, free: w.free, status: w.status, error: w.error, purged: w.purged,
    files: w.purged ? [] : w.files.map((f, i) => ({ ...f, url: `api/works/${w.id}/file/${i}`, thumb: `api/works/${w.id}/file/${i}?thumb=1` })),
    captions: w.captions, hashtags: w.hashtags, events: w.events, posted: w.posted, params: w.params,
    expiresAt: w.expires_at, createdAt: w.created_at, doneAt: w.done_at,
  });
  app.get('/api/works', auth, wrap(async (req, res) => {
    const { rows } = await q('SELECT * FROM works WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60', [req.uid]);
    res.json({ items: rows.map(view) });
  }));
  const own = async (req) => (await q('SELECT * FROM works WHERE id=$1 AND user_id=$2', [Number(req.params.id) || 0, req.uid])).rows[0];
  app.get('/api/works/:id', auth, wrap(async (req, res) => {
    const w = await own(req); if (!w) return res.status(404).json({ error: 'ไม่พบผลงาน' });
    res.json(view(w));
  }));
  const addEvent = (id, ev) => q("UPDATE works SET events = (events || $2::jsonb) WHERE id=$1", [id, JSON.stringify([{ ...ev, at: new Date().toISOString() }])]);
  app.get('/api/works/:id/file/:n', auth, wrap(async (req, res) => {
    const w = await own(req); const f = w && !w.purged && w.files[Number(req.params.n)];
    if (!f) return res.status(404).end();
    const file = path.join(WORK_DIR, path.basename(req.query.thumb ? f.thumb : f.name));
    if (!fs.existsSync(file)) return res.status(404).end();
    res.setHeader('cache-control', 'private, max-age=86400');
    if (req.query.dl) {
      await addEvent(w.id, { t: 'download', n: Number(req.params.n) });
      res.setHeader('content-disposition', `attachment; filename="mcrich-${w.id}-${Number(req.params.n) + 1}.jpg"`);
    }
    res.sendFile(file);
  }));
  app.post('/api/works/:id/event', auth, wrap(async (req, res) => {
    const w = await own(req); if (!w) return res.status(404).json({ error: 'ไม่พบผลงาน' });
    const t = ['download', 'share', 'copy'].includes(req.body?.t) ? req.body.t : null;
    if (!t) return res.status(400).json({ error: 'event' });
    await addEvent(w.id, { t, n: Number(req.body?.n) || 0, p: clean(req.body?.p, 20) });
    res.json({ ok: true });
  }));
  const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'shopee', 'lazada', 'line', 'youtube'];
  app.post('/api/works/:id/posted', auth, wrap(async (req, res) => {
    const w = await own(req); if (!w) return res.status(404).json({ error: 'ไม่พบผลงาน' });
    const p = req.body?.platform; if (!PLATFORMS.includes(p)) return res.status(400).json({ error: 'platform' });
    const posted = { ...w.posted };
    if (req.body?.on === false) delete posted[p]; else posted[p] = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.date) ? req.body.date : thaiToday();
    await q('UPDATE works SET posted=$2 WHERE id=$1', [w.id, posted]);
    res.json(view({ ...w, posted }));
  }));
  app.delete('/api/works/:id', auth, wrap(async (req, res) => {
    const w = await own(req); if (!w) return res.status(404).json({ error: 'ไม่พบผลงาน' });
    if (['queued', 'working'].includes(w.status)) return res.status(409).json({ error: 'รอให้สร้างเสร็จก่อนจึงลบได้' });
    purgeFiles(w);
    await q('DELETE FROM works WHERE id=$1', [w.id]);
    res.json({ ok: true });
  }));

  // ---------- คิวสร้างงาน ----------
  let running = 0;
  async function refund(w, reason) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("UPDATE works SET status='failed', error=$2, done_at=now() WHERE id=$1", [w.id, reason]);
      if (w.cost > 0) await c.query("INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'refund',$3,$4) ON CONFLICT DO NOTHING", [w.user_id, w.cost, `work:${w.id}`, 'คืนดาว สร้างไม่สำเร็จ']);
      if (w.free && w.params?.freeSrc === 'daily') await c.query('UPDATE free_quota SET daily_used=GREATEST(0,daily_used-1) WHERE user_id=$1', [w.user_id]);
      if (w.free && w.params?.freeSrc === 'welcome') await c.query('UPDATE free_quota SET welcome_left=welcome_left+1 WHERE user_id=$1', [w.user_id]);
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  }
  async function process1(w) {
    const style = STYLES.find((s) => s.id === w.style);
    const tier = TIERS.find((t) => t.id === w.tier) || TIERS[1];
    const brand = (await q('SELECT brand FROM profiles WHERE user_id=$1', [w.user_id])).rows[0]?.brand || {};
    const p = w.params;
    const refs = w.refs.map((r) => path.join(REF_DIR, r)).filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f));
    const model = MODEL_OVERRIDE && !tier.free ? MODEL_OVERRIDE : tier.model;
    const t0 = Date.now();
    // ภาพ (ทำพร้อมกันทุกเวอร์ชัน) กับแคปชั่น ทำคู่กัน
    const capP = genCaptions(captionPrompt(p, style, brand)).catch((e) => { log('caption fail', w.id, e.message); return null; });
    const results = await Promise.allSettled(Array.from({ length: w.versions }, (_, i) => genImage({ model, prompt: buildPrompt(p, style, brand, refs.length > 0, i), refs, ratio: p.ratio, size: tier.size })));
    const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    if (!ok.length) {
      const e = results[0].reason;
      log('image fail', w.id, e?.message, e?.text || '');
      return refund(w, e?.message === 'no_image' ? 'AI ไม่สร้างภาพนี้ (อาจขัดนโยบายเนื้อหา) ลองปรับรายละเอียดใหม่ · คืนดาวแล้ว' : 'ระบบ AI ขัดข้องชั่วคราว · คืนดาวแล้ว');
    }
    const files = [];
    for (const [i, buf] of ok.entries()) {
      const { out, w: W, h: H } = await finish(buf, { logo: p.useLogo && brand.logo ? path.join(LOGO_DIR, path.basename(brand.logo)) : '', watermark: w.free });
      const base = `${w.user_id}-${w.id}-${i}-${rand(6).toLowerCase()}`;
      fs.writeFileSync(path.join(WORK_DIR, `${base}.jpg`), out);
      await sharp(out).resize({ width: 480 }).webp({ quality: 78 }).toFile(path.join(WORK_DIR, `${base}.webp`));
      files.push({ name: `${base}.jpg`, thumb: `${base}.webp`, w: W, h: H });
    }
    const cap = await capP || {};
    const captions = {};
    for (const k of ['facebook', 'instagram', 'tiktok', 'shopee']) captions[k] = clean(cap[k], 2200);
    const tags = [...new Set([...p.hashtags, ...(Array.isArray(cap.hashtags) ? cap.hashtags : []).map((t) => '#' + String(t).replace(/^#+/, '').replace(/\s+/g, ''))])].filter((t) => t.length > 1).slice(0, 25);
    // ภาพบางเวอร์ชันพลาด คืนดาวส่วนที่ไม่ได้
    const missing = w.versions - ok.length;
    if (missing > 0 && w.cost > 0) {
      const back = Math.round(w.cost / w.versions) * missing;
      await q("INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'refund',$3,$4) ON CONFLICT DO NOTHING", [w.user_id, back, `work:${w.id}`, `คืนดาว ${missing} ภาพที่สร้างไม่สำเร็จ`]);
    }
    await q("UPDATE works SET status='done', files=$2, captions=$3, hashtags=$4, done_at=now() WHERE id=$1", [w.id, JSON.stringify(files), captions, tags]);
    log('work done', w.id, `${ok.length}/${w.versions}`, model, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  async function kick() {
    while (running < WORKERS) {
      const w = (await q(`UPDATE works SET status='working' WHERE id = (SELECT id FROM works WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`)).rows[0];
      if (!w) return;
      running++;
      process1(w).catch(async (e) => { log('work error', w.id, e.message); await refund(w, 'ระบบขัดข้อง · คืนดาวแล้ว').catch(() => {}); })
        .finally(() => { running--; kick().catch(() => {}); });
    }
  }

  // ---------- ลบไฟล์ครบ 7 วัน ----------
  function purgeFiles(w) {
    for (const f of w.files || []) { fs.rm(path.join(WORK_DIR, path.basename(f.name)), () => {}); if (f.thumb) fs.rm(path.join(WORK_DIR, path.basename(f.thumb)), () => {}); }
    for (const r of w.refs || []) fs.rm(path.join(REF_DIR, path.basename(r)), () => {});
  }
  async function sweep() {
    const { rows } = await q("SELECT * FROM works WHERE NOT purged AND expires_at < now() AND status IN ('done','failed') LIMIT 200");
    for (const w of rows) { purgeFiles(w); await q('UPDATE works SET purged=TRUE WHERE id=$1', [w.id]); }
    if (rows.length) log('ลบไฟล์ผลงานหมดอายุ', rows.length);
  }

  // เริ่มระบบ (หลังฐานข้อมูลพร้อม): งานที่ค้างตอนปิดเครื่องกลับเข้าคิว
  function start() {
    q("UPDATE works SET status='queued' WHERE status='working'").then(() => kick()).catch((e) => log('queue init', e.message));
    setInterval(() => kick().catch(() => {}), 15000).unref();
    setInterval(() => sweep().catch((e) => log('sweep', e.message)), 3600e3).unref();
    setTimeout(() => sweep().catch(() => {}), 20000).unref();
  }
  return { ready, start };
}
