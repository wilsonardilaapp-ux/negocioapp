import AdminInbox from '@/modules/solicitudes-negocio/components/admin-inbox';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bandeja de Solicitudes de Negocio | Super Admin',
  description: 'Gestión y seguimiento de solicitudes de incorporación de negocios.'
};

export default function SolicitudesNegocioPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AdminInbox />
    </div>
  );
}
