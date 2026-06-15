import { lazy, Suspense, useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import Chart from "react-apexcharts"
import type { ApexOptions } from "apexcharts"

import { api, type Movimiento, type Reactivo } from "../lib/api"
import { useAuth } from "../lib/auth"
import { ChartCard, EmptyChart, GraphShell } from "./GraphShell"
import { colors, type ChartScope } from "./data"
import { coberturaGauge, coberturaRows, consumoMensual, forecastAgotamiento, paretoRows, topConsumoRows, type LiveScope } from "./liveData"

// Plotly is the heavy bundle; the gauge and the forecast are the only Plotly
// charts here, so both are deferred — Apex paints first and they fill in.
const PlotlyGauge = lazy(() => import("./PlotlyGauge").then((module) => ({ default: module.PlotlyGauge })))
const PlotlyForecast = lazy(() => import("./PlotlyForecast").then((module) => ({ default: module.PlotlyForecast })))

const VENTANA_DIAS = 90
const reactivosVacios: Reactivo[] = []
const movimientosVacios: Movimiento[] = []

function isoDesde(dias: number) {
  const date = new Date()
  date.setDate(date.getDate() - dias)
  return date.toISOString().slice(0, 10)
}

function baseOptions(options: ApexOptions = {}): ApexOptions {
  return {
    chart: {
      toolbar: { show: true },
      fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif",
      foreColor: "var(--cds-text-secondary)",
      background: "transparent",
      ...options.chart,
    },
    colors,
    dataLabels: { enabled: false, ...options.dataLabels },
    grid: { borderColor: "var(--cds-border-subtle)", ...options.grid },
    legend: { labels: { colors: "var(--cds-text-secondary)" }, ...options.legend },
    stroke: { width: 2, ...options.stroke },
    theme: { mode: "light", ...options.theme },
    tooltip: { theme: "light", ...options.tooltip },
    xaxis: {
      labels: { style: { colors: "var(--cds-text-secondary)" } },
      axisBorder: { color: "var(--cds-border-subtle)" },
      axisTicks: { color: "var(--cds-border-subtle)" },
      ...options.xaxis,
    },
    yaxis: options.yaxis ?? { labels: { style: { colors: "var(--cds-text-secondary)" } } },
    ...options,
  }
}

function ChartBox({
  type,
  series,
  options,
  height = 280,
}: {
  type: ApexChart["type"]
  series: ApexAxisChartSeries | ApexNonAxisChartSeries
  options: ApexOptions
  height?: number
}) {
  return <Chart type={type} height={height} series={series} options={baseOptions(options)} />
}

function ChartSkeleton() {
  return <div className="h-[280px] animate-pulse bg-cds-field" />
}

function Aviso({ children }: { children: ReactNode }) {
  return <div className="flex h-[280px] items-center justify-center px-6 text-center text-sm text-cds-textSecondary">{children}</div>
}

export function OperativoGraphs({ scope, onScopeChange }: { scope: ChartScope; onScopeChange: (scope: ChartScope) => void }) {
  const { token } = useAuth()
  const desde = useMemo(() => isoDesde(VENTANA_DIAS), [])

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })
  // El endpoint topea en 500; en un lab muy activo podría truncar los meses más
  // viejos de la ventana — a futuro conviene un endpoint de agregación.
  const movimientosQuery = useQuery({
    queryKey: ["graphs", "movimientos", desde],
    queryFn: () => api.movimientos(token!, { desde, limite: 500 }),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const movimientos = movimientosQuery.data ?? movimientosVacios
  const liveScope: LiveScope = scope === "total" ? "total" : Number(scope)

  const cobertura = useMemo(() => coberturaRows(reactivos, liveScope), [reactivos, liveScope])
  const top = useMemo(() => topConsumoRows(movimientos, liveScope), [movimientos, liveScope])
  const pareto = useMemo(() => paretoRows(movimientos, liveScope), [movimientos, liveScope])
  const mensual = useMemo(() => consumoMensual(movimientos, reactivos, liveScope), [movimientos, reactivos, liveScope])
  const gauge = useMemo(() => coberturaGauge(reactivos, liveScope), [reactivos, liveScope])
  const forecast = useMemo(
    () => (typeof liveScope === "number" ? forecastAgotamiento(reactivos, movimientos, VENTANA_DIAS, liveScope) : null),
    [reactivos, movimientos, liveScope],
  )
  const unidadSel = typeof liveScope === "number" ? reactivos.find((reactivo) => reactivo.id === liveScope)?.unidad ?? "" : ""

  const cargando = reactivosQuery.isLoading || movimientosQuery.isLoading
  const error = reactivosQuery.isError || movimientosQuery.isError
  const consumoLabel = scope === "total" ? "Salidas" : "Consumo"

  return (
    <GraphShell scope={scope} onScopeChange={onScopeChange} reactivos={reactivos}>
      {error ? (
        <div className="border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm xl:col-span-2">
          No se pudieron cargar los datos de analítica.
        </div>
      ) : null}

      <ChartCard title="Stock vs mínimo">
        {cargando ? (
          <ChartSkeleton />
        ) : cobertura.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartBox
            type="bar"
            series={[{ name: "Cobertura", data: cobertura.map((row) => ({ x: row.label, y: row.cobertura })) }]}
            options={{
              plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 0 } },
              colors: cobertura.map((row) => (row.bajo ? "#da1e28" : "#24a148")),
              legend: { show: false },
              dataLabels: { enabled: true, formatter: (val) => `${val}%` },
              tooltip: { y: { formatter: (val) => `${val}%` } },
              annotations: {
                xaxis: [
                  {
                    x: 100,
                    strokeDashArray: 4,
                    borderColor: "#161616",
                    label: { text: "Mínimo", borderColor: "#161616", style: { background: "#161616", color: "#fff" } },
                  },
                ],
              },
            }}
          />
        )}
      </ChartCard>

      <ChartCard title="Top consumo">
        {cargando ? (
          <ChartSkeleton />
        ) : top.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartBox
            type="bar"
            series={[{ name: consumoLabel, data: top.map((row) => row.value) }]}
            options={{
              plotOptions: { bar: { horizontal: true, borderRadius: 0 } },
              xaxis: { categories: top.map((row) => row.label) },
            }}
          />
        )}
      </ChartCard>

      <ChartCard title="Pareto consumo">
        {cargando ? (
          <ChartSkeleton />
        ) : pareto.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartBox
            type="line"
            series={[
              { name: consumoLabel, type: "column", data: pareto.map((row) => row.value) },
              { name: "Acumulado %", type: "line", data: pareto.map((row) => row.acumulado) },
            ]}
            options={{
              stroke: { width: [0, 3] },
              xaxis: { categories: pareto.map((row) => row.label) },
              yaxis: [{ title: { text: consumoLabel } }, { opposite: true, max: 100, title: { text: "% acumulado" } }],
            }}
          />
        )}
      </ChartCard>

      <ChartCard title="Consumo mensual">
        {cargando ? (
          <ChartSkeleton />
        ) : mensual.rows.length === 0 || mensual.keys.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartBox
            type="bar"
            series={mensual.keys.map((key) => ({
              name: key,
              data: mensual.rows.map((row) => Number(row[key] ?? 0)),
            }))}
            options={{
              chart: { stacked: true },
              plotOptions: { bar: { borderRadius: 0 } },
              xaxis: { categories: mensual.categorias },
            }}
          />
        )}
      </ChartCard>

      <ChartCard title="Cobertura de stock">
        {cargando ? (
          <ChartSkeleton />
        ) : (
          <Suspense
            fallback={<div className="flex h-[280px] items-center justify-center text-sm text-cds-textSecondary">Cargando gauge...</div>}
          >
            <PlotlyGauge value={gauge} />
          </Suspense>
        )}
      </ChartCard>

      <ChartCard title="Forecast agotamiento">
        {cargando ? (
          <ChartSkeleton />
        ) : liveScope === "total" ? (
          <Aviso>
            Elegí un reactivo en <strong className="font-semibold text-cds-textPrimary">Alcance</strong> para proyectar su agotamiento.
          </Aviso>
        ) : !forecast ? (
          <Aviso>Sin datos para mostrar.</Aviso>
        ) : forecast.sinConsumo ? (
          <Aviso>Sin consumo en la ventana: no hay agotamiento que proyectar.</Aviso>
        ) : (
          <Suspense fallback={<ChartSkeleton />}>
            <PlotlyForecast dias={forecast.dias} stock={forecast.stock} minimo={forecast.minimo} unidad={unidadSel} />
          </Suspense>
        )}
      </ChartCard>
    </GraphShell>
  )
}
