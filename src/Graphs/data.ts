export type MonthKey = "Ene" | "Feb" | "Mar" | "Abr" | "May" | "Jun" | "Jul" | "Ago"

export type ReagentAnalytics = {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stockActual: number
  stockMinimo: number
  valorInventario: number
  lotesActivos: number
  vencenPronto: number
  meses: Array<{
    mes: MonthKey
    entradas: number
    consumos: number
    ajustes: number
  }>
}

export type ChartScope = "total" | string

export const reactivosAnalytics: ReagentAnalytics[] = [
  {
    id: "etanol",
    nombre: "Etanol absoluto",
    categoria: "Solventes",
    unidad: "ml",
    stockActual: 12800,
    stockMinimo: 6000,
    valorInventario: 184500,
    lotesActivos: 5,
    vencenPronto: 1,
    meses: [
      { mes: "Ene", entradas: 5000, consumos: 2200, ajustes: 0 },
      { mes: "Feb", entradas: 0, consumos: 2600, ajustes: -200 },
      { mes: "Mar", entradas: 7000, consumos: 3100, ajustes: 0 },
      { mes: "Abr", entradas: 0, consumos: 2800, ajustes: 150 },
      { mes: "May", entradas: 6000, consumos: 3400, ajustes: 0 },
      { mes: "Jun", entradas: 0, consumos: 2900, ajustes: 0 },
      { mes: "Jul", entradas: 5000, consumos: 3200, ajustes: -100 },
      { mes: "Ago", entradas: 0, consumos: 3500, ajustes: 0 },
    ],
  },
  {
    id: "pbs",
    nombre: "PBS 1X",
    categoria: "Buffers",
    unidad: "ml",
    stockActual: 4200,
    stockMinimo: 3500,
    valorInventario: 38200,
    lotesActivos: 3,
    vencenPronto: 2,
    meses: [
      { mes: "Ene", entradas: 2400, consumos: 1200, ajustes: 0 },
      { mes: "Feb", entradas: 0, consumos: 1500, ajustes: 0 },
      { mes: "Mar", entradas: 3000, consumos: 1700, ajustes: 0 },
      { mes: "Abr", entradas: 0, consumos: 1550, ajustes: 0 },
      { mes: "May", entradas: 2500, consumos: 1800, ajustes: -80 },
      { mes: "Jun", entradas: 0, consumos: 1650, ajustes: 0 },
      { mes: "Jul", entradas: 2200, consumos: 1900, ajustes: 0 },
      { mes: "Ago", entradas: 0, consumos: 2100, ajustes: 0 },
    ],
  },
  {
    id: "agarosa",
    nombre: "Agarosa",
    categoria: "Biología molecular",
    unidad: "mg",
    stockActual: 980,
    stockMinimo: 700,
    valorInventario: 94500,
    lotesActivos: 2,
    vencenPronto: 0,
    meses: [
      { mes: "Ene", entradas: 500, consumos: 110, ajustes: 0 },
      { mes: "Feb", entradas: 0, consumos: 130, ajustes: 0 },
      { mes: "Mar", entradas: 0, consumos: 160, ajustes: 0 },
      { mes: "Abr", entradas: 500, consumos: 140, ajustes: 0 },
      { mes: "May", entradas: 0, consumos: 170, ajustes: 0 },
      { mes: "Jun", entradas: 0, consumos: 190, ajustes: -20 },
      { mes: "Jul", entradas: 600, consumos: 180, ajustes: 0 },
      { mes: "Ago", entradas: 0, consumos: 210, ajustes: 0 },
    ],
  },
  {
    id: "glucosa",
    nombre: "Glucosa",
    categoria: "Medios y suplementos",
    unidad: "g",
    stockActual: 1350,
    stockMinimo: 900,
    valorInventario: 61200,
    lotesActivos: 4,
    vencenPronto: 1,
    meses: [
      { mes: "Ene", entradas: 800, consumos: 260, ajustes: 0 },
      { mes: "Feb", entradas: 0, consumos: 320, ajustes: 0 },
      { mes: "Mar", entradas: 700, consumos: 380, ajustes: 0 },
      { mes: "Abr", entradas: 0, consumos: 360, ajustes: 0 },
      { mes: "May", entradas: 600, consumos: 420, ajustes: 0 },
      { mes: "Jun", entradas: 0, consumos: 390, ajustes: 0 },
      { mes: "Jul", entradas: 0, consumos: 440, ajustes: -30 },
      { mes: "Ago", entradas: 700, consumos: 470, ajustes: 0 },
    ],
  },
  {
    id: "tripsina",
    nombre: "Tripsina",
    categoria: "Cultivo celular",
    unidad: "ml",
    stockActual: 760,
    stockMinimo: 900,
    valorInventario: 126400,
    lotesActivos: 2,
    vencenPronto: 1,
    meses: [
      { mes: "Ene", entradas: 600, consumos: 180, ajustes: 0 },
      { mes: "Feb", entradas: 0, consumos: 210, ajustes: 0 },
      { mes: "Mar", entradas: 500, consumos: 240, ajustes: 0 },
      { mes: "Abr", entradas: 0, consumos: 260, ajustes: 0 },
      { mes: "May", entradas: 0, consumos: 280, ajustes: 0 },
      { mes: "Jun", entradas: 500, consumos: 300, ajustes: 0 },
      { mes: "Jul", entradas: 0, consumos: 330, ajustes: 0 },
      { mes: "Ago", entradas: 0, consumos: 360, ajustes: -40 },
    ],
  },
]

