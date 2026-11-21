'use strict';
// Mc Rich — หน้าเว็บแอป (เฟส 2)
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
  const r = await fetch(path, init);
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
  star: '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#C8F94A"/></svg>',
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
    : `<div class="brand"><span class="mark">Mc</span>Rich</div>`}
  ${ME ? `<a class="pill num" href="#stars">${ICON.star}${num(ME.stars)} ดาว</a>` : ''}
</header>`;
const nav = (cur) => `<nav class="tab" aria-label="เมนูหลัก"><div class="in">
  <a href="#home" ${cur === 'home' ? 'aria-current="page"' : ''}>${ICON.home}หน้าหลัก</a>
  <a href="#works" ${cur === 'works' ? 'aria-current="page"' : ''}>${ICON.works}ผลงาน</a>
  <a href="#create" aria-label="สร้างผลงาน" ${cur === 'create' ? 'aria-current="page"' : ''}><span class="plus">${ICON.plus}</span>สร้าง</a>
  <a href="#chat" ${cur === 'chat' ? 'aria-current="page"' : ''}>${ICON.chat}แชท</a>
  <a href="#profile" ${cur === 'profile' ? 'aria-current="page"' : ''}>${ICON.user}โปรไฟล์</a>
</div></nav>`;

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
  app.innerHTML = `${first ? '' : top('ความสนใจ', 'profile')}
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
    <div class="brand" style="font-size:24px"><span class="mark" style="width:44px;height:44px;font-size:18px">Mc</span>Rich</div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:24px">
      <h1 style="font-size:31px">ภาพและคลิปขายของ<br>ทำเสร็จในแอปเดียว</h1>
      <p style="color:var(--muted2)">โปสเตอร์ เมนู คลิปเปิดกล่อง ละครสั้น รีวิวด้วยอวตาร พร้อมแคปชั่น แล้วโพสต์ลงเพจ IG TikTok ได้เลย</p>
    </div>
    <div class="grid3"><div class="stat"><b>10</b><span class="muted">ภาพฟรีเมื่อสมัคร</span></div><div class="stat"><b>20</b><span class="muted">ดาวต้อนรับ</span></div><div class="stat"><b>+1</b><span class="muted">ภาพฟรีทุกวัน</span></div></div>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px">
      ${msg ? `<p role="alert" style="background:var(--bad-bg);color:var(--bad);border-radius:12px;padding:10px 12px">${msg}</p>` : ''}
      <a class="btn line" href="auth/line" ${CFG.line ? '' : 'aria-disabled="true"'}>${ICON.line}เข้าสู่ระบบด้วย LINE</a>
      <a class="btn google" href="auth/google" ${CFG.google ? '' : 'aria-disabled="true"'}>${ICON.google}เข้าสู่ระบบด้วย Google</a>
      ${!CFG.line && !CFG.google ? '<p class="muted" style="text-align:center">ระบบล็อกอินกำลังตั้งค่า</p>' : ''}
      <p class="muted" style="text-align:center">เข้าใช้งานถือว่ายอมรับ <a href="terms">เงื่อนไขการใช้</a> และ <a href="privacy">นโยบายความเป็นส่วนตัว</a></p>
    </div></div>`;
}

async function homeView() {
  app.innerHTML = `${topbar()}<main>
    <section class="hero">
      <span style="font-size:13px;color:var(--muted);font-weight:600">สวัสดี ${esc(ME.name)}${ME.brand?.shopName ? ' · ' + esc(ME.brand.shopName) : ''}</span>
      <h1 style="font-size:24px">วันนี้อยากทำอะไรให้ร้านปัง?</h1>
      <a class="btn" href="#create">+ สร้างผลงานใหม่</a>
      <div class="row between muted"><span>ภาพฟรีวันนี้ เหลือ ${ME.freeImages.today}</span><span>ภาพฟรีต้อนรับ เหลือ ${ME.freeImages.welcome}/10</span></div>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px"><div class="row between"><h2 id="th">ไวรัลตอนนี้</h2><a href="#interests" style="font-size:14px">ปรับความสนใจ</a></div>
      <div class="grid3" id="trends"><p class="muted">กำลังโหลด…</p></div></section>
    ${!ME.brand?.shopName ? `<a class="card" href="#brand" style="text-decoration:none;color:var(--fg)"><b>ตั้งค่าชุดแบรนด์ให้เสร็จ</b><span class="muted">ใส่ชื่อร้าน โลโก้ สี และช่องทางสั่งซื้อครั้งเดียว ทุกผลงานจะออกมาเป็นสไตล์ร้านคุณ</span></a>` : ''}
    <a class="card" href="#profile" style="text-decoration:none;color:var(--fg);background:#1C2410;border-color:#3A4A18"><b>ชวนเพื่อน รับคนละ 20 ดาว</b><span class="muted">เมื่อเพื่อนเติมดาวครั้งแรก · โค้ดของคุณ ${esc(ME.referralCode)}</span></a>
  </main>${nav('home')}`;
  try {
    const t = await api('api/trends');
    $('#th').textContent = t.personalized ? 'ไวรัลตอนนี้ ตรงกับความสนใจคุณ' : 'ไวรัลตอนนี้';
    $('#trends').innerHTML = t.items.map((x) => `<a class="trend" href="#create"><div class="thumb" style="background:${esc(x.color)}">${esc(x.badge)}</div>
      <b style="font-size:13px;line-height:1.3">${esc(x.title)}</b><span class="muted">${esc(x.price)}</span></a>`).join('');
  } catch (e) { if (e.message !== 'login') $('#trends').innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
}

const soon = (cur, title, text) => {
  app.innerHTML = `${topbar()}<main><div class="soon card"><span class="badge b-lime">กำลังเปิดเร็วๆ นี้</span><h2>${title}</h2><p class="muted" style="font-size:14px">${text}</p></div></main>${nav(cur)}`;
};

function profileView() {
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
      <a href="#tags"><span><b>แฮชแท็กประจำ</b><br><span class="muted">${(ME.hashtags || []).length} แท็ก · ติ๊กใช้ได้ตอนสร้าง</span></span><span aria-hidden="true">›</span></a>
    </div>
    <section class="card"><h2 style="font-size:16px">การเชื่อมต่อ</h2>
      <div class="grid2 muted">
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>Google Drive</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>เพจ Facebook</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>Instagram</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>TikTok</span><span>เร็วๆ นี้</span></span>
      </div></section>
    <section class="card" style="background:#1C2410;border-color:#3A4A18"><b>ชวนเพื่อน รับคนละ 20 ดาว</b>
      <div class="row"><input type="text" id="inv" readonly value="${esc(inviteUrl)}" aria-label="ลิงก์ชวนเพื่อน"><button type="button" class="btn sm" id="copyInv">คัดลอก</button></div>
      <span class="muted">ชวนแล้ว ${ME.referred} คน · ได้ดาวเมื่อเพื่อนเติมดาวครั้งแรก</span></section>
    <div class="row" style="justify-content:center;gap:16px"><a href="privacy" class="muted">นโยบายความเป็นส่วนตัว</a><a href="terms" class="muted">เงื่อนไขการใช้</a></div>
    ${ME.admin ? '<a class="btn dark" href="#admin">หลังบ้านแอดมิน</a>' : ''}
    <button type="button" class="btn ghost" id="logout">ออกจากระบบ</button>
  </main>${nav('profile')}`;
  $('#topup').onclick = () => go('topup');
  $('#copyInv').onclick = async () => {
    try { await navigator.clipboard.writeText($('#inv').value); toast('คัดลอกลิงก์แล้ว'); } catch { $('#inv').select(); toast('กดค้างเพื่อคัดลอก'); }
  };
  $('#logout').onclick = async () => { await api('api/logout', { method: 'POST' }); ME = null; go('login'); };
}

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
      $('#nt').value.split(/[\s,]+/).map((x) => x.trim().replace(/^#*/, '#')).filter((x) => x.length > 1 && !tags.includes(x)).forEach((x) => tags.push(x));
      draw();
    };
    $('#add').onclick = add;
    $('#nt').onkeydown = (e) => { if (e.key === 'Enter') add(); };
    app.querySelectorAll('.chip[data-i]').forEach((b) => b.onclick = () => { tags.splice(Number(b.dataset.i), 1); draw(); });
    $('#save').onclick = async () => { try { ME = await api('api/profile/hashtags', { method: 'PUT', body: { hashtags: tags } }); toast('บันทึกแล้ว'); go('profile'); } catch (e) { toast(e.message); } };
  };
  draw();
}

