import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, MessageSquarePlus, Plus, RotateCcw, Save, UserRound } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type EstadoTarea, type PrioridadTarea, type Tarea, type TareaActualizar, type TareaEvento, type Usuario } from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

const estados: Array<{ value: "" | EstadoTarea; label: string }> = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
]

const prioridades: Array<{ value: PrioridadTarea; label: string }> = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
]

const tareasVacias: Tarea[] = []
const usuariosVacios: Usuario[] = []

function estadoLabel(value: EstadoTarea | "") {
  return estados.find((item) => item.value === value)?.label ?? value
}

function prioridadLabel(value: PrioridadTarea) {
  return prioridades.find((item) => item.value === value)?.label ?? value
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date)
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

function isVencida(tarea: Tarea) {
  if (!tarea.fecha_limite || tarea.estado === "completada" || tarea.estado === "cancelada") {
    return false
  }
  return tarea.fecha_limite < new Date().toISOString().slice(0, 10)
}

function estadoClasses(estado: EstadoTarea) {
  if (estado === "completada") {
    return "bg-lab-sageBg text-cds-supportSuccess ring-cds-supportSuccess/40"
  }
  if (estado === "bloqueada" || estado === "cancelada") {
    return "bg-lab-critTint text-cds-supportError ring-cds-supportError/40"
  }
  if (estado === "en_progreso") {
    return "bg-lab-warmTint text-lab-warmFg ring-lab-warm/40"
  }
  return "bg-cds-layer02 text-cds-textSecondary ring-cds-borderSubtle"
}

function prioridadClasses(prioridad: PrioridadTarea) {
  if (prioridad === "urgente") {
    return "text-cds-supportError"
  }
  if (prioridad === "alta") {
    return "text-lab-warmFg"
  }
  return "text-cds-textSecondary"
}

