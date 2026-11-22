// คลิปโชว์สินค้าหลายรูป / จัดอันดับ Top N — สไลด์ตามจังหวะเสียงพากย์ 3 เทมเพลต
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { Caption, CaptionStyle, FONT, PriceChip, StyledCaptions, outline, usePop } from './common';

export type Slide = { url: string; w?: number; h?: number; start: number; end: number; title?: string; price?: string; rank?: number; intro?: boolean };
export type ShowProps = {
  durationSec: number;
  audioUrl?: string;
  captions: Caption[];
  captionStyle?: CaptionStyle;
  accent?: string;
  music?: string;
  musicVolume?: number;
  mode: 'show' | 'top';
  template: 'kenburns' | 'flash' | 'cards';
  slides: Slide[];
  highlights?: { text: string; start: number }[];
  hookText?: string;
  price?: string;
  cta?: string;
  endStart: number;      // วินาทีที่เริ่มฉากจบ
  logoUrl?: string;
  topN?: number;
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const BOX = { x: 60, y: 400, w: 960, h: 1080 };

export const ShowClip: React.FC<ShowProps> = (p) => {
  const { fps } = useVideoConfig();
  const F = (s: number) => Math.round(s * fps);
  const endF = F(p.endStart);
  return (
    <AbsoluteFill style={{ background: '#0B0C0F', fontFamily: FONT }}>
      {p.slides.map((s, i) => {
        const from = F(s.start), to = i === p.slides.length - 1 ? endF : F(p.slides[i + 1].start);
        return (
          <Sequence key={i} from={Math.max(0, from - (p.template === 'kenburns' ? 8 : 0))} durationInFrames={Math.max(1, to - from + (p.template === 'kenburns' ? 8 : 0) + (p.template === 'cards' ? 10 : 0))}>
            <SlideView s={s} i={i} p={p} lead={p.template === 'kenburns' ? 8 : 0} len={to - from} />
          </Sequence>
        );
      })}
      {p.logoUrl ? (
        <AbsoluteFill style={{ alignItems: 'flex-end', padding: '150px 50px 0 0' }}>
          <Img src={p.logoUrl} style={{ width: 140, height: 140, objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.4))' }} />
        </AbsoluteFill>
      ) : null}
      {p.hookText ? <Sequence from={0} durationInFrames={F(2.8)}><Hook text={p.hookText} /></Sequence> : null}
      {(p.highlights || []).map((h, i) => (
        <Sequence key={'h' + i} from={F(h.start)} durationInFrames={Math.max(1, Math.min(F(2.6), endF - F(h.start)))}><Callout text={h.text} i={i} accent={p.accent} /></Sequence>
      ))}
      {p.mode === 'show' && p.price ? (
        <Sequence from={F(3)} durationInFrames={Math.max(1, endF - F(3))}>
          <AbsoluteFill style={{ alignItems: 'flex-start', padding: '170px 0 0 64px' }}><PriceChip text={p.price} size={72} /></AbsoluteFill>
        </Sequence>
      ) : null}
      <Sequence from={0} durationInFrames={endF}><StyledCaptions captions={p.captions} style={p.captionStyle} accent={p.accent} bottom={250} /></Sequence>
      <Sequence from={endF}><Outro p={p} /></Sequence>
      {p.audioUrl ? <Audio src={p.audioUrl} /> : null}
      {p.music ? <Audio src={staticFile(`music/${p.music}.mp3`)} volume={p.musicVolume ?? 0.12} loop /> : null}
      {p.slides.map((s, i) => (p.template !== 'kenburns' && i > 0 ? (
        <Sequence key={'w' + i} from={F(s.start)} durationInFrames={12}><Audio src={staticFile('sfx/click.mp3')} volume={0.45} /></Sequence>
      ) : null))}
    </AbsoluteFill>
  );
};

/** พื้นหลังเบลอจากรูปเดียวกัน + รูปจริงวางในกรอบ */
const SlideView: React.FC<{ s: Slide; i: number; p: ShowProps; lead: number; len: number }> = ({ s, i, p, lead, len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - lead;
  let op = 1, sc = 1, x = 0, rot = 0, flash = 0;
  if (p.template === 'kenburns') {
    op = interpolate(frame, [0, lead], [0, 1], clamp);
    sc = interpolate(t, [0, Math.max(1, len)], [1.0, 1.09], clamp);
    x = interpolate(t, [0, Math.max(1, len)], [i % 2 ? -18 : 18, i % 2 ? 18 : -18], clamp);
  } else if (p.template === 'flash') {
    sc = interpolate(t, [0, 6], [1.22, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) * interpolate(t, [6, Math.max(7, len)], [1, 1.05], clamp);
    rot = interpolate(t, [0, 6], [i % 2 ? -4 : 4, 0], clamp);
    flash = interpolate(t, [0, 5], [0.9, 0], clamp);
  } else {
    const inn = spring({ frame: t, fps, config: { damping: 14, stiffness: 120 } });
    const out = interpolate(t, [len, len + 10], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
    x = interpolate(inn, [0, 1], [1100, 0]) - out * 1200;
    rot = interpolate(inn, [0, 1], [12, i % 2 ? -2.5 : 2.5]) - out * 14;
  }
  const ratio = (s.w && s.h) ? s.w / s.h : 0.8;
  let w = BOX.w, h = w / ratio;
  if (h > BOX.h) { h = BOX.h; w = h * ratio; }
  const card = p.template === 'cards';
  const rankPop = usePop(lead + 4, 0.3);
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <AbsoluteFill>
        <Img src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(42px) brightness(0.5) saturate(1.2)', transform: 'scale(1.2)' }} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 540 - w / 2 + x, top: BOX.y + (BOX.h - h) / 2, width: w, height: h,
        transform: `scale(${sc}) rotate(${rot}deg)`, borderRadius: card ? 18 : 36, overflow: 'hidden',
        border: card ? '18px solid #FFFFFF' : 'none', boxShadow: '0 30px 70px rgba(0,0,0,0.5)', background: card ? '#fff' : 'transparent' }}>
        <Img src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {flash ? <AbsoluteFill style={{ background: '#FFFFFF', opacity: flash }} /> : null}
      {s.rank ? (
        <div style={{ position: 'absolute', left: 50, top: 300, transform: `scale(${rankPop.scale}) rotate(-8deg)`, opacity: rankPop.opacity,
          fontWeight: 800, fontSize: 190, lineHeight: 1, color: s.rank === 1 ? '#FFD23F' : '#FFFFFF', ...outline(16) }}>#{s.rank}</div>
      ) : null}
      {s.intro ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${rankPop.scale}) rotate(-6deg)`, opacity: rankPop.opacity, fontWeight: 800, fontSize: 170, color: '#FFD23F', textAlign: 'center', lineHeight: 1.05, whiteSpace: 'pre-line', ...outline(18) }}>
            TOP {p.topN || ''}{'\n'}<span style={{ fontSize: 90, color: '#fff' }}>จัดอันดับ</span></div>
        </AbsoluteFill>
      ) : null}
      {s.title || s.price ? (
        <div style={{ position: 'absolute', left: 60, right: 60, top: BOX.y + BOX.h + 10, display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
          opacity: rankPop.opacity, transform: `translateY(${(1 - rankPop.opacity) * 30}px)` }}>
          {s.title ? <span style={{ fontWeight: 800, fontSize: 60, color: '#fff', ...outline(9) }}>{s.title}</span> : null}
          {s.price ? <PriceChip text={s.price} size={58} rotate={-4} from={lead + 8} /> : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Hook: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const p = usePop(2, 0.5);
  const out = interpolate(frame, [74, 84], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 120 }}>
      <div style={{ fontWeight: 800, fontSize: 84, lineHeight: 1.08, color: '#FFD23F', textAlign: 'center', whiteSpace: 'pre-line', padding: '0 50px',
        transform: `scale(${p.scale})`, opacity: p.opacity * out, ...outline(13) }}>{text}</div>
    </AbsoluteFill>
  );
};

/** ป้ายจุดเด่นเด้งขึ้นทีละอัน */
const Callout: React.FC<{ text: string; i: number; accent?: string }> = ({ text, i, accent = '#C8F94A' }) => {
  const frame = useCurrentFrame();
  const p = usePop(0, 0.4);
  const out = interpolate(frame, [64, 76], [1, 0], clamp);
  const left = i % 2 === 0;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 1180 - (i % 3) * 150, [left ? 'left' : 'right']: 40, maxWidth: 640,
        transform: `scale(${p.scale}) rotate(${left ? -4 : 4}deg)`, transformOrigin: left ? '0 50%' : '100% 50%', opacity: p.opacity * out,
        background: '#FFFFFF', color: '#0B0B0D', fontWeight: 800, fontSize: 54, padding: '14px 30px', borderRadius: 999,
        boxShadow: `0 0 0 8px ${accent}, 0 16px 36px rgba(0,0,0,0.4)` }}>✓ {text}</div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ p: ShowProps }> = ({ p }) => {
  const t = usePop(0, 0.7);
  const last = p.mode === 'top' ? p.slides.find((s) => s.rank === 1) || p.slides.at(-1) : p.slides[0];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 44 }}>
      {last ? (
        <AbsoluteFill><Img src={last.url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(36px) brightness(0.45)', transform: 'scale(1.2)' }} /></AbsoluteFill>
      ) : null}
      {last ? <Img src={last.url} style={{ width: 560, height: 560, objectFit: 'cover', borderRadius: 40, boxShadow: '0 30px 60px rgba(0,0,0,0.5)', transform: `scale(${t.scale})` }} /> : null}
      <div style={{ fontWeight: 800, fontSize: 96, color: '#fff', textAlign: 'center', whiteSpace: 'pre-line', transform: `scale(${t.scale})`, opacity: t.opacity, ...outline(10) }}>{p.cta || 'กดตะกร้าได้เลย 👇'}</div>
      {p.price ? <PriceChip text={last?.price || p.price} size={110} rotate={-5} from={8} startScale={1.7} /> : last?.price ? <PriceChip text={last.price} size={110} rotate={-5} from={8} startScale={1.7} /> : null}
    </AbsoluteFill>
  );
};
