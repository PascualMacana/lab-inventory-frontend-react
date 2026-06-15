import { ArrowLeft, Dna, LogOut, Moon, Sun } from "lucide-react"
import { Link, Outlet, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useAuth } from "../lib/auth"
import { setLang, type Lang } from "../lib/i18n"
import { useTheme } from "../lib/theme"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"

// Shell propio del Cepario: marco aparte del inventario (sin su sidebar). Es
// header-based a propósito —el almacén es sidebar-based— para que se sienta otra
// app. La única vuelta al inventario es el link "Inventario"; el resto del menú
// del almacén no aparece acá.
const langs: Lang[] = ["es", "en"]

export function CeparioShell() {
  const { usuario, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isDark = theme === "dark"
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "es").slice(0, 2)
  const themeLabel = t(isDark ? "account.lightMode" : "account.darkMode")
  const ThemeIcon = isDark ? Sun : Moon

  function handleLogout() {
    void logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-cds-background text-cds-textPrimary">
      <header className="sticky top-0 z-10 border-b border-t-2 border-cds-borderSubtle border-t-lab-cepario bg-cds-background">
        <div className="mx-auto flex max-w-[1584px] flex-wrap items-center gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <Dna className="text-lab-cepario" size={22} aria-hidden="true" />
            <div>
              <div className="text-base font-semibold leading-none tracking-[0.16px]">{t("cepario.title")}</div>
              <div className="mt-1 text-xs leading-none tracking-[0.32px] text-cds-textSecondary">
                {t("cepario.shellSubtitulo")}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/"
              className="inline-flex h-10 items-center gap-2 px-3 text-sm tracking-[0.16px] text-cds-linkPrimary transition-colors hover:bg-cds-layer01"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span className="hidden sm:inline">{t("cepario.shellVolver")}</span>
            </Link>

            <div className="flex items-center border-l border-cds-borderSubtle pl-1.5">
              {langs.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={cn(
                    "px-2 py-1 text-xs uppercase tracking-[0.16px] transition-colors",
                    lang === code ? "text-cds-textPrimary" : "text-cds-textSecondary hover:text-cds-textPrimary",
                  )}
                >
                  {code}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              aria-label={themeLabel}
              title={themeLabel}
              onClick={toggleTheme}
            >
              <ThemeIcon size={18} aria-hidden="true" />
            </Button>

            <span className="ml-1 hidden border-l border-cds-borderSubtle pl-3 text-sm tracking-[0.16px] text-cds-textSecondary sm:inline">
              {usuario?.nombre}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              aria-label={t("account.logout")}
              title={t("account.logout")}
              onClick={handleLogout}
            >
              <LogOut size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="lab-fade-in mx-auto max-w-[1584px] px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
