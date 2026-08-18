'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Save, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { AvailabilityGrid } from '@/components/reservas/AvailabilityGrid';
import type { BookingAvailability } from '@/models/booking';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Página administrativa para configurar la disponibilidad global de atención semanal.
 */

const defaultAvailability: BookingAvailability[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isOpen: i < 5, // L-V abierto por defecto
  shifts: [{ start: '08:00', end: '18:00' }],
  breaks: [{ start: '13:00', end: '14:00' }]
}));

export default function HorariosPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<BookingAvailability[]>(defaultAvailability);

  // Consulta a la subcolección de disponibilidad
  const availabilityQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return collection(firestore, `businesses/${user.uid}/bookingAvailability`);
  }, [user?.uid, firestore]);

  const { data: savedAvailability, isLoading } = useCollection<BookingAvailability>(availabilityQuery);

  useEffect(() => {
    if (savedAvailability && savedAvailability.length > 0) {
      // Sincronizar datos de Firestore con la matriz local de 7 días
      const newAvail = [...defaultAvailability];
      savedAvailability.forEach(item => {
        if (item.dayOfWeek >= 0 && item.dayOfWeek < 7) {
          newAvail[item.dayOfWeek] = item;
        }
      });
      setLocalAvailability(newAvail);
    }
  }, [savedAvailability]);

  const handleDayUpdate = (index: number, updates: Partial<BookingAvailability>) => {
    setLocalAvailability(prev => prev.map((day, i) => 
      i === index ? { ...day, ...updates } : day
    ));
  };

  const handleSave = async () => {
    if (!user || !firestore) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      const colRef = collection(firestore, `businesses/${user.uid}/bookingAvailability`);
      
      localAvailability.forEach(day => {
        // ID de documento basado en el índice del día (0-6) para acceso determinista
        const docRef = doc(colRef, day.dayOfWeek.toString());
        batch.set(docRef, day, { merge: true });
      });

      await batch.commit();
      toast({ title: 'Configuración guardada', description: 'Tus horarios de atención han sido actualizados.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de sincronización', description: 'No se pudieron guardar los cambios en la base de datos.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            Horarios de Atención
          </h1>
          <p className="text-muted-foreground">Define la jornada de trabajo para el agendamiento online.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading} className="font-bold shadow-lg h-12 px-8">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Horarios
        </Button>
      </header>

      <ReservasTabs />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-dashed">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Recuperando matriz de turnos...</p>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-3 duration-600">
              <AvailabilityGrid 
                availability={localAvailability} 
                onChange={handleDayUpdate} 
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-inner rounded-3xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm"><Info className="h-5 w-5 text-primary" /></div>
                <CardTitle className="text-lg">Configuración Global</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs space-y-4 text-gray-700 leading-relaxed font-medium">
              <p>Esta matriz define los bloques horarios que los clientes verán al momento de realizar una reserva.</p>
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <p>La <strong>pausa</strong> bloquea automáticamente los turnos que coincidan con ese rango.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <p>Los días <strong>cerrados</strong> no se mostrarán en el selector de fechas público.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <p>La duración de los servicios afectará cuántas citas caben en cada jornada.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-2 border-gray-100 rounded-3xl overflow-hidden">
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estatus de Sincronización</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border-2 border-dashed">
                    <div className={cn("h-3 w-3 rounded-full shadow-sm", isSaving ? "bg-blue-500 animate-pulse" : "bg-green-500")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                        {isSaving ? 'Actualizando Nube...' : 'Servidor Actualizado'}
                    </span>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/10">
                <Button onClick={handleSave} variant="default" className="w-full font-black h-11" disabled={isSaving || isLoading}>
                    Confirmar Cambios
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
