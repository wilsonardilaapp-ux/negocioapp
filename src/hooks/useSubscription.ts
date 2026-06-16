'use client';

import { useMemo, useState, useEffect } from 'react';
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
    () => (user?.uid ? query(collection(firestore, 'businesses'), where('userId', '==', user.uid), limit(1)) : null),
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

  const { plan, isActive, limits, isFree, isPro, isEnterprise } = useMemo(() => {
    const currentPlanId = (businessData as any)?.planName ?? subscription?.plan ?? 'free';
    
    // Buscar en planes normales o híbridos
    const planDetails = allPlans?.find(p => p.id === currentPlanId) || 
                       allHybridPlans?.find(p => p.id === currentPlanId || p.name === currentPlanId);

    const defaultLimits: PlanLimits = { products: 0, blogPosts: 0, landingPages: 0, coupons: 0, promotions: 0, orders: -1, suggestions: 0 };

    const extras = (businessData as any)?.limitesExtra || {};
    const baseLimits = planDetails?.limits ?? defaultLimits;

    const mergedLimits: PlanLimits = {
        products: baseLimits.products === -1 ? -1 : (baseLimits.products + (extras.products || 0)),
        blogPosts: baseLimits.blogPosts === -1 ? -1 : (baseLimits.blogPosts + (extras.blogPosts || 0)),
        landingPages: baseLimits.landingPages === -1 ? -1 : (baseLimits.landingPages + (extras.landingPages || 0)),
        promotions: baseLimits.promotions === -1 ? -1 : (baseLimits.promotions + (extras.promotions || 0)),
        coupons: baseLimits.coupons === -1 ? -1 : (baseLimits.coupons + (extras.coupons || 0)),
        orders: baseLimits.orders === -1 ? -1 : (baseLimits.orders + (extras.orders || 0)),
        suggestions: baseLimits.suggestions === -1 ? -1 : (baseLimits.suggestions + (extras.suggestions || 0)),
    };

    const planType = currentPlanId.toLowerCase();

    return {
      plan: currentPlanId,
      isActive: subscription?.status === 'active',
      limits: mergedLimits,
      isFree: planType === 'free',
      isPro: planType.includes('pro'),
      isEnterprise: planType.includes('enterprise'),
    };
  }, [subscription, allPlans, allHybridPlans, businessData]);

  const productsCount = products?.length ?? 0;
  const blogPostsCount = blogPosts?.length ?? 0;
  const landingPagesCount = landingPages?.length ?? 0;
  const ordersCount = orders?.length ?? 0;
  const suggestionsCount = suggestions?.length ?? 0;
  const couponsCount = coupons?.length ?? 0;
  const promotionsCount = promotions?.length ?? 0;

  const canAddBlogPosts = (currentCount: number): boolean => {
    if (limits.blogPosts === -1) return true;
    return currentCount < limits.blogPosts;
  };

  const canAddProducts = (currentCount: number): boolean => {
    if (limits.products === -1) return true;
    return currentCount < limits.products;
  };

  const canAddOrders = (currentCount: number): boolean => {
    if (limits.orders === -1) return true;
    return currentCount < limits.orders;
  };
  
  const canAddSuggestions = (currentCount: number): boolean => {
    if (limits.suggestions === -1) return true;
    return currentCount < limits.suggestions;
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
    ordersCount,
    suggestionsCount,
    couponsCount,
    promotionsCount,
    canAddBlogPosts,
    canAddProducts,
    canAddOrders,
    canAddSuggestions,
  };
}
