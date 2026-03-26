'use client';

import { useState, useCallback } from 'react';
import type { AsientoContable } from '@/types/contabilidad.types';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export function useAsientosContables() {
  const { user } = useUser();
  const firestore = useFirestore();

  const asientosQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, `businesses/${user.uid}/asientos`), orderBy('fecha', 'desc'));
  }, [firestore, user?.uid]);

  const { data: asientos, isLoading } = useCollection<AsientoContable>(asientosQuery);

  const registrarAsiento = useCallback(async (nuevoAsientoData: Omit<AsientoContable, 'id' | 'totalDebitos' | 'totalCreditos' | 'estaCuadrado'>) => {
    if (!firestore || !user) return;

    const totalDebitos = nuevoAsientoData.detalles.reduce((sum, d) => sum + d.debito, 0);
    const totalCreditos = nuevoAsientoData.detalles.reduce((sum, d) => sum + d.credito, 0);
    const estaCuadrado = Math.abs(totalDebitos - totalCreditos) < 0.01;

    const asientoParaGuardar = {
      ...nuevoAsientoData,
      totalDebitos,
      totalCreditos,
      estaCuadrado,
      businessId: user.uid,
    };
    
    const asientosCollection = collection(firestore, `businesses/${user.uid}/asientos`);
    await addDocumentNonBlocking(asientosCollection, asientoParaGuardar);

  }, [firestore, user]);

  return {
    asientos: asientos ?? [],
    isLoading,
    registrarAsiento,
  };
}
