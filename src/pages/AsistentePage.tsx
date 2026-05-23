import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Bot, Download, Send, Trash2, User } from "lucide-react"

import { Button } from "../components/ui/button"
import { api, type AsistenteToolUsada, type AsistenteTurnoHistorial } from "../lib/api"
import { useAuth } from "../lib/auth"
import { cn } from "../lib/utils"

type ChatTurn = {
  role: "user" | "assistant"
  text: string
  tools?: AsistenteToolUsada[]
  pdfRequested?: boolean
  pdfText?: string
}

const MAX_TURNOS_HISTORIAL = 10
const ejemplos = [
  "¿Qué lotes vencen en los próximos 30 días?",
  "¿Cuánto etanol tengo en stock?",
  "Mostrame los movimientos de hoy",
  "Dame un protocolo orientativo para preparar PBS 1X",
  "¿Cómo preparo PBS 1X usando lo que tengo en stock?",
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

function buildAssistantPdf(text: string) {
  const title = "Respuesta del asistente"
  const rawLines = pdfSafeText(text).split("\n")
  const wrapped = rawLines.flatMap((line) => wrapPdfLine(line.trimEnd()))
  const linesPerPage = 45
  const pages: string[][] = []
  for (let index = 0; index < wrapped.length; index += linesPerPage) {
    pages.push(wrapped.slice(index, index + linesPerPage))
  }
  if (!pages.length) {
    pages.push(["(sin respuesta)"])
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
      `(${escapePdfLiteral(`Lab Inventory - Pagina ${pageIndex + 1} de ${totalPages}`)}) Tj`,
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

function downloadAssistantPdf(text: string) {
  const blob = buildAssistantPdf(text)
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

  return /(pdf|descarg|export|archivo|reporte|informe)/.test(normalized)
}

function pdfPreviewText(text: string) {
  const cleaned = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(" ")

  if (!cleaned) {
    return "(sin contenido para previsualizar)"
  }
  return cleaned.length > 280 ? `${cleaned.slice(0, 280)}...` : cleaned
}

function lastAssistantPdfText(turnos: ChatTurn[]) {
  for (let index = turnos.length - 1; index >= 0; index -= 1) {
    const turno = turnos[index]
    if (turno.role === "assistant" && turno.text.trim() && !turno.pdfRequested) {
      return turno.text
    }
  }
  return null
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function storageKey(usuarioId: number | undefined) {
  return `asistente_chat_${usuarioId ?? "anon"}`
}

function toolTotal(tool: AsistenteToolUsada) {
  const total = tool.resultado?.total
  return typeof total === "number" ? total : 0
}

function renderAssistantText(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!blocks.length) {
    return <p className="text-base leading-6 tracking-[0.16px]">(sin respuesta)</p>
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
                  {line.replace(/^([-*•]|\d+[.)])\s+/, "")}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={index} className="whitespace-pre-wrap text-base leading-6 tracking-[0.16px]">
            {block}
          </p>
        )
      })}
    </div>
  )
}

