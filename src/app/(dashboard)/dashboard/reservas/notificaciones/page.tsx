'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { NotificationSettingsForm } from '@/components/reservas/NotificationSettingsForm';
import { getNotificationSettings } from '@/actions/booking-notifications-settings';
import { DEFAULT_BOOKING_NOTIFICATION_SETTINGS, type BookingNotificationSettings } from '@/models/booking-notifications';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Página de configuración de notificaciones de reservas.
 * Header y Tabs manejados por el layout.
 */
export default function NotificacionesConfigPage() {
  const { user, isUserLoading, profile } = useUser();
  const [settings, setSettings] = useState<BookingNotificationSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

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
        if (isMounted) setSettings(DEFAULT_BOOKING_NOTIFICATION_SETTINGS);
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, [businessId, isUserLoading]);

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-500">
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
            <p className="text-sm text-muted-foreground">No se pudo identificar un negocio activo.</p>
        </div>
      )}
    </div>
  );
}
