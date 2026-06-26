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
  // Puente con Compras: ítem de compra vivo más reciente que nació de esta tarea.
  compra_codigo?: string | null
  compra_solicitud_id?: number | null
  compra_item_estado?: string | null
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
  cantidad_inicial_reciente?: number | null
  costo_unitario_reciente?: number | null
  fecha_proveedor_reciente?: string | null
  compra_activa?: {
    estado: "borrador" | "pendiente_aprobacion" | "aprobada" | "pedido" | "en_camino" | "recibida_parcial" | string
    solicitud_id: number
    codigo: string
    cantidad_pendiente: number
    unidad: string
  } | null
  // Cerebro de quiebre: prioridad relativa al lead time observado del proveedor.
  riesgo_quiebre?: "inminente" | "pedir_ya" | "ok" | "sin_consumo" | string
  lead_time_dias?: number | null
  lead_time_fuente?: "proveedor" | "organizacion" | "default" | string
  dias_seguridad?: number | null
  punto_reorden?: number | null
  dias_holgura?: number | null
  fecha_limite_pedido?: string | null
  // Comparador de proveedores: todos los tiempos del reactivo + consejo (vos decidís).
  opciones_proveedor?: {
    proveedor_id?: number | null
    proveedor_nombre: string
    lead_time_dias: number
    lead_time_fuente: "proveedor" | "organizacion" | "default" | string
    es_reciente: boolean
    dias_holgura?: number | null
    llega_a_tiempo: boolean
  }[]
  consejo_proveedor?: string | null
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
  horizonte_stock?: ReposicionRecomendacion[]
  total: number
  total_horizonte_stock?: number
}

export type CompraEstado =
  | "borrador"
  | "pendiente_aprobacion"
  | "aprobada"
  | "rechazada"
  | "cambios_solicitados"
  | "cancelada"
  | "recibida_parcial"
  | "recibida"

export type CompraPrioridad = "baja" | "media" | "alta" | "urgente"
export type CompraEstadoEntrega = "no_pedido" | "pedido" | "en_camino"

export type CompraItem = {
  id: number
  solicitud_id: number
  reactivo_id?: number | null
  reactivo_nombre?: string | null
  tarea_id?: number | null
  descripcion_manual?: string | null
  origen: "reposicion" | "manual"
  estado: string
  unidad: string
  cantidad_sugerida: number
  cantidad_solicitada: number
  cantidad_aprobada?: number | null
  cantidad_recibida?: number
  motivos?: string[]
  snapshot_reposicion?: Record<string, unknown> | null
  proveedor_id?: number | null
  proveedor_nombre?: string | null
  proveedor_nombre_snapshot?: string | null
  presentacion?: string | null
  costo_unitario_estimado: number
  costo_total_estimado: number
  moneda: string
  notas?: string | null
}

export type CompraEvento = {
  id: number
  solicitud_id: number
  item_id?: number | null
  usuario_id: number
  usuario_nombre?: string | null
  tipo: string
  estado_anterior?: string | null
  estado_nuevo?: string | null
  comentario?: string | null
  detalle?: Record<string, unknown> | null
  fecha: string
}

export type CompraComunicacion = {
  id: number
  organizacion_id?: number
  solicitud_id: number
  proveedor_id?: number | null
  proveedor_nombre_snapshot?: string | null
  contacto_id?: number | null
  contacto_nombre?: string | null
  contacto_email_snapshot?: string | null
  estado: "borrador" | "descargado" | "copiado" | "descartado" | string
  origen: "deterministico" | "ia" | string
  titulo: string
  contenido_generado: string
  contenido_editado?: string | null
  contenido: string
  version_actual?: number
  versiones_count?: number
  fecha_creacion: string
  fecha_actualizacion?: string | null
  creado_por: number
  creado_por_nombre?: string | null
  ia_advertencias?: string[]
  ia_canal?: CompraComunicacionCanal
  ia_idioma?: CompraComunicacionIdioma
}

export type CompraComunicacionCanal = "email_formal" | "whatsapp" | "orden_compra"
export type CompraComunicacionIdioma = "es" | "en" | "pt"

