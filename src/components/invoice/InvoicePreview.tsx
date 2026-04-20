
'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as QRCodeLib from 'qrcode';
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

const rpad = (s: string, n: number): string => s.substring(0, n).padEnd(n, ' ');
const lpad = (s: string, n: number): string => s.substring(0, n).padStart(n, ' ');

interface InvoicePreviewProps {
  settings: InvoiceSettings;
  setSettings: React.Dispatch<React.SetStateAction<InvoiceSettings>>;
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

    if (settings.qr.show && !settings.qr.qrImageUrl) {
        try {
            qrCodeImage = await QRCodeLib.toDataURL(qrUrlToGenerate, {
                width: 200,
                margin: 1,
                errorCorrectionLevel: 'H',
            });
        } catch (e2) {
            console.error("QRCode lib falló:", e2);
            qrCodeImage = '';
        }
    } else if (settings.qr.show && settings.qr.qrImageUrl) {
        qrCodeImage = settings.qr.qrImageUrl;
    }
    
    let barcodeImage = '';
    if (settings.barcode?.show && settings.barcode?.value?.trim()) {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, settings.barcode.value, {
          format: 'CODE128',
          width: 1,
          height: 40,
          displayValue: settings.barcode.displayValue ?? true,
          fontSize: 10,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
        });
        barcodeImage = canvas.toDataURL('image/png');
      } catch (e) {
        console.error('Error generando barcode:', e);
      }
    }

    const isBold = (zone: keyof InvoiceSettings['bold']['zones']) => settings.bold.allBold || settings.bold.zones[zone];

    const fontSizeMapping: { [key: string]: string } = { '9px': '8pt', '10px': '9pt', '11px': '10pt', '12px': '11pt' };
    const printFontSize = fontSizeMapping[settings.style.fontSize as keyof typeof fontSizeMapping] || '9pt';
    
    const textScale = settings.style.textScale ?? 1;

    const WRAPPER_PX = settings.style.paperSize === '80mm' 
    ? 216 : 160;
  const fontSizePx: { [key: string]: number } = {
    '9px': 5.5, '10px': 6, '11px': 6.5, '12px': 7
  };
  const charWidthPx = fontSizePx[
    settings.style.fontSize as keyof typeof fontSizePx
  ] ?? 6;
  
  // LINE_CHARS fijo basado en ancho físico del wrapper
  // textScale NO reduce los chars disponibles
  // solo comprime visualmente el texto con scaleX
  const effectiveLineChars = Math.floor(
    (WRAPPER_PX - 4) / charWidthPx
  );

  // Mínimo garantizado para que PROD_W nunca sea negativo
  const CANT_W = 3;
  const PRICE_W = 9;
  // Si effectiveLineChars es muy pequeño, usar mínimo 20
  const safeLineChars = Math.max(effectiveLineChars, 20);

    const PROD_W = safeLineChars - CANT_W - PRICE_W - 2;
    const safePROD_W = Math.max(PROD_W, 8);
    
    const itemsHeader = rpad('Can', CANT_W) + ' ' + rpad('Producto', safePROD_W) + ' ' + lpad('Total', PRICE_W);
    const itemsSeparator = '-'.repeat(safeLineChars);

    const itemsRows = mockOrder.items.map(item => {
      const price = (item.quantity * item.price).toLocaleString('es-CO');
      const qty = String(item.quantity);
      const name = item.name;
      const lineArr: string[] = [];
      
      lineArr.push(rpad(qty, CANT_W) + ' ' + rpad(name.substring(0, safePROD_W), safePROD_W) + ' ' + lpad(price, PRICE_W));
      
      let rest = name.substring(safePROD_W);
      while (rest.length > 0) {
        lineArr.push(' '.repeat(CANT_W + 1) + rpad(rest.substring(0, safePROD_W), safePROD_W));
        rest = rest.substring(safePROD_W);
      }
      return lineArr.join('\n');
    }).join('\n');
    
    const itemsPreContent = [itemsHeader, itemsSeparator, itemsRows].join('\n');
    
    const SUMMARY_VALUE_W = PRICE_W;
    const SUMMARY_LABEL_W = safeLineChars - SUMMARY_VALUE_W;
    
    const subtotalLines: string[] = [];
    subtotalLines.push(rpad('Subtotal:', SUMMARY_LABEL_W) + lpad(mockOrder.subtotal.toLocaleString('es-CO'), SUMMARY_VALUE_W));
    if (settings.fields.showDeliveryFee) {
        subtotalLines.push(rpad('Domicilio:', SUMMARY_LABEL_W) + lpad(mockOrder.deliveryFee.toLocaleString('es-CO'), SUMMARY_VALUE_W));
    }
    if (settings.fields.showPackaging) {
        subtotalLines.push(rpad('Empaque:', SUMMARY_LABEL_W) + lpad(mockOrder.packaging.toLocaleString('es-CO'), SUMMARY_VALUE_W));
    }
    const subtotalPreContent = subtotalLines.join('\n');
    
    const totalPreContent = rpad('TOTAL:', SUMMARY_LABEL_W) + lpad(mockOrder.total.toLocaleString('es-CO'), SUMMARY_VALUE_W);
    
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
                  html, body {
                    margin: 0;
                    padding: 0;
                    background: white;
                  }
                  body {
                    font-family: '${settings.style.font}', monospace;
                    font-size: ${printFontSize};
                    color: black;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                  }
                  #ticket-wrapper {
                    width: ${settings.style.paperSize === '80mm' ? '216px' : '160px'};
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    transform: scaleX(${textScale});
                    transform-origin: top center;
                  }
                  .text-center { text-align: center; }
                  .separator { 
                    border-top: 1px ${settings.style.separatorStyle} #000; 
                    margin: 3px 0; 
                    width: 100%;
                  }
                  .logo { 
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
                  pre { 
                    font-family: '${settings.style.font}', monospace !important; 
                    font-size: inherit; 
                    white-space: pre; 
                    margin: 0; 
                    padding: 0; 
                    width: 100%;
                    overflow: hidden;
                    line-height: 1.4;
                  }
                  div { 
                    line-height: 1.4; 
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  }
                  .footer { 
                    text-align: center; 
                    margin-top: 8px; 
                    padding-bottom: 16px; 
                    border-top: 1px ${settings.style.separatorStyle} #000; 
                    padding-top: 4px; 
                  }
                  @media print {
                    @page { 
                      size: ${settings.style.paperSize === '80mm' ? '80mm' : '58mm'} auto;
                      margin: 0; 
                    }
                    html, body { 
                      margin: 0; 
                      padding: 0;
                      display: block; /* desactiva flex en impresión */
                      overflow: hidden;
                    }
                    #ticket-wrapper { 
                      width: ${settings.style.paperSize === '80mm' ? '216px' : '160px'};
                      transform: scaleX(${textScale});
                      transform-origin: top left;
                    }
                  }
                </style>
            </head>
            <body>
              <div id="ticket-wrapper">
                  ${settings.logo.url ? `<div style="text-align: ${settings.logo.position}; margin-bottom: 4px;"><img src="${settings.logo.url}" class="logo" alt="logo" style="width:${settings.logo.size}; display:inline-block;"/></div>` : ''}

                  <div class="text-center">
                      <div style="${isBold('businessName') ? 'font-weight: bold;' : ''}">${settings.header.businessName}</div>
                      <div style="${isBold('address') ? 'font-weight: bold;' : ''}">${settings.header.address}</div>
                      <div>${settings.header.phone}</div>
                      ${settings.header.nit ? `<div style="${isBold('nit') ? 'font-weight: bold;' : ''}">NIT: ${settings.header.nit}</div>` : ''}
                  </div>
                
                ${settings.barcode?.position === 'header' ? `<div style="text-align:center; margin:4px 0;"><img src="${barcodeImage}" alt="barcode"/></div>` : ''}

                <div>
                    <div class="separator"></div>
                    <div style="margin: 3px 0;">
                        ${settings.fields.showInvoiceNumber ? `<div style="${isBold('invoiceNumber') ? 'font-weight: bold;' : ''}">Factura: ${mockOrder.invoiceNumber}</div>` : ''}
                        ${settings.fields.showDateTime ? `<div style="${isBold('dateTime') ? 'font-weight: bold;' : ''}">Fecha: ${mockOrder.dateTime}</div>` : ''}
                    </div>
                    <div class="separator"></div>
                    <div style="margin: 3px 0;">
                        <div style="${isBold('clientName') ? 'font-weight: bold;' : ''}">Cliente: ${mockOrder.client.name}</div>
                        ${settings.fields.showClientPhone ? `<div style="${isBold('clientPhone') ? 'font-weight: bold;' : ''}">Tel: ${mockOrder.client.phone}</div>` : ''}
                        ${settings.fields.showClientAddress ? `<div style="${isBold('clientAddress') ? 'font-weight: bold;' : ''}">Dir: ${mockOrder.client.address}</div>` : ''}
                    </div>
                </div>

               <pre style="font-size: inherit; line-height: 1.4;">${itemsPreContent}</pre>

               <div>
                  <div class="separator"></div>
                  <pre style="font-size: inherit; ${isBold('subtotalFees') ? 'font-weight:bold;' : ''}; line-height: 1.4;">${subtotalPreContent}</pre>
                  <div class="separator"></div>
                  <pre style="font-size: inherit; font-weight:bold; line-height: 1.4;">${totalPreContent}</pre>
                  ${(settings.fields.showPaymentMethod || settings.fields.showEstimatedDelivery) ? '<div class="separator"></div>' : ''}
                  <div style="margin: 3px 0;">
                    ${settings.fields.showPaymentMethod ? `<div style="${isBold('paymentMethod') ? 'font-weight: bold;' : ''}">Método de pago: ${mockOrder.paymentMethod}</div>` : ''}
                    ${settings.fields.showEstimatedDelivery ? `<div style="${isBold('estimatedDelivery') ? 'font-weight: bold;' : ''}">Tiempo de entrega: ${mockOrder.estimatedDelivery}</div>` : ''}
                  </div>
                  ${settings.promo.show && settings.promo.text ? `<div class="separator"></div><div class="text-center" style="font-weight:bold; margin: 3px 0;">${settings.promo.text}</div>` : ''}
                </div>
                
                ${settings.qr.show && qrCodeImage ? `
                      <div class="qr-container">
                        <img src="${qrCodeImage}" alt="QR Code" style="display:block; margin:0 auto; width:90px; height:90px; image-rendering: pixelated;"/>
                        <div>
                            <div class="qr-label" style="${isBold('qrText') ? 'font-weight: bold;' : ''}">${settings.qr.labelText}</div>
                        </div>
                      </div>`
                  : ''}

                ${settings.barcode?.position === 'footer' ? `<div style="text-align:center; margin:4px 0;"><img src="${barcodeImage}" alt="barcode"/></div>` : ''}

                <div>
                  ${settings.socialMedia.show ? `<div class="separator"></div>` : ''}
                  <div class="text-center" style="margin: 3px 0; ${isBold('socialMedia') ? 'font-weight:bold;' : ''}">
                    ${settings.socialMedia.show && settings.socialMedia.whatsapp ? `<div>&#x1F4F1; WhatsApp: ${settings.socialMedia.whatsapp}</div>` : ''}
                    ${settings.socialMedia.show && settings.socialMedia.instagram ? `<div>&#x1F4F7; Instagram: ${settings.socialMedia.instagram}</div>` : ''}
                    ${settings.socialMedia.show && settings.socialMedia.facebook ? `<div>&#x1F426; Facebook: ${settings.socialMedia.facebook}</div>` : ''}
                    ${settings.socialMedia.show && settings.socialMedia.website ? `<div>&#x1F310; Web: ${settings.socialMedia.website}</div>` : ''}
                  </div>
                  <div class="footer">
                      <div style="${isBold('footer') ? 'font-weight:bold;' : ''}">${settings.footer.message}</div>
                      ${settings.footer.repeatBusinessName ? `<div style="${isBold('footer') ? 'font-weight:bold;' : ''}">${settings.header.businessName}</div>` : ''}
                      <div style="margin-top: 8px;">&nbsp;</div>
                  </div>
                </div>
              </div>
            </body>
        </html>
    `;

    printWindow.document.write(printableContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      }, 800);
    };

    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }, 2000);
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
        <Button onClick={handlePrint} className="w-full">
          <Printer className="mr-2 h-4 w-4" /> Imprimir Prueba
        </Button>
      </CardContent>
    </Card>
  );
};
