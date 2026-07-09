'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingBag, Minus, Plus, Tag, Trash2, Loader2, Ticket, X, CheckCircle, CreditCard, Building, Smartphone, Building2, HandCoins, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaymentSettings } from '@/models/payment-settings';
import type { Order, OrderItem, OrderStatus, TipoEntrega } from '@/models/order';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import type { LandingHeaderConfigData } from '@/models/landing-page';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { promotionService } from '@/services/promotion-service';
import { couponService } from '@/services/coupon-service';
import type { Promotion } from '@/models/promotion';
import type { Coupon } from '@/models/coupon';
import { WhatsAppIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import type { CartItem } from '@/models/cart';

const purchaseSchema = z.object({
  fullName: z.string().min(3, { message: 'El nombre es requerido.' }),
  email: z.string().email({ message: 'El correo electrónico no es válido.' }),
  whatsapp: z.string().min(7, { message: 'Por favor, introduce un número de WhatsApp válido.' }),
  address: z.string().optional(),
  message: z.string().optional(),
});

interface PurchaseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onClearCart: () => void;
  businessId: string;
  businessInfo: LandingHeaderConfigData['businessInfo'] | null;
  paymentSettings: PaymentSettings | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    nequi: 'Nequi',
    bancolombia: 'Bancolombia',
    daviplata: 'Daviplata',
    breB: 'Bre-B',
    pagoContraEntrega: 'Pago contra entrega',
};