export const colors = ["#0f62fe", "#24a148", "#ff832b", "#8a3ffc", "#da1e28", "#009d9a"]

export function getScope(scope: ChartScope) {
  return reactivosAnalytics.find((reactivo) => reactivo.id === scope) ?? null
}

export function totalConsumo(reactivo: ReagentAnalytics) {
  return reactivo.meses.reduce((total, mes) => total + mes.consumos, 0)
}

export function monthlyTotals() {
  return reactivosAnalytics[0].meses.map((month, index) => {
    const row: Record<string, string | number> = { mes: month.mes }
    for (const reactivo of reactivosAnalytics) {
      row[reactivo.nombre] = reactivo.meses[index].consumos
    }
    return row
  })
}

export function categoryMonthlyTotals() {
  return reactivosAnalytics[0].meses.map((month, index) => {
    const row: Record<string, string | number> = { mes: month.mes }
    for (const reactivo of reactivosAnalytics) {
      row[reactivo.categoria] = Number(row[reactivo.categoria] ?? 0) + reactivo.meses[index].consumos
    }
    return row
  })
}

export function categories() {
  return Array.from(new Set(reactivosAnalytics.map((reactivo) => reactivo.categoria)))
}

export function scopeLabel(scope: ChartScope) {
  return scope === "total" ? "Inventario total" : getScope(scope)?.nombre ?? "Reactivo"
}

export function gaugeValue(scope: ChartScope) {
  if (scope === "total") {
    const stock = reactivosAnalytics.reduce((total, reactivo) => total + reactivo.stockActual, 0)
    const minimo = reactivosAnalytics.reduce((total, reactivo) => total + reactivo.stockMinimo, 0)
    return Math.min(160, Math.round((stock / minimo) * 100))
  }

  const reactivo = getScope(scope)
  if (!reactivo) {
    return 0
  }
  return Math.min(160, Math.round((reactivo.stockActual / reactivo.stockMinimo) * 100))
}

export function rankedRows(scope: ChartScope) {
  if (scope === "total") {
    return [...reactivosAnalytics]
      .map((reactivo) => ({ label: reactivo.nombre, value: totalConsumo(reactivo), meta: reactivo.unidad }))
      .sort((a, b) => b.value - a.value)
  }

  const reactivo = getScope(scope)
  if (!reactivo) {
    return []
  }
  return [...reactivo.meses]
    .map((month) => ({ label: month.mes, value: month.consumos, meta: reactivo.unidad }))
    .sort((a, b) => b.value - a.value)
}

export function treemapRows(scope: ChartScope) {
  if (scope === "total") {
    return reactivosAnalytics.map((reactivo) => ({
      name: reactivo.nombre,
      parent: reactivo.categoria,
      value: reactivo.valorInventario,
    }))
  }

  const reactivo = getScope(scope)
  if (!reactivo) {
    return []
  }
  return [
    { name: "Stock disponible", parent: reactivo.nombre, value: reactivo.stockActual },
    { name: "Stock mínimo", parent: reactivo.nombre, value: reactivo.stockMinimo },
    { name: "Lotes activos", parent: reactivo.nombre, value: reactivo.lotesActivos * reactivo.stockMinimo * 0.3 },
    { name: "Vencen pronto", parent: reactivo.nombre, value: Math.max(1, reactivo.vencenPronto) * reactivo.stockMinimo * 0.2 },
  ]
}

export function stackedRows(scope: ChartScope) {
  if (scope === "total") {
    return categoryMonthlyTotals()
  }

  const reactivo = getScope(scope)
  if (!reactivo) {
    return []
  }
  return reactivo.meses.map((month) => ({
    mes: month.mes,
    Entradas: month.entradas,
    Consumos: month.consumos,
    Ajustes: Math.abs(month.ajustes),
  }))
}

export function stackedKeys(scope: ChartScope) {
  return scope === "total" ? categories() : ["Entradas", "Consumos", "Ajustes"]
}

export function numericValue(row: Record<string, string | number>, key: string) {
  return Number(row[key] ?? 0)
}

export function heatmapRows(scope: ChartScope) {
  if (scope === "total") {
    return reactivosAnalytics.flatMap((reactivo) =>
      reactivo.meses.map((month) => ({
        x: month.mes,
        y: reactivo.nombre,
        value: month.consumos,
      })),
    )
  }

  const reactivo = getScope(scope)
  if (!reactivo) {
    return []
  }

  return reactivo.meses.flatMap((month) => [
    { x: month.mes, y: "Entradas", value: month.entradas },
    { x: month.mes, y: "Consumos", value: month.consumos },
    { x: month.mes, y: "Ajustes", value: Math.abs(month.ajustes) },
  ])
}

