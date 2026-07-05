'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react';
import type { Product } from '@/models/product';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { useFirestore } from '@/firebase/provider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { rateProduct } from '@/ai/flows/rate-product-flow';
import { StarRatingInput } from './star-rating-input';

interface ProductViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (quantity: number) => void;
  onRatingUpdated?: (productId: string, newRating: number, newCount: number) => void;
}

export default function ProductViewModal({ 
    product, 
    isOpen, 
    onOpenChange, 
    onAddToCart,
    onRatingUpdated 
}: ProductViewModalProps) {
  const firestore = useFirestore();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  // Estados para la calificación
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [localStats, setLocalStats] = useState({ rating: 0, count: 0 });

  // Sincronizar stats locales con el producto al abrir
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setActiveImage(product.images?.[0] || null);
      setLocalStats({ rating: product.rating || 0, count: product.ratingCount || 0 });
      setHasVoted(false);
      setUserVote(0);
    }
  }, [product]);

  // Manejo del identificador de visitante único por dispositivo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let storedId = localStorage.getItem('catalog_visitor_id');
      if (!storedId) {
        storedId = uuidv4();
        localStorage.setItem('catalog_visitor_id', storedId);
      }
      setVisitorId(storedId);
    }
  }, []);

  // Verificar si el visitante ya votó por este producto
  useEffect(() => {
    if (!isOpen || !product || !visitorId || !firestore) return;

    const checkExistingVote = async () => {
      try {
        const voteRef = doc(firestore, `businesses/${product.businessId}/products/${product.id}/votes`, visitorId);
        const voteSnap = await getDoc(voteRef);
        if (voteSnap.exists()) {
          setHasVoted(true);
          setUserVote(voteSnap.data().rating);
        }
      } catch (e) {
        console.error("Error al verificar voto existente:", e);
      }
    };

    checkExistingVote();
  }, [isOpen, product, visitorId, firestore]);

  const handleVote = async (rating: number) => {
    if (!product || !visitorId || hasVoted || isVoting || !firestore) return;

    setIsVoting(true);
    try {
      // 1. Registrar el voto en la subcolección para control de duplicados
      const voteRef = doc(firestore, `businesses/${product.businessId}/products/${product.id}/votes`, visitorId);
      await setDoc(voteRef, {
        rating,
        createdAt: serverTimestamp(),
      });

      // 2. Llamar al flujo de IA para actualizar el promedio global del producto
      const result = await rateProduct({
        businessId: product.businessId,
        productId: product.id,
        rating
      });

      if (result.success) {
        // Actualización optimista local
        const newCount = localStats.count + 1;
        const newRating = ((localStats.rating * localStats.count) + rating) / newCount;
        
        setLocalStats({ rating: newRating, count: newCount });
        setHasVoted(true);
        setUserVote(rating);

        // Notificar al componente padre para que actualice la lista/tarjeta
        if (onRatingUpdated) {
            onRatingUpdated(product.id, newRating, newCount);
        }
      }
    } catch (error: any) {
      // Si falla por regla de seguridad (ya existía el doc), tratamos como que ya votó
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        setHasVoted(true);
      } else {
        console.error("Error al emitir calificación:", error);
      }
    } finally {
      setIsVoting(false);
    }
  };

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
            {/* Galería */}
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

            {/* Información e Interacción */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <Badge variant="secondary" className="capitalize">{product.category}</Badge>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">{product.name}</h2>
                
                {/* Sistema de Calificación Interactiva */}
                <div className="flex flex-col gap-1.5 py-2">
                  <div className="flex items-center gap-3">
                    <StarRatingInput 
                      value={localStats.rating} 
                      readOnly={hasVoted || isVoting} 
                      onSelect={handleVote} 
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-gray-900">{localStats.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({localStats.count} opiniones)</span>
                    </div>
                    {isVoting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                  {hasVoted && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-left-1">
                      <p className="text-[11px] text-green-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> ¡Gracias por tu calificación!
                      </p>
                      <p className="text-[10px] text-muted-foreground italic ml-4">
                        Tu calificación: {userVote} ⭐
                      </p>
                    </div>
                  )}
                  {!hasVoted && !isVoting && (
                    <p className="text-[10px] text-muted-foreground italic">Haz clic en una estrella para calificar este producto</p>
                  )}
                </div>
              </div>

              <div className="text-3xl font-black text-primary">
                {formatCurrency(product.price)}
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-700 uppercase text-xs tracking-widest">Descripción</h4>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description || '' }} />
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                   <Label className="text-base font-bold text-gray-900">Cantidad</Label>
                   <div className="flex items-center border-2 rounded-xl overflow-hidden bg-muted/50 border-transparent focus-within:border-primary/20 transition-colors">
                        <Button variant="ghost" size="icon" className="h-12 w-12 hover:bg-white/50" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-5 w-5" /></Button>
                        <span className="w-12 text-center font-black text-lg">{quantity}</span>
                        <Button variant="ghost" size="icon" className="h-12 w-12 hover:bg-white/50" onClick={() => setQuantity(quantity + 1)}><Plus className="h-5 w-5" /></Button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-white">
          <Button 
            className="w-full h-14 text-lg font-black shadow-lg shadow-primary/20 rounded-xl transition-transform active:scale-95"
            onClick={() => onAddToCart(quantity)}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Añadir al carrito — {formatCurrency(product.price * quantity)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
