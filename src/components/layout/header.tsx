'use client';

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/icons";
import type { LandingPageData, NavLink } from "@/models/landing-page";

// Helper function remains outside the component
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

// Define props for the Header
interface HeaderProps {
  businessId: string | null;
  navigation: LandingPageData['navigation'] | null;
}

export default function Header({ businessId, navigation }: HeaderProps) {
  const logoUrl = navigation?.logoUrl;
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
           {navigation?.links?.filter(l => l.enabled).map(link => (
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
