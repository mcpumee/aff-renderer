// ติดตามต้นทุนจริงของทุกเครื่องมือ AI (Gemini, fal, HeyGen, ElevenLabs)
// วิธี: ดักทุก fetch ที่ออกไปหาผู้ให้บริการ → อ่านหน่วยที่ถูกคิดเงินจากคำตอบ (token, ภาพ, วินาที, ตัวอักษร) → คูณตารางราคา → บันทึก ai_costs
// งานถูกผูกกับผลงาน/ผู้ใช้/ที่มา ผ่าน AsyncLocalStorage (ไม่ต้องส่ง id ไปทุกฟังก์ชัน)
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();
export const withCost = (ctx, fn) => als.run({ ...(als.getStore() || {}), ...ctx }, fn);
export const tagCost = (ctx) => { const s = als.getStore(); if (s) Object.assign(s, ctx); };
export const costCtx = () => als.getStore() || {};

// ราคา (USD) — ค่าเริ่มต้นจากหน้าราคาของผู้ให้บริการ แก้ได้ในหลังบ้าน (app_settings.cost_prices)
export const DEFAULT_PRICES = {
  usdThb: 35,
  // Gemini ข้อความ: ต่อ 1 ล้าน token (คำตอบรวม "ความคิด" ของโมเดล)
  text: {
    'gemini-flash-latest': { in: 0.5, out: 3 }, 'gemini-3.8-flash': { in: 0.5, out: 3 },
    'gemini-2.5-flash': { in: 0.3, out: 2.5 }, 'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 }, '*': { in: 0.5, out: 3 },
  },
  // เสียงพากย์ Gemini: ต่อ 1 ล้าน token (เสียงขาออก)
  tts: { in: 0.5, out: 10 },
  // ภาพ: ต่อภาพ ตามขนาด
  image: {
    'gemini-3.1-flash-lite-image': { '1K': 0.02, '2K': 0.02, '4K': 0.02 },
    'gemini-nano-banana-2.1': { '1K': 0.034, '2K': 0.05, '4K': 0.08 },
    'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
    '*': { '1K': 0.04, '2K': 0.06, '4K': 0.12 },
  },
  omniClip: 0.8, // Omni Flash ต่อคลิป (ยังไม่ยืนยัน — เทียบกับบิลจริงในหน้าต้นทุน)
  // fal: ต่อวินาทีวิดีโอ
  fal: {
    'fal-ai/kling-video/v2.5-turbo/standard/image-to-video': 0.042,
    'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': 0.07,
    'fal-ai/kling-video/lipsync/audio-to-video': 0.014,
    'fal-ai/kling-video/ai-avatar/v2/standard': 0.0562,
    'fal-ai/kling-video/ai-avatar/v2/pro': 0.115,
    'bytedance/seedance-2.5/image-to-video': 0.462,
    '*': 0.07,
  },
  heygenSec: 0.05, // HeyGen ต่อวินาที (ขึ้นกับแพ็กเกจ)
  elevenChar: 0.00018, // ElevenLabs ต่อตัวอักษร
};

let PRICES = structuredClone(DEFAULT_PRICES);
let Q = null, LOG = () => {};
const pick = (tbl, model) => tbl[model] || tbl[Object.keys(tbl).find((k) => k !== '*' && model.startsWith(k))] || tbl['*'];

