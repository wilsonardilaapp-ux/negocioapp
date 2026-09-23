'use client';

import React, { useState } from "react";
import { 
  Eye, 
  Mail, 
  Phone, 
  Package, 
  User, 
  MapPin, 
  Clock, 
  Check, 
  ArrowRight, 
  Plus, 
  Printer, 
  X 
} from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, OrderStatus } from "@/models/order";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

interface ViewOrderDialogProps {
  order: Order;
}

export function ViewOrderDialog({ order }: ViewOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isNewFormat = order.items && Array.isArray(order.items);
  const orderItems = isNewFormat ? order.items : [];

  // Lógica visual del stepper (solo lectura)
  const isCanceled = order.orderStatus === 'Cancelado';
  const isCompleted = order.orderStatus === 'Entregado';
  const isReady = isCompleted || order.orderStatus === 'Enviado';
  const isPreparing = isReady || order.orderStatus === 'En proceso';
  const isConfirmed = isPreparing || order.orderStatus === 'Pendiente';

  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsOpen(true); }} className="cursor-pointer font-bold">
        <Eye className="mr-2 h-4 w-4" />
        Ver Detalle
      </DropdownMenuItem>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="max-w-2xl sm:max-w-[650px] p-6 sm:p-7 rounded-3xl bg-white shadow-2xl border-0 max-h-[90vh] overflow-y-auto">
          {/* Encabezado */}
          <AlertDialogHeader className="space-y-1 text-left">
            <AlertDialogTitle className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Detalle del Pedido #{order.id.slice(-7).toUpperCase()}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-gray-500 font-normal">
              Información completa del pedido realizado por <span className="capitalize text-gray-700 font-medium">{order.customerName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 pt-2">
            {/* Fila Superior en 2 Columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Tarjeta Izquierda: Cliente, Contacto, Entrega */}
              <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3.5 flex flex-col justify-between">
                {/* Cliente */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CLIENTE</span>
                    <span className="font-bold text-sm text-gray-900 capitalize block leading-tight">{order.customerName}</span>
                  </div>
                </div>

                {/* Contacto */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CONTACTO</span>
                    <div className="flex flex-col gap-0.5">
                      <a href={`mailto:${order.customerEmail}`} className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{order.customerEmail}</span>
                      </a>
                      <a 
                        href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{order.customerPhone}</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 my-0.5" />

                {/* Dirección de Entrega */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">DIRECCIÓN DE ENTREGA</span>
                    <span className="font-bold text-xs sm:text-sm text-emerald-600 block leading-tight">
                      {order.customerAddress || 'Recogida en tienda'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta Derecha: Estado, Fecha y Stepper */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 relative shadow-[0_4px_20px_-4px_rgba(16,185,129,0.12)] flex flex-col justify-between">
                {/* Botón X superior derecho */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-emerald-100/50 transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Badge de Estado y Fecha */}
                <div className="flex flex-col items-center justify-center pt-0.5 pb-2 text-center">
                  <div className={`font-black text-xs px-4 py-1.5 rounded-full tracking-wider shadow-xs uppercase ${
                    isCanceled ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    ESTADO: {order.orderStatus}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium mt-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{isToday(order.orderDate) ? 'Hoy' : formatDateDisplay(order.orderDate)}</span>
                  </div>
                </div>

                {/* Stepper Horizontal de 4 Pasos */}
                <div className="pt-2 pb-1 px-1">
                  <div className="flex items-center justify-between relative">
                    {/* Líneas de conexión */}
                    <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-gray-200 -z-0" />
                    <div 
                      className={`absolute top-3.5 left-6 h-0.5 transition-all duration-300 -z-0 ${
                        isCompleted ? 'w-[calc(100%-48px)] bg-emerald-500' :
                        isReady ? 'w-[70%] bg-emerald-500' :
                        isPreparing ? 'w-[40%] bg-emerald-500' :
                        isConfirmed ? 'w-[15%] bg-emerald-500' : 'w-0'
                      }`} 
                    />

                    {/* Paso 1: Confirmado */}
                    <div className="flex flex-col items-center z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors ${
                        isConfirmed ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-800 mt-1.5 text-center leading-tight">Confirmado</span>
                    </div>

                    {/* Paso 2: Preparando */}
                    <div className="flex flex-col items-center z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors ${
                        isPreparing ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-800 mt-1.5 text-center leading-tight">Preparando</span>
                    </div>

                    {/* Paso 3: Listo para recoger */}
                    <div className="flex flex-col items-center z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors ${
                        isReady ? 'bg-emerald-500 text-white' : 'bg-emerald-50 border-2 border-emerald-500 text-emerald-700'
                      }`}>
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-800 mt-1.5 text-center leading-tight max-w-[55px]">Listo para recoger</span>
                    </div>

                    {/* Paso 4: Completado */}
                    <div className="flex flex-col items-center z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors ${
                        isCompleted ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-300'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-gray-200" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-800 mt-1.5 text-center leading-tight">Completado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Productos en este pedido */}
            <div className="space-y-2 pt-1">
              <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Productos en este pedido
              </h4>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 font-bold text-gray-700">Ítem</th>
                      <th className="px-3 py-2.5 font-bold text-gray-700 text-center">Cantidad</th>
                      <th className="px-4 py-2.5 font-bold text-gray-700 text-right">Precio Unitario</th>
                      <th className="px-4 py-2.5 font-bold text-gray-700 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isNewFormat ? (
                      orderItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                {(item as any).imageUrl || (item as any).image ? (
                                  <img 
                                    src={(item as any).imageUrl || (item as any).image} 
                                    alt={item.productName} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-emerald-600/70" />
                                )}
                              </div>
                              <span className="font-semibold text-gray-900">{item.productName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-700 font-medium">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-black text-gray-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                              <Package className="w-5 h-5 text-emerald-600/70" />
                            </div>
                            <span className="font-semibold text-gray-900">{(order as any).productName || 'Producto'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-700 font-medium">{(order as any).quantity || 1}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{formatCurrency((order as any).unitPrice || 0)}</td>
                        <td className="px-4 py-2.5 text-right font-black text-gray-900">{formatCurrency(order.subtotal)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Caja de Totales */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-1.5 shadow-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-700 font-medium">Subtotal Productos:</span>
                <span className="font-bold text-gray-900">{formatCurrency(order.subtotal)}</span>
              </div>
              {isNewFormat && order.discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
                  <span>{order.discountLabel || 'Descuento'}:</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {(order.packagingCost ?? 0) > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-700">
                  <span>Costo Empaque:</span>
                  <span className="font-semibold">{formatCurrency(order.packagingCost!)}</span>
                </div>
              )}
              {(order.deliveryFee ?? 0) > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-700">
                  <span>Costo Envío:</span>
                  <span className="font-semibold">{formatCurrency(order.deliveryFee!)}</span>
                </div>
              )}
              {(() => {
                const calculatedFee = (order as any).serviceFee ?? Math.max(0, (order.total || 0) - ((order.subtotal || 0) + (order.deliveryFee || 0) + (order.packagingCost || 0) + ((order as any).vatAmount || Math.round((order.subtotal || 0) * 0.19))));
                if (calculatedFee <= 0) return null;
                return (
                  <div className="flex justify-between items-center text-xs text-gray-700">
                    <span>Tarifa de servicio:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(calculatedFee)}</span>
                  </div>
                );
              })()}
              {(order.vatAmount ?? 0) > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-700">
                  <span>IVA:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(order.vatAmount!)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 my-1 pt-2 flex justify-between items-baseline">
                <span className="text-sm sm:text-base font-black text-emerald-700 tracking-tight uppercase">TOTAL DEL PEDIDO:</span>
                <span className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">
                  {formatCurrency(order.total || order.subtotal)}
                </span>
              </div>
            </div>

            {/* Barra Inferior de Acciones */}
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Pago:</span>
                  <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {order.paymentMethod.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/dashboard/pedidos/print/${order.id}`, '_blank')}
                    className="text-xs font-bold text-gray-700 border-gray-300 hover:bg-gray-50 h-9 px-3.5 rounded-lg"
                  >
                    Ver Factura
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => window.open(`/dashboard/pedidos/print/${order.id}`, '_blank')}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Imprimir</span>
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Botón Cerrar subrayado centrado */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-900 underline font-medium text-center w-full py-1 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
