import { AxisBottom, AxisLeft } from "@visx/axis"
import { Group } from "@visx/group"
import { hierarchy, Treemap } from "@visx/hierarchy"
import { ParentSize } from "@visx/responsive"
import { scaleBand, scaleLinear, scaleOrdinal, scalePoint } from "@visx/scale"
import { Bar, LinePath } from "@visx/shape"

import { ChartCard, GraphShell } from "./GraphShell"
import {
  bubbleRows,
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

const height = 280

function VisxTreemap({ scope }: { scope: ChartScope }) {
  const rows = treemapRows(scope)
  const root = hierarchy({ name: "root", children: rows }).sum((node) => ("value" in node ? Number(node.value) : 0))

  return (
    <ParentSize>
      {({ width }) => (
        <svg width={width} height={height}>
          <Treemap root={root} size={[width, height]} round>
            {(treemap) => (
              <Group>
                {treemap.descendants().slice(1).map((node, index) => (
                  <Group key={`${node.data.name}-${index}`} left={node.x0} top={node.y0}>
                    <rect width={node.x1 - node.x0} height={node.y1 - node.y0} fill={colors[index % colors.length]} opacity={0.9} />
                    <text x={8} y={18} fill="white" fontSize={12}>
                      {node.data.name}
                    </text>
                  </Group>
                ))}
              </Group>
            )}
          </Treemap>
        </svg>
      )}
    </ParentSize>
  )
}

function VisxRankedBar({ scope }: { scope: ChartScope }) {
  const rows = rankedRows(scope)
  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 8, right: 24, bottom: 28, left: 132 }
        const x = scaleLinear({ domain: [0, Math.max(...rows.map((row) => row.value), 1)], range: [margin.left, width - margin.right] })
        const y = scaleBand({ domain: rows.map((row) => row.label), range: [margin.top, height - margin.bottom], padding: 0.22 })

        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} numTicks={4} />
            <AxisLeft left={margin.left} scale={y} tickLength={0} />
            {rows.map((row) => (
              <Bar key={row.label} x={margin.left} y={y(row.label)} width={x(row.value) - margin.left} height={y.bandwidth()} fill="#0f62fe" />
            ))}
          </svg>
        )
      }}
    </ParentSize>
  )
}

function VisxLines() {
  const rows = monthlyTotals()
  const keys = reactivosAnalytics.slice(0, 4).map((reactivo) => reactivo.nombre)
  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 12, right: 112, bottom: 28, left: 44 }
        const x = scalePoint({ domain: rows.map((row) => String(row.mes)), range: [margin.left, width - margin.right] })
        const y = scaleLinear({
          domain: [0, Math.max(...rows.flatMap((row) => keys.map((key) => Number(row[key]))), 1)],
          range: [height - margin.bottom, margin.top],
        })

        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} />
            <AxisLeft left={margin.left} scale={y} numTicks={4} />
            {keys.map((key, index) => (
              <LinePath
                key={key}
                data={rows}
                x={(row) => x(String(row.mes)) ?? margin.left}
                y={(row) => y(Number(row[key]))}
                stroke={colors[index]}
                strokeWidth={2}
              />
            ))}
            {keys.map((key, index) => (
              <text key={key} x={width - margin.right + 10} y={24 + index * 20} fill={colors[index]} fontSize={12}>
                {key}
              </text>
            ))}
          </svg>
        )
      }}
    </ParentSize>
  )
}

function VisxStacked({ scope }: { scope: ChartScope }) {
  const rows = stackedRows(scope)
  const keys = stackedKeys(scope)

  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 12, right: 24, bottom: 28, left: 44 }
        const totals = rows.map((row) => keys.reduce((total, key) => total + numericValue(row, key), 0))
        const x = scaleBand({ domain: rows.map((row) => String(row.mes)), range: [margin.left, width - margin.right], padding: 0.25 })
        const y = scaleLinear({ domain: [0, Math.max(...totals, 1)], range: [height - margin.bottom, margin.top] })
        const color = scaleOrdinal({ domain: keys, range: colors })

        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} />
            <AxisLeft left={margin.left} scale={y} numTicks={4} />
            {rows.map((row) => {
              let y0 = 0
              return keys.map((key) => {
                const value = numericValue(row, key)
                const bar = (
                  <Bar
                    key={`${row.mes}-${key}`}
                    x={x(String(row.mes))}
                    y={y(y0 + value)}
                    width={x.bandwidth()}
                    height={y(y0) - y(y0 + value)}
                    fill={color(key)}
                  />
                )
                y0 += value
                return bar
              })
            })}
          </svg>
        )
      }}
    </ParentSize>
  )
}

