import i18n from "./i18n"

const API_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "")

export type Usuario = {
  id: number
  nombre: string
  email: string
  rol: "admin" | "jefe" | "cientifico"
  sector?: string | null
  activo?: number | boolean
  must_change_password?: number | boolean
  organizacion_id?: number
  owner_global?: boolean | number
  modulos_habilitados?: string[]
}

export type UsuarioCrear = {
  nombre: string
  email: string
  sector?: string | null
  rol?: "admin" | "jefe" | "cientifico"
  password_inicial: string
}

export type EstadoTarea = "pendiente" | "en_progreso" | "bloqueada" | "completada" | "cancelada"
export type PrioridadTarea = "baja" | "media" | "alta" | "urgente"

export type Tarea = {
  id: number
  titulo: string
  descripcion?: string | null
  estado: EstadoTarea
  prioridad: PrioridadTarea
  asignado_a?: number | null
  asignado_nombre?: string | null
  creado_por: number
  creado_por_nombre?: string | null
  entidad_tipo?: string | null
  entidad_id?: number | null
  fecha_limite?: string | null
  fecha_creacion: string
  fecha_actualizacion?: string | null
  fecha_completada?: string | null
  activo: number | boolean
}

export type TareaCrear = {
  titulo: string
  descripcion?: string | null
  prioridad: PrioridadTarea
  asignado_a?: number | null
  entidad_tipo?: string | null
  entidad_id?: number | null
  fecha_limite?: string | null
}

export type TareaActualizar = {
  titulo: string
  descripcion?: string | null
  prioridad: PrioridadTarea
  fecha_limite?: string | null
}

export type TareaEvento = {
  id: number
  tarea_id: number
  usuario_id: number
  usuario_nombre: string
  tipo: "creacion" | "estado" | "reasignacion" | "edicion" | "comentario" | string
  estado_anterior?: EstadoTarea | null
  estado_nuevo?: EstadoTarea | null
  asignado_anterior?: number | null
  asignado_nuevo?: number | null
  asignado_anterior_nombre?: string | null
  asignado_nuevo_nombre?: string | null
  comentario?: string | null
  fecha: string
}

export type LoginResponse = {
  token: string
  expira_en: string
  usuario: Usuario
  must_change_password: boolean
}

export type SolicitudDemoCrear = {
  email: string
  laboratorio?: string | null
  mensaje?: string | null
  origen?: string
}

export type SolicitudDemoResponse = {
  ok: boolean
  id: number
  email: string
  laboratorio?: string | null
  email_enviado?: boolean
  email_error?: string | null
  mensaje: string
}

export type OrganizacionModulo = {
  modulo: string
  habilitado: boolean
}

export type Organizacion = {
  id: number
  nombre: string
  slug: string
  activo: number | boolean
  fecha_creacion?: string
  modulos?: OrganizacionModulo[]
}

export type OrganizacionCrear = {
  nombre: string
  slug?: string | null
  activo?: boolean
  modulos_habilitados?: string[]
}

export type DashboardResumen = {
  contadores?: {
    total_reactivos?: number
    lotes_activos?: number
    valor_inventario?: number
    alertas_stock_bajo?: number
    alertas_vencidos?: number
    alertas_por_vencer_30d?: number
    alertas_por_vencer_7d?: number
  }
  stock_bajo?: Array<Record<string, unknown>>
  vencidos?: Array<Record<string, unknown>>
  por_vencer_7_dias?: Array<Record<string, unknown>>
  por_vencer_30_dias?: Array<Record<string, unknown>>
  ultimos_movimientos?: Movimiento[]
  movimientos_recientes?: Movimiento[]
  [key: string]: unknown
}

export type DashboardSeriePunto = {
  fecha: string
  total_reactivos: number
  lotes_activos: number
  stock_bajo: number
  por_vencer_30d: number
  vencidos: number
}

export type DashboardSeries = {
  dias: number
  puntos: DashboardSeriePunto[]
}

export type Reactivo = {
  id: number
  nombre: string
  unidad: string
  stock_minimo: number
  ubicacion?: string | null
  categoria?: string | null
  marca?: string | null
  numero_catalogo?: string | null
  enlace_compra?: string | null
  stock_total: number
}

