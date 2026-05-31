import { type FormEvent, useState } from "react";

import { useLandingLogin } from "../components/LandingShell";
import { api } from "../lib/api";

type DemoStatus = "idle" | "sending" | "sent" | "error";

export function LandingPage() {
  const { openLogin } = useLandingLogin();
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("idle");
  const [demoError, setDemoError] = useState<string | null>(null);

  async function handleDemoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const laboratorio = String(formData.get("laboratorio") ?? "").trim();

    setDemoStatus("sending");
    setDemoError(null);
    try {
      await api.solicitarDemo({
        email,
        laboratorio: laboratorio || null,
        origen: "landing",
      });
      form.reset();
      setDemoStatus("sent");
    } catch (err) {
      setDemoStatus("error");
      setDemoError(err instanceof Error ? err.message : "No se pudo enviar la solicitud");
    }
  }

  return (
    <>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero">
        <div className="hero-meta">
          <div className="left">
            <span>Issue №&nbsp;<b>0024</b></span>
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
              LabInventory es <b>maleable</b>: se adapta al flujo del laboratorio, no al revés. Trazabilidad por unidad física, FIFO automático, asistencia inteligente y firma por usuario — desde la mesada hasta la auditoría.
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
          <span className="ticker-item"><span className="when">hace 6 m</span><span className="what">Ingreso · alta de lote</span><span className="who">deposito@lab</span><span>· Agar TSA · OneLab</span></span>
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
          <span className="ticker-item"><span className="when">hace 6 m</span><span className="what">Ingreso · alta de lote</span><span className="who">deposito@lab</span><span>· Agar TSA · OneLab</span></span>
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
          <div className="section-head reveal-cascade">
            <div>
              <div className="num"><b>01</b><span>—</span><span>El final de una era</span></div>
              <h2>Dejamos 1996,<br /><span className="em">caminamos hacia 2026.</span></h2>
              <div className="en">Leaving 1996 behind. Walking into 2026.</div>
            </div>
            <div>
              <p className="lede">
                En 1996 un laboratorio se llevaba con planillas, carpetas y memoria. Hoy la trazabilidad es un sistema vivo, firmado, en tiempo real. Estas son tres cosas que quedan en el pasado el día que arrancás con LabInventory.
              </p>
            </div>
          </div>
      
          <div className="steps">
            <div className="step reveal rv-right">
              <div className="ribbon"><b>01</b><span>Lo que dejás atrás</span></div>
              <div className="farewell">"Pasame la última versión de la planilla, ¿esta es la buena?"</div>
              <div className="hello">Una sola <span className="em">fuente</span>.</div>
              <div className="en">One source of truth · per bottle</div>
              <p className="d">Cada lote tiene su identificador único <code>LAB-2026-00001</code>. El sistema sabe exactamente de qué envase estás descontando. No hay dos versiones de la verdad. No hay copias en mails.</p>
              <div className="receipt"><span>Antes: 5 versiones en Drive</span><span className="ok">● una sola fuente</span></div>
            </div>
      
            <div className="step reveal rv-right">
              <div className="ribbon"><b>02</b><span>Lo que dejás atrás</span></div>
              <div className="farewell">"¿Alguien sabe quién usó el etanol el viernes?"</div>
              <div className="hello">Firma por <span className="em">usuario</span>.</div>
              <div className="en">Signed by user · timestamped</div>
              <p className="d">Cada movimiento queda firmado con usuario, hora, sector y sesión. Si te equivocás, registrás un ajuste con motivo — pero el historial no se edita. La pregunta deja de existir.</p>
              <div className="receipt"><span>Antes: silencio incómodo</span><span className="ok">● historial inmutable</span></div>
            </div>
      
            <div className="step reveal rv-right">
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
      
      {/* Dashboard preview ("Así se ve un laboratorio en vivo") archived to src/pages/landing-sections/DashboardPreview.disabled.tsx. */}

      {/* ═══════════════ TRAZABILIDAD (expandida) ═══════════════ */}
      <section id="trazabilidad" className="section">
        <div className="section-inner">
          <div className="section-head reveal-cascade">
            <div>
              <div className="num"><b>03</b><span>—</span><span>Trazabilidad</span></div>
              <h2>Cada frasco<br />tiene <span className="em">historia.</span></h2>
              <div className="en">Bottle-level audit · immutable log</div>
            </div>
            <div>
              <p className="lede">
                La base inmutable del sistema. Cada movimiento queda firmado con usuario, hora, sector y sesión. Reconstruí la historia completa de un frasco en una vista. La diferencia con un Excel es esta — y la diferencia con un ERP también.
              </p>
            </div>
          </div>
      
          <div className="trace-hero">
            <div className="trace-copy reveal rv-left">
              <h3>Cada envase, identificado<span className="en">Per-bottle identifier</span></h3>
              <p>Cada lote recibe un identificador único interno. El sistema deja de adivinar de qué envase estás descontando — sabe exactamente cuál es.</p>
      
              <h3>Movimientos inmutables<span className="en">Immutable movement log</span></h3>
              <p>El historial no se edita. Si te equivocás, registrás un ajuste con motivo. La auditoría externa ve exactamente qué pasó y quién lo aprobó.</p>
      
              <h3>Saldo progresivo<span className="en">Running balance</span></h3>
              <p>Cada línea muestra el saldo después del movimiento. La cuenta cierra siempre, lote por lote, gramo por gramo.</p>
      
              <h3>Exportable<span className="en">PDF · CSV · firmado</span></h3>
              <p>Una auditoría de lote se descarga en PDF firmado, listo para inspectores de ANMAT, ISO o equivalentes locales.</p>
            </div>
      
            <div className="audit-card reveal rv-right">
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
                  <span className="what">Ingreso · alta de lote<span className="who"> · deposito@lab</span></span>
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
          <div className="section-head reveal-cascade">
            <div>
              <div className="num"><b>05</b><span>—</span><span>Asistencia inteligente</span></div>
              <h2>IA que trabaja<br /><span className="em">para el científico.</span></h2>
              <div className="en">Built into the daily flow · always human-confirmed</div>
            </div>
            <div>
              <p className="lede">
                Inteligencia integrada al flujo diario que entiende tu inventario y te saca de encima las tareas repetitivas. Nada se escribe sin que un humano lo apruebe — human-in-the-loop por diseño.
              </p>
            </div>
          </div>

          <div className="agents">
            <div className="agent reveal rv-left">
              <div className="head">
                <span className="id">Asistente</span>
                <span className="status">Activo</span>
              </div>
              <h3 className="title">Tu inventario, <span className="em">al instante</span></h3>
              <p className="body">Resolvé dudas del inventario en el momento, con datos concretos y referencias reales — sin armar reportes ni cruzar planillas a mano.</p>
            </div>

            <div className="agent reveal rv-right">
              <div className="head">
                <span className="id">Carga asistida</span>
                <span className="status">Activo</span>
              </div>
              <h3 className="title">Alta de lotes <span className="em">sin tipear</span></h3>
              <p className="body">El alta de un lote nuevo llega precargada y vos solo revisás y confirmás. Menos transcripción, menos errores. El científico siempre tiene la última palabra.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Comparación section ("Lo que perdés con Excel...") archived to src/pages/landing-sections/CompareSection.disabled.tsx. */}

      {/* Case/testimonio section archived to src/pages/landing-sections/CaseStudy.disabled.tsx until a real quote exists. */}

      {/* Roadmap section archived to src/pages/landing-sections/RoadmapSection.disabled.tsx. */}

      {/* Founder note section archived to src/pages/landing-sections/FounderNote.disabled.tsx. */}

      {/* Seguridad section moved to /seguridad — JSX archived to landing-sections/SeguridadSection.disabled.tsx. */}

      {/* Pricing section archived to src/pages/landing-sections/PricingSection.disabled.tsx until prices are defined. */}

      {/* ═══════════════ CTA simplificado ═══════════════ */}
      <section id="cta" className="cta">
        <div className="reveal rv-left">
          <h2>
            Hablemos<br />
            del lab que <span className="em">querés.</span>
          </h2>
          <div className="en">A 30-min call. We show LabInventory with demo data, talk about your flow.</div>
          <p className="sub">
            Una llamada de 30 minutos. Te mostramos LabInventory contra una base de demo, hablamos de tu flujo y dejamos un piloto listo para arrancar.
          </p>
        </div>
      
        <form className="cta-form reveal rv-right" onSubmit={handleDemoSubmit}>
          <div className="l">Solicitar demo · sin tarjeta</div>
          <label className="l" style={{marginTop: 'var(--s4)'}}>Email institucional</label>
          <input name="email" type="email" placeholder="m.carrera@laboratorio.com" />
          <label className="l">Nombre del laboratorio</label>
          <input name="laboratorio" type="text" placeholder="Lab QC · LabFarma Industrial" />
          {demoStatus === "sent" ? (
            <div className="vision-note" style={{ marginTop: 'var(--s3)' }}>Solicitud enviada. Te respondemos en menos de 24 h.</div>
          ) : null}
          {demoStatus === "error" ? (
            <div className="vision-note" style={{ marginTop: 'var(--s3)', color: 'var(--red)' }}>
              {demoError ?? "No se pudo enviar la solicitud"}
            </div>
          ) : null}
          <div className="submit-row">
            <span className="meta">→ Respondemos en &lt; 24 h</span>
            <button type="submit" className="btn btn-primary" style={{height: '44px'}} disabled={demoStatus === "sending"}>
              {demoStatus === "sending" ? "Enviando..." : "Agendar"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