export function paretoRows(scope: ChartScope) {
  const rows = rankedRows(scope)
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1
  let acumulado = 0
  return rows.map((row) => {
    acumulado += row.value
    return {
      label: row.label,
      value: row.value,
      acumulado: Math.round((acumulado / total) * 100),
    }
  })
}

export function bubbleRows(scope: ChartScope) {
  const source = scope === "total" ? reactivosAnalytics : [getScope(scope)].filter(Boolean)
  return source.map((reactivo) => {
    const typed = reactivo as ReagentAnalytics
    const consumo = totalConsumo(typed)
    const cobertura = Math.round((typed.stockActual / typed.stockMinimo) * 100)
    return {
      nombre: typed.nombre,
      consumo,
      valor: typed.valorInventario,
      stock: typed.stockActual,
      cobertura,
      riesgo: typed.vencenPronto + (cobertura < 100 ? 2 : 0),
    }
  })
}

export function waterfallRows(scope: ChartScope) {
  const source = scope === "total" ? reactivosAnalytics : [getScope(scope)].filter(Boolean)
  const entradas = source.reduce((total, reactivo) => total + (reactivo as ReagentAnalytics).meses.reduce((sum, month) => sum + month.entradas, 0), 0)
  const consumos = source.reduce((total, reactivo) => total + (reactivo as ReagentAnalytics).meses.reduce((sum, month) => sum + month.consumos, 0), 0)
  const ajustes = source.reduce((total, reactivo) => total + (reactivo as ReagentAnalytics).meses.reduce((sum, month) => sum + month.ajustes, 0), 0)
  const stockFinal = source.reduce((total, reactivo) => total + (reactivo as ReagentAnalytics).stockActual, 0)
  const stockInicial = Math.max(0, stockFinal - entradas + consumos - ajustes)

  return [
    { label: "Stock inicial", value: stockInicial, displayValue: stockInicial, kind: "total", measure: "absolute", start: 0, end: stockInicial },
    { label: "Entradas", value: entradas, displayValue: entradas, kind: "positive", measure: "relative", start: stockInicial, end: stockInicial + entradas },
    { label: "Consumos", value: -consumos, displayValue: -consumos, kind: "negative", measure: "relative", start: stockInicial + entradas, end: stockInicial + entradas - consumos },
    {
      label: "Ajustes",
      value: ajustes,
      displayValue: ajustes,
      kind: ajustes >= 0 ? "positive" : "negative",
      measure: "relative",
      start: stockInicial + entradas - consumos,
      end: stockInicial + entradas - consumos + ajustes,
    },
    { label: "Stock final", value: 0, displayValue: stockFinal, kind: "total", measure: "total", start: 0, end: stockFinal },
  ] as const
}

export function forecastRows(scope: ChartScope) {
  const source = scope === "total" ? reactivosAnalytics : [getScope(scope)].filter(Boolean)
  const stockActual = source.reduce((total, reactivo) => total + (reactivo as ReagentAnalytics).stockActual, 0)
  const consumoPromedio = Math.max(
    1,
    source.reduce((total, reactivo) => total + totalConsumo(reactivo as ReagentAnalytics), 0) / Math.max(1, source.length) / reactivosAnalytics[0].meses.length,
  )
  const base = reactivosAnalytics[0].meses.map((month, index) => ({
    mes: month.mes,
    real: Math.max(0, stockActual + consumoPromedio * (reactivosAnalytics[0].meses.length - index - 1)),
    forecast: null as number | null,
  }))
  const projected = ["Sep", "Oct", "Nov", "Dic"].map((mes, index) => ({
    mes,
    real: null as number | null,
    forecast: Math.max(0, Math.round(stockActual - consumoPromedio * (index + 1))),
  }))
  return [...base, { mes: "Ago", real: stockActual, forecast: stockActual }, ...projected]
}

// --- Operativo: stock actual vs mínimo ---------------------------------------

export type StockVsMinimo = {
  label: string
  stock: number
  minimo: number
  bajo: boolean
  unidad: string
}

export function stockVsMinimoRows(scope: ChartScope): StockVsMinimo[] {
  const source = scope === "total" ? reactivosAnalytics : ([getScope(scope)].filter(Boolean) as ReagentAnalytics[])
  return source.map((reactivo) => ({
    label: reactivo.nombre,
    stock: reactivo.stockActual,
    minimo: reactivo.stockMinimo,
    bajo: reactivo.stockActual < reactivo.stockMinimo,
    unidad: reactivo.unidad,
  }))
}

// --- Avanzado: monthly consumption distribution (boxplot) --------------------

export function consumoDistribution(scope: ChartScope) {
  const source = scope === "total" ? reactivosAnalytics : ([getScope(scope)].filter(Boolean) as ReagentAnalytics[])
  return source.map((reactivo) => ({
    nombre: reactivo.nombre,
    valores: reactivo.meses.map((mes) => mes.consumos),
  }))
}
