'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ShoppingCart, AlertCircle } from 'lucide-react';
import type { Product } from '@/models/product';
import { calcularPrecioCliente, type PricingContext } from '@/constants/pricingPlans';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ProductCatalogProps {
  planContext?: PricingContext;
  products: Product[];
  onAddToCart: (product: Product) => void;
  isLoading: boolean;
}


function ProductItemImage({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const rawImage = product.images?.[0] || (product as any).image || (product as any).imageUrl;
  const hasValidImage = Boolean(rawImage && typeof rawImage === 'string' && rawImage.trim() !== '' && !imgError);

  if (hasValidImage) {
    return (
      <Image 
        src={rawImage} 
        alt={product.name} 
        fill 
        sizes="(max-width: 768px) 50vw, 20vw"
        className="object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500">
      <Package size={44} strokeWidth={1.5} className="opacity-80" />
    </div>
  );
}

export default function ProductCatalog({ products, onAddToCart, isLoading, planContext }: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['Todas', ...cats.sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Buscador y Categorías */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o código..." 
            className="pl-10 h-12 rounded-xl border-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold border-2 transition-all whitespace-nowrap",
                selectedCategory === cat 
                  ? "bg-primary text-white border-primary shadow-md" 
                  : "bg-white text-muted-foreground border-slate-100 hover:border-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all rounded-2xl border-none shadow-sm"
                onClick={() => onAddToCart(product)}
              >
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <ProductItemImage product={product} />
                  {product.stock < 5 && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="text-[8px] h-4">Bajo Stock</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-xs font-black text-slate-800 line-clamp-1 uppercase tracking-tight">{product.name}</p>
                  <p className="text-sm font-black text-primary">${product.price.toLocaleString('es-CO')}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Cant: {product.stock}</span>
                    <div className="p-1 bg-primary/10 rounded-full text-primary">
                      <ShoppingCart size={12} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
             <AlertCircle size={40} className="mb-2 opacity-20" />
             <p className="font-bold">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  );
}
