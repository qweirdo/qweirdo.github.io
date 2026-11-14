# Project Qweirdo · Digital Graffiti; Perpetual Expressions

[![License: AGPL v3](https://img.shields.io/badge/Code_License-AGPL_v3-4a58c4.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Art & Copy: CC BY-NC 4.0](https://img.shields.io/badge/Art_%26_Prose-CC_BY--NC_4.0-8e3fb0.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Stack: Vanilla HTML/CSS/JS](https://img.shields.io/badge/Stack-Plain_HTML_%C2%B7_CSS_%C2%B7_JS-b8405e.svg)](#)

> *"Project Qweirdo is a proudly pointless digital sanctuary—and by virtue of that exact refusal, entirely singular. Unencumbered by feeds, algorithmic friction, telemetry, or modern web pollution, it offers a rare pause: a place to drift, doodle, and leave anonymous marks across a living, shared urban wall that breathes with time."*

**Live Installations:**
- **Primary Live Wall & Studio:** [https://qweirdo.pages.dev/](https://qweirdo.pages.dev/)
- **Static GitHub Pages Mirror:** [https://qweirdo.github.io/](https://qweirdo.github.io/)

---

## Architecture & Deployment Model

Project Qweirdo operates on a secure dual-deployment model:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Cloudflare Pages (Live)     │       │   GitHub Pages (Static Mirror)  │
│    https://qweirdo.pages.dev    │       │    https://qweirdo.github.io    │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ • Functions: /api/wall, sketch  │       │ • Built from _site/ allowlist   │
│ • KV Storage: QWEIRDO_WALL      │◄──────┤ • Safe offline fallback         │
│ • Workers AI: @cf/meta/llama-3  │ CORS  │ • Cross-origin sync via         │
│ • Turnstile bot challenge       │       │   origin-locked API headers     │
│ • Sliding-window IP rate limit  │       │ • Static Edition Ledger         │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

1. **Cloudflare Pages Production (`qweirdo.pages.dev`):**
   - Hosts the dynamic live graffiti wall (`/api/wall`) and Workers AI generative sketch engine (`/api/sketch`).
   - Backed by Cloudflare Workers KV (`QWEIRDO_WALL`) and Workers AI (`AI`).
   - Protected by Cloudflare Turnstile token verification (`TURNSTILE_SECRET`), strict origin-locked CORS, sliding-window IP rate limiting, and binary magic-byte verification on base64 thumbnails.
   - Deployed strictly via `npm run deploy:qweirdo` (`wrangler pages deploy . --project-name=qweirdo --branch=main`).

2. **GitHub Pages Static Mirror (`qweirdo.github.io`):**
   - Built securely via `npm run build` (`scripts/build-site.mjs`) into an isolated `_site/` directory containing only public runtime assets.
   - Deployed automatically via `.github/workflows/static.yml` using `actions/deploy-pages@v4`.
   - Accesses `https://qweirdo.pages.dev/api/wall` cross-origin (with graceful local fallback if offline or unreachable).
   - Inscribes approved public offerings into `data/edition.json` via GitHub Actions (`.github/workflows/offering.yml`).

---

## About the Installation

**Project Qweirdo** is an open, not-for-profit digital humanities and generative street-art sanctuary. Set on a monumental aged manuscript vellum substrate that fuses parchment textures with urban street epigraphy, it invites visitors to pause, create, and collaborate slowly.

### Core Capabilities

- **The Living Urban Wall & Deckled Mini-Canvases:** A tactile paper-and-wall substrate with laid chain lines, wire watermark grids, rag fibers, and craquelure. Form focused mini-canvases in illuminated cartouches and blend them into the master wall with deckled edges.
- **Philatelic & Geometric Stamp Forge:** 8 procedural motifs inspired by stamps of philately (perforated postage stamps, circular postmarks, heraldic wax seals) and mathematical wonders (Metatron's cube, golden ratio nautilus spirals, Penrose decagrams, Guilloché banknote rosettes, flower of life).
- **Premium Scriptorium Palette:** 10 curated mineral enamels (Illuminated Gold, Lapis Lazuli, Venetian Oxblood, Verdigris Teal, Florentine Sage, Tyrian Purple, Walnut Bistre, Pompeian Terracotta, Sterling Silver, Opal Obsidian) plus an infinite spectral color picker.
- **Art by Issue & Static Edition Ledger:** Public offerings submitted via GitHub Issues are validated and committed to `data/edition.json` via GitHub Actions. Every visitor renders the exact same wall deterministically through a seeded PRNG derived from offering IDs and words.
- **Ambient Machine Conservator:** A slow, quiet generative engine that cultivates lichen crystal blooms, mineral patina washes, and water drips strictly around human marks.
- **Content Security & Respectful Commons:** Multi-layered security filters prevent politically sensitive, extremist, terror-affiliated, and abusive messages across the canvas and issue submission ledger, safeguarding a contemplative digital sanctuary.
- **Cryptographic Provenance:** Every exported broadside is stamped with an immutable SHA-256 hash validating creation timestamp and inspirer lineage.

---

## Local Development & Testing

```bash
# Install development dependencies
npm install

# Run unit tests and security regressions
npm test

# Validate data/edition.json against schema
npm run check:schema

# Build static distribution to _site/
npm run build
```

---

## Cultural Rights & Licensing

- **Software Source Code:** Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
- **Artworks & Prose:** Licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/). Artworks are 100% free to share, download, exhibit, and teach with attribution to Project Qweirdo. Commercial exploitation and unapproved NFT minting are restricted.
- **Zero Telemetry:** Zero ads, zero cookies, zero surveillance analytics. 100% client-side computing.

**Created by [Subhradeep Chatterjee](https://github.com/qweirdo)**  
*Digital Graffiti; Perpetual Expressions · Open · Not-for-Profit · 2026*
