import { useMemo } from "react"
import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, FileSignature, SlidersHorizontal } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { api, type DashboardSeriePunto } from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

/* ─────────────────────────────────────────────────────────
   LabInventory · Dashboard (v2 visual style)
   Same data deps as v1 — only the visual layer changed.
   ───────────────────────────────────────────────────────── */

const palette = {
  blue: "var(--lab-blue)",
  warm: "var(--lab-warm)",
  warmFg: "var(--lab-warm-fg)",
  crit: "var(--cds-support-error)",
  sage: "var(--cds-support-success)",
  text: "var(--cds-text-primary)",
  text2: "var(--cds-text-secondary)",
}

const emptyRows: Array<Record<string, unknown>> = []
const emptySeries: DashboardSeriePunto[] = []

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

/* ─── Sparkline: SVG-only, no external dep ──────────────── */
/* Monotone cubic interpolation (Fritsch-Carlson) — smooth and rounded
   without overshoot or wavy artefacts on flat segments. */
function monotonePath(coords: { x: number; y: number }[]) {
  const n = coords.length
  if (n === 0) return ""
  if (n === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`

  const slopes = new Array(n - 1)
  for (let i = 0; i < n - 1; i++) {
    const dx = coords[i + 1].x - coords[i].x
    slopes[i] = dx === 0 ? 0 : (coords[i + 1].y - coords[i].y) / dx
  }

  const tangents = new Array(n)
  tangents[0] = slopes[0]
  tangents[n - 1] = slopes[n - 2]
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2
  }

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0
      tangents[i + 1] = 0
    } else {
      const a = tangents[i] / slopes[i]
      const b = tangents[i + 1] / slopes[i]
      const s = a * a + b * b
      if (s > 9) {
        const scale = 3 / Math.sqrt(s)
        tangents[i] = scale * a * slopes[i]
        tangents[i + 1] = scale * b * slopes[i]
      }
    }
  }

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const h = coords[i + 1].x - coords[i].x
    const cp1x = coords[i].x + h / 3
    const cp1y = coords[i].y + (tangents[i] * h) / 3
    const cp2x = coords[i + 1].x - h / 3
    const cp2y = coords[i + 1].y - (tangents[i + 1] * h) / 3
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${coords[i + 1].x.toFixed(1)} ${coords[i + 1].y.toFixed(1)}`
  }
  return d
}

