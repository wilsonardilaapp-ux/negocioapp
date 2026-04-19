'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { InvoiceTemplate, mockOrder } from './InvoiceTemplate';
import type { InvoiceSettings } from '@/models/invoice-settings';

interface InvoicePreviewProps {
  settings: InvoiceSettings;
  setSettings: (updater: (prev: InvoiceSettings) => InvoiceSettings) => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ settings, setSettings }) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printableContent = document.getElementById('invoice-preview')?.innerHTML;
      
      const printStyles = `
        body { 
          margin: 0; 
          font-family: ${settings.style.font}, monospace;
          font-size: ${settings.style.fontSize};
        }
        * { 
          box-sizing: border-box; 
        }
        .invoice-container {
          padding-left: 8px;
          padding-right: 8px;
        }
        .logo-container {
            display: flex;
            justify-content: center;
            width: 100%;
            margin-top: 12px;
            margin-bottom: 8px;
        }
        .qr-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            margin: 8px 0;
            background: white; /* Ensure QR is scannable */
            padding: 8px;
        }
        @page { 
          size: auto;  
          margin: 0mm; 
        }
      `;

      printWindow.document.write('<html><head><title>Factura</title>');
      printWindow.document.write(`<style>${printStyles}</style>`);
      printWindow.document.write('</head><body><div class="invoice-container">');
      printWindow.document.write(printableContent || '');
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();
      printWindow.print();
    }
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
            <div id="invoice-preview" className="origin-top scale-[1.15]">
                <InvoiceTemplate config={settings} order={mockOrder} />
            </div>
        </div>
        <Button onClick={handlePrint} className="w-full">
          <Printer className="mr-2 h-4 w-4" /> Imprimir Prueba
        </Button>
      </CardContent>
    </Card>
  );
};
