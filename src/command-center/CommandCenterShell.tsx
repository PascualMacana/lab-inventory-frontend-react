import { useMemo, useState } from "react"
import { ArrowLeft, Moon, Rocket, Sun, X } from "lucide-react"
import { Link, NavLink, Outlet } from "react-router-dom"

import type { Usuario } from "../lib/api"
import { useAuth } from "../lib/auth"
import { useTheme } from "../lib/theme"
import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import { CC_NAV, COUNTDOWN_TARGET } from "./data"
import { CommandCenterProvider, useCommandCenter } from "./CommandCenterContext"

// Shell propio del Command Center: sidebar-based (espeja el del inventario) para
// que se sienta "hecho en la app", con su sub-nav de 9 vistas. Marco aparte del
// AppShell; abre en pestaña nueva desde el menú admin, solo para co-dueños.

function diasRestantes() {
  return Math.max(0, Math.ceil((COUNTDOWN_TARGET.getTime() - Date.now()) / 864e5))
}

function Sidebar({ usuario, onNavigate }: { usuario: Usuario | null; onNavigate?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col bg-[var(--lab-sidebar-bg)] text-[var(--lab-sidebar-text)]">
      <div className="flex h-16 items-center gap-2.5 border-b border-[#393939] px-4">
        <Rocket size={20} className="text-[var(--lab-blue-40)]" aria-hidden="true" />
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-[0.2px] text-white">LabInventory</div>
          <div className="mt-1 font-mono text-[10.5px] tracking-[0.3px] text-[#8b95a0]">COMMAND CENTER</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {CC_NAV.map((group) => (
          <div key={group.label}>
            <div className="flex h-[30px] items-center px-4">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#717c86]">{group.label}</span>
            </div>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "grid h-12 grid-cols-[calc(4rem-2px)_1fr] items-center border-l-2 border-transparent text-sm tracking-[0.16px] transition-colors hover:bg-[var(--lab-sidebar-hover)] hover:text-white",
                      isActive && "border-cds-buttonPrimary bg-[var(--lab-sidebar-hover)] text-white",
                    )
                  }
                >
                  <Icon className="mx-auto shrink-0" size={18} aria-hidden="true" />
                  <span className="overflow-hidden whitespace-nowrap pr-3">{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Identidad del usuario realmente logueado (el Command Center es solo para
          co-dueños → owner_global), no un nombre fijo. */}
      <div className="border-t border-[#393939] px-4 py-3.5 text-xs text-[#8b95a0]">
        <span className="text-white">{usuario?.nombre ?? "—"}</span>
        <br />
        {usuario?.owner_global ? "Co-dueño · " : ""}
        {usuario?.email ?? ""}
      </div>
    </div>
  )
}

// Gatea el contenido hasta que el estado esté hidratado: las vistas (panel con
// contentEditable, finanzas con inputs) deben montar con datos reales, no defaults.
function ContenidoGateado({ hoy }: { hoy: string }) {
  const { cargando, error } = useCommandCenter()
  if (error) {
    return (
      <div className="border border-cds-supportError/40 bg-cds-supportError/10 p-4 text-sm text-cds-textPrimary">
        No se pudo cargar el Command Center: {error.message}
      </div>
    )
  }
  if (cargando) {
    return <div className="p-4 text-sm text-cds-textSecondary">Cargando Command Center...</div>
  }
  return <Outlet context={{ hoy }} />
}

function GuardadoFlash() {
  const { guardado } = useCommandCenter()
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 bg-cds-supportSuccess px-4 py-2.5 text-sm text-white transition-opacity duration-300",
        guardado ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      role="status"
      aria-live="polite"
    >
      Guardado ✓
    </div>
  )
}

export function CommandCenterShell() {
  const { usuario } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const ThemeIcon = isDark ? Sun : Moon
  const [drawerOpen, setDrawerOpen] = useState(false)

  const dias = useMemo(diasRestantes, [])
  const hoy = useMemo(
    () => new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }),
    [],
  )

  return (
    <CommandCenterProvider>
      <div className="min-h-screen bg-cds-background text-cds-textPrimary">
        {/* Sidebar fijo en desktop */}
        <aside className="fixed inset-y-0 left-0 hidden w-60 overflow-hidden lg:block">
          <Sidebar usuario={usuario} />
        </aside>

        {/* Drawer en mobile */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-60">
              <Sidebar usuario={usuario} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="lg:pl-60">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-cds-borderSubtle bg-cds-background px-4 py-3 md:px-7">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 lg:hidden"
              aria-label="Abrir menú"
              onClick={() => setDrawerOpen(true)}
            >
              <Rocket size={18} aria-hidden="true" />
            </Button>
            <div className="text-[13px] text-cds-textSecondary">
              Objetivo 90 días: <b className="text-cds-textPrimary">1 piloto o cliente pago</b> que valide intención de pago
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <Link
                to="/"
                className="inline-flex h-9 items-center gap-2 px-2.5 text-sm tracking-[0.16px] text-cds-linkPrimary transition-colors hover:bg-cds-layer01"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Inventario</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label={isDark ? "Tema claro" : "Tema oscuro"}
                title={isDark ? "Tema claro" : "Tema oscuro"}
                onClick={toggleTheme}
              >
                <ThemeIcon size={18} aria-hidden="true" />
              </Button>
              <div className="bg-[var(--lab-sidebar-bg)] px-3 py-1.5 font-mono text-[13px] text-white">
                <b className="text-cds-supportWarning">{dias}</b> días restantes
              </div>
            </div>
          </header>

          <main className="lab-fade-in mx-auto max-w-[1180px] px-4 py-7 md:px-7">
            <ContenidoGateado hoy={hoy} />
          </main>
        </div>

        <GuardadoFlash />
        {/* X de cierre del drawer (accesible) */}
        {drawerOpen ? (
          <button
            type="button"
            className="fixed right-4 top-3 z-50 text-white lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={22} />
          </button>
        ) : null}
      </div>
    </CommandCenterProvider>
  )
}