function smoothSeries(values: number[]): number[] {
  if (values.length < 3) return values
  const out = new Array(values.length)
  out[0] = values[0]
  out[values.length - 1] = values[values.length - 1]
  for (let i = 1; i < values.length - 1; i++) {
    out[i] = values[i - 1] * 0.15 + values[i] * 0.7 + values[i + 1] * 0.15
  }
  return out
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (!points.length) return null
  const smoothed = smoothSeries(points)
  const max = Math.max(...smoothed)
  const min = Math.min(...smoothed)
  const range = max - min || 1
  const w = 120
  const h = 36
  const verticalPadding = 6
  const usableHeight = h - verticalPadding * 2
  const stepX = smoothed.length > 1 ? w / (smoothed.length - 1) : 0
  const baseline = h - verticalPadding
  const coords = smoothed.map((v, i) => ({
    x: i * stepX,
    y: h - verticalPadding - ((v - min) / range) * usableHeight,
  }))
  const stroke =
    coords.length === 1
      ? `M 0 ${coords[0].y.toFixed(1)} L ${w} ${coords[0].y.toFixed(1)}`
      : monotonePath(coords)
  const area = `${stroke} L ${w.toFixed(1)} ${baseline.toFixed(1)} L 0 ${baseline.toFixed(1)} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 block h-9 w-full" style={{ color }}>
      <path d={`M 0 ${baseline} L ${w} ${baseline}`} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
      <path d={area} fill="currentColor" fillOpacity="0.08" stroke="none" />
      <path d={stroke} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function serieNumerica(
  puntos: DashboardSeriePunto[],
  key: keyof Omit<DashboardSeriePunto, "fecha">,
  fallback: unknown,
) {
  const valores = puntos.map((punto) => numberFrom(punto[key]))
  return valores.length ? valores : [numberFrom(fallback)]
}

function deltaSerie(points: number[]) {
  if (points.length < 2) {
    return null
  }
  const delta = points[points.length - 1] - points[0]
  return Math.abs(delta) > 0.0001 ? delta : 0
}

function tipoMovimiento(value: unknown) {
  return value === "entrada" || value === "salida" || value === "ajuste" ? value : null
}

function tipoBadgeClasses(tipo: "entrada" | "salida" | "ajuste" | null) {
  if (tipo === "entrada") {
    return "bg-lab-sageBg text-cds-supportSuccess ring-1 ring-cds-supportSuccess/40"
  }
  if (tipo === "salida") {
    return "bg-lab-critTint text-cds-supportError ring-1 ring-cds-supportError/40"
  }
  return "bg-lab-warmTint text-lab-warmFg ring-1 ring-lab-warm/40"
}

function TipoIcon({ tipo }: { tipo: "entrada" | "salida" | "ajuste" | null }) {
  if (tipo === "entrada") {
    return <ArrowUpCircle size={14} aria-hidden="true" />
  }
  if (tipo === "salida") {
    return <ArrowDownCircle size={14} aria-hidden="true" />
  }
  return <SlidersHorizontal size={14} aria-hidden="true" />
}

function KpiTile({
  to,
  className,
  children,
}: {
  to?: string
  className: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  const classes = cn(
    className,
    to && "block transition-colors hover:bg-[var(--cds-layer-hover-01)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
  )

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={to === "/lotes" ? t("dashboard.abrirLotes") : t("dashboard.abrirReactivos")}>
        {children}
      </Link>
    )
  }

  return <article className={classes}>{children}</article>
}

export function DashboardPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(token!),
    enabled: Boolean(token),
  })
  const dashboardSeriesQuery = useQuery({
    queryKey: ["dashboard-series", 30],
    queryFn: () => api.dashboardSeries(token!, 30),
    enabled: Boolean(token),
  })

  const data = dashboardQuery.data ?? {}
  const series = dashboardSeriesQuery.data?.puntos ?? emptySeries
  const contadores = data.contadores ?? {}
  const stockBajo = data.stock_bajo ?? emptyRows
  const vencidos = data.vencidos ?? emptyRows
  const porVencer30 = data.por_vencer_30_dias ?? emptyRows
  const movimientosRaw = data.ultimos_movimientos ?? data.movimientos_recientes
  const movimientos = Array.isArray(movimientosRaw) ? movimientosRaw : emptyRows
  const puedeVerValor = puede(usuario, "ver_valor_inventario")
  const loading = dashboardQuery.isLoading

  const proximosAVencer = contadores.alertas_por_vencer_30d ?? porVencer30.length
  const kpis = useMemo(
    () =>
      [
        {
          id: "reactivos",
          label: t("dashboard.kpiReactivos"),
          to: "/reactivos",
          value: contadores.total_reactivos,
          spark: serieNumerica(series, "total_reactivos", contadores.total_reactivos),
          sparkColor: palette.blue,
          status: t("dashboard.statusTotal"),
        },
        {
          id: "lotes",
          label: t("dashboard.kpiLotes"),
          to: "/lotes",
          value: contadores.lotes_activos,
          spark: serieNumerica(series, "lotes_activos", contadores.lotes_activos),
          sparkColor: palette.blue,
          status: t("dashboard.statusFrascos"),
        },
        {
          id: "stockBajo",
          label: t("dashboard.kpiStockBajo"),
          value: contadores.alertas_stock_bajo,
          tone: "crit" as const,
          spark: serieNumerica(series, "stock_bajo", contadores.alertas_stock_bajo),
          sparkColor: palette.crit,
          status: t("dashboard.statusBajoMin"),
        },
        {
          id: "porVencer",
          label: t("dashboard.kpiPorVencer"),
          value: proximosAVencer,
          tone: "alert" as const,
          spark: serieNumerica(series, "por_vencer_30d", proximosAVencer),
          sparkColor: palette.warm,
          status: numberFrom(proximosAVencer) === 0 ? t("dashboard.statusSinVenc") : t("dashboard.statusVencen"),
        },
      ].map((kpi) => ({ ...kpi, delta: deltaSerie(kpi.spark) })),
    [contadores.alertas_stock_bajo, contadores.lotes_activos, contadores.total_reactivos, proximosAVencer, series, t],
  )

  const recentMovs = useMemo(() => movimientos.slice(0, 6), [movimientos])
  const dashboardAlerts = useMemo(() => {
    const out: Array<{ level: "crit" | "warn"; badge: string; message: string; when: string }> = []
    stockBajo.forEach((row) => {
      out.push({
        level: "crit",
        badge: t("dashboard.badgeStock"),
        message: t("dashboard.alertStock", {
          nombre: row.nombre ?? row.reactivo_nombre ?? t("dashboard.reactivoFallback"),
          stock: formatValue(row.stock_total),
          min: formatValue(row.stock_minimo),
          unidad: row.unidad ?? "",
        }),
        when: t("dashboard.alertFaltan", { faltante: formatValue(row.faltante) }),
      })
    })
    vencidos.forEach((row) => {
      out.push({
        level: "crit",
        badge: t("dashboard.badgeVenc"),
        message: t("dashboard.alertVencido", {
          nombre: row.reactivo_nombre ?? row.nombre ?? t("dashboard.reactivoFallback"),
          dias: formatValue(row.dias_vencido),
        }),
        when: String(row.fecha_vencimiento ?? t("dashboard.vencido")),
      })
    })
    porVencer30.forEach((row) => {
      out.push({
        level: "warn",
        badge: t("dashboard.badgeExp"),
        message: t("dashboard.alertVence", {
          nombre: row.reactivo_nombre ?? row.nombre ?? t("dashboard.reactivoFallback"),
          dias: formatValue(row.dias_restantes),
        }),
        when: t("dashboard.diasCorto", { dias: formatValue(row.dias_restantes) }),
      })
    })
    return out
  }, [porVencer30, stockBajo, vencidos, t])

  const today = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date())

  return (
    <section>
      {/* Section head — landing style */}
      <header className="mb-6 grid gap-4 md:grid-cols-[5fr_6fr] md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.32px] text-cds-textSecondary">
            <span className="h-px w-6 bg-cds-textSecondary opacity-60" />
            <span className="text-cds-buttonPrimary">01</span>
            <span>—</span>
            <span>{t("dashboard.section")}</span>
          </div>
          <h1 className="text-[44px] font-light leading-[1.05] tracking-[-0.015em] md:text-[56px]">
            {t("dashboard.heroLine1")}<br />
            <span className="lab-em">{t("dashboard.heroLine2")}</span>
          </h1>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          {puedeVerValor ? (
            <article className="min-w-[260px] border border-cds-borderSubtle bg-cds-background p-4">
              <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.32px] text-cds-textSecondary">
                {t("dashboard.valorInventario")}
                <FileSignature size={16} aria-hidden="true" />
              </div>
              <div className="mt-3 font-mono text-[32px] font-normal leading-none">
                {loading ? "…" : `$ ${formatValue(contadores.valor_inventario)}`}
              </div>
            </article>
          ) : null}
          <p className="max-w-md text-sm leading-[1.55] text-cds-textSecondary md:text-right">
            {t("dashboard.heroDesc")}
          </p>
        </div>
      </header>

      {dashboardQuery.isError ? (
        <div className="mb-6 border-l-2 border-cds-supportError bg-lab-critTint px-4 py-3 text-sm">
          {t("dashboard.loadError")}
        </div>
      ) : null}

      {/* Dashboard frame — mirrors landing layout */}
      <div className="grid gap-2 border border-cds-borderSubtle bg-cds-layer01 p-4">
        {/* head */}
        <div className="flex items-center justify-between border-b border-cds-layer02 pb-3">
          <div className="font-mono text-xs uppercase tracking-[0.32px] text-cds-textSecondary">
            {t("dashboard.crumbInventario")} / <span className="font-medium text-cds-textPrimary">{t("dashboard.section")}</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.32px] text-cds-textSecondary">
            <span>{t("dashboard.hoy")} · {today}</span>
            <span className="border border-cds-layer02 bg-cds-background px-2 py-1">{t("dashboard.sectorTodos")}</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-px bg-cds-layer02 xl:grid-cols-4">
          {kpis.map((k) => (
            <KpiTile
              key={k.id}
              to={k.to}
              className={
                k.tone === "alert"
                  ? "bg-lab-warmTint p-4"
                  : k.tone === "crit"
                  ? "bg-lab-critTint p-4"
                  : "bg-cds-background p-4"
              }
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.32px] text-cds-textSecondary">{k.label}</div>
              <div className="mt-2 flex items-baseline gap-2 font-mono leading-none">
                <span
                  className="text-[40px]"
                  style={{
                    color: k.tone === "alert" ? palette.warmFg : k.tone === "crit" ? palette.crit : palette.text,
                  }}
                >
                  {loading ? "…" : formatValue(k.value)}
                </span>
                {!loading && k.delta !== null ? (
                  <span
                    className="text-xs"
                    style={{
                      color: k.delta > 0 ? palette.sage : k.delta < 0 ? palette.crit : palette.text2,
                    }}
                  >
                    {k.delta > 0 ? "+" : ""}
                    {formatValue(k.delta)}
                  </span>
                ) : null}
              </div>
              <Sparkline points={k.spark} color={k.sparkColor} />
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.32px] text-cds-textSecondary">{k.status}</div>
            </KpiTile>
          ))}
        </div>

        {/* panels */}
        <div className="grid gap-px bg-cds-layer02 xl:grid-cols-[1.4fr_1fr]">
          {/* Movements */}
          <section className="flex min-h-[260px] flex-col bg-cds-background p-4">
            <header className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.32px] text-cds-textSecondary">
              {t("dashboard.ultimosMovimientos")}
              <a href="/movimientos" className="text-cds-linkPrimary hover:underline" style={{ textTransform: "none", letterSpacing: "0.16px" }}>
                {t("dashboard.verHistorial")}
              </a>
            </header>
            {recentMovs.length ? (
              <table className="w-full border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-cds-layer01 text-[10px] uppercase tracking-[0.32px] text-cds-textSecondary">
                    <th className="py-2 text-left font-normal">{t("dashboard.thFecha")}</th>
                    <th className="py-2 text-left font-normal">{t("dashboard.thTipo")}</th>
                    <th className="py-2 text-left font-normal">{t("dashboard.thLote")}</th>
                    <th className="py-2 text-left font-normal">{t("dashboard.thCant")}</th>
                    <th className="py-2 text-left font-normal">{t("dashboard.thUsuario")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovs.map((m: Record<string, unknown>, i: number) => {
                    const tipo = tipoMovimiento(m.tipo ?? m.movimiento)
                    return (
                      <tr key={i} className="border-b border-cds-layer01 last:border-b-0">
                        <td className="py-2 text-cds-textSecondary">{String(m.fecha ?? m.creado_en ?? "—").slice(0, 16)}</td>
                        <td className="py-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.16px]",
                              tipoBadgeClasses(tipo),
                            )}
                          >
                            <TipoIcon tipo={tipo} />
                            {tipo ? t(`mov.${tipo}`) : "—"}
                          </span>
                        </td>
                        <td className="py-2" style={{ color: palette.blue }}>{String(m.codigo_interno ?? m.lote ?? "—")}</td>
                        <td className="py-2 text-cds-textPrimary">{formatValue(m.cantidad)}</td>
                        <td className="py-2 text-cds-textSecondary">{String(m.usuario_nombre ?? m.usuario ?? m.email ?? "—")}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyChart text={t("dashboard.sinMovimientos")} />
            )}
          </section>

          {/* Alerts */}
          <section className="flex min-h-[260px] flex-col bg-cds-background p-4">
            <header className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.32px] text-cds-textSecondary">
              {t("dashboard.alertas")}
              <a href="/auditoria" className="text-cds-linkPrimary hover:underline" style={{ textTransform: "none", letterSpacing: "0.16px" }}>→</a>
            </header>
            {dashboardAlerts.length ? (
              <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                {dashboardAlerts.map((a, i) => (
                  <article
                    key={i}
                    className={
                      "grid grid-cols-[auto_1fr_auto] items-center gap-3 border-l-2 px-3 py-2 text-xs"
                    }
                    style={{
                      background: a.level === "crit" ? "var(--lab-crit-tint)" : "var(--lab-warm-tint)",
                      borderLeftColor: a.level === "crit" ? palette.crit : palette.warmFg,
                    }}
                  >
                    <span
                      className="font-mono text-[11px] uppercase tracking-[0.32px]"
                      style={{ color: a.level === "crit" ? palette.crit : palette.warmFg }}
                    >
                      <AlertTriangle size={11} className="-mt-0.5 mr-1 inline" />
                      {a.badge}
                    </span>
                    <span className="text-cds-textPrimary">{a.message}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.32px] text-cds-textSecondary">{a.when}</span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyChart text={t("dashboard.sinAlertas")} />
            )}
          </section>
        </div>

        {/* foot */}
        <div className="flex items-center justify-between border-t border-cds-layer02 pt-3 font-mono text-[11px] uppercase tracking-[0.32px] text-cds-textSecondary">
          <span>
            <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: palette.sage }} />{" "}
            {t("dashboard.sincronizado")}
          </span>
          <span>{usuario?.email ?? "lab"} · {t("dashboard.footAlertas", { n: stockBajo.length + vencidos.length + porVencer30.length })}</span>
        </div>
      </div>
    </section>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center border border-dashed border-cds-borderSubtle text-sm text-cds-textSecondary">
      {text}
    </div>
  )
}
