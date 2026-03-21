"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ApiGatewayConfig } from "@/models/global-payment-config";

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
