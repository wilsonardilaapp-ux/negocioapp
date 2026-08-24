'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  User, 
  Phone, 
  CreditCard, 
  UserCheck, 
  Users, 
  Clock,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Invoice, VerticalType } from '@/types/billing';
import { cn } from '@/lib/utils';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'view' | 'success';
  businessType: VerticalType;
}

export function InvoiceDetailModal({ invoice, isOpen, onClose, mode = 'view', businessType }: InvoiceDetailModalProps) {
  if (!invoice) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const formattedDate = format(new Date(invoice.createdAt), "dd 'DE' MMMM 'DE' yyyy 'A LAS' HH:mm", { locale: es }).toUpperCase();
  const taxLabel = businessType === 'Restaurante' ? 'Impoconsumo' : 'IVA';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
        {/* Header con Folio y Fecha */}
        <div className="bg-slate-50 p-8 border-b text-center relative">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
          
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">
            {mode === 'success' ? '¡VENTA REGISTRADA!' : 'CONSULTA DE AUDITORÍA'}
          </p>
          <DialogTitle className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
            DETALLE DE FACTURA {invoice.consecutiveNumber}
          </DialogTitle>
          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Clock size={10} /> {formattedDate}
          </p>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] no-scrollbar">
          {/* Badges de Estado */}
          <div className="flex justify-center gap-3">
            <Badge className={cn(
              "px-4 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border-none shadow-sm",
              invoice.status === 'completada' ? "bg-slate-900 text-white" : "bg-red-600 text-white"
            )}>
              {invoice.status === 'completada' ? 'FACTURADA' : 'ANULADA'}
            </Badge>
            {invoice.tipoConsumo && (
              <Badge className="px-4 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest bg-orange-500 text-white border-none shadow-sm">
                {invoice.tipoConsumo === 'local' ? 'EN MESA' : (invoice.tipoConsumo === 'llevar' ? 'PARA LLEVAR' : 'DOMICILIO')}
              </Badge>
            )}
          </div>

          {/* Card del Cliente */}
          <Card className="rounded-3xl border-2 border-slate-50 bg-slate-50/50 p-5 shadow-none">
             <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Cliente</p>
                    <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <User size={12} className="text-primary shrink-0"/> {invoice.customer.name}
                    </p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Teléfono</p>
                    <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <Phone size={12} className="text-primary shrink-0"/> {invoice.customer.phone || 'N/A'}
                    </p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Vendedor</p>
                    <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <UserCheck size={12} className="text-primary shrink-0"/> {invoice.atendidoPor || 'Caja Central'}
                    </p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Método de Pago</p>
                    <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <CreditCard size={12} className="text-primary shrink-0"/> {invoice.paymentMethod.toUpperCase()}
                    </p>
                </div>
                {invoice.pax && (
                   <div className="space-y-0.5">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Personas (Pax)</p>
                        <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <Users size={12} className="text-primary shrink-0"/> {invoice.pax} pax
                        </p>
                    </div>
                )}
             </div>
          </Card>

          {/* Tabla de Ítems */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-4 bg-primary rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Productos del Pedido</span>
             </div>
             <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="text-[9px] font-black uppercase h-8 px-4">ITEM</TableHead>
                            <TableHead className="text-[9px] font-black uppercase h-8 text-center">CANT</TableHead>
                            <TableHead className="text-[9px] font-black uppercase h-8 text-right px-4">TOTAL</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.items.map((item, idx) => (
                            <TableRow key={idx} className="h-10 border-slate-50">
                                <TableCell className="text-[10px] font-black text-slate-700 uppercase px-4">{item.name}</TableCell>
                                <TableCell className="text-[11px] font-black text-center">{item.quantity}</TableCell>
                                <TableCell className="text-[11px] font-black text-right px-4 text-primary">{formatCurrency(item.subtotal)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
          </div>

          {/* Bloque Financiero Oscuro */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8h-8"/><path d="M16 12h-8"/><path d="M16 16h-8"/></svg>
             </div>
             
             <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Subtotal Neto</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{taxLabel}</span>
                    <span>{formatCurrency(invoice.tax)}</span>
                </div>
                {invoice.discount > 0 && (
                    <div className="flex justify-between items-center text-[10px] font-bold text-red-400 uppercase tracking-widest">
                        <span>Descuento</span>
                        <span>-{formatCurrency(invoice.discount)}</span>
                    </div>
                )}
                {invoice.tip > 0 && (
                    <div className="flex justify-between items-center text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                        <span>Propina Sugerida</span>
                        <span>{formatCurrency(invoice.tip)}</span>
                    </div>
                )}
             </div>

             <Separator className="bg-slate-800" />
             
             <div className="flex justify-between items-center relative z-10 pt-1">
                <span className="text-xs font-black uppercase tracking-tighter text-slate-300">Total Final</span>
                <span className="text-3xl font-black text-[#FF6B6B] tracking-tighter drop-shadow-sm">
                    {formatCurrency(invoice.total)}
                </span>
             </div>
          </div>

          {/* Bloque de Caja */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-5 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Recibido</span>
                <span className="text-md font-bold text-slate-600">{formatCurrency(invoice.cashReceived)}</span>
             </div>
             <div className="p-5 bg-green-50 rounded-[1.5rem] border-2 border-green-100 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black uppercase text-green-700 tracking-tighter mb-1">Cambio</span>
                <span className="text-lg font-black text-green-600">{formatCurrency(invoice.changeAmount)}</span>
             </div>
          </div>
        </div>

        <div className="p-8 pt-2">
          <Button 
            className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl bg-slate-900 hover:bg-black text-white transition-all active:scale-95"
            onClick={onClose}
          >
            Cerrar Detalle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}