
'use client';

import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import QRCode from 'react-qr-code';
import { Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CatalogQRGenerator() {
  const { user } = useUser();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const getCatalogUrl = () => {
    if (typeof window !== 'undefined' && user) {
      return `${window.location.origin}/catalog/${user.uid}`;
    }
    return '';
  };
  
  const catalogUrl = getCatalogUrl();

  const downloadQR = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'catalogo-qr.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const shareQR = async () => {
    if (navigator.share && catalogUrl) {
      try {
        await navigator.share({
          title: 'Mi Catálogo de Productos',
          text: '¡Echa un vistazo a mi catálogo de productos!',
          url: catalogUrl,
        });
        toast({ title: 'Catálogo compartido', description: 'El enlace a tu catálogo se ha compartido con éxito.' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error al compartir',
          description: 'No se pudo compartir el catálogo. Inténtalo de nuevo.',
        });
      }
    } else {
        navigator.clipboard.writeText(catalogUrl);
        toast({ title: 'Enlace Copiado', description: 'No se puede compartir, pero hemos copiado el enlace para ti.' });
    }
  };
  
  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar QR del Catálogo Público</CardTitle>
        <CardDescription>Usa este código QR para que tus clientes accedan directamente a tu catálogo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg border" ref={qrRef}>
          {catalogUrl ? (
            <QRCode
              value={catalogUrl}
              size={180}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="L"
            />
          ) : (
             <div className="w-[180px] h-[180px] bg-gray-200 animate-pulse rounded-md" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">Escanea para ver el catálogo</p>
        <div className="flex gap-4">
          <Button onClick={downloadQR}>
            <Download className="mr-2 h-4 w-4" />
            Descargar QR
          </Button>
          <Button variant="outline" onClick={shareQR}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartir QR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
