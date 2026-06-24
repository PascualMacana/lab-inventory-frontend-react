import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { Check, ClipboardCheck, ClipboardList, Clock, Copy, Download, FileText, PackageCheck, Plus, RefreshCw, Save, Search, Send, SlidersHorizontal, Sparkles, Trash2, Truck, X } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type CompraComunicacion, type CompraComunicacionCanal, type CompraComunicacionIdioma, type CompraComunicacionVersion, type CompraItem, type CompraItemCrear, type CompraPrioridad, type CompraSolicitud, type Lote, type Proveedor, type Reactivo, type ReposicionRecomendacion, type TareaPendienteCompra, type Usuario } from "../lib/api"
import { useAuth } from "../lib/auth"
import { cn } from "../lib/utils"
import type { LucideIcon } from "lucide-react"

type CompraDraftItem = CompraItemCrear & {
  key: string
  nombre: string
  nivel?: string
  motivos?: string[]
  stock_actual?: number
  cantidad_sugerida?: number
}

type RecepcionDraft = {
  itemId: number | null
  busqueda: string
  loteId: string
  cantidad: string
  unidad: string
  observacion: string
}

const prioridades: CompraPrioridad[] = ["baja", "media", "alta", "urgente"]
// Unidades canónicas, mismo set que el form de Reactivos (ReactivosPage.tsx).
const unidadesOpciones = ["ml", "L", "g", "kg", "mg", "ug", "unidad"]
const estadosFiltro = ["", "borrador", "pendiente_aprobacion", "cambios_solicitados", "aprobada", "recibida_parcial", "recibida", "rechazada", "cancelada"] as const
const emptySolicitudes: CompraSolicitud[] = []
const emptyRecomendaciones: ReposicionRecomendacion[] = []
const emptyTareasPendientes: TareaPendienteCompra[] = []
const emptyReactivos: Reactivo[] = []
const emptyLotes: Lote[] = []
const emptyProveedores: Proveedor[] = []
const emptyUsuarios: Usuario[] = []
const emptyComunicacionVersiones: CompraComunicacionVersion[] = []
const emptyRecepcionDraft: RecepcionDraft = { itemId: null, busqueda: "", loteId: "", cantidad: "", unidad: "", observacion: "" }

const estadoSolicitudLabels: Record<string, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente de aprobación",
  cambios_solicitados: "Cambios solicitados",
  aprobada: "Aprobada",
  recibida_parcial: "Recibida parcial",
  recibida: "Recibida",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
}

const estadoItemLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  recibido_parcial: "Recibido parcial",
  recibido: "Recibido",
  cancelado: "Cancelado",
}

const estadoEntregaLabels: Record<string, string> = {
  no_pedido: "No pedido",
  pedido: "Pedido",
  en_camino: "En camino",
}

const estadoCompraActivaLabels: Record<string, string> = {
  borrador: "Compra en borrador",
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobada: "Aprobada, por pedir",
  pedido: "Pedido al proveedor",
  en_camino: "En camino",
  recibida_parcial: "Recepción parcial",
}

function toPayloadItem(item: CompraDraftItem): CompraItemCrear {
  return {
    origen: item.origen,
    reactivo_id: item.reactivo_id ?? null,
    tarea_id: item.tarea_id ?? null,
    descripcion_manual: item.descripcion_manual ?? null,
    dias_reposicion: item.dias_reposicion,
    cantidad_solicitada: item.cantidad_solicitada,
    unidad: item.unidad ?? null,
    proveedor_id: item.proveedor_id ?? null,
    proveedor_nombre: item.proveedor_nombre ?? null,
    presentacion: item.presentacion ?? null,
    costo_unitario_estimado: item.costo_unitario_estimado ?? 0,
    moneda: item.moneda ?? "ARS",
    notas: item.notas ?? null,
  }
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(value ?? 0))
}

function formatMoney(value: number | null | undefined, moneda = "ARS") {
  return `${moneda} ${formatNumber(value ?? 0)}`
}

function parseDateLike(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value.includes("T") ? value : value.replace(" ", "T"))
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const date = parseDateLike(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date)
}

function dateKey(value: string | null | undefined) {
  return value ? value.slice(0, 10) : ""
}

