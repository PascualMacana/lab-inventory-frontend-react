import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RotateCcw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
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
      setMensaje(t("consumo.msgCorresponde", { codigo: lote.codigo_interno, nombre: lote.reactivo_nombre }))
      return
    }
    if (lote.cantidad_actual <= 0) {
      throw new Error(t("consumo.msgVacio", { codigo: lote.codigo_interno }))
    }
    setLoteElegido(lote)
    setMensaje(t("consumo.msgConfirmado", { codigo: lote.codigo_interno }))
  }

  async function buscarCodigoLote(codigo: string) {
    if (!reactivo) {
      return
    }
    const codigoLimpio = codigo.trim()
    if (!codigoLimpio) {
      setErrorLocal(t("consumo.errCodigoVacio"))
      return
    }
    setErrorLocal(null)
    setMensaje(null)
    try {
      const lote = await buscarLoteMutation.mutateAsync(codigoLimpio)
      aplicarLoteEncontrado(lote)
    } catch (error) {
      setLoteElegido(null)
      setErrorLocal(mutationError(error, t("consumo.errBuscar")))
    }
  }

  async function handleBuscarLote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await buscarCodigoLote(codigoManual)
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
        t("consumo.errCantidad"),
      )
      if (cantidadParseada <= 0) {
        throw new Error(t("consumo.errCantidadMayorCero"))
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
        setMensaje(t("consumo.msgConsumo", { cantidad: formatNumber(mov.cantidad), unidad: resultado.unidad, codigo: mov.codigo_interno }))
      } else {
        const detalle = resultado.movimientos
          .map((mov) => t("consumo.detalleItem", { cantidad: formatNumber(mov.cantidad), unidad: resultado.unidad, codigo: mov.codigo_interno }))
          .join(" · ")
        setMensaje(t("consumo.msgDistribuido", { n: resultado.movimientos.length, detalle }))
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
      setErrorLocal(mutationError(error, t("consumo.errConsumo")))
    }
  }

  if (!reactivos.length && !reactivosQuery.isLoading) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("consumo.sinReactivos")}</div>
  }

  return (
    <section>
      <div className="mb-8">
        <h1>{t("consumo.title")}</h1>
        <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          {t("consumo.desc")}
        </p>
      </div>

      <div className="mb-6 bg-cds-layer01 p-4">
        <Label className="mb-2" htmlFor="reactivo_consumo">{t("consumo.fReactivo")}</Label>
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
          {t("consumo.stockBajo", { total: formatNumber(stockTotal), unidad: reactivo.unidad, minimo: formatNumber(reactivo.stock_minimo) })}
        </div>
      ) : null}

      {mensaje ? (
        <div className="mb-4 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      {!loteActivo ? (
        <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("consumo.sinStock")}</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="bg-cds-layer01 p-4">
            <h2 className="text-[24px] leading-[1.33]">
              {modo === "scan" ? t("consumo.loteElegido") : t("consumo.loteFifo")}
            </h2>
            <div className="mt-5 grid gap-px bg-cds-borderSubtle md:grid-cols-2">
              <Metric label={t("consumo.mCodigo")} value={loteActivo.codigo_interno} mono />
              <Metric label={t("consumo.mDisponible")} value={`${formatNumber(loteActivo.cantidad_actual)} ${loteActivo.unidad}`} />
              <Metric label={t("consumo.mVencimiento")} value={loteActivo.fecha_vencimiento} />
              <Metric label={t("consumo.mUbicacion")} value={loteActivo.ubicacion || "-"} />
            </div>
            <p className="mt-4 text-sm text-cds-textSecondary">
              {t("consumo.totalReactivo", { total: formatNumber(stockTotal), unidad: reactivo?.unidad, n: lotes.length })}
            </p>
            {otrosLotes.length ? (
              <div className="mt-5 border-t border-cds-borderSubtle pt-4">
                <h3 className="text-base leading-6">{t("consumo.otrosLotes")}</h3>
                <div className="mt-3 divide-y divide-cds-borderSubtle border border-cds-borderSubtle">
                  {otrosLotes.map((lote) => (
                    <div
                      key={lote.id}
                      className="grid gap-3 bg-cds-background p-3 text-sm md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]"
                    >
                      <div>
                        <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("consumo.mCodigo")}</div>
                        <div className="mt-1 break-all font-mono text-cds-textPrimary">{lote.codigo_interno}</div>
                      </div>
                      <div>
                        <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("consumo.mDisponible")}</div>
                        <div className="mt-1 text-cds-textPrimary">
                          {formatNumber(lote.cantidad_actual)} {lote.unidad}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{t("consumo.mVencimiento")}</div>
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
                  {t("consumo.scanInfo")}
                </div>
                <Button className="mt-5" type="button" variant="ghost" onClick={() => setLoteElegido(null)}>
                  <RotateCcw size={18} aria-hidden="true" />
                  {t("consumo.volverFifo")}
                </Button>
              </>
            ) : null}
          </section>

          <aside className="space-y-6">
            <form className="bg-cds-layer01 p-4" onSubmit={handleBuscarLote}>
              <h3 className="mb-4">{t("consumo.usarOtroLote")}</h3>
              <Label className="mb-2" htmlFor="codigo_lote_consumo">{t("consumo.fCodigo")}</Label>
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
                  {buscarLoteMutation.isPending ? t("consumo.buscando") : t("consumo.buscarLote")}
                </Button>
              </div>
            </form>

            <form className="bg-cds-layer01 p-4" onSubmit={handleConsumir}>
              <h3 className="mb-4">{t("consumo.registrarConsumo")}</h3>
              <div className="space-y-5">
                <label className="block">
                  <Label className="mb-2" htmlFor="cantidad_consumo">{t("consumo.fCantidad")}</Label>
                  <Input
                    id="cantidad_consumo"
                    value={cantidad}
                    onChange={(event) => setCantidad(event.target.value)}
                    inputMode="decimal"
                    required
                  />
                </label>
                <label className="block">
                  <Label className="mb-2" htmlFor="unidad_consumo">{t("consumo.fUnidad")}</Label>
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
                  <Label className="mb-2" htmlFor="motivo_consumo">{t("consumo.fMotivo")}</Label>
                  <Input
                    id="motivo_consumo"
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    placeholder={t("consumo.fMotivoPh")}
                  />
                </label>
              </div>
              <p className="mt-4 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
                {t("consumo.modoLabel", { modo: modo === "scan" ? t("consumo.modoScan") : t("consumo.modoFifo") })}
              </p>
              <Button className="mt-5" type="submit" disabled={consumirMutation.isPending}>
                {consumirMutation.isPending ? t("consumo.registrando") : t("consumo.registrarConsumo")}
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
