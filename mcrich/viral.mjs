// Mc Rich — หน้าแรกไวรัล: กระแสค้นหาในไทย (Google Trends) · คลิปมาแรง (YouTube) · คลิปที่แอดมินคัด (TikTok/YouTube/FB/IG)
// AI แปลงแต่ละกระแสเป็นไอเดียคอนเทนต์ที่สร้างในแอปได้ทันที และกรองข่าวร้าย/การเมือง/อาชญากรรมออก
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { STYLES } from './create.mjs';
import { VIDEO_STYLES } from './video.mjs';
import { withCost, thinkLow } from './costs.mjs';
import { readPage } from './linkread.mjs';

const GEM = () => (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const GKEY = () => process.env.GEMINI_API_KEY || '';
const MODEL = process.env.MCRICH_TEXT_MODEL || 'gemini-flash-latest';
const TRENDS_RSS = () => process.env.TRENDS_RSS_URL || 'https://trends.google.com/trending/rss?geo=TH';
const YT_API = () => (process.env.YT_API_URL || 'https://www.googleapis.com/youtube/v3').replace(/\/+$/, '');
const YT_KEY = () => process.env.YOUTUBE_API_KEY || '';
const UA = 'Mozilla/5.0 (compatible; McRich/1.0)';
const SC_API = () => (process.env.SC_API_URL || 'https://api.scrapecreators.com').replace(/\/+$/, '');
const SC_KEY = () => process.env.SCRAPECREATORS_API_KEY || '';

// กลุ่มคลิปไวรัลตามสไตล์/หมวดของลูกค้า (key ตรงกับตัวเลือกความสนใจ) · คำค้นภาษาไทยหมุนเวียนทีละคำ
export const GROUPS = [
  { key: 'unbox', label: 'เปิดกล่อง / สุ่ม', emoji: '🎁', interest: 'เปิดกล่อง / สุ่ม', q: ['เปิดกล่องสุ่ม', 'แกะกล่อง', 'กล่องสุ่ม'], style: 'v_mystery' },
  { key: 'comedy', label: 'ละครตลก', emoji: '🎭', interest: 'ละครตลก', q: ['ละครสั้น ตลก', 'ละครสั้น ขายของ', 'คลิปตลก ป้ายยา'], style: 'v_drama' },
  { key: 'horror', label: 'สยองขวัญ', emoji: '👻', interest: 'สยองขวัญ', q: ['เรื่องผี', 'เล่าเรื่องผี', 'หลอน'], style: 'v_drama' },
  { key: 'retro', label: 'ย้อนยุค', emoji: '📼', interest: 'ย้อนยุค', q: ['ย้อนยุค', 'ของเล่นสมัยก่อน', 'วินเทจ'], style: 'v_show' },
  { key: 'review', label: 'รีวิว / ป้ายยา', emoji: '🛍️', interest: 'รีวิวเห็นหน้า', q: ['รีวิวสินค้า', 'ป้ายยา', 'ของมันต้องมี'], style: 'v_sell' },
  { key: 'minimal', label: 'มินิมอล', emoji: '🤍', interest: 'มินิมอล', q: ['มินิมอล', 'แต่งห้องมินิมอล'], style: 'product_luxury' },
  { key: 'asmr', label: 'ASMR', emoji: '🎧', interest: 'ASMR', q: ['asmr', 'asmr กิน', 'asmr แกะกล่อง'], style: 'v_show' },
  { key: 'edu', label: 'ความรู้', emoji: '💡', interest: 'ความรู้ วิชาการ', q: ['ความรู้', 'รู้หรือไม่', 'ทริค'], style: 'v_tips' },
  { key: 'food', label: 'อาหาร ขนม', emoji: '🍜', interest: 'อาหาร ขนม', q: ['รีวิวอาหาร', 'ของกิน', 'ขนม'], style: 'v_show' },
  { key: 'beauty', label: 'ความงาม', emoji: '💄', interest: 'ความงาม', q: ['รีวิวสกินแคร์', 'แต่งหน้า', 'เครื่องสำอาง'], style: 'v_sell' },
  { key: 'fashion', label: 'แฟชั่น', emoji: '👗', interest: 'แฟชั่น', q: ['แต่งตัว', 'ootd', 'เสื้อผ้า'], style: 'v_show' },
  { key: 'home', label: 'ของใช้ในบ้าน', emoji: '🏠', interest: 'ของใช้ในบ้าน', q: ['ของใช้ในบ้าน', 'ไอเทมในบ้าน', 'ของมันต้องมีในบ้าน'], style: 'v_sell' },
  { key: 'mom', label: 'แม่และเด็ก', emoji: '🍼', interest: 'แม่และเด็ก', q: ['ของใช้เด็ก', 'คุณแม่', 'ของเล่นเด็ก'], style: 'v_gift' },
  { key: 'gadget', label: 'ไอที แก็ดเจ็ต', emoji: '📱', interest: 'ไอที แก็ดเจ็ต', q: ['รีวิวแก็ดเจ็ต', 'แกะกล่องมือถือ', 'อุปกรณ์ไอที'], style: 'v_gift' },
  { key: 'health', label: 'สุขภาพ', emoji: '💪', interest: 'สุขภาพ', q: ['สุขภาพ', 'ออกกำลังกาย', 'ลดน้ำหนัก'], style: 'v_tips' },
  { key: 'travel', label: 'ท่องเที่ยว ที่พัก', emoji: '🏝️', interest: 'ท่องเที่ยว ที่พัก', q: ['ที่เที่ยว', 'รีวิวที่พัก', 'คาเฟ่'], style: 'v_shop' },
  { key: 'property', label: 'อสังหาฯ', emoji: '🏡', interest: 'อสังหาฯ', q: ['รีวิวบ้าน', 'รีวิวคอนโด', 'บ้านมือสอง'], style: 'v_show' },
  { key: 'finance', label: 'ประกัน การเงิน', emoji: '💰', interest: 'ประกัน การเงิน', q: ['ประกัน', 'การเงิน', 'ออมเงิน'], style: 'v_tips' },
];
export const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'];
const PLABEL = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube Shorts', facebook: 'Facebook' };

// ---------- แปลงผลลัพธ์จากแต่ละแพลตฟอร์มให้เป็นรูปแบบเดียว (ทนต่อรูปแบบ JSON ที่ต่างกัน) ----------
const numOf = (v) => {
  if (typeof v === 'number') return v;
  const m = String(v ?? '').replace(/,/g, '').match(/([\d.]+)\s*([KMBพันหมื่นแสนล้าน]*)/i);
  if (!m) return 0;
  const mul = { K: 1e3, k: 1e3, M: 1e6, m: 1e6, B: 1e9, b: 1e9, 'พัน': 1e3, 'หมื่น': 1e4, 'แสน': 1e5, 'ล้าน': 1e6 }[m[2]] || 1;
  return Math.round(Number(m[1]) * mul) || 0;
};
function deep(o, keys, depth = 3) {
  const queue = [[o, 0]];
  while (queue.length) {
    const [x, d] = queue.shift();
    if (!x || typeof x !== 'object') continue;
    for (const k of keys) if (x[k] !== undefined && x[k] !== null && x[k] !== '') return x[k];
    if (d < depth) for (const v of Object.values(x)) if (v && typeof v === 'object' && !Array.isArray(v)) queue.push([v, d + 1]);
  }
  return undefined;
}
const imgOf = (v) => (typeof v === 'string' ? v : Array.isArray(v) ? imgOf(v[0]) : v && typeof v === 'object' ? imgOf(v.url_list || v.url || v.src || v.candidates || v.uri) : '');
function listOf(j) {
  let best = [];
  const walk = (o, d) => {
    if (!o || typeof o !== 'object' || d > 4) return;
    if (Array.isArray(o)) { if (o.length > best.length && o.some((x) => x && typeof x === 'object')) best = o; return; }
    for (const v of Object.values(o)) walk(v, d + 1);
  };
  walk(j, 0);
  return best;
}
function normalize(platform, raw) {
  const o = raw?.aweme_info || raw?.item || raw?.media || raw?.reel || raw;
  if (!o || typeof o !== 'object') return null;
  const id = String(deep(o, ['aweme_id', 'video_id', 'videoId', 'id', 'pk', 'code', 'shortcode'], 1) ?? '');
  if (!id) return null;
  const code = deep(o, ['code', 'shortcode'], 1);
  const capObj = o.caption && typeof o.caption === 'object' ? o.caption.text : o.caption;
  const text = String(o.desc || o.title || capObj || o.description || o.text || o.message || deep(o, ['title', 'desc', 'text']) || '').replace(/\s+/g, ' ').trim();
  const relTxt = String(o.relative_time_text || o.viewCountText || o.view_count_text || '');
  const views = numOf(deep(o, ['play_count', 'playCount', 'video_play_count', 'ig_play_count', 'video_view_count', 'view_count', 'viewCountInt', 'viewCount', 'views', 'play_count_int'])) || numOf((relTxt.match(/([\d.,]+\s*[KMB]?)\s*(views|ครั้ง|การดู)/i) || [])[1]);
  const likes = numOf(deep(o, ['digg_count', 'like_count', 'likeCount', 'likes', 'reaction_count']));
  const thumb = imgOf(deep(o, ['origin_cover', 'cover', 'thumbnail_url', 'thumbnail_src', 'thumbnail', 'thumbnailUrl', 'display_url', 'image_versions2', 'thumbnails', 'image', 'picture'])) || '';
  const authorObj = o.author || o.owner || o.user || o.channel || {};
  const handle = String(authorObj.unique_id || authorObj.username || authorObj.handle || '');
  const author = String(authorObj.nickname || authorObj.full_name || authorObj.name || authorObj.title || handle || '');
  const t = deep(o, ['create_time', 'taken_at', 'createTime', 'publish_time', 'published_at', 'publishedAt', 'creation_time', 'timestamp', 'publishedTime', 'uploadDate']);
  let posted = null;
  if (typeof t === 'number') posted = new Date(t > 1e12 ? t : t * 1000);
  else if (t && !Number.isNaN(Date.parse(t))) posted = new Date(t);
  const given = String(o.share_url || o.url || o.permalink || o.link || '');
  const url = platform === 'tiktok' ? (/tiktok\.com/.test(given) ? given.split('?')[0] : `https://www.tiktok.com/@${handle || '_'}/video/${id}`)
    : platform === 'instagram' ? (code ? `https://www.instagram.com/reel/${code}/` : /instagram\.com/.test(given) ? given : '')
      : platform === 'youtube' ? (/youtu/.test(given) ? given : `https://www.youtube.com/shorts/${id}`)
        : /facebook\.com|fb\.watch/.test(given) ? given : '';
  if (!url || !text && !thumb) return null;
  return { id, title: text.slice(0, 200) || `${PLABEL[platform]} · ${author}`, url, thumb: safeUrl(thumb), views, likes, author, posted };
}
const SC_REQ = {
  tiktok: (qq) => `/v1/tiktok/search/keyword?query=${encodeURIComponent(qq)}&sort_by=most-liked&date_posted=this-week&region=TH&trim=true`,
  instagram: (qq) => `/v2/instagram/reels/search?query=${encodeURIComponent(qq)}&date_posted=last-week`,
  youtube: (qq) => `/v1/youtube/search?query=${encodeURIComponent(qq)}&content_type=shorts&upload_date=this_week&sort_by=popular&region=TH`,
  facebook: (qq) => `/v1/facebook/search/videos?query=${encodeURIComponent(qq)}`,
};

export const CATS = ['อาหาร ขนม', 'ความงาม', 'แฟชั่น', 'ของใช้ในบ้าน', 'แม่และเด็ก', 'ไอที แก็ดเจ็ต', 'สุขภาพ', 'ท่องเที่ยว ที่พัก', 'อสังหาฯ', 'ประกัน การเงิน'];
export const VSTYLES = ['เปิดกล่อง / สุ่ม', 'ละครตลก', 'สยองขวัญ', 'ย้อนยุค', 'รีวิวเห็นหน้า', 'มินิมอล', 'ASMR', 'ความรู้ วิชาการ'];
const IDEA_STYLES = [
  ...STYLES.filter((s) => !s.pr).map((s) => ({ id: s.id, kind: 'image', label: s.label, emoji: s.emoji || '🖼️' })),
  ...VIDEO_STYLES.filter((s) => !s.pr && s.id !== 'v_self' && s.id !== 'v_remix').map((s) => ({ id: s.id, kind: 'video', label: s.label, emoji: s.emoji || '🎬' })),
];
const ent = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
const tag = (xml, t) => ent((xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '');
const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && !/^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(x.hostname) ? x.href : ''; } catch { return ''; } };
const platformOf = (u) => { const h = (() => { try { return new URL(u).hostname; } catch { return ''; } })(); return /tiktok/.test(h) ? 'tiktok' : /youtu/.test(h) ? 'youtube' : /facebook|fb\.watch/.test(h) ? 'facebook' : /instagram/.test(h) ? 'instagram' : 'web'; };

