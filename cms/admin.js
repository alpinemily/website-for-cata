// Full-page editor shell at /admin. The site loads in the frame with ?edit,
// and cms/editor.js inside it exposes window.__cms for this toolbar to drive.
(() => {
  'use strict';
  const API = '/__cms/api';
  const $ = (s) => document.querySelector(s);
  const frame = $('#frame');
  let cms = null;          // editor API inside the frame
  let page = new URLSearchParams(location.search).get('page') || 'index.html';
  let pages = [];

  // ---------- helpers ----------
  function toast(msg, err = false) {
    const t = $('#toast');
    t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), err ? 5000 : 2200);
  }
  function setStatus(dirty, text) {
    const s = $('#status');
    s.textContent = text || (dirty ? 'Unsaved changes' : 'All changes saved');
    s.classList.toggle('dirty', !!dirty);
  }
  const post = (url, data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }));

  // Called by the editor inside the frame.
  window.cmsHost = {
    status: ({ dirty }) => setStatus(dirty),
    toast: ({ msg, err }) => toast(msg, err),
    navigate: (file) => go(file),
  };

  // ---------- pages ----------
  async function loadPages() {
    pages = await (await fetch(`${API}/pages`)).json();
    $('#page').innerHTML = pages.map((p) => `<option value="${p.file}">${p.file.replace('.html', '')}</option>`).join('');
    $('#page').value = page;
  }

  function load(file) {
    page = file;
    cms = null;
    setStatus(false, 'Loading…');
    frame.src = `/${file}?edit`;
    history.replaceState(null, '', `/admin?page=${encodeURIComponent(file)}`);
    $('#page').value = file;
  }

  function go(file) {
    if (file === page) return;
    if (cms?.isDirty() && !confirm('You have unsaved changes on this page. Leave without saving?')) { $('#page').value = page; return; }
    cms?.markClean();
    load(file);
  }

  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    const file = decodeURIComponent(win.location.pathname.replace(/^\//, '')) || 'index.html';
    // A link took the frame somewhere without the editor: reload it in edit mode.
    if (!win.__cms) {
      if (file.endsWith('.html') && pages.some((p) => p.file === file)) { load(file); }
      return;
    }
    cms = win.__cms;
    page = file;
    $('#page').value = file;
    history.replaceState(null, '', `/admin?page=${encodeURIComponent(file)}`);
    document.title = `Editing ${file} — Hi Vibes Supply`;
    $('#meta-title').value = cms.meta.title;
    $('#meta-desc').value = cms.meta.description;
    cms.setEditing(!previewing);
    setStatus(false);
  });

  // ---------- toolbar ----------
  $('#page').addEventListener('change', (e) => go(e.target.value));
  $('#save').addEventListener('click', () => cms?.save());
  $('#undo').addEventListener('click', () => cms?.undo());

  let previewing = false;
  $('#preview').addEventListener('click', () => {
    previewing = !previewing;
    $('#preview').textContent = previewing ? 'Back to editing' : 'Preview';
    $('#preview').classList.toggle('primary', previewing);
    cms?.setEditing(!previewing);
  });

  document.querySelectorAll('.devices button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.devices button').forEach((x) => x.classList.toggle('on', x === b));
    frame.style.width = b.dataset.w;
    $('.stage').classList.toggle('framed', b.dataset.w !== '100%');
  }));

  // Dropdown menus
  function closeMenus(except) { document.querySelectorAll('.dropdown.open').forEach((d) => { if (d !== except) d.classList.remove('open'); }); }
  function menu(btn, dd, onOpen) {
    $(btn).addEventListener('click', (e) => {
      e.stopPropagation();
      const d = $(dd); closeMenus(d);
      if (!d.classList.toggle('open')) return;
      onOpen?.(d);
    });
    $(dd).addEventListener('click', (e) => e.stopPropagation());
  }
  document.addEventListener('click', () => closeMenus());
  frame.addEventListener('load', () => frame.contentWindow.addEventListener('click', () => closeMenus()));

  menu('#page-menu-btn', '#page-menu');
  $('#meta-title').addEventListener('input', (e) => cms?.setMeta({ title: e.target.value }));
  $('#meta-desc').addEventListener('input', (e) => cms?.setMeta({ description: e.target.value }));

  menu('#add-btn', '#add-menu', (d) => {
    const names = cms?.templates || [];
    const where = cms?.hasSelectedSection() ? 'Adds below the selected section' : 'Adds at the end of the page';
    d.innerHTML = `<p class="hint">${where}</p>` + names.map((n) => `<button data-t="${n}">${n}</button>`).join('');
    d.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { cms.addSection(b.dataset.t); closeMenus(); }));
  });

  $('#new-page').addEventListener('click', async () => {
    const slug = prompt('Name for the new page (e.g. "pricing"):');
    if (!slug) return;
    const j = await post(`${API}/new-page`, { slug, from: page });
    if (!j.ok) return toast(j.error || 'Could not create page', true);
    closeMenus(); await loadPages(); go(j.file);
    toast(`Created ${j.file}. Add it to the menu by duplicating a menu link.`);
  });
  $('#delete-page').addEventListener('click', async () => {
    if (!confirm(`Delete ${page}? Links pointing to it will break.`)) return;
    const j = await post(`${API}/delete-page`, { page });
    if (!j.ok) return toast(j.error || 'Could not delete page', true);
    cms?.markClean(); closeMenus(); await loadPages(); load('index.html'); toast('Page deleted');
  });

  // ---------- publish ----------
  const dlg = $('#publish-dialog');
  $('#publish').addEventListener('click', async () => {
    if (cms?.isDirty() && !(await cms.save())) return;
    const st = await (await fetch(`${API}/status`)).json();
    const n = st.changes.length;
    $('#publish-summary').textContent = `${n ? `${n} changed file${n > 1 ? 's' : ''} will be committed. ` : ''}Everything on branch “${st.branch}” will be pushed to GitHub, which redeploys the live site in a minute or two.`;
    $('#publish-log').hidden = true; $('#publish-go').disabled = false; $('#publish-go').textContent = 'Publish';
    dlg.showModal();
  });
  $('#publish-go').addEventListener('click', async (e) => {
    e.preventDefault();
    $('#publish-go').disabled = true; $('#publish-go').textContent = 'Publishing…';
    const j = await post(`${API}/publish`, { message: $('#publish-msg').value });
    $('#publish-log').hidden = false; $('#publish-log').textContent = j.log || j.error || '';
    $('#publish-go').textContent = j.ok ? 'Done' : 'Failed';
    if (j.ok) { toast('Published! The live site updates in a minute or two.'); setTimeout(() => dlg.close(), 1200); }
    else toast(j.error || 'Publish failed', true);
  });

  // ---------- keyboard + leaving ----------
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); cms?.save(); }
  });
  window.addEventListener('beforeunload', (e) => { if (cms?.isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  loadPages().then(() => load(pages.some((p) => p.file === page) ? page : 'index.html'));
})();
