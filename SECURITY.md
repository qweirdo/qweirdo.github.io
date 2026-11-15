# Security Policy · Project Qweirdo

Project Qweirdo is committed to maintaining a safe, transparent, private, and resilient digital sanctuary for generative art and digital humanities.

---

## 1. Supported Deployments

| Deployment / Target | URL | Status |
| :--- | :--- | :--- |
| **Cloudflare Pages (Live Wall & API)** | `https://qweirdo.pages.dev/` | Supported |
| **GitHub Pages (Static Mirror)** | `https://qweirdo.github.io/` | Supported |
| **Edge Functions (`/api/wall`, `/api/sketch`)** | `functions/api/*` | Supported |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability, flaw, or potential risk in Project Qweirdo, please report it responsibly:

1. **GitHub Private Security Advisory:** Submit a confidential advisory via [GitHub Security Advisories](https://github.com/qweirdo/qweirdo.github.io/security/advisories/new).
2. **Maintainer Contact:** You may contact the lead maintainer directly via GitHub profile: [@qweirdo](https://github.com/qweirdo).

### Vulnerability Response Timeline
- **Initial Acknowledgement:** Within 48 hours.
- **Triage & Reproduction:** Within 72 hours.
- **Remediation & Patch Deployment:** Critical vulnerabilities are prioritized for resolution within 5 business days.

Please do not open public issues for sensitive security vulnerabilities before a coordinated patch is deployed.

---

## 3. Architecture & Security Controls

Project Qweirdo enforces multi-layered defense-in-depth principles:

### A. Zero Telemetry & Visitor Privacy
- **No Third-Party Trackers:** Zero Google Analytics, Facebook Pixel, advertising beacons, or tracking cookies.
- **Self-Hosted Typography:** All WOFF2 web fonts (Fraunces & Hanken Grotesk) are self-hosted locally under `/assets/fonts/` to prevent IP leakage to external CDNs.
- **Client-Side Computing:** Drawing physics, canvas layering, and SHA-256 provenance hashing run 100% locally in your browser.

### B. Strict Content Security Policy (CSP) & Frame Ancestors
- Both HTTP headers (`_headers`) and HTML `<meta>` tags enforce:
  ```http
  Content-Security-Policy: default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://qweirdo.pages.dev https://challenges.cloudflare.com; media-src 'self' blob:; manifest-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
  ```
- Strictly forbids `unsafe-eval` and unauthorized third-party script sources.
- Frame ancestry is blocked (`X-Frame-Options: DENY`, `frame-ancestors 'none'`) to eliminate clickjacking.

### C. Input Sanitization & Anti-Abuse
- **Unified Unicode Token Filter (`src/filter.js`):** Employs Unicode NFKC normalization, diacritic stripping, confusable mapping, and token-boundary evaluation to prevent slurs, hate speech, and violent incitement while eliminating false positives on innocent words (`grape`, `peacock`, `therapeutic`) and honoring multilingual non-Latin scripts (Bengali, Hindi, Cyrillic, Japanese, Arabic).
- **Binary Magic Byte Verification:** All base64 image thumbnails submitted to `/api/wall` undergo strict header inspection and binary magic-byte validation (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF...WEBP`) to prevent SVG/HTML payload injection.
- **Rate Limiting & Bot Protection:** Cloudflare Pages Functions enforce sliding-window IP rate limiting (12 req/min) and verify Cloudflare Turnstile challenge tokens.
- **Safe Command Execution:** GitHub Actions ingestion workflows use parameterized argument arrays (`execFileSync`) with zero user-controlled input in shell execution strings.
