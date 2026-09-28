import "./globals.css";
import "./workspace.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seltra", description: "Commerce that runs itself." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body suppressHydrationWarning>{children}</body></html>;
}
