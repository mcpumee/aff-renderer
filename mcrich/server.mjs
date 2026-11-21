// Mc Rich — เว็บแอปสร้างภาพ/คลิปสำหรับลูกค้าทั่วไป (เฟส 2: ล็อกอิน โปรไฟล์ ความสนใจ ชุดแบรนด์ บัญชีดาว)
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import multer from 'multer';
import sharp from 'sharp';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3200);
const PUBLIC_URL = String(process.env.PUBLIC_URL || 'http://localhost:3200').replace(/\/+$/, '');
const SECRET = process.env.SESSION_SECRET || '';
const DATA_DIR = process.env.DATA_DIR || '/data/mcrich';
const LINE_ID = process.env.LINE_CHANNEL_ID || '';
const LINE_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const G_ID = process.env.GOOGLE_CLIENT_ID || '';
const G_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const SIGNUP_STARS = 20;
const SECURE = PUBLIC_URL.startsWith('https://');
if (!SECRET || SECRET.length < 32) { console.error('ต้องตั้ง SESSION_SECRET อย่างน้อย 32 ตัว'); process.exit(1); }

const LOGO_DIR = path.join(DATA_DIR, 'logos');
fs.mkdirSync(LOGO_DIR, { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- ฐานข้อมูล ----------
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const q = (text, params) => pool.query(text, params);
async function migrate() {
  for (let i = 0; i < 30; i++) {
    try { await q(fs.readFileSync(path.join(__dir, 'schema.sql'), 'utf8')); break; }
    catch (e) { if (i === 29) throw e; log('รอฐานข้อมูล…', e.code || e.message); await new Promise((r) => setTimeout(r, 2000)); }
  }
  const { rows } = await q('SELECT count(*)::int n FROM trends');
  if (!rows[0].n) {
    const seed = [
      ['เปิดกล่องจุ่มสุ่มสินค้า', 'blind_box', 'video', '6 ดาว', 'กำลังมา', '#7A2E9C', ['เปิดกล่อง / สุ่ม', 'Affiliate', 'ขายของตัวเอง']],
      ['ละครสั้น ยายมาเยี่ยม', 'drama_family', 'video', 'เริ่ม 90 ดาว', 'ฮิต', '#7B4A24', ['ละครตลก', 'ทำคอนเทนต์', 'อาหาร ขนม']],
      ['โปสเตอร์เมนูสายสุขภาพ', 'poster_menu', 'image', 'ใช้ภาพฟรีได้', 'ฟรี', '#2F6B4A', ['อาหาร ขนม', 'สุขภาพ', 'โปรโมตร้าน', 'มินิมอล']],
      ['เปิดกล่องของขวัญ', 'gift_box', 'video', '6 ดาว', 'ไวรัล', '#A3366B', ['เปิดกล่อง / สุ่ม', 'Affiliate', 'ความงาม', 'แฟชั่น']],
      ['เรื่องผีตีสาม ป้ายยา', 'drama_ghost', 'video', 'เริ่ม 90 ดาว', 'มาแรง', '#0B1F1A', ['สยองขวัญ', 'ทำคอนเทนต์']],
      ['ภาพสินค้าพื้นหรู', 'product_luxury', 'image', '9 ดาว', '', '#3B4A8C', ['ความงาม', 'แฟชั่น', 'ไอที แก็ดเจ็ต']],
      ['ก่อน-หลังใช้สินค้า', 'before_after', 'video', '20 ดาว', '', '#1F6E8C', ['ของใช้ในบ้าน', 'ความงาม', 'Affiliate']],
      ['ตลาดเช้า แม่ค้าจัดให้', 'drama_market', 'video', 'เริ่ม 90 ดาว', '', '#B33A1E', ['ละครตลก', 'อาหาร ขนม', 'ขายของตัวเอง']],
    ];
    for (const [i, t] of seed.entries()) {
      await q('INSERT INTO trends(title,style,kind,price,badge,color,tags,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [...t, i]);
    }
  }
  log('ฐานข้อมูลพร้อม');
}

// ---------- เซสชัน (คุกกี้เซ็นลายเซ็น) ----------
const b64u = (b) => Buffer.from(b).toString('base64url');
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function makeToken(obj, maxAgeSec) {
  const body = b64u(JSON.stringify({ ...obj, exp: Math.floor(Date.now() / 1000) + maxAgeSec }));
  return `${body}.${sign(body)}`;
}
function readToken(tok) {
  const [body, sig] = String(tok || '').split('.');
  if (!body || !sig) return null;
  const want = sign(body);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const o = JSON.parse(Buffer.from(body, 'base64url').toString());
    return o.exp > Date.now() / 1000 ? o : null;
  } catch { return null; }
}
const getCookie = (req, name) => {
  const m = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
};
const setCookie = (res, name, val, maxAge) => res.append('Set-Cookie',
  `${name}=${encodeURIComponent(val)}; Path=/; HttpOnly; ${SECURE ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${maxAge}`);

const rand = (n, abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') => Array.from(crypto.randomBytes(n), (b) => abc[b % abc.length]).join('');

// ---------- ผู้ใช้ ----------
async function loginOrSignup(provider, subject, info, req) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const found = await c.query('SELECT user_id FROM identities WHERE provider=$1 AND subject=$2', [provider, subject]);
    let userId, isNew = false;
    if (found.rows.length) {
      userId = found.rows[0].user_id;
      await c.query(`UPDATE users SET last_login_at=now(),
        name = CASE WHEN name='' THEN $2 ELSE name END,
        avatar_url = CASE WHEN $3<>'' THEN $3 ELSE avatar_url END,
        email = CASE WHEN email='' THEN $4 ELSE email END WHERE id=$1`, [userId, info.name || '', info.picture || '', info.email || '']);
    } else {
      isNew = true;
      const refCode = String(readToken(getCookie(req, 'mr_ref'))?.code || '').toUpperCase();
      const ref = refCode ? await c.query('SELECT id FROM users WHERE referral_code=$1', [refCode]) : { rows: [] };
      const u = await c.query(`INSERT INTO users(public_id,name,avatar_url,email,referral_code,referred_by)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['MR' + rand(5), info.name || 'ผู้ใช้ใหม่', info.picture || '', info.email || '', rand(7), ref.rows[0]?.id || null]);
      userId = u.rows[0].id;
      await c.query('INSERT INTO identities(provider,subject,user_id) VALUES($1,$2,$3)', [provider, subject, userId]);
      await c.query('INSERT INTO profiles(user_id) VALUES($1)', [userId]);
      await c.query('INSERT INTO free_quota(user_id) VALUES($1)', [userId]);
      await c.query(`INSERT INTO star_ledger(user_id,delta,kind,note) VALUES($1,$2,'signup_bonus','โบนัสสมัครสมาชิก')
        ON CONFLICT DO NOTHING`, [userId, SIGNUP_STARS]);
    }
    await c.query('INSERT INTO audit_log(user_id,action,detail,ip) VALUES($1,$2,$3,$4)',
      [userId, isNew ? 'signup' : 'login', { provider }, req.ip || '']);
    await c.query('COMMIT');
    return { userId, isNew };
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}

async function me(userId) {
  const u = (await q(`SELECT u.id,u.public_id,u.name,u.avatar_url,u.email,u.is_admin,u.onboarded,u.referral_code,u.created_at,
      p.interests,p.brand,p.hashtags,
      COALESCE((SELECT sum(delta) FROM star_ledger s WHERE s.user_id=u.id),0)::int AS stars,
      f.welcome_left, f.daily_date, f.daily_used,
      (SELECT array_agg(provider) FROM identities i WHERE i.user_id=u.id) AS providers,
      (SELECT count(*) FROM users r WHERE r.referred_by=u.id)::int AS referred
    FROM users u JOIN profiles p ON p.user_id=u.id LEFT JOIN free_quota f ON f.user_id=u.id WHERE u.id=$1`, [userId])).rows[0];
  if (!u) return null;
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // เวลาไทย
  const dailyLeft = u.daily_date && u.daily_date.toISOString?.().slice(0, 10) === today ? Math.max(0, 1 - u.daily_used) : 1;
  return {
    id: u.public_id, name: u.name, avatar: u.avatar_url, email: u.email, admin: u.is_admin, onboarded: u.onboarded,
    referralCode: u.referral_code, referred: u.referred, createdAt: u.created_at, providers: u.providers || [],
    stars: u.stars, freeImages: { welcome: u.welcome_left ?? 0, today: dailyLeft },
    interests: u.interests, brand: u.brand, hashtags: u.hashtags,
  };
}

// ---------- OAuth: LINE + Google ----------
const PROVIDERS = {
  line: {
    enabled: () => !!(LINE_ID && LINE_SECRET),
    authUrl: (state, nonce) => 'https://access.line.me/oauth2/v2.1/authorize?' + new URLSearchParams({
      response_type: 'code', client_id: LINE_ID, redirect_uri: `${PUBLIC_URL}/auth/line/callback`,
      state, nonce, scope: 'profile openid email',
    }),
    async exchange(code, nonce) {
      const t = await post('https://api.line.me/oauth2/v2.1/token', {
        grant_type: 'authorization_code', code, redirect_uri: `${PUBLIC_URL}/auth/line/callback`, client_id: LINE_ID, client_secret: LINE_SECRET,
      });
      const v = await post('https://api.line.me/oauth2/v2.1/verify', { id_token: t.id_token, client_id: LINE_ID, nonce });
      if (!v.sub) throw new Error('LINE ไม่ยืนยันตัวตน');
      return { subject: v.sub, name: v.name, picture: v.picture, email: v.email };
    },
  },
  google: {
    enabled: () => !!(G_ID && G_SECRET),
    authUrl: (state, nonce) => 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      response_type: 'code', client_id: G_ID, redirect_uri: `${PUBLIC_URL}/auth/google/callback`,
      state, nonce, scope: 'openid email profile', prompt: 'select_account',
    }),
    async exchange(code) {
      const t = await post('https://oauth2.googleapis.com/token', {
        grant_type: 'authorization_code', code, redirect_uri: `${PUBLIC_URL}/auth/google/callback`, client_id: G_ID, client_secret: G_SECRET,
      });
      const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${t.access_token}` } });
      const u = await r.json();
      if (!r.ok || !u.sub) throw new Error('Google ไม่ยืนยันตัวตน');
      return { subject: u.sub, name: u.name, picture: u.picture, email: u.email_verified ? u.email : '' };
    },
  },
};
async function post(url, form) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}: ${j.error_description || j.error || ''}`);
  return j;
}

// ---------- แอป ----------
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  // ป้องกันการยิงคำสั่งข้ามเว็บ: คำขอที่เปลี่ยนข้อมูลต้องมาจากเว็บเราเอง
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.path.startsWith('/api/')) {
    const origin = req.headers.origin;
    if (origin && origin !== new URL(PUBLIC_URL).origin) return res.status(403).json({ error: 'origin' });
  }
  next();
});

app.get('/api/health', (_q, r) => r.json({ ok: true }));
app.get('/api/config', (_q, r) => r.json({ line: PROVIDERS.line.enabled(), google: PROVIDERS.google.enabled() }));

// ลิงก์ชวนเพื่อน /r/CODE → จำโค้ดไว้ 30 วัน แล้วไปหน้าแรก
app.get('/r/:code', (req, res) => {
  setCookie(res, 'mr_ref', makeToken({ code: String(req.params.code).slice(0, 12) }, 30 * 86400), 30 * 86400);
  res.redirect(`${PUBLIC_URL}/`);
});

app.get('/auth/:p', (req, res) => {
  const p = PROVIDERS[req.params.p];
  if (!p) return res.status(404).end();
  if (!p.enabled()) return res.redirect(`${PUBLIC_URL}/#login?err=notready`);
  const state = rand(24), nonce = rand(24);
  setCookie(res, 'mr_oauth', makeToken({ p: req.params.p, state, nonce }, 600), 600);
  res.redirect(p.authUrl(state, nonce));
});
app.get('/auth/:p/callback', async (req, res) => {
  const p = PROVIDERS[req.params.p];
  const st = readToken(getCookie(req, 'mr_oauth'));
  setCookie(res, 'mr_oauth', '', 0);
  if (!p || !st || st.p !== req.params.p || st.state !== req.query.state || !req.query.code) {
    return res.redirect(`${PUBLIC_URL}/#login?err=state`);
  }
  try {
    const info = await p.exchange(String(req.query.code), st.nonce);
    const { userId, isNew } = await loginOrSignup(req.params.p, info.subject, info, req);
    setCookie(res, 'mr_sid', makeToken({ uid: userId }, 60 * 86400), 60 * 86400);
    const u = (await q('SELECT onboarded FROM users WHERE id=$1', [userId])).rows[0];
    res.redirect(`${PUBLIC_URL}/#${isNew || !u.onboarded ? 'onboard' : 'home'}`);
  } catch (e) {
    log('login error', req.params.p, e.message);
    res.redirect(`${PUBLIC_URL}/#login?err=fail`);
  }
});
app.post('/api/logout', (_q, res) => { setCookie(res, 'mr_sid', '', 0); res.json({ ok: true }); });
// ใช้ทดสอบบนเครื่องนักพัฒนาเท่านั้น (ต้องเปิด TEST_LOGIN และรันบน localhost)
if (process.env.TEST_LOGIN === '1' && PUBLIC_URL.startsWith('http://localhost')) {
  app.get('/auth/test/:sub', async (req, res) => {
    const { userId } = await loginOrSignup('test', req.params.sub, { name: 'คุณแพรว', email: '' }, req);
    setCookie(res, 'mr_sid', makeToken({ uid: userId }, 3600), 3600);
    res.redirect(`${PUBLIC_URL}/#home`);
  });
}

