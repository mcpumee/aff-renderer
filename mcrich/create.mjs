// Mc Rich — สร้างภาพด้วย AI (Gemini Nano Banana) + แคปชั่น + ผลงานของฉัน
// ตัดดาวตอนกดยืนยันเท่านั้น สร้างไม่สำเร็จคืนดาว/ภาพฟรีอัตโนมัติ ไฟล์ลบจากเซิร์ฟเวอร์เมื่อครบ 7 วัน
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import * as V from './video.mjs';

const KEY = () => process.env.GEMINI_API_KEY || '';
const API = () => (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const TEXT_MODEL = process.env.MCRICH_TEXT_MODEL || 'gemini-flash-latest';
const KEEP_DAYS = 7;
const WORKERS = Number(process.env.MCRICH_WORKERS || 3);
const MAX_ACTIVE = 3; // งานที่รอ/กำลังทำ ต่อคน

// ระดับคุณภาพ: ต้นทุนจริง (บาท) + 80% ปัดขึ้น
export const TIERS = [
  { id: 'free', label: 'ภาพฟรี', note: 'คมชัดมาตรฐาน ไม่มีลายน้ำ', model: 'gemini-3.1-flash-lite-image', size: '1K', stars: 0, free: true },
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
  { id: 'pr', label: 'ประชาสัมพันธ์องค์กร', hint: 'แจ้งข่าว กิจกรรม สร้างภาพลักษณ์หน่วยงาน' },
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
  { id: 'pr_announce', label: 'ประกาศ / แจ้งข่าว', emoji: '📢', color: '#1F4E79', ratio: '4:5', text: true, pr: true,
    prompt: 'Formal, trustworthy official announcement poster for an organization. Clean modern layout, organization colors, clear hierarchy: big headline, then date, place and contact as neat info rows with simple icons, subtle relevant background imagery, plenty of whitespace.' },
  { id: 'pr_event', label: 'โปสเตอร์กิจกรรม / อีเวนต์', emoji: '🎪', color: '#6B2D8C', ratio: '4:5', text: true, pr: true,
    prompt: 'Eye-catching event poster for an organization activity (seminar, fair, sports day, charity, workshop). Energetic but professional design, relevant illustrations or photo-style scene, the event name as a bold headline, date/time and venue clearly readable.' },
  { id: 'pr_news', label: 'การ์ดข่าวประชาสัมพันธ์', emoji: '📰', color: '#24476B', ratio: '4:5', text: true, pr: true,
    prompt: 'News-style public relations card: a strong photo-realistic scene relevant to the news at the top two thirds, a solid color title bar below with the headline, small organization name, clean newspaper-like typography.' },
  { id: 'pr_congrats', label: 'แสดงความยินดี / ขอบคุณ', emoji: '🎉', color: '#B8860B', ratio: '4:5', text: true, pr: true,
    prompt: 'Elegant congratulations / thank-you card from an organization, gold and white accents, ribbons or flowers, refined typography, celebratory but formal.' },
  { id: 'pr_hiring', label: 'รับสมัครงาน', emoji: '🧑‍💼', color: '#0E6E6E', ratio: '4:5', text: true, pr: true,
    prompt: 'Modern job recruitment poster: friendly professional people at work relevant to the position, headline "รับสมัคร", position title, short qualification rows with check icons, how to apply, organization colors.' },
  { id: 'pr_festival', label: 'อวยพรวันสำคัญ / เทศกาล', emoji: '🏮', color: '#A3192A', ratio: '4:5', text: true, pr: true,
    prompt: 'Beautiful greeting card for a Thai national day or festival (e.g. New Year, Songkran, Loy Krathong, Mother\'s Day, Father\'s Day) from an organization, culturally accurate Thai motifs, warm respectful mood, the greeting as elegant headline.' },
  { id: 'pr_condolence', label: 'ไว้อาลัย / แสดงความเสียใจ', emoji: '🕯️', color: '#2B2B2B', ratio: '4:5', text: true, pr: true,
    prompt: 'Respectful condolence / mourning message in black, white and grey tones, simple white flowers or candle, calm minimal composition, dignified formal Thai typography, no bright colors.' },
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
  const inf = p.info || {};
  if (style.text && (p.headline || p.price || brand.shopName || inf.org)) {
    lines.push('Render this Thai text exactly as written, spelled correctly, large and legible, no other text:');
    if (p.headline) lines.push(`- Headline: "${p.headline}"`);
    if (p.price) lines.push(`- ${style.pr ? 'Sub-headline' : 'Price/offer'}: "${p.price}"`);
    if (inf.date) lines.push(`- Date/time: "${inf.date}"`);
    if (inf.place) lines.push(`- Place: "${inf.place}"`);
    if (inf.contact) lines.push(`- Contact: "${inf.contact}"`);
    if (inf.org) lines.push(`- Organization name: "${inf.org}"`);
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
ลิงก์: ${p.link ? 'มี — เขียน {LINK} ตรงตำแหน่งที่จะใส่ลิงก์ ห้ามเขียน URL เอง' : '-'}
โทน: ${p.goal === 'pr' ? 'ทางการ สุภาพ เป็นข่าวประชาสัมพันธ์ ไม่ขายของ' : p.tone || 'เป็นกันเอง'}
กฎ: ห้ามอ้างรักษาโรค ห้ามคำเกินจริง (100%, เห็นผลทันที, ดีที่สุดในโลก) ตามกฎหมาย อย. และคุ้มครองผู้บริโภค · ใช้อีโมจิพอดี · ถ้ามีลิงก์ให้ใส่ {LINK} 1 ครั้งต่อแคปชั่น · ถ้าเป็น Affiliate ให้ชวนกดตะกร้า/ลิงก์
ตอบเป็น JSON เท่านั้น: {"facebook":"แคปชั่นยาว 3-6 บรรทัด","instagram":"กระชับ 2-4 บรรทัด","tiktok":"สั้นมาก 1-2 บรรทัด มีฮุค","shopee":"แคปชั่นขาย สั้น ชัด","hashtags":["#แท็ก", "... 5-8 แท็กภาษาไทย/อังกฤษที่เกี่ยวข้อง"]}`;
}

// ---------- โลโก้ร้าน (ผลงานทุกชิ้นไม่มีลายน้ำ ทั้งฟรีและเสียดาว) ----------
async function finish(buf, { logo }) {
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
  if (layers.length) img = sharp(await img.toBuffer()).composite(layers);
  const out = await img.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { out, w: W, h: H };
}

export function registerCreate(app, { q, pool, auth, wrap, log, DATA_DIR, me, rand, hooks = {} }) {
  const WORK_DIR = path.join(DATA_DIR, 'works');
  const REF_DIR = path.join(DATA_DIR, 'refs');
  const LOGO_DIR = path.join(DATA_DIR, 'logos');
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(REF_DIR, { recursive: true });
  const ready = () => !!KEY();
  const UP_TMP = path.join(DATA_DIR, 'tmp'), VID_DIR = path.join(DATA_DIR, 'uploads');
  fs.mkdirSync(UP_TMP, { recursive: true }); fs.mkdirSync(VID_DIR, { recursive: true });
  const upload = multer({ dest: UP_TMP, limits: { fileSize: 400 * 1024 * 1024, files: 7 } });
  const rmTmp = (req) => Object.values(req.files || {}).flat().forEach((f) => fs.rm(f.path, { force: true }, () => {}));
  const PROG = new Map(); // ความคืบหน้างานวิดีโอ {stage, pct}
  const thaiToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

  // ตรวจและจัดรูปคำขอ (ใช้ทั้งตอนทบทวนและตอนยืนยัน)
  function cleanInfo(i) {
    i = i || {};
    return { org: clean(i.org, 80), date: clean(i.date, 60), place: clean(i.place, 100), contact: clean(i.contact, 80), hours: clean(i.hours, 60) };
  }
  function normalize(b, brand) {
    if (b.kind === 'video') return normalizeVideo(b, brand);
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
      useLogo: !!b.useLogo && !!brand.logo, showShop: b.showShop !== false && !style.pr,
      info: cleanInfo(b.info),
    };
    if (!p.product && !p.details && !p.headline) return { error: 'ใส่ชื่อสินค้าหรือรายละเอียดอย่างน้อย 1 อย่าง' };
    const c = checkContent([p.product, p.details, p.headline, p.price, ...Object.values(p.info)].join(' '));
    return { style, tier, versions, p, cost: tier.stars * versions, ...c };
  }
  function normalizeVideo(b, brand) {
    const style = V.VIDEO_STYLES.find((s) => s.id === b.style);
    if (!style) return { error: 'เลือกแนวคลิปก่อน' };
    const link = clean(b.link, 300);
    const length = V.LENGTHS.some((l) => l.id === Number(b.length)) ? Number(b.length) : 30;
    const isSelf = style.id === 'v_self';
    const mode = isSelf && b.selfMode === 'voice' ? 'voice' : 'subs';
    const premium = !!b.premiumVoice && V.premiumReady() && (!isSelf || mode === 'voice');
    const voices = premium ? V.EL_VOICES : V.VOICES;
    const p = {
      goal: GOALS.some((g) => g.id === b.goal) ? b.goal : 'sell',
      link: /^https?:\/\/\S+$/i.test(link) ? link : '',
      product: clean(b.product, 120), details: clean(b.details, 600), price: clean(b.price, 40),
      tone: TONES.includes(b.tone) ? b.tone : TONES[0], length, premium,
      formula: V.FORMULAS.some((f) => f.id === b.formula) ? b.formula : (V.FORMULAS.find((f) => f.rec.includes(b.goal)) || V.FORMULAS[0]).id,
      variant: style.variants.some((x) => x.id === b.variant) ? b.variant : 'random',
      music: V.MUSIC.some((m) => m.id === b.music) ? b.music : 'auto',
      voice: voices.some((v) => v.id === b.voice) ? b.voice : voices[0].id,
      hashtags: (Array.isArray(b.hashtags) ? b.hashtags : []).map((t) => '#' + String(t).replace(/^#+/, '').replace(/\s+/g, '').slice(0, 40)).filter((t) => t.length > 1).slice(0, 20),
      nProducts: 0,
      captionStyle: V.CAPTION_STYLES.some((c) => c.id === b.captionStyle) ? b.captionStyle : 'pop',
      useLogo: !!b.useLogo && !!brand.logo,
    };
    if (isSelf) {
      Object.assign(p, {
        selfMode: mode, videoSec: Math.min(V.SELF_MAX_SEC, Math.max(1, Number(b.videoSec) || 30)),
        captionStyle: V.CAPTION_STYLES.some((c) => c.id === b.captionStyle) ? b.captionStyle : 'pop',
        hookText: clean(b.hookText, 40), useLogo: !!b.useLogo && !!brand.logo, keepAudio: b.keepAudio !== false,
      });
      if (mode === 'voice' && !p.product) return { error: 'โหมด AI พากย์ทับ ต้องใส่ชื่อสินค้า' };
      p.dialogue = mode === 'voice' && !!V.FORMULAS.find((f) => f.id === p.formula)?.dialogue && !premium;
      const c0 = checkContent([p.product, p.details, p.price, p.hookText].join(' '));
      const cost = V.selfPrice(p.videoSec, mode) + (premium ? V.PREMIUM_VOICE_EXTRA : 0);
      return { video: true, self: true, style, tier: { id: mode === 'voice' ? 'self_voice' : 'self_subs', free: false, stars: cost }, versions: 1, p, cost, ...c0 };
    }
    if (V.INFO_STYLES.includes(style.id)) {
      p.info = cleanInfo(b.info);
      p.count = Number(b.count) === 5 ? 5 : 3;
      if (style.id === 'v_tips') p.length = p.count === 5 ? 45 : 30;
      if (!p.product) return { error: style.id === 'v_tips' ? 'ใส่หัวข้อความรู้ก่อน' : 'ใส่ชื่อเรื่อง/ชื่อร้านก่อน' };
      p.dialogue = false;
      p.genBg = style.id === 'v_pr_announce' && !b.hasPhotos;
      const cI = checkContent([p.product, p.details, p.price, ...Object.values(p.info)].join(' '));
      const cost = V.VIDEO_PRICE[p.length] + (premium ? V.PREMIUM_VOICE_EXTRA : 0) + (p.genBg ? 5 : 0);
      return { video: true, style, tier: { id: 'info', free: false, stars: cost }, versions: 1, p, cost, ...cI };
    }
    if (style.id === 'v_series') {
      Object.assign(p, {
        genre: V.SERIES_GENRES.some((g) => g.id === b.genre) ? b.genre : 'magic', art: V.ART.some((a) => a.id === b.art) ? b.art : 'cartoon3d',
        scenes: V.SERIES_PRICE[Number(b.scenes)] ? Number(b.scenes) : 4, plot: clean(b.plot, 600), seriesFrom: Math.max(0, Number(b.seriesFrom) || 0), dialogue: false, premium: false,
      });
      if (!p.seriesFrom && !p.product && !p.plot) return { error: 'ตั้งชื่อเรื่องหรือพิมพ์เรื่องย่อก่อน' };
      if (!p.seriesFrom && p.genre === 'free' && !p.plot) return { error: 'พิมพ์เรื่องย่อที่อยากได้' };
      p.goal = 'content';
      p.length = V.SERIES_LEN[p.scenes];
      const cS = checkContent([p.product, p.plot].join(' '));
      const cost = V.SERIES_PRICE[p.scenes];
      return { video: true, style, tier: { id: 'series', free: false, stars: cost }, versions: 1, p, cost, ...cS };
    }
    if (style.id === 'v_drama') {
      Object.assign(p, {
        genre: V.GENRES.some((g) => g.id === b.genre) ? b.genre : 'inlaw', art: V.ART.some((a) => a.id === b.art) ? b.art : 'cartoon3d',
        scenes: Number(b.scenes) === 6 ? 6 : 4, plot: clean(b.plot, 400), dialogue: false, premium: false,
      });
      if (!p.product) return { error: 'ใส่ชื่อสินค้าก่อน' };
      if (p.genre === 'free' && !p.plot) return { error: 'พิมพ์พล็อตเรื่องที่อยากได้' };
      p.length = p.scenes === 6 ? 45 : 30;
      const cD = checkContent([p.product, p.details, p.price, p.plot].join(' '));
      const cost = V.DRAMA_PRICE[p.scenes];
      return { video: true, style, tier: { id: 'drama', free: false, stars: cost }, versions: 1, p, cost, ...cD };
    }
    if (style.id === 'v_top') {
      p.items = (Array.isArray(b.items) ? b.items : []).slice(0, 5).map((it) => {
        const l = clean(it?.link, 300);
        return { name: clean(it?.name, 40), price: clean(it?.price, 20), note: clean(it?.note, 120), link: /^https?:\/\/\S+$/i.test(l) ? l : '' };
      });
      if (p.items.length < 2 || p.items.some((it) => !it.name)) return { error: 'จัดอันดับต้องมีสินค้าอย่างน้อย 2 ชิ้น และใส่ชื่อทุกชิ้น' };
      p.product = p.product || p.items.map((it) => it.name).join(', ').slice(0, 120);
      p.length = p.items.length <= 3 ? 30 : 45;
    }
    if (!p.product) return { error: 'ใส่ชื่อสินค้าก่อน' };
    // บทคุยกัน 2 คน ใช้เสียงมาตรฐาน (เสียงพรีเมียมเป็นเสียงเดียว)
    p.dialogue = !!V.FORMULAS.find((f) => f.id === p.formula)?.dialogue && !premium;
    const c = checkContent([p.product, p.details, p.price, ...(p.items || []).map((it) => `${it.name} ${it.note}`)].join(' '));
    if (style.id === 'v_top') p.dialogue = false;
    const cost = V.VIDEO_PRICE[p.length] + (premium ? V.PREMIUM_VOICE_EXTRA : 0);
    return { video: true, style, tier: { id: premium ? 'video_premium' : 'video', free: false, stars: cost }, versions: 1, p, cost, ...c };
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
      styles: STYLES.map(({ id, label, emoji, color, ratio, text, pr }) => ({ id, label, emoji, color, ratio, text: !!text, pr: !!pr })),
      tiers: TIERS.map(({ id, label, note, stars, free, size }) => ({ id, label, note, stars, free: !!free, size })),
      stars: m.stars, free: m.freeImages, keepDays: KEEP_DAYS,
      video: {
        styles: V.VIDEO_STYLES.map(({ id, label, emoji, color, reveal, variants, pr }) => ({ id, label, emoji, color, reveal, variants, pr: !!pr })),
        formulas: V.FORMULAS.map(({ id, label, desc, rec, dialogue }) => ({ id, label, desc, rec, dialogue: !!dialogue })),
        music: V.MUSIC,
        lengths: V.LENGTHS, prices: V.VIDEO_PRICE, premiumExtra: V.PREMIUM_VOICE_EXTRA,
        genres: V.GENRES, art: V.ART.map(({ id, label }) => ({ id, label })), dramaPrices: V.DRAMA_PRICE, seriesGenres: V.SERIES_GENRES, seriesPrices: V.SERIES_PRICE, seriesLen: V.SERIES_LEN,
        captionStyles: V.CAPTION_STYLES, selfMaxSec: V.SELF_MAX_SEC, selfPrices: { subs: [V.selfPrice(60, 'subs'), V.selfPrice(120, 'subs'), V.selfPrice(180, 'subs')], voiceExtra: 5 },
        voices: V.VOICES.map(({ id, label, gender }) => ({ id, label, gender })),
        premiumVoices: V.premiumReady() ? V.EL_VOICES.map(({ id, label, gender }) => ({ id, label, gender })) : [],
      },
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
  app.post('/api/works', auth, upload.fields([{ name: 'refs', maxCount: 8 }, { name: 'revs', maxCount: 3 }, { name: 'video', maxCount: 1 }]), wrap(async (req, res) => {
    res.on('finish', () => rmTmp(req));
    if (!ready()) return res.status(503).json({ error: 'ระบบสร้างภาพกำลังตั้งค่า' });
    let body; try { body = JSON.parse(req.body?.data || '{}'); } catch { return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' }); }
    const m = await me(req.uid);
    // คลิปถ่ายเอง: ตรวจไฟล์และความยาวจริงก่อนคิดราคา
    let videoName = '';
    if (body.style === 'v_self') {
      const vf = req.files?.video?.[0];
      let info = null;
      if (vf) info = await V.probe(vf.path).catch(() => null);
      else if (body.fromWork) {
        const old = (await q('SELECT params FROM works WHERE id=$1 AND user_id=$2 AND NOT purged', [Number(body.fromWork) || 0, req.uid])).rows[0];
        if (old?.params?.video && fs.existsSync(path.join(VID_DIR, old.params.video))) { videoName = old.params.video; info = await V.probe(path.join(VID_DIR, videoName)).catch(() => null); }
      }
      if (!info || !info.hasVideo) return res.status(400).json({ error: 'แนบคลิปวิดีโอก่อน (ไฟล์อาจเสียหรือไม่รองรับ)' });
      if (info.sec > V.SELF_MAX_SEC + 1) return res.status(400).json({ error: `คลิปยาวเกิน ${V.SELF_MAX_SEC / 60} นาที ตัดให้สั้นลงก่อน` });
      if (body.selfMode !== 'voice' && !info.hasAudio) return res.status(400).json({ error: 'คลิปนี้ไม่มีเสียงพูด เลือกโหมด "AI พากย์ทับ" แทน' });
      body.videoSec = info.sec;
      if (vf) {
        videoName = `${req.uid}-${Date.now().toString(36)}${rand(5).toLowerCase()}${(path.extname(vf.originalname || '') || '.mp4').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6)}`;
        fs.renameSync(vf.path, path.join(VID_DIR, videoName));
      }
    }
    const n = normalize(body, m.brand || {});
    const dropVideo = () => { if (videoName && req.files?.video?.[0]) fs.rm(path.join(VID_DIR, videoName), { force: true }, () => {}); };
    if (n.error) { dropVideo(); return res.status(400).json({ error: n.error }); }
    if (n.blocked) { dropVideo(); return res.status(400).json({ error: n.blocked }); }
    if (n.self) n.p.video = videoName;

    // ภาพอ้างอิง: อัปโหลดใหม่ หรือใช้ของงานเดิม
    const refs = [];
    const saveRef = async (f) => {
      const name = `${req.uid}-${Date.now().toString(36)}${rand(5).toLowerCase()}.jpg`;
      await sharp(f.path).rotate().resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(path.join(REF_DIR, name));
      refs.push(name);
    };
    try {
      for (const f of req.files?.refs || []) await saveRef(f);
      n.p.nProducts = refs.length;
      if (n.video) for (const f of req.files?.revs || []) await saveRef(f);
    } catch { refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); return res.status(400).json({ error: 'ไฟล์ภาพไม่ถูกต้อง' }); }
    if (!refs.length && body.fromWork) {
      const old = (await q('SELECT refs, params FROM works WHERE id=$1 AND user_id=$2 AND NOT purged', [Number(body.fromWork) || 0, req.uid])).rows[0];
      n.p.nProducts = old?.params?.nProducts ?? (old?.refs || []).length;
      for (const r of old?.refs || []) {
        if (!fs.existsSync(path.join(REF_DIR, r))) continue;
        const name = `${req.uid}-${Date.now().toString(36)}${rand(5).toLowerCase()}.jpg`;
        fs.copyFileSync(path.join(REF_DIR, r), path.join(REF_DIR, name)); refs.push(name);
      }
    }

    if (n.style.id === 'v_top' && n.p.nProducts !== n.p.items.length) { refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); return res.status(400).json({ error: 'ใส่รูปให้ครบทุกสินค้าในอันดับ' }); }
    if (n.style.id === 'v_drama' && !n.p.nProducts) { refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); return res.status(400).json({ error: 'ละครต้องมีรูปสินค้า 1 รูป' }); }
    if (['v_shop', 'v_pr_recap'].includes(n.style.id) && n.p.nProducts < 1) { refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); return res.status(400).json({ error: 'ใส่รูปอย่างน้อย 1 รูป (แนะนำ 3–8 รูป)' }); }
    if (n.style.id !== 'v_show' && n.style.id !== 'v_top' && !V.INFO_STYLES.includes(n.style.id) && (req.files?.refs || []).length > 3) { refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); return res.status(400).json({ error: 'รูปสินค้าได้สูงสุด 3 รูป' }); }
    if (n.video && !n.self && !V.INFO_STYLES.includes(n.style.id) && n.style.id !== 'v_series' && !n.p.nProducts) { refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); return res.status(400).json({ error: 'คลิปต้องมีรูปสินค้าอย่างน้อย 1 รูป' }); }
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.uid]);
      const active = (await c.query("SELECT count(*)::int n FROM works WHERE user_id=$1 AND status IN ('queued','working')", [req.uid])).rows[0].n;
      if (active >= MAX_ACTIVE) { await c.query('ROLLBACK'); dropVideo(); return res.status(429).json({ error: `มีงานกำลังสร้างอยู่ ${active} งาน รอสักครู่` }); }
      let freeSrc = '';
      if (n.tier.free) {
        const fl = await freeLeft(c, req.uid, true);
        if (fl.today > 0) { await c.query('UPDATE free_quota SET daily_date=$2, daily_used=CASE WHEN daily_date=$2 THEN daily_used+1 ELSE 1 END WHERE user_id=$1', [req.uid, thaiToday()]); freeSrc = 'daily'; }
        else if (fl.welcome > 0) { await c.query('UPDATE free_quota SET welcome_left=welcome_left-1 WHERE user_id=$1', [req.uid]); freeSrc = 'welcome'; }
        else { await c.query('ROLLBACK'); dropVideo(); return res.status(402).json({ error: 'ภาพฟรีหมดแล้ว เลือกระดับมาตรฐาน (5 ดาว) ได้เลย' }); }
      } else {
        const bal = (await c.query('SELECT COALESCE(sum(delta),0)::int s FROM star_ledger WHERE user_id=$1', [req.uid])).rows[0].s;
        if (bal < n.cost) { await c.query('ROLLBACK'); dropVideo(); return res.status(402).json({ error: `ดาวไม่พอ ต้องใช้ ${n.cost} ดาว มีอยู่ ${bal} ดาว` }); }
      }
      const title = n.p.product || n.p.headline || n.style.label;
      const w = (await c.query(`INSERT INTO works(user_id,kind,style,title,params,tier,versions,cost,free,refs,expires_at)
        VALUES($1,$10,$2,$3,$4,$5,$6,$7,$8,$9, now() + interval '${KEEP_DAYS} days') RETURNING id`,
      [req.uid, n.style.id, title.slice(0, 80), { ...n.p, freeSrc, warnings: n.warnings }, n.tier.id, n.versions, n.cost, !!n.tier.free, refs, n.video ? 'video' : 'image'])).rows[0];
      if (n.cost > 0) await c.query("INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'spend',$3,$4)", [req.uid, -n.cost, `work:${w.id}`, n.self ? `${n.style.label} ${Math.round(n.p.videoSec)} วิ` : n.video ? `สร้างคลิป ${n.style.label} ${n.p.length} วิ` : `สร้างภาพ ${n.style.label} ×${n.versions}`]);
      await c.query("INSERT INTO audit_log(user_id,action,detail,ip) VALUES($1,'work_create',$2,$3)", [req.uid, { id: w.id, style: n.style.id, tier: n.tier.id, cost: n.cost }, req.ip || '']);
      await c.query('COMMIT');
      kick();
      res.json({ id: w.id, me: await me(req.uid) });
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); dropVideo(); throw e; } finally { c.release(); }
  }));

  /** สร้างงานจากระบบ (โหมดอัตโนมัติ): refFiles = ไฟล์รูปบนดิสก์ จะคัดลอกเป็นของงานนี้ */
  async function createInternal(uid, body, refFiles = [], note = '', opts = {}) {
    const m = await me(uid);
    const n = normalize(body, m.brand || {});
    if (n.error || n.blocked) return { error: n.error || n.blocked };
    if (n.tier.free) return { error: 'โหมดอัตโนมัติไม่ใช้ภาพฟรี' };
    const refs = [];
    for (const f of refFiles) {
      if (!fs.existsSync(f)) continue;
      const name = `${uid}-${Date.now().toString(36)}${rand(5).toLowerCase()}.jpg`;
      fs.copyFileSync(f, path.join(REF_DIR, name)); refs.push(name);
    }
    n.p.nProducts = refs.length;
    if (n.video && !n.p.nProducts && !V.INFO_STYLES.includes(n.style.id) && n.style.id !== 'v_series') return { error: 'ต้องมีรูปสินค้า' };
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [uid]);
      const bal = (await c.query('SELECT COALESCE(sum(delta),0)::int s FROM star_ledger WHERE user_id=$1', [uid])).rows[0].s;
      if (!opts.system && bal < n.cost) { await c.query('ROLLBACK'); refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); return { error: 'ดาวไม่พอ', lowStars: true, cost: n.cost, bal }; }
      if (opts.system) n.cost = 0; // งานตัวอย่างของระบบ ไม่ตัดดาว
      const title = n.p.product || n.p.headline || n.style.label;
      const w = (await c.query(`INSERT INTO works(user_id,kind,style,title,params,tier,versions,cost,free,refs,expires_at)
        VALUES($1,$9,$2,$3,$4,$5,$6,$7,false,$8, now() + interval '${KEEP_DAYS} days') RETURNING id`,
      [uid, n.style.id, title.slice(0, 80), { ...n.p, auto: true, warnings: n.warnings }, n.tier.id, n.versions, n.cost, refs, n.video ? 'video' : 'image'])).rows[0];
      if (n.cost) await c.query("INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'spend',$3,$4)", [uid, -n.cost, `work:${w.id}`, `อัตโนมัติ: ${n.style.label}${note ? ` · ${note}` : ''}`]);
      await c.query("INSERT INTO audit_log(user_id,action,detail) VALUES($1,'work_auto',$2)", [uid, { id: w.id, style: n.style.id, cost: n.cost }]);
      await c.query('COMMIT');
      kick();
      return { id: w.id, cost: n.cost };
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); refs.forEach((r) => fs.rm(path.join(REF_DIR, r), () => {})); throw e; } finally { c.release(); }
  }

  // คลิปถ่ายเอง: แก้ซับ แล้วสั่งตัดต่อ
  app.put('/api/works/:id/segments', auth, wrap(async (req, res) => {
    const w = await own(req); if (!w || w.style !== 'v_self') return res.status(404).json({ error: 'ไม่พบผลงาน' });
    if (!['review', 'done'].includes(w.status)) return res.status(409).json({ error: 'ยังแก้ไม่ได้ตอนนี้' });
    const segs = (Array.isArray(req.body?.segments) ? req.body.segments : []).slice(0, 200)
      .map((g) => ({ start: Math.max(0, Number(g.start) || 0), end: Number(g.end) || 0, text: clean(g.text, 80) })).filter((g) => g.text && g.end > g.start);
    await q('UPDATE works SET params = params || $2::jsonb WHERE id=$1', [w.id, JSON.stringify({ segments: segs })]);
    res.json({ ok: true, n: segs.length });
  }));
  app.post('/api/works/:id/render', auth, wrap(async (req, res) => {
    const w = await own(req); if (!w || w.style !== 'v_self') return res.status(404).json({ error: 'ไม่พบผลงาน' });
    if (w.purged) return res.status(410).json({ error: 'ไฟล์ถูกลบแล้ว' });
    if (w.status === 'review') {
      await q("UPDATE works SET status='queued', params = params || '{\"phase\":\"render\"}'::jsonb WHERE id=$1", [w.id]);
    } else if (w.status === 'done') {
      if ((w.params.rerenders || 0) >= 1) return res.status(402).json({ error: 'แก้ซับฟรีครบ 1 ครั้งแล้ว สร้างใหม่ได้ที่ "สร้างแบบนี้อีก"' });
      await q("UPDATE works SET status='queued', params = params || jsonb_build_object('phase','render','rerenders',$2::int) WHERE id=$1", [w.id, (w.params.rerenders || 0) + 1]);
    } else return res.status(409).json({ error: 'ยังสั่งตัดต่อไม่ได้ตอนนี้' });
    kick();
    res.json({ ok: true });
  }));

  const view = (w) => ({
    id: w.id, kind: w.kind, style: w.style, styleLabel: [...STYLES, ...V.VIDEO_STYLES].find((s) => s.id === w.style)?.label || w.style, title: w.title,
    progress: PROG.get(w.id) || null,
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
      res.setHeader('content-disposition', `attachment; filename="mcrich-${w.id}-${Number(req.params.n) + 1}${path.extname(f.name) || '.jpg'}"`);
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
  let running = 0, videoRunning = 0;
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
  async function finalizeCaptions(w, p, cap) {
    const captions = {};
    const keepLines = (v) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2200);
    for (const k of ['facebook', 'instagram', 'tiktok', 'shopee']) captions[k] = keepLines(cap[k]);
    // ใส่ลิงก์: ลิงก์สั้นแยกตามแพลตฟอร์ม (นับคลิกได้) ถ้าไม่มีระบบลิงก์สั้นใช้ลิงก์จริง
    if (p.link) {
      const short = hooks.shortLinks ? await hooks.shortLinks(w, Object.keys(captions)).catch((e) => { log('shortlink', e.message); return {}; }) : {};
      for (const k of Object.keys(captions)) {
        const url = short[k] || p.link;
        captions[k] = captions[k].includes('{LINK}') ? captions[k].replaceAll('{LINK}', url) : captions[k].split(p.link).join(url);
        if (captions[k] && !captions[k].includes(url)) captions[k] += `\n👉 ${url}`;
      }
    } else for (const k of Object.keys(captions)) captions[k] = captions[k].replaceAll('{LINK}', '').trim();
    const tags = [...new Set([...p.hashtags, ...(Array.isArray(cap.hashtags) ? cap.hashtags : []).map((t) => '#' + String(t).replace(/^#+/, '').replace(/\s+/g, ''))])].filter((t) => t.length > 1).slice(0, 25);
    return { captions, tags };
  }

  // ---------- คลิปวิดีโอ ----------
  const CTA = { aff: 'กดตะกร้าได้เลย 👇', sell: 'ทักแชทสั่งเลย 👇', promo: 'แวะมาที่ร้านเลย 📍', content: 'กดติดตามไว้เลย ❤️', pr: 'ติดตามข่าวสาร\nจากเรา' };
  async function processVideo(w) {
    const base0 = V.VIDEO_STYLES.find((s) => s.id === w.style);
    // ลูกเล่นฉากเปิด: เลือก/สุ่มก่อนเขียนบท เพื่อให้คำเปิดตรงกับภาพ
    const vr = w.params.variant === 'random' || !w.params.variant ? base0.variants[Math.floor(Math.random() * base0.variants.length)] : base0.variants.find((x) => x.id === w.params.variant);
    const style = { ...base0, open: vr?.open || base0.open, hook: vr?.hook || base0.hook, variantId: vr?.id || '' };
    const brand = (await q('SELECT brand FROM profiles WHERE user_id=$1', [w.user_id])).rows[0]?.brand || {};
    const p = w.params;
    const stage = (s, pct) => PROG.set(w.id, { stage: s, pct });
    const t0 = Date.now();
    let script, voice;
    try {
      stage('AI กำลังเขียนบท', 5);
      script = await V.writeScript(p, style, brand, GOALS.find((g) => g.id === p.goal)?.label || '');
      stage('กำลังพากย์เสียง', 20);
      voice = p.premium ? await V.voiceEleven(script.lines, p.voice)
        : await V.voiceGemini(script.lines, p.voice, p.tone, script.speakers, p.dialogue ? V.partnerVoice(p.voice) : '');
    } catch (e) {
      log('video prep fail', w.id, e.message);
      PROG.delete(w.id);
      return refund(w, 'AI เขียนบท/พากย์เสียงไม่สำเร็จ ลองใหม่อีกครั้ง · คืนดาวแล้ว');
    }
    const files = w.refs.filter((r) => fs.existsSync(path.join(REF_DIR, r))).map((r) => V.fileUrl(path.join(REF_DIR, r)));
    const nP = Math.max(1, Math.min(p.nProducts || 1, files.length));
    const prods = files.slice(0, nP), revs = files.slice(nP);
    let out;
    const isShow = style.reveal === 'show' || style.reveal === 'top';
    const showReq = () => {
      const al = voice.alignment;
      const starts = V.lineStarts(al, script.lines), end = V.speechEnd(al) || 1;
      const slides = [];
      if (style.reveal === 'top') {
        const N = p.items.length;
        slides.push({ url: prods[N - 1] || prods[0], start: 0, intro: true });
        for (let r = N; r >= 1; r--) {
          const li = script.rankAt?.[r];
          const st = li !== undefined ? starts[li] : end * ((N - r + 1) / (N + 1));
          slides.push({ url: prods[r - 1] || prods[0], start: st, rank: r, title: p.items[r - 1].name, price: p.items[r - 1].price });
        }
      } else {
        // แบ่งรูปเท่าๆ กันตามเวลา แล้วขยับจุดตัดไปที่ต้นประโยคที่ใกล้ที่สุด
        const n = prods.length;
        for (let i = 0; i < n; i++) {
          const ideal = (end * i) / n;
          const snap = i === 0 ? 0 : starts.reduce((b, x) => (Math.abs(x - ideal) < Math.abs(b - ideal) ? x : b), ideal);
          slides.push({ url: prods[i], start: Math.abs(snap - ideal) < end / n / 2 ? snap : ideal });
        }
      }
      slides.sort((a, b) => a.start - b.start);
      const hl = script.highlights.map((text, i) => ({ text, start: Math.min(end - 1, 3 + ((end - 4) * (i + 0.3)) / Math.max(1, script.highlights.length)) }));
      return {
        type: 'show', mode: style.reveal, template: style.variantId || 'kenburns', topN: p.items?.length,
        voiceover: { ...voice, text: script.lines.join(' ') }, slides, highlights: style.reveal === 'top' ? [] : hl,
        hookText: script.hookText, price: p.price, cta: script.cta && script.cta.length <= 18 ? script.cta : CTA[p.goal] || CTA.sell,
        captionStyle: p.captionStyle || 'pop', accent: /^#[0-9a-f]{6}$/i.test(brand.color || '') ? brand.color : undefined,
        music: V.pickMusic(p.music, style, p.tone) || undefined,
        logoUrl: p.useLogo && brand.logo ? V.fileUrl(path.join(LOGO_DIR, path.basename(brand.logo))) : undefined,
        metadata: { mcrich: w.id },
      };
    };
    try {
      stage('กำลังตัดต่อ', 35);
      out = await V.render(isShow ? showReq() : {
        type: 'review', reveal: style.reveal, openPhrase: style.open || undefined,
        themeName: style.themes ? style.themes[Math.floor(Math.random() * style.themes.length)] : undefined,
        revealVariant: style.variantId,
        music: V.pickMusic(p.music, style, p.tone) || undefined, musicVolume: 0.12,
        voiceover: { ...voice, text: script.lines.join(' ') },
        hero: prods[0], shots: prods, reviews: revs,
        hookText: script.hookText || style.hook, price: p.price, cta: script.cta && script.cta.length <= 18 ? script.cta : CTA[p.goal] || CTA.sell,
        metadata: { mcrich: w.id },
      }, (s) => stage(s.status === 'queued' ? 'รอคิวตัดต่อ' : s.stage || 'กำลังตัดต่อ', 35 + Math.round((s.progress || 0) * 0.6)));
    } catch (e) {
      log('video render fail', w.id, e.stack || e.message);
      PROG.delete(w.id);
      return refund(w, 'ตัดต่อคลิปไม่สำเร็จ · คืนดาวแล้ว');
    }
    stage('เกือบเสร็จ', 97);
    const base = `${w.user_id}-${w.id}-v-${rand(6).toLowerCase()}`;
    V.moveFile(out.mp4, path.join(WORK_DIR, `${base}.mp4`));
    let thumb = '';
    if (fs.existsSync(out.jpg)) { await sharp(out.jpg).resize({ width: 480 }).webp({ quality: 78 }).toFile(path.join(WORK_DIR, `${base}.webp`)); thumb = `${base}.webp`; fs.rm(out.jpg, () => {}); }
    const { captions, tags } = await finalizeCaptions(w, p, script.captions);
    if (style.reveal === 'top') {
      // รายการสินค้าพร้อมลิงก์แต่ละชิ้น (ลิงก์สั้นนับคลิกได้)
      const rows = [];
      for (const [i, it] of p.items.entries()) {
        const url = it.link ? (hooks.shortLink ? await hooks.shortLink(w, it.link, it.name).catch(() => it.link) : it.link) : '';
        rows.push(`#${i + 1} ${it.name}${it.price ? ` ${it.price}` : ''}${url ? ` 👉 ${url}` : ''}`);
      }
      for (const k of Object.keys(captions)) if (captions[k]) captions[k] += `\n\n${rows.join('\n')}`;
    }
    const vf = [{ name: `${base}.mp4`, thumb, w: 1080, h: 1920, type: 'video' }];
    await q("UPDATE works SET status='done', files=$2, captions=$3, hashtags=$4, params = params || $5::jsonb, done_at=now() WHERE id=$1",
      [w.id, JSON.stringify(vf), captions, tags, JSON.stringify({ script: script.lines.map((l, i) => (p.dialogue ? `${script.speakers[i]}: ${l}` : l)) })]);
    PROG.delete(w.id);
    if (hooks.onDone) hooks.onDone({ ...w, files: vf }).catch((e) => log('onDone', w.id, e.message));
    log('video done', w.id, style.id, p.premium ? 'elevenlabs' : 'gemini-tts', `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // ---------- คลิปความรู้ / ร้าน / ประชาสัมพันธ์ ----------
  async function processInfo(w) {
    const p = w.params;
    const stage = (s, pct) => PROG.set(w.id, { stage: s, pct });
    const fail = (msg) => { PROG.delete(w.id); return refund(w, msg); };
    const brand = (await q('SELECT brand FROM profiles WHERE user_id=$1', [w.user_id])).rows[0]?.brand || {};
    const t0 = Date.now();
    const photos = w.refs.map((r) => path.join(REF_DIR, r)).filter((f) => fs.existsSync(f));
    const tmpFiles = [];
    let d, voice;
    try {
      stage('AI กำลังดูรูปและเขียนบท', 5);
      const small = await Promise.all(photos.slice(0, 8).map((f) => sharp(f).resize({ width: 768, height: 768, fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()));
      d = await V.writeInfo(w.style, p, brand, w.style === 'v_tips' || w.style === 'v_pr_announce' ? [] : small);
      // ประกาศที่ไม่มีรูป: AI วาดพื้นหลังให้ 2 ภาพ
      if (p.genBg) {
        stage('AI กำลังวาดพื้นหลัง', 15);
        const model = MODEL_OVERRIDE || TIERS[1].model;
        for (let i = 0; i < 2; i++) {
          try {
            const buf = await genImage({ model, prompt: `Clean, formal, professional background image for an official announcement about: ${p.product}. ${p.details || ''}. Relevant scene or symbolic imagery, soft focus, calm colors${/^#[0-9a-f]{6}$/i.test(brand.color || '') ? ` with accents of ${brand.color}` : ''}. Vertical 9:16. No text, no letters, no logos.`, refs: [], ratio: '9:16', size: '1K' });
            const f = path.join(WORK_DIR, `tmp-${w.id}-bg${i}.jpg`); await sharp(buf).jpeg({ quality: 88 }).toFile(f); tmpFiles.push(f);
          } catch (e) { log('info bg fail', w.id, e.message); }
        }
      }
      const lines = d.slides.flatMap((sl) => sl.lines);
      stage('กำลังพากย์เสียง', 25);
      voice = p.premium ? await V.voiceEleven(lines, p.voice) : await V.voiceGemini(lines, p.voice, p.tone);
      d.lines = lines;
    } catch (e) { log('info prep fail', w.id, e.message); tmpFiles.forEach((f) => fs.rm(f, () => {})); return fail('AI เขียนบท/พากย์เสียงไม่สำเร็จ · คืนดาวแล้ว'); }
    const starts = V.lineStarts(voice.alignment, d.lines);
    let li = 0;
    const bgs = [...photos, ...tmpFiles];
    const mid = d.slides.length - 2;
    const slides = d.slides.map((sl, i) => {
      const start = starts[li] ?? 0; li += sl.lines.length;
      const ph = sl.photo >= 1 && sl.photo <= photos.length ? photos[sl.photo - 1] : null;
      const usePhoto = (w.style === 'v_shop' || w.style === 'v_pr_recap') && ph;
      const bg = usePhoto ? ph : w.style === 'v_pr_announce' && bgs.length ? bgs[i % bgs.length] : w.style === 'v_tips' && photos[0] && (i === 0 || i === d.slides.length - 1) ? photos[0] : null;
      return { start, kind: usePhoto ? 'photo' : 'card', url: bg ? V.fileUrl(bg) : undefined, title: sl.title, body: sl.body, emoji: sl.emoji, n: w.style === 'v_tips' && i > 0 && i <= mid ? i : undefined };
    });
    const inf = p.info || {};
    const endLines = [inf.date && `📅 ${inf.date}`, inf.place && `📍 ${inf.place}`, inf.hours && `🕒 ${inf.hours}`, inf.contact && `☎ ${inf.contact}`, w.style === 'v_shop' && p.price && `🔥 ${p.price}`].filter(Boolean);
    let out;
    try {
      stage('กำลังตัดต่อ', 35);
      out = await V.render({
        type: 'info', voiceover: { ...voice, text: d.lines.join(' ') }, slides, formal: d.formal, badge: d.badge, total: d.n || undefined,
        endTitle: w.style === 'v_tips' ? (brand.shopName || 'กดติดตามไว้เลย') : (inf.org || brand.shopName || p.product), endLines,
        captionStyle: p.captionStyle || 'pop', accent: /^#[0-9a-f]{6}$/i.test(brand.color || '') ? brand.color : undefined,
        music: V.pickMusic(p.music === 'auto' && d.formal ? 'chill' : p.music, { reveal: 'none' }, p.tone) || undefined, musicVolume: d.formal ? 0.06 : 0.09,
        logoUrl: p.useLogo && brand.logo ? V.fileUrl(path.join(LOGO_DIR, path.basename(brand.logo))) : undefined,
        metadata: { mcrich: w.id },
      }, (s) => stage(s.status === 'queued' ? 'รอคิวตัดต่อ' : s.stage || 'กำลังตัดต่อ', 35 + Math.round((s.progress || 0) * 0.6)));
    } catch (e) { log('info render fail', w.id, e.message); return fail('ตัดต่อคลิปไม่สำเร็จ · คืนดาวแล้ว'); }
    finally { setTimeout(() => tmpFiles.forEach((f) => fs.rm(f, () => {})), 1000); }
    stage('เกือบเสร็จ', 97);
    const base = `${w.user_id}-${w.id}-i-${rand(6).toLowerCase()}`;
    V.moveFile(out.mp4, path.join(WORK_DIR, `${base}.mp4`));
    let thumb = '';
    if (fs.existsSync(out.jpg)) { await sharp(out.jpg).resize({ width: 480 }).webp({ quality: 78 }).toFile(path.join(WORK_DIR, `${base}.webp`)); thumb = `${base}.webp`; fs.rm(out.jpg, () => {}); }
    const { captions, tags } = await finalizeCaptions(w, p, d.captions);
    const vf = [{ name: `${base}.mp4`, thumb, w: 1080, h: 1920, type: 'video' }];
    await q("UPDATE works SET status='done', files=$2, captions=$3, hashtags=$4, params = params || $5::jsonb, done_at=now() WHERE id=$1",
      [w.id, JSON.stringify(vf), captions, tags, JSON.stringify({ script: d.lines })]);
    PROG.delete(w.id);
    if (hooks.onDone) hooks.onDone({ ...w, files: vf }).catch((e) => log('onDone', w.id, e.message));
    log('info done', w.id, w.style, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // ---------- ละครสั้นขายของ ----------
  async function processDrama(w) {
    const p = w.params;
    const stage = (s, pct) => PROG.set(w.id, { stage: s, pct });
    const fail = (msg) => { PROG.delete(w.id); return refund(w, msg); };
    const brand = (await q('SELECT brand FROM profiles WHERE user_id=$1', [w.user_id])).rows[0]?.brand || {};
    const t0 = Date.now();
    const prodFile = w.refs.map((r) => path.join(REF_DIR, r)).find((f) => fs.existsSync(f));
    if (!prodFile) return fail('ไม่พบรูปสินค้า · คืนดาวแล้ว');
    const prodBuf = fs.readFileSync(prodFile);
    let d;
    try { stage('AI กำลังเขียนบทละคร', 5); d = await V.writeDrama(p, brand, GOALS.find((g) => g.id === p.goal)?.label || ''); }
    catch (e) { log('drama script fail', w.id, e.message); return fail('AI เขียนบทไม่สำเร็จ ลองใหม่อีกครั้ง · คืนดาวแล้ว'); }
    // ฉาก: ฉากแรกก่อน แล้วใช้เป็นต้นแบบหน้าตาตัวละครของฉากถัดไป (ทำพร้อมกัน 2 ฉาก)
    const art = V.ART.find((a) => a.id === p.art) || V.ART[0];
    const model = MODEL_OVERRIDE || TIERS[1].model;
    const imgs = new Array(d.scenes.length).fill(null);
    let done = 0;
    const sceneImg = async (i) => {
      const refs = i === 0 ? [prodBuf] : [prodBuf, imgs[0]];
      try {
        const buf = await genImage({ model, prompt: V.scenePrompt(d.scenes[i], d.chars, art, i === 0), refs, ratio: '9:16', size: '1K' });
        const f = path.join(WORK_DIR, `tmp-${w.id}-sc${i}.jpg`);
        await sharp(buf).rotate().jpeg({ quality: 90 }).toFile(f);
        imgs[i] = fs.readFileSync(f);
        return f;
      } catch (e) { log('drama scene fail', w.id, i, e.message); return null; } finally { stage(`AI กำลังวาดฉาก ${++done}/${d.scenes.length}`, 10 + Math.round((done / d.scenes.length) * 35)); }
    };
    stage(`AI กำลังวาดฉาก 0/${d.scenes.length}`, 10);
    const files = new Array(d.scenes.length).fill(null);
    files[0] = await sceneImg(0);
    if (!files[0]) return fail('AI วาดฉากไม่สำเร็จ (อาจขัดนโยบายเนื้อหา) · คืนดาวแล้ว');
    let next = 1;
    await Promise.all([0, 1].map(async () => { while (next < d.scenes.length) { const i = next++; files[i] = await sceneImg(i); } }));
    for (let i = 1; i < files.length; i++) if (!files[i]) files[i] = files[i - 1]; // ฉากที่พลาด ใช้ภาพฉากก่อนหน้า
    // เสียง: ทีละบท ตามตัวละคร
    const lines = [];
    try {
      const all = d.scenes.flatMap((sc, si) => sc.lines.map((l) => ({ ...l, shot: si })));
      let k = 0;
      await Promise.all([0, 1, 2].map(async () => {
        while (k < all.length) {
          const i = k++, L = all[i];
          const c = d.chars.find((x) => x.name === L.name) || null;
          const v = await V.voiceOne(L.text, c ? c.voice : V.NARR_VOICE);
          lines[i] = { text: L.text, name: c ? c.name : '', color: c ? c.color : '#FFFFFF', pitch: c ? c.pitch : 1, shot: L.shot, audio_base64: v.audio_base64, alignment: v.alignment, format: 'wav' };
          stage(`กำลังพากย์เสียง ${lines.filter(Boolean).length}/${all.length}`, 45 + Math.round((lines.filter(Boolean).length / all.length) * 10));
        }
      }));
      // ฉากจบ: คนสุดท้ายพูด CTA ซ้ำ เป็นท่อนฉากจบ
      const last = lines.at(-1);
      const ctaTxt = d.cta && d.cta.length <= 24 ? d.cta.replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF]/gu, '').trim() : '';
      if (ctaTxt && last) {
        const c = d.chars.find((x) => x.name === last.name);
        const v = await V.voiceOne(ctaTxt, c ? c.voice : V.NARR_VOICE);
        lines.push({ ...last, text: ctaTxt, shot: -1, audio_base64: v.audio_base64, alignment: v.alignment });
      }
    } catch (e) { log('drama voice fail', w.id, e.message); files.forEach((f) => f && fs.rm(f, () => {})); return fail('พากย์เสียงไม่สำเร็จ · คืนดาวแล้ว'); }
    let out;
    try {
      stage('กำลังตัดต่อ', 58);
      out = await V.render({
        type: 'story', lines, shots: files.map((f, i) => ({ url: V.fileUrl(f), kind: 'image', onscreen: i === 0 ? (d.hookText || d.scenes[0].onscreen) : d.scenes[i].onscreen })),
        endImage: V.fileUrl(prodFile), price: p.price, cta: CTA[p.goal] || CTA.sell, music: V.pickMusic(p.music, { reveal: 'none' }, p.tone) || undefined, musicVolume: 0.08,
        metadata: { mcrich: w.id },
      }, (s) => stage(s.status === 'queued' ? 'รอคิวตัดต่อ' : s.stage || 'กำลังตัดต่อ', 58 + Math.round((s.progress || 0) * 0.38)));
    } catch (e) { log('drama render fail', w.id, e.message); return fail('ตัดต่อคลิปไม่สำเร็จ · คืนดาวแล้ว'); }
    finally { setTimeout(() => [...new Set(files)].forEach((f) => f && fs.rm(f, () => {})), 1000); }
    stage('เกือบเสร็จ', 97);
    const base = `${w.user_id}-${w.id}-d-${rand(6).toLowerCase()}`;
    V.moveFile(out.mp4, path.join(WORK_DIR, `${base}.mp4`));
    let thumb = '';
    if (fs.existsSync(out.jpg)) { await sharp(out.jpg).resize({ width: 480 }).webp({ quality: 78 }).toFile(path.join(WORK_DIR, `${base}.webp`)); thumb = `${base}.webp`; fs.rm(out.jpg, () => {}); }
    const { captions, tags } = await finalizeCaptions(w, p, d.captions);
    const vf = [{ name: `${base}.mp4`, thumb, w: 1080, h: 1920, type: 'video' }];
    await q("UPDATE works SET status='done', title=$6, files=$2, captions=$3, hashtags=$4, params = params || $5::jsonb, done_at=now() WHERE id=$1",
      [w.id, JSON.stringify(vf), captions, tags, JSON.stringify({ script: lines.filter((l) => l.shot >= 0).map((l) => `${l.name || 'ผู้บรรยาย'}: ${l.text}`), cast: d.chars.map(({ name, gender, age }) => ({ name, gender, age })) }), (d.title || w.title).slice(0, 80)]);
    PROG.delete(w.id);
    if (hooks.onDone) hooks.onDone({ ...w, files: vf }).catch((e) => log('onDone', w.id, e.message));
    log('drama done', w.id, d.scenes.length, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // ---------- ซีรีส์แนวตั้ง (ไม่มีสินค้า · ต่อเป็นตอนได้ ตัวละคร/เสียง/ลายเส้นเดิม) ----------
  const SERIES_DIR = path.join(DATA_DIR, 'series');
  fs.mkdirSync(SERIES_DIR, { recursive: true });
  async function processSeries(w) {
    const p = w.params;
    const stage = (s, pct) => PROG.set(w.id, { stage: s, pct });
    const fail = (msg) => { PROG.delete(w.id); return refund(w, msg); };
    const t0 = Date.now();
    let prev = null;
    if (p.seriesFrom) {
      const pw = (await q("SELECT params FROM works WHERE id=$1 AND user_id=$2 AND style='v_series'", [p.seriesFrom, w.user_id])).rows[0];
      prev = pw?.params?.series || null;
      if (!prev) return fail('ไม่พบตอนก่อนหน้า · คืนดาวแล้ว');
      p.genre = prev.genre || p.genre; p.art = prev.art || p.art;
    }
    let d;
    try { stage(prev ? `AI กำลังเขียนตอนที่ ${(prev.ep || 1) + 1}` : 'AI กำลังเขียนบทซีรีส์', 5); d = await V.writeSeries(p, prev); }
    catch (e) { log('series script fail', w.id, e.message); return fail('AI เขียนบทไม่สำเร็จ ลองใหม่อีกครั้ง · คืนดาวแล้ว'); }
    const art = V.ART.find((a) => a.id === p.art) || V.ART[0];
    const model = MODEL_OVERRIDE || TIERS[1].model;
    const prevFrame = prev?.frame && fs.existsSync(path.join(SERIES_DIR, path.basename(prev.frame))) ? fs.readFileSync(path.join(SERIES_DIR, path.basename(prev.frame))) : null;
    const imgs = new Array(d.scenes.length).fill(null);
    let done = 0;
    const sceneImg = async (i) => {
      const refs = i === 0 ? (prevFrame ? [prevFrame] : []) : [imgs[0]];
      try {
        const buf = await genImage({ model, prompt: V.seriesScenePrompt(d.scenes[i], d.chars, art, i === 0 ? (prevFrame ? 'prev' : '') : 'first'), refs, ratio: '9:16', size: '1K' });
        const f = path.join(WORK_DIR, `tmp-${w.id}-sc${i}.jpg`);
        await sharp(buf).rotate().jpeg({ quality: 90 }).toFile(f);
        imgs[i] = fs.readFileSync(f);
        return f;
      } catch (e) { log('series scene fail', w.id, i, e.message); return null; } finally { stage(`AI กำลังวาดฉาก ${++done}/${d.scenes.length}`, 10 + Math.round((done / d.scenes.length) * 35)); }
    };
    stage(`AI กำลังวาดฉาก 0/${d.scenes.length}`, 10);
    const files = new Array(d.scenes.length).fill(null);
    files[0] = await sceneImg(0);
    if (!files[0]) return fail('AI วาดฉากไม่สำเร็จ (อาจขัดนโยบายเนื้อหา) · คืนดาวแล้ว');
    let next = 1;
    await Promise.all([0, 1].map(async () => { while (next < d.scenes.length) { const i = next++; files[i] = await sceneImg(i); } }));
    for (let i = 1; i < files.length; i++) if (!files[i]) files[i] = files[i - 1];
    const lines = [];
    try {
      const all = d.scenes.flatMap((sc, si) => sc.lines.map((l) => ({ ...l, shot: si })));
      let k = 0;
      await Promise.all([0, 1, 2].map(async () => {
        while (k < all.length) {
          const i = k++, L = all[i];
          const c = d.chars.find((x) => x.name === L.name) || null;
          const v = await V.voiceOne(L.text, c ? c.voice : V.NARR_VOICE);
          lines[i] = { text: L.text, name: c ? c.name : '', color: c ? c.color : '#FFFFFF', pitch: c ? c.pitch : 1, shot: L.shot, audio_base64: v.audio_base64, alignment: v.alignment, format: 'wav' };
          stage(`กำลังพากย์เสียง ${lines.filter(Boolean).length}/${all.length}`, 45 + Math.round((lines.filter(Boolean).length / all.length) * 10));
        }
      }));
    } catch (e) { log('series voice fail', w.id, e.message); files.forEach((f) => f && fs.rm(f, () => {})); return fail('พากย์เสียงไม่สำเร็จ · คืนดาวแล้ว'); }
    // เก็บภาพฉากแรกไว้ถาวร ใช้เป็นต้นแบบหน้าตาตัวละครของตอนถัดไป
    const frame = `w${w.id}-${rand(6).toLowerCase()}.jpg`;
    try { fs.copyFileSync(files[0], path.join(SERIES_DIR, frame)); } catch { /* ไม่มีต้นแบบก็ยังต่อได้ */ }
    let out;
    try {
      stage('กำลังตัดต่อ', 58);
      out = await V.render({
        type: 'story', lines, shots: files.map((f, i) => ({ url: V.fileUrl(f), kind: 'image', onscreen: i === 0 ? (d.hookText || `EP.${d.ep} ${d.epTitle}`) : d.scenes[i].onscreen })),
        endImage: V.fileUrl(files[files.length - 1]), price: `EP.${d.ep}`, cta: 'ติดตามตอนต่อไป', music: V.pickMusic(p.music, { reveal: 'none' }, p.tone || 'ตื่นเต้น') || undefined, musicVolume: 0.1,
        metadata: { mcrich: w.id },
      }, (s) => stage(s.status === 'queued' ? 'รอคิวตัดต่อ' : s.stage || 'กำลังตัดต่อ', 58 + Math.round((s.progress || 0) * 0.38)));
    } catch (e) { log('series render fail', w.id, e.message); fs.rm(path.join(SERIES_DIR, frame), () => {}); return fail('ตัดต่อคลิปไม่สำเร็จ · คืนดาวแล้ว'); }
    finally { setTimeout(() => [...new Set(files)].forEach((f) => f && fs.rm(f, () => {})), 1000); }
    stage('เกือบเสร็จ', 97);
    const base = `${w.user_id}-${w.id}-s-${rand(6).toLowerCase()}`;
    V.moveFile(out.mp4, path.join(WORK_DIR, `${base}.mp4`));
    let thumb = '';
    if (fs.existsSync(out.jpg)) { await sharp(out.jpg).resize({ width: 480 }).webp({ quality: 78 }).toFile(path.join(WORK_DIR, `${base}.webp`)); thumb = `${base}.webp`; fs.rm(out.jpg, () => {}); }
    const { captions, tags } = await finalizeCaptions(w, p, d.captions);
    const vf = [{ name: `${base}.mp4`, thumb, w: 1080, h: 1920, type: 'video' }];
    const series = { title: d.title, ep: d.ep, epTitle: d.epTitle, summary: d.summary, cliff: d.cliff, genre: p.genre, art: p.art, frame,
      chars: d.chars.map(({ name, gender, age, look, voice, pitch, color }) => ({ name, gender, age, look, voice, pitch, color })), root: prev?.root || w.id };
    await q("UPDATE works SET status='done', title=$6, files=$2, captions=$3, hashtags=$4, params = params || $5::jsonb, done_at=now() WHERE id=$1",
      [w.id, JSON.stringify(vf), captions, tags, JSON.stringify({ series, script: lines.map((l) => `${l.name || 'ผู้บรรยาย'}: ${l.text}`), cast: series.chars.map(({ name, gender, age }) => ({ name, gender, age })) }), `${d.title} EP.${d.ep}${d.epTitle ? ` ${d.epTitle}` : ''}`.slice(0, 80)]);
    PROG.delete(w.id);
    if (hooks.onDone) hooks.onDone({ ...w, files: vf }).catch((e) => log('onDone', w.id, e.message));
    log('series done', w.id, `ep${d.ep}`, d.scenes.length, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // ---------- คลิปถ่ายเอง ----------
  async function processSelf(w) {
    const p = w.params;
    const stage = (s, pct) => PROG.set(w.id, { stage: s, pct });
    const vfile = path.join(VID_DIR, path.basename(p.video || ''));
    if (!p.video || !fs.existsSync(vfile)) { PROG.delete(w.id); return refund(w, 'ไม่พบไฟล์คลิป · คืนดาวแล้ว'); }
    const brand = (await q('SELECT brand FROM profiles WHERE user_id=$1', [w.user_id])).rows[0]?.brand || {};
    // ขั้นที่ 1 (โหมดซับ): ถอดเสียง → ให้ลูกค้าตรวจ/แก้ก่อนตัดต่อ
    if (p.selfMode === 'subs' && p.phase !== 'render') {
      try {
        stage('AI กำลังฟังและถอดเสียง', 15);
        const segs = await V.transcribe(await V.extractAudio(vfile), [p.product, brand.shopName].filter(Boolean).join(', '), p.videoSec);
        await q("UPDATE works SET status='review', params = params || $2::jsonb WHERE id=$1", [w.id, JSON.stringify({ segments: segs })]);
        log('self transcribed', w.id, segs.length);
      } catch (e) { log('transcribe fail', w.id, e.message); PROG.delete(w.id); return refund(w, 'ถอดเสียงไม่สำเร็จ · คืนดาวแล้ว'); }
      PROG.delete(w.id);
      return;
    }
    const style = V.VIDEO_STYLES.find((s) => s.id === 'v_sell');
    // ตัดใหม่หลังแก้ซับ (ฟรี) ถ้าพลาด กลับไปสถานะเสร็จพร้อมคลิปเดิม ไม่คืนดาวซ้ำ
    const fail = async (msg) => {
      PROG.delete(w.id);
      if ((p.rerenders || 0) > 0 && (w.files || []).length) return q("UPDATE works SET status='done', error=$2 WHERE id=$1", [w.id, 'ตัดใหม่ไม่สำเร็จ ลองอีกครั้งได้']).then(() => q("UPDATE works SET params = params || jsonb_build_object('rerenders', $2::int) WHERE id=$1", [w.id, (p.rerenders || 1) - 1]));
      return refund(w, msg);
    };
    let voice, script;
    try {
      if (p.selfMode === 'voice') {
        stage('AI กำลังเขียนบท', 10);
        script = await V.writeScript({ ...p, length: Math.max(10, Math.round(p.videoSec * 0.85)) }, style, brand, GOALS.find((g) => g.id === p.goal)?.label || '');
        stage('กำลังพากย์เสียง', 25);
        voice = p.premium ? await V.voiceEleven(script.lines, p.voice) : await V.voiceGemini(script.lines, p.voice, p.tone, script.speakers, p.dialogue ? V.partnerVoice(p.voice) : '');
      } else {
        stage('เขียนแคปชั่น', 10);
        script = { captions: await genCaptions(captionPrompt({ ...p, details: [p.details, (p.segments || []).map((g) => g.text).join(' ')].filter(Boolean).join(' / ').slice(0, 600) }, { label: 'คลิปรีวิวที่ถ่ายเอง' }, brand)).catch(() => ({})) };
      }
    } catch (e) { log('self prep fail', w.id, e.message); return fail('AI เขียนบท/พากย์เสียงไม่สำเร็จ · คืนดาวแล้ว'); }
    let out;
    try {
      stage('กำลังตัดต่อ', 35);
      out = await V.render({
        type: 'self', videoUrl: V.fileUrl(vfile), price: p.price, cta: CTA[p.goal] || CTA.sell,
        segments: p.selfMode === 'subs' ? p.segments || [] : undefined,
        voiceover: voice ? { ...voice, text: script.lines.join(' ') } : undefined,
        origVolume: p.selfMode === 'voice' ? (p.keepAudio ? 0.15 : 0) : 1,
        captionStyle: p.captionStyle, accent: /^#[0-9a-f]{6}$/i.test(brand.color || '') ? brand.color : undefined,
        hookText: p.hookText || undefined, music: V.pickMusic(p.music, { reveal: 'none' }, p.tone) || undefined,
        logoUrl: p.useLogo && brand.logo ? V.fileUrl(path.join(LOGO_DIR, path.basename(brand.logo))) : undefined,
        metadata: { mcrich: w.id },
      }, (s) => stage(s.status === 'queued' ? 'รอคิวตัดต่อ' : s.stage || 'กำลังตัดต่อ', 35 + Math.round((s.progress || 0) * 0.6)));
    } catch (e) { log('self render fail', w.id, e.message); return fail('ตัดต่อคลิปไม่สำเร็จ · คืนดาวแล้ว'); }
    stage('เกือบเสร็จ', 97);
    for (const f of w.files || []) { fs.rm(path.join(WORK_DIR, path.basename(f.name)), () => {}); if (f.thumb) fs.rm(path.join(WORK_DIR, path.basename(f.thumb)), () => {}); }
    const base = `${w.user_id}-${w.id}-s-${rand(6).toLowerCase()}`;
    V.moveFile(out.mp4, path.join(WORK_DIR, `${base}.mp4`));
    let thumb = '';
    if (fs.existsSync(out.jpg)) { await sharp(out.jpg).resize({ width: 480 }).webp({ quality: 78 }).toFile(path.join(WORK_DIR, `${base}.webp`)); thumb = `${base}.webp`; fs.rm(out.jpg, () => {}); }
    const { captions, tags } = Object.keys(w.captions || {}).length && p.phase === 'render' && (p.rerenders || 0) > 0
      ? { captions: w.captions, tags: w.hashtags } : await finalizeCaptions(w, p, script.captions || {});
    const vf = [{ name: `${base}.mp4`, thumb, w: 1080, h: 1920, type: 'video' }];
    await q("UPDATE works SET status='done', files=$2, captions=$3, hashtags=$4, params = params || $5::jsonb, done_at=now() WHERE id=$1",
      [w.id, JSON.stringify(vf), captions, tags, JSON.stringify(script.lines ? { script: script.lines.map((l, i) => (p.dialogue ? `${script.speakers[i]}: ${l}` : l)) } : {})]);
    PROG.delete(w.id);
    if (hooks.onDone) hooks.onDone({ ...w, files: vf }).catch((e) => log('onDone', w.id, e.message));
    log('self done', w.id, p.selfMode);
  }

  async function process1(w) {
    if (w.style === 'v_self') return processSelf(w);
    if (w.style === 'v_drama') return processDrama(w);
    if (w.style === 'v_series') return processSeries(w);
    if (V.INFO_STYLES.includes(w.style)) return processInfo(w);
    if (w.kind === 'video') return processVideo(w);
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
      const { out, w: W, h: H } = await finish(buf, { logo: p.useLogo && brand.logo ? path.join(LOGO_DIR, path.basename(brand.logo)) : '' });
      const base = `${w.user_id}-${w.id}-${i}-${rand(6).toLowerCase()}`;
      fs.writeFileSync(path.join(WORK_DIR, `${base}.jpg`), out);
      await sharp(out).resize({ width: 480 }).webp({ quality: 78 }).toFile(path.join(WORK_DIR, `${base}.webp`));
      files.push({ name: `${base}.jpg`, thumb: `${base}.webp`, w: W, h: H });
    }
    const { captions, tags } = await finalizeCaptions(w, p, await capP || {});
    // ภาพบางเวอร์ชันพลาด คืนดาวส่วนที่ไม่ได้
    const missing = w.versions - ok.length;
    if (missing > 0 && w.cost > 0) {
      const back = Math.round(w.cost / w.versions) * missing;
      await q("INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'refund',$3,$4) ON CONFLICT DO NOTHING", [w.user_id, back, `work:${w.id}`, `คืนดาว ${missing} ภาพที่สร้างไม่สำเร็จ`]);
    }
    await q("UPDATE works SET status='done', files=$2, captions=$3, hashtags=$4, done_at=now() WHERE id=$1", [w.id, JSON.stringify(files), captions, tags]);
    if (hooks.onDone) hooks.onDone({ ...w, files }).catch((e) => log('onDone', w.id, e.message));
    log('work done', w.id, `${ok.length}/${w.versions}`, model, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  async function kick() {
    while (running < WORKERS) {
      const w = (await q(`UPDATE works SET status='working' WHERE id = (SELECT id FROM works WHERE status='queued' ${videoRunning ? "AND kind <> 'video'" : ''} ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`)).rows[0];
      if (!w) return;
      running++; if (w.kind === 'video') videoRunning++;
      process1(w).catch(async (e) => { log('work error', w.id, e.stack || e.message); PROG.delete(w.id); await refund(w, 'ระบบขัดข้อง · คืนดาวแล้ว').catch(() => {}); })
        .finally(() => { running--; if (w.kind === 'video') videoRunning--; kick().catch(() => {}); });
    }
  }

  // ---------- ลบไฟล์ครบ 7 วัน ----------
  function purgeFiles(w) {
    for (const f of w.files || []) { fs.rm(path.join(WORK_DIR, path.basename(f.name)), () => {}); if (f.thumb) fs.rm(path.join(WORK_DIR, path.basename(f.thumb)), () => {}); }
    for (const r of w.refs || []) fs.rm(path.join(REF_DIR, path.basename(r)), () => {});
    if (w.params?.video) fs.rm(path.join(VID_DIR, path.basename(w.params.video)), { force: true }, () => {});
  }
  async function sweep() {
    const { rows } = await q("SELECT * FROM works WHERE NOT purged AND expires_at < now() AND status IN ('done','failed','review') LIMIT 200");
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
  return { ready, start, createInternal, REF_DIR, WORK_DIR, purgeFiles };
}
