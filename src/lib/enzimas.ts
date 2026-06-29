// Restriction-enzyme scanner (pure, deterministic, no network). A small table of
// common Type II enzymes with palindromic recognition sites; we scan the forward
// strand only (a palindromic site reads the same on both strands, so a single pass
// finds every occurrence). Used by the sequence map to surface cut sites — above
// all the *unique cutters*, the ones that matter for cloning into a plasmid.

export type Enzima = { nombre: string; sitio: string; corte: number }

// `sitio`: recognition sequence (plain ACGT, palindromic). `corte`: number of bases
// before the top-strand cut, measured from the start of the site (EcoRI G^AATTC → 1,
// SmaI CCC^GGG → 3, PstI CTGCA^G → 5). Used to report the cut coordinate.
export const ENZIMAS: Enzima[] = [
  { nombre: "EcoRI", sitio: "GAATTC", corte: 1 },
  { nombre: "BamHI", sitio: "GGATCC", corte: 1 },
  { nombre: "HindIII", sitio: "AAGCTT", corte: 1 },
  { nombre: "NotI", sitio: "GCGGCCGC", corte: 2 },
  { nombre: "XhoI", sitio: "CTCGAG", corte: 1 },
  { nombre: "SalI", sitio: "GTCGAC", corte: 1 },
  { nombre: "PstI", sitio: "CTGCAG", corte: 5 },
  { nombre: "SmaI", sitio: "CCCGGG", corte: 3 },
  { nombre: "KpnI", sitio: "GGTACC", corte: 5 },
  { nombre: "SacI", sitio: "GAGCTC", corte: 5 },
  { nombre: "XbaI", sitio: "TCTAGA", corte: 1 },
  { nombre: "SpeI", sitio: "ACTAGT", corte: 1 },
  { nombre: "NcoI", sitio: "CCATGG", corte: 1 },
  { nombre: "NdeI", sitio: "CATATG", corte: 2 },
  { nombre: "EcoRV", sitio: "GATATC", corte: 3 },
  { nombre: "ClaI", sitio: "ATCGAT", corte: 2 },
  { nombre: "NheI", sitio: "GCTAGC", corte: 1 },
  { nombre: "BglII", sitio: "AGATCT", corte: 1 },
  { nombre: "SphI", sitio: "GCATGC", corte: 5 },
  { nombre: "AflII", sitio: "CTTAAG", corte: 1 },
  { nombre: "ApaI", sitio: "GGGCCC", corte: 5 },
  { nombre: "EagI", sitio: "CGGCCG", corte: 1 },
  { nombre: "DraI", sitio: "TTTAAA", corte: 3 },
  { nombre: "StuI", sitio: "AGGCCT", corte: 3 },
  { nombre: "PvuII", sitio: "CAGCTG", corte: 3 },
  { nombre: "ScaI", sitio: "AGTACT", corte: 3 },
]

export type SitiosEnzima = { enzima: string; sitio: string; posiciones: number[] }

/**
 * Escanea `secuencia` contra `ENZIMAS` y devuelve, por enzima con al menos un sitio,
 * las coordenadas de corte (1-based, base anterior al corte en la hebra directa),
 * ordenadas. En `circular` se contemplan sitios que cruzan el origen. El resultado
 * sale ordenado con los cortadores únicos primero.
 */
export function buscarSitios(secuencia: string, circular: boolean): SitiosEnzima[] {
  const seq = secuencia.toUpperCase()
  const n = seq.length
  const resultado: SitiosEnzima[] = []
  for (const e of ENZIMAS) {
    const largo = e.sitio.length
    if (largo > n) {
      continue
    }
    // En circular extendemos con el prefijo para capturar sitios que cruzan el origen.
    const buscado = circular ? seq + seq.slice(0, largo - 1) : seq
    const posiciones: number[] = []
    let i = buscado.indexOf(e.sitio)
    while (i !== -1) {
      if (i < n) {
        // Coordenada de corte 1-based, con wrap para el caso circular.
        const corte = (((i + e.corte - 1) % n) + n) % n + 1
        posiciones.push(corte)
      }
      i = buscado.indexOf(e.sitio, i + 1)
    }
    if (posiciones.length > 0) {
      posiciones.sort((a, b) => a - b)
      const unicas = posiciones.filter((p, idx) => idx === 0 || p !== posiciones[idx - 1])
      resultado.push({ enzima: e.nombre, sitio: e.sitio, posiciones: unicas })
    }
  }
  // Cortadores únicos primero, después por cantidad de sitios y nombre.
  resultado.sort((a, b) => a.posiciones.length - b.posiciones.length || a.enzima.localeCompare(b.enzima))
  return resultado
}
