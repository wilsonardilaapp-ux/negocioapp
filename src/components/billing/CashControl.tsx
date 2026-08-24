'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Wallet, RotateCcw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashControlProps {
  total: number;
  cashReceived: number;
  onCashChange: (value: number) => void;
}

export default function CashControl({ total, cashReceived, onCashChange }: CashControlProps) {
  const change = Math.max(0, cashReceived - total);
  const isInsufficient = cashReceived > 0 && cashReceived < total;

  const addAmount = (amount: number) => {
    onCashChange(cashReceived + amount);
  };

  const setFixedAmount = (amount: number) => {
    onCashChange(amount);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <Card className="rounded-3xl border-2 border-slate-100 shadow-md bg-white">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-[11px] font-black flex items-center gap-2 uppercase tracking-widest text-slate-600">
          <Wallet size={14} className="text-primary" /> Control de Efectivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1.5">
           <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Monto Recibido</Label>
                {isInsufficient && (
                    <span className="text-[9px] font-black text-red-500 uppercase animate-pulse">Faltan {formatCurrency(total - cashReceived)}</span>
                )}
           </div>
           <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input 
                type="number"
                value={cashReceived || ''}
                onChange={(e) => onCashChange(Number(e.target.value))}
                className={cn(
                    "pl-10 h-10 text-lg font-black transition-colors border-2",
                    isInsufficient ? "border-red-200 bg-red-50 text-red-700" : "border-slate-100 bg-slate-50 text-primary"
                )}
                placeholder="0"
              />
           </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[10000, 20000, 50000].map(amount => (
            <Button 
              key={amount} 
              variant="outline" 
              size="sm" 
              className="h-8 text-[10px] font-black border-slate-100 hover:bg-primary/5 hover:text-primary transition-all"
              onClick={() => addAmount(amount)}
            >
              +{amount/1000}k
            </Button>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[10px] font-black border-primary/20 text-primary bg-primary/5"
            onClick={() => setFixedAmount(total)}
          >
            Exacto
          </Button>
        </div>

        <div className={cn(
          "p-3 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center",
          change > 0 ? "border-green-200 bg-green-50" : "border-slate-100 bg-slate-50 opacity-60"
        )}>
           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Cambio a entregar</p>
           <p className={cn(
             "text-xl font-black tracking-tighter",
             change > 0 ? "text-green-700" : "text-slate-400"
           )}>{formatCurrency(change)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
