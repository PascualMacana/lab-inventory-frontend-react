import { cn } from "../../lib/utils"

export function EstadoBadge({ activo, labels }: { activo: boolean; labels?: { on: string; off: string } }) {
  const { on, off } = labels ?? { on: "Activo", off: "Inactivo" }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.16px] ring-1",
        activo
          ? "bg-lab-sageBg text-cds-supportSuccess ring-cds-supportSuccess/40"
          : "bg-lab-critTint text-cds-supportError ring-cds-supportError/40",
      )}
    >
      {activo ? on : off}
    </span>
  )
}
