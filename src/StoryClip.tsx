import React from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Caption, Captions, FONT, PriceChip, YELLOW, outline, usePop } from './common';
import type { Theme } from './GiftIntro';

export type StoryShot = {
  url: string;            // วิดีโอช็อต (หรือรูป ถ้าสร้างวิดีโอไม่สำเร็จ)
  kind: 'video' | 'image';
  start: number;          // วินาทีที่เริ่ม
  dur: number;            // ความยาวในคลิป
  rate?: number;          // ความเร็ววิดีโอ (ยืดให้พอดีเสียงพากย์)
  onscreen?: string;      // ข้อความบนจอของช็อตนี้
};

export type StoryProps = {
  durationSec: number;
  audioUrl: string;
  captions: Caption[];
  shots: StoryShot[];
  endStart: number;       // วินาทีที่เริ่มฉากจบ (สินค้าจริง + ราคา)
  endImage: string;       // รูปสินค้าจริง (ตัดพื้นหลังแล้ว ถ้าได้)
  endCut: boolean;
  theme?: Theme;
  price: string;
  cta: string;
  title?: string;
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const ShotView: React.FC<{ s: StoryShot; durF: number }> = ({ s, durF }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 6], [0, 1], clamp);
  const zoom = interpolate(frame, [0, durF], [1.0, 1.06], clamp);
  return (
    <AbsoluteFill style={{ background: '#000', opacity: fade }}>
      {s.kind === 'video' ? (
        <OffthreadVideo src={s.url} playbackRate={s.rate || 1} volume={0.28}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />
      ) : (
        <Img src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + (zoom - 1) * 2})` }} />
      )}
      {/* ไล่เงาบน-ล่าง ให้ตัวหนังสืออ่านง่าย */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%)' }} />
      {s.onscreen ? <OnScreen text={s.onscreen} /> : null}
    </AbsoluteFill>
  );
};

const OnScreen: React.FC<{ text: string }> = ({ text }) => {
  const p = usePop(4, 0.7);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 210, paddingLeft: 60, paddingRight: 60 }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 84, lineHeight: 1.15, color: YELLOW, textAlign: 'center',
        whiteSpace: 'pre-line', transform: `scale(${p.scale})`, opacity: p.opacity, ...outline(12) }}>{text}</div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ p: StoryProps; durF: number }> = ({ p, durF }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg = p.theme ? `radial-gradient(circle at 50% 50%, ${p.theme.bg[0]} 0%, ${p.theme.bg[1]} 100%)` : 'radial-gradient(circle, #2A3F6B, #0C1428)';
  const s = interpolate(frame, [0, durF], [0.92, 1.04], clamp);
  const o = interpolate(frame, [0, 8], [0, 1], clamp);
  const cta = usePop(Math.round(0.9 * fps), 0.7);
  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONT }}>
      <AbsoluteFill style={{ opacity: 0.5, background: 'repeating-conic-gradient(from 0deg at 50% 52%, rgba(255,255,255,0.35) 0deg 6deg, rgba(255,255,255,0) 6deg 20deg)', transform: `rotate(${frame * 0.3}deg) scale(2)` }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 120 }}>
        {p.endCut ? (
          <Img src={p.endImage} style={{ width: 900, height: 980, objectFit: 'contain', transform: `scale(${s})`, opacity: o,
            filter: 'drop-shadow(0 40px 50px rgba(0,0,0,0.45))' }} />
        ) : (
          <div style={{ background: '#fff', padding: 22, borderRadius: 32, transform: `scale(${s}) rotate(-3deg)`, opacity: o, boxShadow: '0 40px 80px rgba(0,0,0,0.45)' }}>
            <Img src={p.endImage} style={{ width: 760, height: 900, objectFit: 'cover', borderRadius: 18, display: 'block' }} />
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 190 }}>
        <PriceChip text={p.price} size={140} rotate={-6} from={Math.round(0.4 * fps)} startScale={1.8} />
        <div style={{ marginTop: 26, fontWeight: 700, fontSize: 70, color: '#fff', opacity: cta.opacity, transform: `scale(${cta.scale})`, ...outline(9) }}>{p.cta}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const StoryClip: React.FC<StoryProps> = (p) => {
  const { fps, durationInFrames } = useVideoConfig();
  const endF = Math.round(p.endStart * fps);
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: FONT }}>
      {p.shots.map((s, i) => {
        const from = Math.round(s.start * fps);
        const durF = Math.max(1, Math.min(Math.round(s.dur * fps), endF - from));
        return (
          <Sequence key={i} from={from} durationInFrames={durF}>
            <ShotView s={s} durF={durF} />
          </Sequence>
        );
      })}
      <Sequence from={endF} durationInFrames={Math.max(1, durationInFrames - endF)}>
        <EndCard p={p} durF={durationInFrames - endF} />
      </Sequence>
      <Sequence from={Math.max(0, endF - 1)} durationInFrames={Math.round(1.1 * fps)}><Audio src={staticFile('sfx/sparkle.mp3')} volume={0.5} /></Sequence>
      <Captions captions={p.captions} bottom={330} />
      {p.audioUrl ? <Audio src={p.audioUrl} /> : null}
    </AbsoluteFill>
  );
};
