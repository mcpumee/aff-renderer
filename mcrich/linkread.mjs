// อ่านข้อมูลสินค้าจากลิงก์ (Shopee / Lazada / TikTok Shop / เว็บทั่วไป) → ชื่อ จุดเด่น ราคา รูป
// ป้องกัน SSRF: ตรวจ IP ปลายทางทุกครั้งที่ redirect · จำกัดขนาด/เวลา
import dns from 'node:dns/promises';
import net from 'node:net';

const UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return privateIp(x.slice(7));
  return x === '::' || x === '::1' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80');
}
async function checkUrl(u) {
  const url = new URL(u);
  if (!/^https?:$/.test(url.protocol)) throw new Error('bad_protocol');
  if (process.env.LINKREAD_ALLOW_LOCAL === '1') return url;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error('blocked_host');
  return url;
}
export async function fetchSafe(u, { max = 1.5e6, timeout = 9000 } = {}) {
  let url = u;
  for (let i = 0; i < 7; i++) {
    await checkUrl(url);
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA, 'accept-language': 'th-TH,th;q=0.9,en;q=0.6', accept: 'text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.5' }, signal: AbortSignal.timeout(timeout) });
    if ([301, 302, 303, 307, 308].includes(r.status) && r.headers.get('location')) { url = new URL(r.headers.get('location'), url).href; r.body?.cancel().catch(() => {}); continue; }
    const chunks = []; let total = 0;
    if (r.body) {
      const rd = r.body.getReader();
      for (;;) { const { done, value } = await rd.read(); if (done) break; total += value.length; if (total > max) { rd.cancel().catch(() => {}); break; } chunks.push(value); }
    }
    return { url, status: r.status, type: r.headers.get('content-type') || '', buf: Buffer.concat(chunks.map((c) => Buffer.from(c))) };
  }
  throw new Error('too_many_redirects');
}
const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).trim();
function meta(html, key) {
  const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key.replace(/[:.]/g, '\\$&')}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0]; if (!tag) return '';
  return decode(tag.match(/content=["']([^"']*)["']/i)?.[1] || '');
}
/** ชื่อจาก slug ของ URL (Shopee / Lazada) */
export function slugName(u) {
  try {
    const url = new URL(u), p = decodeURIComponent(url.pathname);
    let m = p.match(/^\/([^/]+?)-i\.\d+\.\d+/); // shopee
    if (!m) m = p.match(/\/products\/(?:pdp-i\d+-s\d+\.html)?([^/]+?)-i\d+(?:-s\d+)?\.html/); // lazada
    if (!m) return '';
    const s = m[1].replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return s.length >= 4 ? s : '';
  } catch { return ''; }
}
export const platformOf = (u) => {
  const h = (() => { try { return new URL(u).hostname; } catch { return ''; } })();
  return /shopee|shope\.ee/.test(h) ? 'shopee' : /lazada|lzd\.co/.test(h) ? 'lazada' : /tiktok/.test(h) ? 'tiktok' : 'web';
};
export async function readPage(link) {
  const out = { finalUrl: link, title: '', desc: '', image: '', price: '', slug: '' };
  try {
    const r = await fetchSafe(link);
    out.finalUrl = r.url;
    if (/html/i.test(r.type) || r.buf.slice(0, 200).toString().includes('<')) {
      const html = r.buf.toString('utf8');
      out.title = meta(html, 'og:title') || meta(html, 'twitter:title') || decode(html.match(/<title[^>]*>([^<]{2,300})<\/title>/i)?.[1] || '');
      out.desc = meta(html, 'og:description') || meta(html, 'description');
      out.image = meta(html, 'og:image') || meta(html, 'twitter:image');
      out.price = meta(html, 'product:price:amount') || meta(html, 'og:price:amount');
      // JSON-LD Product
      for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
          const j = JSON.parse(m[1]); const arr = Array.isArray(j) ? j : j['@graph'] || [j];
          const pr = arr.find((x) => /product/i.test(String(x['@type'])));
          if (pr) { out.title ||= decode(pr.name); out.desc ||= decode(pr.description); out.image ||= Array.isArray(pr.image) ? pr.image[0] : pr.image?.url || pr.image || ''; const o = Array.isArray(pr.offers) ? pr.offers[0] : pr.offers; out.price ||= String(o?.price || o?.lowPrice || ''); }
        } catch { /* */ }
      }
      if (out.image) out.image = new URL(out.image, r.url).href;
    }
  } catch (e) { out.error = e.message; }
  out.slug = slugName(out.finalUrl) || slugName(link);
  // หน้าแอป/ล็อกอิน ไม่ใช่ชื่อสินค้า
  if (/^(shopee|lazada|tiktok|tiktok shop|login|เข้าสู่ระบบ)\b/i.test(out.title) && out.title.length < 40) out.title = '';
  return out;
}
