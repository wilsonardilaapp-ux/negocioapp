'use client';

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/icons";
import type { LandingPageData, NavLink } from "@/models/landing-page";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const getLinkUrl = (link: NavLink, currentBusinessId: string | null | undefined): string => {
  // 1. Prioritize a specific, non-placeholder URL from the data
  if (link.url && link.url !== '#') {
    return link.url;
  }

  // 2. Dynamically resolve common pages based on text content
  const text = link.text.toLowerCase();
  
  if (text.includes('inicio')) return currentBusinessId ? `/landing/${currentBusinessId}` : '/';
  if (text.includes('blog')) return currentBusinessId ? `/blog/${currentBusinessId}` : '/blog';
  if (text.includes('catálogo')) return currentBusinessId ? `/catalog/${currentBusinessId}` : '#';
  if (text.includes('contacto')) return currentBusinessId ? `/contacto-cliente/${currentBusinessId}` : '/contacto';
  if (text.includes('sesión') || text.includes('acceder') || text.includes('login')) return '/login';
  
  // Platform-wide pages
  if (text.includes('servicios')) return '/servicios';
  if (text.includes('sobre nosotros')) return '/sobre-nosotros';
  if (text.includes('precios')) return '/pricing';
  
  // 3. Final fallback
  return '#';
};


// Define props for the Header
interface HeaderProps {
  businessId: string | null;
  navigation: LandingPageData['navigation'] | null;
}

export default function Header({ businessId, navigation }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const logoUrl = navigation?.logoUrl;
  const businessName = navigation?.businessName || "Markix Platform";

  const headerStyle = {
    backgroundColor: navigation?.backgroundColor || 'hsl(var(--card))',
    color: navigation?.textColor || 'hsl(var(--card-foreground))'
  };

  return (
    <header 
        className="sticky top-0 z-50 w-full border-b bg-card shadow-sm"
        style={headerStyle}
    >
      <div className="container flex items-center justify-between px-4 py-2 md:px-6">
        <div className="flex items-center gap-4">
          {/* Mobile Navigation - Moved to the left of the logo */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menú">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col gap-6 pt-12" style={headerStyle}>
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú de navegación</SheetTitle>
                </SheetHeader>
                {navigation?.links?.filter(l => l.enabled).map(link => (
                  <Link 
                    key={link.id} 
                    href={getLinkUrl(link, businessId)} 
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-semibold hover:opacity-70 transition-opacity"
                  >
                    {link.text}
                  </Link>
                ))}
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} style={{ width: `${navigation?.logoWidth || 80}px`, height: 'auto', maxHeight: '64px' }} />
            ) : (
              <Logo className="h-8 w-8 text-primary" />
            )}
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
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