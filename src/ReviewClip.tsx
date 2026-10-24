import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Caption, Captions, FONT, PriceChip, YELLOW, outline, usePop } from './common';
import { GiftIntro, Product, Theme } from './GiftIntro';

export type ReviewProps = {
  durationSec: number;   // ความยาวคลิปทั้งหมด (ตามเสียงพากย์)
  audioUrl: string;      // เสียงพากย์
  captions: Caption[];   // ซับ (จากเวลาของเสียง)
  hookText: string;      // "เอาตรงๆเลยนะ\nจากรีวิว"
  heroUrl: string;       // รูปสินค้าที่สวยที่สุด (Hook + 5 วิท้าย)
  reviewUrls: string[];  // แคปรีวิว 2–3 ภาพ (เด้งแปะช่วง Hook)
  shotUrls: string[];    // รูปสินค้ามุมอื่น / ใช้งานจริง (ช่วงกลาง)
  sizes?: Record<string, { w: number; h: number }>; // ขนาดรูปต้นฉบับ
  burstSec?: number;     // จังหวะกล่องระเบิด (ตามเสียงพากย์)
  introSec?: number;     // ความยาวฉากเปิด (กล่อง + รีวิว)
  products?: Product[];  // รูปสินค้าที่ตัดพื้นหลังแล้ว / แบบการ์ด
  theme?: Theme;
  price: string;         // "฿184"
  cta: string;           // "กดตะกร้าได้เลย 👇"
};

const HOOK_SEC = 3.6;
const END_SEC = 5;

/** ต้องยืดรูปกี่เท่าถึงเต็มจอ 1080×1920 (มากกว่า ~1.5 เท่า = ภาพจะนุ่ม) */
const coverUpscale = (sz?: { w: number; h: number }) => (sz ? Math.max(1080 / sz.w, 1920 / sz.h) : 1);
const SMALL = 1.5;

/** รูปเต็มจอ ซูมช้า ๆ — รูปชัดพอ: ครอปเต็มจอ / รูปเล็ก: วางทั้งรูปบนพื้นหลังเบลอ ไม่ยืดจนแตก */
const SlowZoom: React.FC<{ src: string; dur: number; dir?: 1 | -1; blur?: number; size?: { w: number; h: number } }> = ({ src, dur, dir = 1, blur = 0, size }) => {
  const frame = useCurrentFrame();
  const up = coverUpscale(size);
  if (!blur && up > SMALL) {
    const s2 = interpolate(frame, [0, dur], dir === 1 ? [1, 1.04] : [1.04, 1], { extrapolateRight: 'clamp' });
    return (
      <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.15)', filter: 'blur(45px) brightness(0.65)' }} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${s2})` }} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const z = up > 1.2 ? 1.05 : 1.1; // รูปค่อนข้างเล็ก ซูมน้อยลง
  const s = interpolate(frame, [0, dur], dir === 1 ? [1, z] : [z, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, filter: blur ? `blur(${blur}px)` : undefined }} />
    </AbsoluteFill>
  );
};

/** แคปรีวิวที่เด้งแปะทับ */
const ReviewCard: React.FC<{ src: string; from: number; rotate: number; x: number; y: number }> = ({ src, from, rotate, x, y }) => {
  const p = usePop(from, 0.55);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: 760,
      transform: `rotate(${rotate}deg) scale(${p.scale})`, opacity: p.opacity,
      background: '#fff', padding: 14, borderRadius: 26, boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
    }}>
      <Img src={src} style={{ width: '100%', maxHeight: 820, objectFit: 'contain', borderRadius: 16, display: 'block' }} />
    </div>
  );
};

