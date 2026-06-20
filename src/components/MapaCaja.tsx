import { useTranslation } from "react-i18next"

import { cn } from "../lib/utils"

const LETRAS = "ABCDEFGHIJKLMNO".split("")

// Una celda ocupada del mapa: la posición física más qué hay ahí (para el
// tooltip de hover). El formateo de los textos vive en la página (tiene i18n).
export type CeldaOcupada = {
  posicion: string | null | undefined
  titulo: string
  detalle?: string | null
}

// Mapa visual de una caja de freezer: grilla de posiciones (filas A.. × columnas
// 1..N) con las posiciones ocupadas resaltadas en el acento del cepario. Al
// pasar el mouse por una celda ocupada se muestra qué vial hay alli (código,
// nro de viales, ubicación). Es la pieza más "biobanco" de la sección; vive
// aparte por reutilizable.
export function MapaCaja({
  ocupadas,
  secundarias = [],
  color = "var(--lab-cepario)",
  filas = 9,
  columnas = 9,
  onCelda,
}: {
  ocupadas: CeldaOcupada[]
  // Otras celdas ocupadas (p. ej. de otras cepas en la misma caja): se pintan en
  // gris tenue, como contexto. En la Vista Cajas no se usan (todo va en `ocupadas`).
  secundarias?: CeldaOcupada[]
  // Color de las celdas ocupadas: morado del cepario en micro, color de la
  // categoría en partes. Lo decide la página dueña.
  color?: string
  filas?: number
  columnas?: number
  // Si se pasa, las celdas ocupadas (y secundarias) son clickeables.
  onCelda?: (celda: CeldaOcupada) => void
}) {
  const { t } = useTranslation()
  const porPosicion = new Map<string, CeldaOcupada>()
  for (const celda of ocupadas) {
    const clave = (celda.posicion ?? "").trim().toUpperCase()
    if (clave) {
      porPosicion.set(clave, celda)
    }
  }
  const porPosicionSec = new Map<string, CeldaOcupada>()
  for (const celda of secundarias) {
    const clave = (celda.posicion ?? "").trim().toUpperCase()
    if (clave && !porPosicion.has(clave)) {
      porPosicionSec.set(clave, celda)
    }
  }
  const filasLetras = LETRAS.slice(0, filas)

  return (
    <div className="inline-block">
      <div className="flex flex-col gap-1">
        <div className="flex gap-1 pl-5">
          {Array.from({ length: columnas }, (_, i) => (
            <span key={i} className="w-6 text-center text-[10px] text-cds-textSecondary">
              {i + 1}
            </span>
          ))}
        </div>
        {filasLetras.map((letra) => (
          <div key={letra} className="flex items-center gap-1">
            <span className="w-4 text-[10px] text-cds-textSecondary">{letra}</span>
            {Array.from({ length: columnas }, (_, i) => {
              const pos = `${letra}${i + 1}`
              const info = porPosicion.get(pos)
              const sec = info ? undefined : porPosicionSec.get(pos)
              if (!info && !sec) {
                // Vacía: hover nativo con la posición, sin más.
                return (
                  <span
                    key={pos}
                    title={pos}
                    className="h-6 w-6 rounded-sm border border-cds-borderSubtle bg-cds-layer01"
                  />
                )
              }
              const celda = (info ?? sec) as CeldaOcupada
              const clickable = Boolean(onCelda)
              // La celda primaria va en color; la secundaria (otra cepa) en gris tenue.
              const estilo = info
                ? { backgroundColor: color, borderColor: color, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.4)" }
                : { backgroundColor: "var(--cds-border-subtle)", borderColor: "var(--cds-border-subtle)", opacity: 0.7 }
              return (
                <span key={pos} className="group relative">
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => onCelda?.(celda)}
                      aria-label={`${pos} · ${celda.titulo}${celda.detalle ? ` · ${celda.detalle}` : ""}`}
                      className="block h-6 w-6 rounded-sm border transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cds-focus"
                      style={estilo}
                    />
                  ) : (
                    <span
                      aria-label={`${pos} · ${celda.titulo}${celda.detalle ? ` · ${celda.detalle}` : ""}`}
                      className="block h-6 w-6 rounded-sm border transition-transform group-hover:scale-110"
                      style={estilo}
                    />
                  )}
                  <span
                    role="tooltip"
                    className={cn(
                      "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded",
                      "border border-cds-borderSubtle bg-cds-layer01 px-2.5 py-1.5 text-left shadow-[0_6px_20px_rgba(30,30,40,0.14)] group-hover:block",
                    )}
                  >
                    <span className="block font-mono text-[11px] text-cds-textPrimary">
                      {pos} · {celda.titulo}
                    </span>
                    {celda.detalle ? (
                      <span className="mt-0.5 block text-[10px] text-cds-textSecondary">{celda.detalle}</span>
                    ) : null}
                  </span>
                </span>
              )
            })}
          </div>
        ))}
      </div>
      {porPosicion.size === 0 && porPosicionSec.size === 0 ? (
        <p className="mt-2 text-xs text-cds-textSecondary">{t("cepario.mapaCajaSinPos")}</p>
      ) : null}
    </div>
  )
}
