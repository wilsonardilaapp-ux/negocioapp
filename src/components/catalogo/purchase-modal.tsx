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
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/app/(public)/catalog/[businessId]/page';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function PurchaseModal({ isOpen, onOpenChange, cartItems, onRemoveItem, onUpdateQuantity, businessId, businessInfo, paymentSettings }: PurchaseModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('domicilio');
  const [activePromos, setActivePromotions] = useState<Promotion[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    if (isOpen && businessId) {
        promotionService.getActivePromotions(businessId).then(promos => {
            setActivePromotions(promos.filter(p => p.showInCheckout));
        });
    }
  }, [isOpen, businessId]);

  // Set default payment method when settings load
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
  
  // Domicilio calculation
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
            toast({ title: 'Cupón aplicado', description: `Se ha aplicado un descuento de ${result.coupon.tipo === 'porcentaje' ? `${result.coupon.valor}%` : formatCurrency(result.coupon.valor)}.` });
        } else {
            toast({ variant: 'destructive', title: 'Cupón inválido', description: result.error });
            setAppliedCoupon(null);
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al validar el cupón.' });
    } finally {
        setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copiado al portapapeles' });
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data: z.infer<typeof purchaseSchema>) => {
    let orderSummary = `*Nuevo Pedido*\n\n`;
    orderSummary += `*Cliente:* ${data.fullName}\n`;
    orderSummary += `*Teléfono:* ${data.whatsapp}\n`;
    orderSummary += `*Entrega:* ${tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda'}\n`;
    if (data.address) orderSummary += `*Dirección:* ${data.address}\n`;
    
    // Add payment method info
    let methodLabel = '';
    let methodInfo = '';
    if (selectedPaymentMethod === 'nequi') {
        methodLabel = 'Nequi';
        methodInfo = `Número: ${paymentSettings?.nequi.accountNumber}`;
    } else if (selectedPaymentMethod === 'bancolombia') {
        methodLabel = 'Bancolombia';
        methodInfo = `Número: ${paymentSettings?.bancolombia.accountNumber}`;
    } else if (selectedPaymentMethod === 'daviplata') {
        methodLabel = 'Daviplata';
        methodInfo = `Número: ${paymentSettings?.daviplata.accountNumber}`;
    } else if (selectedPaymentMethod === 'breB') {
        methodLabel = 'Bre-B';
        methodInfo = `Llave: ${paymentSettings?.breB.keyValue}`;
    } else if (selectedPaymentMethod === 'pagoContraEntrega') {
        methodLabel = 'Pago contra entrega';
    }
    orderSummary += `*Medio de Pago:* ${methodLabel}\n`;
    if (methodInfo) orderSummary += `*Info Pago:* ${methodInfo}\n`;

    orderSummary += `\n*Items:*\n`;
    
    cartItems.forEach(item => {
        const price = item.appliedPromotion?.discountedPrice ?? item.price;
        orderSummary += `- ${item.quantity}x ${item.name} (${formatCurrency(price)} c/u)\n`;
    });

    orderSummary += `\n*Resumen:*\n`;
    orderSummary += `Subtotal: ${formatCurrency(subtotalProducts)}\n`;
    if (discountFromCoupon > 0 && appliedCoupon) {
        orderSummary += `Descuento Cupón (${appliedCoupon.codigo}): -${formatCurrency(discountFromCoupon)}\n`;
    }
    if (vatAmount > 0) orderSummary += `I.V.A (${vatRate}%): ${formatCurrency(vatAmount)}\n`;
    if (packagingTotal > 0) orderSummary += `Empaque: ${formatCurrency(packagingTotal)}\n`;
    if (tipoEntrega === 'domicilio' && (businessInfo?.deliveryFee ?? 0) > 0) {
        orderSummary += `Domicilio: ${formatCurrency(businessInfo?.deliveryFee ?? 0)}\n`;
    }
    orderSummary += `*TOTAL: ${formatCurrency(total)}*\n`;

    if (applicableGlobalPromo) {
        orderSummary += `\n*Promo Aplicada:* ${applicableGlobalPromo.title}`;
    }

    if (data.message) {
        orderSummary += `\n\n*Nota:* ${data.message}`;
    }

    if (appliedCoupon) {
        await couponService.incrementUsage(appliedCoupon.id);
    }

    // SANITIZACIÓN DEFINITIVA PARA PRODUCCIÓN:
    // Se eliminan TODOS los caracteres no numéricos (incluyendo espacios y el símbolo +)
    const rawPhone = String(businessInfo?.phone || '');
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    // Usar la URL de la API directa de WhatsApp para mayor compatibilidad
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(orderSummary)}`;
    
    window.open(whatsappUrl, '_blank');
    onOpenChange(false);
  };

  if (cartItems.length === 0) {
      return (
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-semibold">Tu carrito está vacío</p>
                    <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>Volver al catálogo</Button>
                </div>
            </DialogContent>
          </Dialog>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Finalizar Compra
          </DialogTitle>
          <DialogDescription>Revisa tu pedido y completa tus datos para el envío.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-6">
          {applicableGlobalPromo && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 animate-in fade-in slide-in-from-top-2">
              <Tag className="h-5 w-5" />
              <div>
                <p className="font-bold text-sm">¡Promoción Global Aplicada!</p>
                <p className="text-xs">{applicableGlobalPromo.title}: {applicableGlobalPromo.description}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-bold text-lg">Tu Pedido</h4>
            <div className="border rounded-xl divide-y bg-muted/30 overflow-hidden">
                {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white/50">
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {item.appliedPromotion && (
                                <span className="text-xs line-through text-muted-foreground">
                                    {formatCurrency(item.price)}
                                </span>
                            )}
                            <span className="text-sm font-black text-primary">
                                {formatCurrency(item.appliedPromotion?.discountedPrice ?? item.price)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg bg-white overflow-hidden shadow-sm">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-none border-r"
                                onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-none border-l"
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => onRemoveItem(item.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg flex items-center gap-2"><Ticket className="h-5 w-5" /> ¿Tienes un cupón?</h4>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input 
                        placeholder="Ingresa tu código" 
                        value={couponCode} 
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={!!appliedCoupon || isValidatingCoupon}
                        className="font-bold uppercase tracking-wider"
                    />
                    {appliedCoupon && (
                        <button 
                            onClick={handleRemoveCoupon}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {!appliedCoupon ? (
                    <Button onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode.trim()}>
                        {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                    </Button>
                ) : (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 h-10 px-4">
                        <CheckCircle className="h-4 w-4 mr-2" /> Aplicado
                    </Badge>
                )}
            </div>
          </div>

          <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-bold text-lg">Tus Datos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nombre Completo *</Label>
                        <Input {...register('fullName')} placeholder="Ej: Juan Pérez" />
                        {errors.fullName && <p className="text-[10px] text-destructive">{errors.fullName.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>WhatsApp / Teléfono *</Label>
                        <Input {...register('whatsapp')} placeholder="Ej: 300 123 4567" />
                        {errors.whatsapp && <p className="text-[10px] text-destructive">{errors.whatsapp.message}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Correo Electrónico *</Label>
                        <Input {...register('email')} type="email" placeholder="juan@ejemplo.com" />
                        {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-lg">Método de Entrega</h4>
                <RadioGroup 
                    defaultValue="domicilio" 
                    onValueChange={(val: any) => setTipoEntrega(val)}
                    className="grid grid-cols-2 gap-4"
                >
                    <Label
                        htmlFor="domicilio"
                        className={cn(
                            "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-muted/50 cursor-pointer transition-all",
                            tipoEntrega === 'domicilio' && "border-primary bg-primary/5"
                        )}
                    >
                        <RadioGroupItem value="domicilio" id="domicilio" className="sr-only" />
                        <span className="text-sm font-bold">Domicilio</span>
                    </Label>
                    <Label
                        htmlFor="tienda"
                        className={cn(
                            "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-muted/50 cursor-pointer transition-all",
                            tipoEntrega === 'recoger_en_tienda' && "border-primary bg-primary/5"
                        )}
                    >
                        <RadioGroupItem value="recoger_en_tienda" id="tienda" className="sr-only" />
                        <span className="text-sm font-bold">Recoger</span>
                    </Label>
                </RadioGroup>

                {tipoEntrega === 'domicilio' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Dirección de Entrega *</Label>
                        <Textarea {...register('address')} placeholder="Barrio, Calle, Edificio..." />
                    </div>
                )}
            </div>
          </form>

          <div className="space-y-4">
                <h4 className="font-bold text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Medio de Pago
                </h4>
                <Tabs value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="w-full">
                    <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 gap-1">
                        {paymentSettings?.nequi.enabled && (
                            <TabsTrigger value="nequi" className="flex flex-col gap-1 py-2">
                                <Smartphone className="h-4 w-4" />
                                <span className="text-[10px]">Nequi</span>
                            </TabsTrigger>
                        )}
                        {paymentSettings?.bancolombia.enabled && (
                            <TabsTrigger value="bancolombia" className="flex flex-col gap-1 py-2">
                                <Building className="h-4 w-4" />
                                <span className="text-[10px]">Bancolombia</span>
                            </TabsTrigger>
                        )}
                         {paymentSettings?.daviplata.enabled && (
                            <TabsTrigger value="daviplata" className="flex flex-col gap-1 py-2">
                                <Smartphone className="h-4 w-4" />
                                <span className="text-[10px]">Daviplata</span>
                            </TabsTrigger>
                        )}
                        {paymentSettings?.breB.enabled && (
                            <TabsTrigger value="breB" className="flex flex-col gap-1 py-2">
                                <Building className="h-4 w-4" />
                                <span className="text-[10px]">Bre-B</span>
                            </TabsTrigger>
                        )}
                        {paymentSettings?.pagoContraEntrega.enabled && (
                            <TabsTrigger value="pagoContraEntrega" className="flex flex-col gap-1 py-2">
                                <HandCoins className="h-4 w-4" />
                                <span className="text-[10px]">Efectivo</span>
                            </TabsTrigger>
                        )}
                    </TabsList>
                    
                    <div className="mt-4 p-4 bg-muted/50 rounded-xl border">
                        {selectedPaymentMethod === 'nequi' && (
                            <div className="text-center space-y-4">
                                <p className="font-bold text-sm">Transfiere a Nequi</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-xl font-black text-primary">{paymentSettings?.nequi.accountNumber}</p>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopy(paymentSettings?.nequi.accountNumber || '')}>
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">A nombre de: {paymentSettings?.nequi.holderName}</p>
                                {paymentSettings?.nequi.qrImageUrl && (
                                    <div className="relative aspect-square w-48 mx-auto border rounded-xl overflow-hidden bg-white shadow-sm">
                                        <Image src={paymentSettings.nequi.qrImageUrl} alt="QR Nequi" fill className="object-contain p-2" />
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedPaymentMethod === 'bancolombia' && (
                            <div className="text-center space-y-4">
                                <p className="font-bold text-sm">Transfiere a Bancolombia</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-xl font-black text-primary">{paymentSettings?.bancolombia.accountNumber}</p>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopy(paymentSettings?.bancolombia.accountNumber || '')}>
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">A nombre de: {paymentSettings?.bancolombia.holderName}</p>
                                {paymentSettings?.bancolombia.qrImageUrl && (
                                    <div className="relative aspect-square w-48 mx-auto border rounded-xl overflow-hidden bg-white shadow-sm">
                                        <Image src={paymentSettings.bancolombia.qrImageUrl} alt="QR Bancolombia" fill className="object-contain p-2" />
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedPaymentMethod === 'daviplata' && (
                            <div className="text-center space-y-4">
                                <p className="font-bold text-sm">Transfiere a Daviplata</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-xl font-black text-primary">{paymentSettings?.daviplata.accountNumber}</p>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopy(paymentSettings?.daviplata.accountNumber || '')}>
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">A nombre de: {paymentSettings?.daviplata.holderName}</p>
                                {paymentSettings?.daviplata.qrImageUrl && (
                                    <div className="relative aspect-square w-48 mx-auto border rounded-xl overflow-hidden bg-white shadow-sm">
                                        <Image src={paymentSettings.daviplata.qrImageUrl} alt="QR Daviplata" fill className="object-contain p-2" />
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedPaymentMethod === 'breB' && (
                            <div className="text-center space-y-4">
                                <p className="font-bold text-sm">Transfiere por Bre-B</p>
                                <p className="text-xs">Llave ({paymentSettings?.breB.keyType}):</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-xl font-black text-primary">{paymentSettings?.breB.keyValue}</p>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopy(paymentSettings?.breB.keyValue || '')}>
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {paymentSettings?.breB.qrImageUrl && (
                                    <div className="relative aspect-square w-48 mx-auto border rounded-xl overflow-hidden bg-white shadow-sm">
                                        <Image src={paymentSettings.breB.qrImageUrl} alt="QR Bre-B" fill className="object-contain p-2" />
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedPaymentMethod === 'pagoContraEntrega' && (
                            <div className="text-center space-y-2">
                                <p className="font-bold text-sm">Pago en efectivo al recibir</p>
                                <p className="text-xs text-muted-foreground">Prepara el monto exacto para agilizar la entrega.</p>
                            </div>
                        )}
                        {!selectedPaymentMethod && (
                            <p className="text-center text-sm text-muted-foreground">Selecciona un medio de pago para ver los detalles.</p>
                        )}
                    </div>
                </Tabs>
          </div>

          <div className="space-y-4 pb-6">
                <h4 className="font-bold text-lg">Nota Adicional</h4>
                <Textarea {...register('message')} placeholder="Instrucciones especiales para tu pedido..." />
          </div>
        </div>

        <div className="p-6 border-t bg-muted/20">
            <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal productos:</span>
                    <span>{formatCurrency(subtotalProducts)}</span>
                </div>
                {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600 font-bold animate-in fade-in slide-in-from-right-2">
                        <span>Descuento Cupón ({appliedCoupon.codigo}):</span>
                        <span>-{formatCurrency(discountFromCoupon)}</span>
                    </div>
                )}
                {vatRate > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">I.V.A (${vatRate}%):</span>
                        <span>{formatCurrency(vatAmount)}</span>
                    </div>
                )}
                {packagingTotal > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo de empaque:</span>
                        <span>{formatCurrency(packagingTotal)}</span>
                    </div>
                )}
                {tipoEntrega === 'domicilio' && (businessInfo?.deliveryFee ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-primary font-bold">
                        <span>Costo de domicilio:</span>
                        <span>{formatCurrency(businessInfo?.deliveryFee ?? 0)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-muted-foreground/20">
                    <span className="font-bold text-lg">Total a pagar:</span>
                    <span className="font-black text-2xl text-primary">{formatCurrency(total)}</span>
                </div>
            </div>

            <div className="flex gap-3 mb-4">
                <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 h-12 font-bold border-2" 
                    onClick={() => {
                        // Surgical clearing by removing each item
                        cartItems.forEach(item => onRemoveItem(item.id));
                        onOpenChange(false);
                        toast({ title: "Carrito vaciado" });
                    }}
                >
                    <Trash2 className="mr-2 h-5 w-5" />
                    Limpiar
                </Button>
                <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 h-12 font-bold border-2"
                    onClick={() => onOpenChange(false)}
                >
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Seguir Comprando
                </Button>
            </div>
            
            <button 
                type="submit" 
                form="purchase-form"
                className="w-full h-14 bg-primary text-white text-lg font-bold shadow-lg shadow-primary/20 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isSubmitting || !selectedPaymentMethod}
            >
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <WhatsAppIcon className="mr-2 h-5 w-5" />
                )}
                Confirmar y Enviar Pedido
            </button>
            <p className="text-[10px] text-center text-muted-foreground mt-4">
                Serás redirigido a WhatsApp para finalizar el envío de tu pedido.
            </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
