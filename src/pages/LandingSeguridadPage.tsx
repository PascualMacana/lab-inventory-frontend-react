export function LandingSeguridadPage() {
  return (
    <section id="seguridad" className="section dark">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="num"><b>—</b><span>Seguridad</span></div>
            <h2>Pensado para<br />producción.</h2>
            <div className="en">Security &amp; data handling</div>
          </div>
          <div>
            <p className="lede">
              Las prácticas estándar que pide cualquier equipo de IT —
              sin trucos, sin promesas vacías, sin contarle al atacante
              qué corremos por debajo. El detalle del programa de
              cumplimiento y de tratamiento de datos viaja bajo NDA.
            </p>
          </div>
        </div>

        <div className="sec-compact">
          <div className="sec-row">
            <div className="icon">▮ ▮ ▮</div>
            <div>
              <div className="t">Transporte cifrado</div>
              <div className="en">TLS · encryption in transit</div>
              <p className="d">Todo el tráfico va sobre HTTPS con certificados actualizados automáticamente. La superficie expuesta es mínima.</p>
            </div>
          </div>
          <div className="sec-row">
            <div className="icon">▮ ▮ ▮</div>
            <div>
              <div className="t">Acceso por rol</div>
              <div className="en">RBAC · signed sessions</div>
              <p className="d">Roles diferenciados con permisos acotados. Cada acción queda atada a un usuario y a una sesión firmada.</p>
            </div>
          </div>
          <div className="sec-row">
            <div className="icon">▮ ▮ ▮</div>
            <div>
              <div className="t">Auditoría inmutable</div>
              <div className="en">Append-only audit trail</div>
              <p className="d">El historial no se edita — solo se ajusta con motivo. Exportable a PDF firmado cuando lo pida una inspección.</p>
            </div>
          </div>
          <div className="sec-row">
            <div className="icon">▮ ▮ ▮</div>
            <div>
              <div className="t">Respaldo &amp; continuidad</div>
              <div className="en">Daily verified backups</div>
              <p className="d">Backups diarios verificados, retención acotada, plan de restauración probado. Monitoreo externo de uptime.</p>
            </div>
          </div>
        </div>

        <div className="sec-strip">
          <div><div className="l">Estado</div><div className="v ok">● Producción</div></div>
          <div><div className="l">Health</div><div className="v">GET /health</div></div>
          <div><div className="l">Backups</div><div className="v">Diarios verificados</div></div>
          <div><div className="l">Uptime · 30d</div><div className="v ok">99.98%</div></div>
        </div>

        <div className="sec-compliance-foot" style={{ marginTop: 'var(--s7)' }}>
          <span>
            Alineado con las normas aplicables al laboratorio &middot;
            <b>&nbsp;programa de cumplimiento y política de datos bajo NDA</b>
          </span>
          <a href="mailto:seguridad@labinventory.lat">→ seguridad@labinventory.lat</a>
        </div>
      </div>
    </section>
  );
}
