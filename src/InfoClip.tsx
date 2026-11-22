// คลิปข้อมูล: ความรู้/ทิป · โปรโมตร้าน · ประชาสัมพันธ์องค์กร (ประกาศ / สรุปกิจกรรม)
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption, CaptionStyle, FONT, StyledCaptions, outline, usePop } from './common';

export type InfoSlide = { start: number; kind: 'card' | 'photo'; url?: string; title?: string; body?: string; emoji?: string; n?: number };
export type InfoProps = {
  durationSec: number;
  audioUrl?: string;
  captions: Caption[];
  captionStyle?: CaptionStyle;
  accent?: string;        // สีแบรนด์/องค์กร
  music?: string;
  musicVolume?: number;
  slides: InfoSlide[];
  endStart: number;
  endTitle?: string;      // ชื่อร้าน/หน่วยงาน
  endLines?: string[];    // 📅 วันที่ · 📍 สถานที่ · ☎ ติดต่อ ...
  logoUrl?: string;
  formal?: boolean;       // โทนทางการ (ประชาสัมพันธ์)
  badge?: string;         // ป้ายมุม เช่น "ประชาสัมพันธ์" / "ทิปน่ารู้"
  total?: number;         // จำนวนข้อ (ทิป)
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const hex = (c?: string) => (/^#[0-9a-f]{6}$/i.test(c || '') ? (c as string) : '#1F4E79');
const ink = (c: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? '#0B0B0D' : '#FFFFFF';
};
const shade = (c: string, k: number) => '#' + [1, 3, 5].map((i) => Math.round(Math.min(255, Math.max(0, parseInt(c.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');

export const InfoClip: React.FC<InfoProps> = (p) => {
  const { fps } = useVideoConfig();
  const F = (s: number) => Math.round(s * fps);
  const endF = F(p.endStart);
  const col = hex(p.accent);
  return (
    <AbsoluteFill style={{ background: shade(col, 0.35), fontFamily: FONT }}>
      {p.slides.map((s, i) => {
        const from = F(s.start), to = i + 1 < p.slides.length ? F(p.slides[i + 1].start) : endF;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
            {s.kind === 'photo' ? <PhotoSlide s={s} col={col} formal={p.formal} len={to - from} /> : <CardSlide s={s} col={col} total={p.total} len={to - from} />}
          </Sequence>
        );
      })}
      {p.badge ? <Sequence from={0} durationInFrames={endF}><Badge text={p.badge} col={col} formal={p.formal} /></Sequence> : null}
      {p.logoUrl ? (
        <Sequence from={0} durationInFrames={endF}>
          <AbsoluteFill style={{ alignItems: 'flex-end', padding: '140px 46px 0 0' }}>
            <Img src={p.logoUrl} style={{ width: 130, height: 130, objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.4))' }} />
          </AbsoluteFill>
        </Sequence>
      ) : null}
      <Sequence from={0} durationInFrames={endF}><StyledCaptions captions={p.captions} style={p.captionStyle} accent={col} bottom={230} /></Sequence>
      <Sequence from={endF}><EndCard p={p} col={col} /></Sequence>
      {p.audioUrl ? <Audio src={p.audioUrl} /> : null}
      {p.music ? <Audio src={staticFile(`music/${p.music}.mp3`)} volume={p.musicVolume ?? 0.08} loop /> : null}
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ text: string; col: string; formal?: boolean }> = ({ text, col, formal }) => {
  const p = usePop(4, 0.6);
  return (
    <div style={{ position: 'absolute', left: 50, top: 150, transform: `scale(${p.scale})`, transformOrigin: '0 50%', opacity: p.opacity,
      background: formal ? '#FFFFFF' : col, color: formal ? shade(col, 0.8) : ink(col), fontWeight: 800, fontSize: 40, padding: '10px 26px',
      borderRadius: formal ? 8 : 999, borderLeft: formal ? `14px solid ${col}` : 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>{text}</div>
  );
};

/** การ์ดข้อความ (ทิป / ข้อมูลสำคัญ) */
const CardSlide: React.FC<{ s: InfoSlide; col: string; total?: number; len: number }> = ({ s, col, total, len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame, fps, config: { damping: 15, stiffness: 110 } });
  const bodyIn = interpolate(frame, [10, 22], [0, 1], clamp);
  const drift = interpolate(frame, [0, Math.max(1, len)], [0, -30], clamp);
  return (
    <AbsoluteFill>
      {s.url ? (
        <AbsoluteFill><Img src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px) brightness(0.42)', transform: `scale(1.1) translateY(${drift}px)` }} /></AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 20%, ${shade(col, 1.25)} 0%, ${col} 35%, ${shade(col, 0.45)} 100%)` }}>
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} style={{ position: 'absolute', left: (k * 260 + 80) % 1080, top: 300 + ((k * 397) % 1300) + drift * (k % 2 ? 1 : -1), width: 180 + k * 40, height: 180 + k * 40,
              borderRadius: '50%', border: '6px solid rgba(255,255,255,0.08)' }} />
          ))}
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 70px', gap: 34, transform: `translateY(${(1 - inn) * 120}px)`, opacity: inn }}>
        {s.n && total ? <div style={{ fontWeight: 800, fontSize: 54, color: '#FFD23F', ...outline(8) }}>ข้อ {s.n}/{total}</div> : null}
        {s.emoji ? <div style={{ fontSize: 170, lineHeight: 1, transform: `scale(${0.6 + inn * 0.4}) rotate(${(1 - inn) * -20}deg)` }}>{s.emoji}</div> : null}
        {s.title ? <div style={{ fontWeight: 800, fontSize: 88, lineHeight: 1.15, color: '#FFFFFF', textAlign: 'center', whiteSpace: 'pre-line', ...outline(10) }}>{s.title}</div> : null}
        {s.body ? (
          <div style={{ fontWeight: 600, fontSize: 54, lineHeight: 1.4, color: '#0B0B0D', background: 'rgba(255,255,255,0.94)', padding: '22px 36px', borderRadius: 28,
            textAlign: 'center', opacity: bodyIn, transform: `scale(${0.9 + bodyIn * 0.1})`, boxShadow: `0 0 0 8px ${col}, 0 18px 40px rgba(0,0,0,0.35)` }}>{s.body}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** รูปจริงเต็มจอ + แถบชื่อด้านล่าง (สไตล์ข่าว) */
const PhotoSlide: React.FC<{ s: InfoSlide; col: string; formal?: boolean; len: number }> = ({ s, col, formal, len }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 8], [0, 1], clamp);
  const zoom = interpolate(frame, [0, Math.max(1, len)], [1.02, 1.12], clamp);
  const bar = interpolate(frame, [6, 18], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade, background: '#000' }}>
      {s.url ? (
        <>
          <AbsoluteFill><Img src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(30px) brightness(0.5)', transform: 'scale(1.2)' }} /></AbsoluteFill>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Img src={s.url} style={{ width: '100%', maxHeight: 1500, objectFit: 'contain', transform: `scale(${zoom})` }} />
          </AbsoluteFill>
        </>
      ) : null}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.65) 100%)' }} />
      {s.title ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1280, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 50,
          transform: `translateX(${(1 - bar) * -1100}px)` }}>
          <div style={{ background: col, color: ink(col), fontWeight: 800, fontSize: formal ? 56 : 62, padding: '12px 30px', borderRadius: formal ? 4 : 18, maxWidth: 960,
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>{s.emoji ? `${s.emoji} ` : ''}{s.title}</div>
          {s.body ? <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.95)', color: '#0B0B0D', fontWeight: 600, fontSize: 40, padding: '8px 24px', borderRadius: formal ? 4 : 14, maxWidth: 960 }}>{s.body}</div> : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ p: InfoProps; col: string }> = ({ p, col }) => {
  const t = usePop(0, 0.7);
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${shade(col, 0.55)} 0%, ${shade(col, 0.25)} 100%)`, alignItems: 'center', justifyContent: 'center', gap: 34, padding: '0 70px' }}>
      {p.logoUrl ? <Img src={p.logoUrl} style={{ width: 300, height: 300, objectFit: 'contain', transform: `scale(${t.scale})`, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.4))' }} /> : null}
      {p.endTitle ? <div style={{ fontWeight: 800, fontSize: 86, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.15, transform: `scale(${t.scale})`, opacity: t.opacity, ...outline(8) }}>{p.endTitle}</div> : null}
      {(p.endLines || []).map((l, i) => {
        const k = interpolate(frame, [8 + i * 5, 18 + i * 5], [0, 1], clamp);
        return <div key={i} style={{ fontWeight: 700, fontSize: 50, color: '#0B0B0D', background: '#FFFFFF', borderRadius: p.formal ? 8 : 999, padding: '12px 32px',
          opacity: k, transform: `translateY(${(1 - k) * 40}px)`, textAlign: 'center', maxWidth: 960 }}>{l}</div>;
      })}
    </AbsoluteFill>
  );
};
