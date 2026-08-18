'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Coffee, AlertCircle, ChevronRight } from 'lucide-react';
import type { BookingAvailability, TimeRange } from '@/models/booking';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Matriz interactiva para la configuración de disponibilidad semanal.
 */

const DAYS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

interface AvailabilityGridProps {
  availability: BookingAvailability[];
  onChange: (index: number, updates: Partial<BookingAvailability>) => void;
}

export function AvailabilityGrid({ availability, onChange }: AvailabilityGridProps) {
  
  const handleShiftChange = (index: number, field: keyof TimeRange, value: string) => {
    const day = availability[index];
    const newShifts = [...day.shifts];
    newShifts[0] = { ...newShifts[0], [field]: value };
    onChange(index, { shifts: newShifts });
  };

  const handleBreakChange = (index: number, field: keyof TimeRange, value: string) => {
    const day = availability[index];
    const newBreaks = day.breaks && day.breaks.length > 0 ? [...day.breaks] : [{ start: '13:00', end: '14:00' }];
    newBreaks[0] = { ...newBreaks[0], [field]: value };
    onChange(index, { breaks: newBreaks });
  };

  return (
    <div className="space-y-4">
      {DAYS.map((name, i) => {
        const day = availability[i] || { dayOfWeek: i, isOpen: false, shifts: [{start: '08:00', end: '18:00'}], breaks: [{start: '13:00', end: '14:00'}] };
        return (
          <Card key={i} className={cn(
            "transition-all border-l-4 shadow-sm", 
            day.isOpen ? "border-l-primary bg-white" : "border-l-gray-300 bg-muted/20 opacity-80"
          )}>
            <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Día y Estado Principal */}
              <div className="flex items-center justify-between lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r pb-4 lg:pb-0 lg:pr-6">
                <div className="space-y-0.5">
                  <span className="font-black text-base uppercase tracking-tighter text-gray-900">{name}</span>
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", day.isOpen ? "text-primary" : "text-muted-foreground")}>
                    {day.isOpen ? 'Abierto' : 'Cerrado'}
                  </p>
                </div>
                <Switch 
                  checked={day.isOpen} 
                  onCheckedChange={(val) => onChange(i, { isOpen: val })}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {day.isOpen ? (
                <div className="flex flex-col sm:flex-row flex-1 gap-8 animate-in fade-in slide-in-from-left-2 duration-400">
                  {/* Jornada Principal */}
                  <div className="space-y-2.5 flex-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                      <div className="p-1 bg-primary/10 rounded-md"><Clock className="h-3 w-3 text-primary" /></div> 
                      Horario de Atención
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Input 
                          type="time" 
                          value={day.shifts[0].start} 
                          onChange={(e) => handleShiftChange(i, 'start', e.target.value)}
                          className="h-10 font-bold bg-muted/30"
                        />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                      <div className="relative flex-1">
                        <Input 
                          type="time" 
                          value={day.shifts[0].end} 
                          onChange={(e) => handleShiftChange(i, 'end', e.target.value)}
                          className="h-10 font-bold bg-muted/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Descanso */}
                  <div className="space-y-2.5 flex-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                      <div className="p-1 bg-amber-100 rounded-md"><Coffee className="h-3 w-3 text-amber-600" /></div> 
                      Pausa / Almuerzo
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Input 
                          type="time" 
                          value={day.breaks?.[0]?.start || '13:00'} 
                          onChange={(e) => handleBreakChange(i, 'start', e.target.value)}
                          className="h-10 font-medium text-muted-foreground bg-muted/30"
                        />
                      </div>
                      <span className="text-muted-foreground/20">-</span>
                      <div className="relative flex-1">
                        <Input 
                          type="time" 
                          value={day.breaks?.[0]?.end || '14:00'} 
                          onChange={(e) => handleBreakChange(i, 'end', e.target.value)}
                          className="h-10 font-medium text-muted-foreground bg-muted/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center h-20 text-xs text-muted-foreground font-medium italic gap-3 px-4 bg-muted/10 rounded-xl border border-dashed border-muted-foreground/20">
                  <AlertCircle className="h-4 w-4 text-muted-foreground/40" />
                  Este día el establecimiento permanecerá cerrado. No se mostrarán turnos disponibles en el calendario.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
