'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Coupon } from '@/models/coupon';

export function useCoupons() {
  const { user } = useUser();
  const firestore = useFirestore();

  const couponsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'cupones'), where('businessId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: coupons, isLoading, error } = useCollection<Coupon>(couponsQuery);

  return {
    coupons: coupons || [],
    isLoading,
    error,
  };
}
