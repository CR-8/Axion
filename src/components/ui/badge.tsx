import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variant === "default" && "border-transparent bg-white text-black",
        variant === "secondary" && "border-transparent bg-white/5 text-white/70",
        variant === "destructive" && "border-transparent bg-red-500/10 border-red-500/20 text-red-400",
        variant === "outline" && "text-white/60 border-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
