import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // ClickUp spec: 12px radius, weight 400 for primary CTAs, primary purple
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6647F0] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // ClickUp spec: Action Purple bg, white text, soft shadow, hover darkens
        default: "bg-[#6647F0] text-white shadow-[0_4px_4px_rgba(13,21,48,0.04)] hover:bg-[#5333DD] hover:shadow-[0_8px_8px_rgba(13,21,48,0.08)] active:bg-[#4A2AD0]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // ClickUp spec: white bg, navy text, #D9D9D9 border
        outline: "border border-[#D9D9D9] bg-white text-[#292D34] shadow-[0_4px_4px_rgba(13,21,48,0.04)] hover:bg-[#F8F9FA] hover:border-[#C0C0C0] active:bg-[#F0F0F0]",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-[#F0F0F0] hover:text-[#292D34]",
        link: "text-[#6647F0] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
