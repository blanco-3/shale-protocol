# SHALE Design System

A complete, brand-faithful design system for **SHALE Protocol** — an AI-managed, adaptive, multi-strategy **yield vault on Arbitrum**. The system is built around one idea the product already lives by: **sedimentary rock**. Capital is layered into three strata — **CORE · SEAM · APEX** — and yield settles through them like sediment, top-down.

> 톤 & 컨셉: 퇴적암(shale) — 따뜻한 흙빛 지층 팔레트, 세 개의 트랜치 = 세 개의 지층.

---

## What this system is for

Use it to generate well-branded SHALE interfaces and assets — production UI, throwaway prototypes, pitch slides, marketing pages — that look and feel like the real protocol. It ships:

- **Foundations** — warm sedimentary color system, a serif/sans/mono type trio, spacing, radius, warm shadows, and the signature **strata** motif.
- **Components** — `Button`, `Badge`, `Card`, `StatTile`, `Input`, `SegmentedControl`, `StrataBar`, `RiskMeter`, `StrataMark`.
- **A UI kit** — an interactive recreation of the SHALE app (connect → dashboard → deposit → analytics → portfolio).
- **A slide template** — branded title / metric / quote slides.

### Sources (store these — the reader may have access)

This system was reverse-engineered from the real product. Explore these to go deeper:

