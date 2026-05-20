import createPlotlyComponent from "react-plotly.js/factory"
import Plotly from "plotly.js-dist-min"
import type { Data } from "plotly.js"

import { ChartCard, GraphShell } from "./GraphShell"
import {
  bubbleRows,
  categories,
  colors,
  forecastRows,
  gaugeValue,
  heatmapRows,
  monthlyTotals,
  numericValue,
  paretoRows,
  rankedRows,
  reactivosAnalytics,
  stackedKeys,
  stackedRows,
  treemapRows,
  waterfallRows,
  type ChartScope,
} from "./data"

const Plot = createPlotlyComponent(Plotly)
const plotConfig = { displayModeBar: false, responsive: true }
const plotLayout = {
  autosize: true,
  height: 280,
  margin: { l: 48, r: 24, t: 8, b: 42 },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "IBM Plex Sans, sans-serif", color: "var(--cds-text-primary)" },
}

function plotlyTreemap(scope: ChartScope, tree: ReturnType<typeof treemapRows>) {
  if (scope !== "total") {
    return {
      ids: tree.map((row) => row.name),
      labels: tree.map((row) => row.name),
      parents: tree.map(() => ""),
      values: tree.map((row) => row.value),
    }
  }

  const categoryNames = Array.from(new Set(tree.map((row) => row.parent)))
  return {
    ids: ["inventario", ...categoryNames.map((category) => `cat:${category}`), ...tree.map((row) => `reactivo:${row.name}`)],
    labels: ["Inventario", ...categoryNames, ...tree.map((row) => row.name)],
    parents: ["", ...categoryNames.map(() => "inventario"), ...tree.map((row) => `cat:${row.parent}`)],
    values: [
      tree.reduce((total, row) => total + row.value, 0),
      ...categoryNames.map((category) => tree.filter((row) => row.parent === category).reduce((total, row) => total + row.value, 0)),
      ...tree.map((row) => row.value),
    ],
  }
}

