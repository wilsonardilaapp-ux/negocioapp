'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Star, Loader2, PackageSearch, Tag, ShoppingCart, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/models/product';
import type { Module } from '@/models/module';
import type { LandingPageData, LandingHeaderConfigData } from '@/models/landing-page';
import { WhatsAppIcon, TikTokIcon, InstagramIcon, FacebookIcon, XIcon } from '@/components/icons';
import { useParams } from 'next/navigation';
import { rateProduct } from '@/ai/flows/rate-product-flow';
import { useToast } from '@/hooks/use-toast';
import { PurchaseModal } from '@/components/catalogo/purchase-modal';
import type { PaymentSettings } from '@/models/payment-settings';
import { getSuggestion } from '@/ai/flows/suggestion-flow';
import { updateSuggestionMetrics } from '@/ai/flows/update-suggestion-metrics-flow';
import type { SuggestionOutput } from '@/models/suggestion-io';
import { SuggestionModal } from '@/components/suggestions/suggestion-modal';
import PublicNav from '@/components/layout/public-nav';
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

const MediaPreview = ({ item, alt, objectFit = 'cover', priority = false }: { item: MediaItem, alt: string, objectFit?: 'cover' | 'contain' | 'fill', priority?: boolean }) => {
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
        const productName = (product.name || '').toLowerCase().trim();
        const productCategory = (product.category || '').toLowerCase().trim();

        return activePromotions.find(promo => {
            if (!promo.isActive) return false;
            if (promo.applicableTo === 'all_catalog') return true;
            if (promo.applicableTo === 'category' && promo.categoryName) {
                return promo.categoryName.toLowerCase().trim() === productCategory;
            }
            if (promo.applicableTo === 'specific_item') {
                return promo.itemId === product.id || (promo.itemName && promo.itemName.toLowerCase().trim() === productName);
            }
            return false;
        });
    }, [product, activePromotions]);

    const getBadgeText = (promo: Promotion) => {
        if (promo.type === 'bogo') return '2×1';
        if (promo.type === 'percentage') return `${promo.discountValue}% OFF`;
        if (promo.type === 'fixed') return `${formatCurrency(promo.discountValue)} OFF`;
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
                        <Image src={mediaUrl} alt={product.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
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
                    Ver Producto
                </Button>
            </CardFooter>
        </Card>
    );
}

