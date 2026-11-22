import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import '@fontsource/kanit/thai-500.css';
import '@fontsource/kanit/thai-700.css';
import '@fontsource/kanit/thai-800.css';
import '@fontsource/kanit/latin-500.css';
import '@fontsource/kanit/latin-700.css';
import '@fontsource/kanit/latin-800.css';

export const FONT = "'Kanit', sans-serif";
export const ORANGE = '#EE4D2D';
export const YELLOW = '#FFD23F';

export type Caption = { start: number; end: number; text: string; name?: string; color?: string };

/** ตัวหนังสือมีขอบดำ อ่านง่ายบนทุกภาพ */
export const outline = (px: number) => ({
  WebkitTextStroke: `${px}px #0B0B0D`,
  paintOrder: 'stroke fill' as const,
  textShadow: '0 6px 18px rgba(0,0,0,0.45)',
});

/** เด้งเข้า (pop) เริ่มที่เฟรม from */
export const usePop = (from: number, startScale = 0.6) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - from, fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
  return {
    scale: interpolate(s, [0, 1], [startScale, 1]),
    opacity: interpolate(frame - from, [0, 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  };
};

/** ป้ายราคาสีส้ม */
export const PriceChip: React.FC<{ text: string; size: number; rotate?: number; from?: number; startScale?: number }> = ({
  text, size, rotate = 0, from = 0, startScale = 0.6,
}) => {
  const p = usePop(from, startScale);
  if (!text) return null;
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.1,
        color: '#fff',
        background: ORANGE,
        padding: `${size * 0.12}px ${size * 0.4}px`,
        borderRadius: size * 0.25,
        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
        transform: `rotate(${rotate}deg) scale(${p.scale})`,
        opacity: p.opacity,
      }}
    >
      {text}
    </div>
  );
};

/** ซับไตเติลด้านล่างจอ (ไม่บังสินค้า) */
export const Captions: React.FC<{ captions: Caption[]; bottom?: number }> = ({ captions, bottom = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cur = captions.find((c) => t >= c.start && t < c.end);
  if (!cur) return null;
  const local = (t - cur.start) * fps;
  const pop = interpolate(local, [0, 4], [0.85, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, bottom, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 66,
          lineHeight: 1.25,
          color: cur.color || '#fff',
          textAlign: 'center',
          transform: `scale(${pop})`,
          ...outline(10),
        }}
      >
        {cur.name ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 46, fontWeight: 800, color: '#0B0B0D', background: cur.color || '#fff', padding: '4px 22px', borderRadius: 999,
              WebkitTextStroke: '0px', textShadow: 'none', boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }}>{cur.name}</span>
          </div>
        ) : null}
        {cur.text}
      </div>
    </div>
  );
};

/** ซับหลายสไตล์: pop (ขอบดำ) · box (กล่องสี) · karaoke (ไฮไลต์ไล่สี) · big (ตัวโตกลางจอ) */
export type CaptionStyle = 'pop' | 'box' | 'karaoke' | 'big';
export const StyledCaptions: React.FC<{ captions: Caption[]; style?: CaptionStyle; accent?: string; bottom?: number }> = ({ captions, style = 'pop', accent = '#C8F94A', bottom = 330 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (style === 'pop') return <Captions captions={captions} bottom={bottom} />;
  const t = frame / fps;
  const cur = captions.find((c) => t >= c.start && t < c.end);
  if (!cur) return null;
  const local = (t - cur.start) * fps;
  const k = Math.min(1, Math.max(0, (t - cur.start) / Math.max(0.2, cur.end - cur.start - 0.15)));
  if (style === 'box') {
    const hex = /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#C8F94A';
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ink = lum > 0.55 ? '#0B0B0D' : '#FFFFFF';
    const pop = interpolate(local, [0, 5], [0.7, 1], { extrapolateRight: 'clamp' });
    return (
      <div style={{ position: 'absolute', left: 50, right: 50, bottom, display: 'flex', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 62, lineHeight: 1.25, color: ink, background: hex, padding: '12px 30px', borderRadius: 20, border: '4px solid rgba(255,255,255,0.85)',
          textAlign: 'center', transform: `scale(${pop}) rotate(${(cur.start * 7) % 2 > 1 ? -1.5 : 1.5}deg)`, boxShadow: '0 10px 26px rgba(0,0,0,0.35)' }}>{cur.text}</div>
      </div>
    );
  }
  if (style === 'karaoke') {
    return (
      <div style={{ position: 'absolute', left: 60, right: 60, bottom, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', fontFamily: FONT, fontWeight: 800, fontSize: 68, lineHeight: 1.25, textAlign: 'center' }}>
          <div style={{ color: '#FFFFFF', ...outline(10) }}>{cur.text}</div>
          <div style={{ position: 'absolute', inset: 0, color: '#FFD23F', clipPath: `inset(0 ${100 - k * 100}% 0 0)`, ...outline(10) }}>{cur.text}</div>
        </div>
      </div>
    );
  }
  // big
  const pop = interpolate(local, [0, 3, 6], [1.4, 0.95, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: 1080, display: 'flex', justifyContent: 'center' }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 96, lineHeight: 1.15, color: '#FFD23F', textAlign: 'center', transform: `scale(${pop})`, ...outline(14) }}>{cur.text}</div>
    </div>
  );
};
