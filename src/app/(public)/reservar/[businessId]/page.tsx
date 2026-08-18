
import { getAdminFirestore } from '@/firebase/server-init';
import { BookingWizard } from '@/components/reservas/public/BookingWizard';
import { notFound } from 'next/navigation';
import type { BookingService, BookingStaff } from '@/models/booking';

/**
 * @fileOverview Página de entrada pública para el agendamiento de citas.
 * Soporta parámetros de búsqueda para pre-selección de servicios (Deep Linking).
 */

export const dynamic = 'force-dynamic';

async function getBookingData(businessId: string) {
  try {
    const db = await getAdminFirestore();
    
    // Obtener servicios y staff en paralelo para optimizar carga
    const [servicesSnap, staffSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('bookingServices').where('isActive', '==', true).get(),
      db.collection('businesses').doc(businessId).collection('bookingStaff').where('isActive', '==', true).get()
    ]);

    return {
      services: servicesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BookingService)),
      staff: staffSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BookingStaff))
    };
  } catch (e) {
    console.error('Error fetching public booking data:', e);
    return { services: [], staff: [] };
  }
}

export default async function PublicBookingPage({ 
  params, 
  searchParams 
}: { 
  params: { businessId: string },
  searchParams: { service?: string }
}) {
  const { businessId } = params;
  const { services, staff } = await getBookingData(businessId);

  // Si no hay servicios configurados, no podemos agendar nada
  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
            <span className="text-4xl text-muted-foreground opacity-50">📅</span>
        </div>
        <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900">Agendamiento no disponible</h1>
            <p className="text-muted-foreground max-w-sm">Este negocio no tiene servicios activos configurados para reserva online.</p>
        </div>
      </div>
    );
  }

  return (
    <BookingWizard 
      businessId={businessId} 
      services={services} 
      staff={staff} 
      initialServiceId={searchParams.service}
    />
  );
}
