import { getAdminFirestore } from '@/firebase/server-init';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { NotificationSettingsForm } from '@/components/reservas/NotificationSettingsForm';
import { DEFAULT_BOOKING_NOTIFICATION_SETTINGS, type BookingNotificationSettings } from '@/models/booking-notifications';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Loader2 } from 'lucide-react';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

async function fetchInitialSettings(businessId: string): Promise<BookingNotificationSettings> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.doc(`businesses/${businessId}/bookingSettings/notifications`).get();
    return snap.exists ? (snap.data() as BookingNotificationSettings) : DEFAULT_BOOKING_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('[NotificationsPage] Error fetching settings:', error);
    return DEFAULT_BOOKING_NOTIFICATION_SETTINGS;
  }
}

export default async function NotificacionesConfigPage() {
  const headerList = headers();
  const userId = headerList.get('x-user-id'); // Asumiendo que el layout/middleware inyecta esto
  
  // Nota: En este entorno usamos una resolución simplificada si x-user-id no está.
  // En producción real esto vendría de la sesión del servidor.
  const businessId = userId || ''; 

  const initialSettings = businessId ? await fetchInitialSettings(businessId) : DEFAULT_BOOKING_NOTIFICATION_SETTINGS;

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

      {businessId ? (
        <NotificationSettingsForm 
            businessId={businessId} 
            initialSettings={initialSettings} 
        />
      ) : (
        <div className="p-10 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Identificando sesión...</p>
        </div>
      )}
    </div>
  );
}
