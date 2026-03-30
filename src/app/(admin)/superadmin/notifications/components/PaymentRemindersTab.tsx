'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAllSubscriptions, type ClientWithSubscription } from '../../subscriptions/hooks/useAllSubscriptions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Send, MoreVertical, BellRing, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { sendAdminNotification } from '@/actions/notifications';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GlobalPaymentConfig } from '@/models/global-payment-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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


export default function PaymentRemindersTab() {
    const { clients, isLoading: areClientsLoading } = useAllSubscriptions();
    const [selectedClient, setSelectedClient] = useState<ClientWithSubscription | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const manualPaymentClients = useMemo(() => {
        return clients.filter(c => c.subscription && !c.subscription.stripeSubscriptionId);
    }, [clients]);

    const handleOpenModal = (client: ClientWithSubscription) => {
        setSelectedClient(client);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recordatorios de Pago Manuales</CardTitle>
                    <CardDescription>Gestiona y envía recordatorios a clientes con suscripciones de pago manual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Vencimiento</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {areClientsLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : manualPaymentClients.length > 0 ? (
                                    manualPaymentClients.map(client => {
                                        const { status, days, variant } = getStatus(client.subscription?.currentPeriodEnd?.toDate() ?? null);
                                        return (
                                        <TableRow key={client.userId}>
                                            <TableCell>{client.name}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{client.subscription?.plan}</Badge></TableCell>
                                            <TableCell>{client.subscription?.currentPeriodEnd ? format(client.subscription.currentPeriodEnd.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
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

            {selectedClient && (
                <ReminderModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    client={selectedClient}
                />
            )}
        </div>
    );
}


function ReminderModal({ isOpen, onClose, client }: { isOpen: boolean, onClose: () => void, client: ClientWithSubscription }) {
    const { toast } = useToast();
    const firestore = useFirestore();

    const paymentConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'payment_methods'), [firestore]);
    const { data: paymentConfig } = useDoc<GlobalPaymentConfig>(paymentConfigRef);

    const [amount, setAmount] = useState(0); // This should probably come from plan price
    const [dueDate, setDueDate] = useState(client.subscription?.currentPeriodEnd?.toDate().toISOString().split('T')[0] || '');
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