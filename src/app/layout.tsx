import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getAdminFirestore } from '@/firebase/server-init';
import { buildFaviconUrl } from '@/lib/favicon-url';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

/**
 * Obtiene la configuración global del sistema desde Firestore.
 * Se ejecuta en el servidor mediante el Admin SDK.
 */
async function getGlobalConfig() {
  try {
    const db = await getAdminFirestore();
    const snap = await db.collection('globalConfig').doc('system').get();
    return snap.exists ? snap.data() : null;
  } catch (error) {
    console.error('[RootLayout] Error leyendo globalConfig:', error);
    return null;
  }
}

/**
 * Genera los metadatos base para toda la aplicación.
 * Las páginas que no definan sus propios metadatos heredarán estos,
 * incluyendo el favicon dinámico de la plataforma.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const globalConfig = await getGlobalConfig();
    const faviconSource = globalConfig?.faviconUrl || null;
    const updatedAt = globalConfig?.updatedAt;

    if (!faviconSource) {
      return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://markix-saas.vercel.app'),
        title: 'Markix Platform',
        description: 'Centraliza y automatiza tu negocio con Markix.',
      };
    }

    const faviconObj = { faviconUrl: faviconSource, updatedAt };

    return {
      metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://markix-saas.vercel.app'),
      title: globalConfig?.name || 'Markix Platform',
      description: globalConfig?.description || 'Centraliza y automatiza tu negocio con Markix.',
      icons: {
        icon: [
          { 
            url: buildFaviconUrl(faviconObj, 32), 
            type: "image/png", 
            sizes: "32x32" 
          }
        ],
        apple: [
          { 
            url: buildFaviconUrl(faviconObj, 180), 
            type: "image/png", 
            sizes: "180x180" 
          }
        ],
      },
    };
  } catch (error) {
    console.error('[RootLayout] Error generating metadata:', error);
    return {
      title: 'Markix Platform',
      description: 'Centraliza y automatiza tu negocio con Markix.',
    };
  }
}

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
        </Providers>
      </body>
    </html>
  );
}
