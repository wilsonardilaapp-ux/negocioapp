"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2, Save, Building, Smartphone, Building2, Store, DollarSign } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { GlobalPaymentConfig, HotmartPlanLink } from '@/models/global-payment-config';
import QRForm from '@/components/pagos/qr-form';
import BreBForm from '@/components/pagos/breb-form';
import ApiGatewayForm from '@/components/pagos/api-gateway-form';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SubscriptionPlan } from '@/models/subscription-plan';

const initialConfig: GlobalPaymentConfig = {
    nequi: { enabled: false, accountNumber: '', accountHolder: '', instructions: '', qrImageUrl: null },
    bancolombia: { enabled: false, accountNumber: '', accountHolder: '', instructions: '', qrImageUrl: null },
    daviplata: { enabled: false, accountNumber: '', accountHolder: '', instructions: '', qrImageUrl: null },
    breB: { enabled: false, holderName: '', keyType: 'Celular', keyValue: '', instructions: '', qrImageUrl: null },
    stripe: { enabled: false, mode: 'sandbox', secretKey: '', instructions: '' },
    paypal: { enabled: false, mode: 'sandbox', clientId: '', clientSecret: '', instructions: '' },
    mercadoPago: { enabled: false, mode: 'sandbox', publicKey: '', accessToken: '', instructions: '' },
};

const PaymentMethodCard = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon: React.ElementType }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {children}
        </CardContent>
    </Card>
);

