import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, CalendarClock, Camera, Check, Download, FileText, Package, PackagePlus, Plus, QrCode, Save, Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type DatosEtiqueta, type Lote, type LoteAjusteStock, type LoteActualizar, type LoteCrear, type LoteCrearMultiple, type LoteCrearMultipleResponse, type Proveedor, type Reactivo, type ReactivoCandidato, type ReactivoCrear, type ReactivoMatch, type ReactivoMatchRequest } from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber, requireFiniteNumber } from "../lib/forms"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

const reactivosVacios: Reactivo[] = []
const lotesVacios: Lote[] = []
const proveedoresVacios: Proveedor[] = []

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat("es-AR").format(date)
}

function isoDatePlusDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysUntil(value: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${value}T00:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Estado de vencimiento de un lote. vencido = ya pasó (descartar); soon = vence
// dentro de 30 días (planificar); ok = vigente. Maneja el color del semáforo,
// del texto relativo y del acento de la fila.
type VencTone = "vencido" | "soon" | "ok"
const vencColor: Record<VencTone, string> = {
  vencido: "var(--cds-support-error)",
  soon: "var(--cds-support-warning)",
  ok: "var(--cds-support-success)",
}

function vencimientoTone(dias: number): VencTone {
  if (dias < 0) return "vencido"
  if (dias <= 30) return "soon"
  return "ok"
}

function esPendiente(reactivo: Reactivo) {
  const categoria = (reactivo.categoria ?? "").toLocaleLowerCase("es")
  return (reactivo.stock_total ?? 0) <= 0 || categoria.includes("tránsito") || categoria.includes("transito")
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function LotesPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const puedeCrearLote = puede(usuario, "crear_lote")
  const puedeImprimir = puede(usuario, "imprimir_hoja_avery")
  const [reactivoId, setReactivoId] = useState<number | null>(null)
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const reactivoSeleccionado = useMemo(
    () => reactivos.find((reactivo) => reactivo.id === reactivoId) ?? null,
    [reactivoId, reactivos],
  )

  const lotesQuery = useQuery({
    queryKey: ["lotes", reactivoId ?? "todos", reactivoId ? "" : busqueda.trim()],
    queryFn: () => (reactivoId ? api.lotesPorReactivo(token!, reactivoId) : api.lotes(token!, busqueda, !busqueda.trim())),
    enabled: Boolean(token),
  })

  const lotes = lotesQuery.data ?? lotesVacios
  const reactivoIdUrl = Number(searchParams.get("reactivo_id") ?? "")
  const proveedorIdUrl = Number(searchParams.get("proveedor_id") ?? "")
  const lotesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    return lotes.filter((lote) => {
      if (proveedorIdUrl && lote.proveedor_id !== proveedorIdUrl) {
        return false
      }
      if (!texto) {
        return true
      }
      return [lote.codigo_interno, lote.numero_lote, lote.marca, lote.codigo_proveedor, lote.proveedor, lote.ubicacion, lote.reactivo_nombre, lote.cas_numero]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("es").includes(texto))
    })
  }, [busqueda, lotes, proveedorIdUrl])
  const lotesVista = proveedorIdUrl ? lotesFiltrados : lotes

  const stockTotal = lotesVista.reduce((total, lote) => total + (lote.cantidad_actual ?? 0), 0)
  const proximoVencimiento = lotesVista[0]?.fecha_vencimiento
  const codigoUrl = searchParams.get("codigo")

  function limpiarProveedorFiltro() {
    if (!proveedorIdUrl) {
      return
    }
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("proveedor_id")
    setSearchParams(siguiente, { replace: true })
  }

  useEffect(() => {
    if (!reactivoIdUrl || !reactivos.some((reactivo) => reactivo.id === reactivoIdUrl)) {
      return
    }
    setReactivoId(reactivoIdUrl)
    setLoteSeleccionadoId(null)
    setBusqueda("")
    setMensaje(null)
    setErrorLocal(null)
  }, [reactivoIdUrl, reactivos])

  useEffect(() => {
    if (!token || !codigoUrl) {
      return
    }
    let activo = true
    setErrorLocal(null)
    setMensaje(null)
    api.lotePorCodigo(token, codigoUrl)
      .then((lote) => {
        if (!activo) {
          return
        }
        setReactivoId(null)
        setLoteSeleccionadoId(lote.id)
        setBusqueda(lote.codigo_interno)
        setMensaje(t("lotes.msgSeleccionadoMov", { codigo: lote.codigo_interno }))
      })
      .catch((error) => {
        if (!activo) {
          return
        }
        setErrorLocal(mutationError(error, t("lotes.errAbrirMov")))
      })
    return () => {
      activo = false
    }
  }, [codigoUrl, token, t])

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>{t("lotes.titulo")}</h1>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            {t("lotes.descripcion")}
          </p>
        </div>
        <div className="text-sm tracking-[0.16px] text-cds-textSecondary">
          {lotesQuery.isLoading ? t("lotes.cargando") : t("lotes.activosCount", { n: lotesFiltrados.length })}
        </div>
      </div>

      {reactivosQuery.isError ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          {t("lotes.loadErrorReactivos")}
        </div>
      ) : null}

      {mensaje ? (
        <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      {proveedorIdUrl ? (
        <div className="mb-4 flex flex-col gap-3 border-l-4 border-cds-focus bg-cds-layer01 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{t("lotes.filtroProveedorActivo")}</span>
          <Button type="button" variant="ghost" size="compact" onClick={limpiarProveedorFiltro}>
            {t("lotes.quitarFiltro")}
          </Button>
        </div>
      ) : null}

      <ListadoLotes
          token={token!}
          puedeEditar={puedeCrearLote}
          puedeImprimir={puedeImprimir}
          reactivos={reactivos}
          reactivoSeleccionado={reactivoSeleccionado}
          lotes={lotesFiltrados}
          lotesTodos={lotesVista}
          loteSeleccionadoId={loteSeleccionadoId}
          isLoading={lotesQuery.isLoading}
          busqueda={busqueda}
          stockTotal={stockTotal}
          proximoVencimiento={proximoVencimiento}
          onReactivoChange={(value) => {
            limpiarProveedorFiltro()
            setReactivoId(value)
            setLoteSeleccionadoId(null)
          }}
          onLoteSelect={setLoteSeleccionadoId}
          onBusquedaChange={setBusqueda}
          onBuscarTexto={async (texto) => {
            setErrorLocal(null)
            setMensaje(null)
            setReactivoId(null)
            setLoteSeleccionadoId(null)
            limpiarProveedorFiltro()
            setBusqueda(texto)
            await queryClient.invalidateQueries({ queryKey: ["lotes"] })
          }}
          onBuscarCodigoInterno={async (codigo) => {
            setErrorLocal(null)
            setMensaje(null)
            limpiarProveedorFiltro()
            try {
              const lote = await api.lotePorCodigo(token!, codigo)
              setReactivoId(null)
              setLoteSeleccionadoId(lote.id)
              setBusqueda(lote.codigo_interno)
              setMensaje(t("lotes.msgEncontrado", { codigo: lote.codigo_interno }))
            } catch (error) {
              setErrorLocal(mutationError(error, t("lotes.errBuscarLote")))
            }
          }}
          onUpdated={async (mensajeActualizado) => {
            await queryClient.invalidateQueries({ queryKey: ["lotes"] })
            await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            if (mensajeActualizado) {
              setMensaje(mensajeActualizado)
            }
          }}
        />
    </section>
  )
}

