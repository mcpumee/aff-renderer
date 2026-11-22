// Mc Rich — ผู้ช่วย AI "น้องริช" (แชทในแอป + LINE OA) และแจ้งเตือนผ่าน LINE
import crypto from 'node:crypto';
import { STYLES, GOALS } from './create.mjs';
import { VIDEO_STYLES } from './video.mjs';

const API = () => (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const KEY = () => process.env.GEMINI_API_KEY || '';
const MODEL = process.env.MCRICH_CHAT_MODEL || process.env.MCRICH_TEXT_MODEL || 'gemini-flash-latest';
const OA_SECRET = () => process.env.LINEOA_SECRET || '';
const OA_TOKEN = () => process.env.LINEOA_TOKEN || '';
const OA_ID = () => (process.env.LINEOA_ID || '').trim();
const LINE_API = () => (process.env.LINE_API_URL || 'https://api.line.me').replace(/\/+$/, '');
const FREE_PER_DAY = Number(process.env.MCRICH_CHAT_FREE || 30);

const styleList = () => [
  ...STYLES.map((s) => `${s.id} = ภาพ: ${s.label}`),
  ...VIDEO_STYLES.map((s) => `${s.id} = คลิป: ${s.label}`),
].join('\n');

function systemPrompt(m, works) {
  const b = m.brand || {};
  return `คุณคือ "น้องริช" ผู้ช่วย AI ของแอป Mc Rich (แอปสร้างภาพและคลิปขายของ/คอนเทนต์/ประชาสัมพันธ์ด้วย AI จ่ายด้วยดาว 1 ดาว = 1 บาท)
บุคลิก: เป็นกันเอง กระตือรือร้น ตอบสั้น กระชับ ใช้ภาษาไทยเป็นหลัก อีโมจิพอประมาณ เหมาะอ่านบนมือถือ
ช่วยได้: คิดไอเดียคอนเทนต์/แผนโพสต์ เขียนแคปชั่น แฮชแท็ก ฮุค เลือกแนวภาพ/คลิปที่เหมาะ แนะนำการใช้แอป ตอบเรื่องดาว ผลงาน การตั้งเวลาโพสต์
กฎ: ห้ามแนะนำคำโฆษณาเกินจริงหรือผิดกฎ อย. · ห้ามสัญญายอดขาย · ไม่รู้ให้บอกตรงๆ · เรื่องเงิน/คืนเงิน/ปัญหาระบบให้แนะนำติดต่อแอดมิน · ไม่ตอบเรื่องที่ไม่เกี่ยวกับธุรกิจ/คอนเทนต์ยาวเกินไป ให้ตอบสั้นแล้วชวนกลับมาเรื่องงาน
ข้อมูลผู้ใช้: ชื่อ ${m.name || '-'} · ดาวคงเหลือ ${m.stars} · ภาพฟรีเหลือ ${m.freeImages.today + m.freeImages.welcome} · ร้าน/แบรนด์ ${b.shopName || '-'} · ความสนใจ ${JSON.stringify(m.interests || {})}
ผลงานล่าสุด: ${works.map((w) => `${w.title} (${w.kind === 'video' ? 'คลิป' : 'ภาพ'}, ${w.status})`).join(' / ') || '-'}
ราคาโดยประมาณ: ภาพ 5–16 ดาว (ภาพฟรีวันละ 1) · คลิปเปิดลุ้น/ขายของ 12–20 · Top N 15–20 · ละคร 25–35 · ใส่ซับคลิปถ่ายเอง 6–12 · ความรู้/ร้าน/ประชาสัมพันธ์ 12–20
แนวงานในแอป (id = ชื่อ):
${styleList()}
เป้าหมาย (goal): ${GOALS.map((g) => `${g.id}=${g.label}`).join(', ')}
ถ้าผู้ใช้อยากสร้างงาน หรือคุณแนะนำงานชิ้นที่ชัดเจน ให้ใส่ "draft" เพื่อให้ผู้ใช้กดสร้างต่อได้ทันที (ไม่ตัดดาวจนกว่าเขาจะยืนยันเอง) ถ้าไม่ใช่ให้ draft เป็น null
ตอบเป็น JSON เท่านั้น: {"reply":"ข้อความตอบ","draft":null หรือ {"kind":"image|video","style":"id จากรายการ","goal":"sell|aff|promo|content|pr","product":"ชื่อสินค้า/เรื่อง","headline":"ข้อความบนภาพ (ถ้าเป็นภาพ)","price":"","details":"รายละเอียด","label":"ปุ่ม เช่น สร้างโปสเตอร์นี้"},"chips":["คำถามต่อยอดสั้นๆ 2-3 ข้อ"]}`;
}

export function registerChat(app, { q, auth, wrap, log, me, PUBLIC_URL, makeToken }) {
  const oaReady = () => !!(OA_SECRET() && OA_TOKEN());

  async function quota(uid) {
    const n = (await q("SELECT count(*)::int n FROM chat_messages WHERE user_id=$1 AND role='user' AND created_at > date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'", [uid])).rows[0].n;
    return { used: n, left: Math.max(0, FREE_PER_DAY - n), max: FREE_PER_DAY };
  }

  /** ถามน้องริช: เก็บประวัติ + เรียก Gemini → {reply, draft, chips} */
  async function ask(uid, text, channel) {
    const m = await me(uid);
    const works = (await q('SELECT title, kind, status FROM works WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [uid])).rows;
    const hist = (await q('SELECT role, content FROM chat_messages WHERE user_id=$1 ORDER BY id DESC LIMIT 16', [uid])).rows.reverse();
    await q('INSERT INTO chat_messages(user_id,role,content,channel) VALUES($1,$2,$3,$4)', [uid, 'user', text, channel]);
    const contents = [...hist.map((h) => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.content }] })), { role: 'user', parts: [{ text }] }];
    let out = { reply: 'ขอโทษนะคะ ตอนนี้น้องริชตอบไม่ได้ ลองใหม่อีกครั้งนะ 🙏', draft: null, chips: [] };
    try {
      const r = await fetch(`${API()}/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY() },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt(m, works) }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } }),
        signal: AbortSignal.timeout(60000),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`gemini ${r.status} ${j.error?.message || ''}`);
      const o = JSON.parse((j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').replace(/^```(json)?|```$/g, '').trim());
      const all = [...STYLES.map((s) => ({ id: s.id, kind: 'image' })), ...VIDEO_STYLES.map((s) => ({ id: s.id, kind: 'video' }))];
      let draft = o.draft && typeof o.draft === 'object' ? o.draft : null;
      if (draft) {
        const st = all.find((s) => s.id === draft.style);
        draft = st ? {
          kind: st.kind, style: st.id, goal: GOALS.some((g) => g.id === draft.goal) ? draft.goal : 'sell',
          product: String(draft.product || '').slice(0, 120), headline: String(draft.headline || '').slice(0, 60), price: String(draft.price || '').slice(0, 40),
          details: String(draft.details || '').slice(0, 600), label: String(draft.label || 'สร้างงานนี้').slice(0, 30),
        } : null;
      }
      out = { reply: String(o.reply || '').slice(0, 3000) || out.reply, draft, chips: (Array.isArray(o.chips) ? o.chips : []).map((c) => String(c).slice(0, 60)).slice(0, 3) };
    } catch (e) { log('chat fail', uid, e.message); }
    await q('INSERT INTO chat_messages(user_id,role,content,draft,channel) VALUES($1,$2,$3,$4,$5)', [uid, 'model', out.reply, out.draft, channel]);
    return out;
  }

  // ---------- เว็บ ----------
  app.get('/api/chat', auth, wrap(async (req, res) => {
    const rows = (await q('SELECT id, role, content, draft, channel, created_at FROM chat_messages WHERE user_id=$1 ORDER BY id DESC LIMIT 60', [req.uid])).rows.reverse();
    res.json({ items: rows, quota: await quota(req.uid), oa: oaReady() && OA_ID() ? { id: OA_ID(), url: `https://line.me/R/ti/p/${encodeURIComponent(OA_ID())}` } : null, ready: !!KEY() });
  }));
  app.post('/api/chat', auth, wrap(async (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 1000);
    if (!text) return res.status(400).json({ error: 'พิมพ์ข้อความก่อน' });
    if (!KEY()) return res.status(503).json({ error: 'ผู้ช่วย AI กำลังตั้งค่า' });
    const qu = await quota(req.uid);
    if (qu.left <= 0) return res.status(429).json({ error: `วันนี้คุยครบ ${qu.max} ข้อความแล้ว พรุ่งนี้มาคุยกันใหม่นะ` });
    const out = await ask(req.uid, text, 'web');
    res.json({ ...out, quota: await quota(req.uid) });
  }));
  app.delete('/api/chat', auth, wrap(async (req, res) => { await q('DELETE FROM chat_messages WHERE user_id=$1', [req.uid]); res.json({ ok: true }); }));
  app.put('/api/profile/notify', auth, wrap(async (req, res) => {
    await q('UPDATE profiles SET notify=$2 WHERE user_id=$1', [req.uid, { line: req.body?.line !== false }]);
    res.json({ ok: true });
  }));
  app.get('/api/profile/notify', auth, wrap(async (req, res) => {
    const r = (await q('SELECT notify FROM profiles WHERE user_id=$1', [req.uid])).rows[0];
    const hasLine = (await q("SELECT 1 FROM identities WHERE user_id=$1 AND provider='line'", [req.uid])).rowCount > 0;
    res.json({ line: r?.notify?.line !== false, hasLine, oa: oaReady() && OA_ID() ? { id: OA_ID(), url: `https://line.me/R/ti/p/${encodeURIComponent(OA_ID())}` } : null });
  }));

  // ---------- LINE OA ----------
  async function lineCall(pathname, body) {
    const r = await fetch(`${LINE_API()}${pathname}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${OA_TOKEN()}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`line ${r.status} ${t.slice(0, 200)}`); }
  }
  const textMsg = (t) => ({ type: 'text', text: String(t).slice(0, 4900) });
  const appUrl = (hash = '') => `${PUBLIC_URL}/${hash ? `#${hash}` : ''}`;
  const quick = (chips) => (chips?.length ? { quickReply: { items: chips.slice(0, 3).map((c) => ({ type: 'action', action: { type: 'message', label: c.slice(0, 20), text: c } })) } } : {});

  // LINE userId ของ OA = sub ของ LINE Login เมื่อทั้งสองช่องอยู่ใต้ Provider เดียวกัน
  const userByLine = async (lineId) => (await q("SELECT user_id FROM identities WHERE provider='line' AND subject=$1", [lineId])).rows[0]?.user_id || null;

  app.post('/line/webhook', wrap(async (req, res) => {
    if (!oaReady()) return res.status(503).end();
    const sig = req.headers['x-line-signature'];
    const mac = crypto.createHmac('sha256', OA_SECRET()).update(req.rawBody || Buffer.from('')).digest('base64');
    if (!sig || !req.rawBody || sig.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(mac))) return res.status(401).end();
    res.status(200).end(); // ตอบ LINE ทันที แล้วค่อยประมวลผล
    for (const ev of req.body?.events || []) {
      try {
        const lineId = ev.source?.userId;
        if (!lineId || ev.source?.type !== 'user') continue;
        const uid = await userByLine(lineId);
        if (ev.type === 'follow') {
          await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: [textMsg(uid
            ? 'สวัสดีค่ะ น้องริชเอง 🤖✨\nถามไอเดียคอนเทนต์ ขอแคปชั่น หรือให้ช่วยเลือกแนวคลิปได้เลย\nผลงานเสร็จและเวลาโพสต์ น้องริชจะแจ้งที่นี่นะคะ'
            : `สวัสดีค่ะ น้องริชเอง 🤖✨\nสมัคร/เข้าใช้ Mc Rich ด้วย LINE ก่อน แล้วกลับมาคุยกันได้เลย\n👉 ${appUrl()}`)] });
          continue;
        }
        if (ev.type !== 'message') continue;
        if (!uid) {
          await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: [textMsg(`ยังไม่ได้เชื่อมบัญชีค่ะ เข้า Mc Rich ด้วยปุ่ม LINE ก่อนนะคะ แล้วทักน้องริชได้เลย\n👉 ${appUrl()}`)] });
          continue;
        }
        if (ev.message?.type !== 'text') {
          await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: [textMsg(`ตอนนี้น้องริชอ่านได้เฉพาะข้อความนะคะ ส่งรูปสร้างงานได้ในแอปเลย 👉 ${appUrl('create?new=1')}`)] });
          continue;
        }
        const text = String(ev.message.text || '').trim().slice(0, 1000);
        if (/^(ดาว|เช็คดาว|ยอดดาว)$/.test(text)) {
          const m = await me(uid);
          await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: [textMsg(`⭐ ดาวคงเหลือ ${m.stars} ดาว\nภาพฟรีเหลือ ${m.freeImages.today + m.freeImages.welcome} ภาพ\nเติมดาว 👉 ${appUrl('topup')}`)] });
          continue;
        }
        const qu = await quota(uid);
        if (qu.left <= 0) { await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: [textMsg(`วันนี้คุยครบ ${qu.max} ข้อความแล้วค่ะ พรุ่งนี้มาคุยกันใหม่นะ 🙏`)] }); continue; }
        const out = await ask(uid, text, 'line');
        const msgs = [{ ...textMsg(out.reply), ...(out.draft ? {} : quick(out.chips)) }];
        if (out.draft) {
          // ลิงก์เปิดหน้าสร้างพร้อมกรอกให้แล้ว (ร่างอยู่ในแชท: แอปดึงจากรายการล่าสุด)
          msgs.push({ ...textMsg(`👉 ${out.draft.label}: ${appUrl('chat?draft=last')}`), ...quick(out.chips) });
        }
        await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: msgs });
      } catch (e) { log('line event', e.message); }
    }
  }));

  /** แจ้งเตือนผ่าน LINE (ถ้าเปิดไว้ และบัญชีเข้าด้วย LINE) */
  async function notifyLine(uid, text) {
    if (!oaReady()) return false;
    const r = (await q("SELECT i.subject, p.notify FROM identities i JOIN profiles p ON p.user_id=i.user_id WHERE i.user_id=$1 AND i.provider='line' LIMIT 1", [uid])).rows[0];
    if (!r || r.notify?.line === false) return false;
    try { await lineCall('/v2/bot/message/push', { to: r.subject, messages: [textMsg(text)] }); return true; }
    catch (e) { log('line push', e.message); return false; }
  }
  app.post('/api/chat/line-test', auth, wrap(async (req, res) => {
    const ok = await notifyLine(req.uid, 'ทดสอบแจ้งเตือนจาก Mc Rich ✓ น้องริชจะแจ้งที่นี่เมื่อผลงานเสร็จและถึงเวลาโพสต์');
    res.json({ ok });
  }));

  return { oaReady, notifyLine, appUrl };
}
