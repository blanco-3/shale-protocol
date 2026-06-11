---
name: shale-design
description: Use this skill to generate well-branded interfaces and assets for SHALE Protocol (an AI-managed sedimentary yield vault on Arbitrum), either for production or throwaway prototypes/mocks/decks. Contains essential design guidelines, the warm sedimentary color system, serif/sans/mono type, fonts, the strata brand mark, and UI-kit components for prototyping.
user-invocable: true
---

# SHALE Design System

Read **README.md** in this skill first — it carries the full product context, CONTENT FUNDAMENTALS (voice), VISUAL FOUNDATIONS, and ICONOGRAPHY. Then explore the other files.

**Quick map**
- `styles.css` → the one stylesheet to link; pulls in every token + font via `tokens/`.
- `tokens/` → colors, typography, spacing, base resets + the `.shale-strata` / `.shale-sandstone` motifs.
- `assets/` → the strata logo (`shale-mark.svg`) and brand lockup reference.
- `guidelines/` → foundation specimen cards (color / type / spacing / brand).
- `components/` → React primitives (Button, Badge, Card, StatTile, Input, SegmentedControl, StrataBar, RiskMeter, StrataMark). Each has a `.prompt.md` with usage.
- `ui_kits/shale-app/` → an interactive recreation of the SHALE app — the reference for layout and composition.
- `templates/shale-slides/` → branded slide template.

**How to work**
- If creating visual artifacts (slides, mocks, throwaway prototypes), **copy assets out** and produce static HTML files the user can open. Link `styles.css`, use the CSS custom properties, and reach for the `.shale-*` motif classes. For React, load `_ds_bundle.js` and read components off `window.SHALEDesignSystem_1fdf95`.
- If working in the real codebase (`shale-protocol/`), read the rules here and lift exact token values to design on-brand.
- Hold the line on the brand: **all-earth palette** (no blue/purple gradients), **serif display + mono numbers**, **near-iconless** (unicode affordances, the strata mark only), **no emoji**, geological-calm motion (no bounce), tiers always **ALL-CAPS** (CORE / SEAM / APEX).

If the user invokes this skill with no other guidance, ask what they want to build, ask a few focused questions, then act as an expert SHALE designer who outputs HTML artifacts *or* production code depending on the need.
