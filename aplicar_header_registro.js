const fs = require('fs');

const targetPath = 'src/app/(public)/registro-negocio/page.tsx';
const bakPath = 'src/app/(public)/registro-negocio/page.tsx.bak';

if (!fs.existsSync(targetPath)) {
  console.error('[ERROR] No se encontró el archivo:', targetPath);
  process.exit(1);
}

// 1. Crear respaldo .bak
fs.copyFileSync(targetPath, bakPath);
console.log(`[BACKUP OK] Respaldo creado en: ${bakPath}`);

// 2. Contenido actualizado con Header y Footer idénticos a /directorio
const newContent = `import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { getLandingData } from '@/lib/get-landing-data';
import PublicForm from '@/modules/solicitudes-negocio/components/public-form';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Registro de Negocio | Markix',
  description: 'Envía los datos de tu negocio para registrarte y activar tu plataforma comercial.'
};

export default async function RegistroNegocioPage() {
  const landingData = await getLandingData();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col">
      <Header businessId={null} navigation={landingData?.navigation || null} />
      <main className="flex-1 py-10">
        <PublicForm />
      </main>
      <Footer />
    </div>
  );
}
`;

fs.writeFileSync(targetPath, newContent, 'utf8');
console.log(`[APLICADO OK] Menú horizontal integrado con éxito en: ${targetPath}`);

console.log('==============================================');
console.log('CAMBIO APLICADO CON ÉXITO');
console.log('==============================================');