export type ReactivoCrear = {
  nombre: string
  unidad: string
  stock_minimo: number
  ubicacion?: string | null
  categoria?: string | null
  cas_numero?: string | null
}

// --- Wizard foto-primero: matching de reactivo contra el catálogo ---
export type ReactivoCandidato = {
  reactivo_id: number
  nombre: string
  cas_numero: string | null
}

export type SugerenciaNuevo = {
  nombre: string | null
  cas_numero: string | null
  unidad_base: string | null
  dimension: string | null
}

export type ReactivoMatch = {
  decision: "match" | "ambiguo" | "nuevo"
  confianza: "alta" | "media" | "baja"
  razon: string
  match: ReactivoCandidato | null
  candidatos: ReactivoCandidato[]
  sugerencia_nuevo: SugerenciaNuevo | null
  fuente: string
}

export type ReactivoMatchRequest = {
  nombre_extraido?: string | null
  cas_numero?: string | null
  unidad_envase?: string | null
}

export type ReactivoFusionarResponse = {
  sobreviviente_id: number
  duplicado_id: number
  lotes_movidos: number
  mensaje: string
}

export type DuplicadosReactivo = {
  candidatos: ReactivoCandidato[]
  fuente: string
  razon: string
}

export type ReactivoActualizar = {
  nombre: string
  stock_minimo: number
  ubicacion?: string | null
  categoria?: string | null
  marca?: string | null
  numero_catalogo?: string | null
  enlace_compra?: string | null
}

export type Lote = {
  id: number
  reactivo_id: number
  reactivo_nombre: string
  unidad: string
  ubicacion?: string | null
  numero_lote?: string | null
  marca?: string | null
  codigo_proveedor?: string | null
  cas_numero?: string | null
  codigo_interno: string
  cantidad_inicial: number
  cantidad_actual: number
  fecha_ingreso?: string | null
  fecha_vencimiento: string
  proveedor: string
  costo_total: number
  usuario_id?: number | null
}

export type MovimientoConsumo = {
  id: number
  lote_id: number
  codigo_interno: string
  cantidad: number
}

export type Movimiento = {
  id: number
  fecha: string
  tipo: "entrada" | "salida" | "ajuste"
  cantidad: number
  motivo?: string | null
  usuario_id: number
  usuario_nombre: string
  reactivo_id: number
  reactivo_nombre: string
  unidad: string
  lote_id: number
  codigo_interno: string
  numero_lote?: string | null
}

export type MovimientosFiltros = {
  limite?: number
  desde?: string
  hasta?: string
  tipo?: string
  reactivo_id?: number
}

export type ConsumoCrear = {
  reactivo_id: number
  usuario_id: number
  cantidad: number
  unidad_ingreso: string
  motivo?: string | null
  lote_id?: number | null
}

export type ConsumoResponse = {
  movimientos: MovimientoConsumo[]
  cantidad_total: number
  unidad: string
}

export type LoteCrear = {
  reactivo_id: number
  cantidad_inicial: number
  unidad_ingreso: string
  fecha_vencimiento: string
  proveedor: string
  costo_total: number
  usuario_id: number
  numero_lote?: string | null
  marca?: string | null
  codigo_proveedor?: string | null
  cas_numero?: string | null
}

export type LoteCrearMultiple = {
  reactivo_id: number
  cantidad_envases: number
  cantidad_por_envase: number
  unidad_ingreso: string
  fecha_vencimiento: string
  proveedor: string
  costo_total_compra: number
  usuario_id?: number | null
  numero_lote?: string | null
  marca?: string | null
  codigo_proveedor?: string | null
  cas_numero?: string | null
}

export type LoteCrearResponse = {
  id: number
  codigo_interno: string
  cantidad_guardada: number
  unidad: string
}

export type LoteCrearMultipleResponse = {
  lotes: Array<{ id: number; codigo_interno: string }>
  cantidad_envases: number
  cantidad_por_envase_guardada: number
  cantidad_total_guardada: number
  unidad: string
}

