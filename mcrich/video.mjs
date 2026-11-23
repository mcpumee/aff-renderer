// Mc Rich — คลิปวิดีโอ: บท (Gemini) → เสียงพากย์ (Gemini TTS / ElevenLabs) → ตัดต่อ (aff-renderer, Remotion)
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
import path from 'node:path';

const API = () => (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const KEY = () => process.env.GEMINI_API_KEY || '';
const TEXT_MODEL = process.env.MCRICH_TEXT_MODEL || 'gemini-flash-latest';
const TTS_MODELS = (process.env.MCRICH_TTS_MODEL || 'gemini-3.8-flash-tts,gemini-2.5-flash-preview-tts').split(',').map((s) => s.trim()).filter(Boolean);
const EL_KEY = () => process.env.ELEVENLABS_API_KEY || '';
const EL_URL = () => (process.env.ELEVENLABS_URL || 'https://api.elevenlabs.io').replace(/\/+$/, '');
const EL_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const RENDERER = () => (process.env.RENDERER_URL || 'http://aff-renderer:3000').replace(/\/+$/, '');
const RENDER_OUT = process.env.RENDER_OUT || '/data/out';

// แนวคลิป (ฉากเปิดเป็นแอนิเมชันของเรา ไม่เสียค่า AI วิดีโอ)
const TEMPLATES = [{ id: 'kenburns', label: 'นุ่มนวล ซูมช้า' }, { id: 'flash', label: 'ตัดไว แฟลช' }, { id: 'cards', label: 'การ์ดสไลด์' }];
export const VIDEO_STYLES = [
  { id: 'v_gift', label: 'ระเบิดกล่องของขวัญ', emoji: '🎁', color: '#A3192A', reveal: 'gift', themes: ['goldRed', 'emerald', 'pink', 'navy', 'purple'], open: 'ระเบิดกล่องของขวัญ', hook: 'ระเบิดกล่อง\nของขวัญ!',
    variants: [{ id: 'explode', label: 'สั่นแล้วระเบิด' }, { id: 'drop', label: 'ตกจากฟ้า ตูม!', open: 'กล่องของขวัญตกจากฟ้า' }] },
  { id: 'v_mystery', label: 'เปิดกล่องสุ่ม / กล่องจุ่ม', emoji: '❓', color: '#2B1B4A', reveal: 'mystery', themes: ['mystery', 'navy', 'purple'], open: 'เปิดกล่องสุ่ม', hook: 'เปิดกล่องสุ่ม\nได้อะไร?',
    variants: [{ id: 'explode', label: 'สั่นแล้วระเบิด' }, { id: 'drop', label: 'ตกจากฟ้า ตูม!', open: 'กล่องสุ่มตกจากฟ้า' }] },
  { id: 'v_egg', label: 'ไข่ปริศนา', emoji: '🥚', color: '#9C7410', reveal: 'egg', themes: ['gold', 'navy', 'emerald'], open: 'ไข่ปริศนากำลังจะแตก', hook: 'ไข่ปริศนา\nข้างในคือ…',
    variants: [{ id: 'crack', label: 'ร้าวเองแล้วแตก', open: 'ไข่ปริศนากำลังจะแตก' }, { id: 'smash', label: 'ค้อนทุบ ป๊อก!', open: 'ทุบไข่ปริศนา', hook: 'ทุบไข่ปริศนา\nข้างในคือ…' },
      { id: 'hen', label: 'ไก่ออกไข่ร่วงแตก', open: 'แม่ไก่ออกไข่ปริศนา', hook: 'แม่ไก่ออกไข่\nข้างในคือ…' }, { id: 'dino', label: 'ไดโนเสาร์เหยียบ', open: 'ไดโนเสาร์เหยียบไข่ปริศนา', hook: 'ไดโนเหยียบไข่\nได้อะไร?' }] },
  { id: 'v_gacha', label: 'เปิดกาชาปอง', emoji: '🔮', color: '#C2335C', reveal: 'gacha', themes: ['candy', 'purple', 'orange'], open: 'เปิดกาชาปอง', hook: 'สุ่มกาชา\nลุ้นของดี!',
    variants: [{ id: 'bounce', label: 'แคปซูลเด้งดึ๋ง' }, { id: 'machine', label: 'หมุนตู้กาชา', open: 'หมุนตู้กาชาปอง' }] },
  { id: 'v_chest', label: 'เปิดหีบสมบัติ', emoji: '🪙', color: '#6B3E19', reveal: 'chest', themes: ['navy', 'gold', 'emerald'], open: 'เปิดหีบสมบัติ', hook: 'เปิดหีบสมบัติ\nเจอของดี!',
    variants: [{ id: 'glow', label: 'แสงทองพุ่ง' }, { id: 'key', label: 'ไขกุญแจทอง', open: 'ไขกุญแจหีบสมบัติ' }] },
  { id: 'v_scratch', label: 'ขูดบัตรลุ้นโชค', emoji: '🎟️', color: '#5A2CA0', reveal: 'scratch', themes: ['purple', 'navy', 'emerald'], open: 'ขูดบัตรลุ้นโชค', hook: 'ขูดบัตร\nลุ้นรางวัล!', variants: [] },
  { id: 'v_wheel', label: 'หมุนวงล้อนำโชค', emoji: '🎡', color: '#EE4D2D', reveal: 'wheel', themes: ['orange', 'purple', 'candy'], open: 'หมุนวงล้อนำโชค', hook: 'หมุนวงล้อ\nลุ้นของดี!', variants: [] },
  { id: 'v_show', label: 'โชว์สินค้า / ป้ายยาหลายรูป', emoji: '📸', color: '#0E6E6E', reveal: 'show', open: '', hook: '', variants: TEMPLATES },
  { id: 'v_top', label: 'จัดอันดับ Top 3 / Top 5', emoji: '🏆', color: '#B8860B', reveal: 'top', open: '', hook: '', variants: TEMPLATES },
  { id: 'v_tips', label: 'คลิปความรู้ / ทิปน่ารู้', emoji: '💡', color: '#2B5C6B', reveal: 'info', open: '', hook: '', variants: [] },
  { id: 'v_shop', label: 'โปรโมตร้าน / แนะนำร้าน', emoji: '🏪', color: '#8C4A1F', reveal: 'info', open: '', hook: '', variants: [] },
  { id: 'v_pr_announce', label: 'ประกาศ / แจ้งข่าวองค์กร', emoji: '📢', color: '#1F4E79', reveal: 'info', open: '', hook: '', variants: [], pr: true },
  { id: 'v_pr_recap', label: 'สรุปกิจกรรม / ข่าวองค์กร', emoji: '📰', color: '#24476B', reveal: 'info', open: '', hook: '', variants: [], pr: true },
  { id: 'v_series', label: 'ซีรีส์แนวตั้ง (เล่าเรื่อง ไม่ขายของ)', emoji: '🔮', color: '#3B2A7A', reveal: 'drama', open: '', hook: '', variants: [] },
  { id: 'v_drama', label: 'ละครสั้นขายของ', emoji: '🎭', color: '#7A1E48', reveal: 'drama', open: '', hook: '', variants: [] },
  { id: 'v_self', label: 'ใส่ซับคลิปที่ถ่ายเอง', emoji: '🎬', color: '#1F4E79', reveal: 'self', open: '', hook: '', variants: [] },
  { id: 'v_sell', label: 'ขายของ / รีวิวสินค้า', emoji: '🛍️', color: '#17694A', reveal: 'none', open: '', hook: 'ของมันต้องมี\nบอกต่อ!', variants: [] },
];
// สูตรเล่าเรื่อง — rec = เป้าหมายที่แนะนำ
export const FORMULAS = [
  { id: 'direct', label: 'ป้ายยาตรงๆ', desc: 'ฮุค → ดียังไง → ราคา → ชวนซื้อ', rec: ['aff', 'sell'],
    guide: 'โครง: ฮุคแรง 1 ประโยค → จุดเด่น 2-3 ข้อแบบเห็นภาพ → ราคา/โปร → ชวนซื้อชัดๆ' },
  { id: 'pas', label: 'ปัญหา → ทางแก้', desc: 'เปิดด้วยปัญหาที่ลูกค้าเจอทุกวัน', rec: ['sell', 'aff'],
    guide: 'โครง: เปิดด้วยปัญหาที่กลุ่มลูกค้าเจอจริง (ให้รู้สึกว่า "ใช่ เลย") → ขยายความรำคาญ 1 ประโยค → เฉลยสินค้าเป็นทางออก → ผลลัพธ์ที่สมจริง → ชวนซื้อ' },
  { id: 'honest', label: 'รีวิวจริงใจ', desc: 'ข้อดี + ข้อสังเกต น่าเชื่อถือ', rec: ['content', 'aff'],
    guide: 'โครง: บอกว่าซื้อมาลองเอง → ข้อดีที่ชอบจริง 2 ข้อ → ข้อสังเกต 1 ข้อแบบตรงไปตรงมาแต่ไม่ทำลายการขาย → เหมาะกับใคร → ชวนลอง' },
  { id: 'top3', label: '3 เหตุผลที่ต้องมี', desc: 'นับ 1-2-3 คนดูอยู่จนจบ', rec: ['aff', 'sell'],
    guide: 'โครง: "3 เหตุผลที่ต้องมี ..." → เหตุผลที่ 1, 2, 3 (ข้อ 3 แรงสุด) → ราคา → ชวนซื้อ' },
  { id: 'story', label: 'เล่าเรื่องชีวิตจริง', desc: 'Storytime อบอุ่น คนแชร์เยอะ', rec: ['content', 'promo'],
    guide: 'โครง: เล่าเหตุการณ์สั้นๆ ในชีวิตประจำวันเหมือนเล่าให้เพื่อนฟัง → จุดพลิกที่สินค้าช่วยได้ → ความรู้สึกหลังใช้ → ปิดแบบอบอุ่นชวนลอง' },
  { id: 'value', label: 'คุ้มไหม? เทียบให้ดู', desc: 'เน้นความคุ้มค่า ราคาต่อชิ้น/ต่อวัน', rec: ['sell', 'aff'],
    guide: 'โครง: ตั้งคำถาม "แพงไปไหม?" → เทียบให้เห็นความคุ้ม (ต่อวัน/ต่อครั้ง/เทียบของที่ใช้อยู่) โดยไม่กล่าวหาแบรนด์อื่น → สรุปว่าคุ้ม → ชวนซื้อ' },
  { id: 'secret', label: 'ทริคที่คนไม่รู้', desc: 'ให้ความรู้ คนกดเซฟเยอะ', rec: ['content', 'promo'],
    guide: 'โครง: "รู้ไหมว่า..." ทริค/วิธีใช้ที่คนส่วนใหญ่ทำผิด → วิธีที่ถูก → สินค้าช่วยให้ง่ายขึ้นยังไง → ชวนเซฟคลิปและลองใช้' },
  { id: 'urgency', label: 'โปรด่วน ห้ามพลาด', desc: 'เร่งให้ตัดสินใจ (ตามจริงเท่านั้น)', rec: ['sell', 'promo'],
    guide: 'โครง: เปิดด้วยโปร/ราคาพิเศษ → ของดียังไงแบบเร็วๆ → เงื่อนไขโปรตามข้อมูลที่ผู้ขายให้เท่านั้น ห้ามแต่งวันหมดเขตหรือจำนวนเอง → ชวนรีบสั่ง' },
  { id: 'friend', label: 'เพื่อนป้ายยาเพื่อน', desc: 'บทคุยกัน 2 คน สนุก เป็นธรรมชาติ', rec: ['aff', 'content'], dialogue: true,
    guide: 'โครง: บทสนทนา 2 คน A คือคนที่ใช้แล้วชอบ B คือเพื่อนขี้สงสัย/ไม่เชื่อ → B ถามหรือแซว → A ตอบพร้อมจุดเด่น → B เริ่มสนใจถามราคา → A บอกราคาและชวนกดสั่ง' },
];
export const MUSIC = [
  { id: 'auto', label: 'อัตโนมัติ' }, { id: 'fun', label: 'สนุก สดใส' }, { id: 'hype', label: 'มันส์ เร้าใจ' },
  { id: 'suspense', label: 'ลุ้นระทึก' }, { id: 'chill', label: 'ชิลๆ' }, { id: 'luxury', label: 'หรูหรา' }, { id: 'none', label: 'ไม่มีเพลง' },
];
export function pickMusic(m, style, tone) {
  if (m && m !== 'auto') return m === 'none' ? '' : m;
  if (tone === 'หรูหรา พรีเมียม') return 'luxury';
  if (tone === 'อบอุ่น ใส่ใจ' || tone === 'ให้ความรู้') return 'chill';
  if (style.reveal === 'none') return tone === 'ขายตรง ปิดการขาย' ? 'hype' : 'fun';
  return ['suspense', 'hype', 'fun'][Math.floor(Math.random() * 3)];
}
export const LENGTHS = [{ id: 15, label: '15 วิ' }, { id: 30, label: '30 วิ' }, { id: 45, label: '45 วิ' }];
// ราคา (ดาว) — ปรับได้ที่นี่ที่เดียว
export const VIDEO_PRICE = { 15: 12, 30: 15, 45: 20 };
export let PREMIUM_VOICE_EXTRA = 8;
export const setPremiumExtra = (n) => { PREMIUM_VOICE_EXTRA = n; };

// เสียงพากย์ Gemini (ค่าเริ่มต้น)
export const VOICES = [
  { id: 'Zephyr', label: 'หญิง สดใส', gender: 'female' },
  { id: 'Leda', label: 'หญิงสาว วัยรุ่น', gender: 'female' },
  { id: 'Sulafat', label: 'หญิง อบอุ่น นุ่มนวล', gender: 'female' },
  { id: 'Kore', label: 'หญิง มั่นใจ ชัดเจน', gender: 'female' },
  { id: 'Puck', label: 'ชาย ร่าเริง', gender: 'male' },
  { id: 'Fenrir', label: 'ชาย ตื่นเต้น เร้าใจ', gender: 'male' },
  { id: 'Charon', label: 'ชาย สุขุม น่าเชื่อถือ', gender: 'male' },
  { id: 'Achird', label: 'ชาย เป็นกันเอง', gender: 'male' },
];
// เสียงพรีเมียม ElevenLabs (ต้องมี key แพ็กเสียเงิน)
export const EL_VOICES = [
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'พรีเมียม · หญิงสาว สดใส', gender: 'female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'พรีเมียม · หญิง อบอุ่น', gender: 'female' },
  { id: 'bIHbv24MWmeRgasZH58o', label: 'พรีเมียม · ชายหนุ่ม เป็นกันเอง', gender: 'male' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'พรีเมียม · ชาย เสียงทุ้ม', gender: 'male' },
];
try { EL_VOICES.push(...JSON.parse(process.env.EL_VOICES_EXTRA || '[]')); } catch { /* ไม่สนใจ */ }
export const premiumReady = () => !!EL_KEY();
/** เสียงคู่สนทนา: เพศตรงข้ามกับเสียงหลัก */
export function partnerVoice(id) {
  const v = VOICES.find((x) => x.id === id) || VOICES[0];
  const pool = VOICES.filter((x) => x.gender !== v.gender);
  return (pool[0] || VOICES[1]).id;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gpost(url, body, timeoutMs) {
  let last;
  for (let i = 0; i < 2; i++) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY() }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    last = new Error(`gemini ${r.status} ${j.error?.message || ''}`.trim()); last.status = r.status;
    if (r.status !== 429 && r.status < 500) break;
    await sleep(4000);
  }
  throw last;
}
const partsText = (j) => (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');

// ---------- บท ----------
export async function writeScript(p, style, brand, goalLabel) {
  const len = Number(p.length) || 30;
  const chars = Math.round(len * 11.5);
  const f = FORMULAS.find((x) => x.id === p.formula) || FORMULAS[0];
  const top = style.id === 'v_top' && Array.isArray(p.items) && p.items.length >= 2;
  const dlg = !!p.dialogue && !top;
  const topInfo = top ? `\nสินค้าที่จัดอันดับ (อันดับ 1 = ดีที่สุด):\n${p.items.map((it, i) => `#${i + 1} ${it.name}${it.price ? ` ราคา ${it.price}` : ''}${it.note ? ` — ${it.note}` : ''}`).join('\n')}
เล่าแบบนับถอยหลังจากอันดับ ${p.items.length} ไปหาอันดับ 1 (อันดับ 1 ไว้ท้ายสุด ตื่นเต้นที่สุด) แต่ละอันดับ 1-3 ประโยค บอกชื่อและเหตุผลสั้นๆ ห้ามแต่งสเปกที่ไม่ได้ให้มา` : '';
  const prompt = `คุณคือครีเอเตอร์ TikTok ไทยที่ทำคลิปขายของยอดวิวสูง เขียนบทพากย์คลิปแนว "${style.label}" ยาวประมาณ ${len} วินาที
${style.open ? `ประโยคแรกระบบใส่ให้แล้วคือ "${style.open}" (ตอนนี้ภาพกำลังเปิด/ลุ้น) ห้ามเขียนซ้ำ ให้เริ่มที่ประโยคถัดไปซึ่งต้องเฉลยว่าได้สินค้าอะไร แบบตื่นเต้น` : 'ประโยคแรกต้องเป็นฮุคหยุดนิ้วภายใน 2 วินาที'}
สูตรการเล่า: ${f.label} — ${f.guide}
${dlg ? 'รูปแบบ: บทสนทนาระหว่าง A กับ B สลับกัน ทุกประโยคต้องขึ้นต้นด้วย "A:" หรือ "B:"' + (style.open ? ' (ประโยคเปิดเป็นของ A)' : '') : 'รูปแบบ: คนเดียวพูดกับคนดู'}
เป้าหมาย: ${goalLabel}
สินค้า: ${p.product || '-'}
จุดเด่น/รายละเอียด: ${p.details || '-'}
ราคา/โปร: ${p.price || '-'}${topInfo}
ร้าน: ${brand.shopName || '-'}
โทน: ${p.tone || 'เป็นกันเอง'}
กฎ: ภาษาพูดไทยธรรมชาติ ประโยคสั้น · รวมทั้งบทประมาณ ${chars} ตัวอักษร · ห้ามอ้างรักษาโรค ห้ามคำเกินจริง (100%, เห็นผลทันที) ตามกฎ อย. · ปิดท้ายด้วยคำชวน${p.goal === 'aff' ? 'กดตะกร้า/ลิงก์' : p.goal === 'promo' ? 'มาที่ร้าน' : 'สั่งซื้อ/ทักแชท'} · ห้ามใส่อีโมจิ สัญลักษณ์ หรือวงเล็บในบทพากย์
ตอบเป็น JSON เท่านั้น:
{${top ? `"intro":["ประโยคเปิด 1-2 ประโยค เช่น ${p.items.length} อันดับ...ที่ต้องมี"],"ranks":[{"rank":${p.items.length},"lines":["..."]},"... ไล่ลงไปถึง rank 1"],"outro":["ประโยคปิด ชวนซื้อ"],` : '"lines":["ประโยคพากย์ทีละประโยค"],'}"highlights":["จุดเด่นสั้นมาก 3 ข้อ ข้อละไม่เกิน 14 ตัวอักษร สำหรับป้ายบนจอ"],"hookText":"ข้อความบนจอช่วงเปิด 2 บรรทัด คั่นด้วย \\n บรรทัดละไม่เกิน 12 ตัวอักษร","cta":"ปุ่มท้ายคลิป สั้นมาก","facebook":"แคปชั่น FB 3-6 บรรทัด ใส่ {LINK} ถ้ามีลิงก์","instagram":"แคปชั่น IG 2-4 บรรทัด","tiktok":"แคปชั่น TikTok 1-2 บรรทัด มีฮุค","shopee":"แคปชั่นขาย สั้น ชัด","hashtags":["5-8 แท็ก"]}
${p.link ? 'มีลิงก์สินค้า: ใส่ {LINK} ในแคปชั่น ห้ามเขียน URL เอง' : 'ไม่มีลิงก์'}`;
  const j = await gpost(`${API()}/v1beta/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.95 },
  }, 90000);
  const o = JSON.parse(partsText(j).replace(/^```(json)?|```$/g, '').trim());
  const clean = (s) => String(s || '').replace(/[\u{1F000}-\u{1FFFF}☀-➿()[\]{}*#"]/gu, '').replace(/\s+/g, ' ').trim();
  // Top N: รวมเป็นบรรทัดเดียวกัน พร้อมจำว่าอันดับไหนเริ่มบรรทัดไหน
  let rankAt = null;
  if (top) {
    const arr = (x) => (Array.isArray(x) ? x : []).map((l) => String(l || '')).filter((l) => l.trim());
    const flat = [...arr(o.intro)];
    rankAt = {};
    const ranks = (Array.isArray(o.ranks) ? o.ranks : []).filter((r) => r && Number(r.rank) >= 1 && Number(r.rank) <= p.items.length).sort((a, b) => b.rank - a.rank);
    for (const r of ranks) { const ls = arr(r.lines).slice(0, 4); if (!ls.length) continue; rankAt[Number(r.rank)] = flat.length; flat.push(...ls); }
    flat.push(...arr(o.outro));
    o.lines = flat;
  }
  const raw = (Array.isArray(o.lines) ? o.lines : []).map((l) => String(l || '')).filter((l) => l.trim()).slice(0, top ? 30 : 18);
  let speakers = raw.map((l, i) => (dlg ? (/^\s*B\s*[:：]/i.test(l) ? 'B' : /^\s*A\s*[:：]/i.test(l) ? 'A' : (i % 2 ? 'B' : 'A')) : 'A'));
  let lines = raw.map((l) => clean(l.replace(/^\s*[AB]\s*[:：]\s*/i, '')));
  const keep = lines.map((l) => !!l);
  lines = lines.filter((_, i) => keep[i]); speakers = speakers.filter((_, i) => keep[i]);
  if (!lines.length) throw new Error('script_empty');
  if (style.open) {
    if (lines[0].startsWith(style.open)) { lines.shift(); speakers.shift(); }
    lines.unshift(style.open); speakers.unshift('A');
  }
  return {
    lines, speakers, rankAt,
    highlights: (Array.isArray(o.highlights) ? o.highlights : []).map((h) => clean(h).slice(0, 22)).filter(Boolean).slice(0, 3),
    // แนวเปิดกล่อง: ใช้หัวข้อที่ตรงกับแอนิเมชันเสมอ / แนวขายของ: ให้ AI คิดฮุค
    hookText: style.open ? style.hook : (String(o.hookText || '').slice(0, 40) || style.hook),
    cta: String(o.cta || '').slice(0, 24),
    captions: o, hashtags: Array.isArray(o.hashtags) ? o.hashtags : [],
  };
}

// ---------- เสียง: Gemini TTS ทีละประโยค (ได้เวลาเริ่ม-จบของแต่ละประโยค ใช้ทำซับ) ----------
function pcmOf(buf, mime) {
  // WAV → ดึงก้อน data / raw L16 → ใช้ตรงๆ
  if (buf.slice(0, 4).toString() === 'RIFF') {
    const rate = buf.readUInt32LE(24);
    let off = 12;
    while (off + 8 <= buf.length) {
      const id = buf.slice(off, off + 4).toString(), size = buf.readUInt32LE(off + 4);
      if (id === 'data') return { pcm: buf.slice(off + 8, Math.min(buf.length, off + 8 + size)), rate };
      off += 8 + size + (size % 2);
    }
    throw new Error('wav_no_data');
  }
  const m = /rate=(\d+)/.exec(mime || '');
  return { pcm: buf, rate: m ? Number(m[1]) : 24000 };
}
function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
/** ตัดความเงียบหัว-ท้ายประโยค (ให้จังหวะกระชับ) */
function trimSilence(pcm, rate) {
  const n = pcm.length >> 1, th = 500, pad = Math.round(rate * 0.04);
  let a = 0, b = n - 1;
  while (a < n && Math.abs(pcm.readInt16LE(a * 2)) < th) a++;
  while (b > a && Math.abs(pcm.readInt16LE(b * 2)) < th) b--;
  if (a >= b) return pcm;
  return pcm.slice(Math.max(0, a - pad) * 2, Math.min(n, b + pad) * 2);
}
let ttsModel = null;
async function ttsLine(text, voice, tone) {
  const models = ttsModel ? [ttsModel] : TTS_MODELS;
  let last;
  for (const m of models) {
    try {
      const j = await gpost(`${API()}/v1beta/models/${m}:generateContent`, {
        contents: [{ role: 'user', parts: [{ text }] }], // ส่งเฉพาะบทไทย (ถ้าใส่คำสั่งกำกับ โมเดลจะอ่านออกเสียงคำสั่งด้วย)
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }, 90000);
      const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data || p.inline_data?.data);
      const d = part?.inlineData || part?.inline_data;
      if (!d) throw new Error('tts_no_audio');
      ttsModel = m;
      return pcmOf(Buffer.from(d.data, 'base64'), d.mimeType || d.mime_type);
    } catch (e) { last = e; if (e.status !== 404 && e.status !== 400) break; }
  }
  throw last;
}
const TONE_EN = { 'เป็นกันเอง': 'friendly casual', 'ขายตรง ปิดการขาย': 'energetic persuasive salesperson', 'ตลก ขำๆ': 'funny playful', 'หรูหรา พรีเมียม': 'calm premium elegant', 'ให้ความรู้': 'clear informative', 'อบอุ่น ใส่ใจ': 'warm caring' };
export async function voiceGemini(lines, voice, tone, speakers = [], voiceB = '') {
  const tEn = TONE_EN[tone] || 'friendly';
  const out = new Array(lines.length);
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(4, lines.length) }, async () => {
    while (idx < lines.length) { const i = idx++; out[i] = await ttsLine(lines[i], speakers[i] === 'B' && voiceB ? voiceB : voice, i === 0 ? 'very excited, suspenseful' : tEn); }
  }));
  const rate = out[0].rate;
  const chunks = [], characters = [], st = [], en = [];
  let t = 0;
  for (const [i, o] of out.entries()) {
    const pcm = trimSilence(o.pcm, rate);
    const dur = (pcm.length >> 1) / rate;
    const chars = [...lines[i]];
    chars.forEach((c, k) => { characters.push(c); st.push(t + (k / chars.length) * dur); en.push(t + ((k + 1) / chars.length) * dur); });
    chunks.push(pcm); t += dur;
    if (i < out.length - 1) {
      const gap = i === 0 ? 0.25 : 0.12;
      chunks.push(Buffer.alloc(Math.round(rate * gap) * 2));
      characters.push('\n'); st.push(t); en.push(t + gap); t += gap; // ขึ้นซับท่อนใหม่ทุกประโยค
    }
  }
  return { audio_base64: wav(Buffer.concat(chunks), rate).toString('base64'), format: 'wav', alignment: { characters, character_start_times_seconds: st, character_end_times_seconds: en } };
}
export async function voiceEleven(lines, voiceId) {
  const r = await fetch(`${EL_URL()}/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'xi-api-key': EL_KEY() },
    body: JSON.stringify({ text: lines.join(' '), model_id: EL_MODEL, language_code: 'th', voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, speed: 1.08 } }),
    signal: AbortSignal.timeout(120000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.audio_base64) throw new Error(`elevenlabs ${r.status} ${j.detail?.message || j.detail?.status || ''}`.trim());
  return { audio_base64: j.audio_base64, format: 'mp3', alignment: j.alignment, normalized_alignment: j.normalized_alignment };
}

// ---------- ตัดต่อ ----------
export async function render(req, onProgress) {
  const r = await fetch(`${RENDERER()}/render`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-render-token': process.env.RENDER_TOKEN || '' }, body: JSON.stringify(req) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error(`renderer ${r.status} ${j.error || ''}`.trim());
  const t0 = Date.now();
  while (Date.now() - t0 < 25 * 60e3) {
    await sleep(4000);
    const s = await fetch(`${RENDERER()}/renders/${j.id}`).then((x) => x.json()).catch(() => null);
    if (!s || s.error === 'not found') throw new Error('renderer_lost');
    onProgress?.(s);
    if (s.status === 'succeeded') return { mp4: path.join(RENDER_OUT, `${j.id}.mp4`), jpg: path.join(RENDER_OUT, `${j.id}.jpg`) };
    if (s.status === 'failed') throw new Error(`render_failed ${s.error || ''}`);
  }
  throw new Error('render_timeout');
}
export const fileUrl = (f) => `file://${f}`;
export const moveFile = (src, dst) => { try { fs.renameSync(src, dst); } catch { fs.copyFileSync(src, dst); fs.rmSync(src, { force: true }); } };

// ---------- คลิปถ่ายเอง: ซับอัตโนมัติ / AI พากย์ทับ ----------
export const SELF_MAX_SEC = 180;
export const CAPTION_STYLES = [
  { id: 'pop', label: 'ขาวขอบดำ' }, { id: 'box', label: 'กล่องสี' }, { id: 'karaoke', label: 'คาราโอเกะ' }, { id: 'big', label: 'ตัวโตกลางจอ' },
];
export const selfPrice = (sec, mode) => (sec <= 60 ? 6 : sec <= 120 ? 9 : 12) + (mode === 'voice' ? 5 : 0);
export async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], { timeout: 30000 });
  const j = JSON.parse(stdout);
  return { sec: Number(j.format?.duration) || 0, hasVideo: (j.streams || []).some((x) => x.codec_type === 'video'), hasAudio: (j.streams || []).some((x) => x.codec_type === 'audio') };
}
export async function extractAudio(file) {
  const out = `${file}.m4a.mp3`;
  await run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', out], { timeout: 120000 });
  const b = fs.readFileSync(out); fs.rmSync(out, { force: true });
  return b;
}
/** ถอดเสียงพูดไทยเป็นท่อนพร้อมเวลา (วินาที) */
export async function transcribe(mp3, hint, durSec) {
  const prompt = `ถอดเสียงพูดภาษาไทยในไฟล์เสียงนี้ทุกคำตามที่พูดจริง เพื่อทำซับไตเติล
- แบ่งเป็นท่อนสั้น ท่อนละไม่เกิน 3 วินาที หรือไม่เกิน 20 ตัวอักษร
- เวลาเป็นวินาทีทศนิยม 1 ตำแหน่ง นับจากต้นไฟล์ ไฟล์ยาว ${durSec.toFixed(1)} วินาที ห้ามเกินนี้
- คำเฉพาะที่อาจได้ยิน: ${hint || '-'} (สะกดให้ถูก)
- ไม่ต้องใส่เสียงดนตรี เสียงหัวเราะ หรือคำที่ไม่ได้พูด ถ้าไม่มีเสียงพูดเลยให้ส่ง segments ว่าง
ตอบเป็น JSON เท่านั้น: {"segments":[{"start":0.0,"end":2.4,"text":"ข้อความ"}]}`;
  const j = await gpost(`${API()}/v1beta/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/mp3', data: mp3.toString('base64') } }, { text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  }, 180000);
  const o = JSON.parse(partsText(j).replace(/^```(json)?|```$/g, '').trim());
  return (Array.isArray(o.segments) ? o.segments : [])
    .map((g) => ({ start: Math.max(0, Math.min(durSec, Number(g.start) || 0)), end: Math.max(0, Math.min(durSec, Number(g.end) || 0)), text: String(g.text || '').replace(/\s+/g, ' ').trim().slice(0, 80) }))
    .filter((g) => g.text && g.end > g.start).sort((a, b) => a.start - b.start).slice(0, 200);
}

/** เวลาเริ่มของแต่ละบรรทัดในเสียงพากย์ (บรรทัดต่อกันด้วยตัวคั่น 1 ตัวทั้ง Gemini และ ElevenLabs) */
export function lineStarts(al, lines) {
  const st = al?.character_start_times_seconds || [];
  const out = []; let off = 0;
  for (const l of lines) { out.push(st[Math.min(off, st.length - 1)] ?? 0); off += [...l].length + 1; }
  return out;
}
export const speechEnd = (al) => al?.character_end_times_seconds?.at(-1) || 0;

// ---------- ละครสั้นขายของ ----------
export const GENRES = [
  { id: 'inlaw', label: 'แม่ผัว-ลูกสะใภ้', desc: 'ดราม่าขำๆ แม่ผัวจับผิด สุดท้ายยอมรับ' },
  { id: 'couple', label: 'แฟนงอน', desc: 'งอนกันแล้วง้อด้วยของดี' },
  { id: 'office', label: 'เพื่อนออฟฟิศ', desc: 'เพื่อนร่วมงานป้ายยากันในออฟฟิศ' },
  { id: 'family', label: 'พ่อแม่ลูก', desc: 'อบอุ่น ซึ้งๆ ในครอบครัว' },
  { id: 'ghost', label: 'ผีหลอกแต่ฮา', desc: 'ผีมาหลอก สุดท้ายผีก็อยากได้ของ' },
  { id: 'customer', label: 'ลูกค้าเรื่องมาก', desc: 'แม่ค้าเจอลูกค้าจุกจิก ปิดการขายได้' },
  { id: 'boss', label: 'เจ้านายจอมเหวี่ยง', desc: 'ลูกน้องเอาตัวรอดด้วยของดี' },
  { id: 'retro', label: 'ย้อนยุค', desc: 'สมัยก่อน ชาววังหรือยุคเก่า เจอของสมัยใหม่' },
  { id: 'free', label: 'พล็อตของฉันเอง', desc: 'พิมพ์เรื่องที่อยากได้' },
];
export const ART = [
  { id: 'cartoon3d', label: 'การ์ตูน 3D', prompt: 'Pixar-like 3D animated film still, soft cinematic lighting, expressive cute characters' },
  { id: 'anime', label: 'อนิเมะ', prompt: 'Japanese anime illustration style, clean cel shading, vibrant colors' },
  { id: 'real', label: 'ภาพจริงแบบซีรีส์', prompt: 'cinematic photorealistic Thai TV drama still, natural lighting, 35mm film look' },
  { id: 'blocky', label: 'ตัวบล็อกน่ารัก', prompt: 'cute blocky toy-like characters with cube heads and simple shapes, clean bright 3D render' },
  { id: 'comic', label: 'การ์ตูนหมึก', prompt: 'Thai comic book illustration, bold ink outlines, flat colors, halftone shading' },
];
export const DRAMA_PRICE = { 4: 25, 6: 35 };
// เสียงตามเพศ|วัย → [เสียง Gemini, ระดับเสียง]
const DRAMA_CAST = {
  'female|child': [['Leda', 1.22], ['Zephyr', 1.25]], 'female|young': [['Leda', 1], ['Zephyr', 1], ['Aoede', 1]], 'female|middle': [['Kore', 1], ['Sulafat', 1], ['Despina', 1]],
  'female|old': [['Gacrux', 0.95], ['Sulafat', 0.9]], 'male|child': [['Puck', 1.25], ['Achird', 1.25]], 'male|young': [['Puck', 1], ['Fenrir', 1], ['Achird', 1]],
  'male|middle': [['Charon', 1], ['Orus', 1], ['Iapetus', 1]], 'male|old': [['Algenib', 0.94], ['Charon', 0.9]],
};
export const NARR_VOICE = 'Kore';
const COLORS = ['#FFE14D', '#7FDBFF', '#FF8FB1', '#9BF6A3', '#FFB86B', '#C9A7FF'];
export function castDrama(chars) {
  const used = new Set();
  return chars.map((c, i) => {
    const g = /f|หญิง|woman|girl/i.test(c.gender) ? 'female' : 'male';
    const a = /child|kid|เด็ก/i.test(c.age) ? 'child' : /old|elder|แก่|ชรา|ยาย|ตา/i.test(c.age) ? 'old' : /young|teen|วัยรุ่น|สาว|หนุ่ม/i.test(c.age) ? 'young' : 'middle';
    const opts = DRAMA_CAST[`${g}|${a}`];
    const pick = opts.find(([v]) => !used.has(v)) || opts[i % opts.length];
    used.add(pick[0]);
    return { ...c, gender: g, age: a, voice: pick[0], pitch: pick[1], color: COLORS[i % COLORS.length] };
  });
}
export async function writeDrama(p, brand, goalLabel) {
  const genre = GENRES.find((g) => g.id === p.genre) || GENRES[0];
  const n = p.scenes === 6 ? 6 : 4;
  const len = n === 6 ? 45 : 30;
  const prompt = `คุณคือนักเขียนบทละครสั้น TikTok ไทยที่ทำคลิปไวรัลขายของ เขียนละครสั้นแนว "${genre.label}" (${genre.desc})${p.plot ? `\nพล็อตที่ผู้ใช้อยากได้: ${p.plot}` : ''}
ยาวประมาณ ${len} วินาที แบ่งเป็น ${n} ฉาก สินค้าต้องเข้ามาแก้ปัญหาในเรื่องอย่างเป็นธรรมชาติ ไม่ยัดเยียด มีจุดพลิกหรือมุกตลก
สินค้า: ${p.product}
จุดเด่น: ${p.details || '-'}
ราคา/โปร: ${p.price || '-'}
เป้าหมาย: ${goalLabel}
โทน: ${p.tone || 'ตลก ขำๆ'}
กฎ: ตัวละคร 2-3 ตัว ชื่อไทยสั้นๆ · แต่ละฉาก 1-3 บทพูด ประโยคสั้น ภาษาพูดธรรมชาติ · ห้ามอ้างรักษาโรคหรือคำเกินจริงตามกฎ อย. · ห้ามใส่อีโมจิหรือวงเล็บในบทพูด · ฉากสุดท้ายตัวละครชวน${p.goal === 'aff' ? 'กดตะกร้า' : p.goal === 'promo' ? 'มาที่ร้าน' : 'สั่งซื้อ'}
look ของตัวละครเขียนเป็นภาษาอังกฤษ ละเอียดพอให้วาดหน้าตาเหมือนเดิมทุกฉาก (อายุ เพศ ทรงผม เสื้อผ้า สีเด่น) · scene เขียนเป็นภาษาอังกฤษ บรรยายสถานที่ ท่าทาง อารมณ์ ใครอยู่ในฉาก ถ้าสินค้าอยู่ในฉากให้เขียนว่า "the product"
ตอบเป็น JSON เท่านั้น:
{"title":"ชื่อเรื่องสั้น","characters":[{"name":"ชื่อ","gender":"female|male","age":"child|young|middle|old","look":"English visual description"}],
"scenes":[{"scene":"English scene description","onscreen":"ข้อความบนจอสั้นๆ ไม่บังคับ","lines":[{"name":"ชื่อตัวละคร","text":"บทพูด"}]}],
"hookText":"ฮุคบนจอ 2 บรรทัด คั่นด้วย \\n","cta":"ปุ่มท้ายคลิป สั้นมาก",
"facebook":"แคปชั่น FB 3-6 บรรทัด ใส่ {LINK} ถ้ามีลิงก์","instagram":"แคปชั่น IG","tiktok":"แคปชั่น TikTok สั้นมีฮุค","shopee":"แคปชั่นขาย","hashtags":["5-8 แท็ก"]}`;
  const j = await gpost(`${API()}/v1beta/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 1 },
  }, 120000);
  const o = JSON.parse(partsText(j).replace(/^```(json)?|```$/g, '').trim());
  const clean = (x) => String(x || '').replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF()[\]{}*#"]/gu, '').replace(/\s+/g, ' ').trim();
  const chars = castDrama((Array.isArray(o.characters) ? o.characters : []).slice(0, 4).map((c) => ({ name: clean(c.name).slice(0, 16) || 'ตัวละคร', gender: String(c.gender || ''), age: String(c.age || ''), look: String(c.look || '').slice(0, 300) })));
  if (!chars.length) throw new Error('drama_no_chars');
  const scenes = (Array.isArray(o.scenes) ? o.scenes : []).slice(0, n).map((sc) => ({
    scene: String(sc.scene || '').slice(0, 600), onscreen: clean(sc.onscreen).slice(0, 30),
    lines: (Array.isArray(sc.lines) ? sc.lines : []).slice(0, 4).map((l) => ({ name: clean(l.name), text: clean(l.text).slice(0, 140) })).filter((l) => l.text),
  })).filter((sc) => sc.scene && sc.lines.length);
  if (scenes.length < 2) throw new Error('drama_no_scenes');
  return { title: clean(o.title).slice(0, 40), chars, scenes, hookText: String(o.hookText || '').slice(0, 40), cta: String(o.cta || '').slice(0, 24), captions: o };
}
export function scenePrompt(sc, chars, art, first) {
  const who = chars.filter((c) => sc.scene.includes(c.name) || sc.lines.some((l) => l.name === c.name));
  const cast = (who.length ? who : chars).map((c) => `- ${c.name}: ${c.look}`).join('\n');
  return `${art.prompt}. Vertical 9:16 story frame for a short drama.
Scene: ${sc.scene}
Characters (keep exactly this appearance):
${cast}
${first ? 'The first reference image is the real product: if the product appears, draw it faithfully (same shape, packaging, colors).' : 'Reference images: 1) the real product, 2) an earlier frame of this same story — keep the same characters, faces, outfits and art style.'}
Thai setting. No text, no letters, no subtitles, no watermark. Leave the top 15% and bottom 25% of the frame visually simple for captions.`;
}
/** พากย์บทเดียว (Gemini) → {audio_base64 wav, alignment, format} */
export async function voiceOne(text, voice) { return voiceGemini([text], voice, ''); }

