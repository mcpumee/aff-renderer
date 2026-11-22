// Mc Rich — ลิงก์สั้นนับคลิก + บันทึกผลงานเข้า Google Drive ของลูกค้า
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BOT = /bot|crawl|spider|facebookexternalhit|facebot|preview|whatsapp|slack|discord|telegram|curl|wget|python|headless|lighthouse/i;
const PLAT_LABEL = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', shopee: 'Shopee', lazada: 'Lazada', line: 'LINE', youtube: 'YouTube', other: 'อื่นๆ' };

export function registerExtras(app, { q, auth, wrap, log, DATA_DIR, rand, PUBLIC_URL, SECRET, makeToken, readToken, getCookie, setCookie, G_ID, G_SECRET }) {
  const WORK_DIR = path.join(DATA_DIR, 'works');
  const shortUrl = (code) => `${PUBLIC_URL}/s/${code}`;
  const newCode = async () => {
    for (let i = 0; i < 8; i++) {
      const c = rand(6, 'abcdefghjkmnpqrstuvwxyz23456789');
      if (!(await q('SELECT 1 FROM links WHERE code=$1', [c])).rowCount) return c;
    }
    throw new Error('code');
  };

  // ---------- ลิงก์สั้น ----------
  async function shortLinks(w, platforms) {
    const out = {};
    for (const p of platforms) {
      const code = await newCode();
      await q('INSERT INTO links(code,user_id,work_id,platform,url,label) VALUES($1,$2,$3,$4,$5,$6)', [code, w.user_id, w.id, p, w.params.link, (w.title || '').slice(0, 80)]);
      out[p] = shortUrl(code);
    }
    return out;
  }
  app.get('/s/:code', wrap(async (req, res) => {
    const l = (await q('SELECT code,url FROM links WHERE code=$1', [String(req.params.code).slice(0, 16)])).rows[0];
    if (!l) return res.status(404).type('html').send('<meta charset="utf-8"><p style="font-family:sans-serif">ไม่พบลิงก์นี้</p>');
    res.setHeader('cache-control', 'no-store');
    res.redirect(302, l.url);
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || BOT.test(ua) || req.method !== 'GET') return;
    const visitor = crypto.createHash('sha256').update(`${req.ip}|${ua}|${SECRET}`).digest('base64url').slice(0, 16);
    const device = /iphone|ipad|android|mobile/i.test(ua) ? 'mobile' : 'desktop';
    try {
      const seen = (await q("SELECT 1 FROM link_clicks WHERE code=$1 AND visitor=$2 AND at > now() - interval '1 day' LIMIT 1", [l.code, visitor])).rowCount > 0;
      await q('INSERT INTO link_clicks(code,visitor,device,is_unique) VALUES($1,$2,$3,$4)', [l.code, visitor, device, !seen]);
      await q('UPDATE links SET clicks=clicks+1, uniques=uniques+$2 WHERE code=$1', [l.code, seen ? 0 : 1]);
    } catch (e) { log('click', e.message); }
  }));
  const linkView = (l) => ({ code: l.code, short: shortUrl(l.code), url: l.url, label: l.label, platform: l.platform, platformLabel: PLAT_LABEL[l.platform] || '', workId: l.work_id, clicks: l.clicks, uniques: l.uniques, createdAt: l.created_at });
  app.get('/api/links', auth, wrap(async (req, res) => {
    const { rows } = await q('SELECT * FROM links WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.uid]);
    const t = (await q(`SELECT COALESCE(sum(clicks),0)::int c, COALESCE(sum(uniques),0)::int u,
      (SELECT count(*)::int FROM link_clicks k JOIN links l ON l.code=k.code WHERE l.user_id=$1 AND k.at > now() - interval '7 days') w
      FROM links WHERE user_id=$1`, [req.uid])).rows[0];
    res.json({ items: rows.map(linkView), total: { clicks: t.c, uniques: t.u, week: t.w } });
  }));
  app.post('/api/links', auth, wrap(async (req, res) => {
    const url = String(req.body?.url || '').trim().slice(0, 600);
    if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) return res.status(400).json({ error: 'ลิงก์ต้องขึ้นต้นด้วย https://' });
    const platform = PLAT_LABEL[req.body?.platform] ? req.body.platform : 'other';
    const n = (await q("SELECT count(*)::int n FROM links WHERE user_id=$1 AND created_at > now() - interval '1 day'", [req.uid])).rows[0].n;
    if (n >= 200) return res.status(429).json({ error: 'สร้างลิงก์วันนี้ครบแล้ว' });
    const code = await newCode();
    const l = (await q('INSERT INTO links(code,user_id,platform,url,label) VALUES($1,$2,$3,$4,$5) RETURNING *', [code, req.uid, platform, url, String(req.body?.label || '').trim().slice(0, 80)])).rows[0];
    res.json(linkView(l));
  }));
  app.delete('/api/links/:code', auth, wrap(async (req, res) => {
    await q('DELETE FROM links WHERE code=$1 AND user_id=$2', [req.params.code, req.uid]);
    res.json({ ok: true });
  }));
  // สถิติคลิก 14 วัน (ทั้งหมด / ต่อผลงาน / ต่อลิงก์)
  app.get('/api/stats/clicks', auth, wrap(async (req, res) => {
    const cond = ['l.user_id=$1']; const args = [req.uid];
    if (req.query.work) { args.push(Number(req.query.work) || 0); cond.push(`l.work_id=$${args.length}`); }
    if (req.query.code) { args.push(String(req.query.code)); cond.push(`l.code=$${args.length}`); }
    const where = cond.join(' AND ');
    const days = (await q(`SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(c.n,0)::int n FROM generate_series((now() AT TIME ZONE 'Asia/Bangkok')::date - 13, (now() AT TIME ZONE 'Asia/Bangkok')::date, '1 day') d
      LEFT JOIN (SELECT (k.at AT TIME ZONE 'Asia/Bangkok')::date dd, count(*) n FROM link_clicks k JOIN links l ON l.code=k.code WHERE ${where} AND k.at > now() - interval '15 days' GROUP BY 1) c ON c.dd=d ORDER BY d`, args)).rows;
    const byPlat = (await q(`SELECT l.platform, sum(l.clicks)::int clicks, sum(l.uniques)::int uniques FROM links l WHERE ${where} GROUP BY 1 ORDER BY 2 DESC`, args)).rows
      .map((r) => ({ ...r, label: PLAT_LABEL[r.platform] || r.platform }));
    const dev = (await q(`SELECT k.device, count(*)::int n FROM link_clicks k JOIN links l ON l.code=k.code WHERE ${where} GROUP BY 1`, args)).rows;
    res.json({ days, byPlatform: byPlat, devices: Object.fromEntries(dev.map((d) => [d.device, d.n])) });
  }));

  // ---------- Google Drive ----------
  const DRIVE_CB = `${PUBLIC_URL}/drive/callback`;
  const driveReady = () => !!(G_ID && G_SECRET);
  const ekey = crypto.createHash('sha256').update(`${SECRET}|drive`).digest();
  const enc = (s) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', ekey, iv); const d = Buffer.concat([c.update(s, 'utf8'), c.final()]); return [iv, c.getAuthTag(), d].map((b) => b.toString('base64url')).join('.'); };
  const dec = (s) => { const [iv, tag, d] = s.split('.').map((x) => Buffer.from(x, 'base64url')); const c = crypto.createDecipheriv('aes-256-gcm', ekey, iv); c.setAuthTag(tag); return Buffer.concat([c.update(d), c.final()]).toString('utf8'); };

  app.get('/drive/connect', auth, (req, res) => {
    if (!driveReady()) return res.redirect(`${PUBLIC_URL}/#profile?drive=notready`);
    const state = rand(24);
    setCookie(res, 'mr_drive', makeToken({ uid: req.uid, state }, 600), 600);
    res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      response_type: 'code', client_id: G_ID, redirect_uri: DRIVE_CB, state, access_type: 'offline', prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/drive.file openid email', include_granted_scopes: 'true',
    }));
  });
  app.get('/drive/callback', wrap(async (req, res) => {
    const st = readToken(getCookie(req, 'mr_drive'));
    setCookie(res, 'mr_drive', '', 0);
    if (!st || st.state !== req.query.state || !req.query.code) return res.redirect(`${PUBLIC_URL}/#profile?drive=fail`);
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: String(req.query.code), redirect_uri: DRIVE_CB, client_id: G_ID, client_secret: G_SECRET }) });
    const t = await r.json().catch(() => ({}));
    if (!r.ok || !t.refresh_token || !String(t.scope || '').includes('drive.file')) { log('drive connect', r.status, t.error || 'no refresh/scope'); return res.redirect(`${PUBLIC_URL}/#profile?drive=fail`); }
    let email = '';
    try { email = JSON.parse(Buffer.from(String(t.id_token).split('.')[1], 'base64url')).email || ''; } catch {}
    await q(`INSERT INTO drive_accounts(user_id,refresh_enc,email) VALUES($1,$2,$3)
      ON CONFLICT (user_id) DO UPDATE SET refresh_enc=EXCLUDED.refresh_enc, email=EXCLUDED.email, folder_id=''`, [st.uid, enc(t.refresh_token), email]);
    res.redirect(`${PUBLIC_URL}/#profile?drive=ok`);
  }));
  async function token(acc) {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: dec(acc.refresh_enc), client_id: G_ID, client_secret: G_SECRET }) });
    const t = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(t.error === 'invalid_grant' ? 'revoked' : `token ${r.status}`); e.code = t.error; throw e; }
    return t.access_token;
  }
  async function folder(acc, at) {
    if (acc.folder_id) {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${acc.folder_id}?fields=id,trashed`, { headers: { authorization: `Bearer ${at}` } });
      const j = await r.json().catch(() => ({}));
      if (r.ok && !j.trashed) return acc.folder_id;
    }
    const r = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', headers: { authorization: `Bearer ${at}`, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Mc Rich', mimeType: 'application/vnd.google-apps.folder' }) });
    const j = await r.json();
    if (!r.ok) throw new Error(`folder ${r.status}`);
    await q('UPDATE drive_accounts SET folder_id=$2 WHERE user_id=$1', [acc.user_id, j.id]);
    return j.id;
  }
  async function upload(at, parent, name, buf, mime) {
    const b = `mcrich${rand(12)}`;
    const body = Buffer.concat([
      Buffer.from(`--${b}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent] })}\r\n--${b}\r\ncontent-type: ${mime}\r\n\r\n`),
      buf, Buffer.from(`\r\n--${b}--`),
    ]);
    const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', { method: 'POST',
      headers: { authorization: `Bearer ${at}`, 'content-type': `multipart/related; boundary=${b}` }, body });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`upload ${r.status} ${j.error?.message || ''}`);
    return j;
  }
  async function saveWork(w, manual) {
    const acc = (await q('SELECT * FROM drive_accounts WHERE user_id=$1', [w.user_id])).rows[0];
    if (!acc || (!manual && !acc.auto)) return null;
    let at;
    try { at = await token(acc); } catch (e) { if (e.message === 'revoked') await q('DELETE FROM drive_accounts WHERE user_id=$1', [w.user_id]); throw e; }
    const parent = await folder(acc, at);
    const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const safe = String(w.title || 'ผลงาน').replace(/[\\/:*?"<>|]/g, ' ').slice(0, 40).trim();
    const out = [];
    for (const [i, f] of (w.files || []).entries()) {
      const file = path.join(WORK_DIR, path.basename(f.name));
      if (!fs.existsSync(file)) continue;
      const isVid = /\.mp4$/i.test(f.name);
      const j = await upload(at, parent, `${day} ${safe} ${i + 1}${isVid ? '.mp4' : '.jpg'}`, fs.readFileSync(file), isVid ? 'video/mp4' : 'image/jpeg');
      out.push(j.webViewLink);
    }
    const cur = (await q('SELECT captions, hashtags FROM works WHERE id=$1', [w.id])).rows[0] || {};
    const caps = cur.captions || {};
    const tags = (cur.hashtags || []).join(' ');
    const txt = Object.entries(caps).filter(([, v]) => v).map(([k, v]) => `== ${PLAT_LABEL[k] || k} ==\n${v}${tags ? '\n\n' + tags : ''}`).join('\n\n');
    if (txt) await upload(at, parent, `${day} ${safe} แคปชั่น.txt`, Buffer.from(txt, 'utf8'), 'text/plain; charset=UTF-8');
    await q('UPDATE works SET events = (events || $2::jsonb) WHERE id=$1', [w.id, JSON.stringify([{ t: 'drive', at: new Date().toISOString(), n: out.length }])]);
    return { files: out.length, folder: `https://drive.google.com/drive/folders/${parent}` };
  }
  app.get('/api/drive', auth, wrap(async (req, res) => {
    const a = (await q('SELECT email, auto, folder_id FROM drive_accounts WHERE user_id=$1', [req.uid])).rows[0];
    res.json({ ready: driveReady(), connected: !!a, email: a?.email || '', auto: a?.auto ?? true, folder: a?.folder_id ? `https://drive.google.com/drive/folders/${a.folder_id}` : '' });
  }));
  app.put('/api/drive', auth, wrap(async (req, res) => {
    await q('UPDATE drive_accounts SET auto=$2 WHERE user_id=$1', [req.uid, !!req.body?.auto]);
    res.json({ ok: true });
  }));
  app.delete('/api/drive', auth, wrap(async (req, res) => {
    const a = (await q('DELETE FROM drive_accounts WHERE user_id=$1 RETURNING refresh_enc', [req.uid])).rows[0];
    if (a) fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: dec(a.refresh_enc) }) }).catch(() => {});
    res.json({ ok: true });
  }));
  app.post('/api/works/:id/drive', auth, wrap(async (req, res) => {
    const w = (await q("SELECT * FROM works WHERE id=$1 AND user_id=$2 AND status='done' AND NOT purged", [Number(req.params.id) || 0, req.uid])).rows[0];
    if (!w) return res.status(404).json({ error: 'ไม่พบผลงาน หรือไฟล์ถูกลบแล้ว' });
    try {
      const r = await saveWork(w, true);
      if (!r) return res.status(400).json({ error: 'ยังไม่ได้เชื่อม Google Drive' });
      res.json(r);
    } catch (e) {
      log('drive save', w.id, e.message);
      res.status(502).json({ error: e.message === 'revoked' ? 'Google Drive ถูกยกเลิกสิทธิ์ เชื่อมใหม่ในโปรไฟล์' : 'ส่งเข้า Drive ไม่สำเร็จ ลองใหม่' });
    }
  }));

  return {
    hooks: {
      shortLinks,
      shortLink: async (w, url, label) => {
        const code = await newCode();
        await q('INSERT INTO links(code,user_id,work_id,platform,url,label) VALUES($1,$2,$3,$4,$5,$6)', [code, w.user_id, w.id, 'other', url, String(label || '').slice(0, 80)]);
        return shortUrl(code);
      },
      onDone: (w) => saveWork(w, false).then((r) => r && log('drive auto', w.id, r.files)).catch((e) => log('drive auto fail', w.id, e.message)),
    },
    driveReady,
  };
}
