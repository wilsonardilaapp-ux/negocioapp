const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('APLICANDO MÉTODOS DE PAGO A SOLICITUDES');
console.log('==============================================');

// 1. Directorios nuevos
const dirs = [
  'src/app/api/solicitudes-negocio/payment-methods',
  'src/app/api/solicitudes-negocio/admin/payment-methods'
];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 2. types-payments.ts
const typesPaymentsContent = `import type { GlobalPaymentConfig, HotmartPlanLink } from '@/models/global-payment-config';

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
`;
fs.writeFileSync('src/modules/solicitudes-negocio/types-payments.ts', typesPaymentsContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/types-payments.ts');

// 3. solicitud-payments-service.ts
const paymentsServiceContent = `import { getAdminFirestore } from '@/firebase/server-init';
import type { GlobalPaymentConfig, HotmartPlanLink } from '@/models/global-payment-config';
import type { SolicitudPaymentConfig, PublicPaymentMethodData } from '../types-payments';

const SOLICITUD_PAYMENTS_DOC = 'solicitud_payment_methods/main';
const GLOBAL_PAYMENTS_DOC = 'globalConfig/payment_methods';

export const initialPaymentConfig: GlobalPaymentConfig = {
  nequi: { enabled: false, accountNumber: '', holderName: '', instructions: '', qrImageUrl: null },
  bancolombia: { enabled: false, accountNumber: '', holderName: '', instructions: '', qrImageUrl: null },
  daviplata: { enabled: false, accountNumber: '', holderName: '', instructions: '', qrImageUrl: null },
  breB: { enabled: false, holderName: '', keyType: 'Celular', keyValue: '', instructions: '', qrImageUrl: null, commerceCode: '' },
  stripe: { enabled: false, mode: 'sandbox', secretKey: '', instructions: '', checkoutUrl: '', webhookUrl: '', webhookSecret: '' },
  paypal: { enabled: false, mode: 'sandbox', clientId: '', clientSecret: '', instructions: '', checkoutUrl: '', webhookUrl: '' },
  mercadoPago: { enabled: false, mode: 'sandbox', publicKey: '', accessToken: '', instructions: '', checkoutUrl: '', webhookUrl: '' },
  wompi: { enabled: false, checkoutUrl: '', qrImageUrl: null, accountNumber: '', holderName: '', instructions: '' },
};

export async function getSolicitudPaymentConfig(): Promise<SolicitudPaymentConfig> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.doc(SOLICITUD_PAYMENTS_DOC).get();
    if (!snap.exists) {
      return {
        enabledInForm: false,
        config: initialPaymentConfig,
        hotmartLinks: []
      };
    }
    const data = snap.data() as any;
    return {
      enabledInForm: data.enabledInForm ?? false,
      config: { ...initialPaymentConfig, ...(data.config || {}) },
      hotmartLinks: Array.isArray(data.hotmartLinks) ? data.hotmartLinks : []
    };
  } catch (err) {
    console.error('Error al leer solicitud_payment_methods:', err);
    return { enabledInForm: false, config: initialPaymentConfig, hotmartLinks: [] };
  }
}

export async function saveSolicitudPaymentConfig(payload: Partial<SolicitudPaymentConfig>): Promise<SolicitudPaymentConfig> {
  const db = await getAdminFirestore();
  const current = await getSolicitudPaymentConfig();
  const updated: SolicitudPaymentConfig = {
    enabledInForm: payload.enabledInForm ?? current.enabledInForm,
    config: payload.config ? { ...current.config, ...payload.config } : current.config,
    hotmartLinks: payload.hotmartLinks !== undefined ? payload.hotmartLinks : current.hotmartLinks,
    updatedAt: new Date().toISOString()
  };
  await db.doc(SOLICITUD_PAYMENTS_DOC).set(updated, { merge: true });
  return updated;
}

export async function importFromGlobalPaymentConfig(): Promise<SolicitudPaymentConfig> {
  const db = await getAdminFirestore();
  const globalSnap = await db.doc(GLOBAL_PAYMENTS_DOC).get();
  const globalData = globalSnap.exists ? (globalSnap.data() as GlobalPaymentConfig) : initialPaymentConfig;

  // Leer planes para enlaces de hotmart
  const hotmartLinks: HotmartPlanLink[] = [];
  try {
    const plansSnap = await db.collection('plans').get();
    plansSnap.forEach(docSnap => {
      const p = docSnap.data();
      hotmartLinks.push({
        planId: docSnap.id,
        planName: p.name || 'Plan Estándar',
        hotmartUrl: p.hotmartUrl || '',
        enabled: p.hotmartEnabled ?? !!p.hotmartUrl
      });
    });

    const hybSnap = await db.collection('hybrid_plans').get();
    hybSnap.forEach(docSnap => {
      const p = docSnap.data();
      hotmartLinks.push({
        planId: docSnap.id,
        planName: \`\${p.name || 'Plan Híbrido'} (Híbrido)\`,
        hotmartUrl: p.hotmartUrl || '',
        enabled: p.hotmartEnabled ?? !!p.hotmartUrl
      });
    });
  } catch (e) {
    console.warn('Error leyendo planes para Hotmart:', e);
  }

  const newConfig: SolicitudPaymentConfig = {
    enabledInForm: true,
    config: { ...initialPaymentConfig, ...globalData },
    hotmartLinks,
    updatedAt: new Date().toISOString()
  };

  await db.doc(SOLICITUD_PAYMENTS_DOC).set(newConfig);
  return newConfig;
}

export async function getPublicPaymentMethods(): Promise<PublicPaymentMethodData> {
  const full = await getSolicitudPaymentConfig();
  if (!full.enabledInForm) {
    return { enabledInForm: false, methods: {}, hotmartLinks: [] };
  }

  const c = full.config;
  const methods: PublicPaymentMethodData['methods'] = {};

  if (c.wompi?.enabled) {
    methods.wompi = {
      enabled: true,
      checkoutUrl: c.wompi.checkoutUrl,
      qrImageUrl: c.wompi.qrImageUrl,
      accountNumber: c.wompi.accountNumber,
      holderName: c.wompi.holderName,
      instructions: c.wompi.instructions
    };
  }

  if (c.nequi?.enabled) {
    methods.nequi = {
      enabled: true,
      accountNumber: c.nequi.accountNumber,
      holderName: c.nequi.holderName,
      instructions: c.nequi.instructions,
      qrImageUrl: c.nequi.qrImageUrl
    };
  }

  if (c.bancolombia?.enabled) {
    methods.bancolombia = {
      enabled: true,
      accountNumber: c.bancolombia.accountNumber,
      holderName: c.bancolombia.holderName,
      instructions: c.bancolombia.instructions,
      qrImageUrl: c.bancolombia.qrImageUrl
    };
  }

  if (c.daviplata?.enabled) {
    methods.daviplata = {
      enabled: true,
      accountNumber: c.daviplata.accountNumber,
      holderName: c.daviplata.holderName,
      instructions: c.daviplata.instructions,
      qrImageUrl: c.daviplata.qrImageUrl
    };
  }

  if (c.breB?.enabled) {
    methods.breB = {
      enabled: true,
      holderName: c.breB.holderName,
      keyType: c.breB.keyType,
      keyValue: c.breB.keyValue,
      instructions: c.breB.instructions,
      qrImageUrl: c.breB.qrImageUrl
    };
  }

  if (c.stripe?.enabled) {
    methods.stripe = { enabled: true, checkoutUrl: c.stripe.checkoutUrl, instructions: c.stripe.instructions };
  }
  if (c.paypal?.enabled) {
    methods.paypal = { enabled: true, checkoutUrl: c.paypal.checkoutUrl, instructions: c.paypal.instructions };
  }
  if (c.mercadoPago?.enabled) {
    methods.mercadoPago = { enabled: true, checkoutUrl: c.mercadoPago.checkoutUrl, instructions: c.mercadoPago.instructions };
  }

  const hotmartLinks = (full.hotmartLinks || []).filter(h => h.enabled && h.hotmartUrl);

  return {
    enabledInForm: true,
    methods,
    hotmartLinks
  };
}
`;
fs.writeFileSync('src/modules/solicitudes-negocio/services/solicitud-payments-service.ts', paymentsServiceContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/services/solicitud-payments-service.ts');

// 4. API Pública: /api/solicitudes-negocio/payment-methods
const publicApiContent = `import { NextResponse } from 'next/server';
import { getPublicPaymentMethods } from '@/modules/solicitudes-negocio/services/solicitud-payments-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublicPaymentMethods();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error cargando métodos de pago' }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/payment-methods/route.ts', publicApiContent, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/payment-methods/route.ts');

// 5. API Admin: /api/solicitudes-negocio/admin/payment-methods
const adminApiContent = `import { NextRequest, NextResponse } from 'next/server';
import { 
  getSolicitudPaymentConfig, 
  saveSolicitudPaymentConfig, 
  importFromGlobalPaymentConfig 
} from '@/modules/solicitudes-negocio/services/solicitud-payments-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSolicitudPaymentConfig();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error cargando configuración' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.importGlobal) {
      const imported = await importFromGlobalPaymentConfig();
      return NextResponse.json({ success: true, data: imported, message: 'Configuración importada desde pasarelas globales.' });
    }

    const saved = await saveSolicitudPaymentConfig(body);
    return NextResponse.json({ success: true, data: saved, message: 'Configuración de pagos guardada con éxito.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al guardar configuración' }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/admin/payment-methods/route.ts', adminApiContent, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/admin/payment-methods/route.ts');

// 6. Componente AdminPaymentsTab
const adminTabContent = `'use client';

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
        <div className={\`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border \${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-destructive/10 border-destructive/20 text-destructive'}\`}>
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
                      <Label htmlFor={\`sol-hotmart-\${plan.planId}\`} className="font-bold text-xs truncate pr-2">{plan.planName}</Label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">{plan.enabled ? 'Activa' : 'Inactiva'}</span>
                        <Switch
                          id={\`sol-hotmart-switch-\${plan.planId}\`}
                          checked={plan.enabled}
                          onCheckedChange={(checked) => handleHotmartEnabledChange(plan.planId, checked)}
                        />
                      </div>
                    </div>
                    <Input
                      id={\`sol-hotmart-\${plan.planId}\`}
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
`;
fs.writeFileSync('src/modules/solicitudes-negocio/components/admin-payments-tab.tsx', adminTabContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/components/admin-payments-tab.tsx');

// 7. Componente Público: public-payment-block.tsx
const publicPaymentBlockContent = `'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, QrCode, ExternalLink, ShieldCheck, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import type { PublicPaymentMethodData } from '../types-payments';

export default function PublicPaymentBlock() {
  const [data, setData] = useState<PublicPaymentMethodData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/solicitudes-negocio/payment-methods')
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.enabledInForm) {
          setData(resData);
          // Seleccionar el primer método disponible por defecto
          const available = Object.keys(resData.methods || {});
          if (available.length > 0) setSelectedMethod(available[0]);
          else if (resData.hotmartLinks?.length > 0) setSelectedMethod('hotmart');
        }
      })
      .catch(console.error);
  }, []);

  if (!data || !data.enabledInForm) return null;

  const hasMethods = Object.keys(data.methods || {}).length > 0 || (data.hotmartLinks && data.hotmartLinks.length > 0);
  if (!hasMethods) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Métodos de Pago Disponibles</h2>
            <p className="text-xs text-muted-foreground">Opciones habilitadas para formalizar o activar tu cuenta</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" /> Pago Seguro
        </div>
      </div>

      {/* Selector de métodos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {data.methods.nequi && (
          <button
            type="button"
            onClick={() => setSelectedMethod('nequi')}
            className={\`p-3 rounded-xl border text-center transition-all \${selectedMethod === 'nequi' ? 'border-primary bg-primary/5 font-bold shadow-sm' : 'border-border hover:bg-muted/50 text-muted-foreground'}\`}
          >
            <p className="text-xs">Nequi (QR)</p>
          </button>
        )}
        {data.methods.bancolombia && (
          <button
            type="button"
            onClick={() => setSelectedMethod('bancolombia')}
            className={\`p-3 rounded-xl border text-center transition-all \${selectedMethod === 'bancolombia' ? 'border-primary bg-primary/5 font-bold shadow-sm' : 'border-border hover:bg-muted/50 text-muted-foreground'}\`}
          >
            <p className="text-xs">Bancolombia</p>
          </button>
        )}
        {data.methods.daviplata && (
          <button
            type="button"
            onClick={() => setSelectedMethod('daviplata')}
            className={\`p-3 rounded-xl border text-center transition-all \${selectedMethod === 'daviplata' ? 'border-primary bg-primary/5 font-bold shadow-sm' : 'border-border hover:bg-muted/50 text-muted-foreground'}\`}
          >
            <p className="text-xs">Daviplata</p>
          </button>
        )}
        {data.methods.wompi && (
          <button
            type="button"
            onClick={() => setSelectedMethod('wompi')}
            className={\`p-3 rounded-xl border text-center transition-all \${selectedMethod === 'wompi' ? 'border-primary bg-primary/5 font-bold shadow-sm' : 'border-border hover:bg-muted/50 text-muted-foreground'}\`}
          >
            <p className="text-xs">Wompi</p>
          </button>
        )}
        {data.methods.breB && (
          <button
            type="button"
            onClick={() => setSelectedMethod('breB')}
            className={\`p-3 rounded-xl border text-center transition-all \${selectedMethod === 'breB' ? 'border-primary bg-primary/5 font-bold shadow-sm' : 'border-border hover:bg-muted/50 text-muted-foreground'}\`}
          >
            <p className="text-xs">BRE-B</p>
          </button>
        )}
        {data.hotmartLinks && data.hotmartLinks.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedMethod('hotmart')}
            className={\`p-3 rounded-xl border text-center transition-all \${selectedMethod === 'hotmart' ? 'border-primary bg-primary/5 font-bold shadow-sm' : 'border-border hover:bg-muted/50 text-muted-foreground'}\`}
          >
            <p className="text-xs">Hotmart ({data.hotmartLinks.length})</p>
          </button>
        )}
      </div>

      {/* Detalle del método seleccionado */}
      <div className="p-5 rounded-xl bg-muted/30 border border-border">
        {selectedMethod === 'nequi' && data.methods.nequi && (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {data.methods.nequi.qrImageUrl ? (
              <img src={data.methods.nequi.qrImageUrl} alt="QR Nequi" className="w-36 h-36 object-contain rounded-lg border bg-white p-2 shadow-sm" />
            ) : (
              <div className="w-36 h-36 flex flex-col items-center justify-center bg-muted rounded-lg border text-muted-foreground text-xs p-2 text-center">
                <QrCode className="w-8 h-8 mb-1" />
                <span>Escanea desde tu App Nequi</span>
              </div>
            )}
            <div className="space-y-1.5 text-xs text-center sm:text-left">
              <p className="font-bold text-sm text-foreground">Pago por Nequi</p>
              {data.methods.nequi.accountNumber && <p><strong>Teléfono:</strong> <span className="font-mono text-sm">{data.methods.nequi.accountNumber}</span></p>}
              {data.methods.nequi.holderName && <p><strong>Titular:</strong> {data.methods.nequi.holderName}</p>}
              {data.methods.nequi.instructions && <p className="text-muted-foreground mt-2">{data.methods.nequi.instructions}</p>}
            </div>
          </div>
        )}

        {selectedMethod === 'bancolombia' && data.methods.bancolombia && (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {data.methods.bancolombia.qrImageUrl && (
              <img src={data.methods.bancolombia.qrImageUrl} alt="QR Bancolombia" className="w-36 h-36 object-contain rounded-lg border bg-white p-2 shadow-sm" />
            )}
            <div className="space-y-1.5 text-xs text-center sm:text-left">
              <p className="font-bold text-sm text-foreground">Cuenta Bancolombia</p>
              {data.methods.bancolombia.accountNumber && <p><strong>Número de Cuenta:</strong> <span className="font-mono text-sm">{data.methods.bancolombia.accountNumber}</span></p>}
              {data.methods.bancolombia.holderName && <p><strong>Titular:</strong> {data.methods.bancolombia.holderName}</p>}
              {data.methods.bancolombia.instructions && <p className="text-muted-foreground mt-2">{data.methods.bancolombia.instructions}</p>}
            </div>
          </div>
        )}

        {selectedMethod === 'daviplata' && data.methods.daviplata && (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {data.methods.daviplata.qrImageUrl && (
              <img src={data.methods.daviplata.qrImageUrl} alt="QR Daviplata" className="w-36 h-36 object-contain rounded-lg border bg-white p-2 shadow-sm" />
            )}
            <div className="space-y-1.5 text-xs text-center sm:text-left">
              <p className="font-bold text-sm text-foreground">Pago por Daviplata</p>
              {data.methods.daviplata.accountNumber && <p><strong>Teléfono:</strong> <span className="font-mono text-sm">{data.methods.daviplata.accountNumber}</span></p>}
              {data.methods.daviplata.holderName && <p><strong>Titular:</strong> {data.methods.daviplata.holderName}</p>}
              {data.methods.daviplata.instructions && <p className="text-muted-foreground mt-2">{data.methods.daviplata.instructions}</p>}
            </div>
          </div>
        )}

        {selectedMethod === 'wompi' && data.methods.wompi && (
          <div className="space-y-3 text-xs">
            <p className="font-bold text-sm text-foreground">Pasarela Wompi</p>
            {data.methods.wompi.instructions && <p className="text-muted-foreground">{data.methods.wompi.instructions}</p>}
            {data.methods.wompi.checkoutUrl && (
              <a
                href={data.methods.wompi.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:opacity-90"
              >
                Pagar con Wompi <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {selectedMethod === 'breB' && data.methods.breB && (
          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-sm text-foreground">Transferencia BRE-B</p>
            {data.methods.breB.holderName && <p><strong>Titular:</strong> {data.methods.breB.holderName}</p>}
            {data.methods.breB.keyType && <p><strong>Tipo de Llave:</strong> {data.methods.breB.keyType}</p>}
            {data.methods.breB.keyValue && <p><strong>Llave:</strong> <span className="font-mono">{data.methods.breB.keyValue}</span></p>}
            {data.methods.breB.instructions && <p className="text-muted-foreground mt-2">{data.methods.breB.instructions}</p>}
          </div>
        )}

        {selectedMethod === 'hotmart' && data.hotmartLinks && (
          <div className="space-y-3">
            <p className="font-bold text-sm text-foreground">Checkout Oficial en Hotmart</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.hotmartLinks.map(plan => (
                <a
                  key={plan.planId}
                  href={plan.hotmartUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-lg border border-border bg-background hover:border-primary flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-semibold text-foreground">{plan.planName}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/modules/solicitudes-negocio/components/public-payment-block.tsx', publicPaymentBlockContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/components/public-payment-block.tsx');

// 8. Integrar pestaña en admin-editor.tsx con respaldo .bak
const editorPath = 'src/modules/solicitudes-negocio/components/admin-editor.tsx';
fs.copyFileSync(editorPath, editorPath + '.bak');
console.log('[BACKUP OK] Creado: ' + editorPath + '.bak');

let editorContent = fs.readFileSync(editorPath, 'utf8');
if (!editorContent.includes('AdminPaymentsTab')) {
  // Imports
  editorContent = editorContent.replace(
    "import PublicForm from './public-form';",
    "import PublicForm from './public-form';\nimport AdminPaymentsTab from './admin-payments-tab';"
  );
  editorContent = editorContent.replace(
    'ExternalLink',
    'ExternalLink, CreditCard'
  );

  // Tab state
  editorContent = editorContent.replace(
    "<\\'general\\' | \\'branding\\' | \\'blocks\\' | \\'categories\\' | \\'preview\\'>",
    "<'general' | 'branding' | 'blocks' | 'categories' | 'payments' | 'preview'>"
  );
  editorContent = editorContent.replace(
    "<\\'general\\' | \\'branding\\' | \\'blocks\\' | \\'categories\\' | \\'preview\\'>",
    "<'general' | 'branding' | 'blocks' | 'categories' | 'payments' | 'preview'>"
  );

  // Tab buttons
  const catButtonTarget = '<ListTree className="w-3.5 h-3.5" /> Categorías ({config.categories?.length || 0})\n        </button>';
  const paymentButton = '\n        <button onClick={() => setActiveTab(\'payments\')} className={\'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap \' + (activeTab === \'payments\' ? \'bg-primary text-primary-foreground\' : \'hover:bg-muted text-muted-foreground\')}>\n          <CreditCard className="w-3.5 h-3.5" /> Métodos de Pago\n        </button>';
  editorContent = editorContent.replace(catButtonTarget, catButtonTarget + paymentButton);

  // Tab content
  const previewTabTarget = "{activeTab === 'preview' && (";
  const paymentsTabRender = "{activeTab === 'payments' && <AdminPaymentsTab />}\n\n      ";
  editorContent = editorContent.replace(previewTabTarget, paymentsTabRender + previewTabTarget);

  fs.writeFileSync(editorPath, editorContent, 'utf8');
  console.log('[APLICADO OK] Pestaña Métodos de Pago agregada a admin-editor.tsx');
}

// 9. Integrar bloque en public-form.tsx con respaldo .bak
const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
fs.copyFileSync(formPath, formPath + '.bak');
console.log('[BACKUP OK] Creado: ' + formPath + '.bak');

let formContent = fs.readFileSync(formPath, 'utf8');
if (!formContent.includes('PublicPaymentBlock')) {
  formContent = formContent.replace(
    "import React, { useState, useEffect, useId } from 'react';",
    "import React, { useState, useEffect, useId } from 'react';\nimport PublicPaymentBlock from './public-payment-block';"
  );

  const submitButtonMarker = '{/* BOTÓN DE ACCIÓN ACCESIBLE (>= 44px) */}';
  formContent = formContent.replace(
    submitButtonMarker,
    '/* BLOQUE MÉTODOS DE PAGO */}\n        <PublicPaymentBlock />\n\n        ' + submitButtonMarker
  );

  fs.writeFileSync(formPath, formContent, 'utf8');
  console.log('[APLICADO OK] Bloque de pagos agregado a public-form.tsx');
}

console.log('==============================================');
console.log('INTEGRACIÓN DE PAGOS COMPLETADA CON ÉXITO');
console.log('==============================================');