function ListadoLotes({
  token,
  puedeEditar,
  puedeImprimir,
  reactivos,
  reactivoSeleccionado,
  lotes,
  lotesTodos,
  loteSeleccionadoId,
  isLoading,
  busqueda,
  stockTotal,
  proximoVencimiento,
  onReactivoChange,
  onLoteSelect,
  onBusquedaChange,
  onBuscarTexto,
  onBuscarCodigoInterno,
  onUpdated,
}: {
  token: string
  puedeEditar: boolean
  puedeImprimir: boolean
  reactivos: Reactivo[]
  reactivoSeleccionado: Reactivo | null
  lotes: Lote[]
  lotesTodos: Lote[]
  loteSeleccionadoId: number | null
  isLoading: boolean
  busqueda: string
  stockTotal: number
  proximoVencimiento?: string
  onReactivoChange: (id: number | null) => void
  onLoteSelect: (id: number | null) => void
  onBusquedaChange: (value: string) => void
  onBuscarTexto: (texto: string) => void | Promise<void>
  onBuscarCodigoInterno: (codigo: string) => void | Promise<void>
  onUpdated: (mensaje?: string) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const loteEditar = useMemo(() => {
    if (!loteSeleccionadoId) {
      return null
    }
    return lotesTodos.find((lote) => lote.id === loteSeleccionadoId) ?? null
  }, [loteSeleccionadoId, lotesTodos])

  const pendientes = reactivos.filter(esPendiente)
  const reactivosConLote = new Set(lotesTodos.map((lote) => lote.reactivo_id)).size
  // Tono del tile "Próximo vencimiento": coral si el más próximo ya venció
  // (señal de descarte), ámbar si vence ≤30 d, neutro si está lejos.
  const proximoVencTone: MetricTone = !proximoVencimiento
    ? "neutral"
    : daysUntil(proximoVencimiento) < 0
      ? "error"
      : daysUntil(proximoVencimiento) <= 30
        ? "warning"
        : "neutral"
  // Lote FIFO: el primero no vencido (la lista viene ordenada por vencimiento).
  const fifoLoteHint = reactivoSeleccionado
    ? lotesTodos.find((lote) => daysUntil(lote.fecha_vencimiento) >= 0)
    : undefined

  useEffect(() => {
    if (!isLoading && loteSeleccionadoId && !lotesTodos.some((lote) => lote.id === loteSeleccionadoId)) {
      onLoteSelect(null)
    }
  }, [isLoading, loteSeleccionadoId, lotesTodos, onLoteSelect])

  // Al seleccionar un lote, traer el panel de edición a la vista: la tabla puede
  // ser larga y el panel quedaba lejos.
  const editarRef = useRef<HTMLDivElement>(null)
  const loteEditarId = loteEditar?.id
  useEffect(() => {
    if (loteEditarId) {
      editarRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [loteEditarId])

  return (
    <>
      {pendientes.length ? (
        <div className="mb-4 bg-cds-layer01 p-4">
          <h2 className="text-[20px] font-semibold leading-[1.4]">{t("lotes.pendientesTitulo")}</h2>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            {t("lotes.pendientesDesc", { n: pendientes.length })}
          </p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <label className="block">
          <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("lotes.reactivo")}</span>
          <select
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={reactivoSeleccionado?.id ?? ""}
            onChange={(event) => onReactivoChange(event.target.value ? Number(event.target.value) : null)}
            disabled={reactivos.length === 0}
          >
            <option value="">{t("lotes.todosReactivos")}</option>
            {reactivos.map((reactivo) => (
              <option key={reactivo.id} value={reactivo.id}>
                {reactivo.nombre} | stock: {formatNumber(reactivo.stock_total)} {reactivo.unidad} | ID {reactivo.id}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("lotes.buscarLote")}</span>
          <form
            className="grid gap-2 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              const texto = busqueda.trim()
              if (texto.toUpperCase().startsWith("LAB-")) {
                void onBuscarCodigoInterno(texto)
                return
              }
              if (texto) {
                void onBuscarTexto(texto)
              }
            }}
          >
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
                placeholder={t("lotes.buscarPlaceholder")}
              />
            </div>
            <Button type="submit" variant="secondary" size="compact" disabled={!busqueda.trim()}>
              {t("common.buscar")}
            </Button>
          </form>
        </label>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <MetricTile
          label={reactivoSeleccionado ? t("lotes.metricStockActivo") : t("lotes.metricReactivosConLote")}
          value={reactivoSeleccionado ? `${formatNumber(stockTotal)} ${reactivoSeleccionado.unidad}` : String(reactivosConLote)}
          icon={Package}
        />
        <MetricTile label={t("lotes.metricLotesActivos")} value={String(lotesTodos.length)} icon={Package} />
        <MetricTile label={t("lotes.metricProximoVenc")} value={formatDate(proximoVencimiento)} icon={CalendarClock} tone={proximoVencTone} />
      </div>

      {fifoLoteHint ? (
        <p className="mb-3 flex items-center gap-1.5 text-xs tracking-[0.32px] text-cds-textSecondary">
          <ArrowRight size={14} aria-hidden="true" />
          {t("lotes.proximoUsar")} <span className="font-mono text-cds-textPrimary">{fifoLoteHint.codigo_interno}</span>
        </p>
      ) : null}

      <LotesTable lotes={lotes} isLoading={isLoading} selectedId={loteSeleccionadoId} onSelect={onLoteSelect} />

      {puedeEditar && loteEditar ? (
        <div ref={editarRef} className="mt-6 scroll-mt-4">
          <EditarLoteForm token={token} lote={loteEditar} lotes={lotesTodos} onSelect={onLoteSelect} onUpdated={onUpdated} />
        </div>
      ) : puedeEditar ? (
        <div className="mt-6 bg-cds-layer01 p-4 text-sm text-cds-textSecondary">
          {t("lotes.seleccionaParaEditar")}
        </div>
      ) : null}

      {puedeImprimir && lotesTodos.length ? (
        <EtiquetasLotes token={token} lotes={lotesTodos} reactivoNombre={reactivoSeleccionado?.nombre ?? t("lotes.fallbackNombre")} />
      ) : null}
    </>
  )
}

// Pill de confianza: NEUTRO a propósito. El color semántico (verde/ámbar/azul)
// lo lleva el borde de la tarjeta para la DECISIÓN (match/ambiguo/nuevo); pintar
// también la confianza con esos colores confundía (ej. "ambiguo" + pill verde
// "confianza alta" se leía como contradicción). Acá la confianza es solo dato.
const CONFIANZA_PILL = "bg-cds-layer01 text-cds-textSecondary ring-1 ring-cds-borderSubtle"

export function NuevoLoteForm({
  token,
  usuarioId,
  reactivos,
  onSuccess,
  modoInicial = "manual",
}: {
  token: string
  usuarioId: number
  reactivos: Reactivo[]
  onSuccess: (reactivoId: number, mensaje: string, quedarseEnFormulario?: boolean, codigoInterno?: string | null) => void | Promise<void>
  modoInicial?: "manual" | "vision" | "multiple"
}) {
  const { t } = useTranslation()
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [reactivoId, setReactivoId] = useState<number | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [modoCarga, setModoCarga] = useState<"manual" | "vision" | "multiple">(modoInicial)
  const [datosExtraidos, setDatosExtraidos] = useState<DatosEtiqueta | null>(null)
  const [matchResult, setMatchResult] = useState<ReactivoMatch | null>(null)
  // Sub-form para crear un reactivo nuevo cuando el match dice "nuevo" (o el
  // usuario decide que no es ninguno del catálogo). Unidad base prellenada de la
  // foto pero editable; stock mínimo arranca en 0 (se ajusta después).
  const [creandoReactivo, setCreandoReactivo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoUnidad, setNuevoUnidad] = useState("")
  const [nuevoCas, setNuevoCas] = useState("")
  const [nuevoUbicacion, setNuevoUbicacion] = useState("")
  const [nuevoCategoria, setNuevoCategoria] = useState("")
  const [cantidadEnvases, setCantidadEnvases] = useState("2")
  const [cantidadInicial, setCantidadInicial] = useState("")
  const [unidadIngreso, setUnidadIngreso] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState(isoDatePlusDays(365))
  const [numeroLote, setNumeroLote] = useState("")
  const [marca, setMarca] = useState("")
  const [casNumero, setCasNumero] = useState("")
  const [codigoProveedor, setCodigoProveedor] = useState("")
  // Proveedor del lote: ahora se elige del registro (FK). proveedorSugerido
  // guarda el fabricante extraído de la foto que no matcheó ninguno, para
  // prellenar el alta inline de proveedor nuevo.
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [proveedorSugerido, setProveedorSugerido] = useState("")
  const [costoTotal, setCostoTotal] = useState("0")
  const [altaMultipleResultado, setAltaMultipleResultado] = useState<LoteCrearMultipleResponse | null>(null)
  const crearMutation = useMutation({
    mutationFn: (data: LoteCrear) => api.crearLote(token, data),
  })
  const crearMultipleMutation = useMutation({
    mutationFn: (data: LoteCrearMultiple) => api.crearLotesMultiples(token, data),
  })
  const pdfAltaMultipleMutation = useMutation({
    mutationFn: (ids: number[]) => api.etiquetasPdf(token, ids, 1),
  })
  const visionMutation = useMutation({
    mutationFn: (file: File) => api.extraerEtiquetaLote(token, file),
  })
  const queryClient = useQueryClient()
  const matchMutation = useMutation({
    mutationFn: (data: ReactivoMatchRequest) => api.matchReactivo(token, data),
  })
  const crearReactivoMutation = useMutation({
    mutationFn: (data: ReactivoCrear) => api.crearReactivo(token, data),
  })

  const proveedoresQuery = useQuery({
    queryKey: ["proveedores"],
    queryFn: () => api.proveedores(token),
    enabled: Boolean(token),
  })
  const proveedoresLista = proveedoresQuery.data ?? proveedoresVacios
  // Nombre del proveedor elegido: snapshot de texto que viaja con el lote (el
  // backend igual lo re-deriva de la FK, pero lo mandamos por claridad/legacy).
  const proveedorNombre =
    proveedorId != null ? proveedoresLista.find((p) => p.id === proveedorId)?.nombre ?? "" : ""

  // Match del fabricante extraído de la foto contra un proveedor registrado
  // (nombre exacto, sin distinguir mayúsculas/acentos mínimos). Si coincide, se
  // preselecciona; si no, queda para el alta inline.
  function matchProveedor(fabricante: string | null | undefined): number | null {
    const objetivo = (fabricante ?? "").trim().toLocaleLowerCase("es")
    if (!objetivo) {
      return null
    }
    const encontrado = proveedoresLista.find(
      (p) => p.nombre.trim().toLocaleLowerCase("es") === objetivo,
    )
    return encontrado?.id ?? null
  }

  async function crearProveedorInline(nombre: string): Promise<number | null> {
    const res = await api.crearProveedor(token, { nombre })
    await queryClient.invalidateQueries({ queryKey: ["proveedores"] })
    await queryClient.refetchQueries({ queryKey: ["proveedores"] })
    return res.id
  }

  const reactivosFiltrados = soloPendientes ? reactivos.filter(esPendiente) : reactivos
  const reactivo = useMemo(() => {
    if (!reactivosFiltrados.length) {
      return null
    }
    if (!reactivoId) {
      return reactivosFiltrados[0]
    }
    return reactivosFiltrados.find((item) => item.id === reactivoId) ?? reactivosFiltrados[0]
  }, [reactivoId, reactivosFiltrados])

  const unidadesQuery = useQuery({
    queryKey: ["unidades-compatibles", reactivo?.unidad],
    queryFn: () => api.unidadesCompatibles(token, reactivo!.unidad),
    enabled: Boolean(token && reactivo?.unidad),
  })
  const unidadesDisponibles = unidadesQuery.data?.unidades ?? (reactivo ? [reactivo.unidad] : [])
  const unidadSeleccionada = unidadIngreso || reactivo?.unidad || ""

  async function handleEtiquetaFile(file: File | null) {
    if (!file) {
      return
    }
    setErrorLocal(null)
    setAltaMultipleResultado(null)
    setMatchResult(null)
    setCreandoReactivo(false)
    try {
      const datos = await visionMutation.mutateAsync(file)
      if (!datos.es_etiqueta_reactivo) {
        setDatosExtraidos(null)
        setErrorLocal(t("lotes.imagenNoEtiqueta"))
        return
      }
      setDatosExtraidos(datos)
      if (datos.cantidad_envase !== null && datos.cantidad_envase !== undefined) {
        setCantidadInicial(String(datos.cantidad_envase))
      }
      if (datos.unidad_envase && unidadesDisponibles.includes(datos.unidad_envase)) {
        setUnidadIngreso(datos.unidad_envase)
      }
      if (datos.fecha_vencimiento) {
        setFechaVencimiento(datos.fecha_vencimiento)
      }
      setNumeroLote(datos.numero_lote ?? "")
      setMarca(datos.fabricante ?? "")
      setCasNumero(datos.cas_numero ?? "")
      setCodigoProveedor(datos.codigo_proveedor ?? "")
      // Proveedor: si el fabricante extraído coincide con uno registrado, se
      // preselecciona; si no, se guarda como sugerencia para el alta inline.
      const proveedorMatch = matchProveedor(datos.fabricante)
      setProveedorId(proveedorMatch)
      setProveedorSugerido(proveedorMatch == null ? datos.fabricante ?? "" : "")

      // Wizard foto-primero: sugerir el reactivo del catálogo. Es asistencia: el
      // usuario confirma/cambia abajo y nada se guarda hasta crear el lote.
      try {
        const sugerencia = await matchMutation.mutateAsync({
          nombre_extraido: datos.nombre_compuesto,
          cas_numero: datos.cas_numero,
          unidad_envase: datos.unidad_envase,
        })
        setMatchResult(sugerencia)
        if (sugerencia.decision === "match" && sugerencia.match) {
          setSoloPendientes(false)
          setReactivoId(sugerencia.match.reactivo_id)
        }
        // Prellenar los campos del reactivo nuevo (editables) para la rama "nuevo"
        // o si el usuario decide que no es ninguno del catálogo.
        const sug = sugerencia.sugerencia_nuevo
        setNuevoNombre(sug?.nombre ?? datos.nombre_compuesto ?? "")
        setNuevoUnidad(sug?.unidad_base ?? datos.unidad_envase ?? "")
        setNuevoCas(sug?.cas_numero ?? datos.cas_numero ?? "")
        setCreandoReactivo(sugerencia.decision === "nuevo")
      } catch {
        // Si el match falla (p. ej. OpenAI caído), no bloqueamos: el usuario
        // elige el reactivo a mano en el desplegable de abajo.
        setMatchResult(null)
      }
    } catch (error) {
      setDatosExtraidos(null)
      setErrorLocal(mutationError(error, t("lotes.errExtraer")))
    }
  }

  function elegirCandidato(c: ReactivoCandidato) {
    setSoloPendientes(false)
    setReactivoId(c.reactivo_id)
    setCreandoReactivo(false)
  }

  // "No es este / ninguno del catálogo": el usuario resuelve a mano (desplegable).
  function descartarSugerencia() {
    setReactivoId(null)
    setCreandoReactivo(false)
  }

  async function handleCrearReactivo() {
    setErrorLocal(null)
    const nombre = nuevoNombre.trim()
    const unidad = nuevoUnidad.trim()
    if (!nombre) {
      setErrorLocal(t("lotes.errNombreReactivo"))
      return
    }
    if (!unidad) {
      setErrorLocal(t("lotes.errUnidadReactivo"))
      return
    }
    try {
      const creado = await crearReactivoMutation.mutateAsync({
        nombre,
        unidad,
        stock_minimo: 0,
        ubicacion: nullable(nuevoUbicacion),
        categoria: nullable(nuevoCategoria),
        cas_numero: nullable(nuevoCas),
      })
      await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
      await queryClient.refetchQueries({ queryKey: ["reactivos"] })
      setSoloPendientes(false)
      setReactivoId(creado.id)
      setCreandoReactivo(false)
      setMatchResult(null)
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errCrearReactivo")))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!reactivo) {
      return
    }
    setErrorLocal(null)
    setAltaMultipleResultado(null)
    try {
      const cantidadParseada = requireFiniteNumber(
        parseFormNumber(cantidadInicial),
        t("lotes.errCantidad"),
      )
      const cantidadEnvasesParseada = requireFiniteNumber(
        parseFormNumber(cantidadEnvases),
        t("lotes.errCantidadEnvases"),
      )
      const costoParseado = requireFiniteNumber(
        parseFormNumber(costoTotal, 0),
        t("lotes.errCosto"),
      )
      if (cantidadParseada <= 0) {
        throw new Error(t("lotes.errCantidadMayorCero"))
      }
      if (costoParseado < 0) {
        throw new Error(t("lotes.errCostoNegativo"))
      }
      if (modoCarga === "multiple" && (!Number.isInteger(cantidadEnvasesParseada) || cantidadEnvasesParseada < 1)) {
        throw new Error(t("lotes.errEnvasesEntero"))
      }
      let mensajeCreacion = ""
      let codigoCreado: string | null = null
      if (modoCarga === "multiple") {
        const payload: LoteCrearMultiple = {
          reactivo_id: reactivo.id,
          cantidad_envases: cantidadEnvasesParseada,
          cantidad_por_envase: cantidadParseada,
          unidad_ingreso: unidadSeleccionada || reactivo.unidad,
          fecha_vencimiento: fechaVencimiento,
          proveedor: proveedorNombre,
          proveedor_id: proveedorId,
          costo_total_compra: costoParseado,
          usuario_id: usuarioId,
          numero_lote: nullable(numeroLote),
          marca: nullable(marca),
          cas_numero: nullable(casNumero),
          codigo_proveedor: nullable(codigoProveedor),
        }
        const resultado = await crearMultipleMutation.mutateAsync(payload)
        setAltaMultipleResultado(resultado)
        mensajeCreacion = t("lotes.msgEnvasesCreados", { n: resultado.cantidad_envases, nombre: reactivo.nombre })
      } else {
        const payload: LoteCrear = {
          reactivo_id: reactivo.id,
          cantidad_inicial: cantidadParseada,
          unidad_ingreso: unidadSeleccionada || reactivo.unidad,
          fecha_vencimiento: fechaVencimiento,
          proveedor: proveedorNombre,
          proveedor_id: proveedorId,
          costo_total: costoParseado,
          usuario_id: usuarioId,
          numero_lote: nullable(numeroLote),
          marca: nullable(marca),
          cas_numero: nullable(casNumero),
          codigo_proveedor: nullable(codigoProveedor),
        }
        const resultado = await crearMutation.mutateAsync(payload)
        codigoCreado = resultado.codigo_interno
        mensajeCreacion = t("lotes.msgLoteCreado", { codigo: resultado.codigo_interno })
      }
      formElement.reset()
      setDatosExtraidos(null)
      setCantidadEnvases("2")
      setCantidadInicial("")
      setUnidadIngreso("")
      setFechaVencimiento(isoDatePlusDays(365))
      setNumeroLote("")
      setMarca("")
      setCasNumero("")
      setCodigoProveedor("")
      setProveedorId(null)
      setProveedorSugerido("")
      setCostoTotal("0")
      await onSuccess(reactivo.id, mensajeCreacion, modoCarga === "multiple", codigoCreado)
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errCrearLote")))
    }
  }

  async function descargarEtiquetasAltaMultiple() {
    if (!altaMultipleResultado?.lotes.length) {
      return
    }
    setErrorLocal(null)
    try {
      const ids = altaMultipleResultado.lotes.map((lote) => lote.id)
      const blob = await pdfAltaMultipleMutation.mutateAsync(ids)
      downloadBlob(blob, "etiquetas_alta_multiple.pdf")
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errPdfEtiquetas")))
    }
  }

  if (!reactivos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("lotes.primeroCrearReactivo")}</div>
  }

  return (
    <form className="max-w-5xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[24px] leading-[1.33]">{t("lotes.registrarEntrada")}</h2>
          <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
            {t("lotes.cargaManualDesc")}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm tracking-[0.16px]">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(event) => {
              setSoloPendientes(event.target.checked)
              setReactivoId(null)
            }}
          />
          {t("lotes.soloPendientes")}
        </label>
      </div>

      <div className="mb-5">
        <div className="mb-5">
          <div className="mb-2 text-xs tracking-[0.32px] text-cds-textSecondary">{t("lotes.modoCarga")}</div>
          <div className="flex flex-wrap gap-px bg-cds-borderSubtle">
            <button
              type="button"
              onClick={() => {
                setModoCarga("manual")
                setDatosExtraidos(null)
                setAltaMultipleResultado(null)
              }}
              className={cn(
                "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px]",
                modoCarga === "manual" && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
              )}
            >
              {t("lotes.modoManual")}
            </button>
            <button
              type="button"
              onClick={() => {
                setModoCarga("vision")
                setAltaMultipleResultado(null)
              }}
              className={cn(
                "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px]",
                modoCarga === "vision" && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
              )}
            >
              {t("lotes.modoVision")}
            </button>
            <button
              type="button"
              onClick={() => {
                setModoCarga("multiple")
                setDatosExtraidos(null)
                setAltaMultipleResultado(null)
              }}
              className={cn(
                "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px]",
                modoCarga === "multiple" && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
              )}
            >
              {t("lotes.modoMultiple")}
            </button>
          </div>
        </div>

        {modoCarga === "vision" ? (
          <div className="mb-5 border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm tracking-[0.16px]">
              <Camera size={18} aria-hidden="true" />
              {t("lotes.fotoEtiqueta")}
            </div>
            <input
              id="foto_etiqueta_lote"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => void handleEtiquetaFile(event.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="foto_etiqueta_lote"
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 border border-cds-buttonPrimary px-4 text-sm tracking-[0.16px] text-cds-linkPrimary transition-colors hover:bg-cds-layer01 sm:h-10 sm:w-auto sm:justify-start"
            >
              <Camera size={18} aria-hidden="true" />
              <span className="sm:hidden">{t("lotes.tomarFoto")}</span>
              <span className="hidden sm:inline">{t("lotes.seleccionarImagen")}</span>
            </label>
            <p className="mt-3 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
              {t("lotes.iaPrellenaDesc")}
            </p>
            {visionMutation.isPending ? (
              <p className="mt-3 text-sm text-cds-textSecondary">{t("lotes.extrayendo")}</p>
            ) : null}
            {datosExtraidos?.nombre_compuesto ? (
              <p className="mt-3 text-sm">
                {t("lotes.compuestoLabel")} <strong>{datosExtraidos.nombre_compuesto}</strong>
              </p>
            ) : null}
            {datosExtraidos?.notas ? (
              <p className="mt-2 text-sm text-cds-textSecondary">{t("lotes.notasLabel")} {datosExtraidos.notas}</p>
            ) : null}
          </div>
        ) : null}

        {matchMutation.isPending ? (
          <p className="mb-5 text-sm text-cds-textSecondary">{t("lotes.buscandoCatalogo")}</p>
        ) : null}

        {modoCarga === "vision" && matchResult ? (
          <div className="mb-5">
            {matchResult.decision === "match" && matchResult.match ? (
              <div className="border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm tracking-[0.16px]">
                  <Check size={18} className="text-cds-supportSuccess" aria-hidden="true" />
                  <span>{t("lotes.matchCoincide")}</span>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.16px]", CONFIANZA_PILL)}>
                    {t("lotes.confianza", { n: matchResult.confianza })}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {t("lotes.matchDetectePre")} <strong>{datosExtraidos?.nombre_compuesto}</strong> → <strong>{matchResult.match.nombre}</strong>
                  {matchResult.match.cas_numero ? <span className="text-cds-textSecondary"> · {t("lotes.casSuffix", { cas: matchResult.match.cas_numero })}</span> : null}
                </p>
                <p className="mt-1 text-xs leading-4 text-cds-textSecondary">{matchResult.razon}</p>
                <p className="mt-2 text-xs text-cds-textSecondary">
                  {t("lotes.quedoSeleccionado")}{" "}
                  <button type="button" onClick={descartarSugerencia} className="text-cds-linkPrimary underline">{t("lotes.elegiOtro")}</button>.
                </p>
                <button
                  type="button"
                  onClick={() => setCreandoReactivo(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-cds-linkPrimary"
                >
                  <Plus size={16} aria-hidden="true" /> {t("lotes.noEsEsteCrear")}
                </button>
              </div>
            ) : null}

            {matchResult.decision === "ambiguo" ? (
              <div className="border-l-4 border-lab-warm bg-cds-background px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm tracking-[0.16px]">
                  <span>{t("lotes.ambiguoElegi")}</span>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.16px]", CONFIANZA_PILL)}>
                    {t("lotes.confianza", { n: matchResult.confianza })}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-4 text-cds-textSecondary">{matchResult.razon}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchResult.candidatos.map((candidato) => (
                    <button
                      key={candidato.reactivo_id}
                      type="button"
                      onClick={() => elegirCandidato(candidato)}
                      className={cn(
                        "inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition-colors",
                        reactivoId === candidato.reactivo_id
                          ? "border-cds-buttonPrimary bg-lab-blueTint text-cds-linkPrimary"
                          : "border-cds-borderSubtle hover:bg-cds-layer01",
                      )}
                    >
                      {reactivoId === candidato.reactivo_id ? <Check size={16} aria-hidden="true" /> : null}
                      {candidato.nombre}
                      {candidato.cas_numero ? <span className="text-cds-textSecondary"> · {candidato.cas_numero}</span> : null}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCreandoReactivo(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-cds-linkPrimary"
                >
                  <Plus size={16} aria-hidden="true" /> {t("lotes.ningunoCrear")}
                </button>
              </div>
            ) : null}

            {matchResult.decision === "nuevo" ? (
              <div className="border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3 text-sm">
                {t("lotes.nuevoNoEncontrado")}
                <p className="mt-1 text-xs leading-4 text-cds-textSecondary">{matchResult.razon}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {modoCarga === "vision" && creandoReactivo ? (
          <div className="mb-5 border-l-4 border-cds-supportInfo bg-cds-layer01 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{t("lotes.crearReactivoNuevo")}</span>
              <button type="button" onClick={() => setCreandoReactivo(false)} className="text-cds-textSecondary hover:text-cds-textPrimary" aria-label={t("lotes.cerrar")}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("lotes.fNuevoNombre")} name="nuevo_reactivo_nombre" value={nuevoNombre} onChange={(event) => setNuevoNombre(event.target.value)} required />
              <Field label={t("lotes.fNuevoUnidad")} name="nuevo_reactivo_unidad" value={nuevoUnidad} onChange={(event) => setNuevoUnidad(event.target.value)} placeholder={t("lotes.fNuevoUnidadPh")} required />
              <Field label={t("lotes.fCas")} name="nuevo_reactivo_cas" value={nuevoCas} onChange={(event) => setNuevoCas(event.target.value)} placeholder={t("lotes.fCasPh")} />
              <Field label={t("lotes.fUbicacion")} name="nuevo_reactivo_ubicacion" value={nuevoUbicacion} onChange={(event) => setNuevoUbicacion(event.target.value)} placeholder={t("lotes.fUbicacionPh")} />
              <Field label={t("lotes.fCategoria")} name="nuevo_reactivo_categoria" value={nuevoCategoria} onChange={(event) => setNuevoCategoria(event.target.value)} placeholder={t("lotes.fCategoriaPh")} />
            </div>
            <p className="mt-2 text-xs leading-4 text-cds-textSecondary">
              {t("lotes.unidadBaseDesc")}
            </p>
            <Button type="button" onClick={() => void handleCrearReactivo()} disabled={crearReactivoMutation.isPending} className="mt-3">
              {crearReactivoMutation.isPending ? t("common.creando") : t("lotes.crearYUsar")}
            </Button>
          </div>
        ) : null}

        <Label className="mb-2" htmlFor="reactivo_nuevo_lote">{t("lotes.reactivoLabel")}</Label>
        <select
          id="reactivo_nuevo_lote"
          className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
          value={reactivo?.id ?? ""}
          onChange={(event) => setReactivoId(Number(event.target.value))}
          disabled={!reactivosFiltrados.length}
        >
          {reactivosFiltrados.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} | stock: {formatNumber(item.stock_total)} {item.unidad} | {item.categoria || t("lotes.sinCategoria")}
            </option>
          ))}
        </select>
      </div>

      {!reactivo ? (
        <div className="border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3 text-sm">
          {t("lotes.noHayReactivosFiltro")}
        </div>
      ) : (
        <>
          <div className="mb-5 border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3 text-sm">
            {t("lotes.unidadBaseInfo", { unidad: reactivo.unidad, id: usuarioId })}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {modoCarga === "multiple" ? (
              <DecimalField
                label={t("lotes.fCantidadEnvases")}
                name="cantidad_envases"
                value={cantidadEnvases}
                onChange={(event) => setCantidadEnvases(event.target.value)}
                required
              />
            ) : null}
            <DecimalField
              label={modoCarga === "multiple" ? t("lotes.fCantidadPorEnvase") : t("lotes.fCantidad")}
              name="cantidad_inicial"
              value={cantidadInicial}
              onChange={(event) => setCantidadInicial(event.target.value)}
              required
            />
            <label className="block">
              <Label className="mb-2" htmlFor="unidad_ingreso">{t("lotes.fUnidadIngreso")}</Label>
              <select
                id="unidad_ingreso"
                name="unidad_ingreso"
                className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                value={unidadSeleccionada}
                onChange={(event) => setUnidadIngreso(event.target.value)}
              >
                {unidadesDisponibles.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label={t("lotes.fFechaVenc")}
              name="fecha_vencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={(event) => setFechaVencimiento(event.target.value)}
              required
            />
            <Field
              label={t("lotes.fNumeroLote")}
              name="numero_lote"
              value={numeroLote}
              onChange={(event) => setNumeroLote(event.target.value)}
              placeholder={t("lotes.fNumeroLotePh")}
            />
            <Field
              label={t("lotes.fMarca")}
              name="marca"
              value={marca}
              onChange={(event) => setMarca(event.target.value)}
              placeholder={t("lotes.fMarcaPh")}
            />
            <Field
              label={t("lotes.fCas")}
              name="cas_numero"
              value={casNumero}
              onChange={(event) => setCasNumero(event.target.value)}
              placeholder="Ej: 64-17-5"
            />
            <Field
              label={t("lotes.fCodigoBarras")}
              name="codigo_proveedor"
              value={codigoProveedor}
              onChange={(event) => setCodigoProveedor(event.target.value)}
              placeholder={t("lotes.fCodigoBarrasPh")}
            />
            <div className="block">
              <Label className="mb-2" htmlFor="lote_proveedor">{t("lotes.fProveedor")}</Label>
              <ProveedorSelect
                id="lote_proveedor"
                proveedores={proveedoresLista}
                value={proveedorId}
                onChange={setProveedorId}
                onCrear={crearProveedorInline}
                sugerenciaNombre={proveedorSugerido}
              />
            </div>
            <DecimalField
              label={modoCarga === "multiple" ? t("lotes.fCostoTotalCompra") : t("lotes.fCostoTotal")}
              name="costo_total"
              value={costoTotal}
              onChange={(event) => setCostoTotal(event.target.value)}
            />
          </div>
        </>
      )}

      {errorLocal ? (
        <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}

      {altaMultipleResultado ? (
        <section className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-[0.16px]">
            <PackagePlus size={18} aria-hidden="true" />
            {t("lotes.envasesCreados", { n: altaMultipleResultado.cantidad_envases })}
          </div>
          <p className="text-sm text-cds-textSecondary">
            {t("lotes.totalGuardado", { total: formatNumber(altaMultipleResultado.cantidad_total_guardada), unidad: altaMultipleResultado.unidad })}
          </p>
          <div className="mt-4 max-h-48 overflow-y-auto border-t border-cds-borderSubtle">
            {altaMultipleResultado.lotes.map((lote) => (
              <div key={lote.id} className="flex min-h-10 items-center justify-between border-b border-cds-borderSubtle text-sm">
                <span className="font-mono text-xs">{lote.codigo_interno}</span>
                <span className="text-cds-textSecondary">ID {lote.id}</span>
              </div>
            ))}
          </div>
          <Button
            className="mt-4"
            type="button"
            variant="secondary"
            onClick={descargarEtiquetasAltaMultiple}
            disabled={pdfAltaMultipleMutation.isPending}
          >
            <Download size={18} aria-hidden="true" />
            {pdfAltaMultipleMutation.isPending ? "Generando..." : "Descargar etiquetas PDF"}
          </Button>
        </section>
      ) : null}

      <Button className="mt-6" type="submit" disabled={!reactivo || crearMutation.isPending || crearMultipleMutation.isPending}>
        <Save size={18} aria-hidden="true" />
        {crearMutation.isPending || crearMultipleMutation.isPending
          ? t("lotes.registrando")
          : modoCarga === "multiple"
            ? t("lotes.registrarEnvases")
            : t("lotes.registrarLote")}
      </Button>
    </form>
  )
}

function EditarLoteForm({
  token,
  lote,
  lotes,
  onSelect,
  onUpdated,
}: {
  token: string
  lote: Lote
  lotes: Lote[]
  onSelect: (id: number) => void
  onUpdated: (mensaje?: string) => void | Promise<void>
}) {
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [mensajeMetadata, setMensajeMetadata] = useState<string | null>(null)
  const [mensajeAjuste, setMensajeAjuste] = useState<string | null>(null)
  const { t } = useTranslation()
  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LoteActualizar }) => api.actualizarLote(token, id, data),
  })
  const ajusteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LoteAjusteStock }) => api.ajustarStockLote(token, id, data),
  })
  const unidadesQuery = useQuery({
    queryKey: ["unidades-compatibles", lote.unidad],
    queryFn: () => api.unidadesCompatibles(token, lote.unidad),
    enabled: Boolean(token && lote.unidad),
  })
  const unidadesDisponibles = unidadesQuery.data?.unidades ?? [lote.unidad]

  const queryClient = useQueryClient()
  const proveedoresQuery = useQuery({
    queryKey: ["proveedores"],
    queryFn: () => api.proveedores(token),
    enabled: Boolean(token),
  })
  const proveedoresLista = proveedoresQuery.data ?? proveedoresVacios
  // Proveedor (FK) del lote en edición. Se re-sincroniza al cambiar de lote
  // porque el form no se re-monta (no tiene key por id).
  const [proveedorId, setProveedorId] = useState<number | null>(lote.proveedor_id ?? null)
  useEffect(() => {
    setProveedorId(lote.proveedor_id ?? null)
  }, [lote.id, lote.proveedor_id])
  const proveedorNombre =
    proveedorId != null ? proveedoresLista.find((p) => p.id === proveedorId)?.nombre ?? "" : ""

  async function crearProveedorInline(nombre: string): Promise<number | null> {
    const res = await api.crearProveedor(token, { nombre })
    await queryClient.invalidateQueries({ queryKey: ["proveedores"] })
    await queryClient.refetchQueries({ queryKey: ["proveedores"] })
    return res.id
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorLocal(null)
    setMensajeMetadata(null)
    setMensajeAjuste(null)
    try {
      const form = new FormData(event.currentTarget)
      const costoTotal = requireFiniteNumber(
        parseFormNumber(form.get("costo_total"), 0),
        t("lotes.errCosto"),
      )
      if (costoTotal < 0) {
        throw new Error(t("lotes.errCostoNegativo"))
      }
      const payload: LoteActualizar = {
        numero_lote: nullable(String(form.get("numero_lote") ?? "")),
        marca: nullable(String(form.get("marca") ?? "")),
        cas_numero: nullable(String(form.get("cas_numero") ?? "")),
        codigo_proveedor: nullable(String(form.get("codigo_proveedor") ?? "")),
        fecha_vencimiento: String(form.get("fecha_vencimiento") ?? lote.fecha_vencimiento),
        proveedor: proveedorNombre,
        proveedor_id: proveedorId,
        costo_total: costoTotal,
      }
      await actualizarMutation.mutateAsync({ id: lote.id, data: payload })
      setMensajeMetadata(t("lotes.metadataActualizada"))
      await onUpdated()
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errActualizarLote")))
    }
  }

  async function handleAjusteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setErrorLocal(null)
    setMensajeMetadata(null)
    setMensajeAjuste(null)
    try {
      const form = new FormData(formElement)
      const cantidadReal = requireFiniteNumber(
        parseFormNumber(form.get("cantidad_real")),
        t("lotes.errCantidadReal"),
      )
      const motivo = String(form.get("motivo_ajuste") ?? "").trim()
      if (cantidadReal < 0) {
        throw new Error(t("lotes.errCantidadRealNeg"))
      }
      if (!motivo) {
        throw new Error(t("lotes.errMotivoObligatorio"))
      }
      const payload: LoteAjusteStock = {
        cantidad_real: cantidadReal,
        unidad_ingreso: String(form.get("unidad_ajuste") ?? lote.unidad),
        motivo,
      }
      const resultado = await ajusteMutation.mutateAsync({ id: lote.id, data: payload })
      formElement.reset()
      setMensajeAjuste(t("lotes.msgStockAjustado", { codigo: resultado.codigo_interno, cantidad: formatNumber(resultado.cantidad_real), unidad: resultado.unidad }))
      await onUpdated()
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errAjustar")))
    }
  }

  return (
    <section className="mt-8 bg-cds-layer01 p-4">
      <form key={`metadata-${lote.id}`} onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[24px] leading-[1.33]">{t("lotes.editarLote")}</h2>
            <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
              {t("lotes.metadataDesc")}
            </p>
          </div>
          <label className="block min-w-[280px]">
            <Label className="mb-2" htmlFor="lote_editar">{t("lotes.lote")}</Label>
            <select
              id="lote_editar"
              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
              value={lote.id}
              onChange={(event) => onSelect(Number(event.target.value))}
            >
              {lotes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo_interno} - {item.numero_lote || t("lotes.sinLoteFabricante")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t("lotes.fNumeroLote")} name="numero_lote" defaultValue={lote.numero_lote ?? ""} />
          <Field label={t("lotes.fMarca")} name="marca" defaultValue={lote.marca ?? ""} />
          <Field label={t("lotes.fCas")} name="cas_numero" defaultValue={lote.cas_numero ?? ""} />
          <Field label={t("lotes.fCodigoProveedor")} name="codigo_proveedor" defaultValue={lote.codigo_proveedor ?? ""} />
          <Field label={t("lotes.fFechaVencEdit")} name="fecha_vencimiento" type="date" defaultValue={lote.fecha_vencimiento} required />
          <div className="block">
            <Label className="mb-2" htmlFor="editar_lote_proveedor">{t("lotes.fProveedor")}</Label>
            <ProveedorSelect
              id="editar_lote_proveedor"
              proveedores={proveedoresLista}
              value={proveedorId}
              onChange={setProveedorId}
              onCrear={crearProveedorInline}
            />
          </div>
          <DecimalField label={t("lotes.fCostoTotalSimple")} name="costo_total" defaultValue={String(lote.costo_total ?? 0)} />
        </div>

        <Button className="mt-6" type="submit" disabled={actualizarMutation.isPending}>
          <Save size={18} aria-hidden="true" />
          {actualizarMutation.isPending ? t("common.guardando") : t("common.guardarCambios")}
        </Button>
        {mensajeMetadata ? (
          <div className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">
            {mensajeMetadata}
          </div>
        ) : null}
      </form>

      <form key={`ajuste-${lote.id}`} className="mt-8 border-t border-cds-borderSubtle pt-6" onSubmit={handleAjusteSubmit}>
        <div className="mb-5">
          <h3>{t("lotes.ajustarStock")}</h3>
          <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
            {t("lotes.stockActualInfo", { cantidad: formatNumber(lote.cantidad_actual), unidad: lote.unidad })}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <DecimalField label={t("lotes.fCantidadReal")} name="cantidad_real" defaultValue={String(lote.cantidad_actual ?? 0)} required />
          <label className="block">
            <Label className="mb-2" htmlFor="unidad_ajuste">{t("lotes.fUnidad")}</Label>
            <select
              id="unidad_ajuste"
              name="unidad_ajuste"
              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
              defaultValue={lote.unidad}
            >
              {unidadesDisponibles.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
          </label>
          <Field
            className="md:col-span-2"
            label={t("lotes.fMotivo")}
            name="motivo_ajuste"
            placeholder={t("lotes.fMotivoPh")}
            required
          />
        </div>
        <Button className="mt-6" type="submit" disabled={ajusteMutation.isPending}>
          <Save size={18} aria-hidden="true" />
          {ajusteMutation.isPending ? t("lotes.ajustando") : t("lotes.registrarAjuste")}
        </Button>
        {mensajeAjuste ? (
          <div className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">
            {mensajeAjuste}
          </div>
        ) : null}
      </form>

      {errorLocal ? (
        <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}
    </section>
  )
}

function EtiquetasLotes({
  token,
  lotes,
  reactivoNombre,
}: {
  token: string
  lotes: Lote[]
  reactivoNombre: string
}) {
  const [loteQrId, setLoteQrId] = useState(lotes[0]?.id ?? 0)
  const [seleccionPdf, setSeleccionPdf] = useState<number[]>([])
  const [posicionInicio, setPosicionInicio] = useState("1")
  const [formato, setFormato] = useState("avery_l7160")
  const [busquedaEtiqueta, setBusquedaEtiqueta] = useState("")
  const [lotesExtra, setLotesExtra] = useState<Lote[]>([])
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const { t } = useTranslation()
  const qrMutation = useMutation({
    mutationFn: (lote: Lote) => api.qrLote(token, lote.id),
  })
  const buscarEtiquetaMutation = useMutation({
    mutationFn: async (texto: string) => {
      const limpio = texto.trim()
      if (/^\d+$/.test(limpio)) {
        return api.lotePorId(token, Number(limpio))
      }
      return api.lotePorCodigo(token, limpio)
    },
  })
  const perfilesQuery = useQuery({
    queryKey: ["etiquetas-perfiles"],
    queryFn: () => api.perfilesEtiquetas(token),
    enabled: Boolean(token),
  })
  const pdfMutation = useMutation({
    mutationFn: ({ ids, posicion, fmt }: { ids: number[]; posicion: number; fmt: string }) =>
      api.etiquetasPdf(token, ids, posicion, fmt),
  })

  // Fallback a Avery hasta que cargue la lista (o si la query falla).
  const perfiles = perfilesQuery.data?.length
    ? perfilesQuery.data
    : [{ clave: "avery_l7160", nombre: "Avery L7160 — A4, 21/hoja", ancho_mm: 63.5, alto_mm: 38.1, grilla: true, por_pagina: 21, max_por_pdf: 210 }]
  const perfilSel = perfiles.find((p) => p.clave === formato) ?? perfiles[0]
  const esGrilla = perfilSel.grilla
  const maxEtiquetasPdf = perfilSel.max_por_pdf ?? (esGrilla ? perfilSel.por_pagina * 10 : 500)

  const lotesDisponibles = useMemo(() => {
    const map = new Map<number, Lote>()
    for (const lote of lotes) {
      map.set(lote.id, lote)
    }
    for (const lote of lotesExtra) {
      map.set(lote.id, lote)
    }
    return [...map.values()]
  }, [lotes, lotesExtra])

  const lotesEtiquetas = useMemo(() => {
    const texto = busquedaEtiqueta.trim().toLocaleLowerCase("es")
    if (!texto) {
      return lotesDisponibles
    }
    return lotesDisponibles.filter((lote) =>
      [
        String(lote.id),
        lote.codigo_interno,
        lote.reactivo_nombre,
        lote.numero_lote,
        lote.marca,
        lote.proveedor,
        lote.cas_numero,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(texto)),
    )
  }, [busquedaEtiqueta, lotesDisponibles])

  const loteQr = lotesDisponibles.find((lote) => lote.id === loteQrId) ?? lotesEtiquetas[0] ?? lotesDisponibles[0]

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function descargarQr() {
    setErrorLocal(null)
    try {
      if (!loteQr) {
        throw new Error(t("lotes.errSeleccionaLote"))
      }
      const blob = await qrMutation.mutateAsync(loteQr)
      downloadBlob(blob, `${loteQr.codigo_interno}.png`)
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errDescargarQr")))
    }
  }

  async function descargarPdf() {
    setErrorLocal(null)
    try {
      // La posición inicial solo aplica a la grilla Avery; en rollo se ignora.
      let posicion = 1
      if (esGrilla) {
        posicion = requireFiniteNumber(parseFormNumber(posicionInicio, 1), t("lotes.errPosicionInvalida"))
        const tope = perfilSel.por_pagina
        if (posicion < 1 || posicion > tope || !Number.isInteger(posicion)) {
          throw new Error(t("lotes.errPosicionRango", { tope }))
        }
      }
      if (!seleccionPdf.length) {
        throw new Error(t("lotes.errSeleccionaLote"))
      }
      if (seleccionPdf.length > maxEtiquetasPdf) {
        throw new Error(t("lotes.errEtiquetasMax", { n: maxEtiquetasPdf }))
      }
      const blob = await pdfMutation.mutateAsync({ ids: seleccionPdf, posicion, fmt: formato })
      const nombre = reactivoNombre.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "")
      downloadBlob(blob, `etiquetas_${nombre || "reactivo"}_${formato}.pdf`)
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errGenerarPdf")))
    }
  }

  function toggleLotePdf(id: number) {
    setSeleccionPdf((actual) =>
      actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id],
    )
  }

  async function buscarLoteParaEtiqueta() {
    const limpio = busquedaEtiqueta.trim()
    if (!limpio) {
      return
    }
    setErrorLocal(null)
    const local = lotesDisponibles.find(
      (lote) => String(lote.id) === limpio || lote.codigo_interno.toLocaleLowerCase("es") === limpio.toLocaleLowerCase("es"),
    )
    try {
      const lote = local ?? await buscarEtiquetaMutation.mutateAsync(limpio)
      setLotesExtra((actual) => (actual.some((item) => item.id === lote.id) ? actual : [lote, ...actual]))
      setLoteQrId(lote.id)
      setSeleccionPdf((actual) => (actual.includes(lote.id) ? actual : [...actual, lote.id]))
    } catch (error) {
      setErrorLocal(mutationError(error, t("lotes.errBuscarLoteEtiqueta")))
    }
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section className="bg-cds-layer01 p-4">
        <div className="mb-5 flex items-center gap-3">
          <QrCode size={20} aria-hidden="true" />
          <h2 className="text-[24px] leading-[1.33]">{t("lotes.reimprimirQr")}</h2>
        </div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={busquedaEtiqueta}
            onChange={(event) => setBusquedaEtiqueta(event.target.value)}
            placeholder={t("lotes.buscarEtiquetaPlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void buscarLoteParaEtiqueta()
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={() => void buscarLoteParaEtiqueta()} disabled={buscarEtiquetaMutation.isPending}>
            <Search size={18} aria-hidden="true" />
            {buscarEtiquetaMutation.isPending ? t("common.buscando") : t("common.buscar")}
          </Button>
        </div>
        <label className="block">
          <Label className="mb-2" htmlFor="lote_qr">{t("lotes.lote")}</Label>
          <select
            id="lote_qr"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={loteQr?.id ?? ""}
            onChange={(event) => setLoteQrId(Number(event.target.value))}
          >
            {lotesEtiquetas.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.codigo_interno} ({formatNumber(lote.cantidad_actual)} {lote.unidad})
              </option>
            ))}
          </select>
        </label>
        <p className="mt-4 font-mono text-sm tracking-[0.16px]">{loteQr?.codigo_interno ?? "—"}</p>
        <Button className="mt-5" type="button" onClick={descargarQr} disabled={qrMutation.isPending || !loteQr}>
          <Download size={18} aria-hidden="true" />
          {qrMutation.isPending ? t("lotes.descargando") : t("lotes.descargarQrPng")}
        </Button>
      </section>

      <section className="bg-cds-layer01 p-4">
        <div className="mb-5 flex items-center gap-3">
          <FileText size={20} aria-hidden="true" />
          <h2 className="text-[24px] leading-[1.33]">{t("lotes.imprimirEtiquetas")}</h2>
        </div>
        <label className="block">
          <Label className="mb-2" htmlFor="formato_etiqueta">{t("lotes.tamanoFormato")}</Label>
          <select
            id="formato_etiqueta"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={formato}
            onChange={(event) => setFormato(event.target.value)}
          >
            {perfiles.map((perfil) => (
              <option key={perfil.clave} value={perfil.clave}>
                {perfil.nombre}
              </option>
            ))}
          </select>
        </label>
        <p className="mb-4 mt-3 text-sm tracking-[0.16px] text-cds-textSecondary">
          {esGrilla
            ? t("lotes.pdfA4Hoja", { n: perfilSel.por_pagina })
            : t("lotes.rolloUnaPorPagina", { ancho: perfilSel.ancho_mm, alto: perfilSel.alto_mm })}
          {" "}
          {t("lotes.maxEtiquetasPdf", { n: maxEtiquetasPdf })}
        </p>
        <div className="max-h-56 overflow-y-auto border-t border-cds-borderSubtle">
          {lotesEtiquetas.map((lote) => (
            <label key={lote.id} className="flex min-h-12 items-center gap-3 border-b border-cds-borderSubtle px-1 text-sm">
              <input
                type="checkbox"
                checked={seleccionPdf.includes(lote.id)}
                onChange={() => toggleLotePdf(lote.id)}
              />
              <span className="font-mono text-xs">{lote.codigo_interno}</span>
              <span className="text-cds-textSecondary">{t("lotes.vence", { fecha: formatDate(lote.fecha_vencimiento) })}</span>
            </label>
          ))}
        </div>
        {esGrilla ? (
          <label className="mt-5 block max-w-48">
            <Label className="mb-2" htmlFor="posicion_inicio">{t("lotes.empezarPosicion")}</Label>
            <Input
              id="posicion_inicio"
              value={posicionInicio}
              onChange={(event) => setPosicionInicio(event.target.value)}
              inputMode="numeric"
            />
          </label>
        ) : null}
        <Button className="mt-5" type="button" onClick={descargarPdf} disabled={pdfMutation.isPending || !seleccionPdf.length}>
          <Download size={18} aria-hidden="true" />
          {pdfMutation.isPending ? t("lotes.generando") : t("lotes.descargarPdf")}
        </Button>
      </section>

      {errorLocal ? (
        <div className="border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm xl:col-span-2">
          {errorLocal}
        </div>
      ) : null}
    </div>
  )
}

