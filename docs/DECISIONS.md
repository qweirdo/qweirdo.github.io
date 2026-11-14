# Project Qweirdo — Architecture & Policy Decisions

This document records the official architectural, security, and content policy decisions agreed upon for the Project Qweirdo hardening project.

---

## Decision D1: Live Wall Deployment Model
- **Decision:** Keep live wall on Cloudflare Pages with Turnstile bot protection, strict origin-locking, and rate-limiting.
- **Rationale:** Preserves the global shared fresco real-time co-working experience across both `https://qweirdo.github.io` and `https://qweirdo.pages.dev`, protected against spam, quota exhaustion, and unauthorized origin posting.
- **Implementation:**
  - Cloudflare Pages Functions at `/api/wall` and `/api/sketch`.
  - Origin-locking: CORS restricts POST requests to `https://qweirdo.github.io` and `https://qweirdo.pages.dev` (and localhost in dev).
  - Turnstile token verification on POST requests (`env.TURNSTILE_SECRET`).
  - IP-based sliding rate limiter (12–20 req/min).

---

## Decision D2: Word & Content Moderation Policy
- **Decision:** Auto-block sensitive terms.
- **Rationale:** Strict, deterministic filtering across client, issue ingestion workflow, and Cloudflare functions.
- **Implementation:**
  - Standardized Unicode NFKC normalization and token/word-boundary matching via unified module `src/filter.js`.
  - Hard auto-block on slurs, explicit sexual terms, violent incitement, terrorism, and political extremism.
  - Safe allowlisting for innocent words with substring overlaps (e.g., *grape*, *peacock*, *Dickens*, *therapeutic*, *suspicious*, *Fukushima*, *crisis*).
  - Proper Unicode script handling for non-Latin writing systems (Bengali, Devanagari, Cyrillic, CJK).

---

## Decision D3: NFT Covenant & Revenue-Share Wording
- **Decision:** Default — Remove covenant and revenue-share wording from the UI, modal dialogs, and folio exports until legally reviewed.
- **Rationale:** Project Qweirdo is a not-for-profit digital sanctuary. Commercial revenue-share promises create unnecessary legal and regulatory exposure.
- **Implementation:**
  - Clean cultural licensing under Creative Commons CC BY-NC 4.0.
  - Retain cryptographic proof: canvas timestamping and immutable SHA-256 hash generation for folio exports.
  - Strip all promises of a "50/50 treasury" or commercial NFT minting proceeds.

---

## Decision D4: Live Wall Thumbnail Storage
- **Decision:** Alternative — Retain the base64 `image` field with strict MIME validation and server-side magic byte verification.
- **Rationale:** Allows visual previews in the live wall archive tray while preventing Stored XSS, pixel flooding, and MIME-confusion attacks.
- **Implementation:**
  - Client & Server regex enforcement:
    `const SAFE_THUMB = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;`
    Length strictly bounded under 28,000 characters.
  - Server-side binary magic byte inspection:
    - PNG: `89 50 4E 47` (`\x89PNG`)
    - JPEG: `FF D8 FF`
    - WebP: `RIFF....WEBP`
  - Client rendering: Safe DOM construction (`document.createElement('img')`) with `safeThumb` validation, never raw template string insertion into `innerHTML`.
