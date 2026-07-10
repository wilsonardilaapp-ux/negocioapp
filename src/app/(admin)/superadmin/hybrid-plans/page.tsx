'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2, Loader2, DollarSign, Percent, Package, Settings, Palette, GripVertical, RefreshCw } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { HybridPlan } from '@/models/hybrid-plan';
import type { Module } from '@/models/module';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HybridPlanSchema } from '@/models/hybrid-plan';
import { cn } from "@/lib/utils";
import { syncHybridPlanKeys } from '@/actions/migrations';

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function HybridPlansPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HybridPlan | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const plansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'hybrid_plans'), [firestore]);
  const { data: unsortedPlans, isLoading } = useCollection<HybridPlan>(plansQuery);

  const plans = useMemo(() => {
    if (!unsortedPlans) return [];
    return [...unsortedPlans].sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
  }, [unsortedPlans]);

  const handleOpenDialog = (plan: HybridPlan | null) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleSyncKeys = async () => {
    setIsSyncing(true);
    try {
      const result = await syncHybridPlanKeys();
      if (result.success) {
        toast({ title: "Sincronización completa", description: result.message });
      } else {
        toast({ variant: 'destructive', title: "Error", description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Error crítico" });
    } finally {
      setIsSyncing(false);
    }
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Planes Híbridos (Zentry)</CardTitle>
            <CardDescription>Tarifa base + Comisión por transacción.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncKeys} disabled={isSyncing}>
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualizar Beneficios Híbridos
            </Button>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Plan Híbrido
            </Button>
          </div>
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
                  <div className="flex gap-2">
                    {plan.isMostPopular && <Badge variant="default" className="bg-amber-500 text-white">Popular</Badge>}
                    <Badge variant={plan.isActive ? 'default' : 'secondary'}>{plan.isActive ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                </div>
                <CardDescription>{plan.slug}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Mensual:</span>
                  <span className="font-bold">{formatCurrency(plan.basePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comisión:</span>
                  <span className="font-bold">
                    {plan.commissionType === 'percent' ? `${plan.pricePerOrder}%` : formatCurrency(plan.pricePerOrder)}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenDialog(plan)}><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(plan)}><Trash2 className="h-4 w-4" /></Button>
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

function SortableFeatureItem({ id, index, register, remove }: { id: string, index: number, register: any, remove: (index: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start bg-background p-2 rounded-md border shadow-sm">
      <div {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-muted rounded mt-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor del beneficio</Label>
            <Input {...register(`features.${index}.value` as const)} placeholder={`Ej: 50 productos`} />
        </div>
        <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Concepto (groupKey)</Label>
            <Input {...register(`features.${index}.groupKey` as const)} placeholder={`Ej: productos`} />
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => remove(index)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function HybridPlanDialog({ isOpen, onClose, plan }: { isOpen: boolean, onClose: () => void, plan: HybridPlan | null }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const modulesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'modules'), [firestore]);
  const { data: allModules } = useCollection<Module>(modulesQuery);

  const { register, control, handleSubmit, reset, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<HybridPlan>({
    resolver: zodResolver(HybridPlanSchema),
    defaultValues: {
      name: '',
      slug: '',
      basePrice: 0,
      pricePerOrder: 0,
      maxCommissionPerOrder: 0,
      commissionType: 'percent',
      variableBillingFrequency: 'monthly',
      isActive: true,
      isPublic: true,
      isMostPopular: false,
      includedModuleKeys: [],
      features: [{ value: '', displayOrder: 0, groupKey: '' }],
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

  const { fields, append, remove, move } = useFieldArray({ control, name: 'features' });
  const { fields: extraLimitFields, append: appendExtraLimit, remove: removeExtraLimit } = useFieldArray({ control, name: 'extraLimits' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      if (plan) {
        const sortedFeatures = [...(plan.features || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        reset({ 
          ...plan, 
          features: sortedFeatures,
          extraLimits: plan.extraLimits || []
        });
      } else {
        reset({
          name: '',
          slug: '',
          basePrice: 0,
          pricePerOrder: 0,
          maxCommissionPerOrder: 0,
          commissionType: 'percent',
          variableBillingFrequency: 'monthly',
          isActive: true,
          isPublic: true,
          isMostPopular: false,
          includedModuleKeys: [],
          features: [{ value: '', displayOrder: 0, groupKey: '' }],
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id);
      const newIndex = fields.findIndex((item) => item.id === over?.id);
      move(oldIndex, newIndex);
    }
  };

  const onSubmit = (data: HybridPlan) => {
    if (!firestore || !user) return;

    const planId = plan?.id || doc(collection(firestore, 'hybrid_plans')).id;
    const docRef = doc(firestore, 'hybrid_plans', planId);

    const dataToSave = JSON.parse(JSON.stringify(data));
    dataToSave.id = planId;
    dataToSave.features = data.features.map((f, index) => ({
        ...f,
        displayOrder: index
    }));
    
    dataToSave.includedModuleKeys = (data.includedModuleKeys || [])
        .map(k => k.toLowerCase().trim())
        .filter(k => k.length > 0);

    const sourceForSlug = dataToSave.slug || dataToSave.name;
    dataToSave.slug = sourceForSlug
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

    startTransition(() => {
      setDocumentNonBlocking(docRef, dataToSave, { merge: true })
        .then(() => {
          toast({ title: plan?.id ? 'Plan actualizado' : 'Plan creado con éxito' });
          onClose();
        })
        .catch(async (serverError) => {
          console.error("Error saving hybrid plan:", serverError);
          toast({ variant: 'destructive', title: 'Error al guardar' });
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
                  <Input {...register('name')} placeholder="Ej: Zentry Flexible" />
                  {errors.name && <p className="text-xs text-destructive font-semibold">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL amistosa)</Label>
                  <Input {...register('slug')} placeholder="zentry-flexible" />
                  {errors.slug && <p className="text-xs text-destructive font-semibold">{errors.slug.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tarifa Base Mensual ($)</Label>
                  <Input type="number" {...register('basePrice', { valueAsNumber: true })} />
                  {errors.basePrice && <p className="text-xs text-destructive font-semibold">{errors.basePrice.message}</p>}
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
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modules" className="space-y-4 pt-4">
               <Label className="font-semibold">Módulos Incluidos</Label>
               <Controller name="includedModuleKeys" control={control} render={({ field }) => {
                 const selected: string[] = Array.isArray(field.value) ? field.value : [];
                 const toggleModule = (moduleId: string, checked: boolean) => {
                   if (checked) {
                     field.onChange([...selected, moduleId]);
                   } else {
                     field.onChange(selected.filter((id) => id !== moduleId));
                   }
                 };
                 return (
                   <div className="space-y-2 border rounded-lg p-4 max-h-80 overflow-y-auto">
                     {(allModules || []).map((mod) => (
                       <div key={mod.id} className="flex items-center gap-3 py-1.5">
                         <Checkbox
                           id={`module-${mod.id}`}
                           checked={selected.includes(mod.id)}
                           onCheckedChange={(checked) => toggleModule(mod.id, checked === true)}
                         />
                         <label htmlFor={`module-${mod.id}`} className="flex flex-col cursor-pointer">
                           <span className="text-sm font-medium">{mod.name}</span>
                           <span className="text-[11px] text-muted-foreground font-mono">{mod.id}</span>
                         </label>
                       </div>
                     ))}
                   </div>
                 );
               }} />
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

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <Label className="font-bold">Límites Técnicos Extra</Label>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendExtraLimit({ key: '', value: 0 })}
                    >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Añadir campo
                    </Button>
                </div>
                <div className="space-y-3">
                    {extraLimitFields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-end bg-muted/20 p-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex-1 space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre del Campo</Label>
                                <Input {...register(`extraLimits.${index}.key` as const)} placeholder="ej: max_storage_mb" />
                            </div>
                            <div className="w-32 space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor</Label>
                                <Input type="number" {...register(`extraLimits.${index}.value` as const, { valueAsNumber: true })} />
                            </div>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeExtraLimit(index)}
                                className="text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-4 w-4" />
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
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="font-bold">Características del Plan</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '', displayOrder: fields.length, groupKey: '' })}><PlusCircle className="mr-2 h-4 w-4 mr-2" /> Añadir</Button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <SortableFeatureItem key={field.id} id={field.id} index={index} register={register} remove={remove} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
