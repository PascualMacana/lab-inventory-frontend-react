import { FormEvent, lazy, Suspense, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowDownCircle, ArrowUpCircle, ListFilter, RotateCcw, SlidersHorizontal } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type Movimiento, type Reactivo } from "../lib/api"
import { useAuth } from "../lib/auth"
import { cn } from "../lib/utils"

// ApexCharts is lazy so it doesn't weigh on the movements page until rendered.
const StackedBarChart = lazy(() => import("../Graphs/StackedBarChart").then((module) => ({ default: module.StackedBarChart })))
// Type-only import is elided at build, so it doesn't pull the chart eagerly.
import type { StackedSeries } from "../Graphs/StackedBarChart"

const reactivosVacios: Reactivo[] = []
const movimientosVacios: Movimiento[] = []
const tipos = [
  { value: "", labelKey: "mov.tTodos" },
  { value: "entrada", labelKey: "mov.tEntradas" },
  { value: "salida", labelKey: "mov.tSalidas" },
  { value: "ajuste", labelKey: "mov.tAjustes" },
]

function isoDatePlusDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const isoValue = hasTimezone ? normalized : `${normalized}Z`
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function mesKey(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function mesLabel(key: string) {
  const [year, month] = key.split("-").map(Number)
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1))
}

function formatRangoCorto(desde: string, hasta: string) {
  const fmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" })
  const inicio = new Date(`${desde}T00:00:00`)
  const fin = new Date(`${hasta}T00:00:00`)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return ""
  }
  return `${fmt.format(inicio)} – ${fmt.format(fin)}`
}

function tipoBadgeClasses(tipo: Movimiento["tipo"]) {
  if (tipo === "entrada") {
    return "bg-lab-sageBg text-cds-supportSuccess ring-1 ring-cds-supportSuccess/40"
  }
  if (tipo === "salida") {
    return "bg-lab-critTint text-cds-supportError ring-1 ring-cds-supportError/40"
  }
  return "bg-lab-warmTint text-lab-warmFg ring-1 ring-lab-warm/40"
}

function TipoIcon({ tipo }: { tipo: Movimiento["tipo"] }) {
  if (tipo === "entrada") {
    return <ArrowUpCircle size={14} aria-hidden="true" />
  }
  if (tipo === "salida") {
    return <ArrowDownCircle size={14} aria-hidden="true" />
  }
  return <SlidersHorizontal size={14} aria-hidden="true" />
}

