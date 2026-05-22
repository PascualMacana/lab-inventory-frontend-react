import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Eye, EyeOff, Mail, Plus, RotateCcw, Search, Shield, UserRound, Users } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { EstadoBadge } from "../components/ui/estado-badge"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type Usuario, type UsuarioCrear } from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

type TabUsuarios = "listado" | "nuevo"
type Rol = "admin" | "jefe" | "cientifico"

const usuariosVacios: Usuario[] = []
const rolLabels: Record<Rol, string> = {
  admin: "Admin",
  jefe: "Jefe",
  cientifico: "Científico",
}

function activoBool(value: number | boolean | undefined) {
  return value === undefined || value === true || value === 1
}

function mustChangeBool(value: number | boolean | undefined) {
  return value === true || value === 1
}

function nullable(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed ? trimmed : null
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function UsuariosPage() {
  const { token, usuario } = useAuth()
  const queryClient = useQueryClient()
  const puedeCrear = puede(usuario, "crear_cientifico")
  const puedeDesactivar = puede(usuario, "desactivar_cientifico")
  const [tab, setTab] = useState<TabUsuarios>("listado")
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [usuarioId, setUsuarioId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", mostrarInactivos],
    queryFn: () => api.usuarios(token!, !mostrarInactivos),
    enabled: Boolean(token),
  })

  const usuarios = usuariosQuery.data ?? usuariosVacios
  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    if (!texto) {
      return usuarios
    }
    return usuarios.filter((item) =>
      [item.nombre, item.email, item.sector, item.rol]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(texto)),
    )
  }, [busqueda, usuarios])

  const usuarioSeleccionado = useMemo(() => {
    if (!usuariosFiltrados.length) {
      return null
    }
    if (!usuarioId) {
      return usuariosFiltrados[0]
    }
    return usuariosFiltrados.find((item) => item.id === usuarioId) ?? usuariosFiltrados[0]
  }, [usuarioId, usuariosFiltrados])

  async function refrescar(mensajeOk?: string) {
    await queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    if (mensajeOk) {
      setMensaje(mensajeOk)
    }
  }

  return (
    <section>
      <PageHeader
        title="Usuarios"
        description="Alta y estado de cuentas del equipo."
        count={usuariosQuery.isLoading ? "Cargando usuarios..." : `${usuariosFiltrados.length} usuario(s)`}
        plain
      />

      {mensaje ? (
        <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      <ModuleNav
        actions={
          tab === "nuevo"
            ? [{ label: "Volver al listado", onClick: () => setTab("listado"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
            : puedeCrear
              ? [{ label: "Nuevo usuario", onClick: () => setTab("nuevo"), icon: <Plus size={18} aria-hidden="true" /> }]
              : []
        }
      />

      {tab === "listado" ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Buscar</span>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary"
                  size={18}
                  aria-hidden="true"
                />
                <Input
                  className="pl-12"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre, email, sector, rol"
                />
              </div>
            </label>
            <div className="block">
              <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Estado</span>
              <Button
                type="button"
                variant={mostrarInactivos ? "primary" : "secondary"}
                size="compact"
                className="w-full lg:w-auto"
                onClick={() => {
                  setMostrarInactivos((actual) => !actual)
                  setUsuarioId(null)
                }}
              >
                {mostrarInactivos ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                {mostrarInactivos ? "Ocultar inactivos" : "Mostrar inactivos"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <UsuariosTable
              usuarios={usuariosFiltrados}
              isLoading={usuariosQuery.isLoading}
              selectedId={usuarioSeleccionado?.id ?? null}
              onSelect={setUsuarioId}
            />
            {usuarioSeleccionado ? (
              <UsuarioDetalle
                actor={usuario}
                usuario={usuarioSeleccionado}
                puedeDesactivar={puedeDesactivar}
                token={token!}
                onError={setErrorLocal}
                onUpdated={refrescar}
              />
            ) : null}
          </div>
        </>
      ) : null}

      {tab === "nuevo" && puedeCrear ? (
        <NuevoUsuarioForm
          actor={usuario}
          token={token!}
          onError={setErrorLocal}
          onSuccess={async (id, nombre) => {
            setUsuarioId(id)
            setMostrarInactivos(false)
            setTab("listado")
            await refrescar(`Usuario creado: ${nombre}.`)
          }}
        />
      ) : null}
    </section>
  )
}

function UsuariosTable({
  usuarios,
  isLoading,
  selectedId,
  onSelect,
}: {
  usuarios: Usuario[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando tabla...</div>
  }
  if (!usuarios.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay usuarios para mostrar.</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">Nombre</th>
            <th className="h-10 px-4 font-normal">Email</th>
            <th className="h-10 px-4 font-normal">Rol</th>
            <th className="h-10 px-4 font-normal">Sector</th>
            <th className="h-10 px-4 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((item) => {
            const activo = activoBool(item.activo)
            return (
              <tr
                key={item.id}
                className={cn(
                  "cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01",
                  selectedId === item.id && "bg-cds-layer01",
                )}
                onClick={() => onSelect(item.id)}
              >
                <td className="h-12 px-4 font-medium">{item.nombre}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{item.email}</td>
                <td className="h-12 px-4">{rolLabels[item.rol]}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{item.sector || "-"}</td>
                <td className="h-12 px-4">
                  <EstadoBadge activo={activo} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function UsuarioDetalle({
  actor,
  usuario,
  puedeDesactivar,
  token,
  onError,
  onUpdated,
}: {
  actor: Usuario | null
  usuario: Usuario
  puedeDesactivar: boolean
  token: string
  onError: (message: string | null) => void
  onUpdated: (message?: string) => void | Promise<void>
}) {
  const cambiarEstadoMutation = useMutation({
    mutationFn: () =>
      activoBool(usuario.activo)
        ? api.desactivarUsuario(token, usuario.id)
        : api.reactivarUsuario(token, usuario.id),
  })
  const activo = activoBool(usuario.activo)
  const self = actor?.id === usuario.id
  const puedeCambiarEstado = puedeDesactivar && !self

  async function cambiarEstado() {
    onError(null)
    try {
      await cambiarEstadoMutation.mutateAsync()
      await onUpdated(activo ? "Usuario desactivado." : "Usuario reactivado.")
    } catch (error) {
      onError(mutationError(error, "No se pudo cambiar el estado del usuario"))
    }
  }

  return (
    <aside className="bg-cds-layer01 p-4">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 text-cds-textSecondary">
            <UserRound size={22} aria-hidden="true" />
          </div>
          <h2 className="text-[24px] leading-[1.33]">{usuario.nombre}</h2>
          <div className="mt-2">
            <EstadoBadge activo={activo} />
          </div>
        </div>
        {puedeCambiarEstado ? (
          <Button type="button" variant="ghost" size="compact" onClick={cambiarEstado} disabled={cambiarEstadoMutation.isPending}>
            <RotateCcw size={18} aria-hidden="true" />
            {activo ? "Desactivar" : "Reactivar"}
          </Button>
        ) : null}
      </div>

      <div className="space-y-4 border-t border-cds-borderSubtle pt-4 text-sm">
        <Info icon={Mail} label="Email" value={usuario.email} />
        <Info icon={Shield} label="Rol" value={rolLabels[usuario.rol]} />
        <Info icon={Users} label="Sector" value={usuario.sector || "-"} />
        <Info label="Password" value={mustChangeBool(usuario.must_change_password) ? "Debe cambiarla al ingresar" : "Activa"} />
      </div>
    </aside>
  )
}

function NuevoUsuarioForm({
  actor,
  token,
  onError,
  onSuccess,
}: {
  actor: Usuario | null
  token: string
  onError: (message: string | null) => void
  onSuccess: (id: number, nombre: string) => void | Promise<void>
}) {
  const crearMutation = useMutation({
    mutationFn: (data: UsuarioCrear) => api.crearUsuario(token, data),
  })
  const rolesDisponibles: Rol[] = actor?.rol === "admin" ? ["cientifico", "jefe", "admin"] : ["cientifico"]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    onError(null)
    try {
      const form = new FormData(formElement)
      const nombre = String(form.get("nombre") ?? "").trim()
      const email = String(form.get("email") ?? "").trim()
      const passwordInicial = String(form.get("password_inicial") ?? "")
      const rol = String(form.get("rol") ?? "cientifico") as Rol
      if (!nombre) {
        throw new Error("El nombre es obligatorio.")
      }
      if (!email) {
        throw new Error("El email es obligatorio.")
      }
      if (passwordInicial.length < 8) {
        throw new Error("La password inicial debe tener al menos 8 caracteres.")
      }
      const payload: UsuarioCrear = {
        nombre,
        email,
        sector: nullable(form.get("sector")),
        rol,
        password_inicial: passwordInicial,
      }
      const resultado = await crearMutation.mutateAsync(payload)
      formElement.reset()
      await onSuccess(resultado.id, nombre)
    } catch (error) {
      onError(mutationError(error, "No se pudo crear el usuario"))
    }
  }

  return (
    <form className="max-w-4xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">Nuevo usuario</h2>
        <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
          La password inicial es obligatoria y se pide cambio al primer login.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre *" name="nombre" required />
        <Field label="Email *" name="email" type="email" required />
        <Field label="Sector" name="sector" placeholder="Ej: Becario, IT, Pasante" />
        <label className="block">
          <Label className="mb-2" htmlFor="rol">Rol *</Label>
          <select
            id="rol"
            name="rol"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            defaultValue="cientifico"
          >
            {rolesDisponibles.map((rol) => (
              <option key={rol} value={rol}>
                {rolLabels[rol]}
              </option>
            ))}
          </select>
        </label>
        <Field className="md:col-span-2" label="Password inicial *" name="password_inicial" type="password" minLength={8} required />
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Plus size={18} aria-hidden="true" />
        {crearMutation.isPending ? "Creando..." : "Crear usuario"}
      </Button>
    </form>
  )
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Mail
  label: string
  value: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs tracking-[0.32px] text-cds-textSecondary">
        {Icon ? <Icon size={16} aria-hidden="true" /> : null}
        {label}
      </div>
      <div className="mt-1 text-cds-textPrimary">{value}</div>
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
