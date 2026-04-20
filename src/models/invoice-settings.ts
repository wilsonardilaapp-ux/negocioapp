'use client';

import { z } from 'zod';

// Zod schema for validation
export const InvoiceSettingsSchema = z.object({
  header: z.object({
    businessName: z.string(),
    address: z.string(),
    phone: z.string(),
    nit: z.string(),
  }),
  logo: z.object({
    url: z.string().nullable(),
    size: z.string(), // e.g., '60px'
    position: z.enum(['center', 'left', 'right']),
  }),
  qr: z.object({
    show: z.boolean(),
    linkType: z.enum(['menu', 'review', 'whatsapp', 'instagram', 'custom']),
    url: z.string(),
    labelText: z.string(),
    qrImageUrl: z.string().nullable().optional(), // Added for custom QR upload
  }),
  socialMedia: z.object({
    show: z.boolean(),
    instagram: z.string(),
    whatsapp: z.string(),
    facebook: z.string(),
    website: z.string().optional(),
  }),
  fields: z.object({
    showInvoiceNumber: z.boolean(),
    showDateTime: z.boolean(),
    showClientAddress: z.boolean(),
    showClientPhone: z.boolean(),
    showPaymentMethod: z.boolean(),
    showDeliveryFee: z.boolean(),
    showPackaging: z.boolean(),
    showEstimatedDelivery: z.boolean(),
  }),
  style: z.object({
    paperSize: z.enum(['58mm', '80mm', 'A4']),
    font: z.enum(['monospace', 'arial', 'sans-serif']),
    separatorStyle: z.enum(['dashed', 'solid', 'none']),
    fontSize: z.string(), // e.g., '10px'
    textScale: z.number().min(0.7).max(1.3),
  }),
  bold: z.object({
    allBold: z.boolean(),
    zones: z.object({
      businessName: z.boolean(),
      address: z.boolean(),
      nit: z.boolean(),
      invoiceNumber: z.boolean(),
      dateTime: z.boolean(),
      clientName: z.boolean(),
      clientPhone: z.boolean(),
      clientAddress: z.boolean(),
      paymentMethod: z.boolean(),
      estimatedDelivery: z.boolean(),
      items: z.boolean(),
      total: z.boolean(),
      subtotalFees: z.boolean(),
      qrText: z.boolean(),
      socialMedia: z.boolean(),
      footer: z.boolean(),
    }),
  }),
  promo: z.object({
    show: z.boolean(),
    text: z.string(),
  }),
  footer: z.object({
    message: z.string(),
    repeatBusinessName: z.boolean(),
  }),
  barcode: z.object({
    show: z.boolean(),
    value: z.string(),
    displayValue: z.boolean(),
    position: z.enum(['header', 'footer']),
  }),
});

// TypeScript type inferred from the schema
export type InvoiceSettings = z.infer<typeof InvoiceSettingsSchema>;

// Default initial values
export const initialInvoiceSettings: InvoiceSettings = {
  header: {
    businessName: "Nombre de tu Negocio",
    address: "Dirección de tu Negocio",
    phone: "123-456-7890",
    nit: "123.456.789-0",
  },
  logo: {
    url: null,
    size: "60px",
    position: "center",
  },
  qr: {
    show: true,
    linkType: "menu",
    url: "",
    labelText: "Ver nuestro menú",
    qrImageUrl: null,
  },
  socialMedia: {
    show: false,
    instagram: "",
    whatsapp: "",
    facebook: "",
    website: "",
  },
  fields: {
    showInvoiceNumber: true,
    showDateTime: true,
    showClientAddress: true,
    showClientPhone: true,
    showPaymentMethod: true,
    showDeliveryFee: true,
    showPackaging: false,
    showEstimatedDelivery: true,
  },
  style: {
    paperSize: "58mm",
    font: "monospace",
    separatorStyle: "dashed",
    fontSize: "10px",
    textScale: 1.0,
  },
  bold: {
    allBold: false,
    zones: {
      businessName: true,
      address: true,
      nit: false,
      invoiceNumber: true,
      dateTime: false,
      clientName: false,
      clientPhone: false,
      clientAddress: false,
      paymentMethod: false,
      estimatedDelivery: false,
      items: true,
      total: true,
      subtotalFees: false,
      qrText: false,
      socialMedia: false,
      footer: true,
    },
  },
  promo: {
    show: false,
    text: "¡Aprovecha nuestro 2x1 en postres los miércoles!",
  },
  footer: {
    message: "¡Gracias por su compra!",
    repeatBusinessName: true,
  },
  barcode: {
    show: false,
    value: '',
    displayValue: true,
    position: 'footer'
  }
};
