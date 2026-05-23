
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
import { ShoppingBag, Building2, HandCoins, Minus, Plus, Tag } from 'lucide-react';
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
import { promotionService } from '@/services/promotion-service';
import type { Promotion } from '@/models/promotion';

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
  
  useEffect(() => {
    if (isOpen && businessId) {
        promotionService.getActivePromotions(businessId).then(promos => {
            setActivePromotions(promos.filter(p => p.showInCheckout));
        });
    }
  }, [isOpen, businessId]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof purchaseSchema>>({
    resolver: zodResolver(purchaseSchema),
  });
  
  const packagingTotal = cartItems.reduce((sum, item) => sum + ((item.packagingCost ?? 0) * item.quantity), 0);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalProducts = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalBeforeVat = subtotalProducts + packagingTotal;
  const vatRate = businessInfo?.vatRate ?? 0;
  const total = subtotalBeforeVat * (1 + vatRate/100) + (tipoEntrega === 'domicilio' ? (businessInfo?.deliveryFee ?? 0) : 0);

  const applicablePromo = activePromos.find(p => p.minQuantity !== undefined && totalQuantity >= p.minQuantity) ?? null;

  const onSubmit = (data: z.infer<typeof purchaseSchema>) => {
    const messageBody = `Pedido de ${data.fullName}\nTotal: ${formatCurrency(total)}\nPromo: ${applicablePromo?.title || 'Ninguna'}`;
    const whatsappUrl = `https://wa.me/${businessInfo?.phone.replace(/\D/g, '')}?text=${encodeURIComponent(messageBody)}`;
    window.open(whatsappUrl, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Compra</DialogTitle>
          <DialogDescription>Revisa tu pedido y completa tus datos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {applicablePromo && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <Tag className="h-5 w-5" />
              <div>
                <p className="font-bold">¡Promoción Aplicada!</p>
                <p className="text-sm">{applicablePromo.title}: {applicablePromo.description}</p>
              </div>
            </div>
          )}
          <ScrollArea className="h-48 border rounded-md p-4">
            {cartItems.map(item => (
              <div key={item.id} className="flex justify-between py-2 border-b">
                <span>{item.quantity}x {item.name}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </ScrollArea>
          <div className="grid gap-4">
            <Input {...register('fullName')} placeholder="Nombre completo" />
            <Input {...register('whatsapp')} placeholder="WhatsApp" />
            <Textarea {...register('address')} placeholder="Dirección de entrega" />
          </div>
          <div className="text-xl font-bold text-right">Total: {formatCurrency(total)}</div>
          <Button type="submit" className="w-full h-12" disabled={isSubmitting}>Confirmar Pedido</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
