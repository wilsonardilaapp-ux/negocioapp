
'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAllSubscriptions, type ClientWithSubscription } from '../../subscriptions/hooks/useAllSubscriptions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Send, BellRing, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, collectionGroup, writeBatch, setDoc, orderBy, type Timestamp } from 'firebase/firestore';
import { sendAdminNotification } from '@/actions/notifications';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GlobalPaymentConfig } from '@/models/global-payment-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ScheduledReminder } from '@/models/notification';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';


// --- Helper Function ---
const safeToDate = (dateValue: string | undefined): Date => {
  const futureDate = new Date('9999-12-31');
  if (!dateValue) return futureDate;
  
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? futureDate : date;
  }
  
  return futureDate;
};


// --- Scheduled Reminder Components ---

const scheduledReminderSchema = z.object({
  clientId: z.string().min(1, 'Debes seleccionar un cliente.'),
  reminders: z.array(z.object({
    scheduledDate: z.date({ required_error: 'La fecha es obligatoria.' }),
    scheduledTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Formato de hora inválido (HH:mm).' }),
    channel: z.enum(['panel', 'whatsapp', 'both']),
    message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres.'),
  })).min(1, 'Debes agregar al menos un recordatorio.'),
});

type ScheduledReminderFormData = z.infer<typeof scheduledReminderSchema>;

