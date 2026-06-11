'use client';
import React from "react";
import { StrataMark } from "../components";

/* SHALE — single-page cover: the three-tranche vault */
/* ambient: slow warm glows + drifting sediment over bedrock */
function Ambient() {
  const dots = React.useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    left: (i * 7.1 + (i % 4) * 3) % 100, size: 2 + (i % 3), dur: 9 + (i % 5) * 1.8, delay: -(i * 1.2), op: 0.22 + (i % 4) * 0.1,
  })), []);
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: "-16%", left: "-8%", width: "50%", height: "64%", borderRadius: "50%", background: "radial-gradient(circle, rgba(184,81,48,0.36), transparent 64%)", filter: "blur(74px)", animation: "shBlob 22s var(--ease-in-out) infinite" }} />
      <div style={{ position: "absolute", top: "2%", right: "-10%", width: "46%", height: "60%", borderRadius: "50%", background: "radial-gradient(circle, rgba(194,134,42,0.32), transparent 64%)", filter: "blur(78px)", animation: "shBlob 28s var(--ease-in-out) infinite reverse" }} />
      <div style={{ position: "absolute", bottom: "-22%", left: "30%", width: "44%", height: "56%", borderRadius: "50%", background: "radial-gradient(circle, rgba(94,116,61,0.28), transparent 66%)", filter: "blur(80px)", animation: "shBlob 32s var(--ease-in-out) infinite" }} />
      {/* tilted strata texture for character */}
      <div style={{ position: "absolute", inset: "-20%", opacity: 0.5, transform: "rotate(-7deg)", backgroundImage: "repeating-linear-gradient(180deg, rgba(217,169,107,0.05) 0 1px, transparent 1px 62px)" }} />
      {dots.map((d, i) => (
        <span key={i} style={{ position: "absolute", top: "-20px", left: d.left + "%", width: d.size, height: d.size, borderRadius: "50%", background: "var(--rock-200)", opacity: d.op, animation: `shSediment ${d.dur}s linear ${d.delay}s infinite` }} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 42%, rgba(8,6,4,0.6) 100%)" }} />
    </div>
  );
}

