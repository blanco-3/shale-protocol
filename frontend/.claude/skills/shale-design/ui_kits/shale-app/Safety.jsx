/* SHALE app — Safety Monitor */
const { Card, StatTile, Badge, StrataBar } = window.SHALEDesignSystem_1fdf95;

function Safety() {
  const s = window.SHALE_SAFETY;
  // current level from ratio (≥20 HEALTHY, ≥15 CAUTION, ≥10 WARNING, ≥5 DANGER, else CRITICAL)
  const r = s.apexRatioPct;
  const current = r >= 20 ? "HEALTHY" : r >= 15 ? "CAUTION" : r >= 10 ? "WARNING" : r >= 5 ? "DANGER" : "CRITICAL";
  const cfg = s.levels.find((l) => l.level === current);
  const toneVar = { positive: "var(--positive)", seam: "var(--seam-600)", warning: "var(--warning)", danger: "var(--danger)" }[cfg.tone];
  const toneBg = { positive: "var(--positive-bg)", seam: "var(--seam-50)", warning: "var(--warning-bg)", danger: "var(--danger-bg)" }[cfg.tone];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", marginBottom: "8px" }}>Safety Monitor</h1>
          <p style={{ font: "400 14px/1 var(--font-sans)", color: "var(--text-muted)" }}>Real-time protocol health and the APEX buffer system.</p>
        </div>
        <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Auto-refreshes every 30s · updated just now</span>
      </div>

      {/* current status hero */}
      <Card pad="lg" style={{ background: toneBg, border: `1px solid ${toneVar}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div className="shale-eyebrow" style={{ marginBottom: "8px" }}>Current Safety Level</div>
            <div style={{ font: "var(--fw-bold) 42px/1 var(--font-serif)", color: toneVar, letterSpacing: "-0.02em" }}>{cfg.level.charAt(0) + cfg.level.slice(1).toLowerCase()}</div>
            <p style={{ font: "400 14px/1.5 var(--font-sans)", color: "var(--text-body)", marginTop: "8px", maxWidth: "420px" }}>Protocol operating normally with an adequate first-loss buffer.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="shale-eyebrow" style={{ marginBottom: "8px" }}>APEX Buffer Ratio</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "42px", color: toneVar, letterSpacing: "-0.02em" }}>{r.toFixed(2)}%</div>
            <div style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)", marginTop: "6px" }}>Gate threshold: {s.gateThresholdPct.toFixed(1)}%</div>
          </div>
        </div>
        {/* gauge with milestone ticks */}
        <StrataBar value={Math.min(r, 100)} tone={cfg.tone === "seam" ? "seam" : cfg.tone} height={10} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "7px" }}>
          {["0%", "5%", "10%", "20%", "100%"].map((t) => (
            <span key={t} style={{ font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}>{t}</span>
          ))}
        </div>
      </Card>

      {/* deposit status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
        <Card pad="md"><StatTile label="CORE APY Target" value={s.coreApyTarget} sub="senior guaranteed" /></Card>
        <Card pad="md" style={{ background: s.gateActive ? "var(--warning-bg)" : undefined }}>
          <div className="shale-eyebrow" style={{ marginBottom: "10px" }}>CORE / SEAM Deposits</div>
          <Badge tone={s.gateActive ? "warning" : "positive"} dot>{s.gateActive ? "Gated — deposit APEX first" : "Enabled"}</Badge>
        </Card>
        <Card pad="md">
          <div className="shale-eyebrow" style={{ marginBottom: "10px" }}>APEX Deposits</div>
          <Badge tone="positive" dot>Always open</Badge>
          <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-faint)", marginTop: "10px" }}>Replenishes the first-loss buffer.</p>
        </Card>
      </div>

      {/* principal breakdown */}
      <Card pad="lg">
        <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", marginBottom: "18px" }}>Principal Breakdown</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "24px" }}>
          {[
            { k: "CORE", v: s.principal.core, p: s.principal.corePct, tone: "core" },
            { k: "SEAM", v: s.principal.seam, p: s.principal.seamPct, tone: "seam" },
            { k: "APEX (buffer)", v: s.principal.apex, p: s.principal.apexPct, tone: "apex" },
          ].map((row) => (
            <div key={row.k}>
              <div className="shale-eyebrow" style={{ marginBottom: "7px" }}>{row.k}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "20px", color: "var(--text-strong)", marginBottom: "10px" }}>{row.v}</div>
              <StrataBar value={row.p} tone={row.tone} valueLabel={row.p + "%"} height={8} />
            </div>
          ))}
        </div>
      </Card>

      {/* safety level table */}
      <Card pad="none">
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)" }}>Safety Level System</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Level", "APEX Ratio", "CORE APY", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 22px", font: "var(--fw-semibold) 10px/1 var(--font-sans)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", borderBottom: "1px solid var(--border-soft)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.levels.map((row) => {
              const on = row.level === current;
              const rc = { positive: "var(--positive)", seam: "var(--seam-700)", warning: "var(--warning)", danger: "var(--danger)" }[row.tone];
              return (
                <tr key={row.level} style={{ background: on ? "var(--surface-sunken)" : "transparent" }}>
                  <td style={{ padding: "14px 22px", font: `${on ? 700 : 600} 13px/1 var(--font-sans)`, color: rc, borderBottom: "1px solid var(--border-soft)" }}>
                    {row.level}{on && <span style={{ marginLeft: "8px", color: "var(--text-muted)" }}>←</span>}
                  </td>
                  <td style={{ padding: "14px 22px", font: "400 12px/1 var(--font-mono)", color: "var(--text-body)", borderBottom: "1px solid var(--border-soft)" }}>{row.threshold}</td>
                  <td style={{ padding: "14px 22px", font: "400 12px/1 var(--font-mono)", color: "var(--text-body)", borderBottom: "1px solid var(--border-soft)" }}>{row.coreAPY}</td>
                  <td style={{ padding: "14px 22px", font: "400 12px/1 var(--font-sans)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-soft)" }}>{row.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
window.Safety = Safety;
