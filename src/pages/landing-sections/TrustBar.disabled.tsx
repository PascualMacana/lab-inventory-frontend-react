// Trust / logos bar for LabInventory landing — DISABLED.
//
// Removed from LandingPage.tsx because no labs are actually live yet.
// To restore when real customer logos are available:
//
//   1) Paste TRUST_CSS (below) back into the <style> block in
//      LandingPage.tsx, right above the "/* ─── LIVE TICKER ─── */" rule.
//   2) Paste TRUST_JSX back into the JSX between the hero </section>
//      and the "{/* ═══════════════ LIVE TICKER ═══════════════ */}"
//      block.
//   3) Replace the placeholder text logos with real assets/copy.

export const TRUST_CSS = String.raw`
  /* ─── LOGOS BAR ────────────────────────────────────── */
  .trust {
    padding: var(--s5) var(--s8);
    background: var(--bg);
    border-bottom: 1px solid var(--border-subtle);
  }
  .trust-inner {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: var(--s7);
    align-items: center;
  }
  .trust-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    line-height: 1.5;
  }
  .trust-label em {
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    color: var(--text-primary);
    text-transform: none;
    letter-spacing: 0;
  }
  .logos {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--s5);
  }
  .logo {
    font-family: 'IBM Plex Serif', serif;
    font-weight: 300;
    font-size: 22px;
    color: var(--text-secondary);
    letter-spacing: -0.01em;
    transition: color 0.15s;
    white-space: nowrap;
  }
  .logo:hover { color: var(--text-primary); }
  .logo .sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.32px;
    color: var(--text-placeholder);
    text-transform: uppercase;
    display: block;
    margin-top: 2px;
  }
`;

export const TRUST_JSX = String.raw`
      {/* ═══════════════ TRUST LOGOS ═══════════════ */}
      <section className="trust">
        <div className="trust-inner">
          <div className="trust-label">
            <em>Hoy en uso en</em><br />
            laboratorios académicos y privados.
          </div>
          <div className="logos">
            <div className="logo">IBQB<span className="sub">UBA · CONICET</span></div>
            <div className="logo">INTA<span className="sub">Castelar</span></div>
            <div className="logo">Instituto Leloir<span className="sub">Buenos Aires</span></div>
            <div className="logo">FCEN<span className="sub">UBA · Q. Biológica</span></div>
            <div className="logo">LabFarma<span className="sub">Industrial · Rosario</span></div>
            <div className="logo">Bioterio Central<span className="sub">UNLP</span></div>
          </div>
        </div>
      </section>
`;
