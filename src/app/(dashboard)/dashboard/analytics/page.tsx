
"use client";

import { useMemo } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Business } from "@/models/business";
import { Info, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const analyticsSchema = z.object({
  googleAnalyticsId: z.string().regex(/^G-[A-Z0-9]{10}$/, { message: "Formato de ID no válido (ej. G-XXXXXXXXXX)." }).or(z.literal("")),
});


export default function AnalyticsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const businessDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'businesses', user.uid);
    }, [firestore, user]);

    const { data: business, isLoading } = useDoc<Business>(businessDocRef);

    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(analyticsSchema),
        values: {
            googleAnalyticsId: business?.googleAnalyticsId ?? ''
        }
    });

    const onSubmit = (data: z.infer<typeof analyticsSchema>) => {
        if (!businessDocRef) return;

        setDocumentNonBlocking(businessDocRef, { googleAnalyticsId: data.googleAnalyticsId || null }, { merge: true });

        toast({
            title: "Configuración Guardada",
            description: "Tu ID de Google Analytics ha sido actualizado.",
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Cargando configuración...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Métricas y Analíticas</CardTitle>
                    <CardDescription>
                        Integra tu cuenta de Google Analytics para obtener métricas detalladas del tráfico de tu landing page.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Google Analytics</CardTitle>
                     <CardDescription>
                        Introduce el ID de seguimiento de tu propiedad de Google Analytics 4 (GA4).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="googleAnalyticsId">ID de Medición de GA4</Label>
                            <Controller
                                name="googleAnalyticsId"
                                control={control}
                                render={({ field }) => (
                                <Input id="googleAnalyticsId" placeholder="G-XXXXXXXXXX" {...field} />
                                )}
                            />
                            {errors.googleAnalyticsId && <p className="text-sm text-destructive mt-1">{errors.googleAnalyticsId.message}</p>}
                        </div>
                        <div className="flex justify-between items-center">
                            <Button type="submit" disabled={isSubmitting}>
                                <Save className="mr-2 h-4 w-4"/>
                                {isSubmitting ? 'Guardando...' : 'Guardar ID'}
                            </Button>
                             {business?.googleAnalyticsId && (
                                <a
                                    href={`https://analytics.google.com/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                >
                                    Ir a mi panel de Google Analytics &rarr;
                                </a>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
            
            {!business?.googleAnalyticsId && (
                 <div className="p-4 bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-800 rounded-lg flex items-start gap-4">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-blue-800 dark:text-blue-300">¿Dónde encuentro mi ID de Medición?</p>
                        <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                            <li>Inicia sesión en tu cuenta de Google Analytics.</li>
                            <li>Ve a <span className="font-semibold">Administrar</span> (icono de engranaje en la esquina inferior izquierda).</li>
                            <li>Asegúrate de tener la cuenta y la propiedad correctas seleccionadas.</li>
                            <li>En la columna "Propiedad", haz clic en <span className="font-semibold">Flujos de datos</span> y selecciona tu flujo web.</li>
                            <li>Tu "ID DE MEDICIÓN" (con formato G-XXXXXXXXXX) aparecerá en la esquina superior derecha.</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}
