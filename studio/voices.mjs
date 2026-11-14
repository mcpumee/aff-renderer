// คลังเสียงตัวละคร — ใช้เสียงมาตรฐานของ ElevenLabs (แพ็กฟรีใช้ผ่าน API ได้)
// pitch: ปรับเสียงสูง/ต่ำหลังสร้าง (ความยาวเท่าเดิม) ใช้ทำเสียงเด็ก / คนชรา เพราะเสียงมาตรฐานไม่มีเสียงเด็กและหญิงชรา
// อัปแพ็กเป็น Starter แล้วเพิ่มเสียงจาก Voice Library (เสียงไทยแท้ / เด็ก / ชรา) ใส่ใน VOICES_EXTRA ได้ (JSON)
export const NARRATOR = { id: 'N', name: 'ผู้บรรยาย', gender: 'female', age: 'middle', voice: 'XrExE9yKIg1WjnnlVkGX', pitch: 1 };

export const VOICES = [
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda · หญิงวัยกลางคน (ผู้บรรยาย)', gender: 'female', age: 'middle' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica · หญิงสาว สดใส', gender: 'female', age: 'young' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura · หญิงสาว ร่าเริง', gender: 'female', age: 'young' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah · หญิงสาว นุ่มนวล', gender: 'female', age: 'young' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily · หญิงวัยกลางคน อบอุ่น', gender: 'female', age: 'middle' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice · หญิงวัยกลางคน มั่นใจ', gender: 'female', age: 'middle' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam · ชายหนุ่ม', gender: 'male', age: 'young' },
  { id: 'bIHbv24MWmeRgasZH58o', label: 'Will · ชายหนุ่ม เป็นกันเอง', gender: 'male', age: 'young' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian · ชายวัยกลางคน เสียงทุ้ม', gender: 'male', age: 'middle' },
  { id: 'cjVigY5qzO86Huf0OWal', label: 'Eric · ชายวัยกลางคน เป็นมิตร', gender: 'male', age: 'middle' },
  { id: 'iP95p4xoKVk53GoZ742B', label: 'Chris · ชายวัยกลางคน สบายๆ', gender: 'male', age: 'middle' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George · ชายวัยกลางคน อบอุ่น', gender: 'male', age: 'middle' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel · ชายวัยกลางคน จริงจัง', gender: 'male', age: 'middle' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum · ชาย เข้ม ดุดัน', gender: 'male', age: 'middle' },
  { id: 'pqHfZKP75CvOlQylNhV4', label: 'Bill · ชายชรา', gender: 'male', age: 'old' },
];
try { VOICES.push(...JSON.parse(process.env.VOICES_EXTRA || '[]')); } catch { /* ไม่สนใจ */ }

// ลำดับเสียงที่เหมาะกับแต่ละวัย [voice, pitch]
const CAST = {
  'female|child': [['cgSgspJ2msm6clMCkdW9', 1.22], ['FGY2WhTYpPnrIDTdsKH5', 1.2]],
  'male|child': [['EXAVITQu4vr4xnSDxMaL', 1.12], ['FGY2WhTYpPnrIDTdsKH5', 1.1]],
  'female|young': [['cgSgspJ2msm6clMCkdW9', 1], ['FGY2WhTYpPnrIDTdsKH5', 1], ['EXAVITQu4vr4xnSDxMaL', 1]],
  'female|middle': [['pFZP5JQG7iQjIQuC4Bku', 1], ['Xb7hH8MSUJpSbSDYk0k2', 1]],
  'female|old': [['pFZP5JQG7iQjIQuC4Bku', 0.9], ['Xb7hH8MSUJpSbSDYk0k2', 0.9]],
  'male|young': [['TX3LPaxmHKxFdv7VOQHJ', 1], ['bIHbv24MWmeRgasZH58o', 1]],
  'male|middle': [['nPczCjzI2devNBz1zQrb', 1], ['cjVigY5qzO86Huf0OWal', 1], ['iP95p4xoKVk53GoZ742B', 1], ['JBFqnCBsd6RMkjVDRZzb', 1], ['onwK4e9ZLuTAKqWW03F9', 1]],
  'male|old': [['pqHfZKP75CvOlQylNhV4', 1], ['JBFqnCBsd6RMkjVDRZzb', 0.92]],
};
// เสียงเพิ่มเติม (จาก VOICES_EXTRA) มาก่อนเสียงมาตรฐาน เพราะตั้งใจเลือกมาแล้ว
for (const v of VOICES.slice(15)) {
  const k = `${v.gender}|${v.age}`;
  if (CAST[k]) CAST[k].unshift([v.id, 1]);
}

export const COLORS = ['#FFE14D', '#7FDBFF', '#FF8FB1', '#9BF6A3', '#FFB86B', '#C9A7FF'];

export const normGender = (g) => (/^(f|ห|ญ|w)/i.test(String(g || '')) || /หญิง|ผู้หญิง|female|woman|girl/i.test(String(g)) ? 'female' : 'male');
export function normAge(a) {
  const s = String(a || '').toLowerCase();
  if (/child|kid|boy|girl|เด็ก/.test(s)) return 'child';
  if (/old|elder|senior|ชรา|แก่|ยาย|ตา|ปู่|ย่า/.test(s)) return 'old';
  if (/young|teen|หนุ่ม|สาว|วัยรุ่น/.test(s)) return 'young';
  return 'middle';
}

/** ใส่เสียงให้ตัวละครที่ยังไม่มีเสียง ไม่ให้ซ้ำกันและไม่ซ้ำผู้บรรยาย */
export function castVoices(chars = []) {
  const used = new Set([NARRATOR.voice + '|1']), usedBase = new Set([NARRATOR.voice]);
  for (const c of chars) if (c.voice) { used.add(`${c.voice}|${c.pitch || 1}`); usedBase.add(c.voice); }
  return chars.map((c, i) => {
    const out = { ...c, gender: normGender(c.gender), age: normAge(c.age), color: c.color || COLORS[i % COLORS.length] };
    if (!out.voice) {
      const opts = CAST[`${out.gender}|${out.age}`] || CAST[`${out.gender}|middle`];
      // เลือกเสียงที่ยังไม่มีใครใช้ก่อน (แม้ปรับระดับเสียงแล้ว เสียงเดิมก็ยังฟังออกว่าคนเดียวกัน)
      const pick = opts.find(([v]) => !usedBase.has(v)) || opts.find(([v, p]) => !used.has(`${v}|${p}`)) || opts[i % opts.length];
      [out.voice, out.pitch] = pick;
      used.add(`${out.voice}|${out.pitch}`); usedBase.add(out.voice);
    }
    if (!out.pitch) {
      // เลือกเสียงเองแต่ระดับเสียง "อัตโนมัติ": เด็กเสียงสูงขึ้น ชราเสียงต่ำลง (ยกเว้นเสียงที่เป็นวัยนั้นอยู่แล้ว)
      const v = VOICES.find((x) => x.id === out.voice);
      out.pitch = v && v.age === out.age ? 1 : out.age === 'child' ? 1.2 : out.age === 'old' ? 0.92 : 1;
    }
    return out;
  });
}

/** แปลงข้อความ "ชื่อ: บทพูด" (บรรทัดละคน) ↔ lines */
export function parseLines(text, chars) {
  const out = [];
  for (const raw of String(text || '').split('\n')) {
    const row = raw.trim();
    if (!row) continue;
    const m = row.match(/^([^:：]{1,24})[:：]\s*(.+)$/);
    let who = 'N', t = row;
    if (m) {
      const name = m[1].trim();
      const c = chars.find((x) => x.name === name || x.id === name);
      if (c) { who = c.id; t = m[2]; } else if (/บรรยาย|narrator/i.test(name)) { t = m[2]; }
    }
    if (t.trim()) out.push({ who, text: t.trim() });
  }
  return out;
}
export const linesToText = (lines, chars) => (lines || []).map((l) => {
  const c = chars.find((x) => x.id === l.who);
  return `${c ? c.name : NARRATOR.name}: ${l.text}`;
}).join('\n');
