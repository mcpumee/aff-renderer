// Mc Rich — ผู้ช่วย AI "น้องริช" (แชทในแอป + LINE OA) และแจ้งเตือนผ่าน LINE
import crypto from 'node:crypto';
import sharp from 'sharp';
import { STYLES, GOALS } from './create.mjs';
import { VIDEO_STYLES, VIDEO_PRICE, DRAMA_PRICE } from './video.mjs';

const API = () => (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const KEY = () => process.env.GEMINI_API_KEY || '';
const MODEL = process.env.MCRICH_CHAT_MODEL || process.env.MCRICH_TEXT_MODEL || 'gemini-flash-latest';
const OA_SECRET = () => process.env.LINEOA_SECRET || '';
const OA_TOKEN = () => process.env.LINEOA_TOKEN || '';
const OA_ID = () => (process.env.LINEOA_ID || '').trim();
const LINE_API = () => (process.env.LINE_API_URL || 'https://api.line.me').replace(/\/+$/, '');
const LINE_DATA = () => (process.env.LINE_DATA_URL || process.env.LINE_API_URL || 'https://api-data.line.me').replace(/\/+$/, '');
const RM_VERSION = 'v2';
// บังคับรูปแบบคำตอบ (กันโมเดลตอบนอกรูปแบบ)
const CHAT_SCHEMA = {
  type: 'OBJECT', required: ['reply'],
  properties: {
    reply: { type: 'STRING' },
    draft: { type: 'OBJECT', nullable: true, properties: {
      kind: { type: 'STRING' }, style: { type: 'STRING' }, goal: { type: 'STRING' }, product: { type: 'STRING' },
      headline: { type: 'STRING' }, price: { type: 'STRING' }, details: { type: 'STRING' }, label: { type: 'STRING' } } },
    chips: { type: 'ARRAY', items: { type: 'STRING' } },
  },
};
const FREE_PER_DAY = Number(process.env.MCRICH_CHAT_FREE || 30);

const styleList = () => [
  ...STYLES.map((s) => `${s.id} = ภาพ: ${s.label}`),
  ...VIDEO_STYLES.map((s) => `${s.id} = คลิป: ${s.label}`),
].join('\n');

function systemPrompt(m, works) {
  const b = m.brand || {};
  return `คุณคือ "น้องริช" ผู้ช่วย AI ของแอป Mc Rich (แอปสร้างภาพและคลิปขายของ/คอนเทนต์/ประชาสัมพันธ์ด้วย AI จ่ายด้วยดาว 1 ดาว = 1 บาท)
บุคลิก: ผู้หญิง วัยรุ่น Gen Z สดใส ขี้เล่น พลังบวก แทนตัวเองว่า "ริช" หรือ "เค้า" ลงท้าย "ค่า/น้า/นะคะ" ใช้คำวัยรุ่นพอดีๆ (ตึงมาก, ปังมาก, ฉ่ำ, คือดีย์, งานดีย์, จึ้ง, ไม่ไหวแล้วว) อีโมจิ 1-2 ตัว
สไตล์ตอบ: สั้นมาก 1-2 ประโยค (ไม่เกิน 2 บรรทัด) เหมือนแชทกับเพื่อน · ถามกลับสั้นๆ ทีละคำถามเพื่อเข้าใจความต้องการก่อน เช่น "ขายอะไรอยู่น้า?" "อยากได้ภาพหรือคลิปดีคะ?" · ห้ามอธิบายยาว ห้ามลิสต์หลายข้อ ห้ามเขียนแผนคอนเทนต์หรือแคปชั่นยาวเอง · พอรู้ว่าอยากทำอะไรแล้ว ให้เสนองาน 1 ชิ้นผ่าน "draft" แล้วชวนกดสร้างสั้นๆ (ให้แอปทำงานหนักแทน) · ถ้าผู้ใช้ขอแคปชั่นตรงๆ ให้เขียนสั้นๆ 1-2 บรรทัดพอ
ช่วยได้: ถามความต้องการแล้วพาไปสร้างภาพ/คลิปที่เหมาะ แนะนำการใช้แอป ตอบเรื่องดาว ผลงาน การตั้งเวลาโพสต์
กฎ: ห้ามแนะนำคำโฆษณาเกินจริงหรือผิดกฎ อย. · ห้ามสัญญายอดขาย · ไม่รู้ให้บอกตรงๆ · เรื่องเงิน/คืนเงิน/ปัญหาระบบให้แนะนำติดต่อแอดมิน · ไม่ตอบเรื่องที่ไม่เกี่ยวกับธุรกิจ/คอนเทนต์ยาวเกินไป ให้ตอบสั้นแล้วชวนกลับมาเรื่องงาน
ข้อมูลผู้ใช้: ชื่อ ${m.name || '-'} · ดาวคงเหลือ ${m.stars} · ภาพฟรีเหลือ ${m.freeImages.today + m.freeImages.welcome} · ร้าน/แบรนด์ ${b.shopName || '-'} · ความสนใจ ${JSON.stringify(m.interests || {})}
ผลงานล่าสุด: ${works.map((w) => `${w.title} (${w.kind === 'video' ? 'คลิป' : 'ภาพ'}, ${w.status})`).join(' / ') || '-'}
ราคาโดยประมาณ: ภาพ 5–16 ดาว (ภาพฟรีวันละ 1) · คลิปเปิดลุ้น/ขายของ 12–20 · Top N 15–20 · ละคร 25–35 · ใส่ซับคลิปถ่ายเอง 6–12 · ความรู้/ร้าน/ประชาสัมพันธ์ 12–20
แนวงานในแอป (id = ชื่อ):
${styleList()}
เป้าหมาย (goal): ${GOALS.map((g) => `${g.id}=${g.label}`).join(', ')}
ตัวอย่างโทน:
ผู้ใช้: ช่วยคิดไอเดีย → ริช: "ได้เลยค่า ✨ ขายอะไรอยู่น้า?" chips: ["ของกิน","เสื้อผ้า","ของเล่น"]
ผู้ใช้: ขอไอเดียคลิปขายของเล่น → ริช: "ของเล่นต้องคลิปเปิดกล่องสุ่มเลยค่า ลุ้นฉ่ำ เด็กๆ ชอบมาก 🎁 เอาแบบนี้ไหมน้า?" + draft คลิป v_mystery
ผู้ใช้: ราคาเท่าไหร่ → ริช: "คลิปนี้ประมาณ 12-20 ดาวค่า ยังไม่ตัดจนกว่าจะกดยืนยันน้า"
ถ้าผู้ใช้อยากสร้างงาน หรือคุณแนะนำงานชิ้นที่ชัดเจน ให้ใส่ "draft" เพื่อให้ผู้ใช้กดสร้างต่อได้ทันที (ไม่ตัดดาวจนกว่าเขาจะยืนยันเอง) ถ้าไม่ใช่ให้ draft เป็น null
ตอบเป็น JSON เท่านั้น: {"reply":"ข้อความตอบ","draft":null หรือ {"kind":"image|video","style":"id จากรายการ","goal":"sell|aff|promo|content|pr","product":"ชื่อสินค้า/เรื่อง","headline":"ข้อความบนภาพ (ถ้าเป็นภาพ)","price":"","details":"รายละเอียด","label":"ปุ่ม เช่น สร้างโปสเตอร์นี้"},"chips":["ตัวเลือกคำตอบสั้นๆ ให้ผู้ใช้กดตอบคำถามของคุณ 2-3 ข้อ ข้อละไม่เกิน 12 ตัวอักษร"]}`;
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
    const hist = (await q("SELECT role, content FROM chat_messages WHERE user_id=$1 AND created_at > now() - interval '2 days' ORDER BY id DESC LIMIT 10", [uid])).rows.reverse()
      .filter((h) => !/^แง ริชค้าง|^ขอโทษนะคะ ตอนนี้น้องริช/.test(h.content));
    await q('INSERT INTO chat_messages(user_id,role,content,channel) VALUES($1,$2,$3,$4)', [uid, 'user', text, channel]);
    const contents = [...hist.map((h) => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.content.slice(0, 400) }] })), { role: 'user', parts: [{ text }] }];
    let out = { reply: 'แง ริชค้างแป๊บ ลองพิมพ์ใหม่อีกทีน้า 🥺', draft: null, chips: [] };
    try {
      const r = await fetch(`${API()}/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY() },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt(m, works) }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.9, responseSchema: CHAT_SCHEMA } }),
        signal: AbortSignal.timeout(60000),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`gemini ${r.status} ${j.error?.message || ''}`);
      const raw = (j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').replace(/^```(json)?|```$/g, '').trim();
      let o;
      try { o = JSON.parse(raw); } catch {
        const m2 = raw.match(/\{[\s\S]*\}/);
        try { o = JSON.parse(m2 ? m2[0] : ''); } catch { o = { reply: raw.replace(/[{}"]/g, '').slice(0, 300), draft: null, chips: [] }; }
        log('chat json fallback', uid, j.candidates?.[0]?.finishReason || '', raw.slice(0, 120));
      }
      if (o.reply) o.reply = String(o.reply).replace(/\*\*|__|^#+\s/gm, '');
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
      out = { reply: String(o.reply || '').slice(0, 3000) || out.reply, draft, chips: (Array.isArray(o.chips) ? o.chips : []).map((c) => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 3) };
    } catch (e) { log('chat fail', uid, e.message.slice(0, 300)); }
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
  // ปุ่มตอบด่วน: ป้ายสั้น (LINE ตัดที่ 20 ตัว แต่จอมือถือเห็นราว 12) ข้อความที่ส่งยังเต็ม
  const short = (c) => { const a = [...String(c)]; return a.length > 12 ? a.slice(0, 11).join('') + '…' : a.join(''); };
  const quick = (chips) => (chips?.length ? { quickReply: { items: chips.slice(0, 3).map((c) => ({ type: 'action', action: { type: 'message', label: short(c), text: String(c).slice(0, 300) } })) } } : {});
  // ไข่ปลา "กำลังพิมพ์…" ระหว่างน้องริชคิด
  const loading = (chatId) => lineCall('/v2/bot/chat/loading/start', { chatId, loadingSeconds: 20 }).catch(() => {});
  const estStars = (d) => {
    if (d.kind === 'image') return 'เริ่ม 5 ดาว (มีภาพฟรีวันละ 1)';
    if (d.style === 'v_drama') return `${DRAMA_PRICE[4]}–${DRAMA_PRICE[6]} ดาว`;
    if (d.style === 'v_self') return '6–12 ดาว';
    return `${VIDEO_PRICE[15]}–${VIDEO_PRICE[45]} ดาว`;
  };
  const styleLabel = (id) => [...STYLES, ...VIDEO_STYLES].find((x) => x.id === id)?.label || '';
  const styleEmoji = (id) => [...STYLES, ...VIDEO_STYLES].find((x) => x.id === id)?.emoji || '✨';
  const styleColor = (id) => [...STYLES, ...VIDEO_STYLES].find((x) => x.id === id)?.color || '#1C2410';
  /** การ์ดชวนสร้างงาน (Flex) */
  const draftCard = (d) => ({
    type: 'flex', altText: `น้องริชแนะนำ: ${d.label}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: { type: 'box', layout: 'vertical', backgroundColor: styleColor(d.style), paddingAll: '16px', contents: [
        { type: 'text', text: `${styleEmoji(d.style)} ${d.kind === 'video' ? 'คลิป' : 'ภาพ'}แนะนำ`, color: '#FFFFFFCC', size: 'xs', weight: 'bold' },
        { type: 'text', text: styleLabel(d.style) || d.label, color: '#FFFFFF', size: 'lg', weight: 'bold', wrap: true },
      ] },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px', contents: [
        ...(d.product ? [{ type: 'text', text: d.product, weight: 'bold', size: 'md', wrap: true }] : []),
        ...(d.headline ? [{ type: 'text', text: `“${d.headline}”`, size: 'sm', color: '#555555', wrap: true }] : []),
        ...(d.details ? [{ type: 'text', text: d.details.slice(0, 120), size: 'sm', color: '#777777', wrap: true, maxLines: 3 }] : []),
        { type: 'box', layout: 'baseline', margin: 'md', contents: [
          { type: 'text', text: '⭐', size: 'sm', flex: 0 }, { type: 'text', text: estStars(d), size: 'sm', color: '#111111', margin: 'sm', wrap: true },
        ] },
        { type: 'text', text: 'ยังไม่ตัดดาว จนกว่าจะกดยืนยันในแอป', size: 'xxs', color: '#999999', wrap: true },
      ] },
      footer: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px', contents: [
        { type: 'button', style: 'primary', color: '#7BB31A', height: 'sm', action: { type: 'uri', label: `✨ ${d.label}`.slice(0, 40), uri: appUrl('chat?draft=last') } },
        { type: 'button', style: 'link', height: 'sm', action: { type: 'message', label: 'ขอแนวอื่น', text: 'ขอแนวอื่นอีก' } },
      ] },
    },
  });
  /** การ์ดต้อนรับ */
  const welcomeCard = (linked) => ({
    type: 'flex', altText: 'ยินดีต้อนรับสู่ Mc Rich',
    contents: {
      type: 'bubble', size: 'kilo',
      body: { type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '18px', backgroundColor: '#0B0C0F', contents: [
        { type: 'text', text: 'Mc Rich 🤖✨', color: '#C8F94A', weight: 'bold', size: 'xl' },
        { type: 'text', text: linked ? 'ริชมาแล้วค่าา ✨ บอกริชว่าขายอะไรอยู่ เดี๋ยวพาไปทำภาพ/คลิปปังๆ ให้เลย ผลงานเสร็จริชทักบอกนะ' : 'ทำภาพขายของ คลิปเปิดกล่อง ละครสั้น ด้วย AI ในมือถือ คือดีย์มาก สมัครด้วย LINE รับภาพฟรี 10 ภาพเลยค่า 🎁', color: '#F4F6F8', size: 'sm', wrap: true },
      ] },
      footer: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px', backgroundColor: '#0B0C0F', contents: linked ? [
        { type: 'button', style: 'primary', color: '#7BB31A', height: 'sm', action: { type: 'uri', label: '🎨 สร้างงานเลย', uri: appUrl('create?new=1') } },
        { type: 'button', style: 'secondary', height: 'sm', action: { type: 'message', label: '💬 คุยกับริช', text: 'ริชช่วยหน่อย' } },
      ] : [
        { type: 'button', style: 'primary', color: '#7BB31A', height: 'sm', action: { type: 'uri', label: '🎁 สมัครฟรี รับภาพฟรี', uri: appUrl() } },
      ] },
    },
  });

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
          await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: [welcomeCard(!!uid)] });
          continue;
        }
        if (ev.type !== 'message') continue;
        if (!uid) {
          await lineCall('/v2/bot/message/reply', { replyToken: ev.replyToken, messages: [welcomeCard(false)] });
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
        await loading(lineId);
        const out = await ask(uid, text, 'line');
        const msgs = [{ ...textMsg(out.reply), ...(out.draft ? {} : quick(out.chips)) }];
        // งานที่แนะนำ → การ์ดชวนสร้าง (เปิดแอปพร้อมกรอกให้แล้ว)
        if (out.draft) msgs.push({ ...draftCard(out.draft), ...quick(out.chips) });
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

  // ---------- ริชเมนู (เมนูล่างในแชท LINE) ----------
  async function richMenuImage() {
    const W = 2500, H = 1686, cw = W / 3, ch = H / 2;
    // ไอคอนวาดเอง (ระบบเรนเดอร์ภาพไม่รองรับอีโมจิสี)
    const icon = (k, cx, cy, c) => ({
      create: `<circle cx="${cx}" cy="${cy}" r="110" fill="none" stroke="${c}" stroke-width="22"/><path d="M${cx - 55} ${cy}h110M${cx} ${cy - 55}v110" stroke="${c}" stroke-width="26" stroke-linecap="round"/>`,
      works: `<rect x="${cx - 120}" y="${cy - 90}" width="240" height="180" rx="30" fill="none" stroke="${c}" stroke-width="22"/><path d="M${cx - 30} ${cy - 45}L${cx + 50} ${cy}L${cx - 30} ${cy + 45}Z" fill="${c}"/>`,
      chat: `<path d="M${cx - 120} ${cy - 90}h240a30 30 0 0 1 30 30v110a30 30 0 0 1-30 30h-130l-70 55v-55h-40a30 30 0 0 1-30-30v-110a30 30 0 0 1 30-30z" fill="none" stroke="${c}" stroke-width="22" stroke-linejoin="round"/><circle cx="${cx - 55}" cy="${cy - 5}" r="17" fill="${c}"/><circle cx="${cx}" cy="${cy - 5}" r="17" fill="${c}"/><circle cx="${cx + 55}" cy="${cy - 5}" r="17" fill="${c}"/>`,
      star: `<path d="M${cx} ${cy - 120}l35 75 82 10-60 57 16 82-73-41-73 41 16-82-60-57 82-10z" fill="${c}"/>`,
      topup: `<rect x="${cx - 130}" y="${cy - 85}" width="260" height="170" rx="26" fill="none" stroke="${c}" stroke-width="22"/><path d="M${cx - 130} ${cy - 30}h260" stroke="${c}" stroke-width="26"/><path d="M${cx + 40} ${cy + 40}h50" stroke="${c}" stroke-width="22" stroke-linecap="round"/>`,
      plan: `<rect x="${cx - 115}" y="${cy - 95}" width="230" height="205" rx="26" fill="none" stroke="${c}" stroke-width="22"/><path d="M${cx - 115} ${cy - 30}h230M${cx - 60} ${cy - 125}v55M${cx + 60} ${cy - 125}v55" stroke="${c}" stroke-width="22" stroke-linecap="round"/><path d="M${cx - 50} ${cy + 40}l35 35 70-75" fill="none" stroke="${c}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`,
    }[k]);
    const cells = [['create', 'สร้างงาน', 'ภาพ · คลิป'], ['works', 'ผลงานของฉัน', 'ดู · บันทึก'], ['chat', 'คุยน้องริช', 'ไอเดีย · แคปชั่น'],
      ['star', 'ดาวของฉัน', 'เช็กยอด'], ['topup', 'เติมดาว', 'พร้อมเพย์'], ['plan', 'ปฏิทินโพสต์', 'ตั้งเวลา']];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0B0C0F"/>
      ${cells.map(([k, t, sub], i) => { const x = (i % 3) * cw, y = Math.floor(i / 3) * ch, hi = i === 0;
        return `<rect x="${x + 18}" y="${y + 18}" width="${cw - 36}" height="${ch - 36}" rx="48" fill="${hi ? '#C8F94A' : '#16181D'}" stroke="#2A2E36" stroke-width="4"/>
        ${icon(k, x + cw / 2, y + 250, hi ? '#0B0B0D' : '#C8F94A')}
        <text x="${x + cw / 2}" y="${y + 540}" font-size="112" font-weight="700" text-anchor="middle" fill="${hi ? '#0B0B0D' : '#FFFFFF'}" font-family="Garuda, Loma, sans-serif">${t}</text>
        <text x="${x + cw / 2}" y="${y + 660}" font-size="70" text-anchor="middle" fill="${hi ? '#2B3A0B' : '#8B93A1'}" font-family="Garuda, Loma, sans-serif">${sub}</text>`; }).join('')}</svg>`;
    return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  }
  async function installRichMenu() {
    const H = { authorization: `Bearer ${OA_TOKEN()}` };
    const list = await fetch(`${LINE_API()}/v2/bot/richmenu/list`, { headers: H }).then((r) => r.json()).catch(() => ({}));
    const W = 2500, Hh = 1686, cw = Math.floor(W / 3), ch = Math.floor(Hh / 2);
    const acts = [
      { type: 'uri', uri: appUrl('create?new=1') }, { type: 'uri', uri: appUrl('works') }, { type: 'message', text: 'ริชช่วยหน่อย' },
      { type: 'message', text: 'ดาว' }, { type: 'uri', uri: appUrl('topup') }, { type: 'uri', uri: appUrl('plan') },
    ];
    const body = { size: { width: W, height: Hh }, selected: true, name: `mcrich-main-${RM_VERSION}`, chatBarText: 'เมนู Mc Rich',
      areas: acts.map((a, i) => ({ bounds: { x: (i % 3) * cw, y: Math.floor(i / 3) * ch, width: cw, height: ch }, action: a })) };
    const r = await fetch(`${LINE_API()}/v2/bot/richmenu`, { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.richMenuId) throw new Error(`richmenu ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    const up = await fetch(`${LINE_DATA()}/v2/bot/richmenu/${j.richMenuId}/content`, { method: 'POST', headers: { ...H, 'content-type': 'image/png' }, body: await richMenuImage() });
    if (!up.ok) throw new Error(`richmenu image ${up.status} ${(await up.text()).slice(0, 200)}`);
    const def = await fetch(`${LINE_API()}/v2/bot/user/all/richmenu/${j.richMenuId}`, { method: 'POST', headers: H });
    if (!def.ok) throw new Error(`richmenu default ${def.status}`);
    for (const m of list.richmenus || []) if (String(m.name || '').startsWith('mcrich-main') && m.richMenuId !== j.richMenuId) await fetch(`${LINE_API()}/v2/bot/richmenu/${m.richMenuId}`, { method: 'DELETE', headers: H }).catch(() => {});
    await q("INSERT INTO app_settings(key,value) VALUES('richmenu',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [{ version: RM_VERSION, id: j.richMenuId, url: PUBLIC_URL }]);
    log('ตั้งริชเมนู LINE แล้ว', j.richMenuId);
    return j.richMenuId;
  }
  app.post('/api/admin/line/richmenu', auth, wrap(async (req, res) => {
    const a = (await q('SELECT is_admin FROM users WHERE id=$1', [req.uid])).rows[0];
    if (!a?.is_admin) return res.status(403).json({ error: 'admin only' });
    if (!oaReady()) return res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า LINE OA' });
    try { res.json({ id: await installRichMenu() }); } catch (e) { res.status(502).json({ error: e.message }); }
  }));
  // ตั้งริชเมนูอัตโนมัติครั้งแรก / เมื่อเปลี่ยนรุ่นหรือโดเมน
  function start() {
    if (!oaReady()) return;
    setTimeout(async () => {
      try {
        const cur = (await q("SELECT value FROM app_settings WHERE key='richmenu'")).rows[0]?.value;
        if (!cur || cur.version !== RM_VERSION || cur.url !== PUBLIC_URL) await installRichMenu();
      } catch (e) { log('richmenu', e.message); }
    }, 8000).unref();
  }

  return { oaReady, notifyLine, appUrl, start };
}
