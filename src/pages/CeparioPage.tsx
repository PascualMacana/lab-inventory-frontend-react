import { FormEvent, type ReactNode, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Archive, ArrowLeft, ArrowRight, Calculator, Check, ChevronRight, ChevronUp, FileText, PenLine, Plus, QrCode, RotateCcw, Search, Snowflake } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { MapaCaja, type CeldaOcupada } from "../components/MapaCaja"
import { ModuleNav } from "../components/ModuleNav"
import { PageHeader } from "../components/PageHeader"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import {
  api,
  type CepCaracterizacionCrear,
  type CepCaracterizacionEditar,
  type CepConsumoInventario,
  type CepEntidadCrear,
  type CepMovimientoCrear,
  type CepMovimientoTipo,
  type CepScoreResultado,
  type CepStockCrear,
  type CeparioEvento,
  type CeparioTipo,
  type CeparioViabilidad,
  type CeparioVial,
  type EntidadBiologica,
  type EntidadCaracterizacion,
  type EntidadDetalle,
  type GrupoOperativo,
} from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

type Vista = "galeria" | "tabla"
type Tab = "listado" | "detalle" | "nueva"

const GRUPOS: GrupoOperativo[] = ["H", "U", "P", "M"]
const SELECT_CLASS = "h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm text-cds-textPrimary"
// Selects de la fila de filtros: misma altura/estilo que el componente Input y
// que los filtros de Movimientos/Reactivos, para que el buscador y los selects
// queden alineados (el SELECT_CLASS h-12 es solo para los formularios).
const FILTRO_SELECT_CLASS =
  "h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
const entidadesVacias: EntidadBiologica[] = []

const VIABILIDAD: Record<CeparioViabilidad, { key: string; dot: string; pill: string }> = {
  viable: { key: "cepario.viaViable", dot: "bg-cds-supportSuccess", pill: "bg-lab-sageBg text-cds-supportSuccess" },
  requiere_repique: { key: "cepario.viaRepique", dot: "bg-lab-warm", pill: "bg-lab-warmTint text-lab-warmFg" },
  agotado_critico: { key: "cepario.viaCritico", dot: "bg-cds-supportError", pill: "bg-lab-critTint text-cds-supportError" },
}

// Color de stock de la galería (franja izquierda + medidor de viales). Derivado
// de la viabilidad en micro y de la categoría en partes; gris neutro cuando no
// hay viales. CSS vars (no hex del handoff) para que themee en modo oscuro.
const VIA_STOCK_COLOR: Record<CeparioViabilidad, string> = {
  viable: "var(--cds-support-success)",
  requiere_repique: "var(--lab-warm)",
  agotado_critico: "var(--cds-support-error)",
}
const STOCK_VACIO = "var(--cds-border-subtle)"

// Severidad para resumir la viabilidad de un micro (la que más atención pide).
const VIA_SEVERIDAD: Record<CeparioViabilidad, number> = {
  viable: 1,
  requiere_repique: 2,
  agotado_critico: 3,
}

// Resumen de viabilidad derivado del stock (espeja _resumen_viabilidad del
// backend). La ficha lo usa como fallback robusto: el detalle siempre trae el
// stock, así el acento se pinta aunque la respuesta venga cacheada sin el campo.
function resumenViabilidad(stock: CeparioVial[]): CeparioViabilidad | null {
  let peor: CeparioViabilidad | null = null
  for (const s of stock) {
    if (!s.activo || !s.viabilidad) {
      continue
    }
    if (peor == null || VIA_SEVERIDAD[s.viabilidad] > VIA_SEVERIDAD[peor]) {
      peor = s.viabilidad
    }
  }
  return peor
}

const ESTADO_KEY: Record<string, string> = {
  aislado: "cepario.estadoAislado",
  cepa: "cepario.estadoCepa",
  archivado: "cepario.estadoArchivado",
  activa: "cepario.estadoActiva",
}

// Categorías de parte genética + su clave i18n. El token de color usa un slug
// corto (gen_interes → gen) que existe en styles.css como --lab-parte-{slug}.
const CATEGORIAS = ["vector", "promotor", "rbs", "gen_interes", "terminador", "tag"] as const
const CAT_KEY: Record<string, string> = {
  vector: "cepario.catVector",
  promotor: "cepario.catPromotor",
  rbs: "cepario.catRbs",
  gen_interes: "cepario.catGenInteres",
  terminador: "cepario.catTerminador",
  tag: "cepario.catTag",
}
const CAT_TOKEN: Record<string, string> = {
  vector: "vector",
  promotor: "promotor",
  rbs: "rbs",
  gen_interes: "gen",
  terminador: "terminador",
  tag: "tag",
}

// Ensayos de la Ficha de caracterización (espejo de CAMPOS_CARACTERIZACION del
// backend). `hint` orienta el formato que el score sabe interpretar.
const ENSAYOS: { campo: string; key: string; hint?: string }[] = [
  { campo: "gram", key: "cepario.ensayoGram" },
  { campo: "morfologia_colonia", key: "cepario.ensayoMorfColonia" },
  { campo: "morfologia_celular", key: "cepario.ensayoMorfCelular" },
  { campo: "esporas", key: "cepario.ensayoEsporas", hint: "Sí / No" },
  { campo: "motilidad", key: "cepario.ensayoMotilidad", hint: "+ / -" },
  { campo: "catalasa", key: "cepario.ensayoCatalasa", hint: "+ / -" },
  { campo: "oxidasa", key: "cepario.ensayoOxidasa", hint: "+ / -" },
  { campo: "ureasa", key: "cepario.ensayoUreasa", hint: "+ / ++ / +++" },
  { campo: "eps_mucoidez", key: "cepario.ensayoEps", hint: "+ / ++ / +++" },
  { campo: "biofilm", key: "cepario.ensayoBiofilm", hint: "+ / -" },
  { campo: "hidrolisis_almidon", key: "cepario.ensayoAlmidon", hint: "+ / -" },
  { campo: "hidrolisis_caseina", key: "cepario.ensayoCaseina", hint: "+ / -" },
  { campo: "hidrolisis_gelatina", key: "cepario.ensayoGelatina", hint: "+ / -" },
  { campo: "halotolerancia_nacl", key: "cepario.ensayoNacl", hint: "0 / 5 / 10 / 15" },
  { campo: "rango_t", key: "cepario.ensayoRangoT", hint: "4 - 37" },
  { campo: "rango_ph", key: "cepario.ensayoRangoPh", hint: "6 - 9" },
  { campo: "nitrato", key: "cepario.ensayoNitrato", hint: "+ / -" },
  { campo: "citrato", key: "cepario.ensayoCitrato", hint: "+ / -" },
  { campo: "vp_mr", key: "cepario.ensayoVpMr" },
  { campo: "ferment_azucares", key: "cepario.ensayoFerment" },
]

const DECISIONES = ["pasa", "no_pasa", "reevaluar"] as const
const DECISION_KEY: Record<string, string> = {
  pasa: "cepario.decisionPasa",
  no_pasa: "cepario.decisionNoPasa",
  reevaluar: "cepario.decisionReevaluar",
}
// Checks de Gate 1 (filtro mínimo) → su etiqueta i18n.
const GATE1_KEY: Record<string, string> = {
  cultivo_puro: "cepario.gate1CultivoPuro",
  crece_medio: "cepario.gate1CreceMedio",
  no_patogeno: "cepario.gate1NoPatogeno",
  origen_documentado: "cepario.gate1OrigenDoc",
}

// Extrae los ensayos (los 20 campos) de una Ficha existente como dict de strings.
function ensayosDeFicha(ficha: EntidadCaracterizacion): Record<string, string> {
  const out: Record<string, string> = {}
  for (const { campo } of ENSAYOS) {
    const v = ficha[campo]
    if (v != null && v !== "") {
      out[campo] = String(v)
    }
  }
  return out
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function descargarPdf(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Chip del grupo operativo con color propio (tokens --lab-grupo-*). Se calcula
// el tint vía color-mix para no definir un token de fondo por cada grupo.
function GrupoChip({ grupo }: { grupo?: string | null }) {
  if (!grupo || grupo === "?") {
    return null
  }
  const v = `var(--lab-grupo-${grupo.toLowerCase()})`
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.16px]"
      style={{
        color: v,
        backgroundColor: `color-mix(in srgb, ${v} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${v} 40%, transparent)`,
      }}
    >
      {grupo}
    </span>
  )
}

// Chip de categoría de parte con color propio (tokens --lab-parte-*). Mismo
// patrón que GrupoChip: el tint sale de color-mix para no definir un fondo por
// categoría. Cada categoría escanea de un vistazo por su hue.
function ParteChip({ categoria }: { categoria?: string | null }) {
  const { t } = useTranslation()
  if (!categoria) {
    return null
  }
  const slug = CAT_TOKEN[categoria] ?? "vector"
  const v = `var(--lab-parte-${slug})`
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.16px]"
      style={{
        color: v,
        backgroundColor: `color-mix(in srgb, ${v} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${v} 40%, transparent)`,
      }}
    >
      {t(CAT_KEY[categoria] ?? categoria)}
    </span>
  )
}

