import { FormEvent, KeyboardEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, ChevronDown, Plus, AlertTriangle, Search, Save, X } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { ModuleNav } from "../components/ModuleNav"
import { SuccessBanner } from "../components/SuccessBanner"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type Reactivo, type ReactivoActualizar, type ReactivoCrear } from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber, requireFiniteNumber } from "../lib/forms"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

// Plotly is heavy; only load it when a reagent detail is open (deliberate drill-down).
const PlotlyGauge = lazy(() => import("../Graphs/PlotlyGauge").then((module) => ({ default: module.PlotlyGauge })))

type FiltroEstado = "Todos" | "En tránsito" | "Sin stock" | "Con stock"
type TabReactivos = "listado" | "detalle" | "nuevo"

const filtros: FiltroEstado[] = ["Todos", "En tránsito", "Sin stock", "Con stock"]
// Las claves de filtro son canónicas (la lógica de filtrado usa el valor en
// español del dato); solo se traduce el label que se muestra.
const filtroKey: Record<FiltroEstado, string> = {
  "Todos": "todos",
  "En tránsito": "transito",
  "Sin stock": "sinStock",
  "Con stock": "conStock",
}
const reactivosVacios: Reactivo[] = []
const unidades = ["ml", "L", "g", "kg", "mg", "ug", "unidad", "reacciones"]

// Sentinels del filtro de categoría: "todas" y "sin categoría". El resto de los
// valores son la categoría tal cual (trimmed) — las opciones se derivan del dato.
const CATEGORIA_TODAS = "__all"
const CATEGORIA_SIN = "__none"
type CategoriaOpcion = { value: string; label: string; count: number }

function normalizarTexto(value: string | null | undefined) {
  return (value ?? "").toLocaleLowerCase("es")
}

function normalizarUnidadFusion(value: string | null | undefined) {
  const unidad = (value ?? "").trim()
  const lower = unidad.toLocaleLowerCase("es")
  const aliases: Record<string, string> = {
    l: "L",
    lt: "L",
    lts: "L",
    litro: "L",
    litros: "L",
    "µl": "ul",
    "μl": "ul",
    ul: "ul",
    unidades: "unidad",
    uds: "unidad",
    ud: "unidad",
    kit: "unidad",
    kits: "unidad",
    paquete: "unidad",
    paquetes: "unidad",
    reaccion: "reacciones",
    reacción: "reacciones",
    reacciones: "reacciones",
    rxn: "reacciones",
    rxns: "reacciones",
  }
  return aliases[unidad] ?? aliases[lower] ?? unidad
}

function unidadesFusionCompatibles(a: string | null | undefined, b: string | null | undefined) {
  return normalizarUnidadFusion(a) === normalizarUnidadFusion(b)
}

