'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Smartphone, Loader2, Save, Wifi, WifiOff, AlertTriangle, ShieldCheck, Key, CheckCircle, XCircle, Info } from 'lucide-react';
import { testYCloudConnection } from '@/ai/flows/test-ycloud-connection-flow';
import { useSubscription } from '@/hooks/useSubscription';
import type { ChatbotConfig } from '@/models/chatbot-config';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ycloudConfigSchema = z.object({
  yCloud: z.object({
    apiKey: z.string().min(1, 'La API Key es requerida.'),
    wabaId: z.string().min(1, 'El WABA ID es requerido.'),
    phoneNumber: z.string().min(1, 'El número emisor es requerido.'),
    webhookSecret: z.string().optional(),
  }),
  isActive: z.boolean(),
});

type YCloudConfigFormData = z.infer<typeof ycloudConfigSchema>;

export default function YCloudConfigPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);

    const configDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'businesses', user.uid, 'chatbotConfig', 'main');
    }, [user, firestore]);
    
    const { data: config, isLoading: isConfigLoading } = useDoc<ChatbotConfig>(configDocRef);

    const { register, handleSubmit, reset, watch, setValue, getValues, control } = useForm<YCloudConfigFormData>({
        defaultValues: {
            yCloud: {
                apiKey: '',
                wabaId: '',
                phoneNumber: '',
                webhookSecret: '',
            },
            isActive: false,
        }
    });

    useEffect(() => {
        if (config) {
            reset({
                yCloud: {
                    apiKey: config.yCloud?.apiKey || '',
                    wabaId: config.yCloud?.wabaId || '',
                    phoneNumber: config.yCloud?.phoneNumber || '',
                    webhookSecret: config.yCloud?.webhookSecret || '',
                },
                isActive: config.provider === 'ycloud'
            });
        }
    }, [config, reset]);

    const isAuthorized = isModuleAuthorized('ycloud-whatsapp');

    const handleSave = async (data: YCloudConfigFormData) => {
        if (!configDocRef || !user) return;
        setIsSaving(true);
        try {
            const updateData: any = {
                yCloud: data.yCloud,
                updatedAt: new Date().toISOString()
            };

            // Establecemos el proveedor de forma explícita al activar
            if (data.isActive) {
                updateData.provider = 'ycloud';
            } else if (config?.provider === 'ycloud') {
                // Si el usuario apaga el interruptor, quitamos el provider prioritario
                // para que WhatsAppFactory haga fallback a WHAPI si está configurado.
                updateData.provider = 'none';
            }

            await setDoc(configDocRef, updateData, { merge: true });
            
            toast({
                title: "Configuración Guardada",
                description: "Los cambios en tu asistente YCloud han sido guardados.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo actualizar la configuración.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        const vals = getValues('yCloud');
        if (!vals.apiKey || !vals.wabaId) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Ingresa la API Key y el WABA ID para probar.' });
            return;
        }

        setIsVerifying(true);
        setTestResult(null);
        try {
            const result = await testYCloudConnection({ apiKey: vals.apiKey, wabaId: vals.wabaId });
            setTestResult(result);
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Error de conexión.' });
        } finally {
            setIsVerifying(false);
        }
    };

    if (isSubLoading || isConfigLoading) {
        return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!isAuthorized) {
        return (
            <Card className="border-destructive bg-destructive/5">
                <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-4">
                    <AlertTriangle className="h-12 w-12 text-destructive" />
                    <h3 className="text-xl font-bold">Módulo no disponible</h3>
                    <p className="text-muted-foreground max-w-sm">
                        El módulo de WhatsApp YCloud (v2) no está activo en tu plan actual o no ha sido contratado como Add-on.
                    </p>
                    <Button variant="outline" onClick={() => window.history.back()}>Regresar</Button>
                </CardContent>
            </Card>
        );
    }

    const isActiveInDB = config?.provider === 'ycloud';

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-2xl font-black">
                            <Smartphone className="h-6 w-6 text-primary" />
                            Asistente WhatsApp YCloud
                        </CardTitle>
                        <CardDescription>
                            Gestiona tu conexión oficial con la API v2 de WhatsApp mediante el proveedor YCloud.
                        </CardDescription>
                    </div>
                    <Button onClick={handleSubmit(handleSave)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-sm border-gray-100">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Configuración de Credenciales
                            </CardTitle>
                            <CardDescription>Obtén estas llaves desde tu panel oficial de YCloud.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="apiKey" className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                                    <Key className="h-3 w-3" /> API Key (V2)
                                </Label>
                                <Input 
                                    id="apiKey" 
                                    type="password" 
                                    placeholder="yc_..." 
                                    {...register('yCloud.apiKey')} 
                                    className="bg-muted/30 font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="wabaId" className="text-xs font-bold uppercase text-muted-foreground">WABA ID</Label>
                                    <Input id="wabaId" placeholder="ID de la cuenta empresarial" {...register('yCloud.wabaId')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase text-muted-foreground">Número Emisor (Con código de país)</Label>
                                    <Input id="phoneNumber" placeholder="Ej: 573228831634" {...register('yCloud.phoneNumber')} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="webhookSecret" className="text-xs font-bold uppercase text-muted-foreground">Webhook Signing Secret (Opcional)</Label>
                                <Input id="webhookSecret" type="password" {...register('yCloud.webhookSecret')} />
                                <p className="text-[10px] text-muted-foreground italic">Se utiliza para verificar la firma de YCloud en los mensajes entrantes.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/20 border-t py-4">
                             <Button variant="outline" size="sm" onClick={handleTest} disabled={isVerifying} className="font-black gap-2">
                                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                                {isVerifying ? 'Verificando...' : 'Probar Conexión con YCloud'}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className={cn("border-2 transition-all duration-300", isActiveInDB ? "border-primary/20 bg-primary/5 shadow-inner" : "border-muted shadow-sm")}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">Activación del Asistente</CardTitle>
                                    <CardDescription>Define si YCloud responderá a los mensajes de tus clientes.</CardDescription>
                                </div>
                                <Controller
                                    name="isActive"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch 
                                            checked={field.value} 
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    )}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm">
                                {isActiveInDB ? (
                                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                ) : (
                                    <div className="h-3 w-3 rounded-full bg-gray-300" />
                                )}
                                <span className="text-xs font-black uppercase tracking-widest">
                                    {isActiveInDB ? 'Proveedor YCloud en Producción' : 'YCloud Desactivado'}
                                </span>
                             </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado de Validación</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4 text-center py-6">
                            {testResult ? (
                                <div className="space-y-4 animate-in zoom-in duration-500">
                                    {testResult.success ? (
                                        <div className="p-4 bg-green-50 rounded-full text-green-600 ring-8 ring-green-50/50">
                                            <CheckCircle className="h-10 w-10" />
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-red-50 rounded-full text-red-600 ring-8 ring-red-50/50">
                                            <XCircle className="h-10 w-10" />
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <p className={cn("text-sm font-black", testResult.success ? "text-green-700" : "text-red-700")}>
                                            {testResult.success ? '¡Conexión Exitosa!' : 'Fallo de Conexión'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground px-4 leading-tight">
                                            {testResult.message}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-10 text-muted-foreground italic text-xs px-6">
                                    Ingresa tus datos y presiona "Probar Conexión" para validar el acceso al WABA.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-100 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <CardHeader className="pb-2">
                             <CardTitle className="text-xs font-black text-blue-800 uppercase flex items-center gap-2">
                                <Info className="h-4 w-4" /> Configuración de Webhook
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                                Para que la IA pueda responder mensajes entrantes, debes registrar esta URL en tu consola de YCloud:
                            </p>
                            <div className="p-3 bg-white rounded-xl border border-blue-200 font-mono text-[9px] break-all select-all shadow-sm">
                                {typeof window !== 'undefined' ? `${window.location.origin}/api/ycloud/webhook` : '/api/ycloud/webhook'}
                            </div>
                            <div className="p-3 bg-blue-100/50 rounded-lg text-[10px] text-blue-800 flex gap-2">
                                <ShieldCheck className="h-4 w-4 shrink-0" />
                                <span>Recomendamos configurar el <strong>Webhook Secret</strong> para asegurar tu conexión.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={!!testResult && !testResult.success} onOpenChange={() => setTestResult(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-5 w-5" /> Error en Credenciales
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium pt-2">
                            {testResult?.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction className="font-bold">Verificar Datos</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
