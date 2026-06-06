import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LexBot CRM — Sign In",
  description: "Legal CRM for law firms with WhatsApp bot integration",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
