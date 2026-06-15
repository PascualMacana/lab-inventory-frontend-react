import { useState } from "react"

import { OperativoGraphs } from "./OperativoGraphs"
import type { ChartScope } from "./data"

export function GraphsPage() {
  const [scope, setScope] = useState<ChartScope>("total")

  return (
    <section className="space-y-6">
      <div>
        <h1>Analítica</h1>
        <p className="mt-2 max-w-3xl text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          Vistazo operativo del inventario: cobertura, consumo, tendencia y proyección de agotamiento.
        </p>
      </div>

      <OperativoGraphs scope={scope} onScopeChange={setScope} />
    </section>
  )
}
