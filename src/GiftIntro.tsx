import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { FONT, YELLOW, outline, usePop } from './common';

export type Theme = {
  bg: [string, string];
  box: string;
  boxDark: string;
  ribbon: string;
  baubles: string[];
  confetti: string[];
};
export type Product = { url: string; w: number; h: number; cut: boolean };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = Easing.out(Easing.cubic);

// ตำแหน่งกล่อง
const BOX_W = 540, BOX_H = 380, BOX_TOP = 1160, LID_H = 118, LID_W = 600;

type Props = {
  theme: Theme;
  products: Product[];
  reviewUrls: string[];
  hookText: string;
  burstSec: number;
  introSec: number;
};

/** ตำแหน่งสินค้าหลังระเบิด */
function layout(n: number) {
  if (n <= 1) return [{ x: 540, y: 820, h: 820, rot: -4, maxW: 780 }];
  if (n === 2) return [{ x: 370, y: 860, h: 700, rot: -9, maxW: 470 }, { x: 720, y: 790, h: 720, rot: 7, maxW: 470 }];
  return [{ x: 540, y: 770, h: 720, rot: 0, maxW: 520 }, { x: 240, y: 930, h: 520, rot: -12, maxW: 360 }, { x: 850, y: 930, h: 520, rot: 12, maxW: 360 }];
}

