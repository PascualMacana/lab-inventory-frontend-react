import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Bot,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  Dna,
  ExternalLink,
  FlaskRound,
  FlaskConical,
  Gauge,
  History,
  Languages,
  LogOut,
  Menu,
  Microscope,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  ScrollText,
  ShoppingCart,
  Sun,
  Truck,
  UserCircle,
  Users,
  X,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { api } from "../lib/api"
import { useAuth } from "../lib/auth"
import { setLang, type Lang } from "../lib/i18n"
import { puede } from "../lib/permissions"
import { useTheme } from "../lib/theme"
import { Button } from "./ui/button"
import { StatusDot } from "./ui/status-dot"
import { cn } from "../lib/utils"

const navItems = [
  { to: "/owner", labelKey: "nav.owner", icon: Building2, action: "ver_pagina_owner" },
  { to: "/", labelKey: "nav.dashboard", icon: Gauge, action: "ver_pagina_dashboard" },
  { to: "/reactivos", labelKey: "nav.reactivos", icon: FlaskConical, action: "ver_pagina_reactivos" },
  { to: "/consumo", labelKey: "nav.consumo", icon: ScanLine, action: "ver_pagina_consumo", desktopOnly: true },
  { to: "/mesada", labelKey: "nav.mesada", icon: FlaskRound, action: "ver_pagina_mesada", mobileOnly: true },
  { to: "/protocolos", labelKey: "nav.protocolos", icon: ScrollText, action: "ver_pagina_protocolos" },
  { to: "/tareas", labelKey: "nav.tareas", icon: ClipboardCheck, action: "ver_pagina_tareas" },
  { to: "/compras", labelKey: "nav.compras", icon: ShoppingCart, action: "ver_pagina_compras" },
  { to: "/movimientos", labelKey: "nav.movimientos", icon: History, action: "ver_pagina_movimientos" },
  { to: "/proveedores", labelKey: "nav.proveedores", icon: Truck, action: "ver_pagina_proveedores" },
  { to: "/equipamiento", labelKey: "nav.equipamiento", icon: Microscope, action: "ver_pagina_equipamiento" },
  { to: "/cepario", labelKey: "nav.cepario", icon: Dna, action: "ver_pagina_cepario" },
  { to: "/usuarios", labelKey: "nav.usuarios", icon: Users, action: "ver_pagina_usuarios" },
  { to: "/asistente", labelKey: "nav.asistente", icon: Bot, action: "ver_pagina_asistente" },
  { to: "/auditoria", labelKey: "nav.auditoria", icon: BarChart3, action: "ver_pagina_auditoria" },
  { to: "/graphs", labelKey: "nav.analitica", icon: ChartNoAxesCombined, action: "ver_pagina_analitica" },
]

type NavItem = (typeof navItems)[number]

// Los 15 destinos se agrupan en 5 secciones. navItems sigue siendo la fuente de
// datos (icono/permiso/labels); estos grupos solo ordenan el render por sección.
const navGroups: { labelKey: string; items: string[] }[] = [
  { labelKey: "navGroup.inicio", items: ["/"] },
  { labelKey: "navGroup.inventario", items: ["/reactivos", "/cepario", "/equipamiento", "/proveedores"] },
  { labelKey: "navGroup.operacion", items: ["/consumo", "/mesada", "/protocolos", "/tareas", "/compras", "/movimientos"] },
  { labelKey: "navGroup.analisis", items: ["/auditoria", "/graphs", "/asistente"] },
  { labelKey: "navGroup.admin", items: ["/owner", "/usuarios"] },
]

