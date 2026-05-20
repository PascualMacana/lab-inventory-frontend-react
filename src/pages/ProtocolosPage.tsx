import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Camera, Check, Download, FileText, FlaskConical, History, Play, Plus, RotateCcw, Search, X } from "lucide-react"

import { ModuleNav } from "../components/ModuleNav"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  api,
  type Lote,
  type Protocolo,
  type ProtocoloCalculo,
  type ProtocoloInsumo,
  type ProtocoloParametro,
  type Reactivo,
} from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber } from "../lib/forms"
import { puede } from "../lib/permissions"

type TabKey = "plantillas" | "historial" | "crear"
type Message = { type: "success" | "error" | "info"; text: string } | null

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(value ?? 0)
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function compatibleReactivos(reactivos: Reactivo[], grupo?: string) {
  if (grupo === "volumen") {
    return reactivos.filter((reactivo) => new Set(["ul", "ml", "L"]).has(reactivo.unidad))
  }
  if (grupo === "masa") {
    return reactivos.filter((reactivo) => new Set(["ug", "mg", "g", "kg"]).has(reactivo.unidad))
  }
  if (grupo === "discreto") {
    return reactivos.filter((reactivo) => reactivo.unidad === "unidad")
  }
  return reactivos
}

function parametroDefault(parametro: ProtocoloParametro) {
  if (parametro.tipo === "opcion") {
    return parametro.opciones?.[0] ?? ""
  }
  return parametro.default ?? parametro.min ?? 0
}

function parametroNombre(label: string) {
  const nombre = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return nombre || "parametro"
}

function parseLooseNumber(value: string | number) {
  if (typeof value === "number") {
    return value
  }
  const parsed = Number(value.trim().replace(",", "."))
  return Number.isFinite(parsed) ? parsed : value
}

function normalizarParametros(protocolo: Protocolo, parametros: Record<string, string | number>) {
  const normalizados: Record<string, unknown> = {}
  for (const parametro of protocolo.parametros ?? []) {
    const value = parametros[parametro.nombre]
    normalizados[parametro.nombre] = parametro.tipo ? value : parseLooseNumber(value)
  }
  return normalizados
}

