import { FormEvent, useMemo, useState } from "react"
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

      <div className="mb-4 grid gap-px bg-cds-borderSubtle md:grid-cols-4">
        <Metric label={t("mov.total")} value={String(resumen.total)} />
        <Metric label={t("mov.tEntradas")} value={String(resumen.entrada)} tone="success" />
        <Metric label={t("mov.tSalidas")} value={String(resumen.salida)} tone="error" />
        <Metric label={t("mov.tAjustes")} value={String(resumen.ajuste)} tone="warning" />
      </div>

      <form className="mb-6 bg-cds-layer01 p-4" onSubmit={handleSubmit}>
        <div className="mb-5 flex items-center gap-3">
          <ListFilter size={20} aria-hidden="true" />
          <h2 className="text-[24px] leading-[1.33]">{t("mov.filtros")}</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <Label className="mb-2" htmlFor="mov_desde">{t("mov.fDesde")}</Label>
            <Input id="mov_desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          </label>
          <label className="block">
            <Label className="mb-2" htmlFor="mov_hasta">{t("mov.fHasta")}</Label>
            <Input id="mov_hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
          </label>
          <label className="block">
            <Label className="mb-2" htmlFor="mov_tipo">{t("mov.fTipo")}</Label>
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
          <label className="block">
            <Label className="mb-2" htmlFor="mov_reactivo">{t("mov.fReactivo")}</Label>
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
          <label className="block">
            <Label className="mb-2" htmlFor="mov_limite">{t("mov.fLimite")}</Label>
            <Input
              id="mov_limite"
              value={limite}
              onChange={(event) => setLimite(event.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={movimientosQuery.isFetching}>
            {movimientosQuery.isFetching ? t("mov.aplicando") : t("mov.aplicarFiltros")}
          </Button>
          <Button type="button" variant="ghost" onClick={limpiarFiltros}>
            <RotateCcw size={18} aria-hidden="true" />
            {t("mov.limpiar")}
          </Button>
        </div>
      </form>

      {movimientosQuery.isError ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          {t("mov.errorCargar")}
        </div>
      ) : null}

      <MovimientosTable movimientos={movimientos} isLoading={movimientosQuery.isLoading} />
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" | "error" | "warning" }) {
  return (
    <article className="bg-cds-layer01 p-4">
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div
        className={cn(
          "mt-3 text-[24px] leading-[1.33]",
          tone === "success" && "text-cds-supportSuccess",
          tone === "error" && "text-cds-supportError",
          tone === "warning" && "text-lab-warmFg",
        )}
      >
        {value}
      </div>
    </article>
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
