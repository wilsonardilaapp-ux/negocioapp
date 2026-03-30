'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/editor/RichTextEditor';
import type { Product } from '@/models/product';
import { UploadCloud, X, Loader2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

const productSchema = z.object({
    name: z.string().min(3, "El nombre es requerido."),
    price: z.preprocess(
        (val) => parseFloat(String(val)),
        z.number().min(0, "El precio debe ser positivo.")
    ),
    stock: z.preprocess(
        (val) => parseInt(String(val), 10),
        z.number().int().min(0, "El stock debe ser un número entero positivo.")
    ),
    category: z.string().min(1, "La categoría es requerida."),
    description: z.string().min(10, "La descripción es muy corta."),
    packagingCost: z.preprocess(
      (val) => val === '' || val === undefined || val === null
        ? 0
        : parseFloat(String(val)),
      z.number().min(0, "El valor debe ser positivo.").optional()
    ),
});

interface ProductFormProps {
    product: Product | null;
    onSave: (data: Omit<Product, 'id' | 'businessId'>) => void;
    onCancel: () => void;
    imageLimit: number;
}

type MediaItem = {
    url: string;
    type: 'image' | 'video';
};

export default function ProductForm({ product, onSave, onCancel, imageLimit }: ProductFormProps) {
    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
    });

    const [mediaItems, setMediaItems] = useState<Array<MediaItem | null>>([]);
    const [isUploading, setIsUploading] = useState<number | null>(null);
    const { toast } = useToast();

    // Lightbox State
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [selectedLightboxIndex, setSelectedLightboxIndex] = useState(0);

    const isLimitReached = useMemo(() => mediaItems.filter(item => item).length >= imageLimit, [mediaItems, imageLimit]);

    useEffect(() => {
        if (product) {
            reset({
                name: product.name,
                price: product.price,
                stock: product.stock,
                category: product.category,
                description: product.description,
                packagingCost: product.packagingCost ?? 0,
            });
            // Assume old images are 'image'. If video support is needed for old data, model needs update.
            const initialMedia = product.images.map(url => (url ? { url, type: isVideo(url) ? 'video' : 'image' } : null)).filter(Boolean) as MediaItem[];
            setMediaItems(initialMedia);
        } else {
            reset({
                name: '',
                price: 0,
                stock: 0,
                category: '',
                description: '',
                packagingCost: 0,
            });
            setMediaItems([]);
        }
    }, [product, reset]);
    
    const onSubmit = (data: z.infer<typeof productSchema>) => {
        const productData: Omit<Product, 'id' | 'businessId'> = {
            ...data,
            images: mediaItems.filter(item => item).map(item => item!.url),
            rating: product?.rating || 0,
            ratingCount: product?.ratingCount || 0,
            packagingCost: data.packagingCost ?? 0,
        };
        onSave(productData);
    };

    const handleMediaUpload = async (file: File, index: number) => {
        if (mediaItems.filter(Boolean).length >= imageLimit) {
            toast({
                variant: 'destructive',
                title: 'Límite de imágenes alcanzado',
                description: `No puedes subir más de ${imageLimit} imágenes.`,
            });
            return;
        }

        setIsUploading(index);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const mediaDataUri = reader.result as string;
            try {
                const result = await uploadMedia({ mediaDataUri });
                const mediaType = file.type.startsWith('image') ? 'image' : 'video';
                
                const newMediaItems = [...mediaItems];
                newMediaItems[index] = { url: result.secure_url, type: mediaType };
                setMediaItems(newMediaItems);

                toast({ title: "Archivo subido", description: "El medio ha sido cargado a Cloudinary." });
            } catch (error: any)
{
                toast({ variant: 'destructive', title: "Error al subir", description: error.message });
            } finally {
                setIsUploading(null);
            }
        };
    };
    
    const removeMedia = (index: number) => {
        const itemToRemove = mediaItems[index];
        if (!itemToRemove) return;
        setMediaItems(prev => prev.filter(item => item?.url !== itemToRemove.url));
    };

    const isVideo = (url: string) => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.webm', '.ogg'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    const openLightbox = (index: number) => {
        setSelectedLightboxIndex(index);
        setIsLightboxOpen(true);
    };

    const mainMediaItem = mediaItems[0];
    const canUploadMore = mediaItems.length < imageLimit;

    const Lightbox = ({ isArrowNavigation = true }: { isArrowNavigation?: boolean }) => {
        const goToNext = () => {
            setSelectedLightboxIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
        };
    
        const goToPrevious = () => {
            setSelectedLightboxIndex((prevIndex) => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
        };
    
        useEffect(() => {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (!isLightboxOpen) return;
                if (event.key === 'ArrowRight') goToNext();
                if (event.key === 'ArrowLeft') goToPrevious();
            };
    
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, [isLightboxOpen, goToNext, goToPrevious]);

        return (
            <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Galería de Imágenes</DialogTitle>
                </DialogHeader>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden relative">
                  <div className="md:col-span-2 relative bg-muted rounded-md flex items-center justify-center">
                    {mediaItems[selectedLightboxIndex] && (
                        <Image
                            src={mediaItems[selectedLightboxIndex]!.url}
                            alt={`Imagen ${selectedLightboxIndex + 1}`}
                            fill
                            className="object-contain"
                        />
                    )}
                     {isArrowNavigation && mediaItems.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToPrevious}
                                aria-label="Imagen anterior"
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/75 h-10 w-10 z-10"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                             <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToNext}
                                aria-label="Siguiente imagen"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/75 h-10 w-10 z-10"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </>
                    )}
                  </div>
                  {!isArrowNavigation && (
                      <ScrollArea className="md:col-span-1 h-full">
                        <div className="grid grid-cols-3 md:grid-cols-2 gap-2 pr-4">
                          {mediaItems.map((item, index) => item && (
                            <button
                              key={item.url}
                              onClick={() => setSelectedLightboxIndex(index)}
                              className={cn(
                                "relative aspect-square rounded-md overflow-hidden ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                                selectedLightboxIndex === index ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                              )}
                            >
                              <Image src={item.url} alt={`Thumbnail ${index + 1}`} fill sizes="6rem" className="object-cover" />
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          );
    };

    const MediaPreview = ({ item, alt }: { item: MediaItem, alt: string }) => {
        if (item.type === 'video') {
            return <video src={item.url} className="rounded-md object-cover w-full h-full" autoPlay loop muted />;
        }
        return <Image src={item.url} alt={alt} fill sizes="10rem" className="rounded-md object-cover" />;
    };

    return (
        <>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                    <Label>Imágenes/Videos del Producto (hasta {imageLimit})</Label>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-2 w-20 shrink-0">
                            {Array.from({ length: 4 }).map((_, thumbIndex) => {
                                const mediaIndex = thumbIndex + 1;
                                
                                if (thumbIndex === 3 && mediaItems.length > 5) {
                                    return (
                                        <div key="more" className="relative aspect-square w-20">
                                            <button
                                                type="button"
                                                onClick={() => openLightbox(mediaIndex)}
                                                className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-muted hover:bg-muted/80 text-muted-foreground"
                                            >
                                                <span className="text-xl font-bold">+{mediaItems.length - 4}</span>
                                            </button>
                                        </div>
                                    );
                                }

                                const currentItem = mediaItems[mediaIndex];
                                const canUploadThisSlot = mediaItems.length === mediaIndex && canUploadMore;

                                return (
                                    <div key={mediaIndex} className="relative aspect-square w-20">
                                        {isUploading === mediaIndex ? (
                                            <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-muted">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        ) : currentItem ? (
                                            <div className="group relative w-full h-full">
                                                <button type="button" onClick={() => openLightbox(mediaIndex)} className="w-full h-full">
                                                    <MediaPreview item={currentItem} alt={`Producto ${mediaIndex + 1}`} />
                                                </button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100"
                                                    onClick={() => removeMedia(mediaIndex)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : canUploadThisSlot ? (
                                            <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-md cursor-pointer hover:bg-muted p-2">
                                                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                                                <Input type="file" className="hidden" onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0], mediaIndex)} accept="image/*,video/*" />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-muted/30" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="flex-1 relative aspect-square w-full">
                             {isUploading === 0 ? (
                                <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-muted">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : mainMediaItem ? (
                                <div className="group relative w-full h-full">
                                    <button type="button" onClick={() => openLightbox(0)} className="w-full h-full">
                                        <MediaPreview item={mainMediaItem} alt="Producto Principal" />
                                    </button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                        onClick={() => removeMedia(0)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <label className={cn("flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-md cursor-pointer hover:bg-muted p-4", !canUploadMore && "cursor-not-allowed opacity-50")}>
                                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-center font-semibold text-muted-foreground mt-2">Imagen/Video Principal</span>
                                    <span className="text-xs text-center text-muted-foreground mt-1">1500 × 1500 pixeles</span>
                                    <Input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0], 0)} 
                                        accept="image/*,video/*"
                                        disabled={!canUploadMore}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="category">Categoría</Label>
                        <Input id="category" {...register("category")} placeholder="Ej: Bebidas Calientes" />
                        {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
                    </div>
                    <div>
                        <Label>Descripción (Contenido Adicional)</Label>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <RichTextEditor value={field.value} onChange={field.onChange} />
                            )}
                        />
                        {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                 <div>
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input id="name" {...register("name")} placeholder="Ej: Café Orgánico de Altura" />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="price">Precio</Label>
                        <Input id="price" type="number" step="0.01" {...register("price")} />
                        {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="stock">Stock</Label>
                        <Input id="stock" type="number" {...register("stock")} />
                        {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
                    </div>
                  <div>
                    <Label htmlFor="packagingCost">Costo de empaque</Label>
                    <Input
                      id="packagingCost"
                      type="number"
                      step="0.01"
                      placeholder="0 = sin empaque"
                      {...register("packagingCost")}
                    />
                    {errors.packagingCost && (
                      <p className="text-sm text-destructive">{errors.packagingCost.message}</p>
                    )}
                  </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Guardar Producto</Button>
            </div>
        </form>
        <Lightbox />
        </>
    );
}