function validarLoteParaInsumo(lote: Lote, insumo: ProtocoloInsumo) {
  if (!insumo.reactivo) {
    return `${insumo.nombre} is not linked to a catalog reagent.`
  }
  if (lote.reactivo_id !== insumo.reactivo.id) {
    return `Scanned lot belongs to ${lote.reactivo_nombre}, not ${insumo.nombre}.`
  }
  if (lote.cantidad_actual < insumo.cantidad_base) {
    return `${lote.codigo_interno} has ${formatNumber(lote.cantidad_actual)} ${lote.unidad}; protocol requires ${formatNumber(insumo.cantidad_base)} ${insumo.unidad_base}.`
  }
  return null
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ProtocolosPage() {
  const { token, usuario } = useAuth()
  const queryClient = useQueryClient()
  const puedeGestionar = puede(usuario, "gestionar_protocolos")
  const [tab, setTab] = useState<TabKey>("plantillas")
  const [protocoloId, setProtocoloId] = useState("")
  const [parametros, setParametros] = useState<Record<string, string | number>>({})
  const [calculo, setCalculo] = useState<ProtocoloCalculo | null>(null)
  const [lotesValidados, setLotesValidados] = useState<Record<string, Lote>>({})
  const [insumoActivo, setInsumoActivo] = useState("")
  const [codigoManual, setCodigoManual] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [message, setMessage] = useState<Message>(null)

  const protocolosQuery = useQuery({
    queryKey: ["protocolos"],
    queryFn: () => api.protocolos(token!),
    enabled: Boolean(token),
  })
  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })
  const ejecucionesQuery = useQuery({
    queryKey: ["protocolos-ejecuciones"],
    queryFn: () => api.protocolosEjecuciones(token!, 80),
    enabled: Boolean(token),
  })
  const plantillasQuery = useQuery({
    queryKey: ["protocolos-plantillas"],
    queryFn: () => api.protocoloPlantillas(token!),
    enabled: Boolean(token && puedeGestionar),
  })

  const protocolos = useMemo(() => protocolosQuery.data ?? [], [protocolosQuery.data])
  const reactivos = useMemo(() => reactivosQuery.data ?? [], [reactivosQuery.data])
  const protocolo = protocolos.find((item) => item.id === protocoloId) ?? protocolos[0]

  useEffect(() => {
    if (!protocoloId && protocolos[0]) {
      setProtocoloId(protocolos[0].id)
    }
  }, [protocoloId, protocolos])

  useEffect(() => {
    if (!protocolo) {
      return
    }
    setParametros((current) => {
      const defaults: Record<string, string | number> = {}
      for (const parametro of protocolo.parametros ?? []) {
        defaults[parametro.nombre] = current[parametro.nombre] ?? parametroDefault(parametro)
      }
      return defaults
    })
    setCalculo(null)
    setLotesValidados({})
    setInsumoActivo("")
    setMessage(null)
  }, [protocolo])

  const calcularMutation = useMutation({
    mutationFn: () => api.calcularProtocolo(token!, protocolo!.id, normalizarParametros(protocolo!, parametros)),
    onSuccess: (resultado) => {
      setCalculo(resultado)
      setLotesValidados({})
      setInsumoActivo("")
      setMessage({ type: "success", text: "Inputs calculated. Validate lots before registering execution." })
    },
    onError: (error) => setMessage({ type: "error", text: mutationError(error, "Could not calculate protocol.") }),
  })

  const ejecutarMutation = useMutation({
    mutationFn: () => {
      if (!usuario || !calculo) {
        throw new Error("No active calculation.")
      }
      return api.ejecutarProtocolo(token!, calculo.protocolo.id, {
        usuario_id: usuario.id,
        parametros: calculo.parametros,
        observaciones: observaciones.trim() || null,
        insumos: trackeables.map((insumo) => ({
          insumo_id: insumo.id,
          lote_id: lotesValidados[insumo.id].id,
        })),
      })
    },
    onSuccess: async (resultado) => {
      setMessage({ type: "success", text: `Execution #${resultado.id} registered with ${resultado.movimientos.length} stock movement(s).` })
      setCalculo(null)
      setLotesValidados({})
      setObservaciones("")
      await queryClient.invalidateQueries({ queryKey: ["protocolos-ejecuciones"] })
      await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
    },
    onError: (error) => setMessage({ type: "error", text: mutationError(error, "Could not register execution.") }),
  })

  const buscarLoteMutation = useMutation({
    mutationFn: (codigo: string) => api.lotePorCodigo(token!, codigo),
  })
  const decodificarQrMutation = useMutation({
    mutationFn: (file: File) => api.decodificarQrLote(token!, file),
  })
  const crearPlantillaMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.crearProtocoloPlantilla>[1]) => api.crearProtocoloPlantilla(token!, data),
    onSuccess: async (resultado) => {
      setMessage({ type: "success", text: `Template created: ${resultado.protocolo_id}.` })
      await queryClient.invalidateQueries({ queryKey: ["protocolos"] })
      await queryClient.invalidateQueries({ queryKey: ["protocolos-plantillas"] })
    },
    onError: (error) => setMessage({ type: "error", text: mutationError(error, "Could not create template.") }),
  })
  const cambiarPlantillaMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      activo ? api.activarProtocoloPlantilla(token!, id) : api.desactivarProtocoloPlantilla(token!, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["protocolos"] })
      await queryClient.invalidateQueries({ queryKey: ["protocolos-plantillas"] })
    },
  })

  const trackeables = useMemo(() => (calculo?.insumos ?? []).filter((insumo) => insumo.reactivo), [calculo])
  const pendientes = trackeables.filter((insumo) => insumo.alcanza_stock && !lotesValidados[insumo.id])
  const bloqueados = trackeables.filter((insumo) => !insumo.alcanza_stock)
  const puedeRegistrar = Boolean(calculo && trackeables.length > 0 && pendientes.length === 0 && bloqueados.length === 0)
  const progreso = trackeables.length ? (trackeables.length - pendientes.length - bloqueados.length) / trackeables.length : 0

  async function validarCodigo(codigo: string, insumo: ProtocoloInsumo) {
    const limpio = codigo.trim()
    if (!limpio) {
      setMessage({ type: "error", text: "Enter an internal lot code." })
      return
    }
    try {
      const lote = await buscarLoteMutation.mutateAsync(limpio)
      const error = validarLoteParaInsumo(lote, insumo)
      if (error) {
        setMessage({ type: "error", text: error })
        return
      }
      setLotesValidados((current) => ({ ...current, [insumo.id]: lote }))
      setCodigoManual("")
      setMessage({ type: "success", text: `${lote.codigo_interno} validated for ${insumo.nombre}.` })
    } catch (error) {
      setMessage({ type: "error", text: mutationError(error, "Could not validate lot.") })
    }
  }

  async function validarQr(file: File | null, insumo: ProtocoloInsumo | undefined) {
    if (!file || !insumo) {
      return
    }
    try {
      const resultado = await decodificarQrMutation.mutateAsync(file)
      await validarCodigo(resultado.codigo_interno, insumo)
    } catch (error) {
      setMessage({ type: "error", text: mutationError(error, "Could not read QR image.") })
    }
  }

  async function handleCrearPlantilla(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!usuario) {
      return
    }
    const form = new FormData(formElement)
    const nombre = String(form.get("nombre") ?? "").trim()
    const pasos = String(form.get("pasos") ?? "")
      .split("\n")
      .map((paso) => paso.trim())
      .filter(Boolean)
    const parametrosPlantilla = [1, 2, 3]
      .map((idx) => {
        const label = String(form.get(`param_label_${idx}`) ?? "").trim()
        if (!label) {
          return null
        }
        const unidad = String(form.get(`param_unidad_${idx}`) ?? "").trim()
        const defaultValue = parseFormNumber(form.get(`param_default_${idx}`), 1)
        return { nombre: parametroNombre(label), label, unidad, min: 0, default: defaultValue, step: 1 }
      })
      .filter(Boolean) as Array<Record<string, unknown>>
    const insumos = [1, 2, 3, 4, 5]
      .map((idx) => {
        const reactivoId = Number(form.get(`insumo_reactivo_${idx}`) ?? 0)
        const cantidad = parseFormNumber(form.get(`insumo_cantidad_${idx}`), 0)
        if (!reactivoId || cantidad <= 0) {
          return null
        }
        const reactivo = reactivos.find((item) => item.id === reactivoId)
        const modo = String(form.get(`insumo_modo_${idx}`) ?? "fijo")
        const parametroRaw = String(form.get(`insumo_parametro_${idx}`) ?? "").trim()
        const parametro = parametroRaw ? parametroNombre(parametroRaw) : String(parametrosPlantilla[0]?.nombre ?? "")
        return {
          reactivo_id: reactivoId,
          unidad: reactivo?.unidad ?? "unidad",
          modo_calculo: modo,
          ...(modo === "proporcional" ? { parametro_nombre: parametro, cantidad_por_unidad: cantidad } : { cantidad }),
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>

    await crearPlantillaMutation.mutateAsync({
      nombre,
      categoria: String(form.get("categoria") ?? "Plantilla editable").trim(),
      version: String(form.get("version") ?? "v1").trim(),
      parametros: parametrosPlantilla,
      pasos,
      insumos,
      usuario_id: usuario.id,
    })
    formElement.reset()
  }

  return (
    <section className="space-y-6">
      <div>
        <h1>Protocolos</h1>
        <p className="mt-2 max-w-3xl text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          Calculate inputs, validate physical lots and register deterministic protocol executions.
        </p>
      </div>

      <ModuleNav
        actions={
          tab === "plantillas"
            ? puedeGestionar
              ? [{ label: "Crear plantilla", onClick: () => setTab("crear"), icon: <Plus size={18} aria-hidden="true" /> }]
              : []
            : [{ label: "Volver a plantillas", onClick: () => setTab("plantillas"), icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" }]
        }
        more={tab === "plantillas" ? [{ label: "Historial", onClick: () => setTab("historial"), icon: <History size={18} aria-hidden="true" /> }] : []}
      />

      {message ? (
        <div className={`border-l-4 bg-cds-layer01 px-4 py-3 text-sm ${message.type === "error" ? "border-cds-supportError" : message.type === "success" ? "border-cds-supportSuccess" : "border-cds-supportInfo"}`}>
          {message.text}
        </div>
      ) : null}

      {tab === "plantillas" ? (
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <div className="border border-cds-borderSubtle bg-cds-layer01 p-4">
              <Label className="mb-2" htmlFor="protocolo">Protocol</Label>
              <select
                id="protocolo"
                className="h-10 w-full border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus"
                value={protocolo?.id ?? ""}
                onChange={(event) => setProtocoloId(event.target.value)}
                disabled={protocolosQuery.isLoading}
              >
                {protocolos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>

              {protocolo ? (
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    calcularMutation.mutate()
                  }}
                >
                  {(protocolo.parametros ?? []).map((parametro) => (
                    <ParametroInput
                      key={parametro.nombre}
                      parametro={parametro}
                      reactivos={reactivos}
                      value={parametros[parametro.nombre] ?? parametroDefault(parametro)}
                      onChange={(value) => setParametros((current) => ({ ...current, [parametro.nombre]: value }))}
                    />
                  ))}
                  <Button type="submit" className="w-full" disabled={calcularMutation.isPending}>
                    <Play size={18} aria-hidden="true" />
                    {calcularMutation.isPending ? "Calculating..." : calculo ? "Recalculate inputs" : "Calculate inputs"}
                  </Button>
                </form>
              ) : null}
            </div>

            {calculo ? (
              <div className="border border-cds-borderSubtle bg-cds-layer01 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[22px] leading-[1.27]">{calculo.protocolo.nombre}</h2>
                    <p className="mt-1 text-xs text-cds-textSecondary">{trackeables.length - pendientes.length - bloqueados.length}/{trackeables.length} inputs validated</p>
                  </div>
                  <Button type="button" variant="ghost" size="compact" onClick={() => { setCalculo(null); setLotesValidados({}); }}>
                    <RotateCcw size={16} aria-hidden="true" />
                    Clear
                  </Button>
                </div>
                {trackeables.length ? (
                  <div className="mt-4 h-2 bg-cds-layer02">
                    <div className="h-2 bg-cds-buttonPrimary" style={{ width: `${Math.round(progreso * 100)}%` }} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {!calculo ? (
              <div className="border border-cds-borderSubtle bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Calculate a protocol to start execution.</div>
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  {calculo.insumos.map((insumo) => (
                    <InsumoCard
                      key={insumo.id}
                      insumo={insumo}
                      lote={lotesValidados[insumo.id]}
                      onUseSuggested={() => {
                        if (insumo.lote_sugerido) {
                          setLotesValidados((current) => ({ ...current, [insumo.id]: insumo.lote_sugerido! }))
                        }
                      }}
                      onRemove={() => setLotesValidados((current) => {
                        const next = { ...current }
                        delete next[insumo.id]
                        return next
                      })}
                    />
                  ))}
                </div>

                {pendientes.length ? (
                  <div className="border border-cds-borderSubtle bg-cds-layer01 p-4">
                    <h3 className="mb-4">Validate lot</h3>
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <select
                        className="h-10 border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus"
                        value={insumoActivo || pendientes[0]?.id}
                        onChange={(event) => setInsumoActivo(event.target.value)}
                      >
                        {pendientes.map((insumo) => (
                          <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                        ))}
                      </select>
                      <Input value={codigoManual} onChange={(event) => setCodigoManual(event.target.value)} placeholder="LAB-2026-00042" />
                      <Button
                        type="button"
                        disabled={buscarLoteMutation.isPending}
                        onClick={() => {
                          const insumo = pendientes.find((item) => item.id === (insumoActivo || pendientes[0]?.id))
                          if (insumo) void validarCodigo(codigoManual, insumo)
                        }}
                      >
                        <Search size={18} aria-hidden="true" />
                        Validate
                      </Button>
                    </div>
                    <div className="mt-3">
                      <input
                        id="protocolo_qr"
                        className="sr-only"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={(event) => {
                          const insumo = pendientes.find((item) => item.id === (insumoActivo || pendientes[0]?.id))
                          void validarQr(event.target.files?.[0] ?? null, insumo)
                          event.currentTarget.value = ""
                        }}
                      />
                      <label htmlFor="protocolo_qr" className="inline-flex h-10 cursor-pointer items-center gap-2 border border-cds-borderStrong bg-cds-layer02 px-3 text-sm hover:bg-cds-borderSubtle">
                        <Camera size={18} aria-hidden="true" />
                        {decodificarQrMutation.isPending ? "Reading QR..." : "Scan QR photo"}
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="border border-cds-borderSubtle bg-cds-layer01 p-4">
                  <h3>Steps</h3>
                  <div className="mt-4 space-y-3">
                    {calculo.pasos.map((paso, index) => (
                      <label key={`${index}-${paso}`} className="flex items-start gap-3 text-sm">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--cds-button-primary)]" />
                        <span>{index + 1}. {paso}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border border-cds-borderSubtle bg-cds-layer01 p-4">
                  <Label className="mb-2" htmlFor="observaciones">Observations</Label>
                  <Input id="observaciones" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Prepared for cell culture room" />
                  {bloqueados.length ? <p className="mt-3 text-sm text-cds-supportError">Some inputs do not have enough stock.</p> : null}
                  {pendientes.length ? <p className="mt-3 text-sm text-cds-textSecondary">Validate all required inputs before registering.</p> : null}
                  {!trackeables.length ? <p className="mt-3 text-sm text-cds-textSecondary">This calculator is informational and does not register stock movements.</p> : null}
                  <Button type="button" className="mt-4 w-full" disabled={!puedeRegistrar || ejecutarMutation.isPending} onClick={() => ejecutarMutation.mutate()}>
                    <Check size={18} aria-hidden="true" />
                    {ejecutarMutation.isPending ? "Registering..." : "Register execution"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {tab === "historial" ? (
        <Historial ejecuciones={ejecucionesQuery.data ?? []} loading={ejecucionesQuery.isLoading} token={token} />
      ) : null}

      {tab === "crear" && puedeGestionar ? (
        <Plantillas
          plantillas={plantillasQuery.data ?? []}
          reactivos={reactivos}
          loading={plantillasQuery.isLoading}
          onCrear={handleCrearPlantilla}
          creando={crearPlantillaMutation.isPending}
          onCambiar={(id, activo) => cambiarPlantillaMutation.mutate({ id, activo })}
        />
      ) : null}
    </section>
  )
}

function ParametroInput({ parametro, reactivos, value, onChange }: { parametro: ProtocoloParametro; reactivos: Reactivo[]; value: string | number; onChange: (value: string | number) => void }) {
  const label = `${parametro.label ?? parametro.nombre}${parametro.unidad ? ` (${parametro.unidad})` : ""}`
  if (parametro.tipo === "opcion") {
    return (
      <label className="block">
        <Label className="mb-2">{label}</Label>
        <select className="h-10 w-full border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus" value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {(parametro.opciones ?? []).map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
        </select>
      </label>
    )
  }
  if (parametro.tipo === "reactivo") {
    const opciones = compatibleReactivos(reactivos, parametro.grupo)
    return (
      <label className="block">
        <Label className="mb-2">{label}</Label>
        <select className="h-10 w-full border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus" value={String(value)} onChange={(event) => onChange(Number(event.target.value))}>
          <option value="">Select reagent</option>
          {opciones.map((reactivo) => <option key={reactivo.id} value={reactivo.id}>{reactivo.nombre} ({reactivo.unidad})</option>)}
        </select>
      </label>
    )
  }
  return (
    <label className="block">
      <Label className="mb-2">{label}</Label>
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={String(parametroDefault(parametro))}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function InsumoCard({ insumo, lote, onUseSuggested, onRemove }: { insumo: ProtocoloInsumo; lote?: Lote; onUseSuggested: () => void; onRemove: () => void }) {
  const estado = !insumo.reactivo ? "informational" : lote ? "validated" : insumo.alcanza_stock ? "pending" : "insufficient stock"
  return (
    <article className="border border-cds-borderSubtle bg-cds-layer01 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3>{insumo.nombre}</h3>
          <p className="mt-1 text-sm text-cds-textSecondary">
            {formatNumber(insumo.cantidad)} {insumo.unidad} · {estado}
          </p>
        </div>
        {lote ? <Check className="text-cds-supportSuccess" size={20} aria-hidden="true" /> : <FlaskConical className="text-cds-textSecondary" size={20} aria-hidden="true" />}
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <div>Base: {formatNumber(insumo.cantidad_base)} {insumo.unidad_base}</div>
        {insumo.reactivo ? <div>Catalog: {insumo.reactivo.nombre}</div> : <div>No catalog reagent linked.</div>}
        {insumo.reactivo ? <div>Stock: {formatNumber(insumo.stock_total)} {insumo.unidad_base}</div> : null}
        {insumo.lote_sugerido ? <div>Suggested: <span className="font-mono">{insumo.lote_sugerido.codigo_interno}</span> · {formatNumber(insumo.lote_sugerido.cantidad_actual)} {insumo.lote_sugerido.unidad}</div> : null}
        {lote ? <div className="text-cds-supportSuccess">Validated: <span className="font-mono">{lote.codigo_interno}</span></div> : null}
      </div>
      <div className="mt-4 flex gap-2">
        {lote ? (
          <Button type="button" variant="ghost" size="compact" onClick={onRemove}><X size={16} aria-hidden="true" />Remove</Button>
        ) : insumo.lote_sugerido && insumo.lote_sugerido.cantidad_actual >= insumo.cantidad_base ? (
          <Button type="button" variant="secondary" size="compact" onClick={onUseSuggested}>Use suggested</Button>
        ) : null}
      </div>
    </article>
  )
}

function Historial({ ejecuciones, loading, token }: { ejecuciones: Awaited<ReturnType<typeof api.protocolosEjecuciones>>; loading: boolean; token: string | null }) {
  const pdfMutation = useMutation({
    mutationFn: (id: number) => api.protocoloEjecucionPdf(token!, id),
    onSuccess: (blob, id) => downloadBlob(blob, `protocolo_ejecucion_${id}.pdf`),
  })

  if (loading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Loading executions...</div>
  }
  if (!ejecuciones.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No executions registered yet.</div>
  }
  return (
    <div className="space-y-3">
      {ejecuciones.map((ejecucion) => (
        <details key={ejecucion.id} className="border border-cds-borderSubtle bg-cds-layer01 p-4">
          <summary className="cursor-pointer text-sm font-semibold">#{ejecucion.id} · {ejecucion.nombre} · {ejecucion.fecha} · {ejecucion.usuario_nombre}</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3>Planned inputs</h3>
              <div className="mt-3 space-y-2 text-sm">
                {(ejecucion.insumos_planificados ?? []).map((insumo) => (
                  <div key={insumo.id} className="border border-cds-borderSubtle bg-cds-background p-3">
                    {insumo.nombre} · {formatNumber(insumo.cantidad)} {insumo.unidad}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>Movements</h3>
              <div className="mt-3 space-y-2 text-sm">
                {(ejecucion.movimientos ?? []).map((movimiento) => (
                  <div key={movimiento.id} className="border border-cds-borderSubtle bg-cds-background p-3">
                    {movimiento.reactivo_nombre} · <span className="font-mono">{movimiento.codigo_interno}</span> · {formatNumber(movimiento.cantidad)} {movimiento.unidad}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {ejecucion.observaciones ? <p className="mt-4 text-sm text-cds-textSecondary">{ejecucion.observaciones}</p> : null}
          <Button type="button" className="mt-4" variant="secondary" size="compact" onClick={() => pdfMutation.mutate(ejecucion.id)}>
            <Download size={16} aria-hidden="true" />
            Download PDF
          </Button>
        </details>
      ))}
    </div>
  )
}

function Plantillas({ plantillas, reactivos, loading, onCrear, creando, onCambiar }: { plantillas: Protocolo[]; reactivos: Reactivo[]; loading: boolean; onCrear: (event: FormEvent<HTMLFormElement>) => void; creando: boolean; onCambiar: (id: number, activo: boolean) => void }) {
  const [paramLabels, setParamLabels] = useState<Record<number, string>>({})
  const [inputModes, setInputModes] = useState<Record<number, string>>({})
  const parametrosDisponibles = [1, 2, 3]
    .map((idx) => paramLabels[idx]?.trim())
    .filter(Boolean)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(520px,620px)_minmax(0,1fr)]">
      <form className="border border-cds-borderSubtle bg-cds-layer01 p-4" onSubmit={onCrear}>
        <h3 className="mb-4 flex items-center gap-2"><Plus size={18} aria-hidden="true" />Create template</h3>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <label><Label className="mb-2">Name</Label><Input name="nombre" required /></label>
            <label><Label className="mb-2">Version</Label><Input name="version" defaultValue="v1" /></label>
          </div>
          <label><Label className="mb-2">Category</Label><Input name="categoria" defaultValue="Plantilla editable" /></label>
          <label><Label className="mb-2">Steps</Label><textarea name="pasos" required rows={4} className="w-full border-0 border-b border-cds-borderStrong bg-cds-field p-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus" placeholder="One step per line" /></label>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Parameters</h4>
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="mt-2 grid gap-2 sm:grid-cols-[1fr_80px_90px]">
                <Input
                  name={`param_label_${idx}`}
                  placeholder={`Parameter ${idx}`}
                  value={paramLabels[idx] ?? ""}
                  onChange={(event) => setParamLabels((current) => ({ ...current, [idx]: event.target.value }))}
                />
                <Input name={`param_unidad_${idx}`} placeholder="ml" />
                <Input name={`param_default_${idx}`} type="text" inputMode="decimal" defaultValue={1} />
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Inputs</h4>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="mt-3 border border-cds-borderSubtle bg-cds-background p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_130px_100px]">
                  <label>
                    <Label className="mb-2">Reagent {idx}</Label>
                    <select name={`insumo_reactivo_${idx}`} className="h-10 w-full border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus">
                      <option value="">Select reagent</option>
                      {reactivos.map((reactivo) => <option key={reactivo.id} value={reactivo.id}>{reactivo.nombre} ({reactivo.unidad})</option>)}
                    </select>
                  </label>
                  <label>
                    <Label className="mb-2">Calculation</Label>
                    <select
                      name={`insumo_modo_${idx}`}
                      className="h-10 w-full border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus"
                      value={inputModes[idx] ?? "fijo"}
                      onChange={(event) => setInputModes((current) => ({ ...current, [idx]: event.target.value }))}
                    >
                      <option value="fijo">Fixed</option>
                      <option value="proporcional">By parameter</option>
                    </select>
                  </label>
                  <label>
                    <Label className="mb-2">{(inputModes[idx] ?? "fijo") === "proporcional" ? "Factor" : "Quantity"}</Label>
                    <Input name={`insumo_cantidad_${idx}`} type="text" inputMode="decimal" placeholder="0" />
                  </label>
                </div>
                {(inputModes[idx] ?? "fijo") === "proporcional" ? (
                  <label className="mt-3 block">
                    <Label className="mb-2">Parameter</Label>
                    <select name={`insumo_parametro_${idx}`} className="h-10 w-full border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus">
                      {parametrosDisponibles.length ? (
                        parametrosDisponibles.map((label) => <option key={label} value={label}>{label}</option>)
                      ) : (
                        <option value="">Define a parameter first</option>
                      )}
                    </select>
                  </label>
                ) : null}
              </div>
            ))}
          </div>
          <Button type="submit" disabled={creando}><FileText size={18} aria-hidden="true" />{creando ? "Creating..." : "Create template"}</Button>
        </div>
      </form>

      <div className="space-y-3">
        <div className="border border-cds-borderSubtle bg-cds-layer01 p-4">
          <h3>Existing templates</h3>
          <p className="mt-1 text-sm text-cds-textSecondary">Activate or deactivate editable protocol templates.</p>
        </div>
        {loading ? <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Loading templates...</div> : null}
        {!loading && !plantillas.length ? <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No editable templates yet.</div> : null}
        {plantillas.map((plantilla) => (
          <article key={plantilla.id} className="border border-cds-borderSubtle bg-cds-layer01 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3>{plantilla.nombre}</h3>
                <p className="mt-1 text-sm text-cds-textSecondary">{plantilla.categoria ?? "Template"} · {plantilla.version ?? "v1"} · {plantilla.activo ? "Active" : "Inactive"}</p>
              </div>
              {plantilla.plantilla_id ? (
                <Button type="button" variant={plantilla.activo ? "danger" : "secondary"} size="compact" onClick={() => onCambiar(plantilla.plantilla_id!, !plantilla.activo)}>
                  {plantilla.activo ? "Deactivate" : "Activate"}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
