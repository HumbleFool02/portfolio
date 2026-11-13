# Piyush Kasle — portfolio

A single-page portfolio set against a live night sky: the 32 constellations drawn at their real
J2000 positions, drifting slowly behind the content.

Plain HTML, CSS and ES modules. No build step and no dependencies. Fonts, icons and everything else are
served from the site itself, so a visit makes no requests to anyone else (apart from Cloudflare's
cookieless analytics once deployed).

## Run it

The page loads `data/sky.json` with `fetch`, so it needs a local server (opening the file
directly won't work):

```bash
python3 scripts/serve.py
```

Then open <http://localhost:8000>. It's the standard Python file server, plus: it sends the live site's
security headers from `_headers` (so anything the policy would block in production is blocked here too),
it makes the browser check for newer files on every load, so edits show up on a normal reload, and a
missing page gets `404.html`.

## Layout

```
index.html              all content and markup, plus the SVG icon sprite
assets/css/site.css     design tokens (top of file), then one block per component
assets/js/intro-gate.js runs before first paint: hides the page for the warp, shows the Enter screen
assets/js/enter-gate.js the Enter screen: its click starts the warp, with sound if chosen
assets/js/main.js       entry point that wires up each piece below
assets/js/sky.js        canvas sky: constellations, dust, cursor, gravity well, meteors, warp intro
assets/js/page-bend.js  the page's words and cards lean into the gravity well, one word at a time
assets/js/ship-cursor.js the spacecraft cursor, which falls into the black hole while you hold
assets/js/timeline.js   Experience section: the line fills and each stop lights as you scroll
assets/js/sidereal.js   local sidereal time clock in the hero
assets/js/comet.js      the comet that circles the hero button's edge
assets/js/sunmoon.js    sun by day, moon by night in the hero, drawn on a canvas (real moon phase)
assets/js/gravity-bend.js  lets the sun or moon lean into the gravity well and recoil on release
assets/js/project-cards.js opens each project card's write-up in a dialog
assets/js/project-deck.js  pins Projects at 1000px and wider while the cards ride in one by one
assets/js/warp-sound.js the warp's sound, made with Web Audio (no audio files)
assets/js/hole-sound.js the black hole's sound while you hold: NASA's Perseus cluster sonification
assets/js/email-links.js email links copy the address and offer Gmail or the mail app
assets/resume/          the resume PDF; links open it in the browser's viewer, in a new tab
assets/icons/           favicon (SVG, 32px PNG, apple-touch-icon) and the text-badge stack icons. The favicon
                        is from Icons8, whose free licence needs a visible link to icons8.com: it's in the
                        footer and on the 404 page
assets/icons/brands/    the stack's logos, from Simple Icons (CC0), saved here rather than loaded from a CDN
assets/fonts/           Space Grotesk and JetBrains Mono (woff2, SIL Open Font License, licences beside them)
assets/audio/           the black hole's sound, a 20 s seamless loop (AAC, 111 KB)
data/sky.json           constellation data, generated (don't edit by hand)
scripts/constellations.py
scripts/build.sh        copies just the site into dist/ for publishing
scripts/serve.py        local dev server
404.html, _headers      the not-found page and the security headers (published with the site; see Security)
.well-known/security.txt  how to report a security problem (RFC 9116); renew its Expires date yearly
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

## The black hole's sound

Holding the mouse on the page plays NASA's sonification of the black hole at the centre of the Perseus
galaxy cluster: pressure waves in the cluster's hot gas, raised 57 and 58 octaves so they can be heard
([Chandra X-ray Center, 2022](https://chandra.si.edu/sound/perseus.html)). The sound fades in once the hole has been held for a
moment (an ordinary click stays quiet), grows louder and lower as it charges, pans to follow the hole,
and falls away with a low thump when you let go. Visitors who came in without sound don't hear it, and
the "replay warp, with sound" button turns it back on.

`assets/audio/perseus-black-hole.m4a` is cut from NASA's `perseus_sonification.mp4`: the first 22 s,
with the last 2 s blended into the start so it loops without a seam, then encoded as 48 kbps AAC.
Chandra asserts no copyright over it and asks for credit, which is in the footer:
NASA/CXC/SAO/K. Arcand, SYSTEM Sounds (M. Russo, A. Santaguida).

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

How many cards share a row depends on how many fit. At 1000px and wider all four sit in one overlapping,
slightly tilted row, and the section pins while they ride in one by one (`assets/js/project-deck.js`).
Narrower screens get an upright grid, two to a row, and phones (620px and narrower) one card under
another; there each card rises in as it scrolls into view.

Photos and screenshots go in `assets/img/`. A `.gallery` takes one to three `<figure class="media">`:
one fills the row; with more, the first sits beside a stack of the others.

## Security

All the protective headers live in `_headers`, the one place they're set (the pages carry no `<meta>` copy).
Cloudflare sends them with every file, and `scripts/serve.py` sends the same ones locally.

- **Content-Security-Policy**: everything comes from this site. The only outside hosts are Cloudflare's
  analytics beacon (`static.cloudflareinsights.com`) and where it reports (`cloudflareinsights.com`).
  No inline scripts or `style` attributes, no plugins, frames or forms, and other sites can't frame this
  one. So scripts go in `assets/js/`, styles in `site.css`, and any new outside service has to be added
  to the policy. Trusted Types is enforced: code may not write HTML or script URLs into the page
  (`innerHTML` and the like), so build elements with `createElement` and `textContent`.
- **HSTS** (one year, subdomains too), `nosniff`, `X-Frame-Options: DENY`, a referrer policy that sends
  other sites only the origin, and a permissions policy that turns off sensors, camera, microphone,
  location, payments, USB and ad topics. Autoplay is left alone so the sounds can play after a click.
- **Cross-origin isolation of the window and files**: `Cross-Origin-Opener-Policy` and
  `Cross-Origin-Resource-Policy` are both `same-origin`.
- **The resume PDF** (`/assets/resume/*`) is sent with `X-Robots-Tag: noindex`, so search engines don't
  list it and its phone number. The `pages.dev` address is noindexed too, so only the custom domain is
  listed.
- Only `dist/` is published (see Deploy), so the README, `scripts/`, `.claude/` and `.vscode/` stay local.
- `scripts/serve.py` listens on this machine only and refuses hidden paths such as `/.git/`.

To check the policy after a change, run `sh scripts/build.sh`, then `python3 scripts/serve.py --root dist`,
go through the page with the browser console open, and look for "Refused to" messages.

## Deploy (Cloudflare Pages)

Free, with no bandwidth cap, and it redeploys on every push to `main`. `dist/` holds only `index.html`,
`404.html`, `_headers`, `.well-known/`, `assets/` and `data/`, so the README, scripts and editor settings
are never published. To check a build locally: `sh scripts/build.sh` then `python3 scripts/serve.py --root dist`.

First time setup, in this order:

1. **Accounts**: turn on two factor sign in for Cloudflare (a security key or an authenticator app) and
   GitHub.
2. **Domain**: buy it in Cloudflare Registrar with auto renew on, then turn on DNSSEC (DNS → Settings).
3. **Pages project**: Workers & Pages → Create → Pages → Connect to Git. When GitHub asks, give the
   Cloudflare app access to **only this repository**. Framework preset **None**, build command
   **`sh scripts/build.sh`**, build output **`dist`**, production branch **`main`**. Under Settings →
   Builds → Branch control, set preview deployments to **None**, so no other branch gets a public address.
4. **Custom domain**: add the domain and `www` in the project's Custom domains tab. Then redirect
   `www` and `<project>.pages.dev` to the bare domain with a Bulk Redirect (Rules → Bulk Redirects).
5. **Zone settings that would break the policy or the email links**, all off: Scrape Shield → Email
   Address Obfuscation, Speed → Rocket Loader, Security → Bot Fight Mode, and Zaraz. SSL/TLS → Edge
   Certificates: Always Use HTTPS on, minimum TLS 1.2, TLS 1.3 on. Leave the dashboard's HSTS setting off:
   `_headers` already sends it.
6. **DNS records** so nobody can send email as the domain (it sends none):
   `TXT @ "v=spf1 -all"`, `TXT _dmarc "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s"` and `MX @ 0 .`
   (a null MX). If you later want email at the domain, replace these with Cloudflare Email Routing's.
7. **Analytics**: the Pages project → Metrics → Web Analytics → Enable. Cloudflare adds its beacon to
   every page; the policy already allows it.
8. **GitHub**: Settings → Rules → a ruleset on `main` that blocks force pushes and deletion.
9. Add `Canonical: https://<domain>/.well-known/security.txt` to `.well-known/security.txt`.

After each deploy, check the headers arrive (`curl -sI https://<domain>/`), that a missing page answers
404 with the same headers, and that `/README.md` and `/.git/config` are 404. Mozilla's HTTP Observatory
and SSL Labs grade the headers and TLS.

To undo a bad deploy: the Pages project → Deployments → pick an earlier one → Rollback. Or `git revert`
the change and push.

## Credits

- Black hole sound: NASA/CXC/SAO/K. Arcand, SYSTEM Sounds (M. Russo, A. Santaguida), credited in the footer.
- Favicon: Icons8 (free licence with a link, in the footer and on the 404 page).
- Fonts: Space Grotesk and JetBrains Mono, SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`).
- Stack logos: Simple Icons, CC0.

## Still placeholder

Anything wrapped in `<span class="todo">` shows with a dashed underline: a Robocon video link and the
Robocon photos.

All copy follows the master profile: availability is "Available to start immediately", and prose avoids
hyphens and dashes (project and library names keep theirs).
