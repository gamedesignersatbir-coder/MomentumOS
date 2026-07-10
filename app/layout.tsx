import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aaj',
  description: 'One page for today.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto max-w-2xl px-5 pb-20">
          <header className="flex items-baseline justify-between pt-8 pb-2">
            <Link href="/" className="serif text-2xl font-semibold no-underline text-ink">
              Aaj
            </Link>
            <nav className="flex gap-5 text-sm text-muted">
              <Link href="/saved" className="hover:text-ink">saved</Link>
              <Link href="/settings" className="hover:text-ink">settings</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
