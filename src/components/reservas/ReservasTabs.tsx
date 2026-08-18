'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarDays, Users, Clock, MessageSquare } from 'lucide-react';

/**
 * @fileOverview Menú de navegación secundario para el módulo de Reservas.
 * Actualizado para incluir la pestaña de Notificaciones (Fase 7).
 */

const tabs = [
  { id: 'agenda', label: 'Agenda', href: '/dashboard/reservas', icon: CalendarDays },
  { id: 'servicios', label: 'Servicios', href: '/dashboard/reservas/servicios', icon: Clock },
  { id: 'profesionales', label: 'Profesionales', href: '/dashboard/reservas/profesionales', icon: Users },
  { id: 'horarios', label: 'Horarios', href: '/dashboard/reservas/horarios', icon: Clock },
  { id: 'notificaciones', label: 'Notificaciones', href: '/dashboard/reservas/notificaciones', icon: MessageSquare },
];

export function ReservasTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl mb-6 w-fit">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              isActive 
                ? "bg-white text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <tab.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
