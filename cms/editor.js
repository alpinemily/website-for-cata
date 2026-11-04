// Hi Vibes Supply — local visual CMS (editing layer).
// Loaded only by cms/server.js; never deployed.
(() => {
  'use strict';

  const PAGE = (location.pathname.replace(/^\//, '') || 'index.html').replace(/\/$/, '/index.html');
  const API = '/__cms/api';

  // Text-bearing elements that can be edited in place.
  const TEXT_SEL = [
    'h1', 'h2', 'h3', 'h4', 'p', 'li', 'summary', 'blockquote', 'cite', 'dt', 'dd', 'label', 'small',
    '.label', '.logo', 'a', 'button', '.date', '.thumb span', '.marquee span', '.footer-bottom > span',
  ].join(',');
  // Blocks that repeat and can be duplicated / moved / deleted.
  const REPEAT_SEL = [
    '.trio > div', '.thumbs > .thumb', '.events > .event', '.faq > details', '.lines > li', '.duo > div',
    '.nav li', '.site-footer li', '.footer-grid > div', '.marquee span', '.hero-actions > a', '.contact-info dd',
    '.form .row > div', '.feature-body > p', '.feature-body > .btn', '.hero .wrap > p', '.hero .wrap > .btn',
  ].join(',');
  const SECTION_SEL = 'main > section, main > div';

  const TEMPLATES = {
    'Hero': `<section class="hero"><div class="wrap reveal"><span class="label">label</span><h1>Headline here</h1><p>A short supporting sentence.</p><a class="btn" href="contact.html">Button text</a></div></section>`,
    'Text': `<section class="section"><div class="wrap narrow reveal"><h2>Section heading</h2><p>Write a paragraph here.</p></div></section>`,
    'Text + image': `<section class="section"><div class="wrap"><div class="feature reveal"><div class="feature-grid"><div class="feature-aside"><span class="label">label</span><img src="assets/img/blob-1.svg" alt="" width="800" height="1000" loading="lazy"></div><div class="feature-body"><h2>Section heading</h2><p>Write a paragraph here.</p><a class="btn" href="contact.html">Button text</a></div></div></div></div></section>`,
    'Cards (3)': `<section class="section"><div class="wrap"><div class="trio-head reveal"><h2>Section heading</h2></div><div class="trio reveal"><div><h3>Card one</h3><p>Short description.</p><a class="text-link" href="contact.html">Learn more</a></div><div><h3>Card two</h3><p>Short description.</p><a class="text-link" href="contact.html">Learn more</a></div><div><h3>Card three</h3><p>Short description.</p><a class="text-link" href="contact.html">Learn more</a></div></div></div></section>`,
    'Bullet list': `<section class="section"><div class="wrap narrow reveal"><h2>Section heading</h2><ul class="lines"><li>First point</li><li>Second point</li><li>Third point</li></ul></div></section>`,
    'FAQ': `<section class="section"><div class="wrap narrow reveal"><h2>Questions</h2><div class="faq"><details open><summary>A question?</summary><p>The answer.</p></details><details><summary>Another question?</summary><p>The answer.</p></details></div></div></section>`,
    'Events': `<section class="section section--sage"><div class="wrap"><div class="feature reveal"><span class="label">upcoming</span><ul class="events"><li class="event"><div class="date">Jan 1, 2027</div><div><h3>Event name</h3><p>Format · time</p></div><a class="text-link" href="contact.html">Register</a></li></ul></div></div></section>`,
    'Quote': `<section class="section statement"><div class="wrap reveal"><blockquote>A short quote</blockquote><a class="btn" href="contact.html">Button text</a></div></section>`,
    'Newsletter': `<section class="newsletter"><div class="wrap reveal"><h2>Newsletter heading</h2><p>An occasional letter with reflections and first word on new events.</p><form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" data-fallback="Newsletter sign-up"><label class="sr-only" for="nl-email">Email address</label><input id="nl-email" type="email" name="email" placeholder="Email Address" required><button class="btn btn--dark" type="submit">Sign Up</button></form></div></section>`,
  };

  // ---------- state ----------
  let editing = true;
  let selected = null;
  let dirty = false;
  let headerDirty = false;
  let footerDirty = false;
  const undoStack = [];
  let pages = [];
  let meta = { title: document.title, description: document.querySelector('meta[name="description"]')?.content || '' };

  // ---------- panel (shadow DOM keeps editor styles out of the site) ----------
  const host = document.createElement('cms-panel');
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; }
    .panel { position: fixed; top: 0; right: 0; bottom: 0; width: 340px; z-index: 2147483000; background: #16181a; color: #e8e8e6;
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(0,0,0,.25); }
    .panel.collapsed { width: 44px; }
    .panel.collapsed .body, .panel.collapsed .top .grow, .panel.collapsed .top .btns { display: none; }
    .top { padding: 12px; border-bottom: 1px solid #2a2d30; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .grow { flex: 1; min-width: 0; }
    .brand { font-weight: 700; letter-spacing: .02em; }
    .status { font-size: 11px; color: #9aa0a6; }
    .status.dirty { color: #f6c453; }
    .body { overflow-y: auto; flex: 1; padding: 4px 12px 24px; }
    h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #9aa0a6; margin: 18px 0 8px; font-weight: 600; }
    label { display: block; font-size: 12px; color: #c4c7c5; margin: 8px 0 4px; }
    input, select, textarea { width: 100%; background: #23262a; color: #fff; border: 1px solid #34383c; border-radius: 6px; padding: 7px 9px; font: inherit; }
    textarea { resize: vertical; min-height: 60px; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #d7f26b; }
    button { font: inherit; cursor: pointer; border-radius: 6px; border: 1px solid #34383c; background: #23262a; color: #e8e8e6; padding: 6px 10px; }
    button:hover { border-color: #6b7075; }
    button.primary { background: #d7f26b; color: #16181a; border-color: #d7f26b; font-weight: 600; }
    button.danger { color: #ff8a80; }
    button:disabled { opacity: .4; cursor: default; }
    .row { display: flex; gap: 6px; flex-wrap: wrap; }
    .row > * { flex: 1; }
    .hint { color: #9aa0a6; font-size: 12px; }
    .tag { display: inline-block; background: #2a2d30; border-radius: 4px; padding: 1px 6px; font-family: ui-monospace, monospace; font-size: 11px; }
    .thumb { width: 100%; max-height: 140px; object-fit: contain; background: #23262a; border-radius: 6px; margin-bottom: 6px; }
    .lib { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; max-height: 180px; overflow-y: auto; margin-top: 6px; }
    .lib img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid transparent; background: #23262a; }
    .lib img:hover { border-color: #d7f26b; }
    .toggle { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    .toggle input { width: auto; }
    pre { white-space: pre-wrap; background: #0e0f10; padding: 8px; border-radius: 6px; font-size: 11px; max-height: 200px; overflow: auto; }
    .toast { position: fixed; bottom: 16px; right: 356px; background: #d7f26b; color: #16181a; padding: 8px 14px; border-radius: 8px; font: 600 13px -apple-system, sans-serif; z-index: 2147483001; opacity: 0; transition: opacity .2s; pointer-events: none; }
    .toast.show { opacity: 1; }
    .toast.err { background: #ff8a80; }
    kbd { font-family: ui-monospace, monospace; font-size: 11px; background: #2a2d30; padding: 0 4px; border-radius: 3px; }
  </style>
  <div class="panel">
    <div class="top">
      <button class="collapse" title="Collapse panel">⇥</button>
      <div class="grow"><div class="brand">✺ Site editor</div><div class="status">All changes saved</div></div>
      <div class="btns row" style="flex: 0 0 100%">
        <button class="undo" title="Undo last block change">Undo</button>
        <button class="preview" title="Turn editing off to click links normally">Preview</button>
        <button class="save primary" title="Save (⌘S)">Save</button>
      </div>
    </div>
    <div class="body">
      <h3>Page</h3>
      <div class="row"><select class="pages"></select></div>
      <label>Browser tab title</label><input class="meta-title">
      <label>Search description</label><textarea class="meta-desc" rows="3"></textarea>
      <div class="row" style="margin-top:8px"><button class="new-page">+ New page</button><button class="delete-page danger">Delete page</button></div>

      <div class="sel"></div>

      <h3>Publish</h3>
      <p class="hint">Saves are local. Publish commits everything and pushes to GitHub, which redeploys the live site.</p>
      <button class="publish" style="width:100%">Publish to live site…</button>
      <div class="publog"></div>

      <h3>Tips</h3>
      <p class="hint">Click any text to edit it. Click an image to replace it. Select something to see its options here. <kbd>⌘S</kbd> saves. <kbd>Shift</kbd>+<kbd>Enter</kbd> adds a line break. Header and footer edits apply to every page.</p>
    </div>
  </div>
  <div class="toast"></div>`;

  const $ = (s) => root.querySelector(s);
  const panel = $('.panel');
  const statusEl = $('.status');
  const selBox = $('.sel');

  function toast(msg, err = false) {
    const t = $('.toast');
    t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), err ? 5000 : 2200);
  }

  function setDirty(el) {
    dirty = true;
    if (el?.closest?.('header.site-header')) headerDirty = true;
    if (el?.closest?.('footer.site-footer')) footerDirty = true;
    statusEl.textContent = 'Unsaved changes'; statusEl.classList.add('dirty');
  }
  function setClean() {
    dirty = headerDirty = footerDirty = false;
    statusEl.textContent = 'All changes saved'; statusEl.classList.remove('dirty');
  }

  function layout() {
    const w = panel.classList.contains('collapsed') ? 44 : 340;
    document.documentElement.style.setProperty('--cms-panel', `${w}px`);
    root.querySelector('.toast').style.right = `${w + 16}px`;
  }

  // ---------- making the page editable ----------
  function isEditableText(el) {
    if (!el.matches(TEXT_SEL)) return false;
    if (el.closest('.sr-only, svg, .socials, .menu-toggle')) return false;
    if (el.matches('a') && el.querySelector('img')) return false; // image links: edit the image + link instead
    if (el.matches('li') && el.querySelector(':scope > a, :scope > details, :scope > div, :scope > h3')) return false;
    if (el.matches('label') && el.querySelector('input,select,textarea')) return false;
    // Leaf only: skip if it contains another editable candidate.
    for (const c of el.querySelectorAll(TEXT_SEL)) if (!c.closest('svg') && !c.matches('[data-year]') && c !== el) {
      if (c.matches('a') && c.querySelector('img')) continue;
      return false;
    }
    return el.textContent.trim().length > 0 || el.matches('h1,h2,h3,h4,p,li');
  }

  function enable() {
    document.documentElement.classList.toggle('cms-editing', editing);
    document.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    if (!editing) return;
    document.body.querySelectorAll(TEXT_SEL).forEach((el) => {
      if (isEditableText(el)) el.setAttribute('contenteditable', 'true');
    });
    // Mobile menu overlay should not trap the editor.
    document.querySelector('.nav')?.classList.remove('open');
    document.body.classList.remove('menu-open');
  }

  // ---------- selection ----------
  function select(el) {
    document.querySelectorAll('.cms-selected').forEach((e) => e.classList.remove('cms-selected'));
    selected = el;
    if (el) el.classList.add('cms-selected');
    renderSel();
  }

  function describe(el) {
    if (!el) return '';
    if (el.matches('img')) return 'Image';
    if (el.matches('input,textarea,select')) return 'Form field';
    if (el.matches('a.btn, button')) return 'Button';
    if (el.matches('a')) return 'Link';
    if (el.matches('h1')) return 'Main headline';
    if (el.matches('h2')) return 'Heading';
    if (el.matches('h3,h4')) return 'Subheading';
    if (el.matches('.label')) return 'Label';
    if (el.matches('p')) return 'Paragraph';
    if (el.matches('li')) return 'List item';
    if (el.matches(SECTION_SEL)) return 'Section';
    return `<${el.tagName.toLowerCase()}>`;
  }

  function sectionName(sec) {
    const h = sec.querySelector('h1,h2,h3,blockquote,.label');
    return h ? `“${h.textContent.trim().slice(0, 28)}”` : describe(sec);
  }

  function field(labelText, value, onInput, { textarea = false, placeholder = '' } = {}) {
    const wrap = document.createElement('div');
    const l = document.createElement('label'); l.textContent = labelText;
    const i = document.createElement(textarea ? 'textarea' : 'input');
    i.value = value ?? ''; i.placeholder = placeholder;
    i.addEventListener('input', () => onInput(i.value));
    wrap.append(l, i);
    return wrap;
  }

  function btn(text, onClick, cls = '') {
    const b = document.createElement('button'); b.textContent = text; if (cls) b.className = cls;
    b.addEventListener('click', onClick); return b;
  }

  function renderSel() {
    selBox.innerHTML = '';
    const el = selected;
    if (!el) {
      selBox.innerHTML = `<h3>Selection</h3><p class="hint">Nothing selected. Click something on the page.</p>`;
    } else {
      const h = document.createElement('h3'); h.textContent = `Selected: ${describe(el)}`; selBox.append(h);

      // Link target
      const link = el.closest('a');
      if (link) {
        selBox.append(field('Link goes to', link.getAttribute('href'), (v) => { link.setAttribute('href', v); setDirty(link); }, { placeholder: 'page.html, https://…, mailto:…' }));
        const dl = document.createElement('datalist'); dl.id = 'cms-pages';
        pages.forEach((p) => { const o = document.createElement('option'); o.value = p.file; dl.append(o); });
        selBox.lastChild.querySelector('input').setAttribute('list', 'cms-pages'); selBox.append(dl);
        const t = document.createElement('div'); t.className = 'toggle';
        t.innerHTML = `<input type="checkbox"> <span>Open in new tab</span>`;
        const cb = t.querySelector('input'); cb.checked = link.target === '_blank';
        cb.addEventListener('change', () => { if (cb.checked) { link.target = '_blank'; link.rel = 'noopener'; } else { link.removeAttribute('target'); } setDirty(link); });
        selBox.append(t);
        if (link.matches('.btn')) {
          const t2 = document.createElement('div'); t2.className = 'toggle';
          t2.innerHTML = `<input type="checkbox"> <span>Dark button style</span>`;
          const c2 = t2.querySelector('input'); c2.checked = link.classList.contains('btn--dark');
          c2.addEventListener('change', () => { link.classList.toggle('btn--dark', c2.checked); setDirty(link); });
          selBox.append(t2);
        }
      }

      // Image
      if (el.matches('img')) {
        const prev = document.createElement('img'); prev.className = 'thumb'; prev.src = el.src; selBox.append(prev);
        const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none';
        file.addEventListener('change', async () => {
          const f = file.files[0]; if (!f) return;
          const r = await fetch(`${API}/upload?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f });
          const j = await r.json(); if (!r.ok) return toast(j.error || 'Upload failed', true);
          el.setAttribute('src', j.src); prev.src = j.src; setDirty(el); toast('Image uploaded'); loadLibrary(lib, el, prev);
        });
        selBox.append(btn('Upload new image…', () => file.click(), 'primary'), file);
        const l = document.createElement('label'); l.textContent = 'Or pick an existing image'; selBox.append(l);
        const lib = document.createElement('div'); lib.className = 'lib'; selBox.append(lib); loadLibrary(lib, el, prev);
        selBox.append(field('Description for screen readers (alt text)', el.getAttribute('alt'), (v) => { el.setAttribute('alt', v); setDirty(el); }));
      }

      // Form field
      if (el.matches('input,textarea')) {
        selBox.append(field('Placeholder text', el.getAttribute('placeholder'), (v) => { el.setAttribute('placeholder', v); setDirty(el); }));
      }
      if (el.matches('select')) {
        selBox.append(field('Options (one per line)', [...el.options].map((o) => o.text).join('\n'), (v) => {
          el.innerHTML = v.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => `<option>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join('');
          setDirty(el);
        }, { textarea: true }));
      }
      const form = el.closest('form');
      if (form) {
        selBox.append(field('Form sends to (Formspree URL)', form.getAttribute('action'), (v) => { form.setAttribute('action', v); setDirty(form); }));
      }

      // Repeatable block
      const block = el.matches(REPEAT_SEL) ? el : el.parentElement?.closest(REPEAT_SEL);
      if (block) {
        const h2 = document.createElement('h3'); h2.textContent = `Block: ${describe(block.querySelector('h3,h4,summary,a,span') || block)} item`; selBox.append(h2);
        const r = document.createElement('div'); r.className = 'row';
        r.append(
          btn('Duplicate', () => structural(() => { const c = block.cloneNode(true); c.classList.remove('cms-selected'); block.after(c); select(c); })),
          btn('↑', () => structural(() => { const p = block.previousElementSibling; if (p) p.before(block); })),
          btn('↓', () => structural(() => { const n = block.nextElementSibling; if (n) n.after(block); })),
          btn('Delete', () => structural(() => { block.remove(); select(null); }), 'danger'),
        );
        selBox.append(r);
      }
    }

    // Section tools (always available for the section containing the selection)
    const sec = el?.closest(SECTION_SEL);
    const hs = document.createElement('h3'); hs.textContent = sec ? `Section: ${sectionName(sec)}` : 'Sections'; selBox.append(hs);
    if (sec) {
      const r = document.createElement('div'); r.className = 'row';
      r.append(
        btn('Duplicate', () => structural(() => { const c = sec.cloneNode(true); c.querySelectorAll('.cms-selected').forEach((e) => e.classList.remove('cms-selected')); sec.after(c); })),
        btn('↑', () => structural(() => { const p = sec.previousElementSibling; if (p) p.before(sec); sec.scrollIntoView({ block: 'center' }); })),
        btn('↓', () => structural(() => { const n = sec.nextElementSibling; if (n) n.after(sec); sec.scrollIntoView({ block: 'center' }); })),
        btn('Delete', () => { if (confirm('Delete this whole section?')) structural(() => { sec.remove(); select(null); }); }, 'danger'),
      );
      selBox.append(r);
      if (sec.matches('section.section, section.hero')) {
        const t = document.createElement('div'); t.className = 'toggle';
        t.innerHTML = `<input type="checkbox"> <span>Dark green background</span>`;
        const cb = t.querySelector('input'); cb.checked = sec.classList.contains('section--sage');
        cb.addEventListener('change', () => structural(() => sec.classList.toggle('section--sage', cb.checked)));
        selBox.append(t);
      }
    } else {
      const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Select something inside a section to move, duplicate or delete it.'; selBox.append(p);
    }
    const l = document.createElement('label'); l.textContent = sec ? 'Add a new section below this one' : 'Add a new section at the end of the page'; selBox.append(l);
    const s = document.createElement('select');
    s.innerHTML = `<option value="">Choose a section type…</option>` + Object.keys(TEMPLATES).map((k) => `<option>${k}</option>`).join('');
    s.addEventListener('change', () => {
      if (!s.value) return;
      const tpl = document.createElement('template'); tpl.innerHTML = TEMPLATES[s.value].trim();
      const node = tpl.content.firstElementChild;
      structural(() => { if (sec) sec.after(node); else document.querySelector('main').append(node); });
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      select(node.querySelector('[contenteditable]') || node);
    });
    selBox.append(s);
  }

  async function loadLibrary(lib, img, prev) {
    const list = await (await fetch(`${API}/images`)).json();
    lib.innerHTML = '';
    list.filter((src) => !/favicon|apple-touch/.test(src)).forEach((src) => {
      const i = document.createElement('img'); i.src = '/' + src; i.title = src;
      i.addEventListener('click', () => { img.setAttribute('src', src); prev.src = '/' + src; setDirty(img); });
      lib.append(i);
    });
  }

  // ---------- structural changes + undo ----------
  function snapshot() { return document.body.innerHTML; }
  function structural(fn) {
    undoStack.push({ html: snapshot(), header: headerDirty, footer: footerDirty });
    if (undoStack.length > 50) undoStack.shift();
    const target = selected;
    fn();
    setDirty(target || document.querySelector('main'));
    enable();
    renderSel();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return toast('Nothing to undo');
    document.body.innerHTML = s.html;
    headerDirty = s.header; footerDirty = s.footer;
    setDirty(); enable(); select(null);
  }

  // ---------- saving ----------
  function cleanClone(node) {
    const c = node.cloneNode(true);
    const all = [c, ...c.querySelectorAll('*')];
    all.forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      [...el.attributes].forEach((a) => { if (/^data-(gr|new-gr|lt|ms-editor)/.test(a.name)) el.removeAttribute(a.name); });
      if (el.classList) {
        el.classList.remove('cms-selected', 'cms-hover');
        if (el.classList.contains('reveal')) el.classList.remove('in');
        if (el.matches?.('.nav')) el.classList.remove('open');
        if (el.getAttribute('class') === '') el.removeAttribute('class');
      }
      if (el.matches?.('.menu-toggle')) el.setAttribute('aria-expanded', 'false');
    });
    // Browser extensions sometimes inject elements; drop anything unknown at the top level.
    c.querySelectorAll('grammarly-desktop-integration, grammarly-extension, cms-panel').forEach((e) => e.remove());
    return c;
  }

  async function save() {
    const body = cleanClone(document.body);
    body.classList?.remove('menu-open');
    const payload = { page: PAGE, body: body.innerHTML, meta };
    if (headerDirty) payload.header = cleanClone(document.querySelector('header.site-header')).outerHTML;
    if (footerDirty) payload.footer = cleanClone(document.querySelector('footer.site-footer')).outerHTML;
    statusEl.textContent = 'Saving…';
    const r = await fetch(`${API}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { statusEl.textContent = 'Save failed'; return toast(j.error || 'Save failed', true), false; }
    setClean();
    toast(j.synced?.length ? `Saved (header/footer updated on ${j.synced.length} other pages)` : 'Saved');
    loadPages();
    return true;
  }

  // ---------- pages ----------
  async function loadPages() {
    pages = await (await fetch(`${API}/pages`)).json();
    const s = $('.pages');
    s.innerHTML = pages.map((p) => `<option value="${p.file}" ${p.file === PAGE ? 'selected' : ''}>${p.file}</option>`).join('');
  }

  function go(file) {
    if (dirty && !confirm('You have unsaved changes on this page. Leave without saving?')) { $('.pages').value = PAGE; return; }
    dirty = false; location.href = '/' + file;
  }

  // ---------- wiring ----------
  $('.collapse').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    $('.collapse').textContent = panel.classList.contains('collapsed') ? '⇤' : '⇥';
    layout();
  });
  $('.save').addEventListener('click', save);
  $('.undo').addEventListener('click', undo);
  $('.preview').addEventListener('click', () => {
    editing = !editing;
    $('.preview').textContent = editing ? 'Preview' : 'Edit';
    $('.preview').classList.toggle('primary', !editing);
    if (!editing) select(null);
    enable();
  });
  $('.pages').addEventListener('change', (e) => go(e.target.value));
  $('.meta-title').value = meta.title;
  $('.meta-desc').value = meta.description;
  $('.meta-title').addEventListener('input', (e) => { meta.title = e.target.value; document.title = meta.title; setDirty(); });
  $('.meta-desc').addEventListener('input', (e) => { meta.description = e.target.value; setDirty(); });
  $('.new-page').addEventListener('click', async () => {
    const slug = prompt('Name for the new page (e.g. "pricing"):');
    if (!slug) return;
    const r = await fetch(`${API}/new-page`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, from: PAGE }) });
    const j = await r.json(); if (!r.ok) return toast(j.error, true);
    toast(`Created ${j.file}. Add it to the menu by duplicating a menu link.`); go(j.file);
  });
  $('.delete-page').addEventListener('click', async () => {
    if (!confirm(`Delete ${PAGE}? Links pointing to it will break.`)) return;
    const r = await fetch(`${API}/delete-page`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: PAGE }) });
    const j = await r.json(); if (!r.ok) return toast(j.error, true);
    dirty = false; location.href = '/index.html';
  });
  $('.publish').addEventListener('click', async () => {
    if (dirty && !(await save())) return;
    const st = await (await fetch(`${API}/status`)).json();
    const n = st.changes.length;
    const msg = prompt(`Publish ${n ? `${n} changed file${n > 1 ? 's' : ''}` : 'any unpushed commits'} to the live site?\nThis commits and pushes branch "${st.branch}" to GitHub.\n\nDescribe the change:`, 'Update site content');
    if (msg === null) return;
    $('.publish').disabled = true; $('.publish').textContent = 'Publishing…';
    const r = await fetch(`${API}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
    const j = await r.json();
    $('.publish').disabled = false; $('.publish').textContent = 'Publish to live site…';
    $('.publog').innerHTML = `<pre></pre>`; $('.publog pre').textContent = j.log || j.error || '';
    if (!r.ok) return toast(j.error || 'Publish failed', true);
    toast('Published! GitHub will redeploy in a minute or two.');
  });

  // Click handling: select things, block navigation while editing.
  document.addEventListener('click', (e) => {
    if (!editing || e.composedPath().includes(host)) return;
    const t = e.target;
    const a = t.closest('a');
    if (a || t.closest('button[type="submit"], .menu-toggle')) e.preventDefault();
    if (t.closest('summary')) e.preventDefault(); // don't toggle FAQ while editing text
    const target = t.closest('img') || t.closest('input,textarea,select') || t.closest('[contenteditable="true"]') || t.closest(REPEAT_SEL) || t.closest(SECTION_SEL);
    select(target);
  }, true);
  document.addEventListener('submit', (e) => { if (editing) e.preventDefault(); }, true);

  document.addEventListener('input', (e) => { if (e.target.isContentEditable) setDirty(e.target); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    const t = e.target;
    if (!t.isContentEditable) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) document.execCommand('insertLineBreak');
    }
    if (e.key === 'Escape') { t.blur(); select(null); }
  });
  // Paste as plain text so no stray formatting sneaks into the HTML.
  document.addEventListener('paste', (e) => {
    if (!e.target.isContentEditable) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  // Bold / italic shortcuts work natively (⌘B / ⌘I) inside editable text.

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  enable();
  renderSel();
  layout();
  loadPages();
})();
