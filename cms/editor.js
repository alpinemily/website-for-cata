// Hi Vibes Supply — local visual CMS, editing layer.
// Runs inside the /admin frame (pages loaded with ?edit). Never deployed.
(() => {
  'use strict';

  const PAGE = decodeURIComponent(location.pathname.replace(/^\//, '')) || 'index.html';
  const API = '/__cms/api';
  const host = window.parent !== window ? window.parent.cmsHost : null;
  const notify = (type, data) => { try { host?.[type]?.(data); } catch {} };

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
  let dirty = false, headerDirty = false, footerDirty = false;
  const undoStack = [];
  let pages = [];
  const meta = { title: document.title, description: document.querySelector('meta[name="description"]')?.content || '' };

  // ---------- floating card (shadow DOM keeps editor styles out of the site) ----------
  const hostEl = document.createElement('cms-ui');
  document.documentElement.appendChild(hostEl);
  const root = hostEl.attachShadow({ mode: 'open' });
  root.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; }
    .card { position: fixed; z-index: 2147483000; width: 300px; max-height: min(70vh, 560px); overflow-y: auto; display: none;
      background: #16181a; color: #e8e8e6; border-radius: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06);
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 10px 12px 12px; }
    .card.show { display: block; }
    .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .title { font-weight: 600; }
    .x { background: none; border: 0; color: #9aa0a6; font-size: 18px; line-height: 1; padding: 2px 6px; }
    h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #9aa0a6; margin: 14px 0 6px; font-weight: 600; }
    label { display: block; font-size: 12px; color: #c4c7c5; margin: 8px 0 4px; }
    input, select, textarea { width: 100%; background: #23262a; color: #fff; border: 1px solid #34383c; border-radius: 6px; padding: 7px 9px; font: inherit; }
    textarea { resize: vertical; min-height: 70px; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #d7f26b; }
    button { font: inherit; cursor: pointer; border-radius: 6px; border: 1px solid #34383c; background: #23262a; color: #e8e8e6; padding: 6px 10px; }
    button:hover { border-color: #6b7075; }
    button.primary { background: #d7f26b; color: #16181a; border-color: #d7f26b; font-weight: 600; }
    button.danger { color: #ff8a80; }
    .row { display: flex; gap: 6px; }
    .row > * { flex: 1; }
    .hint { color: #9aa0a6; font-size: 12px; margin: 6px 0 0; }
    .prev { width: 100%; max-height: 120px; object-fit: contain; background: #23262a; border-radius: 6px; margin-bottom: 6px; }
    .lib { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; max-height: 150px; overflow-y: auto; margin-top: 4px; }
    .lib img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid transparent; background: #23262a; }
    .lib img:hover { border-color: #d7f26b; }
    .toggle { display: flex; align-items: center; gap: 8px; margin: 8px 0 0; font-size: 12px; }
    .toggle input { width: auto; }
  </style>
  <div class="card"></div>`;
  const card = root.querySelector('.card');

  function toast(msg, err = false) { notify('toast', { msg, err }); }
  function setDirty(el) {
    dirty = true;
    if (el?.closest?.('header.site-header')) headerDirty = true;
    if (el?.closest?.('footer.site-footer')) footerDirty = true;
    notify('status', { dirty: true });
  }
  function markClean() { dirty = headerDirty = footerDirty = false; notify('status', { dirty: false }); }

  // ---------- making the page editable ----------
  function isEditableText(el) {
    if (!el.matches(TEXT_SEL)) return false;
    if (el.closest('.sr-only, svg, .socials, .menu-toggle')) return false;
    if (el.matches('a') && el.querySelector('img')) return false;
    if (el.matches('li') && el.querySelector(':scope > a, :scope > details, :scope > div, :scope > h3')) return false;
    if (el.matches('label') && el.querySelector('input,select,textarea')) return false;
    for (const c of el.querySelectorAll(TEXT_SEL)) {
      if (c.closest('svg') || c.matches('[data-year]')) continue;
      if (c.matches('a') && c.querySelector('img')) continue;
      return false; // only leaf text elements
    }
    return el.textContent.trim().length > 0 || el.matches('h1,h2,h3,h4,p,li');
  }

  function enable() {
    document.documentElement.classList.toggle('cms-editing', editing);
    document.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    if (!editing) return;
    document.body.querySelectorAll(TEXT_SEL).forEach((el) => { if (isEditableText(el)) el.setAttribute('contenteditable', 'true'); });
    document.querySelector('.nav')?.classList.remove('open');
    document.body.classList.remove('menu-open');
  }

  // ---------- selection + card ----------
  function select(el) {
    document.querySelectorAll('.cms-selected').forEach((e) => e.classList.remove('cms-selected'));
    selected = el;
    if (el) el.classList.add('cms-selected');
    renderCard();
  }

  function describe(el) {
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
    if (el.matches(REPEAT_SEL)) return 'Block';
    return 'Text';
  }

  const h = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };
  const btn = (text, onClick, cls = '') => { const b = h('button', { textContent: text, className: cls }); b.addEventListener('click', onClick); return b; };
  function field(labelText, value, onInput, { textarea = false, placeholder = '', list } = {}) {
    const i = h(textarea ? 'textarea' : 'input', { value: value ?? '', placeholder });
    if (list) i.setAttribute('list', list);
    i.addEventListener('input', () => onInput(i.value));
    return h('div', {}, h('label', { textContent: labelText }), i);
  }
  function toggle(text, checked, onChange) {
    const cb = h('input', { type: 'checkbox', checked });
    cb.addEventListener('change', () => onChange(cb.checked));
    return h('label', { className: 'toggle' }, cb, h('span', { textContent: text }));
  }

  function renderCard() {
    card.innerHTML = '';
    const el = selected;
    if (!el || !editing) { card.classList.remove('show'); return; }

    card.append(h('div', { className: 'head' }, h('span', { className: 'title', textContent: describe(el) }), btn('×', () => select(null), 'x')));
    if (el.isContentEditable) card.append(h('p', { className: 'hint', textContent: 'Type to edit. Shift+Enter for a new line, ⌘B / ⌘I for bold / italic.' }));

    const link = el.closest('a');
    if (link) {
      card.append(h('h4', { textContent: 'Link' }));
      const dl = h('datalist', { id: 'cms-pages' }); pages.forEach((p) => dl.append(h('option', { value: p.file })));
      card.append(dl, field('Goes to', link.getAttribute('href'), (v) => { link.setAttribute('href', v); setDirty(link); }, { placeholder: 'page.html, https://…, mailto:…', list: 'cms-pages' }));
      card.append(toggle('Open in new tab', link.target === '_blank', (on) => { if (on) { link.target = '_blank'; link.rel = 'noopener'; } else link.removeAttribute('target'); setDirty(link); }));
      if (link.matches('.btn')) card.append(toggle('Dark button style', link.classList.contains('btn--dark'), (on) => { link.classList.toggle('btn--dark', on); setDirty(link); }));
    }

    if (el.matches('img')) {
      card.append(h('h4', { textContent: 'Image' }));
      const prev = h('img', { className: 'prev', src: el.src }); card.append(prev);
      const file = h('input', { type: 'file', accept: 'image/*' }); file.style.display = 'none';
      const lib = h('div', { className: 'lib' });
      file.addEventListener('change', async () => {
        const f = file.files[0]; if (!f) return;
        const r = await fetch(`${API}/upload?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f });
        const j = await r.json(); if (!r.ok) return toast(j.error || 'Upload failed', true);
        el.setAttribute('src', j.src); prev.src = '/' + j.src; setDirty(el); toast('Image uploaded'); loadLibrary(lib, el, prev);
      });
      card.append(btn('Upload new image…', () => file.click(), 'primary'), file, h('label', { textContent: 'Or pick an existing one' }), lib);
      loadLibrary(lib, el, prev);
      card.append(field('Alt text (describes the image)', el.getAttribute('alt'), (v) => { el.setAttribute('alt', v); setDirty(el); }));
    }

    if (el.matches('input,textarea')) card.append(field('Placeholder text', el.getAttribute('placeholder'), (v) => { el.setAttribute('placeholder', v); setDirty(el); }));
    if (el.matches('select')) {
      card.append(field('Options (one per line)', [...el.options].map((o) => o.text).join('\n'), (v) => {
        el.innerHTML = v.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => `<option>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join('');
        setDirty(el);
      }, { textarea: true }));
    }
    const form = el.closest('form');
    if (form) card.append(field('Form sends to (Formspree URL)', form.getAttribute('action'), (v) => { form.setAttribute('action', v); setDirty(form); }));

    const block = el.matches(REPEAT_SEL) ? el : el.parentElement?.closest(REPEAT_SEL);
    if (block) {
      card.append(h('h4', { textContent: 'This item' }), h('div', { className: 'row' },
        btn('Duplicate', () => structural(() => { const c = block.cloneNode(true); c.classList.remove('cms-selected'); block.after(c); select(c); })),
        btn('↑', () => structural(() => block.previousElementSibling?.before(block))),
        btn('↓', () => structural(() => block.nextElementSibling?.after(block))),
        btn('Delete', () => structural(() => { block.remove(); select(null); }), 'danger'),
      ));
    }

    const sec = el.closest(SECTION_SEL);
    if (sec) {
      card.append(h('h4', { textContent: 'Section' }), h('div', { className: 'row' },
        btn('Duplicate', () => structural(() => { const c = sec.cloneNode(true); c.querySelectorAll('.cms-selected').forEach((e) => e.classList.remove('cms-selected')); sec.after(c); })),
        btn('↑', () => structural(() => { sec.previousElementSibling?.before(sec); sec.scrollIntoView({ block: 'center' }); })),
        btn('↓', () => structural(() => { sec.nextElementSibling?.after(sec); sec.scrollIntoView({ block: 'center' }); })),
        btn('Delete', () => { if (confirm('Delete this whole section?')) structural(() => { sec.remove(); select(null); }); }, 'danger'),
      ));
      if (sec.matches('section.section, section.hero')) {
        card.append(toggle('Dark green background', sec.classList.contains('section--sage'), (on) => structural(() => sec.classList.toggle('section--sage', on))));
      }
    }
    card.classList.add('show');
    position();
  }

  // Keep the card next to the selected element, inside the viewport.
  function position() {
    if (!selected || !card.classList.contains('show')) return;
    const r = selected.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, gap = 12;
    let left, top;
    if (r.right + gap + cw <= vw - 8) { left = r.right + gap; top = r.top; }              // right of element
    else if (r.left - gap - cw >= 8) { left = r.left - gap - cw; top = r.top; }           // left of element
    else { left = Math.min(Math.max(8, r.left), vw - cw - 8); top = r.bottom + gap; }     // below
    if (top + ch > vh - 8) top = Math.max(8, vh - ch - 8);
    if (top < 8) top = 8;
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  }
  addEventListener('scroll', position, { passive: true });
  addEventListener('resize', position);

  async function loadLibrary(lib, img, prev) {
    const list = await (await fetch(`${API}/images`)).json();
    lib.innerHTML = '';
    list.filter((src) => !/favicon|apple-touch/.test(src)).forEach((src) => {
      const i = h('img', { src: '/' + src, title: src });
      i.addEventListener('click', () => { img.setAttribute('src', src); prev.src = '/' + src; setDirty(img); });
      lib.append(i);
    });
  }

  // ---------- structural changes + undo ----------
  function structural(fn) {
    undoStack.push({ html: document.body.innerHTML, header: headerDirty, footer: footerDirty });
    if (undoStack.length > 50) undoStack.shift();
    const target = selected;
    fn();
    setDirty(target?.isConnected ? target : document.querySelector('main'));
    enable();
    if (selected && !selected.isConnected) selected = null;
    renderCard();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return toast('Nothing to undo');
    document.body.innerHTML = s.html;
    headerDirty = s.header; footerDirty = s.footer;
    setDirty(); enable(); select(null);
  }

  function addSection(name) {
    const tpl = document.createElement('template'); tpl.innerHTML = TEMPLATES[name].trim();
    const node = tpl.content.firstElementChild;
    const sec = selected?.closest(SECTION_SEL);
    structural(() => { if (sec) sec.after(node); else document.querySelector('main').append(node); });
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => select(node.querySelector('[contenteditable]') || node), 350);
  }

  // ---------- saving ----------
  function cleanClone(node) {
    const c = node.cloneNode(true);
    [c, ...c.querySelectorAll('*')].forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      [...el.attributes].forEach((a) => { if (/^data-(gr|new-gr|lt|ms-editor)/.test(a.name)) el.removeAttribute(a.name); });
      el.classList.remove('cms-selected');
      if (el.classList.contains('reveal')) el.classList.remove('in');
      if (el.matches('.nav')) el.classList.remove('open');
      if (el.matches('body')) el.classList.remove('menu-open');
      if (el.getAttribute('class') === '') el.removeAttribute('class');
      if (el.matches('.menu-toggle')) el.setAttribute('aria-expanded', 'false');
    });
    c.querySelectorAll('grammarly-desktop-integration, grammarly-extension, cms-ui').forEach((e) => e.remove());
    return c;
  }

  async function save() {
    const payload = { page: PAGE, body: cleanClone(document.body).innerHTML, meta };
    if (headerDirty) payload.header = cleanClone(document.querySelector('header.site-header')).outerHTML;
    if (footerDirty) payload.footer = cleanClone(document.querySelector('footer.site-footer')).outerHTML;
    notify('status', { dirty: true });
    const r = await fetch(`${API}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { toast(j.error || 'Save failed', true); return false; }
    markClean();
    toast(j.synced?.length ? `Saved. Header/footer updated on ${j.synced.length} other pages.` : 'Saved');
    return true;
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    if (e.composedPath().includes(hostEl)) return;
    const t = e.target;
    const a = t.closest('a');
    if (!editing) {
      // Preview mode: follow internal links but stay inside the editor.
      if (a && a.origin === location.origin && /\.html$/.test(a.pathname) && !a.target) {
        e.preventDefault();
        notify('navigate', decodeURIComponent(a.pathname.replace(/^\//, '')));
      }
      return;
    }
    if (a || t.closest('button[type="submit"], .menu-toggle')) e.preventDefault();
    if (t.closest('summary')) e.preventDefault();
    select(t.closest('img') || t.closest('input,textarea,select') || t.closest('[contenteditable="true"]') || t.closest(REPEAT_SEL) || t.closest(SECTION_SEL));
  }, true);
  document.addEventListener('submit', (e) => { if (editing) e.preventDefault(); }, true);
  document.addEventListener('input', (e) => { if (e.target.isContentEditable) { setDirty(e.target); position(); } });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if (e.key === 'Escape') { document.activeElement?.blur?.(); select(null); return; }
    if (!e.target.isContentEditable) return;
    if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) document.execCommand('insertLineBreak'); }
  });
  document.addEventListener('paste', (e) => {
    if (!e.target.isContentEditable) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });

  // ---------- API for the /admin toolbar ----------
  window.__cms = {
    page: PAGE,
    meta,
    templates: Object.keys(TEMPLATES),
    save, undo, addSection, markClean,
    isDirty: () => dirty,
    hasSelectedSection: () => !!selected?.closest(SECTION_SEL),
    setMeta(m) { Object.assign(meta, m); if (m.title !== undefined) document.title = m.title; setDirty(); },
    setEditing(on) { editing = on; if (!on) select(null); enable(); },
  };

  fetch(`${API}/pages`).then((r) => r.json()).then((p) => { pages = p; });
  enable();
})();
