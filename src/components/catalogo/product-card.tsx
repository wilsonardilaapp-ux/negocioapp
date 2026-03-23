
"use client";

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { Product } from '@/models/product';

interface ProductCardProps {
    product: Product;
    children?: React.ReactNode;
}

// Helper to check if a URL is for a video file
const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};


export default function ProductCard({ product, children }: ProductCardProps) {

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const mediaUrl = product.images?.[0] || 'https://picsum.photos/seed/placeholder/600/400';
    const isMediaVideo = isVideo(mediaUrl);

    return (
        <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
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
            {children && <CardFooter className="p-4 pt-0">{children}</CardFooter>}
        </Card>
    );
}
