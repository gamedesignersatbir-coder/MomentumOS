import type { Metadata } from 'next';
import { ToasterProvider } from '@/components/toaster';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'MomentumOS',
  description: "A focused operating system for Satbir's priorities, learning, and reflection.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="app-shell">
        <ToasterProvider>
          <Nav />
          {children}
        </ToasterProvider>
      </body>
    </html>
  );
}
