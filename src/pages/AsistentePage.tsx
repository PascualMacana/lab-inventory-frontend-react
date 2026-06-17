import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Bot, Check, Database, Download, ExternalLink, FileText, Globe, PackageSearch, Send, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Link } from "react-router-dom"

import { Button } from "../components/ui/button"
import { api, type AsistenteContexto, type AsistenteModoRespuesta, type AsistenteToolUsada, type AsistenteTurnoHistorial } from "../lib/api"
import { useAuth } from "../lib/auth"

type ChatTurn = {
  role: "user" | "assistant"
  text: string
  tools?: AsistenteToolUsada[]
  contexto?: AsistenteContexto | null
  modoRespuesta?: AsistenteModoRespuesta | null
  pdfRequested?: boolean
  pdfText?: string
  csvRequested?: boolean
  csvText?: string
}

// Respuesta del asistente revelándose token a token (streaming simulado). Vive
// fuera de `turnos` para no persistir estados intermedios; al terminar se vuelca
// como un ChatTurn normal. `shown` = cantidad de caracteres ya mostrados.
type StreamingTurno = {
  full: string
  shown: number
  tools?: AsistenteToolUsada[]
  contexto?: AsistenteContexto | null
  modoRespuesta?: AsistenteModoRespuesta | null
  pdfRequested?: boolean
  csvRequested?: boolean
  csvText?: string
}

// Reveal en ~110 pasos, sin importar el largo, para que se sienta parejo.
const STREAM_TICK_MS = 16

const MAX_TURNOS_HISTORIAL = 10
const ejemplos = [
  "asistente.ej1",
  "asistente.ej2",
  "asistente.ej3",
  "asistente.ej4",
  "asistente.ej5",
]

function pdfSafeText(value: string) {
  const normalized = value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")

  return Array.from(normalized, (char) => {
    const code = char.charCodeAt(0)
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 255) ? char : "?"
  }).join("")
}

function wrapPdfLine(line: string, maxChars = 92) {
  const words = line.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (!word) {
      continue
    }
    if (!current) {
      current = word
      continue
    }
    if (`${current} ${word}`.length > maxChars) {
      lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`
    }
  }

  if (current) {
    lines.push(current)
  }
  return lines.length ? lines : [""]
}

function escapePdfLiteral(value: string) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function latin1Bytes(value: string) {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff
  }
  return bytes
}

function buildAssistantPdf(text: string, t: TFunction) {
  const title = t("asistente.pdfTitulo")
  const rawLines = pdfSafeText(text).split("\n")
  const wrapped = rawLines.flatMap((line) => wrapPdfLine(line.trimEnd()))
  const linesPerPage = 45
  const pages: string[][] = []
  for (let index = 0; index < wrapped.length; index += linesPerPage) {
    pages.push(wrapped.slice(index, index + linesPerPage))
  }
  if (!pages.length) {
    pages.push([t("asistente.sinRespuesta")])
  }

  const objects: string[] = []
  const pageObjectIds: number[] = []
  const contentObjectIds: number[] = []
  const totalPages = pages.length

  objects.push("<< /Type /Catalog /Pages 2 0 R >>")
  objects.push("")

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectId = 3 + pageIndex * 2
    const contentObjectId = pageObjectId + 1
    pageObjectIds.push(pageObjectId)
    contentObjectIds.push(contentObjectId)

    const bodyLines = [
      "BT",
      "/F1 15 Tf",
      "72 780 Td",
      `(${escapePdfLiteral(title)}) Tj`,
      "/F1 10 Tf",
      "0 -18 Td",
      `(${escapePdfLiteral(t("asistente.pdfPagina", { n: pageIndex + 1, total: totalPages }))}) Tj`,
      "/F1 11 Tf",
      "14 TL",
      "0 -28 Td",
      ...pageLines.flatMap((line) => [`(${escapePdfLiteral(line)}) Tj`, "T*"]),
      "ET",
    ]
    const stream = bodyLines.join("\n")

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + totalPages * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >>`)
    objects.push(`<< /Length ${latin1Bytes(stream).length} >>\nstream\n${stream}\nendstream`)
  })

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${totalPages} >>`
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")

  const parts: Uint8Array[] = []
  const offsets: number[] = [0]
  let cursor = 0
  const append = (value: string) => {
    const bytes = latin1Bytes(value)
    parts.push(bytes)
    cursor += bytes.length
  }

  append("%PDF-1.4\n")
  objects.forEach((object, index) => {
    offsets[index + 1] = cursor
    append(`${index + 1} 0 obj\n${object}\nendobj\n`)
  })
  const xrefStart = cursor
  append(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  offsets.slice(1).forEach((offset) => append(`${String(offset).padStart(10, "0")} 00000 n \n`))
  append(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)

  return new Blob(parts, { type: "application/pdf" })
}

function downloadAssistantPdf(text: string, t: TFunction) {
  const blob = buildAssistantPdf(text, t)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `respuesta-asistente-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function userRequestedPdf(text: string) {
  const normalized = text
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")

  return /\bpdf\b|\.pdf\b/.test(normalized)
}

