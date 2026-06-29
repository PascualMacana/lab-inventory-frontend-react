// Motif / subsequence search (pure, deterministic). Matches a query against the
// forward strand, supporting IUPAC ambiguity codes (N, R, Y, S, W, K, M, B, D, H, V),
// so the user can search exact subsequences or degenerate motifs (e.g. "GGNCC").
// Used by the sequence panel to highlight hits in both the text and the map.

// IUPAC code → regex character class.
const IUPAC: Record<string, string> = {
  A: "A", C: "C", G: "G", T: "T",
  R: "[AG]", Y: "[CT]", S: "[GC]", W: "[AT]", K: "[GT]", M: "[AC]",
  B: "[CGT]", D: "[AGT]", H: "[ACT]", V: "[ACG]", N: "[ACGT]",
}

// IUPAC complement, for searching the reverse strand.
const COMPLEMENTO: Record<string, string> = {
  A: "T", C: "G", G: "C", T: "A",
  R: "Y", Y: "R", S: "S", W: "W", K: "M", M: "K",
  B: "V", D: "H", H: "D", V: "B", N: "N",
}

export type Hebra = "+" | "-"
export type Coincidencia = { inicio: number; fin: number; hebra: Hebra }

/** Complemento reverso de una secuencia (caracteres fuera del alfabeto → N). */
export function complementoReverso(seq: string): string {
  let out = ""
  for (let i = seq.length - 1; i >= 0; i--) {
    out += COMPLEMENTO[seq[i].toUpperCase()] ?? "N"
  }
  return out
}

function normalizar(motivo: string): string {
  return motivo.toUpperCase().replace(/\s+/g, "")
}

/** True si el motivo tiene al menos un carácter y todos son del alfabeto IUPAC. */
export function esMotivoValido(motivo: string): boolean {
  const limpio = normalizar(motivo)
  return limpio.length > 0 && [...limpio].every((c) => c in IUPAC)
}

function motivoARegex(motivo: string): RegExp | null {
  const limpio = normalizar(motivo)
  if (!limpio) {
    return null
  }
  let patron = ""
  for (const ch of limpio) {
    const clase = IUPAC[ch]
    if (!clase) {
      return null // carácter fuera del alfabeto IUPAC
    }
    patron += clase
  }
  return new RegExp(patron, "g")
}

// Índices (0-based) de todas las coincidencias no solapadas de `re` en `seq`.
function indices(re: RegExp, seq: string): number[] {
  const out: number[] = []
  re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(seq)) !== null) {
    out.push(m.index)
    if (m.index === re.lastIndex) {
      re.lastIndex++ // protección ante coincidencias de largo 0 (no debería pasar)
    }
  }
  return out
}

/**
 * Devuelve las coincidencias (1-based, no solapadas) del motivo en `secuencia`. Por
 * defecto solo la hebra directa; con `ambasHebras` agrega la reversa: busca el motivo
 * sobre el complemento reverso y mapea cada posición a coordenadas de la hebra directa.
 * `[]` si el motivo es inválido, vacío o más largo que la secuencia.
 */
export function buscarMotivo(secuencia: string, motivo: string, ambasHebras = false): Coincidencia[] {
  const re = motivoARegex(motivo)
  if (!re) {
    return []
  }
  const seq = secuencia.toUpperCase()
  const largo = normalizar(motivo).length
  if (largo === 0 || largo > seq.length) {
    return []
  }
  const out: Coincidencia[] = indices(re, seq).map((i) => ({ inicio: i + 1, fin: i + largo, hebra: "+" as const }))
  if (ambasHebras) {
    const L = seq.length
    // i..i+largo-1 en el complemento reverso ↔ forward [L-i-largo+1 .. L-i] (1-based).
    for (const i of indices(re, complementoReverso(seq))) {
      out.push({ inicio: L - i - largo + 1, fin: L - i, hebra: "-" })
    }
  }
  return out
}