export const ReviewClip: React.FC<ReviewProps> = (p) => {
  const { fps, durationInFrames } = useVideoConfig();
  const gift = !!(p.theme && p.products && p.products.length);
  const hookF = Math.round((gift ? p.introSec || HOOK_SEC : HOOK_SEC) * fps);
  const endF = Math.round(END_SEC * fps);
  const midStart = hookF;
  const midLen = Math.max(1, durationInFrames - hookF - endF);
  const shots = p.shotUrls.length ? p.shotUrls : [p.heroUrl];
  // ช็อตละ ~2.2 วิ วนรูปที่มี
  const shotLen = Math.max(Math.round(1.6 * fps), Math.round(midLen / Math.max(1, Math.round(midLen / (2.2 * fps)))));
  const nShots = Math.ceil(midLen / shotLen);
  const hookText = usePop(2, 0.7);

  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: FONT }}>
      {/* ช่วงกลาง: รูปสินค้าหลายมุม ตัดทีละช็อต */}
      {Array.from({ length: nShots }).map((_, i) => {
        const from = midStart + i * shotLen;
        const len = Math.min(shotLen, midStart + midLen - from);
        return (
          <Sequence key={'s' + i} from={from} durationInFrames={len}>
            <SlowZoom src={shots[i % shots.length]} size={p.sizes?.[shots[i % shots.length]]} dur={len} dir={i % 2 === 0 ? 1 : -1} />
          </Sequence>
        );
      })}
      {/* ป้ายราคามุมบน ช่วงกลาง */}
      <Sequence from={midStart} durationInFrames={midLen}>
        <AbsoluteFill style={{ alignItems: 'center', paddingTop: 170 }}>
          <PriceChip text={p.price} size={86} from={4} />
        </AbsoluteFill>
      </Sequence>

      {/* ฉากเปิด: กล่องของขวัญระเบิด → สินค้า → แปะรีวิว */}
      {gift ? (
        <Sequence from={0} durationInFrames={hookF}>
          <GiftIntro theme={p.theme!} products={p.products!} reviewUrls={p.reviewUrls} hookText={p.hookText}
            burstSec={p.burstSec || 1.6} introSec={p.introSec || HOOK_SEC} />
        </Sequence>
      ) : (
      <Sequence from={0} durationInFrames={hookF}>
        <SlowZoom src={p.heroUrl} size={p.sizes?.[p.heroUrl]} dur={hookF} />
        <AbsoluteFill style={{ background: 'rgba(0,0,0,0.28)' }} />
        {p.reviewUrls.slice(0, 3).map((u, i) => (
          <ReviewCard key={'r' + i} src={u} from={Math.round((0.3 + i * 0.6) * fps)}
            rotate={[-6, 5, -2][i]} x={[140, 180, 160][i]} y={[520, 600, 680][i]} />
        ))}
        <AbsoluteFill style={{ alignItems: 'center', paddingTop: 150 }}>
          <div style={{
            fontWeight: 800, fontSize: 108, lineHeight: 1.12, color: YELLOW, textAlign: 'center', whiteSpace: 'pre-line',
            transform: `scale(${hookText.scale})`, opacity: hookText.opacity, ...outline(14),
          }}>{p.hookText}</div>
        </AbsoluteFill>
      </Sequence>
      )}

      {/* 5 วิท้าย: รูปสวยสุด + ตราประทับราคา */}
      <Sequence from={durationInFrames - endF} durationInFrames={endF}>
        {gift && p.products![0].cut ? (
          <>
            <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${p.theme!.bg[0]} 0%, ${p.theme!.bg[1]} 100%)` }} />
            <AbsoluteFill style={{ background: 'rgba(0,0,0,0.12)' }} />
            <EndHero src={p.products![0].url} dur={endF} />
          </>
        ) : (
          <>
            <SlowZoom src={p.heroUrl} dur={endF} blur={40} />
            <AbsoluteFill style={{ background: 'rgba(0,0,0,0.35)' }} />
            <EndHero src={p.heroUrl} dur={endF} />
          </>
        )}
        <AbsoluteFill style={{ alignItems: 'center', paddingTop: 190 }}>
          <PriceChip text={p.price} size={150} rotate={-6} from={Math.round(0.5 * fps)} startScale={1.8} />
          <EndCta text={p.cta} from={Math.round(1 * fps)} />
        </AbsoluteFill>
      </Sequence>

      {/* ซับล่างจอ ตลอดคลิป */}
      <Captions captions={p.captions} bottom={330} />
      {p.audioUrl ? <Audio src={p.audioUrl} /> : null}
    </AbsoluteFill>
  );
};

const EndHero: React.FC<{ src: string; dur: number }> = ({ src, dur }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], [1, 1.08]);
  const o = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 140 }}>
      <Img src={src} style={{ width: 960, height: 1000, objectFit: 'contain', transform: `scale(${s})`, opacity: o,
        filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.5))' }} />
    </AbsoluteFill>
  );
};

const EndCta: React.FC<{ text: string; from: number }> = ({ text, from }) => {
  const p = usePop(from, 0.7);
  return (
    <div style={{ marginTop: 28, fontWeight: 700, fontSize: 72, color: '#fff', opacity: p.opacity,
      transform: `scale(${p.scale})`, ...outline(9) }}>{text}</div>
  );
};
