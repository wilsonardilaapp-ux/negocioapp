'use client';

import React from 'react';
import Image from 'next/image';
import { ShoppingCart, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LandingHeaderConfigData } from '@/models/landing-page';

interface CatalogHeaderProps {
  config: LandingHeaderConfigData;
  cartCount: number;
  onOpenCart: () => void;
}

export default function CatalogHeader({ config, cartCount, onOpenCart }: CatalogHeaderProps) {
  const { businessInfo, banner } = config;

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      {banner.mediaUrl && (
        <div className="hidden md:block relative h-32 w-full overflow-hidden">
          <Image src={banner.mediaUrl} alt="Banner" fill className="object-cover" />
        </div>
      )}
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {businessInfo.logoURL && (
             <div className="relative h-12 w-12 rounded-full overflow-hidden border">
                <Image src={businessInfo.logoURL} alt={businessInfo.name} fill className="object-cover" />
             </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{businessInfo.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
               {businessInfo.address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {businessInfo.address}</div>}
               {businessInfo.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {businessInfo.phone}</div>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                type="button"
                className="relative flex items-center justify-center rounded-full px-6 h-12 font-bold border-2 border-primary text-primary hover:bg-primary/5 transition-colors"
                onClick={onOpenCart}
            >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Mi Carrito
                {cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 rounded-full bg-primary text-white">
                        {cartCount}
                    </Badge>
                )}
            </button>
        </div>
      </div>
    </header>
  );
}