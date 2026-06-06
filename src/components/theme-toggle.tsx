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
    return <div className="size-8 rounded-lg bg-white/[0.04] border border-border-default shrink-0" />;
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="size-8 rounded-lg bg-white/[0.04] border border-border-default dark:bg-white/[0.04] flex items-center justify-center text-foreground hover:bg-white/[0.08] transition-all cursor-pointer shrink-0"
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {theme === "light" ? (
        <Moon className="size-4 text-zinc-800" strokeWidth={1.8} />
      ) : (
        <Sun className="size-4 text-zinc-100" strokeWidth={1.8} />
      )}
    </button>
  );
}
