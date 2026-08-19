'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { User, ArrowLeft, ChevronRight, Briefcase } from 'lucide-react';
import type { BookingStaff } from '@/models/booking';
import { cn } from '@/lib/utils';

interface StaffStepProps {
  staffList: BookingStaff[];
  selectedStaffId?: string | null;
  onSelectStaff: (id: string, staff?: BookingStaff) => void;
  onBack: () => void;
}

export function StaffStep({ staffList, selectedStaffId, onSelectStaff, onBack }: StaffStepProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto relative">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted/50 text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">¿Con quién quieres tu cita?</h2>
        <p className="text-sm text-muted-foreground">Elige a tu profesional de confianza o selecciona cualquiera disponible.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cualquier Profesional */}
        <div
          onClick={() => onSelectStaff('any')}
          className={cn(
            "border-2 border-dashed rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all",
            selectedStaffId === 'any' || selectedStaffId === null
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-gray-200 hover:border-primary/20 bg-transparent"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Cualquier Profesional</p>
              <p className="text-[10px] font-black tracking-wider text-primary uppercase">Asignación automática</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-primary" />
        </div>

        {/* Especialistas */}
        {staffList.map((staff) => (
          <div
            key={staff.id}
            onClick={() => onSelectStaff(staff.id, staff)}
            className={cn(
              "border-2 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all",
              selectedStaffId === staff.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200 hover:border-primary/20 bg-white"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">{staff.name}</p>
              {staff.specialty && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Briefcase className="w-3 h-3 text-muted-foreground/70" />
                  {staff.specialty}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StaffStep;
