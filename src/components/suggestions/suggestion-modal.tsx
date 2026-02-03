'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import type { Product } from '@/models/product';
import type { SuggestionOutput } from '@/models/suggestion-io';
import { ArrowRight, ShoppingCart, ThumbsDown, ThumbsUp } from 'lucide-react';

interface SuggestionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  originalProduct: Product;
  suggestion: SuggestionOutput;
  onAccept: () => void;
  onDecline: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export function SuggestionModal({ isOpen, onOpenChange, originalProduct, suggestion, onAccept, onDecline }: SuggestionModalProps) {
  const { suggestedProduct, reason } = suggestion;

  if (!suggestedProduct) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">¡Una sugerencia para ti!</DialogTitle>
          <DialogDescription className="text-center">
            {reason || `Ya que te interesa ${originalProduct.name}, quizás te guste esto.`}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center justify-center gap-2">
            <ProductSuggestionCard product={originalProduct} />
            <ArrowRight className="h-8 w-8 text-muted-foreground shrink-0" />
            <ProductSuggestionCard product={suggestedProduct} highlight />
          </div>
        </div>
        <DialogFooter className="sm:justify-center gap-2">
          <Button type="button" onClick={onAccept}>
            <ThumbsUp className="mr-2 h-4 w-4" /> ¡Añadir y continuar!
          </Button>
          <Button type="button" variant="outline" onClick={onDecline}>
            <ThumbsDown className="mr-2 h-4 w-4" /> No, gracias
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


const ProductSuggestionCard = ({ product, highlight = false }: { product: Product, highlight?: boolean }) => {
    return (
        <Card className={`w-48 overflow-hidden transition-all ${highlight ? 'border-primary border-2 shadow-lg' : ''}`}>
            <CardContent className="p-2 text-center">
                 <div className="relative aspect-square w-full mb-2 rounded-md overflow-hidden">
                    <Image src={product.images[0] || 'https://picsum.photos/seed/placeholder/200/200'} alt={product.name} layout="fill" className="object-cover" />
                </div>
                <h4 className="text-sm font-semibold truncate">{product.name}</h4>
                <p className={`font-bold ${highlight ? 'text-primary' : 'text-muted-foreground'}`}>{formatCurrency(product.price)}</p>
            </CardContent>
        </Card>
    );
};