// ---------- เติมดาว ----------
async function topupView() {
  app.innerHTML = `${topbar('เติมดาว', 'profile')}<main><p class="muted">กำลังโหลด…</p></main>${nav('profile')}`;
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
async function adminView(status = 'review') {
  app.innerHTML = `${topbar('หลังบ้าน · เติมดาว', 'profile')}<main>
    <div class="chips">${[['review', 'รอตรวจ'], ['paid', 'สำเร็จ'], ['rejected', 'ไม่ผ่าน']].map(([k, l]) => `<button type="button" class="chip" data-s="${k}" aria-pressed="${k === status}">${l}</button>`).join('')}</div>
    <div id="sum" class="muted"></div><div id="list" style="display:flex;flex-direction:column;gap:12px"><p class="muted">กำลังโหลด…</p></div></main>${nav('profile')}`;
  app.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => adminView(b.dataset.s));
  const d = await api('api/admin/topups?status=' + status);
  $('#sum').textContent = `เดือนนี้เติมสำเร็จ ${num(d.month.n)} รายการ · ฿${num(d.month.total)}`;
  $('#list').innerHTML = d.items.map((t) => `<section class="card">
    <div class="row between"><b class="num">฿${num(t.amount)} · ${num(t.stars)} ดาว</b><span class="muted">${esc(t.user)} · ${esc(t.userId)}</span></div>
    <span class="muted">${new Date(t.createdAt).toLocaleString('th-TH')} · ${esc(t.reason || '')}${t.note ? ' · หมายเหตุ: ' + esc(t.note) : ''}</span>
    ${t.slipData?.amount ? `<span class="muted">สลิป: ฿${esc(t.slipData.amount)} · ผู้รับ ${esc(t.slipData.receiver)} · ผู้โอน ${esc(t.slipData.sender)} · ${esc(t.slipData.transRef || '')}</span>` : ''}
    ${t.slip ? `<a href="${t.slip}" target="_blank" rel="noopener"><img src="${t.slip}" alt="สลิป" style="max-width:100%;max-height:360px;border-radius:10px"></a>` : '<span class="muted">ไม่มีสลิป</span>'}
    ${status === 'review' ? `<div class="grid2"><button type="button" class="btn" data-ok="${t.id}">อนุมัติ เติมดาว</button><button type="button" class="btn ghost" data-no="${t.id}">ไม่ผ่าน</button></div>` : ''}
  </section>`).join('') || '<p class="muted">ไม่มีรายการ</p>';
  app.querySelectorAll('[data-ok]').forEach((b) => b.onclick = async () => { try { await api(`api/admin/topups/${b.dataset.ok}/approve`, { method: 'POST', body: {} }); toast('เติมดาวแล้ว'); adminView(status); } catch (e) { toast(e.message); } });
  app.querySelectorAll('[data-no]').forEach((b) => b.onclick = async () => { try { await api(`api/admin/topups/${b.dataset.no}/reject`, { method: 'POST', body: {} }); toast('ปฏิเสธแล้ว'); adminView(status); } catch (e) { toast(e.message); } });
}

