import * as React from "react"
import { cn } from "@/lib/utils"

export const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative overflow-auto [scrollbar-width:thin]", className)}
      {...props}
    >
      {children}
    </div>
  )
})
ScrollArea.displayName = "ScrollArea"

export const ScrollBar = ({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) => null
