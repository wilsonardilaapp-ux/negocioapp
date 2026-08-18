'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone,
  MoreHorizontal,
  PlusCircle,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from './StatusBadge';
import type { Reservation, ReservationStatus } from '@/models/booking';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import { ReservationModal } from './ReservationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function AgendaGrid() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  // --- DATA FETCHING ---
  const resQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `businesses/${user.uid}/reservations`),
      where('date', '==', selectedDate),
      orderBy('startTime', 'asc')
    );
  }, [user, firestore, selectedDate]);

  const { data: reservations, isLoading } = useCollection<Reservation>(resQuery);

  const handleUpdateStatus = async (resId: string, newStatus: ReservationStatus) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, `businesses/${user.uid}/reservations`, resId);
    await updateDocumentNonBlocking(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
  };

  const handleDelete = async (resId: string) => {
    if (!user || !firestore || !confirm('¿Eliminar esta reserva permanentemente?')) return;
    const docRef = doc(firestore, `businesses/${user.uid}/reservations`, resId);
    await deleteDocumentNonBlocking(docRef);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate + 'T00:00:00');
    const next = direction === 'next' ? addDays(current, 1) : subDays(current, 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-xl overflow-hidden bg-muted/20">
                <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')} className="h-10 w-10 hover:bg-white"><ChevronLeft className="h-4 w-4" /></Button>
                <div className="px-4 font-black text-sm border-x flex items-center gap-2 bg-white">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {format(new Date(selectedDate + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: es })}
                </div>
                <Button variant="ghost" size="icon" onClick={() => navigateDay('next')} className="h-10 w-10 hover:bg-white"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="font-bold text-[10px] uppercase">Hoy</Button>
        </div>

        <Button onClick={() => { setEditingReservation(null); setIsModalOpen(true); }} className="font-black shadow-lg shadow-primary/10">
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Reserva
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white rounded-3xl border border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando agenda...</p>
        </div>
      ) : reservations && reservations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {reservations.map((res) => (
            <Card key={res.id} className={cn("overflow-hidden transition-all hover:shadow-md border-gray-100", res.status === 'cancelled' && "opacity-50")}>
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Clock className="h-4 w-4" /></div>
                    <span className="font-black text-lg">{res.startTime}</span>
                  </div>
                  <StatusBadge status={res.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{res.customerName}</p>
                    <a 
                      href={`https://wa.me/${normalizePhoneNumber(res.customerPhone)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {res.customerPhone}
                    </a>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-dashed">
                   <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Servicio</span>
                      <span className="font-bold">{res.serviceId}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Especialista</span>
                      <span className="font-bold text-gray-600">{res.staffId || 'No asignado'}</span>
                   </div>
                   <div className="flex justify-between pt-1 font-black text-primary border-t border-primary/5">
                      <span>Total</span>
                      <span>{formatCurrency(res.price)}</span>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex-1 font-bold h-9">
                        Acciones <MoreHorizontal className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground">Estado</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(res.id, 'confirmed')} className="gap-2 text-blue-600 font-bold"><CheckCircle2 className="h-4 w-4" /> Confirmar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(res.id, 'completed')} className="gap-2 text-green-600 font-bold"><CheckCircle2 className="h-4 w-4" /> Completada</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(res.id, 'no_show')} className="gap-2 text-gray-600 font-bold"><XCircle className="h-4 w-4" /> No Asistió</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setEditingReservation(res); setIsModalOpen(true); }} className="gap-2"><Edit className="h-4 w-4" /> Reprogramar / Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(res.id, 'cancelled')} className="gap-2 text-red-600 font-bold"><Trash2 className="h-4 w-4" /> Cancelar Cita</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(res.id)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Eliminar Registro</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20 border-2 py-32">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
            <div className="p-4 bg-white rounded-3xl shadow-sm border">
                <CalendarDays className="h-12 w-12 text-muted-foreground/20" />
            </div>
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-800">No hay citas para hoy</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Aún no tienes registros para esta fecha. ¡Comienza a agendar ahora!
                </p>
            </div>
            <Button onClick={() => { setEditingReservation(null); setIsModalOpen(true); }} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5 h-12 px-8 rounded-xl">
                Agendar mi primera cita
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => !isLoading && setIsModalOpen(open)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none rounded-3xl">
          <DialogHeader className="p-8 pb-2">
            <DialogTitle className="text-2xl font-black">{editingReservation ? 'Editar Cita' : 'Nueva Reserva de Turno'}</DialogTitle>
            <DialogDescription className="text-sm font-medium">Gestiona los horarios y datos del cliente para este servicio.</DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-8">
            <ReservationModal 
                existingReservation={editingReservation} 
                onSave={() => {}} 
                onClose={() => setIsModalOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckCircle2(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>;
}

function XCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>;
}

function Edit(props: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>;
}
