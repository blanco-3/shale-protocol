/* SHALE app — deposit flow */
const { Card, Button, Input, SegmentedControl, Badge, RiskMeter } = window.SHALEDesignSystem_1fdf95;

function DepositFlow({ initialTier }) {
  const tiers = window.SHALE_TIERS;
  const [tier, setTier] = React.useState(initialTier || "apex");
  const [amount, setAmount] = React.useState("1000.00");
  const [stage, setStage] = React.useState("idle"); // idle → approving → done
  const [balance, setBalance] = React.useState(1000);
  const active = tiers.find((t) => t.id === tier);

  function deposit() {
    setStage("approving");
    setTimeout(() => setStage("done"), 1400);
  }
  function faucet() { setBalance((b) => b + 1000); }

  return (
    <div style={{ maxWidth: "520px", margin: "0 auto", padding: "40px 0 60px" }}>
      <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", marginBottom: "8px" }}>Deposit</h1>
      <p style={{ font: "400 14px/1.5 var(--font-sans)", color: "var(--text-muted)", marginBottom: "26px" }}>Choose a tier, then deposit USDC. Yield settles every epoch via waterfall.</p>

      {stage === "done" && (
        <div style={{ marginBottom: "20px" }}>
          <Card surface="paper" accent="core" pad="md">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ font: "var(--fw-semibold) 14px/1 var(--font-sans)", color: "var(--positive)" }}>✓ Deposit confirmed</div>
                <div style={{ font: "400 12px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: "6px" }}>${amount} → {active.name} · shl{active.name} minted</div>
              </div>
              <Badge tone="neutral" mono>0x9f2c…41be</Badge>
            </div>
          </Card>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <div className="shale-eyebrow" style={{ marginBottom: "10px" }}>Select tier</div>
        <SegmentedControl value={tier} onChange={setTier} size="lg" options={tiers.map((t) => ({
          value: t.id, label: t.name, sub: t.label, tone: t.tone,
        }))} />
      </div>

      <Card pad="lg" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ font: "var(--fw-bold) 17px/1 var(--font-serif)", color: "var(--text-strong)" }}>{active.name}</span>
            <RiskMeter level={active.risk} />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "16px", color: shaleToneVar(active.tone) }}>{active.apy}</span>
        </div>
        <p style={{ font: "400 12px/1.55 var(--font-sans)", color: "var(--text-muted)", marginBottom: "18px" }}>{active.blurb}</p>

        <Input label="Amount" prefix="$" suffix="USDC" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
          {[25, 50, 75].map((p) => (
            <Button key={p} size="sm" variant="outline" tone="default" onClick={() => setAmount((balance * p / 100).toFixed(2))} style={{ flex: 1 }}>{p}%</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setAmount(balance.toFixed(2))} style={{ flex: 1 }}>MAX</Button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Balance: <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-body)" }}>${balance.toFixed(2)}</span></span>
          <button onClick={faucet} style={{ background: "none", border: "none", cursor: "pointer", font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--accent-600)", textDecoration: "underline" }}>Get 1,000 test USDC</button>
        </div>
      </Card>

      <Button fullWidth size="lg" tone={active.tone} disabled={stage === "approving"} onClick={deposit}>
        {stage === "approving" ? "Approving & depositing…" : `Deposit to ${active.name} →`}
      </Button>

      <div style={{ marginTop: "18px" }}>
        <Card surface="sunken" pad="md">
          <div className="shale-eyebrow" style={{ marginBottom: "10px" }}>Important</div>
          {[
            "Deposits are deployed to the yield strategy immediately.",
            "Yield distributes at the end of each epoch via waterfall.",
            "APEX bears first loss if yield falls short of CORE/SEAM targets.",
          ].map((t) => (
            <div key={t} style={{ display: "flex", gap: "8px", font: "400 12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginBottom: "6px" }}>
              <span style={{ color: shaleToneVar(active.tone) }}>•</span>{t}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
window.DepositFlow = DepositFlow;
