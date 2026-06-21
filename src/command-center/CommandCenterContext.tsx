import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { api } from "../lib/api"
import type { CommandCenterEstado, CommandCenterFin, CommandCenterFunnel, CommandCenterLead } from "../lib/api"
import { useAuth } from "../lib/auth"
import { DEFAULT_FIN, DEFAULT_FUNNEL, DEFAULT_OKR_TARGET, DEFAULT_PANEL } from "./data"
import type { FunnelKey } from "./data"

// Espejo en React del objeto `state` del export standalone: un único estado de
// trabajo (funnel/panel/fin/okr/weekly/dark/crm) que los componentes editan y que
// se persiste contra el backend. Los ajustes (singleton) van con debounce de 600ms;
// los leads pegan directo a sus endpoints (optimista, como el HTML original).

const EMPTY: CommandCenterEstado = { funnel: {}, panel: {}, fin: {}, okr: {}, weekly: {}, dark: false, crm: [] }

// Merge profundo de finanzas contra los defaults (precios y clientes anidados).
function mergeFin(parcial: Partial<CommandCenterFin> | undefined): CommandCenterFin {
  const f = parcial ?? {}
  const clients = { ...DEFAULT_FIN.clients }
  if (f.clients) {
    for (const seg of Object.keys(clients) as (keyof CommandCenterFin["clients"])[]) {
      clients[seg] = { ...clients[seg], ...(f.clients[seg] ?? {}) }
    }
  }
  return {
    ...DEFAULT_FIN,
    ...f,
    price: { ...DEFAULT_FIN.price, ...(f.price ?? {}) },
    clients,
  }
}

interface CommandCenterCtx {
  cargando: boolean
  error: Error | null
  guardado: boolean
  funnel: CommandCenterFunnel
  panel: Record<string, string>
  fin: CommandCenterFin
  okrTarget: number
  weekly: Record<string, boolean>
  leads: CommandCenterLead[]
  setPanelCampo: (k: string, v: string) => void
  setFunnelCampo: (k: FunnelKey, v: number) => void
  setFin: (fin: CommandCenterFin) => void
  setOkrTarget: (n: number) => void
  toggleWeekly: (i: number) => void
  resetWeekly: () => void
  crearLead: () => Promise<void>
  actualizarLead: (id: number, campo: string, valor: string) => void
  eliminarLead: (id: number) => Promise<void>
  resetLeads: () => Promise<void>
}

const Ctx = createContext<CommandCenterCtx | null>(null)