function esTransito(reactivo: Reactivo) {
  const categoria = normalizarTexto(reactivo.categoria)
  return categoria.includes("tránsito") || categoria.includes("transito")
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Salud de stock de un reactivo. Maneja el color de la cobertura, el peso/color
// del número de stock y el acento de la fila. none = sin stock; low = tiene algo
// pero por debajo del mínimo; ok = en o sobre el mínimo.
type StockHealth = "ok" | "low" | "none"
const healthColor: Record<StockHealth, string> = {
  ok: "var(--cds-support-success)",
  low: "var(--cds-support-warning)",
  none: "var(--cds-support-error)",
}

function stockHealth(stock: number, min: number): StockHealth {
  if (stock <= 0) return "none"
  if (min > 0 && stock < min) return "low"
  return "ok"
}

function daysUntil(dateStr: string) {
  const target = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

// El chip de vencimiento del Catálogo solo necesita mes/año ("AAAA-MM").
function formatMonth(dateStr: string) {
  return dateStr.slice(0, 7)
}

export function ReactivosPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const puedeCrear = puede(usuario, "crear_reactivo")
  const puedeEditar = puede(usuario, "editar_reactivo")
  const [tab, setTab] = useState<TabReactivos>("listado")
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Todos")
  // Multi-categoría: array de categorías elegidas. Vacío = todas.
  const [categorias, setCategorias] = useState<string[]>([])
  const [reactivoDetalleId, setReactivoDetalleId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const reactivoIdQuery = Number(searchParams.get("reactivo_id") ?? searchParams.get("id") ?? "")
  const reactivoDetalle = useMemo(() => {
    if (!reactivos.length) {
      return null
    }
    if (!reactivoDetalleId) {
      return reactivos[0]
    }
    return reactivos.find((reactivo) => reactivo.id === reactivoDetalleId) ?? reactivos[0]
  }, [reactivoDetalleId, reactivos])

  const reactivosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda.trim())

    return reactivos.filter((reactivo) => {
      // La búsqueda es solo texto libre (nombre + ubicación); la categoría tiene
      // su propio selector dedicado, así no se mezclan en la barra.
      const coincideBusqueda =
        !texto ||
        normalizarTexto(reactivo.nombre).includes(texto) ||
        normalizarTexto(reactivo.ubicacion).includes(texto)

      if (!coincideBusqueda) {
        return false
      }

      // Multi-categoría: sin selección = todas; si hay elegidas, matchea si la
      // categoría del reactivo es alguna de ellas (OR, igualdad exacta trimmed).
      // "__none" matchea los reactivos sin categoría cargada.
      const cat = (reactivo.categoria ?? "").trim()
      const coincideCategoria =
        categorias.length === 0 ||
        categorias.some((sel) => (sel === CATEGORIA_SIN ? !cat : cat === sel))

      if (!coincideCategoria) {
        return false
      }

      if (filtroEstado === "En tránsito") {
        return esTransito(reactivo)
      }
      if (filtroEstado === "Sin stock") {
        return (reactivo.stock_total ?? 0) <= 0
      }
      if (filtroEstado === "Con stock") {
        return (reactivo.stock_total ?? 0) > 0
      }
      return true
    })
  }, [busqueda, categorias, filtroEstado, reactivos])

  // Categorías derivadas del propio dato (cero configuración por laboratorio):
  // se cuentan las distintas presentes y se ordenan alfabéticamente. Agrupado
  // por valor trimmed exacto; si más adelante se quiere unificar variantes por
  // mayúsculas/acentos, la clave puede pasar a normalizarTexto().
  const categoriasResumen = useMemo(() => {
    const counts = new Map<string, number>()
    let sinCategoria = 0
    for (const reactivo of reactivos) {
      const cat = (reactivo.categoria ?? "").trim()
      if (!cat) {
        sinCategoria += 1
        continue
      }
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }
    const items = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([label, count]) => ({ label, count }))
    return { total: reactivos.length, items, sinCategoria }
  }, [reactivos])

  const resumen = useMemo(() => {
    return {
      total: reactivos.length,
      conStock: reactivos.filter((reactivo) => (reactivo.stock_total ?? 0) > 0).length,
      sinStock: reactivos.filter((reactivo) => (reactivo.stock_total ?? 0) <= 0).length,
      // Bajo mínimo = con algo de stock pero por debajo del mínimo. "Sin stock"
      // (≤0) se cuenta aparte para que cada tile represente un estado distinto.
      stockBajo: reactivos.filter(
        (reactivo) => (reactivo.stock_total ?? 0) > 0 && (reactivo.stock_total ?? 0) < (reactivo.stock_minimo ?? 0),
      ).length,
    }
  }, [reactivos])

  function handleSelectDetalle(id: number) {
    setReactivoDetalleId(id)
    setTab("detalle")
    setMensaje(null)
    setSearchParams({ reactivo_id: String(id) }, { replace: true })
  }

  useEffect(() => {
    function handleModuleOpen(event: Event) {
      const detail = (event as CustomEvent<{ to?: string }>).detail
      if (detail?.to === "/reactivos") {
        setTab("listado")
        setMensaje(null)
      }
    }

    window.addEventListener("lab:module-open", handleModuleOpen)
    return () => window.removeEventListener("lab:module-open", handleModuleOpen)
  }, [])

  useEffect(() => {
    if (!reactivoIdQuery || !reactivos.some((reactivo) => reactivo.id === reactivoIdQuery)) {
      return
    }
    setReactivoDetalleId(reactivoIdQuery)
    setTab("detalle")
    setBusqueda("")
    setFiltroEstado("Todos")
    setCategorias([])
    setMensaje(null)
  }, [reactivoIdQuery, reactivos])

  return (
    <section>
      <PageHeader
        title={t("reactivos.titulo")}
        count={reactivosQuery.isLoading ? t("reactivos.cargando") : t("reactivos.count", { shown: reactivosFiltrados.length, total: reactivos.length })}
        plain
      />

      {reactivosQuery.isError ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          {t("reactivos.loadError")}
        </div>
      ) : null}

      {mensaje ? (
        <SuccessBanner message={mensaje} onClose={() => setMensaje(null)} className="mb-6" />
      ) : null}

      <ModuleNav
        actions={
          tab !== "listado"
            ? [{ label: t("common.volverAlListado"), onClick: () => setTab("listado"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
            : puedeCrear
              ? [{ label: t("reactivos.nuevo"), onClick: () => setTab("nuevo"), icon: <Plus size={18} aria-hidden="true" /> }]
              : []
        }
      />

      {tab === "listado" ? (
        <>
          <ListadoReactivos
            resumen={resumen}
            busqueda={busqueda}
            filtroEstado={filtroEstado}
            categorias={categorias}
            categoriasResumen={categoriasResumen}
            reactivos={reactivosFiltrados}
            isLoading={reactivosQuery.isLoading}
            selectedId={reactivoDetalle?.id ?? null}
            onBusquedaChange={setBusqueda}
            onFiltroChange={setFiltroEstado}
            onCategoriasChange={setCategorias}
            onSelectDetalle={handleSelectDetalle}
          />
        </>
      ) : null}

      {tab === "detalle" ? (
        <DetalleReactivo
          token={token!}
          reactivos={reactivos}
          reactivo={reactivoDetalle}
          puedeEditar={puedeEditar}
          puedeFusionar={puedeCrear}
          onSelect={setReactivoDetalleId}
          onUpdated={async () => {
            await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
            await queryClient.invalidateQueries({ queryKey: ["lotes"] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
          }}
        />
      ) : null}

      {tab === "nuevo" && puedeCrear ? (
        <NuevoReactivoForm
          token={token!}
          onSuccess={async (id) => {
            await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            setReactivoDetalleId(id)
            setTab("listado")
            setMensaje(t("reactivos.creadoMsg", { id }))
          }}
        />
      ) : null}

    </section>
  )
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function ListadoReactivos({
  resumen,
  busqueda,
  filtroEstado,
  categorias,
  categoriasResumen,
  reactivos,
  isLoading,
  selectedId,
  onBusquedaChange,
  onFiltroChange,
  onCategoriasChange,
  onSelectDetalle,
}: {
  resumen: { total: number; conStock: number; sinStock: number; stockBajo: number }
  busqueda: string
  filtroEstado: FiltroEstado
  categorias: string[]
  categoriasResumen: { total: number; items: { label: string; count: number }[]; sinCategoria: number }
  reactivos: Reactivo[]
  isLoading: boolean
  selectedId: number | null
  onBusquedaChange: (value: string) => void
  onFiltroChange: (value: FiltroEstado) => void
  onCategoriasChange: (value: string[]) => void
  onSelectDetalle: (id: number) => void
}) {
  const { t } = useTranslation()

  // Opciones del selector: "Todas" + cada categoría del dato + "Sin categoría"
  // (solo si hay reactivos sin categoría). Los labels de los sentinels se
  // traducen acá; las categorías reales se muestran tal cual las cargó el lab.
  const opcionesCategoria: CategoriaOpcion[] = [
    { value: CATEGORIA_TODAS, label: t("reactivos.catTodas"), count: categoriasResumen.total },
    ...categoriasResumen.items.map((item) => ({ value: item.label, label: item.label, count: item.count })),
    ...(categoriasResumen.sinCategoria > 0
      ? [{ value: CATEGORIA_SIN, label: t("reactivos.catSinCategoria"), count: categoriasResumen.sinCategoria }]
      : []),
  ]

  // Chips de filtros activos (removibles). Da feedback de qué está aplicado y
  // permite quitar de a uno; "Limpiar todo" resetea los tres filtros. Con
  // multi-categoría hay un chip por cada categoría elegida.
  const chips: { key: string; label: string; onClear: () => void }[] = []
  categorias.forEach((valor) => {
    const opcion = opcionesCategoria.find((item) => item.value === valor)
    chips.push({
      key: `categoria-${valor}`,
      label: `${t("reactivos.fLabelCategoria")}: ${opcion?.label ?? valor}`,
      onClear: () => onCategoriasChange(categorias.filter((item) => item !== valor)),
    })
  })
  if (filtroEstado !== "Todos") {
    chips.push({
      key: "estado",
      label: `${t("reactivos.chipEstado")}: ${t(`reactivos.filtro.${filtroKey[filtroEstado]}`)}`,
      onClear: () => onFiltroChange("Todos"),
    })
  }
  if (busqueda.trim()) {
    chips.push({
      key: "texto",
      label: `${t("reactivos.chipTexto")}: “${busqueda.trim()}”`,
      onClear: () => onBusquedaChange(""),
    })
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
        <MetricTile label={t("reactivos.metricTotal")} value={resumen.total} />
        <MetricTile label={t("reactivos.metricConStock")} value={resumen.conStock} />
        <MetricTile label={t("reactivos.metricSinStock")} value={resumen.sinStock} tone="error" />
        <MetricTile label={t("reactivos.metricStockBajo")} value={resumen.stockBajo} tone="warning" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("common.buscar")}</span>
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
              placeholder={t("reactivos.buscarPlaceholder")}
            />
          </div>
        </label>

        <div className="lg:w-[230px]">
          <div className="mb-2 text-xs tracking-[0.32px] text-cds-textSecondary">{t("reactivos.fLabelCategoria")}</div>
          <CategoriaDropdown value={categorias} options={opcionesCategoria} onChange={onCategoriasChange} />
        </div>

        <div>
          <div className="mb-2 text-xs tracking-[0.32px] text-cds-textSecondary">{t("reactivos.filtrar")}</div>
          <div className="flex flex-wrap gap-px bg-cds-borderSubtle">
            {filtros.map((filtro) => (
              <button
                key={filtro}
                type="button"
                onClick={() => onFiltroChange(filtro)}
                className={cn(
                  "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px] transition-colors hover:bg-[var(--cds-layer-hover-01)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
                  filtroEstado === filtro && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
                )}
              >
                {t(`reactivos.filtro.${filtroKey[filtro]}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs tracking-[0.32px] text-cds-textPlaceholder">{t("reactivos.filtrosActivos")}:</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="inline-flex h-7 items-center gap-1.5 border border-[#cddde2] bg-[#e6eef1] py-0 pl-3 pr-1.5 text-xs text-cds-linkPrimary transition-colors hover:bg-[#dbe7ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cds-focus"
            >
              {chip.label}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onCategoriasChange([])
              onFiltroChange("Todos")
              onBusquedaChange("")
            }}
            className="text-xs text-cds-textSecondary underline underline-offset-2 hover:text-cds-textPrimary"
          >
            {t("reactivos.limpiarTodo")}
          </button>
        </div>
      ) : null}

      <ReactivosTable reactivos={reactivos} isLoading={isLoading} selectedId={selectedId} onSelectDetalle={onSelectDetalle} />
    </>
  )
}

// Selector de Categoría (multi-select): las opciones se derivan del dato. "Todas"
// limpia la selección; cada categoría se alterna y el menú queda abierto para
// elegir varias. Subrayado petróleo cuando hay alguna activa; check + conteo mono
// por opción. Cierra al clickear afuera, con Esc o con el trigger; navegable con
// flechas/Enter/Espacio.
function CategoriaDropdown({
  value,
  options,
  onChange,
}: {
  value: string[]
  options: CategoriaOpcion[]
  onChange: (value: string[]) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const activa = value.length > 0

  // Label del trigger: "Todas" / el nombre si hay una sola / "N categorías".
  const triggerLabel =
    value.length === 0
      ? options.find((option) => option.value === CATEGORIA_TODAS)?.label
      : value.length === 1
        ? options.find((option) => option.value === value[0])?.label ?? value[0]
        : t("reactivos.catVarias", { n: value.length })

  // Cerrar al clickear afuera mientras está abierto.
  useEffect(() => {
    if (!open) {
      return
    }
    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointer)
    return () => document.removeEventListener("mousedown", handlePointer)
  }, [open])

  // Al abrir, resaltar la primera opción ya seleccionada (o la primera).
  useEffect(() => {
    if (open) {
      const index = options.findIndex((option) =>
        option.value === CATEGORIA_TODAS ? value.length === 0 : value.includes(option.value),
      )
      setActiveIndex(index >= 0 ? index : 0)
    }
  }, [open, options, value])

  // Mantener la opción resaltada visible dentro del scroll del menú.
  useEffect(() => {
    if (!open || !listRef.current) {
      return
    }
    const node = listRef.current.children[activeIndex] as HTMLElement | undefined
    node?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

  // Alternar una categoría; "Todas" limpia la selección. No cierra el menú
  // (multi-select: se siguen eligiendo varias).
  function alternar(optionValue: string) {
    if (optionValue === CATEGORIA_TODAS) {
      onChange([])
      return
    }
    onChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false)
      return
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((index) => Math.min(index + 1, options.length - 1))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === "Home" && open) {
      event.preventDefault()
      setActiveIndex(0)
      return
    }
    if (event.key === "End" && open) {
      event.preventDefault()
      setActiveIndex(options.length - 1)
      return
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault()
      const opcion = options[activeIndex]
      if (opcion) {
        alternar(opcion.value)
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open ? `categoria-opt-${activeIndex}` : undefined}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 border-0 border-b-2 bg-cds-field px-3.5 text-sm transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
          activa ? "border-b-cds-focus" : "border-b-transparent",
        )}
      >
        <span className={cn("truncate text-left", activa ? "text-cds-textPrimary" : "text-cds-textSecondary")}>
          {triggerLabel}
        </span>
        <ChevronDown
          size={16}
          className={cn("flex-none text-cds-textSecondary transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-[calc(100%+2px)] z-20 max-h-[280px] w-max min-w-full max-w-[340px] overflow-y-auto border border-cds-borderSubtle bg-cds-background shadow-[0_8px_24px_rgba(31,41,51,0.16)]"
        >
          {options.map((option, index) => {
            const seleccion = option.value === CATEGORIA_TODAS ? value.length === 0 : value.includes(option.value)
            return (
              <li key={option.value} id={`categoria-opt-${index}`} role="option" aria-selected={seleccion}>
                <button
                  type="button"
                  onClick={() => alternar(option.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex h-10 w-full items-center justify-between gap-2.5 border-l-2 px-3.5 text-left text-sm transition-colors",
                    seleccion ? "border-l-cds-focus bg-[#eef5f7]" : "border-l-transparent bg-cds-background",
                    !seleccion && index === activeIndex && "bg-[var(--cds-layer-hover-01)]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {seleccion ? (
                      <Check size={15} className="flex-none text-cds-linkPrimary" aria-hidden="true" />
                    ) : (
                      <span className="w-[15px] flex-none" aria-hidden="true" />
                    )}
                    <span className="truncate text-cds-textPrimary">{option.label}</span>
                  </span>
                  <span className="flex-none pl-4 font-mono text-xs text-cds-textPlaceholder">{option.count}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

// Tono semántico del tile: neutral (Total/Con stock), error/coral (Sin stock) y
// warning/ámbar (Stock bajo). Antes "Sin stock" y "Stock bajo" compartían el
// rojo; ahora cada uno usa el color de su severidad real.
type MetricTone = "neutral" | "error" | "warning"

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: MetricTone
}) {
  // Mismo lenguaje de card que Dashboard y Movimientos: tile con borde, acento
  // izquierdo que codifica la severidad, label mono en mayúsculas y valor mono
  // coloreado por tono (peso regular, sin bold).
  const card =
    tone === "error"
      ? "bg-lab-critTint shadow-[inset_3px_0_0_var(--cds-support-error)]"
      : tone === "warning"
        ? "bg-lab-warmTint shadow-[inset_3px_0_0_var(--lab-warm)]"
        : "bg-cds-layer01 shadow-[inset_3px_0_0_var(--lab-blue)]"
  return (
    <article className={cn("border border-cds-borderSubtle p-[18px_20px]", card)}>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-cds-textSecondary">{label}</div>
      <div
        className={cn(
          "mt-2.5 font-mono text-[34px] leading-none",
          tone === "error" && "text-cds-supportError",
          tone === "warning" && "text-lab-warmFg",
        )}
      >
        {formatNumber(value)}
      </div>
    </article>
  )
}

function ReactivosTable({
  reactivos,
  isLoading,
  selectedId,
  onSelectDetalle,
}: {
  reactivos: Reactivo[]
  isLoading: boolean
  selectedId: number | null
  onSelectDetalle: (id: number) => void
}) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }

  if (reactivos.length === 0) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("reactivos.sinFiltro")}</div>
  }

  return (
    <>
      <LeyendaCobertura />
      <div className="overflow-x-auto border-t border-cds-borderSubtle">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
              <th className="h-10 px-4 font-normal">{t("reactivos.thId")}</th>
              <th className="h-10 px-4 font-normal">{t("reactivos.thNombre")}</th>
              <th className="h-10 px-4 text-right font-normal">{t("reactivos.thStockActual")}</th>
              <th className="h-10 px-4 font-normal">{t("reactivos.thUnidad")}</th>
              <th className="h-10 w-[190px] px-4 font-normal">{t("reactivos.thCobertura")}</th>
              <th className="h-10 px-4 text-right font-normal">{t("reactivos.thStockMin")}</th>
              <th className="h-10 px-4 font-normal">{t("reactivos.thLotes")}</th>
              <th className="h-10 w-[110px] px-4 font-normal">{t("reactivos.thUbicacion")}</th>
              <th className="h-10 px-4 font-normal">{t("reactivos.thCategoria")}</th>
            </tr>
          </thead>
          <tbody>
            {reactivos.map((reactivo) => {
              const stock = reactivo.stock_total ?? 0
              const minimo = reactivo.stock_minimo ?? 0
              const health = stockHealth(stock, minimo)
              return (
                <tr
                  key={reactivo.id}
                  className={cn(
                    "cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01",
                    // Sin stock: fondo + acento coral. Bajo mínimo: fondo + acento
                    // ámbar, para distinguirlo de un vistazo del sin stock.
                    health === "none" && "bg-lab-critTint/60 shadow-[inset_2px_0_0_var(--cds-support-error)]",
                    health === "low" && "bg-lab-warmTint/60 shadow-[inset_2px_0_0_var(--cds-support-warning)]",
                    selectedId === reactivo.id && "bg-cds-layer01 shadow-[inset_2px_0_0_var(--cds-focus)]",
                  )}
                  onClick={() => onSelectDetalle(reactivo.id)}
                >
                  <td className="h-12 px-4 font-mono text-xs tracking-[0.16px] text-cds-textSecondary">{reactivo.id}</td>
                  <td className="h-12 px-4 font-semibold tracking-[0.16px]">{reactivo.nombre}</td>
                  <td
                    className={cn(
                      "h-12 px-4 text-right font-mono",
                      health === "none" && "font-semibold text-cds-supportError",
                      health === "low" && "font-semibold text-lab-warmFg",
                    )}
                  >
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {health !== "ok" ? <AlertTriangle size={14} aria-hidden="true" /> : null}
                      {formatNumber(stock)}
                    </span>
                  </td>
                  <td className="h-12 px-4">{reactivo.unidad}</td>
                  <td className="h-12 px-4">
                    <CoberturaBar stock={stock} min={minimo} />
                  </td>
                  <td className="h-12 px-4 text-right font-mono">{formatNumber(reactivo.stock_minimo)}</td>
                  <td className="h-12 px-4">
                    <LotesCell count={reactivo.lotes_count ?? 0} proximoVencimiento={reactivo.proximo_vencimiento} />
                  </td>
                  <td className="h-12 px-4 text-cds-textSecondary">
                    <span className="block max-w-[110px] truncate" title={reactivo.ubicacion || undefined}>
                      {reactivo.ubicacion || "-"}
                    </span>
                  </td>
                  <td className="h-12 px-4 text-cds-textSecondary">
                    {reactivo.categoria ? <CategoryTag value={reactivo.categoria} /> : "-"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// Medidor inline de cobertura: compara stock vs mínimo. La pista representa
// 0–160% del mínimo, así que el 100% (el mínimo) cae al 62.5% del ancho, donde
// va la marca vertical. El relleno se colorea por salud y el % va a la derecha.
function CoberturaBar({ stock, min }: { stock: number; min: number }) {
  if (min <= 0) {
    return <span className="font-mono text-[11px] text-cds-textSecondary">—</span>
  }
  const health = stockHealth(stock, min)
  const ratio = Math.round((stock / min) * 100)
  const fillWidth = (Math.min(160, Math.max(0, ratio)) / 160) * 100
  const color = healthColor[health]
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-full max-w-[160px] overflow-hidden bg-cds-borderSubtle">
        <div className="absolute inset-y-0 left-0" style={{ width: `${fillWidth}%`, backgroundColor: color }} />
        <div className="absolute inset-y-0 w-px bg-cds-textSecondary" style={{ left: "62.5%" }} aria-hidden="true" />
      </div>
      <span className="min-w-[34px] text-right font-mono text-[11px]" style={{ color }}>
        {ratio}%
      </span>
    </div>
  )
}

// Relación del reactivo con la pestaña Lotes: conteo de lotes activos y un chip
// con el vencimiento más próximo (ámbar si vence dentro de ~2 meses).
function LotesCell({ count, proximoVencimiento }: { count: number; proximoVencimiento?: string | null }) {
  const { t } = useTranslation()
  const soon = proximoVencimiento ? daysUntil(proximoVencimiento) <= 60 : false
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[13px] text-cds-textSecondary">
        {count > 0 ? t("reactivos.lotesCount", { count }) : "—"}
      </span>
      {proximoVencimiento ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[7px] py-0.5 text-[11px]",
            soon ? "bg-lab-warmTint text-lab-warmFg" : "bg-cds-layer01 text-cds-textSecondary",
          )}
        >
          <span
            className="h-[5px] w-[5px] rounded-full"
            style={{ backgroundColor: soon ? "var(--cds-support-warning)" : "var(--cds-text-secondary)" }}
            aria-hidden="true"
          />
          {t("reactivos.venceChip", { fecha: formatMonth(proximoVencimiento) })}
        </span>
      ) : null}
    </div>
  )
}

function LeyendaCobertura() {
  const { t } = useTranslation()
  const items: { health: StockHealth; label: string }[] = [
    { health: "ok", label: t("reactivos.legendOk") },
    { health: "low", label: t("reactivos.legendLow") },
    { health: "none", label: t("reactivos.legendNone") },
  ]
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-cds-textSecondary">
      {items.map((item) => (
        <span key={item.health} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5" style={{ backgroundColor: healthColor[item.health] }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-px bg-cds-textSecondary" aria-hidden="true" />
        {t("reactivos.legendMinMark")}
      </span>
    </div>
  )
}

function NuevoReactivoForm({
  token,
  onSuccess,
}: {
  token: string
  onSuccess: (id: number) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const crearMutation = useMutation({
    mutationFn: (data: ReactivoCrear) => api.crearReactivo(token, data),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setErrorLocal(null)
    try {
      const form = new FormData(formElement)
      const stockMinimo = requireFiniteNumber(
        parseFormNumber(form.get("stock_minimo"), 0),
        t("reactivos.errStockMin"),
      )
      const payload: ReactivoCrear = {
        nombre: String(form.get("nombre") ?? "").trim(),
        unidad: String(form.get("unidad") ?? "ml"),
        stock_minimo: stockMinimo,
        ubicacion: nullable(String(form.get("ubicacion") ?? "")),
        categoria: nullable(String(form.get("categoria") ?? "")),
      }

      const resultado = await crearMutation.mutateAsync(payload)
      formElement.reset()
      await onSuccess(resultado.id)
    } catch (error) {
      setErrorLocal(mutationError(error, t("reactivos.errCrear")))
    }
  }

  return (
    <form className="max-w-5xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <h2 className="mb-6 text-[24px] leading-[1.33]">{t("reactivos.agregar")}</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("reactivos.fNombre")} name="nombre" required placeholder={t("reactivos.fNombrePh")} />
        <label className="block">
          <Label className="mb-2" htmlFor="unidad">{t("reactivos.fUnidadBase")}</Label>
          <select
            id="unidad"
            name="unidad"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            defaultValue="ml"
          >
            {unidades.map((unidad) => (
              <option key={unidad} value={unidad}>
                {unidad}
              </option>
            ))}
          </select>
        </label>
        <DecimalField label={t("reactivos.fStockMin")} name="stock_minimo" defaultValue="0" required />
        <Field label={t("reactivos.fUbicacion")} name="ubicacion" placeholder={t("reactivos.fUbicacionPh")} />
        <Field label={t("reactivos.fCategoria")} name="categoria" placeholder={t("reactivos.fCategoriaPh")} />
      </div>

      {errorLocal ? (
        <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}

      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Save size={18} aria-hidden="true" />
        {crearMutation.isPending ? t("common.creando") : t("reactivos.crear")}
      </Button>
    </form>
  )
}

function DetalleReactivo({
  token,
  reactivos,
  reactivo,
  puedeEditar,
  puedeFusionar,
  onSelect,
  onUpdated,
}: {
  token: string
  reactivos: Reactivo[]
  reactivo: Reactivo | null
  puedeEditar: boolean
  puedeFusionar: boolean
  onSelect: (id: number) => void
  onUpdated: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [unidad, setUnidad] = useState("")
  const [stockMinimo, setStockMinimo] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [categoria, setCategoria] = useState("")
  const [mensajeLocal, setMensajeLocal] = useState<string | null>(null)
  // Merge tool: el reactivo que se ve es el sobreviviente; se elige un duplicado a absorber.
  const [duplicadoId, setDuplicadoId] = useState<number | null>(null)
  const [confirmandoFusion, setConfirmandoFusion] = useState(false)
  const [mensajeFusion, setMensajeFusion] = useState<string | null>(null)
  const [errorFusion, setErrorFusion] = useState<string | null>(null)
  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReactivoActualizar }) => api.actualizarReactivo(token, id, data),
  })
  const fusionMutation = useMutation({
    mutationFn: ({ sobreviviente, duplicado }: { sobreviviente: number; duplicado: number }) =>
      api.fusionarReactivos(token, sobreviviente, duplicado),
  })
  const queryClient = useQueryClient()
  const [busquedaDup, setBusquedaDup] = useState("")
  // Posibles duplicados con IA: manual (enabled:false) para no gastar una llamada
  // al LLM cada vez que se abre un detalle; keyed por reactivo => se resetea solo
  // al cambiar de reactivo. Se dispara con el botón (refetch).
  const duplicadosQuery = useQuery({
    queryKey: ["duplicados", reactivo?.id],
    queryFn: () => api.duplicadosReactivo(token, reactivo!.id),
    enabled: false,
  })

  useEffect(() => {
    if (!reactivo) {
      return
    }
    setNombre(reactivo.nombre ?? "")
    setUnidad(reactivo.unidad ?? "")
    setStockMinimo(String(reactivo.stock_minimo ?? 0))
    setUbicacion(reactivo.ubicacion ?? "")
    setCategoria(reactivo.categoria ?? "")
    setErrorLocal(null)
    setMensajeLocal(null)
    setDuplicadoId(null)
    setConfirmandoFusion(false)
    setMensajeFusion(null)
    setErrorFusion(null)
    setBusquedaDup("")
  }, [reactivo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reactivo) {
      return
    }
    setErrorLocal(null)
    setMensajeLocal(null)
    try {
      const stockMinimoParseado = requireFiniteNumber(
        parseFormNumber(stockMinimo, 0),
        t("reactivos.errStockMin"),
      )
      const payload: ReactivoActualizar = {
        nombre: nombre.trim(),
        unidad,
        stock_minimo: stockMinimoParseado,
        ubicacion: nullable(ubicacion),
        categoria: nullable(categoria),
        marca: reactivo.marca ?? null,
        numero_catalogo: reactivo.numero_catalogo ?? null,
        enlace_compra: reactivo.enlace_compra ?? null,
      }
      await actualizarMutation.mutateAsync({ id: reactivo.id, data: payload })
      await onUpdated()
      setMensajeLocal(t("reactivos.actualizadoMsg"))
    } catch (error) {
      setErrorLocal(mutationError(error, t("reactivos.errActualizar")))
    }
  }

  async function handleFusionar() {
    if (!reactivo || !duplicadoId) {
      return
    }
    setErrorFusion(null)
    setMensajeFusion(null)
    try {
      const res = await fusionMutation.mutateAsync({ sobreviviente: reactivo.id, duplicado: duplicadoId })
      setMensajeFusion(res.mensaje ?? t("reactivos.fusionadoMsg", { n: res.lotes_movidos }))
      setDuplicadoId(null)
      setConfirmandoFusion(false)
      setBusquedaDup("")
      await onUpdated()
      // Las sugerencias en cache quedaron viejas (el duplicado ya no existe).
      queryClient.removeQueries({ queryKey: ["duplicados"] })
    } catch (error) {
      setConfirmandoFusion(false)
      setErrorFusion(mutationError(error, t("reactivos.errFusionar")))
    }
  }

  function seleccionarDuplicado(id: number) {
    setDuplicadoId(id)
    setConfirmandoFusion(false)
    setMensajeFusion(null)
    setErrorFusion(null)
  }

  if (!reactivo) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("reactivos.sinReactivos")}</div>
  }

  const bajoMinimo = (reactivo.stock_total ?? 0) < (reactivo.stock_minimo ?? 0)
  const minimoReactivo = reactivo.stock_minimo ?? 0
  const coberturaReactivo =
    minimoReactivo > 0
      ? Math.min(160, Math.round(((reactivo.stock_total ?? 0) / minimoReactivo) * 100))
      : (reactivo.stock_total ?? 0) > 0
        ? 160
        : 0
  const duplicadosPosibles = reactivos.filter((item) => item.id !== reactivo.id)
  const duplicadosFiltrados = busquedaDup.trim()
    ? duplicadosPosibles.filter((item) => normalizarTexto(item.nombre).includes(normalizarTexto(busquedaDup)))
    : []
  const duplicadoSeleccionado = reactivos.find((item) => item.id === duplicadoId) ?? null
  const nombreDuplicado = duplicadoSeleccionado?.nombre ?? ""
  const duplicadoUnidadCompatible = duplicadoSeleccionado
    ? unidadesFusionCompatibles(reactivo.unidad, duplicadoSeleccionado.unidad)
    : true
  const unidadBloqueada = Boolean(reactivo.unidad_bloqueada)

  return (
    <>
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside>
        <Label className="mb-2" htmlFor="reactivo_detalle">{t("reactivos.seleccionaReactivo")}</Label>
        <select
          id="reactivo_detalle"
          className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
          value={reactivo.id}
          onChange={(event) => onSelect(Number(event.target.value))}
        >
          {reactivos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} (ID {item.id})
            </option>
          ))}
        </select>

        <div className="mt-4 bg-cds-layer01 p-4">
          <h2 className="text-[24px] leading-[1.33]">{reactivo.nombre}</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <InfoRow label={t("reactivos.infoUnidad")} value={reactivo.unidad} />
            <InfoRow label={t("reactivos.infoStockActual")} value={`${formatNumber(reactivo.stock_total)} ${reactivo.unidad}`} danger={bajoMinimo} />
            <InfoRow label={t("reactivos.infoStockMin")} value={`${formatNumber(reactivo.stock_minimo)} ${reactivo.unidad}`} />
            <InfoRow label={t("reactivos.infoUbicacion")} value={reactivo.ubicacion || "-"} />
            <InfoRow label={t("reactivos.infoCategoria")} value={reactivo.categoria || "-"} />
          </dl>
        </div>

        <div className="mt-4 bg-cds-layer01 p-4">
          <h3 className="text-sm font-semibold leading-[1.4]">{t("reactivos.coberturaStock")}</h3>
          <Suspense fallback={<div className="mt-2 h-[280px] animate-pulse bg-cds-field" />}>
            <PlotlyGauge value={coberturaReactivo} numberSize={36} />
          </Suspense>
        </div>
      </aside>

      <form className="bg-cds-layer01 p-4" onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-[24px] leading-[1.33]">{t("reactivos.editar")}</h2>
          {!puedeEditar ? <span className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("common.soloLectura")}</span> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label={t("reactivos.fNombre")}
            name="nombre"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            required
            disabled={!puedeEditar}
          />
          <label className="block">
            <Label className="mb-2" htmlFor="unidad_editar">{t("reactivos.fUnidadBase")}</Label>
            <select
              id="unidad_editar"
              name="unidad"
              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none disabled:cursor-not-allowed disabled:bg-cds-layer01 disabled:text-cds-textPlaceholder disabled:opacity-60"
              value={unidad}
              onChange={(event) => setUnidad(event.target.value)}
              disabled={!puedeEditar || unidadBloqueada}
            >
              {unidades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {unidadBloqueada ? (
              <p className="mt-2 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
                {t("reactivos.unidadBloqueadaHelp")}
              </p>
            ) : null}
          </label>
          <Field
            label={t("reactivos.fStockMin")}
            name="stock_minimo"
            inputMode="decimal"
            value={stockMinimo}
            onChange={(event) => setStockMinimo(event.target.value)}
            required
            disabled={!puedeEditar}
          />
          <Field
            label={t("reactivos.fUbicacion")}
            name="ubicacion"
            value={ubicacion}
            onChange={(event) => setUbicacion(event.target.value)}
            disabled={!puedeEditar}
          />
          <Field
            label={t("reactivos.fCategoria")}
            name="categoria"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            disabled={!puedeEditar}
          />
        </div>

        <p className="mt-4 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
          {t("reactivos.editHelp")}
        </p>

        {errorLocal ? (
          <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
            {errorLocal}
          </div>
        ) : null}

        {mensajeLocal ? (
          <div className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">
            {mensajeLocal}
          </div>
        ) : null}

        {puedeEditar ? (
          <Button className="mt-6" type="submit" disabled={actualizarMutation.isPending}>
            <Save size={18} aria-hidden="true" />
            {actualizarMutation.isPending ? t("common.guardando") : t("common.guardarCambios")}
          </Button>
        ) : null}
      </form>
    </div>

    {puedeFusionar ? (
      <section className="mt-6 bg-cds-layer01 p-4">
        <h2 className="text-[24px] leading-[1.33]">{t("reactivos.fusionarTitulo")}</h2>
        <p className="mt-2 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
          {t("reactivos.fusionarHelp", { nombre: reactivo.nombre })}
        </p>

        {duplicadosPosibles.length === 0 ? (
          <p className="mt-4 text-sm text-cds-textSecondary">{t("reactivos.sinOtrosUnidad")}</p>
        ) : (
          <div className="mt-4 max-w-xl">
            <Button
              type="button"
              onClick={() => void duplicadosQuery.refetch()}
              disabled={duplicadosQuery.isFetching}
            >
              {duplicadosQuery.isFetching ? t("reactivos.buscandoDup") : t("reactivos.buscarDupIA")}
            </Button>

            {duplicadosQuery.isError ? (
              <p className="mt-3 text-sm text-cds-supportError">{t("reactivos.errConsultarDup")}</p>
            ) : null}

            {duplicadosQuery.data ? (
              duplicadosQuery.data.candidatos.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("reactivos.posiblesDup")}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {duplicadosQuery.data.candidatos.map((candidato) => (
                      <button
                        key={candidato.reactivo_id}
                        type="button"
                        onClick={() => seleccionarDuplicado(candidato.reactivo_id)}
                        className={cn(
                          "flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors",
                          duplicadoId === candidato.reactivo_id
                            ? "border-cds-buttonPrimary bg-lab-blueTint text-cds-linkPrimary"
                            : "border-cds-borderSubtle hover:bg-cds-background",
                        )}
                      >
                        <span>
                          {candidato.nombre}{" "}
                          <span className="text-cds-textSecondary">
                            (ID {candidato.reactivo_id}
                            {candidato.cas_numero ? ` · CAS ${candidato.cas_numero}` : ""}
                            {candidato.unidad ? ` · ${candidato.unidad}` : ""})
                          </span>
                        </span>
                        {duplicadoId === candidato.reactivo_id ? <Check size={16} aria-hidden="true" /> : null}
                      </button>
                    ))}
                  </div>
                  {duplicadosQuery.data.razon ? <p className="mt-2 text-xs leading-4 text-cds-textSecondary">{duplicadosQuery.data.razon}</p> : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-cds-textSecondary">{t("reactivos.sinDupClaros")}</p>
              )
            ) : null}

            <div className="mt-5">
              <Label className="mb-2" htmlFor="buscar_duplicado">{t("reactivos.buscarEnTodos")}</Label>
              <Input
                id="buscar_duplicado"
                value={busquedaDup}
                onChange={(event) => setBusquedaDup(event.target.value)}
                placeholder={t("reactivos.buscarDupPh")}
              />
              {busquedaDup.trim() ? (
                <div className="mt-2 flex flex-col gap-2">
                  {duplicadosFiltrados.length === 0 ? (
                    <p className="text-sm text-cds-textSecondary">{t("common.sinResultados")}</p>
                  ) : (
                    duplicadosFiltrados.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => seleccionarDuplicado(item.id)}
                        className={cn(
                          "flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors",
                          duplicadoId === item.id
                            ? "border-cds-buttonPrimary bg-lab-blueTint text-cds-linkPrimary"
                            : "border-cds-borderSubtle hover:bg-cds-background",
                        )}
                      >
                        <span>
                          {item.nombre}{" "}
                          <span className="text-cds-textSecondary">
                            (ID {item.id} · stock {formatNumber(item.stock_total)} {item.unidad}
                            {!unidadesFusionCompatibles(reactivo.unidad, item.unidad) ? ` · ${t("reactivos.unidadDistinta", { unidad: item.unidad })}` : ""})
                          </span>
                        </span>
                        {duplicadoId === item.id ? <Check size={16} aria-hidden="true" /> : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {duplicadoId ? (
              <p className="mt-4 text-sm">{t("reactivos.duplicadoElegido")} <strong>{nombreDuplicado}</strong></p>
            ) : null}
            {duplicadoSeleccionado && !duplicadoUnidadCompatible ? (
              <p className="mt-3 border-l-4 border-cds-supportWarning bg-cds-background px-4 py-3 text-sm text-cds-textSecondary">
                {t("reactivos.unidadIncompatibleFusion", {
                  actual: reactivo.unidad,
                  duplicado: duplicadoSeleccionado.unidad,
                })}
              </p>
            ) : null}
          </div>
        )}

        {duplicadoId && !confirmandoFusion ? (
          <Button className="mt-4" type="button" onClick={() => setConfirmandoFusion(true)}>
            {t("reactivos.fusionar")}
          </Button>
        ) : null}

        {duplicadoId && confirmandoFusion ? (
          <div className="mt-4 border-l-4 border-lab-warm bg-cds-background px-4 py-3 text-sm">
            {t("reactivos.confirmFusion", { dup: nombreDuplicado, sob: reactivo.nombre })}
            <div className="mt-3 flex items-center gap-3">
              <Button type="button" onClick={() => void handleFusionar()} disabled={fusionMutation.isPending}>
                {fusionMutation.isPending ? t("reactivos.fusionando") : t("reactivos.confirmarFusion")}
              </Button>
              <button type="button" className="text-sm text-cds-textSecondary underline" onClick={() => setConfirmandoFusion(false)}>
                {t("common.cancelar")}
              </button>
            </div>
          </div>
        ) : null}

        {errorFusion ? (
          <div className="mt-4 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">{errorFusion}</div>
        ) : null}
        {mensajeFusion ? (
          <div className="mt-4 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">{mensajeFusion}</div>
        ) : null}
      </section>
    ) : null}
    </>
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

function InfoRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <dt className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</dt>
      <dd className={cn("mt-1", danger && "text-cds-supportError")}>{value}</dd>
    </div>
  )
}

function CategoryTag({ value }: { value: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-3xl bg-[#edf5ff] px-2 text-xs tracking-[0.32px] text-cds-linkPrimary">
      {value}
    </span>
  )
}
