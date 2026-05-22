import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  BarChart3,
  Bot,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  FlaskRound,
  FlaskConical,
  Gauge,
  History,
  LogOut,
  Menu,
  Microscope,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  ScrollText,
  Sun,
  Truck,
  UserCircle,
  Users,
  X,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { api } from "../lib/api"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { useTheme } from "../lib/theme"
import { Button } from "./ui/button"
import { StatusDot } from "./ui/status-dot"
import { cn } from "../lib/utils"

const navItems = [
  { to: "/owner", label: "Owner", icon: Building2, action: "ver_pagina_owner" },
  { to: "/", label: "Dashboard", icon: Gauge, action: "ver_pagina_dashboard" },
  { to: "/reactivos", label: "Reactivos", icon: FlaskConical, action: "ver_pagina_reactivos" },
  { to: "/lotes", label: "Lotes", icon: Package, action: "ver_pagina_lotes" },
  { to: "/consumo", label: "Consumo", icon: ScanLine, action: "ver_pagina_consumo", desktopOnly: true },
  { to: "/mesada", label: "Mesada", icon: FlaskRound, action: "ver_pagina_mesada", mobileOnly: true },
  { to: "/protocolos", label: "Protocolos", icon: ScrollText, action: "ver_pagina_protocolos" },
  { to: "/tareas", label: "Tareas", icon: ClipboardCheck, action: "ver_pagina_tareas" },
  { to: "/movimientos", label: "Movimientos", icon: History, action: "ver_pagina_movimientos" },
  { to: "/proveedores", label: "Proveedores", icon: Truck, action: "ver_pagina_proveedores" },
  { to: "/equipamiento", label: "Equipamiento", icon: Microscope, action: "ver_pagina_equipamiento" },
  { to: "/usuarios", label: "Usuarios", icon: Users, action: "ver_pagina_usuarios" },
  { to: "/asistente", label: "Asistente", icon: Bot, action: "ver_pagina_asistente" },
  { to: "/auditoria", label: "Auditoría", icon: BarChart3, action: "ver_pagina_auditoria" },
  { to: "/graphs", label: "Analítica", icon: ChartNoAxesCombined, action: "ver_pagina_analitica" },
]

const rolEtiqueta = {
  admin: "Administrador",
  jefe: "Jefe de laboratorio",
  cientifico: "Científico",
}

