import Chart from "react-apexcharts"
import type { ApexOptions } from "apexcharts"

import { cn } from "../../lib/utils"
import { INSIGHT_QUOTES, INSIGHT_STATS, SURVEY } from "../data"
import { ViewHeader } from "../components"

// Paleta de los charts, igual a la del export standalone (Chart.js → ApexCharts).
const C = { blue: "#2f6f88", blue2: "#5a96ad", green: "#7aa874", red: "#c25450", yel: "#c99a2e", teal: "#3a7d8a" }

const TONO_STAT: Record<string, string> = {
  red: "text-cds-supportError",
  green: "text-cds-supportSuccess",
  blue: "text-cds-buttonPrimary",
}

// Opciones base compartidas (theme-aware vía CSS vars, como el módulo de gráficos).
function base(options: ApexOptions = {}): ApexOptions {
  return {
    chart: {
      fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif",
      foreColor: "var(--cds-text-secondary)",
      background: "transparent",
      toolbar: { show: false },
      ...options.chart,
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "var(--cds-border-subtle)" },
    tooltip: { theme: "light" },
    ...options,
  }
}

// Severidad: cuenta cuántos labs marcaron cada nivel 1–5.
function sevCounts() {
  const c = [0, 0, 0, 0, 0]
  SURVEY.severity.forEach((v) => (c[v - 1] += 1))
  return c
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-cds-borderSubtle bg-cds-background p-4">
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <div className="h-[240px]">{children}</div>
    </div>
  )
}

export function InsightsView() {
  const labTypes = SURVEY.labTypes
  const features = SURVEY.features
  const mgmt = SURVEY.mgmt

  return (
    <section>
      <ViewHeader eyebrow="Evidencia · n=11 respuestas" title="Insights de la encuesta">
        Lo que dijeron 11 laboratorios reales. Esto es lo que sustenta el pitch: el dolor es la <b>falta de dueño</b> y de
        trazabilidad, no la falta de planilla.
      </ViewHeader>

      <div className="mb-6 grid grid-cols-2 gap-px border border-cds-borderSubtle bg-cds-borderSubtle md:grid-cols-5">
        {INSIGHT_STATS.map((s) => (
          <div key={s.cap} className="bg-cds-background p-4">
            <div className={cn("font-mono text-[30px] font-medium", TONO_STAT[s.tono])}>{s.big}</div>
            <div className="mt-1 text-xs leading-snug text-cds-textSecondary" dangerouslySetInnerHTML={{ __html: s.cap }} />
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartBox title="Tipo de laboratorio">
          <Chart
            type="donut"
            height={240}
            series={Object.values(labTypes)}
            options={base({
              labels: Object.keys(labTypes),
              colors: [C.blue, C.blue2, C.green, C.yel],
              legend: { position: "right", labels: { colors: "var(--cds-text-secondary)" } },
            })}
          />
        </ChartBox>

        <ChartBox title="Severidad del problema (1–5)">
          <Chart
            type="bar"
            height={240}
            series={[{ name: "labs", data: sevCounts() }]}
            options={base({
              colors: [C.green, C.green, C.yel, C.red, C.red],
              plotOptions: { bar: { distributed: true, columnWidth: "55%" } },
              legend: { show: false },
              xaxis: { categories: ["1", "2", "3", "4", "5"] },
              yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
            })}
          />
        </ChartBox>

        <ChartBox title="Funcionalidad más pedida">
          <Chart
            type="bar"
            height={240}
            series={[{ name: "menciones", data: Object.values(features) }]}
            options={base({
              colors: [C.blue],
              plotOptions: { bar: { horizontal: true, barHeight: "65%" } },
              xaxis: { categories: Object.keys(features) },
            })}
          />
        </ChartBox>

        <ChartBox title="Cómo gestionan hoy">
          <Chart
            type="bar"
            height={240}
            series={[{ name: "labs", data: Object.values(mgmt) }]}
            options={base({
              colors: [C.teal],
              plotOptions: { bar: { horizontal: true, barHeight: "65%" } },
              xaxis: { categories: Object.keys(mgmt) },
            })}
          />
        </ChartBox>
      </div>

      {INSIGHT_QUOTES.map((q) => (
        <div
          key={q}
          className="my-1.5 border-l-[3px] border-cds-buttonPrimary bg-cds-buttonPrimary/10 px-4 py-3 text-[13px]"
        >
          {q}
        </div>
      ))}
    </section>
  )
}
