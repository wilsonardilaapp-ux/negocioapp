
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

/**
 * Metadatos base globales. 
 * Los favicon dinámicos son manejados preferentemente vía generateMetadata en las páginas.
 */
export const metadata: Metadata = {
  title: 'Markix Platform',
  description: 'Centraliza y automatiza tu negocio con Markix.',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${ptSans.variable} font-body antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
