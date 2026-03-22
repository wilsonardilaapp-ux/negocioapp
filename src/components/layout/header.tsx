'use client'; // Marcar como Client Component para usar hooks

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import type { LandingPageData, NavLink } from "@/models/landing-page";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from 'firebase/firestore';

async function getMainBusinessId(firestore: any): Promise<string | null> {
    if (!firestore) return null;
    try {
        const configSnap = await getDoc(doc(firestore, "globalConfig", "system"));
        return configSnap.exists() ? configSnap.data().mainBusinessId : null;
    } catch (error) {
        console.error("Error fetching global config:", error);
        return null;
    }
}

const getLinkUrl = (link: NavLink, currentBusinessId: string | null | undefined): string => {
    if (link.url && link.url !== '#') {
        return link.url;
    }
    const text = link.text.toLowerCase();
    if (text.includes('blog')) return '/blog';
    if (text.includes('catálogo')) return currentBusinessId ? `/catalog/${currentBusinessId}` : '#';
    if (text.includes('contacto')) return '/contact';
    if (text.includes('inicio')) return currentBusinessId ? `/landing/${currentBusinessId}` : '/';
    return '#';
};

export default function Header() {
  const firestore = useFirestore();

  // Usamos un estado para el ID del negocio para que se resuelva en el cliente
  const [businessId, setBusinessId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchBusinessId() {
      const id = await getMainBusinessId(firestore);
      setBusinessId(id);
    }
    if (firestore) {
      fetchBusinessId();
    }
  }, [firestore]);

  const landingPageRef = useMemoFirebase(() => {
    if (!firestore || !businessId) return null;
    return doc(firestore, 'businesses', businessId, 'landingPages', 'main');
  }, [firestore, businessId]);

  const { data } = useDoc<LandingPageData>(landingPageRef);

  const navigation = data?.navigation;
  const logoUrl = data?.navigation?.logoUrl;
  const businessName = navigation?.businessName || "Negocio V03";

  return (
    <header 
        className="sticky top-0 z-50 w-full border-b bg-card shadow-sm"
        style={{
            backgroundColor: navigation?.backgroundColor || 'hsl(var(--card))',
            color: navigation?.textColor || 'hsl(var(--card-foreground))'
        }}
    >
      <div className="container flex items-center justify-between px-4 py-2 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
             <img src={logoUrl} alt={businessName} style={{ width: `${navigation?.logoWidth || 80}px`, height: 'auto', maxHeight: '64px' }} />
          ) : (
             <Logo className="h-8 w-8 text-primary" />
          )}
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
           {navigation?.links.filter(l => l.enabled).map(link => (
                <Link 
                    key={link.id} 
                    href={getLinkUrl(link, businessId)} 
                    className="text-sm font-medium hover:text-primary transition-colors"
                    style={{
                        fontSize: `${navigation.fontSize}px`,
                        // @ts-ignore
                        '--hover-color': navigation.hoverColor
                    }}
                >
                  {link.text}
                </Link>
              ))}
        </nav>
      </div>
    </header>
  );
}
