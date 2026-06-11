# INTEGRATION — wiring the SHALE Design System into the real app

> A Claude-Code playbook for merging this design system into `shale-protocol/frontend`
> (Next.js App Router + Tailwind v4 + wagmi). Read this top-to-bottom, then execute phase by phase.

---

## TL;DR — the most effective handoff

This design system already ships a `SKILL.md` that is **Agent-Skills compatible**, and the target
app already has all six routes (`app/`, `app/deposit`, `app/portfolio`, `app/analytics`,
`app/safety`, `app/scenarios`). So the job is **not** "build new screens" — it's
**restyle the existing pages with these tokens + components**. Recommended path:

1. **Install this whole folder as a skill** in the repo:
   ```
   shale-protocol/frontend/.claude/skills/shale-design/   ← drop this entire project here
   ```
   Claude Code auto-discovers `SKILL.md`. Now every design task in the repo has the brand
   rules, exact token values, component recreations, and the full UI-kit reference on hand.

2. **Port the foundations once** (tokens → Tailwind `@theme`, fonts) — Phase 1 below.

3. **Restyle one route at a time**, using the matching UI-kit file in
   `ui_kits/shale-app/` as the pixel reference — Phase 2 below.

> ⚠️ The files in `ui_kits/` and `components/` are **design references** (HTML/inline-style React
> prototypes), not drop-in production code. Recreate them with the app's real patterns
> (Tailwind classes, `next/font`, the existing wagmi data hooks). Keep the *visuals* pixel-faithful;
> keep the app's *data/logic* as-is.

---

## The target codebase (current state)

- **Styling:** Tailwind v4 — `frontend/app/globals.css` is `@import "tailwindcss";` + an
  `@theme inline { … }` block. Currently bare: white bg, black text, `font-mono` on `<body>`.
- **Fonts:** `next/font/google` → `Geist_Mono` as `--font-mono`; body is `font-mono` everywhere.
- **Layout:** `app/layout.tsx` wraps everything in `<NavBar />` + `<main className="max-w-4xl mx-auto px-6 py-8">`.
- **Components:** `frontend/components/` (NavBar, TierCard, AgentPanel, …) — Tailwind-class React.
- **Data:** wagmi `useReadContract(s)` against the vault ABI. **Do not touch this** — only swap presentation.

---

## Phase 1 — Foundations (do once)

### 1a. Tokens → Tailwind v4

Two options; **Option A is faster and lower-risk**:

**Option A — ship the raw CSS variables.** Copy `tokens/colors.css`, `tokens/typography.css`,
`tokens/spacing.css`, and the `.shale-*` motif rules from `tokens/base.css` into the app
(e.g. `app/shale-tokens.css`) and `@import` it from `globals.css` after Tailwind. Then use the
vars directly in `style={{ … }}` or via `@theme inline` aliases. The DS components already read
these exact var names, so they port verbatim.

**Option B — promote tokens into `@theme`** so they become Tailwind utilities
(`bg-rock-900`, `text-core-600`, `rounded-lg`). Map like this inside `@theme inline`:

```css
@theme inline {
  /* neutrals */
  --color-rock-900: #1a1714;  --color-rock-600: #5c3318;  --color-rock-400: #a06828;
  --color-rock-200: #d9a96b;  --color-sand-50: #f9f4ea;   --color-paper: #fdfaf3;
  /* tiers */
  --color-core: #5e743d;  --color-seam: #c2862a;  --color-apex: #b85130;
  --color-accent: #2a8576;
  /* fonts */
  --font-serif: "Spectral", Georgia, serif;
  --font-sans:  "Hanken Grotesk", system-ui, sans-serif;
  --font-mono:  var(--font-geist-mono);   /* or JetBrains — see 1b */
}
```
Full value list: `tokens/colors.css` (rock scale, core/seam/apex 50→700 ramps, semantic aliases).

> Set the page background to **sandstone**, never white: `body { background: var(--sand-50) }`
> and drop the `font-mono` default on `<body>` — mono is for **numbers only**, not body copy.

### 1b. Fonts

The system uses **Spectral** (display serif), **Hanken Grotesk** (UI/body sans), **JetBrains Mono**
(numbers). Add the first two via `next/font/google` in `layout.tsx`:

```ts
import { Spectral, Hanken_Grotesk, Geist_Mono } from "next/font/google";
const serif = Spectral({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-serif" });
const sans  = Hanken_Grotesk({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-sans" });
const mono  = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
// html className = `${serif.variable} ${sans.variable} ${mono.variable}`
```

