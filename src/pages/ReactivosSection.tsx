import { Camera } from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { Button } from "../components/ui/button"
import { useAuth } from "../lib/auth"
import { puede } from "../lib/permissions"
import { cn } from "../lib/utils"

// Layout de la sección "Reactivos". El reactivo es el catálogo (identidad) y el
// lote su capa física, por eso viven juntos. "Ingresar frasco" (el wizard de
// foto) es la acción principal de la sección, no algo escondido en Lotes.
const tabs = [
  { to: "/reactivos", labelKey: "section.catalogo", action: "ver_pagina_reactivos", end: true },
  { to: "/reactivos/lotes", labelKey: "section.lotes", action: "ver_pagina_lotes", end: false },
] as const

export function ReactivosSection() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const visibles = tabs.filter((tab) => puede(usuario, tab.action))

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 border-b border-cds-borderSubtle pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-px" role="tablist" aria-label={t("section.vistas")}>
          {visibles.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              role="tab"
              className={({ isActive }) =>
                cn(
                  "flex h-12 items-center px-4 text-sm tracking-[0.16px] text-cds-textSecondary transition-colors hover:text-cds-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
                  isActive && "text-cds-textPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
                )
              }
            >
              {t(tab.labelKey)}
            </NavLink>
          ))}
        </div>

        {puede(usuario, "crear_lote") ? (
          <Button type="button" variant="primary" size="compact" onClick={() => navigate("/reactivos/ingresar")}>
            <Camera size={18} aria-hidden="true" />
            {t("section.ingresarFrasco")}
          </Button>
        ) : null}
      </div>

      <Outlet />
    </section>
  )
}
