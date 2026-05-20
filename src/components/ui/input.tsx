import { type InputHTMLAttributes, forwardRef } from "react"
import { cn } from "../../lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full border-0 border-b-2 border-b-transparent bg-cds-field px-4 text-sm text-cds-textPrimary transition-colors placeholder:text-[var(--cds-text-placeholder)] focus:border-b-cds-focus focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = "Input"
