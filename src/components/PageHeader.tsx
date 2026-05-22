import { type ReactNode } from "react"

export function PageHeader({
  title,
  description,
  count,
  plain = false,
}: {
  title: string
  description: string
  count?: ReactNode
  plain?: boolean
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-[44px] leading-[1.19] tracking-[-0.01em]">
          {plain ? title : <span className="lab-em">{title}</span>}
        </h1>
        <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
          {description}
        </p>
      </div>
      {count ? <div className="text-sm tracking-[0.16px] text-cds-textSecondary">{count}</div> : null}
    </div>
  )
}