export type CompraComunicacionVersion = {
  id: number
  organizacion_id: number
  comunicacion_id: number
  solicitud_id: number
  version_numero: number
  contenido: string
  origen: "generada" | "edicion" | "ia" | string
  usuario_id: number
  usuario_nombre?: string | null
  fecha: string
}

export type CompraRecepcion = {
  id: number
  organizacion_id: number
  solicitud_id: number
  item_id: number
  lote_id: number
  cantidad_vinculada: number
  unidad: string
  usuario_id: number
  usuario_nombre?: string | null
  observacion?: string | null
  fecha: string
  codigo_interno?: string | null
  lote_reactivo_id?: number | null
  reactivo_nombre?: string | null
}

export type CompraSolicitud = {
  id: number
  codigo: string
  estado: CompraEstado
  estado_entrega?: CompraEstadoEntrega
  prioridad: CompraPrioridad
  titulo: string
  notas?: string | null
  solicitado_por: number
  solicitado_por_nombre?: string | null
  aprobado_por?: number | null
  aprobado_por_nombre?: string | null
  rechazado_por?: number | null
  rechazado_por_nombre?: string | null
  fecha_necesaria?: string | null
  fecha_creacion: string
  fecha_actualizacion?: string | null
  fecha_envio_aprobacion?: string | null
  fecha_aprobacion?: string | null
  fecha_pedido?: string | null
  fecha_en_camino?: string | null
  fecha_cierre?: string | null
  costo_total_estimado?: number
  items_count?: number
  items?: CompraItem[]
  eventos?: CompraEvento[]
  comunicaciones?: CompraComunicacion[]
  recepciones?: CompraRecepcion[]
}

export type CompraItemCrear = {
  origen: "reposicion" | "manual"
  reactivo_id?: number | null
  tarea_id?: number | null
  descripcion_manual?: string | null
  dias_reposicion?: number
  cantidad_solicitada: number
  unidad?: string | null
  proveedor_id?: number | null
  proveedor_nombre?: string | null
  presentacion?: string | null
  costo_unitario_estimado?: number
  moneda?: string
  notas?: string | null
}

export type CompraSolicitudCrear = {
  titulo: string
  prioridad: CompraPrioridad
  fecha_necesaria?: string | null
  notas?: string | null
  enviar_a_aprobacion?: boolean
  items: CompraItemCrear[]
}

export type CompraSolicitudActualizar = {
  titulo?: string
  prioridad?: CompraPrioridad
  fecha_necesaria?: string | null
  notas?: string | null
  fecha_actualizacion_esperada?: string | null
  items?: CompraItemCrear[]
}

export type CompraConstructorItem = CompraItemCrear & {
  nombre: string
  cantidad_sugerida?: number
  nivel?: string
  motivos?: string[]
  stock_actual?: number
}

export type CompraConstructorRespuesta = {
  titulo: string
  items: CompraConstructorItem[]
  advertencias: string[]
  modelo?: string | null
}

export type CompraComunicacionCrear = {
  proveedor_id?: number | null
  contacto_id?: number | null
  titulo?: string | null
  observaciones?: string | null
}

export type CompraComunicacionReescribirIA = {
  canal: CompraComunicacionCanal
  idioma: CompraComunicacionIdioma
  nombre_contacto?: string | null
  version_esperada: number
}

export type CompraRevalidacion = {
  solicitud_id: number
  items: Array<{
    item_id: number
    reactivo_id?: number | null
    stale: boolean
    cambios: string[]
    snapshot?: Record<string, unknown> | null
    actual?: Record<string, unknown> | null
  }>
}

export type CompraRecepcionCrear = {
  lote_id: number
  cantidad_vinculada: number
  unidad: string
  observacion?: string | null
}

export type CompraRecepcionResponse = {
  recepcion: CompraRecepcion
  solicitud: CompraSolicitud
}

export type ReposicionTareaResponse = {
  tarea: Tarea
  recomendacion: ReposicionRecomendacion
  creada: boolean
}

