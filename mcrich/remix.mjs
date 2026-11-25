// แกะคลิป (v_remix): ลูกค้าอัปโหลดคลิปตัวอย่าง →
//   1) AI ดูทั้งคลิป แยกฉาก + เขียนพรอมต์ภาษาอังกฤษพร้อมใช้ใน Google Flow (Veo) ทีละฉาก
//   2) (เลือก) ใส่อวตาร/ตัวละครของลูกค้า: แทนตัวหลัก / เดินข้างตัวหลัก / โผล่ในฉาก / ตามที่ลูกค้าเขียน → พรอมต์ฉบับมีอวตาร + วิธีทำใน Flow
//   3) (เลือก) เปลี่ยนเสียงเป็นเสียงที่ลูกค้าอัดเอง → ได้คลิปใหม่ (เสียงเดิมปิด/เบาลง)
import fs from 'node:fs';
import path from 'node:path';
import * as V from './video.mjs';

export const REMIX_MAX_SEC = 180;
export const FLOW_URL = 'https://labs.google/fx/tools/flow';
export const AVATAR_MODES = [
  { id: 'replace', label: 'แทนที่ตัวละครหลัก', hint: 'อวตารของคุณเล่นแทนคนเดิมทุกฉาก' },
  { id: 'beside', label: 'เดินข้างตัวละครหลัก', hint: 'อวตารเข้าฉากคู่กับตัวหลัก' },
  { id: 'cameo', label: 'โผล่ในฉาก / รีแอ็กชัน', hint: 'ปรากฏเป็นคนดู/คนเชียร์บางฉาก' },
  { id: 'custom', label: 'กำหนดเอง', hint: 'เขียนเองว่าอยากให้อยู่ตรงไหน' },
];
// ราคา: ตามความยาว (ความยาก = จำนวนฉากที่ต้องแกะ) + ตัวเลือกเสริม
export const REMIX_PRICE = { base: [[15, 9], [30, 15], [60, 25], [120, 39], [180, 49]], voice: 5, avatar: 5 };
export const remixPrice = (sec, { voice, avatar } = {}) =>
  (REMIX_PRICE.base.find(([s]) => sec <= s + 0.5) || REMIX_PRICE.base.at(-1))[1] + (voice ? REMIX_PRICE.voice : 0) + (avatar ? REMIX_PRICE.avatar : 0);

const clean = (v, n = 400) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, n);

/** ย่อคลิปให้เล็ก (AI ดูภาพ ~1 เฟรม/วิ อยู่แล้ว) → ส่งแนบในคำขอได้โดยไม่ต้องอัปโหลดแยก */
async function smallCopy(file) {
  const out = `${file}.ai.mp4`;
  await V.ff(['-i', file, '-t', String(REMIX_MAX_SEC), '-vf', 'scale=-2:360', '-r', '10', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '220k', '-c:a', 'aac', '-b:a', '40k', '-ac', '1', out], 300000);
  return out;
}

