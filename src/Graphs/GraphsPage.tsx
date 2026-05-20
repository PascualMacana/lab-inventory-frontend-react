import { lazy, Suspense, useState } from "react"

import { D3Graphs } from "./D3Graphs"
import { RechartsGraphs } from "./RechartsGraphs"
import { VisxGraphs } from "./VisxGraphs"
import type { ChartScope } from "./data"

const PlotlyGraphs = lazy(() => import("./PlotlyGraphs").then((module) => ({ default: module.PlotlyGraphs })))
const ApexChartsGraphs = lazy(() => import("./ApexChartsGraphs").then((module) => ({ default: module.ApexChartsGraphs })))

type LibraryKey = "recharts" | "d3" | "visx" | "apexcharts" | "plotly"

const libraries: Array<{ key: LibraryKey; label: string; note: string }> = [
  { key: "recharts", label: "Recharts", note: "Más rápido para dashboards CRUD." },
  { key: "d3", label: "D3.js", note: "Máximo control, más código propio." },
  { key: "visx", label: "Visx", note: "Primitivas D3 en React." },
  { key: "apexcharts", label: "ApexCharts", note: "Buen balance: interactividad lista y API simple." },
  { key: "plotly", label: "Plotly.js", note: "Interactividad rica, bundle pesado." },
]

export function GraphsPage() {
  const [library, setLibrary] = useState<LibraryKey>("recharts")
  const [scope, setScope] = useState<ChartScope>("total")

  return (
    <section className="space-y-6">
      <div>
        <h1>Analítica</h1>
        <p className="mt-2 max-w-3xl text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          Sandbox comparativo con los mismos datos mock para evaluar Treemap, ranking horizontal, línea multi-serie, stacked bar mensual y gauge/progress.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {libraries.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`border p-4 text-left transition-colors ${
              library === item.key
                ? "border-cds-buttonPrimary bg-cds-buttonPrimary text-white"
                : "border-cds-borderSubtle bg-cds-layer01 hover:bg-[var(--cds-layer-hover-01)]"
            }`}
            onClick={() => setLibrary(item.key)}
          >
            <div className="text-sm font-semibold tracking-[0.16px]">{item.label}</div>
            <div className={`mt-2 text-xs leading-[1.33] tracking-[0.32px] ${library === item.key ? "text-white" : "text-cds-textSecondary"}`}>
              {item.note}
            </div>
          </button>
        ))}
      </div>

      {library === "recharts" ? <RechartsGraphs scope={scope} onScopeChange={setScope} /> : null}
      {library === "d3" ? <D3Graphs scope={scope} onScopeChange={setScope} /> : null}
      {library === "visx" ? <VisxGraphs scope={scope} onScopeChange={setScope} /> : null}
      {library === "apexcharts" ? (
        <Suspense fallback={<div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando ApexCharts...</div>}>
          <ApexChartsGraphs scope={scope} onScopeChange={setScope} />
        </Suspense>
      ) : null}
      {library === "plotly" ? (
        <Suspense fallback={<div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando Plotly.js...</div>}>
          <PlotlyGraphs scope={scope} onScopeChange={setScope} />
        </Suspense>
      ) : null}
    </section>
  )
}
