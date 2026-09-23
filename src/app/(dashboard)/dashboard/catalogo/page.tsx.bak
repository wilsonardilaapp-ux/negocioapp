'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { PlusCircle, ShoppingBag, Edit, Trash2, Printer, FileDown, Info, Frown, Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Save } from 'lucide-react';
import type { Product } from '../../../../models/product';
import ProductForm from '../../../../components/catalogo/product-form';
import CatalogHeaderForm from '../../../../components/catalogo/catalog-header-form';
import CatalogQRGenerator from '../../../../components/catalogo/catalog-qr-generator';
import ShareCatalog from '../../../../components/catalogo/share-catalog';
import ProductCard from '../../../../components/catalogo/product-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '../../../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import type { LandingHeaderConfigData } from '../../../../models/landing-page';
import { v4 as uuidv4 } from 'uuid';
import { useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useCollection } from '../../../../firebase';
import { doc, getDoc, collection, writeBatch } from 'firebase/firestore'; 
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../../../../components/ui/tooltip';
import { useToast } from '../../../../hooks/use-toast';
import { useSubscription } from '../../../../hooks/useSubscription';
import { LimitBanner } from '../../../../components/dashboard/LimitBanner';
import type { Business } from '../../../../models/business';
import { promotionService } from '../../../../services/promotion-service';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

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
      category: '',
      subcategory: '',
    },
    socialLinks: {
      tiktok: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      twitter: '',
      youtube: '',
    },
    carouselItems: [
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
    ],
};

