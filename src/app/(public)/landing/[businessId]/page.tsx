
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// --- TIPO DE PROPS PARA NEXT.JS 15 ---
// En Next.js 15, params es una Promesa.
type Props = {
  params: Promise<{ businessId: string }>;
};

// --- METADATA ---
export async function generateMetadata({ params }: Props) {
  const { businessId } = await params;
  return {
    title: `Landing Page - ${businessId}`,
    description: `Bienvenido a la página del negocio ${businessId}`,
  };
}

// --- COMPONENTE PRINCIPAL ---
export default async function BusinessLandingPage({ params }: Props) {
  // 1. Esperamos la promesa de params (Requisito de Next.js 15)
  const { businessId } = await params;

  // Aquí iría la lógica para buscar los datos del negocio en Firebase
  // const businessData = await getBusinessFromFirebase(businessId);
  
  if (!businessId) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg text-center space-y-6">
        
        <h1 className="text-4xl font-bold text-gray-900">
          Bienvenido
        </h1>
        
        <p className="text-lg text-gray-600">
          Estás viendo la Landing Page del negocio con ID:
        </p>
        
        <code className="block bg-gray-100 p-3 rounded text-emerald-600 font-mono text-xl">
          {businessId}
        </code>

        <p className="text-sm text-gray-400">
          (Esta página está lista para conectar con la base de datos)
        </p>

        <div className="pt-4">
          <Link href="/">
            <Button variant="outline">Volver al Inicio</Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
