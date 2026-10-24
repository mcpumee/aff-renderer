// ทดสอบในเครื่อง: node server/test-render.mjs <โฟลเดอร์ไฟล์ทดสอบ>
// ต้องรัน server.mjs (PORT=3000) อยู่แล้ว
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/a', express.static(dir));
const done = [];
app.post('/cb', (q, r) => { console.log('CALLBACK', JSON.stringify(q.body)); done.push(q.body); r.json({ ok: true }); });
app.listen(3100);

const A = 'http://127.0.0.1:3100/a/';
const text = 'ระเบิดกล่องสินค้า แนะนำ! จากรีวิว เครื่องบดสับตัวนี้ คนที่ซื้อไปบอกว่าใบมีดคม ปั่นกระเทียมละเอียดดี ล้างง่าย แต่ข้อสังเกตคือต้องกดปุ่มค้างไว้ตอนปั่น ราคาหนึ่งร้อยแปดสิบสี่บาท สนใจกดตะกร้าได้เลย';
const chars = [...text];
const per = 15 / chars.length;
const alignment = {
  characters: chars,
  character_start_times_seconds: chars.map((_, i) => +(i * per).toFixed(3)),
  character_end_times_seconds: chars.map((_, i) => +((i + 1) * per).toFixed(3)),
};
const audio_base64 = fs.readFileSync(path.join(dir, 'vo.mp3')).toString('base64');

const post = (body) => fetch('http://127.0.0.1:3000/render', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
}).then((r) => r.json());

await new Promise((r) => setTimeout(r, 500));
console.log(await post({
  type: 'review', webhook_url: 'http://127.0.0.1:3100/cb', metadata: '{"code":"T1"}',
  voiceover: { audio_base64, alignment },
  hero: A + 'hero.jpg', reviews: [A + 'rev1.png', A + 'rev1.png'], shots: [A + 'shot1.jpg', A + 'shot2.jpg'],
  price: '฿184', cta: 'กดตะกร้าได้เลย 👇',
}));
console.log(await post({
  type: 'self', webhook_url: 'http://127.0.0.1:3100/cb', metadata: '{"code":"T2"}',
  videoUrl: A + 'self.mp4', price: '฿299',
  captions: [{ start: 0.2, end: 2.5, text: 'วันนี้มารีวิวพัดลมพกพา' }, { start: 2.6, end: 5.5, text: 'ลมแรงมาก แบตอยู่ทั้งวัน' }],
}));
const t0 = Date.now();
while (done.length < 2 && Date.now() - t0 < 600000) await new Promise((r) => setTimeout(r, 2000));
console.log('DONE', done.length);
process.exit(0);