export function TareasPage() {
  const { token, usuario } = useAuth()
  const queryClient = useQueryClient()
  const puedeGestionar = puede(usuario, "gestionar_tareas")
  const puedeCrear = puede(usuario, "crear_tarea")
  const [tab, setTab] = useState<"mis" | "equipo" | "nueva">("mis")
  const [estado, setEstado] = useState("")
  const [asignadoA, setAsignadoA] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", "tareas"],
    queryFn: () => api.usuarios(token!, true),
    enabled: Boolean(token) && puedeGestionar,
  })

  const filtros = useMemo(() => {
    if (tab === "mis") {
      return { estado: estado || undefined, asignado_a: usuario?.id ?? null }
    }
    return {
      estado: estado || undefined,
      asignado_a: asignadoA ? Number(asignadoA) : undefined,
    }
  }, [asignadoA, estado, tab, usuario?.id])

  const tareasQuery = useQuery({
    queryKey: ["tareas", filtros],
    queryFn: () => api.tareas(token!, filtros),
    enabled: Boolean(token) && tab !== "nueva",
  })

  const tareas = tareasQuery.data ?? tareasVacias
  const usuarios = usuariosQuery.data ?? usuariosVacios
  const selected = useMemo(() => {
    if (!tareas.length) {
      return null
    }
    return tareas.find((tarea) => tarea.id === selectedId) ?? tareas[0]
  }, [selectedId, tareas])

  const resumen = useMemo(() => {
    return tareas.reduce(
      (acc, tarea) => {
        acc.total += 1
        acc[tarea.estado] += 1
        if (isVencida(tarea)) {
          acc.vencidas += 1
        }
        return acc
      },
      { total: 0, pendiente: 0, en_progreso: 0, bloqueada: 0, completada: 0, cancelada: 0, vencidas: 0 },
    )
  }, [tareas])

  async function refrescar(message?: string) {
    await queryClient.invalidateQueries({ queryKey: ["tareas"] })
    if (message) {
      setMensaje(message)
    }
  }

  function cambiarTab(nextTab: "mis" | "equipo" | "nueva") {
    setTab(nextTab)
    setEstado("")
    setAsignadoA("")
    setSelectedId(null)
    setMensaje(null)
    setErrorLocal(null)
  }

  return (
    <section>
      <PageHeader
        title="Tareas"
        description="Seguimiento operativo de tareas asignadas al equipo."
        count={tab === "nueva" ? "Nueva tarea" : tareasQuery.isLoading ? "Cargando tareas..." : `${resumen.total} tarea(s)`}
        plain
      />

      {mensaje ? <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div> : null}
      {errorLocal ? <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div> : null}

      <ModuleNav
        actions={[
          { label: "Mis tareas", onClick: () => cambiarTab("mis"), icon: <UserRound size={18} aria-hidden="true" />, variant: tab === "mis" ? "primary" : "secondary" },
          ...(puedeGestionar
            ? [{ label: "Equipo", onClick: () => cambiarTab("equipo"), icon: <CalendarClock size={18} aria-hidden="true" />, variant: tab === "equipo" ? "primary" as const : "secondary" as const }]
            : []),
          ...(puedeCrear
            ? [{ label: "Nueva tarea", onClick: () => cambiarTab("nueva"), icon: <Plus size={18} aria-hidden="true" />, variant: tab === "nueva" ? "primary" as const : "secondary" as const }]
            : []),
        ]}
      />

      {tab === "nueva" && puedeCrear ? (
        <NuevaTareaForm
          token={token!}
          usuarios={usuarios}
          onError={setErrorLocal}
          onSuccess={async (tarea) => {
            cambiarTab("equipo")
            setSelectedId(tarea.id)
            await refrescar(`Tarea #${tarea.id} creada.`)
          }}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-px bg-cds-borderSubtle md:grid-cols-5">
            <Metric label="Pendientes" value={String(resumen.pendiente)} />
            <Metric label="En progreso" value={String(resumen.en_progreso)} />
            <Metric label="Bloqueadas" value={String(resumen.bloqueada)} />
            <Metric label="Completadas" value={String(resumen.completada)} />
            <Metric label="Vencidas" value={String(resumen.vencidas)} tone="error" />
          </div>

          <div className="mb-6 grid gap-4 bg-cds-layer01 p-4 md:grid-cols-3">
            <label className="block">
              <Label className="mb-2" htmlFor="tarea_estado">Estado</Label>
              <select id="tarea_estado" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={estado} onChange={(event) => setEstado(event.target.value)}>
                {estados.map((item) => <option key={item.value || "todos"} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            {tab === "equipo" && puedeGestionar ? (
              <label className="block">
                <Label className="mb-2" htmlFor="tarea_asignado">Asignado a</Label>
                <select id="tarea_asignado" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={asignadoA} onChange={(event) => setAsignadoA(event.target.value)}>
                  <option value="">Todos</option>
                  {usuarios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </label>
            ) : null}
            <div className="flex items-end">
              <Button type="button" variant="secondary" onClick={() => void tareasQuery.refetch()}>
                <RotateCcw size={18} aria-hidden="true" />
                Actualizar
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <TareasTable tareas={tareas} selectedId={selected?.id ?? null} isLoading={tareasQuery.isLoading} onSelect={setSelectedId} />
            {selected ? (
              <TareaDetalle
                tarea={selected}
                token={token!}
                usuarios={usuarios}
                puedeGestionar={puedeGestionar}
                onError={setErrorLocal}
                onUpdated={refrescar}
              />
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "error" }) {
  return (
    <div className="bg-cds-layer01 p-4">
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div className={cn("mt-1 text-[28px] leading-tight", tone === "error" && "text-cds-supportError")}>{value}</div>
    </div>
  )
}

function TareasTable({ tareas, selectedId, isLoading, onSelect }: { tareas: Tarea[]; selectedId: number | null; isLoading: boolean; onSelect: (id: number) => void }) {
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando tabla...</div>
  }
  if (!tareas.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay tareas para mostrar.</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">Tarea</th>
            <th className="h-10 px-4 font-normal">Estado</th>
            <th className="h-10 px-4 font-normal">Prioridad</th>
            <th className="h-10 px-4 font-normal">Asignado</th>
            <th className="h-10 px-4 font-normal">Fecha límite</th>
          </tr>
        </thead>
        <tbody>
          {tareas.map((tarea) => (
            <tr key={tarea.id} className={cn("cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01", selectedId === tarea.id && "bg-cds-layer01")} onClick={() => onSelect(tarea.id)}>
              <td className="h-12 px-4 font-medium">#{tarea.id} · {tarea.titulo}</td>
              <td className="h-12 px-4"><span className={cn("inline-flex rounded-full px-2 py-1 text-xs ring-1", estadoClasses(tarea.estado))}>{estadoLabel(tarea.estado)}</span></td>
              <td className={cn("h-12 px-4 font-medium", prioridadClasses(tarea.prioridad))}>{prioridadLabel(tarea.prioridad)}</td>
              <td className="h-12 px-4 text-cds-textSecondary">{tarea.asignado_nombre || "Sin asignar"}</td>
              <td className={cn("h-12 px-4 text-cds-textSecondary", isVencida(tarea) && "text-cds-supportError")}>{formatDate(tarea.fecha_limite)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TareaDetalle({ tarea, token, usuarios, puedeGestionar, onError, onUpdated }: { tarea: Tarea; token: string; usuarios: Usuario[]; puedeGestionar: boolean; onError: (message: string | null) => void; onUpdated: (message?: string) => void | Promise<void> }) {
  const queryClient = useQueryClient()
  const [comentario, setComentario] = useState("")
  const eventosQuery = useQuery({
    queryKey: ["tarea-eventos", tarea.id],
    queryFn: () => api.tareaEventos(token, tarea.id),
    enabled: Boolean(token && tarea.id),
  })
  const estadosDisponibles = puedeGestionar ? estados.filter((item) => item.value) : estados.filter((item) => ["en_progreso", "bloqueada", "completada"].includes(item.value))

  const estadoMutation = useMutation({
    mutationFn: (estado: EstadoTarea) => api.cambiarEstadoTarea(token, tarea.id, estado),
    onSuccess: async () => {
      onError(null)
      await onUpdated("Estado actualizado.")
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, "No se pudo actualizar el estado.")),
  })

  const reasignarMutation = useMutation({
    mutationFn: (asignadoA: number | null) => api.reasignarTarea(token, tarea.id, asignadoA),
    onSuccess: async () => {
      onError(null)
      await onUpdated("Tarea reasignada.")
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, "No se pudo reasignar la tarea.")),
  })

  const editarMutation = useMutation({
    mutationFn: (data: TareaActualizar) => api.actualizarTarea(token, tarea.id, data),
    onSuccess: async () => {
      onError(null)
      await onUpdated("Tarea actualizada.")
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, "No se pudo actualizar la tarea.")),
  })

  const comentarioMutation = useMutation({
    mutationFn: () => api.comentarTarea(token, tarea.id, comentario.trim()),
    onSuccess: async () => {
      setComentario("")
      onError(null)
      await onUpdated("Comentario agregado.")
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, "No se pudo agregar el comentario.")),
  })

  function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    editarMutation.mutate({
      titulo: String(form.get("titulo") ?? "").trim(),
      descripcion: String(form.get("descripcion") ?? "").trim() || null,
      prioridad: String(form.get("prioridad") ?? "media") as PrioridadTarea,
      fecha_limite: String(form.get("fecha_limite") ?? "") || null,
    })
  }

  return (
    <aside className="bg-cds-layer01 p-4">
      <h2 className="text-[24px] leading-[1.33]">#{tarea.id} · {tarea.titulo}</h2>
      <div className="mt-3 space-y-2 text-sm text-cds-textSecondary">
        <p>Asignado a: {tarea.asignado_nombre || "Sin asignar"}</p>
        <p>Creado por: {tarea.creado_por_nombre || "-"}</p>
        <p>Fecha límite: {formatDate(tarea.fecha_limite)}</p>
        {tarea.descripcion ? <p className="text-cds-textPrimary">{tarea.descripcion}</p> : null}
      </div>

      <div className="mt-5 grid gap-3">
        <label className="block">
          <Label className="mb-2" htmlFor={`estado_${tarea.id}`}>Estado</Label>
          <select id={`estado_${tarea.id}`} className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={tarea.estado} onChange={(event) => estadoMutation.mutate(event.target.value as EstadoTarea)} disabled={estadoMutation.isPending}>
            {estadosDisponibles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {puedeGestionar ? (
          <label className="block">
            <Label className="mb-2" htmlFor={`asignado_${tarea.id}`}>Reasignar</Label>
            <select id={`asignado_${tarea.id}`} className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={tarea.asignado_a ?? ""} onChange={(event) => reasignarMutation.mutate(event.target.value ? Number(event.target.value) : null)} disabled={reasignarMutation.isPending}>
              <option value="">Sin asignar</option>
              {usuarios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      {puedeGestionar ? (
        <form className="mt-6 border-t border-cds-borderSubtle pt-4" onSubmit={handleEdit}>
          <h3 className="mb-4 text-sm font-medium">Editar tarea</h3>
          <div className="grid gap-4">
            <label className="block"><Label className="mb-2" htmlFor={`titulo_${tarea.id}`}>Título</Label><Input id={`titulo_${tarea.id}`} name="titulo" defaultValue={tarea.titulo} required maxLength={160} /></label>
            <label className="block"><Label className="mb-2" htmlFor={`descripcion_${tarea.id}`}>Descripción</Label><textarea id={`descripcion_${tarea.id}`} name="descripcion" className="min-h-[96px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 text-sm" defaultValue={tarea.descripcion ?? ""} maxLength={1000} /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block"><Label className="mb-2" htmlFor={`prioridad_${tarea.id}`}>Prioridad</Label><select id={`prioridad_${tarea.id}`} name="prioridad" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" defaultValue={tarea.prioridad}>{prioridades.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="block"><Label className="mb-2" htmlFor={`fecha_${tarea.id}`}>Fecha límite</Label><Input id={`fecha_${tarea.id}`} name="fecha_limite" type="date" defaultValue={tarea.fecha_limite ?? ""} /></label>
            </div>
            <Button type="submit" disabled={editarMutation.isPending}><Save size={18} aria-hidden="true" />Guardar cambios</Button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 border-t border-cds-borderSubtle pt-4">
        <h3 className="mb-3 text-sm font-medium">Historial</h3>
        <div className="space-y-3">
          {(eventosQuery.data ?? []).map((evento) => <EventoItem key={evento.id} evento={evento} />)}
          {eventosQuery.isLoading ? <p className="text-sm text-cds-textSecondary">Cargando historial...</p> : null}
          {!eventosQuery.isLoading && !(eventosQuery.data ?? []).length ? <p className="text-sm text-cds-textSecondary">Sin eventos registrados.</p> : null}
        </div>
        <form className="mt-4" onSubmit={(event) => { event.preventDefault(); comentarioMutation.mutate() }}>
          <Label className="mb-2" htmlFor={`comentario_${tarea.id}`}>Comentario</Label>
          <textarea id={`comentario_${tarea.id}`} className="min-h-[80px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 text-sm" value={comentario} onChange={(event) => setComentario(event.target.value)} maxLength={1000} required />
          <Button className="mt-3" type="submit" disabled={comentarioMutation.isPending || !comentario.trim()}><MessageSquarePlus size={18} aria-hidden="true" />Agregar comentario</Button>
        </form>
      </div>
    </aside>
  )
}

function EventoItem({ evento }: { evento: TareaEvento }) {
  let texto = evento.comentario || evento.tipo
  if (evento.tipo === "estado") {
    texto = `${evento.usuario_nombre} cambió estado de ${estadoLabel(evento.estado_anterior ?? "")} a ${estadoLabel(evento.estado_nuevo ?? "")}.`
  } else if (evento.tipo === "reasignacion") {
    texto = `${evento.usuario_nombre} reasignó de ${evento.asignado_anterior_nombre || "Sin asignar"} a ${evento.asignado_nuevo_nombre || "Sin asignar"}.`
  } else if (evento.tipo === "creacion") {
    texto = `${evento.usuario_nombre} creó la tarea.`
  } else if (evento.tipo === "edicion") {
    texto = `${evento.usuario_nombre} editó la tarea: ${evento.comentario || ""}`
  } else if (evento.tipo === "comentario") {
    texto = `${evento.usuario_nombre}: ${evento.comentario || ""}`
  }
  return <p className="border-l-2 border-cds-borderSubtle pl-3 text-sm text-cds-textSecondary"><span className="text-cds-textPrimary">{formatDateTime(evento.fecha)}</span> · {texto}</p>
}

function NuevaTareaForm({ token, usuarios, onError, onSuccess }: { token: string; usuarios: Usuario[]; onError: (message: string | null) => void; onSuccess: (tarea: Tarea) => void | Promise<void> }) {
  const mutation = useMutation({
    mutationFn: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      return api.crearTarea(token, {
        titulo: String(form.get("titulo") ?? "").trim(),
        descripcion: String(form.get("descripcion") ?? "").trim() || null,
        prioridad: String(form.get("prioridad") ?? "media") as PrioridadTarea,
        asignado_a: form.get("asignado_a") ? Number(form.get("asignado_a")) : null,
        fecha_limite: String(form.get("fecha_limite") ?? "") || null,
      })
    },
    onSuccess: async (tarea) => {
      onError(null)
      await onSuccess(tarea)
    },
    onError: (error) => onError(mutationError(error, "No se pudo crear la tarea.")),
  })

  return (
    <form className="bg-cds-layer01 p-4" onSubmit={(event) => mutation.mutate(event)}>
      <div className="grid gap-5">
        <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_titulo">Título</Label><Input id="nueva_tarea_titulo" name="titulo" required maxLength={160} /></label>
        <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_desc">Descripción</Label><textarea id="nueva_tarea_desc" name="descripcion" className="min-h-[120px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 text-sm" maxLength={1000} /></label>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_prioridad">Prioridad</Label><select id="nueva_tarea_prioridad" name="prioridad" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" defaultValue="media">{prioridades.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_asignado">Asignado a</Label><select id="nueva_tarea_asignado" name="asignado_a" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm"><option value="">Sin asignar</option>{usuarios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
          <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_fecha">Fecha límite</Label><Input id="nueva_tarea_fecha" name="fecha_limite" type="date" /></label>
        </div>
        <Button type="submit" disabled={mutation.isPending}><Plus size={18} aria-hidden="true" />Crear tarea</Button>
      </div>
    </form>
  )
}
