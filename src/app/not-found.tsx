
import React from 'react';
import Link from 'next/link';

/**
 * Página 404 simplificada para maximizar la resiliencia del build.
 * Se utilizan elementos HTML estándar y clases de Tailwind para evitar
 * errores de resolución de módulos (chunks) en el servidor de Next.js.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-6xl font-black text-primary mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Página no encontrada</h2>
        
        <p className="text-gray-500 leading-relaxed mb-8">
          Lo sentimos, no pudimos encontrar la página que buscas en Markix. Es posible que el enlace esté roto o la página haya sido eliminada.
        </p>
        
        <div className="flex flex-col gap-3">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground text-lg font-bold shadow-md hover:bg-primary/90 transition-colors"
          >
            Ir al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
