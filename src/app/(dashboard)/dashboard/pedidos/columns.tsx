"use client"

import { useState } from "react";
import Link from 'next/link';
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Trash2, Edit, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
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
import { ViewOrderDialog } from "@/components/pedidos/ViewOrderDialog";

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
      case 'Entregado': return 'default';
      case 'Cancelado': return 'destructive';
      default: return 'outline';
    }
};

type ColumnsProps = {
  handleDeleteOrder: (id: string) => Promise<void>;
  handleUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  selectedOrders: string[];
  onSelectAll: (isChecked: boolean) => void;
  onSelectRow: (orderId: string) => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
};

export const columns = ({ handleDeleteOrder, handleUpdateStatus, selectedOrders, onSelectAll, onSelectRow, isAllSelected, isSomeSelected }: ColumnsProps): ColumnDef<Order>[] => {

  const DeleteMessageItem = ({ submissionId }: { submissionId: string }) => {
    const { toast } = useToast();
    const [isConfirmOpen, setConfirmOpen] = useState(false);

    const onDelete = async () => {
        try {
            await handleDeleteOrder(submissionId);
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
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(value) => onSelectAll(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedOrders.includes(row.original.id)}
          onCheckedChange={() => onSelectRow(row.original.id)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "customerName",
      header: "Cliente",
    },
    {
      id: "productSummary",
      header: "Pedido",
      cell: ({ row }) => {
        const order = row.original;
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            const firstItem = order.items[0].productName || 'Producto';
            const extraCount = order.items.length - 1;
            return (
                <span className="font-medium truncate max-w-[200px] block">
                    {firstItem}
                    {extraCount > 0 ? ` y ${extraCount} más` : ''}
                </span>
            );
        }
        return <span className="font-medium">{(order as any).productName || 'N/A'}</span>;
      }
    },
    {
      id: "totalQuantity",
      header: "Cant.",
      cell: ({ row }) => {
        const order = row.original;
        if (order.items && Array.isArray(order.items)) {
            const total = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            return <span>{total}</span>;
        }
        return <span>{(order as any).quantity || 0}</span>;
      }
    },
    {
      id: "totalAmount",
      header: "Total",
      cell: ({ row }) => {
          const order = row.original;
          return <span className="font-bold text-primary">{formatCurrency(order.total || order.subtotal)}</span>;
      }
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
        return <span className="text-xs whitespace-nowrap">{new Date(date).toLocaleDateString()}</span>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/pedidos/print/${order.id}`} target="_blank" rel="noopener noreferrer">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Factura
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DeleteMessageItem submissionId={order.id} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ];
}
