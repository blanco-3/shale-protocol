/* SHALE app — analytics surface */
const { Card, StatTile, Badge, StrataBar } = window.SHALEDesignSystem_1fdf95;

function StrategyRow({ s }) {
  return (
    <div style={{ padding: "18px 0", borderBottom: "1px solid var(--border-soft)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "var(--r-pill)", background: shaleToneVar(s.tone) }} />
          <span style={{ font: "var(--fw-bold) 14px/1 var(--font-sans)", color: "var(--text-strong)" }}>{s.name}</span>
          <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>· {s.asset} · Arbitrum</span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "14px", color: "var(--positive)" }}>{s.apy} <span style={{ fontSize: "11px", color: "var(--core-300)" }}>live</span></span>
      </div>
      <p style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 12px 18px" }}>{s.model}</p>
      <div style={{ marginLeft: "18px" }}>
        <StrataBar value={s.actual} target={s.target} tone={s.tone} valueLabel={`${s.actual}% actual / ${s.target}% target`} />
      </div>
    </div>
  );
}

function Analytics() {
  const p = window.SHALE_PROTOCOL;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0 60px" }}>
      <div>
        <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", marginBottom: "8px" }}>Analytics</h1>
        <p style={{ font: "400 14px/1 var(--font-sans)", color: "var(--text-muted)" }}>Real-time protocol metrics · Arbitrum Sepolia</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
        <Card pad="md"><StatTile label="Total TVL" value={p.tvl} sub="principal + yield" /></Card>
        <Card pad="md"><StatTile label="Blended yield" value={p.blended} sub="weighted" /></Card>
        <Card pad="md"><StatTile label="Accrued yield" value="$41,208" delta="+1.2%" sub={"epoch #" + p.epoch} /></Card>
        <Card pad="md"><StatTile label="APEX buffer" value={p.bufferPct + "%"} deltaTone="warning" sub="first-loss cushion" /></Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card pad="lg">
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", marginBottom: "18px" }}>TVL Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <StrataBar label="CORE" tone="core" value={p.split.core} valueLabel={p.split.core + "%"} />
            <StrataBar label="SEAM" tone="seam" value={p.split.seam} valueLabel={p.split.seam + "%"} />
            <StrataBar label="APEX" tone="apex" value={p.split.apex} valueLabel={p.split.apex + "%"} />
          </div>
        </Card>
        <Card pad="lg">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)" }}>APEX Buffer Health</h3>
            <Badge tone="warning">CAUTION</Badge>
          </div>
          <StrataBar value={p.bufferPct} tone="warning" height={14} valueLabel={p.bufferPct + "% of principal"} style={{ marginBottom: "10px" }} />
          <p style={{ font: "400 12px/1.55 var(--font-sans)", color: "var(--text-muted)" }}>APEX principal is the first-loss cushion for CORE and SEAM. Below 15% blocks new senior deposits; below 10% triggers caution.</p>
        </Card>
      </div>

      <Card pad="lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)" }}>Live Strategy Farming</h3>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "var(--positive)" }}>Blended {p.blended}</span>
        </div>
        <div>
          {window.SHALE_STRATEGIES.map((s) => <StrategyRow key={s.name} s={s} />)}
        </div>
        <p style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-faint)", marginTop: "14px" }}>The AI agent monitors allocation drift and rebalances when actual weight diverges from target beyond the configured threshold.</p>
      </Card>
    </div>
  );
}
window.Analytics = Analytics;