// Build the visible groups for a viewport: keep each group's items in declared
// order, drop items the user can't see, and drop a whole group if it ends empty
// (so roles without permissions never leave an orphan eyebrow).
function buildGroups(visible: NavItem[]) {
  const visibleByPath = new Map(visible.map((item) => [item.to, item]))
  return navGroups
    .map((group) => ({
      labelKey: group.labelKey,
      items: group.items.map((to) => visibleByPath.get(to)).filter((item): item is NavItem => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0)
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

// Monograma de cuenta: mismo recurso de identidad en sidebar y drawer mobile.
function Monograma({ nombre, className }: { nombre?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-cds-buttonPrimary text-[11.5px] font-semibold text-white",
        className,
      )}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  )
}

const langs: Lang[] = ["es", "en"]

export function AppShell() {
  const { usuario, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isDark = theme === "dark"
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "es").slice(0, 2)
  const themeLabel = t(isDark ? "account.lightMode" : "account.darkMode")
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
  const desktopGroups = buildGroups(desktopItems)
  const mobileGroups = buildGroups(mobileItems)
  const online = healthQuery.data?.ok === true && !healthQuery.isError

  function handleModuleOpen(to: string) {
    window.dispatchEvent(new CustomEvent("lab:module-open", { detail: { to } }))
  }

  function toggleSidebar() {
    setAccountMenuOpen(false)
    setSidebarColapsado((colapsado) => !colapsado)
  }

  function handleLogout() {
    void logout()
    navigate("/login", { replace: true })
  }

  useEffect(() => {
    setMenuAbierto(false)
    setAccountMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setAccountMenuOpen(false)
  }, [sidebarColapsado])

  function renderDesktopItem(item: NavItem) {
    const Icon = item.icon
    if (item.to === "/cepario") {
      // Cepario abre en pestaña nueva con su propio shell (dominio aparte del almacén).
      return (
        <a
          key={item.to}
          href={item.to}
          target="_blank"
          rel="noopener noreferrer"
          title={sidebarColapsado ? t(item.labelKey) : undefined}
          className="grid h-12 grid-cols-[calc(4rem-2px)_1fr] items-center border-l-2 border-transparent text-sm tracking-[0.16px] transition-colors hover:bg-[color-mix(in_srgb,var(--lab-cepario)_50%,var(--lab-sidebar-hover))] hover:text-white"
        >
          <Icon className="mx-auto shrink-0" size={18} aria-hidden="true" />
          {!sidebarColapsado ? (
            <span className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap pr-3">
              {t(item.labelKey)}
              <ExternalLink className="shrink-0 text-[var(--lab-cepario)]" size={12} aria-hidden="true" />
            </span>
          ) : null}
        </a>
      )
    }
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === "/"}
        title={sidebarColapsado ? t(item.labelKey) : undefined}
        onClick={() => handleModuleOpen(item.to)}
        className={({ isActive }) =>
          cn(
            "grid h-12 grid-cols-[calc(4rem-2px)_1fr] items-center border-l-2 border-transparent text-sm tracking-[0.16px] transition-colors hover:bg-[var(--lab-sidebar-hover)] hover:text-white",
            isActive && "border-cds-buttonPrimary bg-[var(--lab-sidebar-hover)] text-white",
          )
        }
      >
        <Icon className="mx-auto shrink-0" size={18} aria-hidden="true" />
        {!sidebarColapsado ? (
          <span className="overflow-hidden whitespace-nowrap pr-3">{t(item.labelKey)}</span>
        ) : null}
      </NavLink>
    )
  }

  function renderMobileItem(item: NavItem) {
    const Icon = item.icon
    if (item.to === "/cepario") {
      return (
        <a
          key={item.to}
          href={item.to}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMenuAbierto(false)}
          className="flex h-12 items-center gap-3 border-l-2 border-transparent px-4 text-sm tracking-[0.16px] transition-colors hover:bg-[color-mix(in_srgb,var(--lab-cepario)_50%,var(--lab-sidebar-hover))] hover:text-white"
        >
          <Icon size={18} aria-hidden="true" />
          {t(item.labelKey)}
          <ExternalLink className="shrink-0 text-[var(--lab-cepario)]" size={12} aria-hidden="true" />
        </a>
      )
    }
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
        {t(item.labelKey)}
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-cds-background text-cds-textPrimary">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden overflow-hidden bg-[var(--lab-sidebar-bg)] text-[var(--lab-sidebar-text)] transition-[width] duration-200 ease-out lg:block",
          sidebarColapsado ? "w-16" : "w-60",
        )}
      >
        {/* Sigue el ancho de la barra (64/240) en vez de quedar fijo en 240: así
            ningún hijo del nav (divisores, fondo del item activo) supera los 64px
            colapsado y no puede escaparse del recorte (quirk de scroll-container). */}
        <div className="flex h-full w-full flex-col">
        <div className="grid h-12 grid-cols-[4rem_1fr] items-center border-b border-[#393939] text-sm font-semibold tracking-[0.16px] text-white">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mx-auto h-9 w-9 text-[var(--lab-sidebar-text)] hover:bg-[var(--lab-sidebar-hover)] hover:text-white"
            aria-label={t(sidebarColapsado ? "shell.showModules" : "shell.hideModules")}
            title={t(sidebarColapsado ? "shell.showModules" : "shell.hideModules")}
            onClick={toggleSidebar}
          >
            {sidebarColapsado ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </Button>
          <span className="overflow-hidden whitespace-nowrap pr-3">{t("shell.appName")}</span>
        </div>

        {mostrarApi ? (
          <div
            className="grid h-10 grid-cols-[4rem_1fr] items-center border-b border-[#393939] text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]"
            title={online ? t("shell.apiConnected") : t("shell.apiDown")}
          >
            <span className="mx-auto"><StatusDot online={online} /></span>
            <span className="overflow-hidden whitespace-nowrap">{online ? t("shell.apiConnected") : t("shell.apiDown")}</span>
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto py-2">
          {desktopGroups.map((group, index) => (
            <div key={group.labelKey}>
              {/* El primer grupo (Dashboard) va como item principal arriba, sin
                  encabezado: evita que su "bloque" quede más alto que el resto y,
                  colapsado, el hueco vacío bajo la fila de API. El resto lleva
                  encabezado de igual alto expandido/colapsado (eyebrow ↔ línea)
                  para que los iconos no salten al minimizar. */}
              {index > 0 ? (
                <div
                  className={cn("flex h-[30px] items-center", !sidebarColapsado && "px-4")}
                  aria-hidden="true"
                >
                  {sidebarColapsado ? (
                    <span className="h-px w-full bg-[#393939]" />
                  ) : (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#717c86]">
                      {t(group.labelKey)}
                    </span>
                  )}
                </div>
              ) : null}
              {group.items.map((item) => renderDesktopItem(item))}
            </div>
          ))}
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
                    <div className="truncate text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]">{t("account.title")}</div>
                    <div className="mt-1 truncate text-sm tracking-[0.16px] text-white">{usuario?.email}</div>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 border-b border-[#393939] px-3 py-2 text-[var(--lab-sidebar-text)]">
                  <Languages size={18} aria-hidden="true" />
                  <span className="text-sm tracking-[0.16px]">{t("account.language")}</span>
                  <div className="ml-auto flex">
                    {langs.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLang(code)}
                        className={cn(
                          "px-2 py-1 text-xs uppercase tracking-[0.16px] transition-colors",
                          lang === code ? "text-white" : "hover:text-white",
                        )}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
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
                  onClick={handleLogout}
                >
                  <LogOut size={18} aria-hidden="true" />
                  {t("account.logout")}
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
              aria-label={t("account.openMenu")}
              aria-expanded={accountMenuOpen}
              title={sidebarColapsado ? t("account.title") : undefined}
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <Monograma nombre={usuario?.nombre} className="mx-auto" />
              <span className="min-w-0 overflow-hidden text-left">
                <span className="block truncate text-sm text-white">{usuario?.nombre}</span>
                <span className="block truncate text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]">
                  {usuario ? t(`roles.${usuario.rol}`) : ""}
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
              aria-label={t(menuAbierto ? "shell.closeMenu" : "shell.openMenu")}
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto((abierto) => !abierto)}
            >
              {menuAbierto ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </Button>
            <div className="text-sm font-semibold tracking-[0.16px]">{t("shell.appName")}</div>
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
              aria-label={t("shell.closeMenu")}
              onClick={() => setMenuAbierto(false)}
            />
            <aside className="relative flex h-full w-[min(20rem,85vw)] flex-col bg-[var(--lab-sidebar-bg)] text-[var(--lab-sidebar-text)] shadow-xl">
              <div className="flex items-center gap-3 border-b border-[#393939] px-4 py-4">
                <Monograma nombre={usuario?.nombre} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-[0.16px] text-white">{usuario?.nombre}</div>
                  <div className="mt-1 truncate text-xs tracking-[0.32px]">
                    {usuario ? t(`roles.${usuario.rol}`) : ""}{usuario?.sector ? ` · ${usuario.sector}` : ""}
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-2">
                {mobileGroups.map((group, index) => (
                  <div key={group.labelKey}>
                    {index > 0 ? (
                      <div className="px-4 pb-1.5 pt-3.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#717c86]">
                        {t(group.labelKey)}
                      </div>
                    ) : null}
                    {group.items.map((item) => renderMobileItem(item))}
                  </div>
                ))}
              </nav>

              <div className="flex items-center gap-3 border-t border-[#393939] px-4 py-3 text-sm tracking-[0.16px] text-[var(--lab-sidebar-text)]">
                <Languages size={18} aria-hidden="true" />
                <span>{t("account.language")}</span>
                <div className="ml-auto flex">
                  {langs.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLang(code)}
                      className={cn(
                        "px-3 py-1 text-xs uppercase tracking-[0.16px] transition-colors",
                        lang === code ? "text-white" : "hover:text-white",
                      )}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

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
                  <div className="flex items-center gap-2 px-1 text-xs tracking-[0.32px] text-[var(--lab-sidebar-text)]" title={online ? t("shell.apiConnected") : t("shell.apiDown")}>
                    <StatusDot online={online} />
                    {online ? t("shell.apiConnected") : t("shell.apiDown")}
                  </div>
                ) : <div />}
                <Button type="button" variant="ghost" className="h-10 justify-start text-[var(--lab-sidebar-text)]" aria-label={t("account.logout")} title={t("account.logout")} onClick={handleLogout}>
                  <UserCircle size={18} aria-hidden="true" />
                  {t("account.logout")}
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
