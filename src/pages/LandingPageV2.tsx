import { useLandingLogin } from "../components/LandingShell";

export function LandingPageV2() {
  const { openLogin } = useLandingLogin();

  return (
    <>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero">
        <div className="hero-meta">
          <div className="left">
            <span>Issue №&nbsp;<b>0025</b></span>
            <span>Mayo · 2026</span>
            <span><b>labinventory.lat</b> · v2.1</span>
            <span>operativo</span>
          </div>
          <div className="right">No vendemos features. Vendemos un sistema que ya está corriendo.</div>
        </div>

        <div className="hero-grid">
          <div>
            <h1 className="hero-title">
              Inventario,<br />
              <span className="em">como en la mesada.<span className="cursor"></span></span>
            </h1>
            <div className="hero-en">Inventory the way it works on the bench. We don't pitch — we open the system.</div>
            <p className="hero-body" style={{ marginTop: 'var(--s6)', maxWidth: '560px' }}>
              Un laboratorio real lo usa todos los días. Cada acción queda firmada, cada frasco tiene su QR, cada auditoría se exporta en PDF. <b>Lo que sigue es una invitación a mirarlo.</b>
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#cta">Pedir demo en vivo</a>
              <a className="btn btn-ghost" href="#" onClick={openLogin}>Ingresar</a>
              <span className="meta">→ 30 min · datos reales · sin tarjeta</span>
            </div>
          </div>

          <div className="hero-stat">
            <div className="label">Bitácora · labinventory.lat</div>
            <div className="figure">99.98<span className="unit">% uptime</span></div>
            <div className="meta">monitoreo externo · backups diarios verificados · 30d</div>
            <div className="breakdown" style={{ gridTemplateColumns: '1fr' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'baseline', gap: 'var(--s3)' }}>
                <div className="n" style={{ fontSize: '13px', color: 'var(--blue)', letterSpacing: '0.16px' }}>11 MAY</div>
                <div className="l" style={{ marginTop: 0, textTransform: 'none', letterSpacing: '0.04em', fontSize: '12px' }}>Carga inicial desde Excel · 76 reactivos validados</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'baseline', gap: 'var(--s3)' }}>
                <div className="n" style={{ fontSize: '13px', color: 'var(--blue)', letterSpacing: '0.16px' }}>18 MAY</div>
                <div className="l" style={{ marginTop: 0, textTransform: 'none', letterSpacing: '0.04em', fontSize: '12px' }}>Primera auditoría exportada en PDF firmado</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'baseline', gap: 'var(--s3)' }}>
                <div className="n" style={{ fontSize: '13px', color: 'var(--blue)', letterSpacing: '0.16px' }}>21 MAY</div>
                <div className="l" style={{ marginTop: 0, textTransform: 'none', letterSpacing: '0.04em', fontSize: '12px' }}>Multi-tenant en producción · aislamiento por organización</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'baseline', gap: 'var(--s3)' }}>
                <div className="n" style={{ fontSize: '13px', color: 'var(--green)', letterSpacing: '0.16px' }}>HOY</div>
                <div className="l" style={{ marginTop: 0, textTransform: 'none', letterSpacing: '0.04em', fontSize: '12px', color: 'var(--text-primary)' }}>Estás leyendo esto. Hay movimientos firmándose abajo ↓</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* ═══════════════ UN FRASCO. SU HISTORIA. ═══════════════ */}
      <section id="trazabilidad" className="section">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>—</b><span>Mostrar antes que decir</span></div>
              <h2>Un frasco.<br />Su historia.</h2>
              <div className="en">One bottle. Its full story.</div>
            </div>
            <div>
              <p className="lede">
                No hay módulos que enumerar. Hay un frasco con un QR. Lo escaneás y aparece esto — el ingreso, los consumos, los ajustes y la auditoría exportada. El resto del sistema gira alrededor de esta pieza.
              </p>
            </div>
          </div>

          <div className="audit-card" style={{ maxWidth: '960px', margin: '0 auto' }}>
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
                <div className="meta" style={{ marginTop: '0' }}>Vence: 10 feb 2028 (633 días)</div>
              </div>
              <div className="status-block">
                <div>
                  <div className="num">400 g</div>
                  <div className="label">Saldo</div>
                </div>
                <div>
                  <div className="num" style={{ fontSize: '16px', color: 'var(--warm-fg)' }}>bajo</div>
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
                <span className="qty" style={{ color: 'var(--green)' }}>·</span>
              </div>
            </div>
          </div>

          <p
            style={{
              marginTop: 'var(--s7)',
              maxWidth: '760px',
              fontFamily: "'IBM Plex Serif', serif",
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: '20px',
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Eso es todo. La pantalla que ves arriba es lo que aparece cuando un inspector pide la historia del frasco <span style={{ color: 'var(--blue)' }}>LAB-2026-00001</span>. No hay un slide. Hay esta vista, y se exporta en PDF.
          </p>
        </div>
      </section>

      {/* ═══════════════ EL AGENTE QUE ENTIENDE LO QUE VE ═══════════════ */}
      <section id="agentes" className="section layer">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>—</b><span>Conversación, no consultas SQL</span></div>
              <h2>Le hablás.<br />Te contesta con datos.</h2>
              <div className="en">Natural language · real data · always read-only</div>
            </div>
            <div>
              <p className="lede">
                No genera SQL. No inventa números. Tiene un set acotado de funciones de lectura sobre la misma base que firma las auditorías. Ninguna escritura sin un humano que confirme — por diseño.
              </p>
            </div>
          </div>

          <div className="agents" style={{ gridTemplateColumns: '1fr', maxWidth: '820px', margin: '0 auto' }}>
            <div className="agent">
              <div className="head">
                <span className="id">Asistente · en producción</span>
                <span className="status">Activo</span>
              </div>
              <h3 className="title">Pregunta cualquier cosa<br />que viva en la base.</h3>
              <p className="body">Stock, vencimientos, movimientos por usuario, lotes por proveedor, costos registrados. Devuelve cifras con la referencia exacta del registro — para que el científico pueda ir y verificar.</p>
              <div className="demo-box">
                <div className="demo-header"><span>Conversación · ejemplo real</span><span className="tag tag-blue">m.carrera@lab</span></div>
                <div className="chat-bubble user">¿Qué se consumió ayer en Microbiología?</div>
                <div className="chat-bubble ai">Hubo <b>1 movimiento</b> ayer en sector Microbiología: salida de <b>200 g</b> de <code>Agar Bacteriológico</code> contra el lote <code>LAB-2026-00001</code>, registrado por <b>test@lab</b> a las 20:23.</div>
                <div className="chat-bubble user">¿Qué vence en los próximos 30 días?</div>
                <div className="chat-bubble ai">Cero lotes vencen en los próximos 30 días. El más cercano es <code>LAB-2026-00031</code> (Etanol absoluto), que vence el <b>14 nov 2026</b> — faltan 176 días.</div>
                <div className="chat-bubble user">¿Y de quién es el costo más alto cargado este mes?</div>
                <div className="chat-bubble ai">El lote con mayor costo registrado en mayo es <code>LAB-2026-00067</code> (Tripsina-EDTA · ThermoFisher), cargado por <b>deposito@lab</b> el 6 may por <b>$184.300</b>.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOUNDER NOTE ═══════════════ */}
      <section className="founder">
        <div className="founder-inner">
          <div className="founder-portrait">F</div>
          <div className="founder-text">
            <div className="label">Nota del fundador · Founder note</div>
            <p>
              Construí LabInventory porque vi a tres doctorandos pelearse con la misma planilla durante meses. No hay testimonios todavía porque recién empezamos — pero hay un laboratorio real firmando movimientos en producción todos los días. Si querés ser el segundo, hablemos. La demo es real y dura 30 minutos.
            </p>
            <div className="sig">— <b>F. (fundador)</b> · labinventory.lat · hola@labinventory.lat</div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section id="cta" className="cta">
        <div>
          <h2>
            Abrila vos<br />
            mismo.
          </h2>
          <div className="en">A 30-min call. We open the running system, you ask anything.</div>
          <p className="sub">
            Te abrimos el sistema contra una base con datos reales. Hacés las preguntas que quieras, mirás cómo se firma un movimiento, descargás un PDF de auditoría. Después decidís.
          </p>
        </div>

        <form className="cta-form" onSubmit={(e) => e.preventDefault()}>
          <div className="l">Solicitar demo · sin tarjeta</div>
          <label className="l" style={{ marginTop: 'var(--s4)' }}>Email institucional</label>
          <input type="email" placeholder="m.carrera@conicet.gov.ar" />
          <label className="l">Nombre del laboratorio</label>
          <input type="text" placeholder="Lab QC · LabFarma Industrial" />
          <div className="submit-row">
            <span className="meta">→ Respondemos en &lt; 24 h</span>
            <button type="submit" className="btn btn-primary" style={{ height: '44px' }}>Agendar</button>
          </div>
        </form>
      </section>
    </>
  );
}
