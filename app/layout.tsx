import type { Metadata } from "next";

import { ToasterProvider } from "@/components/toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum OS",
  description: "A focused operating system for Satbir's priorities, learning, and reflection."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="app-shell">
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
