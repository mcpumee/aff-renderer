import React from 'react';
import { Composition } from 'remotion';
import { ReviewClip, ReviewProps } from './ReviewClip';
import { SelfClip, SelfProps } from './SelfClip';
import { StoryClip, StoryProps } from './StoryClip';

const FPS = 30;
const frames = (sec: number) => Math.max(FPS, Math.ceil(sec * FPS));

const demoImg = 'https://picsum.photos/seed/aff/1080/1920';

export const Root: React.FC = () => (
  <>
    <Composition
      id="ReviewClip"
      component={ReviewClip as unknown as React.FC<Record<string, unknown>>}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={frames(18)}
      defaultProps={{
        durationSec: 18, audioUrl: '', captions: [{ start: 0, end: 3, text: 'เอาตรงๆเลยนะ จากรีวิว' }],
        hookText: 'เอาตรงๆเลยนะ\nจากรีวิว', heroUrl: demoImg, reviewUrls: [demoImg, demoImg], shotUrls: [demoImg],
        price: '฿184', cta: 'กดตะกร้าได้เลย 👇',
      } satisfies ReviewProps}
      calculateMetadata={({ props }) => ({ durationInFrames: frames((props as ReviewProps).durationSec) })}
    />
    <Composition
      id="SelfClip"
      component={SelfClip as unknown as React.FC<Record<string, unknown>>}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={frames(10)}
      defaultProps={{ durationSec: 10, videoSec: 7.5, videoUrl: '', captions: [], price: '฿184', cta: 'กดตะกร้าได้เลย\n👇' } satisfies SelfProps}
      calculateMetadata={({ props }) => ({ durationInFrames: frames((props as SelfProps).durationSec) })}
    />
    <Composition
      id="StoryClip"
      component={StoryClip as unknown as React.FC<Record<string, unknown>>}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={frames(20)}
      defaultProps={{ durationSec: 20, audioUrl: '', captions: [], shots: [], endStart: 16, endImage: demoImg, endCut: false, price: '฿99', cta: 'กดตะกร้าเลย' } satisfies StoryProps}
      calculateMetadata={({ props }) => ({ durationInFrames: frames((props as StoryProps).durationSec) })}
    />
  </>
);
