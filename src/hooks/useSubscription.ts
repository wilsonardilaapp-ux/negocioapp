'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, limit, type Timestamp } from 'firebase/firestore';
import type { Subscription } from '@/models/subscription';
import type { SubscriptionPlan, PlanLimits } from '@/models/subscription-plan';
import type { Product } from '@/models/product';
import type { BlogPost } from '@/models/blog-post';
import type { LandingPageData } from '@/models/landing-page';
import type { Order } from '@/models/order';
import type { Business } from '@/models/business';
import type { SuggestionRule } from '@/models/suggestion-rule';
import type { Coupon } from '@/models/coupon';
import type { Promotion } from '@/models/promotion';
import type { HybridPlan } from '@/models/hybrid-plan';
import type { Module } from '@/models/module';

const LOADING_TIMEOUT_MS = 10_000;

export function useSubscription() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [timedOut, setTimedOut] = useState(false);

  const subscriptionRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, `businesses/${user.uid}/subscription`, 'current') : null),
    [user?.uid, firestore]
  );
  
  const businessQuery = useMemoFirebase(
    () => (user?.uid ? query(collection(firestore, 'businesses'), where('id', '==', user.uid), limit(1)) : null),
    [user?.uid, firestore]
  );

  const plansRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'plans') : null),
    [firestore]
  );

  const hybridPlansRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'hybrid_plans') : null),
    [firestore]
  );

  const modulesRef = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/modules`) : null),
    [user?.uid, firestore]
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
  const ordersRef = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/orders`) : null),
    [user?.uid, firestore]
  );
  const suggestionsRef = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/suggestionRules`) : null),
    [user?.uid, firestore]
  );
  const couponsQuery = useMemoFirebase(
    () => user?.uid ? query(collection(firestore, 'cupones'), where('businessId', '==', user.uid)) : null,
    [user?.uid, firestore]
  );
  const promotionsQuery = useMemoFirebase(
    () => user?.uid ? query(collection(firestore, 'promotions'), where('companyId', '==', user.uid)) : null,
    [user?.uid, firestore]
  );

  const { data: subscription, isLoading: isSubLoading, error: subError } = useDoc<Subscription>(subscriptionRef);
  const { data: businessDataArr, isLoading: isBusinessDataLoading } = useCollection<Business>(businessQuery);
  const businessData = businessDataArr?.[0] ?? null;
  const { data: allPlans, isLoading: arePlansLoading, error: plansError } = useCollection<SubscriptionPlan>(plansRef);
  const { data: allHybridPlans, isLoading: areHybridPlansLoading } = useCollection<HybridPlan>(hybridPlansRef);
  const { data: dbModules, isLoading: areModulesLoading } = useCollection<Module>(modulesRef);
  
  const { data: products, isLoading: isProductsLoading, error: productsError } = useCollection<Product>(productsRef);
  const { data: blogPosts, isLoading: isBlogPostsLoading, error: blogPostsError } = useCollection<BlogPost>(blogPostsQuery);
  const { data: landingPages, isLoading: isLandingPagesLoading, error: landingPagesError } = useCollection<LandingPageData>(landingPagesRef);
  const { data: orders, isLoading: isOrdersLoading, error: ordersError } = useCollection<Order>(ordersRef);
  const { data: suggestions, isLoading: isSuggestionsLoading, error: suggestionsError } = useCollection<SuggestionRule>(suggestionsRef);
  const { data: coupons, isLoading: isCouponsLoading, error: couponsError } = useCollection<Coupon>(couponsQuery);
  const { data: promotions, isLoading: isPromotionsLoading, error: promotionsError } = useCollection<Promotion>(promotionsQuery);

  const error = subError || plansError || productsError || blogPostsError || landingPagesError || ordersError || suggestionsError || couponsError || promotionsError;

  const rawIsLoading =
    isUserLoading ||
    isSubLoading ||
    isBusinessDataLoading ||
    arePlansLoading ||
    areHybridPlansLoading ||
    areModulesLoading ||
    isProductsLoading ||
    isBlogPostsLoading ||
    isLandingPagesLoading ||
    isOrdersLoading ||
    isSuggestionsLoading ||
    isCouponsLoading ||
    isPromotionsLoading;

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

  const isLoading = timedOut || error ? false : rawIsLoading;

  const memoizedSubscriptionValues = useMemo(() => {
    const subscriptionPlanId = subscription?.plan;
    const businessPlanName = (businessData as any)?.planName;
    
    let currentPlanId = 'free';

    if (subscriptionPlanId && subscription?.status === 'active') {
        currentPlanId = subscriptionPlanId;
    } else if (businessPlanName && businessPlanName !== 'Plan Gratuito') {
        currentPlanId = businessPlanName;
    } else if (businessPlanName === 'Plan Gratuito' && subscriptionPlanId) {
        currentPlanId = subscriptionPlanId;
    }

    const details = allPlans?.find(p => p.id === currentPlanId || p.name === currentPlanId) || 
                       allHybridPlans?.find(p => p.id === currentPlanId || p.name === currentPlanId);

    const defaultLimits: PlanLimits = { products: 4, blogPosts: 4, landingPages: 1, coupons: 0, promotions: 0, orders: -1, suggestions: 0 };

    const extras = (businessData as any)?.limitesExtra || {};
    const baseLimits = details?.limits ?? defaultLimits;

    const mergedLimits: PlanLimits = {
        products: baseLimits.products === -1 ? -1 : (baseLimits.products + (extras.products || 0)),
        blogPosts: baseLimits.blogPosts === -1 ? -1 : (baseLimits.blogPosts + (extras.blogPosts || 0)),
        landingPages: baseLimits.landingPages === -1 ? -1 : (baseLimits.landingPages + (extras.landingPages || 0)),
        promotions: baseLimits.promotions === -1 ? -1 : (baseLimits.promotions + (extras.promotions || 0)),
        coupons: baseLimits.coupons === -1 ? -1 : (baseLimits.coupons + (extras.coupons || 0)),
        orders: baseLimits.orders === -1 ? -1 : (baseLimits.orders + (extras.orders || 0)),
        suggestions: baseLimits.suggestions === -1 ? -1 : (baseLimits.suggestions + (extras.suggestions || 0)),
    };

    const planType = (details?.name || currentPlanId).toLowerCase();
    const activeModuleIds = new Set<string>();
    
    details?.includedModuleKeys?.forEach(key => activeModuleIds.add(key));

    dbModules?.forEach(m => {
        if (m.status === 'active') activeModuleIds.add(m.id);
        else if (m.status === 'inactive') activeModuleIds.delete(m.id);
    });

    const PREMIUM_PLAN_IDS = new Set([
      'AoKkP9RLp517Nl11aNxt', // Plan Estándar
      'KmDDgHJW2H2e8I69Owud', // Plan Profesional
    ]);
    const planName = details?.name || currentPlanId;
    const normalizedName = planName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Verificación robusta por ID con fallback por nombre para máxima seguridad
    const hasPremiumId = details?.id && PREMIUM_PLAN_IDS.has(details.id);
    const hasPremiumName = normalizedName.includes('estandar') || normalizedName.includes('pro') || normalizedName.includes('enterprise');

    if (hasPremiumId || hasPremiumName) {
        activeModuleIds.add('catalogo');
        activeModuleIds.add('blog');
        activeModuleIds.add('chatbot-integrado-con-whatsapp-para-soporte-y-ventas');
    }

    return {
      plan: details?.name || currentPlanId,
      isActive: !!details || subscription?.status === 'active',
      limits: mergedLimits,
      isFree: planType.includes('gratuito') || planType === 'free',
      isPro: planType.includes('pro'),
      isEnterprise: planType.includes('enterprise') || planType.includes('estándar') || planType.includes('estandar'),
      planDetails: details || null,
      activeModuleIds,
    };
  }, [subscription, allPlans, allHybridPlans, businessData, dbModules]);

  const productsCount = products?.length ?? 0;
  const blogPostsCount = blogPosts?.length ?? 0;
  const landingPagesCount = landingPages?.length ?? 0;
  const ordersCount = orders?.length ?? 0;
  const suggestionsCount = suggestions?.length ?? 0;
  const couponsCount = coupons?.length ?? 0;
  const promotionsCount = promotions?.length ?? 0;

  const canAddBlogPosts = useCallback((currentCount: number): boolean => {
    if (memoizedSubscriptionValues.limits.blogPosts === -1) return true;
    return currentCount < memoizedSubscriptionValues.limits.blogPosts;
  }, [memoizedSubscriptionValues.limits.blogPosts]);

  const canAddProducts = useCallback((currentCount: number): boolean => {
    if (memoizedSubscriptionValues.limits.products === -1) return true;
    return currentCount < memoizedSubscriptionValues.limits.products;
  }, [memoizedSubscriptionValues.limits.products]);

  const canAddOrders = useCallback((currentCount: number): boolean => {
    if (memoizedSubscriptionValues.limits.orders === -1) return true;
    return currentCount < memoizedSubscriptionValues.limits.orders;
  }, [memoizedSubscriptionValues.limits.orders]);
  
  const canAddSuggestions = useCallback((currentCount: number): boolean => {
    if (memoizedSubscriptionValues.limits.suggestions === -1) return true;
    return currentCount < memoizedSubscriptionValues.limits.suggestions;
  }, [memoizedSubscriptionValues.limits.suggestions]);

  const isModuleAuthorized = useCallback((moduleId: string): boolean => {
      return memoizedSubscriptionValues.activeModuleIds.has(moduleId);
  }, [memoizedSubscriptionValues.activeModuleIds]);

  return {
    subscription,
    allPlans,
    allHybridPlans,
    ...memoizedSubscriptionValues,
    isLoading,
    error,
    productsCount,
    blogPostsCount,
    landingPagesCount,
    ordersCount,
    suggestionsCount,
    couponsCount,
    promotionsCount,
    canAddBlogPosts,
    canAddProducts,
    canAddOrders,
    canAddSuggestions,
    isModuleAuthorized,
  };
}
