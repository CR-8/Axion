import * as React from "react"
import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label: string
    color: string
  }
>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactNode
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  ChartContainerProps
>(({ className, config, children, ...props }, ref) => {
  const style = React.useMemo(() => {
    const vars: Record<string, string> = {}
    Object.entries(config).forEach(([key, val]) => {
      vars[`--color-${key}`] = val.color
    })
    return vars as React.CSSProperties
  }, [config])

  return (
    <div
      ref={ref}
      style={style}
      className={cn("w-full h-full", className)}
      {...props}
    >
      {children}
    </div>
  )
})
ChartContainer.displayName = "ChartContainer"

export const ChartTooltip = ({ active, payload, label, content }: any) => {
  if (!active || !payload) return null
  return content ? (
    React.cloneElement(content, { active, payload, label })
  ) : (
    <div className="bg-surface border border-border-default px-3 py-2 rounded-xl text-xs shadow-2xl text-foreground">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((item: any, index: number) => (
        <p key={index} className="text-foreground font-medium">
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  )
}

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { active?: boolean; payload?: any; label?: any }
>(({ className, active, payload, label, ...props }, ref) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border-default bg-surface px-3 py-2 text-xs shadow-2xl space-y-1 text-foreground",
        className
      )}
      {...props}
    >
      <div className="text-text-secondary font-medium">{label}</div>
      <div className="space-y-0.5">
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5 justify-between min-w-24">
            <span className="flex items-center gap-1">
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color || item.payload.fill || "var(--color-value)" }}
              />
              <span className="text-text-secondary">{item.name}</span>
            </span>
            <span className="font-mono font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"
