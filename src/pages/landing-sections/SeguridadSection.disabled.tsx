// Original (verbose) Seguridad section — DISABLED.
//
// Pulled out of the home in favor of a sober /seguridad page. This is
// the full original including the 08.2 compliance subgrid with named
// regulations (ANMAT, 21 CFR Part 11, SOC 2, LGPD/GDPR, ISO 27001,
// HIPAA). The accompanying CSS classes (.sec-compact, .sec-row,
// .sec-strip, .sec-compliance*, .badge-status*) are still in
// src/components/landingStyles.ts, so restoring is just pasting the
// JSX back into the home.

export const SEGURIDAD_JSX = String.raw`
      {/* ═══════════════ SEGURIDAD (compact) ═══════════════ */}
      <section id="seguridad" className="section dark">
        <div className="section-inner">
          <div className="section-head">
            <div>
              <div className="num"><b>08</b><span>—</span><span>Seguridad &amp; Infra</span></div>
              <h2>Pensado para<br />producción.</h2>
              <div className="en">Hardened · HTTPS · RBAC · daily backups</div>
            </div>
            <div>
              <p className="lede">
                Login real con sesiones y roles. Servidor endurecido. Sin trucos: el sistema corre con las prácticas estándar que pediría cualquier equipo de IT.
              </p>
            </div>
          </div>
      
          <div className="sec-compact">
            <div className="sec-row">
              <div className="icon">▮ ▮ ▮</div>
              <div>
                <div className="t">HTTPS + SSH endurecido</div>
                <div className="en">TLS auto-renewed · key-only auth</div>
                <p className="d">Caddy con TLS automático. La API no está expuesta directamente a internet. Sin login por contraseña, sin acceso root. <code>fail2ban</code> activo.</p>
              </div>
            </div>
            <div className="sec-row">
              <div className="icon">▮ ▮ ▮</div>
              <div>
                <div className="t">Roles &amp; auditoría</div>
                <div className="en">RBAC · signed sessions · immutable log</div>
                <p className="d">3 roles diferenciados (Admin, Jefe, Científico). Cada acción atada a un usuario y sesión firmada. El historial no se edita — solo se ajusta con motivo.</p>
              </div>
            </div>
          </div>
          <div className="sec-strip">
            <div><div className="l">Estado</div><div className="v ok">● Producción</div></div>
            <div><div className="l">Health</div><div className="v">GET /health → 200</div></div>
            <div><div className="l">DB</div><div className="v">SQLite WAL</div></div>
            <div><div className="l">Backups</div><div className="v">Diarios verificados</div></div>
            <div><div className="l">Monitoreo</div><div className="v">UptimeRobot</div></div>
            <div><div className="l">Uptime · 30d</div><div className="v ok">99.98%</div></div>
          </div>

          {/* Compliance sub-section */}
          <div style={{ marginTop: 'var(--s7)', paddingTop: 'var(--s5)', borderTop: '1px solid var(--layer-dark-3)', display: 'grid', gridTemplateColumns: '5fr 6fr', gap: 'var(--s8)', alignItems: 'end', marginBottom: 'var(--s5)' }}>
            <div>
              <div className="num" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.32px', color: 'var(--text-on-dark-3)', textTransform: 'uppercase', marginBottom: 'var(--s3)', display: 'flex', gap: 'var(--s3)' }}>
                <b style={{ color: 'var(--blue-40)', fontWeight: 500 }}>08.2</b><span>—</span><span>Cumplimiento &amp; certificaciones</span>
              </div>
              <h3 style={{ fontSize: '36px', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#fff' }}>
                Construyendo la base<br />regulatoria.
              </h3>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '0.16px', color: 'var(--text-on-dark-3)', textTransform: 'uppercase', marginTop: 'var(--s3)' }}>Building the regulatory baseline</div>
            </div>
            <div>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-on-dark-2)', maxWidth: '480px' }}>
                Somos un producto joven y honestos sobre dónde estamos. Las normas aplicables al laboratorio ya están <b style={{ color: '#fff', fontWeight: 500 }}>diseñadas en el sistema</b>; las auditorías formales están agendadas a lo largo de 2026.
              </p>
            </div>
          </div>

          <div className="sec-compliance">
            <div>
              <span className="badge-status ok">Compatible</span>
              <div className="name">ANMAT · Argentina</div>
              <div className="en">Disposición 2069/2018</div>
              <p className="d">Trazabilidad por lote, registros firmados e historial inalterable. Listos para inspección.</p>
            </div>
            <div>
              <span className="badge-status ok">Diseñado para</span>
              <div className="name">GMP · 21 CFR Part 11</div>
              <div className="en">FDA-style e-signatures</div>
              <p className="d">Firmas electrónicas por usuario, controles de acceso por rol, audit trail completo.</p>
            </div>
            <div>
              <span className="badge-status now">En curso · Q3 2026</span>
              <div className="name">SOC 2 Type I</div>
              <div className="en">AICPA · partner auditor</div>
              <p className="d">Auditoría programada con certificador externo. Controles operativos ya implementados.</p>
            </div>
            <div>
              <span className="badge-status now">En curso · Q3 2026</span>
              <div className="name">LGPD / GDPR</div>
              <div className="en">Data privacy · BR + EU</div>
              <p className="d">Tratamiento de datos personales por diseño. Derecho al olvido y exportación nativa.</p>
            </div>
            <div>
              <span className="badge-status soon">Roadmap · Q4 2026</span>
              <div className="name">ISO 27001</div>
              <div className="en">ISMS · information security</div>
              <p className="d">Sistema de gestión de seguridad de la información alineado al estándar internacional.</p>
            </div>
            <div>
              <span className="badge-status soon">Evaluando · 2027</span>
              <div className="name">HIPAA-ready</div>
              <div className="en">Health data · US</div>
              <p className="d">Para clientes con datos clínicos o ensayos en salud. Evaluación de alcance en curso.</p>
            </div>
          </div>

          <div className="sec-compliance-foot">
            <span>Política de seguridad &amp; tratado de datos · disponible bajo NDA</span>
            <a href="mailto:seguridad@labinventory.lat">→ seguridad@labinventory.lat</a>
          </div>
        </div>
      </section>
`;
