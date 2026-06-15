// ARCHIVED 2026-06-09 — estos charts (criticidad, distribución, heatmap,
// waterfall) se sacaron de Analítica: no movían una decisión en el lab (viz por
// viz; el waterfall pisa Auditoría). Se conserva como respaldo, sin rutear. El
// Forecast (el único que se ganó el lugar) se movió a OperativoGraphs con
// unidades. Para reactivar, volver a montar <AvanzadoGraphs/> en GraphsPage.
import { useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import createPlotlyComponent from "react-plotly.js/factory"
import Plotly from "plotly.js-dist-min"
import type { Data } from "plotly.js"

import { api, type Movimiento, type Reactivo } from "../lib/api"
import { useAuth } from "../lib/auth"
import { ChartCard, GraphShell } from "./GraphShell"
import { colors, type ChartScope } from "./data"
import { criticidadRows, distribucionRows, forecastAgotamiento, heatmapData, waterfallReactivo, type LiveScope } from "./liveData"

const Plot = createPlotlyComponent(Plotly)
const VENTANA_DIAS = 90
// El heatmap con 1–2 meses queda ilegible; se activa solo con suficiente historia.
const MESES_MINIMOS_HEATMAP = 3
const reactivosVacios: Reactivo[] = []
const movimientosVacios: Movimiento[] = []

const plotConfig = { displayModeBar: false, responsive: true }
const plotLayout = {
  autosize: true,
  height: 280,
  margin: { l: 48, r: 24, t: 8, b: 42 },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "IBM Plex Sans, sans-serif", color: "var(--cds-text-primary)" },
}

function isoDesde(dias: number) {
  const date = new Date()
  date.setDate(date.getDate() - dias)
  return date.toISOString().slice(0, 10)
}

function ChartSkeleton() {
  return <div className="h-[280px] animate-pulse bg-cds-field" />
}

function Aviso({ children }: { children: ReactNode }) {
  return <div className="flex h-[280px] items-center justify-center px-6 text-center text-sm text-cds-textSecondary">{children}</div>
}

