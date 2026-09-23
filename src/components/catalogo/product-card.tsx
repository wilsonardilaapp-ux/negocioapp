"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { Product } from '@/models/product';
import { calcularPrecioCliente, type PricingContext } from '@/constants/pricingPlans';
import { cn, stripHtml } from '@/lib/utils';

interface ProductCardProps {
    product: Product;
    children?: React.ReactNode;
    planContext?: PricingContext;
}

// Helper to check if a URL is for a video file
const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};


export default function ProductCard({ product, children, planContext }: ProductCardProps) {
    const [imgError, setImgError] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const firstImage = product.images?.[0];
    const hasImage = !!(firstImage && firstImage.trim() !== "" && !imgError);
    const isMediaVideo = isVideo(firstImage || "");

    return (
        <Card className={cn(
            "flex flex-col overflow-hidden transition-shadow hover:shadow-lg",
            !hasImage && "self-start"
        )}>
            {hasImage && (
                <CardHeader className="p-0">
                    <div className="relative aspect-video w-full">
                        {isMediaVideo ? (
                            <video
                                src={firstImage}
                                autoPlay
                                loop
                                muted
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <Image
                                src={firstImage!}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover"
                                onError={() => setImgError(true)}
                            />
                        )}
                    </div>
                </CardHeader>
            )}
            <CardContent className="p-4 flex-grow">
                <CardTitle className="h-[2.8rem] text-base font-semibold leading-snug overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] mb-1">{product.name}</CardTitle>
                
                {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {stripHtml(product.description)}
                    </p>
                )}

                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    {product.ratingCount > 0 ? (
                        <>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>
                            <span className="text-xs">({product.ratingCount})</span>
                        </>
                    ) : (
                        <span className="text-xs italic">Sin valoraciones</span>
                    )}
                </div>
                
                {(() => {
                    const rawBase = product.basePrice ?? product.price;
                    const pDom = calcularPrecioCliente(rawBase, planContext, 'domicilio');
                    const pMesa = calcularPrecioCliente(rawBase, planContext, 'mesa');
                    const isHybrid = planContext?.planType === 'hibrido';

                    return (
                      <div className="space-y-1 mb-2 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Precio Base (tu ganancia):</span>
                          <span className="font-semibold text-foreground">{formatCurrency(rawBase)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <span className="text-[11px] font-semibold text-primary">Precio Cliente:</span>
                          {isHybrid && pDom !== pMesa ? (
                            <div className="text-xs font-bold text-foreground flex items-center justify-between bg-muted/40 px-2 py-1 rounded">
                              <span>Domicilio: <strong className="text-primary">{formatCurrency(pDom)}</strong></span>
                              <span>·</span>
                              <span>Mesa: <strong className="text-primary">{formatCurrency(pMesa)}</strong></span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(pDom)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
            </CardContent>
            {children && <CardFooter className="p-4 pt-0">{children}</CardFooter>}
        </Card>
    );
}
