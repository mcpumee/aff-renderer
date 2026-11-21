// ภาชนะลุ้นของแบบต่างๆ (ใช้แทนกล่องของขวัญในฉากเปิด) — ทุกแบบ "ระเบิด/เปิด" ที่เฟรม B
import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, Easing } from 'remotion';
import type { Theme } from './GiftIntro';

export type RevealKind = 'gift' | 'mystery' | 'egg' | 'gacha' | 'chest' | 'scratch' | 'wheel';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = Easing.out(Easing.cubic);

type P = { kind: RevealKind; frame: number; B: number; theme: Theme; boxAway: number; variant?: string };

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

// ---------- ไข่ปริศนา: 4 แบบ ----------
// crack = ไข่ร้าวเอง · smash = ค้อนทุบ 3 ที · hen = ไก่ออกไข่ร่วงลงมาแตก · dino = ไดโนเสาร์เหยียบ
const EGG_W = 470, EGG_H = 600, EGG_TOP = 1020;
const EggShell: React.FC<{ half: 'top' | 'bottom' | 'whole' }> = ({ half }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: '50% 50% 47% 47% / 58% 58% 42% 42%',
    background: 'radial-gradient(circle at 35% 28%, #FFF7D1 0%, #F4C84A 30%, #C98A12 75%, #7A4E00 100%)',
    clipPath: half === 'whole' ? undefined : half === 'top' ? 'polygon(0 0,100% 0,100% 46%,88% 52%,76% 44%,63% 53%,50% 45%,37% 54%,24% 44%,12% 53%,0 46%)'
      : 'polygon(0 46%,12% 53%,24% 44%,37% 54%,50% 45%,63% 53%,76% 44%,88% 52%,100% 46%,100% 100%,0 100%)',
    boxShadow: 'inset -30px -40px 80px rgba(0,0,0,0.25)' }}>
    {[[0.3, 0.3, 40], [0.65, 0.22, 28], [0.55, 0.62, 36], [0.25, 0.7, 24], [0.78, 0.55, 30]].map(([x, y, r], i) => (
      <div key={i} style={{ position: 'absolute', left: x * EGG_W - r, top: y * EGG_H - r, width: r * 2, height: r * 2, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
    ))}
  </div>
);
const Crack: React.FC<{ k: number }> = ({ k }) => (
  <svg width={EGG_W} height={EGG_H} style={{ position: 'absolute', inset: 0, opacity: k > 0 ? 1 : 0 }}>
    <polyline points={`${EGG_W * 0.05},${EGG_H * 0.47} ${EGG_W * 0.2},${EGG_H * 0.42} ${EGG_W * 0.33},${EGG_H * 0.52} ${EGG_W * 0.5},${EGG_H * 0.44} ${EGG_W * 0.62},${EGG_H * 0.53} ${EGG_W * 0.8},${EGG_H * 0.43} ${EGG_W * 0.95},${EGG_H * 0.49}`}
      fill="none" stroke="#3B2500" strokeWidth={7} strokeLinejoin="round" strokeDasharray={1200} strokeDashoffset={1200 * (1 - k)} />
    {k > 0.5 ? <polyline points={`${EGG_W * 0.5},${EGG_H * 0.44} ${EGG_W * 0.46},${EGG_H * 0.33} ${EGG_W * 0.53},${EGG_H * 0.24}`} fill="none" stroke="#3B2500" strokeWidth={6} /> : null}
  </svg>
);
const Pow: React.FC<{ text: string; at: number; frame: number; x: number; y: number; color?: string }> = ({ text, at, frame, x, y, color = '#FFD23F' }) => {
  const t = frame - at;
  if (t < 0 || t > 22) return null;
  const sc = interpolate(t, [0, 4, 8], [0.3, 1.25, 1], clamp);
  return <div style={{ position: 'absolute', left: x - 300, top: y, width: 600, textAlign: 'center', fontSize: 130, fontWeight: 800, color,
    WebkitTextStroke: '10px #2B1B0A', paintOrder: 'stroke', transform: `scale(${sc}) rotate(-8deg)`, opacity: interpolate(t, [16, 22], [1, 0], clamp), fontFamily: 'Kanit, sans-serif' }}>{text}</div>;
};

const Egg: React.FC<P> = ({ frame, B, boxAway, variant = 'crack' }) => {
  const t = frame - B, cx = 540;
  const W = EGG_W, H = EGG_H;
  let y = EGG_TOP, rot = 0, x = 0, crack = 0, scale = 1;
  const parts: React.ReactNode[] = [];
  const side = variant === 'dino'; // เปลือกกระเด็นออกข้าง
  if (variant === 'smash') {
    const hits = [B - 24, B - 12, B].map((h) => Math.max(4, h));
    crack = hits.filter((h) => frame >= h).length / 3;
    const near = hits.find((h) => frame >= h && frame < h + 5);
    if (near !== undefined && frame < B) { x = Math.sin((frame - near) * 3) * 10; scale = 1 - 0.04 * (1 - (frame - near) / 5); }
    // ค้อน: ยกขึ้น 70° → ฟาดลง 0° ที่จังหวะชน
    let ang = 70;
    for (const h of hits) {
      if (frame >= h - 8 && frame <= h) ang = interpolate(frame, [h - 8, h], [70, 0], { ...clamp, easing: Easing.in(Easing.quad) });
      else if (frame > h && frame < h + 6) ang = interpolate(frame, [h, h + 6], [0, 55], clamp);
    }
    if (frame < hits[0] - 8) ang = interpolate(frame, [0, hits[0] - 8], [110, 70], clamp);
    const away = interpolate(t, [4, 14], [0, 1], clamp);
    parts.push(
      <div key="hm" style={{ position: 'absolute', left: cx + 130, top: EGG_TOP + 70 + boxAway, width: 0, height: 0, transform: `translate(${away * 500}px, ${-away * 600}px)` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 470, height: 0, transformOrigin: '470px 0', transform: `rotate(${ang}deg)` }}>
          <div style={{ position: 'absolute', left: 60, top: -18, width: 420, height: 36, borderRadius: 18, background: 'linear-gradient(180deg,#C98A4B,#7A4A21)' }} />
          <div style={{ position: 'absolute', left: -30, top: -70, width: 130, height: 140, borderRadius: 18, background: 'linear-gradient(180deg,#E4E8EE,#8A93A0)', boxShadow: '0 10px 20px rgba(0,0,0,0.35)' }} />
        </div>
      </div>,
      ...hits.map((h, i) => <Pow key={'p' + i} text={['ป๊อก!', 'ป๊อก!!', 'แตก!!!'][i]} at={h} frame={frame} x={cx + 120} y={EGG_TOP - 260} />),
      ...hits.slice(0, 2).map((h, i) => <Sequence key={'s' + i} from={h} durationInFrames={8}><Audio src={staticFile('sfx/click.mp3')} volume={1} /></Sequence>),
    );
  } else if (variant === 'hen') {
    const lay = Math.round(B * 0.3), fall = Math.max(lay + 10, B - 13);
    const henY = 480 + Math.sin(frame * 0.5) * 8 - interpolate(t, [0, 16], [0, 1100], clamp);
    const squash = frame >= lay - 6 && frame < lay + 4 ? 1 + 0.12 * Math.sin(((frame - lay + 6) / 10) * Math.PI) : 1;
    const henBottom = henY + 230;
    if (frame < lay) { scale = 0; }
    else if (frame < fall) { scale = interpolate(frame, [lay, lay + 8], [0.35, 0.5], clamp); y = henBottom - 120; rot = Math.sin(frame * 0.6) * 4; }
    else if (frame < B) { const k = (frame - fall) / (B - fall); scale = 0.5 + 0.5 * k; y = interpolate(k * k, [0, 1], [henBottom - 120, EGG_TOP]); rot = k * 25; }
    crack = frame >= B ? 1 : 0;
    parts.push(
      <div key="hen" style={{ position: 'absolute', left: cx - 170, top: henY + boxAway, width: 340, height: 300, transform: `scale(${1 / squash}, ${squash})`, transformOrigin: '50% 100%' }}>
        <svg width={340} height={300} viewBox="0 0 340 300">
          <circle cx={120} cy={40} r={26} fill="#E63946" /><circle cx={150} cy={28} r={28} fill="#E63946" /><circle cx={180} cy={40} r={24} fill="#E63946" />
          <ellipse cx={170} cy={175} rx={150} ry={115} fill="#FFFFFF" stroke="#2B1B0A" strokeWidth={8} />
          <ellipse cx={150} cy={95} rx={70} ry={62} fill="#FFFFFF" stroke="#2B1B0A" strokeWidth={8} />
          <ellipse cx={230} cy={185} rx={60} ry={42} fill="#F1F1F1" stroke="#2B1B0A" strokeWidth={6} transform={`rotate(${Math.sin(frame * 0.8) * 12} 200 185)`} />
          <circle cx={128} cy={88} r={11} fill="#2B1B0A" /><circle cx={124} cy={84} r={4} fill="#fff" />
          <path d="M80 100 L 40 112 L 82 122 Z" fill="#F4A261" stroke="#2B1B0A" strokeWidth={5} />
          <ellipse cx={96} cy={132} rx={12} ry={20} fill="#E63946" />
        </svg>
      </div>,
      <Pow key="kk" text="กุ๊ก!" at={lay - 4} frame={frame} x={cx + 280} y={430} color="#FFFFFF" />,
      <Pow key="pk" text="แตก!" at={B} frame={frame} x={cx} y={EGG_TOP - 240} />,
    );
  } else if (variant === 'dino') {
    const down = B - 9;
    const footBottom = frame < down ? -200 : frame <= B ? interpolate(frame, [down, B], [-200, EGG_TOP + 300], { ...clamp, easing: Easing.in(Easing.quad) })
      : interpolate(t, [0, 8, 22], [EGG_TOP + 330, EGG_TOP + 330, -400], clamp);
    const shadow = interpolate(frame, [B - 30, B], [0.1, 0.75], clamp) * (t > 12 ? 0 : 1);
    const steps = [B - 34, B - 20].filter((f) => f > 2);
    const near = steps.find((f) => frame >= f && frame < f + 8);
    x = frame < B ? Math.sin(frame * 1.4) * interpolate(frame, [0, B], [2, 9], clamp) : 0; // ไข่สั่นกลัว
    if (near !== undefined) { y = EGG_TOP - Math.sin(((frame - near) / 8) * Math.PI) * 50; }
    crack = frame >= B ? 1 : 0;
    const quake = t >= 0 && t < 10 ? Math.sin(t * 4) * 18 * (1 - t / 10) : 0;
    parts.push(
      <div key="sh" style={{ position: 'absolute', left: cx - 330, top: EGG_TOP + H - 60 + boxAway, width: 660, height: 120, borderRadius: '50%', background: `radial-gradient(ellipse, rgba(0,0,0,${shadow}), transparent 70%)` }} />,
      <div key="ft" style={{ position: 'absolute', left: cx - 300 + quake, top: footBottom - 1300 + boxAway, width: 600, height: 1300 }}>
        <svg width={600} height={1300} viewBox="0 0 600 1300">
          <rect x={150} y={0} width={300} height={1050} rx={60} fill="#3E9E4F" stroke="#1C4D25" strokeWidth={10} />
          <ellipse cx={300} cy={1120} rx={280} ry={170} fill="#47B05A" stroke="#1C4D25" strokeWidth={10} />
          {[110, 300, 490].map((cx2) => <path key={cx2} d={`M${cx2 - 45} 1230 Q ${cx2} 1330 ${cx2 + 45} 1230 Z`} fill="#F1E9D2" stroke="#1C4D25" strokeWidth={8} />)}
          {[[220, 300], [360, 520], [250, 760]].map(([a, b2], i) => <circle key={i} cx={a} cy={b2} r={34} fill="#2F7D3C" />)}
        </svg>
      </div>,
      <Pow key="tg" text="ตึง!!" at={B} frame={frame} x={cx} y={EGG_TOP - 420} />,
      ...steps.map((f, i) => <Pow key={'st' + i} text="ตึง…" at={f} frame={frame} x={i ? cx + 250 : cx - 250} y={560} color="#FFFFFF" />),
      ...steps.map((f, i) => <Sequence key={'ss' + i} from={f} durationInFrames={20}><Audio src={staticFile('sfx/boom.mp3')} volume={0.3} /></Sequence>),
    );
  } else {
    const sh = shake(frame, B); x = sh.x; rot = sh.rot * 1.4;
    crack = interpolate(frame, [B * 0.45, B], [0, 1], clamp);
  }
  const fly = interpolate(t, [0, 18], [0, 1], { ...clamp, easing: easeOut });
  const drop = interpolate(t, [0, 12], [0, side ? 0 : 260], { ...clamp, easing: easeOut });
  const flat = side ? interpolate(t, [0, 3], [1, 0.25], clamp) : 1;
  const showEgg = scale > 0;
  return (
    <>
      <div style={{ position: 'absolute', left: cx - 300, top: EGG_TOP + H - 30 + boxAway, width: 600, height: 80, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.4), transparent 70%)', opacity: variant === 'hen' && frame < B ? 0.3 : 1 }} />
      {parts}
      {showEgg && t < 0 ? (
        <div style={{ position: 'absolute', left: cx - W / 2 + x, top: y + boxAway, width: W, height: H, transform: `rotate(${rot}deg) scale(${scale})`, transformOrigin: '50% 90%' }}>
          <EggShell half="whole" /><Crack k={crack} />
        </div>
      ) : null}
      {t >= 0 ? (
        <>
          <div style={{ position: 'absolute', left: cx - W / 2 - (side ? fly * 520 : 0), top: EGG_TOP + drop + boxAway + (side ? fly * 300 : 0), width: W, height: H,
            transform: `rotate(${side ? -fly * 80 : 0}deg) scaleY(${side ? 1 : flat})`, transformOrigin: '50% 100%', opacity: side ? interpolate(t, [10, 20], [1, 0], clamp) : 1 }}><EggShell half="bottom" /></div>
          {t < 24 ? (
            <div style={{ position: 'absolute', left: cx - W / 2 + (side ? fly * 520 : -fly * 260), top: EGG_TOP - fly * (side ? 200 : 1100) + boxAway, width: W, height: H,
              transform: `rotate(${side ? fly * 90 : -fly * 70}deg)`, opacity: interpolate(t, [14, 24], [1, 0], clamp) }}><EggShell half="top" /></div>
          ) : null}
        </>
      ) : null}
      {variant === 'crack' ? <Sequence from={Math.round(B * 0.45)} durationInFrames={Math.max(1, Math.round(B * 0.55))}><Audio src={staticFile('sfx/shake.mp3')} volume={0.5} /></Sequence> : null}
    </>
  );
};

// ---------- กาชาปอง: แคปซูลกลม 2 สี → ฝาบนเด้งออก ----------
const Gacha: React.FC<P> = ({ frame, B, theme, boxAway, variant }) => {
  const s = shake(frame, B), t = frame - B;
  const D = 520, cx = 540, top = 1000;
  const machine = variant === 'machine';
  const out = Math.round(B * 0.45), land = Math.round(B * 0.75);
  let bounce = frame < B ? -Math.abs(Math.sin(frame * 0.35)) * 60 * (1 - s.p * 0.6) : 0;
  let cScale = 1;
  if (machine && frame < B) {
    // แคปซูลหล่นจากช่องเครื่อง แล้วกลิ้งมาตรงกลาง
    if (frame < out) cScale = 0;
    else if (frame < land) { const k = (frame - out) / (land - out); cScale = 0.3 + 0.7 * k; bounce = interpolate(k * k, [0, 1], [-260, 0]); }
    else bounce = -Math.abs(Math.sin((frame - land) * 0.5)) * 30;
  }
  const machineAway = interpolate(t, [0, 14], [0, 1], { ...clamp, easing: easeOut });
  const crank = machine ? interpolate(frame, [Math.round(B * 0.1), out], [0, 360], clamp) : 0;
  const rollX = machine && frame < B ? (frame < out ? -330 : interpolate(frame, [out, land], [-330, 0], { ...clamp, easing: easeOut })) : 0;
  const rollR = machine && frame < land ? rollX * 0.4 : 0;
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
      {machine ? (
        <div style={{ position: 'absolute', left: 40 - machineAway * 600, top: 520 + boxAway, width: 520, height: 760, transform: 'scale(0.62)', transformOrigin: '0 0' }}>
          <svg width={520} height={760} viewBox="0 0 520 760">
            <rect x={60} y={380} width={400} height={340} rx={30} fill={theme.box} stroke="#2B1B0A" strokeWidth={10} />
            <circle cx={260} cy={230} r={220} fill="rgba(220,240,255,0.55)" stroke="#2B1B0A" strokeWidth={10} />
            {[[170, 300, '#FF5C8A'], [260, 320, '#5CC8FF'], [350, 300, '#FFD23F'], [210, 230, '#C8F94A'], [310, 230, '#9B6BFF'], [260, 150, '#FF9F68'], [180, 160, '#5CC8FF'], [340, 160, '#FF5C8A']].map(([x2, y2, c], i) => (
              <circle key={i} cx={x2 as number} cy={y2 as number} r={42} fill={c as string} stroke="#2B1B0A" strokeWidth={5} />
            ))}
            <ellipse cx={200} cy={120} rx={60} ry={30} fill="rgba(255,255,255,0.6)" />
            <rect x={200} y={620} width={120} height={80} rx={14} fill="#2B1B0A" />
            <g transform={`rotate(${crank} 380 500)`}><circle cx={380} cy={500} r={54} fill="#FFFFFF" stroke="#2B1B0A" strokeWidth={8} /><rect x={370} y={452} width={20} height={96} rx={10} fill="#2B1B0A" /></g>
            <text x={160} y={520} fontSize={52} fontWeight={800} fill="#FFFFFF" fontFamily="Kanit, sans-serif">GACHA</text>
          </svg>
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: cx - D / 2 + s.x + rollX, top: top + bounce + drop + boxAway, width: D, height: D, transform: `rotate(${s.rot * 2 + rollR}deg) scale(${cScale})` }}>
        {half(false)}
        <div style={{ position: 'absolute', left: 0, top: D / 2 - 10, width: D, height: 20, background: theme.ribbon, opacity: t < 0 ? 1 : 0 }} />
      </div>
      {t < 22 ? (
        <div style={{ position: 'absolute', left: cx - D / 2 + s.x + fly * 220, top: top + bounce - fly * 1150, width: D, height: D,
          transform: `rotate(${s.rot * 2 + fly * 55}deg) scale(${cScale})`, opacity: interpolate(t, [12, 22], [1, 0], clamp) }}>{half(true)}</div>
      ) : null}
    </>
  );
};

