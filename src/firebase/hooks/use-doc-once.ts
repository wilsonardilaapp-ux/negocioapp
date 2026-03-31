'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DocumentReference,
  getDoc,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';

type WithId<T> = T & { id: string };

export interface UseDocOnceResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * Hook para obtener un documento de Firestore una sola vez.
 * Ideal para Landing Pages públicas que no requieren actualizaciones en tiempo real.
 */
export function useDocOnce<T = DocumentData>(
  docRef: DocumentReference<DocumentData> | null | undefined,
): UseDocOnceResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Empezamos en true para evitar parpadeos
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  useEffect(() => {
    // Si no hay referencia, dejamos de cargar inmediatamente
    if (!docRef) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    
    // Iniciamos la carga
    setIsLoading(true);

    getDoc(docRef)
      .then((snapshot) => {
        if (!isMounted) return;

        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          console.warn(`[useDocOnce] El documento no existe: ${docRef.path}`);
          setData(null);
        }
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(`[useDocOnce] Error en ${docRef.path}:`, err);
        setError(err);
        setData(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [docRef?.path]); // Usamos path como dependencia para estabilidad

  return { data, isLoading, error };
}
