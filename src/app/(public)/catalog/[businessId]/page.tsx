'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Star, Loader2, PackageSearch, Mail, Printer, FileDown, Settings, Frown, ArrowRight, X, Image as ImageIcon, Tag, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/models/product';
import type { Module } from '@/models/module';
import type { LandingPageData, LandingHeaderConfigData } from '@/models/landing-page';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons';
import { useParams, useSearchParams } from 'next/navigation';
import { rateProduct } from '@/ai/flows/rate-product-flow';
import { useToast } from '@/hooks/use-toast';
import { PurchaseModal } from '@/components/catalogo/purchase-modal';
import type { PaymentSettings } from '@/models/payment-settings';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getSuggestion } from '@/ai/flows/suggestion-flow';
import { updateSuggestionMetrics } from '@/ai/flows/update-suggestion-metrics-flow';
import type { SuggestionOutput } from '@/models/suggestion-io';
import { SuggestionModal } from '@/components/suggestions/suggestion-modal';
import PublicNav from '@/components/layout/public-nav';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { promotionService } from '@/services/promotion-service';
import type { Promotion } from '@/models/promotion';
import { format } from 'date-fns';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export interface AppliedPromotion {
  type: '2x1' | 'percentage' | 'fixed';
  originalPrice: number;
  discountedPrice: number;
  promotionId: string;
}

export type CartItem = Product & { 
    quantity: number;
    appliedPromotion?: AppliedPromotion;
};

type MediaItem = {
    url: string;
    type: 'image' | 'video';
};

const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const MediaPreview = ({ item, alt, objectFit = 'cover', priority = false }: { item: MediaItem, alt: string, objectFit?: 'cover' | 'contain', priority?: boolean }) => {
    if (item.type === 'video') {
        return <video src={item.url} className={cn('rounded-md object-cover w-full h-full')} autoPlay loop muted />;
    }
    return (
        <Image 
            key={item.url}
            src={item.url} 
            alt={alt} 
            fill 
            sizes="(max-width: 768px) 100vw, 700px"
            className={cn('rounded-md', objectFit === 'contain' ? 'object-contain' : 'object-cover')} 
            priority={priority}
        />
    );
};

