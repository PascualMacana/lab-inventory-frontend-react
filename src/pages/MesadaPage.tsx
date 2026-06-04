import { FormEvent, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera, ScanLine, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type Lote } from "../lib/api"
import { useAuth } from "../lib/auth"
import { parseFormNumber, requireFiniteNumber } from "../lib/forms"

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value ?? 0)
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function MesadaPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [codigo, setCodigo] = useState("")
  const [lote, setLote] = useState<Lote | null>(null)
  const [cantidad, setCantidad] = useState("")
  const [unidadIngreso, setUnidadIngreso] = useState("")
  const [motivo, setMotivo] = useState("")
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const buscarMutation = useMutation({
    mutationFn: (codigoInterno: string) => api.lotePorCodigo(token!, codigoInterno),
    onSuccess: (loteEncontrado) => {
      setLote(loteEncontrado)
      setUnidadIngreso(loteEncontrado.unidad)
      setCantidad("")
      setMotivo("")
      setMensaje(
        loteEncontrado.cantidad_actual > 0
          ? t("mesada.msgListo", { codigo: loteEncontrado.codigo_interno })
          : t("mesada.msgVacio", { codigo: loteEncontrado.codigo_interno }),
      )
      setErrorLocal(null)
    },
    onError: (error) => {
      setLote(null)
      setMensaje(null)
      setErrorLocal(mutationError(error, t("mesada.errBuscar")))
    },
  })
  const decodificarQrMutation = useMutation({
    mutationFn: (file: File) => api.decodificarQrLote(token!, file),
  })

  const unidadesQuery = useQuery({
    queryKey: ["unidades-compatibles", lote?.unidad],
    queryFn: () => api.unidadesCompatibles(token!, lote!.unidad),
    enabled: Boolean(token && lote?.unidad),
  })

  const consumirMutation = useMutation({
    mutationFn: (payload: {
      reactivo_id: number
      usuario_id: number
      cantidad: number
      unidad_ingreso: string
      motivo?: string | null
      lote_id: number
    }) => api.consumirReactivo(token!, payload),
  })

  async function handleBuscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await buscarCodigo(codigo)
  }

  async function buscarCodigo(codigoInterno: string) {
    const codigoLimpio = codigoInterno.trim()
    if (!codigoLimpio) {
      setErrorLocal(t("mesada.errCodigoVacio"))
      return
    }
    await buscarMutation.mutateAsync(codigoLimpio)
  }

  async function handleQrFile(file: File | null) {
    if (!file) {
      return
    }
    setErrorLocal(null)
    setMensaje(null)
    try {
      const resultado = await decodificarQrMutation.mutateAsync(file)
      setCodigo(resultado.codigo_interno)
      await buscarMutation.mutateAsync(resultado.codigo_interno)
    } catch (error) {
      setLote(null)
      setMensaje(null)
      setErrorLocal(mutationError(error, t("mesada.errQr")))
    }
  }

  async function handleConsumir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lote || !usuario) {
      return
    }
    setErrorLocal(null)
    setMensaje(null)
    try {
      const cantidadParseada = requireFiniteNumber(
        parseFormNumber(cantidad),
        t("mesada.errCantidad"),
      )
      if (cantidadParseada <= 0) {
        throw new Error(t("mesada.errCantidadMayorCero"))
      }
      const resultado = await consumirMutation.mutateAsync({
        reactivo_id: lote.reactivo_id,
        usuario_id: usuario.id,
        cantidad: cantidadParseada,
        unidad_ingreso: unidadIngreso || lote.unidad,
        motivo: motivo.trim() || null,
        lote_id: lote.id,
      })
      const movimiento = resultado.movimientos[0]
      setMensaje(t("mesada.msgConsumo", { cantidad: formatNumber(movimiento.cantidad), unidad: resultado.unidad, codigo: movimiento.codigo_interno }))
      setLote(null)
      setCodigo("")
      setCantidad("")
      setMotivo("")
      await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
      await queryClient.invalidateQueries({ queryKey: ["lotes", lote.reactivo_id] })
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      await queryClient.invalidateQueries({ queryKey: ["dashboard-series", 30] })
      await queryClient.invalidateQueries({ queryKey: ["movimientos"] })
    } catch (error) {
      setErrorLocal(mutationError(error, t("mesada.errConsumo")))
    }
  }

  function limpiar() {
    setLote(null)
    setCodigo("")
    setCantidad("")
    setMotivo("")
    setMensaje(null)
    setErrorLocal(null)
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1>{t("mesada.title")}</h1>
        <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          {t("mesada.desc")}
        </p>
      </div>

      <form className="bg-cds-layer01 p-4" onSubmit={handleBuscar}>
        <Label className="mb-2" htmlFor="codigo_interno">{t("mesada.fCodigo")}</Label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <ScanLine
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary"
              size={18}
              aria-hidden="true"
            />
            <Input
              id="codigo_interno"
              className="pl-12 font-mono"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              placeholder="LAB-2026-00042"
            />
          </div>
          <Button type="submit" disabled={buscarMutation.isPending}>
            <Search size={18} aria-hidden="true" />
            {buscarMutation.isPending ? t("mesada.buscando") : t("common.buscar")}
          </Button>
          <input
            id="foto_qr_mesada"
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
            htmlFor="foto_qr_mesada"
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 border border-cds-borderStrong bg-cds-layer02 px-4 text-sm tracking-[0.16px] text-cds-textPrimary transition-colors hover:bg-cds-borderSubtle"
          >
            <Camera size={18} aria-hidden="true" />
            {decodificarQrMutation.isPending ? t("mesada.leyendo") : t("mesada.escanearQr")}
          </label>
        </div>
      </form>

      {mensaje ? (
        <div className="mt-4 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mt-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      {lote ? (
        <div className="mt-6 bg-cds-layer01 p-4">
          <h2 className="text-[24px] leading-[1.33]">{lote.reactivo_nombre}</h2>
          <div className="mt-5 grid gap-px bg-cds-borderSubtle sm:grid-cols-2">
            <Metric label={t("mesada.mLote")} value={lote.codigo_interno} mono />
            <Metric label={t("mesada.mStock")} value={`${formatNumber(lote.cantidad_actual)} ${lote.unidad}`} />
            <Metric label={t("mesada.mVencimiento")} value={lote.fecha_vencimiento} />
            <Metric label={t("mesada.mUbicacion")} value={lote.ubicacion || "-"} />
          </div>

          {lote.cantidad_actual > 0 ? (
            <form className="mt-6" onSubmit={handleConsumir}>
              <h3 className="mb-5">{t("mesada.registrarConsumo")}</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <Label className="mb-2" htmlFor="cantidad_consumida">{t("mesada.fCantidad")}</Label>
                  <Input
                    id="cantidad_consumida"
                    value={cantidad}
                    onChange={(event) => setCantidad(event.target.value)}
                    inputMode="decimal"
                    required
                  />
                </label>
                <label className="block">
                  <Label className="mb-2" htmlFor="unidad_consumo">{t("mesada.fUnidad")}</Label>
                  <select
                    id="unidad_consumo"
                    className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                    value={unidadIngreso || lote.unidad}
                    onChange={(event) => setUnidadIngreso(event.target.value)}
                  >
                    {(unidadesQuery.data?.unidades ?? [lote.unidad]).map((unidad) => (
                      <option key={unidad} value={unidad}>
                        {unidad}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <Label className="mb-2" htmlFor="motivo">{t("mesada.fMotivo")}</Label>
                  <Input
                    id="motivo"
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    placeholder={t("mesada.fMotivoPh")}
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={consumirMutation.isPending}>
                  {consumirMutation.isPending ? t("mesada.registrando") : t("mesada.registrarConsumo")}
                </Button>
                <Button type="button" variant="ghost" onClick={limpiar}>
                  <Trash2 size={18} aria-hidden="true" />
                  {t("mesada.limpiarLote")}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
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
