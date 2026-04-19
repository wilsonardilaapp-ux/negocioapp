'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { InvoiceTemplate, mockOrder } from './InvoiceTemplate';
import type { InvoiceSettings } from '@/models/invoice-settings';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

interface InvoicePreviewProps {
  settings: InvoiceSettings;
  setSettings: (updater: (prev: InvoiceSettings) => InvoiceSettings) => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ settings, setSettings }) => {
  const { toast } = useToast();

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo abrir la ventana de impresión. Revisa los bloqueadores de pop-ups.',
      });
      return;
    }

    let qrCodeImage = '';
    const qrUrlToGenerate = settings.qr.url || 'https://www.google.com';

    if (settings.qr.show && qrUrlToGenerate) {
      if (settings.qr.qrImageUrl) {
        qrCodeImage = settings.qr.qrImageUrl;
      } else {
        try {
          qrCodeImage = await QRCode.toDataURL(qrUrlToGenerate, {
            width: 120,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });
        } catch (e) {
          console.error("QRCode generation failed:", e);
        }
      }
    }
    
    // CORRECTION: Use larger, more appropriate point sizes for printing.
    const fontSizeMapping = {
        '9px': '8pt',
        '10px': '9pt', // A good default for thermal printers
        '11px': '10pt',
        '12px': '11pt'
    };
    const printFontSize = fontSizeMapping[settings.style.fontSize as keyof typeof fontSizeMapping] || '9pt'; // Default to 9pt

    const isBold = (zone: keyof InvoiceSettings['bold']['zones']) => settings.bold.allBold || settings.bold.zones[zone];

    const printableContent = `
        <html>
            <head>
                <title>Factura</title>
                <style>
                    @media print {
                        @page {
                            size: ${settings.style.paperSize === '80mm' ? '72mm' : '52mm'} auto;
                            margin: 0;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                    }
                    * { 
                      box-sizing: border-box;
                    }
                    body {
                      font-family: '${settings.style.font}', monospace !important;
                      font-size: ${printFontSize} !important;
                      width: ${settings.style.paperSize === '80mm' ? '72mm' : '52mm'}; 
                      color: black;
                      margin: 0 auto;
                      padding: 4px;
                    }
                    table, thead, tbody, tr, th, td {
                        font-family: inherit !important;
                        font-size: inherit !important;
                    }
                    .header, .footer, .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .separator { border-top: 1px ${settings.style.separatorStyle} #000; margin: 4px 0; }
                    .logo-container { display: flex; justify-content: ${settings.logo.position}; width: 100%; margin: 12px 0 8px 0; }
                    .logo { display: block; max-width: ${settings.logo.size}; height: auto; }
                    .qr-container { display: flex; flex-direction: column; align-items: center; width: 100%; margin: 8px 0; }
                    .qr-label { text-align: center; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; }
                    th {
                        text-align: left;
                        font-weight: bold;
                        border-bottom: 1px ${settings.style.separatorStyle} #000;
                        padding-bottom: 2px;
                    }
                    td { 
                        padding: 1px 2px; 
                        vertical-align: top; 
                    }
                    .total-row { font-weight: bold; font-size: calc(${printFontSize} + 2pt); }
                </style>
            </head>
            <body>
                <div style="${settings.bold.allBold ? 'font-weight: bold;' : ''}">
                    ${settings.logo.url ? `<div class="logo-container"><img src="${settings.logo.url}" class="logo" /></div>` : ''}
                    <div class="header" style="${isBold('businessName') ? 'font-weight: bold;' : ''}">${settings.header.businessName}</div>
                    <div class="header" style="${isBold('address') ? 'font-weight: bold;' : ''}">${settings.header.address}</div>
                    <div class="header">${settings.header.phone}</div>
                    ${settings.header.nit ? `<div class="header" style="${isBold('nit') ? 'font-weight: bold;' : ''}">NIT: ${settings.header.nit}</div>` : ''}
                    <div class="separator"></div>
                    ${settings.fields.showInvoiceNumber ? `<div style="${isBold('invoiceNumber') ? 'font-weight: bold;' : ''}">Factura: ${mockOrder.invoiceNumber}</div>` : ''}
                    ${settings.fields.showDateTime ? `<div style="${isBold('dateTime') ? 'font-weight: bold;' : ''}">Fecha: ${mockOrder.dateTime}</div>` : ''}
                    <div class="separator"></div>
                    <div style="${isBold('clientName') ? 'font-weight: bold;' : ''}">Cliente: ${mockOrder.client.name}</div>
                    ${settings.fields.showClientPhone ? `<div style="${isBold('clientPhone') ? 'font-weight: bold;' : ''}">Tel: ${mockOrder.client.phone}</div>` : ''}
                    ${settings.fields.showClientAddress ? `<div style="${isBold('clientAddress') ? 'font-weight: bold;' : ''}">Dir: ${mockOrder.client.address}</div>` : ''}
                    <div class="separator"></div>
                    <table>
                        <thead><tr><th>Cant</th><th>Producto</th><th class="text-right">Total</th></tr></thead>
                        <tbody>${mockOrder.items.map(item => `<tr><td>${item.quantity}</td><td>${item.name}</td><td class="text-right">${(item.quantity * item.price).toLocaleString()}</td></tr>`).join('')}</tbody>
                    </table>
                    <div class="separator"></div>
                    <div class="text-right" style="${isBold('subtotalFees') ? 'font-weight: bold;' : ''}">
                        <div>Subtotal: ${mockOrder.subtotal.toLocaleString()}</div>
                        ${settings.fields.showDeliveryFee ? `<div>Domicilio: ${mockOrder.deliveryFee.toLocaleString()}</div>` : ''}
                        ${settings.fields.showPackaging ? `<div>Empaque: ${mockOrder.packaging.toLocaleString()}</div>` : ''}
                    </div>
                    <div class="separator"></div>
                    <div class="total-row text-right" style="${isBold('total') ? 'font-weight: bold;' : ''}">TOTAL: ${mockOrder.total.toLocaleString()}</div>
                    ${(settings.fields.showPaymentMethod || settings.fields.showEstimatedDelivery) ? '<div class="separator"></div>' : ''}
                    ${settings.fields.showPaymentMethod ? `<div style="${isBold('paymentMethod') ? 'font-weight: bold;' : ''}">Método de pago: ${mockOrder.paymentMethod}</div>` : ''}
                    ${settings.fields.showEstimatedDelivery ? `<div style="${isBold('estimatedDelivery') ? 'font-weight: bold;' : ''}">Tiempo de entrega: ${mockOrder.estimatedDelivery}</div>` : ''}
                    ${settings.promo.show && settings.promo.text ? `<div class="separator"></div><div class="text-center font-bold">${settings.promo.text}</div>` : ''}
                    
                    ${settings.qr.show && qrCodeImage ? `
                      <div class="qr-container">
                        <img 
                          src="${qrCodeImage}" 
                          alt="QR Code"
                          width="80" 
                          height="80"
                          style="display:block; margin:0 auto; width:80px; height:80px;"
                        />
                        <div class="qr-label" style="${isBold('qrText') ? 'font-weight: bold;' : ''}">
                          ${settings.qr.labelText}
                        </div>
                      </div>` : ''}

                    <div class="separator"></div>
                    <div class="footer">
                        <div style="${isBold('footer') ? 'font-weight: bold;' : ''}">${settings.footer.message}</div>
                        ${settings.footer.repeatBusinessName ? `<div style="${isBold('footer') ? 'font-weight: bold;' : ''}">${settings.header.businessName}</div>` : ''}
                    </div>
                </div>
            </body>
        </html>
    `;

    printWindow.document.write(printableContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 1500);
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
