"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ApiGatewayConfig } from "@/models/global-payment-config";
import { Link2, Webhook, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiGatewayFormProps {
  data: ApiGatewayConfig;
  setData: (data: ApiGatewayConfig) => void;
  fields: Array<'publicKey' | 'secretKey' | 'clientId' | 'clientSecret' | 'accessToken'>;
  showWebhookSecret?: boolean;
}

export default function ApiGatewayForm({ data, setData, fields, showWebhookSecret = false }: ApiGatewayFormProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Checkout URL Field */}
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

        {/* Webhook Configuration Section */}
        <div className={cn(
          "p-4 rounded-lg border space-y-4",
          showWebhookSecret ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"
        )}>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl" className={cn(
                "flex items-center gap-2 font-bold",
                showWebhookSecret ? "text-orange-700" : "text-blue-700"
              )}>
                  <Webhook className="h-4 w-4" />
                  Webhook URL
              </Label>
              <Input
              id="webhookUrl"
              type="url"
              placeholder="https://tu-dominio.com/api/webhooks/..."
              value={data.webhookUrl || ''}
              onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
              className="bg-white border-muted focus-visible:ring-primary"
              />
            </div>

            {showWebhookSecret && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label htmlFor="webhookSecret" className="flex items-center gap-2 text-orange-700 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    Webhook Secret (Signing Secret)
                </Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  placeholder="whsec_..."
                  value={data.webhookSecret || ''}
                  onChange={(e) => handleInputChange('webhookSecret', e.target.value)}
                  className="bg-white border-orange-300 focus-visible:ring-orange-500"
                />
                <p className="text-[10px] text-muted-foreground italic">
                    Requerido por Stripe para verificar la autenticidad de las notificaciones.
                </p>
              </div>
            )}
            
            {!showWebhookSecret && (
              <p className="text-[10px] text-muted-foreground italic">
                  URL para recibir notificaciones automáticas de pago desde la plataforma del proveedor.
              </p>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.map(field => (
            <div key={field}>
            <Label htmlFor={field}>{fieldLabels[field]}</Label>
            <Input
                id={field}
                type="password"
                value={data[field] || ''}
                onChange={(e) => handleInputChange(field as any, e.target.value)}
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
