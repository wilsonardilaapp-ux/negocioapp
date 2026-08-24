'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Trash2, 
  User, 
  Minus, 
  Plus, 
  Receipt, 
  DollarSign, 
  CreditCard,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { POSItem, VerticalType } from '@/types/billing';
import { VERTICAL_LABELS } from '@/types/billing';

interface InvoiceCartProps {
  items: POSItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  businessType: VerticalType;
  customerName: string;
  setCustomerName: (val: string) => void;
  total: number;
}

export default function InvoiceCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  businessType,
  customerName,
  setCustomerName,
  total
}: InvoiceCartProps) {
  const labels = VERTICAL_LABELS[businessType] || VERTICAL_LABELS.Retail;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <Card className="h-full flex flex-col rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50 border-b pb-4">
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <Receipt className="text-primary" /> Factura Actual
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Info del Cliente y Vertical */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
              <User size={10} /> Cliente
            </Label>
            <Input 
              placeholder="Nombre o documento..." 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-9 font-bold bg-muted/30 border-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{labels.location}</Label>
                <Input placeholder={labels.location} className="h-9 font-bold bg-muted/30 border-none" />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{labels.staff}</Label>
                <Input placeholder={labels.staff} className="h-9 font-bold bg-muted/30 border-none" />
             </div>
          </div>
        </div>

        <Separator />

        {/* Listado de Productos */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-3">
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.productId} className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-black text-slate-700 leading-tight flex-1 uppercase">{item.name}</span>
                      <button 
                        onClick={() => onRemoveItem(item.productId)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 rounded-full bg-white shadow-sm"
                          onClick={() => onUpdateQuantity(item.productId, -1)}
                        >
                          <Minus size={10} />
                        </Button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 rounded-full bg-white shadow-sm"
                          onClick={() => onUpdateQuantity(item.productId, 1)}
                        >
                          <Plus size={10} />
                        </Button>
                      </div>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 opacity-20 text-center">
                <ShoppingCart size={40} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-tighter">Carrito Vacío</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>

      {/* Footer con Totales */}
      <CardFooter className="flex flex-col gap-4 p-4 bg-slate-50/50 border-t">
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(total * 0.81)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>IVA (19%)</span>
            <span>{formatCurrency(total * 0.19)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total</span>
            <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button 
          className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-transform active:scale-95"
          disabled={items.length === 0}
        >
          <CreditCard className="mr-2" /> Cobrar (F8)
        </Button>
      </CardFooter>
    </Card>
  );
}
