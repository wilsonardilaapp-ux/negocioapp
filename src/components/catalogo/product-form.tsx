
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/editor/RichTextEditor';
import type { Product } from '@/models/product';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useToast } from '@/hooks/use-toast';

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
});

interface ProductFormProps {
    product: Product | null;
    onSave: (data: Omit<Product, 'id' | 'businessId'>) => void;
    onCancel: () => void;
}

type MediaItem = {
    url: string;
    type: 'image' | 'video';
};

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
    });

    const [mediaItems, setMediaItems] = useState<Array<MediaItem | null>>([]);
    const [isUploading, setIsUploading] = useState<number | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (product) {
            reset({
                name: product.name,
                price: product.price,
                stock: product.stock,
                category: product.category,
                description: product.description,
            });
            // Asumimos que las imágenes viejas son 'image'. Si se necesita soportar videos viejos,
            // se necesitaría un campo 'mediaType' en el modelo Product.
            setMediaItems(product.images.map(url => (url ? { url, type: 'image' } : null)));
        } else {
            reset({
                name: '',
                price: 0,
                stock: 0,
                category: '',
                description: '',
            });
            setMediaItems([]);
        }
    }, [product, reset]);
    
    const onSubmit = (data: z.infer<typeof productSchema>) => {
        const productData: Omit<Product, 'id' | 'businessId'> = {
            ...data,
            images: mediaItems.filter(item => item).map(item => item!.url), // Guardamos solo las URLs
            rating: product?.rating || 0,
            ratingCount: product?.ratingCount || 0,
        };
        onSave(productData);
    };

    const handleMediaUpload = async (file: File, index: number) => {
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
        const newMediaItems = [...mediaItems];
        newMediaItems[index] = null;
        setMediaItems(newMediaItems.filter(item => item !== null)); // Limpiamos los nulos
    };

    const MediaPreview = ({ item, alt }: { item: MediaItem, alt: string }) => {
        if (item.type === 'video') {
            return <video src={item.url} className="rounded-md object-cover w-full h-full" autoPlay loop muted />;
        }
        return <Image src={item.url} alt={alt} layout="fill" className="rounded-md object-cover" />;
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Columna Izquierda: Imágenes/Videos */}
                <div className="space-y-2">
                    <Label>Imágenes/Videos del Producto (Principal primero, hasta 5)</Label>
                    <div className="flex gap-2">
                        {/* Columna de miniaturas */}
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 4 }).map((_, index) => {
                                const mediaIndex = index + 1;
                                const currentItem = mediaItems[mediaIndex];
                                return (
                                <div key={mediaIndex} className="relative aspect-square w-16">
                                    {isUploading === mediaIndex ? (
                                        <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-muted">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    ) : currentItem ? (
                                        <div className="group relative w-full h-full">
                                            <MediaPreview item={currentItem} alt={`Producto ${mediaIndex + 1}`} />
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
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-md cursor-pointer hover:bg-muted p-2">
                                            <UploadCloud className="h-5 w-5 text-muted-foreground" />
                                            <Input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0], mediaIndex)} 
                                                accept="image/*,video/*" 
                                            />
                                        </label>
                                    )}
                                </div>
                            )})}
                        </div>
                        
                        {/* Media Principal */}
                        <div className="flex-1 relative aspect-square w-full">
                             {isUploading === 0 ? (
                                <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-muted">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : mediaItems[0] ? (
                                <div className="group relative w-full h-full">
                                    <MediaPreview item={mediaItems[0]} alt="Producto Principal" />
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
                                <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-md cursor-pointer hover:bg-muted p-4">
                                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-center font-semibold text-muted-foreground mt-2">Haz clic para subir una imagen o video</span>
                                    <span className="text-xs text-center text-muted-foreground mt-1">1500 × 1500 pixeles</span>
                                    <Input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0], 0)} 
                                        accept="image/*,video/*"
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Categoría y Descripción */}
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

            {/* Fila Inferior: Nombre, Precio, Stock */}
            <div className="space-y-4">
                 <div>
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input id="name" {...register("name")} placeholder="Ej: Café Orgánico de Altura" />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Guardar Producto</Button>
            </div>
        </form>
    );
}
