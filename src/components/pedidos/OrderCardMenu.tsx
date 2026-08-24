
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
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  RefreshCcw, 
  CreditCard, 
  UserPlus, 
  Truck, 
  Printer, 
  FileDown, 
  Trash2,
  CheckCircle2,
  Clock,
  Ban
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import type { Order, OrderStatus } from "@/models/order";
import { cn } from "@/lib/utils";

interface OrderCardMenuProps {
  order: Order;
  handleUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onViewDetails: (order: Order) => void;
}

export function OrderCardMenu({ order, handleUpdateStatus, onViewDetails }: OrderCardMenuProps) {
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const statuses: OrderStatus[] = ["Pendiente", "En proceso", "Enviado", "Entregado"];

  const handleStatusChange = async (status: OrderStatus) => {
    await handleUpdateStatus(order.id, status);
  };

  const handleCancelOrder = async () => {
    await handleUpdateStatus(order.id, "Cancelado");
    setIsCancelAlertOpen(false);
  };

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
          
          <DropdownMenuItem onClick={() => onViewDetails(order)} className="cursor-pointer">
            <Eye className="mr-2 h-4 w-4" /> Ver detalles
          </DropdownMenuItem>

          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <Edit2 className="mr-2 h-4 w-4" /> Editar pedido <Badge variant="outline" className="ml-auto text-[8px] h-4">Beta</Badge>
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

          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <CreditCard className="mr-2 h-4 w-4" /> Estado de pago
          </DropdownMenuItem>

          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <UserPlus className="mr-2 h-4 w-4" /> Asignar mesero
          </DropdownMenuItem>

          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <Truck className="mr-2 h-4 w-4" /> Asignar mensajero
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </DropdownMenuItem>

          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <FileDown className="mr-2 h-4 w-4" /> Descargar PDF
          </DropdownMenuItem>

          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
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

      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el pedido #{order.id.slice(-7).toUpperCase()} como cancelado. 
              Los productos volverán al stock si aplica. Esta acción no se puede deshacer.
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
