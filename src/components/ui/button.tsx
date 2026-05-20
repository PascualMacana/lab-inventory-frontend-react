import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap border px-4 text-sm font-normal tracking-[0.16px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cds-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-cds-buttonPrimary bg-cds-buttonPrimary text-white hover:border-cds-buttonPrimaryHover hover:bg-cds-buttonPrimaryHover active:border-cds-buttonPrimaryActive active:bg-cds-buttonPrimaryActive",
        secondary:
          "border-cds-borderStrong bg-cds-layer02 text-cds-textPrimary hover:bg-cds-borderSubtle",
        ghost:
          "border-transparent bg-transparent text-cds-linkPrimary hover:bg-cds-layer01 hover:text-cds-linkPrimaryHover",
        danger:
          "border-cds-supportError bg-cds-supportError text-white hover:bg-[#b81921]",
      },
      size: {
        default: "h-12 px-4",
        compact: "h-10 px-3",
        icon: "h-12 w-12 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
)

Button.displayName = "Button"
