"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleContextType {
  open: boolean
  toggle: () => void
}

const CollapsibleContext = React.createContext<CollapsibleContextType | undefined>(undefined)

export const Collapsible = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; asChild?: boolean }
>(({ className, defaultOpen = false, open: openProp, onOpenChange, children, asChild, ...props }, ref) => {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openState

  const toggle = React.useCallback(() => {
    const next = !open
    if (!isControlled) setOpenState(next)
    onOpenChange?.(next)
  }, [open, isControlled, onOpenChange])

  if (asChild) {
    return (
      <CollapsibleContext.Provider value={{ open, toggle }}>
        {React.cloneElement(children as React.ReactElement<any>, {
          ref,
          "data-state": open ? "open" : "closed",
          className: cn("group/collapsible", (children as React.ReactElement<any>).props.className, className),
          ...props
        } as any)}
      </CollapsibleContext.Provider>
    )
  }

  return (
    <CollapsibleContext.Provider value={{ open, toggle }}>
      <div
        ref={ref}
        data-state={open ? "open" : "closed"}
        className={cn("group/collapsible", className)}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
})
Collapsible.displayName = "Collapsible"

export const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, asChild, children, onClick, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext)
  if (!context) throw new Error("CollapsibleTrigger must be used within Collapsible")

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    context.toggle()
    onClick?.(e)
  }

  if (asChild) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      "data-state": context.open ? "open" : "closed",
    } as any)
  }

  return (
    <button
      ref={ref}
      type="button"
      data-state={context.open ? "open" : "closed"}
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

export const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext)
  if (!context) throw new Error("CollapsibleContent must be used within Collapsible")

  if (!context.open) return null

  return (
    <div
      ref={ref}
      data-state={context.open ? "open" : "closed"}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"
