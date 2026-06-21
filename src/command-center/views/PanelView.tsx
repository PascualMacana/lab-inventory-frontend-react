import { useOutletContext } from "react-router-dom"

import { cn } from "../../lib/utils"
import { useCommandCenter } from "../CommandCenterContext"
import { FUNNEL_KEYS, KPI_LABELS, META, PANEL_CAMPOS } from "../data"
import { ViewHeader, Nota } from "../components"

const TONO_BORDE: Record<string, string> = {
  warn: "border-t-cds-supportError",
  metric: "border-t-cds-supportSuccess",
  deleg: "border-t-lab-blue40",
  base: "border-t-cds-buttonPrimary",
}

function KpiBar() {
  const { funnel } = useCommandCenter()
  return (
    <div className="mb-6 grid grid-cols-2 gap-px border border-cds-borderSubtle bg-cds-borderSubtle sm:grid-cols-3 lg:grid-cols-5">
      {FUNNEL_KEYS.map((k) => {
        const val = funnel[k]
        const meta = META[k]
        const pct = Math.min(100, Math.round((val / meta) * 100))
        const done = val >= meta
        return (
          <div key={k} className="bg-cds-background p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.4px] text-cds-textSecondary">{KPI_LABELS[k]}</div>
            <div className={cn("mt-1.5 font-mono text-[34px] font-medium leading-none", done && "text-cds-supportSuccess")}>
              {val}
            </div>
            <div className="text-xs text-cds-textPlaceholder">meta {meta}</div>
            <div className="mt-2.5 h-[5px] bg-cds-layer02">
              <i
                className={cn("block h-full", done ? "bg-cds-supportSuccess" : "bg-cds-buttonPrimary")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PanelView() {
  const { hoy } = useOutletContext<{ hoy: string }>()
  const { panel, setPanelCampo } = useCommandCenter()

  return (
    <section>
      <ViewHeader eyebrow={<>Panel diario · {hoy}</>} title="Cuello de botella y plan de hoy">
        Tu command center. Los números y notas se guardan compartidos con tu socio. Editá cualquier campo del panel y se
        persiste solo.
      </ViewHeader>

      <KpiBar />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {PANEL_CAMPOS.map((campo) => (
          <div
            key={campo.k}
            className={cn(
              "border border-cds-borderSubtle border-t-[3px] bg-cds-background px-4 py-3.5",
              TONO_BORDE[campo.tono],
              campo.full && "md:col-span-2",
            )}
          >
            <h4 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.4px] text-cds-textSecondary">
              {campo.titulo}
            </h4>
            <div
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label={campo.titulo}
              tabIndex={0}
              className="min-h-[22px] text-sm leading-relaxed text-cds-textPrimary outline-none focus:bg-cds-buttonPrimary/10"
              onBlur={(e) => {
                const v = e.currentTarget.textContent?.trim() ?? ""
                if (v !== (panel[campo.k] ?? "")) {
                  setPanelCampo(campo.k, v)
                }
              }}
            >
              {panel[campo.k] ?? ""}
            </div>
          </div>
        ))}
      </div>

      <Nota>Tip: actualizá este panel cada mañana. Es tu brújula del día.</Nota>
    </section>
  )
}
