# aff-renderer

โรงงานตัดต่อคลิป Affiliate (Remotion) — n8n ส่งงานมา → เรนเดอร์ MP4 1080×1920 → แจ้งกลับ n8n

## API (ภายในเครือข่าย docker เท่านั้น)
- `POST /render` (header `x-render-token`) — ตอบ 202 `{id}` แล้วเรนเดอร์ต่อในคิว
  - `type: "review"` — `voiceover {audio_base64, alignment}` (จาก ElevenLabs `/with-timestamps`), `hero`, `reviews[]`, `shots[]`, `price`, `cta`, `hookText`
  - `type: "self"` — `videoUrl`, `captions[{start,end,text}]`, `price`, `cta`
  - ทั้งคู่: `webhook_url`, `metadata` (ส่งกลับตามเดิม)
- เสร็จแล้ว POST ไป `webhook_url`: `{id, status, url, snapshot_url, metadata}` หรือ `{status:"failed", error_message}`
- `GET /files/<id>.mp4|.jpg`, `GET /renders/<id>`, `GET /health`

## โครงคลิปรีวิว
Hook 3.6 วิ (รูปสินค้า + แคปรีวิวเด้งแปะ + "เอาตรงๆเลยนะ จากรีวิว") → รูปสินค้าหลายมุมซูมช้า + ป้ายราคา → 5 วิท้าย รูปสวยสุด + ตราประทับราคา + CTA · ซับล่างจอ · ความยาวตามเสียงพากย์

## Remotion License
ฟรีสำหรับบุคคล/บริษัทไม่เกิน 3 คน (https://remotion.dev/license)
