import { cn } from "../../lib/utils"
import type { CommandCenterFin } from "../../lib/api"
import { useCommandCenter } from "../CommandCenterContext"
import { FIN_PLAN, FIN_SEG } from "../data"
import { ViewHeader, Nota } from "../components"

type PlanKey = "starter" | "pro" | "ent"
type SegKey = keyof CommandCenterFin["clients"]
type FinNumKey =
  | "varCost"
  | "feePct"
  | "fixed"
  | "hoursToClose"
  | "hourValue"
  | "lifetime"
  | "pilots"
  | "pilotPrice"
  | "cash"

function money(n: number) {
  return "US$" + Math.round(n).toLocaleString("en-US")
}

// Recalcula P&L, unit economics y break-even desde los supuestos (port de computeFin).
function computeFin(f: CommandCenterFin) {
  const rev: Record<SegKey, number> = { acad: 0, biotech: 0, ind: 0 }
  const nseg: Record<SegKey, number> = { acad: 0, biotech: 0, ind: 0 }
  const colRev: Record<PlanKey, number> = { starter: 0, pro: 0, ent: 0 }
  let revTotal = 0
  let nTotal = 0
  FIN_SEG.forEach((s) => {
    FIN_PLAN.forEach((p) => {
      const c = f.clients[s.k][p.k] || 0
      const r = c * f.price[p.k]
      rev[s.k] += r
      nseg[s.k] += c
      colRev[p.k] += r
      revTotal += r
      nTotal += c
    })
  })
  const variable = nTotal * f.varCost + (revTotal * f.feePct) / 100
  const contrib = revTotal - variable
  const net = contrib - f.fixed
  const segCM = FIN_SEG.map((s) => {
    const rv = rev[s.k]
    const vv = nseg[s.k] * f.varCost + (rv * f.feePct) / 100
    const cm = rv - vv
    return { label: s.label, rv, cm, mp: rv ? Math.round((cm / rv) * 100) : 0 }
  })
  const ARPA = nTotal ? revTotal / nTotal : 0
  const varPer = nTotal ? variable / nTotal : 0
  const cPer = ARPA - varPer
  const gm = ARPA ? cPer / ARPA : 0
  const CAC = f.hoursToClose * f.hourValue
  const LTV = cPer * f.lifetime
  const payback = cPer > 0 ? CAC / cPer : 0
  const ltvcac = CAC > 0 ? LTV / CAC : 0
  const BE = cPer > 0 ? Math.ceil(f.fixed / cPer) : 0
  const oneTime = f.pilots * f.pilotPrice
  const cashMonth = net + oneTime
  const runway = net < 0 && f.cash > 0 ? f.cash / -net : null
  return { rev, nseg, revTotal, nTotal, colRev, variable, contrib, net, segCM, ARPA, varPer, cPer, gm, CAC, LTV, payback, ltvcac, BE, oneTime, cashMonth, runway }
}

const Eyebrow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("mb-2.5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.5px] text-cds-textSecondary", className)}>
    <span>{children}</span>
    <span className="h-px max-w-[120px] flex-1 bg-cds-borderSubtle" aria-hidden="true" />
  </div>
)

function MiniCards({ items }: { items: { k: string; v: string; tono?: "pos" | "neg" }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-cds-borderSubtle bg-cds-borderSubtle md:grid-cols-4">
      {items.map((u) => (
        <div key={u.k} className="bg-cds-background p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.4px] text-cds-textSecondary">{u.k}</div>
          <div
            className={cn(
              "mt-1 text-[15px] font-semibold",
              u.tono === "pos" ? "text-cds-supportSuccess" : u.tono === "neg" ? "text-cds-supportError" : "text-cds-buttonPrimary",
            )}
          >
            {u.v}
          </div>
        </div>
      ))}
    </div>
  )
}

