import { cn } from "../../lib/utils"

export function StatusDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "lab-status-dot inline-block h-2 w-2 rounded-full",
        online ? "bg-cds-supportSuccess" : "bg-cds-supportError [animation:none]",
        className,
      )}
    />
  )
}