export function AvanzadoGraphs({ scope, onScopeChange }: { scope: ChartScope; onScopeChange: (scope: ChartScope) => void }) {
  const { token } = useAuth()
  const desde = useMemo(() => isoDesde(VENTANA_DIAS), [])

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })
  const movimientosQuery = useQuery({
    queryKey: ["graphs", "movimientos", desde],
    queryFn: () => api.movimientos(token!, { desde, limite: 500 }),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const movimientos = movimientosQuery.data ?? movimientosVacios
  const liveScope: LiveScope = scope === "total" ? "total" : Number(scope)

  const forecast = useMemo(
    () => (typeof liveScope === "number" ? forecastAgotamiento(reactivos, movimientos, VENTANA_DIAS, liveScope) : null),
    [reactivos, movimientos, liveScope],
  )
  const criticidad = useMemo(() => criticidadRows(reactivos, movimientos, liveScope), [reactivos, movimientos, liveScope])
  const distribucion = useMemo(() => distribucionRows(movimientos, reactivos, liveScope), [movimientos, reactivos, liveScope])
  const heat = useMemo(() => heatmapData(movimientos, reactivos, liveScope), [movimientos, reactivos, liveScope])
  const waterfall = useMemo(
    () => (typeof liveScope === "number" ? waterfallReactivo(reactivos, movimientos, liveScope) : null),
    [reactivos, movimientos, liveScope],
  )

  const cargando = reactivosQuery.isLoading || movimientosQuery.isLoading
  const error = reactivosQuery.isError || movimientosQuery.isError
  const distribucionVacia = distribucion.length === 0 || distribucion.every((caja) => caja.valores.length === 0)
  const maxSalidas = Math.max(1, ...criticidad.map((punto) => punto.salidas))

  return (
    <GraphShell library="Avanzado" scope={scope} onScopeChange={onScopeChange} reactivos={reactivos}>
      {error ? (
        <div className="border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm xl:col-span-2">
          No se pudieron cargar los datos de analítica.
        </div>
      ) : null}

      <ChartCard title="Forecast agotamiento" wide>
        {cargando ? (
          <ChartSkeleton />
        ) : liveScope === "total" ? (
          <Aviso>
            Elegí un reactivo en <strong className="font-semibold text-cds-textPrimary">Alcance</strong> para proyectar su agotamiento — en
            inventario total no reconcilia entre unidades.
          </Aviso>
        ) : !forecast ? (
          <Aviso>Sin datos para mostrar.</Aviso>
        ) : forecast.sinConsumo ? (
          <Aviso>Sin consumo en la ventana: no hay agotamiento que proyectar.</Aviso>
        ) : (
          <Plot
            className="h-[280px] w-full"
            config={plotConfig}
            data={[
              {
                type: "scatter",
                mode: "lines",
                name: "Stock proyectado",
                x: forecast.dias,
                y: forecast.stock,
                line: { color: "#0f62fe", width: 2 },
              },
              {
                type: "scatter",
                mode: "lines",
                name: "Mínimo",
                x: [0, forecast.dias[forecast.dias.length - 1] ?? 0],
                y: [forecast.minimo, forecast.minimo],
                line: { color: "#ff832b", width: 1, dash: "dash" },
              },
            ]}
            layout={{
              ...plotLayout,
              legend: { orientation: "h" },
              xaxis: { title: { text: "Días" }, gridcolor: "var(--cds-border-subtle)" },
              yaxis: { title: { text: "Stock" }, gridcolor: "var(--cds-border-subtle)" },
            }}
          />
        )}
      </ChartCard>

      <ChartCard title="Scatter criticidad">
        {cargando ? (
          <ChartSkeleton />
        ) : criticidad.length === 0 ? (
          <Aviso>Sin datos para mostrar.</Aviso>
        ) : (
          <Plot
            className="h-[280px] w-full"
            config={plotConfig}
            data={[
              {
                type: "scatter",
                mode: criticidad.length <= 20 ? "text+markers" : "markers",
                text: criticidad.map((punto) => punto.nombre),
                textposition: "top center",
                x: criticidad.map((punto) => punto.salidas),
                y: criticidad.map((punto) => punto.cobertura),
                marker: {
                  size: 12,
                  color: criticidad.map((punto) => (punto.bajo ? "#da1e28" : "#24a148")),
                  opacity: 0.8,
                },
              },
            ]}
            layout={{
              ...plotLayout,
              xaxis: { title: { text: "# salidas" }, gridcolor: "var(--cds-border-subtle)" },
              yaxis: { title: { text: "Cobertura %" }, gridcolor: "var(--cds-border-subtle)" },
              shapes: [
                { type: "line", x0: 0, x1: maxSalidas, y0: 100, y1: 100, line: { color: "#ff832b", width: 1, dash: "dash" } },
              ],
            }}
          />
        )}
      </ChartCard>

      <ChartCard title="Distribución de consumo">
        {cargando ? (
          <ChartSkeleton />
        ) : distribucionVacia ? (
          <Aviso>Sin datos para mostrar.</Aviso>
        ) : (
          <Plot
            className="h-[280px] w-full"
            config={plotConfig}
            data={
              distribucion.map((caja, index) => ({
                type: "box",
                name: caja.nombre,
                y: caja.valores,
                boxpoints: "all",
                jitter: 0.4,
                pointpos: 0,
                marker: { color: colors[index % colors.length] },
                line: { color: colors[index % colors.length] },
              })) as Data[]
            }
            layout={{
              ...plotLayout,
              showlegend: false,
              margin: { ...plotLayout.margin, b: 90 },
              xaxis: { tickangle: -25 },
              yaxis: { title: { text: scope === "total" ? "# salidas/mes" : "Tamaño de salida" }, gridcolor: "var(--cds-border-subtle)" },
            }}
          />
        )}
      </ChartCard>

      <ChartCard title="Heatmap actividad">
        {cargando ? (
          <ChartSkeleton />
        ) : heat.x.length < MESES_MINIMOS_HEATMAP ? (
          <Aviso>El heatmap se activa con varios meses de datos (por ahora hay {heat.x.length}).</Aviso>
        ) : heat.y.length === 0 ? (
          <Aviso>Sin datos para mostrar.</Aviso>
        ) : (
          <Plot
            className="h-[280px] w-full"
            config={plotConfig}
            data={[{ type: "heatmap", x: heat.x, y: heat.y, z: heat.z, colorscale: "Blues", hoverongaps: false }]}
            layout={{ ...plotLayout, margin: { l: 140, r: 16, t: 8, b: 42 } }}
          />
        )}
      </ChartCard>

      <ChartCard title="Waterfall stock" wide>
        {cargando ? (
          <ChartSkeleton />
        ) : liveScope === "total" ? (
          <Aviso>
            Elegí un reactivo en <strong className="font-semibold text-cds-textPrimary">Alcance</strong> para ver su waterfall — el stock
            solo reconcilia en una unidad.
          </Aviso>
        ) : !waterfall ? (
          <Aviso>Sin datos para mostrar.</Aviso>
        ) : (
          <Plot
            className="h-[280px] w-full"
            config={plotConfig}
            data={[
              {
                type: "waterfall",
                orientation: "v",
                measure: waterfall.measures,
                x: waterfall.labels,
                y: waterfall.valores,
                connector: { line: { color: "var(--cds-text-secondary)" } },
                increasing: { marker: { color: "#24a148" } },
                decreasing: { marker: { color: "#da1e28" } },
                totals: { marker: { color: "#0f62fe" } },
              } as Data,
            ]}
            layout={{ ...plotLayout, yaxis: { gridcolor: "var(--cds-border-subtle)" } }}
          />
        )}
      </ChartCard>
    </GraphShell>
  )
}
