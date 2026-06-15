import createPlotlyComponent from "react-plotly.js/factory"
import Plotly from "plotly.js-dist-min"

const Plot = createPlotlyComponent(Plotly)
const config = { displayModeBar: false, responsive: true }

// Semaphore zones: below 100% = under minimum (crit), 100-130% tight (warn),
// above = comfortable (sage). Light tints so the bar and the threshold read on top.
export function PlotlyGauge({
  value,
  // numberSize fijo para cajas chicas (ficha del reactivo); sin él, Plotly
  // auto-escala (lo que se ve bien en la caja grande de Analítica).
  numberSize,
  numberWeight = 600,
}: {
  value: number
  numberSize?: number
  numberWeight?: number
}) {
  // In the tight reagent-detail card the axis (speedometer) tick labels clip at
  // the ends. Compact mode — driven by a fixed numberSize — shrinks them, thins
  // them out and widens the side margins so they fit.
  const compact = numberSize != null
  return (
    <Plot
      className="h-[280px] w-full"
      config={config}
      data={[
        {
          type: "indicator",
          mode: "gauge+number",
          value,
          // The "%" suffix makes the centered string read slightly left (digits
          // weighted left of the percent sign), so in the compact card we drop it
          // — the speedometer axis ticks already carry the "%".
          number: { suffix: compact ? "" : "%", font: numberSize ? { size: numberSize, weight: numberWeight } : { weight: numberWeight } },
          gauge: {
            axis: { range: [0, 160], ticksuffix: "%", ...(compact ? { tickfont: { size: 10 }, dtick: 40 } : {}) },
            bar: { color: "#0f62fe" },
            steps: [
              { range: [0, 100], color: "#fde0e2" },
              { range: [100, 130], color: "#ffe8d5" },
              { range: [130, 160], color: "#d6f5e0" },
            ],
            threshold: { line: { color: "#da1e28", width: 3 }, thickness: 0.85, value: 100 },
          },
        },
      ]}
      layout={{
        autosize: true,
        height: 280,
        margin: { l: compact ? 36 : 24, r: compact ? 36 : 24, t: 16, b: 8 },
        paper_bgcolor: "rgba(0,0,0,0)",
        font: { family: "IBM Plex Sans, sans-serif", color: "var(--cds-text-primary)" },
      }}
    />
  )
}