// ---------- ต้องล็อกอิน ----------
const auth = async (req, res, next) => {
  const t = readToken(getCookie(req, 'mr_sid'));
  if (!t?.uid) return res.status(401).json({ error: 'login' });
  req.uid = t.uid;
  next();
};
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { log('error', req.path, e.message); res.status(500).json({ error: 'ระบบขัดข้อง ลองใหม่อีกครั้ง' }); });
const strList = (v, max, len = 40) => (Array.isArray(v) ? v : []).map((x) => String(x).trim().slice(0, len)).filter(Boolean).slice(0, max);

app.get('/api/me', auth, wrap(async (req, res) => {
  const m = await me(req.uid);
  if (!m) { setCookie(res, 'mr_sid', '', 0); return res.status(401).json({ error: 'login' }); }
  res.json(m);
}));

app.put('/api/profile/interests', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const interests = { goals: strList(b.goals, 10), categories: strList(b.categories, 20), styles: strList(b.styles, 20), platforms: strList(b.platforms, 10) };
  await q('UPDATE profiles SET interests=$2, updated_at=now() WHERE user_id=$1', [req.uid, interests]);
  await q('UPDATE users SET onboarded=TRUE WHERE id=$1', [req.uid]);
  res.json(await me(req.uid));
}));

const HEX = /^#[0-9a-fA-F]{6}$/;
const FONTS = ['Anuphan', 'Kanit', 'Prompt', 'Mitr', 'Sarabun', 'Chakra Petch'];
app.put('/api/profile/brand', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const s = (v, n = 120) => String(v || '').trim().slice(0, n);
  const url = (v) => { const x = s(v, 300); return /^https?:\/\//i.test(x) ? x : ''; };
  const cur = (await q('SELECT brand FROM profiles WHERE user_id=$1', [req.uid])).rows[0]?.brand || {};
  const brand = {
    ...cur,
    shopName: s(b.shopName, 60), tagline: s(b.tagline, 80), line: s(b.line, 60), phone: s(b.phone, 20).replace(/[^\d+\- ]/g, ''),
    shopLink: url(b.shopLink), mapLink: url(b.mapLink),
    color: HEX.test(b.color) ? b.color : cur.color || '#C8F94A', accent: HEX.test(b.accent) ? b.accent : cur.accent || '#0B0C0F',
    font: FONTS.includes(b.font) ? b.font : cur.font || 'Anuphan',
  };
  await q('UPDATE profiles SET brand=$2, updated_at=now() WHERE user_id=$1', [req.uid, brand]);
  res.json(await me(req.uid));
}));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
app.post('/api/profile/logo', auth, upload.single('logo'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'ไม่มีไฟล์' });
  const name = `${req.uid}-${rand(6).toLowerCase()}.png`;
  try {
    await sharp(req.file.buffer).rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).png().toFile(path.join(LOGO_DIR, name));
  } catch { return res.status(400).json({ error: 'ไฟล์รูปไม่ถูกต้อง' }); }
  const cur = (await q('SELECT brand FROM profiles WHERE user_id=$1', [req.uid])).rows[0]?.brand || {};
  if (cur.logo) fs.rm(path.join(LOGO_DIR, path.basename(cur.logo)), () => {});
  await q('UPDATE profiles SET brand = brand || $2::jsonb, updated_at=now() WHERE user_id=$1', [req.uid, { logo: name }]);
  res.json(await me(req.uid));
}));
app.get('/api/logo/:file', auth, (req, res) => {
  const f = path.basename(req.params.file);
  if (!f.startsWith(`${req.uid}-`)) return res.status(404).end();
  res.sendFile(path.join(LOGO_DIR, f), (e) => e && res.status(404).end());
});

