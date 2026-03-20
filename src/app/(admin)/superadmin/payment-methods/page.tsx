"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Loader2, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
// Mock data and types for now, as services and hooks are not created yet.

type PaymentMethodConfig = {
  enabled: boolean;
  publicKey?: string;
  secretKey?: string;
  mode?: 'sandbox' | 'production';
  instructions?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrImageUrl?: string | null;
};

type HotmartPlanLink = {
    planId: string;
    planName: string;
    hotmartUrl: string;
};

const PaymentMethodCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {children}
        </CardContent>
    </Card>
);

export default function PaymentMethodsPage() {
    const [config, setConfig] = useState<Record<string, PaymentMethodConfig>>({
        nequi: { enabled: false, accountNumber: '', accountHolder: '' },
        stripe: { enabled: false, publicKey: '', secretKey: '', mode: 'sandbox' },
    });
    const [hotmartLinks, setHotmartLinks] = useState<HotmartPlanLink[]>([
        { planId: 'plan1', planName: 'Plan Básico', hotmartUrl: '' },
        { planId: 'plan2', planName: 'Plan Pro', hotmartUrl: '' },
    ]);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Here you would fetch initial config from Firestore
        // For now, we use the initial state.
    }, []);

    const handleConfigChange = (method: string, field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            [method]: { ...prev[method], [field]: value }
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
                {/* Columna Izquierda */}
                <div className="lg:col-span-2 space-y-6">
                    <PaymentMethodCard title="Nequi (QR)">
                         <div className="flex items-center space-x-2">
                            <Switch id="nequi-enabled" checked={config.nequi.enabled} onCheckedChange={checked => handleConfigChange('nequi', 'enabled', checked)} />
                            <Label htmlFor="nequi-enabled">Habilitar Nequi</Label>
                        </div>
                        {config.nequi.enabled && (
                            <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <Label htmlFor="nequi-accountHolder">Titular de la cuenta</Label>
                                    <Input id="nequi-accountHolder" value={config.nequi.accountHolder} onChange={e => handleConfigChange('nequi', 'accountHolder', e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="nequi-accountNumber">Número de teléfono</Label>
                                    <Input id="nequi-accountNumber" value={config.nequi.accountNumber} onChange={e => handleConfigChange('nequi', 'accountNumber', e.target.value)} />
                                </div>
                                {/* ImageUploader would go here */}
                            </div>
                        )}
                    </PaymentMethodCard>

                     <PaymentMethodCard title="Stripe">
                         <div className="flex items-center space-x-2">
                            <Switch id="stripe-enabled" checked={config.stripe.enabled} onCheckedChange={checked => handleConfigChange('stripe', 'enabled', checked)} />
                            <Label htmlFor="stripe-enabled">Habilitar Stripe</Label>
                        </div>
                        {config.stripe.enabled && (
                             <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <Label htmlFor="stripe-publicKey">Clave Pública</Label>
                                    <Input id="stripe-publicKey" value={config.stripe.publicKey} onChange={e => handleConfigChange('stripe', 'publicKey', e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="stripe-secretKey">Clave Secreta</Label>
                                    <Input id="stripe-secretKey" type="password" value={config.stripe.secretKey} onChange={e => handleConfigChange('stripe', 'secretKey', e.target.value)} />
                                </div>
                                 <div>
                                    <Label htmlFor="stripe-mode">Modo de Operación</Label>
                                    <Select value={config.stripe.mode} onValueChange={(value) => handleConfigChange('stripe', 'mode', value)}>
                                        <SelectTrigger id="stripe-mode"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                                            <SelectItem value="production">Production (Producción)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </PaymentMethodCard>
                </div>
                
                {/* Columna Derecha */}
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
