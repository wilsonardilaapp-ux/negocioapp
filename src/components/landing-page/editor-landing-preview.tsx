'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LandingPageData } from '@/models/landing-page';
import { Copy, ExternalLink, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';

interface EditorLandingPreviewProps {
  data: LandingPageData;
  plans: SubscriptionPlan[];
}

export default function EditorLandingPreview({ data, plans }: EditorLandingPreviewProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  const publicUrl = user ? `${window.location.origin}/landing/${user.uid}` : '';

  const copyToClipboard = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast({
        title: "Enlace copiado",
        description: "El enlace público de tu landing page ha sido copiado al portapapeles.",
    });
  };

  const handleDownloadQR = () => {
    if (!qrCodeRef.current) return;
    html2canvas(qrCodeRef.current, { backgroundColor: null }).then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'landing-page-qr-code.png';
        link.href = dataUrl;
        link.click();
    }).catch(function (error) {
        console.error('Error generando QR:', error);
        toast({
          variant: 'destructive',
          title: 'Error al descargar QR',
          description: 'No se pudo generar la imagen del código QR.',
        });
      });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <CardTitle>Acciones de la Landing Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Enlace Público</CardTitle>
                    <CardDescription className="text-xs">Comparte este enlace para mostrar tu landing page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Input value={publicUrl} readOnly />
                        <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!publicUrl}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button asChild variant="secondary" className="w-full mt-2" disabled={!publicUrl}>
                       <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                           <ExternalLink className="mr-2 h-4 w-4" />
                           Vista Previa Pública
                       </a>
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Código QR</CardTitle>
                    <CardDescription className="text-xs">Usa este código para acceso rápido desde móviles.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div ref={qrCodeRef} className="bg-white p-4 rounded-md border">
                        {publicUrl ? (
                            <QRCode value={publicUrl} size={150} />
                        ) : (
                            <div className="h-[150px] w-[150px] bg-muted animate-pulse rounded-md" />
                        )}
                    </div>
                    <Button onClick={handleDownloadQR} disabled={!publicUrl} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Descargar QR
                    </Button>
                </CardContent>
            </Card>
        </CardContent>
      </Card>
      <Card className="sticky top-6">
          <CardHeader>
              <CardTitle>Vista Previa en Tiempo Real</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg overflow-hidden w-full bg-slate-50">
                  {/* Mock Browser Header */}
                  <div className="h-8 bg-gray-200 flex items-center px-2 gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>

                  {/* Live Preview Content */}
                  <div className="bg-white max-h-[80vh] overflow-y-auto">
                    <LandingPageContent data={data} plans={plans} businessId={user?.uid} logoUrl={data.navigation.logoUrl}/>
                  </div>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
