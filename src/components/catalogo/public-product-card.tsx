'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Eye } from 'lucide-react';
import type { Product } from '@/models/product';
import { stripHtml } from '@/lib/utils';

interface PublicProductCardProps {
  product: Product;
  onView: () => void;
  onBuy: () => void;
}

export default function PublicProductCard({ product, onView, onBuy }: PublicProductCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-100 group">
      {product.images?.[0] && (
        <div 
          className="relative aspect-square w-full cursor-pointer overflow-hidden bg-muted"
          onClick={onView}
        >
          <Image 
            src={product.images[0]} 
            alt={product.name} 
            fill 
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      )}
      <CardContent className="p-4 flex-grow space-y-2">
        <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base font-bold line-clamp-2 min-h-[2.5rem]">{product.name}</CardTitle>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
             <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
             <span className="font-bold text-gray-700">{product.rating.toFixed(1)}</span>
             <span>({product.ratingCount})</span>
             <span className="mx-2">•</span>
             <span className="capitalize">{product.category}</span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">
            {stripHtml(product.description || '')}
        </p>
        <p className="text-2xl font-black text-primary pt-2">
            {formatCurrency(product.price)}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="mr-2 h-4 w-4" /> Ver
        </Button>
        <Button size="sm" className="flex-1 font-bold" onClick={onBuy}>
            Comprar
        </Button>
      </CardFooter>
    </Card>
  );
}