export async function analyze({ gpost, url, findText, file, sec, avatar, mode, note, product }) {
  const small = await smallCopy(file);
  try {
    const buf = fs.readFileSync(small);
    const av = avatar ? `\nลูกค้าอยากใส่ตัวละครของตัวเองชื่อ "${avatar.name}" (${avatar.desc || 'ดูจากภาพอวตาร'}) แบบ: ${AVATAR_MODES.find((m) => m.id === mode)?.label || 'แทนที่ตัวละครหลัก'}${note ? ` — ${note}` : ''}
→ ใส่ field "avatarPrompt" ทุกฉาก = พรอมต์ฉบับที่มีตัวละครนี้ตามแบบที่เลือก (ฉากที่ไม่เหมาะให้ว่าง) และเรียกตัวละครนี้ว่า "[AVATAR]" ในพรอมต์ เพื่อให้ลูกค้าแนบภาพอวตารเป็น Ingredient
→ ใส่ "avatarPlan" = คำแนะนำภาษาไทย 2-4 ข้อ ว่าควรทำอย่างไรใน Google Flow ให้ออกมาดี (เช่น แนบภาพอวตารเป็น Ingredients, ฉากไหนใช้ Frames to Video, ข้อควรระวังเรื่องหน้าตาให้เหมือนเดิม)` : '';
    const prompt = `คุณคือผู้กำกับและ prompt engineer สำหรับ Google Flow (Veo) ดูคลิปนี้ทั้งหมด (ยาว ${sec.toFixed(1)} วินาที) แล้วแกะเป็นฉาก เพื่อให้ลูกค้าสร้างคลิปแนวเดียวกันใหม่${product ? ` สำหรับ "${product}"` : ''}
กฎ:
- แบ่งฉากตามการตัดช็อตจริง ฉากละไม่เกิน 8 วินาที (ยาวกว่านั้นให้แบ่ง) เวลาเป็นวินาทีจริงในคลิป
- "prompt" ภาษาอังกฤษ พร้อมวางใน Flow: subject + action + setting + camera (shot/movement/lens) + lighting + style/color grade + mood + audio (SFX/ambience; dialogue ใส่ในเครื่องหมายคำพูดตามภาษาเดิม) · ไม่อ้างชื่อคนจริง/แบรนด์/โลโก้/ตัวละครลิขสิทธิ์ (เปลี่ยนเป็นคำอธิบายทั่วไป) · ห้ามมีข้อความบนจอ
- รักษาความต่อเนื่อง: ตัวละครเดิมใช้คำบรรยายเดิมทุกฉาก (อ้างจาก "characters")
- "th" อธิบายฉากเป็นภาษาไทยสั้นๆ ให้ลูกค้าเข้าใจ
- "tips" เคล็ดลับภาษาไทย 3-5 ข้อ ว่าคลิปนี้ไวรัล/น่าดูเพราะอะไร และควรทำตามอย่างไร${av}
ตอบ JSON เท่านั้น:
{"title":"ชื่อเรียกคลิปสั้นๆ ภาษาไทย","summary":"สรุปคลิปภาษาไทย 1-2 ประโยค","look":"EN overall visual style / color grade / aspect / pacing — reusable style suffix",
"characters":[{"name":"ชื่อเรียกสั้น","desc":"EN consistent appearance description"}],
"scenes":[{"t0":0,"t1":3.5,"th":"","prompt":"","camera":"","audio":""${avatar ? ',"avatarPrompt":""' : ''}}],
"music":"แนวเพลง/จังหวะ ภาษาไทย","tips":["..."]${avatar ? ',"avatarPlan":["..."]' : ''},"difficulty":"ง่าย|กลาง|ยาก"}`;
    const j = await gpost(url, {
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'video/mp4', data: buf.toString('base64') } },
        ...(avatar?.img ? [{ text: 'ภาพนี้คือตัวละคร [AVATAR] ของลูกค้า:' }, { inlineData: { mimeType: 'image/jpeg', data: avatar.img.toString('base64') } }] : []), { text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }, 240000);
    const o = JSON.parse(findText(j.candidates?.[0]?.content || j).replace(/^```(json)?|```$/g, '').trim());
    const scenes = (Array.isArray(o.scenes) ? o.scenes : []).slice(0, 40).map((s) => ({
      t0: Math.max(0, Math.min(sec, Number(s.t0) || 0)), t1: Math.max(0, Math.min(sec, Number(s.t1) || 0)),
      th: clean(s.th, 300), prompt: clean(s.prompt, 1500), camera: clean(s.camera, 200), audio: clean(s.audio, 300), avatarPrompt: avatar ? clean(s.avatarPrompt, 1500) : '',
    })).filter((s) => s.prompt);
    if (!scenes.length) throw new Error('AI แกะฉากไม่ได้');
    return {
      title: clean(o.title, 80), summary: clean(o.summary, 400), look: clean(o.look, 500), music: clean(o.music, 200), difficulty: clean(o.difficulty, 10),
      characters: (Array.isArray(o.characters) ? o.characters : []).slice(0, 6).map((c) => ({ name: clean(c.name, 40), desc: clean(c.desc, 400) })),
      scenes, tips: (Array.isArray(o.tips) ? o.tips : []).map((x) => clean(x, 200)).filter(Boolean).slice(0, 6),
      avatarPlan: avatar ? (Array.isArray(o.avatarPlan) ? o.avatarPlan : []).map((x) => clean(x, 240)).filter(Boolean).slice(0, 5) : [],
    };
  } finally { fs.rm(small, { force: true }, () => {}); }
}

/** ภาพกลางฉาก (ให้ลูกค้าเห็นว่าพรอมต์ไหนคือฉากไหน / ใช้เป็นภาพเริ่มใน Flow ได้) */
export async function sceneFrames(file, scenes, outBase) {
  const out = [];
  for (const [i, s] of scenes.entries()) {
    const t = Math.max(0, (s.t0 + Math.max(s.t0, s.t1)) / 2);
    const f = `${outBase}-s${i + 1}.jpg`;
    try { await V.ff(['-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '4', f], 60000); out.push(fs.existsSync(f) ? path.basename(f) : ''); } catch { out.push(''); }
  }
  return out;
}

/** เปลี่ยนเสียง: เสียงที่ลูกค้าอัด + เสียงเดิม (ปิด / เบา) → คลิปใหม่ความยาวเท่าเดิม */
export async function swapVoice({ file, voice, bg, sec, out }) {
  const info = await V.probe(file);
  const keep = info.hasAudio && bg !== 'off';
  const vol = bg === 'low' ? 0.15 : 0.3;
  const filter = keep
    ? `[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5,apad[v];[0:a]aresample=48000,volume=${vol}[b];[v][b]amix=inputs=2:duration=first:normalize=0,atrim=0:${sec.toFixed(2)}[a]`
    : `[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5,apad,atrim=0:${sec.toFixed(2)}[a]`;
  await V.ff(['-i', file, '-i', voice, '-filter_complex', filter, '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-t', sec.toFixed(2), '-movflags', '+faststart', out], 600000);
  return out;
}
