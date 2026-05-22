import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Check, Plus, RefreshCw, Search, UserPlus } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type Organizacion, type UsuarioCrear } from "../lib/api"
import { useAuth } from "../lib/auth"
import { cn } from "../lib/utils"

type TabOwner = "organizaciones" | "nueva" | "admin"
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

const moduloLabels: Record<string, string> = {
  dashboard: "Dashboard",
  reactivos: "Reactivos",
  lotes: "Lotes",
  consumo: "Consumo",
  movimientos: "Movimientos",
  proveedores: "Proveedores",
  usuarios: "Usuarios",
  equipamiento: "Equipamiento",
  asistente: "Asistente",
  auditoria: "Auditoría",
  protocolos: "Protocolos",
  tareas: "Tareas",
}

const rolLabels: Record<Rol, string> = {
  admin: "Admin",
  jefe: "Jefe",
  cientifico: "Científico",
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
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<TabOwner>("organizaciones")
  const [busqueda, setBusqueda] = useState("")
  const [organizacionId, setOrganizacionId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const organizacionesQuery = useQuery({
    queryKey: ["owner", "organizaciones"],
    queryFn: () => api.organizaciones(token!, false),
    enabled: Boolean(token),
  })

  const organizaciones = organizacionesQuery.data ?? []
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
        title="Owner"
        description="Administración interna de organizaciones, módulos y usuarios iniciales."
        count={organizacionesQuery.isLoading ? "Cargando organizaciones..." : `${organizaciones.length} organización(es)`}
      />

      {mensaje ? (
        <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      <ModuleNav
        actions={[
          { label: "Organizaciones", onClick: () => setTab("organizaciones"), icon: <Building2 size={18} aria-hidden="true" />, variant: tab === "organizaciones" ? "primary" : "secondary" },
          { label: "Nueva organización", onClick: () => setTab("nueva"), icon: <Plus size={18} aria-hidden="true" />, variant: tab === "nueva" ? "primary" : "secondary" },
          { label: "Admin inicial", onClick: () => setTab("admin"), icon: <UserPlus size={18} aria-hidden="true" />, variant: tab === "admin" ? "primary" : "secondary" },
        ]}
      />

      {tab === "organizaciones" ? (
        <>
          <label className="mb-4 block">
            <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={18} aria-hidden="true" />
              <Input className="pl-12" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre, slug o ID" />
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
            await refrescar(`Organización creada: ${nombre}.`)
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
            await refrescar(`Usuario creado: ${nombre}.`)
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
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando tabla...</div>
  }
  if (!organizaciones.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay organizaciones para mostrar.</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">ID</th>
            <th className="h-10 px-4 font-normal">Nombre</th>
            <th className="h-10 px-4 font-normal">Slug</th>
            <th className="h-10 px-4 font-normal">Módulos</th>
            <th className="h-10 px-4 font-normal">Estado</th>
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
                <td className="h-12 px-4">{activoBool(item.activo) ? "Activa" : "Inactiva"}</td>
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
      await onUpdated("Módulos actualizados.")
    } catch (error) {
      onError(mutationError(error, "No se pudieron actualizar los módulos"))
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
        <div className="mb-3 text-xs tracking-[0.32px] text-cds-textSecondary">Módulos habilitados</div>
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
              <span>{moduloLabels[modulo] ?? modulo}</span>
            </label>
          ))}
        </div>
        <Button className="mt-4" type="button" onClick={guardarModulos} disabled={actualizarMutation.isPending}>
          <Check size={18} aria-hidden="true" />
          {actualizarMutation.isPending ? "Guardando..." : "Guardar módulos"}
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
        throw new Error("El nombre es obligatorio.")
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
      onError(mutationError(error, "No se pudo crear la organización"))
    }
  }

  return (
    <form className="max-w-4xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">Nueva organización</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre *" name="nombre" required />
        <Field label="Slug" name="slug" placeholder="Se genera desde el nombre si queda vacío" />
      </div>
      <div className="mt-6">
        <div className="mb-3 text-xs tracking-[0.32px] text-cds-textSecondary">Módulos iniciales</div>
        <div className="grid gap-2 md:grid-cols-2">
          {modulosDisponibles.map((modulo) => (
            <label key={modulo} className="flex h-10 items-center gap-3 bg-cds-background px-3 text-sm">
              <input type="checkbox" name="modulos" value={modulo} className="h-4 w-4 accent-cds-buttonPrimary" defaultChecked />
              <span>{moduloLabels[modulo] ?? modulo}</span>
            </label>
          ))}
        </div>
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Plus size={18} aria-hidden="true" />
        {crearMutation.isPending ? "Creando..." : "Crear organización"}
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
        throw new Error("Elegí una organización.")
      }
      if (!nombre) {
        throw new Error("El nombre es obligatorio.")
      }
      if (!email) {
        throw new Error("El email es obligatorio.")
      }
      if (passwordInicial.length < 8) {
        throw new Error("La password inicial debe tener al menos 8 caracteres.")
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
      onError(mutationError(error, "No se pudo crear el usuario"))
    }
  }

  return (
    <form className="max-w-4xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">Admin inicial</h2>
      </div>
      <label className="mb-5 block">
        <Label className="mb-2" htmlFor="organizacion_id">Organización *</Label>
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
        <Field label="Nombre *" name="nombre" required />
        <Field label="Email *" name="email" type="email" required />
        <Field label="Sector" name="sector" placeholder="Ej: IT, Dirección, Administración" />
        <label className="block">
          <Label className="mb-2" htmlFor="rol">Rol *</Label>
          <select
            id="rol"
            name="rol"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            defaultValue="admin"
          >
            {(["admin", "jefe", "cientifico"] as Rol[]).map((rol) => (
              <option key={rol} value={rol}>{rolLabels[rol]}</option>
            ))}
          </select>
        </label>
        <Field className="md:col-span-2" label="Password inicial *" name="password_inicial" type="password" minLength={8} required />
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending || !organizaciones.length}>
        <UserPlus size={18} aria-hidden="true" />
        {crearMutation.isPending ? "Creando..." : "Crear usuario"}
      </Button>
    </form>
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
