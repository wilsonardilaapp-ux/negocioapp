
"use client";

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Subscription } from '@/models/subscription';

const PLAN_LIMITS = {
  free: { products: 10, blogPosts: 5, landingPages: 1 },
  pro: { products: -1, blogPosts: -1, landingPages: -1 },
  enterprise: { products: -1, blogPosts: -1, landingPages: -1 },
};

export function useSubscription() {
  const { user } = useUser();
  const firestore = useFirestore();

  const subscriptionRef = useMemoFirebase(
    () => (user ? doc(firestore, `businesses/${user.uid}/subscription`, 'current') : null),
    [user, firestore]
  );

  const { data: subscription, isLoading, error } = useDoc<Subscription>(subscriptionRef);

  const plan = useMemo(() => subscription?.plan || 'free', [subscription]);
  const isActive = useMemo(() => subscription?.status === 'active', [subscription]);

  const limits = PLAN_LIMITS[plan];

  const canAddBlogPosts = (currentCount: number) => {
    if (limits.blogPosts === -1) return true; // Unlimited
    return currentCount < limits.blogPosts;
  };
  
  const canAddProducts = (currentCount: number) => {
    if (limits.products === -1) return true; // Unlimited
    return currentCount < limits.products;
  };

  return {
    subscription,
    plan,
    isActive,
    isLoading,
    error,
    isFree: plan === 'free',
    isPro: plan === 'pro',
    isEnterprise: plan === 'enterprise',
    limits,
    canAddBlogPosts,
    canAddProducts,
  };
}
