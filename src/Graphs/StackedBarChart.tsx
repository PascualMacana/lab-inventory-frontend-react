import Chart from "react-apexcharts"
import type { ApexOptions } from "apexcharts"

import { useTheme } from "../lib/theme"

export type StackedSeries = { name: string; data: number[]; color: string }

// ApexCharts paints bars/labels as SVG attributes that don't resolve CSS vars, so
// callers can pass tokens ("var(--cds-support-success)" or "--lab-warm") and we
// resolve them to concrete hex here. Re-runs on theme change (component consumes
// useTheme) so light/dark both stay correct.
function resolveCssColor(value: string): string {
  if (!value.startsWith("var(") && !value.startsWith("--")) {
    return value
  }
  if (typeof window === "undefined") {
    return value
  }
  const name = value.startsWith("var(") ? value.slice(4, -1).trim() : value
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return resolved || value
}

// Generic stacked column chart. Categorias on the x-axis, one stacked series per
// entry. Colors are passed per series so callers keep semantic control.
export function StackedBarChart({
  categorias,
  series,
  height = 300,
  totalLabels = false,
  exportFilename,
}: {
  categorias: string[]
  series: StackedSeries[]
  height?: number
  totalLabels?: boolean
  exportFilename?: string
}) {
  const { theme } = useTheme()

  const seriesColors = series.map((serie) => resolveCssColor(serie.color))
  const textPrimary = resolveCssColor("--cds-text-primary") || "#1f2933"
  const textSecondary = resolveCssColor("--cds-text-secondary") || "#5b6770"
  const gridColor = resolveCssColor("--cds-border-subtle") || "#d8dee3"

  const options: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif",
      foreColor: textSecondary,
      background: "transparent",
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
        export: exportFilename
          ? {
              png: { filename: exportFilename },
              svg: { filename: exportFilename },
              csv: { filename: exportFilename, columnDelimiter: ",", headerCategory: "Mes" },
            }
          : undefined,
      },
      animations: { enabled: true, speed: 450 },
    },
    colors: seriesColors,
    dataLabels: { enabled: false },
    grid: { borderColor: gridColor, strokeDashArray: 4, padding: { left: 6, right: 6, top: 0 } },
    legend: {
      position: "top",
      horizontalAlign: "left",
      offsetX: -8,
      labels: { colors: textSecondary },
      markers: { size: 6 },
      itemMargin: { horizontal: 9, vertical: 4 },
    },
    plotOptions: {
      bar: {
        columnWidth: "44%",
        borderRadius: 3,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
        dataLabels: totalLabels
          ? {
              total: {
                enabled: true,
                style: { color: textPrimary, fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: "12px" },
              },
            }
          : undefined,
      },
    },
    stroke: { width: 0 },
    states: { hover: { filter: { type: "lighten" } } },
    tooltip: { shared: true, intersect: false, theme: theme === "dark" ? "dark" : "light" },
    xaxis: {
      categories: categorias,
      labels: { style: { colors: textSecondary, fontFamily: "IBM Plex Mono", fontSize: "12px" } },
      axisBorder: { color: gridColor },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: textSecondary, fontFamily: "IBM Plex Mono", fontSize: "11px" } } },
  }

  return <Chart type="bar" height={height} series={series.map((serie) => ({ name: serie.name, data: serie.data }))} options={options} />
}
