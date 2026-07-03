'use client';

import React, { useState } from 'react';
import type { NavigationSection, NavLink } from '@/models/landing-page';
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const getLinkUrl = (link: NavLink, currentBusinessId: string | undefined): string => {
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

const PublicNav = ({ navigation, businessId }: { navigation: NavigationSection | undefined, businessId: string | undefined }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!navigation || !navigation.enabled) {
        return null;
    }

    const navStyle = {
        backgroundColor: navigation.backgroundColor || '#FFFFFF',
        color: navigation.textColor || '#000000'
    };
    
    const finalLogoUrl = navigation.logoUrl;

    return (
        <nav
            style={navStyle}
            className={`sticky top-0 z-50 py-4 transition-shadow ${navigation.useShadow ? 'shadow-md' : ''}`}
        >
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className={`flex items-center ${navigation.logoAlignment === 'center' ? 'mx-auto' : navigation.logoAlignment === 'right' ? 'ml-auto' : ''}`}>
                    {finalLogoUrl ? (
                        <img src={finalLogoUrl} alt={navigation.logoAlt} style={{ width: `${navigation.logoWidth}px` }} className="h-auto" />
                    ) : (
                        <span className="font-bold text-xl">{navigation.businessName}</span>
                    )}
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6">
                    {navigation.links.filter(l => l.enabled).map(link => (
                        <a key={link.id} href={getLinkUrl(link, businessId)} className="hover:opacity-70 transition-opacity" style={{ fontSize: `${navigation.fontSize}px` }}>
                            {link.text}
                        </a>
                    ))}
                </div>

                {/* Mobile Menu */}
                <div className="md:hidden">
                  <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Abrir menú">
                        <Menu className="h-6 w-6" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="flex flex-col gap-6 pt-12" style={navStyle}>
                      <SheetHeader className="sr-only">
                        <SheetTitle>Menú de navegación</SheetTitle>
                      </SheetHeader>
                      {navigation.links.filter(l => l.enabled).map(link => (
                        <a 
                          key={link.id} 
                          href={getLinkUrl(link, businessId)} 
                          onClick={() => setIsMenuOpen(false)}
                          className="text-lg font-semibold hover:opacity-70 transition-opacity"
                        >
                          {link.text}
                        </a>
                      ))}
                    </SheetContent>
                  </Sheet>
                </div>
            </div>
        </nav>
    );
};

export default PublicNav;
