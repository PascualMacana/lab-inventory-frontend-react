import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, MessageSquarePlus, Plus, RotateCcw, Save, ShoppingCart, UserRound } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type EstadoTarea, type PrioridadTarea, type Tarea, type TareaActualizar, type TareaEvento, type Usuario } from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

const estados: Array<{ value: "" | EstadoTarea }> = [
  { value: "" },
  { value: "pendiente" },
  { value: "en_progreso" },
  { value: "bloqueada" },
  { value: "completada" },
  { value: "cancelada" },
]

const prioridades: Array<{ value: PrioridadTarea }> = [
  { value: "baja" },
  { value: "media" },
  { value: "alta" },
  { value: "urgente" },
]

const tareasVacias: Tarea[] = []
const usuariosVacios: Usuario[] = []

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
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const puedeGestionar = puede(usuario, "gestionar_tareas")
  const puedeCrear = puede(usuario, "crear_tarea")
  const puedeCrearCompra = puede(usuario, "crear_solicitud_compra")
  const [tab, setTab] = useState<"mis" | "equipo" | "nueva">(() => (puede(usuario, "gestionar_tareas") ? "equipo" : "mis"))
  const [estado, setEstado] = useState("")
  const [asignadoA, setAsignadoA] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const tareaIdQuery = Number(searchParams.get("tarea_id") ?? "")

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
    setSearchParams({}, { replace: true })
    setMensaje(null)
    setErrorLocal(null)
  }

  function seleccionarTarea(id: number) {
    setSelectedId(id)
    setSearchParams({ tarea_id: String(id) }, { replace: true })
  }

  useEffect(() => {
    if (!tareaIdQuery) {
      return
    }
    if (puedeGestionar && tab !== "equipo") {
      setTab("equipo")
      setEstado("")
      setAsignadoA("")
      return
    }
    if (tareas.some((tarea) => tarea.id === tareaIdQuery)) {
      setSelectedId(tareaIdQuery)
    }
  }, [puedeGestionar, tab, tareaIdQuery, tareas])

  return (
    <section>
      <PageHeader
        title={t("tareas.title")}
        description={t("tareas.desc")}
        count={tab === "nueva" ? t("tareas.nuevaTarea") : tareasQuery.isLoading ? t("tareas.cargando") : t("tareas.countN", { n: resumen.total })}
        plain
      />

      {mensaje ? <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div> : null}
      {errorLocal ? <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div> : null}

      <ModuleNav
        actions={[
          { label: t("tareas.misTareas"), onClick: () => cambiarTab("mis"), icon: <UserRound size={18} aria-hidden="true" />, variant: tab === "mis" ? "primary" : "secondary" },
          ...(puedeGestionar
            ? [{ label: t("tareas.equipo"), onClick: () => cambiarTab("equipo"), icon: <CalendarClock size={18} aria-hidden="true" />, variant: tab === "equipo" ? "primary" as const : "secondary" as const }]
            : []),
          ...(puedeCrear
            ? [{ label: t("tareas.nuevaTarea"), onClick: () => cambiarTab("nueva"), icon: <Plus size={18} aria-hidden="true" />, variant: tab === "nueva" ? "primary" as const : "secondary" as const }]
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
            seleccionarTarea(tarea.id)
            await refrescar(t("tareas.msgCreada", { id: tarea.id }))
          }}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-px bg-cds-borderSubtle md:grid-cols-5">
            <Metric label={t("tareas.mPendientes")} value={String(resumen.pendiente)} />
            <Metric label={t("tareas.mEnProgreso")} value={String(resumen.en_progreso)} />
            <Metric label={t("tareas.mBloqueadas")} value={String(resumen.bloqueada)} />
            <Metric label={t("tareas.mCompletadas")} value={String(resumen.completada)} />
            <Metric label={t("tareas.mVencidas")} value={String(resumen.vencidas)} tone="error" />
          </div>

          <div className="mb-6 grid gap-4 bg-cds-layer01 p-4 md:grid-cols-3">
            <label className="block">
              <Label className="mb-2" htmlFor="tarea_estado">{t("tareas.fEstado")}</Label>
              <select id="tarea_estado" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={estado} onChange={(event) => setEstado(event.target.value)}>
                {estados.map((item) => <option key={item.value || "todos"} value={item.value}>{t(`tareas.estadoOpt.${item.value || "todos"}`)}</option>)}
              </select>
            </label>
            {tab === "equipo" && puedeGestionar ? (
              <label className="block">
                <Label className="mb-2" htmlFor="tarea_asignado">{t("tareas.fAsignadoA")}</Label>
                <select id="tarea_asignado" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={asignadoA} onChange={(event) => setAsignadoA(event.target.value)}>
                  <option value="">{t("tareas.todos")}</option>
                  {usuarios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </label>
            ) : null}
            <div className="flex items-end">
              <Button type="button" variant="secondary" onClick={() => void tareasQuery.refetch()}>
                <RotateCcw size={18} aria-hidden="true" />
                {t("tareas.actualizar")}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <TareasTable tareas={tareas} selectedId={selected?.id ?? null} isLoading={tareasQuery.isLoading} onSelect={seleccionarTarea} />
            {selected ? (
              <TareaDetalle
                tarea={selected}
                token={token!}
                usuarios={usuarios}
                puedeGestionar={puedeGestionar}
                puedeCrearCompra={puedeCrearCompra}
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
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }
  if (!tareas.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("tareas.sinTareas")}</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("tareas.thTarea")}</th>
            <th className="h-10 px-4 font-normal">{t("tareas.thEstado")}</th>
            <th className="h-10 px-4 font-normal">{t("tareas.thPrioridad")}</th>
            <th className="h-10 px-4 font-normal">{t("tareas.thAsignado")}</th>
            <th className="h-10 px-4 font-normal">{t("tareas.fFechaLimite")}</th>
          </tr>
        </thead>
        <tbody>
          {tareas.map((tarea) => (
            <tr key={tarea.id} className={cn("cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01", selectedId === tarea.id && "bg-cds-layer01")} onClick={() => onSelect(tarea.id)}>
              <td className="h-12 px-4 font-medium">#{tarea.id} · {tarea.titulo}</td>
              <td className="h-12 px-4"><span className={cn("inline-flex rounded-full px-2 py-1 text-xs ring-1", estadoClasses(tarea.estado))}>{t(`tareas.estadoOpt.${tarea.estado}`)}</span></td>
              <td className={cn("h-12 px-4 font-medium", prioridadClasses(tarea.prioridad))}>{t(`tareas.prioridadOpt.${tarea.prioridad}`)}</td>
              <td className="h-12 px-4 text-cds-textSecondary">{tarea.asignado_nombre || t("tareas.sinAsignar")}</td>
              <td className={cn("h-12 px-4 text-cds-textSecondary", isVencida(tarea) && "text-cds-supportError")}>{formatDate(tarea.fecha_limite)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TareaDetalle({ tarea, token, usuarios, puedeGestionar, puedeCrearCompra, onError, onUpdated }: { tarea: Tarea; token: string; usuarios: Usuario[]; puedeGestionar: boolean; puedeCrearCompra: boolean; onError: (message: string | null) => void; onUpdated: (message?: string) => void | Promise<void> }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  // Puente con Compras: una tarea "Reponer X" (ligada a un reactivo) puede
  // volcarse al carrito; mientras tiene una compra viva mostramos su estado.
  const esTareaReactivo = tarea.entidad_tipo === "reactivo" && Boolean(tarea.entidad_id)
  const tareaCerrada = tarea.estado === "completada" || tarea.estado === "cancelada"
  const compraRecibida = tarea.compra_item_estado === "recibido"
  const mostrarAgregarCompra = puedeCrearCompra && esTareaReactivo && !tareaCerrada && !tarea.compra_codigo
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
      await onUpdated(t("tareas.msgEstadoAct"))
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, t("tareas.errEstado"))),
  })

  const reasignarMutation = useMutation({
    mutationFn: (asignadoA: number | null) => api.reasignarTarea(token, tarea.id, asignadoA),
    onSuccess: async () => {
      onError(null)
      await onUpdated(t("tareas.msgReasignada"))
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, t("tareas.errReasignar"))),
  })

  const editarMutation = useMutation({
    mutationFn: (data: TareaActualizar) => api.actualizarTarea(token, tarea.id, data),
    onSuccess: async () => {
      onError(null)
      await onUpdated(t("tareas.msgActualizada"))
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, t("tareas.errActualizar"))),
  })

  const comentarioMutation = useMutation({
    mutationFn: () => api.comentarTarea(token, tarea.id, comentario.trim()),
    onSuccess: async () => {
      setComentario("")
      onError(null)
      await onUpdated(t("tareas.msgComentario"))
      await queryClient.invalidateQueries({ queryKey: ["tarea-eventos", tarea.id] })
    },
    onError: (error) => onError(mutationError(error, t("tareas.errComentario"))),
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
        <p>{t("tareas.detAsignadoA", { nombre: tarea.asignado_nombre || t("tareas.sinAsignar") })}</p>
        <p>{t("tareas.detCreadoPor", { nombre: tarea.creado_por_nombre || "-" })}</p>
        <p>{t("tareas.detFechaLimite", { fecha: formatDate(tarea.fecha_limite) })}</p>
        {tarea.entidad_tipo === "reactivo" && tarea.entidad_id ? (
          <Link className="inline-block text-cds-linkPrimary hover:underline" to={`/reactivos/lotes?reactivo_id=${tarea.entidad_id}`}>
            {t("tareas.verLotesReactivoRelacionado")}
          </Link>
        ) : null}
        {tarea.compra_codigo ? (
          <Link
            to="/compras"
            className={cn(
              "inline-flex w-fit items-center gap-2 px-2 py-1 text-xs ring-1 ring-inset",
              compraRecibida
                ? "bg-lab-sageBg text-cds-supportSuccess ring-cds-supportSuccess/40"
                : "bg-lab-warmTint text-lab-warmFg ring-lab-warm/40",
            )}
          >
            <ShoppingCart size={14} aria-hidden="true" />
            {compraRecibida
              ? t("tareas.compraRecibida", { codigo: tarea.compra_codigo })
              : t("tareas.enCompra", { codigo: tarea.compra_codigo })}
          </Link>
        ) : null}
        {tarea.descripcion ? <p className="text-cds-textPrimary">{tarea.descripcion}</p> : null}
      </div>

      {mostrarAgregarCompra ? (
        <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => navigate(`/compras?tarea_id=${tarea.id}`)}>
          <ShoppingCart size={18} aria-hidden="true" />
          {t("tareas.agregarACompras")}
        </Button>
      ) : null}

      <div className="mt-5 grid gap-3">
        <label className="block">
          <Label className="mb-2" htmlFor={`estado_${tarea.id}`}>{t("tareas.fEstado")}</Label>
          <select id={`estado_${tarea.id}`} className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={tarea.estado} onChange={(event) => estadoMutation.mutate(event.target.value as EstadoTarea)} disabled={estadoMutation.isPending}>
            {estadosDisponibles.map((item) => <option key={item.value} value={item.value}>{t(`tareas.estadoOpt.${item.value || "todos"}`)}</option>)}
          </select>
        </label>
        {puedeGestionar ? (
          <label className="block">
            <Label className="mb-2" htmlFor={`asignado_${tarea.id}`}>{t("tareas.fReasignar")}</Label>
            <select id={`asignado_${tarea.id}`} className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" value={tarea.asignado_a ?? ""} onChange={(event) => reasignarMutation.mutate(event.target.value ? Number(event.target.value) : null)} disabled={reasignarMutation.isPending}>
              <option value="">{t("tareas.sinAsignar")}</option>
              {usuarios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      {puedeGestionar ? (
        <form className="mt-6 border-t border-cds-borderSubtle pt-4" onSubmit={handleEdit}>
          <h3 className="mb-4 text-sm font-medium">{t("tareas.editarTarea")}</h3>
          <div className="grid gap-4">
            <label className="block"><Label className="mb-2" htmlFor={`titulo_${tarea.id}`}>{t("tareas.fTitulo")}</Label><Input id={`titulo_${tarea.id}`} name="titulo" defaultValue={tarea.titulo} required maxLength={160} /></label>
            <label className="block"><Label className="mb-2" htmlFor={`descripcion_${tarea.id}`}>{t("tareas.fDescripcion")}</Label><textarea id={`descripcion_${tarea.id}`} name="descripcion" className="min-h-[96px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 text-sm" defaultValue={tarea.descripcion ?? ""} maxLength={1000} /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block"><Label className="mb-2" htmlFor={`prioridad_${tarea.id}`}>{t("tareas.fPrioridad")}</Label><select id={`prioridad_${tarea.id}`} name="prioridad" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" defaultValue={tarea.prioridad}>{prioridades.map((item) => <option key={item.value} value={item.value}>{t(`tareas.prioridadOpt.${item.value}`)}</option>)}</select></label>
              <label className="block"><Label className="mb-2" htmlFor={`fecha_${tarea.id}`}>{t("tareas.fFechaLimite")}</Label><Input id={`fecha_${tarea.id}`} name="fecha_limite" type="date" defaultValue={tarea.fecha_limite ?? ""} /></label>
            </div>
            <Button type="submit" disabled={editarMutation.isPending}><Save size={18} aria-hidden="true" />{t("common.guardarCambios")}</Button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 border-t border-cds-borderSubtle pt-4">
        <h3 className="mb-3 text-sm font-medium">{t("tareas.historial")}</h3>
        <div className="space-y-3">
          {(eventosQuery.data ?? []).map((evento) => <EventoItem key={evento.id} evento={evento} />)}
          {eventosQuery.isLoading ? <p className="text-sm text-cds-textSecondary">{t("tareas.cargandoHistorial")}</p> : null}
          {!eventosQuery.isLoading && !(eventosQuery.data ?? []).length ? <p className="text-sm text-cds-textSecondary">{t("tareas.sinEventos")}</p> : null}
        </div>
        <form className="mt-4" onSubmit={(event) => { event.preventDefault(); comentarioMutation.mutate() }}>
          <Label className="mb-2" htmlFor={`comentario_${tarea.id}`}>{t("tareas.fComentario")}</Label>
          <textarea id={`comentario_${tarea.id}`} className="min-h-[80px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 text-sm" value={comentario} onChange={(event) => setComentario(event.target.value)} maxLength={1000} required />
          <Button className="mt-3" type="submit" disabled={comentarioMutation.isPending || !comentario.trim()}><MessageSquarePlus size={18} aria-hidden="true" />{t("tareas.agregarComentario")}</Button>
        </form>
      </div>
    </aside>
  )
}

function EventoItem({ evento }: { evento: TareaEvento }) {
  const { t } = useTranslation()
  let texto = evento.comentario || evento.tipo
  if (evento.tipo === "estado") {
    texto = t("tareas.evEstado", {
      usuario: evento.usuario_nombre,
      anterior: t(`tareas.estadoOpt.${evento.estado_anterior || "todos"}`),
      nuevo: t(`tareas.estadoOpt.${evento.estado_nuevo || "todos"}`),
    })
  } else if (evento.tipo === "reasignacion") {
    texto = t("tareas.evReasignacion", {
      usuario: evento.usuario_nombre,
      anterior: evento.asignado_anterior_nombre || t("tareas.sinAsignar"),
      nuevo: evento.asignado_nuevo_nombre || t("tareas.sinAsignar"),
    })
  } else if (evento.tipo === "creacion") {
    texto = t("tareas.evCreacion", { usuario: evento.usuario_nombre })
  } else if (evento.tipo === "edicion") {
    texto = t("tareas.evEdicion", { usuario: evento.usuario_nombre, comentario: evento.comentario || "" })
  } else if (evento.tipo === "comentario") {
    texto = t("tareas.evComentario", { usuario: evento.usuario_nombre, comentario: evento.comentario || "" })
  }
  return <p className="border-l-2 border-cds-borderSubtle pl-3 text-sm text-cds-textSecondary"><span className="text-cds-textPrimary">{formatDateTime(evento.fecha)}</span> · {texto}</p>
}

function NuevaTareaForm({ token, usuarios, onError, onSuccess }: { token: string; usuarios: Usuario[]; onError: (message: string | null) => void; onSuccess: (tarea: Tarea) => void | Promise<void> }) {
  const { t } = useTranslation()
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
    onError: (error) => onError(mutationError(error, t("tareas.errCrear"))),
  })

  return (
    <form className="bg-cds-layer01 p-4" onSubmit={(event) => mutation.mutate(event)}>
      <div className="grid gap-5">
        <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_titulo">{t("tareas.fTitulo")}</Label><Input id="nueva_tarea_titulo" name="titulo" required maxLength={160} /></label>
        <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_desc">{t("tareas.fDescripcion")}</Label><textarea id="nueva_tarea_desc" name="descripcion" className="min-h-[120px] w-full border-b border-cds-borderStrong bg-cds-field px-4 py-3 text-sm" maxLength={1000} /></label>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_prioridad">{t("tareas.fPrioridad")}</Label><select id="nueva_tarea_prioridad" name="prioridad" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm" defaultValue="media">{prioridades.map((item) => <option key={item.value} value={item.value}>{t(`tareas.prioridadOpt.${item.value}`)}</option>)}</select></label>
          <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_asignado">{t("tareas.fAsignadoA")}</Label><select id="nueva_tarea_asignado" name="asignado_a" className="h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm"><option value="">{t("tareas.sinAsignar")}</option>{usuarios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
          <label className="block"><Label className="mb-2" htmlFor="nueva_tarea_fecha">{t("tareas.fFechaLimite")}</Label><Input id="nueva_tarea_fecha" name="fecha_limite" type="date" /></label>
        </div>
        <Button type="submit" disabled={mutation.isPending}><Plus size={18} aria-hidden="true" />{t("tareas.crearTarea")}</Button>
      </div>
    </form>
  )
}