export type LoteActualizar = {
  numero_lote?: string | null
  marca?: string | null
  codigo_proveedor?: string | null
  cas_numero?: string | null
  fecha_vencimiento: string
  proveedor: string
  costo_total: number
}

export type LoteAjusteStock = {
  cantidad_real: number
  unidad_ingreso: string
  motivo: string
}

export type LoteAjusteStockResponse = {
  id: number
  lote_id: number
  codigo_interno: string
  cantidad_real: number
  unidad: string
  mensaje: string
}

export type UnidadesCompatibles = {
  unidad_base: string
  grupo: string
  unidades: string[]
}

export type DatosEtiqueta = {
  es_etiqueta_reactivo: boolean
  nombre_compuesto: string | null
  fabricante: string | null
  numero_lote: string | null
  cas_numero: string | null
  codigo_proveedor: string | null
  fecha_vencimiento: string | null
  cantidad_envase: number | null
  unidad_envase: string | null
  notas: string | null
}

export type DecodificarQrResponse = {
  codigo_interno: string
}

export type PerfilEtiqueta = {
  clave: string
  nombre: string
  ancho_mm: number
  alto_mm: number
  grilla: boolean
  por_pagina: number
}

export type Proveedor = {
  id: number
  nombre: string
  descripcion?: string | null
  sitio_web?: string | null
  notas?: string | null
  activo: number | boolean
}

export type ProveedorContacto = {
  id: number
  proveedor_id: number
  nombre: string
  email?: string | null
  telefono?: string | null
  rol?: string | null
  notas?: string | null
}

export type ProveedorDetalle = Proveedor & {
  contactos: ProveedorContacto[]
}

export type ProveedorCrear = {
  nombre: string
  descripcion?: string | null
  sitio_web?: string | null
  notas?: string | null
}

export type ContactoCrear = {
  nombre: string
  email?: string | null
  telefono?: string | null
  rol?: string | null
  notas?: string | null
}

export type AsistenteTurnoHistorial = {
  role: "user" | "assistant"
  content: string
}

export type AsistenteToolUsada = {
  nombre: string
  args?: Record<string, unknown>
  resultado?: {
    total?: number
    error?: string
    [key: string]: unknown
  }
}

export type AsistenteRespuesta = {
  respuesta: string
  tools_usadas: AsistenteToolUsada[]
}

export type Equipamiento = {
  id: number
  nombre: string
  categoria?: string | null
  cantidad_total: number
  cantidad_operativa: number
  marca?: string | null
  modelo?: string | null
  numero_serie?: string | null
  ubicacion?: string | null
  proveedor_id?: number | null
  proveedor_nombre?: string | null
  enlace_compra?: string | null
  costo_total?: number | null
  fecha_ingreso?: string | null
  notas?: string | null
}

export type EquipamientoCrear = {
  nombre: string
  categoria?: string | null
  marca?: string | null
  modelo?: string | null
  numero_serie?: string | null
  ubicacion?: string | null
  proveedor_id?: number | null
  enlace_compra?: string | null
  costo_total?: number | null
  cantidad_inicial: number
  notas?: string | null
}

export type EventoEquipamiento = {
  id: number
  equipamiento_id: number
  usuario_id: number
  tipo: "alta" | "rotura" | "calibracion" | "reparacion" | "baja"
  cantidad: number
  fecha: string
  motivo: string
  equipamiento_nombre: string
  usuario_nombre: string
}

export type EventoEquipamientoCrear = {
  equipamiento_id: number
  usuario_id: number
  tipo: EventoEquipamiento["tipo"]
  cantidad: number
  motivo: string
}

export type AuditoriaEvento = {
  id: number
  fecha: string
  tipo: "entrada" | "salida" | "ajuste"
  cantidad: number
  motivo?: string | null
  motivo_auditoria?: string | null
  usuario: string
  usuario_sector?: string | null
  saldo_despues?: number
  lote_codigo_interno?: string
}

