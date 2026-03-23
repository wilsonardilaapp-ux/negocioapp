
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlusCircle, ShoppingBag, Edit, Trash2, Printer, FileDown, Info, Frown } from 'lucide-react';
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
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, writeBatch, query, where, getDoc } from 'firebase/firestore';
import type { SystemService } from '@/models/system-service';
import type { Module } from '@/models/module';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
    const [catalogModule, setCatalogModule] = useState<Module | null>(null);
    const [isModuleLoading, setIsModuleLoading] = useState(true);
    
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    // Lógica para verificar el módulo de catálogo con retrocompatibilidad
    useEffect(() => {
        if (!firestore) return;
        
        const checkModule = async () => {
            setIsModuleLoading(true);
            try {
                const primaryDocRef = doc(firestore, 'modules', 'catalogo');
                const primarySnap = await getDoc(primaryDocRef);

                if (primarySnap.exists()) {
                    setCatalogModule({ ...primarySnap.data(), id: primarySnap.id } as Module);
                } else {
                    const fallbackDocRef = doc(firestore, 'modules', 'catalogo-de-productos');
                    const fallbackSnap = await getDoc(fallbackDocRef);
                    if (fallbackSnap.exists()) {
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

    const productLimitServiceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'systemServices', 'product_limit');
    }, [firestore]);
    
    const { data: productLimitService, isLoading: isServicesLoading } = useDoc<SystemService>(productLimitServiceQuery);

    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'businesses', user.uid, 'products');
    }, [firestore, user]);
    const { data: products, isLoading: isProductsLoading } = useCollection<Product>(productsQuery);

    const headerConfigDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null; 
        return doc(firestore, 'businesses', user.uid, 'landingConfig', 'header');
    }, [firestore, user]);
    
    const { data: headerConfig, isLoading: isConfigLoading } = useDoc<LandingHeaderConfigData>(headerConfigDocRef);

    const mergedConfig = useMemo(() => {
        const savedConf = headerConfig; // This will be LandingHeaderConfigData | null
    
        // Safely access carouselItems. Use optional chaining.
        const carouselItems = (savedConf?.carouselItems && Array.isArray(savedConf.carouselItems) && savedConf.carouselItems.length > 0)
            ? savedConf.carouselItems
            : initialHeaderConfig.carouselItems;
    
        // Ensure each item has a unique ID.
        const carouselWithIds = carouselItems.map(item => (item && item.id ? item : { ...item, id: uuidv4() }));
    
        return {
            ...initialHeaderConfig,
            ...savedConf,
            banner: { ...initialHeaderConfig.banner, ...(savedConf?.banner || {}) },
            businessInfo: { ...initialHeaderConfig.businessInfo, ...(savedConf?.businessInfo || {}) },
            socialLinks: { ...initialHeaderConfig.socialLinks, ...(savedConf?.socialLinks || {}) },
            carouselItems: carouselWithIds,
        };
    }, [headerConfig]);


    const productLimit = productLimitService?.limit ?? 10;
    const isProductLimitServiceActive = productLimitService?.status === 'active';

    const canCreateProduct = useMemo(() => {
        const productCount = products?.length ?? 0;
        
        if (!isProductLimitServiceActive) {
            return { allowed: true, reason: '' };
        }

        if (productCount >= productLimit) {
            return { allowed: false, reason: `Has alcanzado el límite de ${productLimit} productos.` };
        }

        return { allowed: true, reason: '' };
    }, [isProductLimitServiceActive, productLimit, products]);
    
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
        
        const currentProducts = products || [];
        let updatedProductList;
        if (editingProduct) {
            updatedProductList = currentProducts.map(p => p.id === updatedProductId ? { ...dataToSave, id: updatedProductId } : p);
        } else {
            updatedProductList = [...currentProducts, { ...dataToSave, id: updatedProductId }];
        }
        
        updatePublicCatalog(updatedProductList, mergedConfig);

        setIsFormOpen(false);
        setEditingProduct(null);
    };
    
    const handleSaveHeader = (config: LandingHeaderConfigData) => {
        if (headerConfigDocRef) {
            setDocumentNonBlocking(headerConfigDocRef, config, { merge: true });
            updatePublicCatalog(products || [], config);
        }
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
        updatePublicCatalog(updatedProductList, mergedConfig);
        
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
    
    const isLoading = isUserLoading || isConfigLoading || isProductsLoading || isServicesLoading || isModuleLoading;

    if (isLoading) {
        return <div>Cargando tu catálogo...</div>
    }

    if (!catalogModule || catalogModule.status === 'inactive') {
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
            <CatalogHeaderForm data={mergedConfig} setData={handleSaveHeader} />
            
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
                                                {/* The div is necessary for Tooltip to work on a disabled button */}
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
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 p-3 text-sm">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            Límite de productos: <span className="font-bold">{products?.length ?? 0} / {productLimit === -1 ? '∞' : productLimit}</span>.
                            Estado del servicio de límite: <span className={`font-bold ${isProductLimitServiceActive ? 'text-green-600' : 'text-red-600'}`}>{isProductLimitServiceActive ? 'Activado' : 'Desactivado'}</span>.
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