const PublicProductCard = ({ product, onOpenModal, activePromotions }: { product: Product, onOpenModal: (product: Product) => void, activePromotions: Promotion[] }) => {
    const mediaUrl = product.images?.[0] || 'https://picsum.photos/seed/placeholder/600/400';
    const isMediaVideo = isVideo(mediaUrl);

    const applicablePromo = useMemo(() => {
        return activePromotions.find(promo => {
            if (!promo.isActive) return false;
            if (promo.applicableTo === 'all_catalog') return true;
            if (promo.applicableTo === 'category' && promo.categoryName === product.category) return true;
            if (promo.applicableTo === 'specific_item' && (promo.itemId === product.id || promo.itemName === product.name)) return true;
            return false;
        });
    }, [product, activePromotions]);

    const getBadgeText = (promo: Promotion) => {
        if (promo.type === 'bogo') return '2×1';
        if (promo.type === 'percentage') return `${promo.discountValue}% OFF`;
        if (promo.type === 'fixed') return `${formatCurrency(promo.discountValue)} OFF`;
        if (promo.type === 'free_item') return 'REGALO';
        if (promo.type === 'bundle') return 'COMBO';
        return 'OFERTA';
    };

    return (
        <Card className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl h-full border-gray-100 relative">
            <CardHeader className="p-0 relative overflow-hidden">
                {applicablePromo && (
                    <div className="absolute top-2 left-2 z-10 bg-[#FF4500] text-white text-[12px] font-bold px-2 py-1 rounded-[6px] shadow-md border border-white/20 select-none pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                        {getBadgeText(applicablePromo)}
                    </div>
                )}
                <div className="relative aspect-square w-full">
                    {isMediaVideo ? (
                        <video src={mediaUrl} autoPlay loop muted className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <Image src={mediaUrl} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <CardTitle className="text-sm font-bold h-10 overflow-hidden text-gray-900 group-hover:text-primary transition-colors leading-tight mb-2">{product.name}</CardTitle>
                 <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
                    <span>({product.ratingCount})</span>
                </div>
                <div className="flex items-center justify-between mt-auto">
                    <p className="text-base font-black text-primary">{formatCurrency(product.price)}</p>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <Button className="w-full font-bold shadow-sm transition-all" onClick={() => onOpenModal(product)}>
                    {applicablePromo ? `Ver Producto · ${getBadgeText(applicablePromo)}` : 'Ver Producto'}
                </Button>
            </CardFooter>
        </Card>
    );
}

const ProductViewModal = ({ product, isOpen, onOpenChange, businessPhone, businessId, paymentSettings, onAddToCart }: { product: Product | null, isOpen: boolean, onOpenChange: (open: boolean) => void, businessPhone: string, businessId: string | null, paymentSettings: PaymentSettings | null, onAddToCart: (items: CartItem[]) => void }) => {
    const [mainImage, setMainImage] = useState<MediaItem | null>(null);
    const [isRating, setIsRating] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [suggestion, setSuggestion] = useState<SuggestionOutput | null>(null);
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    
    const { toast } = useToast();

    useEffect(() => {
        if (product) {
            setMainImage(product.images?.[0] ? { url: product.images[0], type: isVideo(product.images[0]) ? 'video' : 'image' } : null);
            setUserRating(0);
        }
    }, [product?.id]);
    
    if (!product) return null;
    
    const hasRated = typeof window !== 'undefined' && localStorage.getItem(`rated_${product?.id}`);
    const mediaItems: MediaItem[] = product.images.map(url => ({ url, type: isVideo(url) ? 'video' : 'image' }));

    const handleRating = async (rating: number) => {
        if (!product || !businessId || hasRated) return;
        setIsRating(true);
        setUserRating(rating);
        try {
            const result = await rateProduct({ businessId, productId: product.id, rating });
            if (result.success) {
                localStorage.setItem(`rated_${product.id}`, 'true');
                toast({ title: '¡Gracias por tu opinión!', description: 'Tu calificación ha sido registrada.' });
            } else throw new Error(result.message);
        } catch (error: any) {
            toast({ variant: "destructive", title: 'Error al calificar', description: error.message || 'No se pudo registrar tu calificación.' });
            setUserRating(0);
        } finally { setIsRating(false); }
    };
    
    const handlePurchaseClick = async () => {
        if (!businessId || !product) {
            onAddToCart([{ ...product, quantity: 1 }]);
            onOpenChange(false);
            return;
        }
        setIsLoadingSuggestion(true);
        try {
            const suggestionResult = await getSuggestion({ businessId, productId: product.id });
            if (suggestionResult.suggestedProduct && suggestionResult.ruleId) {
                await updateSuggestionMetrics({ businessId, ruleId: suggestionResult.ruleId, event: 'shown' });
                setSuggestion(suggestionResult);
                setIsSuggestionModalOpen(true);
            } else {
                onAddToCart([{ ...product, quantity: 1 }]);
                onOpenChange(false);
            }
        } catch (error) {
            onAddToCart([{ ...product, quantity: 1 }]);
            onOpenChange(false);
        } finally { setIsLoadingSuggestion(false); }
    };

    const handleSuggestionAccepted = async () => {
        if (!businessId || !product || !suggestion?.suggestedProduct || !suggestion.ruleId) return;
        await updateSuggestionMetrics({ businessId, ruleId: suggestion.ruleId, event: 'accepted' });
        onAddToCart([{ ...product, quantity: 1 }, { ...suggestion.suggestedProduct, quantity: 1 }]);
        toast({ title: "¡Oferta Aceptada!", description: `Se añadió ${suggestion.suggestedProduct.name} a tu pedido.` });
        setIsSuggestionModalOpen(false);
        onOpenChange(false);
    };

    const handleSuggestionDeclined = () => {
        if (product) onAddToCart([{ ...product, quantity: 1 }]);
        setIsSuggestionModalOpen(false);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="w-[95vw] max-w-5xl p-0 overflow-hidden sm:rounded-xl max-h-[95vh] flex flex-col">
                    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                        <div className="md:w-[55%] bg-muted/30 flex flex-col p-4 gap-3 md:overflow-y-auto">
                             <div className="relative w-full aspect-[4/3] md:aspect-square rounded-xl overflow-hidden border bg-white flex-shrink-0">
                                {mainImage ? (
                                    <MediaPreview item={mainImage} alt={product.name} objectFit="contain" priority={true} />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                             <div className="flex-shrink-0 h-[96px]">
                                <ScrollArea className="w-full h-full">
                                    <div className="flex w-max space-x-2 p-1">
                                    {mediaItems.map((item, index) => (
                                        <button 
                                            key={index} 
                                            onClick={() => setMainImage(item)} 
                                            className={cn(
                                                "relative aspect-square w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                                                mainImage?.url === item.url ? "ring-2 ring-primary opacity-100" : "opacity-70 hover:opacity-100"
                                            )}
                                        >
                                            <MediaPreview item={item} alt={`${product.name} thumbnail ${index + 1}`} />
                                        </button>
                                    ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        </div>
                        <div className="md:w-[45%] flex flex-col min-h-0 overflow-hidden">
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-4 sm:p-5 flex flex-col gap-4">
                                     <DialogHeader className="p-0 text-left">
                                        <div className="flex flex-col gap-2">
                                         <Badge className="w-fit">{product.category}</Badge>
                                         <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight">{product.name}</DialogTitle>
                                         <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
                                     </div>
                                    </DialogHeader>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400"/>
                                        <span>{product.rating.toFixed(1)}</span>
                                        <span>({product.ratingCount} valoraciones)</span>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.description }} />
                                    <p className="text-sm">
                                      <span className="font-semibold">Disponibles: </span>
                                       <Badge variant="outline">{product.stock} unidades</Badge>
                                    </p>
                                    <div className="flex flex-col gap-2 pt-3 border-t">
                                        <span className="text-sm font-semibold">Califica este producto:</span>
                                        <div className="flex items-center gap-1">
                                        {[1,2,3,4,5].map(star => (
                                            <button key={star} onClick={() => handleRating(star)} disabled={!!hasRated || isRating}>
                                            <Star className={cn("h-6 w-6 transition-colors", star <= (userRating || product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300")} />
                                            </button>
                                        ))}
                                        {isRating && <Loader2 className="h-4 w-4 animate-spin ml-2"/>}
                                        </div>
                                        {hasRated && <p className="text-xs text-muted-foreground">Ya has calificado este producto.</p>}
                                    </div>
                                </div>
                            </ScrollArea>
                            <div className="p-4 sm:p-5 border-t border-border bg-background flex-shrink-0">
                                <Button size="lg" className="w-full h-12 text-base font-semibold" onClick={handlePurchaseClick} disabled={isLoadingSuggestion}>
                                {isLoadingSuggestion ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <WhatsAppIcon className="mr-2 h-5 w-5" />}
                                {isLoadingSuggestion ? 'Buscando sugerencias...' : 'Comprar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {suggestion?.suggestedProduct && (
                 <SuggestionModal isOpen={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen} originalProduct={product} suggestion={suggestion} onAccept={handleSuggestionAccepted} onDecline={handleSuggestionDeclined} />
            )}
        </>
    )
}

function promoTypeLabel(type: Promotion['type']): string {
  const labels: Record<Promotion['type'], string> = {
    percentage: '% Descuento',
    fixed: 'Valor Fijo',
    bogo: '2x1 / BOGO',
    free_item: 'Ítem Gratis',
    bundle: 'Paquete',
  };
  return labels[type];
}

export default function CatalogPage() {
    const { firestore, isNetworkEnabled } = useFirebase();
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.businessId as string;
    const pageRef = useRef<HTMLDivElement>(null);
    
    const [pageData, setPageData] = useState<{
        resolvedBusinessId: string | null;
        publicData: { products: Product[], headerConfig: LandingHeaderConfigData } | null;
        paymentSettings: PaymentSettings | null;
        landingPageData: LandingPageData | null;
        catalogModule: Module | null;
    }>({
        resolvedBusinessId: null,
        publicData: null,
        paymentSettings: null,
        landingPageData: null,
        catalogModule: null,
    });
    const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        if (!firestore || !slug || !isNetworkEnabled) return;
        const initializePage = async () => {
            setIsLoading(true);
            try {
                const shareConfigQuery = query(collectionGroup(firestore, 'shareConfig'), where('slug', '==', slug), limit(1));
                const querySnapshot = await getDocs(shareConfigQuery);
                const customSlugDoc = querySnapshot.docs.find(doc => doc.data().useCustomSlug === true);
                const businessId = customSlugDoc ? (customSlugDoc.ref.parent.parent?.id ?? slug) : slug;
                if (!businessId) throw new Error("No se pudo determinar el ID del negocio.");
                
                const [primaryModuleSnap, publicDataSnap, paymentSettingsSnap, landingPageSnap, promos] = await Promise.all([
                    getDoc(doc(firestore, 'modules', 'catalogo')),
                    getDoc(doc(firestore, `businesses/${businessId}/publicData`, 'catalog')),
                    getDoc(doc(firestore, 'paymentSettings', businessId)),
                    getDoc(doc(firestore, `businesses/${businessId}/landingPages`, 'main')),
                    promotionService.getActivePromotions(businessId)
                ]);

                if (!primaryModuleSnap.exists() || primaryModuleSnap.data().status !== 'active') throw new Error("Módulo inactivo.");

                setPageData({
                    resolvedBusinessId: businessId,
                    publicData: publicDataSnap.exists() ? publicDataSnap.data() as any : null,
                    paymentSettings: paymentSettingsSnap.exists() ? paymentSettingsSnap.data() as any : null,
                    landingPageData: landingPageSnap.exists() ? landingPageSnap.data() as any : null,
                    catalogModule: primaryModuleSnap.data() as any,
                });
                setActivePromotions(promos);
            } catch (e: any) { setError(e.message); }
            finally { setIsLoading(false); }
        };
        initializePage();
    }, [firestore, slug, isNetworkEnabled]);

    const getPromotionForItem = useCallback((item: Product, quantity: number): AppliedPromotion | undefined => {
        const promo = activePromotions.find(p => 
            p.isActive &&
            (p.applicableTo === 'all_catalog' ||
             (p.applicableTo === 'category' && p.categoryName === item.category) ||
             (p.applicableTo === 'specific_item' && (p.itemId === item.id || p.itemName === item.name)))
        );

        if (!promo) return undefined;

        let discountedPrice = item.price;
        if (promo.type === 'percentage') {
            discountedPrice = item.price * (1 - (promo.discountValue || 0) / 100);
        } else if (promo.type === 'fixed') {
            discountedPrice = Math.max(0, item.price - (promo.discountValue || 0));
        } else if (promo.type === 'bogo') {
            if (quantity >= 2) {
                const pairs = Math.floor(quantity / 2);
                const singles = quantity % 2;
                const totalCost = (pairs * item.price) + (singles * item.price);
                discountedPrice = totalCost / quantity;
            }
        }

        if (discountedPrice === item.price) return undefined;

        return {
            type: promo.type === 'bogo' ? '2x1' : (promo.type === 'percentage' ? 'percentage' : 'fixed'),
            originalPrice: item.price,
            discountedPrice,
            promotionId: promo.id
        };
    }, [activePromotions]);

    const handleAddToCart = (itemsToAdd: CartItem[]) => {
        setCart(prev => {
            const newCart = [...prev];
            itemsToAdd.forEach(newItem => {
                const idx = newCart.findIndex(item => item.id === newItem.id);
                if (idx > -1) {
                    const newQty = newCart[idx].quantity + newItem.quantity;
                    newCart[idx].quantity = newQty;
                    newCart[idx].appliedPromotion = getPromotionForItem(newCart[idx], newQty);
                } else {
                    const appliedPromo = getPromotionForItem(newItem, newItem.quantity);
                    newCart.push({ ...newItem, appliedPromotion: appliedPromo });
                }
            });
            return newCart;
        });
        setIsPurchaseModalOpen(true);
    };

    const handleUpdateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const appliedPromo = getPromotionForItem(item, newQuantity);
                return { ...item, quantity: newQuantity, appliedPromotion: appliedPromo };
            }
            return item;
        }));
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    if (error) return <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4"><PackageSearch className="h-16 w-16 text-muted-foreground mb-4" /><h1 className="text-2xl font-bold">Catálogo no encontrado</h1><p className="text-muted-foreground mt-2 max-w-md">{error}</p></div>;

    const products = pageData.publicData?.products || [];
    const headerConfig = pageData.publicData?.headerConfig || null;

    return (
        <div id="catalog-page-root" ref={pageRef} className="bg-muted/40">
            <PublicNav navigation={pageData.landingPageData?.navigation} businessId={pageData.resolvedBusinessId ?? undefined} />
            <CatalogHeader 
                config={headerConfig} 
                cartItemCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
                onCartClick={() => setIsPurchaseModalOpen(true)}
            />
            <main className="container mx-auto max-w-[1400px] py-8 px-4 sm:px-6 lg:px-8 xl:px-12">
                {activePromotions.filter(p => p.showInCatalog).length > 0 && (
                  <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900"><Tag className="h-6 w-6 text-primary" /> Promociones Activas</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {activePromotions.filter(p => p.showInCatalog).map(promo => (
                        <Card key={promo.id} className="min-w-[280px] border-none border-l-4 border-l-[#FF4500] bg-white shadow-md hover:shadow-lg transition-shadow flex-shrink-0 rounded-xl overflow-hidden">
                          <CardContent className="p-4 flex flex-col h-full">
                            <Badge className="mb-2 w-fit bg-[#FF4500] text-white text-[14px] hover:bg-[#FF4500] border-none px-3 py-1 rounded-lg">
                                {promoTypeLabel(promo.type)}
                            </Badge>
                            <p className="text-[16px] font-bold text-gray-900 leading-tight mb-1">{promo.title}</p>
                            <p className="text-[13px] text-[#444] line-clamp-2 flex-grow">{promo.description}</p>
                            <div className="mt-3 pt-2 border-t border-gray-100">
                                <p className="text-[12px] text-[#FF4500] font-bold flex items-center gap-1">
                                    Válido hasta: {format(new Date(promo.validUntil), 'dd/MM/yyyy')}
                                </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
                {products.length === 0 ? (
                    <Card><CardContent className="h-[400px] flex flex-col items-center justify-center text-center gap-4"><div className="p-4 bg-secondary rounded-full"><PackageSearch className="h-12 w-12 text-muted-foreground" /></div><h3 className="text-xl font-semibold">Este catálogo se está construyendo</h3></CardContent></Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
                        {products.map(p => <PublicProductCard key={p.id} product={p} onOpenModal={setSelectedProduct} activePromotions={activePromotions} />)}
                    </div>
                )}
            </main>
            <ProductViewModal product={selectedProduct} isOpen={!!selectedProduct} onOpenChange={(o) => !o && setSelectedProduct(null)} businessPhone={headerConfig?.businessInfo.phone || ''} businessId={pageData.resolvedBusinessId} paymentSettings={pageData.paymentSettings} onAddToCart={handleAddToCart} />
            {pageData.resolvedBusinessId && (
                <PurchaseModal 
                    isOpen={isPurchaseModalOpen} 
                    onOpenChange={setIsPurchaseModalOpen} 
                    cartItems={cart} 
                    onRemoveItem={(id) => setCart(c => c.filter(i => i.id !== id))} 
                    onUpdateQuantity={handleUpdateQuantity} 
                    businessId={pageData.resolvedBusinessId} 
                    businessInfo={headerConfig?.businessInfo ?? null} 
                    paymentSettings={pageData.paymentSettings} 
                />
            )}
            <footer className="w-full border-t bg-background"><div className="container flex items-center justify-center h-16 px-4 md:px-6"><p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {headerConfig?.businessInfo.name || 'Negocio V03'}.</p></div></footer>
        </div>
    );
}

interface CatalogHeaderProps {
  config: LandingHeaderConfigData | null;
  cartItemCount: number;
  onCartClick: () => void;
}

const CatalogHeader = ({ config, cartItemCount, onCartClick }: CatalogHeaderProps) => {
    if (!config) return <div className="bg-card shadow-md p-4 text-center"><h1 className="text-2xl font-bold">Catálogo de Productos</h1></div>;
    const socialIcons: any = { tiktok: <TikTokIcon />, instagram: <InstagramIcon />, facebook: <FacebookIcon />, whatsapp: <WhatsAppIcon />, twitter: <XIcon />, };
    
    // SANITIZACIÓN CRÍTICA PARA PRODUCCIÓN:
    // Asegurar que el número para el enlace directo de WhatsApp esté limpio.
    const rawHeaderPhone = String(config.businessInfo.phone || '');
    const cleanHeaderPhone = rawHeaderPhone.replace(/\D/g, '');

    return (
        <div className="w-full">
            {config.banner.mediaUrl && <div className="relative w-full h-[200px] sm:h-[280px] lg:h-[360px] xl:h-[420px]">{config.banner.mediaType === 'image' ? <Image src={config.banner.mediaUrl} alt="Banner" fill sizes="100vw" className="object-cover"/> : <video src={config.banner.mediaUrl} autoPlay loop muted controls className="w-full h-full object-cover" />}</div>}
            <div className="bg-card shadow-md p-4">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="text-xl md:text-3xl font-bold">{config.businessInfo.name}</h1>
                        <p className="text-sm text-muted-foreground">{config.businessInfo.address}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {Object.entries(config.socialLinks).map(([k, v]) => v && <a key={k} href={v as string} target="_blank" className="text-muted-foreground hover:text-primary">{socialIcons[k]}</a>)}
                        <Button asChild size="sm">
                            <a href={`https://wa.me/${cleanHeaderPhone}`} target="_blank">
                                <WhatsAppIcon className="mr-2 h-4 w-4" /> Contactar
                            </a>
                        </Button>
                        <button
                          onClick={onCartClick}
                          className="relative flex items-center justify-center p-2 rounded-full hover:bg-muted transition-colors ml-2"
                          aria-label="Ver carrito"
                        >
                          <ShoppingCart className="h-6 w-6 text-foreground" />
                          {cartItemCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-card">
                              {cartItemCount > 99 ? '99+' : cartItemCount}
                            </span>
                          )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
