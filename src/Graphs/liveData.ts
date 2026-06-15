import type { Movimiento, Reactivo } from "../lib/api"

// Real-data aggregations for the operational analytics tab. Pure functions over
// the reactivos catalog and the movements window, kept apart from the chart
// components so they stay testable and the rendering layer only formats.
//
// Multi-unit rule: cantidad cannot be summed across reactivos with different
// units (ml/mg/g). So cross-reactivo ("total") aggregations COUNT events, and
// only single-reactivo aggregations sum cantidad in its native unit.

export type LiveScope = "total" | number

function mesKey(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function mesLabel(key: string) {
  const [year, month] = key.split("-").map(Number)
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1))
}

function mesesOrdenados(movimientos: Movimiento[]) {
  const keys = new Set<string>()
  for (const movimiento of movimientos) {
    const key = mesKey(movimiento.fecha)
    if (key) {
      keys.add(key)
    }
  }
  return [...keys].sort()
}

// --- Stock vs mínimo: cobertura % por reactivo -------------------------------
// stock/mínimo×100 normaliza las unidades, así un eje compartido es honesto.

export type CoberturaRow = { label: string; cobertura: number; bajo: boolean }

export function coberturaRows(reactivos: Reactivo[], scope: LiveScope, limite = 12): CoberturaRow[] {
  const fuente = scope === "total" ? reactivos : reactivos.filter((reactivo) => reactivo.id === scope)
  const rows = fuente
    .filter((reactivo) => reactivo.stock_minimo > 0) // sin mínimo no hay "vs mínimo" que mostrar
    .map((reactivo) => ({
      label: reactivo.nombre,
      cobertura: Math.round((reactivo.stock_total / reactivo.stock_minimo) * 100),
      bajo: reactivo.stock_total < reactivo.stock_minimo,
    }))
    .sort((a, b) => a.cobertura - b.cobertura) // los más al límite primero
  return scope === "total" ? rows.slice(0, limite) : rows
}

// Gauge: en total la mediana de cobertura (robusta a sobre-stock puntual),
// en un reactivo su propia cobertura. Escala 0–160 con el mínimo en 100.
export function coberturaGauge(reactivos: Reactivo[], scope: LiveScope): number {
  const fuente = (scope === "total" ? reactivos : reactivos.filter((reactivo) => reactivo.id === scope)).filter(
    (reactivo) => reactivo.stock_minimo > 0,
  )
  if (!fuente.length) {
    return 0
  }
  const ratios = fuente.map((reactivo) => (reactivo.stock_total / reactivo.stock_minimo) * 100).sort((a, b) => a - b)
  if (scope !== "total") {
    return Math.min(160, Math.round(ratios[0]))
  }
  const mid = Math.floor(ratios.length / 2)
  const mediana = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2
  return Math.min(160, Math.round(mediana))
}

// --- Top consumo / Pareto ----------------------------------------------------
// total: salidas por reactivo (conteo de eventos, unit-safe).
// un reactivo: cantidad consumida por usuario (suma en unidad nativa, unit-safe).

export type RankRow = { label: string; value: number }

