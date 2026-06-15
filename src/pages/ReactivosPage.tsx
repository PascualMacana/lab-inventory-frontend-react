import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, Plus, AlertTriangle, FlaskConical, PackageCheck, Search, Save } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type Reactivo, type ReactivoActualizar, type ReactivoCrear } from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber, requireFiniteNumber } from "../lib/forms"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

// Plotly is heavy; only load it when a reagent detail is open (deliberate drill-down).
const PlotlyGauge = lazy(() => import("../Graphs/PlotlyGauge").then((module) => ({ default: module.PlotlyGauge })))

type FiltroEstado = "Todos" | "En tránsito" | "Sin stock" | "Con stock"
type TabReactivos = "listado" | "detalle" | "nuevo"

const filtros: FiltroEstado[] = ["Todos", "En tránsito", "Sin stock", "Con stock"]
// Las claves de filtro son canónicas (la lógica de filtrado usa el valor en
// español del dato); solo se traduce el label que se muestra.
const filtroKey: Record<FiltroEstado, string> = {
  "Todos": "todos",
  "En tránsito": "transito",
  "Sin stock": "sinStock",
  "Con stock": "conStock",
}
const reactivosVacios: Reactivo[] = []
const unidades = ["ml", "L", "g", "kg", "mg", "ug", "unidad"]

function normalizarTexto(value: string | null | undefined) {
  return (value ?? "").toLocaleLowerCase("es")
}

