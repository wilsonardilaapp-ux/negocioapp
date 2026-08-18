'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer, Loader2, Sparkles } from 'lucide-react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { PrintPosterTemplate } from './PrintPosterTemplate';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Business } from '@/models/business';

/**
 * @fileOverview Estudio visual para la generación y descarga de códigos QR de reservas.
 */

export function QrStudioCard({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isExporting, setIsExporting] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Obtener branding del negocio para el poster
  const businessRef = useMemoFirebase(() => doc(firestore, 'businesses', businessId), [businessId, firestore]);
  const { data: business } = useDoc<Business>(businessRef);

  const bookingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/reservar/${businessId}`;
  }, [businessId]);

  const handleDownload = async () => {
    if (!qrRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(qrRef.current, { 
        backgroundColor: '#ffffff',
        scale: 3,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `QR_Reservas_${business?.name || 'Negocio'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'Imagen descargada', description: 'El código QR está listo para ser compartido.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la imagen.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[2.5rem] border-2 border-primary/10 shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/20">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Estudio de QR</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-primary/70 tracking-widest">Punto de Acceso Físico</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-8 flex flex-col items-center justify-center">
          <div className="relative group">
             <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div 
               ref={qrRef} 
               className="relative p-6 bg-white rounded-[2.5rem] shadow-2xl border-4 border-white ring-1 ring-gray-100"
             >
                <QRCode 
                  value={bookingUrl} 
                  size={200} 
                  level="H"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
             </div>
          </div>

          <div className="text-center space-y-2">
             <p className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center justify-center gap-2">
               <Sparkles className="h-4 w-4 text-primary fill-primary" />
               Tu Puerta Digital
             </p>
             <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
               Los clientes podrán agendar sus citas escaneando este código con su celular.
             </p>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 p-6 flex flex-col gap-3">
          <Button 
            className="w-full h-12 font-black shadow-lg shadow-primary/10" 
            onClick={handleDownload}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Descargar PNG
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 font-bold bg-white"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir Cartel de Mostrador
          </Button>
        </CardFooter>
      </Card>

      {/* Template oculto que solo aparece en la impresión del navegador */}
      <div className="hidden print:block">
        <PrintPosterTemplate 
          business={business || null} 
          qrUrl={bookingUrl} 
        />
      </div>
    </div>
  );
}
