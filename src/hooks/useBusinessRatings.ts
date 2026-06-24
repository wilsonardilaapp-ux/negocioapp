
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { DirectoryRating } from '@/models/directory-rating';

export function useBusinessRatings() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Eliminamos el orderBy de la consulta de Firestore para evitar requerir un índice compuesto
  // que suele causar que la consulta devuelva vacío si no está configurado en la consola.
  const ratingsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'directoryRatings'),
      where('businessId', '==', user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: rawRatings, isLoading, error } = useCollection<DirectoryRating>(ratingsQuery);

  // Ordenamos los datos en memoria para garantizar que el usuario vea lo más reciente primero
  // sin depender de índices de base de datos complejos.
  const ratings = useMemo(() => {
    if (!rawRatings) return [];
    return [...rawRatings].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rawRatings]);

  return {
    ratings,
    isLoading,
    error,
  };
}
