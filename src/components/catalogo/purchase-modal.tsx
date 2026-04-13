
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, Building2, HandCoins, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { PaymentSettings } from '@/models/payment-settings';
import type { Order, TipoEntrega } from '@/models/order';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/app/(public)/catalog/[businessId]/page';
import { ScrollArea } from '../ui/scroll-area';
import type { LandingHeaderConfigData } from '@/models/landing-page';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


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

const paymentMethodsConfig = {
    nequi: { label: "Nequi", icon: "/iconos/nequi.png" },
    bancolombia: { label: "Bancolombia", icon: "/iconos/bancolombia.png" },
    daviplata: { label: "Daviplata", icon: "/iconos/daviplata.png" },
    breB: { label: "Bre-B", icon: <Building2 className="h-6 w-6" /> },
    pagoContraEntrega: { label: "Contra Entrega", icon: <HandCoins className="h-6 w-6" /> },
};

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
  
  const availableMethods = Object.entries(paymentMethodsConfig)
        .map(([key, config]) => {
            const setting = paymentSettings?.[key as keyof PaymentSettings];
            const enabled = setting && typeof setting === 'object' && 'enabled' in setting 
                ? setting.enabled 
                : false;
            return {
                key,
                ...config,
                enabled
            };
        })
        .filter(method => method.enabled);

  const defaultTab = availableMethods.length > 0 ? availableMethods[0].key : "";
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(defaultTab);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof purchaseSchema>>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      address: "",
      message: "",
      fullName: "",
      email: "",
      whatsapp: "",
    },
  });
  
  const packagingTotal = cartItems.reduce((sum, item) => sum + ((item.packagingCost ?? 0) * item.quantity), 0);
  const subtotalProducts = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalBeforeVat = subtotalProducts + packagingTotal;
  const vatRate = businessInfo?.vatRate ?? 0;
  const vatAmount = subtotalBeforeVat * (vatRate / 100);
  const deliveryFee = businessInfo?.deliveryFee ?? 0;
  const costoEntrega = tipoEntrega === 'domicilio' ? deliveryFee : 0;
  const total = subtotalBeforeVat + vatAmount + costoEntrega;

  useEffect(() => {
    // Reset selected tab when modal opens or available methods change
    if (isOpen) {
      setSelectedPaymentMethod(defaultTab);
      // Reset delivery type to default when modal opens
      setTipoEntrega(deliveryFee > 0 ? 'domicilio' : 'recoger_en_tienda');
    }
  }, [isOpen, defaultTab, deliveryFee]);

  const onSubmit = (data: z.infer<typeof purchaseSchema>) => {
    if (tipoEntrega === 'domicilio' && !data.address) {
        toast({
            variant: "destructive",
            title: "Dirección requerida",
            description: "Por favor, introduce una dirección de envío para el domicilio.",
        });
        return;
    }

    if (firestore && businessId) {
        cartItems.forEach(item => {
            const paymentMethodLabels: { [key: string]: string } = {
                nequi: 'Nequi',
                bancolombia: 'Bancolombia',
                daviplata: 'Daviplata',
                breB: 'Bre-B',
                pagoContraEntrega: 'Pago Contra Entrega'
            };
            const paymentMethodText = paymentMethodLabels[selectedPaymentMethod] || 'No especificado';
    
            const orderData: Omit<Order, 'id'> = {
                businessId: businessId,
                customerName: data.fullName,
                customerEmail: data.email,
                customerPhone: data.whatsapp,
                customerAddress: tipoEntrega === 'domicilio' ? (data.address || 'No especificada') : 'Recoge en tienda',
                productId: item.id,
                productName: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                subtotal: item.price * item.quantity,
                paymentMethod: paymentMethodText,
                orderDate: new Date().toISOString(),
                orderStatus: 'Pendiente',
                packagingCost: item.packagingCost ?? 0,
                tipoEntrega: tipoEntrega,
            };
    
            const ordersCollection = collection(firestore, 'businesses', businessId, 'orders');
            addDocumentNonBlocking(ordersCollection, orderData);
        });

      toast({
          title: "¡Pedido Registrado!",
          description: "Tu pedido ha sido enviado al vendedor y guardado. Serás redirigido a WhatsApp.",
      });
    } else {
        toast({
            title: "Pedido listo para enviar",
            description: "Serás redirigido a WhatsApp para completar tu pedido.",
        });
    }

    const businessPhone = businessInfo?.phone || '';
    const paymentMethodText = selectedPaymentMethod === 'pagoContraEntrega' ? 'Pago Contra Entrega' : selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1);
    
    let messageBody = `¡Hola! 👋 Estoy interesado en realizar un pedido:\n\n`;
    messageBody += `*TIPO DE ENTREGA: ${tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en Tienda'}*\n\n`;
    cartItems.forEach(item => {
        messageBody += `*Producto:* ${item.name}\n`;
        messageBody += `*Cantidad:* ${item.quantity}\n`;
        messageBody += `*Subtotal:* ${formatCurrency(item.price * item.quantity)}\n\n`;
    });
    
    if (packagingTotal > 0) {
      messageBody += `*Empaque:* ${formatCurrency(packagingTotal)}\n`;
    }

    messageBody += `\n*Subtotal (antes de IVA): ${formatCurrency(subtotalBeforeVat)}*\n`;
    
    if (vatRate > 0) {
        messageBody += `*IVA (${vatRate}%):* ${formatCurrency(vatAmount)}\n`;
    }

    if (costoEntrega > 0) {
      messageBody += `*Domicilio:* ${formatCurrency(costoEntrega)}\n`;
    }

    messageBody += `*TOTAL DEL PEDIDO: ${formatCurrency(total)}*\n\n`;
    messageBody += `*Mis Datos:*\n`;
    messageBody += `*Nombre:* ${data.fullName}\n`;
    messageBody += `*Email:* ${data.email}\n`;
    messageBody += `*WhatsApp:* ${data.whatsapp}\n`;
    if (tipoEntrega === 'domicilio' && data.address) messageBody += `*Dirección:* ${data.address}\n`;
    messageBody += `*Método de pago elegido:* ${paymentMethodText}\n\n`;
    if (data.message) messageBody += `*Mensaje adicional:* ${data.message}\n`;
    messageBody += `¡Quedo atento a la confirmación! 👍`;

    const whatsappUrl = `https://wa.me/${businessPhone.replace(/\D/g, '')}?text=${encodeURIComponent(messageBody)}`;
    window.open(whatsappUrl, '_blank');

    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado', description: 'El número ha sido copiado al portapapeles.' });
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Realizar Pedido</DialogTitle>
          <DialogDescription>Completa el formulario para enviar tu pedido y consulta las opciones de pago.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2">
          <div className="grid md:grid-cols-2 gap-8 py-4">
            {/* Columna del Formulario */}
            <div className="space-y-4">
                <Card>
                    <CardContent className="p-4 space-y-3">
                         <ScrollArea className="max-h-[220px]">
                            {cartItems.map(item => (
                                 <div key={item.id} className="flex items-center gap-4 py-2 border-b last:border-b-0">
                                    <div className="relative aspect-square w-16 h-16 rounded-md overflow-hidden shrink-0">
                                        <Image src={item.images[0] || 'https://picsum.photos/seed/product/200'} alt={item.name} fill sizes="4rem" className="object-cover"/>
                                    </div>
                                    <div className="flex-grow space-y-1">
                                        <h4 className="font-semibold text-sm leading-tight">{item.name}</h4>
                                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} c/u</p>
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                     <div className="text-right font-semibold text-sm">
                                        {formatCurrency(item.price * item.quantity)}
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>
                    </CardContent>
                  <div className="p-4 bg-muted border-t space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal productos:</span>
                      <span>{formatCurrency(subtotalProducts)}</span>
                    </div>
                    {packagingTotal > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Empaque:</span>
                        <span>{formatCurrency(packagingTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotalBeforeVat)}</span>
                    </div>
                    {vatRate > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                          <span>IVA ({vatRate}%):</span>
                          <span>{formatCurrency(vatAmount)}</span>
                      </div>
                    )}
                    <RadioGroup value={tipoEntrega} onValueChange={(v) => setTipoEntrega(v as TipoEntrega)} className="my-3 space-y-2">
                        <Label htmlFor="recoger_en_tienda" className={cn("flex items-center justify-between gap-4 rounded-lg border bg-background p-3 cursor-pointer", tipoEntrega === 'recoger_en_tienda' && 'border-primary ring-2 ring-primary')}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="recoger_en_tienda" id="recoger_en_tienda" />
                                <div>
                                    <p className="font-medium text-sm">Recoger en tienda</p>
                                    <p className="text-xs text-muted-foreground">Sin costo adicional</p>
                                </div>
                            </div>
                            <span className="font-semibold text-sm">$0</span>
                        </Label>
                        {deliveryFee > 0 && (
                           <Label htmlFor="domicilio" className={cn("flex items-center justify-between gap-4 rounded-lg border bg-background p-3 cursor-pointer", tipoEntrega === 'domicilio' && 'border-primary ring-2 ring-primary')}>
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="domicilio" id="domicilio" />
                                    <div>
                                        <p className="font-medium text-sm">Domicilio</p>
                                        <p className="text-xs text-muted-foreground">Envío a tu dirección</p>
                                    </div>
                                </div>
                                <span className="font-semibold text-sm">{formatCurrency(deliveryFee)}</span>
                            </Label>
                        )}
                    </RadioGroup>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold text-lg">Total:</span>
                      <span className="text-xl font-bold">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </Card>

              <h3 className="font-semibold text-lg">1. Completa tus datos</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input id="fullName" {...register('fullName')} />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="whatsapp">Número de WhatsApp</Label>
                  <Input id="whatsapp" type="tel" {...register('whatsapp')} placeholder="ej. 3001234567" />
                  {errors.whatsapp && <p className="text-sm text-destructive mt-1">{errors.whatsapp.message}</p>}
                </div>
                {tipoEntrega === 'domicilio' && (
                    <div>
                      <Label htmlFor="address">Dirección de envío</Label>
                      <Input id="address" {...register('address')} placeholder="Tu dirección de envío" />
                    </div>
                )}
                <div>
                  <Label htmlFor="message">Mensaje Adicional</Label>
                  <Textarea id="message" {...register('message')} placeholder="Instrucciones especiales, etc." />
                </div>
              </div>
            </div>

            {/* Columna de Pagos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">2. Realiza el pago</h3>
              {availableMethods.length > 0 ? (
                <Tabs defaultValue={defaultTab} value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="w-full">
                  <TabsList className="grid grid-cols-2 gap-3 mb-4 h-auto bg-transparent p-0">
                    {availableMethods.map((method) => (
                      <TabsTrigger
                        key={method.key}
                        value={method.key}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 h-auto border rounded-lg transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                          "bg-background text-foreground hover:bg-accent"
                        )}
                      >
                         {typeof method.icon === 'string' ? (
                            <Image src={method.icon} alt={method.label} width={24} height={24} className="object-contain" />
                         ) : (
                            method.icon
                         )}
                        <span className="text-sm font-medium">{method.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {paymentSettings?.nequi?.enabled && (
                      <TabsContent value="nequi">
                          <PaymentTabContent
                              methodName="Nequi"
                              accountNumber={paymentSettings.nequi.accountNumber}
                              qrImageUrl={paymentSettings.nequi.qrImageUrl ?? null}
                              onCopy={copyToClipboard}
                          />
                      </TabsContent>
                  )}
                  {paymentSettings?.bancolombia?.enabled && (
                      <TabsContent value="bancolombia">
                          <PaymentTabContent
                              methodName="Bancolombia"
                              accountNumber={paymentSettings.bancolombia.accountNumber}
                              qrImageUrl={paymentSettings.bancolombia.qrImageUrl ?? null}
                              onCopy={copyToClipboard}
                          />
                      </TabsContent>
                  )}
                  {paymentSettings?.daviplata?.enabled && (
                      <TabsContent value="daviplata">
                          <PaymentTabContent
                              methodName="Daviplata"
                              accountNumber={paymentSettings.daviplata.accountNumber}
                              qrImageUrl={paymentSettings.daviplata.qrImageUrl ?? null}
                              onCopy={copyToClipboard}
                          />
                      </TabsContent>
                  )}
                  {paymentSettings?.breB?.enabled && (
                    <TabsContent value="breB">
                        <BreBPaymentTabContent
                            data={paymentSettings.breB}
                            onCopy={copyToClipboard}
                        />
                    </TabsContent>
                  )}
                  {paymentSettings?.pagoContraEntrega?.enabled && (
                    <TabsContent value="pagoContraEntrega">
                      <div className="mt-4 space-y-4 text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Pagarás el pedido cuando lo recibas. Asegúrate de tener el monto exacto.</p>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">El vendedor no ha configurado métodos de pago.</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 sticky bottom-0 bg-background pb-4">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Seguir Comprando
              </Button>
             <Button type="submit" disabled={isSubmitting}>
                <ShoppingBag className="mr-2 h-5 w-5" />
                {isSubmitting ? 'Enviando Pedido...' : 'Confirmar y Enviar Pedido'}
              </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PaymentTabContent = ({methodName, accountNumber, qrImageUrl, onCopy }: { methodName: string, accountNumber: string, qrImageUrl: string | null, onCopy: (text: string) => void }) => (
    <div className="mt-4 space-y-4 text-center p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Escanea el QR o copia el número para pagar con {methodName}.</p>
        {qrImageUrl && (
             <div className="relative aspect-square w-48 mx-auto">
                <Image src={qrImageUrl} alt={`QR ${methodName}`} fill sizes="12rem" className="rounded-md object-contain" />
            </div>
        )}
        {accountNumber && (
            <div className="space-y-1">
                <p className="font-semibold">{accountNumber}</p>
                <Button variant="outline" size="sm" onClick={() => onCopy(accountNumber)}>Copiar número</Button>
            </div>
        )}
    </div>
);

const BreBPaymentTabContent = ({ data, onCopy }: { data: PaymentSettings['breB'], onCopy: (text: string) => void }) => (
    <div className="mt-4 space-y-4 text-center p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Usa el código QR o los datos de la llave para pagar con Bre-B.</p>
        
        {data.qrImageUrl && (
            <div className="relative aspect-square w-48 mx-auto">
                <Image src={data.qrImageUrl} alt="QR Bre-B" fill sizes="12rem" className="rounded-md object-contain" />
            </div>
        )}
        
        <div className="space-y-2 text-left bg-muted/50 p-3 rounded-md">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Titular:</span>
                <span className="text-sm">{data.holderName}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Llave ({data.keyType}):</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{data.keyValue}</span>
                    <Button variant="outline" size="sm" onClick={() => onCopy(data.keyValue)}>Copiar</Button>
                </div>
            </div>
             {data.commerceCode && (
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cód. Comercio:</span>
                    <span className="text-sm">{data.commerceCode}</span>
                </div>
             )}
        </div>
    </div>
);
