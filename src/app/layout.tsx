import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Code_Pro, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LexBot CRM — Legal CRM with WhatsApp Bot",
  description: "Legal-first CRM SaaS with WhatsApp bot layer for law firms and legal agencies",
};

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const sourceSerif4SourceSerif4 = Source_Serif_4({subsets:['latin','latin-ext','cyrillic','cyrillic-ext','greek','vietnamese'],weight:['200','300','400','500','600','700','800','900'],variable:'--font-source-serif-4'});

const sourceCodeProSourceCodePro = Source_Code_Pro({subsets:['latin','latin-ext','cyrillic','cyrillic-ext','greek','greek-ext','vietnamese'],weight:['200','300','400','500','600','700','800','900'],variable:'--font-source-code-pro'});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, sourceCodeProSourceCodePro.variable, sourceSerif4SourceSerif4.variable)}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
