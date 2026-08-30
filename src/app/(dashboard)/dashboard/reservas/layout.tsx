'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { 
  CalendarDays, 
  Users, 
  Clock, 
  MessageSquare, 
  Target, 
  BarChart3, 
  Share2 
} from 'lucide-react';

/**
 * @fileOverview Layout compartido para el módulo de Reservas.
 * Garantiza que la cabecera y las pestañas persistan durante la navegación.
 */

const HEADER_CONFIG: Record<string, { icon: any; title: string; description: string }> = {
  '/dashboard/reservas': { 
    icon: CalendarDays, 
    title: 'Agenda y Reservas', 
    description: 'Monitorea y gestiona las citas diarias de tu negocio.' 
  },
  '/dashboard/reservas/servicios': { 
    icon: Clock, 
    title: 'Servicios de Citas', 
    description: 'Gestiona los servicios que tus clientes pueden agendar online.' 
  },
  '/dashboard/reservas/profesionales': { 
    icon: Users, 
    title: 'Profesionales y Equipo', 
    description: 'Gestiona los especialistas que atienden a tus clientes.' 
  },
  '/dashboard/reservas/horarios': { 
    icon: Clock, 
    title: 'Horarios de Atención', 
    description: 'Define la jornada de trabajo para el agendamiento online.' 
  },
  '/dashboard/reservas/oportunidades': { 
    icon: Target, 
    title: 'Radar de Crecimiento', 
    description: 'Detecta y recupera ventas utilizando inteligencia artificial y datos históricos.' 
  },
  '/dashboard/reservas/notificaciones': { 
    icon: MessageSquare, 
    title: 'Mensajería Automática', 
    description: 'Personaliza las notificaciones de WhatsApp que reciben tus clientes.' 
  },
  '/dashboard/reservas/estadisticas': { 
    icon: BarChart3, 
    title: 'Análisis de Rendimiento', 
    description: 'Métricas de facturación, asistencia y efectividad del equipo.' 
  },
  '/dashboard/reservas/compartir': { 
    icon: Share2, 
    title: 'Centro de Difusión', 
    description: 'Herramientas para promocionar tu agenda y medir el impacto de tus canales.' 
  }
};

export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const config = useMemo(() => {
    return HEADER_CONFIG[pathname] || HEADER_CONFIG['/dashboard/reservas'];
  }, [pathname]);

  const Icon = config.icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-gray-900">
            <Icon className="h-8 w-8 text-primary" />
            {config.title}
          </h1>
          <p className="text-muted-foreground font-medium">{config.description}</p>
        </div>
        {/* Slot para acciones inyectadas por cada página a través de children */}
        <div id="reservas-header-actions" className="flex items-center gap-2"></div>
      </header>

      <ReservasTabs />

      {children}
    </div>
  );
}
