'use client';

import React from 'react';
import type { InvoiceSettings } from '@/models/invoice-settings';
import { cn } from '@/lib/utils';
import QRCode from 'react-qr-code';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from '@/components/icons';

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

  return (
    <div
      className={cn(
        'bg-white text-black mx-auto overflow-hidden',
        paperWidthClasses[config.style.paperSize],
        fontClasses[config.style.font],
        className
      )}
      style={{ fontSize: config.style.fontSize, paddingLeft: '8px', paddingRight: '8px' }}
    >
      <div className="text-center space-y-1">
        {config.logo.url && (
          <div className={cn('flex w-full my-3', `justify-${config.logo.position}`)}>
            <img src={config.logo.url} alt="logo" style={{ width: config.logo.size }} />
          </div>
        )}
        <p className={cn(isBold('businessName') && 'font-bold')}>{config.header.businessName}</p>
        <p className={cn(isBold('address') && 'font-bold')}>{config.header.address}</p>
        <p>{config.header.phone}</p>
        {config.header.nit && <p className={cn(isBold('nit') && 'font-bold')}>NIT: {config.header.nit}</p>}
      </div>

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

      <Separator style={config.style.separatorStyle} />

      <table className={cn('w-full my-2', isBold('items') && 'font-bold')}>
        <thead>
          <tr>
            <th className="text-left">Cant</th>
            <th className="text-left">Producto</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={i}>
              <td className="align-top">{item.quantity}</td>
              <td>{item.name}</td>
              <td className="text-right align-top">{(item.quantity * item.price).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator style={config.style.separatorStyle} />

      <div className={cn('my-2 space-y-1 text-right', isBold('subtotalFees') && 'font-bold')}>
        <p>Subtotal: {order.subtotal.toLocaleString()}</p>
        {config.fields.showDeliveryFee && <p>Domicilio: {order.deliveryFee.toLocaleString()}</p>}
        {config.fields.showPackaging && <p>Empaque: {order.packaging.toLocaleString()}</p>}
      </div>

      <Separator style={config.style.separatorStyle} />

      <p className={cn('text-right text-lg my-2', isBold('total') && 'font-bold')}>
        TOTAL: {order.total.toLocaleString()}
      </p>

      {config.fields.showPaymentMethod && <p className={cn('my-2', isBold('paymentMethod') && 'font-bold')}>Método de pago: {order.paymentMethod}</p>}
      {config.fields.showEstimatedDelivery && <p className={cn('my-2', isBold('estimatedDelivery') && 'font-bold')}>Tiempo de entrega: {order.estimatedDelivery}</p>}

      {config.promo.show && (
        <>
          <Separator style={config.style.separatorStyle} />
          <p className="text-center my-2 font-bold">{config.promo.text}</p>
        </>
      )}

      {config.qr.show && (
        <div className="flex flex-col items-center my-2 space-y-1">
          {config.qr.qrImageUrl ? (
             <img src={config.qr.qrImageUrl} alt="QR Code" style={{ width: '100px', height: '100px' }} className="object-contain bg-white rounded-sm p-1" />
          ) : (
            <div className="bg-white p-1 rounded-sm">
                <QRCode value={config.qr.url || 'https://www.google.com'} size={100} />
            </div>
          )}
          <p className={cn(isBold('qrText') && 'font-bold')}>{config.qr.labelText}</p>
        </div>
      )}

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
  );
};
