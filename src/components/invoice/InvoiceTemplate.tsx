'use client';

import React, { useEffect, useRef } from 'react';
import type { InvoiceSettings } from '@/models/invoice-settings';
import { cn } from '@/lib/utils';
import QRCode from 'react-qr-code';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from '@/components/icons';
import JsBarcode from 'jsbarcode';
import { Youtube, Linkedin } from 'lucide-react';


// Mock order data for preview
export const mockOrder = {
  invoiceNumber: 'FC-00123',
  dateTime: new Date().toLocaleString(),
  client: {
    name: 'Juan Pérez',
    address: 'Calle Falsa 123, Apto 4B',
    phone: '300 123 4567',
  },
  paymentMethod: 'Nequi',
  estimatedDelivery: '25-35 minutos',
  items: [
    { name: 'Hamburguesa Clásica', quantity: 2, price: 18000 },
    { name: 'Papas a la Francesa', quantity: 1, price: 6000 },
    { name: 'Gaseosa 1.5L', quantity: 1, price: 5000 },
  ],
  deliveryFee: 4000,
  packaging: 1000,
  subtotal: 47000,
  total: 52000,
};

// Simplified Order type for the template
export type OrderType = typeof mockOrder;

interface InvoiceTemplateProps {
  config: InvoiceSettings;
  order: OrderType;
  className?: string;
}

// Barcode Component for live preview
const Barcode: React.FC<{ settings: InvoiceSettings['barcode'] }> = ({ settings }) => {
  const ref = React.useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current && settings?.value) {
      try {
        JsBarcode(ref.current, settings.value, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: settings.displayValue,
          fontSize: 12,
          margin: 0,
          background: 'transparent'
        });
      } catch (e) {
        console.error("Barcode generation error:", e);
      }
    }
  }, [settings]);

  if (!settings?.show || !settings?.value) {
    return null;
  }

  return <svg ref={ref} />;
};


