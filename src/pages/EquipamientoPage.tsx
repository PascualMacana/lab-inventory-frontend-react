import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, ChevronDown, Eye, EyeOff, History, LogIn, LogOut, Microscope, Pencil, Plus, Printer, QrCode, Save, Search, Trash2, User, Wrench } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { ModuleNav } from "../components/ModuleNav"
import { SuccessBanner } from "../components/SuccessBanner"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  api,
  type Equipamiento,
  type EquipamientoActualizar,
  type EquipamientoCrear,
  type EquipamientoUnidad,
  type EquipamientoUnidadActualizar,
  type EventoEquipamiento,
  type EventoEquipamientoCrear,
  type Proveedor,
} from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber, requireFiniteNumber } from "../lib/forms"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

type TabEquipamiento = "listado" | "nuevo" | "eventos"
type TipoEvento = EventoEquipamiento["tipo"]

const equiposVacios: Equipamiento[] = []
const eventosVacios: EventoEquipamiento[] = []
const proveedoresVacios: Proveedor[] = []
const unidadesVacias: EquipamientoUnidad[] = []
const tiposEventoFormulario: TipoEvento[] = ["alta", "rotura", "calibracion", "baja"]
const tiposEventoHistorial: TipoEvento[] = ["alta", "rotura", "calibracion", "reparacion", "baja", "uso_inicio", "uso_fin"]
const formatosEtiquetaEquipo = [
  { clave: "rollo_70x40", nombre: "Frasco grande — 70×40 mm (rollo)", maxPorPdf: 500 },
  { clave: "rollo_50x30", nombre: "Frasco mediano — 50×30 mm (rollo)", maxPorPdf: 500 },
  { clave: "avery_l7160", nombre: "Avery L7160 — A4, 21/hoja", maxPorPdf: 210 },
  { clave: "rollo_30x20", nombre: "Frasco chico — 30×20 mm (rollo)", maxPorPdf: 500 },
]