// Tono del tile: neutral, error/coral o warning/ámbar. Lo usa "Próximo
// vencimiento" para señalar urgencia (vencido = descartar, ≤30 d = planificar).
type MetricTone = "neutral" | "error" | "warning"

function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string
  value: string
  icon: typeof Package
  tone?: MetricTone
}) {
  // Mismo lenguaje de card que Dashboard y Reactivos: borde propio, acento
  // izquierdo de 3px que codifica la severidad, label mono en mayúsculas (con el
  // ícono a la derecha) y valor mono en peso regular, coloreado por tono.
  const card =
    tone === "error"
      ? "bg-lab-critTint shadow-[inset_3px_0_0_var(--cds-support-error)]"
      : tone === "warning"
        ? "bg-lab-warmTint shadow-[inset_3px_0_0_var(--lab-warm)]"
        : "bg-cds-layer01 shadow-[inset_3px_0_0_var(--lab-blue)]"
  return (
    <article className={cn("border border-cds-borderSubtle p-[18px_20px]", card)}>
      <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.09em] text-cds-textSecondary">
        <span>{label}</span>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div
        className={cn(
          "mt-2.5 font-mono text-[34px] leading-none",
          tone === "error" && "text-cds-supportError",
          tone === "warning" && "text-lab-warmFg",
        )}
      >
        {value}
      </div>
    </article>
  )
}

