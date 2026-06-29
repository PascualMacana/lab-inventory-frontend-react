import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Archive, ArrowLeft, ArrowRight, Calculator, Check, ChevronRight, ChevronUp, Copy, Dna, Download, ExternalLink, FileText, Grid3x3, Link2, PenLine, Plus, QrCode, RotateCcw, Scissors, Search, Snowflake, Trash2, Upload, X } from "lucide-react"
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
  type CepBacdiveCandidate,
  type CepBacdivePatch,
  type CepBacdiveTipoBusqueda,
  type CepConsumoInventario,
  type CepEntidadActualizar,
  type CepEntidadCrear,
  type CepGenealogiaNodo,
  type CepGenealogiaPasaje,
  type CepMovimientoCrear,
  type CepMovimientoTipo,
  type CepReferenciaExterna,
  type CepScoreResultado,
  type CepStockCrear,
  type CepSecuencia,
  type CepFeature,
  type CepFeatureTipo,
  type CepFeatureCrear,
  type CepFeatureEditar,
  type CepFormatoGuardar,
  type CepHebra,
  type CepTopologia,
  type CeparioEvento,
  type CeparioTipo,
  type CeparioViabilidad,
  type CeparioVial,
  type EntidadBiologica,
  type EntidadCaracterizacion,
  type CepCaja,
  type CepCeldaOcupada,
  type CepMapaCaja,
  type EntidadDetalle,
  type GrupoOperativo,
} from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"
import { buscarSitios, type SitiosEnzima } from "../lib/enzimas"
import { buscarMotivo, esMotivoValido } from "../lib/motivos"

type Vista = "galeria" | "tabla"
type Tab = "listado" | "detalle" | "nueva" | "cajas"

const GRUPOS: GrupoOperativo[] = ["H", "U", "P", "M"]
const SELECT_CLASS = "h-12 w-full border-b border-cds-borderStrong bg-cds-field px-4 text-sm text-cds-textPrimary"
// Selects de la fila de filtros: misma altura/estilo que el componente Input y
// que los filtros de Movimientos/Reactivos, para que el buscador y los selects
// queden alineados (el SELECT_CLASS h-12 es solo para los formularios).
const FILTRO_SELECT_CLASS =
  "h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
const CARAC_SELECT_CLASS =
  "h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary transition-colors focus:border-b-cds-focus focus:outline-none"
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

// Familias del cepario → su etiqueta i18n (tabs).
const TIPO_KEY: Record<CeparioTipo, string> = {
  microorganismo: "cepario.tipoMicro",
  parte_genetica: "cepario.tipoParte",
  linea_celular: "cepario.tipoLinea",
  hongo: "cepario.tipoHongo",
}
const TIPOS: CeparioTipo[] = ["microorganismo", "parte_genetica", "linea_celular", "hongo"]

// Vocabularios de línea celular (espejo de cepario.VOCABULARIOS del backend).
const TIPOS_CULTIVO = ["adherente", "suspension", "mixto"] as const
const CULTIVO_KEY: Record<string, string> = {
  adherente: "cepario.cultivoAdherente",
  suspension: "cepario.cultivoSuspension",
  mixto: "cepario.cultivoMixto",
}
const MICOPLASMA = ["negativo", "positivo", "pendiente", "no_testeado"] as const
const MICOPLASMA_KEY: Record<string, string> = {
  negativo: "cepario.micoNegativo",
  positivo: "cepario.micoPositivo",
  pendiente: "cepario.micoPendiente",
  no_testeado: "cepario.micoNoTesteado",
}