function VisxGauge({ scope }: { scope: ChartScope }) {
  const value = gaugeValue(scope)
  return (
    <div className="flex h-[280px] flex-col justify-center gap-5">
      <div className="h-4 bg-cds-layer02">
        <div className="h-4 bg-cds-buttonPrimary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <div className="text-[54px] font-light leading-none">{value}%</div>
      <p className="text-sm text-cds-textSecondary">Cobertura de stock contra mínimo operativo.</p>
    </div>
  )
}

function VisxHeatmap({ scope }: { scope: ChartScope }) {
  const rows = heatmapRows(scope)
  const xDomain = Array.from(new Set(rows.map((row) => row.x)))
  const yDomain = Array.from(new Set(rows.map((row) => row.y)))
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 8, right: 24, bottom: 28, left: 142 }
        const x = scaleBand({ domain: xDomain, range: [margin.left, width - margin.right], padding: 0.08 })
        const y = scaleBand({ domain: yDomain, range: [margin.top, height - margin.bottom], padding: 0.08 })
        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} tickLength={0} />
            <AxisLeft left={margin.left} scale={y} tickLength={0} />
            {rows.map((row) => (
              <rect
                key={`${row.x}-${row.y}`}
                x={x(row.x)}
                y={y(row.y)}
                width={x.bandwidth()}
                height={y.bandwidth()}
                fill="#0f62fe"
                opacity={0.16 + (row.value / max) * 0.84}
              />
            ))}
          </svg>
        )
      }}
    </ParentSize>
  )
}

function VisxPareto({ scope }: { scope: ChartScope }) {
  const rows = paretoRows(scope)
  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 12, right: 44, bottom: 58, left: 44 }
        const x = scaleBand({ domain: rows.map((row) => row.label), range: [margin.left, width - margin.right], padding: 0.22 })
        const yLeft = scaleLinear({ domain: [0, Math.max(...rows.map((row) => row.value), 1)], range: [height - margin.bottom, margin.top] })
        const yRight = scaleLinear({ domain: [0, 100], range: [height - margin.bottom, margin.top] })
        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} tickLabelProps={() => ({ fontSize: 10, textAnchor: "end", transform: "rotate(-25)" })} />
            <AxisLeft left={margin.left} scale={yLeft} numTicks={4} />
            {rows.map((row) => (
              <Bar key={row.label} x={x(row.label)} y={yLeft(row.value)} width={x.bandwidth()} height={yLeft(0) - yLeft(row.value)} fill="#0f62fe" />
            ))}
            <LinePath data={rows} x={(row) => (x(row.label) ?? 0) + x.bandwidth() / 2} y={(row) => yRight(row.acumulado)} stroke="#da1e28" strokeWidth={2} />
          </svg>
        )
      }}
    </ParentSize>
  )
}

function VisxBubble({ scope }: { scope: ChartScope }) {
  const rows = bubbleRows(scope)
  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 12, right: 24, bottom: 32, left: 58 }
        const x = scaleLinear({ domain: [0, Math.max(...rows.map((row) => row.consumo), 1)], range: [margin.left, width - margin.right] })
        const y = scaleLinear({ domain: [0, Math.max(...rows.map((row) => row.valor), 1)], range: [height - margin.bottom, margin.top] })
        const r = scaleLinear({ domain: [0, Math.max(...rows.map((row) => row.stock), 1)], range: [8, 30] })
        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} numTicks={4} />
            <AxisLeft left={margin.left} scale={y} numTicks={4} />
            {rows.map((row) => (
              <Group key={row.nombre}>
                <circle cx={x(row.consumo)} cy={y(row.valor)} r={r(row.stock)} fill={row.riesgo >= 2 ? "#da1e28" : "#24a148"} opacity={0.78} />
                <text x={x(row.consumo) + 8} y={y(row.valor) - 8} fontSize={11} fill="currentColor">
                  {row.nombre}
                </text>
              </Group>
            ))}
          </svg>
        )
      }}
    </ParentSize>
  )
}

