import { cn } from "../../lib/utils"
import { useCommandCenter } from "../CommandCenterContext"
import { OKR_KRS, WEEKLY } from "../data"
import { ViewHeader, Nota } from "../components"

export function OsView() {
  const { funnel, okrTarget, setOkrTarget, weekly, toggleWeekly, resetWeekly } = useCommandCenter()

  return (
    <section>
      <ViewHeader eyebrow="Gobierno · LabInventory OS v1.0" title="OS / Estrategia">
        El sistema operativo del proyecto, vivo. El documento maestro completo (Golden Circle, visión, valores, áreas,
        roadmap, riesgos) está en tu carpeta: <b>LABINVENTORY OS v1.0.docx</b>.
      </ViewHeader>

      {/* Objetivo del trimestre */}
      <div className="mb-6 bg-[var(--lab-sidebar-bg)] px-4 py-3.5 text-white">
        <div className="font-mono text-[11px] uppercase tracking-[0.4px] text-cds-supportWarning">OKR · T3 2026 (jun–ago)</div>
        <div className="mt-1 text-base font-semibold">Objetivo: validar que existe intención de pago</div>
      </div>

      {/* KRs */}
      <div className="mb-6 border border-cds-borderSubtle bg-cds-background p-4 md:p-5">
        {OKR_KRS.map((kr) => {
          const val = kr.src === "target" ? okrTarget : funnel[kr.src]
          const pct = Math.min(100, Math.round((val / kr.meta) * 100))
          return (
            <div key={kr.k} className="mb-2.5 flex items-center gap-3.5 last:mb-0">
              <div className="w-[200px] shrink-0 text-[13px] sm:w-[250px]">{kr.k}</div>
              <div className="relative h-[34px] flex-1 bg-cds-layer02">
                <i className="block h-full bg-cds-buttonPrimary" style={{ width: `${pct}%` }} />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[13px] text-white mix-blend-difference">
                  {pct}%
                </span>
              </div>
              {kr.src === "target" ? (
                <input
                  type="number"
                  min={0}
                  value={okrTarget}
                  onChange={(e) => setOkrTarget(parseInt(e.target.value) || 0)}
                  className="w-[60px] border border-cds-borderSubtle bg-cds-background p-1.5 text-center font-mono text-cds-textPrimary outline-none focus:border-cds-buttonPrimary"
                />
              ) : (
                <div className="w-[60px] text-center font-mono text-[13px] text-cds-textPlaceholder">{val}</div>
              )}
              <div className="w-[54px] font-mono text-[13px] text-cds-textPlaceholder">/ {kr.meta}</div>
            </div>
          )
        })}
      </div>

      {/* North Star + métricas por área */}
      <div className="mb-1.5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.5px] text-cds-textSecondary">
        <span>Métrica North Star + la que más importa por área</span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-px border border-cds-borderSubtle bg-cds-borderSubtle md:grid-cols-4">
        {[
          { k: "North Star (90 días)", v: `${funnel.cliente} / 1 pago` },
          { k: "Comercial", v: "Clientes pagos" },
          { k: "Producto", v: "Activación" },
          { k: "Financiera", v: "MRR vs burn" },
        ].map((m) => (
          <div key={m.k} className="bg-cds-background p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.4px] text-cds-textSecondary">{m.k}</div>
            <div className="mt-1 text-[15px] font-semibold text-cds-buttonPrimary">{m.v}</div>
          </div>
        ))}
      </div>

      {/* Ritual semanal */}
      <div className="mb-1.5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.5px] text-cds-textSecondary">
        <span>Dashboard del fundador · ritual de los viernes (30 min)</span>
      </div>
      <div className="grid grid-cols-1 gap-px border border-cds-borderSubtle bg-cds-borderSubtle md:grid-cols-2">
        {WEEKLY.map((it, i) => {
          const checked = !!weekly[i]
          return (
            <label
              key={it[0]}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 bg-cds-background px-3 py-2.5 text-[13px]",
                checked && "bg-cds-supportSuccess/10",
              )}
            >
              <input type="checkbox" checked={checked} onChange={() => toggleWeekly(i)} className="h-4 w-4 shrink-0" />
              <span>{it[0]}</span>
              <span className="ml-auto font-mono text-xs text-cds-buttonPrimary">{it[1]}</span>
            </label>
          )
        })}
      </div>
      <Nota className="mt-2">
        Tildá lo cumplido cada semana y fijá tu prioridad #1.{" "}
        <button type="button" onClick={resetWeekly} className="text-cds-linkPrimary hover:underline">
          Reiniciar semana
        </button>
      </Nota>

      <hr className="my-6 border-cds-borderSubtle" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-cds-borderSubtle border-t-[3px] border-t-cds-supportError bg-cds-background px-4 py-3.5">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.4px] text-cds-textSecondary">Riesgos principales</h4>
          <div className="text-[13px] leading-relaxed">
            1) Interés sin intención de pago → todo piloto lleva número. 2) Académico sin presupuesto propio → atacar biotech
            + venta institucional. 3) Founder-sales no escala → sistematizar. 4) Hacer todo a la vez → 1 prioridad/semana.
          </div>
        </div>
        <div className="border border-cds-borderSubtle border-t-[3px] border-t-cds-buttonPrimary bg-cds-background px-4 py-3.5">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.4px] text-cds-textSecondary">Cómo priorizar</h4>
          <div className="text-[13px] leading-relaxed">
            <b>La pregunta única:</b> ¿esto acerca el próximo cliente pago? Sí → candidato; No → backlog. Entre candidatos:
            ICE (Impacto × Confianza × Facilidad). <b>Una prioridad #1 por semana.</b>
          </div>
        </div>
      </div>
    </section>
  )
}