// Barra de consumo del frasco: cuánto queda (cantidad_actual / cantidad_inicial)
// en petróleo, con el % a la derecha. Muestra qué tan agotado está cada lote.
function ConsumoBar({ actual, inicial, unidad }: { actual: number; inicial: number; unidad: string }) {
  const { t } = useTranslation()
  if (inicial <= 0) {
    return <span className="font-mono text-[11px] text-cds-textSecondary">—</span>
  }
  const pct = Math.round((actual / inicial) * 100)
  const width = Math.min(100, Math.max(0, pct))
  // El inicial absoluto deja de tener columna propia; queda a un hover de la barra.
  return (
    <div className="flex items-center gap-2" title={`${t("lotes.thInicial")}: ${formatNumber(inicial)} ${unidad}`}>
      <div className="relative h-1.5 w-full max-w-[120px] overflow-hidden bg-cds-borderSubtle">
        <div className="absolute inset-y-0 left-0" style={{ width: `${width}%`, backgroundColor: "var(--lab-blue)" }} />
      </div>
      <span className="min-w-[34px] text-right font-mono text-[11px] text-cds-textSecondary">{pct}%</span>
    </div>
  )
}

// Semáforo de vencimiento: punto de color + fecha + texto relativo coloreado
// (vencido · hace N d / vence hoy / en N d).
function VencimientoCelda({ fecha }: { fecha: string | null | undefined }) {
  const { t } = useTranslation()
  if (!fecha) {
    return <span className="text-cds-textSecondary">-</span>
  }
  const dias = daysUntil(fecha)
  const tone = vencimientoTone(dias)
  const color = vencColor[tone]
  const relativo =
    dias < 0 ? t("lotes.vencidoHace", { n: Math.abs(dias) }) : dias === 0 ? t("lotes.venceHoy") : t("lotes.venceEnDias", { n: dias })
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="flex flex-col">
        <span className="font-mono text-cds-textPrimary">{formatDate(fecha)}</span>
        <span className="text-[11px]" style={{ color }}>
          {relativo}
        </span>
      </span>
    </div>
  )
}

