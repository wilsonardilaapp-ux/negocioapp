'use client';

import React, { useState } from 'react';
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
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc, runTransaction, collection, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { normalizePhoneNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface InvoiceActionsMenuProps {
  invoice: Invoice;
  businessType: VerticalType;
}

export function InvoiceActionsMenu({ invoice, businessType }: InvoiceActionsMenuProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const labels = VERTICAL_LABELS[businessType] || VERTICAL_LABELS.Retail;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  // 1. Ver Detalle
  const handleViewDetail = () => setIsDetailOpen(true);

  // 2. Imprimir Ticket
  const handlePrint = () => {
    toast({ title: "Enviando a impresora...", description: `Imprimiendo factura ${invoice.consecutiveNumber}` });
    // Aquí iría la lógica de window.open('/dashboard/pos/print/' + invoice.id) similar a pedidos
  };

  // 3. Enviar WhatsApp
  const handleWhatsApp = () => {
    if (!invoice.customer.phone) {
        toast({ variant: "destructive", title: "Sin teléfono", description: "El cliente no tiene un número registrado." });
        return;
    }
    const phone = normalizePhoneNumber(invoice.customer.phone);
    const message = `Hola ${invoice.customer.name}! 👋 Aquí tienes el resumen de tu compra ${invoice.consecutiveNumber} por un total de ${formatCurrency(invoice.total)}. ¡Gracias por tu visita!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 4. Estado de Pago
  const handleUpdateStatus = async (newStatus: 'completada' | 'anulada') => {
    if (!user) return;
    setIsProcessing(true);
    try {
        const docRef = doc(firestore, `businesses/${user.uid}/invoices`, invoice.id);
        await updateDocumentNonBlocking(docRef, { status: newStatus });
        toast({ title: "Estado actualizado", description: `Factura marcada como ${newStatus}.` });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  // 5. Asignar Staff
  const handleAssignStaff = async (staffName: string) => {
    if (!user) return;
    setIsProcessing(true);
    try {
        const docRef = doc(firestore, `businesses/${user.uid}/invoices`, invoice.id);
        await updateDocumentNonBlocking(docRef, { atendidoPor: staffName });
        toast({ title: "Personal asignado", description: `${labels.staff} actualizado a ${staffName}.` });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  // 6. Descargar PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Comprobante de Venta ${invoice.consecutiveNumber}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Cliente: ${invoice.customer.name}`, 14, 30);
    doc.text(`Fecha: ${new Date(invoice.createdAt).toLocaleString()}`, 14, 35);
    
    const tableData = invoice.items.map(item => [item.name, item.quantity, formatCurrency(item.unitPrice), formatCurrency(item.subtotal)]);
    (doc as any).autoTable({
      startY: 45,
      head: [['Producto', 'Cant.', 'Precio', 'Subtotal']],
      body: tableData,
    });
    
    doc.save(`Factura_${invoice.consecutiveNumber}.pdf`);
    toast({ title: "PDF Generado", description: "La descarga ha comenzado." });
  };

  // 7. Consumir / Completar
  const handleComplete = async () => {
     if (!user) return;
     setIsProcessing(true);
     try {
         const docRef = doc(firestore, `businesses/${user.uid}/invoices`, invoice.id);
         await updateDocumentNonBlocking(docRef, { orderStatus: 'completado' });
         toast({ title: "Servicio completado", description: "El pedido ha sido marcado como consumido." });
     } catch (e: any) {
         toast({ variant: "destructive", title: "Error", description: e.message });
     } finally {
         setIsProcessing(false);
     }
  };

  // 8. Cancelar / Eliminar (Anulación con reversión de stock)
  const handleCancelAndRevert = async () => {
    if (!user || !firestore) return;
    setIsProcessing(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const invRef = doc(firestore, `businesses/${user.uid}/invoices`, invoice.id);
        const invSnap = await transaction.get(invRef);
        
        if (!invSnap.exists()) throw new Error("La factura no existe.");
        if (invSnap.data().status === 'anulada') throw new Error("La factura ya está anulada.");

        // 1. Anular Factura
        transaction.update(invRef, { status: 'anulada', updatedAt: new Date().toISOString() });

        // 2. Revertir Stock
        for (const item of invoice.items) {
          const productRef = doc(firestore, `businesses/${user.uid}/products`, item.productId);
          transaction.update(productRef, { stock: increment(item.quantity) });

          // Registrar movimiento de reversión
          const movementRef = doc(collection(firestore, `businesses/${user.uid}/stock_movements`));
          transaction.set(movementRef, {
            productId: item.productId,
            productName: item.name,
            type: 'void_reversal',
            change: item.quantity,
            referenceId: invoice.id,
            consecutive: invoice.consecutiveNumber,
            createdAt: new Date().toISOString(),
            userId: user.uid
          });
        }
      });

      toast({ title: "Venta anulada", description: "Se ha revertido el stock de los productos." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al anular", description: e.message });
    } finally {
      setIsProcessing(false);
      setIsCancelAlertOpen(false);
    }
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
          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Gestión de Factura</DropdownMenuLabel>
          
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
                <DropdownMenuItem onClick={() => handleUpdateStatus('completada')} className="text-xs font-bold">
                  Pagado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateStatus('anulada')} className="text-xs font-bold text-red-600">
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
                {/* Placeholders para personal - En producción vendría de la colección de staff */}
                <DropdownMenuItem onClick={() => handleAssignStaff('Personal de Turno')} className="text-xs font-bold">Personal de Turno</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAssignStaff('Caja Principal')} className="text-xs font-bold">Caja Principal</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={handleDownloadPDF} className="text-xs font-bold gap-2 cursor-pointer">
            <FileText size={14} className="text-slate-600" /> Descargar PDF
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleComplete} className="text-xs font-bold gap-2 cursor-pointer">
            <CheckCircle size={14} className="text-green-600" /> Consumir pedido
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                    className="text-xs font-bold gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                    onSelect={(e) => e.preventDefault()}
                >
                    <Trash2 size={14} /> Cancelar / Eliminar
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Anular Factura {invoice.consecutiveNumber}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción marcará la factura como anulada y <strong>revertirá automáticamente el stock</strong> de los productos al inventario.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Volver</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleCancelAndRevert}
                        className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
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