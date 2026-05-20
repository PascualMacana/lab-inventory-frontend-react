import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Boxes, FlaskConical, PackageCheck, TimerReset, WalletCards } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { api } from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"

const chartColors = {
  info: "#2f6f88",
  success: "#7aa874",
  warning: "#c99a2e",
  danger: "#b85252",
  neutral: "#7b8790",
}

function formatValue(value: unknown) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)
  }
  if (value === null || value === undefined) {
    return "0"
  }
  return String(value)
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function shortLabel(value: unknown, fallback = "Registro") {
  const text = String(value ?? fallback)
  return text.length > 22 ? `${text.slice(0, 20)}...` : text
}

export function DashboardPage() {
  const { token, usuario } = useAuth()
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(token!),
    enabled: Boolean(token),
  })

  const data = dashboardQuery.data ?? {}
  const contadores = data.contadores ?? {}
  const stockBajo = data.stock_bajo ?? []
  const vencidos = data.vencidos ?? []
  const porVencer7 = data.por_vencer_7_dias ?? []
  const porVencer30 = data.por_vencer_30_dias ?? []
  const puedeVerValor = puede(usuario, "ver_valor_inventario")

  const metrics = [
    {
      label: "Reactivos",
      value: contadores.total_reactivos,
      icon: FlaskConical,
      color: chartColors.info,
    },
    {
      label: "Lotes activos",
      value: contadores.lotes_activos,
      icon: Boxes,
      color: chartColors.success,
    },
    {
      label: "Stock bajo",
      value: contadores.alertas_stock_bajo,
      icon: AlertTriangle,
      color: chartColors.warning,
    },
    {
      label: "Vencidos",
      value: contadores.alertas_vencidos,
      icon: TimerReset,
      color: chartColors.danger,
    },
    {
      label: "Por vencer",
      value: contadores.alertas_por_vencer_30d,
      icon: PackageCheck,
      color: chartColors.neutral,
    },
  ]

  const alertDistribution = useMemo(
    () => [
      { name: "Stock bajo", value: numberFrom(contadores.alertas_stock_bajo), color: chartColors.warning },
      { name: "Vencidos", value: numberFrom(contadores.alertas_vencidos), color: chartColors.danger },
      { name: "7 dias", value: numberFrom(contadores.alertas_por_vencer_7d), color: chartColors.info },
      { name: "30 dias", value: numberFrom(contadores.alertas_por_vencer_30d), color: chartColors.success },
    ],
    [contadores.alertas_por_vencer_30d, contadores.alertas_por_vencer_7d, contadores.alertas_stock_bajo, contadores.alertas_vencidos],
  )

  const stockDeficit = useMemo(
    () =>
      stockBajo
        .map((row) => ({
          name: shortLabel(row.nombre ?? row.reactivo_nombre),
          faltante: Math.max(0, numberFrom(row.faltante)),
          stock: Math.max(0, numberFrom(row.stock_total)),
        }))
        .sort((a, b) => b.faltante - a.faltante)
        .slice(0, 6),
    [stockBajo],
  )

  const expirationBuckets = useMemo(() => {
    const critical = porVencer7.length
    const soon = Math.max(0, porVencer30.length - critical)
    return [
      { name: "Vencidos", value: vencidos.length, color: chartColors.danger },
      { name: "0-7 dias", value: critical, color: chartColors.warning },
      { name: "8-30 dias", value: soon, color: chartColors.info },
    ]
  }, [porVencer7.length, porVencer30.length, vencidos.length])

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 font-mono text-xs tracking-[0.32px] text-cds-linkPrimary">// DASHBOARD LIVE</div>
          <h1>Inventario operativo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-[1.45] tracking-[0.16px] text-cds-textSecondary">
            KPIs, vencimientos y alertas accionables del laboratorio.
          </p>
        </div>
        {puedeVerValor ? (
          <article className="min-w-[260px] border border-cds-borderSubtle bg-cds-layer01 p-4">
            <div className="flex items-center justify-between text-xs tracking-[0.32px] text-cds-textSecondary">
              Valor inventario
              <WalletCards size={18} aria-hidden="true" />
            </div>
            <div className="mt-3 text-[32px] font-light leading-[1.25]">
              {dashboardQuery.isLoading ? "..." : `$ ${formatValue(contadores.valor_inventario)}`}
            </div>
          </article>
        ) : null}
      </div>

      {dashboardQuery.isError ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          No se pudo cargar el dashboard.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <article key={metric.label} className="border border-cds-borderSubtle bg-cds-layer01 p-4">
              <div className="mb-6 flex items-center justify-between text-cds-textSecondary">
                <span className="text-xs tracking-[0.32px]">{metric.label}</span>
                <Icon size={20} aria-hidden="true" style={{ color: metric.color }} />
              </div>
              <div className="text-[42px] font-light leading-[1.19]">
                {dashboardQuery.isLoading ? "..." : formatValue(metric.value)}
              </div>
              <div className="mt-4 h-1 bg-cds-layer02">
                <div className="h-1" style={{ width: "62%", backgroundColor: metric.color }} />
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartPanel title="Alertas por tipo" subtitle="Distribución actual del tablero">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={alertDistribution} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="var(--cds-border-subtle)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--cds-text-secondary)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--cds-text-secondary)" }} />
              <Tooltip cursor={{ fill: "var(--cds-layer-hover-01)" }} />
              <Bar dataKey="value" radius={0}>
                {alertDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Vencimientos" subtitle="Stock con fecha crítica">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={expirationBuckets} layout="vertical" margin={{ top: 8, right: 24, left: 12, bottom: 0 }}>
              <CartesianGrid stroke="var(--cds-border-subtle)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--cds-text-secondary)" }} />
              <YAxis dataKey="name" type="category" width={82} tick={{ fontSize: 12, fill: "var(--cds-text-secondary)" }} />
              <Tooltip cursor={{ fill: "var(--cds-layer-hover-01)" }} />
              <Bar dataKey="value" radius={0}>
                {expirationBuckets.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <ChartPanel title="Reposición prioritaria" subtitle="Mayor faltante contra mínimo">
          {stockDeficit.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockDeficit} layout="vertical" margin={{ top: 8, right: 24, left: 52, bottom: 0 }}>
                <CartesianGrid stroke="var(--cds-border-subtle)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "var(--cds-text-secondary)" }} />
                <YAxis dataKey="name" type="category" width={118} tick={{ fontSize: 12, fill: "var(--cds-text-secondary)" }} />
                <Tooltip cursor={{ fill: "var(--cds-layer-hover-01)" }} />
                <Bar dataKey="faltante" fill={chartColors.warning} radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="Sin reactivos bajo mínimo." />
          )}
        </ChartPanel>

        <AlertList title="Stock bajo" rows={stockBajo} empty="Sin reactivos bajo mínimo." />
        <AlertList title="Vencen en 7 días" rows={porVencer7} empty="Sin vencimientos críticos." />
      </div>
    </section>
  )
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="border border-cds-borderSubtle bg-cds-layer01 p-4">
      <div className="mb-4">
        <h2 className="text-[20px] leading-[1.4]">{title}</h2>
        <p className="mt-1 text-xs tracking-[0.32px] text-cds-textSecondary">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center border border-dashed border-cds-borderSubtle text-sm text-cds-textSecondary">
      {text}
    </div>
  )
}