const Separator = ({ style }: { style: 'dashed' | 'solid' | 'none' }) => {
  if (style === 'none') return null;
  return <div className={`w-full border-t border-black ${style === 'dashed' ? 'border-dashed' : 'border-solid'}`} />;
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ config, order, className }) => {
  const isBold = (zone: keyof InvoiceSettings['bold']['zones']) => config.bold.allBold || config.bold.zones[zone];

  const fontClasses = {
    monospace: 'font-mono',
    arial: 'font-sans', // Approx
    'sans-serif': 'font-sans',
  };

  const paperWidthClasses = {
    '58mm': 'w-[58mm]',
    '80mm': 'w-[80mm]',
    'A4': 'w-[210mm]',
  };

  const barcodeElement = (
    <div className="text-center my-2" style={{ transform: `scale(${config.style.textScale ?? 1})`, transformOrigin: 'center top' }}>
      <Barcode settings={config.barcode} />
    </div>
  );

  // Replicating text formatting logic for live preview
  const LINE_CHARS = config.style.paperSize === '80mm' ? 42 : 32;
  const CANT_W = 3;
  const PRICE_W = 9;
  const PROD_W = LINE_CHARS - CANT_W - PRICE_W - 2;

  const rpad = (s: string, n: number): string => s.substring(0, n).padEnd(n, ' ');
  const lpad = (s: string, n: number): string => s.substring(0, n).padStart(n, ' ');

  const itemsHeader = rpad('Can', CANT_W) + ' ' + rpad('Producto', PROD_W) + ' ' + lpad('Total', PRICE_W);
  const itemsSeparator = '-'.repeat(LINE_CHARS);

  const itemsRows = order.items.map(item => {
    const price = (item.quantity * item.price).toLocaleString('es-CO');
    const qty = String(item.quantity);
    const name = item.name;
    const lineArr: string[] = [];
    
    lineArr.push(rpad(qty, CANT_W) + ' ' + rpad(name.substring(0, PROD_W), PROD_W) + ' ' + lpad(price, PRICE_W));
    
    let rest = name.substring(PROD_W);
    while (rest.length > 0) {
      lineArr.push(' '.repeat(CANT_W + 1) + rpad(rest.substring(0, PROD_W), PROD_W));
      rest = rest.substring(PROD_W);
    }
    return lineArr.join('\n');
  }).join('\n');

  const itemsPreContent = [itemsHeader, itemsSeparator, itemsRows].join('\n');

  const SUMMARY_LABEL_W = LINE_CHARS - PRICE_W - 1;
  const SUMMARY_VALUE_W = PRICE_W;
  
  const subtotalLines: string[] = [];
  subtotalLines.push(rpad('Subtotal:', SUMMARY_LABEL_W) + lpad(order.subtotal.toLocaleString('es-CO'), SUMMARY_VALUE_W));
  if (config.fields.showDeliveryFee) {
    subtotalLines.push(rpad('Domicilio:', SUMMARY_LABEL_W) + lpad(order.deliveryFee.toLocaleString('es-CO'), SUMMARY_VALUE_W));
  }
  if (config.fields.showPackaging) {
    subtotalLines.push(rpad('Empaque:', SUMMARY_LABEL_W) + lpad(order.packaging.toLocaleString('es-CO'), SUMMARY_VALUE_W));
  }
  const subtotalPreContent = subtotalLines.join('\n');

  const totalPreContent = rpad('TOTAL:', SUMMARY_LABEL_W) + lpad(order.total.toLocaleString('es-CO'), SUMMARY_VALUE_W);

  return (
    <div
      className={cn(
        'bg-white text-black mx-auto overflow-hidden p-1',
        paperWidthClasses[config.style.paperSize],
        fontClasses[config.style.font],
        className
      )}
      style={{
        fontSize: config.style.fontSize,
      }}
    >
      {config.logo.url && (
        <div style={{ transform: `scale(${config.style.textScale ?? 1})`, transformOrigin: 'center top', display: 'flex', justifyContent: config.logo.position, width: '100%', marginTop: '12px', marginBottom: '8px' }}>
            <img src={config.logo.url} alt="logo" style={{ width: config.logo.size }} />
        </div>
      )}

      <div style={{ transform: `scaleX(${config.style.textScale ?? 1})`, transformOrigin: 'left top', display: 'block' }}>
          <div className="text-center space-y-1">
            <p className={cn(isBold('businessName') && 'font-bold')}>{config.header.businessName}</p>
            <p className={cn(isBold('address') && 'font-bold')}>{config.header.address}</p>
            <p>{config.header.phone}</p>
            {config.header.nit && <p className={cn(isBold('nit') && 'font-bold')}>NIT: {config.header.nit}</p>}
          </div>
      </div>
      
      {config.barcode?.position === 'header' && barcodeElement}

      <div style={{ transform: `scaleX(${config.style.textScale ?? 1})`, transformOrigin: 'left top', display: 'block' }}>
          <Separator style={config.style.separatorStyle} />
          <div className="space-y-1 my-2">
            {config.fields.showInvoiceNumber && <p className={cn(isBold('invoiceNumber') && 'font-bold')}>Factura: {order.invoiceNumber}</p>}
            {config.fields.showDateTime && <p className={cn(isBold('dateTime') && 'font-bold')}>Fecha: {order.dateTime}</p>}
          </div>
          <Separator style={config.style.separatorStyle} />
          <div className="space-y-1 my-2">
            <p className={cn(isBold('clientName') && 'font-bold')}>Cliente: {order.client.name}</p>
            {config.fields.showClientPhone && <p className={cn(isBold('clientPhone') && 'font-bold')}>Tel: {order.client.phone}</p>}
            {config.fields.showClientAddress && <p className={cn(isBold('clientAddress') && 'font-bold')}>Dir: {order.client.address}</p>}
          </div>
      </div>

       <pre className={cn('text-left w-full whitespace-pre my-2', isBold('items') && 'font-bold')} style={{lineHeight: 1.4, fontSize: 'inherit', transform: `scaleX(${config.style.textScale ?? 1})`, transformOrigin: 'left top', display: 'block' }}>
          {itemsPreContent}
       </pre>

       <div style={{ transform: `scaleX(${config.style.textScale ?? 1})`, transformOrigin: 'left top', display: 'block' }}>
          <Separator style={config.style.separatorStyle} />
           <pre className={cn('w-full whitespace-pre my-2', isBold('subtotalFees') && 'font-bold')} style={{lineHeight: 1.4, fontSize: 'inherit' }}>
              {subtotalPreContent}
           </pre>
          <Separator style={config.style.separatorStyle} />
           <pre className="w-full whitespace-pre my-2 font-bold" style={{lineHeight: 1.4, fontSize: 'inherit' }}>
               {totalPreContent}
           </pre>
          {(config.fields.showPaymentMethod || config.fields.showEstimatedDelivery) && <Separator style={config.style.separatorStyle} />}
          {config.fields.showPaymentMethod && <p className={cn('my-2', isBold('paymentMethod') && 'font-bold')}>Método de pago: {order.paymentMethod}</p>}
          {config.fields.showEstimatedDelivery && <p className={cn('my-2', isBold('estimatedDelivery') && 'font-bold')}>Tiempo de entrega: {order.estimatedDelivery}</p>}
           {config.promo.show && (
            <>
              <Separator style={config.style.separatorStyle} />
              <p className="text-center my-2 font-bold">{config.promo.text}</p>
            </>
          )}
       </div>

      {config.qr.show && (
        <div className="qr-container flex flex-col items-center my-2 space-y-1" style={{ transform: `scale(${config.style.textScale ?? 1})`, transformOrigin: 'center top' }}>
          {config.qr.qrImageUrl ? (
             <img src={config.qr.qrImageUrl} alt="QR Code" style={{ width: '100px', height: '100px' }} className="object-contain bg-white rounded-sm p-1" />
          ) : (
            <div className="bg-white p-1 rounded-sm">
                <QRCode value={config.qr.url || 'https://www.google.com'} size={100} />
            </div>
          )}
           <div style={{ transform: `scaleX(${1 / (config.style.textScale ?? 1)})` }}>
              <p className={cn('text-center text-xs mt-1', isBold('qrText') && 'font-bold')}>{config.qr.labelText}</p>
          </div>
        </div>
      )}

      {config.barcode?.position === 'footer' && barcodeElement}
      
      <div style={{ transform: `scaleX(${config.style.textScale ?? 1})`, transformOrigin: 'left top', display: 'block' }}>
          {config.socialMedia.show && (
            <div className={cn('flex justify-center items-center gap-2 my-2', isBold('socialMedia') && 'font-bold')}>
              {config.socialMedia.instagram && <InstagramIcon className="h-4 w-4" />}
              {config.socialMedia.facebook && <FacebookIcon className="h-4 w-4" />}
              {config.socialMedia.whatsapp && <WhatsAppIcon className="h-4 w-4" />}
            </div>
          )}
          <Separator style={config.style.separatorStyle} />
          <div className="text-center my-2 space-y-1">
            <p className={cn(isBold('footer') && 'font-bold')}>{config.footer.message}</p>
            {config.footer.repeatBusinessName && <p className={cn(isBold('footer') && 'font-bold')}>{config.header.businessName}</p>}
          </div>
      </div>
    </div>
  );
};
