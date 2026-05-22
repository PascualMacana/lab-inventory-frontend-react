import type { Usuario } from "./api"

const permisosJefe = new Set([
  "ver_pagina_dashboard",
  "ver_pagina_reactivos",
  "ver_pagina_lotes",
  "ver_pagina_consumo",
  "ver_pagina_mesada",
  "ver_pagina_protocolos",
  "ver_pagina_tareas",
  "ver_pagina_usuarios",
  "ver_pagina_movimientos",
  "ver_pagina_proveedores",
  "ver_pagina_equipamiento",
  "ver_pagina_asistente",
  "ver_pagina_auditoria",
  "gestionar_protocolos",
  "ver_tareas_equipo",
  "crear_tarea",
  "gestionar_tareas",
  "ver_valor_inventario",
  "crear_cientifico",
  "desactivar_cientifico",
  "editar_cientifico",
  "crear_proveedor",
  "editar_proveedor",
  "crear_equipamiento",
  "registrar_evento_equipamiento",
  "crear_reactivo",
  "editar_reactivo",
  "crear_lote",
  "imprimir_hoja_avery",
])

const permisosCientifico = new Set([
  "ver_pagina_reactivos",
  "ver_pagina_lotes",
  "ver_pagina_consumo",
  "ver_pagina_mesada",
  "ver_pagina_protocolos",
  "ver_pagina_tareas",
  "ver_pagina_usuarios",
  "ver_pagina_equipamiento",
  "ver_pagina_asistente",
])

const accionModulo: Record<string, string> = {
  ver_pagina_dashboard: "dashboard",
  ver_valor_inventario: "dashboard",
  ver_pagina_reactivos: "reactivos",
  crear_reactivo: "reactivos",
  editar_reactivo: "reactivos",
  eliminar_reactivo: "reactivos",
  ver_pagina_lotes: "lotes",
  resolver_lote_por_codigo: "lotes",
  crear_lote: "lotes",
  reimprimir_qr_lote: "lotes",
  imprimir_hoja_avery: "lotes",
  ver_pagina_consumo: "consumo",
  ver_pagina_mesada: "consumo",
  crear_consumo: "consumo",
  ver_consumos_todos: "consumo",
  editar_consumo_ajeno: "consumo",
  ver_pagina_protocolos: "protocolos",
  usar_protocolos: "protocolos",
  gestionar_protocolos: "protocolos",
  ver_pagina_tareas: "tareas",
  ver_tareas_equipo: "tareas",
  crear_tarea: "tareas",
  gestionar_tareas: "tareas",
  actualizar_tarea_propia: "tareas",
  ver_pagina_movimientos: "movimientos",
  ver_movimientos_todos: "movimientos",
  ver_pagina_usuarios: "usuarios",
  ver_usuarios_completo: "usuarios",
  crear_cientifico: "usuarios",
  editar_cientifico: "usuarios",
  desactivar_cientifico: "usuarios",
  ver_pagina_proveedores: "proveedores",
  crear_proveedor: "proveedores",
  editar_proveedor: "proveedores",
  ver_pagina_equipamiento: "equipamiento",
  crear_equipamiento: "equipamiento",
  baja_equipamiento: "equipamiento",
  registrar_evento_equipamiento: "equipamiento",
  ver_pagina_asistente: "asistente",
  usar_asistente: "asistente",
  ver_pagina_auditoria: "auditoria",
  consultar_auditoria: "auditoria",
}

function moduloHabilitado(usuario: Usuario, accion: string) {
  const modulo = accionModulo[accion]
  if (!modulo) {
    return true
  }
  if (!usuario.modulos_habilitados) {
    return true
  }
  return usuario.modulos_habilitados.includes(modulo)
}

export function puede(usuario: Usuario | null, accion: string) {
  if (!usuario) {
    return false
  }
  if (accion === "ver_pagina_owner") {
    return Boolean(usuario.owner_global)
  }
  if (!moduloHabilitado(usuario, accion)) {
    return false
  }
  if (usuario.rol === "admin") {
    return true
  }
  if (usuario.rol === "jefe") {
    return permisosJefe.has(accion)
  }
  if (usuario.rol === "cientifico") {
    return permisosCientifico.has(accion)
  }
  return false
}