// Vocabularios de hongo/levadura (espejo de cepario.VOCABULARIOS del backend).
const SUBTIPOS_HONGO = ["levadura", "filamentoso", "dimorfico"] as const
const SUBTIPO_HONGO_KEY: Record<string, string> = {
  levadura: "cepario.subtipoLevadura",
  filamentoso: "cepario.subtipoFilamentoso",
  dimorfico: "cepario.subtipoDimorfico",
}
const FORMAS_CONSERVACION = ["glicerol", "esporas", "liofilizado", "agar_inclinado", "papel_filtro"] as const
const CONSERVACION_KEY: Record<string, string> = {
  glicerol: "cepario.conservacionGlicerol",
  esporas: "cepario.conservacionEsporas",
  liofilizado: "cepario.conservacionLiofilizado",
  agar_inclinado: "cepario.conservacionAgar",
  papel_filtro: "cepario.conservacionPapel",
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

type EnsayoOpcion = { value: string; labelKey?: string; label?: string }

const OPCIONES_SIGNO: EnsayoOpcion[] = [{ value: "+" }, { value: "-" }, { value: "pendiente", labelKey: "cepario.gramPendiente" }]
const OPCIONES_INTENSIDAD: EnsayoOpcion[] = [
  { value: "-" },
  { value: "+" },
  { value: "++" },
  { value: "+++" },
  { value: "pendiente", labelKey: "cepario.gramPendiente" },
]

const OPCIONES_ENSAYO: Record<string, EnsayoOpcion[]> = {
  gram: [
    { value: "+" },
    { value: "-" },
    { value: "variable", labelKey: "cepario.gramVariable" },
    { value: "pendiente", labelKey: "cepario.gramPendiente" },
  ],
  esporas: [
    { value: "Sí" },
    { value: "No" },
    { value: "pendiente", labelKey: "cepario.gramPendiente" },
  ],
  motilidad: OPCIONES_SIGNO,
  catalasa: OPCIONES_SIGNO,
  oxidasa: OPCIONES_SIGNO,
  ureasa: OPCIONES_INTENSIDAD,
  eps_mucoidez: OPCIONES_INTENSIDAD,
  biofilm: OPCIONES_SIGNO,
  hidrolisis_almidon: OPCIONES_SIGNO,
  hidrolisis_caseina: OPCIONES_SIGNO,
  hidrolisis_gelatina: OPCIONES_SIGNO,
  halotolerancia_nacl: [
    { value: "0", label: "0 %" },
    { value: "5", label: "5 %" },
    { value: "10", label: "10 %" },
    { value: "15", label: "15 %" },
  ],
  rango_t: [
    { value: "4 - 30", label: "4 - 30 °C" },
    { value: "4 - 37", label: "4 - 37 °C" },
    { value: "15 - 37", label: "15 - 37 °C" },
    { value: "25 - 37", label: "25 - 37 °C" },
    { value: "30 - 37", label: "30 - 37 °C" },
  ],
  rango_ph: [
    { value: "5 - 9" },
    { value: "6 - 8" },
    { value: "6 - 9" },
    { value: "7 - 9" },
  ],
  nitrato: OPCIONES_SIGNO,
  citrato: OPCIONES_SIGNO,
}

const CAMPOS_CARAC_TEXTO_LIBRE = new Set(["vp_mr", "ferment_azucares", "morfologia_celular", "morfologia_colonia"])

const DECISIONES = ["pasa", "no_pasa", "reevaluar"] as const
const DECISION_KEY: Record<string, string> = {
  pasa: "cepario.decisionPasa",
  no_pasa: "cepario.decisionNoPasa",
  reevaluar: "cepario.decisionReevaluar",
}
const TAXON_TOKENS_IGNORADOS = new Set(["sp", "sp.", "spp", "spp.", "cf", "cf.", "aff", "aff.", "subsp", "subsp."])
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

function etiquetaOpcionEnsayo(opcion: EnsayoOpcion, t: (key: string) => string) {
  return opcion.labelKey ? t(opcion.labelKey) : opcion.label ?? opcion.value
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function descargarBlob(blob: Blob, nombre: string) {
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

// Chip de familia para líneas celulares: un único tint con el acento del cepario
// (las líneas no tienen sub-tipo como las partes; el chip solo marca la familia).
function LineaChip() {
  const { t } = useTranslation()
  const v = "var(--lab-cepario)"
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.16px]"
      style={{
        color: v,
        backgroundColor: `color-mix(in srgb, ${v} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${v} 40%, transparent)`,
      }}
    >
      {t("cepario.chipLinea")}
    </span>
  )
}

// Chip de familia para hongos/levaduras: tint del acento del cepario; muestra el
// subtipo (levadura/filamentoso/dimórfico) cuando se conoce, si no la familia.
function HongoChip({ subtipo }: { subtipo?: string | null }) {
  const { t } = useTranslation()
  const v = "var(--lab-cepario)"
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.16px]"
      style={{
        color: v,
        backgroundColor: `color-mix(in srgb, ${v} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${v} 40%, transparent)`,
      }}
    >
      {subtipo ? t(SUBTIPO_HONGO_KEY[subtipo] ?? subtipo) : t("cepario.chipHongo")}
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

// Card de galería de una línea celular: acento por viabilidad del stock (como
// micro), código + nombre de la línea, organismo · tipo de cultivo como meta.
function LineaCard({ entidad, onClick }: { entidad: EntidadBiologica; onClick: () => void }) {
  const { t } = useTranslation()
  const stock = entidad.viabilidad_resumen ? VIA_STOCK_COLOR[entidad.viabilidad_resumen] : STOCK_VACIO
  const meta = [
    entidad.organismo || null,
    entidad.tipo_cultivo ? t(CULTIVO_KEY[entidad.tipo_cultivo] ?? entidad.tipo_cultivo) : null,
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <button type="button" onClick={onClick} className={CARD_CLASS}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: stock }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[14.5px] font-medium tracking-[0.02em] text-cds-textPrimary">{entidad.codigo ?? "—"}</span>
        <CardEstadoBadge viabilidad={entidad.viabilidad_resumen} />
      </div>
      <div>
        <div className="text-base font-medium text-cds-textPrimary">{entidad.nombre ?? ""}</div>
        {meta ? <div className="mt-[7px] font-mono text-[12.5px] text-cds-textSecondary">{meta}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LineaChip />
      </div>
      <VialMeter n={entidad.nro_viales_total} color={stock} />
    </button>
  )
}

// Card de galería de un hongo/levadura: acento por viabilidad del stock, código +
// nombre, especie (itálica) como meta y el chip con el subtipo.
function HongoCard({ entidad, onClick }: { entidad: EntidadBiologica; onClick: () => void }) {
  const stock = entidad.viabilidad_resumen ? VIA_STOCK_COLOR[entidad.viabilidad_resumen] : STOCK_VACIO
  return (
    <button type="button" onClick={onClick} className={CARD_CLASS}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: stock }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[14.5px] font-medium tracking-[0.02em] text-cds-textPrimary">{entidad.codigo ?? "—"}</span>
        <CardEstadoBadge viabilidad={entidad.viabilidad_resumen} />
      </div>
      <div>
        <div className="text-base font-medium text-cds-textPrimary">{entidad.nombre ?? ""}</div>
        {entidad.especie ? <div className="mt-[7px] text-[12.5px] italic text-cds-textSecondary">{entidad.especie}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HongoChip subtipo={entidad.subtipo} />
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
  const [accession16s, setAccession16s] = useState("")
  const [accessionGenoma, setAccessionGenoma] = useState("")
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
      accession_16s: accession16s.trim() || null,
      accession_genoma: accessionGenoma.trim() || null,
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
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoAccession16s")}</span>
          <Input value={accession16s} onChange={(e) => setAccession16s(e.target.value)} placeholder="AB123456" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoAccessionGenoma")}</span>
          <Input value={accessionGenoma} onChange={(e) => setAccessionGenoma(e.target.value)} placeholder="GCA_000000000.1" />
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

function EditarIdentidadMicroForm({
  entidad,
  pending,
  onSubmit,
  onCancel,
}: {
  entidad: EntidadDetalle
  pending: boolean
  onSubmit: (data: CepEntidadActualizar) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState(entidad.nombre ?? "")
  const [taxon, setTaxon] = useState(entidad.taxon_presuntivo ?? "")
  const [origen, setOrigen] = useState(entidad.origen_muestra ?? "")
  const [medio, setMedio] = useState(entidad.medio_aislamiento ?? "")
  const [accession16s, setAccession16s] = useState(entidad.accession_16s ?? "")
  const [accessionGenoma, setAccessionGenoma] = useState(entidad.accession_genoma ?? "")
  const [bsl, setBsl] = useState(entidad.nivel_bioseguridad ?? "")

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit({
      nombre: nombre.trim() || null,
      taxon_presuntivo: taxon.trim() || null,
      origen_muestra: origen.trim() || null,
      medio_aislamiento: medio.trim() || null,
      accession_16s: accession16s.trim() || null,
      accession_genoma: accessionGenoma.trim() || null,
      nivel_bioseguridad: bsl.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="mt-5 border-t border-cds-borderSubtle pt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoNombre")}</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTaxon")}</span>
          <Input value={taxon} onChange={(e) => setTaxon(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoOrigen")}</span>
          <Input value={origen} onChange={(e) => setOrigen(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoBsl")}</span>
          <Input value={bsl} onChange={(e) => setBsl(e.target.value)} placeholder="BSL-1" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMedio")}</span>
          <Input value={medio} onChange={(e) => setMedio(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoAccession16s")}</span>
          <Input value={accession16s} onChange={(e) => setAccession16s(e.target.value)} placeholder="AB123456" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoAccessionGenoma")}</span>
          <Input value={accessionGenoma} onChange={(e) => setAccessionGenoma(e.target.value)} placeholder="GCA_000000000.1" />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" variant="primary" size="compact" disabled={pending}>
          {t("cepario.identidadGuardar")}
        </Button>
        <Button type="button" variant="ghost" size="compact" onClick={onCancel}>
          {t("cepario.identidadCancelar")}
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

// Alta de una línea celular: una sola identidad (BB-LC-NNN, estado 'activa'). Sin
// ciclo aislado→cepa ni ensayos bacterianos; el nº de pasaje vive en el vial.
function NuevaLineaForm({ pending, onSubmit }: { pending: boolean; onSubmit: (data: CepEntidadCrear) => void }) {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState("")
  const [organismo, setOrganismo] = useState("")
  const [tejido, setTejido] = useState("")
  const [tipoCultivo, setTipoCultivo] = useState("")
  const [morfologia, setMorfologia] = useState("")
  const [medio, setMedio] = useState("")
  const [ratioSplit, setRatioSplit] = useState("")
  const [micoplasma, setMicoplasma] = useState("")
  const [micoplasmaFecha, setMicoplasmaFecha] = useState("")
  const [pasajeMax, setPasajeMax] = useState("")
  const [refExterna, setRefExterna] = useState("")
  const [modGenetica, setModGenetica] = useState("")
  const [procedencia, setProcedencia] = useState("adquirida")
  const [bsl, setBsl] = useState("")

  function submit(event: FormEvent) {
    event.preventDefault()
    const pasaje = pasajeMax.trim() ? Number(pasajeMax) : null
    onSubmit({
      tipo: "linea_celular",
      nombre: nombre.trim() || null,
      organismo: organismo.trim() || null,
      tejido_origen: tejido.trim() || null,
      tipo_cultivo: tipoCultivo || null,
      morfologia: morfologia.trim() || null,
      medio_recomendado: medio.trim() || null,
      ratio_split: ratioSplit.trim() || null,
      micoplasma_estado: micoplasma || null,
      micoplasma_fecha: micoplasmaFecha.trim() || null,
      pasaje_maximo_recomendado: pasaje != null && Number.isFinite(pasaje) ? pasaje : null,
      referencia_externa: refExterna.trim() || null,
      modificacion_genetica: modGenetica.trim() || null,
      procedencia: procedencia || null,
      nivel_bioseguridad: bsl.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoNombre")}</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="HEK293T" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoOrganismo")}</span>
          <Input value={organismo} onChange={(e) => setOrganismo(e.target.value)} placeholder="Homo sapiens" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTejido")}</span>
          <Input value={tejido} onChange={(e) => setTejido(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTipoCultivo")}</span>
          <select className={SELECT_CLASS} value={tipoCultivo} onChange={(e) => setTipoCultivo(e.target.value)}>
            <option value="">{t("cepario.cultivoSinDef")}</option>
            {TIPOS_CULTIVO.map((c) => (
              <option key={c} value={c}>{t(CULTIVO_KEY[c])}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMorfologia")}</span>
          <Input value={morfologia} onChange={(e) => setMorfologia(e.target.value)} placeholder="epitelial" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMedioRec")}</span>
          <Input value={medio} onChange={(e) => setMedio(e.target.value)} placeholder="DMEM + 10% FBS" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoRatioSplit")}</span>
          <Input value={ratioSplit} onChange={(e) => setRatioSplit(e.target.value)} placeholder="1:8" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMicoplasma")}</span>
          <select className={SELECT_CLASS} value={micoplasma} onChange={(e) => setMicoplasma(e.target.value)}>
            <option value="">{t("cepario.micoSinDef")}</option>
            {MICOPLASMA.map((m) => (
              <option key={m} value={m}>{t(MICOPLASMA_KEY[m])}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMicoplasmaFecha")}</span>
          <Input type="date" value={micoplasmaFecha} onChange={(e) => setMicoplasmaFecha(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoPasajeMax")}</span>
          <Input type="number" min={0} value={pasajeMax} onChange={(e) => setPasajeMax(e.target.value)} placeholder="30" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoProcedencia")}</span>
          <select className={SELECT_CLASS} value={procedencia} onChange={(e) => setProcedencia(e.target.value)}>
            <option value="adquirida">{t("cepario.procAdquirida")}</option>
            <option value="disenada">{t("cepario.procDisenada")}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoRefExterna")}</span>
          <Input value={refExterna} onChange={(e) => setRefExterna(e.target.value)} placeholder="ATCC CRL-3216" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoBsl")}</span>
          <Input value={bsl} onChange={(e) => setBsl(e.target.value)} placeholder="BSL-2" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoModGenetica")}</span>
          <Input value={modGenetica} onChange={(e) => setModGenetica(e.target.value)} />
        </label>
      </div>
      <div className="mt-6">
        <Button type="submit" variant="primary" disabled={pending}>
          {t("cepario.guardarLinea")}
        </Button>
      </div>
    </form>
  )
}

function NuevaHongoForm({ pending, onSubmit }: { pending: boolean; onSubmit: (data: CepEntidadCrear) => void }) {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState("")
  const [subtipo, setSubtipo] = useState("")
  const [especie, setEspecie] = useState("")
  const [origen, setOrigen] = useState("")
  const [medio, setMedio] = useState("")
  const [temperatura, setTemperatura] = useState("")
  const [conservacion, setConservacion] = useState("")
  const [tipoSexual, setTipoSexual] = useState("")
  const [genotipo, setGenotipo] = useState("")
  const [morfologia, setMorfologia] = useState("")
  const [refColeccion, setRefColeccion] = useState("")
  const [ingenieria, setIngenieria] = useState("")
  const [procedencia, setProcedencia] = useState("adquirida")
  const [bsl, setBsl] = useState("")

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit({
      tipo: "hongo",
      nombre: nombre.trim() || null,
      subtipo: subtipo || null,
      especie: especie.trim() || null,
      origen_aislamiento: origen.trim() || null,
      medio_cultivo: medio.trim() || null,
      temperatura_optima: temperatura.trim() || null,
      forma_conservacion: conservacion || null,
      tipo_sexual: tipoSexual.trim() || null,
      genotipo_marcadores: genotipo.trim() || null,
      morfologia_colonia: morfologia.trim() || null,
      referencia_coleccion: refColeccion.trim() || null,
      ingenieria_genetica: ingenieria.trim() || null,
      procedencia: procedencia || null,
      nivel_bioseguridad: bsl.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoNombre")}</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="S. cerevisiae BY4741" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoSubtipo")}</span>
          <select className={SELECT_CLASS} value={subtipo} onChange={(e) => setSubtipo(e.target.value)}>
            <option value="">{t("cepario.subtipoSinDef")}</option>
            {SUBTIPOS_HONGO.map((s) => (
              <option key={s} value={s}>{t(SUBTIPO_HONGO_KEY[s])}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoEspecie")}</span>
          <Input value={especie} onChange={(e) => setEspecie(e.target.value)} placeholder="Saccharomyces cerevisiae" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoOrigenAislamiento")}</span>
          <Input value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="ATCC" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMedioCultivo")}</span>
          <Input value={medio} onChange={(e) => setMedio(e.target.value)} placeholder="YPD" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTemperaturaOptima")}</span>
          <Input value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="30 °C" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoFormaConservacion")}</span>
          <select className={SELECT_CLASS} value={conservacion} onChange={(e) => setConservacion(e.target.value)}>
            <option value="">{t("cepario.conservacionSinDef")}</option>
            {FORMAS_CONSERVACION.map((f) => (
              <option key={f} value={f}>{t(CONSERVACION_KEY[f])}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTipoSexual")}</span>
          <Input value={tipoSexual} onChange={(e) => setTipoSexual(e.target.value)} placeholder="MATa" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoProcedencia")}</span>
          <select className={SELECT_CLASS} value={procedencia} onChange={(e) => setProcedencia(e.target.value)}>
            <option value="adquirida">{t("cepario.procAdquirida")}</option>
            <option value="disenada">{t("cepario.procDisenada")}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoRefColeccion")}</span>
          <Input value={refColeccion} onChange={(e) => setRefColeccion(e.target.value)} placeholder="ATCC 201388" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoBsl")}</span>
          <Input value={bsl} onChange={(e) => setBsl(e.target.value)} placeholder="BSL-1" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoGenotipo")}</span>
          <Input value={genotipo} onChange={(e) => setGenotipo(e.target.value)} placeholder="his3Δ1 leu2Δ0 ura3Δ0" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoMorfColonia")}</span>
          <Input value={morfologia} onChange={(e) => setMorfologia(e.target.value)} placeholder="colonias cremosas lisas" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoIngenieria")}</span>
          <Input value={ingenieria} onChange={(e) => setIngenieria(e.target.value)} />
        </label>
      </div>
      <div className="mt-6">
        <Button type="submit" variant="primary" disabled={pending}>
          {t("cepario.guardarHongo")}
        </Button>
      </div>
    </form>
  )
}

// Las cajas (cryoboxes) viven en el inventario (categoría "Caja criogénica"); el
// cepario solo las lista (vía /cepario/cajas) para seleccionar al congelar y para
// el mapa visual. No se administran desde el cepario.
function CongelarVialesForm({ pending, onSubmit, sugerirCeldas, cajas, defaultTemperatura = "-80", esLinea = false, viales = [] }: { pending: boolean; onSubmit: (data: CepStockCrear) => void; sugerirCeldas: (cajaEquipamientoId: number, cantidad: number) => Promise<string[]>; cajas: CepCaja[]; defaultTemperatura?: string; esLinea?: boolean; viales?: CeparioVial[] }) {
  const { t } = useTranslation()
  const [nroViales, setNroViales] = useState("1")
  const [cajaId, setCajaId] = useState("")
  const [celdas, setCeldas] = useState("")
  const [celdasTocadas, setCeldasTocadas] = useState(false)
  const [sugiriendo, setSugiriendo] = useState(false)
  const [sugerenciaInfo, setSugerenciaInfo] = useState<string | null>(null)
  const [temperatura, setTemperatura] = useState(defaultTemperatura)
  const [crio, setCrio] = useState("")
  const [viabilidad, setViabilidad] = useState<CeparioViabilidad>("viable")
  const [medioRepique, setMedioRepique] = useState("")
  // Líneas celulares: nº de pasaje de esta tanda y vial del que se expandió.
  const [pasaje, setPasaje] = useState("")
  const [origenStockId, setOrigenStockId] = useState("")
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // Mientras el usuario no edite las celdas a mano, las prellenamos con las
  // próximas libres de la caja (llenado secuencial A1, A2, A3…). Un tubo por celda.
  useEffect(() => {
    const n = Number(nroViales)
    const id = Number(cajaId)
    if (celdasTocadas) return
    if (!id || !Number.isFinite(n) || n <= 0) {
      setCeldas("")
      setSugerenciaInfo(null)
      return
    }
    let cancelado = false
    setSugiriendo(true)
    sugerirCeldas(id, n)
      .then((cs) => {
        if (cancelado) return
        setCeldas(cs.join(", "))
        setSugerenciaInfo(null)
      })
      .catch(() => {
        if (cancelado) return
        setCeldas("")
        setSugerenciaInfo(t("cepario.celdasSinSugerencia"))
      })
      .finally(() => {
        if (!cancelado) setSugiriendo(false)
      })
    return () => {
      cancelado = true
    }
  }, [cajaId, nroViales, celdasTocadas, sugerirCeldas, t])

  function submit(event: FormEvent) {
    event.preventDefault()
    const n = Number(nroViales)
    if (!Number.isFinite(n) || n <= 0) {
      setErrorForm(t("cepario.faltaViales"))
      return
    }
    if (!cajaId) {
      setErrorForm(t("cepario.faltaCaja"))
      return
    }
    const celdasList = celdas
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
    if (celdasList.length > 0 && celdasList.length !== n) {
      setErrorForm(t("cepario.celdasNoCoincide", { n, celdas: celdasList.length }))
      return
    }
    setErrorForm(null)
    const base = {
      caja_equipamiento_id: Number(cajaId),
      temperatura: temperatura.trim() || null,
      crioprotectante: crio.trim() || null,
      viabilidad,
      medio_repique: medioRepique.trim() || null,
      // Pasaje y genealogía solo aplican a líneas celulares.
      ...(esLinea
        ? {
            pasaje: pasaje.trim() ? Number(pasaje) : null,
            origen_stock_id: origenStockId ? Number(origenStockId) : null,
          }
        : {}),
    }
    // Con celdas explícitas mandamos `posiciones` (las define una a una, sirve para
    // dispersar); sin celdas, `nro_viales` y el backend autoasigna las próximas libres.
    onSubmit(celdasList.length > 0 ? { ...base, posiciones: celdasList } : { ...base, nro_viales: n })
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
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoCaja")}</span>
          <select className={SELECT_CLASS} value={cajaId} onChange={(e) => { setCajaId(e.target.value); setCeldasTocadas(false) }}>
            <option value="">{cajas.length ? t("cepario.cajaElegir") : t("cepario.cajaSinCajas")}</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoTemperatura")}</span>
          <Input value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 flex items-center justify-between text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">
            <span>{t("cepario.campoCeldas")}</span>
            <button
              type="button"
              className="underline hover:text-cds-textPrimary disabled:opacity-50"
              disabled={!cajaId || sugiriendo}
              onClick={() => {
                setCeldasTocadas(false)
                setSugerenciaInfo(null)
              }}
            >
              {t("cepario.celdasSugerir")}
            </button>
          </span>
          <Input value={celdas} onChange={(e) => { setCeldas(e.target.value); setCeldasTocadas(true) }} placeholder="A1, A2, A3" />
          <span className="mt-1 block text-xs text-cds-textSecondary">
            {sugiriendo ? t("cepario.celdasSugiriendo") : sugerenciaInfo ?? t("cepario.celdasAyuda")}
          </span>
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
        {esLinea ? (
          <>
            <label className="block">
              <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoPasaje")}</span>
              <Input type="number" min={0} value={pasaje} onChange={(e) => setPasaje(e.target.value)} placeholder="18" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.campoOrigenVial")}</span>
              <select className={SELECT_CLASS} value={origenStockId} onChange={(e) => setOrigenStockId(e.target.value)}>
                <option value="">{t("cepario.origenSinVial")}</option>
                {viales.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.codigo_interno}{v.pasaje != null ? ` · P${v.pasaje}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>
      <div className="mt-4">
        <Button type="submit" variant="primary" size="compact" disabled={pending}>
          {t("cepario.guardarCongelar")}
        </Button>
      </div>
    </form>
  )
}

// Acciones de un vial individual (un tubo = una fila). Como cada acción opera sobre
// ESE tubo, no hay campo "cantidad" (siempre 1) ni 'ajuste': se elige la acción
// (descongelar/repique/descarte) y, opcionalmente, motivo + consumo de inventario.
const ACCIONES_VIAL: CepMovimientoTipo[] = ["descongelar", "repique", "descarte"]

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
  const [accion, setAccion] = useState<CepMovimientoTipo | null>(null)
  const [motivo, setMotivo] = useState("")
  const [conConsumo, setConConsumo] = useState(false)
  const [reactivoId, setReactivoId] = useState("")
  const [loteId, setLoteId] = useState("")
  const [consumoCantidad, setConsumoCantidad] = useState("1")
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // 'descarte' solo si el rol puede (el backend igual lo gatea por descartar_stock).
  const acciones = ACCIONES_VIAL.filter((tp) => tp !== "descarte" || puedeDescartar)

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

  function confirmar(event: FormEvent) {
    event.preventDefault()
    if (!accion) {
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
    // Un tubo por fila: la acción saca ESE vial → cantidad implícita = 1.
    onSubmit({ tipo: accion, cantidad: 1, motivo: motivo.trim() || null, consumo_inventario: consumo })
  }

  // Botón de variante según la acción (descarte es destructivo → rojo sutil vía secondary).
  return (
    <div className="mt-2 border border-cds-borderSubtle bg-cds-background p-3">
      {/* Acciones directas: cada una opera sobre este tubo. */}
      <div className="flex flex-wrap items-center gap-2">
        {acciones.map((tp) => (
          <button
            key={tp}
            type="button"
            onClick={() => { setAccion(tp); setErrorForm(null) }}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-4 text-sm tracking-[0.16px] ring-1 ring-inset transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus",
              accion === tp
                ? "bg-lab-ceparioTint text-cds-textPrimary ring-lab-cepario/40"
                : "text-cds-textSecondary ring-cds-borderSubtle hover:text-cds-textPrimary",
            )}
          >
            {t(`cepario.mov_${tp}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto text-sm text-cds-textSecondary underline hover:text-cds-textPrimary"
        >
          {t("cepario.movCancelar")}
        </button>
      </div>

      {accion ? (
        <form onSubmit={confirmar} className="mt-3 border-t border-cds-borderSubtle pt-3">
          {errorForm ? (
            <div className="mb-3 border-l-4 border-cds-supportError px-3 py-2 text-sm">{errorForm}</div>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary">{t("cepario.movMotivo")}</span>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={t("cepario.movMotivoPh")} />
          </label>

          {/* Costura opcional: descontar un reactivo real del inventario (típico en repique). */}
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
            <Button type="submit" variant="primary" size="compact" disabled={pending}>{t("cepario.movConfirmar")}</Button>
            <Button type="button" variant="secondary" size="compact" onClick={() => setAccion(null)}>{t("cepario.movVolver")}</Button>
          </div>
        </form>
      ) : null}
    </div>
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
        {ENSAYOS.map(({ campo, key, hint }) => {
          const valor = ensayos[campo] ?? ""
          const opciones = CAMPOS_CARAC_TEXTO_LIBRE.has(campo) ? null : OPCIONES_ENSAYO[campo]
          const valorFueraDeLista = valor && opciones && !opciones.some((opcion) => opcion.value === valor)
          return (
            <label key={campo} className="block">
              <span className="mb-1 block text-xs text-cds-textSecondary">{t(key)}</span>
              {opciones ? (
                <select className={CARAC_SELECT_CLASS} value={valor} onChange={(e) => setEnsayo(campo, e.target.value)}>
                  <option value="">—</option>
                  {valorFueraDeLista ? <option value={valor}>{valor}</option> : null}
                  {opciones.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {etiquetaOpcionEnsayo(opcion, t)}
                    </option>
                  ))}
                </select>
              ) : (
                <Input value={valor} onChange={(e) => setEnsayo(campo, e.target.value)} placeholder={hint} />
              )}
            </label>
          )
        })}
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

function textoCampo(value: unknown) {
  if (value == null || value === "") {
    return null
  }
  return String(value)
}

function textoItem(item: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = textoCampo(item[key])
    if (value) {
      return value
    }
  }
  return null
}

function unirPartes(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ")
}

function registrosBacdive(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
}

function listaBacdive(values: Array<string | null | undefined>, limite = 3) {
  const visibles = values.filter((value): value is string => Boolean(value)).slice(0, limite)
  return visibles.length > 0 ? visibles.join(" · ") : null
}

function formatoEnsayo(item: Record<string, unknown>, valueKeys: string[], typeKeys: string[] = []) {
  const value = textoItem(item, ...valueKeys)
  if (!value) {
    return null
  }
  const type = textoItem(item, ...typeKeys)
  const growth = textoItem(item, "growth", "ability")
  return unirPartes(value, type, growth)
}

function renderMediosBacdive(mediaItems: Array<Record<string, unknown>>) {
  const visibles = mediaItems
    .map((item) => ({
      name: textoItem(item, "name", "medium_name"),
      link: textoItem(item, "link", "media_link"),
    }))
    .filter((item): item is { name: string; link: string | null } => Boolean(item.name))
    .slice(0, 3)

  if (visibles.length === 0) {
    return null
  }

  return (
    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-1">
      {visibles.map((item, index) => (
        <span key={`${item.name}-${index}`} className="inline-flex gap-1">
          {index > 0 ? <span className="text-cds-textSecondary">·</span> : null}
          {item.link ? (
            <a className="text-cds-linkPrimary hover:text-cds-linkPrimaryHover" href={item.link} target="_blank" rel="noreferrer">
              {item.name}
            </a>
          ) : (
            <span>{item.name}</span>
          )}
        </span>
      ))}
    </span>
  )
}

function formatearFechaBacdive(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const normalizada = value.includes("T") ? value : value.replace(" ", "T")
  const date = new Date(normalizada)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function limpiarConsultaBacdive(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function consultaInicialBacdive(entidad: EntidadDetalle) {
  const accessionGenoma = limpiarConsultaBacdive(entidad.accession_genoma)
  if (accessionGenoma) {
    return { query: accessionGenoma, tipo: "sequence_genome" as CepBacdiveTipoBusqueda }
  }

  const accession16s = limpiarConsultaBacdive(entidad.accession_16s)
  if (accession16s) {
    return { query: accession16s, tipo: "sequence_16s" as CepBacdiveTipoBusqueda }
  }

  const taxon = limpiarConsultaBacdive(entidad.taxon_presuntivo)
  if (taxon) {
    return { query: taxon, tipo: "taxon" as CepBacdiveTipoBusqueda }
  }

  const nombre = limpiarConsultaBacdive(entidad.nombre)
  if (nombre) {
    return { query: nombre, tipo: "taxon" as CepBacdiveTipoBusqueda }
  }

  return { query: "", tipo: "taxon" as CepBacdiveTipoBusqueda }
}

function taxonLocalBacdive(entidad: EntidadDetalle) {
  return limpiarConsultaBacdive(entidad.taxon_presuntivo) || limpiarConsultaBacdive(entidad.nombre)
}

function tokensTaxon(value: unknown) {
  const tokens = String(value ?? "")
    .toLocaleLowerCase("es")
    .replace(/[_()[\]{}.,;:]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !TAXON_TOKENS_IGNORADOS.has(part))
  return {
    genus: tokens[0] ?? null,
    species: tokens[1] ?? null,
  }
}

function taxonCandidato(resumen: CepBacdiveCandidate["payload_resumen"]) {
  const tax = resumen.taxonomia ?? {}
  const desdeSpecies = tokensTaxon(tax.species)
  if (desdeSpecies.genus) {
    return desdeSpecies
  }
  const desdeNombre = tokensTaxon(tax.full_scientific_name)
  if (desdeNombre.genus) {
    return desdeNombre
  }
  const genus = textoCampo(tax.genus)?.toLocaleLowerCase("es") ?? null
  return { genus, species: null }
}

function taxonBacdiveLegible(resumen: CepBacdiveCandidate["payload_resumen"]) {
  const tax = resumen.taxonomia ?? {}
  return (
    textoCampo(tax.full_scientific_name) ??
    textoCampo(tax.species) ??
    (unirPartes(textoCampo(tax.genus), textoCampo(tax.species_epithet)) ||
      textoCampo(tax.genus) ||
      textoCampo(resumen.titulo))
  )
}

function tipoMatchTaxon(local: string, resumen: CepBacdiveCandidate["payload_resumen"]) {
  const localTaxon = tokensTaxon(local)
  const candidato = taxonCandidato(resumen)
  if (!localTaxon.genus || !candidato.genus) {
    return null
  }
  if (localTaxon.genus !== candidato.genus) {
    return "revisar"
  }
  if (localTaxon.species && candidato.species && localTaxon.species === candidato.species) {
    return "exacto"
  }
  return "genero"
}

function esTypeStrain(value: unknown) {
  if (value === true) {
    return true
  }
  const text = textoCampo(value)?.toLocaleLowerCase("es")
  return text === "true" || text === "yes" || text === "1" || text === "type strain"
}

function normalizarBsl(value: unknown) {
  const text = textoCampo(value)?.replace(/\s+/g, " ").trim()
  if (!text) {
    return null
  }
  const match = text.match(/\b(?:BSL|Biosafety level|Bioseguridad|Risk group|Grupo de riesgo|RG)?[-\s:]*(1|2|3|4)\b/i)
  return match ? Number(match[1]) : null
}

function etiquetaBsl(value: number) {
  return `BSL ${value}`
}

function etiquetaBslValor(value: unknown) {
  const bsl = normalizarBsl(value)
  return bsl == null ? textoCampo(value) : etiquetaBsl(bsl)
}

function patogenicidadReportada(value: unknown) {
  const text = textoCampo(value)?.toLocaleLowerCase("es").trim()
  if (!text) {
    return false
  }
  if (["no", "none", "negative", "-", "false", "non-pathogenic", "not pathogenic"].includes(text)) {
    return false
  }
  if (text.includes("non-pathogenic") || text.includes("not pathogenic")) {
    return false
  }
  return ["yes", "positive", "+", "pathogenic", "opportunistic", "risk"].some((term) => text.includes(term))
}

function tiposPatogenicidad(seguridad: Record<string, unknown>, t: (key: string) => string) {
  const tipos = [
    patogenicidadReportada(seguridad.pathogenicity_human) ? t("cepario.bacdiveHumano") : null,
    patogenicidadReportada(seguridad.pathogenicity_animal) ? t("cepario.bacdiveAnimal") : null,
    patogenicidadReportada(seguridad.pathogenicity_plant) ? t("cepario.bacdivePlanta") : null,
  ].filter(Boolean)
  return tipos.join(" / ")
}

function tieneDesignacionLocal(entidad: EntidadDetalle) {
  const nombre = limpiarConsultaBacdive(entidad.nombre)
  if (!nombre) {
    return false
  }
  const taxon = limpiarConsultaBacdive(entidad.taxon_presuntivo)
  return !taxon || nombre.toLocaleLowerCase("es") !== taxon.toLocaleLowerCase("es")
}

function alertasConflictoBacdive(
  entidad: EntidadDetalle,
  resumen: CepBacdiveCandidate["payload_resumen"],
  t: (key: string) => string,
) {
  const alertas: Array<{
    id: string
    key: string
    values: Record<string, string>
    tone: "danger" | "warn"
  }> = []
  const seguridad = resumen.seguridad ?? {}
  const bslBacdive = normalizarBsl(seguridad.biosafety_level)
  const bslLocal = normalizarBsl(entidad.nivel_bioseguridad)
  if (bslBacdive != null && bslLocal != null && bslBacdive !== bslLocal) {
    alertas.push({
      id: "bsl",
      key: "cepario.bacdiveAlertaBslConflicto",
      values: { bacdive: etiquetaBsl(bslBacdive), local: etiquetaBsl(bslLocal) },
      tone: bslBacdive > bslLocal ? "danger" : "warn",
    })
  }

  const localLabel = taxonLocalBacdive(entidad)
  const localTaxon = tokensTaxon(localLabel)
  const externoTaxon = taxonCandidato(resumen)
  const externoLabel = taxonBacdiveLegible(resumen)
  const conflictoGenero = localTaxon.genus && externoTaxon.genus && localTaxon.genus !== externoTaxon.genus
  const conflictoEspecie = (
    localTaxon.genus &&
    externoTaxon.genus &&
    localTaxon.genus === externoTaxon.genus &&
    localTaxon.species &&
    externoTaxon.species &&
    localTaxon.species !== externoTaxon.species
  )
  if ((conflictoGenero || conflictoEspecie) && localLabel && externoLabel) {
    alertas.push({
      id: "taxon",
      key: "cepario.bacdiveAlertaTaxonConflicto",
      values: { local: localLabel, bacdive: externoLabel },
      tone: "warn",
    })
  }

  const patogenicidad = tiposPatogenicidad(seguridad, t)
  if (patogenicidad && bslLocal == null) {
    alertas.push({
      id: "patogenicidad-sin-bsl",
      key: "cepario.bacdiveAlertaPatogenicidadSinBsl",
      values: { tipos: patogenicidad },
      tone: "danger",
    })
  } else if (patogenicidad && bslLocal != null && bslLocal <= 1) {
    alertas.push({
      id: "patogenicidad-bsl-bajo",
      key: "cepario.bacdiveAlertaPatogenicidadBslBajo",
      values: { tipos: patogenicidad, local: etiquetaBsl(bslLocal) },
      tone: "danger",
    })
  }

  const tax = resumen.taxonomia ?? {}
  const designacion = textoCampo(tax.strain_designation)
  if (esTypeStrain(tax.type_strain) && designacion && !tieneDesignacionLocal(entidad)) {
    alertas.push({
      id: "type-strain-designacion",
      key: "cepario.bacdiveAlertaTypeStrainSinDesignacion",
      values: { designacion },
      tone: "warn",
    })
  }

  return alertas
}

function etiquetaBusquedaBacdive(queryUsada?: string | null) {
  const tipo = (queryUsada ?? "").split(":", 1)[0]
  const keyByTipo: Record<string, string> = {
    taxon: "cepario.bacdiveOrigenTaxon",
    culture_collection: "cepario.bacdiveOrigenColeccion",
    bacdive_id: "cepario.bacdiveOrigenId",
    sequence_16s: "cepario.bacdiveOrigen16s",
    sequence_genome: "cepario.bacdiveOrigenGenoma",
  }
  return keyByTipo[tipo] ?? null
}

function MatchChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "ok" | "warn" | "accent"
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.16px] ring-1",
        tone === "ok" && "bg-lab-sageBg text-cds-supportSuccess ring-cds-supportSuccess/30",
        tone === "warn" && "bg-lab-warmTint text-lab-warmFg ring-lab-warm/30",
        tone === "accent" && "bg-lab-ceparioTint text-lab-cepario ring-lab-cepario/30",
        tone === "neutral" && "bg-cds-background text-cds-textSecondary ring-cds-borderSubtle",
      )}
    >
      {children}
    </span>
  )
}

function BacDiveSenales({
  resumen,
  queryUsada,
  taxonLocal,
}: {
  resumen: CepBacdiveCandidate["payload_resumen"]
  queryUsada?: string | null
  taxonLocal: string
}) {
  const { t } = useTranslation()
  const tax = resumen.taxonomia ?? {}
  const match = tipoMatchTaxon(taxonLocal, resumen)
  const origenKey = etiquetaBusquedaBacdive(queryUsada)
  const designacion = textoCampo(tax.strain_designation)
  const colecciones = (resumen.colecciones ?? []).filter(Boolean).slice(0, 3)

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {origenKey ? <MatchChip>{t("cepario.bacdiveOrigenBusqueda", { tipo: t(origenKey) })}</MatchChip> : null}
      {match === "exacto" ? <MatchChip tone="ok">{t("cepario.bacdiveMatchExacto")}</MatchChip> : null}
      {match === "genero" ? <MatchChip tone="accent">{t("cepario.bacdiveMatchGenero")}</MatchChip> : null}
      {match === "revisar" ? <MatchChip tone="warn">{t("cepario.bacdiveMatchRevisar")}</MatchChip> : null}
      {esTypeStrain(tax.type_strain) ? <MatchChip tone="accent">{t("cepario.bacdiveTypeStrain")}</MatchChip> : null}
      {designacion ? <MatchChip>{t("cepario.bacdiveDesignacion", { valor: designacion })}</MatchChip> : null}
      {colecciones.map((coleccion) => (
        <MatchChip key={coleccion}>{t("cepario.bacdiveColeccionChip", { valor: coleccion })}</MatchChip>
      ))}
    </div>
  )
}

function BacDiveAlertasConflicto({
  entidad,
  resumen,
}: {
  entidad: EntidadDetalle
  resumen: CepBacdiveCandidate["payload_resumen"]
}) {
  const { t } = useTranslation()
  const alertas = alertasConflictoBacdive(entidad, resumen, t)
  if (alertas.length === 0) {
    return null
  }
  return (
    <div className="mt-3 grid gap-2">
      {alertas.map((alerta) => (
        <div
          key={alerta.id}
          className={cn(
            "flex items-start gap-2 border-l-4 px-3 py-2 text-sm",
            alerta.tone === "danger" && "border-cds-supportError bg-lab-critTint text-cds-supportError",
            alerta.tone === "warn" && "border-lab-warm bg-lab-warmTint text-lab-warmFg",
          )}
        >
          <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
          <span>{t(alerta.key, alerta.values)}</span>
        </div>
      ))}
    </div>
  )
}

function BacDiveFicha({ resumen }: { resumen: CepBacdiveCandidate["payload_resumen"] }) {
  const { t } = useTranslation()
  const tax = resumen.taxonomia ?? {}
  const morph = resumen.morfologia ?? {}
  const enz = resumen.enzimas ?? {}
  const metabolismo = resumen.metabolismo as {
    compuestos_producidos?: Array<Record<string, unknown>>
    fatty_acids?: Array<Record<string, unknown>>
    pathways?: Array<Record<string, unknown>>
    antibiograma?: Array<Record<string, unknown>>
    sensibilidad_antibioticos?: Array<Record<string, unknown>>
  } | undefined
  const crecimiento = resumen.crecimiento as {
    media?: Array<Record<string, unknown>>
    temperatures?: Array<Record<string, unknown>>
    ph?: Array<Record<string, unknown>>
    oxygen?: Array<Record<string, unknown>>
    salinity?: Array<Record<string, unknown>>
  } | undefined
  const aislamiento = resumen.aislamiento ?? {}
  const seguridad = resumen.seguridad ?? {}
  const media = renderMediosBacdive(crecimiento?.media ?? [])
  const colonias = listaBacdive(registrosBacdive(morph.colony_morphology).map((m) => (
    unirPartes(
      textoItem(m, "color"),
      textoItem(m, "shape"),
      textoItem(m, "size"),
      textoItem(m, "medium_name"),
    )
  )))
  const pigmentacion = listaBacdive(registrosBacdive(morph.pigmentation).map((m) => (
    unirPartes(
      textoItem(m, "name"),
      textoItem(m, "color"),
      textoItem(m, "production"),
    )
  )))
  const enzimasExtendidas = listaBacdive(registrosBacdive(enz.items)
    .filter((m) => {
      const nombre = textoItem(m, "enzyme")?.toLocaleLowerCase("es")
      return nombre && !["catalase", "oxidase", "cytochrome-c oxidase", "urease"].includes(nombre)
    })
    .map((m) => unirPartes(textoItem(m, "enzyme"), textoItem(m, "activity"), textoItem(m, "ec_number"))), 4)
  const antibiograma = listaBacdive(registrosBacdive(metabolismo?.antibiograma).map((m) => {
    const zona = textoItem(m, "zone_mm")
    return unirPartes(textoItem(m, "antibiotic"), zona ? `${zona} mm` : null)
  }), 4)
  const sensibilidadAntibioticos = listaBacdive(registrosBacdive(metabolismo?.sensibilidad_antibioticos).map((m) => {
    const estados = [
      textoItem(m, "sensitive") ? `S ${textoItem(m, "sensitive")}` : null,
      textoItem(m, "intermediate") ? `I ${textoItem(m, "intermediate")}` : null,
      textoItem(m, "resistant") ? `R ${textoItem(m, "resistant")}` : null,
    ].filter(Boolean).join(" / ")
    return unirPartes(textoItem(m, "antibiotic"), estados || null)
  }), 4)
  const compuestos = listaBacdive(registrosBacdive(metabolismo?.compuestos_producidos).map((m) => (
    unirPartes(
      textoItem(m, "compound"),
      textoItem(m, "production"),
      textoItem(m, "excreted") === "true" ? t("cepario.bacdiveExcretado") : null,
    )
  )), 4)
  const fattyAcids = listaBacdive(registrosBacdive(metabolismo?.fatty_acids).map((m) => {
    const percent = textoItem(m, "percent")
    return unirPartes(textoItem(m, "name"), percent ? `${percent}%` : null)
  }), 4)
  const pathways = listaBacdive(registrosBacdive(metabolismo?.pathways).map((m) => {
    const coverage = textoItem(m, "coverage")
    return unirPartes(textoItem(m, "pathway"), coverage ? `${coverage}%` : null)
  }), 4)
  const temps = crecimiento?.temperatures?.map((m) => formatoEnsayo(m, ["temperature", "temp"], ["type", "test_type"])).filter(Boolean).slice(0, 3) ?? []
  const ph = crecimiento?.ph?.map((m) => formatoEnsayo(m, ["ph", "pH"], ["type", "test_type", "range"])).filter(Boolean).slice(0, 3) ?? []
  const oxygen = crecimiento?.oxygen?.map((m) => textoItem(m, "value", "oxygen_tol")).filter(Boolean).slice(0, 3) ?? []
  const salinity = crecimiento?.salinity?.map((m) => {
    const concentration = unirPartes(textoItem(m, "concentration", "salt_concentration"), textoItem(m, "unit", "salt_concentration_unit"))
    return unirPartes(textoItem(m, "halophily", "value"), textoItem(m, "salt"), concentration, textoItem(m, "growth", "ability"))
  }).filter(Boolean).slice(0, 3) ?? []
  const origen = unirPartes(
    textoCampo(aislamiento.sample_type),
    textoCampo(aislamiento.host_species),
    textoCampo(aislamiento.geo_loc_name) ?? textoCampo(aislamiento.country),
    textoCampo(aislamiento.isolation_date),
  )
  const bioseguridad = unirPartes(
    etiquetaBslValor(seguridad.biosafety_level),
    textoCampo(seguridad.biosafety_level_comment),
  )
  const patogenicidad = unirPartes(
    textoCampo(seguridad.pathogenicity_human) ? `${t("cepario.bacdiveHumano")}: ${textoCampo(seguridad.pathogenicity_human)}` : null,
    textoCampo(seguridad.pathogenicity_animal) ? `${t("cepario.bacdiveAnimal")}: ${textoCampo(seguridad.pathogenicity_animal)}` : null,
    textoCampo(seguridad.pathogenicity_plant) ? `${t("cepario.bacdivePlanta")}: ${textoCampo(seguridad.pathogenicity_plant)}` : null,
  )
  const filas: Array<{ label: string; value: ReactNode | null }> = [
    { label: t("cepario.bacdiveDatoTaxon"), value: textoCampo(tax.full_scientific_name) ?? textoCampo(tax.species) ?? textoCampo(tax.genus) },
    { label: t("cepario.bacdiveDatoGram"), value: textoCampo(morph.gram) },
    { label: t("cepario.bacdiveDatoMotilidad"), value: textoCampo(morph.motility) },
    { label: t("cepario.bacdiveDatoTamanoCelular"), value: textoCampo(morph.cell_size) },
    { label: t("cepario.bacdiveDatoFlagelos"), value: textoCampo(morph.flagellum_arrangement) },
    { label: t("cepario.bacdiveDatoMorfologiaColonia"), value: colonias },
    { label: t("cepario.bacdiveDatoPigmentacion"), value: pigmentacion },
    { label: t("cepario.bacdiveDatoCatalasa"), value: textoCampo(enz.catalase) },
    { label: t("cepario.bacdiveDatoOxidasa"), value: textoCampo(enz.oxidase) },
    { label: t("cepario.bacdiveDatoUreasa"), value: textoCampo(enz.urease) },
    { label: t("cepario.bacdiveDatoEnzimasExtendidas"), value: enzimasExtendidas },
    { label: t("cepario.bacdiveDatoAntibiograma"), value: antibiograma },
    { label: t("cepario.bacdiveDatoSensibilidadAntibioticos"), value: sensibilidadAntibioticos },
    { label: t("cepario.bacdiveDatoCompuestos"), value: compuestos },
    { label: t("cepario.bacdiveDatoFattyAcids"), value: fattyAcids },
    { label: t("cepario.bacdiveDatoPathways"), value: pathways },
    { label: t("cepario.bacdiveDatoMedios"), value: media },
    { label: t("cepario.bacdiveDatoTemperatura"), value: temps.join(" · ") },
    { label: t("cepario.bacdiveDatoPh"), value: ph.join(" · ") },
    { label: t("cepario.bacdiveDatoOxigeno"), value: oxygen.join(" · ") },
    { label: t("cepario.bacdiveDatoSalinidad"), value: salinity.join(" · ") },
    { label: t("cepario.bacdiveDatoOrigen"), value: origen },
    { label: t("cepario.bacdiveDatoBioseguridad"), value: bioseguridad },
    { label: t("cepario.bacdiveDatoPatogenicidad"), value: patogenicidad },
  ].filter(({ value }) => value != null && value !== "")

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {filas.map(({ label, value }) => (
        <div key={label} className="border-l border-cds-borderSubtle pl-3">
          <div className="text-[11px] uppercase tracking-[0.32px] text-cds-textSecondary">{label}</div>
          <div className="text-sm text-cds-textPrimary">{value}</div>
        </div>
      ))}
    </div>
  )
}

function BacDiveReferencias({
  entidad,
  consultaInicial,
  taxonLocal,
  referencias,
  candidatos,
  puedeConfirmar,
  pendingBuscar,
  pendingGuardar,
  pendingDescartar,
  pendingRefresh,
  pendingParche,
  pendingAplicarParche,
  parches,
  onBuscar,
  onConfirmar,
  onDescartarCandidato,
  onDescartarReferencia,
  onActualizarReferencia,
  onCargarParche,
  onAplicarParche,
}: {
  entidad: EntidadDetalle
  consultaInicial: { query: string; tipo: CepBacdiveTipoBusqueda }
  taxonLocal: string
  referencias: CepReferenciaExterna[]
  candidatos: CepBacdiveCandidate[]
  puedeConfirmar: boolean
  pendingBuscar: boolean
  pendingGuardar: boolean
  pendingDescartar: boolean
  pendingRefresh: boolean
  pendingParche: boolean
  pendingAplicarParche: boolean
  parches: Record<number, CepBacdivePatch | undefined>
  onBuscar: (q: string, tipo: CepBacdiveTipoBusqueda) => void
  onConfirmar: (candidato: CepBacdiveCandidate) => void
  onDescartarCandidato: (externalId: string) => void
  onDescartarReferencia: (referenciaId: number) => void
  onActualizarReferencia: (referenciaId: number) => void
  onCargarParche: (referenciaId: number) => void
  onAplicarParche: (referenciaId: number, campos: string[]) => void
}) {
  const { t } = useTranslation()
  const [consulta, setConsulta] = useState(consultaInicial.query)
  const [tipoBusqueda, setTipoBusqueda] = useState<CepBacdiveTipoBusqueda>(consultaInicial.tipo)
  const [parcheAbierto, setParcheAbierto] = useState<number | null>(null)
  const [seleccionPatch, setSeleccionPatch] = useState<Record<number, string[]>>({})
  const referenciasBacdive = referencias.filter((r) => r.fuente === "bacdive")
  const vinculados = new Set(referenciasBacdive.map((r) => r.external_id))

  useEffect(() => {
    setConsulta(consultaInicial.query)
    setTipoBusqueda(consultaInicial.tipo)
  }, [consultaInicial.query, consultaInicial.tipo])

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = consulta.trim()
    if (q) {
      onBuscar(q, tipoBusqueda)
    }
  }

  function toggleParche(refId: number) {
    const siguiente = parcheAbierto === refId ? null : refId
    setParcheAbierto(siguiente)
    if (siguiente && !parches[siguiente]) {
      onCargarParche(siguiente)
    }
  }

  function toggleCampo(refId: number, campo: string) {
    setSeleccionPatch((actual) => {
      const actuales = actual[refId] ?? []
      const nuevos = actuales.includes(campo)
        ? actuales.filter((c) => c !== campo)
        : [...actuales, campo]
      return { ...actual, [refId]: nuevos }
    })
  }

  function seleccionPara(refId: number, patch?: CepBacdivePatch) {
    if (seleccionPatch[refId]) {
      return seleccionPatch[refId]
    }
    return patch?.preseleccionados ?? patch?.aplicables ?? []
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cds-borderSubtle pb-2">
        <h2 className="text-sm font-medium tracking-[0.16px] text-cds-textPrimary">{t("cepario.refExternas")}</h2>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <select
            className="h-10 border border-cds-borderSubtle bg-cds-field px-3 text-sm text-cds-textPrimary"
            value={tipoBusqueda}
            onChange={(e) => setTipoBusqueda(e.target.value as CepBacdiveTipoBusqueda)}
            aria-label={t("cepario.bacdiveTipo")}
          >
            <option value="taxon">{t("cepario.bacdiveTaxon")}</option>
            <option value="culture_collection">{t("cepario.bacdiveColeccion")}</option>
            <option value="bacdive_id">{t("cepario.bacdiveId")}</option>
            <option value="sequence_16s">{t("cepario.bacdive16s")}</option>
            <option value="sequence_genome">{t("cepario.bacdiveGenoma")}</option>
          </select>
          <Input
            className="h-10 min-w-[220px]"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder={t("cepario.bacdiveBuscarPh")}
          />
          <Button type="submit" variant="secondary" size="compact" disabled={pendingBuscar || !consulta.trim()}>
            <Search size={16} aria-hidden="true" />
            {pendingBuscar ? t("cepario.bacdiveBuscando") : t("cepario.bacdiveBuscar")}
          </Button>
        </form>
      </div>

      {referenciasBacdive.length === 0 ? (
        <PlacaVacia>
          <div className="text-sm text-cds-textSecondary">{t("cepario.refExternasVacias")}</div>
        </PlacaVacia>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {referenciasBacdive.map((ref) => {
            const resumen = ref.payload_resumen
            const fechaConsulta = formatearFechaBacdive(ref.fecha_consulta)
            return (
              <li key={ref.id} className="rounded-[10px] border border-cds-borderSubtle bg-cds-layer01 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-lab-cepario">
                      <Link2 size={14} aria-hidden="true" />
                      {t("cepario.bacdiveConfirmado")}
                    </div>
                    <div className="mt-1 text-sm font-medium italic text-cds-textPrimary">{resumen.titulo ?? `BacDive ${ref.external_id}`}</div>
                    <div className="mt-1 font-mono text-xs text-cds-textSecondary">BacDive {ref.external_id}</div>
                    <BacDiveSenales resumen={resumen} queryUsada={ref.query_usada} taxonLocal={taxonLocal} />
                    <BacDiveAlertasConflicto entidad={entidad} resumen={resumen} />
                    {fechaConsulta ? (
                      <div className="mt-1 text-xs text-cds-textSecondary">{t("cepario.bacdiveConsultado", { fecha: fechaConsulta })}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {resumen.url ? (
                      <a className="inline-flex items-center gap-1 text-sm text-cds-linkPrimary hover:text-cds-linkPrimaryHover" href={resumen.url} target="_blank" rel="noreferrer">
                        {t("cepario.bacdiveAbrir")}
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    ) : null}
                    {puedeConfirmar ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        disabled={pendingRefresh}
                        onClick={() => onActualizarReferencia(ref.id)}
                      >
                        {pendingRefresh ? t("cepario.bacdiveActualizando") : t("cepario.bacdiveActualizar")}
                      </Button>
                    ) : null}
                    {puedeConfirmar ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        disabled={pendingParche}
                        onClick={() => toggleParche(ref.id)}
                      >
                        {parcheAbierto === ref.id ? t("cepario.bacdiveOcultarParche") : t("cepario.bacdiveVerParche")}
                      </Button>
                    ) : null}
                    {puedeConfirmar ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        disabled={pendingDescartar}
                        onClick={() => onDescartarReferencia(ref.id)}
                      >
                        {t("cepario.bacdiveQuitar")}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <BacDiveFicha resumen={resumen} />
                {parcheAbierto === ref.id ? (
                  <div className="mt-4 border-t border-cds-borderSubtle pt-4">
                    {!parches[ref.id] ? (
                      <div className="text-sm text-cds-textSecondary">{t("cepario.bacdiveParcheCargando")}</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-separate border-spacing-y-1 text-sm">
                            <thead className="text-left text-xs text-cds-textSecondary">
                              <tr>
                                <th className="px-2 py-1">{t("cepario.bacdiveCampo")}</th>
                                <th className="px-2 py-1">{t("cepario.bacdiveLocal")}</th>
                                <th className="px-2 py-1">{t("cepario.bacdiveExterno")}</th>
                                <th className="w-20 px-2 py-1 text-center">{t("cepario.bacdiveAplicar")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parches[ref.id]!.items.map((item) => {
                                const seleccion = seleccionPara(ref.id, parches[ref.id])
                                const checked = seleccion.includes(item.id)
                                return (
                                  <tr key={item.id} className="bg-cds-background">
                                    <td className="px-2 py-2 align-top text-cds-textPrimary">
                                      <div>{item.etiqueta}</div>
                                      <div className="mt-0.5 text-[11px] text-cds-textSecondary">
                                        {t(item.grupo === "entidad" ? "cepario.bacdiveGrupoEntidad" : "cepario.bacdiveGrupoCaracterizacion")}
                                      </div>
                                    </td>
                                    <td className="px-2 py-2 align-top text-cds-textSecondary">{item.valor_local ?? t("cepario.bacdiveVacio")}</td>
                                    <td className="px-2 py-2 align-top text-cds-textPrimary">{item.valor_bacdive ?? t("cepario.bacdiveSinDato")}</td>
                                    <td className="px-2 py-2 text-center align-top">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={!item.aplicable}
                                        onChange={() => toggleCampo(ref.id, item.id)}
                                      />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            size="compact"
                            disabled={pendingAplicarParche || seleccionPara(ref.id, parches[ref.id]).length === 0}
                            onClick={() => onAplicarParche(ref.id, seleccionPara(ref.id, parches[ref.id]))}
                          >
                            {t("cepario.bacdiveAplicarParche")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {candidatos.length > 0 ? (
        <div className="mt-5">
          <h3 className="mb-3 text-sm font-medium tracking-[0.16px] text-cds-textSecondary">{t("cepario.bacdiveCandidatos")}</h3>
          <ul className="grid gap-3 lg:grid-cols-2">
            {candidatos.map((candidato) => {
              const yaVinculado = vinculados.has(candidato.external_id)
              return (
                <li key={candidato.external_id} className="rounded-[10px] border border-cds-borderSubtle bg-cds-layer01 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium italic text-cds-textPrimary">{candidato.titulo ?? `BacDive ${candidato.external_id}`}</div>
                        <div className="mt-1 font-mono text-xs text-cds-textSecondary">BacDive {candidato.external_id}</div>
                        <BacDiveSenales resumen={candidato.payload_resumen} queryUsada={candidato.query_usada} taxonLocal={taxonLocal} />
                        <BacDiveAlertasConflicto entidad={entidad} resumen={candidato.payload_resumen} />
                      </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={yaVinculado ? "secondary" : "primary"}
                        size="compact"
                        disabled={!puedeConfirmar || pendingGuardar || yaVinculado}
                        onClick={() => onConfirmar(candidato)}
                      >
                        <Check size={16} aria-hidden="true" />
                        {yaVinculado ? t("cepario.bacdiveYaVinculado") : t("cepario.bacdiveConfirmar")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() => onDescartarCandidato(candidato.external_id)}
                      >
                        {t("cepario.bacdiveDescartar")}
                      </Button>
                    </div>
                  </div>
                  <BacDiveFicha resumen={candidato.payload_resumen} />
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

// Vista "Cajas": mapa visual de una caja completa (todas las cepas) en tiempo real.
// Elegís una caja del inventario y ves su grilla 9×9; click en una celda ocupada
// muestra el vial y la cepa, con acceso directo a la ficha.
function CajasView({
  cajas,
  cargando,
  cargarMapa,
  onVerCepa,
}: {
  cajas: CepCaja[]
  cargando: boolean
  cargarMapa: (cajaEquipamientoId: number) => Promise<CepMapaCaja>
  onVerCepa: (entidadId: number) => void
}) {
  const { t } = useTranslation()
  const [sel, setSel] = useState<number | null>(null)
  const [celdaSel, setCeldaSel] = useState<CepCeldaOcupada | null>(null)

  // Mantener una caja seleccionada válida a medida que cargan/cambian.
  useEffect(() => {
    if (cajas.length === 0) {
      setSel(null)
      return
    }
    if (sel == null || !cajas.some((c) => c.id === sel)) {
      setSel(cajas[0].id)
    }
  }, [cajas, sel])

  // Al cambiar de caja, limpiar la celda seleccionada.
  useEffect(() => {
    setCeldaSel(null)
  }, [sel])

  const mapaQuery = useQuery({
    queryKey: ["cepario", "mapa", sel],
    queryFn: () => cargarMapa(sel!),
    enabled: sel != null,
  })

  const mapa = mapaQuery.data
  const porPosicion = useMemo(() => {
    const m = new Map<string, CepCeldaOcupada>()
    for (const o of mapa?.ocupadas ?? []) {
      m.set(o.posicion, o)
    }
    return m
  }, [mapa])

  const ocupadas: CeldaOcupada[] = (mapa?.ocupadas ?? []).map((o) => ({
    posicion: o.posicion,
    titulo: o.entidad_codigo ?? o.entidad_codigo_temporal ?? "—",
    detalle: [o.entidad_nombre, o.codigo_interno].filter(Boolean).join(" · "),
  }))

  if (!cargando && cajas.length === 0) {
    return (
      <div className="border border-cds-borderSubtle bg-cds-layer01 p-6 text-sm text-cds-textSecondary">
        {t("cepario.cajasVacias")}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Selector de caja: chips con ocupación. */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("cepario.verCajas")}>
        {cajas.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={sel === c.id}
            onClick={() => setSel(c.id)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm tracking-[0.16px] ring-1 ring-inset transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus",
              sel === c.id
                ? "bg-lab-ceparioTint text-cds-textPrimary ring-lab-cepario/40"
                : "text-cds-textSecondary ring-cds-borderSubtle hover:text-cds-textPrimary",
            )}
          >
            {c.nombre}
            <span className="text-xs text-cds-textSecondary">{c.ocupadas}/{c.capacidad}</span>
          </button>
        ))}
      </div>

      {mapaQuery.isLoading ? (
        <p className="text-sm text-cds-textSecondary">{t("cepario.cargando")}</p>
      ) : mapa ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="border border-cds-borderSubtle bg-cds-layer01 p-5">
            <MapaCaja
              ocupadas={ocupadas}
              color="var(--lab-cepario)"
              filas={mapa.filas.length}
              columnas={mapa.columnas}
              onCelda={(celda) => {
                const full = celda.posicion ? porPosicion.get(celda.posicion.toUpperCase()) : undefined
                setCeldaSel(full ?? null)
              }}
            />
            <p className="mt-3 text-xs text-cds-textSecondary">
              {t("cepario.cajasOcupacion", { ocupadas: mapa.ocupadas.length, capacidad: mapa.capacidad })}
            </p>
          </div>

          {/* Panel de la celda seleccionada. */}
          <div className="w-full max-w-xs border border-cds-borderSubtle bg-cds-layer01 p-5">
            {celdaSel ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-medium text-cds-textPrimary">{celdaSel.posicion}</span>
                  <span className="text-xs text-cds-textSecondary">{mapa.nombre}</span>
                </div>
                <dl className="flex flex-col gap-2 border-t border-cds-borderSubtle pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-cds-textSecondary">{t("cepario.thCodigo")}</dt>
                    <dd className="font-mono text-cds-textPrimary">{celdaSel.entidad_codigo ?? celdaSel.entidad_codigo_temporal ?? "—"}</dd>
                  </div>
                  {celdaSel.entidad_nombre ? (
                    <div>
                      <dt className="text-xs text-cds-textSecondary">{t("cepario.thTaxon")}</dt>
                      <dd className="text-cds-textPrimary">{celdaSel.entidad_nombre}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-cds-textSecondary">{t("cepario.campoCodigoVial")}</dt>
                    <dd className="font-mono text-cds-textPrimary">{celdaSel.codigo_interno}</dd>
                  </div>
                  {celdaSel.viabilidad ? (
                    <div>
                      <dt className="text-xs text-cds-textSecondary">{t("cepario.campoViabilidad")}</dt>
                      <dd><ViabilidadPill viabilidad={celdaSel.viabilidad} /></dd>
                    </div>
                  ) : null}
                </dl>
                <Button type="button" variant="secondary" size="compact" onClick={() => onVerCepa(celdaSel.entidad_id)}>
                  <ArrowRight size={16} aria-hidden="true" />
                  {t("cepario.verCepa")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-cds-textSecondary">{t("cepario.cajasClickCelda")}</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-cds-textSecondary">{t("cepario.sinResultados")}</p>
      )}
    </div>
  )
}

// Árbol de genealogía de pasaje (vial→vial) de una línea celular. Arma la
// jerarquía con `origen_stock_id` y la indenta por profundidad. Incluye viales
// inactivos (descongelados) para no perder la cadena. Raíz = sin origen (o con un
// origen que ya no está en el set).
function NodoGenealogia({
  nodo,
  depth,
  hijosDe,
}: {
  nodo: CepGenealogiaNodo
  depth: number
  hijosDe: Map<number, CepGenealogiaNodo[]>
}) {
  const { t } = useTranslation()
  const hijos = hijosDe.get(nodo.stock_id) ?? []
  const inactivo = !nodo.activo
  return (
    <li>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 18 }}>
        {depth > 0 ? <span className="text-cds-textSecondary" aria-hidden="true">└</span> : null}
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10.5px] font-medium text-lab-cepario"
          style={{ backgroundColor: "color-mix(in srgb, var(--lab-cepario) 14%, transparent)" }}
        >
          {nodo.pasaje != null ? `P${nodo.pasaje}` : "—"}
        </span>
        <span className={cn("font-mono text-xs", inactivo ? "text-cds-textSecondary line-through" : "text-cds-textPrimary")}>
          {nodo.codigo_interno}
        </span>
        {inactivo ? <span className="text-[11px] text-cds-textSecondary">({t("cepario.vialInactivo")})</span> : null}
      </div>
      {hijos.length ? (
        <ul>
          {hijos.map((h) => (
            <NodoGenealogia key={h.stock_id} nodo={h} depth={depth + 1} hijosDe={hijosDe} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function GenealogiaPasaje({ nodos }: { nodos: CepGenealogiaNodo[] }) {
  const idset = new Set(nodos.map((n) => n.stock_id))
  const hijosDe = new Map<number, CepGenealogiaNodo[]>()
  for (const n of nodos) {
    if (n.origen_stock_id != null && idset.has(n.origen_stock_id)) {
      const arr = hijosDe.get(n.origen_stock_id) ?? []
      arr.push(n)
      hijosDe.set(n.origen_stock_id, arr)
    }
  }
  const raices = nodos.filter((n) => n.origen_stock_id == null || !idset.has(n.origen_stock_id))
  return (
    <ul>
      {raices.map((r) => (
        <NodoGenealogia key={r.stock_id} nodo={r} depth={0} hijosDe={hijosDe} />
      ))}
    </ul>
  )
}

// ============================================
// Cepario C2 — capa de secuencia (panel de la ficha de parte genética)
// ============================================

// Feature type → color token (CSS var). A feature with its own `color` (hex from
// GenBank or set by hand) wins; otherwise we color it by type. The SAME palette is
// shared by the map, the list and the sequence highlight so the eye links them.
const FEATURE_TIPO_COLOR: Record<CepFeatureTipo, string> = {
  gene: "var(--lab-parte-vector)",
  cds: "var(--lab-cepario)",
  promotor: "var(--lab-parte-promotor)",
  terminador: "var(--lab-parte-terminador)",
  rbs: "var(--lab-parte-rbs)",
  resistencia: "var(--cds-support-error)",
  sitio: "var(--lab-warm)",
  misc: "var(--lab-parte-tag)",
}
const FEATURE_TIPO_KEY: Record<CepFeatureTipo, string> = {
  gene: "cepario.ftGene",
  cds: "cepario.ftCds",
  promotor: "cepario.ftPromotor",
  terminador: "cepario.ftTerminador",
  rbs: "cepario.ftRbs",
  resistencia: "cepario.ftResistencia",
  sitio: "cepario.ftSitio",
  misc: "cepario.ftMisc",
}
const FEATURE_TIPOS: CepFeatureTipo[] = [
  "gene", "cds", "promotor", "terminador", "rbs", "resistencia", "sitio", "misc",
]
// Colores de los resaltados de la búsqueda de motivo: hebra directa (amarillo marcador,
// bien visible y distinto de los colores de las features) y hebra reversa (cian, para
// distinguirla cuando se busca en ambas hebras).
const BUSQUEDA_COLOR = "#facc15"
const BUSQUEDA_COLOR_REV = "#38bdf8"
const SEC_SELECT_CLASS = "h-10 border border-cds-borderSubtle bg-cds-field px-3 text-sm text-cds-textPrimary"

// Paleta para personalizar el color de una feature (tokens del tema → se adaptan a
// claro/oscuro). Se guarda el `id` corto en cepario_feature.color: el backend lo
// limita a 20 chars, así que no entra un `var(--lab-parte-terminador)` entero; el
// mapa y la lista lo resuelven a su CSS var vía featureColor.
const FEATURE_PALETA: { id: string; color: string }[] = [
  { id: "blue", color: "var(--lab-parte-vector)" },
  { id: "green", color: "var(--lab-parte-promotor)" },
  { id: "purple", color: "var(--lab-parte-rbs)" },
  { id: "amber", color: "var(--lab-parte-gen)" },
  { id: "raspberry", color: "var(--lab-parte-terminador)" },
  { id: "teal", color: "var(--lab-parte-tag)" },
  { id: "red", color: "var(--cds-support-error)" },
  { id: "gold", color: "var(--lab-warm)" },
]
const PALETA_POR_ID = new Map(FEATURE_PALETA.map((p) => [p.id, p.color]))

// Color con el que se pinta una feature: el elegido por el usuario (id de paleta →
// su CSS var; un hex viejo se usa tal cual) o, si no eligió, el color de su tipo.
function featureColor(f: CepFeature): string {
  if (f.color) {
    return PALETA_POR_ID.get(f.color) ?? f.color
  }
  return FEATURE_TIPO_COLOR[f.tipo]
}

function nombreFeature(f: CepFeature, t: (k: string) => string): string {
  return f.nombre || t(FEATURE_TIPO_KEY[f.tipo])
}

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

// Greedy interval packing into non-overlapping lanes (sorted by start). Used by the
// map so features that overlap on the sequence don't sit on top of each other.
function repartirEnCarriles(features: CepFeature[]): { laneDe: Map<number, number>; carriles: number } {
  const ordenadas = [...features].sort((a, b) => a.inicio - b.inicio || a.fin - b.fin)
  const finPorCarril: number[] = []
  const laneDe = new Map<number, number>()
  for (const f of ordenadas) {
    let carril = finPorCarril.findIndex((fin) => f.inicio > fin)
    if (carril === -1) {
      carril = finPorCarril.length
      finPorCarril.push(f.fin)
    } else {
      finPorCarril[carril] = f.fin
    }
    laneDe.set(f.id, carril)
  }
  return { laneDe, carriles: Math.max(1, finPorCarril.length) }
}

// --- Geometría del anillo circular ---
function puntoPolar(cx: number, cy: number, r: number, gradosDesdeArriba: number): [number, number] {
  const a = ((gradosDesdeArriba - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function arcoSVG(cx: number, cy: number, r: number, desde: number, hasta: number): string {
  const [x1, y1] = puntoPolar(cx, cy, r, desde)
  const [x2, y2] = puntoPolar(cx, cy, r, hasta)
  const largo = hasta - desde > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largo} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

// Triángulo (3 puntos "x,y") de la punta de flecha de hebra, sobre el anillo.
function flechaArco(cx: number, cy: number, r: number, gradoPunta: number, dir: 1 | -1): string {
  const atras = gradoPunta - dir * 3.4
  const [tx, ty] = puntoPolar(cx, cy, r, gradoPunta)
  const [ix, iy] = puntoPolar(cx, cy, r - 5, atras)
  const [ox, oy] = puntoPolar(cx, cy, r + 5, atras)
  return `${tx.toFixed(2)},${ty.toFixed(2)} ${ix.toFixed(2)},${iy.toFixed(2)} ${ox.toFixed(2)},${oy.toFixed(2)}`
}

// Intervalo "redondo" (1/2/5 × 10^n) para la regla, apuntando a ~8 marcas.
function pasoRegla(longitud: number): number {
  const objetivo = longitud / 8
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, objetivo))))
  for (const m of [1, 2, 5]) {
    if (mag * m >= objetivo) {
      return mag * m
    }
  }
  return mag * 10
}

function marcasRegla(longitud: number): number[] {
  const paso = pasoRegla(longitud)
  const marcas: number[] = []
  for (let p = paso; p < longitud; p += paso) {
    marcas.push(p)
  }
  return marcas
}

function recortarEtiqueta(nombre: string): string {
  return nombre.length > 16 ? `${nombre.slice(0, 15)}…` : nombre
}

// Leyenda de tipos presentes (color → etiqueta).
function LeyendaTipos({ features }: { features: CepFeature[] }) {
  const { t } = useTranslation()
  const tipos = useMemo(() => Array.from(new Set(features.map((f) => f.tipo))), [features])
  if (tipos.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {tipos.map((tp) => (
        <span key={tp} className="inline-flex items-center gap-1.5 text-[11px] text-cds-textSecondary">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FEATURE_TIPO_COLOR[tp] }} aria-hidden="true" />
          {t(FEATURE_TIPO_KEY[tp])}
        </span>
      ))}
    </div>
  )
}

// Resumen de sitios de enzimas: cortadores únicos (chips con su posición) + los que
// cortan en varios lugares (línea muteada). Los únicos son los útiles para clonar.
function EnzimasResumen({ sitios }: { sitios: SitiosEnzima[] }) {
  const { t } = useTranslation()
  if (sitios.length === 0) {
    return <p className="text-xs text-cds-textSecondary">{t("cepario.secEnzimasNinguno")}</p>
  }
  const unicos = sitios.filter((s) => s.posiciones.length === 1)
  const multiples = sitios.filter((s) => s.posiciones.length > 1)
  return (
    <div className="flex flex-col gap-2">
      {unicos.length > 0 ? (
        <div>
          <h4 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-cds-textSecondary">{t("cepario.secEnzimasUnicos")}</h4>
          <div className="flex flex-wrap gap-1.5">
            {unicos.map((s) => (
              <span key={s.enzima} className="inline-flex items-center gap-1 rounded-full border border-cds-borderSubtle px-2 py-0.5 text-[11px]">
                <span className="font-medium text-cds-textPrimary">{s.enzima}</span>
                <span className="font-mono text-cds-textSecondary">{s.posiciones[0].toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {multiples.length > 0 ? (
        <p className="text-[11px] text-cds-textSecondary">
          <span className="font-medium">{t("cepario.secEnzimasMultiples")}:</span>{" "}
          {multiples.map((s) => `${s.enzima} ×${s.posiciones.length}`).join(" · ")}
        </p>
      ) : null}
    </div>
  )
}

// Mapa de plásmido propio: anillo (circular) o riel (lineal) con las features
// ubicadas y coloreadas por tipo. La hebra se muestra con la punta de flecha; el
// hover sincroniza con la lista y el texto (estado `hoverId` levantado al panel).
// Suma: etiquetas con líneas guía, regla de pb, tooltip al hover, click-para-copiar.
// Geometría del mapa, compartida entre el render y el cálculo de pb del arrastre de
// selección (deben coincidir con las constantes locales de cada rama del render).
const MAPA_CIRC_W = 360
const MAPA_CIRC_H = 340
const MAPA_LIN_W = 520
const MAPA_LIN_MARGEN = 18
// Selección por arrastre: neutro de alto contraste (gris en claro / casi blanco en
// oscuro) con borde punteado estilo "marquee". A propósito NO es un color de la paleta,
// así que nunca se confunde con una feature (presente o futura) ni con la búsqueda.
const SELECCION_COLOR = "var(--cds-text-primary)"
const SELECCION_DASH = "4 3"

function PlasmidoMapa({
  secuencia,
  hoverId,
  onHover,
  onCopiarFeature,
  marcasEnzima = [],
  marcasBusqueda = [],
  seleccion = null,
  onSeleccionar,
}: {
  secuencia: CepSecuencia
  hoverId: number | null
  onHover: (id: number | null) => void
  onCopiarFeature: (f: CepFeature) => void
  marcasEnzima?: { nombre: string; posicion: number }[]
  marcasBusqueda?: { inicio: number; fin: number; color: string }[]
  seleccion?: { inicio: number; fin: number } | null
  onSeleccionar?: (sel: { inicio: number; fin: number } | null) => void
}) {
  const { t } = useTranslation()
  const { longitud, topologia, features } = secuencia
  const circular = topologia === "circular"
  const { laneDe, carriles } = useMemo(() => repartirEnCarriles(features), [features])
  const [copiadoId, setCopiadoId] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // Arrastre de selección: ancla en pb + si hubo movimiento (para distinguir click).
  const drag = useRef<{ ancla: number; movido: boolean } | null>(null)

  // Convierte un evento de mouse a posición en pb (1-based) usando el CTM del SVG, así
  // funciona pese al escalado responsive (viewBox + width 100%).
  function pbDesdeEvento(e: { clientX: number; clientY: number }): number | null {
    const svg = svgRef.current
    if (!svg) {
      return null
    }
    const ctm = svg.getScreenCTM()
    if (!ctm) {
      return null
    }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const loc = pt.matrixTransform(ctm.inverse())
    let pb: number
    if (circular) {
      const cx = MAPA_CIRC_W / 2
      const cy = MAPA_CIRC_H / 2
      let g = (Math.atan2(loc.y - cy, loc.x - cx) * 180) / Math.PI + 90
      g = ((g % 360) + 360) % 360
      pb = Math.round((g / 360) * longitud)
    } else {
      const usable = MAPA_LIN_W - MAPA_LIN_MARGEN * 2
      pb = Math.round(((loc.x - MAPA_LIN_MARGEN) / usable) * longitud)
    }
    return Math.min(longitud, Math.max(1, pb || 1))
  }

  function onMapaMouseDown(e: React.MouseEvent) {
    if (!onSeleccionar || e.button !== 0) {
      return
    }
    const pb = pbDesdeEvento(e)
    if (pb == null) {
      return
    }
    drag.current = { ancla: pb, movido: false }
  }
  function onMapaMouseMove(e: React.MouseEvent) {
    const st = drag.current
    if (!st || !onSeleccionar) {
      return
    }
    const pb = pbDesdeEvento(e)
    if (pb == null) {
      return
    }
    st.movido = true
    onSeleccionar({ inicio: Math.min(st.ancla, pb), fin: Math.max(st.ancla, pb) })
  }
  function onMapaMouseUp() {
    const st = drag.current
    drag.current = null
    // Click simple (sin arrastrar) limpia la selección.
    if (st && !st.movido && onSeleccionar) {
      onSeleccionar(null)
    }
  }
  const dragProps = onSeleccionar
    ? { ref: svgRef, onMouseDown: onMapaMouseDown, onMouseMove: onMapaMouseMove, onMouseUp: onMapaMouseUp, onMouseLeave: onMapaMouseUp, style: { cursor: "crosshair" as const } }
    : { ref: svgRef }

  function alClickear(f: CepFeature) {
    onCopiarFeature(f)
    setCopiadoId(f.id)
    setTimeout(() => setCopiadoId((c) => (c === f.id ? null : c)), 1200)
  }

  function textoTooltip(f: CepFeature): string {
    if (copiadoId === f.id) {
      return t("cepario.secCopiado")
    }
    const flecha = f.hebra === "-" ? "←" : "→"
    return `${nombreFeature(f, t)} · ${t(FEATURE_TIPO_KEY[f.tipo])} · ${f.inicio.toLocaleString()}–${f.fin.toLocaleString()} ${flecha}`
  }

  // Orden de pintado: la feature en hover va al final (encima de todas).
  const enOrden = useMemo(() => {
    const arr = [...features]
    arr.sort((a, b) => (a.id === hoverId ? 1 : 0) - (b.id === hoverId ? 1 : 0))
    return arr
  }, [features, hoverId])

  const hoverFeat = hoverId != null ? features.find((f) => f.id === hoverId) ?? null : null

  if (circular) {
    const W = MAPA_CIRC_W
    const H = MAPA_CIRC_H
    const cx = W / 2
    const cy = H / 2
    const rBase = 120
    const paso = 16
    const rLabel = rBase + 14
    return (
      <div className="flex flex-col gap-3">
        <div className="relative mx-auto w-full" style={{ maxWidth: 360 }}>
          <svg {...dragProps} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={t("cepario.secMapaAria")}>
            {/* Backbone ring */}
            <circle cx={cx} cy={cy} r={rBase} fill="none" stroke="var(--cds-border-subtle)" strokeWidth={2.5} />
            {/* Selección por arrastre: sector sombreado de la porción elegida */}
            {seleccion ? (() => {
              const sg1 = ((seleccion.inicio - 1) / longitud) * 360
              const sg2 = (seleccion.fin / longitud) * 360
              const [sp1x, sp1y] = puntoPolar(cx, cy, rBase + 12, sg1)
              const [sp2x, sp2y] = puntoPolar(cx, cy, rBase + 12, sg2)
              const largo = sg2 - sg1 > 180 ? 1 : 0
              return (
                <path
                  d={`M ${cx} ${cy} L ${sp1x.toFixed(2)} ${sp1y.toFixed(2)} A ${rBase + 12} ${rBase + 12} 0 ${largo} 1 ${sp2x.toFixed(2)} ${sp2y.toFixed(2)} Z`}
                  fill={SELECCION_COLOR}
                  fillOpacity={0.1}
                  stroke={SELECCION_COLOR}
                  strokeOpacity={0.7}
                  strokeWidth={1.25}
                  strokeDasharray={SELECCION_DASH}
                />
              )
            })() : null}
            {/* Regla: marcas de pb a intervalos redondos */}
            {marcasRegla(longitud).map((pos) => {
              const g = (pos / longitud) * 360
              const [a1x, a1y] = puntoPolar(cx, cy, rBase - 3, g)
              const [a2x, a2y] = puntoPolar(cx, cy, rBase + 3, g)
              return <line key={pos} x1={a1x} y1={a1y} x2={a2x} y2={a2y} stroke="var(--cds-border-strong)" strokeWidth={1} />
            })}
            {/* Coincidencias de la búsqueda: banda exterior sobre el tramo [inicio,fin], por
                fuera del backbone para no taparse con las features (color por hebra). */}
            {marcasBusqueda.map((m, idx) => {
              const g1 = ((m.inicio - 1) / longitud) * 360
              let g2 = (m.fin / longitud) * 360
              if (g2 - g1 < 1.4) {
                g2 = g1 + 1.4 // visibilidad mínima de coincidencias cortas
              }
              return (
                <g key={`bus-${idx}`}>
                  {/* Relleno tenido + bordes interno/externo plenos: "banda con borde" como en el riel. */}
                  <path d={arcoSVG(cx, cy, rBase + 8, g1, g2)} fill="none" stroke={m.color} strokeWidth={7} strokeLinecap="round" opacity={0.45} />
                  <path d={arcoSVG(cx, cy, rBase + 5, g1, g2)} fill="none" stroke={m.color} strokeWidth={1.5} strokeLinecap="round" />
                  <path d={arcoSVG(cx, cy, rBase + 11, g1, g2)} fill="none" stroke={m.color} strokeWidth={1.5} strokeLinecap="round" />
                </g>
              )
            })}
            {/* Marca del origen (posición 1, arriba) */}
            <line x1={cx} y1={cy - rBase - 5} x2={cx} y2={cy - rBase + 5} stroke="var(--cds-text-secondary)" strokeWidth={1.5} />
            <text x={cx} y={cy - rBase - 9} textAnchor="middle" className="fill-cds-textSecondary" style={{ fontSize: 10 }}>1</text>
            {enOrden.map((f) => {
              const carril = laneDe.get(f.id) ?? 0
              const r = rBase - carril * paso
              const g1 = ((f.inicio - 1) / longitud) * 360
              let g2 = (f.fin / longitud) * 360
              if (g2 - g1 < 2.2) {
                g2 = g1 + 2.2 // visibilidad mínima de features muy chicas
              }
              const gm = (g1 + g2) / 2
              const activo = hoverId === f.id
              const color = featureColor(f)
              const dir: 1 | -1 = f.hebra === "-" ? -1 : 1
              const gradoPunta = dir === 1 ? g2 : g1
              const [px, py] = puntoPolar(cx, cy, rBase + 2, gm)
              const [lx, ly] = puntoPolar(cx, cy, rLabel, gm)
              const anchor = lx >= cx ? "start" : "end"
              return (
                <g
                  key={f.id}
                  onMouseEnter={() => onHover(f.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => alClickear(f)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Halo sutil bajo la feature activa, para destacar sin apagar el resto. */}
                  {activo ? (
                    <path d={arcoSVG(cx, cy, r, g1, g2)} fill="none" stroke={color} strokeWidth={18} strokeLinecap="round" opacity={0.22} />
                  ) : null}
                  <path
                    d={arcoSVG(cx, cy, r, g1, g2)}
                    fill="none"
                    stroke={color}
                    strokeWidth={activo ? 14 : 11}
                    strokeLinecap="butt"
                  />
                  <polygon points={flechaArco(cx, cy, r, gradoPunta, dir)} fill={color} />
                  {/* Línea guía + etiqueta de la feature */}
                  <line x1={px} y1={py} x2={lx} y2={ly} stroke={color} strokeWidth={1} opacity={activo ? 0.9 : 0.6} />
                  <text
                    x={lx + (anchor === "start" ? 2 : -2)}
                    y={ly}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    className={activo ? "fill-cds-textPrimary" : "fill-cds-textSecondary"}
                    style={{ fontSize: 10.5, fontWeight: activo ? 600 : 400 }}
                  >
                    {recortarEtiqueta(nombreFeature(f, t))}
                  </text>
                </g>
              )
            })}
            {/* Cut sites of unique restriction enzymes (opt-in) */}
            {marcasEnzima.map((m, idx) => {
              const g = (m.posicion / longitud) * 360
              const [t1x, t1y] = puntoPolar(cx, cy, rBase - 7, g)
              const [t2x, t2y] = puntoPolar(cx, cy, rBase + 7, g)
              const [nx, ny] = puntoPolar(cx, cy, rBase + 30, g)
              const anchor = nx >= cx ? "start" : "end"
              return (
                <g key={`enz-${idx}`}>
                  <title>{`${m.nombre} · ${t("cepario.secEnzimaCortaEn", { n: m.posicion })}`}</title>
                  <line x1={t1x} y1={t1y} x2={t2x} y2={t2y} stroke="var(--cds-text-primary)" strokeWidth={1.5} />
                  <text x={nx} y={ny} textAnchor={anchor} dominantBaseline="middle" className="fill-cds-textPrimary" style={{ fontSize: 9.5, fontWeight: 500 }}>
                    {m.nombre}
                  </text>
                </g>
              )
            })}
            {/* Center label: length + topology */}
            <text x={cx} y={cy - 3} textAnchor="middle" className="fill-cds-textPrimary" style={{ fontSize: 23, fontWeight: 500 }}>
              {longitud.toLocaleString()}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" className="fill-cds-textSecondary" style={{ fontSize: 12 }}>
              {t("cepario.secBpCorto")} · {t("cepario.secCircular")}
            </text>
          </svg>
        </div>
        {/* Detalle de la feature en hover: línea fija debajo del mapa (no tapa el dibujo). */}
        <div className="min-h-[1.25rem] text-center text-[11px] leading-5">
          {hoverFeat ? <span className="text-cds-textPrimary">{textoTooltip(hoverFeat)}</span> : null}
        </div>
        <LeyendaTipos features={features} />
      </div>
    )
  }

  // --- Riel lineal ---
  const W = MAPA_LIN_W
  const margen = MAPA_LIN_MARGEN
  const usable = W - margen * 2
  const altoCarril = 26
  const ejeY = 34
  const H = ejeY + 14 + carriles * altoCarril
  const x = (pos: number) => margen + (pos / longitud) * usable
  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full">
        <svg {...dragProps} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={t("cepario.secMapaAria")}>
          {/* Selección por arrastre: columna sombreada del tramo elegido (al fondo) */}
          {seleccion ? (
            <rect
              x={x(seleccion.inicio - 1)}
              y={ejeY - 12}
              width={Math.max(x(seleccion.fin) - x(seleccion.inicio - 1), 2)}
              height={H - (ejeY - 12) - 2}
              fill={SELECCION_COLOR}
              fillOpacity={0.1}
              stroke={SELECCION_COLOR}
              strokeOpacity={0.7}
              strokeWidth={1.25}
              strokeDasharray={SELECCION_DASH}
            />
          ) : null}
          <line x1={margen} y1={ejeY} x2={W - margen} y2={ejeY} stroke="var(--cds-border-subtle)" strokeWidth={2.5} />
          {/* Regla: marcas de pb numeradas */}
          {marcasRegla(longitud).map((pos) => (
            <g key={pos}>
              <line x1={x(pos)} y1={ejeY - 3} x2={x(pos)} y2={ejeY + 3} stroke="var(--cds-border-strong)" strokeWidth={1} />
              <text x={x(pos)} y={ejeY - 7} textAnchor="middle" className="fill-cds-textSecondary" style={{ fontSize: 9 }}>
                {pos.toLocaleString()}
              </text>
            </g>
          ))}
          <text x={margen} y={ejeY - 7} className="fill-cds-textSecondary" style={{ fontSize: 9 }}>1</text>
          <text x={W - margen} y={ejeY - 7} textAnchor="end" className="fill-cds-textSecondary" style={{ fontSize: 9 }}>
            {longitud.toLocaleString()} {t("cepario.secBpCorto")}
          </text>
          {enOrden.map((f) => {
            const carril = laneDe.get(f.id) ?? 0
            const y = ejeY + 12 + carril * altoCarril
            const x1 = x(f.inicio - 1)
            const x2 = Math.max(x(f.fin), x1 + 4)
            const activo = hoverId === f.id
            const color = featureColor(f)
            const flechaW = 5
            // Bloque con muesca de flecha según hebra.
            const puntos = f.hebra === "-"
              ? `${x1},${y + 5} ${x1 + flechaW},${y} ${x2},${y} ${x2},${y + 10} ${x1 + flechaW},${y + 10}`
              : `${x1},${y} ${x2 - flechaW},${y} ${x2},${y + 5} ${x2 - flechaW},${y + 10} ${x1},${y + 10}`
            return (
              <g
                key={f.id}
                onMouseEnter={() => onHover(f.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => alClickear(f)}
                style={{ cursor: "pointer" }}
              >
                <polygon
                  points={puntos}
                  fill={color}
                  stroke={activo ? "var(--cds-text-primary)" : "none"}
                  strokeWidth={activo ? 1.5 : 0}
                />
                <text x={x1} y={y - 4} className={activo ? "fill-cds-textPrimary" : "fill-cds-textSecondary"} style={{ fontSize: 9.5, fontWeight: activo ? 600 : 400 }}>
                  {recortarEtiqueta(nombreFeature(f, t))}
                </text>
              </g>
            )
          })}
          {/* Coincidencias de la búsqueda: banda sobre el eje en el tramo [inicio,fin], alta y
              con borde marcado para que resalte (color por hebra). */}
          {marcasBusqueda.map((m, idx) => {
            const x1 = x(m.inicio - 1)
            const x2 = Math.max(x(m.fin), x1 + 3)
            return (
              <rect
                key={`bus-${idx}`}
                x={x1}
                y={ejeY - 7}
                width={x2 - x1}
                height={14}
                rx={3}
                fill={m.color}
                fillOpacity={0.5}
                stroke={m.color}
                strokeWidth={2}
              />
            )
          })}
          {/* Cut sites of unique restriction enzymes (opt-in): líneas punteadas + título nativo */}
          {marcasEnzima.map((m, idx) => (
            <g key={`enz-${idx}`}>
              <title>{`${m.nombre} · ${t("cepario.secEnzimaCortaEn", { n: m.posicion })}`}</title>
              <line
                x1={x(m.posicion)}
                y1={ejeY - 6}
                x2={x(m.posicion)}
                y2={H - 2}
                stroke="var(--cds-text-primary)"
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.55}
              />
            </g>
          ))}
        </svg>
      </div>
      {/* Detalle de la feature en hover: línea fija debajo del mapa (no tapa el dibujo). */}
      <div className="min-h-[1.25rem] text-center text-[11px] leading-5">
        {hoverFeat ? <span className="text-cds-textPrimary">{textoTooltip(hoverFeat)}</span> : null}
      </div>
      <LeyendaTipos features={features} />
    </div>
  )
}

// Resuelve un color `var(--x)` a su valor concreto computado del :root. Lo usa la
// exportación del mapa, que necesita colores absolutos fuera del DOM de la app.
function resolverColorCss(valor: string): string {
  const m = /^var\((--[^)]+)\)$/.exec(valor.trim())
  if (m && typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim()
    return v || valor
  }
  return valor
}

// --- Exportar el mapa propio (SVG vectorial / PNG) --------------------------------
// El <svg> del mapa usa clases Tailwind y CSS vars que no existen fuera de la app;
// para un archivo autónomo clonamos el nodo e inlineamos los colores ya computados
// por el navegador, y componemos el título + la leyenda de tipos dentro del SVG.
const NS_SVG = "http://www.w3.org/2000/svg"
type LeyendaExport = { color: string; label: string }

// Propiedades de pintado/tipografía a "congelar" como atributos en el clon.
const SVG_PROPS_INLINE = [
  "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap",
  "opacity", "font-size", "font-weight", "font-family", "text-anchor", "dominant-baseline",
] as const

// Primer ancestro con fondo no transparente (fondo del archivo, theme-aware).
function fondoDe(el: Element): string {
  let n: Element | null = el
  while (n) {
    const bg = getComputedStyle(n).backgroundColor
    if (bg && bg !== "transparent" && !bg.startsWith("rgba(0, 0, 0, 0")) {
      return bg
    }
    n = n.parentElement
  }
  return "#ffffff"
}

// Ancho aproximado de un chip de leyenda (punto + etiqueta + separación).
function anchoChip(it: LeyendaExport): number {
  return 14 + it.label.length * 6.2 + 14
}

// Clona el <svg>, inlinea los colores computados y agrega fondo + título + leyenda.
// Devuelve el markup standalone y las dimensiones finales (para rasterizar a PNG).
function componerSvgExport(
  svg: SVGSVGElement,
  opts: { titulo: string | null; leyenda: LeyendaExport[]; colorTexto: string; colorTenue: string; fondo: string },
): { markup: string; ancho: number; alto: number } {
  const clon = svg.cloneNode(true) as SVGSVGElement
  // Inline de estilos: original y clon comparten el mismo orden de nodos descendientes.
  const orig = svg.querySelectorAll<SVGElement>("*")
  const dest = clon.querySelectorAll<SVGElement>("*")
  dest.forEach((nodo, i) => {
    const cs = getComputedStyle(orig[i])
    for (const prop of SVG_PROPS_INLINE) {
      const v = cs.getPropertyValue(prop)
      if (v) {
        nodo.setAttribute(prop, v)
      }
    }
    nodo.removeAttribute("class")
  })

  const vb = (svg.getAttribute("viewBox") ?? `0 0 ${svg.clientWidth} ${svg.clientHeight}`).split(/\s+/).map(Number)
  const W = vb[2]
  const H = vb[3]
  const padTop = opts.titulo ? 30 : 8
  const margen = 12
  // Leyenda en filas que entran en el ancho (greedy).
  const filas: LeyendaExport[][] = []
  let fila: LeyendaExport[] = []
  let anchoFila = 0
  for (const it of opts.leyenda) {
    const w = anchoChip(it)
    if (anchoFila + w > W - margen * 2 && fila.length > 0) {
      filas.push(fila)
      fila = []
      anchoFila = 0
    }
    fila.push(it)
    anchoFila += w
  }
  if (fila.length > 0) {
    filas.push(fila)
  }
  const altoFila = 18
  const padBottom = filas.length > 0 ? filas.length * altoFila + 14 : 8
  const total = padTop + H + padBottom

  // Fondo sólido + contenido del mapa desplazado por padTop.
  const fondoRect = document.createElementNS(NS_SVG, "rect")
  fondoRect.setAttribute("x", "0")
  fondoRect.setAttribute("y", "0")
  fondoRect.setAttribute("width", String(W))
  fondoRect.setAttribute("height", String(total))
  fondoRect.setAttribute("fill", opts.fondo)
  const grupo = document.createElementNS(NS_SVG, "g")
  grupo.setAttribute("transform", `translate(0, ${padTop})`)
  while (clon.firstChild) {
    grupo.appendChild(clon.firstChild)
  }
  clon.appendChild(fondoRect)
  clon.appendChild(grupo)

  if (opts.titulo) {
    const titulo = document.createElementNS(NS_SVG, "text")
    titulo.setAttribute("x", String(W / 2))
    titulo.setAttribute("y", "20")
    titulo.setAttribute("text-anchor", "middle")
    titulo.setAttribute("fill", opts.colorTexto)
    titulo.setAttribute("font-size", "14")
    titulo.setAttribute("font-weight", "600")
    titulo.textContent = opts.titulo
    clon.appendChild(titulo)
  }
  filas.forEach((f, fi) => {
    const y = padTop + H + 12 + fi * altoFila
    let x = margen
    for (const it of f) {
      const punto = document.createElementNS(NS_SVG, "circle")
      punto.setAttribute("cx", String(x + 5))
      punto.setAttribute("cy", String(y - 4))
      punto.setAttribute("r", "5")
      punto.setAttribute("fill", it.color)
      clon.appendChild(punto)
      const txt = document.createElementNS(NS_SVG, "text")
      txt.setAttribute("x", String(x + 14))
      txt.setAttribute("y", String(y))
      txt.setAttribute("fill", opts.colorTenue)
      txt.setAttribute("font-size", "11")
      txt.textContent = it.label
      clon.appendChild(txt)
      x += anchoChip(it)
    }
  })

  clon.setAttribute("xmlns", NS_SVG)
  clon.setAttribute("viewBox", `0 0 ${W} ${total}`)
  clon.setAttribute("width", String(W))
  clon.setAttribute("height", String(total))
  return { markup: new XMLSerializer().serializeToString(clon), ancho: W, alto: total }
}

// Rasteriza el SVG standalone a PNG (2x) y lo descarga.
async function descargarPng(markup: string, ancho: number, alto: number, nombre: string): Promise<void> {
  const escala = 2
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }))
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error("svg load"))
      img.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(ancho * escala)
    canvas.height = Math.round(alto * escala)
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    await new Promise<void>((res) => {
      canvas.toBlob((blob) => {
        if (blob) {
          descargarBlob(blob, nombre)
        }
        res()
      }, "image/png")
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// `busqueda`: coincidencia de la búsqueda de motivo (estilo marcador, bien visible).
// Si no, es el feature en hover (tinte suave de su color).
type Resaltado = { inicio: number; fin: number; color: string; busqueda?: boolean }

// Parte la secuencia en tramos según los resaltados (rangos 1-based). Pinta en orden,
// así los últimos ganan en los solapamientos. Devuelve la marca aplicada en cada tramo.
function segmentarSecuencia(seq: string, resaltados: Resaltado[]): { texto: string; marca: Resaltado | null }[] {
  const n = seq.length
  if (n === 0 || resaltados.length === 0) {
    return [{ texto: seq, marca: null }]
  }
  const por = new Array<Resaltado | null>(n).fill(null)
  for (const r of resaltados) {
    const a = Math.max(0, r.inicio - 1)
    const b = Math.min(n, r.fin)
    for (let i = a; i < b; i++) {
      por[i] = r
    }
  }
  const segs: { texto: string; marca: Resaltado | null }[] = []
  let inicio = 0
  for (let i = 1; i <= n; i++) {
    if (i === n || por[i] !== por[i - 1]) {
      segs.push({ texto: seq.slice(inicio, i), marca: por[i - 1] })
      inicio = i
    }
  }
  return segs
}

// Texto de la secuencia (monospace, scrollable) con resaltados (feature en hover +
// coincidencias de la búsqueda de motivo). La búsqueda usa estilo marcador (amarillo
// + texto oscuro) para que se vea en cualquier tema; el feature, un tinte de su color.
function SecuenciaTexto({ secuencia, resaltados }: { secuencia: string; resaltados: Resaltado[] }) {
  const clase = "max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-[10px] border border-cds-borderSubtle bg-cds-field p-3 font-mono text-xs leading-relaxed text-cds-textSecondary"
  const segs = useMemo(() => segmentarSecuencia(secuencia, resaltados), [secuencia, resaltados])
  return (
    <pre className={clase}>
      {segs.map((s, i) => {
        if (!s.marca) {
          return <span key={i}>{s.texto}</span>
        }
        if (s.marca.busqueda) {
          return (
            <mark key={i} className="rounded-[2px] font-bold" style={{ backgroundColor: s.marca.color, color: "#1f2937" }}>
              {s.texto}
            </mark>
          )
        }
        return (
          <mark
            key={i}
            className="rounded-[2px] font-semibold text-cds-textPrimary"
            style={{ backgroundColor: `color-mix(in srgb, ${s.marca.color} 32%, transparent)`, boxShadow: `inset 0 -2px 0 ${s.marca.color}` }}
          >
            {s.texto}
          </mark>
        )
      })}
    </pre>
  )
}

// Formulario de alta/edición de una feature manual.
function FeatureForm({
  inicial,
  longitud,
  pending,
  onSubmit,
  onCancel,
}: {
  inicial?: CepFeature
  longitud: number
  pending: boolean
  onSubmit: (data: CepFeatureCrear) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState(inicial?.nombre ?? "")
  const [tipo, setTipo] = useState<CepFeatureTipo>(inicial?.tipo ?? "gene")
  const [inicio, setInicio] = useState(inicial ? String(inicial.inicio) : "")
  const [fin, setFin] = useState(inicial ? String(inicial.fin) : "")
  const [hebra, setHebra] = useState<CepHebra>(inicial?.hebra ?? "+")
  const [color, setColor] = useState<string | null>(inicial?.color ?? null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const i = Number(inicio)
    const f = Number(fin)
    if (!Number.isInteger(i) || !Number.isInteger(f)) {
      return
    }
    onSubmit({ nombre: nombre.trim() || null, tipo, inicio: i, fin: f, hebra, color })
  }

  return (
    <form onSubmit={submit} className="rounded-[10px] border border-cds-borderSubtle bg-cds-layer01 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_0.9fr]">
        <label className="block">
          <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secNombre")}</span>
          <Input className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="AmpR" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secTipo")}</span>
          <select className={cn(SEC_SELECT_CLASS, "w-full")} value={tipo} onChange={(e) => setTipo(e.target.value as CepFeatureTipo)}>
            {FEATURE_TIPOS.map((tp) => (
              <option key={tp} value={tp}>{t(FEATURE_TIPO_KEY[tp])}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secDesde")}</span>
          <Input className="h-10" type="number" min={1} max={longitud} value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secHasta")}</span>
          <Input className="h-10" type="number" min={1} max={longitud} value={fin} onChange={(e) => setFin(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secHebra")}</span>
          <select className={cn(SEC_SELECT_CLASS, "w-full")} value={hebra} onChange={(e) => setHebra(e.target.value as CepHebra)}>
            <option value="+">{t("cepario.secHebraDirecta")}</option>
            <option value="-">{t("cepario.secHebraReversa")}</option>
          </select>
        </label>
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secColor")}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {FEATURE_PALETA.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setColor(p.id)}
              className={cn(
                "h-6 w-6 rounded-full border transition",
                color === p.id ? "border-cds-textPrimary ring-2 ring-cds-borderStrong" : "border-cds-borderSubtle",
              )}
              style={{ backgroundColor: p.color }}
              aria-label={`${t("cepario.secColor")} ${p.id}`}
              aria-pressed={color === p.id}
            />
          ))}
          <button
            type="button"
            onClick={() => setColor(null)}
            className={cn(
              "ml-1 h-6 rounded-full border px-2.5 text-[11px] transition",
              color === null ? "border-cds-borderStrong text-cds-textPrimary" : "border-cds-borderSubtle text-cds-textSecondary",
            )}
            aria-pressed={color === null}
          >
            {t("cepario.secColorPorTipo")}
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" variant="primary" size="compact" disabled={pending || !inicio || !fin}>
          <Check size={16} aria-hidden="true" />
          {t("cepario.secGuardarFeature")}
        </Button>
        <Button type="button" variant="secondary" size="compact" onClick={onCancel} disabled={pending}>
          {t("cepario.secCancelar")}
        </Button>
      </div>
    </form>
  )
}

// Una fila de la lista de features: color, nombre, tipo, posición, hebra + acciones.
function FeatureFila({
  feature,
  secuencia,
  puedeEditar,
  activo,
  copiado,
  pendingEdit,
  onHover,
  onCopiar,
  onEditar,
  onBorrar,
}: {
  feature: CepFeature
  secuencia: string
  puedeEditar: boolean
  activo: boolean
  copiado: boolean
  pendingEdit: boolean
  onHover: (id: number | null) => void
  onCopiar: (f: CepFeature) => void
  onEditar: (data: CepFeatureCrear) => void
  onBorrar: () => void
}) {
  const { t } = useTranslation()
  const [editando, setEditando] = useState(false)
  const color = featureColor(feature)

  if (editando) {
    return (
      <li>
        <FeatureForm
          inicial={feature}
          longitud={secuencia.length}
          pending={pendingEdit}
          onSubmit={(data) => {
            onEditar(data)
            setEditando(false)
          }}
          onCancel={() => setEditando(false)}
        />
      </li>
    )
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[10px] border bg-cds-layer01 px-4 py-2.5 transition-colors",
        activo ? "border-cds-borderStrong" : "border-cds-borderSubtle",
      )}
      onMouseEnter={() => onHover(feature.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-cds-textPrimary">{nombreFeature(feature, t)}</span>
      <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        {t(FEATURE_TIPO_KEY[feature.tipo])}
      </span>
      <span className="font-mono text-xs text-cds-textSecondary">
        {feature.inicio.toLocaleString()}–{feature.fin.toLocaleString()}
        <span className="ml-1">{feature.hebra === "-" ? "←" : "→"}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onCopiar(feature)}
          title={t("cepario.secCopiarFeature")}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-cds-textSecondary transition-colors hover:bg-cds-layer02 hover:text-cds-textPrimary"
        >
          {copiado ? <Check size={15} className="text-cds-supportSuccess" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        </button>
        {puedeEditar ? (
          <>
            <button
              type="button"
              onClick={() => setEditando(true)}
              title={t("cepario.secEditar")}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-cds-textSecondary transition-colors hover:bg-cds-layer02 hover:text-cds-textPrimary"
            >
              <PenLine size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onBorrar}
              title={t("cepario.secBorrar")}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-cds-textSecondary transition-colors hover:bg-cds-layer02 hover:text-cds-supportError"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    </li>
  )
}

// Formulario para cargar/reemplazar la secuencia (pegar o subir archivo).
function SubirSecuenciaForm({
  pending,
  conCancelar,
  onGuardar,
  onCancelar,
}: {
  pending: boolean
  conCancelar: boolean
  onGuardar: (data: { contenido: string; formato: CepFormatoGuardar; topologia: CepTopologia | null }) => void
  onCancelar: () => void
}) {
  const { t } = useTranslation()
  const [contenido, setContenido] = useState("")
  const [formato, setFormato] = useState<CepFormatoGuardar>("auto")
  const [topologia, setTopologia] = useState<"" | CepTopologia>("")

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setContenido(await file.text())
    }
    e.target.value = "" // permite re-subir el mismo archivo
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!contenido.trim()) {
      return
    }
    onGuardar({ contenido, formato, topologia: topologia || null })
  }

  return (
    <form onSubmit={submit} className="rounded-[10px] border border-cds-borderSubtle bg-cds-layer01 p-4">
      <textarea
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        placeholder={t("cepario.secPegarPh")}
        rows={6}
        className="w-full resize-y rounded-[10px] border border-cds-borderSubtle bg-cds-field p-3 font-mono text-xs text-cds-textPrimary placeholder:text-cds-textSecondary focus:border-cds-focus focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secFormatoLabel")}</span>
          <select className={SEC_SELECT_CLASS} value={formato} onChange={(e) => setFormato(e.target.value as CepFormatoGuardar)}>
            <option value="auto">{t("cepario.secFormatoAuto")}</option>
            <option value="fasta">{t("cepario.secFormatoFasta")}</option>
            <option value="genbank">{t("cepario.secFormatoGenbank")}</option>
            <option value="manual">{t("cepario.secFormatoManual")}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cds-textSecondary">{t("cepario.secTopologiaLabel")}</span>
          <select className={SEC_SELECT_CLASS} value={topologia} onChange={(e) => setTopologia(e.target.value as "" | CepTopologia)}>
            <option value="">{t("cepario.secTopologiaAuto")}</option>
            <option value="circular">{t("cepario.secCircular")}</option>
            <option value="lineal">{t("cepario.secLineal")}</option>
          </select>
        </label>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded border border-cds-borderStrong bg-cds-layer02 px-3 text-sm text-cds-textPrimary transition-colors hover:bg-cds-borderSubtle">
          <Upload size={16} aria-hidden="true" />
          {t("cepario.secArchivo")}
          <input type="file" accept=".fasta,.fa,.fna,.gb,.gbk,.genbank,.txt,.seq" onChange={onArchivo} className="hidden" />
        </label>
        <div className="ml-auto flex gap-2">
          {conCancelar ? (
            <Button type="button" variant="secondary" size="compact" onClick={onCancelar} disabled={pending}>
              {t("cepario.secCancelar")}
            </Button>
          ) : null}
          <Button type="submit" variant="primary" size="compact" disabled={pending || !contenido.trim()}>
            <Dna size={16} aria-hidden="true" />
            {pending ? t("cepario.secGuardando") : t("cepario.secGuardar")}
          </Button>
        </div>
      </div>
    </form>
  )
}

// Panel de secuencia de la ficha de parte genética. Autocontenido: maneja su propio
// query + mutaciones (token de la sesión) e invalida la ficha para refrescar el
// timeline (los guardados/bajas registran eventos 'nota').
function SecuenciaPanel({ entidadId, puedeEditar }: { entidadId: number; puedeEditar: boolean }) {
  const { t } = useTranslation()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [hoverId, setHoverId] = useState<number | null>(null)
  const mapaRef = useRef<HTMLDivElement>(null)
  const [reemplazando, setReemplazando] = useState(false)
  const [confirmarQuitar, setConfirmarQuitar] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [rangoDesde, setRangoDesde] = useState("")
  const [rangoHasta, setRangoHasta] = useState("")
  const [mostrarEnzimas, setMostrarEnzimas] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [ambasHebras, setAmbasHebras] = useState(false)

  const secQuery = useQuery({
    queryKey: ["cepario", "secuencia", entidadId],
    queryFn: () => api.ceparioSecuencia(token!, entidadId),
    enabled: !!token,
  })

  const invalidar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["cepario", "secuencia", entidadId] })
    queryClient.invalidateQueries({ queryKey: ["cepario", "entidad", entidadId] })
  }, [queryClient, entidadId])

  const guardar = useMutation({
    mutationFn: (data: { contenido: string; formato: CepFormatoGuardar; topologia: CepTopologia | null }) =>
      api.ceparioGuardarSecuencia(token!, entidadId, data),
    onSuccess: (res) => {
      setError(null)
      setReemplazando(false)
      setAviso(res.features_omitidas && res.features_omitidas > 0 ? t("cepario.secOmitidas", { n: res.features_omitidas }) : null)
      invalidar()
    },
    onError: (e: Error) => setError(e.message),
  })

  const quitar = useMutation({
    mutationFn: () => api.ceparioBorrarSecuencia(token!, entidadId),
    onSuccess: () => {
      setError(null)
      setConfirmarQuitar(false)
      setAviso(null)
      invalidar()
    },
    onError: (e: Error) => setError(e.message),
  })

  const agregarFeature = useMutation({
    mutationFn: (data: CepFeatureCrear) => api.ceparioAgregarFeature(token!, entidadId, data),
    onSuccess: () => {
      setError(null)
      setAgregando(false)
      invalidar()
    },
    onError: (e: Error) => setError(e.message),
  })

  const editarFeature = useMutation({
    mutationFn: ({ featureId, data }: { featureId: number; data: CepFeatureEditar }) =>
      api.ceparioEditarFeature(token!, featureId, data),
    onSuccess: () => {
      setError(null)
      invalidar()
    },
    onError: (e: Error) => setError(e.message),
  })

  const borrarFeature = useMutation({
    mutationFn: (featureId: number) => api.ceparioBorrarFeature(token!, featureId),
    onSuccess: () => {
      setError(null)
      invalidar()
    },
    onError: (e: Error) => setError(e.message),
  })

  const copiar = useCallback(async (id: string, texto: string) => {
    if (await copiarAlPortapapeles(texto)) {
      setCopiado(id)
      setTimeout(() => setCopiado((c) => (c === id ? null : c)), 1500)
    }
  }, [])

  const secuencia = secQuery.data ?? null
  const featureHover = useMemo(
    () => (secuencia && hoverId != null ? secuencia.features.find((f) => f.id === hoverId) ?? null : null),
    [secuencia, hoverId],
  )
  // Sitios de enzimas de restricción (solo se calculan si el usuario los pide).
  const sitiosEnzimas = useMemo<SitiosEnzima[]>(
    () => (secuencia && mostrarEnzimas ? buscarSitios(secuencia.secuencia, secuencia.topologia === "circular") : []),
    [secuencia, mostrarEnzimas],
  )
  // En el mapa solo marcamos los cortadores únicos (los relevantes para clonar).
  const marcasEnzima = useMemo(
    () => sitiosEnzimas.filter((s) => s.posiciones.length === 1).map((s) => ({ nombre: s.enzima, posicion: s.posiciones[0] })),
    [sitiosEnzimas],
  )
  // Búsqueda de motivo: coincidencias en la hebra directa (acepta IUPAC) y, si se pide,
  // también en la reversa. El color del resaltado distingue la hebra.
  const coincidencias = useMemo(
    () => (secuencia && motivo.trim() ? buscarMotivo(secuencia.secuencia, motivo, ambasHebras) : []),
    [secuencia, motivo, ambasHebras],
  )
  const motivoInvalido = motivo.trim() !== "" && !esMotivoValido(motivo)
  const colorHebra = (h: "+" | "-") => (h === "-" ? BUSQUEDA_COLOR_REV : BUSQUEDA_COLOR)
  const conteoHebras = useMemo(
    () => ({
      mas: coincidencias.filter((c) => c.hebra === "+").length,
      menos: coincidencias.filter((c) => c.hebra === "-").length,
    }),
    [coincidencias],
  )
  const marcasBusqueda = useMemo(
    () => coincidencias.map((c) => ({ inicio: c.inicio, fin: c.fin, color: colorHebra(c.hebra) })),
    [coincidencias],
  )
  // Selección de un tramo: arrastre en el mapa ⇄ inputs desde–hasta (una sola fuente de
  // verdad en rangoDesde/rangoHasta). Se refleja en el mapa y en el texto de bases.
  const seleccion = useMemo(() => {
    const a = Number(rangoDesde)
    const b = Number(rangoHasta)
    if (secuencia && Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b <= secuencia.longitud && a <= b) {
      return { inicio: a, fin: b }
    }
    return null
  }, [rangoDesde, rangoHasta, secuencia])
  const onSeleccionar = useCallback((sel: { inicio: number; fin: number } | null) => {
    setRangoDesde(sel ? String(sel.inicio) : "")
    setRangoHasta(sel ? String(sel.fin) : "")
  }, [])
  // Resaltados del texto: coincidencias (color por hebra) + feature en hover + selección.
  const resaltadosTexto = useMemo<Resaltado[]>(() => {
    const lista: Resaltado[] = coincidencias.map((c) => ({ inicio: c.inicio, fin: c.fin, color: colorHebra(c.hebra), busqueda: true }))
    if (featureHover) {
      lista.push({ inicio: featureHover.inicio, fin: featureHover.fin, color: featureColor(featureHover) })
    }
    if (seleccion) {
      lista.push({ inicio: seleccion.inicio, fin: seleccion.fin, color: SELECCION_COLOR })
    }
    return lista
  }, [coincidencias, featureHover, seleccion])

  function copiarRango() {
    if (!secuencia) {
      return
    }
    const a = Number(rangoDesde)
    const b = Number(rangoHasta)
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b > secuencia.longitud || a > b) {
      setError(t("cepario.secRangoInvalido", { n: secuencia.longitud }))
      return
    }
    setError(null)
    copiar("rango", secuencia.secuencia.slice(a - 1, b))
  }

  // Exporta el mapa propio como SVG vectorial o PNG, con su título y leyenda de tipos.
  function exportarMapa(formato: "svg" | "png") {
    const svg = mapaRef.current?.querySelector("svg")
    if (!svg || !secuencia) {
      return
    }
    const tipos = Array.from(new Set(secuencia.features.map((f) => f.tipo)))
    const leyenda: LeyendaExport[] = tipos.map((tp) => ({
      color: resolverColorCss(FEATURE_TIPO_COLOR[tp]),
      label: t(FEATURE_TIPO_KEY[tp]),
    }))
    const { markup, ancho, alto } = componerSvgExport(svg as SVGSVGElement, {
      titulo: secuencia.nombre_origen ?? null,
      leyenda,
      colorTexto: resolverColorCss("var(--cds-text-primary)"),
      colorTenue: resolverColorCss("var(--cds-text-secondary)"),
      fondo: fondoDe(svg),
    })
    const base = secuencia.nombre_origen?.replace(/[^\w.-]+/g, "_") || "mapa-plasmido"
    if (formato === "svg") {
      descargarBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), `${base}.svg`)
    } else {
      void descargarPng(markup, ancho, alto, `${base}.png`)
    }
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cds-borderSubtle pb-2">
        <h2 className="flex items-center gap-2 text-sm font-medium tracking-[0.16px] text-cds-textPrimary">
          <Dna size={16} className="text-lab-cepario" aria-hidden="true" />
          {t("cepario.secTitulo")}
        </h2>
        {secuencia && puedeEditar ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="compact" onClick={() => { setReemplazando((v) => !v); setConfirmarQuitar(false) }}>
              <Upload size={16} aria-hidden="true" />
              {t("cepario.secReemplazar")}
            </Button>
            <Button type="button" variant="secondary" size="compact" onClick={() => { setConfirmarQuitar((v) => !v); setReemplazando(false) }}>
              <Trash2 size={16} aria-hidden="true" />
              {t("cepario.secQuitar")}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-cds-supportError bg-lab-critTint px-3 py-2 text-sm text-cds-supportError">
          <AlertTriangle size={15} aria-hidden="true" />
          {error}
        </div>
      ) : null}
      {aviso ? (
        <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-lab-warm bg-lab-warmTint px-3 py-2 text-sm text-lab-warmFg">
          <AlertTriangle size={15} aria-hidden="true" />
          {aviso}
        </div>
      ) : null}

      {confirmarQuitar ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-cds-supportError bg-lab-critTint px-4 py-3">
          <span className="text-sm text-cds-textPrimary">{t("cepario.secConfirmarQuitar")}</span>
          <div className="flex gap-2">
            <Button type="button" variant="danger" size="compact" onClick={() => quitar.mutate()} disabled={quitar.isPending}>
              {t("cepario.secQuitar")}
            </Button>
            <Button type="button" variant="secondary" size="compact" onClick={() => setConfirmarQuitar(false)} disabled={quitar.isPending}>
              {t("cepario.secCancelar")}
            </Button>
          </div>
        </div>
      ) : null}

      {secQuery.isLoading ? (
        <p className="text-sm text-cds-textSecondary">{t("cepario.cargando")}</p>
      ) : !secuencia ? (
        // Estado vacío: si puede editar, mostramos el form; si no, una placa.
        puedeEditar ? (
          <SubirSecuenciaForm
            pending={guardar.isPending}
            conCancelar={false}
            onGuardar={(data) => guardar.mutate(data)}
            onCancelar={() => undefined}
          />
        ) : (
          <PlacaVacia>
            <div className="text-sm text-cds-textSecondary">{t("cepario.secVacia")}</div>
          </PlacaVacia>
        )
      ) : reemplazando ? (
        <SubirSecuenciaForm
          pending={guardar.isPending}
          conCancelar
          onGuardar={(data) => guardar.mutate(data)}
          onCancelar={() => setReemplazando(false)}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Sitios de enzimas de restricción (opcional) sobre el mapa */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMostrarEnzimas((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs transition-colors",
                mostrarEnzimas
                  ? "border-cds-borderStrong bg-cds-layer02 text-cds-textPrimary"
                  : "border-cds-borderSubtle text-cds-textSecondary hover:text-cds-textPrimary",
              )}
            >
              <Scissors size={14} aria-hidden="true" />
              {t("cepario.secEnzimas")}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
          {/* Columna izquierda: mapa + metadatos */}
          <div className="flex flex-col gap-4">
            <div className="rounded-[10px] border border-cds-borderSubtle bg-cds-layer01 p-4">
              <div className="mb-2 flex items-center justify-end gap-1.5">
                {(["svg", "png"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => exportarMapa(fmt)}
                    aria-label={`${t("cepario.secExportar")} ${fmt.toUpperCase()}`}
                    className="inline-flex items-center gap-1 rounded-md border border-cds-borderSubtle px-2 py-1 text-[11px] text-cds-textSecondary transition-colors hover:text-cds-textPrimary"
                  >
                    <Download size={13} aria-hidden="true" />
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <div ref={mapaRef}>
                <PlasmidoMapa
                  secuencia={secuencia}
                  hoverId={hoverId}
                  onHover={setHoverId}
                  onCopiarFeature={(feat) => copiar(`f-${feat.id}`, secuencia.secuencia.slice(feat.inicio - 1, feat.fin))}
                  marcasEnzima={marcasEnzima}
                  marcasBusqueda={marcasBusqueda}
                  seleccion={seleccion}
                  onSeleccionar={onSeleccionar}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-cds-textSecondary">{t("cepario.secSeleccionHint")}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <MetaCampo label={t("cepario.secLongitud")} mono>{t("cepario.secBp", { n: secuencia.longitud })}</MetaCampo>
              <MetaCampo label={t("cepario.secTopologia")}>{secuencia.topologia === "circular" ? t("cepario.secCircular") : t("cepario.secLineal")}</MetaCampo>
              <MetaCampo label={t("cepario.secFormato")}>{t(`cepario.secFormato${secuencia.formato_origen.charAt(0).toUpperCase()}${secuencia.formato_origen.slice(1)}`)}</MetaCampo>
              {secuencia.nombre_origen ? <MetaCampo label={t("cepario.secNombreOrigen")} mono>{secuencia.nombre_origen}</MetaCampo> : null}
            </dl>
            {mostrarEnzimas ? (
              <div className="rounded-[10px] border border-cds-borderSubtle bg-cds-layer01 p-3">
                <EnzimasResumen sitios={sitiosEnzimas} />
              </div>
            ) : null}
          </div>

          {/* Columna derecha: features + secuencia + copiado */}
          <div className="flex min-w-0 flex-col gap-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-cds-textSecondary">{t("cepario.secFeatures")}</h3>
                {puedeEditar && !agregando ? (
                  <Button type="button" variant="ghost" size="compact" onClick={() => setAgregando(true)}>
                    <Plus size={15} aria-hidden="true" />
                    {t("cepario.secAgregarFeature")}
                  </Button>
                ) : null}
              </div>
              {agregando ? (
                <div className="mb-3">
                  <FeatureForm
                    longitud={secuencia.longitud}
                    pending={agregarFeature.isPending}
                    onSubmit={(data) => agregarFeature.mutate(data)}
                    onCancel={() => setAgregando(false)}
                  />
                </div>
              ) : null}
              {secuencia.features.length === 0 ? (
                <p className="text-sm text-cds-textSecondary">{t("cepario.secFeaturesVacias")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {secuencia.features.map((f) => (
                    <FeatureFila
                      key={f.id}
                      feature={f}
                      secuencia={secuencia.secuencia}
                      puedeEditar={puedeEditar}
                      activo={hoverId === f.id}
                      copiado={copiado === `f-${f.id}`}
                      pendingEdit={editarFeature.isPending}
                      onHover={setHoverId}
                      onCopiar={(feat) => copiar(`f-${feat.id}`, secuencia.secuencia.slice(feat.inicio - 1, feat.fin))}
                      onEditar={(data) => editarFeature.mutate({ featureId: f.id, data })}
                      onBorrar={() => borrarFeature.mutate(f.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-cds-textSecondary">{t("cepario.secSecuencia")}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Input className="h-8 w-20" type="number" min={1} max={secuencia.longitud} placeholder={t("cepario.secDesde")} value={rangoDesde} onChange={(e) => setRangoDesde(e.target.value)} />
                  <Input className="h-8 w-20" type="number" min={1} max={secuencia.longitud} placeholder={t("cepario.secHasta")} value={rangoHasta} onChange={(e) => setRangoHasta(e.target.value)} />
                  <Button type="button" variant="secondary" size="compact" onClick={copiarRango} disabled={!rangoDesde || !rangoHasta}>
                    {copiado === "rango" ? <Check size={15} className="text-cds-supportSuccess" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                    {t("cepario.secCopiarRango")}
                  </Button>
                  <Button type="button" variant="secondary" size="compact" onClick={() => copiar("todo", secuencia.secuencia)}>
                    {copiado === "todo" ? <Check size={15} className="text-cds-supportSuccess" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                    {t("cepario.secCopiar")}
                  </Button>
                </div>
              </div>
              {/* Búsqueda de motivo / subsecuencia (resalta en el texto y el mapa) */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cds-textSecondary" aria-hidden="true" />
                  <Input
                    className="h-9 pl-9 font-mono"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder={t("cepario.secBuscarMotivoPh")}
                    aria-label={t("cepario.secBuscarMotivo")}
                  />
                  {motivo ? (
                    <button
                      type="button"
                      onClick={() => setMotivo("")}
                      aria-label={t("cepario.secCancelar")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-cds-textSecondary hover:text-cds-textPrimary"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs text-cds-textSecondary">
                  <input
                    type="checkbox"
                    checked={ambasHebras}
                    onChange={(e) => setAmbasHebras(e.target.checked)}
                    className="h-3.5 w-3.5 accent-lab-cepario"
                  />
                  {t("cepario.secAmbasHebras")}
                </label>
                {motivo.trim() ? (
                  <span className={cn("text-xs", motivoInvalido ? "text-cds-supportError" : "text-cds-textSecondary")}>
                    {motivoInvalido
                      ? t("cepario.secMotivoInvalido")
                      : ambasHebras
                        ? t("cepario.secCoincidenciasHebras", { n: coincidencias.length, mas: conteoHebras.mas, menos: conteoHebras.menos })
                        : t("cepario.secCoincidencias", { n: coincidencias.length })}
                  </span>
                ) : null}
              </div>
              {/* Aclaración de hebras: qué color/signo es cada una (la reversa = la contraria). */}
              {ambasHebras ? (
                <div className="mb-2 flex items-center gap-3 text-[11px] text-cds-textSecondary">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: BUSQUEDA_COLOR }} aria-hidden="true" />
                    {t("cepario.secHebraDirecta")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: BUSQUEDA_COLOR_REV }} aria-hidden="true" />
                    {t("cepario.secHebraReversa")}
                  </span>
                </div>
              ) : null}
              <SecuenciaTexto secuencia={secuencia.secuencia} resaltados={resaltadosTexto} />
            </div>
          </div>
          </div>
        </div>
      )}
    </section>
  )
}

function CeparioDetalle({
  entidad,
  genealogia,
  puedeStock,
  puedeDescartar,
  screening,
  referenciasExternas,
  bacdiveCandidatos,
  pendingBacdiveBuscar,
  pendingBacdiveGuardar,
  pendingBacdiveDescartar,
  pendingBacdiveRefresh,
  pendingBacdiveParche,
  pendingBacdiveAplicarParche,
  bacdiveParches,
  pendingEditarIdentidad,
  onBuscarBacdive,
  onGuardarReferencia,
  onDescartarCandidato,
  onDescartarReferencia,
  onActualizarReferencia,
  onCargarParche,
  onAplicarParche,
  onEditarIdentidad,
  onCongelar,
  pendingCongelar,
  sugerirCeldas,
  cajas,
  onMovimiento,
  pendingMovimiento,
  onEtiquetas,
  pendingEtiquetas,
  onVolver,
}: {
  entidad: EntidadDetalle
  genealogia: CepGenealogiaPasaje | null
  puedeStock: boolean
  puedeDescartar: boolean
  screening: ScreeningProps
  referenciasExternas: CepReferenciaExterna[]
  bacdiveCandidatos: CepBacdiveCandidate[]
  pendingBacdiveBuscar: boolean
  pendingBacdiveGuardar: boolean
  pendingBacdiveDescartar: boolean
  pendingBacdiveRefresh: boolean
  pendingBacdiveParche: boolean
  pendingBacdiveAplicarParche: boolean
  bacdiveParches: Record<number, CepBacdivePatch | undefined>
  pendingEditarIdentidad: boolean
  onBuscarBacdive: (q: string, tipo: CepBacdiveTipoBusqueda) => void
  onGuardarReferencia: (candidato: CepBacdiveCandidate) => void
  onDescartarCandidato: (externalId: string) => void
  onDescartarReferencia: (referenciaId: number) => void
  onActualizarReferencia: (referenciaId: number) => void
  onCargarParche: (referenciaId: number) => void
  onAplicarParche: (referenciaId: number, campos: string[]) => void
  onEditarIdentidad: (data: CepEntidadActualizar) => void
  onCongelar: (data: CepStockCrear) => void
  pendingCongelar: boolean
  sugerirCeldas: (cajaEquipamientoId: number, cantidad: number) => Promise<string[]>
  cajas: CepCaja[]
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
  const [editandoIdentidad, setEditandoIdentidad] = useState(false)
  const [archivando, setArchivando] = useState(false)
  const [motivoArchivar, setMotivoArchivar] = useState("")
  const esParte = entidad.tipo === "parte_genetica"
  const esLinea = entidad.tipo === "linea_celular"
  const esHongo = entidad.tipo === "hongo"
  const esMicro = entidad.tipo === "microorganismo"
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
          {esParte ? <ParteChip categoria={entidad.categoria} /> : esLinea ? <LineaChip /> : esHongo ? <HongoChip subtipo={entidad.subtipo} /> : <GrupoAvatar grupo={entidad.grupo_operativo} />}
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
              esParte || esLinea || esHongo
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
          ) : esLinea ? (
            <>
              {entidad.organismo ? (
                <MetaCampo label={t("cepario.detOrganismo")}>{entidad.organismo}</MetaCampo>
              ) : null}
              {entidad.tejido_origen ? (
                <MetaCampo label={t("cepario.detTejido")}>{entidad.tejido_origen}</MetaCampo>
              ) : null}
              {entidad.tipo_cultivo ? (
                <MetaCampo label={t("cepario.detTipoCultivo")}>{t(CULTIVO_KEY[entidad.tipo_cultivo] ?? entidad.tipo_cultivo)}</MetaCampo>
              ) : null}
              {entidad.morfologia ? (
                <MetaCampo label={t("cepario.detMorfologia")}>{entidad.morfologia}</MetaCampo>
              ) : null}
              {entidad.medio_recomendado ? (
                <MetaCampo label={t("cepario.detMedioRec")}>{entidad.medio_recomendado}</MetaCampo>
              ) : null}
              {entidad.ratio_split ? (
                <MetaCampo label={t("cepario.detRatioSplit")} mono>{entidad.ratio_split}</MetaCampo>
              ) : null}
              {entidad.micoplasma_estado ? (
                <MetaCampo label={t("cepario.detMicoplasma")}>{t(MICOPLASMA_KEY[entidad.micoplasma_estado] ?? entidad.micoplasma_estado)}</MetaCampo>
              ) : null}
              {entidad.pasaje_maximo_recomendado != null ? (
                <MetaCampo label={t("cepario.detPasajeMax")} mono>{entidad.pasaje_maximo_recomendado}</MetaCampo>
              ) : null}
              {entidad.referencia_externa ? (
                <MetaCampo label={t("cepario.detRefExterna")} mono>{entidad.referencia_externa}</MetaCampo>
              ) : null}
              {entidad.modificacion_genetica ? (
                <MetaCampo label={t("cepario.detModGenetica")}>{entidad.modificacion_genetica}</MetaCampo>
              ) : null}
              {entidad.procedencia ? (
                <MetaCampo label={t("cepario.detProcedencia")}>{t(entidad.procedencia === "adquirida" ? "cepario.procAdquirida" : "cepario.procDisenada")}</MetaCampo>
              ) : null}
            </>
          ) : esHongo ? (
            <>
              {entidad.subtipo ? (
                <MetaCampo label={t("cepario.detSubtipo")}>{t(SUBTIPO_HONGO_KEY[entidad.subtipo] ?? entidad.subtipo)}</MetaCampo>
              ) : null}
              {entidad.especie ? (
                <MetaCampo label={t("cepario.detEspecie")}>{entidad.especie}</MetaCampo>
              ) : null}
              {entidad.origen_aislamiento ? (
                <MetaCampo label={t("cepario.detOrigenAislamiento")}>{entidad.origen_aislamiento}</MetaCampo>
              ) : null}
              {entidad.medio_cultivo ? (
                <MetaCampo label={t("cepario.detMedioCultivo")}>{entidad.medio_cultivo}</MetaCampo>
              ) : null}
              {entidad.temperatura_optima ? (
                <MetaCampo label={t("cepario.detTemperaturaOptima")} mono>{entidad.temperatura_optima}</MetaCampo>
              ) : null}
              {entidad.forma_conservacion ? (
                <MetaCampo label={t("cepario.detFormaConservacion")}>{t(CONSERVACION_KEY[entidad.forma_conservacion] ?? entidad.forma_conservacion)}</MetaCampo>
              ) : null}
              {entidad.tipo_sexual ? (
                <MetaCampo label={t("cepario.detTipoSexual")} mono>{entidad.tipo_sexual}</MetaCampo>
              ) : null}
              {entidad.genotipo_marcadores ? (
                <MetaCampo label={t("cepario.detGenotipo")} mono>{entidad.genotipo_marcadores}</MetaCampo>
              ) : null}
              {entidad.morfologia_colonia ? (
                <MetaCampo label={t("cepario.detMorfColonia")}>{entidad.morfologia_colonia}</MetaCampo>
              ) : null}
              {entidad.referencia_coleccion ? (
                <MetaCampo label={t("cepario.detRefColeccion")} mono>{entidad.referencia_coleccion}</MetaCampo>
              ) : null}
              {entidad.ingenieria_genetica ? (
                <MetaCampo label={t("cepario.detIngenieria")}>{entidad.ingenieria_genetica}</MetaCampo>
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
              {entidad.accession_16s ? (
                <MetaCampo label={t("cepario.detAccession16s")} mono>{entidad.accession_16s}</MetaCampo>
              ) : null}
              {entidad.accession_genoma ? (
                <MetaCampo label={t("cepario.detAccessionGenoma")} mono>{entidad.accession_genoma}</MetaCampo>
              ) : null}
            </>
          )}
        </dl>
        {esMicro && screening.puedeCaracterizar ? (
          <>
            <div className="mt-5">
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setEditandoIdentidad((v) => !v)}
              >
                <PenLine size={16} aria-hidden="true" />
                {t("cepario.identidadEditar")}
              </Button>
            </div>
            {editandoIdentidad ? (
              <EditarIdentidadMicroForm
                entidad={entidad}
                pending={pendingEditarIdentidad}
                onSubmit={(data) => {
                  onEditarIdentidad(data)
                  setEditandoIdentidad(false)
                }}
                onCancel={() => setEditandoIdentidad(false)}
              />
            ) : null}
          </>
        ) : null}
      </div>

      {esMicro && (esAislado || esArchivado) && screening.puedePromover ? (
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

      {esMicro ? (
        <BacDiveReferencias
          entidad={entidad}
          consultaInicial={consultaInicialBacdive(entidad)}
          taxonLocal={taxonLocalBacdive(entidad)}
          referencias={referenciasExternas}
          candidatos={bacdiveCandidatos}
          puedeConfirmar={screening.puedeCaracterizar}
          pendingBuscar={pendingBacdiveBuscar}
          pendingGuardar={pendingBacdiveGuardar}
          pendingDescartar={pendingBacdiveDescartar}
          pendingRefresh={pendingBacdiveRefresh}
          pendingParche={pendingBacdiveParche}
          pendingAplicarParche={pendingBacdiveAplicarParche}
          parches={bacdiveParches}
          onBuscar={onBuscarBacdive}
          onConfirmar={onGuardarReferencia}
          onDescartarCandidato={onDescartarCandidato}
          onDescartarReferencia={onDescartarReferencia}
          onActualizarReferencia={onActualizarReferencia}
          onCargarParche={onCargarParche}
          onAplicarParche={onAplicarParche}
        />
      ) : null}

      {esParte ? <SecuenciaPanel entidadId={entidad.id} puedeEditar={screening.puedeCaracterizar} /> : null}

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
            sugerirCeldas={sugerirCeldas}
            cajas={cajas}
            esLinea={esLinea}
            viales={entidad.stock}
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
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-mono text-sm font-medium text-cds-textPrimary">{vial.codigo_interno}</div>
                            {vial.pasaje != null ? (
                              <span
                                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10.5px] font-medium text-lab-cepario"
                                style={{ backgroundColor: "color-mix(in srgb, var(--lab-cepario) 14%, transparent)" }}
                              >
                                {t("cepario.detPasaje")} {vial.pasaje}
                              </span>
                            ) : null}
                          </div>
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
                          {/* Cada fila es UN tubo: no mostramos cantidad, solo el estado. */}
                          <ViabilidadPlano viabilidad={vial.viabilidad} />
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

      {esLinea ? (
        <section>
          <h2 className="mb-3 border-b border-cds-borderSubtle pb-2 text-sm font-medium tracking-[0.16px] text-cds-textPrimary">{t("cepario.detGenealogia")}</h2>
          {genealogia && genealogia.nodos.length ? (
            <GenealogiaPasaje nodos={genealogia.nodos} />
          ) : (
            <PlacaVacia>
              <div className="text-sm text-cds-textSecondary">{t("cepario.genealogiaVacia")}</div>
            </PlacaVacia>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 border-b border-cds-borderSubtle pb-2 text-sm font-medium tracking-[0.16px] text-cds-textPrimary">{t("cepario.detTimeline")}</h2>
        <Timeline eventos={entidad.eventos} />
      </section>

      {esMicro ? (
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
  const [bacdiveCandidatos, setBacdiveCandidatos] = useState<CepBacdiveCandidate[]>([])
  const [bacdiveParches, setBacdiveParches] = useState<Record<number, CepBacdivePatch | undefined>>({})

  const esParteVista = tipo === "parte_genetica"
  const esLineaVista = tipo === "linea_celular"
  const esHongoVista = tipo === "hongo"
  const esMicroVista = tipo === "microorganismo"
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

  const referenciasExternasQuery = useQuery({
    queryKey: ["cepario", "referencias-externas", entidadId],
    queryFn: () => api.ceparioReferenciasExternas(token!, entidadId!),
    enabled: Boolean(token) && tab === "detalle" && Boolean(entidadId),
  })

  // Genealogía de pasaje: solo para líneas celulares (incluye viales inactivos).
  const genealogiaQuery = useQuery({
    queryKey: ["cepario", "genealogia", entidadId],
    queryFn: () => api.ceparioGenealogiaPasaje(token!, entidadId!),
    enabled:
      Boolean(token) && tab === "detalle" && Boolean(entidadId) &&
      entidadQuery.data?.tipo === "linea_celular",
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
      return [e.codigo, e.codigo_temporal, e.nombre, e.taxon_presuntivo, e.categoria, e.resistencia, e.organismo, e.especie]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("es").includes(texto))
    })
  }, [entidades, busqueda, atencion])

  function abrirDetalle(id: number) {
    setEntidadId(id)
    setTab("detalle")
    setSearchParams({ id: String(id) })
    setBacdiveCandidatos([])
    setBacdiveParches({})
  }

  function volverAlListado() {
    setTab("listado")
    setEntidadId(null)
    setSearchParams({})
    setBacdiveCandidatos([])
    setBacdiveParches({})
    setMensaje(null)
    setErrorLocal(null)
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
    setBacdiveCandidatos([])
    setBacdiveParches({})
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
          : res.tipo === "linea_celular"
            ? "cepario.lineaCreada"
            : res.tipo === "hongo"
              ? "cepario.hongoCreado"
              : res.estado === "aislado"
                ? "cepario.aisladoCreado"
                : "cepario.cepaCreada"
      setMensaje(t(msgKey, { codigo: res.codigo ?? res.codigo_temporal ?? "" }))
      setErrorLocal(null)
      abrirDetalle(res.id)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const editarIdentidadMutation = useMutation({
    mutationFn: (data: CepEntidadActualizar) => api.actualizarEntidadCepario(token!, entidadId!, data),
    onSuccess: () => {
      invalidarDetalle()
      setMensaje(t("cepario.identidadGuardada"))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  // Cajas del inventario (cryobox) con su ocupación: sirve para el selector del
  // alta y para la Vista Cajas (mapa visual).
  const cajasQuery = useQuery({
    queryKey: ["cepario", "cajas"],
    queryFn: () => api.ceparioCajas(token!).then((r) => r.cajas),
    enabled: Boolean(token) && (tab === "detalle" || tab === "cajas"),
  })

  // Memoizada (estable por token) para que el effect de sugerencia del form no
  // se redispare en cada render.
  const sugerirCeldas = useCallback(
    (cajaEquipamientoId: number, cantidad: number) =>
      api.celdasLibresCepario(token!, cajaEquipamientoId, cantidad).then((r) => r.celdas),
    [token],
  )

  // Fetcher del mapa de una caja (Vista Cajas + mini-mapa de la ficha).
  const cargarMapaCaja = useCallback(
    (cajaEquipamientoId: number) => api.ceparioMapaCaja(token!, cajaEquipamientoId),
    [token],
  )

  const crearStockMutation = useMutation({
    mutationFn: (data: CepStockCrear) => api.crearStockCepario(token!, entidadId!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cepario", "entidad", entidadId] })
      queryClient.invalidateQueries({ queryKey: ["cepario", "entidades"] })
      queryClient.invalidateQueries({ queryKey: ["cepario", "cajas"] })
      queryClient.invalidateQueries({ queryKey: ["cepario", "mapa"] })
      const celdas = res.viales.map((v) => v.ubicacion_posicion).filter(Boolean).join(", ")
      setMensaje(
        celdas
          ? t("cepario.vialesCongeladosEn", { n: res.creados, celdas })
          : t("cepario.vialesCongelados", { n: res.creados }),
      )
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const etiquetasMutation = useMutation({
    mutationFn: (stockIds: number[]) => api.ceparioEtiquetasPdf(token!, stockIds, "rollo_50x30"),
    onSuccess: (blob) => {
      descargarBlob(blob, "etiquetas-viales.pdf")
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
    queryClient.invalidateQueries({ queryKey: ["cepario", "genealogia", entidadId] })
  }

  const buscarBacdiveMutation = useMutation({
    mutationFn: ({ q, tipoBusqueda }: { q: string; tipoBusqueda: CepBacdiveTipoBusqueda }) =>
      api.ceparioBacdiveBuscar(token!, q, tipoBusqueda, 10),
    onSuccess: (res) => {
      setBacdiveCandidatos(res.candidatos)
      setMensaje(t("cepario.bacdiveResultados", { n: res.candidatos.length }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const guardarReferenciaMutation = useMutation({
    mutationFn: (candidato: CepBacdiveCandidate) =>
      api.ceparioGuardarReferenciaExterna(token!, entidadId!, {
        fuente: "bacdive",
        external_id: candidato.external_id,
        query_usada: candidato.query_usada ?? null,
        match_estado: "confirmado",
        payload_resumen: candidato.payload_resumen,
        payload_raw: candidato.payload_raw ?? null,
      }),
    onSuccess: (ref) => {
      queryClient.invalidateQueries({ queryKey: ["cepario", "referencias-externas", entidadId] })
      setMensaje(t("cepario.bacdiveVinculado", { id: ref.external_id }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const descartarReferenciaMutation = useMutation({
    mutationFn: (referenciaId: number) =>
      api.ceparioDescartarReferenciaExterna(token!, entidadId!, referenciaId),
    onSuccess: (ref) => {
      queryClient.invalidateQueries({ queryKey: ["cepario", "referencias-externas", entidadId] })
      setBacdiveCandidatos((actuales) => actuales.filter((c) => c.external_id !== ref.external_id))
      setMensaje(t("cepario.bacdiveQuitado", { id: ref.external_id }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const actualizarReferenciaMutation = useMutation({
    mutationFn: (referenciaId: number) =>
      api.ceparioActualizarReferenciaExterna(token!, entidadId!, referenciaId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cepario", "referencias-externas", entidadId] })
      queryClient.invalidateQueries({ queryKey: ["cepario", "entidad", entidadId] })
      setBacdiveParches((actuales) => {
        const siguientes = { ...actuales }
        delete siguientes[res.referencia.id]
        return siguientes
      })
      const total = res.diff.total_agregados + res.diff.total_cambiados + res.diff.total_removidos
      setMensaje(res.sin_cambios
        ? t("cepario.bacdiveActualizadoSinCambios", { id: res.referencia.external_id })
        : t("cepario.bacdiveActualizado", { id: res.referencia.external_id, n: total }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const cargarParcheMutation = useMutation({
    mutationFn: (referenciaId: number) =>
      api.ceparioBacdiveParche(token!, entidadId!, referenciaId),
    onSuccess: (patch) => {
      setBacdiveParches((actuales) => ({ ...actuales, [patch.referencia_id]: patch }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const aplicarParcheMutation = useMutation({
    mutationFn: ({ referenciaId, campos }: { referenciaId: number; campos: string[] }) =>
      api.ceparioBacdiveAplicarParche(token!, entidadId!, referenciaId, campos),
    onSuccess: (res) => {
      invalidarDetalle()
      setBacdiveParches((actuales) => ({ ...actuales, [res.referencia_id]: res.parche }))
      setMensaje(t("cepario.bacdiveParcheAplicado", { n: res.aplicados.length }))
      setErrorLocal(null)
    },
    onError: (error) => setErrorLocal(mutationError(error, "Error")),
  })

  const registrarMovimientoMutation = useMutation({
    mutationFn: ({ stockId, data }: { stockId: number; data: CepMovimientoCrear }) =>
      api.ceparioRegistrarMovimiento(token!, stockId, data),
    onSuccess: (res) => {
      invalidarDetalle()
      queryClient.invalidateQueries({ queryKey: ["cepario", "cajas"] })
      queryClient.invalidateQueries({ queryKey: ["cepario", "mapa"] })
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
      ? [
          ...(puedeCrear
            ? [{ label: t(esParteVista ? "cepario.nuevaParte" : esLineaVista ? "cepario.nuevaLinea" : esHongoVista ? "cepario.nuevoHongo" : "cepario.nuevoMicro"), onClick: () => { setTab("nueva"); setMensaje(null); setErrorLocal(null) }, icon: <Plus size={18} aria-hidden="true" /> }]
            : []),
          { label: t("cepario.verCajas"), onClick: () => { setTab("cajas"); setMensaje(null); setErrorLocal(null) }, icon: <Grid3x3 size={18} aria-hidden="true" />, variant: "secondary" as const },
        ]
      : [{ label: t("common.volverAlListado"), onClick: volverAlListado, icon: <ArrowLeft size={18} aria-hidden="true" />, variant: "secondary" as const }]

  return (
    <section>
      <PageHeader
        title={t("cepario.title")}
        description={t("cepario.desc")}
        count={entidadesQuery.isLoading ? t("cepario.cargando") : t(esParteVista ? "cepario.countPartesN" : esLineaVista ? "cepario.countLineasN" : esHongoVista ? "cepario.countHongosN" : "cepario.countN", { n: entidadesFiltradas.length })}
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
          {TIPOS.map((tp) => (
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
              {t(TIPO_KEY[tp])}
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
        ) : esLineaVista ? (
          <NuevaLineaForm pending={crearEntidadMutation.isPending} onSubmit={(data) => crearEntidadMutation.mutate(data)} />
        ) : esHongoVista ? (
          <NuevaHongoForm pending={crearEntidadMutation.isPending} onSubmit={(data) => crearEntidadMutation.mutate(data)} />
        ) : (
          <NuevaMicroForm pending={crearEntidadMutation.isPending} onSubmit={(data) => crearEntidadMutation.mutate(data)} />
        )
      ) : tab === "cajas" ? (
        <CajasView
          cajas={cajasQuery.data ?? []}
          cargando={cajasQuery.isLoading}
          cargarMapa={cargarMapaCaja}
          onVerCepa={abrirDetalle}
        />
      ) : tab === "detalle" ? (
        entidadQuery.isLoading ? (
          <p className="text-sm text-cds-textSecondary">{t("cepario.cargando")}</p>
        ) : entidadQuery.data ? (
          <CeparioDetalle
            entidad={entidadQuery.data}
            genealogia={genealogiaQuery.data ?? null}
            puedeStock={puedeStock}
            puedeDescartar={puedeDescartar}
            screening={screening}
            referenciasExternas={referenciasExternasQuery.data ?? []}
            bacdiveCandidatos={bacdiveCandidatos}
            pendingBacdiveBuscar={buscarBacdiveMutation.isPending}
            pendingBacdiveGuardar={guardarReferenciaMutation.isPending}
            pendingBacdiveDescartar={descartarReferenciaMutation.isPending}
            pendingBacdiveRefresh={actualizarReferenciaMutation.isPending}
            pendingBacdiveParche={cargarParcheMutation.isPending}
            pendingBacdiveAplicarParche={aplicarParcheMutation.isPending}
            bacdiveParches={bacdiveParches}
            pendingEditarIdentidad={editarIdentidadMutation.isPending}
            onBuscarBacdive={(q, tipoBusqueda) => buscarBacdiveMutation.mutate({ q, tipoBusqueda })}
            onGuardarReferencia={(candidato) => guardarReferenciaMutation.mutate(candidato)}
            onDescartarCandidato={(externalId) => {
              setBacdiveCandidatos((actuales) => actuales.filter((c) => c.external_id !== externalId))
              setMensaje(null)
            }}
            onDescartarReferencia={(referenciaId) => descartarReferenciaMutation.mutate(referenciaId)}
            onActualizarReferencia={(referenciaId) => actualizarReferenciaMutation.mutate(referenciaId)}
            onCargarParche={(referenciaId) => cargarParcheMutation.mutate(referenciaId)}
            onAplicarParche={(referenciaId, campos) => aplicarParcheMutation.mutate({ referenciaId, campos })}
            onEditarIdentidad={(data) => editarIdentidadMutation.mutate(data)}
            onCongelar={(data) => crearStockMutation.mutate(data)}
            pendingCongelar={crearStockMutation.isPending}
            sugerirCeldas={sugerirCeldas}
            cajas={cajasQuery.data ?? []}
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
          <div className={cn("mb-4 grid gap-4", esMicroVista ? "lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]" : esParteVista ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1fr)]")}>
            <label className="block">
              <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">{t("cepario.buscar")}</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cds-textSecondary" size={18} aria-hidden="true" />
                <Input className="pl-12" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={t(esParteVista ? "cepario.buscarPhParte" : esLineaVista ? "cepario.buscarPhLinea" : esHongoVista ? "cepario.buscarPhHongo" : "cepario.buscarPh")} />
              </div>
            </label>
            {esLineaVista || esHongoVista ? null : esParteVista ? (
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
                ) : esLineaVista ? (
                  <LineaCard key={e.id} entidad={e} onClick={() => abrirDetalle(e.id)} />
                ) : esHongoVista ? (
                  <HongoCard key={e.id} entidad={e} onClick={() => abrirDetalle(e.id)} />
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
          ) : esLineaVista ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thCodigo")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thOrganismo")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thTipoCultivo")}</th>
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
                    <td className="px-4 py-2 text-cds-textSecondary">{e.organismo ?? e.nombre ?? ""}</td>
                    <td className="px-4 py-2 text-cds-textSecondary">{e.tipo_cultivo ? t(CULTIVO_KEY[e.tipo_cultivo] ?? e.tipo_cultivo) : ""}</td>
                    <td className="px-4 py-2 text-right">{e.nro_viales_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : esHongoVista ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-cds-borderSubtle bg-cds-layer01 text-xs tracking-[0.32px] text-cds-textSecondary">
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thCodigo")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thEspecie")}</th>
                  <th className="h-10 px-4 text-left font-normal">{t("cepario.thSubtipo")}</th>
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
                    <td className="px-4 py-2 italic text-cds-textSecondary">{e.especie ?? e.nombre ?? ""}</td>
                    <td className="px-4 py-2 text-cds-textSecondary">{e.subtipo ? t(SUBTIPO_HONGO_KEY[e.subtipo] ?? e.subtipo) : ""}</td>
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
