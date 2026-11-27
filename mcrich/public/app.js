'use strict';
// Mc Rich — หน้าเว็บแอป
const app = document.getElementById('app');
const $ = (s) => app.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString('th-TH');
let ME = null;
let CFG = { line: false, google: false };

async function api(path, opt = {}) {
  const init = { method: opt.method || 'GET', credentials: 'same-origin', headers: {} };
  if (opt.body instanceof FormData) init.body = opt.body;
  else if (opt.body) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
  // Safari/iOS: ครั้งแรกหลังเปิดแอปจากพื้นหลังมักได้ "Load failed" (การเชื่อมต่อเก่าถูกตัด) → ลองใหม่อัตโนมัติ (เฉพาะ GET ไม่ให้สร้างงาน/ตัดดาวซ้ำ)
  const safe = init.method === 'GET';
  let r;
  for (let i = 0; ; i++) {
    try {
      r = await fetch(path, init);
      if (safe && [502, 503, 504].includes(r.status) && i < 2) throw Object.assign(new Error('gw'), { retry: true });
      break;
    } catch (e) {
      if (!safe || i >= 2) throw new Error(/load failed|failed to fetch|network/i.test(e.message) ? 'เชื่อมต่อไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองใหม่' : e.message);
      await new Promise((ok) => setTimeout(ok, i ? 1200 : 400));
    }
  }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { ME = null; go('login'); throw new Error('login'); }
  if (!r.ok) throw new Error(j.error || 'ระบบขัดข้อง');
  return j;
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2400);
}
const go = (r) => { if (location.hash !== '#' + r) location.hash = r; else route(); };

const ICON = {
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" style="flex:none;color:var(--muted)"><path d="M9 5l7 7-7 7"/></svg>',
  play: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  star: '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#C6FF36"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z"/></svg>',
  works: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  chat: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  user: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  line: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5 1.1-.4 5.9-3.5 8-6C21.4 14.3 22 12.7 22 11c0-4.4-4.5-8-10-8z" fill="#fff"/></svg>',
  google: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" fill="#FBBC05"/><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" fill="#EA4335"/></svg>',
};

const topbar = (title, back) => `<header class="top">
  ${back ? `<div class="row" style="gap:4px"><a class="back" href="#${back}" aria-label="ย้อนกลับ">${ICON.back}</a><h1 style="font-size:18px">${esc(title)}</h1></div>`
    : `<a class="brand" href="#home" style="text-decoration:none;color:var(--fg)" aria-label="Mc Rich หน้าหลัก">${RICH('head', 34)}<span>Mc <em>Rich</em></span></a>`}
  ${ME ? `<a class="pill num" href="#stars">${ICON.star}${num(ME.stars)} ดาว</a>` : ''}
</header>`;
const nav = (cur) => `<nav class="tab" aria-label="เมนูหลัก"><div class="in">
  <a href="#home" ${cur === 'home' ? 'aria-current="page"' : ''}>${ICON.home}หน้าหลัก</a>
  <a href="#works" ${cur === 'works' ? 'aria-current="page"' : ''}>${ICON.works}ผลงาน</a>
  <a href="#create" aria-label="สร้างผลงาน" ${cur === 'create' ? 'aria-current="page"' : ''}><span class="plus">${ICON.plus}</span>สร้าง</a>
  <a href="#chat" ${cur === 'chat' ? 'aria-current="page"' : ''}>${RICH('head', 24, 'navbot')}แชท</a>
  <a href="#profile" ${cur === 'profile' ? 'aria-current="page"' : ''}>${ICON.user}โปรไฟล์</a>
</div></nav>`;

// ---------- Rich Robot (มาสคอต) · ตัวละครเดียวกันทุกหน้า ต่างกันแค่ท่าทาง ----------
// head: หัว (โลโก้/อวตาร) · wave: ทักทาย · think: กำลังคิด · cheer: สำเร็จ · create: ชู + สร้าง · empty: ว่าง/ยังไม่มีข้อมูล
const RICH_DEFS = `<defs>
  <radialGradient id="rgShell" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".62" stop-color="#EEF0F3"/><stop offset="1" stop-color="#BFC4CC"/></radialGradient>
  <radialGradient id="rgVisor" cx="45%" cy="30%" r="85%"><stop offset="0" stop-color="#2C3037"/><stop offset=".7" stop-color="#0D0F12"/><stop offset="1" stop-color="#050607"/></radialGradient>
  <radialGradient id="rgLime" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#E9FF9E"/><stop offset=".55" stop-color="#C6FF36"/><stop offset="1" stop-color="#7FB80F"/></radialGradient>
  <filter id="rgGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`;
function richFace(mood) {
  const e = { happy: '<path d="M70 98q9-11 18 0M112 98q9-11 18 0" />', open: '<ellipse cx="79" cy="95" rx="7" ry="9" fill="#C6FF36" stroke="none" class="rb-eye"/><ellipse cx="121" cy="95" rx="7" ry="9" fill="#C6FF36" stroke="none" class="rb-eye"/>',
    wink: '<path d="M70 98q9-11 18 0"/><ellipse cx="121" cy="95" rx="7" ry="9" fill="#C6FF36" stroke="none" class="rb-eye"/>',
    think: '<ellipse cx="84" cy="90" rx="6.5" ry="8" fill="#C6FF36" stroke="none" class="rb-eye"/><ellipse cx="124" cy="90" rx="6.5" ry="8" fill="#C6FF36" stroke="none" class="rb-eye"/>',
    calm: '<path d="M71 96h16M113 96h16"/>' }[mood] || '';
  const mouth = mood === 'think' ? '<path d="M94 118q6 3 12 0"/>' : mood === 'calm' ? '<path d="M93 116q7 4 14 0"/>' : '<path d="M88 113q12 11 24 0"/>';
  return `<g fill="none" stroke="#C6FF36" stroke-width="5" stroke-linecap="round" filter="url(#rgGlow)">${e}${mouth}</g>`;
}
function richHead(mood) {
  return `<g class="rb-head"><line x1="100" y1="40" x2="100" y2="18" stroke="#2A2D33" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="15" r="9" fill="url(#rgShell)"/>
    <rect x="22" y="72" width="22" height="46" rx="11" fill="#2A2D33"/><rect x="156" y="72" width="22" height="46" rx="11" fill="#2A2D33"/>
    <rect x="25" y="80" width="6" height="30" rx="3" fill="#C6FF36" filter="url(#rgGlow)"/><rect x="169" y="80" width="6" height="30" rx="3" fill="#C6FF36" filter="url(#rgGlow)"/>
    <rect x="34" y="38" width="132" height="112" rx="52" fill="url(#rgShell)"/>
    <rect x="50" y="58" width="100" height="76" rx="36" fill="url(#rgVisor)"/>
    <path d="M62 70q16-9 40-8" stroke="rgba(255,255,255,.22)" stroke-width="5" stroke-linecap="round" fill="none"/>
    ${richFace(mood)}</g>`;
}
// ตัวโหลด: โลโก้แอปเต้นเบาๆ ให้รู้ว่ากำลังโหลด (sm = ในการ์ด)
function LOAD(text = 'กำลังโหลด…', sm = false) {
  return `<div class="loader${sm ? ' sm' : ''}" role="status"><span class="ld-logo">${RICH('head', sm ? 28 : 64)}</span>${sm ? '' : '<span class="brand ld-word">Mc <em>Rich</em></span>'}<span class="muted">${text}</span></div>`;
}
function RICH(pose = 'wave', size = 96, cls = '') {
  if (pose === 'head') return `<svg class="rich ${cls}" width="${size}" height="${size}" viewBox="14 0 172 160" aria-hidden="true">${RICH_DEFS}${richHead('happy')}</svg>`;
  const mood = { wave: 'happy', think: 'think', cheer: 'wink', create: 'happy', empty: 'calm' }[pose] || 'happy';
  const body = `<ellipse cx="100" cy="246" rx="44" ry="7" fill="rgba(0,0,0,.35)"/>
    <rect x="62" y="150" width="76" height="72" rx="30" fill="url(#rgShell)"/><circle cx="100" cy="180" r="9" fill="url(#rgLime)" filter="url(#rgGlow)"/>
    <rect x="72" y="214" width="20" height="26" rx="10" fill="url(#rgShell)"/><rect x="108" y="214" width="20" height="26" rx="10" fill="url(#rgShell)"/>`;
  const arm = (x, y, rot, extra = '') => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-9" y="0" width="18" height="44" rx="9" fill="url(#rgShell)"/><circle cx="0" cy="48" r="12" fill="url(#rgShell)"/>${extra}</g>`;
  const arms = {
    wave: arm(66, 160, 28) + `<g class="rb-wave">${arm(136, 160, -150)}</g>`,
    think: arm(66, 160, 28) + arm(132, 162, 150, ''),
    cheer: arm(64, 160, 150) + arm(136, 160, -150, '<rect x="-4" y="54" width="8" height="16" rx="4" fill="url(#rgShell)"/>'),
    create: arm(66, 160, 28) + arm(136, 160, -125) + `<g class="rb-plus" transform="translate(168 118)"><circle r="24" fill="url(#rgLime)" filter="url(#rgGlow)"/><path d="M0-11v22M-11 0h22" stroke="#121316" stroke-width="6" stroke-linecap="round"/></g>`,
    empty: arm(66, 160, 20) + arm(134, 160, -20),
  }[pose] || '';
  const bubble = pose === 'think' ? `<g class="rb-dots" transform="translate(150 22)"><rect x="-6" y="-14" width="52" height="28" rx="14" fill="#202127" stroke="#30323B"/><circle cx="8" cy="0" r="4" fill="#C6FF36"/><circle cx="20" cy="0" r="4" fill="#C6FF36"/><circle cx="32" cy="0" r="4" fill="#C6FF36"/></g>` : '';
  return `<svg class="rich rich-${pose} ${cls}" width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 200 250" aria-hidden="true">${RICH_DEFS}<g class="rb-bob">${body}${arms}${richHead(mood)}</g>${bubble}</svg>`;
}
const richState = (pose, title, sub = '', action = '') => `<div class="rstate">${RICH(pose, 120)}<h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}${action}</div>`;

// ---------- ความสนใจ ----------
const INTEREST_GROUPS = [
  ['goals', 'ใช้ Mc Rich ทำอะไร', ['ขายของตัวเอง', 'Affiliate', 'โปรโมตร้าน', 'ทำคอนเทนต์']],
  ['categories', 'หมวดสินค้า / ธุรกิจ', ['อาหาร ขนม', 'ความงาม', 'แฟชั่น', 'ของใช้ในบ้าน', 'แม่และเด็ก', 'ไอที แก็ดเจ็ต', 'สุขภาพ', 'ท่องเที่ยว ที่พัก', 'อสังหาฯ', 'ประกัน การเงิน']],
  ['styles', 'สไตล์คลิปที่ชอบ', ['เปิดกล่อง / สุ่ม', 'ละครตลก', 'สยองขวัญ', 'ย้อนยุค', 'รีวิวเห็นหน้า', 'มินิมอล', 'ASMR', 'ความรู้ วิชาการ']],
  ['platforms', 'โพสต์ลงที่ไหน', ['TikTok', 'Facebook', 'Instagram', 'Shopee', 'YouTube', 'LINE']],
];
function interestsView(mode) {
  const cur = ME.interests || {};
  const first = mode === 'onboard';
  app.innerHTML = `${first ? '' : topbar('ความสนใจ', 'profile')}
  <main style="padding-bottom:${first ? '24px' : '110px'}">
    ${first ? `<div style="display:flex;flex-direction:column;gap:8px;padding-top:calc(env(safe-area-inset-top) + 12px)">
      <span class="muted" style="font-weight:600">ตั้งค่าครั้งแรก · ใช้เวลา 30 วินาที</span>
      <h1>สวัสดี ${esc(ME.name)} คุณสนใจอะไรบ้าง?</h1>
      <p class="muted" style="font-size:14px">เราจะคัดคลิปไวรัลและสไตล์งานที่ตรงกับคุณมาไว้หน้าหลัก แก้ได้ภายหลังในโปรไฟล์</p></div>` : '<p class="muted">ใช้คัดไวรัลและสไตล์งานให้ตรงกับคุณ</p>'}
    ${INTEREST_GROUPS.map(([k, t, items]) => `<section style="display:flex;flex-direction:column;gap:10px">
      <h2>${t}</h2><div class="chips" role="group" aria-label="${t}">
      ${items.map((v) => `<button type="button" class="chip" data-g="${k}" data-v="${esc(v)}" aria-pressed="${(cur[k] || []).includes(v)}">${esc(v)}</button>`).join('')}
      </div></section>`).join('')}
    <button type="button" class="btn" id="save">${first ? 'เริ่มใช้งาน · ดูไวรัลที่ตรงกับฉัน' : 'บันทึก'}</button>
    ${first ? '<button type="button" class="btn ghost" id="skip">ข้ามไปก่อน</button>' : ''}
  </main>${first ? '' : nav('profile')}`;
  app.querySelectorAll('.chip').forEach((b) => b.onclick = () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));
  const save = async () => {
    const body = {};
    INTEREST_GROUPS.forEach(([k]) => { body[k] = [...app.querySelectorAll(`.chip[data-g="${k}"][aria-pressed="true"]`)].map((b) => b.dataset.v); });
    ME = await api('api/profile/interests', { method: 'PUT', body });
    toast('บันทึกแล้ว'); go(first ? 'home' : 'profile');
  };
  $('#save').onclick = () => save().catch((e) => toast(e.message));
  if (first) $('#skip').onclick = () => api('api/profile/interests', { method: 'PUT', body: {} }).then((m) => { ME = m; go('home'); });
}

// ---------- หน้าต่างๆ ----------
function loginView(err) {
  const msg = { notready: 'ช่องทางนี้ยังไม่เปิดใช้งาน', state: 'หมดเวลา ลองกดเข้าสู่ระบบใหม่', fail: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง' }[err];
  app.innerHTML = `<div class="login">
    <div class="brand" style="font-size:22px">${RICH('head', 42)}<span>Mc <em>Rich</em></span></div>
    <div style="display:flex;justify-content:center;margin-top:4px">${RICH('wave', 150)}</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <h1 style="font-size:31px">ภาพและคลิปขายของ<br>ทำเสร็จในแอปเดียว</h1>
      <p style="color:var(--muted2)">โปสเตอร์ เมนู คลิปเปิดกล่อง ละครสั้น รีวิวด้วยอวตาร พร้อมแคปชั่น แล้วโพสต์ลงเพจ IG TikTok ได้เลย</p>
    </div>
    <div class="grid3"><div class="stat"><b>10</b><span class="muted">ภาพฟรีเมื่อสมัคร</span></div><div class="stat"><b>20</b><span class="muted">ดาวต้อนรับ</span></div><div class="stat"><b>+1</b><span class="muted">ภาพฟรีทุกวัน</span></div></div>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px">
      ${msg ? `<p role="alert" style="background:var(--bad-bg);color:var(--bad);border-radius:12px;padding:10px 12px">${msg}</p>` : ''}
      <a class="btn line" href="auth/line" ${CFG.line ? '' : 'aria-disabled="true"'}>${ICON.line}เข้าสู่ระบบด้วย LINE</a>
      <a class="btn google" href="auth/google" ${CFG.google ? '' : 'aria-disabled="true"'}>${ICON.google}เข้าสู่ระบบด้วย Google</a>
      ${!CFG.line && !CFG.google ? '<p class="muted" style="text-align:center">ระบบล็อกอินกำลังตั้งค่า</p>' : ''}
      <p class="muted" style="text-align:center">เข้าใช้งานถือว่ายอมรับ <a href="terms">เงื่อนไขการใช้</a> <a href="privacy">นโยบายความเป็นส่วนตัว</a> และ <a href="refund">การคืนเงิน</a></p>
    </div></div>`;
}

async function homeView() {
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'อรุณสวัสดิ์' : hour < 17 ? 'สวัสดี' : 'สวัสดีตอนเย็น';
  const promo = !ME.brand?.shopName
    ? `<a class="promo" href="#brand">${RICH('create', 40)}<span><b>ตั้งชุดแบรนด์ครั้งเดียว</b><small class="muted">ทุกผลงานจะใส่ชื่อร้าน โลโก้ และสีของคุณ</small></span>${ICON.chev}</a>`
    : `<a class="promo" href="#profile">${RICH('cheer', 40)}<span><b>ชวนเพื่อน รับ 20 ดาว</b><small class="muted">โค้ดของคุณ ${esc(ME.referralCode)}</small></span>${ICON.chev}</a>`;
  app.innerHTML = `${topbar()}<main>
    <section class="hero2">
      <div class="hello"><div><span class="muted" style="font-size:14px">${greet} ${esc(ME.name)}</span><h1>วันนี้สร้างอะไรดี?</h1></div>${RICH('wave', 104)}</div>
      <a class="btn cta" href="#create?new=1">${ICON.plus}สร้างผลงานใหม่</a>
      <div class="quota"><span>ภาพฟรีวันนี้ <b>${ME.freeImages.today}</b></span><span>ภาพฟรีต้อนรับ <b>${ME.freeImages.welcome}/10</b></span></div>
    </section>
    <section id="vBox" style="display:flex;flex-direction:column;gap:12px"><div class="sec-h"><h2>คลิปไวรัลแนะนำ</h2></div>${LOAD()}</section>
    <section style="display:flex;flex-direction:column;gap:12px"><div class="sec-h"><h2 id="th">แนวงานฮิต</h2><a href="#interests">ปรับความสนใจ</a></div>
      <div class="grid3" id="trends">${LOAD()}</div></section>
    ${promo}
  </main>${nav('home')}`;
  api('api/trends').then((t) => {
    $('#th').textContent = t.personalized ? 'แนวงานฮิต ตรงกับคุณ' : 'แนวงานฮิต';
    $('#trends').innerHTML = t.items.map((x) => `<button type="button" class="trend" data-trend="${x.id}" style="background:none;border:0;padding:0;font:inherit;text-align:left;cursor:pointer">
      <div class="thumb" style="background:${esc(x.color)}${x.sample?.poster ? ` url('${x.sample.poster}') center/cover` : ''};position:relative">${x.sample?.kind === 'video' ? '<span style="position:absolute;right:6px;top:6px;background:rgba(0,0,0,.6);border-radius:999px;padding:2px 7px;font-size:11px">▶ ตัวอย่าง</span>' : ''}${x.badge ? `<span style="background:rgba(0,0,0,.55);border-radius:999px;padding:2px 8px">${esc(x.badge)}</span>` : ''}</div>
      <b style="font-size:13px;line-height:1.3">${esc(x.title)}</b><span class="muted">${esc(x.price)}</span></button>`).join('');
    app.querySelectorAll('[data-trend]').forEach((b) => b.onclick = () => trendSheet(t.items.find((x) => String(x.id) === b.dataset.trend)));
  }).catch((e) => { if (e.message !== 'login' && $('#trends')) $('#trends').innerHTML = `<p class="muted">${esc(e.message)}</p>`; });
  viralBox($('#vBox'), { home: true }).catch((e) => { if (e.message !== 'login' && $('#vBox')) $('#vBox').innerHTML = ''; });
}
const PF = { tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', instagram: 'IG', web: 'คลิป' };
const views = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : n ? String(n) : '');
const clipCard = (x) => `<button type="button" class="vcard" data-open="${x.id}"><span class="ph">${x.thumb ? `<img src="${x.thumb}" alt="" loading="lazy">` : ''}
  <span class="pf">${x.pinned ? '⭐ ' : ''}${PF[x.platform] || 'คลิป'}</span>${x.views ? `<span class="vw">▶ ${views(x.views)}</span>` : x.likes ? `<span class="vw">♥ ${views(x.likes)}</span>` : ''}</span>
  <b>${esc(x.title)}</b><span class="muted" style="font-size:12px">${esc(x.channel)}</span></button>`;
function makeFromViral(x) {
  const i = x?.idea; if (!i) return toast('ไอเดียกำลังมา ลองใหม่อีกสักพัก');
  openDraft({ kind: i.kind, style: i.style, goal: (ME.interests?.goals || []).includes('Affiliate') ? 'aff' : 'sell', product: ME.brand?.shopName ? '' : i.product,
    headline: i.kind === 'image' ? i.hook : '', hookText: i.kind === 'video' ? i.hook : '', details: `เกาะกระแส "${x.title}": ${i.angle}${i.kind === 'video' ? ` · ฮุกเปิดคลิป: ${i.hook}` : ''}` });
}
const prefPf = () => { try { return localStorage.getItem('mr_vpf') || ''; } catch { return ''; } };
const savePf = (v) => { try { localStorage.setItem('mr_vpf', v); } catch {} };
const trendRow = (x, i) => `<button type="button" class="tcard" data-open="${x.id}" style="width:auto;flex-direction:row;align-items:center;gap:12px">
  ${x.thumb ? `<img src="${x.thumb}" alt="" loading="lazy" style="width:64px;height:64px;aspect-ratio:1;flex:none">` : ''}
  <span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="rk">#${i + 1}${x.traffic ? ` · ค้นหา ${esc(x.traffic)}` : ''}</span>
  <span class="tt">${esc(x.title)}</span>${x.idea?.hook ? `<span class="hk">💡 ${esc(x.idea.hook)}</span>` : ''}</span></button>`;
// กล่องไวรัล: แท็บแพลตฟอร์ม + ชิปเฉพาะสไตล์ของผู้ใช้ (ใช้ทั้งหน้าแรกและหน้าคลิปไวรัล)
async function viralBox(el, o = {}) {
  const st = { pf: o.pf || prefPf(), g: o.g || 'mine', sort: o.sort || 'hot', page: 0, items: [], retry: 0 };
  const limit = o.home ? 6 : 24;
  async function load(reset) {
    if (reset) { st.page = 0; st.items = []; }
    const d = await api(`api/viral/clips?platform=${encodeURIComponent(st.pf)}&group=${encodeURIComponent(st.g)}&sort=${st.sort}&page=${st.page}&limit=${limit}`);
    if (!el.isConnected) return;
    st.pf = d.platform; st.items = [...st.items, ...d.items];
    const google = st.pf === 'google';
    const tab = (t) => `<button type="button" class="chip" data-vpf="${t.key}" aria-pressed="${t.key === st.pf}" style="white-space:nowrap;flex:none">${esc(t.label)}</button>`;
    const chip = (k, label) => `<button type="button" class="chip" data-vg="${k}" aria-pressed="${st.g === k}" style="white-space:nowrap;flex:none;min-height:32px;padding:4px 12px;font-size:13px">${label}</button>`;
    el.innerHTML = `${o.home ? `<div class="sec-h"><h2>คลิปไวรัลแนะนำ</h2><a href="#viral?pf=${st.pf}&g=${st.g}">ดูทั้งหมด</a></div>` : ''}
      <div class="hs" role="tablist" aria-label="แพลตฟอร์ม" style="padding-bottom:0">${d.tabs.map(tab).join('')}</div>
      ${d.myChips.length ? `<div class="hs" style="padding-bottom:0">${d.myChips.length > 1 ? chip('mine', '✨ ทุกสไตล์ของฉัน') : ''}${d.myChips.map((c) => chip(c.key, `${c.emoji} ${esc(c.label)}`)).join('')}</div>` : ''}
      ${d.fallback ? '<span class="muted" style="font-size:13px">สไตล์นี้กำลังอัปเดต · ระหว่างนี้ดูคลิปมาแรงบนแพลตฟอร์มนี้ไปก่อน</span>' : ''}
      ${d.needStyles ? '<a class="card" href="#interests" style="text-decoration:none;color:var(--fg);padding:12px"><b>เลือกสไตล์ของคุณก่อน</b><span class="muted" style="font-size:13px">ตั้งหมวดสินค้าและสไตล์คลิป ระบบจะคัดเฉพาะไวรัลที่ตรงกับคุณ</span></a>' : ''}
      ${google && d.general && st.items.length ? '<span class="muted" style="font-size:13px">ยังไม่มีกระแสตรงสไตล์คุณวันนี้ · นี่คือกระแสยอดนิยมในไทย</span>' : ''}
      ${!o.home && !google ? `<div class="row" style="gap:8px">${['hot', 'new'].map((k) => `<button type="button" class="chip" data-vs="${k}" aria-pressed="${st.sort === k}" style="min-height:32px;padding:4px 12px;font-size:13px">${k === 'hot' ? '🔥 มาแรง' : '🆕 ใหม่สุด'}</button>`).join('')}</div>` : ''}
      <div class="vgrid" style="display:grid;grid-template-columns:${google ? '1fr' : `repeat(auto-fill,minmax(${o.home ? 104 : 150}px,1fr))`};gap:12px 10px">
        ${st.items.length ? st.items.map((x, i) => (google ? trendRow(x, i) : clipCard(x).replace('class="vcard"', 'class="vcard" style="width:auto"'))).join('')
          : `<div style="grid-column:1/-1">${richState(d.filling ? 'think' : 'empty', d.filling ? 'ริชกำลังหาคลิปให้' : 'ยังไม่มีคลิปในสไตล์นี้', d.filling ? 'อีกสักครู่จะขึ้นเอง' : `ลองแพลตฟอร์มอื่น หรือกลับมาใหม่อีกสักพัก`)}</div>`}</div>
      ${!o.home && st.items.length < d.total ? '<button type="button" class="btn dark" data-vmore>ดูเพิ่ม</button>' : ''}`;
    el.querySelectorAll('[data-vpf]').forEach((b) => b.onclick = () => { st.retry = 0; st.pf = b.dataset.vpf; savePf(st.pf); load(true).catch((e) => toast(e.message)); });
    el.querySelectorAll('[data-vg]').forEach((b) => b.onclick = () => { st.retry = 0; st.g = b.dataset.vg; load(true).catch((e) => toast(e.message)); });
    el.querySelectorAll('[data-vs]').forEach((b) => b.onclick = () => { st.sort = b.dataset.vs; load(true).catch((e) => toast(e.message)); });
    const more = el.querySelector('[data-vmore]'); if (more) more.onclick = () => { st.page++; load(false).catch((e) => toast(e.message)); };
    el.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => viralSheet(st.items.find((x) => String(x.id) === b.dataset.open), makeFromViral));
    if (!o.home) history.replaceState(null, '', `#viral?pf=${st.pf}&g=${st.g}`);
    clearTimeout(st.t);
    if (d.filling && st.retry < 4) { const key = `${st.pf}|${st.g}`; st.t = setTimeout(() => { if (el.isConnected && `${st.pf}|${st.g}` === key) { st.retry++; load(true).catch(() => {}); } }, 25000); } else if (!d.filling) st.retry = 0;
  }
  await load(true);
}
async function viralView(qs) {
  const ps = new URLSearchParams(qs || '');
  app.innerHTML = `${topbar('คลิปไวรัลแนะนำ', 'home')}<main><section id="vAll" style="display:flex;flex-direction:column;gap:12px">${LOAD()}</section></main>${nav('home')}`;
  if (ps.get('pf')) savePf(ps.get('pf'));
  await viralBox($('#vAll'), { pf: ps.get('pf') || '', g: ps.get('g') || 'mine' });
}
function sampleSheet(src, kind, label) {
  if (!src) return;
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="ตัวอย่าง ${esc(label)}"><span class="grab" aria-hidden="true"></span>
    ${kind === 'video' ? `<video src="${src}" autoplay loop playsinline controls style="width:100%;max-height:66vh;border-radius:14px;background:#000"></video>`
      : `<img src="${src}" alt="ตัวอย่าง ${esc(label)}" style="width:100%;max-height:66vh;object-fit:contain;border-radius:14px;background:var(--s2)">`}
    <b style="font-size:18px">${esc(label)}</b><span class="muted">ตัวอย่างที่สร้างด้วย Mc Rich · ผลงานของคุณจะใช้สินค้า/ข้อมูลของคุณเอง</span>
    <button type="button" class="btn" id="scl">ปิด</button></div>`;
  const close = () => { bg.remove(); window.removeEventListener('hashchange', close); };
  bg.onclick = (e) => { if (e.target === bg) close(); };
  window.addEventListener('hashchange', close);
  document.body.appendChild(bg);
  bg.querySelector('#scl').onclick = close;
}
function trendSheet(x) {
  if (!x) return;
  const go_ = () => go(`create?style=${encodeURIComponent(x.style)}&kind=${encodeURIComponent(x.kind)}`);
  if (!x.sample) return go_();
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(x.title)}"><span class="grab" aria-hidden="true"></span>
    ${x.sample.kind === 'video' ? `<video src="${x.sample.src}" poster="${x.sample.poster}" autoplay muted loop playsinline controls style="width:100%;max-height:62vh;border-radius:14px;background:#000"></video>`
      : `<img src="${x.sample.src}" alt="ตัวอย่าง ${esc(x.title)}" style="width:100%;max-height:62vh;object-fit:contain;border-radius:14px;background:var(--s2)">`}
    <b style="font-size:19px">${esc(x.title)}</b><span class="muted">ตัวอย่างที่สร้างด้วย Mc Rich · ${esc(x.price)} · ใส่สินค้าของคุณแทนได้เลย</span>
    <button type="button" class="btn" id="tmk">สร้างแบบนี้</button><button type="button" class="btn ghost" id="tcl">ปิด</button></div>`;
  const close = () => { bg.remove(); window.removeEventListener('hashchange', close); };
  bg.onclick = (e) => { if (e.target === bg) close(); };
  document.body.appendChild(bg);
  bg.querySelector('#tcl').onclick = close;
  bg.querySelector('#tmk').onclick = () => { close(); go_(); };
  window.addEventListener('hashchange', close);
}
function viralSheet(x, make) {
  if (!x) return;
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  const i = x.idea;
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(x.title)}"><span class="grab" aria-hidden="true"></span>
    ${x.thumb ? `<img src="${x.thumb}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:14px">` : ''}
    <b style="font-size:19px;line-height:1.35">${esc(x.title)}</b>
    <span class="muted">${x.source === 'gtrends' ? `🔥 คำค้นหามาแรง${x.traffic ? ` · ${esc(x.traffic)} ครั้ง` : ''}` : `🎬 ${PF[x.platform] || ''}${x.channel ? ' · ' + esc(x.channel) : ''}${x.views ? ` · ▶ ${views(x.views)}` : ''}${x.likes ? ` · ♥ ${views(x.likes)}` : ''}`}</span>
    ${i?.summary ? `<p style="margin:0;color:var(--muted2)">${esc(i.summary)}</p>` : ''}
    ${x.news ? `<a href="${esc(x.news.url)}" target="_blank" rel="noopener" class="card" style="text-decoration:none;color:var(--fg);padding:10px"><span style="font-size:14px">${esc(x.news.title)}</span><span class="muted" style="font-size:12px">${esc(x.news.source || 'ข่าว')} ↗</span></a>` : ''}
    ${i ? `<section class="card" style="background:var(--acc-card);border-color:var(--acc-line)"><b>${esc(i.emoji)} ไอเดียเกาะกระแส · ${esc(i.label)}</b>
      <span style="font-size:17px;font-weight:700">"${esc(i.hook)}"</span><span class="muted">${esc(i.angle)}</span>
      ${i.product ? `<span class="muted" style="font-size:13px">เหมาะกับ: ${esc(i.product)}</span>` : ''}</section>` : '<span class="muted">AI กำลังคิดไอเดียสำหรับกระแสนี้…</span>'}
    <span class="muted" style="font-size:12px">เกาะกระแสอย่างสร้างสรรค์ ไม่อ้างว่าเกี่ยวข้องกับคนดังหรือแบรนด์ในข่าว และตรวจข้อมูลก่อนโพสต์</span>
    <div class="grid2"><a class="btn dark" href="${esc(x.url)}" target="_blank" rel="noopener">ดูต้นทาง ↗</a><button type="button" class="btn" id="vmk" ${i ? '' : 'disabled'}>ทำคอนเทนต์นี้</button></div>
    <button type="button" class="btn ghost" id="vcl">ปิด</button></div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', esc_); window.removeEventListener('hashchange', close); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  bg.onclick = (e) => { if (e.target === bg) close(); };
  document.body.appendChild(bg);
  bg.querySelector('#vcl').onclick = close;
  bg.querySelector('#vmk').onclick = () => { close(); make(x); };
  document.addEventListener('keydown', esc_);
  window.addEventListener('hashchange', close);
  bg.querySelector('#vmk').focus();
}

const soon = (cur, title, text) => {
  app.innerHTML = `${topbar()}<main><div class="soon card"><span class="badge b-lime">กำลังเปิดเร็วๆ นี้</span><h2>${title}</h2><p class="muted" style="font-size:14px">${text}</p></div></main>${nav(cur)}`;
};

function profileView(qs) {
  const dq = new URLSearchParams(qs || '').get('drive');
  if (dq) { toast({ ok: 'เชื่อม Google Drive แล้ว', fail: 'เชื่อม Google Drive ไม่สำเร็จ ลองใหม่', notready: 'Google Drive ยังไม่เปิดใช้' }[dq] || ''); history.replaceState(null, '', '#profile'); }
  const lq = new URLSearchParams(qs || '');
  if (lq.get('linked')) {
    const pn = lq.get('linked') === 'line' ? 'LINE' : 'Google';
    toast({ linked: `เชื่อม ${pn} แล้ว ล็อกอินทางไหนก็เข้าบัญชีนี้`, merged: `รวมบัญชี ${pn} เข้ามาแล้ว (ดาวและผลงานย้ายมาครบ)`, already: `${pn} เชื่อมกับบัญชีนี้อยู่แล้ว`, hasprovider: `บัญชีนี้มี ${pn} อีกบัญชีเชื่อมอยู่แล้ว` }[lq.get('r')] || 'เชื่อมไม่สำเร็จ');
    history.replaceState(null, '', '#profile'); fetch('api/me').then((r) => r.json()).then((m) => { if (m.id) { ME = m; } }).catch(() => {});
  }
  const provs = ME.providers || [];
  const linkCard = `<section class="card"><h2 style="font-size:16px">ช่องทางเข้าสู่ระบบ</h2><span class="muted" style="font-size:13px">เชื่อมไว้ทั้งสองทาง ล็อกอินด้วย LINE หรือ Google ก็เข้าบัญชีเดียวกัน · ถ้าเคยสมัครแยกไว้ ระบบจะรวมดาวและผลงานให้</span>
    ${[['line', 'LINE', CFG.line], ['google', 'Google', CFG.google]].map(([k, l, on]) => `<div class="row between"><span>${l}</span>${provs.includes(k) ? '<span class="badge b-ok">เชื่อมแล้ว ✓</span>' : on ? `<a class="btn sm" href="auth/${k}?link=1">เชื่อม ${l}</a>` : '<span class="muted">ยังไม่เปิดใช้</span>'}</div>`).join('')}</section>`;
  const i = ME.interests || {};
  const iSum = [...(i.goals || []), ...(i.categories || []), ...(i.styles || [])].slice(0, 5).join(' · ') || 'ยังไม่ได้เลือก';
  const inviteUrl = new URL(`r/${ME.referralCode}`, location.href.split('#')[0]).href;
  app.innerHTML = `${topbar()}<main>
    <section class="row" style="gap:12px">
      ${ME.avatar ? `<img src="${esc(ME.avatar)}" alt="" width="56" height="56" style="border-radius:18px;object-fit:cover">` : `<div class="mark" style="width:56px;height:56px;font-size:20px;border-radius:18px">${esc((ME.name || '?').slice(0, 1))}</div>`}
      <div style="min-width:0"><b style="font-size:19px">${esc(ME.name)}</b><div class="muted">รหัสสมาชิก ${esc(ME.id)} · เข้าด้วย ${esc((ME.providers || []).map((p) => (p === 'line' ? 'LINE' : 'Google')).join(', '))}</div></div>
    </section>
    <section class="hero">
      <div class="row between"><span class="muted" style="font-weight:600">กระเป๋าดาว</span><span class="muted">1 ดาว = 1 บาท</span></div>
      <div class="row" style="gap:8px">${ICON.star.replace('17', '30').replace('17', '30')}<span class="num" style="font-size:40px;font-weight:700">${num(ME.stars)}</span></div>
      <div class="grid2"><button type="button" class="btn" id="topup">เติมดาว</button><a class="btn dark" href="#stars">ประวัติดาว</a></div>
    </section>
    <div class="list">
      <a href="#interests"><span><b>ความสนใจ</b><br><span class="muted">${esc(iSum)}</span></span><span aria-hidden="true">แก้ไข ›</span></a>
      <a href="#brand"><span><b>ชุดแบรนด์</b><br><span class="muted">${ME.brand?.shopName ? esc(ME.brand.shopName) : 'โลโก้ สี ฟอนต์ ชื่อร้าน ช่องทางสั่งซื้อ'}</span></span><span aria-hidden="true">›</span></a>
      <a href="#social"><span><b>โพสต์ตรงจากแอป</b><br><span class="muted">เชื่อม YouTube · Facebook Page · Instagram แล้วโพสต์/ตั้งเวลาได้ในคลิกเดียว</span></span><span aria-hidden="true">›</span></a>
      <a href="#avatars"><span><b>อวตารของฉัน</b><br><span class="muted">ออกแบบคนเหมือนจริง เก็บไว้ใช้ทำวิดีโอพูดได้ 4 ภาษา</span></span><span aria-hidden="true">›</span></a>
      <a href="#auto"><span><b>โหมดอัตโนมัติ</b><br><span class="muted">สร้างคอนเทนต์ให้เองตามวัน-เวลา คุมงบดาวต่อเดือน</span></span><span aria-hidden="true">›</span></a>
      <a href="#links"><span><b>ลิงก์ของฉัน · สถิติคลิก</b><br><span class="muted">ลิงก์สั้นนับคลิกแยกแพลตฟอร์ม</span></span><span aria-hidden="true">›</span></a>
      <a href="#tags"><span><b>แฮชแท็กประจำ</b><br><span class="muted">${(ME.hashtags || []).length} แท็ก · ติ๊กใช้ได้ตอนสร้าง</span></span><span aria-hidden="true">›</span></a>
    </div>
    ${linkCard}
    <section class="card" id="notif"><h2 style="font-size:16px">แจ้งเตือน</h2>${LOAD('กำลังโหลด…', true)}</section>
    <section class="card"><h2 style="font-size:16px">การเชื่อมต่อ</h2>
      <div id="drive" class="card" style="padding:12px;background:var(--s2)">${LOAD('Google Drive · กำลังโหลด…', true)}</div>
      <div class="grid2 muted">
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>เพจ Facebook</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>Instagram</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>TikTok</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>YouTube</span><span>เร็วๆ นี้</span></span>
      </div></section>
    <section class="card" style="background:var(--acc-card);border-color:var(--acc-line)"><b>ชวนเพื่อน รับคนละ 20 ดาว</b>
      <div class="row"><input type="text" id="inv" readonly value="${esc(inviteUrl)}" aria-label="ลิงก์ชวนเพื่อน"><button type="button" class="btn sm" id="copyInv">คัดลอก</button></div>
      <span class="muted">ชวนแล้ว ${ME.referred} คน · ได้ดาวเมื่อเพื่อนเติมดาวครั้งแรก</span></section>
    <section class="card"><b>ธีมแอป</b><span class="muted">อัตโนมัติ = สว่างหรือมืดตามการตั้งค่าของมือถือ</span>
      <div class="theme-seg">${[['auto', '🌓 อัตโนมัติ'], ['light', '☀️ กลางวัน'], ['dark', '🌙 มืด']].map(([k, l]) => `<button type="button" class="chip" data-theme-set="${k}" aria-pressed="${themeNow() === k}">${l}</button>`).join('')}</div></section>
    <div class="list"><a href="#mydata"><span><b>ข้อมูลและความเป็นส่วนตัว</b><br><span class="muted">ดาวน์โหลดข้อมูลของฉัน · ปิดบัญชี</span></span><span aria-hidden="true">›</span></a></div>
    <div class="row" style="justify-content:center;gap:16px;flex-wrap:wrap"><a href="terms" class="muted">เงื่อนไขการใช้</a><a href="privacy" class="muted">ความเป็นส่วนตัว</a><a href="refund" class="muted">การคืนเงิน</a></div>
    ${ME.admin ? '<a class="btn dark" href="#admin">หลังบ้านแอดมิน</a>' : ''}
    <button type="button" class="btn ghost" id="logout">ออกจากระบบ</button>
  </main>${nav('profile')}`;
  $('#topup').onclick = () => go('topup');
  $('#copyInv').onclick = async () => {
    try { await navigator.clipboard.writeText($('#inv').value); toast('คัดลอกลิงก์แล้ว'); } catch { $('#inv').select(); toast('กดค้างเพื่อคัดลอก'); }
  };
  $('#logout').onclick = async () => { await api('api/logout', { method: 'POST' }); ME = null; go('login'); };
  driveCard().catch(() => {});
  notifCard().catch(() => {});
}
async function driveCard() {
  const d = await api('api/drive'); const el = $('#drive'); if (!el) return;
  if (!d.ready) { el.innerHTML = '<div class="row between"><b>Google Drive</b><span class="muted">เร็วๆ นี้</span></div>'; return; }
  if (!d.connected) {
    el.innerHTML = `<div class="row between"><span><b>Google Drive</b><br><span class="muted">เก็บผลงานถาวรในไดรฟ์ของคุณ (เซิร์ฟเวอร์เราเก็บแค่ 7 วัน)</span></span></div>
      <a class="btn sm" href="drive/connect" style="width:100%">เชื่อมต่อ Google Drive</a>
      <span class="muted">Mc Rich เห็นเฉพาะไฟล์ที่ส่งเข้าไปเอง ไม่เห็นไฟล์อื่นในไดรฟ์</span>`;
    return;
  }
  el.innerHTML = `<div class="row between"><span><b>Google Drive</b> <span class="badge b-ok">เชื่อมแล้ว</span><br><span class="muted">${esc(d.email)}</span></span>
      ${d.folder ? `<a href="${esc(d.folder)}" target="_blank" rel="noopener" style="font-size:14px">เปิดโฟลเดอร์</a>` : ''}</div>
    <label class="row between" for="dauto"><span>ส่งผลงานเข้าไดรฟ์อัตโนมัติเมื่อสร้างเสร็จ</span><input id="dauto" type="checkbox" class="sw-in" ${d.auto ? 'checked' : ''}></label>
    <button type="button" class="btn ghost sm" id="dcut" style="width:100%">ยกเลิกการเชื่อมต่อ</button>`;
  $('#dauto').onchange = (e) => api('api/drive', { method: 'PUT', body: { auto: e.target.checked } }).then(() => toast('บันทึกแล้ว')).catch((er) => toast(er.message));
  $('#dcut').onclick = async () => { if (!confirm('ยกเลิกการเชื่อม Google Drive? ไฟล์ที่ส่งไปแล้วยังอยู่ในไดรฟ์')) return; await api('api/drive', { method: 'DELETE' }); toast('ยกเลิกแล้ว'); driveCard(); };
}

let AVS = [], AVS_LOADED = false, AVOPT = null;
async function loadAvatars() { const r = await api('api/avatars'); AVS = r.items; AVOPT = r; AVS_LOADED = true; return r; }
const AV_LABEL = {
  gender: { female: 'ผู้หญิง', male: 'ผู้ชาย' }, age: { 0: '0+', 3: '3+', 7: '7+', 15: '15+', 18: '18+', 20: '20+', 30: '30+', 40: '40+', 50: '50+', 60: '60+' },
  look: { thai: 'ไทย', chinese: 'ไทยเชื้อสายจีน', malay: 'มลายู', indian: 'เอเชียใต้', western: 'ตะวันตก', korean: 'สไตล์เกาหลี', african: 'แอฟริกัน' },
  hair: { short: 'ผมสั้น', long: 'ผมยาวตรง', wavy: 'ผมลอนประบ่า', bun: 'มัดมวย', bob: 'บ๊อบ', bald: 'โกนหัว', hijab: 'คลุมฮิญาบ' },
  outfit: { business: 'สูททำงาน', casual: 'เสื้อลำลอง', smart: 'สมาร์ทแคชชวล', thai: 'ชุดไทยประยุกต์', chef: 'ชุดเชฟ', doctor: 'เสื้อกาวน์', apron: 'ผ้ากันเปื้อนเจ้าของร้าน', sport: 'ชุดกีฬา', swim: 'ชุดว่ายน้ำ', bodycon: 'ชุดรัดรูป', gown: 'ชุดราตรีเซ็กซี่', crop: 'เสื้อครอป + ยีนส์รัดรูป', gymfit: 'ชุดออกกำลังกายรัดรูป' },
  sexy: { no: 'ปกติ', yes: 'เซ็กซี่ มั่นใจ (ไม่โป๊)' },
  bust: { auto: 'ตามธรรมชาติ', small: 'เล็ก', medium: 'กลาง', full: 'ใหญ่ (โค้งเว้า)' },
  body: { normal: 'ปกติ', chubby: 'อวบ', fit: 'หุ่นดี', slim: 'ผอม', muscle: 'เพาะกาย', athletic: 'หุ่นดีมาก', skinny: 'ผอมมาก', worn: 'โทรม' },
  bg: { studio: 'สตูดิโอเรียบ', shop: 'ในร้าน', office: 'ออฟฟิศ', cafe: 'คาเฟ่', home: 'ในบ้าน', outdoor: 'ถนนกลางแจ้ง', kitchen: 'ห้องครัว' },
  mood: { smile: 'ยิ้มอบอุ่น', confident: 'มั่นใจ', calm: 'สุขุมน่าเชื่อถือ', sad: 'หดหู่', sick: 'ป่วย', hyper: 'บ้าพลัง' },
};
let AVD = null;
async function avatarsView(qs) { await loadAvatars(); drawAvatars(qs); }
function drawAvatars(qs) {
  const from = new URLSearchParams(qs || '').get('from');
  const r = AVOPT;
  AVD = AVD || { gender: 'female', age: '30', look: 'thai', hair: 'long', outfit: 'smart', body: 'normal', bg: 'studio', mood: 'smile', extra: '', cands: null, spec: null, tab: AVS.length ? 'list' : 'design' };
  const back = from === 'create' ? 'create' : from === 'film' ? 'film?new=1' : 'profile';
  const tabs = `<div class="chips"><button type="button" class="chip" data-tab="list" aria-pressed="${AVD.tab === 'list'}">อวตารของฉัน (${AVS.length})</button><button type="button" class="chip" data-tab="design" aria-pressed="${AVD.tab === 'design'}">ออกแบบใหม่</button><button type="button" class="chip" data-tab="upload" aria-pressed="${AVD.tab === 'upload'}">ใช้รูปตัวเอง</button></div>`;
  let body = '';
  if (AVD.tab === 'list') {
    body = AVS.length ? `<div class="avgrid">${AVS.map((a) => `<div class="avcard"><img src="${a.img}" alt="" loading="lazy"><b>${esc(a.name)}</b>
        <span class="muted">${a.source === 'upload' ? 'รูปของฉัน' : 'ออกแบบ'} · ${esc(CAT0voice(a.voice))}</span>
        <div class="row" style="gap:6px"><button type="button" class="btn ghost sm" data-ren="${a.id}">แก้ชื่อ</button><button type="button" class="btn ghost sm" data-del="${a.id}">ลบ</button></div></div>`).join('')}</div>
        ${from === 'create' ? '<a class="btn" href="#create">กลับไปสร้างวิดีโอ</a>' : '<a class="btn" href="#create?style=v_avatar">สร้างวิดีโออวตาร</a>'}`
      : '<section class="card"><b>ยังไม่มีอวตาร</b><span class="muted">กด "ออกแบบใหม่" หรือ "ใช้รูปตัวเอง"</span></section>';
  } else if (AVD.tab === 'design' && AVD.cands) {
    body = `<h2>เลือก 1 แบบที่ชอบ</h2><div class="avgrid">${AVD.cands.map((c, i) => `<button type="button" class="avcard" data-pick="${i}" aria-pressed="${AVD.pick === i}"><img src="${c.url}" alt="ตัวเลือก ${i + 1}"></button>`).join('')}</div>
      <label class="f" for="avname">ตั้งชื่ออวตาร<input id="avname" type="text" maxlength="40" placeholder="เช่น น้องมิน พรีเซนเตอร์" value="${esc(AVD.name || '')}"></label>
      <div class="grid2"><button type="button" class="btn dark" id="redo">ออกแบบใหม่</button><button type="button" class="btn" id="save">บันทึกอวตาร</button></div>`;
  } else if (AVD.tab === 'design') {
    const minor = ['0', '3', '7', '15'].includes(AVD.age);
    if (minor && AVD.outfit === 'swim') AVD.outfit = 'casual';
    if (minor && ['fit', 'muscle', 'athletic'].includes(AVD.body)) AVD.body = 'normal';
    const ADULT = ['swim', 'bodycon', 'gown', 'crop', 'gymfit'];
    if (minor && ADULT.includes(AVD.outfit)) AVD.outfit = 'casual';
    if (minor) AVD.sexy = 'no';
    AVD.sexy = AVD.sexy || 'no';
    if (minor || AVD.gender !== 'female') AVD.bust = 'auto'; AVD.bust = AVD.bust || 'auto';
    const off = (k, v) => minor && ((k === 'outfit' && ADULT.includes(v)) || k === 'sexy' && v === 'yes' || (k === 'body' && ['fit', 'muscle', 'athletic'].includes(v)));
    const grp = (k, t) => `<section style="display:flex;flex-direction:column;gap:8px"><h2>${t}</h2><div class="chips">${(r.options[k] || []).filter((v) => !off(k, v)).map((v) => `<button type="button" class="chip" data-ak="${k}" data-v="${v}" aria-pressed="${AVD[k] === v}">${esc(AV_LABEL[k]?.[v] || v)}</button>`).join('')}</div>${k === 'age' && minor ? '<span class="muted">อวตารเด็ก/วัยรุ่น: แต่งกายมิดชิดตามวัยเสมอ</span>' : ''}</section>`;
    body = `${r.ready ? '' : '<p class="muted">ระบบวิดีโออวตารกำลังตั้งค่า ออกแบบเก็บไว้ก่อนได้</p>'}
      <section style="display:flex;flex-direction:column;gap:8px"><h2>สไตล์ภาพ</h2><div class="chips">${[['real', 'เหมือนจริง'], ['anime', 'อนิเมะ'], ['3d', 'การ์ตูน 3D'], ['paint', 'ภาพวาด']].map(([k, l]) => `<button type="button" class="chip" data-ak="art" data-v="${k}" aria-pressed="${(AVD.art || 'real') === k}">${l}</button>`).join('')}</div>${from === 'film' ? '<span class="muted">ตัวละครหนัง: เลือกสไตล์ให้ตรงกับสไตล์ภาพของเรื่อง · ใส่ชุด/ลักษณะเฉพาะในรายละเอียดเพิ่ม เช่น ชุดเจ้าสาว, ชุดนักธุรกิจหรู</span>' : ''}</section>
      ${grp('gender', 'เพศ')}${grp('age', 'ช่วงอายุ')}${grp('look', 'หน้าตา')}${grp('body', 'รูปร่าง')}${grp('hair', 'ทรงผม')}${grp('outfit', 'ชุด')}${minor || AVD.gender !== 'female' ? '' : grp('bust', 'สัดส่วนหน้าอก')}${minor ? '' : grp('sexy', 'ลุค')}${grp('bg', 'ฉากหลัง')}${grp('mood', 'สีหน้า')}
      <label class="f" for="extra">รายละเอียดเพิ่ม (ไม่บังคับ)<input id="extra" type="text" maxlength="200" placeholder="เช่น ใส่แว่นกรอบบาง ต่างหูมุก" value="${esc(AVD.extra)}"></label>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">ออกแบบ 1 ครั้ง ได้ 2 แบบให้เลือก</span><b class="num" style="font-size:22px">${ICON.star}${r.designPrice} ดาว</b></div>
        <span class="muted">ภาพคนเหมือนจริง (บุคคลสมมติ) · บันทึกแล้วใช้ได้ทุกงาน ไม่เสียดาวซ้ำ</span></section>
      <button type="button" class="btn" id="design">ออกแบบอวตาร</button>`;
  } else {
    const slot = (id, t, req) => `<label class="ref add" for="${id}" style="cursor:pointer;flex:1;min-width:0;height:auto;aspect-ratio:3/4;flex-direction:column;gap:4px;text-align:center;font-size:13px;background-size:cover;background-position:center" id="${id}l"><span class="sl-t">${t}<br><span class="muted">${req ? 'จำเป็น' : 'แนะนำ'}</span></span><input id="${id}" type="file" accept="image/*" hidden></label>`;
    body = `<section class="card"><b>ใช้รูปตัวเองเป็นอวตาร</b>
        <span class="muted">📸 ลงรูป 3 มุมได้อวตารคุณภาพดีที่สุด: <b>หน้าตรง</b> + <b>หันข้างซ้าย</b> + <b>หันข้างขวา</b> · เห็นหน้าชัด ไหล่ขึ้นไป แสงสว่าง ไม่ใส่แว่นดำ ไม่มีคนอื่นในรูป</span>
        <div class="row" style="gap:8px">${slot('upf', 'หน้าตรง', true)}${slot('upL', 'ข้างซ้าย', false)}${slot('upR', 'ข้างขวา', false)}</div>
        <span class="muted">หน้าตรงใช้ทำวิดีโอพูด · มุมข้างช่วยให้ AI จำหน้าได้แม่นเวลาเข้าฉากหนัง/คลิปมุมอื่น</span>
        <label class="f" for="upname">ชื่ออวตาร<input id="upname" type="text" maxlength="40" placeholder="เช่น พี่แม็ก"></label>
        <div class="chips"><button type="button" class="chip" data-ug="female" aria-pressed="${AVD.ug !== 'male'}">ผู้หญิง</button><button type="button" class="chip" data-ug="male" aria-pressed="${AVD.ug === 'male'}">ผู้ชาย</button></div>
                <label class="row" for="consent" style="gap:10px;align-items:flex-start"><input id="consent" type="checkbox"><span>ฉันยืนยันว่าเป็นรูปของฉันเอง หรือได้รับอนุญาตจากเจ้าของรูปให้ใช้สร้างวิดีโอ และจะไม่ใช้ปลอมเป็นผู้อื่น</span></label>
        <button type="button" class="btn" id="upgo">บันทึกอวตาร (ฟรี)</button></section>`;
  }
  app.innerHTML = `${topbar('อวตารของฉัน', back)}<main>${tabs}${body}</main>${nav('profile')}`;
  app.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { AVD.tab = b.dataset.tab; drawAvatars(qs); });
  app.querySelectorAll('[data-ak]').forEach((b) => b.onclick = () => { const e = $('#extra'); if (e) AVD.extra = e.value; AVD[b.dataset.ak] = b.dataset.v; drawAvatars(qs); });
  app.querySelectorAll('[data-ug]').forEach((b) => b.onclick = () => { AVD.ug = b.dataset.ug; app.querySelectorAll('[data-ug]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  app.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => { const n = $('#avname'); if (n) AVD.name = n.value; AVD.pick = Number(b.dataset.pick); drawAvatars(qs); });
  app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'แตะอีกครั้งเพื่อลบ'; return; }
    await api(`api/avatars/${b.dataset.del}`, { method: 'DELETE' }).catch((e) => toast(e.message)); avatarsView(qs);
  });
  app.querySelectorAll('[data-ren]').forEach((b) => b.onclick = () => {
    const a = AVS.find((x) => x.id === Number(b.dataset.ren)); const card = b.closest('.avcard');
    card.querySelector('b').outerHTML = `<input type="text" maxlength="40" value="${esc(a.name)}" aria-label="ชื่ออวตาร">`;
    b.textContent = 'บันทึก'; b.onclick = async () => { await api(`api/avatars/${a.id}`, { method: 'PATCH', body: { name: card.querySelector('input').value } }).catch((e) => toast(e.message)); avatarsView(qs); };
  });
  const dz = $('#design'); if (dz) dz.onclick = async () => {
    AVD.extra = $('#extra').value; dz.disabled = true; dz.textContent = 'AI กำลังออกแบบ… (ประมาณ 20–40 วิ)';
    try { const x = await api('api/avatars/design', { method: 'POST', body: AVD }); AVD.cands = x.cands; AVD.spec = x.spec; AVD.pick = 0; if (x.me) ME = x.me; CAT = null; drawAvatars(qs); }
    catch (e) { toast(e.message); dz.disabled = false; dz.textContent = 'ออกแบบอวตาร'; }
  };
  const rd = $('#redo'); if (rd) rd.onclick = () => { AVD.cands = null; drawAvatars(qs); };
  const sv = $('#save'); if (sv) sv.onclick = async () => {
    sv.disabled = true;
    try { const a = await api('api/avatars', { method: 'POST', body: { cand: AVD.cands[AVD.pick || 0].name, name: $('#avname').value, spec: AVD.spec } }); AVD.cands = null; AVD.tab = 'list'; AVD.name = ''; if (D && D.style === 'v_avatar') D.avatarId = a.id; toast('บันทึกอวตารแล้ว'); if (from === 'create') return go('create'); if (from === 'film') { if (FD && a?.id && FD.cast.length < 6) FD.cast.push({ avatarId: a.id, name: a.name, role: '', desc: '', voice: a.voice }); AVS_LOADED = false; return go('film?new=1'); } avatarsView(qs); }
    catch (e) { toast(e.message); sv.disabled = false; }
  };
  let UPF = null; const UPS = {};
  const prev = (id, f) => { const l = $(`#${id}l`); if (l && f) { l.style.backgroundImage = `url(${URL.createObjectURL(f)})`; l.style.justifyContent = 'flex-end'; const t = l.querySelector('.sl-t'); t.innerHTML = `✓ ${t.firstChild.textContent}`; t.style.cssText = 'background:rgba(0,0,0,.6);color:#fff;border-radius:999px;padding:2px 10px;margin-bottom:6px;font-weight:600'; } };
  const uf = $('#upf'); if (uf) uf.onchange = (e) => { UPF = e.target.files[0] || null; prev('upf', UPF); };
  ['upL', 'upR'].forEach((id) => { const x = $(`#${id}`); if (x) x.onchange = (e) => { UPS[id] = e.target.files[0] || null; prev(id, UPS[id]); }; });
  const ug = $('#upgo'); if (ug) ug.onclick = async () => {
    if (!UPF) return toast('เลือกรูปหน้าตรงก่อน'); if (!$('#consent').checked) return toast('ติ๊กยืนยันสิทธิ์ในรูปก่อน');
    const fd = new FormData(); fd.append('photo', UPF); fd.append('name', $('#upname').value); fd.append('gender', AVD.ug === 'male' ? 'male' : 'female'); fd.append('consent', 'yes');
    ['upL', 'upR'].forEach((id) => UPS[id] && fd.append('side', UPS[id]));
    ug.disabled = true;
    try { const a = await api('api/avatars/upload', { method: 'POST', body: fd }); AVD.tab = 'list'; if (D && D.style === 'v_avatar') D.avatarId = a.id; toast('บันทึกอวตารแล้ว'); if (from === 'create') return go('create'); if (from === 'film') { if (FD && a?.id && FD.cast.length < 6) FD.cast.push({ avatarId: a.id, name: a.name, role: '', desc: '', voice: a.voice }); AVS_LOADED = false; return go('film?new=1'); } avatarsView(qs); }
    catch (e) { toast(e.message); ug.disabled = false; }
  };
}
const CAT0voice = (id) => { const v = (CAT?.video?.voices || []).find((x) => x.id === id); return v ? v.label : 'เสียงตามเพศ'; };

function brandView() {
  const b = ME.brand || {};
  const FONTS = ['Anuphan', 'Kanit', 'Prompt', 'Mitr', 'Sarabun', 'Chakra Petch'];
  app.innerHTML = `${topbar('ชุดแบรนด์', 'profile')}<main>
    <p class="muted">ใส่ครั้งเดียว ทุกภาพและคลิปจะใช้โลโก้ สี และช่องทางสั่งซื้อนี้ให้อัตโนมัติ</p>
    <section class="card"><div class="row" style="gap:12px">
      ${b.logo ? `<img class="logo-prev" src="api/logo/${esc(b.logo)}" alt="โลโก้ร้าน">` : '<div class="logo-prev" aria-hidden="true"></div>'}
      <label class="btn dark sm" for="logo" style="cursor:pointer">${b.logo ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}<input id="logo" type="file" accept="image/*" hidden></label></div>
      <span class="muted">PNG พื้นใส สวยที่สุด · ไม่เกิน 5MB</span></section>
    <section class="card">
      <label class="f" for="shopName">ชื่อร้าน / แบรนด์<input id="shopName" type="text" maxlength="60" value="${esc(b.shopName)}"></label>
      <label class="f" for="tagline">สโลแกน (ไม่บังคับ)<input id="tagline" type="text" maxlength="80" value="${esc(b.tagline)}"></label>
      <div class="grid2"><label class="f" for="color">สีหลัก<input id="color" type="color" value="${esc(b.color || '#C8F94A')}"></label>
        <label class="f" for="accent">สีรอง<input id="accent" type="color" value="${esc(b.accent || '#0B0C0F')}"></label></div>
      <label class="f" for="font">ฟอนต์บนภาพ<select id="font">${FONTS.map((f) => `<option ${f === (b.font || 'Anuphan') ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    </section>
    <section class="card"><h2 style="font-size:16px">ช่องทางสั่งซื้อ</h2>
      <label class="f" for="line">LINE ร้าน (เช่น @chocobansuan)<input id="line" type="text" maxlength="60" value="${esc(b.line)}"></label>
      <label class="f" for="phone">เบอร์โทร<input id="phone" type="tel" maxlength="20" value="${esc(b.phone)}"></label>
      <label class="f" for="shopLink">ลิงก์ร้านออนไลน์<input id="shopLink" type="url" placeholder="https://" value="${esc(b.shopLink)}"></label>
      <label class="f" for="mapLink">ลิงก์แผนที่ร้าน<input id="mapLink" type="url" placeholder="https://" value="${esc(b.mapLink)}"></label>
    </section>
    <button type="button" class="btn" id="save">บันทึกชุดแบรนด์</button>
  </main>${nav('profile')}`;
  $('#logo').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('logo', f);
    try { ME = await api('api/profile/logo', { method: 'POST', body: fd }); toast('อัปโหลดโลโก้แล้ว'); brandView(); } catch (er) { toast(er.message); }
  };
  $('#save').onclick = async () => {
    const body = {}; ['shopName', 'tagline', 'color', 'accent', 'font', 'line', 'phone', 'shopLink', 'mapLink'].forEach((k) => { body[k] = $('#' + k).value; });
    try { ME = await api('api/profile/brand', { method: 'PUT', body }); toast('บันทึกแล้ว'); go('profile'); } catch (e) { toast(e.message); }
  };
}

function tagsView() {
  let tags = [...(ME.hashtags || [])];
  const draw = () => {
    app.innerHTML = `${topbar('แฮชแท็กประจำ', 'profile')}<main>
      <p class="muted">แท็กที่ใช้บ่อย บันทึกไว้ ตอนสร้างผลงานติ๊กเลือกได้เลย ไม่ต้องพิมพ์ใหม่</p>
      <div class="row"><input type="text" id="nt" placeholder="#แท็กใหม่" aria-label="แฮชแท็กใหม่"><button type="button" class="btn sm" id="add">เพิ่ม</button></div>
      <div class="chips">${tags.map((t, i) => `<button type="button" class="chip" data-i="${i}" aria-label="ลบ ${esc(t)}">${esc(t)} ✕</button>`).join('') || '<p class="muted">ยังไม่มีแท็ก</p>'}</div>
      <button type="button" class="btn" id="save">บันทึก (${tags.length} แท็ก)</button>
    </main>${nav('profile')}`;
    const add = () => {
      if (!$('#nt').value.trim()) return draw();
      $('#nt').value.split(/[\s,]+/).map((x) => x.trim().replace(/^#*/, '#')).filter((x) => x.length > 1 && !tags.includes(x)).forEach((x) => tags.push(x));
      draw();
    };
    $('#add').onclick = add;
    $('#nt').onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) add(); };
    app.querySelectorAll('.chip[data-i]').forEach((b) => b.onclick = () => { tags.splice(Number(b.dataset.i), 1); draw(); });
    $('#save').onclick = async () => { $('#nt').value.split(/[\s,]+/).map((x) => x.trim().replace(/^#*/, '#')).filter((x) => x.length > 1 && !tags.includes(x)).forEach((x) => tags.push(x)); try { ME = await api('api/profile/hashtags', { method: 'PUT', body: { hashtags: tags } }); tags = [...(ME.hashtags || [])]; draw(); toast(`บันทึกแล้ว ${tags.length} แท็ก`); } catch (e) { toast(e.message); } };
  };
  draw();
}

// ---------- เติมดาว ----------
async function topupView() {
  app.innerHTML = `${topbar('เติมดาว', 'profile')}<main>${LOAD()}</main>${nav('profile')}`;
  const info = await api('api/topup/packages');
  if (!info.ready) { $('main').innerHTML = '<div class="soon card"><span class="badge b-warn">ยังไม่เปิด</span><h2>ระบบเติมดาวกำลังตั้งค่า</h2></div>'; return; }
  $('main').innerHTML = `<p class="muted">1 ดาว = 1 บาท · ดาวไม่มีวันหมดอายุ · ได้ใบเสร็จทุกครั้ง</p>
    <div class="grid2">${info.packages.map((p) => `<button type="button" class="card pk" data-p="${p.id}" style="text-align:left;cursor:pointer;color:var(--fg);${p.id === 'p300' ? 'border:2px solid var(--lime)' : ''}">
      <b class="num" style="font-size:22px">${num(p.stars)} ดาว</b><span class="num">฿${num(p.amount)}</span>
      <span class="muted" style="color:${p.bonus ? 'var(--lime)' : 'var(--muted)'};font-weight:600">${p.bonus ? `แถม ${p.bonus} ดาว` : ''}${p.label ? (p.bonus ? ' · ' : '') + p.label : ''}</span></button>`).join('')}</div>
    <p class="muted">${info.autoCheck ? 'ระบบตรวจสลิปอัตโนมัติ ดาวเข้าภายใน 1 นาที' : 'แอดมินตรวจสลิปและเติมดาวให้ (ปกติภายในวัน)'}</p>
    <div id="recent"></div>`;
  app.querySelectorAll('.pk').forEach((b) => b.onclick = () => payView(b.dataset.p).catch((e) => toast(e.message)));
  const { items } = await api('api/topups');
  if (items.length) $('#recent').innerHTML = `<h2 style="margin:8px 0">รายการล่าสุด</h2><div class="list">${items.slice(0, 5).map(topRow).join('')}</div>`;
}
const STATUS = { paid: ['สำเร็จ', 'b-ok'], review: ['รอแอดมินตรวจ', 'b-warn'], rejected: ['ไม่ผ่าน', 'b-warn'], pending: ['รอโอน', 'b-lime'] };
const topRow = (t) => `<div><span><b class="num">฿${num(t.amount)} · ${num(t.stars)} ดาว</b><br><span class="muted">${new Date(t.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}${t.reason && t.status !== 'paid' ? ' · ' + esc(t.reason) : ''}</span></span>
  ${t.status === 'paid' ? `<a href="receipt/${t.id}" target="_blank" rel="noopener" class="badge b-ok" style="text-decoration:none">ใบเสร็จ</a>` : `<span class="badge ${STATUS[t.status]?.[1] || ''}">${STATUS[t.status]?.[0] || t.status}</span>`}</div>`;

async function payView(pkg) {
  const t = await api('api/topup', { method: 'POST', body: { package: pkg } });
  let timer;
  const draw = (msg, kind) => {
    app.innerHTML = `${topbar('โอนเงิน', 'topup')}<main>
      <section class="card" style="flex-direction:row;justify-content:space-between"><span><span class="muted">แพ็ก</span><br><b class="num" style="font-size:20px">${num(t.stars)} ดาว</b></span>
        <span style="text-align:right"><span class="muted">ยอดโอน</span><br><b class="num" style="font-size:20px">฿${num(t.amount)}.00</b></span></section>
      <section class="card" style="align-items:center;background:#fff;color:#111">
        <b style="background:#0E3A6B;color:#fff;align-self:stretch;text-align:center;border-radius:10px;padding:8px">PromptPay · ฿${num(t.amount)}.00</b>
        <img src="${t.qr}" alt="QR PromptPay ยอด ${t.amount} บาท" width="240" height="240" style="image-rendering:pixelated">
        <span style="font-size:14px">ผู้รับ: <b>${esc(t.payee || 'Mc Rich')}</b></span>
        <span id="cd" style="font-size:13px;color:#B3261E;font-weight:600"></span>
        <span style="font-size:12px;color:#555">กดค้างที่ QR เพื่อบันทึกรูป แล้วสแกนในแอปธนาคาร</span>
      </section>
      ${msg ? `<p role="alert" class="card" style="background:${kind === 'ok' ? 'var(--ok-bg)' : kind === 'warn' ? 'var(--warn-bg)' : 'var(--bad-bg)'};color:${kind === 'ok' ? 'var(--ok)' : kind === 'warn' ? 'var(--warn)' : 'var(--bad)'}">${esc(msg)}</p>` : ''}
      <label class="btn" for="slip" style="cursor:pointer" id="slipBtn">โอนแล้ว · แนบสลิป<input id="slip" type="file" accept="image/*" hidden></label>
      <button type="button" class="btn ghost" id="review">ตรวจไม่ผ่าน? ส่งให้แอดมินตรวจ</button>
      <p class="muted">ยอดต้องตรงกับ QR · สลิป 1 ใบใช้ได้ครั้งเดียว · โอนจากบัญชีชื่ออะไรก็ได้</p>
    </main>${nav('profile')}`;
    const exp = new Date(t.expiresAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.round((exp - Date.now()) / 1000));
      const el = $('#cd'); if (!el) return clearInterval(timer);
      el.textContent = s ? `QR หมดอายุใน ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : 'QR หมดอายุ (ถ้าโอนแล้ว แนบสลิปได้ภายใน 24 ชม.)';
    };
    clearInterval(timer); timer = setInterval(tick, 1000); tick();
    $('#slip').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      $('#slipBtn').textContent = 'กำลังตรวจสลิป…';
      const fd = new FormData(); fd.append('slip', f);
      try {
        const r = await api(`api/topup/${t.id}/slip`, { method: 'POST', body: fd });
        if (r.result === 'paid') { clearInterval(timer); if (r.me) ME = r.me; else ME = await api('api/me'); successView(r); return; }
        if (r.result === 'review') return draw(r.reason || 'ส่งให้แอดมินตรวจแล้ว เติมดาวให้ภายในวัน แจ้งผลทาง LINE', 'warn');
        draw(r.message || r.reason || 'ตรวจสลิปไม่ผ่าน', 'bad');
      } catch (er) { draw(er.message, 'bad'); }
    };
    $('#review').onclick = async () => {
      try { await api(`api/topup/${t.id}/review`, { method: 'POST', body: {} }); draw('ส่งให้แอดมินตรวจแล้ว เติมดาวให้ภายในวัน', 'warn'); } catch (er) { toast(er.message); }
    };
  };
  draw();
}
function successView(r) {
  app.innerHTML = `${topbar('เติมดาวสำเร็จ', 'profile')}<main>
    <section class="hero" style="align-items:center;text-align:center;gap:12px">
      ${ICON.star.replace('width="17" height="17"', 'width="56" height="56"')}
      <h1>+${num(r.stars)} ดาว</h1><p class="muted">ยอดคงเหลือ ${num(ME.stars)} ดาว · ใบเสร็จ ${esc(r.receiptNo || '')}</p>
      <a class="btn" href="#create">ไปสร้างผลงาน</a>
      <a class="btn dark" href="receipt/${r.id}" target="_blank" rel="noopener">ดูใบเสร็จ</a>
    </section></main>${nav('profile')}`;
}

// ---------- แอดมิน ----------
// ---------- หลังบ้านแอดมิน ----------
const ADMIN_TABS = [['dash', 'ภาพรวม'], ['costs', 'ต้นทุน-กำไร'], ['topups', 'เติมดาว'], ['users', 'ผู้ใช้'], ['works', 'ผลงาน'], ['prices', 'ราคา'], ['viral', 'ไวรัล'], ['trends', 'แนวงานฮิต'], ['legal', 'ผู้ให้บริการ']];
async function adminView(qs) {
  const params = new URLSearchParams(qs || '');
  const tab = ADMIN_TABS.some(([k]) => k === params.get('t')) ? params.get('t') : 'dash';
  app.innerHTML = `${topbar('หลังบ้านแอดมิน', 'profile')}<div class="chips" style="padding:12px 16px 0;overflow-x:auto;flex-wrap:nowrap">${ADMIN_TABS.map(([k, l]) => `<a class="chip" href="#admin?t=${k}" aria-pressed="${k === tab}" style="white-space:nowrap;text-decoration:none">${l}</a>`).join('')}</div>
    <main>${LOAD()}</main>${nav('profile')}`;
  if (tab === 'topups') return adminTopups();
  if (tab === 'users') return params.get('u') ? adminUser(params.get('u')) : adminUsers(params.get('q') || '', params.get('sort') || 'new');
  if (tab === 'works') return adminWorks(params.get('s') || 'failed');
  if (tab === 'prices') return adminPrices();
  if (tab === 'costs') return adminCosts(Number(params.get('d')) || 30);
  if (tab === 'trends') return adminTrends();
  if (tab === 'legal') return adminLegal();
  if (tab === 'viral') return adminViral();
  return adminDash();
}
const kpi = (label, val, sub = '') => `<div class="card" style="padding:12px;gap:2px"><span class="muted" style="font-size:12px">${label}</span><b class="num" style="font-size:22px">${val}</b>${sub ? `<span class="muted" style="font-size:12px">${sub}</span>` : ''}</div>`;
async function adminDash() {
  const d = await api('api/admin/stats');
  const max = Math.max(1, ...d.days.map((x) => x.baht));
  $('main').innerHTML = `
    ${d.works.ai_broke ? `<div class="card" style="border-color:var(--bad);background:var(--bad-bg)"><b style="color:var(--bad)">⛔ เครดิต Gemini หมด — ลูกค้าสร้างงานไม่ได้ (${d.works.ai_broke} งานใน 6 ชม.)</b><span>เติมเงินที่ ai.studio/projects โปรเจกต์ mc-rich-515413 แล้วตั้งเติมอัตโนมัติ</span></div>` : ''}
    ${d.works.stuck ? `<div class="card" style="border-color:var(--warn)"><b>⚠️ งานค้างเกิน 30 นาที ${d.works.stuck} ชิ้น</b><a href="#admin?t=works&s=working">ดูรายการ ›</a></div>` : ''}
    ${d.money.review ? `<a class="card" href="#admin?t=topups" style="text-decoration:none;color:inherit;border-color:var(--lime-text)"><b>สลิปรอตรวจ ${d.money.review} รายการ ›</b></a>` : ''}
    <h2>รายได้ (เติมดาว)</h2>
    <div class="grid2">${kpi('วันนี้', '฿' + num(d.money.today))}${kpi('เดือนนี้', '฿' + num(d.money.month))}${kpi('ทั้งหมด', '฿' + num(d.money.total), `ลูกค้าจ่ายเงิน ${num(d.money.payers)} คน`)}${kpi('ดาวค้างในระบบ', num(d.stars.outstanding), 'ดาวที่ลูกค้ายังไม่ได้ใช้')}</div>
    <section class="card"><b>14 วันล่าสุด</b>
      <div style="display:flex;align-items:flex-end;gap:4px;height:120px" role="img" aria-label="กราฟรายได้ 14 วัน">${d.days.map((x) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end" title="${x.d}: ฿${num(x.baht)} · ${x.works} งาน">
        <div style="width:100%;background:var(--lime);border-radius:4px 4px 0 0;height:${Math.max(2, Math.round(x.baht / max * 100))}%"></div></div>`).join('')}</div>
      <div class="row between muted" style="font-size:11px"><span>${d.days[0].d}</span><span>วันนี้</span></div></section>
    <h2>ดาว</h2>
    <div class="grid2">${kpi('ใช้วันนี้', num(d.stars.spent_today))}${kpi('ใช้เดือนนี้', num(d.stars.spent_month))}${kpi('แจกเดือนนี้', num(d.stars.given_month), 'สมัคร/ชวนเพื่อน/แอดมิน')}${kpi('แผนอัตโนมัติเปิดอยู่', num(d.extra.auto_on || 0), `คิวโพสต์ ${num(d.extra.sched || 0)}`)}</div>
    <h2>ผู้ใช้</h2>
    <div class="grid2">${kpi('ทั้งหมด', num(d.users.total), `ระงับ ${num(d.users.banned)}`)}${kpi('ใหม่วันนี้', num(d.users.today), `7 วัน ${num(d.users.week)}`)}${kpi('เข้าใช้ 7 วัน', num(d.users.active7))}${kpi('แชทน้องริชวันนี้', num(d.extra.chats_today || 0))}</div>
    <h2>ผลงาน</h2>
    <div class="grid2">${kpi('สร้างวันนี้', num(d.works.today), `คลิป ${num(d.works.video_today)}`)}${kpi('คิว / กำลังทำ', `${num(d.works.queued)} / ${num(d.works.working)}`, `รอตรวจซับ ${num(d.works.review)}`)}${kpi('สำเร็จ 24 ชม.', num(d.works.done24))}${kpi('ล้มเหลว 24 ชม.', num(d.works.failed24), '<a href="#admin?t=works">ดูสาเหตุ ›</a>')}</div>
    <h2>แนวยอดนิยม 30 วัน</h2>
    <div class="list">${d.styles.map((x) => `<div><span><b>${esc(x.style)}</b> <span class="muted">${x.kind === 'video' ? '🎬' : '🖼️'}</span><br><span class="muted">${num(x.n)} งาน · ${num(x.stars)} ดาว${x.failed ? ` · ล้มเหลว ${x.failed}` : ''}</span></span></div>`).join('') || '<div class="muted">ยังไม่มีข้อมูล</div>'}</div>`;
}
async function adminUsers(qv, sort) {
  const d = await api(`api/admin/users?q=${encodeURIComponent(qv)}&sort=${sort}`);
  $('main').innerHTML = `<form id="us" class="row" style="gap:8px"><input type="text" id="uq" value="${esc(qv)}" placeholder="ค้นหา รหัส MR… / ชื่อ / อีเมล" aria-label="ค้นหาผู้ใช้"><button class="btn sm" type="submit">ค้นหา</button></form>
    <div class="chips">${[['new', 'ใหม่สุด'], ['active', 'เข้าใช้ล่าสุด'], ['paid', 'จ่ายเยอะสุด'], ['stars', 'ดาวเยอะสุด']].map(([k, l]) => `<a class="chip" href="#admin?t=users&sort=${k}&q=${encodeURIComponent(qv)}" aria-pressed="${k === sort}" style="text-decoration:none">${l}</a>`).join('')}</div>
    <div class="list">${d.items.map((u) => `<a href="#admin?t=users&u=${u.id}" style="display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit">
      ${u.avatar ? `<img src="${esc(u.avatar)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover">` : '<span style="width:40px;height:40px;border-radius:50%;background:var(--s2);display:inline-block"></span>'}
      <span style="flex:1;min-width:0"><b>${esc(u.name || '-')}</b> <span class="muted">${esc(u.id)}</span>${u.admin ? ' <span class="badge b-lime">แอดมิน</span>' : ''}${u.banned ? ' <span class="badge b-warn">ระงับ</span>' : ''}<br>
      <span class="muted">⭐${num(u.stars)} · ${num(u.works)} งาน · จ่าย ฿${num(u.paid)} · ${esc(u.providers)}</span></span><span aria-hidden="true">›</span></a>`).join('') || '<div class="muted">ไม่พบ</div>'}</div>`;
  $('#us').onsubmit = (e) => { e.preventDefault(); go(`admin?t=users&sort=${sort}&q=${encodeURIComponent($('#uq').value.trim())}`); };
}
async function adminUser(pid) {
  const d = await api('api/admin/users/' + encodeURIComponent(pid));
  const u = d.user;
  $('main').innerHTML = `<a href="#admin?t=users" style="font-size:14px">‹ รายชื่อผู้ใช้</a>
    <section class="card"><div class="row" style="gap:12px">${u.avatar ? `<img src="${esc(u.avatar)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover">` : ''}
      <span><b style="font-size:18px">${esc(u.name || '-')}</b><br><span class="muted">${esc(u.id)} · ${esc(u.email || '')} · ${esc(u.providers)}</span></span></div>
      <span class="muted">สมัคร ${new Date(u.createdAt).toLocaleDateString('th-TH')} · เข้าล่าสุด ${new Date(u.lastLogin).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      <div class="grid2">${kpi('ดาวคงเหลือ', num(u.stars))}${kpi('จ่ายแล้ว', '฿' + num(u.paid), `${num(u.works)} งาน`)}</div></section>
    <section class="card"><b>เพิ่ม / หักดาว</b>
      <div class="grid2"><label class="f" for="sd">จำนวน (ติดลบ = หัก)<input id="sd" type="number" step="1" placeholder="เช่น 50 หรือ -20"></label>
      <label class="f" for="sn">เหตุผล<input id="sn" type="text" maxlength="120" placeholder="ชดเชยงานเสีย / โปรโมชัน"></label></div>
      <button type="button" class="btn" id="sgo">บันทึก</button></section>
    ${u.admin ? '' : `<button type="button" class="btn ${u.banned ? '' : 'ghost'}" id="ban" style="width:100%">${u.banned ? 'ยกเลิกระงับบัญชี' : 'ระงับบัญชีนี้'}</button>`}
    <h2>ประวัติดาว</h2><div class="list">${d.ledger.map((x) => `<div><span><b>${esc(x.note || x.kind)}</b><br><span class="muted">${esc(x.kind)} · ${new Date(x.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span></span>
      <b class="num" style="color:${x.delta >= 0 ? 'var(--ok)' : 'var(--bad)'}">${x.delta >= 0 ? '+' : '−'}${num(Math.abs(x.delta))}</b></div>`).join('') || '<div class="muted">ไม่มี</div>'}</div>
    <h2>ผลงานล่าสุด</h2><div class="list">${d.works.map((w) => `<div><span><b>${esc(w.title || w.style)}</b><br><span class="muted">#${w.id} · ${esc(w.style)} · ${w.cost} ดาว · ${new Date(w.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>${w.error ? `<br><span class="muted" style="color:var(--bad)">${esc(w.error)}</span>` : ''}</span>
      <span class="badge ${w.status === 'done' ? 'b-ok' : w.status === 'failed' ? 'b-warn' : 'b-lime'}">${esc(w.status)}</span></div>`).join('') || '<div class="muted">ไม่มี</div>'}</div>`;
  $('#sgo').onclick = async () => {
    const delta = Number($('#sd').value); const note = $('#sn').value.trim();
    if (!delta || !note) return toast('ใส่จำนวนและเหตุผล');
    if (!confirm(`${delta > 0 ? 'เพิ่ม' : 'หัก'} ${Math.abs(delta)} ดาว ให้ ${u.name}?`)) return;
    try { const r = await api(`api/admin/users/${u.id}/stars`, { method: 'POST', body: { delta, note } }); toast(`บันทึกแล้ว คงเหลือ ${num(r.stars)} ดาว`); adminUser(pid); } catch (e) { toast(e.message); }
  };
  const bb = $('#ban'); if (bb) bb.onclick = async () => {
    if (!confirm(u.banned ? 'ยกเลิกการระงับ?' : 'ระงับบัญชีนี้? ผู้ใช้จะใช้งานไม่ได้และแผนอัตโนมัติจะหยุด')) return;
    try { await api(`api/admin/users/${u.id}/ban`, { method: 'POST', body: { banned: !u.banned } }); toast('บันทึกแล้ว'); adminUser(pid); } catch (e) { toast(e.message); }
  };
}
async function adminWorks(st) {
  const d = await api('api/admin/works?status=' + st);
  $('main').innerHTML = `<div class="chips">${[['failed', 'ล้มเหลว'], ['working', 'กำลังทำ'], ['queued', 'รอคิว'], ['review', 'รอตรวจซับ'], ['done', 'สำเร็จ']].map(([k, l]) => `<a class="chip" href="#admin?t=works&s=${k}" aria-pressed="${k === st}" style="text-decoration:none">${l}</a>`).join('')}</div>
    ${st === 'failed' && d.errors.length ? `<section class="card"><b>สาเหตุที่พบบ่อย 7 วัน</b>${d.errors.map((x) => `<span class="muted">${num(x.n)}× ${esc(x.e || '(ไม่ระบุ)')}</span>`).join('')}</section>` : ''}
    <div class="list">${d.items.map((w) => `<a href="#admin?t=users&u=${esc(w.public_id)}" style="text-decoration:none;color:inherit;display:block"><b>#${w.id} ${esc(w.title || w.style)}</b><br>
      <span class="muted">${esc(w.name)} (${esc(w.public_id)}) · ${esc(w.style)} · ${w.cost} ดาว${w.status === 'failed' ? (w.refunded ? ' · คืนดาวแล้ว ✓' : w.cost ? ' · ยังไม่คืนดาว' : '') : ''}</span><br>
      <span class="muted">${new Date(w.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}${w.done_at ? ' → ' + new Date(w.done_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      ${w.error ? `<br><span style="color:var(--bad);font-size:14px;overflow-wrap:anywhere">${esc(w.error)}</span>` : ''}${w.fail_detail ? `<br><span class="muted" style="font-size:12px;overflow-wrap:anywhere">สาเหตุจากระบบ: ${esc(w.fail_detail)}</span>` : ''}${w.cost_usd ? `<br><span class="muted" style="font-size:12px">ต้นทุน AI โดยประมาณ $${esc(w.cost_usd)} (~${Math.round(Number(w.cost_usd) * 35)} บาท)</span>` : ''}</a>`).join('') || '<div class="muted">ไม่มีรายการ</div>'}</div>`;
}
const thb = (n, d = 0) => `฿${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)}%`);
const tbl = (head, rows) => `<div style="overflow-x:auto"><table class="tbl"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="muted">ยังไม่มีข้อมูล</td></tr>`}</tbody></table></div>`;
async function adminCosts(days) {
  const d = await api(`api/admin/costs?days=${days}`);
  if (!CAT) CAT = await api('api/create/catalog').catch(() => null);
  const T = { gemini: 'Gemini', fal: 'fal', heygen: 'HeyGen', elevenlabs: 'ElevenLabs', hostinger: 'Hostinger', domain: 'โดเมน', other: 'อื่นๆ' };
  const mx = Math.max(1, ...d.daily.map((x) => Math.max(x.stars * d.thbPerStar, x.usd * d.fx)));
  const aiTot = Math.max(1e-9, d.cost.aiThb);
  $('main').innerHTML = `
    <div class="chips">${[7, 30, 90].map((n) => `<a class="chip" href="#admin?t=costs&d=${n}" aria-pressed="${n === days}">${n} วัน</a>`).join('')}</div>
    <span class="muted" style="font-size:13px">${d.meterSince ? `เริ่มวัดต้นทุนจริงทุกครั้งที่เรียก AI ตั้งแต่ ${new Date(d.meterSince).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}` : 'ยังไม่มีการเรียก AI ที่วัดได้ — ตัวเลขต้นทุนจะเริ่มขึ้นหลังอัปเดตนี้'} · 1 ดาว ≈ ${thb(d.thbPerStar, 2)} (ราคาขายเฉลี่ยรวมโบนัส) · $1 = ${d.fx} บาท</span>
    <div class="grid2">
      ${kpi('รายได้ (มูลค่าดาวที่ลูกค้าใช้)', thb(d.revenue.earned), `${num(d.revenue.starsSpent)} ดาว`)}
      ${kpi('ต้นทุน AI ที่วัดได้', thb(d.cost.aiThb, 2), `${num(d.cost.calls)} ครั้ง`)}
      ${kpi('กำไรขั้นต้น', thb(d.revenue.earned - d.cost.aiThb), `อัตรากำไร ${pct(d.profit.margin)}`)}
      ${kpi('ค่าใช้จ่ายประจำ (VPS ฯลฯ)', thb(d.cost.fixedThb), 'จากที่บันทึกด้านล่าง')}
      ${kpi('กำไรสุทธิ', thb(d.profit.earned), 'รายได้ − AI − ค่าประจำ')}
      ${kpi('เงินเข้า (เติมดาว)', thb(d.revenue.cashIn), `${num(d.revenue.topups)} ครั้ง · ${num(d.revenue.starsSold)} ดาว`)}
      ${kpi('ดาวแจกฟรี', num(d.revenue.starsGiven), 'โบนัส/แนะนำเพื่อน/แอดมิน')}
      ${kpi('ดาวค้างในบัญชีลูกค้า', num(d.revenue.starsOutstanding), `≈ ${thb(d.revenue.starsOutstanding * d.thbPerStar)} ที่ต้องให้บริการ`)}
    </div>
    ${d.cost.failedWorks ? `<div class="card" style="padding:10px 12px"><b>งานล้มที่เสียค่า AI ไปแล้ว: ${thb(d.cost.failedThb, 2)}</b><span class="muted" style="font-size:13px">${d.cost.failedWorks} งาน (คืนดาวลูกค้าแล้ว แต่ผู้ให้บริการคิดเงินเรา)</span></div>` : ''}
    <h2>รายวัน (เขียว = รายได้ · แดง = ต้นทุน AI)</h2>
    <div class="card" style="padding:10px;gap:4px">${d.daily.slice(-31).map((x) => `<div style="display:grid;grid-template-columns:44px 1fr 92px;gap:6px;align-items:center;font-size:12px"><span class="muted">${x.d}</span>
      <span style="display:grid;gap:2px"><i style="display:block;height:6px;border-radius:3px;background:var(--ok,#5cb85c);width:${(x.stars * d.thbPerStar / mx) * 100}%"></i><i style="display:block;height:6px;border-radius:3px;background:var(--bad);width:${(x.usd * d.fx / mx) * 100}%"></i></span>
      <span class="num" style="text-align:right">${thb(x.stars * d.thbPerStar)} / ${thb(x.usd * d.fx, 1)}</span></div>`).join('')}</div>
    <h2>ต้นทุนแยกเครื่องมือ</h2>
    ${tbl(['เครื่องมือ', 'ต้นทุน', 'สัดส่วน', 'ครั้ง'], d.byProvider.map((r) => `<tr><td>${esc(r.label)}</td><td class="num">${thb(r.thb, 2)}</td><td>${pct(r.thb / aiTot)}</td><td class="num">${num(r.n)}</td></tr>`))}
    <h2>ต้นทุนแยกที่มา</h2>
    ${tbl(['ที่มา', 'ต้นทุน', 'สัดส่วน'], d.bySrc.map((r) => `<tr><td>${esc(r.cat)}</td><td class="num">${thb(r.thb, 2)}</td><td>${pct(r.thb / aiTot)}</td></tr>`))}
    <h2>โมเดลที่ใช้เงินมากสุด</h2>
    ${tbl(['โมเดล', 'ใช้', 'ต้นทุน'], d.byModel.map((r) => `<tr><td>${esc(r.model)}<br><span class="muted" style="font-size:11px">${esc(r.provider)} · ${esc(r.op)}</span></td><td class="num">${num(Math.round(r.units))} ${esc(r.unit)}</td><td class="num">${thb(r.thb, 2)}</td></tr>`))}
    <h2>ต่อแนวงาน: ดาวที่เก็บ vs ต้นทุนจริง vs ประมาณการเดิม</h2>
    ${tbl(['แนวงาน', 'งาน', 'ดาวเฉลี่ย', 'ต้นทุนจริง/งาน', 'ประมาณการเดิม', 'กำไร'], d.styles.map((r) => `<tr><td>${esc(styleName(r.style) || r.style)}<br><span class="muted" style="font-size:11px">${esc(r.kind)} · ${esc(r.tier || '')}</span></td><td class="num">${r.n}${r.measured < r.n ? `<br><span class="muted" style="font-size:11px">วัดแล้ว ${r.measured}</span>` : ''}</td><td class="num">${r.avgStars.toFixed(0)}</td><td class="num">${r.avgThb == null ? '–' : thb(r.avgThb, 2)}</td><td class="num">${r.estThb == null ? '–' : thb(r.estThb, 2)}</td><td style="color:${r.margin != null && r.margin < 0.3 ? 'var(--bad)' : 'inherit'}">${pct(r.margin)}</td></tr>`))}
    <h2>เงินที่จ่ายจริง vs ที่ระบบวัดได้ (ทั้งหมด)</h2>
    <span class="muted" style="font-size:13px">ส่วนต่าง = ค่าใช้จ่ายก่อนเริ่มวัด หรือราคาในตารางไม่ตรงบิล (ปรับได้ที่ "ตารางราคา") · Gemini บัญชีบิลเดียวกันใช้ร่วมกับ n8n</span>
    ${tbl(['เครื่องมือ', 'จ่ายจริง', 'วัดได้', `ใน ${days} วัน`], d.tools.filter((t) => t.paidAll || t.meterAll).map((t) => `<tr><td>${esc(t.label)}</td><td class="num">${thb(t.paidAll)}</td><td class="num">${t.meterAll == null ? '–' : thb(t.meterAll, 2)}</td><td class="num">${thb(t.paidRange)}</td></tr>`))}
    <h2>บันทึกเงินที่จ่ายให้เครื่องมือ</h2>
    <form id="payf" class="card" style="gap:8px">
      <div class="grid2"><label>วันที่<input type="date" name="paidOn" value="${new Date().toISOString().slice(0, 10)}"></label>
      <label>เครื่องมือ<select name="tool">${Object.entries(T).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label>จำนวน<input name="amount" inputmode="decimal" placeholder="600"></label>
      <label>สกุล<select name="currency"><option>THB</option><option>USD</option></select></label></div>
      <label>ประเภท<select name="kind"><option value="credit">เติมเครดิต (จ่ายตามใช้)</option><option value="fixed">ค่าบริการประจำ (VPS/แพ็กเกจรายเดือน)</option></select></label>
      <label>หมายเหตุ<input name="note" maxlength="120" placeholder="เช่น เติม AI Studio"></label>
      <button class="btn">บันทึก</button></form>
    <div class="list">${d.payments.map((p) => `<div><span><b>${esc(T[p.tool] || p.tool)} · ${p.currency === 'USD' ? `$${p.amount}` : thb(p.amount, 2)}</b><br><span class="muted">${new Date(p.paid_on).toLocaleDateString('th-TH')} · ${p.kind === 'fixed' ? 'ค่าประจำ' : 'เติมเครดิต'}${p.note ? ` · ${esc(p.note)}` : ''}</span></span><button type="button" class="btn ghost sm" data-pdel="${p.id}">ลบ</button></div>`).join('')}</div>
    <h2>ตารางราคา (USD) ที่ใช้คำนวณ</h2>
    <span class="muted" style="font-size:13px">ปรับให้ตรงบิลจริงได้ · ข้อความ: ต่อ 1 ล้าน token · ภาพ: ต่อภาพ · fal: ต่อวินาที · omniClip: ต่อคลิป</span>
    <textarea id="prj" rows="10" style="font-family:monospace;font-size:12px">${esc(JSON.stringify((await api('api/admin/costs/prices')).prices, null, 1))}</textarea>
    <div class="grid2"><button type="button" class="btn dark" id="prsave">บันทึกราคา</button><button type="button" class="btn ghost" id="prreset">คืนค่าเริ่มต้น</button></div>`;
  $('#payf').onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); try { await api('api/admin/costs/payments', { method: 'POST', body: f }); toast('บันทึกแล้ว'); adminCosts(days); } catch (x) { toast(x.message); } };
  app.querySelectorAll('[data-pdel]').forEach((b) => b.onclick = async () => { await api(`api/admin/costs/payments/${b.dataset.pdel}`, { method: 'DELETE' }); adminCosts(days); });
  $('#prsave').onclick = async () => { let o; try { o = JSON.parse($('#prj').value); } catch { return toast('รูปแบบไม่ถูกต้อง'); } try { await api('api/admin/costs/prices', { method: 'PUT', body: o }); toast('บันทึกราคาแล้ว'); } catch (x) { toast(x.message); } };
  $('#prreset').onclick = async () => { const { defaults } = await api('api/admin/costs/prices'); $('#prj').value = JSON.stringify(defaults, null, 1); toast('กด "บันทึกราคา" เพื่อยืนยัน'); };
}
async function adminPrices() {
  const d = await api('api/admin/prices');
  const p = d.prices, df = d.defaults;
  const inp = (id, v, def, label) => `<label class="f" for="${id}">${label}<input id="${id}" type="number" min="1" max="500" step="1" value="${v}"><span class="muted" style="font-size:12px">ค่าเดิม ${def}</span></label>`;
  $('main').innerHTML = `<section class="card"><b>ราคาภาพ (ดาว/ภาพ)</b><div class="grid2">${Object.keys(p.tiers).map((k) => inp('t_' + k, p.tiers[k], df.tiers[k], esc(d.labels.tiers[k] || k))).join('')}</div></section>
    <section class="card"><b>คลิปทั่วไป (ดาว/คลิป)</b><div class="grid2">${Object.keys(p.video).map((k) => inp('v_' + k, p.video[k], df.video[k], `${k} วินาที`)).join('')}${inp('pv', p.premiumVoice, df.premiumVoice, 'บวกเสียงพรีเมียม')}</div></section>
    <section class="card"><b>ละครสั้น (ดาว/เรื่อง)</b><div class="grid2">${Object.keys(p.drama).map((k) => inp('d_' + k, p.drama[k], df.drama[k], `${k} ฉาก`)).join('')}</div></section>
    ${p.series ? `<section class="card"><b>ซีรีส์แนวตั้ง (ดาว/ตอน)</b><div class="grid2">${Object.keys(p.series).map((k) => inp('sr_' + k, p.series[k], df.series[k], `${k} ฉาก`)).join('')}</div></section>` : ''}
    ${p.filmStd ? `<section class="card"><b>หนังสั้นแนวตั้ง (ดาว/ตอน)</b><span class="muted" style="font-size:12px">ต้นทุนต่อตอน 30 วิ (ประมาณ): มาตรฐาน ~$1.6 ≈ 56 บาท · คุณภาพสูง ~$3.8 ≈ 135 บาท · หนังโรง Seedance ~$5 ≈ 175 บาท (ผ่าน OpenRouter Flash · ผ่าน fal ~$13) (60 วิ และ 90 วิ คูณ 2 และ 3)</span><div class="grid2">${Object.keys(p.filmStd).map((k) => inp('fs_' + k, p.filmStd[k], df.filmStd[k], `มาตรฐาน ${k} วิ`)).join('')}${Object.keys(p.filmPro).map((k) => inp('fp_' + k, p.filmPro[k], df.filmPro[k], `คุณภาพสูง ${k} วิ`)).join('')}${Object.keys(p.filmCine || {}).map((k) => inp('fc_' + k, p.filmCine[k], df.filmCine?.[k] ?? p.filmCine[k], `หนังโรง ${k} วิ`)).join('')}</div></section>` : ''}
    ${p.avatar ? `<section class="card"><b>วิดีโออวตาร (ดาว/คลิป)</b><span class="muted" style="font-size:12px">ต้นทุน: มาตรฐาน (Kling) ~$0.84/นาที ≈ 30 บาท + ท่าทางฐาน ~15 บาท/อวตาร (ครั้งเดียว) · พรีเมียม (HeyGen) ~$3/นาที ≈ 105 บาท · ออกแบบภาพ ~2 บาท/ครั้ง</span><div class="grid2">${Object.keys(p.avatar).map((k) => inp('av_' + k, p.avatar[k], df.avatar[k], `มาตรฐาน ${k} วิ`)).join('')}${Object.keys(p.avatarPro || {}).map((k) => inp('avp_' + k, p.avatarPro[k], df.avatarPro[k], `พรีเมียม ${k} วิ`)).join('')}${inp('avd_std', p.avatarDesign.std, df.avatarDesign.std, 'ออกแบบอวตาร/ครั้ง')}</div></section>` : ''}
    ${p.motion ? `<section class="card"><b>คลิป AI ภาพเคลื่อนไหวจริง (ดาว/คลิป)</b><span class="muted" style="font-size:12px">ต้นทุน Omni Flash ราว $0.10/วิ (720p) ≈ 35 บาท/คลิป 10 วิ</span><div class="grid2">${inp('mo_std', p.motion.std, df.motion.std, '~10 วิ 720p')}</div></section>` : ''}
    <p class="muted" style="font-size:13px">มีผลทันทีกับงานใหม่ งานที่สั่งไปแล้วไม่เปลี่ยน · ราคาต้นทุน+80% คำนวณไว้แล้วในค่าเดิม</p>
    <div class="grid2"><button type="button" class="btn ghost" id="preset">คืนค่าเดิม</button><button type="button" class="btn" id="psave">บันทึกราคา</button></div>`;
  const val = (id) => Number($('#' + id).value);
  $('#psave').onclick = async () => {
    const body = { tiers: Object.fromEntries(Object.keys(p.tiers).map((k) => [k, val('t_' + k)])), video: Object.fromEntries(Object.keys(p.video).map((k) => [k, val('v_' + k)])),
      drama: Object.fromEntries(Object.keys(p.drama).map((k) => [k, val('d_' + k)])), premiumVoice: val('pv'),
      ...(p.series ? { series: Object.fromEntries(Object.keys(p.series).map((k) => [k, val('sr_' + k)])) } : {}), ...(p.motion ? { motion: { std: val('mo_std') } } : {}), ...(p.avatar ? { avatar: Object.fromEntries(Object.keys(p.avatar).map((k) => [k, val('av_' + k)])), avatarPro: Object.fromEntries(Object.keys(p.avatarPro || {}).map((k) => [k, val('avp_' + k)])), avatarDesign: { std: val('avd_std') } } : {}), ...(p.filmStd ? { filmStd: Object.fromEntries(Object.keys(p.filmStd).map((k) => [k, val('fs_' + k)])), filmPro: Object.fromEntries(Object.keys(p.filmPro).map((k) => [k, val('fp_' + k)])), ...(p.filmCine ? { filmCine: Object.fromEntries(Object.keys(p.filmCine).map((k) => [k, val('fc_' + k)])) } : {}) } : {}) };
    try { await api('api/admin/prices', { method: 'PUT', body }); CAT = null; toast('บันทึกราคาแล้ว'); adminPrices(); } catch (e) { toast(e.message); }
  };
  $('#preset').onclick = async () => { if (!confirm('คืนราคาทั้งหมดเป็นค่าเดิม?')) return; await api('api/admin/prices', { method: 'PUT', body: { reset: true } }); CAT = null; toast('คืนค่าแล้ว'); adminPrices(); };
}
async function adminTrends() {
  const d = await api('api/admin/trends');
  const row = (t) => `<section class="card" data-id="${t ? t.id : 'new'}">
    <div class="grid2"><label class="f">ชื่อ<input type="text" name="title" maxlength="60" value="${esc(t?.title || '')}"></label>
    <label class="f">รหัสแนว<input type="text" name="style" maxlength="40" value="${esc(t?.style || '')}" placeholder="v_mystery"></label>
    <label class="f">ประเภท<select name="kind"><option value="video" ${t?.kind !== 'image' ? 'selected' : ''}>คลิป</option><option value="image" ${t?.kind === 'image' ? 'selected' : ''}>ภาพ</option></select></label>
    <label class="f">ป้ายราคา<input type="text" name="price" maxlength="30" value="${esc(t?.price || '')}" placeholder="เริ่ม 12 ดาว"></label>
    <label class="f">ป้ายมุม<input type="text" name="badge" maxlength="20" value="${esc(t?.badge || '')}" placeholder="ฮิต"></label>
    <label class="f">ลำดับ<input type="number" name="sort" step="1" value="${t?.sort ?? 0}"></label></div>
    <label class="f">แท็กจับคู่ความสนใจ (คั่นด้วย ,)<input type="text" name="tags" value="${esc((t?.tags || []).join(', '))}"></label>
    <div class="row" style="gap:8px;flex-wrap:wrap">${t ? `<label class="row" style="gap:6px"><input type="checkbox" class="sw-in" name="active" ${t.active ? 'checked' : ''}>แสดง</label>` : ''}
      <input type="color" name="color" value="${esc(t?.color || '#333333')}" aria-label="สี" style="width:44px;height:36px;padding:0;border:0;background:none">
      <button type="button" class="btn sm" data-save>${t ? 'บันทึก' : '+ เพิ่ม'}</button>${t ? '<button type="button" class="btn ghost sm" data-del>ลบ</button>' : ''}</div>
    ${t ? `<div class="row" style="gap:10px;align-items:center">${t.sample?.poster ? `<img src="${t.sample.poster}" alt="" style="width:48px;height:64px;object-fit:cover;border-radius:8px">` : ''}
      <span class="muted" style="flex:1;font-size:13px">ตัวอย่าง: ${({ done: '✓ พร้อมแล้ว', queued: 'รอคิวสร้าง', photo: 'กำลังสร้างรูปสินค้า…', render: 'กำลังสร้างตัวอย่าง…', failed: `✗ ไม่สำเร็จ ${esc(t.sample?.error || '')}` })[t.sample?.status] || 'ยังไม่มี (ระบบจะสร้างให้อัตโนมัติ)'}</span>
      <button type="button" class="btn dark sm" data-smp>${t.sample?.has ? 'สร้างใหม่' : 'สร้างตัวอย่าง'}</button></div>` : ''}</section>`;
  const ss = await api('api/admin/style-samples').catch(() => ({ items: [] }));
  const ST = { done: '✓', render: 'กำลังสร้าง…', photo: 'สร้างรูปสินค้า…', queued: 'รอคิว', failed: '✗ ไม่สำเร็จ', none: 'รอสร้างอัตโนมัติ', trend: 'ใช้ตัวอย่างจากการ์ดแนวงานฮิต', manual: 'รออัปโหลด / เลือกจากผลงาน' };
  $('main').innerHTML = `<p class="muted">การ์ดเทรนด์หน้าแรก เรียงตามลำดับ แสดงตามความสนใจของลูกค้า</p>${row(null)}${d.items.map(row).join('')}
    <h2>ตัวอย่างทุกแนวงาน (ขั้นเลือกแนวงาน)</h2>
    <label class="card" style="flex-direction:row;align-items:center;gap:10px;padding:10px 12px"><input type="checkbox" id="ssauto" ${ss.auto ? 'checked' : ''} style="width:22px;height:22px"><span><b>สร้างตัวอย่างอัตโนมัติ</b><br><span class="muted" style="font-size:12px">ปิดไว้ = ไม่ใช้เครดิต AI เพิ่ม · ยังกด "สร้างใหม่" ทีละแนวได้</span></span></label><span class="muted" style="font-size:13px">ระบบสร้างให้อัตโนมัติทีละแบบ ไม่ตัดดาว · หนังสั้น/อวตาร/ใส่ซับคลิป ใช้ของจริง: อัปโหลดคลิป หรือใส่เลขผลงานที่ทำได้ดี</span>
    ${[['image', 'แนวงานภาพ'], ['video', 'แนวคลิป']].map(([k, t]) => `<h2 style="font-size:16px">${t}</h2><div class="grid3">${ss.items.filter((x) => x.kind === k).map((x) => `<div class="card" style="padding:8px;gap:6px">${x.src ? `<img src="${x.src}" alt="" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:10px">` : x.play ? `<video src="${x.play}#t=0.6" muted playsinline preload="metadata" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:10px;background:#000"></video>` : '<div style="aspect-ratio:4/5;border-radius:10px;background:var(--s2)"></div>'}
      <span style="font-size:12px">${esc(x.label || x.style)}</span><span class="muted" style="font-size:11px">${ST[x.status] || x.status}${x.error ? ` ${esc(x.error)}` : ''}</span>
      ${x.manual ? '' : `<button type="button" class="btn dark sm" data-ssr="${esc(x.style)}" style="min-height:32px">สร้างใหม่</button>`}
      <label class="btn ghost sm" style="min-height:32px">อัปโหลด<input type="file" accept="${k === 'video' ? 'video/*' : 'image/*'}" data-ssu="${esc(x.style)}" hidden></label>
      <button type="button" class="btn ghost sm" data-ssw="${esc(x.style)}" style="min-height:32px">จากผลงาน #</button></div>`).join('')}</div>`).join('')}`;
  app.querySelectorAll('[data-ssr]').forEach((b) => b.onclick = async () => { try { await api(`api/admin/style-samples/${b.dataset.ssr}`, { method: 'POST', body: {} }); toast('เข้าคิวแล้ว'); adminTrends(); } catch (e) { toast(e.message); } });
  if ($('#ssauto')) $('#ssauto').onchange = (e) => api('api/admin/style-samples/auto', { method: 'PUT', body: { on: e.target.checked } }).then(() => toast(e.target.checked ? 'เปิดสร้างอัตโนมัติ' : 'ปิดสร้างอัตโนมัติแล้ว')).catch((x) => toast(x.message));
  app.querySelectorAll('[data-ssu]').forEach((i) => i.onchange = async () => { const f = i.files[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); toast('กำลังอัปโหลด…'); try { await api(`api/admin/style-samples/${i.dataset.ssu}/upload`, { method: 'POST', body: fd }); toast('ตั้งเป็นตัวอย่างแล้ว'); adminTrends(); } catch (e) { toast(e.message); } });
  app.querySelectorAll('[data-ssw]').forEach((b) => b.onclick = async () => { const id = prompt('เลขผลงาน (ดูได้จากลิงก์ #work?id=...)'); if (!id) return; try { await api(`api/admin/style-samples/${b.dataset.ssw}/from-work`, { method: 'POST', body: { workId: Number(id) } }); toast('ตั้งเป็นตัวอย่างแล้ว'); adminTrends(); } catch (e) { toast(e.message); } });
  app.querySelectorAll('[data-id]').forEach((card) => {
    const get = () => { const o = {}; card.querySelectorAll('[name]').forEach((i) => { o[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); return o; };
    const id = card.dataset.id;
    card.querySelector('[data-save]').onclick = async () => {
      try { await api(id === 'new' ? 'api/admin/trends' : `api/admin/trends/${id}`, { method: id === 'new' ? 'POST' : 'PATCH', body: get() }); toast('บันทึกแล้ว'); adminTrends(); } catch (e) { toast(e.message); }
    };
    const del = card.querySelector('[data-del]'); if (del) del.onclick = async () => { if (!confirm('ลบเทรนด์นี้?')) return; await api(`api/admin/trends/${id}`, { method: 'DELETE' }); adminTrends(); };
    const smp = card.querySelector('[data-smp]'); if (smp) smp.onclick = async () => { try { await api(`api/admin/trends/${id}/sample`, { method: 'POST', body: {} }); toast('เข้าคิวสร้างตัวอย่างแล้ว (คลิปใช้เวลา 3–10 นาที)'); adminTrends(); } catch (e) { toast(e.message); } };
  });
}
async function adminTopups(status = 'review') {
  $('main').innerHTML = `
    <div class="chips">${[['review', 'รอตรวจ'], ['paid', 'สำเร็จ'], ['rejected', 'ไม่ผ่าน']].map(([k, l]) => `<button type="button" class="chip" data-s="${k}" aria-pressed="${k === status}">${l}</button>`).join('')}</div>
    <div id="sum" class="muted"></div><div id="list" style="display:flex;flex-direction:column;gap:12px">${LOAD()}</div>`;
  app.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => adminTopups(b.dataset.s));
  const d = await api('api/admin/topups?status=' + status);
  $('#sum').textContent = `เดือนนี้เติมสำเร็จ ${num(d.month.n)} รายการ · ฿${num(d.month.total)}`;
  $('#list').innerHTML = d.items.map((t) => `<section class="card">
    <div class="row between"><b class="num">฿${num(t.amount)} · ${num(t.stars)} ดาว</b><span class="muted">${esc(t.user)} · ${esc(t.userId)}</span></div>
    <span class="muted">${new Date(t.createdAt).toLocaleString('th-TH')} · ${esc(t.reason || '')}${t.note ? ' · หมายเหตุ: ' + esc(t.note) : ''}</span>
    ${t.slipData?.amount ? `<span class="muted">สลิป: ฿${esc(t.slipData.amount)} · ผู้รับ ${esc(t.slipData.receiver)} · ผู้โอน ${esc(t.slipData.sender)} · ${esc(t.slipData.transRef || '')}</span>` : ''}
    ${t.slip ? `<a href="${t.slip}" target="_blank" rel="noopener"><img src="${t.slip}" alt="สลิป" style="max-width:100%;max-height:360px;border-radius:10px"></a>` : '<span class="muted">ไม่มีสลิป</span>'}
    ${status === 'review' ? `<div class="grid2"><button type="button" class="btn" data-ok="${t.id}">อนุมัติ เติมดาว</button><button type="button" class="btn ghost" data-no="${t.id}">ไม่ผ่าน</button></div>` : ''}
  </section>`).join('') || '<p class="muted">ไม่มีรายการ</p>';
  app.querySelectorAll('[data-ok]').forEach((b) => b.onclick = async () => { try { await api(`api/admin/topups/${b.dataset.ok}/approve`, { method: 'POST', body: {} }); toast('เติมดาวแล้ว'); adminTopups(status); } catch (e) { toast(e.message); } });
  app.querySelectorAll('[data-no]').forEach((b) => b.onclick = async () => { try { await api(`api/admin/topups/${b.dataset.no}/reject`, { method: 'POST', body: {} }); toast('ปฏิเสธแล้ว'); adminTopups(status); } catch (e) { toast(e.message); } });
}

async function starsView() {
  app.innerHTML = `${topbar('ประวัติดาว', 'profile')}<main><div class="list" id="h">${LOAD()}</div></main>${nav('profile')}`;
  const { items } = await api('api/stars/history');
  $('#h').innerHTML = items.map((x) => `<div><span><b>${esc(x.note || x.kind)}</b><br><span class="muted">${new Date(x.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
    <b class="num" style="color:${x.delta >= 0 ? 'var(--ok)' : 'var(--bad)'}">${x.delta >= 0 ? '+' : '−'}${num(Math.abs(x.delta))}</b></div>`).join('') || '<div class="muted">ยังไม่มีรายการ</div>';
}

// ---------- สร้างผลงาน (ภาพ) ----------
let CAT = null;
const themeNow = () => { try { const t = localStorage.getItem('mr_theme'); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; } };
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { if (t === 'auto') localStorage.removeItem('mr_theme'); else localStorage.setItem('mr_theme', t); } catch {}
  const light = t === 'light' || (t === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#F3F4F6' : '#15161B');
}
applyTheme(themeNow());
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => applyTheme(themeNow()));
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-theme-set]'); if (!b) return;
  applyTheme(b.dataset.themeSet);
  document.querySelectorAll('[data-theme-set]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});
let D = null;        // ร่างงานที่กำลังสร้าง
let REFS = [];       // ไฟล์ภาพอ้างอิง (อยู่ในหน่วยความจำ)
let REVS = [];       // แคปรีวิว (คลิป)
let VFILE = null;
let VFILES = []; // v_self หลายคลิป [{f, sec}] (VFILE = คลิปแรก)
let VOICEB = null; // เสียงที่ลูกค้าอัด (แกะคลิป)
let REC = { on: false, t: 0 };    // คลิปที่ถ่ายเอง
let ITEMF = [];      // รูปสินค้าแต่ละอันดับ (Top N)
// แนวข้อความตามประเภทงาน: [ข้อความหลัก, ข้อความรอง]
const TEXT_PRESETS = {
  model_show: [['ลุคนี้ต้องมี'], ['ใส่แล้วปัง', 'มั่นใจทุกลุค'], ['คอลเลกชันใหม่'], ['ใส่สบาย สวยทุกวัน']],
  agent_plan: [['คุ้มครองครบ จบในแผนเดียว'], ['ป่วยเมื่อไร ไม่ต้องกังวลค่ารักษา'], ['วางแผนวันนี้ อุ่นใจวันหน้า'], ['ปรึกษาฟรี', 'ไม่มีค่าใช้จ่าย']],
  agent_listing: [['ขายด่วน! บ้านพร้อมอยู่'], ['ให้เช่า พร้อมเข้าอยู่'], ['ทำเลดี ใกล้ทุกอย่าง'], ['ราคาดี ต่อรองได้']],
  agent_tips: [['รู้ก่อนทำประกัน'], ['4 เรื่องต้องรู้'], ['เช็กลิสต์ก่อนซื้อบ้าน'], ['เข้าใจง่ายใน 1 นาที']],
  agent_case: [['เคลมจริง จ่ายจริง'], ['เคสลูกค้าจริง'], ['ส่งมอบบ้านเรียบร้อย', 'ขอบคุณที่ไว้วางใจ'], ['ปิดดีลสำเร็จ']],
  agent_profile: [['ปรึกษาฟรี ไม่มีค่าใช้จ่าย'], ['ดูแลตลอดสัญญา'], ['ยินดีให้คำปรึกษา'], ['ตัวแทนที่คุณไว้ใจได้']],
  agent_compare: [['เช่า หรือ ซื้อ คุ้มกว่า?'], ['แผน A vs แผน B'], ['ซื้อสด หรือ ผ่อน?'], ['เลือกแบบไหนดี?']],
  poster_menu: [['เมนูใหม่! อร่อยต้องลอง'], ['เมนูแนะนำประจำร้าน'], ['จัดเต็ม คุ้มทุกจาน'], ['ร้อนๆ พร้อมเสิร์ฟ']],
  sale_banner: [['ลดแรง 50%', 'วันนี้วันเดียว'], ['ซื้อ 1 แถม 1'], ['ลดล้างสต๊อก', 'หมดแล้วหมดเลย'], ['ส่งฟรีทั่วไทย']],
  aff_cover: [['ของมันต้องมี!'], ['ใช้ดีบอกต่อ'], ['ราคานี้หายากแล้ว'], ['ป้ายยาด่วน!']],
  before_after: [['เห็นผลจริง'], ['ก่อน-หลังใช้'], ['เปลี่ยนไปเยอะมาก']],
  shop_news: [['เปิดใหม่!', 'ลดพิเศษสัปดาห์แรก'], ['เปิดสาขาใหม่'], ['ร้านหยุด 1 วัน', 'ขออภัยในความไม่สะดวก'], ['ย้ายร้านใหม่']],
  knowledge: [['รู้หรือไม่?'], ['5 เคล็ดลับ'], ['วิธีเลือกให้ดี'], ['ข้อควรรู้ก่อนซื้อ']],
  pr_announce: [['ประกาศ', 'แจ้งเพื่อทราบโดยทั่วกัน'], ['ประกาศหยุดทำการ', 'ขออภัยในความไม่สะดวก'], ['ขอเชิญประชุม', 'ขอเชิญผู้เกี่ยวข้องเข้าร่วมโดยพร้อมเพรียงกัน'], ['แจ้งเปลี่ยนแปลงเวลาทำการ']],
  pr_event: [['ขอเชิญร่วมงาน', 'เข้าร่วมฟรี ไม่มีค่าใช้จ่าย'], ['ขอเชิญร่วมกิจกรรม'], ['ขอเชิญเข้าร่วมโครงการ', 'ลงทะเบียนได้ตั้งแต่วันนี้'], ['ขอเชิญร่วมทำบุญ', 'ร่วมเป็นเจ้าภาพได้ที่']],
  pr_news: [['ข่าวประชาสัมพันธ์'], ['ภาพกิจกรรม'], ['ข่าวสารองค์กร'], ['บรรยากาศกิจกรรม']],
  pr_congrats: [['ขอแสดงความยินดี', 'ด้วยความยินดียิ่ง'], ['ขอแสดงความยินดีกับความสำเร็จ'], ['ขอบคุณที่ไว้วางใจ', 'ด้วยความขอบคุณอย่างสูง'], ['ยินดีต้อนรับ']],
  pr_hiring: [['รับสมัครงาน', 'หลายอัตรา'], ['เปิดรับสมัครด่วน'], ['ร่วมเป็นส่วนหนึ่งกับเรา'], ['รับสมัครพนักงาน', 'สวัสดิการดี']],
  pr_festival: [['สวัสดีปีใหม่', 'ขอให้มีความสุขตลอดปี'], ['สุขสันต์วันสงกรานต์'], ['สุขสันต์วันลอยกระทง'], ['สุขสันต์วันแม่'], ['เมอร์รี่คริสต์มาส']],
  pr_condolence: [['ขอแสดงความเสียใจอย่างสุดซึ้ง', 'ด้วยความอาลัยยิ่ง'], ['ขอน้อมไว้อาลัย', 'ขอให้ดวงวิญญาณสู่สุคติในสัมปรายภพ'], ['ขอร่วมแสดงความเสียใจกับครอบครัว', 'ด้วยความเคารพอย่างสูง'], ['ด้วยความอาลัยและระลึกถึง']],
};
let SAMPLES = null; // ภาพตัวอย่างของแต่ละแนวงาน
const STEPS = ['เป้าหมาย', 'แนวงาน', 'รายละเอียด', 'แคปชั่น', 'คุณภาพ', 'ทบทวน'];
const newDraft = () => ({ step: 0, goal: (ME.interests?.goals || []).includes('Affiliate') ? 'aff' : 'sell', link: '', kind: 'image', style: '', product: '', price: '', headline: '', details: '', concepts: [], ratio: '', useLogo: !!ME.brand?.logo, showShop: true, tone: '', hashtags: [...(ME.hashtags || [])], extraTags: '', tier: 'std', versions: 1, fromWork: 0, length: 30, voice: '', premiumVoice: false, formula: '', variant: 'random', music: 'auto', selfMode: 'subs', videoSec: 0, captionStyle: 'pop', hookText: '', keepAudio: true, genre: 'inlaw', art: 'cartoon3d', scenes: 4, plot: '', seriesFrom: 0, seriesInfo: null, preset: 'spin', modelWho: 'female', modelLook: 'clean', avatarId: 0, quality: 'std', lang: 'th', scriptMode: 'ai', script: '', subs: true, info: {}, count: 3, items: [{ name: '', price: '', note: '', link: '' }, { name: '', price: '', note: '', link: '' }, { name: '', price: '', note: '', link: '' }] });
const saveDraft = () => { try { sessionStorage.setItem('mr_draft', JSON.stringify(D)); } catch {} };
function loadDraft() { try { const d = JSON.parse(sessionStorage.getItem('mr_draft') || 'null'); if (d && typeof d === 'object') return { ...newDraft(), ...d }; } catch {} return null; }

async function createView(qs) {
  const params = new URLSearchParams(qs || '');
  if (!CAT) {
    app.innerHTML = `${topbar('สร้างผลงาน', 'home')}<main>${LOAD()}</main>${nav('create')}`;
    CAT = await api('api/create/catalog');
  }
  if (params.get('new') || !D) { D = loadDraft() && !params.get('new') ? loadDraft() : newDraft(); REFS = []; }
  if (params.get('new')) history.replaceState(null, '', '#create');
  if (params.get('style')) {
    const TV = { gift_box: 'v_gift', blind_box: 'v_mystery', before_after: 'v_sell' };
    const st = params.get('style');
    const s = params.get('kind') !== 'video' && CAT.styles.find((x) => x.id === st);
    REFS = []; REVS = [];
    const vs = CAT.video?.styles?.find((x) => x.id === (TV[st] || st));
    if (s) D = { ...newDraft(), style: s.id, ratio: s.ratio, step: 0 };
    else if (vs) D = { ...newDraft(), kind: 'video', style: vs.id, step: 0 };
    else { D = { ...newDraft(), kind: 'video' }; toast('คลิปละครสั้นจะเปิดเร็วๆ นี้ ลองแนวเปิดกล่องก่อนได้เลย'); }
    history.replaceState(null, '', '#create');
  }
  drawStep();
}

let LINKBUSY = false;
let REFBUSY = false;
let LINKIMG = null; // รูปจากลิงก์ (data URL) — ไม่เก็บลง draft เพราะใหญ่
const linkCard = () => {
  const L = D.linkInfo;
  if (LINKBUSY) return '<section class="card"><span class="muted">⏳ กำลังอ่านข้อมูลสินค้าจากลิงก์…</span></section>';
  if (!L || L.for !== D.link) return D.link && /^https?:\/\/\S+$/i.test(D.link) && ['aff', 'sell'].includes(D.goal) ? '<button type="button" class="btn dark sm" id="lkread">อ่านข้อมูลสินค้าจากลิงก์</button>' : '';
  if (L.error) return `<section class="card"><span class="muted">⚠️ ${esc(L.error)}</span><button type="button" class="btn dark sm" id="lkread">ลองอ่านอีกครั้ง</button></section>`;
  return `<section class="card" style="background:var(--acc-card);border-color:var(--acc-line)">
    <b>✅ อ่านข้อมูลจากลิงก์แล้ว${L.platform && L.platform !== 'web' ? ` (${esc(L.platform)})` : ''} · แก้ไขได้</b>
    <div class="row" style="gap:12px;align-items:flex-start">
      ${LINKIMG ? `<img src="${LINKIMG}" alt="รูปสินค้าจากลิงก์" style="width:84px;height:84px;object-fit:cover;border-radius:12px;flex:none;background:#fff">` : ''}
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0">
        <label class="f" for="lkname">ชื่อสินค้า<input id="lkname" type="text" maxlength="120" value="${esc(D.product)}"></label>
        ${L.price ? `<label class="f" for="lkprice">ราคา / โปร<input id="lkprice" type="text" maxlength="40" value="${esc(D.price)}"></label>` : ''}
      </div></div>
    ${L.details ? `<label class="f" for="lkdet">จุดเด่น (AI ใช้ต่อ)<textarea id="lkdet" rows="2" maxlength="600">${esc(D.details)}</textarea></label>` : ''}
    ${LINKIMG ? `<label class="row between" for="lkimg"><span>ใช้รูปนี้เป็นรูปสินค้า</span><input id="lkimg" type="checkbox" class="sw-in" ${D.useLinkImg !== false ? 'checked' : ''}></label>` : ''}
  </section>`;
};
function keepLinkCard() {
  const n = $('#lkname'); if (n) D.product = n.value.trim();
  const pr = $('#lkprice'); if (pr) D.price = pr.value.trim();
  const dt = $('#lkdet'); if (dt) D.details = dt.value.trim();
  const im = $('#lkimg'); if (im) D.useLinkImg = im.checked;
  // ใส่รูปจากลิงก์เป็นรูปสินค้า (ครั้งเดียว)
  if (LINKIMG && D.useLinkImg !== false && !REFS.some((f) => f.name === 'link-product.jpg')) {
    try { const b = atob(LINKIMG.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); REFS = [new File([u], 'link-product.jpg', { type: 'image/jpeg' }), ...REFS].slice(0, 8); } catch { /* */ }
  } else if (D.useLinkImg === false) REFS = REFS.filter((f) => f.name !== 'link-product.jpg');
}
async function readLink(force) {
  const link = D.link;
  if (!/^https?:\/\/\S+$/i.test(link || '') || LINKBUSY) return;
  if (!force && D.linkInfo?.for === link) return;
  LINKBUSY = true; const box = $('#lkbox'); if (box) box.innerHTML = linkCard();
  try {
    const r = await api('api/link/read', { method: 'POST', body: { url: link } });
    if (D.link !== link) return;
    LINKIMG = r.image || null;
    REFS = REFS.filter((f) => f.name !== 'link-product.jpg');
    if (r.product) D.product = r.product;
    if (r.price && !D.price) D.price = r.price;
    if (r.details && !D.details) D.details = r.details;
    D.linkInfo = { for: link, platform: r.platform, price: !!r.price, details: !!r.details };
  } catch (e) { D.linkInfo = { for: link, error: e.message }; LINKIMG = null; }
  finally { LINKBUSY = false; }
  if (D.step === 0 && location.hash.startsWith('#create')) { const b2 = $('#lkbox'); if (b2) { b2.innerHTML = linkCard(); bindLink(true); } }
}
function bindLink(onlyCard) {
  const go = () => { const v = $('#link')?.value.trim() || ''; D.link = v; if (['aff', 'sell'].includes(D.goal) && /^https?:\/\/\S+$/i.test(v)) readLink(); };
  const li = $('#link');
  if (li && !onlyCard) { li.addEventListener('change', go); li.addEventListener('paste', () => setTimeout(go, 50)); }
  const b = $('#lkread'); if (b) b.onclick = () => { D.link = $('#link').value.trim(); readLink(true); };
}
function stepShell(inner, { next = 'ถัดไป', nextId = 'next', disabled = false } = {}) {
  const s = D.step;
  app.innerHTML = `${topbar('สร้างผลงาน', 'home')}<main>
    <div class="row between"><span class="muted" style="font-weight:600">ขั้น ${s + 1}/${STEPS.length} · ${STEPS[s]}</span>
      <button type="button" class="chip" id="reset" style="min-height:34px;padding:4px 12px">เริ่มใหม่</button></div>
    <div class="steps" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>
    ${inner}
    <div class="grid2 stepnav">${s ? '<button type="button" class="btn dark" id="prev">ย้อนกลับ</button>' : '<span></span>'}
      <button type="button" class="btn" id="${nextId}" ${disabled ? 'disabled' : ''}>${next}</button></div>
  </main>${nav('create')}`;
  if (s) { const b = app.querySelector('header .back'); if (b) b.onclick = (e) => { e.preventDefault(); back(); }; }
  const back = () => { D.step = D.style === 'v_remix' && D.step === 5 ? 2 : D.step - 1; drawStep(); };
  const p = $('#prev'); if (p) p.onclick = back;
  $('#reset').onclick = () => { D = newDraft(); REFS = []; REVS = []; VFILE = null; VFILES = []; VOICEB = null; ITEMF = []; saveDraft(); drawStep(); };
}
// แนวงานที่ตรงกับเป้าหมาย (ไม่ปนหมวด) — ดูทั้งหมดได้จากปุ่ม "ดูแนวอื่นทั้งหมด"
function goalStyles(list) {
  const vid = D.kind === 'video';
  if (D.goal === 'agent') return ['ตัวแทน / นายหน้า', [...list.filter((x) => x.agent), ...list.filter((x) => x.id === 'v_avatar')]];
  if (D.goal === 'pr') return ['ประชาสัมพันธ์องค์กร', list.filter((x) => x.pr)];
  const biz = list.filter((x) => !x.pr && !x.agent);
  const label = { sell: 'โปรโมตสินค้า', aff: 'Affiliate', promo: 'โปรโมตร้าน', content: 'ทำคอนเทนต์' }[D.goal] || 'ขายของ / คอนเทนต์';
  return [`${vid ? 'คลิป' : 'ภาพ'}สำหรับ${label}`, biz];
}
const chipRow = (items, sel, key, multi) => `<div class="chips">${items.map((v) => {
  const id = typeof v === 'object' ? v.id : v; const label = typeof v === 'object' ? v.label : v;
  const on = multi ? sel.includes(id) : sel === id;
  return `<button type="button" class="chip" data-k="${key}" data-v="${esc(id)}" aria-pressed="${on}">${esc(label)}</button>`;
}).join('')}</div>`;
function bindChips(multi, onChange) {
  app.querySelectorAll('.chip[data-k]').forEach((b) => b.onclick = () => {
    const k = b.dataset.k, v = b.dataset.v;
    if (multi.includes(k)) { const a = D[k]; const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); b.setAttribute('aria-pressed', String(i < 0)); }
    else { D[k] = v; app.querySelectorAll(`.chip[data-k="${k}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
    saveDraft(); onChange?.(k);
  });
}
const readInputs = (ids) => ids.forEach((k) => { const el = $('#' + k); if (el) D[k] = el.type === 'checkbox' ? el.checked : el.value; });

let LASTSTEP = -1;
function drawStep() {
  // เปลี่ยนขั้น → ขึ้นบนสุด · วาดขั้นเดิมซ้ำ (เลือกแนว/ชิป) → คงตำแหน่งเดิม
  const keepY = LASTSTEP === D.step && location.hash.startsWith('#create') ? window.scrollY : 0;
  LASTSTEP = D.step;
  saveDraft();
  requestAnimationFrame(() => window.scrollTo(0, keepY));
  if (!CAT.ready) {
    app.innerHTML = `${topbar('สร้างผลงาน', 'home')}<main><div class="soon card"><span class="badge b-warn">กำลังตั้งค่า</span><h2>ระบบสร้างภาพกำลังเปิด</h2><p class="muted">ระหว่างนี้ตั้งค่าชุดแบรนด์และแฮชแท็กรอไว้ได้เลย</p><a class="btn" href="#brand">ตั้งค่าชุดแบรนด์</a></div></main>${nav('create')}`;
    return;
  }
  const s = D.step;
  if (s === 0) {
    stepShell(`<h1 style="font-size:22px">ผลงานเพื่อ?</h1>
      <div class="grid2">${CAT.goals.map((g) => `<button type="button" class="card opt" data-goal="${g.id}" aria-pressed="${D.goal === g.id}"><b>${esc(g.label)}</b><span class="muted">${esc(g.hint)}</span></button>`).join('')}</div>
      ${D.goal === 'agent' ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>สายงานของคุณ</h2>${chipRow(CAT.agentTypes, D.agentType || 'insurance', 'agentType', false)}
        <span class="muted">AI จะเขียนตามกติกาโฆษณาของสายนี้ และใส่ข้อความกำกับท้ายแคปชั่นให้ (เช่น ประกันภัย)</span></section>` : ''}
      <label class="f" for="link">${D.goal === 'aff' ? 'ลิงก์ Affiliate (Shopee / Lazada / TikTok)' : D.goal === 'agent' ? 'ลิงก์ติดต่อ / LINE / เพจ (ไม่บังคับ)' : 'ลิงก์สินค้าหรือร้าน (ไม่บังคับ)'}
        <input id="link" type="url" inputmode="url" placeholder="https://" value="${esc(D.link || (D.goal !== 'aff' ? ME.brand?.shopLink || '' : ''))}"></label>
      <div id="lkbox">${linkCard()}</div>
      <span class="muted">ลิงก์จะใส่ในแคปชั่นให้อัตโนมัติ${D.goal === 'aff' || D.goal === 'sell' ? ' · วางลิงก์สินค้าแล้ว ระบบอ่านชื่อสินค้าให้' : ''}</span>`);
    app.querySelectorAll('[data-goal]').forEach((b) => b.onclick = () => { readInputs(['link']); D.goal = b.dataset.goal; if (D.goal === 'agent' && !D.agentType) D.agentType = 'insurance'; D.showAllStyles = false; drawStep(); });
    bindChips([], () => readInputs(['link']));
    bindLink();
    $('#next').onclick = () => {
      readInputs(['link']); keepLinkCard();
      if (D.link && !/^https?:\/\/\S+$/i.test(D.link)) return toast('ลิงก์ต้องขึ้นต้นด้วย https://');
      if (D.goal === 'aff' && !D.link) return toast('ใส่ลิงก์ Affiliate ก่อน');
      D.step = 1; drawStep();
    };
  } else if (s === 1) {
    if (!SAMPLES) { SAMPLES = {}; api('api/style-samples').then((r) => { SAMPLES = r; if (D.step === 1 && location.hash.startsWith('#create')) drawStep(); }).catch(() => {}); }
    const vid = D.kind === 'video';
    const list = vid ? CAT.video.styles : CAT.styles;
    stepShell(`<div class="grid2" role="group" aria-label="ประเภทผลงาน">
        <button type="button" class="card opt" data-kind="image" aria-pressed="${!vid}"><b>ภาพ</b><span class="muted">โปสเตอร์ ภาพสินค้า ป้ายโปร</span></button>
        <button type="button" class="card opt" data-kind="video" aria-pressed="${vid}"><b>คลิปวิดีโอ</b><span class="muted">เปิดกล่อง ลุ้นของ พากย์เสียง</span></button></div>
      <label class="card refup" for="refwork" style="flex-direction:row;align-items:center;gap:12px;cursor:pointer;border-style:dashed">
        <span style="font-size:26px">📎</span><span style="flex:1"><b>มีงานตัวอย่างอยู่แล้ว?</b><br><span class="muted" style="font-size:13px">${vid ? 'อัปโหลดภาพหรือคลิปที่อยากได้แบบนี้ · คลิป = แกะพรอมต์/เปลี่ยนเสียง/ใส่อวตาร' : 'อัปโหลดภาพที่อยากได้แบบนี้ AI อ่านแนวงาน ขนาด ชื่อสินค้า ราคาให้ แล้วข้ามไปกรอกรายละเอียด'}</span></span>
        <span class="btn dark sm" id="refbusy">${REFBUSY ? 'กำลังอ่าน…' : 'อัปโหลด'}</span><input id="refwork" type="file" accept="${vid ? 'image/*,video/*' : 'image/*'}" hidden></label>
      ${(() => {
        const card = (x) => { const im = (vid ? SAMPLES?.video : SAMPLES?.image)?.[x.id]; const pl = vid ? SAMPLES?.play?.[x.id] : im; return `<button type="button" class="stylecard has-img" data-style="${x.id}" aria-pressed="${(D.alias || D.style) === x.id}">
          ${im ? `<span class="sx"><img src="${im}" alt="ตัวอย่าง ${esc(x.label)}" loading="lazy">${pl ? `<i data-play="${x.id}">${vid ? '▶ ดูตัวอย่าง' : '🔍 ดูภาพ'}</i>` : ''}</span>`
            : pl ? `<span class="sx"><video src="${pl}#t=0.6" muted playsinline preload="metadata"></video><i data-play="${x.id}">▶ ดูตัวอย่าง</i></span>` : `<span class="sx sxe" style="background:${esc(x.color)}">${x.emoji}</span>`}<b>${esc(x.label)}</b><span class="muted">${vid ? styleNote(x) : `${x.text ? 'มีข้อความบนภาพ' : 'ภาพล้วน'} · ${esc(x.ratio)}`}</span></button>`; };
        const biz = list.filter((x) => !x.pr && !x.agent), pr = list.filter((x) => x.pr), ag = list.filter((x) => x.agent);
        const g1 = `<h2>${vid ? 'คลิปขายของ / คอนเทนต์' : 'ภาพขายของ / คอนเทนต์'}</h2><div class="grid2">${biz.map(card).join('')}</div>`;
        const g2 = pr.length ? `<h2>ประชาสัมพันธ์องค์กร</h2><div class="grid2">${pr.map(card).join('')}</div>` : '';
        const g3 = ag.length ? `<h2>ตัวแทน / นายหน้า (ประกัน อสังหา รถ สินเชื่อ)</h2><div class="grid2">${ag.map(card).join('')}</div>` : '';
        if (!D.showAllStyles) {
          const [title, mine] = goalStyles(list);
          return `<h2>${title}</h2><div class="grid2">${mine.map(card).join('')}</div><button type="button" class="btn ghost sm" id="showAll">ดูแนวอื่นทั้งหมด</button>`;
        }
        return D.goal === 'pr' ? g2 + g1 + g3 : D.goal === 'agent' ? g3 + g1 + g2 : g1 + g3 + g2;
      })()}`, { disabled: !D.style || !(D.showAllStyles ? list : goalStyles(list)[1]).some((x) => x.id === D.style) });
    app.querySelectorAll('[data-kind]').forEach((b) => b.onclick = () => { if (D.kind !== b.dataset.kind) { D.kind = b.dataset.kind; D.style = ''; } drawStep(); });
    const sa = $('#showAll'); if (sa) sa.onclick = () => { D.showAllStyles = true; drawStep(); };
    $('#refwork').onchange = async (e) => {
      const f = e.target.files[0]; if (!f || REFBUSY) return;
      if (/^video\//.test(f.type)) { // คลิปตัวอย่าง → แนวแกะคลิป
        if (!CAT.video.styles.some((x) => x.id === 'v_remix')) return toast('แนวแกะคลิปยังไม่เปิด');
        const v = document.createElement('video'); v.preload = 'metadata';
        const goRx = (sec) => { VFILE = f; D.kind = 'video'; D.style = 'v_remix'; D.showAllStyles = true; D.videoSec = sec; D.step = 2; drawStep(); };
        v.onloadedmetadata = () => (v.duration > CAT.video.remix.maxSec + 1 ? toast(`คลิปยาว ${Math.round(v.duration)} วิ เกิน ${CAT.video.remix.maxSec / 60} นาที`) : goRx(v.duration));
        v.onerror = () => goRx(60);
        v.src = URL.createObjectURL(f); return;
      }
      REFBUSY = true; $('#refbusy').textContent = 'กำลังอ่าน…';
      try {
        const fd = new FormData(); fd.append('src', f); fd.append('kind', D.kind);
        const r = await api('api/create/reference', { method: 'POST', body: fd });
        D.style = r.style; D.showAllStyles = true;
        if (r.ratio) D.ratio = r.ratio;
        if (r.product) D.product = r.product;
        if (r.price) D.price = r.price;
        if (r.headline) D.headline = r.headline;
        if (r.details) D.details = [D.details, r.details].filter(Boolean).join('\n').slice(0, 600);
        D.info = D.info || {}; for (const [k, v] of Object.entries(r.info || {})) if (v && !D.info[k]) D.info[k] = v;
        toast(`AI อ่านแล้ว: ${r.styleLabel}${r.ratio ? ` · ${r.ratio}` : ''} · ตรวจทาน/แก้ได้`);
        REFBUSY = false; D.step = 2; drawStep();
      } catch (x) { REFBUSY = false; toast(x.message); const b = $('#refbusy'); if (b) b.textContent = 'อัปโหลด'; }
    };
    app.querySelectorAll('[data-style]').forEach((b) => b.onclick = (e) => {
      const pl = e.target.closest('[data-play]');
      if (pl) { const x = list.find((y) => y.id === pl.dataset.play); sampleSheet(vid ? SAMPLES?.play?.[x.id] : SAMPLES?.image?.[x.id], vid ? 'video' : 'image', x.label); }
      D.style = b.dataset.style; D.alias = '';
      // การ์ดลัด (เช่น เล่าเรื่องพิกเซล) = ซีรีส์แนวตั้งที่ตั้งค่าไว้ให้
      const al = vid && CAT.video.styles.find((x) => x.id === D.style && x.as); if (al) { D.alias = al.id; D.style = al.as; Object.assign(D, al.preset || {}); }
      if (!vid) D.ratio = CAT.styles.find((x) => x.id === D.style).ratio;
      if (D.style === 'v_series') { D.goal = 'content'; if (!CAT.video.seriesGenres.some((g) => g.id === D.genre)) D.genre = al?.preset?.genre || 'magic'; if (!CAT.video.seriesPrices[D.scenes]) D.scenes = 4; }
      else if (D.style === 'v_drama' && !CAT.video.genres.some((g) => g.id === D.genre)) { D.genre = 'inlaw'; if (D.scenes === 8) D.scenes = 6; }
      drawStep();
    });
    $('#next').onclick = () => { if (D.style === 'v_film') return go('film'); D.step = 2; drawStep(); };
  } else if (s === 2 && INFO_IDS.includes(D.style)) {
    const id = D.style;
    const cs = CAT.video.captionStyles;
    const maxP = id === 'v_tips' || id === 'v_agent_tips' || id === 'v_agent_plan' ? 1 : id === 'v_pr_announce' ? 4 : 8;
    const isAg = id.startsWith('v_agent'), counted = ['v_tips', 'v_agent_tips', 'v_agent_plan'].includes(id);
    const photoTitle = { v_tips: 'รูปประกอบ (ไม่บังคับ 1 รูป)', v_shop: 'รูปร้าน 3–8 รูป (หน้าร้าน เมนู บรรยากาศ)', v_pr_announce: 'รูปประกอบ (ไม่บังคับ ถ้าไม่มี AI วาดพื้นหลังให้ +5 ดาว)', v_pr_recap: 'รูปกิจกรรม 3–8 รูป (AI ดูรูปแล้วเล่าให้)', v_agent_plan: 'รูปตัวคุณ (ไม่บังคับ ขึ้นต้นและท้ายคลิป)', v_agent_tips: 'รูปตัวคุณ (ไม่บังคับ ขึ้นต้นและท้ายคลิป)', v_agent_listing: 'รูปทรัพย์ 3–8 รูป เรียงตามลำดับพาชม (หน้าบ้าน → ภายใน)' }[id];
    const nameLabel = { v_tips: 'หัวข้อความรู้', v_shop: 'ชื่อร้าน', v_pr_announce: 'เรื่องที่ประกาศ', v_pr_recap: 'ชื่อกิจกรรม / ข่าว', v_agent_plan: 'ชื่อแผน / ข้อเสนอ', v_agent_tips: 'หัวข้อความรู้', v_agent_listing: 'ชื่อทรัพย์' }[id];
    const ph = { v_tips: 'เช่น เก็บเต้าหู้ให้สดนานขึ้น', v_shop: 'เช่น บ้านพรุค้าส่ง', v_pr_announce: 'เช่น ขอเชิญร่วมงานวันเด็ก', v_pr_recap: 'เช่น กิจกรรมปลูกป่าชายเลน', v_agent_plan: 'เช่น ประกันสุขภาพเหมาจ่าย', v_agent_tips: 'เช่น ทำประกันสุขภาพตอนอายุเท่าไรดี', v_agent_listing: 'เช่น บ้านเดี่ยว 2 ชั้น 3 นอน ใกล้ ม.อ.' }[id];
    const keys = { v_tips: [], v_shop: ['place', 'hours', 'contact'], v_pr_announce: ['org', 'date', 'place', 'contact'], v_pr_recap: ['org', 'date', 'place'], v_agent_plan: ['org', 'contact', 'license'], v_agent_tips: ['contact', 'license'], v_agent_listing: ['place', 'contact', 'license'] }[id];
    stepShell(`<p class="muted">แนว: <b style="color:var(--fg)">${esc(CAT.video.styles.find((x) => x.id === id).label)}</b></p>
      <section class="card">
        ${isAg ? digestCard() : ''}
        <label class="f" for="product">${nameLabel}<input id="product" type="text" maxlength="120" placeholder="${ph}" value="${esc(D.product)}"></label>
        ${id === 'v_agent_listing' || id === 'v_agent_plan' ? `<label class="f" for="price">${id === 'v_agent_listing' ? 'ราคา (ไม่บังคับ)' : 'ข้อเสนอเด่น / เบี้ยเริ่มต้น (ไม่บังคับ)'}<input id="price" type="text" maxlength="40" placeholder="${id === 'v_agent_listing' ? 'เช่น 2.59 ล้าน / เช่า 8,500/เดือน' : 'ตามเอกสารจริงเท่านั้น'}" value="${esc(D.price)}"></label>` : ''}
        ${id === 'v_shop' ? `<label class="f" for="price">โปรตอนนี้ (ไม่บังคับ)<input id="price" type="text" maxlength="40" placeholder="เช่น ซื้อครบ 500 ส่งฟรี" value="${esc(D.price)}"></label>` : ''}
        <label class="f" for="details">${id === 'v_tips' || id === 'v_agent_tips' ? 'อยากเล่ามุมไหน (ไม่บังคับ)' : id === 'v_agent_listing' ? 'รายละเอียดทรัพย์ (ขนาด ห้อง จุดเด่น)' : 'รายละเอียด'}<textarea id="details" rows="${isAg ? 5 : 3}" maxlength="600">${esc(D.details)}</textarea></label>
        ${infoFields(keys)}
      </section>
      ${counted ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>${id === 'v_agent_plan' ? 'จำนวนจุดเด่น' : 'จำนวนทิป'}</h2>${chipRow([{ id: '3', label: `3 ทิป ~30 วิ · ${CAT.video.prices[30]} ดาว` }, { id: '5', label: `5 ทิป ~45 วิ · ${CAT.video.prices[45]} ดาว` }], String(D.count || 3), 'count', false)}</section>` : ''}
      <section class="card"><b>${photoTitle}</b>
        <div class="refs">${REFS.map((f, i) => `<button type="button" class="ref" data-rm="${i}" aria-label="ลบรูป"><img src="${URL.createObjectURL(f)}" alt=""><span>✕</span></button>`).join('')}
        ${REFS.length < maxP ? '<label class="ref add" for="refin" style="cursor:pointer">+ เพิ่มรูป<input id="refin" type="file" accept="image/*" multiple hidden></label>' : ''}</div></section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>สไตล์ซับ</h2>
        <div class="grid2">${cs.map((c) => `<button type="button" class="card opt" data-cs="${c.id}" aria-pressed="${D.captionStyle === c.id}" style="align-items:center">
          <span class="capdemo cap-${c.id}">ซับตัวอย่าง</span><span class="muted">${esc(c.label)}</span></button>`).join('')}</div></section>
      <section class="card"><label class="row between" for="useLogo"><span><b>ใส่โลโก้${id.startsWith('v_pr') ? 'หน่วยงาน' : 'ร้าน'}</b><br><span class="muted">${ME.brand?.logo ? 'มุมขวาบน + ฉากปิด' : 'ยังไม่มีโลโก้ในชุดแบรนด์'}</span></span>
        <input id="useLogo" type="checkbox" class="sw-in" ${D.useLogo && ME.brand?.logo ? 'checked' : ''} ${ME.brand?.logo ? '' : 'disabled'}></label></section>`);
    const fields = ['product', 'price', 'details', 'useLogo'];
    bindChips([], (k) => { if (k === 'count') D.count = Number(D.count); });
    bindDigest(fields);
    app.querySelectorAll('[data-cs]').forEach((b) => b.onclick = () => { readInputs(fields); readInfo(); D.captionStyle = b.dataset.cs; drawStep(); });
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); readInfo(); REFS = [...REFS, ...[...e.target.files].filter((f) => f.type.startsWith('image/'))].slice(0, maxP); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); readInfo(); REFS.splice(Number(b.dataset.rm), 1); drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields); readInfo(); D.count = Number(D.count) || 3;
      if (!D.product.trim()) return toast(`ใส่${nameLabel}ก่อน`);
      if ((id === 'v_shop' || id === 'v_pr_recap' || id === 'v_agent_listing') && !REFS.length && !D.fromWork) return toast('ใส่รูปอย่างน้อย 1 รูป (แนะนำ 3 รูปขึ้นไป)');
      D.step = 3; drawStep();
    };
  } else if (s === 2 && D.style === 'v_avatar') {
    const A = CAT.video.avatar;
    if (!AVS_LOADED) { loadAvatars().then(drawStep).catch((e) => toast(e.message)); app.innerHTML = `${topbar('สร้างผลงาน', 'home')}<main>${LOAD('กำลังโหลดอวตาร…')}</main>`; return; }
    if (!A.ready) { stepShell('<div class="soon card"><span class="badge b-warn">กำลังตั้งค่า</span><h2>ระบบอวตารกำลังเปิด</h2><p class="muted">ออกแบบอวตารเก็บไว้ก่อนได้เลย พร้อมเมื่อไรใช้ได้ทันที</p><a class="btn" href="#avatars">ออกแบบอวตาร</a></div>', { disabled: true }); return; }
    const av = AVS.find((a) => a.id === D.avatarId) || null;
    // นับความยาวตามภาษาที่พิมพ์ (พิมพ์คนละภาษากับที่เลือก ระบบแปลให้)
    const detL = (t) => { const th = (t.match(/[\u0E00-\u0E7F]/g) || []).length, zh = (t.match(/[\u4E00-\u9FFF]/g) || []).length, la = (t.match(/[A-Za-z]/g) || []).length; return th >= zh && th >= la && th ? 'th' : zh >= la && zh ? 'zh' : /\b(dan|yang|untuk|anda|kami|ini|dengan|tidak|boleh|harga)\b/i.test(t) ? 'ms' : la ? 'en' : D.lang; };
    const maxFor = (t) => { const sl = t.trim() ? detL(t) : D.lang; return { sl, max: Math.round((A.langs.find((l) => l.id === sl)?.cps || 9) * D.length * 1.1 * (sl === D.lang ? 1.15 : 1.6)) }; };
    const max = maxFor(D.script || '').max;
    const trNote = (t) => { const sl = t.trim() ? detL(t) : D.lang; return sl !== D.lang ? `พิมพ์เป็น${A.langs.find((l) => l.id === sl)?.label || sl} · ระบบจะแปลเป็น${A.langs.find((l) => l.id === D.lang)?.label}ให้อัตโนมัติ` : ''; };
    const vs = CAT.video.voices.filter((v) => !av || v.gender === av.gender);
    if (![15, 30, 60].includes(Number(D.length))) D.length = 30;
    if (D.quality === 'pro' && !A.pro) D.quality = 'std';
    if (D.quality !== 'pro' && !A.std) D.quality = 'pro';
    const PR = D.quality === 'pro' ? A.proPrices : A.prices;
    stepShell(`<h1 style="font-size:22px">วิดีโออวตารพูดได้</h1>
      <p class="muted">อวตารหน้าเหมือนคนจริง ขยับปากตรงเสียง พูดได้ 4 ภาษา เก็บอวตารไว้ใช้ซ้ำได้ทุกงาน</p>
      <div class="row between"><h2>เลือกอวตาร</h2><a class="btn ghost sm" href="#avatars?from=create">+ ออกแบบใหม่</a></div>
      ${AVS.length ? `<div class="avgrid">${AVS.map((a) => `<button type="button" class="avcard" data-av="${a.id}" aria-pressed="${D.avatarId === a.id}"><img src="${a.img}" alt="" loading="lazy"><b>${esc(a.name)}</b></button>`).join('')}</div>`
        : '<section class="card"><b>ยังไม่มีอวตาร</b><span class="muted">ออกแบบหน้าตาเอง หรือใช้รูปตัวเอง ใช้เวลาไม่ถึงนาที</span><a class="btn" href="#avatars?from=create">ออกแบบอวตารตัวแรก</a></section>'}
      <section style="display:flex;flex-direction:column;gap:10px"><h2>ภาษาที่พูด</h2>${chipRow(A.langs, D.lang, 'lang', false)}</section>
      ${A.std && A.pro ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>คุณภาพ</h2>${chipRow([{ id: 'std', label: `มาตรฐาน · เริ่ม ${A.prices[15]} ดาว` }, { id: 'pro', label: `พรีเมียม · เริ่ม ${A.proPrices[15]} ดาว` }], D.quality, 'quality', false)}
        <span class="muted">${D.quality === 'pro' ? 'พรีเมียม: ขยับหัว หน้า มือตามจังหวะพูดทั้งคลิป เป็นธรรมชาติที่สุด' : 'มาตรฐาน: ขยับปากตรงเสียง ท่าทางเบาๆ คุ้มค่า เหมาะคลิป 15–30 วิ'}</span></section>` : ''}
      <section style="display:flex;flex-direction:column;gap:10px"><h2>ความยาว</h2>${chipRow([15, 30, 60].map((n) => ({ id: String(n), label: `${n} วิ · ${PR[n]} ดาว` })), String(D.length), 'length', false)}</section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>บทพูด</h2>${chipRow([{ id: 'ai', label: 'ให้ AI เขียนบท' }, { id: 'own', label: 'ใช้บทของฉัน' }], D.scriptMode, 'scriptMode', false)}</section>
      <section class="card">${D.scriptMode === 'own'
        ? `<label class="f" for="script">บทพูด (${A.langs.find((l) => l.id === D.lang)?.label}) <span class="muted" id="cnt">${[...D.script].length}/${max}</span><textarea id="script" rows="6" maxlength="2000" placeholder="พิมพ์ทีละประโยค ขึ้นบรรทัดใหม่ได้ (พิมพ์ภาษาไหนก็ได้ ระบบพูดเป็นภาษาที่เลือก)">${esc(D.script)}</textarea></label><span class="muted" id="trn">${esc(trNote(D.script || ''))}</span>`
        : `<label class="f" for="product">หัวข้อ / สินค้า<input id="product" type="text" maxlength="120" placeholder="เช่น รีวิวเซรั่มวิตซี, แนะนำคอร์สเรียนภาษา" value="${esc(D.product)}"></label>
           <label class="f" for="details">ประเด็นที่อยากให้พูด (ไม่บังคับ)<textarea id="details" rows="3" maxlength="600" placeholder="เช่น ลดราคาถึงสิ้นเดือน ส่งฟรี">${esc(D.details)}</textarea></label>
           <label class="f" for="price">ราคา / โปร (ไม่บังคับ)<input id="price" type="text" maxlength="60" value="${esc(D.price)}"></label>
           <span class="muted">AI เขียนบทและแคปชั่นเป็นภาษาที่เลือก</span>`}</section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>เสียง</h2>${chipRow([{ id: '', label: 'ตามอวตาร' }, ...vs.map((v) => ({ id: v.id, label: (v.gender === 'female' ? '👩 ' : '👨 ') + v.label }))], D.voice, 'voice', false)}</section>
      <section class="card"><label class="row between" for="subs"><b>ใส่ซับบนจอ</b><input id="subs" type="checkbox" class="sw-in" ${D.subs ? 'checked' : ''}></label>
        ${D.subs ? chipRow(CAT.video.captionStyles, D.captionStyle, 'captionStyle', false) : ''}</section>
      <span class="muted">ภาษาจีนและมลายูเสียงอาจสำเนียงไม่เป๊ะ 100% ลองสั้นๆ 15 วิ ก่อนได้</span>`);
    const fields = ['product', 'details', 'price', 'script', 'subs'];
    bindChips([], (k) => { readInputs(fields); if (k === 'length') D.length = Number(D.length); if (['lang', 'length', 'scriptMode', 'quality'].includes(k)) drawStep(); });
    app.querySelectorAll('[data-av]').forEach((b) => b.onclick = () => { readInputs(fields); D.avatarId = Number(b.dataset.av); const a = AVS.find((x) => x.id === D.avatarId); if (a && D.voice && !CAT.video.voices.some((v) => v.id === D.voice && v.gender === a.gender)) D.voice = ''; drawStep(); });
    const sb = $('#subs'); if (sb) sb.onchange = () => { readInputs(fields); drawStep(); };
    const sc = $('#script'); if (sc) sc.oninput = () => { const n = [...sc.value].length, m = maxFor(sc.value).max; const c = $('#cnt'); c.textContent = `${n}/${m}`; c.style.color = n > m ? 'var(--bad)' : ''; $('#trn').textContent = trNote(sc.value); };
    $('#next').onclick = () => {
      readInputs(fields);
      if (!D.avatarId || !av) return toast('เลือกอวตารก่อน');
      if (D.scriptMode === 'own') { if (!D.script.trim()) return toast('พิมพ์บทพูดก่อน'); if ([...D.script.replace(/\s+/g, '')].length > maxFor(D.script).max) return toast(`บทยาวเกิน ${D.length} วิ · เลือกความยาวมากขึ้นหรือตัดบท`); }
      else if (!D.product.trim()) return toast('ใส่หัวข้อหรือสินค้าก่อน');
      D.step = 3; drawStep();
    };
  } else if (s === 2 && D.style === 'v_motion') {
    const V2 = CAT.video;
    stepShell(`<h1 style="font-size:22px">คลิป AI ภาพเคลื่อนไหวจริง</h1>
      <p class="muted">AI สร้างวิดีโอเคลื่อนไหวจริงทั้งคลิป (ไม่ใช่ภาพนิ่งตัดต่อ) ยาวราว 10 วินาที มีดนตรีและเสียงเอฟเฟกต์ในตัว</p>
      <h2>แนวช็อต</h2>
      <div class="grid2">${V2.motionPresets.map((m) => `<button type="button" class="card opt" data-preset="${m.id}" aria-pressed="${D.preset === m.id}"><b>${esc(m.label)}</b><span class="muted">${esc(m.desc)}</span></button>`).join('')}</div>
      <section class="card"><b>รูปสินค้า (ไม่บังคับ แต่แนะนำ)</b><span class="muted">ใส่ 1 รูป AI จะใช้สินค้าจริงของคุณในวิดีโอ</span>
        <div class="refs">${REFS.slice(0, 1).map((f, i) => `<button type="button" class="ref" data-rm="${i}" aria-label="ลบรูป"><img src="${URL.createObjectURL(f)}" alt=""><span>✕</span></button>`).join('')}
        ${REFS.length < 1 ? '<label class="ref add" for="refin" style="cursor:pointer">+ เพิ่มรูป<input id="refin" type="file" accept="image/*" hidden></label>' : ''}</div></section>
      <section class="card">
        <label class="f" for="product">ชื่อสินค้า / เรื่อง<input id="product" type="text" maxlength="120" placeholder="เช่น ชาไทยเย็น, เซรั่มวิตซี" value="${esc(D.product)}"></label>
        <label class="f" for="details">จุดเด่น (ไม่บังคับ)<textarea id="details" rows="2" maxlength="600">${esc(D.details)}</textarea></label>
        <label class="f" for="plot">${D.preset === 'scene' ? 'บรรยายฉากที่อยากได้' : 'ไอเดียเพิ่มเติม (ไม่บังคับ)'}<textarea id="plot" rows="3" maxlength="500" placeholder="เช่น แก้วชาไทยบนโต๊ะไม้ริมหน้าต่าง ฝนตกด้านนอก น้ำแข็งค่อยๆ ละลาย">${esc(D.plot)}</textarea></label>
      </section>
      <span class="muted">ไม่มีเสียงพูดภาษาไทยในคลิป (โมเดลยังพูดไทยได้ไม่ดี) · ไม่มีตัวหนังสือบนจอ ใส่แคปชั่นตอนโพสต์ได้</span>`);
    const fields = ['product', 'details', 'plot'];
    app.querySelectorAll('[data-preset]').forEach((b) => b.onclick = () => { readInputs(fields); D.preset = b.dataset.preset; drawStep(); });
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); REFS = [...e.target.files].filter((f) => f.type.startsWith('image/')).slice(0, 1); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); REFS = []; drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields);
      if (!D.product.trim() && !D.plot.trim()) return toast('ใส่ชื่อสินค้าหรือไอเดียก่อน');
      if (D.preset === 'scene' && !D.plot.trim()) return toast('บรรยายฉากที่อยากได้ก่อน');
      D.step = 3; drawStep();
    };
  } else if (s === 2 && D.style === 'v_series') {
    const V2 = CAT.video;
    const cont = D.seriesInfo;
    stepShell(`<h1 style="font-size:22px">${cont ? `ตอนต่อไป · ${esc(cont.title)} EP.${(cont.ep || 1) + 1}` : 'ซีรีส์แนวตั้ง'}</h1>
      ${cont ? `<section class="card"><b>เรื่องย่อที่ผ่านมา</b><span class="muted">${esc(cont.summary || '')}</span>${cont.cliff ? `<span class="muted">ตอนที่แล้วค้างไว้ที่: ${esc(cont.cliff)}</span>` : ''}
          <span class="muted">ตัวละครเดิม: ${(cont.chars || []).map((c) => esc(c.name)).join(', ')} · หน้าตา เสียง และลายเส้นเดิมทุกตอน</span>
          <button type="button" class="btn ghost sm" id="newSeries">เริ่มเรื่องใหม่แทน</button></section>
        <label class="f" for="plot">อยากให้ตอนนี้เกิดอะไร (ไม่บังคับ)<textarea id="plot" rows="6" maxlength="5000" placeholder="เช่น พระเอกค้นพบว่าคาถาใช้ได้แค่ตอนเที่ยงคืน">${esc(D.plot)}</textarea></label>`
      : `<div id="mySeries"></div>
        <h2>แนวเรื่อง</h2>
        <div class="grid2">${V2.seriesGenres.map((g) => `<button type="button" class="card opt" data-sgenre="${g.id}" aria-pressed="${D.genre === g.id}"><b>${esc(g.label)}</b><span class="muted">${esc(g.desc)}</span></button>`).join('')}</div>
        <section class="card"><label class="f" for="product">ชื่อเรื่อง / แนวคิด${D.genre === 'free' ? '' : ' (ไม่บังคับ)'}<input id="product" type="text" maxlength="120" placeholder="เช่น เด็กส่งของที่ได้พลังเวทมนตร์" value="${esc(D.product)}"></label>
          <label class="f" for="plot">เรื่องย่อ${D.genre === 'free' ? '' : ' (ไม่บังคับ ให้ AI คิดเองได้)'}<textarea id="plot" rows="6" maxlength="5000" placeholder="เช่น พนักงานออฟฟิศหลับไปตื่นมาอยู่ในวังสมัยอยุธยา ต้องเอาตัวรอดด้วยความรู้ยุคใหม่">${esc(D.plot)}</textarea></label></section>
        <section style="display:flex;flex-direction:column;gap:10px"><h2>สไตล์ภาพ</h2>${chipRow(V2.art, D.art, 'art', false)}</section>`}
      <section style="display:flex;flex-direction:column;gap:10px"><h2>ความยาวตอนนี้</h2>${chipRow(Object.keys(V2.seriesPrices).map((n) => ({ id: n, label: `${n} ฉาก ~${V2.seriesLen[n]} วิ · ${V2.seriesPrices[n]} ดาว` })), String(D.scenes), 'scenes', false)}</section>
      ${V2.seriesMotion ? `<label class="card" for="smot" style="flex-direction:row;align-items:center;gap:12px;cursor:pointer"><span style="flex:1"><b>🎬 ให้ตัวละครขยับจริงในฉากเด่น</b> <span class="muted">+${V2.seriesMotion[D.scenes]?.price || V2.seriesMotion[4].price} ดาว</span><br><span class="muted" style="font-size:13px">${V2.seriesMotion[D.scenes]?.n || 2} ฉาก (ฉากเปิด ฉากจบ ฉากกลางเรื่อง) ตัวละครขยับ ทำงาน แสดงสีหน้า · ฉากอื่นเป็นภาพกล้องเคลื่อน</span></span><input id="smot" type="checkbox" class="sw-in" ${D.motion ? 'checked' : ''}></label>` : ''}
      <span class="muted">AI เขียนบท วาดทุกฉาก พากย์หลายเสียงตามตัวละคร จบแบบค้างคาให้ทำตอนต่อไปได้ · ไม่ต้องใช้รูปสินค้า</span>`);
    const fields = ['product', 'plot'];
    bindChips([], (k) => { if (k === 'scenes') D.scenes = Number(D.scenes); });
    app.querySelectorAll('[data-sgenre]').forEach((b) => b.onclick = () => { readInputs(fields); D.genre = b.dataset.sgenre; drawStep(); });
    const sm = $('#smot'); if (sm) sm.onchange = (e) => { readInputs(fields); D.motion = e.target.checked; drawStep(); };
    const ns = $('#newSeries'); if (ns) ns.onclick = () => { D.seriesFrom = 0; D.seriesInfo = null; D.plot = ''; drawStep(); };
    if (!cont) {
      api('api/works').then((r) => {
        const el = $('#mySeries'); if (!el) return;
        const latest = {}; // ตอนล่าสุดของแต่ละเรื่อง
        for (const w of r.items.filter((x) => x.style === 'v_series' && x.status === 'done' && x.params?.series)) { const k = w.params.series.root || w.id; if (!latest[k] || w.params.series.ep > latest[k].params.series.ep) latest[k] = w; }
        const list = Object.values(latest);
        if (!list.length) return;
        el.innerHTML = `<section class="card"><b>ทำตอนต่อจากเรื่องเดิม</b>${list.map((w) => `<div class="row between" style="gap:8px"><span style="min-width:0"><b style="font-size:14px">${esc(w.params.series.title)}</b><br><span class="muted" style="font-size:12px">จบที่ EP.${w.params.series.ep}${w.params.series.arc?.[w.params.series.ep] ? ` · ตอนต่อไปตามแผน: ${esc(w.params.series.arc[w.params.series.ep].slice(0, 80))}` : (w.params.series.arc?.length && w.params.series.ep >= w.params.series.arc.length ? ' · เล่าครบตามเรื่องย่อแล้ว' : '')}</span></span>
          <button type="button" class="btn sm" data-cont="${w.id}">ทำ EP.${w.params.series.ep + 1}</button></div>`).join('')}</section>`;
        el.querySelectorAll('[data-cont]').forEach((b) => b.onclick = () => { const w = list.find((x) => String(x.id) === b.dataset.cont); Object.assign(D, { seriesFrom: w.id, seriesInfo: w.params.series, genre: w.params.series.genre, art: w.params.series.art, product: w.params.series.title, plot: '' }); drawStep(); });
      }).catch(() => {});
    }
    $('#next').onclick = () => {
      readInputs(fields); D.scenes = Number(D.scenes) || 4;
      if (!D.seriesFrom && D.genre === 'free' && !D.plot.trim()) return toast('พิมพ์เรื่องย่อก่อน');
      D.step = 3; drawStep();
    };
  } else if (s === 2 && D.style === 'v_drama') {
    const V2 = CAT.video;
    stepShell(`<h1 style="font-size:22px">ละครแนวไหน?</h1>
      <div class="grid2">${V2.genres.map((g) => `<button type="button" class="card opt" data-genre="${g.id}" aria-pressed="${D.genre === g.id}"><b>${esc(g.label)}</b><span class="muted">${esc(g.desc)}</span></button>`).join('')}</div>
      ${D.genre === 'free' ? `<label class="f" for="plot">พล็อตเรื่อง<textarea id="plot" rows="6" maxlength="5000" placeholder="เช่น ยายไปตลาดเจอขนมแปลกใหม่ หลานไม่เชื่อว่าอร่อย">${esc(D.plot)}</textarea></label>` : ''}
      <section style="display:flex;flex-direction:column;gap:10px"><h2>สไตล์ภาพ</h2>${chipRow(V2.art, D.art, 'art', false)}</section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>จำนวนฉาก</h2>${chipRow([{ id: '4', label: `4 ฉาก ~30 วิ · ${V2.dramaPrices[4]} ดาว` }, { id: '6', label: `6 ฉาก ~45 วิ · ${V2.dramaPrices[6]} ดาว` }], String(D.scenes), 'scenes', false)}</section>
      <section class="card"><b>รูปสินค้า (1 รูป)</b><span class="muted">AI จะวาดสินค้านี้ลงในฉาก และใช้ปิดท้ายคลิปพร้อมราคา</span>
        <div class="refs">${REFS.slice(0, 1).map((f, i) => `<button type="button" class="ref" data-rm="${i}" aria-label="ลบรูป"><img src="${URL.createObjectURL(f)}" alt=""><span>✕</span></button>`).join('')}
        ${REFS.length < 1 ? '<label class="ref add" for="refin" style="cursor:pointer">+ เพิ่มรูป<input id="refin" type="file" accept="image/*" hidden></label>' : ''}</div></section>
      <section class="card">
        <label class="f" for="product">ชื่อสินค้า<input id="product" type="text" maxlength="120" value="${esc(D.product)}"></label>
        <label class="f" for="price">ราคา / โปร<input id="price" type="text" maxlength="40" placeholder="เช่น ฿99" value="${esc(D.price)}"></label>
        <label class="f" for="details">จุดเด่น<textarea id="details" rows="2" maxlength="600">${esc(D.details)}</textarea></label>
      </section>
      <span class="muted">ตัวละครและเสียง (ชาย หญิง เด็ก คนแก่) AI เลือกให้ตามบท</span>`);
    const fields = ['product', 'price', 'details', 'plot'];
    bindChips([], (k) => { if (k === 'scenes') D.scenes = Number(D.scenes); });
    app.querySelectorAll('[data-genre]').forEach((b) => b.onclick = () => { readInputs(fields); D.genre = b.dataset.genre; drawStep(); });
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); REFS = [...e.target.files].filter((f) => f.type.startsWith('image/')).slice(0, 1); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); REFS = []; drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields); D.scenes = Number(D.scenes) || 4;
      if (!REFS.length && !D.fromWork) return toast('ใส่รูปสินค้า 1 รูป');
      if (!D.product.trim()) return toast('ใส่ชื่อสินค้าก่อน');
      if (D.genre === 'free' && !D.plot.trim()) return toast('พิมพ์พล็อตเรื่องก่อน');
      D.step = 3; drawStep();
    };
  } else if (s === 2 && (D.style === 'v_show' || D.style === 'v_top')) {
    const st = CAT.video.styles.find((x) => x.id === D.style);
    const top = D.style === 'v_top';
    const cs = CAT.video.captionStyles;
    const common = `<section style="display:flex;flex-direction:column;gap:10px"><h2>สไตล์ตัดต่อ</h2>
        ${chipRow([{ id: 'random', label: '🎲 สุ่มให้' }, ...st.variants], D.variant || 'random', 'variant', false)}</section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>สไตล์ซับ</h2>
        <div class="grid2">${cs.map((c) => `<button type="button" class="card opt" data-cs="${c.id}" aria-pressed="${D.captionStyle === c.id}" style="align-items:center">
          <span class="capdemo cap-${c.id}">ซับตัวอย่าง</span><span class="muted">${esc(c.label)}</span></button>`).join('')}</div></section>
      <section class="card"><label class="row between" for="useLogo"><span><b>ใส่โลโก้ร้าน</b><br><span class="muted">${ME.brand?.logo ? 'มุมขวาบน' : 'ยังไม่มีโลโก้ในชุดแบรนด์'}</span></span>
        <input id="useLogo" type="checkbox" class="sw-in" ${D.useLogo && ME.brand?.logo ? 'checked' : ''} ${ME.brand?.logo ? '' : 'disabled'}></label></section>`;
    if (!top) {
      stepShell(`<p class="muted">แนว: <b style="color:var(--fg)">${esc(st.label)}</b></p>
        <section class="card"><b>รูปสินค้า 2–8 รูป</b><span class="muted">หลายมุม ใกล้-ไกล ตอนใช้งานจริง ยิ่งหลากหลายคลิปยิ่งน่าดู</span>
          <div class="refs">${REFS.map((f, i) => `<button type="button" class="ref" data-rm="${i}" aria-label="ลบรูป"><img src="${URL.createObjectURL(f)}" alt=""><span>✕</span></button>`).join('')}
          ${REFS.length < 8 ? '<label class="ref add" for="refin" style="cursor:pointer">+ เพิ่มรูป<input id="refin" type="file" accept="image/*" multiple hidden></label>' : ''}</div></section>
        <section class="card">
          <label class="f" for="product">ชื่อสินค้า<input id="product" type="text" maxlength="120" value="${esc(D.product)}"></label>
          <label class="f" for="price">ราคา / โปร<input id="price" type="text" maxlength="40" placeholder="เช่น ฿199" value="${esc(D.price)}"></label>
          <label class="f" for="details">จุดเด่นที่อยากให้พูด<textarea id="details" rows="3" maxlength="600">${esc(D.details)}</textarea></label>
        </section>${common}`);
    } else {
      stepShell(`<p class="muted">ใส่สินค้า 2–5 ชิ้น เรียงจากอันดับ 1 (ดีที่สุด) · คลิปจะนับถอยหลังไปหาอันดับ 1</p>
        ${D.items.map((it, i) => `<section class="card" style="gap:8px"><div class="row between"><b style="font-size:20px">#${i + 1}</b>
            ${D.items.length > 2 ? `<button type="button" class="chip" data-rmitem="${i}" style="min-height:32px;padding:2px 10px;font-size:12px">ลบ</button>` : ''}</div>
          <div class="row" style="gap:10px;align-items:flex-start">
            <label class="ref ${ITEMF[i] ? '' : 'add'}" for="itf${i}" style="cursor:pointer;flex:none">${ITEMF[i] ? `<img src="${URL.createObjectURL(ITEMF[i])}" alt="">` : '+ รูป'}<input id="itf${i}" data-itf="${i}" type="file" accept="image/*" hidden></label>
            <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:0">
              <input type="text" data-it="${i}:name" maxlength="40" placeholder="ชื่อสินค้า" value="${esc(it.name)}" aria-label="ชื่อสินค้าอันดับ ${i + 1}">
              <input type="text" data-it="${i}:price" maxlength="20" placeholder="ราคา เช่น ฿99" value="${esc(it.price)}" aria-label="ราคาอันดับ ${i + 1}">
            </div></div>
          <input type="text" data-it="${i}:note" maxlength="120" placeholder="ทำไมถึงชอบ (สั้นๆ)" value="${esc(it.note)}" aria-label="เหตุผลอันดับ ${i + 1}">
          <input type="url" inputmode="url" data-it="${i}:link" maxlength="300" placeholder="ลิงก์ Affiliate ของชิ้นนี้ (ไม่บังคับ)" value="${esc(it.link)}" aria-label="ลิงก์อันดับ ${i + 1}">
        </section>`).join('')}
        ${D.items.length < 5 ? '<button type="button" class="btn dark" id="additem">+ เพิ่มสินค้า</button>' : ''}
        <section class="card"><label class="f" for="product">หัวข้อคลิป (ไม่บังคับ)<input id="product" type="text" maxlength="120" placeholder="เช่น ของกินเล่นใต้ 100 บาท" value="${esc(D.product)}"></label></section>
        ${common}`);
    }
    const fields = ['product', 'price', 'details', 'useLogo'];
    const readItems = () => app.querySelectorAll('[data-it]').forEach((el) => { const [i, k] = el.dataset.it.split(':'); D.items[Number(i)][k] = el.value; });
    bindChips([]);
    app.querySelectorAll('[data-cs]').forEach((b) => b.onclick = () => { readInputs(fields); readItems(); D.captionStyle = b.dataset.cs; drawStep(); });
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); REFS = [...REFS, ...[...e.target.files].filter((f) => f.type.startsWith('image/'))].slice(0, 8); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); REFS.splice(Number(b.dataset.rm), 1); drawStep(); });
    app.querySelectorAll('[data-itf]').forEach((el) => el.onchange = (e) => { readInputs(fields); readItems(); const f = e.target.files[0]; if (f) ITEMF[Number(el.dataset.itf)] = f; drawStep(); });
    app.querySelectorAll('[data-rmitem]').forEach((b) => b.onclick = () => { readInputs(fields); readItems(); const i = Number(b.dataset.rmitem); D.items.splice(i, 1); ITEMF.splice(i, 1); drawStep(); });
    const ai = $('#additem'); if (ai) ai.onclick = () => { readInputs(fields); readItems(); D.items.push({ name: '', price: '', note: '', link: '' }); drawStep(); };
    $('#next').onclick = () => {
      readInputs(fields); readItems();
      if (!top) {
        if (REFS.length < 1 && !D.fromWork) return toast('ใส่รูปสินค้าอย่างน้อย 1 รูป (แนะนำ 3 รูปขึ้นไป)');
        if (!D.product.trim()) return toast('ใส่ชื่อสินค้าก่อน');
      } else {
        if (D.items.some((it) => !it.name.trim())) return toast('ใส่ชื่อสินค้าให้ครบทุกอันดับ');
        if (!D.fromWork && D.items.some((_, i) => !ITEMF[i])) return toast('ใส่รูปให้ครบทุกอันดับ');
        if (D.items.some((it) => it.link && !/^https?:\/\/\S+$/i.test(it.link.trim()))) return toast('ลิงก์ต้องขึ้นต้นด้วย https://');
      }
      D.step = 3; drawStep();
    };
  } else if (s === 2 && D.style === 'v_remix') {
    const R = CAT.video.remix;
    if (D.remixAvatar && !AVS_LOADED) { loadAvatars().then(drawStep).catch((e) => toast(e.message)); }
    const price = () => (R.prices.base.find(([x]) => (D.videoSec || 30) <= x + 0.5) || R.prices.base.at(-1))[1] + (D.remixVoice ? R.prices.voice : 0) + (D.remixAvatar ? R.prices.avatar : 0);
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
    stepShell(`<section class="card"><b>คลิปตัวอย่าง (ไม่เกิน ${R.maxSec / 60} นาที)</b>
        ${VFILE ? `<video id="rxv" src="${URL.createObjectURL(VFILE)}" controls playsinline style="width:100%;max-height:380px;border-radius:12px;background:#000"></video>
          <div class="row between"><span class="muted">${esc(VFILE.name)} · ${fmt(D.videoSec || 0)}</span><label class="chip" for="vin" style="cursor:pointer">เปลี่ยนคลิป</label></div>`
          : '<label class="ref add" for="vin" style="width:100%;height:120px;cursor:pointer">+ เลือกคลิปจากเครื่อง (TikTok/Reels ที่ดาวน์โหลดมา หรือคลิปของคุณ)</label>'}
        <input id="vin" type="file" accept="video/*" hidden>
        <label class="f" for="product">จะเอาไปทำเรื่อง/สินค้าอะไร (ไม่บังคับ)<input id="product" type="text" maxlength="120" placeholder="เช่น เต้าหู้ไข่บ้านพรุ — ให้พรอมต์เปลี่ยนเป็นสินค้านี้" value="${esc(D.product)}"></label></section>
      <section class="card" style="gap:6px"><b>🧩 แกะพรอมต์ทีละฉาก <span class="badge b-lime">รวมในราคา</span></b>
        <span class="muted" style="font-size:13px">AI ดูทั้งคลิป แยกฉาก เขียนพรอมต์ภาษาอังกฤษพร้อมวางใน Google Flow + ภาพแต่ละฉาก + เคล็ดลับว่าทำไมคลิปนี้ปัง · ราคาตามความยาว: ${R.prices.base.map(([x, p]) => `≤${x < 60 ? `${x} วิ` : `${x / 60} นาที`} ${p}⭐`).join(' · ')}</span></section>
      <section class="card" style="gap:10px">
        <label class="row between" for="rxa"><span><b>🧑‍🎤 ใส่อวตาร/ตัวละครของฉัน</b> <span class="muted">+${R.prices.avatar} ดาว</span><br><span class="muted" style="font-size:13px">ได้พรอมต์ฉบับมีตัวละครคุณ + วิธีทำใน Flow</span></span><input id="rxa" type="checkbox" class="sw-in" ${D.remixAvatar ? 'checked' : ''}></label>
        ${D.remixAvatar ? (!AVS_LOADED ? LOAD('กำลังโหลดอวตาร…', true) : AVS.length ? `<div class="avgrid">${AVS.map((a) => `<button type="button" class="avcard" data-av="${a.id}" aria-pressed="${D.avatarId === a.id}"><img src="${a.img}" alt="" loading="lazy"><b>${esc(a.name)}</b></button>`).join('')}</div>
            <div class="grid2">${R.modes.map((m) => `<button type="button" class="card opt" data-amode="${m.id}" aria-pressed="${(D.avatarMode || 'replace') === m.id}"><b>${esc(m.label)}</b><span class="muted">${esc(m.hint)}</span></button>`).join('')}</div>
            ${(D.avatarMode || 'replace') === 'custom' ? `<label class="f" for="avatarNote">อยากให้อยู่ตรงไหน ทำอะไร<textarea id="avatarNote" rows="2" maxlength="200" placeholder="เช่น ยืนรีวิวสินค้าในฉากสุดท้าย">${esc(D.avatarNote || '')}</textarea></label>` : ''}`
          : '<a class="btn dark sm" href="#avatars?from=create">ยังไม่มีอวตาร · สร้างอวตารก่อน</a>') : ''}
      </section>
      <section class="card" style="gap:10px">
        <label class="row between" for="rxv2"><span><b>🎙️ เปลี่ยนเสียงเป็นเสียงของคุณ</b> <span class="muted">+${R.prices.voice} ดาว</span><br><span class="muted" style="font-size:13px">อัดเสียงพูดทับ ได้คลิปใหม่ที่เป็นเสียงคุณ</span></span><input id="rxv2" type="checkbox" class="sw-in" ${D.remixVoice ? 'checked' : ''}></label>
        ${D.remixVoice ? `<div class="grid2"><button type="button" class="btn ${REC.on ? '' : 'dark'}" id="recbtn">${REC.on ? `⏹ หยุดอัด ${REC.t}s` : VOICEB ? '🎙️ อัดใหม่' : '🎙️ เริ่มอัด (คลิปเล่นพร้อมกัน)'}</button>
            <label class="btn ghost" for="vofile" style="cursor:pointer">แนบไฟล์เสียง<input id="vofile" type="file" accept="audio/*" hidden></label></div>
          ${VOICEB ? `<audio src="${URL.createObjectURL(VOICEB)}" controls style="width:100%"></audio>` : '<span class="muted" style="font-size:13px">กดอัดแล้วพูดตามจังหวะคลิปที่เล่นอยู่ (คลิปปิดเสียงให้) · ยาวได้ไม่เกินคลิป</span>'}
          <span class="muted">เสียงเดิมในคลิป</span>${chipRow([{ id: 'off', label: 'ปิดเสียงเดิม' }, { id: 'low', label: 'เบาๆ (เก็บบรรยากาศ)' }, { id: 'mid', label: 'ปานกลาง' }], D.bg || 'low', 'bg', false)}` : ''}
      </section>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">ราคา</span><b class="num" style="font-size:24px">${price()} ดาว</b></div>
        <span class="muted">ทำคลิปจริงต่อใน <a href="${R.flow}" target="_blank" rel="noopener">Google Flow</a> ด้วยบัญชี Google ของคุณเอง (ใช้เครดิต Flow ของคุณ)</span></section>`, { disabled: !VFILE || REC.on });
    const keep = () => readInputs(['product', 'avatarNote']);
    $('#vin').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 400 * 1024 * 1024) return toast('ไฟล์ใหญ่เกิน 400MB');
      keep();
      const v = document.createElement('video'); v.preload = 'metadata';
      v.onloadedmetadata = () => { if (v.duration > R.maxSec + 1) return toast(`คลิปยาว ${Math.round(v.duration)} วิ เกิน ${R.maxSec / 60} นาที`); VFILE = f; D.videoSec = v.duration; drawStep(); };
      v.onerror = () => { VFILE = f; D.videoSec = 60; drawStep(); };
      v.src = URL.createObjectURL(f);
    };
    $('#rxa').onchange = (e) => { keep(); D.remixAvatar = e.target.checked; drawStep(); };
    $('#rxv2').onchange = (e) => { keep(); D.remixVoice = e.target.checked; drawStep(); };
    app.querySelectorAll('[data-av]').forEach((b) => b.onclick = () => { keep(); D.avatarId = Number(b.dataset.av); drawStep(); });
    app.querySelectorAll('[data-amode]').forEach((b) => b.onclick = () => { keep(); D.avatarMode = b.dataset.amode; drawStep(); });
    bindChips([], keep);
    const vo = $('#vofile'); if (vo) vo.onchange = (e) => { const f = e.target.files[0]; if (!f) return; keep(); VOICEB = f; drawStep(); };
    const rb = $('#recbtn'); if (rb) rb.onclick = async () => {
      keep();
      if (REC.on) return REC.stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
        const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); const chunks = [];
        const vid = $('#rxv'); if (vid) { vid.muted = true; vid.currentTime = 0; vid.play().catch(() => {}); }
        mr.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
        mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); clearInterval(REC.timer); REC.on = false; const type = mr.mimeType || 'audio/webm'; VOICEB = new File([new Blob(chunks, { type })], `voice.${/mp4/.test(type) ? 'm4a' : 'webm'}`, { type }); if (vid) vid.pause(); drawStep(); };
        REC = { on: true, t: 0, stop: () => mr.state !== 'inactive' && mr.stop() };
        REC.timer = setInterval(() => { REC.t++; const b = $('#recbtn'); if (b) b.textContent = `⏹ หยุดอัด ${REC.t}s`; if (REC.t >= Math.ceil(D.videoSec || 60)) REC.stop(); }, 1000);
        mr.start(); drawStep();
      } catch { toast('เปิดไมค์ไม่ได้ · อนุญาตไมโครโฟนในเบราว์เซอร์ หรือแนบไฟล์เสียงแทน'); }
    };
    $('#next').onclick = () => {
      keep();
      if (!VFILE) return toast('เลือกคลิปก่อน');
      if (D.remixAvatar && !D.avatarId) return toast('เลือกอวตารก่อน (หรือปิดตัวเลือกใส่อวตาร)');
      if (D.remixVoice && !VOICEB) return toast('อัดเสียงหรือแนบไฟล์เสียงก่อน');
      D.step = 5; drawStep();
    };
  } else if (s === 2 && D.style === 'v_self') {
    const multi = VFILES.length > 1;
    if (multi) D.selfMode = 'voice';
    const voice = D.selfMode === 'voice';
    const cs = CAT.video.captionStyles;
    const total = VFILES.reduce((a, x) => a + x.sec, 0);
    const maxS = CAT.video.selfMaxSec;
    stepShell(`<section class="card"><b>คลิปของคุณ (รวมไม่เกิน ${maxS / 60} นาที · ต่อได้ถึง 8 คลิป)</b>
        <span class="muted">ถ่ายเอง หรือคลิปจาก Google Flow / AI ตัวอื่น — หลายคลิปจะต่อกันตามลำดับ แล้ว AI ดูภาพเขียนบทพากย์ไทยให้</span>
        ${VFILE && !multi ? `<video src="${URL.createObjectURL(VFILE)}" controls playsinline muted style="width:100%;max-height:420px;border-radius:12px;background:#000"></video>` : ''}
        ${VFILES.length ? `<div style="display:flex;flex-direction:column;gap:6px">${VFILES.map((x, i) => `<div class="row between" style="gap:6px"><span class="muted" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i + 1}. ${esc(x.f.name)} · ${Math.round(x.sec)} วิ</span>
            ${multi ? `<button type="button" class="chip" data-up="${i}" ${i ? '' : 'disabled'} aria-label="เลื่อนขึ้น">↑</button><button type="button" class="chip" data-dn="${i}" ${i < VFILES.length - 1 ? '' : 'disabled'} aria-label="เลื่อนลง">↓</button>` : ''}
            <button type="button" class="chip" data-rm="${i}" aria-label="ลบคลิป">✕</button></div>`).join('')}</div>
          <div class="row between"><b>รวม ${Math.round(total)} วิ</b>${VFILES.length < 8 ? '<label class="chip" for="vin" style="cursor:pointer">+ เพิ่มคลิป</label>' : ''}</div>`
          : `<label class="ref add" for="vin" style="width:100%;height:120px;cursor:pointer">+ เลือกคลิปจากเครื่อง (เลือกได้หลายคลิป)</label>${D.fromWork ? '<span class="muted">หรือใช้คลิปจากงานเดิม</span>' : ''}`}
        <input id="vin" type="file" accept="video/*" multiple hidden></section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>ทำอะไรกับเสียง</h2>
        ${multi ? '<span class="muted">หลายคลิป = AI ดูภาพแล้วพากย์ไทยทับทั้งเรื่อง</span>' : ''}
        <div class="grid2"><button type="button" class="card opt" data-mode="subs" aria-pressed="${!voice}" ${multi ? 'disabled' : ''}><b>ใส่ซับจากเสียงพูด</b><span class="muted">AI ฟังแล้วทำซับ แก้คำผิดได้ก่อนตัด</span></button>
        <button type="button" class="card opt" data-mode="voice" aria-pressed="${voice}"><b>AI ดูภาพ + พากย์ทับ</b><span class="muted">พูดตรงกับภาพในคลิป +${CAT.video.selfPrices.voiceExtra} ดาว</span></button></div></section>
      <section class="card">
        <label class="f" for="product">ชื่อสินค้า${voice ? '' : ' (ช่วยให้ซับสะกดถูก)'}<input id="product" type="text" maxlength="120" placeholder="เช่น เต้าหู้ไข่ ตราบ้านพรุ" value="${esc(D.product)}"></label>
        <label class="f" for="price">ราคา / โปร (ป้ายมุมจอ)<input id="price" type="text" maxlength="40" placeholder="เช่น ฿59" value="${esc(D.price)}"></label>
        <label class="f" for="hookText">ข้อความฮุค 3 วิแรก (ไม่บังคับ)<input id="hookText" type="text" maxlength="40" placeholder="เช่น ของดีหาดใหญ่ที่ต้องลอง!" value="${esc(D.hookText)}"></label>
        ${voice ? `<label class="f" for="details">จุดเด่นที่อยากให้ AI พูด<textarea id="details" rows="3" maxlength="600">${esc(D.details)}</textarea></label>` : ''}
      </section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>สไตล์ซับ</h2>
        <div class="grid2">${cs.map((c) => `<button type="button" class="card opt" data-cs="${c.id}" aria-pressed="${D.captionStyle === c.id}" style="align-items:center">
          <span class="capdemo cap-${c.id}">ซับตัวอย่าง</span><span class="muted">${esc(c.label)}</span></button>`).join('')}</div></section>
      <section class="card">
        <label class="row between" for="useLogo"><span><b>ใส่โลโก้ร้าน</b><br><span class="muted">${ME.brand?.logo ? 'มุมขวาบน' : 'ยังไม่มีโลโก้ในชุดแบรนด์'}</span></span>
          <input id="useLogo" type="checkbox" class="sw-in" ${D.useLogo && ME.brand?.logo ? 'checked' : ''} ${ME.brand?.logo ? '' : 'disabled'}></label>
        ${voice ? `<label class="row between" for="keepAudio"><span><b>เก็บเสียงต้นฉบับเบาๆ</b><br><span class="muted">เช่น เสียงทอด เสียงบรรยากาศ</span></span><input id="keepAudio" type="checkbox" class="sw-in" ${D.keepAudio ? 'checked' : ''}></label>` : ''}
      </section>`);
    const fields = ['product', 'price', 'hookText', 'details', 'useLogo', 'keepAudio'];
    const sync = () => { VFILE = VFILES[0]?.f || null; D.videoSec = VFILES.reduce((a, x) => a + x.sec, 0); drawStep(); };
    const dur = (f) => new Promise((ok) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => ok(v.duration || 8); v.onerror = () => ok(8); v.src = URL.createObjectURL(f); });
    $('#vin').onchange = async (e) => {
      const fs = [...e.target.files]; if (!fs.length) return;
      readInputs(fields);
      for (const f of fs) {
        if (VFILES.length >= 8) { toast('ต่อได้สูงสุด 8 คลิป'); break; }
        if (f.size > 400 * 1024 * 1024) { toast(`${f.name} ใหญ่เกิน 400MB`); continue; }
        const sec = await dur(f);
        if (VFILES.reduce((a, x) => a + x.sec, 0) + sec > maxS + 1) { toast(`รวมเกิน ${maxS / 60} นาที — ข้าม ${f.name}`); continue; }
        VFILES.push({ f, sec });
      }
      sync();
    };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); VFILES.splice(+b.dataset.rm, 1); sync(); });
    app.querySelectorAll('[data-up]').forEach((b) => b.onclick = () => { readInputs(fields); const i = +b.dataset.up; [VFILES[i - 1], VFILES[i]] = [VFILES[i], VFILES[i - 1]]; sync(); });
    app.querySelectorAll('[data-dn]').forEach((b) => b.onclick = () => { readInputs(fields); const i = +b.dataset.dn; [VFILES[i + 1], VFILES[i]] = [VFILES[i], VFILES[i + 1]]; sync(); });
    app.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { readInputs(fields); D.selfMode = b.dataset.mode; drawStep(); });
    app.querySelectorAll('[data-cs]').forEach((b) => b.onclick = () => { readInputs(fields); D.captionStyle = b.dataset.cs; drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields);
      if (!VFILE && !D.fromWork) return toast('เลือกคลิปก่อน');
      if (voice && !D.product.trim()) return toast('ใส่ชื่อสินค้าก่อน');
      D.step = 3; drawStep();
    };
  } else if (s === 2 && D.kind === 'video') {
    const st = CAT.video.styles.find((x) => x.id === D.style);
    const thumbs = (arr, key, max, id) => `<div class="refs">${arr.map((f, i) => `<button type="button" class="ref" data-rm="${key}:${i}" aria-label="ลบรูป"><img src="${URL.createObjectURL(f)}" alt=""><span>✕</span></button>`).join('')}
      ${arr.length < max ? `<label class="ref add" for="${id}" style="cursor:pointer">+ เพิ่มรูป<input id="${id}" type="file" accept="image/*" multiple hidden></label>` : ''}</div>`;
    stepShell(`<p class="muted">แนว: <b style="color:var(--fg)">${esc(st.label)}</b></p>
      ${st.variants?.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>ลูกเล่นตอนเปิด</h2>
        ${chipRow([{ id: 'random', label: '🎲 สุ่มให้' }, ...st.variants], D.variant || 'random', 'variant', false)}
        <span class="muted">สุ่มให้ = ทุกคลิปไม่ซ้ำกัน ลงคลิปถี่ๆ คนดูไม่เบื่อ</span></section>` : ''}
      <section class="card"><b>รูปสินค้า (ต้องมีอย่างน้อย 1 รูป)</b><span class="muted">รูปแรกจะถูกตัดพื้นหลังแล้วพุ่งออกมาตอนเปิด ใส่ได้ 3 รูป หลายมุมยิ่งดี</span>
        ${thumbs(REFS, 'p', 3, 'refin')}${D.fromWork && !REFS.length ? '<span class="muted">ใช้รูปจากงานเดิม</span>' : ''}</section>
      <section class="card">
        <label class="f" for="product">ชื่อสินค้า<input id="product" type="text" maxlength="120" placeholder="เช่น เซรั่มวิตซี ขวดฟ้า" value="${esc(D.product)}"></label>
        <label class="f" for="price">ราคา / โปร (ขึ้นป้ายในคลิป)<input id="price" type="text" maxlength="40" placeholder="เช่น ฿199 หรือ ลด 50%" value="${esc(D.price)}"></label>
        <label class="f" for="details">จุดเด่นที่อยากให้พูด<textarea id="details" rows="3" maxlength="600" placeholder="เช่น ซึมไว ไม่เหนียว กลิ่นหอม ขายดีอันดับ 1 ในร้าน">${esc(D.details)}</textarea></label>
      </section>
      <section class="card"><b>แคปรีวิวลูกค้า (ไม่บังคับ)</b><span class="muted">ภาพหน้าจอรีวิวจาก Shopee / TikTok จะเด้งแปะในคลิป ใส่ได้ 3 รูป</span>${thumbs(REVS, 'r', 3, 'revin')}</section>`);
    const fields = ['product', 'price', 'details'];
    bindChips([]);
    const addFiles = (arr, e) => [...arr, ...[...e.target.files].filter((f) => f.type.startsWith('image/'))].slice(0, 3);
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); REFS = addFiles(REFS, e); drawStep(); };
    const rv = $('#revin'); if (rv) rv.onchange = (e) => { readInputs(fields); REVS = addFiles(REVS, e); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); const [k, i] = b.dataset.rm.split(':'); (k === 'p' ? REFS : REVS).splice(Number(i), 1); drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields);
      if (!REFS.length && !D.fromWork) return toast('ใส่รูปสินค้าอย่างน้อย 1 รูป');
      if (!D.product.trim()) return toast('ใส่ชื่อสินค้าก่อน');
      D.step = 3; drawStep();
    };
  } else if (s === 2) {
    const st = CAT.styles.find((x) => x.id === D.style);
    const ag = st.agent;
    stepShell(`<p class="muted">แนว: <b style="color:var(--fg)">${esc(st.label)}</b></p>
      <section class="card">
        ${ag ? digestCard() : ''}
        <label class="f" for="product">${ag ? 'แผน / ทรัพย์ / หัวข้อ' : 'ชื่อสินค้า / เรื่อง'}<input id="product" type="text" maxlength="120" placeholder="${ag ? 'เช่น ประกันสุขภาพเหมาจ่าย, คอนโดใกล้ ม.อ.' : 'เช่น ข้าวมันไก่ต้ม, เซรั่มวิตซี'}" value="${esc(D.product)}"></label>
        ${st.text ? `<label class="f" for="headline">ข้อความหลักบนภาพ (สั้นๆ)<input id="headline" type="text" maxlength="60" placeholder="เช่น เปิดใหม่! อร่อยต้องลอง" value="${esc(D.headline)}"></label>
        ${TEXT_PRESETS[st.id] ? `<div style="display:flex;flex-direction:column;gap:6px"><span class="muted" style="font-size:13px">แนวข้อความสำหรับ${esc(st.label)} · แตะเพื่อใช้</span>
          <div class="chips">${TEXT_PRESETS[st.id].map(([h, sub], i) => `<button type="button" class="chip" data-preset="${i}" style="min-height:34px;padding:5px 12px;font-size:13px">${esc(h)}${sub ? ` · <span class="muted">${esc(sub)}</span>` : ''}</button>`).join('')}</div></div>` : ''}
        <label class="f" for="price">${st.pr ? 'ข้อความรอง (ไม่บังคับ)' : st.id === 'agent_listing' ? 'ราคา (ไม่บังคับ)' : ag ? 'ข้อความรอง / ข้อเสนอเด่น (ไม่บังคับ)' : 'ราคา / โปร (ไม่บังคับ)'}<input id="price" type="text" maxlength="40" placeholder="${st.pr ? 'เช่น ขอเชิญร่วมงาน' : st.id === 'agent_listing' ? 'เช่น 2.59 ล้าน / เช่า 8,500/เดือน' : ag ? 'เช่น ปรึกษาฟรี ไม่มีค่าใช้จ่าย' : 'เช่น 59.- หรือ ซื้อ 1 แถม 1'}" value="${esc(D.price)}"></label>` : ''}
        <label class="f" for="details">${ag ? 'ข้อมูล / จุดเด่น (AI ใช้เฉพาะที่ใส่ไว้)' : 'รายละเอียดเพิ่ม (ไม่บังคับ)'}<textarea id="details" rows="${ag ? 5 : 3}" maxlength="600" placeholder="${st.pr ? 'เนื้อหาประกาศ ผู้เข้าร่วม เงื่อนไข บรรยากาศที่อยากได้' : ag ? 'เช่น ค่าห้อง 5,000/คืน ผ่าตัดเหมาจ่าย · หรือ 3 นอน 2 น้ำ 52 ตร.ว.' : 'จุดเด่น วัตถุดิบ กลุ่มลูกค้า บรรยากาศที่อยากได้'}">${esc(D.details)}</textarea></label>
        <div id="warn"></div>
      </section>
      ${st.pr ? `<section class="card"><b>ข้อมูลบนภาพ</b>${infoFields(['org', 'date', 'place', 'contact'])}</section>` : ''}
      ${st.ad ? `<section class="card"><b>ข้อมูลบนโปสเตอร์</b><span class="muted">ใส่รูปสินค้าจริง/โปสเตอร์เดิมด้านล่าง AI จะทำให้ดูพรีเมียมขึ้น · สาขาและเบอร์โทรระบบพิมพ์เอง สะกดถูกแน่นอน</span>${infoFields(['sub', 'feats', 'place', 'contact'])}</section>` : ''}
      ${st.id === 'model_show' ? `<section class="card"><b>นางแบบ / นายแบบ</b>${chipRow(CAT.modelWho, D.modelWho, 'modelWho', false)}
        <b>ลุค</b>${chipRow(CAT.modelLooks, D.modelLook, 'modelLook', false)}
        <span class="muted">${D.modelLook === 'glam' ? 'เซ็กซี่ระดับแคตตาล็อกชุดว่ายน้ำ/ชุดชั้นใน ไม่โป๊ ไม่ส่อเพศ · TikTok/Facebook/Shopee อาจจำกัดการมองเห็นโพสต์ที่เซ็กซี่มาก ถ้าใช้ยิงแอด เลือก "สุภาพ" จะผ่านง่ายกว่า' : 'เหมาะทุกแพลตฟอร์ม และยิงแอดได้'} · นางแบบ/นายแบบเป็นบุคคลสมมติ (ผู้ใหญ่) สร้างโดย AI</span></section>` : ''}
      ${ag ? `<section class="card"><b>ข้อมูลตัวแทนบนภาพ (ไม่บังคับ)</b>${infoFields(st.id === 'agent_listing' ? ['place', 'contact', 'license'] : ['org', 'contact', 'license'])}</section>` : ''}
      <section class="card"><b>${st.pr ? 'รูปประกอบ (ไม่บังคับ)' : ag ? ({ agent_listing: 'รูปทรัพย์จริง (แนะนำ)', agent_profile: 'รูปตัวคุณ (แนะนำ)' }[st.id] || 'รูปประกอบ (ไม่บังคับ)') : 'ภาพสินค้าจริง (ไม่บังคับ แต่แนะนำ)'}</b><span class="muted">${st.pr ? 'เช่น รูปสถานที่ บุคคล โลโก้งาน ใส่ได้ 3 รูป' : ag ? 'รูปที่ใส่ตรงนี้ AI จะใช้เป็นของจริง (บ้าน รถ หน้าคุณ) ไม่แต่งใหม่ · โปสเตอร์ที่ให้ AI สรุป ใส่ในกล่องด้านบนแทน' : 'ใส่ได้ 3 รูป AI จะใช้สินค้าจริงของคุณ ไม่แต่งสินค้าใหม่'}</span>
        <div class="refs">${REFS.map((f, i) => `<button type="button" class="ref" data-rm="${i}" aria-label="ลบรูปที่ ${i + 1}"><img src="${URL.createObjectURL(f)}" alt=""><span>✕</span></button>`).join('')}
          ${REFS.length < 3 ? '<label class="ref add" for="refin" style="cursor:pointer">+ เพิ่มรูป<input id="refin" type="file" accept="image/*" multiple hidden></label>' : ''}</div>
        ${D.fromWork && !REFS.length ? '<span class="muted">ใช้รูปสินค้าจากงานเดิม</span>' : ''}</section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>คอนเซปต์ (เลือกได้ 5)</h2>${chipRow(CAT.concepts, D.concepts, 'concepts', true)}</section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>ขนาดภาพ</h2>${chipRow(CAT.ratios, D.ratio || st.ratio, 'ratio', false)}</section>
      <section class="card">
        <label class="row between" for="useLogo"><span><b>ใส่โลโก้ร้านมุมขวาบน</b><br><span class="muted">${ME.brand?.logo ? 'ใช้โลโก้จากชุดแบรนด์' : 'ยังไม่มีโลโก้ · ตั้งค่าในโปรไฟล์ > ชุดแบรนด์'}</span></span>
          <input id="useLogo" type="checkbox" class="sw-in" ${D.useLogo && ME.brand?.logo ? 'checked' : ''} ${ME.brand?.logo ? '' : 'disabled'}></label>
        ${st.text && ME.brand?.shopName ? `<label class="row between" for="showShop"><span><b>ใส่ชื่อร้านบนภาพ</b><br><span class="muted">${esc(ME.brand.shopName)}</span></span><input id="showShop" type="checkbox" class="sw-in" ${D.showShop ? 'checked' : ''}></label>` : ''}
      </section>`);
    bindChips(['concepts'], (k) => { if (k === 'concepts' && D.concepts.length > 5) { D.concepts.pop(); drawStep(); toast('เลือกได้สูงสุด 5'); } if (k === 'modelLook') { readInputs(['product', 'headline', 'price', 'details', 'useLogo', 'showShop']); drawStep(); } });
    const fields = ['product', 'headline', 'price', 'details', 'useLogo', 'showShop'];
    bindDigest(fields);
    app.querySelectorAll('[data-preset]').forEach((b) => b.onclick = () => {
      const [h, sub] = TEXT_PRESETS[st.id][Number(b.dataset.preset)];
      $('#headline').value = h; if (sub && $('#price')) $('#price').value = sub;
      app.querySelectorAll('[data-preset]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); readInfo(); REFS = [...REFS, ...[...e.target.files].filter((f) => f.type.startsWith('image/'))].slice(0, 3); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); readInfo(); REFS.splice(Number(b.dataset.rm), 1); drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields); readInfo();
      if (!D.product.trim() && !D.headline?.trim() && !D.details.trim()) return toast('ใส่ชื่อสินค้าหรือรายละเอียดอย่างน้อย 1 อย่าง');
      D.step = 3; drawStep();
    };
  } else if (s === 3) {
    const saved = ME.hashtags || [];
    const vidAll = D.kind === 'video';
    const vid = vidAll && !(D.style === 'v_self' && D.selfMode !== 'voice') && D.style !== 'v_drama' && D.style !== 'v_series' && D.style !== 'v_motion' && D.style !== 'v_avatar'; // มีบทพากย์ (ละคร AI เลือกเสียงเอง)
    const fm = vid && !INFO_IDS.includes(D.style) ? CAT.video.formulas.filter((f) => !(D.style === 'v_top' && (f.dialogue || f.id === 'pas' || f.id === 'story'))) : [];
    if (vid && fm.length && (!D.formula || !fm.some((f) => f.id === D.formula))) D.formula = (fm.find((f) => f.rec.includes(D.goal)) || fm[0]).id;
    const dlg = vid && fm.find((f) => f.id === D.formula)?.dialogue;
    if (dlg) D.premiumVoice = false;
    stepShell(`${vid && fm.length ? `<h1 style="font-size:22px">เล่าเรื่องแบบไหน?</h1>
      <div class="grid2">${fm.map((f) => `<button type="button" class="card opt" data-formula="${f.id}" aria-pressed="${D.formula === f.id}">
        <b>${esc(f.label)}${f.rec.includes(D.goal) ? ' <span class="badge b-lime">แนะนำ</span>' : ''}</b><span class="muted">${esc(f.desc)}</span></button>`).join('')}</div>
      <h2>สไตล์การเขียน</h2>` : `<h1 style="font-size:22px">${D.style?.startsWith('v_pr') || D.goal === 'pr' ? 'โทนแคปชั่น (งานประชาสัมพันธ์ใช้ภาษาทางการให้อัตโนมัติ)' : 'แคปชั่นสไตล์ไหน?'}</h1>`}
      <p class="muted">AI เขียนแคปชั่นให้ 1 แบบ ใช้ได้ทุกแพลตฟอร์ม · เลือกสไตล์การเขียน${D.link ? ' · ใส่ลิงก์ให้' : ''}</p>
      ${chipRow(CAT.tones, D.tone || CAT.tones[0], 'tone', false)}
      <section style="display:flex;flex-direction:column;gap:10px"><h2>แฮชแท็กประจำ</h2>
        ${saved.length ? chipRow(saved, D.hashtags, 'hashtags', true) : '<p class="muted">ยังไม่มีแฮชแท็กประจำ</p>'}
        <div class="row" style="gap:8px"><input type="text" id="newTag" placeholder="#แท็กใหม่" aria-label="เพิ่มแฮชแท็กประจำ"><button type="button" class="btn sm dark" id="saveTag">บันทึกแท็ก</button></div></section>
      <label class="f" for="extraTags">แท็กเพิ่มเฉพาะงานนี้<input id="extraTags" type="text" placeholder="#โปรเดือนนี้ #ของมันต้องมี" value="${esc(D.extraTags)}"></label>
      <span class="muted">AI จะเติมแท็กที่เกี่ยวข้องให้อีก 5–8 แท็ก</span>
      ${vidAll ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>เพลงประกอบ</h2>
        ${chipRow(CAT.video.music, D.music || 'auto', 'music', false)}<span class="muted">เพลงแต่งเองของ Mc Rich ไม่ติดลิขสิทธิ์${vid ? '' : ' · เปิดเบาๆ ใต้เสียงพูด'}</span></section>` : ''}
      ${vid ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>${dlg ? 'เสียงคนที่ 1 (คนป้ายยา)' : 'เสียงพากย์'}</h2>
        ${dlg ? '<span class="muted">บทคุยกัน 2 คน · เสียงคนที่ 2 ระบบเลือกเพศตรงข้ามให้อัตโนมัติ</span>' : ''}
        ${CAT.video.premiumVoices.length && !dlg ? `<div class="grid2"><button type="button" class="card opt" data-prem="0" aria-pressed="${!D.premiumVoice}"><b>มาตรฐาน</b><span class="muted">รวมในราคา</span></button>
          <button type="button" class="card opt" data-prem="1" aria-pressed="${!!D.premiumVoice}"><b>พรีเมียม</b><span class="muted">เสียงเนียนขึ้น +${CAT.video.premiumExtra} ดาว</span></button></div>` : ''}
        ${chipRow((D.premiumVoice ? CAT.video.premiumVoices : CAT.video.voices).map((v) => ({ id: v.id, label: (v.gender === 'female' ? '👩 ' : '👨 ') + v.label.replace('พรีเมียม · ', '') })), D.voice, 'voice', false)}</section>` : ''}`);
    if (!D.tone) D.tone = CAT.tones[0];
    if (vid) {
      const vl = D.premiumVoice ? CAT.video.premiumVoices : CAT.video.voices;
      if (!vl.some((v) => v.id === D.voice)) { D.voice = vl[0].id; app.querySelector(`.chip[data-k="voice"][data-v="${D.voice}"]`)?.setAttribute('aria-pressed', 'true'); }
      app.querySelectorAll('[data-prem]').forEach((b) => b.onclick = () => { readInputs(['extraTags']); D.premiumVoice = b.dataset.prem === '1'; D.voice = ''; drawStep(); });
      app.querySelectorAll('[data-formula]').forEach((b) => b.onclick = () => { readInputs(['extraTags']); D.formula = b.dataset.formula; drawStep(); });
    }
    bindChips(['hashtags']);
    const saveTag = async () => {
      const add = $('#newTag').value.split(/[\s,]+/).map((x) => x.trim().replace(/^#*/, '#')).filter((x) => x.length > 1);
      if (!add.length) return toast('พิมพ์แท็กก่อน');
      readInputs(['extraTags']);
      try {
        ME = await api('api/profile/hashtags', { method: 'PUT', body: { hashtags: [...new Set([...(ME.hashtags || []), ...add])] } });
        D.hashtags = [...new Set([...D.hashtags, ...add.filter((t) => (ME.hashtags || []).includes(t))])];
        toast('บันทึกเป็นแท็กประจำแล้ว'); drawStep();
      } catch (e) { toast(e.message); }
    };
    $('#saveTag').onclick = saveTag;
    $('#newTag').onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); saveTag(); } };
    $('#next').onclick = () => { readInputs(['extraTags']); D.step = 4; drawStep(); };
  } else if (s === 4 && D.style === 'v_tips') {
    D.length = D.count === 5 ? 45 : 30;
    const total = CAT.video.prices[D.length] + (D.premiumVoice ? CAT.video.premiumExtra : 0);
    stepShell(`<h1 style="font-size:22px">ราคา</h1>
      <div class="list kv"><div><span class="muted">จำนวนทิป</span><span>${D.count} ทิป (~${D.length} วิ)</span></div></div>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">รวม</span><b class="num" style="font-size:28px">${ICON.star}${total} ดาว</b></div>
        <span class="muted">การ์ดความรู้ขยับได้ทีละข้อ + เสียงบรรยาย + ซับ</span></section>
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4 && D.style === 'v_avatar') {
    const A = CAT.video.avatar, PR = D.quality === 'pro' && A.pro ? A.proPrices : A.prices, total = PR[D.length] || PR[30];
    stepShell(`<h1 style="font-size:22px">ราคา</h1>
      <div class="list kv"><div><span class="muted">อวตาร</span><span>${esc(AVS.find((a) => a.id === D.avatarId)?.name || '')}</span></div>
        <div><span class="muted">ภาษา</span><span>${esc(A.langs.find((l) => l.id === D.lang)?.label || '')}</span></div>
        <div><span class="muted">ความยาว</span><span>~${D.length} วิ · 9:16 · 1080p</span></div>
        ${A.std && A.pro ? `<div><span class="muted">คุณภาพ</span><span>${D.quality === 'pro' ? 'พรีเมียม' : 'มาตรฐาน'}</span></div>` : ''}</div>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">รวม</span><b class="num" style="font-size:28px">${ICON.star}${total} ดาว</b></div>
        <span class="muted">อวตารขยับปากตามเสียงจริง ใช้เวลา 3–10 นาที (อวตารใหม่ครั้งแรกนานขึ้นอีกนิด) · ไม่สำเร็จคืนดาวอัตโนมัติ</span></section>
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4 && D.style === 'v_motion') {
    const total = CAT.video.motionPrice;
    stepShell(`<h1 style="font-size:22px">ราคา</h1>
      <div class="list kv"><div><span class="muted">แนวช็อต</span><span>${esc(CAT.video.motionPresets.find((m) => m.id === D.preset)?.label || '')}</span></div>
        <div><span class="muted">รูปสินค้า</span><span>${REFS.length || D.fromWork ? 'ใช้รูปจริง' : 'ไม่มี (AI วาดเอง)'}</span></div>
        <div><span class="muted">ความยาว</span><span>ประมาณ 10 วิ · 9:16 · 720p</span></div></div>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">รวม</span><b class="num" style="font-size:28px">${ICON.star}${total} ดาว</b></div>
        <span class="muted">วิดีโอเคลื่อนไหวจริงจาก AI รุ่นใหม่ มีดนตรีและเสียงเอฟเฟกต์ ใช้เวลา 2–6 นาที · ถ้าสร้างไม่สำเร็จคืนดาวอัตโนมัติ</span></section>
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4 && D.style === 'v_series') {
    const total = (CAT.video.seriesPrices[D.scenes] || CAT.video.seriesPrices[4]) + (D.motion && CAT.video.seriesMotion ? (CAT.video.seriesMotion[D.scenes] || CAT.video.seriesMotion[4]).price : 0);
    stepShell(`<h1 style="font-size:22px">ราคา</h1>
      <div class="list kv"><div><span class="muted">เรื่อง</span><span>${esc(D.seriesInfo ? `${D.seriesInfo.title} EP.${(D.seriesInfo.ep || 1) + 1}` : (D.product || 'ให้ AI ตั้งชื่อ'))}</span></div>
        <div><span class="muted">แนว</span><span>${esc(CAT.video.seriesGenres.find((g) => g.id === D.genre)?.label || '')}</span></div>
        <div><span class="muted">สไตล์ภาพ</span><span>${esc(CAT.video.art.find((a) => a.id === D.art)?.label || '')}</span></div>${D.motion && CAT.video.seriesMotion ? `<div><span class="muted">ตัวละครขยับ</span><span>${(CAT.video.seriesMotion[D.scenes] || CAT.video.seriesMotion[4]).n} ฉากเด่น (+${(CAT.video.seriesMotion[D.scenes] || CAT.video.seriesMotion[4]).price} ดาว)</span></div>` : ''}
        <div><span class="muted">ความยาว</span><span>${D.scenes} ฉาก (~${CAT.video.seriesLen[D.scenes]} วิ)</span></div></div>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">รวม</span><b class="num" style="font-size:28px">${ICON.star}${total} ดาว</b></div>
        <span class="muted">AI เขียนบท วาดทุกฉาก พากย์หลายเสียง ใส่ซับชื่อตัวละคร ใช้เวลา 4–10 นาที</span></section>
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4 && D.style === 'v_drama') {
    const total = CAT.video.dramaPrices[D.scenes] || CAT.video.dramaPrices[4];
    stepShell(`<h1 style="font-size:22px">ราคา</h1>
      <div class="list kv"><div><span class="muted">แนวเรื่อง</span><span>${esc(CAT.video.genres.find((g) => g.id === D.genre)?.label || '')}</span></div>
        <div><span class="muted">สไตล์ภาพ</span><span>${esc(CAT.video.art.find((a) => a.id === D.art)?.label || '')}</span></div>
        <div><span class="muted">ฉาก</span><span>${D.scenes} ฉาก (~${D.scenes === 6 ? 45 : 30} วิ)</span></div></div>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">รวม</span><b class="num" style="font-size:28px">${ICON.star}${total} ดาว</b></div>
        <span class="muted">AI เขียนบท วาดทุกฉาก พากย์หลายเสียงตามตัวละคร ใส่ซับชื่อคน และปิดท้ายด้วยสินค้าจริง ใช้เวลา 4–8 นาที</span></section>
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4 && D.style === 'v_top') {
    D.length = D.items.length <= 3 ? 30 : 45;
    const total = CAT.video.prices[D.length] + (D.premiumVoice ? CAT.video.premiumExtra : 0);
    stepShell(`<h1 style="font-size:22px">ราคา</h1>
      <div class="list kv"><div><span class="muted">สินค้า</span><span>${D.items.length} ชิ้น</span></div><div><span class="muted">ความยาวคลิป</span><span>ประมาณ ${D.length} วิ</span></div></div>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">รวม</span><b class="num" style="font-size:28px">${ICON.star}${total} ดาว</b></div>
        <span class="muted">แคปชั่นมีรายการสินค้าพร้อมลิงก์แต่ละชิ้น (นับคลิกแยกได้)</span></section>
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4 && D.style === 'v_self') {
    const sp = CAT.video.selfPrices;
    const base = D.videoSec <= 60 ? sp.subs[0] : D.videoSec <= 120 ? sp.subs[1] : sp.subs[2];
    const total = base + (D.selfMode === 'voice' ? sp.voiceExtra : 0) + (D.premiumVoice && D.selfMode === 'voice' ? CAT.video.premiumExtra : 0);
    stepShell(`<h1 style="font-size:22px">ราคา</h1>
      <div class="list kv"><div><span class="muted">ความยาวคลิป</span><span>${Math.round(D.videoSec) || '-'} วินาที</span></div>
        <div><span class="muted">ไม่เกิน 1 นาที / 2 นาที / 3 นาที</span><span>${sp.subs.join(' / ')} ดาว</span></div>
        ${D.selfMode === 'voice' ? `<div><span class="muted">AI เขียนบท + พากย์</span><span>+${sp.voiceExtra} ดาว</span></div>` : ''}</div>
      <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">รวม</span><b class="num" style="font-size:28px">${ICON.star}${total} ดาว</b></div>
        <span class="muted">${D.selfMode === 'voice' ? 'ได้คลิปพร้อมเสียงพากย์ + ซับ + เพลง + ป้ายราคา' : 'AI ถอดเสียงให้ตรวจแก้คำผิดก่อน แล้วค่อยตัดต่อ · แก้ซับแล้วตัดใหม่ฟรี 1 ครั้ง'}</span></section>
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4 && D.kind === 'video') {
    const price = (l) => CAT.video.prices[l] + (D.premiumVoice ? CAT.video.premiumExtra : 0);
    stepShell(`<h1 style="font-size:22px">ความยาวคลิป</h1>
      <div style="display:flex;flex-direction:column;gap:10px">${CAT.video.lengths.map((l) => `<button type="button" class="card opt tier" data-len="${l.id}" aria-pressed="${Number(D.length) === l.id}">
        <span class="row between" style="width:100%"><b>${esc(l.label)}</b><b class="num" style="color:var(--lime-text)">${ICON.star}${price(l.id)} ดาว</b></span>
        <span class="muted">${{ 15: 'สั้น กระชับ เหมาะ Reels/TikTok ป้ายยาเร็ว', 30: 'ยอดนิยม เล่าจุดเด่นได้ครบ', 45: 'เล่าละเอียด เหมาะสินค้าราคาสูง' }[l.id] || ''}</span></button>`).join('')}</div>
      <p class="muted">คลิป 9:16 1080p พร้อมซับไทย ป้ายราคา และปุ่มชวนซื้อ · ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    app.querySelectorAll('[data-len]').forEach((b) => b.onclick = () => { D.length = Number(b.dataset.len); drawStep(); });
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4) {
    const free = CAT.free.today + CAT.free.welcome;
    const rec = CAT.styles.find((x) => x.id === D.style)?.rec || 'std';
    // เข้าหน้านี้ครั้งแรกของแต่ละแนว: เลือกให้ถูกที่สุดก่อน (ฟรีถ้ามีโควตา ไม่งั้นตามที่แนะนำ)
    if (D.tierFor !== D.style) { D.tierFor = D.style; D.tier = free ? 'free' : rec; if (D.tier === 'free') D.versions = 1; }
    if (D.tier === 'free' && !free) D.tier = rec;
    const cost = (t) => t.free ? 0 : t.stars * D.versions;
    stepShell(`<h1 style="font-size:22px">เลือกคุณภาพ</h1>
      <div style="display:flex;flex-direction:column;gap:10px">${CAT.tiers.map((t) => {
        const dis = t.free && !free;
        return `<button type="button" class="card opt tier" data-tier="${t.id}" aria-pressed="${D.tier === t.id}" ${dis ? 'disabled' : ''}>
          <span class="row between" style="width:100%"><b>${esc(t.label)} <span class="muted">${esc(t.size)}</span>${t.id === rec ? ' <span class="badge b-lime">แนะนำงานนี้</span>' : ''}</b>
          <b class="num" style="color:var(--lime-text)">${t.free ? `ฟรี · เหลือ ${free}` : `${ICON.star}${cost(t)} ดาว`}</b></span>
          <span class="muted">${esc(t.note)}${dis ? ' · ภาพฟรีหมดแล้ว (ได้ใหม่พรุ่งนี้ 1 ภาพ)' : ''}</span></button>`;
      }).join('')}</div>
      ${D.tier !== 'free' ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>จำนวนภาพ (ได้หลายแบบให้เลือก)</h2>
        <div class="chips">${[1, 2, 3, 4].map((n) => `<button type="button" class="chip" data-n="${n}" aria-pressed="${D.versions === n}">${n} แบบ</button>`).join('')}</div></section>` : ''}
      <p class="muted">ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะกดยืนยันหน้าถัดไป</p>`);
    app.querySelectorAll('[data-tier]').forEach((b) => b.onclick = () => { D.tier = b.dataset.tier; if (D.tier === 'free') D.versions = 1; drawStep(); });
    app.querySelectorAll('[data-n]').forEach((b) => b.onclick = () => { D.versions = Number(b.dataset.n); drawStep(); });
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 5) reviewStep().catch((e) => toast(e.message));
}

function uploadWithProgress(url, fd, onp) {
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest();
    x.open('POST', url); x.withCredentials = true;
    x.upload.onprogress = (e) => { if (e.lengthComputable) onp(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} if (x.status >= 200 && x.status < 300) ok(j); else bad(new Error(j.error || `อัปโหลดไม่สำเร็จ (${x.status})`)); };
    x.onerror = () => bad(new Error('อัปโหลดไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองใหม่'));
    x.send(fd);
  });
}
function styleNote(x) {
  const V2 = CAT.video;
  return { v_flow: `เริ่ม ${V2.selfPrices.subs[0] + V2.selfPrices.voiceExtra} ดาว · ต่อคลิป + AI พากย์ตามภาพ`, v_pixel: `เริ่ม ${V2.seriesPrices[4]} ดาว · ซีรีส์ภาพพิกเซล`, v_stick: `เริ่ม ${V2.seriesPrices[4]} ดาว · เรื่องเล่าชีวิต`, v_remix: `เริ่ม ${V2.remix?.prices?.base?.[0]?.[1] || 9} ดาว · พรอมต์ Flow ทีละฉาก`, v_self: `เริ่ม ${V2.selfPrices.subs[0]} ดาว · ซับอัตโนมัติ`, v_top: `เริ่ม ${V2.prices[30]} ดาว · 2–5 สินค้า`, v_drama: `เริ่ม ${V2.dramaPrices[4]} ดาว · AI วาดฉาก+หลายเสียง`, v_series: `เริ่ม ${V2.seriesPrices[4]} ดาว · ต่อเป็นตอนๆ ได้`, v_motion: `${V2.motionPrice} ดาว · ภาพเคลื่อนไหวจริง ~10 วิ`, v_avatar: `เริ่ม ${V2.avatar?.std === false ? V2.avatar?.proPrices?.[15] : V2.avatar?.prices?.[15]} ดาว · พูด ไทย/EN/中文/Melayu`,
    v_show: `เริ่ม ${V2.prices[15]} ดาว · 2–8 รูป`, v_tips: `เริ่ม ${V2.prices[30]} ดาว · 3 หรือ 5 ทิป`, v_shop: `เริ่ม ${V2.prices[15]} ดาว · รูปร้าน+ข้อมูล`,
    v_pr_announce: `เริ่ม ${V2.prices[15]} ดาว · เสียงทางการ`, v_pr_recap: `เริ่ม ${V2.prices[15]} ดาว · จากรูปกิจกรรม` }[x.id] || `เริ่ม ${V2.prices[15]} ดาว · 9:16`;
}
const INFO_IDS = ['v_tips', 'v_shop', 'v_pr_announce', 'v_pr_recap', 'v_agent_plan', 'v_agent_tips', 'v_agent_listing'];
const infoFields = (keys) => {
  const L = { org: ['ชื่อหน่วยงาน / ร้าน', ME.brand?.shopName || ''], date: ['วัน เวลา', 'เช่น 5 ธ.ค. 69 เวลา 09.00 น.'], place: ['สถานที่', 'เช่น หอประชุม อบต.บ้านพรุ'], contact: ['ติดต่อ', 'เช่น โทร 074-xxx-xxx / LINE @...'], hours: ['เวลาเปิด', 'เช่น ทุกวัน 07.00–19.00'], license: ['เลขที่ใบอนุญาตตัวแทน/นายหน้า', 'ใส่แล้วจะขึ้นท้ายแคปชั่น'] };
  if (D.goal === 'agent') { L.org = ['สังกัด / บริษัท / ทีม', 'ใส่เฉพาะที่ได้รับอนุญาตให้ใช้ชื่อ']; L.place = ['ทำเล / ที่ตั้ง', 'เช่น ใกล้ ม.อ. หาดใหญ่']; L.contact = ['ติดต่อ', 'เช่น โทร 08x-xxx-xxxx / LINE @...']; }
  L.sub = ['ข้อความรองใต้หัวข้อ', 'เช่น หอม เข้มข้น สะใจกว่าเดิม!']; L.feats = ['จุดเด่นข้างไอคอน (คั่นด้วย , ไม่เกิน 3)', 'เช่น หิ้วง่าย, ละลายช้า, พกสะดวก'];
  if (D.style === 'ad_poster') { L.place = ['สาขา / ที่อยู่ (ระบบพิมพ์ให้คมชัด)', 'เช่น สาขาท่าสะอ้าน']; L.contact = ['เบอร์โทร (ระบบพิมพ์ให้คมชัด)', 'เช่น 080-516-1462']; }
  D.info = D.info || {};
  if (keys.includes('contact') && D.style === 'ad_poster' && !D.info.contact && ME.brand?.phone) D.info.contact = ME.brand.phone;
  if (keys.includes('org') && !D.info.org && ME.brand?.shopName && D.goal !== 'agent') D.info.org = ME.brand.shopName;
  return keys.map((k) => `<label class="f" for="info_${k}">${L[k][0]}<input id="info_${k}" type="text" maxlength="100" placeholder="${esc(L[k][1])}" value="${esc(D.info[k] || '')}"></label>`).join('');
};
let SRCF = [];
const digestCard = () => `<div class="card" style="background:var(--acc-card);border-color:var(--acc-line);gap:8px">
  <b>✨ ให้ AI สรุปจากโปสเตอร์ / โบรชัวร์ / ข้อความ</b>
  <span class="muted">แนบภาพโปสเตอร์ แผ่นพับ ตารางผลประโยชน์ หรือวางข้อความ AI จะสรุปจุดเด่นมาใส่ช่องด้านล่างให้แก้ต่อ (ใช้เฉพาะข้อมูลในเอกสาร ไม่แต่งตัวเลขเพิ่ม)</span>
  <div class="refs">${SRCF.map((f, i) => `<button type="button" class="ref" data-srm="${i}" aria-label="ลบเอกสาร"><img src="${URL.createObjectURL(f)}" alt=""><span>✕</span></button>`).join('')}
    ${SRCF.length < 4 ? '<label class="ref add" for="srcin" style="cursor:pointer">+ โปสเตอร์<input id="srcin" type="file" accept="image/*" multiple hidden></label>' : ''}</div>
  <textarea id="srctext" rows="3" maxlength="6000" placeholder="หรือวางข้อความจากโบรชัวร์ / ประกาศขาย / ไลน์บริษัท ที่นี่">${esc(D.srcText || '')}</textarea>
  <button type="button" class="btn dark" id="digest">สรุปให้เลย (ฟรี)</button><div id="dgout"></div></div>`;
function bindDigest(fields) {
  const keep = () => { readInputs(fields); readInfo(); const t = $('#srctext'); if (t) D.srcText = t.value; };
  const si = $('#srcin'); if (si) si.onchange = (e) => { keep(); SRCF = [...SRCF, ...[...e.target.files].filter((f) => f.type.startsWith('image/'))].slice(0, 4); drawStep(); };
  app.querySelectorAll('[data-srm]').forEach((b) => b.onclick = () => { keep(); SRCF.splice(Number(b.dataset.srm), 1); drawStep(); });
  const bt = $('#digest'); if (!bt) return;
  bt.onclick = async () => {
    keep();
    if (!SRCF.length && !String(D.srcText || '').trim()) return toast('แนบโปสเตอร์หรือวางข้อความก่อน');
    const fd = new FormData(); SRCF.forEach((f) => fd.append('src', f)); fd.append('text', D.srcText || ''); fd.append('agentType', D.agentType || 'insurance'); fd.append('style', D.style || '');
    bt.disabled = true; bt.textContent = 'AI กำลังอ่านเอกสาร… (10–30 วิ)';
    try {
      const r = await api('api/agent/digest', { method: 'POST', body: fd });
      if (r.product) D.product = r.product;
      if (r.headline) D.headline = r.headline;
      if (r.sub) D.price = r.sub;
      if (r.details) D.details = r.details;
      D.info = D.info || {};
      for (const [k, v] of Object.entries(r.info || {})) if (v && !D.info[k]) D.info[k] = v;
      D.digestNote = r.unclear || '';
      drawStep();
      toast('สรุปแล้ว ตรวจและแก้ข้อมูลก่อนไปต่อ');
      const o = $('#dgout'); if (o && D.digestNote) o.innerHTML = `<span class="muted">⚠️ ข้อมูลที่อ่านไม่ชัด/ขาด: ${esc(D.digestNote)}</span>`;
    } catch (e) { toast(e.message); bt.disabled = false; bt.textContent = 'สรุปให้เลย (ฟรี)'; }
  };
}
const readInfo = () => { D.info = D.info || {}; app.querySelectorAll('[id^="info_"]').forEach((el) => { D.info[el.id.slice(5)] = el.value; }); };
const payload = () => ({ ...D, hasPhotos: REFS.length > 0, hasVoice: !!VOICEB, hashtags: [...D.hashtags, ...String(D.extraTags || '').split(/[\s,]+/).filter(Boolean)] });
async function reviewStep() {
  stepShell('<p class="muted">กำลังคำนวณ…</p>', { next: 'ยืนยัน', disabled: true });
  const qt = await api('api/works/quote', { method: 'POST', body: payload() });
  const vid = D.kind === 'video';
  const st = (vid ? CAT.video.styles : CAT.styles).find((x) => x.id === D.style);
  const tier = vid ? null : CAT.tiers.find((t) => t.id === D.tier);
  const goal = CAT.goals.find((g) => g.id === D.goal);
  const vname = vid ? (D.premiumVoice ? CAT.video.premiumVoices : CAT.video.voices).find((v) => v.id === D.voice)?.label : '';
  const row = (k, v) => v ? `<div><span class="muted">${k}</span><span style="text-align:right">${esc(v)}</span></div>` : '';
  const label = qt.blocked ? 'สร้างไม่ได้' : qt.free ? 'ยืนยัน สร้างภาพฟรี' : qt.enough ? `ยืนยัน สร้าง · ${qt.cost} ดาว` : 'ดาวไม่พอ · เติมดาว';
  stepShell(`<h1 style="font-size:22px">ทบทวนก่อนสร้าง</h1>
    ${qt.blocked ? `<p role="alert" class="card" style="background:var(--bad-bg);color:var(--bad)">${esc(qt.blocked)}</p>` : ''}
    ${qt.warnings.length ? `<p role="alert" class="card" style="background:var(--warn-bg);color:var(--warn)">ระวังผิดกฎ อย./โฆษณาเกินจริง: ${esc(qt.warnings.join(', '))} · AI จะเลี่ยงคำเหล่านี้ในแคปชั่น แนะนำแก้ข้อความบนภาพ</p>` : ''}
    <div class="list kv">
      ${row('เป้าหมาย', goal.label)}${D.style === 'model_show' ? row('นางแบบ/นายแบบ', `${CAT.modelWho.find((x) => x.id === D.modelWho)?.label} · ${CAT.modelLooks.find((x) => x.id === D.modelLook)?.label}`) : ''}${D.goal === 'agent' || st.agent ? row('สายงาน', CAT.agentTypes.find((x) => x.id === (D.agentType || 'insurance'))?.label) : ''}${row('ลิงก์', D.link)}${row(vid ? 'แนวคลิป' : 'แนวภาพ', (D.alias && CAT.video.styles.find((x) => x.id === D.alias)?.label) || st.label)}${row('สินค้า', D.product)}${row('ข้อความบนภาพ', D.headline)}${row('ราคา/โปร', D.price)}
      ${row('คอนเซปต์', D.concepts.join(', '))}${vid ? '' : row('ขนาด', D.ratio) + row('ภาพสินค้าจริง', REFS.length ? `${REFS.length} รูป` : D.fromWork ? 'จากงานเดิม' : '')}
      ${vid ? '' : row('โลโก้', D.useLogo && ME.brand?.logo ? 'ใส่มุมขวาบน' : '')}${row('สไตล์การเขียน', D.tone)}${row('แฮชแท็ก', payload().hashtags.join(' '))}
      ${INFO_IDS.includes(D.style) ? row('รูป', REFS.length ? `${REFS.length} รูป` : (D.style === 'v_pr_announce' ? 'AI วาดพื้นหลังให้ (+5 ดาว)' : '')) + (D.style === 'v_tips' ? row('จำนวนทิป', `${D.count} ทิป`) : '') + Object.entries(D.info || {}).filter(([, v]) => v).map(([k, v]) => row({ org: 'หน่วยงาน/ร้าน', date: 'วันเวลา', place: 'สถานที่', contact: 'ติดต่อ', hours: 'เวลาเปิด' }[k] || k, v)).join('') + row('เสียงพากย์', vname) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + (D.style === 'v_tips' ? '' : row('ความยาว', `${D.length} วินาที`)) : ''}
      ${(!vid && (st.pr || st.agent || st.ad)) || (vid && st.agent) ? Object.entries(D.info || {}).filter(([, v]) => v).map(([k, v]) => row({ org: st.agent ? 'สังกัด' : 'หน่วยงาน', date: 'วันเวลา', place: st.agent ? 'ทำเล' : 'สถานที่', contact: 'ติดต่อ', license: 'ใบอนุญาต', hours: 'เวลาเปิด', sub: 'ข้อความรอง', feats: 'จุดเด่น' }[k] || k, v)).join('') : ''}
      ${D.style === 'v_avatar' ? row('อวตาร', AVS.find((a) => a.id === D.avatarId)?.name) + row('ภาษา', CAT.video.avatar.langs.find((l) => l.id === D.lang)?.label) + row('บท', D.scriptMode === 'own' ? 'บทของฉัน' : `AI เขียนจาก: ${D.product}`) + row('ความยาว', `~${D.length} วิ`) + row('ซับ', D.subs ? CAT.video.captionStyles.find((c) => c.id === D.captionStyle)?.label : 'ไม่ใส่') : ''}
      ${D.style === 'v_remix' ? row('คลิปตัวอย่าง', VFILE ? `${VFILE.name} · ${Math.round(D.videoSec)} วิ` : '') + row('ได้รับ', 'พรอมต์ทีละฉาก + ภาพแต่ละฉาก + เคล็ดลับ') + row('ใส่อวตาร', D.remixAvatar ? `${AVS.find((a) => a.id === D.avatarId)?.name || ''} · ${CAT.video.remix.modes.find((m) => m.id === (D.avatarMode || 'replace'))?.label}` : '') + row('เปลี่ยนเสียง', D.remixVoice ? `เสียงของคุณ · เสียงเดิม${{ off: 'ปิด', low: 'เบาๆ', mid: 'ปานกลาง' }[D.bg || 'low']}` : '') + row('สำหรับ', D.product) : ''}
      ${D.style === 'v_motion' ? row('สินค้า / เรื่อง', D.product) + row('แนวช็อต', CAT.video.motionPresets.find((m) => m.id === D.preset)?.label) + row('ไอเดีย', D.plot) + row('รูปสินค้า', REFS.length ? '1 รูป' : '') : ''}
      ${D.style === 'v_series' ? row('เรื่อง', D.seriesInfo ? `${D.seriesInfo.title} EP.${(D.seriesInfo.ep || 1) + 1}` : D.product) + row('แนวเรื่อง', CAT.video.seriesGenres.find((g) => g.id === D.genre)?.label) + row('เรื่องย่อ', D.plot) + row('สไตล์ภาพ', CAT.video.art.find((a) => a.id === D.art)?.label) + row('ความยาว', `${D.scenes} ฉาก`) : ''}
      ${D.style === 'v_drama' ? row('แนวเรื่อง', CAT.video.genres.find((g) => g.id === D.genre)?.label) + row('พล็อต', D.genre === 'free' ? D.plot : '') + row('สไตล์ภาพ', CAT.video.art.find((a) => a.id === D.art)?.label) + row('จำนวนฉาก', `${D.scenes} ฉาก`) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) : ''}
      ${D.style === 'v_top' ? D.items.map((it, i) => row(`#${i + 1}`, `${it.name}${it.price ? ` · ${it.price}` : ''}${it.link ? ' · มีลิงก์' : ''}`)).join('') + row('สไตล์ตัดต่อ', CAT.video.styles.find((x) => x.id === 'v_top').variants.find((v) => v.id === D.variant)?.label || 'สุ่มให้') + row('สูตรเล่าเรื่อง', CAT.video.formulas.find((f) => f.id === D.formula)?.label) + row('เสียงพากย์', vname) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + row('ความยาว', `~${D.length} วินาที`) : ''}
      ${D.style === 'v_show' ? row('รูปสินค้า', `${REFS.length} รูป`) + row('สไตล์ตัดต่อ', CAT.video.styles.find((x) => x.id === 'v_show').variants.find((v) => v.id === D.variant)?.label || 'สุ่มให้') + row('สูตรเล่าเรื่อง', CAT.video.formulas.find((f) => f.id === D.formula)?.label) + row('เสียงพากย์', vname) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + row('ความยาว', `${D.length} วินาที`) : ''}
      ${D.style === 'v_remix' || D.style === 'v_top' || D.style === 'v_show' || D.style === 'v_drama' || D.style === 'v_series' || D.style === 'v_motion' || D.style === 'v_avatar' || INFO_IDS.includes(D.style) ? '' : D.style === 'v_self' ? row('คลิป', VFILES.length > 1 ? `${VFILES.length} คลิปต่อกัน · ${Math.round(D.videoSec)} วิ` : VFILE ? `${VFILE.name} · ${Math.round(D.videoSec)} วิ` : 'จากงานเดิม') + row('เสียง', D.selfMode === 'voice' ? `AI พากย์ทับ (${vname || ''})` : 'ซับจากเสียงพูด') + row('สไตล์ซับ', CAT.video.captionStyles.find((c) => c.id === D.captionStyle)?.label) + row('ฮุค', D.hookText) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label)
        : vid ? row('รูปสินค้า', REFS.length ? `${REFS.length} รูป` : '') + row('แคปรีวิว', REVS.length ? `${REVS.length} รูป` : '') + row('ลูกเล่นตอนเปิด', st.variants?.length ? (st.variants.find((x) => x.id === D.variant)?.label || 'สุ่มให้') : '') + row('สูตรเล่าเรื่อง', CAT.video.formulas.find((f) => f.id === D.formula)?.label) + row('เสียงพากย์', vname + (CAT.video.formulas.find((f) => f.id === D.formula)?.dialogue ? ' + คู่สนทนา' : '')) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + row('ความยาว', `${D.length} วินาที`) : row('คุณภาพ', `${tier.label} ${tier.size} × ${qt.versions} แบบ`)}
    </div>
    <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">${qt.free ? 'ใช้ภาพฟรี' : 'ดาวที่ใช้'}</span>
      <b class="num" style="font-size:28px">${qt.free ? 'ฟรี' : `${ICON.star.replace('17', '24').replace('17', '24')} ${qt.cost}`}</b></div>
      <span class="muted">${qt.free ? `ภาพฟรีเหลือ ${qt.freeLeft.today + qt.freeLeft.welcome} ภาพ · ไม่มีลายน้ำ` : `ยอดคงเหลือหลังสร้าง ${num(qt.stars - qt.cost)} ดาว`} · สร้างไม่สำเร็จคืนให้อัตโนมัติ</span></section>
    ${(D.style === 'v_self' || D.style === 'v_remix') && VFILE ? '<p class="muted">อัปโหลดคลิปขณะใช้เน็ตมือถืออาจใช้เวลาสักครู่ ห้ามปิดหน้านี้จนขึ้นว่าส่งงานแล้ว</p>' : ''}
    <p class="muted">ใช้เวลาประมาณ ${vid ? '2–5 นาที' : '20–60 วินาที'} · ไฟล์เก็บบนเซิร์ฟเวอร์ ${CAT.keepDays} วัน ดาวน์โหลดเก็บไว้ด้วย</p>`, { next: label, nextId: 'go', disabled: !!qt.blocked });
  $('#go').onclick = async () => {
    if (!qt.free && !qt.enough) return go('topup');
    const b = $('#go'); b.disabled = true; b.textContent = 'กำลังส่งงาน…';
    const fd = new FormData(); fd.append('data', JSON.stringify(payload())); REFS.forEach((f) => fd.append('refs', f)); if (D.kind === 'video') REVS.forEach((f) => fd.append('revs', f));
    if (D.style === 'v_self' && VFILES.length) VFILES.forEach((x) => fd.append('video', x.f));
    else if ((D.style === 'v_self' || D.style === 'v_remix') && VFILE) fd.append('video', VFILE);
    if (D.style === 'v_remix' && D.remixVoice && VOICEB) fd.append('voice', VOICEB, VOICEB.name || 'voice.webm');
    if (D.style === 'v_top') ITEMF.slice(0, D.items.length).forEach((f) => fd.append('refs', f));
    try {
      const r = (D.style === 'v_self' || D.style === 'v_remix') && VFILE ? await uploadWithProgress('api/works', fd, (pc) => { b.textContent = `กำลังอัปโหลดคลิป ${pc}%`; }) : await api('api/works', { method: 'POST', body: fd });
      ME = r.me; CAT = null; D = null; REFS = []; REVS = []; VFILE = null; VFILES = []; VOICEB = null; ITEMF = []; try { sessionStorage.removeItem('mr_draft'); } catch {}
      go(`work?id=${r.id}`);
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = label; }
  };
}

// ---------- ผลงานของฉัน ----------
const PLAT = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['shopee', 'Shopee'], ['lazada', 'Lazada'], ['line', 'LINE']];
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 864e5));
const WSTAT = { queued: ['รอคิว', 'b-lime'], working: ['กำลังสร้าง', 'b-lime'], review: ['รอตรวจซับ', 'b-warn'], done: ['เสร็จแล้ว', 'b-ok'], failed: ['ไม่สำเร็จ', 'b-warn'] };
let WF = (() => { try { return { kind: 'all', old: false, ...JSON.parse(localStorage.getItem('mr_wf') || '{}') }; } catch { return { kind: 'all', old: false }; } })();
async function worksView() {
  app.innerHTML = `${topbar()}<main><div class="row between" style="flex-wrap:wrap;gap:10px"><h1 style="font-size:22px;white-space:nowrap">ผลงานของฉัน</h1><span class="row" style="gap:8px"><a class="btn dark sm" href="#plan">ปฏิทิน</a><a class="btn dark sm" href="#auto">อัตโนมัติ</a><a class="btn sm" href="#create?new=1">+ สร้าง</a></span></div>
    <div class="chips" id="wf" role="group" aria-label="กรองผลงาน" style="gap:6px">${[['all', 'ทั้งหมด'], ['image', '🖼️ ภาพ'], ['video', '🎬 วิดีโอ']].map(([k, l]) => `<button type="button" class="chip" data-wk="${k}" aria-pressed="${WF.kind === k}" style="min-height:32px;padding:4px 12px;font-size:13px">${l}</button>`).join('')}
      <button type="button" class="chip" id="wsort" style="min-height:32px;padding:4px 12px;font-size:13px;margin-left:auto">${WF.old ? '📅 เก่า → ใหม่' : '📅 ใหม่ → เก่า'}</button></div>
    <div id="wl" class="grid2">${LOAD()}</div></main>${nav('works')}`;
  app.querySelectorAll('[data-wk]').forEach((b) => b.onclick = () => { WF.kind = b.dataset.wk; try { localStorage.setItem('mr_wf', JSON.stringify(WF)); } catch {} worksView(); });
  $('#wsort').onclick = () => { WF.old = !WF.old; try { localStorage.setItem('mr_wf', JSON.stringify(WF)); } catch {} worksView(); };
  let { items } = await api('api/works');
  const total = items.length;
  if (WF.kind !== 'all') items = items.filter((w) => (WF.kind === 'video' ? w.kind === 'video' : w.kind !== 'video'));
  items.sort((a, b) => (WF.old ? 1 : -1) * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) || (WF.old ? a.id - b.id : b.id - a.id));
  if (total && !items.length) { $('#wl').innerHTML = `<p class="muted">ยังไม่มีผลงาน${WF.kind === 'video' ? 'วิดีโอ' : 'ภาพ'}</p>`; return; }
  if (!items.length) { $('#wl').outerHTML = richState('create', 'ยังไม่มีผลงาน', `มีภาพฟรีให้ ${ME.freeImages.today + ME.freeImages.welcome} ภาพ ลองสร้างชิ้นแรกกับริชเลย`, '<a class="btn cta" href="#create?new=1">สร้างผลงานแรก</a>'); return; }
  $('#wl').innerHTML = items.map((w) => `<a class="wcard" href="#work?id=${w.id}">
    <div class="wthumb">${w.files[0] ? `<img src="${w.files[0].thumb}" alt="" loading="lazy">` : `<span class="muted">${w.purged ? 'ไฟล์ถูกลบแล้ว' : WSTAT[w.status]?.[0] || ''}</span>`}
      ${w.kind === 'video' ? '<span class="cnt">▶ คลิป</span>' : w.files.length > 1 ? `<span class="cnt">${w.files.length}</span>` : ''}</div>
    <b style="font-size:14px;line-height:1.3">${esc(w.title)}</b>
    <span class="row between"><span class="badge ${WSTAT[w.status]?.[1]}">${WSTAT[w.status]?.[0]}</span>
      <span class="muted">${w.purged ? 'หมดอายุ' : Object.keys(w.posted || {}).length ? `โพสต์ ${Object.keys(w.posted).length} ที่` : `เหลือ ${daysLeft(w.expiresAt)} วัน`}</span></span></a>`).join('');
  if (items.some((w) => ['queued', 'working'].includes(w.status))) setTimeout(() => { if (location.hash.startsWith('#works')) worksView().catch(() => {}); }, 5000);
}

// ผลแกะคลิป: พรอมต์ทีละฉาก (ฉบับเดิม / ฉบับมีอวตาร) + ภาพฉาก + เคล็ดลับ + ปุ่มไป Google Flow
let RXV = 'orig';
function remixHtml(w) {
  const r = w.params.remix, hasAv = !!r.avatar && r.scenes.some((x) => x.avatarPrompt);
  const ver = hasAv ? RXV : 'orig';
  const pr = (x) => (ver === 'avatar' && x.avatarPrompt ? x.avatarPrompt : x.prompt) + (r.look ? `\nStyle: ${r.look}` : '');
  const t = (x) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`;
  const fr = (x) => w.files.find((f) => f.name === x.frame);
  return `<section class="hero" style="gap:8px"><b style="font-size:17px">🧩 ${esc(r.title || 'แกะคลิป')}</b><span>${esc(r.summary || '')}</span>
      <span class="muted" style="font-size:13px">${r.scenes.length} ฉาก${r.difficulty ? ` · ความยาก${esc(r.difficulty)}` : ''}${r.music ? ` · เพลง: ${esc(r.music)}` : ''}</span>
      <div class="grid2"><a class="btn" href="${esc(r.flow)}" target="_blank" rel="noopener">เปิด Google Flow ↗</a><button type="button" class="btn dark" id="rxall">คัดลอกพรอมต์ทั้งหมด</button></div>
      <span class="muted" style="font-size:12px">ใช้บัญชี Google ของคุณเอง · วางพรอมต์ทีละฉากใน Flow (Text to Video) หรือแนบภาพฉากเป็นภาพเริ่ม (Frames to Video)</span></section>
    ${r.voiceError ? `<p class="card" style="background:var(--warn-bg);color:var(--warn)">${esc(r.voiceError)}</p>` : ''}
    ${hasAv ? `<section class="card" style="gap:8px"><b>🧑‍🎤 ใส่ ${esc(r.avatar.name)} ลงคลิป</b>
      <div class="chips"><button type="button" class="chip" data-rxv="orig" aria-pressed="${ver === 'orig'}">พรอมต์ต้นฉบับ</button><button type="button" class="chip" data-rxv="avatar" aria-pressed="${ver === 'avatar'}">ฉบับมีอวตาร</button></div>
      <div class="row" style="gap:10px;align-items:center"><img src="api/avatars/${r.avatar.id}/img" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:12px"><a class="btn dark sm" href="api/avatars/${r.avatar.id}/img" download="avatar.jpg" style="flex:1;min-width:0;white-space:normal">ดาวน์โหลดภาพอวตาร</a></div>
      <span class="muted" style="font-size:12px">แนบภาพนี้เป็น Ingredient ใน Flow ให้หน้าตาเหมือนเดิมทุกฉาก</span>
      ${(r.avatarPlan || []).length ? `<ul style="margin:0;padding-left:18px">${r.avatarPlan.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <span class="muted" style="font-size:12px">ในพรอมต์ [AVATAR] = ตัวละครของคุณ</span></section>` : ''}
    ${(r.characters || []).length ? `<details class="card"><summary style="font-weight:600;cursor:pointer">ตัวละครในคลิป (ใช้คำเดิมทุกฉากให้หน้าตาต่อเนื่อง)</summary>${r.characters.map((c) => `<p style="margin:6px 0"><b>${esc(c.name)}</b><br><span class="muted" style="font-size:13px">${esc(c.desc)}</span></p>`).join('')}</details>` : ''}
    <h2>พรอมต์ทีละฉาก</h2>
    ${r.scenes.map((x, i) => `<section class="card" style="gap:8px">
      <div class="row" style="gap:10px;align-items:flex-start">${fr(x) ? `<img src="${fr(x).thumb}" alt="ฉาก ${i + 1}" style="width:72px;aspect-ratio:9/16;object-fit:cover;border-radius:10px;flex:none;background:#000">` : ''}
        <span style="flex:1;min-width:0"><b>ฉาก ${i + 1}</b> <span class="muted" style="font-size:12px">${t(x.t0)}–${t(Math.max(x.t0, x.t1))}${x.camera ? ` · ${esc(x.camera)}` : ''}</span><br><span style="font-size:14px">${esc(x.th)}</span>
        ${x.audio ? `<br><span class="muted" style="font-size:12px">🔊 ${esc(x.audio)}</span>` : ''}</span></div>
      <textarea readonly rows="4" style="font-size:13px" aria-label="พรอมต์ฉาก ${i + 1}">${esc(pr(x))}</textarea>
      <div class="grid2"><button type="button" class="btn dark sm" data-rxc="${i}">คัดลอกพรอมต์</button>${fr(x) ? `<a class="btn ghost sm" href="${fr(x).url}?dl=1" download>ภาพฉาก (ภาพเริ่ม)</a>` : '<span></span>'}</div></section>`).join('')}
    ${(r.tips || []).length ? `<section class="card" style="gap:6px"><b>💡 ทำไมคลิปนี้ปัง / ทำตามยังไง</b><ul style="margin:0;padding-left:18px">${r.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}`;
}
function bindRemix(w) {
  const r = w.params.remix;
  const pr = (x) => ((RXV === 'avatar' && x.avatarPrompt ? x.avatarPrompt : x.prompt) + (r.look ? `\nStyle: ${r.look}` : ''));
  const cp = async (t) => { try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว'); } catch { toast('คัดลอกไม่ได้ · กดค้างที่กล่องข้อความแล้วคัดลอกเอง'); } };
  app.querySelectorAll('[data-rxc]').forEach((b) => b.onclick = () => cp(pr(r.scenes[Number(b.dataset.rxc)])));
  const all = $('#rxall'); if (all) all.onclick = () => cp(r.scenes.map((x, i) => `[ฉาก ${i + 1}] ${pr(x)}`).join('\n\n'));
  app.querySelectorAll('[data-rxv]').forEach((b) => b.onclick = () => { RXV = b.dataset.rxv; workView(`id=${w.id}`); });
}
async function workView(qs) {
  const id = Number(new URLSearchParams(qs || '').get('id'));
  if (!id) return go('works');
  app.innerHTML = `${topbar('ผลงาน', 'works')}<main>${LOAD()}</main>${nav('works')}`;
  let w = await api(`api/works/${id}`);
  if (['queued', 'working'].includes(w.status)) {
    $('main').innerHTML = `<section class="hero" style="align-items:center;text-align:center;gap:14px;padding:32px 18px">
      ${RICH('think', 110)}<h2 id="pst">${w.status === 'queued' ? 'รอคิวสร้าง…' : w.kind === 'video' ? (w.progress?.stage || 'กำลังเริ่ม…') : 'AI กำลังสร้างภาพ…'}</h2>
      ${w.kind === 'video' ? `<div class="pbar" aria-hidden="true"><i id="pbar" style="width:${w.progress?.pct || 2}%"></i></div>` : ''}
      <p class="muted">${esc(w.styleLabel)} · ${w.kind === 'video' ? `คลิป ${w.params?.length || 30} วิ · ประมาณ 2–5 นาที` : `${w.versions} แบบ · ประมาณ 20–60 วินาที`}<br>ออกจากหน้านี้ได้ เสร็จแล้วดูที่เมนูผลงาน</p></section>`;
    const t0 = Date.now();
    const poll = async () => {
      if (location.hash !== `#work?id=${id}`) return;
      try { w = await api(`api/works/${id}`); } catch { return; }
      if (['queued', 'working'].includes(w.status)) {
        if (w.progress && $('#pst')) { $('#pst').textContent = w.progress.stage; const pb = $('#pbar'); if (pb) pb.style.width = `${w.progress.pct}%`; }
        return setTimeout(poll, Date.now() - t0 > 60000 ? 5000 : 2500);
      }
      ME = await api('api/me').catch(() => ME);
      workView(qs);
    };
    setTimeout(poll, 2500);
    return;
  }
  if (w.status === 'review') return subsEditor(w, qs);
  if (w.status === 'failed') {
    $('main').innerHTML = `<section class="card" style="background:var(--bad-bg)"><b style="color:var(--bad)">สร้างไม่สำเร็จ</b><span>${esc(w.error)}</span>${ME?.admin && w.params?.failDetail ? `<span class="muted" style="font-size:13px;overflow-wrap:anywhere">[แอดมิน] ${esc(w.params.failDetail)}</span>` : ''}</section>
      <button type="button" class="btn" id="again">ลองใหม่ (แก้รายละเอียดได้)</button><button type="button" class="btn ghost" id="del">ลบรายการนี้</button>`;
  } else {
    let caps = PLAT.slice(0, 4).filter(([k]) => w.captions?.[k]);
    // แคปชั่นเดียวทุกแพลตฟอร์ม → แสดงกล่องเดียว (งานเก่าที่แยกแพลตฟอร์มยังเลือกแท็บได้)
    const oneCap = caps.length > 1 && caps.every(([k]) => String(w.captions[k]).replace(/https?:\/\/\S+/g, '') === String(w.captions[caps[0][0]]).replace(/https?:\/\/\S+/g, ''));
    if (oneCap) caps = caps.slice(0, 1);
    const tags = (w.hashtags || []).join(' ');
    // แยกลิงก์ออกจากแคปชั่น (ลิงก์สั้นแยกตามแพลตฟอร์ม)
    const URL_RE = /https?:\/\/[^\s)]+/g;
    const linkOf = (k) => (String(w.captions?.[k] || '').match(URL_RE) || [])[0] || w.params?.link || '';
    const hasLink = caps.some(([k]) => linkOf(k));
    const stripLink = (t) => String(t || '').replace(URL_RE, '').split('\n').filter((ln) => !/^[\s👉🛒🔗:：\-–>|]*(ลิงก์|link|สั่งซื้อ|กดเลย|คลิก)?[\s👉🛒🔗:：\-–>|]*$/i.test(ln) || !ln.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const capText = (k) => (hasLink ? stripLink(w.captions[k]) : w.captions[k]) + (tags ? '\n\n' + tags : '');
    $('main').innerHTML = `
      ${w.purged ? `<section class="card"><b>ไฟล์ถูกลบจากเซิร์ฟเวอร์แล้ว</b><span class="muted">ครบ ${CAT?.keepDays || 7} วัน · แคปชั่นยังคัดลอกได้ · กด "สร้างแบบนี้อีก" เพื่อทำใหม่</span></section>`
        : `<div class="gallery">${w.files.map((f, i) => w.params?.remix && f.type !== 'video' ? '' : `<figure>${f.type === 'video' ? `<video src="${f.url}" ${f.thumb ? `poster="${f.thumb}"` : ''} controls playsinline preload="metadata" style="width:100%;border-radius:14px;background:#000;aspect-ratio:9/16"></video>` : `<img src="${f.url}" alt="ภาพที่ ${i + 1}" width="${f.w}" height="${f.h}">`}
          <figcaption class="grid2"><a class="btn sm" href="${f.url}?dl=1" download data-dl="${i}">⬇ ดาวน์โหลด</a><button type="button" class="btn dark sm" data-share="${i}">↗ แชร์ผลงาน</button></figcaption></figure>`).join('')}</div>
        <p class="muted">ไฟล์อยู่บนเซิร์ฟเวอร์อีก ${daysLeft(w.expiresAt)} วัน · ${w.free ? 'ภาพฟรี' : `ใช้ ${w.cost} ดาว`}</p>
        ${w.params?.script?.length ? `<details class="card"><summary style="font-weight:600;cursor:pointer">บทพากย์${w.params.lang && w.params.lang !== 'th' ? ` (${({ en: 'อังกฤษ', zh: 'จีน', ms: 'มลายู' })[w.params.lang] || w.params.lang})` : ''}</summary><p class="muted" style="margin:0" lang="${esc(w.params.lang || 'th')}">${esc(w.params.script.join(' '))}</p>${w.params.scriptTh?.length ? `<b style="font-size:14px">คำแปลไทย</b><p class="muted" style="margin:0">${esc(w.params.scriptTh.join(' '))}</p>` : ''}</details>` : ''}`}
      ${w.params?.remix ? remixHtml(w) : ''}
      ${caps.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>แคปชั่น</h2>
        ${caps.length < 2 ? '' : `<div class="chips" role="tablist">${caps.map(([k, l], i) => `<button type="button" class="chip" role="tab" data-cap="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>`}
        <textarea id="cap" rows="7" aria-label="แคปชั่น">${esc(capText(caps[0][0]))}</textarea>
        ${hasLink ? `<div class="grid2"><button type="button" class="btn dark" id="copyCap">คัดลอกแคปชั่น</button><button type="button" class="btn" id="copyLink">คัดลอกลิงก์</button></div>
          <div class="row" style="gap:8px"><input id="capLink" type="text" readonly value="${esc(linkOf(caps[0][0]))}" aria-label="ลิงก์ Affiliate" style="flex:1;min-width:0"></div>
          <button type="button" class="btn ghost sm" id="copyAll">คัดลอกรวม (แคปชั่น + ลิงก์ + แฮชแท็ก)</button>
          <span class="muted">TikTok / IG ไม่ให้กดลิงก์ในแคปชั่น · คัดลอกลิงก์แยกไปวางในตะกร้า/ไบโอ/คอมเมนต์</span>`
          : '<button type="button" class="btn dark" id="copyCap">คัดลอกแคปชั่น + แฮชแท็ก</button>'}</section>` : ''}
      ${w.purged ? '' : `<section class="card" id="pubcard"><b>โพสต์ตรง</b>${LOAD('กำลังโหลด…', true)}</section>`}
      <section class="card"><b>โพสต์ไปที่ไหนแล้ว</b><span class="muted">ติ๊กไว้ จะได้รู้ว่างานไหนโพสต์แล้ว (โพสต์ตรงจะติ๊กให้อัตโนมัติ)</span>
        <div class="chips">${PLAT.map(([k, l]) => `<button type="button" class="chip" data-post="${k}" aria-pressed="${!!w.posted?.[k]}">${l}${w.posted?.[k] ? ' · ' + new Date(w.posted[k]).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''}</button>`).join('')}</div></section>
      <div id="wstats"></div>
      ${w.purged ? '' : '<button type="button" class="btn dark" id="toDrive">ส่งเข้า Google Drive</button>'}
      ${w.purged ? '' : `<section class="card" id="sched"><b>ตั้งเวลาโพสต์</b>${LOAD('กำลังโหลด…', true)}</section>`}
      <div class="list">${historyRows(w)}</div>
      ${w.style === 'v_self' && w.params?.selfMode === 'subs' && !w.purged && (w.params?.rerenders || 0) < 1 ? '<button type="button" class="btn dark" id="fixsubs">แก้ซับแล้วตัดใหม่ (ฟรี 1 ครั้ง)</button>' : ''}
      ${w.style === 'v_series' && w.params?.series ? `<button type="button" class="btn cta" id="nextEp">${ICON.plus}ทำตอนต่อไป (EP.${w.params.series.ep + 1})</button>` : ''}
      <button type="button" class="btn${w.style === 'v_series' ? ' dark' : ''}" id="again">สร้างแบบนี้อีก</button>
      <button type="button" class="btn ghost" id="del">ลบผลงานนี้</button>`;
    const fx = $('#fixsubs'); if (fx) fx.onclick = () => subsEditor(w, qs);
    schedCard(w, new URLSearchParams(qs || '').get('post')).catch(() => {});
    if (!w.purged) pubCard(w).catch(() => {});
    app.querySelectorAll('[data-cap]').forEach((b) => b.onclick = () => {
      app.querySelectorAll('[data-cap]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#cap').value = capText(b.dataset.cap);
      const cl = $('#capLink'); if (cl) cl.value = linkOf(b.dataset.cap);
    });
    const curCap = () => app.querySelector('[data-cap][aria-pressed="true"]')?.dataset.cap;
    const cpy = async (t, msg) => { try { await navigator.clipboard.writeText(t); toast(msg); } catch { prompt('คัดลอก', t); } api(`api/works/${w.id}/event`, { method: 'POST', body: { t: 'copy', p: curCap() } }).catch(() => {}); };
    const cL = $('#copyLink'); if (cL) cL.onclick = () => cpy($('#capLink').value, 'คัดลอกลิงก์แล้ว');
    const cA = $('#copyAll'); if (cA) cA.onclick = () => { const c = $('#cap').value; const [body, ...rest] = c.split(/\n\n(?=#)/); cpy(`${body.trim()}\n👉 ${$('#capLink').value}${rest.length ? '\n\n' + rest.join('\n\n') : ''}`, 'คัดลอกรวมแล้ว'); };
    const cc = $('#copyCap'); if (cc) cc.onclick = async () => {
      try { await navigator.clipboard.writeText($('#cap').value); toast('คัดลอกแล้ว'); } catch { $('#cap').select(); toast('กดค้างเพื่อคัดลอก'); }
      api(`api/works/${w.id}/event`, { method: 'POST', body: { t: 'copy', p: app.querySelector('[data-cap][aria-pressed="true"]')?.dataset.cap } }).catch(() => {});
    };
    app.querySelectorAll('[data-share]').forEach((b) => b.onclick = () => shareWork(w, Number(b.dataset.share), $('#cap')?.value || ''));
    app.querySelectorAll('[data-dl]').forEach((b) => b.addEventListener('click', () => api(`api/works/${w.id}/event`, { method: 'POST', body: { t: 'download', n: Number(b.dataset.dl) } }).catch(() => {})));
    if (w.params?.remix) bindRemix(w);
    const td = $('#toDrive'); if (td) td.onclick = async () => {
      td.disabled = true; td.textContent = 'กำลังส่งเข้า Drive…';
      try { const r = await api(`api/works/${w.id}/drive`, { method: 'POST', body: {} }); toast(`ส่ง ${r.files} ภาพ + แคปชั่นเข้า Drive แล้ว`); td.textContent = 'ส่งเข้า Drive แล้ว ✓'; }
      catch (e) { if (/ยังไม่ได้เชื่อม/.test(e.message)) { if (confirm('ยังไม่ได้เชื่อม Google Drive ไปเชื่อมตอนนี้?')) location.href = 'drive/connect'; } else toast(e.message); td.disabled = false; td.textContent = 'ส่งเข้า Google Drive'; }
    };
    if (w.params?.link) api(`api/stats/clicks?work=${w.id}`).then((st) => {
      const tot = st.byPlatform.reduce((a, b) => a + b.clicks, 0); const el = $('#wstats'); if (!el) return;
      el.innerHTML = `<section class="card"><div class="row between"><b>คลิกลิงก์จากผลงานนี้</b><b class="num" style="font-size:22px;color:var(--lime-text)">${num(tot)}</b></div>
        ${bars(st.days)}<div class="chips">${st.byPlatform.map((p) => `<span class="chip" style="cursor:default">${esc(p.label)} ${num(p.clicks)}</span>`).join('')}</div>
        <span class="muted">นับจากลิงก์สั้นในแคปชั่น แยกตามแพลตฟอร์ม</span></section>`;
    }).catch(() => {});
    app.querySelectorAll('[data-post]').forEach((b) => b.onclick = async () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      try { await api(`api/works/${w.id}/posted`, { method: 'POST', body: { platform: b.dataset.post, on } }); workView(qs); } catch (e) { toast(e.message); }
    });
  }
  $('#again').onclick = () => {
    const p = w.params || {};
    VFILE = null; VFILES = []; ITEMF = [];
    D = { ...newDraft(), kind: w.kind, info: p.info || {}, count: p.count || 3, items: p.items || newDraft().items, genre: p.genre || 'inlaw', art: p.art || 'cartoon3d', scenes: p.scenes || 4, plot: p.plot || '', selfMode: p.selfMode || 'subs', videoSec: p.videoSec || 0, captionStyle: p.captionStyle || 'pop', hookText: p.hookText || '', keepAudio: p.keepAudio !== false, length: p.length || 30, voice: p.voice || '', premiumVoice: !!p.premium, formula: p.formula || '', variant: p.variant || 'random', music: p.music || 'auto', goal: p.goal, link: p.link, style: w.style, product: p.product, price: p.price, headline: p.headline, details: p.details, concepts: p.concepts || [], ratio: p.ratio, useLogo: p.useLogo, showShop: p.showShop, tone: p.tone, hashtags: p.hashtags || [], tier: w.tier, versions: w.versions, fromWork: w.id, step: 2 };
    REFS = []; REVS = []; saveDraft(); go('create');
  };
  const ne = $('#nextEp');
  if (ne) ne.onclick = async () => {
    if (!CAT) CAT = await api('api/create/catalog').catch(() => null);
    const sr = w.params.series;
    openDraft({ kind: 'video', style: 'v_series', goal: 'content', product: sr.title, genre: sr.genre, art: sr.art, seriesFrom: w.id, seriesInfo: sr });
  };
  $('#del').onclick = async () => {
    if (!confirm('ลบผลงานนี้? ไฟล์บนเซิร์ฟเวอร์จะหายทันที (ดาวไม่คืน)')) return;
    try { await api(`api/works/${w.id}`, { method: 'DELETE' }); toast('ลบแล้ว'); go('works'); } catch (e) { toast(e.message); }
  };
}
function historyRows(w) {
  const ev = [...(w.events || [])].reverse().slice(0, 8);
  const lab = { download: 'ดาวน์โหลด', share: 'แชร์', copy: 'คัดลอกแคปชั่น', drive: 'ส่งเข้า Drive' };
  const d = (x) => new Date(x).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  return `<div><span class="muted">สร้างเมื่อ</span><span>${d(w.createdAt)}</span></div>` + ev.map((e) => `<div><span class="muted">${lab[e.t] || e.t}${e.t === 'drive' ? ` ${e.n} ภาพ` : e.t !== 'copy' ? ` ภาพที่ ${(e.n || 0) + 1}` : ''}</span><span>${d(e.at)}</span></div>`).join('');
}
// แชร์ผลงาน: เปิดหน้าแชร์ของเครื่อง (Facebook, LINE, Google Drive, IG, บันทึกลงคลังรูป ฯลฯ) + คัดลอกแคปชั่นให้วางต่อได้
async function shareWork(w, i, caption) {
  const f = w.files[i];
  if (caption) { try { await navigator.clipboard.writeText(caption); } catch {} }
  try {
    toast('กำลังเตรียมไฟล์…');
    const blob = await (await fetch(f.url, { credentials: 'same-origin' })).blob();
    const vid = f.type === 'video';
    const file = new File([blob], `mcrich-${w.id}-${i + 1}.${vid ? 'mp4' : 'jpg'}`, { type: vid ? 'video/mp4' : 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      if (caption) toast('คัดลอกแคปชั่นไว้แล้ว วางในโพสต์ได้เลย');
      api(`api/works/${w.id}/event`, { method: 'POST', body: { t: 'share', n: i } }).catch(() => {});
      return;
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  // เครื่องที่แชร์ไฟล์ไม่ได้ (คอมบางรุ่น) → ให้เลือกส่งเข้า Drive หรือดาวน์โหลดไปโพสต์เอง
  if (confirm('เครื่องนี้แชร์ไฟล์ตรงไม่ได้\nกด OK = ส่งเข้า Google Drive · Cancel = ดาวน์โหลดไฟล์แล้วโพสต์เอง')) $('#toDrive')?.click();
  else location.href = `${f.url}?dl=1`;
}



// ---------- ตรวจ/แก้ซับ (คลิปถ่ายเอง) ----------
const fmtT = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}.${Math.floor((x * 10) % 10)}`;
function subsEditor(w, qs) {
  const segs = (w.params?.segments || []).map((g) => ({ ...g }));
  const again = w.status === 'done';
  $('main').innerHTML = `<h1 style="font-size:22px">${again ? 'แก้ซับแล้วตัดใหม่' : 'ตรวจซับก่อนตัดต่อ'}</h1>
    <p class="muted">${segs.length ? 'AI ถอดเสียงให้แล้ว แก้คำผิด ชื่อสินค้า ได้เลย ลบท่อนที่ไม่ต้องการได้' : 'AI ไม่ได้ยินเสียงพูดชัดๆ พิมพ์ซับเองได้ หรือกดตัดต่อเลยแบบไม่มีซับ'}</p>
    ${w.files?.[0] && w.files[0].type === 'video' ? '' : ''}
    <div id="segs" style="display:flex;flex-direction:column;gap:8px"></div>
    <button type="button" class="btn dark" id="addseg">+ เพิ่มท่อนซับ</button>
    <button type="button" class="btn" id="dorender">${again ? 'ตัดใหม่ (ฟรี)' : 'บันทึกแล้วตัดต่อ'}</button>
    ${again ? '<button type="button" class="btn ghost" id="cancel">ยกเลิก</button>' : ''}`;
  const draw = () => {
    $('#segs').innerHTML = segs.map((g, i) => `<div class="card" style="padding:10px;gap:6px"><div class="row between"><span class="muted num">${fmtT(g.start)} – ${fmtT(g.end)}</span>
      <button type="button" class="chip" data-del="${i}" style="min-height:30px;padding:2px 10px;font-size:12px">ลบ</button></div>
      <input type="text" data-i="${i}" value="${esc(g.text)}" maxlength="80" aria-label="ซับท่อนที่ ${i + 1}"></div>`).join('');
    app.querySelectorAll('[data-i]').forEach((el) => el.oninput = () => { segs[Number(el.dataset.i)].text = el.value; });
    app.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { segs.splice(Number(b.dataset.del), 1); draw(); });
  };
  draw();
  $('#addseg').onclick = () => { const last = segs.at(-1); const st = last ? last.end : 0; segs.push({ start: st, end: Math.min(st + 2.5, w.params?.videoSec || st + 2.5), text: '' }); draw(); app.querySelector(`[data-i="${segs.length - 1}"]`)?.focus(); };
  const c = $('#cancel'); if (c) c.onclick = () => workView(qs);
  $('#dorender').onclick = async () => {
    const b = $('#dorender'); b.disabled = true; b.textContent = 'กำลังส่ง…';
    try {
      await api(`api/works/${w.id}/segments`, { method: 'PUT', body: { segments: segs.filter((g) => g.text.trim()) } });
      await api(`api/works/${w.id}/render`, { method: 'POST', body: {} });
      workView(qs);
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = again ? 'ตัดใหม่ (ฟรี)' : 'บันทึกแล้วตัดต่อ'; }
  };
}


// ---------- ตั้งเวลาโพสต์ ----------
const PLAT_S = [['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['line', 'LINE'], ['shopee', 'Shopee'], ['lazada', 'Lazada']];
const localDT = (d) => { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60e3); return x.toISOString().slice(0, 16); };
const fmtWhen = (d) => new Date(d).toLocaleString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
// ---------- สตูดิโอหนังสั้นแนวตั้ง ----------
let FILMCAT = null, FD = null;
const fchips = (items, sel, key, multi) => `<div class="chips">${items.map((v) => { const id = String(typeof v === 'object' ? v.id : v); const on = multi ? (sel || []).map(String).includes(id) : String(sel) === id; return `<button type="button" class="chip" data-fk="${key}" data-v="${esc(id)}" aria-pressed="${on}">${esc(typeof v === 'object' ? v.label : v)}</button>`; }).join('')}</div>`;
function bindF(obj, redraw) {
  app.querySelectorAll('.chip[data-fk]').forEach((b) => b.onclick = () => { const k = b.dataset.fk; obj[k] = isNaN(Number(b.dataset.v)) || k === 'genre' || k === 'art' || k === 'lang' ? b.dataset.v : Number(b.dataset.v); redraw(); });
}
async function filmView(qs) {
  const sp = new URLSearchParams(qs || '');
  FILMCAT = FILMCAT || await api('api/films');
  if (sp.get('new')) return filmNew();
  if (sp.get('id') && sp.get('ep')) return filmEp(Number(sp.get('id')), Number(sp.get('ep')));
  if (sp.get('id')) return filmProject(Number(sp.get('id')));
  const d = await api('api/films'); FILMCAT = d;
  app.innerHTML = `${topbar('สตูดิโอหนังสั้น', 'home')}<main>
    <section class="hero"><b style="font-size:20px">🎬 หนังสั้นแนวตั้ง เป็นตอน</b><span class="muted">สร้างเรื่อง เลือกนักแสดง ให้ AI เสนอพล็อตและบทพูด แล้วถ่ายทำทีละตอน ภาพเคลื่อนไหวจริง ปากขยับตามเสียง มีซับและดนตรี พร้อมลง TikTok / Reels</span>
      <a class="btn" href="#film?new=1">+ สร้างหนังเรื่องใหม่</a>${d.ready ? '' : '<span class="badge b-warn">ระบบถ่ายทำกำลังตั้งค่า (เขียนเรื่องได้แล้ว)</span>'}</section>
    ${d.items.length ? `<div class="list">${d.items.map((f) => `<a href="#film?id=${f.id}"><span><b>${esc(f.title)}</b><br><span class="muted">${esc(d.genres.find((g) => g.id === f.genre)?.label || '')} · ${f.episodes.length} ตอน · ถ่ายแล้ว ${f.episodes.filter((e) => e.workId).length}</span></span><span aria-hidden="true">›</span></a>`).join('')}</div>` : '<p class="muted">ยังไม่มีเรื่อง เริ่มเรื่องแรกได้เลย</p>'}
  </main>${nav('create')}`;
}
async function filmNew() {
  const C = FILMCAT;
  if (!AVS_LOADED) await loadAvatars();
  FD = FD || { genre: 'revenge', art: 'cine', lang: 'th', episodes: 5, epLen: 30, cast: [], premise: '', ideas: null, pick: -1, title: '', logline: '' };
  const castRows = FD.cast.map((c, i) => { const a = AVS.find((x) => x.id === c.avatarId); return `<div class="card" style="gap:8px"><div class="row" style="gap:10px;align-items:center">
      <img src="${a?.img || ''}" alt="" style="width:56px;height:76px;object-fit:cover;border-radius:10px"><div style="flex:1;display:flex;flex-direction:column;gap:6px">
      <input type="text" data-cn="${i}" maxlength="30" value="${esc(c.name)}" placeholder="ชื่อตัวละคร" aria-label="ชื่อตัวละคร">
      <input type="text" data-cr="${i}" maxlength="40" value="${esc(c.role || '')}" placeholder="บทบาท เช่น นางเอก, ประธานบริษัท, ตัวร้าย" aria-label="บทบาท"></div>
      <button type="button" class="btn ghost sm" data-cx="${i}" aria-label="เอาออก">✕</button></div>
      <input type="text" data-cd="${i}" maxlength="200" value="${esc(c.desc || '')}" placeholder="นิสัย/ปมของตัวละคร (ไม่บังคับ)" aria-label="นิสัยตัวละคร">
      <label class="f">เสียงพากย์<select data-cv="${i}">${C.voices.filter((v) => !a || v.gender === a.gender).map((v) => `<option value="${v.id}" ${v.id === (c.voice || a?.voice) ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label></div>`; }).join('');
  const picks = AVS.filter((a) => !FD.cast.some((c) => c.avatarId === a.id));
  app.innerHTML = `${topbar('สร้างหนังเรื่องใหม่', 'film')}<main>
    <section style="display:flex;flex-direction:column;gap:10px"><h2>1. แนวเรื่อง</h2>${fchips(C.genres, FD.genre, 'genre')}</section>
    <section style="display:flex;flex-direction:column;gap:10px"><h2>สไตล์ภาพ</h2>${fchips(C.arts, FD.art, 'art')}</section>
    <section style="display:flex;flex-direction:column;gap:10px"><h2>ภาษาที่ตัวละครพูด</h2>${fchips(C.langs, FD.lang, 'lang')}</section>
    <section style="display:flex;flex-direction:column;gap:10px"><h2>จำนวนตอน · ความยาวต่อตอน</h2>${fchips([1, 3, 5, 10, 20].map((n) => ({ id: n, label: `${n} ตอน` })), FD.episodes, 'episodes')}${fchips(C.lens.map((n) => ({ id: n, label: `${n} วิ · เริ่ม ${C.prices.std[n]} ดาว/ตอน` })), FD.epLen, 'epLen')}</section>
    <section style="display:flex;flex-direction:column;gap:10px"><h2>2. นักแสดง (${FD.cast.length}/6)</h2>
      <span class="muted">เลือกจากอวตารที่บันทึกไว้ (หน้าเหมือนเดิมทุกตอน) หรือสร้างตัวละครใหม่</span>
      ${castRows}
      ${picks.length && FD.cast.length < 6 ? `<div class="avgrid">${picks.map((a) => `<button type="button" class="avcard" data-addc="${a.id}"><img src="${a.img}" alt="" loading="lazy"><b>+ ${esc(a.name)}</b></button>`).join('')}</div>` : ''}
      <a class="btn dark" href="#avatars?from=film">+ สร้างตัวละครใหม่ (ออกแบบหน้าตา)</a></section>
    <section style="display:flex;flex-direction:column;gap:10px"><h2>3. พล็อต</h2>
      <label class="f" for="premise">ไอเดียเรื่อง (ไม่บังคับ)<textarea id="premise" rows="3" maxlength="1500" placeholder="เช่น สาวเสิร์ฟถูกแฟนทิ้งกลางงานแต่ง แต่จริงๆ เธอคือทายาทเศรษฐีพันล้าน">${esc(FD.premise)}</textarea></label>
      <button type="button" class="btn dark" id="ideas">✨ ให้ AI เสนอพล็อต 3 แบบ (ฟรี)</button>
      ${FD.ideas ? FD.ideas.map((x, i) => `<button type="button" class="card" data-idea="${i}" style="text-align:left;${FD.pick === i ? 'border-color:var(--lime-text);background:var(--acc-card)' : ''}"><b>${esc(x.title)}</b><span>${esc(x.logline)}</span><span class="muted">ฮุค: ${esc(x.hook)}</span><span class="muted">หักมุม: ${esc(x.twist)}</span></button>`).join('') : ''}
      <label class="f" for="ftitle">ชื่อเรื่อง<input id="ftitle" type="text" maxlength="60" value="${esc(FD.title)}"></label>
      <label class="f" for="flog">เรื่องย่อ<textarea id="flog" rows="6" maxlength="5000">${esc(FD.logline)}</textarea></label></section>
    <button type="button" class="btn" id="fcreate">สร้างโปรเจกต์ + ให้ AI วางโครงทุกตอน (ฟรี)</button>
    <p class="muted">เขียนเรื่องและสคริปต์ฟรี · เสียดาวตอนกด "ถ่ายทำ" แต่ละตอนเท่านั้น</p>
  </main>${nav('create')}`;
  const keep = () => {
    FD.premise = $('#premise').value; FD.title = $('#ftitle').value; FD.logline = $('#flog').value;
    app.querySelectorAll('[data-cn]').forEach((e) => { FD.cast[e.dataset.cn].name = e.value; });
    app.querySelectorAll('[data-cr]').forEach((e) => { FD.cast[e.dataset.cr].role = e.value; });
    app.querySelectorAll('[data-cd]').forEach((e) => { FD.cast[e.dataset.cd].desc = e.value; });
    app.querySelectorAll('[data-cv]').forEach((e) => { FD.cast[e.dataset.cv].voice = e.value; });
  };
  bindF(FD, () => { keep(); filmNew(); });
  app.querySelectorAll('[data-addc]').forEach((b) => b.onclick = () => { keep(); const a = AVS.find((x) => x.id === Number(b.dataset.addc)); FD.cast.push({ avatarId: a.id, name: a.name, role: '', desc: '', voice: a.voice }); filmNew(); });
  app.querySelectorAll('[data-cx]').forEach((b) => b.onclick = () => { keep(); FD.cast.splice(Number(b.dataset.cx), 1); filmNew(); });
  app.querySelectorAll('[data-idea]').forEach((b) => b.onclick = () => { keep(); const x = FD.ideas[Number(b.dataset.idea)]; FD.pick = Number(b.dataset.idea); FD.title = x.title; FD.logline = `${x.logline} ${x.twist ? `(หักมุม: ${x.twist})` : ''}`.trim(); filmNew(); });
  $('#ideas').onclick = async (e) => {
    keep(); const bt = e.currentTarget; bt.disabled = true; bt.textContent = 'AI กำลังคิดพล็อต… (10–30 วิ)';
    try { const r = await api('api/films/ideas', { method: 'POST', body: FD }); FD.ideas = r.ideas; FD.pick = -1; filmNew(); }
    catch (er) { toast(er.message); bt.disabled = false; bt.textContent = '✨ ให้ AI เสนอพล็อต 3 แบบ (ฟรี)'; }
  };
  $('#fcreate').onclick = async (e) => {
    keep();
    if (!FD.cast.length) return toast('เลือกนักแสดงอย่างน้อย 1 คน');
    if (!FD.title.trim() || !FD.logline.trim()) return toast('ใส่ชื่อเรื่องและเรื่องย่อ หรือกดให้ AI เสนอพล็อต');
    const bt = e.currentTarget; bt.disabled = true; bt.textContent = `AI กำลังวางโครง ${FD.episodes} ตอน… (20–60 วิ)`;
    try { const f = await api('api/films', { method: 'POST', body: FD }); FD = null; go(`film?id=${f.id}`); }
    catch (er) { toast(er.message); bt.disabled = false; bt.textContent = 'สร้างโปรเจกต์ + ให้ AI วางโครงทุกตอน (ฟรี)'; }
  };
}
async function filmProject(id) {
  const f = await api(`api/films/${id}`); const C = FILMCAT;
  const price = (q) => C.prices[q][f.epLen];
  app.innerHTML = `${topbar(f.title, 'film')}<main>
    <section class="card"><b>${esc(f.title)}</b><span>${esc(f.logline)}</span><span class="muted">${esc(C.genres.find((g) => g.id === f.genre)?.label || '')} · ${esc(C.arts.find((a) => a.id === f.art)?.label || '')} · ${f.epLen} วิ/ตอน · ${f.episodes.length} ตอน</span>
      <div class="row" style="gap:8px;flex-wrap:wrap">${f.cast.map((c) => `<span class="chip" aria-pressed="false">${esc(c.name)}${c.role ? ` · ${esc(c.role)}` : ''}</span>`).join('')}</div></section>
    <div class="list">${f.episodes.map((e) => `<div style="flex-direction:column;align-items:stretch;gap:6px"><span><b>EP.${e.n} ${esc(e.title)}</b><br><span class="muted">${esc(e.summary)}</span>${e.cliff ? `<br><span class="muted">ค้าง: ${esc(e.cliff)}</span>` : ''}</span>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        ${e.workId ? `<a class="btn sm" href="#work?id=${e.workId}">▶ ดูตอนนี้</a>` : ''}
        <a class="btn ${e.hasScript ? 'dark' : ''} sm" href="#film?id=${f.id}&ep=${e.n}">${e.hasScript ? 'สคริปต์ / ถ่ายทำ' : 'เขียนสคริปต์ (ฟรี)'}</a></div></div>`).join('')}</div>
    <button type="button" class="btn ghost" id="addep">+ เพิ่มตอน</button>
    <section class="card" style="gap:8px"><b>ความยาวต่อตอน</b>${fchips(C.lens.map((x) => ({ id: x, label: `${x} วิ` })), f.epLen, 'len')}
      <span class="muted" style="font-size:13px">เปลี่ยนความยาว: ตอนที่ยังไม่ถ่ายต้องให้ AI เขียนสคริปต์ใหม่ (ฟรี) · ตอนที่ถ่ายแล้วไม่เปลี่ยน</span>
      <span class="muted">ราคาถ่ายทำต่อตอน ${f.epLen} วิ: มาตรฐาน ${price('std')} · คุณภาพสูง ${price('pro')}${C.prices.cine ? ` · หนังโรง ${price('cine')}` : ''} ดาว</span></section>
    <button type="button" class="btn ghost sm" id="delf">ลบเรื่องนี้</button>
  </main>${nav('create')}`;
  bindF({ set len(v) { if (Number(v) === f.epLen) return; api(`api/films/${id}`, { method: 'PATCH', body: { epLen: Number(v) } }).then(() => { toast(`เปลี่ยนเป็น ${v} วิ/ตอนแล้ว`); filmProject(id); }).catch((e) => toast(e.message)); } }, () => {});
  $('#addep').onclick = async () => { try { await api(`api/films/${id}`, { method: 'PATCH', body: { addEpisode: { title: '' } } }); filmProject(id); } catch (e) { toast(e.message); } };
  $('#delf').onclick = async (e) => { const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'แตะอีกครั้งเพื่อลบ (ตอนที่ถ่ายแล้วยังอยู่ในผลงาน)'; return; } await api(`api/films/${id}`, { method: 'DELETE' }); go('film'); };
}
let FQ = 'std';
async function filmEp(id, n) {
  let f = await api(`api/films/${id}`); const C = FILMCAT;
  let ep = f.episodes.find((e) => e.n === n);
  if (!ep) return go(`film?id=${id}`);
  const names = f.cast.map((c) => c.name);
  const draw = () => {
    const sc = ep.script;
    app.innerHTML = `${topbar(`EP.${ep.n} ${ep.title}`, `film?id=${id}`)}<main>
      <section class="card"><b>EP.${ep.n} ${esc(ep.title)}</b><span class="muted">${esc(ep.summary)}</span></section>
      ${!sc ? `<button type="button" class="btn" id="wscript">✨ ให้ AI เขียนสคริปต์ตอนนี้ (ฟรี)</button><p class="muted">AI จะแบ่งเป็นช็อตละ 5 วินาที พร้อมบทพูดของแต่ละตัวละครที่ยาวพอดีเวลา แก้ได้ทุกช็อตก่อนถ่ายทำ</p>`
        : `${sc.shots.map((s, i) => `<section class="card" style="gap:6px"><b>ช็อต ${i + 1} · 5 วิ <span class="badge ${['motion', 'talk'].includes(ep.plan?.[FQ]?.[i]) ? 'b-lime' : ''}">${ep.plan?.[FQ]?.[i] === 'talk' ? '🗣️ ตัวละครพูด AI (ปากตรงเสียง)' : ep.plan?.[FQ]?.[i] === 'motion' ? (FQ === 'cine' ? '🎞️ หนังโรง Seedance' : '🎥 วิดีโอ AI') : s.speaker && s.line ? '🗣️ กล้องเคลื่อน + ปากขยับ' : '📷 กล้องเคลื่อน'}</span></b>
          <label class="f">ฉาก / สิ่งที่เกิดขึ้น (AI ใช้สร้างภาพ)<textarea data-sa="${i}" rows="2" maxlength="400">${esc(s.action)}</textarea></label>
          <label class="f">สถานที่ / แสง<input type="text" data-ss="${i}" maxlength="300" value="${esc(s.scene)}"></label>
          <span class="muted">ในภาพ:</span><div class="chips">${names.map((nm) => `<button type="button" class="chip" data-sc="${i}" data-v="${esc(nm)}" aria-pressed="${s.chars.includes(nm)}">${esc(nm)}</button>`).join('')}</div>
          <label class="f">คนพูด<select data-sp="${i}"><option value="">(ไม่มีบทพูด)</option>${names.map((nm) => `<option ${s.speaker === nm ? 'selected' : ''}>${esc(nm)}</option>`).join('')}</select></label>
          <label class="f">บทพูด<input type="text" data-sl="${i}" maxlength="120" value="${esc(s.line)}" placeholder="ประโยคสั้นๆ พูดจบใน 5 วิ"></label>
          <button type="button" class="btn ghost sm" data-del="${i}">ลบช็อตนี้</button></section>`).join('')}
        <p class="muted" style="margin:0">${sc.shots.length}/${ep.maxShots || sc.shots.length} ช็อต · ยาวประมาณ ${sc.shots.length * 5} วิ (ตอนละ ${f.epLen} วิ)</p>
        ${sc.shots.length < (ep.maxShots || 99) ? '<button type="button" class="btn ghost" id="addshot">+ เพิ่มช็อต</button>' : ''}
        <div class="grid2"><button type="button" class="btn dark" id="rescript">เขียนใหม่ทั้งตอน</button><button type="button" class="btn dark" id="savescript">บันทึกสคริปต์</button></div>
        <section class="hero"><b>ถ่ายทำตอนนี้</b>${fchips([{ id: 'std', label: `มาตรฐาน · ${C.prices.std[f.epLen]} ดาว` }, { id: 'pro', label: `คุณภาพสูง · ${C.prices.pro[f.epLen]} ดาว` }, ...(C.prices.cine ? [{ id: 'cine', label: `🎞️ หนังโรง · ${C.prices.cine[f.epLen]} ดาว` }] : [])], FQ, 'q')}
          <span class="muted">${FQ === 'cine' ? 'หนังโรง: Seedance 2.5 ทุกช็อต ฉากแอ็กชันลื่นระดับภาพยนตร์ มีเสียงประกอบฉากในตัว ภาพคม 720p · ใช้เวลาประมาณ 8–15 นาที' : FQ === 'pro' ? 'คุณภาพสูง: วิดีโอ AI เคลื่อนไหวจริงทุกช็อต ภาพคมระดับโปร เหมาะเอาไปทำรายได้ · ใช้เวลาประมาณ 8–15 นาที' : 'มาตรฐาน: ช็อตแอ็กชันสำคัญเป็นวิดีโอ AI ช็อตบทพูดเป็นกล้องเคลื่อน+ปากขยับตามเสียง ถูกและเร็ว · ใช้เวลาประมาณ 4–8 นาที'} · ไม่สำเร็จคืนดาวอัตโนมัติ</span>
          <button type="button" class="btn" id="shoot" ${C.ready ? '' : 'disabled'}>🎬 ถ่ายทำ EP.${ep.n} · ${C.prices[FQ][f.epLen]} ดาว</button>${C.ready ? '' : '<span class="badge b-warn">ระบบถ่ายทำกำลังตั้งค่า</span>'}</section>`}
    </main>${nav('create')}`;
    const keep = () => { if (!ep.script) return; ep.script.shots.forEach((s, i) => { s.action = $(`[data-sa="${i}"]`).value; s.scene = $(`[data-ss="${i}"]`).value; s.speaker = $(`[data-sp="${i}"]`).value; s.line = $(`[data-sl="${i}"]`).value; }); };
    const ws = $('#wscript'); if (ws) ws.onclick = async () => { ws.disabled = true; ws.textContent = 'AI กำลังเขียนสคริปต์… (20–60 วิ)'; try { f = await api(`api/films/${id}/episodes/${n}/script`, { method: 'POST' }); ep = f.episodes.find((e) => e.n === n); draw(); } catch (e) { toast(e.message); ws.disabled = false; ws.textContent = '✨ ให้ AI เขียนสคริปต์ตอนนี้ (ฟรี)'; } };
    if (!ep.script) return;
    bindF({ set q(v) { FQ = v; } }, () => { keep(); draw(); });
    app.querySelectorAll('[data-sc]').forEach((b) => b.onclick = () => { keep(); const s = ep.script.shots[Number(b.dataset.sc)]; const nm = b.dataset.v; s.chars = s.chars.includes(nm) ? s.chars.filter((x) => x !== nm) : [...s.chars, nm].slice(0, 3); draw(); });
    app.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { keep(); ep.script.shots.splice(Number(b.dataset.del), 1); draw(); });
    if ($('#addshot')) $('#addshot').onclick = () => { keep(); ep.script.shots.push({ scene: ep.script.shots.at(-1)?.scene || '', action: '', camera: 'medium shot', chars: [], speaker: '', line: '', mood: 'tense' }); draw(); };
    const save = async () => { keep(); f = await api(`api/films/${id}/episodes/${n}/script`, { method: 'PUT', body: { shots: ep.script.shots } }); ep = f.episodes.find((e) => e.n === n); };
    $('#savescript').onclick = async () => { try { await save(); toast('บันทึกแล้ว'); draw(); } catch (e) { toast(e.message); } };
    $('#rescript').onclick = async (e) => { const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'แตะอีกครั้ง (บทที่แก้ไว้จะหาย)'; return; } b.disabled = true; b.textContent = 'AI กำลังเขียน…'; try { f = await api(`api/films/${id}/episodes/${n}/script`, { method: 'POST' }); ep = f.episodes.find((x) => x.n === n); draw(); } catch (er) { toast(er.message); b.disabled = false; } };
    $('#shoot').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try {
        await save();
        const fd = new FormData(); fd.append('data', JSON.stringify({ kind: 'video', goal: 'content', style: 'v_film', filmId: id, ep: n, quality: FQ, epLen: f.epLen }));
        const r = await api('api/works', { method: 'POST', body: fd });
        if (r.me) ME = r.me; CAT = null;
        toast('เริ่มถ่ายทำแล้ว เสร็จแล้วแจ้งเตือน'); go(`work?id=${r.id}`);
      } catch (er) { toast(er.message); b.disabled = false; }
    };
  };
  draw();
}
// ---------- โพสต์ตรง ----------
const SOC_ICON = { youtube: '▶️', fbpage: '📘', igbiz: '📸' };
async function socialView(qs) {
  const r0 = new URLSearchParams(qs || '').get('r');
  const d = await api('api/social');
  const msg = { ok: '✅ เชื่อมบัญชีแล้ว', fail: 'เชื่อมไม่สำเร็จ ลองใหม่อีกครั้ง (ต้องกดยอมรับทุกสิทธิ์)', nochannel: 'บัญชี Google นี้ยังไม่มีช่อง YouTube สร้างช่องก่อนแล้วเชื่อมใหม่', nopage: 'ไม่พบเพจที่คุณเป็นแอดมิน (Instagram ต้องเป็นบัญชีธุรกิจที่ผูกกับเพจ)', notready: 'ระบบยังไม่ได้ตั้งค่า แจ้งแอดมิน' }[r0];
  const acc = d.accounts;
  app.innerHTML = `${topbar('โพสต์ตรงจากแอป', 'profile')}<main>
    ${msg ? `<section class="card"><b>${esc(msg)}</b></section>` : ''}
    <p class="muted">เชื่อมบัญชีครั้งเดียว แล้วกด "โพสต์ตรง" ในหน้าผลงานได้เลย หรือตั้งเวลาให้ระบบโพสต์เอง · แคปชั่น + แฮชแท็กใส่ให้อัตโนมัติ</p>
    <div class="list">${acc.length ? acc.map((a) => `<div><span>${SOC_ICON[a.kind] || ''} <b>${esc(a.name)}</b><br><span class="muted">${esc(a.label)}${a.broken ? ' · ⚠️ การเชื่อมต่อหมดอายุ เชื่อมใหม่' : ''}</span></span>
      <button type="button" class="btn ghost sm" data-unlink="${a.id}">ยกเลิก</button></div>`).join('') : '<div class="muted">ยังไม่ได้เชื่อมบัญชี</div>'}</div>
    <section class="card"><b>▶️ YouTube Shorts</b><span class="muted">โพสต์คลิปแนวตั้งเป็น Shorts ใส่ชื่อ คำอธิบาย แฮชแท็กให้</span>
      ${d.ready.youtube ? '<a class="btn" href="social/youtube/connect">เชื่อม YouTube</a>' : '<span class="badge b-warn">ระบบกำลังตั้งค่า</span>'}</section>
    <section class="card"><b>📘 Facebook Page + 📸 Instagram</b><span class="muted">โพสต์ลงเพจที่คุณเป็นแอดมิน (คลิป = Reels, ภาพ = โพสต์รูป) · Instagram ต้องเป็นบัญชีธุรกิจ/ครีเอเตอร์ที่ผูกกับเพจ</span>
      ${d.ready.meta ? '<a class="btn" href="social/meta/connect">เชื่อม Facebook / Instagram</a>' : '<span class="badge b-warn">ระบบกำลังตั้งค่า</span>'}</section>
    <p class="muted">TikTok: ยังโพสต์ตรงไม่ได้ (TikTok ต้องอนุมัติแอปก่อน) ใช้ปุ่มคัดลอกแคปชั่น + บันทึกคลิปไปก่อน</p>
  </main>${nav('profile')}`;
  app.querySelectorAll('[data-unlink]').forEach((b) => b.onclick = async () => {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'แตะอีกครั้ง'; return; }
    await api(`api/social/${b.dataset.unlink}`, { method: 'DELETE' }).catch((e) => toast(e.message)); socialView('');
  });
}
async function pubCard(w) {
  const el = $('#pubcard'); if (!el) return;
  const [d, h] = await Promise.all([api('api/social'), api(`api/works/${w.id}/publish`)]);
  const vid = w.kind === 'video';
  const accs = d.accounts.filter((a) => !a.broken && (vid || a.kind !== 'youtube'));
  const st = { scheduled: '⏳ รอโพสต์', posting: '🔄 กำลังโพสต์', posted: '✅ โพสต์แล้ว', failed: '⚠️ ไม่สำเร็จ', canceled: 'ยกเลิก' };
  const hist = h.items.length ? `<div class="list">${h.items.map((x) => `<div><span><b>${esc(x.name || x.platform)}</b> · ${st[x.status] || x.status}<br><span class="muted">${new Date(x.at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}${x.error ? ' · ' + esc(x.error) : ''}</span></span>
    ${x.result?.url ? `<a class="btn ghost sm" href="${esc(x.result.url)}" target="_blank" rel="noopener">เปิดดู</a>` : ''}</div>`).join('')}</div>` : '';
  if (!accs.length) {
    el.innerHTML = `<b>โพสต์ตรง</b><span class="muted">เชื่อม ${vid ? 'YouTube · ' : ''}Facebook Page · Instagram ครั้งเดียว แล้วโพสต์จากที่นี่ได้เลย</span><a class="btn dark" href="#social">เชื่อมบัญชี</a>${hist}`;
    return;
  }
  el.innerHTML = `<b>โพสต์ตรง</b><span class="muted">เลือกบัญชี · แคปชั่นตามแพลตฟอร์ม + แฮชแท็กใส่ให้เอง</span>
    <div class="chips">${accs.map((a) => `<button type="button" class="chip" data-tg="${a.id}" aria-pressed="false">${SOC_ICON[a.kind] || ''} ${esc(a.name)}</button>`).join('')}</div>
    ${accs.some((a) => a.kind === 'youtube') ? `<label class="f" for="ytp">YouTube: การมองเห็น<select id="ytp"><option value="public">สาธารณะ</option><option value="unlisted">ไม่เป็นสาธารณะ (มีลิงก์ดูได้)</option><option value="private">ส่วนตัว</option></select></label>` : ''}
    <label class="row between" for="pubLater"><span>ตั้งเวลาโพสต์</span><input id="pubLater" type="checkbox" class="sw-in"></label>
    <input id="pubAt" type="datetime-local" hidden>
    <button type="button" class="btn" id="pubGo">โพสต์เลย</button>${hist}`;
  const sel = new Set();
  el.querySelectorAll('[data-tg]').forEach((b) => b.onclick = () => { const id = Number(b.dataset.tg); if (sel.has(id)) sel.delete(id); else sel.add(id); b.setAttribute('aria-pressed', String(sel.has(id))); });
  const later = $('#pubLater'), at = $('#pubAt'), go = $('#pubGo');
  later.onchange = () => { at.hidden = !later.checked; go.textContent = later.checked ? 'ตั้งเวลาโพสต์' : 'โพสต์เลย'; if (later.checked && !at.value) { const t = new Date(Date.now() + 3600e3); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); at.value = t.toISOString().slice(0, 16); } };
  go.onclick = async () => {
    if (!sel.size) return toast('เลือกบัญชีที่จะโพสต์');
    let when;
    if (later.checked) { if (!at.value) return toast('เลือกเวลา'); when = new Date(at.value).toISOString(); }
    go.disabled = true;
    try {
      const r = await api(`api/works/${w.id}/publish`, { method: 'POST', body: { targets: [...sel], at: when, privacy: $('#ytp')?.value } });
      toast(when ? `ตั้งเวลาแล้ว ${r.n} บัญชี` : `กำลังโพสต์ ${r.n} บัญชี · เสร็จแล้วแจ้งเตือนทาง LINE`);
      setTimeout(() => pubCard(w).catch(() => {}), 1500);
      if (!when) { let n = 0; const iv = setInterval(() => { if (++n > 40 || !location.hash.startsWith('#work')) return clearInterval(iv); pubCard(w).then(() => {}).catch(() => {}); }, 8000); }
    } catch (e) { toast(e.message); go.disabled = false; }
  };
}
async function schedCard(w, postNow) {
  const el = $('#sched'); if (!el) return;
  const { items } = await api(`api/schedules?work=${w.id}`);
  const pend = items.filter((x) => x.status === 'scheduled' || x.status === 'due');
  const sel = new Set(['tiktok']);
  const next = new Date(Date.now() + 3600e3); next.setMinutes(0, 0, 0);
  const due = postNow ? items.find((x) => x.platform === postNow && x.status === 'due') : null;
  el.innerHTML = `
    ${due ? `<div class="card" style="background:var(--acc-card);border-color:var(--lime-line)"><b>📣 ถึงเวลาโพสต์ ${esc(due.platformLabel)}</b>
      <span class="muted">1) บันทึกคลิป/ภาพ 2) คัดลอกแคปชั่น 3) เปิดแอป ${esc(due.platformLabel)} แล้วโพสต์</span>
      <div class="grid2"><button type="button" class="btn sm" id="dueCopy">คัดลอกแคปชั่น</button><button type="button" class="btn dark sm" id="dueDone">โพสต์แล้ว ✓</button></div></div>` : ''}
    <div class="row between"><b>ตั้งเวลาโพสต์</b><a href="#plan" style="font-size:14px">ปฏิทินโพสต์</a></div>
    <span class="muted">ถึงเวลาจะแจ้งเตือนเข้ามือถือ แตะแล้วโพสต์ได้เลย (โพสต์อัตโนมัติจะเปิดเมื่อเชื่อมเพจได้)</span>
    <div class="chips">${PLAT_S.map(([k, l]) => `<button type="button" class="chip" data-sp="${k}" aria-pressed="${sel.has(k)}">${l}</button>`).join('')}</div>
    <input id="sat" type="datetime-local" value="${localDT(next)}" min="${localDT(new Date())}" aria-label="วันเวลาโพสต์">
    <div class="chips">${[['คืนนี้ 20:00', 20, 0], ['พรุ่งนี้ 12:00', 12, 1], ['พรุ่งนี้ 19:00', 19, 1]].map(([l, h, d]) => `<button type="button" class="chip" data-qt="${h}:${d}" style="min-height:34px;font-size:13px">${l}</button>`).join('')}</div>
    <button type="button" class="btn" id="sadd">ตั้งเวลา</button>
    ${pend.length ? `<div class="list">${pend.map((x) => `<div><span><b>${esc(x.platformLabel)}</b><br><span class="muted">${fmtWhen(x.at)}${x.status === 'due' ? ' · ถึงเวลาแล้ว' : ''}</span></span>
      <span class="row" style="gap:6px"><button type="button" class="chip" data-sdone="${x.id}" style="min-height:32px;font-size:12px">โพสต์แล้ว</button><button type="button" class="chip" data-sdel="${x.id}" style="min-height:32px;font-size:12px">ยกเลิก</button></span></div>`).join('')}</div>` : ''}`;
  el.querySelectorAll('[data-sp]').forEach((b) => b.onclick = () => { const k = b.dataset.sp; if (sel.has(k)) sel.delete(k); else sel.add(k); b.setAttribute('aria-pressed', String(sel.has(k))); });
  el.querySelectorAll('[data-qt]').forEach((b) => b.onclick = () => { const [h, d] = b.dataset.qt.split(':').map(Number); const t = new Date(); t.setDate(t.getDate() + d); t.setHours(h, 0, 0, 0); if (t < new Date()) t.setDate(t.getDate() + 1); $('#sat').value = localDT(t); });
  $('#sadd').onclick = async () => {
    try {
      const at = new Date($('#sat').value);
      await api('api/schedules', { method: 'POST', body: { workId: w.id, platforms: [...sel], at: at.toISOString() } });
      toast(`ตั้งเวลาแล้ว ${fmtWhen(at)}`);
      await ensurePush(true);
      schedCard(w);
    } catch (e) { toast(e.message); }
  };
  const mark = async (id, status) => { await api(`api/schedules/${id}`, { method: 'PATCH', body: { status } }); schedCard(w); };
  el.querySelectorAll('[data-sdone]').forEach((b) => b.onclick = () => mark(b.dataset.sdone, 'posted').then(() => toast('บันทึกว่าโพสต์แล้ว')));
  el.querySelectorAll('[data-sdel]').forEach((b) => b.onclick = () => mark(b.dataset.sdel, 'canceled'));
  if (due) {
    $('#dueCopy').onclick = async () => {
      const k = ['facebook', 'instagram', 'tiktok', 'shopee'].includes(due.platform) ? due.platform : 'facebook';
      const txt = (w.captions?.[k] || '') + (w.hashtags?.length ? '\n\n' + w.hashtags.join(' ') : '');
      try { await navigator.clipboard.writeText(txt); toast('คัดลอกแล้ว'); } catch { prompt('คัดลอกแคปชั่น', txt); }
    };
    $('#dueDone').onclick = () => mark(due.id, 'posted').then(() => toast('เยี่ยม! บันทึกว่าโพสต์แล้ว'));
  }
}
// แจ้งเตือนเข้ามือถือ (Web Push) — iPhone ต้อง "เพิ่มไปยังหน้าจอโฮม" ก่อน
async function ensurePush(ask) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  const reg = await navigator.serviceWorker.register('sw.js');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    if (!ask) return 'off';
    if (Notification.permission === 'denied') return 'denied';
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    const { key } = await api('api/push/key');
    const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (key.length % 4)) % 4));
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)) });
  }
  await api('api/push/subscribe', { method: 'POST', body: sub.toJSON() });
  return 'on';
}
async function planView() {
  app.innerHTML = `${topbar('ปฏิทินโพสต์', 'works')}<main>${LOAD()}</main>${nav('works')}`;
  const { items } = await api('api/schedules');
  const st = await ensurePush(false).catch(() => 'off');
  const ios = /iphone|ipad/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;
  const groups = {};
  items.forEach((x) => { const d = new Date(x.at).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }); (groups[d] = groups[d] || []).push(x); });
  const lab = { scheduled: ['รอโพสต์', 'b-lime'], due: ['ถึงเวลาแล้ว', 'b-warn'], posted: ['โพสต์แล้ว', 'b-ok'] };
  $('main').innerHTML = `
    <section class="card"><b>แจ้งเตือนเข้ามือถือ</b>
      ${st === 'on' ? '<span class="muted">เปิดอยู่ ✓ ถึงเวลาโพสต์จะเด้งเตือน</span><button type="button" class="btn dark sm" id="ptest">ทดสอบแจ้งเตือน</button>'
        : ios ? '<span class="muted">iPhone/iPad: กดปุ่มแชร์ของ Safari → "เพิ่มไปยังหน้าจอโฮม" แล้วเปิด Mc Rich จากไอคอน จากนั้นกลับมากดเปิดแจ้งเตือนที่นี่</span><button type="button" class="btn sm" id="pon">เปิดแจ้งเตือน</button>'
        : st === 'unsupported' ? '<span class="muted">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน</span>' : '<button type="button" class="btn sm" id="pon">เปิดแจ้งเตือน</button>'}</section>
    ${Object.keys(groups).length ? Object.entries(groups).map(([d, xs]) => `<h2>${esc(d)}</h2><div class="list">${xs.map((x) => `<a href="#work?id=${x.workId}${x.status === 'due' ? `&post=${x.platform}` : ''}" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit">
      ${x.thumb ? `<img src="${x.thumb}" alt="" style="width:48px;height:60px;object-fit:cover;border-radius:8px">` : ''}
      <span style="flex:1;min-width:0"><b>${new Date(x.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} · ${esc(x.platformLabel)}</b><br><span class="muted" style="overflow-wrap:anywhere">${esc(x.title || '')}</span></span>
      <span class="badge ${lab[x.status]?.[1] || ''}">${lab[x.status]?.[0] || x.status}</span></a>`).join('')}</div>`).join('')
      : '<div class="soon card"><h2>ยังไม่มีโพสต์ที่ตั้งเวลา</h2><p class="muted">เปิดผลงาน แล้วกด "ตั้งเวลาโพสต์"</p><a class="btn" href="#works">ไปที่ผลงาน</a></div>'}`;
  const on = $('#pon'); if (on) on.onclick = async () => { const r = await ensurePush(true).catch((e) => toast(e.message)); if (r === 'on') { toast('เปิดแจ้งเตือนแล้ว'); planView(); } else if (r === 'denied') toast('ถูกปิดสิทธิ์แจ้งเตือน เปิดได้ที่การตั้งค่าเบราว์เซอร์'); };
  const t = $('#ptest'); if (t) t.onclick = () => api('api/push/test', { method: 'POST', body: {} }).then((r) => toast(r.sent ? 'ส่งแล้ว ดูที่แจ้งเตือน' : 'ยังไม่มีอุปกรณ์ที่เปิดแจ้งเตือน'));
}


// ---------- โหมดอัตโนมัติ ----------
const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
async function autoView(qs) {
  app.innerHTML = `${topbar('โหมดอัตโนมัติ', 'works')}<main>${LOAD()}</main>${nav('works')}`;
  const d = await api('api/auto');
  const edit = new URLSearchParams(qs || '').get('edit');
  if (edit) return autoForm(d, d.items.find((x) => String(x.id) === edit) || null);
  $('main').innerHTML = `
    <section class="card"><b>ให้ Mc Rich ทำคอนเทนต์ให้เอง 🤖</b>
      <span class="muted">ตั้งสินค้า วัน และเวลาโพสต์ ระบบจะสร้างภาพ/คลิปให้ล่วงหน้า ${d.leadMin} นาที หมุนแนวไม่ซ้ำ แล้วเตือนให้โพสต์ตามเวลา ตัดดาวเฉพาะตอนสร้างจริง และไม่เกินเพดานที่ตั้งไว้</span></section>
    ${d.items.length ? `<div class="list">${d.items.map((p) => `<div style="display:flex;gap:12px;align-items:flex-start">
      ${p.thumb ? `<img src="${p.thumb}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px">` : RICH('head', 44)}
      <span style="flex:1;min-width:0"><b>${esc(p.name)}</b><br>
        <span class="muted">${p.days.map((x) => DAYS[x]).join(' ')} · ${esc(p.time)} น. · ${p.styles.length} แนว</span><br>
        <span class="muted">เดือนนี้ใช้ ${num(p.spent)}/${num(p.cap)} ดาว · ประมาณ ${num(p.estMonth)} ดาว/เดือน · ทำไปแล้ว ${num(p.runs)} ชิ้น</span>
        ${p.lastError ? `<br><span class="badge b-warn">${esc(p.lastError)}</span>` : ''}
        ${p.lastWorkId ? `<br><a href="#work?id=${p.lastWorkId}" style="font-size:14px">ผลงานล่าสุด ›</a>` : ''}
        <span class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">
          <button type="button" class="btn dark sm" data-run="${p.id}">สร้างเลยตอนนี้</button>
          <a class="btn dark sm" href="#auto?edit=${p.id}">แก้ไข</a>
          <button type="button" class="btn dark sm" data-del="${p.id}" aria-label="ลบแผน ${esc(p.name)}">ลบ</button></span></span>
      <label style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:12px" class="muted"><input type="checkbox" class="sw-in" data-on="${p.id}" ${p.active ? 'checked' : ''} aria-label="เปิดใช้แผน ${esc(p.name)}">${p.active ? 'เปิด' : 'พัก'}</label>
    </div>`).join('')}</div>` : ''}
    <a class="btn" href="#auto?edit=new" style="width:100%">+ ตั้งแผนอัตโนมัติ</a>
    <p class="muted" style="font-size:13px">แนวที่หมุนให้: ${d.styles.map((s) => esc(s.label)).join(' · ')}</p>`;
  app.querySelectorAll('[data-on]').forEach((b) => b.onchange = (e) => api(`api/auto/${b.dataset.on}`, { method: 'PATCH', body: { active: e.target.checked } }).then(() => { toast(e.target.checked ? 'เปิดแผนแล้ว' : 'พักแผนแล้ว'); autoView(); }).catch((x) => toast(x.message)));
  app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (!confirm('ลบแผนนี้? (ผลงานที่สร้างไปแล้วยังอยู่)')) return; await api(`api/auto/${b.dataset.del}`, { method: 'DELETE' }); toast('ลบแล้ว'); autoView(); });
  app.querySelectorAll('[data-run]').forEach((b) => b.onclick = async () => {
    b.disabled = true; b.textContent = 'กำลังสั่ง…';
    try { const r = await api(`api/auto/${b.dataset.run}/run`, { method: 'POST', body: {} }); toast(`สั่งทำ "${r.style}" แล้ว (${r.cost} ดาว)`); ME.stars -= r.cost; go(`work?id=${r.workId}`); }
    catch (e) { toast(e.message); b.disabled = false; b.textContent = 'สร้างเลยตอนนี้'; }
  });
}
function autoForm(d, p) {
  const v = p || { name: '', goal: 'sell', product: {}, styles: ['sale_banner', 'product_luxury', 'v_mystery', 'v_show'], days: [1, 3, 5], time: '19:00', platforms: ['tiktok', 'facebook'], cap: 300, videoLen: 15 };
  const chip = (g, val, label, on) => `<button type="button" class="chip" data-g="${g}" data-v="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
  $('main').innerHTML = `<h1 style="font-size:22px">${p ? 'แก้ไขแผน' : 'ตั้งแผนอัตโนมัติ'}</h1>
    <section class="card">
      <label class="f" for="an">ชื่อสินค้า / เรื่อง<input id="an" type="text" maxlength="80" value="${esc(v.product.name || '')}" placeholder="เช่น เซรั่มหน้าใส 30ml"></label>
      <div class="grid2"><label class="f" for="ap">ราคา (ไม่บังคับ)<input id="ap" type="text" maxlength="40" value="${esc(v.product.price || '')}" placeholder="199 บาท"></label>
      <label class="f" for="ag">เป้าหมาย<select id="ag">${[['sell', 'ขายของ'], ['aff', 'แอฟฟิลิเอต'], ['promo', 'โปรโมตร้าน'], ['content', 'คอนเทนต์']].map(([k, l]) => `<option value="${k}" ${v.goal === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <label class="f" for="ad">จุดเด่น / รายละเอียด<textarea id="ad" rows="3" maxlength="500" placeholder="เช่น ลดฝ้า ใน 7 วัน ส่งฟรี">${esc(v.product.details || '')}</textarea></label>
      <label class="f" for="al">ลิงก์สินค้า (ไม่บังคับ)<input id="al" type="url" maxlength="300" value="${esc(v.product.link || '')}" placeholder="https://"></label>
      ${p ? `<span class="muted">รูปสินค้า: ${p.photos} รูป (ลบแล้วตั้งใหม่ถ้าต้องเปลี่ยนรูป)</span>` : `<label class="f" for="af">รูปสินค้า 1–3 รูป (จำเป็นสำหรับคลิป)<input id="af" type="file" accept="image/*" multiple></label>`}
    </section>
    <section class="card"><b>แนวงานที่ให้หมุนเวียน</b><span class="muted">ระบบสลับให้ทีละแนว ไม่ซ้ำติดกัน</span>
      <div class="chips">${d.styles.map((s) => chip('st', s.id, `${s.kind === 'video' ? '🎬' : '🖼️'} ${s.label} · ${s.est}⭐`, v.styles.includes(s.id))).join('')}</div>
      <label class="f" for="avl">ความยาวคลิป<select id="avl"><option value="15" ${v.videoLen === 15 ? 'selected' : ''}>15 วินาที</option><option value="30" ${v.videoLen === 30 ? 'selected' : ''}>30 วินาที</option></select></label></section>
    <section class="card"><b>วันและเวลาโพสต์</b>
      <div class="chips">${DAYS.map((x, i) => chip('dy', i, x, v.days.includes(i))).join('')}</div>
      <label class="f" for="at">เวลาโพสต์<input id="at" type="time" value="${esc(v.time)}"></label>
      <b style="margin-top:6px">โพสต์ที่ไหน (เตือนตามเวลา)</b>
      <div class="chips">${PLATS.filter(([k]) => k !== 'other').map(([k, l]) => chip('pf', k, l, v.platforms.includes(k))).join('')}</div></section>
    <section class="card"><label class="f" for="ac">เพดานดาวต่อเดือน<input id="ac" type="number" min="10" max="5000" step="10" value="${v.cap}"></label>
      <span class="muted" id="aest"></span></section>
    <div class="grid2"><a class="btn dark" href="#auto">ยกเลิก</a><button type="button" class="btn" id="asave">${p ? 'บันทึก' : 'เริ่มแผน'}</button></div>`;
  app.querySelectorAll('.chip[data-g]').forEach((b) => b.onclick = () => { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); est(); });
  const pick = (g) => [...app.querySelectorAll(`.chip[data-g="${g}"][aria-pressed="true"]`)].map((b) => b.dataset.v);
  const est = () => {
    const sts = pick('st').map((id) => d.styles.find((s) => s.id === id)); const len = Number($('#avl').value);
    const avg = sts.length ? sts.reduce((a, s) => a + (len === 30 ? s.est30 : s.est), 0) / sts.length : 0;
    $('#aest').textContent = `ประมาณ ${num(Math.round(avg * pick('dy').length * 4.35))} ดาว/เดือน (${pick('dy').length} ชิ้น/สัปดาห์) · ถ้าครบเพดาน ระบบจะหยุดเองจนถึงเดือนหน้า`;
  };
  $('#avl').onchange = est; est();
  $('#asave').onclick = async (e) => {
    const data = { name: $('#an').value, goal: $('#ag').value, product: { name: $('#an').value, price: $('#ap').value, details: $('#ad').value, link: $('#al').value },
      styles: pick('st'), days: pick('dy').map(Number), time: $('#at').value, platforms: pick('pf'), cap: Number($('#ac').value), videoLen: Number($('#avl').value) };
    e.target.disabled = true;
    try {
      if (p) await api(`api/auto/${p.id}`, { method: 'PATCH', body: { full: data } });
      else {
        const fd = new FormData(); fd.append('data', JSON.stringify(data));
        [...($('#af')?.files || [])].slice(0, 3).forEach((f) => fd.append('refs', f));
        await api('api/auto', { method: 'POST', body: fd });
      }
      toast(p ? 'บันทึกแล้ว' : 'เริ่มแผนแล้ว 🤖'); go('auto');
    } catch (x) { toast(x.message); e.target.disabled = false; }
  };
}

// ---------- แจ้งเตือน (โปรไฟล์) ----------
async function notifCard() {
  const el = $('#notif'); if (!el) return;
  const n = await api('api/profile/notify');
  el.innerHTML = `<h2 style="font-size:16px">แจ้งเตือน</h2>
    ${n.oa ? (n.hasLine ? `<label class="row between" for="nline"><span><b>แจ้งเตือนผ่าน LINE</b><br><span class="muted">ผลงานเสร็จ · ถึงเวลาโพสต์ · คุยกับน้องริชใน LINE</span></span>
        <input id="nline" type="checkbox" class="sw-in" ${n.line ? 'checked' : ''}></label>
        <div class="grid2"><a class="btn sm" href="${esc(n.oa.url)}" target="_blank" rel="noopener">เพิ่มเพื่อน ${esc(n.oa.id)}</a><button type="button" class="btn dark sm" id="ntest">ทดสอบ</button></div>
        <span class="muted">ต้องเพิ่มเพื่อน LINE OA ก่อน จึงจะได้รับข้อความ</span>`
      : '<span class="muted">แจ้งเตือนผ่าน LINE ใช้ได้กับบัญชีที่เข้าด้วย LINE</span>') : '<span class="muted">แจ้งเตือนผ่าน LINE เร็วๆ นี้</span>'}
    <a class="btn dark sm" href="#plan" style="width:100%">แจ้งเตือนเข้ามือถือ (ปฏิทินโพสต์)</a>`;
  const nl = $('#nline'); if (nl) nl.onchange = (e) => api('api/profile/notify', { method: 'PUT', body: { line: e.target.checked } }).then(() => toast('บันทึกแล้ว'));
  const nt = $('#ntest'); if (nt) nt.onclick = () => api('api/chat/line-test', { method: 'POST', body: {} }).then((r) => toast(r.ok ? 'ส่งแล้ว ดูใน LINE' : 'ส่งไม่ได้ เพิ่มเพื่อน OA ก่อนนะ'));
}

// ---------- แชทน้องริช ----------
let CHAT = null;
function openDraft(d) {
  D = { ...newDraft(), kind: d.kind, style: d.style, goal: d.goal || 'sell', product: d.product || '', headline: d.headline || '', price: d.price || '', details: d.details || '', hookText: d.hookText || '', step: d.style ? 2 : 1 };
  if (d.style === 'v_series') Object.assign(D, { goal: 'content', genre: d.genre || 'magic', art: d.art || 'cartoon3d', seriesFrom: d.seriesFrom || 0, seriesInfo: d.seriesInfo || null, plot: d.plot || '' });
  if (d.kind === 'image') { const st = CAT?.styles?.find((x) => x.id === d.style); if (st) D.ratio = st.ratio; }
  REFS = []; REVS = []; VFILE = null; VFILES = []; ITEMF = []; saveDraft(); go('create');
}
const botAv = () => `<span class="av" aria-hidden="true">${RICH('head', 30)}</span>`;
// การ์ดงานที่ริชแนะนำ (หน้าตาและปุ่มเดียวกับการ์ดใน LINE)
const draftBox = (m) => { const d = m.draft; return `<div class="dcard"><div class="dh"><small>${d.kind === 'video' ? 'คลิปแนะนำ' : 'ภาพแนะนำ'}</small><b>${esc(styleName(d.style) || d.label || '')}</b></div>
  <div class="db">${d.product ? `<b>${esc(d.product)}</b>` : ''}${d.headline ? `<span class="muted">“${esc(d.headline)}”</span>` : ''}${d.details ? `<span class="muted dd">${esc(d.details)}</span>` : ''}
  ${d.est ? `<span class="est">${ICON.star}${esc(d.est)}</span>` : ''}<small class="muted">ยังไม่ตัดดาว จนกว่าจะกดยืนยัน</small></div>
  <div class="df"><button type="button" class="btn sm" data-draft="${m.id ?? ''}">${ICON.plus}${esc(d.label || 'สร้างงานนี้')}</button><button type="button" class="btn ghost sm" data-chip="ขอแนวอื่นอีก">ขอแนวอื่น</button></div></div>`; };
const styleName = (id) => [...(CAT?.styles || []), ...(CAT?.video?.styles || [])].find((x) => x.id === id)?.label || '';
const bubble = (m) => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${m.role === 'user' ? '' : botAv()}
  <div style="min-width:0"><div class="bb">${esc(m.content).replace(/\n/g, '<br>')}</div>
  ${m.draft ? draftBox(m) : ''}
  ${(m.links || []).map((l) => `<a class="btn sm" href="${esc(l.href)}" style="margin-top:8px">${esc(l.label)}</a>`).join('')}
  ${m.channel === 'line' ? '<div class="meta">ผ่าน LINE</div>' : ''}</div></div>`;
const CHAT_SUGG = [
  ['ขายของออนไลน์', 'ช่วยคิดภาพหรือคลิปขายสินค้า'],
  ['ทำ Affiliate', 'ป้ายยาให้คนกดลิงก์'],
  ['โปรโมตร้าน', 'โพสต์เรียกลูกค้าเข้าร้าน'],
  ['งานองค์กร', 'ประกาศ ประชาสัมพันธ์'],
];
async function chatView(qs) {
  const params = new URLSearchParams(qs || '');
  app.innerHTML = `<header class="top chat-top"><div class="who"><span class="avbot">${RICH('head', 34)}</span><span style="display:flex;flex-direction:column;min-width:0"><b>น้องริช</b><small>ผู้ช่วย AI ของคุณ</small></span></div>
      ${ME ? `<a class="pill num" href="#stars">${ICON.star}${num(ME.stars)} ดาว</a>` : ''}</header>
    <main class="chat2"><div id="msgs" aria-live="polite"><div class="chat-hello">${RICH('think', 96)}<p class="muted">กำลังโหลด…</p></div></div></main>
    <form class="composer" id="cf"><div class="in"><div id="chips" class="chips" role="group" aria-label="คำแนะนำ"></div>
      <div class="box"><textarea id="ct" rows="1" maxlength="1000" placeholder="พิมพ์คุยกับริช…" aria-label="ข้อความถึงน้องริช" enterkeyhint="send"></textarea>
        <button class="send" id="cs" type="submit" aria-label="ส่งข้อความ" disabled>${ICON.send}</button></div>
      <div class="q"><span id="cq"></span><span id="cnote"></span></div></div></form>${nav('chat')}`;
  // ---- ระยะหน้าจอ: กล่องพิมพ์ไม่ทับข้อความ, คีย์บอร์ดมือถือไม่บังกล่องพิมพ์ ----
  const form = $('#cf'), ta = $('#ct');
  let busy = false;
  const setH = () => document.documentElement.style.setProperty('--composer-h', `${form.offsetHeight}px`);
  const ro = window.ResizeObserver ? new ResizeObserver(setH) : null; ro?.observe(form); setH();
  const vv = window.visualViewport;
  const onVV = () => { if (!vv) return; const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); document.documentElement.style.setProperty('--kb', `${kb > 80 ? kb : 0}px`); document.body.classList.toggle('kb', kb > 80 || document.activeElement === ta && matchMedia('(pointer:coarse)').matches); };
  vv?.addEventListener('resize', onVV); vv?.addEventListener('scroll', onVV);
  ta.addEventListener('focus', onVV); ta.addEventListener('blur', () => setTimeout(onVV, 50));
  const cleanup = () => { ro?.disconnect(); vv?.removeEventListener('resize', onVV); vv?.removeEventListener('scroll', onVV); document.body.classList.remove('kb'); document.documentElement.style.removeProperty('--kb'); window.removeEventListener('hashchange', cleanup); };
  window.addEventListener('hashchange', cleanup);
  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`; $('#cs').disabled = !ta.value.trim() || busy; };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer:fine)').matches) { e.preventDefault(); form.requestSubmit(); } });

  CHAT = await api('api/chat');
  if (!CAT) CAT = await api('api/create/catalog').catch(() => null); // ชื่อแนวงานบนการ์ด
  if (params.get('draft') === 'last') {
    const d = [...CHAT.items].reverse().find((m) => m.draft);
    if (d) { if (!CAT) CAT = await api('api/create/catalog').catch(() => null); return openDraft(d.draft); }
  }
  const scrollEnd = () => requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  const draw = (chips) => {
    const items = CHAT.items;
    $('#msgs').innerHTML = items.length ? items.map(bubble).join('') + (busy ? `<div class="msg ai typing">${botAv()}<div><div class="bb" aria-label="ริชกำลังพิมพ์"><i></i><i></i><i></i></div></div></div>` : '')
      : `<div class="chat-hello">${RICH('wave', 112)}<h1>ริชพร้อมช่วยแล้ว</h1><p class="muted" style="font-size:14px">บอกว่าขายอะไรอยู่ ริชช่วยคิดภาพ คลิป และแคปชั่นให้</p>
        <div class="sugg">${CHAT_SUGG.map(([t, d]) => `<button type="button" data-chip="${esc(t)}"><b>${esc(t)}</b><small>${esc(d)}</small></button>`).join('')}</div>
        ${CHAT.oa ? `<a class="promo" href="${esc(CHAT.oa.url)}" target="_blank" rel="noopener" style="width:100%;margin-top:6px"><span class="qi" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:#06C755;color:#fff">${ICON.line}</span><span style="text-align:left"><b>คุยกับริชใน LINE ก็ได้</b><small class="muted">เพิ่มเพื่อน ${esc(CHAT.oa.id)} รับแจ้งเตือนผลงานเสร็จ</small></span>${ICON.chev}</a>` : ''}</div>`;
    const last = items[items.length - 1];
    const cs = chips || (last?.role === 'model' ? last.chips || [] : []);
    $('#chips').innerHTML = items.length && !busy ? cs.map((c) => `<button type="button" class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('') : '';
    $('#cq').textContent = !CHAT.ready ? 'ผู้ช่วย AI กำลังตั้งค่า' : CHAT.quota?.unlimited ? 'คุยกับริชได้ไม่จำกัด' : `วันนี้คุยได้อีก ${CHAT.quota.left}/${CHAT.quota.max} ข้อความ`;
    $('#cnote').textContent = matchMedia('(pointer:fine)').matches ? 'Shift+Enter ขึ้นบรรทัดใหม่' : '';
    app.querySelectorAll('[data-chip]').forEach((b) => b.onclick = () => send(b.dataset.chip));
    app.querySelectorAll('[data-draft]').forEach((b) => b.onclick = async () => {
      const m = CHAT.items.find((x) => String(x.id ?? '') === b.dataset.draft && x.draft) || [...CHAT.items].reverse().find((x) => x.draft);
      if (!CAT) CAT = await api('api/create/catalog').catch(() => null);
      openDraft(m.draft);
    });
    setH(); grow(); if (items.length) scrollEnd();
  };
  const send = async (text) => {
    text = String(text || '').trim(); if (!text || busy) return;
    ta.value = ''; grow();
    CHAT.items.push({ role: 'user', content: text });
    busy = true; draw([]);
    try {
      const r = await api('api/chat', { method: 'POST', body: { text } });
      CHAT.items.push({ id: r.id ?? `n${Date.now()}`, role: 'model', content: r.reply, draft: r.draft, chips: r.chips || [], links: r.links }); CHAT.quota = r.quota;
      busy = false; draw(r.chips);
    } catch (e) { busy = false; CHAT.items.push({ role: 'model', content: e.message }); draw([]); }
  };
  form.onsubmit = (e) => { e.preventDefault(); send(ta.value); };
  draw();
}

// ---------- ลิงก์สั้น + สถิติคลิก ----------
const bars = (days) => {
  const max = Math.max(1, ...days.map((d) => d.n));
  return `<div class="bars" role="img" aria-label="คลิกรายวัน 14 วัน">${days.map((d) => `<span title="${d.day}: ${d.n}"><i style="height:${Math.max(2, Math.round(d.n / max * 100))}%"></i></span>`).join('')}</div>
    <div class="row between muted" style="font-size:11px"><span>${new Date(days[0].day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span><span>วันนี้</span></div>`;
};
const PLATS = [['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['shopee', 'Shopee'], ['lazada', 'Lazada'], ['line', 'LINE'], ['youtube', 'YouTube'], ['other', 'อื่นๆ']];
async function linksView() {
  app.innerHTML = `${topbar('ลิงก์ของฉัน', 'profile')}<main>${LOAD()}</main>${nav('profile')}`;
  const [d, st] = await Promise.all([api('api/links'), api('api/stats/clicks')]);
  let plat = 'tiktok';
  $('main').innerHTML = `
    <section class="hero"><div class="grid3">
      <div><span class="muted">คลิกทั้งหมด</span><br><b class="num" style="font-size:24px">${num(d.total.clicks)}</b></div>
      <div><span class="muted">คนไม่ซ้ำ</span><br><b class="num" style="font-size:24px">${num(d.total.uniques)}</b></div>
      <div><span class="muted">7 วันล่าสุด</span><br><b class="num" style="font-size:24px;color:var(--lime-text)">${num(d.total.week)}</b></div></div>
      ${bars(st.days)}
      ${st.byPlatform.length ? `<div class="chips">${st.byPlatform.map((p) => `<span class="chip" style="cursor:default">${esc(p.label)} ${num(p.clicks)}</span>`).join('')}</div>` : ''}</section>
    <section class="card"><b>ย่อลิงก์ใหม่</b><span class="muted">วางลิงก์ Affiliate หรือลิงก์ร้าน ได้ลิงก์สั้นที่นับคลิกได้ ทำแยกต่อแพลตฟอร์มจะรู้ว่าที่ไหนคนกดเยอะ</span>
      <input id="lurl" type="url" inputmode="url" placeholder="https://s.shopee.co.th/..." aria-label="ลิงก์ปลายทาง">
      <input id="llabel" type="text" maxlength="80" placeholder="ชื่อเรียก เช่น เต้าหู้ไข่ แพ็ก 10" aria-label="ชื่อเรียก">
      <div class="chips">${PLATS.map(([k, l]) => `<button type="button" class="chip" data-pl="${k}" aria-pressed="${k === plat}">${l}</button>`).join('')}</div>
      <button type="button" class="btn" id="mk">สร้างลิงก์สั้น</button></section>
    <h2>ลิงก์ทั้งหมด</h2>
    <div class="list">${d.items.map((l) => `<div><span style="min-width:0"><b style="overflow-wrap:anywhere">${esc(l.label || l.url)}</b><br>
      <span class="muted">${esc(l.platformLabel)}${l.workId ? ` · <a href="#work?id=${l.workId}">ผลงาน</a>` : ''} · ${esc(l.short.replace(/^https?:\/\//, ''))}</span></span>
      <span style="text-align:right;flex:none"><b class="num">${num(l.clicks)}</b><br><button type="button" class="chip" data-cp="${esc(l.short)}" style="min-height:32px;padding:2px 10px;font-size:12px">คัดลอก</button></span></div>`).join('') || '<div class="muted">ยังไม่มีลิงก์ · ลิงก์ในแคปชั่นผลงานจะถูกย่อให้อัตโนมัติ</div>'}</div>`;
  app.querySelectorAll('[data-pl]').forEach((b) => b.onclick = () => { plat = b.dataset.pl; app.querySelectorAll('[data-pl]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('คัดลอกลิงก์แล้ว'); } catch { prompt('คัดลอกลิงก์', t); } };
  app.querySelectorAll('[data-cp]').forEach((b) => b.onclick = () => copy(b.dataset.cp));
  $('#mk').onclick = async () => {
    try { const l = await api('api/links', { method: 'POST', body: { url: $('#lurl').value.trim(), label: $('#llabel').value, platform: plat } }); await copy(l.short); linksView(); }
    catch (e) { toast(e.message); }
  };
}

// ---------- เงื่อนไข / ข้อมูลของฉัน (PDPA) ----------
function termsView(again) {
  app.innerHTML = `<div class="login" style="gap:16px">
    <div class="brand" style="font-size:22px">${RICH('head', 40)}<span>Mc <em>Rich</em></span></div>
    <h1 style="font-size:26px;margin-top:12px">${again ? 'เราปรับปรุงเงื่อนไขการใช้งาน' : 'ก่อนเริ่มใช้งาน'}</h1>
    <p style="color:var(--muted2)">${again ? 'อ่านและกดยอมรับฉบับใหม่ก่อนใช้งานต่อนะ' : 'อ่านสรุปสั้นๆ แล้วกดยอมรับเพื่อเริ่มใช้ Mc Rich'}</p>
    <section class="card" style="gap:8px"><b>สรุปสำคัญ</b>
      <span class="muted">⭐ ดาว 1 ดาว = 1 บาท ใช้ในแอปเท่านั้น งานล้มเหลวคืนดาวอัตโนมัติ</span>
      <span class="muted">🗂️ ไฟล์ผลงานเก็บ 7 วัน ควรดาวน์โหลดหรือส่งเข้า Drive</span>
      <span class="muted">✅ ตรวจผลงาน AI ก่อนโพสต์ทุกครั้ง ห้ามโฆษณาเกินจริงหรือละเมิดผู้อื่น</span>
      <span class="muted">🔒 ข้อมูลของคุณใช้เพื่อให้บริการเท่านั้น ดาวน์โหลดหรือลบได้เองในแอป</span></section>
    <div class="list"><a href="terms" target="_blank" rel="noopener"><span><b>เงื่อนไขการใช้บริการ</b></span><span aria-hidden="true">↗</span></a>
      <a href="privacy" target="_blank" rel="noopener"><span><b>นโยบายความเป็นส่วนตัว</b></span><span aria-hidden="true">↗</span></a>
      <a href="refund" target="_blank" rel="noopener"><span><b>นโยบายการคืนเงิน</b></span><span aria-hidden="true">↗</span></a></div>
    <label class="row" for="tok" style="gap:10px;align-items:flex-start"><input id="tok" type="checkbox" class="sw-in"><span>ฉันอ่านและยอมรับเงื่อนไขการใช้บริการ นโยบายความเป็นส่วนตัว และนโยบายการคืนเงิน</span></label>
    <button type="button" class="btn" id="tgo" disabled>ยอมรับและเริ่มใช้งาน</button>
    <button type="button" class="btn ghost" id="tout">ไม่ยอมรับ · ออกจากระบบ</button></div>`;
  $('#tok').onchange = (e) => { $('#tgo').disabled = !e.target.checked; };
  $('#tgo').onclick = async () => {
    try { const r = await api('api/me/terms', { method: 'PUT', body: { version: CFG.termsVersion } }); ME.termsVersion = r.termsVersion; route(); }
    catch (e) { toast(e.message); fetch('api/config').then((x) => x.json()).then((c) => { CFG = c; }).catch(() => {}); }
  };
  $('#tout').onclick = async () => { await api('api/logout', { method: 'POST' }).catch(() => {}); ME = null; go('login'); };
}
function myDataView() {
  app.innerHTML = `${topbar('ข้อมูลและความเป็นส่วนตัว', 'profile')}<main>
    <section class="card"><b>ดาวน์โหลดข้อมูลของฉัน</b>
      <span class="muted">ไฟล์ JSON รวมข้อมูลบัญชี โปรไฟล์ ประวัติดาว การเติมดาว รายการผลงาน ตารางโพสต์ แชท และแผนอัตโนมัติ (ไฟล์ภาพ/คลิปดาวน์โหลดได้จากหน้าผลงาน)</span>
      <a class="btn dark" href="api/me/export" download>ดาวน์โหลดข้อมูล</a></section>
    <section class="card"><b>แก้ไขข้อมูล</b><span class="muted">ชื่อและรูปมาจาก LINE หรือ Google · แก้ชุดแบรนด์ แฮชแท็ก และความสนใจได้ในหน้าโปรไฟล์</span>
      <div class="grid2"><a class="btn dark sm" href="#brand">ชุดแบรนด์</a><a class="btn dark sm" href="#interests">ความสนใจ</a></div></section>
    <section class="card"><b>ล้างประวัติแชท</b><span class="muted">ลบข้อความที่คุยกับน้องริชทั้งหมด</span><button type="button" class="btn dark sm" id="cclr">ล้างแชท</button></section>
    <section class="card" style="border-color:var(--bad)"><b style="color:var(--bad)">ปิดบัญชี</b>
      <span class="muted">ลบโปรไฟล์ ผลงานและไฟล์ทั้งหมด แชท แผนอัตโนมัติ ตารางโพสต์ และการเชื่อมต่อ Drive / LINE ทันที <b>ดาวคงเหลือ ${num(ME.stars)} ดาวจะหายไป</b> และสมัครใหม่จะไม่ได้โบนัสต้อนรับ ข้อมูลการเงินเก็บต่อตามกฎหมาย 5 ปี</span>
      ${ME.stars > 0 ? '<span class="muted">มีดาวที่ซื้อเหลืออยู่? อ่าน <a href="refund" target="_blank" rel="noopener">นโยบายการคืนเงิน</a> ก่อนปิดบัญชี</span>' : ''}
      <label class="f" for="dconf">พิมพ์ <b>ลบบัญชี</b> เพื่อยืนยัน<input id="dconf" type="text" autocomplete="off"></label>
      <button type="button" class="btn ghost" id="dgo" disabled style="color:var(--bad);border-color:var(--bad)">ปิดบัญชีถาวร</button></section>
    <div class="row" style="justify-content:center;gap:16px;flex-wrap:wrap"><a href="terms" class="muted">เงื่อนไขการใช้</a><a href="privacy" class="muted">ความเป็นส่วนตัว</a><a href="refund" class="muted">การคืนเงิน</a></div>
  </main>${nav('profile')}`;
  $('#dconf').oninput = (e) => { $('#dgo').disabled = e.target.value.trim() !== 'ลบบัญชี'; };
  $('#cclr').onclick = async () => { if (!confirm('ล้างประวัติแชททั้งหมด?')) return; try { await api('api/chat', { method: 'DELETE' }); toast('ล้างแชทแล้ว'); } catch (e) { toast(e.message); } };
  $('#dgo').onclick = async (e) => {
    if (!confirm('ปิดบัญชีถาวร? ย้อนกลับไม่ได้')) return;
    e.target.disabled = true;
    try { await api('api/me', { method: 'DELETE', body: { confirm: $('#dconf').value.trim() } }); ME = null; alert('ปิดบัญชีเรียบร้อย ขอบคุณที่ใช้ Mc Rich'); go('login'); }
    catch (x) { toast(x.message); e.target.disabled = false; }
  };
}
async function adminViral() {
  const d = await api('api/admin/viral');
  const SRC = { curated: '⭐ คลิปที่คัดเอง', tiktok: '🎵 TikTok', instagram: '📸 Instagram Reels', youtube: '▶ YouTube Shorts', facebook: '📘 Facebook', gtrends: '🔥 Google Trends', ytpopular: '▶ YouTube มาแรง' };
  const groups = Object.keys(SRC).map((k) => [k, d.items.filter((x) => x.source === k).slice(0, 30)]);
  const cnt = Object.fromEntries((d.counts || []).map((c) => [c.source, c]));
  const mk = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);
  $('main').innerHTML = `<section class="card"><b>แนบคลิปไวรัลหน้าแรก</b><span class="muted">วางลิงก์ได้หลายลิงก์ (บรรทัดละ 1) · รับเฉพาะ <b>TikTok · YouTube Shorts · Reels (Instagram/Facebook)</b> · ระบบดึงชื่อ/ภาพปก และให้ AI คิดไอเดียต่อยอดให้</span>
      <textarea id="vu" rows="4" placeholder="https://www.tiktok.com/@.../video/...&#10;https://youtube.com/shorts/...&#10;https://www.instagram.com/reel/..." aria-label="ลิงก์คลิป"></textarea>
      <input type="text" id="vt" maxlength="200" placeholder="ชื่อ/คำอธิบาย (ไม่บังคับ · ใช้เมื่อวาง 1 ลิงก์)" aria-label="ชื่อคลิป">
      <label class="f" for="vg">แสดงให้ลูกค้าสไตล์ (ไม่บังคับ)<select id="vg"><option value="">ทุกคน</option>${d.groups.map((g) => `<option value="${g.key}">${g.emoji} ${esc(g.label)}</option>`).join('')}</select></label>
      <button type="button" class="btn" id="vadd">เพิ่มคลิป</button></section>
    <details class="card"><summary><b>ดึงคลิปอัตโนมัติ (เสียงบ)</b> · ตอนนี้ ${d.cfg.auto ? '<b style="color:var(--warn)">เปิด</b>' : 'ปิด'}</summary>
      <label class="row" for="vauto" style="gap:10px;margin-top:8px"><input id="vauto" type="checkbox" class="sw-in" ${d.cfg.auto ? 'checked' : ''}><span>เปิดดึงอัตโนมัติ (Google Trends / YouTube / ScrapeCreators) · ปิดไว้ = หน้าแรกแสดงเฉพาะคลิปที่แนบเอง</span></label>
    <section class="card"><div class="row between"><b>สถานะการดึงข้อมูล</b><button type="button" class="btn dark sm" id="vref">ดึงใหม่ตอนนี้</button></div>
      <span class="muted">คลิปไวรัล TikTok/IG/YouTube Shorts/FB (ScrapeCreators) ${d.sc ? '✓' : '✗ ยังไม่ใส่ SCRAPECREATORS_API_KEY'} · Google Trends ✓ · YouTube มาแรง ${d.youtube ? '✓' : '✗'} · AI คัดกรอง+ไอเดีย ${d.ai ? '✓' : '✗'}</span>
      <span class="muted">ล่าสุด ${d.lastRun ? new Date(d.lastRun).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}${d.cfg.auto ? ' · ดึงอัตโนมัติทุก 6 ชม.' : ''}${d.lastErr ? ` · ⚠️ ${esc(d.lastErr)}` : ''}</span>
      <div class="grid2">${kpi('เครดิตใช้วันนี้', `${num(d.usage.used)} / ${num(d.cfg.daily)}`)}${kpi('เครดิตใช้เดือนนี้', num(d.usage.month?.[mk] || 0), d.usage.remaining != null ? `เหลือในบัญชี ${num(d.usage.remaining)}` : '')}</div>
      <span class="muted" style="font-size:13px">7 วันล่าสุด: ${Object.entries(cnt).map(([k, c]) => `${SRC[k] || k} ${num(c.n)} (AI ซ่อน ${num(c.hidden)})`).join(' · ') || '-'}</span></section>
    <section class="card"><b>ตั้งค่าการดึงคลิปไวรัล</b>
      <div class="grid2"><label class="f" for="vday">งบเครดิตต่อวัน<input id="vday" type="number" min="0" max="5000" value="${d.cfg.daily}"><span class="muted" style="font-size:12px">≈ ${num(d.cfg.daily * 30)} เครดิต/เดือน</span></label>
      <label class="f" for="vpq">เก็บคลิปต่อคำค้น<input id="vpq" type="number" min="1" max="20" value="${d.cfg.perQuery}"></label></div>
      <span class="muted" style="font-size:13px">ดึงผ่าน ScrapeCreators (เสียเครดิต):</span>
      <div class="chips">${['tiktok', 'instagram', 'youtube', 'facebook'].map((p) => `<button type="button" class="chip" data-vpl="${p}" aria-pressed="${!!d.cfg.platforms[p]}">${SRC[p]}</button>`).join('')}</div>
      <label class="row" for="vyt" style="gap:10px"><input id="vyt" type="checkbox" class="sw-in" ${d.cfg.ytShorts ? 'checked' : ''}><span>YouTube Shorts ผ่าน YouTube API (ฟรี)${d.youtube ? '' : ' · ต้องใส่ YOUTUBE_API_KEY'}</span></label>
      <label class="f" for="vytd">ค้น YouTube ต่อวัน (สูงสุด 95)<input id="vytd" type="number" min="0" max="95" value="${d.cfg.ytDaily}"><span class="muted" style="font-size:12px">วันนี้ค้นไปแล้ว ${num(d.ytUsage?.day === new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10) ? d.ytUsage.used : 0)} ครั้ง</span></label>
      <details><summary class="muted">คำค้นของแต่ละสไตล์ (${d.groups.length} กลุ่ม)</summary><span class="muted" style="font-size:13px">${d.groups.map((g) => `${g.emoji} ${esc(g.label)}: ${g.q.map(esc).join(', ')}`).join('<br>')}</span></details>
      <button type="button" class="btn sm" id="vcfg">บันทึกการตั้งค่า</button>
      ${Object.keys(d.samples || {}).length ? `<details><summary class="muted">ตัวอย่างข้อมูลดิบล่าสุด (สำหรับตรวจระบบ)</summary>${Object.entries(d.samples).map(([k, v]) => `<p class="muted" style="font-size:12px;overflow-wrap:anywhere"><b>${k}</b> "${esc(v.kw)}" · ${v.count} รายการ · keys: ${esc(v.keys.join(', '))}<br>${esc(v.first)}</p>`).join('')}</details>` : ''}</section></details>
    ${groups.map(([k, xs]) => xs.length ? `<h2>${SRC[k]} (${xs.length})</h2><div class="list">${xs.map((x) => `<div style="display:flex;gap:10px;align-items:flex-start">
      ${x.thumb ? `<img src="${x.thumb}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px">` : ''}
      <span style="flex:1;min-width:0"><b style="font-size:14px">${esc(x.title)}</b>${!x.safe ? ' <span class="badge b-warn">AI ซ่อน: ไม่เหมาะ</span>' : ''}${!x.active ? ' <span class="badge b-warn">ปิดแล้ว</span>' : ''}<br>
        <span class="muted" style="font-size:12px">${x.idea ? `${esc(x.idea.emoji)} ${esc(x.idea.hook)} · ${esc(x.idea.label)}` : 'รอ AI คิดไอเดีย'}${x.tags?.length ? ` · ${x.tags.map(esc).join(', ')}` : ''}</span>
        <span class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">
          <button type="button" class="btn dark sm" data-vp='${JSON.stringify({ id: x.id, active: !x.active })}'>${x.active ? 'ซ่อน' : 'แสดง'}</button>
          ${!x.safe ? `<button type="button" class="btn dark sm" data-vp='${JSON.stringify({ id: x.id, safe: true })}'>อนุญาตให้แสดง</button>` : ''}
          <button type="button" class="btn dark sm" data-vp='${JSON.stringify({ id: x.id, pinned: !x.pinned })}'>${x.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}</button>
          <button type="button" class="btn dark sm" data-vp='${JSON.stringify({ id: x.id, reidea: true })}'>คิดไอเดียใหม่</button>
          ${k === 'curated' ? `<button type="button" class="btn ghost sm" data-vd="${x.id}">ลบ</button>` : ''}</span></span></div>`).join('')}</div>` : '').join('') || '<p class="muted">ยังไม่มีข้อมูล กด "ดึงใหม่ตอนนี้"</p>'}`;
  $('#vadd').onclick = async (e) => {
    e.target.disabled = true;
    try { const r = await api('api/admin/viral', { method: 'POST', body: { urls: $('#vu').value, title: $('#vt').value.trim(), group: $('#vg').value } }); const bad = (r.results || []).filter((x) => x.error); toast(`เพิ่มแล้ว ${r.added} คลิป${bad.length ? ` · ข้าม ${bad.length} ลิงก์ (ไม่ใช่ Reels/Shorts/TikTok)` : ''}`); adminViral(); }
    catch (x) { toast(x.message); e.target.disabled = false; }
  };
  app.querySelectorAll('[data-vpl]').forEach((b) => b.onclick = () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));
  $('#vcfg').onclick = async () => {
    const platforms = Object.fromEntries([...app.querySelectorAll('[data-vpl]')].map((b) => [b.dataset.vpl, b.getAttribute('aria-pressed') === 'true']));
    try { await api('api/admin/viral/cfg', { method: 'PUT', body: { auto: $('#vauto').checked, daily: Number($('#vday').value), perQuery: Number($('#vpq').value), platforms, ytShorts: $('#vyt').checked, ytDaily: Number($('#vytd').value) } }); toast('บันทึกแล้ว'); } catch (x) { toast(x.message); }
  };
  $('#vref').onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'กำลังดึง…'; try { await api('api/admin/viral/refresh', { method: 'POST', body: {} }); toast('ดึงข้อมูลแล้ว'); } catch (x) { toast(x.message); } adminViral(); };
  app.querySelectorAll('[data-vp]').forEach((b) => b.onclick = async () => { const o = JSON.parse(b.dataset.vp); await api(`api/admin/viral/${o.id}`, { method: 'PATCH', body: o }).catch((x) => toast(x.message)); adminViral(); });
  app.querySelectorAll('[data-vd]').forEach((b) => b.onclick = async () => { if (!confirm('ลบคลิปนี้?')) return; await api(`api/admin/viral/${b.dataset.vd}`, { method: 'DELETE' }); adminViral(); });
}

async function adminLegal() {
  const d = await api('api/admin/legal');
  $('main').innerHTML = `<section class="card"><b>ข้อมูลผู้ให้บริการ</b><span class="muted">แสดงในหน้าเงื่อนไข ความเป็นส่วนตัว และการคืนเงิน</span>
      <label class="f" for="lo">ชื่อผู้ประกอบการ / บริษัท<input id="lo" type="text" maxlength="120" value="${esc(d.operator)}"></label>
      <label class="f" for="la">ที่อยู่ติดต่อ<textarea id="la" rows="2" maxlength="300">${esc(d.address)}</textarea></label>
      <div class="grid2"><label class="f" for="le">อีเมลติดต่อ<input id="le" type="text" inputmode="email" maxlength="120" value="${esc(d.email)}"></label>
      <label class="f" for="lp">โทร (ไม่บังคับ)<input id="lp" type="tel" maxlength="20" value="${esc(d.phone)}"></label></div>
      <span class="muted">LINE OA ใส่ให้อัตโนมัติจากการตั้งค่าระบบ</span>
      <label class="row" for="lr" style="gap:10px"><input id="lr" type="checkbox" class="sw-in" ${d.reviewed ? 'checked' : ''}><span>ตรวจทานข้อกฎหมายแล้ว (ซ่อนป้าย "ฉบับร่าง")</span></label>
      <button type="button" class="btn" id="lsave">บันทึก</button></section>
    <section class="card"><b>เวอร์ชันเงื่อนไข ${esc(d.termsVersion)}</b><span class="muted">ยอมรับแล้ว ${num(d.accepted.ok)} / ${num(d.accepted.total)} คน · ผู้ใช้ที่ยังไม่ยอมรับจะเห็นหน้ายอมรับก่อนใช้งาน</span>
      <div class="grid3"><a class="btn dark sm" href="terms" target="_blank" rel="noopener">เงื่อนไข</a><a class="btn dark sm" href="privacy" target="_blank" rel="noopener">ส่วนตัว</a><a class="btn dark sm" href="refund" target="_blank" rel="noopener">คืนเงิน</a></div></section>`;
  $('#lsave').onclick = async () => {
    try { const r = await api('api/admin/legal', { method: 'PUT', body: { operator: $('#lo').value, address: $('#la').value, email: $('#le').value, phone: $('#lp').value, reviewed: $('#lr').checked } });
      toast(r.email || !$('#le').value.trim() ? 'บันทึกแล้ว' : 'บันทึกแล้ว (อีเมลไม่ถูกต้อง ไม่ได้บันทึกอีเมล)'); adminLegal(); } catch (e) { toast(e.message); }
  };
}

// ---------- เส้นทาง ----------
async function route() {
  const [name, qs] = location.hash.replace(/^#/, '').split('?');
  const r = name || 'home';
  if (!ME && r !== 'login') {
    try { ME = await api('api/me'); } catch { return; }
  }
  if (r === 'login') return ME ? go('home') : loginView(new URLSearchParams(qs || '').get('err'));
  if (CFG.termsVersion && ME.termsVersion !== CFG.termsVersion) return termsView(!!ME.termsVersion);
  if (!ME.onboarded && r !== 'onboard') return go('onboard');
  window.scrollTo(0, 0);
  switch (r) {
    case 'onboard': return interestsView('onboard');
    case 'interests': return interestsView('edit');
    case 'profile': return profileView(qs);
    case 'mydata': return myDataView();
    case 'viral': return viralView(qs).catch((e) => toast(e.message));
    case 'links': return linksView().catch((e) => toast(e.message));
    case 'plan': return planView().catch((e) => toast(e.message));
    case 'auto': return autoView(qs).catch((e) => toast(e.message));
    case 'brand': return brandView();
    case 'avatars': return avatarsView(qs).catch((e) => toast(e.message));
    case 'social': return socialView(qs).catch((e) => toast(e.message));
    case 'film': return filmView(qs).catch((e) => toast(e.message));
    case 'tags': return tagsView();
    case 'stars': return starsView().catch((e) => toast(e.message));
    case 'topup': return topupView().catch((e) => toast(e.message));
    case 'admin': return ME.admin ? adminView(qs).catch((e) => toast(e.message)) : go('home');
    case 'create': return createView(qs).catch((e) => toast(e.message));
    case 'works': return worksView().catch((e) => toast(e.message));
    case 'work': return workView(qs).catch((e) => toast(e.message));
    case 'chat': return chatView(qs).catch((e) => toast(e.message));
    default: return homeView();
  }
}
window.addEventListener('hashchange', route);
// ลิงก์ที่ชี้ไปหน้าเดิม (เช่น ลูกศรย้อนกลับจากหน้า QR ซึ่งยังอยู่ใต้ #topup) → hash ไม่เปลี่ยน จึงต้องสั่งวาดหน้าใหม่เอง
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || a.target) return;
  if (a.getAttribute('href') === location.hash || (a.getAttribute('href') === '#home' && !location.hash)) { e.preventDefault(); route(); }
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
fetch('api/config').then((r) => r.json()).then((c) => { CFG = c; }).catch(() => {}).finally(route);
