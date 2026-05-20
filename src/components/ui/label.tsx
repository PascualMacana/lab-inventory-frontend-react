import { type LabelHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-normal leading-4 tracking-[0.32px] text-cds-textSecondary", className)}
      {...props}
    />
  )
}
