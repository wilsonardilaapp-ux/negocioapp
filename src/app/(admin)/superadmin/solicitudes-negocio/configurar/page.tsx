import AdminEditor from '@/modules/solicitudes-negocio/components/admin-editor';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configurar Formulario de Registro | Super Admin',
  description: 'Editor visual y configuración del formulario público de solicitudes de negocio.'
};

export default function ConfigurarSolicitudPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AdminEditor />
    </div>
  );
}
