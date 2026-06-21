import { cn } from "../../lib/utils"
import { PRICING_PLANS } from "../data"
import { ViewHeader } from "../components"

export function PricingView() {
  return (
    <section>
      <ViewHeader eyebrow="Hipótesis de precio" title="Pricing">
        Precios a validar, no verdades. Regla: cobramos una fracción del dolor que evitamos. El piloto siempre lleva un
        número.
      </ViewHeader>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.titulo}
            className={cn(
              "flex flex-col bg-cds-background p-[18px]",
              plan.feat ? "border-2 border-cds-buttonPrimary" : "border border-cds-borderSubtle",
            )}
          >
            {plan.tag ? (
              <span className="mb-1.5 self-start bg-cds-buttonPrimary px-1.5 py-0.5 font-mono text-[10px] text-white">
                {plan.tag}
              </span>
            ) : null}
            <h3 className="mb-1 text-base font-semibold">{plan.titulo}</h3>
            <div className="my-2 font-mono text-[22px]">
              {plan.precio}
              <small className="text-xs text-cds-textPlaceholder">{plan.sub}</small>
            </div>
            <ul className="mt-2.5 text-[13px]">
              {plan.items.map((it) => (
                <li key={it} className="border-b border-cds-layer01 py-1.5 text-cds-textSecondary last:border-b-0">
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