// คลิปที่แอดมินแนบได้: เฉพาะ Reels (IG/FB) · YouTube Shorts · TikTok
export function shortKind(u) {
  let x; try { x = new URL(u); } catch { return ''; }
  const h = x.hostname.replace(/^www\.|^m\./, ''), p = x.pathname;
  if (/(^|\.)tiktok\.com$/.test(h) && (/\/video\/\d+/.test(p) || /^(vt|vm)\./.test(x.hostname) || /^\/t\//.test(p))) return 'tiktok';
  if (/(^|\.)youtube\.com$/.test(h) && /^\/shorts\/[\w-]{6,}/.test(p)) return 'youtube';
  if (/(^|\.)instagram\.com$/.test(h) && /^\/(reel|reels)\/[\w-]+/.test(p)) return 'instagram';
  if ((/(^|\.)facebook\.com$/.test(h) && /\/reel\/\d+/.test(p)) || /(^|\.)fb\.watch$/.test(h) || (/(^|\.)facebook\.com$/.test(h) && /^\/share\/r\//.test(p))) return 'facebook';
  return '';
}

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
      await upsert({ source: 'ytpopular', ext_id: v.id, title: ent(s.title || ''), url: `https://www.youtube.com/watch?v=${v.id}`,
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

  // ---------- คลิปไวรัลหลายแพลตฟอร์ม (ScrapeCreators) แยกตามสไตล์ลูกค้า ----------
  // auto=false (ค่าเริ่มต้น): ไม่ดึงอัตโนมัติ (ประหยัดงบ) — หน้าแรกแสดงเฉพาะคลิปที่แอดมินแนบลิงก์เอง
  const DEF_CFG = { auto: false, daily: 100, platforms: { tiktok: true, instagram: false, youtube: false, facebook: false }, perQuery: 6, ytShorts: true, ytDaily: 72 };
  async function cfg() {
    const r = (await q("SELECT value FROM app_settings WHERE key='viral_cfg'")).rows[0]?.value || {};
    return { ...DEF_CFG, ...r, platforms: { ...DEF_CFG.platforms, ...(r.platforms || {}) } };
  }
  async function usage(add = 0, remaining) {
    const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const cur = (await q("SELECT value FROM app_settings WHERE key='viral_usage'")).rows[0]?.value || {};
    const u = { day, used: cur.day === day ? cur.used || 0 : 0, month: cur.month || {}, remaining: remaining ?? cur.remaining ?? null, cursor: cur.cursor || 0 };
    if (add) { u.used += add; const mk = day.slice(0, 7); u.month = { [mk]: ((cur.month || {})[mk] || 0) + add }; }
    return u;
  }
  const saveUsage = (u) => q("INSERT INTO app_settings(key,value) VALUES('viral_usage',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [u]);
  const samples = {};
  async function saveClip(p, g, kw, it) {
    const ageH = it.posted ? Math.max(1, (Date.now() - it.posted) / 3600e3) : 72;
    const score = Math.round((it.views || it.likes * 20) / Math.pow(ageH + 6, 0.7));
    await q(`INSERT INTO viral_items(source,ext_id,title,url,thumb_url,meta,tags,rank,fetched_at) VALUES($1,$2,$3,$4,$5,$6,$7,0,now())
      ON CONFLICT (source,ext_id) DO UPDATE SET title=EXCLUDED.title, fetched_at=now(),
        meta = viral_items.meta || jsonb_build_object('views', GREATEST((viral_items.meta->>'views')::bigint, (EXCLUDED.meta->>'views')::bigint), 'likes', EXCLUDED.meta->'likes', 'score', EXCLUDED.meta->'score',
          'groups', (SELECT jsonb_agg(DISTINCT x) FROM jsonb_array_elements_text(COALESCE(viral_items.meta->'groups','[]'::jsonb) || (EXCLUDED.meta->'groups')) x)),
        tags = ARRAY(SELECT DISTINCT unnest(viral_items.tags || EXCLUDED.tags)),
        thumb_url = CASE WHEN viral_items.thumb_file='' AND EXCLUDED.thumb_url<>'' THEN EXCLUDED.thumb_url ELSE viral_items.thumb_url END`,
    [p, it.id, it.title, it.url, it.thumb, { platform: p, views: it.views, likes: it.likes, author: it.author, posted: it.posted, score, groups: [g.key], kw, vertical: true }, [g.interest]]);
  }
  // ---------- ดึงคลิปทีละ (สไตล์ × แพลตฟอร์ม) ----------
  // YouTube Shorts: YouTube Data API ฟรี (โควตา 10,000 หน่วย/วัน · ค้น 1 ครั้ง ≈ 101 หน่วย) · TikTok/IG/FB (และ YouTube ถ้าไม่มีคีย์): ScrapeCreators
  const dayKey = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const provOf = (p, c) => (p === 'youtube' && YT_KEY() && c.ytShorts ? 'yt' : SC_KEY() && c.platforms[p] ? 'sc' : null);
  async function ytSearch(g, kw, c) {
    const after = new Date(Date.now() - 7 * 864e5).toISOString();
    const sr = await get(`${YT_API()}/search?part=snippet&type=video&videoDuration=short&order=viewCount&maxResults=15&regionCode=TH&relevanceLanguage=th&publishedAfter=${encodeURIComponent(after)}&q=${encodeURIComponent(kw + ' #shorts')}&key=${encodeURIComponent(YT_KEY())}`, 'json');
    const ids = (sr.items || []).map((x) => x.id?.videoId).filter(Boolean);
    samples.youtube = { at: new Date().toISOString(), kw, keys: Object.keys(sr).slice(0, 12), count: ids.length, first: JSON.stringify(sr.items?.[0] || sr).slice(0, 800) };
    if (!ids.length) return 0;
    const vr = await get(`${YT_API()}/videos?part=snippet,statistics,contentDetails&id=${ids.join(',')}&key=${encodeURIComponent(YT_KEY())}`, 'json');
    const items = (vr.items || []).map((v) => {
      const sn = v.snippet || {};
      const m = String(v.contentDetails?.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const sec = m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
      return { id: v.id, sec, title: ent(sn.title || ''), url: `https://www.youtube.com/shorts/${v.id}`, thumb: safeUrl(sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || ''),
        views: Number(v.statistics?.viewCount || 0), likes: Number(v.statistics?.likeCount || 0), author: sn.channelTitle || '', posted: sn.publishedAt ? new Date(sn.publishedAt) : null };
    }).filter((x) => x.sec > 0 && x.sec <= 180).sort((x, y) => y.views - x.views).slice(0, c.perQuery);
    for (const it of items) await saveClip('youtube', g, kw, it);
    return items.length;
  }
  async function scSearch(p, g, kw, c, u) {
    const r = await fetch(SC_API() + SC_REQ[p](kw), { headers: { 'x-api-key': SC_KEY() }, signal: AbortSignal.timeout(45000) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 402) { lastErr = `ScrapeCreators ${r.status}: ${j.message || 'คีย์ไม่ถูกต้องหรือเครดิตหมด'}`; throw new Error('stop'); }
    if (!r.ok) { log('sc fail', p, kw, r.status, String(j.message || '').slice(0, 120)); return 0; }
    const remaining = j.credits_remaining ?? j.creditsRemaining;
    if (remaining != null) u.remaining = remaining;
    const arr = listOf(j);
    samples[p] = { at: new Date().toISOString(), kw, keys: Object.keys(j).slice(0, 12), count: arr.length, first: JSON.stringify(arr[0] || j).slice(0, 1500) };
    const items = arr.map((x) => normalize(p, x)).filter(Boolean)
      .filter((x) => !x.posted || Date.now() - x.posted < 21 * 864e5)
      .sort((x, y) => y.views - x.views || y.likes - x.likes).slice(0, c.perQuery);
    for (const it of items) await saveClip(p, g, kw, it);
    return items.length;
  }
  // ความต้องการ: สไตล์ที่ลูกค้าเลือกไว้เยอะ + สไตล์ที่ยังมีคลิปน้อย ได้ดึงก่อน
  async function plan(c, only) {
    const seen = (await q("SELECT value FROM app_settings WHERE key='viral_seen'")).rows[0]?.value || {};
    const dem = Object.fromEntries((await q(`SELECT x, count(*)::int n FROM profiles, LATERAL jsonb_array_elements_text(COALESCE(interests->'categories','[]'::jsonb) || COALESCE(interests->'styles','[]'::jsonb)) x GROUP BY x`)).rows.map((r) => [r.x, r.n]));
    const have = Object.fromEntries((await q(`SELECT source || ':' || g AS k, count(*)::int n FROM viral_items, LATERAL jsonb_array_elements_text(COALESCE(meta->'groups','[]'::jsonb)) g
      WHERE active AND safe AND fetched_at > now() - interval '3 days' GROUP BY 1`)).rows.map((r) => [r.k, r.n]));
    const combos = [];
    for (const g of GROUPS) for (const p of PLATFORMS) {
      if (only && !only.some(([og, op]) => og === g.key && op === p)) continue;
      const prov = provOf(p, c); if (!prov) continue;
      const key = `${g.key}:${p}`;
      const ageH = seen[key] ? (Date.now() - seen[key].at) / 3600e3 : 999;
      if (ageH < (only ? 2 : 6)) continue; // ดึงซ้ำคู่เดิมได้ทุก 6 ชม. (ขอทันทีได้ทุก 2 ชม.)
      const n = have[key] || 0;
      combos.push({ g, p, prov, key, k: seen[key]?.k || 0, pri: (1 + (dem[g.interest] || 0)) * 10 / (1 + n) + Math.min(ageH, 48) / 24 });
    }
    return { seen, combos: combos.sort((x, y) => y.pri - x.pri) };
  }
  async function runCombos(c, combos, seen, maxYt, maxSc) {
    let n = 0, ytCalls = 0, scCalls = 0;
    const u = await usage();
    for (const x of combos) {
      if (x.prov === 'yt' ? ytCalls >= maxYt : scCalls >= maxSc) continue;
      const kw = x.g.q[x.k % x.g.q.length];
      try {
        if (x.prov === 'yt') { ytCalls++; n += await ytSearch(x.g, kw, c); } else { scCalls++; n += await scSearch(x.p, x.g, kw, c, u); }
        seen[x.key] = { at: Date.now(), k: x.k + 1 };
      } catch (e) {
        if (e.message === 'stop') break;
        log('viral fetch', x.p, kw, e.message);
        if (x.prov === 'yt' && /403/.test(e.message)) { lastErr = 'YouTube API: โควตาเต็มหรือคีย์ยังไม่เปิด YouTube Data API v3'; maxYt = 0; }
      }
    }
    await q("INSERT INTO app_settings(key,value) VALUES('viral_seen',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [seen]);
    if (ytCalls) {
      const y = (await q("SELECT value FROM app_settings WHERE key='viral_yt'")).rows[0]?.value || {};
      await q("INSERT INTO app_settings(key,value) VALUES('viral_yt',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [{ day: dayKey(), used: (y.day === dayKey() ? y.used || 0 : 0) + ytCalls }]);
    }
    if (scCalls) await saveUsage(await usage(scCalls, u.remaining));
    return { n, ytCalls, scCalls };
  }
  async function budgets(c) {
    const y = (await q("SELECT value FROM app_settings WHERE key='viral_yt'")).rows[0]?.value || {};
    const ytLeft = Math.max(0, c.ytDaily - (y.day === dayKey() ? y.used || 0 : 0));
    const scLeft = Math.max(0, c.daily - (await usage()).used);
    return { ytLeft, scLeft };
  }
  async function fetchClips() {
    const c = await cfg();
    const { ytLeft, scLeft } = await budgets(c);
    const { seen, combos } = await plan(c);
    if (!combos.length) return 'ไม่มีแหล่งที่เปิดใช้';
    // คู่ (สไตล์×แพลตฟอร์ม) ที่ยังไม่มีคลิปเลย → ดึงให้ครบรอบนี้เลย (ภายในงบวันนี้) ลูกค้าจะได้ไม่ต้องรอ
    const empty = (p) => combos.filter((x) => x.prov === p && x.pri >= 10).length;
    const r = await runCombos(c, combos, seen, Math.min(ytLeft, Math.max(Math.ceil(c.ytDaily / 12), empty('yt'))), Math.min(scLeft, Math.max(Math.ceil(c.daily / 12), empty('sc'))));
    return `${r.n} คลิป · YouTube ${r.ytCalls} ครั้ง · ScrapeCreators ${r.scCalls} เครดิต`;
  }
  // ลูกค้ากดดูสไตล์ที่ยังว่าง → ดึงให้ทันที (สูงสุด 3 คู่ต่อครั้ง กันใช้งบเกิน)
  const filling = new Map();
  function fillNow(pairs) {
    const key = pairs.map((x) => x.join(':')).sort().join(',');
    if (filling.has(key)) return true;
    const job = (async () => {
      const c = await cfg();
      const { ytLeft, scLeft } = await budgets(c);
      const { seen, combos } = await plan(c, pairs);
      if (!combos.length) return;
      const r = await runCombos(c, combos.slice(0, 3), seen, Math.min(ytLeft, 3), Math.min(scLeft, 3));
      if (r.n) { await cacheThumbs(); await enrich(); cache.at = 0; }
      log('viral fill', key, JSON.stringify(r));
    })().catch((e) => log('viral fill', e.message)).finally(() => setTimeout(() => filling.delete(key), 60e3));
    filling.set(key, job);
    return true;
  }
  // ---------- AI: กรอง + แปลงเป็นไอเดีย ----------
  const SCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', required: ['i', 'safe'], properties: {
    i: { type: 'INTEGER' }, safe: { type: 'BOOLEAN' }, tags: { type: 'ARRAY', items: { type: 'STRING' } }, summary: { type: 'STRING' },
    style: { type: 'STRING' }, hook: { type: 'STRING' }, angle: { type: 'STRING' }, product: { type: 'STRING' } } } };
  async function enrich() {
    if (!GKEY()) return 0;
    let total = 0;
    for (let b = 0; b < 4; b++) { const n = await enrichBatch(); total += n; if (n < 1) break; }
    return total;
  }
  async function enrichBatch() {
    const rows = (await q(`SELECT id, source, title, meta FROM viral_items WHERE idea IS NULL AND active AND fetched_at > now() - interval '3 days'
      ORDER BY pinned DESC, (source='gtrends') DESC, first_seen DESC, COALESCE((meta->>'score')::bigint, 0) DESC LIMIT 25`)).rows;
    if (!rows.length) return 0;
    const list = rows.map((r, i) => `${i}. [${r.source === 'gtrends' ? 'คำค้นหามาแรง' : `คลิปไวรัล ${r.source}`}] ${r.title}${r.meta?.news?.length ? ` | ข่าว: ${r.meta.news.map((n) => n.title).join(' / ')}` : ''}${r.meta?.channel ? ` | ช่อง: ${r.meta.channel}` : ''}${r.meta?.author ? ` | โดย: ${r.meta.author}` : ''}`).join('\n');
    const prompt = `คุณเป็นนักวางกลยุทธ์คอนเทนต์ให้แม่ค้าออนไลน์และร้านค้าไทย ด้านล่างคือกระแสที่กำลังมาแรงในไทยวันนี้
สำหรับแต่ละรายการ ให้:
- safe: false ถ้าเป็น เนื้อหาโป๊/ล่อแหลม ยาเสพติด บุหรี่ไฟฟ้า แกล้งคนแรงๆ ข่าวเศร้า การเสียชีวิต อุบัติเหตุ ภัยพิบัติ อาชญากรรม คดีความ การเมือง การเลือกตั้ง ศาสนาที่ขัดแย้ง เรื่องทางเพศ การพนัน หรือดราม่าส่วนตัวของบุคคล (ไม่เหมาะเอามาขายของ) นอกนั้น true
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
    const call = (gc) => fetch(`${GEM()}/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': GKEY() },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.7, ...gc } }),
      signal: AbortSignal.timeout(90000),
    });
    let r = await call(thinkLow(MODEL));
    if (r.status === 400) r = await call({}); // รุ่นที่ไม่รองรับการตั้งระดับการคิด
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
      await q('UPDATE viral_items SET idea=$2, tags=ARRAY(SELECT DISTINCT unnest(tags || $3::text[])), safe=$4 WHERE id=$1', [row.id, idea, tags, o.safe !== false]);
      n++;
    }
    return n;
  }
  async function cacheThumbs() {
    const rows = (await q("SELECT id, thumb_url FROM viral_items WHERE thumb_file='' AND thumb_url<>'' AND active AND fetched_at > now() - interval '2 days' ORDER BY pinned DESC, first_seen DESC LIMIT 150")).rows;
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
      const auto = (await cfg()).auto;
      const steps = auto ? [['trends', fetchTrends], ['youtube', fetchYouTube], ['clips', fetchClips], ['thumbs', cacheThumbs], ['ideas', enrich], ['cleanup', cleanup]]
        : [['thumbs', cacheThumbs], ['ideas', enrich]]; // ปิดดึงอัตโนมัติ: ทำแค่ภาพปก+ไอเดียของคลิปที่แอดมินแนบ
      for (const [k, fn] of steps) {
        try { out[k] = await fn(); } catch (e) { out[k] = `ERR ${e.message}`; lastErr = `${k}: ${e.message}`; log('viral', k, e.message); }
      }
      lastRun = new Date(); log('viral refresh', JSON.stringify(out));
      return out;
    })().finally(() => { running = null; });
    return running;
  }

  // ---------- API หน้าแรก ----------
  const SOCIAL = ['tiktok', 'instagram', 'youtube', 'facebook'];
  const view = (r) => ({
    id: r.id, source: r.source, title: r.title, url: r.url, thumb: r.thumb_file ? `api/viral/${r.id}/thumb` : '',
    traffic: r.meta?.traffic || '', news: r.meta?.news?.[0] || null, channel: r.meta?.channel || r.meta?.author || '', views: Number(r.meta?.views || 0), likes: Number(r.meta?.likes || 0),
    platform: SOCIAL.includes(r.source) ? r.source : r.meta?.platform || (r.source === 'ytpopular' ? 'youtube' : r.source === 'gtrends' ? 'google' : 'web'),
    vertical: !!(r.meta?.vertical || r.meta?.short), posted: r.meta?.posted || null, groups: r.meta?.groups || [],
    pinned: r.pinned, idea: r.idea, tags: r.tags,
  });
  let cache = { at: 0, rows: [] };
  async function rowsNow() {
    if (Date.now() - cache.at < 60e3) return cache.rows;
    const rows = (await q(`SELECT * FROM viral_items WHERE active AND safe AND (
        pinned OR (source IN ('gtrends','ytpopular','curated') AND fetched_at > now() - interval '36 hours')
        OR (source IN ('tiktok','instagram','facebook','youtube') AND idea IS NOT NULL AND thumb_file<>'' AND fetched_at > now() - interval '7 days'))
      ORDER BY pinned DESC, COALESCE((meta->>'score')::bigint,0) DESC, rank, fetched_at DESC LIMIT 1500`)).rows;
    // youtube = ทั้ง mostPopular (rank>0) และ Shorts จาก ScrapeCreators (rank=0 + groups)
    cache = { at: Date.now(), rows };
    return rows;
  }
  const isClip = (r) => r.source !== 'gtrends';
  const isSocial = (r) => (r.meta?.groups || []).length > 0;
  const groupsOf = (rows) => GROUPS.map((g) => ({ key: g.key, label: g.label, emoji: g.emoji, interest: g.interest, n: rows.filter((r) => (r.meta?.groups || []).includes(g.key)).length })).filter((g) => g.n);
  async function interestsOf(uid) {
    const p = (await q('SELECT interests FROM profiles WHERE user_id=$1', [uid])).rows[0]?.interests || {};
    const mine = new Set([...(p.categories || []), ...(p.styles || [])]);
    return { mine, groups: GROUPS.filter((g) => mine.has(g.interest)).map((g) => g.key) };
  }
  const byScore = (a, b) => (b.pinned - a.pinned) || Number(b.meta?.score || 0) - Number(a.meta?.score || 0) || Number(b.meta?.views || 0) - Number(a.meta?.views || 0);
  app.get('/api/viral', auth, wrap(async (req, res) => {
    const { mine, groups: myGroups } = await interestsOf(req.uid);
    const rows = await rowsNow();
    const score = (r) => (r.tags || []).filter((t) => mine.has(t)).length;
    const trends = rows.filter((r) => r.source === 'gtrends').sort((a, b) => a.rank - b.rank).slice(0, 12).map(view);
    const clipRows = rows.filter(isClip);
    const mineClips = clipRows.filter((r) => r.pinned || (r.meta?.groups || []).some((g) => myGroups.includes(g)) || score(r) > 0).sort(byScore);
    const clips = (mineClips.length >= 6 ? mineClips : clipRows.slice().sort(byScore)).slice(0, 15).map(view);
    const pool = rows.filter((r) => r.idea).map((r) => ({ r, s: score(r) * 10 + (r.pinned ? 5 : 0) + (r.source === 'gtrends' ? 3 - (r.rank || 0) / 10 : Math.log10(1 + Number(r.meta?.score || 0))) })).sort((a, b) => b.s - a.s);
    const seen = new Set(); const ideas = [];
    for (const { r } of pool) { if (seen.has(r.idea.style)) continue; seen.add(r.idea.style); ideas.push(view(r)); if (ideas.length >= 4) break; }
    res.json({ trends, clips, ideas, forYou: mineClips.length >= 6, groups: groupsOf(clipRows.filter(isSocial)), myGroups,
      updatedAt: rows.reduce((m, r) => (r.fetched_at > m ? r.fetched_at : m), null), personalized: mine.size > 0 });
  }));
  // หน้าคลิปไวรัลทั้งหมด: กรองตามสไตล์/หมวด และแพลตฟอร์ม
  // หน้าไวรัล: ผู้ใช้เลือกแพลตฟอร์ม (TikTok / YouTube Shorts / Google Trends) แล้วแสดงเฉพาะสไตล์ของตัวเอง
  const PF_PREF = { TikTok: 'tiktok', YouTube: 'youtube', Instagram: 'instagram', Facebook: 'facebook' };
  app.get('/api/viral/clips', auth, wrap(async (req, res) => {
    const p = (await q('SELECT interests FROM profiles WHERE user_id=$1', [req.uid])).rows[0]?.interests || {};
    const mine = new Set([...(p.categories || []), ...(p.styles || [])]);
    const myGroups = GROUPS.filter((g) => mine.has(g.interest)).map((g) => g.key);
    const all = await rowsNow();
    const clipsOf = (pf) => all.filter((r) => isClip(r) && view(r).platform === pf && (r.pinned || isSocial(r)));
    const auto = (await cfg()).auto;
    // ปิดดึงอัตโนมัติ: แสดงเฉพาะแพลตฟอร์มที่มีคลิปแอดมินแนบ (TikTok / Shorts / Reels) ไม่มี Google Trends
    const tabs = auto ? [{ key: 'tiktok', label: 'TikTok' }, { key: 'youtube', label: 'YouTube Shorts' }, { key: 'google', label: 'Google Trends' },
      ...['instagram', 'facebook'].filter((k) => clipsOf(k).length).map((k) => ({ key: k, label: k === 'instagram' ? 'Instagram' : 'Facebook' }))]
      : (() => { const t = [['tiktok', 'TikTok'], ['youtube', 'YouTube Shorts'], ['instagram', 'IG Reels'], ['facebook', 'FB Reels']].filter(([k]) => clipsOf(k).length).map(([key, label]) => ({ key, label })); return t.length ? t : [{ key: 'tiktok', label: 'TikTok' }]; })();
    const prefPf = (p.platforms || []).map((x) => PF_PREF[x]).find((k) => tabs.some((t) => t.key === k)) || 'tiktok';
    const pf = tabs.some((t) => t.key === req.query.platform) ? req.query.platform : prefPf;
    const g = String(req.query.group || 'mine');
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24));
    const page = Math.max(0, Number(req.query.page) || 0);
    let list, general = false;
    if (pf === 'google') {
      const tr = all.filter((r) => r.source === 'gtrends').sort((x, y) => x.rank - y.rank);
      const match = (r) => (r.tags || []).some((t) => (g === 'mine' ? mine.has(t) : GROUPS.find((x) => x.key === g)?.interest === t));
      list = tr.filter(match);
      if (list.length < 3) { list = tr; general = true; } // กระแสทั่วไปของวันนี้ ถ้ายังไม่มีกระแสตรงสไตล์
    } else {
      const base = clipsOf(pf);
      if (g === 'mine') list = myGroups.length ? base.filter((r) => r.pinned || (r.meta?.groups || []).some((x) => myGroups.includes(x))) : base;
      else list = base.filter((r) => (r.meta?.groups || []).includes(g));
      list.sort(req.query.sort === 'new' ? (x, y) => new Date(y.meta?.posted || y.first_seen) - new Date(x.meta?.posted || x.first_seen) : byScore);
    }
    // ไม่ให้ลูกค้ารอ: ถ้าสไตล์นี้ยังมีคลิปน้อย เติมด้วยคลิปมาแรงของแพลตฟอร์มเดียวกันทันที (ระหว่างระบบดึงสไตล์นี้เพิ่มเบื้องหลัง)
    let fallback = false;
    if (pf !== 'google' && list.length < limit && !page) {
      const ids = new Set(list.map((r) => r.id));
      const extra = clipsOf(pf).filter((r) => !ids.has(r.id)).sort(byScore).slice(0, limit - list.length);
      if (extra.length) { fallback = list.length < 4; list = [...list, ...extra.map((r) => ({ ...r, _fb: true }))]; }
    }
    // ชิปสไตล์: ทุกสไตล์ที่ผู้ใช้เลือกไว้ (สไตล์ที่ยังว่าง ระบบจะดึงให้ทันทีเมื่อกดดู)
    const myChips = GROUPS.filter((x) => myGroups.includes(x.key)).map((x) => ({ key: x.key, label: x.label, emoji: x.emoji,
      n: pf === 'google' ? all.filter((r) => r.source === 'gtrends' && (r.tags || []).includes(x.interest)).length : clipsOf(pf).filter((r) => (r.meta?.groups || []).includes(x.key)).length }));
    let fillingNow = false;
    if (pf !== 'google' && !page) {
      const own = list.filter((r) => !r._fb).length;
      const want = g === 'mine' ? myChips.filter((x) => x.n < 4).map((x) => x.key) : own < 4 ? [g] : [];
      if (want.length) { const c = await cfg(); const pairs = want.filter((k) => GROUPS.some((x) => x.key === k)).slice(0, 3).map((k) => [k, pf]); if (c.auto && pairs.length && provOf(pf, c)) fillingNow = fillNow(pairs); }
    }
    res.json({ platform: pf, tabs, items: list.slice(page * limit, page * limit + limit).map((r) => ({ ...view(r), other: !!r._fb })), total: list.length, general,
      myChips, needStyles: !myGroups.length, filling: fillingNow, fallback });
  }));
  app.get('/api/viral/:id/thumb', auth, wrap(async (req, res) => {
    const r = (await q('SELECT thumb_file FROM viral_items WHERE id=$1', [Number(req.params.id) || 0])).rows[0];
    const f = r?.thumb_file && path.join(DIR, path.basename(r.thumb_file));
    if (!f || !fs.existsSync(f)) return res.status(404).end();
    res.setHeader('cache-control', 'private, max-age=86400'); res.sendFile(f);
  }));

  // ---------- หลังบ้าน ----------
  app.get('/api/admin/viral', auth, admin, wrap(async (_req, res) => {
    const rows = (await q("SELECT * FROM viral_items WHERE fetched_at > now() - interval '3 days' OR pinned OR source='curated' ORDER BY source, pinned DESC, COALESCE((meta->>'score')::bigint,0) DESC, rank, id DESC LIMIT 400")).rows;
    const counts = (await q(`SELECT source, count(*)::int n, count(*) FILTER (WHERE idea IS NOT NULL)::int ideas, count(*) FILTER (WHERE NOT safe)::int hidden
      FROM viral_items WHERE fetched_at > now() - interval '7 days' GROUP BY source`)).rows;
    res.json({ items: rows.map((r) => ({ ...view(r), active: r.active, safe: r.safe })), youtube: !!YT_KEY(), sc: !!SC_KEY(), ai: !!GKEY(), lastRun, lastErr, running: !!running,
      cfg: await cfg(), usage: await usage(), ytUsage: (await q("SELECT value FROM app_settings WHERE key='viral_yt'")).rows[0]?.value || {}, samples, counts, groups: GROUPS.map(({ key, label, emoji, q: kws }) => ({ key, label, emoji, q: kws })) });
  }));
  app.put('/api/admin/viral/cfg', auth, admin, wrap(async (req, res) => {
    const b = req.body || {};
    const v = { auto: b.auto === true, daily: Math.min(5000, Math.max(0, Math.trunc(Number(b.daily) || 0))), perQuery: Math.min(20, Math.max(1, Math.trunc(Number(b.perQuery) || 6))),
      platforms: Object.fromEntries(PLATFORMS.map((p) => [p, b.platforms?.[p] === true])),
      ytShorts: b.ytShorts !== false, ytDaily: Math.min(95, Math.max(0, Math.trunc(Number(b.ytDaily) || 0))) };
    await q("INSERT INTO app_settings(key,value) VALUES('viral_cfg',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [v]);
    res.json(v);
  }));
  // แอดมินแนบลิงก์ (วางได้หลายลิงก์ บรรทัดละ 1) — รับเฉพาะ Reels / YouTube Shorts / TikTok
  async function addLink(raw, title0, group) {
    const url = safeUrl(String(raw || '').trim());
    const kind = url && shortKind(url);
    if (!kind) return { url: raw, error: 'รับเฉพาะลิงก์ Reels (IG/FB), YouTube Shorts หรือ TikTok' };
    let o = await oembed(url);
    if (!o.title || !o.thumb) { // IG/FB ไม่มี oEmbed ฟรี → อ่านหน้าเว็บ (og:title/og:image)
      try { const p = await readPage(url); o = { ...o, title: o.title || ent(p.title || '').replace(/\s*[|•·-]\s*(Instagram|Facebook|TikTok).*$/i, ''), thumb: o.thumb || safeUrl(p.image || '') }; } catch { /* ไม่เป็นไร */ }
    }
    const title = String(title0 || '').trim().slice(0, 200) || o.title || `${{ tiktok: 'TikTok', youtube: 'YouTube Shorts', instagram: 'Instagram Reels', facebook: 'Facebook Reels' }[kind]}`;
    const g = GROUPS.find((x) => x.key === group);
    await upsert({ source: 'curated', ext_id: url, title, url, thumb: o.thumb, meta: { platform: kind, author: o.author || '', vertical: true, ...(g ? { groups: [g.key] } : {}) }, rank: 0 });
    await q("UPDATE viral_items SET pinned=TRUE, idea=NULL, active=TRUE, tags=$2 WHERE source='curated' AND ext_id=$1", [url, g ? [g.interest] : []]);
    return { url, title, platform: kind, thumb: !!o.thumb };
  }
  app.post('/api/admin/viral', auth, admin, wrap(async (req, res) => {
    const links = [...new Set(String(req.body?.urls || req.body?.url || '').split(/[\s,]+/).map((x) => x.trim()).filter(Boolean))].slice(0, 20);
    if (!links.length) return res.status(400).json({ error: 'วางลิงก์ก่อน' });
    const out = [];
    for (const u of links) out.push(await addLink(u, links.length === 1 ? req.body?.title : '', req.body?.group).catch((e) => ({ url: u, error: e.message })));
    cache.at = 0;
    if (out.some((x) => !x.error)) refresh().catch(() => {});
    const ok = out.filter((x) => !x.error);
    if (!ok.length) return res.status(400).json({ error: out[0].error, results: out });
    res.json({ ok: true, added: ok.length, title: ok[0].title, results: out });
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
    // ทุก 6 ชม. (เดิม 2 ชม.) — ตั้งเองได้ MCRICH_TREND_HOURS
    const bg = () => withCost({ src: 'background trends' }, () => refresh()).catch(() => {});
    setTimeout(bg, 20e3).unref();
    setInterval(bg, (Number(process.env.MCRICH_TREND_HOURS) || 6) * 3600e3).unref();
  }
  return { start, refresh };
}
