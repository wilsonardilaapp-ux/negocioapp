'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import Image from 'next/image';
import { Logo } from '@/components/icons';
import type { Business } from '@/models/business';

/**
 * @fileOverview Plantilla optimizada para impresión (A4) de posters de reservas.
 * Diseñada para ser inyectada en el DOM y activada vía window.print().
 */

interface Props {
  business: Business | null;
  qrUrl: string;
}

export function PrintPosterTemplate({ business, qrUrl }: Props) {
  return (
    <div className="fixed inset-0 bg-white z-[9999] p-20 flex flex-col items-center justify-between text-center font-sans">
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        `}
      </style>

      {/* Cabecera de Marca */}
      <div className="flex flex-col items-center gap-6">
        {business?.logoURL ? (
            <div className="relative h-32 w-32 rounded-3xl overflow-hidden border-4 border-gray-50 shadow-md">
                <img src={business.logoURL} alt={business.name} className="w-full h-full object-cover" />
            </div>
        ) : <Logo className="h-20 w-20 text-primary" />}
        <h1 className="text-6xl font-black text-gray-900 tracking-tighter">{business?.name || 'Agenda con nosotros'}</h1>
      </div>

      {/* Zona Central - QR */}
      <div className="space-y-10">
        <div className="p-10 bg-white rounded-[4rem] border-[12px] border-primary inline-block shadow-2xl">
          <QRCode value={qrUrl} size={400} level="H" />
        </div>
        <div className="space-y-4">
            <p className="text-4xl font-bold text-gray-800 uppercase tracking-[0.2em]">Escanea y Reserva</p>
            <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                ¡Olvídate de las esperas! Agenda tu próxima cita en segundos directamente desde tu celular.
            </p>
        </div>
      </div>

      {/* Pie de Página */}
      <div className="w-full space-y-6">
        <div className="h-1 w-32 bg-primary mx-auto rounded-full"></div>
        <p className="text-xl font-mono text-gray-400 lowercase tracking-wider">{qrUrl.replace('https://', '')}</p>
        <p className="text-xs font-black uppercase text-gray-300 tracking-[0.3em]">Potenciado por Markix SaaS</p>
      </div>
    </div>
  );
}
