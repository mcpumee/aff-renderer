'use strict';
// AFF Studio — หน้าเว็บ (ไม่มีขั้น build ใช้ JS ธรรมดา)
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

async function api(path, opts = {}) {
  const o = { credentials: 'same-origin', ...opts };
  if (o.body && !(o.body instanceof FormData)) { o.headers = { 'content-type': 'application/json' }; o.body = JSON.stringify(o.body); }
  const r = await fetch('api/' + path, o);
  if (r.status === 401) { renderLogin(); throw new Error('login'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'เกิดข้อผิดพลาด');
  return j;
}
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  toast('คัดลอกแล้ว ✓');
}

const ICON = {
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  list: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  up: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1A4FC4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  dl: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
};

const TYPES = {
  box: { name: 'กล่องระเบิด', sub: 'สั้น 20–30 วิ · เน้นรีวิว', cost: '~ฟรี', ready: true,
    needs: [['แคปรีวิว 2–3 รูป', 'req'], ['รูปสินค้า (รูปหลักพื้นเรียบ)', 'req'], ['แคปหน้าสินค้า', 'rec']] },
  long: { name: 'รีวิวยาว', sub: '1–2 นาที · เร็วๆ นี้', cost: '~$1.3', ready: false, needs: [] },
  self: { name: 'ถ่ายเอง', sub: 'ตัดสั้น + ยาว · เร็วๆ นี้', cost: '~ฟรี', ready: false, needs: [] },
  story: { name: 'เรื่องเล่า', sub: 'หนังสั้น · เร็วๆ นี้', cost: '~$4–6', ready: false, needs: [] },
};
const TAG = { req: ['จำเป็น', 'req'], rec: ['แนะนำ', 'rec'], opt: ['ไม่บังคับ', 'opt'], no: ['ไม่ใช้', 'no'] };
const KIND = { product: 'รูปสินค้า', review: 'แคปรีวิว', page: 'แคปหน้าสินค้า', other: 'ไม่ใช้', unsorted: 'ยังไม่แยก', video: 'คลิป' };
const PLATFORMS = [['tiktok', 'TikTok'], ['shopee', 'Shopee Video'], ['facebook', 'Facebook Reels'], ['instagram', 'Instagram Reels']];
const RUNNING = ['analyzing', 'scripting', 'voicing', 'rendering'];
const STATUS = {
  draft: ['ร่าง', 'st-wait'], analyzing: ['AI กำลังอ่านรูป', 'st-run'], ready: ['รอเขียนบท', 'st-wait'], scripting: ['AI กำลังเขียนบท', 'st-run'],
  script: ['รออนุมัติบท', 'st-wait'], voicing: ['กำลังทำเสียงพากย์', 'st-run'], rendering: ['กำลังตัดต่อ', 'st-run'], done: ['เสร็จแล้ว', 'st-done'], failed: ['ไม่สำเร็จ', 'st-failed'],
};

function nav(cur) {
  return `<nav class="bottom" aria-label="เมนูหลัก">
    <a href="#/new" ${cur === 'new' ? 'aria-current="page"' : ''}>${ICON.plus}สร้างงาน</a>
    <a href="#/jobs" ${cur === 'jobs' ? 'aria-current="page"' : ''}>${ICON.list}คิวงาน & คลิป</a>
  </nav>`;
}