export function PlotlyGraphs({ scope, onScopeChange }: { scope: ChartScope; onScopeChange: (scope: ChartScope) => void }) {
  const tree = treemapRows(scope)
  const treeData = plotlyTreemap(scope, tree)
  const ranked = rankedRows(scope)
  const monthly = monthlyTotals()
  const stacked = stackedRows(scope)
  const keys = stackedKeys(scope)
  const value = gaugeValue(scope)
  const heatmap = heatmapRows(scope)
  const heatmapX = Array.from(new Set(heatmap.map((row) => row.x)))
  const heatmapY = Array.from(new Set(heatmap.map((row) => row.y)))
  const pareto = paretoRows(scope)
  const bubbles = bubbleRows(scope)
  const waterfall = waterfallRows(scope)
  const forecast = forecastRows(scope)

  return (
    <GraphShell library="Plotly.js" scope={scope} onScopeChange={onScopeChange}>
      <ChartCard title="Treemap">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "treemap",
              ids: treeData.ids,
              labels: treeData.labels,
              parents: treeData.parents,
              values: treeData.values,
              marker: { colors },
              branchvalues: "total",
            },
          ]}
          layout={{ ...plotLayout, margin: { l: 0, r: 0, t: 0, b: 0 } }}
        />
      </ChartCard>

      <ChartCard title="Bar chart horizontal rankeado">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "bar",
              orientation: "h",
              x: ranked.map((row) => row.value),
              y: ranked.map((row) => row.label),
              marker: { color: "#0f62fe" },
            },
          ]}
          layout={{ ...plotLayout, yaxis: { automargin: true }, xaxis: { gridcolor: "var(--cds-border-subtle)" } }}
        />
      </ChartCard>

      <ChartCard title="Line chart multi-serie">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={reactivosAnalytics.slice(0, 4).map((reactivo, index) => ({
            type: "scatter",
            mode: "lines",
            name: reactivo.nombre,
            x: monthly.map((row) => row.mes),
            y: monthly.map((row) => row[reactivo.nombre]),
            line: { color: colors[index], width: 2 },
          }))}
          layout={{ ...plotLayout, legend: { orientation: "h" }, xaxis: { gridcolor: "var(--cds-border-subtle)" }, yaxis: { gridcolor: "var(--cds-border-subtle)" } }}
        />
      </ChartCard>

      <ChartCard title="Stacked bar mensual">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={keys.map((key, index) => ({
            type: "bar",
            name: key,
            x: stacked.map((row) => row.mes),
            y: stacked.map((row) => numericValue(row, key)),
            marker: { color: colors[index % colors.length] },
          }))}
          layout={{
            ...plotLayout,
            barmode: "stack",
            legend: { orientation: "h" },
            xaxis: { gridcolor: "var(--cds-border-subtle)" },
            yaxis: { gridcolor: "var(--cds-border-subtle)" },
          }}
        />
      </ChartCard>

      <ChartCard title="Gauge / progress custom">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "indicator",
              mode: "gauge+number",
              value,
              gauge: {
                axis: { range: [0, 160] },
                bar: { color: "#0f62fe" },
                steps: categories().map((_, index) => ({
                  range: [index * 32, (index + 1) * 32],
                  color: index < 2 ? "#f4f4f4" : "#e0e0e0",
                })),
              },
              number: { suffix: "%" },
            },
          ]}
          layout={{ ...plotLayout, margin: { l: 24, r: 24, t: 8, b: 8 } }}
        />
      </ChartCard>

      <ChartCard title="Heatmap reactivo x mes">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "heatmap",
              x: heatmapX,
              y: heatmapY,
              z: heatmapY.map((y) => heatmapX.map((x) => heatmap.find((row) => row.x === x && row.y === y)?.value ?? 0)),
              colorscale: "Blues",
            },
          ]}
          layout={{ ...plotLayout, margin: { l: 132, r: 16, t: 8, b: 42 } }}
        />
      </ChartCard>

      <ChartCard title="Pareto consumo">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "bar",
              name: "Consumo",
              x: pareto.map((row) => row.label),
              y: pareto.map((row) => row.value),
              marker: { color: "#0f62fe" },
            },
            {
              type: "scatter",
              mode: "lines+markers",
              name: "Acumulado %",
              x: pareto.map((row) => row.label),
              y: pareto.map((row) => row.acumulado),
              yaxis: "y2",
              line: { color: "#da1e28", width: 2 },
            },
          ]}
          layout={{
            ...plotLayout,
            yaxis: { gridcolor: "var(--cds-border-subtle)" },
            yaxis2: { overlaying: "y", side: "right", range: [0, 100] },
            legend: { orientation: "h" },
          }}
        />
      </ChartCard>

      <ChartCard title="Scatter bubble criticidad">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "scatter",
              mode: "text+markers",
              text: bubbles.map((row) => row.nombre),
              textposition: "top center",
              x: bubbles.map((row) => row.consumo),
              y: bubbles.map((row) => row.valor),
              marker: {
                size: bubbles.map((row) => Math.max(12, Math.sqrt(row.stock) * 1.2)),
                color: bubbles.map((row) => (row.riesgo >= 2 ? "#da1e28" : "#24a148")),
                opacity: 0.78,
              },
            },
          ]}
          layout={{
            ...plotLayout,
            xaxis: { title: { text: "Consumo" }, gridcolor: "var(--cds-border-subtle)" },
            yaxis: { title: { text: "Valor" }, gridcolor: "var(--cds-border-subtle)" },
          }}
        />
      </ChartCard>

      <ChartCard title="Waterfall stock">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "waterfall",
              orientation: "v",
              measure: waterfall.map((row) => row.measure),
              x: waterfall.map((row) => row.label),
              y: waterfall.map((row) => row.value),
              connector: { line: { color: "var(--cds-text-secondary)" } },
              increasing: { marker: { color: "#24a148" } },
              decreasing: { marker: { color: "#da1e28" } },
              totals: { marker: { color: "#0f62fe" } },
            } as Data,
          ]}
          layout={{ ...plotLayout, yaxis: { gridcolor: "var(--cds-border-subtle)" } }}
        />
      </ChartCard>

      <ChartCard title="Forecast agotamiento">
        <Plot
          className="h-[280px] w-full"
          config={plotConfig}
          data={[
            {
              type: "scatter",
              mode: "lines",
              name: "Stock real",
              x: forecast.map((row) => row.mes),
              y: forecast.map((row) => row.real),
              line: { color: "#0f62fe", width: 2 },
            },
            {
              type: "scatter",
              mode: "lines",
              name: "Forecast",
              x: forecast.map((row) => row.mes),
              y: forecast.map((row) => row.forecast),
              line: { color: "#da1e28", width: 2, dash: "dash" },
            },
          ]}
          layout={{ ...plotLayout, legend: { orientation: "h" }, yaxis: { gridcolor: "var(--cds-border-subtle)" } }}
        />
      </ChartCard>
    </GraphShell>
  )
}
