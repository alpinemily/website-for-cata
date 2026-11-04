#!/usr/bin/env node
// Local visual CMS for the Hi Vibes Supply site.
// Serves the static site with an editing layer injected, and writes edits back to the HTML files.
// Runs on localhost only. No dependencies: `node cms/server.js` (or `npm run cms`).

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CMS_DIR = __dirname;
const UPLOAD_DIR = path.join(ROOT, 'assets', 'img', 'uploads');
const PORT = Number(process.env.PORT) || 4000;
const HOST = '127.0.0.1';
const MAX_BODY = 15 * 1024 * 1024; // 15 MB (image uploads)

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon', '.json': 'application/json', '.md': 'text/plain; charset=utf-8',
};
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);

// ---------- helpers ----------

function send(res, status, body, type = 'application/json') {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req);
  return JSON.parse(buf.toString('utf8') || '{}');
}

// Only top-level *.html files in the site root can be edited.
async function listPages() {
  const files = await fsp.readdir(ROOT);
  return files.filter((f) => f.endsWith('.html')).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
}

async function pagePath(name) {
  const pages = await listPages();
  if (!pages.includes(name)) throw Object.assign(new Error(`Unknown page: ${name}`), { status: 400 });
  return path.join(ROOT, name);
}

function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function escText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function unesc(s) { return String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }

function getMeta(html) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
  return { title: unesc(title), description: unesc(desc) };
}

function setMeta(html, { title, description }) {
  if (typeof title === 'string') {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(title)}</title>`);
    html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(title)}">`);
  }
  if (typeof description === 'string') {
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(description)}">`);
    html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(description)}">`);
  }
  return html;
}

const BODY_RE = /(<body[^>]*>)([\s\S]*)(<\/body>)/;
const HEADER_RE = /<header class="site-header">[\s\S]*?<\/header>/;
const FOOTER_RE = /<footer class="site-footer">[\s\S]*?<\/footer>/;

// Header markup is shared, but each page marks its own nav link with aria-current.
function headerForPage(header, page) {
  let h = header.replace(/ aria-current="page"/g, '');
  const re = new RegExp(`(<li><a href="${page.replace('.', '\\.')}")`);
  return h.replace(re, '$1 aria-current="page"');
}

// Undo browser-serializer noise so saves produce clean diffs.
const BOOL_ATTRS = 'required|open|disabled|checked|selected|hidden|defer|async|novalidate|multiple|autofocus|readonly|data-year';
function tidy(markup) {
  return markup
    .replace(new RegExp(`(\\s(?:${BOOL_ATTRS}))=""`, 'g'), '$1')
    .replace(/<(path|circle|rect|line|polyline|polygon|ellipse|stop|use)(\s[^<>]*?)?><\/\1>/g, (_, tag, attrs = '') => `<${tag}${attrs}/>`);
}

// Keep the site's own <script> tag at the end of body.
function spliceBody(html, bodyInner) {
  bodyInner = tidy(bodyInner);
  if (!BODY_RE.test(html)) throw new Error('Page has no <body>');
  return html.replace(BODY_RE, (_, open, _old, close) => `${open}\n${bodyInner.trim()}\n${close}`);
}

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? err.code : 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

