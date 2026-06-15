
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Switch } from '../../../../components/ui/switch';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { PlusCircle, Edit, Trash2, Loader2, DollarSign, Percent, Package, Settings, Palette, AlertCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '../../../../firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '../../../../hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import type { HybridPlan } from '../../../../models/hybrid-plan';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HybridPlanSchema } from '../../../../models/hybrid-plan';
import { errorEmitter } from '../../../../firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../../../../firebase/errors';

export default function HybridPlansPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HybridPlan | null>(null);

  const plansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'hybrid_plans'), [firestore]);
  const { data: plans, isLoading } = useCollection<HybridPlan>(plansQuery);

  const handleOpenDialog = (plan: HybridPlan | null) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (plan: HybridPlan) => {
    if (!firestore || !plan.id) return;
    try {
      await deleteDocumentNonBlocking(doc(firestore, 'hybrid_plans', plan.id));
      toast({ title: 'Plan eliminado', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Planes Híbridos (Menfy)</CardTitle>
            <CardDescription>Tarifa base + Comisión por transacción.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Plan Híbrido
          </Button>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map(plan => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? 'default' : 'secondary'}>{plan.isActive ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <CardDescription>{plan.slug}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Mensual:</span>
                  <span className="font-bold">${plan.basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comisión:</span>
                  <span className="font-bold">
                    {plan.commissionType === 'percent' ? `${plan.pricePerOrder}%` : `$${plan.pricePerOrder.toLocaleString()}`}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenDialog(plan)}><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(plan)}><Trash2 className="w-4 h-4" /></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <HybridPlanDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        plan={editingPlan} 
      />
    </div>
  );
}

function HybridPlanDialog({ isOpen, onClose, plan }: { isOpen: boolean, onClose: () => void, plan: HybridPlan | null }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const { register, control, handleSubmit, reset, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<HybridPlan>({
    resolver: zodResolver(HybridPlanSchema),
    defaultValues: {
      name: '',
      slug: '',
      basePrice: 0,
      pricePerOrder: 0,
      commissionType: 'percent',
      variableBillingFrequency: 'monthly',
      isActive: true,
      isPublic: true,
      includedModuleKeys: [],
      features: [{ value: '' }],
      extraLimits: [],
      icon: 'Package',
      themeColor: '#4CAF50',
      limits: {
        products: -1,
        blogPosts: -1,
        landingPages: -1,
        promotions: -1,
        coupons: -1,
        orders: -1,
        suggestions: -1,
      }
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'features' });
  const { fields: extraLimitFields, append: appendExtraLimit, remove: removeExtraLimit } = useFieldArray({
    control,
    name: "extraLimits",
  });

  useEffect(() => {
    if (isOpen) {
      if (plan) {
        reset(plan);
      } else {
        reset({
          name: '',
          slug: '',
          basePrice: 0,
          pricePerOrder: 0,
          commissionType: 'percent',
          variableBillingFrequency: 'monthly',
          isActive: true,
          isPublic: true,
          includedModuleKeys: [],
          features: [{ value: '' }],
          extraLimits: [],
          icon: 'Package',
          themeColor: '#4CAF50',
          limits: {
            products: -1,
            blogPosts: -1,
            landingPages: -1,
            promotions: -1,
            coupons: -1,
            orders: -1,
            suggestions: -1,
          }
        });
      }
    }
  }, [plan, isOpen, reset]);

  const onSubmit = (data: HybridPlan) => {
    if (!firestore || !user) return;

    const planId = plan?.id || doc(collection(firestore, 'hybrid_plans')).id;
    const docRef = doc(firestore, 'hybrid_plans', planId);

    // Sanitización forzada de datos
    const dataToSave = JSON.parse(JSON.stringify(data));
    dataToSave.id = planId;
    
    // Normalización de SLUG: Siempre generamos uno limpio a partir del nombre si no hay uno válido
    const sourceForSlug = dataToSave.slug || dataToSave.name;
    dataToSave.slug = sourceForSlug
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/\s+/g, '-')           // Espacios a guiones
        .replace(/[^\w-]+/g, '');       // Quitar caracteres no permitidos

    startTransition(() => {
      setDocumentNonBlocking(docRef, dataToSave, { merge: true })
        .then(() => {
          toast({ title: plan?.id ? 'Plan actualizado' : 'Plan creado con éxito' });
          onClose();
        })
        .catch(async (serverError) => {
          console.error("ERROR CRÍTICO AL GUARDAR PLAN:", serverError);
          
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: plan?.id ? 'update' : 'create',
            requestResourceData: dataToSave,
          } satisfies SecurityRuleContext);

          errorEmitter.emit('permission-error', permissionError);
          
          toast({
            variant: "destructive",
            title: "Error de Permisos",
            description: "No tienes autorización para realizar esta acción o el formato de datos es inválido."
          });
        });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isPending && !isSubmitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plan Híbrido' : 'Nuevo Plan Híbrido'}</DialogTitle>
          <DialogDescription>Define los costos fijos y variables del plan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="costs">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="costs"><DollarSign className="w-4 h-4 mr-1" /> Costos</TabsTrigger>
              <TabsTrigger value="modules"><Settings className="w-4 h-4 mr-1" /> Módulos</TabsTrigger>
              <TabsTrigger value="limits"><Package className="w-4 h-4 mr-1" /> Límites</TabsTrigger>
              <TabsTrigger value="design"><Palette className="w-4 h-4 mr-1" /> Diseño</TabsTrigger>
            </TabsList>

            <TabsContent value="costs" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Plan</Label>
                  <Input {...register('name')} placeholder="Ej: Menfy Flexible" />
                  {errors.name && <p className="text-xs text-destructive font-semibold">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL amistosa)</Label>
                  <Input {...register('slug')} placeholder="menfy-flexible" />
                  <p className="text-[10px] text-muted-foreground italic">Se normalizará automáticamente al guardar.</p>
                  {errors.slug && <p className="text-xs text-destructive font-semibold">{errors.slug.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tarifa Base Mensual ($)</Label>
                  <Input type="number" {...register('basePrice', { valueAsNumber: true })} />
                  {errors.basePrice && <p className="text-xs text-destructive font-semibold">{errors.basePrice.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Frecuencia de Cobro Variable</Label>
                  <Controller name="variableBillingFrequency" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-bold">Configuración de Comisión</Label>
                <div className="flex gap-4 items-end">
                  <div className="w-40">
                    <Label className="text-xs">Tipo</Label>
                    <Controller name="commissionType" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            {field.value === 'percent' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Porcentual (%)</SelectItem>
                          <SelectItem value="fixed">Fija ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Valor de la Comisión</Label>
                    <Input type="number" step="0.01" {...register('pricePerOrder', { valueAsNumber: true })} />
                    {errors.pricePerOrder && <p className="text-xs text-destructive font-semibold">{errors.pricePerOrder.message}</p>}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modules" className="space-y-4 pt-4">
               <Label className="font-semibold">Módulos Incluidos</Label>
               <Controller name="includedModuleKeys" control={control} render={({ field }) => (
                 <Input 
                   value={Array.isArray(field.value) ? field.value.join(', ') : ''} 
                   onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                   placeholder="ej: catalogo, blog, promotions" 
                 />
               )} />
               <p className="text-xs text-muted-foreground">Escribe las IDs de los módulos separados por coma.</p>
            </TabsContent>

            <TabsContent value="limits" className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(watch('limits') || {}).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                    <Input type="number" {...register(`limits.${key as keyof HybridPlan['limits']}`, { valueAsNumber: true })} />
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">Campos Técnicos Extra</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => appendExtraLimit({ key: '', value: -1 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Campo
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {extraLimitFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] uppercase">Clave Técnica</Label>
                        <Input {...register(`extraLimits.${index}.key`)} placeholder="ej: api_calls" />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-[10px] uppercase">Valor</Label>
                        <Input type="number" {...register(`extraLimits.${index}.value`, { valueAsNumber: true })} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeExtraLimit(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-muted/10">
                  <Label className="font-semibold">Estado del Plan</Label>
                  <Switch checked={watch('isActive')} onCheckedChange={(val) => setValue('isActive', val)} />
                </div>
                <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-muted/10">
                  <Label className="font-semibold">Visibilidad Pública</Label>
                  <Switch checked={watch('isPublic')} onCheckedChange={(val) => setValue('isPublic', val)} />
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-bold text-sm">Identidad Visual</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icono (Lucide)</Label>
                      <Input {...register('icon')} placeholder="Ej: Package, Rocket, Crown" />
                    </div>
                    <div className="space-y-2">
                      <Label>Color del Tema</Label>
                      <div className="flex gap-2">
                        <Input type="color" {...register('themeColor')} className="p-1 w-12 h-10 cursor-pointer" />
                        <Input 
                            value={watch('themeColor')} 
                            onChange={(e) => setValue('themeColor', e.target.value)} 
                            className="font-mono uppercase"
                            placeholder="#HEX" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="font-bold">Características del Plan</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}><PlusCircle className="h-4 w-4 mr-2" /> Añadir</Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <Input {...register(`features.${index}.value`)} placeholder="Ej: Reportes avanzados" />
                    <Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending || isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isPending || isSubmitting}>
              {(isPending || isSubmitting) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {plan ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
