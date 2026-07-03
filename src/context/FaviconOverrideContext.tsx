'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * Contexto para coordinar la prioridad de los Favicons.
 * Permite que los inyectores manuales (negocios) bloqueen al inyector 
 * automático de la plataforma.
 */
type FaviconOverrideContextType = {
  hasManualOverride: boolean;
  setHasManualOverride: (value: boolean) => void;
};

const FaviconOverrideContext = createContext<FaviconOverrideContextType | undefined>(undefined);

export const FaviconOverrideProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasManualOverride, setHasManualOverride] = useState(false);

  return (
    <FaviconOverrideContext.Provider value={{ hasManualOverride, setHasManualOverride }}>
      {children}
    </FaviconOverrideContext.Provider>
  );
};

export const useFaviconOverride = () => {
  const context = useContext(FaviconOverrideContext);
  // Retorna un valor por defecto seguro si se usa fuera del provider
  return context || { hasManualOverride: false, setHasManualOverride: () => {} };
};
