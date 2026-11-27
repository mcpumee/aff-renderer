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
  endPhoto?: string;      // รูปสินค้าเต็ม (ไม่ตัดพื้นหลัง)
  endLayout?: 'blur' | 'full' | 'split' | 'card';
  theme?: Theme;
  price: string;
  cta: string;
  title?: string;
  music?: string;
  musicVolume?: number;
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

// ฉากจบแนะนำสินค้า: 4 แบบสลับกัน (ไม่ซ้ำเดิมทุกคลิป) · ใช้ภาพตัดพื้นหลังเฉพาะเมื่อตัดได้เนียนจริง
const EndCard: React.FC<{ p: StoryProps; durF: number }> = ({ p, durF }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = p.theme || { bg: ['#2A3F6B', '#0C1428'] };
  const s = interpolate(frame, [0, durF], [1, 1.07], clamp);
  const o = interpolate(frame, [0, 8], [0, 1], clamp);
  const rise = interpolate(frame, [0, 12], [60, 0], clamp);
  const cta = usePop(Math.round(0.9 * fps), 0.7);
  const layout = p.endLayout || 'blur';
  const photo = p.endPhoto || p.endImage;
  const priceCta = (top: number) => (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: top }}>
      {p.price ? <PriceChip text={p.price} size={130} rotate={-5} from={Math.round(0.4 * fps)} startScale={1.7} /> : null}
      <div style={{ marginTop: 24, fontWeight: 800, fontSize: 68, color: '#fff', textAlign: 'center', padding: '0 60px', opacity: cta.opacity, transform: `scale(${cta.scale})`, ...outline(9) }}>{p.cta}</div>
    </AbsoluteFill>
  );
  if (layout === 'full') {
    // ภาพสินค้าเต็มจอ ซูมช้า + ไล่เงาด้านล่าง
    return (
      <AbsoluteFill style={{ background: '#000', fontFamily: FONT }}>
        <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, opacity: o }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 100%)' }} />
        {priceCta(1240)}
      </AbsoluteFill>
    );
  }
  if (layout === 'split') {
    // ภาพสินค้ามุมโค้งด้านบน + ราคา/ปุ่มด้านล่างบนพื้นสีของสินค้า
    return (
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${t.bg[0]}, ${t.bg[1]})`, fontFamily: FONT }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 150, height: 1050, borderRadius: 48, overflow: 'hidden', opacity: o, transform: `translateY(${rise}px)`, boxShadow: '0 40px 80px rgba(0,0,0,0.45)' }}>
          <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})` }} />
        </div>
        {priceCta(1250)}
      </AbsoluteFill>
    );
  }
  if (layout === 'card') {
    // การ์ดรูปถ่ายเอียงเล็กน้อย บนพื้นภาพเดิมแบบเบลอ
    return (
      <AbsoluteFill style={{ background: '#000', fontFamily: FONT }}>
        <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.55) saturate(1.2)', transform: 'scale(1.25)' }} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 140 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 30, transform: `scale(${s * 0.97}) rotate(-3deg)`, opacity: o, boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <Img src={photo} style={{ width: 760, height: 900, objectFit: 'cover', borderRadius: 16, display: 'block' }} />
          </div>
        </AbsoluteFill>
        {priceCta(170)}
      </AbsoluteFill>
    );
  }
  // 'blur': พื้นเป็นภาพสินค้าเบลอ (สีกลมกลืนเอง) + สินค้าตัดพื้นหลังพร้อมเงาตกกระทบ (ถ้าตัดไม่เนียน ใช้รูปเต็มขอบมน)
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: FONT }}>
      <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(48px) brightness(0.6) saturate(1.15)', transform: 'scale(1.3)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 62%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0) 55%)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 260 }}>
        {p.endCut ? (
          <div style={{ position: 'relative', width: 880, height: 960, opacity: o, transform: `translateY(${rise}px) scale(${s})` }}>
            <div style={{ position: 'absolute', left: '18%', right: '18%', bottom: 10, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', filter: 'blur(26px)' }} />
            <Img src={p.endImage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.35))' }} />
          </div>
        ) : (
          <Img src={photo} style={{ width: 820, height: 980, objectFit: 'cover', borderRadius: 40, opacity: o, transform: `translateY(${rise}px) scale(${s})`, boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }} />
        )}
      </AbsoluteFill>
      {priceCta(150)}
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
      {p.music ? <Audio src={staticFile(`music/${p.music}.mp3`)} volume={p.musicVolume ?? 0.1} loop /> : null}
    </AbsoluteFill>
  );
};
