import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bot, Building2, Check, Plus, RefreshCw, Search, Shield, UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type AsistenteEventoOwner, type AsistenteResumenOwner, type AuthEvento, type Organizacion, type UsuarioCrear } from "../lib/api"
import { useAuth } from "../lib/auth"
import { cn } from "../lib/utils"

type TabOwner = "organizaciones" | "nueva" | "admin" | "seguridad" | "ia"
type Rol = "admin" | "jefe" | "cientifico"

const modulosDisponibles = [
  "dashboard",
  "reactivos",
  "lotes",
  "consumo",
  "movimientos",
  "proveedores",
  "usuarios",
  "equipamiento",
  "asistente",
  "auditoria",
  "protocolos",
  "tareas",
]

const dependenciasModulos: Record<string, string[]> = {
  dashboard: ["reactivos", "lotes", "movimientos"],
  lotes: ["reactivos"],
  consumo: ["reactivos", "lotes"],
  movimientos: ["reactivos", "lotes"],
  auditoria: ["reactivos", "lotes", "movimientos"],
  protocolos: ["reactivos", "lotes", "consumo", "movimientos"],
  asistente: ["reactivos", "lotes"],
}

function activoBool(value: number | boolean | undefined) {
  return value === undefined || value === true || value === 1
}

function nullable(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed ? trimmed : null
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function fechaInput(diasAtras: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - diasAtras)
  return fecha.toISOString().slice(0, 10)
}

