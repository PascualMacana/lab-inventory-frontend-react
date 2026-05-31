// Comparison table section ("Lo que perdés con Excel. Lo que sufrís con un
// ERP.") for the LandingPage — DISABLED.
//
// Removed from LandingPage.tsx on request. To restore:
//
//   1) Paste COMPARE_JSX back into LandingPage.tsx where the
//      "{/* Comparación section archived ... */}" marker sits (between the
//      "AGENTES IA" section and the CTA).
//   2) No CSS to move — the rules (.warm, .compare, .col-head, .row-label,
//      .cell with .neg/.warn/.ok/.us modifiers) are still present in
//      src/components/landingStyles.ts.
//
// Was section "06 — Por qué LabInventory".

export const COMPARE_JSX = String.raw`
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
`;