// Silencio de sugerencias de reposición (reactivos que ya no se usan).
export type ReposicionSilenciado = {
  id: number
  reactivo_id: number
  reactivo_nombre: string
  unidad: string
  motivo?: string | null
  fecha_silenciado: string
  silenciado_por: number
  silenciado_por_nombre?: string | null
}

// Panel "Tareas de reposición pendientes" que arma el carrito desde las tareas.
export type TareaPendienteCompra = {
  tarea_id: number
  titulo: string
  prioridad: PrioridadTarea
  fecha_limite?: string | null
  reactivo_id: number
  reactivo_nombre: string
  unidad: string
  tiene_recomendacion: boolean
  recomendacion?: ReposicionRecomendacion | null
}

export type TareasPendientesCompraResponse = {
  tareas: TareaPendienteCompra[]
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
  cas_numero?: string | null
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
  proveedor_id?: number | null
  costo_total: number
  usuario_id?: number | null
  compras_recepciones_count?: number
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
  proveedor_id?: number | null
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
  proveedor_id?: number | null
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
  proveedor_id?: number | null
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
  max_por_pdf: number
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

export type ProveedorActualizar = ProveedorCrear

export type ContactoCrear = {
  nombre: string
  email?: string | null
  telefono?: string | null
  rol?: string | null
  notas?: string | null
}

export type ContactoActualizar = ContactoCrear

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
  unidad_id?: number | null
  usuario_id: number
  tipo: "alta" | "rotura" | "calibracion" | "reparacion" | "baja"
  cantidad: number
  fecha: string
  motivo: string
  equipamiento_nombre: string
  unidad_codigo?: string | null
  usuario_nombre: string
}

export type EventoEquipamientoCrear = {
  equipamiento_id: number
  usuario_id: number
  tipo: EventoEquipamiento["tipo"]
  cantidad: number
  motivo: string
  unidad_id?: number | null
}

export type EquipamientoUnidad = {
  id: number
  organizacion_id: number
  equipamiento_id: number
  codigo_interno: string
  numero_serie?: string | null
  ubicacion?: string | null
  estado: "operativa" | "fuera_de_uso" | "calibracion" | "baja"
  fecha_creacion: string
  usuario_id?: number | null
  activo: number
  ultimo_evento_fecha?: string | null
  ultimo_evento_tipo?: EventoEquipamiento["tipo"] | null
  equipamiento_nombre?: string
  equipamiento_categoria?: string | null
  equipamiento_marca?: string | null
  equipamiento_modelo?: string | null
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
export type CeparioTipo = "microorganismo" | "parte_genetica" | "linea_celular"
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
  accession_16s?: string | null
  accession_genoma?: string | null
  categoria?: string | null
  resistencia?: string | null
  concentracion_ng_ul?: number | null
  // Línea celular (subset en el listado).
  organismo?: string | null
  tejido_origen?: string | null
  tipo_cultivo?: string | null
  micoplasma_estado?: string | null
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
  caja_equipamiento_id: number | null
  ubicacion_freezer: string | null
  ubicacion_caja: string | null
  ubicacion_posicion: string | null
  temperatura: string | null
  crioprotectante: string | null
  viabilidad: CeparioViabilidad | null
  medio_repique: string | null
  ultimo_control: string | null
  pasaje?: number | null
  origen_stock_id?: number | null
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
  accession_16s?: string | null
  accession_genoma?: string | null
  categoria?: string | null
  backbone_chasis?: string | null
  resistencia?: string | null
  concentracion_ng_ul?: number | null
  funcion_uso?: string | null
  // Línea celular (set completo en el detalle).
  organismo?: string | null
  tejido_origen?: string | null
  tipo_cultivo?: string | null
  morfologia?: string | null
  medio_recomendado?: string | null
  ratio_split?: string | null
  micoplasma_estado?: string | null
  micoplasma_fecha?: string | null
  pasaje_maximo_recomendado?: number | null
  referencia_externa?: string | null
  modificacion_genetica?: string | null
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
  accession_16s?: string | null
  accession_genoma?: string | null
  categoria?: string | null
  backbone_chasis?: string | null
  resistencia?: string | null
  concentracion_ng_ul?: number | null
  funcion_uso?: string | null
  organismo?: string | null
  tejido_origen?: string | null
  tipo_cultivo?: string | null
  morfologia?: string | null
  medio_recomendado?: string | null
  ratio_split?: string | null
  micoplasma_estado?: string | null
  micoplasma_fecha?: string | null
  pasaje_maximo_recomendado?: number | null
  referencia_externa?: string | null
  modificacion_genetica?: string | null
}