export function AppShell() {
  const { usuario, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const isDark = theme === "dark"
  const themeLabel = isDark ? "Modo claro" : "Modo oscuro"
  const ThemeIcon = isDark ? Sun : Moon
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [sidebarColapsado, setSidebarColapsado] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const mostrarApi = usuario?.rol === "admin"
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 5000,
    enabled: mostrarApi,
  })

  const visibleItems = navItems.filter((item) => puede(usuario, item.action))
  const desktopItems = visibleItems.filter((item) => !item.mobileOnly)
  const mobileItems = visibleItems.filter((item) => !item.desktopOnly)
  const online = healthQuery.data?.ok === true && !healthQuery.isError

  function handleModuleOpen(to: string) {
    window.dispatchEvent(new CustomEvent("lab:module-open", { detail: { to } }))
  }

  function toggleSidebar() {
    setAccountMenuOpen(false)
    setSidebarColapsado((colapsado) => !colapsado)
  }

  useEffect(() => {
    setMenuAbierto(false)
    setAccountMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setAccountMenuOpen(false)
  }, [sidebarColapsado])

  return (
    <div className="min-h-screen bg-cds-background text-cds-textPrimary">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden overflow-hidden bg-[var(--lab-sidebar-bg)] text-[var(--lab-sidebar-text)] transition-[width] duration-200 ease-out lg:block",
          sidebarColapsado ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-full w-60 flex-col">
        <div className="grid h-12 grid-cols-[4rem_1fr] items-center border-b border-[#393939] text-sm font-semibold tracking-[0.16px] text-white">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mx-auto h-9 w-9 text-[var(--lab-sidebar-text)] hover:bg-[var(--lab-sidebar-hover)] hover:text-white"
            aria-label={sidebarColapsado ? "Mostrar barra de módulos" : "Ocultar barra de módulos"}
            title={sidebarColapsado ? "Mostrar barra de módulos" : "Ocultar barra de módulos"}
            onClick={toggleSidebar}
          >
            {sidebarColapsado ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </Button>
          <span className="overflow-hidden whitespace-nowrap pr-3">Lab Inventory</span>
        </div>

        {mostrarApi ? (
          <div
            className="grid h-10 grid-cols-[4rem_1fr] items-center border-b border-[#393939] text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]"
            title={online ? "API conectada" : "API caída"}
          >
            <span className="mx-auto"><StatusDot online={online} /></span>
            <span className="overflow-hidden whitespace-nowrap">{online ? "API conectada" : "API caída"}</span>
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto py-2">
          {desktopItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                title={sidebarColapsado ? item.label : undefined}
                onClick={() => handleModuleOpen(item.to)}
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
        </nav>

        <div className="border-t border-[#393939] p-2">
          <div className="relative">
            {accountMenuOpen ? (
              <div className={cn(
                "border border-[#393939] bg-[var(--lab-sidebar-bg)] shadow-xl",
                sidebarColapsado ? "fixed bottom-16 left-2 z-30 w-44" : "absolute bottom-full left-2 right-2 mb-2",
              )}>
                {!sidebarColapsado ? (
                  <div className="border-b border-[#393939] px-3 py-3">
                    <div className="truncate text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]">Cuenta</div>
                    <div className="mt-1 truncate text-sm tracking-[0.16px] text-white">{usuario?.email}</div>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm tracking-[0.16px] text-[var(--lab-sidebar-text)] hover:bg-[var(--lab-sidebar-hover)] hover:text-white"
                  onClick={toggleTheme}
                  aria-label={themeLabel}
                >
                  <ThemeIcon size={18} aria-hidden="true" />
                  {themeLabel}
                </button>
                <button
                  type="button"
                  className="flex h-10 w-full items-center gap-2 border-t border-[#393939] px-3 text-left text-sm tracking-[0.16px] text-[var(--lab-sidebar-text)] hover:bg-[var(--lab-sidebar-hover)] hover:text-white"
                  onClick={logout}
                >
                  <LogOut size={18} aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="compact"
              className={cn(
                "grid h-12 w-full grid-cols-[3rem_1fr] justify-start px-0 text-[var(--lab-sidebar-text)] hover:bg-[var(--lab-sidebar-hover)] hover:text-white",
                accountMenuOpen && "bg-[var(--lab-sidebar-hover)] text-white",
              )}
              aria-label="Abrir menú de cuenta"
              aria-expanded={accountMenuOpen}
              title={sidebarColapsado ? "Cuenta" : undefined}
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <UserCircle className="mx-auto" size={20} aria-hidden="true" />
              <span className="min-w-0 overflow-hidden text-left">
                <span className="block truncate text-sm text-white">{usuario?.nombre}</span>
                <span className="block truncate text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]">
                  {usuario ? rolEtiqueta[usuario.rol] : ""}
                </span>
              </span>
            </Button>
          </div>
        </div>
        </div>
      </aside>

      <div className={cn("transition-[padding-left] duration-200 ease-out", sidebarColapsado ? "lg:pl-16" : "lg:pl-60")}>
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-cds-borderSubtle bg-cds-background px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto((abierto) => !abierto)}
            >
              {menuAbierto ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </Button>
            <div className="text-sm font-semibold tracking-[0.16px]">Lab Inventory</div>
          </div>
          {mostrarApi ? (
            <div className="flex items-center gap-2 text-xs tracking-[0.32px]">
              <StatusDot online={online} />
              API
            </div>
          ) : null}
        </header>

        {menuAbierto ? (
          <div className="fixed inset-0 top-12 z-20 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Cerrar menú"
              onClick={() => setMenuAbierto(false)}
            />
            <aside className="relative flex h-full w-[min(20rem,85vw)] flex-col bg-[var(--lab-sidebar-bg)] text-[var(--lab-sidebar-text)] shadow-xl">
              <div className="border-b border-[#393939] px-4 py-4">
                <div className="text-sm font-semibold tracking-[0.16px] text-white">{usuario?.nombre}</div>
                <div className="mt-1 text-xs tracking-[0.32px]">
                  {usuario ? rolEtiqueta[usuario.rol] : ""}{usuario?.sector ? ` · ${usuario.sector}` : ""}
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-2">
                {mobileItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={() => handleModuleOpen(item.to)}
                      className={({ isActive }) =>
                        cn(
                          "flex h-12 items-center gap-3 border-l-2 border-transparent px-4 text-sm tracking-[0.16px] transition-colors hover:bg-[var(--lab-sidebar-hover)] hover:text-white",
                          isActive && "border-cds-buttonPrimary bg-[var(--lab-sidebar-hover)] text-white",
                        )
                      }
                    >
                      <Icon size={18} aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  )
                })}
              </nav>

              <div className="border-t border-[#393939]">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={themeLabel}
                  className="flex h-12 w-full items-center gap-3 px-4 text-left text-sm tracking-[0.16px] text-[var(--lab-sidebar-text)] transition-colors hover:bg-[var(--lab-sidebar-hover)] hover:text-white"
                >
                  <ThemeIcon size={18} aria-hidden="true" />
                  {themeLabel}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#393939] p-3">
                {mostrarApi ? (
                  <div className="flex items-center gap-2 px-1 text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]" title={online ? "API conectada" : "API caída"}>
                    <StatusDot online={online} />
                    {online ? "API conectada" : "API caída"}
                  </div>
                ) : <div />}
                <Button type="button" variant="ghost" className="h-10 justify-start text-[var(--lab-sidebar-text)]" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={logout}>
                  <UserCircle size={18} aria-hidden="true" />
                  Cerrar sesión
                </Button>
              </div>
            </aside>
          </div>
        ) : null}

        <main className="lab-fade-in mx-auto max-w-[1584px] px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
