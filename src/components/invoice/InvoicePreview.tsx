'use client';

import React, { useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { InvoiceTemplate, mockOrder } from './InvoiceTemplate';
import type { InvoiceSettings } from '@/models/invoice-settings';
import { useToast } from '@/hooks/use-toast';

interface InvoicePreviewProps {
  settings: InvoiceSettings;
  setSettings: React.Dispatch<React.SetStateAction<InvoiceSettings>>;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ settings, setSettings }) => {
  const { toast } = useToast();
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  
  /**
   * Genera una ventana de impresión capturando el estado actual del componente
   * renderizado en pantalla para garantizar fidelidad absoluta.
   */
  const handlePrint = () => {
    setIsPreparingPrint(true);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo abrir la ventana de impresión. Revisa los bloqueadores de pop-ups.',
      });
      setIsPreparingPrint(false);
      return;
    }

    // Capturar el HTML exacto de la plantilla ya renderizada por React
    const previewElement = document.getElementById('invoice-preview-wrapper');
    if (!previewElement) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la vista previa.' });
        printWindow.close();
        setIsPreparingPrint(false);
        return;
    }

    const content = previewElement.innerHTML;
    
    // Clonar los estilos del documento actual (Tailwind + Globales)
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(tag => tag.outerHTML)
      .join('\n');

    // Estilos de impresión idénticos a los del flujo de pedidos real
    const printStyles = `
      @page {
        size: auto;
        margin: 0mm;
      }
      body {
        margin: 0;
        padding: 0;
        background: white !important;
        display: flex;
        justify-content: center;
      }
      #print-root {
        width: auto;
      }
      /* Forzar renderizado de colores en impresoras térmicas */
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prueba de Impresión - Markix</title>
          ${styles}
          <style>${printStyles}</style>
        </head>
        <body>
          <div id="print-root">
            ${content}
          </div>
          <script>
            // Esperar a que los recursos internos se carguen
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // Cerrar tras iniciar el diálogo
                window.close();
              }, 800);
            };
            
            // Red de seguridad por si el onload falla
            setTimeout(() => {
                if(!window.closed) {
                    window.print();
                    window.close();
                }
            }, 3000);
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setIsPreparingPrint(false);
  };
  
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-foreground">Vista Previa en Tiempo Real</CardTitle>
        <CardDescription>Así se verá tu factura impresa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="preview-bold-toggle">Toda la factura en negrita</Label>
          <Switch
            id="preview-bold-toggle"
            checked={settings.bold.allBold}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({
                ...prev,
                bold: { ...prev.bold, allBold: checked },
              }))
            }
          />
        </div>
        <div className="bg-gray-200 p-4 rounded-md overflow-x-auto flex justify-center">
            <div id="invoice-preview-wrapper" className="origin-top">
                <InvoiceTemplate config={settings} order={mockOrder} />
            </div>
        </div>
        <Button onClick={handlePrint} className="w-full" disabled={isPreparingPrint}>
          {isPreparingPrint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
          Imprimir Prueba
        </Button>
      </CardContent>
    </Card>
  );
};