
"use client"

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Trash2, Edit, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderStatus } from "@/models/order";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': return 'default';
      case 'En proceso': return 'secondary';
      case 'Enviado': return 'outline';
      case 'Entregado': return 'default'; // Success variant would be better
      case 'Cancelado': return 'destructive';
      default: return 'outline';
    }
};

type ColumnsProps = {
  handleDeleteOrder: (id: string) => Promise<void>;
  handleUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
};

export const columns = ({ handleDeleteOrder, handleUpdateStatus }: ColumnsProps): ColumnDef<Order>[] => {

  const ViewOrderDialog = ({ order }: { order: Order }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsOpen(true); }}>
          <Eye className="mr-2 h-4 w-4" />
          Ver Detalle
        </DropdownMenuItem>
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Detalle del Pedido #{order.id.slice(0, 7)}</AlertDialogTitle>
                <AlertDialogDescription>
                    Información completa del pedido realizado por {order.customerName}.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Cliente:</span>
                        <span className="col-span-2">{order.customerName}</span>
                    </div>
                     <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Email:</span>
                        <a href={`mailto:${order.customerEmail}`} className="col-span-2 text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {order.customerEmail}
                        </a>
                    </div>
                     <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Teléfono:</span>
                        <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="col-span-2 text-primary hover:underline flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customerPhone}
                        </a>
                    </div>
                     <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Dirección:</span>
                        <span className="col-span-2">{order.customerAddress}</span>
                    </div>
                    <hr/>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Producto:</span>
                        <span className="col-span-2">{order.productName}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Cantidad:</span>
                        <span className="col-span-2">{order.quantity}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Precio Unitario:</span>
                        <span className="col-span-2">{formatCurrency(order.unitPrice)}</span>
                    </div>
                     <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Subtotal:</span>
                        <span className="col-span-2 font-bold">{formatCurrency(order.subtotal)}</span>
                    </div>
                    <hr/>
                     <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Método de Pago:</span>
                        <span className="col-span-2">{order.paymentMethod}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Estado:</span>
                        <span className="col-span-2">
                            <Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
                        </span>
                    </div>
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel>Cerrar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  const DeleteOrderItem = ({ orderId }: { orderId: string }) => {
    const { toast } = useToast();
    const [isConfirmOpen, setConfirmOpen] = useState(false);

    const onDelete = async () => {
        try {
            await handleDeleteOrder(orderId);
            toast({
                title: "Pedido Eliminado",
                description: "El pedido ha sido eliminado con éxito.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar el pedido.",
            });
        }
        setConfirmOpen(false);
    }

    return (
      <>
        <DropdownMenuItem onSelect={(e) => {e.preventDefault(); setConfirmOpen(true)}} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
        </DropdownMenuItem>
        <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  const UpdateStatusSubMenu = ({ orderId }: { orderId: string }) => {
    const statuses: OrderStatus[] = ["Pendiente", "En proceso", "Enviado", "Entregado", "Cancelado"];
    const { toast } = useToast();

    const onUpdate = async (status: OrderStatus) => {
        try {
            await handleUpdateStatus(orderId, status);
            toast({
                title: "Estado Actualizado",
                description: `El pedido ahora está: ${status}.`,
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Error al actualizar",
                description: "No se pudo actualizar el estado del pedido.",
            });
        }
    }

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <Edit className="mr-2 h-4 w-4" />
                Actualizar Estado
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    {statuses.map(status => (
                         <DropdownMenuItem key={status} onSelect={() => onUpdate(status)}>
                            {status}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );
  }

  return [
    {
      accessorKey: "customerName",
      header: "Cliente",
    },
    {
      accessorKey: "productName",
      header: "Producto",
    },
    {
      accessorKey: "quantity",
      header: "Cantidad",
    },
    {
      accessorKey: "subtotal",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.getValue("subtotal")),
    },
    {
      accessorKey: "orderStatus",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("orderStatus") as OrderStatus;
        return <Badge variant={getStatusVariant(status)}>{status}</Badge>;
      }
    },
    {
      accessorKey: "orderDate",
      header: "Fecha",
      cell: ({ row }) => {
        const date = row.getValue("orderDate") as string;
        return <span>{new Date(date).toLocaleDateString()}</span>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <ViewOrderDialog order={order} />
                <UpdateStatusSubMenu orderId={order.id} />
                <DeleteOrderItem orderId={order.id} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ];
}

    