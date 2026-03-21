
export type QRFormData = {
  enabled: boolean;
  qrImageUrl: string | null;
  accountNumber: string;
  holderName: string;
  instructions?: string;
};

export type BreBKeyType = "Celular" | "Correo" | "Documento" | "Alfanumerico";

export type BreBFormData = {
    enabled: boolean;
    holderName: string;
    keyType: BreBKeyType;
    keyValue: string;
    commerceCode?: string;
    qrImageUrl: string | null;
    instructions?: string;
};

export type CashOnDeliveryData = {
    enabled: boolean;
};

export type PaymentSettings = {
  id: string;
  userId: string;
  nequi: QRFormData;
  bancolombia: QRFormData;
  daviplata: QRFormData;
  breB: BreBFormData; // Nueva opción
  pagoContraEntrega: CashOnDeliveryData;
};
