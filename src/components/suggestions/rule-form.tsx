'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { SuggestionRule, DayOfWeek } from '@/models/suggestion-rule';
import type { Product } from '@/models/product';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';

const ruleSchema = z.object({
    triggerItem: z.string().min(1, 'Debes seleccionar un producto disparador'),
    suggestedItem: z.string().min(1, 'Debes seleccionar un producto a sugerir'),
    suggestionType: z.enum(['cross-sell', 'upsell', 'bundle']),
    active: z.boolean(),
    priority: z.preprocess(val => Number(val), z.number().min(1).max(10)),
    timezone: z.string().optional(),
    fallbackToAI: z.boolean().optional(), // Añadido al schema
    conditions: z.object({
        timeRange: z.object({
            start: z.string().optional(),
            end: z.string().optional(),
        }).optional(),
        daysOfWeek: z.array(z.string()).optional(),
        minPrice: z.preprocess(val => Number(val) || 0, z.number().optional()),
        maxPrice: z.preprocess(val => Number(val) || 0, z.number().optional()),
    }),
});

type RuleFormData = z.infer<typeof ruleSchema>;

interface RuleFormProps {
    existingRule?: SuggestionRule | null;
    products: Product[];
    onClose: () => void;
}

const days: DayOfWeek[] = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const TIMEZONES = [
  { value: 'America/Bogota', label: '🇨🇴 Colombia / 🇵🇪 Perú / 🇪🇨 Ecuador (GMT-5)' },
  { value: 'America/Mexico_City', label: '🇲🇽 México CDMX (GMT-6)' },
  { value: 'America/New_York', label: '🇺🇸 USA Este (Miami/NY) (GMT-5/4)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 USA Oeste (LA/SF) (GMT-8/7)' },
  { value: 'America/Argentina/Buenos_Aires', label: '🇦🇷 Argentina (GMT-3)' },
  { value: 'America/Santiago', label: '🇨🇱 Chile (GMT-4/3)' },
  { value: 'Europe/Madrid', label: '🇪🇸 España (GMT+1/2)' },
  { value: 'America/Caracas', label: '🇻🇪 Venezuela (GMT-4)' },
];


