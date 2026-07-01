"use client";

import { useEffect } from 'react';
import { useDoc, useFirestore, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Cookie, Save } from 'lucide-react';
import { CookiesSettingsSchema, type CookiesSettings } from '@/models/cookies-settings';

/**
 * Página de administración para la configuración global del banner de cookies.
 */
export default function CookiesSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Referencia estable al documento único de configuración
  const docRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'cookies_settings', 'config');
  }, [firestore]);
  
  // Suscripción en tiempo real a los datos existentes
  const { data: config, isLoading } = useDoc<CookiesSettings>(docRef);

  // Inicialización del formulario con validación Zod
  const { control, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<CookiesSettings>({
    resolver: zodResolver(CookiesSettingsSchema),
    defaultValues: {
      enabled: false,
      title: 'Valoramos tu privacidad',
      message: 'Utilizamos cookies para mejorar tu experiencia en la plataforma.',
      buttonText: 'Aceptar',
      position: 'bottom',
    }
  });

  // Sincronizar el formulario cuando los datos llegan de Firestore
  useEffect(() => {
    if (config) {
      reset({
        enabled: config.enabled ?? false,
        title: config.title ?? 'Valoramos tu privacidad',
        message: config.message ?? 'Utilizamos cookies para mejorar tu experiencia en la plataforma.',
        buttonText: config.buttonText ?? 'Aceptar',
        position: config.position ?? 'bottom',
      });
    }
  }, [config, reset]);

  /**
   * Procesa el guardado de la configuración.
   */
  const onSubmit = (data: CookiesSettings) => {
    if (!docRef) return;
    
    setDocumentNonBlocking(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "Configuración guardada",
      description: "Los cambios se han guardado correctamente.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground font-medium">Cargando configuración de cookies...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Cookie className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Configuración de Cookies</CardTitle>
              <CardDescription>Gestiona el banner de consentimiento de cookies para los visitantes del sistema.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado del Banner</CardTitle>
            <CardDescription>Activa o desactiva la visualización del aviso legal en la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-4 rounded-md border p-4 bg-muted/20">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-bold leading-none">Activar Banner de Cookies</p>
                <p className="text-xs text-muted-foreground">
                  Muestra un aviso de consentimiento a los usuarios que visitan el sitio por primera vez.
                </p>
              </div>
              <Controller
                name="enabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contenido y Diseño</CardTitle>
            <CardDescription>Personaliza el mensaje y la ubicación del banner para que coincida con la marca.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold">Título del Banner</Label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input id="title" placeholder="Ej: Valoramos tu privacidad" className="bg-background" {...field} />
                )}
              />
              {errors.title && <p className="text-xs text-destructive font-medium">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="font-bold">Mensaje del Banner</Label>
              <Controller
                name="message"
                control={control}
                render={({ field }) => (
                  <Textarea 
                    id="message" 
                    placeholder="Describe el uso de cookies en tu plataforma..." 
                    rows={4}
                    className="bg-background resize-none"
                    {...field} 
                  />
                )}
              />
              {errors.message && <p className="text-xs text-destructive font-medium">{errors.message.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="buttonText" className="font-bold">Texto del botón</Label>
                <Controller
                  name="buttonText"
                  control={control}
                  render={({ field }) => (
                    <Input id="buttonText" placeholder="Aceptar" className="bg-background" {...field} />
                  )}
                />
                {errors.buttonText && <p className="text-xs text-destructive font-medium">{errors.buttonText.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className="font-bold">Posición del Banner</Label>
                <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="position" className="bg-background">
                        <SelectValue placeholder="Selecciona una posición" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom">Inferior (Bottom)</SelectItem>
                        <SelectItem value="top">Superior (Top)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.position && <p className="text-xs text-destructive font-medium">{errors.position.message}</p>}
              </div>
            </div>
          </CardContent>
          <div className="p-6 pt-0">
            <Button type="submit" className="font-bold" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Configuración
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
