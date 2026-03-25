
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { NuevoItemForm, TipoItem } from '@/types/kardex.types';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const itemSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().min(1, 'El código es requerido'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  tipoItem: z.enum(['producto', 'insumo']),
  categoria: z.string().min(1, 'La categoría es requerida'),
  unidadMedida: z.string().min(1, 'La unidad de medida es requerida'),
  stockMinimo: z.preprocess(val => Number(val), z.number().min(0)),
  stockMaximo: z.preprocess(val => Number(val), z.number().min(0)),
  costoUnitario: z.preprocess(val => Number(val), z.number().min(0)),
  cuentaContablePUC: z.string().optional(),
  bodega: z.string().min(1, 'La bodega es requerida'),
}).refine(data => data.stockMaximo >= data.stockMinimo, {
    message: 'El stock máximo debe ser mayor o igual al mínimo',
    path: ['stockMaximo'],
});

interface ItemFormProps {
    existingItem?: NuevoItemForm | null;
    onSave: (data: NuevoItemForm) => void;
    onClose: () => void;
}

export default function ItemForm({ existingItem, onSave, onClose }: ItemFormProps) {
    const { toast } = useToast();
    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<NuevoItemForm>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            tipoItem: 'producto',
            unidadMedida: 'unidad',
        }
    });

    useEffect(() => {
        if (existingItem) {
            reset(existingItem);
        } else {
            reset({
                id: undefined,
                codigo: '',
                nombre: '',
                tipoItem: 'producto',
                categoria: '',
                unidadMedida: 'unidad',
                stockMinimo: 0,
                stockMaximo: 0,
                costoUnitario: 0,
                cuentaContablePUC: '',
                bodega: 'Principal',
            });
        }
    }, [existingItem, reset]);

    const onSubmit = (data: NuevoItemForm) => {
        onSave(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="codigo">Código / SKU</Label><Input id="codigo" {...register('codigo')} />{errors.codigo && <p className="text-sm text-destructive mt-1">{errors.codigo.message}</p>}</div>
                <div><Label htmlFor="nombre">Nombre del Ítem</Label><Input id="nombre" {...register('nombre')} />{errors.nombre && <p className="text-sm text-destructive mt-1">{errors.nombre.message}</p>}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div><Label>Tipo de Ítem</Label><Controller name="tipoItem" control={control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="producto">Producto</SelectItem><SelectItem value="insumo">Insumo</SelectItem></SelectContent></Select> )}/></div>
                <div><Label htmlFor="categoria">Categoría</Label><Input id="categoria" {...register('categoria')} />{errors.categoria && <p className="text-sm text-destructive mt-1">{errors.categoria.message}</p>}</div>
                <div><Label htmlFor="unidadMedida">Unidad de Medida</Label><Input id="unidadMedida" {...register('unidadMedida')} />{errors.unidadMedida && <p className="text-sm text-destructive mt-1">{errors.unidadMedida.message}</p>}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label htmlFor="stockMinimo">Stock Mínimo</Label><Input id="stockMinimo" type="number" {...register('stockMinimo')} />{errors.stockMinimo && <p className="text-sm text-destructive mt-1">{errors.stockMinimo.message}</p>}</div>
                <div><Label htmlFor="stockMaximo">Stock Máximo</Label><Input id="stockMaximo" type="number" {...register('stockMaximo')} />{errors.stockMaximo && <p className="text-sm text-destructive mt-1">{errors.stockMaximo.message}</p>}</div>
                <div><Label htmlFor="costoUnitario">Costo Unitario</Label><Input id="costoUnitario" type="number" step="any" {...register('costoUnitario')} />{errors.costoUnitario && <p className="text-sm text-destructive mt-1">{errors.costoUnitario.message}</p>}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="cuentaContablePUC">Cuenta Contable (PUC)</Label><Input id="cuentaContablePUC" {...register('cuentaContablePUC')} /></div>
                <div><Label htmlFor="bodega">Bodega Principal</Label><Input id="bodega" {...register('bodega')} />{errors.bodega && <p className="text-sm text-destructive mt-1">{errors.bodega.message}</p>}</div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {existingItem ? 'Guardar Cambios' : 'Crear Ítem'}</Button>
            </div>
        </form>
    );
}
