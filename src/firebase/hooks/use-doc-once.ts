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
  
  // Guardamos el path para evitar re-ejecuciones si el objeto docRef cambia pero apunta a lo mismo
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Si no hay referencia, dejamos de cargar
    if (!docRef) {
      setIsLoading(false);
      setData(null);
      return;
    }

    // Evitar re-ejecución si es el mismo documento
    if (docRef.path === lastPath.current) return;
    lastPath.current = docRef.path;

    let isMounted = true;
    setIsLoading(true);

    const fetchDoc = async () => {
      try {
        const snapshot = await getDoc(docRef);
        
        if (!isMounted) return;

        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id } as WithId<T>);
        } else {
          console.warn(`[useDocOnce] El documento no existe en la ruta: ${docRef.path}`);
          setData(null);
        }
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error(`[useDocOnce] Error al obtener documento (${docRef.path}):`, err);
        setError(err as FirestoreError | Error);
        setData(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDoc();

    return () => {
      isMounted = false;
    };
  }, [docRef]);

  return { data, isLoading, error };
}