// ---------- API ----------

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /__cms/api/pages') {
    const pages = await listPages();
    const out = [];
    for (const p of pages) out.push({ file: p, ...getMeta(await fsp.readFile(path.join(ROOT, p), 'utf8')) });
    return send(res, 200, out);
  }

  if (route === 'GET /__cms/api/images') {
    const out = [];
    const walk = async (dir) => {
      for (const ent of await fsp.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) await walk(full);
        else if (IMAGE_EXT.has(path.extname(ent.name).toLowerCase())) out.push(path.relative(ROOT, full).split(path.sep).join('/'));
      }
    };
    await walk(path.join(ROOT, 'assets', 'img'));
    return send(res, 200, out.sort());
  }

  if (route === 'POST /__cms/api/save') {
    const { page, body, meta, header, footer } = await readJson(req);
    const file = await pagePath(page);
    let html = await fsp.readFile(file, 'utf8');
    html = spliceBody(html, body);
    if (meta) html = setMeta(html, meta);
    await fsp.writeFile(file, html);

    // Header/footer are shared: copy them to every other page.
    const synced = [];
    if (header || footer) {
      for (const other of await listPages()) {
        if (other === page) continue;
        const otherFile = path.join(ROOT, other);
        const before = await fsp.readFile(otherFile, 'utf8');
        let after = before;
        if (header && HEADER_RE.test(after)) after = after.replace(HEADER_RE, () => headerForPage(tidy(header), other));
        if (footer && FOOTER_RE.test(after)) after = after.replace(FOOTER_RE, () => tidy(footer));
        if (after !== before) { await fsp.writeFile(otherFile, after); synced.push(other); }
      }
    }
    return send(res, 200, { ok: true, synced });
  }

  if (route === 'POST /__cms/api/upload') {
    const rawName = String(url.searchParams.get('name') || 'image');
    const ext = path.extname(rawName).toLowerCase();
    if (!IMAGE_EXT.has(ext)) return send(res, 400, { error: `Unsupported image type: ${ext || 'none'}` });
    const base = path.basename(rawName, path.extname(rawName)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image';
    await fsp.mkdir(UPLOAD_DIR, { recursive: true });
    let name = `${base}${ext}`; let n = 1;
    while (fs.existsSync(path.join(UPLOAD_DIR, name))) name = `${base}-${++n}${ext}`;
    await fsp.writeFile(path.join(UPLOAD_DIR, name), await readBody(req));
    return send(res, 200, { ok: true, src: `assets/img/uploads/${name}` });
  }

  if (route === 'POST /__cms/api/new-page') {
    const { slug, from } = await readJson(req);
    const clean = String(slug || '').toLowerCase().replace(/\.html$/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    if (!clean) return send(res, 400, { error: 'Enter a page name' });
    const target = path.join(ROOT, `${clean}.html`);
    if (fs.existsSync(target)) return send(res, 400, { error: `${clean}.html already exists` });
    let html = await fsp.readFile(await pagePath(from || 'index.html'), 'utf8');
    html = html.replace(HEADER_RE, (h) => headerForPage(h, `${clean}.html`));
    // Start the new page with just a hero section.
    html = html.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">

<section class="hero">
  <div class="wrap reveal">
    <span class="label">new page</span>
    <h1>Page headline</h1>
    <p>Click any text to edit it. Use the panel to add sections.</p>
  </div>
</section>
</main>`);
    html = setMeta(html, { title: `${clean.replace(/-/g, ' ')} — Hi Vibes Supply`, description: '' });
    await fsp.writeFile(target, html);
    return send(res, 200, { ok: true, file: `${clean}.html` });
  }

  if (route === 'POST /__cms/api/delete-page') {
    const { page } = await readJson(req);
    if (page === 'index.html' || page === '404.html') return send(res, 400, { error: `${page} can't be deleted` });
    await fsp.unlink(await pagePath(page));
    return send(res, 200, { ok: true });
  }

  if (route === 'GET /__cms/api/status') {
    const st = await run('git', ['status', '--porcelain']);
    const branch = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    return send(res, 200, { changes: st.stdout.split('\n').filter(Boolean), branch: branch.stdout.trim() });
  }

  if (route === 'POST /__cms/api/publish') {
    const { message } = await readJson(req);
    const msg = String(message || '').trim() || 'Update site content';
    const log = [];
    const step = async (args) => { const r = await run('git', args); log.push(`$ git ${args.join(' ')}\n${r.stdout}${r.stderr}`); return r; };
    await step(['add', '-A', '--', '.', ':!cms/node_modules']);
    const staged = await run('git', ['diff', '--cached', '--quiet']);
    if (!staged.ok) {
      const c = await step(['commit', '-m', msg]);
      if (!c.ok) return send(res, 500, { error: 'Commit failed', log: log.join('\n') });
    }
    const p = await step(['push']);
    if (!p.ok) return send(res, 500, { error: 'Push failed', log: log.join('\n') });
    return send(res, 200, { ok: true, committed: !staged.ok, log: log.join('\n') });
  }

  return send(res, 404, { error: 'Not found' });
}

// ---------- static files ----------

const CMS_ASSETS = new Set(['editor.js', 'editor.css', 'admin.js', 'admin.css']);
const INJECT = `
<link rel="stylesheet" href="/__cms/editor.css">
<script src="/__cms/editor.js" defer></script>
`;

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  // The full-page editor app.
  if (rel === '/admin' || rel === '/admin/') {
    return send(res, 200, await fsp.readFile(path.join(CMS_DIR, 'admin.html')), MIME['.html']);
  }
  if (rel.startsWith('/__cms/')) {
    const name = path.basename(rel);
    if (!CMS_ASSETS.has(name)) return send(res, 404, 'Not found', 'text/plain');
    return send(res, 200, await fsp.readFile(path.join(CMS_DIR, name)), MIME[path.extname(name)]);
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, '.' + rel);
  if (!file.startsWith(ROOT + path.sep) || file.includes(`${path.sep}.git`) || file.startsWith(CMS_DIR + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');

  let data;
  try { data = await fsp.readFile(file); }
  catch {
    const notFound = await fsp.readFile(path.join(ROOT, '404.html'), 'utf8').catch(() => 'Not found');
    return send(res, 404, notFound, MIME['.html']);
  }
  const ext = path.extname(file).toLowerCase();
  // Pages loaded inside /admin (with ?edit) get the editing layer; the plain site stays untouched.
  if (ext === '.html' && path.dirname(file) === ROOT && url.searchParams.has('edit')) {
    const html = data.toString('utf8').replace('</head>', `${INJECT}</head>`);
    return send(res, 200, html, MIME['.html']);
  }
  return send(res, 200, data, MIME[ext] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/__cms/api/')) {
      // Basic CSRF guard: only accept writes from this origin.
      if (req.method !== 'GET') {
        const origin = req.headers.origin || '';
        if (origin && origin !== `http://localhost:${PORT}` && origin !== `http://${HOST}:${PORT}`) return send(res, 403, { error: 'Bad origin' });
      }
      return await api(req, res, url);
    }
    return await serveStatic(req, res, url);
  } catch (err) {
    console.error(err);
    return send(res, err.status || 500, { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Hi Vibes Supply CMS: edit at http://localhost:${PORT}/admin  (site preview at http://localhost:${PORT}/)\n  Edits save straight into the HTML files in ${ROOT}\n`);
});