export function PurchaseModal({ isOpen, onOpenChange, cartItems, onRemoveItem, onUpdateQuantity, onClearCart, businessId, businessInfo, paymentSettings }: PurchaseModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('domicilio');
  const [activePromos, setActivePromotions] = useState<Promotion[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    if (isOpen && businessId) {
        promotionService.getActivePromotions(businessId)
            .then(promos => {
                setActivePromotions(promos.filter(p => p.showInCheckout));
            })
            .catch(err => {
                console.warn("⚠️ No se pudieron cargar las promociones:", err.message);
                setActivePromotions([]);
            });
    }
  }, [isOpen, businessId]);

  useEffect(() => {
    if (paymentSettings) {
        if (paymentSettings.nequi.enabled) setSelectedPaymentMethod('nequi');
        else if (paymentSettings.bancolombia.enabled) setSelectedPaymentMethod('bancolombia');
        else if (paymentSettings.daviplata.enabled) setSelectedPaymentMethod('daviplata');
        else if (paymentSettings.breB.enabled) setSelectedPaymentMethod('breB');
        else if (paymentSettings.pagoContraEntrega.enabled) setSelectedPaymentMethod('pagoContraEntrega');
    }
  }, [paymentSettings]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof purchaseSchema>>({
    resolver: zodResolver(purchaseSchema),
  });
  
  const packagingTotal = cartItems.reduce((sum, item) => sum + ((item.packagingCost ?? 0) * item.quantity), 0);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotalProducts = useMemo(() => {
      return cartItems.reduce((sum, item) => {
          const unitPrice = item.appliedPromotion?.discountedPrice ?? item.price;
          return sum + (unitPrice * item.quantity);
      }, 0);
  }, [cartItems]);

  const applicableGlobalPromo = useMemo(() => {
    return activePromos.find(p => 
        p.applicableTo === 'order' && 
        p.minQuantity !== undefined && 
        totalQuantity >= p.minQuantity
    ) ?? null;
  }, [activePromos, totalQuantity]);

  // Cálculos de descuento
  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.tipo === 'porcentaje') {
        return subtotalProducts * (appliedCoupon.valor / 100);
    }
    return Math.min(appliedCoupon.valor, subtotalProducts);
  }, [appliedCoupon, subtotalProducts]);

  const orderDiscountAmount = useMemo(() => {
    if (!applicableGlobalPromo) return 0;
    if (applicableGlobalPromo.type === 'percentage') {
        return subtotalProducts * (applicableGlobalPromo.discountValue / 100);
    }
    if (applicableGlobalPromo.type === 'fixed') {
        return Math.min(applicableGlobalPromo.discountValue, subtotalProducts);
    }
    return 0;
  }, [applicableGlobalPromo, subtotalProducts]);

  // Selección del mejor descuento
  const { finalDiscountAmount, discountLabel } = useMemo(() => {
    if (couponDiscountAmount >= orderDiscountAmount && couponDiscountAmount > 0) {
      return { 
        finalDiscountAmount: couponDiscountAmount, 
        discountLabel: `Cupón (${appliedCoupon?.codigo})` 
      };
    } else if (orderDiscountAmount > couponDiscountAmount) {
      return { 
        finalDiscountAmount: orderDiscountAmount, 
        discountLabel: 'Descuento por cantidad' 
      };
    }
    return { finalDiscountAmount: 0, discountLabel: '' };
  }, [couponDiscountAmount, orderDiscountAmount, appliedCoupon]);

  const subtotalBeforeVat = subtotalProducts - finalDiscountAmount + packagingTotal;
  const vatRate = businessInfo?.vatRate ?? 0;
  const vatAmount = subtotalBeforeVat * (vatRate / 100);
  const deliveryFee = tipoEntrega === 'domicilio' ? (businessInfo?.deliveryFee ?? 0) : 0;
  const total = subtotalBeforeVat + vatAmount + deliveryFee;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
        const result = await couponService.validateCoupon(businessId, couponCode, subtotalProducts);
        if (result.success && result.coupon) {
            setAppliedCoupon(result.coupon);
            toast({ title: 'Cupón aplicado' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setAppliedCoupon(null);
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error' });
    } finally {
        setIsValidatingCoupon(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof purchaseSchema>) => {
    try {
        const separator = "━━━━━━━━━━━━━━━━━━━━";
        const subSeparator = "────────────────────";

        const emoScooter = "\uD83D\uDEF5"; 
        const emoStore = "\uD83C\uDFEC";   
        const emoUser = "\uD83D\uDC64";    
        const emoPhone = "\uD83D\uDCF1";   
        const emoPin = "\uD83D\uDCCD";     
        const emoCart = "\uD83D\uDED2";    
        const emoReceipt = "\uD83E\uDDFE"; 
        const emoMoneyBag = "\uD83D\uDCB0"; 
        const emoCard = "\uD83D\uDCB3";    
        const emoThanks = "\uD83D\uDE4F";  

        let orderSummary = "```\n"; // Inicio de bloque monoespaciado

        if (tipoEntrega === 'domicilio') {
            orderSummary += `${emoScooter} NUEVO PEDIDO A DOMICILIO\n`;
        } else {
            orderSummary += `${emoStore} NUEVO PEDIDO PARA RECOGER EN TIENDA\n`;
        }

        orderSummary += `${separator}\n`;
        orderSummary += `${emoUser} Cliente: ${data.fullName}\n`;
        orderSummary += `${emoPhone} WhatsApp: ${data.whatsapp}\n`;

        if (tipoEntrega === 'domicilio') {
            orderSummary += `${emoPin} Dirección: ${data.address || 'No especificada'}\n`;
        }

        orderSummary += `${separator}\n`;
        orderSummary += `${emoCart} PRODUCTOS\n`;

        const ordersCollectionRef = collection(firestore, `businesses/${businessId}/orders`);
        const now = new Date().toISOString();

        let totalPromoSavings = 0;

        // 1. Mapear cartItems a OrderItem[] para el guardado único
        const orderItems: OrderItem[] = cartItems.map(item => {
            const itemUnitPrice = item.appliedPromotion?.discountedPrice ?? item.price;
            const itemSubtotal = itemUnitPrice * item.quantity;
            
            let itemPriceText = formatCurrency(itemUnitPrice);
            if (item.appliedPromotion) {
                const orig = item.appliedPromotion.originalPrice;
                const disc = item.appliedPromotion.discountedPrice;
                const perc = Math.round((1 - disc / orig) * 100);
                itemPriceText = `~${formatCurrency(orig)}~ ${formatCurrency(disc)} (-${perc}%)`;
                totalPromoSavings += (orig - disc) * item.quantity;
            }

            orderSummary += `- ${item.quantity} \u00D7 ${item.name}\n  ${itemPriceText.padStart(12)}\n`;

            return {
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: itemUnitPrice,
            subtotal: itemSubtotal,
            appliedPromotion: item.appliedPromotion || undefined,
            };
        });

        // 2. Guardar UN solo documento por pedido con todos los ítems y totales
        const orderData = {
            businessId,
            customerName: data.fullName,
            customerEmail: data.email,
            customerPhone: data.whatsapp,
            customerAddress: tipoEntrega === 'domicilio' ? (data.address || '') : 'Recogida en tienda',
            items: orderItems,
            subtotal: subtotalProducts,
            discountAmount: finalDiscountAmount,
            discountLabel: discountLabel,
            packagingCost: packagingTotal,
            deliveryFee: deliveryFee,
            vatAmount: vatAmount,
            total: total,
            paymentMethod: selectedPaymentMethod || 'pagoContraEntrega',
            orderDate: now,
            orderStatus: 'Pendiente' as OrderStatus,
            tipoEntrega,
        };

        // LIMPIEZA CRÍTICA: Eliminar undefined para evitar errores de Firestore
        const cleanOrderData = JSON.parse(JSON.stringify(orderData));

        await addDocumentNonBlocking(ordersCollectionRef, cleanOrderData);

        const paymentLabel = PAYMENT_METHOD_LABELS[selectedPaymentMethod] ?? selectedPaymentMethod;
        
        orderSummary += `${separator}\n`;
        orderSummary += `${emoReceipt} RESUMEN DE LA COMPRA\n`;
        orderSummary += `Subtotal:      ${formatCurrency(subtotalProducts).padStart(12)}\n`;

        if (finalDiscountAmount > 0) {
            orderSummary += `${(discountLabel + ':').padEnd(14)}-${formatCurrency(finalDiscountAmount).padStart(12)}\n`;
        }

        if (totalPromoSavings > 0) {
            orderSummary += `🎉 Ahorraste:   ${formatCurrency(totalPromoSavings).padStart(12)}\n`;
        }

        if (packagingTotal > 0) {
            orderSummary += `Empaque:       ${formatCurrency(packagingTotal).padStart(12)}\n`;
        }

        orderSummary += `Envío:         ${tipoEntrega === 'domicilio' ? formatCurrency(deliveryFee).padStart(12) : 'Gratis'.padStart(12)}\n`;

        if (vatAmount > 0) {
            orderSummary += `IVA (${businessInfo?.vatRate}%):     ${formatCurrency(vatAmount).padStart(12)}\n`;
        }

        orderSummary += `${subSeparator}\n`;
        orderSummary += `${emoMoneyBag} TOTAL:      ${formatCurrency(total).padStart(12)}\n`;
        orderSummary += `${emoCard} Método de pago:\n${paymentLabel}\n`;
        orderSummary += `${separator}\n`;

        const finalStatusMsg = tipoEntrega === 'domicilio' 
            ? "Tu pedido será preparado y enviado lo antes posible." 
            : "Tu pedido estará listo para recoger en tienda muy pronto.";

        orderSummary += `${emoThanks} Gracias por tu compra.\n${finalStatusMsg}\n` + "```";

        const cleanPhone = normalizePhoneNumber(businessInfo?.phone || '3228831634');
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(orderSummary)}`, '_blank');
        
        onClearCart();
        onOpenChange(false);
    } catch (error: any) {
        console.error("Error al procesar el pedido:", error);
        toast({
            variant: "destructive",
            title: "Error al enviar pedido",
            description: error.message || "Ocurrió un problema al guardar tu pedido. Por favor intenta de nuevo."
        });
    }
  };

  if (cartItems.length === 0) {
      return (
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-semibold">Tu carrito está vacío</p>
                    <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>Volver</Button>
                </div>
            </DialogContent>
          </Dialog>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 text-foreground">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ShoppingBag className="h-6 v-6" />
            Finalizar Compra
          </DialogTitle>
          <DialogDescription>Revisa tu pedido y completa tus datos.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-6">
          {applicableGlobalPromo && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <Tag className="h-5 w-5" />
              <p className="font-bold text-sm">Promo: {applicableGlobalPromo.title}</p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-bold text-lg">Tu Pedido</h4>
            <div className="border rounded-xl divide-y bg-muted/30 overflow-hidden">
                {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white/50">
                    <div className="flex items-center flex-1 min-w-0 gap-4">
                        <div className="relative h-14 w-14 rounded-lg border bg-white overflow-hidden shrink-0">
                            <Image src={item.images?.[0] || ''} alt={item.name} fill sizes="3.5rem" className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{item.name}</p>
                            <span className="text-sm font-black text-primary">{formatCurrency(item.appliedPromotion?.discountedPrice ?? item.price)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4 w-[140px] justify-end">
                        <div className="flex items-center border rounded-lg bg-white overflow-hidden shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}><Minus className="h-3 w-3" /></Button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => onRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
                ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg">Cupón</h4>
            <div className="flex gap-2">
                <Input placeholder="Código" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} disabled={!!appliedCoupon} />
                {!appliedCoupon ? <Button onClick={handleApplyCoupon} disabled={isValidatingCoupon}>Aplicar</Button> : <Badge variant="outline" className="h-10 px-4">Listo</Badge>}
            </div>
          </div>

          <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nombre *</Label><Input {...register('fullName')} /></div>
                <div className="space-y-2"><Label>WhatsApp *</Label><Input {...register('whatsapp')} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Correo *</Label><Input {...register('email')} type="email" /></div>
            </div>
            <div className="space-y-4">
                <Label>Entrega</Label>
                <RadioGroup defaultValue="domicilio" onValueChange={(val: any) => setTipoEntrega(val)} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="domicilio" className={cn("flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer", tipoEntrega === 'domicilio' && "border-primary bg-primary/5")}>
                        <RadioGroupItem value="domicilio" id="domicilio" className="sr-only" />
                        <span className="text-sm font-bold">Domicilio</span>
                    </Label>
                    <Label htmlFor="tienda" className={cn("flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer", tipoEntrega === 'recoger_en_tienda' && "border-primary bg-primary/5")}>
                        <RadioGroupItem value="recoger_en_tienda" id="tienda" className="sr-only" />
                        <span className="text-sm font-bold">Recoger</span>
                    </Label>
                </RadioGroup>
                {tipoEntrega === 'domicilio' && <div className="space-y-2"><Label>Dirección *</Label><Textarea {...register('address')} /></div>}
            </div>

            {/* SECTOR DE MÉTODO DE PAGO */}
            <div className="space-y-4">
                <h4 className="font-bold text-lg">Método de Pago</h4>
                <RadioGroup
                    value={selectedPaymentMethod}
                    onValueChange={setSelectedPaymentMethod}
                    className="grid grid-cols-1 gap-2"
                >
                    {paymentSettings?.nequi?.enabled && (
                        <Label htmlFor="pay-nequi" className={cn("flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all", selectedPaymentMethod === 'nequi' ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="nequi" id="pay-nequi" />
                                <Smartphone className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Nequi</span>
                            </div>
                        </Label>
                    )}
                    {paymentSettings?.bancolombia?.enabled && (
                        <Label htmlFor="pay-bancolombia" className={cn("flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all", selectedPaymentMethod === 'bancolombia' ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="bancolombia" id="pay-bancolombia" />
                                <Building className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Bancolombia</span>
                            </div>
                        </Label>
                    )}
                    {paymentSettings?.daviplata?.enabled && (
                        <Label htmlFor="pay-daviplata" className={cn("flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all", selectedPaymentMethod === 'daviplata' ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="daviplata" id="pay-daviplata" />
                                <Smartphone className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Daviplata</span>
                            </div>
                        </Label>
                    )}
                    {paymentSettings?.breB?.enabled && (
                        <Label htmlFor="pay-breb" className={cn("flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all", selectedPaymentMethod === 'breB' ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="breB" id="pay-breb" />
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Bre-B</span>
                            </div>
                        </Label>
                    )}
                    {paymentSettings?.pagoContraEntrega?.enabled && (
                        <Label htmlFor="pay-cod" className={cn("flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all", selectedPaymentMethod === 'pagoContraEntrega' ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="pagoContraEntrega" id="pay-cod" />
                                <HandCoins className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Pago contra entrega</span>
                            </div>
                        </Label>
                    )}
                </RadioGroup>

                {/* BLOQUE DE DETALLES DE CUENTA */}
                {selectedPaymentMethod && selectedPaymentMethod !== 'pagoContraEntrega' && (
                    <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed border-muted space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {(() => {
                            const methodData = selectedPaymentMethod === 'breB' 
                                ? paymentSettings?.breB 
                                : (paymentSettings as any)?.[selectedPaymentMethod];
                            
                            if (!methodData) return null;

                            const numberValue = selectedPaymentMethod === 'breB' ? methodData.keyValue : methodData.accountNumber;
                            const numberLabel = selectedPaymentMethod === 'breB' ? methodData.keyType : 'Número';

                            return (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Titular</Label>
                                            <p className="text-sm font-bold text-gray-900 truncate">{methodData.holderName || 'No especificado'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{numberLabel || 'Cuenta'}</Label>
                                            <p className="text-sm font-bold text-gray-900 truncate">{numberValue || 'No especificado'}</p>
                                        </div>
                                    </div>

                                    {methodData.qrImageUrl && (
                                        <div className="flex flex-col items-center gap-2 pt-2 border-t border-muted">
                                            <div className="relative h-44 w-44 bg-white p-2 rounded-lg border shadow-sm">
                                                <Image 
                                                    src={methodData.qrImageUrl} 
                                                    alt={`QR de Pago ${selectedPaymentMethod}`} 
                                                    fill 
                                                    className="object-contain" 
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Escanea para pagar</span>
                                        </div>
                                    )}

                                    {methodData.instructions && (
                                        <div className="pt-2 border-t border-muted">
                                            <p className="text-[11px] text-muted-foreground italic leading-tight">
                                                {methodData.instructions}
                                            </p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            <div className="space-y-4 pb-6">
                <h4 className="font-bold text-lg">Nota Adicional</h4>
                <Textarea {...register('message')} placeholder="Instrucciones..." />
            </div>
          </form>
        </div>

        <div className="p-6 border-t bg-muted/20">
            <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotalProducts)}</span>
                </div>
                
                {finalDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>{discountLabel}:</span>
                        <span>-{formatCurrency(finalDiscountAmount)}</span>
                    </div>
                )}

                {packagingTotal > 0 && (
                    <div className="flex justify-between text-sm">
                        <span>Empaque:</span>
                        <span>{formatCurrency(packagingTotal)}</span>
                    </div>
                )}

                <div className="flex justify-between text-sm">
                    <span>Envío:</span>
                    <span>
                        {tipoEntrega === 'domicilio' 
                            ? (deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Gratis')
                            : 'Gratis (recoger en tienda)'}
                    </span>
                </div>

                {vatAmount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>IVA ({vatRate}%):</span>
                        <span>{formatCurrency(vatAmount)}</span>
                    </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t font-black text-2xl text-primary">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
            <button type="submit" form="purchase-form" className="w-full h-14 bg-primary text-white text-lg font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <WhatsAppIcon className="h-4 v-4" />}
                Confirmar y Enviar Pedido
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}