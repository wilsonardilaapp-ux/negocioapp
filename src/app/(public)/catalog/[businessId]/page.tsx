'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';

import CatalogHeader from '@/components/catalogo/catalog-header';
import PublicProductCard from '@/components/catalogo/public-product-card';
import ProductViewModal from '@/components/catalogo/product-view-modal';
import { PurchaseModal } from '@/components/catalogo/purchase-modal';
import { SuggestionModal } from '@/components/catalogo/suggestion-modal';
import { Frown, Loader2, PackageSearch } from 'lucide-react';
import type { LandingHeaderConfigData } from '@/models/landing-page';
import type { Product } from '@/models/product';
import type { PaymentSettings } from '@/models/payment-settings';
import type { SuggestionOutput } from '@/models/suggestion-io';
import type { CartItem } from '@/models/cart';
import { getSuggestion } from '@/ai/flows/suggestion-flow';
import { updateSuggestionMetrics } from '@/ai/flows/update-suggestion-metrics-flow';
import { PublicMenuChatWidget } from '@/components/public-menu-chatbot/PublicMenuChatWidget';

interface CatalogPageProps {
    params: { businessId: string };
}

export default function CatalogPage({ params }: CatalogPageProps) {
    const slug = params.businessId;
    const searchParams = useSearchParams();
    const { firestore, isNetworkEnabled } = useFirebase();

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
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    
    // Sugerencia
    const [activeSuggestion, setActiveSuggestion] = useState<{ original: Product, suggestion: SuggestionOutput } | null>(null);

    useEffect(() => {
        if (!firestore || !slug || !isNetworkEnabled) {
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Resolve slug to businessId
                const shareConfigQuery = query(collectionGroup(firestore, 'shareConfig'), where('slug', '==', slug), limit(1));
                const querySnapshot = await getDocs(shareConfigQuery);
                const customSlugDoc = querySnapshot.docs.find(doc => doc.data().useCustomSlug === true);
                
                const businessId = customSlugDoc ? (customSlugDoc.ref.parent.parent?.id ?? slug) : slug;

                // 2. Fetch denormalized catalog
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

    // Actions
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
        // 1. Ver si hay sugerencia
        if (pageData.resolvedBusinessId) {
            try {
                const suggestion = await getSuggestion({ businessId: pageData.resolvedBusinessId, productId: product.id });
                if (suggestion && suggestion.suggestedProduct) {
                    setActiveSuggestion({ original: product, suggestion });
                    // Notificar vista de sugerencia
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
        
        // 2. Si no hay sugerencia o falla, directo al checkout
        handleAddToCart(product, 1);
        setIsPurchaseModalOpen(true);
    };

    const acceptSuggestion = () => {
        if (!activeSuggestion || !pageData.resolvedBusinessId) return;
        
        // Registrar aceptación
        updateSuggestionMetrics({ 
            businessId: pageData.resolvedBusinessId, 
            ruleId: activeSuggestion.suggestion.ruleId || 'ai-generated', 
            event: 'accepted' 
        });

        handleAddToCart(activeSuggestion.original, 1);
        handleAddToCart(activeSuggestion.suggestion.suggestedProduct!, 1);
        setActiveSuggestion(null);
        setIsPurchaseModalOpen(true);
    };

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
                <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                    <Frown className="text-red-300 w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-800">Catálogo no disponible</h2>
                    <p className="text-gray-500 leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-muted/40 min-h-screen pb-20">
            {pageData.headerConfig && (
                <CatalogHeader 
                    config={pageData.headerConfig} 
                    cartCount={cartItems.length}
                    onOpenCart={() => setIsPurchaseModalOpen(true)}
                />
            )}

            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {pageData.products?.map(product => (
                        <PublicProductCard 
                            key={product.id} 
                            product={product} 
                            onView={() => setSelectedProduct(product)}
                            onBuy={() => handleBuyNow(product)}
                        />
                    ))}
                </div>

                {(!pageData.products || pageData.products.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                        <PackageSearch className="h-16 w-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-semibold">No hay productos disponibles</h3>
                        <p>El catálogo está vacío actualmente.</p>
                    </div>
                )}
            </main>

            <ProductViewModal 
                product={selectedProduct} 
                isOpen={!!selectedProduct} 
                onOpenChange={(open) => !open && setSelectedProduct(null)}
                onAddToCart={(qty) => {
                    handleAddToCart(selectedProduct!, qty);
                    setSelectedProduct(null);
                }}
            />

            <PurchaseModal 
                isOpen={isPurchaseModalOpen}
                onOpenChange={setIsPurchaseModalOpen}
                cartItems={cartItems}
                onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.id !== id))}
                onUpdateQuantity={(id, qty) => setCartItems(prev => prev.map(i => i.id === id ? {...i, quantity: qty} : i))}
                onClearCart={() => setCartItems([])}
                businessId={pageData.resolvedBusinessId!}
                businessInfo={pageData.headerConfig?.businessInfo || null}
                paymentSettings={pageData.paymentSettings}
            />

            {activeSuggestion && (
                <SuggestionModal 
                    isOpen={!!activeSuggestion}
                    onOpenChange={(open) => !open && setActiveSuggestion(null)}
                    originalProduct={activeSuggestion.original}
                    suggestion={activeSuggestion.suggestion}
                    onAccept={acceptSuggestion}
                    onDecline={() => {
                        handleAddToCart(activeSuggestion.original, 1);
                        setActiveSuggestion(null);
                        setIsPurchaseModalOpen(true);
                    }}
                />
            )}

            <PublicMenuChatWidget businessId={pageData.resolvedBusinessId!} />
        </div>
    );
}
