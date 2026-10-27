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

## AFF Studio (เว็บสั่งงาน) — `studio/`
เว็บมือถือที่ `https://<โดเมน n8n>/studio/` (ล็อกอินด้วยรหัสผ่านที่ตั้งตอนติดตั้ง)
- อัปรูปรวม → n8n `studio-analyze` (Gemini แยกรูป + อ่านข้อมูลสินค้า/รีวิว) → แก้ได้ทุกช่อง
- `studio-script` (Gemini เขียนบท + แคปชัน 4 แพลตฟอร์ม) → แก้บท → `studio-voice` (ElevenLabs) → ตัวตัดต่อ → คลิปกลับมาที่เว็บ
- webhook ของ n8n รับเฉพาะคำขอจากภายในเครื่อง (ไม่มี X-Forwarded-For)
- เปลี่ยนรหัสผ่าน: `RESET_STUDIO_PASSWORD=1` แล้วรัน install.sh ใหม่
