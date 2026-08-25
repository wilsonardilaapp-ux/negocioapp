'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ScanLine, 
  User, 
  Smartphone, 
  CheckCircle2, 
  X, 
  Tag, 
  DollarSign, 
  Clock,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/billing';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackingConfirmationCardProps {
  invoice: Invoice;
  sellerName: string | null;
  onClose: () => void;
}

/**
 * @fileOverview Tarjeta informativa de Rastreo Inteligente.
 * Proporciona feedback visual al cajero sobre la atribución de la venta.
 */
export function TrackingConfirmationCard({ invoice, sellerName, onClose }: TrackingConfirmationCardProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full"
    >
      <Card className="rounded-[2rem] border-2 border-primary/20 shadow-xl overflow-hidden bg-primary/5 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-primary/10 text-primary transition-colors z-10"
        >
          <X size={16} />
        </button>

        <CardHeader className="pb-3 pt-6 px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary text-white rounded-xl shadow-lg animate-pulse">
              <ScanLine size={20} />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">
                Rastreo Inteligente Activo
              </CardTitle>
              <p className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">
                Venta atribuida correctamente
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-2xl border border-primary/10 shadow-sm space-y-1">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Origen</span>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck size={10} className="text-primary" /> Terminal POS
              </p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-primary/10 shadow-sm space-y-1">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Canal</span>
              <p className="text-xs font-bold text-slate-800">Venta presencial</p>
            </div>
          </div>

          <div className="space-y-2.5 bg-white/50 p-4 rounded-2xl border border-dashed border-primary/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <User size={12} /> Vendedor:
              </span>
              <span className="font-bold text-slate-900">{sellerName || 'Sistema'}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Tag size={12} /> Venta:
              </span>
              <Badge variant="outline" className="h-5 text-[10px] font-black border-primary/30 text-primary bg-white">
                {invoice.consecutiveNumber}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Clock size={12} /> Hora:
              </span>
              <span className="font-bold text-slate-700">{new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <Separator className="bg-primary/10" />

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase">Cliente</span>
                <span className="text-sm font-black text-slate-900 leading-none">{invoice.customer.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total</span>
                <p className="text-lg font-black text-primary leading-none">{formatCurrency(invoice.total)}</p>
              </div>
            </div>

            {invoice.customer.phone && (
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-green-600 uppercase">
                <Smartphone size={10} /> WhatsApp registrado
              </div>
            )}
          </div>

          <div className="flex justify-center gap-2 pt-1">
             <div className="flex items-center gap-1 text-[9px] font-black text-primary/60 uppercase tracking-widest">
                <CheckCircle2 size={10} /> Impacto reflejado en analíticas
             </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-slate-200", className)} />;
}
