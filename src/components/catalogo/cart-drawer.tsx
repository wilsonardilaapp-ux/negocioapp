'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
  SheetFooter 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import type { CartItem } from '@/models/cart';

interface CartDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onCheckout: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export function CartDrawer({ 
  isOpen, 
  onOpenChange, 
  cartItems, 
  onRemoveItem, 
  onUpdateQuantity, 
  onCheckout 
}: CartDrawerProps) {
  
  const subtotalProducts = useMemo(() => {
    return cartItems.reduce((sum, item) => {
        const unitPrice = item.appliedPromotion?.discountedPrice ?? item.price;
        return sum + (unitPrice * item.quantity);
    }, 0);
  }, [cartItems]);

  const isEmpty = cartItems.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <SheetTitle>Mi Carrito</SheetTitle>
          </div>
          <SheetDescription>
            {isEmpty 
              ? 'Empieza a agregar productos para verlos aquí.' 
              : `Tienes ${cartItems.reduce((sum, i) => sum + i.quantity, 0)} productos listos.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
              <ShoppingBag className="h-16 w-16" />
              <p className="font-medium text-lg">Tu carrito está vacío</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Ver Catálogo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-xl divide-y bg-muted/20 overflow-hidden">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white/50 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center flex-1 min-w-0 gap-4">
                      <div className="relative h-14 w-14 rounded-lg border bg-white overflow-hidden shrink-0">
                        <Image 
                          src={item.images?.[0] || 'https://picsum.photos/seed/placeholder/200/200'} 
                          alt={item.name} 
                          fill 
                          sizes="3.5rem" 
                          className="object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.name}</p>
                        <div className="flex flex-col">
                          {item.appliedPromotion && (
                            <span className="line-through text-muted-foreground text-xs leading-none mb-0.5">
                              {formatCurrency(item.appliedPromotion.originalPrice)}
                            </span>
                          )}
                          <span className="text-sm font-black text-primary">
                            {formatCurrency(item.appliedPromotion?.discountedPrice ?? item.price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4 w-[140px] justify-end">
                      <div className="flex items-center border rounded-lg bg-white overflow-hidden shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-red-50 shrink-0" 
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isEmpty && (
          <SheetFooter className="p-6 border-t bg-muted/20 sm:flex-col gap-4">
            <div className="flex justify-between items-center w-full">
              <span className="text-muted-foreground font-medium">Subtotal aproximado</span>
              <span className="text-2xl font-black text-primary">{formatCurrency(subtotalProducts)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center w-full">
              * El costo de envío e impuestos se calcularán en el siguiente paso.
            </p>
            <Button 
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20"
              onClick={onCheckout}
            >
              Continuar al Pago
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
