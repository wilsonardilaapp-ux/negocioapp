'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User, Briefcase, ChevronRight, ArrowLeft } from 'lucide-react';
import type { BookingStaff } from '@/models/booking';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Restauración definitiva del Paso 2 para el asistente de reservas.
 * Implementa el diseño de tarjeta única centrada con rejilla de especialistas de 2 columnas.
 */

interface StaffStepProps {
  staffList: BookingStaff[];
  onSelectStaff: (staffId: string, staffMember?: BookingStaff) => void;
  onBack: () => void;
  selectedStaffId: string;
}

export function StaffStep({ staffList, onSelectStaff, onBack, selectedStaffId }: StaffStepProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-10 max-w-2xl mx-auto relative animate-in fade-in zoom-in duration-500">
      
      {/* Flecha de retroceso superior */}
      <button
        onClick={onBack}
        className="absolute left-6 top-8 p-2 rounded-full hover:bg-muted/50 text-gray-400 hover:text-primary transition-all group"
        aria-label="Volver al servicio"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* Cabecera Centrada */}
      <div className="text-center space-y-3 mb-10">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
          ¿Con quién quieres tu cita?
        </h2>
        <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">
          Elige a tu profesional de confianza o selecciona cualquiera disponible.
        </p>
      </div>

      {/* Grid de Selección (2 Columnas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Tarjeta: Cualquier Profesional */}
        <div
          onClick={() => onSelectStaff('any')}
          className={cn(
            "group relative border-2 border-dashed rounded-3xl p-5 flex items-center justify-between cursor-pointer transition-all duration-300",
            selectedStaffId === 'any'
              ? "border-primary bg-primary/5 shadow-inner scale-[1.02]"
              : "border-gray-200 hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm border",
              selectedStaffId === 'any' ? "bg-primary text-white" : "bg-white text-primary"
            )}>
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <p className="font-black text-sm text-gray-900 leading-none">Cualquier Profesional</p>
              <p className="text-[9px] font-black tracking-widest text-primary uppercase">
                Asignación automática
              </p>
            </div>
          </div>
          <ChevronRight className={cn(
            "w-4 h-4 transition-transform group-hover:translate-x-1",
            selectedStaffId === 'any' ? "text-primary" : "text-gray-300"
          )} />
        </div>

        {/* Tarjetas de Staff Real */}
        {staffList.map((staff) => (
          <div
            key={staff.id}
            onClick={() => onSelectStaff(staff.id, staff)}
            className={cn(
              "group relative border-2 rounded-3xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-300",
              selectedStaffId === staff.id
                ? "border-primary bg-primary/5 shadow-inner scale-[1.02]"
                : "border-gray-100 bg-white hover:border-primary/20 hover:shadow-lg"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm border",
              selectedStaffId === staff.id ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground"
            )}>
              <User className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm text-gray-900 truncate leading-none mb-1.5">{staff.name}</p>
              {staff.specialty && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                   <Briefcase className="w-3 h-3 shrink-0" />
                   <span className="text-[10px] font-bold uppercase tracking-wider truncate">{staff.specialty}</span>
                </div>
              )}
            </div>
            
            {/* Indicador de selección */}
            {selectedStaffId === staff.id && (
              <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-lg animate-in zoom-in duration-300">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nota de pie */}
      <p className="text-center mt-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
        Pasarás a la selección de horario en el siguiente paso
      </p>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
