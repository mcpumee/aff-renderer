// Mc Rich — หน้าแรกไวรัล: กระแสค้นหาในไทย (Google Trends) · คลิปมาแรง (YouTube) · คลิปที่แอดมินคัด (TikTok/YouTube/FB/IG)
// AI แปลงแต่ละกระแสเป็นไอเดียคอนเทนต์ที่สร้างในแอปได้ทันที และกรองข่าวร้าย/การเมือง/อาชญากรรมออก
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { STYLES } from './create.mjs';
import { VIDEO_STYLES } from './video.mjs';

const GEM = () => (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const GKEY = () => process.env.GEMINI_API_KEY || '';
const MODEL = process.env.MCRICH_TEXT_MODEL || 'gemini-flash-latest';
const TRENDS_RSS = () => process.env.TRENDS_RSS_URL || 'https://trends.google.com/trending/rss?geo=TH';
const YT_API = () => (process.env.YT_API_URL || 'https://www.googleapis.com/youtube/v3').replace(/\/+$/, '');
const YT_KEY = () => process.env.YOUTUBE_API_KEY || '';
const UA = 'Mozilla/5.0 (compatible; McRich/1.0)';

export const CATS = ['อาหาร ขนม', 'ความงาม', 'แฟชั่น', 'ของใช้ในบ้าน', 'แม่และเด็ก', 'ไอที แก็ดเจ็ต', 'สุขภาพ', 'ท่องเที่ยว ที่พัก', 'อสังหาฯ', 'ประกัน การเงิน'];
export const VSTYLES = ['เปิดกล่อง / สุ่ม', 'ละครตลก', 'สยองขวัญ', 'ย้อนยุค', 'รีวิวเห็นหน้า', 'มินิมอล', 'ASMR', 'ความรู้ วิชาการ'];
const IDEA_STYLES = [
  ...STYLES.filter((s) => !s.pr).map((s) => ({ id: s.id, kind: 'image', label: s.label, emoji: s.emoji || '🖼️' })),
  ...VIDEO_STYLES.filter((s) => !s.pr && s.id !== 'v_self').map((s) => ({ id: s.id, kind: 'video', label: s.label, emoji: s.emoji || '🎬' })),
];
const ent = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
const tag = (xml, t) => ent((xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '');
const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && !/^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(x.hostname) ? x.href : ''; } catch { return ''; } };
const platformOf = (u) => { const h = (() => { try { return new URL(u).hostname; } catch { return ''; } })(); return /tiktok/.test(h) ? 'tiktok' : /youtu/.test(h) ? 'youtube' : /facebook|fb\.watch/.test(h) ? 'facebook' : /instagram/.test(h) ? 'instagram' : 'web'; };

