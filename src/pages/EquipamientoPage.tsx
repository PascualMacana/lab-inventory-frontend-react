import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Download, Eye, EyeOff, History, Microscope, Plus, QrCode, Search, Wrench } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ModuleNav } from "../components/ModuleNav"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  api,
  type Equipamiento,
  type EquipamientoCrear,
  type EquipamientoUnidad,
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
const tiposEvento: TipoEvento[] = ["alta", "rotura", "calibracion", "reparacion", "baja"]
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
  const queryClient = useQueryClient()
  const puedeCrear = puede(usuario, "crear_equipamiento")
  const puedeEvento = puede(usuario, "registrar_evento_equipamiento")
  const [tab, setTab] = useState<TabEquipamiento>("listado")
  const [categoria, setCategoria] = useState("")
  const [soloOperativos, setSoloOperativos] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [equipoId, setEquipoId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

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

      {mensaje ? (
        <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
              <label className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("common.buscar")}</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={18} aria-hidden="true" />
                  <Input className="pl-12" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder={t("equip.buscarPh")} />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("equip.categoria")}</span>
                <select
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
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
              </label>
              <div className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("equip.stockOperativo")}</span>
                <Button
                  type="button"
                  variant={soloOperativos ? "primary" : "secondary"}
                  size="compact"
                  className="w-full lg:w-auto"
                  onClick={() => {
                    setSoloOperativos((actual) => !actual)
                    setEquipoId(null)
                  }}
                >
                  {soloOperativos ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  {soloOperativos ? t("equip.verTodos") : t("equip.soloEnUso")}
                </Button>
              </div>
            </div>
          </div>

          <EquipamientoTable equipos={equiposFiltrados} isLoading={equiposQuery.isLoading} selectedId={equipoSeleccionado?.id ?? null} onSelect={setEquipoId} />

          {equipoSeleccionado ? (
            <EquipoDetalle
              token={token!}
              usuarioId={usuario?.id ?? 0}
              equipo={equipoSeleccionado}
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
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("equip.thNombre")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.categoria")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("equip.total")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("equip.enUso")}</th>
            <th className="h-10 px-4 font-normal">{t("equip.ubicacion")}</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((equipo) => (
            <tr
              key={equipo.id}
              className={cn("cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01", selectedId === equipo.id && "bg-cds-layer01")}
              onClick={() => onSelect(equipo.id)}
            >
              <td className="h-12 px-4">
                <div className="font-medium">{equipo.nombre}</div>
                <div className="mt-1 text-xs text-cds-textSecondary">{[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || t("equip.sinMarca")}</div>
              </td>
              <td className="h-12 px-4 text-cds-textSecondary">{equipo.categoria || "-"}</td>
              <td className="h-12 px-4 text-right font-mono">{formatNumber(equipo.cantidad_total)}</td>
              <td className="h-12 px-4 text-right font-mono">{formatNumber(equipo.cantidad_operativa)}</td>
              <td className="h-12 px-4 text-cds-textSecondary">{equipo.ubicacion || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EquipoDetalle({
  token,
  usuarioId,
  equipo,
  puedeEvento,
  onError,
  onUpdated,
}: {
  token: string
  usuarioId: number
  equipo: Equipamiento
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
  const eventoMutation = useMutation({
    mutationFn: (data: EventoEquipamientoCrear) => api.registrarEventoEquipamiento(token, data),
  })
  const eventos = eventosQuery.data ?? eventosVacios
  const unidades = unidadesQuery.data ?? unidadesVacias
  const [unidadEventoId, setUnidadEventoId] = useState("")
  const [unidadesEtiqueta, setUnidadesEtiqueta] = useState<number[]>([])
  const [formatoEtiqueta, setFormatoEtiqueta] = useState("rollo_70x40")
  const etiquetasMutation = useMutation({
    mutationFn: ({ ids, formato }: { ids: number[]; formato: string }) =>
      api.equipamientoEtiquetasPdf(token, ids, formato),
  })
  const formatoEtiquetaSeleccionado = formatosEtiquetaEquipo.find((formato) => formato.clave === formatoEtiqueta) ?? formatosEtiquetaEquipo[0]

  useEffect(() => {
    setUnidadEventoId("")
    setUnidadesEtiqueta([])
  }, [equipo.id])

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

  function toggleUnidadEtiqueta(id: number) {
    setUnidadesEtiqueta((actual) =>
      actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id],
    )
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
        <div>
          <h2 className="text-[24px] leading-[1.33]">{equipo.nombre}</h2>
          <p className="mt-2 text-sm text-cds-textSecondary">{[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || t("equip.sinMarca")}</p>
        </div>
      </div>

      <div className="mb-5 grid gap-px bg-cds-borderSubtle sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t("equip.total")} value={formatNumber(equipo.cantidad_total)} />
        <Metric label={t("equip.enUso")} value={formatNumber(equipo.cantidad_operativa)} />
        <Metric label={t("equip.mFueraUso")} value={formatNumber(equipo.cantidad_total - equipo.cantidad_operativa)} />
        <Metric label={t("equip.mEventos")} value={String(eventos.length)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="grid gap-3 border-t border-cds-borderSubtle pt-4 text-sm md:grid-cols-2 xl:grid-cols-3">
            <Info label={t("equip.categoria")} value={equipo.categoria || "-"} />
            <Info label={t("equip.iSerie")} value={equipo.numero_serie || "-"} />
            <Info label={t("equip.ubicacion")} value={equipo.ubicacion || "-"} />
            <Info label={t("equip.proveedor")} value={equipo.proveedor_nombre || "-"} />
            <Info label={t("equip.iCosto")} value={equipo.costo_total === null || equipo.costo_total === undefined ? "-" : `$${formatNumber(equipo.costo_total)}`} />
            <Info label={t("equip.iFechaIngreso")} value={formatDate(equipo.fecha_ingreso)} />
            {equipo.enlace_compra ? <Info label={t("equip.iEnlace")} value={equipo.enlace_compra} /> : null}
            {equipo.notas ? <Info label={t("equip.notas")} value={equipo.notas} /> : null}
          </div>

          <div className="mt-6 border-t border-cds-borderSubtle pt-5">
            <div className="mb-6">
              <h3 className="mb-4">{t("equip.unidadesTitulo")}</h3>
              <UnidadesTable
                unidades={unidades}
                isLoading={unidadesQuery.isLoading}
                seleccion={unidadesEtiqueta}
                onToggle={toggleUnidadEtiqueta}
              />
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <label className="block">
                  <Label className="mb-2" htmlFor={`formato-equipo-${equipo.id}`}>{t("equip.tamanoEtiqueta")}</Label>
                  <select
                    id={`formato-equipo-${equipo.id}`}
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                    value={formatoEtiqueta}
                    onChange={(event) => setFormatoEtiqueta(event.target.value)}
                  >
                    {formatosEtiquetaEquipo.map((formato) => (
                      <option key={formato.clave} value={formato.clave}>
                        {formato.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-xs text-cds-textSecondary md:self-end md:pb-3">
                  {t("equip.maxEtiquetasPdf", { n: formatoEtiquetaSeleccionado.maxPorPdf })}
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="secondary" onClick={descargarEtiquetas} disabled={etiquetasMutation.isPending || !unidadesEtiqueta.length}>
                    <Download size={18} aria-hidden="true" />
                    {etiquetasMutation.isPending ? t("equip.generandoEtiquetas") : t("equip.imprimirCodigos")}
                  </Button>
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
          <form className="border-t border-cds-borderSubtle pt-5 xl:border-t-0 xl:pt-0" onSubmit={registrarEvento}>
            <h3 className="mb-4">{t("equip.registrarEvento")}</h3>
            <div className="grid gap-4">
              <label className="block">
                <Label className="mb-2" htmlFor={`tipo-${equipo.id}`}>{t("equip.tipo")}</Label>
                <select id={`tipo-${equipo.id}`} name="tipo" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none">
                  {tiposEvento.map((tipo) => (
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
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
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
            </div>
            <Button className="mt-5" type="submit" disabled={eventoMutation.isPending}>
              <Wrench size={18} aria-hidden="true" />
              {eventoMutation.isPending ? t("equip.registrando") : t("equip.registrarEvento")}
            </Button>
          </form>
        ) : null}
      </div>
    </section>
  )
}

function UnidadesTable({
  unidades,
  isLoading,
  seleccion,
  onToggle,
}: {
  unidades: EquipamientoUnidad[]
  isLoading: boolean
  seleccion: number[]
  onToggle: (id: number) => void
}) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("equip.cargandoUnidades")}</div>
  }
  if (!unidades.length) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("equip.sinUnidades")}</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-background text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 w-10 px-3 font-normal"></th>
            <th className="h-10 px-3 font-normal">{t("equip.thCodigo")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.thEstado")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.iSerie")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.ubicacion")}</th>
            <th className="h-10 px-3 font-normal">{t("equip.thUltimoEvento")}</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((unidad) => (
            <tr key={unidad.id} className="border-b border-cds-borderSubtle">
              <td className="h-11 px-3">
                <input
                  type="checkbox"
                  checked={seleccion.includes(unidad.id)}
                  onChange={() => onToggle(unidad.id)}
                  aria-label={t("equip.seleccionarUnidad", { codigo: unidad.codigo_interno })}
                />
              </td>
              <td className="h-11 px-3">
                <span className="inline-flex items-center gap-2 font-mono text-xs">
                  <QrCode size={15} aria-hidden="true" />
                  {unidad.codigo_interno}
                </span>
              </td>
              <td className="h-11 px-3">{t(`equip.estadoUnidad.${unidad.estado}`)}</td>
              <td className="h-11 px-3 text-cds-textSecondary">{unidad.numero_serie || "-"}</td>
              <td className="h-11 px-3 text-cds-textSecondary">{unidad.ubicacion || "-"}</td>
              <td className="h-11 px-3 text-cds-textSecondary">
                {unidad.ultimo_evento_tipo ? t(`equip.tipoEvento.${unidad.ultimo_evento_tipo}`) : "-"}
              </td>
            </tr>
          ))}
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
  const crearMutation = useMutation({
    mutationFn: (data: EquipamientoCrear) => api.crearEquipamiento(token, data),
  })
  const proveedoresQuery = useQuery({
    queryKey: ["proveedores", true],
    queryFn: () => api.proveedores(token, true),
  })
  const proveedores = proveedoresQuery.data ?? proveedoresVacios

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
      const proveedorId = Number(form.get("proveedor_id") || 0)
      const payload: EquipamientoCrear = {
        nombre,
        categoria: nullable(form.get("categoria")),
        marca: nullable(form.get("marca")),
        modelo: nullable(form.get("modelo")),
        numero_serie: nullable(form.get("numero_serie")),
        ubicacion: nullable(form.get("ubicacion")),
        proveedor_id: proveedorId || null,
        enlace_compra: nullable(form.get("enlace_compra")),
        costo_total: costo > 0 ? costo : null,
        cantidad_inicial: cantidadInicial,
        notas: nullable(form.get("notas")),
      }
      const resultado = await crearMutation.mutateAsync(payload)
      formElement.reset()
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
          <select id="proveedor_id" name="proveedor_id" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none">
            <option value="">{t("equip.sinProveedor")}</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </select>
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
            {tiposEvento.map((item) => (
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
            <span className="font-medium">{t(`equip.tipoEvento.${evento.tipo}`)}</span>
            <span className="text-xs text-cds-textSecondary">{formatDateTime(evento.fecha)}</span>
          </div>
          <div className="mt-2 text-cds-textSecondary">
            {t("equip.unidadesPor", { cantidad: evento.cantidad, usuario: evento.usuario_nombre })}
            {evento.unidad_codigo ? ` · ${evento.unidad_codigo}` : ""}
          </div>
          <div className="mt-2">{evento.motivo}</div>
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
              <td className="h-12 px-4">{t(`equip.tipoEvento.${evento.tipo}`)}</td>
              <td className="h-12 px-4 text-right font-mono">{evento.cantidad}</td>
              <td className="h-12 px-4 text-cds-textSecondary">{evento.usuario_nombre}</td>
              <td className="h-12 max-w-[360px] px-4 text-cds-textSecondary">
                <span className="line-clamp-2">{evento.motivo}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cds-layer01 p-4">
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div className="mt-2 text-[24px] leading-[1.33]">{value}</div>
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
