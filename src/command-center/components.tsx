import type { ReactNode } from "react"

// Encabezado de vista reutilizable (eyebrow mono + título + subtítulo), espeja
// el patrón .eyebrow / h2.title / .sub del export standalone.

export function ViewHeader({ eyebrow, title, children }: { eyebrow: ReactNode; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      <div className="mb-1.5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.5px] text-cds-textSecondary">
        <span>{eyebrow}</span>
        <span className="h-px max-w-[120px] flex-1 bg-cds-borderSubtle" aria-hidden="true" />
      </div>
      <h2 className="text-[26px] font-semibold leading-tight">{title}</h2>
      {children ? <p className="mt-1 max-w-[760px] text-sm text-cds-textSecondary">{children}</p> : null}
    </header>
  )
}

export function Nota({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs italic text-cds-textPlaceholder ${className ?? ""}`}>{children}</p>
}
