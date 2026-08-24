'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Wallet, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashControlProps {
  total: number;
  cashReceived: number;
  onCashChange: (value: number) => void;
}

export default function CashControl({ total, cashReceived, onCashChange }: CashControlProps) {
  const [change, setChange] = useState(0);

  useEffect(() => {
    setChange(Math.max(0, cashReceived - total));
  }, [total, cashReceived]);

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
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-600">
          <Wallet size={16} className="text-primary" /> Control de Efectivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Monto Recibido</Label>
           <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input 
                type="number"
                value={cashReceived || ''}
                onChange={(e) => onCashChange(Number(e.target.value))}
                className="pl-10 h-12 text-xl font-black text-primary bg-primary/5 border-none"
                placeholder="0"
              />
           </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[10000, 20000, 50000, 100000].map(amount => (
            <Button 
              key={amount} 
              variant="outline" 
              size="sm" 
              className="h-10 text-[10px] font-bold border-slate-100 hover:bg-primary/5 hover:text-primary transition-all"
              onClick={() => addAmount(amount)}
            >
              +{amount/1000}k
            </Button>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 text-[10px] font-bold border-primary/20 text-primary bg-primary/5"
            onClick={() => setFixedAmount(total)}
          >
            Exacto
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 text-[10px] font-bold text-red-400 hover:text-red-600"
            onClick={() => onCashChange(0)}
          >
            <RotateCcw size={12} />
          </Button>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border-2 border-dashed transition-all text-center",
          change > 0 ? "border-green-200 bg-green-50" : "border-slate-100 bg-slate-50 opacity-60"
        )}>
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Cambio (Devuelta)</p>
           <p className={cn(
             "text-2xl font-black tracking-tighter",
             change > 0 ? "text-green-700" : "text-slate-400"
           )}>{formatCurrency(change)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
