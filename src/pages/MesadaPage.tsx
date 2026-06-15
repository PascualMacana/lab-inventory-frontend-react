import { FormEvent, useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser"
import { ScanLine, Search, Square, Trash2 } from "lucide-react"
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

function extraerCodigoInterno(valor: string) {
  const normalizado = valor.trim().toUpperCase()
  const match = normalizado.match(/\b(?:CFP-\d{4}-\d{4}|LAB-\d{4}-\d{5})\b/)
  return match?.[0] ?? null
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

  async function handleQrEnVivo(valor: string) {
    const codigoInterno = extraerCodigoInterno(valor)
    if (!codigoInterno) {
      setLote(null)
      setMensaje(null)
      setErrorLocal(t("mesada.errQrFormato"))
      return
    }
    setCodigo(codigoInterno)
    await buscarMutation.mutateAsync(codigoInterno)
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
        <QrLiveScanner
          onDetect={(valor) => {
            void handleQrEnVivo(valor)
          }}
          labels={{
            title: t("mesada.scannerTitle"),
            idle: t("mesada.scannerIdle"),
            active: t("mesada.scannerActive"),
            start: t("mesada.scannerStart"),
            stop: t("mesada.scannerStop"),
            detected: t("mesada.scannerDetected"),
            noCamera: t("mesada.scannerNoCamera"),
            cameraError: t("mesada.scannerCameraError"),
          }}
        />
        <Label className="mb-2" htmlFor="codigo_interno">{t("mesada.fCodigo")}</Label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
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

function QrLiveScanner({
  onDetect,
  labels,
}: {
  onDetect: (value: string) => void
  labels: {
    title: string
    idle: string
    active: string
    start: string
    stop: string
    detected: string
    noCamera: string
    cameraError: string
  }
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const lastValueRef = useRef<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState(labels.idle)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
      readerRef.current = null
    }
  }, [])

  async function startScanner() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(labels.noCamera)
      return
    }
    if (!videoRef.current || scanning) {
      return
    }

    setCameraError(null)
    setStatus(labels.active)
    setScanning(true)
    lastValueRef.current = null

    try {
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 250,
      })
      readerRef.current = reader
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _error, controls) => {
        if (!result) {
          return
        }
        const value = result.getText().trim()
        if (!value || value === lastValueRef.current) {
          return
        }
        lastValueRef.current = value
        setStatus(labels.detected)
        if ("vibrate" in navigator) {
          navigator.vibrate(80)
        }
        controls.stop()
        controlsRef.current = null
        setScanning(false)
        onDetect(value)
      })
    } catch (error) {
      controlsRef.current?.stop()
      controlsRef.current = null
      setScanning(false)
      setStatus(labels.idle)
      setCameraError(error instanceof Error ? error.message : labels.cameraError)
    }
  }

  function stopScanner() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
    setStatus(labels.idle)
  }

  return (
    <div className="mb-5 border border-cds-borderSubtle bg-cds-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-cds-textPrimary">{labels.title}</div>
          <div className="mt-1 text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">{status}</div>
        </div>
        <Button type="button" variant={scanning ? "secondary" : "primary"} onClick={scanning ? stopScanner : startScanner}>
          {scanning ? <Square size={18} aria-hidden="true" /> : <ScanLine size={18} aria-hidden="true" />}
          {scanning ? labels.stop : labels.start}
        </Button>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-36 w-36 border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
        </div>
      </div>
      {cameraError ? (
        <div className="mt-3 border-l-4 border-cds-supportError bg-cds-layer01 px-3 py-2 text-xs leading-4">
          {cameraError}
        </div>
      ) : null}
    </div>
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
