import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CalendarClock, Camera, Download, FileText, Package, PackagePlus, QrCode, Save, Search } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type DatosEtiqueta, type Lote, type LoteAjusteStock, type LoteActualizar, type LoteCrear, type LoteCrearMultiple, type LoteCrearMultipleResponse, type Reactivo } from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber, requireFiniteNumber } from "../lib/forms"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

type TabLotes = "listado" | "nuevo"

const reactivosVacios: Reactivo[] = []
const lotesVacios: Lote[] = []

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat("es-AR").format(date)
}

function isoDatePlusDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysUntil(value: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${value}T00:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function esPendiente(reactivo: Reactivo) {
  const categoria = (reactivo.categoria ?? "").toLocaleLowerCase("es")
  return (reactivo.stock_total ?? 0) <= 0 || categoria.includes("tránsito") || categoria.includes("transito")
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

export function LotesPage() {
  const { token, usuario } = useAuth()
  const queryClient = useQueryClient()
  const puedeCrearLote = puede(usuario, "crear_lote")
  const puedeImprimir = puede(usuario, "imprimir_hoja_avery")
  const [tab, setTab] = useState<TabLotes>("listado")
  const [reactivoId, setReactivoId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const reactivoSeleccionado = useMemo(() => {
    if (!reactivoId) {
      return reactivos[0] ?? null
    }
    return reactivos.find((reactivo) => reactivo.id === reactivoId) ?? null
  }, [reactivoId, reactivos])

  const lotesQuery = useQuery({
    queryKey: ["lotes", reactivoSeleccionado?.id],
    queryFn: () => api.lotesPorReactivo(token!, reactivoSeleccionado!.id),
    enabled: Boolean(token && reactivoSeleccionado?.id),
  })

  const lotes = lotesQuery.data ?? lotesVacios
  const lotesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    if (!texto) {
      return lotes
    }
    return lotes.filter((lote) =>
      [lote.codigo_interno, lote.numero_lote, lote.marca, lote.codigo_proveedor, lote.proveedor, lote.ubicacion]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(texto)),
    )
  }, [busqueda, lotes])

  const stockTotal = lotes.reduce((total, lote) => total + (lote.cantidad_actual ?? 0), 0)
  const proximoVencimiento = lotes[0]?.fecha_vencimiento

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>Lotes</h1>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            Ingreso y control de frascos activos por reactivo.
          </p>
        </div>
        <div className="text-sm tracking-[0.16px] text-cds-textSecondary">
          {lotesQuery.isLoading ? "Cargando lotes..." : `${lotesFiltrados.length} lotes activos`}
        </div>
      </div>

      {reactivosQuery.isError ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          No se pudieron cargar los reactivos.
        </div>
      ) : null}

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
            : puedeCrearLote
              ? [{ label: "Ingresar lote", onClick: () => setTab("nuevo"), icon: <PackagePlus size={18} aria-hidden="true" /> }]
              : []
        }
      />

      {tab === "listado" ? (
        <ListadoLotes
          token={token!}
          puedeEditar={puedeCrearLote}
          puedeImprimir={puedeImprimir}
          reactivos={reactivos}
          reactivoSeleccionado={reactivoSeleccionado}
          lotes={lotesFiltrados}
          lotesTodos={lotes}
          isLoading={lotesQuery.isLoading}
          busqueda={busqueda}
          stockTotal={stockTotal}
          proximoVencimiento={proximoVencimiento}
          onReactivoChange={setReactivoId}
          onBusquedaChange={setBusqueda}
          onBuscarCodigoInterno={async (codigo) => {
            setErrorLocal(null)
            setMensaje(null)
            try {
              const lote = await api.lotePorCodigo(token!, codigo)
              setReactivoId(lote.reactivo_id)
              setBusqueda(lote.codigo_interno)
              setMensaje(`Lote ${lote.codigo_interno} encontrado. Cambié el selector a ${lote.reactivo_nombre}.`)
            } catch (error) {
              setErrorLocal(mutationError(error, "No se pudo buscar el lote"))
            }
          }}
          onUpdated={async (mensajeActualizado) => {
            await queryClient.invalidateQueries({ queryKey: ["lotes", reactivoSeleccionado?.id] })
            await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            if (mensajeActualizado) {
              setMensaje(mensajeActualizado)
            }
          }}
        />
      ) : null}

      {tab === "nuevo" && puedeCrearLote ? (
        <NuevoLoteForm
          token={token!}
          usuarioId={usuario!.id}
          reactivos={reactivos}
          onSuccess={async (reactivoCreadoId, mensajeCreacion, quedarseEnFormulario) => {
            setReactivoId(reactivoCreadoId)
            await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
            await queryClient.invalidateQueries({ queryKey: ["lotes", reactivoCreadoId] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            if (!quedarseEnFormulario) {
              setTab("listado")
            }
            setMensaje(mensajeCreacion)
          }}
        />
      ) : null}
    </section>
  )
}

