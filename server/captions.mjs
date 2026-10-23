// แปลง alignment (เวลาต่อตัวอักษร) จาก ElevenLabs /with-timestamps → ซับเป็นท่อน ๆ
const MAX_LEN = 18;      // ตัวอักษรต่อหนึ่งท่อน (ไม่นับสระลอย/วรรณยุกต์)
const GAP_BREAK = 0.35;  // หยุดหายใจเกินนี้ → ขึ้นท่อนใหม่

const visibleLen = (s) => [...s].filter((c) => !/[ัิ-ฺ็-๎]/.test(c)).length;

export function captionsFromAlignment(al) {
  if (!al || !al.characters || !al.characters.length) return [];
  const chars = al.characters;
  const st = al.character_start_times_seconds;
  const en = al.character_end_times_seconds;
  const text = chars.join('');
  const seg = new Intl.Segmenter('th', { granularity: 'word' });
  const words = [];
  for (const w of seg.segment(text)) {
    const i0 = w.index, i1 = w.index + w.segment.length - 1;
    words.push({ text: w.segment, start: st[i0], end: en[i1], space: !w.isWordLike });
  }
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur && cur.text.trim()) out.push({ start: cur.start, end: cur.end, text: cur.text.trim() });
    cur = null;
  };
  for (const w of words) {
    if (w.space) {
      if (cur) cur.text += ' ';
      if (/[.!?…\n]/.test(w.text)) flush();
      continue;
    }
    if (cur && (visibleLen(cur.text + w.text) > MAX_LEN || w.start - cur.end > GAP_BREAK)) flush();
    if (!cur) cur = { start: w.start, end: w.end, text: '' };
    cur.text += w.text;
    cur.end = w.end;
  }
  flush();
  // ให้ท่อนต่อกันไม่กระพริบ: ขยายเวลาจบไปถึงท่อนถัดไป (ไม่เกิน 0.4 วิ)
  for (let i = 0; i < out.length; i++) {
    const next = out[i + 1];
    out[i].end = next ? Math.min(next.start, out[i].end + 0.4) : out[i].end + 0.4;
  }
  return out;
}
