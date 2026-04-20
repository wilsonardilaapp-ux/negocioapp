
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

    const isBold = (zone: keyof InvoiceSettings['bold']['zones']) => settings.bold.allBold || settings.bold.zones[zone];

    const fontSizeMapping: { [key: string]: string } = { '9px': '7pt', '10px': '9pt', '11px': '10pt', '12px': '11pt' };
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
                    width: ${settings.style.paperSize === '80mm' ? '76mm' : '56mm'};
                    font-family: '${settings.style.font}', monospace;
                    font-size: ${printFontSize};
                    color: black;
                    margin: 0 auto;
                    padding: 2px 0px 2px 2px;
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
                  pre {
                    font-family: '${settings.style.font}', monospace;
                    font-size: ${printFontSize};
                    margin: 0;
                    padding: 0;
                    white-space: pre-wrap;
                    word-break: break-all;
                    width: 100%;
                  }
                  .total-row { 
                    font-weight: bold;
                  }
                  .text-right { text-align: right; }
                  .footer { text-align: center; }
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
                    ${(() => {
                        const COL_TOTAL = 28; // caracteres totales por línea en 58mm
                        const COL_CANT = 3;
                        const COL_TOTAL_VAL = 8;
                        const COL_PROD = COL_TOTAL - COL_CANT - COL_TOTAL_VAL - 2;
                        
                        const padEnd = (str: string, len: number) => str.substring(0, len).padEnd(len, ' ');
                        const padStart = (str: string, len: number) => str.substring(0, len).padStart(len, ' ');
                    
                        const header = 
                          padEnd('Can', COL_CANT) + ' ' + 
                          padEnd('Producto', COL_PROD) + ' ' + 
                          padStart('Total', COL_TOTAL_VAL);
                    
                        const separator = '-'.repeat(COL_TOTAL);
                        
                        const rows = mockOrder.items.map(item => {
                          const total = (item.quantity * item.price).toLocaleString('es-CO');
                          const qty = String(item.quantity);
                          const name = item.name;
                          
                          // Si el nombre es largo, dividir en múltiples líneas
                          if (name.length > COL_PROD) {
                            const firstLine = name.substring(0, COL_PROD);
                            const restLines = name.substring(COL_PROD);
                            return padEnd(qty, COL_CANT) + ' ' + 
                                   padEnd(firstLine, COL_PROD) + ' ' + 
                                   padStart(total, COL_TOTAL_VAL) + '\\n' +
                                   ' '.repeat(COL_CANT + 1) + restLines;
                          }
                          return padEnd(qty, COL_CANT) + ' ' + 
                                 padEnd(name, COL_PROD) + ' ' + 
                                 padStart(total, COL_TOTAL_VAL);
                        }).join('\\n');
                    
                        return `<pre style="font-family: '${settings.style.font}', monospace; font-size: ${printFontSize}; margin: 0; padding: 0; white-space: pre-wrap; width: 100%; overflow: hidden;">${header}\\n${separator}\\n${rows}</pre>`;
                      })()}
                    <div class="separator"></div>
                    ${(() => {
                        const COL_TOTAL = 28;
                        const padEnd = (str: string, len: number) => str.substring(0, len).padEnd(len, ' ');
                        const padStart = (str: string, len: number) => str.substring(0, len).padStart(len, ' ');
                        
                        const labelCol = 14;
                        const valueCol = COL_TOTAL - labelCol;
                        
                        const subtotalLine = 
                          padEnd('Subtotal:', labelCol) + 
                          padStart(mockOrder.subtotal.toLocaleString('es-CO'), valueCol);
                          
                        const deliveryLine = settings.fields.showDeliveryFee 
                          ? '\\n' + padEnd('Domicilio:', labelCol) + 
                            padStart(mockOrder.deliveryFee.toLocaleString('es-CO'), valueCol)
                          : '';
                      
                        const packagingLine = settings.fields.showPackaging
                          ? '\\n' + padEnd('Empaque:', labelCol) + 
                            padStart(mockOrder.packaging.toLocaleString('es-CO'), valueCol)
                          : '';
                      
                        return `<pre style="font-family: '${settings.style.font}', monospace; font-size: ${printFontSize}; margin: 0; padding: 0; white-space: pre-wrap; width: 100%; ${isBold('subtotalFees') ? 'font-weight:bold;' : ''}">${subtotalLine}${deliveryLine}${packagingLine}</pre>`;
                    })()}
                    <div class="separator"></div>
                    ${(() => {
                        const COL_TOTAL = 28;
                        const labelCol = 10;
                        const valueCol = COL_TOTAL - labelCol;
                        const totalLine = 
                          'TOTAL:'.padEnd(labelCol, ' ') + 
                          mockOrder.total.toLocaleString('es-CO').padStart(valueCol, ' ');
                        return `
                          <pre style="
                            font-family: '${settings.style.font}', monospace;
                            font-size: ${printFontSize};
                            font-weight: bold;
                            margin: 0;
                            padding: 0;
                            white-space: pre;
                            width: 100%;
                            overflow: hidden;
                          ">${totalLine}</pre>
                        `;
                      })()}
                    
                    ${(settings.fields.showPaymentMethod || settings.fields.showEstimatedDelivery) ? '<div class="separator"></div>' : ''}
                    ${settings.fields.showPaymentMethod ? `<div style="${isBold('paymentMethod') ? 'font-weight: bold;' : ''}">Método de pago: ${mockOrder.paymentMethod}</div>` : ''}
                    ${settings.fields.showEstimatedDelivery ? `<div style="${isBold('estimatedDelivery') ? 'font-weight: bold;' : ''}">Tiempo de entrega: ${mockOrder.estimatedDelivery}</div>` : ''}
                    
                    ${settings.promo.show && settings.promo.text ? `<div class="separator"></div><div class="text-center font-bold">${settings.promo.text}</div>` : ''}
                    
                    ${settings.qr.show && qrCodeImage ? `
                      <div class="qr-container">
                        <img 
                          src="${qrCodeImage}" 
                          alt="QR Code"
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

    // Esperar que imágenes carguen antes de imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      }, 800);
    };

    // Fallback si onload no dispara
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
