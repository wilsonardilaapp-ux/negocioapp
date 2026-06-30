'use client';

import React, { useEffect, useState } from 'react';
import QRCode from "react-qr-code";

interface BusinessCatalogQRProps {
  businessId: string;
}

export default function BusinessCatalogQR({ businessId }: BusinessCatalogQRProps) {
  const [catalogUrl, setCatalogUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Generamos la URL absoluta del catálogo basándonos en el origen actual del navegador
      setCatalogUrl(`${window.location.origin}/catalog/${businessId}`);
    }
  }, [businessId]);

  if (!catalogUrl) return null;

  return (
    <div className="pt-6 border-t flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="bg-white p-3 rounded-2xl border-2 border-gray-50 shadow-sm hover:shadow-md transition-shadow">
        <QRCode 
          value={catalogUrl} 
          size={140} 
          level="L"
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        />
      </div>
      <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-[0.15em] leading-tight px-2 max-w-[180px]">
        Compra fácil, rápida y segura en este QR
      </p>
    </div>
  );
}