function EstadoPill({ estado }: { estado: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.16px] ring-1 ring-cds-borderSubtle",
        estado === "cepa" ? "text-lab-cepario" : "text-cds-textSecondary",
      )}
    >
      {t(ESTADO_KEY[estado] ?? estado)}
    </span>
  )
}

// Semáforo de viabilidad: el verde/ámbar/rojo del sistema, reutilizado.
function ViabilidadPill({ viabilidad }: { viabilidad: CeparioViabilidad | null }) {
  const { t } = useTranslation()
  if (!viabilidad) {
    return <span className="text-xs text-cds-textSecondary">{t("cepario.viaSinStock")}</span>
  }
  const v = VIABILIDAD[viabilidad]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.16px]", v.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />
      {t(v.key)}
    </span>
  )
}

// Avatar circular del grupo operativo (galería Alt 1). Variante de GrupoChip:
// el detalle/tabla siguen con el chip-pill; acá la card lo quiere como círculo.
function GrupoAvatar({ grupo }: { grupo?: string | null }) {
  if (!grupo || grupo === "?") {
    return null
  }
  const v = `var(--lab-grupo-${grupo.toLowerCase()})`
  return (
    <span
      className="inline-flex h-[27px] w-[27px] items-center justify-center rounded-full text-xs font-semibold"
      style={{ color: v, backgroundColor: `color-mix(in srgb, ${v} 16%, transparent)` }}
    >
      {grupo}
    </span>
  )
}

// Barritas de viales: una por vial (máx 6) en el color de stock; 0 viales → 3
// barritas en gris neutro. Reusado en el pie de la card y en la tarjeta de vial.
function VialBars({ n, color }: { n: number; color: string }) {
  const vacio = n <= 0
  const barras = vacio ? 3 : Math.min(n, 6)
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {Array.from({ length: barras }).map((_, i) => (
        <span
          key={i}
          className="h-4 w-1.5 rounded-[3px]"
          style={{ backgroundColor: vacio ? STOCK_VACIO : color }}
        />
      ))}
    </div>
  )
}

// Medidor de viales del pie de la card de galería: barritas + "N viales".
function VialMeter({ n, color }: { n: number; color: string }) {
  const { t } = useTranslation()
  return (
    <div className="mt-0.5 flex items-center gap-[9px] border-t border-cds-borderSubtle pt-3">
      <VialBars n={n} color={color} />
      <span className="text-xs text-cds-textSecondary">{t("cepario.vialesN", { n })}</span>
    </div>
  )
}

// Estado de viabilidad en formato plano (punto + texto de color), sin pill.
// Usado en el encabezado de la ficha y en la tarjeta de vial.
function ViabilidadPlano({ viabilidad }: { viabilidad: CeparioViabilidad | null }) {
  const { t } = useTranslation()
  if (!viabilidad) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-cds-textSecondary">
        <span className="h-2 w-2 rounded-full bg-cds-textSecondary" />
        {t("cepario.viaSinStock")}
      </span>
    )
  }
  const v = VIABILIDAD[viabilidad]
  const textColor =
    viabilidad === "viable"
      ? "text-cds-supportSuccess"
      : viabilidad === "requiere_repique"
        ? "text-lab-warmFg"
        : "text-cds-supportError"
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold", textColor)}>
      <span className={cn("h-2 w-2 rounded-full", v.dot)} />
      {t(v.key)}
    </span>
  )
}

// Celda de la grilla de metadatos de la ficha: label arriba, valor abajo.
function MetaCampo({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-xs text-cds-textSecondary">{label}</dt>
      <dd className={cn("text-sm text-cds-textPrimary", mono && "font-mono")}>{children}</dd>
    </div>
  )
}

// Placa de estado vacío (borde punteado + CTA opcional): caracterización/linaje.
function PlacaVacia({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-cds-borderSubtle bg-cds-layer01 px-6 py-7 text-center">
      {children}
    </div>
  )
}

// Badge de viabilidad de la card: plano (punto + texto) para viable / sin stock,
// y pill tintada para los estados que piden atención (repique / crítico). El
// detalle y la tabla siguen usando ViabilidadPill (siempre pill).
function CardEstadoBadge({ viabilidad }: { viabilidad: CeparioViabilidad | null }) {
  const { t } = useTranslation()
  if (!viabilidad) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-cds-textSecondary">
        <span className="h-[7px] w-[7px] rounded-full bg-cds-textSecondary" />
        {t("cepario.viaSinStock")}
      </span>
    )
  }
  const v = VIABILIDAD[viabilidad]
  if (viabilidad === "viable") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-cds-supportSuccess">
        <span className={cn("h-[7px] w-[7px] rounded-full", v.dot)} />
        {t(v.key)}
      </span>
    )
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", v.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />
      {t(v.key)}
    </span>
  )
}

const CARD_CLASS =
  "group relative flex flex-col gap-3.5 overflow-hidden rounded-[9px] border border-cds-borderSubtle bg-cds-layer01 pb-[15px] pl-5 pr-[18px] pt-[17px] text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(30,30,40,0.09)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus"

function CeparioCard({ entidad, onClick }: { entidad: EntidadBiologica; onClick: () => void }) {
  const codigo = entidad.codigo ?? entidad.codigo_temporal ?? "—"
  const taxon = entidad.taxon_presuntivo ?? entidad.nombre ?? ""
  // Cursiva solo cuando hay especie presuntiva; los aislados sin identificar van
  // en gris regular (acordado con el diseño).
  const conTaxon = Boolean(entidad.taxon_presuntivo)
  const stock = entidad.viabilidad_resumen ? VIA_STOCK_COLOR[entidad.viabilidad_resumen] : STOCK_VACIO
  return (
    <button type="button" onClick={onClick} className={CARD_CLASS}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: stock }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[14.5px] font-medium tracking-[0.02em] text-cds-textPrimary">{codigo}</span>
        <CardEstadoBadge viabilidad={entidad.viabilidad_resumen} />
      </div>
      <div className={cn("min-h-[1.25rem] text-base", conTaxon ? "font-medium italic text-cds-textPrimary" : "text-cds-textSecondary")}>
        {taxon}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <GrupoAvatar grupo={entidad.grupo_operativo} />
        <EstadoPill estado={entidad.estado} />
      </div>
      <VialMeter n={entidad.nro_viales_total} color={stock} />
    </button>
  )
}

function ParteCard({ entidad, onClick }: { entidad: EntidadBiologica; onClick: () => void }) {
  const { t } = useTranslation()
  const slug = entidad.categoria ? CAT_TOKEN[entidad.categoria] ?? "vector" : null
  const stock = entidad.nro_viales_total > 0 && slug ? `var(--lab-parte-${slug})` : STOCK_VACIO
  const meta = [
    entidad.resistencia || null,
    entidad.concentracion_ng_ul != null ? t("cepario.concentracionVal", { n: entidad.concentracion_ng_ul }) : null,
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <button type="button" onClick={onClick} className={CARD_CLASS}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: stock }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[14.5px] font-medium tracking-[0.02em] text-cds-textPrimary">{entidad.codigo ?? "—"}</span>
        <ParteChip categoria={entidad.categoria} />
      </div>
      <div>
        <div className="text-base font-medium text-cds-textPrimary">{entidad.nombre ?? ""}</div>
        {meta ? <div className="mt-[7px] font-mono text-[12.5px] text-cds-textSecondary">{meta}</div> : null}
      </div>
      <VialMeter n={entidad.nro_viales_total} color={stock} />
    </button>
  )
}