export type AuditoriaLote = {
  lote: {
    id: number
    codigo_interno: string
    numero_lote?: string | null
    codigo_proveedor?: string | null
    cantidad_inicial: number
    cantidad_actual: number
    fecha_ingreso: string
    fecha_vencimiento?: string | null
    proveedor?: string | null
    costo_total?: number | null
    reactivo_id: number
    reactivo_nombre: string
    unidad: string
    ubicacion?: string | null
    categoria?: string | null
    creado_por: string
    dias_hasta_vencimiento?: number | null
  }
  resumen: {
    total_consumido: number
    total_entradas_extra: number
    cantidad_ajustes: number
    saldo_actual: number
    porcentaje_consumido: number
    estado_vencimiento: string
    total_eventos: number
    consumos_por_usuario: Array<{ usuario: string; sector?: string | null; veces: number; cantidad: number }>
  }
  eventos: AuditoriaEvento[]
}

export type AuditoriaReactivo = {
  reactivo: Reactivo
  periodo: { desde?: string | null; hasta?: string | null }
  lotes: Array<{
    id: number
    codigo_interno: string
    numero_lote?: string | null
    cantidad_inicial: number
    cantidad_actual: number
    fecha_ingreso: string
    fecha_vencimiento?: string | null
    proveedor?: string | null
    costo_total?: number | null
    creado_por: string
    estado: string
    dias_hasta_vencimiento?: number | null
  }>
  eventos: AuditoriaEvento[]
  resumen: {
    total_lotes: number
    lotes_activos: number
    total_ingresado_historico: number
    total_consumido_periodo: number
    saldo_total_actual: number
    total_eventos_periodo: number
    consumos_por_usuario: Array<{ usuario: string; sector?: string | null; veces: number; cantidad: number }>
    consumos_por_sector: Array<{ sector: string; veces: number; cantidad: number }>
  }
}

export type ProtocoloParametro = {
  nombre: string
  label?: string
  unidad?: string
  tipo?: "reactivo" | "opcion"
  grupo?: "volumen" | "masa" | "discreto"
  opciones?: string[]
  min?: number
  default?: number
  step?: number
}

export type Protocolo = {
  id: string
  nombre: string
  categoria?: string | null
  version?: string | null
  parametros?: ProtocoloParametro[]
  pasos: string[]
  editable?: boolean
  plantilla_id?: number
  activo?: boolean
  insumos_definidos?: Array<Record<string, unknown>>
}

export type ProtocoloInsumo = {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  cantidad_base: number
  unidad_base: string
  reactivo?: Reactivo | null
  stock_total: number
  lote_sugerido?: Lote | null
  lotes_disponibles?: Lote[]
  alcanza_stock: boolean
}

export type ProtocoloCalculo = {
  protocolo: Protocolo
  parametros: Record<string, unknown>
  insumos: ProtocoloInsumo[]
  pasos: string[]
}

export type ProtocoloEjecucion = {
  id: number
  protocolo_id: string
  nombre: string
  version?: string | null
  usuario_id: number
  usuario_nombre: string
  fecha: string
  parametros: Record<string, unknown>
  observaciones?: string | null
  insumos_planificados?: Array<{
    id: string
    nombre: string
    cantidad: number
    unidad: string
    cantidad_base: number
    unidad_base: string
    reactivo_nombre?: string | null
  }>
  movimientos?: Array<{
    insumo_id: string
    insumo_nombre?: string
    id: number
    fecha: string
    tipo: string
    cantidad: number
    motivo?: string | null
    codigo_interno: string
    reactivo_nombre: string
    unidad: string
  }>
}

export type ProtocoloPlantillaCrear = {
  nombre: string
  categoria?: string | null
  version?: string | null
  parametros?: Array<Record<string, unknown>>
  pasos: string[]
  insumos: Array<Record<string, unknown>>
  usuario_id: number
}

