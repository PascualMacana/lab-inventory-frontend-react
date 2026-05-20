import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts"

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

function Gauge({ scope }: { scope: ChartScope }) {
  const value = gaugeValue(scope)
  return (
    <div className="flex h-[280px] flex-col justify-center gap-5">
      <div className="h-4 bg-cds-layer02">
        <div className="h-4 bg-cds-buttonPrimary transition-all" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <div className="text-[54px] font-light leading-none">{value}%</div>
      <p className="text-sm text-cds-textSecondary">Cobertura de stock contra mínimo operativo.</p>
    </div>
  )
}

export function RechartsGraphs({ scope, onScopeChange }: { scope: ChartScope; onScopeChange: (scope: ChartScope) => void }) {
  const tree = treemapRows(scope).map((row, index) => ({ name: row.name, size: row.value, fill: colors[index % colors.length] }))
  const ranked = rankedRows(scope)
  const monthly = monthlyTotals()
  const stacked = stackedRows(scope)
  const keys = stackedKeys(scope)
  const heatmap = heatmapRows(scope)
  const heatmapMax = Math.max(...heatmap.map((row) => row.value), 1)
  const heatmapY = Array.from(new Set(heatmap.map((row) => row.y)))
  const pareto = paretoRows(scope)
  const bubbles = bubbleRows(scope)
  const waterfall = waterfallRows(scope).map((row) => ({
    ...row,
    offset: Math.min(row.start, row.end),
    delta: Math.abs(row.end - row.start),
    visibleValue: row.displayValue ?? row.value,
  }))
  const forecast = forecastRows(scope)

  return (
    <GraphShell library="Recharts" scope={scope} onScopeChange={onScopeChange}>
      <ChartCard title="Treemap">
        <ResponsiveContainer width="100%" height={280}>
          <Treemap data={tree} dataKey="size" nameKey="name" stroke="var(--cds-layer-01)">
            {tree.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Treemap>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Bar chart horizontal rankeado">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={ranked} layout="vertical" margin={{ left: 24, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
            <XAxis type="number" />
            <YAxis dataKey="label" type="category" width={130} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#0f62fe" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Line chart multi-serie">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            {reactivosAnalytics.slice(0, 4).map((reactivo, index) => (
              <Line key={reactivo.id} type="monotone" dataKey={reactivo.nombre} stroke={colors[index]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Stacked bar mensual">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stacked}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            {keys.map((key, index) => (
              <Bar key={key} dataKey={key} stackId="month" fill={colors[index % colors.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Gauge / progress custom">
        <Gauge scope={scope} />
      </ChartCard>

      <ChartCard title="Heatmap reactivo x mes">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ left: 28, right: 24, top: 8, bottom: 24 }}>
            <XAxis dataKey="x" type="category" allowDuplicatedCategory={false} />
            <YAxis dataKey="y" type="category" width={140} ticks={heatmapY} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Scatter data={heatmap} shape="square">
              {heatmap.map((row) => (
                <Cell key={`${row.x}-${row.y}`} fill="#0f62fe" opacity={0.18 + (row.value / heatmapMax) * 0.82} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Pareto consumo">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={pareto}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
            <Tooltip />
            <Bar yAxisId="left" dataKey="value" fill="#0f62fe" />
            <Line yAxisId="right" dataKey="acumulado" stroke="#da1e28" strokeWidth={2} dot />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Scatter bubble criticidad">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ left: 8, right: 28, top: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
            <XAxis dataKey="consumo" name="Consumo" />
            <YAxis dataKey="valor" name="Valor" />
            <Tooltip />
            <Scatter data={bubbles} fill="#0f62fe">
              {bubbles.map((row) => (
                <Cell key={row.nombre} fill={row.riesgo >= 2 ? "#da1e28" : "#24a148"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Waterfall stock">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={waterfall}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="offset" stackId="stock" fill="transparent" />
            <Bar dataKey="delta" stackId="stock">
              <LabelList dataKey="visibleValue" position="top" fontSize={11} />
              {waterfall.map((row) => (
                <Cell key={row.label} fill={row.kind === "negative" ? "#da1e28" : row.kind === "positive" ? "#24a148" : "#0f62fe"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Forecast agotamiento">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="real" name="Stock real" stroke="#0f62fe" strokeWidth={2} connectNulls dot={false} />
            <Line dataKey="forecast" name="Forecast" stroke="#da1e28" strokeWidth={2} strokeDasharray="6 4" connectNulls dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </GraphShell>
  )
}
