// Modules grid (8 + "ver los 16" footer) — DISABLED.
//
// Pulled out of LandingPage to shorten the home. When you want to bring
// it back (or move it to a /producto page), restore CSS + JSX:
//
//   1) Paste MODULES_CSS back into the <style> block of LandingPage.tsx
//      (or wherever the shared landing CSS lives), above
//      "/* ─── AGENTES IA ─── */".
//   2) Paste MODULES_JSX back into the JSX between the trazabilidad
//      section </section> and the "{/* ═══════════════ AGENTES IA */}"
//      block.

export const MODULES_CSS = String.raw`
  /* ─── MÓDULOS (8 destacados) ──────────────────────── */
  .modules {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
  }
  .module {
    background: var(--bg);
    padding: var(--s5) var(--s4);
    display: flex;
    flex-direction: column;
    gap: var(--s2);
    position: relative;
    min-height: 240px;
  }
  .module .num {
    position: absolute;
    top: var(--s4);
    right: var(--s4);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-placeholder);
    letter-spacing: 0.32px;
  }
  .module .name { font-size: 20px; font-weight: 500; color: var(--text-primary); margin-top: var(--s5); }
  .module .en { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; }
  .module .desc { font-size: 13px; letter-spacing: 0.16px; line-height: 1.55; color: var(--text-secondary); flex: 1; margin-top: var(--s2); }
  .module.feature { background: var(--layer-dark); color: #fff; }
  .module.feature .name { color: #fff; }
  .module.feature .en { color: var(--text-on-dark-3); }
  .module.feature .desc { color: var(--text-on-dark-2); }
  .module.feature .num { color: var(--blue-40); }
  .module-more {
    grid-column: 1 / -1;
    padding: var(--s5) var(--s4);
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--border-subtle);
  }
  .module-more .l { color: var(--text-secondary); font-size: 14px; }
  .module-more .l b { color: var(--text-primary); font-weight: 500; }
  .module-more a { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.16px; color: var(--blue); }
`;

export const MODULES_JSX = String.raw`
      {/* ═══════════════ MÓDULOS (8 destacados) ═══════════════ */}
      <section className="section layer">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>04</b><span>—</span><span>Lo que viene en la caja</span></div>
              <h2>Todo lo que<br />necesita el lab,<br /><span className="em">modular.</span></h2>
              <div className="en">Modular. Productive density. No bloat.</div>
            </div>
            <div>
              <p className="lede">
                Estos son los 8 módulos que más usan los laboratorios. Hay 16 en total — activá los que necesites, dejá el resto fuera del medio.
              </p>
            </div>
          </div>

          <div className="modules">
            <div className="module feature">
              <span className="num">03</span>
              <div className="name">Lotes · QR</div>
              <div className="en">Bottle-level batches</div>
              <p className="desc">Cada frasco con código <code>LAB-2026-00001</code>, lote del fabricante, CAS, vencimiento y ubicación. El corazón de la trazabilidad.</p>
            </div>
            <div className="module">
              <span className="num">04</span>
              <div className="name">Consumo · FIFO</div>
              <div className="en">Usage · auto-FIFO</div>
              <p className="desc">Registro con FIFO automático. Si escaneás un QR, descuenta del frasco exacto que tenés en la mano.</p>
            </div>
            <div className="module">
              <span className="num">05</span>
              <div className="name">Protocolos</div>
              <div className="en">Recipes · auto-log</div>
              <p className="desc">Calculan insumos, sugieren lotes FIFO, validan QR y registran consumos en un paso. El módulo más maleable del sistema.</p>
            </div>
            <div className="module">
              <span className="num">07</span>
              <div className="name">Movimientos</div>
              <div className="en">Movement log</div>
              <p className="desc">Historial de entradas, salidas, ajustes y consumos. Filtrable por fecha, tipo, reactivo y usuario. Inmutable.</p>
            </div>

            <div className="module">
              <span className="num">11</span>
              <div className="name">Asistente IA</div>
              <div className="en">Chat agent</div>
              <p className="desc">Pregunt-en lenguaje natural. Lee la base en vivo, responde con datos concretos. Nunca escribe sin confirmación.</p>
            </div>
            <div className="module feature">
              <span className="num">15</span>
              <div className="name">Visión IA</div>
              <div className="en">Vision agent</div>
              <p className="desc">Sacás una foto a la etiqueta y carga el lote. Extrae producto, lote, vencimiento y CAS. El científico confirma.</p>
            </div>
            <div className="module">
              <span className="num">12</span>
              <div className="name">Auditoría</div>
              <div className="en">Audit trail</div>
              <p className="desc">Historia completa por lote. Exportable a PDF firmado para inspectores de ANMAT, ISO o equivalentes.</p>
            </div>
            <div className="module">
              <span className="num">14</span>
              <div className="name">Mesada</div>
              <div className="en">Bench mode · PWA</div>
              <p className="desc">Vista para celular optimizada para la mesada. Escaneás un QR y descontás stock en segundos, sin sacarte los guantes.</p>
            </div>

            <div className="module-more">
              <div className="l"><b>+ 8 módulos más</b> — Dashboard, Reactivos, Tareas, Proveedores, Equipamiento, Usuarios, Analítica, Roadmap.</div>
              <a href="#">Ver los 16 módulos →</a>
            </div>
          </div>
        </div>
      </section>
`;