> **Font decision:** the DS substituted **JetBrains Mono** for the app's shipped **Geist Mono**.
> Either works — **keeping Geist Mono is fine and more faithful to what's deployed.** Just point
> `--font-mono` at it. Body/headings should move to Hanken/Spectral.

### 1c. The strata motif

Copy the `.shale-strata`, `.shale-strata-soft`, `.shale-sandstone`, `.shale-eyebrow` rules from
`tokens/base.css`. These power the hero illustration and section backgrounds.

### 1d. Brand mark

`assets/shale-mark.svg` already matches `frontend/app/icon.svg`. For the in-app logo + wordmark,
recreate `components/brand/StrataMark.jsx` as a small client component (`components/StrataMark.tsx`).

---

## Phase 2 — Restyle the routes (one PR each)

Each app route has a 1:1 pixel reference in the UI kit. Open the reference, match the visuals,
keep the route's existing wagmi data wiring.

| App route (`frontend/app/…`) | UI-kit reference (`ui_kits/shale-app/…`) | Key components to recreate |
|---|---|---|
| `page.tsx` (Dashboard) | `Dashboard.jsx` + `Hero.jsx` | StrataCrossSection hero, StatTile grid, TierCard ×3, LossCascade, AgentPanel |
| `deposit/page.tsx` | `DepositFlow.jsx` | SegmentedControl tier picker, Input + %/MAX, deposit CTA states |
| `portfolio/page.tsx` | `Portfolio` (in `index.html`) | per-tier position cards, total-value ink card |
| `analytics/page.tsx` | `Analytics.jsx` | StatTile row, TVL `StrataBar` split, buffer gauge, strategy rows |
| `safety/page.tsx` | `Safety.jsx` | level hero + gauge, deposit-status cards, principal bars, level table |
| `scenarios/page.tsx` | `Scenarios.jsx` | scenario selector, custom sliders, tier-result cards, waterfall, APY bars |

### Shared primitives to port first (`components/`)

Recreate these as reusable Tailwind/CSS-var React components, then compose every page from them:
`Button`, `Badge`, `Card`, `StatTile`, `Input`, `SegmentedControl`, `StrataBar`, `RiskMeter`,
`StrataMark`. Each has a `.prompt.md` (usage + variants) and a `.d.ts` (prop contract) right next to it.
They're already plain inline-style React — the port is mostly mechanical.

### NavBar

Restyle `components/NavBar.tsx` to match `ui_kits/shale-app/NavBar.jsx`: translucent sandstone bar,
StrataMark + tracked-caps wordmark, pill active state, wallet chip. Keep its real routing/links.

---

## Brand guardrails (enforce while restyling)

- **All-earth palette.** No blue/purple, no gradients-for-decoration. One cool accent only (`--accent`).
- **Type roles:** Spectral for headings/display, Hanken for UI/body, mono for **every number** (tabular).
- **Tiers are ALL-CAPS** always: CORE / SEAM / APEX. Shares: `shlCORE` etc.
- **Near-iconless / no emoji.** Affordances are unicode (`→ ▶ • ✓ ① ② ③`) + colored dots, not icon packs.
  (The live `scenarios` page uses emoji in labels — drop them, per brand.)
- **Motion:** geological-calm, no bounce; ease `cubic-bezier(0.16,1,0.3,1)`, 120/220/420ms; press = down 1px.
- **Cards:** sandstone paper, warm hairline border, warm (bedrock-tinted) shadow, 16px radius, optional tier top-edge.

Full rationale + examples: `readme.md` (CONTENT FUNDAMENTALS, VISUAL FOUNDATIONS, ICONOGRAPHY).

---

## Suggested Claude-Code prompts

1. *"Read `.claude/skills/shale-design/SKILL.md` and `readme.md`. Do Phase 1 of INTEGRATION.md:
   port the tokens into `globals.css`'s `@theme`, add Spectral + Hanken Grotesk via next/font,
   set the sandstone background, and remove the global `font-mono`. Don't touch any wagmi logic."*
2. *"Port the shared primitives in `components/` to `frontend/components/` as Tailwind React
   components, reading the CSS vars. Match each `.prompt.md`."*
3. *"Restyle `app/safety/page.tsx` to match `ui_kits/shale-app/Safety.jsx` pixel-for-pixel,
   keeping the existing `useReadContracts` data. Then do `app/scenarios`."*

Ship one route per PR, screenshot-compare against the UI-kit reference, and verify the wagmi data still flows.
