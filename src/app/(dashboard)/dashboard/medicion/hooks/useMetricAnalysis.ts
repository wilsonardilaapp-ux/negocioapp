'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Order } from '@/models/order';

/**
 * @fileOverview Hook maestro para la obtención y preparación de datos analíticos.
 */
export function useMetricAnalysis() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, `businesses/${user.uid}/orders`),
      orderBy('orderDate', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: orders, isLoading, error } = useCollection<Order>(ordersQuery);

  return {
    orders: orders || [],
    isLoading,
    error,
  };
}