function AlertList({ title, rows, empty }: { title: string; rows: Array<Record<string, unknown>>; empty: string }) {
  return (
    <section className="border border-cds-borderSubtle bg-cds-layer01 p-4">
      <h2 className="text-[20px] leading-[1.4]">{title}</h2>
      {!rows.length ? (
        <p className="mt-4 text-sm text-cds-textSecondary">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.slice(0, 5).map((row, index) => (
            <article key={index} className="border border-cds-borderSubtle bg-cds-background p-3 text-sm">
              <div className="font-semibold">{String(row.nombre ?? row.reactivo ?? row.reactivo_nombre ?? "Registro")}</div>
              <div className="mt-1 text-xs tracking-[0.32px] text-cds-textSecondary">
                {String(row.codigo_interno ?? row.ubicacion ?? row.fecha_vencimiento ?? "")}
              </div>
              {row.stock_total !== undefined || row.stock_minimo !== undefined ? (
                <div className="mt-2 font-mono text-xs text-cds-textSecondary">
                  Stock {formatValue(row.stock_total)} / mínimo {formatValue(row.stock_minimo)} {String(row.unidad ?? "")}
                </div>
              ) : null}
              {row.dias_restantes !== undefined ? (
                <div className="mt-2 font-mono text-xs text-cds-textSecondary">
                  Vence en {formatValue(row.dias_restantes)} días
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
