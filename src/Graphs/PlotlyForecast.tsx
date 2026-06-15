import createPlotlyComponent from "react-plotly.js/factory"
import Plotly from "plotly.js-dist-min"

const Plot = createPlotlyComponent(Plotly)
const plotConfig = { displayModeBar: false, responsive: true }

// Línea de agotamiento de un reactivo: stock proyectado cayendo al ritmo de
// consumo, con el mínimo como referencia. El eje lleva la unidad del reactivo.
export function PlotlyForecast({
  dias,
  stock,
  minimo,
  unidad,
}: {
  dias: number[]
  stock: number[]
  minimo: number
  unidad: string
}) {
  const maxDia = dias[dias.length - 1] ?? 0
  return (
    <Plot
      className="h-[280px] w-full"
      config={plotConfig}
      data={[
        {
          type: "scatter",
          mode: "lines",
          name: "Stock proyectado",
          x: dias,
          y: stock,
          line: { color: "#0f62fe", width: 2 },
        },
        {
          type: "scatter",
          mode: "lines",
          name: "Mínimo",
          x: [0, maxDia],
          y: [minimo, minimo],
          line: { color: "#ff832b", width: 1, dash: "dash" },
        },
      ]}
      layout={{
        autosize: true,
        height: 280,
        margin: { l: 64, r: 24, t: 8, b: 42 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "IBM Plex Sans, sans-serif", color: "var(--cds-text-primary)" },
        legend: { orientation: "h" },
        xaxis: { title: { text: "Días" }, gridcolor: "var(--cds-border-subtle)" },
        yaxis: { title: { text: unidad ? `Stock (${unidad})` : "Stock" }, gridcolor: "var(--cds-border-subtle)" },
      }}
    />
  )
}
