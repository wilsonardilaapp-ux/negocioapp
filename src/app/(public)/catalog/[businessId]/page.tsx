
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { 
    doc, 
    getDoc, 
    collectionGroup, 
    query, 
    where, 
    getDocs, 
    limit, 
    orderBy, 
    startAfter, 
    endBefore, 
    limitToLast, 
    DocumentData, 
    QueryDocumentSnapshot,
    collection,
    type OrderByDirection
} from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Star, Loader2, PackageSearch, Tag, ShoppingCart, Image as ImageIcon, ChevronLeft, ChevronRight, Search, SortDesc, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/models/product';
import type { LandingHeaderConfigData, LandingPageData } from '@/models/landing-page';
import { WhatsAppIcon, FacebookIcon, InstagramIcon, TikTokIcon, YoutubeIcon, XIcon } from '@/components/icons';
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
import type { CartItem } from '@/models/cart';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
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
        <div className="relative w-full h-full">
            <Image 
                src={item.url} 
                alt={alt} 
                fill 
                sizes="(max-width: 768px) 100vw, 700px"
                className={cn('rounded-md', objectFit === 'contain' ? 'object-contain' : 'object-cover')} 
                priority={priority}
            />
        </div>
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
                    {product.ratingCount > 0 ? (
                        <>
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
                            <span>({product.ratingCount})</span>
                        </>
                    ) : (
                        <span className="italic">Sin valoraciones</span>
                    )}
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
                toast({ title: '¡Gracias por tu opinión!' });
            } else throw new Error(result.message);
        } catch (error: any) {
            toast({ variant: "destructive", title: 'Error', description: error.message });
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
                await updateSuggestionMetrics({ businessId, ruleId: suggestionResult.ruleId, event: 'shown' }).catch(e => console.warn("Fallo al actualizar métricas:", e.message));
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
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        {product.ratingCount > 0 ? (
                                            <>
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400"/>
                                                <span className="font-bold text-foreground">{product.rating.toFixed(1)}</span>
                                                <span>({product.ratingCount})</span>
                                            </>
                                        ) : (
                                            <span className="italic">Sin valoraciones</span>
                                        )}
                                    </div>
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

const PAGE_SIZE = 12;

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'rating_desc';

export default function CatalogPage() {
    const { firestore, isNetworkEnabled } = useFirebase();
    const { toast } = useToast();
    const params = useParams();
    const slug = params.businessId as string;
    
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaginating, setIsPaginating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);

    const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [tempSearchQuery, setTempSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortOrder, setSortOrder] = useState<SortOption>('recent');
    const [categories, setCategories] = useState<string[]>([]);
    
    const [pageData, setPageData] = useState<{
        resolvedBusinessId: string | null;
        headerConfig: LandingHeaderConfigData | null;
        paymentSettings: PaymentSettings | null;
        landingPageData: LandingPageData | null;
    }>({
        resolvedBusinessId: null,
        headerConfig: null,
        paymentSettings: null,
        landingPageData: null,
    });

    const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);

    const getBaseQuery = useCallback((busId: string, category: string, sort: SortOption) => {
        if (!firestore) return null;
        const productsRef = collection(firestore, `businesses/${busId}/products`);
        
        let orderField = 'name';
        let orderDir: OrderByDirection = 'asc';

        if (sort === 'price_asc') { orderField = 'price'; orderDir = 'asc'; }
        else if (sort === 'price_desc') { orderField = 'price'; orderDir = 'desc'; }
        else if (sort === 'rating_desc') { orderField = 'rating'; orderDir = 'desc'; }
        
        let q = query(productsRef, orderBy(orderField, orderDir), orderBy('__name__', 'asc'));

        if (category !== 'all') {
            q = query(q, where('category', '==', category));
        }

        return q;
    }, [firestore]);

    const loadProducts = useCallback(async (
        direction: 'next' | 'prev' | 'initial',
        busId: string,
        category: string,
        search: string,
        sort: SortOption,
        fDoc: QueryDocumentSnapshot<DocumentData> | null,
        lDoc: QueryDocumentSnapshot<DocumentData> | null
    ) => {
        const qBase = getBaseQuery(busId, category, sort);
        if (!qBase) return;

        setIsPaginating(true);
        try {
            let q = qBase;

            if (direction === 'next' && lDoc) {
                q = query(q, startAfter(lDoc), limit(PAGE_SIZE));
            } else if (direction === 'prev' && fDoc) {
                q = query(q, endBefore(fDoc), limitToLast(PAGE_SIZE));
            } else {
                q = query(q, limit(PAGE_SIZE));
            }

            const snap = await getDocs(q);
            const docsSnap = snap.docs;
            let data = docsSnap.map(d => ({ ...d.data(), id: d.id } as Product));
            
            if (search.trim()) {
                const term = search.toLowerCase().trim();
                data = data.filter(p => 
                    p.name.toLowerCase().includes(term) || 
                    p.description.toLowerCase().includes(term) ||
                    p.category.toLowerCase().includes(term)
                );
            }

            setProducts(data);
            setFirstDoc(docsSnap[0] || null);
            setLastDoc(docsSnap[docsSnap.length - 1] || null);
            setHasNextPage(docsSnap.length === PAGE_SIZE);

            if (direction === 'next') setCurrentPage(prev => prev + 1);
            else if (direction === 'prev') setCurrentPage(prev => prev - 1);
            else setCurrentPage(1);

        } catch (e: any) {
            console.error("Error loading products:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los productos.' });
        } finally {
            setIsPaginating(false);
            setIsLoading(false);
        }
    }, [getBaseQuery, toast]);

    useEffect(() => {
        if (!firestore || !slug || !isNetworkEnabled) return;
        
        let isMounted = true;
        const initialize = async () => {
            setIsLoading(true);
            try {
                let busId = slug;
                const cleanSlug = slug.trim().toLowerCase();
                
                const directBusinessDoc = await getDoc(doc(firestore, 'businesses', busId));
                if (!directBusinessDoc.exists()) {
                    const shareConfigQuery = query(collectionGroup(firestore, 'shareConfig'), where('slug', '==', cleanSlug), limit(1));
                    const querySnapshot = await getDocs(shareConfigQuery);
                    if (!querySnapshot.empty) {
                        const businessDoc = querySnapshot.docs[0].ref.parent.parent;
                        if (businessDoc) busId = businessDoc.id;
                    }
                }

                if (!isMounted) return;

                const [publicDataSnap, landingPageSnap, paymentSettingsSnap, allProductsSnap] = await Promise.all([
                    getDoc(doc(firestore, `businesses/${busId}/publicData`, 'catalog')),
                    getDoc(doc(firestore, `businesses/${busId}/landingPages`, 'main')),
                    getDoc(doc(firestore, 'paymentSettings', busId)),
                    getDocs(collection(firestore, `businesses/${busId}/products`))
                ]);

                if (!publicDataSnap.exists()) throw new Error("El catálogo no existe.");

                const allItems = allProductsSnap.docs.map(d => d.data() as Product);
                const uniqueCats = Array.from(new Set(allItems.map(p => p.category).filter(Boolean)));
                setCategories(uniqueCats);

                const catalogData = publicDataSnap.data() as any;
                setPageData({
                    resolvedBusinessId: busId,
                    headerConfig: catalogData.headerConfig || null,
                    landingPageData: landingPageSnap?.exists() ? landingPageSnap.data() as any : null,
                    paymentSettings: paymentSettingsSnap?.exists() ? paymentSettingsSnap.data() as any : null,
                });

                promotionService.getActivePromotions(busId).then(setActivePromotions);

                await loadProducts('initial', busId, 'all', '', 'recent', null, null);

            } catch (e: any) { 
                if (isMounted) {
                    setError(e.message);
                    setIsLoading(false);
                }
            }
        };

        initialize();
        return () => { isMounted = false; };
    }, [firestore, slug, isNetworkEnabled, loadProducts]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSearchQuery(tempSearchQuery);
        if (pageData.resolvedBusinessId) {
            loadProducts('initial', pageData.resolvedBusinessId, selectedCategory, tempSearchQuery, sortOrder, null, null);
        }
    };

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

    return (
        <div className="bg-muted/40 min-h-screen pb-20">
            <PublicNav navigation={pageData.landingPageData?.navigation} businessId={pageData.resolvedBusinessId ?? undefined} />
            <CatalogHeader config={pageData.headerConfig} cartItemCount={cart.reduce((acc, item) => acc + item.quantity, 0)} onCartClick={() => setIsPurchaseModalOpen(true)} />
            
            <div className="bg-white border-b sticky top-16 z-30 py-4 shadow-sm">
                <div className="container mx-auto px-4">
                    <form onSubmit={handleSearch} className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-0 rounded-lg overflow-hidden border focus-within:ring-2 focus-within:ring-primary/50 transition-all bg-white">
                        <Select 
                            value={selectedCategory} 
                            onValueChange={(val) => {
                                setSelectedCategory(val);
                                if (pageData.resolvedBusinessId) loadProducts('initial', pageData.resolvedBusinessId, val, searchQuery, sortOrder, null, null);
                            }}
                        >
                            <SelectTrigger className="w-full lg:w-[180px] bg-muted/50 border-none rounded-none focus:ring-0 focus:ring-offset-0 h-12 font-medium text-foreground">
                                <SelectValue placeholder="Categorías" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las categorías</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative flex-1 border-y lg:border-y-0 lg:border-x border-gray-200">
                            <Input 
                                placeholder="Busca productos..."
                                className="w-full border-none rounded-none h-12 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
                                value={tempSearchQuery}
                                onChange={(e) => setTempSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row w-full lg:w-auto">
                            <Select 
                                value={sortOrder} 
                                onValueChange={(val: SortOption) => {
                                    setSortOrder(val);
                                    if (pageData.resolvedBusinessId) loadProducts('initial', pageData.resolvedBusinessId, selectedCategory, searchQuery, val, null, null);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[200px] border-none rounded-none focus:ring-0 focus:ring-offset-0 h-12 bg-white sm:border-r border-gray-200 text-foreground">
                                    <div className="flex items-center gap-2 font-medium">
                                        <SortDesc className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Ordenar por" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Más recientes</SelectItem>
                                    <SelectItem value="price_asc">Precio: Menor a Mayor</SelectItem>
                                    <SelectItem value="price_desc">Precio: Mayor a Menor</SelectItem>
                                    <SelectItem value="rating_desc">Mejor valorados</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button type="submit" className="h-12 px-8 rounded-none bg-primary hover:bg-primary/90 transition-colors w-full sm:w-auto">
                                <Search className="h-5 w-5" />
                                <span className="ml-2 font-bold">Buscar</span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <main className="container mx-auto py-8 px-4">
                {isPaginating ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-in fade-in duration-500">
                        {products.map(p => (
                            <PublicProductCard key={p.id} product={p} onOpenModal={setSelectedProduct} activePromotions={activePromotions} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <PackageSearch className="h-20 w-20 text-muted-foreground/30 mb-4" />
                        <h2 className="text-xl font-bold text-gray-700">No se encontraron productos</h2>
                        <p className="text-muted-foreground mt-2">Intenta ajustar los filtros de búsqueda.</p>
                    </div>
                )}

                {products.length > 0 && !isPaginating && (
                    <div className="mt-12 flex flex-col items-center gap-4">
                        <p className="text-sm text-muted-foreground font-medium">Página {currentPage}</p>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => loadProducts('prev', pageData.resolvedBusinessId!, selectedCategory, searchQuery, sortOrder, firstDoc, lastDoc)}
                                disabled={currentPage === 1 || isPaginating}
                                className="w-32 shadow-sm font-bold"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => loadProducts('next', pageData.resolvedBusinessId!, selectedCategory, searchQuery, sortOrder, firstDoc, lastDoc)}
                                disabled={!hasNextPage || isPaginating}
                                className="w-32 shadow-sm font-bold"
                            >
                                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            <ProductViewModal 
                product={selectedProduct} 
                isOpen={!!selectedProduct} 
                onOpenChange={(o) => !o && setSelectedProduct(null)} 
                businessId={pageData.resolvedBusinessId} 
                onAddToCart={handleAddToCart} 
            />

            {pageData.resolvedBusinessId && (
                <PurchaseModal 
                    isOpen={isPurchaseModalOpen} 
                    onOpenChange={setIsPurchaseModalOpen} 
                    cartItems={cart} 
                    onRemoveItem={(id) => setCart(c => c.filter(i => i.id !== id))} 
                    onUpdateQuantity={(id, q) => setCart(c => c.map(i => i.id === id ? {...i, quantity: q} : i))}
                    onClearCart={() => setCart([])}
                    businessId={pageData.resolvedBusinessId} 
                    businessInfo={pageData.headerConfig?.businessInfo ?? null} 
                    paymentSettings={pageData.paymentSettings} 
                />
            )}
        </div>
    );
}

const CatalogHeader = ({ config, cartItemCount, onCartClick }: { config: any, cartItemCount: number, onCartClick: () => void }) => {
    if (!config) return null;

    const socialLinks = config.socialLinks || {};
    
    const renderSocialIcons = () => {
        const networks = ['instagram', 'facebook', 'tiktok', 'twitter', 'youtube', 'whatsapp'];
        return (
            <div className="flex flex-wrap items-center gap-2">
                {networks.map(network => {
                    let url = (socialLinks[network] || '').trim();
                    // Fallback for whatsapp if not defined but phone is
                    if (network === 'whatsapp' && !url) {
                        url = (config.businessInfo?.phone || '').trim();
                    }
                    
                    if (!url) return null;

                    const iconClass = "h-8 w-8 rounded-full flex items-center justify-center text-white hover:scale-110 transition-all shadow-sm";

                    if (network === 'instagram') return (
                        <a key={network} href={url} target="_blank" rel="noopener noreferrer" className={cn(iconClass, "bg-gradient-to-br from-purple-500 to-pink-500")}>
                            <InstagramIcon className="h-4 w-4" />
                        </a>
                    );
                    if (network === 'facebook') return (
                        <a key={network} href={url} target="_blank" rel="noopener noreferrer" className={cn(iconClass, "bg-[#1877F2]")}>
                            <FacebookIcon className="h-4 w-4" />
                        </a>
                    );
                    if (network === 'tiktok') return (
                        <a key={network} href={url} target="_blank" rel="noopener noreferrer" className={cn(iconClass, "bg-black")}>
                            <TikTokIcon className="h-4 w-4" />
                        </a>
                    );
                    if (network === 'whatsapp') return (
                        <a key={network} href={`https://wa.me/${url.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={cn(iconClass, "bg-[#25D366]")}>
                            <WhatsAppIcon className="h-4 w-4" />
                        </a>
                    );
                    if (network === 'twitter') return (
                        <a key={network} href={url} target="_blank" rel="noopener noreferrer" className={cn(iconClass, "bg-black")}>
                            <XIcon className="h-4 w-4" />
                        </a>
                    );
                    if (network === 'youtube') return (
                        <a key={network} href={url} target="_blank" rel="noopener noreferrer" className={cn(iconClass, "bg-[#FF0000]")}>
                            <YoutubeIcon className="h-4 w-4" />
                        </a>
                    );
                    return null;
                })}
            </div>
        );
    };

    const cleanPhone = String(config.businessInfo.phone || '').replace(/\D/g, '');
    
    // Extraer teléfonos adicionales
    const additionalPhones = [
        config.businessInfo.phone2,
        config.businessInfo.phone3,
        config.businessInfo.phone4,
        config.businessInfo.phone5
    ].filter(Boolean);

    return (
        <div className="w-full">
            {config.banner.mediaUrl && (
                <div className="relative w-full h-[250px]">
                    <Image src={config.banner.mediaUrl} alt="Banner" fill className="object-cover" priority />
                </div>
            )}
            <div className="bg-card shadow-md p-4 sticky top-16 z-40 border-b">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="text-center md:text-left">
                            <h1 className="text-xl font-bold text-foreground">{config.businessInfo.name}</h1>
                            {config.businessInfo.category && (
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                                        {config.businessInfo.category}
                                    </Badge>
                                    {config.businessInfo.subcategory && (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                            {config.businessInfo.subcategory}
                                        </Badge>
                                    )}
                                </div>
                            )}
                            {config.businessInfo.shortDescription && (
                                <p className="text-xs text-muted-foreground font-medium mb-1 line-clamp-1">
                                    {config.businessInfo.shortDescription}
                                </p>
                            )}
                            <div className="flex flex-col gap-1 mt-2">
                                <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>{config.businessInfo.address}</span>
                                </div>
                                {additionalPhones.map((phone, idx) => (
                                    <div key={idx} className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-muted-foreground">
                                        <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                                        <span>{phone}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {renderSocialIcons()}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button asChild size="sm" variant="outline" className="hidden sm:flex">
                            <a href={`https://api.whatsapp.com/send?phone=${cleanPhone}`} target="_blank">
                                <WhatsAppIcon className="mr-2" /> Contactar
                            </a>
                        </Button>
                        <button onClick={onCartClick} className="relative p-2 hover:bg-muted rounded-full transition-colors text-foreground">
                            <ShoppingCart />
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">{cartItemCount}</Badge>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
