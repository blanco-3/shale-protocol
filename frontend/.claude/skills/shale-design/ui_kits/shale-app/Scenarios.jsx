/* SHALE app — Tranche Scenarios (CDO waterfall simulator) */
const { Card, Badge, StrataBar, Button } = window.SHALEDesignSystem_1fdf95;

function TierResult({ name, ordinal, principal, yld, apy, loss, finalTvl, tone, apyTone }) {
  const lossPct = principal > 0 ? (loss / principal) * 100 : 0;
  return (
    <Card accent={tone} pad="lg">
      <div className="shale-eyebrow" style={{ marginBottom: "14px" }}>{name} <span style={{ color: shaleToneVar(tone) }}>{ordinal}</span></div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--text-faint)", marginBottom: "5px" }}>Effective APY</div>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "30px", color: apyTone, letterSpacing: "-0.02em" }}>{window.shalePct(apy)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", font: "400 12px/1 var(--font-sans)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Starting TVL</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--text-body)" }}>{window.shaleFmt(principal)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Yield earned</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--positive)" }}>+{window.shaleFmt(yld)}</span></div>
        {loss > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--danger)" }}>Principal absorbed</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--danger)" }}>−{window.shaleFmt(loss)} ({lossPct.toFixed(1)}%)</span></div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "9px", fontWeight: 700 }}>
          <span style={{ color: "var(--text-strong)" }}>Final balance</span>
          <span style={{ fontFamily: "var(--font-mono)", color: loss > 0 ? "var(--danger)" : "var(--text-strong)" }}>{window.shaleFmt(finalTvl + yld)}</span>
        </div>
      </div>
    </Card>
  );
}