interface ImportRow {
    Nombre?: string;
    Descripción?: string;
    Precio?: number | string;
    Stock?: number | string;
    Categoría?: string;
    ImagenURL?: string;
    error?: string;
    isValid: boolean;
}

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export default function CatalogoPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    
    const [headerConfig, setHeaderConfig] = useState<LandingHeaderConfigData>(initialHeaderConfig);
    const [isInitialLoading, setInitialLoading] = useState(true);

    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { 
        canAddProducts, 
        limits, 
        plan,
        isModuleAuthorized,
        isLoading: isSubscriptionLoading 
    } = useSubscription();

    const isAuthorized = useMemo(() => isModuleAuthorized('catalogo'), [isModuleAuthorized]);

    const productsQuery = useMemoFirebase(() => 
        user ? collection(firestore, 'businesses', user.uid, 'products') : null, 
    [firestore, user]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
    
    // --- ESTADOS PARA IMPORTACIÓN ---
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isUserLoading || !user || !firestore) return;

        let isMounted = true;
        const fetchConfig = async () => {
            if (!isMounted) return;
            
            if (!isAuthorized) {
                setInitialLoading(false);
                return;
            }

            try {
                const businessRef = doc(firestore, 'businesses', user.uid);
                const businessSnap = await getDoc(businessRef);
                const businessRootData = businessSnap.exists() ? businessSnap.data() as Business : null;

                const headerConfigRef = doc(firestore, 'businesses', user.uid, 'landingConfig', 'header');
                const headerConfigSnap = await getDoc(headerConfigRef);
                
                if (isMounted) {
                    const savedConf = headerConfigSnap.exists() ? headerConfigSnap.data() as LandingHeaderConfigData : null;
                    const carouselItems = (savedConf?.carouselItems && Array.isArray(savedConf.carouselItems) && savedConf.carouselItems.length > 0)
                        ? savedConf.carouselItems.map(item => item?.id ? item : { ...item, id: uuidv4() })
                        : initialHeaderConfig.carouselItems;

                    setHeaderConfig({
                        ...initialHeaderConfig,
                        ...(savedConf || {}),
                        banner: { ...initialHeaderConfig.banner, ...(savedConf?.banner || {}) },
                        businessInfo: { 
                            ...initialHeaderConfig.businessInfo, 
                            ...(savedConf?.businessInfo || {}),
                            category: savedConf?.businessInfo?.category || businessRootData?.category || '',
                            subcategory: savedConf?.businessInfo?.subcategory || (businessRootData as any)?.subcategory || '',
                        },
                        socialLinks: { ...initialHeaderConfig.socialLinks, ...(savedConf?.socialLinks || {}) },
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
    }, [user, firestore, isUserLoading, toast, isAuthorized]);
    
    const isLoading = isUserLoading || isSubscriptionLoading || areProductsLoading || isInitialLoading;
    const productCount = products?.length ?? 0;
    const canCreate = canAddProducts(productCount);

    const canCreateProduct = useMemo(() => {
        return {
            allowed: canCreate,
            reason: `Has alcanzado el límite de ${limits.products} productos para tu plan.`
        }
    }, [canCreate, limits.products]);
    
    const updatePublicCatalog = useCallback(async (productsToSave: Product[], configToSave: LandingHeaderConfigData) => {
        if (!firestore || !user) return;
        
        try {
            // Obtener promociones activas que deben mostrarse en el catálogo
            const activePromos = await promotionService.getActivePromotions(user.uid);
            
            const publicCatalogRef = doc(firestore, 'businesses', user.uid, 'publicData', 'catalog');
            await setDocumentNonBlocking(publicCatalogRef, { 
                products: productsToSave, 
                headerConfig: configToSave,
                promotions: activePromos 
            }, { merge: true });
        } catch (error) {
            console.error("Error al actualizar catálogo público con promociones:", error);
            // Fallback: actualizar solo productos y config si fallan las promociones
            const publicCatalogRef = doc(firestore, 'businesses', user.uid, 'publicData', 'catalog');
            await setDocumentNonBlocking(publicCatalogRef, { products: productsToSave, headerConfig: configToSave }, { merge: true });
        }
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

        const currentProducts = products || [];
        const newProductsList = editingProduct
            ? currentProducts.map(p => p.id === editingProduct!.id ? { ...dataToSave, id: editingProduct!.id } : p)
            : [...currentProducts, { ...dataToSave, id: 'temp-id' }]; 
        
        updatePublicCatalog(newProductsList as Product[], headerConfig);

        setIsFormOpen(false);
        setEditingProduct(null);
    };
    
    const handleSaveHeader = async (config: LandingHeaderConfigData) => {
        if (!firestore || !user) return;
        
        try {
            const headerConfigDocRef = doc(firestore, 'businesses', user.uid, 'landingConfig', 'header');
            await setDocumentNonBlocking(headerConfigDocRef, config, { merge: true });

            const businessRef = doc(firestore, 'businesses', user.uid);
            await setDocumentNonBlocking(businessRef, { 
                name: config.businessInfo.name,
                category: config.businessInfo.category || null,
                subcategory: config.businessInfo.subcategory || null
            }, { merge: true });

            setHeaderConfig(config);
            updatePublicCatalog(products || [], config);
            
            toast({ 
                title: "Configuración guardada", 
                description: "Los datos del negocio se han actualizado correctamente." 
            });
        } catch (error: any) {
            console.error("Error saving header config:", error);
            toast({ 
                variant: "destructive", 
                title: "Error al guardar", 
                description: "No se pudo sincronizar la información del negocio." 
            });
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !user || !productToDelete) return;
        const productDocRef = doc(firestore, `businesses/${user.uid}/products`, productToDelete.id);
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

    // --- LÓGICA DE IMPORTACIÓN ---

    const downloadTemplate = () => {
        const data = [
            ["Nombre", "Descripción", "Precio", "Stock", "Categoría", "ImagenURL"],
            ["Café Americano", "Delicioso café recién tostado de altura", 5000, 100, "Bebidas Calientes", "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&h=400&auto=format&fit=crop"],
            ["Té Chai", "Té negro con especias tradicionales y leche", 4500, 50, "Bebidas Calientes", ""],
            ["Sándwich Premium", "Sándwich artesanal con jamón serrano y queso brie", 12000, 30, "Comidas", "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=400&h=400&auto=format&fit=crop"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Productos");
        XLSX.writeFile(wb, "Plantilla_Importacion_Productos.xlsx");
    };

    const validateUrl = (url: string) => {
        if (!url) return true;
        try {
            const newUrl = new URL(url);
            return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
        } catch (_) {
            return false;
        }
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json<any>(ws);

                if (data.length === 0) {
                    toast({ variant: 'destructive', title: 'Archivo vacío', description: 'El archivo no contiene filas de datos.' });
                    return;
                }

                const processed: ImportRow[] = data.map((row: any) => {
                    const name = String(row.Nombre || '').trim();
                    const desc = String(row.Descripción || '').trim();
                    const price = parseFloat(String(row.Precio || '0'));
                    const stock = parseInt(String(row.Stock || '0'), 10);
                    const cat = String(row.Categoría || '').trim();
                    const imgUrl = String(row.ImagenURL || '').trim();

                    const errors = [];
                    if (!name) errors.push("Nombre requerido");
                    if (!desc) errors.push("Descripción requerida");
                    if (isNaN(price) || price < 0) errors.push("Precio inválido");
                    if (isNaN(stock) || stock < 0) errors.push("Stock inválido");
                    if (!cat) errors.push("Categoría requerida");
                    if (imgUrl && !validateUrl(imgUrl)) errors.push("ImagenURL no válida");

                    return {
                        Nombre: name,
                        Descripción: desc,
                        Precio: price,
                        Stock: stock,
                        Categoría: cat,
                        ImagenURL: imgUrl,
                        isValid: errors.length === 0,
                        error: errors.join(", ")
                    };
                });

                setImportRows(processed);
                setIsImportModalOpen(true);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Error al leer archivo', description: 'Asegúrate de que el formato sea correcto (.xlsx o .csv).' });
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmBulkImport = async () => {
        if (!user || !firestore) return;
        
        const validRows = importRows.filter(r => r.isValid);
        if (validRows.length === 0) return;

        // Validar cupos disponibles según el plan
        const availableSlots = limits.products === -1 ? Infinity : (limits.products - productCount);
        
        if (availableSlots <= 0) {
            toast({ variant: 'destructive', title: 'Límite alcanzado', description: `No tienes cupos disponibles en tu plan ${plan.toUpperCase()}.` });
            return;
        }

        const rowsToImport = validRows.slice(0, availableSlots);
        const omittedByPlan = validRows.length - rowsToImport.length;

        setIsImporting(true);
        try {
            const chunks = chunkArray(rowsToImport, 500);

            for (const chunk of chunks) {
                const batch = writeBatch(firestore);
                chunk.forEach(row => {
                    const productRef = doc(collection(firestore, `businesses/${user.uid}/products`));
                    const newProduct: Product = {
                        id: productRef.id,
                        businessId: user.uid,
                        name: row.Nombre!,
                        description: row.Descripción!,
                        price: Number(row.Precio),
                        stock: Number(row.Stock),
                        category: row.Categoría!,
                        images: row.ImagenURL ? [row.ImagenURL] : [],
                        rating: 0,
                        ratingCount: 0
                    };
                    batch.set(productRef, newProduct);
                });
                await batch.commit();
            }

            toast({ 
                title: 'Importación finalizada', 
                description: `Se importaron ${rowsToImport.length} productos.${omittedByPlan > 0 ? ` Se omitieron ${omittedByPlan} por límite de plan.` : ''}` 
            });
            
            setIsImportModalOpen(false);
            setImportRows([]);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error al importar', description: 'Ocurrió un fallo al escribir en la base de datos.' });
        } finally {
            setIsImporting(false);
        }
    };
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> Cargando tu catálogo...</div>
    }

    if (!isAuthorized) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Módulo de Catálogo Desactivado</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                    <Frown className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
                    <p className="text-muted-foreground max-w-sm">
                        El módulo de "Catálogo de Productos" no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
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

    const availableSlots = limits.products === -1 ? Infinity : (limits.products - productCount);

    return (
        <div className="flex flex-col gap-6">
            <CatalogHeaderForm data={headerConfig} setData={handleSaveHeader} />
            
            <CatalogQRGenerator />

            <LimitBanner current={productCount} limit={limits.products} label="productos" plan={plan} />

            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Tus Productos</CardTitle>
                        <CardDescription>
                            Añade, edita y gestiona los productos de tu negocio.
                        </CardDescription>
                    </div>
                     <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={downloadTemplate} className="font-bold border-primary text-primary hover:bg-primary/5">
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Plantilla
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="font-bold border-primary text-primary hover:bg-primary/5">
                            <Upload className="mr-2 h-4 w-4" /> Importar
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileImport} />
                        
                        <Button variant="outline" onClick={() => handleOpenActionWindow('print')}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir
                        </Button>
                        <Button variant="outline" onClick={() => handleOpenActionWindow('download')}>
                            <FileDown className="mr-2 h-4 w-4" />
                            PDF
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

            {/* DIÁLOGO DE VISTA PREVIA DE IMPORTACIÓN */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            Vista Previa de Importación de Productos
                        </DialogTitle>
                        <DialogDescription>
                            Revisa los datos antes de guardarlos. Se detectaron {importRows.length} filas en total.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 bg-muted/50 rounded-xl text-center border">
                                <p className="text-2xl font-black text-primary">{importRows.filter(r => r.isValid).length}</p>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Válidos</p>
                            </div>
                            <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                                <p className="text-2xl font-black text-red-600">{importRows.filter(r => !r.isValid).length}</p>
                                <p className="text-[10px] uppercase font-bold text-red-400">Con Error</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                <p className="text-2xl font-black text-blue-600">{availableSlots === Infinity ? '∞' : availableSlots}</p>
                                <p className="text-[10px] uppercase font-bold text-blue-400">Cupos Disponibles</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl text-center border border-green-100">
                                <p className="text-2xl font-black text-green-600">
                                    {Math.min(importRows.filter(r => r.isValid).length, availableSlots)}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-green-400">Se Importarán</p>
                            </div>
                        </div>

                        {importRows.filter(r => r.isValid).length > availableSlots && (
                            <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-800 leading-tight">
                                    <strong>Atención:</strong> Tienes más productos válidos que cupos en tu plan. Solo se importarán los primeros {availableSlots} productos válidos de la lista.
                                </p>
                            </div>
                        )}

                        <div className="rounded-xl border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="text-right">Precio</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-center">Img</TableHead>
                                        <TableHead className="text-right">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importRows.map((row, i) => {
                                        const isOverPlanLimit = i >= availableSlots && row.isValid;
                                        return (
                                            <TableRow key={i} className={cn(!row.isValid && "bg-red-50/50", isOverPlanLimit && "opacity-40")}>
                                                <TableCell className="text-sm font-medium">{row.Nombre || '-'}</TableCell>
                                                <TableCell className="text-sm">{row.Categoría || '-'}</TableCell>
                                                <TableCell className="text-right text-sm">{typeof row.Precio === 'number' ? row.Precio.toLocaleString('es-CO') : '-'}</TableCell>
                                                <TableCell className="text-right text-sm">{row.Stock ?? '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    {row.ImagenURL ? <CheckCircle2 className="h-4 w-4 text-blue-500 mx-auto" /> : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {!row.isValid ? (
                                                        <Badge variant="destructive" className="text-[8px]">{row.error}</Badge>
                                                    ) : isOverPlanLimit ? (
                                                        <Badge variant="outline" className="text-[8px]">Omitido (Plan)</Badge>
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-muted/20 border-t">
                        <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} disabled={isImporting}>Cancelar</Button>
                        <Button 
                            onClick={confirmBulkImport} 
                            disabled={isImporting || importRows.filter(r => r.isValid).length === 0 || availableSlots <= 0}
                            className="font-bold px-8"
                        >
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Confirmar Importación ({Math.min(importRows.filter(r => r.isValid).length, availableSlots)})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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