'use client';
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { InvoiceTemplate, mockOrder } from './InvoiceTemplate';
import type { InvoiceSettings } from '@/models/invoice-settings';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';

interface InvoicePreviewProps {
  settings: InvoiceSettings;
  setSettings: (updater: (prev: InvoiceSettings) => InvoiceSettings) => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ settings, setSettings }) => {
  const { toast } = useToast();
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let qrCodeImage = '';
      if (settings.qr.show && settings.qr.url && qrCodeRef.current) {
        try {
          const canvas = await html2canvas(qrCodeRef.current, { backgroundColor: null, scale: 3 });
          qrCodeImage = canvas.toDataURL('image/png');
        } catch (e) {
          console.error("No se pudo renderizar el QR a imagen", e);
          toast({ variant: "destructive", title: "Error de QR", description: "No se pudo generar la imagen del QR para la impresión."});
        }
      }
      
      const printableContent = `
        <html>
          <head>
            <title>Factura</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 11px; width: ${settings.style.paperSize === '80mm' ? '72mm' : '52mm'}; margin: 0 auto; padding: 4px; box-sizing: border-box; color: black; }
              .header, .footer, .text-center { text-align: center; }
              .text-right { text-align: right; }
              .separator { border-top: 1px dashed #000; margin: 6px 0; }
              .logo { display: block; margin: 12px auto 8px auto; max-width: 80px; }
              .qr-container { display: flex; flex-direction: column; align-items: center; width: 100%; margin: 8px 0; }
              .qr-container img { width: 100px; height: 100px; }
              .qr-label { text-align: center; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; }
              td, th { padding: 1px 0; }
              .total-row { font-weight: bold; font-size: 14px; }
              .item-row td { vertical-align: top; }
            </style>
          </head>
          <body>
            <div>
              ${settings.logo.url ? `<img src="${settings.logo.url}" class="logo" style="width: ${settings.logo.size};" />` : ''}
              <div class="header" style="${settings.bold.zones.businessName ? 'font-weight: bold;' : ''}">${settings.header.businessName}</div>
              <div class="header" style="${settings.bold.zones.address ? 'font-weight: bold;' : ''}">${settings.header.address}</div>
              <div class="header">${settings.header.phone}</div>
              ${settings.header.nit ? `<div class="header" style="${settings.bold.zones.nit ? 'font-weight: bold;' : ''}">NIT: ${settings.header.nit}</div>` : ''}
              <div class="separator"></div>
              ${settings.fields.showInvoiceNumber ? `<div style="${settings.bold.zones.invoiceNumber ? 'font-weight: bold;' : ''}">Factura: ${mockOrder.invoiceNumber}</div>` : ''}
              ${settings.fields.showDateTime ? `<div style="${settings.bold.zones.dateTime ? 'font-weight: bold;' : ''}">Fecha: ${mockOrder.dateTime}</div>` : ''}
              <div class="separator"></div>
              <div style="${settings.bold.zones.clientName ? 'font-weight: bold;' : ''}">Cliente: ${mockOrder.client.name}</div>
              ${settings.fields.showClientPhone ? `<div style="${settings.bold.zones.clientPhone ? 'font-weight: bold;' : ''}">Tel: ${mockOrder.client.phone}</div>` : ''}
              ${settings.fields.showClientAddress ? `<div style="${settings.bold.zones.clientAddress ? 'font-weight: bold;' : ''}">Dir: ${mockOrder.client.address}</div>` : ''}
              <div class="separator"></div>
              <table style="${settings.bold.zones.items ? 'font-weight: bold;' : ''}">
                <thead><tr><th class="text-left">Cant</th><th class="text-left">Producto</th><th class="text-right">Total</th></tr></thead>
                <tbody>${mockOrder.items.map(item => `<tr><td>${item.quantity}</td><td>${item.name}</td><td class="text-right">${(item.quantity * item.price).toLocaleString()}</td></tr>`).join('')}</tbody>
              </table>
              <div class="separator"></div>
              <div class="text-right" style="${settings.bold.zones.subtotalFees ? 'font-weight: bold;' : ''}">
                <div>Subtotal: ${mockOrder.subtotal.toLocaleString()}</div>
                ${settings.fields.showDeliveryFee ? `<div>Domicilio: ${mockOrder.deliveryFee.toLocaleString()}</div>` : ''}
                ${settings.fields.showPackaging ? `<div>Empaque: ${mockOrder.packaging.toLocaleString()}</div>` : ''}
              </div>
              <div class="separator"></div>
              <div class="total-row text-right" style="${settings.bold.zones.total ? 'font-weight: bold;' : ''}">TOTAL: ${mockOrder.total.toLocaleString()}</div>
              ${(settings.fields.showPaymentMethod || settings.fields.showEstimatedDelivery) ? '<div class="separator"></div>' : ''}
              ${settings.fields.showPaymentMethod ? `<div style="${settings.bold.zones.paymentMethod ? 'font-weight: bold;' : ''}">Método de pago: ${mockOrder.paymentMethod}</div>` : ''}
              ${settings.fields.showEstimatedDelivery ? `<div style="${settings.bold.zones.estimatedDelivery ? 'font-weight: bold;' : ''}">Tiempo de entrega: ${mockOrder.estimatedDelivery}</div>` : ''}
              ${settings.promo.show && settings.promo.text ? `<div class="separator"></div><div class="text-center font-bold">${settings.promo.text}</div>` : ''}
              ${settings.qr.show ? `<div class="qr-container">${qrCodeImage ? `<img src="${qrCodeImage}" alt="QR Code" />` : (settings.qr.url ? 'Generando QR...' : 'QR no configurado')}<div class="qr-label" style="${settings.bold.zones.qrText ? 'font-weight: bold;' : ''}">${settings.qr.labelText}</div></div>` : ''}
              <div class="separator"></div>
              <div class="footer">
                <div style="${settings.bold.zones.footer ? 'font-weight: bold;' : ''}">${settings.footer.message}</div>
                ${settings.footer.repeatBusinessName ? `<div style="${settings.bold.zones.footer ? 'font-weight: bold;' : ''}">${settings.header.businessName}</div>` : ''}
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printableContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500); // Small delay for images to load
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
            <div id="invoice-preview-wrapper" className="origin-top scale-[1.15]">
                {/* Hidden QR for canvas capture */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} ref={qrCodeRef}>
                    {settings.qr.show && settings.qr.url && (
                        <div className="bg-white p-1">
                            <QRCode value={settings.qr.url} size={100} level="M" />
                        </div>
                    )}
                </div>
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
