// ภาชนะลุ้นของแบบต่างๆ (ใช้แทนกล่องของขวัญในฉากเปิด) — ทุกแบบ "ระเบิด/เปิด" ที่เฟรม B
import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, Easing } from 'remotion';
import type { Theme } from './GiftIntro';

export type RevealKind = 'gift' | 'mystery' | 'egg' | 'gacha' | 'chest' | 'scratch' | 'wheel';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = Easing.out(Easing.cubic);

type P = { kind: RevealKind; frame: number; B: number; theme: Theme; boxAway: number };

/** การสั่นก่อนเปิด (แรงขึ้นเรื่อยๆ) */
function shake(frame: number, B: number) {
  const p = Math.min(1, frame / Math.max(1, B));
  const amp = 1.5 + 6.5 * p * p;
  return frame < B ? { rot: Math.sin(frame * 1.7) * amp, x: Math.sin(frame * 2.3) * amp * 2.2, p } : { rot: 0, x: 0, p: 1 };
}

export const RevealContainer: React.FC<P> = (props) => {
  switch (props.kind) {
    case 'egg': return <Egg {...props} />;
    case 'gacha': return <Gacha {...props} />;
    case 'chest': return <Chest {...props} />;
    case 'scratch': return <Scratch {...props} />;
    case 'wheel': return <Wheel {...props} />;
    default: return null;
  }
};

// ---------- ไข่ปริศนา: ไข่ทองโยก → ร้าว → เปลือกบนปลิว ----------
const Egg: React.FC<P> = ({ frame, B, boxAway }) => {
  const s = shake(frame, B), t = frame - B;
  const W = 470, H = 600, cx = 540, top = 1020;
  const crack = interpolate(frame, [B * 0.45, B], [0, 1], clamp);
  const fly = interpolate(t, [0, 18], [0, 1], { ...clamp, easing: easeOut });
  const drop = interpolate(t, [0, 12], [0, 260], { ...clamp, easing: easeOut });
  const shell = (half: 'top' | 'bottom') => (
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50% 50% 47% 47% / 58% 58% 42% 42%',
      background: 'radial-gradient(circle at 35% 28%, #FFF7D1 0%, #F4C84A 30%, #C98A12 75%, #7A4E00 100%)',
      clipPath: half === 'top' ? 'polygon(0 0,100% 0,100% 46%,88% 52%,76% 44%,63% 53%,50% 45%,37% 54%,24% 44%,12% 53%,0 46%)'
        : 'polygon(0 46%,12% 53%,24% 44%,37% 54%,50% 45%,63% 53%,76% 44%,88% 52%,100% 46%,100% 100%,0 100%)',
      boxShadow: 'inset -30px -40px 80px rgba(0,0,0,0.25)' }}>
      {[[0.3, 0.3, 40], [0.65, 0.22, 28], [0.55, 0.62, 36], [0.25, 0.7, 24], [0.78, 0.55, 30]].map(([x, y, r], i) => (
        <div key={i} style={{ position: 'absolute', left: x * W - r, top: y * H - r, width: r * 2, height: r * 2, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
      ))}
    </div>
  );
  return (
    <>
      <div style={{ position: 'absolute', left: cx - 300, top: top + H - 30 + boxAway, width: 600, height: 80, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.4), transparent 70%)' }} />
      <div style={{ position: 'absolute', left: cx - W / 2 + s.x, top: top + drop + boxAway, width: W, height: H, transform: `rotate(${s.rot * 1.4}deg)`, transformOrigin: '50% 90%' }}>
        {shell('bottom')}
        {t < 0 ? (
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: crack }}>
            <polyline points={`${W * 0.05},${H * 0.47} ${W * 0.2},${H * 0.42} ${W * 0.33},${H * 0.52} ${W * 0.5},${H * 0.44} ${W * 0.62},${H * 0.53} ${W * 0.8},${H * 0.43} ${W * 0.95},${H * 0.49}`}
              fill="none" stroke="#3B2500" strokeWidth={7} strokeLinejoin="round" strokeDasharray={1200} strokeDashoffset={1200 * (1 - crack)} />
          </svg>
        ) : null}
      </div>
      {t < 24 ? (
        <div style={{ position: 'absolute', left: cx - W / 2 + s.x - fly * 260, top: top - fly * 1100, width: W, height: H,
          transform: `rotate(${s.rot * 1.4 - fly * 70}deg)`, transformOrigin: '50% 50%', opacity: interpolate(t, [14, 24], [1, 0], clamp) }}>{shell('top')}</div>
      ) : null}
      <Sequence from={Math.round(B * 0.45)} durationInFrames={Math.max(1, Math.round(B * 0.55))}><Audio src={staticFile('sfx/shake.mp3')} volume={0.5} /></Sequence>
    </>
  );
};

