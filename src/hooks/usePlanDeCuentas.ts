'use client';

import { useState, useCallback } from 'react';
import type { Cuenta, TipoCuenta } from '@/types/contabilidad.types';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export function usePlanDeCuentas() {
  const { user } = useUser();
  const firestore = useFirestore();

  const cuentasQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, `businesses/${user.uid}/cuentas`), orderBy('codigo'));
  }, [firestore, user?.uid]);

  const { data: cuentas, isLoading } = useCollection<Cuenta>(cuentasQuery);

  const registrarCuenta = useCallback(async (nuevaCuentaData: Omit<Cuenta, 'id' | 'saldo'>) => {
    if (!firestore || !user) return;

    const cuentaParaGuardar = {
      ...nuevaCuentaData,
      saldo: 0, // Initial balance is always 0
    };
    
    const cuentasCollection = collection(firestore, `businesses/${user.uid}/cuentas`);
    await addDocumentNonBlocking(cuentasCollection, cuentaParaGuardar);

  }, [firestore, user]);

  return {
    cuentas: cuentas ?? [],
    isLoading,
    registrarCuenta,
  };
}
