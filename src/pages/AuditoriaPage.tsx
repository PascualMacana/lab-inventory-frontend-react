import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Download, FileText, Search } from "lucide-react"

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

function estadoVencimiento(estado: string, dias?: number | null) {
  if (estado === "vencido") {
    return dias === null || dias === undefined ? "Vencido" : `Vencido hace ${Math.abs(dias)} día(s)`
  }
  if (estado === "por_vencer") {
    return dias === null || dias === undefined ? "Por vencer" : `Vence en ${dias} día(s)`
  }
  if (estado === "vigente") {
    return dias === null || dias === undefined ? "Vigente" : `Vigente (${dias} día(s))`
  }
  if (estado === "agotado") {
    return "Agotado"
  }
  return "Sin fecha"
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

function tipoLabel(tipo: AuditoriaEvento["tipo"]) {
  if (tipo === "entrada") {
    return "Entrada"
  }
  if (tipo === "salida") {
    return "Salida"
  }
  return "Ajuste"
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
      setErrorLocal("Ingresá un código interno.")
      return
    }
    setCodigoBuscado(limpio)
  }

  function buscarReactivo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorLocal(null)
    const reactivo = reactivoSeleccionado
    if (!reactivo) {
      setErrorLocal("Seleccioná un reactivo.")
      return
    }
    setReactivoParams({ id: reactivo.id, desde, hasta })
  }

  return (
    <section>
      <div className="mb-8">
        <h1>Auditoría</h1>
        <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          Trazabilidad determinística para chain of custody por frasco o por reactivo.
        </p>
      </div>

      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      <div className="mb-6 flex gap-px border-b border-cds-borderSubtle">
        <TabButton active={modo === "lote"} onClick={() => setModo("lote")}>
          Por lote
        </TabButton>
        <TabButton active={modo === "reactivo"} onClick={() => setModo("reactivo")}>
          Por reactivo
        </TabButton>
      </div>

      {modo === "lote" ? (
        <>
          <form className="mb-6 bg-cds-layer01 p-4" onSubmit={buscarLote}>
            <Label className="mb-2" htmlFor="codigo_auditoria">Código interno</Label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input id="codigo_auditoria" className="font-mono" value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="LAB-2026-00042" />
              <Button type="submit" disabled={loteQuery.isFetching}>
                <Search size={18} aria-hidden="true" />
                {loteQuery.isFetching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </form>

          {loteQuery.isError ? (
            <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
              {mutationError(loteQuery.error, "No se pudo cargar la auditoría del lote")}
            </div>
          ) : null}
          {loteQuery.data ? <AuditoriaLoteView token={token!} data={loteQuery.data} /> : null}
        </>
      ) : null}

      {modo === "reactivo" ? (
        <>
          <form className="mb-6 grid gap-4 bg-cds-layer01 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]" onSubmit={buscarReactivo}>
            <label className="block">
              <Label className="mb-2" htmlFor="reactivo_auditoria">Reactivo</Label>
              <select id="reactivo_auditoria" className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none" value={reactivoSeleccionado?.id ?? ""} onChange={(event) => setReactivoId(Number(event.target.value))}>
                {reactivos.map((reactivo) => (
                  <option key={reactivo.id} value={reactivo.id}>
                    {reactivo.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Label className="mb-2" htmlFor="aud_desde">Desde</Label>
              <Input id="aud_desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
            </label>
            <label className="block">
              <Label className="mb-2" htmlFor="aud_hasta">Hasta</Label>
              <Input id="aud_hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </label>
            <div className="flex items-end">
              <Button type="submit" disabled={reactivoQuery.isFetching || !reactivoSeleccionado}>
                <Search size={18} aria-hidden="true" />
                {reactivoQuery.isFetching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </form>

          {reactivoQuery.isError ? (
            <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
              {mutationError(reactivoQuery.error, "No se pudo cargar la auditoría del reactivo")}
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
          <Metric label="Saldo actual" value={`${formatNumber(lote.cantidad_actual)} ${unidad}`} />
          <Metric label="Inicial" value={`${formatNumber(lote.cantidad_inicial)} ${unidad}`} />
          <Metric label="Consumido" value={`${formatNumber(resumen.porcentaje_consumido)}%`} />
          <Metric label="Eventos" value={String(resumen.total_eventos)} />
        </div>
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <Info label="Proveedor" value={lote.proveedor || "-"} />
          <Info label="Vencimiento" value={`${formatDate(lote.fecha_vencimiento)} · ${estadoVencimiento(resumen.estado_vencimiento, lote.dias_hasta_vencimiento)}`} />
          <Info label="Ubicación" value={lote.ubicacion || "-"} />
          <Info label="Creado por" value={lote.creado_por} />
        </div>
      </section>

      <section className="bg-cds-layer01 p-4">
        <h3 className="mb-4">Resumen</h3>
        <div className="grid gap-px bg-cds-borderSubtle md:grid-cols-3">
          <Metric label="Total consumido" value={`${formatNumber(resumen.total_consumido)} ${unidad}`} />
          <Metric label="Entradas extra" value={`${formatNumber(resumen.total_entradas_extra)} ${unidad}`} />
          <Metric label="Ajustes" value={String(resumen.cantidad_ajustes)} />
        </div>
        {resumen.consumos_por_usuario.length ? <ConsumosUsuario rows={resumen.consumos_por_usuario} unidad={unidad} /> : null}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={() => downloadCsv(eventosCsv(data.eventos, unidad, true), `auditoria_${lote.codigo_interno}.csv`)}>
            <Download size={18} aria-hidden="true" />
            Descargar CSV
          </Button>
          <Button type="button" onClick={descargarPdf} disabled={pdfMutation.isPending}>
            <FileText size={18} aria-hidden="true" />
            {pdfMutation.isPending ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
        <EventosTable eventos={data.eventos} unidad={unidad} mostrarSaldo />
      </section>
    </div>
  )
}

function AuditoriaReactivoView({ token, data, desde, hasta }: { token: string; data: AuditoriaReactivo; desde?: string; hasta?: string }) {
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
        <p className="mt-2 text-sm text-cds-textSecondary">Período: {desde ?? "inicio"} a {hasta ?? "hoy"}</p>
        <div className="mt-5 grid gap-px bg-cds-borderSubtle md:grid-cols-4">
          <Metric label="Lotes" value={`${data.resumen.total_lotes} / ${data.resumen.lotes_activos}`} />
          <Metric label="Saldo actual" value={`${formatNumber(data.resumen.saldo_total_actual)} ${unidad}`} />
          <Metric label="Consumido" value={`${formatNumber(data.resumen.total_consumido_periodo)} ${unidad}`} />
          <Metric label="Eventos" value={String(data.resumen.total_eventos_periodo)} />
        </div>
      </section>

      <section className="bg-cds-layer01 p-4">
        <h3 className="mb-4">Lotes asociados</h3>
        <LotesAuditoriaTable lotes={data.lotes} unidad={unidad} />
      </section>

      {(data.resumen.consumos_por_usuario.length || data.resumen.consumos_por_sector.length) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-cds-layer01 p-4">
            <h3 className="mb-4">Consumos por usuario</h3>
            <ConsumosUsuario rows={data.resumen.consumos_por_usuario} unidad={unidad} />
          </div>
          <div className="bg-cds-layer01 p-4">
            <h3 className="mb-4">Consumos por sector</h3>
            <ConsumosSector rows={data.resumen.consumos_por_sector} unidad={unidad} />
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={() => downloadCsv(eventosCsv(data.eventos, unidad, false), `auditoria_${data.reactivo.nombre}_${desde ?? "inicio"}_${hasta ?? "hoy"}.csv`)}>
            <Download size={18} aria-hidden="true" />
            Descargar CSV
          </Button>
          <Button type="button" onClick={descargarPdf} disabled={pdfMutation.isPending}>
            <FileText size={18} aria-hidden="true" />
            {pdfMutation.isPending ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
        <EventosTable eventos={data.eventos} unidad={unidad} mostrarLote />
      </section>
    </div>
  )
}

function eventosCsv(eventos: AuditoriaEvento[], unidad: string, saldo: boolean) {
  return eventos.map((evento) => ({
    Fecha: formatDateTime(evento.fecha),
    Tipo: tipoLabel(evento.tipo),
    Lote: evento.lote_codigo_interno || "",
    Cantidad: `${formatNumber(evento.cantidad)} ${unidad}`,
    "Saldo después": saldo && evento.saldo_despues !== undefined ? `${formatNumber(evento.saldo_despues)} ${unidad}` : "",
    Usuario: evento.usuario,
    Sector: evento.usuario_sector || "",
    Motivo: evento.motivo_auditoria || evento.motivo || "",
  }))
}

function EventosTable({ eventos, unidad, mostrarSaldo = false, mostrarLote = false }: { eventos: AuditoriaEvento[]; unidad: string; mostrarSaldo?: boolean; mostrarLote?: boolean }) {
  if (!eventos.length) {
    return <div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Sin eventos para mostrar.</div>
  }
  return (
    <div className="overflow-x-auto border-t border-cds-borderSubtle">
      <table className="w-full min-w-[1060px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">Fecha</th>
            <th className="h-10 px-4 font-normal">Tipo</th>
            {mostrarLote ? <th className="h-10 px-4 font-normal">Lote</th> : null}
            <th className="h-10 px-4 text-right font-normal">Cantidad</th>
            {mostrarSaldo ? <th className="h-10 px-4 text-right font-normal">Saldo después</th> : null}
            <th className="h-10 px-4 font-normal">Usuario</th>
            <th className="h-10 px-4 font-normal">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="border-b border-cds-borderSubtle hover:bg-cds-layer01">
              <td className="h-12 px-4 text-cds-textSecondary">{formatDateTime(evento.fecha)}</td>
              <td className={cn("h-12 px-4 font-medium", tipoClass(evento.tipo))}>{tipoLabel(evento.tipo)}</td>
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
  if (!lotes.length) {
    return <div className="bg-cds-background p-3 text-sm text-cds-textSecondary">Este reactivo no tiene lotes.</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-cds-borderSubtle text-xs tracking-[0.32px] text-cds-textSecondary">
            <th className="h-10 px-4 font-normal">Código</th>
            <th className="h-10 px-4 font-normal">Proveedor</th>
            <th className="h-10 px-4 text-right font-normal">Inicial</th>
            <th className="h-10 px-4 text-right font-normal">Actual</th>
            <th className="h-10 px-4 font-normal">Vence</th>
            <th className="h-10 px-4 font-normal">Estado</th>
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
                {estadoVencimiento(lote.estado, lote.dias_hasta_vencimiento)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ConsumosUsuario({ rows, unidad }: { rows: Array<{ usuario: string; sector?: string | null; veces: number; cantidad: number }>; unidad: string }) {
  if (!rows.length) {
    return <div className="text-sm text-cds-textSecondary">Sin consumos.</div>
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
  if (!rows.length) {
    return <div className="text-sm text-cds-textSecondary">Sin consumos.</div>
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
