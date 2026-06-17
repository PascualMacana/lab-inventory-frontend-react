import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ExternalLink, Eye, EyeOff, Mail, Phone, Plus, RotateCcw, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { EstadoBadge } from "../components/ui/estado-badge"
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

// Monograma de identidad: avatar de iniciales con color por hash del nombre.
// Los hues salen de los tokens de grupo + petróleo + verde; el tint se deriva
// con color-mix para que themee en claro/oscuro sin hardcodear hex.
const MONOGRAMA_HUES = [
  "var(--lab-grupo-h)",
  "var(--lab-grupo-u)",
  "var(--lab-grupo-p)",
  "var(--lab-grupo-m)",
  "var(--cds-link-primary)",
  "var(--cds-support-success)",
]

function hashTexto(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function inicialesDe(nombre: string) {
  const palabras = nombre.trim().split(/[\s-]+/).filter(Boolean)
  if (!palabras.length) {
    return "?"
  }
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toLocaleUpperCase("es")
  }
  return (palabras[0][0] + palabras[1][0]).toLocaleUpperCase("es")
}

function Monograma({ nombre, size = 30, inactivo = false }: { nombre: string; size?: number; inactivo?: boolean }) {
  const hue = inactivo ? "var(--cds-text-secondary)" : MONOGRAMA_HUES[hashTexto(nombre) % MONOGRAMA_HUES.length]
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium leading-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        color: hue,
        backgroundColor: `color-mix(in srgb, ${hue} 16%, transparent)`,
      }}
      aria-hidden="true"
    >
      {inicialesDe(nombre)}
    </span>
  )
}