/* the showpiece: three stacked tranches the deposit flows through */
function TrancheStack() {
  const tranches = [
    { name: "APEX", ord: "①", loss: "first-loss", apy: "10.2%+", c1: "#c2603f", c2: "#7a3318", accent: "var(--apex-300)" },
    { name: "SEAM", ord: "②", loss: "second-loss", apy: "5–7%", c1: "#cf9436", c2: "#7a521a", accent: "var(--seam-300)" },
    { name: "CORE", ord: "③", loss: "last-loss", apy: "2.5–3.5%", c1: "#6f8a47", c2: "#3a4a26", accent: "var(--core-300)" },
  ];
  return (
    <div style={{ position: "relative", width: "min(640px, 86vw)", display: "flex", flexDirection: "column", gap: "3px" }}>
      {tranches.map((t, i) => (
        <div key={t.name} style={{
          position: "relative", display: "flex", alignItems: "center", gap: "14px",
          height: "50px", padding: "0 20px", borderRadius: i === 0 ? "12px 12px 4px 4px" : i === 2 ? "4px 4px 12px 12px" : "4px",
          background: `linear-gradient(150deg, ${t.c1}, ${t.c2})`,
          backgroundImage: `linear-gradient(150deg, ${t.c1}, ${t.c2}), repeating-linear-gradient(160deg, rgba(0,0,0,0.10) 0 8px, rgba(255,255,255,0.05) 8px 16px)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 22px -10px rgba(0,0,0,0.5)",
          animation: `shSlabIn .7s var(--ease-out) ${0.5 + i * 0.13}s both`,
        }}>
          <span style={{ font: "600 15px/1 var(--font-mono)", color: "rgba(255,250,243,0.85)", width: "16px" }}>{t.ord}</span>
          <span style={{ font: "700 18px/1 var(--font-serif)", letterSpacing: "0.08em", color: "rgba(255,251,244,0.97)" }}>{t.name}</span>
          <span style={{ font: "500 11px/1 var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(255,251,244,0.62)" }}>{t.loss}</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 11px", borderRadius: "var(--r-pill)", background: "rgba(18,15,12,0.34)" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.accent, boxShadow: `0 0 7px ${t.accent}` }} />
            <span style={{ font: "600 13px/1 var(--font-mono)", color: "#fff" }}>{t.apy}</span>
          </span>
          {/* glowing seam between slabs */}
          {i > 0 && <span aria-hidden style={{ position: "absolute", top: "-2.5px", left: "8%", right: "8%", height: "1.5px", background: "rgba(231,205,160,0.55)", boxShadow: "0 0 8px rgba(217,169,107,0.6)", animation: "shGlowPulse 3.4s var(--ease-in-out) infinite" }} />}
        </div>
      ))}
      {/* deposit drilling through the tranches */}
      <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "34px", transform: "translateX(-50%)", borderLeft: "1.5px dashed rgba(253,250,243,0.28)", borderRight: "1.5px dashed rgba(253,250,243,0.28)" }}>
        <div style={{ position: "absolute", left: "50%", width: "28px", height: "28px", transform: "translateX(-50%)", borderRadius: "50%", background: "var(--sand-50)", boxShadow: "0 6px 16px rgba(0,0,0,0.5), inset 0 0 0 2px var(--rock-200)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 12px/1 var(--font-mono)", color: "var(--rock-700)", animation: "shCoreDrop 4.4s var(--ease-in-out) 1.2s infinite" }}>$</div>
      </div>
    </div>
  );
}

export function Landing({ onLaunch }) {
  const rootRef = React.useRef(null);
  const letters = ["S", "H", "A", "L", "E"];
  // 3-strata fill: gold / amber / brown split by bedrock seams — three layers, like the vault
  const strataFill = "linear-gradient(176deg, #e7cda0 2%, #d9a96b 27%, #161310 27.5%, #161310 29.5%, #cf9a3a 30%, #a06828 60%, #161310 60.5%, #161310 62.5%, #8a5326 63%, #5c3318 98%)";

  function onMove(e) {
    const el = rootRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }

  return (
    <div ref={rootRef} onMouseMove={onMove} style={{
      position: "relative", height: "100vh", overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 36%, #1c1611, #120f0c 72%)",
      display: "grid", placeItems: "center", color: "var(--sand-50)",
    }}>
      <Ambient />

      <div style={{ position: "absolute", top: "30px", left: "36px", zIndex: 3, animation: "shRiseT .7s var(--ease-out) both" }}>
        <StrataMark size={28} />
      </div>
      <button onClick={onLaunch} style={{ position: "absolute", top: "26px", right: "32px", zIndex: 3, font: "600 12px/1 var(--font-sans)", color: "var(--text-on-ink-muted)", background: "transparent", border: "1px solid var(--border-ink)", padding: "9px 15px", borderRadius: "var(--r-pill)", cursor: "pointer", animation: "shRiseT .7s var(--ease-out) .1s both" }}>Launch App →</button>

      <div style={{
        position: "relative", zIndex: 3, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center",
        transform: "translate(calc(var(--px,0)*-10px), calc(var(--py,0)*-7px))", transition: "transform .5s var(--ease-out)",
      }}>
        <div style={{ font: "600 12px/1 var(--font-sans)", letterSpacing: "0.42em", textTransform: "uppercase", color: "var(--rock-300)", marginBottom: "16px", paddingLeft: "0.42em", animation: "shRiseT .8s var(--ease-out) .1s both" }}>AI-managed yield vault · Arbitrum</div>

        {/* GIANT 3-strata wordmark */}
        <h1 aria-label="SHALE" style={{ margin: 0, display: "flex", justifyContent: "center", gap: "0.01em", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: "clamp(60px, min(16vw, 13vh), 210px)", lineHeight: 0.86, letterSpacing: "-0.02em", filter: "drop-shadow(0 16px 46px rgba(184,81,48,0.32))" }}>
          {letters.map((c, i) => (
            <span key={i} style={{ display: "inline-block", backgroundImage: strataFill, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent", animation: `shRiseChar .9s var(--ease-out) ${0.15 + i * 0.08}s both` }}>{c}</span>
          ))}
        </h1>

        <p style={{ font: "400 italic 19px/1.4 var(--font-serif)", color: "var(--rock-200)", margin: "14px 0 22px", animation: "shRiseT .9s var(--ease-out) .45s both" }}>
          One vault, <em style={{ fontWeight: 600, color: "var(--rock-150)" }}>three strata.</em>
        </p>

        <TrancheStack />

        <p style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-faint)", maxWidth: "520px", margin: "20px 0 0", animation: "shRiseT 1s var(--ease-out) .95s both" }}>
          Deposit USDC into one tier. Yield settles top-down — <span style={{ color: "var(--core-300)" }}>CORE earns first</span>, <span style={{ color: "var(--apex-300)" }}>APEX absorbs first</span>.
        </p>

        <button onClick={onLaunch} className="sh-glow-btn" style={{ marginTop: "24px", font: "700 15px/1 var(--font-sans)", color: "var(--sand-50)", background: "var(--apex-600)", border: "none", padding: "15px 30px", borderRadius: "var(--r-pill)", cursor: "pointer", boxShadow: "0 18px 44px -14px rgba(184,81,48,0.85)", animation: "shRiseT .9s var(--ease-out) 1.05s both" }}>Enter the vault →</button>
      </div>
    </div>
  );
}
