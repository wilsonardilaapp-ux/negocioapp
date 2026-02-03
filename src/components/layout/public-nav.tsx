'use client';

import React from 'react';
import type { NavigationSection } from '@/models/landing-page';

const PublicNav = ({ navigation }: { navigation: NavigationSection | undefined }) => {
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
                <div className="hidden md:flex items-center gap-6">
                    {navigation.links.filter(l => l.enabled).map(link => (
                        <a key={link.id} href={link.url} className="hover:opacity-70 transition-opacity" style={{ fontSize: `${navigation.fontSize}px` }}>
                            {link.text}
                        </a>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default PublicNav;
