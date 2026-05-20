import { useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"

import { ChartCard, EmptyChart, GraphShell } from "./GraphShell"
import {
  bubbleRows,
  colors,
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

type D3TreeNode = {
  name: string
  value?: number
  children?: D3TreeNode[]
}

function useD3(render: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!ref.current) {
      return
    }
    const svg = d3.select(ref.current)
    svg.selectAll("*").remove()
    render(svg)
  })

  return ref
}

function D3Treemap({ scope }: { scope: ChartScope }) {
  const rows = treemapRows(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const root = d3
      .hierarchy<D3TreeNode>({ name: "root", children: rows.map((row) => ({ name: row.name, value: row.value })) })
      .sum((node) => node.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const layout = d3.treemap<D3TreeNode>().size([width, height]).paddingInner(3)(root)
    const color = d3.scaleOrdinal<string>().range(colors)

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img")
    const nodes = svg.selectAll("g").data(layout.leaves()).join("g").attr("transform", (d) => `translate(${d.x0},${d.y0})`)
    nodes
      .append("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("fill", (d) => color(d.data.name))
      .attr("opacity", 0.9)
    nodes
      .append("text")
      .attr("x", 8)
      .attr("y", 18)
      .attr("fill", "white")
      .attr("font-size", 12)
      .text((d) => d.data.name)
  })

  return rows.length ? <svg ref={ref} className="h-[280px] w-full" /> : <EmptyChart />
}

function D3RankedBar({ scope }: { scope: ChartScope }) {
  const rows = rankedRows(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 8, right: 24, bottom: 24, left: 140 }
    const x = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.value) ?? 1]).range([margin.left, width - margin.right])
    const y = d3.scaleBand().domain(rows.map((d) => d.label)).range([margin.top, height - margin.bottom]).padding(0.22)

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(4)).call((g) => g.select(".domain").remove())
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(0)).call((g) => g.select(".domain").remove())
    svg
      .append("g")
      .selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", margin.left)
      .attr("y", (d) => y(d.label) ?? 0)
      .attr("width", (d) => x(d.value) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", "#0f62fe")
    svg
      .append("g")
      .selectAll("text")
      .data(rows)
      .join("text")
      .attr("x", (d) => x(d.value) + 6)
      .attr("y", (d) => (y(d.label) ?? 0) + y.bandwidth() / 2 + 4)
      .attr("font-size", 12)
      .attr("fill", "currentColor")
      .text((d) => `${d.value}`)
  })

  return rows.length ? <svg ref={ref} className="h-[280px] w-full overflow-visible" /> : <EmptyChart />
}

function D3Lines() {
  const rows = monthlyTotals()
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 12, right: 120, bottom: 28, left: 44 }
    const keys = reactivosAnalytics.slice(0, 4).map((reactivo) => reactivo.nombre)
    const x = d3.scalePoint().domain(rows.map((d) => String(d.mes))).range([margin.left, width - margin.right])
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(rows, (row) => d3.max(keys, (key) => Number(row[key]))) ?? 1])
      .nice()
      .range([height - margin.bottom, margin.top])
    const line = d3
      .line<Record<string, string | number>>()
      .x((d) => x(String(d.mes)) ?? margin.left)
      .y((d) => y(Number(d.value)))

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4))
    keys.forEach((key, index) => {
      const series = rows.map((row) => ({ mes: row.mes, value: Number(row[key]) }))
      svg.append("path").datum(series).attr("fill", "none").attr("stroke", colors[index]).attr("stroke-width", 2).attr("d", line)
      svg.append("text").attr("x", width - margin.right + 12).attr("y", 26 + index * 20).attr("fill", colors[index]).attr("font-size", 12).text(key)
    })
  })

  return <svg ref={ref} className="h-[280px] w-full" />
}

function D3Stacked({ scope }: { scope: ChartScope }) {
  const rows = stackedRows(scope)
  const keys = stackedKeys(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 12, right: 24, bottom: 28, left: 44 }
    const stack = d3.stack<Record<string, string | number>>().keys(keys)(rows)
    const x = d3.scaleBand().domain(rows.map((d) => String(d.mes))).range([margin.left, width - margin.right]).padding(0.25)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(stack, (serie) => d3.max(serie, (d) => d[1])) ?? 1])
      .nice()
      .range([height - margin.bottom, margin.top])

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4))
    svg
      .append("g")
      .selectAll("g")
      .data(stack)
      .join("g")
      .attr("fill", (_, index) => colors[index % colors.length])
      .selectAll("rect")
      .data((d) => d)
      .join("rect")
      .attr("x", (d) => x(String(d.data.mes)) ?? 0)
      .attr("y", (d) => y(d[1]))
      .attr("height", (d) => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
  })

  return rows.length ? <svg ref={ref} className="h-[280px] w-full" /> : <EmptyChart />
}