export type CepEntidadActualizar = {
  nombre?: string | null
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
  accession_16s?: string | null
  accession_genoma?: string | null
  backbone_chasis?: string | null
  resistencia?: string | null
  concentracion_ng_ul?: number | null
  funcion_uso?: string | null
  organismo?: string | null
  tejido_origen?: string | null
  tipo_cultivo?: string | null
  morfologia?: string | null
  medio_recomendado?: string | null
  ratio_split?: string | null
  micoplasma_estado?: string | null
  micoplasma_fecha?: string | null
  pasaje_maximo_recomendado?: number | null
  referencia_externa?: string | null
  modificacion_genetica?: string | null
}

export type CepStockCrear = {
  // Una fila por vial (un tubo = una celda). La caja es un equipamiento del
  // inventario (`caja_equipamiento_id`): con `nro_viales` el backend autoasigna las
  // próximas celdas libres; `posiciones` las fija a mano (dispersión).
  nro_viales?: number | null
  caja_equipamiento_id?: number | null
  posiciones?: string[] | null
  ubicacion_freezer?: string | null
  ubicacion_caja?: string | null
  ubicacion_posicion?: string | null
  temperatura?: string | null
  crioprotectante?: string | null
  viabilidad?: CeparioViabilidad
  medio_repique?: string | null
  ultimo_control?: string | null
  // Líneas celulares: nº de pasaje del vial y vial de origen (genealogía de pasaje).
  pasaje?: number | null
  origen_stock_id?: number | null
}

export type CepVialCreado = {
  stock_id: number
  codigo_interno: string
  ubicacion_posicion: string | null
  pasaje?: number | null
}

// Genealogía de pasaje (vial→vial) de una línea celular.
export type CepGenealogiaNodo = {
  stock_id: number
  codigo_interno: string
  pasaje: number | null
  origen_stock_id: number | null
  activo: number | boolean
}
export type CepGenealogiaPasaje = {
  entidad_id: number
  nodos: CepGenealogiaNodo[]
}

export type CepStockCrearResultado = {
  viales: CepVialCreado[]
  creados: number
}

export type CepCaja = {
  id: number
  nombre: string
  ocupadas: number
  capacidad: number
}

export type CepCeldaOcupada = {
  posicion: string
  stock_id: number
  codigo_interno: string
  viabilidad: CeparioViabilidad | null
  entidad_id: number
  entidad_codigo: string | null
  entidad_codigo_temporal: string | null
  entidad_nombre: string | null
  entidad_tipo: CeparioTipo
}

