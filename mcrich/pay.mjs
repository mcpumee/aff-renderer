// Mc Rich — เติมดาวด้วย PromptPay + ตรวจสลิปอัตโนมัติ (EasySlip) + ใบเสร็จ + คิวให้แอดมินตรวจ
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import QRCode from 'qrcode';

export const PACKAGES = [
  { id: 'p100', amount: 100, stars: 100, bonus: 0, label: 'ลองใช้' },
  { id: 'p300', amount: 300, stars: 330, bonus: 30, label: 'ยอดนิยม' },
  { id: 'p500', amount: 500, stars: 575, bonus: 75, label: '' },
  { id: 'p1000', amount: 1000, stars: 1200, bonus: 200, label: 'คุ้มสุด' },
];
const REFERRAL_STARS = 20;
const ORDER_MINUTES = 15;          // อายุ QR
const SLIP_WINDOW_HOURS = 24;      // รับสลิปภายใน 24 ชม. หลังสร้างรายการ

// ---------- PromptPay QR (มาตรฐาน EMVCo ของ ธปท.) ----------
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
function crc16(s) {
  let crc = 0xFFFF;
  for (const b of Buffer.from(s, 'utf8')) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function promptpayPayload(id, amount) {
  const digits = String(id).replace(/\D/g, '');
  let acc;
  if (digits.length === 10 && digits.startsWith('0')) acc = tlv('01', ('0066' + digits.slice(1)).padStart(13, '0')); // เบอร์มือถือ
  else if (digits.length === 13) acc = tlv('02', digits);                                                         // เลขบัตร/นิติบุคคล
  else if (digits.length === 15) acc = tlv('03', digits);                                                         // e-Wallet
  else throw new Error('PROMPTPAY_ID ไม่ถูกต้อง');
  const body = tlv('00', '01') + tlv('01', '12') + tlv('29', tlv('00', 'A000000677010111') + acc)
    + tlv('53', '764') + tlv('54', Number(amount).toFixed(2)) + tlv('58', 'TH') + '6304';
  return body + crc16(body);
}

// ---------- ตรวจสลิป ----------
async function verifySlip(file, key) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)], { type: 'image/jpeg' }), 'slip.jpg');
  const r = await fetch(process.env.EASYSLIP_URL || 'https://api.easyslip.com/v1/verify', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: fd });
  const j = await r.json().catch(() => ({}));
  return { http: r.status, ...j };
}
const norm = (s) => String(s || '').toLowerCase().replace(/[\s.\-_]/g, '');

