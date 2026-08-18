'use client';

import { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Info, MessageSquare, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveNotificationSettings } from '@/actions/booking-notifications-settings';
import type { BookingNotificationSettings } from '@/models/booking-notifications';

const templateSchema = z.object({
    enabled: z.boolean(),
    message: z.string().min(10, 'El mensaje es demasiado corto.'),
});

const settingsSchema = z.object({
    onCreate: templateSchema,
    onConfirm: templateSchema,
    onReschedule: templateSchema,
    onCancel: templateSchema,
    onReminder: templateSchema,
});

export function NotificationSettingsForm({ businessId, initialSettings }: { businessId: string, initialSettings: BookingNotificationSettings }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const { register, control, handleSubmit, formState: { isDirty } } = useForm<BookingNotificationSettings>({
        resolver: zodResolver(settingsSchema),
        defaultValues: initialSettings
    });

    const onSubmit = (data: BookingNotificationSettings) => {
        startTransition(async () => {
            const result = await saveNotificationSettings(businessId, data);
            if (result.success) {
                toast({ title: 'Configuración guardada', description: 'Las plantillas de WhatsApp han sido actualizadas.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    const EventCard = ({ name, title, description }: { name: keyof BookingNotificationSettings, title: string, description: string }) => (
        <Card className="border-gray-100 overflow-hidden group">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 bg-muted/20">
                <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-primary" />
                        {title}
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold tracking-tight">{description}</CardDescription>
                </div>
                <Controller
                    name={`${name}.enabled`}
                    control={control}
                    render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                    )}
                />
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Contenido del Mensaje de WhatsApp</Label>
                    <Textarea 
                        {...register(`${name}.message`)} 
                        rows={4} 
                        className="bg-muted/10 resize-none text-sm border-2 focus-visible:ring-primary/20"
                        placeholder="Escribe el mensaje que recibirá el cliente..."
                    />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EventCard name="onCreate" title="Solicitud Recibida" description="Al agendar desde la web" />
                <EventCard name="onConfirm" title="Cita Confirmada" description="Al confirmar manualmente" />
                <EventCard name="onReschedule" title="Cita Reprogramada" description="Al cambiar fecha o profesional" />
                <EventCard name="onCancel" title="Cita Cancelada" description="Al anular el turno" />
                <div className="md:col-span-2">
                   <EventCard name="onReminder" title="Recordatorio de Turno" description="Plantilla para envío manual de aviso de cita" />
                </div>
            </div>

            <Card className="bg-primary/5 border-primary/10 rounded-2xl border-2">
                <CardContent className="pt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="p-3 bg-white rounded-xl shadow-sm"><Info className="h-6 w-6 text-primary" /></div>
                    <div className="space-y-2 flex-1">
                        <p className="text-xs text-primary font-black uppercase tracking-widest">Personalización Dinámica</p>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                            Utiliza estas etiquetas para que el sistema las reemplace automáticamente con datos reales del pedido:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {['{cliente}', '{negocio}', '{servicio}', '{profesional}', '{fecha}', '{hora}', '{precio}', '{motivo}'].map(tag => (
                                <Badge key={tag} variant="outline" className="bg-white border-primary/20 text-primary text-[10px] font-mono px-2 py-0.5">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end sticky bottom-6 z-10">
                <Button type="submit" disabled={isPending || !isDirty} className="font-black px-12 h-14 text-lg shadow-2xl rounded-2xl">
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Guardar Plantillas
                </Button>
            </div>
        </form>
    );
}
