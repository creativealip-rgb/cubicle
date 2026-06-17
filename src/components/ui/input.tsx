import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // ClickUp spec: 8px radius, #D9D9D9 border, focus = purple + inset ring
        "!border !border-[#D9D9D9] flex h-9 w-full rounded-lg bg-white px-3 py-1 text-base text-[#292D34] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#AAAAAA] focus-visible:!border-[#6647F0] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6647F0] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F8F9FA] md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