const ProductViewModal = ({ product, isOpen, onOpenChange, businessId, onAddToCart }: { product: Product | null, isOpen: boolean, onOpenChange: (open: boolean) => void, businessId: string | null, onAddToCart: (items: CartItem[]) => void }) => {
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
                                        <button key={index} onClick={() => setMainImage(item)} className={cn("relative aspect-square w-16 h-16 shrink-0 rounded-lg overflow-hidden ring-offset-background", mainImage?.url === item.url ? "ring-2 ring-primary opacity-100" : "opacity-70")}>
                                            <MediaPreview item={item} alt={`${product.name} ${index + 1}`} />
                                        </button>
                                    ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        </div>
                        <div className="md:w-[45%] flex flex-col min-h-0 overflow-hidden">
                            <ScrollArea className="flex-1">
                                <div className="p-4 sm:p-5 flex flex-col gap-4">
                                     <DialogHeader className="p-0 text-left">
                                         <Badge className="w-fit">{product.category}</Badge>
                                         <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight">{product.name}</DialogTitle>
                                         <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
                                    </DialogHeader>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400"/><span>{product.rating.toFixed(1)}</span></div>
                                    <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.description }} />
                                    <div className="flex flex-col gap-2 pt-3 border-t">
                                        <span className="text-sm font-semibold">Califica este producto:</span>
                                        <div className="flex items-center gap-1">
                                        {[1,2,3,4,5].map(star => (
                                            <button key={star} onClick={() => handleRating(star)} disabled={!!hasRated || isRating}>
                                                <Star className={cn("h-6 w-6 transition-colors", star <= (userRating || product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                            </button>
                                        ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                            <div className="p-4 sm:p-5 border-t bg-background flex-shrink-0">
                                <Button size="lg" className="w-full h-12 text-base font-semibold" onClick={handlePurchaseClick} disabled={isLoadingSuggestion}>
                                    {isLoadingSuggestion ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <WhatsAppIcon className="mr-2 h-5 w-5" />}
                                    Comprar
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {suggestion?.suggestedProduct && (
                 <SuggestionModal isOpen={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen} originalProduct={product} suggestion={suggestion} onAccept={() => { onAddToCart([{ ...product, quantity: 1 }, { ...suggestion.suggestedProduct!, quantity: 1 }]); setIsSuggestionModalOpen(false); onOpenChange(false); }} onDecline={() => { onAddToCart([{ ...product, quantity: 1 }]); setIsSuggestionModalOpen(false); onOpenChange(false); }} />
            )}
        </>
    )
}

export default function CatalogPage() {
    const { firestore, isNetworkEnabled } = useFirebase();
    const params = useParams();
    const slug = params.businessId as string;
    
    const [pageData, setPageData] = useState<{
        resolvedBusinessId: string | null;
        publicData: { products: Product[], headerConfig: LandingHeaderConfigData } | null;
        paymentSettings: PaymentSettings | null;
        landingPageData: LandingPageData | null;
    }>({
        resolvedBusinessId: null,
        publicData: null,
        paymentSettings: null,
        landingPageData: null,
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
                let businessId = slug;
                
                console.log("🔍 Iniciando resolución de alias para:", slug);

                // 1. Resolución de Alias (Prioridad Alta)
                try {
                    const cleanSlug = slug.trim().toLowerCase();
                    
                    const shareConfigQuery = query(
                        collectionGroup(firestore, 'shareConfig'), 
                        where('slug', '==', cleanSlug), 
                        limit(1)
                    );
                    
                    const querySnapshot = await getDocs(shareConfigQuery);
                    
                    // Buscamos el documento que explícitamente tenga el slug y sea el del negocio
                    if (!querySnapshot.empty) {
                        const customSlugDoc = querySnapshot.docs[0];
                        // Navegamos hacia arriba: shareConfig (doc) -> shareConfig (coll) -> businesses (doc)
                        const businessDoc = customSlugDoc.ref.parent.parent;
                        if (businessDoc) {
                            businessId = businessDoc.id;
                            console.log("✅ Alias resuelto con éxito:", cleanSlug, "->", businessId);
                        }
                    } else {
                        console.log("ℹ️ Alias no encontrado en shareConfig, probando como ID directo.");
                    }
                } catch (e: any) {
                    console.warn("⚠️ Error en resolución de alias (posible falta de índice o red):", e.message);
                }

                // 2. Carga de datos esenciales (Paralela y resiliente)
                const results = await Promise.allSettled([
                    getDoc(doc(firestore, `businesses/${businessId}/publicData`, 'catalog')),
                    getDoc(doc(firestore, `businesses/${businessId}/landingPages`, 'main')),
                    getDoc(doc(firestore, 'paymentSettings', businessId))
                ]);

                const publicDataSnap = results[0].status === 'fulfilled' ? results[0].value : null;
                const landingPageSnap = results[1].status === 'fulfilled' ? results[1].value : null;
                const paymentSettingsSnap = results[2].status === 'fulfilled' ? results[2].value : null;

                // Si no existe el catálogo con el ID resuelto, damos un error claro
                if (!publicDataSnap?.exists()) {
                    console.error("❌ Catálogo no encontrado para ID:", businessId);
                    // Si el slug tiene guiones y falló, puede que el negocio no tenga configurado el alias
                    throw new Error("El catálogo solicitado no existe o no tiene permisos de lectura pública.");
                }

                setPageData({
                    resolvedBusinessId: businessId,
                    publicData: publicDataSnap.data() as any,
                    landingPageData: landingPageSnap?.exists() ? landingPageSnap.data() as any : null,
                    paymentSettings: paymentSettingsSnap?.exists() ? paymentSettingsSnap.data() as any : null,
                });

                // 3. Carga de promociones (Opcional)
                promotionService.getActivePromotions(businessId)
                    .then(setActivePromotions)
                    .catch(err => console.warn("No se cargaron promociones:", err.message));

            } catch (e: any) { 
                console.error("🔥 Error crítico de carga:", e);
                setError(e.message); 
            }
            finally { setIsLoading(false); }
        };

        initializePage();
    }, [firestore, slug, isNetworkEnabled]);

    const handleAddToCart = (itemsToAdd: CartItem[]) => {
        setCart(prev => {
            const newCart = [...prev];
            itemsToAdd.forEach(newItem => {
                const idx = newCart.findIndex(item => item.id === newItem.id);
                if (idx > -1) newCart[idx].quantity += newItem.quantity;
                else newCart.push(newItem);
            });
            return newCart;
        });
        setIsPurchaseModalOpen(true);
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <PublicNav navigation={pageData.landingPageData?.navigation} businessId={pageData.resolvedBusinessId ?? undefined} />
            <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold">Catálogo no disponible</h1>
            <p className="text-muted-foreground mt-2 max-w-md">{error}</p>
            <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
    );

    const products = pageData.publicData?.products || [];
    const headerConfig = pageData.publicData?.headerConfig || null;

    return (
        <div className="bg-muted/40 min-h-screen">
            <PublicNav navigation={pageData.landingPageData?.navigation} businessId={pageData.resolvedBusinessId ?? undefined} />
            <CatalogHeader config={headerConfig} cartItemCount={cart.reduce((acc, item) => acc + item.quantity, 0)} onCartClick={() => setIsPurchaseModalOpen(true)} />
            <main className="container mx-auto py-8 px-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {products.map(p => <PublicProductCard key={p.id} product={p} onOpenModal={setSelectedProduct} activePromotions={activePromotions} />)}
                </div>
            </main>
            <ProductViewModal product={selectedProduct} isOpen={!!selectedProduct} onOpenChange={(o) => !o && setSelectedProduct(null)} businessId={pageData.resolvedBusinessId} onAddToCart={handleAddToCart} />
            {pageData.resolvedBusinessId && (
                <PurchaseModal 
                    isOpen={isPurchaseModalOpen} 
                    onOpenChange={setIsPurchaseModalOpen} 
                    cartItems={cart} 
                    onRemoveItem={(id) => setCart(c => c.filter(i => i.id !== id))} 
                    onUpdateQuantity={(id, q) => setCart(c => c.map(i => i.id === id ? {...i, quantity: q} : i))}
                    onClearCart={() => setCart([])}
                    businessId={pageData.resolvedBusinessId} 
                    businessInfo={headerConfig?.businessInfo ?? null} 
                    paymentSettings={pageData.paymentSettings} 
                />
            )}
        </div>
    );
}

const CatalogHeader = ({ config, cartItemCount, onCartClick }: { config: any, cartItemCount: number, onCartClick: () => void }) => {
    if (!config) return null;
    const cleanPhone = String(config.businessInfo.phone || '').replace(/\D/g, '');
    return (
        <div className="w-full">
            {config.banner.mediaUrl && <div className="relative w-full h-[250px]"><Image src={config.banner.mediaUrl} alt="Banner" fill className="object-cover"/></div>}
            <div className="bg-card shadow-md p-4 sticky top-16 z-40 border-b">
                <div className="container mx-auto flex justify-between items-center">
                    <div><h1 className="text-xl font-bold">{config.businessInfo.name}</h1><p className="text-sm text-muted-foreground">{config.businessInfo.address}</p></div>
                    <div className="flex items-center gap-3">
                        <Button asChild size="sm" variant="outline" className="hidden sm:flex"><a href={`https://api.whatsapp.com/send?phone=${cleanPhone}`} target="_blank"><WhatsAppIcon className="mr-2" /> Contactar</a></Button>
                        <button onClick={onCartClick} className="relative p-2 hover:bg-muted rounded-full transition-colors"><ShoppingCart /><Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">{cartItemCount}</Badge></button>
                    </div>
                </div>
            </div>
        </div>
    );
}
