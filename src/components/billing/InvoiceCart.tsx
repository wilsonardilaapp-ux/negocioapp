
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
  HandHeart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { POSItem, VerticalType, DiscountType } from '@/types/billing';
import { VERTICAL_LABELS } from '@/types/billing';

interface InvoiceCartProps {
  items: POSItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  businessType: VerticalType;
  customerName: string;
  setCustomerName: (val: string) => void;
  
  // Financial Control
  discountType: DiscountType;
  setDiscountType: (type: DiscountType) => void;
  discountValue: number;
  setDiscountValue: (val: number) => void;
  taxRate: number;
  setTaxRate: (val: number) => void;
  tipAmount: number;
  setTipAmount: (val: number) => void;
  tipType: DiscountType;
  setTipType: (type: DiscountType) => void;
  paymentMethod: string;
  setPaymentMethod: (val: string) => void;
  
  summary: {
      subtotal: number;
      discount: number;
      tax: number;
      tip: number;
      total: number;
  };
  isProcessing: boolean;
}

export default function InvoiceCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  businessType,
  customerName,
  setCustomerName,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  taxRate,
  tipAmount,
  setTipAmount,
  tipType,
  setTipType,
  paymentMethod,
  setPaymentMethod,
  summary,
  isProcessing
}: InvoiceCartProps) {
  const labels = VERTICAL_LABELS[businessType] || VERTICAL_LABELS.Retail;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <Card className="h-full flex flex-col rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50 border-b pb-4 px-4 py-3">
        <CardTitle className="text-md font-black flex items-center gap-2">
          <Receipt size={18} className="text-primary" /> Factura Actual
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {/* Info del Cliente y Vertical */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
              <User size={10} /> Cliente
            </Label>
            <Input 
              placeholder="Nombre o documento..." 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-8 font-bold bg-muted/30 border-none text-xs"
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{labels.location}</Label>
                <Input placeholder={labels.location} className="h-8 font-bold bg-muted/30 border-none text-xs" disabled={isProcessing} />
             </div>
             <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{labels.staff}</Label>
                <Input placeholder={labels.staff} className="h-8 font-bold bg-muted/30 border-none text-xs" disabled={isProcessing} />
             </div>
          </div>
        </div>

        <Separator />

        {/* Listado de Productos */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-3">
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.productId} className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50/50 border border-slate-100 animate-in fade-in slide-in-from-right-1 duration-300">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[11px] font-black text-slate-700 leading-tight flex-1 uppercase truncate">{item.name}</span>
                      <button 
                        type="button"
                        onClick={() => onRemoveItem(item.productId)} 
                        disabled={isProcessing}
                        className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button"
                          variant="outline" 
                          size="icon" 
                          className="h-6 w-6 rounded-full bg-white shadow-sm" 
                          onClick={() => onUpdateQuantity(item.productId, -1)}
                          disabled={isProcessing}
                        >
                          <Minus size={10} />
                        </Button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="icon" 
                          className="h-6 w-6 rounded-full bg-white shadow-sm" 
                          onClick={() => onUpdateQuantity(item.productId, 1)}
                          disabled={isProcessing}
                        >
                          <Plus size={10} />
                        </Button>
                      </div>
                      <span className="text-xs font-black text-slate-900">{formatCurrency(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center py-10">
                <Receipt size={32} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-tighter">Sin productos</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator />

        {/* Ajustes Financieros */}
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border">
            <div className="grid grid-cols-2 gap-4">
                {/* Descuento */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Descuento</Label>
                        <button 
                            type="button"
                            onClick={() => setDiscountType(discountType === 'amount' ? 'percent' : 'amount')}
                            className={cn(
                                "text-[10px] font-black uppercase transition-all px-1.5 rounded",
                                discountType === 'percent' ? "bg-primary text-white" : "text-primary"
                            )}
                            disabled={isProcessing}
                        >
                            {discountType === 'amount' ? '$' : '%'}
                        </button>
                    </div>
                    <div className="relative">
                        <DollarSign size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            type="number"
                            value={discountValue || ''}
                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                            className="h-7 pl-6 text-xs font-bold bg-white"
                            disabled={isProcessing}
                        />
                    </div>
                </div>
                {/* Propina */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Propina Sug.</Label>
                        <button 
                            type="button"
                            onClick={() => setTipType(tipType === 'amount' ? 'percent' : 'amount')}
                            className={cn(
                                "text-[10px] font-black uppercase transition-all px-1.5 rounded",
                                tipType === 'percent' ? "bg-primary text-white" : "text-primary"
                            )}
                            disabled={isProcessing}
                        >
                            {tipType === 'amount' ? '$' : '%'}
                        </button>
                    </div>
                    <div className="relative flex items-center gap-1">
                        <div className="relative flex-1">
                            <HandHeart size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                type="number"
                                value={tipAmount || ''}
                                onChange={(e) => setTipAmount(Number(e.target.value))}
                                className="h-7 pl-6 text-xs font-bold bg-white"
                                disabled={isProcessing}
                            />
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg shrink-0"
                            onClick={() => { setTipType('percent'); setTipAmount(10); }}
                            disabled={isProcessing}
                        >
                            <span className="text-[8px] font-black">10%</span>
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="space-y-1.5 pt-1">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Método de Pago</Label>
                <div className="flex gap-2">
                    {['efectivo', 'nequi', 'tarjeta'].map(method => (
                        <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            disabled={isProcessing}
                            className={cn(
                                "flex-1 py-1 rounded-lg text-[9px] font-black uppercase border transition-all",
                                paymentMethod === method ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-muted-foreground border-slate-100"
                            )}
                        >
                            {method}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </CardContent>

      {/* Footer con Totales - RESUMEN FINANCIERO OSCURO */}
      <CardFooter className="flex flex-col gap-1 p-4 bg-slate-900 text-white rounded-t-3xl shadow-2xl">
        <div className="w-full space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span>Subtotal</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          {summary.discount > 0 && (
            <div className="flex justify-between text-[11px] font-bold text-red-400">
                <span>Descuento {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
                <span>-{formatCurrency(summary.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span>IVA ({taxRate}%)</span>
            <span>{formatCurrency(summary.tax)}</span>
          </div>
          {summary.tip > 0 && (
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>Propina / Servicio {tipType === 'percent' ? `(${tipAmount}%)` : ''}</span>
              <span>{formatCurrency(summary.tip)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">Total a Cobrar</span>
            <span className="text-3xl font-black text-white tracking-tighter">{formatCurrency(summary.total)}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
