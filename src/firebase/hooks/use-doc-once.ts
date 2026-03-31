'use client';

import { useState, useEffect } from 'react';
import {
  DocumentReference,
  getDoc,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';

type WithId<T> = T & { id: string };

export interface UseDocOnceResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

// Registro global de promesas en vuelo para evitar "Target ID already exists"
const pendingRequests = new Map<string, Promise<DocumentSnapshot<DocumentData>>>();

/**
 * Hook optimizado para obtener un documento de Firestore una sola vez.
 * Implementa deduplicación de peticiones para evitar errores de Target ID en React Strict Mode.
 */
export function useDocOnce<T = DocumentData>(
  docRef: DocumentReference<DocumentData> | null | undefined,
): UseDocOnceResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const path = docRef.path;
    let isMounted = true;

    const fetchData = async (): Promise<void> => {
      // Declaramos la promesa fuera del try para que sea accesible en el finally/closure
      let currentPromise: Promise<DocumentSnapshot<DocumentData>> | undefined;

      try {
        setIsLoading(true);

        currentPromise = pendingRequests.get(path);
        
        if (!currentPromise) {
          currentPromise = getDoc(docRef);
          pendingRequests.set(path, currentPromise);
        }

        const snapshot = await currentPromise;

        if (!isMounted) return;

        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id } as WithId<T>);
        } else {
          setData(null);
        }
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        
        const fireError = err as FirestoreError;
        if (fireError.message?.includes('Target ID already exists')) {
          return; 
        }

        console.error(`[useDocOnce] Error en ${path}:`, err);
        setError(fireError);
        setData(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          // Usamos la referencia capturada localmente para la limpieza
          const finishedPromise = currentPromise;
          setTimeout(() => {
            if (finishedPromise && pendingRequests.get(path) === finishedPromise) {
              pendingRequests.delete(path);
            }
          }, 100);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [docRef?.path]);

  return { data, isLoading, error };
}