function ListadoLotes({
  token,
  puedeEditar,
  puedeImprimir,
  reactivos,
  reactivoSeleccionado,
  lotes,
  lotesTodos,
  isLoading,
  busqueda,
  stockTotal,
  proximoVencimiento,
  onReactivoChange,
  onBusquedaChange,
  onBuscarCodigoInterno,
  onUpdated,
}: {
  token: string
  puedeEditar: boolean
  puedeImprimir: boolean
  reactivos: Reactivo[]
  reactivoSeleccionado: Reactivo | null
  lotes: Lote[]
  lotesTodos: Lote[]
  isLoading: boolean
  busqueda: string
  stockTotal: number
  proximoVencimiento?: string
  onReactivoChange: (id: number) => void
  onBusquedaChange: (value: string) => void
  onBuscarCodigoInterno: (codigo: string) => void | Promise<void>
  onUpdated: (mensaje?: string) => void | Promise<void>
}) {
  const [loteEditarId, setLoteEditarId] = useState<number | null>(null)
  const loteEditar = useMemo(() => {
    if (!lotesTodos.length) {
      return null
    }
    if (!loteEditarId) {
      return lotesTodos[0]
    }
    return lotesTodos.find((lote) => lote.id === loteEditarId) ?? lotesTodos[0]
  }, [loteEditarId, lotesTodos])

  const pendientes = reactivos.filter(esPendiente)

  return (
    <>
      {pendientes.length ? (
        <div className="mb-4 bg-cds-layer01 p-4">
          <h2 className="text-[20px] font-semibold leading-[1.4]">Reactivos sin lote o en tránsito</h2>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            {pendientes.length} reactivo(s) conviene revisar para registrar llegada.
          </p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <label className="block">
          <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Reactivo</span>
          <select
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={reactivoSeleccionado?.id ?? ""}
            onChange={(event) => onReactivoChange(Number(event.target.value))}
            disabled={reactivos.length === 0}
          >
            {reactivos.map((reactivo) => (
              <option key={reactivo.id} value={reactivo.id}>
                {reactivo.nombre} | stock: {formatNumber(reactivo.stock_total)} {reactivo.unidad} | ID {reactivo.id}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Buscar lote</span>
          <form
            className="grid gap-2 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              const texto = busqueda.trim()
              if (texto.toUpperCase().startsWith("LAB-")) {
                void onBuscarCodigoInterno(texto)
              }
            }}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary"
                size={18}
                aria-hidden="true"
              />
              <Input
                className="pl-12"
                value={busqueda}
                onChange={(event) => onBusquedaChange(event.target.value)}
                placeholder="QR interno, lote, proveedor"
              />
            </div>
            <Button type="submit" variant="secondary" size="compact" disabled={!busqueda.trim().toUpperCase().startsWith("LAB-")}>
              Ir
            </Button>
          </form>
        </label>
      </div>

      <div className="mb-4 grid gap-px bg-cds-borderSubtle md:grid-cols-3">
        <MetricTile label="Stock activo" value={`${formatNumber(stockTotal)} ${reactivoSeleccionado?.unidad ?? ""}`} icon={Package} />
        <MetricTile label="Lotes activos" value={String(lotesTodos.length)} icon={Package} />
        <MetricTile label="Próximo vencimiento" value={formatDate(proximoVencimiento)} icon={CalendarClock} />
      </div>

      {lotesTodos[0] ? (
        <p className="mb-3 text-xs tracking-[0.32px] text-cds-textSecondary">
          Lote FIFO: <span className="font-mono text-cds-textPrimary">{lotesTodos[0].codigo_interno}</span>
        </p>
      ) : null}

      <LotesTable lotes={lotes} isLoading={isLoading} onSelect={setLoteEditarId} />

      {puedeEditar && loteEditar ? (
        <EditarLoteForm token={token} lote={loteEditar} lotes={lotesTodos} onSelect={setLoteEditarId} onUpdated={onUpdated} />
      ) : null}

      {puedeImprimir && lotesTodos.length ? (
        <EtiquetasLotes token={token} lotes={lotesTodos} reactivoNombre={reactivoSeleccionado?.nombre ?? "reactivo"} />
      ) : null}
    </>
  )
}

function NuevoLoteForm({
  token,
  usuarioId,
  reactivos,
  onSuccess,
}: {
  token: string
  usuarioId: number
  reactivos: Reactivo[]
  onSuccess: (reactivoId: number, mensaje: string, quedarseEnFormulario?: boolean) => void | Promise<void>
}) {
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [reactivoId, setReactivoId] = useState<number | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [modoCarga, setModoCarga] = useState<"manual" | "vision" | "multiple">("manual")
  const [datosExtraidos, setDatosExtraidos] = useState<DatosEtiqueta | null>(null)
  const [cantidadEnvases, setCantidadEnvases] = useState("2")
  const [cantidadInicial, setCantidadInicial] = useState("")
  const [unidadIngreso, setUnidadIngreso] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState(isoDatePlusDays(365))
  const [numeroLote, setNumeroLote] = useState("")
  const [marca, setMarca] = useState("")
  const [casNumero, setCasNumero] = useState("")
  const [codigoProveedor, setCodigoProveedor] = useState("")
  const [proveedor, setProveedor] = useState("")
  const [costoTotal, setCostoTotal] = useState("0")
  const [altaMultipleResultado, setAltaMultipleResultado] = useState<LoteCrearMultipleResponse | null>(null)
  const crearMutation = useMutation({
    mutationFn: (data: LoteCrear) => api.crearLote(token, data),
  })
  const crearMultipleMutation = useMutation({
    mutationFn: (data: LoteCrearMultiple) => api.crearLotesMultiples(token, data),
  })
  const pdfAltaMultipleMutation = useMutation({
    mutationFn: (ids: number[]) => api.etiquetasPdf(token, ids, 1),
  })
  const visionMutation = useMutation({
    mutationFn: (file: File) => api.extraerEtiquetaLote(token, file),
  })

  const reactivosFiltrados = soloPendientes ? reactivos.filter(esPendiente) : reactivos
  const reactivo = useMemo(() => {
    if (!reactivosFiltrados.length) {
      return null
    }
    if (!reactivoId) {
      return reactivosFiltrados[0]
    }
    return reactivosFiltrados.find((item) => item.id === reactivoId) ?? reactivosFiltrados[0]
  }, [reactivoId, reactivosFiltrados])

  const unidadesQuery = useQuery({
    queryKey: ["unidades-compatibles", reactivo?.unidad],
    queryFn: () => api.unidadesCompatibles(token, reactivo!.unidad),
    enabled: Boolean(token && reactivo?.unidad),
  })
  const unidadesDisponibles = unidadesQuery.data?.unidades ?? (reactivo ? [reactivo.unidad] : [])
  const unidadSeleccionada = unidadIngreso || reactivo?.unidad || ""

  async function handleEtiquetaFile(file: File | null) {
    if (!file) {
      return
    }
    setErrorLocal(null)
    setAltaMultipleResultado(null)
    try {
      const datos = await visionMutation.mutateAsync(file)
      if (!datos.es_etiqueta_reactivo) {
        setDatosExtraidos(null)
        setErrorLocal("La imagen no parece ser una etiqueta de reactivo. Podés cargar el lote manualmente.")
        return
      }
      setDatosExtraidos(datos)
      if (datos.cantidad_envase !== null && datos.cantidad_envase !== undefined) {
        setCantidadInicial(String(datos.cantidad_envase))
      }
      if (datos.unidad_envase && unidadesDisponibles.includes(datos.unidad_envase)) {
        setUnidadIngreso(datos.unidad_envase)
      }
      if (datos.fecha_vencimiento) {
        setFechaVencimiento(datos.fecha_vencimiento)
      }
      setNumeroLote(datos.numero_lote ?? "")
      setMarca(datos.fabricante ?? "")
      setCasNumero(datos.cas_numero ?? "")
      setCodigoProveedor(datos.codigo_proveedor ?? "")
      setProveedor(datos.fabricante ?? "")
    } catch (error) {
      setDatosExtraidos(null)
      setErrorLocal(mutationError(error, "No se pudieron extraer datos de la etiqueta"))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!reactivo) {
      return
    }
    setErrorLocal(null)
    setAltaMultipleResultado(null)
    try {
      const cantidadParseada = requireFiniteNumber(
        parseFormNumber(cantidadInicial),
        "Cantidad debe ser un número válido.",
      )
      const cantidadEnvasesParseada = requireFiniteNumber(
        parseFormNumber(cantidadEnvases),
        "Cantidad de envases debe ser un número válido.",
      )
      const costoParseado = requireFiniteNumber(
        parseFormNumber(costoTotal, 0),
        "Costo total debe ser un número válido.",
      )
      if (cantidadParseada <= 0) {
        throw new Error("La cantidad debe ser mayor a 0.")
      }
      if (costoParseado < 0) {
        throw new Error("El costo total no puede ser negativo.")
      }
      if (modoCarga === "multiple" && (!Number.isInteger(cantidadEnvasesParseada) || cantidadEnvasesParseada < 1)) {
        throw new Error("La cantidad de envases debe ser un entero mayor a 0.")
      }
      let mensajeCreacion = ""
      if (modoCarga === "multiple") {
        const payload: LoteCrearMultiple = {
          reactivo_id: reactivo.id,
          cantidad_envases: cantidadEnvasesParseada,
          cantidad_por_envase: cantidadParseada,
          unidad_ingreso: unidadSeleccionada || reactivo.unidad,
          fecha_vencimiento: fechaVencimiento,
          proveedor: proveedor.trim(),
          costo_total_compra: costoParseado,
          usuario_id: usuarioId,
          numero_lote: nullable(numeroLote),
          marca: nullable(marca),
          cas_numero: nullable(casNumero),
          codigo_proveedor: nullable(codigoProveedor),
        }
        const resultado = await crearMultipleMutation.mutateAsync(payload)
        setAltaMultipleResultado(resultado)
        mensajeCreacion = `Se crearon ${resultado.cantidad_envases} envases para ${reactivo.nombre}.`
      } else {
        const payload: LoteCrear = {
          reactivo_id: reactivo.id,
          cantidad_inicial: cantidadParseada,
          unidad_ingreso: unidadSeleccionada || reactivo.unidad,
          fecha_vencimiento: fechaVencimiento,
          proveedor: proveedor.trim(),
          costo_total: costoParseado,
          usuario_id: usuarioId,
          numero_lote: nullable(numeroLote),
          marca: nullable(marca),
          cas_numero: nullable(casNumero),
          codigo_proveedor: nullable(codigoProveedor),
        }
        const resultado = await crearMutation.mutateAsync(payload)
        mensajeCreacion = `Lote creado: ${resultado.codigo_interno}.`
      }
      formElement.reset()
      setDatosExtraidos(null)
      setCantidadEnvases("2")
      setCantidadInicial("")
      setUnidadIngreso("")
      setFechaVencimiento(isoDatePlusDays(365))
      setNumeroLote("")
      setMarca("")
      setCasNumero("")
      setCodigoProveedor("")
      setProveedor("")
      setCostoTotal("0")
      await onSuccess(reactivo.id, mensajeCreacion, modoCarga === "multiple")
    } catch (error) {
      setErrorLocal(mutationError(error, "No se pudo crear el lote"))
    }
  }

  async function descargarEtiquetasAltaMultiple() {
    if (!altaMultipleResultado?.lotes.length) {
      return
    }
    setErrorLocal(null)
    try {
      const ids = altaMultipleResultado.lotes.map((lote) => lote.id)
      const blob = await pdfAltaMultipleMutation.mutateAsync(ids)
      downloadBlob(blob, "etiquetas_alta_multiple.pdf")
    } catch (error) {
      setErrorLocal(mutationError(error, "No se pudo generar el PDF de etiquetas"))
    }
  }

  if (!reactivos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Primero tenés que crear al menos un reactivo.</div>
  }

  return (
    <form className="max-w-5xl bg-cds-layer01 p-4" onSubmit={handleSubmit}>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[24px] leading-[1.33]">Registrar entrada de lote</h2>
          <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
            Carga manual. La unidad se convierte automáticamente a la unidad base del reactivo.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm tracking-[0.16px]">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(event) => {
              setSoloPendientes(event.target.checked)
              setReactivoId(null)
            }}
          />
          Solo sin stock o en tránsito
        </label>
      </div>

      <div className="mb-5">
        <div className="mb-5">
          <div className="mb-2 text-xs tracking-[0.32px] text-cds-textSecondary">Modo de carga</div>
          <div className="inline-flex gap-px bg-cds-borderSubtle">
            <button
              type="button"
              onClick={() => {
                setModoCarga("manual")
                setDatosExtraidos(null)
                setAltaMultipleResultado(null)
              }}
              className={cn(
                "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px]",
                modoCarga === "manual" && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
              )}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => {
                setModoCarga("vision")
                setAltaMultipleResultado(null)
              }}
              className={cn(
                "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px]",
                modoCarga === "vision" && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
              )}
            >
              Escanear etiqueta
            </button>
            <button
              type="button"
              onClick={() => {
                setModoCarga("multiple")
                setDatosExtraidos(null)
                setAltaMultipleResultado(null)
              }}
              className={cn(
                "h-10 bg-cds-layer01 px-4 text-sm tracking-[0.16px]",
                modoCarga === "multiple" && "bg-cds-background text-cds-linkPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
              )}
            >
              Alta múltiple
            </button>
          </div>
        </div>

        {modoCarga === "vision" ? (
          <div className="mb-5 border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm tracking-[0.16px]">
              <Camera size={18} aria-hidden="true" />
              Foto de etiqueta
            </div>
            <input
              id="foto_etiqueta_lote"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void handleEtiquetaFile(event.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="foto_etiqueta_lote"
              className="inline-flex h-10 cursor-pointer items-center border border-cds-buttonPrimary px-4 text-sm tracking-[0.16px] text-cds-linkPrimary transition-colors hover:bg-cds-layer01"
            >
              Seleccionar imagen
            </label>
            <p className="mt-3 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
              La IA solo prellena campos. Revisá el reactivo seleccionado y confirmá antes de guardar.
            </p>
            {visionMutation.isPending ? (
              <p className="mt-3 text-sm text-cds-textSecondary">Extrayendo datos...</p>
            ) : null}
            {datosExtraidos?.nombre_compuesto ? (
              <p className="mt-3 text-sm">
                Compuesto detectado: <strong>{datosExtraidos.nombre_compuesto}</strong>
              </p>
            ) : null}
            {datosExtraidos?.notas ? (
              <p className="mt-2 text-sm text-cds-textSecondary">Notas detectadas: {datosExtraidos.notas}</p>
            ) : null}
          </div>
        ) : null}

        <Label className="mb-2" htmlFor="reactivo_nuevo_lote">Reactivo *</Label>
        <select
          id="reactivo_nuevo_lote"
          className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
          value={reactivo?.id ?? ""}
          onChange={(event) => setReactivoId(Number(event.target.value))}
          disabled={!reactivosFiltrados.length}
        >
          {reactivosFiltrados.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} | stock: {formatNumber(item.stock_total)} {item.unidad} | {item.categoria || "sin categoría"}
            </option>
          ))}
        </select>
      </div>

      {!reactivo ? (
        <div className="border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3 text-sm">
          No hay reactivos para ese filtro.
        </div>
      ) : (
        <>
          <div className="mb-5 border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3 text-sm">
            Unidad base: <strong>{reactivo.unidad}</strong>. Registrando como usuario ID {usuarioId}.
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {modoCarga === "multiple" ? (
              <DecimalField
                label="Cantidad de envases físicos *"
                name="cantidad_envases"
                value={cantidadEnvases}
                onChange={(event) => setCantidadEnvases(event.target.value)}
                required
              />
            ) : null}
            <DecimalField
              label={modoCarga === "multiple" ? "Cantidad por envase *" : "Cantidad *"}
              name="cantidad_inicial"
              value={cantidadInicial}
              onChange={(event) => setCantidadInicial(event.target.value)}
              required
            />
            <label className="block">
              <Label className="mb-2" htmlFor="unidad_ingreso">Unidad de ingreso *</Label>
              <select
                id="unidad_ingreso"
                name="unidad_ingreso"
                className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                value={unidadSeleccionada}
                onChange={(event) => setUnidadIngreso(event.target.value)}
              >
                {unidadesDisponibles.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Fecha de vencimiento *"
              name="fecha_vencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={(event) => setFechaVencimiento(event.target.value)}
              required
            />
            <Field
              label="Número de lote fabricante"
              name="numero_lote"
              value={numeroLote}
              onChange={(event) => setNumeroLote(event.target.value)}
              placeholder="Ej: BCBV1234"
            />
            <Field
              label="Marca / fabricante"
              name="marca"
              value={marca}
              onChange={(event) => setMarca(event.target.value)}
              placeholder="Ej: Sigma-Aldrich, Merck"
            />
            <Field
              label="Número CAS"
              name="cas_numero"
              value={casNumero}
              onChange={(event) => setCasNumero(event.target.value)}
              placeholder="Ej: 64-17-5"
            />
            <Field
              label="Código de barras del producto"
              name="codigo_proveedor"
              value={codigoProveedor}
              onChange={(event) => setCodigoProveedor(event.target.value)}
              placeholder="Ej: 7501031311309"
            />
            <Field
              label="Proveedor *"
              name="proveedor"
              value={proveedor}
              onChange={(event) => setProveedor(event.target.value)}
              placeholder="Ej: Sigma-Aldrich"
              required
            />
            <DecimalField
              label={modoCarga === "multiple" ? "Costo total de la compra ($)" : "Costo total ($)"}
              name="costo_total"
              value={costoTotal}
              onChange={(event) => setCostoTotal(event.target.value)}
            />
          </div>
        </>
      )}

      {errorLocal ? (
        <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}

      {altaMultipleResultado ? (
        <section className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-[0.16px]">
            <PackagePlus size={18} aria-hidden="true" />
            {altaMultipleResultado.cantidad_envases} envases creados
          </div>
          <p className="text-sm text-cds-textSecondary">
            Total guardado: {formatNumber(altaMultipleResultado.cantidad_total_guardada)} {altaMultipleResultado.unidad}.
          </p>
          <div className="mt-4 max-h-48 overflow-y-auto border-t border-cds-borderSubtle">
            {altaMultipleResultado.lotes.map((lote) => (
              <div key={lote.id} className="flex min-h-10 items-center justify-between border-b border-cds-borderSubtle text-sm">
                <span className="font-mono text-xs">{lote.codigo_interno}</span>
                <span className="text-cds-textSecondary">ID {lote.id}</span>
              </div>
            ))}
          </div>
          <Button
            className="mt-4"
            type="button"
            variant="secondary"
            onClick={descargarEtiquetasAltaMultiple}
            disabled={pdfAltaMultipleMutation.isPending}
          >
            <Download size={18} aria-hidden="true" />
            {pdfAltaMultipleMutation.isPending ? "Generando..." : "Descargar etiquetas PDF"}
          </Button>
        </section>
      ) : null}

      <Button className="mt-6" type="submit" disabled={!reactivo || crearMutation.isPending || crearMultipleMutation.isPending}>
        <Save size={18} aria-hidden="true" />
        {crearMutation.isPending || crearMultipleMutation.isPending
          ? "Registrando..."
          : modoCarga === "multiple"
            ? "Registrar envases"
            : "Registrar lote"}
      </Button>
    </form>
  )
}