async function record(row) {
  const c = costCtx();
  const usd = Math.max(0, Number(row.usd) || 0);
  if (!Q) return;
  try {
    await Q(`INSERT INTO ai_costs(provider, model, op, units, unit, usd, work_id, user_id, src, meta) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [row.provider, row.model || '', row.op || '', row.units || 0, row.unit || '', usd, c.workId || null, c.userId || null, c.src || 'other', JSON.stringify(row.meta || {})]);
  } catch (e) { LOG('cost record', e.message); }
}

// นับ token จาก usageMetadata (generateContent) หรือ usage (interactions)
function tokens(j) {
  const u = j.usageMetadata || j.usage || {};
  const inn = Number(u.promptTokenCount ?? u.total_input_tokens ?? u.input_tokens ?? 0);
  const out = Number(u.candidatesTokenCount ?? u.total_output_tokens ?? u.output_tokens ?? 0) + Number(u.thoughtsTokenCount ?? u.total_thought_tokens ?? u.thought_tokens ?? 0);
  const think = Number(u.thoughtsTokenCount ?? u.total_thought_tokens ?? 0);
  return { inn, out, think };
}
function countMedia(o, type, n = { c: 0 }) {
  if (!o || typeof o !== 'object') return n.c;
  if (Array.isArray(o)) { o.forEach((x) => countMedia(x, type, n)); return n.c; }
  const mime = o.mime_type || o.mimeType || '';
  if (o.type === type || (o.inlineData && String(o.inlineData.mimeType || '').startsWith(type))) n.c++;
  else if (type === 'image' && mime.startsWith('image/') && o.data) n.c++;
  for (const v of Object.values(o)) if (v && typeof v === 'object' && v !== o.inlineData) countMedia(v, type, n);
  return n.c;
}

function onGemini(url, body, j) {
  const model = (url.match(/models\/([^:/?]+)/) || [])[1] || body?.model || '';
  const t = tokens(j);
  const isInteraction = /\/interactions/.test(url);
  const fmt = body?.response_format?.type;
  if (fmt === 'video' || /omni/.test(model)) {
    return record({ provider: 'gemini', model, op: 'video', units: 1, unit: 'คลิป', usd: PRICES.omniClip, meta: t });
  }
  if (fmt === 'image' || /image/.test(model)) {
    const n = Math.max(0, countMedia(j.steps || j.outputs || j.candidates || j, 'image'));
    const size = body?.response_format?.image_size || body?.generationConfig?.imageConfig?.imageSize || '1K';
    const per = pick(PRICES.image, model)[size] ?? pick(PRICES.image, model)['1K'];
    const txt = (t.inn / 1e6) * 0.3; // ค่าอ่านพรอมต์/รูปอ้างอิง (ประมาณ)
    return record({ provider: 'gemini', model, op: 'image', units: n, unit: `ภาพ ${size}`, usd: n * per + txt, meta: { ...t, size } });
  }
  if (/tts/.test(model)) {
    const p = PRICES.tts;
    return record({ provider: 'gemini', model, op: 'tts', units: t.out, unit: 'token เสียง', usd: (t.inn * p.in + t.out * p.out) / 1e6, meta: t });
  }
  const p = pick(PRICES.text, model);
  return record({ provider: 'gemini', model, op: isInteraction ? 'interaction' : 'text', units: t.inn + t.out, unit: 'token', usd: (t.inn * p.in + t.out * p.out) / 1e6, meta: t });
}

// fal: จำ model+input ตอนส่งงาน แล้วคิดเงินตอนรับผลสำเร็จ
const falPending = new Map();
function onFal(method, url, body, j) {
  if (method === 'POST' && j.request_id) {
    const base = (process.env.FAL_QUEUE_URL || 'https://queue.fal.run').replace(/\/+$/, '');
    const model = (url.startsWith(base) ? url.slice(base.length) : new URL(url).pathname).replace(/^\/+/, '').split('?')[0];
    falPending.set(j.request_id, { model, input: body || {}, ctx: costCtx() });
    setTimeout(() => falPending.delete(j.request_id), 3 * 3600e3).unref?.();
    return;
  }
  if (/\/status(\?|$)/.test(url)) return;
  const id = url.split('?')[0].split('/').pop(); // response_url ลงท้ายด้วย request id
  const p = id && falPending.get(id);
  if (!p || !(j.video || j.images || j.audio)) return;
  falPending.delete(id);
  const sec = Number(j.duration || j.video?.duration) || Number(p.input.duration) || 5;
  return withCost(p.ctx, () => record({ provider: 'fal', model: p.model, op: 'video', units: sec, unit: 'วินาที', usd: sec * pick(PRICES.fal, p.model), meta: { request: id } }));
}

const heygenDone = new Set();
function onHeygen(method, url, body, j) {
  const d = j.data || j;
  if (method === 'GET' && /\/videos\//.test(url) && /complete/i.test(d.status || '') && d.id && !heygenDone.has(d.id)) {
    heygenDone.add(d.id);
    const sec = Number(d.duration) || 0;
    return record({ provider: 'heygen', model: 'avatar', op: 'video', units: sec, unit: 'วินาที', usd: sec * PRICES.heygenSec, meta: { id: d.id } });
  }
}
function onEleven(url, body) {
  const n = String(body?.text || '').length;
  if (n) return record({ provider: 'elevenlabs', model: body?.model_id || '', op: 'tts', units: n, unit: 'ตัวอักษร', usd: n * PRICES.elevenChar });
}

let installed = false;
export function installCostMeter({ q, log }) {
  Q = q; LOG = log || LOG;
  if (installed) return; installed = true;
  const orig = globalThis.fetch;
  globalThis.fetch = async function metered(input, init = {}) {
    const res = await orig(input, init);
    try {
      const url = typeof input === 'string' ? input : input?.url || String(input);
      const method = (init.method || input?.method || 'GET').toUpperCase();
      const host = (() => { try { return new URL(url).host; } catch { return ''; } })();
      const which = /generativelanguage|\/v1beta\/(models\/[^/]+:generateContent|interactions$)/.test(url) && method === 'POST' && /generateContent|interactions$/.test(url) ? 'gemini'
        : (/fal\.run|fal\.ai/.test(host) || (process.env.FAL_QUEUE_URL && host === new URL(process.env.FAL_QUEUE_URL).host)) ? 'fal' : /heygen/.test(host) ? 'heygen' : /elevenlabs/.test(host) && method === 'POST' ? 'eleven' : '';
      if (which && res.ok && /json/.test(res.headers.get('content-type') || '')) {
        const body = typeof init.body === 'string' ? (() => { try { return JSON.parse(init.body); } catch { return null; } })() : null;
        const ctx = costCtx();
        res.clone().json().then((j) => withCost(ctx, () => (which === 'gemini' ? onGemini(url, body, j) : which === 'fal' ? onFal(method, url, body, j) : which === 'heygen' ? onHeygen(method, url, body, j) : null))).catch(() => {});
      } else if (which === 'eleven' && res.ok) {
        const body = typeof init.body === 'string' ? (() => { try { return JSON.parse(init.body); } catch { return null; } })() : null;
        onEleven(url, body);
      }
    } catch { /* ไม่ให้การนับเงินทำงานจริงพัง */ }
    return res;
  };
}

export async function loadPrices(q) {
  try {
    const r = (await q("SELECT value FROM app_settings WHERE key='cost_prices'")).rows[0];
    PRICES = { ...structuredClone(DEFAULT_PRICES), ...(r?.value || {}) };
  } catch { /* ใช้ค่าเริ่มต้น */ }
  return PRICES;
}
export const prices = () => PRICES;
export async function savePrices(q, p) {
  const keep = { usdThb: Number(p.usdThb) || DEFAULT_PRICES.usdThb, omniClip: Number(p.omniClip) || DEFAULT_PRICES.omniClip,
    heygenSec: Number(p.heygenSec) || DEFAULT_PRICES.heygenSec, elevenChar: Number(p.elevenChar) || DEFAULT_PRICES.elevenChar };
  for (const k of ['text', 'image', 'fal', 'tts']) if (p[k] && typeof p[k] === 'object') keep[k] = p[k];
  await q("INSERT INTO app_settings(key,value) VALUES('cost_prices',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [JSON.stringify(keep)]);
  return loadPrices(q);
}

// งานง่าย (แชท แคปชั่น ไอเดียเทรนด์) ไม่ต้องให้โมเดล "คิดยาว" — token ความคิดคิดเงินเท่าคำตอบ
export function thinkLow(model) {
  if (process.env.MCRICH_THINK === 'full') return {};
  if (/gemini-2\.5-pro/.test(model)) return {};
  return { thinkingConfig: /gemini-2\.5/.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: 'low' } };
}
