// หน้าต้นทุน–รายได้ (หลังบ้าน): รายได้จากดาว · ต้นทุน AI ที่วัดได้จริง · เงินที่จ่ายจริงให้แต่ละเครื่องมือ · เทียบประมาณการเดิม
import { prices, savePrices, DEFAULT_PRICES } from './costs.mjs';

const TOOLS = { gemini: 'Google Gemini', fal: 'fal.ai (Kling/Seedance)', heygen: 'HeyGen', elevenlabs: 'ElevenLabs', hostinger: 'Hostinger VPS', domain: 'โดเมน', other: 'อื่นๆ' };
// ประมาณการเดิมต่อภาพ (USD) ตามระดับ — ใช้เทียบกับต้นทุนจริง
const EST_IMAGE = { free: 0.02, std: 0.04, hd: 0.055, pro: 0.14, pro4k: 0.25 };

export function registerCosts(app, { q, auth, wrap, log }) {
  const admin = async (req, res, next) => {
    const u = (await q('SELECT is_admin FROM users WHERE id=$1', [req.uid])).rows[0];
    if (!u?.is_admin) return res.status(403).json({ error: 'เฉพาะแอดมิน' });
    next();
  };
  const one = async (sql, a = []) => (await q(sql, a)).rows[0] || {};
  const all = async (sql, a = []) => (await q(sql, a)).rows;
  const num = (x) => Number(x) || 0;

  app.get('/api/admin/costs', auth, admin, wrap(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const fx = prices().usdThb || 35;
    const since = `now() - interval '${days} days'`;
    const sys = "(SELECT id FROM users WHERE public_id='MRSYSTEM')";

    // รายได้
    const cash = await one(`SELECT COALESCE(sum(amount),0)::numeric baht, COALESCE(sum(stars),0)::int stars, count(*)::int n FROM topups WHERE status='paid' AND paid_at >= ${since}`);
    const rate = await one("SELECT COALESCE(sum(amount),0)::numeric baht, COALESCE(sum(stars),0)::numeric stars FROM topups WHERE status='paid'");
    const thbPerStar = num(rate.stars) ? num(rate.baht) / num(rate.stars) : 1;
    const st = await one(`SELECT COALESCE(-sum(delta) FILTER (WHERE kind IN ('spend','refund')),0)::int spent,
      COALESCE(sum(delta) FILTER (WHERE kind IN ('signup_bonus','referral','admin') AND delta > 0),0)::int given
      FROM star_ledger WHERE created_at >= ${since} AND user_id NOT IN ${sys}`);
    const outstanding = await one(`SELECT COALESCE(sum(delta),0)::int stars FROM star_ledger WHERE user_id NOT IN ${sys}`);

    // ต้นทุน AI ที่วัดได้
    const cat = `CASE WHEN user_id IN ${sys} THEN 'ระบบ: ตัวอย่างแนวงาน' WHEN src LIKE 'work%' THEN 'งานลูกค้า' WHEN src LIKE 'chat%' THEN 'แชทริช'
      WHEN src LIKE 'background%' THEN 'เบื้องหลัง: สแกนเทรนด์' WHEN src LIKE 'api%' THEN 'ระหว่างใช้งานแอป (เขียนบท/อ่านลิงก์ ฯลฯ)' ELSE 'อื่นๆ' END`;
    const ai = await one(`SELECT COALESCE(sum(usd),0)::float usd, count(*)::int n FROM ai_costs WHERE at >= ${since}`);
    const byProvider = await all(`SELECT provider, COALESCE(sum(usd),0)::float usd, count(*)::int n FROM ai_costs WHERE at >= ${since} GROUP BY 1 ORDER BY 2 DESC`);
    const byModel = await all(`SELECT provider, model, op, unit, sum(units)::float units, COALESCE(sum(usd),0)::float usd, count(*)::int n FROM ai_costs WHERE at >= ${since} GROUP BY 1,2,3,4 ORDER BY usd DESC LIMIT 30`);
    const bySrc = await all(`SELECT ${cat} cat, COALESCE(sum(usd),0)::float usd, count(*)::int n FROM ai_costs WHERE at >= ${since} GROUP BY 1 ORDER BY 2 DESC`);
    const meterSince = await one('SELECT min(at) at FROM ai_costs');

    // ต่อแนวงาน: ดาวที่เก็บ vs ต้นทุนจริง vs ประมาณการเดิม (เฉพาะงานลูกค้าที่สำเร็จ และมีการวัดต้นทุนแล้ว)
    const styles = await all(`SELECT w.kind, w.style, w.tier, count(*)::int n, COALESCE(sum(w.cost),0)::int stars,
        COALESCE(sum(c.usd),0)::float usd, count(c.work_id)::int measured,
        avg(NULLIF(w.params->>'costUsd','')::float) est_usd, COALESCE(sum(w.versions),0)::int versions
      FROM works w LEFT JOIN (SELECT work_id, sum(usd) usd FROM ai_costs WHERE work_id IS NOT NULL GROUP BY 1) c ON c.work_id = w.id
      WHERE w.created_at >= ${since} AND w.status='done' AND w.user_id NOT IN ${sys}
      GROUP BY 1,2,3 ORDER BY usd DESC LIMIT 60`);
    const failedCost = await one(`SELECT COALESCE(sum(c.usd),0)::float usd, count(DISTINCT w.id)::int n FROM works w JOIN ai_costs c ON c.work_id=w.id WHERE w.status='failed' AND w.created_at >= ${since}`);

    // เงินที่จ่ายจริง
    const pays = await all('SELECT id, paid_on, tool, amount::float amount, currency, kind, note FROM cost_payments ORDER BY paid_on DESC, id DESC LIMIT 200');
    const thb = (p) => (p.currency === 'USD' ? p.amount * fx : p.amount);
    const paidAll = {}, paidRange = {};
    const cut = new Date(Date.now() - days * 864e5);
    for (const p of pays) { paidAll[p.tool] = (paidAll[p.tool] || 0) + thb(p); if (new Date(p.paid_on) >= cut) paidRange[p.tool] = (paidRange[p.tool] || 0) + thb(p); }
    const meterAll = Object.fromEntries((await all('SELECT provider, COALESCE(sum(usd),0)::float usd FROM ai_costs GROUP BY 1')).map((r) => [r.provider, r.usd * fx]));
    const fixedRange = pays.filter((p) => p.kind === 'fixed' && new Date(p.paid_on) >= cut).reduce((a, p) => a + thb(p), 0);

    // รายวัน
    const daily = await all(`SELECT to_char(d, 'DD/MM') d, d dd,
        COALESCE((SELECT sum(amount) FROM topups WHERE status='paid' AND (paid_at AT TIME ZONE 'Asia/Bangkok')::date = d),0)::float baht,
        COALESCE((SELECT -sum(delta) FROM star_ledger WHERE kind IN ('spend','refund') AND user_id NOT IN ${sys} AND (created_at AT TIME ZONE 'Asia/Bangkok')::date = d),0)::float stars,
        COALESCE((SELECT sum(usd) FROM ai_costs WHERE (at AT TIME ZONE 'Asia/Bangkok')::date = d),0)::float usd
      FROM generate_series((now() AT TIME ZONE 'Asia/Bangkok')::date - ${Math.min(days, 60) - 1}, (now() AT TIME ZONE 'Asia/Bangkok')::date, '1 day') d ORDER BY dd`);

    const revenue = st.spent * thbPerStar; // มูลค่าดาวที่ลูกค้าใช้จริง (คิดตามราคาขายเฉลี่ยรวมโบนัส)
    const aiThb = ai.usd * fx;
    res.json({
      days, fx, thbPerStar, meterSince: meterSince.at,
      revenue: { cashIn: num(cash.baht), topups: cash.n, starsSold: cash.stars, starsSpent: st.spent, starsGiven: st.given, starsOutstanding: outstanding.stars, earned: revenue },
      cost: { aiThb, calls: ai.n, fixedThb: fixedRange, failedThb: failedCost.usd * fx, failedWorks: failedCost.n },
      profit: { earned: revenue - aiThb - fixedRange, margin: revenue ? (revenue - aiThb) / revenue : null },
      byProvider: byProvider.map((r) => ({ ...r, thb: r.usd * fx, label: TOOLS[r.provider] || r.provider })),
      byModel: byModel.map((r) => ({ ...r, thb: r.usd * fx })),
      bySrc: bySrc.map((r) => ({ ...r, thb: r.usd * fx })),
      styles: styles.map((r) => {
        const est = r.kind === 'image' ? (EST_IMAGE[r.tier] || 0.05) * (r.versions / Math.max(1, r.n)) : r.est_usd;
        const avg = r.measured ? (r.usd * fx) / r.measured : null;
        return { ...r, thb: r.usd * fx, avgThb: avg, avgStars: r.stars / r.n, estThb: est != null ? est * fx : null, margin: avg != null && r.stars ? 1 - avg / ((r.stars / r.n) * thbPerStar) : null };
      }),
      tools: Object.keys(TOOLS).map((k) => ({ tool: k, label: TOOLS[k], paidAll: paidAll[k] || 0, paidRange: paidRange[k] || 0, meterAll: meterAll[k] ?? null })),
      payments: pays, daily,
    });
  }));

  app.post('/api/admin/costs/payments', auth, admin, wrap(async (req, res) => {
    const b = req.body || {};
    const amount = Number(b.amount);
    if (!(amount > 0)) return res.status(400).json({ error: 'ใส่จำนวนเงิน' });
    const tool = Object.keys(TOOLS).includes(b.tool) ? b.tool : 'other';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(b.paidOn || '') ? b.paidOn : new Date().toISOString().slice(0, 10);
    await q('INSERT INTO cost_payments(paid_on, tool, amount, currency, kind, note) VALUES($1,$2,$3,$4,$5,$6)',
      [d, tool, amount, b.currency === 'USD' ? 'USD' : 'THB', b.kind === 'fixed' ? 'fixed' : 'credit', String(b.note || '').slice(0, 120)]);
    res.json({ ok: true });
  }));
  app.delete('/api/admin/costs/payments/:id', auth, admin, wrap(async (req, res) => {
    await q('DELETE FROM cost_payments WHERE id=$1', [Number(req.params.id) || 0]);
    res.json({ ok: true });
  }));
  app.get('/api/admin/costs/prices', auth, admin, wrap(async (_req, res) => res.json({ prices: prices(), defaults: DEFAULT_PRICES })));
  app.put('/api/admin/costs/prices', auth, admin, wrap(async (req, res) => {
    try { res.json({ prices: await savePrices(q, req.body || {}) }); } catch (e) { log('cost prices', e.message); res.status(400).json({ error: 'บันทึกราคาไม่ได้' }); }
  }));
}
