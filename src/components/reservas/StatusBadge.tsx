'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ReservationStatus } from '@/models/booking';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

const statusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmada', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completada', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800 border-red-200' },
  no_show: { label: 'No Asistió', className: 'bg-gray-100 text-gray-800 border-gray-200' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: '' };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-bold uppercase text-[10px] tracking-widest", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