async function starsView() {
  app.innerHTML = `${topbar('ประวัติดาว', 'profile')}<main><div class="list" id="h"><div class="muted">กำลังโหลด…</div></div></main>${nav('profile')}`;
  const { items } = await api('api/stars/history');
  $('#h').innerHTML = items.map((x) => `<div><span><b>${esc(x.note || x.kind)}</b><br><span class="muted">${new Date(x.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
    <b class="num" style="color:${x.delta >= 0 ? 'var(--ok)' : 'var(--bad)'}">${x.delta >= 0 ? '+' : '−'}${num(Math.abs(x.delta))}</b></div>`).join('') || '<div class="muted">ยังไม่มีรายการ</div>';
}

// ---------- เส้นทาง ----------
async function route() {
  const [name, qs] = location.hash.replace(/^#/, '').split('?');
  const r = name || 'home';
  if (!ME && r !== 'login') {
    try { ME = await api('api/me'); } catch { return; }
  }
  if (r === 'login') return ME ? go('home') : loginView(new URLSearchParams(qs || '').get('err'));
  if (!ME.onboarded && r !== 'onboard') return go('onboard');
  window.scrollTo(0, 0);
  switch (r) {
    case 'onboard': return interestsView('onboard');
    case 'interests': return interestsView('edit');
    case 'profile': return profileView();
    case 'brand': return brandView();
    case 'tags': return tagsView();
    case 'stars': return starsView().catch((e) => toast(e.message));
    case 'topup': return topupView().catch((e) => toast(e.message));
    case 'admin': return ME.admin ? adminView().catch((e) => toast(e.message)) : go('home');
    case 'create': return soon('create', 'สร้างผลงาน', 'สร้างภาพโปสเตอร์ เมนู และคลิปแบบต่างๆ จะเปิดในเฟสถัดไป ตอนนี้ตั้งค่าชุดแบรนด์และแฮชแท็กรอไว้ได้เลย');
    case 'works': return soon('works', 'ผลงานของฉัน', 'ประวัติผลงาน ดาวน์โหลด ส่งเข้า Google Drive และสถิติยอดวิว จะอยู่ที่นี่');
    case 'chat': return soon('chat', 'แชทผู้ช่วย AI', 'ถามเรื่องดาว ผลงาน หรือขอไอเดียคลิปได้ตลอด 24 ชม.');
    default: return homeView();
  }
}
window.addEventListener('hashchange', route);
fetch('api/config').then((r) => r.json()).then((c) => { CFG = c; }).catch(() => {}).finally(route);
