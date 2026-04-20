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
          width: 1.5,
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

    const barcodeHtml = settings.barcode?.show && barcodeImage
    ? `<div class="img-scale" style="text-align:center; margin:4px 0;">
        <img
          src="${barcodeImage}"
          alt="Código de barras"
          style="display:block; margin:0 auto; max-width:100%; height:auto;"
        />
       </div>`
    : '';

    const isBold = (zone: keyof InvoiceSettings['bold']['zones']) => settings.bold.allBold || settings.bold.zones[zone];

    const fontSizeMapping: { [key: string]: string } = { '9px': '8pt', '10px': '9pt', '11px': '10pt', '12px': '11pt' };
    const printFontSize = fontSizeMapping[settings.style.fontSize as keyof typeof fontSizeMapping] || '9pt';
    
    const LINE_CHARS = settings.style.paperSize === '80mm' ? 42 : 32;
    const CANT_W = 3;
    const PRICE_W = 9;
    const PROD_W = LINE_CHARS - CANT_W - PRICE_W - 2;

    const rpad = (s: string, n: number): string => s.substring(0, n).padEnd(n, ' ');
    const lpad = (s: string, n: number): string => s.substring(0, n).padStart(n, ' ');

    const itemsHeader = rpad('Can', CANT_W) + ' ' + rpad('Producto', PROD_W) + ' ' + lpad('Total', PRICE_W);
    const itemsSeparator = '-'.repeat(LINE_CHARS);

    const itemsRows = mockOrder.items.map(item => {
        const price = (item.quantity * item.price).toLocaleString('es-CO');
        const qty = String(item.quantity);
        const name = item.name;
        const lineArr: string[] = [];
        
        lineArr.push(
            rpad(qty, CANT_W) + ' ' + 
            rpad(name.substring(0, PROD_W), PROD_W) + ' ' + 
            lpad(price, PRICE_W)
        );
        
        let rest = name.substring(PROD_W);
        while (rest.length > 0) {
            lineArr.push(
            ' '.repeat(CANT_W + 1) + 
            rest.substring(0, PROD_W)
            );
            rest = rest.substring(PROD_W);
        }
        return lineArr.join('\n');
    }).join('\n');

    const itemsPreContent = [itemsHeader, itemsSeparator, itemsRows].join('\n');
    
    const SUMMARY_LABEL_W = LINE_CHARS - PRICE_W;
    const SUMMARY_VALUE_W = PRICE_W;
    
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
                  * { box-sizing: border-box; margin: 0; padding: 0; }
                  @media print { @page { margin: 2mm; } }
                  html, body {
                    width: ${settings.style.paperSize === '80mm' ? '76mm' : '56mm'};
                    font-family: '${settings.style.font}', monospace;
                    font-size: ${printFontSize};
                    color: black;
                    margin: 0;
                    padding: 2px 0px 2px 2px;
                  }
                  .text-scale { transform: scaleX(${settings.style.textScale ?? 1}); transform-origin: left top; display: block; }
                  .img-scale { transform: scale(${settings.style.textScale ?? 1}); transform-origin: center top; display: block; margin-left: auto; margin-right: auto; }
                  .header, .text-center { text-align: center; }
                  .separator { border-top: 1px ${settings.style.separatorStyle} #000; margin: 3px 0; }
                  .logo { max-width:60px; max-height:60px; width:auto; height:auto; }
                  .qr-container { display: flex; flex-direction: column; align-items: center; width: 100%; margin: 4px 0; }
                  .qr-label { text-align: center; margin-top: 2px; }
                  pre { font-family: 'Courier New', Courier, monospace !important; font-size: inherit; white-space: pre; margin: 0; padding: 0; width: 100%; }
                  .footer { text-align: center; }
                </style>
            </head>
            <body>
                ${settings.logo.url ? `<div class="img-scale" style="text-align: ${settings.logo.position};"><img src="${settings.logo.url}" class="logo" alt="logo" style="width:${settings.logo.size}; display:inline-block;"/></div>` : ''}

                <div class="text-scale">
                    <div class="header" style="${isBold('businessName') ? 'font-weight: bold;' : ''}">${settings.header.businessName}</div>
                    <div class="header" style="${isBold('address') ? 'font-weight: bold;' : ''}">${settings.header.address}</div>
                    <div class="header">${settings.header.phone}</div>
                    ${settings.header.nit ? `<div class="header" style="${isBold('nit') ? 'font-weight: bold;' : ''}">NIT: ${settings.header.nit}</div>` : ''}
                </div>

                ${settings.barcode?.position === 'header' ? barcodeHtml : ''}

                <div class="text-scale"><div class="separator"></div></div>

                <div class="text-scale">
                    ${settings.fields.showInvoiceNumber ? `<div style="${isBold('invoiceNumber') ? 'font-weight: bold;' : ''}">Factura: ${mockOrder.invoiceNumber}</div>` : ''}
                    ${settings.fields.showDateTime ? `<div style="${isBold('dateTime') ? 'font-weight: bold;' : ''}">Fecha: ${mockOrder.dateTime}</div>` : ''}
                </div>
                
                <div class="text-scale"><div class="separator"></div></div>
                
                <div class="text-scale">
                    <div style="${isBold('clientName') ? 'font-weight: bold;' : ''}">Cliente: ${mockOrder.client.name}</div>
                    ${settings.fields.showClientPhone ? `<div style="${isBold('clientPhone') ? 'font-weight: bold;' : ''}">Tel: ${mockOrder.client.phone}</div>` : ''}
                    ${settings.fields.showClientAddress ? `<div style="${isBold('clientAddress') ? 'font-weight: bold;' : ''}">Dir: ${mockOrder.client.address}</div>` : ''}
                </div>
                
                <pre style="font-family: 'Courier New', Courier, monospace; font-size: ${printFontSize}; margin: 0; padding: 0; white-space: pre; width: 100%; line-height: 1.4; ${isBold('items') ? 'font-weight:bold;' : ''}">${itemsPreContent}</pre>

                <div class="text-scale"><div class="separator"></div></div>
                
                <pre style="font-family:'Courier New',monospace; font-size:${printFontSize}; margin:0; padding:0; white-space:pre; width:100%; ${isBold('subtotalFees') ? 'font-weight:bold;' : ''}">${subtotalPreContent}</pre>

                <div class="text-scale"><div class="separator"></div></div>
                
                <pre style="font-family:'Courier New',monospace; font-size:${printFontSize}; margin:0; padding:0; white-space:pre; width:100%; font-weight:bold;">${totalPreContent}</pre>

                <div class="text-scale">${(settings.fields.showPaymentMethod || settings.fields.showEstimatedDelivery) ? '<div class="separator"></div>' : ''}</div>
                
                <div class="text-scale">
                    ${settings.fields.showPaymentMethod ? `<div style="${isBold('paymentMethod') ? 'font-weight: bold;' : ''}">Método de pago: ${mockOrder.paymentMethod}</div>` : ''}
                    ${settings.fields.showEstimatedDelivery ? `<div style="${isBold('estimatedDelivery') ? 'font-weight: bold;' : ''}">Tiempo de entrega: ${mockOrder.estimatedDelivery}</div>` : ''}
                </div>
                
                <div class="text-scale">${settings.promo.show && settings.promo.text ? `<div class="separator"></div><div class="text-center font-bold">${settings.promo.text}</div>` : ''}</div>
                
                ${settings.qr.show && qrCodeImage ? `
                  <div class="qr-container img-scale">
                    <img src="${qrCodeImage}" alt="QR Code" style="display:block; margin:0 auto; width:90px; height:90px; image-rendering: pixelated;"/>
                  </div>
                  <div class="qr-label text-scale" style="${isBold('qrText') ? 'font-weight: bold;' : ''}">
                      ${settings.qr.labelText}
                  </div>`
                  : ''}

                ${settings.barcode?.position === 'footer' ? barcodeHtml : ''}

                ${settings.socialMedia.show ? `
                    <div class="text-scale"><div class="separator"></div></div>
                    <div class="text-scale">
                        <div class="text-center" style="${isBold('socialMedia') ? 'font-weight:bold;' : ''}">
                          ${settings.socialMedia.whatsapp ? `<div>&#x1F4F1; WhatsApp: ${settings.socialMedia.whatsapp}</div>` : ''}
                          ${settings.socialMedia.instagram ? `<div>&#x1F4F7; Instagram: ${settings.socialMedia.instagram}</div>` : ''}
                          ${settings.socialMedia.facebook ? `<div>&#x1F426; Facebook: ${settings.socialMedia.facebook}</div>` : ''}
                          ${settings.socialMedia.website ? `<div>&#x1F310; Web: ${settings.socialMedia.website}</div>` : ''}
                        </div>
                    </div>` : ''}
                
                <div class="footer text-scale" style="margin-top: 8px; padding-bottom: 16px; border-top: 1px ${settings.style.separatorStyle} #000; padding-top: 4px;">
                    <div style="${isBold('footer') ? 'font-weight:bold;' : ''}">${settings.footer.message}</div>
                    ${settings.footer.repeatBusinessName ? `<div style="${isBold('footer') ? 'font-weight:bold;' : ''}">${settings.header.businessName}</div>` : ''}
                    <div style="margin-top: 8px;">&nbsp;</div>
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
