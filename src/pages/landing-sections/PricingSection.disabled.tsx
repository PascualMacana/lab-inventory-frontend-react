// Pricing section for LabInventory landing — DISABLED.
//
// Removed from LandingPage.tsx temporarily while prices are not yet
// finalized. To restore:
//
//   1) Paste PRICING_CSS (below) back into the <style> block in
//      LandingPage.tsx, right above the "/* ─── CTA simplificado ───
//      ─ */" rule (or anywhere; the classes are self-contained).
//   2) Paste PRICING_JSX back into the JSX, right after the
//      "{/* ═══════════════ SEGURIDAD ... */}" section and before
//      "{/* ═══════════════ CTA simplificado ═══════════════ */}".
//   3) In the masthead nav, change the "Cuenta" entry back to
//      `<a href="#pricing">Pricing</a>` (or add Pricing alongside).
//
// Both pieces are intentionally string constants (not JSX) so this file
// stays self-contained and compiles with no extra imports. When you
// restore, just copy/paste the contents into LandingPage.tsx.

export const PRICING_CSS = String.raw`
  /* ─── PRICING ─────────────────────────────────────── */
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
  }
  .price {
    background: var(--bg);
    padding: var(--s6) var(--s5);
    display: flex;
    flex-direction: column;
    gap: var(--s3);
  }
  .price .tier {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  .price .name {
    font-size: 28px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.1;
  }
  .price .price-figure {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 36px;
    color: var(--text-primary);
    line-height: 1;
    margin-top: var(--s3);
    font-weight: 400;
    letter-spacing: -0.02em;
  }
  .price .price-figure .u {
    font-size: 12px;
    color: var(--text-secondary);
    letter-spacing: 0.32px;
    text-transform: uppercase;
    display: block;
    margin-top: 6px;
  }
  .price .price-figure.contact { font-family: 'IBM Plex Serif', serif; font-style: italic; font-size: 32px; color: var(--blue); }
  .price ul {
    list-style: none;
    margin-top: var(--s4);
    padding-top: var(--s4);
    border-top: 1px solid var(--layer-01);
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--s2);
  }
  .price ul li {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-secondary);
    padding-left: 16px;
    position: relative;
  }
  .price ul li::before {
    content: '+';
    position: absolute;
    left: 0;
    color: var(--blue);
    font-family: 'IBM Plex Mono', monospace;
  }
  .price ul li b { color: var(--text-primary); font-weight: 500; }
  .price .cta-btn { margin-top: var(--s4); }
  .price.featured { background: var(--layer-dark); color: #fff; }
  .price.featured .tier { color: var(--blue-40); }
  .price.featured .name { color: #fff; }
  .price.featured .price-figure { color: #fff; }
  .price.featured .price-figure .u { color: var(--text-on-dark-3); }
  .price.featured ul li { color: var(--text-on-dark-2); }
  .price.featured ul li b { color: #fff; }
  .price.featured ul { border-top-color: var(--layer-dark-3); }
`;

export const PRICING_JSX = String.raw`
      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="section">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>09</b><span>—</span><span>Pricing</span></div>
              <h2>Pricing simple,<br />por <span className="em">laboratorio.</span></h2>
              <div className="en">Per lab. Not per seat. Annual commitment.</div>
            </div>
            <div>
              <p className="lede">
                Cobramos por laboratorio, no por usuario — porque un científico no debería pensar dos veces antes de pedir acceso. Compromiso anual. Capa científica y agentes de compra se suman como add-ons cuando salen de beta.
              </p>
            </div>
          </div>

          <div className="pricing-grid">
            <div className="price">
              <div className="tier">Plan · 01</div>
              <div className="name">Lab chico</div>
              <div className="price-figure">USD 149<span className="u">/ mes · lab</span></div>
              <ul>
                <li><b>Hasta 5 usuarios</b> · sin tope de reactivos</li>
                <li>16 módulos · trazabilidad completa</li>
                <li>Asistente IA + Visión IA</li>
                <li>Backups diarios · soporte por email</li>
                <li>Onboarding asistido (2 semanas)</li>
              </ul>
              <a className="btn btn-ghost cta-btn" href="#cta">Empezar</a>
            </div>

            <div className="price featured">
              <div className="tier">Plan · 02 · más elegido</div>
              <div className="name">Lab mediano</div>
              <div className="price-figure">USD 349<span className="u">/ mes · lab</span></div>
              <ul>
                <li><b>Hasta 25 usuarios</b> · multi-sector</li>
                <li>Todo del plan anterior</li>
                <li><b>Integraciones</b>: balanzas, HPLC, lectores</li>
                <li>Auditoría exportable · API REST</li>
                <li>Soporte por WhatsApp · SLA 24 hs</li>
              </ul>
              <a className="btn btn-primary cta-btn" href="#cta">Solicitar demo</a>
            </div>

            <div className="price">
              <div className="tier">Plan · 03</div>
              <div className="name">Enterprise</div>
              <div className="price-figure contact">Hablemos.</div>
              <ul>
                <li><b>Usuarios ilimitados</b> · multi-sitio</li>
                <li>On-premise o nuble dedicada</li>
                <li>SSO · auditoría custom · SLA dedicado</li>
                <li>Capa científica + compras automáticas</li>
                <li>Integraciones a medida</li>
              </ul>
              <a className="btn btn-ghost cta-btn" href="#cta">Contactar ventas</a>
            </div>
          </div>
        </div>
      </section>
`;