// ---------- กาชาปอง: แคปซูลกลม 2 สี → ฝาบนเด้งออก ----------
const Gacha: React.FC<P> = ({ frame, B, theme, boxAway }) => {
  const s = shake(frame, B), t = frame - B;
  const D = 520, cx = 540, top = 1000;
  const bounce = frame < B ? -Math.abs(Math.sin(frame * 0.35)) * 60 * (1 - s.p * 0.6) : 0;
  const fly = interpolate(t, [0, 16], [0, 1], { ...clamp, easing: easeOut });
  const drop = interpolate(t, [0, 12], [0, 260], { ...clamp, easing: easeOut });
  const half = (top_: boolean) => (
    <div style={{ position: 'absolute', left: 0, top: top_ ? 0 : D / 2, width: D, height: D / 2, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: top_ ? 0 : -D / 2, width: D, height: D, borderRadius: '50%',
        background: top_ ? `radial-gradient(circle at 35% 25%, rgba(255,255,255,0.9) 0%, ${theme.box} 30%, ${theme.boxDark} 100%)`
          : 'radial-gradient(circle at 35% 70%, #FFFFFF 0%, #E9EDF2 45%, #9AA3AE 100%)' }} />
    </div>
  );
  return (
    <>
      <div style={{ position: 'absolute', left: cx - 280, top: top + D - 20 + boxAway, width: 560, height: 70, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.38), transparent 70%)' }} />
      <div style={{ position: 'absolute', left: cx - D / 2 + s.x, top: top + bounce + drop + boxAway, width: D, height: D, transform: `rotate(${s.rot * 2}deg)` }}>
        {half(false)}
        <div style={{ position: 'absolute', left: 0, top: D / 2 - 10, width: D, height: 20, background: theme.ribbon, opacity: t < 0 ? 1 : 0 }} />
      </div>
      {t < 22 ? (
        <div style={{ position: 'absolute', left: cx - D / 2 + s.x + fly * 220, top: top + bounce - fly * 1150, width: D, height: D,
          transform: `rotate(${s.rot * 2 + fly * 55}deg)`, opacity: interpolate(t, [12, 22], [1, 0], clamp) }}>{half(true)}</div>
      ) : null}
    </>
  );
};

