import type { ReactNode } from "react"
import { CheckCircle2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "../lib/utils"

// Banner de éxito unificado de la app: tinte sage + barra izquierda, ícono
// check-circle y botón cerrar (×). Pasá `className` para el margen de cada
// página (por defecto sin margen). Reemplaza al viejo cuadro plano
// border-l-4 border-cds-supportSuccess que estaba duplicado en cada página.
export function SuccessBanner({
  message,
  onClose,
  className,
}: {
  message: ReactNode
  onClose?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        "flex items-start gap-3 border-l-[3px] border-lab-sage bg-lab-sageBg px-4 py-3.5 text-sm text-cds-textPrimary",
        className,
      )}
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-lab-sage" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.cerrar")}
          className="shrink-0 text-cds-textSecondary transition-colors hover:text-cds-textPrimary"
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