export type CepMapaCaja = {
  caja_equipamiento_id: number
  nombre: string
  filas: string[]
  columnas: number
  capacidad: number
  ocupadas: CepCeldaOcupada[]
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

export type CepBacdiveTipoBusqueda = "taxon" | "culture_collection" | "bacdive_id" | "sequence_16s" | "sequence_genome"

export type CepBacdiveResumen = {
  bacdive_id: string
  titulo?: string | null
  descripcion?: string | null
  doi?: string | null
  taxonomia?: Record<string, unknown>
  morfologia?: Record<string, unknown>
  enzimas?: Record<string, unknown>
  metabolismo?: Record<string, unknown>
  crecimiento?: Record<string, unknown>
  aislamiento?: Record<string, unknown>
  seguridad?: Record<string, unknown>
  colecciones?: string[]
  url?: string | null
  [key: string]: unknown
}

export type CepBacdiveCandidate = {
  fuente: "bacdive"
  external_id: string
  titulo?: string | null
  descripcion?: string | null
  taxonomia?: Record<string, unknown>
  morfologia?: Record<string, unknown>
  enzimas?: Record<string, unknown>
  metabolismo?: Record<string, unknown>
  crecimiento?: Record<string, unknown>
  aislamiento?: Record<string, unknown>
  seguridad?: Record<string, unknown>
  colecciones?: string[]
  url?: string | null
  query_usada?: string | null
  payload_resumen: CepBacdiveResumen
  payload_raw?: Record<string, unknown> | null
}

export type CepBacdiveSearchResponse = {
  query_usada: string
  count: number
  candidatos: CepBacdiveCandidate[]
}

export type CepReferenciaExterna = {
  id: number
  organizacion_id: number
  entidad_id: number
  fuente: "bacdive" | string
  external_id: string
  query_usada?: string | null
  match_estado: "confirmado" | "sugerido" | "descartado"
  payload_resumen: CepBacdiveResumen
  payload_raw?: Record<string, unknown> | null
  fecha_consulta: string
  usuario_id?: number | null
  usuario_nombre?: string | null
}

export type CepBacdivePatchItem = {
  id: string
  grupo: "entidad" | "caracterizacion"
  campo: string
  etiqueta: string
  valor_local?: string | number | null
  valor_bacdive?: string | number | null
  estado: "sin_dato_bacdive" | "igual" | "vacio_local" | "diferente" | string
  aplicable: boolean
}

export type CepBacdivePatch = {
  referencia_id: number
  external_id: string
  fuente: "bacdive"
  items: CepBacdivePatchItem[]
  aplicables: string[]
  preseleccionados?: string[]
}

export type CepBacdivePatchAplicado = {
  referencia_id: number
  external_id: string
  aplicados: Array<{ grupo: string; campo: string; valor: string | number | null }>
  caracterizacion_id?: number | null
  parche: CepBacdivePatch
}

export type CepBacdiveRefreshResponse = {
  referencia: CepReferenciaExterna
  diff: {
    agregados: string[]
    cambiados: string[]
    removidos: string[]
    total_agregados: number
    total_cambiados: number
    total_removidos: number
    truncado: boolean
  }
  sin_cambios: boolean
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

// ── Command Center (dashboard interno de founders) ──────────────────────────
// Estado singleton (ajustes) + leads del CRM. Espeja el contrato de datos del
// export standalone (public/command-center/Dashboard.html). Todos los bloques
// llegan parciales: el backend guarda solo lo editado, los defaults viven en el
// front (command-center/data.ts).
export interface CommandCenterFunnel {
  contactos: number
  entrevistas: number
  demos: number
  pilotos: number
  cliente: number
}

export interface CommandCenterFin {
  price: { starter: number; pro: number; ent: number }
  clients: {
    acad: { starter: number; pro: number; ent: number }
    biotech: { starter: number; pro: number; ent: number }
    ind: { starter: number; pro: number; ent: number }
  }
  varCost: number
  feePct: number
  fixed: number
  hoursToClose: number
  hourValue: number
  lifetime: number
  pilots: number
  pilotPrice: number
  cash: number
}

export interface CommandCenterLead {
  id: number
  nombre: string
  empresa: string
  cargo: string
  pais: string
  email: string
  wa: string
  li: string
  pri: string
  est: string
  fecha: string
  paso: string
  notas: string
}

export type CommandCenterLeadCampos = Omit<CommandCenterLead, "id">

export interface CommandCenterEstado {
  funnel: Partial<CommandCenterFunnel>
  panel: Record<string, string>
  fin: Partial<CommandCenterFin>
  okr: { target?: number }
  weekly: Record<string, boolean>
  dark: boolean
  crm: CommandCenterLead[]
}

export type CommandCenterEstadoPatch = Partial<
  Pick<CommandCenterEstado, "funnel" | "panel" | "fin" | "okr" | "weekly" | "dark">
>

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

  comprasSugerencias: async (token: string, dias = 30, limite = 10) =>
    request<DashboardReposicion>(`/compras/sugerencias?dias=${dias}&limite=${limite}`, { token }),

  comprasTareasPendientes: async (token: string, dias = 30) =>
    request<TareasPendientesCompraResponse>(`/compras/tareas-pendientes?dias=${dias}`, { token }),

  comprasSolicitudes: async (
    token: string,
    filtros: {
      estado?: string
      prioridad?: string
      proveedor_id?: number | null
      reactivo_id?: number | null
      solicitado_por?: number | null
      aprobado_por?: number | null
      desde?: string
      hasta?: string
      fecha_necesaria_desde?: string
      fecha_necesaria_hasta?: string
      q?: string
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
    return request<CompraSolicitud[]>(`/compras/solicitudes${query ? `?${query}` : ""}`, { token })
  },

  crearCompraSolicitud: async (token: string, data: CompraSolicitudCrear) =>
    request<CompraSolicitud>("/compras/solicitudes", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  construirCompraSolicitud: async (token: string, texto: string) =>
    request<CompraConstructorRespuesta>("/compras/constructor", {
      method: "POST",
      token,
      body: JSON.stringify({ texto }),
    }),

  compraSolicitud: async (token: string, id: number) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}`, { token }),

  actualizarCompraSolicitud: async (token: string, id: number, data: CompraSolicitudActualizar) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  enviarCompraSolicitudAprobacion: async (token: string, id: number, comentario?: string | null) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}/enviar-aprobacion`, {
      method: "POST",
      token,
      body: comentario ? JSON.stringify({ comentario }) : undefined,
    }),

  aprobarCompraSolicitud: async (token: string, id: number, comentario?: string | null) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}/aprobar`, {
      method: "POST",
      token,
      body: comentario ? JSON.stringify({ comentario }) : undefined,
    }),

  rechazarCompraSolicitud: async (token: string, id: number, motivo: string) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}/rechazar`, {
      method: "POST",
      token,
      body: JSON.stringify({ motivo }),
    }),

  solicitarCambiosCompraSolicitud: async (token: string, id: number, motivo: string) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}/solicitar-cambios`, {
      method: "POST",
      token,
      body: JSON.stringify({ motivo }),
    }),

  cancelarCompraSolicitud: async (token: string, id: number, motivo?: string | null) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}/cancelar`, {
      method: "POST",
      token,
      body: motivo ? JSON.stringify({ motivo }) : undefined,
    }),

  marcarCompraPedido: async (token: string, id: number, comentario?: string | null, fechaPedido?: string | null) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}/marcar-pedido`, {
      method: "POST",
      token,
      body: JSON.stringify({ comentario: comentario || null, fecha_pedido: fechaPedido || null }),
    }),

  marcarCompraEnCamino: async (token: string, id: number, comentario?: string | null, fechaPedido?: string | null) =>
    request<CompraSolicitud>(`/compras/solicitudes/${id}/marcar-en-camino`, {
      method: "POST",
      token,
      body: JSON.stringify({ comentario: comentario || null, fecha_pedido: fechaPedido || null }),
    }),

  compraSolicitudEventos: async (token: string, id: number) =>
    request<CompraEvento[]>(`/compras/solicitudes/${id}/eventos`, { token }),

  crearCompraComunicacion: async (token: string, solicitudId: number, data: CompraComunicacionCrear = {}) =>
    request<CompraComunicacion>(`/compras/solicitudes/${solicitudId}/comunicaciones`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  actualizarCompraComunicacion: async (token: string, comunicacionId: number, contenidoEditado: string) =>
    request<CompraComunicacion>(`/compras/comunicaciones/${comunicacionId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ contenido_editado: contenidoEditado }),
    }),

  reescribirCompraComunicacionIA: async (
    token: string,
    comunicacionId: number,
    data: CompraComunicacionReescribirIA,
  ) =>
    request<CompraComunicacion>(`/compras/comunicaciones/${comunicacionId}/reescribir-ia`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  marcarCompraComunicacionCopiada: async (token: string, comunicacionId: number) =>
    request<CompraComunicacion>(`/compras/comunicaciones/${comunicacionId}/marcar-copiado`, {
      method: "POST",
      token,
    }),

  compraComunicacionVersiones: async (token: string, comunicacionId: number) =>
    request<CompraComunicacionVersion[]>(`/compras/comunicaciones/${comunicacionId}/versiones`, { token }),

  descargarCompraComunicacion: async (token: string, comunicacionId: number) =>
    requestBlob(`/compras/comunicaciones/${comunicacionId}/descargar`, { token }),

  registrarCompraRecepcion: async (token: string, itemId: number, data: CompraRecepcionCrear) =>
    request<CompraRecepcionResponse>(`/compras/items/${itemId}/recepciones`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  revalidarCompraSolicitud: async (token: string, id: number) =>
    request<CompraRevalidacion>(`/compras/solicitudes/${id}/revalidar`, {
      method: "POST",
      token,
    }),

  crearTareaReposicion: async (token: string, reactivoId: number, dias = 30, asignadoA?: number | null) =>
    request<ReposicionTareaResponse>("/dashboard/reposicion/tarea", {
      method: "POST",
      token,
      body: JSON.stringify({ reactivo_id: reactivoId, dias, asignado_a: asignadoA ?? null }),
    }),

  reposicionSilenciados: async (token: string) =>
    request<ReposicionSilenciado[]>("/reposicion/silenciados", { token }),

  silenciarReposicion: async (token: string, reactivoId: number, motivo?: string | null) =>
    request<ReposicionSilenciado>("/reposicion/silenciar", {
      method: "POST",
      token,
      body: JSON.stringify({ reactivo_id: reactivoId, motivo: motivo ?? null }),
    }),

  reactivarReposicion: async (token: string, reactivoId: number) =>
    request<{ reactivo_id: number; reactivados: number }>(`/reposicion/silenciar/${reactivoId}/reactivar`, {
      method: "POST",
      token,
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

  actualizarProveedor: async (token: string, id: number, data: ProveedorActualizar) =>
    request<{ id: number; mensaje: string }>(`/proveedores/${id}`, {
      method: "PATCH",
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

  actualizarContactoProveedor: async (token: string, contactoId: number, data: ContactoActualizar) =>
    request<{ mensaje: string }>(`/proveedores/contactos/${contactoId}`, {
      method: "PATCH",
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

  equipamientoUnidades: async (token: string, id: number) =>
    request<EquipamientoUnidad[]>(`/equipamiento/${id}/unidades`, { token }),

  equipamientoUnidadPorCodigo: async (token: string, codigoInterno: string) =>
    request<EquipamientoUnidad>(`/equipamiento/unidades/codigo/${encodeURIComponent(codigoInterno)}`, { token }),

  equipamientoEtiquetasPdf: async (
    token: string,
    unidadIds: number[],
    formato = "rollo_50x30",
    posicionInicio = 1,
  ) =>
    requestBlob("/equipamiento/unidades/etiquetas-pdf", {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unidad_ids: unidadIds, formato, posicion_inicio: posicionInicio }),
    }),

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

  ceparioGenealogiaPasaje: async (token: string, entidadId: number) =>
    request<CepGenealogiaPasaje>(`/cepario/entidades/${entidadId}/genealogia-pasaje`, { token }),

  ceparioBacdiveBuscar: async (
    token: string,
    q: string,
    tipo: CepBacdiveTipoBusqueda = "taxon",
    limite = 10,
  ) => {
    const params = new URLSearchParams({ q, tipo, limite: String(limite) })
    return request<CepBacdiveSearchResponse>(`/cepario/bacdive/buscar?${params.toString()}`, { token })
  },

  ceparioBacdiveFetch: async (token: string, externalId: string) =>
    request<CepBacdiveCandidate>(`/cepario/bacdive/fetch/${encodeURIComponent(externalId)}`, { token }),

  ceparioReferenciasExternas: async (token: string, entidadId: number) =>
    request<CepReferenciaExterna[]>(`/cepario/entidades/${entidadId}/referencias-externas`, { token }),

  ceparioGuardarReferenciaExterna: async (token: string, entidadId: number, data: {
    fuente?: "bacdive"
    external_id: string
    query_usada?: string | null
    match_estado?: "confirmado" | "sugerido" | "descartado"
    payload_resumen?: CepBacdiveResumen | null
    payload_raw?: Record<string, unknown> | null
  }) =>
    request<CepReferenciaExterna>(`/cepario/entidades/${entidadId}/referencias-externas`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  ceparioDescartarReferenciaExterna: async (token: string, entidadId: number, referenciaId: number) =>
    request<CepReferenciaExterna>(`/cepario/entidades/${entidadId}/referencias-externas/${referenciaId}`, {
      method: "DELETE",
      token,
    }),

  ceparioActualizarReferenciaExterna: async (token: string, entidadId: number, referenciaId: number) =>
    request<CepBacdiveRefreshResponse>(`/cepario/entidades/${entidadId}/referencias-externas/${referenciaId}/refresh`, {
      method: "POST",
      token,
    }),

  ceparioBacdiveParche: async (token: string, entidadId: number, referenciaId: number) =>
    request<CepBacdivePatch>(`/cepario/entidades/${entidadId}/referencias-externas/${referenciaId}/parche`, { token }),

  ceparioBacdiveAplicarParche: async (token: string, entidadId: number, referenciaId: number, campos: string[]) =>
    request<CepBacdivePatchAplicado>(`/cepario/entidades/${entidadId}/referencias-externas/${referenciaId}/parche`, {
      method: "POST",
      token,
      body: JSON.stringify({ campos }),
    }),

  crearEntidadCepario: async (token: string, data: CepEntidadCrear) =>
    request<{ id: number; codigo: string | null; codigo_temporal: string | null; tipo: string; estado: string }>(
      "/cepario/entidades",
      { method: "POST", token, body: JSON.stringify(data) },
    ),

  actualizarEntidadCepario: async (token: string, entidadId: number, data: CepEntidadActualizar) =>
    request<{ id: number; actualizado: number; cambios: string[] }>(`/cepario/entidades/${entidadId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  ceparioStock: async (token: string, entidadId: number) =>
    request<CeparioVial[]>(`/cepario/entidades/${entidadId}/stock`, { token }),

  crearStockCepario: async (token: string, entidadId: number, data: CepStockCrear) =>
    request<CepStockCrearResultado>(`/cepario/entidades/${entidadId}/stock`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Sugiere las próximas celdas libres de una caja (del inventario), para prellenar el alta.
  celdasLibresCepario: async (token: string, cajaEquipamientoId: number, cantidad: number) => {
    const params = new URLSearchParams({
      caja_equipamiento_id: String(cajaEquipamientoId),
      cantidad: String(cantidad),
    })
    return request<{ celdas: string[] }>(`/cepario/celdas-libres?${params.toString()}`, { token })
  },

  // Mapa visual de cajas (ocupación en tiempo real).
  ceparioCajas: async (token: string) =>
    request<{ cajas: CepCaja[] }>("/cepario/cajas", { token }),

  ceparioMapaCaja: async (token: string, cajaEquipamientoId: number) =>
    request<CepMapaCaja>(`/cepario/cajas/${cajaEquipamientoId}/mapa`, { token }),

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

  // ── Command Center ──
  commandCenter: async (token: string) =>
    request<CommandCenterEstado>("/command-center", { token }),

  commandCenterGuardarEstado: async (token: string, data: CommandCenterEstadoPatch) =>
    request<unknown>("/command-center/estado", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  commandCenterCrearLead: async (token: string, data: Partial<CommandCenterLeadCampos>) =>
    request<CommandCenterLead>("/command-center/leads", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  commandCenterActualizarLead: async (token: string, id: number, data: Partial<CommandCenterLeadCampos>) =>
    request<{ id: number; mensaje: string }>(`/command-center/leads/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  commandCenterEliminarLead: async (token: string, id: number) =>
    request<{ mensaje: string }>(`/command-center/leads/${id}`, {
      method: "DELETE",
      token,
    }),

  commandCenterResetLeads: async (token: string) =>
    request<{ crm: CommandCenterLead[] }>("/command-center/leads/reset", {
      method: "POST",
      token,
      body: JSON.stringify({}),
    }),
}
