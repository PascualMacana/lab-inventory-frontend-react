// Roadmap (Q1–Q4 2026) — DISABLED.
//
// Pulled out of the home until the roadmap is more solid. Restore by
// pasting both constants back into LandingPage.tsx:
//
//   1) Paste ROADMAP_CSS into <style> above "/* ─── FOUNDER NOTE ─── */".
//   2) Paste ROADMAP_JSX between the comparación </section> and
//      "{/* ═══════════════ FOUNDER NOTE ═══════════════ */}".

export const ROADMAP_CSS = String.raw`
  /* ─── ROADMAP ─────────────────────────────────────── */
  .roadmap-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
  }
  .rm-card {
    background: var(--bg);
    padding: var(--s5);
    display: flex;
    flex-direction: column;
    gap: var(--s3);
    min-height: 280px;
  }
  .rm-card .stage {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    text-transform: uppercase;
    color: var(--text-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .rm-card .stage .pill {
    padding: 3px 9px;
    color: #fff;
    border-radius: 24px;
    font-size: 10px;
    background: var(--text-secondary);
  }
  .rm-card.live .stage .pill { background: var(--green); }
  .rm-card.now .stage .pill { background: var(--blue); }
  .rm-card.next .stage .pill { background: var(--warm-fg); }
  .rm-card.soon .stage .pill { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-subtle); }
  .rm-card .t { font-size: 24px; font-weight: 500; line-height: 1.2; color: var(--text-primary); }
  .rm-card .en { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; }
  .rm-card .d { font-size: 14px; line-height: 1.55; color: var(--text-secondary); flex: 1; }
  .rm-card .meta { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-placeholder); text-transform: uppercase; padding-top: var(--s3); border-top: 1px solid var(--layer-01); }
`;

export const ROADMAP_JSX = String.raw`
      {/* ═══════════════ ROADMAP ═══════════════ */}
      <section id="roadmap" className="section">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>07</b><span>—</span><span>Roadmap</span></div>
              <h2>De inventario<br />a <span className="em">laboratorio aumentado.</span></h2>
              <div className="en">From inventory to augmented science</div>
            </div>
            <div>
              <p className="lede">
                La maleabilidad del núcleo permite sumar capas. Una científica que conecta resultados con consumos. Agentes que cierran el ciclo desde el experimento hasta la compra automática.
              </p>
            </div>
          </div>

          <div className="roadmap-grid">
            <div className="rm-card live">
              <div className="stage"><span>Q1 — 2026</span><span className="pill">Live</span></div>
              <div className="t">Núcleo operativo</div>
              <div className="en">Core · 16 modules</div>
              <p className="d">16 módulos en producción. Trazabilidad por lote, QR, FIFO, mesada, equipamiento, protocolos, analítica.</p>
              <div className="meta">v2.1 · labinventory.lat</div>
            </div>
            <div className="rm-card now">
              <div className="stage"><span>Q2 — 2026</span><span className="pill">Now</span></div>
              <div className="t">Agentes IA</div>
              <div className="en">Chat + vision</div>
              <p className="d">Asistente conversacional sobre la base en vivo. Visión para cargar lotes desde foto. Human-in-the-loop por diseño.</p>
              <div className="meta">v2.1 · estable</div>
            </div>
            <div className="rm-card next">
              <div className="stage"><span>Q3 — 2026</span><span className="pill">Next</span></div>
              <div className="t">Capa científica</div>
              <div className="en">Knowledge graph</div>
              <p className="d">Vincula resultados experimentales con consumos y lotes. Encontrá qué lote se usó en qué corrida y qué resultado dio.</p>
              <div className="meta">beta privada · Q3</div>
            </div>
            <div className="rm-card soon">
              <div className="stage"><span>Q4 — 2026</span><span className="pill">Soon</span></div>
              <div className="t">Compras automáticas</div>
              <div className="en">Agent-driven procurement</div>
              <p className="d">Agentes que detectan stock crítico, comparan proveedores, redactan órdenes y las dejan listas para aprobación del jefe.</p>
              <div className="meta">research preview</div>
            </div>
          </div>
        </div>
      </section>
`;
