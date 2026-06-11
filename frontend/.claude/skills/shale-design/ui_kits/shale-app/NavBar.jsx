/* SHALE app — top navigation bar */
const { StrataMark, Button, Badge } = window.SHALEDesignSystem_1fdf95;

function NavBar({ active, onNavigate, connected, onConnect }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: "var(--nav-h)", padding: "0 28px",
      background: "rgba(249,244,234,0.86)",
      backdropFilter: "blur(14px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ cursor: "pointer", display: "flex" }} onClick={() => onNavigate("Dashboard")}>
        <StrataMark size={32} wordmark wordmarkStyle="caps" color="var(--rock-700)" />
      </div>

      <nav style={{ display: "flex", gap: "4px" }}>
        {window.SHALE_NAV.map((item) => {
          const on = item === active;
          return (
            <button key={item} onClick={() => onNavigate(item)} style={{
              fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "13px",
              color: on ? "var(--text-strong)" : "var(--text-muted)",
              background: on ? "var(--surface-raised)" : "transparent",
              border: on ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: on ? "var(--shadow-xs)" : "none",
              padding: "8px 14px", borderRadius: "var(--r-pill)", cursor: "pointer",
              transition: "all var(--dur-fast) var(--ease-out)",
            }}>{item}</button>
          );
        })}
      </nav>

      {connected ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Badge tone="positive" dot>Arbitrum</Badge>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600,
            color: "var(--text-body)", padding: "8px 12px",
            background: "var(--surface-raised)", border: "1px solid var(--border)",
            borderRadius: "var(--r-pill)", whiteSpace: "nowrap",
          }}>0x22a9…b71A</span>
        </div>
      ) : (
        <Button size="sm" onClick={onConnect}>Connect Wallet</Button>
      )}
    </header>
  );
}
window.NavBar = NavBar;
