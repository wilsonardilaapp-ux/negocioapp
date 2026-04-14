'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlusCircle, ShoppingBag, Edit, Trash2, Printer, FileDown, Info, Frown, Loader2 } from 'lucide-react';
import type { Product } from '@/models/product';
import ProductForm from '@/components/catalogo/product-form';
import CatalogHeaderForm from '@/components/catalogo/catalog-header-form';
import CatalogQRGenerator from '@/components/catalogo/catalog-qr-generator';
import ShareCatalog from '@/components/catalogo/share-catalog';
import ProductCard from '@/components/catalogo/product-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LandingHeaderConfigData } from '@/models/landing-page';
import { v4 as uuidv4 } from 'uuid';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, getDoc } from 'firebase/firestore';
import type { Module } from '@/models/module';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

const initialHeaderConfig: LandingHeaderConfigData = {
    banner: {
      mediaUrl: null,
      mediaType: null,
    },
    businessInfo: {
      name: 'Mi Negocio',
      address: 'Dirección de ejemplo',
      phone: '3001234567',
      email: 'info@tunegocio.com',
      deliveryFee: 0,
      vatRate: 19,
    },
    socialLinks: {
      tiktok: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      twitter: '',
    },
    carouselItems: [
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
    ],
};

export default function CatalogoPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    
    // Simplified state
    const [headerConfig, setHeaderConfig] = useState<LandingHeaderConfigData>(initialHeaderConfig);
    const [moduleInactive, setModuleInactive] = useState(false);
    const [isInitialLoading, setInitialLoading] = useState(true);

    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // --- NEW: Use subscription hook for limits and plan info ---
    const { 
        canAddProducts, 
        limits, 
        isLoading: isSubscriptionLoading 
    } = useSubscription();

    // --- Hooks for fetching data ---
    const productsQuery = useMemoFirebase(() => 
        user ? collection(firestore, 'businesses', user.uid, 'products') : null, 
    [firestore, user]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
    
    const catalogModuleRef = useMemoFirebase(() => 
        user ? doc(firestore, 'businesses', user.uid, 'modules', 'catalogo') : null,
    [firestore, user]);
    
    // --- Effect for module status and header config ---
    useEffect(() => {
        if (isUserLoading || !user || !firestore) return;

        let isMounted = true;
        const fetchConfig = async () => {
            if (!isMounted) return;
            setInitialLoading(true);
            try {
                // Check module status
                const moduleSnap = await getDoc(catalogModuleRef!);
                if (!moduleSnap.exists() || moduleSnap.data().status === 'inactive') {
                    if (isMounted) setModuleInactive(true);
                    return;
                }
                if (isMounted) setModuleInactive(false);
                
                // Fetch header config
                const headerConfigRef = doc(firestore, 'businesses', user.uid, 'landingConfig', 'header');
                const headerConfigSnap = await getDoc(headerConfigRef);
                
                if (isMounted && headerConfigSnap.exists()) {
                    const savedConf = headerConfigSnap.data() as LandingHeaderConfigData;
                    const carouselItems = (savedConf?.carouselItems && Array.isArray(savedConf.carouselItems) && savedConf.carouselItems.length > 0)
                        ? savedConf.carouselItems.map(item => item?.id ? item : { ...item, id: uuidv4() })
                        : initialHeaderConfig.carouselItems;

                    setHeaderConfig({
                        ...initialHeaderConfig,
                        ...savedConf,
                        banner: { ...initialHeaderConfig.banner, ...savedConf.banner },
                        businessInfo: { ...initialHeaderConfig.businessInfo, ...savedConf.businessInfo },
                        socialLinks: { ...initialHeaderConfig.socialLinks, ...savedConf.socialLinks },
                        carouselItems,
                    });
                }
            } catch (e) {
                console.error("Error fetching page config", e);
                if (isMounted) toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de configuración." });
            } finally {
                if (isMounted) setInitialLoading(false);
            }
        };

        fetchConfig();
        return () => { isMounted = false; };
    }, [user, firestore, isUserLoading, toast, catalogModuleRef]);
    
    // --- Combined loading state ---
    const isLoading = isUserLoading || isSubscriptionLoading || areProductsLoading || isInitialLoading;
    const productCount = products?.length ?? 0;
    const canCreate = canAddProducts(productCount);

    const canCreateProduct = useMemo(() => {
        return {
            allowed: canCreate,
            reason: `Has alcanzado el límite de ${limits.products} productos para tu plan.`
        }
    }, [canCreate, limits.products]);
    
    const updatePublicCatalog = useCallback((productsToSave: Product[], configToSave: LandingHeaderConfigData) => {
        if (!firestore || !user) return;
        const publicCatalogRef = doc(firestore, 'businesses', user.uid, 'publicData', 'catalog');
        setDocumentNonBlocking(publicCatalogRef, { products: productsToSave, headerConfig: configToSave }, { merge: true });
    }, [firestore, user]);
    
    
    const handleSaveProduct = async (productData: Omit<Product, 'id' | 'businessId'>) => {
        if (!firestore || !user) return;
        
        if (!editingProduct && !canCreateProduct.allowed) {
            alert(canCreateProduct.reason);
            return;
        }
        
        const dataToSave = { ...productData, businessId: user.uid };

        if (editingProduct) {
            const productDocRef = doc(firestore, 'businesses', user.uid, 'products', editingProduct.id);
            await setDocumentNonBlocking(productDocRef, dataToSave, { merge: true });
        } else {
            const newProductRef = doc(collection(firestore, 'businesses', user.uid, 'products'));
            await setDocumentNonBlocking(newProductRef, dataToSave);
        }
        
        toast({ title: `Producto ${editingProduct ? 'actualizado' : 'creado'}`, description: `Se guardó "${dataToSave.name}"` });

        // Let useCollection handle the product list update, but trigger public data sync
        const currentProducts = products || [];
        const newProductsList = editingProduct
            ? currentProducts.map(p => p.id === editingProduct!.id ? { ...dataToSave, id: editingProduct!.id } : p)
            : [...currentProducts, { ...dataToSave, id: 'temp-id' }]; 
        
        updatePublicCatalog(newProductsList as Product[], headerConfig);

        setIsFormOpen(false);
        setEditingProduct(null);
    };
    
    const handleSaveHeader = (config: LandingHeaderConfigData) => {
        if (!firestore || !user) return;
        const headerConfigDocRef = doc(firestore, 'businesses', user.uid, 'landingConfig', 'header');
        setDocumentNonBlocking(headerConfigDocRef, config, { merge: true });
        setHeaderConfig(config);
        updatePublicCatalog(products || [], config);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !user || !productToDelete) return;
        const productDocRef = doc(firestore, 'businesses', user.uid, 'products', productToDelete.id);
        await deleteDocumentNonBlocking(productDocRef);

        const updatedProductList = (products || []).filter(p => p.id !== productToDelete.id);
        updatePublicCatalog(updatedProductList, headerConfig);
        
        setProductToDelete(null);
    };
    
    const openNewProductForm = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
    }

    const handleOpenActionWindow = (action: 'print' | 'download') => {
        const url = `/catalog/${user?.uid}?${action}=true`;
        window.open(url, '_blank');
    };
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> Cargando tu catálogo...</div>
    }

    if (moduleInactive) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Módulo de Catálogo Desactivado</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                    <Frown className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">Funcionalidad en Mantenimiento</h3>
                    <p className="text-muted-foreground max-w-sm">
                        El módulo de "Catálogo de Productos" no está activo. Por favor, contacta al administrador de la plataforma para más información.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    const addProductButton = (
        <Button onClick={canCreateProduct.allowed ? openNewProductForm : undefined} disabled={!canCreateProduct.allowed} aria-disabled={!canCreateProduct.allowed}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Producto
        </Button>
    );

    return (
        <div className="flex flex-col gap-6">
            <CatalogHeaderForm data={headerConfig} setData={handleSaveHeader} />
            
            <CatalogQRGenerator />

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Tus Productos</CardTitle>
                        <CardDescription>
                            Añade, edita y gestiona los productos de tu negocio.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleOpenActionWindow('print')}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir
                        </Button>
                        <Button variant="outline" onClick={() => handleOpenActionWindow('download')}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar PDF
                        </Button>
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                {canCreateProduct.allowed ? (
                                    addProductButton
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div>{addProductButton}</div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{canCreateProduct.reason}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] w-full">
                                <DialogHeader>
                                    <DialogTitle>{editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
                                    <DialogDescription>
                                        Completa los detalles de tu producto. La información se mostrará públicamente.
                                    </DialogDescription>
                                </DialogHeader>
                                <ProductForm 
                                    product={editingProduct} 
                                    onSave={handleSaveProduct} 
                                    onCancel={() => setIsFormOpen(false)}
                                    imageLimit={limits.products === -1 ? 50 : 18}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 p-3 text-sm">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            Límite de productos: <span className="font-bold">{productCount} / {limits.products === -1 ? '∞' : limits.products}</span>.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products && products.length > 0 ? (
                    products.map(product => (
                        <ProductCard key={product.id} product={product}>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(product)}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                </Button>
                                <Button variant="destructive" size="sm" className="w-full" onClick={() => setProductToDelete(product)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </Button>
                            </div>
                        </ProductCard>
                    ))
                ) : (
                    <Card className="sm:col-span-2 md:col-span-3 lg:grid-cols-4">
                        <CardContent className="h-[400px] flex flex-col items-center justify-center text-center gap-4">
                            <div className="p-4 bg-secondary rounded-full">
                                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold">Tu catálogo está vacío</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Haz clic en "Añadir Producto" para empezar a vender.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
            
            <ShareCatalog />

            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el producto "{productToDelete?.name}" de tu catálogo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}