import { DOCS } from "../data"
import { ViewHeader } from "../components"

export function DocsView() {
  return (
    <section>
      <ViewHeader eyebrow="Carpeta · LabInventory OS" title="Documentos fundacionales">
        Los 10 documentos del sistema operativo de la empresa, más el documento maestro. Están como archivos en tu carpeta,
        junto a este dashboard.
      </ViewHeader>

      <div className="grid grid-cols-1 gap-px border border-cds-borderSubtle bg-cds-borderSubtle md:grid-cols-2">
        {DOCS.map(([n, titulo, desc]) => (
          <div key={n} className="bg-cds-background px-4 py-3.5">
            <div className="font-mono text-[11px] text-cds-buttonPrimary">{n}</div>
            <h4 className="my-1 text-sm font-semibold">{titulo}</h4>
            <p className="text-xs text-cds-textSecondary">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
