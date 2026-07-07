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
import { ShoppingBag, Minus, Plus, Tag, Trash2, Loader2, Ticket, X, CheckCircle, CreditCard, Building, Smartphone, HandCoins, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaymentSettings } from '@/models/payment-settings';
import type { TipoEntrega } from '@/models/order';
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof purchaseSchema>>({
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

  const discountFromCoupon = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.tipo === 'porcentaje') {
        return subtotalProducts * (appliedCoupon.valor / 100);
    }
    return Math.min(appliedCoupon.valor, subtotalProducts);
  }, [appliedCoupon, subtotalProducts]);

  const subtotalAfterCoupon = subtotalProducts - discountFromCoupon;
  const subtotalBeforeVat = subtotalAfterCoupon + packagingTotal;
  const vatRate = businessInfo?.vatRate ?? 0;
  const vatAmount = subtotalBeforeVat * (vatRate / 100);
  const deliveryFee = tipoEntrega === 'domicilio' ? (businessInfo?.deliveryFee ?? 0) : 0;
  const total = subtotalBeforeVat + vatAmount + deliveryFee;

  const applicableGlobalPromo = activePromos.find(p => 
      p.applicableTo === 'order' && 
      p.minQuantity !== undefined && 
      totalQuantity >= p.minQuantity
  ) ?? null;

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
    const separator = "━━━━━━━━━━━━━━━━━━";
    let orderSummary = `🛵 *PEDIDO A DOMICILIO*\n${separator}\n`;
    orderSummary += `👤 Cliente: ${data.fullName}\n📞 WhatsApp: ${data.whatsapp}\n🏠 Dir: ${data.address || 'Tienda'}\n${separator}\n`;
    
    const ordersCollectionRef = collection(firestore, `businesses/${businessId}/orders`);
    const now = new Date().toISOString();

    cartItems.forEach(item => {
        const itemUnitPrice = item.appliedPromotion?.discountedPrice ?? item.price;
        const itemSubtotal = itemUnitPrice * item.quantity;
        orderSummary += `• ${item.quantity}x ${item.name} - ${formatCurrency(itemSubtotal)}\n`;

        addDocumentNonBlocking(ordersCollectionRef, {
            businessId,
            customerName: data.fullName,
            customerEmail: data.email,
            customerPhone: data.whatsapp,
            customerAddress: data.address || 'Recogida',
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: itemUnitPrice,
            subtotal: itemSubtotal,
            paymentMethod: selectedPaymentMethod,
            orderDate: now,
            orderStatus: 'Pendiente',
            tipoEntrega,
            packagingCost: item.packagingCost || 0,
        });
    });
    
    orderSummary += `${separator}\n💵 *TOTAL: ${formatCurrency(total)}*\n💳 Pago: ${selectedPaymentMethod}`;

    const cleanPhone = normalizePhoneNumber(businessInfo?.phone || '3228831634');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderSummary)}`, '_blank');
    
    onClearCart();
    onOpenChange(false);
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
            <ShoppingBag className="h-6 w-6" />
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
                    <div className="flex items-center flex-1 gap-4">
                        <div className="relative h-14 w-14 rounded-lg border bg-white overflow-hidden">
                            <Image src={item.images?.[0] || ''} alt={item.name} fill sizes="3.5rem" className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{item.name}</p>
                            <span className="text-sm font-black text-primary">{formatCurrency(item.appliedPromotion?.discountedPrice ?? item.price)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg bg-white overflow-hidden">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}><Minus className="h-3 w-3" /></Button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
          </form>

          <div className="space-y-4 pb-6">
            <h4 className="font-bold text-lg">Nota Adicional</h4>
            <Textarea {...register('message')} placeholder="Instrucciones..." />
          </div>
        </div>

        <div className="p-6 border-t bg-muted/20">
            <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotalProducts)}</span>
                </div>
                
                {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>Cupón ({appliedCoupon.codigo}):</span>
                        <span>-{formatCurrency(discountFromCoupon)}</span>
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
                {isSubmitting ? <Loader2 className="animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
                Confirmar y Enviar Pedido
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}