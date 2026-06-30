
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Save, Gift } from 'lucide-react';
import type { AffiliateConfig } from '@/models/affiliate-config';
import { useEffect } from 'react';

const configSchema = z.object({
  programName: z.string().min(3, "El nombre es requerido."),
  rewardReferent: z.number().min(1, "La recompensa mínima es 1."),
  rewardReferree: z.number().min(1, "La recompensa mínima es 1."),
  maxReferralsPerUser: z.number().nullable(),
  isActive: z.boolean(),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function AffiliateConfigForm({ config, isLoading }: { config?: AffiliateConfig | null, isLoading: boolean }) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      programName: 'Programa de Socios',
      rewardReferent: 5,
      rewardReferree: 5,
      maxReferralsPerUser: null,
      isActive: true,
    }
  });

  useEffect(() => {
    if (config) {
      reset({
        programName: config.programName,
        rewardReferent: config.rewardReferent,
        rewardReferree: config.rewardReferree,
        maxReferralsPerUser: config.maxReferralsPerUser,
        isActive: config.isActive,
      });
    }
  }, [config, reset]);

  const onSubmit = async (data: ConfigFormData) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'adminConfig', 'affiliates');
      await updateDocumentNonBlocking(docRef, data);
      toast({ title: "Configuración actualizada", description: "Los cambios se aplicarán a los nuevos referidos." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error al guardar", description: error.message });
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Configuración Global
        </CardTitle>
        <CardDescription>Define las reglas y premios del programa de socios para toda la plataforma.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nombre del Programa</Label>
              <Input {...register('programName')} />
              {errors.programName && <p className="text-xs text-destructive">{errors.programName.message}</p>}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
              <div className="space-y-0.5">
                <Label>Estado del Programa</Label>
                <p className="text-xs text-muted-foreground">Activa o desactiva la generación de códigos.</p>
              </div>
              <Switch 
                checked={watch('isActive')} 
                onCheckedChange={(val) => setValue('isActive', val, { shouldDirty: true })} 
              />
            </div>

            <div className="space-y-2">
              <Label>Premio para el Referente (Productos extra)</Label>
              <Input type="number" {...register('rewardReferent', { valueAsNumber: true })} />
              {errors.rewardReferent && <p className="text-xs text-destructive">{errors.rewardReferent.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Premio para el Referido (Productos extra)</Label>
              <Input type="number" {...register('rewardReferree', { valueAsNumber: true })} />
              {errors.rewardReferree && <p className="text-xs text-destructive">{errors.rewardReferree.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Máximo de premios por referente (null = ilimitado)</Label>
              <Input 
                type="number" 
                placeholder="Ilimitado" 
                value={watch('maxReferralsPerUser') ?? ''} 
                onChange={(e) => setValue('maxReferralsPerUser', e.target.value ? Number(e.target.value) : null, { shouldDirty: true })}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/10 p-6">
          <Button type="submit" disabled={isSubmitting || !isDirty} className="font-bold">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Configuración
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