// ---------- ซีรีส์แนวตั้ง (เล่าเรื่องล้วน ไม่ขายของ · ต่อเป็นตอนๆ ได้) ----------
export const SERIES_GENRES = [
  { id: 'magic', label: 'เวทมนตร์', desc: 'พลังวิเศษ คาถา โลกเวทมนตร์ซ่อนอยู่ในเมือง' },
  { id: 'wizard', label: 'พ่อมด แม่มด', desc: 'โรงเรียนเวทมนตร์ ศึกพ่อมด คำสาป' },
  { id: 'past', label: 'ย้อนอดีต', desc: 'ทะลุมิติกลับไปยุคโบราณ อยุธยา ชาววัง' },
  { id: 'future', label: 'โลกอนาคต', desc: 'ไซไฟ หุ่นยนต์ เมืองล้ำ ยานอวกาศ' },
  { id: 'palace', label: 'วังหลัง ราชวงศ์', desc: 'ชิงอำนาจในวัง เจ้าหญิง องค์ชาย' },
  { id: 'romance', label: 'รักโรแมนติก', desc: 'รักแรกพบ รักต่างฐานะ หวานซึ้ง' },
  { id: 'mystery', label: 'สืบสวนลึกลับ', desc: 'ปริศนา คดีแปลก หักมุมตอนจบ' },
  { id: 'horror', label: 'สยองขวัญ', desc: 'ผี ตำนาน เรื่องหลอนสไตล์ไทย' },
  { id: 'creature', label: 'มังกร สัตว์วิเศษ', desc: 'ผจญภัยกับสัตว์ในตำนาน นาค มังกร' },
  { id: 'action', label: 'แอ็กชันผจญภัย', desc: 'ภารกิจ ต่อสู้ หนีตาย ฮีโร่' },
  { id: 'comedy', label: 'คอมเมดี้', desc: 'ฮาทั้งเรื่อง ตัวละครป่วนๆ' },
  { id: 'free', label: 'เรื่องของฉันเอง', desc: 'พิมพ์เรื่องย่อที่อยากได้' },
];
export const SERIES_PRICE = { 4: 25, 6: 35, 8: 45 };
export const SERIES_LEN = { 4: 30, 6: 45, 8: 60 };
export async function writeSeries(p, prev) {
  const genre = SERIES_GENRES.find((g) => g.id === p.genre) || SERIES_GENRES[0];
  const n = SERIES_LEN[p.scenes] ? p.scenes : 4;
  const ep = prev ? (prev.ep || 1) + 1 : 1;
  const prevCtx = prev ? `
นี่คือตอนที่ ${ep} ของเรื่อง "${prev.title}" (ต่อจากตอนก่อน)
เรื่องย่อที่ผ่านมา: ${prev.summary}
ตอนที่แล้วจบที่: ${prev.cliff || '-'}
ตัวละครเดิม (ใช้ชื่อและ look เดิมทุกตัว เพิ่มตัวใหม่ได้ไม่เกิน 1 ตัว):
${prev.chars.map((c) => `- ${c.name} (${c.gender}, ${c.age}): ${c.look}`).join('\n')}` : '';
  const prompt = `คุณคือนักเขียนบทซีรีส์แนวตั้งไทย (สไตล์ซีรีส์สั้นในแอปดูซีรีส์และ TikTok) เขียนตอนที่ ${ep} แนว "${genre.label}" (${genre.desc})
${p.product ? `ชื่อเรื่อง/แนวคิด: ${p.product}` : ''}${p.plot ? `\nเรื่องย่อที่ผู้ใช้อยากได้: ${p.plot}` : ''}${prevCtx}
ยาวประมาณ ${SERIES_LEN[n]} วินาที แบ่งเป็น ${n} ฉาก · เปิดเรื่องด้วยฉากที่ดึงดูดภายใน 3 วินาทีแรก · มีความขัดแย้ง จุดพลิก และจบตอนแบบค้างคา (cliffhanger) ให้อยากดูตอนต่อไป
โทน: ${p.tone || 'ตื่นเต้น'} · ไม่มีการขายสินค้าหรือโฆษณาใดๆ
กฎ: ตัวละคร 2-4 ตัว ชื่อไทยหรือชื่อในโลกของเรื่อง สั้นๆ · แต่ละฉาก 1-3 บทพูด ประโยคสั้น ภาษาพูดธรรมชาติ ใช้ผู้บรรยาย (name: "ผู้บรรยาย") ได้ · ห้ามเนื้อหาทางเพศ ความรุนแรงโจ่งแจ้ง หรือเลียนแบบตัวละคร/เรื่องที่มีลิขสิทธิ์ · ห้ามอีโมจิหรือวงเล็บในบทพูด
look ของตัวละครเขียนเป็นภาษาอังกฤษ ละเอียดพอให้วาดหน้าตาเหมือนเดิมทุกฉากและทุกตอน (อายุ เพศ ทรงผม เสื้อผ้า เครื่องประดับ สีเด่น) · scene เขียนเป็นภาษาอังกฤษ บรรยายสถานที่ แสง เอฟเฟกต์ ท่าทาง อารมณ์ ใครอยู่ในฉาก
ตอบเป็น JSON เท่านั้น:
{"title":"ชื่อเรื่อง${prev ? ' (ใช้ชื่อเดิม)' : ''}","epTitle":"ชื่อตอนสั้นๆ","characters":[{"name":"ชื่อ","gender":"female|male","age":"child|young|middle|old","look":"English visual description"}],
"scenes":[{"scene":"English scene description","onscreen":"ข้อความบนจอสั้นๆ ไม่บังคับ","lines":[{"name":"ชื่อตัวละคร หรือ ผู้บรรยาย","text":"บทพูด"}]}],
"hookText":"ฮุคบนจอ 2 บรรทัด คั่นด้วย \\n","summary":"สรุปเรื่องทั้งหมดถึงตอนนี้ 2-3 ประโยค","cliff":"ตอนนี้จบค้างไว้ที่อะไร 1 ประโยค",
"facebook":"แคปชั่น FB 2-4 บรรทัด ชวนติดตามตอนต่อไป","instagram":"แคปชั่น IG","tiktok":"แคปชั่น TikTok สั้นมีฮุค","hashtags":["5-8 แท็ก เช่น #ซีรีส์แนวตั้ง"]}`;
  const j = await gpost(`${API()}/v1beta/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 1 },
  }, 120000);
  const o = JSON.parse(partsText(j).replace(/^```(json)?|```$/g, '').trim());
  const clean = (x) => String(x || '').replace(/[\u{1F000}-\u{1FFFF}☀-➿()[\]{}*#"]/gu, '').replace(/\s+/g, ' ').trim();
  let raw = (Array.isArray(o.characters) ? o.characters : []).slice(0, 5).map((c) => ({ name: clean(c.name).slice(0, 16) || 'ตัวละคร', gender: String(c.gender || ''), age: String(c.age || ''), look: String(c.look || '').slice(0, 300) }))
    .filter((c) => c.name !== 'ผู้บรรยาย');
  let chars;
  if (prev) {
    // ตัวละครเดิม: หน้าตาและเสียงเดิมทุกตอน · ตัวใหม่: เลือกเสียงที่ยังไม่ซ้ำ
    const old = prev.chars;
    const fresh = castDrama(raw.filter((c) => !old.some((x) => x.name === c.name)).slice(0, 1)).map((c, i) => ({ ...c, color: COLORS[(old.length + i) % COLORS.length] }));
    chars = [...old, ...fresh];
  } else chars = castDrama(raw.slice(0, 4));
  if (!chars.length) throw new Error('series_no_chars');
  const scenes = (Array.isArray(o.scenes) ? o.scenes : []).slice(0, n).map((sc) => ({
    scene: String(sc.scene || '').slice(0, 600), onscreen: clean(sc.onscreen).slice(0, 30),
    lines: (Array.isArray(sc.lines) ? sc.lines : []).slice(0, 4).map((l) => ({ name: clean(l.name), text: clean(l.text).slice(0, 160) })).filter((l) => l.text),
  })).filter((sc) => sc.scene && sc.lines.length);
  if (scenes.length < 2) throw new Error('series_no_scenes');
  return { title: (prev?.title || clean(o.title)).slice(0, 40), epTitle: clean(o.epTitle).slice(0, 40), ep, chars, scenes, hookText: String(o.hookText || '').slice(0, 40),
    summary: String(o.summary || '').slice(0, 600), cliff: String(o.cliff || '').slice(0, 200), captions: { ...o, shopee: '' } };
}
export function seriesScenePrompt(sc, chars, art, refKind) {
  const who = chars.filter((c) => sc.scene.includes(c.name) || sc.lines.some((l) => l.name === c.name));
  const cast = (who.length ? who : chars).map((c) => `- ${c.name}: ${c.look}`).join('\n');
  return `${art.prompt}. Vertical 9:16 cinematic frame for a short vertical drama series.
Scene: ${sc.scene}
Characters (keep exactly this appearance):
${cast}
${refKind === 'prev' ? 'The reference image is a frame from earlier in this same series: keep the same characters, faces, outfits and art style.' : refKind === 'first' ? 'The reference image is an earlier frame of this same episode: keep the same characters, faces, outfits and art style.' : ''}
Dramatic composition, expressive faces. No text, no letters, no subtitles, no watermark. Leave the top 15% and bottom 25% of the frame visually simple for captions.`;
}

// ---------- คลิปข้อมูล: ความรู้ · ร้าน · ประชาสัมพันธ์ ----------
export const INFO_STYLES = ['v_tips', 'v_shop', 'v_pr_announce', 'v_pr_recap'];
/** เขียนบทเป็นสไลด์ (AI ดูรูปจริงได้ ถ้าส่งมา) → {slides:[{title,body,emoji,lines[]}], captions...} */
export async function writeInfo(styleId, p, brand, photos = []) {
  const info = p.info || {};
  const n = styleId === 'v_tips' ? (Number(p.count) === 5 ? 5 : 3) : 0;
  const formal = styleId.startsWith('v_pr');
  const facts = [info.org && `หน่วยงาน/ร้าน: ${info.org}`, info.date && `วันเวลา: ${info.date}`, info.place && `สถานที่: ${info.place}`, info.contact && `ติดต่อ: ${info.contact}`, info.hours && `เวลาเปิด: ${info.hours}`].filter(Boolean).join('\n');
  const job = {
    v_tips: `คลิปความรู้ "${n} ทิปน่ารู้" หัวข้อ: ${p.product}\nรายละเอียด/มุมที่อยากเล่า: ${p.details || '-'}\nโครง: สไลด์เปิด 1 สไลด์ (ฮุคทำไมต้องรู้) → ทิปทีละข้อ ${n} สไลด์ (title = ชื่อทิปสั้น, body = วิธีทำ 1 ประโยคสั้น) → สไลด์ปิดชวนกดติดตาม/เซฟ${p.price || brand.shopName ? ` และพูดถึง${brand.shopName || 'ร้าน'}อย่างเป็นธรรมชาติ` : ''} · ข้อมูลต้องถูกต้อง ไม่อ้างการรักษาโรค`,
    v_shop: `คลิปแนะนำร้าน: ${p.product || info.org || brand.shopName}\nจุดเด่น/เมนู/บริการ: ${p.details || '-'}\nโปร: ${p.price || '-'}\n${facts}\nโครง: แต่ละรูปที่แนบมาคือ 1 สไลด์ตามลำดับ (title = ชื่อสั้นของสิ่งที่เห็นในรูป, body เว้นได้) บรรยายสิ่งที่เห็นจริงในรูปให้น่ามา → สไลด์ปิดชวนมาที่ร้าน`,
    v_pr_announce: `วิดีโอประกาศประชาสัมพันธ์ของ ${info.org || brand.shopName || 'หน่วยงาน'}\nเรื่อง: ${p.product}\nรายละเอียด: ${p.details || '-'}\n${facts}\nโครง: สไลด์หัวเรื่อง → สไลด์ข้อมูลสำคัญทีละเรื่อง (อะไร เมื่อไร ที่ไหน ใครเข้าร่วมได้ ติดต่ออย่างไร) title สั้น body คือข้อมูลจริงที่ให้มาเท่านั้น ห้ามแต่งวันที่ สถานที่ หรือตัวเลขเอง → สไลด์ปิดเชิญชวน`,
    v_pr_recap: `วิดีโอสรุปกิจกรรม/ข่าวประชาสัมพันธ์ของ ${info.org || brand.shopName || 'หน่วยงาน'}\nกิจกรรม: ${p.product}\nรายละเอียด: ${p.details || '-'}\n${facts}\nโครง: แต่ละรูปที่แนบมาคือ 1 สไลด์ตามลำดับ (title = คำบรรยายภาพสั้นแบบข่าว) เล่าสิ่งที่เห็นในรูปจริงแบบข่าวประชาสัมพันธ์ สุภาพ เป็นทางการ ห้ามระบุชื่อบุคคลที่ไม่ได้ให้มา → สไลด์ปิดขอบคุณผู้เกี่ยวข้อง`,
  }[styleId];
  const nPhotos = photos.length;
  const prompt = `คุณคือ${formal ? 'นักประชาสัมพันธ์มืออาชีพของหน่วยงานไทย ใช้ภาษาสุภาพ เป็นทางการแต่อ่านง่าย' : 'ครีเอเตอร์ไทยที่ทำคลิปสั้นยอดวิวสูง'} เขียนบทพากย์และสไลด์สำหรับ${job}
${nPhotos ? `แนบรูปมา ${nPhotos} รูป ต้องมีสไลด์ที่ใช้รูปเรียงตามลำดับรูปละ 1 สไลด์ (photo = เลขรูป 1-${nPhotos})` : ''}
โทน: ${formal ? 'ทางการ สุภาพ น่าเชื่อถือ' : p.tone || 'เป็นกันเอง'} · ความยาวรวมประมาณ ${Number(p.length) || 30} วินาที (${Math.round((Number(p.length) || 30) * 11)} ตัวอักษร)
กฎ: แต่ละสไลด์มีบทพากย์ 1-2 ประโยคสั้น · title ไม่เกิน 22 ตัวอักษร · body ไม่เกิน 50 ตัวอักษร · emoji 1 ตัวที่เข้ากับสไลด์ · ห้ามใส่อีโมจิในบทพากย์ · ห้ามคำเกินจริง
ตอบเป็น JSON เท่านั้น:
{"slides":[{"title":"","body":"","emoji":"","photo":0,"lines":["บทพากย์"]}],"badge":"ป้ายมุมจอ 1-3 คำ เช่น ${formal ? 'ประชาสัมพันธ์' : styleId === 'v_tips' ? 'ทิปน่ารู้' : 'ร้านแนะนำ'}",
"facebook":"แคปชั่น FB 3-6 บรรทัด${formal ? ' ภาษาทางการ' : ''} ใส่ {LINK} ถ้ามีลิงก์","instagram":"","tiktok":"","shopee":"${formal ? 'เว้นว่าง' : 'แคปชั่นสั้น'}","hashtags":["5-8 แท็ก"]}
${p.link ? 'มีลิงก์: ใส่ {LINK} ในแคปชั่น ห้ามเขียน URL เอง' : 'ไม่มีลิงก์'}`;
  const parts = [...photos.map((b) => ({ inlineData: { mimeType: 'image/jpeg', data: b.toString('base64') } })), { text: prompt }];
  const j = await gpost(`${API()}/v1beta/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: formal ? 0.6 : 0.9 },
  }, 120000);
  const o = JSON.parse(partsText(j).replace(/^```(json)?|```$/g, '').trim());
  const clean = (x) => String(x || '').replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF()[\]{}*#"]/gu, '').replace(/\s+/g, ' ').trim();
  const slides = (Array.isArray(o.slides) ? o.slides : []).slice(0, 12).map((sl) => ({
    title: String(sl.title || '').trim().slice(0, 40), body: String(sl.body || '').trim().slice(0, 80), emoji: String(sl.emoji || '').trim().slice(0, 4),
    photo: Number(sl.photo) || 0, lines: (Array.isArray(sl.lines) ? sl.lines : []).map(clean).filter(Boolean).slice(0, 3),
  })).filter((sl) => sl.lines.length);
  if (!slides.length) throw new Error('info_empty');
  return { slides, badge: clean(o.badge).slice(0, 20), captions: o, formal, n };
}
