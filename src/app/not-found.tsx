
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Frown, ArrowLeft, Home } from 'lucide-react';

/**
 * Página 404 personalizada para Markix.
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-primary/10 rounded-full">
            <Frown className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <h1 className="text-6xl font-black text-primary mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Página no encontrada</h2>
        
        <p className="text-gray-500 leading-relaxed mb-8">
          Lo sentimos, no pudimos encontrar la página que buscas en Markix. Es posible que el enlace esté roto o la página haya sido eliminada.
        </p>
        
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full font-bold h-12 text-lg shadow-md">
            <Link href="/">
              <Home className="mr-2 h-5 w-5" /> Ir al Inicio
            </Link>
          </Button>
          
          <Button variant="outline" onClick={() => router.back()} className="w-full font-bold h-12">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver Atrás
          </Button>
        </div>
      </div>
    </div>
  );
}
