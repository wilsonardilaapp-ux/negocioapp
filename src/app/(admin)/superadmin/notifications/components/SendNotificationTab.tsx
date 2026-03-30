'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Business } from '@/models/business';
import { sendAdminNotification } from '@/actions/notifications';
import { Loader2, Send } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';

const notificationSchema = z.object({
  recipients: z.array(z.string()).min(1, "Debes seleccionar al menos un destinatario."),
  subject: z.string().min(3, "El asunto debe tener al menos 3 caracteres."),
  body: z.string().min(10, "El cuerpo del mensaje es demasiado corto."),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

export default function SendNotificationTab() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const businessesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'businesses'), [firestore]);
    const { data: businesses, isLoading: areBusinessesLoading } = useCollection<Business>(businessesQuery);
    
    const { control, handleSubmit, setValue, getValues, watch, reset, formState: { errors, isSubmitting } } = useForm<NotificationFormData>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            recipients: [],
            subject: '',
            body: ''
        }
    });

    const selectedRecipients = watch('recipients');

    const handleSelectAll = (checked: boolean) => {
        if (checked && businesses) {
            setValue('recipients', businesses.map(b => b.id));
        } else {
            setValue('recipients', []);
        }
    };

    const onSubmit = async (data: NotificationFormData) => {
        const result = await sendAdminNotification(data);
        if (result.success) {
            toast({
                title: "Notificaciones Enviadas",
                description: `El mensaje se ha enviado a ${data.recipients.length} destinatario(s).`
            });
            reset();
        } else {
            toast({
                variant: 'destructive',
                title: 'Error al Enviar',
                description: result.error,
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Enviar Notificación Masiva o Individual</CardTitle>
                <CardDescription>
                    Redacta y envía un mensaje a todos tus clientes o a clientes específicos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Label className="font-semibold">Paso 1: Selecciona los Destinatarios</Label>
                            {areBusinessesLoading ? (
                                <div className="flex items-center justify-center h-48 border rounded-md">
                                    <Loader2 className="h-6 w-6 animate-spin"/>
                                </div>
                            ) : (
                                <div className="border rounded-md p-4 space-y-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b">
                                        <Checkbox
                                            id="select-all"
                                            checked={businesses?.length === selectedRecipients.length && businesses.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <Label htmlFor="select-all" className="font-medium">Seleccionar Todos ({businesses?.length || 0})</Label>
                                    </div>
                                    <ScrollArea className="h-64">
                                        <div className="space-y-2">
                                            {businesses?.map(business => (
                                                <div key={business.id} className="flex items-center space-x-2">
                                                    <Controller
                                                        name="recipients"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Checkbox
                                                                id={business.id}
                                                                checked={field.value.includes(business.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...field.value, business.id])
                                                                        : field.onChange(field.value.filter(id => id !== business.id))
                                                                }}
                                                            />
                                                        )}
                                                    />
                                                    <Label htmlFor={business.id} className="font-normal flex flex-col">
                                                        <span>{business.name}</span>
                                                        <span className="text-xs text-muted-foreground">{business.ownerEmail}</span>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                             {errors.recipients && <p className="text-sm text-destructive">{errors.recipients.message}</p>}
                        </div>
                        <div className="space-y-4">
                            <Label className="font-semibold">Paso 2: Escribe tu Mensaje</Label>
                            <div>
                                <Label htmlFor="subject">Asunto</Label>
                                <Input id="subject" {...register('subject')} />
                                {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>}
                            </div>
                            <div>
                                <Label>Cuerpo del Mensaje</Label>
                                <Controller
                                    name="body"
                                    control={control}
                                    render={({ field }) => (
                                        <RichTextEditor value={field.value} onChange={field.onChange} />
                                    )}
                                />
                                {errors.body && <p className="text-sm text-destructive mt-1">{errors.body.message}</p>}
                            </div>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Notificación
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