export function MovimientosPage() {
  const { token } = useAuth()
  const { t } = useTranslation()
  const [desde, setDesde] = useState(isoDatePlusDays(-30))
  const [hasta, setHasta] = useState(isoDatePlusDays(0))
  const [tipo, setTipo] = useState("")
  const [reactivoId, setReactivoId] = useState("")
  const [limite, setLimite] = useState("100")
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    desde: isoDatePlusDays(-30),
    hasta: isoDatePlusDays(0),
    tipo: "",
    reactivoId: "",
    limite: 100,
  })

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })

  const movimientosQuery = useQuery({
    queryKey: ["movimientos", filtrosAplicados],
    queryFn: () =>
      api.movimientos(token!, {
        desde: filtrosAplicados.desde || undefined,
        hasta: filtrosAplicados.hasta || undefined,
        tipo: filtrosAplicados.tipo || undefined,
        reactivo_id: filtrosAplicados.reactivoId ? Number(filtrosAplicados.reactivoId) : undefined,
        limite: filtrosAplicados.limite,
      }),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const movimientos = movimientosQuery.data ?? movimientosVacios
  const resumen = useMemo(() => {
    return movimientos.reduce(
      (acc, movimiento) => {
        acc.total += 1
        acc[movimiento.tipo] += 1
        return acc
      },
      { total: 0, entrada: 0, salida: 0, ajuste: 0 },
    )
  }, [movimientos])

  // Monthly movement counts split by tipo (counts, not quantity — units differ across reactivos).
  const porMes = useMemo(() => {
    const buckets = new Map<string, { entrada: number; salida: number; ajuste: number }>()
    for (const movimiento of movimientos) {
      const key = mesKey(movimiento.fecha)
      if (!key) {
        continue
      }
      const bucket = buckets.get(key) ?? { entrada: 0, salida: 0, ajuste: 0 }
      bucket[movimiento.tipo] += 1
      buckets.set(key, bucket)
    }
    const keys = [...buckets.keys()].sort()
    return {
      categorias: keys.map(mesLabel),
      entradas: keys.map((key) => buckets.get(key)!.entrada),
      salidas: keys.map((key) => buckets.get(key)!.salida),
      ajustes: keys.map((key) => buckets.get(key)!.ajuste),
    }
  }, [movimientos])

  // Soft tokens instead of the loud Carbon brights — these match the KPI cards and
  // theme in dark mode. Chart resolves the var() to a concrete hex at render time.
  const resumenSeries = [
    { name: t("mov.tEntradas"), data: porMes.entradas, color: "var(--cds-support-success)" },
    { name: t("mov.tSalidas"), data: porMes.salidas, color: "var(--cds-support-error)" },
    { name: t("mov.tAjustes"), data: porMes.ajustes, color: "var(--lab-warm)" },
  ]

  // Period-derived figures for the KPI cards and the breakdown panel. These count
  // movements (events), not stock units — quantities can't be summed across reagents
  // with different units, so "neto" is a net of movement events, not a stock balance.
  const neto = resumen.entrada - resumen.salida
  const dias = useMemo(() => {
    const inicio = new Date(`${filtrosAplicados.desde}T00:00:00`)
    const fin = new Date(`${filtrosAplicados.hasta}T00:00:00`)
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return 0
    }
    return Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 86_400_000) + 1)
  }, [filtrosAplicados.desde, filtrosAplicados.hasta])
  const rangoCorto = formatRangoCorto(filtrosAplicados.desde, filtrosAplicados.hasta)
  const pctDe = (valor: number) => (resumen.total ? Math.round((valor / resumen.total) * 100) : 0)
  const kpis = [
    { key: "total", label: t("mov.total"), value: resumen.total, accent: "var(--lab-blue)", valueClass: "", dot: null as string | null, sub: rangoCorto as string | null, pct: null as number | null },
    { key: "entrada", label: t("mov.tEntradas"), value: resumen.entrada, accent: "var(--cds-support-success)", valueClass: "text-cds-supportSuccess", dot: "var(--cds-support-success)" as string | null, sub: null as string | null, pct: pctDe(resumen.entrada) as number | null },
    { key: "salida", label: t("mov.tSalidas"), value: resumen.salida, accent: "var(--cds-support-error)", valueClass: "text-cds-supportError", dot: "var(--cds-support-error)" as string | null, sub: null as string | null, pct: pctDe(resumen.salida) as number | null },
    { key: "ajuste", label: t("mov.tAjustes"), value: resumen.ajuste, accent: "var(--lab-warm)", valueClass: "text-lab-warmFg", dot: "var(--lab-warm)" as string | null, sub: null as string | null, pct: pctDe(resumen.ajuste) as number | null },
  ]
  // Mono micro-label shared by the filter fields, matching the KPI cards' look.
  const microLabel = "mb-1.5 font-mono text-[10px] uppercase tracking-[0.07em]"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const limiteNumero = Number(limite)
    setFiltrosAplicados({
      desde,
      hasta,
      tipo,
      reactivoId,
      limite: Number.isFinite(limiteNumero) ? Math.min(Math.max(Math.trunc(limiteNumero), 1), 500) : 100,
    })
  }

  function limpiarFiltros() {
    const desdeDefault = isoDatePlusDays(-30)
    const hastaDefault = isoDatePlusDays(0)
    setDesde(desdeDefault)
    setHasta(hastaDefault)
    setTipo("")
    setReactivoId("")
    setLimite("100")
    setFiltrosAplicados({
      desde: desdeDefault,
      hasta: hastaDefault,
      tipo: "",
      reactivoId: "",
      limite: 100,
    })
  }

  return (
    <section>
      <PageHeader
        title={t("mov.title")}
        description={t("mov.desc")}
        count={movimientosQuery.isLoading ? t("mov.cargando") : t("mov.countN", { n: resumen.total })}
        plain
      />

      <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.key}
            className="border border-cds-borderSubtle bg-cds-layer01 p-[18px_20px]"
            style={{ boxShadow: `inset 3px 0 0 ${kpi.accent}` }}
          >
            <div className="flex items-center gap-2">
              {kpi.dot ? <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: kpi.dot }} /> : null}
              <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-cds-textSecondary">{kpi.label}</span>
            </div>
            <div className={cn("mt-2.5 font-mono text-[34px] leading-none", kpi.valueClass)}>{kpi.value}</div>
            {kpi.sub ? <div className="mt-2 text-xs text-cds-textSecondary">{kpi.sub}</div> : null}
            {kpi.pct != null ? (
              <div className="mt-[11px] h-1 overflow-hidden rounded-[3px] bg-cds-borderSubtle">
                <div className="h-full rounded-[3px]" style={{ width: `${kpi.pct}%`, background: kpi.accent }} />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <form className="mb-6 border border-cds-borderSubtle bg-cds-layer01 p-4" onSubmit={handleSubmit}>
        <div className="mb-4 flex items-center gap-2">
          <ListFilter size={16} aria-hidden="true" className="text-cds-textSecondary" />
          <h2 className="text-sm font-semibold leading-tight">{t("mov.filtros")}</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3.5">
          <label className="block w-[150px]">
            <Label className={microLabel} htmlFor="mov_desde">{t("mov.fDesde")}</Label>
            <Input id="mov_desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          </label>
          <label className="block w-[150px]">
            <Label className={microLabel} htmlFor="mov_hasta">{t("mov.fHasta")}</Label>
            <Input id="mov_hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
          </label>
          <label className="block w-[150px]">
            <Label className={microLabel} htmlFor="mov_tipo">{t("mov.fTipo")}</Label>
            <select
              id="mov_tipo"
              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
            >
              {tipos.map((item) => (
                <option key={item.value || "todos"} value={item.value}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-[180px]">
            <Label className={microLabel} htmlFor="mov_reactivo">{t("mov.fReactivo")}</Label>
            <select
              id="mov_reactivo"
              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
              value={reactivoId}
              onChange={(event) => setReactivoId(event.target.value)}
            >
              <option value="">{t("mov.tTodos")}</option>
              {reactivos.map((reactivo) => (
                <option key={reactivo.id} value={reactivo.id}>
                  {reactivo.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-[96px]">
            <Label className={microLabel} htmlFor="mov_limite">{t("mov.fLimite")}</Label>
            <Input
              id="mov_limite"
              value={limite}
              onChange={(event) => setLimite(event.target.value)}
              inputMode="numeric"
            />
          </label>
          <div className="flex w-full items-center gap-2 pt-1 sm:ml-auto sm:w-auto sm:pt-0">
            <Button type="submit" size="compact" className="px-5" disabled={movimientosQuery.isFetching}>
              {movimientosQuery.isFetching ? t("mov.aplicando") : t("mov.aplicarFiltros")}
            </Button>
            <Button type="button" variant="ghost" size="compact" onClick={limpiarFiltros}>
              <RotateCcw size={16} aria-hidden="true" />
              {t("mov.limpiar")}
            </Button>
          </div>
        </div>
      </form>

      {movimientosQuery.isError ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          {t("mov.errorCargar")}
        </div>
      ) : null}

      {!movimientosQuery.isLoading && movimientos.length ? (
        <ResumenPanel categorias={porMes.categorias} series={resumenSeries} resumen={resumen} neto={neto} dias={dias} />
      ) : null}

      <MovimientosTable movimientos={movimientos} isLoading={movimientosQuery.isLoading} />
    </section>
  )
}

function ResumenPanel({
  categorias,
  series,
  resumen,
  neto,
  dias,
}: {
  categorias: string[]
  series: StackedSeries[]
  resumen: { total: number; entrada: number; salida: number; ajuste: number }
  neto: number
  dias: number
}) {
  const { t } = useTranslation()
  const total = resumen.total
  const pct = (valor: number) => (total ? Math.round((valor / total) * 100) : 0)
  const filas = [
    { key: "entrada", label: t("mov.tEntradas"), value: resumen.entrada, color: "var(--cds-support-success)" },
    { key: "salida", label: t("mov.tSalidas"), value: resumen.salida, color: "var(--cds-support-error)" },
    { key: "ajuste", label: t("mov.tAjustes"), value: resumen.ajuste, color: "var(--lab-warm)" },
  ]
  const netoLabel = neto > 0 ? `+${neto}` : String(neto)
  const netoClass = neto > 0 ? "text-cds-supportSuccess" : neto < 0 ? "text-cds-supportError" : "text-cds-textSecondary"

  return (
    <div className="mb-4 grid grid-cols-1 overflow-hidden border border-cds-borderSubtle bg-cds-layer01 lg:grid-cols-[1.75fr_1fr]">
      <div className="p-6">
        <div className="text-[15px] font-bold leading-tight tracking-[-0.01em]">{t("mov.resumenTitulo")}</div>
        <div className="mt-1 text-xs text-cds-textSecondary">{t("mov.resumenSubtitulo")}</div>
        <Suspense fallback={<div className="mt-2 h-[320px] animate-pulse bg-cds-field" />}>
          <StackedBarChart categorias={categorias} series={series} height={320} totalLabels exportFilename="movimientos-por-mes" />
        </Suspense>
      </div>
      <div className="border-t border-cds-borderSubtle p-6 lg:border-l lg:border-t-0">
        <div className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.09em] text-cds-textSecondary">{t("mov.desglose")}</div>
        {filas.map((fila) => (
          <div key={fila.key} className="mb-[18px]">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: fila.color }} />
                {fila.label}
              </span>
              <span className="font-mono text-sm">{fila.value}</span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-[3px] bg-cds-borderSubtle">
              <div className="h-full rounded-[3px]" style={{ width: `${pct(fila.value)}%`, background: fila.color }} />
            </div>
          </div>
        ))}
        <div className="border-t border-cds-borderSubtle pt-[18px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-cds-textSecondary">{t("mov.neto")}</span>
            <span className={cn("font-mono text-lg", netoClass)}>{netoLabel}</span>
          </div>
          <div className="mt-2 text-xs text-cds-textSecondary">{t("mov.netoAyuda", { n: total, d: dias })}</div>
        </div>
      </div>
    </div>
  )
}

function MovimientosTable({ movimientos, isLoading }: { movimientos: Movimiento[]; isLoading: boolean }) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }

  if (!movimientos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("mov.sinMovimientos")}</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("mov.thFecha")}</th>
            <th className="h-10 px-4 font-normal">{t("mov.thTipo")}</th>
            <th className="h-10 px-4 font-normal">{t("mov.thReactivo")}</th>
            <th className="h-10 px-4 font-normal">{t("mov.thLoteInterno")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("mov.thCantidad")}</th>
            <th className="h-10 px-4 font-normal">{t("mov.thUsuario")}</th>
            <th className="h-10 px-4 font-normal">{t("mov.thMotivo")}</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((movimiento) => (
            <tr key={movimiento.id} className="border-b border-cds-borderSubtle hover:bg-cds-layer01">
              <td className="h-12 px-4 text-cds-textSecondary">{formatDateTime(movimiento.fecha)}</td>
              <td className="h-12 px-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.16px]",
                    tipoBadgeClasses(movimiento.tipo),
                  )}
                >
                  <TipoIcon tipo={movimiento.tipo} />
                  {t(`mov.${movimiento.tipo}`)}
                </span>
              </td>
              <td className="h-12 px-4">{movimiento.reactivo_nombre}</td>
              <td className="h-12 px-4">
                <Link
                  to={`/lotes?codigo=${encodeURIComponent(movimiento.codigo_interno)}`}
                  className="inline-flex h-8 items-center border border-cds-borderSubtle bg-cds-layer01 px-3 font-mono text-xs tracking-[0.16px] text-cds-linkPrimary transition-colors hover:bg-[var(--cds-layer-hover-01)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus"
                  aria-label={t("mov.abrirLote", { codigo: movimiento.codigo_interno })}
                >
                  {movimiento.codigo_interno}
                </Link>
              </td>
              <td className="h-12 px-4 text-right font-mono">
                {formatNumber(movimiento.cantidad)} {movimiento.unidad}
              </td>
              <td className="h-12 px-4 text-cds-textSecondary">{movimiento.usuario_nombre}</td>
              <td className="h-12 max-w-[320px] px-4 text-cds-textSecondary">
                <span className="line-clamp-2">{movimiento.motivo || "-"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
