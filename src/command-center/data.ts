import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Landmark,
  PieChart,
  Rows3,
  Tag,
  Target,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { CommandCenterFin, CommandCenterFunnel } from "../lib/api"

// Constantes portadas 1:1 del export standalone (Dashboard.html). Los defaults
// reflejan el estado inicial; el backend solo guarda lo que el founder edita, así
// que el front mergea contra estos valores. Command Center es herramienta interna
// (dos co-dueños) → texto en español, sin i18n.

export type FunnelKey = keyof CommandCenterFunnel

export const FUNNEL_KEYS: FunnelKey[] = ["contactos", "entrevistas", "demos", "pilotos", "cliente"]

export const DEFAULT_FUNNEL: CommandCenterFunnel = {
  contactos: 11,
  entrevistas: 0,
  demos: 0,
  pilotos: 0,
  cliente: 0,
}

export const META: Record<FunnelKey, number> = {
  contactos: 30,
  entrevistas: 12,
  demos: 4,
  pilotos: 2,
  cliente: 1,
}

export const KPI_LABELS: Record<FunnelKey, string> = {
  contactos: "Contactos",
  entrevistas: "Entrevistas",
  demos: "Demos",
  pilotos: "Pilotos",
  cliente: "Cliente pago",
}

// ── Panel diario ──
export const PANEL_CAMPOS: { k: string; titulo: string; tono: "warn" | "metric" | "deleg" | "base"; full?: boolean }[] = [
  { k: "p1", titulo: "① Cuello de botella principal", tono: "warn" },
  { k: "p2", titulo: "② Qué hacer hoy (30 min)", tono: "base" },
  { k: "p3", titulo: "③ Qué hacer esta semana", tono: "base" },
  { k: "p4", titulo: "④ Qué delegar (Emiliano)", tono: "deleg" },
  { k: "p5", titulo: "⑤ Riesgos", tono: "warn" },
  { k: "p6", titulo: "⑥ Próximo paso", tono: "base" },
  { k: "p7", titulo: "⑦ Métrica que debemos mover", tono: "metric", full: true },
]

export const DEFAULT_PANEL: Record<string, string> = {
  p1: "0 entrevistas hechas. Hay 11 leads tibios sin agendar. El problema NO es el producto: es el volumen de conversaciones.",
  p2: "Mandá 5 WhatsApps a los leads de prioridad Alta (Alfredo, Valentina, Anahi, Fermín, María Aída) pidiendo 15 min esta semana. Guion en Sales Playbook.",
  p3: "Bloque sagrado de ~2h: mandar 5 mensajes a leads Alta + hacer 1 entrevista. Sumar 5 compradores a la Target 30 (red + directorios IHEM/UNSL).",
  p4: "Emiliano: importar desde Excel/Sheets (73% viene de ahí) + datos de demo realistas para no romper en vivo.",
  p5: "Confundir interés de encuesta con intención de pago. El cluster IHEM/UNSL puede no tener presupuesto propio: validar quién firma.",
  p6: "Tener la primera entrevista AGENDADA con fecha concreta en el CRM.",
  p7: "Métrica de la semana (con 3h): 1 entrevista hecha + 5 compradores nuevos en la lista.",
}

// ── CRM ──
export const CRM_COLS: { k: string; label: string }[] = [
  { k: "nombre", label: "Nombre" },
  { k: "empresa", label: "Empresa" },
  { k: "cargo", label: "Cargo" },
  { k: "pais", label: "País" },
  { k: "email", label: "Email" },
  { k: "wa", label: "WhatsApp" },
  { k: "li", label: "LinkedIn" },
  { k: "pri", label: "Prioridad" },
  { k: "est", label: "Estado" },
  { k: "fecha", label: "Fecha" },
  { k: "paso", label: "Próximo paso" },
  { k: "notas", label: "Notas" },
]

export const PRIORIDADES = ["Alta", "Media", "Baja"]

export const ESTADOS = [
  "Lead - encuesta",
  "Por contactar",
  "Contactado",
  "Entrevista agendada",
  "Entrevistado",
  "Demo",
  "Piloto",
  "Cliente pago",
  "Descartado",
]

