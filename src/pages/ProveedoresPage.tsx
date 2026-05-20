import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Building2, Mail, Phone, Plus, RotateCcw, Search, Trash2 } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type ContactoCrear, type Proveedor, type ProveedorCrear } from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

type TabProveedores = "listado" | "nuevo"

const proveedoresVacios: Proveedor[] = []

function nullable(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed ? trimmed : null
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function activoBool(value: number | boolean) {
  return value === true || value === 1
}

export function ProveedoresPage() {
  const { token, usuario } = useAuth()
  const queryClient = useQueryClient()
  const puedeCrear = puede(usuario, "crear_proveedor")
  const puedeEditar = puede(usuario, "editar_proveedor")
  const [tab, setTab] = useState<TabProveedores>("listado")
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const proveedoresQuery = useQuery({
    queryKey: ["proveedores", mostrarInactivos],
    queryFn: () => api.proveedores(token!, !mostrarInactivos),
    enabled: Boolean(token),
  })

  const proveedores = proveedoresQuery.data ?? proveedoresVacios
  const proveedoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    if (!texto) {
      return proveedores
    }
    return proveedores.filter((proveedor) =>
      [proveedor.nombre, proveedor.descripcion, proveedor.sitio_web, proveedor.notas]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(texto)),
    )
  }, [busqueda, proveedores])

  const proveedorSeleccionado = useMemo(() => {
    if (!proveedoresFiltrados.length) {
      return null
    }
    if (!proveedorId) {
      return proveedoresFiltrados[0]
    }
    return proveedoresFiltrados.find((proveedor) => proveedor.id === proveedorId) ?? proveedoresFiltrados[0]
  }, [proveedorId, proveedoresFiltrados])

  async function refrescar(mensajeOk?: string) {
    await queryClient.invalidateQueries({ queryKey: ["proveedores"] })
    if (proveedorSeleccionado?.id) {
      await queryClient.invalidateQueries({ queryKey: ["proveedor", proveedorSeleccionado.id] })
    }
    if (mensajeOk) {
      setMensaje(mensajeOk)
    }
  }

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>Proveedores</h1>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            Catálogo de proveedores y contactos operativos del laboratorio.
          </p>
        </div>
        <div className="text-sm tracking-[0.16px] text-cds-textSecondary">
          {proveedoresQuery.isLoading ? "Cargando proveedores..." : `${proveedoresFiltrados.length} proveedor(es)`}
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
          tab === "nuevo"
            ? [{ label: "Volver al listado", onClick: () => setTab("listado"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
            : puedeCrear
              ? [{ label: "Nuevo proveedor", onClick: () => setTab("nuevo"), icon: <Plus size={18} aria-hidden="true" /> }]
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
                  placeholder="Nombre, web, notas"
                />
              </div>
            </label>
            <label className="flex items-end gap-2 pb-3 text-sm tracking-[0.16px]">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(event) => {
                  setMostrarInactivos(event.target.checked)
                  setProveedorId(null)
                }}
              />
              Mostrar inactivos
            </label>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <ProveedoresTable
              proveedores={proveedoresFiltrados}
              isLoading={proveedoresQuery.isLoading}
              selectedId={proveedorSeleccionado?.id ?? null}
              onSelect={setProveedorId}
            />
            {proveedorSeleccionado ? (
              <ProveedorDetallePanel
                token={token!}
                proveedor={proveedorSeleccionado}
                puedeEditar={puedeEditar}
                onError={setErrorLocal}
                onUpdated={refrescar}
              />
            ) : null}
          </div>
        </>
      ) : null}

      {tab === "nuevo" && puedeCrear ? (
        <NuevoProveedorForm
          token={token!}
          onError={setErrorLocal}
          onSuccess={async (id, nombre) => {
            setProveedorId(id)
            setMostrarInactivos(false)
            setTab("listado")
            await refrescar(`Proveedor creado: ${nombre}.`)
          }}
        />
      ) : null}
    </section>
  )
}