function NuevaMicroForm({ pending, onSubmit }: { pending: boolean; onSubmit: (data: CepEntidadCrear) => void }) {
  const { t } = useTranslation()
  // El alta de micro tiene dos modos: aislado (screening, A-NNN, grupo opcional
  // hasta clasificarlo) o cepa directa de catálogo (BB-{G}-NNN, grupo obligatorio).
  const [modo, setModo] = useState<"aislado" | "cepa">("aislado")
  const [nombre, setNombre] = useState("")
  const [grupo, setGrupo] = useState("")
  const [taxon, setTaxon] = useState("")
  const [origen, setOrigen] = useState("")
  const [medio, setMedio] = useState("")
  const [bsl, setBsl] = useState("")
  const [errorForm, setErrorForm] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (modo === "cepa" && !grupo) {
      setErrorForm(t("cepario.faltaGrupo"))
      return
    }
    setErrorForm(null)
    onSubmit({
      tipo: "microorganismo",
      estado: modo,
      nombre: nombre.trim() || null,
      grupo_operativo: (grupo || null) as GrupoOperativo | null,
      taxon_presuntivo: taxon.trim() || null,
      origen_muestra: origen.trim() || null,
      medio_aislamiento: medio.trim() || null,
      nivel_bioseguridad: bsl.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      {errorForm ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorForm}</div>
      ) : null}
      <label className="mb-4 block">
        <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoModo")}</span>
        <select className={SELECT_CLASS} value={modo} onChange={(e) => setModo(e.target.value as "aislado" | "cepa")}>
          <option value="aislado">{t("cepario.modoAislado")}</option>
          <option value="cepa">{t("cepario.modoCepa")}</option>
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoNombre")}</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoGrupo")}</span>
          <select className={SELECT_CLASS} value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="">{modo === "aislado" ? t("cepario.grupoSinClasificar") : "—"}</option>
            {GRUPOS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoBsl")}</span>
          <Input value={bsl} onChange={(e) => setBsl(e.target.value)} placeholder="BSL-1" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTaxon")}</span>
          <Input value={taxon} onChange={(e) => setTaxon(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoOrigen")}</span>
          <Input value={origen} onChange={(e) => setOrigen(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMedio")}</span>
          <Input value={medio} onChange={(e) => setMedio(e.target.value)} />
        </label>
      </div>
      <div className="mt-6">
        <Button type="submit" variant="primary" disabled={pending}>
          {modo === "aislado" ? t("cepario.guardarAislado") : t("cepario.guardarCepa")}
        </Button>
      </div>
    </form>
  )
}

function NuevaParteForm({ pending, onSubmit }: { pending: boolean; onSubmit: (data: CepEntidadCrear) => void }) {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState("")
  const [categoria, setCategoria] = useState("")
  const [backbone, setBackbone] = useState("")
  const [resistencia, setResistencia] = useState("")
  const [concentracion, setConcentracion] = useState("")
  const [funcion, setFuncion] = useState("")
  const [procedencia, setProcedencia] = useState("disenada")
  const [bsl, setBsl] = useState("")
  const [errorForm, setErrorForm] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!categoria) {
      setErrorForm(t("cepario.faltaCategoria"))
      return
    }
    setErrorForm(null)
    const conc = concentracion.trim() ? Number(concentracion) : null
    onSubmit({
      tipo: "parte_genetica",
      categoria,
      nombre: nombre.trim() || null,
      backbone_chasis: backbone.trim() || null,
      resistencia: resistencia.trim() || null,
      concentracion_ng_ul: conc != null && Number.isFinite(conc) ? conc : null,
      funcion_uso: funcion.trim() || null,
      procedencia: procedencia || null,
      nivel_bioseguridad: bsl.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      {errorForm ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorForm}</div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoNombre")}</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoCategoria")}</span>
          <select className={SELECT_CLASS} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">—</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{t(CAT_KEY[c])}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoProcedencia")}</span>
          <select className={SELECT_CLASS} value={procedencia} onChange={(e) => setProcedencia(e.target.value)}>
            <option value="disenada">{t("cepario.procDisenada")}</option>
            <option value="adquirida">{t("cepario.procAdquirida")}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoResistencia")}</span>
          <Input value={resistencia} onChange={(e) => setResistencia(e.target.value)} placeholder="Kanamicina" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoConcentracion")}</span>
          <Input type="number" step="any" min={0} value={concentracion} onChange={(e) => setConcentracion(e.target.value)} placeholder="125.5" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoBackbone")}</span>
          <Input value={backbone} onChange={(e) => setBackbone(e.target.value)} placeholder="pAn702" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoBsl")}</span>
          <Input value={bsl} onChange={(e) => setBsl(e.target.value)} placeholder="BSL-1" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoFuncion")}</span>
          <Input value={funcion} onChange={(e) => setFuncion(e.target.value)} />
        </label>
      </div>
      <div className="mt-6">
        <Button type="submit" variant="primary" disabled={pending}>
          {t("cepario.guardarParte")}
        </Button>
      </div>
    </form>
  )
}

