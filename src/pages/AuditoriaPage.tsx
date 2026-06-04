import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Download, FileText, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api, type AuditoriaEvento, type AuditoriaLote, type AuditoriaReactivo, type Reactivo } from "../lib/api"
import { useAuth } from "../lib/auth"
import { cn } from "../lib/utils"

type Modo = "lote" | "reactivo"

const reactivosVacios: Reactivo[] = []

function isoDatePlusDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(value ?? 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const date = new Date(`${String(value).split(" ")[0]}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat("es-AR").format(date)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const date = new Date(`${normalized}Z`)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function estadoVencimiento(estado: string, dias: number | null | undefined, t: TFunction) {
  if (estado === "vencido") {
    return dias === null || dias === undefined ? t("audit.vencido") : t("audit.vencidoHace", { n: Math.abs(dias) })
  }
  if (estado === "por_vencer") {
    return dias === null || dias === undefined ? t("audit.porVencer") : t("audit.venceEn", { n: dias })
  }
  if (estado === "vigente") {
    return dias === null || dias === undefined ? t("audit.vigente") : t("audit.vigenteDias", { n: dias })
  }
  if (estado === "agotado") {
    return t("audit.agotado")
  }
  return t("audit.sinFecha")
}

function estadoClass(estado: string) {
  if (estado === "vencido") {
    return "text-cds-supportError"
  }
  if (estado === "por_vencer") {
    return "text-cds-supportWarning"
  }
  if (estado === "vigente") {
    return "text-cds-supportSuccess"
  }
  return "text-cds-textSecondary"
}

function tipoClass(tipo: AuditoriaEvento["tipo"]) {
  if (tipo === "entrada") {
    return "text-cds-supportSuccess"
  }
  if (tipo === "salida") {
    return "text-cds-supportError"
  }
  return "text-cds-supportInfo"
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

function downloadCsv(rows: Array<Record<string, unknown>>, filename: string) {
  if (!rows.length) {
    return
  }
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n")
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename)
}

export function AuditoriaPage() {
  const { token } = useAuth()
  const { t } = useTranslation()
  const [modo, setModo] = useState<Modo>("lote")
  const [codigo, setCodigo] = useState("")
  const [codigoBuscado, setCodigoBuscado] = useState("")
  const [reactivoId, setReactivoId] = useState<number | null>(null)
  const [desde, setDesde] = useState(isoDatePlusDays(-90))
  const [hasta, setHasta] = useState(isoDatePlusDays(0))
  const [reactivoParams, setReactivoParams] = useState<{ id: number; desde: string; hasta: string } | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })
  const reactivos = reactivosQuery.data ?? reactivosVacios
  const reactivoSeleccionado = useMemo(() => {
    if (!reactivos.length) {
      return null
    }
    if (!reactivoId) {
      return reactivos[0]
    }
    return reactivos.find((item) => item.id === reactivoId) ?? reactivos[0]
  }, [reactivoId, reactivos])

  const loteQuery = useQuery({
    queryKey: ["auditoria-lote", codigoBuscado],
    queryFn: () => api.auditoriaLote(token!, codigoBuscado),
    enabled: Boolean(token && codigoBuscado && modo === "lote"),
  })

  const reactivoQuery = useQuery({
    queryKey: ["auditoria-reactivo", reactivoParams],
    queryFn: () => api.auditoriaReactivo(token!, reactivoParams!.id, reactivoParams!.desde, reactivoParams!.hasta),
    enabled: Boolean(token && reactivoParams && modo === "reactivo"),
  })

  function buscarLote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorLocal(null)
    const limpio = codigo.trim()
    if (!limpio) {
      setErrorLocal(t("audit.errCodigo"))
      return
    }
    setCodigoBuscado(limpio)
  }

  function buscarReactivo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorLocal(null)
    const reactivo = reactivoSeleccionado
    if (!reactivo) {
      setErrorLocal(t("audit.errReactivo"))
      return
    }
    setReactivoParams({ id: reactivo.id, desde, hasta })
  }

  return (
    <section>
      <div className="mb-8">
        <h1>{t("audit.title")}</h1>
        <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          {t("audit.desc")}
        </p>
      </div>

      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      <div className="mb-6 flex gap-px border-b border-cds-borderSubtle">
        <TabButton active={modo === "lote"} onClick={() => setModo("lote")}>
          {t("audit.tabLote")}
        </TabButton>
        <TabButton active={modo === "reactivo"} onClick={() => setModo("reactivo")}>
          {t("audit.tabReactivo")}
        </TabButton>
      </div>

      {modo === "lote" ? (
        <>
          <form className="mb-6 bg-cds-layer01 p-4" onSubmit={buscarLote}>
            <Label className="mb-2" htmlFor="codigo_auditoria">{t("audit.fCodigo")}</Label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input id="codigo_auditoria" className="font-mono" value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="LAB-2026-00042" />
              <Button type="submit" disabled={loteQuery.isFetching}>
                <Search size={18} aria-hidden="true" />
                {loteQuery.isFetching ? t("audit.buscando") : t("common.buscar")}
              </Button>
            </div>
          </form>

          {loteQuery.isError ? (
            <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
              {mutationError(loteQuery.error, t("audit.errLote"))}
            </div>
          ) : null}
          {loteQuery.data ? <AuditoriaLoteView token={token!} data={loteQuery.data} /> : null}
        </>
      ) : null}

      {modo === "reactivo" ? (
        <>
          <form className="mb-6 grid gap-4 bg-cds-layer01 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]" onSubmit={buscarReactivo}>
            <label className="block">
              <Label className="mb-2" htmlFor="reactivo_auditoria">{t("audit.fReactivo")}</Label>
              <select id="reactivo_auditoria" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none" value={reactivoSeleccionado?.id ?? ""} onChange={(event) => setReactivoId(Number(event.target.value))}>
                {reactivos.map((reactivo) => (
                  <option key={reactivo.id} value={reactivo.id}>
                    {reactivo.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Label className="mb-2" htmlFor="aud_desde">{t("audit.fDesde")}</Label>
              <Input id="aud_desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
            </label>
            <label className="block">
              <Label className="mb-2" htmlFor="aud_hasta">{t("audit.fHasta")}</Label>
              <Input id="aud_hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </label>
            <div className="flex items-end">
              <Button type="submit" disabled={reactivoQuery.isFetching || !reactivoSeleccionado}>
                <Search size={18} aria-hidden="true" />
                {reactivoQuery.isFetching ? t("audit.buscando") : t("common.buscar")}
              </Button>
            </div>
          </form>

          {reactivoQuery.isError ? (
            <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
              {mutationError(reactivoQuery.error, t("audit.errReactivoCarga"))}
            </div>
          ) : null}
          {reactivoQuery.data ? <AuditoriaReactivoView token={token!} data={reactivoQuery.data} desde={reactivoParams?.desde} hasta={reactivoParams?.hasta} /> : null}
        </>
      ) : null}
    </section>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 px-4 text-sm tracking-[0.16px] text-cds-textSecondary transition-colors hover:text-cds-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
        active && "text-cds-textPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
      )}
    >
      {children}
    </button>
  )
}

function AuditoriaLoteView({ token, data }: { token: string; data: AuditoriaLote }) {
  const { t } = useTranslation()
  const pdfMutation = useMutation({
    mutationFn: () => api.auditoriaLotePdf(token, data.lote.codigo_interno),
  })
  const lote = data.lote
  const resumen = data.resumen
  const unidad = lote.unidad

  async function descargarPdf() {
    const blob = await pdfMutation.mutateAsync()
    downloadBlob(blob, `auditoria_${lote.codigo_interno}.pdf`)
  }

  return (
    <div className="space-y-6">
      <section className="bg-cds-layer01 p-4">
        <h2 className="text-[24px] leading-[1.33]">{lote.reactivo_nombre}</h2>
        <p className="mt-2 font-mono text-sm">{lote.codigo_interno}</p>
        <div className="mt-5 grid gap-px bg-cds-borderSubtle md:grid-cols-4">
          <Metric label={t("audit.mSaldoActual")} value={`${formatNumber(lote.cantidad_actual)} ${unidad}`} />
          <Metric label={t("audit.mInicial")} value={`${formatNumber(lote.cantidad_inicial)} ${unidad}`} />
          <Metric label={t("audit.mConsumido")} value={`${formatNumber(resumen.porcentaje_consumido)}%`} />
          <Metric label={t("audit.mEventos")} value={String(resumen.total_eventos)} />
        </div>
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <Info label={t("audit.iProveedor")} value={lote.proveedor || "-"} />
          <Info label={t("audit.iVencimiento")} value={`${formatDate(lote.fecha_vencimiento)} · ${estadoVencimiento(resumen.estado_vencimiento, lote.dias_hasta_vencimiento, t)}`} />
          <Info label={t("audit.iUbicacion")} value={lote.ubicacion || "-"} />
          <Info label={t("audit.iCreadoPor")} value={lote.creado_por} />
        </div>
      </section>

      <section className="bg-cds-layer01 p-4">
        <h3 className="mb-4">{t("audit.resumen")}</h3>
        <div className="grid gap-px bg-cds-borderSubtle md:grid-cols-3">
          <Metric label={t("audit.mTotalConsumido")} value={`${formatNumber(resumen.total_consumido)} ${unidad}`} />
          <Metric label={t("audit.mEntradasExtra")} value={`${formatNumber(resumen.total_entradas_extra)} ${unidad}`} />
          <Metric label={t("audit.mAjustes")} value={String(resumen.cantidad_ajustes)} />
        </div>
        {resumen.consumos_por_usuario.length ? <ConsumosUsuario rows={resumen.consumos_por_usuario} unidad={unidad} /> : null}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={() => downloadCsv(eventosCsv(data.eventos, unidad, true, t), `auditoria_${lote.codigo_interno}.csv`)}>
            <Download size={18} aria-hidden="true" />
            {t("audit.descargarCsv")}
          </Button>
          <Button type="button" onClick={descargarPdf} disabled={pdfMutation.isPending}>
            <FileText size={18} aria-hidden="true" />
            {pdfMutation.isPending ? t("audit.generando") : t("audit.descargarPdf")}
          </Button>
        </div>
        <EventosTable eventos={data.eventos} unidad={unidad} mostrarSaldo />
      </section>
    </div>
  )
}

function AuditoriaReactivoView({ token, data, desde, hasta }: { token: string; data: AuditoriaReactivo; desde?: string; hasta?: string }) {
  const { t } = useTranslation()
  const pdfMutation = useMutation({
    mutationFn: () => api.auditoriaReactivoPdf(token, data.reactivo.id, desde, hasta),
  })
  const unidad = data.reactivo.unidad

  async function descargarPdf() {
    const blob = await pdfMutation.mutateAsync()
    downloadBlob(blob, `auditoria_${data.reactivo.nombre}_${desde ?? "inicio"}_${hasta ?? "hoy"}.pdf`)
  }

  return (
    <div className="space-y-6">
      <section className="bg-cds-layer01 p-4">
        <h2 className="text-[24px] leading-[1.33]">{data.reactivo.nombre}</h2>
        <p className="mt-2 text-sm text-cds-textSecondary">{t("audit.periodo", { desde: desde ?? t("audit.inicio"), hasta: hasta ?? t("audit.hoy") })}</p>
        <div className="mt-5 grid gap-px bg-cds-borderSubtle md:grid-cols-4">
          <Metric label={t("audit.mLotes")} value={`${data.resumen.total_lotes} / ${data.resumen.lotes_activos}`} />
          <Metric label={t("audit.mSaldoActual")} value={`${formatNumber(data.resumen.saldo_total_actual)} ${unidad}`} />
          <Metric label={t("audit.mConsumido")} value={`${formatNumber(data.resumen.total_consumido_periodo)} ${unidad}`} />
          <Metric label={t("audit.mEventos")} value={String(data.resumen.total_eventos_periodo)} />
        </div>
      </section>

      <section className="bg-cds-layer01 p-4">
        <h3 className="mb-4">{t("audit.lotesAsociados")}</h3>
        <LotesAuditoriaTable lotes={data.lotes} unidad={unidad} />
      </section>

      {(data.resumen.consumos_por_usuario.length || data.resumen.consumos_por_sector.length) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-cds-layer01 p-4">
            <h3 className="mb-4">{t("audit.consumosUsuario")}</h3>
            <ConsumosUsuario rows={data.resumen.consumos_por_usuario} unidad={unidad} />
          </div>
          <div className="bg-cds-layer01 p-4">
            <h3 className="mb-4">{t("audit.consumosSector")}</h3>
            <ConsumosSector rows={data.resumen.consumos_por_sector} unidad={unidad} />
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={() => downloadCsv(eventosCsv(data.eventos, unidad, false, t), `auditoria_${data.reactivo.nombre}_${desde ?? "inicio"}_${hasta ?? "hoy"}.csv`)}>
            <Download size={18} aria-hidden="true" />
            {t("audit.descargarCsv")}
          </Button>
          <Button type="button" onClick={descargarPdf} disabled={pdfMutation.isPending}>
            <FileText size={18} aria-hidden="true" />
            {pdfMutation.isPending ? t("audit.generando") : t("audit.descargarPdf")}
          </Button>
        </div>
        <EventosTable eventos={data.eventos} unidad={unidad} mostrarLote />
      </section>
    </div>
  )
}

function eventosCsv(eventos: AuditoriaEvento[], unidad: string, saldo: boolean, t: TFunction) {
  return eventos.map((evento) => ({
    [t("audit.csvFecha")]: formatDateTime(evento.fecha),
    [t("audit.csvTipo")]: t(`mov.${evento.tipo}`),
    [t("audit.csvLote")]: evento.lote_codigo_interno || "",
    [t("audit.csvCantidad")]: `${formatNumber(evento.cantidad)} ${unidad}`,
    [t("audit.csvSaldoDespues")]: saldo && evento.saldo_despues !== undefined ? `${formatNumber(evento.saldo_despues)} ${unidad}` : "",
    [t("audit.csvUsuario")]: evento.usuario,
    [t("audit.csvSector")]: evento.usuario_sector || "",
    [t("audit.csvMotivo")]: evento.motivo_auditoria || evento.motivo || "",
  }))
}

function EventosTable({ eventos, unidad, mostrarSaldo = false, mostrarLote = false }: { eventos: AuditoriaEvento[]; unidad: string; mostrarSaldo?: boolean; mostrarLote?: boolean }) {
  const { t } = useTranslation()
  if (!eventos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">{t("audit.sinEventos")}</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[1060px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("audit.thFecha")}</th>
            <th className="h-10 px-4 font-normal">{t("audit.thTipo")}</th>
            {mostrarLote ? <th className="h-10 px-4 font-normal">{t("audit.thLote")}</th> : null}
            <th className="h-10 px-4 text-right font-normal">{t("audit.thCantidad")}</th>
            {mostrarSaldo ? <th className="h-10 px-4 text-right font-normal">{t("audit.thSaldo")}</th> : null}
            <th className="h-10 px-4 font-normal">{t("audit.thUsuario")}</th>
            <th className="h-10 px-4 font-normal">{t("audit.thMotivo")}</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="border-b border-cds-borderSubtle hover:bg-cds-layer01">
              <td className="h-12 px-4 text-cds-textSecondary">{formatDateTime(evento.fecha)}</td>
              <td className={cn("h-12 px-4 font-medium", tipoClass(evento.tipo))}>{t(`mov.${evento.tipo}`)}</td>
              {mostrarLote ? <td className="h-12 px-4 font-mono text-xs">{evento.lote_codigo_interno}</td> : null}
              <td className="h-12 px-4 text-right font-mono">{formatNumber(evento.cantidad)} {unidad}</td>
              {mostrarSaldo ? <td className="h-12 px-4 text-right font-mono">{formatNumber(evento.saldo_despues)} {unidad}</td> : null}
              <td className="h-12 px-4 text-cds-textSecondary">{evento.usuario}</td>
              <td className="h-12 max-w-[360px] px-4 text-cds-textSecondary"><span className="line-clamp-2">{evento.motivo_auditoria || evento.motivo || "-"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LotesAuditoriaTable({ lotes, unidad }: { lotes: AuditoriaReactivo["lotes"]; unidad: string }) {
  const { t } = useTranslation()
  if (!lotes.length) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">{t("audit.sinLotes")}</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">{t("audit.thCodigo")}</th>
            <th className="h-10 px-4 font-normal">{t("audit.thProveedor")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("audit.thInicial")}</th>
            <th className="h-10 px-4 text-right font-normal">{t("audit.thActual")}</th>
            <th className="h-10 px-4 font-normal">{t("audit.thVence")}</th>
            <th className="h-10 px-4 font-normal">{t("audit.thEstado")}</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote) => (
            <tr key={lote.id} className="border-b border-cds-borderSubtle">
              <td className="h-12 px-4 font-mono text-xs">{lote.codigo_interno}</td>
              <td className="h-12 px-4 text-cds-textSecondary">{lote.proveedor || "-"}</td>
              <td className="h-12 px-4 text-right font-mono">{formatNumber(lote.cantidad_inicial)} {unidad}</td>
              <td className="h-12 px-4 text-right font-mono">{formatNumber(lote.cantidad_actual)} {unidad}</td>
              <td className="h-12 px-4 text-cds-textSecondary">{formatDate(lote.fecha_vencimiento)}</td>
              <td className={cn("h-12 px-4 font-medium", estadoClass(lote.estado))}>
                {estadoVencimiento(lote.estado, lote.dias_hasta_vencimiento, t)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ConsumosUsuario({ rows, unidad }: { rows: Array<{ usuario: string; sector?: string | null; veces: number; cantidad: number }>; unidad: string }) {
  const { t } = useTranslation()
  if (!rows.length) {
    return <div className="text-sm text-cds-textSecondary">{t("audit.sinConsumos")}</div>
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.usuario}-${row.sector}`} className="border-b border-cds-borderSubtle">
              <td className="h-10 px-4">{row.usuario}</td>
              <td className="h-10 px-4 text-cds-textSecondary">{row.sector || "-"}</td>
              <td className="h-10 px-4 text-right">{row.veces}</td>
              <td className="h-10 px-4 text-right font-mono">{formatNumber(row.cantidad)} {unidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ConsumosSector({ rows, unidad }: { rows: Array<{ sector: string; veces: number; cantidad: number }>; unidad: string }) {
  const { t } = useTranslation()
  if (!rows.length) {
    return <div className="text-sm text-cds-textSecondary">{t("audit.sinConsumos")}</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.sector} className="border-b border-cds-borderSubtle">
              <td className="h-10 px-4">{row.sector}</td>
              <td className="h-10 px-4 text-right">{row.veces}</td>
              <td className="h-10 px-4 text-right font-mono">{formatNumber(row.cantidad)} {unidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cds-layer01 p-4">
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div className="mt-2 text-[22px] leading-[1.33]">{value}</div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs tracking-[0.32px] text-cds-textSecondary">{label}</div>
      <div className="mt-1 text-cds-textPrimary">{value}</div>
    </div>
  )
}