function EditarLoteForm({
  token,
  lote,
  lotes,
  onSelect,
  onUpdated,
}: {
  token: string
  lote: Lote
  lotes: Lote[]
  onSelect: (id: number) => void
  onUpdated: (mensaje?: string) => void | Promise<void>
}) {
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [mensajeMetadata, setMensajeMetadata] = useState<string | null>(null)
  const [mensajeAjuste, setMensajeAjuste] = useState<string | null>(null)
  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LoteActualizar }) => api.actualizarLote(token, id, data),
  })
  const ajusteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LoteAjusteStock }) => api.ajustarStockLote(token, id, data),
  })
  const unidadesQuery = useQuery({
    queryKey: ["unidades-compatibles", lote.unidad],
    queryFn: () => api.unidadesCompatibles(token, lote.unidad),
    enabled: Boolean(token && lote.unidad),
  })
  const unidadesDisponibles = unidadesQuery.data?.unidades ?? [lote.unidad]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorLocal(null)
    setMensajeMetadata(null)
    setMensajeAjuste(null)
    try {
      const form = new FormData(event.currentTarget)
      const costoTotal = requireFiniteNumber(
        parseFormNumber(form.get("costo_total"), 0),
        "Costo total debe ser un número válido.",
      )
      if (costoTotal < 0) {
        throw new Error("El costo total no puede ser negativo.")
      }
      const payload: LoteActualizar = {
        numero_lote: nullable(String(form.get("numero_lote") ?? "")),
        marca: nullable(String(form.get("marca") ?? "")),
        cas_numero: nullable(String(form.get("cas_numero") ?? "")),
        codigo_proveedor: nullable(String(form.get("codigo_proveedor") ?? "")),
        fecha_vencimiento: String(form.get("fecha_vencimiento") ?? lote.fecha_vencimiento),
        proveedor: String(form.get("proveedor") ?? "").trim(),
        costo_total: costoTotal,
      }
      await actualizarMutation.mutateAsync({ id: lote.id, data: payload })
      setMensajeMetadata("Datos del lote actualizados correctamente.")
      await onUpdated()
    } catch (error) {
      setErrorLocal(mutationError(error, "No se pudo actualizar el lote"))
    }
  }

  async function handleAjusteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setErrorLocal(null)
    setMensajeMetadata(null)
    setMensajeAjuste(null)
    try {
      const form = new FormData(formElement)
      const cantidadReal = requireFiniteNumber(
        parseFormNumber(form.get("cantidad_real")),
        "Cantidad real debe ser un número válido.",
      )
      const motivo = String(form.get("motivo_ajuste") ?? "").trim()
      if (cantidadReal < 0) {
        throw new Error("La cantidad real no puede ser negativa.")
      }
      if (!motivo) {
        throw new Error("El motivo es obligatorio para ajustar stock.")
      }
      const payload: LoteAjusteStock = {
        cantidad_real: cantidadReal,
        unidad_ingreso: String(form.get("unidad_ajuste") ?? lote.unidad),
        motivo,
      }
      const resultado = await ajusteMutation.mutateAsync({ id: lote.id, data: payload })
      formElement.reset()
      setMensajeAjuste(`Stock ajustado: ${resultado.codigo_interno} quedó en ${formatNumber(resultado.cantidad_real)} ${resultado.unidad}.`)
      await onUpdated()
    } catch (error) {
      setErrorLocal(mutationError(error, "No se pudo ajustar el stock"))
    }
  }

  return (
    <section className="mt-8 bg-cds-layer01 p-4">
      <form key={`metadata-${lote.id}`} onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[24px] leading-[1.33]">Editar lote</h2>
            <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
              Metadata solamente. La cantidad actual se corrige con ajuste de stock y motivo.
            </p>
          </div>
          <label className="block min-w-[280px]">
            <Label className="mb-2" htmlFor="lote_editar">Lote</Label>
            <select
              id="lote_editar"
              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
              value={lote.id}
              onChange={(event) => onSelect(Number(event.target.value))}
            >
              {lotes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo_interno} - {item.numero_lote || "sin lote fabricante"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Número de lote fabricante" name="numero_lote" defaultValue={lote.numero_lote ?? ""} />
          <Field label="Marca / fabricante" name="marca" defaultValue={lote.marca ?? ""} />
          <Field label="Número CAS" name="cas_numero" defaultValue={lote.cas_numero ?? ""} />
          <Field label="Código proveedor" name="codigo_proveedor" defaultValue={lote.codigo_proveedor ?? ""} />
          <Field label="Fecha de vencimiento" name="fecha_vencimiento" type="date" defaultValue={lote.fecha_vencimiento} required />
          <Field label="Proveedor *" name="proveedor" defaultValue={lote.proveedor ?? ""} required />
          <DecimalField label="Costo total" name="costo_total" defaultValue={String(lote.costo_total ?? 0)} />
        </div>

        <Button className="mt-6" type="submit" disabled={actualizarMutation.isPending}>
          <Save size={18} aria-hidden="true" />
          {actualizarMutation.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        {mensajeMetadata ? (
          <div className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">
            {mensajeMetadata}
          </div>
        ) : null}
      </form>

      <form key={`ajuste-${lote.id}`} className="mt-8 border-t border-cds-borderSubtle pt-6" onSubmit={handleAjusteSubmit}>
        <div className="mb-5">
          <h3>Ajustar stock</h3>
          <p className="mt-2 text-sm tracking-[0.16px] text-cds-textSecondary">
            Stock actual: <span className="font-mono text-cds-textPrimary">{formatNumber(lote.cantidad_actual)} {lote.unidad}</span>. El ajuste registra un movimiento auditable.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <DecimalField label="Cantidad real *" name="cantidad_real" defaultValue={String(lote.cantidad_actual ?? 0)} required />
          <label className="block">
            <Label className="mb-2" htmlFor="unidad_ajuste">Unidad *</Label>
            <select
              id="unidad_ajuste"
              name="unidad_ajuste"
              className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
              defaultValue={lote.unidad}
            >
              {unidadesDisponibles.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
          </label>
          <Field
            className="md:col-span-2"
            label="Motivo obligatorio *"
            name="motivo_ajuste"
            placeholder="Ej: Conteo físico, merma, evaporación, frasco roto"
            required
          />
        </div>
        <Button className="mt-6" type="submit" disabled={ajusteMutation.isPending}>
          <Save size={18} aria-hidden="true" />
          {ajusteMutation.isPending ? "Ajustando..." : "Registrar ajuste"}
        </Button>
        {mensajeAjuste ? (
          <div className="mt-5 border-l-4 border-cds-supportSuccess bg-cds-background px-4 py-3 text-sm">
            {mensajeAjuste}
          </div>
        ) : null}
      </form>

      {errorLocal ? (
        <div className="mt-5 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}
    </section>
  )
}

function EtiquetasLotes({
  token,
  lotes,
  reactivoNombre,
}: {
  token: string
  lotes: Lote[]
  reactivoNombre: string
}) {
  const [loteQrId, setLoteQrId] = useState(lotes[0]?.id ?? 0)
  const [seleccionPdf, setSeleccionPdf] = useState<number[]>(lotes.map((lote) => lote.id))
  const [posicionInicio, setPosicionInicio] = useState("1")
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const qrMutation = useMutation({
    mutationFn: (lote: Lote) => api.qrLote(token, lote.id),
  })
  const pdfMutation = useMutation({
    mutationFn: ({ ids, posicion }: { ids: number[]; posicion: number }) => api.etiquetasPdf(token, ids, posicion),
  })

  const loteQr = lotes.find((lote) => lote.id === loteQrId) ?? lotes[0]

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

  async function descargarQr() {
    setErrorLocal(null)
    try {
      const blob = await qrMutation.mutateAsync(loteQr)
      downloadBlob(blob, `${loteQr.codigo_interno}.png`)
    } catch (error) {
      setErrorLocal(mutationError(error, "No se pudo descargar el QR"))
    }
  }

  async function descargarPdf() {
    setErrorLocal(null)
    try {
      const posicion = requireFiniteNumber(parseFormNumber(posicionInicio, 1), "Posición inicial inválida.")
      if (posicion < 1 || posicion > 21 || !Number.isInteger(posicion)) {
        throw new Error("La posición inicial debe ser un entero entre 1 y 21.")
      }
      if (!seleccionPdf.length) {
        throw new Error("Seleccioná al menos un lote.")
      }
      const blob = await pdfMutation.mutateAsync({ ids: seleccionPdf, posicion })
      const nombre = reactivoNombre.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "")
      downloadBlob(blob, `etiquetas_${nombre || "reactivo"}.pdf`)
    } catch (error) {
      setErrorLocal(mutationError(error, "No se pudo generar el PDF"))
    }
  }

  function toggleLotePdf(id: number) {
    setSeleccionPdf((actual) =>
      actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id],
    )
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section className="bg-cds-layer01 p-4">
        <div className="mb-5 flex items-center gap-3">
          <QrCode size={20} aria-hidden="true" />
          <h2 className="text-[24px] leading-[1.33]">Reimprimir QR</h2>
        </div>
        <label className="block">
          <Label className="mb-2" htmlFor="lote_qr">Lote</Label>
          <select
            id="lote_qr"
            className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
            value={loteQr.id}
            onChange={(event) => setLoteQrId(Number(event.target.value))}
          >
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.codigo_interno} ({formatNumber(lote.cantidad_actual)} {lote.unidad})
              </option>
            ))}
          </select>
        </label>
        <p className="mt-4 font-mono text-sm tracking-[0.16px]">{loteQr.codigo_interno}</p>
        <Button className="mt-5" type="button" onClick={descargarQr} disabled={qrMutation.isPending}>
          <Download size={18} aria-hidden="true" />
          {qrMutation.isPending ? "Descargando..." : "Descargar QR PNG"}
        </Button>
      </section>

      <section className="bg-cds-layer01 p-4">
        <div className="mb-5 flex items-center gap-3">
          <FileText size={20} aria-hidden="true" />
          <h2 className="text-[24px] leading-[1.33]">Imprimir etiquetas</h2>
        </div>
        <p className="mb-4 text-sm tracking-[0.16px] text-cds-textSecondary">
          PDF A4 Avery L7160, 21 etiquetas por hoja.
        </p>
        <div className="max-h-56 overflow-y-auto border-t border-cds-borderSubtle">
          {lotes.map((lote) => (
            <label key={lote.id} className="flex min-h-12 items-center gap-3 border-b border-cds-borderSubtle px-1 text-sm">
              <input
                type="checkbox"
                checked={seleccionPdf.includes(lote.id)}
                onChange={() => toggleLotePdf(lote.id)}
              />
              <span className="font-mono text-xs">{lote.codigo_interno}</span>
              <span className="text-cds-textSecondary">vence {formatDate(lote.fecha_vencimiento)}</span>
            </label>
          ))}
        </div>
        <label className="mt-5 block max-w-48">
          <Label className="mb-2" htmlFor="posicion_inicio">Empezar en posición</Label>
          <Input
            id="posicion_inicio"
            value={posicionInicio}
            onChange={(event) => setPosicionInicio(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <Button className="mt-5" type="button" onClick={descargarPdf} disabled={pdfMutation.isPending || !seleccionPdf.length}>
          <Download size={18} aria-hidden="true" />
          {pdfMutation.isPending ? "Generando..." : "Descargar PDF"}
        </Button>
      </section>

      {errorLocal ? (
        <div className="border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm xl:col-span-2">
          {errorLocal}
        </div>
      ) : null}
    </div>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Package
}) {
  return (
    <article className="bg-cds-layer01 p-4">
      <div className="mb-4 flex items-center justify-between text-cds-textSecondary">
        <span className="text-xs tracking-[0.32px]">{label}</span>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="text-[24px] font-normal leading-[1.33]">{value}</div>
    </article>
  )
}