export const GiftIntro: React.FC<Props> = ({ theme, products, reviewUrls, hookText, burstSec, introSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const B = Math.round(burstSec * fps);
  const R = B + Math.round(1.4 * fps); // เริ่มแปะรีวิว
  const t = frame - B;
  const reviews = reviewUrls.slice(0, 3);

  // ก่อนระเบิด: สั่น + พอง
  const p = Math.min(1, frame / Math.max(1, B));
  const amp = 1.5 + 6.5 * p * p;
  const shakeRot = frame < B ? Math.sin(frame * 1.7) * amp : 0;
  const shakeX = frame < B ? Math.sin(frame * 2.3) * amp * 2.2 : 0;
  const swell = frame < B ? 1 + 0.17 * easeOut(Math.max(0, (p - 0.45) / 0.55)) : 1.17;
  const squash = frame < B ? 1 + 0.05 * Math.sin(frame * 1.1) * p : 1;
  const lidHop = frame < B ? -Math.abs(Math.sin(frame * 0.9)) * 22 * p : 0;

  // หลังระเบิด: ฝาปลิว / ตัวกล่องลงล่าง
  const lidK = interpolate(t, [0, 18], [0, 1], { ...clamp, easing: easeOut });
  const bodyDrop = interpolate(t, [0, 12], [0, 300], { ...clamp, easing: easeOut });
  const flapK = interpolate(t, [0, 10], [0, 1], { ...clamp, easing: easeOut });
  // ช่วงแปะรีวิว: ยกสินค้าขึ้น ย่อลง กล่องเลื่อนออก
  const k = frame >= R ? spring({ frame: frame - R, fps, config: { damping: 16, stiffness: 90 } }) : 0;
  const boxAway = k * 950;

  const raysO = interpolate(t, [0, 8], [0, 0.55], clamp) * (1 - 0.4 * k);
  const flash = interpolate(t, [0, 2, 12], [0, 0.9, 0], clamp);
  const glowPre = frame < B ? p * p * 0.9 : 0;

  const hook = usePop(2, 0.5);
  const hookO = interpolate(frame, [B + 10, B + 18], [1, 0], clamp);

  const L = layout(products.length);
  const order = products.map((_, i) => i).sort((a, b) => (a === 0 ? 1 : 0) - (b === 0 ? 1 : 0)); // ตัวหลักอยู่บนสุด

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${theme.bg[0]} 0%, ${theme.bg[1]} 100%)`, overflow: 'hidden', fontFamily: FONT }}>
      {/* แสงแฉกหมุน */}
      <AbsoluteFill style={{ opacity: raysO }}>
        <div style={{
          position: 'absolute', left: 540 - 1000, top: 820 - 1000 - k * 260, width: 2000, height: 2000, borderRadius: '50%',
          background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.55) 0deg 7deg, rgba(255,255,255,0) 7deg 22deg)',
          transform: `rotate(${frame * 0.5}deg)`,
          maskImage: 'radial-gradient(circle, black 0%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 70%)',
        }} />
      </AbsoluteFill>
      {/* แสงเรืองรอบกล่องก่อนระเบิด */}
      <div style={{ position: 'absolute', left: 540 - 520, top: BOX_TOP + 160 - 520, width: 1040, height: 1040, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,250,220,0.95) 0%, rgba(255,230,150,0.4) 35%, transparent 65%)', opacity: glowPre }} />

      {/* ลูกบอลแขวน */}
      {t >= 0 && theme.baubles.length ? <Baubles theme={theme} t={t} /> : null}

      {/* เงาพื้น */}
      <div style={{ position: 'absolute', left: 540 - 380, top: 1600 + bodyDrop * 0.3 + boxAway, width: 760, height: 90, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,0,0,0.35), transparent 70%)' }} />

      {/* ตัวกล่อง (หลังระเบิดเปิดฝาอ้า) */}
      <div style={{ position: 'absolute', left: 540 - BOX_W / 2 + shakeX, top: BOX_TOP + bodyDrop + boxAway, width: BOX_W, height: BOX_H,
        transform: `rotate(${shakeRot}deg) scale(${swell * (2 - squash)}, ${swell * squash})`, transformOrigin: '50% 100%' }}>
        {t >= 0 ? (
          <>
            <Flap side={-1} k={flapK} theme={theme} />
            <Flap side={1} k={flapK} theme={theme} />
            <div style={{ position: 'absolute', left: 0, top: -26, width: BOX_W, height: 52, borderRadius: '50%', background: theme.boxDark, filter: 'brightness(0.55)' }} />
          </>
        ) : null}
        <BoxBody theme={theme} />
      </div>

      {/* ฝา + โบว์ */}
      {t < 22 ? (
        <div style={{
          position: 'absolute', left: 540 - LID_W / 2 + shakeX + lidK * 300, top: BOX_TOP - LID_H + lidHop - lidK * 1250,
          width: LID_W, height: LID_H, opacity: interpolate(t, [14, 22], [1, 0], clamp),
          transform: `rotate(${shakeRot - lidK * 40}deg) scale(${swell})`, transformOrigin: '50% 100%',
        }}>
          <Lid theme={theme} />
          <div style={{ position: 'absolute', left: LID_W / 2 - 150, top: -150, transform: `translateX(${-lidK * 260}px) rotate(${-lidK * 60}deg)` }}>
            <Bow color={theme.ribbon} />
          </div>
        </div>
      ) : null}

      {/* สินค้าพุ่งออกจากกล่อง */}
      {t >= 0 ? order.map((i) => {
        const pr = products[i], slot = L[i];
        const s = spring({ frame: t - i * 3, fps, config: { damping: 10, stiffness: 120, mass: 0.8 } });
        const sec = (frame - B) / fps;
        const fy = Math.sin(sec * 2.2 + i * 1.3) * 16;
        const frot = Math.sin(sec * 1.6 + i) * 3;
        const ry = Math.sin(sec * 1.3 + i * 0.7) * 16;
        const startY = BOX_TOP + 120;
        const x = interpolate(s, [0, 1], [540, slot.x]);
        const y = interpolate(s, [0, 1], [startY, slot.y]) + fy * s;
        // ช่วงรีวิว: ย่อและยกขึ้นด้านบน
        const sc = interpolate(s, [0, 1], [0.15, 1]) * (1 - 0.45 * k);
        const yy = y - k * (slot.y - 470) - k * (slot.y - 820) * 0.4;
        const xx = 540 + (x - 540) * (1 - 0.35 * k);
        let h = slot.h, w = (h * pr.w) / pr.h;
        if (w > slot.maxW) { w = slot.maxW; h = (w * pr.h) / pr.w; }
        return (
          <div key={i} style={{ position: 'absolute', left: xx - w / 2, top: yy - h / 2, width: w, height: h,
            transform: `perspective(1400px) rotateY(${ry}deg) rotate(${slot.rot + frot}deg) scale(${sc})`, opacity: interpolate(t, [0, 3], [0, 1], clamp) }}>
            {pr.cut ? (
              <Img src={pr.url} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 38px 34px rgba(0,0,0,0.38))' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#fff', padding: 22, borderRadius: 28, boxSizing: 'border-box', boxShadow: '0 40px 70px rgba(0,0,0,0.4)' }}>
                <Img src={pr.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
              </div>
            )}
          </div>
        );
      }) : null}

      {/* ประกายวิบวับ + พลุกระดาษ */}
      {t >= 0 ? <Sparkles t={t} k={k} /> : null}
      {t >= 0 ? <Confetti t={t} colors={theme.confetti} /> : null}

      {/* แคปรีวิวเด้งแปะทีละใบ + เสียงคลิก */}
      {reviews.map((u, i) => {
        const from = R + Math.round((0.35 + i * 0.75) * fps);
        return (
          <React.Fragment key={'rv' + i}>
            <ReviewPop src={u} from={from} i={i} />
            <Sequence from={from} durationInFrames={10}><Audio src={staticFile('sfx/click.mp3')} volume={0.9} /></Sequence>
          </React.Fragment>
        );
      })}

      {/* หัวข้อเปิด */}
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 200, opacity: hookO }}>
        <div style={{ fontWeight: 800, fontSize: 112, lineHeight: 1.12, color: YELLOW, textAlign: 'center', whiteSpace: 'pre-line',
          transform: `scale(${hook.scale * (frame < B ? 1 + 0.03 * Math.sin(frame * 0.8) : 1)})`, opacity: hook.opacity, ...outline(14) }}>{hookText}</div>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />

      {/* เสียงเอฟเฟกต์ */}
      <Sequence from={0} durationInFrames={Math.max(1, B)}><Audio src={staticFile('sfx/shake.mp3')} volume={(f) => interpolate(f, [0, B], [0.35, 0.8], clamp)} /></Sequence>
      <Sequence from={Math.max(0, B - 1)} durationInFrames={Math.round(1.4 * fps)}><Audio src={staticFile('sfx/boom.mp3')} volume={0.75} /></Sequence>
      <Sequence from={B + 6} durationInFrames={Math.round(1.1 * fps)}><Audio src={staticFile('sfx/sparkle.mp3')} volume={0.55} /></Sequence>
    </AbsoluteFill>
  );
};

const BoxBody: React.FC<{ theme: Theme }> = ({ theme }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 10, overflow: 'hidden',
    background: `linear-gradient(100deg, ${theme.box} 0%, ${theme.box} 55%, ${theme.boxDark} 100%)`, boxShadow: 'inset 0 -30px 60px rgba(0,0,0,0.25)' }}>
    <div style={{ position: 'absolute', left: BOX_W / 2 - 42, top: 0, width: 84, height: '100%', background: theme.ribbon, boxShadow: '0 0 12px rgba(0,0,0,0.2)' }} />
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.18), transparent 40%)' }} />
  </div>
);

const Lid: React.FC<{ theme: Theme }> = ({ theme }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden',
    background: `linear-gradient(100deg, ${theme.box} 0%, ${theme.box} 55%, ${theme.boxDark} 100%)`, boxShadow: '0 14px 26px rgba(0,0,0,0.35)' }}>
    <div style={{ position: 'absolute', left: LID_W / 2 - 46, top: 0, width: 92, height: '100%', background: theme.ribbon }} />
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent 55%)' }} />
  </div>
);

const Bow: React.FC<{ color: string }> = ({ color }) => (
  <svg width={300} height={170} viewBox="0 0 300 170">
    <defs>
      <linearGradient id="bw" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity={0.8} /></linearGradient>
    </defs>
    <path d="M150 130 C 60 10, -10 60, 40 120 C 70 150, 120 140, 150 130 Z" fill="url(#bw)" stroke="rgba(0,0,0,0.15)" strokeWidth={3} />
    <path d="M150 130 C 240 10, 310 60, 260 120 C 230 150, 180 140, 150 130 Z" fill="url(#bw)" stroke="rgba(0,0,0,0.15)" strokeWidth={3} />
    <path d="M140 132 L 95 170 L 120 170 L 150 140 Z M160 132 L 205 170 L 180 170 L 150 140 Z" fill={color} />
    <ellipse cx={150} cy={130} rx={26} ry={22} fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth={3} />
  </svg>
);

/** ฝาข้างที่อ้าออก */
const Flap: React.FC<{ side: -1 | 1; k: number; theme: Theme }> = ({ side, k, theme }) => (
  <div style={{
    position: 'absolute', top: -150, left: side === -1 ? 0 : BOX_W / 2, width: BOX_W / 2, height: 150,
    transformOrigin: side === -1 ? '0% 100%' : '100% 100%', transform: `rotate(${side * k * 62}deg)`,
    background: `linear-gradient(${side === -1 ? 90 : 270}deg, ${theme.boxDark}, ${theme.box})`, borderRadius: 6,
    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)', opacity: k > 0 ? 1 : 0,
  }}>
    <div style={{ position: 'absolute', left: side === -1 ? BOX_W / 2 - 42 : 0, width: 42, height: '100%', background: theme.ribbon, opacity: 0.9 }} />
  </div>
);

const Baubles: React.FC<{ theme: Theme; t: number }> = ({ theme, t }) => {
  const { fps } = useVideoConfig();
  const items = [
    { x: 120, len: 330, r: 46 }, { x: 300, len: 200, r: 36 }, { x: 790, len: 260, r: 40 }, { x: 960, len: 380, r: 50 },
  ];
  return (
    <>
      {items.map((b, i) => {
        const drop = spring({ frame: t - 4 - i * 2, fps, config: { damping: 8, stiffness: 90 } });
        const sway = Math.sin((t / fps) * 2 * Math.PI * 0.55 + i) * 7 * (0.4 + 0.6 * drop);
        const c = theme.baubles[i % theme.baubles.length];
        return (
          <div key={i} style={{ position: 'absolute', left: b.x, top: -b.len * (1 - drop), transformOrigin: '0 0', transform: `rotate(${sway}deg)` }}>
            <div style={{ position: 'absolute', left: -1, top: 0, width: 2, height: b.len, background: 'rgba(255,255,255,0.7)' }} />
            <div style={{ position: 'absolute', left: -9, top: b.len - 6, width: 18, height: 14, borderRadius: 3, background: '#C9A44C' }} />
            <div style={{ position: 'absolute', left: -b.r, top: b.len + 4, width: b.r * 2, height: b.r * 2, borderRadius: '50%',
              background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.95) 0%, ${c} 22%, ${c} 55%, rgba(0,0,0,0.55) 100%)`,
              boxShadow: '0 12px 24px rgba(0,0,0,0.3)' }} />
          </div>
        );
      })}
    </>
  );
};