// ---------- ล็อกอิน ----------
function renderLogin() {
  stopPoll();
  app.innerHTML = `<div class="login"><form id="lf">
    <span class="eyebrow">AFF STUDIO</span><h1>เข้าสู่ระบบ</h1>
    <label class="f" for="pw">รหัสผ่าน<input id="pw" type="password" autocomplete="current-password" required></label>
    <button class="btn primary" type="submit">เข้าสู่ระบบ</button>
    <p class="muted" id="lerr" role="alert"></p></form></div>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('login', { method: 'POST', body: { password: $('#pw').value } }); location.hash = '#/jobs'; route(); }
    catch (err) { if (err.message !== 'login') $('#lerr').textContent = err.message; }
  };
}

// ---------- สร้างงาน ----------
let newType = 'box';
function renderNew() {
  stopPoll();
  const t = TYPES[newType];
  app.innerHTML = `<div class="wrap">
    <header class="top"><div><span class="eyebrow">AFF STUDIO</span><h1>สร้างงานใหม่</h1></div></header>
    <section class="card"><h2>1. แบบคลิป</h2>
      <div class="grid2">${Object.entries(TYPES).map(([k, v]) => `<button type="button" class="type" data-t="${k}" aria-pressed="${k === newType}" ${v.ready ? '' : 'disabled'}><b>${v.name}</b><span>${v.sub}</span><em>${v.cost}</em></button>`).join('')}</div>
      <div class="needs"><span class="t">แบบ "${t.name}" ใช้อะไรบ้าง</span>
        ${t.needs.map(([l, r]) => `<div class="row between"><span>${l}</span><span class="tag ${TAG[r][1]}">${TAG[r][0]}</span></div>`).join('')}</div>
    </section>
    <section class="card"><h2>2. ลิงก์ + รูปทั้งหมด</h2>
      <label class="f" for="link">ลิงก์ Affiliate<input id="link" type="url" placeholder="วางลิงก์ Shopee / TikTok / Lazada"></label>
      <label class="drop" for="files">${ICON.up}<b>อัปรูปทั้งหมดรวมกันได้เลย</b><span>แคปหน้าสินค้า · รูปสินค้า · แคปรีวิว<br>ปนกันได้ AI จะแยกให้เอง</span></label>
      <input id="files" type="file" accept="image/*" multiple class="hide">
      <p class="muted" id="nmsg"></p>
    </section></div>${nav('new')}`;
  app.querySelectorAll('.type').forEach((b) => { b.onclick = () => { newType = b.dataset.t; renderNew(); }; });
  $('#files').onchange = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    $('#nmsg').innerHTML = '<span class="row"><span class="spin"></span>กำลังอัป ' + files.length + ' รูป…</span>';
    try {
      const job = await api('jobs', { method: 'POST', body: { type: newType, link: $('#link').value.trim() } });
      await uploadFiles(job.id, files);
      await api(`jobs/${job.id}/analyze`, { method: 'POST' });
      location.hash = '#/job/' + job.id;
    } catch (err) { if (err.message !== 'login') $('#nmsg').textContent = err.message; }
  };
}
async function uploadFiles(id, files) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  return api(`jobs/${id}/files`, { method: 'POST', body: fd });
}

// ---------- คิวงาน & ประวัติ ----------
let filter = 'all';
async function renderJobs() {
  stopPoll();
  app.innerHTML = `<div class="wrap"><header class="top"><h1>คิวงาน & คลิป</h1></header><div class="row"><span class="spin"></span>กำลังโหลด…</div></div>${nav('jobs')}`;
  const { jobs, stats } = await api('jobs');
  const F = { all: ['ทั้งหมด', () => true], run: ['กำลังทำ / รออนุมัติ', (j) => j.status !== 'done'],
    tiktok: ['ยังไม่ลง TikTok', (j) => j.status === 'done' && !j.posted.tiktok], shopee: ['ยังไม่ลง Shopee', (j) => j.status === 'done' && !j.posted.shopee] };
  const list = jobs.filter(F[filter][1]);
  app.innerHTML = `<div class="wrap">
    <header class="top"><h1>คิวงาน & คลิป</h1><a class="btn sm dark" href="#/new">+ สร้างงาน</a></header>
    <div class="stats"><div><span>งานเดือนนี้</span><b>${stats.month}</b></div><div><span>คลิปเสร็จ</span><b>${stats.done}</b></div><div><span>ลงแล้ว</span><b>${stats.posted}</b></div></div>
    <div class="chips" role="group" aria-label="ตัวกรอง" style="margin-bottom:12px">${Object.entries(F).map(([k, v]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="${k === filter}">${v[0]}</button>`).join('')}</div>
    ${list.length ? list.map(item).join('') : '<p class="muted">ยังไม่มีงานในกลุ่มนี้</p>'}
  </div>${nav('jobs')}`;
  app.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { filter = b.dataset.f; renderJobs(); }; });
  if (jobs.some((j) => RUNNING.includes(j.status))) startPoll(() => { if (location.hash.startsWith('#/jobs')) renderJobs(); }, 8000);
}
function item(j) {
  const st = STATUS[j.status] || ['', ''];
  const pic = j.clip?.snapshot || (j.files.find((f) => f.name === j.hero) || j.files[0] || {}).url || '';
  return `<a class="item" href="#/job/${j.id}">
    <div class="pic" style="background-image:url('${esc(pic)}')"></div>
    <div class="meta"><div class="row between"><span class="name">${esc(j.code)} · ${esc(j.product?.name || 'ยังไม่มีชื่อสินค้า')}</span></div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><span class="status ${st[1]}">${st[0]}</span><span class="muted">${TYPES[j.type]?.name || ''} · ${new Date(j.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span></div>
      ${j.status === 'done' ? `<div class="pf">${PLATFORMS.map(([k, l]) => `<span class="${j.posted[k] ? 'on' : ''}">${l.split(' ')[0]}${j.posted[k] ? ' ✓' : ''}</span>`).join('')}</div>` : ''}
    </div></a>`;
}

// ---------- หน้างาน ----------
let curJob = null;
async function renderJob(id) {
  stopPoll();
  if (!curJob || curJob.id !== id) app.innerHTML = `<div class="wrap"><div class="row" style="padding:24px 0"><span class="spin"></span>กำลังโหลด…</div></div>${nav('jobs')}`;
  curJob = await api('jobs/' + id);
  drawJob();
}
function drawJob() {
  const j = curJob;
  const st = STATUS[j.status] || ['', ''];
  const groups = ['page', 'product', 'review', 'other', 'unsorted'];
  const byKind = (k) => j.files.filter((f) => f.kind === k);
  const P = j.product || {};
  const S = j.script || null;
  const busy = RUNNING.includes(j.status);
  const pf = (k) => (j.src && j.src[k] ? `<small>${j.src[k] === 'link' ? 'จากลิงก์' : 'จากรูป'}</small>` : '');
  app.innerHTML = `<div class="wrap">
    <header class="top" style="justify-content:flex-start"><a class="back" href="#/jobs" aria-label="กลับ">${ICON.back}</a>
      <div style="flex-grow:1;min-width:0"><span class="eyebrow">${esc(j.code)} · ${TYPES[j.type]?.name || ''}</span><h1 style="font-size:22px">${esc(P.name || 'งานใหม่')}</h1></div>
      <span class="status ${st[1]}">${st[0]}</span></header>

    ${j.error ? `<div class="note bad" role="alert" style="margin-bottom:14px">${esc(j.error)}</div>` : ''}
    ${busy ? `<div class="card"><div class="row"><span class="spin"></span><b>${st[0]}…</b></div>${j.status === 'rendering' ? '<div class="bar"><i id="pbar" style="width:3%"></i></div><span class="muted" id="ptext">ตัดต่อคลิปละประมาณ 3–6 นาที</span>' : '<span class="muted">หน้านี้จะอัปเดตเอง ปิดไปทำอย่างอื่นก่อนได้</span>'}</div>` : ''}

    ${j.status === 'done' ? doneBlock(j) : ''}

    <details class="card" ${j.status === 'done' ? '' : 'open'}><summary><h2 style="display:inline">รูป (${j.files.length}) · ลิงก์</h2></summary>
      <label class="f" for="jlink">ลิงก์ Affiliate<input id="jlink" type="url" value="${esc(j.link)}" placeholder="วางลิงก์ Shopee / TikTok / Lazada"></label>
      ${groups.map((k) => { const fs = byKind(k); if (!fs.length && !['product', 'review'].includes(k)) return '';
        return `<div class="group ${k === 'other' ? 'off' : ''}"><h3><span>${KIND[k]} · ${fs.length}</span>${k === 'product' ? '<span class="muted">แตะ "ตั้งเป็นรูปหลัก"</span>' : ''}</h3>
        <div class="grid3">${fs.map((f) => thumb(j, f)).join('')}</div></div>`; }).join('')}
      <label class="btn" for="more">+ เพิ่มรูป</label><input id="more" type="file" accept="image/*" multiple class="hide">
      ${j.files.length && !busy ? `<button type="button" class="btn ghost" id="reanalyze">ให้ AI อ่านรูปใหม่</button>` : ''}
    </details>

    ${['ready', 'script', 'done', 'failed', 'scripting', 'voicing', 'rendering'].includes(j.status) || P.name ? `
    <details class="card" ${j.status === 'done' ? '' : 'open'}><summary><h2 style="display:inline">ข้อมูลสินค้า (แก้ได้ทุกช่อง)</h2></summary>
      <label class="f" for="p_name">ชื่อสินค้า ${pf('name')}<input id="p_name" data-p="name" type="text" value="${esc(P.name)}"></label>
      <div class="grid2">
        <label class="f" for="p_price">ราคา ${pf('price')}<input id="p_price" data-p="price" type="text" value="${esc(P.price)}" placeholder="฿"></label>
        <label class="f" for="p_shop">ร้านค้า ${pf('shop')}<input id="p_shop" data-p="shop" type="text" value="${esc(P.shop)}"></label>
        <label class="f" for="p_rating">คะแนนดาว<input id="p_rating" data-p="rating" type="text" value="${esc(P.rating)}"></label>
        <label class="f" for="p_sold">ขายแล้ว<input id="p_sold" data-p="sold" type="text" value="${esc(P.sold)}"></label>
      </div>
      <label class="f" for="p_features">จุดเด่นสินค้า<textarea id="p_features" data-p="features" rows="3">${esc(P.features)}</textarea></label>
      ${reviewBox(j.reviews)}
      <label class="f" for="extra">ข้อมูลเพิ่ม / โปร (ไม่บังคับ)<textarea id="extra" rows="2">${esc(j.extra)}</textarea></label>
      <div class="chips" role="group" aria-label="ความยาว">${['20 วิ', '30 วิ'].map((l) => `<button type="button" class="chip" data-len="${l}" aria-pressed="${j.length === l}">${l}</button>`).join('')}</div>
      ${!busy && j.status !== 'done' ? `<button type="button" class="btn ${S ? '' : 'primary'} block" id="doScript">${S ? 'ให้ AI เขียนบทใหม่' : 'ให้ AI เขียนบท →'}</button><p class="muted" style="margin:0;text-align:center">ขั้นเขียนบทยังไม่เสียค่าเสียงหรือวิดีโอ</p>` : ''}
    </details>` : ''}

    ${S && j.status !== 'done' ? scriptBlock(j) : ''}
    <button type="button" class="btn ghost" id="delJob" style="margin:8px 0 24px">ลบงานนี้</button>
  </div>${nav('jobs')}`;
  bindJob();
  if (busy) startPoll(pollJob, 3000);
}
function thumb(j, f) {
  return `<div class="thumb ${j.hero === f.name ? 'hero' : ''}"><img src="${esc(f.url)}" alt="${KIND[f.kind] || ''}" loading="lazy">
    <select aria-label="ย้ายกลุ่มรูป" data-kind="${f.name}">${['product', 'review', 'page', 'other'].map((k) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${KIND[k]}</option>`).join('')}</select>
    <button type="button" class="x" data-del="${f.name}" aria-label="ลบรูป">×</button>
    ${f.kind === 'product' ? `<button type="button" class="hb" data-hero="${f.name}">${j.hero === f.name ? 'รูปหลัก ✓' : 'ใช้เป็นหลัก'}</button>` : ''}</div>`;
}
function reviewBox(rv) {
  if (!rv || (!rv.pros?.length && !rv.cons?.length)) return '';
  const li = (a) => a.map((x) => `<li>${esc(x)}</li>`).join('');
  return `<div class="note info"><b>AI สรุปรีวิว</b>${rv.pros?.length ? `<div>ข้อดี</div><ul style="margin:4px 0 6px;padding-left:20px">${li(rv.pros)}</ul>` : ''}${rv.cons?.length ? `<div>ข้อสังเกต</div><ul style="margin:4px 0;padding-left:20px">${li(rv.cons)}</ul>` : ''}</div>`;
}
function capText(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  return [c.caption || '', (c.hashtags || []).join(' ')].filter(Boolean).join('\n');
}
function scriptBlock(j) {
  const S = j.script;
  return `<section class="card"><h2>บทพากย์ (แก้ได้)</h2>
    <label class="f" for="s_vo">เสียงพากย์ทั้งคลิป<textarea id="s_vo" data-s="voiceover" rows="7">${esc(S.voiceover)}</textarea></label>
    <div class="grid2">
      <label class="f" for="s_price">ป้ายราคา<input id="s_price" data-s="price" type="text" value="${esc(S.price || j.product?.price)}"></label>
      <label class="f" for="s_cta">ข้อความตอนจบ<input id="s_cta" data-s="cta" type="text" value="${esc(S.cta || 'กดตะกร้าได้เลย')}"></label>
    </div>
    <p class="muted" style="margin:0">ขึ้นต้นเสียงด้วย "ระเบิดกล่องสินค้า แนะนำ!" ให้อัตโนมัติ ตรงจังหวะกล่องระเบิด</p>
    ${j.status === 'script' || j.status === 'failed' ? `<button type="button" class="btn primary block" id="doRender">อนุมัติ & สร้างคลิป</button><p class="muted" style="margin:0;text-align:center">ค่าเสียงพากย์ประมาณ $0.03 · ตัดต่อฟรีบนเซิร์ฟเวอร์</p>` : ''}
  </section>${captionsBlock(j)}`;
}
function captionsBlock(j) {
  const C = j.script?.captions || {};
  return `<section class="card"><h2>แคปชันแยกแพลตฟอร์ม</h2>
    ${PLATFORMS.map(([k, l]) => `<div class="cap"><div class="row between"><b>${l}</b><button type="button" class="btn sm dark" data-copy="cap_${k}">คัดลอก</button></div>
      <label class="hide" for="cap_${k}">แคปชัน ${l}</label><textarea id="cap_${k}" data-cap="${k}">${esc(capText(C[k]))}</textarea></div>`).join('')}
  </section>`;
}
function doneBlock(j) {
  return `<section class="card">
    <video src="${esc(j.clip.url)}" poster="${esc(j.clip.snapshot || '')}" controls playsinline preload="metadata"></video>
    <div class="grid2"><a class="btn dark" href="${esc(j.clip.url)}" download>${ICON.dl}ดาวน์โหลด</a><button type="button" class="btn" id="remake">แก้บทแล้วทำใหม่</button></div>
  </section>
  <section class="card"><h2>คัดลอกสำหรับติดตะกร้า</h2>
    <div class="row"><span style="flex-grow:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(j.product?.name || '-')}</span><button type="button" class="btn sm" data-copytext="${esc(j.product?.name || '')}">คัดลอกชื่อ</button></div>
    <div class="row"><span class="muted" style="flex-grow:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(j.link || 'ยังไม่ได้ใส่ลิงก์')}</span><button type="button" class="btn sm" data-copytext="${esc(j.link || '')}" ${j.link ? '' : 'disabled'}>คัดลอกลิงก์</button></div>
  </section>
  <section class="card"><h2>ลงแล้วที่ไหนบ้าง</h2>
    ${PLATFORMS.map(([k, l]) => `<div class="post"><input type="checkbox" id="po_${k}" data-post="${k}" ${j.posted[k] ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent)"><label class="lb" for="po_${k}"><b>${l}</b><span>${j.posted[k] ? 'ลงแล้ว ✓' : 'ยังไม่ลง · ดาวน์โหลด + คัดลอกแคปชันแล้วโพสต์ในแอป'}</span></label></div>`).join('')}
    <p class="muted" style="margin:0">ปุ่มโพสต์อัตโนมัติ FB/IG/TikTok จะมาในเฟส 2</p>
  </section>${captionsBlock(j)}`;
}

let saveT;
function patch(body, quiet) {
  clearTimeout(saveT);
  saveT = setTimeout(async () => { try { curJob = await api('jobs/' + curJob.id, { method: 'PATCH', body }); if (!quiet) toast('บันทึกแล้ว'); } catch (e) { toast(e.message); } }, 400);
}
function bindJob() {
  const j = curJob;
  const on = (sel, ev, fn) => app.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
  on('#jlink', 'change', (e) => patch({ link: e.target.value.trim() }));
  on('[data-p]', 'change', (e) => patch({ product: { [e.target.dataset.p]: e.target.value } }));
  on('#extra', 'change', (e) => patch({ extra: e.target.value }));
  on('[data-s]', 'change', (e) => patch({ script: { [e.target.dataset.s]: e.target.value } }));
  on('[data-cap]', 'change', (e) => patch({ script: { captions: { ...(curJob.script?.captions || {}), [e.target.dataset.cap]: e.target.value } } }));
  on('[data-len]', 'click', async (e) => { curJob = await api('jobs/' + j.id, { method: 'PATCH', body: { length: e.target.dataset.len } }); drawJob(); });
  on('[data-kind]', 'change', async (e) => { curJob = await api('jobs/' + j.id, { method: 'PATCH', body: { kinds: { [e.target.dataset.kind]: e.target.value } } }); drawJob(); });
  on('[data-hero]', 'click', async (e) => { curJob = await api('jobs/' + j.id, { method: 'PATCH', body: { hero: e.target.dataset.hero } }); drawJob(); });
  on('[data-del]', 'click', async (e) => { curJob = await api(`jobs/${j.id}/files/${e.target.dataset.del}`, { method: 'DELETE' }); drawJob(); });
  on('[data-copy]', 'click', (e) => copy($('#' + e.target.dataset.copy).value));
  on('[data-copytext]', 'click', (e) => copy(e.target.dataset.copytext));
  on('[data-post]', 'change', (e) => patch({ posted: { [e.target.dataset.post]: e.target.checked } }));
  on('#more', 'change', async (e) => { if (!e.target.files.length) return; toast('กำลังอัป…'); curJob = await uploadFiles(j.id, [...e.target.files]); drawJob(); });
  on('#reanalyze', 'click', async () => { curJob = await api(`jobs/${j.id}/analyze`, { method: 'POST' }); drawJob(); });
  on('#doScript', 'click', async () => {
    const product = {}; app.querySelectorAll('[data-p]').forEach((el) => { product[el.dataset.p] = el.value; });
    curJob = await api(`jobs/${j.id}/script`, { method: 'POST', body: { product, extra: $('#extra')?.value || '' } }); drawJob();
  });
  on('#doRender', 'click', async () => {
    const script = {}; app.querySelectorAll('[data-s]').forEach((el) => { script[el.dataset.s] = el.value; });
    curJob = await api(`jobs/${j.id}/render`, { method: 'POST', body: { script } }); drawJob();
  });
  on('#remake', 'click', async () => { curJob = await api('jobs/' + j.id, { method: 'PATCH', body: {} }); curJob.status = 'script'; drawJobScriptOnly(); });
  on('#delJob', 'click', async () => { if (!window.confirm('ลบงานนี้และไฟล์ทั้งหมด?')) return; await api('jobs/' + j.id, { method: 'DELETE' }); location.hash = '#/jobs'; });
}
function drawJobScriptOnly() { curJob = { ...curJob, status: 'script', clip: null }; drawJob(); }

let pollT = null;
function startPoll(fn, ms) { stopPoll(); pollT = setInterval(fn, ms); }
function stopPoll() { clearInterval(pollT); pollT = null; }
async function pollJob() {
  if (!curJob || !location.hash.startsWith('#/job/')) return stopPoll();
  try {
    const j = await api('jobs/' + curJob.id);
    if (j.status !== curJob.status) { curJob = j; drawJob(); return; }
    if (j.status === 'rendering') {
      const p = await api(`jobs/${curJob.id}/progress`);
      if (p.progress != null && $('#pbar')) { $('#pbar').style.width = Math.max(3, p.progress) + '%'; $('#ptext').textContent = `ตัดต่อแล้ว ${p.progress}%`; }
    }
  } catch { /* */ }
}

// ---------- เส้นทาง ----------
async function route() {
  const h = location.hash || '#/jobs';
  try {
    await api('me');
    if (h.startsWith('#/job/')) return await renderJob(h.slice(6));
    if (h.startsWith('#/new')) return renderNew();
    return await renderJobs();
  } catch (e) { if (e.message !== 'login') { app.innerHTML = `<div class="wrap"><p class="note bad">${esc(e.message)}</p><a class="btn" href="#/jobs">กลับ</a></div>`; } }
}
window.addEventListener('hashchange', route);
route();
