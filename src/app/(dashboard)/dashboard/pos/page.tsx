
'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Business } from '@/models/business';
import type { Product } from '@/models/product';
import type { POSItem, VerticalType, DiscountType, Invoice } from '@/types/billing';
import ProductCatalog from '@/components/billing/ProductCatalog';
import InvoiceCart from '@/components/billing/InvoiceCart';
import CashControl from '@/components/billing/CashControl';
import InvoiceHistoryTable from '@/components/billing/InvoiceHistoryTable';
import { Loader2, Calculator, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { processSale } from '@/services/billing/billing-service';

/**
 * @fileOverview Página principal de la Terminal de Facturación (POS).
 * Orquestador central del módulo POS con flujo operativo optimizado.
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

  // 2. Suscripción al Historial de Facturas
  const invoicesQuery = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/invoices`) : null),
    [user, firestore]
  );
  const { data: invoices, isLoading: loadingInvoices } = useCollection<Invoice>(invoicesQuery);

  // 3. Estado local del carrito y financiera
  const [cart, setCart] = useState<POSItem[]>([]);
  const [customerName, setCustomerName] = useState('Cliente General');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Variables Financieras
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(19); // Default IVA
  const [tipValue, setTipValue] = useState(0);
  const [tipType, setTipType] = useState<DiscountType>('amount');
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [cashReceived, setCashReceived] = useState(0);

  const businessType = (business?.category || 'Retail') as VerticalType;

  // 4. Motor de Cálculos Reactivos (Corregido para manejar porcentajes correctamente)
  const financialSummary = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Cálculo de descuento
    const calculatedDiscount = discountType === 'percent' 
      ? (subtotal * discountValue / 100) 
      : discountValue;

    const baseTaxable = Math.max(0, subtotal - calculatedDiscount);
    const calculatedTax = baseTaxable * (taxRate / 100);
    
    // Cálculo de propina (sobre base imponible para mayor precisión comercial)
    const calculatedTip = tipType === 'percent'
      ? (baseTaxable * tipValue / 100)
      : tipValue;

    const totalFinal = baseTaxable + calculatedTax + calculatedTip;
    const change = Math.max(0, cashReceived - totalFinal);

    return {
      subtotal,
      discount: calculatedDiscount,
      tax: calculatedTax,
      tip: calculatedTip,
      total: totalFinal,
      change
    };
  }, [cart, discountType, discountValue, taxRate, tipValue, tipType, cashReceived]);

  // 5. Handlers de Carrito
  const handleAddToCart = (product: Product) => {
    if (isProcessing) return;
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
    if (!user || !firestore) return;

    if (paymentMethod === 'efectivo' && cashReceived < financialSummary.total) {
      toast({
        variant: "destructive",
        title: "Efectivo insuficiente",
        description: "El monto recibido es menor al total de la venta.",
      });
      return;
    }

    setIsProcessing(true);
    try {
        const result = await processSale(
            firestore,
            user.uid,
            user.uid,
            {
                businessId: user.uid,
                vendedorId: user.uid,
                customer: { name: customerName },
                items: cart,
                subtotal: financialSummary.subtotal,
                tax: financialSummary.tax,
                discount: financialSummary.discount,
                tip: financialSummary.tip,
                total: financialSummary.total,
                paymentMethod: paymentMethod as any,
                cashReceived,
                changeAmount: financialSummary.change
            },
            businessType
        );

        toast({
            title: "✅ Venta exitosa",
            description: `Factura ${result.consecutiveStr} registrada. Stock actualizado.`,
        });

        // Limpiar estados
        setCart([]);
        setCustomerName('Cliente General');
        setCashReceived(0);
        setDiscountValue(0);
        setTipValue(0);
        setTipType('amount');

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Fallo al registrar venta",
            description: error.message || "Error técnico en la transacción.",
        });
    } finally {
        setIsProcessing(false);
    }
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
    <div className="flex flex-col gap-8 h-full min-h-screen pb-20 animate-in fade-in duration-500">
      {/* Header POS */}
      <header className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 shrink-0">
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

      {/* Main POS Grid (Doble Columna) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto">
        {/* Lado Izquierdo: Catálogo */}
        <div className="lg:col-span-7 xl:col-span-8 overflow-hidden">
          <ProductCatalog 
            products={products || []} 
            onAddToCart={handleAddToCart}
            isLoading={loadingProducts}
          />
        </div>

        {/* Lado Derecho: Flujo de Facturación */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 overflow-hidden">
          {/* 1. Factura Actual y Resumen Financiero */}
          <div className="overflow-hidden">
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
              tipAmount={tipValue}
              setTipAmount={setTipValue}
              tipType={tipType}
              setTipType={setTipType}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              
              summary={financialSummary}
              isProcessing={isProcessing}
            />
          </div>
          
          {/* 2. Control de Efectivo */}
          <div className="shrink-0">
             <CashControl 
               total={financialSummary.total} 
               cashReceived={cashReceived}
               onCashChange={setCashReceived}
             />
          </div>

          {/* 3. Acción Maestra (Registrar) */}
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl bg-primary hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-30"
            disabled={cart.length === 0 || isProcessing}
            onClick={handleProcessSale}
          >
            {isProcessing ? (
                <><Loader2 size={24} className="mr-2 animate-spin" /> Procesando...</>
            ) : (
                <><CreditCard size={24} className="mr-2" /> Registrar Venta (F8)</>
            )}
          </Button>
        </div>
      </div>

      {/* SECCIÓN 3: HISTORIAL DE VENTAS */}
      <section className="mt-4">
         <InvoiceHistoryTable 
           invoices={invoices || []} 
           isLoading={loadingInvoices} 
           businessType={businessType} 
         />
      </section>
    </div>
  );
}