function nullable(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed ? trimmed : null
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const date = new Date(`${String(value).split(" ")[0]}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat("es-AR").format(date)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const date = new Date(`${normalized}Z`)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

// Color semántico por estado de unidad (punto + texto), compartido por la tabla
// de unidades, el chip del equipo y el historial. Disponible = verde, en uso =
// petróleo, calibración = ámbar, fuera de uso = coral, baja = gris.
const estadoUnidadColor: Record<EquipamientoUnidad["estado"], string> = {
  operativa: "var(--cds-support-success)",
  en_uso: "var(--lab-blue)",
  calibracion: "var(--cds-support-warning)",
  fuera_de_uso: "var(--cds-support-error)",
  baja: "var(--cds-text-placeholder)",
}

// Color del badge de cada tipo de evento en el historial.
const tipoEventoColor: Record<TipoEvento, string> = {
  alta: "var(--lab-blue)",
  uso_inicio: "var(--lab-blue)",
  uso_fin: "var(--cds-support-success)",
  reparacion: "var(--cds-support-success)",
  calibracion: "var(--cds-support-warning)",
  rotura: "var(--cds-support-error)",
  baja: "var(--cds-support-error)",
}

function esMotivoFinCalibracion(tipo: TipoEvento | null | undefined, motivo: string | null | undefined) {
  const motivoNormalizado = (motivo || "").trim().toLocaleLowerCase("es")
  return tipo === "reparacion" && ["calibración finalizada", "calibracion finalizada", "calibration completed"].includes(motivoNormalizado)
}

function etiquetaTipoEvento(t: ReturnType<typeof useTranslation>["t"], evento: EventoEquipamiento) {
  return esMotivoFinCalibracion(evento.tipo, evento.motivo) ? t("equip.calibracionFinalizada") : t(`equip.tipoEvento.${evento.tipo}`)
}

// Punto de estado del equipo en la tabla maestra (handoff). Prioridad: rojo si
// hay no operativas, gris si no hay unidades cargadas, verde si hay disponibles,
// petróleo si está todo en uso. Mismos colores que la leyenda de arriba.
const estadoEquipoPuntoColor = {
  disponible: "var(--cds-support-success)",
  en_uso: "var(--lab-blue)",
  no_operativa: "var(--cds-support-error)",
  sin_unidades: "var(--cds-text-placeholder)",
} as const

function colorPuntoEquipo(equipo: Equipamiento): string {
  if (equipo.cantidad_no_operativa > 0) return estadoEquipoPuntoColor.no_operativa
  if (equipo.cantidad_unidades === 0) return estadoEquipoPuntoColor.sin_unidades
  if (equipo.cantidad_disponible > 0) return estadoEquipoPuntoColor.disponible
  return estadoEquipoPuntoColor.en_uso
}

// Leyenda de los puntos de estado de la tabla. Va debajo de la barra de búsqueda
// (no debajo de la tabla) para que quede siempre visible, como en Reactivos.
function LeyendaEstadosEquipo() {
  const { t } = useTranslation()
  const items = [
    { color: estadoEquipoPuntoColor.disponible, label: t("equip.legendDisponible") },
    { color: estadoEquipoPuntoColor.en_uso, label: t("equip.legendEnUso") },
    { color: estadoEquipoPuntoColor.no_operativa, label: t("equip.legendNoOperativa") },
    { color: estadoEquipoPuntoColor.sin_unidades, label: t("equip.legendSinUnidades") },
  ]
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-cds-textSecondary">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
      <span className="ml-auto text-cds-textPlaceholder">{t("equip.legendClicFila")}</span>
    </div>
  )
}

function EstadoUnidadBadge({ estado }: { estado: EquipamientoUnidad["estado"] }) {
  const { t } = useTranslation()
  const color = estadoUnidadColor[estado]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]" style={{ color }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {t(`equip.estadoUnidad.${estado}`)}
    </span>
  )
}

function EstadoEquipoChip({ enServicio }: { enServicio: boolean }) {
  const { t } = useTranslation()
  const color = enServicio ? "var(--cds-support-success)" : "var(--cds-support-error)"
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[0.16px]" style={{ color }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {enServicio ? t("equip.estadoEquipoOperativo") : t("equip.estadoEquipoFueraServicio")}
    </span>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function EquipamientoPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const puedeCrear = puede(usuario, "crear_equipamiento")
  const puedeEditar = puedeCrear
  const puedeEvento = puede(usuario, "registrar_evento_equipamiento")
  const [tab, setTab] = useState<TabEquipamiento>("listado")
  const [categoria, setCategoria] = useState("")
  const [soloOperativos, setSoloOperativos] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [codigoUnidad, setCodigoUnidad] = useState("")
  const [equipoId, setEquipoId] = useState<number | null>(null)
  const [unidadEnfocadaId, setUnidadEnfocadaId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const unidadParam = searchParams.get("unidad")

  const categoriasQuery = useQuery({
    queryKey: ["equipamiento-categorias"],
    queryFn: () => api.categoriasEquipamiento(token!),
    enabled: Boolean(token),
  })

  const equiposQuery = useQuery({
    queryKey: ["equipamiento", categoria, soloOperativos],
    queryFn: () => api.equipamiento(token!, { categoria: categoria || undefined, solo_operativos: soloOperativos }),
    enabled: Boolean(token),
  })

  const equipos = equiposQuery.data ?? equiposVacios
  const buscarUnidadMutation = useMutation({
    mutationFn: (codigoInterno: string) => api.equipamientoUnidadPorCodigo(token!, codigoInterno),
  })
  const equiposFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    if (!texto) {
      return equipos
    }
    return equipos.filter((equipo) =>
      [equipo.nombre, equipo.categoria, equipo.marca, equipo.modelo, equipo.numero_serie, equipo.ubicacion, equipo.proveedor_nombre]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(texto)),
    )
  }, [busqueda, equipos])

  const equipoSeleccionado = useMemo(() => {
    if (!equipoId) {
      return null
    }
    return equiposFiltrados.find((equipo) => equipo.id === equipoId) ?? null
  }, [equipoId, equiposFiltrados])

  useEffect(() => {
    function handleModuleOpen(event: Event) {
      const detail = (event as CustomEvent<{ to?: string }>).detail
      if (detail?.to === "/equipamiento") {
        setTab("listado")
        setMensaje(null)
        setErrorLocal(null)
      }
    }

    window.addEventListener("lab:module-open", handleModuleOpen)
    return () => window.removeEventListener("lab:module-open", handleModuleOpen)
  }, [])

  async function refrescar(mensajeOk?: string) {
    await queryClient.invalidateQueries({ queryKey: ["equipamiento"] })
    await queryClient.invalidateQueries({ queryKey: ["equipamiento-categorias"] })
    await queryClient.invalidateQueries({ queryKey: ["eventos-equipamiento"] })
    await queryClient.invalidateQueries({ queryKey: ["equipamiento-unidades"] })
    if (equipoSeleccionado?.id) {
      await queryClient.invalidateQueries({ queryKey: ["eventos-equipamiento", equipoSeleccionado.id] })
      await queryClient.invalidateQueries({ queryKey: ["equipamiento-unidades", equipoSeleccionado.id] })
    }
    if (mensajeOk) {
      setMensaje(mensajeOk)
    }
  }

  async function resolverUnidadPorCodigo(codigoRaw: string, actualizarUrl = false) {
    const codigo = codigoRaw.trim().toUpperCase()
    setMensaje(null)
    setErrorLocal(null)
    if (!codigo) {
      setErrorLocal(t("equip.errBuscarUnidadVacia"))
      return
    }
    try {
      const unidad = await buscarUnidadMutation.mutateAsync(codigo)
      setCodigoUnidad(unidad.codigo_interno)
      setCategoria("")
      setSoloOperativos(false)
      setBusqueda("")
      setEquipoId(unidad.equipamiento_id)
      setUnidadEnfocadaId(unidad.id)
      setTab("listado")
      await queryClient.invalidateQueries({ queryKey: ["equipamiento"] })
      await queryClient.invalidateQueries({ queryKey: ["equipamiento-unidades", unidad.equipamiento_id] })
      if (actualizarUrl) {
        setSearchParams({ unidad: unidad.codigo_interno }, { replace: true })
      }
      setMensaje(t("equip.msgUnidadEncontrada", { codigo: unidad.codigo_interno }))
    } catch (error) {
      setUnidadEnfocadaId(null)
      setErrorLocal(mutationError(error, t("equip.errBuscarUnidad")))
    }
  }

  async function buscarUnidadPorCodigo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await resolverUnidadPorCodigo(codigoUnidad, true)
  }

  useEffect(() => {
    if (!token || !unidadParam) {
      return
    }
    void resolverUnidadPorCodigo(unidadParam)
    // Ejecuta solo cuando cambia el QR/código de unidad en la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, unidadParam])

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>{t("equip.title")}</h1>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            {t("equip.desc")}
          </p>
        </div>
        <div className="text-sm tracking-[0.16px] text-cds-textSecondary">
          {equiposQuery.isLoading ? t("equip.cargando") : t("equip.countN", { n: equiposFiltrados.length })}
        </div>
      </div>

      {mensaje ? <SuccessBanner message={mensaje} onClose={() => setMensaje(null)} className="mb-6" /> : null}
      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      <ModuleNav
        actions={
          tab === "nuevo" || tab === "eventos"
            ? [{ label: t("common.volverAlListado"), onClick: () => setTab("listado"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
            : puedeCrear
              ? [{ label: t("equip.nuevoEquipamiento"), onClick: () => setTab("nuevo"), icon: <Plus size={18} aria-hidden="true" /> }]
              : []
        }
        more={
          tab === "listado"
            ? [{ label: t("equip.historialGlobal"), onClick: () => setTab("eventos"), icon: <History size={18} aria-hidden="true" /> }]
            : []
        }
      />

      {tab === "listado" ? (
        <>
          <div className="mb-4 bg-cds-layer01 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px_220px_auto]">
              <label className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("common.buscar")}</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={18} aria-hidden="true" />
                  <Input className="pl-12" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder={t("equip.buscarPh")} />
                </div>
              </label>
              <form className="block" onSubmit={buscarUnidadPorCodigo}>
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("equip.buscarUnidadQr")}</span>
                <div className="flex gap-2">
                  <Input
                    value={codigoUnidad}
                    onChange={(event) => setCodigoUnidad(event.target.value)}
                    placeholder={t("equip.buscarUnidadQrPh")}
                  />
                  <Button type="submit" variant="secondary" size="compact" disabled={buscarUnidadMutation.isPending}>
                    <QrCode size={18} aria-hidden="true" />
                    {buscarUnidadMutation.isPending ? t("common.buscando") : t("common.buscar")}
                  </Button>
                </div>
              </form>
              <label className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("equip.categoria")}</span>
                {/* Select-look del handoff: chevron propio y sin la flecha gris
                    del navegador (appearance-none). */}
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-none border-0 border-b-2 border-b-transparent bg-cds-field pl-4 pr-10 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                    value={categoria}
                    onChange={(event) => {
                      setCategoria(event.target.value)
                      setEquipoId(null)
                    }}
                  >
                    <option value="">{t("equip.todas")}</option>
                    {(categoriasQuery.data?.categorias ?? []).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cds-textSecondary"
                    size={14}
                    aria-hidden="true"
                  />
                </div>
              </label>
              <div className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("equip.stockOperativo")}</span>
                {/* Toggle estilo handoff: activo → tinte petróleo + texto/borde
                    petróleo + barra inferior (inset); inactivo → blanco + borde. */}
                <button
                  type="button"
                  aria-pressed={soloOperativos}
                  onClick={() => {
                    setSoloOperativos((actual) => !actual)
                    setEquipoId(null)
                  }}
                  className={cn(
                    "inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap px-[14px] text-sm tracking-[0.16px] transition-colors lg:w-auto",
                    soloOperativos
                      ? "border border-[var(--lab-blue)] bg-lab-blueTint text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--lab-blue)]"
                      : "border border-cds-borderStrong bg-cds-background text-cds-textPrimary hover:border-cds-focus hover:bg-cds-layer01",
                  )}
                >
                  {soloOperativos ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  {soloOperativos ? t("equip.verTodos") : t("equip.soloEnUso")}
                </button>
              </div>
            </div>
          </div>

          <LeyendaEstadosEquipo />
          <EquipamientoTable equipos={equiposFiltrados} isLoading={equiposQuery.isLoading} selectedId={equipoSeleccionado?.id ?? null} onSelect={setEquipoId} />

          {equipoSeleccionado ? (
            <EquipoDetalle
              token={token!}
              usuarioId={usuario?.id ?? 0}
              equipo={equipoSeleccionado}
              unidadEnfocadaId={unidadEnfocadaId}
              puedeEditar={puedeEditar}
              puedeEvento={puedeEvento}
              onError={setErrorLocal}
              onUpdated={refrescar}
            />
          ) : (
            <div className="mt-6 bg-cds-layer01 p-4 text-sm text-cds-textSecondary">
              {t("equip.seleccionarEquipo")}
            </div>
          )}
        </>
      ) : null}

      {tab === "nuevo" && puedeCrear ? (
        <NuevoEquipamientoForm
          token={token!}
          onError={setErrorLocal}
          onSuccess={async (id, nombre) => {
            setEquipoId(id)
            setTab("listado")
            await refrescar(t("equip.msgCreado", { nombre }))
          }}
        />
      ) : null}

      {tab === "eventos" ? <HistorialGlobal token={token!} /> : null}
    </section>
  )
}

function EquipamientoTable({
  equipos,
  isLoading,
  selectedId,
  onSelect,
}: {
  equipos: Equipamiento[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }
  if (!equipos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("equip.sinEquipos")}</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("equip.thNombre")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.categoria")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("equip.total")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("equip.thDisponibles")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("equip.thEnUso")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("equip.thNoOperativas")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.ubicacion")}</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((equipo) => {
            const noOperativa = equipo.cantidad_no_operativa > 0
            return (
              <tr
                key={equipo.id}
                className={cn(
                  "cursor-pointer border-b border-cds-borderSubtle transition-colors",
                  // Fila con unidades no operativas: tinte coral + barra roja a la
                  // izquierda (handoff). Si no, hover gris y resalte al seleccionar.
                  noOperativa
                    ? "bg-lab-critTint shadow-[inset_2px_0_0_var(--cds-support-error)]"
                    : cn("hover:bg-cds-layer01", selectedId === equipo.id && "bg-cds-layer01"),
                )}
                onClick={() => onSelect(equipo.id)}
              >
                <td className="h-[58px] px-4">
                  <div className="flex items-center gap-[11px]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: colorPuntoEquipo(equipo) }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 leading-[1.3]">
                      <div className="font-medium tracking-[0.16px]">{equipo.nombre}</div>
                      <div className="text-xs text-cds-textSecondary">{[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || t("equip.sinMarca")}</div>
                    </div>
                  </div>
                </td>
                <td className="h-[58px] px-4">
                  {equipo.categoria ? (
                    // Chip cuadrado con borde, igual a los chips de Reactivos
                    // (esquinas rectas + tinte petróleo).
                    <span className="inline-flex items-center rounded-none border border-[#cddde2] bg-lab-blueTint px-2.5 py-0.5 text-xs tracking-[0.32px] text-cds-linkPrimary">
                      {equipo.categoria}
                    </span>
                  ) : (
                    <span className="text-cds-textPlaceholder">—</span>
                  )}
                </td>
                <td className="h-[58px] px-4 text-right font-mono">{formatNumber(equipo.cantidad_unidades)}</td>
                <td
                  className={cn(
                    "h-[58px] px-4 text-right font-mono",
                    equipo.cantidad_disponible > 0 ? "text-cds-supportSuccess" : "text-cds-textPlaceholder",
                  )}
                >
                  {formatNumber(equipo.cantidad_disponible)}
                </td>
                <td
                  className={cn(
                    "h-[58px] px-4 text-right font-mono",
                    equipo.cantidad_en_uso > 0 ? "font-semibold text-cds-linkPrimary" : "text-cds-textPlaceholder",
                  )}
                >
                  {formatNumber(equipo.cantidad_en_uso)}
                </td>
                <td
                  className={cn(
                    "h-[58px] px-4 text-right font-mono",
                    noOperativa ? "font-semibold text-cds-supportError" : "text-cds-textPlaceholder",
                  )}
                >
                  {formatNumber(equipo.cantidad_no_operativa)}
                </td>
                <td className="h-[58px] px-4 text-cds-textSecondary">{equipo.ubicacion || "-"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EquipoDetalle({
  token,
  usuarioId,
  equipo,
  unidadEnfocadaId,
  puedeEditar,
  puedeEvento,
  onError,
  onUpdated,
}: {
  token: string
  usuarioId: number
  equipo: Equipamiento
  unidadEnfocadaId: number | null
  puedeEditar: boolean
  puedeEvento: boolean
  onError: (message: string | null) => void
  onUpdated: (message?: string) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const eventosQuery = useQuery({
    queryKey: ["eventos-equipamiento", equipo.id],
    queryFn: () => api.eventosEquipamiento(token, equipo.id, 200),
    enabled: Boolean(token && equipo.id),
  })
  const unidadesQuery = useQuery({
    queryKey: ["equipamiento-unidades", equipo.id],
    queryFn: () => api.equipamientoUnidades(token, equipo.id),
    enabled: Boolean(token && equipo.id),
  })
  const proveedoresQuery = useQuery({
    queryKey: ["proveedores", true],
    queryFn: () => api.proveedores(token, true),
    enabled: Boolean(token && puedeEditar),
  })
  const editarMutation = useMutation({
    mutationFn: (data: EquipamientoActualizar) => api.actualizarEquipamiento(token, equipo.id, data),
  })
  const actualizarUnidadMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EquipamientoUnidadActualizar }) =>
      api.actualizarEquipamientoUnidad(token, id, data),
  })
  const eliminarUnidadMutation = useMutation({
    mutationFn: (id: number) => api.eliminarEquipamientoUnidad(token, id),
  })
  const eventoMutation = useMutation({
    mutationFn: (data: EventoEquipamientoCrear) => api.registrarEventoEquipamiento(token, data),
  })
  const eventos = eventosQuery.data ?? eventosVacios
  const unidades = unidadesQuery.data ?? unidadesVacias
  const proveedores = proveedoresQuery.data ?? proveedoresVacios
  const [editandoEquipo, setEditandoEquipo] = useState(false)
  const [unidadEventoId, setUnidadEventoId] = useState("")
  const [unidadesEtiqueta, setUnidadesEtiqueta] = useState<number[]>([])
  const [formatoEtiqueta, setFormatoEtiqueta] = useState("rollo_70x40")
  const etiquetasMutation = useMutation({
    mutationFn: ({ ids, formato }: { ids: number[]; formato: string }) =>
      api.equipamientoEtiquetasPdf(token, ids, formato),
  })
  const formatoEtiquetaSeleccionado = formatosEtiquetaEquipo.find((formato) => formato.clave === formatoEtiqueta) ?? formatosEtiquetaEquipo[0]

  useEffect(() => {
    setEditandoEquipo(false)
    setUnidadEventoId(unidadEnfocadaId ? String(unidadEnfocadaId) : "")
    setUnidadesEtiqueta([])
  }, [equipo.id, unidadEnfocadaId])

  async function registrarEvento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    onError(null)
    try {
      const form = new FormData(formElement)
      const tipo = String(form.get("tipo") ?? "alta") as TipoEvento
      const unidadIdRaw = String(form.get("unidad_id") ?? "").trim()
      const unidadId = unidadIdRaw ? Number(unidadIdRaw) : null
      const cantidad = unidadId ? 1 : requireFiniteNumber(parseFormNumber(form.get("cantidad"), 1), t("equip.errCantidad"))
      const motivo = String(form.get("motivo") ?? "").trim()
      if (unidadIdRaw && !Number.isInteger(unidadId)) {
        throw new Error(t("equip.errUnidad"))
      }
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error(t("equip.errCantidadEntero"))
      }
      if (!motivo) {
        throw new Error(t("equip.errMotivo"))
      }
      await eventoMutation.mutateAsync({
        equipamiento_id: equipo.id,
        usuario_id: usuarioId,
        tipo,
        cantidad,
        motivo,
        unidad_id: unidadId,
      })
      formElement.reset()
      setUnidadEventoId("")
      await onUpdated(t("equip.msgEvento", { tipo: t(`equip.tipoEvento.${tipo}`) }))
    } catch (error) {
      onError(mutationError(error, t("equip.errEvento")))
    }
  }

  async function guardarEquipo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onError(null)
    try {
      const nombre = String(form.get("nombre") ?? "").trim()
      const costoRaw = parseFormNumber(form.get("costo_total"), 0)
      const costo = requireFiniteNumber(costoRaw, t("equip.errCosto"))
      if (!nombre) {
        throw new Error(t("equip.errNombre"))
      }
      if (costo < 0) {
        throw new Error(t("equip.errCostoNeg"))
      }
      const proveedorId = Number(form.get("proveedor_id") || 0)
      await editarMutation.mutateAsync({
        nombre,
        categoria: nullable(form.get("categoria")),
        marca: nullable(form.get("marca")),
        modelo: nullable(form.get("modelo")),
        numero_serie: equipo.numero_serie ?? null,
        ubicacion: equipo.ubicacion ?? null,
        proveedor_id: proveedorId || null,
        enlace_compra: nullable(form.get("enlace_compra")),
        costo_total: costo > 0 ? costo : null,
        notas: nullable(form.get("notas")),
      })
      setEditandoEquipo(false)
      await onUpdated(t("equip.msgActualizado"))
    } catch (error) {
      onError(mutationError(error, t("equip.errActualizar")))
    }
  }

  async function guardarUnidad(unidad: EquipamientoUnidad, data: EquipamientoUnidadActualizar) {
    onError(null)
    try {
      await actualizarUnidadMutation.mutateAsync({ id: unidad.id, data })
      await onUpdated(t("equip.msgUnidadActualizada", { codigo: unidad.codigo_interno }))
    } catch (error) {
      onError(mutationError(error, t("equip.errActualizarUnidad")))
    }
  }

  async function eliminarUnidad(unidad: EquipamientoUnidad) {
    onError(null)
    try {
      await eliminarUnidadMutation.mutateAsync(unidad.id)
      setUnidadesEtiqueta((actual) => actual.filter((id) => id !== unidad.id))
      await onUpdated(t("equip.msgUnidadEliminada", { codigo: unidad.codigo_interno }))
    } catch (error) {
      onError(mutationError(error, t("equip.errEliminarUnidad")))
    }
  }

  // Préstamo por unidad: agarrar (uso_inicio) / liberar (uso_fin). Sin motivo.
  async function marcarUso(unidad: EquipamientoUnidad, tipo: "uso_inicio" | "uso_fin") {
    onError(null)
    try {
      await eventoMutation.mutateAsync({
        equipamiento_id: equipo.id,
        usuario_id: usuarioId,
        tipo,
        cantidad: 1,
        unidad_id: unidad.id,
      })
      await onUpdated(
        t(tipo === "uso_inicio" ? "equip.msgEnUso" : "equip.msgLiberada", { codigo: unidad.codigo_interno }),
      )
    } catch (error) {
      onError(mutationError(error, t("equip.errEvento")))
    }
  }

  async function marcarRetornoServicio(unidad: EquipamientoUnidad) {
    onError(null)
    try {
      await eventoMutation.mutateAsync({
        equipamiento_id: equipo.id,
        usuario_id: usuarioId,
        tipo: "reparacion",
        cantidad: 1,
        motivo: t(unidad.estado === "calibracion" ? "equip.motivoFinCalibracion" : "equip.motivoRetornoServicio"),
        unidad_id: unidad.id,
      })
      await onUpdated(t("equip.msgRetornoServicio", { codigo: unidad.codigo_interno }))
    } catch (error) {
      onError(mutationError(error, t("equip.errEvento")))
    }
  }

  function toggleUnidadEtiqueta(id: number) {
    setUnidadesEtiqueta((actual) =>
      actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id],
    )
  }

  // Todas marcadas (para alternar el botón "Seleccionar todas" / "Quitar todas").
  const todasEtiquetasSeleccionadas =
    unidades.length > 0 && unidades.every((unidad) => unidadesEtiqueta.includes(unidad.id))

  function alternarTodasEtiquetas() {
    setUnidadesEtiqueta(todasEtiquetasSeleccionadas ? [] : unidades.map((unidad) => unidad.id))
  }

  async function descargarEtiquetas() {
    onError(null)
    try {
      if (!unidadesEtiqueta.length) {
        throw new Error(t("equip.errEtiquetasSeleccion"))
      }
      if (unidadesEtiqueta.length > formatoEtiquetaSeleccionado.maxPorPdf) {
        throw new Error(t("equip.errEtiquetasMax", { n: formatoEtiquetaSeleccionado.maxPorPdf }))
      }
      const blob = await etiquetasMutation.mutateAsync({ ids: unidadesEtiqueta, formato: formatoEtiqueta })
      const nombre = equipo.nombre.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "")
      downloadBlob(blob, `etiquetas_equipamiento_${nombre || equipo.id}.pdf`)
    } catch (error) {
      onError(mutationError(error, t("equip.errEtiquetas")))
    }
  }

  return (
    <section className="mt-6 bg-cds-layer01 p-4">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-1 text-cds-textSecondary">
          <Microscope size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="min-w-0 text-[24px] leading-[1.33]">{equipo.nombre}</h2>
            {puedeEditar ? (
              // Lápiz cuadrado (handoff): IconButton con borde, no un glifo suelto.
              <button
                type="button"
                onClick={() => setEditandoEquipo((actual) => !actual)}
                aria-label={t("equip.editarEquipo")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-cds-borderSubtle bg-cds-background text-cds-textSecondary transition-colors hover:border-cds-focus hover:bg-cds-layer01 hover:text-cds-linkPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cds-focus"
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
            ) : null}
            {/* Estado global del equipo: en servicio mientras quede ≥1 unidad
                disponible o en uso; si no, fuera de servicio (coral). */}
            {equipo.cantidad_unidades > 0 ? (
              <EstadoEquipoChip enServicio={equipo.cantidad_disponible + equipo.cantidad_en_uso > 0} />
            ) : null}
          </div>
          <p className="mt-2 text-sm text-cds-textSecondary">{[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || t("equip.sinMarca")}</p>
        </div>
      </div>

      {/* Cartas de métricas y, pegada debajo (hairline), la tira de metadatos:
          Categoría · Proveedor · Costo total · Fecha de ingreso. */}
      <div className="grid gap-px bg-cds-borderSubtle sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t("equip.total")} value={formatNumber(equipo.cantidad_unidades)} />
        <Metric label={t("equip.mDisponibles")} value={formatNumber(equipo.cantidad_disponible)} tone="accent" />
        <Metric label={t("equip.mEnUso")} value={formatNumber(equipo.cantidad_en_uso)} />
        <Metric label={t("equip.mNoOperativas")} value={formatNumber(equipo.cantidad_no_operativa)} tone="mutedError" />
      </div>
      <div className="mb-7 mt-px grid gap-px bg-cds-borderSubtle sm:grid-cols-2 lg:grid-cols-4">
        <MetaCell label={t("equip.categoria")} value={equipo.categoria || ""} />
        <MetaCell label={t("equip.proveedor")} value={equipo.proveedor_nombre || ""} />
        <MetaCell label={t("equip.iCosto")} value={equipo.costo_total == null ? "" : `$${formatNumber(equipo.costo_total)}`} />
        <MetaCell label={t("equip.iFechaIngreso")} value={formatDate(equipo.fecha_ingreso)} mono />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {puedeEditar && editandoEquipo ? (
            <form key={equipo.id} className="mb-5 border-t border-cds-borderSubtle pt-4" onSubmit={guardarEquipo}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3>{t("equip.editarEquipo")}</h3>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="compact" onClick={() => setEditandoEquipo(false)}>
                    {t("common.cancelar")}
                  </Button>
                  <Button type="submit" size="compact" disabled={editarMutation.isPending}>
                    <Save size={18} aria-hidden="true" />
                    {editarMutation.isPending ? t("common.guardando") : t("equip.guardarEquipo")}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label={t("equip.fNombre")} name="nombre" defaultValue={equipo.nombre} required />
                <Field label={t("equip.categoria")} name="categoria" defaultValue={equipo.categoria ?? ""} />
                <Field label={t("equip.fMarca")} name="marca" defaultValue={equipo.marca ?? ""} />
                <Field label={t("equip.fModelo")} name="modelo" defaultValue={equipo.modelo ?? ""} />
                <label className="block">
                  <Label className="mb-2" htmlFor={`proveedor-edit-${equipo.id}`}>{t("equip.proveedor")}</Label>
                  <select
                    id={`proveedor-edit-${equipo.id}`}
                    name="proveedor_id"
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                    defaultValue={equipo.proveedor_id ?? ""}
                  >
                    <option value="">{t("equip.sinProveedor")}</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label={t("equip.fEnlace")} name="enlace_compra" defaultValue={equipo.enlace_compra ?? ""} />
                <Field label={t("equip.fCosto")} name="costo_total" inputMode="decimal" defaultValue={equipo.costo_total ?? ""} />
                <Field className="md:col-span-2 xl:col-span-3" label={t("equip.notas")} name="notas" defaultValue={equipo.notas ?? ""} />
              </div>
              <div className="mt-3 text-xs text-cds-textSecondary">{t("equip.editarEquipoHelp")}</div>
            </form>
          ) : null}
          {/* Categoría/Proveedor/Costo/Fecha viven en la tira de metadatos de
              arriba; acá sólo enlace y notas, y sólo si están cargados. */}
          {equipo.enlace_compra || equipo.notas ? (
            <div className="mb-5 grid gap-3 text-sm md:grid-cols-2">
              {equipo.enlace_compra ? <Info label={t("equip.iEnlace")} value={equipo.enlace_compra} /> : null}
              {equipo.notas ? <Info label={t("equip.notas")} value={equipo.notas} /> : null}
            </div>
          ) : null}

          <div>
            <div className="mb-5">
              <div className="mb-3 flex items-end justify-between gap-3 border-b border-cds-borderSubtle pb-3">
                <h3 className="leading-[1.4]">{t("equip.unidadesTitulo")}</h3>
                <span className="text-xs text-cds-textPlaceholder">{t("equip.countN", { n: unidades.length })}</span>
              </div>
              <UnidadesTable
                unidades={unidades}
                isLoading={unidadesQuery.isLoading}
                unidadEnfocadaId={unidadEnfocadaId}
                puedeEditar={puedeEditar}
                puedeEvento={puedeEvento}
                isSaving={actualizarUnidadMutation.isPending}
                isDeleting={eliminarUnidadMutation.isPending}
                isUsando={eventoMutation.isPending}
                onSave={guardarUnidad}
                onDelete={eliminarUnidad}
                onMarcarUso={marcarUso}
                onMarcarRetornoServicio={marcarRetornoServicio}
              />
              {/* Caja de impresión (handoff): marco propio, select Carbon de
                  tamaño + checklist de unidades a imprimir (con "Seleccionar
                  todas") + botón outline "Imprimir códigos" y pie con el límite. */}
              <div className="mt-6 border border-cds-borderSubtle bg-cds-background p-[16px_18px]">
                <div className="mb-2.5 text-xs uppercase tracking-[0.32px] text-cds-textSecondary">{t("equip.tamanoEtiqueta")}</div>
                <select
                  id={`formato-equipo-${equipo.id}`}
                  aria-label={t("equip.tamanoEtiqueta")}
                  className="h-10 w-full border-0 border-b-2 border-b-cds-borderStrong bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                  value={formatoEtiqueta}
                  onChange={(event) => setFormatoEtiqueta(event.target.value)}
                >
                  {formatosEtiquetaEquipo.map((formato) => (
                    <option key={formato.clave} value={formato.clave}>
                      {formato.nombre}
                    </option>
                  ))}
                </select>

                {/* Selección de unidades a imprimir (antes vivía como checkbox
                    por fila en la tabla; ahora se elige desde acá). */}
                <div className="mb-2 mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.32px] text-cds-textSecondary">{t("equip.unidadesAImprimir")}</span>
                  {unidades.length ? (
                    <button
                      type="button"
                      onClick={alternarTodasEtiquetas}
                      className="text-xs text-cds-linkPrimary underline-offset-2 hover:underline"
                    >
                      {todasEtiquetasSeleccionadas ? t("equip.quitarTodas") : t("equip.seleccionarTodas")}
                    </button>
                  ) : null}
                </div>
                {unidades.length ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    {unidades.map((unidad) => (
                      <label key={unidad.id} className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={unidadesEtiqueta.includes(unidad.id)}
                          onChange={() => toggleUnidadEtiqueta(unidad.id)}
                          aria-label={t("equip.seleccionarUnidad", { codigo: unidad.codigo_interno })}
                        />
                        <span className="truncate font-mono text-cds-textPrimary">{unidad.codigo_interno}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-cds-textPlaceholder">{t("equip.sinUnidadesImprimir")}</div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={descargarEtiquetas}
                    disabled={etiquetasMutation.isPending || !unidadesEtiqueta.length}
                    className="inline-flex h-10 items-center gap-2 whitespace-nowrap border border-cds-borderStrong bg-cds-background px-4 text-sm tracking-[0.16px] text-cds-linkPrimary transition-colors hover:border-cds-focus hover:bg-cds-layer01 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Printer size={16} aria-hidden="true" />
                    {etiquetasMutation.isPending ? t("equip.generandoEtiquetas") : t("equip.imprimirCodigos")}
                  </button>
                  <span className="text-xs text-cds-textPlaceholder">
                    {t("equip.maxEtiquetasPdf", { n: formatoEtiquetaSeleccionado.maxPorPdf })}
                    {unidadesEtiqueta.length ? ` · ${t("equip.nSeleccionadas", { n: unidadesEtiqueta.length })}` : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-cds-borderSubtle pt-5">
            <h3 className="mb-4">{t("equip.historialEquipo")}</h3>
            <EventosList eventos={eventos} isLoading={eventosQuery.isLoading} />
            </div>
          </div>
        </div>

        {puedeEvento ? (
          // Panel lateral (handoff): marco + cabecera con título y llave inglesa;
          // el form ya no empuja la tabla, queda fijo a la derecha (340px).
          <form className="border border-cds-borderSubtle bg-cds-background" onSubmit={registrarEvento}>
            <div className="flex items-center justify-between gap-2 border-b border-cds-borderSubtle bg-cds-layer01 px-[18px] py-[15px]">
              <h3 className="text-[15px] font-semibold leading-none">{t("equip.registrarEvento")}</h3>
              <Wrench size={17} className="text-cds-textSecondary" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-4 p-[18px]">
              <label className="block">
                <Label className="mb-2" htmlFor={`tipo-${equipo.id}`}>{t("equip.tipo")}</Label>
                <select id={`tipo-${equipo.id}`} name="tipo" className="h-10 w-full border-0 border-b-2 border-b-cds-borderStrong bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none">
                  {tiposEventoFormulario.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {t(`equip.tipoEvento.${tipo}`)}
                    </option>
                  ))}
                </select>
              </label>
              <Field label={t("equip.fCantidad")} name="cantidad" defaultValue="1" inputMode="numeric" required />
              <label className="block">
                <Label className="mb-2" htmlFor={`unidad-${equipo.id}`}>{t("equip.fUnidad")}</Label>
                <select
                  id={`unidad-${equipo.id}`}
                  name="unidad_id"
                  className="h-10 w-full border-0 border-b-2 border-b-cds-borderStrong bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                  value={unidadEventoId}
                  onChange={(event) => setUnidadEventoId(event.target.value)}
                >
                  <option value="">{t("equip.fUnidadSinEspecificar")}</option>
                  {unidades.filter((unidad) => unidad.estado !== "baja").map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.codigo_interno} · {t(`equip.estadoUnidad.${unidad.estado}`)}
                    </option>
                  ))}
                </select>
                {unidadEventoId ? (
                  <div className="mt-1 text-xs text-cds-textSecondary">{t("equip.fUnidadCantidad")}</div>
                ) : null}
              </label>
              <Field label={t("equip.fMotivo")} name="motivo" placeholder={t("equip.fMotivoPh")} required />
              <Button className="mt-1 w-full" type="submit" disabled={eventoMutation.isPending}>
                <Wrench size={18} aria-hidden="true" />
                {eventoMutation.isPending ? t("equip.registrando") : t("equip.registrarEvento")}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  )
}

function UnidadesTable({
  unidades,
  isLoading,
  unidadEnfocadaId,
  puedeEditar,
  puedeEvento,
  isSaving,
  isDeleting,
  isUsando,
  onSave,
  onDelete,
  onMarcarUso,
  onMarcarRetornoServicio,
}: {
  unidades: EquipamientoUnidad[]
  isLoading: boolean
  unidadEnfocadaId: number | null
  puedeEditar: boolean
  puedeEvento: boolean
  isSaving: boolean
  isDeleting: boolean
  isUsando: boolean
  onSave: (unidad: EquipamientoUnidad, data: EquipamientoUnidadActualizar) => void | Promise<void>
  onDelete: (unidad: EquipamientoUnidad) => void | Promise<void>
  onMarcarUso: (unidad: EquipamientoUnidad, tipo: "uso_inicio" | "uso_fin") => void | Promise<void>
  onMarcarRetornoServicio: (unidad: EquipamientoUnidad) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [ediciones, setEdiciones] = useState<Record<number, EquipamientoUnidadActualizar>>({})

  useEffect(() => {
    const siguientes: Record<number, EquipamientoUnidadActualizar> = {}
    unidades.forEach((unidad) => {
      siguientes[unidad.id] = {
        numero_serie: unidad.numero_serie ?? "",
        ubicacion: unidad.ubicacion ?? "",
      }
    })
    setEdiciones(siguientes)
  }, [unidades])

  useEffect(() => {
    if (!unidadEnfocadaId) {
      return
    }
    document.getElementById(`equip-unidad-${unidadEnfocadaId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  }, [unidadEnfocadaId])

  function actualizarCampo(id: number, campo: keyof EquipamientoUnidadActualizar, value: string) {
    setEdiciones((actual) => ({
      ...actual,
      [id]: {
        ...(actual[id] ?? {}),
        [campo]: value,
      },
    }))
  }

  async function confirmarBorrado(unidad: EquipamientoUnidad) {
    if (!window.confirm(t("equip.confirmEliminarUnidad", { codigo: unidad.codigo_interno }))) {
      return
    }
    await onDelete(unidad)
  }

  if (isLoading) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("equip.cargandoUnidades")}</div>
  }
  if (!unidades.length) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("equip.sinUnidades")}</div>
  }
  // La columna de acciones agrupa préstamo (en uso/liberar, si puedeEvento) y
  // guardar/eliminar (si puedeEditar). Antes el préstamo vivía bajo el badge y
  // hacía que las filas "en uso" quedaran más altas; ahora todo va a la derecha
  // y la fila tiene alto fijo (h-14) para que ninguna salte.
  const puedeAcciones = puedeEditar || puedeEvento
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-background text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-3 font-normal">{t("equip.thCodigo")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.thEstado")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.iSerie")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.ubicacion")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.thUltimoEvento")}</th>
            {puedeAcciones ? <th className="h-10 px-3 text-right font-normal">{t("common.acciones")}</th> : null}
          </tr>
        </thead>
        <tbody>
          {unidades.map((unidad) => {
            const edicion = ediciones[unidad.id] ?? {}
            const enfocada = unidad.id === unidadEnfocadaId
            return (
              <tr
                id={`equip-unidad-${unidad.id}`}
                key={unidad.id}
                className={cn(
                  "border-b border-cds-borderSubtle",
                  enfocada && "outline outline-2 outline-offset-[-2px] outline-cds-focus",
                )}
              >
                <td className="h-14 px-3">
                  <span className="inline-flex items-center gap-2 font-mono text-xs">
                    <QrCode size={15} aria-hidden="true" />
                    {unidad.codigo_interno}
                  </span>
                </td>
                <td className="h-14 px-3">
                  {/* Estado en una sola línea: badge + (si está en uso) quién la
                      tiene, como chip al lado. Sin botones acá. */}
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <EstadoUnidadBadge estado={unidad.estado} />
                    {unidad.estado === "en_uso" && unidad.ultimo_evento_usuario ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-cds-textSecondary">
                        <span className="text-cds-textPlaceholder" aria-hidden="true">·</span>
                        <User size={12} aria-hidden="true" /> {unidad.ultimo_evento_usuario}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="h-14 px-3 text-cds-textSecondary">
                  {puedeEditar ? (
                    <Input
                      value={edicion.numero_serie ?? ""}
                      onChange={(event) => actualizarCampo(unidad.id, "numero_serie", event.target.value)}
                      aria-label={t("equip.iSerie")}
                    />
                  ) : (
                    unidad.numero_serie || "-"
                  )}
                </td>
                <td className="h-14 px-3 text-cds-textSecondary">
                  {puedeEditar ? (
                    <Input
                      value={edicion.ubicacion ?? ""}
                      onChange={(event) => actualizarCampo(unidad.id, "ubicacion", event.target.value)}
                      aria-label={t("equip.ubicacion")}
                    />
                  ) : (
                    unidad.ubicacion || "-"
                  )}
                </td>
                <td className="h-14 px-3 text-cds-textSecondary">
                  {unidad.ultimo_evento_tipo
                    ? (esMotivoFinCalibracion(unidad.ultimo_evento_tipo, unidad.ultimo_evento_motivo)
                        ? t("equip.calibracionFinalizada")
                        : t(`equip.tipoEvento.${unidad.ultimo_evento_tipo}`))
                    : "-"}
                </td>
                {puedeAcciones ? (
                  <td className="h-14 px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {puedeEvento && unidad.estado === "operativa" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="compact"
                          className="h-[34px] whitespace-nowrap px-2.5 text-xs"
                          onClick={() => onMarcarUso(unidad, "uso_inicio")}
                          disabled={isUsando}
                        >
                          <LogIn size={14} aria-hidden="true" /> {t("equip.marcarEnUso")}
                        </Button>
                      ) : null}
                      {puedeEvento && unidad.estado === "en_uso" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="compact"
                          className="h-[34px] whitespace-nowrap px-2.5 text-xs"
                          onClick={() => onMarcarUso(unidad, "uso_fin")}
                          disabled={isUsando}
                        >
                          <LogOut size={14} aria-hidden="true" /> {t("equip.liberar")}
                        </Button>
                      ) : null}
                      {puedeEvento && (unidad.estado === "calibracion" || unidad.estado === "fuera_de_uso") ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="compact"
                          className="h-[34px] whitespace-nowrap px-2.5 text-xs"
                          onClick={() => onMarcarRetornoServicio(unidad)}
                          disabled={isUsando}
                        >
                          <Check size={14} aria-hidden="true" /> {t("equip.volverServicio")}
                        </Button>
                      ) : null}
                      {puedeEditar ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            className="h-[34px] w-[34px]"
                            onClick={() => onSave(unidad, {
                              numero_serie: nullable(edicion.numero_serie ?? ""),
                              ubicacion: nullable(edicion.ubicacion ?? ""),
                            })}
                            disabled={isSaving}
                            aria-label={t("equip.guardarUnidad", { codigo: unidad.codigo_interno })}
                          >
                            <Save size={15} aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-[34px] w-[34px] hover:border-cds-supportError hover:bg-lab-critTint hover:text-cds-supportError"
                            onClick={() => confirmarBorrado(unidad)}
                            disabled={isDeleting}
                            aria-label={t("equip.eliminarUnidad", { codigo: unidad.codigo_interno })}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function NuevoEquipamientoForm({
  token,
  onError,
  onSuccess,
}: {
  token: string
  onError: (message: string | null) => void
  onSuccess: (id: number, nombre: string) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const crearMutation = useMutation({
    mutationFn: (data: EquipamientoCrear) => api.crearEquipamiento(token, data),
  })
  const proveedoresQuery = useQuery({
    queryKey: ["proveedores", true],
    queryFn: () => api.proveedores(token, true),
  })
  const proveedores = proveedoresQuery.data ?? proveedoresVacios
  // Proveedor controlado para poder seleccionar el recién creado inline.
  const [proveedorId, setProveedorId] = useState("")
  const [creandoProveedor, setCreandoProveedor] = useState(false)
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState("")
  const crearProveedorMutation = useMutation({
    mutationFn: (nombre: string) => api.crearProveedor(token, { nombre }),
  })

  // Alta rápida de proveedor sin salir del form: lo crea, refresca la lista y lo
  // deja seleccionado.
  async function guardarNuevoProveedor() {
    const nombre = nuevoProveedorNombre.trim()
    if (!nombre) {
      return
    }
    onError(null)
    try {
      const { id } = await crearProveedorMutation.mutateAsync(nombre)
      await queryClient.invalidateQueries({ queryKey: ["proveedores", true] })
      setProveedorId(String(id))
      setCreandoProveedor(false)
      setNuevoProveedorNombre("")
    } catch (error) {
      onError(mutationError(error, t("equip.errCrearProveedor")))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    onError(null)
    try {
      const form = new FormData(formElement)
      const nombre = String(form.get("nombre") ?? "").trim()
      const cantidadInicial = requireFiniteNumber(parseFormNumber(form.get("cantidad_inicial"), 0), t("equip.errCantInicial"))
      const costoRaw = parseFormNumber(form.get("costo_total"), 0)
      const costo = requireFiniteNumber(costoRaw, t("equip.errCosto"))
      if (!nombre) {
        throw new Error(t("equip.errNombre"))
      }
      if (!Number.isInteger(cantidadInicial) || cantidadInicial < 0) {
        throw new Error(t("equip.errCantInicialEntero"))
      }
      if (costo < 0) {
        throw new Error(t("equip.errCostoNeg"))
      }
      const proveedorIdNum = Number(proveedorId || 0)
      const payload: EquipamientoCrear = {
        nombre,
        categoria: nullable(form.get("categoria")),
        marca: nullable(form.get("marca")),
        modelo: nullable(form.get("modelo")),
        numero_serie: nullable(form.get("numero_serie")),
        ubicacion: nullable(form.get("ubicacion")),
        proveedor_id: proveedorIdNum || null,
        enlace_compra: nullable(form.get("enlace_compra")),
        costo_total: costo > 0 ? costo : null,
        cantidad_inicial: cantidadInicial,
        notas: nullable(form.get("notas")),
      }
      const resultado = await crearMutation.mutateAsync(payload)
      formElement.reset()
      setProveedorId("")
      await onSuccess(resultado.id, nombre)
    } catch (error) {
      onError(mutationError(error, t("equip.errCrear")))
    }
  }

  return (
    <form className="max-w-5xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">{t("equip.nuevoEquipamiento")}</h2>
        <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
          {t("equip.formDesc")}
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("equip.fNombre")} name="nombre" required />
        <Field label={t("equip.categoria")} name="categoria" placeholder={t("equip.fCategoriaPh")} />
        <Field label={t("equip.fMarca")} name="marca" />
        <Field label={t("equip.fModelo")} name="modelo" />
        <Field label={t("equip.fSerie")} name="numero_serie" />
        <Field label={t("equip.ubicacion")} name="ubicacion" />
        <label className="block">
          <Label className="mb-2" htmlFor="proveedor_id">{t("equip.proveedor")}</Label>
          {creandoProveedor ? (
            // Alta inline: campo de nombre + crear/cancelar, sin salir del form.
            <div className="flex gap-2">
              <Input
                autoFocus
                value={nuevoProveedorNombre}
                onChange={(event) => setNuevoProveedorNombre(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void guardarNuevoProveedor()
                  }
                }}
                placeholder={t("equip.nuevoProveedorPh")}
                aria-label={t("equip.nuevoProveedor")}
              />
              <Button
                type="button"
                variant="secondary"
                size="compact"
                className="whitespace-nowrap"
                onClick={guardarNuevoProveedor}
                disabled={crearProveedorMutation.isPending || !nuevoProveedorNombre.trim()}
              >
                {crearProveedorMutation.isPending ? t("common.creando") : t("equip.crearProveedorBtn")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={() => {
                  setCreandoProveedor(false)
                  setNuevoProveedorNombre("")
                }}
              >
                {t("common.cancelar")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                id="proveedor_id"
                value={proveedorId}
                onChange={(event) => setProveedorId(event.target.value)}
                className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
              >
                <option value="">{t("equip.sinProveedor")}</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCreandoProveedor(true)}
                aria-label={t("equip.nuevoProveedor")}
                title={t("equip.nuevoProveedor")}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-cds-borderSubtle bg-cds-background text-cds-textSecondary transition-colors hover:border-cds-focus hover:text-cds-linkPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cds-focus"
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </label>
        <Field label={t("equip.fEnlace")} name="enlace_compra" />
        <Field label={t("equip.fCosto")} name="costo_total" inputMode="decimal" defaultValue="0" />
        <Field label={t("equip.fCantInicial")} name="cantidad_inicial" inputMode="numeric" defaultValue="1" />
        <Field className="md:col-span-2" label={t("equip.notas")} name="notas" />
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Plus size={18} aria-hidden="true" />
        {crearMutation.isPending ? t("common.creando") : t("equip.crearEquipamiento")}
      </Button>
    </form>
  )
}

function HistorialGlobal({ token }: { token: string }) {
  const { t } = useTranslation()
  const [limite, setLimite] = useState("100")
  const [tipo, setTipo] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const limiteNumero = Number(limite)
  const eventosQuery = useQuery({
    queryKey: ["eventos-equipamiento", "global", limiteNumero || 100],
    queryFn: () => api.eventosEquipamientoGlobal(token, Number.isFinite(limiteNumero) ? Math.min(Math.max(Math.trunc(limiteNumero), 1), 500) : 100),
  })
  const eventos = eventosQuery.data ?? eventosVacios
  const filtrados = eventos.filter((evento) => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    const tipoOk = tipo ? evento.tipo === tipo : true
    const textoOk = texto
      ? [evento.equipamiento_nombre, evento.unidad_codigo, evento.usuario_nombre, evento.motivo].some((value) => String(value || "").toLocaleLowerCase("es").includes(texto))
      : true
    return tipoOk && textoOk
  })

  return (
    <>
      <div className="mb-4 grid gap-4 md:grid-cols-[180px_220px_minmax(0,1fr)]">
        <Field label={t("equip.fLimite")} name="limite_eventos" value={limite} onChange={(event) => setLimite(event.target.value)} inputMode="numeric" />
        <label className="block">
          <Label className="mb-2" htmlFor="tipo_evento_global">{t("equip.tipo")}</Label>
          <select id="tipo_evento_global" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none" value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="">{t("equip.todos")}</option>
            {tiposEventoHistorial.map((item) => (
              <option key={item} value={item}>
                {t(`equip.tipoEvento.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <Field label={t("common.buscar")} name="buscar_evento" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder={t("equip.buscarEventoPh")} />
      </div>
      <EventosTable eventos={filtrados} isLoading={eventosQuery.isLoading} />
    </>
  )
}

function EventosList({ eventos, isLoading }: { eventos: EventoEquipamiento[]; isLoading: boolean }) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("equip.cargandoEventos")}</div>
  }
  if (!eventos.length) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("equip.sinEventos")}</div>
  }
  return (
    <div className="space-y-3">
      {eventos.slice(0, 8).map((evento) => (
        <article key={evento.id} className="border border-cds-borderSubtle bg-cds-background p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tipoEventoColor[evento.tipo] }} aria-hidden="true" />
              <span className="font-medium" style={{ color: tipoEventoColor[evento.tipo] }}>{etiquetaTipoEvento(t, evento)}</span>
            </span>
            <span className="font-mono text-xs text-cds-textSecondary">{formatDateTime(evento.fecha)}</span>
          </div>
          <div className="mt-2 text-cds-textSecondary">
            {t("equip.unidadesPor", { cantidad: evento.cantidad, usuario: evento.usuario_nombre })}
            {evento.unidad_codigo ? ` · ${evento.unidad_codigo}` : ""}
          </div>
          {evento.motivo ? <div className="mt-2">{evento.motivo}</div> : null}
        </article>
      ))}
    </div>
  )
}

function EventosTable({ eventos, isLoading }: { eventos: EventoEquipamiento[]; isLoading: boolean }) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("equip.cargandoHistorial")}</div>
  }
  if (!eventos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("equip.sinEventosTabla")}</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("equip.thFecha")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.thEquipo")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.thCodigo")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.tipo")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("equip.thCantidad")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.thUsuario")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.thMotivo")}</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="border-b border-cds-borderSubtle hover:bg-cds-layer01">
              <td className="h-12 px-4 text-cds-textSecondary">{formatDateTime(evento.fecha)}</td>
              <td className="h-12 px-4">{evento.equipamiento_nombre}</td>
              <td className="h-12 px-4 font-mono text-xs text-cds-textSecondary">{evento.unidad_codigo || "-"}</td>
              <td className="h-12 px-4">{etiquetaTipoEvento(t, evento)}</td>
              <td className="h-12 px-4 text-right font-mono">{evento.cantidad}</td>
              <td className="h-12 px-4 text-cds-textSecondary">{evento.usuario_nombre}</td>
              <td className="h-12 max-w-[360px] px-4 text-cds-textSecondary">
                <span className="line-clamp-2">{evento.motivo || "-"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// accent = tile destacado (Disponibles): fondo petróleo suave + acento izquierdo,
// check junto al label y valor en petróleo. mutedError = No operativas: gris en 0,
// coral si hay ≥1. Valor 32px y label con gap amplio, como el handoff.
function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "accent" | "mutedError"
}) {
  const isZero = value.trim() === "0"
  const accent = tone === "accent"
  return (
    <div className={cn("p-4", accent ? "bg-lab-blueTint shadow-[inset_2px_0_0_var(--lab-blue)]" : "bg-cds-layer01")}>
      <div
        className={cn(
          "mb-4 flex items-center justify-between text-xs tracking-[0.32px]",
          accent ? "text-cds-linkPrimary" : "text-cds-textSecondary",
        )}
      >
        <span>{label}</span>
        {accent ? <Check size={16} aria-hidden="true" /> : null}
      </div>
      <div
        className={cn(
          "text-[32px] font-light leading-none",
          accent && "font-normal text-cds-linkPrimary",
          tone === "mutedError" && (isZero ? "text-cds-textPlaceholder" : "text-cds-supportError"),
        )}
      >
        {value}
      </div>
    </div>
  )
}

// Celda de la tira de metadatos (debajo de las cartas): label en mayúsculas +
// valor; vacío → em-dash en gris. La fecha de ingreso va en mono.
function MetaCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const vacio = !value || value === "-"
  return (
    <div className="bg-cds-background px-4 py-3.5">
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.32px] text-cds-textPlaceholder">{label}</div>
      <div
        className={cn(
          "text-sm",
          vacio ? "text-cds-textPlaceholder" : "text-cds-textPrimary",
          mono && !vacio && "font-mono",
        )}
      >
        {vacio ? "—" : value}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-cds-textPrimary">{value}</div>
    </div>
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
