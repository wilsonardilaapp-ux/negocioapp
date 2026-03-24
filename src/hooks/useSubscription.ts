"use client";

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Subscription } from '@/models/subscription';
import type { SubscriptionPlan, PlanLimits } from '@/models/subscription-plan';

export function useSubscription() {
  const { user } = useUser();
  const firestore = useFirestore();

  const subscriptionRef = useMemoFirebase(
    () => (user ? doc(firestore, `businesses/${user.uid}/subscription`, 'current') : null),
    [user, firestore]
  );
  
  const plansRef = useMemoFirebase(() => firestore ? collection(firestore, 'plans') : null, [firestore]);

  const { data: subscription, isLoading: isSubLoading, error: subError } = useDoc<Subscription>(subscriptionRef);
  const { data: allPlans, isLoading: arePlansLoading, error: plansError } = useCollection<SubscriptionPlan>(plansRef);

  const error = subError || plansError;

  const { plan, isActive, limits, isFree, isPro, isEnterprise } = useMemo(() => {
    const currentPlanId = subscription?.plan || 'free';
    const planDetails = allPlans?.find(p => p.id === currentPlanId);

    // Define default/fallback limits
    const defaultLimits: PlanLimits = { products: 0, blogPosts: 0, landingPages: 0 };
    
    return {
        plan: currentPlanId,
        isActive: subscription?.status === 'active',
        limits: planDetails?.limits ?? defaultLimits,
        isFree: currentPlanId === 'free',
        isPro: currentPlanId === 'pro',
        isEnterprise: currentPlanId === 'enterprise',
    };
  }, [subscription, allPlans]);

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
    allPlans,
    plan,
    isActive,
    isSubLoading,
    arePlansLoading,
    error,
    isFree,
    isPro,
    isEnterprise,
    limits,
    canAddBlogPosts,
    canAddProducts,
  };
}