type ApiOptions = RequestInit & {
  token?: string | null
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (options.token) {
    headers.set("X-Session-Token", options.token)
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(i18n.t("common.errConexion", { url: API_URL }))
  }

  if (!response.ok) {
    let message = i18n.t("common.errHttp", { status: response.status })
    try {
      const payload = await response.json()
      if (payload?.detail) {
        if (typeof payload.detail === "string") {
          message = payload.detail
        } else if (Array.isArray(payload.detail)) {
          message = payload.detail
            .map((item: { loc?: unknown[]; msg?: string }) => {
              const loc = Array.isArray(item.loc) ? item.loc.join(".") : "campo"
              return item.msg ? `${loc}: ${item.msg}` : JSON.stringify(item)
            })
            .join(" | ")
        } else {
          message = JSON.stringify(payload.detail)
        }
      }
    } catch {
      const text = await response.text()
      if (text) {
        message = text
      }
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

async function requestBlob(endpoint: string, options: ApiOptions = {}) {
  const headers = new Headers(options.headers)
  if (options.token) {
    headers.set("X-Session-Token", options.token)
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(i18n.t("common.errConexion", { url: API_URL }))
  }

  if (!response.ok) {
    let message = i18n.t("common.errHttp", { status: response.status })
    try {
      const payload = await response.json()
      if (payload?.detail) {
        message = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail)
      }
    } catch {
      const text = await response.text()
      if (text) {
        message = text
      }
    }
    throw new Error(message)
  }

  return response.blob()
}

export const api = {
  url: API_URL,

  health: async () => request<{ ok: boolean }>("/health"),

  solicitarDemo: async (data: SolicitudDemoCrear) =>
    request<SolicitudDemoResponse>("/contacto/demo", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: async (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: async (token: string) =>
    request<{ mensaje: string }>("/auth/logout", {
      method: "POST",
      token,
    }),

  cambiarPassword: async (token: string, passwordActual: string, passwordNueva: string) =>
    request<{ mensaje: string }>("/auth/cambiar-password", {
      method: "POST",
      token,
      body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva }),
    }),

  me: async (token: string) => request<Usuario>("/auth/yo", { token }),

  organizaciones: async (token: string, soloActivas = true) =>
    request<Organizacion[]>(`/organizaciones?solo_activas=${soloActivas ? "true" : "false"}`, { token }),

  crearOrganizacion: async (token: string, data: OrganizacionCrear) =>
    request<{ id: number; mensaje: string }>("/organizaciones", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  actualizarModulosOrganizacion: async (token: string, organizacionId: number, modulosHabilitados: string[]) =>
    request<OrganizacionModulo[]>(`/organizaciones/${organizacionId}/modulos`, {
      method: "PUT",
      token,
      body: JSON.stringify({ modulos_habilitados: modulosHabilitados }),
    }),

  usuariosOrganizacion: async (token: string, organizacionId: number, soloActivos = true) =>
    request<Usuario[]>(`/organizaciones/${organizacionId}/usuarios?solo_activos=${soloActivos ? "true" : "false"}`, { token }),

  crearUsuarioOrganizacion: async (token: string, organizacionId: number, data: UsuarioCrear) =>
    request<{ id: number; mensaje: string }>(`/organizaciones/${organizacionId}/usuarios`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  tareas: async (token: string, filtros: { estado?: string; asignado_a?: number | null } = {}) => {
    const params = new URLSearchParams()
    if (filtros.estado) {
      params.set("estado", filtros.estado)
    }
    if (filtros.asignado_a !== undefined && filtros.asignado_a !== null) {
      params.set("asignado_a", String(filtros.asignado_a))
    }
    const query = params.toString()
    return request<Tarea[]>(`/tareas${query ? `?${query}` : ""}`, { token })
  },

  crearTarea: async (token: string, data: TareaCrear) =>
    request<Tarea>("/tareas", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  cambiarEstadoTarea: async (token: string, id: number, estado: EstadoTarea) =>
    request<Tarea>(`/tareas/${id}/estado`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ estado }),
    }),

  actualizarTarea: async (token: string, id: number, data: TareaActualizar) =>
    request<Tarea>(`/tareas/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  reasignarTarea: async (token: string, id: number, asignadoA: number | null) =>
    request<Tarea>(`/tareas/${id}/reasignar`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ asignado_a: asignadoA }),
    }),

  tareaEventos: async (token: string, id: number) =>
    request<TareaEvento[]>(`/tareas/${id}/eventos`, { token }),

  comentarTarea: async (token: string, id: number, comentario: string) =>
    request<TareaEvento[]>(`/tareas/${id}/comentarios`, {
      method: "POST",
      token,
      body: JSON.stringify({ comentario }),
    }),

  usuarios: async (token: string, soloActivos = true) =>
    request<Usuario[]>(`/usuarios?solo_activos=${soloActivos ? "true" : "false"}`, { token }),

  usuario: async (token: string, id: number) =>
    request<Usuario>(`/usuarios/${id}`, { token }),

  crearUsuario: async (token: string, data: UsuarioCrear) =>
    request<{ id: number; mensaje: string }>("/usuarios", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  desactivarUsuario: async (token: string, id: number) =>
    request<{ mensaje: string }>(`/usuarios/${id}/desactivar`, {
      method: "PATCH",
      token,
    }),

  reactivarUsuario: async (token: string, id: number) =>
    request<{ mensaje: string }>(`/usuarios/${id}/reactivar`, {
      method: "PATCH",
      token,
    }),

  dashboard: async (token: string) => request<DashboardResumen>("/dashboard", { token }),

  dashboardSeries: async (token: string, dias = 30) =>
    request<DashboardSeries>(`/dashboard/series?dias=${dias}`, { token }),

  reactivos: async (token: string) => request<Reactivo[]>("/reactivos", { token }),

  reactivo: async (token: string, id: number) => request<Reactivo>(`/reactivos/${id}`, { token }),

  crearReactivo: async (token: string, data: ReactivoCrear) =>
    request<{ id: number; mensaje: string }>("/reactivos", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Wizard foto-primero: sugiere si el reactivo de la etiqueta ya existe en el
  // catálogo (match), es dudoso (ambiguo) o es nuevo. Asistencia: el front
  // siempre pide confirmación antes de guardar.
  matchReactivo: async (token: string, data: ReactivoMatchRequest) =>
    request<ReactivoMatch>("/reactivos/match", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Fusiona dos reactivos duplicados (mueve lotes al sobreviviente, da de baja
  // al duplicado). Requiere permiso crear_reactivo.
  fusionarReactivos: async (token: string, sobrevivienteId: number, duplicadoId: number) =>
    request<ReactivoFusionarResponse>("/reactivos/fusionar", {
      method: "POST",
      token,
      body: JSON.stringify({ sobreviviente_id: sobrevivienteId, duplicado_id: duplicadoId }),
    }),

  // Merge tool: posibles duplicados de un reactivo (mismo CAS o misma sustancia
  // según el LLM, misma unidad). Requiere crear_reactivo.
  duplicadosReactivo: async (token: string, id: number) =>
    request<DuplicadosReactivo>(`/reactivos/${id}/duplicados`, { token }),

  actualizarReactivo: async (token: string, id: number, data: ReactivoActualizar) =>
    request<{ id: number; mensaje: string }>(`/reactivos/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  lotesPorReactivo: async (token: string, reactivoId: number) =>
    request<Lote[]>(`/lotes/reactivo/${reactivoId}`, { token }),

  lotes: async (token: string, busqueda?: string, soloConStock = true) => {
    const params = new URLSearchParams()
    if (busqueda?.trim()) {
      params.set("q", busqueda.trim())
    }
    params.set("solo_con_stock", soloConStock ? "true" : "false")
    const query = params.toString()
    return request<Lote[]>(`/lotes${query ? `?${query}` : ""}`, { token })
  },

  lotePorCodigo: async (token: string, codigoInterno: string) =>
    request<Lote>(`/lotes/codigo/${encodeURIComponent(codigoInterno)}`, { token }),

  crearLote: async (token: string, data: LoteCrear) =>
    request<LoteCrearResponse>("/lotes", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  crearLotesMultiples: async (token: string, data: LoteCrearMultiple) =>
    request<LoteCrearMultipleResponse>("/lotes/multiples", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  actualizarLote: async (token: string, id: number, data: LoteActualizar) =>
    request<{ id: number; mensaje: string }>(`/lotes/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  ajustarStockLote: async (token: string, id: number, data: LoteAjusteStock) =>
    request<LoteAjusteStockResponse>(`/lotes/${id}/ajustar-stock`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  unidadesCompatibles: async (token: string, unidad: string) =>
    request<UnidadesCompatibles>(`/unidades/compatibles/${encodeURIComponent(unidad)}`, { token }),

  consumirReactivo: async (token: string, data: ConsumoCrear) =>
    request<ConsumoResponse>("/movimientos/consumir", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  movimientos: async (token: string, filtros: MovimientosFiltros = {}) => {
    const params = new URLSearchParams()
    if (filtros.limite) {
      params.set("limite", String(filtros.limite))
    }
    if (filtros.desde) {
      params.set("desde", filtros.desde)
    }
    if (filtros.hasta) {
      params.set("hasta", filtros.hasta)
    }
    if (filtros.tipo) {
      params.set("tipo", filtros.tipo)
    }
    if (filtros.reactivo_id) {
      params.set("reactivo_id", String(filtros.reactivo_id))
    }
    const query = params.toString()
    return request<Movimiento[]>(`/movimientos${query ? `?${query}` : ""}`, { token })
  },

  qrLote: async (token: string, loteId: number) =>
    requestBlob(`/lotes/${loteId}/qr`, { token }),

  perfilesEtiquetas: async (token: string) =>
    request<PerfilEtiqueta[]>("/lotes/etiquetas-perfiles", { token }),

  etiquetasPdf: async (
    token: string,
    loteIds: number[],
    posicionInicio: number,
    formato = "avery_l7160",
  ) =>
    requestBlob("/lotes/etiquetas-pdf", {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lote_ids: loteIds, posicion_inicio: posicionInicio, formato }),
    }),

  extraerEtiquetaLote: async (token: string, file: File) => {
    const formData = new FormData()
    formData.append("imagen", file)
    return request<DatosEtiqueta>("/lotes/extraer-etiqueta", {
      method: "POST",
      token,
      body: formData,
    })
  },

  decodificarQrLote: async (token: string, file: File) => {
    const formData = new FormData()
    formData.append("imagen", file)
    return request<DecodificarQrResponse>("/lotes/decodificar-qr", {
      method: "POST",
      token,
      body: formData,
    })
  },

  proveedores: async (token: string, soloActivos = true) =>
    request<Proveedor[]>(`/proveedores?solo_activos=${soloActivos ? "true" : "false"}`, { token }),

  proveedor: async (token: string, id: number) =>
    request<ProveedorDetalle>(`/proveedores/${id}`, { token }),

  crearProveedor: async (token: string, data: ProveedorCrear) =>
    request<{ id: number; mensaje: string }>("/proveedores", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  desactivarProveedor: async (token: string, id: number) =>
    request<{ mensaje: string }>(`/proveedores/${id}/desactivar`, {
      method: "PATCH",
      token,
    }),

  reactivarProveedor: async (token: string, id: number) =>
    request<{ mensaje: string }>(`/proveedores/${id}/reactivar`, {
      method: "PATCH",
      token,
    }),

  agregarContactoProveedor: async (token: string, proveedorId: number, data: ContactoCrear) =>
    request<{ id: number; mensaje: string }>(`/proveedores/${proveedorId}/contactos`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  eliminarContactoProveedor: async (token: string, contactoId: number) =>
    request<{ mensaje: string }>(`/proveedores/contactos/${contactoId}`, {
      method: "DELETE",
      token,
    }),

  preguntarAsistente: async (token: string, pregunta: string, historial: AsistenteTurnoHistorial[]) =>
    request<AsistenteRespuesta>("/asistente/preguntar", {
      method: "POST",
      token,
      body: JSON.stringify({ pregunta, historial }),
    }),

  equipamiento: async (token: string, filtros: { categoria?: string; solo_operativos?: boolean } = {}) => {
    const params = new URLSearchParams()
    if (filtros.categoria) {
      params.set("categoria", filtros.categoria)
    }
    if (filtros.solo_operativos) {
      params.set("solo_operativos", "true")
    }
    const query = params.toString()
    return request<Equipamiento[]>(`/equipamiento${query ? `?${query}` : ""}`, { token })
  },

  equipamientoDetalle: async (token: string, id: number) =>
    request<Equipamiento>(`/equipamiento/${id}`, { token }),

  categoriasEquipamiento: async (token: string) =>
    request<{ categorias: string[] }>("/equipamiento/categorias", { token }),

  crearEquipamiento: async (token: string, data: EquipamientoCrear) =>
    request<{ id: number; mensaje: string }>("/equipamiento", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  registrarEventoEquipamiento: async (token: string, data: EventoEquipamientoCrear) =>
    request<{ id: number; mensaje: string }>("/equipamiento/evento", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  eventosEquipamiento: async (token: string, id: number, limite = 100) =>
    request<EventoEquipamiento[]>(`/equipamiento/${id}/eventos?limite=${limite}`, { token }),

  eventosEquipamientoGlobal: async (token: string, limite = 100) =>
    request<EventoEquipamiento[]>(`/eventos-equipamiento?limite=${limite}`, { token }),

  auditoriaLote: async (token: string, codigoInterno: string) =>
    request<AuditoriaLote>(`/auditoria/lote/${encodeURIComponent(codigoInterno)}`, { token }),

  auditoriaReactivo: async (token: string, reactivoId: number, desde?: string, hasta?: string) => {
    const params = new URLSearchParams()
    if (desde) {
      params.set("desde", desde)
    }
    if (hasta) {
      params.set("hasta", hasta)
    }
    const query = params.toString()
    return request<AuditoriaReactivo>(`/auditoria/reactivo/${reactivoId}${query ? `?${query}` : ""}`, { token })
  },

  auditoriaLotePdf: async (token: string, codigoInterno: string) =>
    requestBlob(`/auditoria/lote/${encodeURIComponent(codigoInterno)}/pdf`, { token }),

  auditoriaReactivoPdf: async (token: string, reactivoId: number, desde?: string, hasta?: string) => {
    const params = new URLSearchParams()
    if (desde) {
      params.set("desde", desde)
    }
    if (hasta) {
      params.set("hasta", hasta)
    }
    const query = params.toString()
    return requestBlob(`/auditoria/reactivo/${reactivoId}/pdf${query ? `?${query}` : ""}`, { token })
  },

  protocolos: async (token: string) =>
    request<Protocolo[]>("/protocolos", { token }),

  calcularProtocolo: async (token: string, protocoloId: string, parametros: Record<string, unknown>) =>
    request<ProtocoloCalculo>(`/protocolos/${encodeURIComponent(protocoloId)}/calcular`, {
      method: "POST",
      token,
      body: JSON.stringify({ parametros }),
    }),

  ejecutarProtocolo: async (
    token: string,
    protocoloId: string,
    data: { usuario_id: number; parametros: Record<string, unknown>; insumos: Array<{ insumo_id: string; lote_id: number }>; observaciones?: string | null },
  ) =>
    request<{ id: number; protocolo: Protocolo; movimientos: MovimientoConsumo[]; motivo: string }>(`/protocolos/${encodeURIComponent(protocoloId)}/ejecutar`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  protocolosEjecuciones: async (token: string, limite = 50) =>
    request<ProtocoloEjecucion[]>(`/protocolos/ejecuciones?limite=${limite}`, { token }),

  protocoloEjecucionPdf: async (token: string, ejecucionId: number) =>
    requestBlob(`/protocolos/ejecuciones/${ejecucionId}/pdf`, { token }),

  protocoloPlantillas: async (token: string) =>
    request<Protocolo[]>("/protocolos/plantillas", { token }),

  crearProtocoloPlantilla: async (token: string, data: ProtocoloPlantillaCrear) =>
    request<{ id: number; protocolo_id: string }>("/protocolos/plantillas", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  activarProtocoloPlantilla: async (token: string, plantillaId: number) =>
    request<{ id: number; activo: boolean }>(`/protocolos/plantillas/${plantillaId}/activar`, {
      method: "PATCH",
      token,
    }),

  desactivarProtocoloPlantilla: async (token: string, plantillaId: number) =>
    request<{ id: number; activo: boolean }>(`/protocolos/plantillas/${plantillaId}/desactivar`, {
      method: "PATCH",
      token,
    }),
}
