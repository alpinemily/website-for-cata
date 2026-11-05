# Hi Vibes Supply — website for Cata Catibayan

Website for Hi Vibes Supply: coaching, retreats and workshops.
It's a plain HTML/CSS/JS site with no build step, hosted free on GitHub Pages, plus a click-to-edit visual editor that runs on your own computer.

- **Live site:** https://emilybei.com/website-for-cata/ (GitHub's default address, `alpinemily.github.io/website-for-cata/`, redirects there)
- **Edit the site:** double-click **Edit Website** (see below), or run `npm run cms` and open http://localhost:4000/admin

**Contents**
1. [Editing the website (no tech skills needed)](#1-editing-the-website-no-tech-skills-needed)
2. [The editor in detail](#2-the-editor-in-detail)
3. [Publishing and hosting](#3-publishing-and-hosting)
4. [For developers](#4-for-developers)
5. [Design](#5-design)
6. [Before launch](#6-before-launch)

---

## 1. Editing the website (no tech skills needed)

You edit the website in your web browser by clicking the text and pictures you want to change.
There's a short setup the first time; after that it's a double-click.

### One-time setup (about 10 minutes)

**1. Get access.** Ask Emily to add you to the website on GitHub. You'll get an email invite; accept it.
(No GitHub account yet? Make a free one at https://github.com/signup first.)

**2. Install GitHub Desktop.** It keeps your copy of the website in sync and sends your changes online.
- Download it from https://desktop.github.com and open it.
- Sign in with your GitHub account.
- Click **Clone a repository**, choose **website-for-cata**, then click **Clone**.
  This puts a folder called `website-for-cata` on your computer, usually in `Documents/GitHub`.

**3. Install Node.js.** It's a free program the editor needs in the background. You never have to open it.
- Download the **LTS** version from https://nodejs.org/en/download
- Open the downloaded file and click **Continue / Install** until it's done.

That's it for setup.

### Editing

1. Open the `website-for-cata` folder and double-click **Edit Website**.
   - On a Mac it's `Edit Website.command`. On Windows it's `Edit Website.bat`.
   - **Mac, first time only:** if it says the file "can't be opened", right-click it, choose **Open**, then click **Open** again.
   - If Node.js isn't installed yet, a message pops up with a **Download** button.
2. A small window with some text appears. **Leave it open** while you edit (you can minimize it).
   The editor opens in your browser on its own.
3. Make your changes:
   - **Change text:** click it and type.
   - **Change a picture:** click it, then click **Upload new image…**.
   - **Change where a button or link goes:** click it and edit "Goes to".
   - **Copy, move or delete something:** click it and use the buttons in the small dark box next to it.
   - **Add a new section:** click **+ Section** at the top.
   - **Go to another page:** use the menu at the top left.
   - **See how it looks on a phone:** click **Phone** at the top.
4. Click **Save** (top right) when you're happy with a change.
5. Click **Publish** to put your changes on the real website. They show up online a minute or two later.
6. When you're done, close the small window from step 2.

**Made a mistake?** Click **Undo** for things you moved, copied or deleted. For typing, press ⌘Z (Mac) or Ctrl+Z (Windows).
If something goes really wrong, close the browser tab **without saving** and nothing changes.

### If Publish asks you to use GitHub Desktop

Sometimes the editor can't send changes online by itself. Your changes are already saved, so nothing is lost.
1. Open **GitHub Desktop**.
2. At the bottom left, type a few words about what you changed, then click **Commit to main**.
3. At the top, click **Push origin**.

### Good to know

- Each time you double-click **Edit Website**, the editor first downloads the latest version of the site, so you see what others have published. It skips this if you have changes you haven't published yet.
- Avoid two people editing at the same time. If it happens, publish one person's changes first.
- Stuck? Take a screenshot of the message and send it to Emily.

---

## 2. The editor in detail

The editor lives at **http://localhost:4000/admin** while it's running. The site fills the window, with a slim toolbar on top.

**Toolbar (left to right)**
- **Page switcher:** pick which page to edit. The address bar follows (e.g. `/admin?page=about.html`), so refreshing keeps your place.
- **Page ▾:** the browser tab title and search-engine description for the page, plus **New page** and **Delete page**. You can't delete `index.html` or `404.html`.
- **+ Section ▾:** add a section from 9 templates: Hero, Text, Text + image, Cards (3), Bullet list, FAQ, Events, Quote, Newsletter. It goes below the selected section, or at the end of the page.
- **Desktop / Tablet / Phone:** preview the page at different screen widths.
- **Undo:** reverses block and section changes (copy, move, delete, add, background).
- **Preview:** turns editing off so you can click links and browse normally without leaving the editor.
- **Save** (⌘S / Ctrl+S): writes changes into the page's HTML file.
- **Publish:** saves, then sends everything to GitHub so the live site updates.

**Editing on the page**
- **Text:** click any heading, paragraph, label, button, link, list item, FAQ question, event, menu or footer item and type. `Shift+Enter` adds a line break, and ⌘B / ⌘I make text bold or italic. Pasted text comes in as plain text.
- **Options card:** clicking something opens a small card beside it. Depending on what you clicked, it shows:
  - **Link:** where it goes (with suggestions for the site's pages), open in a new tab, dark button style.
  - **Image:** upload a new one (saved to `assets/img/uploads/`), pick an existing one, and alt text for screen readers.
  - **Form:** placeholder text, dropdown options, and the Formspree address the form sends to.
  - **This item:** duplicate, move up or down, or delete the card, FAQ, event, list item, menu link and so on.
  - **Section:** duplicate, move, delete, or switch the dark green background on or off.
- **Header and footer** edits are copied to every page when you save. Each page still highlights its own menu link.
- Leaving a page with unsaved changes asks you to confirm first.

http://localhost:4000/ shows the plain site with no editor on it, the way visitors see it.

---

## 3. Publishing and hosting

**How publishing works.** Clicking **Publish** in the editor does three things: it records a version of all changes (a git commit), picks up anything others published in the meantime, and pushes to GitHub. Every push to `main` triggers `.github/workflows/pages.yml`, which redeploys the live site within a minute or two.
You can also publish from GitHub Desktop (**Commit to main**, then **Push origin**) or with `git push`.

**What gets deployed.** Only the site itself: the `*.html` pages, the `assets/` folder and `.nojekyll`. The editor (`cms/`), the launchers, `package.json` and this README are never put online.

**GitHub Pages setup (already done).** In the repo, **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**. Don't click "Configure" on the suggested Jekyll or Static HTML workflows; this repo has its own.

**Custom domain (optional).** To give the site its own domain, add it under **Settings → Pages → Custom domain**, then with your domain provider point a `CNAME` record for a subdomain (like `www`) at `alpinemily.github.io`, or use GitHub's A records for a bare domain. GitHub shows the exact values.

**Giving someone edit access.** Repo **Settings → Collaborators → Add people**. They need this to publish.

---

## 4. For developers

**Run the editor from a terminal** (Node 18+; no dependencies, no install step):

```
npm run cms            # or: node cms/server.js --open   (also opens the browser)
PORT=4001 npm run cms  # use a different port
```

**Files**

```
index.html, about.html, coaching.html,   the pages (coaching has #integration,
gatherings.html, contact.html, 404.html    gatherings has #calendar)
assets/css/style.css                      all styles; colors and fonts are CSS variables at the top
assets/js/main.js                         mobile menu, fade-in on scroll, footer year, form email fallback
assets/img/                               favicon, blob placeholders, uploads/ (editor uploads)
cms/server.js                             local editor server: serves the site, saves pages, uploads, publishes
cms/admin.html|js|css                     the /admin toolbar app
cms/editor.js|css                         the click-to-edit layer loaded inside the page
Edit Website.command / Edit Website.bat   double-click launchers for Mac / Windows
.github/workflows/pages.yml               GitHub Pages deploy
.gitattributes                            keeps launcher line endings correct per OS
```

**How the editor works**
- `cms/server.js` serves the repo on `127.0.0.1:4000` only. `/admin` loads the toolbar app, which shows each page in a frame as `/<page>.html?edit`. Only `?edit` requests get the editing layer.
- Saving sends the page's cleaned-up body back to the server, which splices it into the HTML file and tidies the browser's formatting. A save with no edits leaves the file byte-for-byte identical, so git diffs stay clean. Header and footer changes are copied to every page, and each page's `aria-current` menu link is set correctly.
- Protections: write requests from other websites are rejected, only top-level `*.html` pages can be written, and `.git`/`cms/` source can't be requested through the server.
- On launch, if the working tree is clean, the server runs `git pull --ff-only`. If the editor is already running, launching again just opens the browser.
- Publish runs `git add -A`, `git commit`, `git pull --rebase`, then `git push`, and shows plain-language messages if any step fails. On macOS it checks that real developer tools are installed before calling git, to avoid the "install developer tools" popup.

---

## 5. Design

- **Colors** (CSS variables at the top of `assets/css/style.css`): cream `#f4efe6`, deep olive `#2f3a2b`, lime accent `#d7f26b`, clay `#e7a17a`.
- **Fonts** (Google Fonts): Instrument Serif for headings, Inter Tight for body text.
- **Style:** restrained headline sizes; the home page shows the intro, the main call to action and both services on the first screen without scrolling. Rounded cards, pill buttons, dark green sections as rounded panels, a static lime bar listing the services, and a sticky header with a blurred background.
- **Placeholder images:** soft blurred green blobs (`assets/img/blob-1.svg` to `blob-6.svg`).
- **Favicon:** lime ✺ on deep olive (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` for iPhone home screens).
- **Services:** 1:1 Coaching (with Integration) and Retreats & Workshops. Advisory and Speaking were removed.

---

## 6. Before launch

Replace these placeholders. Most can be done in the editor.

- **Headings and labels:** most are short lorem-ipsum placeholders (2–3 words). Click and type to replace them.
- **Photos:** swap the green blobs for real photos. Click an image in the editor and choose **Upload new image…**.
- **Bio:** on the About page, add Cata's real story and credentials (marked `<!-- EDIT -->` in `about.html`).
- **Email:** `hello@hivibessupply.com` appears in the footer, the contact page and `assets/js/main.js`.
- **Forms:** create a free form at https://formspree.io and paste its address in the editor (click a form field, then "Form sends to"), or replace `YOUR_FORM_ID` in the contact page and newsletter blocks. Until then, submitting opens an email draft.
- **Events:** update the dates on the Retreats & Workshops page and the event cards on the home page.
- **Social links:** LinkedIn and Instagram addresses in the footer and contact page.
- **Old art:** `assets/img/gathering.svg`, `hero.svg`, `horizon.svg`, `path.svg`, `portrait.svg` and `still.svg` are leftovers from the first design and no longer used. You can delete them.