function CongelarVialesForm({ pending, onSubmit, defaultTemperatura = "-80" }: { pending: boolean; onSubmit: (data: CepStockCrear) => void; defaultTemperatura?: string }) {
  const { t } = useTranslation()
  const [nroViales, setNroViales] = useState("1")
  const [freezer, setFreezer] = useState("")
  const [caja, setCaja] = useState("")
  const [posicion, setPosicion] = useState("")
  const [temperatura, setTemperatura] = useState(defaultTemperatura)
  const [crio, setCrio] = useState("")
  const [viabilidad, setViabilidad] = useState<CeparioViabilidad>("viable")
  const [medioRepique, setMedioRepique] = useState("")
  const [errorForm, setErrorForm] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const n = Number(nroViales)
    if (!Number.isFinite(n) || n <= 0) {
      setErrorForm(t("cepario.faltaViales"))
      return
    }
    setErrorForm(null)
    onSubmit({
      nro_viales: n,
      ubicacion_freezer: freezer.trim() || null,
      ubicacion_caja: caja.trim() || null,
      ubicacion_posicion: posicion.trim() || null,
      temperatura: temperatura.trim() || null,
      crioprotectante: crio.trim() || null,
      viabilidad,
      medio_repique: medioRepique.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="mt-4 border border-cds-borderSubtle bg-cds-layer01 p-4">
      {errorForm ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-background px-4 py-3 text-sm">{errorForm}</div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoNroViales")}</span>
          <Input type="number" min={1} value={nroViales} onChange={(e) => setNroViales(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoFreezer")}</span>
          <Input value={freezer} onChange={(e) => setFreezer(e.target.value)} placeholder="Freezer -80" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTemperatura")}</span>
          <Input value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoCaja")}</span>
          <Input value={caja} onChange={(e) => setCaja(e.target.value)} placeholder="Caja A" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoPosicion")}</span>
          <Input value={posicion} onChange={(e) => setPosicion(e.target.value)} placeholder="A1" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoViabilidad")}</span>
          <select className={SELECT_CLASS} value={viabilidad} onChange={(e) => setViabilidad(e.target.value as CeparioViabilidad)}>
            <option value="viable">{t("cepario.viaViable")}</option>
            <option value="requiere_repique">{t("cepario.viaRepique")}</option>
            <option value="agotado_critico">{t("cepario.viaCritico")}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoCrio")}</span>
          <Input value={crio} onChange={(e) => setCrio(e.target.value)} placeholder="Glicerol 20%" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMedioRepique")}</span>
          <Input value={medioRepique} onChange={(e) => setMedioRepique(e.target.value)} />
        </label>
      </div>
      <div className="mt-4">
        <Button type="submit" variant="primary" size="compact" disabled={pending}>
          {t("cepario.guardarCongelar")}
        </Button>
      </div>
    </form>
  )
}

const TIPOS_MOVIMIENTO: CepMovimientoTipo[] = ["descongelar", "repique", "descarte", "ajuste"]

function MovimientoForm({
  puedeDescartar,
  pending,
  onSubmit,
  onCancel,
}: {
  puedeDescartar: boolean
  pending: boolean
  onSubmit: (data: CepMovimientoCrear) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const { token } = useAuth()
  const [tipo, setTipo] = useState<CepMovimientoTipo>("descongelar")
  const [cantidad, setCantidad] = useState("1")
  const [motivo, setMotivo] = useState("")
  const [conConsumo, setConConsumo] = useState(false)
  const [reactivoId, setReactivoId] = useState("")
  const [loteId, setLoteId] = useState("")
  const [consumoCantidad, setConsumoCantidad] = useState("1")
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // 'descarte' solo si el rol puede (el backend igual lo gatea por descartar_stock).
  const tipos = TIPOS_MOVIMIENTO.filter((tp) => tp !== "descarte" || puedeDescartar)
  const esAjuste = tipo === "ajuste"

  // Catálogo de reactivos + lotes para la costura; solo se piden si el toggle está activo.
  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token) && conConsumo,
  })
  const lotesQuery = useQuery({
    queryKey: ["lotes", "reactivo", reactivoId],
    queryFn: () => api.lotesPorReactivo(token!, Number(reactivoId)),
    enabled: Boolean(token) && conConsumo && Boolean(reactivoId),
  })
  const reactivos = reactivosQuery.data ?? []
  const lotes = lotesQuery.data ?? []
  const reactivoSel = reactivos.find((r) => String(r.id) === reactivoId)

  function submit(event: FormEvent) {
    event.preventDefault()
    const n = Number(cantidad)
    if (!Number.isInteger(n) || (esAjuste ? n < 0 : n <= 0)) {
      setErrorForm(t("cepario.movCantidadInvalida"))
      return
    }
    let consumo: CepConsumoInventario | null = null
    if (conConsumo) {
      if (!reactivoId) {
        setErrorForm(t("cepario.movFaltaReactivo"))
        return
      }
      const c = Number(consumoCantidad)
      if (!Number.isFinite(c) || c <= 0) {
        setErrorForm(t("cepario.movConsumoCantidadInvalida"))
        return
      }
      consumo = { reactivo_id: Number(reactivoId), cantidad: c, lote_id: loteId ? Number(loteId) : null }
    }
    setErrorForm(null)
    onSubmit({ tipo, cantidad: n, motivo: motivo.trim() || null, consumo_inventario: consumo })
  }

  return (
    <form onSubmit={submit} className="mt-2 border border-cds-borderSubtle bg-cds-background p-3">
      {errorForm ? (
        <div className="mb-3 border-l-4 border-cds-supportError px-3 py-2 text-sm">{errorForm}</div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[10rem_8rem_1fr] sm:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.movTipo")}</span>
          <select className={SELECT_CLASS} value={tipo} onChange={(e) => setTipo(e.target.value as CepMovimientoTipo)}>
            {tipos.map((tp) => (
              <option key={tp} value={tp}>{t(`cepario.mov_${tp}`)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{esAjuste ? t("cepario.movNuevoTotal") : t("cepario.movCantidad")}</span>
          <Input type="number" min={esAjuste ? 0 : 1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.movMotivo")}</span>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={t("cepario.movMotivoPh")} />
        </label>
      </div>

      {/* Costura opcional: descontar un reactivo real del inventario al registrar el movimiento. */}
      <label className="mt-3 inline-flex items-center gap-2 text-sm text-cds-textSecondary">
        <input type="checkbox" checked={conConsumo} onChange={(e) => setConConsumo(e.target.checked)} />
        {t("cepario.movConConsumo")}
      </label>
      {conConsumo ? (
        <div className="mt-3 grid gap-3 border-l-2 border-cds-borderSubtle pl-3 sm:grid-cols-[1fr_1fr_8rem] sm:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.movReactivo")}</span>
            <select className={SELECT_CLASS} value={reactivoId} onChange={(e) => { setReactivoId(e.target.value); setLoteId("") }}>
              <option value="">{t("cepario.movReactivoPlaceholder")}</option>
              {reactivos.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.movLote")}</span>
            <select className={SELECT_CLASS} value={loteId} onChange={(e) => setLoteId(e.target.value)} disabled={!reactivoId}>
              <option value="">{t("cepario.movLoteFifo")}</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>{l.codigo_interno} · {l.cantidad_actual} {l.unidad}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.movConsumoCantidad")}{reactivoSel ? ` (${reactivoSel.unidad})` : ""}</span>
            <Input type="number" min={0} step="any" value={consumoCantidad} onChange={(e) => setConsumoCantidad(e.target.value)} />
          </label>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Button type="submit" variant="primary" size="compact" disabled={pending}>{t("cepario.movRegistrar")}</Button>
        <Button type="button" variant="secondary" size="compact" onClick={onCancel}>{t("cepario.movCancelar")}</Button>
      </div>
    </form>
  )
}

function Timeline({ eventos }: { eventos: CeparioEvento[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {eventos.map((ev) => (
        <li key={ev.id} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lab-cepario" />
          <div>
            <div className="text-sm text-cds-textPrimary">{ev.detalle ?? ev.tipo_evento}</div>
            <div className="text-xs text-cds-textSecondary">
              {ev.fecha?.slice(0, 16).replace("T", " ")}
              {ev.usuario_nombre ? ` · ${ev.usuario_nombre}` : ""}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

// Desglose del Score (Perfil ideal): asistencia, no autoritativa.
function ScoreResumen({ score }: { score: CepScoreResultado }) {
  const { t } = useTranslation()
  const { gate1, gate2, gate3 } = score.detalle_gates
  return (
    <div className="mt-3 border border-cds-borderSubtle bg-cds-background p-3">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-medium text-lab-cepario">{score.score_calculado}</span>
        <span className="text-xs text-cds-textSecondary">/ 100</span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-cds-textSecondary">{t("cepario.gate1")}:</span>
          {Object.entries(gate1.checks).map(([k, ok]) => (
            <span
              key={k}
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5",
                ok ? "bg-lab-sageBg text-cds-supportSuccess" : "bg-lab-critTint text-cds-supportError",
              )}
            >
              {t(GATE1_KEY[k] ?? k)}
            </span>
          ))}
        </div>
        <div>
          <span className="text-cds-textSecondary">{t("cepario.gate2")}:</span>{" "}
          <span className={gate2.pasa ? "text-cds-supportSuccess" : "text-cds-textSecondary"}>
            {gate2.pasa ? t("cepario.gateCumple") : t("cepario.gateNoCumple")}
          </span>
          <span className="text-cds-textSecondary"> · {gate2.criterio}</span>
        </div>
        <div>
          <span className="text-cds-textSecondary">{t("cepario.gate3")}:</span>{" "}
          {t("cepario.scorePts", { p: gate3.puntos, max: gate3.max })}
          {gate3.aportes.length ? (
            <span className="text-cds-textSecondary"> — {gate3.aportes.map((a) => a.criterio).join(", ")}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

type CaracPayload = {
  ensayos: Record<string, string>
  score_calculado: number | null
  score_confirmado: number | null
  decision: string | null
}

// Ficha de caracterización editable (sirve para nueva, edición de borrador y
// enmienda). El Score se prellena vía "Calcular" (asistencia) y el operador
// confirma/edita antes de guardar — patrón visión IA.
function CaracterizacionForm({
  inicial,
  etiquetaGuardar,
  pending,
  onCalcularScore,
  onSubmit,
  onCancel,
}: {
  inicial?: EntidadCaracterizacion
  etiquetaGuardar: string
  pending: boolean
  onCalcularScore: (ensayos: Record<string, string>) => Promise<CepScoreResultado>
  onSubmit: (payload: CaracPayload) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [ensayos, setEnsayos] = useState<Record<string, string>>(inicial ? ensayosDeFicha(inicial) : {})
  const [decision, setDecision] = useState<string>(inicial?.decision ? String(inicial.decision) : "")
  const [scoreCalc, setScoreCalc] = useState<number | null>(inicial?.score_calculado != null ? Number(inicial.score_calculado) : null)
  const [scoreResultado, setScoreResultado] = useState<CepScoreResultado | null>(null)
  const [scoreConf, setScoreConf] = useState<string>(inicial?.score_confirmado != null ? String(inicial.score_confirmado) : "")
  const [calculando, setCalculando] = useState(false)

  function setEnsayo(campo: string, valor: string) {
    setEnsayos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function calcular() {
    setCalculando(true)
    try {
      const res = await onCalcularScore(ensayos)
      setScoreResultado(res)
      setScoreCalc(res.score_calculado)
      setScoreConf(String(res.score_calculado))
    } finally {
      setCalculando(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const limpios: Record<string, string> = {}
    for (const { campo } of ENSAYOS) {
      const v = (ensayos[campo] ?? "").trim()
      if (v) {
        limpios[campo] = v
      }
    }
    const confNum = scoreConf.trim() ? Number(scoreConf) : null
    onSubmit({
      ensayos: limpios,
      score_calculado: scoreCalc,
      score_confirmado: confNum != null && Number.isFinite(confNum) ? confNum : null,
      decision: decision || null,
    })
  }

  return (
    <form onSubmit={submit} className="mt-3 border border-cds-borderSubtle bg-cds-layer01 p-4">
      <h4 className="mb-3 text-xs font-medium tracking-[0.32px] text-cds-textSecondary">{t("cepario.ensayosTitulo")}</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ENSAYOS.map(({ campo, key, hint }) => (
          <label key={campo} className="block">
            <span className="mb-1 block text-xs text-cds-textSecondary">{t(key)}</span>
            {campo === "gram" ? (
              <select className={SELECT_CLASS} value={ensayos.gram ?? ""} onChange={(e) => setEnsayo("gram", e.target.value)}>
                <option value="">—</option>
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="variable">{t("cepario.gramVariable")}</option>
                <option value="pendiente">{t("cepario.gramPendiente")}</option>
              </select>
            ) : (
              <Input value={ensayos[campo] ?? ""} onChange={(e) => setEnsayo(campo, e.target.value)} placeholder={hint} />
            )}
          </label>
        ))}
      </div>

      <div className="mt-4 border-t border-cds-borderSubtle pt-4">
        <Button type="button" variant="secondary" size="compact" onClick={calcular} disabled={calculando}>
          <Calculator size={16} aria-hidden="true" />
          {t("cepario.caracScoreCalc")}
        </Button>
        <p className="mt-2 text-xs text-cds-textSecondary">{t("cepario.caracScoreHint")}</p>
        {scoreResultado ? <ScoreResumen score={scoreResultado} /> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.caracScoreConfirmado")}</span>
            <Input type="number" step="any" min={0} max={100} value={scoreConf} onChange={(e) => setScoreConf(e.target.value)} placeholder={t("cepario.caracSinScore")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.caracDecision")}</span>
            <select className={SELECT_CLASS} value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="">{t("cepario.decisionSelecc")}</option>
              {DECISIONES.map((d) => (
                <option key={d} value={d}>{t(DECISION_KEY[d])}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="submit" variant="primary" size="compact" disabled={pending}>{etiquetaGuardar}</Button>
        <Button type="button" variant="ghost" size="compact" onClick={onCancel}>{t("cepario.caracCancelar")}</Button>
      </div>
    </form>
  )
}

// Una Ficha existente en el detalle: estado (borrador/firmada/enmienda), score,
// decisión y acciones (editar/firmar si borrador; enmendar si firmada).
function FichaItem({
  ficha,
  puede,
  pending,
  onCalcularScore,
  onEditar,
  onFirmar,
  onEnmendar,
}: {
  ficha: EntidadCaracterizacion
  puede: boolean
  pending: boolean
  onCalcularScore: (ensayos: Record<string, string>) => Promise<CepScoreResultado>
  onEditar: (caracId: number, payload: CepCaracterizacionEditar) => void
  onFirmar: (caracId: number) => void
  onEnmendar: (caracId: number, payload: CepCaracterizacionEditar) => void
}) {
  const { t } = useTranslation()
  const [editando, setEditando] = useState<false | "editar" | "enmienda">(false)
  const firmada = ficha.firmado_en != null
  const score = ficha.score_confirmado ?? ficha.score_calculado

  return (
    <li className="border border-cds-borderSubtle bg-cds-layer01 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-cds-textSecondary" aria-hidden="true" />
          <span className="text-sm text-cds-textPrimary">#{ficha.id}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px]",
              firmada ? "bg-lab-sageBg text-cds-supportSuccess" : "text-cds-textSecondary ring-1 ring-cds-borderSubtle",
            )}
          >
            {firmada ? t("cepario.caracFirmada") : t("cepario.caracBorrador")}
          </span>
          {ficha.enmienda_de_id ? (
            <span className="text-[11px] text-cds-textSecondary">{t("cepario.caracEnmiendaDe", { n: ficha.enmienda_de_id })}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {score != null ? <span className="text-cds-textPrimary">{t("cepario.caracScore")}: {String(score)}</span> : null}
          {ficha.decision ? <span className="text-cds-textSecondary">{t(DECISION_KEY[String(ficha.decision)] ?? String(ficha.decision))}</span> : null}
        </div>
      </div>

      {puede ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {!firmada ? (
            <>
              <Button type="button" variant="secondary" size="compact" onClick={() => setEditando(editando === "editar" ? false : "editar")}>
                {t("cepario.caracEditar")}
              </Button>
              <Button type="button" variant="secondary" size="compact" onClick={() => onFirmar(ficha.id)} disabled={pending}>
                <PenLine size={16} aria-hidden="true" />
                {t("cepario.caracFirmar")}
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="compact" onClick={() => setEditando(editando === "enmienda" ? false : "enmienda")}>
              {t("cepario.caracEnmendar")}
            </Button>
          )}
        </div>
      ) : null}
      {firmada ? <p className="mt-1 text-[11px] text-cds-textSecondary">{t("cepario.caracFirmadaInfo")}</p> : null}

      {editando ? (
        <CaracterizacionForm
          inicial={ficha}
          etiquetaGuardar={editando === "enmienda" ? t("cepario.caracEnmendar") : t("cepario.caracGuardar")}
          pending={pending}
          onCalcularScore={onCalcularScore}
          onSubmit={(payload) => {
            const datos: CepCaracterizacionEditar = {
              ensayos: payload.ensayos,
              score_confirmado: payload.score_confirmado,
              decision: payload.decision,
            }
            if (editando === "enmienda") {
              onEnmendar(ficha.id, datos)
            } else {
              onEditar(ficha.id, datos)
            }
            setEditando(false)
          }}
          onCancel={() => setEditando(false)}
        />
      ) : null}
    </li>
  )
}

// Handlers del flujo de screening (US2), inyectados desde la página.
type ScreeningProps = {
  puedeCaracterizar: boolean
  puedePromover: boolean
  pendingCarac: boolean
  pendingCiclo: boolean
  onCalcularScore: (ensayos: Record<string, string>) => Promise<CepScoreResultado>
  onCrear: (payload: CepCaracterizacionCrear) => void
  onEditar: (caracId: number, payload: CepCaracterizacionEditar) => void
  onFirmar: (caracId: number) => void
  onEnmendar: (caracId: number, payload: CepCaracterizacionEditar) => void
  onPromover: () => void
  onArchivar: (motivo: string | null) => void
  onReactivar: () => void
}

function CeparioDetalle({
  entidad,
  puedeStock,
  puedeDescartar,
  screening,
  onCongelar,
  pendingCongelar,
  onMovimiento,
  pendingMovimiento,
  onEtiquetas,
  pendingEtiquetas,
  onVolver,
}: {
  entidad: EntidadDetalle
  puedeStock: boolean
  puedeDescartar: boolean
  screening: ScreeningProps
  onCongelar: (data: CepStockCrear) => void
  pendingCongelar: boolean
  onMovimiento: (stockId: number, data: CepMovimientoCrear) => void
  pendingMovimiento: boolean
  onEtiquetas: () => void
  pendingEtiquetas: boolean
  onVolver: () => void
}) {
  const { t } = useTranslation()
  const [congelando, setCongelando] = useState(false)
  const [movVial, setMovVial] = useState<number | null>(null)
  const [nuevaFicha, setNuevaFicha] = useState(false)
  const [archivando, setArchivando] = useState(false)
  const [motivoArchivar, setMotivoArchivar] = useState("")
  const esParte = entidad.tipo === "parte_genetica"
  const esAislado = entidad.estado === "aislado"
  const esArchivado = entidad.estado === "archivado"
  const grupoDefinido = entidad.grupo_operativo != null && entidad.grupo_operativo !== "?"
  const codigo = entidad.codigo ?? entidad.codigo_temporal ?? "—"
  // Color de categoría de la parte (token --lab-parte-*), si aplica.
  const slugParte = entidad.categoria ? CAT_TOKEN[entidad.categoria] ?? "vector" : null
  const colorCategoria = slugParte ? `var(--lab-parte-${slugParte})` : STOCK_VACIO
  // Viabilidad del micro: la del backend si viene, si no la derivo del stock.
  const viabilidadResumen = entidad.viabilidad_resumen ?? resumenViabilidad(entidad.stock)
  // Acento del encabezado + spine de stock: categoría en partes, viabilidad en
  // micro (igual que la franja de la card de galería).
  const acento = esParte
    ? colorCategoria
    : viabilidadResumen
      ? VIA_STOCK_COLOR[viabilidadResumen]
      : STOCK_VACIO
  // Color de las celdas ocupadas del mapa: morado del cepario en micro, color de
  // la categoría en partes (acordado con Emiliano).
  const colorMapa = esParte ? colorCategoria : "var(--lab-cepario)"
  // Nombre(s) de caja para el header del mapa.
  const nombreCaja = Array.from(new Set(entidad.stock.map((v) => v.ubicacion_caja).filter(Boolean))).join(" · ")
  // Ocupantes del mapa de caja: cada vial con posición + qué hay ahí (para el
  // tooltip de hover): código del vial, nro de viales y freezer/caja.
  const ocupadasCaja: CeldaOcupada[] = entidad.stock
    .filter((v) => v.ubicacion_posicion)
    .map((v) => ({
      posicion: v.ubicacion_posicion,
      titulo: v.codigo_interno,
      detalle: [
        t("cepario.vialesN", { n: v.nro_viales_actual }),
        [v.ubicacion_freezer, v.ubicacion_caja].filter(Boolean).join(" / "),
      ]
        .filter(Boolean)
        .join(" · "),
    }))

  return (
    <div className="flex flex-col gap-7">
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-cds-textSecondary transition-colors hover:text-cds-textPrimary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t("common.volverAlListado")}
      </button>

      {/* Encabezado de identidad con acento de estado (micro) o categoría (parte) */}
      <div className="relative overflow-hidden rounded-xl border border-cds-borderSubtle bg-cds-layer01 py-[22px] pl-7 pr-[26px]">
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: acento }} aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-3xl font-medium tracking-[0.01em] text-cds-textPrimary">{codigo}</span>
          {esParte ? <ParteChip categoria={entidad.categoria} /> : <GrupoAvatar grupo={entidad.grupo_operativo} />}
          <EstadoPill estado={entidad.estado} />
          <ViabilidadPlano viabilidad={viabilidadResumen} />
          {entidad.nivel_bioseguridad ? (
            <span className="rounded-full px-2 py-0.5 text-[11px] text-cds-textSecondary ring-1 ring-cds-borderSubtle">
              {entidad.nivel_bioseguridad}
            </span>
          ) : null}
        </div>
        {entidad.taxon_presuntivo || entidad.nombre ? (
          <div
            className={cn(
              "mt-2.5 text-lg",
              esParte
                ? "font-medium text-cds-textPrimary"
                : entidad.taxon_presuntivo
                  ? "font-medium italic text-cds-textPrimary"
                  : "text-cds-textSecondary",
            )}
          >
            {entidad.taxon_presuntivo ?? entidad.nombre}
          </div>
        ) : null}
        <dl className="mt-[22px] grid gap-x-10 gap-y-[18px] border-t border-cds-borderSubtle pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {esParte ? (
            <>
              {entidad.concentracion_ng_ul != null ? (
                <MetaCampo label={t("cepario.detConcentracion")} mono>{t("cepario.concentracionVal", { n: entidad.concentracion_ng_ul })}</MetaCampo>
              ) : null}
              {entidad.resistencia ? (
                <MetaCampo label={t("cepario.detResistencia")}>{entidad.resistencia}</MetaCampo>
              ) : null}
              {entidad.backbone_chasis ? (
                <MetaCampo label={t("cepario.detBackbone")}>{entidad.backbone_chasis}</MetaCampo>
              ) : null}
              {entidad.funcion_uso ? (
                <MetaCampo label={t("cepario.detFuncion")}>{entidad.funcion_uso}</MetaCampo>
              ) : null}
              {entidad.procedencia ? (
                <MetaCampo label={t("cepario.detProcedencia")}>{t(entidad.procedencia === "adquirida" ? "cepario.procAdquirida" : "cepario.procDisenada")}</MetaCampo>
              ) : null}
            </>
          ) : (
            <>
              {entidad.origen_muestra ? (
                <MetaCampo label={t("cepario.detOrigen")}>{entidad.origen_muestra}</MetaCampo>
              ) : null}
              {entidad.medio_aislamiento ? (
                <MetaCampo label={t("cepario.detMedio")}>{entidad.medio_aislamiento}</MetaCampo>
              ) : null}
            </>
          )}
        </dl>
      </div>

      {!esParte && (esAislado || esArchivado) && screening.puedePromover ? (
        <div className="flex flex-col gap-2 border-b border-cds-borderSubtle pb-4">
          <div className="flex flex-wrap gap-2">
            {esAislado ? (
              <Button type="button" variant="primary" size="compact" onClick={screening.onPromover} disabled={screening.pendingCiclo || !grupoDefinido}>
                <ChevronUp size={16} aria-hidden="true" />
                {t("cepario.accionPromover")}
              </Button>
            ) : null}
            {esAislado ? (
              <Button type="button" variant="secondary" size="compact" onClick={() => setArchivando((v) => !v)} disabled={screening.pendingCiclo}>
                <Archive size={16} aria-hidden="true" />
                {t("cepario.accionArchivar")}
              </Button>
            ) : null}
            {esArchivado ? (
              <Button type="button" variant="secondary" size="compact" onClick={screening.onReactivar} disabled={screening.pendingCiclo}>
                <RotateCcw size={16} aria-hidden="true" />
                {t("cepario.accionReactivar")}
              </Button>
            ) : null}
          </div>
          {esAislado && !grupoDefinido ? (
            <p className="text-xs text-cds-textSecondary">{t("cepario.promoverSinGrupo")}</p>
          ) : null}
          {archivando ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.archivarMotivo")}</span>
                <Input value={motivoArchivar} onChange={(e) => setMotivoArchivar(e.target.value)} />
              </label>
              <Button
                type="button"
                variant="danger"
                size="compact"
                disabled={screening.pendingCiclo}
                onClick={() => {
                  screening.onArchivar(motivoArchivar.trim() || null)
                  setArchivando(false)
                  setMotivoArchivar("")
                }}
              >
                {t("cepario.accionArchivar")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cds-borderSubtle pb-2">
          <h2 className="text-sm font-medium tracking-[0.16px] text-cds-textPrimary">{t("cepario.detStock")}</h2>
          {puedeStock ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="compact" onClick={onEtiquetas} disabled={pendingEtiquetas || entidad.stock.length === 0}>
                <QrCode size={16} aria-hidden="true" />
                {t("cepario.imprimirEtiquetas")}
              </Button>
              <Button type="button" variant="primary" size="compact" onClick={() => setCongelando((v) => !v)}>
                <Snowflake size={16} aria-hidden="true" />
                {t("cepario.congelarViales")}
              </Button>
            </div>
          ) : null}
        </div>

        {puedeStock && congelando ? (
          <CongelarVialesForm
            pending={pendingCongelar}
            defaultTemperatura={esParte ? "-20" : "-80"}
            onSubmit={(data) => {
              onCongelar(data)
              setCongelando(false)
            }}
          />
        ) : null}

        <div className="mt-5 grid gap-[26px] lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div>
            {entidad.stock.length === 0 ? (
              <p className="text-sm text-cds-textSecondary">{t("cepario.detSinViales")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {entidad.stock.map((vial) => {
                  // Spine + barritas del vial: categoría en partes, viabilidad del
                  // vial en micro.
                  const spine = esParte
                    ? colorCategoria
                    : vial.viabilidad
                      ? VIA_STOCK_COLOR[vial.viabilidad]
                      : STOCK_VACIO
                  const sinUbicacion = !vial.ubicacion_freezer && !vial.ubicacion_caja && !vial.ubicacion_posicion
                  return (
                    <li key={vial.id} className="relative overflow-hidden rounded-[10px] border border-cds-borderSubtle bg-cds-layer01">
                      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: spine }} aria-hidden="true" />
                      <div className="flex flex-wrap items-start justify-between gap-4 py-4 pl-5 pr-[18px]">
                        <div className="min-w-0">
                          <div className="font-mono text-sm font-medium text-cds-textPrimary">{vial.codigo_interno}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-cds-textSecondary">
                            {sinUbicacion ? (
                              <span>{t("cepario.sinUbicacion")}</span>
                            ) : (
                              <>
                                {vial.ubicacion_freezer ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Snowflake size={13} aria-hidden="true" />
                                    {vial.ubicacion_freezer}
                                  </span>
                                ) : null}
                                {vial.ubicacion_caja ? (
                                  <>
                                    <ChevronRight size={12} className="text-cds-textSecondary" aria-hidden="true" />
                                    <span>{vial.ubicacion_caja}</span>
                                  </>
                                ) : null}
                                {vial.ubicacion_posicion ? (
                                  <>
                                    <ChevronRight size={12} className="text-cds-textSecondary" aria-hidden="true" />
                                    <span className="font-mono text-cds-textPrimary">{vial.ubicacion_posicion}</span>
                                  </>
                                ) : null}
                              </>
                            )}
                            {vial.crioprotectante ? (
                              <>
                                <span className="mx-0.5 h-1 w-1 rounded-full bg-cds-textSecondary" aria-hidden="true" />
                                <span>{vial.crioprotectante}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-3">
                            <VialBars n={vial.nro_viales_actual} color={spine} />
                            <span className="text-sm text-cds-textPrimary">{t("cepario.vialesN", { n: vial.nro_viales_actual })}</span>
                            <ViabilidadPlano viabilidad={vial.viabilidad} />
                          </div>
                          {puedeStock ? (
                            <button
                              type="button"
                              onClick={() => setMovVial(movVial === vial.id ? null : vial.id)}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-cds-linkPrimary transition-colors hover:text-cds-textPrimary"
                            >
                              {t("cepario.movAccion")}
                              <ArrowRight size={14} aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {puedeStock && movVial === vial.id ? (
                        <div className="px-5 pb-4">
                          <MovimientoForm
                            puedeDescartar={puedeDescartar}
                            pending={pendingMovimiento}
                            onSubmit={(data) => {
                              onMovimiento(vial.id, data)
                              setMovVial(null)
                            }}
                            onCancel={() => setMovVial(null)}
                          />
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="rounded-[10px] border border-cds-borderSubtle bg-cds-layer01 p-[18px]">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-cds-textPrimary">{t("cepario.mapaCajaTitulo")}</span>
              {nombreCaja ? <span className="font-mono text-[11.5px] text-cds-textSecondary">{nombreCaja}</span> : null}
            </div>
            <MapaCaja ocupadas={ocupadasCaja} color={colorMapa} />
            {ocupadasCaja.length ? (
              <div className="mt-3.5 flex items-center gap-4 border-t border-cds-borderSubtle pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-cds-textSecondary">
                  <span className="h-[11px] w-[11px] rounded-[3px]" style={{ backgroundColor: colorMapa }} />
                  {t("cepario.mapaOcupado")}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-cds-textSecondary">
                  <span className="h-[11px] w-[11px] rounded-[3px] border border-cds-borderSubtle bg-cds-background" />
                  {t("cepario.mapaLibre")}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 border-b border-cds-borderSubtle pb-2 text-sm font-medium tracking-[0.16px] text-cds-textPrimary">{t("cepario.detTimeline")}</h2>
        <Timeline eventos={entidad.eventos} />
      </section>

      {!esParte ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cds-borderSubtle pb-2">
            <h2 className="text-sm font-medium tracking-[0.16px] text-cds-textPrimary">{t("cepario.detCaracterizacion")}</h2>
            {screening.puedeCaracterizar && !nuevaFicha ? (
              <Button type="button" variant="secondary" size="compact" onClick={() => setNuevaFicha(true)}>
                <Plus size={16} aria-hidden="true" />
                {t("cepario.nuevaCaracterizacion")}
              </Button>
            ) : null}
          </div>

          {entidad.caracterizaciones.length === 0 && !nuevaFicha ? (
            <PlacaVacia>
              <div className="text-sm text-cds-textSecondary">{t("cepario.detCaracterizacionVacia")}</div>
              <div className="mt-1 text-xs text-cds-textSecondary">{t("cepario.detCaracterizacionVaciaSub")}</div>
            </PlacaVacia>
          ) : (
            <ul className="flex flex-col gap-3">
              {entidad.caracterizaciones.map((ficha) => (
                <FichaItem
                  key={ficha.id}
                  ficha={ficha}
                  puede={screening.puedeCaracterizar}
                  pending={screening.pendingCarac}
                  onCalcularScore={screening.onCalcularScore}
                  onEditar={screening.onEditar}
                  onFirmar={screening.onFirmar}
                  onEnmendar={screening.onEnmendar}
                />
              ))}
            </ul>
          )}

          {nuevaFicha ? (
            <CaracterizacionForm
              etiquetaGuardar={t("cepario.caracGuardar")}
              pending={screening.pendingCarac}
              onCalcularScore={screening.onCalcularScore}
              onSubmit={(payload) => {
                screening.onCrear({
                  ensayos: payload.ensayos,
                  score_calculado: payload.score_calculado,
                  score_confirmado: payload.score_confirmado,
                  decision: payload.decision,
                })
                setNuevaFicha(false)
              }}
              onCancel={() => setNuevaFicha(false)}
            />
          ) : null}

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium tracking-[0.16px] text-cds-textSecondary">{t("cepario.detLinaje")}</h3>
            {entidad.codigo_temporal && entidad.estado === "cepa" ? (
              <p className="text-sm text-cds-textSecondary">
                {t("cepario.detLinajeOrigen")}: <span className="font-mono text-cds-textPrimary">{entidad.codigo_temporal}</span>
              </p>
            ) : (
              <PlacaVacia>
                <div className="text-sm text-cds-textSecondary">{t("cepario.detLinajeVacio")}</div>
              </PlacaVacia>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export function CeparioPage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const puedeCrear = puede(usuario, "crear_entidad_biologica")
  const puedeStock = puede(usuario, "gestionar_cepario_stock")
  const puedeDescartar = puede(usuario, "descartar_stock")
  const puedeCaracterizar = puede(usuario, "caracterizar_aislado")
  const puedePromover = puede(usuario, "promover_cepa")

  const [vista, setVista] = useState<Vista>("galeria")
  const [tab, setTab] = useState<Tab>(searchParams.get("id") ? "detalle" : "listado")
  const [entidadId, setEntidadId] = useState<number | null>(
    searchParams.get("id") ? Number(searchParams.get("id")) : null,
  )
  const [tipo, setTipo] = useState<CeparioTipo>("microorganismo")
  const [busqueda, setBusqueda] = useState("")
  const [grupo, setGrupo] = useState("")
  const [estado, setEstado] = useState("")
  const [categoria, setCategoria] = useState("")
  const [atencion, setAtencion] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const esParteVista = tipo === "parte_genetica"
  const entidadesQuery = useQuery({
    queryKey: ["cepario", "entidades", tipo, grupo, estado, categoria],
    queryFn: () => api.ceparioEntidades(token!, {
      tipo,
      grupo: !esParteVista && grupo ? grupo : undefined,
      estado: !esParteVista && estado ? estado : undefined,
      categoria: esParteVista && categoria ? categoria : undefined,
    }),
    enabled: Boolean(token),
  })

  const entidadQuery = useQuery({
    queryKey: ["cepario", "entidad", entidadId],
    queryFn: () => api.ceparioEntidad(token!, entidadId!),
    enabled: Boolean(token) && tab === "detalle" && Boolean(entidadId),
  })

  const entidades = entidadesQuery.data ?? entidadesVacias
  const entidadesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es")
    return entidades.filter((e) => {
      if (atencion && e.viabilidad_resumen !== "requiere_repique" && e.viabilidad_resumen !== "agotado_critico") {
        return false
      }
      if (!texto) {
        return true
      }
      return [e.codigo, e.codigo_temporal, e.nombre, e.taxon_presuntivo, e.categoria, e.resistencia]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("es").includes(texto))
    })
  }, [entidades, busqueda, atencion])

  function abrirDetalle(id: number) {
    setEntidadId(id)
    setTab("detalle")
    setSearchParams({ id: String(id) })
  }

  function volverAlListado() {
    setTab("listado")
    setEntidadId(null)
    setSearchParams({})
  }

  // Cambiar de mundo (micro ↔ partes): resetea los filtros propios de cada tipo
  // y vuelve al listado, para que la vista no arrastre filtros que no aplican.
  function cambiarTipo(nuevo: CeparioTipo) {
    if (nuevo === tipo) {
      return
    }
    setTipo(nuevo)
    setGrupo("")
    setEstado("")
    setCategoria("")
    setAtencion(false)
    setBusqueda("")
    setVista("galeria")
    volverAlListado()
    setMensaje(null)
    setErrorLocal(null)
  }

  const crearEntidadMutation = useMutation({
    mutationFn: (data: CepEntidadCrear) => api.crearEntidadCepario(token!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cepario", "entidades"] })
      const msgKey =
        res.tipo === "parte_genetica"
          ? "cepario.parteCreada"
          : res.estado === "aislado"
            ? "cepario.aisladoCreado"
            : "cepario.cepaCreada"
      setMensaje(t(msgKey, { codigo: res.codigo ?? res.codigo_temporal ?? "" }))
      setErrorLocal(null)
      abrirDetalle(res.id)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const crearStockMutation = useMutation({
    mutationFn: (data: CepStockCrear) => api.crearStockCepario(token!, entidadId!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cepario", "entidad", entidadId] })
      queryClient.invalidateQueries({ queryKey: ["cepario", "entidades"] })
      setMensaje(t("cepario.vialCongelado", { codigo: res.codigo_interno }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const etiquetasMutation = useMutation({
    mutationFn: (stockIds: number[]) => api.ceparioEtiquetasPdf(token!, stockIds, "rollo_50x30"),
    onSuccess: (blob) => {
      descargarPdf(blob, "etiquetas-viales.pdf")
      setMensaje(t("cepario.etiquetasGeneradas"))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  function imprimirEtiquetas() {
    const ids = (entidadQuery.data?.stock ?? []).map((v) => v.id)
    if (ids.length === 0) {
      setErrorLocal(t("cepario.etiquetasSinViales"))
      return
    }
    etiquetasMutation.mutate(ids)
  }

  // ── US2: caracterización + ciclo de vida (operan sobre la entidad del detalle) ──
  const detalleActual = entidadQuery.data
  function invalidarDetalle() {
    queryClient.invalidateQueries({ queryKey: ["cepario", "entidad", entidadId] })
    queryClient.invalidateQueries({ queryKey: ["cepario", "entidades"] })
  }

  const registrarMovimientoMutation = useMutation({
    mutationFn: ({ stockId, data }: { stockId: number; data: CepMovimientoCrear }) =>
      api.ceparioRegistrarMovimiento(token!, stockId, data),
    onSuccess: (res) => {
      invalidarDetalle()
      setMensaje(t("cepario.movRegistrado", { n: res.nro_viales_actual }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  // El score necesita grupo + campos de Gate 1 de la entidad (medio/origen/BSL).
  const onCalcularScore = (ensayos: Record<string, string>) =>
    api.ceparioPreviewScore(token!, {
      grupo_operativo: detalleActual?.grupo_operativo ?? "?",
      ensayos,
      medio_aislamiento: detalleActual?.medio_aislamiento ?? null,
      origen_muestra: detalleActual?.origen_muestra ?? null,
      nivel_bioseguridad: detalleActual?.nivel_bioseguridad ?? null,
    })

  const crearCaracMutation = useMutation({
    mutationFn: (payload: CepCaracterizacionCrear) => api.ceparioCrearCaracterizacion(token!, entidadId!, payload),
    onSuccess: () => { invalidarDetalle(); setMensaje(t("cepario.caracGuardada")); setErrorLocal(null) },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const editarCaracMutation = useMutation({
    mutationFn: ({ caracId, payload }: { caracId: number; payload: CepCaracterizacionEditar }) =>
      api.ceparioEditarCaracterizacion(token!, caracId, payload),
    onSuccess: () => { invalidarDetalle(); setMensaje(t("cepario.caracGuardada")); setErrorLocal(null) },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const firmarCaracMutation = useMutation({
    mutationFn: (caracId: number) => api.ceparioFirmarCaracterizacion(token!, caracId),
    onSuccess: () => { invalidarDetalle(); setMensaje(t("cepario.caracFirmadaMsg")); setErrorLocal(null) },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const enmendarCaracMutation = useMutation({
    mutationFn: ({ caracId, payload }: { caracId: number; payload: CepCaracterizacionEditar }) =>
      api.ceparioEnmendarCaracterizacion(token!, caracId, payload),
    onSuccess: () => { invalidarDetalle(); setMensaje(t("cepario.caracEnmendadaMsg")); setErrorLocal(null) },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const promoverMutation = useMutation({
    mutationFn: () => api.ceparioPromover(token!, entidadId!),
    onSuccess: (res) => { invalidarDetalle(); setMensaje(t("cepario.promovido", { codigo: res.codigo })); setErrorLocal(null) },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const archivarMutation = useMutation({
    mutationFn: (motivo: string | null) => api.ceparioArchivar(token!, entidadId!, motivo),
    onSuccess: () => { invalidarDetalle(); setMensaje(t("cepario.archivadoMsg")); setErrorLocal(null) },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const reactivarMutation = useMutation({
    mutationFn: () => api.ceparioReactivar(token!, entidadId!),
    onSuccess: () => { invalidarDetalle(); setMensaje(t("cepario.reactivadoMsg")); setErrorLocal(null) },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const screening: ScreeningProps = {
    puedeCaracterizar,
    puedePromover,
    pendingCarac:
      crearCaracMutation.isPending || editarCaracMutation.isPending || firmarCaracMutation.isPending || enmendarCaracMutation.isPending,
    pendingCiclo: promoverMutation.isPending || archivarMutation.isPending || reactivarMutation.isPending,
    onCalcularScore,
    onCrear: (payload) => crearCaracMutation.mutate(payload),
    onEditar: (caracId, payload) => editarCaracMutation.mutate({ caracId, payload }),
    onFirmar: (caracId) => firmarCaracMutation.mutate(caracId),
    onEnmendar: (caracId, payload) => enmendarCaracMutation.mutate({ caracId, payload }),
    onPromover: () => promoverMutation.mutate(),
    onArchivar: (motivo) => archivarMutation.mutate(motivo),
    onReactivar: () => reactivarMutation.mutate(),
  }

  const moduleActions =
    tab === "listado"
      ? puedeCrear
        ? [{ label: t(esParteVista ? "cepario.nuevaParte" : "cepario.nuevoMicro"), onClick: () => { setTab("nueva"); setMensaje(null); setErrorLocal(null) }, icon: <Plus size={18} aria-hidden="true" /> }]
        : []
      : [{ label: t("common.volverAlListado"), onClick: volverAlListado, icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" as const }]

  return (
    <section>
      <PageHeader
        title={t("cepario.title")}
        description={t("cepario.desc")}
        count={entidadesQuery.isLoading ? t("cepario.cargando") : t(esParteVista ? "cepario.countPartesN" : "cepario.countN", { n: entidadesFiltradas.length })}
        plain
      />

      {mensaje ? (
        <div className="mb-6 border-l-4 border-cds-supportSuccess bg-cds-layer01 px-4 py-3 text-sm">{mensaje}</div>
      ) : null}
      {errorLocal ? (
        <div className="mb-6 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">{errorLocal}</div>
      ) : null}

      {tab === "listado" ? (
        <div className="mb-4 inline-flex border border-cds-borderSubtle" role="tablist" aria-label={t("cepario.title")}>
          {(["microorganismo", "parte_genetica"] as CeparioTipo[]).map((tp) => (
            <button
              key={tp}
              type="button"
              role="tab"
              aria-selected={tipo === tp}
              onClick={() => cambiarTipo(tp)}
              className={cn(
                "h-10 px-4 text-sm tracking-[0.16px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
                tipo === tp ? "bg-lab-ceparioTint text-cds-textPrimary" : "text-cds-textSecondary hover:text-cds-textPrimary",
              )}
            >
              {t(tp === "microorganismo" ? "cepario.tipoMicro" : "cepario.tipoParte")}
            </button>
          ))}
        </div>
      ) : null}

      {/* En detalle el "Volver" vive como link ghost dentro de la ficha. */}
      {tab !== "detalle" ? (
        <ModuleNav
          views={tab === "listado" ? [{ value: "galeria", label: t("cepario.vistaGaleria") }, { value: "tabla", label: t("cepario.vistaTabla") }] : undefined}
          value={tab === "listado" ? vista : undefined}
          onChange={tab === "listado" ? (v) => setVista(v as Vista) : undefined}
          actions={moduleActions}
        />
      ) : null}

      {tab === "nueva" ? (
        esParteVista ? (
          <NuevaParteForm pending={crearEntidadMutation.isPending} onSubmit={(data) => crearEntidadMutation.mutate(data)} />
        ) : (
          <NuevaMicroForm pending={crearEntidadMutation.isPending} onSubmit={(data) => crearEntidadMutation.mutate(data)} />
        )
      ) : tab === "detalle" ? (
        entidadQuery.isLoading ? (
          <p className="text-sm text-cds-textSecondary">{t("cepario.cargando")}</p>
        ) : entidadQuery.data ? (
          <CeparioDetalle
            entidad={entidadQuery.data}
            puedeStock={puedeStock}
            puedeDescartar={puedeDescartar}
            screening={screening}
            onCongelar={(data) => crearStockMutation.mutate(data)}
            pendingCongelar={crearStockMutation.isPending}
            onMovimiento={(stockId, data) => registrarMovimientoMutation.mutate({ stockId, data })}
            pendingMovimiento={registrarMovimientoMutation.isPending}
            onEtiquetas={imprimirEtiquetas}
            pendingEtiquetas={etiquetasMutation.isPending}
            onVolver={volverAlListado}
          />
        ) : (
          <p className="text-sm text-cds-textSecondary">{t("cepario.sinResultados")}</p>
        )
      ) : (
        <>
          <div className={cn("mb-4 grid gap-4", esParteVista ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]")}>
            <label className="block">
              <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("cepario.buscar")}</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={18} aria-hidden="true" />
                <Input className="pl-12" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={t(esParteVista ? "cepario.buscarPhParte" : "cepario.buscarPh")} />
              </div>
            </label>
            {esParteVista ? (
              <label className="block">
                <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("cepario.filtroCategoria")}</span>
                <select className={FILTRO_SELECT_CLASS} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">{t("cepario.filtroTodos")}</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{t(CAT_KEY[c])}</option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("cepario.filtroGrupo")}</span>
                  <select className={FILTRO_SELECT_CLASS} value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                    <option value="">{t("cepario.filtroTodos")}</option>
                    {GRUPOS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("cepario.filtroEstado")}</span>
                  <select className={FILTRO_SELECT_CLASS} value={estado} onChange={(e) => setEstado(e.target.value)}>
                    <option value="">{t("cepario.filtroTodos")}</option>
                    <option value="cepa">{t("cepario.estadoCepa")}</option>
                    <option value="aislado">{t("cepario.estadoAislado")}</option>
                    <option value="archivado">{t("cepario.estadoArchivado")}</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    aria-pressed={atencion}
                    onClick={() => setAtencion((v) => !v)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm tracking-[0.16px] ring-1 ring-inset transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus",
                      atencion
                        ? "bg-lab-ceparioTint text-lab-cepario ring-lab-cepario/40"
                        : "text-cds-textSecondary ring-cds-borderSubtle hover:text-cds-textPrimary",
                    )}
                  >
                    {atencion ? <Check size={16} aria-hidden="true" /> : null}
                    {t("cepario.filtroAtencion")}
                  </button>
                </div>
              </>
            )}
          </div>

          {entidadesFiltradas.length === 0 ? (
            <p className="text-sm text-cds-textSecondary">{t("cepario.sinResultados")}</p>
          ) : vista === "galeria" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {entidadesFiltradas.map((e) =>
                esParteVista ? (
                  <ParteCard key={e.id} entidad={e} onClick={() => abrirDetalle(e.id)} />
                ) : (
                  <CeparioCard key={e.id} entidad={e} onClick={() => abrirDetalle(e.id)} />
                ),
              )}
            </div>
          ) : esParteVista ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thCodigo")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thCategoria")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thResistencia")}</th>
                  <th className="h-10 px-4 text-right font-normal">{t("cepario.thConcentracion")}</th>
                  <th className="h-10 px-4 text-right font-normal">{t("cepario.thViales")}</th>
                </tr>
              </thead>
              <tbody>
                {entidadesFiltradas.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => abrirDetalle(e.id)}
                    className="cursor-pointer border-b border-cds-borderSubtle hover:bg-cds-layer01"
                  >
                    <td className="px-4 py-2 font-mono text-cds-textPrimary">{e.codigo ?? "—"}</td>
                    <td className="px-4 py-2"><ParteChip categoria={e.categoria} /></td>
                    <td className="px-4 py-2 text-cds-textSecondary">{e.resistencia ?? ""}</td>
                    <td className="px-4 py-2 text-right text-cds-textSecondary">{e.concentracion_ng_ul != null ? t("cepario.concentracionVal", { n: e.concentracion_ng_ul }) : ""}</td>
                    <td className="px-4 py-2 text-right">{e.nro_viales_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thCodigo")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thTaxon")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thGrupo")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thEstado")}</th>
                  <th className="h-10 px-4 text-right font-normal">{t("cepario.thViales")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thViabilidad")}</th>
                </tr>
              </thead>
              <tbody>
                {entidadesFiltradas.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => abrirDetalle(e.id)}
                    className="cursor-pointer border-b border-cds-borderSubtle hover:bg-cds-layer01"
                  >
                    <td className="px-4 py-2 font-mono text-cds-textPrimary">{e.codigo ?? e.codigo_temporal ?? "—"}</td>
                    <td className="px-4 py-2 text-cds-textSecondary">{e.taxon_presuntivo ?? e.nombre ?? ""}</td>
                    <td className="px-4 py-2"><GrupoChip grupo={e.grupo_operativo} /></td>
                    <td className="px-4 py-2"><EstadoPill estado={e.estado} /></td>
                    <td className="px-4 py-2 text-right">{e.nro_viales_total}</td>
                    <td className="px-4 py-2"><ViabilidadPill viabilidad={e.viabilidad_resumen} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}
