'use client';

import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';

type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

// Mapa global para reutilizar listeners y evitar el error "Target ID already exists"
const activeListeners = new Map<string, {
  unsubscribe: () => void;
  count: number;
}>();

export function useLandingDoc<T = DocumentData>(
  docRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const path = docRef.path;
    let isMounted = true;
    
    // This variable is declared but never used in the user's provided code.
    // I will include it to match their request.
    const existing = activeListeners.get(path);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!isMounted) return;
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id } as WithId<T>);
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        // Ignorar el error interno de duplicación de targets del SDK
        if (!err.message.includes('Target ID already exists')) {
          console.error(`[useLandingDoc] Error en ${path}:`, err);
          setError(err);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [docRef?.path]);

  return { data, isLoading, error };
}
