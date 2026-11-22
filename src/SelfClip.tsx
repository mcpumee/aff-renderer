import React from 'react';
import { AbsoluteFill, Audio, Img, Loop, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption, CaptionStyle, FONT, PriceChip, StyledCaptions, outline, usePop } from './common';

export type SelfProps = {
  durationSec: number;   // ความยาวรวม (คลิป/เสียงพากย์ + ฉากจบ)
  videoSec: number;      // ความยาวคลิปต้นฉบับ
  videoUrl: string;      // คลิปที่ถ่ายเอง
  captions: Caption[];
  price: string;
  cta: string;
  mainSec?: number;      // ช่วงเนื้อหาก่อนฉากจบ (ถ้าเสียงพากย์ยาวกว่าคลิป คลิปจะวนซ้ำ)
  vertical?: boolean;    // คลิปแนวตั้ง → เต็มจอ / แนวนอน → พื้นหลังเบลอ + คลิปกลางจอ
  posterUrl?: string;    // ภาพนิ่งสำหรับพื้นหลังเบลอ
  captionStyle?: CaptionStyle;
  accent?: string;
  hookText?: string;
  audioUrl?: string;     // เสียงพากย์ AI (ถ้ามี)
  origVolume?: number;   // ความดังเสียงต้นฉบับ
  music?: string;
  musicVolume?: number;
  logoUrl?: string;
};

export const OUTRO_SEC = 2.5;

export const SelfClip: React.FC<SelfProps> = (p) => {
  const { fps } = useVideoConfig();
  const vidF = Math.max(1, Math.round(p.videoSec * fps));
  const mainF = Math.max(vidF, Math.round((p.mainSec || p.videoSec) * fps));
  const outF = Math.round(OUTRO_SEC * fps);
  const vol = p.origVolume ?? 1;
  const video = (
    <OffthreadVideo src={p.videoUrl} volume={vol} muted={vol <= 0}
      style={p.vertical === false ? { width: '100%', height: '100%', objectFit: 'contain' } : { width: '100%', height: '100%', objectFit: 'cover' }} />
  );
  return (
    <AbsoluteFill style={{ background: '#111', fontFamily: FONT }}>
      <Sequence from={0} durationInFrames={mainF}>
        {p.vertical === false && p.posterUrl ? (
          <AbsoluteFill>
            <Img src={p.posterUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(38px) brightness(0.55)', transform: 'scale(1.15)' }} />
          </AbsoluteFill>
        ) : null}
        <AbsoluteFill>{mainF > vidF ? <Loop durationInFrames={vidF}>{video}</Loop> : video}</AbsoluteFill>
        {p.logoUrl ? (
          <AbsoluteFill style={{ alignItems: 'flex-end', padding: '150px 50px 0 0' }}>
            <Img src={p.logoUrl} style={{ width: 150, height: 150, objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.4))' }} />
          </AbsoluteFill>
        ) : null}
        <AbsoluteFill style={{ alignItems: 'flex-start', padding: '170px 0 0 64px' }}>
          <PriceChip text={p.price} size={76} from={6} />
        </AbsoluteFill>
        {p.hookText ? <Hook text={p.hookText} /> : null}
        <StyledCaptions captions={p.captions} style={p.captionStyle} accent={p.accent} bottom={330} />
      </Sequence>
      {p.audioUrl ? <Audio src={p.audioUrl} /> : null}
      {p.music ? <Audio src={staticFile(`music/${p.music}.mp3`)} volume={p.musicVolume ?? 0.1} loop /> : null}
      <Sequence from={mainF} durationInFrames={outF}>
        <Outro price={p.price} cta={p.cta} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** ข้อความฮุคด้านบน 2.8 วินาทีแรก */
const Hook: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const p = usePop(2, 0.5);
  const out = interpolate(frame, [76, 86], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (frame > 86) return null;
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 330 }}>
      <div style={{ fontWeight: 800, fontSize: 92, lineHeight: 1.12, color: '#FFD23F', textAlign: 'center', whiteSpace: 'pre-line', padding: '0 50px',
        transform: `scale(${p.scale})`, opacity: p.opacity * out, ...outline(12) }}>{text}</div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ price: string; cta: string }> = ({ price, cta }) => {
  const t = usePop(0, 0.7);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 50, background: '#111' }}>
      <div style={{ fontWeight: 800, fontSize: 104, color: '#fff', textAlign: 'center', whiteSpace: 'pre-line',
        transform: `scale(${t.scale})`, opacity: t.opacity, ...outline(10) }}>{cta}</div>
      <PriceChip text={price} size={120} rotate={-5} from={8} startScale={1.7} />
    </AbsoluteFill>
  );
};
