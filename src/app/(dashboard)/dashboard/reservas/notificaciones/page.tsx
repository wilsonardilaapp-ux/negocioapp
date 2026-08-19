'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { NotificationSettingsForm } from '@/components/reservas/NotificationSettingsForm';
import { getNotificationSettings } from '@/actions/booking-notifications-settings';
import { DEFAULT_BOOKING_NOTIFICATION_SETTINGS, type BookingNotificationSettings } from '@/models/booking-notifications';
import { Loader2, MessageSquare } from 'lucide-react';

/**
 * @fileOverview Página de configuración de notificaciones de reservas.
 * Convertida a Client Component para garantizar la resolución de sesión vía useUser.
 */
export default function NotificacionesConfigPage() {
  const { user, isUserLoading, profile } = useUser();
  const [settings, setSettings] = useState<BookingNotificationSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Intentamos obtener el ID del negocio desde el perfil o el UID del usuario
  const businessId = (profile as any)?.businessId || user?.uid || '';

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      if (!businessId) {
        if (!isUserLoading) setLoadingSettings(false);
        return;
      }

      try {
        setLoadingSettings(true);
        const res = await getNotificationSettings(businessId);
        if (isMounted) {
          setSettings(res || DEFAULT_BOOKING_NOTIFICATION_SETTINGS);
        }
      } catch (error) {
        console.warn("[NotificationsPage] Error cargando ajustes:", error);
        if (isMounted) {
          setSettings(DEFAULT_BOOKING_NOTIFICATION_SETTINGS);
        }
      } finally {
        if (isMounted) {
          setLoadingSettings(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, [businessId, isUserLoading]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          Mensajería Automática
        </h1>
        <p className="text-muted-foreground">Personaliza las notificaciones de WhatsApp que reciben tus clientes.</p>
      </header>

      <ReservasTabs />

      {/* Renderizado condicional basado en el estado de la sesión y la carga de datos */}
      {isUserLoading || (loadingSettings && businessId) ? (
        <div className="p-10 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Identificando sesión...</p>
        </div>
      ) : businessId && settings ? (
        <NotificationSettingsForm 
            businessId={businessId} 
            initialSettings={settings} 
        />
      ) : (
        <div className="p-10 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
            <p className="text-sm text-muted-foreground">No se pudo identificar un negocio activo para configurar las notificaciones.</p>
        </div>
      )}
    </div>
  );
}