app.put('/api/profile/hashtags', auth, wrap(async (req, res) => {
  const tags = [...new Set(strList(req.body?.hashtags, 40, 50).map((t) => '#' + t.replace(/^#+/, '').replace(/\s+/g, '')))].filter((t) => t.length > 1);
  await q('UPDATE profiles SET hashtags=$2, updated_at=now() WHERE user_id=$1', [req.uid, tags]);
  res.json(await me(req.uid));
}));

app.get('/api/stars/history', auth, wrap(async (req, res) => {
  const { rows } = await q('SELECT delta,kind,note,created_at FROM star_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.uid]);
  res.json({ items: rows });
}));

app.get('/api/trends', auth, wrap(async (req, res) => {
  const p = (await q('SELECT interests FROM profiles WHERE user_id=$1', [req.uid])).rows[0]?.interests || {};
  const mine = [...(p.goals || []), ...(p.categories || []), ...(p.styles || [])];
  const { rows } = await q('SELECT id,title,style,kind,price,badge,color,tags FROM trends WHERE active ORDER BY sort, id');
  const scored = rows.map((t) => ({ ...t, score: t.tags.filter((x) => mine.includes(x)).length })).sort((a, b) => b.score - a.score || 0);
  res.json({ items: scored.slice(0, 6), personalized: mine.length > 0 });
}));

// ---------- หน้าเว็บ ----------
app.use(express.static(path.join(__dir, 'public'), { maxAge: '1h', index: 'index.html' }));
app.get(['/privacy', '/terms'], (req, res) => res.sendFile(path.join(__dir, 'public', `${req.path.slice(1)}.html`)));

migrate().then(() => app.listen(PORT, () => log(`Mc Rich พร้อม :${PORT} (${PUBLIC_URL}) LINE=${PROVIDERS.line.enabled()} Google=${PROVIDERS.google.enabled()}`)))
  .catch((e) => { console.error('เริ่มระบบไม่สำเร็จ', e); process.exit(1); });
