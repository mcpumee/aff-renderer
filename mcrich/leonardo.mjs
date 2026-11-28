// Leonardo.Ai (ภาพ) — ใช้เป็นตัววาดสำรอง/ทางเลือกสำหรับอวตาร (Lucid Realism ภาพคนสมจริง · Lucid Origin ภาพสไตล์อาร์ต)
// คีย์ LEONARDO_API_KEY ตั้งผ่านตัวติดตั้งเท่านั้น · ภาพที่ Leonardo ติดธง nsfw จะถูกทิ้ง ไม่ส่งให้ลูกค้า
const BASE = () => (process.env.LEONARDO_URL || 'https://cloud.leonardo.ai/api/rest/v1').replace(/\/+$/, '');
export const leoReady = () => !!process.env.LEONARDO_API_KEY;
export const LEO_MODELS = { real: '05ce0082-2d80-4a2d-8653-4d1c85e2418e', art: '7b592283-e8a7-4c5a-9ba6-d18c31f258b9' };
const STYLE = { portrait: '8e2bc543-6ee2-45f9-bcd9-594b6ce84dcd', fashion: '594c4a08-a522-4e0e-b7ff-e4dac4b6b622', film: '85da2dcc-c373-464c-9a7a-5624359be859', dynamic: '111dc692-d470-4eec-b791-3475abac4c46' };
const SIZES = { '9:16': [864, 1536], '1:1': [1024, 1024], '4:5': [1024, 1280], '16:9': [1536, 864], '3:4': [960, 1280] };
const hdr = () => ({ accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${process.env.LEONARDO_API_KEY}` });

async function call(method, p, body, ms = 60000) {
  const r = await fetch(`${BASE()}${p}`, { method, headers: hdr(), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(ms) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(`leonardo ${r.status} ${j.error || j.message || ''}`.trim()), { status: r.status });
  return j;
}

/** วาด 1 ภาพ → Buffer · style: portrait | fashion | film | dynamic */
export async function leoImage({ prompt, ratio = '9:16', art = 'real', style = 'portrait', timeoutMs = 180000 }) {
  if (!leoReady()) throw new Error('leonardo_no_key');
  const [width, height] = SIZES[ratio] || SIZES['9:16'];
  const j = await call('POST', '/generations', {
    modelId: art === 'real' ? LEO_MODELS.real : LEO_MODELS.art, prompt: String(prompt).slice(0, 1500), width, height, num_images: 1,
    contrast: 3.5, styleUUID: STYLE[style] || STYLE.portrait, enhancePrompt: false, alchemy: false, ultra: false,
  });
  const id = j.sdGenerationJob?.generationId || j.generationId;
  if (!id) throw new Error('leonardo_no_id');
  const t0 = Date.now();
  for (let wait = 3000; Date.now() - t0 < timeoutMs; wait = Math.min(8000, wait + 1500)) {
    await new Promise((ok) => setTimeout(ok, wait));
    const g = await call('GET', `/generations/${id}`, null, 30000).catch((e) => (e.status >= 500 ? {} : Promise.reject(e)));
    const gen = g.generations_by_pk || g.generation || g;
    if (gen?.status === 'FAILED') throw new Error('leonardo_failed');
    if (gen?.status !== 'COMPLETE') continue;
    const img = (gen.generated_images || []).find((x) => x.url && !x.nsfw);
    if (!img) throw new Error((gen.generated_images || []).some((x) => x.nsfw) ? 'leonardo_nsfw_blocked' : 'leonardo_no_image');
    const r = await fetch(img.url, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`leonardo_download ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error('leonardo_timeout');
}
