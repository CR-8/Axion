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
  return <>{children}</>;
}
