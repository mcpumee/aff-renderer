// โรงงานตัดต่อคลิป Affiliate — รับงานจาก n8n แล้วเรนเดอร์ด้วย Remotion
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import { captionsFromAlignment } from './captions.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const OUT = path.join(DATA, 'out');
const TMP = path.join(DATA, 'tmp');
const PUBLIC_BASE = (process.env.PUBLIC_BASE || `http://localhost:${PORT}/files/`).replace(/\/?$/, '/');
const TOKEN = process.env.RENDER_TOKEN || '';
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 30);
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
const BROWSER = process.env.BROWSER_EXECUTABLE || null;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const LOCAL = `http://127.0.0.1:${PORT}`;
const HOOK_SEC = 3.6, END_SEC = 5, OUTRO_SEC = 2.5;
const CUTOUT_PY = process.env.CUTOUT_PY || 'python3';
const OPEN_PHRASE = 'ระเบิดกล่องสินค้า แนะนำ';

/** ตัดพื้นหลังหลายรูปในครั้งเดียว (โหลดโมเดลครั้งเดียว) */
async function cutouts(files) {
  if (!files.length) return [];
  const args = [path.join(ROOT, 'server', 'cutout.py')];
  for (const f of files) args.push(f, f.replace(/\.jpg$/, '-cut.png'));
  try {
    const { stdout } = await run(CUTOUT_PY, args, { timeout: 180000, maxBuffer: 1 << 20 });
    const res = JSON.parse(stdout.trim().split('\n').pop());
    return res.map((r, i) => ({ ...r, file: files[i].replace(/\.jpg$/, '-cut.png') }));
  } catch (e) {
    log('ตัดพื้นหลังไม่สำเร็จ ใช้แบบการ์ดแทน', e.message.slice(0, 200));
    return files.map(() => ({ ok: false, reason: 'cutout error' }));
  }
}

/** ธีมกล่องของขวัญ — เลือกให้ตัดกับสีสินค้า และสุ่มคงที่ตามงาน */
const THEMES = {
  goldRed: { bg: ['#F6E7C8', '#C49A5A'], box: '#A3192A', boxDark: '#6E0F1B', ribbon: '#FFF4DE', baubles: ['#C8102E', '#D9AE3B'], confetti: ['#C8102E', '#E9C46A', '#FFFFFF', '#8B0000'] },
  navy: { bg: ['#2A3F6B', '#0C1428'], box: '#D9AE3B', boxDark: '#9C7A20', ribbon: '#1E2E55', baubles: ['#D9AE3B', '#DDE3EE'], confetti: ['#D9AE3B', '#FFFFFF', '#8FB3FF', '#F4D58D'] },
  emerald: { bg: ['#EEF6EE', '#8FC2A0'], box: '#17694A', boxDark: '#0C4430', ribbon: '#F4D35E', baubles: ['#F4D35E', '#C8102E'], confetti: ['#F4D35E', '#FFFFFF', '#17694A', '#C8102E'] },
  pink: { bg: ['#FFE9F0', '#F2A1B8'], box: '#D93D68', boxDark: '#9E1F44', ribbon: '#FFFFFF', baubles: ['#FF8FB1', '#E8C26B'], confetti: ['#FFFFFF', '#FF8FB1', '#E8C26B', '#D93D68'] },
  purple: { bg: ['#F1E9FF', '#AE93E6'], box: '#5A2CA0', boxDark: '#3A1870', ribbon: '#F7D774', baubles: ['#F7D774', '#C9B6FF'], confetti: ['#F7D774', '#FFFFFF', '#9B6BFF', '#5A2CA0'] },
  gold: { bg: ['#3B2A10', '#120B03'], box: '#E8B730', boxDark: '#9C7410', ribbon: '#FFF1B8', baubles: [], confetti: ['#FFD23F', '#FFF4C2', '#E8B730', '#FFFFFF'] },
  candy: { bg: ['#E8F4FF', '#8EC5FF'], box: '#FF5C8A', boxDark: '#C2335C', ribbon: '#FFFFFF', baubles: [], confetti: ['#FF5C8A', '#FFD23F', '#5CC8FF', '#FFFFFF'] },
  mystery: { bg: ['#2B1B4A', '#0D0718'], box: '#1F1F27', boxDark: '#0B0B10', ribbon: '#C8F94A', baubles: [], confetti: ['#C8F94A', '#FFFFFF', '#9B6BFF', '#FFD23F'] },
  orange: { bg: ['#FFF2E8', '#FFB27D'], box: '#EE4D2D', boxDark: '#B5321A', ribbon: '#FFFFFF', baubles: ['#EE4D2D', '#FFD23F'], confetti: ['#FFD23F', '#FFFFFF', '#EE4D2D', '#FF9F68'] },
};
function pickTheme(hue, seed) {
  let pool;
  if (hue == null) pool = Object.keys(THEMES);
  else if (hue < 40 || hue >= 330) pool = ['navy', 'emerald']; // สินค้าสีแดง/ส้ม/ชมพู
  else if (hue < 170) pool = ['goldRed', 'purple', 'pink']; // เหลือง/เขียว
  else if (hue < 260) pool = ['orange', 'goldRed']; // ฟ้า/น้ำเงิน
  else pool = ['goldRed', 'emerald']; // ม่วง
  const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return THEMES[pool[h % pool.length]];
}

