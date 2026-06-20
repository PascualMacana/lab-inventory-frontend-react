import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ClipboardCheck, Copy, Download, Eye, FileText, PackageCheck, Plus, RefreshCw, Save, Send, Trash2, Truck, X } from "lucide-react"

import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type CompraComunicacion, type CompraComunicacionVersion, type CompraItem, type CompraItemCrear, type CompraPrioridad, type CompraSolicitud, type Lote, type Proveedor, type Reactivo, type ReposicionRecomendacion, type Usuario } from "../lib/api"
import { useAuth } from "../lib/auth"
import { cn } from "../lib/utils"

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
const estadosFiltro = ["", "borrador", "pendiente_aprobacion", "cambios_solicitados", "aprobada", "recibida_parcial", "recibida", "rechazada", "cancelada"] as const
const emptySolicitudes: CompraSolicitud[] = []
const emptyRecomendaciones: ReposicionRecomendacion[] = []
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

  const sugerenciasQuery = useQuery({
    queryKey: ["compras", "sugerencias", dias],
    queryFn: () => api.comprasSugerencias(token!, dias, 20),
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
  const solicitudes = solicitudesQuery.data ?? emptySolicitudes
  const solicitudSeleccionada = detalleSolicitudQuery.data ?? null
  const comunicaciones = solicitudSeleccionada?.comunicaciones ?? []
  const comunicacionActiva = comunicaciones.find((comunicacion) => comunicacion.id === comunicacionActivaId) ?? comunicaciones[0] ?? null
  const comunicacionActivaIdValor = comunicacionActiva?.id ?? null
  const comunicacionActivaContenido = comunicacionActiva?.contenido ?? ""
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
    setRecepcionDraft({ ...emptyRecepcionDraft })
  }, [solicitudSeleccionadaId])

  useEffect(() => {
    const fechaGuardada = dateKey(solicitudSeleccionada?.fecha_pedido)
    const puedeTenerPedido = ["aprobada", "recibida_parcial"].includes(solicitudSeleccionada?.estado ?? "")
    setFechaPedidoWorkflow(fechaGuardada || (puedeTenerPedido ? todayKey() : ""))
  }, [solicitudSeleccionada?.id, solicitudSeleccionada?.fecha_pedido, solicitudSeleccionada?.estado])

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
      setSolicitudSeleccionadaId(solicitud.id)
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitudes"] })
    },
    onError: (error) => {
      setMensaje(null)
      setErrorLocal(mutationError(error, "No se pudo crear la solicitud."))
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
      setSolicitudSeleccionadaId(solicitud.id)
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitudes"] })
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitud.id] })
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
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitud.id] })
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
      await queryClient.invalidateQueries({ queryKey: ["compras", "solicitud", solicitud.id] })
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
        count={`${items.length} item(s) seleccionados`}
        plain
      />

      {mensaje ? <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div> : null}
      {errorLocal ? <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div> : null}
      {revalidacion ? <div className="mb-6 border-l-4 border-cds-focus bg-cds-layer01 px-4 py-3 text-sm">{revalidacion}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
        <div className="space-y-6">
          <section className="border border-cds-borderSubtle bg-cds-layer01">
            <div className="flex flex-col gap-3 border-b border-cds-borderSubtle p-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-semibold">Reposicion sugerida</h2>
                <p className="mt-1 text-sm text-cds-textSecondary">Ranking deterministico; la solicitud guarda snapshot al crear.</p>
              </div>
              <label className="w-full max-w-[180px]">
                <span className="mb-1 block text-xs text-cds-textSecondary">Ventana</span>
                <select
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
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
                <thead className="border-b border-cds-borderSubtle text-xs uppercase tracking-[0.32px] text-cds-textSecondary">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reactivo</th>
                    <th className="px-4 py-3 font-medium">Nivel</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Sugerido</th>
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium">Costo ult.</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cds-borderSubtle">
                  {sugerenciasQuery.isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-cds-textSecondary">Cargando sugerencias...</td>
                    </tr>
                  ) : recomendaciones.length ? (
                    recomendaciones.map((recomendacion) => {
                      const selected = items.some((item) => item.origen === "reposicion" && item.reactivo_id === recomendacion.reactivo_id)
                      const bloqueadaPorCompraActiva = Boolean(recomendacion.compra_activa)
                      return (
                        <tr key={recomendacion.reactivo_id} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium">{recomendacion.reactivo_nombre}</div>
                            <div className="mt-1 text-xs text-cds-textSecondary">{recomendacion.motivos.join(" · ") || "Sin motivo"}</div>
                            {recomendacion.compra_activa ? (
                              <div className="mt-2 inline-flex bg-lab-warmTint px-2 py-1 text-xs text-lab-warmFg ring-1 ring-lab-warm/40">
                                {estadoCompraActivaLabel(recomendacion.compra_activa.estado)} · {recomendacion.compra_activa.codigo}
                                {recomendacion.compra_activa.cantidad_pendiente > 0
                                  ? ` · pendiente ${formatNumber(recomendacion.compra_activa.cantidad_pendiente)} ${recomendacion.compra_activa.unidad}`
                                  : ""}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2 py-1 text-xs ring-1", nivelClasses(recomendacion.nivel))}>
                              {recomendacion.nivel}
                            </span>
                          </td>
                          <td className="px-4 py-3">{formatNumber(recomendacion.stock_actual)} {recomendacion.unidad}</td>
                          <td className="px-4 py-3">{formatNumber(recomendacion.cantidad_sugerida)} {recomendacion.unidad}</td>
                          <td className="px-4 py-3">{recomendacion.proveedor_reciente || "-"}</td>
                          <td className="px-4 py-3">
                            {recomendacion.costo_reciente == null ? (
                              "-"
                            ) : (
                              <>
                                <div>{formatMoney(recomendacion.costo_reciente)}</div>
                                {recomendacion.costo_unitario_reciente != null ? (
                                  <div className="mt-1 text-xs text-cds-textSecondary">
                                    {formatMoney(recomendacion.costo_unitario_reciente)} / {recomendacion.unidad}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              size="compact"
                              variant={selected || bloqueadaPorCompraActiva ? "secondary" : "primary"}
                              onClick={() => agregarRecomendacion(recomendacion)}
                              disabled={selected || bloqueadaPorCompraActiva}
                            >
                              <Plus size={16} aria-hidden="true" />
                              {selected ? "Agregado" : bloqueadaPorCompraActiva ? "En curso" : "Agregar"}
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-cds-textSecondary">No hay recomendaciones activas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-cds-borderSubtle bg-cds-layer01 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <h2 className="text-base font-semibold">Solicitudes recientes</h2>
              <Button type="button" size="compact" variant="secondary" onClick={limpiarFiltrosSolicitudes}>
                Limpiar filtros
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              <div>
                <Label htmlFor="compras-filtro-q">Buscar</Label>
                <Input
                  id="compras-filtro-q"
                  value={busquedaSolicitudFiltro}
                  onChange={(event) => setBusquedaSolicitudFiltro(event.target.value)}
                  placeholder="Código, título, reactivo o proveedor"
                />
              </div>
              <label>
                <span className="mb-1 block text-xs text-cds-textSecondary">Estado</span>
                <select
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                  value={estadoFiltro}
                  onChange={(event) => setEstadoFiltro(event.target.value)}
                >
                  {estadosFiltro.map((estado) => (
                    <option key={estado || "todos"} value={estado}>
                      {estado ? estadoSolicitudLabel(estado) : "Todos"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-cds-textSecondary">Prioridad</span>
                <select
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-3 text-sm focus:border-b-cds-focus focus:outline-none"
                  value={prioridadFiltro}
                  onChange={(event) => setPrioridadFiltro(event.target.value)}
                >
                  <option value="">Todas</option>
                  {prioridades.map((prioridad) => (
                    <option key={prioridad} value={prioridad}>{prioridad}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-cds-textSecondary">Proveedor</span>
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
                <span className="mb-1 block text-xs text-cds-textSecondary">Reactivo</span>
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
                <span className="mb-1 block text-xs text-cds-textSecondary">Solicitante</span>
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
                <span className="mb-1 block text-xs text-cds-textSecondary">Aprobador</span>
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
                <Input
                  id="compras-filtro-necesaria-desde"
                  type="date"
                  value={fechaNecesariaDesdeFiltro}
                  onChange={(event) => setFechaNecesariaDesdeFiltro(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="compras-filtro-necesaria-hasta">Necesario hasta</Label>
                <Input
                  id="compras-filtro-necesaria-hasta"
                  type="date"
                  value={fechaNecesariaHastaFiltro}
                  onChange={(event) => setFechaNecesariaHastaFiltro(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 divide-y divide-cds-borderSubtle border-y border-cds-borderSubtle">
              {solicitudesQuery.isLoading ? (
                <div className="py-4 text-sm text-cds-textSecondary">Cargando solicitudes...</div>
              ) : solicitudes.length ? (
                solicitudes.map((solicitud) => (
                  <div key={solicitud.id} className={cn("grid gap-2 py-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center", solicitudSeleccionadaId === solicitud.id && "bg-cds-layer02 px-3")}>
                    <div>
                      <div className="font-medium">{solicitud.codigo} · {solicitud.titulo}</div>
                      <div className="mt-1 text-xs text-cds-textSecondary">
                        <span className={cn("mr-2 inline-flex px-2 py-0.5 ring-1", estadoClasses(solicitud.estado))}>{estadoSolicitudLabel(solicitud.estado)}</span>
                        {["aprobada", "recibida_parcial"].includes(solicitud.estado) ? (
                          <span className="mr-2 inline-flex bg-cds-layer02 px-2 py-0.5 ring-1 ring-cds-borderSubtle">{estadoEntregaLabel(solicitud.estado_entrega)}</span>
                        ) : null}
                        {solicitud.fecha_pedido ? (
                          <span className="mr-2 inline-flex bg-cds-layer02 px-2 py-0.5 ring-1 ring-cds-borderSubtle">Pedido enviado {formatDate(solicitud.fecha_pedido)}</span>
                        ) : null}
                        {solicitud.fecha_necesaria ? (
                          <span className="mr-2 inline-flex bg-cds-layer02 px-2 py-0.5 ring-1 ring-cds-borderSubtle">Necesario {formatDate(solicitud.fecha_necesaria)}</span>
                        ) : null}
                        {solicitud.items_count ?? 0} item(s) · {formatDate(solicitud.fecha_creacion)}
                      </div>
                    </div>
                    <div className="text-sm text-cds-textSecondary">{formatMoney(solicitud.costo_total_estimado, "ARS")}</div>
                    <Button type="button" size="compact" variant="secondary" onClick={() => setSolicitudSeleccionadaId(solicitud.id)}>
                      <Eye size={16} aria-hidden="true" />
                      Ver
                    </Button>
                    <Button type="button" size="compact" variant="secondary" onClick={() => revalidarMutation.mutate(solicitud.id)}>
                      <RefreshCw size={16} aria-hidden="true" />
                      Revalidar
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-4 text-sm text-cds-textSecondary">Todavia no hay solicitudes.</div>
              )}
            </div>

            {solicitudSeleccionada ? (
              <div className="mt-4 border border-cds-borderSubtle bg-cds-layer02 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs text-cds-textSecondary">{solicitudSeleccionada.codigo}</div>
                    <h3 className="mt-1 text-base font-semibold">{solicitudSeleccionada.titulo}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={cn("inline-flex px-2 py-1 ring-1", estadoClasses(solicitudSeleccionada.estado))}>{estadoSolicitudLabel(solicitudSeleccionada.estado)}</span>
                      {["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) ? (
                        <span className="inline-flex bg-cds-layer01 px-2 py-1 text-cds-textSecondary ring-1 ring-cds-borderSubtle">
                          {estadoEntregaLabel(solicitudSeleccionada.estado_entrega)}
                        </span>
                      ) : null}
                      {solicitudSeleccionada.fecha_pedido ? (
                        <span className="inline-flex bg-cds-layer01 px-2 py-1 text-cds-textSecondary ring-1 ring-cds-borderSubtle">
                          Pedido enviado {formatDate(solicitudSeleccionada.fecha_pedido)}
                        </span>
                      ) : null}
                      {solicitudSeleccionada.fecha_necesaria ? (
                        <span className="inline-flex bg-cds-layer01 px-2 py-1 text-cds-textSecondary ring-1 ring-cds-borderSubtle">
                          Necesario {formatDate(solicitudSeleccionada.fecha_necesaria)}
                        </span>
                      ) : null}
                      <span className="inline-flex bg-cds-layer01 px-2 py-1 text-cds-textSecondary ring-1 ring-cds-borderSubtle">{solicitudSeleccionada.prioridad}</span>
                      <span className="inline-flex bg-cds-layer01 px-2 py-1 text-cds-textSecondary ring-1 ring-cds-borderSubtle">{formatMoney(solicitudSeleccionada.costo_total_estimado, "ARS")}</span>
                    </div>
                  </div>
                  {["borrador", "cambios_solicitados"].includes(solicitudSeleccionada.estado) ? (
                    <Button type="button" size="compact" variant="secondary" onClick={() => cargarSolicitudParaEditar(solicitudSeleccionada)}>
                      Editar
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  {(solicitudSeleccionada.items ?? []).map((item) => {
                    const pendiente = cantidadPendienteItem(item)
                    const recibido = Number(item.cantidad_recibida ?? 0)
                    const recepcionActiva = recepcionDraft.itemId === item.id
                    const puedeRecibir =
                      ["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) &&
                      ["aprobado", "recibido_parcial"].includes(item.estado) &&
                      pendiente > 0
                    return (
                      <div key={item.id} className="border border-cds-borderSubtle bg-cds-layer01 p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="font-medium">{item.reactivo_nombre ?? item.descripcion_manual}</div>
                            <div className="mt-1 text-xs text-cds-textSecondary">
                              {estadoItemLabel(item.estado)} · solicitado {formatNumber(item.cantidad_solicitada)} {item.unidad}
                              {item.cantidad_aprobada != null ? ` · aprobado ${formatNumber(item.cantidad_aprobada)} ${item.unidad}` : ""}
                              {recibido > 0 ? ` · recibido acumulado ${formatNumber(recibido)} ${item.unidad}` : ""}
                              {pendiente > 0 && item.cantidad_aprobada != null ? ` · pendiente ${formatNumber(pendiente)} ${item.unidad}` : ""}
                              {item.proveedor_nombre_snapshot ? ` · ${item.proveedor_nombre_snapshot}` : ""}
                            </div>
                          </div>
                          {puedeRecibir ? (
                            <Button type="button" size="compact" variant="secondary" onClick={() => abrirRecepcion(item)}>
                              <Check size={16} aria-hidden="true" />
                              Vincular lote
                            </Button>
                          ) : null}
                        </div>

                        {recepcionActiva ? (
                          <div className="mt-3 border-t border-cds-borderSubtle pt-3">
                            <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_110px_100px]">
                              <div>
                                <Label htmlFor={`recepcion-lote-${item.id}`}>Buscar lote recibido</Label>
                                <Input
                                  id={`recepcion-lote-${item.id}`}
                                  value={recepcionDraft.busqueda}
                                  onChange={(event) =>
                                    setRecepcionDraft((current) => ({
                                      ...current,
                                      busqueda: event.target.value,
                                      loteId: "",
                                    }))
                                  }
                                  placeholder="Código interno, lote o reactivo"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`recepcion-cantidad-${item.id}`}>Cantidad</Label>
                                <Input
                                  id={`recepcion-cantidad-${item.id}`}
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={recepcionDraft.cantidad}
                                  onChange={(event) => setRecepcionDraft((current) => ({ ...current, cantidad: event.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`recepcion-unidad-${item.id}`}>Unidad</Label>
                                <Input
                                  id={`recepcion-unidad-${item.id}`}
                                  value={recepcionDraft.unidad}
                                  onChange={(event) => setRecepcionDraft((current) => ({ ...current, unidad: event.target.value }))}
                                />
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
                                    onClick={() =>
                                      setRecepcionDraft((current) => ({
                                        ...current,
                                        loteId: String(lote.id),
                                        cantidad: cantidadSugeridaRecepcion(item, lote),
                                      }))
                                    }
                                  >
                                    {lote.codigo_interno} · ingreso {formatNumber(cantidadInicialLote(lote))} {lote.unidad}
                                    {Number(lote.cantidad_actual) !== cantidadInicialLote(lote)
                                      ? ` · stock ${formatNumber(lote.cantidad_actual)} ${lote.unidad}`
                                      : ""}
                                  </Button>
                                ))
                              ) : busquedaRecepcionApi.length >= 2 ? (
                                <span className="text-xs text-cds-textSecondary">No hay lotes compatibles ingresados desde la fecha de pedido o aprobación de esta compra.</span>
                              ) : (
                                <span className="text-xs text-cds-textSecondary">Escribí al menos 2 caracteres para buscar lotes.</span>
                              )}
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                              <div>
                                <Label htmlFor={`recepcion-observacion-${item.id}`}>Observación</Label>
                                <Input
                                  id={`recepcion-observacion-${item.id}`}
                                  value={recepcionDraft.observacion}
                                  onChange={(event) => setRecepcionDraft((current) => ({ ...current, observacion: event.target.value }))}
                                  placeholder={loteRecepcion ? `Lote ${loteRecepcion.codigo_interno} seleccionado` : "Opcional"}
                                />
                              </div>
                              <Button type="button" size="compact" variant="secondary" onClick={() => setRecepcionDraft({ ...emptyRecepcionDraft })}>
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                size="compact"
                                onClick={registrarRecepcion}
                                disabled={registrarRecepcionMutation.isPending || !recepcionDraft.loteId || !recepcionDraft.cantidad}
                              >
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

                <div className="mt-4 grid gap-3">
                  <div className={cn("grid gap-3", ["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) && "md:grid-cols-[1fr_180px]")}>
                    <div>
                      <Label htmlFor="compra-workflow-motivo">Comentario o motivo</Label>
                      <Input
                        id="compra-workflow-motivo"
                        value={motivoWorkflow}
                        onChange={(event) => setMotivoWorkflow(event.target.value)}
                        placeholder="Requerido para rechazar o pedir cambios"
                      />
                    </div>
                    {["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) ? (
                      <div>
                        <Label htmlFor="compra-fecha-pedido">Pedido enviado el</Label>
                        <Input
                          id="compra-fecha-pedido"
                          type="date"
                          max={todayKey()}
                          value={fechaPedidoWorkflow}
                          onChange={(event) => setFechaPedidoWorkflow(event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["borrador", "cambios_solicitados"].includes(solicitudSeleccionada.estado) ? (
                      <Button type="button" size="compact" onClick={() => ejecutarWorkflow("enviar")} disabled={workflowMutation.isPending}>
                        <Send size={16} aria-hidden="true" />
                        Enviar a aprobación
                      </Button>
                    ) : null}
                    {solicitudSeleccionada.estado === "pendiente_aprobacion" ? (
                      <>
                        <Button type="button" size="compact" onClick={() => ejecutarWorkflow("aprobar")} disabled={workflowMutation.isPending}>
                          <Check size={16} aria-hidden="true" />
                          Aprobar
                        </Button>
                        <Button type="button" size="compact" variant="secondary" onClick={() => ejecutarWorkflow("cambios")} disabled={workflowMutation.isPending}>
                          Pedir cambios
                        </Button>
                        <Button type="button" size="compact" variant="danger" onClick={() => ejecutarWorkflow("rechazar")} disabled={workflowMutation.isPending}>
                          <X size={16} aria-hidden="true" />
                          Rechazar
                        </Button>
                      </>
                    ) : null}
                    {["borrador", "pendiente_aprobacion", "cambios_solicitados", "aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) ? (
                      <Button type="button" size="compact" variant="secondary" onClick={() => ejecutarWorkflow("cancelar")} disabled={workflowMutation.isPending}>
                        Cancelar
                      </Button>
                    ) : null}
                    {["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) && (solicitudSeleccionada.estado_entrega ?? "no_pedido") === "no_pedido" ? (
                      <Button type="button" size="compact" variant="secondary" onClick={() => ejecutarWorkflow("pedido")} disabled={workflowMutation.isPending}>
                        <PackageCheck size={16} aria-hidden="true" />
                        Marcar pedido
                      </Button>
                    ) : null}
                    {["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) && (solicitudSeleccionada.estado_entrega ?? "no_pedido") !== "no_pedido" ? (
                      <Button
                        type="button"
                        size="compact"
                        variant="secondary"
                        onClick={() => ejecutarWorkflow((solicitudSeleccionada.estado_entrega ?? "pedido") === "en_camino" ? "en_camino" : "pedido")}
                        disabled={workflowMutation.isPending || !fechaPedidoWorkflow}
                      >
                        <Save size={16} aria-hidden="true" />
                        Guardar fecha
                      </Button>
                    ) : null}
                    {["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) && (solicitudSeleccionada.estado_entrega ?? "no_pedido") !== "en_camino" ? (
                      <Button type="button" size="compact" variant="secondary" onClick={() => ejecutarWorkflow("en_camino")} disabled={workflowMutation.isPending}>
                        <Truck size={16} aria-hidden="true" />
                        Marcar en camino
                      </Button>
                    ) : null}
                  </div>
                </div>

                {["aprobada", "recibida_parcial"].includes(solicitudSeleccionada.estado) || comunicaciones.length ? (
                  <div className="mt-4 border-t border-cds-borderSubtle pt-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} aria-hidden="true" />
                      <h4 className="text-sm font-semibold">Borrador para proveedor</h4>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                      <div>
                        <Label htmlFor="compra-com-titulo">Titulo</Label>
                        <Input
                          id="compra-com-titulo"
                          value={comunicacionTitulo}
                          onChange={(event) => setComunicacionTitulo(event.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="compra-com-obs">Observaciones</Label>
                        <Input
                          id="compra-com-obs"
                          value={comunicacionObservaciones}
                          onChange={(event) => setComunicacionObservaciones(event.target.value)}
                          placeholder="Confirmar disponibilidad, precio y entrega"
                        />
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
                    </div>

                    {comunicaciones.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
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
                            {comunicacion.estado} · v{comunicacion.version_actual ?? 1} · {formatDate(comunicacion.fecha_creacion)}
                          </Button>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <Label htmlFor="compra-com-contenido">Contenido revisable</Label>
                      <textarea
                        id="compra-com-contenido"
                        className="mt-1 min-h-[240px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-cds-focus"
                        value={contenidoComunicacion}
                        onChange={(event) => setContenidoComunicacion(event.target.value)}
                        placeholder="Generá un borrador para poder editarlo."
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
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
                      <Button
                        type="button"
                        size="compact"
                        variant="secondary"
                        onClick={copiarComunicacion}
                        disabled={!comunicacionActiva || marcarComunicacionCopiadaMutation.isPending}
                      >
                        <Copy size={16} aria-hidden="true" />
                        Copiar
                      </Button>
                      <Button
                        type="button"
                        size="compact"
                        variant="secondary"
                        onClick={() => descargarComunicacionMutation.mutate()}
                        disabled={!comunicacionActiva || descargarComunicacionMutation.isPending}
                      >
                        <Download size={16} aria-hidden="true" />
                        Descargar
                      </Button>
                    </div>

                    {comunicacionActiva ? (
                      <div className="mt-3 border-t border-cds-borderSubtle pt-3">
                        <div className="flex flex-col gap-1 text-sm md:flex-row md:items-center md:justify-between">
                          <div className="font-medium">Versiones guardadas</div>
                          <div className="text-xs text-cds-textSecondary">
                            {versionesComunicacionQuery.isFetching ? "Actualizando..." : `${versionesComunicacion.length} guardado(s)`}
                          </div>
                        </div>
                        <div className="mt-2 divide-y divide-cds-borderSubtle">
                          {versionesComunicacionQuery.isLoading ? (
                            <div className="py-2 text-sm text-cds-textSecondary">Cargando versiones...</div>
                          ) : versionesComunicacion.length ? (
                            versionesComunicacion.map((version) => (
                              <div key={version.id} className="flex flex-col gap-2 py-2 md:flex-row md:items-center md:justify-between">
                                <div className="text-sm">
                                  <span className="font-medium">v{version.version_numero}</span>
                                  {version.version_numero === comunicacionActiva.version_actual ? (
                                    <span className="ml-2 bg-cds-layer02 px-2 py-0.5 text-xs text-cds-textSecondary ring-1 ring-cds-borderSubtle">actual</span>
                                  ) : null}
                                  <div className="mt-1 text-xs text-cds-textSecondary">
                                    {version.origen} · {version.usuario_nombre || `Usuario ${version.usuario_id}`} · {formatDateTime(version.fecha)}
                                  </div>
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
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 border-t border-cds-borderSubtle pt-4">
                  <h4 className="text-sm font-semibold">Historial</h4>
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
                </div>
              </div>
            ) : detalleSolicitudQuery.isLoading ? (
              <div className="mt-4 border border-cds-borderSubtle bg-cds-layer02 p-4 text-sm text-cds-textSecondary">Cargando detalle...</div>
            ) : null}
          </section>
        </div>

        <form className="space-y-6" onSubmit={submit}>
          <section className="border border-cds-borderSubtle bg-cds-layer01 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} aria-hidden="true" />
                <h2 className="text-base font-semibold">{editandoId == null ? "Nueva solicitud" : "Editar solicitud"}</h2>
              </div>
              {editandoId != null ? (
                <Button type="button" size="compact" variant="secondary" onClick={cancelarEdicion}>
                  Cancelar edición
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="compra-titulo">Titulo</Label>
                <Input id="compra-titulo" value={titulo} onChange={(event) => setTitulo(event.target.value)} required />
              </div>
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
              <div className="md:col-span-2">
                <Label htmlFor="compra-notas">Notas</Label>
                <Input id="compra-notas" value={notas} onChange={(event) => setNotas(event.target.value)} placeholder="Validar proveedor y disponibilidad antes de comprar" />
              </div>
            </div>
          </section>

          <section className="border border-cds-borderSubtle bg-cds-layer01 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-base font-semibold">Items seleccionados</h2>
              <div className="text-sm text-cds-textSecondary">Total estimado: {formatMoney(totalEstimado)}</div>
            </div>

            <div className="mt-4 space-y-3">
              {items.length ? (
                items.map((item) => (
                  <div key={item.key} className="border border-cds-borderSubtle bg-cds-layer02 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.nombre}</div>
                        <div className="mt-1 text-xs text-cds-textSecondary">
                          {item.origen === "reposicion" ? `Reposicion · stock ${formatNumber(item.stock_actual)} · sugerido ${formatNumber(item.cantidad_sugerida)} ${item.unidad}` : "Manual"}
                        </div>
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.key)}>
                        <Trash2 size={16} aria-hidden="true" />
                        <span className="sr-only">Quitar</span>
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div>
                        <Label htmlFor={`${item.key}-cantidad`}>Cantidad</Label>
                        <Input id={`${item.key}-cantidad`} type="number" min="0" step="any" value={item.cantidad_solicitada} onChange={(event) => updateItem(item.key, { cantidad_solicitada: Number(event.target.value) })} />
                      </div>
                      <div>
                        <Label htmlFor={`${item.key}-unidad`}>Unidad</Label>
                        <Input id={`${item.key}-unidad`} value={item.unidad ?? ""} onChange={(event) => updateItem(item.key, { unidad: event.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`${item.key}-costo`}>Costo unitario</Label>
                        <Input id={`${item.key}-costo`} type="number" min="0" step="any" value={item.costo_unitario_estimado ?? 0} onChange={(event) => updateItem(item.key, { costo_unitario_estimado: Number(event.target.value) })} />
                      </div>
                      <div>
                        <Label htmlFor={`${item.key}-proveedor`}>Proveedor</Label>
                        <Input id={`${item.key}-proveedor`} value={item.proveedor_nombre ?? ""} onChange={(event) => updateItem(item.key, { proveedor_nombre: event.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`${item.key}-presentacion`}>Presentacion</Label>
                        <Input id={`${item.key}-presentacion`} value={item.presentacion ?? ""} onChange={(event) => updateItem(item.key, { presentacion: event.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`${item.key}-notas`}>Notas</Label>
                        <Input id={`${item.key}-notas`} value={item.notas ?? ""} onChange={(event) => updateItem(item.key, { notas: event.target.value })} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-cds-borderSubtle p-6 text-sm text-cds-textSecondary">
                  Agrega recomendaciones o items manuales para crear la solicitud.
                </div>
              )}
            </div>
          </section>

          <section className="border border-cds-borderSubtle bg-cds-layer01 p-4">
            <h2 className="text-base font-semibold">Compra manual</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_120px_120px_150px_auto] lg:items-end">
              <div>
                <Label htmlFor="manual-busqueda">Reactivo o insumo</Label>
                <Input
                  id="manual-busqueda"
                  value={manual.busqueda}
                  onChange={(event) =>
                    setManual((current) => ({
                      ...current,
                      busqueda: event.target.value,
                      reactivoId: "",
                      loteReferenciaId: "",
                    }))
                  }
                  placeholder="Buscar en catalogo o escribir libre"
                />
              </div>
              <div>
                <Label htmlFor="manual-cantidad">Cantidad</Label>
                <Input id="manual-cantidad" type="number" min="0" step="any" value={manual.cantidad} onChange={(event) => setManual((current) => ({ ...current, cantidad: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="manual-unidad">Unidad</Label>
                <Input id="manual-unidad" value={manual.unidad} onChange={(event) => setManual((current) => ({ ...current, unidad: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="manual-costo">Costo unitario</Label>
                <Input id="manual-costo" type="number" min="0" step="any" value={manual.costo} onChange={(event) => setManual((current) => ({ ...current, costo: event.target.value }))} />
              </div>
              <Button type="button" variant="secondary" onClick={agregarManual}>
                <Plus size={16} aria-hidden="true" />
                Agregar
              </Button>
            </div>

            {manual.busqueda.trim() ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
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
                              manual.loteReferenciaId === String(lote.id)
                                ? "border-cds-buttonPrimary bg-cds-layer01"
                                : "border-cds-borderSubtle bg-cds-layer02",
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

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="manual-proveedor">Proveedor</Label>
                <Input id="manual-proveedor" value={manual.proveedor} onChange={(event) => setManual((current) => ({ ...current, proveedor: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="manual-presentacion">Presentacion</Label>
                <Input id="manual-presentacion" value={manual.presentacion} onChange={(event) => setManual((current) => ({ ...current, presentacion: event.target.value }))} />
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
      </div>
    </section>
  )
}
