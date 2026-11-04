# Hi Vibes Supply — website (Cata Catibayan)

Static site (plain HTML/CSS/JS, no build step) for GitHub Pages.

## Pages
- `index.html` — home
- `about.html`
- `coaching.html` — 1:1 coaching + integration (`#integration`)
- `gatherings.html` — retreats, workshops, events calendar (`#calendar`)
- `advisory.html` — consulting/advisory + speaking (`#speaking`)
- `contact.html`
- `404.html`

## Deploy to GitHub Pages
1. Create a repo (e.g. `hivibessupply.github.io` for a root URL, or any name for `username.github.io/repo`).
2. Push these files to the `main` branch.
3. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**.
4. Custom domain (optional): add it under Settings → Pages; GitHub will create a `CNAME` file.

## Before launch, replace these
- **Photos**: `assets/img/*.svg` are soft placeholder art. Drop real photos in `assets/img/` and update the `src` attributes (search for `assets/img/`).
- **Bio**: on `about.html`, look for `<!-- EDIT -->` comments and add Cata's real story and credentials.
- **Email**: `hello@hivibessupply.com` appears in `assets/js/main.js` and the footer and contact page.
- **Forms**: create a free form at https://formspree.io and replace `YOUR_FORM_ID` (contact page + newsletter blocks). Until then, submitting opens an email draft.
- **Events**: update dates on `gatherings.html` and the home page cards.
- **Social links**: LinkedIn/Instagram URLs in the footer and contact page.

## Design
Colors and fonts are CSS variables at the top of `assets/css/style.css`:
olive `#3a4335`, moss `#56634d`, mist `#c6c9cc`. Headings use Jost and body text uses DM Sans (Google Fonts).
