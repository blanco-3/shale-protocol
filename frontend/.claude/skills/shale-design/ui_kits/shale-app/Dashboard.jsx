/* SHALE app — dashboard surfaces */
const { Card, StatTile, Badge, RiskMeter, StrataBar, Button } = window.SHALEDesignSystem_1fdf95;

function TierCard({ tier, onDeposit }) {
  return (
    <Card accent={tier.tone} strataEdge interactive pad="lg" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div className="shale-eyebrow">{tier.label}</div>
          <div style={{ font: "var(--fw-bold) 24px/1 var(--font-serif)", color: "var(--text-strong)", marginTop: "6px", letterSpacing: "0.02em" }}>{tier.name}</div>
        </div>
        <RiskMeter level={tier.risk} showLabel={false} />
      </div>
      <div style={{ display: "flex", gap: "24px", marginBottom: "16px" }}>
        <div>
          <div className="shale-eyebrow" style={{ marginBottom: "5px" }}>Target APY</div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "21px", color: shaleToneVar(tier.tone), letterSpacing: "-0.01em" }}>{tier.apy}</div>
        </div>
        {tier.lev && (
          <div>
            <div className="shale-eyebrow" style={{ marginBottom: "5px" }}>Leverage</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "21px", color: "var(--text-strong)" }}>{tier.lev}</div>
          </div>
        )}
      </div>
      <p style={{ font: "400 13px/1.6 var(--font-sans)", color: "var(--text-muted)", flex: 1, marginBottom: "16px" }}>{tier.blurb}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid var(--border-soft)" }}>
        <Badge tone={tier.tone}>{tier.loss}</Badge>
        <Button size="sm" variant="outline" tone={tier.tone} onClick={() => onDeposit(tier.id)}>Deposit →</Button>
      </div>
    </Card>
  );
}

function LossCascade() {
  const steps = [
    { tone: "apex", name: "① APEX", note: "First-loss", sub: "High APY · principal at risk" },
    { tone: "seam", name: "② SEAM", note: "Second-loss", sub: "Mid APY · partial buffer" },
    { tone: "core", name: "③ CORE", note: "Last-loss", sub: "Safe APY · protected" },
  ];
  const bg = { apex: "var(--apex-50)", seam: "var(--seam-50)", core: "var(--core-50)" };
  return (
    <Card pad="lg">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
        <h3 style={{ font: "var(--fw-semibold) 18px/1 var(--font-serif)", color: "var(--text-strong)" }}>Risk–Yield Tradeoff</h3>
        <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>loss absorption order</span>
      </div>
      <p style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-muted)", marginBottom: "18px" }}>Who absorbs the hit first if a strategy underperforms.</p>
      <div style={{ display: "flex", alignItems: "stretch", gap: "8px" }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.name}>
            <div style={{
              flex: 1, background: bg[s.tone], borderRadius: "var(--r-md)",
              padding: "16px 14px", textAlign: "center", border: `1px solid ${shaleToneVar(s.tone)}22`,
            }}>
              <div style={{ font: "var(--fw-bold) 15px/1 var(--font-sans)", color: shaleToneVar(s.tone), letterSpacing: "0.02em" }}>{s.name}</div>
              <div style={{ font: "var(--fw-semibold) 12px/1 var(--font-sans)", color: shaleToneVar(s.tone), marginTop: "8px", opacity: 0.85 }}>{s.note}</div>
              <div style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: "8px" }}>{s.sub}</div>
            </div>
            {i < 2 && <div style={{ display: "flex", alignItems: "center", color: "var(--text-faint)", fontSize: "16px" }}>▶</div>}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}

function AgentPanel({ accepted, onAccept }) {
  const a = window.SHALE_PROTOCOL.agent;
  return (
    <Card surface="ink" pad="lg">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "var(--r-pill)", background: "var(--core-300)", boxShadow: "0 0 0 4px rgba(149,169,109,0.18)" }} />
          <span style={{ font: "var(--fw-semibold) 14px/1 var(--font-sans)", color: "var(--sand-50)" }}>AI Agent — Proposal #{a.id}</span>
        </div>
        <Badge tone={accepted ? "positive" : "warning"}>{accepted ? "EXECUTED" : "PENDING"}</Badge>
      </div>
      <div style={{ display: "flex", gap: "32px", marginBottom: "14px" }}>
        <div><div className="shale-eyebrow" style={{ color: "var(--text-on-ink-muted)" }}>New CORE</div><div style={{ fontFamily: "var(--font-mono)", fontSize: "15px", color: "var(--rock-150)", marginTop: "5px" }}>{a.core}</div></div>
        <div><div className="shale-eyebrow" style={{ color: "var(--text-on-ink-muted)" }}>New SEAM</div><div style={{ fontFamily: "var(--font-mono)", fontSize: "15px", color: "var(--rock-150)", marginTop: "5px" }}>{a.seam}</div></div>
      </div>
      <p style={{ font: "400 13px/1.6 var(--font-sans)", color: "var(--text-on-ink-muted)", marginBottom: "18px", maxWidth: "640px" }}>{a.reason}</p>
      {accepted
        ? <span style={{ font: "var(--fw-medium) 13px/1 var(--font-sans)", color: "var(--core-300)" }}>✓ Proposal executed on-chain.</span>
        : <Button size="sm" tone="accent" onClick={onAccept}>Accept proposal →</Button>}
    </Card>
  );
}

function Dashboard({ onNavigate, agentAccepted, onAcceptAgent }) {
  const p = window.SHALE_PROTOCOL;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "48px" }}>
      <window.Hero onNavigate={onNavigate} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "12px" }}>
        <Card pad="md"><StatTile label="Total TVL" value={p.tvl} delta="+7.34%" sub="principal + yield" /></Card>
        <Card pad="md"><StatTile label="Blended APY" value={p.blended} sub="weighted strategies" /></Card>
        <Card pad="md"><StatTile label="APEX Buffer" value={p.bufferPct + "%"} deltaTone="warning" sub="of principal" /></Card>
        <Card pad="md"><StatTile label="Epoch" value={"#" + p.epoch} sub="settled" /></Card>
        <Card pad="md"><StatTile label="Strategies" value="3" sub="Aave · Camelot · Morpho" /></Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
        {window.SHALE_TIERS.map((t) => <TierCard key={t.id} tier={t} onDeposit={(id) => onNavigate("Deposit", id)} />)}
      </div>

      <LossCascade />
      <AgentPanel accepted={agentAccepted} onAccept={onAcceptAgent} />
    </div>
  );
}
window.Dashboard = Dashboard;
