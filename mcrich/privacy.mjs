// Mc Rich — เงื่อนไข/นโยบาย (PDPA): หน้าเอกสาร · ยอมรับเงื่อนไข · ดาวน์โหลดข้อมูลของฉัน · ปิดบัญชี · ข้อมูลผู้ให้บริการ (หลังบ้าน)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const TERMS_VERSION = '2026-11-23'; // เปลี่ยนเมื่อแก้สาระสำคัญของเงื่อนไข → ผู้ใช้ทุกคนต้องกดยอมรับใหม่
export const idHash = (provider, subject) => crypto.createHash('sha256').update(`mcrich:${provider}:${subject}`).digest('hex');

export function registerPrivacy(app, { q, pool, auth, wrap, log, DATA_DIR, PUBLIC_DIR, banned, purgeFiles, clearSession }) {
  const admin = async (req, res, next) => {
    const u = (await q('SELECT is_admin FROM users WHERE id=$1', [req.uid])).rows[0];
    if (!u?.is_admin) return res.status(403).json({ error: 'เฉพาะแอดมิน' });
    next();
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function legal() {
    const r = (await q("SELECT value FROM app_settings WHERE key='legal'")).rows[0]?.value || {};
    return { operator: r.operator || '', address: r.address || '', email: r.email || '', phone: r.phone || '', reviewed: !!r.reviewed };
  }

  // ---------- หน้าเอกสาร ----------
  const thDate = (v) => { const [y, m, d] = v.split('-').map(Number); return `${d} ${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][m - 1]} ${y + 543}`; };
  app.get(['/terms', '/privacy', '/refund'], wrap(async (req, res) => {
    const L = await legal();
    const pending = '<span class="tbd">[รอกรอกในหลังบ้าน]</span>';
    const oa = process.env.LINEOA_ID ? `LINE OA <a href="https://line.me/R/ti/p/${encodeURIComponent(process.env.LINEOA_ID)}">${esc(process.env.LINEOA_ID)}</a>` : '';
    const contact = [L.email && `อีเมล <a href="mailto:${esc(L.email)}">${esc(L.email)}</a>`, L.phone && `โทร ${esc(L.phone)}`, oa].filter(Boolean).join(' · ') || pending;
    let html = fs.readFileSync(path.join(PUBLIC_DIR, `${req.path.slice(1)}.html`), 'utf8');
    html = html.replaceAll('{{OPERATOR}}', L.operator ? esc(L.operator) : pending).replaceAll('{{ADDRESS}}', L.address ? esc(L.address) : pending)
      .replaceAll('{{CONTACT}}', contact).replaceAll('{{UPDATED}}', thDate(TERMS_VERSION))
      .replace('{{DRAFT}}', L.reviewed ? '' : '<p class="note">ฉบับร่าง · รอตรวจทานข้อกฎหมายก่อนเปิดให้บริการทั่วไป</p>');
    res.setHeader('cache-control', 'no-cache');
    res.type('html').send(html);
  }));

  // ---------- ยอมรับเงื่อนไข ----------
  app.put('/api/me/terms', auth, wrap(async (req, res) => {
    if (req.body?.version !== TERMS_VERSION) return res.status(400).json({ error: 'เงื่อนไขมีการปรับปรุง โหลดหน้าใหม่อีกครั้ง' });
    await q('UPDATE users SET terms_version=$2, terms_at=now() WHERE id=$1', [req.uid, TERMS_VERSION]);
    await q('INSERT INTO audit_log(user_id,action,detail,ip) VALUES($1,$2,$3,$4)', [req.uid, 'terms_accept', { version: TERMS_VERSION }, req.ip || '']);
    res.json({ ok: true, termsVersion: TERMS_VERSION });
  }));

  // ---------- ดาวน์โหลดข้อมูลของฉัน (สิทธิขอรับสำเนาข้อมูล) ----------
  app.get('/api/me/export', auth, wrap(async (req, res) => {
    const uid = req.uid;
    const all = async (sql) => (await q(sql, [uid])).rows;
    const u = (await q('SELECT public_id, name, email, avatar_url, created_at, last_login_at, terms_version, terms_at, referral_code FROM users WHERE id=$1', [uid])).rows[0];
    const data = {
      exportedAt: new Date().toISOString(), service: 'Mc Rich',
      account: u,
      logins: await all('SELECT provider, created_at FROM identities WHERE user_id=$1'),
      profile: (await all('SELECT interests, brand, hashtags, notify, updated_at FROM profiles WHERE user_id=$1'))[0] || {},
      stars: await all('SELECT delta, kind, note, created_at FROM star_ledger WHERE user_id=$1 ORDER BY id'),
      topups: await all('SELECT receipt_no, package, amount, stars, status, created_at, paid_at FROM topups WHERE user_id=$1 ORDER BY id'),
      works: await all("SELECT id, kind, style, title, params - 'video' AS params, captions, hashtags, cost, status, posted, created_at FROM works WHERE user_id=$1 ORDER BY id"),
      schedules: await all('SELECT work_id, platform, at, status, note FROM schedules WHERE user_id=$1 ORDER BY id'),
      links: await all('SELECT code, url, label, platform, clicks, created_at FROM links WHERE user_id=$1 ORDER BY created_at').catch(() => []),
      autoPlans: await all('SELECT name, goal, product, styles, days, post_time, platforms, cap_month, active, created_at FROM auto_plans WHERE user_id=$1').catch(() => []),
      chat: await all('SELECT role, content, channel, created_at FROM chat_messages WHERE user_id=$1 ORDER BY id').catch(() => []),
      googleDrive: (await all('SELECT email, created_at FROM drive_accounts WHERE user_id=$1'))[0] || null,
    };
    await q('INSERT INTO audit_log(user_id,action,detail) VALUES($1,$2,$3)', [uid, 'data_export', {}]);
    res.setHeader('content-disposition', `attachment; filename="mcrich-${u.public_id}.json"`);
    res.type('application/json').send(JSON.stringify(data, null, 2));
  }));

  // ---------- ปิดบัญชี (สิทธิขอลบข้อมูล) ----------
  app.delete('/api/me', auth, wrap(async (req, res) => {
    if (String(req.body?.confirm || '').trim() !== 'ลบบัญชี') return res.status(400).json({ error: 'พิมพ์คำว่า ลบบัญชี เพื่อยืนยัน' });
    const uid = req.uid;
    const u = (await q('SELECT is_admin FROM users WHERE id=$1', [uid])).rows[0];
    if (u?.is_admin) return res.status(400).json({ error: 'บัญชีแอดมินปิดเองไม่ได้ ยกเลิกสิทธิ์แอดมินก่อน' });
    const busy = (await q("SELECT count(*)::int n FROM works WHERE user_id=$1 AND status IN ('queued','working')", [uid])).rows[0].n;
    if (busy) return res.status(409).json({ error: 'มีงานกำลังสร้างอยู่ รอให้เสร็จก่อนแล้วค่อยปิดบัญชี' });
    const works = (await q('SELECT files, refs, params FROM works WHERE user_id=$1', [uid])).rows;
    const plans = (await q('SELECT refs FROM auto_plans WHERE user_id=$1', [uid])).rows;
    const logo = (await q("SELECT brand->>'logo' logo FROM profiles WHERE user_id=$1", [uid])).rows[0]?.logo;
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const ids = (await c.query('SELECT provider, subject FROM identities WHERE user_id=$1', [uid])).rows;
      for (const i of ids) await c.query('INSERT INTO closed_identities(hash) VALUES($1) ON CONFLICT DO NOTHING', [idHash(i.provider, i.subject)]);
      const bal = (await c.query('SELECT COALESCE(sum(delta),0)::int s FROM star_ledger WHERE user_id=$1', [uid])).rows[0].s;
      if (bal > 0) await c.query("INSERT INTO star_ledger(user_id,delta,kind,note) VALUES($1,$2,'closed','ปิดบัญชี')", [uid, -bal]);
      for (const t of ['identities', 'profiles', 'free_quota', 'drive_accounts', 'schedules', 'push_subs', 'chat_messages', 'auto_plans', 'links', 'works']) {
        await c.query(`DELETE FROM ${t} WHERE user_id=$1`, [uid]);
      }
      // เก็บไว้ตามกฎหมายบัญชี/ภาษี: star_ledger, topups (ใบเสร็จ) · ลบข้อมูลระบุตัวตนในโปรไฟล์ผู้ใช้
      await c.query(`UPDATE users SET name='ผู้ใช้ที่ปิดบัญชีแล้ว', avatar_url='', email='', banned=TRUE, deleted_at=now() WHERE id=$1`, [uid]);
      await c.query('INSERT INTO audit_log(user_id,action,detail) VALUES($1,$2,$3)', [uid, 'account_closed', { forfeited: Math.max(0, bal) }]);
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
    works.forEach((w) => purgeFiles(w));
    plans.forEach((p) => (p.refs || []).forEach((r) => fs.rm(path.join(DATA_DIR, 'auto', path.basename(r)), () => {})));
    if (logo) fs.rm(path.join(DATA_DIR, 'logos', path.basename(logo)), () => {});
    banned.add(Number(uid));
    clearSession(res);
    log('account closed', uid);
    res.json({ ok: true });
  }));

  // ---------- หลังบ้าน: ข้อมูลผู้ให้บริการ ----------
  app.get('/api/admin/legal', auth, admin, wrap(async (_req, res) => res.json({ ...(await legal()), termsVersion: TERMS_VERSION,
    accepted: (await q('SELECT count(*) FILTER (WHERE terms_version=$1)::int ok, count(*) FILTER (WHERE deleted_at IS NULL)::int total FROM users', [TERMS_VERSION])).rows[0] })));
  app.put('/api/admin/legal', auth, admin, wrap(async (req, res) => {
    const b = req.body || {};
    const v = { operator: String(b.operator || '').trim().slice(0, 120), address: String(b.address || '').trim().slice(0, 300),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email || '').trim()) ? String(b.email).trim().slice(0, 120) : '',
      phone: String(b.phone || '').replace(/[^\d+\- ]/g, '').slice(0, 20), reviewed: !!b.reviewed };
    await q("INSERT INTO app_settings(key,value) VALUES('legal',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [v]);
    res.json(v);
  }));
  // ---------- ลบข้อมูลตามระยะเวลาที่ประกาศ (วันละครั้ง) ----------
  async function sweep() {
    const a = await q("DELETE FROM audit_log WHERE created_at < now() - interval '2 years'");
    const c = await q("DELETE FROM link_clicks WHERE at < now() - interval '2 years'");
    const old = (await q("SELECT id, slip_file FROM topups WHERE slip_file <> '' AND created_at < now() - interval '5 years' LIMIT 500")).rows;
    for (const t of old) { fs.rm(path.join(DATA_DIR, 'slips', path.basename(t.slip_file)), () => {}); await q("UPDATE topups SET slip_file='', slip_data='{}'::jsonb WHERE id=$1", [t.id]); }
    if (a.rowCount || c.rowCount || old.length) log('ลบข้อมูลครบกำหนด', `audit=${a.rowCount}`, `clicks=${c.rowCount}`, `slips=${old.length}`);
  }
  // กันเปิดไฟล์ .html ตรง (ยังไม่เติมข้อมูลผู้ให้บริการ)
  app.get(['/terms.html', '/privacy.html', '/refund.html'], (req, res) => res.redirect(301, req.path.replace('.html', '').slice(1)));
  return { TERMS_VERSION, start: () => { setTimeout(() => sweep().catch((e) => log('privacy sweep', e.message)), 60e3).unref(); setInterval(() => sweep().catch((e) => log('privacy sweep', e.message)), 24 * 3600e3).unref(); } };
}
