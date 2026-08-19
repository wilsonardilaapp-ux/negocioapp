'use client';

import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, ChevronRight, Briefcase } from "lucide-react";
import type { BookingStaff } from "@/models/booking";
import { cn } from "@/lib/utils";

export function StaffStep({ staff, serviceId, selection, onSelect, onBack }: { staff: BookingStaff[], serviceId: string, selection: string, onSelect: (s: BookingStaff) => void, onBack: () => void }) {
  const filteredStaff = staff.filter(s => s.assignedServiceIds.includes(serviceId) && s.isActive);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <CardHeader className="p-8 text-center bg-primary/5 border-b relative">
        <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-6 top-8 rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
        <CardTitle className="text-3xl font-black tracking-tight text-gray-900">¿Con quién quieres tu cita?</CardTitle>
        <CardDescription className="text-base font-medium">Elige a tu profesional de confianza o selecciona cualquiera disponible.</CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opción Cualquier Profesional */}
          <button
            onClick={() => onSelect({ id: 'any', name: 'Cualquier Profesional', assignedServiceIds: [], isActive: true, createdAt: '' })}
            className="group flex items-center gap-4 p-6 rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-left"
          >
            <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center border-2 border-primary/20 text-primary shadow-sm"><User className="h-7 w-7" /></div>
            <div className="flex-1">
                <h3 className="font-black text-lg text-gray-900">Cualquier Profesional</h3>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Asignación automática</p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>

          {filteredStaff.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={cn(
                "group flex items-center gap-4 p-6 rounded-3xl border-2 transition-all text-left",
                selection === s.id ? "border-primary bg-primary/5 shadow-lg" : "border-muted hover:border-primary/20 hover:bg-muted/30"
              )}
            >
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors"><User className="h-7 w-7" /></div>
              <div className="flex-1">
                <h3 className="font-black text-lg text-gray-900">{s.name}</h3>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" /> {s.specialty || 'Especialista'}</p>
              </div>
              <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </CardContent>
    </div>
  );
}
