// Case-study / testimonial section for LabInventory landing — DISABLED.
//
// Removed from LandingPage.tsx because the testimonial is fabricated —
// Dra. Magdalena Carrera / LabFarma Industrial doesn't exist as a real
// customer yet. To restore when there's a real quote + metrics:
//
//   1) Paste CASE_CSS (below) back into the <style> block of
//      LandingPage.tsx, right above the "/* ─── ROADMAP ─── */" rule.
//   2) Paste CASE_JSX back into the JSX between the comparación
//      </section> and the "{/* ═══════════════ ROADMAP ═══════════════ */}"
//      block.
//   3) Swap the quote / attribution / 4 metrics for real numbers.

export const CASE_CSS = String.raw`
  /* ─── CASO / TESTIMONIO ───────────────────────────── */
  .case {
    background: var(--bg-warm);
    padding: var(--s10) var(--s8);
    border-bottom: 1px solid #ebe5d8;
  }
  .case-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s8);
    align-items: center;
  }
  .case-quote {
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-weight: 300;
    font-size: 42px;
    line-height: 1.18;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }
  .case-quote::before {
    content: '“';
    font-size: 96px;
    line-height: 0.5;
    color: var(--blue);
    display: block;
    margin-bottom: var(--s3);
  }
  .case-attr {
    margin-top: var(--s5);
    padding-top: var(--s4);
    border-top: 1px solid var(--border-subtle);
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: var(--s3);
    align-items: center;
  }
  .case-attr .avatar {
    width: 56px;
    height: 56px;
    background: var(--blue);
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-size: 24px;
  }
  .case-attr .who .name { font-size: 16px; font-weight: 500; color: var(--text-primary); }
  .case-attr .who .role { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; margin-top: 2px; }

  .case-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
  }
  .case-metric {
    background: var(--bg);
    padding: var(--s5);
  }
  .case-metric .l {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  .case-metric .n {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 56px;
    color: var(--blue);
    line-height: 1;
    margin-top: var(--s3);
    font-weight: 400;
    letter-spacing: -0.02em;
  }
  .case-metric .n .u { font-size: 24px; }
  .case-metric .d {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin-top: var(--s3);
  }
`;

export const CASE_JSX = String.raw`
      {/* ═══════════════ CASO / TESTIMONIO ═══════════════ */}
      <section className="case">
        <div className="case-inner">
          <div>
            <div className="case-quote">
              Pasamos de <span className="em">cinco horas semanales</span> de planilla a <span className="em">tres minutos por consumo</span>. La auditoría de ANMAT salió en una mañana, no en una semana.
            </div>
            <div className="case-attr">
              <div className="avatar">M</div>
              <div className="who">
                <div className="name">Dra. Magdalena Carrera</div>
                <div className="role">Jefa de QC · LabFarma Industrial, Rosario</div>
              </div>
            </div>
          </div>
          <div className="case-metrics">
            <div className="case-metric">
              <div className="l">Tiempo de carga</div>
              <div className="n">−84<span className="u">%</span></div>
              <div className="d">De 5 h / semana en Excel a 50 min / semana con QR + mesada.</div>
            </div>
            <div className="case-metric">
              <div className="l">Desperdicio</div>
              <div className="n">−31<span className="u">%</span></div>
              <div className="d">Vencimientos detectados a tiempo. FIFO automático reduce mermas.</div>
            </div>
            <div className="case-metric">
              <div className="l">Auditorías</div>
              <div className="n">1<span className="u"> día</span></div>
              <div className="d">Inspección ANMAT cerrada en un turno. Antes: una semana de carpetas.</div>
            </div>
            <div className="case-metric">
              <div className="l">Onboarding</div>
              <div className="n">12<span className="u"> días</span></div>
              <div className="d">De Excel a operativo en 2 sectores. Sin consultores, sin re-implementación.</div>
            </div>
          </div>
        </div>
      </section>
`;