function todayKey() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${today.getFullYear()}-${month}-${day}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const date = parseDateLike(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function nivelClasses(nivel?: string) {
  if (nivel === "urgente") {
    return "bg-lab-critTint text-cds-supportError ring-cds-supportError/40"
  }
  if (nivel === "atencion") {
    return "bg-lab-warmTint text-lab-warmFg ring-lab-warm/40"
  }
  return "bg-lab-sageBg text-cds-supportSuccess ring-cds-supportSuccess/40"
}

function prioridadTareaClasses(prioridad?: string) {
  if (prioridad === "urgente") {
    return "bg-lab-critTint text-cds-supportError ring-cds-supportError/40"
  }
  if (prioridad === "alta") {
    return "bg-lab-warmTint text-lab-warmFg ring-lab-warm/40"
  }
  return "bg-cds-layer02 text-cds-textSecondary ring-cds-borderSubtle"
}

const riesgoQuiebreLabels: Record<string, string> = {
  inminente: "Quiebre inminente",
  pedir_ya: "Pedí ya",
}

function riesgoQuiebreClasses(riesgo?: string) {
  if (riesgo === "inminente") {
    return "bg-lab-critTint text-cds-supportError ring-cds-supportError/40"
  }
  return "bg-lab-warmTint text-lab-warmFg ring-lab-warm/40"
}

// Atribuye el lead time al proveedor solo cuando es observado de ese proveedor;
// si es mediana de la org o el default, no lo cuelga de un proveedor puntual.
function leadTimeQuiebreLabel(recomendacion: ReposicionRecomendacion) {
  if (recomendacion.lead_time_dias == null) {
    return ""
  }
  const dias = formatNumber(recomendacion.lead_time_dias)
  if (recomendacion.lead_time_fuente === "proveedor" && recomendacion.proveedor_reciente) {
    return ` · ${recomendacion.proveedor_reciente} tarda ~${dias}d`
  }
  return ` · demora estimada ~${dias}d`
}

function leadTimeQuiebreTitle(recomendacion: ReposicionRecomendacion) {
  if (recomendacion.lead_time_fuente === "proveedor" && recomendacion.proveedor_reciente) {
    return `Lead time observado de ${recomendacion.proveedor_reciente} (pedido → recepción). Otro proveedor puede tardar distinto.`
  }
  if (recomendacion.lead_time_fuente === "organizacion") {
    return "Lead time mediano de la organización (sin historia de este proveedor)"
  }
  return "Lead time estimado por defecto (sin historia de compras)"
}

function estadoClasses(estado: string) {
  if (estado === "aprobada" || estado === "recibida") {
    return "bg-lab-sageBg text-cds-supportSuccess ring-cds-supportSuccess/40"
  }
  if (estado === "pendiente_aprobacion" || estado === "recibida_parcial") {
    return "bg-lab-warmTint text-lab-warmFg ring-lab-warm/40"
  }
  if (estado === "rechazada" || estado === "cancelada") {
    return "bg-lab-critTint text-cds-supportError ring-cds-supportError/40"
  }
  return "bg-cds-layer02 text-cds-textSecondary ring-cds-borderStrong"
}

function estadoSolicitudLabel(estado: string) {
  return estadoSolicitudLabels[estado] ?? estado
}

function estadoItemLabel(estado: string) {
  return estadoItemLabels[estado] ?? estado
}

function estadoEntregaLabel(estado?: string | null) {
  return estadoEntregaLabels[estado || "no_pedido"] ?? estado ?? "No pedido"
}

function estadoCompraActivaLabel(estado?: string | null) {
  return estadoCompraActivaLabels[estado || ""] ?? estado ?? ""
}

function itemTotal(item: CompraDraftItem) {
  return Number(item.cantidad_solicitada || 0) * Number(item.costo_unitario_estimado || 0)
}

function cantidadAprobadaItem(item: CompraItem) {
  return Number(item.cantidad_aprobada ?? item.cantidad_solicitada ?? 0)
}

function cantidadPendienteItem(item: CompraItem) {
  return Math.max(0, cantidadAprobadaItem(item) - Number(item.cantidad_recibida ?? 0))
}

function cantidadInicialLote(lote: Lote) {
  return Number(lote.cantidad_inicial ?? lote.cantidad_actual ?? 0)
}

function cantidadSugeridaRecepcion(item: CompraItem, lote: Lote) {
  const pendiente = cantidadPendienteItem(item)
  const cantidadLote = cantidadInicialLote(lote)
  return numberInputValue(cantidadLote > 0 ? Math.min(pendiente, cantidadLote) : pendiente)
}

function fechaCorteRecepcion(solicitud: CompraSolicitud | null) {
  return dateKey(solicitud?.fecha_pedido) || dateKey(solicitud?.fecha_aprobacion)
}

function loteIngresadoDesdeFechaPedido(lote: Lote, solicitud: CompraSolicitud | null) {
  const fechaCorte = fechaCorteRecepcion(solicitud)
  const fechaIngreso = dateKey(lote.fecha_ingreso)
  return !fechaCorte || !fechaIngreso || fechaIngreso >= fechaCorte
}

function costoUnitarioLote(lote: Lote) {
  const cantidad = cantidadInicialLote(lote)
  const costo = Number(lote.costo_total || 0)
  return cantidad > 0 && costo > 0 ? costo / cantidad : 0
}

function numberInputValue(value: number) {
  return Number.isFinite(value) && value > 0 ? String(Number(value.toFixed(4))) : ""
}

function draftFromCompraItem(item: NonNullable<CompraSolicitud["items"]>[number]): CompraDraftItem {
  return {
    key: `compra-item-${item.id}`,
    origen: item.origen,
    reactivo_id: item.reactivo_id ?? null,
    tarea_id: item.tarea_id ?? null,
    descripcion_manual: item.descripcion_manual ?? null,
    nombre: item.reactivo_nombre ?? item.descripcion_manual ?? `Item ${item.id}`,
    cantidad_solicitada: item.cantidad_solicitada,
    cantidad_sugerida: item.cantidad_sugerida,
    unidad: item.unidad,
    proveedor_id: item.proveedor_id ?? null,
    proveedor_nombre: item.proveedor_nombre_snapshot ?? item.proveedor_nombre ?? null,
    presentacion: item.presentacion ?? null,
    costo_unitario_estimado: item.costo_unitario_estimado,
    moneda: item.moneda ?? "ARS",
    motivos: item.motivos,
    notas: item.notas ?? "",
  }
}

function upsertComunicacion(solicitud: CompraSolicitud, comunicacion: CompraComunicacion): CompraSolicitud {
  const comunicaciones = solicitud.comunicaciones ?? []
  const existe = comunicaciones.some((item) => item.id === comunicacion.id)
  return {
    ...solicitud,
    comunicaciones: existe
      ? comunicaciones.map((item) => (item.id === comunicacion.id ? comunicacion : item))
      : [comunicacion, ...comunicaciones],
  }
}

// Pasos del workflow para el timeline del detalle.
const WORKFLOW_STEPS = ["Borrador", "Aprobación", "Pedido", "En camino", "Recibida"] as const

// Índice del último paso COMPLETADO del flujo (−1 = ninguno). El paso "actual"
// es completedThrough + 1. Mapea estado + estado_entrega del modelo de compras.
function workflowCompletedThrough(estado: string, entrega?: string | null): number {
  const e = entrega ?? "no_pedido"
  switch (estado) {
    case "borrador":
    case "cambios_solicitados":
      return -1
    case "pendiente_aprobacion":
      return 0
    case "aprobada":
    case "recibida_parcial":
      if (e === "en_camino") return 3
      if (e === "pedido") return 2
      return 1
    case "recibida":
      return 4
    default:
      // rechazada / cancelada: flujo cortado.
      return -1
  }
}

type AccionSiguiente = {
  label: string
  // "recepcion" no es una acción de workflowMutation: abre el formulario de recepción.
  accion: "enviar" | "aprobar" | "pedido" | "en_camino" | "recepcion"
  icon: LucideIcon
}

// Acción primaria que corresponde al estado actual (la que muestra el timeline).
function accionSiguiente(estado: string, entrega?: string | null): AccionSiguiente | null {
  const e = entrega ?? "no_pedido"
  if (estado === "borrador" || estado === "cambios_solicitados") {
    return { label: "Enviar a aprobación", accion: "enviar", icon: Send }
  }
  if (estado === "pendiente_aprobacion") {
    return { label: "Aprobar", accion: "aprobar", icon: Check }
  }
  if (estado === "aprobada" || estado === "recibida_parcial") {
    if (e === "no_pedido") return { label: "Marcar pedido", accion: "pedido", icon: PackageCheck }
    if (e === "pedido") return { label: "Marcar en camino", accion: "en_camino", icon: Truck }
    return { label: "Registrar recepción", accion: "recepcion", icon: Check }
  }
  return null
}

export function ComprasPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [dias, setDias] = useState(30)
  const [titulo, setTitulo] = useState("Reposicion de inventario")
  const [prioridad, setPrioridad] = useState<CompraPrioridad>("alta")
  const [fechaNecesaria, setFechaNecesaria] = useState("")
  const [notas, setNotas] = useState("")
  const [items, setItems] = useState<CompraDraftItem[]>([])
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const [prioridadFiltro, setPrioridadFiltro] = useState("")
  const [proveedorFiltro, setProveedorFiltro] = useState("")
  const [reactivoFiltro, setReactivoFiltro] = useState("")
  const [solicitadoPorFiltro, setSolicitadoPorFiltro] = useState("")
  const [aprobadoPorFiltro, setAprobadoPorFiltro] = useState("")
  const [desdeFiltro, setDesdeFiltro] = useState("")
  const [hastaFiltro, setHastaFiltro] = useState("")
  const [fechaNecesariaDesdeFiltro, setFechaNecesariaDesdeFiltro] = useState("")
  const [fechaNecesariaHastaFiltro, setFechaNecesariaHastaFiltro] = useState("")
  const [busquedaSolicitudFiltro, setBusquedaSolicitudFiltro] = useState("")
  const [solicitudSeleccionadaId, setSolicitudSeleccionadaId] = useState<number | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editandoFecha, setEditandoFecha] = useState<string | null>(null)
  const [motivoWorkflow, setMotivoWorkflow] = useState("")
  const [fechaPedidoWorkflow, setFechaPedidoWorkflow] = useState("")
  const [comunicacionActivaId, setComunicacionActivaId] = useState<number | null>(null)
  const [comunicacionTitulo, setComunicacionTitulo] = useState("Solicitud de cotizacion / pedido")
  const [comunicacionObservaciones, setComunicacionObservaciones] = useState("")
  const [contenidoComunicacion, setContenidoComunicacion] = useState("")
  const [canalComunicacionIA, setCanalComunicacionIA] = useState<CompraComunicacionCanal>("email_formal")
  const [idiomaComunicacionIA, setIdiomaComunicacionIA] = useState<CompraComunicacionIdioma>("es")
  const [contactoComunicacionIA, setContactoComunicacionIA] = useState("")
  const [advertenciasComunicacionIA, setAdvertenciasComunicacionIA] = useState<string[]>([])
  const [pedidoIA, setPedidoIA] = useState("")
  const [advertenciasConstructorIA, setAdvertenciasConstructorIA] = useState<string[]>([])
  const [recepcionDraft, setRecepcionDraft] = useState<RecepcionDraft>({ ...emptyRecepcionDraft })
  const [manual, setManual] = useState({
    busqueda: "",
    reactivoId: "",
    cantidad: "",
    unidad: "unidad",
    costo: "",
    proveedor: "",
    presentacion: "",
    loteReferenciaId: "",
  })
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [revalidacion, setRevalidacion] = useState<string | null>(null)
  // Filtros avanzados colapsables (solo Buscar/Estado/Prioridad quedan siempre visibles).
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  // Compras en dos pestañas: "solicitudes" (lista + detalle = seguimiento) y
  // "armar" (reposición + tareas + constructor = crear). Cada una hace una sola
  // cosa, así ninguna queda cargada y el constructor deja de pelear con el sticky.
  const [tab, setTab] = useState<"solicitudes" | "armar">("solicitudes")

  const [searchParams, setSearchParams] = useSearchParams()

  const sugerenciasQuery = useQuery({
    queryKey: ["compras", "sugerencias", dias],
    queryFn: () => api.comprasSugerencias(token!, dias, 20),
    enabled: Boolean(token),
  })

  const tareasPendientesQuery = useQuery({
    queryKey: ["compras", "tareas-pendientes", dias],
    queryFn: () => api.comprasTareasPendientes(token!, dias),
    enabled: Boolean(token),
  })

  const solicitudesQuery = useQuery({
    queryKey: [
      "compras",
      "solicitudes",
      estadoFiltro,
      prioridadFiltro,
      proveedorFiltro,
      reactivoFiltro,
      solicitadoPorFiltro,
      aprobadoPorFiltro,
      desdeFiltro,
      hastaFiltro,
      fechaNecesariaDesdeFiltro,
      fechaNecesariaHastaFiltro,
      busquedaSolicitudFiltro,
    ],
    queryFn: () =>
      api.comprasSolicitudes(token!, {
        estado: estadoFiltro || undefined,
        prioridad: prioridadFiltro || undefined,
        proveedor_id: proveedorFiltro ? Number(proveedorFiltro) : undefined,
        reactivo_id: reactivoFiltro ? Number(reactivoFiltro) : undefined,
        solicitado_por: solicitadoPorFiltro ? Number(solicitadoPorFiltro) : undefined,
        aprobado_por: aprobadoPorFiltro ? Number(aprobadoPorFiltro) : undefined,
        desde: desdeFiltro || undefined,
        hasta: hastaFiltro || undefined,
        fecha_necesaria_desde: fechaNecesariaDesdeFiltro || undefined,
        fecha_necesaria_hasta: fechaNecesariaHastaFiltro || undefined,
        q: busquedaSolicitudFiltro || undefined,
        limite: 100,
      }),
    enabled: Boolean(token),
  })

  // Resumen del pipeline para los tiles: mismos filtros que la lista pero SIN
  // estado, para que los conteos no se vacíen al clickear un tile.
  const resumenQuery = useQuery({
    queryKey: [
      "compras",
      "resumen",
      prioridadFiltro,
      proveedorFiltro,
      reactivoFiltro,
      solicitadoPorFiltro,
      aprobadoPorFiltro,
      desdeFiltro,
      hastaFiltro,
      fechaNecesariaDesdeFiltro,
      fechaNecesariaHastaFiltro,
      busquedaSolicitudFiltro,
    ],
    queryFn: () =>
      api.comprasSolicitudes(token!, {
        prioridad: prioridadFiltro || undefined,
        proveedor_id: proveedorFiltro ? Number(proveedorFiltro) : undefined,
        reactivo_id: reactivoFiltro ? Number(reactivoFiltro) : undefined,
        solicitado_por: solicitadoPorFiltro ? Number(solicitadoPorFiltro) : undefined,
        aprobado_por: aprobadoPorFiltro ? Number(aprobadoPorFiltro) : undefined,
        desde: desdeFiltro || undefined,
        hasta: hastaFiltro || undefined,
        fecha_necesaria_desde: fechaNecesariaDesdeFiltro || undefined,
        fecha_necesaria_hasta: fechaNecesariaHastaFiltro || undefined,
        q: busquedaSolicitudFiltro || undefined,
        limite: 500,
      }),
    enabled: Boolean(token),
  })

  const detalleSolicitudQuery = useQuery({
    queryKey: ["compras", "solicitud", solicitudSeleccionadaId],
    queryFn: () => api.compraSolicitud(token!, solicitudSeleccionadaId!),
    enabled: Boolean(token) && solicitudSeleccionadaId != null,
  })

  const reactivosQuery = useQuery({
    queryKey: ["compras", "reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })

  const proveedoresQuery = useQuery({
    queryKey: ["compras", "proveedores"],
    queryFn: () => api.proveedores(token!, true),
    enabled: Boolean(token),
  })

  const usuariosQuery = useQuery({
    queryKey: ["compras", "usuarios"],
    queryFn: () => api.usuarios(token!, true),
    enabled: Boolean(token),
  })

  const recomendaciones = sugerenciasQuery.data?.recomendaciones ?? emptyRecomendaciones
  const tareasPendientes = tareasPendientesQuery.data?.tareas ?? emptyTareasPendientes
  const solicitudes = solicitudesQuery.data ?? emptySolicitudes
  const solicitudesResumen = resumenQuery.data ?? emptySolicitudes
  const solicitudSeleccionada = detalleSolicitudQuery.data ?? null
  const comunicaciones = solicitudSeleccionada?.comunicaciones ?? []
  const comunicacionActiva = comunicaciones.find((comunicacion) => comunicacion.id === comunicacionActivaId) ?? comunicaciones[0] ?? null
  const comunicacionActivaIdValor = comunicacionActiva?.id ?? null
  const comunicacionActivaContenido = comunicacionActiva?.contenido ?? ""
  const comunicacionTieneCambiosSinGuardar = Boolean(
    comunicacionActiva && contenidoComunicacion !== comunicacionActivaContenido,
  )
  const versionesComunicacionQuery = useQuery({
    queryKey: ["compras", "comunicacion-versiones", comunicacionActivaIdValor],
    queryFn: () => api.compraComunicacionVersiones(token!, comunicacionActivaIdValor!),
    enabled: Boolean(token) && comunicacionActivaIdValor != null,
  })
  const versionesComunicacion = versionesComunicacionQuery.data ?? emptyComunicacionVersiones
  const itemRecepcion = solicitudSeleccionada?.items?.find((item) => item.id === recepcionDraft.itemId) ?? null
  const busquedaRecepcionApi = (
    recepcionDraft.busqueda.trim() ||
    itemRecepcion?.reactivo_nombre ||
    itemRecepcion?.descripcion_manual ||
    ""
  ).trim()
  const lotesRecepcionQuery = useQuery({
    queryKey: ["compras", "lotes-recepcion", recepcionDraft.itemId, busquedaRecepcionApi],
    queryFn: () => api.lotes(token!, busquedaRecepcionApi, false),
    enabled: Boolean(token) && recepcionDraft.itemId != null && busquedaRecepcionApi.length >= 2,
  })
  const lotesRecepcion = useMemo(() => {
    const lotes = lotesRecepcionQuery.data ?? emptyLotes
    return lotes
      .filter((lote) => !itemRecepcion?.reactivo_id || lote.reactivo_id === itemRecepcion.reactivo_id)
      .filter((lote) => !itemRecepcion?.unidad || lote.unidad === itemRecepcion.unidad)
      .filter((lote) => Number(lote.compras_recepciones_count ?? 0) === 0)
      .filter((lote) => loteIngresadoDesdeFechaPedido(lote, solicitudSeleccionada))
      .sort((a, b) => String(b.fecha_ingreso ?? "").localeCompare(String(a.fecha_ingreso ?? "")))
      .slice(0, 8)
  }, [itemRecepcion, lotesRecepcionQuery.data, solicitudSeleccionada])
  const loteRecepcion = lotesRecepcion.find((lote) => String(lote.id) === recepcionDraft.loteId) ?? null
  const reactivos = reactivosQuery.data ?? emptyReactivos
  const proveedores = proveedoresQuery.data ?? emptyProveedores
  const usuarios = usuariosQuery.data ?? emptyUsuarios
  const manualQuery = manual.busqueda.trim().toLocaleLowerCase("es-AR")
  const reactivoManual = reactivos.find((reactivo) => String(reactivo.id) === manual.reactivoId) ?? null
  const reactivosManual = useMemo(() => {
    if (!manualQuery) {
      return emptyReactivos
    }
    return reactivos
      .filter((reactivo) =>
        [
          reactivo.nombre,
          reactivo.unidad,
          reactivo.categoria,
          reactivo.ubicacion,
          reactivo.marca,
          reactivo.numero_catalogo,
          reactivo.cas_numero,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es-AR")
          .includes(manualQuery),
      )
      .slice(0, 8)
  }, [manualQuery, reactivos])

  const lotesReferenciaQuery = useQuery({
    queryKey: ["compras", "lotes-referencia", reactivoManual?.id ?? null, manual.busqueda],
    queryFn: () => api.lotes(token!, reactivoManual?.nombre ?? manual.busqueda, false),
    enabled: Boolean(token) && (Boolean(reactivoManual) || manual.busqueda.trim().length >= 2),
  })

  const lotesReferencia = useMemo(() => {
    const lotes = lotesReferenciaQuery.data ?? emptyLotes
    return lotes
      .filter((lote) => (!reactivoManual || lote.reactivo_id === reactivoManual.id) && Number(lote.costo_total || 0) > 0)
      .sort((a, b) => String(b.fecha_ingreso ?? "").localeCompare(String(a.fecha_ingreso ?? "")))
      .slice(0, 6)
  }, [lotesReferenciaQuery.data, reactivoManual])
  const loteReferencia = lotesReferencia.find((lote) => String(lote.id) === manual.loteReferenciaId) ?? null
  const totalEstimado = useMemo(() => items.reduce((acc, item) => acc + itemTotal(item), 0), [items])

  // Conteos del pipeline para los tiles (sobre el resumen sin filtro de estado).
  const pipeline = useMemo(() => {
    const inMonth = (value?: string | null) => {
      if (!value) {
        return false
      }
      const date = parseDateLike(value)
      const now = new Date()
      return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    }
    let borradores = 0
    let pendientes = 0
    let porPedir = 0
    let enCamino = 0
    let recibidasMes = 0
    for (const solicitud of solicitudesResumen) {
      const entrega = solicitud.estado_entrega ?? "no_pedido"
      if (solicitud.estado === "borrador") {
        borradores += 1
      } else if (solicitud.estado === "pendiente_aprobacion") {
        pendientes += 1
      } else if (solicitud.estado === "aprobada" && entrega !== "en_camino") {
        porPedir += 1
      }
      if (["aprobada", "recibida_parcial"].includes(solicitud.estado) && entrega === "en_camino") {
        enCamino += 1
      }
      if (solicitud.estado === "recibida" && inMonth(solicitud.fecha_actualizacion)) {
        recibidasMes += 1
      }
    }
    return { borradores, pendientes, porPedir, enCamino, recibidasMes }
  }, [solicitudesResumen])

  useEffect(() => {
    if (comunicacionActivaIdValor != null) {
      setComunicacionActivaId(comunicacionActivaIdValor)
      setContenidoComunicacion(comunicacionActivaContenido)
    } else {
      setComunicacionActivaId(null)
      setContenidoComunicacion("")
    }
  }, [comunicacionActivaIdValor, comunicacionActivaContenido])

  useEffect(() => {
    setContactoComunicacionIA(comunicacionActiva?.contacto_nombre ?? "")
    setAdvertenciasComunicacionIA([])
  }, [comunicacionActiva?.id, comunicacionActiva?.contacto_nombre])

  useEffect(() => {
    setRecepcionDraft({ ...emptyRecepcionDraft })
  }, [solicitudSeleccionadaId])

  useEffect(() => {
    const fechaGuardada = dateKey(solicitudSeleccionada?.fecha_pedido)
    const puedeTenerPedido = ["aprobada", "recibida_parcial"].includes(solicitudSeleccionada?.estado ?? "")
    setFechaPedidoWorkflow(fechaGuardada || (puedeTenerPedido ? todayKey() : ""))
  }, [solicitudSeleccionada?.id, solicitudSeleccionada?.fecha_pedido, solicitudSeleccionada?.estado])

  // El puente con Tareas: tras crear/editar/recepcionar/cancelar una compra, el
  // panel de tareas pendientes y los badges de Tareas pueden haber cambiado.
  async function invalidarPuenteTareas() {
    await queryClient.invalidateQueries({ queryKey: ["compras", "tareas-pendientes"] })
    await queryClient.invalidateQueries({ queryKey: ["tareas"] })
  }

  const crearMutation = useMutation({
    mutationFn: () =>
      api.crearCompraSolicitud(token!, {
        titulo,
        prioridad,
        fecha_necesaria: fechaNecesaria || null,
        notas: notas || null,
        enviar_a_aprobacion: false,
        items: items.map(toPayloadItem),
      }),
    onSuccess: async (solicitud) => {
      setMensaje(`Solicitud ${solicitud.codigo} creada.`)
      setErrorLocal(null)
      setItems([])
      setTab("solicitudes")
      setSolicitudSeleccionadaId(solicitud.id)
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitudes"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "resumen"] })
      await invalidarPuenteTareas()
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo crear la solicitud."))
    },
  })

  // Constructor conversacional: la IA solo arma un borrador editable; nada se guarda
  // hasta que la persona lo confirme con el flujo normal de creación.
  const construirMutation = useMutation({
    mutationFn: () => api.construirCompraSolicitud(token!, pedidoIA.trim()),
    onSuccess: (respuesta) => {
      setErrorLocal(null)
      setMensaje("La IA armó un borrador. Revisá los ítems y guardá cuando esté listo.")
      // Solo piso el título si sigue siendo el placeholder por defecto.
      setTitulo((current) =>
        !current.trim() || current === "Reposicion de inventario" ? respuesta.titulo : current,
      )
      setItems((current) => [
        ...current,
        ...respuesta.items.map((item, index) => ({
          ...item,
          key: `ia-${Date.now()}-${index}`,
          cantidad_solicitada: item.cantidad_solicitada || 1,
          costo_unitario_estimado: item.costo_unitario_estimado ?? 0,
          moneda: item.moneda ?? "ARS",
        })),
      ])
      setAdvertenciasConstructorIA(respuesta.advertencias ?? [])
      setPedidoIA("")
    },
    onError: (error) => {
      setMensaje(null)
      setAdvertenciasConstructorIA([])
      setErrorLocal(mutationError(error, "No se pudo armar el borrador con IA."))
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: () =>
      api.actualizarCompraSolicitud(token!, editandoId!, {
        titulo,
        prioridad,
        fecha_necesaria: fechaNecesaria || null,
        notas: notas || null,
        fecha_actualizacion_esperada: editandoFecha,
        items: items.map(toPayloadItem),
      }),
    onSuccess: async (solicitud) => {
      setMensaje(`Solicitud ${solicitud.codigo} actualizada.`)
      setErrorLocal(null)
      setEditandoId(null)
      setEditandoFecha(null)
      setItems([])
      setTab("solicitudes")
      setSolicitudSeleccionadaId(solicitud.id)
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitudes"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "resumen"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitud.id] })
      await invalidarPuenteTareas()
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo actualizar la solicitud."))
    },
  })

  const workflowMutation = useMutation({
    mutationFn: ({
      id,
      accion,
      motivo,
      fechaPedido,
    }: {
      id: number
      accion: "enviar" | "aprobar" | "rechazar" | "cambios" | "cancelar" | "pedido" | "en_camino"
      motivo?: string
      fechaPedido?: string | null
    }) => {
      if (accion === "enviar") {
        return api.enviarCompraSolicitudAprobacion(token!, id, motivo)
      }
      if (accion === "aprobar") {
        return api.aprobarCompraSolicitud(token!, id, motivo)
      }
      if (accion === "rechazar") {
        return api.rechazarCompraSolicitud(token!, id, motivo ?? "")
      }
      if (accion === "cambios") {
        return api.solicitarCambiosCompraSolicitud(token!, id, motivo ?? "")
      }
      if (accion === "pedido") {
        return api.marcarCompraPedido(token!, id, motivo, fechaPedido)
      }
      if (accion === "en_camino") {
        return api.marcarCompraEnCamino(token!, id, motivo, fechaPedido)
      }
      return api.cancelarCompraSolicitud(token!, id, motivo)
    },
    onSuccess: async (solicitud) => {
      const entrega = ["aprobada", "recibida_parcial"].includes(solicitud.estado)
        ? ` · ${estadoEntregaLabel(solicitud.estado_entrega)}`
        : ""
      setMensaje(`Solicitud ${solicitud.codigo} quedó en estado ${estadoSolicitudLabel(solicitud.estado)}${entrega}.`)
      setErrorLocal(null)
      setMotivoWorkflow("")
      setFechaPedidoWorkflow(dateKey(solicitud.fecha_pedido))
      setSolicitudSeleccionadaId(solicitud.id)
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitudes"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "resumen"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitud.id] })
      await invalidarPuenteTareas()
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo cambiar el estado de la solicitud."))
    },
  })

  const crearComunicacionMutation = useMutation({
    mutationFn: () =>
      api.crearCompraComunicacion(token!, solicitudSeleccionada!.id, {
        titulo: comunicacionTitulo || null,
        observaciones: comunicacionObservaciones || null,
      }),
    onSuccess: async (comunicacion) => {
      setMensaje("Borrador de proveedor generado.")
      setErrorLocal(null)
      setComunicacionActivaId(comunicacion.id)
      setContenidoComunicacion(comunicacion.contenido)
      setComunicacionObservaciones("")
      if (solicitudSeleccionada) {
        queryClient.setQueryData<CompraSolicitud | undefined>(["compras", "solicitud", solicitudSeleccionada.id], (current) =>
          current ? upsertComunicacion(current, comunicacion) : current,
        )
        await queryClient.invalidateQueries({ queryKey: ["compras", "comunicacion-versiones", comunicacion.id] })
        await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitudSeleccionada.id] })
      }
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo generar el borrador."))
    },
  })

  const actualizarComunicacionMutation = useMutation({
    mutationFn: () => api.actualizarCompraComunicacion(token!, comunicacionActiva!.id, contenidoComunicacion),
    onSuccess: async (comunicacion) => {
      setMensaje("Borrador actualizado.")
      setErrorLocal(null)
      setComunicacionActivaId(comunicacion.id)
      setContenidoComunicacion(comunicacion.contenido)
      if (solicitudSeleccionada) {
        queryClient.setQueryData<CompraSolicitud | undefined>(["compras", "solicitud", solicitudSeleccionada.id], (current) =>
          current ? upsertComunicacion(current, comunicacion) : current,
        )
        await queryClient.invalidateQueries({ queryKey: ["compras", "comunicacion-versiones", comunicacion.id] })
        await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitudSeleccionada.id] })
      }
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo guardar el borrador."))
    },
  })

  const reescribirComunicacionIAMutation = useMutation({
    mutationFn: () => api.reescribirCompraComunicacionIA(token!, comunicacionActiva!.id, {
      canal: canalComunicacionIA,
      idioma: idiomaComunicacionIA,
      nombre_contacto: contactoComunicacionIA.trim() || null,
      version_esperada: comunicacionActiva!.version_actual ?? 1,
    }),
    onSuccess: async (comunicacion) => {
      setMensaje("La IA creó una nueva versión. Revisala antes de copiar o descargar.")
      setErrorLocal(null)
      setComunicacionActivaId(comunicacion.id)
      setContenidoComunicacion(comunicacion.contenido)
      setAdvertenciasComunicacionIA(comunicacion.ia_advertencias ?? [])
      if (solicitudSeleccionada) {
        queryClient.setQueryData<CompraSolicitud | undefined>(["compras", "solicitud", solicitudSeleccionada.id], (current) =>
          current ? upsertComunicacion(current, comunicacion) : current,
        )
        await queryClient.invalidateQueries({ queryKey: ["compras", "comunicacion-versiones", comunicacion.id] })
        await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitudSeleccionada.id] })
      }
    },
    onError: (error) => {
      setMensaje(null)
      setAdvertenciasComunicacionIA([])
      setErrorLocal(mutationError(error, "No se pudo reescribir el borrador con IA."))
    },
  })

  const marcarComunicacionCopiadaMutation = useMutation({
    mutationFn: () => api.marcarCompraComunicacionCopiada(token!, comunicacionActiva!.id),
    onSuccess: async (comunicacion) => {
      setMensaje("Borrador marcado como copiado.")
      setErrorLocal(null)
      setComunicacionActivaId(comunicacion.id)
      setContenidoComunicacion(comunicacion.contenido)
      if (solicitudSeleccionada) {
        queryClient.setQueryData<CompraSolicitud | undefined>(["compras", "solicitud", solicitudSeleccionada.id], (current) =>
          current ? upsertComunicacion(current, comunicacion) : current,
        )
        await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitudSeleccionada.id] })
      }
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo marcar como copiado."))
    },
  })

  const descargarComunicacionMutation = useMutation({
    mutationFn: () => api.descargarCompraComunicacion(token!, comunicacionActiva!.id),
    onSuccess: async (blob) => {
      if (!comunicacionActiva) {
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `compra-comunicacion-${comunicacionActiva.id}.md`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMensaje("Borrador descargado.")
      setErrorLocal(null)
      if (solicitudSeleccionada) {
        await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitudSeleccionada.id] })
      }
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo descargar el borrador."))
    },
  })

  const registrarRecepcionMutation = useMutation({
    mutationFn: () =>
      api.registrarCompraRecepcion(token!, recepcionDraft.itemId!, {
        lote_id: Number(recepcionDraft.loteId),
        cantidad_vinculada: Number(recepcionDraft.cantidad),
        unidad: recepcionDraft.unidad,
        observacion: recepcionDraft.observacion || null,
      }),
    onSuccess: async ({ solicitud }) => {
      setMensaje("Recepción vinculada al lote.")
      setErrorLocal(null)
      setRecepcionDraft({ ...emptyRecepcionDraft })
      setSolicitudSeleccionadaId(solicitud.id)
      queryClient.setQueryData<CompraSolicitud | undefined>(["compras", "solicitud", solicitud.id], solicitud)
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitudes"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "resumen"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitud.id] })
      await invalidarPuenteTareas()
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo vincular la recepción."))
    },
  })

  const revalidarMutation = useMutation({
    mutationFn: (id: number) => api.revalidarCompraSolicitud(token!, id),
    onSuccess: (resultado) => {
      const stale = resultado.items.filter((item) => item.stale).length
      setRevalidacion(stale ? `${stale} item(s) con cambios desde la solicitud.` : "Sin cambios relevantes desde la solicitud.")
    },
    onError: (error) => setRevalidacion(mutationError(error, "No se pudo revalidar la solicitud.")),
  })

  function agregarRecomendacion(recomendacion: ReposicionRecomendacion) {
    setErrorLocal(null)
    setMensaje(null)
    if (recomendacion.compra_activa) {
      setMensaje(`Ya existe una compra activa para ${recomendacion.reactivo_nombre}: ${recomendacion.compra_activa.codigo}.`)
      return
    }
    setTab("armar")
    setItems((current) => {
      if (current.some((item) => item.origen === "reposicion" && item.reactivo_id === recomendacion.reactivo_id)) {
        return current
      }
      return [
        ...current,
        {
          key: `reposicion-${recomendacion.reactivo_id}`,
          origen: "reposicion",
          reactivo_id: recomendacion.reactivo_id,
          dias_reposicion: dias,
          nombre: recomendacion.reactivo_nombre,
          cantidad_solicitada: recomendacion.cantidad_sugerida || 1,
          cantidad_sugerida: recomendacion.cantidad_sugerida,
          unidad: recomendacion.unidad,
          proveedor_nombre: recomendacion.proveedor_reciente ?? null,
          costo_unitario_estimado: recomendacion.costo_unitario_reciente ?? 0,
          moneda: "ARS",
          nivel: recomendacion.nivel,
          motivos: recomendacion.motivos,
          stock_actual: recomendacion.stock_actual,
          notas: "",
        },
      ]
    })
  }

  // Vuelca una tarea de reposición al carrito. Si hay recomendación vigente, el
  // ítem nace como reposición (con snapshot); si no, como ítem manual del reactivo.
  // En ambos casos queda linkeado a la tarea para cerrar el ciclo al recibir.
  function agregarTarea(tarea: TareaPendienteCompra) {
    setErrorLocal(null)
    setMensaje(null)
    const recom = tarea.recomendacion
    if (recom?.compra_activa) {
      setMensaje(`Ya existe una compra activa para ${tarea.reactivo_nombre}: ${recom.compra_activa.codigo}.`)
      return
    }
    setTab("armar")
    setItems((current) => {
      if (current.some((item) => item.tarea_id === tarea.tarea_id)) {
        return current
      }
      if (recom) {
        return [
          ...current,
          {
            key: `tarea-${tarea.tarea_id}`,
            origen: "reposicion",
            reactivo_id: tarea.reactivo_id,
            tarea_id: tarea.tarea_id,
            dias_reposicion: dias,
            nombre: tarea.reactivo_nombre,
            cantidad_solicitada: recom.cantidad_sugerida || 1,
            cantidad_sugerida: recom.cantidad_sugerida,
            unidad: recom.unidad || tarea.unidad,
            proveedor_nombre: recom.proveedor_reciente ?? null,
            costo_unitario_estimado: recom.costo_unitario_reciente ?? 0,
            moneda: "ARS",
            nivel: recom.nivel,
            motivos: recom.motivos,
            stock_actual: recom.stock_actual,
            notas: "",
          },
        ]
      }
      return [
        ...current,
        {
          key: `tarea-${tarea.tarea_id}`,
          origen: "manual",
          reactivo_id: tarea.reactivo_id,
          tarea_id: tarea.tarea_id,
          nombre: tarea.reactivo_nombre,
          cantidad_solicitada: 1,
          unidad: tarea.unidad,
          costo_unitario_estimado: 0,
          moneda: "ARS",
          notas: `Desde la tarea: ${tarea.titulo}`,
        },
      ]
    })
  }

  function seleccionarReactivoManual(reactivo: Reactivo) {
    setManual((current) => ({
      ...current,
      busqueda: reactivo.nombre,
      reactivoId: String(reactivo.id),
      unidad: reactivo.unidad,
      loteReferenciaId: "",
    }))
    setErrorLocal(null)
  }

  function seleccionarLoteReferencia(lote: Lote) {
    const unitario = costoUnitarioLote(lote)
    setManual((current) => ({
      ...current,
      busqueda: lote.reactivo_nombre,
      reactivoId: String(lote.reactivo_id),
      unidad: lote.unidad,
      costo: numberInputValue(unitario),
      proveedor: lote.proveedor ?? "",
      presentacion: [lote.marca, lote.codigo_proveedor, lote.numero_lote ? `Lote fab. ${lote.numero_lote}` : null].filter(Boolean).join(" · "),
      loteReferenciaId: String(lote.id),
    }))
    setErrorLocal(null)
  }

  function agregarManual() {
    const cantidad = Number(manual.cantidad)
    const nombreManual = reactivoManual?.nombre ?? manual.busqueda.trim()
    if (!nombreManual || !Number.isFinite(cantidad) || cantidad <= 0 || !manual.unidad.trim()) {
      setErrorLocal("Completa reactivo o insumo, cantidad y unidad para agregar el item.")
      return
    }
    const notaReferencia = loteReferencia
      ? `Precio de referencia: ${loteReferencia.codigo_interno}, ingreso ${formatDate(loteReferencia.fecha_ingreso)}, ${formatMoney(loteReferencia.costo_total)} total.`
      : ""
    setTab("armar")
    setItems((current) => [
      ...current,
      {
        key: `manual-${Date.now()}`,
        origen: "manual",
        reactivo_id: reactivoManual?.id ?? null,
        descripcion_manual: reactivoManual ? null : manual.busqueda.trim(),
        nombre: nombreManual,
        cantidad_solicitada: cantidad,
        unidad: manual.unidad.trim(),
        costo_unitario_estimado: Number(manual.costo || 0),
        proveedor_nombre: manual.proveedor.trim() || null,
        presentacion: manual.presentacion.trim() || null,
        moneda: "ARS",
        notas: notaReferencia,
      },
    ])
    setManual({
      busqueda: "",
      reactivoId: "",
      cantidad: "",
      unidad: "unidad",
      costo: "",
      proveedor: "",
      presentacion: "",
      loteReferenciaId: "",
    })
    setErrorLocal(null)
  }

  function updateItem(key: string, patch: Partial<CompraDraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key))
  }

  // Entrada directa desde una tarea: /compras?tarea_id=ID abre el constructor con
  // esa tarea ya cargada en el carrito. Limpiamos el param para no re-agregarla.
  const tareaParam = searchParams.get("tarea_id")
  useEffect(() => {
    if (!tareaParam || !tareasPendientesQuery.data) {
      return
    }
    const tarea = tareasPendientes.find((item) => String(item.tarea_id) === tareaParam)
    if (tarea) {
      agregarTarea(tarea)
    } else {
      setTab("armar")
      setMensaje("Esa tarea ya no está disponible para compras (quizás ya tiene una compra en curso).")
    }
    searchParams.delete("tarea_id")
    setSearchParams(searchParams, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaParam, tareasPendientesQuery.data])

  function limpiarFiltrosSolicitudes() {
    setEstadoFiltro("")
    setPrioridadFiltro("")
    setProveedorFiltro("")
    setReactivoFiltro("")
    setSolicitadoPorFiltro("")
    setAprobadoPorFiltro("")
    setDesdeFiltro("")
    setHastaFiltro("")
    setFechaNecesariaDesdeFiltro("")
    setFechaNecesariaHastaFiltro("")
    setBusquedaSolicitudFiltro("")
  }

  function cargarSolicitudParaEditar(solicitud: CompraSolicitud) {
    if (!["borrador", "cambios_solicitados"].includes(solicitud.estado)) {
      setErrorLocal("Solo se pueden editar solicitudes en borrador o con cambios solicitados.")
      return
    }
    setTitulo(solicitud.titulo)
    setPrioridad(solicitud.prioridad)
    setFechaNecesaria(solicitud.fecha_necesaria ?? "")
    setNotas(solicitud.notas ?? "")
    setItems((solicitud.items ?? []).map(draftFromCompraItem))
    setEditandoId(solicitud.id)
    setEditandoFecha(solicitud.fecha_actualizacion ?? null)
    setErrorLocal(null)
    setMensaje(null)
    setTab("armar")
  }

  function abrirRecepcion(item: CompraItem) {
    const pendiente = cantidadPendienteItem(item)
    setRecepcionDraft({
      itemId: item.id,
      busqueda: item.reactivo_nombre ?? item.descripcion_manual ?? "",
      loteId: "",
      cantidad: numberInputValue(pendiente),
      unidad: item.unidad,
      observacion: "",
    })
    setErrorLocal(null)
    setMensaje(null)
  }

  function registrarRecepcion() {
    const cantidad = Number(recepcionDraft.cantidad)
    if (!recepcionDraft.itemId || !recepcionDraft.loteId || !Number.isFinite(cantidad) || cantidad <= 0 || !recepcionDraft.unidad.trim()) {
      setErrorLocal("Seleccioná un lote y completá cantidad/unidad para vincular la recepción.")
      return
    }
    if (itemRecepcion && cantidad > cantidadPendienteItem(itemRecepcion) + 1e-9) {
      setErrorLocal("La cantidad vinculada no puede superar lo pendiente del item.")
      return
    }
    if (loteRecepcion && cantidad > cantidadInicialLote(loteRecepcion) + 1e-9) {
      setErrorLocal("La cantidad vinculada no puede superar la cantidad inicial del lote seleccionado.")
      return
    }
    registrarRecepcionMutation.mutate()
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setEditandoFecha(null)
    setItems([])
    setTitulo("Reposicion de inventario")
    setPrioridad("alta")
    setFechaNecesaria("")
    setNotas("")
    setPedidoIA("")
    setAdvertenciasConstructorIA([])
    setTab("solicitudes")
  }

  // Abre el constructor (columna derecha) con un draft limpio.
  function iniciarNuevaSolicitud() {
    setEditandoId(null)
    setEditandoFecha(null)
    setItems([])
    setTitulo("Reposicion de inventario")
    setPrioridad("alta")
    setFechaNecesaria("")
    setNotas("")
    setPedidoIA("")
    setAdvertenciasConstructorIA([])
    setErrorLocal(null)
    setMensaje(null)
    setTab("armar")
  }

  // Selecciona una solicitud y sale del modo constructor para mostrar su detalle.
  function seleccionarSolicitud(id: number) {
    setSolicitudSeleccionadaId(id)
    setTab("solicitudes")
  }

  function ejecutarWorkflow(accion: "enviar" | "aprobar" | "rechazar" | "cambios" | "cancelar" | "pedido" | "en_camino") {
    if (!solicitudSeleccionada) {
      return
    }
    const motivo = motivoWorkflow.trim()
    if ((accion === "rechazar" || accion === "cambios") && !motivo) {
      setErrorLocal("Cargá un motivo antes de rechazar o pedir cambios.")
      return
    }
    workflowMutation.mutate({
      id: solicitudSeleccionada.id,
      accion,
      motivo: motivo || undefined,
      fechaPedido: ["pedido", "en_camino"].includes(accion) ? fechaPedidoWorkflow || null : null,
    })
  }

  async function copiarComunicacion() {
    if (!comunicacionActiva) {
      return
    }
    try {
      await navigator.clipboard?.writeText(contenidoComunicacion)
    } catch {
      // El marcado queda disponible aunque el navegador bloquee clipboard.
    }
    marcarComunicacionCopiadaMutation.mutate()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!items.length) {
      setErrorLocal("Agrega al menos un item antes de crear la solicitud.")
      return
    }
    const sinUnidad = items.filter((item) => !item.unidad || !item.unidad.trim())
    if (sinUnidad.length) {
      setErrorLocal(`Elegí la unidad de: ${sinUnidad.map((item) => item.nombre).join(", ")}.`)
      return
    }
    if (editandoId != null) {
      actualizarMutation.mutate()
    } else {
      crearMutation.mutate()
    }
  }

  return (
    <section>
      <PageHeader
        title="Compras"
        description="Solicitudes internas creadas desde reposicion sugerida o necesidades manuales."
        plain
        action={
          <Button type="button" onClick={iniciarNuevaSolicitud}>
            <Plus size={18} aria-hidden="true" />
            Nueva solicitud
          </Button>
        }
      />

      {mensaje ? <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div> : null}
      {errorLocal ? <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div> : null}
      {revalidacion ? <div className="mb-6 border-l-4 border-cds-focus bg-cds-layer01 px-4 py-3 text-sm">{revalidacion}</div> : null}

      <ModuleNav
        actions={[
          { label: "Solicitudes", onClick: () => setTab("solicitudes"), icon: <FileText size={18} aria-hidden="true" />, variant: tab === "solicitudes" ? "primary" : "secondary" },
          { label: "Armar pedido", onClick: () => setTab("armar"), icon: <Plus size={18} aria-hidden="true" />, variant: tab === "armar" ? "primary" : "secondary" },
        ]}
      />

      {/* Tira de métricas del pipeline — clicables: setean el filtro de estado */}
      {tab === "solicitudes" ? (
      <div className="mb-7 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
        <PipelineTile label="Borradores" value={pipeline.borradores} icon={FileText} onClick={() => setEstadoFiltro("borrador")} active={estadoFiltro === "borrador"} />
        <PipelineTile label="Pend. aprobación" value={pipeline.pendientes} icon={Clock} tone="warning" onClick={() => setEstadoFiltro("pendiente_aprobacion")} active={estadoFiltro === "pendiente_aprobacion"} />
        <PipelineTile label="Aprobadas · por pedir" value={pipeline.porPedir} icon={ClipboardCheck} onClick={() => setEstadoFiltro("aprobada")} active={estadoFiltro === "aprobada"} />
        <PipelineTile label="En camino" value={pipeline.enCamino} icon={Truck} tone="petrol" onClick={() => setEstadoFiltro("aprobada")} />
        <PipelineTile label="Recibidas (mes)" value={pipeline.recibidasMes} icon={Check} onClick={() => setEstadoFiltro("recibida")} active={estadoFiltro === "recibida"} />
      </div>
      ) : null}

      {/* Maestro-detalle: izquierda y derecha cambian según la pestaña activa. */}
      <div className={cn("grid items-start gap-6", tab === "armar" ? "xl:grid-cols-[minmax(0,1fr)_560px]" : "xl:grid-cols-[minmax(0,1fr)_430px]")}>
        {/* ===== IZQUIERDA: Solicitudes → filtros + lista · Armar → reposición + tareas ===== */}
        <div className="space-y-6">
          {tab === "solicitudes" ? (
          <>
          {/* Filtros: esenciales + "Más filtros" */}
          <section className="border border-cds-borderSubtle bg-cds-layer01">
            <div className="flex flex-col gap-3 border-b border-cds-borderSubtle p-4 md:flex-row md:items-end">
              <label className="md:flex-1">
                <span className="mb-1 block text-xs tracking-[0.32px] text-cds-textSecondary">Buscar</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={17} aria-hidden="true" />
                  <Input className="pl-11" value={busquedaSolicitudFiltro} onChange={(event) => setBusquedaSolicitudFiltro(event.target.value)} placeholder="Código, título, reactivo o proveedor" />
                </div>
              </label>
              <label className="md:w-[180px]">
                <span className="mb-1 block text-xs tracking-[0.32px] text-cds-textSecondary">Estado</span>
                <select
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                  value={estadoFiltro}
                  onChange={(event) => setEstadoFiltro(event.target.value)}
                >
                  {estadosFiltro.map((estado) => (
                    <option key={estado || "todos"} value={estado}>{estado ? estadoSolicitudLabel(estado) : "Todos"}</option>
                  ))}
                </select>
              </label>
              <label className="md:w-[150px]">
                <span className="mb-1 block text-xs tracking-[0.32px] text-cds-textSecondary">Prioridad</span>
                <select
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                  value={prioridadFiltro}
                  onChange={(event) => setPrioridadFiltro(event.target.value)}
                >
                  <option value="">Todas</option>
                  {prioridades.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <Button type="button" size="compact" variant="secondary" onClick={() => setFiltrosAbiertos((value) => !value)}>
                <SlidersHorizontal size={15} aria-hidden="true" />
                Más filtros
              </Button>
            </div>

            {filtrosAbiertos ? (
              <div className="grid gap-3 border-b border-cds-borderSubtle p-4 md:grid-cols-2 xl:grid-cols-3">
                <label>
                  <span className="mb-1 block text-xs tracking-[0.32px] text-cds-textSecondary">Proveedor</span>
                  <select
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                    value={proveedorFiltro}
                    onChange={(event) => setProveedorFiltro(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs tracking-[0.32px] text-cds-textSecondary">Reactivo</span>
                  <select
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                    value={reactivoFiltro}
                    onChange={(event) => setReactivoFiltro(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {reactivos.map((reactivo) => (
                      <option key={reactivo.id} value={reactivo.id}>{reactivo.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs tracking-[0.32px] text-cds-textSecondary">Solicitante</span>
                  <select
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                    value={solicitadoPorFiltro}
                    onChange={(event) => setSolicitadoPorFiltro(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs tracking-[0.32px] text-cds-textSecondary">Aprobador</span>
                  <select
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                    value={aprobadoPorFiltro}
                    onChange={(event) => setAprobadoPorFiltro(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <Label htmlFor="compras-filtro-desde">Creada desde</Label>
                  <Input id="compras-filtro-desde" type="date" value={desdeFiltro} onChange={(event) => setDesdeFiltro(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="compras-filtro-hasta">Creada hasta</Label>
                  <Input id="compras-filtro-hasta" type="date" value={hastaFiltro} onChange={(event) => setHastaFiltro(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="compras-filtro-necesaria-desde">Necesario desde</Label>
                  <Input id="compras-filtro-necesaria-desde" type="date" value={fechaNecesariaDesdeFiltro} onChange={(event) => setFechaNecesariaDesdeFiltro(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="compras-filtro-necesaria-hasta">Necesario hasta</Label>
                  <Input id="compras-filtro-necesaria-hasta" type="date" value={fechaNecesariaHastaFiltro} onChange={(event) => setFechaNecesariaHastaFiltro(event.target.value)} />
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between px-4 py-3 text-xs tracking-[0.16px] text-cds-textSecondary">
              <span>Mostrando {solicitudes.length} solicitud{solicitudes.length === 1 ? "" : "es"}</span>
              <button type="button" onClick={limpiarFiltrosSolicitudes} className="underline underline-offset-2 hover:text-cds-textPrimary">
                Limpiar filtros
              </button>
            </div>
          </section>

          {/* Lista de solicitudes */}
          <section className="border border-cds-borderSubtle bg-cds-layer01">
            {solicitudesQuery.isLoading ? (
              <div className="p-4 text-sm text-cds-textSecondary">Cargando solicitudes...</div>
            ) : solicitudes.length ? (
              <div className="divide-y divide-cds-borderSubtle">
                {solicitudes.map((solicitud) => {
                  const seleccionada = solicitudSeleccionadaId === solicitud.id
                  const prioridadAlta = solicitud.prioridad === "alta" || solicitud.prioridad === "urgente"
                  const submeta = [
                    `Creada ${formatDate(solicitud.fecha_creacion)}`,
                    solicitud.fecha_necesaria ? `necesaria ${formatDate(solicitud.fecha_necesaria)}` : null,
                    solicitud.fecha_pedido ? `pedido ${formatDate(solicitud.fecha_pedido)}` : null,
                  ].filter(Boolean).join(" · ")
                  return (
                    <button
                      key={solicitud.id}
                      type="button"
                      onClick={() => seleccionarSolicitud(solicitud.id)}
                      className={cn(
                        "grid w-full grid-cols-[1fr_auto] items-center gap-3 px-[18px] py-[15px] text-left transition-colors hover:bg-[var(--cds-layer-hover-01)]",
                        seleccionada && "bg-lab-blueTint shadow-[inset_3px_0_0_var(--lab-blue)]",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-[12.5px] text-cds-textSecondary">{solicitud.codigo}</span>
                          <span className={cn("inline-flex min-h-[22px] items-center rounded-3xl px-2.5 text-[11.5px] tracking-[0.16px] ring-1 ring-inset", estadoClasses(solicitud.estado))}>{estadoSolicitudLabel(solicitud.estado)}</span>
                          {prioridadAlta ? (
                            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-cds-supportError">
                              <span className="h-1.5 w-1.5 rounded-full bg-cds-supportError" aria-hidden="true" />
                              {solicitud.prioridad}
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-[15px] font-semibold tracking-[0.16px]">{solicitud.titulo}</div>
                        <div className="mt-1 text-[12.5px] text-cds-textPlaceholder">{submeta}</div>
                      </div>
                      <div className="whitespace-nowrap text-right">
                        <div className="font-mono text-[15px]">{formatMoney(solicitud.costo_total_estimado, "ARS")}</div>
                        <div className="mt-1 text-[12px] text-cds-textPlaceholder">{solicitud.items_count ?? 0} item(s)</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-sm text-cds-textSecondary">Todavia no hay solicitudes.</div>
            )}
          </section>
          </>
          ) : (
          <>
          {/* Reposición sugerida */}
          <section className="border border-cds-borderSubtle bg-cds-layer01">
            <div className="flex flex-col gap-3 border-b border-cds-borderSubtle p-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-semibold">Reposicion sugerida</h2>
                <p className="mt-1 text-sm text-cds-textSecondary">Ranking deterministico; la solicitud guarda snapshot al crear.</p>
              </div>
              <label className="w-full max-w-[180px]">
                <span className="mb-1 block text-xs text-cds-textSecondary">Ventana</span>
                <select
                  className="h-9 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                  value={dias}
                  onChange={(event) => setDias(Number(event.target.value))}
                >
                  <option value={15}>Ultimos 15 dias</option>
                  <option value={30}>Ultimos 30 dias</option>
                  <option value={60}>Ultimos 60 dias</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs uppercase tracking-[0.32px] text-cds-textSecondary">
                  <tr>
                    <th className="px-4 py-3 font-normal">Reactivo</th>
                    <th className="px-3 py-3 font-normal">Nivel</th>
                    <th className="px-3 py-3 text-right font-normal">Stock</th>
                    <th className="px-3 py-3 text-right font-normal">Sugerido</th>
                    <th className="px-4 py-3 font-normal"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cds-borderSubtle">
                  {sugerenciasQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-cds-textSecondary">Cargando sugerencias...</td>
                    </tr>
                  ) : recomendaciones.length ? (
                    recomendaciones.map((recomendacion) => {
                      const selected = items.some((item) => item.origen === "reposicion" && item.reactivo_id === recomendacion.reactivo_id)
                      const bloqueada = Boolean(recomendacion.compra_activa)
                      return (
                        <tr key={recomendacion.reactivo_id} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium">{recomendacion.reactivo_nombre}</div>
                            <div className="mt-1 text-xs text-cds-textPlaceholder">{recomendacion.motivos.join(" · ") || "Sin motivo"}</div>
                            {recomendacion.riesgo_quiebre === "inminente" || recomendacion.riesgo_quiebre === "pedir_ya" ? (
                              <div
                                className={cn("mt-2 inline-flex px-2 py-1 text-xs ring-1 ring-inset", riesgoQuiebreClasses(recomendacion.riesgo_quiebre))}
                                title={leadTimeQuiebreTitle(recomendacion)}
                              >
                                {riesgoQuiebreLabels[recomendacion.riesgo_quiebre]}
                                {recomendacion.fecha_limite_pedido ? ` · pedí antes del ${formatDate(recomendacion.fecha_limite_pedido)}` : ""}
                                {leadTimeQuiebreLabel(recomendacion)}
                              </div>
                            ) : null}
                            {recomendacion.consejo_proveedor ? (
                              <div className="mt-1 text-xs text-cds-textSecondary">Sugerencia: {recomendacion.consejo_proveedor}</div>
                            ) : null}
                            {recomendacion.opciones_proveedor && recomendacion.opciones_proveedor.length > 1 ? (
                              <div className="mt-1 text-xs text-cds-textPlaceholder">
                                Proveedores: {recomendacion.opciones_proveedor.map((opcion) => `${opcion.proveedor_nombre} ~${formatNumber(opcion.lead_time_dias)}d${opcion.llega_a_tiempo ? " ✓" : ""}`).join(" · ")}
                              </div>
                            ) : null}
                            {recomendacion.compra_activa ? (
                              <div className="mt-2 inline-flex bg-lab-warmTint px-2 py-1 text-xs text-lab-warmFg ring-1 ring-inset ring-lab-warm/40">
                                {estadoCompraActivaLabel(recomendacion.compra_activa.estado)} · {recomendacion.compra_activa.codigo}
                                {recomendacion.compra_activa.cantidad_pendiente > 0
                                  ? ` · pendiente ${formatNumber(recomendacion.compra_activa.cantidad_pendiente)} ${recomendacion.compra_activa.unidad}`
                                  : ""}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex px-2 py-1 text-xs ring-1 ring-inset", nivelClasses(recomendacion.nivel))}>{recomendacion.nivel}</span>
                          </td>
                          <td className={cn("px-3 py-3 text-right font-mono", Number(recomendacion.stock_actual) <= 0 && "text-cds-supportError")}>
                            {formatNumber(recomendacion.stock_actual)} {recomendacion.unidad}
                          </td>
                          <td className="px-3 py-3 text-right font-mono">{formatNumber(recomendacion.cantidad_sugerida)} {recomendacion.unidad}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              size="compact"
                              variant={selected || bloqueada ? "secondary" : "primary"}
                              onClick={() => agregarRecomendacion(recomendacion)}
                              disabled={selected || bloqueada}
                            >
                              {selected ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                              {selected ? "Agregado" : bloqueada ? "En curso" : "Agregar"}
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-cds-textSecondary">No hay recomendaciones activas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tareas de reposición → carrito (cierre del ciclo Tareas ⇄ Compras) */}
          <section className="border border-cds-borderSubtle bg-cds-layer01">
            <div className="flex items-center gap-2 border-b border-cds-borderSubtle p-4">
              <ClipboardList size={18} aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold">Tareas de reposicion pendientes</h2>
                <p className="mt-1 text-sm text-cds-textSecondary">Volca las tareas “Reponer X” al carrito. Al recibir la compra, la tarea se completa sola.</p>
              </div>
            </div>
            <div className="divide-y divide-cds-borderSubtle">
              {tareasPendientesQuery.isLoading ? (
                <div className="p-4 text-sm text-cds-textSecondary">Cargando tareas...</div>
              ) : tareasPendientes.length ? (
                tareasPendientes.map((tarea) => {
                  const enCarrito = items.some((item) => item.tarea_id === tarea.tarea_id)
                  const compraActiva = tarea.recomendacion?.compra_activa
                  const bloqueada = Boolean(compraActiva)
                  const riesgo = tarea.recomendacion?.riesgo_quiebre
                  return (
                    <div key={tarea.tarea_id} className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="font-medium">{tarea.reactivo_nombre}</div>
                        <div className="mt-1 text-xs text-cds-textPlaceholder">#{tarea.tarea_id} · {tarea.titulo}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex px-2 py-1 text-xs ring-1 ring-inset", prioridadTareaClasses(tarea.prioridad))}>{tarea.prioridad}</span>
                          {riesgo === "inminente" || riesgo === "pedir_ya" ? (
                            <span className={cn("inline-flex px-2 py-1 text-xs ring-1 ring-inset", riesgoQuiebreClasses(riesgo))}>{riesgoQuiebreLabels[riesgo]}</span>
                          ) : null}
                          {!tarea.tiene_recomendacion ? (
                            <span className="inline-flex px-2 py-1 text-xs text-cds-textSecondary ring-1 ring-inset ring-cds-borderSubtle">Sin recomendacion vigente</span>
                          ) : null}
                          {compraActiva ? (
                            <span className="inline-flex bg-lab-warmTint px-2 py-1 text-xs text-lab-warmFg ring-1 ring-inset ring-lab-warm/40">
                              {estadoCompraActivaLabel(compraActiva.estado)} · {compraActiva.codigo}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="compact"
                        variant={enCarrito || bloqueada ? "secondary" : "primary"}
                        onClick={() => agregarTarea(tarea)}
                        disabled={enCarrito || bloqueada}
                      >
                        {enCarrito ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                        {enCarrito ? "Agregado" : bloqueada ? "En curso" : "Agregar"}
                      </Button>
                    </div>
                  )
                })
              ) : (
                <div className="p-4 text-sm text-cds-textSecondary">No hay tareas de reposicion pendientes.</div>
              )}
            </div>
          </section>
          </>
          )}
        </div>

        {/* ===== DERECHA: Armar → constructor (no sticky, así no se corta al scrollear)
                            Solicitudes → detalle (sticky) ===== */}
        <div className={cn("space-y-6", tab === "solicitudes" && "xl:sticky xl:top-6")}>
          {tab === "armar" ? (
            <form className="space-y-6" onSubmit={submit}>
              {editandoId == null ? (
                <section className="border border-cds-borderSubtle bg-cds-layer01">
                  <div className="flex items-center gap-2 border-b border-cds-borderSubtle p-4">
                    <Sparkles size={18} aria-hidden="true" />
                    <h2 className="text-base font-semibold">Describir el pedido</h2>
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="text-xs text-cds-textSecondary">
                      Escribí lo que necesitás en lenguaje natural y la IA arma un borrador de ítems. Revisalo abajo antes de guardar.
                    </p>
                    <textarea
                      id="compra-pedido-ia"
                      className="min-h-[96px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus"
                      value={pedidoIA}
                      onChange={(event) => setPedidoIA(event.target.value)}
                      placeholder="Ej: reponer guantes de nitrilo talle M, 5 cajas, y agar nutritivo para un par de meses"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="compact"
                        onClick={() => construirMutation.mutate()}
                        disabled={construirMutation.isPending || !pedidoIA.trim()}
                      >
                        <Sparkles size={16} aria-hidden="true" />
                        {construirMutation.isPending ? "Armando..." : "Armar borrador"}
                      </Button>
                    </div>
                    {advertenciasConstructorIA.length ? (
                      <div className="border-l-2 border-cds-supportWarning pl-3 text-xs text-cds-textSecondary">
                        <div className="font-medium text-cds-textPrimary">Revisar antes de guardar</div>
                        {advertenciasConstructorIA.map((advertencia) => (
                          <div key={advertencia} className="mt-1">{advertencia}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="border border-cds-borderSubtle bg-cds-layer01">
                <div className="flex items-center justify-between border-b border-cds-borderSubtle p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={18} aria-hidden="true" />
                    <h2 className="text-base font-semibold">{editandoId == null ? "Nueva solicitud" : "Editar solicitud"}</h2>
                  </div>
                  <Button type="button" size="compact" variant="secondary" onClick={cancelarEdicion}>Cancelar</Button>
                </div>
                <div className="grid gap-4 p-4">
                  <div>
                    <Label htmlFor="compra-titulo">Titulo</Label>
                    <Input id="compra-titulo" value={titulo} onChange={(event) => setTitulo(event.target.value)} required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs text-cds-textSecondary">Prioridad</span>
                      <select
                        className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                        value={prioridad}
                        onChange={(event) => setPrioridad(event.target.value as CompraPrioridad)}
                      >
                        {prioridades.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <div>
                      <Label htmlFor="compra-fecha">Necesario para</Label>
                      <Input id="compra-fecha" type="date" value={fechaNecesaria} onChange={(event) => setFechaNecesaria(event.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="compra-notas">Notas</Label>
                    <Input id="compra-notas" value={notas} onChange={(event) => setNotas(event.target.value)} placeholder="Validar proveedor y disponibilidad antes de comprar" />
                  </div>
                </div>
              </section>

              <section className="border border-cds-borderSubtle bg-cds-layer01">
                <div className="flex items-center justify-between border-b border-cds-borderSubtle p-4">
                  <h2 className="text-base font-semibold">Items seleccionados</h2>
                  <div className="text-sm text-cds-textSecondary">Total: {formatMoney(totalEstimado)}</div>
                </div>
                <div className="space-y-3 p-4">
                  {items.length ? (
                    items.map((item) => (
                      <div key={item.key} className="border border-cds-borderSubtle bg-cds-layer02 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{item.nombre}</div>
                            <div className="mt-1 text-xs text-cds-textSecondary">
                              {item.origen === "reposicion" ? `Reposicion · stock ${formatNumber(item.stock_actual)} · sugerido ${formatNumber(item.cantidad_sugerida)} ${item.unidad}` : "Manual"}
                            </div>
                          </div>
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.key)}>
                            <Trash2 size={16} aria-hidden="true" />
                            <span className="sr-only">Quitar</span>
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`${item.key}-cantidad`}>Cantidad</Label>
                            <Input id={`${item.key}-cantidad`} type="number" min="0" step="any" value={item.cantidad_solicitada} onChange={(event) => updateItem(item.key, { cantidad_solicitada: Number(event.target.value) })} />
                          </div>
                          <div>
                            <Label htmlFor={`${item.key}-unidad`}>Unidad</Label>
                            <select
                              id={`${item.key}-unidad`}
                              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                              value={item.unidad ?? ""}
                              onChange={(event) => updateItem(item.key, { unidad: event.target.value })}
                            >
                              <option value="" disabled>Elegí unidad</option>
                              {item.unidad && !unidadesOpciones.includes(item.unidad) ? (
                                <option value={item.unidad}>{item.unidad}</option>
                              ) : null}
                              {unidadesOpciones.map((unidad) => (
                                <option key={unidad} value={unidad}>{unidad}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor={`${item.key}-costo`}>Costo unitario</Label>
                            <Input id={`${item.key}-costo`} type="number" min="0" step="any" value={item.costo_unitario_estimado ?? 0} onChange={(event) => updateItem(item.key, { costo_unitario_estimado: Number(event.target.value) })} />
                          </div>
                          <div>
                            <Label htmlFor={`${item.key}-proveedor`}>Proveedor</Label>
                            <select
                              id={`${item.key}-proveedor`}
                              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                              value={item.proveedor_nombre ?? ""}
                              onChange={(event) => {
                                const nombre = event.target.value
                                const elegido = proveedores.find((proveedor) => proveedor.nombre === nombre)
                                updateItem(item.key, { proveedor_nombre: nombre || null, proveedor_id: elegido?.id ?? null })
                              }}
                            >
                              <option value="">Sin proveedor</option>
                              {item.proveedor_nombre && !proveedores.some((proveedor) => proveedor.nombre === item.proveedor_nombre) ? (
                                <option value={item.proveedor_nombre}>{item.proveedor_nombre} (sugerido)</option>
                              ) : null}
                              {proveedores.map((proveedor) => (
                                <option key={proveedor.id} value={proveedor.nombre}>{proveedor.nombre}</option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`${item.key}-presentacion`}>Presentacion</Label>
                            <Input id={`${item.key}-presentacion`} value={item.presentacion ?? ""} placeholder="Formato comercial, ej. Frasco 500 ml, caja x 100 u" onChange={(event) => updateItem(item.key, { presentacion: event.target.value })} />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`${item.key}-notas`}>Notas</Label>
                            <Input id={`${item.key}-notas`} value={item.notas ?? ""} onChange={(event) => updateItem(item.key, { notas: event.target.value })} />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-dashed border-cds-borderSubtle p-6 text-sm text-cds-textSecondary">Agrega recomendaciones o items manuales para crear la solicitud.</div>
                  )}
                </div>
              </section>

              <section className="border border-cds-borderSubtle bg-cds-layer01 p-4">
                <h2 className="text-base font-semibold">Compra manual</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="manual-busqueda">Reactivo o insumo</Label>
                    <Input
                      id="manual-busqueda"
                      value={manual.busqueda}
                      onChange={(event) => setManual((current) => ({ ...current, busqueda: event.target.value, reactivoId: "", loteReferenciaId: "" }))}
                      placeholder="Buscar en catalogo o escribir libre"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-cantidad">Cantidad</Label>
                    <Input id="manual-cantidad" type="number" min="0" step="any" value={manual.cantidad} onChange={(event) => setManual((current) => ({ ...current, cantidad: event.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="manual-unidad">Unidad</Label>
                    <select
                      id="manual-unidad"
                      className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                      value={manual.unidad}
                      onChange={(event) => setManual((current) => ({ ...current, unidad: event.target.value }))}
                    >
                      {!unidadesOpciones.includes(manual.unidad) && manual.unidad ? (
                        <option value={manual.unidad}>{manual.unidad}</option>
                      ) : null}
                      {unidadesOpciones.map((unidad) => (
                        <option key={unidad} value={unidad}>{unidad}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="manual-costo">Costo unitario</Label>
                    <Input id="manual-costo" type="number" min="0" step="any" value={manual.costo} onChange={(event) => setManual((current) => ({ ...current, costo: event.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="manual-presentacion">Presentacion</Label>
                    <Input id="manual-presentacion" value={manual.presentacion} placeholder="Formato comercial, ej. Frasco 500 ml, caja x 100 u" onChange={(event) => setManual((current) => ({ ...current, presentacion: event.target.value }))} />
                  </div>
                </div>

                {manual.busqueda.trim() ? (
                  <div className="mt-4 space-y-3">
                    <div className="border border-cds-borderSubtle bg-cds-layer02 p-3">
                      <div className="text-xs font-medium uppercase tracking-[0.32px] text-cds-textSecondary">Catalogo</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {reactivosManual.length ? (
                          reactivosManual.map((reactivo) => (
                            <Button
                              key={reactivo.id}
                              type="button"
                              size="compact"
                              variant={manual.reactivoId === String(reactivo.id) ? "primary" : "secondary"}
                              onClick={() => seleccionarReactivoManual(reactivo)}
                              className="h-auto min-h-10 max-w-full whitespace-normal text-left"
                            >
                              <span className="min-w-0">
                                <span className="block truncate">{reactivo.nombre}</span>
                                <span className="block text-xs opacity-80">{formatNumber(reactivo.stock_total)} {reactivo.unidad}</span>
                              </span>
                            </Button>
                          ))
                        ) : (
                          <div className="text-sm text-cds-textSecondary">Sin coincidencias de catalogo.</div>
                        )}
                      </div>
                    </div>
                    <div className="border border-cds-borderSubtle bg-cds-layer02 p-3">
                      <div className="text-xs font-medium uppercase tracking-[0.32px] text-cds-textSecondary">Precios historicos</div>
                      <div className="mt-2 space-y-2">
                        {lotesReferencia.length ? (
                          lotesReferencia.map((lote) => {
                            const unitario = costoUnitarioLote(lote)
                            return (
                              <button
                                key={lote.id}
                                type="button"
                                onClick={() => seleccionarLoteReferencia(lote)}
                                className={cn(
                                  "w-full border p-2 text-left text-sm transition-colors hover:bg-cds-layer01",
                                  manual.loteReferenciaId === String(lote.id) ? "border-cds-buttonPrimary bg-cds-layer01" : "border-cds-borderSubtle bg-cds-layer02",
                                )}
                              >
                                <span className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium">{lote.codigo_interno}</span>
                                  <span>{formatMoney(lote.costo_total)}</span>
                                </span>
                                <span className="mt-1 block text-xs text-cds-textSecondary">
                                  {lote.reactivo_nombre} · {lote.proveedor || "Sin proveedor"} · {formatMoney(unitario)} / {lote.unidad}
                                </span>
                              </button>
                            )
                          })
                        ) : (
                          <div className="text-sm text-cds-textSecondary">Sin lotes con costo cargado.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="manual-proveedor">Proveedor</Label>
                    <Input id="manual-proveedor" value={manual.proveedor} onChange={(event) => setManual((current) => ({ ...current, proveedor: event.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" size="compact" variant="secondary" className="w-full" onClick={agregarManual}>
                      <Plus size={16} aria-hidden="true" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <Button type="submit" disabled={crearMutation.isPending || actualizarMutation.isPending || !items.length}>
                  <Save size={18} aria-hidden="true" />
                  {editandoId == null
                    ? crearMutation.isPending ? "Creando..." : "Crear solicitud"
                    : actualizarMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          ) : solicitudSeleccionada ? (
            <>
              <section className="border border-cds-borderSubtle bg-cds-layer01">
                <div className="border-b border-cds-borderSubtle px-[18px] py-4">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="font-mono text-[12.5px] text-cds-textSecondary">{solicitudSeleccionada.codigo}</span>
                    <span className={cn("inline-flex min-h-[22px] items-center rounded-3xl px-2.5 text-[11.5px] tracking-[0.16px] ring-1 ring-inset", estadoClasses(solicitudSeleccionada.estado))}>{estadoSolicitudLabel(solicitudSeleccionada.estado)}</span>
                  </div>
                  <div className="mt-2 text-[18px] font-semibold">{solicitudSeleccionada.titulo}</div>
                  <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[12.5px] text-cds-textPlaceholder">
                    <span>{solicitudSeleccionada.prioridad}</span>
                    {solicitudSeleccionada.fecha_necesaria ? <span>· necesaria {formatDate(solicitudSeleccionada.fecha_necesaria)}</span> : null}
                    {solicitudSeleccionada.fecha_pedido ? <span>· pedido {formatDate(solicitudSeleccionada.fecha_pedido)}</span> : null}
                  </div>
                  {["borrador", "cambios_solicitados"].includes(solicitudSeleccionada.estado) ? (
                    <Button type="button" size="compact" variant="secondary" className="mt-3" onClick={() => cargarSolicitudParaEditar(solicitudSeleccionada)}>Editar</Button>
                  ) : null}
                </div>

                <div className="border-b border-cds-borderSubtle p-[18px]">
                  <div className="mb-3.5 text-[11.5px] uppercase tracking-[0.32px] text-cds-textSecondary">Estado del flujo</div>
                  <WorkflowTimeline estado={solicitudSeleccionada.estado} entrega={solicitudSeleccionada.estado_entrega} />
                </div>

                <div className="px-[18px] py-4">
                  {(() => {
                    const next = accionSiguiente(solicitudSeleccionada.estado, solicitudSeleccionada.estado_entrega)
                    if (!next) {
                      return <div className="text-[13px] text-cds-textSecondary">Sin acciones pendientes para esta solicitud.</div>
                    }
                    const NextIcon = next.icon
                    const requiereFecha = next.accion === "pedido" || next.accion === "en_camino"
                    const ejecutar = () => {
                      if (next.accion === "recepcion") {
                        const item = (solicitudSeleccionada.items ?? []).find((it) => ["aprobado", "recibido_parcial"].includes(it.estado) && cantidadPendienteItem(it) > 0)
                        if (item) {
                          abrirRecepcion(item)
                        } else {
                          setErrorLocal("No hay items pendientes de recepción.")
                        }
                        return
                      }
                      ejecutarWorkflow(next.accion)
                    }
                    return (
                      <>
                        <div className="mb-2.5 text-[13px] text-cds-textSecondary">Acción siguiente</div>
                        {requiereFecha ? (
                          <div className="mb-3">
                            <Label htmlFor="compra-fecha-pedido">Pedido enviado el</Label>
                            <Input id="compra-fecha-pedido" type="date" max={todayKey()} value={fechaPedidoWorkflow} onChange={(event) => setFechaPedidoWorkflow(event.target.value)} />
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <Button type="button" className="flex-1" onClick={ejecutar} disabled={workflowMutation.isPending || (requiereFecha && !fechaPedidoWorkflow)}>
                            <NextIcon size={16} aria-hidden="true" />
                            {next.label}
                          </Button>
                          <Button type="button" size="icon" variant="secondary" onClick={() => revalidarMutation.mutate(solicitudSeleccionada.id)} disabled={revalidarMutation.isPending} title="Revalidar">
                            <RefreshCw size={17} aria-hidden="true" />
                            <span className="sr-only">Revalidar</span>
                          </Button>
                        </div>
                      </>
                    )
                  })()}

                  {["borrador", "pendiente_aprobacion", "cambios_solicitados", "aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) ? (
                    <details className="mt-3 border-t border-cds-borderSubtle pt-3">
                      <summary className="cursor-pointer text-[13px] text-cds-textSecondary">Más acciones</summary>
                      <div className="mt-3 space-y-3">
                        {solicitudSeleccionada.estado === "pendiente_aprobacion" ? (
                          <div>
                            <Label htmlFor="compra-workflow-motivo">Motivo</Label>
                            <Input id="compra-workflow-motivo" value={motivoWorkflow} onChange={(event) => setMotivoWorkflow(event.target.value)} placeholder="Requerido para rechazar o pedir cambios" />
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          {solicitudSeleccionada.estado === "pendiente_aprobacion" ? (
                            <>
                              <Button type="button" size="compact" variant="secondary" onClick={() => ejecutarWorkflow("cambios")} disabled={workflowMutation.isPending}>Pedir cambios</Button>
                              <Button type="button" size="compact" variant="danger" onClick={() => ejecutarWorkflow("rechazar")} disabled={workflowMutation.isPending}>
                                <X size={16} aria-hidden="true" />
                                Rechazar
                              </Button>
                            </>
                          ) : null}
                          <Button type="button" size="compact" variant="secondary" onClick={() => ejecutarWorkflow("cancelar")} disabled={workflowMutation.isPending}>Cancelar solicitud</Button>
                        </div>
                      </div>
                    </details>
                  ) : null}
                </div>
              </section>

              <section className="border border-cds-borderSubtle bg-cds-layer01">
                <div className="flex items-center justify-between border-b border-cds-borderSubtle px-[18px] py-[15px]">
                  <h2 className="text-[15px] font-semibold">Ítems de la solicitud</h2>
                  <span className="text-[12.5px] text-cds-textPlaceholder">{(solicitudSeleccionada.items ?? []).length} ítems</span>
                </div>
                <div>
                  {(solicitudSeleccionada.items ?? []).map((item) => {
                    const pendiente = cantidadPendienteItem(item)
                    const recibido = Number(item.cantidad_recibida ?? 0)
                    const recepcionActiva = recepcionDraft.itemId === item.id
                    const puedeRecibir =
                      ["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) &&
                      ["aprobado", "recibido_parcial"].includes(item.estado) &&
                      pendiente > 0
                    return (
                      <div key={item.id} className="border-b border-cds-borderSubtle">
                        <div className="grid grid-cols-[1fr_auto] items-start gap-3 px-[18px] py-[13px]">
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-medium">{item.reactivo_nombre ?? item.descripcion_manual}</div>
                            <div className="mt-1 text-[12px] text-cds-textPlaceholder">
                              {estadoItemLabel(item.estado)}
                              {item.cantidad_aprobada != null ? ` · aprobado ${formatNumber(item.cantidad_aprobada)} ${item.unidad}` : ""}
                              {recibido > 0 ? ` · recibido ${formatNumber(recibido)} ${item.unidad}` : ""}
                              {pendiente > 0 && item.cantidad_aprobada != null ? ` · pendiente ${formatNumber(pendiente)} ${item.unidad}` : ""}
                              {item.proveedor_nombre_snapshot ? ` · ${item.proveedor_nombre_snapshot}` : ""}
                            </div>
                          </div>
                          <div className="whitespace-nowrap text-right">
                            <div className="font-mono text-[13.5px]">{formatNumber(item.cantidad_solicitada)} {item.unidad}</div>
                            <div className="mt-1 font-mono text-[12px] text-cds-textPlaceholder">{formatMoney(Number(item.cantidad_solicitada) * Number(item.costo_unitario_estimado), item.moneda ?? "ARS")}</div>
                            {puedeRecibir && !recepcionActiva ? (
                              <Button type="button" size="compact" variant="secondary" className="mt-1.5" onClick={() => abrirRecepcion(item)}>
                                <Check size={14} aria-hidden="true" />
                                Vincular lote
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        {recepcionActiva ? (
                          <div className="border-t border-cds-borderSubtle bg-cds-layer02 p-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="sm:col-span-3">
                                <Label htmlFor={`recepcion-lote-${item.id}`}>Buscar lote recibido</Label>
                                <Input
                                  id={`recepcion-lote-${item.id}`}
                                  value={recepcionDraft.busqueda}
                                  onChange={(event) => setRecepcionDraft((current) => ({ ...current, busqueda: event.target.value, loteId: "" }))}
                                  placeholder="Código interno, lote o reactivo"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`recepcion-cantidad-${item.id}`}>Cantidad</Label>
                                <Input id={`recepcion-cantidad-${item.id}`} type="number" min="0" step="any" value={recepcionDraft.cantidad} onChange={(event) => setRecepcionDraft((current) => ({ ...current, cantidad: event.target.value }))} />
                              </div>
                              <div>
                                <Label htmlFor={`recepcion-unidad-${item.id}`}>Unidad</Label>
                                <select
                                  id={`recepcion-unidad-${item.id}`}
                                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                                  value={recepcionDraft.unidad}
                                  onChange={(event) => setRecepcionDraft((current) => ({ ...current, unidad: event.target.value }))}
                                >
                                  {recepcionDraft.unidad && !unidadesOpciones.includes(recepcionDraft.unidad) ? (
                                    <option value={recepcionDraft.unidad}>{recepcionDraft.unidad}</option>
                                  ) : null}
                                  {unidadesOpciones.map((unidad) => (
                                    <option key={unidad} value={unidad}>{unidad}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {lotesRecepcionQuery.isFetching ? (
                                <span className="text-xs text-cds-textSecondary">Buscando lotes...</span>
                              ) : lotesRecepcion.length ? (
                                lotesRecepcion.map((lote) => (
                                  <Button
                                    key={lote.id}
                                    type="button"
                                    size="compact"
                                    variant={recepcionDraft.loteId === String(lote.id) ? "primary" : "secondary"}
                                    onClick={() => setRecepcionDraft((current) => ({ ...current, loteId: String(lote.id), cantidad: cantidadSugeridaRecepcion(item, lote), unidad: lote.unidad }))}
                                  >
                                    {lote.codigo_interno} · {formatNumber(cantidadInicialLote(lote))} {lote.unidad}
                                  </Button>
                                ))
                              ) : busquedaRecepcionApi.length >= 2 ? (
                                <span className="text-xs text-cds-textSecondary">No hay lotes compatibles ingresados desde la fecha de pedido o aprobación.</span>
                              ) : (
                                <span className="text-xs text-cds-textSecondary">Escribí al menos 2 caracteres para buscar lotes.</span>
                              )}
                            </div>
                            <div className="mt-3">
                              <Label htmlFor={`recepcion-observacion-${item.id}`}>Observación</Label>
                              <Input
                                id={`recepcion-observacion-${item.id}`}
                                value={recepcionDraft.observacion}
                                onChange={(event) => setRecepcionDraft((current) => ({ ...current, observacion: event.target.value }))}
                                placeholder={loteRecepcion ? `Lote ${loteRecepcion.codigo_interno} seleccionado` : "Opcional"}
                              />
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                              <Button type="button" size="compact" variant="secondary" onClick={() => setRecepcionDraft({ ...emptyRecepcionDraft })}>Cancelar</Button>
                              <Button type="button" size="compact" onClick={registrarRecepcion} disabled={registrarRecepcionMutation.isPending || !recepcionDraft.loteId || !recepcionDraft.cantidad}>
                                <Check size={16} aria-hidden="true" />
                                Guardar recepción
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between bg-cds-layer01 px-[18px] py-[15px]">
                  <span className="text-[13px] tracking-[0.16px] text-cds-textSecondary">Total estimado</span>
                  <span className="font-mono text-[18px] font-semibold">{formatMoney(solicitudSeleccionada.costo_total_estimado, "ARS")}</span>
                </div>
              </section>

              {["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) || comunicaciones.length ? (
                <section className="border border-cds-borderSubtle bg-cds-layer01 px-[18px] py-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold">Comunicación al proveedor</h2>
                    {comunicacionActiva ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-cds-supportSuccess">
                        <Check size={13} aria-hidden="true" />
                        Borrador listo
                      </span>
                    ) : null}
                  </div>
                  {comunicacionActiva ? (
                    <>
                      <div className="max-h-24 overflow-hidden whitespace-pre-wrap border border-cds-borderSubtle bg-cds-layer02 p-3 font-mono text-[11.5px] leading-[1.55] text-cds-textSecondary">
                        {contenidoComunicacion || comunicacionActiva.contenido}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" variant="secondary" className="flex-1" onClick={copiarComunicacion} disabled={marcarComunicacionCopiadaMutation.isPending}>
                          <Copy size={15} aria-hidden="true" />
                          Copiar
                        </Button>
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => descargarComunicacionMutation.mutate()} disabled={descargarComunicacionMutation.isPending}>
                          <Download size={15} aria-hidden="true" />
                          Descargar
                        </Button>
                      </div>
                    </>
                  ) : null}

                  <details className="mt-3 border-t border-cds-borderSubtle pt-3">
                    <summary className="cursor-pointer text-[13px] text-cds-textSecondary">{comunicacionActiva ? "Editar / IA / versiones" : "Generar borrador"}</summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label htmlFor="compra-com-titulo">Titulo</Label>
                        <Input id="compra-com-titulo" value={comunicacionTitulo} onChange={(event) => setComunicacionTitulo(event.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="compra-com-obs">Observaciones</Label>
                        <Input id="compra-com-obs" value={comunicacionObservaciones} onChange={(event) => setComunicacionObservaciones(event.target.value)} placeholder="Confirmar disponibilidad, precio y entrega" />
                      </div>
                      <Button
                        type="button"
                        size="compact"
                        onClick={() => crearComunicacionMutation.mutate()}
                        disabled={crearComunicacionMutation.isPending || !["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado)}
                      >
                        <FileText size={16} aria-hidden="true" />
                        Generar
                      </Button>

                      {comunicaciones.length ? (
                        <div className="flex flex-wrap gap-2">
                          {comunicaciones.map((comunicacion) => (
                            <Button
                              key={comunicacion.id}
                              type="button"
                              size="compact"
                              variant={comunicacionActiva?.id === comunicacion.id ? "primary" : "secondary"}
                              onClick={() => {
                                setComunicacionActivaId(comunicacion.id)
                                setContenidoComunicacion(comunicacion.contenido)
                              }}
                            >
                              {comunicacion.estado} · v{comunicacion.version_actual ?? 1}
                            </Button>
                          ))}
                        </div>
                      ) : null}

                      {comunicacionActiva ? (
                        <>
                          <div className="border border-cds-borderSubtle bg-cds-layer02 p-3">
                            <div className="flex items-center gap-2">
                              <Sparkles size={16} aria-hidden="true" />
                              <span className="text-sm font-medium">Reescritura asistida</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-cds-textSecondary">
                              Ajusta tono, canal e idioma. Crea una versión nueva; no envía el mensaje ni modifica la compra.
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <label className="block">
                                <Label htmlFor="compra-com-ia-canal">Canal</Label>
                                <select
                                  id="compra-com-ia-canal"
                                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                                  value={canalComunicacionIA}
                                  onChange={(event) => setCanalComunicacionIA(event.target.value as CompraComunicacionCanal)}
                                >
                                  <option value="email_formal">Email formal</option>
                                  <option value="whatsapp">WhatsApp</option>
                                  <option value="orden_compra">Orden de compra</option>
                                </select>
                              </label>
                              <label className="block">
                                <Label htmlFor="compra-com-ia-idioma">Idioma</Label>
                                <select
                                  id="compra-com-ia-idioma"
                                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                                  value={idiomaComunicacionIA}
                                  onChange={(event) => setIdiomaComunicacionIA(event.target.value as CompraComunicacionIdioma)}
                                >
                                  <option value="es">Español</option>
                                  <option value="en">Inglés</option>
                                  <option value="pt">Portugués</option>
                                </select>
                              </label>
                              <div>
                                <Label htmlFor="compra-com-ia-contacto">Nombre del contacto</Label>
                                <Input
                                  id="compra-com-ia-contacto"
                                  value={contactoComunicacionIA}
                                  onChange={(event) => setContactoComunicacionIA(event.target.value)}
                                  placeholder="Opcional"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="compact"
                              className="mt-3"
                              onClick={() => reescribirComunicacionIAMutation.mutate()}
                              disabled={reescribirComunicacionIAMutation.isPending || !contenidoComunicacion.trim() || comunicacionTieneCambiosSinGuardar}
                            >
                              <Sparkles size={16} aria-hidden="true" />
                              {reescribirComunicacionIAMutation.isPending ? "Reescribiendo..." : "Crear versión con IA"}
                            </Button>
                            {comunicacionTieneCambiosSinGuardar ? (
                              <div className="mt-2 text-xs text-cds-textSecondary">Guardá primero los cambios del editor para que la IA use esa versión.</div>
                            ) : null}
                            {advertenciasComunicacionIA.length ? (
                              <div className="mt-3 border-l-2 border-cds-supportWarning pl-3 text-xs text-cds-textSecondary">
                                <div className="font-medium text-cds-textPrimary">Revisar antes de usar</div>
                                {advertenciasComunicacionIA.map((advertencia) => (
                                  <div key={advertencia} className="mt-1">{advertencia}</div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div>
                            <Label htmlFor="compra-com-contenido">Contenido revisable</Label>
                            <textarea
                              id="compra-com-contenido"
                              className="mt-1 min-h-[200px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-cds-focus"
                              value={contenidoComunicacion}
                              onChange={(event) => setContenidoComunicacion(event.target.value)}
                              placeholder="Generá un borrador para poder editarlo."
                            />
                          </div>
                          <Button
                            type="button"
                            size="compact"
                            variant="secondary"
                            onClick={() => actualizarComunicacionMutation.mutate()}
                            disabled={!comunicacionActiva || !contenidoComunicacion.trim() || actualizarComunicacionMutation.isPending}
                          >
                            <Save size={16} aria-hidden="true" />
                            Guardar texto
                          </Button>

                          <div className="border-t border-cds-borderSubtle pt-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Versiones</span>
                              <span className="text-xs text-cds-textSecondary">{versionesComunicacionQuery.isFetching ? "Actualizando..." : `${versionesComunicacion.length} guardado(s)`}</span>
                            </div>
                            <div className="mt-2 divide-y divide-cds-borderSubtle">
                              {versionesComunicacion.length ? (
                                versionesComunicacion.map((version) => (
                                  <div key={version.id} className="flex items-center justify-between gap-2 py-2">
                                    <div className="text-sm">
                                      <span className="font-medium">v{version.version_numero}</span>
                                      {version.version_numero === comunicacionActiva.version_actual ? (
                                        <span className="ml-2 bg-cds-layer02 px-2 py-0.5 text-xs text-cds-textSecondary ring-1 ring-inset ring-cds-borderSubtle">actual</span>
                                      ) : null}
                                      <div className="mt-1 text-xs text-cds-textSecondary">{version.origen === "ia" ? "IA" : version.origen} · {formatDateTime(version.fecha)}</div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="compact"
                                      variant="secondary"
                                      onClick={() => {
                                        setContenidoComunicacion(version.contenido)
                                        setMensaje(`Versión ${version.version_numero} cargada en el editor. Guardá texto para dejarla como versión actual.`)
                                        setErrorLocal(null)
                                      }}
                                    >
                                      Cargar
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className="py-2 text-sm text-cds-textSecondary">Todavia no hay versiones guardadas.</div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </details>
                </section>
              ) : null}

              {(solicitudSeleccionada.eventos ?? []).length ? (
                <section className="border border-cds-borderSubtle bg-cds-layer01 px-[18px] py-4">
                  <details>
                    <summary className="cursor-pointer text-[15px] font-semibold">Historial</summary>
                    <div className="mt-3 space-y-2">
                      {(solicitudSeleccionada.eventos ?? []).map((evento) => (
                        <div key={evento.id} className="text-sm">
                          <div className="font-medium">{evento.tipo} · {formatDate(evento.fecha)}</div>
                          <div className="text-xs text-cds-textSecondary">
                            {evento.usuario_nombre || `Usuario ${evento.usuario_id}`}
                            {evento.estado_nuevo ? ` · ${evento.estado_anterior || "-"} -> ${evento.estado_nuevo}` : ""}
                            {evento.comentario ? ` · ${evento.comentario}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </section>
              ) : null}
            </>
          ) : detalleSolicitudQuery.isLoading ? (
            <div className="border border-cds-borderSubtle bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando detalle...</div>
          ) : (
            <div className="border border-dashed border-cds-borderSubtle bg-cds-layer01 p-8 text-center text-sm text-cds-textSecondary">
              Seleccioná una solicitud de la lista para ver su detalle, o creá una nueva con “Nueva solicitud”.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Tile del pipeline de compras (mismo lenguaje que los KPI del proyecto): valor
// en peso regular, icono arriba a la derecha, acento inset 2px para warning/petróleo.
// Clicable para filtrar la lista por estado.
function PipelineTile({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  active = false,
  onClick,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone?: "neutral" | "warning" | "petrol"
  active?: boolean
  onClick?: () => void
}) {
  const toneClasses =
    tone === "warning"
      ? "bg-lab-warmTint shadow-[inset_2px_0_0_var(--lab-warm)]"
      : tone === "petrol"
        ? "bg-lab-blueTint shadow-[inset_2px_0_0_var(--lab-blue)]"
        : "bg-cds-layer01"
  const valueColor = tone === "warning" ? "text-lab-warmFg" : tone === "petrol" ? "text-lab-blue" : "text-cds-textPrimary"
  const accentColor = tone === "warning" ? "text-lab-warmFg" : tone === "petrol" ? "text-lab-blue" : "text-cds-textSecondary"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3.5 border border-cds-borderSubtle p-4 text-left transition-[filter] hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
        toneClasses,
        active && "ring-2 ring-inset ring-cds-focus",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", accentColor)}>
        <span className="text-[11.5px] leading-tight tracking-[0.32px]">{label}</span>
        <Icon size={17} aria-hidden="true" />
      </div>
      <div className={cn("text-[30px] font-light leading-none", valueColor)}>{formatNumber(value)}</div>
    </button>
  )
}

// Línea de tiempo del workflow: Borrador → Aprobación → Pedido → En camino → Recibida.
function WorkflowTimeline({ estado, entrega }: { estado: string; entrega?: string | null }) {
  const completed = workflowCompletedThrough(estado, entrega)
  return (
    <div className="flex items-start">
      {WORKFLOW_STEPS.map((label, index) => {
        const done = index <= completed
        const current = index === completed + 1
        const reached = done || current
        return (
          <div key={label} className="relative flex flex-1 flex-col items-center text-center">
            {index > 0 ? (
              <span
                className="absolute left-[-50%] top-[9px] h-0.5 w-full"
                style={{ background: reached ? "var(--lab-blue)" : "var(--cds-border-subtle)" }}
                aria-hidden="true"
              />
            ) : null}
            <span
              className="relative z-[1] flex h-5 w-5 items-center justify-center rounded-full"
              style={{
                background: done ? "var(--lab-blue)" : "var(--cds-layer-01)",
                boxShadow: `inset 0 0 0 2px ${done || current ? "var(--lab-blue)" : "var(--cds-border-subtle)"}`,
              }}
            >
              {done ? <Check size={11} className="text-white" aria-hidden="true" /> : null}
            </span>
            <span className={cn("mt-1.5 text-[10.5px] leading-tight", reached ? "text-cds-textPrimary" : "text-cds-textPlaceholder")}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