function esTransito(reactivo: Reactivo) {
  const categoria = normalizarTexto(reactivo.categoria)
  return categoria.includes("tránsito") || categoria.includes("transito")
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function ReactivosPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const puedeCrear = puede(usuario, "crear_reactivo")
  const puedeEditar = puede(usuario, "editar_reactivo")
  const [tab, setTab] = useState<TabReactivos>("listado")
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Todos")
  const [reactivoDetalleId, setReactivoDetalleId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const reactivoIdQuery = Number(searchParams.get("reactivo_id") ?? searchParams.get("id") ?? "")
  const reactivoDetalle = useMemo(() => {
    if (!reactivos.length) {
      return null
    }
    if (!reactivoDetalleId) {
      return reactivos[0]
    }
    return reactivos.find((reactivo) => reactivo.id === reactivoDetalleId) ?? reactivos[0]
  }, [reactivoDetalleId, reactivos])

  const reactivosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda.trim())

    return reactivos.filter((reactivo) => {
      const coincideBusqueda =
        !texto ||
        normalizarTexto(reactivo.nombre).includes(texto) ||
        normalizarTexto(reactivo.categoria).includes(texto) ||
        normalizarTexto(reactivo.ubicacion).includes(texto)

      if (!coincideBusqueda) {
        return false
      }

      if (filtroEstado === "En tránsito") {
        return esTransito(reactivo)
      }
      if (filtroEstado === "Sin stock") {
        return (reactivo.stock_total ?? 0) <= 0
      }
      if (filtroEstado === "Con stock") {
        return (reactivo.stock_total ?? 0) > 0
      }
      return true
    })
  }, [busqueda, filtroEstado, reactivos])

  const resumen = useMemo(() => {
    return {
      total: reactivos.length,
      conStock: reactivos.filter((reactivo) => (reactivo.stock_total ?? 0) > 0).length,
      sinStock: reactivos.filter((reactivo) => (reactivo.stock_total ?? 0) <= 0).length,
      stockBajo: reactivos.filter((reactivo) => (reactivo.stock_total ?? 0) < (reactivo.stock_minimo ?? 0)).length,
    }
  }, [reactivos])

  function handleSelectDetalle(id: number) {
    setReactivoDetalleId(id)
    setTab("detalle")
    setMensaje(null)
    setSearchParams({ reactivo_id: String(id) }, { replace: true })
  }

  useEffect(() => {
    function handleModuleOpen(event: Event) {
      const detail = (event as CustomEvent<{ to?: string }>).detail
      if (detail?.to === "/reactivos") {
        setTab("listado")
        setMensaje(null)
      }
    }

    window.addEventListener("lab:module-open", handleModuleOpen)
    return () => window.removeEventListener("lab:module-open", handleModuleOpen)
  }, [])

  useEffect(() => {
    if (!reactivoIdQuery || !reactivos.some((reactivo) => reactivo.id === reactivoIdQuery)) {
      return
    }
    setReactivoDetalleId(reactivoIdQuery)
    setTab("detalle")
    setBusqueda("")
    setFiltroEstado("Todos")
    setMensaje(null)
  }, [reactivoIdQuery, reactivos])

  return (
    <section>
      <PageHeader
        title={t("reactivos.titulo")}
        count={reactivosQuery.isLoading ? t("reactivos.cargando") : t("reactivos.count", { shown: reactivosFiltrados.length, total: reactivos.length })}
        plain
      />

      {reactivosQuery.isError ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          {t("reactivos.loadError")}
        </div>
      ) : null}

      {mensaje ? (
        <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}

      <ModuleNav
        actions={
          tab !== "listado"
            ? [{ label: t("common.volverAlListado"), onClick: () => setTab("listado"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
            : puedeCrear
              ? [{ label: t("reactivos.nuevo"), onClick: () => setTab("nuevo"), icon: <Plus size={18} aria-hidden="true" /> }]
              : []
        }
      />

      {tab === "listado" ? (
        <>
          <ListadoReactivos
            resumen={resumen}
            busqueda={busqueda}
            filtroEstado={filtroEstado}
            reactivos={reactivosFiltrados}
            isLoading={reactivosQuery.isLoading}
            selectedId={reactivoDetalle?.id ?? null}
            onBusquedaChange={setBusqueda}
            onFiltroChange={setFiltroEstado}
            onSelectDetalle={handleSelectDetalle}
          />
        </>
      ) : null}

      {tab === "detalle" ? (
        <DetalleReactivo
          token={token!}
          reactivos={reactivos}
          reactivo={reactivoDetalle}
          puedeEditar={puedeEditar}
          puedeFusionar={puedeCrear}
          onSelect={setReactivoDetalleId}
          onUpdated={async () => {
            await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
            await queryClient.invalidateQueries({ queryKey: ["lotes"] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
          }}
        />
      ) : null}

      {tab === "nuevo" && puedeCrear ? (
        <NuevoReactivoForm
          token={token!}
          onSuccess={async (id) => {
            await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            setReactivoDetalleId(id)
            setTab("listado")
            setMensaje(t("reactivos.creadoMsg", { id }))
          }}
        />
      ) : null}

    </section>
  )
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function ListadoReactivos({
  resumen,
  busqueda,
  filtroEstado,
  reactivos,
  isLoading,
  selectedId,
  onBusquedaChange,
  onFiltroChange,
  onSelectDetalle,
}: {
  resumen: { total: number; conStock: number; sinStock: number; stockBajo: number }
  busqueda: string
  filtroEstado: FiltroEstado
  reactivos: Reactivo[]
  isLoading: boolean
  selectedId: number | null
  onBusquedaChange: (value: string) => void
  onFiltroChange: (value: FiltroEstado) => void
  onSelectDetalle: (id: number) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="mb-4 grid gap-px bg-cds-borderSubtle md:grid-cols-4">
        <MetricTile label={t("reactivos.metricTotal")} value={resumen.total} icon={FlaskConical} />
        <MetricTile label={t("reactivos.metricConStock")} value={resumen.conStock} icon={PackageCheck} />
        <MetricTile label={t("reactivos.metricSinStock")} value={resumen.sinStock} icon={AlertTriangle} danger />
        <MetricTile label={t("reactivos.metricStockBajo")} value={resumen.stockBajo} icon={AlertTriangle} danger />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("common.buscar")}</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary"
              size={18}
              aria-hidden="true"
            />
            <Input
              className="pl-12"
              value={busqueda}
              onChange={(event) => onBusquedaChange(event.target.value)}
              placeholder={t("reactivos.buscarPlaceholder")}
            />
          </div>
        </label>

        <div>
          <div className="mb-2 text-xs tracking-[0.32px] text-cds-textSecondary">{t("reactivos.filtrar")}</div>
          <div className="flex flex-wrap gap-px bg-cds-borderSubtle">
            {filtros.map((filtro) => (
              <button
                key={filtro}
                type="button"
                onClick={() => onFiltroChange(filtro)}
                className={cn(
                  "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px] transition-colors hover:bg-[var(--cds-layer-hover-01)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
                  filtroEstado === filtro && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
                )}
              >
                {t(`reactivos.filtro.${filtroKey[filtro]}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ReactivosTable reactivos={reactivos} isLoading={isLoading} selectedId={selectedId} onSelectDetalle={onSelectDetalle} />
    </>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string
  value: number
  icon: typeof FlaskConical
  danger?: boolean
}) {
  return (
    <article className={cn("bg-cds-layer01 p-4", danger && "bg-lab-critTint shadow-[inset_2px_0_0_var(--cds-support-error)]")}>
      <div className={cn("mb-4 flex items-center justify-between text-cds-textSecondary", danger && "text-cds-supportError")}>
        <span className="text-xs tracking-[0.32px]">{label}</span>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className={cn("text-[32px] font-light leading-[1.25]", danger && "font-normal text-cds-supportError")}>{formatNumber(value)}</div>
    </article>
  )
}

function ReactivosTable({
  reactivos,
  isLoading,
  selectedId,
  onSelectDetalle,
}: {
  reactivos: Reactivo[]
  isLoading: boolean
  selectedId: number | null
  onSelectDetalle: (id: number) => void
}) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }

  if (reactivos.length === 0) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("reactivos.sinFiltro")}</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("reactivos.thId")}</th>
            <th className="h-10 px-4 font-normal">{t("reactivos.thNombre")}</th>
            <th className="h-10 px-4 font-normal">{t("reactivos.thUnidad")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("reactivos.thStockActual")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("reactivos.thStockMin")}</th>
            <th className="h-10 px-4 font-normal">{t("reactivos.thUbicacion")}</th>
            <th className="h-10 px-4 font-normal">{t("reactivos.thCategoria")}</th>
          </tr>
        </thead>
        <tbody>
          {reactivos.map((reactivo) => {
            const bajoMinimo = (reactivo.stock_total ?? 0) < (reactivo.stock_minimo ?? 0)
            return (
              <tr
                key={reactivo.id}
                className={cn(
                  "cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01",
                  bajoMinimo && "bg-lab-critTint/60 shadow-[inset_2px_0_0_var(--cds-support-error)]",
                  selectedId === reactivo.id && "bg-cds-layer01 shadow-[inset_2px_0_0_var(--cds-focus)]",
                )}
                onClick={() => onSelectDetalle(reactivo.id)}
              >
                <td className="h-12 px-4 font-mono text-xs tracking-[0.16px] text-cds-textSecondary">{reactivo.id}</td>
                <td className="h-12 px-4 font-semibold tracking-[0.16px]">{reactivo.nombre}</td>
                <td className="h-12 px-4">{reactivo.unidad}</td>
                <td className={cn("h-12 px-4 text-right font-mono", bajoMinimo && "font-semibold text-cds-supportError")}>
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {bajoMinimo ? <AlertTriangle size={14} aria-hidden="true" /> : null}
                    {formatNumber(reactivo.stock_total)}
                  </span>
                </td>
                <td className="h-12 px-4 text-right font-mono">{formatNumber(reactivo.stock_minimo)}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{reactivo.ubicacion || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">
                  {reactivo.categoria ? <CategoryTag value={reactivo.categoria} /> : "-"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function NuevoReactivoForm({
  token,
  onSuccess,
}: {
  token: string
  onSuccess: (id: number) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const crearMutation = useMutation({
    mutationFn: (data: ReactivoCrear) => api.crearReactivo(token, data),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setErrorLocal(null)
    try {
      const form = new FormData(formElement)
      const stockMinimo = requireFiniteNumber(
        parseFormNumber(form.get("stock_minimo"), 0),
        t("reactivos.errStockMin"),
      )
      const payload: ReactivoCrear = {
        nombre: String(form.get("nombre") ?? "").trim(),
        unidad: String(form.get("unidad") ?? "ml"),
        stock_minimo: stockMinimo,
        ubicacion: nullable(String(form.get("ubicacion") ?? "")),
        categoria: nullable(String(form.get("categoria") ?? "")),
      }

      const resultado = await crearMutation.mutateAsync(payload)
      formElement.reset()
      await onSuccess(resultado.id)
    } catch (error) {
      setErrorLocal(mutationError(error, t("reactivos.errCrear")))
    }
  }

  return (
    <form className="max-w-5xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <h2 className="mb-6 text-[24px] leading-[1.33]">{t("reactivos.agregar")}</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("reactivos.fNombre")} name="nombre" required placeholder={t("reactivos.fNombrePh")} />
        <label className="block">
          <Label className="mb-2" htmlFor="unidad">{t("reactivos.fUnidadBase")}</Label>
          <select
            id="unidad"
            name="unidad"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            defaultValue="ml"
          >
            {unidades.map((unidad) => (
              <option key={unidad} value={unidad}>
                {unidad}
              </option>
            ))}
          </select>
        </label>
        <DecimalField label={t("reactivos.fStockMin")} name="stock_minimo" defaultValue="0" required />
        <Field label={t("reactivos.fUbicacion")} name="ubicacion" placeholder={t("reactivos.fUbicacionPh")} />
        <Field label={t("reactivos.fCategoria")} name="categoria" placeholder={t("reactivos.fCategoriaPh")} />
      </div>

      {errorLocal ? (
        <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}

      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Save size={18} aria-hidden="true" />
        {crearMutation.isPending ? t("common.creando") : t("reactivos.crear")}
      </Button>
    </form>
  )
}

function DetalleReactivo({
  token,
  reactivos,
  reactivo,
  puedeEditar,
  puedeFusionar,
  onSelect,
  onUpdated,
}: {
  token: string
  reactivos: Reactivo[]
  reactivo: Reactivo | null
  puedeEditar: boolean
  puedeFusionar: boolean
  onSelect: (id: number) => void
  onUpdated: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [stockMinimo, setStockMinimo] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [categoria, setCategoria] = useState("")
  const [mensajeLocal, setMensajeLocal] = useState<string | null>(null)
  // Merge tool: el reactivo que se ve es el sobreviviente; se elige un duplicado a absorber.
  const [duplicadoId, setDuplicadoId] = useState<number | null>(null)
  const [confirmandoFusion, setConfirmandoFusion] = useState(false)
  const [mensajeFusion, setMensajeFusion] = useState<string | null>(null)
  const [errorFusion, setErrorFusion] = useState<string | null>(null)
  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReactivoActualizar }) => api.actualizarReactivo(token, id, data),
  })
  const fusionMutation = useMutation({
    mutationFn: ({ sobreviviente, duplicado }: { sobreviviente: number; duplicado: number }) =>
      api.fusionarReactivos(token, sobreviviente, duplicado),
  })
  const queryClient = useQueryClient()
  const [busquedaDup, setBusquedaDup] = useState("")
  // Posibles duplicados con IA: manual (enabled:false) para no gastar una llamada
  // al LLM cada vez que se abre un detalle; keyed por reactivo => se resetea solo
  // al cambiar de reactivo. Se dispara con el botón (refetch).
  const duplicadosQuery = useQuery({
    queryKey: ["duplicados", reactivo?.id],
    queryFn: () => api.duplicadosReactivo(token, reactivo!.id),
    enabled: false,
  })

  useEffect(() => {
    if (!reactivo) {
      return
    }
    setNombre(reactivo.nombre ?? "")
    setStockMinimo(String(reactivo.stock_minimo ?? 0))
    setUbicacion(reactivo.ubicacion ?? "")
    setCategoria(reactivo.categoria ?? "")
    setErrorLocal(null)
    setMensajeLocal(null)
    setDuplicadoId(null)
    setConfirmandoFusion(false)
    setMensajeFusion(null)
    setErrorFusion(null)
    setBusquedaDup("")
  }, [reactivo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reactivo) {
      return
    }
    setErrorLocal(null)
    setMensajeLocal(null)
    try {
      const stockMinimoParseado = requireFiniteNumber(
        parseFormNumber(stockMinimo, 0),
        t("reactivos.errStockMin"),
      )
      const payload: ReactivoActualizar = {
        nombre: nombre.trim(),
        stock_minimo: stockMinimoParseado,
        ubicacion: nullable(ubicacion),
        categoria: nullable(categoria),
        marca: reactivo.marca ?? null,
        numero_catalogo: reactivo.numero_catalogo ?? null,
        enlace_compra: reactivo.enlace_compra ?? null,
      }
      await actualizarMutation.mutateAsync({ id: reactivo.id, data: payload })
      await onUpdated()
      setMensajeLocal(t("reactivos.actualizadoMsg"))
    } catch (error) {
      setErrorLocal(mutationError(error, t("reactivos.errActualizar")))
    }
  }

  async function handleFusionar() {
    if (!reactivo || !duplicadoId) {
      return
    }
    setErrorFusion(null)
    setMensajeFusion(null)
    try {
      const res = await fusionMutation.mutateAsync({ sobreviviente: reactivo.id, duplicado: duplicadoId })
      setMensajeFusion(res.mensaje ?? t("reactivos.fusionadoMsg", { n: res.lotes_movidos }))
      setDuplicadoId(null)
      setConfirmandoFusion(false)
      setBusquedaDup("")
      await onUpdated()
      // Las sugerencias en cache quedaron viejas (el duplicado ya no existe).
      queryClient.removeQueries({ queryKey: ["duplicados"] })
    } catch (error) {
      setConfirmandoFusion(false)
      setErrorFusion(mutationError(error, t("reactivos.errFusionar")))
    }
  }

  function seleccionarDuplicado(id: number) {
    setDuplicadoId(id)
    setConfirmandoFusion(false)
    setMensajeFusion(null)
    setErrorFusion(null)
  }

  if (!reactivo) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("reactivos.sinReactivos")}</div>
  }

  const bajoMinimo = (reactivo.stock_total ?? 0) < (reactivo.stock_minimo ?? 0)
  const minimoReactivo = reactivo.stock_minimo ?? 0
  const coberturaReactivo =
    minimoReactivo > 0
      ? Math.min(160, Math.round(((reactivo.stock_total ?? 0) / minimoReactivo) * 100))
      : (reactivo.stock_total ?? 0) > 0
        ? 160
        : 0
  // Solo se puede fusionar entre reactivos con la MISMA unidad (el backend lo exige:
  // los lotes guardan la cantidad en la unidad del reactivo, no se convierte).
  const duplicadosPosibles = reactivos.filter((item) => item.id !== reactivo.id && item.unidad === reactivo.unidad)
  const duplicadosFiltrados = busquedaDup.trim()
    ? duplicadosPosibles.filter((item) => normalizarTexto(item.nombre).includes(normalizarTexto(busquedaDup)))
    : []
  const nombreDuplicado = reactivos.find((item) => item.id === duplicadoId)?.nombre ?? ""

  return (
    <>
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside>
        <Label className="mb-2" htmlFor="reactivo_detalle">{t("reactivos.seleccionaReactivo")}</Label>
        <select
          id="reactivo_detalle"
          className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
          value={reactivo.id}
          onChange={(event) => onSelect(Number(event.target.value))}
        >
          {reactivos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} (ID {item.id})
            </option>
          ))}
        </select>

        <div className="mt-4 bg-cds-layer01 p-4">
          <h2 className="text-[24px] leading-[1.33]">{reactivo.nombre}</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <InfoRow label={t("reactivos.infoUnidad")} value={reactivo.unidad} />
            <InfoRow label={t("reactivos.infoStockActual")} value={`${formatNumber(reactivo.stock_total)} ${reactivo.unidad}`} danger={bajoMinimo} />
            <InfoRow label={t("reactivos.infoStockMin")} value={`${formatNumber(reactivo.stock_minimo)} ${reactivo.unidad}`} />
            <InfoRow label={t("reactivos.infoUbicacion")} value={reactivo.ubicacion || "-"} />
            <InfoRow label={t("reactivos.infoCategoria")} value={reactivo.categoria || "-"} />
          </dl>
        </div>

        <div className="mt-4 bg-cds-layer01 p-4">
          <h3 className="text-sm font-semibold leading-[1.4]">{t("reactivos.coberturaStock")}</h3>
          <Suspense fallback={<div className="mt-2 h-[280px] animate-pulse bg-cds-field" />}>
            <PlotlyGauge value={coberturaReactivo} numberSize={36} />
          </Suspense>
        </div>
      </aside>

      <form className="bg-cds-layer01 p-4" onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-[24px] leading-[1.33]">{t("reactivos.editar")}</h2>
          {!puedeEditar ? <span className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("common.soloLectura")}</span> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label={t("reactivos.fNombre")}
            name="nombre"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            required
            disabled={!puedeEditar}
          />
          <Field
            label={t("reactivos.fStockMin")}
            name="stock_minimo"
            inputMode="decimal"
            value={stockMinimo}
            onChange={(event) => setStockMinimo(event.target.value)}
            required
            disabled={!puedeEditar}
          />
          <Field
            label={t("reactivos.fUbicacion")}
            name="ubicacion"
            value={ubicacion}
            onChange={(event) => setUbicacion(event.target.value)}
            disabled={!puedeEditar}
          />
          <Field
            label={t("reactivos.fCategoria")}
            name="categoria"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            disabled={!puedeEditar}
          />
        </div>

        <p className="mt-4 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
          {t("reactivos.editHelp")}
        </p>

        {errorLocal ? (
          <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
            {errorLocal}
          </div>
        ) : null}

        {mensajeLocal ? (
          <div className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">
            {mensajeLocal}
          </div>
        ) : null}

        {puedeEditar ? (
          <Button className="mt-6" type="submit" disabled={actualizarMutation.isPending}>
            <Save size={18} aria-hidden="true" />
            {actualizarMutation.isPending ? t("common.guardando") : t("common.guardarCambios")}
          </Button>
        ) : null}
      </form>
    </div>

    {puedeFusionar ? (
      <section className="mt-6 bg-cds-layer01 p-4">
        <h2 className="text-[24px] leading-[1.33]">{t("reactivos.fusionarTitulo")}</h2>
        <p className="mt-2 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
          {t("reactivos.fusionarHelp", { nombre: reactivo.nombre, unidad: reactivo.unidad })}
        </p>

        {duplicadosPosibles.length === 0 ? (
          <p className="mt-4 text-sm text-cds-textSecondary">{t("reactivos.sinOtrosUnidad", { unidad: reactivo.unidad })}</p>
        ) : (
          <div className="mt-4 max-w-xl">
            <Button
              type="button"
              onClick={() => void duplicadosQuery.refetch()}
              disabled={duplicadosQuery.isFetching}
            >
              {duplicadosQuery.isFetching ? t("reactivos.buscandoDup") : t("reactivos.buscarDupIA")}
            </Button>

            {duplicadosQuery.isError ? (
              <p className="mt-3 text-sm text-cds-supportError">{t("reactivos.errConsultarDup")}</p>
            ) : null}

            {duplicadosQuery.data ? (
              duplicadosQuery.data.candidatos.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("reactivos.posiblesDup")}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {duplicadosQuery.data.candidatos.map((candidato) => (
                      <button
                        key={candidato.reactivo_id}
                        type="button"
                        onClick={() => seleccionarDuplicado(candidato.reactivo_id)}
                        className={cn(
                          "flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors",
                          duplicadoId === candidato.reactivo_id
                            ? "border-cds-buttonPrimary bg-lab-blueTint text-cds-linkPrimary"
                            : "border-cds-borderSubtle hover:bg-cds-background",
                        )}
                      >
                        <span>
                          {candidato.nombre}{" "}
                          <span className="text-cds-textSecondary">(ID {candidato.reactivo_id}{candidato.cas_numero ? ` · CAS ${candidato.cas_numero}` : ""})</span>
                        </span>
                        {duplicadoId === candidato.reactivo_id ? <Check size={16} aria-hidden="true" /> : null}
                      </button>
                    ))}
                  </div>
                  {duplicadosQuery.data.razon ? <p className="mt-2 text-xs leading-4 text-cds-textSecondary">{duplicadosQuery.data.razon}</p> : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-cds-textSecondary">{t("reactivos.sinDupClaros")}</p>
              )
            ) : null}

            <div className="mt-5">
              <Label className="mb-2" htmlFor="buscar_duplicado">{t("reactivos.buscarEnTodos", { unidad: reactivo.unidad })}</Label>
              <Input
                id="buscar_duplicado"
                value={busquedaDup}
                onChange={(event) => setBusquedaDup(event.target.value)}
                placeholder={t("reactivos.buscarDupPh")}
              />
              {busquedaDup.trim() ? (
                <div className="mt-2 flex flex-col gap-2">
                  {duplicadosFiltrados.length === 0 ? (
                    <p className="text-sm text-cds-textSecondary">{t("common.sinResultados")}</p>
                  ) : (
                    duplicadosFiltrados.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => seleccionarDuplicado(item.id)}
                        className={cn(
                          "flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors",
                          duplicadoId === item.id
                            ? "border-cds-buttonPrimary bg-lab-blueTint text-cds-linkPrimary"
                            : "border-cds-borderSubtle hover:bg-cds-background",
                        )}
                      >
                        <span>
                          {item.nombre}{" "}
                          <span className="text-cds-textSecondary">(ID {item.id} · stock {formatNumber(item.stock_total)} {item.unidad})</span>
                        </span>
                        {duplicadoId === item.id ? <Check size={16} aria-hidden="true" /> : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {duplicadoId ? (
              <p className="mt-4 text-sm">{t("reactivos.duplicadoElegido")} <strong>{nombreDuplicado}</strong></p>
            ) : null}
          </div>
        )}

        {duplicadoId && !confirmandoFusion ? (
          <Button className="mt-4" type="button" onClick={() => setConfirmandoFusion(true)}>
            {t("reactivos.fusionar")}
          </Button>
        ) : null}

        {duplicadoId && confirmandoFusion ? (
          <div className="mt-4 border-l-4 border-lab-warm bg-cds-background px-4 py-3 text-sm">
            {t("reactivos.confirmFusion", { dup: nombreDuplicado, sob: reactivo.nombre })}
            <div className="mt-3 flex items-center gap-3">
              <Button type="button" onClick={() => void handleFusionar()} disabled={fusionMutation.isPending}>
                {fusionMutation.isPending ? t("reactivos.fusionando") : t("reactivos.confirmarFusion")}
              </Button>
              <button type="button" className="text-sm text-cds-textSecondary underline" onClick={() => setConfirmandoFusion(false)}>
                {t("common.cancelar")}
              </button>
            </div>
          </div>
        ) : null}

        {errorFusion ? (
          <div className="mt-4 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">{errorFusion}</div>
        ) : null}
        {mensajeFusion ? (
          <div className="mt-4 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">{mensajeFusion}</div>
        ) : null}
      </section>
    ) : null}
    </>
  )
}

function Field({
  label,
  name,
  className,
  ...props
}: {
  label: string
  name: string
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("block", className)}>
      <Label className="mb-2" htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </label>
  )
}

function DecimalField(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode"> & {
  label: string
  name: string
  className?: string
}) {
  return <Field {...props} type="text" inputMode="decimal" />
}

function InfoRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <dt className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</dt>
      <dd className={cn("mt-1", danger && "text-cds-supportError")}>{value}</dd>
    </div>
  )
}

function CategoryTag({ value }: { value: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-3xl bg-[#edf5ff] px-2 text-xs tracking-[0.32px] text-cds-linkPrimary">
      {value}
    </span>
  )
}