const Sparkles: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 110 + random('sx' + i) * 860;
        const y = 300 + random('sy' + i) * 1000 - k * 250;
        const ph = random('sp' + i) * 6.28;
        const s = Math.max(0, Math.sin((t / fps) * 4 + ph)) * interpolate(t, [4, 12], [0, 1], clamp);
        const size = 26 + random('ss' + i) * 34;
        return (
          <svg key={i} width={size} height={size} viewBox="-10 -10 20 20" style={{ position: 'absolute', left: x, top: y, transform: `scale(${s}) rotate(${t * 2}deg)`, opacity: s }}>
            <path d="M0 -10 Q1.2 -1.2 10 0 Q1.2 1.2 0 10 Q-1.2 1.2 -10 0 Q-1.2 -1.2 0 -10 Z" fill="#FFFBE6" />
          </svg>
        );
      })}
    </>
  );
};

/** พลุกระดาษ: พุ่งออกจากกล่องตอนระเบิด แล้วร่วงช้า ๆ */
const Confetti: React.FC<{ t: number; colors: string[] }> = ({ t, colors }) => {
  return (
    <>
      {Array.from({ length: 90 }).map((_, i) => {
        const vx = (random('cx' + i) - 0.5) * 40;
        const vy = -22 - random('cy' + i) * 34;
        const tt = Math.max(0, t - random('cd' + i) * 3);
        const drag = 0.94;
        const d = (1 - Math.pow(drag, tt)) / (1 - drag);
        const x = 540 + vx * d + Math.sin(tt * 0.15 + i) * 18;
        const y = 1330 + vy * d + 0.55 * tt * tt * 0.12 + tt * 2.2;
        if (y > 2000) return null;
        const w = 12 + random('cw' + i) * 10, h = w * (1.4 + random('ch' + i));
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: colors[i % colors.length], borderRadius: 2,
            transform: `rotate(${tt * (6 + random('cr' + i) * 12)}deg) scaleY(${Math.cos(tt * 0.3 + i)})`, opacity: 0.95 }} />
        );
      })}
    </>
  );
};

const ReviewPop: React.FC<{ src: string; from: number; i: number }> = ({ src, from, i }) => {
  const p = usePop(from, 0.4);
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const rot = [-5, 4, -2][i], x = [200, 260, 230][i], y = [790, 850, 910][i];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 620, transform: `rotate(${rot}deg) scale(${p.scale})`, opacity: p.opacity,
      background: '#fff', padding: 12, borderRadius: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
      <Img src={src} style={{ width: '100%', maxHeight: 560, objectFit: 'contain', borderRadius: 14, display: 'block' }} />
    </div>
  );
};
