import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // ClickUp spec: 4px radius (small badges), 12px/16px padding
  "inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#6647F0] focus:ring-offset-2",
  {
    variants: {
      variant: {
        // ClickUp Action Purple
        default: "bg-[#6647F0] text-white",
        secondary: "bg-[#F0F0F0] text-[#292D34]",
        // ClickUp destructive = magenta/critical
        destructive: "bg-[#FFE8F7] text-[#FF02F0] border border-[#FF02F0]",
        // ClickUp success = green
        success: "bg-[#D4EDDA] text-[#10B981] border border-[#10B981]",
        // ClickUp warning = orange
        warning: "bg-[#FFE5D4] text-[#ED5F00] border border-[#ED5F00]",
        // ClickUp in-progress = blue
        info: "bg-[#D9E7FF] text-[#0091FF] border border-[#0091FF]",
        outline: "text-[#292D34] border border-[#D9D9D9]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