function LotesTable({
  lotes,
  isLoading,
  selectedId,
  onSelect,
}: {
  lotes: Lote[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()
  // Marca FIFO: por reactivo, el primer lote no vencido (la lista ya viene
  // ordenada ascendente por vencimiento). Es el próximo a usar.
  const fifoLoteIds = useMemo(() => {
    const ids = new Set<number>()
    const conFifo = new Set<number>()
    for (const lote of lotes) {
      if (conFifo.has(lote.reactivo_id)) continue
      if (daysUntil(lote.fecha_vencimiento) >= 0) {
        ids.add(lote.id)
        conFifo.add(lote.reactivo_id)
      }
    }
    return ids
  }, [lotes])

  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }

  if (lotes.length === 0) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("lotes.noHayLotes")}</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[1360px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("lotes.thQr")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thReactivo")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thLoteFab")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thMarca")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thCas")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thCodProveedor")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thIngreso")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("lotes.thStock")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thConsumo")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thVencimiento")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thProveedor")}</th>
            <th className="h-10 px-4 font-normal">{t("lotes.thUbicacion")}</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote) => {
            const dias = daysUntil(lote.fecha_vencimiento)
            const vencido = dias < 0
            const porVencer = dias >= 0 && dias <= 30
            return (
              <tr
                key={lote.id}
                className={cn(
                  "cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01",
                  // Vencido: acento coral (descartar). Por vencer (≤30 d): ámbar.
                  vencido && "bg-lab-critTint/60 shadow-[inset_2px_0_0_var(--cds-support-error)]",
                  porVencer && "bg-lab-warmTint/60 shadow-[inset_2px_0_0_var(--cds-support-warning)]",
                  selectedId === lote.id && "bg-cds-layer01 shadow-[inset_2px_0_0_var(--cds-focus)]",
                )}
                onClick={() => onSelect(lote.id)}
              >
                <td className="h-12 px-4 font-mono text-xs tracking-[0.16px]">
                  <span className="inline-flex items-center gap-2">
                    {lote.codigo_interno}
                    {fifoLoteIds.has(lote.id) ? (
                      <span className="rounded-full bg-lab-blueTint px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-[0.16px] text-cds-linkPrimary">
                        FIFO
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="h-12 px-4 font-semibold tracking-[0.16px]">{lote.reactivo_nombre}</td>
                <td className="h-12 px-4">{lote.numero_lote || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.marca || "-"}</td>
                <td className="h-12 px-4 font-mono text-xs text-cds-textSecondary">{lote.cas_numero || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.codigo_proveedor || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{formatDate(lote.fecha_ingreso)}</td>
                <td className="h-12 px-4 text-right font-mono">
                  {formatNumber(lote.cantidad_actual)} {lote.unidad}
                </td>
                <td className="h-12 px-4">
                  <ConsumoBar actual={lote.cantidad_actual} inicial={lote.cantidad_inicial} unidad={lote.unidad} />
                </td>
                <td className="h-12 px-4">
                  <VencimientoCelda fecha={lote.fecha_vencimiento} />
                </td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.proveedor || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.ubicacion || "-"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Select de proveedor del registro + alta inline. Elegís uno de la lista o creás
// uno nuevo ahí mismo (queda en el módulo Proveedores y se selecciona solo). Lo
// que viaja al lote es la FK (proveedor_id); el conteo del módulo cuenta por ella.
function ProveedorSelect({
  id,
  proveedores,
  value,
  onChange,
  onCrear,
  sugerenciaNombre,
}: {
  id?: string
  proveedores: Proveedor[]
  value: number | null
  onChange: (value: number | null) => void
  onCrear: (nombre: string) => Promise<number | null>
  sugerenciaNombre?: string
}) {
  const { t } = useTranslation()
  const [modoNuevo, setModoNuevo] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState("")
  const [creando, setCreando] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)

  function abrirNuevo() {
    setNombreNuevo(sugerenciaNombre?.trim() ?? "")
    setErrorNuevo(null)
    setModoNuevo(true)
  }

  function cancelarNuevo() {
    setModoNuevo(false)
    setErrorNuevo(null)
  }

  async function confirmarNuevo() {
    const nombre = nombreNuevo.trim()
    if (!nombre) {
      setErrorNuevo(t("lotes.errProveedorNombre"))
      return
    }
    setCreando(true)
    setErrorNuevo(null)
    try {
      const nuevoId = await onCrear(nombre)
      if (nuevoId != null) {
        onChange(nuevoId)
        setModoNuevo(false)
        setNombreNuevo("")
      }
    } catch (error) {
      setErrorNuevo(mutationError(error, t("lotes.errCrearProveedor")))
    } finally {
      setCreando(false)
    }
  }

  if (modoNuevo) {
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          <Input
            autoFocus
            className="min-w-[180px] flex-1"
            value={nombreNuevo}
            onChange={(event) => setNombreNuevo(event.target.value)}
            placeholder={t("lotes.fProveedorNuevoPh")}
          />
          <Button type="button" size="compact" onClick={() => void confirmarNuevo()} disabled={creando}>
            {creando ? t("common.creando") : t("lotes.proveedorCrear")}
          </Button>
          <Button type="button" size="compact" variant="secondary" onClick={cancelarNuevo} disabled={creando}>
            {t("lotes.cerrar")}
          </Button>
        </div>
        {errorNuevo ? <p className="mt-1 text-xs text-cds-supportError">{errorNuevo}</p> : null}
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <select
        id={id}
        className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">{t("lotes.proveedorSinElegir")}</option>
        {proveedores.map((proveedor) => (
          <option key={proveedor.id} value={proveedor.id}>
            {proveedor.nombre}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="compact"
        variant="secondary"
        onClick={abrirNuevo}
        className="shrink-0 whitespace-nowrap"
      >
        {t("lotes.proveedorNuevo")}
      </Button>
    </div>
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
