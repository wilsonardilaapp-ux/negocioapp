
'use client';

import React, { useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CookiesSettings } from '@/models/cookies-settings';
import { AnimatePresence, motion } from 'framer-motion';

const CONSENT_KEY = 'cookie_consent_accepted';

/**
 * Componente que muestra el banner de consentimiento de cookies.
 * Lee la configuración global desde Firestore y persiste la decisión del usuario.
 */
export default function CookieConsentBanner() {
  const firestore = useFirestore();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  // Suscripción al documento de configuración global
  const configRef = useMemoFirebase(() => 
    firestore ? doc(firestore, 'cookies_settings', 'config') : null, 
    [firestore]
  );
  
  const { data: config, isLoading } = useDoc<CookiesSettings>(configRef);

  useEffect(() => {
    setMounted(true);
    // Verificar si el usuario ya aceptó previamente
    const consent = localStorage.getItem(CONSENT_KEY);
    setHasConsent(!!consent);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasConsent(true);
  };

  // Guardias de renderizado
  if (!mounted || isLoading || !config || !config.enabled || hasConsent === true || hasConsent === null) {
    return null;
  }

  const isTop = config.position === 'top';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: isTop ? -100 : 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isTop ? -100 : 100 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          "fixed left-0 right-0 z-[100] p-4 pointer-events-none",
          isTop ? "top-0" : "bottom-0"
        )}
      >
        <Card className="container max-w-4xl mx-auto p-6 shadow-2xl border-2 pointer-events-auto bg-card/95 backdrop-blur-md rounded-[1.5rem]">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-primary/10 p-3 rounded-full shrink-0">
              <Cookie className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h3 className="font-bold text-lg leading-none">{config.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {config.message}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                onClick={handleAccept} 
                className="font-bold px-8 h-11 shadow-lg shadow-primary/20 rounded-xl"
              >
                {config.buttonText}
              </Button>
              <button 
                onClick={handleAccept}
                className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
