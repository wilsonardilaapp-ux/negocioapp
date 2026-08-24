'use client';

import React, { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  Printer, 
  MessageCircle, 
  CreditCard, 
  UserCheck, 
  FileText, 
  CheckCircle, 
  Trash2, 
  MoreVertical,
  Loader2
} from 'lucide-react';
import type { Invoice, VerticalType } from '@/types/billing';
import { VERTICAL_LABELS } from '@/types/billing';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { normalizePhoneNumber } from '@/lib/utils';
import { updateInvoiceOperation, voidInvoiceAndRevertStock } from '@/services/billing/order-lifecycle-service';
import { InvoiceOutputService } from '@/services/billing/invoice-output-service';
import type { Business } from '@/models/business';

interface InvoiceActionsMenuProps {
  invoice: Invoice;
  businessType: VerticalType;
}

export function InvoiceActionsMenu({ invoice, businessType }: InvoiceActionsMenuProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

  // Obtener nombre del negocio para WhatsApp/PDF
  const businessRef = useMemoFirebase(() => user ? doc(firestore, 'businesses', user.uid) : null, [user, firestore]);
  const { data: business } = useDoc<Business>(businessRef);

  const labels = VERTICAL_LABELS[businessType] || VERTICAL_LABELS.Retail;

  // 1. Ver Detalle
  const handleViewDetail = () => setIsDetailOpen(true);

  // 2. Imprimir Ticket (Ruta dedicada)
  const handlePrint = () => {
    window.open(`/dashboard/pos/print/${invoice.id}`, '_blank', 'width=400,height=600');
    toast({ title: "Iniciando impresión", description: `Generando ticket para ${invoice.consecutiveNumber}` });
  };

  // 3. Enviar WhatsApp (wa.me)
  const handleWhatsApp = () => {
    if (!invoice.customer.phone) {
        toast({ variant: "destructive", title: "Sin teléfono", description: "El cliente no tiene un número registrado." });
        return;
    }
    const phone = normalizePhoneNumber(invoice.customer.phone);
    const message = InvoiceOutputService.generateWhatsAppMessage(invoice, business?.name || 'Nuestro Negocio');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 4. Estado de Pago & 7. Consumir
  const handleUpdateStatus = (statusUpdate: any) => {
    if (!user) return;
    startTransition(async () => {
      const result = await updateInvoiceOperation(user.uid, invoice.id, statusUpdate);
      if (result.success) {
        toast({ title: "Registro actualizado", description: "Cambio sincronizado." });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  // 5. Asignar Staff
  const handleAssignStaff = (staffName: string) => {
    handleUpdateStatus({ atendidoPor: staffName });
  };

  // 6. Descargar PDF Formal
  const handleDownloadPDF = () => {
    InvoiceOutputService.downloadPDF(invoice, business?.name || 'Markix Business', businessType);
    toast({ title: "PDF Generado", description: "La descarga ha comenzado." });
  };

  // 8. Cancelar / Eliminar
  const handleCancelAndRevert = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await voidInvoiceAndRevertStock(user.uid, invoice.id, user.uid);
      if (result.success) {
        toast({ title: "Venta anulada", description: "Stock revertido exitosamente." });
        setIsCancelAlertOpen(false);
      } else {
        toast({ variant: "destructive", title: "Error al anular", description: result.error });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl">
          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Acciones de Venta</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={handleViewDetail} className="text-xs font-bold gap-2 cursor-pointer">
            <Eye size={14} className="text-primary" /> Ver detalle
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handlePrint} className="text-xs font-bold gap-2 cursor-pointer">
            <Printer size={14} className="text-slate-600" /> Imprimir Ticket
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleWhatsApp} className="text-xs font-bold gap-2 cursor-pointer">
            <MessageCircle size={14} className="text-green-600" /> Enviar WhatsApp
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs font-bold gap-2 cursor-pointer">
              <CreditCard size={14} className="text-blue-600" /> Estado de pago
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="rounded-xl">
                <DropdownMenuItem onClick={() => handleUpdateStatus({ status: 'completada' })} className="text-xs font-bold">
                  Pagado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCancelAlertOpen(true)} className="text-xs font-bold text-red-600">
                  Anulado
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs font-bold gap-2 cursor-pointer">
              <UserCheck size={14} className="text-indigo-600" /> Asignar {labels.staff}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="rounded-xl">
                <DropdownMenuItem onClick={() => handleAssignStaff('Personal de Turno')} className="text-xs font-bold">Personal de Turno</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAssignStaff('Caja Principal')} className="text-xs font-bold">Caja Principal</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={handleDownloadPDF} className="text-xs font-bold gap-2 cursor-pointer">
            <FileText size={14} className="text-slate-600" /> Descargar PDF Formal
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleUpdateStatus({ orderStatus: 'completado' })} className="text-xs font-bold gap-2 cursor-pointer">
            <CheckCircle size={14} className="text-green-600" /> Consumir pedido
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                    className="text-xs font-bold gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                    onSelect={(e) => e.preventDefault()}
                >
                    <Trash2 size={14} /> Anular / Eliminar
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Anular Factura {invoice.consecutiveNumber}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción marcará la factura como anulada y <strong>revertirá automáticamente el stock</strong> al inventario.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Volver</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleCancelAndRevert}
                        className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                        Confirmar Anulación
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>

      <InvoiceDetailModal 
        invoice={invoice}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        businessType={businessType}
      />
    </>
  );
}
