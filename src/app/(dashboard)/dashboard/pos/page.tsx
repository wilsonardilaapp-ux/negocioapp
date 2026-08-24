'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Business } from '@/models/business';
import type { Product } from '@/models/product';
import type { POSItem, VerticalType, DiscountType } from '@/types/billing';
import ProductCatalog from '@/components/billing/ProductCatalog';
import InvoiceCart from '@/components/billing/InvoiceCart';
import CashControl from '@/components/billing/CashControl';
import { Loader2, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Página principal de la Terminal de Facturación (POS).
 * Orquestador de la Fase 2: Motor de cálculos reactivos.
 */
export default function POSPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // 1. Obtener contexto del negocio y productos
  const businessRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'businesses', user.uid) : null),
    [user, firestore]
  );
  const { data: business, isLoading: loadingBusiness } = useDoc<Business>(businessRef);

  const productsQuery = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/products`) : null),
    [user, firestore]
  );
  const { data: products, isLoading: loadingProducts } = useCollection<Product>(productsQuery);

  // 2. Estado local del carrito y financiera
  const [cart, setCart] = useState<POSItem[]>([]);
  const [customerName, setCustomerName] = useState('Cliente General');
  
  // Variables Financieras
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(19); // Default IVA
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [cashReceived, setCashReceived] = useState(0);

  const businessType = (business?.category || 'Retail') as VerticalType;

  // 3. Motor de Cálculos Reactivos
  const financialSummary = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Cálculo de descuento
    const calculatedDiscount = discountType === 'percent' 
      ? (subtotal * discountValue / 100) 
      : discountValue;

    const baseTaxable = Math.max(0, subtotal - calculatedDiscount);
    const calculatedTax = baseTaxable * (taxRate / 100);
    const totalFinal = baseTaxable + calculatedTax + tipAmount;
    const change = Math.max(0, cashReceived - totalFinal);

    return {
      subtotal,
      discount: calculatedDiscount,
      tax: calculatedTax,
      total: totalFinal,
      change
    };
  }, [cart, discountType, discountValue, taxRate, tipAmount, cashReceived]);

  // 4. Handlers
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice } 
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        subtotal: product.price,
        taxAmount: 0,
        discountAmount: 0
      }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleProcessSale = async () => {
    if (paymentMethod === 'efectivo' && cashReceived < financialSummary.total) {
      toast({
        variant: "destructive",
        title: "Efectivo insuficiente",
        description: "El monto recibido es menor al total de la venta.",
      });
      return;
    }

    toast({
        title: "🚀 Venta lista para procesar",
        description: "En la Fase 3 habilitaremos la persistencia y el Kardex.",
    });
  };

  if (loadingBusiness && !business) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Iniciando Terminal de Facturación...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Header POS */}
      <header className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <Calculator size={32} />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Terminal POS v1.0</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Entorno: {businessType}</p>
            </div>
         </div>
         <div className="hidden md:flex gap-4">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border">
                <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Vendedor</p>
                <p className="text-xs font-bold text-slate-700">{user?.email}</p>
            </div>
         </div>
      </header>

      {/* Main POS Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Lado Izquierdo: Catálogo */}
        <div className="lg:col-span-7 xl:col-span-8 h-full overflow-hidden">
          <ProductCatalog 
            products={products || []} 
            onAddToCart={handleAddToCart}
            isLoading={loadingProducts}
          />
        </div>

        {/* Lado Derecho: Carrito y Efectivo */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <InvoiceCart 
              items={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              businessType={businessType}
              customerName={customerName}
              setCustomerName={setCustomerName}
              
              // Financial Props
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              taxRate={taxRate}
              setTaxRate={setTaxRate}
              tipAmount={tipAmount}
              setTipAmount={setTipAmount}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              
              summary={financialSummary}
              onProcessSale={handleProcessSale}
            />
          </div>
          
          <div className="shrink-0">
             <CashControl 
               total={financialSummary.total} 
               cashReceived={cashReceived}
               onCashChange={setCashReceived}
             />
          </div>
        </div>
      </div>
    </div>
  );
}
