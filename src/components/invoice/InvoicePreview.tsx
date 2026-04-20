'use client';

import React, { useRef, useState } from 'react';
import * as QRCodeLib from 'qrcode';
import QRCode from 'react-qr-code';
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
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
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

    if (settings.qr.show) {
       try {
          qrCodeImage = await QRCodeLib.toDataURL(qrUrlToGenerate, {
              width: 200, // Increased resolution for better printing
              margin: 1,
              errorCorrectionLevel: 'H' // Higher error correction
          });
      } catch (e2) {
          console.error("QRCode lib falló:", e2);
          // Fallback in case the library fails for any reason
          qrCodeImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent 1x1 pixel
      }
    }
    
    const isBold = (zone: keyof InvoiceSettings['bold']['zones']) => settings.bold.allBold || settings.bold.zones[zone];
    
    const fontSizeMapping: { [key: string]: string } = { '9px': '9pt', '10px': '10pt', '11px': '11pt', '12px': '12pt' };
    const printFontSize = fontSizeMapping[settings.style.fontSize as keyof typeof fontSizeMapping] || '9pt';
    const totalFontSize = `${parseInt(printFontSize, 10) + 2}pt`;

    const printableContent = `
        <html>
            <head>
                <title>Factura</title>
                <style>
                  * { 
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                  }
                  @media print {
                    @page { margin: 2mm; }
                  }
                  html, body {
                    width: ${settings.style.paperSize === '80mm' ? '72mm' : '52mm'};
                    font-family: '${settings.style.font}', monospace;
                    font-size: ${printFontSize};
                    color: black;
                    margin: 0 auto;
                    padding: 2px 2px;
                  }
                  .header, .text-center { text-align: center; }
                  .separator { 
                    border-top: 1px ${settings.style.separatorStyle} #000; 
                    margin: 3px 0; 
                  }
                  .logo { 
                    display: block; 
                    margin: 4px auto 4px auto; 
                    max-width: 60px;
                    max-height: 60px; 
                    width: auto;
                    height: auto;
                  }
                  .qr-container { 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    width: 100%; 
                    margin: 4px 0; 
                  }
                  .qr-label { text-align: center; margin-top: 2px; }
                  table, thead, tbody, tr, th, td { 
                    font-family: inherit;
                    font-size: inherit;
                  }
                  table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    table-layout: fixed; 
                  }
                  th { 
                    text-align: left; 
                    font-weight: bold; 
                    border-bottom: 1px ${settings.style.separatorStyle} #000; 
                    padding-bottom: 1px; 
                  }
                  td { padding: 1px 1px; vertical-align: top; }
                  th:nth-child(1), td:nth-child(1) { 
                    width: 8%; 
                    white-space: nowrap;
                  }
                  th:nth-child(2), td:nth-child(2) { 
                    width: 42%;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  }
                  th:nth-child(3), td:nth-child(3) { 
                    width: 50%;
                    text-align: right;
                    white-space: nowrap;
                    padding-right: 2px;
                  }
                  .total-row { 
                    font-weight: bold; 
                    font-size: ${totalFontSize}; 
                  }
                  div { line-height: 1.3; }
                </style>
            </head>
            <body>
                <div style="${settings.bold.allBold ? 'font-weight: bold;' : ''}">
                    ${settings.logo.url ? `<img src="${settings.logo.url}" class="logo" alt="logo" style="display:block; margin:4px auto; max-width:60px; max-height:60px; width:auto; height:auto;"/>` : ''}
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
                    
                    <div style="width:100%; ${isBold('subtotalFees') ? 'font-weight:bold;' : ''}">
                        <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>${mockOrder.subtotal.toLocaleString()}</span></div>
                        ${settings.fields.showDeliveryFee ? `<div style="display:flex; justify-content:space-between;"><span>Domicilio:</span><span>${mockOrder.deliveryFee.toLocaleString()}</span></div>` : ''}
                        ${settings.fields.showPackaging ? `<div style="display:flex; justify-content:space-between;"><span>Empaque:</span><span>${mockOrder.packaging.toLocaleString()}</span></div>` : ''}
                    </div>
                    
                    <div class="separator"></div>
                    <div class="total-row" style="display:flex; justify-content:space-between; width:100%; ${isBold('total') ? 'font-weight: bold;' : ''}"><span>TOTAL:</span><span>${mockOrder.total.toLocaleString()}</span></div>
                    
                    ${(settings.fields.showPaymentMethod || settings.fields.showEstimatedDelivery) ? '<div class="separator"></div>' : ''}
                    ${settings.fields.showPaymentMethod ? `<div style="${isBold('paymentMethod') ? 'font-weight: bold;' : ''}">Método de pago: ${mockOrder.paymentMethod}</div>` : ''}
                    ${settings.fields.showEstimatedDelivery ? `<div style="${isBold('estimatedDelivery') ? 'font-weight: bold;' : ''}">Tiempo de entrega: ${mockOrder.estimatedDelivery}</div>` : ''}
                    
                    ${settings.promo.show && settings.promo.text ? `<div class="separator"></div><div class="text-center font-bold">${settings.promo.text}</div>` : ''}
                    
                     ${settings.qr.show && qrCodeImage ? `
                      <div class="qr-container">
                        <img 
                          src="${qrCodeImage}" 
                          alt="QR Code"
                          width="90" 
                          height="90"
                          style="display:block; margin:0 auto; width:90px; height:90px; image-rendering: pixelated;"
                        />
                        <div class="qr-label" style="${isBold('qrText') ? 'font-weight: bold;' : ''}">
                          ${settings.qr.labelText}
                        </div>
                      </div>` : ''}
                    
                    ${(settings.socialMedia.show) ? '<div class="separator"></div>' : ''}
                    
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

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 1500); 
    };
    
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }, 2500);
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
                 <div ref={qrCodeRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <QRCode value={settings.qr.url || 'https://www.google.com'} size={200} level="H" />
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