function consumoRanking(movimientos: Movimiento[], scope: LiveScope): RankRow[] {
  const salidas = movimientos.filter((movimiento) => movimiento.tipo === "salida")
  const bucket = new Map<string, number>()
  if (scope === "total") {
    for (const movimiento of salidas) {
      bucket.set(movimiento.reactivo_nombre, (bucket.get(movimiento.reactivo_nombre) ?? 0) + 1)
    }
  } else {
    for (const movimiento of salidas) {
      if (movimiento.reactivo_id !== scope) {
        continue
      }
      bucket.set(movimiento.usuario_nombre, (bucket.get(movimiento.usuario_nombre) ?? 0) + movimiento.cantidad)
    }
  }
  return [...bucket.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

export function topConsumoRows(movimientos: Movimiento[], scope: LiveScope, limite = 10): RankRow[] {
  return consumoRanking(movimientos, scope).slice(0, limite)
}

export type ParetoRow = { label: string; value: number; acumulado: number }

export function paretoRows(movimientos: Movimiento[], scope: LiveScope, limite = 12): ParetoRow[] {
  const rows = consumoRanking(movimientos, scope)
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1
  let acumulado = 0
  return rows
    .map((row) => {
      acumulado += row.value
      return { label: row.label, value: row.value, acumulado: Math.round((acumulado / total) * 100) }
    })
    .slice(0, limite)
}

// --- Consumo mensual (apilado) ----------------------------------------------
// total: salidas por mes apiladas por categoría (conteo de eventos).
// un reactivo: entrada/salida/ajuste por mes (suma en unidad nativa).

export type StackedResult = { categorias: string[]; keys: string[]; rows: Array<Record<string, number | string>> }

export function consumoMensual(movimientos: Movimiento[], reactivos: Reactivo[], scope: LiveScope): StackedResult {
  const meses = mesesOrdenados(movimientos)
  const categorias = meses.map(mesLabel)

  if (scope === "total") {
    const catPorId = new Map(reactivos.map((reactivo) => [reactivo.id, reactivo.categoria?.trim() || "Sin categoría"]))
    const keys = [...new Set(reactivos.map((reactivo) => reactivo.categoria?.trim() || "Sin categoría"))]
    const salidas = movimientos.filter((movimiento) => movimiento.tipo === "salida")
    const rows = meses.map((mk) => {
      const row: Record<string, number | string> = { mes: mesLabel(mk) }
      for (const key of keys) {
        row[key] = 0
      }
      for (const movimiento of salidas) {
        if (mesKey(movimiento.fecha) !== mk) {
          continue
        }
        const categoria = catPorId.get(movimiento.reactivo_id) ?? "Sin categoría"
        row[categoria] = (row[categoria] as number) + 1
      }
      return row
    })
    // Dejar solo las categorías con algún movimiento, para no ensuciar la leyenda.
    const keysActivas = keys.filter((key) => rows.some((row) => (row[key] as number) > 0))
    return { categorias, keys: keysActivas, rows }
  }

  const keys = ["Entradas", "Consumos", "Ajustes"]
  const rows = meses.map((mk) => {
    const row: Record<string, number | string> = { mes: mesLabel(mk), Entradas: 0, Consumos: 0, Ajustes: 0 }
    for (const movimiento of movimientos) {
      if (movimiento.reactivo_id !== scope || mesKey(movimiento.fecha) !== mk) {
        continue
      }
      if (movimiento.tipo === "entrada") {
        row.Entradas = (row.Entradas as number) + movimiento.cantidad
      } else if (movimiento.tipo === "salida") {
        row.Consumos = (row.Consumos as number) + movimiento.cantidad
      } else {
        row.Ajustes = (row.Ajustes as number) + Math.abs(movimiento.cantidad)
      }
    }
    return row
  })
  return { categorias, keys, rows }
}

// === Avanzado ================================================================

// Consumo diario promedio por reactivo (suma de salidas en la ventana / días),
// en unidad nativa → unit-safe por reactivo.
function avgDiarioPorReactivo(movimientos: Movimiento[], dias: number): Map<number, number> {
  const suma = new Map<number, number>()
  for (const movimiento of movimientos) {
    if (movimiento.tipo !== "salida") {
      continue
    }
    suma.set(movimiento.reactivo_id, (suma.get(movimiento.reactivo_id) ?? 0) + movimiento.cantidad)
  }
  const avg = new Map<number, number>()
  for (const [id, total] of suma) {
    avg.set(id, total / dias)
  }
  return avg
}

function salidasPorReactivo(movimientos: Movimiento[]): Map<number, number> {
  const conteo = new Map<number, number>()
  for (const movimiento of movimientos) {
    if (movimiento.tipo !== "salida") {
      continue
    }
    conteo.set(movimiento.reactivo_id, (conteo.get(movimiento.reactivo_id) ?? 0) + 1)
  }
  return conteo
}

function topReactivoIds(movimientos: Movimiento[], limite: number): number[] {
  return [...salidasPorReactivo(movimientos).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([id]) => id)
}

// --- Forecast agotamiento ----------------------------------------------------
// Solo single: la línea de agotamiento del reactivo (stock cae al ritmo de
// consumo). En inventario total no reconcilia entre unidades → la página
// muestra un prompt para elegir reactivo.

export type ForecastLinea = { dias: number[]; stock: number[]; minimo: number; sinConsumo: boolean }

export function forecastAgotamiento(
  reactivos: Reactivo[],
  movimientos: Movimiento[],
  ventanaDias: number,
  reactivoId: number,
): ForecastLinea | null {
  const reactivo = reactivos.find((item) => item.id === reactivoId)
  if (!reactivo) {
    return null
  }
  const ritmo = avgDiarioPorReactivo(movimientos, ventanaDias).get(reactivo.id) ?? 0
  if (ritmo <= 0) {
    return { dias: [0], stock: [reactivo.stock_total], minimo: reactivo.stock_minimo, sinConsumo: true }
  }
  const horizonte = Math.ceil(reactivo.stock_total / ritmo)
  const paso = Math.max(1, Math.round(horizonte / 24))
  const dias: number[] = []
  const stock: number[] = []
  for (let dia = 0; dia <= horizonte; dia += paso) {
    dias.push(dia)
    stock.push(Math.max(0, reactivo.stock_total - ritmo * dia))
  }
  if (dias[dias.length - 1] !== horizonte) {
    dias.push(horizonte)
    stock.push(0)
  }
  return { dias, stock, minimo: reactivo.stock_minimo, sinConsumo: false }
}

// --- Scatter criticidad ------------------------------------------------------
// x = # salidas (actividad, conteo), y = cobertura % (holgura). Cuadrante
// crítico: mucha salida + poca cobertura. Ambos ejes unit-safe.

export type CriticidadPunto = { nombre: string; salidas: number; cobertura: number; bajo: boolean }

export function criticidadRows(reactivos: Reactivo[], movimientos: Movimiento[], scope: LiveScope): CriticidadPunto[] {
  const salidas = salidasPorReactivo(movimientos)
  const fuente = scope === "total" ? reactivos : reactivos.filter((reactivo) => reactivo.id === scope)
  return fuente
    .filter((reactivo) => reactivo.stock_minimo > 0)
    .map((reactivo) => ({
      nombre: reactivo.nombre,
      salidas: salidas.get(reactivo.id) ?? 0,
      cobertura: Math.round((reactivo.stock_total / reactivo.stock_minimo) * 100),
      bajo: reactivo.stock_total < reactivo.stock_minimo,
    }))
}

// --- Distribución de consumo (boxplot) ---------------------------------------
// total: una caja por reactivo con # de salidas por mes (conteo, comparable).
// single: caja de los tamaños de cada salida en unidad nativa.

export type DistribucionCaja = { nombre: string; valores: number[] }

export function distribucionRows(movimientos: Movimiento[], reactivos: Reactivo[], scope: LiveScope, limite = 8): DistribucionCaja[] {
  const meses = mesesOrdenados(movimientos)

  if (scope === "total") {
    const ids = topReactivoIds(movimientos, limite)
    const nombrePorId = new Map(reactivos.map((reactivo) => [reactivo.id, reactivo.nombre]))
    return ids.map((id) => ({
      nombre: nombrePorId.get(id) ?? String(id),
      valores: meses.map(
        (mk) => movimientos.filter((m) => m.tipo === "salida" && m.reactivo_id === id && mesKey(m.fecha) === mk).length,
      ),
    }))
  }

  const reactivo = reactivos.find((item) => item.id === scope)
  return [
    {
      nombre: reactivo?.nombre ?? "Reactivo",
      valores: movimientos.filter((m) => m.tipo === "salida" && m.reactivo_id === scope).map((m) => m.cantidad),
    },
  ]
}

// --- Heatmap -----------------------------------------------------------------
// total: reactivo × mes (# salidas). single: usuario × mes (# salidas del
// reactivo). z por conteo → unit-safe.

export type HeatmapData = { x: string[]; y: string[]; z: number[][] }

export function heatmapData(movimientos: Movimiento[], reactivos: Reactivo[], scope: LiveScope, limite = 10): HeatmapData {
  const meses = mesesOrdenados(movimientos)
  const x = meses.map(mesLabel)

  if (scope === "total") {
    const ids = topReactivoIds(movimientos, limite)
    const nombrePorId = new Map(reactivos.map((reactivo) => [reactivo.id, reactivo.nombre]))
    const y = ids.map((id) => nombrePorId.get(id) ?? String(id))
    const z = ids.map((id) =>
      meses.map((mk) => movimientos.filter((m) => m.tipo === "salida" && m.reactivo_id === id && mesKey(m.fecha) === mk).length),
    )
    return { x, y, z }
  }

  const mine = movimientos.filter((m) => m.tipo === "salida" && m.reactivo_id === scope)
  const usuarios = [...new Set(mine.map((m) => m.usuario_nombre))]
  const z = usuarios.map((usuario) => meses.map((mk) => mine.filter((m) => m.usuario_nombre === usuario && mesKey(m.fecha) === mk).length))
  return { x, y: usuarios, z }
}

// --- Waterfall stock (solo single: reconcilia en unidad nativa) --------------

export type WaterfallData = { labels: string[]; valores: number[]; measures: Array<"absolute" | "relative" | "total"> }

export function waterfallReactivo(reactivos: Reactivo[], movimientos: Movimiento[], reactivoId: number): WaterfallData | null {
  const reactivo = reactivos.find((item) => item.id === reactivoId)
  if (!reactivo) {
    return null
  }
  let entradas = 0
  let consumos = 0
  let ajustes = 0
  for (const movimiento of movimientos) {
    if (movimiento.reactivo_id !== reactivoId) {
      continue
    }
    if (movimiento.tipo === "entrada") {
      entradas += movimiento.cantidad
    } else if (movimiento.tipo === "salida") {
      consumos += movimiento.cantidad
    } else {
      ajustes += movimiento.cantidad // firmado
    }
  }
  const stockFinal = reactivo.stock_total
  // Stock inicial se reconstruye hacia atrás para que el waterfall cierre en el
  // stock real actual (inicial + entradas − consumos ± ajustes = final).
  const stockInicial = stockFinal - entradas + consumos - ajustes
  return {
    labels: ["Stock inicial", "Entradas", "Consumos", "Ajustes", "Stock final"],
    valores: [stockInicial, entradas, -consumos, ajustes, stockFinal],
    measures: ["absolute", "relative", "relative", "relative", "total"],
  }
}
