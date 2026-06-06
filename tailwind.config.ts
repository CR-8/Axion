import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base": "#0c0c0d",
        "bg-surface": "#111113",
        "bg-elevated": "#17171a",
        "bg-hover": "#1c1c20",
        "bg-active": "#202025",
        "text-primary": "rgba(255,255,255,0.92)",
        "text-secondary": "rgba(255,255,255,0.45)",
        "text-tertiary": "rgba(255,255,255,0.25)",
        "border-default": "rgba(255,255,255,0.06)",
        "border-strong": "rgba(255,255,255,0.1)",
        accent: "#10b981",
        "accent-dim": "rgba(16,185,129,0.12)",
        "accent-border": "rgba(16,185,129,0.25)",
        "accent-text": "#34d399",
        "amber-color": "#f59e0b",
        "amber-dim": "rgba(245,158,11,0.12)",
        "amber-border": "rgba(245,158,11,0.25)",
        "amber-text": "#fbbf24",
        "red-dim": "rgba(239,68,68,0.12)",
        "red-border": "rgba(239,68,68,0.2)",
        "red-text": "#f87171",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      spacing: {
        sidebar: "300px",
      },
      animation: {
        spin: "spin 0.8s linear infinite",
        "fade-in": "fadeIn 0.2s ease",
        "slide-in": "slideIn 0.15s ease",
      },
      keyframes: {
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
