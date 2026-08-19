'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChevronRight, ArrowLeft, Briefcase } from "lucide-react";
import type { BookingStaff } from "@/models/booking";
import { cn } from "@/lib/utils";

interface StaffStepProps {
  staffList: BookingStaff[];
  onSelectStaff: (staffId: string, staff?: BookingStaff) => void;
  onBack: () => void;
}

export function StaffStep({ staffList, onSelectStaff, onBack }: StaffStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="relative text-center space-y-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="absolute left-0 top-0 h-10 w-10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-black text-gray-900">¿Con quién quieres tu cita?</h2>
        <p className="text-muted-foreground">Elige a tu profesional de confianza o selecciona cualquiera disponible.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <Card 
          className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md border-dashed border-2"
          onClick={() => onSelectStaff('any')}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-2xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <User className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-gray-900 text-sm">Cualquier Profesional</h3>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Asignación Automática</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        {staffList.map((staff) => (
          <Card 
            key={staff.id} 
            className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
            onClick={() => onSelectStaff(staff.id, staff)}
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-2xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <User className="h-6 w-6" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-gray-900 text-sm">{staff.name}</h3>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {staff.specialty || 'Especialista'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StaffStep;
