// Dashboard preview section ("Así se ve un laboratorio en vivo") for the
// LandingPage — DISABLED.
//
// Removed from LandingPage.tsx on request. To restore:
//
//   1) Paste DASHBOARD_PREVIEW_JSX back into LandingPage.tsx where the
//      "{/* Dashboard preview archived ... */}" marker sits (between the
//      "CHAU EXCEL" section and the "TRAZABILIDAD" section).
//   2) No CSS to move — the rules (.dash-frame, .dash-head, .kpis, .kpi,
//      .spark, .panels, .panel, .live, .alerts, .alert-row, .dash-foot)
//      are still present in src/components/landingStyles.ts.
//
// Was section "02 — Vista del producto".

export const DASHBOARD_PREVIEW_JSX = String.raw`
      {/* ═══════════════ DASHBOARD PREVIEW ═══════════════ */}
      <section id="dashboard" className="section layer">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>02</b><span>—</span><span>Vista del producto</span></div>
              <h2>Así se ve un<br />laboratorio<br /><span className="em">en vivo.</span></h2>
              <div className="en">A live look at the dashboard</div>
            </div>
            <div>
              <p className="lede">
                Lo primero que ve el jefe de laboratorio al entrar. Stock activo, alertas, últimos movimientos firmados — todo conectado a la misma base que registra cada acción y exporta cada auditoría.
              </p>
            </div>
          </div>

          <div className="dash-frame">
            <div className="dash-head">
              <div className="crumbs">Inventario / <b>Dashboard</b></div>
              <div className="right">
                <span>Hoy · 19 may 26</span>
                <span className="pill">Sector: todos</span>
                <span className="pill">▾</span>
              </div>
            </div>

            <div className="kpis">
              <div className="kpi">
                <div className="l">Reactivos activos</div>
                <div className="n">76 <span className="delta">+3</span></div>
                <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#2f6f88" stroke-width="1.5" points="0,18 12,16 24,17 36,14 48,15 60,12 72,11 84,8 96,9 108,6 120,5"></polyline>
                </svg>
              </div>
              <div className="kpi">
                <div className="l">Lotes en stock</div>
                <div className="n">142</div>
                <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#2f6f88" stroke-width="1.5" points="0,14 12,15 24,12 36,16 48,13 60,14 72,11 84,12 96,10 108,9 120,11"></polyline>
                </svg>
              </div>
              <div className="kpi alert">
                <div className="l">Stock bajo</div>
                <div className="n">1 <span className="delta warn">+1</span></div>
                <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#c99a2e" stroke-width="1.5" points="0,22 12,20 24,18 36,19 48,15 60,14 72,12 84,10 96,8 108,7 120,5"></polyline>
                </svg>
              </div>
              <div className="kpi crit">
                <div className="l">Sin stock</div>
                <div className="n">27 <span className="delta crit">+2</span></div>
                <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#c25450" stroke-width="1.5" points="0,20 10,17 20,21 30,15 40,18 50,13 60,16 70,10 80,12 90,8 100,11 110,6 120,9"></polyline>
                </svg>
              </div>
            </div>

            <div className="panels">
              <div className="panel">
                <h3>Últimos movimientos <span className="more">ver historial →</span></h3>
                <table className="live">
                  <tr><th>Fecha</th><th>Tipo</th><th>Reactivo</th><th>Lote</th><th>Cant.</th><th>Usuario</th></tr>
                  <tr><td className="m">18/5 · 23:57</td><td className="b">Ajuste</td><td className="r">Agar Bacteriológico</td><td className="b">LAB-2026-00001</td><td className="r">400 g</td><td className="m">Test</td></tr>
                  <tr><td className="m">18/5 · 23:49</td><td className="b">Ajuste</td><td className="r">Agar Bacteriológico</td><td className="b">LAB-2026-00001</td><td className="r">400 g</td><td className="m">Test</td></tr>
                  <tr><td className="m">18/5 · 20:44</td><td className="b">Ajuste</td><td className="r">Agar Bacteriológico</td><td className="b">LAB-2026-00001</td><td className="r">450 g</td><td className="m">Test</td></tr>
                  <tr><td className="m">16/5 · 20:29</td><td className="b">Ajuste</td><td className="r">Agar TSA</td><td className="b">LAB-2026-00002</td><td className="r">300 g</td><td className="m">Test</td></tr>
                  <tr><td className="m">16/5 · 20:28</td><td className="b">Ajuste</td><td className="r">Agar TSA</td><td className="b">LAB-2026-00002</td><td className="r">100 g</td><td className="m">Test</td></tr>
                  <tr><td className="m">16/5 · 20:23</td><td style={{color: 'var(--red)'}}>Salida</td><td className="r">Agar TSA</td><td className="b">LAB-2026-00002</td><td className="r">200 g</td><td className="m">Test</td></tr>
                </table>
              </div>
              <div className="panel">
                <h3>Alertas <span className="more">→</span></h3>
                <div className="alerts">
                  <div className="alert-row crit">
                    <span className="icon">⚠ STOCK</span>
                    <span className="txt">Stock bajo · <code>Agar Bacteriológico</code> · 400/500 g</span>
                    <span className="when">hoy</span>
                  </div>
                  <div className="alert-row">
                    <span className="icon">▲ EXP</span>
                    <span className="txt">Vence en 633 días · <code>LAB-2026-00001</code></span>
                    <span className="when">10 feb 28</span>
                  </div>
                  <div className="alert-row">
                    <span className="icon">▲ EQUIP</span>
                    <span className="txt">Balanza Analítica · 3 en uso · revisión pendiente</span>
                    <span className="when">24/4</span>
                  </div>
                  <div className="alert-row">
                    <span className="icon">▲ PROV</span>
                    <span className="txt">All-Science · falta cargar contactos del proveedor</span>
                    <span className="when">ayer</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-foot">
              <span><span className="ok">●</span> sincronizado · hace 4 seg.</span>
              <span>fastapi · sqlite · caddy + tls · m.carrera@lab</span>
            </div>
          </div>
        </div>
      </section>
`;