export function registerPay(app, { q, pool, auth, wrap, log, DATA_DIR, me, rand }) {
  const PP_ID = process.env.PROMPTPAY_ID || '';
  const PP_NAME = process.env.PROMPTPAY_NAME || '';
  const SLIP_KEY = process.env.EASYSLIP_KEY || '';
  // ใช้ยืนยันว่าเงินเข้าบัญชีเราจริง: ชื่อบัญชี (บางส่วน) หรือเลขท้ายบัญชี/พร้อมเพย์ คั่นด้วย ,
  const MATCH = String(process.env.RECEIVER_MATCH || '').split(',').map(norm).filter(Boolean);
  const SELLER = { name: process.env.SELLER_NAME || PP_NAME || 'Mc Rich', address: process.env.SELLER_ADDRESS || '', taxId: process.env.SELLER_TAX_ID || '' };
  const SLIP_DIR = path.join(DATA_DIR, 'slips');
  fs.mkdirSync(SLIP_DIR, { recursive: true });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
  const ready = () => !!PP_ID;

  const view = (t) => ({
    id: t.id, package: t.package, amount: t.amount, stars: t.stars, status: t.status, receiptNo: t.receipt_no,
    reason: t.reason, createdAt: t.created_at, paidAt: t.paid_at,
    expiresAt: new Date(new Date(t.created_at).getTime() + ORDER_MINUTES * 60e3),
  });

  // เติมดาวเข้าบัญชี (ใช้ทั้งตรวจอัตโนมัติและแอดมินอนุมัติ) — ทำในธุรกรรมเดียว
  async function credit(topupId, { transRef, slipData, reviewer }) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const t = (await c.query('SELECT * FROM topups WHERE id=$1 FOR UPDATE', [topupId])).rows[0];
      if (!t || t.status === 'paid') { await c.query('ROLLBACK'); return t; }
      const no = 'MR' + new Date().getFullYear() + '-' + String((await c.query("SELECT nextval('receipt_seq') n")).rows[0].n).padStart(6, '0');
      await c.query(`UPDATE topups SET status='paid', paid_at=now(), receipt_no=$2, trans_ref=COALESCE($3, trans_ref),
        slip_data=CASE WHEN $4::jsonb = '{}'::jsonb THEN slip_data ELSE $4::jsonb END, reviewed_by=$5, reason='' WHERE id=$1`,
      [topupId, no, transRef || null, slipData || {}, reviewer || null]);
      await c.query(`INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'topup',$3,$4)`,
        [t.user_id, t.stars, String(t.id), `เติมดาว PromptPay ฿${t.amount}`]);
      // โบนัสชวนเพื่อน: เมื่อเพื่อนเติมครั้งแรก ทั้งสองคนได้ดาว
      const first = (await c.query("SELECT count(*)::int n FROM topups WHERE user_id=$1 AND status='paid'", [t.user_id])).rows[0].n === 1;
      const ref = (await c.query('SELECT referred_by FROM users WHERE id=$1', [t.user_id])).rows[0]?.referred_by;
      if (first && ref) {
        await c.query(`INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'referral',$3,'โบนัสชวนเพื่อน') ON CONFLICT DO NOTHING`, [ref, REFERRAL_STARS, 'u' + t.user_id]);
        await c.query(`INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'referral',$3,'โบนัสเพื่อนชวน') ON CONFLICT DO NOTHING`, [t.user_id, REFERRAL_STARS, 'self']);
      }
      await c.query('INSERT INTO audit_log(user_id,action,detail) VALUES($1,$2,$3)', [t.user_id, 'topup_paid', { topup: t.id, amount: t.amount, reviewer: reviewer || null, transRef }]);
      await c.query('COMMIT');
      return { ...t, status: 'paid', receipt_no: no };
    } catch (e) {
      await c.query('ROLLBACK');
      if (e.code === '23505') throw new Error('สลิปนี้ถูกใช้ไปแล้ว');
      throw e;
    } finally { c.release(); }
  }

  app.get('/api/topup/packages', auth, (_q, r) => r.json({ packages: PACKAGES, ready: ready(), autoCheck: !!SLIP_KEY, payee: PP_NAME }));

  app.post('/api/topup', auth, wrap(async (req, res) => {
    if (!ready()) return res.status(503).json({ error: 'ระบบเติมดาวยังไม่เปิด' });
    const pk = PACKAGES.find((p) => p.id === req.body?.package);
    if (!pk) return res.status(400).json({ error: 'ไม่พบแพ็กเกจ' });
    // ใช้รายการเดิมถ้ายังไม่หมดอายุ (กดซ้ำไม่สร้างใหม่)
    const old = (await q(`SELECT * FROM topups WHERE user_id=$1 AND package=$2 AND status='pending' AND created_at > now() - interval '${ORDER_MINUTES} minutes' ORDER BY id DESC LIMIT 1`, [req.uid, pk.id])).rows[0];
    const t = old || (await q('INSERT INTO topups(user_id,package,amount,stars) VALUES($1,$2,$3,$4) RETURNING *', [req.uid, pk.id, pk.amount, pk.stars])).rows[0];
    const qr = await QRCode.toDataURL(promptpayPayload(PP_ID, t.amount), { margin: 1, width: 480, errorCorrectionLevel: 'M' });
    res.json({ ...view(t), qr, payee: PP_NAME });
  }));

  app.get('/api/topup/:id', auth, wrap(async (req, res) => {
    const t = (await q('SELECT * FROM topups WHERE id=$1 AND user_id=$2', [req.params.id, req.uid])).rows[0];
    if (!t) return res.status(404).json({ error: 'ไม่พบรายการ' });
    res.json(view(t));
  }));

  app.get('/api/topups', auth, wrap(async (req, res) => {
    const { rows } = await q('SELECT * FROM topups WHERE user_id=$1 AND status<>$2 ORDER BY id DESC LIMIT 30', [req.uid, 'pending']);
    res.json({ items: rows.map(view) });
  }));

  // แนบสลิป → ตรวจอัตโนมัติ
  app.post('/api/topup/:id/slip', auth, upload.single('slip'), wrap(async (req, res) => {
    const t = (await q('SELECT * FROM topups WHERE id=$1 AND user_id=$2', [req.params.id, req.uid])).rows[0];
    if (!t) return res.status(404).json({ error: 'ไม่พบรายการ' });
    if (t.status === 'paid') return res.json({ ...view(t), result: 'paid' });
    if (!req.file) return res.status(400).json({ error: 'แนบรูปสลิปก่อน' });
    if (t.attempts >= 6) return res.status(429).json({ error: 'แนบสลิปหลายครั้งเกินไป กด "ส่งให้แอดมินตรวจ"' });
    if (Date.now() - new Date(t.created_at).getTime() > SLIP_WINDOW_HOURS * 3600e3) return res.status(400).json({ error: 'รายการหมดอายุ สร้างรายการเติมดาวใหม่' });
    const name = `${t.id}-${rand(6).toLowerCase()}.jpg`;
    const file = path.join(SLIP_DIR, name);
    try { await sharp(req.file.buffer).rotate().resize({ width: 1400, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(file); }
    catch { return res.status(400).json({ error: 'ไฟล์รูปไม่ถูกต้อง' }); }
    await q('UPDATE topups SET slip_file=$2, attempts=attempts+1 WHERE id=$1', [t.id, name]);

    const toReview = async (reason) => {
      await q("UPDATE topups SET status='review', reason=$2 WHERE id=$1 AND status<>'paid'", [t.id, reason]);
      log('topup review', t.id, reason);
      return res.json({ ...view({ ...t, status: 'review', reason }), result: 'review' });
    };
    const fail = async (reason) => {
      await q('UPDATE topups SET reason=$2 WHERE id=$1', [t.id, reason]);
      return res.json({ ...view({ ...t, reason }), result: 'fail', message: reason });
    };
    if (!SLIP_KEY) return toReview('รอแอดมินตรวจ (ยังไม่เปิดตรวจอัตโนมัติ)');

    let v;
    try { v = await verifySlip(file, SLIP_KEY); } catch (e) { log('easyslip', e.message); return toReview('ระบบตรวจสลิปขัดข้อง ส่งให้แอดมินตรวจแล้ว'); }
    if (v.status !== 200 || !v.data) {
      const m = v.message || '';
      if (m === 'duplicate_slip') return fail('สลิปนี้ถูกใช้ไปแล้ว');
      if (m === 'slip_not_found' || m === 'invalid_payload' || m === 'invalid_image') return fail('อ่านสลิปไม่ได้ ลองแนบรูปสลิปที่ชัดและเต็มใบ');
      if (m === 'slip_pending') return fail('ธนาคารยังประมวลผลสลิป รอ 2–3 นาทีแล้วแนบใหม่');
      return toReview('ระบบตรวจสลิปขัดข้อง ส่งให้แอดมินตรวจแล้ว');
    }
    const d = v.data;
    const amt = Number(d.amount?.amount ?? d.amount);
    const recv = d.receiver?.account || {};
    const recvText = norm([recv.name?.th, recv.name?.en, recv.bank?.account, recv.proxy?.account].join('|'));
    const okReceiver = MATCH.length ? MATCH.some((m) => recvText.includes(m)) : false;
    const when = new Date(d.date);
    const okTime = !Number.isNaN(when.getTime()) && when.getTime() >= new Date(t.created_at).getTime() - 10 * 60e3;
    const slipData = { transRef: d.transRef, date: d.date, amount: amt, sender: d.sender?.account?.name?.th || d.sender?.account?.name?.en || '', receiver: recv.name?.th || recv.name?.en || '', bank: d.sender?.bank?.short || '' };
    await q('UPDATE topups SET slip_data=$2 WHERE id=$1', [t.id, slipData]);
    const dup = d.transRef ? (await q('SELECT id FROM topups WHERE trans_ref=$1 AND id<>$2', [d.transRef, t.id])).rows[0] : null;
    if (dup) return fail('สลิปนี้ถูกใช้ไปแล้ว');
    if (amt !== t.amount) return fail(`ยอดในสลิป ฿${amt} ไม่ตรงกับยอดที่ต้องโอน ฿${t.amount}`);
    if (!okReceiver) return toReview('ชื่อบัญชีผู้รับไม่ตรง ส่งให้แอดมินตรวจแล้ว');
    if (!okTime) return toReview('เวลาโอนก่อนสร้างรายการ ส่งให้แอดมินตรวจแล้ว');
    try {
      const done = await credit(t.id, { transRef: d.transRef, slipData });
      log('topup paid', t.id, t.amount);
      res.json({ ...view(done), result: 'paid', me: await me(req.uid) });
    } catch (e) { return fail(e.message); }
  }));

  app.post('/api/topup/:id/review', auth, wrap(async (req, res) => {
    const note = String(req.body?.note || '').slice(0, 300);
    const r = await q("UPDATE topups SET status='review', note=$3, reason='ส่งให้แอดมินตรวจแล้ว' WHERE id=$1 AND user_id=$2 AND status IN ('pending','review') RETURNING *", [req.params.id, req.uid, note]);
    if (!r.rows[0]) return res.status(400).json({ error: 'ส่งตรวจไม่ได้' });
    if (!r.rows[0].slip_file) return res.status(400).json({ error: 'แนบสลิปก่อนส่งตรวจ' });
    res.json(view(r.rows[0]));
  }));

  // ใบเสร็จ (เปิดเป็นหน้าเว็บ พิมพ์/บันทึก PDF จากเบราว์เซอร์)
  app.get('/receipt/:id', auth, wrap(async (req, res) => {
    const t = (await q(`SELECT t.*, u.name, u.public_id FROM topups t JOIN users u ON u.id=t.user_id WHERE t.id=$1 AND t.user_id=$2 AND t.status='paid'`, [req.params.id, req.uid])).rows[0];
    if (!t) return res.status(404).send('ไม่พบใบเสร็จ');
    const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const dt = new Date(t.paid_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long', timeStyle: 'short' });
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ใบเสร็จ ${e(t.receipt_no)}</title>
<style>body{font-family:'Anuphan','Sarabun',system-ui,sans-serif;background:#f4f4f4;margin:0;padding:24px;color:#111}.r{max-width:560px;margin:auto;background:#fff;border-radius:14px;padding:28px}
h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:8px 0;border-bottom:1px solid #eee}td:last-child{text-align:right}
.t{font-size:20px;font-weight:700}.m{color:#666;font-size:13px}button{margin-top:16px;padding:12px 18px;border:0;border-radius:10px;background:#0B0C0F;color:#C8F94A;font-weight:700;font-size:15px}
@media print{body{background:#fff;padding:0}button{display:none}}</style></head><body><div class="r">
<h1>ใบเสร็จรับเงิน</h1><div class="m">เลขที่ ${e(t.receipt_no)} · ${e(dt)}</div>
<p><b>${e(SELLER.name)}</b>${SELLER.address ? '<br>' + e(SELLER.address) : ''}${SELLER.taxId ? '<br>เลขประจำตัวผู้เสียภาษี ' + e(SELLER.taxId) : ''}</p>
<p class="m">ลูกค้า: ${e(t.name)} (รหัสสมาชิก ${e(t.public_id)})</p>
<table><tr><td>ดาว Mc Rich แพ็ก ${e(t.stars)} ดาว</td><td>฿${Number(t.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td></tr>
<tr><td class="t">รวมทั้งสิ้น</td><td class="t">฿${Number(t.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td></tr></table>
<p class="m">ชำระผ่าน PromptPay${t.slip_data?.transRef ? ' · อ้างอิง ' + e(t.slip_data.transRef) : ''}</p>
<button onclick="print()">พิมพ์ / บันทึกเป็น PDF</button></div></body></html>`);
  }));

  // ---------- แอดมิน ----------
  const admin = async (req, res, next) => {
    const u = (await q('SELECT is_admin FROM users WHERE id=$1', [req.uid])).rows[0];
    if (!u?.is_admin) return res.status(403).json({ error: 'เฉพาะแอดมิน' });
    next();
  };
  app.get('/api/admin/topups', auth, admin, wrap(async (req, res) => {
    const st = ['review', 'paid', 'rejected', 'pending'].includes(req.query.status) ? req.query.status : 'review';
    const { rows } = await q(`SELECT t.*, u.name, u.public_id FROM topups t JOIN users u ON u.id=t.user_id WHERE t.status=$1 ORDER BY t.id DESC LIMIT 100`, [st]);
    const sum = (await q("SELECT COALESCE(sum(amount),0)::int total, count(*)::int n FROM topups WHERE status='paid' AND paid_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok')")).rows[0];
    res.json({ items: rows.map((t) => ({ ...view(t), user: t.name, userId: t.public_id, note: t.note, slip: t.slip_file ? `api/admin/slip/${t.id}` : '', slipData: t.slip_data })), month: sum });
  }));
  app.get('/api/admin/slip/:id', auth, admin, wrap(async (req, res) => {
    const t = (await q('SELECT slip_file FROM topups WHERE id=$1', [req.params.id])).rows[0];
    if (!t?.slip_file) return res.status(404).end();
    res.sendFile(path.join(SLIP_DIR, path.basename(t.slip_file)));
  }));
  app.post('/api/admin/topups/:id/approve', auth, admin, wrap(async (req, res) => {
    const t = (await q("SELECT * FROM topups WHERE id=$1 AND status IN ('review','pending')", [req.params.id])).rows[0];
    if (!t) return res.status(400).json({ error: 'อนุมัติไม่ได้' });
    if (!t.slip_file) return res.status(400).json({ error: 'ยังไม่มีสลิป' });
    try { await credit(t.id, { transRef: t.slip_data?.transRef || null, reviewer: req.uid }); } catch (e) { return res.status(400).json({ error: e.message }); }
    res.json({ ok: true });
  }));
  app.post('/api/admin/topups/:id/reject', auth, admin, wrap(async (req, res) => {
    const reason = String(req.body?.reason || 'ตรวจสอบแล้วไม่พบยอดเงินเข้า').slice(0, 200);
    await q("UPDATE topups SET status='rejected', reason=$2, reviewed_by=$3 WHERE id=$1 AND status IN ('review','pending')", [req.params.id, reason, req.uid]);
    res.json({ ok: true });
  }));

  return { ready };
}
