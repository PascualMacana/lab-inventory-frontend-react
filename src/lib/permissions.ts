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
  "ver_pagina_analitica",
  "gestionar_protocolos",
  "ver_valor_inventario",
  "crear_cientifico",
  "desactivar_cientifico",
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
  "ver_pagina_analitica",
])

export function puede(usuario: Usuario | null, accion: string) {
  if (!usuario) {
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