function LotesTable({
  lotes,
  isLoading,
  onSelect,
}: {
  lotes: Lote[]
  isLoading: boolean
  onSelect: (id: number) => void
}) {
  if (isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando tabla...</div>
  }

  if (lotes.length === 0) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay lotes activos para mostrar.</div>
  }

  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[1340px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">QR interno</th>
            <th className="h-10 px-4 font-normal">Lote fabricante</th>
            <th className="h-10 px-4 font-normal">Marca</th>
            <th className="h-10 px-4 font-normal">CAS</th>
            <th className="h-10 px-4 font-normal">Cód. proveedor</th>
            <th className="h-10 px-4 font-normal">Ingreso</th>
            <th className="h-10 px-4 text-right font-normal">Stock</th>
            <th className="h-10 px-4 text-right font-normal">Inicial</th>
            <th className="h-10 px-4 font-normal">Vencimiento</th>
            <th className="h-10 px-4 font-normal">Proveedor</th>
            <th className="h-10 px-4 font-normal">Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote) => {
            const dias = daysUntil(lote.fecha_vencimiento)
            const vencido = dias < 0
            const porVencer = dias >= 0 && dias <= 30
            return (
              <tr
                key={lote.id}
                className="cursor-pointer border-b border-cds-borderSubtle transition-colors hover:bg-cds-layer01"
                onClick={() => onSelect(lote.id)}
              >
                <td className="h-12 px-4 font-mono text-xs tracking-[0.16px]">{lote.codigo_interno}</td>
                <td className="h-12 px-4">{lote.numero_lote || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.marca || "-"}</td>
                <td className="h-12 px-4 font-mono text-xs text-cds-textSecondary">{lote.cas_numero || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.codigo_proveedor || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{formatDate(lote.fecha_ingreso)}</td>
                <td className="h-12 px-4 text-right font-mono">
                  {formatNumber(lote.cantidad_actual)} {lote.unidad}
                </td>
                <td className="h-12 px-4 text-right font-mono">
                  {formatNumber(lote.cantidad_inicial)} {lote.unidad}
                </td>
                <td className={cn("h-12 px-4", vencido && "text-cds-supportError", porVencer && "text-cds-supportWarning")}>
                  {formatDate(lote.fecha_vencimiento)}
                </td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.proveedor || "-"}</td>
                <td className="h-12 px-4 text-cds-textSecondary">{lote.ubicacion || "-"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
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

function DecimalField(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode"> & {
  label: string
  name: string
  className?: string
}) {
  return <Field {...props} type="text" inputMode="decimal" />
}
