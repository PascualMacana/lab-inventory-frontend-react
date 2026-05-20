import Chart from "react-apexcharts"
import type { ApexOptions } from "apexcharts"

import { ChartCard, GraphShell } from "./GraphShell"
import {
  colors,
  bubbleRows,
  forecastRows,
  gaugeValue,
  heatmapRows,
  monthlyTotals,
  paretoRows,
  rankedRows,
  reactivosAnalytics,
  stackedKeys,
  stackedRows,
  treemapRows,
  waterfallRows,
  type ChartScope,
} from "./data"

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
    yaxis: options.yaxis ?? {
      labels: { style: { colors: "var(--cds-text-secondary)" } },
    },
    ...options,
  }
}

function ChartBox({
  type,
  series,
  options,
}: {
  type: ApexChart["type"]
  series: ApexAxisChartSeries | ApexNonAxisChartSeries
  options: ApexOptions
}) {
  return <Chart type={type} height={280} series={series} options={baseOptions(options)} />
}

export function ApexChartsGraphs({ scope, onScopeChange }: { scope: ChartScope; onScopeChange: (scope: ChartScope) => void }) {
  const tree = treemapRows(scope)
  const ranked = rankedRows(scope)
  const monthly = monthlyTotals()
  const stacked = stackedRows(scope)
  const keys = stackedKeys(scope)
  const heatmap = heatmapRows(scope)
  const heatmapGroups = Array.from(new Set(heatmap.map((row) => row.y)))
  const pareto = paretoRows(scope)
  const bubbles = bubbleRows(scope)
  const waterfall = waterfallRows(scope)
  const forecast = forecastRows(scope)

  return (
    <GraphShell library="ApexCharts" scope={scope} onScopeChange={onScopeChange}>
      <ChartCard title="Treemap">
        <ChartBox
          type="treemap"
          series={[{ data: tree.map((row) => ({ x: row.name, y: row.value })) }]}
          options={baseOptions({
            chart: { toolbar: { show: true } },
            plotOptions: { treemap: { distributed: true, enableShades: false } },
          })}
        />
      </ChartCard>

      <ChartCard title="Bar chart horizontal rankeado">
        <ChartBox
          type="bar"
          series={[{ name: "Consumo", data: ranked.map((row) => row.value) }]}
          options={{
            plotOptions: { bar: { horizontal: true, borderRadius: 0 } },
            xaxis: { categories: ranked.map((row) => row.label) },
          }}
        />
      </ChartCard>

      <ChartCard title="Line chart multi-serie">
        <ChartBox
          type="line"
          series={reactivosAnalytics.slice(0, 4).map((reactivo) => ({
            name: reactivo.nombre,
            data: reactivo.meses.map((month) => month.consumos),
          }))}
          options={{
            stroke: { curve: "smooth", width: 2 },
            xaxis: { categories: monthly.map((row) => String(row.mes)) },
          }}
        />
      </ChartCard>

      <ChartCard title="Stacked bar mensual">
        <ChartBox
          type="bar"
          series={keys.map((key) => ({
            name: key,
            data: stacked.map((row) => Number((row as Record<string, string | number>)[key] ?? 0)),
          }))}
          options={{
            chart: { stacked: true },
            plotOptions: { bar: { borderRadius: 0 } },
            xaxis: { categories: stacked.map((row) => String(row.mes)) },
          }}
        />
      </ChartCard>

      <ChartCard title="Gauge / progress radial">
        <ChartBox
          type="radialBar"
          series={[gaugeValue(scope)]}
          options={{
            labels: ["Cobertura"],
            plotOptions: {
              radialBar: {
                hollow: { size: "58%" },
                dataLabels: {
                  name: { color: "var(--cds-text-secondary)" },
                  value: { color: "var(--cds-text-primary)", fontSize: "34px", formatter: (value) => `${Math.round(value)}%` },
                },
              },
            },
          }}
        />
      </ChartCard>

      <ChartCard title="Heatmap reactivo x mes">
        <ChartBox
          type="heatmap"
          series={heatmapGroups.map((group) => ({
            name: group,
            data: heatmap.filter((row) => row.y === group).map((row) => ({ x: row.x, y: row.value })),
          }))}
          options={{
            plotOptions: {
              heatmap: {
                shadeIntensity: 0.55,
                colorScale: { ranges: [{ from: 0, to: 999999, color: "#0f62fe" }] },
              },
            },
          }}
        />
      </ChartCard>

      <ChartCard title="Pareto consumo">
        <ChartBox
          type="line"
          series={[
            { name: "Consumo", type: "column", data: pareto.map((row) => row.value) },
            { name: "Acumulado %", type: "line", data: pareto.map((row) => row.acumulado) },
          ]}
          options={{
            stroke: { width: [0, 3] },
            xaxis: { categories: pareto.map((row) => row.label) },
            yaxis: [
              { title: { text: "Consumo" } },
              { opposite: true, max: 100, title: { text: "% acumulado" } },
            ],
          }}
        />
      </ChartCard>

      <ChartCard title="Scatter bubble criticidad">
        <ChartBox
          type="bubble"
          series={[
            {
              name: "Reactivos",
              data: bubbles.map((row) => ({
                x: row.consumo,
                y: row.valor,
                z: Math.max(10, row.riesgo * 12),
              })),
            },
          ]}
          options={{
            xaxis: { title: { text: "Consumo" } },
            yaxis: { title: { text: "Valor inventario" } },
          }}
        />
      </ChartCard>

      <ChartCard title="Waterfall stock">
        <ChartBox
          type="bar"
          series={[{ name: "Stock", data: waterfall.map((row) => row.displayValue ?? row.value) }]}
          options={{
            plotOptions: { bar: { borderRadius: 0, distributed: true } },
            xaxis: { categories: waterfall.map((row) => row.label) },
            colors: waterfall.map((row) => (row.kind === "negative" ? "#da1e28" : row.kind === "positive" ? "#24a148" : "#0f62fe")),
          }}
        />
      </ChartCard>

      <ChartCard title="Forecast agotamiento">
        <ChartBox
          type="line"
          series={[
            { name: "Stock real", data: forecast.map((row) => row.real) },
            { name: "Forecast", data: forecast.map((row) => row.forecast) },
          ]}
          options={{
            stroke: { curve: "smooth", width: 2, dashArray: [0, 6] },
            xaxis: { categories: forecast.map((row) => row.mes) },
          }}
        />
      </ChartCard>
    </GraphShell>
  )
}