export default function RuleForm({ existingRule, products, onClose }: RuleFormProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<RuleFormData>({
        resolver: zodResolver(ruleSchema),
        defaultValues: {
            triggerItem: existingRule?.triggerItem || '',
            suggestedItem: existingRule?.suggestedItem || '',
            suggestionType: existingRule?.suggestionType || 'cross-sell',
            active: existingRule?.active ?? true,
            priority: existingRule?.priority || 1,
            timezone: existingRule?.timezone || 'America/Bogota',
            fallbackToAI: existingRule?.fallbackToAI || false,
            conditions: {
                timeRange: existingRule?.conditions.timeRange || { start: '', end: '' },
                daysOfWeek: existingRule?.conditions.daysOfWeek || [],
                minPrice: existingRule?.conditions.minPrice || 0,
                maxPrice: existingRule?.conditions.maxPrice || 0,
            }
        },
    });

    const onSubmit = (data: RuleFormData) => {
        if (!user || !firestore) return;

        const ruleId = existingRule?.id || doc(collection(firestore, 'suggestionRules')).id;
        const ruleDocRef = doc(firestore, `businesses/${user.uid}/suggestionRules`, ruleId);

        const ruleToSave: Omit<SuggestionRule, 'id'> = {
            businessId: user.uid,
            triggerItem: data.triggerItem,
            suggestedItem: data.suggestedItem,
            suggestionType: data.suggestionType,
            active: data.active,
            priority: data.priority,
            timezone: data.timezone,
            fallbackToAI: data.fallbackToAI, // Guardar el nuevo campo
            conditions: {
                timeRange: (data.conditions.timeRange?.start && data.conditions.timeRange?.end) 
                    ? { start: data.conditions.timeRange.start, end: data.conditions.timeRange.end } 
                    : undefined,
                daysOfWeek: data.conditions.daysOfWeek as DayOfWeek[],
                minPrice: data.conditions.minPrice,
                maxPrice: data.conditions.maxPrice,
            },
            metrics: existingRule?.metrics || { timesShown: 0, timesAccepted: 0, revenueGenerated: 0, conversionRate: 0 },
            createdAt: existingRule?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setDocumentNonBlocking(ruleDocRef, ruleToSave, { merge: true });
        toast({
            title: `Regla ${existingRule ? 'actualizada' : 'creada'}`,
            description: "La regla de sugerencia se ha guardado correctamente.",
        });
        onClose();
    };
    
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="triggerItem">Si el cliente agrega...</Label>
                    <Controller
                        name="triggerItem"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="triggerItem"><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
                                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                    />
                     {errors.triggerItem && <p className="text-sm text-destructive mt-1">{errors.triggerItem.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="suggestedItem">Entonces sugerir...</Label>
                    <Controller
                        name="suggestedItem"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="suggestedItem"><SelectValue placeholder="Selecciona una sugerencia" /></SelectTrigger>
                                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                    />
                    {errors.suggestedItem && <p className="text-sm text-destructive mt-1">{errors.suggestedItem.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="suggestionType">Tipo de Sugerencia</Label>
                    <Controller
                        name="suggestionType"
                        control={control}
                        render={({ field }) => (
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="suggestionType"><SelectValue placeholder="Tipo de sugerencia" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cross-sell">Venta Cruzada (Cross-sell)</SelectItem>
                                    <SelectItem value="upsell">Venta Superior (Upsell)</SelectItem>
                                    <SelectItem value="bundle">Paquete (Bundle)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <div>
                    <Label htmlFor="priority">Prioridad (1-10)</Label>
                    <Input id="priority" type="number" min="1" max="10" {...register('priority')} />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Controller name="fallbackToAI" control={control} render={({ field }) => (
                    <Switch id="fallbackToAI" checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <Label htmlFor="fallbackToAI" className="flex flex-col">
                    <span>Usar IA como respaldo</span>
                    <span className="font-normal text-xs text-muted-foreground">
                        Si esta regla no cumple las condiciones (ej. por horario), la IA buscará una sugerencia alternativa.
                    </span>
                </Label>
            </div>
            
            <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold">Condiciones (Opcional)</h4>
                 <div>
                    <Label htmlFor="timezone">Zona Horaria de la Regla</Label>
                     <Controller
                        name="timezone"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="timezone"><SelectValue placeholder="Selecciona una zona horaria" /></SelectTrigger>
                                <SelectContent>
                                    {TIMEZONES.map(tz => (
                                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                     <p className="text-xs text-muted-foreground mt-1">La validación de hora y día se basará en esta zona horaria.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Rango de Horas</Label>
                        <div className="flex items-center gap-2">
                            <Input type="time" {...register('conditions.timeRange.start')} />
                            <span>-</span>
                            <Input type="time" {...register('conditions.timeRange.end')} />
                        </div>
                    </div>
                     <div>
                        <Label>Rango de Precios</Label>
                        <div className="flex items-center gap-2">
                            <Input type="number" placeholder="Mínimo" {...register('conditions.minPrice')} />
                            <span>-</span>
                            <Input type="number" placeholder="Máximo" {...register('conditions.maxPrice')} />
                        </div>
                    </div>
                </div>
                <div>
                    <Label>Días de la Semana</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                        {days.map(day => (
                             <Controller
                                key={day}
                                name="conditions.daysOfWeek"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={day}
                                            checked={field.value?.includes(day)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), day])
                                                : field.onChange(field.value?.filter(value => value !== day))
                                            }}
                                        />
                                        <Label htmlFor={day} className="capitalize text-sm font-normal">{day}</Label>
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : existingRule ? 'Guardar Cambios' : 'Crear Regla'}
                </Button>
            </div>
        </form>
    );
}
