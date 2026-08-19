'use client';

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChevronRight, ArrowLeft, Star, Users } from "lucide-react";
import type { BookingStaff } from "@/models/booking";
import { cn } from "@/lib/utils";

interface StaffStepProps {
  staffList: BookingStaff[];
  selectedStaffId?: string;
  onSelectStaff: (staffId: string) => void;
  onBack: () => void;
}

export function StaffStep({ staffList, selectedStaffId, onSelectStaff, onBack }: StaffStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">¿Con quién deseas agendar?</h2>
        <p className="text-muted-foreground">Selecciona a tu profesional de confianza o elige cualquier disponible.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Opción Any Staff */}
        <Card 
          className={cn(
            "group cursor-pointer transition-all hover:shadow-md border-2",
            selectedStaffId === 'any' ? "border-primary bg-primary/5 shadow-inner" : "border-gray-100"
          )}
          onClick={() => onSelectStaff('any')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">Cualquier Profesional</p>
              <p className="text-xs text-muted-foreground">Asignación automática por disponibilidad</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Lista de Staff */}
        {staffList.map((staff) => (
          <Card 
            key={staff.id} 
            className={cn(
              "group cursor-pointer transition-all hover:shadow-md border-2",
              selectedStaffId === staff.id ? "border-primary bg-primary/5 shadow-inner" : "border-gray-100"
            )}
            onClick={() => onSelectStaff(staff.id)}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 group-hover:scale-110 transition-transform">
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{staff.name}</p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate">{staff.specialty || 'Especialista'}</span>
                    <div className="flex items-center text-[10px] text-yellow-600 font-bold">
                        <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 mr-0.5" /> 5.0
                    </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-start pt-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a servicios
        </Button>
      </div>
    </div>
  );
}

export default StaffStep;
