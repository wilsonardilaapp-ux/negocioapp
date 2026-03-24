
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Subscription } from '@/models/subscription';
import type { SubscriptionPlan, PlanLimits } from '@/models/subscription-plan';
import type { Product } from '@/models/product';
import type { BlogPost } from '@/models/blog-post';
import type { LandingPageData } from '@/models/landing-page';

export function useSubscription() {
  const { user } = useUser();
  const firestore = useFirestore();

  // References
  const subscriptionRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, `businesses/${user.uid}/subscription`, 'current') : null),
    [user?.uid, firestore]
  );
  const plansRef = useMemoFirebase(() => firestore ? collection(firestore, 'plans') : null, [firestore]);
  const productsRef = useMemoFirebase(() => user?.uid ? collection(firestore, `businesses/${user.uid}/products`) : null, [user?.uid, firestore]);
  const blogPostsQuery = useMemoFirebase(() => 
    user?.uid ? query(collection(firestore, 'blog_posts'), where('businessId', '==', user.uid)) : null, 
    [user?.uid, firestore]
  );
  const landingPagesRef = useMemoFirebase(() => user?.uid ? collection(firestore, `businesses/${user.uid}/landingPages`) : null, [user?.uid, firestore]);

  // Data fetching
  const { data: subscription, isLoading: isSubLoading, error: subError } = useDoc<Subscription>(subscriptionRef);
  const { data: allPlans, isLoading: arePlansLoading, error: plansError } = useCollection<SubscriptionPlan>(plansRef);
  const { data: products, isLoading: isProductsLoading, error: productsError } = useCollection<Product>(productsRef);
  const { data: blogPosts, isLoading: isBlogPostsLoading, error: blogPostsError } = useCollection<BlogPost>(blogPostsQuery);
  const { data: landingPages, isLoading: isLandingPagesLoading, error: landingPagesError } = useCollection<LandingPageData>(landingPagesRef);
  
  const error = subError || plansError || productsError || blogPostsError || landingPagesError;
  const isLoading = isSubLoading || arePlansLoading || isProductsLoading || isBlogPostsLoading || isLandingPagesLoading;

  const { plan, isActive, limits, isFree, isPro, isEnterprise } = useMemo(() => {
    const currentPlanId = subscription?.plan || 'free';
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

  // Usage counts
  const productsCount = products?.length ?? 0;
  const blogPostsCount = blogPosts?.length ?? 0;
  const landingPagesCount = landingPages?.length ?? 0;
  
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