export function registerViral(app, { q, auth, wrap, log, DATA_DIR }) {
  const DIR = path.join(DATA_DIR, 'viral');
  fs.mkdirSync(DIR, { recursive: true });
  const admin = async (req, res, next) => {
    const u = (await q('SELECT is_admin FROM users WHERE id=$1', [req.uid])).rows[0];
    if (!u?.is_admin) return res.status(403).json({ error: 'เฉพาะแอดมิน' });
    next();
  };
  const get = async (url, type = 'text') => {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'th,en;q=0.8' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`${r.status} ${new URL(url).hostname}`);
    return type === 'json' ? r.json() : type === 'buf' ? Buffer.from(await r.arrayBuffer()) : r.text();
  };
  const upsert = (it) => q(`INSERT INTO viral_items(source,ext_id,title,url,thumb_url,meta,rank,fetched_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())
    ON CONFLICT (source,ext_id) DO UPDATE SET title=EXCLUDED.title, url=EXCLUDED.url, meta=EXCLUDED.meta, rank=EXCLUDED.rank, fetched_at=now(),
      thumb_url=CASE WHEN EXCLUDED.thumb_url<>'' THEN EXCLUDED.thumb_url ELSE viral_items.thumb_url END`,
  [it.source, it.ext_id, it.title.slice(0, 200), it.url, it.thumb || '', it.meta || {}, it.rank || 0]);

  // ---------- แหล่งข้อมูล ----------
  async function fetchTrends() {
    const xml = await get(TRENDS_RSS());
    const items = xml.split(/<item>/).slice(1).map((b) => b.split('</item>')[0]);
    let n = 0;
    for (const [i, b] of items.slice(0, 25).entries()) {
      const title = tag(b, 'title'); if (!title) continue;
      const news = b.split(/<ht:news_item>/).slice(1).map((x) => ({ title: tag(x, 'ht:news_item_title'), url: safeUrl(tag(x, 'ht:news_item_url')), source: tag(x, 'ht:news_item_source') })).filter((x) => x.title).slice(0, 3);
      await upsert({ source: 'gtrends', ext_id: title.toLowerCase(), title, url: `https://www.google.com/search?q=${encodeURIComponent(title)}`,
        thumb: safeUrl(tag(b, 'ht:picture')), meta: { traffic: tag(b, 'ht:approx_traffic'), news }, rank: i + 1 });
      n++;
    }
    return n;
  }
  async function fetchYouTube() {
    if (!YT_KEY()) return 0;
    const j = await get(`${YT_API()}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=TH&maxResults=30&key=${encodeURIComponent(YT_KEY())}`, 'json');
    let n = 0;
    for (const [i, v] of (j.items || []).entries()) {
      const s = v.snippet || {};
      const dur = String(v.contentDetails?.duration || '');
      const sec = (() => { const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; })();
      await upsert({ source: 'youtube', ext_id: v.id, title: ent(s.title || ''), url: `https://www.youtube.com/watch?v=${v.id}`,
        thumb: safeUrl(s.thumbnails?.high?.url || s.thumbnails?.medium?.url || ''),
        meta: { channel: s.channelTitle || '', views: Number(v.statistics?.viewCount || 0), category: s.categoryId || '', sec, short: sec > 0 && sec <= 60, published: s.publishedAt || '' }, rank: i + 1 });
      n++;
    }
    return n;
  }
  async function oembed(url) {
    const p = platformOf(url);
    const ep = p === 'tiktok' ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` : p === 'youtube' ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}` : '';
    if (!ep) return { platform: p };
    try { const j = await get(ep, 'json'); return { platform: p, title: ent(j.title || ''), author: j.author_name || '', thumb: safeUrl(j.thumbnail_url || ''), vertical: p === 'tiktok' }; }
    catch (e) { log('oembed fail', p, e.message); return { platform: p }; }
  }

  // ---------- AI: กรอง + แปลงเป็นไอเดีย ----------
  const SCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', required: ['i', 'safe'], properties: {
    i: { type: 'INTEGER' }, safe: { type: 'BOOLEAN' }, tags: { type: 'ARRAY', items: { type: 'STRING' } }, summary: { type: 'STRING' },
    style: { type: 'STRING' }, hook: { type: 'STRING' }, angle: { type: 'STRING' }, product: { type: 'STRING' } } } };
  async function enrich() {
    if (!GKEY()) return 0;
    const rows = (await q("SELECT id, source, title, meta FROM viral_items WHERE idea IS NULL AND active AND fetched_at > now() - interval '3 days' ORDER BY pinned DESC, fetched_at DESC, rank LIMIT 20")).rows;
    if (!rows.length) return 0;
    const list = rows.map((r, i) => `${i}. [${r.source === 'gtrends' ? 'คำค้นหามาแรง' : 'คลิปมาแรง'}] ${r.title}${r.meta?.news?.length ? ` | ข่าว: ${r.meta.news.map((n) => n.title).join(' / ')}` : ''}${r.meta?.channel ? ` | ช่อง: ${r.meta.channel}` : ''}${r.meta?.author ? ` | โดย: ${r.meta.author}` : ''}`).join('\n');
    const prompt = `คุณเป็นนักวางกลยุทธ์คอนเทนต์ให้แม่ค้าออนไลน์และร้านค้าไทย ด้านล่างคือกระแสที่กำลังมาแรงในไทยวันนี้
สำหรับแต่ละรายการ ให้:
- safe: false ถ้าเป็น ข่าวเศร้า การเสียชีวิต อุบัติเหตุ ภัยพิบัติ อาชญากรรม คดีความ การเมือง การเลือกตั้ง ศาสนาที่ขัดแย้ง เรื่องทางเพศ การพนัน หรือดราม่าส่วนตัวของบุคคล (ไม่เหมาะเอามาขายของ) นอกนั้น true
- tags: เลือก 0-3 คำจากรายการนี้เท่านั้น: ${[...CATS, ...VSTYLES].join(', ')}
- summary: กระแสนี้คืออะไร ทำไมคนสนใจ (ไม่เกิน 70 ตัวอักษร ภาษาไทย ไม่แต่งข้อเท็จจริงเพิ่ม)
- style: แนวงานในแอปที่เหมาะสุดสำหรับเกาะกระแสนี้ (id จากรายการ) เน้นคลิป
- hook: ข้อความเปิดคลิป/พาดหัว เกาะกระแสแบบสร้างสรรค์ ไม่อ้างว่าเกี่ยวข้องกับคนดัง/แบรนด์ในข่าว ไม่โฆษณาเกินจริง (ไม่เกิน 36 ตัวอักษร)
- angle: วิธีเอาไปใช้ขายของหรือทำคอนเทนต์ร้าน 1 ประโยค (ไม่เกิน 90 ตัวอักษร)
- product: ตัวอย่างสินค้า/หัวข้อที่เข้ากับกระแส (ไม่เกิน 30 ตัวอักษร)
แนวงานในแอป: ${IDEA_STYLES.map((s) => `${s.id}=${s.kind === 'video' ? 'คลิป' : 'ภาพ'} ${s.label}`).join(', ')}
รายการ:
${list}
ตอบเป็น JSON array ตามลำดับ i`;
    const r = await fetch(`${GEM()}/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': GKEY() },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.7 } }),
      signal: AbortSignal.timeout(90000),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`gemini ${r.status} ${j.error?.message || ''}`);
    const raw = (j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    let arr; try { arr = JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim()); } catch { arr = []; }
    let n = 0;
    for (const o of Array.isArray(arr) ? arr : []) {
      const row = rows[Number(o.i)]; if (!row) continue;
      const st = IDEA_STYLES.find((s) => s.id === o.style) || IDEA_STYLES.find((s) => s.id === 'v_sell') || IDEA_STYLES[0];
      const idea = { style: st.id, kind: st.kind, label: st.label, emoji: st.emoji, hook: String(o.hook || '').slice(0, 50), angle: String(o.angle || '').slice(0, 120),
        product: String(o.product || '').slice(0, 40), summary: String(o.summary || '').slice(0, 100) };
      const tags = (Array.isArray(o.tags) ? o.tags : []).filter((t) => CATS.includes(t) || VSTYLES.includes(t)).slice(0, 3);
      await q('UPDATE viral_items SET idea=$2, tags=$3, safe=$4 WHERE id=$1', [row.id, idea, tags, o.safe !== false]);
      n++;
    }
    return n;
  }
  async function cacheThumbs() {
    const rows = (await q("SELECT id, thumb_url FROM viral_items WHERE thumb_file='' AND thumb_url<>'' AND active AND fetched_at > now() - interval '2 days' LIMIT 40")).rows;
    for (const r of rows) {
      try {
        const buf = await get(r.thumb_url, 'buf');
        const name = `${r.id}.webp`;
        await sharp(buf).resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 }).toFile(path.join(DIR, name));
        await q('UPDATE viral_items SET thumb_file=$2 WHERE id=$1', [r.id, name]);
      } catch (e) { await q("UPDATE viral_items SET thumb_url='' WHERE id=$1", [r.id]); log('viral thumb fail', r.id, e.message); }
    }
  }
  async function cleanup() {
    // ไม่เก็บข้อมูลภายนอกเกิน 30 วัน (ตามเงื่อนไข YouTube API) · คลิปคัดที่ไม่ปักหมุดหมดอายุ 14 วัน
    const old = (await q(`DELETE FROM viral_items WHERE (fetched_at < now() - interval '30 days') OR (source='curated' AND NOT pinned AND first_seen < now() - interval '14 days') RETURNING thumb_file`)).rows;
    old.forEach((r) => r.thumb_file && fs.rm(path.join(DIR, path.basename(r.thumb_file)), () => {}));
  }
  let running = null, lastRun = null, lastErr = '';
  async function refresh() {
    if (running) return running;
    running = (async () => {
      const out = {};
      for (const [k, fn] of [['trends', fetchTrends], ['youtube', fetchYouTube], ['ideas', enrich], ['thumbs', cacheThumbs], ['cleanup', cleanup]]) {
        try { out[k] = await fn(); } catch (e) { out[k] = `ERR ${e.message}`; lastErr = `${k}: ${e.message}`; log('viral', k, e.message); }
      }
      lastRun = new Date(); log('viral refresh', JSON.stringify(out));
      return out;
    })().finally(() => { running = null; });
    return running;
  }

  // ---------- API หน้าแรก ----------
  const view = (r) => ({
    id: r.id, source: r.source, title: r.title, url: r.url, thumb: r.thumb_file ? `api/viral/${r.id}/thumb` : '',
    traffic: r.meta?.traffic || '', news: r.meta?.news?.[0] || null, channel: r.meta?.channel || r.meta?.author || '', views: r.meta?.views || 0,
    platform: r.meta?.platform || (r.source === 'youtube' ? 'youtube' : r.source === 'gtrends' ? 'google' : 'web'), vertical: !!(r.meta?.vertical || r.meta?.short),
    pinned: r.pinned, idea: r.idea, tags: r.tags,
  });
  let cache = { at: 0, rows: [] };
  async function rowsNow() {
    if (Date.now() - cache.at < 60e3) return cache.rows;
    const rows = (await q(`SELECT * FROM viral_items WHERE active AND safe AND (pinned OR fetched_at > now() - interval '36 hours')
      ORDER BY pinned DESC, source, rank, fetched_at DESC LIMIT 120`)).rows;
    cache = { at: Date.now(), rows };
    return rows;
  }
  app.get('/api/viral', auth, wrap(async (req, res) => {
    const p = (await q('SELECT interests FROM profiles WHERE user_id=$1', [req.uid])).rows[0]?.interests || {};
    const mine = new Set([...(p.categories || []), ...(p.styles || [])]);
    const rows = await rowsNow();
    const score = (r) => (r.tags || []).filter((t) => mine.has(t)).length;
    const trends = rows.filter((r) => r.source === 'gtrends').sort((a, b) => a.rank - b.rank).slice(0, 12).map(view);
    const clips = rows.filter((r) => r.source !== 'gtrends').sort((a, b) => (b.pinned - a.pinned) || (b.source === 'curated') - (a.source === 'curated') || a.rank - b.rank).slice(0, 15).map(view);
    // ไอเดียสำหรับคุณ: กระแสที่ตรงความสนใจก่อน ไม่ซ้ำแนวงาน
    const pool = rows.filter((r) => r.idea).map((r) => ({ r, s: score(r) * 10 + (r.pinned ? 5 : 0) - (r.rank || 0) / 10 })).sort((a, b) => b.s - a.s);
    const seen = new Set(); const ideas = [];
    for (const { r } of pool) { if (seen.has(r.idea.style)) continue; seen.add(r.idea.style); ideas.push(view(r)); if (ideas.length >= 4) break; }
    res.json({ trends, clips, ideas, updatedAt: rows.reduce((m, r) => (r.fetched_at > m ? r.fetched_at : m), null), personalized: mine.size > 0 });
  }));
  app.get('/api/viral/:id/thumb', auth, wrap(async (req, res) => {
    const r = (await q('SELECT thumb_file FROM viral_items WHERE id=$1', [Number(req.params.id) || 0])).rows[0];
    const f = r?.thumb_file && path.join(DIR, path.basename(r.thumb_file));
    if (!f || !fs.existsSync(f)) return res.status(404).end();
    res.setHeader('cache-control', 'private, max-age=86400'); res.sendFile(f);
  }));

  // ---------- หลังบ้าน ----------
  app.get('/api/admin/viral', auth, admin, wrap(async (_req, res) => {
    const rows = (await q("SELECT * FROM viral_items WHERE fetched_at > now() - interval '3 days' OR pinned OR source='curated' ORDER BY source, pinned DESC, rank, id DESC LIMIT 150")).rows;
    res.json({ items: rows.map((r) => ({ ...view(r), active: r.active, safe: r.safe })), youtube: !!YT_KEY(), ai: !!GKEY(), lastRun, lastErr, running: !!running });
  }));
  app.post('/api/admin/viral', auth, admin, wrap(async (req, res) => {
    const url = safeUrl(String(req.body?.url || '').trim());
    if (!url) return res.status(400).json({ error: 'ลิงก์ต้องขึ้นต้น https://' });
    const o = await oembed(url);
    const title = String(req.body?.title || '').trim().slice(0, 200) || o.title;
    if (!title) return res.status(400).json({ error: 'ดึงชื่อคลิปไม่ได้ ใส่ชื่อเองด้วย' });
    await upsert({ source: 'curated', ext_id: url, title, url, thumb: o.thumb, meta: { platform: o.platform, author: o.author || '', vertical: !!o.vertical }, rank: 0 });
    await q("UPDATE viral_items SET pinned=TRUE, idea=NULL, active=TRUE WHERE source='curated' AND ext_id=$1", [url]);
    cache.at = 0;
    refresh().catch(() => {});
    res.json({ ok: true, title, platform: o.platform, thumb: !!o.thumb });
  }));
  app.patch('/api/admin/viral/:id', auth, admin, wrap(async (req, res) => {
    const b = req.body || {};
    const id = Number(req.params.id) || 0;
    if (typeof b.active === 'boolean') await q('UPDATE viral_items SET active=$2 WHERE id=$1', [id, b.active]);
    if (typeof b.pinned === 'boolean') await q('UPDATE viral_items SET pinned=$2 WHERE id=$1', [id, b.pinned]);
    if (typeof b.safe === 'boolean') await q('UPDATE viral_items SET safe=$2 WHERE id=$1', [id, b.safe]);
    if (b.reidea) await q('UPDATE viral_items SET idea=NULL WHERE id=$1', [id]);
    cache.at = 0;
    res.json({ ok: true });
  }));
  app.delete('/api/admin/viral/:id', auth, admin, wrap(async (req, res) => {
    const r = (await q('DELETE FROM viral_items WHERE id=$1 RETURNING thumb_file', [Number(req.params.id) || 0])).rows[0];
    if (r?.thumb_file) fs.rm(path.join(DIR, path.basename(r.thumb_file)), () => {});
    cache.at = 0; res.json({ ok: true });
  }));
  app.post('/api/admin/viral/refresh', auth, admin, wrap(async (_req, res) => { const out = await refresh(); cache.at = 0; res.json(out); }));

  function start() {
    setTimeout(() => refresh().catch(() => {}), 20e3).unref();
    setInterval(() => refresh().catch(() => {}), 2 * 3600e3).unref();
  }
  return { start, refresh };
}