function VisxWaterfall({ scope }: { scope: ChartScope }) {
  const rows = waterfallRows(scope)
  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 12, right: 24, bottom: 48, left: 58 }
        const x = scaleBand({ domain: rows.map((row) => row.label), range: [margin.left, width - margin.right], padding: 0.25 })
        const y = scaleLinear({ domain: [0, Math.max(...rows.map((row) => Math.max(row.start, row.end)), 1)], range: [height - margin.bottom, margin.top] })
        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} />
            <AxisLeft left={margin.left} scale={y} numTicks={4} />
            {rows.map((row) => (
              <Bar
                key={row.label}
                x={x(row.label)}
                y={y(Math.max(row.start, row.end))}
                width={x.bandwidth()}
                height={Math.abs(y(row.start) - y(row.end))}
                fill={row.kind === "negative" ? "#da1e28" : row.kind === "positive" ? "#24a148" : "#0f62fe"}
              />
            ))}
            {rows.slice(0, -1).map((row, index) => (
              <line
                key={`${row.label}-connector`}
                x1={(x(row.label) ?? 0) + x.bandwidth()}
                x2={x(rows[index + 1].label) ?? 0}
                y1={y(row.end)}
                y2={y(row.end)}
                stroke="currentColor"
                strokeDasharray="3 3"
                opacity={0.45}
              />
            ))}
            {rows.map((row) => (
              <text key={`${row.label}-label`} x={(x(row.label) ?? 0) + x.bandwidth() / 2} y={y(Math.max(row.start, row.end)) - 6} textAnchor="middle" fontSize={11} fill="currentColor">
                {row.displayValue ?? row.value}
              </text>
            ))}
          </svg>
        )
      }}
    </ParentSize>
  )
}

function VisxForecast({ scope }: { scope: ChartScope }) {
  const rows = forecastRows(scope)
  return (
    <ParentSize>
      {({ width }) => {
        const margin = { top: 12, right: 24, bottom: 28, left: 58 }
        const x = scalePoint({ domain: rows.map((row) => row.mes), range: [margin.left, width - margin.right] })
        const y = scaleLinear({ domain: [0, Math.max(...rows.map((row) => Math.max(row.real ?? 0, row.forecast ?? 0)), 1)], range: [height - margin.bottom, margin.top] })
        return (
          <svg width={width} height={height}>
            <AxisBottom top={height - margin.bottom} scale={x} />
            <AxisLeft left={margin.left} scale={y} numTicks={4} />
            <LinePath data={rows.filter((row) => row.real !== null)} x={(row) => x(row.mes) ?? margin.left} y={(row) => y(row.real ?? 0)} stroke="#0f62fe" strokeWidth={2} />
            <LinePath
              data={rows.filter((row) => row.forecast !== null)}
              x={(row) => x(row.mes) ?? margin.left}
              y={(row) => y(row.forecast ?? 0)}
              stroke="#da1e28"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          </svg>
        )
      }}
    </ParentSize>
  )
}

export function VisxGraphs({ scope, onScopeChange }: { scope: ChartScope; onScopeChange: (scope: ChartScope) => void }) {
  return (
    <GraphShell library="Visx" scope={scope} onScopeChange={onScopeChange}>
      <ChartCard title="Treemap">
        <VisxTreemap scope={scope} />
      </ChartCard>
      <ChartCard title="Bar chart horizontal rankeado">
        <VisxRankedBar scope={scope} />
      </ChartCard>
      <ChartCard title="Line chart multi-serie">
        <VisxLines />
      </ChartCard>
      <ChartCard title="Stacked bar mensual">
        <VisxStacked scope={scope} />
      </ChartCard>
      <ChartCard title="Gauge / progress custom">
        <VisxGauge scope={scope} />
      </ChartCard>
      <ChartCard title="Heatmap reactivo x mes">
        <VisxHeatmap scope={scope} />
      </ChartCard>
      <ChartCard title="Pareto consumo">
        <VisxPareto scope={scope} />
      </ChartCard>
      <ChartCard title="Scatter bubble criticidad">
        <VisxBubble scope={scope} />
      </ChartCard>
      <ChartCard title="Waterfall stock">
        <VisxWaterfall scope={scope} />
      </ChartCard>
      <ChartCard title="Forecast agotamiento">
        <VisxForecast scope={scope} />
      </ChartCard>
    </GraphShell>
  )
}
