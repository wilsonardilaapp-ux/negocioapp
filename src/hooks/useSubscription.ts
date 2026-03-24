'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, type Timestamp } from 'firebase/firestore';
import type { Subscription } from '@/models/subscription';
import type { SubscriptionPlan, PlanLimits } from '@/models/subscription-plan';
import type { Product } from '@/models/product';
import type { BlogPost } from '@/models/blog-post';
import type { LandingPageData } from '@/models/landing-page';

// Tiempo máximo de espera antes de romper el loading infinito (ms)
const LOADING_TIMEOUT_MS = 10_000;

export function useSubscription() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // FIX 1: Estado de timeout de seguridad
  const [timedOut, setTimedOut] = useState(false);

  // Referencias — solo se crean cuando user?.uid está disponible
  const subscriptionRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, `businesses/${user.uid}/subscription`, 'current') : null),
    [user?.uid, firestore]
  );
  const plansRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'plans') : null),
    [firestore]
  );
  const productsRef = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/products`) : null),
    [user?.uid, firestore]
  );
  const blogPostsQuery = useMemoFirebase(
    () =>
      user?.uid
        ? query(collection(firestore, 'blog_posts'), where('businessId', '==', user.uid))
        : null,
    [user?.uid, firestore]
  );
  const landingPagesRef = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/landingPages`) : null),
    [user?.uid, firestore]
  );

  // Data fetching
  const { data: subscription, isLoading: isSubLoading, error: subError } = useDoc<Subscription>(subscriptionRef);
  const { data: allPlans, isLoading: arePlansLoading, error: plansError } = useCollection<SubscriptionPlan>(plansRef);
  const { data: products, isLoading: isProductsLoading, error: productsError } = useCollection<Product>(productsRef);
  const { data: blogPosts, isLoading: isBlogPostsLoading, error: blogPostsError } = useCollection<BlogPost>(blogPostsQuery);
  const { data: landingPages, isLoading: isLandingPagesLoading, error: landingPagesError } = useCollection<LandingPageData>(landingPagesRef);

  const error = subError || plansError || productsError || blogPostsError || landingPagesError;

  // FIX 2: isLoading ahora incluye isUserLoading para que espere al usuario
  const rawIsLoading =
    isUserLoading ||
    isSubLoading ||
    arePlansLoading ||
    isProductsLoading ||
    isBlogPostsLoading ||
    isLandingPagesLoading;

  // FIX 3: Timeout de seguridad — si tras 10s sigue cargando, forzamos salida
  useEffect(() => {
    if (!rawIsLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [rawIsLoading]);

  // isLoading final: se rompe si hay timeout o error
  const isLoading = timedOut || error ? false : rawIsLoading;

  const { plan, isActive, limits, isFree, isPro, isEnterprise } = useMemo(() => {
    const currentPlanId = subscription?.plan ?? 'free';
    const planDetails = allPlans?.find(p => p.id === currentPlanId);
    const defaultLimits: PlanLimits = { products: 0, blogPosts: 0, landingPages: 0 };

    return {
      plan: currentPlanId as 'free' | 'pro' | 'enterprise',
      isActive: subscription?.status === 'active',
      limits: planDetails?.limits ?? defaultLimits,
      isFree: currentPlanId === 'free',
      isPro: currentPlanId === 'pro',
      isEnterprise: currentPlanId === 'enterprise',
    };
  }, [subscription, allPlans]);

  const productsCount = products?.length ?? 0;
  const blogPostsCount = blogPosts?.length ?? 0;
  const landingPagesCount = landingPages?.length ?? 0;

  const canAddBlogPosts = (currentCount: number): boolean => {
    if (limits.blogPosts === -1) return true;
    return currentCount < limits.blogPosts;
  };

  const canAddProducts = (currentCount: number): boolean => {
    if (limits.products === -1) return true;
    return currentCount < limits.products;
  };

  return {
    subscription,
    allPlans,
    plan,
    isActive,
    isLoading,
    error,
    isFree,
    isPro,
    isEnterprise,
    limits,
    productsCount,
    blogPostsCount,
    landingPagesCount,
    canAddBlogPosts,
    canAddProducts,
  };
}
