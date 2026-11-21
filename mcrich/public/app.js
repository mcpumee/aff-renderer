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
const STEPS = ['เป้าหมาย', 'แนวงาน', 'รายละเอียด', 'แคปชั่น', 'คุณภาพ', 'ทบทวน'];
const newDraft = () => ({ step: 0, goal: (ME.interests?.goals || []).includes('Affiliate') ? 'aff' : 'sell', link: '', kind: 'image', style: '', product: '', price: '', headline: '', details: '', concepts: [], ratio: '', useLogo: !!ME.brand?.logo, showShop: true, tone: '', hashtags: [...(ME.hashtags || [])], extraTags: '', tier: 'std', versions: 1, fromWork: 0 });
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
    const s = params.get('kind') !== 'video' && CAT.styles.find((x) => x.id === params.get('style'));
    if (s) { D = { ...newDraft(), style: s.id, ratio: s.ratio, step: 0 }; REFS = []; }
    else { D = newDraft(); REFS = []; toast('แนวคลิปนี้จะเปิดในเฟสวิดีโอ ตอนนี้สร้างภาพได้ก่อน'); }
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
  $('#reset').onclick = () => { D = newDraft(); REFS = []; saveDraft(); drawStep(); };
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
    stepShell(`<div class="grid2" role="group" aria-label="ประเภทผลงาน">
        <button type="button" class="card opt" aria-pressed="true"><b>ภาพ</b><span class="muted">โปสเตอร์ ภาพสินค้า ป้ายโปร</span></button>
        <button type="button" class="card opt" id="vid" aria-disabled="true" style="opacity:.55"><b>คลิปวิดีโอ</b><span class="muted">เปิดเฟสถัดไป</span></button></div>
      <h2>เลือกแนวภาพ</h2>
      <div class="grid2">${CAT.styles.map((x) => `<button type="button" class="stylecard" data-style="${x.id}" aria-pressed="${D.style === x.id}">
        <span class="sw" style="background:${esc(x.color)}">${x.emoji}</span><b>${esc(x.label)}</b><span class="muted">${x.text ? 'มีข้อความบนภาพ' : 'ภาพล้วน'} · ${esc(x.ratio)}</span></button>`).join('')}</div>`, { disabled: !D.style });
    $('#vid').onclick = () => toast('คลิปวิดีโอจะเปิดในเฟสถัดไป');
    app.querySelectorAll('[data-style]').forEach((b) => b.onclick = () => { D.style = b.dataset.style; D.ratio = CAT.styles.find((x) => x.id === D.style).ratio; drawStep(); });
    $('#next').onclick = () => { D.step = 2; drawStep(); };
  } else if (s === 2) {
    const st = CAT.styles.find((x) => x.id === D.style);
    stepShell(`<p class="muted">แนว: <b style="color:var(--fg)">${esc(st.label)}</b></p>
      <section class="card">
        <label class="f" for="product">ชื่อสินค้า / เรื่อง<input id="product" type="text" maxlength="120" placeholder="เช่น ข้าวมันไก่ต้ม, เซรั่มวิตซี" value="${esc(D.product)}"></label>
        ${st.text ? `<label class="f" for="headline">ข้อความหลักบนภาพ (สั้นๆ)<input id="headline" type="text" maxlength="60" placeholder="เช่น เปิดใหม่! อร่อยต้องลอง" value="${esc(D.headline)}"></label>
        <label class="f" for="price">ราคา / โปร (ไม่บังคับ)<input id="price" type="text" maxlength="40" placeholder="เช่น 59.- หรือ ซื้อ 1 แถม 1" value="${esc(D.price)}"></label>` : ''}
        <label class="f" for="details">รายละเอียดเพิ่ม (ไม่บังคับ)<textarea id="details" rows="3" maxlength="600" placeholder="จุดเด่น วัตถุดิบ กลุ่มลูกค้า บรรยากาศที่อยากได้">${esc(D.details)}</textarea></label>
        <div id="warn"></div>
      </section>
      <section class="card"><b>ภาพสินค้าจริง (ไม่บังคับ แต่แนะนำ)</b><span class="muted">ใส่ได้ 3 รูป AI จะใช้สินค้าจริงของคุณ ไม่แต่งสินค้าใหม่</span>
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
    const ri = $('#refin'); if (ri) ri.onchange = (e) => { readInputs(fields); REFS = [...REFS, ...[...e.target.files].filter((f) => f.type.startsWith('image/'))].slice(0, 3); drawStep(); };
    app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { readInputs(fields); REFS.splice(Number(b.dataset.rm), 1); drawStep(); });
    $('#next').onclick = () => {
      readInputs(fields);
      if (!D.product.trim() && !D.headline?.trim() && !D.details.trim()) return toast('ใส่ชื่อสินค้าหรือรายละเอียดอย่างน้อย 1 อย่าง');
      D.step = 3; drawStep();
    };
  } else if (s === 3) {
    const saved = ME.hashtags || [];
    stepShell(`<h1 style="font-size:22px">แคปชั่นโทนไหน?</h1>
      <p class="muted">AI เขียนให้ 4 แบบ: Facebook, Instagram, TikTok, Shopee${D.link ? ' พร้อมใส่ลิงก์' : ''}</p>
      ${chipRow(CAT.tones, D.tone || CAT.tones[0], 'tone', false)}
      <section style="display:flex;flex-direction:column;gap:10px"><div class="row between"><h2>แฮชแท็กประจำ</h2><a href="#tags" style="font-size:14px">จัดการ</a></div>
        ${saved.length ? chipRow(saved, D.hashtags, 'hashtags', true) : '<p class="muted">ยังไม่มีแฮชแท็กประจำ</p>'}</section>
      <label class="f" for="extraTags">แท็กเพิ่มเฉพาะงานนี้<input id="extraTags" type="text" placeholder="#โปรเดือนนี้ #ของมันต้องมี" value="${esc(D.extraTags)}"></label>
      <span class="muted">AI จะเติมแท็กที่เกี่ยวข้องให้อีก 5–8 แท็ก</span>`);
    if (!D.tone) D.tone = CAT.tones[0];
    bindChips(['hashtags']);
    $('#next').onclick = () => { readInputs(['extraTags']); D.step = 4; drawStep(); };
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

const payload = () => ({ ...D, hashtags: [...D.hashtags, ...String(D.extraTags || '').split(/[\s,]+/).filter(Boolean)] });
async function reviewStep() {
  stepShell('<p class="muted">กำลังคำนวณ…</p>', { next: 'ยืนยัน', disabled: true });
  const qt = await api('api/works/quote', { method: 'POST', body: payload() });
  const st = CAT.styles.find((x) => x.id === D.style);
  const tier = CAT.tiers.find((t) => t.id === D.tier);
  const goal = CAT.goals.find((g) => g.id === D.goal);
  const row = (k, v) => v ? `<div><span class="muted">${k}</span><span style="text-align:right">${esc(v)}</span></div>` : '';
  const label = qt.blocked ? 'สร้างไม่ได้' : qt.free ? 'ยืนยัน สร้างภาพฟรี' : qt.enough ? `ยืนยัน สร้าง · ${qt.cost} ดาว` : 'ดาวไม่พอ · เติมดาว';
  stepShell(`<h1 style="font-size:22px">ทบทวนก่อนสร้าง</h1>
    ${qt.blocked ? `<p role="alert" class="card" style="background:var(--bad-bg);color:var(--bad)">${esc(qt.blocked)}</p>` : ''}
    ${qt.warnings.length ? `<p role="alert" class="card" style="background:var(--warn-bg);color:var(--warn)">ระวังผิดกฎ อย./โฆษณาเกินจริง: ${esc(qt.warnings.join(', '))} · AI จะเลี่ยงคำเหล่านี้ในแคปชั่น แนะนำแก้ข้อความบนภาพ</p>` : ''}
    <div class="list kv">
      ${row('เป้าหมาย', goal.label)}${row('ลิงก์', D.link)}${row('แนวภาพ', st.label)}${row('สินค้า', D.product)}${row('ข้อความบนภาพ', D.headline)}${row('ราคา/โปร', D.price)}
      ${row('คอนเซปต์', D.concepts.join(', '))}${row('ขนาด', D.ratio)}${row('ภาพสินค้าจริง', REFS.length ? `${REFS.length} รูป` : D.fromWork ? 'จากงานเดิม' : '')}
      ${row('โลโก้', D.useLogo && ME.brand?.logo ? 'ใส่มุมขวาบน' : '')}${row('โทนแคปชั่น', D.tone)}${row('แฮชแท็ก', payload().hashtags.join(' '))}
      ${row('คุณภาพ', `${tier.label} ${tier.size} × ${qt.versions} แบบ`)}
    </div>
    <section class="hero"><div class="row between"><span class="muted" style="font-weight:600">${qt.free ? 'ใช้ภาพฟรี' : 'ดาวที่ใช้'}</span>
      <b class="num" style="font-size:28px">${qt.free ? 'ฟรี' : `${ICON.star.replace('17', '24').replace('17', '24')} ${qt.cost}`}</b></div>
      <span class="muted">${qt.free ? `ภาพฟรีเหลือ ${qt.freeLeft.today + qt.freeLeft.welcome} ภาพ · มีลายน้ำเล็กๆ` : `ยอดคงเหลือหลังสร้าง ${num(qt.stars - qt.cost)} ดาว`} · สร้างไม่สำเร็จคืนให้อัตโนมัติ</span></section>
    <p class="muted">ใช้เวลาประมาณ 20–60 วินาที · ไฟล์เก็บบนเซิร์ฟเวอร์ ${CAT.keepDays} วัน ดาวน์โหลดเก็บไว้ด้วย</p>`, { next: label, nextId: 'go', disabled: !!qt.blocked });
  $('#go').onclick = async () => {
    if (!qt.free && !qt.enough) return go('topup');
    const b = $('#go'); b.disabled = true; b.textContent = 'กำลังส่งงาน…';
    const fd = new FormData(); fd.append('data', JSON.stringify(payload())); REFS.forEach((f) => fd.append('refs', f));
    try {
      const r = await api('api/works', { method: 'POST', body: fd });
      ME = r.me; CAT = null; D = null; REFS = []; try { sessionStorage.removeItem('mr_draft'); } catch {}
      go(`work?id=${r.id}`);
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = label; }
  };
}

// ---------- ผลงานของฉัน ----------
const PLAT = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['shopee', 'Shopee'], ['lazada', 'Lazada'], ['line', 'LINE']];
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 864e5));
const WSTAT = { queued: ['รอคิว', 'b-lime'], working: ['กำลังสร้าง', 'b-lime'], done: ['เสร็จแล้ว', 'b-ok'], failed: ['ไม่สำเร็จ', 'b-warn'] };
async function worksView() {
  app.innerHTML = `${topbar()}<main><div class="row between"><h1 style="font-size:22px">ผลงานของฉัน</h1><a class="btn sm" href="#create?new=1">+ สร้าง</a></div>
    <div id="wl" class="grid2"><p class="muted">กำลังโหลด…</p></div></main>${nav('works')}`;
  const { items } = await api('api/works');
  if (!items.length) { $('#wl').outerHTML = `<div class="soon card"><h2>ยังไม่มีผลงาน</h2><p class="muted">สร้างภาพแรกได้เลย มีภาพฟรีให้ ${ME.freeImages.today + ME.freeImages.welcome} ภาพ</p><a class="btn" href="#create?new=1">สร้างภาพแรก</a></div>`; return; }
  $('#wl').innerHTML = items.map((w) => `<a class="wcard" href="#work?id=${w.id}">
    <div class="wthumb">${w.files[0] ? `<img src="${w.files[0].thumb}" alt="" loading="lazy">` : `<span class="muted">${w.purged ? 'ไฟล์ถูกลบแล้ว' : WSTAT[w.status]?.[0] || ''}</span>`}
      ${w.files.length > 1 ? `<span class="cnt">${w.files.length}</span>` : ''}</div>
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
      <div class="spin" aria-hidden="true"></div><h2>${w.status === 'queued' ? 'รอคิวสร้าง…' : 'AI กำลังสร้างภาพ…'}</h2>
      <p class="muted">${esc(w.styleLabel)} · ${w.versions} แบบ · ประมาณ 20–60 วินาที<br>ออกจากหน้านี้ได้ เสร็จแล้วดูที่เมนูผลงาน</p></section>`;
    const t0 = Date.now();
    const poll = async () => {
      if (location.hash !== `#work?id=${id}`) return;
      try { w = await api(`api/works/${id}`); } catch { return; }
      if (['queued', 'working'].includes(w.status)) return setTimeout(poll, Date.now() - t0 > 60000 ? 5000 : 2500);
      ME = await api('api/me').catch(() => ME);
      workView(qs);
    };
    setTimeout(poll, 2500);
    return;
  }
  if (w.status === 'failed') {
    $('main').innerHTML = `<section class="card" style="background:var(--bad-bg)"><b style="color:var(--bad)">สร้างไม่สำเร็จ</b><span>${esc(w.error)}</span></section>
      <button type="button" class="btn" id="again">ลองใหม่ (แก้รายละเอียดได้)</button><button type="button" class="btn ghost" id="del">ลบรายการนี้</button>`;
  } else {
    const caps = PLAT.slice(0, 4).filter(([k]) => w.captions?.[k]);
    const tags = (w.hashtags || []).join(' ');
    $('main').innerHTML = `
      ${w.purged ? `<section class="card"><b>ไฟล์ถูกลบจากเซิร์ฟเวอร์แล้ว</b><span class="muted">ครบ ${CAT?.keepDays || 7} วัน · แคปชั่นยังคัดลอกได้ · กด "สร้างแบบนี้อีก" เพื่อทำใหม่</span></section>`
        : `<div class="gallery">${w.files.map((f, i) => `<figure><img src="${f.url}" alt="ภาพที่ ${i + 1}" width="${f.w}" height="${f.h}">
          <figcaption class="grid2"><button type="button" class="btn sm" data-save="${i}">บันทึกลงเครื่อง</button><a class="btn dark sm" href="${f.url}?dl=1" download>ดาวน์โหลด</a></figcaption></figure>`).join('')}</div>
        <p class="muted">ไฟล์อยู่บนเซิร์ฟเวอร์อีก ${daysLeft(w.expiresAt)} วัน · ${w.free ? 'ภาพฟรี (มีลายน้ำ)' : `ใช้ ${w.cost} ดาว`}</p>`}
      ${caps.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h2>แคปชั่น</h2>
        <div class="chips" role="tablist">${caps.map(([k, l], i) => `<button type="button" class="chip" role="tab" data-cap="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>
        <textarea id="cap" rows="7" aria-label="แคปชั่น">${esc(w.captions[caps[0][0]] + (tags ? '\n\n' + tags : ''))}</textarea>
        <button type="button" class="btn dark" id="copyCap">คัดลอกแคปชั่น + แฮชแท็ก</button></section>` : ''}
      <section class="card"><b>โพสต์ไปที่ไหนแล้ว</b><span class="muted">ติ๊กไว้ จะได้รู้ว่างานไหนโพสต์แล้ว (โพสต์ตรงจากแอปจะเปิดเร็วๆ นี้)</span>
        <div class="chips">${PLAT.map(([k, l]) => `<button type="button" class="chip" data-post="${k}" aria-pressed="${!!w.posted?.[k]}">${l}${w.posted?.[k] ? ' · ' + new Date(w.posted[k]).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''}</button>`).join('')}</div></section>
      <div id="wstats"></div>
      ${w.purged ? '' : '<button type="button" class="btn dark" id="toDrive">ส่งเข้า Google Drive</button>'}
      <div class="list">${historyRows(w)}</div>
      <button type="button" class="btn" id="again">สร้างแบบนี้อีก</button>
      <button type="button" class="btn ghost" id="del">ลบผลงานนี้</button>`;
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
    D = { ...newDraft(), goal: p.goal, link: p.link, style: w.style, product: p.product, price: p.price, headline: p.headline, details: p.details, concepts: p.concepts || [], ratio: p.ratio, useLogo: p.useLogo, showShop: p.showShop, tone: p.tone, hashtags: p.hashtags || [], tier: w.tier, versions: w.versions, fromWork: w.id, step: 2 };
    REFS = []; saveDraft(); go('create');
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
    const file = new File([blob], `mcrich-${w.id}-${i + 1}.jpg`, { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      api(`api/works/${w.id}/event`, { method: 'POST', body: { t: 'share', n: i } }).catch(() => {});
      return;
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  location.href = `${f.url}?dl=1`;
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
fetch('api/config').then((r) => r.json()).then((c) => { CFG = c; }).catch(() => {}).finally(route);
