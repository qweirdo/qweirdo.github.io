# DESIGN.md · Project Qweirdo Art Direction & Design System

## Concept Card

```
Idea:        A contemplative digital humanities sanctuary for slow, collective mark-making across living vellum and urban epigraphy.
Metaphor:    A perpetual medieval scriptorium palimpsest where aerosol pigments, mineral inks, and sacred geometry settle into aged vellum fibers across time.
Signature:   Real-time dual-state live wall drawing with tactile vellum physics, 4-pass chiaroscuro relief shader, philatelic stamp forge, and deckled mini-canvas blending.
Emotion:     A breath of timeless calm, tactile reverence, and quiet discovery—the sensation of entering a secluded cloister away from digital noise.
Motion verb: Settle like gold leaf, plume like aerosol mist, breathe like living vellum.
Screenshot:  The monumental illuminated Q emblem flowing into the living vellum stage, framed by delicate gold leaf rules, active pochoir stencils, and an open deckled mini-canvas.
Anchor:      The synthesis of ancient manuscript chirography and raw 1980s New York subway wildstyle epigraphy, executed in client-side zero-telemetry canvas craft.
```

---

## Art Direction System

### 1. Palette & Roles

Every color role reflects natural pigments of historical scriptoriums and subway aerosol paints, with verified WCAG 2.1 AA/AAA contrast on the aged vellum ground:

| Role | Variable | Hex | Description | Contrast on `--ground` |
|---|---|---|---|---|
| **Ground** | `--bg` | `#ebe0ce` | Aged manuscript vellum, luminous eggshell | Ground |
| **Surface** | `--sf` | `#decbb1` | Pressed rag paper substrate, warm sand | 1.2:1 (Structural tone) |
| **Line / Border** | `--bd` | `#beaa8e` | Patina vellum border, warm raw umber | 1.8:1 (Divider rule) |
| **Ink (High)** | `--tx` | `#22140a` | Carbon gall ink, deep bistre umber | **14.8:1** (AAA Compliant) |
| **Muted Ink** | `--mu` | `#634e3a` | Diluted walnut wash, antique sepia | **6.2:1** (AA Compliant) |
| **Accent Primary** | `--a` | `#844c1c` | Illuminator's sienna, cinnabar amber | **5.4:1** (AA Compliant) |
| **Gilding Accent** | `--gold` | `#d4af37` | 24-karat gold leaf, metallic illumination | High contrast on dark UI |
| **Verdigris Teal** | `--teal` | `#1b5e5a` | Oxidized copper pigment, fluid tide wave | **5.8:1** (AA Compliant) |
| **Venetian Oxblood**| `--oxblood`| `#8b1c28` | Ground cinnabar pigment, rubrication | **7.1:1** (AAA Compliant) |
| **Ultramarine Azure**| `--lapis` | `#1c3b72` | Lapis lazuli mineral enamel | **9.4:1** (AAA Compliant) |

### 2. Typography

Two typefaces, 100% self-hosted locally in `assets/fonts/` (zero external network requests):

- **Display & Headings:** `Fraunces` (Variable Serif, optical sizes 9–144pt, weights 300 Light, 500 Medium, 600 Semi-Bold, with true cursive italic).
  - *Tracking:* `-0.035em` for large headers, `-0.045em` for hero display.
  - *Leading:* `0.92` to `1.05` for display, `1.2` for secondary headings.
  - *Detail:* Hanging punctuation and negative margins on large title capitals for optical alignment.
- **Body & Controls:** `Hanken Grotesk` (Clean geometric grotesque, weights 400 Regular, 600 Semi-Bold, 700 Bold).
  - *Body Scale:* `clamp(0.95rem, 0.9rem + 0.3vw, 1.08rem)`.
  - *Leading:* `1.65` for optimal legibility across varying reading conditions.
  - *Control Labels:* `0.78rem` to `0.85rem` with `+0.04em` tracking in semi-bold.

### 3. Grid, Layout & Rhythm

- **Canvas Max Width:** `1600px` internal aspect ratio `2:1`, fluidly scaling to viewport width with `margin: 0 6vw`.
- **Rhythm:** Alternating asymmetric layouts:
  1. *Hero:* Asymmetric split (1.05fr brand mark + 1.25fr headline & manifesto).
  2. *Studio Stage:* Monumental full-width canvas framing with deckled perimeter shadow.
  3. *Ethos:* Large editorial quotation poster followed by a 3-step procedural progression.
  4. *About:* Asymmetric broadside (1.4fr prose + 1fr manuscript colophon facts).
  5. *Credits:* Intimate scriptorium ledger inscription form with expandable charter.
  6. *Archive:* Balanced 3×3 broadside gallery cards with chirography date labels.

### 4. Shape & Radii Rules

- **Containers & Framing:** `8px` rounded corners with gilded 1px inner hairline and subtle deep chiaroscuro shadow.
- **Controls & Chips:** `9999px` full pill radius for touch targets and ergonomic tactile response.
- **Touch Target Rule:** Minimum `44px × 44px` physical touch area on touch pointers (`@media (pointer: coarse)`).

