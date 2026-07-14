
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { ShoppingCart, Phone, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import type { LandingHeaderConfigData } from '@/models/landing-page';
import { WhatsAppIcon, TikTokIcon, FacebookIcon, InstagramIcon, XIcon, YoutubeIcon } from '@/components/icons';

interface CatalogHeaderProps {
  config: LandingHeaderConfigData;
  cartCount: number;
  onOpenCart: () => void;
}

export default function CatalogHeader({ config, cartCount, onOpenCart }: CatalogHeaderProps) {
  const { businessInfo, banner, socialLinks: socialData } = config;

  // Filtrar teléfonos existentes (1 al 5)
  const allPhones = useMemo(() => {
    return [
      businessInfo.phone,
      businessInfo.phone2,
      businessInfo.phone3,
      businessInfo.phone4,
      businessInfo.phone5
    ].filter(Boolean);
  }, [businessInfo]);

  // Generar lista de redes sociales activa con validación estricta de URLs para evitar redirecciones en Cloud Workstations
  const activeSocials = useMemo(() => {
    const isValidUrl = (url: string | undefined) => {
        if (!url) return false;
        const u = url.trim();
        // Solo aceptamos protocolos seguros para navegación externa en este contexto
        return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('mailto:') || u.startsWith('tel:');
    };

    const getFullWhatsAppUrl = (val: string | undefined) => {
        if (!val) return '';
        const trimmed = val.trim();
        if (trimmed.startsWith('http')) return trimmed;
        // Blindaje: Si es solo el número, construir la URL de WhatsApp para evitar href vacíos
        return `https://wa.me/${normalizePhoneNumber(trimmed)}`;
    };

    return [
      { id: 'whatsapp', icon: <WhatsAppIcon className="h-4 w-4" />, url: getFullWhatsAppUrl(socialData.whatsapp), color: 'hover:text-green-500' },
      { id: 'instagram', icon: <InstagramIcon className="h-4 w-4" />, url: socialData.instagram, color: 'hover:text-pink-500' },
      { id: 'facebook', icon: <FacebookIcon className="h-4 w-4" />, url: socialData.facebook, color: 'hover:text-blue-600' },
      { id: 'tiktok', icon: <TikTokIcon className="h-4 w-4" />, url: socialData.tiktok, color: 'hover:text-black' },
      { id: 'twitter', icon: <XIcon className="h-4 w-4" />, url: socialData.twitter, color: 'hover:text-black' },
      { id: 'youtube', icon: <YoutubeIcon className="h-4 w-4" />, url: socialData.youtube, color: 'hover:text-red-600' },
    ].filter(link => isValidUrl(link.url));
  }, [socialData]);

  // Función de blindaje para prevenir navegación a rutas base que activen redirecciones de seguridad de la Workstation
  const handleSafeClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string | undefined) => {
    if (!url || url === '#' || url === '' || url === 'undefined') {
      e.preventDefault();
      return;
    }
    
    // Si la URL no es un protocolo externo conocido, prevenimos para evitar saltos al Marketplace de Google
    if (!url.startsWith('http') && !url.startsWith('tel:') && !url.startsWith('mailto:')) {
        e.preventDefault();
    }
  };

  return (
    <header className="bg-white border-b relative">
      {/* Banner Slim (120px) - Mantiene el diseño optimizado de la fase anterior */}
      {banner.mediaUrl && (
        <div className="relative h-[120px] w-full overflow-hidden bg-muted">
          <Image 
            src={banner.mediaUrl} 
            alt="Banner" 
            fill 
            priority
            className="object-cover" 
          />
        </div>
      )}

      {/* Unificación Compacta de Información - Diseño Slim y Unificado */}
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Branding & Info Principal */}
          <div className="flex items-center gap-3">
            {businessInfo.logoURL && (
               <div className="relative h-10 w-10 rounded-full overflow-hidden border shrink-0 bg-gray-50">
                  <Image src={businessInfo.logoURL} alt={businessInfo.name} fill className="object-cover" />
               </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">
                {businessInfo.name}
              </h1>
              {businessInfo.address && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                  <MapPin className="h-2.5 w-2.5 text-primary" />
                  {businessInfo.address}
                </div>
              )}
            </div>
          </div>

          {/* Teléfonos y Redes (Slim Layout) */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Lista de Teléfonos - Blindados con protocolo tel: y prevención de recarga de página */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-black text-gray-700">
              {allPhones.map((p, idx) => {
                const phoneUrl = `tel:${normalizePhoneNumber(p)}`;
                return (
                  <a 
                    key={idx} 
                    href={phoneUrl || '#'}
                    onClick={(e) => handleSafeClick(e, p)}
                    className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                  >
                    <Phone className="h-3 w-3 text-primary" />
                    {p}
                  </a>
                );
              })}
            </div>

            {/* Iconos Sociales - Blindados para evitar la redirección al Marketplace de Google Cloud */}
            {activeSocials.length > 0 && (
              <div className="flex items-center gap-2 pl-4 border-l border-muted-foreground/20">
                {activeSocials.map(social => (
                  <a 
                    key={social.id} 
                    href={social.url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => handleSafeClick(e, social.url)}
                    className={cn("text-muted-foreground transition-all hover:scale-110", social.color)}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {/* Carrito de Compras */}
          <button 
            type="button"
            className="relative flex items-center justify-center rounded-full px-4 h-10 font-bold border-2 border-primary text-primary hover:bg-primary/5 transition-colors text-sm shrink-0"
            onClick={onOpenCart}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Carrito
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-primary text-white text-[10px] font-black border-2 border-white shadow-sm">
                {cartCount}
              </Badge>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
