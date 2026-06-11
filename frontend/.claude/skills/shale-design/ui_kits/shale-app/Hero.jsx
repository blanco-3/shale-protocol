/* SHALE app — dashboard hero with the sedimentary strata illustration */
const { Button, Badge } = window.SHALEDesignSystem_1fdf95;

/* The signature illustration: a rock cross-section. Three diagonal
   strata (APEX/SEAM/CORE) with a drilled "core sample" column showing
   capital descending through the tranches. Built from the brand motif. */
function StrataCrossSection() {
  const bands = [
    { tone: "var(--apex-500)", line: "#7a3318", name: "APEX", meta: "first-loss · 10.2%+", fg: "#fbe7dd" },
    { tone: "var(--seam-500)", line: "#7a521a", name: "SEAM", meta: "second-loss · 5–7%", fg: "#fdf2db" },
    { tone: "var(--core-500)", line: "#3a4a26", name: "CORE", meta: "last-loss · 2.5–3.5%", fg: "#eef2e2" },
  ];
  return (
    <div style={{
      position: "relative", borderRadius: "var(--r-2xl)", overflow: "hidden",
      boxShadow: "var(--shadow-xl)", border: "1px solid var(--rock-700)",
      aspectRatio: "1 / 1", background: "var(--rock-900)",
    }}>
      {/* strata bands */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        {bands.map((b, i) => (
          <div key={b.name} style={{
            flex: 1, position: "relative", background: b.tone,
            borderBottom: i < 2 ? `3px solid ${b.line}` : "none",
            transform: "skewY(-7deg) scale(1.18)",
            transformOrigin: "left center",
            display: "flex", alignItems: "center",
          }}>
            <div style={{
              transform: "skewY(7deg)", paddingLeft: "32px",
              opacity: 0, animation: `shaleRise var(--dur-slow) var(--ease-out) ${0.15 + i * 0.12}s forwards`,
            }}>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "26px", color: b.fg, letterSpacing: "0.04em", lineHeight: 1 }}>{b.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: b.fg, opacity: 0.78, marginTop: "5px" }}>{b.meta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* drilled core-sample column */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, right: "20%", width: "16%",
        borderLeft: "1.5px dashed rgba(253,250,243,0.45)", borderRight: "1.5px dashed rgba(253,250,243,0.45)",
        background: "rgba(26,23,20,0.16)",
      }} />

      {/* descending USDC token */}
      <div style={{
        position: "absolute", right: "calc(20% + 8% - 22px)", width: "44px", height: "44px",
        borderRadius: "var(--r-pill)", background: "var(--sand-50)",
        boxShadow: "var(--shadow-lg), inset 0 0 0 2px var(--rock-200)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "15px", color: "var(--rock-700)",
        animation: "shaleDrill 4.2s var(--ease-in-out) infinite",
      }}>$</div>

      {/* corner label */}
      <div style={{ position: "absolute", top: "16px", left: "16px" }}>
        <Badge tone="ink">Core sample · live</Badge>
      </div>
    </div>
  );
}

function Hero({ onNavigate }) {
  return (
    <section style={{
      display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "48px",
      alignItems: "center", padding: "44px 0 36px",
    }}>
      <div>
        <div style={{ marginBottom: "22px", display: "flex", gap: "8px" }}>
          <Badge tone="neutral" dot>AI-managed</Badge>
          <Badge tone="neutral">Arbitrum · CDO waterfall</Badge>
        </div>
        <h1 style={{
          font: "var(--fw-bold) 58px/0.98 var(--font-serif)", letterSpacing: "-0.03em",
          color: "var(--text-strong)", marginBottom: "20px",
        }}>
          Yield, <em style={{ fontStyle: "italic", fontWeight: 600, color: "var(--rock-500)" }}>stratified.</em>
        </h1>
        <p style={{
          font: "400 17px/1.6 var(--font-sans)", color: "var(--text-body)",
          maxWidth: "440px", marginBottom: "30px",
        }}>
          Deposit USDC into one of three risk tiers. An on-chain AI agent rebalances across DeFi
          strategies every epoch and distributes yield through a sedimentary waterfall — CORE
          first, APEX last, losses absorbed top-down.
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button size="lg" tone="apex" iconRight="→" onClick={() => onNavigate("Deposit")}>Start Earning</Button>
          <Button size="lg" variant="outline" onClick={() => onNavigate("Analytics")}>View Analytics</Button>
        </div>
      </div>
      <StrataCrossSection />
    </section>
  );
}
window.Hero = Hero;
window.StrataCrossSection = StrataCrossSection;