function normalizarUrl(raw: string) {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

function soloDominio(raw: string) {
  try {
    return new URL(normalizarUrl(raw)).hostname.replace(/^www\./, "")
  } catch {
    return raw
  }
}

// Sitio web como enlace real: solo el dominio, petróleo + icono, abre en pestaña
// nueva. stopPropagation para no disparar la selección de la fila.
function SitioWebLink({ sitio }: { sitio?: string | null }) {
  if (!sitio) {
    return <span className="text-cds-textPlaceholder">—</span>
  }
  return (
    <a
      href={normalizarUrl(sitio)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 font-mono text-[12.5px] text-cds-linkPrimary hover:text-cds-linkPrimaryHover"
    >
      {soloDominio(sitio)}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  )
}

export function ProveedoresPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
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
      <PageHeader
        title={t("proveedores.title")}
        description={t("proveedores.desc")}
        count={proveedoresQuery.isLoading ? t("proveedores.cargando") : t("proveedores.countN", { n: proveedoresFiltrados.length })}
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
            ? [{ label: t("common.volverAlListado"), onClick: () => setTab("listado"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
            : puedeCrear
              ? [{ label: t("proveedores.nuevoProveedor"), onClick: () => setTab("nuevo"), icon: <Plus size={18} aria-hidden="true" /> }]
              : []
        }
      />

      {tab === "listado" ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
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
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder={t("proveedores.buscarPh")}
                />
              </div>
            </label>
            <div className="block">
              <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("proveedores.estado")}</span>
              <Button
                type="button"
                variant={mostrarInactivos ? "primary" : "secondary"}
                size="compact"
                className="w-full lg:w-auto"
                onClick={() => {
                  setMostrarInactivos((actual) => !actual)
                  setProveedorId(null)
                }}
              >
                {mostrarInactivos ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                {mostrarInactivos ? t("proveedores.ocultarInactivos") : t("proveedores.mostrarInactivos")}
              </Button>
            </div>
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
            await refrescar(t("proveedores.msgCreado", { nombre }))
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
  const { t } = useTranslation()
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("common.cargandoTabla")}</div>
  }

  if (!proveedores.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("proveedores.sinProveedores")}</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("proveedores.thProveedor")}</th>
            <th className="h-10 px-4 font-normal">{t("proveedores.sitioWeb")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("proveedores.thLotes")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("proveedores.thContactos")}</th>
            <th className="h-10 px-4 font-normal">{t("proveedores.estado")}</th>
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
                  selectedId === proveedor.id && "bg-cds-layer01 shadow-[inset_2px_0_0_var(--cds-focus)]",
                )}
                onClick={() => onSelect(proveedor.id)}
              >
                <td className="h-14 px-4">
                  <div className="flex items-center gap-3">
                    <Monograma nombre={proveedor.nombre} inactivo={!activo} />
                    <div className="min-w-0 max-w-[340px]">
                      <div className={cn("truncate font-semibold tracking-[0.16px]", !activo && "text-cds-textSecondary")}>
                        {proveedor.nombre}
                      </div>
                      {proveedor.descripcion ? (
                        <div className="truncate text-xs text-cds-textSecondary">{proveedor.descripcion}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="h-14 px-4">
                  <SitioWebLink sitio={proveedor.sitio_web} />
                </td>
                <td className="h-14 px-4 text-right font-mono">{proveedor.lotes_count ?? 0}</td>
                <td className={cn("h-14 px-4 text-right font-mono", !proveedor.contactos_count && "text-cds-textPlaceholder")}>
                  {proveedor.contactos_count ?? 0}
                </td>
                <td className="h-14 px-4">
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
  const { t } = useTranslation()
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
      await onUpdated(activo ? t("proveedores.msgDesactivado") : t("proveedores.msgReactivado"))
    } catch (error) {
      onError(mutationError(error, t("proveedores.errEstado")))
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
        throw new Error(t("proveedores.errNombreContacto"))
      }
      await agregarContactoMutation.mutateAsync({
        nombre,
        email: nullable(form.get("email")),
        telefono: nullable(form.get("telefono")),
        rol: nullable(form.get("rol")),
        notas: nullable(form.get("notas")),
      })
      formElement.reset()
      await onUpdated(t("proveedores.msgContactoAgregado"))
    } catch (error) {
      onError(mutationError(error, t("proveedores.errAgregarContacto")))
    }
  }

  async function eliminarContacto(contactoId: number) {
    onError(null)
    try {
      await eliminarContactoMutation.mutateAsync(contactoId)
      await onUpdated(t("proveedores.msgContactoEliminado"))
    } catch (error) {
      onError(mutationError(error, t("proveedores.errEliminarContacto")))
    }
  }

  return (
    <aside className="bg-cds-layer01 p-4">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Monograma nombre={proveedor.nombre} size={46} inactivo={!activo} />
          <div>
            <h2 className="text-[24px] leading-[1.33]">{proveedor.nombre}</h2>
            <div className="mt-2">
              <EstadoBadge activo={activo} />
            </div>
          </div>
        </div>
        {puedeEditar ? (
          <Button type="button" variant="ghost" size="compact" onClick={cambiarEstado} disabled={cambiarEstadoMutation.isPending}>
            <RotateCcw size={18} aria-hidden="true" />
            {activo ? t("proveedores.desactivar") : t("proveedores.reactivar")}
          </Button>
        ) : null}
      </div>

      {detalleQuery.isLoading ? (
        <div className="text-sm text-cds-textSecondary">{t("proveedores.cargandoDetalle")}</div>
      ) : (
        <>
          <div className="space-y-4 border-t border-cds-borderSubtle pt-4 text-sm">
            <Info label={t("proveedores.descripcion")} value={detalle?.descripcion || "-"} />
            <div>
              <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("proveedores.sitioWeb")}</div>
              <div className="mt-1">
                <SitioWebLink sitio={detalle?.sitio_web} />
              </div>
            </div>
            <div>
              <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("proveedores.abastece")}</div>
              <div className="mt-1 font-mono text-cds-textPrimary">
                {t("proveedores.abasteceValor", { lotes: proveedor.lotes_count ?? 0, reactivos: proveedor.reactivos_count ?? 0 })}
              </div>
            </div>
            <Info label={t("proveedores.notas")} value={detalle?.notas || "-"} />
          </div>

          <div className="mt-6 border-t border-cds-borderSubtle pt-5">
            <h3 className="mb-4">{t("proveedores.contactos")}</h3>
            {contactos.length ? (
              <div className="space-y-3">
                {contactos.map((contacto) => (
                  <article key={contacto.id} className="border border-cds-borderSubtle bg-cds-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Monograma nombre={contacto.nombre} />
                        <div className="min-w-0">
                          <div className="font-medium">{contacto.nombre}</div>
                          <div className="mt-1 text-xs tracking-[0.32px] text-cds-textSecondary">{contacto.rol || t("proveedores.sinRol")}</div>
                        </div>
                      </div>
                      {puedeEditar ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          aria-label={t("proveedores.eliminarContacto")}
                          onClick={() => void eliminarContacto(contacto.id)}
                          disabled={eliminarContactoMutation.isPending}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                    {contacto.email ? (
                      <a
                        href={`mailto:${contacto.email}`}
                        className="mt-3 flex items-center gap-2 text-sm text-cds-linkPrimary hover:text-cds-linkPrimaryHover"
                      >
                        <Mail size={16} aria-hidden="true" />
                        <span className="font-mono">{contacto.email}</span>
                      </a>
                    ) : null}
                    {contacto.telefono ? (
                      <a
                        href={`tel:${contacto.telefono}`}
                        className="mt-2 flex items-center gap-2 text-sm text-cds-linkPrimary hover:text-cds-linkPrimaryHover"
                      >
                        <Phone size={16} aria-hidden="true" />
                        <span className="font-mono">{contacto.telefono}</span>
                      </a>
                    ) : null}
                    {contacto.notas ? <p className="mt-3 text-sm text-cds-textSecondary">{contacto.notas}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("proveedores.sinContactos")}</div>
            )}
          </div>

          {puedeEditar ? (
            <form className="mt-6 border-t border-cds-borderSubtle pt-5" onSubmit={agregarContacto}>
              <h3 className="mb-4">{t("proveedores.agregarContacto")}</h3>
              <div className="grid gap-4">
                <Field label={t("proveedores.fNombre")} name="nombre" required />
                <Field label={t("proveedores.fRol")} name="rol" placeholder={t("proveedores.fRolPh")} />
                <Field label={t("proveedores.fEmail")} name="email" type="email" />
                <Field label={t("proveedores.fTelefono")} name="telefono" />
                <Field label={t("proveedores.notas")} name="notas" />
              </div>
              <Button className="mt-5" type="submit" disabled={agregarContactoMutation.isPending}>
                <Plus size={18} aria-hidden="true" />
                {agregarContactoMutation.isPending ? t("proveedores.agregando") : t("proveedores.agregarContacto")}
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
  const { t } = useTranslation()
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
        throw new Error(t("proveedores.errNombre"))
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
      onError(mutationError(error, t("proveedores.errCrear")))
    }
  }

  return (
    <form className="max-w-4xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-[24px] leading-[1.33]">{t("proveedores.nuevoProveedor")}</h2>
        <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
          {t("proveedores.formDesc")}
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("proveedores.fNombre")} name="nombre" required />
        <Field label={t("proveedores.sitioWeb")} name="sitio_web" placeholder="https://..." />
        <Field className="md:col-span-2" label={t("proveedores.descripcion")} name="descripcion" />
        <Field className="md:col-span-2" label={t("proveedores.notas")} name="notas" />
      </div>
      <Button className="mt-6" type="submit" disabled={crearMutation.isPending}>
        <Plus size={18} aria-hidden="true" />
        {crearMutation.isPending ? t("common.creando") : t("proveedores.crearProveedor")}
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
