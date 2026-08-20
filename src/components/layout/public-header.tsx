import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Logo } from '../icons';

/**
 * @fileOverview Cabecera pública autónoma para páginas globales de la plataforma.
 * No requiere props de negocio ni configuración de navegación dinámica.
 */
export default function PublicHeader() {
  return (
    <header className="w-full border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Branding de Markix */}
        <Link 
          href="/" 
          className="flex items-center gap-2 group transition-transform active:scale-95"
        >
          <div className="p-1.5 bg-primary/10 rounded-lg shadow-sm">
            <Logo className="w-7 h-7 text-primary" />
          </div>
          <span className="text-xl font-black tracking-tighter text-gray-900">
            Markix
          </span>
        </Link>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            asChild 
            className="hidden sm:flex font-bold text-sm text-gray-600 hover:text-primary"
          >
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          
          <Button 
            asChild 
            className="font-black text-sm rounded-xl px-6 shadow-lg shadow-primary/10 transition-all hover:scale-105"
          >
            <Link href="/register">Comenzar Gratis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
