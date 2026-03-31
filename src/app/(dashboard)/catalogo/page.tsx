'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDocs, getDoc } from 'firebase/firestore';
import type { SystemService } from '@/models/system-service';
import type { Module } from '@/models/module';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { Business } from '@/models/business';
import { useToast } from '@/hooks/use-toast';


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
    
    const [pageData, setPageData] = useState<{
        products: Product[];
        headerConfig: LandingHeaderConfigData;
        productLimit: number;
        imageLimit: number; // Added imageLimit
        catalogModule: Module | null;
    }>({
        products: [],
        headerConfig: initialHeaderConfig,
        productLimit: 10,
        imageLimit: 5, // Default image limit
        catalogModule: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [moduleInactive, setModuleInactive] = useState(false);

    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (isUserLoading || !user || !firestore) {
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Module status first
                const primaryModuleRef = doc(firestore, 'modules', 'catalogo');
                let fetchedCatalogModule: Module | null = null;
                const primaryModuleSnap = await getDoc(primaryModuleRef);
                 if (primaryModuleSnap.exists()) {
                    fetchedCatalogModule = { ...primaryModuleSnap.data(), id: primaryModuleSnap.id } as Module;
                } else {
                    const fallbackModuleRef = doc(firestore, 'modules', 'catalogo-de-productos');
                    const fallbackModuleSnap = await getDoc(fallbackModuleRef);
                    if (fallbackModuleSnap.exists()) {
                        fetchedCatalogModule = { ...fallbackModuleSnap.data(), id: fallbackModuleSnap.id } as Module;
                    }
                }

                if (!fetchedCatalogModule || fetchedCatalogModule.status === 'inactive') {
                    setModuleInactive(true);
                    setIsLoading(false);
                    return;
                }
                setModuleInactive(false);

                // 2. Fetch all other data concurrently after module check
                const productLimitServiceRef = doc(firestore, 'systemServices', 'product_limit');
                const imageLimitServiceRef = doc(firestore, 'systemServices', 'limite-de-imagenes-por-producto');
                const businessRef = doc(firestore, 'businesses', user.uid);
                const productsRef = collection(firestore, 'businesses', user.uid, 'products');
                const headerConfigRef = doc(firestore, 'businesses', user.uid, 'landingConfig', 'header');

                const [
                    productLimitSnap,
                    imageLimitSnap,
                    businessSnap,
                    productsSnap,
                    headerConfigSnap
                ] = await Promise.all([
                    getDoc(productLimitServiceRef),
                    getDoc(imageLimitServiceRef),
                    getDoc(businessRef),
                    getDocs(productsRef),
                    getDoc(headerConfigRef),
                ]);

                const fetchedBusiness = businessSnap.exists() ? businessSnap.data() as Business : null;
                const fetchedProducts = productsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Product[];
                
                const savedConf = headerConfigSnap.exists() ? headerConfigSnap.data() as LandingHeaderConfigData : null;
                const carouselItems = (savedConf?.carouselItems && Array.isArray(savedConf.carouselItems) && savedConf.carouselItems.length > 0)
                    ? savedConf.carouselItems
                    : initialHeaderConfig.carouselItems;
                const carouselWithIds = carouselItems.map(item => item && item.id ? item : { ...item, id: uuidv4() });
                
                const mergedConfigData = {
                    ...initialHeaderConfig,
                    ...(savedConf || {}),
                    banner: { ...initialHeaderConfig.banner, ...(savedConf?.banner || {}) },
                    businessInfo: { ...initialHeaderConfig.businessInfo, ...(savedConf?.businessInfo || {}) },
                    socialLinks: { ...initialHeaderConfig.socialLinks, ...(savedConf?.socialLinks || {}) },
                    carouselItems: carouselWithIds,
                };

                const fetchedProductLimitService = productLimitSnap.exists() ? productLimitSnap.data() as SystemService : null;
                const fetchedImageLimitService = imageLimitSnap.exists() ? imageLimitSnap.data() as SystemService : null;

                let productLimitValue = 10;
                if (fetchedBusiness?.productLimit && fetchedBusiness.productLimit !== 0) {
                    productLimitValue = fetchedBusiness.productLimit;
                } else if (fetchedProductLimitService?.status === 'active' && fetchedProductLimitService.limit > 0) {
                    productLimitValue = fetchedProductLimitService.limit;
                }
                
                let imageLimitValue = 5;
                if (fetchedBusiness?.imageLimit && fetchedBusiness.imageLimit > 0) {
                    imageLimitValue = fetchedBusiness.imageLimit;
                } else if (fetchedImageLimitService?.status === 'active' && fetchedImageLimitService.limit > 0) {
                    imageLimitValue = fetchedImageLimitService.limit;
                }
                
                setPageData({
                    products: fetchedProducts,
                    headerConfig: mergedConfigData,
                    productLimit: productLimitValue,
                    imageLimit: imageLimitValue,
                    catalogModule: fetchedCatalogModule,
                });

            } catch (e: any) {
                console.error("Error fetching catalog page data:", e);
                toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos del catálogo." });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, firestore, isUserLoading, toast]);


    const canCreateProduct = useMemo(() => {
        const productCount = pageData.products.length;
        
        if (pageData.productLimit === -1) {
             return { allowed: true, reason: '' };
        }
        
        if (productCount >= pageData.productLimit) {
            return { allowed: false, reason: `Has alcanzado el límite de ${pageData.productLimit} productos.` };
        }

        return { allowed: true, reason: '' };
    }, [pageData.productLimit, pageData.products]);
    
    const updatePublicCatalog = (productsToSave: Product[], configToSave: LandingHeaderConfigData) => {
        if (!firestore || !user) return;
        const publicCatalogRef = doc(firestore, 'businesses', user.uid, 'publicData', 'catalog');
        setDocumentNonBlocking(publicCatalogRef, { products: productsToSave, headerConfig: configToSave }, { merge: true });
    };
    
    
    const handleSaveProduct = async (productData: Omit<Product, 'id' | 'businessId'>) => {
        if (!firestore || !user) return;
        
        if (!editingProduct && !canCreateProduct.allowed) {
            alert(canCreateProduct.reason);
            return;
        }
        
        const dataToSave = { ...productData, businessId: user.uid };
        let updatedProductId: string;

        if (editingProduct && editingProduct.id) {
            updatedProductId = editingProduct.id;
            const productDocRef = doc(firestore, 'businesses', user.uid, 'products', updatedProductId);
            setDocumentNonBlocking(productDocRef, dataToSave, { merge: true });
        } else {
            const newProductRef = doc(collection(firestore, 'businesses', user.uid, 'products'));
            updatedProductId = newProductRef.id;
            setDocumentNonBlocking(newProductRef, dataToSave);
        }
        
        let updatedProductList;
        if (editingProduct) {
            updatedProductList = pageData.products.map(p => p.id === updatedProductId ? { ...dataToSave, id: updatedProductId } : p);
        } else {
            updatedProductList = [...pageData.products, { ...dataToSave, id: updatedProductId }];
        }
        setPageData(prev => ({ ...prev, products: updatedProductList }));
        updatePublicCatalog(updatedProductList, pageData.headerConfig);

        setIsFormOpen(false);
        setEditingProduct(null);
    };
    
    const handleSaveHeader = (config: LandingHeaderConfigData) => {
        if (!firestore || !user) return;
        const headerConfigDocRef = doc(firestore, 'businesses', user.uid, 'landingConfig', 'header');
        setDocumentNonBlocking(headerConfigDocRef, config, { merge: true });
        setPageData(prev => ({...prev, headerConfig: config}));
        updatePublicCatalog(pageData.products, config);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !user || !productToDelete) return;
        const productDocRef = doc(firestore, 'businesses', user.uid, 'products', productToDelete.id);
        await deleteDocumentNonBlocking(productDocRef);

        const updatedProductList = pageData.products.filter(p => p.id !== productToDelete.id);
        setPageData(prev => ({...prev, products: updatedProductList}));
        updatePublicCatalog(updatedProductList, pageData.headerConfig);
        
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
            <CatalogHeaderForm data={pageData.headerConfig} setData={handleSaveHeader} />
            
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
                            <DialogContent className="max-w-4xl">
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
                                    imageLimit={pageData.imageLimit}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 p-3 text-sm">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            Límite de productos: <span className="font-bold">{pageData.products.length} / {pageData.productLimit === -1 ? '∞' : pageData.productLimit}</span>.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {pageData.products && pageData.products.length > 0 ? (
                    pageData.products.map(product => (
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
                    <Card className="sm:col-span-2 md:col-span-3 lg:col-span-4">
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

    