export default function PaymentMethodsPage() {
    const [config, setConfig] = useState<GlobalPaymentConfig>(initialConfig);
    const [hotmartLinks, setHotmartLinks] = useState<HotmartPlanLink[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const plansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'plans'), [firestore]);
    const { data: plans } = useCollection<SubscriptionPlan>(plansQuery);

    useEffect(() => {
        // Here you would fetch initial config and plans from Firestore
        // For now, we use the initial state and mock plan data.
        if (plans) {
            const initialLinks = plans.map(p => ({
                planId: p.id,
                planName: p.name,
                hotmartUrl: (p as any).hotmartUrl || '', // Assuming hotmartUrl is a field on the plan
            }));
            setHotmartLinks(initialLinks);
        }
    }, [plans]);

    const handleConfigChange = (method: keyof GlobalPaymentConfig, newConfig: any) => {
        setConfig(prev => ({
            ...prev,
            [method]: newConfig,
        }));
        setHasChanges(true);
    };

    const handleHotmartLinkChange = (planId: string, value: string) => {
        setHotmartLinks(prev => prev.map(p => p.planId === planId ? { ...p, hotmartUrl: value } : p));
        setHasChanges(true);
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate saving to Firestore
        setTimeout(() => {
            console.log("Saving config:", config);
            console.log("Saving Hotmart links:", hotmartLinks);
            // Here you would call a service to update Firestore documents
            toast({ title: 'Configuración Guardada', description: 'Las pasarelas de pago han sido actualizadas.' });
            setIsSaving(false);
            setHasChanges(false);
        }, 1500);
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Pasarelas de Pago Globales</h1>
                <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Configuración
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <PaymentMethodCard title="Nequi (QR)" icon={Smartphone}>
                        <div className="flex items-center space-x-2">
                            <Switch id="nequi-enabled" checked={config.nequi.enabled} onCheckedChange={checked => handleConfigChange('nequi', {...config.nequi, enabled: checked})} />
                            <Label htmlFor="nequi-enabled">Habilitar Nequi</Label>
                        </div>
                        {config.nequi.enabled && <QRForm methodName="Nequi" data={config.nequi} setData={(data) => handleConfigChange('nequi', data)} accountLabel="Número de Teléfono" />}
                    </PaymentMethodCard>
                    
                    <PaymentMethodCard title="Bancolombia" icon={Building}>
                        <div className="flex items-center space-x-2">
                            <Switch id="bancolombia-enabled" checked={config.bancolombia.enabled} onCheckedChange={checked => handleConfigChange('bancolombia', {...config.bancolombia, enabled: checked})} />
                            <Label htmlFor="bancolombia-enabled">Habilitar Bancolombia</Label>
                        </div>
                        {config.bancolombia.enabled && <QRForm methodName="Bancolombia" data={config.bancolombia} setData={(data) => handleConfigChange('bancolombia', data)} accountLabel="Número de Cuenta" />}
                    </PaymentMethodCard>

                    <PaymentMethodCard title="Daviplata" icon={Smartphone}>
                        <div className="flex items-center space-x-2">
                            <Switch id="daviplata-enabled" checked={config.daviplata.enabled} onCheckedChange={checked => handleConfigChange('daviplata', {...config.daviplata, enabled: checked})} />
                            <Label htmlFor="daviplata-enabled">Habilitar Daviplata</Label>
                        </div>
                        {config.daviplata.enabled && <QRForm methodName="Daviplata" data={config.daviplata} setData={(data) => handleConfigChange('daviplata', data)} accountLabel="Número de Teléfono" />}
                    </PaymentMethodCard>

                    <PaymentMethodCard title="BRE-B" icon={Building2}>
                        <div className="flex items-center space-x-2">
                            <Switch id="breb-enabled" checked={config.breB.enabled} onCheckedChange={checked => handleConfigChange('breB', {...config.breB, enabled: checked})} />
                            <Label htmlFor="breb-enabled">Habilitar BRE-B</Label>
                        </div>
                        {config.breB.enabled && <BreBForm data={config.breB} setData={(data) => handleConfigChange('breB', data)} />}
                    </PaymentMethodCard>

                    <PaymentMethodCard title="Stripe" icon={CreditCard}>
                        <div className="flex items-center space-x-2">
                            <Switch id="stripe-enabled" checked={config.stripe.enabled} onCheckedChange={checked => handleConfigChange('stripe', {...config.stripe, enabled: checked})} />
                            <Label htmlFor="stripe-enabled">Habilitar Stripe</Label>
                        </div>
                        {config.stripe.enabled && <ApiGatewayForm data={config.stripe} setData={(data) => handleConfigChange('stripe', data)} fields={['publicKey', 'secretKey']} />}
                    </PaymentMethodCard>

                    <PaymentMethodCard title="PayPal" icon={DollarSign}>
                        <div className="flex items-center space-x-2">
                            <Switch id="paypal-enabled" checked={config.paypal.enabled} onCheckedChange={checked => handleConfigChange('paypal', {...config.paypal, enabled: checked})} />
                            <Label htmlFor="paypal-enabled">Habilitar PayPal</Label>
                        </div>
                        {config.paypal.enabled && <ApiGatewayForm data={config.paypal} setData={(data) => handleConfigChange('paypal', data)} fields={['clientId', 'clientSecret']} />}
                    </PaymentMethodCard>
                    
                    <PaymentMethodCard title="Mercado Pago" icon={Store}>
                         <div className="flex items-center space-x-2">
                            <Switch id="mercadopago-enabled" checked={config.mercadoPago.enabled} onCheckedChange={checked => handleConfigChange('mercadoPago', {...config.mercadoPago, enabled: checked})} />
                            <Label htmlFor="mercadopago-enabled">Habilitar Mercado Pago</Label>
                        </div>
                        {config.mercadoPago.enabled && <ApiGatewayForm data={config.mercadoPago} setData={(data) => handleConfigChange('mercadoPago', data)} fields={['publicKey', 'accessToken']} />}
                    </PaymentMethodCard>
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Enlaces de Pago de Hotmart</CardTitle>
                            <CardDescription>Configura los links de checkout para cada plan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {hotmartLinks.map(plan => (
                                <div key={plan.planId}>
                                    <Label htmlFor={`hotmart-${plan.planId}`}>{plan.planName}</Label>
                                    <Input id={`hotmart-${plan.planId}`} placeholder="https://pay.hotmart.com/..." value={plan.hotmartUrl} onChange={e => handleHotmartLinkChange(plan.planId, e.target.value)} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