function formatFecha(fecha: string) {
  if (!fecha) {
    return "-"
  }
  const iso = fecha.includes("T") ? fecha : `${fecha.replace(" ", "T")}Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return fecha
  }
  return date.toLocaleString()
}

function formatUsd(value: number | undefined) {
  return `$${Number(value ?? 0).toFixed(4)}`
}

function formatMs(value: number | undefined) {
  return `${Math.round(Number(value ?? 0))} ms`
}

function resolverDependenciasModulos(modulos: string[]) {
  const habilitados = new Set(modulos)
  const pendientes = [...habilitados]
  while (pendientes.length) {
    const modulo = pendientes.pop()!
    for (const dependencia of dependenciasModulos[modulo] ?? []) {
      if (!habilitados.has(dependencia)) {
        habilitados.add(dependencia)
        pendientes.push(dependencia)
      }
    }
  }
  return Array.from(habilitados)
}

function tieneDependientesActivos(modulo: string, modulos: string[]) {
  return modulos.some((activo) => dependenciasModulos[activo]?.includes(modulo))
}

export function OwnerPage() {
  const { token } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<TabOwner>("organizaciones")
  const [busqueda, setBusqueda] = useState("")
  const [organizacionId, setOrganizacionId] = useState<number | null>(null)
  const [segDesde, setSegDesde] = useState(() => fechaInput(7))
  const [segHasta, setSegHasta] = useState(() => fechaInput(0))
  const [segEvento, setSegEvento] = useState("")
  const [segEmail, setSegEmail] = useState("")
  const [segIp, setSegIp] = useState("")
  const [iaDesde, setIaDesde] = useState(() => fechaInput(7))
  const [iaHasta, setIaHasta] = useState(() => fechaInput(0))
  const [iaModo, setIaModo] = useState("")
  const [iaOrigen, setIaOrigen] = useState("")
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const organizacionesQuery = useQuery({
    queryKey: ["owner", "organizaciones"],
    queryFn: () => api.organizaciones(token!, false),
    enabled: Boolean(token),
  })

  const organizaciones = organizacionesQuery.data ?? []
  const authEventosQuery = useQuery({
    queryKey: ["owner", "auth-eventos", segDesde, segHasta, segEvento, segEmail, segIp, organizacionId],
    queryFn: () =>
      api.authEventos(token!, {
        desde: segDesde,
        hasta: segHasta,
        evento: segEvento,
        email: segEmail,
        ip: segIp,
        organizacion_id: organizacionId,
        limite: 300,
      }),
    enabled: Boolean(token) && tab === "seguridad",
  })
  const asistenteEventosQuery = useQuery({
    queryKey: ["owner", "asistente-eventos", iaDesde, iaHasta, iaModo, iaOrigen, organizacionId],
    queryFn: () =>
      api.asistenteEventos(token!, {
        desde: iaDesde,
        hasta: iaHasta,
        modo_respuesta: iaModo,
        origen: iaOrigen,
        organizacion_id: organizacionId,
        limite: 300,
      }),
    enabled: Boolean(token) && tab === "ia",
  })
  const asistenteResumenQuery = useQuery({
    queryKey: ["owner", "asistente-resumen", iaDesde, iaHasta, iaOrigen, organizacionId],
    queryFn: () =>
      api.asistenteResumen(token!, {
        desde: iaDesde,
        hasta: iaHasta,
        origen: iaOrigen,
        organizacion_id: organizacionId,
      }),
    enabled: Boolean(token) && tab === "ia",
  })

  const organizacionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    if (!texto) {
      return organizaciones
    }
    return organizaciones.filter((item) =>
      [item.nombre, item.slug, item.id]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(texto)),
    )
  }, [busqueda, organizaciones])

  const organizacionSeleccionada = useMemo(() => {
    if (!organizacionesFiltradas.length) {
      return null
    }
    if (!organizacionId) {
      return organizacionesFiltradas[0]
    }
    return organizacionesFiltradas.find((item) => item.id === organizacionId) ?? organizacionesFiltradas[0]
  }, [organizacionId, organizacionesFiltradas])

  async function refrescar(mensajeOk?: string) {
    await queryClient.invalidateQueries({ queryKey: ["owner", "organizaciones"] })
    if (mensajeOk) {
      setMensaje(mensajeOk)
    }
  }

  return (
    <section>
      <PageHeader
        title={t("owner.title")}
        description={t("owner.desc")}
        count={organizacionesQuery.isLoading ? t("owner.cargando") : t("owner.countN", { n: organizaciones.length })}
      />

      {mensaje ? (
        <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      <ModuleNav
        actions={[
          { label: t("owner.organizaciones"), onClick: () => setTab("organizaciones"), icon: <Building2 size={18} aria-hidden="true" />, variant: tab === "organizaciones" ? "primary" : "secondary" },
          { label: t("owner.nuevaOrg"), onClick: () => setTab("nueva"), icon: <Plus size={18} aria-hidden="true" />, variant: tab === "nueva" ? "primary" : "secondary" },
          { label: t("owner.adminInicial"), onClick: () => setTab("admin"), icon: <UserPlus size={18} aria-hidden="true" />, variant: tab === "admin" ? "primary" : "secondary" },
          { label: t("owner.seguridad"), onClick: () => setTab("seguridad"), icon: <Shield size={18} aria-hidden="true" />, variant: tab === "seguridad" ? "primary" : "secondary" },
          { label: t("owner.ia"), onClick: () => setTab("ia"), icon: <Bot size={18} aria-hidden="true" />, variant: tab === "ia" ? "primary" : "secondary" },
        ]}
      />

      {tab === "organizaciones" ? (
        <>
          <label className="mb-4 block">
            <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("common.buscar")}</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={18} aria-hidden="true" />
              <Input className="pl-12" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder={t("owner.buscarPh")} />
            </div>
          </label>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <OrganizacionesTable
              organizaciones={organizacionesFiltradas}
              isLoading={organizacionesQuery.isLoading}
              selectedId={organizacionSeleccionada?.id ?? null}
              onSelect={setOrganizacionId}
            />
            {organizacionSeleccionada ? (
              <OrganizacionDetalle
                token={token!}
                organizacion={organizacionSeleccionada}
                onError={setErrorLocal}
                onUpdated={refrescar}
              />
            ) : null}
          </div>
        </>
      ) : null}

      {tab === "nueva" ? (
        <NuevaOrganizacionForm
          token={token!}
          onError={setErrorLocal}
          onSuccess={async (id, nombre) => {
            setOrganizacionId(id)
            setTab("organizaciones")
            await refrescar(t("owner.msgOrgCreada", { nombre }))
          }}
        />
      ) : null}

      {tab === "admin" ? (
        <AdminInicialForm
          token={token!}
          organizaciones={organizaciones}
          organizacionId={organizacionSeleccionada?.id ?? organizaciones[0]?.id ?? null}
          onOrganizacionChange={setOrganizacionId}
          onError={setErrorLocal}
          onSuccess={async (nombre) => {
            setTab("organizaciones")
            await refrescar(t("owner.msgUsuarioCreado", { nombre }))
          }}
        />
      ) : null}

      {tab === "seguridad" ? (
        <AuthEventosPanel
          organizaciones={organizaciones}
          organizacionId={organizacionId}
          onOrganizacionChange={setOrganizacionId}
          desde={segDesde}
          hasta={segHasta}
          evento={segEvento}
          email={segEmail}
          ip={segIp}
          onDesdeChange={setSegDesde}
          onHastaChange={setSegHasta}
          onEventoChange={setSegEvento}
          onEmailChange={setSegEmail}
          onIpChange={setSegIp}
          eventos={authEventosQuery.data?.eventos ?? []}
          isLoading={authEventosQuery.isLoading}
          isFetching={authEventosQuery.isFetching}
          onRefresh={() => authEventosQuery.refetch()}
        />
      ) : null}

      {tab === "ia" ? (
        <AsistenteEventosPanel
          organizaciones={organizaciones}
          organizacionId={organizacionId}
          onOrganizacionChange={setOrganizacionId}
          desde={iaDesde}
          hasta={iaHasta}
          modo={iaModo}
          origen={iaOrigen}
          onDesdeChange={setIaDesde}
          onHastaChange={setIaHasta}
          onModoChange={setIaModo}
          onOrigenChange={setIaOrigen}
          eventos={asistenteEventosQuery.data?.eventos ?? []}
          resumen={asistenteResumenQuery.data ?? null}
          isLoading={asistenteEventosQuery.isLoading || asistenteResumenQuery.isLoading}
          isFetching={asistenteEventosQuery.isFetching || asistenteResumenQuery.isFetching}
          onRefresh={() => {
            void asistenteEventosQuery.refetch()
            void asistenteResumenQuery.refetch()
          }}
        />
      ) : null}
    </section>
  )
}

function OrganizacionesTable({
  organizaciones,
  isLoading,
  selectedId,
  onSelect,
}: {
  organizaciones: Organizacion[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }
  if (!organizaciones.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("owner.sinOrgs")}</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">ID</th>
            <th className="h-10 px-4 font-normal">{t("owner.thNombre")}</th>
            <th className="h-10 px-4 font-normal">Slug</th>
            <th className="h-10 px-4 font-normal">{t("owner.thModulos")}</th>
            <th className="h-10 px-4 font-normal">{t("owner.thEstado")}</th>
          </tr>
        </thead>
        <tbody>
          {organizaciones.map((item) => {
            const activos = item.modulos?.filter((modulo) => modulo.habilitado).length ?? 0
            return (
              <tr
                key={item.id}
                className={cn(
                  "cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01",
                  selectedId === item.id && "bg-cds-layer01",
                )}
                onClick={() => onSelect(item.id)}
              >
                <td className="h-12 px-4 font-mono text-xs">{item.id}</td>
                <td className="h-12 px-4 font-medium">{item.nombre}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{item.slug}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{activos}/{modulosDisponibles.length}</td>
                <td className="h-12 px-4">{activoBool(item.activo) ? t("owner.activa") : t("owner.inactiva")}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function OrganizacionDetalle({
  token,
  organizacion,
  onError,
  onUpdated,
}: {
  token: string
  organizacion: Organizacion
  onError: (message: string | null) => void
  onUpdated: (message?: string) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [modulos, setModulos] = useState<string[]>(() =>
    organizacion.modulos?.filter((modulo) => modulo.habilitado).map((modulo) => modulo.modulo) ?? [],
  )

  const modulosActuales = useMemo(
    () => organizacion.modulos?.filter((modulo) => modulo.habilitado).map((modulo) => modulo.modulo) ?? [],
    [organizacion],
  )

  const actualizarMutation = useMutation({
    mutationFn: () => api.actualizarModulosOrganizacion(token, organizacion.id, resolverDependenciasModulos(modulos)),
  })

  function toggleModulo(modulo: string) {
    setModulos((actuales) => {
      if (actuales.includes(modulo)) {
        return actuales.filter((item) => item !== modulo)
      }
      return resolverDependenciasModulos([...actuales, modulo])
    })
  }

  async function guardarModulos() {
    onError(null)
    try {
      await actualizarMutation.mutateAsync()
      await onUpdated(t("owner.msgModulos"))
    } catch (error) {
      onError(mutationError(error, t("owner.errModulos")))
    }
  }

  useEffect(() => {
    setModulos(resolverDependenciasModulos(modulosActuales))
  }, [modulosActuales])

  return (
    <aside className="bg-cds-layer01 p-4">
      <div className="mb-5">
        <div className="mb-3 text-cds-textSecondary">
          <Building2 size={22} aria-hidden="true" />
        </div>
        <h2 className="text-[24px] leading-[1.33]">{organizacion.nombre}</h2>
        <div className="mt-2 font-mono text-xs text-cds-textSecondary">{organizacion.slug}</div>
      </div>

      <div className="border-t border-cds-borderSubtle pt-4">
        <div className="mb-3 text-xs tracking-[0.32px] text-cds-textSecondary">{t("owner.modulosHabilitados")}</div>
        <div className="grid gap-2">
          {modulosDisponibles.map((modulo) => (
            <label key={modulo} className="flex h-10 items-center gap-3 bg-cds-background px-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-cds-buttonPrimary"
                checked={modulos.includes(modulo)}
                disabled={tieneDependientesActivos(modulo, modulos)}
                onChange={() => toggleModulo(modulo)}
              />
              <span>{t(`owner.modulo.${modulo}`)}</span>
            </label>
          ))}
        </div>
        <Button className="mt-4" type="button" onClick={guardarModulos} disabled={actualizarMutation.isPending}>
          <Check size={18} aria-hidden="true" />
          {actualizarMutation.isPending ? t("common.guardando") : t("owner.guardarModulos")}
        </Button>
      </div>
    </aside>
  )
}

function NuevaOrganizacionForm({
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
    mutationFn: (data: { nombre: string; slug?: string | null; modulos_habilitados: string[] }) => api.crearOrganizacion(token, data),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    onError(null)
    try {
      const form = new FormData(formElement)
      const nombre = String(form.get("nombre") ?? "").trim()
      if (!nombre) {
        throw new Error(t("owner.errNombre"))
      }
      const modulos = form.getAll("modulos").map((value) => String(value))
      const resultado = await crearMutation.mutateAsync({
        nombre,
        slug: nullable(form.get("slug")),
        modulos_habilitados: resolverDependenciasModulos(modulos),
      })
      formElement.reset()
      await onSuccess(resultado.id, nombre)
    } catch (error) {
      onError(mutationError(error, t("owner.errCrearOrg")))
    }
  }

  return (
    <form className="max-w-4xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">{t("owner.nuevaOrg")}</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("owner.fNombre")} name="nombre" required />
        <Field label={t("owner.fSlug")} name="slug" placeholder={t("owner.slugPh")} />
      </div>
      <div className="mt-6">
        <div className="mb-3 text-xs tracking-[0.32px] text-cds-textSecondary">{t("owner.modulosIniciales")}</div>
        <div className="grid gap-2 md:grid-cols-2">
          {modulosDisponibles.map((modulo) => (
            <label key={modulo} className="flex h-10 items-center gap-3 bg-cds-background px-3 text-sm">
              <input type="checkbox" name="modulos" value={modulo} className="h-4 w-4 accent-cds-buttonPrimary" defaultChecked />
              <span>{t(`owner.modulo.${modulo}`)}</span>
            </label>
          ))}
        </div>
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Plus size={18} aria-hidden="true" />
        {crearMutation.isPending ? t("common.creando") : t("owner.crearOrg")}
      </Button>
    </form>
  )
}

function AdminInicialForm({
  token,
  organizaciones,
  organizacionId,
  onOrganizacionChange,
  onError,
  onSuccess,
}: {
  token: string
  organizaciones: Organizacion[]
  organizacionId: number | null
  onOrganizacionChange: (id: number) => void
  onError: (message: string | null) => void
  onSuccess: (nombre: string) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const crearMutation = useMutation({
    mutationFn: ({ organizacionId, data }: { organizacionId: number; data: UsuarioCrear }) =>
      api.crearUsuarioOrganizacion(token, organizacionId, data),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    onError(null)
    try {
      const form = new FormData(formElement)
      const selectedOrgId = Number(form.get("organizacion_id"))
      const nombre = String(form.get("nombre") ?? "").trim()
      const email = String(form.get("email") ?? "").trim()
      const passwordInicial = String(form.get("password_inicial") ?? "")
      const rol = String(form.get("rol") ?? "admin") as Rol
      if (!selectedOrgId) {
        throw new Error(t("owner.errOrg"))
      }
      if (!nombre) {
        throw new Error(t("owner.errNombre"))
      }
      if (!email) {
        throw new Error(t("owner.errEmail"))
      }
      if (passwordInicial.length < 8) {
        throw new Error(t("owner.errPassword"))
      }
      await crearMutation.mutateAsync({
        organizacionId: selectedOrgId,
        data: {
          nombre,
          email,
          sector: nullable(form.get("sector")),
          rol,
          password_inicial: passwordInicial,
        },
      })
      formElement.reset()
      await onSuccess(nombre)
    } catch (error) {
      onError(mutationError(error, t("owner.errCrearUsuario")))
    }
  }

  return (
    <form className="max-w-4xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">{t("owner.adminInicial")}</h2>
      </div>
      <label className="mb-5 block">
        <Label className="mb-2" htmlFor="organizacion_id">{t("owner.fOrganizacion")}</Label>
        <select
          id="organizacion_id"
          name="organizacion_id"
          className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
          value={organizacionId ?? ""}
          onChange={(event) => onOrganizacionChange(Number(event.target.value))}
        >
          {organizaciones.map((organizacion) => (
            <option key={organizacion.id} value={organizacion.id}>
              {organizacion.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("owner.fNombre")} name="nombre" required />
        <Field label={t("owner.fEmail")} name="email" type="email" required />
        <Field label={t("owner.fSector")} name="sector" placeholder={t("owner.fSectorPh")} />
        <label className="block">
          <Label className="mb-2" htmlFor="rol">{t("owner.fRol")}</Label>
          <select
            id="rol"
            name="rol"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            defaultValue="admin"
          >
            {(["admin", "jefe", "cientifico"] as Rol[]).map((rol) => (
              <option key={rol} value={rol}>{t(`roles.${rol}`)}</option>
            ))}
          </select>
        </label>
        <Field className="md:col-span-2" label={t("owner.fPassword")} name="password_inicial" type="password" minLength={8} required />
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending || !organizaciones.length}>
        <UserPlus size={18} aria-hidden="true" />
        {crearMutation.isPending ? t("common.creando") : t("owner.crearUsuario")}
      </Button>
    </form>
  )
}

function AuthEventosPanel({
  organizaciones,
  organizacionId,
  onOrganizacionChange,
  desde,
  hasta,
  evento,
  email,
  ip,
  onDesdeChange,
  onHastaChange,
  onEventoChange,
  onEmailChange,
  onIpChange,
  eventos,
  isLoading,
  isFetching,
  onRefresh,
}: {
  organizaciones: Organizacion[]
  organizacionId: number | null
  onOrganizacionChange: (id: number | null) => void
  desde: string
  hasta: string
  evento: string
  email: string
  ip: string
  onDesdeChange: (value: string) => void
  onHastaChange: (value: string) => void
  onEventoChange: (value: string) => void
  onEmailChange: (value: string) => void
  onIpChange: (value: string) => void
  eventos: AuthEvento[]
  isLoading: boolean
  isFetching: boolean
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const exitosos = eventos.filter((item) => item.evento === "login_success").length
  const fallidos = eventos.filter((item) => item.evento === "login_failed").length
  const logouts = eventos.filter((item) => item.evento === "logout").length

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label={t("owner.segTotal")} value={eventos.length} />
        <Metric label={t("owner.segLoginsOk")} value={exitosos} />
        <Metric label={t("owner.segLoginsFail")} value={fallidos} tone={fallidos ? "error" : "default"} />
        <Metric label={t("owner.segLogouts")} value={logouts} />
      </div>

      <div className="grid gap-4 bg-cds-layer01 p-4 md:grid-cols-6">
        <Field label={t("owner.segDesde")} name="auth_desde" type="date" value={desde} onChange={(event) => onDesdeChange(event.target.value)} />
        <Field label={t("owner.segHasta")} name="auth_hasta" type="date" value={hasta} onChange={(event) => onHastaChange(event.target.value)} />
        <label className="block">
          <Label className="mb-2" htmlFor="auth_evento">{t("owner.segEvento")}</Label>
          <select
            id="auth_evento"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={evento}
            onChange={(event) => onEventoChange(event.target.value)}
          >
            <option value="">{t("owner.segTodos")}</option>
            <option value="login_success">{t("owner.evento.login_success")}</option>
            <option value="login_failed">{t("owner.evento.login_failed")}</option>
            <option value="logout">{t("owner.evento.logout")}</option>
          </select>
        </label>
        <label className="block">
          <Label className="mb-2" htmlFor="auth_org">{t("owner.fOrganizacion")}</Label>
          <select
            id="auth_org"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={organizacionId ?? ""}
            onChange={(event) => onOrganizacionChange(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">{t("owner.segTodasOrgs")}</option>
            {organizaciones.map((organizacion) => (
              <option key={organizacion.id} value={organizacion.id}>
                {organizacion.nombre}
              </option>
            ))}
          </select>
        </label>
        <Field label={t("owner.segEmail")} name="auth_email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
        <Field label={t("owner.segIp")} name="auth_ip" value={ip} onChange={(event) => onIpChange(event.target.value)} />
        <Button className="md:col-span-6" type="button" variant="secondary" onClick={onRefresh} disabled={isFetching}>
          <RefreshCw size={18} aria-hidden="true" />
          {isFetching ? t("common.cargando") : t("owner.segRefrescar")}
        </Button>
      </div>

      <div className="overflow-x-auto border-t border-cds-borderSubtle">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
              <th className="h-10 px-4 font-normal">{t("owner.segFecha")}</th>
              <th className="h-10 px-4 font-normal">{t("owner.segEvento")}</th>
              <th className="h-10 px-4 font-normal">{t("owner.segUsuario")}</th>
              <th className="h-10 px-4 font-normal">{t("owner.fOrganizacion")}</th>
              <th className="h-10 px-4 font-normal">{t("owner.segIp")}</th>
              <th className="h-10 px-4 font-normal">{t("owner.segMotivo")}</th>
              <th className="h-10 px-4 font-normal">User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="h-12 px-4 text-cds-textSecondary" colSpan={7}>{t("common.cargandoTabla")}</td></tr>
            ) : eventos.length ? (
              eventos.map((item) => (
                <tr key={item.id} className="border-b border-cds-borderSubtle">
                  <td className="h-12 px-4 font-mono text-xs">{formatFecha(item.fecha)}</td>
                  <td className="h-12 px-4">{t(`owner.evento.${item.evento}`)}</td>
                  <td className="h-12 px-4">
                    <div>{item.usuario_nombre ?? "-"}</div>
                    <div className="text-xs text-cds-textSecondary">{item.email ?? "-"}</div>
                  </td>
                  <td className="h-12 px-4">{item.organizacion_nombre ?? "-"}</td>
                  <td className="h-12 px-4 font-mono text-xs">{item.ip ?? "-"}</td>
                  <td className="h-12 px-4">{item.motivo ?? "-"}</td>
                  <td className="h-12 max-w-[260px] truncate px-4 text-xs text-cds-textSecondary" title={item.user_agent ?? ""}>{item.user_agent ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr><td className="h-12 px-4 text-cds-textSecondary" colSpan={7}>{t("owner.segSinEventos")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AsistenteEventosPanel({
  organizaciones,
  organizacionId,
  onOrganizacionChange,
  desde,
  hasta,
  modo,
  origen,
  onDesdeChange,
  onHastaChange,
  onModoChange,
  onOrigenChange,
  eventos,
  resumen,
  isLoading,
  isFetching,
  onRefresh,
}: {
  organizaciones: Organizacion[]
  organizacionId: number | null
  onOrganizacionChange: (id: number | null) => void
  desde: string
  hasta: string
  modo: string
  origen: string
  onDesdeChange: (value: string) => void
  onHastaChange: (value: string) => void
  onModoChange: (value: string) => void
  onOrigenChange: (value: string) => void
  eventos: AsistenteEventoOwner[]
  resumen: AsistenteResumenOwner | null
  isLoading: boolean
  isFetching: boolean
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const total = resumen?.total
  const eventosError = Number(total?.errores ?? eventos.filter((item) => !activoBool(item.exito)).length)

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-5">
        <Metric label={t("owner.iaTotal")} value={Number(total?.total ?? eventos.length)} />
        <Metric label={t("owner.iaErrores")} value={eventosError} tone={eventosError ? "error" : "default"} />
        <Metric label={t("owner.iaCosto")} value={formatUsd(total?.costo_estimado_usd)} />
        <Metric label={t("owner.iaTokens")} value={Number(total?.tokens_input ?? 0) + Number(total?.tokens_output ?? 0)} />
        <Metric label={t("owner.iaLatencia")} value={formatMs(total?.duracion_ms_promedio)} />
      </div>

      <div className="grid gap-4 bg-cds-layer01 p-4 md:grid-cols-6">
        <Field label={t("owner.segDesde")} name="ia_desde" type="date" value={desde} onChange={(event) => onDesdeChange(event.target.value)} />
        <Field label={t("owner.segHasta")} name="ia_hasta" type="date" value={hasta} onChange={(event) => onHastaChange(event.target.value)} />
        <label className="block">
          <Label className="mb-2" htmlFor="ia_origen">{t("owner.iaOrigen")}</Label>
          <select
            id="ia_origen"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={origen}
            onChange={(event) => onOrigenChange(event.target.value)}
          >
            <option value="">{t("owner.segTodos")}</option>
            <option value="asistente">{t("owner.origen.asistente")}</option>
            <option value="vision">{t("owner.origen.vision")}</option>
            <option value="matching">{t("owner.origen.matching")}</option>
            <option value="importacion">{t("owner.origen.importacion")}</option>
          </select>
        </label>
        <label className="block">
          <Label className="mb-2" htmlFor="ia_modo">{t("owner.iaModo")}</Label>
          <select
            id="ia_modo"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={modo}
            onChange={(event) => onModoChange(event.target.value)}
          >
            <option value="">{t("owner.segTodos")}</option>
            <option value="fast_path">{t("owner.modo.fast_path")}</option>
            <option value="llm_tools">{t("owner.modo.llm_tools")}</option>
            <option value="llm_general">{t("owner.modo.llm_general")}</option>
            <option value="vision">{t("owner.modo.vision")}</option>
            <option value="matching">{t("owner.modo.matching")}</option>
            <option value="importacion">{t("owner.modo.importacion")}</option>
            <option value="error">{t("owner.modo.error")}</option>
          </select>
        </label>
        <label className="block">
          <Label className="mb-2" htmlFor="ia_org">{t("owner.fOrganizacion")}</Label>
          <select
            id="ia_org"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={organizacionId ?? ""}
            onChange={(event) => onOrganizacionChange(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">{t("owner.segTodasOrgs")}</option>
            {organizaciones.map((organizacion) => (
              <option key={organizacion.id} value={organizacion.id}>
                {organizacion.nombre}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={isFetching}>
          <RefreshCw size={18} aria-hidden="true" />
          {isFetching ? t("common.cargando") : t("owner.iaRefrescar")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-x-auto border-t border-cds-borderSubtle">
          <table className="w-full min-w-[1260px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
                <th className="h-10 px-4 font-normal">{t("owner.segFecha")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaOrigen")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.segUsuario")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.fOrganizacion")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaModo")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaEntrada")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaTools")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaTokens")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaCosto")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaLatencia")}</th>
                <th className="h-10 px-4 font-normal">{t("owner.iaError")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="h-12 px-4 text-cds-textSecondary" colSpan={11}>{t("common.cargandoTabla")}</td></tr>
              ) : eventos.length ? (
                eventos.map((item) => (
                  <tr key={item.id} className="border-b border-cds-borderSubtle">
                    <td className="h-12 px-4 font-mono text-xs">{formatFecha(item.fecha)}</td>
                    <td className="h-12 px-4">{t(`owner.origen.${item.origen ?? "asistente"}`, { defaultValue: item.origen ?? "-" })}</td>
                    <td className="h-12 px-4">{item.usuario_nombre ?? item.usuario_id ?? "-"}</td>
                    <td className="h-12 px-4">{item.organizacion_nombre ?? item.organizacion_id}</td>
                    <td className="h-12 px-4">
                      <div>{t(`owner.modo.${item.modo_respuesta}`, { defaultValue: item.modo_respuesta })}</div>
                      <div className="text-xs text-cds-textSecondary">{item.detalle ?? item.modelo ?? "-"}</div>
                    </td>
                    <td className="h-12 max-w-[300px] truncate px-4" title={item.entrada_resumen ?? item.pregunta ?? ""}>{item.entrada_resumen ?? item.pregunta ?? "-"}</td>
                    <td className="h-12 px-4">
                      <div>{item.tools_count}</div>
                      <div className="max-w-[180px] truncate text-xs text-cds-textSecondary" title={item.tools_nombres ?? ""}>{item.tools_nombres || "-"}</div>
                    </td>
                    <td className="h-12 px-4 font-mono text-xs">{Number(item.tokens_input ?? 0) + Number(item.tokens_output ?? 0)}</td>
                    <td className="h-12 px-4 font-mono text-xs">{formatUsd(item.costo_estimado_usd)}</td>
                    <td className="h-12 px-4 font-mono text-xs">{formatMs(item.duracion_ms)}</td>
                    <td className="h-12 max-w-[220px] truncate px-4 text-xs text-cds-supportError" title={item.error ?? ""}>{item.error ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="h-12 px-4 text-cds-textSecondary" colSpan={11}>{t("owner.iaSinEventos")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid content-start gap-4">
          <div className="bg-cds-layer01 p-4">
            <h2 className="text-[18px] leading-[1.33]">{t("owner.iaPorOrigen")}</h2>
            <div className="mt-4 space-y-3">
              {(resumen?.por_origen ?? []).length ? resumen!.por_origen!.map((item) => (
                <div key={item.origen} className="flex items-center justify-between gap-3 border-b border-cds-borderSubtle pb-2 text-sm">
                  <span>{t(`owner.origen.${item.origen}`, { defaultValue: item.origen })}</span>
                  <span>{item.total} · {formatUsd(item.costo_estimado_usd)}</span>
                </div>
              )) : <div className="text-sm text-cds-textSecondary">{t("owner.iaSinEventos")}</div>}
            </div>
          </div>
          <div className="bg-cds-layer01 p-4">
            <h2 className="text-[18px] leading-[1.33]">{t("owner.iaPorModo")}</h2>
            <div className="mt-4 space-y-3">
              {(resumen?.por_modo ?? []).length ? resumen!.por_modo.map((item) => (
                <div key={item.modo_respuesta} className="flex items-center justify-between gap-3 border-b border-cds-borderSubtle pb-2 text-sm">
                  <span>{t(`owner.modo.${item.modo_respuesta}`, { defaultValue: item.modo_respuesta })}</span>
                  <span className="font-mono">{item.total}</span>
                </div>
              )) : <div className="text-sm text-cds-textSecondary">{t("owner.iaSinEventos")}</div>}
            </div>
          </div>
          <div className="bg-cds-layer01 p-4">
            <h2 className="text-[18px] leading-[1.33]">{t("owner.iaPorDia")}</h2>
            <div className="mt-4 space-y-3">
              {(resumen?.por_dia ?? []).slice(0, 10).map((item) => (
                <div key={item.dia} className="flex items-center justify-between gap-3 border-b border-cds-borderSubtle pb-2 text-sm">
                  <span className="font-mono text-xs">{item.dia}</span>
                  <span>{item.total} · {formatUsd(item.costo_estimado_usd)}</span>
                </div>
              ))}
              {!(resumen?.por_dia ?? []).length ? <div className="text-sm text-cds-textSecondary">{t("owner.iaSinEventos")}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "error" }) {
  return (
    <div className="bg-cds-layer01 p-4">
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div className={cn("mt-2 text-[28px] leading-none", tone === "error" && "text-cds-supportError")}>{value}</div>
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
