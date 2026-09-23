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
  Percent,
  Smartphone,
  MapPin
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
  onCustomerNameChange?: (val: string) => void;
  customerPhone: string;
  onCustomerPhoneChange?: (val: string) => void;
  consumptionType?: 'sede' | 'para_llevar' | 'domicilio';
  onConsumptionTypeChange?: (type: 'sede' | 'para_llevar' | 'domicilio') => void;
  deliveryAddress?: string;
  onDeliveryAddressChange?: (val: string) => void;
  
  // Financial Control - Aligned names with page.tsx
  discountType: DiscountType;
  onDiscountTypeChange?: (type: DiscountType) => void;
  discountValue: number;
  onDiscountValueChange?: (val: number) => void;
  taxRate: number;
  onTaxRateChange?: (rate: number) => void;
  tipAmount: number;
  onTipAmountChange?: (val: number) => void;
  tipType: 'amount' | 'percent';
  onTipTypeChange?: (type: 'amount' | 'percent') => void;
  paymentMethod: string;
  onPaymentMethodChange?: (method: string) => void;
  
  summary: {
      subtotal: number;
      discount: number;
      tax: number;
      tip: number;
      total: number;
      serviceFee?: number;
      serviceFeeRate?: number;
  };
  isProcessing: boolean;
}

export default function InvoiceCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  businessType,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  consumptionType = 'sede',
  onConsumptionTypeChange,
  deliveryAddress = '',
  onDeliveryAddressChange,
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  taxRate,
  onTaxRateChange,
  tipAmount,
  onTipAmountChange,
  tipType,
  onTipTypeChange,
  paymentMethod,
  onPaymentMethodChange,
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
        <div className="space-y-3">

        {/* Selector de Tipo de Consumo */}
        <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Tipo de Consumo</Label>
          <div className="flex gap-1.5">
            {[
              { id: 'sede', label: 'Sede' },
              { id: 'para_llevar', label: 'Para llevar' },
              { id: 'domicilio', label: 'Domicilio' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onConsumptionTypeChange?.(item.id as any)}
                disabled={isProcessing}
                className={cn(
                  "flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase border transition-all text-center",
                  consumptionType === item.id
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-muted-foreground border-slate-200 hover:border-slate-300"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                <User size={10} /> Cliente
              </Label>
              <Input 
                placeholder="Nombre o documento..." 
                value={customerName}
                onChange={(e) => onCustomerNameChange?.(e.target.value)}
                className="h-8 font-bold bg-muted/30 border-none text-xs"
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                <Smartphone size={10} /> WhatsApp del Cliente
              </Label>
              <Input 
                placeholder="Ej: 3001234567" 
                value={customerPhone}
                onChange={(e) => onCustomerPhoneChange?.(e.target.value)}
                className="h-8 font-bold bg-muted/30 border-none text-xs"
                disabled={isProcessing}
              />
            </div>
          </div>

          {consumptionType === 'domicilio' && (
            <div className="space-y-1 animate-in fade-in duration-200 pt-1">
              <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1">
                <MapPin size={10} /> Dirección de Entrega
              </Label>
              <Input 
                placeholder="Dirección completa del domicilio..." 
                value={deliveryAddress}
                onChange={(e) => onDeliveryAddressChange?.(e.target.value)}
                className="h-8 font-bold bg-primary/5 border border-primary/20 text-xs text-slate-800"
                disabled={isProcessing}
              />
            </div>
          )}

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

        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Descuento</Label>
                        <div className="flex bg-muted p-0.5 rounded-lg border">
                          <button 
                            type="button"
                            onClick={() => onDiscountTypeChange?.('amount')}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                              discountType === 'amount' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                            )}
                            disabled={isProcessing}
                          >
                            $
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDiscountTypeChange?.('percent')}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                              discountType === 'percent' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                            )}
                            disabled={isProcessing}
                          >
                            %
                          </button>
                        </div>
                    </div>
                    <div className="relative">
                        {discountType === 'percent' ? (
                          <Percent size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-primary font-bold" />
                        ) : (
                          <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-primary font-bold" />
                        )}
                        <Input 
                            type="number"
                            value={discountValue || ''}
                            onChange={(e) => onDiscountValueChange?.(Number(e.target.value))}
                            className="h-7 pl-6 text-xs font-bold bg-white focus-visible:ring-primary/20"
                            disabled={isProcessing}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Propina Sug.</Label>
                        <div className="flex bg-muted p-0.5 rounded-lg border">
                          <button 
                            type="button"
                            onClick={() => onTipTypeChange?.('amount')}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                              tipType === 'amount' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                            )}
                            disabled={isProcessing}
                          >
                            $
                          </button>
                          <button 
                            type="button"
                            onClick={() => onTipTypeChange?.('percent')}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                              tipType === 'percent' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                            )}
                            disabled={isProcessing}
                          >
                            %
                          </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="relative flex-1">
                            {tipType === 'percent' ? (
                              <Percent size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-primary font-bold" />
                            ) : (
                              <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-primary font-bold" />
                            )}
                            <Input 
                                type="number"
                                value={tipAmount || ''}
                                onChange={(e) => onTipAmountChange?.(Number(e.target.value))}
                                className="h-7 pl-6 text-xs font-bold bg-white focus-visible:ring-primary/20"
                                disabled={isProcessing}
                            />
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg shrink-0 border-primary/20 text-primary hover:bg-primary/5"
                            onClick={() => { onTipTypeChange?.('percent'); onTipAmountChange?.(10); }}
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
                            onClick={() => onPaymentMethodChange?.(method)}
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

      <CardFooter className="flex flex-col gap-1 p-4 bg-slate-900 text-white rounded-t-3xl shadow-2xl">
        <div className="w-full space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
            <span>Subtotal Neto</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          {summary.serviceFee !== undefined && (
            <div className="flex justify-between text-[11px] font-bold text-amber-400 uppercase tracking-tighter animate-in fade-in slide-in-from-left-1">
              <span>Tarifa de servicio</span>
              <span>+{formatCurrency(summary.serviceFee)}</span>
            </div>
          )}

          {summary.discount > 0 && (
            <div className="flex justify-between text-[11px] font-bold text-red-400 uppercase tracking-tighter animate-in fade-in slide-in-from-left-1">
                <span>Descuento {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
                <span>-{formatCurrency(summary.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
            <span>IVA ({taxRate}%)</span>
            <span>{formatCurrency(summary.tax)}</span>
          </div>
          {summary.tip > 0 && (
            <div className="flex justify-between text-[11px] font-bold text-blue-400 uppercase tracking-tighter animate-in fade-in slide-in-from-left-1">
              <span>Propina / Servicio {tipType === 'percent' ? `(${tipAmount}%)` : ''}</span>
              <span>{formatCurrency(summary.tip)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-800 mt-1">
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">Total a Cobrar</span>
            <span className="text-3xl font-black text-white tracking-tighter">{formatCurrency(summary.total)}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
