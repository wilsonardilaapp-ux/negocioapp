
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User, ChevronRight, Sparkles } from 'lucide-react';
import type { BookingStaff } from '@/models/booking';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Props {
  staff: BookingStaff[];
  onSelect: (id: string) => void;
}

export function StaffStep({ staff, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">¿Quién quieres que te atienda?</h2>
        <p className="text-muted-foreground text-sm">Elige a tu profesional de confianza.</p>
      </div>

      <div className="grid gap-4">
        {/* Opción Automática */}
        <Card 
          className="cursor-pointer border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all active:scale-[0.98] group"
          onClick={() => onSelect(staff[0]?.id)} // Simplificación: toma el primero para demo
        >
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Cualquier profesional</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Asignación automática</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-primary/30" />
          </CardContent>
        </Card>

        {staff.map((member) => (
          <Card 
            key={member.id} 
            className="cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98] group"
            onClick={() => onSelect(member.id)}
          >
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border shadow-sm">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{member.name}</h3>
                  <p className="text-xs text-muted-foreground">{member.specialty || 'Especialista'}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
