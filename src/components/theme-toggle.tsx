"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="size-8 rounded-lg bg-muted border border-border animate-pulse shrink-0" />;
  }

  const isLight = theme === "light";

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="group relative size-8 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300 cursor-pointer shrink-0 overflow-hidden"
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      <span className="absolute inset-0 rounded-lg bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300" />
      <Sun
        className="size-4 absolute transition-all duration-500"
        style={{
          opacity: isLight ? 1 : 0,
          transform: `rotate(${isLight ? 0 : 180}deg) scale(${isLight ? 1 : 0})`,
        }}
        strokeWidth={1.5}
      />
      <Moon
        className="size-4 absolute transition-all duration-500"
        style={{
          opacity: isLight ? 0 : 1,
          transform: `rotate(${isLight ? 180 : 0}deg) scale(${isLight ? 0 : 1})`,
        }}
        strokeWidth={1.5}
      />
    </button>
  );
}
