'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Product } from '@/models/product';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ProductViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (quantity: number) => void;
}

export default function ProductViewModal({ product, isOpen, onOpenChange, onAddToCart }: ProductViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  React.useEffect(() => {
    if (product) {
      setQuantity(1);
      setActiveImage(product.images?.[0] || null);
    }
  }, [product]);

  if (!product) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 sr-only">
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>Detalles del producto</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Gallery */}
            <div className="bg-gray-100 p-4 space-y-4">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white shadow-inner">
                {activeImage && <Image src={activeImage} alt={product.name} fill className="object-contain" />}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.images.map((img, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveImage(img)}
                      className={cn(
                        "relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                        activeImage === img ? "border-primary" : "border-transparent opacity-60"
                      )}
                    >
                      <Image src={img} alt={`${product.name} ${i}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <Badge variant="secondary" className="capitalize">{product.category}</Badge>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">{product.name}</h2>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("h-4 w-4", i < Math.floor(product.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                        ))}
                    </div>
                    <span className="text-sm font-bold">{(product.rating || 0).toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({product.ratingCount || 0} opiniones)</span>
                </div>
              </div>

              <div className="text-3xl font-black text-primary">
                {formatCurrency(product.price)}
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-700">Descripción</h4>
                <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: product.description || '' }} />
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                   <Label className="text-base font-bold">Cantidad</Label>
                   <div className="flex items-center border-2 rounded-xl overflow-hidden bg-muted/50">
                        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-5 w-5" /></Button>
                        <span className="w-12 text-center font-black text-lg">{quantity}</span>
                        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setQuantity(quantity + 1)}><Plus className="h-5 w-5" /></Button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-white">
          <Button 
            className="w-full h-14 text-lg font-black shadow-lg shadow-primary/20 rounded-xl"
            onClick={() => onAddToCart(quantity)}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Añadir {quantity} al carrito — {formatCurrency(product.price * quantity)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}