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

export type Caption = { start: number; end: number; text: string };

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
          color: '#fff',
          textAlign: 'center',
          transform: `scale(${pop})`,
          ...outline(10),
        }}
      >
        {cur.text}
      </div>
    </div>
  );
};
