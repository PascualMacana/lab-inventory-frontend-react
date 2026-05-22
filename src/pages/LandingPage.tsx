import { useLandingLogin } from "../components/LandingShell";

export function LandingPage() {
  const { openLogin } = useLandingLogin();

  return (
    <>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero">
        <div className="hero-meta">
          <div className="left">
            <span>Issue №&nbsp;<b>0024</b></span>
            <span>Mayo · 2026</span>
            <span><b>labinventory.lat</b> · v2.1</span>
            <span>en producción</span>
          </div>
          <div className="right">Para el científico que prefiere mirar reactivos, no planillas.</div>
        </div>
      
        <div className="hero-grid">
          <div>
            <h1 className="hero-title">
              Inventario,<br />
                      <span className="em">como en la mesada.<span className="cursor"></span></span>
            </h1>
            <div className="hero-en">Inventory the way it works on the bench. Reagents, batches &amp; expirations — traced from gram to audit, in real time.</div>
            <p className="hero-body" style={{marginTop: 'var(--s6)', maxWidth: '540px'}}>
              LabInventory es <b>maleable</b>: se adapta al flujo del laboratorio, no al revés. QR por frasco, FIFO automático, agentes de IA que entienden tu inventario y trazabilidad firmada — desde la mesada hasta la auditoría.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#cta">Solicitar demo</a>
              <a className="btn btn-ghost" href="#" onClick={openLogin}>Ingresar</a>
              <span className="meta">→ 30 min · sin tarjeta</span>
            </div>
          </div>
      
          <div className="hero-stat">
            <div className="label">Hoy, en producción</div>
            <div className="figure">142 <span className="unit">lotes</span></div>
            <div className="meta">trazados al gramo · firmados por usuario · listos para auditoría</div>
            <div className="breakdown">
              <div><div className="n">76</div><div className="l">Reactivos<br />activos</div></div>
              <div><div className="n">56</div><div className="l">Movimientos<br />· 30d</div></div>
              <div><div className="n">99.98%</div><div className="l">Uptime<br />· 30d</div></div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Trust/logos bar archived to src/pages/landing-sections/TrustBar.disabled.tsx until real customer logos exist. */}

      {/* ═══════════════ LIVE TICKER ═══════════════ */}
      <section className="ticker">
        <div className="ticker-inner">
          <span className="ticker-label">● Live · últimos movimientos en labinventory.lat</span>
          <span className="ticker-item"><span className="when">hace 12 s</span><span className="what">Consumo</span><span className="who">m.carrera@lab</span><span>· LAB-2026-00031 · 25 mL</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 1 m</span><span className="what">Ajuste</span><span className="who">test@lab</span><span>· LAB-2026-00001 · −50 g</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 3 m</span><span className="what">Auditoría exportada</span><span className="who">jefe@lab</span><span>· PDF firmado · 14 eventos</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 6 m</span><span className="what">Visión IA · ingreso</span><span className="who">deposito@lab</span><span>· Agar TSA · OneLab</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 11 m</span><span className="what">Consumo</span><span className="who">j.silva@lab</span><span>· LAB-2026-00067 · 100 µL</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 18 m</span><span className="what">Stock bajo</span><span className="who">[alerta]</span><span>· Agar Bacteriológico · 400/500 g</span></span>
          <span className="ticker-sep">·</span>
          {/* repeat for seamless loop */}
          <span className="ticker-item"><span className="when">hace 12 s</span><span className="what">Consumo</span><span className="who">m.carrera@lab</span><span>· LAB-2026-00031 · 25 mL</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 1 m</span><span className="what">Ajuste</span><span className="who">test@lab</span><span>· LAB-2026-00001 · −50 g</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 3 m</span><span className="what">Auditoría exportada</span><span className="who">jefe@lab</span><span>· PDF firmado · 14 eventos</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 6 m</span><span className="what">Visión IA · ingreso</span><span className="who">deposito@lab</span><span>· Agar TSA · OneLab</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 11 m</span><span className="what">Consumo</span><span className="who">j.silva@lab</span><span>· LAB-2026-00067 · 100 µL</span></span>
          <span className="ticker-sep">·</span>
          <span className="ticker-item"><span className="when">hace 18 m</span><span className="what">Stock bajo</span><span className="who">[alerta]</span><span>· Agar Bacteriológico · 400/500 g</span></span>
          <span className="ticker-sep">·</span>
        </div>
      </section>
      
      {/* ═══════════════ CHAU EXCEL ═══════════════ */}
      <section id="how" className="section">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>01</b><span>—</span><span>El final de una era</span></div>
              <h2>Chau, Excel.<br /><span className="em">Hola, mesada.</span></h2>
              <div className="en">Goodbye spreadsheet. Hello bench.</div>
            </div>
            <div>
              <p className="lede">
                Excel hizo lo que pudo. Te acompañó hasta acá. Pero la trazabilidad de un laboratorio no es una planilla compartida — es un sistema vivo, firmado, en tiempo real. Tres cosas que dejás de hacer el día que arrancás con LabInventory.
              </p>
            </div>
          </div>
      
          <div className="steps">
            <div className="step">
              <div className="ribbon"><b>01</b><span>Lo que dejás atrás</span></div>
              <div className="farewell">"Pasame la última versión de la planilla, ¿esta es la buena?"</div>
              <div className="hello">QR por frasco<span className="em">.</span></div>
              <div className="en">One source of truth · per bottle</div>
              <p className="d">Cada lote tiene su código <code>LAB-2026-00001</code>. Escaneás y el sistema sabe exactamente de qué envase estás descontando. No hay dos versiones de la verdad. No hay copias en mails.</p>
              <div className="receipt"><span>Antes: 5 versiones en Drive</span><span className="ok">● una sola fuente</span></div>
            </div>
      
            <div className="step">
              <div className="ribbon"><b>02</b><span>Lo que dejás atrás</span></div>
              <div className="farewell">"¿Alguien sabe quién usó el etanol el viernes?"</div>
              <div className="hello">Firma por <span className="em">usuario</span>.</div>
              <div className="en">Signed by user · timestamped</div>
              <p className="d">Cada movimiento queda firmado con usuario, hora, sector y sesión. Si te equivocás, registrás un ajuste con motivo — pero el historial no se edita. La pregunta deja de existir.</p>
              <div className="receipt"><span>Antes: silencio incómodo</span><span className="ok">● historial inmutable</span></div>
            </div>
      
            <div className="step">
              <div className="ribbon"><b>03</b><span>Lo que dejás atrás</span></div>
              <div className="farewell">"Necesito el resumen para ANMAT para mañana."</div>
              <div className="hello">PDF firmado <span className="em">al toque</span>.</div>
              <div className="en">Audit-ready · one click</div>
              <p className="d">Una auditoría de lote se descarga en PDF firmado, con toda la historia: ingresos, consumos, ajustes y aprobaciones. Listo para inspectores de ANMAT, ISO o equivalentes. Sin pegar capturas a mano.</p>
              <div className="receipt"><span>Antes: una semana de carpetas</span><span className="ok">● una mañana</span></div>
            </div>
          </div>
        </div>
      </section>
      
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
      
      {/* ═══════════════ TRAZABILIDAD (expandida) ═══════════════ */}
      <section id="trazabilidad" className="section">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>03</b><span>—</span><span>Trazabilidad</span></div>
              <h2>Cada frasco<br />tiene <span className="em">historia.</span></h2>
              <div className="en">Bottle-level audit · QR · immutable log</div>
            </div>
            <div>
              <p className="lede">
                La base inmutable del sistema. Cada movimiento queda firmado con usuario, hora, sector y sesión. Reconstruí la historia completa de un frasco en una vista. La diferencia con un Excel es esta — y la diferencia con un ERP también.
              </p>
            </div>
          </div>
      
          <div className="trace-hero">
            <div className="trace-copy">
              <h3>QR por frasco<span className="en">QR per physical bottle</span></h3>
              <p>Cada lote recibe un código interno imprimible. Pegás el QR al frasco y el sistema deja de adivinar de qué envase estás descontando.</p>
      
              <h3>Movimientos inmutables<span className="en">Immutable movement log</span></h3>
              <p>El historial no se edita. Si te equivocás, registrás un ajuste con motivo. La auditoría externa ve exactamente qué pasó y quién lo aprobó.</p>
      
              <h3>Saldo progresivo<span className="en">Running balance</span></h3>
              <p>Cada línea muestra el saldo después del movimiento. La cuenta cierra siempre, lote por lote, gramo por gramo.</p>
      
              <h3>Exportable<span className="en">PDF · CSV · firmado</span></h3>
              <p>Una auditoría de lote se descarga en PDF firmado, listo para inspectores de ANMAT, ISO o equivalentes locales.</p>
            </div>
      
            <div className="audit-card">
              <div className="audit-head">
                <svg className="qr-svg" viewBox="0 0 21 21">
                  <rect x="0" y="0" width="21" height="21" fill="#fff"></rect>
                  <g fill="#1f2933">
                    <rect x="0" y="0" width="7" height="7"></rect>
                    <rect x="14" y="0" width="7" height="7"></rect>
                    <rect x="0" y="14" width="7" height="7"></rect>
                  </g>
                  <g fill="#fff">
                    <rect x="1" y="1" width="5" height="5"></rect>
                    <rect x="15" y="1" width="5" height="5"></rect>
                    <rect x="1" y="15" width="5" height="5"></rect>
                  </g>
                  <g fill="#1f2933">
                    <rect x="2" y="2" width="3" height="3"></rect>
                    <rect x="16" y="2" width="3" height="3"></rect>
                    <rect x="2" y="16" width="3" height="3"></rect>
                    <rect x="8" y="0" width="1" height="1"></rect><rect x="10" y="0" width="1" height="1"></rect><rect x="13" y="0" width="1" height="1"></rect>
                    <rect x="9" y="1" width="1" height="1"></rect><rect x="11" y="1" width="1" height="1"></rect><rect x="12" y="1" width="1" height="1"></rect>
                    <rect x="8" y="2" width="1" height="1"></rect><rect x="10" y="2" width="1" height="1"></rect><rect x="13" y="2" width="1" height="1"></rect>
                    <rect x="9" y="3" width="1" height="1"></rect><rect x="11" y="3" width="1" height="1"></rect>
                    <rect x="8" y="4" width="1" height="1"></rect><rect x="12" y="4" width="1" height="1"></rect><rect x="13" y="4" width="1" height="1"></rect>
                    <rect x="10" y="5" width="1" height="1"></rect><rect x="11" y="5" width="1" height="1"></rect>
                    <rect x="0" y="8" width="1" height="1"></rect><rect x="2" y="8" width="1" height="1"></rect><rect x="4" y="8" width="1" height="1"></rect><rect x="6" y="8" width="1" height="1"></rect><rect x="9" y="8" width="1" height="1"></rect><rect x="11" y="8" width="1" height="1"></rect><rect x="14" y="8" width="1" height="1"></rect><rect x="16" y="8" width="1" height="1"></rect><rect x="18" y="8" width="1" height="1"></rect><rect x="20" y="8" width="1" height="1"></rect>
                    <rect x="1" y="9" width="1" height="1"></rect><rect x="3" y="9" width="1" height="1"></rect><rect x="5" y="9" width="1" height="1"></rect><rect x="8" y="9" width="1" height="1"></rect><rect x="10" y="9" width="1" height="1"></rect><rect x="12" y="9" width="1" height="1"></rect><rect x="13" y="9" width="1" height="1"></rect><rect x="15" y="9" width="1" height="1"></rect><rect x="17" y="9" width="1" height="1"></rect><rect x="19" y="9" width="1" height="1"></rect>
                    <rect x="0" y="10" width="1" height="1"></rect><rect x="2" y="10" width="1" height="1"></rect><rect x="4" y="10" width="1" height="1"></rect><rect x="7" y="10" width="1" height="1"></rect><rect x="9" y="10" width="1" height="1"></rect><rect x="11" y="10" width="1" height="1"></rect><rect x="14" y="10" width="1" height="1"></rect><rect x="16" y="10" width="1" height="1"></rect><rect x="18" y="10" width="1" height="1"></rect>
                    <rect x="1" y="11" width="1" height="1"></rect><rect x="3" y="11" width="1" height="1"></rect><rect x="5" y="11" width="1" height="1"></rect><rect x="8" y="11" width="1" height="1"></rect><rect x="10" y="11" width="1" height="1"></rect><rect x="12" y="11" width="1" height="1"></rect><rect x="15" y="11" width="1" height="1"></rect><rect x="17" y="11" width="1" height="1"></rect><rect x="19" y="11" width="1" height="1"></rect>
                    <rect x="0" y="12" width="1" height="1"></rect><rect x="2" y="12" width="1" height="1"></rect><rect x="6" y="12" width="1" height="1"></rect><rect x="9" y="12" width="1" height="1"></rect><rect x="11" y="12" width="1" height="1"></rect><rect x="13" y="12" width="1" height="1"></rect><rect x="14" y="12" width="1" height="1"></rect><rect x="16" y="12" width="1" height="1"></rect><rect x="20" y="12" width="1" height="1"></rect>
                    <rect x="8" y="13" width="1" height="1"></rect><rect x="10" y="13" width="1" height="1"></rect><rect x="12" y="13" width="1" height="1"></rect><rect x="15" y="13" width="1" height="1"></rect><rect x="18" y="13" width="1" height="1"></rect>
                    <rect x="8" y="14" width="1" height="1"></rect><rect x="13" y="14" width="1" height="1"></rect><rect x="14" y="14" width="1" height="1"></rect><rect x="16" y="14" width="1" height="1"></rect><rect x="20" y="14" width="1" height="1"></rect>
                    <rect x="9" y="15" width="1" height="1"></rect><rect x="11" y="15" width="1" height="1"></rect><rect x="13" y="15" width="1" height="1"></rect><rect x="15" y="15" width="1" height="1"></rect><rect x="17" y="15" width="1" height="1"></rect><rect x="19" y="15" width="1" height="1"></rect>
                    <rect x="8" y="16" width="1" height="1"></rect><rect x="10" y="16" width="1" height="1"></rect><rect x="14" y="16" width="1" height="1"></rect><rect x="18" y="16" width="1" height="1"></rect><rect x="20" y="16" width="1" height="1"></rect>
                    <rect x="9" y="17" width="1" height="1"></rect><rect x="11" y="17" width="1" height="1"></rect><rect x="13" y="17" width="1" height="1"></rect><rect x="15" y="17" width="1" height="1"></rect><rect x="17" y="17" width="1" height="1"></rect>
                    <rect x="8" y="18" width="1" height="1"></rect><rect x="12" y="18" width="1" height="1"></rect><rect x="14" y="18" width="1" height="1"></rect><rect x="16" y="18" width="1" height="1"></rect><rect x="19" y="18" width="1" height="1"></rect><rect x="20" y="18" width="1" height="1"></rect>
                    <rect x="9" y="19" width="1" height="1"></rect><rect x="11" y="19" width="1" height="1"></rect><rect x="13" y="19" width="1" height="1"></rect><rect x="15" y="19" width="1" height="1"></rect><rect x="17" y="19" width="1" height="1"></rect>
                    <rect x="8" y="20" width="1" height="1"></rect><rect x="10" y="20" width="1" height="1"></rect><rect x="12" y="20" width="1" height="1"></rect><rect x="14" y="20" width="1" height="1"></rect><rect x="16" y="20" width="1" height="1"></rect><rect x="18" y="20" width="1" height="1"></rect>
                  </g>
                </svg>
                <div className="info">
                  <div className="code">LAB-2026-00001</div>
                  <div className="prod">Agar Bacteriológico · OneLab · 500 g (inicial)</div>
                  <div className="meta">Ingreso: 11 may 2026 · Lote fab.: 250702B20 · Ubic.: 1B</div>
                  <div className="meta" style={{marginTop: '0'}}>Vence: 10 feb 2028 (633 días)</div>
                </div>
                <div className="status-block">
                  <div>
                    <div className="num">400 g</div>
                    <div className="label">Saldo</div>
                  </div>
                  <div>
                    <div className="num" style={{fontSize: '16px', color: 'var(--warm-fg)'}}>bajo</div>
                    <div className="label">mín. 500 g</div>
                  </div>
                </div>
              </div>
      
              <div className="timeline">
                <div className="timeline-row t-in">
                  <span className="when">11 MAY · 09:12</span>
                  <span className="glyph">↓</span>
                  <span className="what">Ingreso · alta desde Visión IA<span className="who"> · deposito@lab</span></span>
                  <span className="qty">+500 g</span>
                </div>
                <div className="timeline-row t-out">
                  <span className="when">16 MAY · 20:23</span>
                  <span className="glyph">↑</span>
                  <span className="what">Salida · prueba<span className="who"> · test@lab · Microbiología</span></span>
                  <span className="qty">−200 g</span>
                </div>
                <div className="timeline-row t-adj">
                  <span className="when">16 MAY · 20:28</span>
                  <span className="glyph">±</span>
                  <span className="what">Ajuste · pérdida en test<span className="who"> · test@lab · aprobado por jefe</span></span>
                  <span className="qty">−100 g</span>
                </div>
                <div className="timeline-row t-adj">
                  <span className="when">18 MAY · 20:44</span>
                  <span className="glyph">±</span>
                  <span className="what">Ajuste · conteo físico<span className="who"> · test@lab</span></span>
                  <span className="qty">+250 g</span>
                </div>
                <div className="timeline-row t-adj">
                  <span className="when">18 MAY · 23:57</span>
                  <span className="glyph">±</span>
                  <span className="what">Ajuste · regularización<span className="who"> · test@lab</span></span>
                  <span className="qty">−50 g</span>
                </div>
                <div className="timeline-row t-audit">
                  <span className="when">19 MAY · 12:48</span>
                  <span className="glyph">✓</span>
                  <span className="what">Auditoría exportada<span className="who"> · PDF firmado · jefe@lab</span></span>
                  <span className="qty" style={{color: 'var(--green)'}}>·</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Modules grid archived to src/pages/landing-sections/ModulesSection.disabled.tsx. */}

      {/* ═══════════════ AGENTES IA ═══════════════ */}
      <section id="agentes" className="section">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>05</b><span>—</span><span>Agentes IA</span></div>
              <h2>IA que trabaja<br /><span className="em">para el científico.</span></h2>
              <div className="en">Two agents · chat &amp; vision · always human-confirmed</div>
            </div>
            <div>
              <p className="lede">
                Dos agentes integrados al flujo diario. Uno consulta en lenguaje natural, el otro lee etiquetas con la cámara. Ninguno escribe sin que un humano apruebe. Human-in-the-loop por diseño.
              </p>
            </div>
          </div>
      
          <div className="agents">
            <div className="agent">
              <div className="head">
                <span className="id">Asistente · M11</span>
                <span className="status">Activo</span>
              </div>
              <h3 className="title">Chat en <span className="em">lenguaje natural</span></h3>
              <p className="body">Hacés preguntas como si le hablaras a un colega. El agente consulta la base en tiempo real y responde con cifras y referencias concretas.</p>
              <div className="demo-box">
                <div className="demo-header"><span>Conversación · ejemplo</span><span className="tag tag-blue">m.carrera@lab</span></div>
                <div className="chat-bubble user">¿Cuántos reactivos están bajo el stock mínimo?</div>
                <div className="chat-bubble ai"><b>1 reactivo</b> en stock bajo de 76 totales: <code>Agar Bacteriológico</code> con <b>400 g</b> contra mínimo de <b>500 g</b>. Lote <code>LAB-2026-00001</code>, ubic. 1B, proveedor OneLab.</div>
                <div className="chat-bubble user">¿Quién hizo el último ajuste?</div>
                <div className="chat-bubble ai">El usuario <b>Test</b> registró un ajuste el <b>18/5 a las 23:57</b> sobre <code>LAB-2026-00001</code> — 400 g, motivo: "Tus".</div>
              </div>
            </div>
      
            <div className="agent">
              <div className="head">
                <span className="id">Visión · M15</span>
                <span className="status">Activo</span>
              </div>
              <h3 className="title">Carga de lotes <span className="em">por foto</span></h3>
              <p className="body">Sacás una foto a la etiqueta. El agente extrae los datos y precarga el formulario. El científico revisa y confirma antes de guardar.</p>
              <div className="demo-box">
                <div className="demo-header"><span>Datos extraídos · etiqueta_002.jpg</span><span className="tag tag-green">Sugeridos por IA</span></div>
                <div className="vision-field">
                  <label>Producto</label>
                  <div className="val">Agar Tripticasa Soja (TSA)</div>
                </div>
                <div className="vision-field">
                  <label>Marca · Cód. proveedor</label>
                  <div className="val">OneLab · HAM010-TSA</div>
                </div>
                <div className="vision-field">
                  <label>Lote fab. · Vencimiento</label>
                  <div className="val">250715B12 · 08/2027</div>
                </div>
                <div className="vision-note">⚠ La IA propone — el científico decide. Confirmación humana obligatoria.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* ═══════════════ COMPARACIÓN ═══════════════ */}
      <section className="section warm">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>06</b><span>—</span><span>Por qué LabInventory</span></div>
              <h2>Lo que perdés con Excel.<br />Lo que sufrís con un <span className="em">ERP.</span></h2>
              <div className="en">Excel vs ERP vs LabInventory</div>
            </div>
            <div>
              <p className="lede">
                Las planillas pierden trazabilidad. Los ERPs genéricos no entienden la mesada. LabInventory está construido desde el laboratorio hacia afuera — y se nota.
              </p>
            </div>
          </div>
      
          <div className="compare">
            <div className="row-label"></div>
            <div className="col-head">Excel<span className="en">la planilla compartida</span></div>
            <div className="col-head">ERP genérico<span className="en">SAP, Odoo, etc.</span></div>
            <div className="col-head us">LabInventory<span className="en">construido para el lab</span></div>
      
            <div className="row-label">Trazabilidad por frasco</div>
            <div className="cell neg">Imposible — no hay objeto "frasco"</div>
            <div className="cell warn">Custom dev · 3-6 meses</div>
            <div className="cell ok">QR por lote, día 1</div>
      
            <div className="row-label">Mesada · móvil</div>
            <div className="cell neg">No existe</div>
            <div className="cell neg">App pesada, login lento</div>
            <div className="cell ok">PWA, offline, escaneo QR</div>
      
            <div className="row-label">Agentes IA</div>
            <div className="cell neg">—</div>
            <div className="cell warn">Bolt-on, sin contexto del lab</div>
            <div className="cell ok">Chat + visión nativos</div>
      
            <div className="row-label">Auditoría exportable</div>
            <div className="cell warn">Capturas + planillas a mano</div>
            <div className="cell ok">Sí, pero rígida</div>
            <div className="cell ok">PDF firmado por lote</div>
      
            <div className="row-label">Implementación</div>
            <div className="cell ok">Inmediata · pero sin red</div>
            <div className="cell neg">6-18 meses · consultores</div>
            <div className="cell ok">2 semanas · vos solo</div>
      
            <div className="row-label">Maleabilidad</div>
            <div className="cell warn">Todo cambia · nada se conserva</div>
            <div className="cell neg">Rígido · cambios cuestan</div>
            <div className="cell ok">API limpia · módulos opt-in</div>
          </div>
        </div>
      </section>
      
      {/* Case/testimonio section archived to src/pages/landing-sections/CaseStudy.disabled.tsx until a real quote exists. */}

      {/* Roadmap section archived to src/pages/landing-sections/RoadmapSection.disabled.tsx. */}

      {/* ═══════════════ FOUNDER NOTE ═══════════════ */}
      <section className="founder">
        <div className="founder-inner">
          <div className="founder-portrait">F</div>
          <div className="founder-text">
            <div className="label">Nota del fundador · Founder note</div>
            <p>
              Construí LabInventory porque vi a tres doctorandos pelearse con la misma planilla durante meses. La trazabilidad real, en un laboratorio real, no es un módulo de SAP — es una <b>cultura</b> que necesita herramientas hechas para la mesada. Si tu lab vive en Excel, hablemos. La demo es gratis y la migración la hacemos juntos.
            </p>
            <div className="sig">— <b>F. (fundador)</b> · labinventory.lat · hola@labinventory.lat</div>
          </div>
        </div>
      </section>
      
      {/* Seguridad section moved to /seguridad — JSX archived to landing-sections/SeguridadSection.disabled.tsx. */}

      {/* Pricing section archived to src/pages/landing-sections/PricingSection.disabled.tsx until prices are defined. */}

      {/* ═══════════════ CTA simplificado ═══════════════ */}
      <section id="cta" className="cta">
        <div>
          <h2>
            Hablemos<br />
            del lab que <span className="em">querés.</span>
          </h2>
          <div className="en">A 30-min call. We show LabInventory with demo data, talk about your flow.</div>
          <p className="sub">
            Una llamada de 30 minutos. Te mostramos LabInventory contra una base de demo, hablamos de tu flujo y dejamos un piloto listo para arrancar.
          </p>
        </div>
      
        <form className="cta-form" onSubmit={(e) => e.preventDefault()}>
          <div className="l">Solicitar demo · sin tarjeta</div>
          <label className="l" style={{marginTop: 'var(--s4)'}}>Email institucional</label>
          <input type="email" placeholder="m.carrera@conicet.gov.ar" />
          <label className="l">Nombre del laboratorio</label>
          <input type="text" placeholder="Lab QC · LabFarma Industrial" />
          <div className="submit-row">
            <span className="meta">→ Respondemos en &lt; 24 h</span>
            <button type="submit" className="btn btn-primary" style={{height: '44px'}}>Agendar</button>
          </div>
        </form>
      </section>
    </>
  );
}
