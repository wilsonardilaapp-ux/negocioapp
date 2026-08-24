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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MoreHorizontal, 
  Edit2, 
  RefreshCcw, 
  CreditCard, 
  UserPlus, 
  Truck, 
  Printer, 
  FileDown, 
  Trash2,
  Ban,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import type { Order, OrderStatus } from "@/models/order";
import { cn, normalizePhoneNumber } from "@/lib/utils";
import Link from 'next/link';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ViewOrderDialog } from "./ViewOrderDialog";

interface OrderCardMenuProps {
  order: Order;
  handleUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onViewDetails?: (order: Order) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function OrderCardMenu({ order, handleUpdateStatus }: OrderCardMenuProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [editForm, setEditForm] = useState({
    customerAddress: order.customerAddress || '',
    notes: order.notes || ''
  });

  const statuses: OrderStatus[] = ["Pendiente", "En proceso", "Enviado", "Entregado"];

  const handleUpdateField = async (field: string, value: any) => {
    if (!firestore || !user?.uid) return;
    setIsUpdating(true);
    try {
        const docRef = doc(firestore, `businesses/${user.uid}/orders`, order.id);
        await updateDocumentNonBlocking(docRef, { [field]: value, updatedAt: new Date().toISOString() });
        toast({ title: "Pedido actualizado" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Error al actualizar" });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleStatusChange = async (status: OrderStatus) => {
    await handleUpdateStatus(order.id, status);
  };

  const handleCancelOrder = async () => {
    await handleUpdateStatus(order.id, "Cancelado");
    setIsCancelAlertOpen(false);
  };

  const handleQuickEditSave = async () => {
    if (!firestore || !user?.uid) return;
    setIsUpdating(true);
    try {
        const docRef = doc(firestore, `businesses/${user.uid}/orders`, order.id);
        await updateDocumentNonBlocking(docRef, { 
            customerAddress: editForm.customerAddress,
            notes: editForm.notes,
            updatedAt: new Date().toISOString()
        });
        toast({ title: "Cambios guardados" });
        setIsEditDialogOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: "Error al guardar cambios" });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleDownloadSinglePDF = () => {
    const doc = new jsPDF();
    const orderId = order.id.slice(-7).toUpperCase();
    
    doc.setFontSize(18);
    doc.text(`Comprobante de Pedido #${orderId}`, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Cliente: ${order.customerName}`, 14, 30);
    doc.text(`Email: ${order.customerEmail}`, 14, 35);
    doc.text(`WhatsApp: ${order.customerPhone}`, 14, 40);
    doc.text(`Fecha: ${new Date(order.orderDate).toLocaleString()}`, 14, 45);
    doc.text(`Dirección: ${order.customerAddress}`, 14, 50);

    const isNewFormat = order.items && Array.isArray(order.items);
    const tableData = isNewFormat 
      ? order.items.map(item => [item.productName, item.quantity, formatCurrency(item.unitPrice), formatCurrency(item.subtotal)])
      : [[(order as any).productName || 'Producto', (order as any).quantity || 1, formatCurrency((order as any).unitPrice || 0), formatCurrency(order.subtotal)]];

    (doc as any).autoTable({
      startY: 60,
      head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableData,
    });

    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.setFontSize(12);
    doc.text(`TOTAL: ${formatCurrency(order.total || order.subtotal)}`, 140, finalY + 15);

    doc.save(`Pedido_${orderId}.pdf`);
  };

  const handleWhatsAppShare = () => {
    const orderId = order.id.slice(-7).toUpperCase();
    const isNewFormat = order.items && Array.isArray(order.items);
    const itemLines = isNewFormat 
      ? order.items.map(i => `- ${i.quantity} x ${i.productName}`).join('\n')
      : `- ${(order as any).quantity} x ${(order as any).productName}`;

    const message = `Hola *${order.customerName}*! 👋\n\n` +
      `Tu pedido *#${orderId}* en nuestro negocio ha sido registrado.\n\n` +
      `📦 *Resumen:*\n${itemLines}\n\n` +
      `💰 *Total:* ${formatCurrency(order.total || order.subtotal)}\n` +
      `📍 *Entrega:* ${order.customerAddress}\n\n` +
      `Te avisaremos cuando esté en camino. ¡Gracias por tu compra! 🚀`;

    const cleanPhone = normalizePhoneNumber(order.customerPhone);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const DisabledOption = ({ children, label }: { children: React.ReactNode, label: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full opacity-50 cursor-not-allowed">
            <DropdownMenuItem disabled className="flex items-center gap-2">
              {children}
              <span>{label}</span>
              <Badge variant="outline" className="ml-auto text-[8px] h-4">Próximamente</Badge>
            </DropdownMenuItem>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Módulo no disponible en esta versión</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Acciones del Pedido</DropdownMenuLabel>
          
          <ViewOrderDialog order={order} />

          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="cursor-pointer font-bold">
            <Edit2 className="mr-2 h-4 w-4" /> Editar pedido
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <RefreshCcw className="mr-2 h-4 w-4" /> Cambiar estado
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {statuses.map((status) => (
                  <DropdownMenuItem 
                    key={status} 
                    onClick={() => handleStatusChange(status)}
                    className={cn(order.orderStatus === status && "bg-muted font-bold")}
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" /> Estado de pago
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem 
                  onClick={() => handleUpdateField('paymentStatus', 'paid')}
                  className={cn(order.paymentStatus === 'paid' && "bg-muted font-bold")}
                  disabled={isUpdating}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Pagado
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleUpdateField('paymentStatus', 'pending')}
                  className={cn((!order.paymentStatus || order.paymentStatus === 'pending') && "bg-muted font-bold")}
                  disabled={isUpdating}
                >
                  <Clock className="mr-2 h-4 w-4 text-amber-600" /> Pendiente de pago
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DisabledOption label="Asignar mesero">
            <UserPlus className="h-4 w-4" />
          </DisabledOption>

          <DisabledOption label="Asignar mensajero">
            <Truck className="h-4 w-4" />
          </DisabledOption>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={`/dashboard/pedidos/print/${order.id}`} target="_blank" rel="noopener noreferrer">
              <Printer className="mr-2 h-4 w-4" /> Imprimir Ticket
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDownloadSinglePDF} className="cursor-pointer">
            <FileDown className="mr-2 h-4 w-4" /> Descargar PDF
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleWhatsAppShare} className="cursor-pointer">
            <WhatsAppIcon className="mr-2 h-4 w-4" /> Enviar por WhatsApp
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => setIsCancelAlertOpen(true)}
            className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
          >
            <Ban className="mr-2 h-4 w-4" /> Cancelar pedido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Editar Pedido #{order.id.slice(-7).toUpperCase()}</DialogTitle>
                <DialogDescription>Modifica la información logística del pedido.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-address">Dirección de Entrega</Label>
                    <Input 
                        id="edit-address" 
                        value={editForm.customerAddress} 
                        onChange={(e) => setEditForm(prev => ({...prev, customerAddress: e.target.value}))}
                        placeholder="Ej. Calle 123 #45-67..."
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notas / Instrucciones</Label>
                    <Textarea 
                        id="edit-notes" 
                        value={editForm.notes} 
                        onChange={(e) => setEditForm(prev => ({...prev, notes: e.target.value}))}
                        placeholder="Indicaciones para el repartidor o cocina..."
                        rows={4}
                    />
                </div>
            </div>
            <DialogFooter className="bg-muted/50 -mx-6 -mb-6 p-6 border-t">
                <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>Cancelar</Button>
                <Button onClick={handleQuickEditSave} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el pedido #{order.id.slice(-7).toUpperCase()} como cancelado. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive hover:bg-destructive/90">
              Sí, cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Badge({ children, className, variant }: any) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border transition-colors",
      variant === 'outline' ? "border-muted text-muted-foreground" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
}