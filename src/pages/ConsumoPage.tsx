import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera, RotateCcw, Search } from "lucide-react"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type Lote, type Reactivo } from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber, requireFiniteNumber } from "../lib/forms"

const reactivosVacios: Reactivo[] = []
const lotesVacios: Lote[] = []

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function ConsumoPage() {
  const { token, usuario } = useAuth()
  const queryClient = useQueryClient()
  const [reactivoId, setReactivoId] = useState<number | null>(null)
  const [loteElegido, setLoteElegido] = useState<Lote | null>(null)
  const [codigoManual, setCodigoManual] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [unidadIngreso, setUnidadIngreso] = useState("")
  const [motivo, setMotivo] = useState("")
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })

  const reactivos = reactivosQuery.data ?? reactivosVacios
  const reactivo = useMemo(() => {
    if (!reactivos.length) {
      return null
    }
    if (!reactivoId) {
      return reactivos[0]
    }
    return reactivos.find((item) => item.id === reactivoId) ?? reactivos[0]
  }, [reactivoId, reactivos])

  const lotesQuery = useQuery({
    queryKey: ["lotes", reactivo?.id],
    queryFn: () => api.lotesPorReactivo(token!, reactivo!.id),
    enabled: Boolean(token && reactivo?.id),
  })

  const lotes = lotesQuery.data ?? lotesVacios
  const loteActivo = useMemo(() => {
    if (loteElegido) {
      return lotes.find((lote) => lote.id === loteElegido.id) ?? loteElegido
    }
    return lotes[0] ?? null
  }, [loteElegido, lotes])
  const modo = loteElegido ? "scan" : "fifo"
  const stockTotal = lotes.reduce((total, lote) => total + (lote.cantidad_actual ?? 0), 0)
  const otrosLotes = modo === "fifo" ? lotes.slice(1) : []

  const unidadesQuery = useQuery({
    queryKey: ["unidades-compatibles", reactivo?.unidad],
    queryFn: () => api.unidadesCompatibles(token!, reactivo!.unidad),
    enabled: Boolean(token && reactivo?.unidad),
  })

  const buscarLoteMutation = useMutation({
    mutationFn: (codigo: string) => api.lotePorCodigo(token!, codigo),
  })
  const decodificarQrMutation = useMutation({
    mutationFn: (file: File) => api.decodificarQrLote(token!, file),
  })

  const consumirMutation = useMutation({
    mutationFn: (payload: {
      reactivo_id: number
      usuario_id: number
      cantidad: number
      unidad_ingreso: string
      motivo?: string | null
      lote_id?: number | null
    }) => api.consumirReactivo(token!, payload),
  })

  function cambiarReactivo(id: number) {
    setReactivoId(id)
    setLoteElegido(null)
    setCodigoManual("")
    setCantidad("")
    setMotivo("")
    setMensaje(null)
    setErrorLocal(null)
    const elegido = reactivos.find((item) => item.id === id)
    setUnidadIngreso(elegido?.unidad ?? "")
  }

  function aplicarLoteEncontrado(lote: Lote) {
    if (!reactivo) {
      return
    }
    if (lote.reactivo_id !== reactivo.id) {
      setReactivoId(lote.reactivo_id)
      setUnidadIngreso(lote.unidad)
      setLoteElegido(lote)
      setMensaje(`Lote ${lote.codigo_interno} corresponde a ${lote.reactivo_nombre}. Cambié el selector a ese reactivo.`)
      return
    }
    if (lote.cantidad_actual <= 0) {
      throw new Error(`El lote ${lote.codigo_interno} está vacío.`)
    }
    setLoteElegido(lote)
    setMensaje(`Lote ${lote.codigo_interno} confirmado.`)
  }

  async function buscarCodigoLote(codigo: string) {
    if (!reactivo) {
      return
    }
    const codigoLimpio = codigo.trim()
    if (!codigoLimpio) {
      setErrorLocal("Ingresá un código interno.")
      return
    }
    setErrorLocal(null)
    setMensaje(null)
    try {
      const lote = await buscarLoteMutation.mutateAsync(codigoLimpio)
      aplicarLoteEncontrado(lote)
    } catch (error) {
      setLoteElegido(null)
      setErrorLocal(mutationError(error, "No se pudo buscar el lote"))
    }
  }

  async function handleBuscarLote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await buscarCodigoLote(codigoManual)
  }

  async function handleQrFile(file: File | null) {
    if (!file) {
      return
    }
    setErrorLocal(null)
    setMensaje(null)
    try {
      const resultado = await decodificarQrMutation.mutateAsync(file)
      setCodigoManual(resultado.codigo_interno)
      await buscarCodigoLote(resultado.codigo_interno)
    } catch (error) {
      setLoteElegido(null)
      setErrorLocal(mutationError(error, "No se pudo leer el QR"))
    }
  }

  async function handleConsumir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reactivo || !usuario || !loteActivo) {
      return
    }
    setErrorLocal(null)
    setMensaje(null)
    try {
      const cantidadParseada = requireFiniteNumber(
        parseFormNumber(cantidad),
        "Cantidad debe ser un número válido.",
      )
      if (cantidadParseada <= 0) {
        throw new Error("La cantidad debe ser mayor a 0.")
      }
      const resultado = await consumirMutation.mutateAsync({
        reactivo_id: reactivo.id,
        usuario_id: usuario.id,
        cantidad: cantidadParseada,
        unidad_ingreso: unidadIngreso || reactivo.unidad,
        motivo: motivo.trim() || null,
        lote_id: modo === "scan" ? loteActivo.id : null,
      })
      if (resultado.movimientos.length === 1) {
        const mov = resultado.movimientos[0]
        setMensaje(`Consumo registrado: ${formatNumber(mov.cantidad)} ${resultado.unidad} de ${mov.codigo_interno}.`)
      } else {
        const detalle = resultado.movimientos
          .map((mov) => `${formatNumber(mov.cantidad)} ${resultado.unidad} de ${mov.codigo_interno}`)
          .join(" · ")
        setMensaje(`Consumo distribuido en ${resultado.movimientos.length} lotes: ${detalle}.`)
      }
      setLoteElegido(null)
      setCodigoManual("")
      setCantidad("")
      setMotivo("")
      await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
      await queryClient.invalidateQueries({ queryKey: ["lotes", reactivo.id] })
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      await queryClient.invalidateQueries({ queryKey: ["dashboard-series", 30] })
      await queryClient.invalidateQueries({ queryKey: ["movimientos"] })
    } catch (error) {
      setErrorLocal(mutationError(error, "No se pudo registrar el consumo"))
    }
  }

  if (!reactivos.length && !reactivosQuery.isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">No hay reactivos disponibles.</div>
  }

  return (
    <section>
      <div className="mb-8">
        <h1>Consumo</h1>
        <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          FIFO automático por defecto. También podés fijar un lote por código interno.
        </p>
      </div>

      <div className="mb-6 bg-cds-layer01 p-4">
        <Label className="mb-2" htmlFor="reactivo_consumo">Reactivo *</Label>
        <select
          id="reactivo_consumo"
          className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
          value={reactivo?.id ?? ""}
          onChange={(event) => cambiarReactivo(Number(event.target.value))}
        >
          {reactivos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} | stock: {formatNumber(item.stock_total)} {item.unidad}
            </option>
          ))}
        </select>
      </div>

      {reactivo && stockTotal < reactivo.stock_minimo ? (
        <div className="mb-4 border-l-4 border-cds-supportWarning bg-cds-layer01 px-4 py-3 text-sm">
          Stock total ({formatNumber(stockTotal)} {reactivo.unidad}) por debajo del mínimo ({formatNumber(reactivo.stock_minimo)} {reactivo.unidad}).
        </div>
      ) : null}

      {mensaje ? (
        <div className="mb-4 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      {!loteActivo ? (
        <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Este reactivo no tiene stock disponible.</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="bg-cds-layer01 p-4">
            <h2 className="text-[24px] leading-[1.33]">
              {modo === "scan" ? "Lote elegido" : "Lote sugerido FIFO"}
            </h2>
            <div className="mt-5 grid gap-px bg-cds-borderSubtle md:grid-cols-2">
              <Metric label="Código" value={loteActivo.codigo_interno} mono />
              <Metric label="Disponible" value={`${formatNumber(loteActivo.cantidad_actual)} ${loteActivo.unidad}`} />
              <Metric label="Vencimiento" value={loteActivo.fecha_vencimiento} />
              <Metric label="Ubicación" value={loteActivo.ubicacion || "-"} />
            </div>
            <p className="mt-4 text-sm text-cds-textSecondary">
              Total del reactivo: {formatNumber(stockTotal)} {reactivo?.unidad} en {lotes.length} lote(s).
            </p>
            {otrosLotes.length ? (
              <div className="mt-5 border-t border-cds-borderSubtle pt-4">
                <h3 className="text-base leading-6">Otros lotes disponibles</h3>
                <div className="mt-3 divide-y divide-cds-borderSubtle border border-cds-borderSubtle">
                  {otrosLotes.map((lote) => (
                    <div
                      key={lote.id}
                      className="grid gap-3 bg-cds-background p-3 text-sm md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]"
                    >
                      <div>
                        <div className="text-xs tracking-[0.32px] text-cds-textSecondary">Código</div>
                        <div className="mt-1 break-all font-mono text-cds-textPrimary">{lote.codigo_interno}</div>
                      </div>
                      <div>
                        <div className="text-xs tracking-[0.32px] text-cds-textSecondary">Disponible</div>
                        <div className="mt-1 text-cds-textPrimary">
                          {formatNumber(lote.cantidad_actual)} {lote.unidad}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs tracking-[0.32px] text-cds-textSecondary">Vencimiento</div>
                        <div className="mt-1 text-cds-textPrimary">{lote.fecha_vencimiento}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {modo === "scan" ? (
              <>
                <div className="mt-4 border-l-4 border-cds-supportInfo bg-cds-background px-4 py-3 text-sm">
                  Este modo descuenta solo del frasco elegido. Si querés cascada multi-lote, volvé al FIFO.
                </div>
                <Button className="mt-5" type="button" variant="ghost" onClick={() => setLoteElegido(null)}>
                  <RotateCcw size={18} aria-hidden="true" />
                  Volver al FIFO
                </Button>
              </>
            ) : null}
          </section>

          <aside className="space-y-6">
            <form className="bg-cds-layer01 p-4" onSubmit={handleBuscarLote}>
              <h3 className="mb-4">Usar otro lote</h3>
              <Label className="mb-2" htmlFor="codigo_lote_consumo">Código interno</Label>
              <Input
                id="codigo_lote_consumo"
                className="font-mono"
                value={codigoManual}
                onChange={(event) => setCodigoManual(event.target.value)}
                placeholder="LAB-2026-00042"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={buscarLoteMutation.isPending}>
                  <Search size={18} aria-hidden="true" />
                  {buscarLoteMutation.isPending ? "Buscando..." : "Buscar lote"}
                </Button>
                <input
                  id="foto_qr_consumo"
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(event) => {
                    void handleQrFile(event.target.files?.[0] ?? null)
                    event.currentTarget.value = ""
                  }}
                />
                <label
                  htmlFor="foto_qr_consumo"
                  className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 border border-cds-borderStrong bg-cds-layer02 px-4 text-sm tracking-[0.16px] text-cds-textPrimary transition-colors hover:bg-cds-borderSubtle"
                >
                  <Camera size={18} aria-hidden="true" />
                  {decodificarQrMutation.isPending ? "Leyendo..." : "Escanear QR"}
                </label>
              </div>
            </form>

            <form className="bg-cds-layer01 p-4" onSubmit={handleConsumir}>
              <h3 className="mb-4">Registrar consumo</h3>
              <div className="space-y-5">
                <label className="block">
                  <Label className="mb-2" htmlFor="cantidad_consumo">Cantidad *</Label>
                  <Input
                    id="cantidad_consumo"
                    value={cantidad}
                    onChange={(event) => setCantidad(event.target.value)}
                    inputMode="decimal"
                    required
                  />
                </label>
                <label className="block">
                  <Label className="mb-2" htmlFor="unidad_consumo">Unidad *</Label>
                  <select
                    id="unidad_consumo"
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                    value={unidadIngreso || reactivo?.unidad || ""}
                    onChange={(event) => setUnidadIngreso(event.target.value)}
                  >
                    {(unidadesQuery.data?.unidades ?? (reactivo ? [reactivo.unidad] : [])).map((unidad) => (
                      <option key={unidad} value={unidad}>
                        {unidad}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <Label className="mb-2" htmlFor="motivo_consumo">Motivo / muestra</Label>
                  <Input
                    id="motivo_consumo"
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    placeholder="Ej: Análisis muestra A-245"
                  />
                </label>
              </div>
              <p className="mt-4 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
                Modo: {modo === "scan" ? "lote elegido, sin overflow" : "FIFO automático con cascada multi-lote si hace falta"}.
              </p>
              <Button className="mt-5" type="submit" disabled={consumirMutation.isPending}>
                {consumirMutation.isPending ? "Registrando..." : "Registrar consumo"}
              </Button>
            </form>
          </aside>
        </div>
      )}
    </section>
  )
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-cds-layer01 p-4">
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div className={mono ? "mt-2 font-mono text-sm tracking-[0.16px]" : "mt-2 text-sm tracking-[0.16px]"}>{value}</div>
    </div>
  )
}