let serveUrl;
const queue = [];
let busy = false;
const jobs = new Map();

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function download(url, dest) {
  // ไฟล์จาก Mc Rich (อยู่ในโวลุ่ม /data ร่วมกัน) ไม่ต้องโหลดผ่านเน็ต
  if (url.startsWith('file:///data/mcrich/')) {
    const src = path.resolve(decodeURIComponent(url.slice(7)));
    if (!src.startsWith('/data/mcrich/') || !fs.existsSync(src)) throw new Error(`ไม่พบไฟล์: ${url}`);
    fs.copyFileSync(src, dest);
    return dest;
  }
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`ดาวน์โหลดไม่ได้ (${r.status}): ${url}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return dest;
}

/** ดาวน์โหลดไฟล์มาไว้ในเครื่อง (ดึงจาก n8n ครั้งเดียว) แล้วคืนลิงก์ภายใน */
async function localize(id, url, i, ext) {
  if (!url) return '';
  const name = `${id}-${i}.${ext}`;
  await download(url, path.join(TMP, name));
  return `${LOCAL}/tmp/${name}`;
}

/** ขนาดรูปจริง (กว้าง×สูง) */
async function probeSize(file) {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]);
    const [w, h] = stdout.trim().split('x').map(Number);
    return w && h ? { w, h } : null;
  } catch { return null; }
}

/** รูปเล็กกว่าจอ: ขยายด้วย lanczos + เพิ่มความคมเล็กน้อย (ดีกว่าให้เบราว์เซอร์ยืดเอง) */
async function enhanceImage(file) {
  const size = await probeSize(file);
  if (!size) return { w: 1080, h: 1920 };
  if (size.w >= 1080) return size;
  const out = file.replace(/\.jpg$/, '-hd.jpg');
  try {
    await run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf',
      'scale=1080:-2:flags=lanczos,unsharp=5:5:0.6:5:5:0.0', '-q:v', '2', out]);
    fs.renameSync(out, file);
  } catch (e) { log('enhance ไม่สำเร็จ ใช้รูปเดิม', e.message); }
  return size; // ขนาดต้นฉบับ (ใช้ตัดสินว่ารูปเล็กไหม)
}

async function probeSeconds(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim()) || 0;
}

/** บทสนทนา: เสียงแต่ละประโยค (ต่างคนต่างเสียง) → ปรับระดับเสียง → เรียงต่อกันเป็นแทร็กเดียว + ซับสีตามตัวละคร */
async function buildDialogue(id, lines, stage) {
  const GAP_SAME = 0.12, GAP_SHOT = 0.3;
  let t = 0.15;
  const placed = [];
  for (let k = 0; k < lines.length; k++) {
    stage(`เตรียมเสียงพากย์ ${k + 1}/${lines.length}`);
    const L = lines[k];
    const raw = path.join(TMP, `${id}-l${k}.${L.format === 'wav' ? 'wav' : 'mp3'}`);
    fs.writeFileSync(raw, Buffer.from(L.audio_base64 || '', 'base64'));
    let file = raw;
    const pitch = Number(L.pitch) || 1;
    if (Math.abs(pitch - 1) > 0.01) {
      // เปลี่ยนระดับเสียงโดยความยาวเท่าเดิม (เวลาซับไม่เพี้ยน)
      const fx = path.join(TMP, `${id}-l${k}-fx.wav`);
      try {
        await run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', `asetrate=44100*${pitch},aresample=44100,atempo=${(1 / pitch).toFixed(4)}`, fx]);
        file = fx;
      } catch (e) { log('ปรับเสียงไม่สำเร็จ ใช้เสียงเดิม', e.message.slice(0, 120)); }
    }
    const dur = (await probeSeconds(file)) || 1;
    if (k > 0) t += lines[k - 1].shot === L.shot ? GAP_SAME : GAP_SHOT;
    let al = L.alignment;
    const end = al?.character_end_times_seconds?.at(-1) || dur;
    if (al?.characters?.length) {
      // ตัดแท็กอารมณ์ของ v3 เช่น [laughs] [whispers] ออกจากซับ
      const keep = []; let inTag = false;
      al.characters.forEach((c, i) => { if (c === '[') inTag = true; if (!inTag) keep.push(i); if (c === ']') inTag = false; });
      al = { characters: keep.map((i) => al.characters[i]), character_start_times_seconds: keep.map((i) => al.character_start_times_seconds[i]), character_end_times_seconds: keep.map((i) => al.character_end_times_seconds[i]) };
    }
    let caps = captionsFromAlignment(al);
    if (!caps.length && L.text) caps = [{ start: 0, end, text: L.text }];
    caps = caps.map((c) => ({ ...c, text: c.text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim() })).filter((c) => c.text);
    placed.push({ ...L, file, at: t, dur, caps: caps.map((c) => ({ start: c.start + t, end: Math.min(c.end, end + 0.25) + t, text: c.text, name: L.name || '', color: L.color || '#FFFFFF' })) });
    t += Math.min(dur, end + 0.15);
  }
  stage('รวมเสียงพากย์');
  const out = path.join(TMP, `${id}-vo.mp3`);
  const args = ['-y', '-v', 'error'];
  placed.forEach((p) => args.push('-i', p.file));
  const f = placed.map((p, i) => `[${i}:a]aformat=sample_rates=44100:channel_layouts=mono,adelay=${Math.round(p.at * 1000)}:all=1[a${i}]`).join(';');
  args.push('-filter_complex', `${f};${placed.map((_, i) => `[a${i}]`).join('')}amix=inputs=${placed.length}:normalize=0:dropout_transition=0[o]`, '-map', '[o]', '-ac', '1', '-b:a', '128k', out);
  await run('ffmpeg', args, { timeout: 120000 });
  const captions = placed.flatMap((p) => p.caps).sort((a, b) => a.start - b.start);
  for (let i = 0; i + 1 < captions.length; i++) captions[i].end = Math.min(captions[i].end, captions[i + 1].start);
  return { placed, captions, speechEnd: t };
}

/** ขยายวิดีโอความละเอียดต่ำเป็น 1080x1920 แบบคม */
async function upscale(file) {
  const sz = await probeSize(file);
  if (!sz || sz.h >= 1000) return;
  const up = file.replace(/\.mp4$/, '-hd.mp4');
  try {
    await run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=5:5:0.8:5:5:0.0',
      '-c:v', 'libx264', '-preset', 'superfast', '-crf', '20', '-threads', '1', '-c:a', 'copy', up], { timeout: 300000 });
    fs.renameSync(up, file);
  } catch (e) { log('ขยายวิดีโอไม่สำเร็จ ใช้ไฟล์เดิม', e.message.slice(0, 150)); }
}

async function storyProps(id, req, stage, { captions, segs, endStart, speechEnd }) {
  // ดาวน์โหลดช็อต
  stage('ดาวน์โหลดช็อตวิดีโอ');
  const shots = [];
  for (let i = 0; i < (req.shots || []).length; i++) {
    const sh = req.shots[i];
    const ext = sh.kind === 'image' ? 'jpg' : 'mp4';
    const url = await localize(id, sh.url, `st${i}`, ext);
    const start = i === 0 ? 0 : (segs[i] ?? (shots.at(-1).start + shots.at(-1).dur));
    shots.push({ url, kind: sh.kind === 'image' ? 'image' : 'video', start, dur: 0, onscreen: sh.onscreen || '', file: path.join(TMP, `${id}-st${i}.${ext}`) });
  }
  for (let i = 0; i < shots.length; i++) {
    const next = i + 1 < shots.length ? shots[i + 1].start : endStart;
    shots[i].dur = Math.max(1.2, next - shots[i].start);
  }
  // วิดีโอ 360p: ขยายเป็น 1080x1920 แบบคม ทำพร้อมกัน 2 ช็อต (เครื่องมี 2 คอร์)
  const vids = shots.filter((x) => x.kind === 'video');
  let upDone = 0, upNext = 0;
  stage(`ขยายช็อตให้คม 0/${vids.length}`);
  const upWorker = async () => {
    while (upNext < vids.length) {
      const v = vids[upNext++];
      await upscale(v.file);
      stage(`ขยายช็อตให้คม ${++upDone}/${vids.length}`);
    }
  };
  await Promise.all([upWorker(), upWorker()]);
  for (const x of shots) {
    if (x.kind === 'video') {
      const vs = await probeSeconds(x.file);
      x.rate = vs && vs < x.dur ? Math.max(0.4, vs / x.dur) : 1;
    }
    delete x.file;
  }
  // ฉากจบ: รูปสินค้าจริง (ตัดพื้นหลังถ้าได้)
  stage('ตัดพื้นหลังรูปสินค้า');
  let endImage = '', endCut = false, theme = null;
  if (req.endImage) {
    endImage = await localize(id, req.endImage, 'end', 'jpg');
    const [c] = await cutouts([path.join(TMP, `${id}-end.jpg`)]);
    if (c?.ok) { endImage = `${LOCAL}/tmp/${path.basename(c.file)}`; endCut = true; }
    theme = pickTheme(c?.hue ?? null, id);
  }
  return {
    comp: 'StoryClip',
    props: {
      durationSec: Math.max(endStart + 3.2, speechEnd + 1.2), audioUrl: `${LOCAL}/tmp/${id}-vo.mp3`, captions,
      shots, endStart, endImage, endCut, theme, price: req.price || '', cta: req.cta || 'กดตะกร้าเลย 👇',
      snapshotSec: Math.min(2.5, endStart / 2),
      music: ['fun', 'hype', 'suspense', 'chill', 'luxury'].includes(req.music) ? req.music : undefined, musicVolume: Math.min(0.3, Math.max(0, Number(req.musicVolume) || 0.1)),
    },
  };
}

async function buildProps(id, req, stage = () => {}) {
  if (req.type === 'review') {
    let audioUrl = '', captions = [], speechEnd = 0;
    if (req.voiceover?.audio_base64) {
      const vext = req.voiceover.format === 'wav' ? 'wav' : 'mp3';
      fs.writeFileSync(path.join(TMP, `${id}-vo.${vext}`), Buffer.from(req.voiceover.audio_base64, 'base64'));
      audioUrl = `${LOCAL}/tmp/${id}-vo.${vext}`;
      let al = req.voiceover.normalized_alignment || req.voiceover.alignment;
      const audioSec = await probeSeconds(path.join(TMP, `${id}-vo.${vext}`));
      if (!al?.characters?.length && req.voiceover.text && audioSec) {
        // ไม่มีเวลาต่อตัวอักษร → กระจายข้อความเท่า ๆ กันตามความยาวเสียง (ซับยังขึ้น แม้ไม่ตรงเป๊ะ)
        const ch = [...String(req.voiceover.text)], per = audioSec / ch.length;
        al = { characters: ch, character_start_times_seconds: ch.map((_, i) => i * per), character_end_times_seconds: ch.map((_, i) => (i + 1) * per) };
      }
      captions = captionsFromAlignment(al);
      speechEnd = al?.character_end_times_seconds?.at(-1) || audioSec;
    }
    const sizes = {};
    const imgs = async (arr, tag, enhance) => Promise.all((arr || []).filter(Boolean).map(async (u, i) => {
      const url = await localize(id, u, `${tag}${i}`, 'jpg');
      if (enhance) sizes[url] = await enhanceImage(path.join(TMP, `${id}-${tag}${i}.jpg`));
      return url;
    }));
    const [hero] = await imgs([req.hero], 'h', true);
    const reviewUrls = await imgs(req.reviews, 'r', false);
    const shotUrls = await imgs(req.shots, 's', true);

    // ฉากเปิด: ตัดพื้นหลังรูปสินค้า (รูปหลัก + มุมอื่นอีกไม่เกิน 2) — ตัดไม่สวยใช้แบบการ์ด
    const local = (u) => path.join(TMP, path.basename(u));
    const heroSrc = hero || shotUrls[0] || '';
    const extraSrc = shotUrls.filter((u) => u !== heroSrc).slice(0, 3);
    const noIntro = req.reveal === 'none';
    const cuts = heroSrc && !noIntro ? await cutouts([heroSrc, ...extraSrc].map(local)) : [];
    const asUrl = (f) => `${LOCAL}/tmp/${path.basename(f)}`;
    let products = [];
    if (cuts[0]?.ok) {
      products.push({ url: asUrl(cuts[0].file), w: cuts[0].w, h: cuts[0].h, cut: true });
      for (const c of cuts.slice(1)) if (c.ok && products.length < 3) products.push({ url: asUrl(c.file), w: c.w, h: c.h, cut: true });
    } else if (heroSrc) {
      const sz = sizes[heroSrc] || { w: 1080, h: 1350 };
      products.push({ url: heroSrc, w: sz.w, h: sz.h, cut: false });
    }
    log('ฉากเปิด', id, cuts.map((c) => (c.ok ? 'ตัดได้' : `การ์ด(${c.reason})`)).join(', '));
    if (noIntro) products = [];
    const theme = (req.themeName && THEMES[req.themeName]) || pickTheme(cuts[0]?.hue ?? null, id);

    // จังหวะระเบิด = ตอนพูด "ระเบิดกล่องสินค้า แนะนำ" จบ
    let burstSec = 1.6;
    const alN = req.voiceover?.normalized_alignment || req.voiceover?.alignment;
    if (alN?.characters?.length) {
      const txt = alN.characters.join('');
      const phrase = req.openPhrase || OPEN_PHRASE;
      const at = txt.indexOf(phrase);
      if (at >= 0 && at < 5) burstSec = alN.character_end_times_seconds[at + phrase.length - 1] + 0.1;
    }
    // แบบที่มีเรื่องเล่าก่อนเปิด (ค้อน ไก่ ไดโนเสาร์ ตู้กาชา กุญแจ) ต้องมีเวลามากขึ้น
    const longIntro = req.reveal === 'wheel' || ['smash', 'hen', 'dino', 'machine', 'key', 'drop'].includes(req.revealVariant);
    burstSec = Math.min(longIntro ? 3.6 : 3, Math.max(longIntro ? 2.4 : 1.1, burstSec));
    const nRev = Math.min(3, reviewUrls.length);
    const introSec = burstSec + 1.4 + nRev * 0.75 + 1.2;
    const durationSec = Math.max(introSec + END_SEC + 2, speechEnd + 0.8);
    return {
      comp: 'ReviewClip',
      props: {
        durationSec, audioUrl, captions,
        hookText: req.hookText || 'ระเบิดกล่องสินค้า\nแนะนำ!',
        burstSec, introSec, products, theme: noIntro ? undefined : theme, reveal: req.reveal || 'gift', revealVariant: String(req.revealVariant || ''),
        music: ['fun', 'hype', 'suspense', 'chill', 'luxury'].includes(req.music) ? req.music : undefined, musicVolume: Math.min(0.3, Math.max(0, Number(req.musicVolume) || 0.12)),
        snapshotSec: burstSec + 1.1,
        heroUrl: hero || shotUrls[0] || reviewUrls[0] || '',
        reviewUrls, shotUrls, sizes,
        price: req.price || '', cta: req.cta || 'กดตะกร้าได้เลย 👇',
      },
    };
  }
  if (req.type === 'story' && Array.isArray(req.lines) && req.lines.length) {
    const { placed, captions, speechEnd } = await buildDialogue(id, req.lines, stage);
    const firstOf = (i) => placed.find((p) => p.shot === i)?.at ?? null;
    const endAt = firstOf(-1);
    const endStart = Math.max(3, endAt ?? Math.max(0, speechEnd - 3.5));
    const segs = (req.shots || []).map((_, i) => firstOf(i));
    return storyProps(id, req, stage, { captions, segs, endStart, speechEnd });
  }
  if (req.type === 'story') {
    // เสียงพากย์ + เวลาของแต่ละตัวอักษร
    const vo = req.voiceover || {};
    fs.writeFileSync(path.join(TMP, `${id}-vo.mp3`), Buffer.from(vo.audio_base64 || '', 'base64'));
    const audioSec = await probeSeconds(path.join(TMP, `${id}-vo.mp3`));
    let al = vo.normalized_alignment || vo.alignment;
    if (!al?.characters?.length && vo.text && audioSec) {
      const ch = [...String(vo.text)], per = audioSec / ch.length;
      al = { characters: ch, character_start_times_seconds: ch.map((_, i) => i * per), character_end_times_seconds: ch.map((_, i) => (i + 1) * per) };
    }
    const captions = captionsFromAlignment(al);
    const chars = al.characters.join('');
    const st = al.character_start_times_seconds;
    const speechEnd = al.character_end_times_seconds.at(-1) || audioSec;
    // หาจุดเริ่มของแต่ละท่อนบท (ช็อต + ท่อนจบ) ในเสียง
    let pos = 0;
    const startOf = (text) => {
      const t = String(text || '').trim();
      if (!t) return null;
      const probe = t.slice(0, Math.min(8, t.length));
      const i = chars.indexOf(probe, pos);
      if (i < 0) return null;
      pos = i + probe.length;
      return st[Math.min(i, st.length - 1)];
    };
    const segs = (req.shots || []).map((sh) => startOf(sh.vo));
    const endAt = startOf(req.endVo);
    const endStart = Math.max(3, endAt ?? Math.max(0, speechEnd - 3.5));
    return storyProps(id, req, stage, { captions, segs, endStart, speechEnd });
  }
  if (req.type === 'show') {
    // คลิปโชว์สินค้า / จัดอันดับ: สไลด์ตามเวลาที่ Mc Rich คำนวณจากเสียงพากย์
    if (!req.voiceover?.audio_base64) throw new Error('ต้องมีเสียงพากย์');
    const vext = req.voiceover.format === 'wav' ? 'wav' : 'mp3';
    fs.writeFileSync(path.join(TMP, `${id}-vo.${vext}`), Buffer.from(req.voiceover.audio_base64, 'base64'));
    const audioSec = await probeSeconds(path.join(TMP, `${id}-vo.${vext}`));
    const al = req.voiceover.normalized_alignment || req.voiceover.alignment;
    const captions = captionsFromAlignment(al);
    const speechEnd = Math.max(audioSec || 0, al?.character_end_times_seconds?.at(-1) || 0);
    stage('เตรียมรูป');
    const cache = new Map();
    const slides = [];
    for (const [i, sl] of (req.slides || []).slice(0, 14).entries()) {
      if (!sl?.url) continue;
      if (!cache.has(sl.url)) {
        const url = await localize(id, sl.url, `s${i}`, 'jpg');
        cache.set(sl.url, { url, ...(await enhanceImage(path.join(TMP, `${id}-s${i}.jpg`))) });
      }
      const c = cache.get(sl.url);
      slides.push({ url: c.url, w: c.w, h: c.h, start: Math.max(0, Number(sl.start) || 0), end: Number(sl.end) || 0,
        title: String(sl.title || '').slice(0, 40) || undefined, price: String(sl.price || '').slice(0, 20) || undefined,
        rank: Number(sl.rank) || undefined, intro: !!sl.intro || undefined });
    }
    if (!slides.length) throw new Error('ไม่มีรูปสินค้า');
    slides.sort((a, b) => a.start - b.start); slides[0].start = 0;
    const endStart = speechEnd + 0.3;
    return {
      comp: 'ShowClip',
      props: {
        durationSec: endStart + 2.8, audioUrl: `${LOCAL}/tmp/${id}-vo.${vext}`, captions,
        captionStyle: ['pop', 'box', 'karaoke', 'big'].includes(req.captionStyle) ? req.captionStyle : 'pop',
        accent: /^#[0-9a-f]{6}$/i.test(req.accent || '') ? req.accent : '#C8F94A',
        music: ['fun', 'hype', 'suspense', 'chill', 'luxury'].includes(req.music) ? req.music : undefined, musicVolume: 0.12,
        mode: req.mode === 'top' ? 'top' : 'show', template: ['kenburns', 'flash', 'cards'].includes(req.template) ? req.template : 'kenburns',
        slides, endStart, topN: Number(req.topN) || undefined,
        highlights: (req.highlights || []).slice(0, 4).map((h) => ({ text: String(h.text || '').slice(0, 24), start: Math.max(0, Number(h.start) || 0) })).filter((h) => h.text && h.start < endStart),
        hookText: String(req.hookText || '').slice(0, 60) || undefined, price: req.price || '', cta: req.cta || 'กดตะกร้าได้เลย 👇',
        logoUrl: req.logoUrl ? await (async () => { const f = path.join(TMP, `${id}-logo.png`); await download(req.logoUrl, f); return `${LOCAL}/tmp/${id}-logo.png`; })() : undefined,
      },
    };
  }
  if (req.type === 'self') {
    const dest = path.join(TMP, `${id}-v.mp4`);
    stage('เตรียมคลิป');
    await download(req.videoUrl, dest);
    const videoSec = await probeSeconds(dest);
    if (!videoSec) throw new Error('อ่านความยาวคลิปไม่ได้ (ไฟล์อาจเสีย)');
    // ขนาด/การหมุนของคลิป → ตัดสินว่าแนวตั้งไหม
    let vertical = true;
    try {
      const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:stream_side_data=rotation:stream_tags=rotate', '-of', 'json', dest]);
      const st = JSON.parse(stdout).streams?.[0] || {};
      const rot = Math.abs(Number(st.side_data_list?.[0]?.rotation ?? st.tags?.rotate ?? 0)) % 180;
      const w = rot === 90 ? st.height : st.width, h = rot === 90 ? st.width : st.height;
      vertical = !(w && h) || w / h < 0.7;
    } catch (e) { log('probe ขนาดคลิปไม่สำเร็จ', e.message.slice(0, 100)); }
    let posterUrl;
    if (!vertical) {
      const poster = path.join(TMP, `${id}-poster.jpg`);
      await run('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.min(1, videoSec / 2)), '-i', dest, '-frames:v', '1', '-vf', 'scale=540:-2', poster]).catch(() => {});
      if (fs.existsSync(poster)) posterUrl = `${LOCAL}/tmp/${id}-poster.jpg`;
    }
    // ซับ: จากท่อนที่ถอดเสียงแล้ว (segments) หรือจากเสียงพากย์ AI (voiceover.alignment)
    let captions = (req.captions || []).filter((c) => c && c.text && c.end > c.start);
    let audioUrl, mainSec = videoSec;
    const toAlign = (segs) => {
      const characters = [], st = [], en = [];
      segs.forEach((g, i) => {
        const ch = [...String(g.text)]; const d = Math.max(0.2, g.end - g.start);
        ch.forEach((c, k) => { characters.push(c); st.push(g.start + (k / ch.length) * d); en.push(g.start + ((k + 1) / ch.length) * d); });
        if (i < segs.length - 1) { characters.push('\n'); st.push(g.end); en.push(g.end); }
      });
      return { characters, character_start_times_seconds: st, character_end_times_seconds: en };
    };
    if (Array.isArray(req.segments) && req.segments.length) {
      const segs = req.segments.map((g) => ({ start: Math.max(0, Number(g.start) || 0), end: Number(g.end) || 0, text: String(g.text || '').trim() }))
        .filter((g) => g.text && g.end > g.start).sort((a, b) => a.start - b.start);
      captions = captionsFromAlignment(toAlign(segs));
    }
    if (req.voiceover?.audio_base64) {
      const vext = req.voiceover.format === 'wav' ? 'wav' : 'mp3';
      fs.writeFileSync(path.join(TMP, `${id}-vo.${vext}`), Buffer.from(req.voiceover.audio_base64, 'base64'));
      audioUrl = `${LOCAL}/tmp/${id}-vo.${vext}`;
      const voSec = await probeSeconds(path.join(TMP, `${id}-vo.${vext}`));
      captions = captionsFromAlignment(req.voiceover.normalized_alignment || req.voiceover.alignment);
      mainSec = Math.max(videoSec, voSec + 0.4);
    }
    return {
      comp: 'SelfClip',
      props: {
        durationSec: mainSec + OUTRO_SEC, videoSec, mainSec, videoUrl: `${LOCAL}/tmp/${id}-v.mp4`, vertical, posterUrl,
        captions, price: req.price || '', cta: req.cta || 'กดตะกร้าได้เลย\n👇',
        captionStyle: ['pop', 'box', 'karaoke', 'big'].includes(req.captionStyle) ? req.captionStyle : 'pop',
        accent: /^#[0-9a-f]{6}$/i.test(req.accent || '') ? req.accent : '#C8F94A',
        hookText: String(req.hookText || '').slice(0, 60) || undefined,
        audioUrl, origVolume: Math.min(1, Math.max(0, req.origVolume ?? (audioUrl ? 0.15 : 1))),
        music: ['fun', 'hype', 'suspense', 'chill', 'luxury'].includes(req.music) ? req.music : undefined,
        musicVolume: Math.min(0.3, Math.max(0, Number(req.musicVolume) || (audioUrl ? 0.1 : 0.07))),
        logoUrl: req.logoUrl ? await (async () => { const f = path.join(TMP, `${id}-logo.png`); await download(req.logoUrl, f); return `${LOCAL}/tmp/${id}-logo.png`; })() : undefined,
      },
    };
  }
  throw new Error('type ต้องเป็น review หรือ self');
}

async function callback(job, body) {
  if (!job.webhook_url) return;
  try {
    await fetch(job.webhook_url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { log('callback ล้มเหลว', job.id, e.message); }
}

async function work(job) {
  const t0 = Date.now();
  job.status = 'rendering';
  try {
    const { comp, props } = await buildProps(job.id, job.req, (s) => { job.stage = s; });
    job.stage = 'กำลังตัดต่อ';
    const composition = await selectComposition({ serveUrl, id: comp, inputProps: props, browserExecutable: BROWSER });
    const out = path.join(OUT, `${job.id}.mp4`);
    // คลิปที่มีวิดีโอซ้อน (เรื่องเล่า/ถ่ายเอง) กินแรมมาก: ทำทีละเฟรม + จำกัดแคชวิดีโอ ไม่ให้เครื่องตัดทิ้ง (SIGKILL)
    const heavy = comp === 'StoryClip' || comp === 'SelfClip';
    const opts = (conc) => ({
      composition, serveUrl, browserExecutable: BROWSER, codec: 'h264', crf: 20, outputLocation: out, inputProps: props,
      concurrency: conc, chromiumOptions: { gl: 'swangle' }, timeoutInMilliseconds: 180000,
      offthreadVideoCacheSizeInBytes: 384 * 1024 * 1024, offthreadVideoThreads: 1,
      onProgress: ({ progress }) => { job.progress = Math.round(progress * 100); },
    });
    try {
      await renderMedia(opts(heavy ? 1 : CONCURRENCY));
    } catch (e) {
      if (!/SIGKILL|memory|killed/i.test(String(e.message))) throw e;
      log('แรมไม่พอ ลองใหม่แบบประหยัดแรม', job.id);
      job.progress = 0;
      await renderMedia({ ...opts(1), offthreadVideoCacheSizeInBytes: 128 * 1024 * 1024 });
    }
    // ย้าย moov ไว้หน้าไฟล์ ให้มือถือ/LINE เล่นได้ทันทีขณะโหลด
    const fast = out.replace(/\.mp4$/, '.fs.mp4');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-c', 'copy', '-movflags', '+faststart', fast]);
    fs.renameSync(fast, out);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(props.snapshotSec || 1.5), '-i', out, '-frames:v', '1', '-vf', 'scale=540:-2', path.join(OUT, `${job.id}.jpg`)]);
    job.status = 'succeeded';
    log('เสร็จ', job.id, comp, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await callback(job, { id: job.id, status: 'succeeded', url: `${PUBLIC_BASE}${job.id}.mp4`, snapshot_url: `${PUBLIC_BASE}${job.id}.jpg`, metadata: job.metadata });
  } catch (e) {
    job.status = 'failed';
    job.error = e.message;
    log('ล้มเหลว', job.id, e.stack || e.message);
    await callback(job, { id: job.id, status: 'failed', error_message: String(e.message).slice(0, 500), metadata: job.metadata });
  } finally {
    for (const f of fs.readdirSync(TMP)) if (f.startsWith(job.id)) fs.rmSync(path.join(TMP, f), { force: true });
  }
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) await work(queue.shift());
  busy = false;
}

function cleanup() {
  const limit = Date.now() - KEEP_DAYS * 864e5;
  for (const f of fs.readdirSync(OUT)) {
    const p = path.join(OUT, f);
    if (fs.statSync(p).mtimeMs < limit) fs.rmSync(p, { force: true });
  }
}

const app = express();
app.use(express.json({ limit: '30mb' }));
app.use('/files', express.static(OUT, { maxAge: '7d' }));
app.use('/tmp', express.static(TMP));
app.get('/health', (_q, r) => r.json({ ok: !!serveUrl, queue: queue.length, busy }));
app.get('/renders/:id', (q, r) => {
  const j = jobs.get(q.params.id);
  if (!j) return r.status(404).json({ error: 'not found' });
  r.json({ id: j.id, status: j.status, progress: j.progress || 0, stage: j.stage || '', error: j.error });
});
app.post('/render', (q, r) => {
  if (TOKEN && q.get('x-render-token') !== TOKEN) return r.status(401).json({ error: 'unauthorized' });
  if (!serveUrl) return r.status(503).json({ error: 'กำลังเริ่มระบบ ลองใหม่อีกสักครู่' });
  const body = q.body || {};
  const id = crypto.randomUUID();
  const job = { id, status: 'queued', req: body, webhook_url: body.webhook_url, metadata: body.metadata };
  jobs.set(id, job);
  queue.push(job);
  pump();
  r.status(202).json({ id, status: 'queued', position: queue.length });
});

app.listen(PORT, async () => {
  log(`aff-renderer ฟังที่พอร์ต ${PORT}`);
  await ensureBrowser({ browserExecutable: BROWSER });
  serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
  log('พร้อมเรนเดอร์');
  cleanup();
  setInterval(cleanup, 3600e3);
});
