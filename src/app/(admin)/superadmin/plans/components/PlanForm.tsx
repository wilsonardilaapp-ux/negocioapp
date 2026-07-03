"use client";

import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { SubscriptionPlanSchema, type SubscriptionPlan } from '@/models/subscription-plan';
import { Trash2, PlusCircle, Loader2, GripVertical } from 'lucide-react';
import { useEffect, useMemo } from 'react';

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

interface PlanFormProps {
    existingPlan?: SubscriptionPlan | null;
    onClose: () => void;
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
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center bg-background rounded-md">
      <div {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-muted rounded">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input {...register(`features.${index}.value` as const)} placeholder={`Característica ${index + 1}`} />
      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function PlanForm({ existingPlan, onClose }: PlanFormProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<SubscriptionPlan>({
        resolver: zodResolver(SubscriptionPlanSchema),
    });

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "features",
    });

    const { fields: extraLimitFields, append: appendExtraLimit, remove: removeExtraLimit } = useFieldArray({
        control,
        name: "extraLimits",
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (existingPlan) {
            // Handle legacy string[] format for features
            const featuresAsObjects = ((existingPlan.features || []) as any[]).map((f, i) => 
                typeof f === 'string' ? { value: f, displayOrder: i } : { ...f, displayOrder: f.displayOrder ?? i }
            );

            // Al cargar, ordenar características por displayOrder ascendente
            featuresAsObjects.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

            reset({
                ...existingPlan,
                isActive: existingPlan.isActive ?? true,
                features: featuresAsObjects,
                extraLimits: existingPlan.extraLimits || [],
                limits: {
                    ...existingPlan.limits,
                    promotions: existingPlan.limits.promotions ?? 0,
                    coupons: existingPlan.limits.coupons ?? 0,
                    orders: existingPlan.limits.orders ?? -1,
                    suggestions: existingPlan.limits.suggestions ?? 0,
                }
            });
        } else {
            reset({
                id: '',
                name: '',
                description: '',
                price: 0,
                stripePriceId: '',
                isMostPopular: false,
                isActive: true,
                features: [{ value: '', displayOrder: 0 }],
                extraLimits: [],
                limits: {
                    products: 0,
                    blogPosts: 0,
                    landingPages: 0,
                    promotions: 0,
                    coupons: 0,
                    orders: -1,
                    suggestions: 0,
                }
            });
        }
    }, [existingPlan, reset]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = fields.findIndex((f) => f.id === active.id);
            const newIndex = fields.findIndex((f) => f.id === over?.id);
            move(oldIndex, newIndex);
        }
    };

    const onSubmit = (data: SubscriptionPlan) => {
        if (!user || !firestore) return;
        
        const planId = data.id;
        const planDocRef = doc(firestore, 'plans', planId);

        // Persistir el orden en displayOrder
        const dataToSave = {
            ...data,
            features: data.features.map((f, i) => ({ ...f, displayOrder: i }))
        };

        setDocumentNonBlocking(planDocRef, dataToSave, { merge: true });
        toast({
            title: `Plan ${existingPlan ? 'actualizado' : 'creado'}`,
            description: `El plan "${data.name}" se ha guardado correctamente.`,
        });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1 pr-4 text-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="id">ID del Plan</Label>
                    <Input id="id" {...register('id')} placeholder="ej. pro, enterprise" disabled={!!existingPlan} />
                    {errors.id && <p className="text-sm text-destructive mt-1 font-semibold">{errors.id.message}</p>}
                </div>
                <div>
                    <Label htmlFor="name">Nombre del Plan</Label>
                    <Input id="name" {...register('name')} placeholder="ej. Plan Profesional" />
                    {errors.name && <p className="text-sm text-destructive mt-1 font-semibold">{errors.name.message}</p>}
                </div>
            </div>

            <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" {...register('description')} placeholder="Una descripción corta y atractiva del plan." />
                {errors.description && <p className="text-sm text-destructive mt-1 font-semibold">{errors.description.message}</p>}
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="price">Precio (USD/mes)</Label>
                    <Input id="price" type="number" step="1" {...register('price', { valueAsNumber: true })} />
                    {errors.price && <p className="text-sm text-destructive mt-1 font-semibold">{errors.price.message}</p>}
                </div>
                <div>
                    <Label htmlFor="stripePriceId">ID de Precio de Stripe</Label>
                    <Input id="stripePriceId" {...register('stripePriceId')} placeholder="price_..." />
                    {errors.stripePriceId && <p className="text-sm text-destructive mt-1 font-semibold">{errors.stripePriceId.message}</p>}
                </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4 bg-card">
                <h4 className="font-bold text-lg">Límites (-1 para ilimitado)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="limits.products">Productos</Label>
                        <Input id="limits.products" type="number" {...register('limits.products', { valueAsNumber: true })} />
                    </div>
                    <div>
                        <Label htmlFor="limits.blogPosts">Posts de Blog</Label>
                        <Input id="limits.blogPosts" type="number" {...register('limits.blogPosts', { valueAsNumber: true })} />
                    </div>
                     <div>
                        <Label htmlFor="limits.landingPages">Landing Pages</Label>
                        <Input id="limits.landingPages" type="number" {...register('limits.landingPages', { valueAsNumber: true })} />
                    </div>
                    <div>
                        <Label htmlFor="limits.promotions">Promociones</Label>
                        <Input id="limits.promotions" type="number" {...register('limits.promotions', { valueAsNumber: true })} />
                    </div>
                    <div>
                        <Label htmlFor="limits.coupons">Cupones</Label>
                        <Input id="limits.coupons" type="number" {...register('limits.coupons', { valueAsNumber: true })} />
                    </div>
                    <div>
                        <Label htmlFor="limits.orders">Pedidos / mes</Label>
                        <Input id="limits.orders" type="number" {...register('limits.orders', { valueAsNumber: true })} />
                    </div>
                    <div>
                        <Label htmlFor="limits.suggestions">Sugerencias</Label>
                        <Input id="limits.suggestions" type="number" {...register('limits.suggestions', { valueAsNumber: true })} />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <Label className="font-bold">Campos Técnicos Extra</Label>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => appendExtraLimit({ key: '', value: 0 })}
                            className="font-bold"
                        >
                            <PlusCircle className="mr-2 h-4 w-4 mr-2" />
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
            </div>
            
            <div className="space-y-4 rounded-lg border p-4 bg-card">
                <h4 className="font-bold text-lg">Lista de Características</h4>
                
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={fields.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {fields.map((item, index) => (
                                <SortableFeatureItem
                                    key={item.id}
                                    id={item.id}
                                    index={index}
                                    register={register}
                                    remove={remove}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {errors.features && <p className="text-sm text-destructive mt-1 font-semibold">Todas las características deben tener contenido.</p>}
                
                <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '', displayOrder: fields.length })} className="font-bold">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Característica
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border">
                <div className="flex items-center space-x-2">
                    <Controller name="isActive" control={control} render={({ field }) => (
                        <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                    <div className="space-y-0.5">
                        <Label htmlFor="isActive" className="text-base font-bold">Plan Activo</Label>
                        <p className="text-xs text-muted-foreground">Define si el plan está disponible para los usuarios.</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Controller name="isMostPopular" control={control} render={({ field }) => (
                        <Switch id="isMostPopular" checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                    <div className="space-y-0.5">
                        <Label htmlFor="isMostPopular" className="text-base font-bold">Plan Destacado</Label>
                        <p className="text-xs text-muted-foreground">Muestra el badge "Más Popular" en la tabla de precios.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="font-bold">Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Guardando...' : existingPlan ? 'Guardar Cambios' : 'Crear Plan'}
                </Button>
            </div>
        </form>
    );
}