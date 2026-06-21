import { ROADMAP } from "../data"
import { ViewHeader } from "../components"

export function RoadmapView() {
  return (
    <section>
      <ViewHeader eyebrow="Prioridad: venta antes que features" title="Roadmap">
        Nada entra sin pasar el filtro de producto. Si no destraba un piloto, no se hace ahora.
      </ViewHeader>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {ROADMAP.map((col) => (
          <div key={col.titulo} className="border border-cds-borderSubtle bg-cds-background p-3.5">
            <h4 className="mb-2.5 border-b-2 border-cds-buttonPrimary pb-2 text-sm font-semibold">{col.titulo}</h4>
            <ul className="text-[13px]">
              {col.items.map((it) => (
                <li key={it} className="border-b border-cds-layer01 py-1.5 text-cds-textSecondary last:border-b-0">
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