function D3Gauge({ scope }: { scope: ChartScope }) {
  const value = gaugeValue(scope)
  const width = Math.min(100, value)
  return (
    <div className="flex h-[280px] flex-col justify-center gap-5">
      <div className="h-4 bg-cds-layer02">
        <div className="h-4 bg-cds-buttonPrimary" style={{ width: `${width}%` }} />
      </div>
      <div className="text-[54px] font-light leading-none">{value}%</div>
      <p className="text-sm text-cds-textSecondary">Cobertura de stock contra mínimo operativo.</p>
    </div>
  )
}

function D3Heatmap({ scope }: { scope: ChartScope }) {
  const rows = heatmapRows(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 8, right: 24, bottom: 28, left: 142 }
    const xDomain = Array.from(new Set(rows.map((row) => row.x)))
    const yDomain = Array.from(new Set(rows.map((row) => row.y)))
    const x = d3.scaleBand().domain(xDomain).range([margin.left, width - margin.right]).padding(0.08)
    const y = d3.scaleBand().domain(yDomain).range([margin.top, height - margin.bottom]).padding(0.08)
    const color = d3.scaleSequential(d3.interpolateBlues).domain([0, d3.max(rows, (row) => row.value) ?? 1])

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSize(0))
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(0))
    svg
      .append("g")
      .selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", (d) => x(d.x) ?? 0)
      .attr("y", (d) => y(d.y) ?? 0)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", (d) => color(d.value))
  })

  return <svg ref={ref} className="h-[280px] w-full" />
}

function D3Pareto({ scope }: { scope: ChartScope }) {
  const rows = paretoRows(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 12, right: 44, bottom: 64, left: 44 }
    const x = d3.scaleBand().domain(rows.map((row) => row.label)).range([margin.left, width - margin.right]).padding(0.22)
    const yLeft = d3.scaleLinear().domain([0, d3.max(rows, (row) => row.value) ?? 1]).nice().range([height - margin.bottom, margin.top])
    const yRight = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top])
    const line = d3
      .line<(typeof rows)[number]>()
      .x((d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .y((d) => yRight(d.acumulado))

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).selectAll("text").attr("transform", "rotate(-25)").attr("text-anchor", "end")
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(yLeft).ticks(4))
    svg.append("g").attr("transform", `translate(${width - margin.right},0)`).call(d3.axisRight(yRight).ticks(4))
    svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", (d) => x(d.label) ?? 0).attr("y", (d) => yLeft(d.value)).attr("width", x.bandwidth()).attr("height", (d) => yLeft(0) - yLeft(d.value)).attr("fill", "#0f62fe")
    svg.append("path").datum(rows).attr("fill", "none").attr("stroke", "#da1e28").attr("stroke-width", 2).attr("d", line)
  })

  return <svg ref={ref} className="h-[280px] w-full" />
}

function D3Bubble({ scope }: { scope: ChartScope }) {
  const rows = bubbleRows(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 12, right: 24, bottom: 32, left: 58 }
    const x = d3.scaleLinear().domain([0, d3.max(rows, (row) => row.consumo) ?? 1]).nice().range([margin.left, width - margin.right])
    const y = d3.scaleLinear().domain([0, d3.max(rows, (row) => row.valor) ?? 1]).nice().range([height - margin.bottom, margin.top])
    const r = d3.scaleSqrt().domain([0, d3.max(rows, (row) => row.stock) ?? 1]).range([8, 30])

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(4))
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4))
    svg
      .append("g")
      .selectAll("circle")
      .data(rows)
      .join("circle")
      .attr("cx", (d) => x(d.consumo))
      .attr("cy", (d) => y(d.valor))
      .attr("r", (d) => r(d.stock))
      .attr("fill", (d) => (d.riesgo >= 2 ? "#da1e28" : "#24a148"))
      .attr("opacity", 0.78)
    svg.append("g").selectAll("text").data(rows).join("text").attr("x", (d) => x(d.consumo) + 8).attr("y", (d) => y(d.valor) - 8).attr("font-size", 11).attr("fill", "currentColor").text((d) => d.nombre)
  })

  return <svg ref={ref} className="h-[280px] w-full" />
}

