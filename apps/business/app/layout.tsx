import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Replo API — Dashboard", description: "Account, abbonamenti e API key per integrare le API proprietarie Replo." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
