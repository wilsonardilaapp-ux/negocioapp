'use client';

import React from 'react';
import { User, ArrowLeft, ChevronRight, Briefcase } from "lucide-react";
import type { BookingStaff } from '@/models/booking';
import { cn } from "@/lib/utils";

interface StaffStepProps {
  staffList: BookingStaff[];
  selectedStaffId: string;
  onBack: () => void;
  onSelectStaff: (id: string, staff?: BookingStaff) => void;
}

export function StaffStep({ staffList, selectedStaffId, onBack, onSelectStaff }: StaffStepProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto relative">
      {/* Botón Volver */}
      <button
        onClick={onBack}
        className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted/50 text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Título y Subtítulo centrados */}
      <div className="text-center mb-8 pt-2">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
          ¿Con quién quieres tu cita?
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Elige a tu profesional de confianza o selecciona cualquiera disponible.
        </p>
      </div>

      {/* Grid de Selección */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Opción 1: Cualquier Profesional */}
        <div
          onClick={() => onSelectStaff('any')}
          className={cn(
            "border-2 border-dashed rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all active:scale-95",
            selectedStaffId === 'any'
              ? "border-green-500 bg-green-50/20 shadow-sm"
              : "border-green-300 hover:border-green-400 hover:bg-green-50/5"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Cualquier Profesional</p>
              <p className="text-[10px] font-black tracking-wider text-green-600 uppercase">
                Asignación automática
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-green-600 opacity-50" />
        </div>

        {/* Especialistas Reales */}
        {staffList.map((staff) => (
          <div
            key={staff.id}
            onClick={() => onSelectStaff(staff.id, staff)}
            className={cn(
              "border-2 rounded-2xl p-5 flex items-center gap-3 cursor-pointer transition-all active:scale-95 shadow-sm",
              selectedStaffId === staff.id
                ? "border-green-500 bg-green-50/10"
                : "border-gray-100 hover:border-gray-200 bg-white"
            )}
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-900 truncate">{staff.name}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 font-bold uppercase tracking-tight">
                <Briefcase className="w-3 h-3 text-muted-foreground/70" />
                {staff.specialty || 'Especialista'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
