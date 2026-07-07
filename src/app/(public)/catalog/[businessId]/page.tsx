
'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';

import CatalogHeader from '@/components/catalogo/catalog-header';
import PublicProductCard from '@/components/catalogo/public-product-card';
import ProductViewModal from '@/components/catalogo/product-view-modal';
import { PurchaseModal } from '@/components/catalogo/purchase-modal';
import { CartDrawer } from '@/components/catalogo/cart-drawer';
import { SuggestionModal } from '@/components/suggestions/suggestion-modal';
import { Frown, Loader2, PackageSearch } from 'lucide-react';
import type { LandingHeaderConfigData } from '@/models/landing-page';
import type { Product } from '@/models/product';
import type { PaymentSettings } from '@/models/payment-settings';
import type { SuggestionOutput } from '@/models/suggestion-io';
import type { CartItem } from '@/models/cart';
import { getSuggestion } from '@/ai/flows/suggestion-flow';
import { updateSuggestionMetrics } from '@/ai/flows/update-suggestion-metrics-flow';
import { PublicMenuChatWidget } from '@/components/public-menu-chatbot/PublicMenuChatWidget';
import { useToast } from '@/hooks/use-toast';

interface CatalogPageProps {
    params: { businessId: string };
}

function CatalogPageContent({ params }: CatalogPageProps) {
    const slug = params.businessId;
    const searchParams = useSearchParams();
    const { firestore, isNetworkEnabled } = useFirebase();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageData, setPageData] = useState<{
        headerConfig: LandingHeaderConfigData | null;
        products: Product[] | null;
        paymentSettings: PaymentSettings | null;
        resolvedBusinessId: string | null;
    }>({
        headerConfig: null,
        products: null,
        paymentSettings: null,
        resolvedBusinessId: null,
    });

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    
    const [activeSuggestion, setActiveSuggestion] = useState<{ original: Product, suggestion: SuggestionOutput } | null>(null);

    useEffect(() => {
        if (!firestore || !slug || !isNetworkEnabled) {
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const shareConfigQuery = query(collectionGroup(firestore, 'shareConfig'), where('slug', '==', slug), limit(1));
                const querySnapshot = await getDocs(shareConfigQuery);
                const customSlugDoc = querySnapshot.docs.find(doc => doc.data().useCustomSlug === true);
                
                const businessId = customSlugDoc ? (customSlugDoc.ref.parent.parent?.id ?? slug) : slug;

                const publicCatalogRef = doc(firestore, 'businesses', businessId, 'publicData', 'catalog');
                const paymentSettingsRef = doc(firestore, 'paymentSettings', businessId);
                
                const [catalogSnap, paymentSnap] = await Promise.all([
                    getDoc(publicCatalogRef),
                    getDoc(paymentSettingsRef)
                ]);

                if (!catalogSnap.exists()) {
                    throw new Error("El catálogo no ha sido configurado o publicado por el negocio.");
                }

                const data = catalogSnap.data();
                setPageData({
                    headerConfig: data.headerConfig as LandingHeaderConfigData,
                    products: data.products as Product[],
                    paymentSettings: paymentSnap.exists() ? (paymentSnap.data() as PaymentSettings) : null,
                    resolvedBusinessId: businessId,
                });

            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [slug, firestore, isNetworkEnabled]);

    const handleAddToCart = (product: Product, quantity: number) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
            }
            return [...prev, { ...product, quantity }];
        });
    };

    const handleBuyNow = async (product: Product) => {
        if (pageData.resolvedBusinessId) {
            try {
                const suggestion = await getSuggestion({ businessId: pageData.resolvedBusinessId, productId: product.id });
                if (suggestion && suggestion.suggestedProduct) {
                    setActiveSuggestion({ original: product, suggestion });
                    updateSuggestionMetrics({ 
                        businessId: pageData.resolvedBusinessId, 
                        ruleId: suggestion.ruleId || 'ai-generated', 
                        event: 'shown' 
                    });
                    return;
                }
            } catch (e) {
                console.error("Error al buscar sugerencia:", e);
            }
        }
        
        handleAddToCart(product, 1);
        toast({
            title: "Producto añadido",
            description: `${product.name} se agregó a tu carrito.`,
            action: (
                <button 
                    onClick={() => setIsCartOpen(true)}
                    className="bg-primary text-white text-[10px] font-bold uppercase px-3 py-1 rounded-md"
                >
                    Ver Carrito
                </button>
            ),
        });
    };

    const acceptSuggestion = () => {
        if (!activeSuggestion || !pageData.resolvedBusinessId) return;
        
        updateSuggestionMetrics({ 
            businessId: pageData.resolvedBusinessId, 
            ruleId: activeSuggestion.suggestion.ruleId || 'ai-generated', 
            event: 'accepted' 
        });

        handleAddToCart(activeSuggestion.original, 1);
        handleAddToCart(activeSuggestion.suggestion.suggestedProduct!, 1);
        setActiveSuggestion(null);
        setIsCartOpen(true);
    };

    const handleRatingSync = useCallback((productId: string, newRating: number, newCount: number) => {
        setPageData(prev => {
            if (!prev.products) return prev;
            return {
                ...prev,
                products: prev.products.map(p => 
                    p.id === productId 
                    ? { ...p, rating: newRating, ratingCount: newCount } 
                    : p
                )
            };
        });
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <div className="bg-white p-10