const ScheduleReminderModal = ({
  isOpen,
  onClose,
  clients,
  existingSchedule,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientWithSubscription[];
  existingSchedule?: ScheduledReminder | null;
  onDelete: (reminderId: string, clientId: string) => Promise<void>;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const { control, handleSubmit, register, reset, watch, formState: { errors, isSubmitting } } = useForm<ScheduledReminderFormData>({
    resolver: zodResolver(scheduledReminderSchema),
    defaultValues: {
      clientId: existingSchedule?.clientId || '',
      reminders: existingSchedule ? [{
        scheduledDate: safeToDate(existingSchedule.scheduledDate),
        scheduledTime: format(safeToDate(existingSchedule.scheduledDate), 'HH:mm'),
        channel: existingSchedule.channel,
        message: existingSchedule.message,
      }] : [{
        scheduledDate: new Date(),
        scheduledTime: '09:00',
        channel: 'panel',
        message: 'Hola {nombre}, este es un recordatorio de pago para tu plan {plan}. El monto es de {monto} con fecha límite {fecha_limite}.',
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "reminders" });

  useEffect(() => {
    if (existingSchedule) {
        const date = safeToDate(existingSchedule.scheduledDate);
        reset({
            clientId: existingSchedule.clientId,
            reminders: [{
                scheduledDate: date,
                scheduledTime: format(date, 'HH:mm'),
                channel: existingSchedule.channel,
                message: existingSchedule.message,
            }]
        })
    } else {
        reset({
             clientId: '',
             reminders: [{
                scheduledDate: new Date(),
                scheduledTime: '09:00',
                channel: 'panel',
                message: 'Hola {nombre}, este es un recordatorio de pago para tu plan {plan}. El monto es de {monto} con fecha límite {fecha_limite}.',
            }]
        })
    }
  }, [existingSchedule, reset]);
  

  const onSubmit = async (data: ScheduledReminderFormData) => {
    if (!firestore || !user) return;
    
    const client = clients.find(c => c.userId === data.clientId);
    if (!client) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cliente no encontrado.' });
        return;
    }

    try {
        const batch = writeBatch(firestore);
        
        data.reminders.forEach(reminder => {
            const reminderId = existingSchedule?.id || doc(collection(firestore, `businesses/${data.clientId}/reminders`)).id;
            const reminderRef = doc(firestore, `businesses/${data.clientId}/reminders`, reminderId);
            
            const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);
            const combinedDate = new Date(reminder.scheduledDate);
            combinedDate.setHours(hours, minutes, 0, 0);

            const reminderData: Omit<ScheduledReminder, 'id'> = {
                clientId: data.clientId,
                clientName: client.name,
                scheduledDate: combinedDate.toISOString(),
                channel: reminder.channel,
                message: reminder.message,
                status: 'pending',
                createdAt: (existingSchedule?.createdAt ? new Date(existingSchedule.createdAt) : new Date()).toISOString(),
                sentAt: null,
            };
            batch.set(reminderRef, reminderData, { merge: true });
        });

        await batch.commit();

        toast({
            title: `Programación ${existingSchedule ? 'actualizada' : 'guardada'}`,
            description: `Se han programado ${data.reminders.length} recordatorio(s) para ${client.name}.`,
        });
        onClose();
        reset();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
    const handleDelete = async () => {
        if (!existingSchedule) return;
        await onDelete(existingSchedule.id, existingSchedule.clientId);
        onClose();
    };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{existingSchedule ? 'Editar' : 'Programar'} Recordatorios Automáticos</DialogTitle>
                <DialogDescription>Selecciona un cliente y define cuándo y cómo enviar los recordatorios.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                         <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!existingSchedule}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar un cliente..." /></SelectTrigger>
                            <SelectContent>
                                {clients.map(c => <SelectItem key={c.userId} value={c.userId}>{c.name} ({c.email})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                 {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
                
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 relative">
                            {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>Fecha de Envío</Label>
                                        <Controller
                                            name={`reminders.${index}.scheduledDate`}
                                            control={control}
                                            render={({ field }) => (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar fecha</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                                </Popover>
                                            )}
                                        />
                                        {errors.reminders?.[index]?.scheduledDate && <p className="text-sm text-destructive">{errors.reminders?.[index]?.scheduledDate?.message}</p>}
                                    </div>
                                     <div>
                                        <Label>Hora (24h)</Label>
                                        <Input type="time" {...register(`reminders.${index}.scheduledTime`)} />
                                        {errors.reminders?.[index]?.scheduledTime && <p className="text-sm text-destructive">{errors.reminders?.[index]?.scheduledTime?.message}</p>}
                                    </div>
                                </div>
                                <div>
                                    <Label>Canal de Envío</Label>
                                     <Controller
                                        name={`reminders.${index}.channel`}
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="panel">Al Panel del Cliente</SelectItem>
                                                    <SelectItem value="whatsapp">Por WhatsApp</SelectItem>
                                                    <SelectItem value="both">Ambos Canales</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                             <div>
                                <Label>Mensaje</Label>
                                <Textarea {...register(`reminders.${index}.message`)} rows={4} />
                                <p className="text-xs text-muted-foreground">Variables: {"{nombre}, {plan}, {monto}, {fecha_limite}"}</p>
                                {errors.reminders?.[index]?.message && <p className="text-sm text-destructive">{errors.reminders?.[index]?.message?.message}</p>}
                            </div>
                        </Card>
                    ))}
                </div>

                {!existingSchedule && (
                     <Button type="button" variant="outline" size="sm" onClick={() => append({ scheduledDate: new Date(), scheduledTime: '09:00', channel: 'panel', message: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Recordatorio
                    </Button>
                )}
               
                <DialogFooter>
                    {existingSchedule && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button type="button" variant="destructive" className="mr-auto">
                                  Cancelar Notificación
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente la notificación programada. No se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                  Sí, cancelar notificación
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                    )}
                    <Button type="button" variant="ghost" onClick={onClose}>
                        {existingSchedule ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar Programación
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
};


const ScheduledRemindersTable = ({
    reminders,
    onEdit,
    onDelete,
    isLoading,
} : {
    reminders: ScheduledReminder[],
    onEdit: (reminder: ScheduledReminder) => void,
    onDelete: (reminderId: string, clientId: string) => Promise<void>,
    isLoading: boolean,
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recordatorios Programados</CardTitle>
                <CardDescription>Estos recordatorios se enviarán automáticamente en la fecha indicada.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha Programada</TableHead>
                                <TableHead>Canal</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : reminders.length > 0 ? (
                                reminders.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.clientName}</TableCell>
                                        <TableCell>{format(safeToDate(r.scheduledDate), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{r.channel}</Badge></TableCell>
                                        <TableCell><Badge variant={r.status === 'sent' ? 'default' : 'secondary'} className="capitalize">{r.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => onEdit(r)} disabled={r.status === 'sent'}>Editar</Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-destructive">Eliminar</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onDelete(r.id, r.clientId)} className="bg-destructive hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay recordatorios programados.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};


// --- Original Components (Manual Reminder) ---
type ReminderStatus = 'Al día' | 'Por vencer' | 'Vencido';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

const getStatus = (dueDate: Date | null): { status: ReminderStatus; days: number; variant: 'default' | 'secondary' | 'destructive' } => {
    if (!dueDate) return { status: 'Al día', days: 999, variant: 'default' };
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);

    if (daysUntilDue < 0) return { status: 'Vencido', days: daysUntilDue, variant: 'destructive' };
    if (daysUntilDue <= 7) return { status: 'Por vencer', days: daysUntilDue, variant: 'secondary' };
    return { status: 'Al día', days: daysUntilDue, variant: 'default' };
};


function ReminderModal({ isOpen, onClose, client }: { isOpen: boolean, onClose: () => void, client: ClientWithSubscription }) {
    const { toast } = useToast();
    const firestore = useFirestore();

    const paymentConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'payment_methods'), [firestore]);
    const { data: paymentConfig } = useDoc<GlobalPaymentConfig>(paymentConfigRef);

    const [amount, setAmount] = useState(0); 
    const [dueDate, setDueDate] = useState(client.subscription?.currentPeriodEnd ? safeToDate(client.subscription.currentPeriodEnd.toDate().toISOString()).toISOString().split('T')[0] : '');
    const [suspensionDate, setSuspensionDate] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if(client && paymentConfig) {
            let paymentDetails = 'Puedes realizar tu pago a través de los siguientes métodos:\n';
            if (paymentConfig.nequi.enabled) paymentDetails += `\n- Nequi: ${paymentConfig.nequi.accountNumber}`;
            if (paymentConfig.bancolombia.enabled) paymentDetails += `\n- Bancolombia: ${paymentConfig.bancolombia.accountNumber}`;
            if (paymentConfig.daviplata.enabled) paymentDetails += `\n- Daviplata: ${paymentConfig.daviplata.accountNumber}`;

            setMessage(
`Hola ${client.name},

Este es un recordatorio amigable sobre tu suscripción al Plan ${client.subscription?.plan?.toUpperCase()}.

Monto a Pagar: ${formatCurrency(amount)}
Fecha Límite de Pago: ${dueDate ? format(new Date(dueDate), 'PPP', {locale: es}) : 'N/A'}

${paymentDetails}

Recuerda que si no recibimos tu pago, tu cuenta será suspendida el ${suspensionDate ? format(new Date(suspensionDate), 'PPP', {locale: es}) : 'N/A'}.

Gracias,
El equipo de Zentry`
            );
        }
    }, [client, paymentConfig, amount, dueDate, suspensionDate]);
    
    const sendToPanel = async () => {
        if (!client.userId) return;
        await sendAdminNotification({
            recipients: [client.userId],
            subject: `Recordatorio de Pago - Plan ${client.subscription?.plan?.toUpperCase()}`,
            body: message,
        });
        toast({ title: "Recordatorio enviado al panel del cliente." });
        onClose();
    };

    const sendToWhatsApp = () => {
        const whatsappNumber = client.phone || '';
        if (!whatsappNumber) {
            toast({ variant: 'destructive', title: 'Número de WhatsApp no encontrado.' });
            return;
        }
        const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Enviar Recordatorio de Pago a {client.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div><Label>Monto Adeudado</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
                        <div><Label>Fecha Límite</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                        <div><Label>Fecha Suspensión</Label><Input type="date" value={suspensionDate} onChange={(e) => setSuspensionDate(e.target.value)} /></div>
                    </div>
                    <div>
                        <Label>Mensaje</Label>
                        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={12} />
                    </div>
                </div>
                <DialogFooter className="justify-between">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <div className="flex gap-2">
                        <Button onClick={sendToPanel}>Enviar al Panel</Button>
                        <Button onClick={sendToWhatsApp}>Enviar por WhatsApp</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Tab Component ---
export default function PaymentRemindersTab() {
    const { clients, isLoading: areClientsLoading } = useAllSubscriptions();
    const firestore = useFirestore();
    const { toast } = useToast();

    // State for manual reminders
    const [selectedClient, setSelectedClient] = useState<ClientWithSubscription | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    // State for scheduled reminders
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduledReminder | null>(null);
    const processingIdsRef = useRef<Set<string>>(new Set());


    const scheduledRemindersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collectionGroup(firestore, 'reminders');
    }, [firestore]);
    
    const { data: scheduledReminders, isLoading: areScheduledRemindersLoading } = useCollection<ScheduledReminder>(scheduledRemindersQuery);
    
    const [localReminders, setLocalReminders] = useState<ScheduledReminder[]>([]);
    
    useEffect(() => {
        if (scheduledReminders) {
            setLocalReminders(scheduledReminders);
        }
    }, [scheduledReminders]);

    const sortedReminders = useMemo(() => {
        if (!localReminders) return [];
        return [...localReminders].sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
    }, [localReminders]);

    const manualPaymentClients = useMemo(() => {
        return clients.filter(c => c.subscription && !c.subscription.stripeSubscriptionId);
    }, [clients]);

    // --- Handlers for manual reminders ---
    const handleOpenModal = (client: ClientWithSubscription) => {
        setSelectedClient(client);
        setIsManualModalOpen(true);
    };

    // --- Handlers for scheduled reminders ---
     const handleOpenScheduleModal = (reminder: ScheduledReminder | null) => {
        setEditingSchedule(reminder);
        setIsScheduleModalOpen(true);
    };

    const handleDeleteScheduledReminder = async (reminderId: string, clientId: string) => {
        if (!firestore || !clientId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo determinar el cliente del recordatorio.' });
            return;
        }
        try {
            const reminderRef = doc(firestore, `businesses/${clientId}/reminders`, reminderId);
            await deleteDocumentNonBlocking(reminderRef);
            setLocalReminders(prev => prev.filter(r => r.id !== reminderId));
            toast({ title: 'Recordatorio programado eliminado.' });
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo eliminar el recordatorio.' });
        }
    };

    // --- Auto-sending logic ---
    useEffect(() => {
        if (!localReminders || !firestore || !clients || clients.length === 0) return;
  
        const now = new Date();
        const remindersToSend = localReminders.filter(r => 
            r.status === 'pending' && 
            !processingIdsRef.current.has(r.id) &&
            safeToDate(r.scheduledDate) <= now
        );
  
        if (remindersToSend.length > 0) {
            
            const idsToProcess = new Set(remindersToSend.map(r => r.id));
            idsToProcess.forEach(id => processingIdsRef.current.add(id));
  
            const sendAndProcess = async () => {
                toast({ title: `Procesando ${idsToProcess.size} recordatorio(s) automáticos...` });
  
                const sendPromises = remindersToSend.map(async (reminder) => {
                    try {
                        const client = clients.find(c => c.userId === reminder.clientId);
                        if (!client) throw new Error(`Cliente ${reminder.clientId} no encontrado.`);
  
                        let message = reminder.message
                            .replace('{nombre}', client.name)
                            .replace('{plan}', client.subscription?.plan || 'N/A');
  
                        if (reminder.channel === 'panel' || reminder.channel === 'both') {
                            const result = await sendAdminNotification({
                                recipients: [reminder.clientId],
                                subject: 'Recordatorio de Pago Programado',
                                body: message
                            });
                             if (!result.success) {
                                throw new Error(result.error || 'La acción del servidor para enviar notificación falló.');
                            }
                        }
                        if (reminder.channel === 'whatsapp' || reminder.channel === 'both') {
                            if (client.phone) {
                              const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                              window.open(whatsappUrl, `_blank_wa_${reminder.id}`);
                            } else {
                              console.warn(`Recordatorio ${reminder.id} para ${client.name} no enviado a WhatsApp por falta de número.`);
                            }
                        }
                        return reminder; // Return the reminder on success
                    } catch (error) {
                        console.error(`Error enviando recordatorio ${reminder.id}:`, error);
                        // Attach reminder ID to the error for identification
                        (error as any).reminderId = reminder.id;
                        throw error;
                    }
                });
  
                const results = await Promise.allSettled(sendPromises);
  
                const successfulReminders = results
                    .filter((res): res is PromiseFulfilledResult<ScheduledReminder> => res.status === 'fulfilled')
                    .map(res => res.value);
                    
                const failedReminders = results
                    .filter((res): res is PromiseRejectedResult => res.status === 'rejected');
  
                if (failedReminders.length > 0) {
                    toast({
                        variant: "destructive",
                        title: `Error en ${failedReminders.length} envío(s)`,
                        description: "Algunos recordatorios no se pudieron enviar. Permanecerán como pendientes."
                    });
                    failedReminders.forEach(res => {
                        const reminderId = (res.reason as any)?.reminderId;
                        if (reminderId) {
                            processingIdsRef.current.delete(reminderId);
                        }
                    });
                }
  
                if (successfulReminders.length > 0) {
                    const batch = writeBatch(firestore);
                    successfulReminders.forEach(reminder => {
                        const reminderRef = doc(firestore, `businesses/${reminder.clientId}/reminders`, reminder.id);
                        batch.set(reminderRef, { status: 'sent', sentAt: new Date().toISOString() }, { merge: true });
                    });
                    await batch.commit();
                    toast({ title: "Envío completado", description: `${successfulReminders.length} recordatorio(s) enviados.` });
                }
            };
  
            sendAndProcess().catch(err => {
                console.error("Error crítico en el proceso de envío:", err);
                toast({
                    variant: "destructive",
                    title: "Error Inesperado",
                    description: "Ocurrió un error al procesar los envíos. Los reintentaremos más tarde."
                });
                idsToProcess.forEach(id => processingIdsRef.current.delete(id));
            });
        }
      }, [localReminders, firestore, clients, toast]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className='flex-row justify-between items-center'>
                     <div>
                        <CardTitle>Recordatorios de Pago Manuales</CardTitle>
                        <CardDescription>Gestiona y envía recordatorios a clientes con suscripciones de pago manual.</CardDescription>
                    </div>
                     <Button onClick={() => handleOpenScheduleModal(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Programar Recordatorios
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Cliente</TableHead><TableHead>Plan</TableHead>
                                <TableHead>Vencimiento</TableHead><TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {areClientsLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : manualPaymentClients.length > 0 ? (
                                    manualPaymentClients.map(client => {
                                        const dueDate = client.subscription?.currentPeriodEnd ? safeToDate(client.subscription.currentPeriodEnd.toDate().toISOString()) : null;
                                        const { status, days, variant } = getStatus(dueDate);
                                        return (
                                        <TableRow key={client.userId}>
                                            <TableCell>{client.name}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{client.subscription?.plan}</Badge></TableCell>
                                            <TableCell>{dueDate ? format(dueDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                            <TableCell><Badge variant={variant}>{status} {days < 999 && days >= 0 ? `(${days} días)`: ''}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(client)}>
                                                    <BellRing className="mr-2 h-4 w-4" /> Enviar Recordatorio
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay clientes con pago manual.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ScheduledRemindersTable 
                reminders={sortedReminders}
                isLoading={areScheduledRemindersLoading}
                onEdit={handleOpenScheduleModal}
                onDelete={handleDeleteScheduledReminder}
            />

            {selectedClient && (
                <ReminderModal 
                    isOpen={isManualModalOpen}
                    onClose={() => setIsManualModalOpen(false)}
                    client={selectedClient}
                />
            )}

            <ScheduleReminderModal 
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                clients={manualPaymentClients}
                existingSchedule={editingSchedule}
                onDelete={handleDeleteScheduledReminder}
            />
        </div>
    );
}
