import { MoreHorizontal } from "lucide-react"
import { type ReactNode } from "react"

import { cn } from "../lib/utils"
import { Button, type ButtonProps } from "./ui/button"

export type ModuleView<T extends string> = {
  value: T
  label: string
}

export type ModuleAction = {
  label: string
  onClick: () => void
  icon?: ReactNode
  variant?: ButtonProps["variant"]
}

export function ModuleNav<T extends string>({
  views,
  value,
  onChange,
  actions = [],
  more = [],
}: {
  views?: ModuleView<T>[]
  value?: T
  onChange?: (value: T) => void
  actions?: ModuleAction[]
  more?: ModuleAction[]
}) {
  const hasViews = Boolean(views?.length)

  if (!hasViews && !actions.length && !more.length) {
    return null
  }

  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-cds-borderSubtle pb-3 md:flex-row md:items-end md:justify-between">
      <div>
        {hasViews && value && onChange ? (
          <>
            <div className="hidden gap-px md:flex" role="tablist" aria-label="Vistas del módulo">
              {views!.map((view) => (
                <button
                  key={view.value}
                  type="button"
                  role="tab"
                  aria-selected={value === view.value}
                  onClick={() => onChange(view.value)}
                  className={cn(
                    "h-12 px-4 text-sm tracking-[0.16px] text-cds-textSecondary transition-colors hover:text-cds-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus",
                    value === view.value && "text-cds-textPrimary shadow-[inset_0_-2px_0_var(--cds-focus)]",
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <label className="block md:hidden">
              <span className="mb-2 block text-xs tracking-[0.32px] text-cds-textSecondary">Vista</span>
              <select
                className="h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary focus:border-b-cds-focus focus:outline-none"
                value={value}
                onChange={(event) => onChange(event.target.value as T)}
              >
                {views!.map((view) => (
                  <option key={view.value} value={view.value}>
                    {view.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <Button key={action.label} type="button" variant={action.variant ?? "primary"} size="compact" onClick={action.onClick}>
            {action.icon}
            {action.label}
          </Button>
        ))}

        {more.length ? (
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 border border-cds-borderStrong bg-cds-layer02 px-3 text-sm tracking-[0.16px] text-cds-textPrimary transition-colors hover:bg-cds-borderSubtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus">
              <MoreHorizontal size={18} aria-hidden="true" />
              Más
            </summary>
            <div className="absolute right-0 z-20 mt-1 min-w-48 border border-cds-borderSubtle bg-cds-layer01 py-1 shadow-lg">
              {more.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm tracking-[0.16px] text-cds-textPrimary hover:bg-cds-layer02 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus"
                  onClick={action.onClick}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  )
}
