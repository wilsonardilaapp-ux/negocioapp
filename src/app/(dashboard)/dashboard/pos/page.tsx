'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { registerPOSTracking } from '@/services/billing/tracking-service';
import { useSearchParams } from 'next/navigation';

/**
 * @fileOverview Página principal de la Terminal de Facturación (POS).
 * Orquestador central del módulo POS con flujo operativo optimizado y blindaje de errores de runtime.
 */
export default function POSPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // 1. Obtener contexto del negocio y productos con guardias estrictas (Anti TypeError reading '1')
  const businessRef = useMemoFirebase(
    () => {
      if (!firestore || !user?.uid) return null;
      return doc(firestore, 'businesses', user.uid);
    },
    [user?.uid, firestore]
  );
  const { data: business, isLoading: loadingBusiness } = useDoc<Business>(businessRef);

  const productsQuery = useMemoFirebase(
    () => {
      if (!firestore || !user?.uid) return null;
      return collection(firestore, `businesses/${user.uid}/products`);
    },
    [user?.uid, firestore]
  );
  const { data: products, isLoading: loadingProducts } = useCollection<Product>(productsQuery);

  const invoicesQuery = useMemoFirebase(
    () => {
      if (!firestore || !user?.uid) return null;
      return collection(firestore, `businesses/${user.uid}/invoices`);
    },
    [user?.uid, firestore]
  );
  const { data: invoices, isLoading: loadingInvoices } = useCollection<Invoice>(invoicesQuery);

  // 2. Estado local del carrito y datos de cliente
  const [cart, setCart] = useState<POSItem[]>([]);
  const [customerName, setCustomerName] = useState('Cliente General');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Variables Financieras
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(19); 
  const [tipValue, setTipValue] = useState(0);
  const [tipType, setTipType] = useState<DiscountType>('amount');
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [cashReceived, setCashReceived] = useState(0);

  const businessType = (business?.category || 'Retail') as VerticalType;

  // --- LÓGICA DE MESA (EXTRACCIÓN BLINDADA CON VALIDACIÓN DE LONGITUD) ---
  const orderOrigin = searchParams?.get('ref') || 'web';
  const mesaNumber = useMemo(() => {
    const match = orderOrigin?.match(/mesa-(.+)/);
    return (match && match.length > 1) ? match[1] : null;
  }, [orderOrigin]);

  // 3. Motor de Cálculos Reactivos (Fórmulas Blindadas de Base Gravable Única)
  const financialSummary = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    const calculatedDiscount = discountType === 'percent' 
      ? (subtotal * (discountValue / 100)) 
      : discountValue;

    const baseTaxable = Math.max(0, subtotal - calculatedDiscount);

    const calculatedTax = baseTaxable * (taxRate / 100);
    
    const calculatedTip = tipType === 'percent'
      ? (baseTaxable * (tipValue / 100))
      : tipValue;

    const totalFinal = baseTaxable + calculatedTax + calculatedTip;
    const change = Math.max(0, cashReceived - totalFinal);

    return {
      subtotal,
      discount: Math.round(calculatedDiscount),
      tax: Math.round(calculatedTax),
      tip: Math.round(calculatedTip),
      total: Math.round(totalFinal),
      change
    };
  }, [cart, discountType, discountValue, taxRate, tipValue, tipType, cashReceived]);

  // 4. Handlers de Carrito
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
                customer: { 
                  name: customerName,
                  phone: customerPhone 
                },
                items: cart,
                subtotal: financialSummary.subtotal,
                tax: financialSummary.tax,
                discount: financialSummary.discount,
                tip: financialSummary.tip,
                total: financialSummary.total,
                paymentMethod: paymentMethod as any,
                cashReceived,
                changeAmount: financialSummary.change,
                mesa: mesaNumber || undefined,
            },
            businessType
        );

        // FASE 1: REGISTRO DE RASTREO INTELIGENTE (Asíncrono y No Bloqueante)
        const synthesizedInvoice: Invoice = {
            id: result.invoiceId,
            consecutiveNumber: result.consecutiveStr,
            businessId: user.uid,
            vendedorId: user.uid,
            customer: { name: customerName, phone: customerPhone },
            items: cart,
            subtotal: financialSummary.subtotal,
            tax: financialSummary.tax,
            discount: financialSummary.discount,
            tip: financialSummary.tip,
            total: financialSummary.total,
            paymentMethod: paymentMethod as any,
            cashReceived,
            changeAmount: financialSummary.change,
            createdAt: new Date().toISOString(),
            status: 'completada'
        };

        registerPOSTracking(firestore, user.uid, synthesizedInvoice, profile?.name || null);

        toast({
            title: "✅ Venta exitosa",
            description: `Factura ${result.consecutiveStr} registrada correctamente.`,
        });

        // Limpiar estados
        setCart([]);
        setCustomerName('Cliente General');
        setCustomerPhone('');
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

  // Atajo de teclado F8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F8') {
            e.preventDefault();
            if (cart.length > 0 && !isProcessing) {
                handleProcessSale();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isProcessing, handleProcessSale]);

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
                <p className="text-xs font-bold text-slate-700">{profile?.name || user?.email}</p>
            </div>
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto">
        <div className="lg:col-span-7 xl:col-span-8 overflow-hidden">
          <ProductCatalog 
            products={products || []} 
            onAddToCart={handleAddToCart}
            isLoading={loadingProducts}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 overflow-hidden">
          <div className="overflow-hidden">
            <InvoiceCart 
              items={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              businessType={businessType}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              
              // Financial Control
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
          
          <div className="shrink-0">
             <CashControl 
               total={financialSummary.total} 
               cashReceived={cashReceived}
               onCashChange={setCashReceived}
             />
          </div>

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
