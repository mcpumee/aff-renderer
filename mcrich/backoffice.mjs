// Mc Rich — หลังบ้านแอดมิน: ภาพรวม · ผู้ใช้ (ปรับดาว/ระงับ) · ผลงานที่ล้มเหลว · ราคา · เทรนด์หน้าแรก
import * as V from './video.mjs';
import { TIERS } from './create.mjs';

const TH = "AT TIME ZONE 'Asia/Bangkok'";
export function registerBackoffice(app, { q, pool, auth, wrap, log, banned }) {
  const admin = async (req, res, next) => {
    const u = (await q('SELECT is_admin FROM users WHERE id=$1', [req.uid])).rows[0];
    if (!u?.is_admin) return res.status(403).json({ error: 'เฉพาะแอดมิน' });
    next();
  };
  const audit = (uid, action, detail) => q('INSERT INTO audit_log(user_id,action,detail) VALUES($1,$2,$3)', [uid, action, detail]).catch(() => {});

  // ---------- ภาพรวม ----------
  app.get('/api/admin/stats', auth, admin, wrap(async (_req, res) => {
    const one = async (sql) => (await q(sql)).rows[0];
    const d0 = "(date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok')";
    const m0 = "(date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok')";
    const users = await one(`SELECT count(*)::int total, count(*) FILTER (WHERE created_at >= ${d0})::int today,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int week, count(*) FILTER (WHERE last_login_at >= now() - interval '7 days')::int active7,
      count(*) FILTER (WHERE banned)::int banned FROM users`);
    const money = await one(`SELECT COALESCE(sum(amount) FILTER (WHERE paid_at >= ${d0}),0)::int AS today, COALESCE(sum(amount) FILTER (WHERE paid_at >= ${m0}),0)::int AS month,
      COALESCE(sum(amount),0)::int total, count(DISTINCT user_id)::int payers, (SELECT count(*)::int FROM topups WHERE status='review') review FROM topups WHERE status='paid'`);
    const stars = await one(`SELECT COALESCE(-sum(delta) FILTER (WHERE kind IN ('spend','refund') AND created_at >= ${d0}),0)::int spent_today,
      COALESCE(-sum(delta) FILTER (WHERE kind IN ('spend','refund') AND created_at >= ${m0}),0)::int spent_month,
      COALESCE(sum(delta) FILTER (WHERE kind IN ('signup_bonus','referral','admin') AND delta > 0 AND created_at >= ${m0}),0)::int given_month,
      COALESCE(sum(delta),0)::int outstanding FROM star_ledger`);
    const works = await one(`SELECT count(*) FILTER (WHERE created_at >= ${d0})::int today, count(*) FILTER (WHERE created_at >= ${d0} AND kind='video')::int video_today,
      count(*) FILTER (WHERE status='queued')::int queued, count(*) FILTER (WHERE status='working')::int working, count(*) FILTER (WHERE status='review')::int review,
      count(*) FILTER (WHERE status='failed' AND created_at >= now() - interval '24 hours')::int failed24,
      count(*) FILTER (WHERE status='done' AND created_at >= now() - interval '24 hours')::int done24,
      count(*) FILTER (WHERE status='working' AND created_at < now() - interval '30 minutes')::int stuck FROM works`);
    const days = (await q(`SELECT to_char(d,'DD/MM') d, COALESCE((SELECT sum(amount) FROM topups WHERE status='paid' AND (paid_at ${TH})::date = d),0)::int baht,
      COALESCE((SELECT count(*) FROM works WHERE (created_at ${TH})::date = d),0)::int works
      FROM generate_series((now() ${TH})::date - 13, (now() ${TH})::date, '1 day') d ORDER BY d`)).rows;
    const styles = (await q(`SELECT style, kind, count(*)::int n, COALESCE(sum(cost),0)::int stars, count(*) FILTER (WHERE status='failed')::int failed
      FROM works WHERE created_at >= now() - interval '30 days' GROUP BY style, kind ORDER BY n DESC LIMIT 12`)).rows;
    const extra = await one(`SELECT (SELECT count(*)::int FROM auto_plans WHERE active) auto_on, (SELECT count(*)::int FROM schedules WHERE status='scheduled') sched,
      (SELECT count(*)::int FROM chat_messages WHERE role='user' AND created_at >= ${d0}) chats_today`).catch(() => ({}));
    res.json({ users, money, stars, works, days, styles, extra });
  }));

  // ---------- ผู้ใช้ ----------
  const userRow = `SELECT u.id, u.public_id, u.name, u.avatar_url, u.email, u.is_admin, u.banned, u.created_at, u.last_login_at,
      COALESCE((SELECT sum(delta) FROM star_ledger s WHERE s.user_id=u.id),0)::int stars,
      (SELECT count(*) FROM works w WHERE w.user_id=u.id)::int works,
      COALESCE((SELECT sum(amount) FROM topups t WHERE t.user_id=u.id AND t.status='paid'),0)::int paid,
      (SELECT string_agg(provider, ',') FROM identities i WHERE i.user_id=u.id) providers FROM users u`;
  const uview = (u) => ({ id: u.public_id, name: u.name, avatar: u.avatar_url, email: u.email, admin: u.is_admin, banned: u.banned, createdAt: u.created_at,
    lastLogin: u.last_login_at, stars: u.stars, works: u.works, paid: u.paid, providers: u.providers || '' });
  app.get('/api/admin/users', auth, admin, wrap(async (req, res) => {
    const s = String(req.query.q || '').trim().slice(0, 60);
    const sort = { new: 'u.id DESC', paid: 'paid DESC, u.id DESC', active: 'u.last_login_at DESC', stars: 'stars DESC' }[req.query.sort] || 'u.id DESC';
    const { rows } = s
      ? await q(`${userRow} WHERE u.public_id ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1 ORDER BY ${sort} LIMIT 50`, [`%${s.replace(/[%_\\]/g, '\\$&')}%`])
      : await q(`${userRow} ORDER BY ${sort} LIMIT 50`);
    res.json({ items: rows.map(uview) });
  }));
  app.get('/api/admin/users/:pid', auth, admin, wrap(async (req, res) => {
    const u = (await q(`${userRow} WHERE u.public_id=$1`, [String(req.params.pid).toUpperCase()])).rows[0];
    if (!u) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    const ledger = (await q('SELECT delta, kind, note, created_at FROM star_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [u.id])).rows;
    const works = (await q('SELECT id, kind, style, title, status, error, cost, created_at FROM works WHERE user_id=$1 ORDER BY id DESC LIMIT 20', [u.id])).rows;
    res.json({ user: uview(u), ledger, works });
  }));
  app.post('/api/admin/users/:pid/stars', auth, admin, wrap(async (req, res) => {
    const delta = Math.trunc(Number(req.body?.delta) || 0);
    const note = String(req.body?.note || '').trim().slice(0, 120);
    if (!delta || Math.abs(delta) > 100000) return res.status(400).json({ error: 'จำนวนดาวไม่ถูกต้อง' });
    if (!note) return res.status(400).json({ error: 'ใส่เหตุผลด้วย' });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const u = (await c.query('SELECT id FROM users WHERE public_id=$1 FOR UPDATE', [String(req.params.pid).toUpperCase()])).rows[0];
      if (!u) { await c.query('ROLLBACK'); return res.status(404).json({ error: 'ไม่พบผู้ใช้' }); }
      const bal = (await c.query('SELECT COALESCE(sum(delta),0)::int s FROM star_ledger WHERE user_id=$1', [u.id])).rows[0].s;
      if (bal + delta < 0) { await c.query('ROLLBACK'); return res.status(400).json({ error: `หักได้ไม่เกิน ${bal} ดาว` }); }
      await c.query("INSERT INTO star_ledger(user_id,delta,kind,ref,note) VALUES($1,$2,'admin',$3,$4)", [u.id, delta, `by:${req.uid}`, note]);
      await c.query('INSERT INTO audit_log(user_id,action,detail) VALUES($1,$2,$3)', [req.uid, 'admin_stars', { target: u.id, delta, note }]);
      await c.query('COMMIT');
      log('admin stars', req.uid, '→', u.id, delta);
      res.json({ ok: true, stars: bal + delta });
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  }));
  app.post('/api/admin/users/:pid/ban', auth, admin, wrap(async (req, res) => {
    const on = !!req.body?.banned;
    const u = (await q('UPDATE users SET banned=$2 WHERE public_id=$1 AND NOT is_admin RETURNING id', [String(req.params.pid).toUpperCase(), on])).rows[0];
    if (!u) return res.status(400).json({ error: 'ระงับไม่ได้ (ไม่พบ หรือเป็นแอดมิน)' });
    if (on) banned.add(Number(u.id)); else banned.delete(Number(u.id));
    if (on) await q("UPDATE auto_plans SET active=false, last_error='บัญชีถูกระงับ' WHERE user_id=$1", [u.id]);
    audit(req.uid, on ? 'admin_ban' : 'admin_unban', { target: u.id });
    res.json({ ok: true });
  }));

  // ---------- ผลงาน ----------
  app.get('/api/admin/works', auth, admin, wrap(async (req, res) => {
    const st = ['failed', 'working', 'queued', 'review', 'done'].includes(req.query.status) ? req.query.status : 'failed';
    const { rows } = await q(`SELECT w.id, w.kind, w.style, w.title, w.status, w.error, w.cost, w.created_at, w.done_at, u.public_id, u.name,
      (SELECT count(*) FROM star_ledger s WHERE s.kind='refund' AND s.ref=w.id::text)::int refunded
      FROM works w JOIN users u ON u.id=w.user_id WHERE w.status=$1 ORDER BY w.id DESC LIMIT 60`, [st]);
    const errs = (await q(`SELECT left(error, 80) e, count(*)::int n FROM works WHERE status='failed' AND created_at >= now() - interval '7 days' GROUP BY 1 ORDER BY n DESC LIMIT 6`)).rows;
    res.json({ items: rows, errors: errs });
  }));

  // ---------- ราคา ----------
  const priceNow = () => ({
    tiers: Object.fromEntries(TIERS.filter((t) => !t.free).map((t) => [t.id, t.stars])),
    video: { ...V.VIDEO_PRICE }, drama: { ...V.DRAMA_PRICE }, premiumVoice: V.PREMIUM_VOICE_EXTRA,
  });
  const DEFAULTS = priceNow();
  function apply(p) {
    const n = (v, d) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 500 ? Number(v) : d);
    for (const t of TIERS) if (!t.free && p?.tiers?.[t.id] != null) t.stars = n(p.tiers[t.id], t.stars);
    for (const k of Object.keys(V.VIDEO_PRICE)) if (p?.video?.[k] != null) V.VIDEO_PRICE[k] = n(p.video[k], V.VIDEO_PRICE[k]);
    for (const k of Object.keys(V.DRAMA_PRICE)) if (p?.drama?.[k] != null) V.DRAMA_PRICE[k] = n(p.drama[k], V.DRAMA_PRICE[k]);
    if (p?.premiumVoice != null) V.setPremiumExtra(n(p.premiumVoice, V.PREMIUM_VOICE_EXTRA));
  }
  async function load() {
    const r = (await q("SELECT value FROM app_settings WHERE key='prices'")).rows[0];
    if (r) { apply(r.value); log('ราคาจากหลังบ้าน', JSON.stringify(priceNow())); }
  }
  app.get('/api/admin/prices', auth, admin, wrap(async (_req, res) => res.json({ prices: priceNow(), defaults: DEFAULTS,
    labels: { tiers: Object.fromEntries(TIERS.map((t) => [t.id, t.label])) } })));
  app.put('/api/admin/prices', auth, admin, wrap(async (req, res) => {
    if (req.body?.reset) { apply(DEFAULTS); await q("DELETE FROM app_settings WHERE key='prices'"); }
    else {
      apply(req.body || {});
      await q("INSERT INTO app_settings(key,value) VALUES('prices',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [priceNow()]);
    }
    audit(req.uid, 'admin_prices', priceNow());
    res.json({ prices: priceNow() });
  }));

  // ---------- เทรนด์หน้าแรก ----------
  const tview = (t) => ({ id: t.id, title: t.title, style: t.style, kind: t.kind, price: t.price, badge: t.badge, color: t.color, tags: t.tags, active: t.active, sort: t.sort });
  const tclean = (b) => ({
    title: String(b.title || '').trim().slice(0, 60), style: String(b.style || '').trim().slice(0, 40), kind: b.kind === 'image' ? 'image' : 'video',
    price: String(b.price || '').slice(0, 30), badge: String(b.badge || '').slice(0, 20), color: /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#333333',
    tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map((x) => String(x).trim().slice(0, 30)).filter(Boolean).slice(0, 12),
    sort: Math.trunc(Number(b.sort) || 0),
  });
  app.get('/api/admin/trends', auth, admin, wrap(async (_req, res) => res.json({ items: (await q('SELECT * FROM trends ORDER BY sort, id')).rows.map(tview) })));
  app.post('/api/admin/trends', auth, admin, wrap(async (req, res) => {
    const t = tclean(req.body || {});
    if (!t.title || !t.style) return res.status(400).json({ error: 'ใส่ชื่อและรหัสแนว' });
    const r = (await q('INSERT INTO trends(title,style,kind,price,badge,color,tags,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [t.title, t.style, t.kind, t.price, t.badge, t.color, t.tags, t.sort])).rows[0];
    res.json(tview(r));
  }));
  app.patch('/api/admin/trends/:id', auth, admin, wrap(async (req, res) => {
    const id = Number(req.params.id) || 0;
    const cur = (await q('SELECT * FROM trends WHERE id=$1', [id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'ไม่พบ' });
    const t = tclean({ ...tview(cur), ...req.body });
    const active = typeof req.body?.active === 'boolean' ? req.body.active : cur.active;
    const r = (await q('UPDATE trends SET title=$2,style=$3,kind=$4,price=$5,badge=$6,color=$7,tags=$8,sort=$9,active=$10 WHERE id=$1 RETURNING *',
      [id, t.title || cur.title, t.style || cur.style, t.kind, t.price, t.badge, t.color, t.tags, t.sort, active])).rows[0];
    res.json(tview(r));
  }));
  app.delete('/api/admin/trends/:id', auth, admin, wrap(async (req, res) => { await q('DELETE FROM trends WHERE id=$1', [Number(req.params.id) || 0]); res.json({ ok: true }); }));

  return { load, start: async () => { (await q('SELECT id FROM users WHERE banned')).rows.forEach((r) => banned.add(Number(r.id))); await load(); } };
}
