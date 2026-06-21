import { useCommandCenter } from "../CommandCenterContext"
import { FUNNEL_KEYS, KPI_LABELS, META } from "../data"
import { ViewHeader, Nota } from "../components"

export function EmbudoView() {
  const { funnel, setFunnelCampo } = useCommandCenter()

  return (
    <section>
      <ViewHeader eyebrow="Customer Discovery" title="Embudo de validación">
        Editá los números reales a medida que avanzás. OKR ratificado del trimestre (nivel Realista): 30 → 12 → 4 → 2 → 1.
      </ViewHeader>

      <div className="border border-cds-borderSubtle bg-cds-background p-4 md:p-5">
        {FUNNEL_KEYS.map((k) => {
          const val = funnel[k]
          const meta = META[k]
          const pct = Math.min(100, Math.round((val / meta) * 100))
          return (
            <div key={k} className="mb-2.5 flex items-center gap-3.5 last:mb-0">
              <div className="w-[110px] shrink-0 text-sm font-semibold sm:w-[130px]">{KPI_LABELS[k]}</div>
              <div className="relative h-[34px] flex-1 bg-cds-layer02">
                <i
                  className="block h-full bg-gradient-to-r from-cds-buttonPrimary to-[var(--lab-blue)]"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[13px] text-white mix-blend-difference">
                  {pct}%
                </span>
              </div>
              <input
                type="number"
                min={0}
                value={val}
                onChange={(e) => setFunnelCampo(k, parseInt(e.target.value) || 0)}
                className="w-[60px] border border-cds-borderSubtle bg-cds-background p-1.5 text-center font-mono text-cds-textPrimary outline-none focus:border-cds-buttonPrimary"
              />
              <div className="w-[54px] font-mono text-[13px] text-cds-textPlaceholder">/ {meta}</div>
            </div>
          )
        })}
      </div>

      <Nota className="mt-2.5">
        Estado actual: 11 leads de la encuesta cargados como contactos. 0 entrevistas hechas. La prioridad #1 es agendar
        conversaciones.
      </Nota>
    </section>
  )
}
