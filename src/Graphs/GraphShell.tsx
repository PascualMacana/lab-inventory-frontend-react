import type { ReactNode } from "react"

import type { ChartScope } from "./data"
import { reactivosAnalytics, scopeLabel } from "./data"

type GraphShellProps = {
  library: string
  scope: ChartScope
  onScopeChange: (scope: ChartScope) => void
  children: ReactNode
}

export function GraphShell({ library, scope, onScopeChange, children }: GraphShellProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 border border-cds-borderSubtle bg-cds-layer01 p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.32px] text-cds-textSecondary">{library}</div>
          <h2 className="mt-2 text-[24px] font-normal leading-[1.25]">{scopeLabel(scope)}</h2>
        </div>
        <label className="flex min-w-[260px] flex-col gap-2 text-sm tracking-[0.16px]">
          Alcance
          <select
            className="h-10 border-0 border-b border-cds-borderStrong bg-cds-field px-3 text-sm outline-none focus:ring-2 focus:ring-cds-focus"
            value={scope}
            onChange={(event) => onScopeChange(event.target.value)}
          >
            <option value="total">Inventario total</option>
            {reactivosAnalytics.map((reactivo) => (
              <option key={reactivo.id} value={reactivo.id}>
                {reactivo.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{children}</div>
    </section>
  )
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="min-h-[360px] border border-cds-borderSubtle bg-cds-layer01 p-4">
      <h3 className="mb-4 text-base font-semibold leading-[1.4]">{title}</h3>
      {children}
    </article>
  )
}

export function EmptyChart() {
  return <div className="flex h-[280px] items-center justify-center text-sm text-cds-textSecondary">Sin datos para mostrar.</div>
}