// ---------- หีบสมบัติ: ฝาโค้งเปิดขึ้น + แสงทอง ----------
const Chest: React.FC<P> = ({ frame, B, boxAway, variant }) => {
  const s0 = shake(frame, B), t = frame - B;
  const keyV = variant === 'key';
  const s = keyV ? { ...s0, rot: frame > B - 8 ? s0.rot : 0, x: frame > B - 8 ? s0.x : 0 } : s0;
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
      {keyV && t < 6 ? (() => {
        const k1 = interpolate(frame, [Math.round(B * 0.15), Math.round(B * 0.6)], [0, 1], { ...clamp, easing: easeOut });
        const turn = interpolate(frame, [Math.round(B * 0.65), Math.round(B * 0.85)], [0, 90], clamp);
        const kx = interpolate(k1, [0, 1], [900, cx + 30]), ky = interpolate(k1, [0, 1], [500, top + 85]);
        return (
          <div style={{ position: 'absolute', left: kx, top: ky + boxAway, width: 0, height: 0, transform: `rotate(${-20 * (1 - k1)}deg)` }}>
            <div style={{ position: 'absolute', left: 0, top: -40, width: 330, height: 80, transformOrigin: '0 40px', transform: `rotate(${-turn}deg)` }}>
              <svg width={330} height={80} viewBox="0 0 330 80">
                <rect x={0} y={30} width={210} height={20} rx={8} fill="#E8B730" stroke="#7A4E00" strokeWidth={4} />
                <rect x={20} y={50} width={22} height={24} fill="#E8B730" stroke="#7A4E00" strokeWidth={4} /><rect x={55} y={50} width={16} height={18} fill="#E8B730" stroke="#7A4E00" strokeWidth={4} />
                <circle cx={265} cy={40} r={38} fill="#FFD23F" stroke="#7A4E00" strokeWidth={6} /><circle cx={265} cy={40} r={14} fill="#7A4E00" />
              </svg>
            </div>
          </div>
        );
      })() : null}
      {keyV ? <Sequence from={Math.round(B * 0.85)} durationInFrames={8}><Audio src={staticFile('sfx/click.mp3')} volume={1} /></Sequence> : null}
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