// ---------- หีบสมบัติ: ฝาโค้งเปิดขึ้น + แสงทอง ----------
const Chest: React.FC<P> = ({ frame, B, boxAway }) => {
  const s = shake(frame, B), t = frame - B;
  const W = 620, H = 360, cx = 540, top = 1220;
  const open = interpolate(t, [0, 14], [0, 1], { ...clamp, easing: easeOut });
  const glow = frame < B ? s.p * 0.6 : interpolate(t, [0, 6, 30], [1, 1, 0.5], clamp);
  const wood = 'repeating-linear-gradient(90deg, #7A4A21 0px, #8B5A2B 30px, #6B3E19 60px)';
  return (
    <>
      <div style={{ position: 'absolute', left: cx - 420, top: top + H - 40 + boxAway, width: 840, height: 90, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.45), transparent 70%)' }} />
      <div style={{ position: 'absolute', left: cx - 450, top: top - 450 + boxAway, width: 900, height: 700, borderRadius: '50%', opacity: glow,
        background: 'radial-gradient(circle, rgba(255,226,120,0.95) 0%, rgba(255,190,40,0.4) 35%, transparent 65%)' }} />
      <div style={{ position: 'absolute', left: cx - W / 2 + s.x, top: top + boxAway, width: W, height: H, transform: `rotate(${s.rot * 0.8}deg)`, transformOrigin: '50% 100%' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: wood, boxShadow: 'inset 0 -40px 60px rgba(0,0,0,0.35)' }} />
        {[0.12, 0.88].map((x) => <div key={x} style={{ position: 'absolute', left: x * W - 26, top: 0, width: 52, height: H, background: 'linear-gradient(90deg,#B8860B,#FFD700,#B8860B)' }} />)}
        <div style={{ position: 'absolute', left: W / 2 - 46, top: 10, width: 92, height: 110, borderRadius: 12, background: 'linear-gradient(180deg,#FFE27A,#B8860B)', boxShadow: '0 6px 14px rgba(0,0,0,0.4)' }}>
          <div style={{ position: 'absolute', left: 36, top: 36, width: 20, height: 40, borderRadius: 10, background: '#3B2500' }} />
        </div>
      </div>
      {/* ฝา: หมุนขึ้นรอบขอบหลัง (ย่อแนวตั้ง + เลื่อนขึ้น) */}
      <div style={{ position: 'absolute', left: cx - W / 2 - 10 + s.x, top: top - 210 + boxAway - open * 190, width: W + 20, height: 220,
        transform: `rotate(${s.rot * 0.8}deg) scaleY(${1 - open * 1.65})`, transformOrigin: '50% 100%', opacity: interpolate(t, [10, 20], [1, 0.0], clamp) }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '320px 320px 14px 14px / 200px 200px 14px 14px', background: wood, boxShadow: 'inset 0 30px 50px rgba(255,255,255,0.12)' }} />
        {[0.12, 0.88].map((x) => <div key={x} style={{ position: 'absolute', left: x * (W + 20) - 26, top: 0, width: 52, height: 220, background: 'linear-gradient(90deg,#B8860B,#FFD700,#B8860B)' }} />)}
      </div>
    </>
  );
};

