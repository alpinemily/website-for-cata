# Hi Vibes Supply — website (Cata Catibayan)

Static site (plain HTML/CSS/JS, no build step) for GitHub Pages.

## Pages
- `index.html` — home
- `about.html`
- `coaching.html` — 1:1 coaching + integration (`#integration`)
- `gatherings.html` — retreats, workshops, events calendar (`#calendar`)
- `contact.html`
- `404.html`

## Editing the site (local CMS)
Run the visual editor (needs Node 18+, no install step):

```
npm run cms
```

Then open **http://localhost:4000/admin**. The site fills the window with a toolbar on top:
- **Toolbar**: switch pages, **Page ▾** (tab title, search description, new/delete page), **+ Section ▾** (add a section from templates), Desktop/Tablet/Phone preview, Undo, Preview (click around normally), Save (`⌘S`), Publish.
- **Text**: click any heading, paragraph, button or link and type. `Shift+Enter` adds a line break; `⌘B`/`⌘I` for bold/italic.
- **Options card**: clicking something opens a small card next to it with its options: link target, image upload/library and alt text, duplicate/move/delete the item or its whole section, dark green background.
- **Save** writes straight into the HTML files. Header and footer edits are copied to every page.
- **Publish** commits all changes and pushes to GitHub, which redeploys the live site.

http://localhost:4000/ shows the plain site without the editor. The CMS only runs on your machine and is never deployed; its code lives in `cms/`.

## Deploy to GitHub Pages
Deploys automatically via `.github/workflows/pages.yml` on every push to `main`.

One-time setup: in the repo go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
The site is then served at `https://alpinemily.github.io/website-for-cata/`.

Custom domain (optional): add it under Settings → Pages, then point your DNS at GitHub Pages
(a `CNAME` record to `alpinemily.github.io` for a subdomain, or GitHub's A records for an apex domain).

## Before launch, replace these
- **Photos**: images are soft green blob placeholders (`assets/img/blob-*.svg`). Drop real photos in `assets/img/` and update the `src` attributes (search for `blob-`).
- **Bio**: on `about.html`, look for `<!-- EDIT -->` comments and add Cata's real story and credentials.
- **Email**: `hello@hivibessupply.com` appears in `assets/js/main.js` and the footer and contact page.
- **Forms**: create a free form at https://formspree.io and replace `YOUR_FORM_ID` (contact page + newsletter blocks). Until then, submitting opens an email draft.
- **Events**: update dates on `gatherings.html` and the home page cards.
- **Social links**: LinkedIn/Instagram URLs in the footer and contact page.

## Design
Colors and fonts are CSS variables at the top of `assets/css/style.css`:
cream `#f4efe6`, olive `#2f3a2b`, lime accent `#d7f26b`, clay `#e7a17a`. Headings use Instrument Serif and body text uses Inter Tight (Google Fonts).
