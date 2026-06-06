"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

interface SidebarContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }
>(({ className, defaultOpen = true, children, ...props }, ref) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggleSidebar = React.useCallback(() => setOpen((prev) => !prev), []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      <div
        ref={ref}
        className={cn("flex min-h-screen w-full bg-background text-foreground transition-colors duration-200", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
});
SidebarProvider.displayName = "SidebarProvider";

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open } = useSidebar();

  return (
    <aside
      ref={ref}
      className={cn(
        "flex flex-col shrink-0 bg-surface border-r border-border-default transition-all duration-300 ease-in-out z-30 h-screen sticky top-0",
        open ? "w-64" : "w-0 overflow-hidden border-r-0",
        className
      )}
      {...props}
    >
      <div className="w-64 flex flex-col h-full">{children}</div>
    </aside>
  );
});
Sidebar.displayName = "Sidebar";

export const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 p-4 border-b border-border-default", className)} {...props} />
);

export const SidebarContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:thin]", className)} {...props} />
);

export const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-3 border-t border-border-default", className)} {...props} />
);

export const SidebarGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);

export const SidebarGroupLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary/40 select-none", className)} {...props} />
);

export const SidebarGroupContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-0.5", className)} {...props} />
);

export const SidebarMenu = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-0.5", className)} {...props} />
);

export const SidebarMenuItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("relative", className)} {...props} />
);

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  asChild?: boolean;
  size?: "sm" | "md" | "lg";
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement | HTMLDivElement,
  React.ComponentProps<"button"> & {
    isActive?: boolean;
    asChild?: boolean;
    size?: "sm" | "md" | "lg";
  }
>(({ className, isActive, asChild, size = "md", ...props }, ref) => {
  const Component = asChild ? "div" : "button";
  return (
    <Component
      ref={ref as any}
      className={cn(
        "flex items-center gap-3 w-full px-3 rounded-xl text-[13px] font-medium transition-all group cursor-pointer text-left",
        size === "sm" && "py-1.5 h-8",
        size === "md" && "py-2.5 h-10",
        size === "lg" && "py-3 h-12",
        isActive
          ? "bg-white/[0.04] dark:bg-white/5 text-foreground border border-border-default"
          : "text-text-secondary hover:text-foreground hover:bg-white/[0.03] dark:hover:bg-white/[0.05] border border-transparent",
        className
      )}
      {...(props as any)}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      ref={ref}
      onClick={(e) => {
        toggleSidebar();
        onClick?.(e);
      }}
      className={cn(
        "size-8 rounded-lg bg-white/[0.04] dark:bg-white/[0.04] border border-border-default flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-white/[0.07] dark:hover:bg-white/[0.07] transition-all cursor-pointer",
        className
      )}
      {...props}
    >
      <Menu className="size-3.5" />
    </button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

export const SidebarRail = () => null;

export const SidebarInset = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", className)} {...props} />
);

export const SidebarMenuSub = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-0.5 pl-6 border-l border-border-default ml-5 mt-0.5", className)} {...props} />
);

export const SidebarMenuSubItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("relative", className)} {...props} />
);

export const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { isActive?: boolean; asChild?: boolean }
>(({ className, isActive, asChild, ...props }, ref) => {
  const Component = asChild ? "div" : "a";
  return (
    <Component
      ref={ref as any}
      className={cn(
        "flex h-8 items-center gap-3 rounded-lg px-3 text-xs font-medium transition-colors text-text-secondary hover:text-foreground hover:bg-white/[0.03] dark:hover:bg-white/[0.03]",
        isActive && "text-foreground font-semibold bg-white/[0.04] dark:bg-white/5 border border-border-default",
        className
      )}
      {...(props as any)}
    />
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";