function D3Waterfall({ scope }: { scope: ChartScope }) {
  const rows = waterfallRows(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 12, right: 24, bottom: 48, left: 58 }
    const x = d3.scaleBand().domain(rows.map((row) => row.label)).range([margin.left, width - margin.right]).padding(0.25)
    const y = d3.scaleLinear().domain([0, d3.max(rows, (row) => Math.max(row.start, row.end)) ?? 1]).nice().range([height - margin.bottom, margin.top])

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4))
    svg
      .append("g")
      .selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", (d) => x(d.label) ?? 0)
      .attr("y", (d) => y(Math.max(d.start, d.end)))
      .attr("width", x.bandwidth())
      .attr("height", (d) => Math.abs(y(d.start) - y(d.end)))
      .attr("fill", (d) => (d.kind === "negative" ? "#da1e28" : d.kind === "positive" ? "#24a148" : "#0f62fe"))
    svg
      .append("g")
      .selectAll("line")
      .data(rows.slice(0, -1))
      .join("line")
      .attr("x1", (d) => (x(d.label) ?? 0) + x.bandwidth())
      .attr("x2", (_, index) => x(rows[index + 1].label) ?? 0)
      .attr("y1", (d) => y(d.end))
      .attr("y2", (d) => y(d.end))
      .attr("stroke", "currentColor")
      .attr("stroke-dasharray", "3 3")
      .attr("opacity", 0.45)
    svg
      .append("g")
      .selectAll("text")
      .data(rows)
      .join("text")
      .attr("x", (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(Math.max(d.start, d.end)) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "currentColor")
      .text((d) => `${d.displayValue ?? d.value}`)
  })

  return <svg ref={ref} className="h-[280px] w-full" />
}

function D3Forecast({ scope }: { scope: ChartScope }) {
  const rows = forecastRows(scope)
  const ref = useD3((svg) => {
    const width = 680
    const height = 280
    const margin = { top: 12, right: 24, bottom: 28, left: 58 }
    const x = d3.scalePoint().domain(rows.map((row) => row.mes)).range([margin.left, width - margin.right])
    const y = d3.scaleLinear().domain([0, d3.max(rows, (row) => Math.max(row.real ?? 0, row.forecast ?? 0)) ?? 1]).nice().range([height - margin.bottom, margin.top])
    const line = d3
      .line<(typeof rows)[number]>()
      .defined((d) => d.real !== null)
      .x((d) => x(d.mes) ?? margin.left)
      .y((d) => y(d.real ?? 0))
    const forecastLine = d3
      .line<(typeof rows)[number]>()
      .defined((d) => d.forecast !== null)
      .x((d) => x(d.mes) ?? margin.left)
      .y((d) => y(d.forecast ?? 0))

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4))
    svg.append("path").datum(rows).attr("fill", "none").attr("stroke", "#0f62fe").attr("stroke-width", 2).attr("d", line)
    svg.append("path").datum(rows).attr("fill", "none").attr("stroke", "#da1e28").attr("stroke-width", 2).attr("stroke-dasharray", "6 4").attr("d", forecastLine)
  })

  return <svg ref={ref} className="h-[280px] w-full" />
}

export function D3Graphs({ scope, onScopeChange }: { scope: ChartScope; onScopeChange: (scope: ChartScope) => void }) {
  const memoizedScope = useMemo(() => scope, [scope])

  return (
    <GraphShell library="D3.js" scope={scope} onScopeChange={onScopeChange}>
      <ChartCard title="Treemap">{<D3Treemap scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Bar chart horizontal rankeado">{<D3RankedBar scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Line chart multi-serie">{<D3Lines />}</ChartCard>
      <ChartCard title="Stacked bar mensual">{<D3Stacked scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Gauge / progress custom">{<D3Gauge scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Heatmap reactivo x mes">{<D3Heatmap scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Pareto consumo">{<D3Pareto scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Scatter bubble criticidad">{<D3Bubble scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Waterfall stock">{<D3Waterfall scope={memoizedScope} />}</ChartCard>
      <ChartCard title="Forecast agotamiento">{<D3Forecast scope={memoizedScope} />}</ChartCard>
    </GraphShell>
  )
}