export function FinanzasView() {
  const { fin, setFin } = useCommandCenter()
  const r = computeFin(fin)

  const setNum = (key: FinNumKey, v: number) => setFin({ ...fin, [key]: v })
  const setPrice = (plan: PlanKey, v: number) => setFin({ ...fin, price: { ...fin.price, [plan]: v } })
  const setClient = (seg: SegKey, plan: PlanKey, v: number) =>
    setFin({ ...fin, clients: { ...fin.clients, [seg]: { ...fin.clients[seg], [plan]: v } } })

  const inpBase =
    "border border-cds-borderSubtle bg-cds-background p-1.5 font-mono text-cds-textPrimary outline-none focus:border-cds-buttonPrimary"
  const inpSup = cn(inpBase, "w-[84px] text-right")
  const inpMat = cn(inpBase, "w-[56px] text-center")

  const grupos: { titulo: string; rows: { label: string; key: FinNumKey | PlanKey; price?: boolean }[] }[] = [
    { titulo: "Precios (US$/mes)", rows: [{ label: "Starter", key: "starter", price: true }, { label: "Pro", key: "pro", price: true }, { label: "Enterprise", key: "ent", price: true }] },
    { titulo: "Costos", rows: [{ label: "Costo variable / cliente (US$/mes)", key: "varCost" }, { label: "Comisión de pago (%)", key: "feePct" }, { label: "Costos fijos (US$/mes)", key: "fixed" }] },
    { titulo: "Unit economics", rows: [{ label: "Horas para cerrar 1 cliente", key: "hoursToClose" }, { label: "Valor de tu hora (US$)", key: "hourValue" }, { label: "Vida del cliente (meses)", key: "lifetime" }] },
    { titulo: "Caja", rows: [{ label: "Pilotos one-time (este mes)", key: "pilots" }, { label: "Precio del piloto (US$)", key: "pilotPrice" }, { label: "Caja actual (US$)", key: "cash" }] },
  ]

  return (
    <section>
      <ViewHeader eyebrow="Finanzas del proyecto · P&L · Unit economics" title="Finanzas">
        Modelo vivo basado en el marco de Augusto: P&L por unidad de negocio (segmento × plan), unit economics y punto de
        equilibrio. Cargá los supuestos y todo se recalcula y se guarda solo.
      </ViewHeader>

      {/* Supuestos */}
      <Eyebrow>Supuestos</Eyebrow>
      <div className="mb-6 grid gap-3.5 md:grid-cols-2">
        {grupos.map((g) => (
          <div key={g.titulo} className="border border-cds-borderSubtle bg-cds-background px-4 py-3.5">
            <h5 className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.4px] text-cds-textSecondary">{g.titulo}</h5>
            {g.rows.map((row) => (
              <div key={row.key} className="mb-1.5 flex items-center justify-between gap-2.5 text-[13px] text-cds-textSecondary">
                <span>{row.label}</span>
                <input
                  type="number"
                  className={inpSup}
                  value={row.price ? fin.price[row.key as PlanKey] : fin[row.key as FinNumKey]}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0
                    if (row.price) setPrice(row.key as PlanKey, v)
                    else setNum(row.key as FinNumKey, v)
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Matriz clientes */}
      <Eyebrow>Clientes pagos por segmento × plan</Eyebrow>
      <div className="mb-6 overflow-x-auto border border-cds-borderSubtle bg-cds-background">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="bg-[var(--lab-sidebar-bg)] px-2.5 py-2.5 text-left text-white">Segmento \ Plan</th>
              {FIN_PLAN.map((p) => (
                <th key={p.k} className="bg-[var(--lab-sidebar-bg)] px-2.5 py-2.5 text-center text-white">
                  {p.label}
                  <br />
                  <span className="font-normal text-cds-textPlaceholder">US${fin.price[p.k]}</span>
                </th>
              ))}
              <th className="bg-[var(--lab-sidebar-bg)] px-2.5 py-2.5 text-center text-white">Total</th>
            </tr>
          </thead>
          <tbody>
            {FIN_SEG.map((s) => (
              <tr key={s.k}>
                <td className="border-b border-cds-borderSubtle px-2.5 py-2 font-semibold">{s.label}</td>
                {FIN_PLAN.map((p) => (
                  <td key={p.k} className="border-b border-cds-borderSubtle px-2.5 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      className={inpMat}
                      value={fin.clients[s.k][p.k]}
                      onChange={(e) => setClient(s.k, p.k, parseFloat(e.target.value) || 0)}
                    />
                  </td>
                ))}
                <td className="border-b border-cds-borderSubtle px-2.5 py-2 text-center font-mono">{money(r.rev[s.k])}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="px-2.5 py-2">Total</td>
              {FIN_PLAN.map((p) => (
                <td key={p.k} className="px-2.5 py-2 text-center font-mono">{money(r.colRev[p.k])}</td>
              ))}
              <td className="px-2.5 py-2 text-center font-mono">{money(r.revTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* P&L */}
      <Eyebrow>P&L (económico)</Eyebrow>
      <div className="mb-2 border border-cds-borderSubtle bg-cds-background px-4 py-3">
        <PlLine l="Ingresos (MRR)" v={money(r.revTotal)} />
        <PlLine l="− Costo variable (IA/OCR/infra + pago)" v={money(r.variable)} />
        <PlLine
          l={`= Margen de contribución${r.revTotal ? ` (${Math.round((r.contrib / r.revTotal) * 100)}%)` : ""}`}
          v={money(r.contrib)}
        />
        <PlLine l="− Costos fijos" v={money(fin.fixed)} />
        <div className="mt-1 flex justify-between border-t-2 border-cds-borderSubtle pt-2.5 text-sm font-semibold">
          <span>= Resultado mensual</span>
          <span className={r.net >= 0 ? "text-cds-supportSuccess" : "text-cds-supportError"}>{money(r.net)}</span>
        </div>
      </div>
      <div className="mb-6 border border-cds-borderSubtle bg-cds-background px-4 py-3">
        <div className="border-none py-1.5 text-xs text-cds-textSecondary">Margen de contribución por segmento</div>
        {r.segCM.map((s) => (
          <div key={s.label} className="flex justify-between border-b border-cds-layer01 py-1.5 text-sm last:border-b-0">
            <span>
              {s.label} · {money(s.rv)} ingresos
            </span>
            <span className={s.cm >= 0 ? "text-cds-supportSuccess" : "text-cds-supportError"}>
              {money(s.cm)}
              {s.rv ? ` (${s.mp}%)` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Unit economics */}
      <Eyebrow>Unit economics — cuánto cuesta y cuánto deja un laboratorio</Eyebrow>
      <div className="mb-6">
        <MiniCards
          items={[
            { k: "ARPA (US$/mes)", v: r.nTotal ? money(r.ARPA) : "—" },
            { k: "Costo var / cliente", v: r.nTotal ? money(r.varPer) : "—" },
            { k: "Margen contrib / cliente", v: r.nTotal ? money(r.cPer) : "—", tono: r.cPer >= 0 ? "pos" : "neg" },
            { k: "Margen bruto", v: r.nTotal ? Math.round(r.gm * 100) + "%" : "—" },
            { k: "LTV", v: r.nTotal ? money(r.LTV) : "—" },
            { k: "CAC (tu tiempo)", v: money(r.CAC) },
            { k: "LTV / CAC", v: r.ltvcac ? r.ltvcac.toFixed(1) + "x" : "—", tono: r.ltvcac >= 3 ? "pos" : r.ltvcac ? "neg" : undefined },
            { k: "Payback", v: r.payback ? r.payback.toFixed(1) + " meses" : "—" },
          ]}
        />
      </div>

      {/* Break-even & caja */}
      <Eyebrow>Punto de equilibrio &amp; caja</Eyebrow>
      <div className="grid grid-cols-2 gap-px border border-cds-borderSubtle bg-cds-borderSubtle md:grid-cols-3">
        {[
          { k: "Punto de equilibrio", v: r.cPer > 0 ? r.BE + " clientes" : "—", tono: r.cPer > 0 && r.nTotal >= r.BE ? ("pos" as const) : undefined },
          { k: "Hoy vas", v: r.nTotal + " clientes", tono: r.cPer > 0 && r.nTotal >= r.BE ? ("pos" as const) : undefined },
          { k: "Neto recurrente / mes", v: money(r.net), tono: r.net >= 0 ? ("pos" as const) : ("neg" as const) },
          { k: "+ Pilotos one-time", v: money(r.oneTime) },
          { k: "= Caja del mes", v: money(r.cashMonth), tono: r.cashMonth >= 0 ? ("pos" as const) : ("neg" as const) },
          { k: "Runway", v: r.runway !== null ? r.runway.toFixed(1) + " meses" : r.net >= 0 ? "sin burn" : "—", tono: r.runway !== null && r.runway < 6 ? ("neg" as const) : undefined },
        ].map((u) => (
          <div key={u.k} className="bg-cds-background p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.4px] text-cds-textSecondary">{u.k}</div>
            <div
              className={cn(
                "mt-1 text-[15px] font-semibold",
                u.tono === "pos" ? "text-cds-supportSuccess" : u.tono === "neg" ? "text-cds-supportError" : "text-cds-buttonPrimary",
              )}
            >
              {u.v}
            </div>
          </div>
        ))}
      </div>

      <Nota className="mt-3.5">
        Escenarios a 12 meses y detalle de costos fijos: ver <b>07 - Financial Model.md</b>.
      </Nota>
    </section>
  )
}

function PlLine({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-cds-layer01 py-1.5 text-sm">
      <span>{l}</span>
      <span>{v}</span>
    </div>
  )
}