function ProveedoresTable({
  proveedores,
  isLoading,
  selectedId,
  onSelect,
}: {
  proveedores: Proveedor[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando tabla...</div>
  }

  if (!proveedores.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay proveedores para mostrar.</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">Nombre</th>
            <th className="h-10 px-4 font-normal">Sitio web</th>
            <th className="h-10 px-4 font-normal">Estado</th>
            <th className="h-10 px-4 font-normal">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map((proveedor) => {
            const activo = activoBool(proveedor.activo)
            return (
              <tr
                key={proveedor.id}
                className={cn(
                  "cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01",
                  selectedId === proveedor.id && "bg-cds-layer01",
                )}
                onClick={() => onSelect(proveedor.id)}
              >
                <td className="h-12 px-4 font-medium">{proveedor.nombre}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{proveedor.sitio_web || "-"}</td>
                <td className={cn("h-12 px-4", activo ? "text-cds-supportSuccess" : "text-cds-supportError")}>
                  {activo ? "Activo" : "Inactivo"}
                </td>
                <td className="h-12 max-w-[320px] px-4 text-cds-textSecondary">
                  <span className="line-clamp-2">{proveedor.descripcion || "-"}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ProveedorDetallePanel({
  token,
  proveedor,
  puedeEditar,
  onError,
  onUpdated,
}: {
  token: string
  proveedor: Proveedor
  puedeEditar: boolean
  onError: (message: string | null) => void
  onUpdated: (message?: string) => void | Promise<void>
}) {
  const detalleQuery = useQuery({
    queryKey: ["proveedor", proveedor.id],
    queryFn: () => api.proveedor(token, proveedor.id),
    enabled: Boolean(token && proveedor.id),
  })
  const cambiarEstadoMutation = useMutation({
    mutationFn: () =>
      activoBool(proveedor.activo)
        ? api.desactivarProveedor(token, proveedor.id)
        : api.reactivarProveedor(token, proveedor.id),
  })
  const agregarContactoMutation = useMutation({
    mutationFn: (data: ContactoCrear) => api.agregarContactoProveedor(token, proveedor.id, data),
  })
  const eliminarContactoMutation = useMutation({
    mutationFn: (contactoId: number) => api.eliminarContactoProveedor(token, contactoId),
  })

  const detalle = detalleQuery.data
  const contactos = detalle?.contactos ?? []
  const activo = activoBool(proveedor.activo)

  async function cambiarEstado() {
    onError(null)
    try {
      await cambiarEstadoMutation.mutateAsync()
      await onUpdated(activo ? "Proveedor desactivado." : "Proveedor reactivado.")
    } catch (error) {
      onError(mutationError(error, "No se pudo cambiar el estado del proveedor"))
    }
  }

  async function agregarContacto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    onError(null)
    try {
      const form = new FormData(formElement)
      const nombre = String(form.get("nombre") ?? "").trim()
      if (!nombre) {
        throw new Error("El nombre del contacto es obligatorio.")
      }
      await agregarContactoMutation.mutateAsync({
        nombre,
        email: nullable(form.get("email")),
        telefono: nullable(form.get("telefono")),
        rol: nullable(form.get("rol")),
        notas: nullable(form.get("notas")),
      })
      formElement.reset()
      await onUpdated("Contacto agregado.")
    } catch (error) {
      onError(mutationError(error, "No se pudo agregar el contacto"))
    }
  }

  async function eliminarContacto(contactoId: number) {
    onError(null)
    try {
      await eliminarContactoMutation.mutateAsync(contactoId)
      await onUpdated("Contacto eliminado.")
    } catch (error) {
      onError(mutationError(error, "No se pudo eliminar el contacto"))
    }
  }

  return (
    <aside className="bg-cds-layer01 p-4">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 text-cds-textSecondary">
            <Building2 size={22} aria-hidden="true" />
          </div>
          <h2 className="text-[24px] leading-[1.33]">{proveedor.nombre}</h2>
          <p className={cn("mt-2 text-sm", activo ? "text-cds-supportSuccess" : "text-cds-supportError")}>
            {activo ? "Activo" : "Inactivo"}
          </p>
        </div>
        {puedeEditar ? (
          <Button type="button" variant="ghost" size="compact" onClick={cambiarEstado} disabled={cambiarEstadoMutation.isPending}>
            <RotateCcw size={18} aria-hidden="true" />
            {activo ? "Desactivar" : "Reactivar"}
          </Button>
        ) : null}
      </div>

      {detalleQuery.isLoading ? (
        <div className="text-sm text-cds-textSecondary">Cargando detalle...</div>
      ) : (
        <>
          <div className="space-y-4 border-t border-cds-borderSubtle pt-4 text-sm">
            <Info label="Descripción" value={detalle?.descripcion || "-"} />
            <Info label="Sitio web" value={detalle?.sitio_web || "-"} />
            <Info label="Notas" value={detalle?.notas || "-"} />
          </div>

          <div className="mt-6 border-t border-cds-borderSubtle pt-5">
            <h3 className="mb-4">Contactos</h3>
            {contactos.length ? (
              <div className="space-y-3">
                {contactos.map((contacto) => (
                  <article key={contacto.id} className="border border-cds-borderSubtle bg-cds-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{contacto.nombre}</div>
                        <div className="mt-1 text-xs tracking-[0.32px] text-cds-textSecondary">{contacto.rol || "Sin rol"}</div>
                      </div>
                      {puedeEditar ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          aria-label="Eliminar contacto"
                          onClick={() => void eliminarContacto(contacto.id)}
                          disabled={eliminarContactoMutation.isPending}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                    {contacto.email ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-cds-textSecondary">
                        <Mail size={16} aria-hidden="true" />
                        {contacto.email}
                      </div>
                    ) : null}
                    {contacto.telefono ? (
                      <div className="mt-2 flex items-center gap-2 text-sm text-cds-textSecondary">
                        <Phone size={16} aria-hidden="true" />
                        {contacto.telefono}
                      </div>
                    ) : null}
                    {contacto.notas ? <p className="mt-3 text-sm text-cds-textSecondary">{contacto.notas}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">Este proveedor no tiene contactos cargados.</div>
            )}
          </div>

          {puedeEditar ? (
            <form className="mt-6 border-t border-cds-borderSubtle pt-5" onSubmit={agregarContacto}>
              <h3 className="mb-4">Agregar contacto</h3>
              <div className="grid gap-4">
                <Field label="Nombre *" name="nombre" required />
                <Field label="Rol" name="rol" placeholder="Ej: Ventas, soporte técnico" />
                <Field label="Email" name="email" type="email" />
                <Field label="Teléfono" name="telefono" />
                <Field label="Notas" name="notas" />
              </div>
              <Button className="mt-5" type="submit" disabled={agregarContactoMutation.isPending}>
                <Plus size={18} aria-hidden="true" />
                {agregarContactoMutation.isPending ? "Agregando..." : "Agregar contacto"}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </aside>
  )
}

function NuevoProveedorForm({
  token,
  onError,
  onSuccess,
}: {
  token: string
  onError: (message: string | null) => void
  onSuccess: (id: number, nombre: string) => void | Promise<void>
}) {
  const crearMutation = useMutation({
    mutationFn: (data: ProveedorCrear) => api.crearProveedor(token, data),
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
      const payload: ProveedorCrear = {
        nombre,
        descripcion: nullable(form.get("descripcion")),
        sitio_web: nullable(form.get("sitio_web")),
        notas: nullable(form.get("notas")),
      }
      const resultado = await crearMutation.mutateAsync(payload)
      formElement.reset()
      await onSuccess(resultado.id, nombre)
    } catch (error) {
      onError(mutationError(error, "No se pudo crear el proveedor"))
    }
  }

  return (
    <form className="max-w-4xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">Nuevo proveedor</h2>
        <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
          Cargá el proveedor general; los contactos se agregan desde el detalle.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre *" name="nombre" required />
        <Field label="Sitio web" name="sitio_web" placeholder="https://..." />
        <Field className="md:col-span-2" label="Descripción" name="descripcion" />
        <Field className="md:col-span-2" label="Notas" name="notas" />
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Plus size={18} aria-hidden="true" />
        {crearMutation.isPending ? "Creando..." : "Crear proveedor"}
      </Button>
    </form>
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
