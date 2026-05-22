import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Eye, EyeOff, History, Microscope, Plus, Search, Wrench } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  api,
  type Equipamiento,
  type EquipamientoCrear,
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
const tiposEvento: TipoEvento[] = ["alta", "rotura", "calibracion", "reparacion", "baja"]

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

function tipoLabel(tipo: TipoEvento) {
  const labels: Record<TipoEvento, string> = {
    alta: "Alta",
    rotura: "Rotura",
    calibracion: "Calibración",
    reparacion: "Reparación",
    baja: "Baja",
  }
  return labels[tipo]
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function EquipamientoPage() {
  const { token, usuario } = useAuth()
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
    if (equipoSeleccionado?.id) {
      await queryClient.invalidateQueries({ queryKey: ["eventos-equipamiento", equipoSeleccionado.id] })
    }
    if (mensajeOk) {
      setMensaje(mensajeOk)
    }
  }

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>Equipamiento</h1>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            Inventario de instrumentos reutilizables, estado operativo e historial de eventos.
          </p>
        </div>
        <div className="text-sm tracking-[0.16px] text-cds-textSecondary">
          {equiposQuery.isLoading ? "Cargando equipos..." : `${equiposFiltrados.length} equipo(s)`}
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
            ? [{ label: "Volver al listado", onClick: () => setTab("listado"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
            : puedeCrear
              ? [{ label: "Nuevo equipamiento", onClick: () => setTab("nuevo"), icon: <Plus size={18} aria-hidden="true" /> }]
              : []
        }
        more={
          tab === "listado"
            ? [{ label: "Historial global", onClick: () => setTab("eventos"), icon: <History size={18} aria-hidden="true" /> }]
            : []
        }
      />

      {tab === "listado" ? (
        <>
          <div className="mb-4 bg-cds-layer01 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
              <label className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Buscar</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={18} aria-hidden="true" />
                  <Input className="pl-12" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre, marca, modelo, ubicación" />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Categoría</span>
                <select
                  className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                  value={categoria}
                  onChange={(event) => {
                    setCategoria(event.target.value)
                    setEquipoId(null)
                  }}
                >
                  <option value="">Todas</option>
                  {(categoriasQuery.data?.categorias ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Stock operativo</span>
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
                  {soloOperativos ? "Ver todos" : "Solo en uso"}
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
              Seleccioná un equipo de la tabla para ver detalle, registrar eventos e historial.
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
            await refrescar(`Equipamiento creado: ${nombre}.`)
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
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando tabla...</div>
  }
  if (!equipos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay equipamiento para mostrar.</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">Nombre</th>
            <th className="h-10 px-4 font-normal">Categoría</th>
            <th className="h-10 px-4 text-right font-normal">Total</th>
            <th className="h-10 px-4 text-right font-normal">En uso</th>
            <th className="h-10 px-4 font-normal">Ubicación</th>
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
                <div className="mt-1 text-xs text-cds-textSecondary">{[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || "Sin marca/modelo"}</div>
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
  const eventosQuery = useQuery({
    queryKey: ["eventos-equipamiento", equipo.id],
    queryFn: () => api.eventosEquipamiento(token, equipo.id, 200),
    enabled: Boolean(token && equipo.id),
  })
  const eventoMutation = useMutation({
    mutationFn: (data: EventoEquipamientoCrear) => api.registrarEventoEquipamiento(token, data),
  })
  const eventos = eventosQuery.data ?? eventosVacios

  async function registrarEvento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    onError(null)
    try {
      const form = new FormData(formElement)
      const tipo = String(form.get("tipo") ?? "alta") as TipoEvento
      const cantidad = requireFiniteNumber(parseFormNumber(form.get("cantidad"), 1), "Cantidad inválida.")
      const motivo = String(form.get("motivo") ?? "").trim()
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error("La cantidad debe ser un entero mayor a 0.")
      }
      if (!motivo) {
        throw new Error("El motivo es obligatorio.")
      }
      await eventoMutation.mutateAsync({
        equipamiento_id: equipo.id,
        usuario_id: usuarioId,
        tipo,
        cantidad,
        motivo,
      })
      formElement.reset()
      await onUpdated(`Evento registrado: ${tipoLabel(tipo)}.`)
    } catch (error) {
      onError(mutationError(error, "No se pudo registrar el evento"))
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
          <p className="mt-2 text-sm text-cds-textSecondary">{[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || "Sin marca/modelo"}</p>
        </div>
      </div>

      <div className="mb-5 grid gap-px bg-cds-borderSubtle sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total" value={formatNumber(equipo.cantidad_total)} />
        <Metric label="En uso" value={formatNumber(equipo.cantidad_operativa)} />
        <Metric label="Fuera de uso" value={formatNumber(equipo.cantidad_total - equipo.cantidad_operativa)} />
        <Metric label="Eventos" value={String(eventos.length)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="grid gap-3 border-t border-cds-borderSubtle pt-4 text-sm md:grid-cols-2 xl:grid-cols-3">
            <Info label="Categoría" value={equipo.categoria || "-"} />
            <Info label="N° serie" value={equipo.numero_serie || "-"} />
            <Info label="Ubicación" value={equipo.ubicacion || "-"} />
            <Info label="Proveedor" value={equipo.proveedor_nombre || "-"} />
            <Info label="Costo total" value={equipo.costo_total === null || equipo.costo_total === undefined ? "-" : `$${formatNumber(equipo.costo_total)}`} />
            <Info label="Fecha ingreso" value={formatDate(equipo.fecha_ingreso)} />
            {equipo.enlace_compra ? <Info label="Enlace compra" value={equipo.enlace_compra} /> : null}
            {equipo.notas ? <Info label="Notas" value={equipo.notas} /> : null}
          </div>

          <div className="mt-6 border-t border-cds-borderSubtle pt-5">
            <h3 className="mb-4">Historial del equipo</h3>
            <EventosList eventos={eventos} isLoading={eventosQuery.isLoading} />
          </div>
        </div>

        {puedeEvento ? (
          <form className="border-t border-cds-borderSubtle pt-5 xl:border-t-0 xl:pt-0" onSubmit={registrarEvento}>
            <h3 className="mb-4">Registrar evento</h3>
            <div className="grid gap-4">
              <label className="block">
                <Label className="mb-2" htmlFor={`tipo-${equipo.id}`}>Tipo</Label>
                <select id={`tipo-${equipo.id}`} name="tipo" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none">
                  {tiposEvento.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipoLabel(tipo)}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Cantidad *" name="cantidad" defaultValue="1" inputMode="numeric" required />
              <Field label="Motivo *" name="motivo" placeholder="Ej: Service, rotura, alta inicial adicional" required />
            </div>
            <Button className="mt-5" type="submit" disabled={eventoMutation.isPending}>
              <Wrench size={18} aria-hidden="true" />
              {eventoMutation.isPending ? "Registrando..." : "Registrar evento"}
            </Button>
          </form>
        ) : null}
      </div>
    </section>
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
      const cantidadInicial = requireFiniteNumber(parseFormNumber(form.get("cantidad_inicial"), 0), "Cantidad inicial inválida.")
      const costoRaw = parseFormNumber(form.get("costo_total"), 0)
      const costo = requireFiniteNumber(costoRaw, "Costo total inválido.")
      if (!nombre) {
        throw new Error("El nombre es obligatorio.")
      }
      if (!Number.isInteger(cantidadInicial) || cantidadInicial < 0) {
        throw new Error("La cantidad inicial debe ser un entero mayor o igual a 0.")
      }
      if (costo < 0) {
        throw new Error("El costo total no puede ser negativo.")
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
      onError(mutationError(error, "No se pudo crear el equipamiento"))
    }
  }

  return (
    <form className="max-w-5xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">Nuevo equipamiento</h2>
        <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
          Si la cantidad inicial es mayor a 0 se registra automáticamente un evento de alta.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre *" name="nombre" required />
        <Field label="Categoría" name="categoria" placeholder="Ej: Balanzas, Micropipetas" />
        <Field label="Marca" name="marca" />
        <Field label="Modelo" name="modelo" />
        <Field label="N° de serie" name="numero_serie" />
        <Field label="Ubicación" name="ubicacion" />
        <label className="block">
          <Label className="mb-2" htmlFor="proveedor_id">Proveedor</Label>
          <select id="proveedor_id" name="proveedor_id" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none">
            <option value="">Sin proveedor</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </select>
        </label>
        <Field label="Enlace de compra" name="enlace_compra" />
        <Field label="Costo total" name="costo_total" inputMode="decimal" defaultValue="0" />
        <Field label="Cantidad inicial" name="cantidad_inicial" inputMode="numeric" defaultValue="1" />
        <Field className="md:col-span-2" label="Notas" name="notas" />
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Plus size={18} aria-hidden="true" />
        {crearMutation.isPending ? "Creando..." : "Crear equipamiento"}
      </Button>
    </form>
  )
}

function HistorialGlobal({ token }: { token: string }) {
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
      ? [evento.equipamiento_nombre, evento.usuario_nombre, evento.motivo].some((value) => String(value || "").toLocaleLowerCase("es").includes(texto))
      : true
    return tipoOk && textoOk
  })

  return (
    <>
      <div className="mb-4 grid gap-4 md:grid-cols-[180px_220px_minmax(0,1fr)]">
        <Field label="Límite" name="limite_eventos" value={limite} onChange={(event) => setLimite(event.target.value)} inputMode="numeric" />
        <label className="block">
          <Label className="mb-2" htmlFor="tipo_evento_global">Tipo</Label>
          <select id="tipo_evento_global" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none" value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="">Todos</option>
            {tiposEvento.map((item) => (
              <option key={item} value={item}>
                {tipoLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <Field label="Buscar" name="buscar_evento" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Equipo, usuario, motivo" />
      </div>
      <EventosTable eventos={filtrados} isLoading={eventosQuery.isLoading} />
    </>
  )
}

function EventosList({ eventos, isLoading }: { eventos: EventoEquipamiento[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">Cargando eventos...</div>
  }
  if (!eventos.length) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">Sin eventos registrados.</div>
  }
  return (
    <div className="space-y-3">
      {eventos.slice(0, 8).map((evento) => (
        <article key={evento.id} className="border border-cds-borderSubtle bg-cds-background p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{tipoLabel(evento.tipo)}</span>
            <span className="text-xs text-cds-textSecondary">{formatDateTime(evento.fecha)}</span>
          </div>
          <div className="mt-2 text-cds-textSecondary">
            {evento.cantidad} unidad(es) por {evento.usuario_nombre}
          </div>
          <div className="mt-2">{evento.motivo}</div>
        </article>
      ))}
    </div>
  )
}

function EventosTable({ eventos, isLoading }: { eventos: EventoEquipamiento[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando historial...</div>
  }
  if (!eventos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay eventos para mostrar.</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">Fecha</th>
            <th className="h-10 px-4 font-normal">Equipo</th>
            <th className="h-10 px-4 font-normal">Tipo</th>
            <th className="h-10 px-4 text-right font-normal">Cantidad</th>
            <th className="h-10 px-4 font-normal">Usuario</th>
            <th className="h-10 px-4 font-normal">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="border-b border-cds-borderSubtle hover:bg-cds-layer01">
              <td className="h-12 px-4 text-cds-textSecondary">{formatDateTime(evento.fecha)}</td>
              <td className="h-12 px-4">{evento.equipamiento_nombre}</td>
              <td className="h-12 px-4">{tipoLabel(evento.tipo)}</td>
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
