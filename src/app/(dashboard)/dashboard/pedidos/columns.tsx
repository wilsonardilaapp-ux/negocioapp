"use client"

import { useState } from "react";
import Link from 'next/link';
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Trash2, Edit, Mail, Phone, Printer, FileDown, Package } from "lucide-react"
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
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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

  const ViewOrderDialog = ({ order }: { order: Order }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Detección de formato nuevo vs viejo
    const isNewFormat = order.items && Array.isArray(order.items);
    const orderItems = isNewFormat ? order.items : [];

    return (
      <>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsOpen(true); }}>
          <Eye className="mr-2 h-4 w-4" />
          Ver Detalle
        </DropdownMenuItem>
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                <AlertDialogTitle>Detalle del Pedido #{order.id.slice(-7).toUpperCase()}</AlertDialogTitle>
                <AlertDialogDescription>
                    Información completa del pedido realizado por {order.customerName}.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-6 py-4 text-sm max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</span>
                            <p className="font-semibold">{order.customerName}</p>
                        </div>
                         <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Contacto</span>
                            <div className="flex flex-col gap-1">
                                <a href={`mailto:${order.customerEmail}`} className="text-primary hover:underline flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {order.customerEmail}
                                </a>
                                <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {order.customerPhone}
                                </a>
                            </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Dirección de entrega</span>
                            <p>{order.customerAddress || 'Recogida en tienda'}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-bold flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Productos en este pedido
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-3 py-2">Ítem</th>
                                        <th className="px-3 py-2 text-center">Cant.</th>
                                        <th className="px-3 py-2 text-right">Unitario</th>
                                        <th className="px-3 py-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {isNewFormat ? (
                                        orderItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2 font-medium">{item.productName || (item as any).name}</td>
                                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="px-3 py-2 font-medium">{(order as any).productName || (order as any).name || 'Producto'}</td>
                                            <td className="px-3 py-2 text-center">{(order as any).quantity || 1}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency((order as any).unitPrice || (order as any).price || 0)}</td>
                                            <td className="px-3 py-2 text-right font-semibold">{formatCurrency(order.subtotal)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Subtotal Productos:</span>
                            <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                        </div>
                        {isNewFormat && order.discountAmount > 0 && (
                            <div className="flex justify-between items-center text-xs text-green-600 font-bold">
                                <span>{order.discountLabel || 'Descuento'}:</span>
                                <span>-{formatCurrency(order.discountAmount)}</span>
                            </div>
                        )}
                        {(order.packagingCost ?? 0) > 0 && (
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Costo Empaque:</span>
                                <span>{formatCurrency(order.packagingCost!)}</span>
                            </div>
                        )}
                        {(order.deliveryFee ?? 0) > 0 && (
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Costo Envío:</span>
                                <span>{formatCurrency(order.deliveryFee!)}</span>
                            </div>
                        )}
                         {(order.vatAmount ?? 0) > 0 && (
                             <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>IVA:</span>
                                <span>{formatCurrency(order.vatAmount!)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t text-base font-black text-primary">
                            <span>Total del Pedido:</span>
                            <span>{formatCurrency(order.total || order.subtotal)}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 text-xs">
                        <div className="flex items-center gap-2">
                             <span className="font-semibold text-muted-foreground">Pago:</span>
                             <Badge variant="outline" className="capitalize">{order.paymentMethod.replace('_', ' ')}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="font-semibold text-muted-foreground">Estado:</span>
                             <Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
                        </div>
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
            const firstItem = order.items[0].productName || (order.items[0] as any).name || 'Producto';
            const extraCount = order.items.length - 1;
            return (
                <span className="font-medium truncate max-w-[200px] block">
                    {firstItem}
                    {extraCount > 0 ? ` y ${extraCount} más` : ''}
                </span>
            );
        }
        // Fallback para formato viejo
        return <span className="font-medium">{(order as any).productName || (order as any).name || 'N/A'}</span>;
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
                <DeleteOrderItem orderId={order.id} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ];
}
