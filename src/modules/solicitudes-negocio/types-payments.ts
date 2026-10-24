import type { GlobalPaymentConfig, HotmartPlanLink } from '@/models/global-payment-config';

export interface SolicitudPaymentConfig {
  enabledInForm: boolean; // Interruptor del bloque en el formulario público
  config: GlobalPaymentConfig;
  hotmartLinks: HotmartPlanLink[];
  updatedAt?: string;
}

export interface PublicPaymentMethodData {
  enabledInForm: boolean;
  methods: {
    wompi?: { enabled: boolean; checkoutUrl?: string; qrImageUrl?: string | null; accountNumber?: string; holderName?: string; instructions?: string };
    nequi?: { enabled: boolean; accountNumber?: string; holderName?: string; instructions?: string; qrImageUrl?: string | null };
    bancolombia?: { enabled: boolean; accountNumber?: string; holderName?: string; instructions?: string; qrImageUrl?: string | null };
    daviplata?: { enabled: boolean; accountNumber?: string; holderName?: string; instructions?: string; qrImageUrl?: string | null };
    breB?: { enabled: boolean; holderName?: string; keyType?: string; keyValue?: string; instructions?: string; qrImageUrl?: string | null };
    stripe?: { enabled: boolean; checkoutUrl?: string; instructions?: string };
    paypal?: { enabled: boolean; checkoutUrl?: string; instructions?: string };
    mercadoPago?: { enabled: boolean; checkoutUrl?: string; instructions?: string };
  };
  hotmartLinks: Array<{ planId: string; planName: string; hotmartUrl: string; enabled: boolean }>;
}
