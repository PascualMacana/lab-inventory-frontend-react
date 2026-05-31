// Founder note section ("Nota del fundador · Founder note") for the
// LandingPage — DISABLED.
//
// Removed from LandingPage.tsx on request. To restore:
//
//   1) Paste FOUNDER_NOTE_JSX back into LandingPage.tsx where the
//      "{/* Founder note archived ... */}" marker sits (between the
//      comparison/agents area and the CTA).
//   2) No CSS to move — the rules (.founder, .founder-inner,
//      .founder-portrait, .founder-text, .sig) are still present in
//      src/components/landingStyles.ts.

export const FOUNDER_NOTE_JSX = String.raw`
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
`;
