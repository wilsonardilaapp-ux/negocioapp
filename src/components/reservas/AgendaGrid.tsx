'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone,
  PlusCircle,
  Loader2,
  CalendarDays,
  Sparkles,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { StatusActions } from './StatusActions';
import type { Reservation } from '@/models/booking';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import { ReservationModal } from './ReservationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function AgendaGrid() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- RESOLUCIÓN DE BUSINESS ID (Contexto SaaS) ---
  const businessId = useMemo(() => {
    return (profile as any)?.businessId || (user as any)?.businessId || user?.uid || '';
  }, [user, profile]);

  // --- DATA FETCHING ---
  const resQuery = useMemoFirebase(() => {
    if (!businessId || !firestore) return null;
    return collection(firestore, `businesses/${businessId}/reservations`);
  }, [businessId, firestore]);

  const { data: rawReservations, isLoading } = useCollection<Reservation>(resQuery);

  // --- FILTRADO Y ORDENAMIENTO EN MEMORIA (Client-side) ---
  const dayReservations = useMemo(() => {
    if (!rawReservations) return [];
    const targetDate = selectedDate;
    return rawReservations
      .filter(res => res.date === targetDate && res.status !== 'cancelled')
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [rawReservations, selectedDate]);

  // --- HANDLERS DE EXPORTACIÓN ---
  const handleExportExcel = () => {
    if (dayReservations.length === 0) {
        toast({ variant: 'destructive', title: "Sin datos", description: "No hay citas para exportar en la fecha seleccionada." });
        return;
    }
    setIsExporting(true);
    try {
        const dataToExport = dayReservations.map(res => ({
            'Hora': res.startTime,
            'Cliente': res.customerName,
            'Teléfono': res.customerPhone,
            'Servicio': res.serviceName,
            'Especialista': res.staffName || 'No asignado',
            'Total ($)': res.price,
            'Estado': res.status.toUpperCase()
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agenda");
        XLSX.writeFile(wb, `Agenda_Reservas_${selectedDate}.xlsx`);
        toast({ title: "Excel generado", description: "La agenda del día se ha descargado." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error al exportar" });
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (dayReservations.length === 0) {
        toast({ variant: 'destructive', title: "Sin datos", description: "No hay citas para exportar en la fecha seleccionada." });
        return;
    }
    setIsExporting(true);
    try {
        const doc = new jsPDF();
        const bizName = profile?.name || 'Markix Business';
        const dateFormatted = format(new Date(selectedDate + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
        const totalRevenue = dayReservations.reduce((sum, r) => sum + (r.price || 0), 0);

        // 1. Encabezado Corporativo
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text("AGENDA DE RESERVAS", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Negocio: ${bizName.toUpperCase()}`, 14, 30);
        doc.text(`Fecha Agenda: ${dateFormatted.toUpperCase()}`, 14, 35);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 40);

        // 2. Resumen de la Jornada
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Resumen de la Jornada", 14, 52);
        
        (doc as any).autoTable({
            startY: 56,
            head: [['Métrica', 'Valor']],
            body: [
                ['Total Citas Agendadas', dayReservations.length.toString()],
                ['Recaudación Proyectada', formatCurrency(totalRevenue)]
            ],
            theme: 'striped',
            headStyles: { fillColor: [74, 175, 80] }
        });

        // 3. Tabla Cronológica
        const nextY = (doc as any).lastAutoTable.finalY + 15;
        doc.text("Detalle Cronológico de Citas", 14, nextY);

        (doc as any).autoTable({
            startY: nextY + 4,
            head: [['HORA', 'CLIENTE', 'SERVICIO', 'PROFESIONAL', 'TOTAL', 'ESTADO']],
            body: dayReservations.map(r => [
                r.startTime,
                r.customerName.toUpperCase(),
                r.serviceName,
                r.staffName || '---',
                formatCurrency(r.price),
                r.status.toUpperCase()
            ]),
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 }
        });

        doc.save(`Agenda_${selectedDate}.pdf`);
        toast({ title: "PDF generado", description: "El reporte de agenda está listo." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error al generar PDF" });
    } finally {
        setIsExporting(false);
    }
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
                
                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      type="button"
                      className="px-4 font-black text-sm border-x flex items-center gap-2 bg-white min-w-[200px] justify-center hover:bg-muted/30 transition-colors focus:outline-none"
                    >
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {format(new Date(selectedDate + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: es })}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedDate + 'T00:00:00')}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button variant="ghost" size="icon" onClick={() => navigateDay('next')} className="h-10 w-10 hover:bg-white"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="font-bold text-[10px] uppercase">Hoy</Button>
        </div>

        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel} 
                disabled={isExporting || dayReservations.length === 0}
                className="font-bold border-primary text-primary hover:bg-primary/5"
            >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Excel
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF} 
                disabled={isExporting || dayReservations.length === 0}
                className="font-bold border-primary text-primary hover:bg-primary/5"
            >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
                PDF
            </Button>
            <Button onClick={() => { setEditingReservation(null); setIsModalOpen(true); }} className="font-black shadow-lg shadow-primary/10">
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Reserva
            </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white rounded-3xl border border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando agenda...</p>
        </div>
      ) : dayReservations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {dayReservations.map((res) => (
            <Card key={res.id} className={cn("overflow-hidden transition-all hover:shadow-md border-gray-100", res.status === 'cancelled' && "opacity-50 grayscale")}>
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Clock className="h-4 w-4" /></div>
                    <span className="font-black text-lg">{res.startTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {res.status === 'completed' && res.pointsEarned && (
                       <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 animate-in zoom-in duration-500">
                          <Sparkles className="h-3 w-3" />
                          +{res.pointsEarned} pts
                       </Badge>
                    )}
                    <StatusBadge status={res.status} />
                  </div>
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
                      <span className="font-bold">{res.serviceName}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Especialista</span>
                      <span className="font-bold text-gray-600">{res.staffName || 'No asignado'}</span>
                   </div>
                   {res.rescheduleHistory && res.rescheduleHistory.length > 0 && (
                      <div className="pt-1 text-[10px] text-orange-600 font-bold italic">
                        * Turno reprogramado ({res.rescheduleHistory.length} cambios)
                      </div>
                   )}
                   <div className="flex justify-between pt-1 font-black text-primary border-t border-primary/5">
                      <span>Total</span>
                      <span>{formatCurrency(res.price)}</span>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4">
                 <StatusActions reservation={res} businessId={businessId} />
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
