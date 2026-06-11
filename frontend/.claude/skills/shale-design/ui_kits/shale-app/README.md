# SHALE App — UI Kit

A high-fidelity, interactive recreation of the SHALE Protocol app, composed entirely from this design system's primitives. Open `index.html`.

## Flow
1. **Connect gate** — branded landing; "Connect Wallet" reveals the app (social-login badges nod to the real Reown AppKit).
2. **Dashboard** — strata-illustration hero, 5-up protocol stats, three tier cards (CORE/SEAM/APEX), the loss-cascade tradeoff panel, and the AI Agent proposal panel (click *Accept* to execute).
3. **Deposit** — `SegmentedControl` tier picker, amount `Input` with %/MAX presets + faucet, deposit CTA with an approving→confirmed sequence.
4. **Analytics** — stat tiles, TVL breakdown + APEX buffer gauges, and live strategy farming rows (Aave / Camelot / Morpho) with actual-vs-target `StrataBar` drift ticks.
5. **Portfolio** — per-tier positions and total value.
6. **Safety** — live APEX-buffer monitor: current safety level (HEALTHY→CRITICAL), buffer-ratio gauge, deposit-gate status, principal breakdown, and the full safety-level threshold table.
7. **Scenarios** — interactive CDO-waterfall simulator: pick a market preset (Bull / Normal / Breakeven / Low / Capital Loss / APEX Depleted) or go Custom with strategy-APY and capital-loss sliders; see per-tier effective APY, loss absorption, the waterfall breakdown, and an APY comparison. Ports the live vault's exact `simulate()` math.

## Files
- `index.html` — entry; loads React + Babel + `_ds_bundle.js` + `data.js`, mounts the screens, owns nav/connect state, defines keyframes.
- `data.js` — fake-but-plausible protocol fixtures + formatters (on `window`).
- `NavBar.jsx`, `Hero.jsx`, `Dashboard.jsx`, `DepositFlow.jsx`, `Analytics.jsx`, `Safety.jsx`, `Scenarios.jsx` — screen components (each assigns itself to `window` for cross-file scope).

## Notes
- All visuals come from the design system: `Card`, `Button`, `Badge`, `StatTile`, `Input`, `SegmentedControl`, `StrataBar`, `RiskMeter`, `StrataMark`. The kit adds only layout + fake state — it does not re-implement primitives.
- This recreates the product's IA and copy faithfully while applying the elevated sedimentary visual language (see root `readme.md`). It is a mock: no wallet, no chain, no real numbers.
