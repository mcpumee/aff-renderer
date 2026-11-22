// Mc Rich — ตั้งเวลาโพสต์ + แจ้งเตือนเข้ามือถือ (Web Push)
// ตอนนี้: ถึงเวลา → แจ้งเตือน กดแล้วเปิดผลงานพร้อมแคปชั่น · เฟสโพสต์ตรง: ใช้ตารางเดียวกันโพสต์อัตโนมัติ
import webpush from 'web-push';

const PLATFORMS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', shopee: 'Shopee', lazada: 'Lazada', line: 'LINE', youtube: 'YouTube' };

export function registerSchedule(app, { q, auth, wrap, log, PUBLIC_URL }) {
  let vapid = null;
  let notify = async () => false;
  async function keys() {
    if (vapid) return vapid;
    const r = (await q("SELECT value FROM app_settings WHERE key='vapid'")).rows[0];
    if (r) vapid = r.value;
    else {
      vapid = webpush.generateVAPIDKeys();
      await q("INSERT INTO app_settings(key,value) VALUES('vapid',$1) ON CONFLICT (key) DO NOTHING", [vapid]);
      vapid = (await q("SELECT value FROM app_settings WHERE key='vapid'")).rows[0].value;
    }
    webpush.setVapidDetails(`mailto:noreply@${new URL(PUBLIC_URL).hostname}`, vapid.publicKey, vapid.privateKey);
    return vapid;
  }
  async function push(uid, payload) {
    await keys();
    const subs = (await q('SELECT endpoint, keys FROM push_subs WHERE user_id=$1', [uid])).rows;
    let ok = 0;
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 }); ok++; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await q('DELETE FROM push_subs WHERE endpoint=$1', [s.endpoint]); else log('push fail', e.statusCode || e.message); }
    }
    return ok;
  }

  app.get('/api/push/key', auth, wrap(async (_req, res) => res.json({ key: (await keys()).publicKey })));
  app.post('/api/push/subscribe', auth, wrap(async (req, res) => {
    const s = req.body || {};
    if (!/^https:\/\//.test(s.endpoint || '') || !s.keys?.p256dh || !s.keys?.auth) return res.status(400).json({ error: 'subscription' });
    await q(`INSERT INTO push_subs(endpoint,user_id,keys,ua) VALUES($1,$2,$3,$4) ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, keys=EXCLUDED.keys`,
      [s.endpoint.slice(0, 800), req.uid, { p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100) }, String(req.headers['user-agent'] || '').slice(0, 200)]);
    res.json({ ok: true });
  }));
  app.post('/api/push/test', auth, wrap(async (req, res) => {
    const n = await push(req.uid, { title: 'Mc Rich', body: 'แจ้งเตือนใช้งานได้แล้ว ✓', url: './#plan' });
    res.json({ sent: n });
  }));

  const view = (s) => ({ id: s.id, workId: s.work_id, platform: s.platform, platformLabel: PLATFORMS[s.platform] || s.platform, at: s.at, note: s.note, status: s.status,
    title: s.title, thumb: s.files?.[0]?.thumb ? `api/works/${s.work_id}/file/0?thumb=1` : '', kind: s.kind });
  app.get('/api/schedules', auth, wrap(async (req, res) => {
    const { rows } = await q(`SELECT s.*, w.title, w.files, w.kind FROM schedules s LEFT JOIN works w ON w.id=s.work_id
      WHERE s.user_id=$1 AND (s.status IN ('scheduled','due') OR s.at > now() - interval '7 days') AND s.status <> 'canceled'
      ${req.query.work ? 'AND s.work_id=$2' : ''} ORDER BY s.at LIMIT 200`, req.query.work ? [req.uid, Number(req.query.work) || 0] : [req.uid]);
    res.json({ items: rows.map(view) });
  }));
  app.post('/api/schedules', auth, wrap(async (req, res) => {
    const b = req.body || {};
    const w = (await q('SELECT id FROM works WHERE id=$1 AND user_id=$2', [Number(b.workId) || 0, req.uid])).rows[0];
    if (!w) return res.status(404).json({ error: 'ไม่พบผลงาน' });
    const plats = (Array.isArray(b.platforms) ? b.platforms : []).filter((p) => PLATFORMS[p]);
    if (!plats.length) return res.status(400).json({ error: 'เลือกแพลตฟอร์มอย่างน้อย 1 ที่' });
    const at = new Date(b.at);
    if (Number.isNaN(at.getTime()) || at < new Date(Date.now() - 60e3)) return res.status(400).json({ error: 'เลือกเวลาในอนาคต' });
    if (at > new Date(Date.now() + 60 * 864e5)) return res.status(400).json({ error: 'ตั้งล่วงหน้าได้ไม่เกิน 60 วัน' });
    const n = (await q("SELECT count(*)::int n FROM schedules WHERE user_id=$1 AND status='scheduled'", [req.uid])).rows[0].n;
    if (n + plats.length > 200) return res.status(429).json({ error: 'คิวโพสต์เต็ม (200 รายการ)' });
    for (const p of plats) await q('INSERT INTO schedules(user_id,work_id,platform,at,note) VALUES($1,$2,$3,$4,$5)', [req.uid, w.id, p, at, String(b.note || '').slice(0, 200)]);
    res.json({ ok: true, n: plats.length });
  }));
  app.patch('/api/schedules/:id', auth, wrap(async (req, res) => {
    const st = ['posted', 'canceled', 'scheduled'].includes(req.body?.status) ? req.body.status : null;
    const at = req.body?.at ? new Date(req.body.at) : null;
    const s = (await q('SELECT * FROM schedules WHERE id=$1 AND user_id=$2', [Number(req.params.id) || 0, req.uid])).rows[0];
    if (!s) return res.status(404).json({ error: 'ไม่พบรายการ' });
    if (at && !Number.isNaN(at.getTime())) await q("UPDATE schedules SET at=$2, status='scheduled' WHERE id=$1", [s.id, at]);
    if (st) await q(`UPDATE schedules SET status=$2, done_at=${st === 'posted' ? 'now()' : 'NULL'} WHERE id=$1`, [s.id, st]);
    // โพสต์แล้ว → ติ๊กในผลงานด้วย
    if (st === 'posted' && s.work_id) {
      const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
      await q(`UPDATE works SET posted = posted || jsonb_build_object($2::text, $3::text) WHERE id=$1`, [s.work_id, s.platform, day]);
    }
    res.json({ ok: true });
  }));

  // ทุก 1 นาที: รายการที่ถึงเวลา → แจ้งเตือน
  async function tick() {
    const { rows } = await q(`UPDATE schedules s SET status='due' FROM works w
      WHERE s.status='scheduled' AND s.at <= now() + interval '30 seconds' AND w.id = s.work_id
      RETURNING s.id, s.user_id, s.work_id, s.platform, w.title`);
    for (const r of rows) {
      const n = await push(r.user_id, { title: `ถึงเวลาโพสต์ ${PLATFORMS[r.platform] || r.platform} 📣`, body: `${r.title || 'ผลงาน'} · แตะเพื่อเปิด คัดลอกแคปชั่นแล้วโพสต์ได้เลย`, url: `./#work?id=${r.work_id}&post=${r.platform}`, tag: `s${r.id}` }).catch(() => 0);
      const l = await notify(r.user_id, `📣 ถึงเวลาโพสต์ ${PLATFORMS[r.platform] || r.platform}\n${r.title || 'ผลงาน'}\nคัดลอกแคปชั่น + บันทึกคลิป 👉 ${PUBLIC_URL}/#work?id=${r.work_id}&post=${r.platform}`).catch(() => false);
      log('schedule due', r.id, r.platform, `push=${n}`, `line=${l}`);
    }
  }
  function start() { setInterval(() => tick().catch((e) => log('schedule tick', e.message)), 60e3).unref(); setTimeout(() => tick().catch(() => {}), 15e3).unref(); }
  return { start, push, setNotify: (fn) => { notify = fn; } };
}
