
"use client";

import { useMemo, useEffect, useState, useRef } from 'react';
import { useDoc, useFirestore, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { GlobalConfig } from '@/models/global-config';
import { useToast } from "@/hooks/use-toast";
import type { Business } from '@/models/business';
import { UploadCloud, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

const configSchema = z.object({
  mainBusinessId: z.string().optional(),
  supportEmail: z.string().email({ message: "Email de soporte no válido." }),
  defaultLimits: z.number().min(0, { message: "El límite debe ser positivo." }),
  theme: z.string().min(1, { message: "El tema no puede estar vacío." }),
});


export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const configDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'globalConfig', 'system');
  }, [firestore]);
  
  const { data: config, isLoading } = useDoc<GlobalConfig>(configDocRef);

  const { control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(configSchema),
    defaultValues: {
        mainBusinessId: '',
        supportEmail: '',
        defaultLimits: 100,
        theme: 'default',
    }
  });

  useEffect(() => {
    if (config) {
      reset({
        mainBusinessId: config.mainBusinessId ?? '',
        supportEmail: config.supportEmail ?? '',
        defaultLimits: config.defaultLimits ?? 100,
        theme: config.theme ?? 'default',
      });
    }
  }, [config, reset]);

  const onSubmit = (data: z.infer<typeof configSchema>) => {
    if (!configDocRef) return;
    
    setDocumentNonBlocking(configDocRef, data, { merge: true });
    toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente.",
    });
  };

  const handleSwitchChange = (field: keyof GlobalConfig, value: boolean) => {
    if (!configDocRef) return;
    setDocumentNonBlocking(configDocRef, { [field]: value }, { merge: true });
  };
  
  if (isLoading) {
      return <div>Cargando configuración...</div>
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración Global</CardTitle>
          <CardDescription>Ajusta la configuración general de la plataforma Negocio V03.</CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Controles de Acceso y Registro</CardTitle>
          <CardDescription>
            Gestiona cómo los usuarios acceden y se registran en la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">
                Modo Mantenimiento
              </p>
              <p className="text-sm text-muted-foreground">
                {config?.maintenance ? 'Activado: El acceso público está deshabilitado.' : 'Desactivado: La plataforma está operativa.'}
              </p>
            </div>
            <Switch
              checked={config?.maintenance ?? false}
              onCheckedChange={(checked) => handleSwitchChange('maintenance', checked)}
              aria-readonly
            />
          </div>
          <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">
                Habilitar Registro de Nuevos Usuarios
              </p>
              <p className="text-sm text-muted-foreground">
                {config?.allowUserRegistration ? 'Activado: Los nuevos usuarios pueden registrarse.' : 'Desactivado: El registro está cerrado.'}
              </p>
            </div>
            <Switch
              checked={config?.allowUserRegistration ?? false}
              onCheckedChange={(checked) => handleSwitchChange('allowUserRegistration', checked)}
              aria-readonly
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Ajustes Generales</CardTitle>
          <CardDescription>
            Configura los parámetros principales del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="mainBusinessId">ID del Negocio Principal</Label>
                <Controller
                  name="mainBusinessId"
                  control={control}
                  render={({ field }) => (
                      <Input id="mainBusinessId" placeholder="Introduce el ID del negocio..." {...field} />
                  )}
                />
                <p className="text-xs text-muted-foreground">Este es el ID del negocio que se mostrará en la página raíz (/).</p>
                 {errors.mainBusinessId && <p className="text-sm text-destructive">{errors.mainBusinessId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Email de Soporte</Label>
              <Controller
                name="supportEmail"
                control={control}
                render={({ field }) => (
                    <Input id="supportEmail" placeholder="soporte@ecosalud.com" {...field} />
                )}
              />
              {errors.supportEmail && <p className="text-sm text-destructive">{errors.supportEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultLimits">Límites por Defecto</Label>
               <Controller
                name="defaultLimits"
                control={control}
                render={({ field }) => (
                    <Input id="defaultLimits" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                )}
              />
              {errors.defaultLimits && <p className="text-sm text-destructive">{errors.defaultLimits.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="theme">Tema de la Plataforma</Label>
               <Controller
                name="theme"
                control={control}
                render={({ field }) => (
                    <Input id="theme" placeholder="ej. 'default', 'dark'" {...field} />
                )}
              />
              {errors.theme && <p className="text-sm text-destructive">{errors.theme.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