// ── Insights de la encuesta (n=11, datos estáticos del export) ──
export const SURVEY = {
  labTypes: {
    "Académico / Universidad": 4,
    "Instituto investigación": 4,
    "Startup biotech": 2,
    "Industrial / I+D": 1,
  } as Record<string, number>,
  severity: [3, 3, 4, 3, 1, 4, 3, 2, 5, 3, 4],
  features: {
    "Stock en tiempo real": 9,
    "Alertas stock bajo": 8,
    "Alertas vencimiento": 6,
    "Gestión proveedores": 5,
    "Registro foto/QR": 4,
    Protocolos: 4,
    "Historial consumo": 3,
    "Asistente IA": 2,
  } as Record<string, number>,
  mgmt: {
    "Cuaderno / manual": 7,
    Excel: 5,
    "Google Sheets": 3,
    "Memoria del equipo": 2,
    AppSheet: 1,
  } as Record<string, number>,
}

export const INSIGHT_STATS: { big: string; tono: "red" | "green" | "blue"; cap: string }[] = [
  { big: "55%", tono: "red", cap: "de los labs: <b>nadie</b> controla el stock" },
  { big: "91%", tono: "blue", cap: "no registra el consumo de forma confiable" },
  { big: "64%", tono: "red", cap: "tuvo un quiebre crítico en 6 meses" },
  { big: "36%", tono: "blue", cap: "perdió reactivos por vencimiento (+18% no sabe)" },
  { big: "91%", tono: "green", cap: "quiere probar la herramienta" },
]

export const INSIGHT_QUOTES = [
  "“No tener que ingresar manualmente los lotes… que pueda escanearlas y se cargue la información automáticamente.” — Milagros, DSM-Firmenich",
  "“Tener un droguero común de facultad con asistencia permanente.” — María Aída, UNSL",
  "“La automatización de pedidos de reactivos considerados críticos.” — Alfredo, Dharma Bioscience",
]

// ── Pricing (hipótesis) ──
export const PRICING_PLANS: {
  tag?: string
  feat?: boolean
  titulo: string
  precio: string
  sub: string
  items: string[]
}[] = [
  {
    tag: "VALIDACIÓN",
    titulo: "🧪 Piloto",
    precio: "US$150–300",
    sub: "2–3 meses (one-time)",
    items: ["Setup asistido", "Carga inicial (foto/QR)", "Capacitación al equipo", "Soporte del fundador", "Acreditable al plan anual"],
  },
  {
    tag: "MÁS POPULAR (hip.)",
    feat: true,
    titulo: "🟢 Starter",
    precio: "US$49",
    sub: "/mes",
    items: ["Labs de 1–10 personas", "Inventario + lotes + venc.", "Alertas stock y vencimiento", "Hasta 5 usuarios", "Carga por foto/QR"],
  },
  {
    titulo: "🔵 Pro",
    precio: "US$99–129",
    sub: "/mes",
    items: ["Institutos 10–30 personas", "Usuarios ilimitados", "Roles y permisos", "Proveedores + analytics", "Asistente IA + protocolos"],
  },
  {
    titulo: "🟣 Enterprise",
    precio: "desde US$250",
    sub: "/mes + setup",
    items: ["Industrial / I+D / QC", "Multi-sede + SSO", "Exportes de compliance", "Onboarding dedicado", "SLA de soporte"],
  },
]

// ── Finanzas ──
export const FIN_SEG: { k: keyof CommandCenterFin["clients"]; label: string }[] = [
  { k: "acad", label: "Académico" },
  { k: "biotech", label: "Biotech / Startup" },
  { k: "ind", label: "Industrial / CRO" },
]

export const FIN_PLAN: { k: "starter" | "pro" | "ent"; label: string }[] = [
  { k: "starter", label: "Starter" },
  { k: "pro", label: "Pro" },
  { k: "ent", label: "Enterprise" },
]

export const DEFAULT_FIN: CommandCenterFin = {
  price: { starter: 49, pro: 110, ent: 250 },
  clients: {
    acad: { starter: 3, pro: 1, ent: 0 },
    biotech: { starter: 0, pro: 2, ent: 0 },
    ind: { starter: 0, pro: 0, ent: 1 },
  },
  varCost: 6,
  feePct: 4,
  fixed: 130,
  hoursToClose: 12,
  hourValue: 15,
  lifetime: 18,
  pilots: 0,
  pilotPrice: 200,
  cash: 0,
}

