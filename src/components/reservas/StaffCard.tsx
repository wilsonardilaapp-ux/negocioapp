'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { User, Phone, Briefcase, Edit, Trash2 } from 'lucide-react';
import type { BookingStaff, BookingService } from '@/models/booking';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Tarjeta de visualización para miembros del equipo (Staff).
 */

interface StaffCardProps {
  staff: BookingStaff;
  allServices: BookingService[];
  onEdit: (staff: BookingStaff) => void;
  onToggleStatus: (staff: BookingStaff) => void;
  onDelete: (id: string) => void;
}

export function StaffCard({ staff, allServices, onEdit, onToggleStatus, onDelete }: StaffCardProps) {
  const assignedServices = allServices.filter(s => staff.assignedServiceIds.includes(s.id));

  return (
    <Card className={cn("overflow-hidden border-gray-100 transition-all hover:shadow-md", !staff.isActive && "opacity-60 grayscale")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{staff.name}</CardTitle>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {staff.specialty || 'Especialista'}
              </p>
            </div>
          </div>
          <Switch checked={staff.isActive} onCheckedChange={() => onToggleStatus(staff)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {staff.phone}
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Servicios asignados</p>
          <div className="flex flex-wrap gap-1.5">
            {assignedServices.length > 0 ? (
              assignedServices.map(s => (
                <Badge key={s.id} variant="secondary" className="text-[10px] py-0 px-2 h-5">
                  {s.name}
                </Badge>
              ))
            ) : (
              <span className="text-[10px] italic text-muted-foreground">Sin servicios asignados</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 pt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 font-bold" onClick={() => onEdit(staff)}>
          <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-red-50" onClick={() => onDelete(staff.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