- **Codebase:** `shale-protocol/` (attached) — Next.js frontend (`frontend/app`, `frontend/components`), Foundry contracts (`contracts/src`), and the AI agent (`agent/src`). The frontend is the source of truth for UX; `frontend/app/icon.svg` is the logo.
- **GitHub:** <https://github.com/blanco-3/shale-protocol> — *"AI-managed adaptive multi-strategy yield vault on Arbitrum."* Browse `frontend/` and `README.md` for the full architecture.
- **Live demo:** <https://shale-frontend-971342541474.us-central1.run.app> (Arbitrum Sepolia testnet).
- **Brand lockups:** `assets/brand-lockups-reference.html` (copied from the repo's `shale/shale-icon-v7.html`) — the canonical mark geometry, sizes, and wordmark.

> **Note — this design system *elevates* the product.** The shipped frontend is intentionally bare (monochrome, mono-font, hairline boxes). At the user's direction it has been re-styled into a polished, illustrated DeFi aesthetic that leans fully into the brand mark's warm sedimentary identity. The *information architecture, copy, tiers, and flows are faithful*; the visual richness is new.

---

## Product context

SHALE is a **CDO-style yield vault**. Users deposit USDC into one of three risk tiers and receive tokenized shares:

| Tier | Role | APY | Loss order | Strata |
|---|---|---|---|---|
| **CORE** | senior · stable | 2.5–3.5% (guaranteed) | ③ last-loss | deep protected bedrock |
| **SEAM** | mezzanine · balanced | 5–7% (guaranteed) | ② second-loss | the middle coal/ochre seam |
| **APEX** | junior · aggressive | residual, 10%+ | ① first-loss | exposed surface, weathered first |

An off-chain **AI agent** (Groq / Llama-3.3-70b) monitors yield across three simulated DeFi strategies (Aave V3, Camelot V3, Morpho Blue) and rebalances capital each epoch. Yield distributes via a **waterfall** — CORE paid first, SEAM second, APEX collects the residual. Losses absorb in reverse — **APEX first**. An **APEX buffer gate** blocks senior deposits when APEX < 15% of TVL. Every agent decision is recorded on-chain with a human-readable reason and is human-vetoable (PROPOSER pattern).

The product surfaces: **Dashboard** (TVL, tier stats, blended APY, agent panel), **Deposit** (tier select → approve → deposit), **Portfolio** (positions per tier), **Analytics** (strategy gauges, buffer health, epoch history), **Safety** (buffer monitor), **Scenarios** (what-if APY modeling).

---

## CONTENT FUNDAMENTALS

How SHALE writes. Match this voice in any copy you produce.

- **Voice:** precise, structural-finance literate, quietly confident. It explains mechanism, not hype. Think *engineering field notes for money*. Sentences are short and declarative: "APEX absorbs first." "Yield settles every epoch via waterfall."
- **Person:** addresses the user as **you** ("your deposit", "you pick CORE"); the protocol is **SHALE** or "the vault" in third person. The AI agent is **the AI agent** / **the agent**, never "we".
- **Casing:**
  - Tier names are **ALL-CAPS** always: CORE, SEAM, APEX. Never "Core".
  - Share tokens are camel-prefixed mono: `shlCORE`, `shlSEAM`, `shlAPEX`.
  - Section headers are sentence case ("Risk–Yield Tradeoff", "Live Strategy Farming", "APEX Buffer Ratio").
  - Eyebrow / overline labels are **UPPERCASE, letter-spaced**.
- **Numbers:** always mono, always explicit units — `%`, `$`, `bps`, `×`. Ranges use an en-dash with spaces: `2.50 – 3.50%`. APY is "target" (indicative) vs "realized". Leverage as `2.4×`. Addresses truncate `0x3989…22DC`.
- **Status language:** terse + uppercase for states — `PENDING`, `EXECUTED`, `REJECTED`, `HEALTHY`, `CAUTION`, `WARNING`, `CRITICAL`. Loss position written `① first-loss`, `② second-loss`, `③ last-loss`.
- **Punctuation & symbols:** arrows on CTAs (`Start Earning →`, `Deposit →`); `▶` between cascade steps; `•` for terse info bullets; `✓` for confirmations; `±` for drift. **No emoji** — the brand never uses them.
- **Honesty:** testnet reality is stated plainly ("Target APY is indicative and adjusted by the AI agent"; "APEX depositors bear first loss"). Risk is never hidden — it's the product.

**Example copy (lifted / in-voice):**
> "SHALE splits your deposit across three risk tiers — each earning a different rate based on loss-absorption priority. Deposits are deployed immediately; yield distributes at the end of each epoch via waterfall."
>
> Agent reason: *"Blended APY trending down 38bps over 3 epochs — lowering CORE target to 2.50–3.25% to keep the APEX residual positive and protect senior tranches."*

---

## VISUAL FOUNDATIONS

The whole language descends from the brand mark: a rounded square holding **three diagonal rock strata** (sandy gold, dark brown, warm amber) divided by near-black bedrock hairlines.

- **Palette — all earth, no cool gray.** A bedrock-to-sand neutral ramp (`--rock-900 #1a1714` → `--rock-200 #d9a96b` → `--sand-50 #f9f4ea`). Tier accents are sedimentary versions of the classic risk triad: CORE = **sediment moss green** `#5e743d`, SEAM = **ochre/amber** `#c2862a`, APEX = **terracotta rust** `#b85130`. One cool note only — an **oxidized copper-teal** accent `#2a8576` — used sparingly for links/focus so the warm field has a single point of contrast. States reuse the tier colors (positive = moss, warning = ochre, danger = rust).
- **Backgrounds:** warm **sandstone paper** (`--bg #f9f4ea`), never white. Two textures ship: `.shale-sandstone` (faint warm speckle for app backgrounds) and the signature `.shale-strata` / `.shale-strata-soft` (diagonal sedimentary banding at the logo's ~18° tilt) for hero and feature blocks. Dark sections use **bedrock** `#1a1714`. No blue/purple gradients anywhere.
- **Type:** a three-voice system mirroring the brand's own lockup (serif wordmark + mono data). **Spectral** (serif) for display, headlines, the wordmark — editorial, geological gravitas, tracked tight (−0.03em), italics for emphasis ("*stratified.*"). **Hanken Grotesk** (sans) for UI and body. **JetBrains Mono** for every number, address, and bps — tabular figures, always. Headlines lowercase-friendly; eyebrows uppercase + wide tracking.
- **Spacing & layout:** 4px base grid; `1120px` max container; `64px` sticky translucent nav. Generous vertical rhythm — content breathes like strata layers.
- **Corners:** moderate, echoing the mark's 14% rounded square — cards at `16px` (`--r-lg`), pills fully round. Nothing sharp-cornered except hairline dividers.
- **Borders:** warm hairlines (`#e6d8be`), never gray. Bedrock (`#1a1714`) used as a deliberate accent separator (the strata lines, segmented-control fills, dark panels).
- **Shadows:** soft and **warm — tinted with bedrock brown** (`rgba(26,23,20,…)`), never neutral. Five steps from `xs` hairline-lift to `xl` modal. Cards rest on `sm`; hover lifts to `lg` with a −3px translate.
- **Cards:** sandstone-paper fill, warm hairline border, soft warm shadow, `16px` radius. Optional **tier top-edge** — a thin accent line, or a `strataEdge` banded stripe (tier color × bedrock dashes) that makes a card read as a labelled rock stratum.
- **Motion — geological calm.** Slow, weighted, **no bounce**. Easing `cubic-bezier(0.16,1,0.3,1)`; durations 120/220/420ms. Entrances are short fades + small rises (`shaleRise`, `shaleFade`). The hero's one looping motif is a USDC token slowly "drilling" down a core-sample column. Reduced-motion safe (end-state is the base style).
- **Hover / press states:** buttons darken to `--rock-800` (or brighten tier fills ~8%) and gain shadow on hover; press translates **down 1px** (settling weight, not a shrink). Cards lift up 3px. Nav items gain a paper pill. Inputs *ignite* — the hairline border goes to bedrock with a soft 4px focus ring.
- **Imagery vibe:** there is little photography; the "imagery" is the **strata illustration** itself — warm, layered, cross-sectional, like a geology field guide or a drill core. Warm and matte, never glossy or neon.

---

## ICONOGRAPHY

SHALE is **deliberately near-iconless** — and that restraint is part of the brand. Document and preserve it.

- **The only brand SVG is the strata mark.** It lives in `assets/shale-mark.svg` (and `assets/shale-mark-512.svg`), and as the scalable `StrataMark` React component. Three diagonal layers on bedrock; the wordmark is **serif "shale"** (lowercase) or **tracked caps "SHALE"** for nav. Never recolor the three strata; only the wordmark is themeable.
- **No icon font, no icon library** ships in the product (no Lucide, Heroicons, Font Awesome, Material). Don't add one unless a new surface genuinely needs it — and if you must, match a **minimal, hairline (1.5px) stroke** set and flag the addition.
- **Affordances are typographic / unicode**, not pictographic:
  - `→` on every forward CTA and link.
  - `▶` between loss-cascade steps.
  - `•` for terse info bullets, `✓` for confirmations, `±` for drift, `×` for leverage.
  - Ordinal loss markers `①  ②  ③` (circled numerals) for CORE/SEAM/APEX priority.
  - Status is shown with **colored dots + a word** (`RiskMeter`, `Badge dot`), not glyphs.
- **No emoji, ever.** The product uses none; neither should generated SHALE work.
- **Data viz instead of icons:** allocation, buffer health, and TVL splits are shown with `StrataBar` meters (sandstone well + textured fill + bedrock target tick) — the visual workhorses in place of iconography.

---

## Index / manifest

**Root**
- `styles.css` — the one file consumers link. `@import` manifest only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css` (resets + strata motifs).
- `assets/` — `shale-mark.svg`, `shale-mark-512.svg`, `brand-lockups-reference.html`.
- `readme.md` (this file) · `SKILL.md` (Agent-Skill wrapper).

**Foundation cards** (`guidelines/*.html` — Design System tab)
- Colors: rock scale · tier strata · surfaces & text · state colors
- Type: display serif · body sans · mono figures · type scale
- Spacing: spacing scale · radius scale · elevation
- Brand: strata mark · wordmark lockup · strata motif

**Components** (`components/<group>/<Name>.{jsx,d.ts,prompt.md}` + one `*.card.html` per group)
- `core/` — **Button**, **Badge**, **Card**, **StatTile**
- `forms/` — **Input**, **SegmentedControl**
- `data/` — **StrataBar**, **RiskMeter**
- `brand/` — **StrataMark**

Mount from the compiled bundle: `const { Button } = window.SHALEDesignSystem_1fdf95;`

**UI kit** (`ui_kits/shale-app/`)
- `index.html` — interactive app (connect → dashboard → deposit → analytics → portfolio)
- `NavBar.jsx`, `Hero.jsx`, `Dashboard.jsx`, `DepositFlow.jsx`, `Analytics.jsx`, `data.js`, `README.md`

**Slides** (`templates/shale-slides/`) — branded title / metric / quote / section slides.

---

## Using the system

**Plain HTML / prototypes** — link `styles.css`, then use tokens and the `.shale-*` motif classes directly:

```html
<link rel="stylesheet" href="styles.css">
<div class="shale-sandstone">
  <h1 style="font: var(--role-h1); color: var(--text-strong)">Yield, <em>stratified.</em></h1>
</div>
```

**React** — load the bundle, then pull components off the namespace:

```html
<script src="_ds_bundle.js"></script>
<script type="text/babel">
  const { Button, Card, StatTile } = window.SHALEDesignSystem_1fdf95;
</script>
```

> **Font substitution flag:** the live product ships **Geist Mono**; this system substitutes the nearest open equivalent **JetBrains Mono** (and pairs **Spectral** + **Hanken Grotesk**), all via Google Fonts. If you have the original Geist / Geist Mono files, drop them in and update `tokens/fonts.css` — see Caveats.