function Scenarios() {
  const S = window.SHALE_SIM;
  const [active, setActive] = React.useState("normal");
  const [isCustom, setIsCustom] = React.useState(false);
  const [customApy, setCustomApy] = React.useState(6);
  const [customLoss, setCustomLoss] = React.useState(0);

  const scenario = S.scenarios.find((s) => s.id === active);
  const stratApy = isCustom ? customApy : scenario.apy;
  const lossUsd = isCustom ? customLoss : scenario.loss;
  const res = window.shaleSimulate(stratApy, lossUsd);

  const statusTone = { healthy: "positive", apex_deficit: "warning", seam_hit: "warning", core_hit: "danger" }[res.status];
  const statusBg = { healthy: "var(--positive-bg)", apex_deficit: "var(--warning-bg)", seam_hit: "var(--seam-50)", core_hit: "var(--danger-bg)" }[res.status];
  const apexApyTone = res.apexApy > res.seamApy ? "var(--apex-600)" : res.apexApy > 0 ? "var(--seam-600)" : "var(--text-faint)";
  const floor = ((S.CORE_TVL * S.CORE_TARGET_PCT / 100 + S.SEAM_TVL * S.SEAM_TARGET_PCT / 100) / S.TOTAL_TVL * 100).toFixed(2);
  const maxApy = Math.max(res.coreApy, res.seamApy, res.apexApy, 0.1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0 60px" }}>
      <div>
        <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", marginBottom: "8px" }}>Tranche Scenarios</h1>
        <p style={{ font: "400 14px/1.5 var(--font-sans)", color: "var(--text-muted)", maxWidth: "620px" }}>How the CDO waterfall distributes yield and absorbs losses across different market conditions.</p>
      </div>

      {/* setup reference */}
      <Card surface="sunken" pad="md">
        <div className="shale-eyebrow" style={{ marginBottom: "14px" }}>Simulation Setup</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "18px" }}>
          <div><div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--text-faint)", marginBottom: "5px" }}>Total TVL</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "15px", color: "var(--text-strong)" }}>{window.shaleFmt(S.TOTAL_TVL)}</div></div>
          <div><div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--core-600)", marginBottom: "5px" }}>CORE · 50%</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "15px", color: "var(--text-strong)" }}>{window.shaleFmt(S.CORE_TVL)}</div><div style={{ font: "400 10px/1.3 var(--font-mono)", color: "var(--text-faint)", marginTop: "3px" }}>{S.CORE_TARGET_PCT}% guaranteed</div></div>
          <div><div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--seam-600)", marginBottom: "5px" }}>SEAM · 27%</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "15px", color: "var(--text-strong)" }}>{window.shaleFmt(S.SEAM_TVL)}</div><div style={{ font: "400 10px/1.3 var(--font-mono)", color: "var(--text-faint)", marginTop: "3px" }}>{S.SEAM_TARGET_PCT}% guaranteed</div></div>
          <div><div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--apex-600)", marginBottom: "5px" }}>APEX · 23%</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "15px", color: "var(--text-strong)" }}>{window.shaleFmt(S.APEX_TVL)}</div><div style={{ font: "400 10px/1.3 var(--font-mono)", color: "var(--text-faint)", marginTop: "3px" }}>first-loss buffer</div></div>
        </div>
      </Card>

      {/* scenario selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
        {S.scenarios.map((s) => {
          const on = !isCustom && active === s.id;
          return (
            <button key={s.id} onClick={() => { setActive(s.id); setIsCustom(false); }} style={{
              textAlign: "left", padding: "13px 15px", borderRadius: "var(--r-md)", cursor: "pointer",
              background: on ? "var(--rock-900)" : "var(--surface-raised)",
              border: `1.5px solid ${on ? "var(--rock-900)" : "var(--border)"}`,
              transition: "all var(--dur-fast) var(--ease-out)",
            }}>
              <div style={{ font: "var(--fw-bold) 13px/1.2 var(--font-sans)", color: on ? "var(--sand-50)" : "var(--text-strong)" }}>{s.label}</div>
              <div style={{ font: "400 11px/1 var(--font-mono)", color: on ? "var(--rock-200)" : "var(--text-faint)", marginTop: "5px" }}>{s.tag}</div>
            </button>
          );
        })}
        <button onClick={() => setIsCustom(true)} style={{
          textAlign: "left", padding: "13px 15px", borderRadius: "var(--r-md)", cursor: "pointer",
          background: isCustom ? "var(--rock-900)" : "transparent",
          border: `1.5px dashed ${isCustom ? "var(--rock-900)" : "var(--rock-300)"}`,
          transition: "all var(--dur-fast) var(--ease-out)",
        }}>
          <div style={{ font: "var(--fw-bold) 13px/1.2 var(--font-sans)", color: isCustom ? "var(--sand-50)" : "var(--text-strong)" }}>Custom</div>
          <div style={{ font: "400 11px/1 var(--font-mono)", color: isCustom ? "var(--rock-200)" : "var(--text-faint)", marginTop: "5px" }}>set your own</div>
        </button>
      </div>

      {/* description or custom sliders */}
      {isCustom ? (
        <Card pad="lg" style={{ border: "1.5px dashed var(--rock-300)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
            <div>
              <label style={{ display: "block", font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", marginBottom: "12px" }}>Strategy APY: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-strong)" }}>{customApy}%</span></label>
              <input type="range" min={-25} max={25} step={0.5} value={customApy} onChange={(e) => setCustomApy(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--rock-700)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}><span>−25%</span><span>0%</span><span>+25%</span></div>
            </div>
            <div>
              <label style={{ display: "block", font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", marginBottom: "12px" }}>Capital loss: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-strong)" }}>{window.shaleFmt(customLoss)}</span></label>
              <input type="range" min={0} max={3000} step={100} value={customLoss} onChange={(e) => setCustomLoss(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--apex-600)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}><span>$0</span><span>$1,500 (APEX)</span><span>$3,000</span></div>
            </div>
          </div>
        </Card>
      ) : (
        <Card surface="sunken" pad="md"><p style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-body)" }}>{scenario.desc}</p></Card>
      )}

      {/* strategy yield bar */}
      <Card pad="lg">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>Strategy yield on {window.shaleFmt(S.TOTAL_TVL)} TVL</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "12px", color: stratApy >= 0 ? "var(--positive)" : "var(--danger)" }}>{stratApy >= 0 ? "+" : ""}{Math.round(S.TOTAL_TVL * stratApy / 100).toLocaleString()} USDC/yr ({stratApy}% APY)</span>
        </div>
        <div style={{ position: "relative", height: "12px", background: "var(--surface-sunken)", borderRadius: "var(--r-pill)", overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(26,23,20,0.1)" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, [stratApy >= 0 ? "left" : "right"]: 0, width: `${Math.min(Math.abs(stratApy) / 25 * 100, 100)}%`, background: stratApy >= 0 ? "var(--positive)" : "var(--danger)", borderRadius: "var(--r-pill)", transition: "width var(--dur-slow) var(--ease-out)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}><span>−25%</span><span style={{ color: "var(--text-muted)" }}>CORE+SEAM floor: {floor}%</span><span>+25%</span></div>
      </Card>

      {/* outcome status */}
      <div style={{ padding: "14px 18px", borderRadius: "var(--r-md)", background: statusBg, border: `1px solid ${shaleToneVar(statusTone === "positive" ? "core" : statusTone === "danger" ? "apex" : "seam")}22` }}>
        <p style={{ font: "var(--fw-medium) 13px/1.5 var(--font-sans)", color: "var(--text-body)" }}>{res.note}</p>
      </div>

      {/* tier results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
        <TierResult name="CORE — Last-loss" ordinal="③" principal={S.CORE_TVL} yld={res.coreYield} apy={res.coreApy} loss={res.coreLoss} finalTvl={res.coreFinal} tone="core" apyTone="var(--positive)" />
        <TierResult name="SEAM — Second-loss" ordinal="②" principal={S.SEAM_TVL} yld={res.seamYield} apy={res.seamApy} loss={res.seamLoss} finalTvl={res.seamFinal} tone="seam" apyTone="var(--seam-700)" />
        <TierResult name="APEX — First-loss" ordinal="①" principal={S.APEX_TVL} yld={res.apexYield} apy={res.apexApy} loss={res.apexLoss} finalTvl={res.apexFinal} tone="apex" apyTone={apexApyTone} />
      </div>

      {/* APY comparison */}
      <Card pad="lg">
        <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", marginBottom: "18px" }}>APY Comparison</h3>
        {[
          { label: "CORE", apy: res.coreApy, tone: "core" },
          { label: "SEAM", apy: res.seamApy, tone: "seam" },
          { label: "APEX", apy: res.apexApy, tone: "apex" },
        ].map((row) => (
          <div key={row.label} style={{ marginBottom: "12px" }}>
            <StrataBar label={row.label} valueLabel={window.shalePct(row.apy)} value={Math.max(row.apy / maxApy * 100, 0)} max={100} tone={row.tone} height={12} />
          </div>
        ))}
        <p style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-faint)", marginTop: "10px" }}>
          {res.apexApy > res.seamApy
            ? `APEX earns ${(res.apexApy / Math.max(res.coreApy, 0.01)).toFixed(1)}× CORE — leverage at work.`
            : res.apexApy === 0
            ? "APEX earns 0% — absorbing losses instead."
            : "APY reversal: low strategy yield means APEX earns less than CORE despite first-loss risk."}
        </p>
      </Card>
    </div>
  );
}
window.Scenarios = Scenarios;
