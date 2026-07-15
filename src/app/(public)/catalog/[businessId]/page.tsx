'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit, collection } from 'firebase/firestore';

import CatalogHeader from '@/components/catalogo/catalog-header';
import PublicProductCard from '@/components/catalogo/public-product-card';
import ProductViewModal from '@/components/catalogo/product-view-modal';
import { PurchaseModal } from '@/components/catalogo/purchase-modal';
import { CartDrawer } from '@/components/catalogo/cart-drawer';
import { SuggestionModal } from '@/components/suggestions/suggestion-modal';
import { Frown, Loader2, PackageSearch, Utensils, Star, Award, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import type { LandingHeaderConfigData } from '@/models/landing-page';
import type { Product } from '@/models/product';
import type { Promotion } from '@/models/promotion';
import type { PaymentSettings } from '@/models/payment-settings';
import type { SuggestionOutput } from '@/models/suggestion-io';
import type { CartItem } from '@/models/cart';
import { getSuggestion } from '@/ai/flows/suggestion-flow';
import { updateSuggestionMetrics } from '@/ai/flows/update-suggestion-metrics-flow';
import { PublicMenuChatWidget } from '@/components/public-menu-chatbot/PublicMenuChatWidget';
import { useToast } from '@/hooks/use-toast';
import { promotionService } from '@/services/promotion-service';
import { useSubscription } from '@/hooks/useSubscription';

// Componentes de Fidelización y Reseñas
import ReviewForm from '@/components/catalogo/ReviewForm';
import ReviewSummary from '@/components/reviews/ReviewSummary';
import LoyaltyStatus from '@/components/loyalty/LoyaltyStatus';
import RewardsCatalog from '@/components/loyalty/RewardsCatalog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Business } from '@/models/business';
import type { Reward } from '@/services/loyalty-service';

// Carrusel
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CatalogPageProps {
    params: { businessId: string };
}

const ITEMS_PER_PAGE = 20;

function CatalogPageContent({ params }: CatalogPageProps) {
    const slug = decodeURIComponent(params.businessId);
    const { firestore, isNetworkEnabled } = useFirebase();
    const { toast } = useToast();
    const { isModuleAuthorized } = useSubscription();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageData, setPageData] = useState<{
        headerConfig: LandingHeaderConfigData | null;
        products: Product[] | null;
        promotions: Promotion[] | null;
        paymentSettings: PaymentSettings | null;
        resolvedBusinessId: string | null;
    }>({
        headerConfig: null,
        products: null,
        promotions: null,
        paymentSettings: null,
        resolvedBusinessId: null,
    });

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    
    // --- ESTADOS DE PAGINACIÓN Y FILTRADO ---
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    
    // Estado para la sesión de fidelización del cliente
    const [loyaltySession, setLoyaltySession] = useState<{ balance: number; whatsapp: string } | null>(null);
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
                    promotions: (data.promotions as Promotion[]) || [],
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

    // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
    
    // Obtener lista única de categorías para el selector
    const categoriesList = useMemo(() => {
        if (!pageData.products) return ['Todas'];
        const uniqueCats = Array.from(new Set(pageData.products.map(p => p.category).filter(Boolean)));
        return ['Todas', ...uniqueCats.sort()];
    }, [pageData.products]);

    // Filtrar productos por categoría seleccionada
    const filteredProducts = useMemo(() => {
        if (!pageData.products) return [];
        if (selectedCategory === 'Todas') return pageData.products;
        return pageData.products.filter(p => p.category === selectedCategory);
    }, [pageData.products, selectedCategory]);

    // Aplicar paginación (Slicing) al array ya filtrado
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    // Resetear a página 1 cuando cambia la categoría
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory]);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Suscripciones para Fidelización y Reseñas
    const businessRef = useMemoFirebase(() => 
        pageData.resolvedBusinessId ? doc(firestore, 'businesses', pageData.resolvedBusinessId) : null,
    [firestore, pageData.resolvedBusinessId]);
    const { data: businessInfo } = useDoc<Business>(businessRef);

    const rewardsQuery = useMemoFirebase(() => 
        pageData.resolvedBusinessId ? query(collection(firestore, `businesses/${pageData.resolvedBusinessId}/rewards`), where('isActive', '==', true)) : null,
    [firestore, pageData.resolvedBusinessId]);
    const { data: rewards } = useCollection<Reward>(rewardsQuery);

    const isLoyaltyActive = useMemo(() => isModuleAuthorized('loyalty'), [isModuleAuthorized]);

    const handleAddToCart = (product: Product, quantity: number) => {
        const discountInfo = promotionService.calculateDiscountedPrice(product, pageData.promotions || []);
        
        let appliedPromotion = undefined;
        if (discountInfo.hasDiscount && discountInfo.promotion) {
            appliedPromotion = {
                type: discountInfo.promotion.type as 'percentage' | 'fixed',
                originalPrice: discountInfo.originalPrice,
                discountedPrice: discountInfo.finalPrice,
                promotionId: discountInfo.promotion.id
            };
        }

        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id 
                        ? { 
                            ...item, 
                            quantity: item.quantity + quantity,
                            appliedPromotion: item.appliedPromotion || appliedPromotion 
                        } 
                        : item
                );
            }
            return [...prev, { ...product, quantity, appliedPromotion }];
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
                    className="bg-primary text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full"
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
                <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
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
                    cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    onOpenCart={() => setIsCartOpen(true)}
                />
            )}

            {/* --- CARRUSEL PROMOCIONAL --- */}
            {pageData.headerConfig?.carouselItems && pageData.headerConfig.carouselItems.some(item => item.mediaUrl) && (
                <div className="w-full bg-white border-b overflow-hidden">
                    <Carousel 
                        className="w-full" 
                        opts={{ loop: true }}
                        plugins={[
                            Autoplay({
                                delay: 5000,
                                stopOnInteraction: true,
                            }),
                        ]}
                    >
                        <CarouselContent>
                            {pageData.headerConfig.carouselItems.map(item => item.mediaUrl && (
                                <CarouselItem key={item.id}>
                                    <div className="relative aspect-video w-full">
                                        {item.mediaType === 'image' ? (
                                            <Image 
                                                src={item.mediaUrl} 
                                                alt={item.slogan || 'Promoción'} 
                                                fill 
                                                priority
                                                sizes="100vw" 
                                                className="object-cover" 
                                            />
                                        ) : (
                                            <video 
                                                src={item.mediaUrl} 
                                                autoPlay 
                                                loop 
                                                muted 
                                                className="w-full h-full object-cover" 
                                            />
                                        )}
                                        {item.slogan && (
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
                                                <p className="text-white text-xl md:text-5xl font-black text-center drop-shadow-xl animate-in fade-in zoom-in duration-700">
                                                    {item.slogan}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </div>
            )}

            <main className="container mx-auto px-4 py-8">
                <Tabs defaultValue="menu" className="w-full">
                    <div className="flex justify-center mb-8 sticky top-4 z-40">
                        <TabsList className="bg-white shadow-xl border rounded-full p-1 h-14">
                            <TabsTrigger value="menu" className="rounded-full px-6 gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                                <Utensils className="h-4 w-4" /> Menú
                            </TabsTrigger>
                            <TabsTrigger value="reviews" className="rounded-full px-6 gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                                <Star className="h-4 w-4" /> Reseñas
                            </TabsTrigger>
                            {isLoyaltyActive && (
                                <TabsTrigger value="puntos" className="rounded-full px-6 gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                                    <Award className="h-4 w-4" /> Mis Puntos
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    <TabsContent value="menu" className="animate-in fade-in duration-500 outline-none space-y-8">
                        {/* Selector de Categorías */}
                        {categoriesList.length > 2 && (
                            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {categoriesList.map((cat) => (
                                    <Button
                                        key={cat}
                                        variant={selectedCategory === cat ? 'default' : 'outline'}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "rounded-full px-6 h-10 font-bold transition-all shrink-0",
                                            selectedCategory === cat ? "shadow-md scale-105" : "text-muted-foreground"
                                        )}
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {paginatedProducts.map(product => (
                                <PublicProductCard 
                                    key={product.id} 
                                    product={product} 
                                    promotions={pageData.promotions || []}
                                    onView={() => setSelectedProduct(product)}
                                    onBuy={() => handleBuyNow(product)}
                                />
                            ))}
                        </div>

                        {/* Controles de Paginación */}
                        {totalPages > 1 && (
                            <div className="flex flex-col items-center gap-4 mt-12 py-6 border-t">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="h-10 px-4 font-bold rounded-xl"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }).map((_, i) => {
                                            const pageNum = i + 1;
                                            // Solo mostrar algunas páginas si hay demasiadas
                                            if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                                                if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="px-1">...</span>;
                                                return null;
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={cn(
                                                        "h-8 w-8 p-0 font-bold rounded-lg",
                                                        currentPage === pageNum && "shadow-sm"
                                                    )}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="h-10 px-4 font-bold rounded-xl"
                                    >
                                        Siguiente <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {(!pageData.products || pageData.products.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                                <PackageSearch className="h-16 w-16 mb-4 opacity-20" />
                                <h3 className="text-xl font-semibold">No hay productos disponibles</h3>
                                <p>El catálogo está vacío actualmente.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="reviews" className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none">
                        <ReviewSummary 
                            rating={businessInfo?.rating || 5.0} 
                            reviewCount={businessInfo?.reviewCount || 0} 
                            distribution={businessInfo?.ratingDistribution}
                        />
                        <ReviewForm businessId={pageData.resolvedBusinessId!} />
                    </TabsContent>

                    {isLoyaltyActive && (
                        <TabsContent value="puntos" className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none">
                            <LoyaltyStatus 
                                businessId={pageData.resolvedBusinessId!} 
                                onSuccess={(balance, whatsapp) => setLoyaltySession({ balance, whatsapp })}
                            />
                            <Card className="border-none shadow-sm bg-primary/5">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Award className="h-6 w-6 text-primary" />
                                        <CardTitle className="text-xl">Premios Disponibles</CardTitle>
                                    </div>
                                    <CardDescription>Canjea tus puntos acumulados por estos productos o servicios.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <RewardsCatalog 
                                        businessId={pageData.resolvedBusinessId!}
                                        rewards={rewards || []}
                                        currentBalance={loyaltySession?.balance || 0}
                                        whatsapp={loyaltySession?.whatsapp || ''}
                                        onRedeemed={() => setLoyaltySession(null)} 
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </main>

            <ProductViewModal 
                product={selectedProduct} 
                businessId={pageData.resolvedBusinessId}
                isOpen={!!selectedProduct} 
                onOpenChange={(open) => !open && setSelectedProduct(null)}
                onAddToCart={(qty) => {
                    handleAddToCart(selectedProduct!, qty);
                    setSelectedProduct(null);
                    setIsCartOpen(true);
                }}
                onRatingUpdated={handleRatingSync}
            />

            <CartDrawer 
                isOpen={isCartOpen}
                onOpenChange={setIsCartOpen}
                cartItems={cartItems}
                onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.id !== id))}
                onUpdateQuantity={(id, qty) => setCartItems(prev => prev.map(i => i.id === id ? {...i, quantity: qty} : i))}
                onCheckout={() => {
                    setIsCartOpen(false);
                    setIsPurchaseModalOpen(true);
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
                        setIsCartOpen(true);
                    }}
                />
            )}

            <PublicMenuChatWidget businessId={pageData.resolvedBusinessId!} />
        </div>
    );
}

export default function CatalogPage(props: CatalogPageProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
      <CatalogPageContent {...props} />
    </Suspense>
  );
}
