import { z } from 'zod';

// For QR-based payments like Nequi, Bancolombia, Daviplata
export const QRConfigSchema = z.object({
  enabled: z.boolean(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  qrImageUrl: z.string().nullable().optional(),
  instructions: z.string().optional(),
});
export type QRConfig = z.infer<typeof QRConfigSchema>;

// For Bre-B specific payment
export const BreBKeyTypeSchema = z.enum(["Celular", "Correo", "Documento", "Alfanumerico"]);
export type BreBKeyType = z.infer<typeof BreBKeyTypeSchema>;

export const BreBConfigSchema = z.object({
  enabled: z.boolean(),
  holderName: z.string().optional(),
  keyType: BreBKeyTypeSchema.optional(),
  keyValue: z.string().optional(),
  commerceCode: z.string().optional(),
  qrImageUrl: z.string().nullable().optional(),
  instructions: z.string().optional(),
});
export type BreBConfig = z.infer<typeof BreBConfigSchema>;

// For API Gateways like Stripe, Mercado Pago, PayPal
export const ApiGatewayConfigSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['sandbox', 'production']).optional(),
  publicKey: z.string().optional(),
  secretKey: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  accessToken: z.string().optional(),
  instructions: z.string().optional(),
});
export type ApiGatewayConfig = z.infer<typeof ApiGatewayConfigSchema>;

// Main configuration object schema
export const GlobalPaymentConfigSchema = z.object({
  nequi: QRConfigSchema,
  bancolombia: QRConfigSchema,
  daviplata: QRConfigSchema,
  breB: BreBConfigSchema,
  stripe: ApiGatewayConfigSchema,
  mercadoPago: ApiGatewayConfigSchema,
  paypal: ApiGatewayConfigSchema,
});
export type GlobalPaymentConfig = z.infer<typeof GlobalPaymentConfigSchema>;

export const HotmartPlanLinkSchema = z.object({
    planId: z.string(),
    planName: z.string(),
    hotmartUrl: z.string(),
});
export type HotmartPlanLink = z.infer<typeof HotmartPlanLinkSchema>;
