
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ApiGatewayConfig } from "@/models/global-payment-config";
import { Link2 } from "lucide-react";

interface ApiGatewayFormProps {
  data: ApiGatewayConfig;
  setData: (data: ApiGatewayConfig) => void;
  fields: Array<'publicKey' | 'secretKey' | 'clientId' | 'clientSecret' | 'accessToken'>;
}

export default function ApiGatewayForm({ data, setData, fields }: ApiGatewayFormProps) {
  const handleInputChange = (field: keyof ApiGatewayConfig, value: string | 'sandbox' | 'production') => {
    setData({ ...data, [field]: value });
  };

  const fieldLabels: Record<string, string> = {
    publicKey: "Public Key",
    secretKey: "Secret Key",
    clientId: "Client ID",
    clientSecret: "Client Secret",
    accessToken: "Access Token",
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-2">
        <Label htmlFor="checkoutUrl" className="flex items-center gap-2 text-primary font-bold">
            <Link2 className="h-4 w-4" />
            URL de Página de Pago (Checkout Externo)
        </Label>
        <Input
          id="checkoutUrl"
          type="url"
          placeholder="https://buy.stripe.com/..."
          value={data.checkoutUrl || ''}
          onChange={(e) => handleInputChange('checkoutUrl', e.target.value)}
          className="bg-white border-primary/30 focus-visible:ring-primary"
        />
        <p className="text-[10px] text-muted-foreground italic">
            Si se configura, los clientes serán redirigidos a esta URL al seleccionar este método.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.map(field => (
            <div key={field}>
            <Label htmlFor={field}>{fieldLabels[field]}</Label>
            <Input
                id={field}
                type="password"
                value={data[field] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
            />
            </div>
        ))}
      </div>

      <div>
        <Label>Modo de Operación</Label>
        <RadioGroup
          value={data.mode}
          onValueChange={(value: 'sandbox' | 'production') => handleInputChange('mode', value)}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sandbox" id="mode-sandbox" />
            <Label htmlFor="mode-sandbox">Sandbox (Pruebas)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="production" id="mode-production" />
            <Label htmlFor="mode-production">Production (Producción)</Label>
          </div>
        </RadioGroup>
      </div>
      <div>
        <Label htmlFor="instructions-api">Instrucciones para el Cliente</Label>
        <Textarea
          id="instructions-api"
          placeholder="Ej: Serás redirigido a una plataforma segura para completar tu pago."
          value={data.instructions || ''}
          onChange={(e) => handleInputChange('instructions', e.target.value)}
        />
      </div>
    </div>
  );
}
