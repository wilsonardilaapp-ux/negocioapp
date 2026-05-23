
'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Promotion } from '@/models/promotion';

export function usePromotions() {
  const { user } = useUser();
  const firestore = useFirestore();

  const promotionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'promotions'), where('companyId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: promotions, isLoading, error } = useCollection<Promotion>(promotionsQuery);

  return {
    promotions: promotions || [],
    isLoading,
    error,
  };
}