function userRequestedCsv(text: string) {
  const normalized = text
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")

  return /\bcsv\b|\.csv\b|valores separados por coma/.test(normalized)
}

function extractCsvText(text: string) {
  const fenced = text.match(/```(?:csv)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]?.includes(",")) {
    return fenced[1].trim()
  }

  const lines = text.split("\n").map((line) => line.trim())
  const headerIndex = lines.findIndex((line) => {
    if (!line.includes(",")) {
      return false
    }
    const cells = line.split(",")
    return cells.length >= 3 && cells.every((cell) => /^[\w áéíóúñÁÉÍÓÚÑ-]+$/.test(cell.replace(/^"|"$/g, "").trim()))
  })
  if (headerIndex < 0) {
    return null
  }

  const csvLines: string[] = []
  for (let index = headerIndex; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || /^si quer[eé]s\b/i.test(line) || /^nota:?/i.test(line) || /^siguiente acci[oó]n/i.test(line)) {
      break
    }
    if (!line.includes(",")) {
      break
    }
    csvLines.push(line)
  }
  return csvLines.length >= 2 ? csvLines.join("\n") : null
}

function downloadAssistantCsv(text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `respuesta-asistente-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function assistantResponseSupportsPdf(text: string) {
  const plain = text
    .replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
  if (plain.length < 120) {
    return false
  }

  const normalized = plain
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
  const firstSentence = normalized.split(/[.!?\n]/)[0] ?? normalized
  const firstBlock = normalized.split(/\n{2,}/)[0] ?? normalized
  const nonDownloadableStarts = [
    "no puedo",
    "no encontre",
    "no hay",
    "no tengo",
    "necesito",
    "falta",
    "faltan",
    "indica",
    "indicame",
    "aclara",
    "aclarame",
    "a que",
    "que ",
    "cual ",
  ]
  if (nonDownloadableStarts.some((prefix) => firstSentence.trim().startsWith(prefix))) {
    return false
  }

  return !/(no puedo (generar|crear|adjuntar|pasar|preparar)|no puedo darte|no puedo estimar|documentacion interna.*no.*conectada|necesito que|indicame|aclarame|falta indicar|faltan datos)/.test(firstBlock)
}

function pdfPreviewText(text: string, t: TFunction) {
  const cleaned = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(" ")

  if (!cleaned) {
    return t("asistente.sinPreview")
  }
  return cleaned.length > 280 ? `${cleaned.slice(0, 280)}...` : cleaned
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function storageKey(usuarioId: number | undefined) {
  return `asistente_chat_${usuarioId ?? "anon"}`
}

// First letters of the name: "Juan Pérez" → "JP"; single word → first 2 chars.
function iniciales(nombre?: string | null) {
  const parts = (nombre ?? "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) {
    return "?"
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function renderInlineLinks(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = []
  const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  const pushBareLinks = (value: string, prefix: string) => {
    const urlRegex = /(https?:\/\/[^\s)]+)([.,;:]?)/g
    let segmentLastIndex = 0
    let urlMatch: RegExpExecArray | null
    while ((urlMatch = urlRegex.exec(value)) !== null) {
      if (urlMatch.index > segmentLastIndex) {
        nodes.push(value.slice(segmentLastIndex, urlMatch.index))
      }
      const url = urlMatch[1]
      nodes.push(
        <a
          key={`${prefix}-url-${urlMatch.index}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-cds-linkPrimary underline underline-offset-2 hover:text-cds-linkPrimaryHover"
        >
          {url}
        </a>,
      )
      if (urlMatch[2]) {
        nodes.push(urlMatch[2])
      }
      segmentLastIndex = urlMatch.index + urlMatch[0].length
    }
    if (segmentLastIndex < value.length) {
      nodes.push(value.slice(segmentLastIndex))
    }
  }

  while ((match = markdownLink.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushBareLinks(text.slice(lastIndex, match.index), `${keyPrefix}-${lastIndex}`)
    }
    nodes.push(
      <a
        key={`${keyPrefix}-md-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="text-cds-linkPrimary underline underline-offset-2 hover:text-cds-linkPrimaryHover"
      >
        {match[1]}
      </a>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    pushBareLinks(text.slice(lastIndex), `${keyPrefix}-${lastIndex}`)
  }
  return nodes
}

function renderTextWithLinks(text: string, keyPrefix: string) {
  return text.split("\n").flatMap((line, index) => {
    const lineNodes = renderInlineLinks(line, `${keyPrefix}-line-${index}`)
    if (index === 0) {
      return lineNodes
    }
    return [<br key={`${keyPrefix}-br-${index}`} />, ...lineNodes]
  })
}

type RecursoLink = { title: string; url: string }

// URL para mostrar: sin protocolo ni barra final.
function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

// Separa los enlaces "de recurso" (líneas dedicadas tipo "Etiqueta: URL" o
// viñetas con un link) del cuerpo del texto, para mostrarlos como filas aparte
// (sección "Recursos"). Los links sueltos en medio de una frase quedan en el
// texto y se siguen renderizando inline.
function splitLinksFromText(text: string): { prose: string; links: RecursoLink[] } {
  const links: RecursoLink[] = []
  const seen = new Set<string>()
  const add = (title: string, url: string) => {
    const limpio = url.replace(/[.,;:]+$/, "")
    if (seen.has(limpio)) {
      return
    }
    seen.add(limpio)
    links.push({ title: title.trim() || displayUrl(limpio), url: limpio })
  }

  // Línea = [viñeta] [etiqueta (sep)] <link> [puntuación], y nada más.
  const mdResource = /^\s*(?:[-*•]|\d+[.)])?\s*(.*?)\s*[:\-–—]?\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*[.,;]?\s*$/
  const bareResource = /^\s*(?:[-*•]|\d+[.)])?\s*(.*?)\s*[:\-–—]?\s*(https?:\/\/[^\s)]+?)\s*[.,;]?\s*$/

  const proseLines: string[] = []
  for (const line of text.split("\n")) {
    const md = line.match(mdResource)
    if (md && md[1].length <= 90) {
      add(md[2], md[3]) // título = texto del link
      continue
    }
    const bare = line.match(bareResource)
    if (bare && bare[1].length <= 90) {
      add(bare[1], bare[2]) // título = etiqueta previa (o la URL si no hay)
      continue
    }
    proseLines.push(line)
  }

  const prose = proseLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return { prose, links }
}

function renderAssistantText(text: string, t: TFunction) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!blocks.length) {
    return <p className="text-base leading-6 tracking-[0.16px]">{t("asistente.sinRespuesta")}</p>
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean)
        const isList = lines.length > 1 && lines.every((line) => /^([-*•]|\d+[.)])\s+/.test(line))
        if (isList) {
          return (
            <ul key={index} className="space-y-2 pl-5 text-base leading-6 tracking-[0.16px]">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="list-disc">
                  {renderTextWithLinks(line.replace(/^([-*•]|\d+[.)])\s+/, ""), `block-${index}-line-${lineIndex}`)}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={index} className="whitespace-pre-wrap text-base leading-6 tracking-[0.16px]">
            {renderTextWithLinks(block, `block-${index}`)}
          </p>
        )
      })}
    </div>
  )
}

