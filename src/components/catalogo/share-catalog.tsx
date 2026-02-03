
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { InstagramIcon } from 'lucide-react';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon } from '@/components/icons';


export default function ShareCatalog() {
  const { user } = useUser();
  const { toast } = useToast();

  const getCatalogUrl = () => {
    if (typeof window !== 'undefined' && user) {
      return `${window.location.origin}/catalog/${user.uid}`;
    }
    return '';
  };
  
  const catalogUrl = getCatalogUrl();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(catalogUrl).then(() => {
      toast({
        title: 'Enlace Copiado',
        description: 'El enlace a tu catálogo ha sido copiado al portapapeles.',
      });
    }, (err) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo copiar el enlace.',
      });
    });
  };

  const socialShares = [
    { name: 'TikTok', icon: <TikTokIcon />, className: 'bg-black text-white hover:bg-gray-800', url: `https://www.tiktok.com/` },
    { name: 'Instagram', icon: <InstagramIcon />, className: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white', url: `https://www.instagram.com/` },
    { name: 'Facebook', icon: <FacebookIcon />, className: 'bg-blue-600 text-white hover:bg-blue-700', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(catalogUrl)}` },
    { name: 'WhatsApp', icon: <WhatsAppIcon />, className: 'bg-green-500 text-white hover:bg-green-600', url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Mira mi catálogo de productos! ${catalogUrl}`)}` },
    { name: 'X', icon: <XIcon />, className: 'bg-black text-white hover:bg-gray-800', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(catalogUrl)}&text=${encodeURIComponent('¡Mira mi catálogo de productos!')}` },
  ];

  if (!user) {
    return null; // Don't render if user is not available
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparte tu Catálogo</CardTitle>
        <CardDescription>
          Promociona tus productos en redes sociales para aumentar las ventas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={copyToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          Copiar Enlace
        </Button>
        {socialShares.map(social => (
          <Button
            key={social.name}
            className={social.className}
            asChild
          >
            <a href={social.url} target="_blank" rel="noopener noreferrer">
              {React.cloneElement(social.icon as React.ReactElement, { className: "h-4 w-4" })}
              <span className="ml-2">{social.name}</span>
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
