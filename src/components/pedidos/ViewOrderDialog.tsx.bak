'use client';

import { useState } from "react";
import { Eye, Mail, Phone, Package } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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

interface ViewOrderDialogProps {
    order: Order;
}

export function ViewOrderDialog({ order }: ViewOrderDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    const isNewFormat = order.items && Array.isArray(order.items);
    const orderItems = isNewFormat ? order.items : [];

    return (
      <>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsOpen(true); }} className="cursor-pointer font-bold">
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
                                                <td className="px-3 py-2 font-medium">{item.productName}</td>
                                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="px-3 py-2 font-medium">{(order as any).productName || 'Producto'}</td>
                                            <td className="px-3 py-2 text-center">{(order as any).quantity || 1}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency((order as any).unitPrice || 0)}</td>
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
                        {(() => {
                            const calculatedFee = (order as any).serviceFee ?? Math.max(0, (order.total || 0) - ((order.subtotal || 0) + (order.deliveryFee || 0) + (order.packagingCost || 0) + ((order as any).vatAmount || Math.round((order.subtotal || 0) * 0.19))));
                            if (calculatedFee <= 0) return null;
                            return (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Tarifa de servicio:</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(calculatedFee)}</span>
                                </div>
                            );
                        })()}
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
}