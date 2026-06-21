import { useMemo, useState } from "react"

import type { CommandCenterLead } from "../../lib/api"
import { useCommandCenter } from "../CommandCenterContext"
import { CRM_COLS, ESTADOS, PRIORIDADES } from "../data"
import { ViewHeader } from "../components"

// Exporta el CRM visible a CSV (mismo formato que el export standalone).
function exportarCSV(rows: CommandCenterLead[]) {
  const cols: (keyof CommandCenterLead)[] = ["nombre", "empresa", "cargo", "pais", "email", "wa", "li", "pri", "est", "fecha", "paso", "notas"]
  const head = ["Nombre", "Empresa", "Cargo", "Pais", "Email", "WhatsApp", "LinkedIn", "Prioridad", "Estado", "Fecha", "Proximo paso", "Notas"]
  const csv =
    head.join(",") +
    "\n" +
    rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  a.download = "CRM_LabInventory.csv"
  a.click()
}

const SELECT_CLS =
  "border border-cds-borderSubtle bg-cds-background px-1.5 py-1 text-xs text-cds-textPrimary outline-none focus:border-cds-buttonPrimary"

export function CrmView() {
  const { leads, crearLead, actualizarLead, eliminarLead, resetLeads } = useCommandCenter()
  const [filtPri, setFiltPri] = useState("")
  const [filtEst, setFiltEst] = useState("")

  const visibles = useMemo(
    () => leads.filter((l) => (!filtPri || l.pri === filtPri) && (!filtEst || l.est === filtEst)),
    [leads, filtPri, filtEst],
  )

  return (
    <section>
      <ViewHeader eyebrow="Pipeline comercial" title="CRM">
        Sembrado con tus 11 respondentes reales de la encuesta. Editá cualquier celda; los cambios se guardan solos y los ve
        tu socio.
      </ViewHeader>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void crearLead()}
          className="bg-cds-buttonPrimary px-3 py-1.5 text-xs text-white transition-colors hover:bg-cds-buttonPrimaryHover"
        >
          + Nuevo lead
        </button>
        <button
          type="button"
          onClick={() => exportarCSV(visibles)}
          className="border border-cds-borderSubtle px-3 py-1.5 text-xs text-cds-textPrimary transition-colors hover:bg-cds-layer01"
        >
          Exportar CSV
        </button>
        <select className={SELECT_CLS} value={filtPri} onChange={(e) => setFiltPri(e.target.value)}>
          <option value="">Prioridad: todas</option>
          {PRIORIDADES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className={SELECT_CLS} value={filtEst} onChange={(e) => setFiltEst(e.target.value)}>
          <option value="">Estado: todos</option>
          {ESTADOS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void resetLeads()}
          className="border border-cds-borderSubtle px-3 py-1.5 text-xs text-cds-textPrimary transition-colors hover:bg-cds-layer01"
        >
          Restaurar datos originales
        </button>
        <span className="text-xs italic text-cds-textPlaceholder">{leads.length} leads</span>
      </div>

      <div className="overflow-x-auto border border-cds-borderSubtle bg-cds-background">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {CRM_COLS.map((c) => (
                <th
                  key={c.k}
                  className="whitespace-nowrap bg-[var(--lab-sidebar-bg)] px-2.5 py-2.5 text-left text-[12px] font-semibold text-white"
                >
                  {c.label}
                </th>
              ))}
              <th className="bg-[var(--lab-sidebar-bg)] px-2.5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((lead) => (
              <tr key={lead.id} className="hover:bg-cds-layer01">
                {CRM_COLS.map((c) => {
                  if (c.k === "pri") {
                    return (
                      <td key={c.k} className="border-b border-cds-borderSubtle px-2.5 py-2 align-top">
                        <select
                          className={SELECT_CLS}
                          value={lead.pri}
                          onChange={(e) => actualizarLead(lead.id, "pri", e.target.value)}
                        >
                          {PRIORIDADES.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                    )
                  }
                  if (c.k === "est") {
                    return (
                      <td key={c.k} className="border-b border-cds-borderSubtle px-2.5 py-2 align-top">
                        <select
                          className={SELECT_CLS}
                          value={lead.est}
                          onChange={(e) => actualizarLead(lead.id, "est", e.target.value)}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e}>{e}</option>
                          ))}
                        </select>
                      </td>
                    )
                  }
                  return (
                    <td
                      key={c.k}
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label={c.label}
                      className="border-b border-cds-borderSubtle px-2.5 py-2 align-top outline-none focus:bg-cds-buttonPrimary/10 focus:outline focus:outline-2 focus:outline-cds-buttonPrimary"
                      onBlur={(e) => {
                        const v = e.currentTarget.textContent?.trim() ?? ""
                        if (v !== (lead[c.k as keyof typeof lead] ?? "")) {
                          actualizarLead(lead.id, c.k, v)
                        }
                      }}
                    >
                      {String(lead[c.k as keyof typeof lead] ?? "")}
                    </td>
                  )
                })}
                <td className="border-b border-cds-borderSubtle px-2.5 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => void eliminarLead(lead.id)}
                    className="border border-cds-supportError px-2 py-1 text-xs text-cds-supportError transition-colors hover:bg-cds-supportError/10"
                    aria-label={`Eliminar ${lead.nombre}`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