### 5. Motion Language & Choreography

- **Motion Verb:** "Settle like gold leaf, plume like aerosol mist, breathe like living vellum."
- **Easing:** Organic manuscript cubic-bezier `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Durations:**
  - Fast feedback (hover/press): `150ms–220ms`.
  - Panel reveal / modal backdrop: `280ms–350ms`.
  - Ambient wave & shimmer respiration: `4000ms–6000ms` continuous gentle sine idle.
- **Accessibility:** `@media (prefers-reduced-motion: reduce)` disables all continuous wave animations, instant transitions, and avoids unrequested movement.

---

## Modern Web Standards & Component Architecture

1. **Native Semantic `<dialog>`:**
   - `#stampModal`, `#folioModal`, `#shareModal` upgraded from legacy `div.modal` to `<dialog>` elements.
   - Top-layer rendering with native focus management, `Esc` handling, and light-dismiss (`closedby="any"`).
   - `overscroll-behavior: contain` on `dialog:modal` and `overflow: hidden; overscroll-behavior: contain` on `::backdrop` to prevent page scroll chaining.
   - Clean polyfill/script fallback for non-supporting browsers.
2. **Accessible Toolbar (`role="toolbar"`):**
   - Studio toolbar structured with proper ARIA semantics and visible `:focus-visible` styling (`outline: 2px solid var(--gold); outline-offset: 3px`).
3. **Progressive Enhancement:**
   - Works fully without JavaScript as an archival broadside; script hydration adds real-time drawing, audio synthesis, and live sync.

---

## Section Wireframes (ASCII)

### 1. Hero & Header
```
+-------------------------------------------------------------------+
|  [Q] weirdo                     [Stamp Forge] [Ethos] [About] [Archive] |
+-------------------------------------------------------------------+
|                                                                   |
|   (Illuminated Q)           CHARTED BY CHAOS; ORDERED BY CODE    |
|   ================          Boundless pathways                    |
|   Digital Graffiti;         Creative pistes                       |
|   Perpetual Expressions     -----------------------------------   |
|                             A proudly purposeless digital         |
|                             sanctuary. Drift, doodle, and leave   |
|                             anonymous marks across a living wall. |
|                             [Share: X | FB | Bsky | Threads | Link] |
+-------------------------------------------------------------------+
```

### 2. Studio Stage & Canvas
```
+-------------------------------------------------------------------+
| Cap: (Fat Cap) (NY Skinny) (Chisel Mop) (Spatter) (Waves) (Buff)  |
| Mini: (+ New Mini-Canvas)                                         |
| Palette: (Gold) (Lapis) (Oxblood) (Teal) (Sage) (Tyrian)...       |
| Actions: [Download Canvas] [AI Idea] [Stamp Forge] [Publish Live] |
|-------------------------------------------------------------------|
| Wall Surfaces: Aged Vellum · Rag Paper · Gold Leaf · Living Strata|
| Inscription Progress: 14%  |  Inspired by: Subhradeep             |
| [==================================== Progress Bar =============] |
| +---------------------------------------------------------------+ |
| |                                                               | |
| |                    THE LIVING URBAN WALL                      | |
| |           [Interactive Aerosol & Chirography Canvas]          | |
| |                                                               | |
| +---------------------------------------------------------------+ |
| [Moniker/Tag input........................] [Wildstyle] [Bubble]  |
+-------------------------------------------------------------------+
```

### 3. Ethos & Values
```
+-------------------------------------------------------------------+
| "Art made slowly, and together. No feeds, no metrics,             |
|  no distractions—just shared marks settling into aged vellum."    |
|                                                                   |
|   Slow                  Kind                  Open                |
|   Unrushed by design.   Generous words bloom  Free, anonymous,    |
|   Ambient weather and   in gold and lapis;    and live worldwide  |
|   patina gather gently  harsh terms dissolve  with zero cookies   |
|   around human marks.   into geometry.        and zero trackers.  |
|                                                                   |
|   01 Drift & Doodle     02 Plant Offerings    03 Breathe Together |
+-------------------------------------------------------------------+
```

---

## Genericness Test

- *Does this look like a cookie-cutter SaaS or generic template?* **No.**
- *Palette test:* Avoids AI purple-blue glows and generic cold dark modes. Uses authentic historical scriptorium minerals (aged vellum eggshell, walnut gall ink, 24k gold leaf, lapis lazuli, verdigris copper, Venetian oxblood).
- *Typography test:* Avoids Inter/Roboto defaults. Pairs the idiosyncratic serif display of `Fraunces` with `Hanken Grotesk`.
- *Interaction test:* The canvas is not a dummy graphic; it is a full client-side 60fps generative physics simulation with chiaroscuro depth, pochoir stencils, and deckled mini-canvas layers.
