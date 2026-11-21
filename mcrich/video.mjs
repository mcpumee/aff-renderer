// Mc Rich — คลิปวิดีโอ: บท (Gemini) → เสียงพากย์ (Gemini TTS / ElevenLabs) → ตัดต่อ (aff-renderer, Remotion)
import fs from 'node:fs';
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
export const VIDEO_STYLES = [
  { id: 'v_gift', label: 'ระเบิดกล่องของขวัญ', emoji: '🎁', color: '#A3192A', reveal: 'gift', open: 'ระเบิดกล่องของขวัญ', hook: 'ระเบิดกล่อง\nของขวัญ!' },
  { id: 'v_mystery', label: 'เปิดกล่องสุ่ม / กล่องจุ่ม', emoji: '❓', color: '#2B1B4A', reveal: 'mystery', theme: 'mystery', open: 'เปิดกล่องสุ่ม', hook: 'เปิดกล่องสุ่ม\nได้อะไร?' },
  { id: 'v_egg', label: 'ทุบไข่ปริศนา', emoji: '🥚', color: '#9C7410', reveal: 'egg', theme: 'gold', open: 'ทุบไข่ปริศนา', hook: 'ทุบไข่ทองคำ\nข้างในคือ…' },
  { id: 'v_gacha', label: 'เปิดกาชาปอง', emoji: '🔮', color: '#C2335C', reveal: 'gacha', theme: 'candy', open: 'เปิดกาชาปอง', hook: 'สุ่มกาชา\nลุ้นของดี!' },
  { id: 'v_chest', label: 'เปิดหีบสมบัติ', emoji: '🪙', color: '#6B3E19', reveal: 'chest', theme: 'navy', open: 'เปิดหีบสมบัติ', hook: 'เปิดหีบสมบัติ\nเจอของดี!' },
  { id: 'v_scratch', label: 'ขูดบัตรลุ้นโชค', emoji: '🎟️', color: '#5A2CA0', reveal: 'scratch', theme: 'purple', open: 'ขูดบัตรลุ้นโชค', hook: 'ขูดบัตร\nลุ้นรางวัล!' },
  { id: 'v_wheel', label: 'หมุนวงล้อนำโชค', emoji: '🎡', color: '#EE4D2D', reveal: 'wheel', theme: 'orange', open: 'หมุนวงล้อนำโชค', hook: 'หมุนวงล้อ\nลุ้นของดี!' },
  { id: 'v_sell', label: 'ขายของ / รีวิวสินค้า', emoji: '🛍️', color: '#17694A', reveal: 'none', open: '', hook: 'ของมันต้องมี\nบอกต่อ!' },
];
export const LENGTHS = [{ id: 15, label: '15 วิ' }, { id: 30, label: '30 วิ' }, { id: 45, label: '45 วิ' }];
// ราคา (ดาว) — ปรับได้ที่นี่ที่เดียว
export const VIDEO_PRICE = { 15: 12, 30: 15, 45: 20 };
export const PREMIUM_VOICE_EXTRA = 8;

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
  const prompt = `คุณคือครีเอเตอร์ TikTok ไทยที่ทำคลิปขายของยอดวิวสูง เขียนบทพากย์คลิปแนว "${style.label}" ยาวประมาณ ${len} วินาที
${style.open ? `ประโยคแรกระบบใส่ให้แล้วคือ "${style.open}" (ตอนนี้ภาพกำลังเปิด/ลุ้น) ห้ามเขียนซ้ำ ให้เริ่มที่ประโยคถัดไปซึ่งต้องเฉลยว่าได้สินค้าอะไร แบบตื่นเต้น` : 'ประโยคแรกต้องเป็นฮุคหยุดนิ้วภายใน 2 วินาที'}
เป้าหมาย: ${goalLabel}
สินค้า: ${p.product || '-'}
จุดเด่น/รายละเอียด: ${p.details || '-'}
ราคา/โปร: ${p.price || '-'}
ร้าน: ${brand.shopName || '-'}
โทน: ${p.tone || 'เป็นกันเอง'}
กฎ: ภาษาพูดไทยธรรมชาติ ประโยคสั้น · รวมทั้งบทประมาณ ${chars} ตัวอักษร · ห้ามอ้างรักษาโรค ห้ามคำเกินจริง (100%, เห็นผลทันที) ตามกฎ อย. · ปิดท้ายด้วยคำชวน${p.goal === 'aff' ? 'กดตะกร้า/ลิงก์' : p.goal === 'promo' ? 'มาที่ร้าน' : 'สั่งซื้อ/ทักแชท'} · ห้ามใส่อีโมจิ สัญลักษณ์ หรือวงเล็บในบทพากย์
ตอบเป็น JSON เท่านั้น:
{"lines":["ประโยคพากย์ทีละประโยค"],"hookText":"ข้อความบนจอช่วงเปิด 2 บรรทัด คั่นด้วย \\n บรรทัดละไม่เกิน 12 ตัวอักษร","cta":"ปุ่มท้ายคลิป สั้นมาก","facebook":"แคปชั่น FB 3-6 บรรทัด ใส่ {LINK} ถ้ามีลิงก์","instagram":"แคปชั่น IG 2-4 บรรทัด","tiktok":"แคปชั่น TikTok 1-2 บรรทัด มีฮุค","shopee":"แคปชั่นขาย สั้น ชัด","hashtags":["5-8 แท็ก"]}
${p.link ? 'มีลิงก์สินค้า: ใส่ {LINK} ในแคปชั่น ห้ามเขียน URL เอง' : 'ไม่มีลิงก์'}`;
  const j = await gpost(`${API()}/v1beta/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.95 },
  }, 90000);
  const o = JSON.parse(partsText(j).replace(/^```(json)?|```$/g, '').trim());
  const clean = (s) => String(s || '').replace(/[\u{1F000}-\u{1FFFF}☀-➿()[\]{}*#"]/gu, '').replace(/\s+/g, ' ').trim();
  let lines = (Array.isArray(o.lines) ? o.lines : []).map(clean).filter(Boolean).slice(0, 16);
  if (!lines.length) throw new Error('script_empty');
  if (style.open) lines = [style.open, ...lines.filter((l, i) => !(i === 0 && l.startsWith(style.open)))];
  return {
    lines,
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
        contents: [{ role: 'user', parts: [{ text: `Read this Thai line aloud in a ${tone} Thai social-media voice, natural and lively, fast pace: ${text}` }] }],
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
export async function voiceGemini(lines, voice, tone) {
  const tEn = TONE_EN[tone] || 'friendly';
  const out = new Array(lines.length);
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(4, lines.length) }, async () => {
    while (idx < lines.length) { const i = idx++; out[i] = await ttsLine(lines[i], voice, i === 0 ? 'very excited, suspenseful' : tEn); }
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