export function AsistentePage() {
  const { token, usuario } = useAuth()
  const [turnos, setTurnos] = useState<ChatTurn[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [pregunta, setPregunta] = useState("")
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const key = useMemo(() => storageKey(usuario?.id), [usuario?.id])

  const preguntarMutation = useMutation({
    mutationFn: ({ pregunta, historial }: { pregunta: string; historial: AsistenteTurnoHistorial[] }) =>
      api.preguntarAsistente(token!, pregunta, historial),
  })

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
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [key, loadedKey, turnos])

  async function enviarPregunta(texto: string) {
    const limpia = texto.trim()
    if (!limpia || preguntarMutation.isPending) {
      return
    }
    setErrorLocal(null)
    setPregunta("")
    if (userRequestedPdf(limpia)) {
      const pdfText = lastAssistantPdfText(turnos)
      if (pdfText) {
        setTurnos((actual) => [
          ...actual,
          { role: "user", text: limpia },
          {
            role: "assistant",
            text: "Preparé un PDF descargable con la última respuesta del asistente.",
            pdfRequested: true,
            pdfText,
          },
        ])
        return
      }
    }
    const historial = turnos.slice(-MAX_TURNOS_HISTORIAL).map((turno) => ({
      role: turno.role,
      content: turno.text,
    }))
    setTurnos((actual) => [...actual, { role: "user", text: limpia }])
    try {
      const respuesta = await preguntarMutation.mutateAsync({ pregunta: limpia, historial })
      const pdfRequested = userRequestedPdf(limpia)
      setTurnos((actual) => [
        ...actual,
        {
          role: "assistant",
          text: respuesta.respuesta || "(sin respuesta)",
          tools: respuesta.tools_usadas ?? [],
          pdfRequested,
        },
      ])
    } catch (error) {
      const message = mutationError(error, "No se pudo consultar el asistente")
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
    setErrorLocal(null)
    window.localStorage.removeItem(key)
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>Asistente</h1>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            Consultá inventario o pedí orientación técnica y protocolos. No modifica registros.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={limpiarChat} disabled={!turnos.length || preguntarMutation.isPending}>
          <Trash2 size={18} aria-hidden="true" />
          Limpiar chat
        </Button>
      </div>

      {errorLocal ? (
        <div className="mb-4 border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm">
          {errorLocal}
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto pb-6">
        {!turnos.length ? (
          <div className="bg-cds-layer01 p-4">
            <h2 className="text-[24px] leading-[1.33]">Preguntas rápidas</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {ejemplos.map((ejemplo) => (
                <button
                  key={ejemplo}
                  type="button"
                  className="min-h-12 border border-cds-borderSubtle bg-cds-background px-4 py-3 text-left text-sm tracking-[0.16px] transition-colors hover:bg-cds-layer01 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus"
                  onClick={() => void enviarPregunta(ejemplo)}
                >
                  {ejemplo}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turnos.map((turno, index) => (
          <ChatBubble key={`${turno.role}-${index}`} turno={turno} />
        ))}

        {preguntarMutation.isPending ? (
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-cds-layer01 text-cds-textSecondary">
              <Bot size={20} aria-hidden="true" />
            </div>
            <div className="bg-cds-layer01 px-4 py-3 text-sm text-cds-textSecondary">Consultando...</div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form className="sticky bottom-0 border-t border-cds-borderSubtle bg-cds-background py-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-12 resize-y border-0 border-b-2 border-b-transparent bg-cds-field px-4 py-3 text-sm text-cds-textPrimary outline-none transition-colors placeholder:text-cds-textPlaceholder focus:border-b-cds-focus"
            value={pregunta}
            onChange={(event) => setPregunta(event.target.value)}
            placeholder="Hacé tu pregunta..."
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void enviarPregunta(pregunta)
              }
            }}
          />
          <Button type="submit" disabled={!pregunta.trim() || preguntarMutation.isPending}>
            <Send size={18} aria-hidden="true" />
            Enviar
          </Button>
        </div>
      </form>
    </section>
  )
}

function ChatBubble({ turno }: { turno: ChatTurn }) {
  const isUser = turno.role === "user"
  const tools = turno.tools ?? []

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-cds-layer01 text-cds-textSecondary">
          <Bot size={20} aria-hidden="true" />
        </div>
      ) : null}
      <article className={cn("max-w-[min(760px,100%)] px-4 py-3", isUser ? "bg-cds-buttonPrimary text-white" : "bg-cds-layer01")}>
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm leading-5 tracking-[0.16px]">{turno.text}</div>
        ) : (
          <>
            {renderAssistantText(turno.text)}
            {turno.pdfRequested ? <AssistantPdfCard text={turno.pdfText ?? turno.text} /> : null}
          </>
        )}
        {tools.length ? <ToolsPanel tools={tools} /> : null}
      </article>
      {isUser ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-cds-layer01 text-cds-textSecondary">
          <User size={20} aria-hidden="true" />
        </div>
      ) : null}
    </div>
  )
}

function AssistantPdfCard({ text }: { text: string }) {
  return (
    <div className="mt-4 border border-cds-borderSubtle bg-cds-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-mono text-xs tracking-[0.32px] text-cds-textSecondary">PDF listo para descargar</div>
          <p className="mt-2 line-clamp-3 text-sm leading-5 tracking-[0.16px] text-cds-textPrimary">
            {pdfPreviewText(text)}
          </p>
        </div>
        <Button type="button" variant="secondary" size="compact" onClick={() => downloadAssistantPdf(text)}>
          <Download size={16} aria-hidden="true" />
          Descargar PDF
        </Button>
      </div>
    </div>
  )
}

function ToolsPanel({ tools }: { tools: AsistenteToolUsada[] }) {
  return (
    <details className="mt-4 border-t border-cds-borderSubtle pt-3 text-sm">
      <summary className="cursor-pointer text-cds-linkPrimary">Tools usadas ({tools.length})</summary>
      <div className="mt-3 space-y-3">
        {tools.map((tool, index) => (
          <div key={`${tool.nombre}-${index}`} className="bg-cds-background p-3">
            <div className="font-mono text-xs tracking-[0.16px] text-cds-textPrimary">{tool.nombre}</div>
            {tool.args && Object.keys(tool.args).length ? (
              <pre className="mt-2 overflow-x-auto bg-cds-layer01 p-2 text-xs text-cds-textPrimary">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            ) : (
              <div className="mt-2 text-xs text-cds-textSecondary">sin argumentos</div>
            )}
            {tool.resultado?.error ? (
              <div className="mt-2 text-xs text-cds-supportError">{tool.resultado.error}</div>
            ) : (
              <div className="mt-2 text-xs text-cds-textSecondary">{toolTotal(tool)} resultado(s)</div>
            )}
          </div>
        ))}
      </div>
    </details>
  )
}
