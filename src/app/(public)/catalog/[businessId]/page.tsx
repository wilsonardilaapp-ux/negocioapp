
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Star, Loader2, PackageSearch, Mail, Printer, FileDown, Settings, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/models/product';
import type { Module } from '@/models/module';
import type { LandingHeaderConfigData, LandingPageData } from '@/models/landing-page';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons';
import { useParams, useSearchParams } from 'next/navigation';
import { rateProduct } from '@/ai/flows/rate-product-flow';
import { useToast } from '@/hooks/use-toast';
import { PurchaseModal } from '@/components/catalogo/purchase-modal';
import type { PaymentSettings } from '@/models/payment-settings';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getSuggestion } from '@/ai/flows/suggestion-flow';
import type { SuggestionOutput } from '@/models/suggestion-io';
import { SuggestionModal } from '@/components/suggestions/suggestion-modal';
import { updateSuggestionMetrics } from '@/ai/flows/update-suggestion-metrics-flow';
import PublicNav from '@/components/layout/public-nav';


export type CartItem = Product & { quantity: number };

const CatalogHeader = ({ config }: { config: LandingHeaderConfigData | null }) => {
    if (!config) {
        return (
            <div className="h-96 flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const socialIcons: { [key: string]: React.ReactNode } = {
        tiktok: <TikTokIcon className="h-5 w-5" />,
        instagram: <InstagramIcon className="h-5 w-5" />,
        facebook: <FacebookIcon className="h-5 w-5" />,
        whatsapp: <WhatsAppIcon className="h-5 w-5" />,
        twitter: <XIcon className="h-5 w-5" />,
    };

    return (
        <div className="w-full">
            {config.banner.mediaUrl && (
                <div className="relative aspect-[1920/500] w-full">
                    {config.banner.mediaType === 'image' ? (
                        <Image src={config.banner.mediaUrl} alt="Banner" fill sizes="100vw" className="object-cover"/>
                    ) : (
                        <video src={config.banner.mediaUrl} autoPlay loop muted controls className="w-full h-full object-cover" />
                    )}
                </div>
            )}
            <div className="bg-card shadow-md p-4">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-bold font-headline">{config.businessInfo.name}</h1>
                        <p className="text-sm text-muted-foreground">{config.businessInfo.address}</p>
                        {config.businessInfo.email && (
                            <a href={`mailto:${config.businessInfo.email}`} className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center md:justify-start gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                {config.businessInfo.email}
                            </a>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {Object.entries(config.socialLinks).map(([key, value]) => value && (
                            <a key={key} href={value} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                {socialIcons[key]}
                            </a>
                        ))}
                         <Button asChild size="sm">
                            <a href={`https://wa.me/${config.businessInfo.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                <WhatsAppIcon className="mr-2 h-4 w-4" /> Contactar
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
            {config.carouselItems && config.carouselItems.some(item => item.mediaUrl) && (
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
                        {config.carouselItems.map(item => item.mediaUrl && (
                            <CarouselItem key={item.id}>
                                 <div className="relative aspect-[1920/600] w-full">
                                    {item.mediaType === 'image' ? (
                                        <Image src={item.mediaUrl} alt={item.slogan || 'Carousel image'} fill sizes="100vw" className="object-cover" />
                                    ) : (
                                        <video src={item.mediaUrl} autoPlay loop muted controls className="w-full h-full object-cover"/>
                                    )}
                                    {item.slogan && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <p className="text-white text-2xl font-bold text-center drop-shadow-md p-4">{item.slogan}</p>
                                        </div>
                                    )}
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white text-foreground" />
                    <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white text-foreground" />
                </Carousel>
            )}
        </div>
    );
};

// Helper to check if a URL is for a video file
const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const PublicProductCard = ({ product, onOpenModal }: { product: Product, onOpenModal: (product: Product) => void }) => {
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const mediaUrl = product.images[0] || 'https://picsum.photos/seed/placeholder/600/400';
    const isMediaVideo = isVideo(mediaUrl);

    return (
        <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg h-full">
            <CardHeader className="p-0">
                <div className="relative aspect-video w-full">
                    {isMediaVideo ? (
                        <video 
                            src={mediaUrl} 
                            autoPlay 
                            loop 
                            muted 
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <Image
                            src={mediaUrl}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                        />
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <CardTitle className="h-[2.8rem] text-base font-semibold leading-snug overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] mb-1">{product.name}</CardTitle>
                 <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{product.rating.toFixed(1)}</span>
                    <span className="text-xs">({product.ratingCount} valoraciones)</span>
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <Button className="w-full" onClick={() => onOpenModal(product)}>
                    Ver Producto
                </Button>
            </CardFooter>
        </Card>
    );
}

const ProductViewModal = ({ product, isOpen, onOpenChange, businessPhone, businessId, paymentSettings, onAddToCart }: { product: Product | null, isOpen: boolean, onOpenChange: (open: boolean) => void, businessPhone: string, businessId: string | null, paymentSettings: PaymentSettings | null, onAddToCart: (items: CartItem[]) => void }) => {
    const [mainImage, setMainImage] = useState(product?.images[0] || '');
    const [isRating, setIsRating] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [suggestion, setSuggestion] = useState<SuggestionOutput | null>(null);
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (product) {
            setMainImage(product.images[0] || '');
        }
    }, [product]);

    if (!product) return null;
    
    const hasRated = typeof window !== 'undefined' && localStorage.getItem(`rated_${product?.id}`);

    const handleRating = async (rating: number) => {
        if (!product || !businessId || hasRated) return;

        setIsRating(true);
        setUserRating(rating);

        try {
            const result = await rateProduct({
                businessId: businessId,
                productId: product.id,
                rating: rating,
            });

            if (result.success) {
                localStorage.setItem(`rated_${product.id}`, 'true');
                toast({
                    title: '¡Gracias por tu opinión!',
                    description: 'Tu calificación ha sido registrada.',
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Error updating rating:", error);
            toast({
                variant: "destructive",
                title: 'Error al calificar',
                description: error.message || 'No se pudo registrar tu calificación.',
            });
            setUserRating(0); // Reset visual state on failure
        } finally {
            setIsRating(false);
        }
    };
    
    const handlePurchaseClick = async () => {
        if (!businessId || !product) {
            onAddToCart([{ ...product, quantity: 1 }]);
            onOpenChange(false);
            return;
        }

        setIsLoadingSuggestion(true);
        
        try {
            const suggestionResult = await getSuggestion({ 
                businessId, 
                productId: product.id 
            });
            
            if (suggestionResult.suggestedProduct && suggestionResult.ruleId) {
                // Notificar que se mostró la sugerencia (AWAIT AÑADIDO PARA ASEGURAR REGISTRO)
                try {
                    await updateSuggestionMetrics({ 
                        businessId, 
                        ruleId: suggestionResult.ruleId, 
                        event: 'shown' 
                    });
                } catch (e) {
                    console.error("Error logging impression:", e);
                }

                setSuggestion(suggestionResult);
                setIsSuggestionModalOpen(true);
                
            } else {
                onAddToCart([{ ...product, quantity: 1 }]);
                onOpenChange(false);
            }
            
        } catch (error) {
            console.error("Error getting suggestion:", error);
            onAddToCart([{ ...product, quantity: 1 }]);
            onOpenChange(false);
            
        } finally {
            setIsLoadingSuggestion(false);
        }
    };

    const handleSuggestionAccepted = async () => {
        // Validación estricta antes de proceder
        if (!businessId || !product || !suggestion?.suggestedProduct || !suggestion.ruleId) {
            console.error("❌ Faltan datos para aceptar la sugerencia");
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo procesar la sugerencia (Faltan datos)."
            });
            setIsSuggestionModalOpen(false);
            return;
        }

        // 1. Intentar guardar la métrica (Sin bloquear la UI excesivamente)
        try {
            console.log("⏳ Guardando métrica de aceptación...");
            const result = await updateSuggestionMetrics({ 
                businessId, 
                ruleId: suggestion.ruleId, 
                event: 'accepted',
                revenue: suggestion.suggestedProduct.price 
            });

            if (!result.success) {
                console.warn("⚠️ La métrica no se guardó, pero continuamos con la venta.");
            } else {
                console.log("✅ Métrica registrada correctamente.");
            }
        } catch (error) {
            console.error("❌ Error de conexión al guardar métrica:", error);
        }

        // 2. Agregar productos al carrito
        onAddToCart([
            { ...product, quantity: 1 },
            { ...suggestion.suggestedProduct, quantity: 1 }
        ]);

        // 3. Notificar al usuario (Opcional, da buena sensación de que algo pasó)
        toast({
            title: "¡Oferta Aceptada!",
            description: `Se añadió ${suggestion.suggestedProduct.name} a tu pedido.`,
        });

        // 4. Cerrar modales
        setIsSuggestionModalOpen(false);
        onOpenChange(false);
    };

    const handleSuggestionDeclined = () => {
        if (product) {
            onAddToCart([{ ...product, quantity: 1 }]);
        }
        setIsSuggestionModalOpen(false);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl p-0 flex flex-col max-h-[90vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto">
                        {/* Galería de Imágenes (columna izquierda) */}
                         <div className="p-4 md:p-6 flex flex-row gap-4">
                            {/* Miniaturas */}
                            <div className="flex flex-col gap-2 overflow-y-auto pr-2 -mr-2">
                                {product.images.map((img, index) => {
                                    const isThumbVideo = isVideo(img);
                                    return (
                                        <button 
                                            key={index} 
                                            onClick={() => setMainImage(img)} 
                                            className={cn(
                                                "relative aspect-square w-16 sm:w-20 shrink-0 rounded-md overflow-hidden ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                                                mainImage === img ? "ring-2 ring-primary opacity-100" : "opacity-70 hover:opacity-100"
                                            )}
                                        >
                                            {isThumbVideo ? (
                                                <video src={img} muted className="object-cover w-full h-full"/>
                                            ) : (
                                                <Image src={img} alt={`${product.name} thumbnail ${index + 1}`} fill sizes="6rem" className="object-cover"/>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Imagen Principal */}
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden flex-1">
                                 {isVideo(mainImage) ? (
                                    <video src={mainImage} autoPlay loop muted controls className="object-cover w-full h-full" />
                                 ) : (
                                    <Image src={mainImage} alt={product.name} fill sizes="(max-width: 768px) 90vw, 40vw" className="object-cover"/>
                                 )}
                            </div>
                        </div>
                        {/* Detalles del Producto (columna derecha) */}
                        <div className="p-6 flex flex-col">
                            <DialogHeader className="mb-4">
                                <Badge className="w-fit mb-2">{product.category}</Badge>
                                <DialogTitle className="text-3xl font-bold">{product.name}</DialogTitle>
                            </DialogHeader>
                            <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
                                <p><span className="font-semibold">Disponibles:</span> {product.stock} unidades</p>
                                <div className="flex flex-col gap-2">
                                    <span className="font-semibold">Califica este producto:</span>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} onClick={() => handleRating(star)} disabled={!!hasRated || isRating}>
                                                <Star className={cn("h-6 w-6 transition-colors", star <= (userRating || product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300")} />
                                            </button>
                                        ))}
                                        {isRating && <Loader2 className="h-5 w-5 animate-spin ml-2" />}
                                    </div>
                                    {hasRated && <p className="text-xs text-muted-foreground">Ya has calificado este producto.</p>}
                                </div>
                            </div>
                            <div className="mt-6">
                                <Button size="lg" className="w-full" onClick={handlePurchaseClick} disabled={isLoadingSuggestion}>
                                    {isLoadingSuggestion ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <WhatsAppIcon className="mr-2 h-5 w-5" />}
                                    {isLoadingSuggestion ? 'Buscando sugerencias...' : 'Comprar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Suggestion Modal */}
            {suggestion?.suggestedProduct && (
                 <SuggestionModal
                    isOpen={isSuggestionModalOpen}
                    onOpenChange={setIsSuggestionModalOpen}
                    originalProduct={product}
                    suggestion={suggestion}
                    onAccept={handleSuggestionAccepted}
                    onDecline={handleSuggestionDeclined}
                />
            )}
        </>
    )
}

const ActionButtons = ({ pageRef }: { pageRef: React.RefObject<HTMLDivElement> }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        if (!pageRef.current) return;
        setIsLoading(true);
        try {
            const canvas = await html2canvas(pageRef.current, {
                useCORS: true,
                scale: 2,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('catalogo.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({
                variant: "destructive",
                title: "Error al generar PDF",
                description: "No se pudo crear el archivo PDF.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            <Button onClick={handlePrint} size="lg">
                <Printer className="mr-2 h-5 w-5" /> Imprimir
            </Button>
            <Button onClick={handleDownload} size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileDown className="mr-2 h-5 w-5" />}
                {isLoading ? 'Generando...' : 'Descargar PDF'}
            </Button>
        </div>
    );
};

export default function CatalogPage() {
    const firestore = useFirestore();
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.businessId as string;
    const pageRef = useRef<HTMLDivElement>(null);
    
    const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(null);
    const [isLoadingBusinessId, setIsLoadingBusinessId] = useState(true);
    const [resolutionError, setResolutionError] = useState<string | null>(null);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [catalogModule, setCatalogModule] = useState<Module | null>(null);
    const [isModuleLoading, setIsModuleLoading] = useState(true);

    const showPrintButton = searchParams.get('print') === 'true';
    const showDownloadButton = searchParams.get('download') === 'true';
    
    // Effect to resolve slug to businessId
    useEffect(() => {
        if (!firestore || !slug) {
            setIsLoadingBusinessId(false);
            return;
        };

        const resolveSlug = async () => {
            setIsLoadingBusinessId(true);
            setResolutionError(null);
            try {
                // This is a collection group query. It needs a corresponding rule.
                const shareConfigQuery = query(
                    collectionGroup(firestore, 'shareConfig'), 
                    where('slug', '==', slug),
                    where('useCustomSlug', '==', true),
                    limit(1)
                );

                const querySnapshot = await getDocs(shareConfigQuery);

                if (!querySnapshot.empty) {
                    const docSnap = querySnapshot.docs[0];
                    const businessId = docSnap.ref.parent.parent?.id;
                    if (businessId) {
                        setResolvedBusinessId(businessId);
                    } else {
                         throw new Error("ID de negocio no encontrado en la ruta del slug.");
                    }
                } else {
                    // If no custom slug is found, assume the slug IS the businessId
                    setResolvedBusinessId(slug);
                }
            } catch (e: any) {
                console.error("Error resolviendo el slug del catálogo:", e);
                setResolutionError("No se pudo encontrar el negocio para este catálogo.");
            } finally {
                setIsLoadingBusinessId(false);
            }
        };

        resolveSlug();
    }, [firestore, slug]);


    // Lógica para verificar el módulo de catálogo con retrocompatibilidad
    useEffect(() => {
        if (!firestore) return;
        
        const checkModule = async () => {
            setIsModuleLoading(true);
            try {
                const primaryDocRef = doc(firestore, 'modules', 'catalogo');
                const primarySnap = await getDoc(primaryDocRef);

                if (primarySnap.exists() && primarySnap.data().status === 'active') {
                    setCatalogModule({ ...primarySnap.data(), id: primarySnap.id } as Module);
                } else {
                    const fallbackDocRef = doc(firestore, 'modules', 'catalogo-de-productos');
                    const fallbackSnap = await getDoc(fallbackDocRef);
                    if (fallbackSnap.exists() && fallbackSnap.data().status === 'active') {
                        setCatalogModule({ ...fallbackSnap.data(), id: fallbackSnap.id } as Module);
                    } else {
                        setCatalogModule(null);
                    }
                }
            } catch (error) {
                console.error("Error fetching catalog module:", error);
                setCatalogModule(null);
            } finally {
                setIsModuleLoading(false);
            }
        };

        checkModule();
    }, [firestore]);


    const publicDataRef = useMemoFirebase(() => {
        if (!firestore || !resolvedBusinessId) return null;
        return doc(firestore, `businesses/${resolvedBusinessId}/publicData`, 'catalog');
    }, [firestore, resolvedBusinessId]);

    const paymentSettingsRef = useMemoFirebase(() => {
        if (!firestore || !resolvedBusinessId) return null;
        return doc(firestore, 'paymentSettings', resolvedBusinessId);
    }, [firestore, resolvedBusinessId]);

    const landingPageDocRef = useMemoFirebase(() => {
        if (!firestore || !resolvedBusinessId) return null;
        return doc(firestore, `businesses/${resolvedBusinessId}/landingPages`, 'main');
    }, [firestore, resolvedBusinessId]);

    const { data: publicData, isLoading: isPublicDataLoading } = useDoc<{ products: Product[], headerConfig: LandingHeaderConfigData }>(publicDataRef);
    const { data: paymentSettings, isLoading: isPaymentSettingsLoading } = useDoc<PaymentSettings>(paymentSettingsRef);
    const { data: landingPageData, isLoading: isLandingDataLoading } = useDoc<LandingPageData>(landingPageDocRef);
    
    const isLoading = isPublicDataLoading || isModuleLoading || isPaymentSettingsLoading || isLandingDataLoading || isLoadingBusinessId;

    useEffect(() => {
        if (showPrintButton) {
            setTimeout(() => window.print(), 1000); // Delay to ensure content is rendered
        }
    }, [showPrintButton, selectedProduct, cart]);

    const handleAddToCart = (itemsToAdd: CartItem[]) => {
        // A simple implementation: replace cart with new items.
        // A more complex one would check for existing items and update quantity.
        setCart(itemsToAdd);
        setIsPurchaseModalOpen(true);
    };

    const handleRemoveFromCart = (productId: string) => {
        const updatedCart = cart.filter(item => item.id !== productId);
        setCart(updatedCart);
        // If cart becomes empty, close the modal
        if (updatedCart.length === 0) {
            setIsPurchaseModalOpen(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (resolutionError) {
        return (
           <div className="flex flex-col h-screen w-full items-center justify-center bg-background text-center p-4">
               <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
               <h1 className="text-2xl font-bold">Catálogo no encontrado</h1>
               <p className="text-muted-foreground mt-2 max-w-md">{resolutionError}</p>
           </div>
       );
   }
    
    if (!catalogModule) {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center bg-background text-center p-4">
                <Settings className="h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold">Catálogo en Mantenimiento</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                    Esta sección no está disponible en este momento. Por favor, vuelve más tarde.
                </p>
            </div>
        );
    }
    
    const products = publicData?.products || [];
    const headerConfig = publicData?.headerConfig || null;
    const isCatalogEmpty = !products || products.length === 0;
    
    const handleOpenModal = (product: Product) => {
        setSelectedProduct(product);
    }
    
    const handleModalChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedProduct(null);
        }
    }
    
    return (
        <div id="catalog-page-root" ref={pageRef} className="bg-muted/40">
            <PublicNav navigation={landingPageData?.navigation} businessId={resolvedBusinessId ?? undefined} />
            {headerConfig ? (
                <CatalogHeader config={headerConfig} />
            ) : (
                <div className="bg-card shadow-md p-4 text-center">
                     <h1 className="text-2xl font-bold font-headline">Catálogo de Negocio V03</h1>
                </div>
            )}
            
            <main className="container mx-auto py-8 pb-10 md:pb-16 lg:pb-20">
                {isCatalogEmpty ? (
                    <Card className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                        <CardContent className="h-[400px] flex flex-col items-center justify-center text-center gap-4">
                            <div className="p-4 bg-secondary rounded-full">
                                <PackageSearch className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold">Este catálogo se está construyendo</h3>
                            <p className="text-muted-foreground max-w-sm">
                                El propietario está trabajando para añadir sus productos. ¡Vuelve pronto!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products?.map(product => (
                            <PublicProductCard key={product.id} product={product} onOpenModal={handleOpenModal} />
                        ))}
                    </div>
                )}
            </main>
            
             <ProductViewModal 
                product={selectedProduct} 
                isOpen={!!selectedProduct} 
                onOpenChange={handleModalChange} 
                businessPhone={headerConfig?.businessInfo.phone || ''}
                businessId={resolvedBusinessId}
                paymentSettings={paymentSettings ?? null}
                onAddToCart={handleAddToCart}
            />

            {(showPrintButton || showDownloadButton) && <ActionButtons pageRef={pageRef} />}
            
            {resolvedBusinessId && (
                 <PurchaseModal
                    isOpen={isPurchaseModalOpen}
                    onOpenChange={setIsPurchaseModalOpen}
                    cartItems={cart}
                    onRemoveItem={handleRemoveFromCart}
                    businessId={resolvedBusinessId}
                    businessPhone={headerConfig?.businessInfo.phone || ''}
                    paymentSettings={paymentSettings}
                />
            )}

            <footer className="w-full border-t bg-background">
              <div className="container flex items-center justify-center h-16 px-4 md:px-6">
                <p className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} {headerConfig?.businessInfo.name || 'Negocio V03'}. Todos los derechos reservados.
                </p>
              </div>
            </footer>
        </div>
    );
}
