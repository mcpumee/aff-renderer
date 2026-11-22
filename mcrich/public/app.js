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
    $('#trends').innerHTML = t.items.map((x) => `<a class="trend" href="#create?style=${esc(x.style)}&kind=${esc(x.kind)}"><div class="thumb" style="background:${esc(x.color)}">${esc(x.badge)}</div>
      <b style="font-size:13px;line-height:1.3">${esc(x.title)}</b><span class="muted">${esc(x.price)}</span></a>`).join('');
  } catch (e) { if (e.message !== 'login') $('#trends').innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
}

const soon = (cur, title, text) => {
  app.innerHTML = `${topbar()}<main><div class="soon card"><span class="badge b-lime">กำลังเปิดเร็วๆ นี้</span><h2>${title}</h2><p class="muted" style="font-size:14px">${text}</p></div></main>${nav(cur)}`;
};

function profileView(qs) {
  const dq = new URLSearchParams(qs || '').get('drive');
  if (dq) { toast({ ok: 'เชื่อม Google Drive แล้ว', fail: 'เชื่อม Google Drive ไม่สำเร็จ ลองใหม่', notready: 'Google Drive ยังไม่เปิดใช้' }[dq] || ''); history.replaceState(null, '', '#profile'); }
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
      <a href="#links"><span><b>ลิงก์ของฉัน · สถิติคลิก</b><br><span class="muted">ลิงก์สั้นนับคลิกแยกแพลตฟอร์ม</span></span><span aria-hidden="true">›</span></a>
      <a href="#tags"><span><b>แฮชแท็กประจำ</b><br><span class="muted">${(ME.hashtags || []).length} แท็ก · ติ๊กใช้ได้ตอนสร้าง</span></span><span aria-hidden="true">›</span></a>
    </div>
    <section class="card"><h2 style="font-size:16px">การเชื่อมต่อ</h2>
      <div id="drive" class="card" style="padding:12px;background:var(--s2)"><span class="muted">Google Drive · กำลังโหลด…</span></div>
      <div class="grid2 muted">
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>เพจ Facebook</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>Instagram</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>TikTok</span><span>เร็วๆ นี้</span></span>
        <span class="card" style="padding:10px;flex-direction:row;justify-content:space-between"><span>YouTube</span><span>เร็วๆ นี้</span></span>
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
  driveCard().catch(() => {});
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
    $('#save').onclick = async () => { $('#nt').value.split(/[\s,]+/).map((x) => x.trim().replace(/^#*/, '#')).filter((x) => x.length > 1 && !tags.includes(x)).forEach((x) => tags.push(x)); try { ME = await api('api/profile/hashtags', { method: 'PUT', body: { hashtags: tags } }); toast('บันทึกแล้ว'); go('profile'); } catch (e) { toast(e.message); } };
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

// ---------- สร้างผลงาน (ภาพ) ----------
let CAT = null;
let D = null;        // ร่างงานที่กำลังสร้าง
let REFS = [];       // ไฟล์ภาพอ้างอิง (อยู่ในหน่วยความจำ)
let REVS = [];       // แคปรีวิว (คลิป)
let VFILE = null;    // คลิปที่ถ่ายเอง
let ITEMF = [];      // รูปสินค้าแต่ละอันดับ (Top N)
const STEPS = ['เป้าหมาย', 'แนวงาน', 'รายละเอียด', 'แคปชั่น', 'คุณภาพ', 'ทบทวน'];
const newDraft = () => ({ step: 0, goal: (ME.interests?.goals || []).includes('Affiliate') ? 'aff' : 'sell', link: '', kind: 'image', style: '', product: '', price: '', headline: '', details: '', concepts: [], ratio: '', useLogo: !!ME.brand?.logo, showShop: true, tone: '', hashtags: [...(ME.hashtags || [])], extraTags: '', tier: 'std', versions: 1, fromWork: 0, length: 30, voice: '', premiumVoice: false, formula: '', variant: 'random', music: 'auto', selfMode: 'subs', videoSec: 0, captionStyle: 'pop', hookText: '', keepAudio: true, genre: 'inlaw', art: 'cartoon3d', scenes: 4, plot: '', info: {}, count: 3, items: [{ name: '', price: '', note: '', link: '' }, { name: '', price: '', note: '', link: '' }, { name: '', price: '', note: '', link: '' }] });
const saveDraft = () => { try { sessionStorage.setItem('mr_draft', JSON.stringify(D)); } catch {} };
function loadDraft() { try { const d = JSON.parse(sessionStorage.getItem('mr_draft') || 'null'); if (d && typeof d === 'object') return { ...newDraft(), ...d }; } catch {} return null; }

async function createView(qs) {
  const params = new URLSearchParams(qs || '');
  if (!CAT) {
    app.innerHTML = `${topbar('สร้างผลงาน', 'home')}<main><p class="muted">กำลังโหลด…</p></main>${nav('create')}`;
    CAT = await api('api/create/catalog');
  }
  if (params.get('new') || !D) { D = loadDraft() && !params.get('new') ? loadDraft() : newDraft(); REFS = []; }
  if (params.get('new')) history.replaceState(null, '', '#create');
  if (params.get('style')) {
    const TV = { gift_box: 'v_gift', blind_box: 'v_mystery', before_after: 'v_sell' };
    const st = params.get('style');
    const s = params.get('kind') !== 'video' && CAT.styles.find((x) => x.id === st);
    REFS = []; REVS = [];
    if (s) D = { ...newDraft(), style: s.id, ratio: s.ratio, step: 0 };
    else if (TV[st]) D = { ...newDraft(), kind: 'video', style: TV[st], step: 0 };
    else { D = { ...newDraft(), kind: 'video' }; toast('คลิปละครสั้นจะเปิดเร็วๆ นี้ ลองแนวเปิดกล่องก่อนได้เลย'); }
    history.replaceState(null, '', '#create');
  }
  drawStep();
}

function stepShell(inner, { next = 'ถัดไป', nextId = 'next', disabled = false } = {}) {
  const s = D.step;
  app.innerHTML = `${topbar('สร้างผลงาน', 'home')}<main>
    <div class="row between"><span class="muted" style="font-weight:600">ขั้น ${s + 1}/${STEPS.length} · ${STEPS[s]}</span>
      <button type="button" class="chip" id="reset" style="min-height:34px;padding:4px 12px">เริ่มใหม่</button></div>
    <div class="steps" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>
    ${inner}
    <div class="grid2" style="margin-top:4px">${s ? '<button type="button" class="btn dark" id="prev">ย้อนกลับ</button>' : '<span></span>'}
      <button type="button" class="btn" id="${nextId}" ${disabled ? 'disabled' : ''}>${next}</button></div>
  </main>${nav('create')}`;
  if (s) { const b = app.querySelector('header .back'); if (b) b.onclick = (e) => { e.preventDefault(); D.step--; drawStep(); }; }
  const p = $('#prev'); if (p) p.onclick = () => { D.step--; drawStep(); };
  $('#reset').onclick = () => { D = newDraft(); REFS = []; REVS = []; VFILE = null; ITEMF = []; saveDraft(); drawStep(); };
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

function drawStep() {
  saveDraft(); window.scrollTo(0, 0);
  if (!CAT.ready) {
    app.innerHTML = `${topbar('สร้างผลงาน', 'home')}<main><div class="soon card"><span class="badge b-warn">กำลังตั้งค่า</span><h2>ระบบสร้างภาพกำลังเปิด</h2><p class="muted">ระหว่างนี้ตั้งค่าชุดแบรนด์และแฮชแท็กรอไว้ได้เลย</p><a class="btn" href="#brand">ตั้งค่าชุดแบรนด์</a></div></main>${nav('create')}`;
    return;
  }
  const s = D.step;
  if (s === 0) {
    stepShell(`<h1 style="font-size:22px">สร้างไปเพื่ออะไร?</h1>
      <div class="grid2">${CAT.goals.map((g) => `<button type="button" class="card opt" data-goal="${g.id}" aria-pressed="${D.goal === g.id}"><b>${esc(g.label)}</b><span class="muted">${esc(g.hint)}</span></button>`).join('')}</div>
      <label class="f" for="link">${D.goal === 'aff' ? 'ลิงก์ Affiliate (Shopee / Lazada / TikTok)' : 'ลิงก์สินค้าหรือร้าน (ไม่บังคับ)'}
        <input id="link" type="url" inputmode="url" placeholder="https://" value="${esc(D.link || (D.goal !== 'aff' ? ME.brand?.shopLink || '' : ''))}"></label>
      <span class="muted">ลิงก์จะใส่ในแคปชั่นให้อัตโนมัติ</span>`);
    app.querySelectorAll('[data-goal]').forEach((b) => b.onclick = () => { readInputs(['link']); D.goal = b.dataset.goal; drawStep(); });
    $('#next').onclick = () => {
      readInputs(['link']);
      if (D.link && !/^https?:\/\/\S+$/i.test(D.link)) return toast('ลิงก์ต้องขึ้นต้นด้วย https://');
      if (D.goal === 'aff' && !D.link) return toast('ใส่ลิงก์ Affiliate ก่อน');
      D.step = 1; drawStep();
    };
  } else if (s === 1) {
    const vid = D.kind === 'video';
    const list = vid ? CAT.video.styles : CAT.styles;
    stepShell(`<div class="grid2" role="group" aria-label="ประเภทผลงาน">
        <button type="button" class="card opt" data-kind="image" aria-pressed="${!vid}"><b>ภาพ</b><span class="muted">โปสเตอร์ ภาพสินค้า ป้ายโปร</span></button>
        <button type="button" class="card opt" data-kind="video" aria-pressed="${vid}"><b>คลิปวิดีโอ</b><span class="muted">เปิดกล่อง ลุ้นของ พากย์เสียง</span></button></div>
      ${(() => {
        const card = (x) => `<button type="button" class="stylecard" data-style="${x.id}" aria-pressed="${D.style === x.id}">
          <span class="sw" style="background:${esc(x.color)}">${x.emoji}</span><b>${esc(x.label)}</b><span class="muted">${vid ? styleNote(x) : `${x.text ? 'มีข้อความบนภาพ' : 'ภาพล้วน'} · ${esc(x.ratio)}`}</span></button>`;
        const biz = list.filter((x) => !x.pr), pr = list.filter((x) => x.pr);
        const g1 = `<h2>${vid ? 'คลิปขายของ / คอนเทนต์' : 'ภาพขายของ / คอนเทนต์'}</h2><div class="grid2">${biz.map(card).join('')}</div>`;
        const g2 = pr.length ? `<h2>ประชาสัมพันธ์องค์กร</h2><div class="grid2">${pr.map(card).join('')}</div>` : '';
        return D.goal === 'pr' ? g2 + g1 : g1 + g2;
      })()}`, { disabled: !D.style || !list.some((x) => x.id === D.style) });
    app.querySelectorAll('[data-kind]').forEach((b) => b.onclick = () => { if (D.kind !== b.dataset.kind) { D.kind = b.dataset.kind; D.style = ''; } drawStep(); });
    app.querySelectorAll('[data-style]').forEach((b) => b.onclick = () => { D.style = b.dataset.style; if (!vid) D.ratio = CAT.styles.find((x) => x.id === D.style).ratio; drawStep(); });
    $('#next').onclick = () => { D.step = 2; drawStep(); };
  } else if (s === 2 && INFO_IDS.includes(D.style)) {
    const id = D.style;
    const cs = CAT.video.captionStyles;
    const maxP = id === 'v_tips' ? 1 : id === 'v_pr_announce' ? 4 : 8;
    const photoTitle = { v_tips: 'รูปประกอบ (ไม่บังคับ 1 รูป)', v_shop: 'รูปร้าน 3–8 รูป (หน้าร้าน เมนู บรรยากาศ)', v_pr_announce: 'รูปประกอบ (ไม่บังคับ ถ้าไม่มี AI วาดพื้นหลังให้ +5 ดาว)', v_pr_recap: 'รูปกิจกรรม 3–8 รูป (AI ดูรูปแล้วเล่าให้)' }[id];
    const nameLabel = { v_tips: 'หัวข้อความรู้', v_shop: 'ชื่อร้าน', v_pr_announce: 'เรื่องที่ประกาศ', v_pr_recap: 'ชื่อกิจกรรม / ข่าว' }[id];
    const ph = { v_tips: 'เช่น เก็บเต้าหู้ให้สดนานขึ้น', v_shop: 'เช่น บ้านพรุค้าส่ง', v_pr_announce: 'เช่น ขอเชิญร่วมงานวันเด็ก', v_pr_recap: 'เช่น กิจกรรมปลูกป่าชายเลน' }[id];
    const keys = { v_tips: [], v_shop: ['place', 'hours', 'contact'], v_pr_announce: ['org', 'date', 'place', 'contact'], v_pr_recap: ['org', 'date', 'place'] }[id];
    stepShell(`<p class="muted">แนว: <b style="color:var(--fg)">${esc(CAT.video.styles.find((x) => x.id === id).label)}</b></p>
      <section class="card">
        <label class="f" for="product">${nameLabel}<input id="product" type="text" maxlength="120" placeholder="${ph}" value="${esc(D.product)}"></label>
        ${id === 'v_shop' ? `<label class="f" for="price">โปรตอนนี้ (ไม่บังคับ)<input id="price" type="text" maxlength="40" placeholder="เช่น ซื้อครบ 500 ส่งฟรี" value="${esc(D.price)}"></label>` : ''}
        <label class="f" for="details">${id === 'v_tips' ? 'อยากเล่ามุมไหน (ไม่บังคับ)' : 'รายละเอียด'}<textarea id="details" rows="3" maxlength="600">${esc(D.details)}</textarea></label>
        ${infoFields(keys)}
      </section>
      ${id === 'v_tips' ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>จำนวนทิป</h2>${chipRow([{ id: '3', label: `3 ทิป ~30 วิ · ${CAT.video.prices[30]} ดาว` }, { id: '5', label: `5 ทิป ~45 วิ · ${CAT.video.prices[45]} ดาว` }], String(D.count || 3), 'count', false)}</section>` : ''}
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
    app.querySelectorAll('[data-cs]').forEach((b) => b.onclick = () => { readInputs(fields); readInfo(); D.captionStyle = b.dataset.cs; drawStep(); });
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); readInfo(); REFS = [...REFS, ...[...e.target.files].filter((f) => f.type.startsWith('image/'))].slice(0, maxP); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); readInfo(); REFS.splice(Number(b.dataset.rm), 1); drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields); readInfo(); D.count = Number(D.count) || 3;
      if (!D.product.trim()) return toast(`ใส่${nameLabel}ก่อน`);
      if ((id === 'v_shop' || id === 'v_pr_recap') && !REFS.length && !D.fromWork) return toast('ใส่รูปอย่างน้อย 1 รูป (แนะนำ 3 รูปขึ้นไป)');
      D.step = 3; drawStep();
    };
  } else if (s === 2 && D.style === 'v_drama') {
    const V2 = CAT.video;
    stepShell(`<h1 style="font-size:22px">ละครแนวไหน?</h1>
      <div class="grid2">${V2.genres.map((g) => `<button type="button" class="card opt" data-genre="${g.id}" aria-pressed="${D.genre === g.id}"><b>${esc(g.label)}</b><span class="muted">${esc(g.desc)}</span></button>`).join('')}</div>
      ${D.genre === 'free' ? `<label class="f" for="plot">พล็อตเรื่อง<textarea id="plot" rows="3" maxlength="400" placeholder="เช่น ยายไปตลาดเจอขนมแปลกใหม่ หลานไม่เชื่อว่าอร่อย">${esc(D.plot)}</textarea></label>` : ''}
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
  } else if (s === 2 && D.style === 'v_self') {
    const voice = D.selfMode === 'voice';
    const cs = CAT.video.captionStyles;
    stepShell(`<section class="card"><b>คลิปที่ถ่ายเอง (ไม่เกิน ${CAT.video.selfMaxSec / 60} นาที)</b>
        ${VFILE ? `<video src="${URL.createObjectURL(VFILE)}" controls playsinline muted style="width:100%;max-height:420px;border-radius:12px;background:#000"></video>
          <div class="row between"><span class="muted">${esc(VFILE.name)} · ${Math.round(D.videoSec)} วิ</span><label class="chip" for="vin" style="cursor:pointer">เปลี่ยนคลิป</label></div>`
          : `<label class="ref add" for="vin" style="width:100%;height:120px;cursor:pointer">+ เลือกคลิปจากเครื่อง</label>${D.fromWork ? '<span class="muted">หรือใช้คลิปจากงานเดิม</span>' : ''}`}
        <input id="vin" type="file" accept="video/*" hidden></section>
      <section style="display:flex;flex-direction:column;gap:10px"><h2>ทำอะไรกับเสียง</h2>
        <div class="grid2"><button type="button" class="card opt" data-mode="subs" aria-pressed="${!voice}"><b>ใส่ซับจากเสียงพูด</b><span class="muted">AI ฟังแล้วทำซับ แก้คำผิดได้ก่อนตัด</span></button>
        <button type="button" class="card opt" data-mode="voice" aria-pressed="${voice}"><b>AI พากย์ทับ</b><span class="muted">คลิปไม่มีเสียง/ไม่อยากพูดเอง +${CAT.video.selfPrices.voiceExtra} ดาว</span></button></div></section>
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
    $('#vin').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 400 * 1024 * 1024) return toast('ไฟล์ใหญ่เกิน 400MB');
      readInputs(fields);
      const v = document.createElement('video'); v.preload = 'metadata';
      v.onloadedmetadata = () => {
        if (v.duration > CAT.video.selfMaxSec + 1) return toast(`คลิปยาว ${Math.round(v.duration)} วิ เกิน ${CAT.video.selfMaxSec / 60} นาที`);
        VFILE = f; D.videoSec = v.duration; drawStep();
      };
      v.onerror = () => { VFILE = f; D.videoSec = 60; drawStep(); };
      v.src = URL.createObjectURL(f);
    };
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
    stepShell(`<p class="muted">แนว: <b style="color:var(--fg)">${esc(st.label)}</b></p>
      <section class="card">
        <label class="f" for="product">ชื่อสินค้า / เรื่อง<input id="product" type="text" maxlength="120" placeholder="เช่น ข้าวมันไก่ต้ม, เซรั่มวิตซี" value="${esc(D.product)}"></label>
        ${st.text ? `<label class="f" for="headline">ข้อความหลักบนภาพ (สั้นๆ)<input id="headline" type="text" maxlength="60" placeholder="เช่น เปิดใหม่! อร่อยต้องลอง" value="${esc(D.headline)}"></label>
        <label class="f" for="price">${st.pr ? 'ข้อความรอง (ไม่บังคับ)' : 'ราคา / โปร (ไม่บังคับ)'}<input id="price" type="text" maxlength="40" placeholder="${st.pr ? 'เช่น ขอเชิญร่วมงาน' : 'เช่น 59.- หรือ ซื้อ 1 แถม 1'}" value="${esc(D.price)}"></label>` : ''}
        <label class="f" for="details">รายละเอียดเพิ่ม (ไม่บังคับ)<textarea id="details" rows="3" maxlength="600" placeholder="${st.pr ? 'เนื้อหาประกาศ ผู้เข้าร่วม เงื่อนไข บรรยากาศที่อยากได้' : 'จุดเด่น วัตถุดิบ กลุ่มลูกค้า บรรยากาศที่อยากได้'}">${esc(D.details)}</textarea></label>
        <div id="warn"></div>
      </section>
      ${st.pr ? `<section class="card"><b>ข้อมูลบนภาพ</b>${infoFields(['org', 'date', 'place', 'contact'])}</section>` : ''}
      <section class="card"><b>${st.pr ? 'รูปประกอบ (ไม่บังคับ)' : 'ภาพสินค้าจริง (ไม่บังคับ แต่แนะนำ)'}</b><span class="muted">${st.pr ? 'เช่น รูปสถานที่ บุคคล โลโก้งาน ใส่ได้ 3 รูป' : 'ใส่ได้ 3 รูป AI จะใช้สินค้าจริงของคุณ ไม่แต่งสินค้าใหม่'}</span>
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
    bindChips(['concepts'], (k) => { if (k === 'concepts' && D.concepts.length > 5) { D.concepts.pop(); drawStep(); toast('เลือกได้สูงสุด 5'); } });
    const fields = ['product', 'headline', 'price', 'details', 'useLogo', 'showShop'];
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
    const vid = vidAll && !(D.style === 'v_self' && D.selfMode !== 'voice') && D.style !== 'v_drama'; // มีบทพากย์ (ละคร AI เลือกเสียงเอง)
    const fm = vid && !INFO_IDS.includes(D.style) ? CAT.video.formulas.filter((f) => !(D.style === 'v_top' && (f.dialogue || f.id === 'pas' || f.id === 'story'))) : [];
    if (vid && fm.length && (!D.formula || !fm.some((f) => f.id === D.formula))) D.formula = (fm.find((f) => f.rec.includes(D.goal)) || fm[0]).id;
    const dlg = vid && fm.find((f) => f.id === D.formula)?.dialogue;
    if (dlg) D.premiumVoice = false;
    stepShell(`${vid && fm.length ? `<h1 style="font-size:22px">เล่าเรื่องแบบไหน?</h1>
      <div class="grid2">${fm.map((f) => `<button type="button" class="card opt" data-formula="${f.id}" aria-pressed="${D.formula === f.id}">
        <b>${esc(f.label)}${f.rec.includes(D.goal) ? ' <span class="badge b-lime">แนะนำ</span>' : ''}</b><span class="muted">${esc(f.desc)}</span></button>`).join('')}</div>
      <h2>โทน</h2>` : `<h1 style="font-size:22px">${D.style?.startsWith('v_pr') || D.goal === 'pr' ? 'โทนแคปชั่น (งานประชาสัมพันธ์ใช้ภาษาทางการให้อัตโนมัติ)' : 'แคปชั่นโทนไหน?'}</h1>`}
      <p class="muted">AI เขียนให้ 4 แบบ: Facebook, Instagram, TikTok, Shopee${D.link ? ' พร้อมใส่ลิงก์' : ''}</p>
      ${chipRow(CAT.tones, D.tone || CAT.tones[0], 'tone', false)}
      <section style="display:flex;flex-direction:column;gap:10px"><div class="row between"><h2>แฮชแท็กประจำ</h2><a href="#tags" style="font-size:14px">จัดการ</a></div>
        ${saved.length ? chipRow(saved, D.hashtags, 'hashtags', true) : '<p class="muted">ยังไม่มีแฮชแท็กประจำ</p>'}</section>
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
        <span class="row between" style="width:100%"><b>${esc(l.label)}</b><b class="num" style="color:var(--lime)">${ICON.star}${price(l.id)} ดาว</b></span>
        <span class="muted">${{ 15: 'สั้น กระชับ เหมาะ Reels/TikTok ป้ายยาเร็ว', 30: 'ยอดนิยม เล่าจุดเด่นได้ครบ', 45: 'เล่าละเอียด เหมาะสินค้าราคาสูง' }[l.id] || ''}</span></button>`).join('')}</div>
      <p class="muted">คลิป 9:16 1080p พร้อมซับไทย ป้ายราคา และปุ่มชวนซื้อ · ยอดดาวคุณ ${num(CAT.stars)} ดาว · ยังไม่ตัดดาวจนกว่าจะยืนยัน</p>`);
    app.querySelectorAll('[data-len]').forEach((b) => b.onclick = () => { D.length = Number(b.dataset.len); drawStep(); });
    $('#next').onclick = () => { D.step = 5; drawStep(); };
  } else if (s === 4) {
    const free = CAT.free.today + CAT.free.welcome;
    if (D.tier === 'free' && !free) D.tier = 'std';
    const cost = (t) => t.free ? 0 : t.stars * D.versions;
    stepShell(`<h1 style="font-size:22px">เลือกคุณภาพ</h1>
      <div style="display:flex;flex-direction:column;gap:10px">${CAT.tiers.map((t) => {
        const dis = t.free && !free;
        return `<button type="button" class="card opt tier" data-tier="${t.id}" aria-pressed="${D.tier === t.id}" ${dis ? 'disabled' : ''}>
          <span class="row between" style="width:100%"><b>${esc(t.label)} <span class="muted">${esc(t.size)}</span></b>
          <b class="num" style="color:var(--lime)">${t.free ? `ฟรี · เหลือ ${free}` : `${ICON.star}${cost(t)} ดาว`}</b></span>
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
  return { v_self: `เริ่ม ${V2.selfPrices.subs[0]} ดาว · ซับอัตโนมัติ`, v_top: `เริ่ม ${V2.prices[30]} ดาว · 2–5 สินค้า`, v_drama: `เริ่ม ${V2.dramaPrices[4]} ดาว · AI วาดฉาก+หลายเสียง`,
    v_show: `เริ่ม ${V2.prices[15]} ดาว · 2–8 รูป`, v_tips: `เริ่ม ${V2.prices[30]} ดาว · 3 หรือ 5 ทิป`, v_shop: `เริ่ม ${V2.prices[15]} ดาว · รูปร้าน+ข้อมูล`,
    v_pr_announce: `เริ่ม ${V2.prices[15]} ดาว · เสียงทางการ`, v_pr_recap: `เริ่ม ${V2.prices[15]} ดาว · จากรูปกิจกรรม` }[x.id] || `เริ่ม ${V2.prices[15]} ดาว · 9:16`;
}
const INFO_IDS = ['v_tips', 'v_shop', 'v_pr_announce', 'v_pr_recap'];
const infoFields = (keys) => {
  const L = { org: ['ชื่อหน่วยงาน / ร้าน', ME.brand?.shopName || ''], date: ['วัน เวลา', 'เช่น 5 ธ.ค. 69 เวลา 09.00 น.'], place: ['สถานที่', 'เช่น หอประชุม อบต.บ้านพรุ'], contact: ['ติดต่อ', 'เช่น โทร 074-xxx-xxx / LINE @...'], hours: ['เวลาเปิด', 'เช่น ทุกวัน 07.00–19.00'] };
  D.info = D.info || {};
  if (keys.includes('org') && !D.info.org && ME.brand?.shopName) D.info.org = ME.brand.shopName;
  return keys.map((k) => `<label class="f" for="info_${k}">${L[k][0]}<input id="info_${k}" type="text" maxlength="100" placeholder="${esc(L[k][1])}" value="${esc(D.info[k] || '')}"></label>`).join('');
};
const readInfo = () => { D.info = D.info || {}; app.querySelectorAll('[id^="info_"]').forEach((el) => { D.info[el.id.slice(5)] = el.value; }); };
const payload = () => ({ ...D, hasPhotos: REFS.length > 0, hashtags: [...D.hashtags, ...String(D.extraTags || '').split(/[\s,]+/).filter(Boolean)] });
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
      ${row('เป้าหมาย', goal.label)}${row('ลิงก์', D.link)}${row(vid ? 'แนวคลิป' : 'แนวภาพ', st.label)}${row('สินค้า', D.product)}${row('ข้อความบนภาพ', D.headline)}${row('ราคา/โปร', D.price)}
      ${row('คอนเซปต์', D.concepts.join(', '))}${vid ? '' : row('ขนาด', D.ratio) + row('ภาพสินค้าจริง', REFS.length ? `${REFS.length} รูป` : D.fromWork ? 'จากงานเดิม' : '')}
      ${vid ? '' : row('โลโก้', D.useLogo && ME.brand?.logo ? 'ใส่มุมขวาบน' : '')}${row('โทนแคปชั่น', D.tone)}${row('แฮชแท็ก', payload().hashtags.join(' '))}
      ${INFO_IDS.includes(D.style) ? row('รูป', REFS.length ? `${REFS.length} รูป` : (D.style === 'v_pr_announce' ? 'AI วาดพื้นหลังให้ (+5 ดาว)' : '')) + (D.style === 'v_tips' ? row('จำนวนทิป', `${D.count} ทิป`) : '') + Object.entries(D.info || {}).filter(([, v]) => v).map(([k, v]) => row({ org: 'หน่วยงาน/ร้าน', date: 'วันเวลา', place: 'สถานที่', contact: 'ติดต่อ', hours: 'เวลาเปิด' }[k] || k, v)).join('') + row('เสียงพากย์', vname) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + (D.style === 'v_tips' ? '' : row('ความยาว', `${D.length} วินาที`)) : ''}
      ${!vid && st.pr ? Object.entries(D.info || {}).filter(([, v]) => v).map(([k, v]) => row({ org: 'หน่วยงาน', date: 'วันเวลา', place: 'สถานที่', contact: 'ติดต่อ' }[k] || k, v)).join('') : ''}
      ${D.style === 'v_drama' ? row('แนวเรื่อง', CAT.video.genres.find((g) => g.id === D.genre)?.label) + row('พล็อต', D.genre === 'free' ? D.plot : '') + row('สไตล์ภาพ', CAT.video.art.find((a) => a.id === D.art)?.label) + row('จำนวนฉาก', `${D.scenes} ฉาก`) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) : ''}
      ${D.style === 'v_top' ? D.items.map((it, i) => row(`#${i + 1}`, `${it.name}${it.price ? ` · ${it.price}` : ''}${it.link ? ' · มีลิงก์' : ''}`)).join('') + row('สไตล์ตัดต่อ', CAT.video.styles.find((x) => x.id === 'v_top').variants.find((v) => v.id === D.variant)?.label || 'สุ่มให้') + row('สูตรเล่าเรื่อง', CAT.video.formulas.find((f) => f.id === D.formula)?.label) + row('เสียงพากย์', vname) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + row('ความยาว', `~${D.length} วินาที`) : ''}
      ${D.style === 'v_show' ? row('รูปสินค้า', `${REFS.length} รูป`) + row('สไตล์ตัดต่อ', CAT.video.styles.find((x) => x.id === 'v_show').variants.find((v) => v.id === D.variant)?.label || 'สุ่มให้') + row('สูตรเล่าเรื่อง', CAT.video.formulas.find((f) => f.id === D.formula)?.label) + row('เสียงพากย์', vname) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + row('ความยาว', `${D.length} วินาที`) : ''}
      ${D.style === 'v_top' || D.style === 'v_show' || D.style === 'v_drama' || INFO_IDS.includes(D.style) ? '' : D.style === 'v_self' ? row('คลิป', VFILE ? `${VFILE.name} · ${Math.round(D.videoSec)} วิ` : 'จากงานเดิม') + row('เสียง', D.selfMode === 'voice' ? `AI พากย์ทับ (${vname || ''})` : 'ซับจากเสียงพูด') + row('สไตล์ซับ', CAT.video.captionStyles.find((c) => c.id === D.captionStyle)?.label) + row('ฮุค', D.hookText) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label)
        : vid ? row('รูปสินค้า', REFS.length ? `${REFS.length} รูป` : '') + row('แคปรีวิว', REVS.length ? `${REVS.length} รูป` : '') + row('ลูกเล่นตอนเปิด', st.variants?.length ? (st.variants.find((x) => x.id === D.variant)?.label || 'สุ่มให้') : '') + row('สูตรเล่าเรื่อง', CAT.video.formulas.find((f) => f.id === D.formula)?.label) + row('เสียงพากย์', vname + (CAT.video.formulas.find((f) => f.id === D.formula)?.dialogue ? ' + คู่สนทนา' : '')) + row('เพลง', CAT.video.music.find((m) => m.id === D.music)?.label) + row('ความยาว', `${D.length} วินาที`) : row('คุณภาพ', `${tier.label} ${tier.size} × ${qt.versions} แบบ`)}
    </div>
    <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">${qt.free ? 'ใช้ภาพฟรี' : 'ดาวที่ใช้'}</span>
      <b class="num" style="font-size:28px">${qt.free ? 'ฟรี' : `${ICON.star.replace('17', '24').replace('17', '24')} ${qt.cost}`}</b></div>
      <span class="muted">${qt.free ? `ภาพฟรีเหลือ ${qt.freeLeft.today + qt.freeLeft.welcome} ภาพ · มีลายน้ำเล็กๆ` : `ยอดคงเหลือหลังสร้าง ${num(qt.stars - qt.cost)} ดาว`} · สร้างไม่สำเร็จคืนให้อัตโนมัติ</span></section>
    ${D.style === 'v_self' && VFILE ? '<p class="muted">อัปโหลดคลิปขณะใช้เน็ตมือถืออาจใช้เวลาสักครู่ ห้ามปิดหน้านี้จนขึ้นว่าส่งงานแล้ว</p>' : ''}
    <p class="muted">ใช้เวลาประมาณ ${vid ? '2–5 นาที' : '20–60 วินาที'} · ไฟล์เก็บบนเซิร์ฟเวอร์ ${CAT.keepDays} วัน ดาวน์โหลดเก็บไว้ด้วย</p>`, { next: label, nextId: 'go', disabled: !!qt.blocked });
  $('#go').onclick = async () => {
    if (!qt.free && !qt.enough) return go('topup');
    const b = $('#go'); b.disabled = true; b.textContent = 'กำลังส่งงาน…';
    const fd = new FormData(); fd.append('data', JSON.stringify(payload())); REFS.forEach((f) => fd.append('refs', f)); if (D.kind === 'video') REVS.forEach((f) => fd.append('revs', f));
    if (D.style === 'v_self' && VFILE) fd.append('video', VFILE);
    if (D.style === 'v_top') ITEMF.slice(0, D.items.length).forEach((f) => fd.append('refs', f));
    try {
      const r = D.style === 'v_self' && VFILE ? await uploadWithProgress('api/works', fd, (pc) => { b.textContent = `กำลังอัปโหลดคลิป ${pc}%`; }) : await api('api/works', { method: 'POST', body: fd });
      ME = r.me; CAT = null; D = null; REFS = []; REVS = []; VFILE = null; ITEMF = []; try { sessionStorage.removeItem('mr_draft'); } catch {}
      go(`work?id=${r.id}`);
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = label; }
  };
}

// ---------- ผลงานของฉัน ----------
const PLAT = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['shopee', 'Shopee'], ['lazada', 'Lazada'], ['line', 'LINE']];
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 864e5));
const WSTAT = { queued: ['รอคิว', 'b-lime'], working: ['กำลังสร้าง', 'b-lime'], review: ['รอตรวจซับ', 'b-warn'], done: ['เสร็จแล้ว', 'b-ok'], failed: ['ไม่สำเร็จ', 'b-warn'] };
async function worksView() {
  app.innerHTML = `${topbar()}<main><div class="row between"><h1 style="font-size:22px">ผลงานของฉัน</h1><span class="row" style="gap:8px"><a class="btn dark sm" href="#plan">📅 ปฏิทินโพสต์</a><a class="btn sm" href="#create?new=1">+ สร้าง</a></span></div>
    <div id="wl" class="grid2"><p class="muted">กำลังโหลด…</p></div></main>${nav('works')}`;
  const { items } = await api('api/works');
  if (!items.length) { $('#wl').outerHTML = `<div class="soon card"><h2>ยังไม่มีผลงาน</h2><p class="muted">สร้างภาพแรกได้เลย มีภาพฟรีให้ ${ME.freeImages.today + ME.freeImages.welcome} ภาพ</p><a class="btn" href="#create?new=1">สร้างภาพแรก</a></div>`; return; }
  $('#wl').innerHTML = items.map((w) => `<a class="wcard" href="#work?id=${w.id}">
    <div class="wthumb">${w.files[0] ? `<img src="${w.files[0].thumb}" alt="" loading="lazy">` : `<span class="muted">${w.purged ? 'ไฟล์ถูกลบแล้ว' : WSTAT[w.status]?.[0] || ''}</span>`}
      ${w.kind === 'video' ? '<span class="cnt">▶ คลิป</span>' : w.files.length > 1 ? `<span class="cnt">${w.files.length}</span>` : ''}</div>
    <b style="font-size:14px;line-height:1.3">${esc(w.title)}</b>
    <span class="row between"><span class="badge ${WSTAT[w.status]?.[1]}">${WSTAT[w.status]?.[0]}</span>
      <span class="muted">${w.purged ? 'หมดอายุ' : Object.keys(w.posted || {}).length ? `โพสต์ ${Object.keys(w.posted).length} ที่` : `เหลือ ${daysLeft(w.expiresAt)} วัน`}</span></span></a>`).join('');
  if (items.some((w) => ['queued', 'working'].includes(w.status))) setTimeout(() => { if (location.hash.startsWith('#works')) worksView().catch(() => {}); }, 5000);
}

async function workView(qs) {
  const id = Number(new URLSearchParams(qs || '').get('id'));
  if (!id) return go('works');
  app.innerHTML = `${topbar('ผลงาน', 'works')}<main><p class="muted">กำลังโหลด…</p></main>${nav('works')}`;
  let w = await api(`api/works/${id}`);
  if (['queued', 'working'].includes(w.status)) {
    $('main').innerHTML = `<section class="hero" style="align-items:center;text-align:center;gap:14px;padding:32px 18px">
      <div class="spin" aria-hidden="true"></div><h2 id="pst">${w.status === 'queued' ? 'รอคิวสร้าง…' : w.kind === 'video' ? (w.progress?.stage || 'กำลังเริ่ม…') : 'AI กำลังสร้างภาพ…'}</h2>
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
    $('main').innerHTML = `<section class="card" style="background:var(--bad-bg)"><b style="color:var(--bad)">สร้างไม่สำเร็จ</b><span>${esc(w.error)}</span></section>
      <button type="button" class="btn" id="again">ลองใหม่ (แก้รายละเอียดได้)</button><button type="button" class="btn ghost" id="del">ลบรายการนี้</button>`;
  } else {
    const caps = PLAT.slice(0, 4).filter(([k]) => w.captions?.[k]);
    const tags = (w.hashtags || []).join(' ');
    $('main').innerHTML = `
      ${w.purged ? `<section class="card"><b>ไฟล์ถูกลบจากเซิร์ฟเวอร์แล้ว</b><span class="muted">ครบ ${CAT?.keepDays || 7} วัน · แคปชั่นยังคัดลอกได้ · กด "สร้างแบบนี้อีก" เพื่อทำใหม่</span></section>`
        : `<div class="gallery">${w.files.map((f, i) => `<figure>${f.type === 'video' ? `<video src="${f.url}" ${f.thumb ? `poster="${f.thumb}"` : ''} controls playsinline preload="metadata" style="width:100%;border-radius:14px;background:#000;aspect-ratio:9/16"></video>` : `<img src="${f.url}" alt="ภาพที่ ${i + 1}" width="${f.w}" height="${f.h}">`}
          <figcaption class="grid2"><button type="button" class="btn sm" data-save="${i}">บันทึกลงเครื่อง</button><a class="btn dark sm" href="${f.url}?dl=1" download>ดาวน์โหลด</a></figcaption></figure>`).join('')}</div>
        <p class="muted">ไฟล์อยู่บนเซิร์ฟเวอร์อีก ${daysLeft(w.expiresAt)} วัน · ${w.free ? 'ภาพฟรี (มีลายน้ำ)' : `ใช้ ${w.cost} ดาว`}</p>
        ${w.params?.script?.length ? `<details class="card"><summary style="font-weight:600;cursor:pointer">บทพากย์</summary><p class="muted" style="margin:0">${esc(w.params.script.join(' '))}</p></details>` : ''}`}
      ${caps.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>แคปชั่น</h2>
        <div class="chips" role="tablist">${caps.map(([k, l], i) => `<button type="button" class="chip" role="tab" data-cap="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>
        <textarea id="cap" rows="7" aria-label="แคปชั่น">${esc(w.captions[caps[0][0]] + (tags ? '\n\n' + tags : ''))}</textarea>
        <button type="button" class="btn dark" id="copyCap">คัดลอกแคปชั่น + แฮชแท็ก</button></section>` : ''}
      <section class="card"><b>โพสต์ไปที่ไหนแล้ว</b><span class="muted">ติ๊กไว้ จะได้รู้ว่างานไหนโพสต์แล้ว (โพสต์ตรงจากแอปจะเปิดเร็วๆ นี้)</span>
        <div class="chips">${PLAT.map(([k, l]) => `<button type="button" class="chip" data-post="${k}" aria-pressed="${!!w.posted?.[k]}">${l}${w.posted?.[k] ? ' · ' + new Date(w.posted[k]).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''}</button>`).join('')}</div></section>
      <div id="wstats"></div>
      ${w.purged ? '' : '<button type="button" class="btn dark" id="toDrive">ส่งเข้า Google Drive</button>'}
      ${w.purged ? '' : '<section class="card" id="sched"><b>ตั้งเวลาโพสต์</b><span class="muted">กำลังโหลด…</span></section>'}
      <div class="list">${historyRows(w)}</div>
      ${w.style === 'v_self' && w.params?.selfMode === 'subs' && !w.purged && (w.params?.rerenders || 0) < 1 ? '<button type="button" class="btn dark" id="fixsubs">แก้ซับแล้วตัดใหม่ (ฟรี 1 ครั้ง)</button>' : ''}
      <button type="button" class="btn" id="again">สร้างแบบนี้อีก</button>
      <button type="button" class="btn ghost" id="del">ลบผลงานนี้</button>`;
    const fx = $('#fixsubs'); if (fx) fx.onclick = () => subsEditor(w, qs);
    schedCard(w, new URLSearchParams(qs || '').get('post')).catch(() => {});
    app.querySelectorAll('[data-cap]').forEach((b) => b.onclick = () => {
      app.querySelectorAll('[data-cap]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#cap').value = w.captions[b.dataset.cap] + (tags ? '\n\n' + tags : '');
    });
    const cc = $('#copyCap'); if (cc) cc.onclick = async () => {
      try { await navigator.clipboard.writeText($('#cap').value); toast('คัดลอกแล้ว'); } catch { $('#cap').select(); toast('กดค้างเพื่อคัดลอก'); }
      api(`api/works/${w.id}/event`, { method: 'POST', body: { t: 'copy', p: app.querySelector('[data-cap][aria-pressed="true"]')?.dataset.cap } }).catch(() => {});
    };
    app.querySelectorAll('[data-save]').forEach((b) => b.onclick = () => saveImage(w, Number(b.dataset.save)));
    const td = $('#toDrive'); if (td) td.onclick = async () => {
      td.disabled = true; td.textContent = 'กำลังส่งเข้า Drive…';
      try { const r = await api(`api/works/${w.id}/drive`, { method: 'POST', body: {} }); toast(`ส่ง ${r.files} ภาพ + แคปชั่นเข้า Drive แล้ว`); td.textContent = 'ส่งเข้า Drive แล้ว ✓'; }
      catch (e) { if (/ยังไม่ได้เชื่อม/.test(e.message)) { if (confirm('ยังไม่ได้เชื่อม Google Drive ไปเชื่อมตอนนี้?')) location.href = 'drive/connect'; } else toast(e.message); td.disabled = false; td.textContent = 'ส่งเข้า Google Drive'; }
    };
    if (w.params?.link) api(`api/stats/clicks?work=${w.id}`).then((st) => {
      const tot = st.byPlatform.reduce((a, b) => a + b.clicks, 0); const el = $('#wstats'); if (!el) return;
      el.innerHTML = `<section class="card"><div class="row between"><b>คลิกลิงก์จากผลงานนี้</b><b class="num" style="font-size:22px;color:var(--lime)">${num(tot)}</b></div>
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
    VFILE = null; ITEMF = [];
    D = { ...newDraft(), kind: w.kind, info: p.info || {}, count: p.count || 3, items: p.items || newDraft().items, genre: p.genre || 'inlaw', art: p.art || 'cartoon3d', scenes: p.scenes || 4, plot: p.plot || '', selfMode: p.selfMode || 'subs', videoSec: p.videoSec || 0, captionStyle: p.captionStyle || 'pop', hookText: p.hookText || '', keepAudio: p.keepAudio !== false, length: p.length || 30, voice: p.voice || '', premiumVoice: !!p.premium, formula: p.formula || '', variant: p.variant || 'random', music: p.music || 'auto', goal: p.goal, link: p.link, style: w.style, product: p.product, price: p.price, headline: p.headline, details: p.details, concepts: p.concepts || [], ratio: p.ratio, useLogo: p.useLogo, showShop: p.showShop, tone: p.tone, hashtags: p.hashtags || [], tier: w.tier, versions: w.versions, fromWork: w.id, step: 2 };
    REFS = []; REVS = []; saveDraft(); go('create');
  };
  $('#del').onclick = async () => {
    if (!confirm('ลบผลงานนี้? ไฟล์บนเซิร์ฟเวอร์จะหายทันที (ดาวไม่คืน)')) return;
    try { await api(`api/works/${w.id}`, { method: 'DELETE' }); toast('ลบแล้ว'); go('works'); } catch (e) { toast(e.message); }
  };
}
function historyRows(w) {
  const ev = [...(w.events || [])].reverse().slice(0, 8);
  const lab = { download: 'ดาวน์โหลด', share: 'บันทึก/แชร์', copy: 'คัดลอกแคปชั่น', drive: 'ส่งเข้า Drive' };
  const d = (x) => new Date(x).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  return `<div><span class="muted">สร้างเมื่อ</span><span>${d(w.createdAt)}</span></div>` + ev.map((e) => `<div><span class="muted">${lab[e.t] || e.t}${e.t === 'drive' ? ` ${e.n} ภาพ` : e.t !== 'copy' ? ` ภาพที่ ${(e.n || 0) + 1}` : ''}</span><span>${d(e.at)}</span></div>`).join('');
}
// มือถือ: เปิดหน้าแชร์ของเครื่อง → "บันทึกภาพ" ลงคลังรูป / ส่ง LINE ได้เลย
async function saveImage(w, i) {
  const f = w.files[i];
  try {
    const blob = await (await fetch(f.url, { credentials: 'same-origin' })).blob();
    const vid = f.type === 'video';
    const file = new File([blob], `mcrich-${w.id}-${i + 1}.${vid ? 'mp4' : 'jpg'}`, { type: vid ? 'video/mp4' : 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      api(`api/works/${w.id}/event`, { method: 'POST', body: { t: 'share', n: i } }).catch(() => {});
      return;
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  location.href = `${f.url}?dl=1`;
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
async function schedCard(w, postNow) {
  const el = $('#sched'); if (!el) return;
  const { items } = await api(`api/schedules?work=${w.id}`);
  const pend = items.filter((x) => x.status === 'scheduled' || x.status === 'due');
  const sel = new Set(['tiktok']);
  const next = new Date(Date.now() + 3600e3); next.setMinutes(0, 0, 0);
  const due = postNow ? items.find((x) => x.platform === postNow && x.status === 'due') : null;
  el.innerHTML = `
    ${due ? `<div class="card" style="background:#1C2410;border-color:var(--lime)"><b>📣 ถึงเวลาโพสต์ ${esc(due.platformLabel)}</b>
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
  app.innerHTML = `${topbar('ปฏิทินโพสต์', 'works')}<main><p class="muted">กำลังโหลด…</p></main>${nav('works')}`;
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

// ---------- ลิงก์สั้น + สถิติคลิก ----------
const bars = (days) => {
  const max = Math.max(1, ...days.map((d) => d.n));
  return `<div class="bars" role="img" aria-label="คลิกรายวัน 14 วัน">${days.map((d) => `<span title="${d.day}: ${d.n}"><i style="height:${Math.max(2, Math.round(d.n / max * 100))}%"></i></span>`).join('')}</div>
    <div class="row between muted" style="font-size:11px"><span>${new Date(days[0].day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span><span>วันนี้</span></div>`;
};
const PLATS = [['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['shopee', 'Shopee'], ['lazada', 'Lazada'], ['line', 'LINE'], ['youtube', 'YouTube'], ['other', 'อื่นๆ']];
async function linksView() {
  app.innerHTML = `${topbar('ลิงก์ของฉัน', 'profile')}<main><p class="muted">กำลังโหลด…</p></main>${nav('profile')}`;
  const [d, st] = await Promise.all([api('api/links'), api('api/stats/clicks')]);
  let plat = 'tiktok';
  $('main').innerHTML = `
    <section class="hero"><div class="grid3">
      <div><span class="muted">คลิกทั้งหมด</span><br><b class="num" style="font-size:24px">${num(d.total.clicks)}</b></div>
      <div><span class="muted">คนไม่ซ้ำ</span><br><b class="num" style="font-size:24px">${num(d.total.uniques)}</b></div>
      <div><span class="muted">7 วันล่าสุด</span><br><b class="num" style="font-size:24px;color:var(--lime)">${num(d.total.week)}</b></div></div>
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
    case 'profile': return profileView(qs);
    case 'links': return linksView().catch((e) => toast(e.message));
    case 'plan': return planView().catch((e) => toast(e.message));
    case 'brand': return brandView();
    case 'tags': return tagsView();
    case 'stars': return starsView().catch((e) => toast(e.message));
    case 'topup': return topupView().catch((e) => toast(e.message));
    case 'admin': return ME.admin ? adminView().catch((e) => toast(e.message)) : go('home');
    case 'create': return createView(qs).catch((e) => toast(e.message));
    case 'works': return worksView().catch((e) => toast(e.message));
    case 'work': return workView(qs).catch((e) => toast(e.message));
    case 'chat': return soon('chat', 'แชทผู้ช่วย AI', 'ถามเรื่องดาว ผลงาน หรือขอไอเดียคลิปได้ตลอด 24 ชม.');
    default: return homeView();
  }
}
window.addEventListener('hashchange', route);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
fetch('api/config').then((r) => r.json()).then((c) => { CFG = c; }).catch(() => {}).finally(route);