// ---------- ขูดบัตร: เหรียญขูดชั้นเงินทีละแถว ----------
const Scratch: React.FC<P> = ({ frame, B, theme, boxAway }) => {
  const t = frame - B;
  const W = 760, H = 560, cx = 540, top = 960;
  const prog = interpolate(frame, [4, B], [0, 1], clamp);
  const rows = 5, path: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i <= 10; i++) path.push([r % 2 ? 1 - i / 10 : i / 10, (r + 0.5) / rows]);
  const n = Math.floor(prog * (path.length - 1));
  const [px, py] = path[Math.min(path.length - 1, n)];
  const fade = interpolate(t, [0, 8], [1, 0], clamp);
  const away = interpolate(t, [10, 26], [0, 1], { ...clamp, easing: easeOut });
  const holes = path.slice(0, n + 1).map(([x, y]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, transparent 0 78px, black 80px)`).join(',');
  return (
    <div style={{ position: 'absolute', left: cx - W / 2, top: top + boxAway + away * 900, width: W, height: H, opacity: 1 - away }}>
      <div style={{ position: 'absolute', inset: -18, borderRadius: 36, background: `linear-gradient(135deg, ${theme.box}, ${theme.boxDark})`, boxShadow: '0 30px 60px rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'radial-gradient(circle, #FFF8D6, #FFD23F)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 220, fontWeight: 800, color: theme.boxDark }}>?</div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 24, opacity: fade,
        background: 'repeating-linear-gradient(45deg, #C9CED6 0 14px, #B4BAC4 14px 28px)',
        WebkitMaskImage: holes || undefined, maskImage: holes || undefined, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 800, color: '#7D8591', letterSpacing: 4 }}>ขูดเลย!</div>
      </div>
      {t < 0 ? (
        <div style={{ position: 'absolute', left: px * W - 60, top: py * H - 60, width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #FFF4C2, #E8B730 50%, #9C7410)', boxShadow: '0 10px 20px rgba(0,0,0,0.4)', transform: `rotate(${frame * 12}deg)` }} />
      ) : null}
      <Sequence from={4} durationInFrames={Math.max(1, B - 4)}><Audio src={staticFile('sfx/shake.mp3')} volume={0.35} /></Sequence>
    </div>
  );
};

// ---------- วงล้อนำโชค: หมุนเร็ว → ค่อยๆ หยุดที่ช่อง "รางวัลใหญ่" ----------
const Wheel: React.FC<P> = ({ frame, B, theme, boxAway }) => {
  const t = frame - B;
  const R = 370, cx = 540, cy = 1060;
  const segs = 8;
  const colors = [theme.box, '#FFFFFF', theme.boxDark, '#FFD23F'];
  const total = 360 * 5; // หยุดให้ช่อง 0 (รางวัลใหญ่) อยู่ใต้เข็มพอดี
  const k = interpolate(frame, [0, B], [0, 1], { ...clamp, easing: Easing.out(Easing.poly(4)) });
  const angle = -total * k;
  const away = interpolate(t, [8, 24], [0, 1], { ...clamp, easing: easeOut });
  const win = t >= 0 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 0.5)) : 0;
  const labels = ['รางวัลใหญ่', '?', 'โชค', '?', 'ลุ้น', '?', 'ของดี', '?'];
  return (
    <div style={{ position: 'absolute', left: 0, top: boxAway + away * 1000, width: 1080, height: 1920, opacity: 1 - away * 0.9 }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={R + 34} fill="#2B1B0A" />
        <circle cx={cx} cy={cy} r={R + 22} fill="#FFD23F" />
        <g transform={`rotate(${angle} ${cx} ${cy})`}>
          {Array.from({ length: segs }).map((_, i) => {
            const a0 = (i / segs) * Math.PI * 2 - Math.PI / 2 - Math.PI / segs, a1 = a0 + (Math.PI * 2) / segs;
            const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
            const am = (a0 + a1) / 2, lx = cx + R * 0.62 * Math.cos(am), ly = cy + R * 0.62 * Math.sin(am);
            const fill = i === 0 ? '#C8F94A' : colors[i % colors.length];
            return (
              <g key={i}>
                <path d={`M${cx},${cy} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`} fill={fill} stroke="#2B1B0A" strokeWidth={6} opacity={i === 0 ? 1 : 0.95} />
                <text x={lx} y={ly} fill={fill === '#FFFFFF' || fill === '#FFD23F' || fill === '#C8F94A' ? '#2B1B0A' : '#FFFFFF'} fontSize={i === 0 ? 44 : 64} fontWeight={800}
                  textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(am * 180) / Math.PI + 90} ${lx} ${ly})`} fontFamily="Kanit, sans-serif">{labels[i]}</text>
              </g>
            );
          })}
        </g>
        <circle cx={cx} cy={cy} r={64} fill="#FFD23F" stroke="#2B1B0A" strokeWidth={8} />
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const on = Math.floor(frame / 4 + i) % 2 === 0 || win > 0.8;
          return <circle key={i} cx={cx + (R + 22) * Math.cos(a)} cy={cy + (R + 22) * Math.sin(a)} r={11} fill={on ? '#FFFBE6' : '#C49A2C'} />;
        })}
        <path d={`M${cx - 46},${cy - R - 70} L${cx + 46},${cy - R - 70} L${cx},${cy - R + 30} Z`} fill="#E63946" stroke="#2B1B0A" strokeWidth={6} />
      </svg>
      {t >= 0 ? <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${(cy - R) / 19.2}%, rgba(200,249,74,${0.35 * win}), transparent 40%)` }} /> : null}
    </div>
  );
};
