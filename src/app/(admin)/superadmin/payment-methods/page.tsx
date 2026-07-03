"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2, Save, Building, Smartphone, Building2, Store, DollarSign, Wallet } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { GlobalPaymentConfig, HotmartPlanLink, WompiConfig } from '@/models/global-payment-config';
import QRForm from '@/components/pagos/qr-form';
import BreBForm from '@/components/pagos/breb-form';
import WompiForm from '@/components/pagos/wompi-form';
import ApiGatewayForm from '@/components/pagos/api-gateway-form';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { HybridPlan } from '@/models/hybrid-plan';

const initialConfig: GlobalPaymentConfig = {
    nequi: { enabled: false, accountNumber: '', holderName: '', instructions: '', qrImageUrl: null },
    bancolombia: { enabled: false, accountNumber: '', holderName: '', instructions: '', qrImageUrl: null },
    daviplata: { enabled: false, accountNumber: '', holderName: '', instructions: '', qrImageUrl: null },
    breB: { enabled: false, holderName: '', keyType: 'Celular', keyValue: '', instructions: '', qrImageUrl: null, commerceCode: '' },
    stripe: { enabled: false, mode: 'sandbox', secretKey: '', instructions: '', checkoutUrl: '', webhookUrl: '', webhookSecret: '' },
    paypal: { enabled: false, mode: 'sandbox', clientId: '', clientSecret: '', instructions: '', checkoutUrl: '', webhookUrl: '' },
    mercadoPago: { enabled: false, mode: 'sandbox', publicKey: '', accessToken: '', instructions: '', checkoutUrl: '', webhookUrl: '' },
    wompi: { enabled: false, checkoutUrl: '', qrImageUrl: null, accountNumber: '', holderName: '', instructions: '' },
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

    const paymentConfigDocRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'payment_methods'), [firestore]);
    const { data: savedConfig, isLoading: isConfigLoading } = useDoc<GlobalPaymentConfig>(paymentConfigDocRef);

    const plansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'plans'), [firestore]);
    const { data: plans, isLoading: plansLoading } = useCollection<SubscriptionPlan>(plansQuery);

    const hybridPlansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'hybrid_plans'), [firestore]);
    const { data: hybridPlans, isLoading: hybridPlansLoading } = useCollection<HybridPlan>(hybridPlansQuery);

    useEffect(() => {
        if (savedConfig) {
            const mergedConfig: GlobalPaymentConfig = {
                nequi: { ...initialConfig.nequi, ...savedConfig.nequi },
                bancolombia: { ...initialConfig.bancolombia, ...savedConfig.bancolombia },
                daviplata: { ...initialConfig.daviplata, ...savedConfig.daviplata },
                breB: { ...initialConfig.breB, ...savedConfig.breB },
                stripe: { ...initialConfig.stripe, ...savedConfig.stripe },
                paypal: { ...initialConfig.paypal, ...savedConfig.paypal },
                mercadoPago: { ...initialConfig.mercadoPago, ...savedConfig.mercadoPago },
                wompi: { ...initialConfig.wompi, ...(savedConfig.wompi || {}) },
            };
            setConfig(mergedConfig);
        }
    }, [savedConfig]);

    useEffect(() => {
        const combinedLinks: HotmartPlanLink[] = [];
        
        if (plans) {
            plans.forEach(p => {
                combinedLinks.push({
                    planId: p.id,
                    planName: p.name,
                    hotmartUrl: p.hotmartUrl || '',
                    enabled: p.hotmartEnabled ?? !!p.hotmartUrl,
                });
            });
        }
        
        if (hybridPlans) {
            hybridPlans.forEach(p => {
                if (p.id) {
                    combinedLinks.push({
                        planId: p.id,
                        planName: `${p.name} (Híbrido)`,
                        hotmartUrl: p.hotmartUrl || '',
                        enabled: p.hotmartEnabled ?? !!p.hotmartUrl,
                    });
                }
            });
        }
        
        setHotmartLinks(combinedLinks);
    }, [plans, hybridPlans]);

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

    const handleHotmartEnabledChange = (planId: string, value: boolean) => {
        setHotmartLinks(prev => prev.map(p => p.planId === planId ? { ...p, enabled: value } : p));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo conectar a la base de datos." });
            return;
        }
        setIsSaving(true);
        
        try {
            if (paymentConfigDocRef) {
                setDocumentNonBlocking(paymentConfigDocRef, config, { merge: true });
            }

            const batch = writeBatch(firestore);
            hotmartLinks.forEach(link => {
                const stdPlan = plans?.find(p => p.id === link.planId);
                if (stdPlan) {
                    const hasUrlChanged = link.hotmartUrl !== stdPlan.hotmartUrl;
                    const hasEnabledChanged = link.enabled !== stdPlan.hotmartEnabled;
                    if (hasUrlChanged || hasEnabledChanged) {
                        batch.update(doc(firestore, 'plans', link.planId), { 
                            hotmartUrl: link.hotmartUrl,
                            hotmartEnabled: link.enabled 
                        });
                    }
                    return;
                }
                
                const hybPlan = hybridPlans?.find(p => p.id === link.planId);
                if (hybPlan) {
                    const hasUrlChanged = link.hotmartUrl !== hybPlan.hotmartUrl;
                    const hasEnabledChanged = link.enabled !== hybPlan.hotmartEnabled;
                    if (hasUrlChanged || hasEnabledChanged) {
                        batch.update(doc(firestore, 'hybrid_plans', link.planId), { 
                            hotmartUrl: link.hotmartUrl,
                            hotmartEnabled: link.enabled 
                        });
                    }
                    return;
                }
            });
            await batch.commit();

            toast({ title: 'Configuración Guardada', description: 'Las pasarelas de pago y enlaces de Hotmart han sido actualizados.' });
            setHasChanges(false);

        } catch (error) {
            console.error("Error saving payment settings:", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron guardar los cambios. Inténtalo de nuevo." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = isConfigLoading || plansLoading || hybridPlansLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Cargando configuraciones...</p>
            </div>
        );
    }
    
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
                    <PaymentMethodCard title="Wompi (Híbrido)" icon={Wallet}>
                        <div className="flex items-center space-x-2">
                            <Switch id="wompi-enabled" checked={config.wompi?.enabled || false} onCheckedChange={checked => handleConfigChange('wompi', {...config.wompi, enabled: checked})} />
                            <Label htmlFor="wompi-enabled">Habilitar Wompi</Label>
                        </div>
                        {config.wompi?.enabled && <WompiForm data={config.wompi} setData={(data) => handleConfigChange('wompi', data)} />}
                    </PaymentMethodCard>

                    <PaymentMethodCard title="Nequi (QR)" icon={Smartphone}>
                        <div className="flex items-center space-x-2">
                            <Switch id="nequi-enabled" checked={config.nequi.enabled} onCheckedChange={checked => handleConfigChange('nequi', {...config.nequi, enabled: checked})} />
                            <Label htmlFor="nequi-enabled">Habilitar Nequi</Label>
                        </div>
                        {config.nequi.enabled && <QRForm methodName="Nequi" data={{...config.nequi, accountNumber: config.nequi.accountNumber ?? '', holderName: config.nequi.holderName ?? '', qrImageUrl: config.nequi.qrImageUrl ?? null, instructions: config.nequi.instructions ?? ''}} setData={(data) => handleConfigChange('nequi', data)} accountLabel="Número de Teléfono" />}
                    </PaymentMethodCard>
                    
                    <PaymentMethodCard title="Bancolombia" icon={Building}>
                        <div className="flex items-center space-x-2">
                            <Switch id="bancolombia-enabled" checked={config.bancolombia.enabled} onCheckedChange={checked => handleConfigChange('bancolombia', {...config.bancolombia, enabled: checked})} />
                            <Label htmlFor="bancolombia-enabled">Habilitar Bancolombia</Label>
                        </div>
                        {config.bancolombia.enabled && <QRForm methodName="Bancolombia" data={{...config.bancolombia, accountNumber: config.bancolombia.accountNumber ?? '', holderName: config.bancolombia.holderName ?? '', qrImageUrl: config.bancolombia.qrImageUrl ?? null, instructions: config.bancolombia.instructions ?? ''}} setData={(data) => handleConfigChange('bancolombia', data)} accountLabel="Número de Cuenta" />}
                    </PaymentMethodCard>

                    <PaymentMethodCard title="Daviplata" icon={Smartphone}>
                        <div className="flex items-center space-x-2">
                            <Switch id="daviplata-enabled" checked={config.daviplata.enabled} onCheckedChange={checked => handleConfigChange('daviplata', {...config.daviplata, enabled: checked})} />
                            <Label htmlFor="daviplata-enabled">Habilitar Daviplata</Label>
                        </div>
                        {config.daviplata.enabled && <QRForm methodName="Daviplata" data={{...config.daviplata, accountNumber: config.daviplata.accountNumber ?? '', holderName: config.daviplata.holderName ?? '', qrImageUrl: config.daviplata.qrImageUrl ?? null, instructions: config.daviplata.instructions ?? ''}} setData={(data) => handleConfigChange('daviplata', data)} accountLabel="Número de Teléfono" />}
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
                        {config.stripe.enabled && <ApiGatewayForm data={config.stripe} setData={(data) => handleConfigChange('stripe', data)} fields={['secretKey']} showWebhookSecret={true} />}
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
                            <CardDescription>Configura los links de checkout para cada plan (incluyendo híbridos).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? (
                                <p className="text-sm text-muted-foreground">Cargando planes...</p>
                            ) : hotmartLinks.length > 0 ? (
                                hotmartLinks.map(plan => (
                                    <div key={plan.planId} className="p-4 border rounded-lg space-y-3 bg-muted/20 animate-in fade-in zoom-in duration-300">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={`hotmart-${plan.planId}`} className="font-bold text-sm truncate pr-2">{plan.planName}</Label>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground">{plan.enabled ? 'Activa' : 'Inactiva'}</span>
                                                <Switch 
                                                    id={`hotmart-switch-${plan.planId}`}
                                                    checked={plan.enabled} 
                                                    onCheckedChange={(checked) => handleHotmartEnabledChange(plan.planId, checked)} 
                                                />
                                            </div>
                                        </div>
                                        <Input 
                                            id={`hotmart-${plan.planId}`} 
                                            placeholder="https://pay.hotmart.com/..." 
                                            value={plan.hotmartUrl} 
                                            onChange={e => handleHotmartLinkChange(plan.planId, e.target.value)}
                                            className="bg-white"
                                            disabled={!plan.enabled}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No hay planes configurados. Ve a las secciones de Planes para crearlos.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
