# Piyush Kasle — portfolio

A single-page portfolio set against a live night sky: the 32 constellations drawn at their real
J2000 positions, drifting slowly behind the content.

Plain HTML, CSS and ES modules. No build step and no dependencies.

## Run it

The page loads `data/sky.json` with `fetch`, so it needs a local server (opening the file
directly won't work):

```bash
python3 scripts/serve.py
```

Then open <http://localhost:8000>. It's the standard Python file server, plus a header that makes the
browser check for newer files on every load, so edits show up on a normal reload.

## Layout

```
index.html              all content and markup, plus the SVG icon sprite
assets/css/site.css     design tokens (top of file), then one block per component
assets/js/intro-gate.js runs before first paint: hides the page for the warp, shows the Enter screen
assets/js/enter-gate.js the Enter screen: its click starts the warp, with sound if chosen
assets/js/main.js       entry point that wires up each piece below
assets/js/sky.js        canvas sky: constellations, dust, cursor, gravity well, meteors, warp intro
assets/js/timeline.js   Experience section: the line fills and each stop lights as you scroll
assets/js/sidereal.js   local sidereal time clock in the hero
assets/js/comet.js      the comet that circles the hero button's edge
assets/js/sunmoon.js    sun by day, moon by night in the hero, drawn on a canvas (real moon phase)
assets/js/gravity-bend.js  lets the sun or moon lean into the gravity well and recoil on release
assets/js/project-cards.js opens each project card's write-up in a dialog
assets/js/project-deck.js  pins Projects on wider screens while the cards ride in one by one
assets/js/warp-sound.js the warp's sound, made with Web Audio (no audio files)
assets/js/email-links.js email links copy the address and offer Gmail or the mail app
assets/resume/          the resume PDF; links open it in the browser's viewer, in a new tab
assets/icons/           favicon (SVG, 32px PNG, apple-touch-icon) and the text-badge stack icons
data/sky.json           constellation data, generated (don't edit by hand)
scripts/constellations.py
scripts/build.sh        copies just the site into dist/ for publishing
scripts/serve.py        local dev server
404.html, _headers      the not-found page and the host's security headers (published with the site)
```

## Constellation data

`scripts/constellations.py` holds each figure's stars (RA/Dec, magnitude) and stick-figure lines,
and writes the projected shapes the canvas draws. To add a figure, add an entry to `C` in the
script and regenerate:

```bash
python3 scripts/constellations.py > data/sky.json
```

Each figure is drawn with its name; the data holds all 32.

## Retuning the look

Colours live in `:root` at the top of `assets/css/site.css`. The canvas reads `--pk-accent-rgb`
from there too, so changing the accent in that one place changes it everywhere. The sky is midnight
blue; the original neutral-black values are noted in a comment beside `--pk-bg`.

Motion respects `prefers-reduced-motion`: no warp intro, no drift or twinkle, no gravity well,
and the hero button keeps its outline without the circling comet.

## The warp and the Enter screen

Browsers only allow sound after the visitor clicks or taps the page. So on a first visit the starfield
shows an Enter screen: "Enter" starts the warp with sound, "enter without sound" (or Esc) starts it
silently. It appears once per browser session, and never for links straight to a section or project
(`#contact`, `#p-robocon`), which open on their content. Reduced motion skips the warp and the screen.
"↻ replay warp, with sound" in the footer plays it again.

## Sun and moon

From 6 am to 6 pm on the visitor's clock the hero shows the sun; otherwise the moon, at tonight's real
phase. It is all drawn in code by `assets/js/sunmoon.js` (no images) and only starts once the warp
intro has finished. The sun is drawn the way a hydrogen alpha telescope photographs it: a deep
orange disk of fine fibrils and dark filaments, a bright fuzzy limb with prominences, in an orange glow. Preview either one with `?sky=sun`, `?sky=moon` or `?sky=moon&phase=full`.
`mode: 'melbourne'` in `assets/js/main.js` switches at real sunrise and sunset over Melbourne, Florida.

## Projects

Every project in `#projects` uses the same skeleton: a head (number, title, links, meta line), a lede, tags,
then whichever detail blocks it needs: metrics, a decision log, a callout, a facts grid, or media.
On the page each project shows as a square card (`.pcard`: a cover drawn in SVG, one line, two
numbers); clicking it opens the full write-up in a `<dialog>` (`assets/js/project-cards.js`), and a link
to `#p-<name>` opens that project directly. Adding a project means a card and a dialog.

Photos and screenshots go in `assets/img/`. A `.gallery` takes one to three `<figure class="media">`:
one fills the row; with more, the first sits beside a stack of the others.

## Security

- `index.html` sets a Content-Security-Policy: only this site, Google Fonts and the Simple Icons CDN may
  load anything, and inline scripts and inline `style` attributes are blocked. So scripts go in
  `assets/js/`, styles in `site.css`, and a new outside service (analytics, say) needs adding to the policy.
- `_headers` gives Cloudflare the protections a meta tag can't: no framing by other sites
  (`frame-ancestors 'none'`), `nosniff`, HSTS, a referrer policy and a locked-down permissions policy.
- Only `dist/` is published (see Deploy), so `scripts/`, `.claude/` and `.vscode/` stay local.
- `scripts/serve.py` listens on this machine only and refuses hidden paths such as `/.git/`.

## Deploy (Cloudflare)

Free, with no bandwidth cap, a private repo is fine, and it redeploys on every push.

1. Put the repo on GitHub (it can be private).
2. In the Cloudflare dashboard: Workers & Pages → Create → Pages → Connect to Git → pick the repo.
3. Build settings: framework preset **None**, build command **`sh scripts/build.sh`**, build output
   directory **`dist`**. Deploy. The site goes live at `<project>.pages.dev`.
4. Optional: a custom domain (Custom domains tab). Cloudflare Registrar sells domains at cost.

`dist/` holds only `index.html`, `404.html`, `_headers`, `assets/` and `data/`, so the README, scripts and
editor settings are never published. To check a build locally: `sh scripts/build.sh` then
`python3 scripts/serve.py --root dist`.

## Still placeholder

Anything wrapped in `<span class="todo">` shows with a dashed underline: a Robocon video link and the
Robocon photos.

All copy follows the master profile: availability is "Available to start immediately", and prose avoids
hyphens and dashes (project and library names keep theirs).
