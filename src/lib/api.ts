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

export type AuthEvento = {
  id: number
  fecha: string
  evento: "login_success" | "login_failed" | "logout"
  usuario_id?: number | null
  organizacion_id?: number | null
  organizacion_nombre?: string | null
  usuario_nombre?: string | null
  email?: string | null
  exito: number | boolean
  motivo?: string | null
  ip?: string | null
  user_agent?: string | null
}

export type AuthEventosResponse = {
  eventos: AuthEvento[]
}

export type AsistenteEventoOwner = {
  id: number
  fecha: string
  origen?: string
  usuario_id?: number | null
  usuario_nombre?: string | null
  organizacion_id: number
  organizacion_nombre?: string | null
  modelo?: string | null
  operacion?: string | null
  entrada_resumen?: string | null
  pregunta?: string | null
  modo_respuesta: string
  detalle?: string | null
  tools_count: number
  tools_nombres?: string | null
  tokens_input: number
  tokens_output: number
  tokens_cache_read: number
  costo_estimado_usd: number
  duracion_ms: number
  exito: number | boolean
  error?: string | null
}

export type AsistenteEventosResponse = {
  eventos: AsistenteEventoOwner[]
}

export type AsistenteResumenOwner = {
  total: {
    total: number
    exitosos: number
    errores: number
    tokens_input: number
    tokens_output: number
    tokens_cache_read: number
    costo_estimado_usd: number
    duracion_ms_promedio: number
  }
  por_origen?: Array<{ origen: string; total: number; costo_estimado_usd: number }>
  por_modo: Array<{ modo_respuesta: string; total: number }>
  por_dia: Array<{ dia: string; total: number; costo_estimado_usd: number }>
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

export type ReposicionRecomendacion = {
  reactivo_id: number
  reactivo_nombre: string
  unidad: string
  ubicacion?: string | null
  categoria?: string | null
  nivel: "urgente" | "atencion" | "planificar" | string
  motivos: string[]
  stock_actual: number
  stock_minimo: number
  consumo_total_periodo: number
  consumo_promedio_diario: number
  dias_stock_estimado?: number | null
  movimientos_salida: number
  stock_vence_30d: number
  proximo_vencimiento?: string | null
  cantidad_sugerida: number
  proveedor_reciente?: string | null
  costo_reciente?: number | null
  fecha_proveedor_reciente?: string | null
}

export type DashboardReposicion = {
  parametros: {
    dias: number
    umbral_urgente: number
    limite: number
    desde: string
    hasta: string
  }
  recomendaciones: ReposicionRecomendacion[]
  total: number
}

export type ReposicionTareaResponse = {
  tarea: Tarea
  recomendacion: ReposicionRecomendacion
  creada: boolean
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
  // Lotes activos (cantidad_actual > 0) del reactivo y el vencimiento más
  // próximo entre ellos. Los agrega el listado de /reactivos para que el
  // Catálogo muestre la relación reactivo↔lotes sin abrir cada fila.
  lotes_count?: number
  proximo_vencimiento?: string | null
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
  usuario_sector?: string | null
  reactivo_id: number
  reactivo_nombre: string
  reactivo_categoria?: string | null
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
  categoria?: string
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
  // Conteos de relación que agrega el listado /proveedores: lotes activos
  // provistos, reactivos distintos abastecidos y contactos cargados.
  lotes_count?: number
  reactivos_count?: number
  contactos_count?: number
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
  contexto?: AsistenteContexto | null
}

export type AsistenteContexto = {
  tipo: string
  reactivo_id?: number
  reactivo_nombre?: string
  codigo_interno?: string
  desde?: string | null
  hasta?: string | null
  periodo_label?: string | null
  dias?: number
  [key: string]: unknown
}

export type AsistenteModoRespuesta = {
  tipo: "fast_path" | "llm_tools" | "llm_general" | "error" | string
  detalle?: string | null
  tools?: number
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
  contexto?: AsistenteContexto | null
  modo_respuesta?: AsistenteModoRespuesta | null
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

// ── Cepario (registro biológico) ──
export type CeparioTipo = "microorganismo" | "parte_genetica"
export type CeparioEstado = "aislado" | "cepa" | "archivado" | "activa"
export type CeparioViabilidad = "viable" | "requiere_repique" | "agotado_critico"
export type GrupoOperativo = "H" | "U" | "P" | "M" | "?"

export type EntidadBiologica = {
  id: number
  tipo: CeparioTipo
  codigo: string | null
  codigo_temporal: string | null
  nombre: string | null
  estado: CeparioEstado
  nivel_bioseguridad?: string | null
  grupo_operativo?: GrupoOperativo | null
  taxon_presuntivo?: string | null
  categoria?: string | null
  resistencia?: string | null
  concentracion_ng_ul?: number | null
  nro_viales_total: number
  viabilidad_resumen: CeparioViabilidad | null
  fecha_creacion?: string
}

export type CeparioVial = {
  id: number
  organizacion_id: number
  entidad_id: number
  codigo_interno: string
  nro_viales_inicial: number
  nro_viales_actual: number
  ubicacion_freezer: string | null
  ubicacion_caja: string | null
  ubicacion_posicion: string | null
  temperatura: string | null
  crioprotectante: string | null
  viabilidad: CeparioViabilidad | null
  medio_repique: string | null
  ultimo_control: string | null
  fecha_creacion?: string
  activo: number | boolean
  // Presentes al resolver por QR (JOIN con la entidad dueña).
  entidad_codigo?: string | null
  entidad_codigo_temporal?: string | null
  entidad_nombre?: string | null
  entidad_tipo?: CeparioTipo
  entidad_estado?: CeparioEstado
}

export type CeparioEvento = {
  id: number
  entidad_id: number
  tipo_evento: string
  detalle: string | null
  usuario_id: number | null
  usuario_nombre?: string | null
  fecha: string
}

export type EntidadCaracterizacion = {
  id: number
  entidad_id: number
  score_calculado?: number | null
  score_confirmado?: number | null
  decision?: string | null
  firmado_por?: number | null
  firmado_en?: string | null
  enmienda_de_id?: number | null
  usuario_id?: number | null
  fecha_creacion?: string | null
  // Los ~20 ensayos de la Ficha son columnas TEXT; se acceden por nombre.
  [key: string]: unknown
}

export type EntidadDetalle = EntidadBiologica & {
  organizacion_id: number
  notas?: string | null
  procedencia?: string | null
  propietario_origen?: string | null
  rama_aislamiento?: string | null
  origen_muestra?: string | null
  fecha_aislamiento?: string | null
  medio_aislamiento?: string | null
  backbone_chasis?: string | null
  resistencia?: string | null
  concentracion_ng_ul?: number | null
  funcion_uso?: string | null
  stock: CeparioVial[]
  caracterizaciones: EntidadCaracterizacion[]
  eventos: CeparioEvento[]
  linaje: { origen: unknown[]; derivados: unknown[] }
}

// Score determinístico (Perfil ideal) — asistencia para prellenar, el científico confirma.
export type CepScoreGate1 = { pasa: boolean; checks: Record<string, boolean> }
export type CepScoreGate2 = { pasa: boolean; criterio: string }
export type CepScoreAporte = { criterio: string; puntos: number }
export type CepScoreGate3 = { puntos: number; max: number; aportes: CepScoreAporte[] }
export type CepScoreResultado = {
  score_calculado: number
  detalle_gates: { gate1: CepScoreGate1; gate2: CepScoreGate2; gate3: CepScoreGate3 }
}

export type CepPreviewScorePayload = {
  grupo_operativo: string
  ensayos: Record<string, string>
  medio_aislamiento?: string | null
  origen_muestra?: string | null
  nivel_bioseguridad?: string | null
}

export type CepCaracterizacionCrear = {
  ensayos: Record<string, string>
  score_calculado?: number | null
  score_confirmado?: number | null
  decision?: string | null
}

export type CepCaracterizacionEditar = {
  ensayos: Record<string, string>
  score_confirmado?: number | null
  decision?: string | null
}

export type CeparioVocabularios = Record<string, string[]>

export type CeparioEntidadFiltros = {
  q?: string
  tipo?: CeparioTipo
  grupo?: string
  categoria?: string
  estado?: string
}

export type CepEntidadCrear = {
  tipo: CeparioTipo
  nombre?: string | null
  estado?: CeparioEstado | null
  nivel_bioseguridad?: string | null
  propietario_origen?: string | null
  procedencia?: string | null
  notas?: string | null
  grupo_operativo?: GrupoOperativo | null
  rama_aislamiento?: string | null
  taxon_presuntivo?: string | null
  origen_muestra?: string | null
  fecha_aislamiento?: string | null
  medio_aislamiento?: string | null
  categoria?: string | null
  backbone_chasis?: string | null
  resistencia?: string | null
  concentracion_ng_ul?: number | null
  funcion_uso?: string | null
}

export type CepStockCrear = {
  nro_viales: number
  ubicacion_freezer?: string | null
  ubicacion_caja?: string | null
  ubicacion_posicion?: string | null
  temperatura?: string | null
  crioprotectante?: string | null
  viabilidad?: CeparioViabilidad
  medio_repique?: string | null
  ultimo_control?: string | null
}

export type CepMovimientoTipo = "descongelar" | "repique" | "descarte" | "ajuste"

export type CepConsumoInventario = {
  reactivo_id: number
  cantidad: number
  lote_id?: number | null
  motivo?: string | null
}

export type CepMovimientoCrear = {
  tipo: CepMovimientoTipo
  cantidad: number
  motivo?: string | null
  consumo_inventario?: CepConsumoInventario | null
}

export type CepMovimientoResultado = {
  movimiento_id: number
  stock_id: number
  tipo: string
  cantidad: number
  nro_viales_actual: number
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

  authEventos: async (
    token: string,
    filtros: {
      desde?: string
      hasta?: string
      evento?: string
      email?: string
      ip?: string
      organizacion_id?: number | null
      limite?: number
    } = {},
  ) => {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, String(value))
      }
    })
    const query = params.toString()
    return request<AuthEventosResponse>(`/owner/auth-eventos${query ? `?${query}` : ""}`, { token })
  },

  asistenteEventos: async (
    token: string,
    filtros: {
      desde?: string
      hasta?: string
      modo_respuesta?: string
      origen?: string
      organizacion_id?: number | null
      usuario_id?: number | null
      limite?: number
    } = {},
  ) => {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, String(value))
      }
    })
    const query = params.toString()
    return request<AsistenteEventosResponse>(`/owner/asistente-eventos${query ? `?${query}` : ""}`, { token })
  },

  asistenteResumen: async (
    token: string,
    filtros: {
      desde?: string
      hasta?: string
      origen?: string
      organizacion_id?: number | null
    } = {},
  ) => {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, String(value))
      }
    })
    const query = params.toString()
    return request<AsistenteResumenOwner>(`/owner/asistente-resumen${query ? `?${query}` : ""}`, { token })
  },

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

  dashboardReposicion: async (token: string, dias = 30, limite = 10) =>
    request<DashboardReposicion>(`/dashboard/reposicion?dias=${dias}&limite=${limite}`, { token }),

  crearTareaReposicion: async (token: string, reactivoId: number, dias = 30, asignadoA?: number | null) =>
    request<ReposicionTareaResponse>("/dashboard/reposicion/tarea", {
      method: "POST",
      token,
      body: JSON.stringify({ reactivo_id: reactivoId, dias, asignado_a: asignadoA ?? null }),
    }),

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
    if (filtros.categoria) {
      params.set("categoria", filtros.categoria)
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

  auditoriaMovimientos: async (token: string, filtros: MovimientosFiltros = {}) => {
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
    if (filtros.categoria) {
      params.set("categoria", filtros.categoria)
    }
    const query = params.toString()
    return request<Movimiento[]>(`/auditoria/movimientos${query ? `?${query}` : ""}`, { token })
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

  // ── Cepario ──
  ceparioVocabularios: async (token: string) =>
    request<CeparioVocabularios>("/cepario/vocabularios", { token }),

  ceparioEntidades: async (token: string, filtros: CeparioEntidadFiltros = {}) => {
    const params = new URLSearchParams()
    if (filtros.q) params.set("q", filtros.q)
    if (filtros.tipo) params.set("tipo", filtros.tipo)
    if (filtros.grupo) params.set("grupo", filtros.grupo)
    if (filtros.categoria) params.set("categoria", filtros.categoria)
    if (filtros.estado) params.set("estado", filtros.estado)
    const query = params.toString()
    return request<EntidadBiologica[]>(`/cepario/entidades${query ? `?${query}` : ""}`, { token })
  },

  ceparioEntidad: async (token: string, entidadId: number) =>
    request<EntidadDetalle>(`/cepario/entidades/${entidadId}`, { token }),

  crearEntidadCepario: async (token: string, data: CepEntidadCrear) =>
    request<{ id: number; codigo: string | null; codigo_temporal: string | null; tipo: string; estado: string }>(
      "/cepario/entidades",
      { method: "POST", token, body: JSON.stringify(data) },
    ),

  ceparioStock: async (token: string, entidadId: number) =>
    request<CeparioVial[]>(`/cepario/entidades/${entidadId}/stock`, { token }),

  crearStockCepario: async (token: string, entidadId: number, data: CepStockCrear) =>
    request<{ stock_id: number; codigo_interno: string }>(`/cepario/entidades/${entidadId}/stock`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  ceparioRegistrarMovimiento: async (token: string, stockId: number, data: CepMovimientoCrear) =>
    request<CepMovimientoResultado>(`/cepario/stock/${stockId}/movimientos`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  ceparioStockPorCodigo: async (token: string, codigoInterno: string) =>
    request<CeparioVial>(`/cepario/stock/codigo/${encodeURIComponent(codigoInterno)}`, { token }),

  ceparioEtiquetasPdf: async (token: string, stockIds: number[], formato = "avery_l7160", posicionInicio = 1) =>
    requestBlob("/cepario/stock/etiquetas-pdf", {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_ids: stockIds, formato, posicion_inicio: posicionInicio }),
    }),

  // ── Cepario US2: screening (caracterización, score, promoción, ciclo de vida) ──
  ceparioPreviewScore: async (token: string, payload: CepPreviewScorePayload) =>
    request<CepScoreResultado>("/cepario/caracterizaciones/preview-score", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),

  ceparioCrearCaracterizacion: async (token: string, entidadId: number, payload: CepCaracterizacionCrear) =>
    request<{ id: number }>(`/cepario/entidades/${entidadId}/caracterizaciones`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),

  ceparioEditarCaracterizacion: async (token: string, caracId: number, payload: CepCaracterizacionEditar) =>
    request<{ id: number; actualizado: number }>(`/cepario/caracterizaciones/${caracId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),

  ceparioFirmarCaracterizacion: async (token: string, caracId: number) =>
    request<{ id: number; firmada: boolean }>(`/cepario/caracterizaciones/${caracId}/firmar`, {
      method: "POST",
      token,
    }),

  ceparioEnmendarCaracterizacion: async (token: string, caracId: number, payload: CepCaracterizacionEditar) =>
    request<{ id: number; enmienda_de_id: number }>(`/cepario/caracterizaciones/${caracId}/enmienda`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),

  ceparioPromover: async (token: string, entidadId: number) =>
    request<{ id: number; codigo: string }>(`/cepario/entidades/${entidadId}/promover`, {
      method: "POST",
      token,
    }),

  ceparioArchivar: async (token: string, entidadId: number, motivo?: string | null) =>
    request<{ id: number; estado: string }>(`/cepario/entidades/${entidadId}/archivar`, {
      method: "POST",
      token,
      body: JSON.stringify({ motivo: motivo ?? null }),
    }),

  ceparioReactivar: async (token: string, entidadId: number) =>
    request<{ id: number; estado: string }>(`/cepario/entidades/${entidadId}/reactivar`, {
      method: "POST",
      token,
    }),
}
