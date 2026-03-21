'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InvoiceEditor } from '@/components/invoice/InvoiceEditor';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import type { InvoiceSettings } from '@/models/invoice-settings';
import { initialInvoiceSettings } from '@/models/invoice-settings';

export default function InvoiceConfigPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [settings, setSettings] = useState<InvoiceSettings>(initialInvoiceSettings);
    const [isSaving, setIsSaving] = useState(false);
    
    const settingsDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, `businesses/${user.uid}/invoiceSettings`, 'main') : null),
        [user, firestore]
    );

    const { data: savedSettings, isLoading } = useDoc<InvoiceSettings>(settingsDocRef);

    useEffect(() => {
        if (savedSettings) {
            // Deep merge to ensure new fields from initialInvoiceSettings are present
            const deepMerge = (target: any, source: any): any => {
                const output = { ...target };
                if (target && typeof target === 'object' && source && typeof source === 'object') {
                    Object.keys(source).forEach(key => {
                        if (source[key] && typeof source[key] === 'object' && key in target && typeof target[key] === 'object') {
                            output[key] = deepMerge(target[key], source[key]);
                        } else {
                            output[key] = source[key];
                        }
                    });
                     // Ensure all keys from target are in output
                    Object.keys(target).forEach(key => {
                        if (!(key in source)) {
                            output[key] = target[key];
                        }
                    });
                }
                return output;
            };
            setSettings(deepMerge(initialInvoiceSettings, savedSettings));
        }
    }, [savedSettings]);
    
    const handleSave = async () => {
        if (!settingsDocRef) return;
        setIsSaving(true);
        try {
            await setDocumentNonBlocking(settingsDocRef, settings);
            toast({
                title: 'Configuración Guardada',
                description: 'Los ajustes de tu factura han sido guardados con éxito.',
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error al Guardar',
                description: 'No se pudo guardar la configuración.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Cargando configuración...</div>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Editor de Factura</h1>
                    <p className="text-muted-foreground">Personaliza la apariencia de tus facturas y recibos.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Configuración
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <InvoiceEditor settings={settings} setSettings={setSettings} />
                <InvoicePreview settings={settings} setSettings={setSettings} />
            </div>
        </div>
    );
}
