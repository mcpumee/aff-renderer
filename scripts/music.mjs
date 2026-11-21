// สร้างเพลงประกอบ (ลิขสิทธิ์ของเราเอง 100%) — สังเคราะห์เสียงด้วยโค้ด แล้วเข้ารหัส mp3 ด้วย ffmpeg
// ใช้: node scripts/music.mjs  → public/music/<mood>.mp3 (ลูป 16 ห้อง)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SR = 44100;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function track({ bpm, bars, chords, kick, snare, hat, bassPat, arp, pad, piano, swing = 0, gain = {} }) {
  const beat = 60 / bpm, len = Math.round(bars * 4 * beat * SR);
  const L = new Float32Array(len), R = new Float32Array(len);
  const add = (t0, buf, g = 1, pan = 0) => {
    const i0 = Math.round(t0 * SR);
    for (let i = 0; i < buf.length && i0 + i < len; i++) { L[i0 + i] += buf[i] * g * (1 - Math.max(0, pan)); R[i0 + i] += buf[i] * g * (1 + Math.min(0, pan)); }
  };
  const env = (n, a, d) => (i) => { const t = i / SR; return t < a ? t / a : Math.exp(-(t - a) / d); };
  const kickBuf = (() => { const n = Math.round(0.35 * SR), b = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; const f = 45 + 110 * Math.exp(-t / 0.04); ph += 2 * Math.PI * f / SR; b[i] = Math.sin(ph) * Math.exp(-t / 0.18); } return b; })();
  const snareBuf = (() => { const n = Math.round(0.25 * SR), b = new Float32Array(n); let prev = 0; for (let i = 0; i < n; i++) { const t = i / SR; const nz = rnd(); const hp = nz - prev; prev = nz; b[i] = (hp * 0.35 * Math.exp(-t / 0.07)) + Math.sin(2 * Math.PI * 190 * t) * 0.35 * Math.exp(-t / 0.05); } return b; })();
  const hatBuf = (() => { const n = Math.round(0.06 * SR), b = new Float32Array(n); let prev = 0; for (let i = 0; i < n; i++) { const nz = rnd(); b[i] = (nz - prev) * Math.exp(-(i / SR) / 0.015); prev = nz; } return b; })();
  const tone = (f, dur, kind, a = 0.005, d = 0.3, cut = 0.2) => {
    const n = Math.round(dur * SR), b = new Float32Array(n), e = env(n, a, d); let lp = 0, ph = 0;
    for (let i = 0; i < n; i++) {
      ph += f / SR; const x = ph % 1;
      let v = kind === 'saw' ? 2 * x - 1 : kind === 'sq' ? (x < 0.5 ? 1 : -1) : kind === 'tri' ? 4 * Math.abs(x - 0.5) - 1 : Math.sin(2 * Math.PI * x);
      if (kind === 'piano') v = Math.sin(2 * Math.PI * x) + 0.35 * Math.sin(4 * Math.PI * x) + 0.12 * Math.sin(6 * Math.PI * x);
      lp += cut * (v - lp);
      const rel = i > n - 400 ? (n - i) / 400 : 1;
      b[i] = lp * e(i) * rel;
    }
    return b;
  };
  for (let bar = 0; bar < bars; bar++) {
    const ch = chords[bar % chords.length];
    const t0 = bar * 4 * beat;
    for (let s = 0; s < 16; s++) {
      const st = t0 + s * beat / 4 + (s % 2 ? swing * beat / 4 : 0);
      if (kick[s % kick.length] === 'x') add(st, kickBuf, gain.kick ?? 0.9);
      if (snare && snare[s % snare.length] === 'x') add(st, snareBuf, gain.snare ?? 0.5);
      if (hat && hat[s % hat.length] === 'x') add(st, hatBuf, (gain.hat ?? 0.2) * 0.5, (s % 4) / 8 - 0.2);
      if (bassPat && bassPat[s % bassPat.length] !== '.') {
        const oct = bassPat[s % bassPat.length] === 'o' ? 12 : 0;
        add(st, tone(midi(ch[0] - 24 + oct), beat / 4 * 1.8, 'tri', 0.004, 0.18, 0.08), gain.bass ?? 0.55);
      }
      if (arp && arp[s % arp.length] === 'x') {
        const note = ch[(s / 2 | 0) % ch.length] + 12 * ((s / 8 | 0) % 2);
        add(st, tone(midi(note), beat / 2, 'sq', 0.002, 0.08, 0.12), gain.arp ?? 0.09, ((s % 3) - 1) * 0.4);
      }
      if (piano && piano[s % piano.length] === 'x') ch.forEach((n2, k) => add(st + k * 0.012, tone(midi(n2), beat * 1.6, 'piano', 0.003, 0.5, 0.25), (gain.piano ?? 0.16) / ch.length * 2.2, k * 0.2 - 0.2));
    }
    if (pad) ch.forEach((n2, k) => { add(t0, tone(midi(n2) * 1.003, 4 * beat, 'saw', 0.4, 6, 0.02), (gain.pad ?? 0.07), -0.4 + k * 0.3); add(t0, tone(midi(n2) * 0.997, 4 * beat, 'saw', 0.4, 6, 0.02), (gain.pad ?? 0.07), 0.4 - k * 0.3); });
  }
  // บีบ + นอร์มัลไลซ์
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / (pk || 1);
  const pcm = Buffer.alloc(len * 4);
  for (let i = 0; i < len; i++) { pcm.writeInt16LE(Math.round(Math.tanh(L[i] * g * 1.2) * 30000), i * 4); pcm.writeInt16LE(Math.round(Math.tanh(R[i] * g * 1.2) * 30000), i * 4 + 2); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
// คอร์ด (โน้ต MIDI)
const C = [60, 64, 67], G = [55, 59, 62], Am = [57, 60, 64], F = [53, 57, 60], Dm = [62, 65, 69], Em = [52, 55, 59];
const Cm = [60, 63, 67], Ab = [56, 60, 63], Eb = [51, 55, 58], Bb = [58, 62, 65], Fm = [53, 56, 60], Gsus = [55, 60, 62];
const TRACKS = {
  fun: { bpm: 118, bars: 16, chords: [C, G, Am, F], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', bassPat: 'x.x.o.x.x.x.o.x.', arp: 'x.x.x.x.x.x.x.x.', gain: { arp: 0.08 } },
  hype: { bpm: 128, bars: 16, chords: [Am, F, C, G], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bassPat: '..x...x...x...x.', arp: 'xxxxxxxxxxxxxxxx', pad: true, gain: { arp: 0.06, pad: 0.05, hat: 0.18 } },
  suspense: { bpm: 100, bars: 16, chords: [Cm, Ab, Eb, Bb], kick: 'x.......x..x....', snare: '........x.......', hat: 'x.x.x.x.x.x.x.x.', bassPat: 'x.x.x.x.x.x.x.x.', pad: true, arp: '..x...x...x...x.', gain: { pad: 0.08, hat: 0.14 } },
  chill: { bpm: 84, bars: 16, chords: [F, Em, Dm, C], kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bassPat: 'x.....x...x.....', piano: 'x.......x.......', swing: 0.35, gain: { hat: 0.12, piano: 0.2 } },
  luxury: { bpm: 90, bars: 16, chords: [Dm, Gsus, C, Am], kick: 'x.........x.....', snare: null, hat: '..x...x...x...x.', bassPat: 'x.......x.......', piano: 'x...x...x...x...', pad: true, gain: { piano: 0.22, pad: 0.06, hat: 0.1 } },
};
fs.mkdirSync('public/music', { recursive: true });
for (const [name, cfg] of Object.entries(TRACKS)) {
  const tmp = `/tmp/music-${name}.wav`;
  fs.writeFileSync(tmp, track(cfg));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'highpass=f=30,lowpass=f=9500,acompressor=threshold=-18dB:ratio=3:attack=5:release=120', '-codec:a', 'libmp3lame', '-b:a', '128k', `public/music/${name}.mp3`]);
  fs.rmSync(tmp);
  console.log('ok', name);
}
