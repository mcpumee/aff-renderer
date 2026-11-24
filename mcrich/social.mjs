// Mc Rich — โพสต์ตรงจากแอป: YouTube Shorts · Facebook Page (Reels/รูป) · Instagram (Reels/รูป)
// เชื่อมบัญชีด้วย OAuth ของแต่ละเจ้า · token เข้ารหัสในฐานข้อมูล · โพสต์ทันทีหรือตั้งเวลา (ใช้ตาราง schedules เดิม)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const GV = () => process.env.META_GRAPH_VER || 'v23.0';
const GBASE = () => (process.env.META_GRAPH_BASE || 'https://graph.facebook.com').replace(/\/+$/, '');
const GRAPH = () => `${GBASE()}/${GV()}`;
const RUPLOAD = () => (process.env.META_RUPLOAD_BASE || 'https://rupload.facebook.com').replace(/\/+$/, '');
const KIND_PLAT = { youtube: 'youtube', fbpage: 'facebook', igbiz: 'instagram' };
const KIND_LABEL = { youtube: 'YouTube', fbpage: 'Facebook Page', igbiz: 'Instagram' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function registerSocial(app, { q, auth, wrap, log, DATA_DIR, rand, PUBLIC_URL, SECRET, makeToken, readToken, getCookie, setCookie, G_ID, G_SECRET, probe, notify = async () => {} }) {
  const WORK_DIR = path.join(DATA_DIR, 'works');
  const META_ID = () => process.env.META_APP_ID || '';
  const META_SECRET = () => process.env.META_APP_SECRET || '';
  const ready = { youtube: () => !!(G_ID && G_SECRET), meta: () => !!(META_ID() && META_SECRET()) };
  const ekey = crypto.createHash('sha256').update(`${SECRET}|social`).digest();
  const enc = (s) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', ekey, iv); const d = Buffer.concat([c.update(s, 'utf8'), c.final()]); return [iv, c.getAuthTag(), d].map((b) => b.toString('base64url')).join('.'); };
  const dec = (s) => { const [iv, tag, d] = s.split('.').map((x) => Buffer.from(x, 'base64url')); const c = crypto.createDecipheriv('aes-256-gcm', ekey, iv); c.setAuthTag(tag); return Buffer.concat([c.update(d), c.final()]).toString('utf8'); };
  const back = (res, r) => res.redirect(`${PUBLIC_URL}/#social?r=${r}`);
  const save = (uid, kind, extId, name, token, meta = {}) => q(`INSERT INTO social_accounts(user_id,kind,ext_id,name,token_enc,meta) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT (user_id,kind,ext_id) DO UPDATE SET name=EXCLUDED.name, token_enc=EXCLUDED.token_enc, meta=EXCLUDED.meta, broken=false`, [uid, kind, String(extId), String(name || '').slice(0, 120), enc(token), meta]);

  // ---------- ลิงก์ไฟล์ชั่วคราวให้ Meta ดึงไปโพสต์ (หมดอายุ 2 ชม.) ----------
  const pubUrl = (file) => `${PUBLIC_URL}/pub/${makeToken({ f: path.basename(file) }, 7200)}/${path.basename(file)}`;
  app.get('/pub/:tok/:name', (req, res) => {
    const t = readToken(req.params.tok);
    if (!t?.f || t.f !== path.basename(req.params.name)) return res.status(404).end();
    const file = path.join(WORK_DIR, path.basename(t.f));
    if (!fs.existsSync(file)) return res.status(404).end();
    res.setHeader('cache-control', 'no-store');
    res.sendFile(file);
  });

  // ---------- YouTube ----------
  const YT_CB = `${PUBLIC_URL}/social/youtube/callback`;
  app.get('/social/youtube/connect', auth, (req, res) => {
    if (!ready.youtube()) return back(res, 'notready');
    const state = rand(24);
    setCookie(res, 'mr_yt', makeToken({ uid: req.uid, state }, 600), 600);
    res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      response_type: 'code', client_id: G_ID, redirect_uri: YT_CB, state, access_type: 'offline', prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly openid email', include_granted_scopes: 'true',
    }));
  });
  app.get('/social/youtube/callback', wrap(async (req, res) => {
    const st = readToken(getCookie(req, 'mr_yt'));
    setCookie(res, 'mr_yt', '', 0);
    if (!st || st.state !== req.query.state || !req.query.code) return back(res, 'fail');
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: String(req.query.code), redirect_uri: YT_CB, client_id: G_ID, client_secret: G_SECRET }) });
    const t = await r.json().catch(() => ({}));
    if (!r.ok || !t.refresh_token || !String(t.scope || '').includes('youtube.upload')) { log('yt connect', r.status, t.error || 'no refresh/scope'); return back(res, 'fail'); }
    const ch = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { authorization: `Bearer ${t.access_token}` } }).then((x) => x.json()).catch(() => ({}));
    const c = ch.items?.[0];
    if (!c) { log('yt connect no channel', JSON.stringify(ch).slice(0, 200)); return back(res, 'nochannel'); }
    await save(st.uid, 'youtube', c.id, c.snippet?.title || 'YouTube', t.refresh_token, { thumb: c.snippet?.thumbnails?.default?.url || '' });
    back(res, 'ok');
  }));
  async function ytToken(acc) {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: dec(acc.token_enc), client_id: G_ID, client_secret: G_SECRET }) });
    const t = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(t.error === 'invalid_grant' ? 'revoked' : `token ${r.status}`); throw e; }
    return t.access_token;
  }
  async function postYouTube(acc, w, f, opt) {
    const at = await ytToken(acc);
    const file = path.join(WORK_DIR, path.basename(f.name));
    const size = fs.statSync(file).size;
    const caps = w.captions || {}, tags = (w.hashtags || []).slice(0, 15);
    const first = String(caps.tiktok || caps.instagram || w.title || 'Mc Rich').split('\n')[0].replace(/#\S+/g, '').replace(/https?:\/\/\S+/g, '').trim();
    const title = `${(opt.title || first || w.title || 'คลิปใหม่').slice(0, 88)} #Shorts`.slice(0, 100);
    const description = `${caps.facebook || caps.instagram || ''}${tags.length ? '\n\n' + tags.join(' ') : ''}`.slice(0, 4900);
    const privacy = ['public', 'unlisted', 'private'].includes(opt.privacy) ? opt.privacy : 'public';
    const meta = { snippet: { title, description, tags: tags.map((x) => x.replace(/^#/, '')).slice(0, 15), categoryId: '22', defaultLanguage: 'th' },
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: false } };
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
      headers: { authorization: `Bearer ${at}`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) }, body: JSON.stringify(meta) });
    if (!init.ok) { const j = await init.json().catch(() => ({})); throw new Error(`yt init ${init.status} ${j.error?.message || ''}`); }
    const loc = init.headers.get('location');
    const up = await fetch(loc, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size) }, body: fs.readFileSync(file), signal: AbortSignal.timeout(15 * 60e3) });
    const j = await up.json().catch(() => ({}));
    if (!up.ok || !j.id) throw new Error(`yt upload ${up.status} ${j.error?.message || ''}`);
    return { url: `https://youtube.com/shorts/${j.id}`, id: j.id, privacy: j.status?.privacyStatus || privacy };
  }

  // ---------- Meta (Facebook Page + Instagram) ----------
  const META_CB = `${PUBLIC_URL}/social/meta/callback`;
  app.get('/social/meta/connect', auth, (req, res) => {
    if (!ready.meta()) return back(res, 'notready');
    const state = rand(24);
    setCookie(res, 'mr_meta', makeToken({ uid: req.uid, state }, 600), 600);
    res.redirect(`https://www.facebook.com/${GV()}/dialog/oauth?` + new URLSearchParams({
      client_id: META_ID(), redirect_uri: META_CB, state, response_type: 'code',
      // แอปแบบ Facebook Login for Business ใช้ config_id (ตั้งสิทธิ์ไว้ในหน้า Configurations) · แอปทั่วไปใช้ scope
      ...(process.env.META_CONFIG_ID ? { config_id: process.env.META_CONFIG_ID, override_default_response_type: 'true' }
        : { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,business_management,instagram_basic,instagram_content_publish' }),
    }));
  });
  app.get('/social/meta/callback', wrap(async (req, res) => {
    const st = readToken(getCookie(req, 'mr_meta'));
    setCookie(res, 'mr_meta', '', 0);
    if (!st || st.state !== req.query.state || !req.query.code) return back(res, 'fail');
    const t = await fetch(`${GRAPH()}/oauth/access_token?` + new URLSearchParams({ client_id: META_ID(), client_secret: META_SECRET(), redirect_uri: META_CB, code: String(req.query.code) })).then((x) => x.json()).catch(() => ({}));
    if (!t.access_token) { log('meta connect', JSON.stringify(t).slice(0, 200)); return back(res, 'fail'); }
    // token ระยะยาว → token เพจ (ไม่หมดอายุ)
    const ll = await fetch(`${GRAPH()}/oauth/access_token?` + new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: META_ID(), client_secret: META_SECRET(), fb_exchange_token: t.access_token })).then((x) => x.json()).catch(() => ({}));
    const ut = ll.access_token || t.access_token;
    const pages = await fetch(`${GRAPH()}/me/accounts?` + new URLSearchParams({ fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '50', access_token: ut })).then((x) => x.json()).catch(() => ({}));
    const list = pages.data || [];
    if (!list.length) { log('meta no pages', JSON.stringify(pages).slice(0, 200)); return back(res, 'nopage'); }
    for (const p of list) {
      await save(st.uid, 'fbpage', p.id, p.name, p.access_token);
      const ig = p.instagram_business_account;
      if (ig?.id) await save(st.uid, 'igbiz', ig.id, `@${ig.username || ig.id}`, p.access_token, { page: p.id });
    }
    back(res, 'ok');
  }));
  const gfetch = async (url, opt) => { const r = await fetch(url, opt); const j = await r.json().catch(() => ({})); if (!r.ok || j.error) { const e = new Error(`meta ${r.status} ${j.error?.message || ''}`.trim()); e.code = j.error?.code; throw e; } return j; };
  const capFor = (w, k) => `${(w.captions || {})[k] || (w.captions || {}).facebook || ''}${(w.hashtags || []).length ? '\n\n' + w.hashtags.join(' ') : ''}`.trim();
  async function postFacebook(acc, w, opt) {
    const tok = dec(acc.token_enc), page = acc.ext_id, msg = capFor(w, 'facebook').slice(0, 5000);
    const files = (w.files || []).map((f) => ({ ...f, path: path.join(WORK_DIR, path.basename(f.name)) })).filter((f) => fs.existsSync(f.path));
    const vid = files.find((f) => f.type === 'video');
    if (vid) {
      const sec = (await probe(vid.path).catch(() => ({ sec: 0 }))).sec;
      const buf = fs.readFileSync(vid.path);
      if (sec > 0 && sec <= 90) {
        // Reels: start → อัปโหลด → publish
        const s = await gfetch(`${GRAPH()}/${page}/video_reels`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ upload_phase: 'start', access_token: tok }) });
        const up = await fetch(`${RUPLOAD()}/video-upload/${GV()}/${s.video_id}`, { method: 'POST', headers: { authorization: `OAuth ${tok}`, offset: '0', file_size: String(buf.length) }, body: buf, signal: AbortSignal.timeout(15 * 60e3) });
        const uj = await up.json().catch(() => ({}));
        if (!up.ok || !uj.success) throw new Error(`reel upload ${up.status} ${uj.debug_info?.message || ''}`);
        await gfetch(`${GRAPH()}/${page}/video_reels`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ upload_phase: 'finish', video_id: s.video_id, video_state: 'PUBLISHED', description: msg, access_token: tok }) });
        return { url: `https://www.facebook.com/reel/${s.video_id}`, id: s.video_id };
      }
      const fd = new FormData();
      fd.append('access_token', tok); fd.append('description', msg); fd.append('source', new Blob([buf], { type: 'video/mp4' }), 'video.mp4');
      const j = await gfetch(`${process.env.META_GRAPH_BASE ? GBASE() : 'https://graph-video.facebook.com'}/${GV()}/${page}/videos`, { method: 'POST', body: fd, signal: AbortSignal.timeout(15 * 60e3) });
      return { url: `https://www.facebook.com/${page}/videos/${j.id}`, id: j.id };
    }
    const imgs = files.filter((f) => f.type !== 'video').slice(0, 10);
    if (!imgs.length) throw new Error('no_file');
    const ids = [];
    for (const f of imgs) {
      const fd = new FormData();
      fd.append('access_token', tok); fd.append('published', imgs.length === 1 ? 'true' : 'false');
      if (imgs.length === 1) fd.append('message', msg);
      fd.append('source', new Blob([fs.readFileSync(f.path)], { type: 'image/jpeg' }), 'image.jpg');
      const j = await gfetch(`${GRAPH()}/${page}/photos`, { method: 'POST', body: fd });
      if (imgs.length === 1) return { url: `https://www.facebook.com/${j.post_id || j.id}`, id: j.post_id || j.id };
      ids.push(j.id);
    }
    const j = await gfetch(`${GRAPH()}/${page}/feed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: msg, attached_media: ids.map((id) => ({ media_fbid: id })), access_token: tok }) });
    return { url: `https://www.facebook.com/${j.id}`, id: j.id };
  }
  async function postInstagram(acc, w) {
    const tok = dec(acc.token_enc), ig = acc.ext_id, cap = capFor(w, 'instagram').slice(0, 2200);
    const files = (w.files || []).filter((f) => fs.existsSync(path.join(WORK_DIR, path.basename(f.name))));
    const vid = files.find((f) => f.type === 'video');
    const wait = async (id) => {
      for (let i = 0; i < 60; i++) {
        const s = await gfetch(`${GRAPH()}/${id}?fields=status_code,status&access_token=${tok}`);
        if (s.status_code === 'FINISHED') return;
        if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`ig ${s.status_code} ${s.status || ''}`);
        await sleep(5000);
      }
      throw new Error('ig timeout');
    };
    let creation;
    if (vid) {
      creation = (await gfetch(`${GRAPH()}/${ig}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ media_type: 'REELS', video_url: pubUrl(vid.name), caption: cap, share_to_feed: true, access_token: tok }) })).id;
      await wait(creation);
    } else {
      const imgs = files.slice(0, 10);
      if (!imgs.length) throw new Error('no_file');
      if (imgs.length === 1) creation = (await gfetch(`${GRAPH()}/${ig}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image_url: pubUrl(imgs[0].name), caption: cap, access_token: tok }) })).id;
      else {
        const kids = [];
        for (const f of imgs) kids.push((await gfetch(`${GRAPH()}/${ig}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image_url: pubUrl(f.name), is_carousel_item: true, access_token: tok }) })).id);
        creation = (await gfetch(`${GRAPH()}/${ig}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ media_type: 'CAROUSEL', children: kids.join(','), caption: cap, access_token: tok }) })).id;
      }
      await wait(creation);
    }
    const p = await gfetch(`${GRAPH()}/${ig}/media_publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ creation_id: creation, access_token: tok }) });
    const pl = await gfetch(`${GRAPH()}/${p.id}?fields=permalink&access_token=${tok}`).catch(() => ({}));
    return { url: pl.permalink || 'https://www.instagram.com/', id: p.id };
  }

  // ---------- API ----------
  const view = (a) => ({ id: Number(a.id), kind: a.kind, label: KIND_LABEL[a.kind], name: a.name, broken: !!a.broken, thumb: a.meta?.thumb || '' });
  app.get('/api/social', auth, wrap(async (req, res) => {
    const { rows } = await q('SELECT * FROM social_accounts WHERE user_id=$1 ORDER BY kind, name', [req.uid]);
    res.json({ ready: { youtube: ready.youtube(), meta: ready.meta() }, accounts: rows.map(view) });
  }));
  app.delete('/api/social/:id', auth, wrap(async (req, res) => {
    const a = (await q('DELETE FROM social_accounts WHERE id=$1 AND user_id=$2 RETURNING *', [Number(req.params.id) || 0, req.uid])).rows[0];
    if (a?.kind === 'youtube') fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(dec(a.token_enc))}`, { method: 'POST' }).catch(() => {});
    res.json({ ok: true });
  }));
  // โพสต์ทันที / ตั้งเวลา → ลงคิว schedules (target_id) แล้วตัวทำงานด้านล่างโพสต์ให้
  app.post('/api/works/:id/publish', auth, wrap(async (req, res) => {
    const w = (await q("SELECT id, kind, status, purged FROM works WHERE id=$1 AND user_id=$2", [Number(req.params.id) || 0, req.uid])).rows[0];
    if (!w || w.status !== 'done' || w.purged) return res.status(400).json({ error: 'ผลงานนี้ยังโพสต์ไม่ได้ (ยังไม่เสร็จหรือไฟล์ถูกลบแล้ว)' });
    const ids = (Array.isArray(req.body?.targets) ? req.body.targets : []).map(Number).filter(Boolean).slice(0, 10);
    const accs = ids.length ? (await q('SELECT * FROM social_accounts WHERE user_id=$1 AND id = ANY($2)', [req.uid, ids])).rows : [];
    if (!accs.length) return res.status(400).json({ error: 'เลือกบัญชีที่จะโพสต์' });
    if (w.kind !== 'video' && accs.some((a) => a.kind === 'youtube')) return res.status(400).json({ error: 'YouTube โพสต์ได้เฉพาะคลิปวิดีโอ' });
    const at = req.body?.at ? new Date(req.body.at) : new Date();
    if (Number.isNaN(at.getTime()) || at > new Date(Date.now() + 60 * 864e5)) return res.status(400).json({ error: 'เวลาไม่ถูกต้อง (ตั้งล่วงหน้าได้ไม่เกิน 60 วัน)' });
    const opt = { privacy: req.body?.privacy, title: String(req.body?.title || '').slice(0, 90) };
    for (const a of accs) await q('INSERT INTO schedules(user_id,work_id,platform,at,note,target_id,opts) VALUES($1,$2,$3,$4,$5,$6,$7)', [req.uid, w.id, KIND_PLAT[a.kind], at < new Date() ? new Date() : at, `โพสต์ตรง ${a.name}`, a.id, opt]);
    setTimeout(() => tick().catch(() => {}), 500);
    res.json({ ok: true, n: accs.length });
  }));
  app.get('/api/works/:id/publish', auth, wrap(async (req, res) => {
    const { rows } = await q(`SELECT s.id, s.platform, s.at, s.status, s.result, s.error, a.name FROM schedules s LEFT JOIN social_accounts a ON a.id=s.target_id
      WHERE s.work_id=$1 AND s.user_id=$2 AND s.target_id IS NOT NULL ORDER BY s.id DESC LIMIT 20`, [Number(req.params.id) || 0, req.uid]);
    res.json({ items: rows });
  }));

  // ---------- ตัวโพสต์ (ทุก 30 วิ) ----------
  let busy = false;
  async function tick() {
    if (busy) return; busy = true;
    try {
      for (;;) {
        const s = (await q(`UPDATE schedules SET status='posting' WHERE id = (SELECT id FROM schedules WHERE status='scheduled' AND target_id IS NOT NULL AND at <= now() ORDER BY at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`)).rows[0];
        if (!s) break;
        const acc = (await q('SELECT * FROM social_accounts WHERE id=$1', [s.target_id])).rows[0];
        const w = (await q('SELECT * FROM works WHERE id=$1', [s.work_id])).rows[0];
        try {
          if (!acc) throw new Error('บัญชีถูกยกเลิกการเชื่อมต่อ');
          if (!w || w.purged) throw new Error('ไฟล์ผลงานถูกลบแล้ว');
          const r = acc.kind === 'youtube' ? await postYouTube(acc, w, (w.files || []).find((f) => f.type === 'video') || {}, s.opts || {})
            : acc.kind === 'fbpage' ? await postFacebook(acc, w, s.opts || {}) : await postInstagram(acc, w);
          await q("UPDATE schedules SET status='posted', done_at=now(), result=$2, error='' WHERE id=$1", [s.id, r]);
          const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
          await q(`UPDATE works SET posted = posted || jsonb_build_object($2::text, $3::text), events = events || $4::jsonb WHERE id=$1`, [w.id, s.platform, day, JSON.stringify([{ t: 'publish', p: s.platform, at: new Date().toISOString(), url: r.url }])]);
          log('publish ok', s.id, acc.kind, r.url);
          notify(s.user_id, `✅ โพสต์ลง ${KIND_LABEL[acc.kind]} (${acc.name}) แล้ว\n${r.url}${r.privacy === 'private' ? '\n(YouTube ตั้งเป็นส่วนตัว — เปิดสาธารณะได้ใน YouTube Studio)' : ''}`).catch(() => {});
        } catch (e) {
          log('publish fail', s.id, acc?.kind, e.message.slice(0, 300));
          const revoked = /revoked|190|OAuthException|session has expired|invalid_grant/i.test(e.message) || e.code === 190;
          if (revoked && acc) await q('UPDATE social_accounts SET broken=true WHERE id=$1', [acc.id]);
          const why = revoked ? 'การเชื่อมต่อหมดอายุ เชื่อมบัญชีใหม่ในหน้าโพสต์ตรง' : /quota/i.test(e.message) ? 'โควตาโพสต์ของวันนี้เต็ม ลองใหม่พรุ่งนี้' : /no_file/.test(e.message) ? 'ไม่พบไฟล์ผลงาน' : e.message.slice(0, 160);
          await q("UPDATE schedules SET status='failed', done_at=now(), error=$2 WHERE id=$1", [s.id, why]);
          notify(s.user_id, `⚠️ โพสต์ลง ${acc ? KIND_LABEL[acc.kind] : s.platform} ไม่สำเร็จ: ${why}\n${PUBLIC_URL}/#work?id=${s.work_id}`).catch(() => {});
        }
      }
    } finally { busy = false; }
  }
  function start() {
    // งานที่ค้างสถานะ posting ตอนรีสตาร์ท → ลองใหม่
    q("UPDATE schedules SET status='scheduled' WHERE status='posting' AND target_id IS NOT NULL").catch(() => {});
    setInterval(() => tick().catch((e) => log('publish tick', e.message)), 30e3).unref();
  }
  return { start, ready, pubUrl };
}