export function CommandCenterProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [state, setState] = useState<CommandCenterEstado>(EMPTY)
  const [hidratado, setHidratado] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const query = useQuery({
    queryKey: ["command-center"],
    queryFn: () => api.commandCenter(token!),
    enabled: Boolean(token),
  })

  // Hidrata el estado de trabajo una sola vez, cuando llega la respuesta.
  useEffect(() => {
    if (query.data && !hidratado) {
      setState({ ...EMPTY, ...query.data })
      setHidratado(true)
    }
  }, [query.data, hidratado])

  // Flash "Guardado ✓" (efímero) en cada persistencia.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = useCallback(() => {
    setGuardado(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setGuardado(false), 900)
  }, [])

  // Guardado del singleton con debounce. Manda el bloque completo de ajustes (como
  // save() del export), tomando siempre el último estado vía ref.
  const stateRef = useRef(state)
  stateRef.current = state
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const guardarEstado = useCallback(() => {
    flash()
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const s = stateRef.current
      void api
        .commandCenterGuardarEstado(token!, {
          funnel: s.funnel,
          panel: s.panel,
          fin: s.fin,
          okr: s.okr,
          weekly: s.weekly,
          dark: s.dark,
        })
        .catch((e) => console.error("No se pudo guardar el estado", e))
    }, 600)
  }, [flash, token])

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  // ── Setters de ajustes (singleton) ──
  const setPanelCampo = useCallback(
    (k: string, v: string) => {
      setState((s) => ({ ...s, panel: { ...s.panel, [k]: v } }))
      guardarEstado()
    },
    [guardarEstado],
  )
  const setFunnelCampo = useCallback(
    (k: FunnelKey, v: number) => {
      setState((s) => ({ ...s, funnel: { ...DEFAULT_FUNNEL, ...s.funnel, [k]: v } }))
      guardarEstado()
    },
    [guardarEstado],
  )
  const setFin = useCallback(
    (fin: CommandCenterFin) => {
      setState((s) => ({ ...s, fin }))
      guardarEstado()
    },
    [guardarEstado],
  )
  const setOkrTarget = useCallback(
    (n: number) => {
      setState((s) => ({ ...s, okr: { ...s.okr, target: n } }))
      guardarEstado()
    },
    [guardarEstado],
  )
  const toggleWeekly = useCallback(
    (i: number) => {
      setState((s) => ({ ...s, weekly: { ...s.weekly, [i]: !s.weekly[i] } }))
      guardarEstado()
    },
    [guardarEstado],
  )
  const resetWeekly = useCallback(() => {
    setState((s) => ({ ...s, weekly: {} }))
    guardarEstado()
  }, [guardarEstado])

  // ── Leads (CRM): pegan directo a sus endpoints, optimista ──
  const crearLead = useCallback(async () => {
    try {
      const lead = await api.commandCenterCrearLead(token!, { fecha: new Date().toISOString().slice(0, 10) })
      setState((s) => ({ ...s, crm: [lead, ...s.crm] }))
      flash()
    } catch (e) {
      console.error("No se pudo crear el lead", e)
    }
  }, [flash, token])

  const actualizarLead = useCallback(
    (id: number, campo: string, valor: string) => {
      setState((s) => ({ ...s, crm: s.crm.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)) }))
      flash()
      void api
        .commandCenterActualizarLead(token!, id, { [campo]: valor })
        .catch((e) => console.error("No se pudo actualizar el lead", e))
    },
    [flash, token],
  )

  const eliminarLead = useCallback(
    async (id: number) => {
      const lead = stateRef.current.crm.find((l) => l.id === id)
      if (!lead) return
      if (!window.confirm(`¿Eliminar ${lead.nombre || "este lead"}?`)) return
      try {
        await api.commandCenterEliminarLead(token!, id)
        setState((s) => ({ ...s, crm: s.crm.filter((l) => l.id !== id) }))
        flash()
      } catch (e) {
        console.error("No se pudo eliminar el lead", e)
      }
    },
    [flash, token],
  )

  const resetLeads = useCallback(async () => {
    if (!window.confirm("¿Restaurar los 11 leads originales? Se pierden tus cambios del CRM.")) return
    try {
      const res = await api.commandCenterResetLeads(token!)
      setState((s) => ({ ...s, crm: res.crm ?? [] }))
      flash()
    } catch (e) {
      console.error("No se pudo resetear el CRM", e)
    }
  }, [flash, token])

  const value = useMemo<CommandCenterCtx>(
    () => ({
      cargando: query.isLoading || (!hidratado && !query.isError),
      error: query.error as Error | null,
      guardado,
      funnel: { ...DEFAULT_FUNNEL, ...state.funnel },
      panel: { ...DEFAULT_PANEL, ...state.panel },
      fin: mergeFin(state.fin),
      okrTarget: state.okr.target ?? DEFAULT_OKR_TARGET,
      weekly: state.weekly,
      leads: state.crm,
      setPanelCampo,
      setFunnelCampo,
      setFin,
      setOkrTarget,
      toggleWeekly,
      resetWeekly,
      crearLead,
      actualizarLead,
      eliminarLead,
      resetLeads,
    }),
    [
      query.isLoading,
      query.isError,
      query.error,
      hidratado,
      guardado,
      state,
      setPanelCampo,
      setFunnelCampo,
      setFin,
      setOkrTarget,
      toggleWeekly,
      resetWeekly,
      crearLead,
      actualizarLead,
      eliminarLead,
      resetLeads,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCommandCenter() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("useCommandCenter debe usarse dentro de CommandCenterProvider")
  }
  return ctx
}