export function AsistentePage() {
  const { token, usuario } = useAuth()
  const { t } = useTranslation()
  const [turnos, setTurnos] = useState<ChatTurn[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [pregunta, setPregunta] = useState("")
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [streaming, setStreaming] = useState<StreamingTurno | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  // ¿El usuario está pegado al fondo? Solo entonces seguimos el contenido nuevo;
  // si subió a leer, no lo tironeamos (clave para no "trabar" el scroll).
  const pinnedRef = useRef(true)
  const key = useMemo(() => storageKey(usuario?.id), [usuario?.id])

  const preguntarMutation = useMutation({
    mutationFn: ({ pregunta, historial }: { pregunta: string; historial: AsistenteTurnoHistorial[] }) =>
      api.preguntarAsistente(token!, pregunta, historial),
  })
  // typing (esperando al backend) o streaming (revelando) ⇒ no aceptar otro envío.
  const ocupado = preguntarMutation.isPending || streaming !== null

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key)
      const parsed = saved ? JSON.parse(saved) : []
      setTurnos(Array.isArray(parsed) ? parsed : [])
    } catch {
      setTurnos([])
    } finally {
      setLoadedKey(key)
    }
  }, [key])

  useEffect(() => {
    if (loadedKey !== key) {
      return
    }
    window.localStorage.setItem(key, JSON.stringify(turnos))
  }, [key, loadedKey, turnos])

  // Sigue el fondo en mensajes nuevos / typing / cada chunk del streaming, pero
  // SOLO si el usuario está pegado abajo. Instantáneo durante el streaming (un
  // scroll smooth por tick se peleaba con el usuario y "trababa" la página).
  useEffect(() => {
    if (!pinnedRef.current) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: streaming ? "auto" : "smooth" })
  }, [turnos, streaming, preguntarMutation.isPending])

  // Streaming simulado: revela `full` de a pasos parejos y, al completarse,
  // vuelca el turno definitivo (con tools/contexto/modo) en `turnos`.
  useEffect(() => {
    if (!streaming) {
      return
    }
    if (streaming.shown >= streaming.full.length) {
      const completo = streaming
      setTurnos((actual) => [
        ...actual,
        {
          role: "assistant",
          text: completo.full,
          tools: completo.tools ?? [],
          contexto: completo.contexto ?? null,
          modoRespuesta: completo.modoRespuesta ?? null,
          pdfRequested: completo.pdfRequested,
          csvRequested: completo.csvRequested,
          csvText: completo.csvText,
        },
      ])
      setStreaming(null)
      return
    }
    const step = Math.max(2, Math.ceil(streaming.full.length / 110))
    const timer = window.setTimeout(() => {
      setStreaming((s) => (s ? { ...s, shown: Math.min(s.full.length, s.shown + step) } : s))
    }, STREAM_TICK_MS)
    return () => window.clearTimeout(timer)
  }, [streaming])

  async function enviarPregunta(texto: string) {
    const limpia = texto.trim()
    if (!limpia || ocupado) {
      return
    }
    setErrorLocal(null)
    setPregunta("")
    pinnedRef.current = true
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
    const historial = turnos.slice(-MAX_TURNOS_HISTORIAL).map((turno) => ({
      role: turno.role,
      content: turno.text,
      contexto: turno.contexto ?? null,
    }))
    setTurnos((actual) => [...actual, { role: "user", text: limpia }])
    try {
      const respuesta = await preguntarMutation.mutateAsync({ pregunta: limpia, historial })
      const full = respuesta.respuesta || t("asistente.sinRespuesta")
      const pdfRequested = userRequestedPdf(limpia) && assistantResponseSupportsPdf(full)
      const csvText = userRequestedCsv(limpia) ? extractCsvText(full) : null
      // Arranca el streaming simulado; el efecto lo vuelca a `turnos` al terminar.
      setStreaming({
        full,
        shown: 0,
        tools: respuesta.tools_usadas ?? [],
        contexto: respuesta.contexto ?? null,
        modoRespuesta: respuesta.modo_respuesta ?? null,
        pdfRequested,
        csvRequested: Boolean(csvText),
        csvText: csvText ?? undefined,
      })
    } catch (error) {
      const message = mutationError(error, t("asistente.errConsultar"))
      setTurnos((actual) => [...actual, { role: "assistant", text: message, tools: [] }])
      setErrorLocal(message)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void enviarPregunta(pregunta)
  }

  function limpiarChat() {
    setTurnos([])
    setStreaming(null)
    setErrorLocal(null)
    window.localStorage.removeItem(key)
  }

  // Autosize del textarea (rows=1 → crece hasta 160px).
  function ajustarAltura(el: HTMLTextAreaElement | null) {
    if (!el) {
      return
    }
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <section className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-[860px] flex-col lg:h-[calc(100vh-3.5rem)]">
      <header className="mb-5 flex flex-col gap-3 border-b border-cds-borderSubtle pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-light leading-[1.1] tracking-[-0.01em] md:text-[40px]">{t("asistente.title")}</h1>
          <p className="mt-1.5 text-sm leading-[1.4] tracking-[0.16px] text-cds-textSecondary">
            {t("asistente.desc")}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="compact"
          onClick={limpiarChat}
          disabled={!turnos.length || ocupado}
          className="self-start text-cds-linkPrimary hover:text-cds-linkPrimaryHover sm:self-auto"
        >
          <Trash2 size={16} aria-hidden="true" />
          {t("asistente.limpiarChat")}
        </Button>
      </header>

      {errorLocal ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const el = event.currentTarget
          pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="flex-1 space-y-6 overflow-y-auto pb-6"
      >
        {!turnos.length ? (
          <div className="border border-cds-borderSubtle bg-cds-layer01 p-5">
            <h2 className="text-lg font-medium leading-tight">{t("asistente.preguntasRapidas")}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {ejemplos.map((ejemplo) => (
                <button
                  key={ejemplo}
                  type="button"
                  className="min-h-12 border border-cds-borderSubtle bg-cds-background px-4 py-3 text-left text-sm tracking-[0.16px] transition-colors hover:bg-cds-layer01 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus"
                  onClick={() => void enviarPregunta(t(ejemplo))}
                >
                  {t(ejemplo)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turnos.map((turno, index) => (
          <ChatBubble key={`${turno.role}-${index}`} turno={turno} usuarioNombre={usuario?.nombre} />
        ))}

        {preguntarMutation.isPending ? <TypingBubble /> : null}
        {streaming ? <StreamingBubble streaming={streaming} /> : null}
      </div>

      <form className="bg-cds-background pb-1 pt-3" onSubmit={handleSubmit}>
        <div className="flex items-end gap-2 border border-cds-borderSubtle bg-cds-layer01 p-2 pl-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-colors focus-within:border-cds-focus">
          <textarea
            ref={textareaRef}
            className="max-h-40 flex-1 resize-none border-0 bg-transparent py-2 text-[15px] leading-6 text-cds-textPrimary outline-none placeholder:text-cds-textPlaceholder"
            value={pregunta}
            onChange={(event) => {
              setPregunta(event.target.value)
              ajustarAltura(event.target)
            }}
            placeholder={t("asistente.preguntaPh")}
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void enviarPregunta(pregunta)
              }
            }}
          />
          <Button type="submit" size="compact" disabled={!pregunta.trim() || ocupado} className="shrink-0">
            <Send size={16} aria-hidden="true" />
            {t("asistente.enviar")}
          </Button>
        </div>
        <p className="mt-2 text-center text-[11.5px] leading-4 tracking-[0.16px] text-cds-textPlaceholder">
          {t("asistente.notaFooter")}
        </p>
      </form>
    </section>
  )
}

// Avatar del asistente: círculo con el acento violeta del producto (Cepario).
function AssistantAvatar() {
  return (
    <span
      className="mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: "color-mix(in srgb, var(--lab-cepario) 18%, transparent)", color: "var(--lab-cepario)" }}
      aria-hidden="true"
    >
      <Bot size={18} />
    </span>
  )
}

// Avatar del usuario: monograma de iniciales en petróleo tenue.
function UserAvatar({ nombre }: { nombre?: string | null }) {
  return (
    <span
      className="mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold"
      style={{ backgroundColor: "color-mix(in srgb, var(--lab-blue) 15%, transparent)", color: "var(--lab-blue)" }}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  )
}

// Tarjeta del asistente (radio asimétrico que "ancla" la burbuja bajo el avatar).
const ASSISTANT_CARD =
  "max-w-[min(680px,100%)] rounded-[2px_8px_8px_8px] border border-cds-borderSubtle bg-cds-layer01 px-[22px] py-5 shadow-[0_4px_18px_rgba(35,35,45,0.05)]"

function ChatBubble({ turno, usuarioNombre }: { turno: ChatTurn; usuarioNombre?: string | null }) {
  const { t } = useTranslation()

  if (turno.role === "user") {
    return (
      <div className="flex flex-row-reverse items-start gap-3">
        <UserAvatar nombre={usuarioNombre} />
        <div className="max-w-[min(540px,100%)] whitespace-pre-wrap rounded-[8px_8px_2px_8px] bg-cds-buttonPrimary px-[17px] py-[13px] text-[15px] leading-[1.5] tracking-[0.16px] text-white">
          {turno.text}
        </div>
      </div>
    )
  }

  const tools = turno.tools ?? []
  const { prose, links } = splitLinksFromText(turno.text)
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <article className={ASSISTANT_CARD}>
        {renderAssistantText(prose, t)}
        {links.length ? <AssistantRecursos links={links} /> : null}
        {turno.csvRequested && turno.csvText ? <AssistantCsvCard text={turno.csvText} /> : null}
        {turno.pdfRequested ? <AssistantPdfCard text={turno.pdfText ?? turno.text} /> : null}
        {turno.contexto ? <AssistantContextActions contexto={turno.contexto} /> : null}
        {turno.modoRespuesta || tools.length ? (
          <AssistantFuentes modo={turno.modoRespuesta ?? null} tools={tools} />
        ) : null}
      </article>
    </div>
  )
}

// Sección "Recursos": enlaces del texto como filas (ícono + título + URL mono +
// flecha de enlace externo), al estilo del handoff.
function AssistantRecursos({ links }: { links: RecursoLink[] }) {
  const { t } = useTranslation()
  return (
    <div className="mt-4">
      <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-cds-textSecondary">
        {t("asistente.recursos")}
      </div>
      <div className="flex flex-col gap-2">
        {links.map((link, index) => {
          const display = displayUrl(link.url)
          const soloUrl = link.title === display
          return (
            <a
              key={`${link.url}-${index}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2.5 border border-cds-borderSubtle px-3 py-2.5 transition-colors hover:bg-cds-background"
            >
              <Globe size={16} className="shrink-0 text-cds-textSecondary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {!soloUrl ? (
                  <div className="truncate text-[13.5px] font-medium leading-[1.3] text-cds-textPrimary">{link.title}</div>
                ) : null}
                <div className="truncate font-mono text-[12px] text-cds-textSecondary">{display}</div>
              </div>
              <ExternalLink
                size={15}
                className="shrink-0 text-cds-textPlaceholder transition-colors group-hover:text-cds-textSecondary"
                aria-hidden="true"
              />
            </a>
          )
        })}
      </div>
    </div>
  )
}

// Fase typing: tres puntitos pulsantes + "Redactando respuesta…".
function TypingBubble() {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="flex items-center gap-3 rounded-[2px_8px_8px_8px] border border-cds-borderSubtle bg-cds-layer01 px-[22px] py-4 shadow-[0_4px_18px_rgba(35,35,45,0.05)]">
        <span className="flex items-center gap-1.5">
          <span className="asistente-dot" />
          <span className="asistente-dot" style={{ animationDelay: "0.18s" }} />
          <span className="asistente-dot" style={{ animationDelay: "0.36s" }} />
        </span>
        <span className="text-[13px] text-cds-textSecondary">{t("asistente.redactando")}</span>
      </div>
    </div>
  )
}

// Fase streaming: texto revelándose + cursor parpadeante (texto plano hasta que
// el turno se completa y pasa por renderAssistantText con el formato final).
function StreamingBubble({ streaming }: { streaming: StreamingTurno }) {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <article className={ASSISTANT_CARD}>
        <div className="text-base leading-6 tracking-[0.16px]">
          <span className="whitespace-pre-wrap">{streaming.full.slice(0, streaming.shown)}</span>
          <span className="asistente-cursor" aria-hidden="true" />
        </div>
      </article>
    </div>
  )
}

// Pie de "Fuentes": qué consultó el asistente. Reúne el modo de respuesta, su
// detalle y el nº de consultas internas (tools) en pills — todo desde lo que ya
// devuelve el backend, no inventa fuentes.
function AssistantFuentes({ modo, tools }: { modo: AsistenteModoRespuesta | null; tools: AsistenteToolUsada[] }) {
  const { t } = useTranslation()
  const pills: Array<{ key: string; label: string; icon: "check" | "db" }> = []

  if (modo) {
    const labelKey =
      modo.tipo === "fast_path"
        ? "asistente.modoFastPath"
        : modo.tipo === "llm_tools"
          ? "asistente.modoLlmTools"
          : modo.tipo === "llm_general"
            ? "asistente.modoLlmGeneral"
            : "asistente.modoOtro"
    pills.push({ key: "modo", label: t(labelKey), icon: "check" })
    const detalle = typeof modo.detalle === "string" && modo.detalle.trim() ? modo.detalle.trim() : null
    if (detalle) {
      pills.push({ key: "detalle", label: t(`asistente.detalle.${detalle}`, { defaultValue: detalle }), icon: "db" })
    }
  }
  if (tools.length) {
    pills.push({ key: "tools", label: t("asistente.toolsUsadas", { n: tools.length }), icon: "db" })
  }

  if (!pills.length) {
    return null
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cds-borderSubtle pt-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-cds-textSecondary">{t("asistente.fuentes")}</span>
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1.5 rounded-sm border border-cds-borderSubtle bg-cds-background px-2 py-[3px] text-[12px] text-cds-textSecondary"
        >
          {pill.icon === "check" ? (
            <Check size={12} className="text-cds-supportSuccess" aria-hidden="true" />
          ) : (
            <Database size={12} aria-hidden="true" />
          )}
          {pill.label}
        </span>
      ))}
    </div>
  )
}

function AssistantContextActions({ contexto }: { contexto: AsistenteContexto }) {
  const { t } = useTranslation()
  const codigoInterno = typeof contexto.codigo_interno === "string" ? contexto.codigo_interno.trim() : ""
  const reactivoId = typeof contexto.reactivo_id === "number" ? contexto.reactivo_id : null
  const desde = typeof contexto.desde === "string" ? contexto.desde.trim() : ""
  const hasta = typeof contexto.hasta === "string" ? contexto.hasta.trim() : ""
  const actions: Array<{ key: string; to: string; label: string; icon: "lotes" | "auditoria" }> = []

  if (codigoInterno) {
    actions.push({
      key: "lote",
      to: `/reactivos/lotes?codigo=${encodeURIComponent(codigoInterno)}`,
      label: t("asistente.verLote"),
      icon: "lotes",
    })
    actions.push({
      key: "auditoria-lote",
      to: `/auditoria?codigo=${encodeURIComponent(codigoInterno)}`,
      label: t("asistente.verAuditoriaLote"),
      icon: "auditoria",
    })
  }

  if (reactivoId !== null) {
    const auditParams = new URLSearchParams({ reactivo_id: String(reactivoId) })
    if (desde) {
      auditParams.set("desde", desde)
    }
    if (hasta) {
      auditParams.set("hasta", hasta)
    }
    actions.push({
      key: "lotes-reactivo",
      to: `/reactivos/lotes?reactivo_id=${reactivoId}`,
      label: t("asistente.verLotesReactivo"),
      icon: "lotes",
    })
    actions.push({
      key: "auditoria-reactivo",
      to: `/auditoria?${auditParams.toString()}`,
      label: t("asistente.verAuditoriaReactivo"),
      icon: "auditoria",
    })
  }

  if (!actions.length) {
    return null
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-cds-borderSubtle pt-3">
      {actions.map((action) => (
        <Link
          key={action.key}
          to={action.to}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-lab-blueTint px-3.5 py-1.5 text-[13px] font-medium tracking-[0.16px] text-lab-blue ring-1 ring-inset ring-cds-borderSubtle transition-colors hover:bg-lab-blue hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
        >
          {action.icon === "auditoria" ? <FileText size={16} aria-hidden="true" /> : <PackageSearch size={16} aria-hidden="true" />}
          {action.label}
        </Link>
      ))}
    </div>
  )
}

// Fila de archivo descargable (PDF generado), al estilo de las filas de recurso.
function AssistantPdfCard({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex flex-col gap-3 border border-cds-borderSubtle bg-cds-background p-3 sm:flex-row sm:items-center">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm"
        style={{ backgroundColor: "color-mix(in srgb, var(--lab-blue) 12%, transparent)", color: "var(--lab-blue)" }}
        aria-hidden="true"
      >
        <FileText size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium leading-[1.3] text-cds-textPrimary">{t("asistente.pdfListo")}</div>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-[1.4] text-cds-textSecondary">
          {pdfPreviewText(text, t)}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="compact"
        className="shrink-0 sm:self-center"
        onClick={() => downloadAssistantPdf(text, t)}
      >
        <Download size={16} aria-hidden="true" />
        {t("asistente.descargarPdf")}
      </Button>
    </div>
  )
}

function AssistantCsvCard({ text }: { text: string }) {
  const { t } = useTranslation()
  const rows = text.split("\n").filter(Boolean).length
  return (
    <div className="mt-4 flex flex-col gap-3 border border-cds-borderSubtle bg-cds-background p-3 sm:flex-row sm:items-center">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm"
        style={{ backgroundColor: "color-mix(in srgb, var(--cds-support-success) 12%, transparent)", color: "var(--cds-support-success)" }}
        aria-hidden="true"
      >
        <FileText size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium leading-[1.3] text-cds-textPrimary">{t("asistente.csvListo")}</div>
        <p className="mt-0.5 line-clamp-2 font-mono text-[12.5px] leading-[1.4] text-cds-textSecondary">
          {t("asistente.csvFilas", { n: Math.max(0, rows - 1) })}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="compact"
        className="shrink-0 sm:self-center"
        onClick={() => downloadAssistantCsv(text)}
      >
        <Download size={16} aria-hidden="true" />
        {t("asistente.descargarCsv")}
      </Button>
    </div>
  )
}