// ── Roadmap ──
export const ROADMAP: { titulo: string; items: string[] }[] = [
  {
    titulo: "🔵 Ahora",
    items: [
      "Embudo 11 → 30 compradores",
      "12 entrevistas · 4 demos",
      "2 pilotos → 1 cliente pago",
      "Prod: importar Excel/Sheets",
      "Prod: pulir alertas venc/stock",
      "Prod: estabilidad para demos",
    ],
  },
  {
    titulo: "🟢 3 meses",
    items: ["Roles y permisos", "Proveedores + historial", "Reporte para subsidios/auditoría", "Onboarding estandarizado"],
  },
  {
    titulo: "🟡 6 meses",
    items: ["Analytics de consumo/gasto", "Asistente IA conversacional", "Madurar OCR foto/QR", "Programa de referidos"],
  },
  {
    titulo: "🟣 12 meses",
    items: ["Predicción + auto-compras", "Compliance / trazabilidad", "Multi-sede + SSO", "Integración con instrumentos"],
  },
]

// ── OS / Estrategia ──
export const OKR_KRS: { k: string; src: FunnelKey | "target"; meta: number }[] = [
  { k: "KR1 · Compradores identificados (Target 30)", src: "target", meta: 30 },
  { k: "KR2 · Entrevistas de discovery", src: "entrevistas", meta: 12 },
  { k: "KR3 · Demos", src: "demos", meta: 4 },
  { k: "KR4 · Pilotos firmados", src: "pilotos", meta: 2 },
  { k: "KR5 · Piloto / cliente PAGO", src: "cliente", meta: 1 },
]

export const DEFAULT_OKR_TARGET = 11

export const WEEKLY: [string, string][] = [
  ["Entrevistas agendadas", "≥5"],
  ["Entrevistas hechas", "≥3"],
  ["Demos", "≥1"],
  ["Pilotos firmados", "progresar"],
  ["Clientes pagos", "0→1"],
  ["Leads nuevos contactados", "≥10"],
  ["MRR", "crecer"],
  ["Burn / runway", "controlado"],
  ["Activación (1 lab carga inventario)", "≥1"],
  ["1 aprendizaje clave", "1"],
]

// ── Docs ──
export const DOCS: [string, string, string][] = [
  ["01", "Vision", "Qué hacemos, para quién, qué problema, qué nos diferencia."],
  ["02", "Customer Discovery", "Hipótesis, problemas a validar, guion y aprendizajes."],
  ["03", "CRM (.xlsx)", "Pipeline con tus 11 leads + embudo automático."],
  ["04", "Entrevistas", "Plantilla y registro de las 20 entrevistas."],
  ["05", "ICP", "Quién tiene dolor, presupuesto y compra más rápido."],
  ["06", "Pricing", "Piloto, Starter, Pro, Enterprise + cómo testear."],
  ["07", "Financial Model", "Costos, impuestos y 3 escenarios a 12 meses."],
  ["08", "Roadmap", "Ahora / 3 / 6 / 12 meses."],
  ["09", "Feature Requests", "Tablero priorizado desde la encuesta."],
  ["10", "Sales Playbook", "LinkedIn, WhatsApp, email, llamada y demo."],
  ["OS", "LabInventory OS v1.0", "Documento maestro: Golden Circle, OKRs, métricas, gobierno."],
  ["T3", "Plan T3 2026", "Cascada del OS: proyectos, iniciativas y ritmo semanal (3h)."],
]

// ── Navegación del shell (3 grupos · 9 vistas) ──
export type CommandCenterNavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }
export type CommandCenterNavGroup = { label: string; items: CommandCenterNavItem[] }

export const CC_NAV: CommandCenterNavGroup[] = [
  {
    label: "Ejecución",
    items: [
      { to: "/command-center", label: "Panel diario", icon: LayoutDashboard, end: true },
      { to: "/command-center/embudo", label: "Embudo", icon: Rows3 },
      { to: "/command-center/crm", label: "CRM", icon: ClipboardList },
      { to: "/command-center/insights", label: "Insights encuesta", icon: PieChart },
    ],
  },
  {
    label: "Estrategia",
    items: [
      { to: "/command-center/pricing", label: "Pricing", icon: Tag },
      { to: "/command-center/finanzas", label: "Finanzas", icon: Wallet },
      { to: "/command-center/roadmap", label: "Roadmap", icon: Landmark },
    ],
  },
  {
    label: "Gobierno",
    items: [
      { to: "/command-center/os", label: "OS / Estrategia", icon: Target },
      { to: "/command-center/docs", label: "Documentos", icon: FileText },
    ],
  },
]

// Fecha objetivo del countdown (90 días → validar intención de pago).
export const COUNTDOWN_TARGET = new Date("2026-08-28")
