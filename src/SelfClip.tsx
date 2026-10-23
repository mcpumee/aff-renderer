import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, useVideoConfig } from 'remotion';
import { Caption, Captions, FONT, PriceChip, outline, usePop } from './common';

export type SelfProps = {
  durationSec: number;   // ความยาวคลิปต้นฉบับ + ฉากจบ
  videoSec: number;      // ความยาวคลิปต้นฉบับ
  videoUrl: string;      // คลิปที่ถ่ายเอง
  captions: Caption[];   // ซับจากเสียงพูดในคลิป
  price: string;
  cta: string;
};

export const OUTRO_SEC = 2.5;

export const SelfClip: React.FC<SelfProps> = (p) => {
  const { fps } = useVideoConfig();
  const vidF = Math.max(1, Math.round(p.videoSec * fps));
  const outF = Math.round(OUTRO_SEC * fps);
  return (
    <AbsoluteFill style={{ background: '#111', fontFamily: FONT }}>
      <Sequence from={0} durationInFrames={vidF}>
        <OffthreadVideo src={p.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <AbsoluteFill style={{ alignItems: 'flex-start', padding: '170px 0 0 64px' }}>
          <PriceChip text={p.price} size={76} from={6} />
        </AbsoluteFill>
        <Captions captions={p.captions} bottom={330} />
      </Sequence>
      <Sequence from={vidF} durationInFrames={outF}>
        <Outro price={p.price} cta={p.cta} />
      </Sequence>
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
