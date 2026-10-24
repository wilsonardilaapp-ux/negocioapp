'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2, Save, Building, Smartphone, Building2, Store, DollarSign, Wallet, Download, Check, AlertCircle } from 'lucide-react';
import type { GlobalPaymentConfig, HotmartPlanLink } from '@/models/global-payment-config';
import QRForm from '@/components/pagos/qr-form';
import BreBForm from '@/components/pagos/breb-form';
import WompiForm from '@/components/pagos/wompi-form';
import ApiGatewayForm from '@/components/pagos/api-gateway-form';
import { initialPaymentConfig } from '../services/solicitud-payments-service';

const PaymentMethodCard = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon: React.ElementType }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

export default function AdminPaymentsTab() {
  const [enabledInForm, setEnabledInForm] = useState(false);
  const [config, setConfig] = useState<GlobalPaymentConfig>(initialPaymentConfig);
  const [hotmartLinks, setHotmartLinks] = useState<HotmartPlanLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/solicitudes-negocio/admin/payment-methods')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setEnabledInForm(data.enabledInForm ?? false);
          setConfig(data.config || initialPaymentConfig);
          setHotmartLinks(data.hotmartLinks || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleConfigChange = (method: keyof GlobalPaymentConfig, newConfig: any) => {
    setConfig(prev => ({
      ...prev,
      [method]: newConfig,
    }));
  };

  const handleHotmartLinkChange = (planId: string, value: string) => {
    setHotmartLinks(prev => prev.map(p => p.planId === planId ? { ...p, hotmartUrl: value } : p));
  };

  const handleHotmartEnabledChange = (planId: string, value: boolean) => {
    setHotmartLinks(prev => prev.map(p => p.planId === planId ? { ...p, enabled: value } : p));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledInForm, config, hotmartLinks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: 'Configuración de pagos de solicitudes guardada con éxito.' });
      setTimeout(() => setMessage(null), 3500);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error al guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportGlobal = async () => {
    if (!confirm('¿Deseas importar la configuración actual de Pasarelas Globales como punto de partida? Esto no afectará las pasarelas globales.')) return;
    setIsImporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importGlobal: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnabledInForm(data.data.enabledInForm);
      setConfig(data.data.config);
      setHotmartLinks(data.data.hotmartLinks);
      setMessage({ type: 'success', text: 'Datos importados correctamente. Ahora son independientes del panel global.' });
      setTimeout(() => setMessage(null), 3500);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error al importar.' });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de control principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Switch
              id="payment-module-switch"
              checked={enabledInForm}
              onCheckedChange={setEnabledInForm}
            />
            <Label htmlFor="payment-module-switch" className="font-bold text-sm cursor-pointer">
              Mostrar métodos de pago en el formulario público (/registro-negocio)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-11">
            Si está desactivado, el formulario no mostrará opciones de pago ni códigos QR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImportGlobal}
            disabled={isImporting || isSaving}
            className="text-xs flex items-center gap-1.5"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Importar desde pasarelas globales
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar Métodos de Pago
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Grid Réplica Idéntica */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <PaymentMethodCard title="Wompi (Híbrido)" icon={Wallet}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-wompi-enabled" checked={config.wompi?.enabled || false} onCheckedChange={checked => handleConfigChange('wompi', { ...config.wompi, enabled: checked })} />
              <Label htmlFor="sol-wompi-enabled">Habilitar Wompi</Label>
            </div>
            {config.wompi?.enabled && <WompiForm data={config.wompi} setData={(data) => handleConfigChange('wompi', data)} />}
          </PaymentMethodCard>

          <PaymentMethodCard title="Nequi (QR)" icon={Smartphone}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-nequi-enabled" checked={config.nequi.enabled} onCheckedChange={checked => handleConfigChange('nequi', { ...config.nequi, enabled: checked })} />
              <Label htmlFor="sol-nequi-enabled">Habilitar Nequi</Label>
            </div>
            {config.nequi.enabled && <QRForm methodName="Nequi" data={{ ...config.nequi, accountNumber: config.nequi.accountNumber ?? '', holderName: config.nequi.holderName ?? '', qrImageUrl: config.nequi.qrImageUrl ?? null, instructions: config.nequi.instructions ?? '' }} setData={(data) => handleConfigChange('nequi', data)} accountLabel="Número de Teléfono" />}
          </PaymentMethodCard>

          <PaymentMethodCard title="Bancolombia" icon={Building}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-bancolombia-enabled" checked={config.bancolombia.enabled} onCheckedChange={checked => handleConfigChange('bancolombia', { ...config.bancolombia, enabled: checked })} />
              <Label htmlFor="sol-bancolombia-enabled">Habilitar Bancolombia</Label>
            </div>
            {config.bancolombia.enabled && <QRForm methodName="Bancolombia" data={{ ...config.bancolombia, accountNumber: config.bancolombia.accountNumber ?? '', holderName: config.bancolombia.holderName ?? '', qrImageUrl: config.bancolombia.qrImageUrl ?? null, instructions: config.bancolombia.instructions ?? '' }} setData={(data) => handleConfigChange('bancolombia', data)} accountLabel="Número de Cuenta" />}
          </PaymentMethodCard>

          <PaymentMethodCard title="Daviplata" icon={Smartphone}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-daviplata-enabled" checked={config.daviplata.enabled} onCheckedChange={checked => handleConfigChange('daviplata', { ...config.daviplata, enabled: checked })} />
              <Label htmlFor="sol-daviplata-enabled">Habilitar Daviplata</Label>
            </div>
            {config.daviplata.enabled && <QRForm methodName="Daviplata" data={{ ...config.daviplata, accountNumber: config.daviplata.accountNumber ?? '', holderName: config.daviplata.holderName ?? '', qrImageUrl: config.daviplata.qrImageUrl ?? null, instructions: config.daviplata.instructions ?? '' }} setData={(data) => handleConfigChange('daviplata', data)} accountLabel="Número de Teléfono" />}
          </PaymentMethodCard>

          <PaymentMethodCard title="BRE-B" icon={Building2}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-breb-enabled" checked={config.breB.enabled} onCheckedChange={checked => handleConfigChange('breB', { ...config.breB, enabled: checked })} />
              <Label htmlFor="sol-breb-enabled">Habilitar BRE-B</Label>
            </div>
            {config.breB.enabled && <BreBForm data={config.breB} setData={(data) => handleConfigChange('breB', data)} />}
          </PaymentMethodCard>

          <PaymentMethodCard title="Stripe" icon={CreditCard}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-stripe-enabled" checked={config.stripe.enabled} onCheckedChange={checked => handleConfigChange('stripe', { ...config.stripe, enabled: checked })} />
              <Label htmlFor="sol-stripe-enabled">Habilitar Stripe</Label>
            </div>
            {config.stripe.enabled && <ApiGatewayForm data={config.stripe} setData={(data) => handleConfigChange('stripe', data)} fields={['secretKey']} showWebhookSecret={true} />}
          </PaymentMethodCard>

          <PaymentMethodCard title="PayPal" icon={DollarSign}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-paypal-enabled" checked={config.paypal.enabled} onCheckedChange={checked => handleConfigChange('paypal', { ...config.paypal, enabled: checked })} />
              <Label htmlFor="sol-paypal-enabled">Habilitar PayPal</Label>
            </div>
            {config.paypal.enabled && <ApiGatewayForm data={config.paypal} setData={(data) => handleConfigChange('paypal', data)} fields={['clientId', 'clientSecret']} />}
          </PaymentMethodCard>

          <PaymentMethodCard title="Mercado Pago" icon={Store}>
            <div className="flex items-center space-x-2">
              <Switch id="sol-mercadopago-enabled" checked={config.mercadoPago.enabled} onCheckedChange={checked => handleConfigChange('mercadoPago', { ...config.mercadoPago, enabled: checked })} />
              <Label htmlFor="sol-mercadopago-enabled">Habilitar Mercado Pago</Label>
            </div>
            {config.mercadoPago.enabled && <ApiGatewayForm data={config.mercadoPago} setData={(data) => handleConfigChange('mercadoPago', data)} fields={['publicKey', 'accessToken']} />}
          </PaymentMethodCard>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enlaces de Pago de Hotmart</CardTitle>
              <CardDescription className="text-xs">Configura los links de checkout de tus planes para solicitudes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hotmartLinks.length > 0 ? (
                hotmartLinks.map(plan => (
                  <div key={plan.planId} className="p-3.5 border border-border rounded-xl space-y-2.5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`sol-hotmart-${plan.planId}`} className="font-bold text-xs truncate pr-2">{plan.planName}</Label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">{plan.enabled ? 'Activa' : 'Inactiva'}</span>
                        <Switch
                          id={`sol-hotmart-switch-${plan.planId}`}
                          checked={plan.enabled}
                          onCheckedChange={(checked) => handleHotmartEnabledChange(plan.planId, checked)}
                        />
                      </div>
                    </div>
                    <Input
                      id={`sol-hotmart-${plan.planId}`}
                      placeholder="https://pay.hotmart.com/..."
                      value={plan.hotmartUrl}
                      onChange={e => handleHotmartLinkChange(plan.planId, e.target.value)}
                      className="text-xs h-9"
                      disabled={!plan.enabled}
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground mb-3">No hay planes cargados aún.</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleImportGlobal} className="text-xs">
                    Importar planes globales
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
