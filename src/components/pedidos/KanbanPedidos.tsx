
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Printer, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Store,
  ArrowRight,
  Loader2
} from 'lucide-react';
import type { Order, OrderStatus } from '@/models/order';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import { OrderCardMenu } from './OrderCardMenu';

interface KanbanPedidosProps {
  orders: Order[];
  isLoading: boolean;
  handleUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onViewDetails: (order: Order) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function KanbanPedidos({ orders, isLoading, handleUpdateStatus, onViewDetails }: KanbanPedidosProps) {
  const columns = useMemo(() => {
    return {
      mesa: {
        title: "EN RESTAURANTE (MESA)",
        icon: <Store className="h-4 w-4 text-blue-600" />,
        items: orders.filter(o => o.tipoEntrega === 'recoger_en_tienda' || (o.origin && o.origin.startsWith('mesa')))
      },
      domicilio: {
        title: "DOMICILIOS / RECOGIDA",
        icon: <MapPin className="h-4 w-4 text-orange-600" />,
        items: orders.filter(o => o.tipoEntrega === 'domicilio' && !(o.origin && o.origin.startsWith('mesa')))
      }
    };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {Object.entries(columns).map(([key, column]) => (
        <div key={key} className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
                <div className="p-1.5 bg-muted rounded-lg">{column.icon}</div>
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-700">{column.title}</h3>
             </div>
             <Badge variant="secondary" className="font-black text-[10px] h-5">{column.items.length}</Badge>
          </div>

          <div className="space-y-4 min-h-[500px] p-2 rounded-2xl bg-muted/20 border-2 border-dashed border-muted">
            {column.items.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                handleUpdateStatus={handleUpdateStatus}
                onViewDetails={onViewDetails}
              />
            ))}
            {column.items.length === 0 && (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
                <Package className="h-8 w-8" />
                <span className="text-[10px] font-bold uppercase">Sin pedidos</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, handleUpdateStatus, onViewDetails }: { 
    order: Order, 
    handleUpdateStatus: (id: string, status: OrderStatus) => Promise<void>,
    onViewDetails: (order: Order) => void
}) {
  const [timeText, setTimeText] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTimeText(formatDistanceToNow(new Date(order.orderDate), { locale: es }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [order.orderDate]);

  const isMesa = order.origin && order.origin.startsWith('mesa');
  const mesaNumber = isMesa ? order.origin?.split('-')[1] : null;

  return (
    <Card className="shadow-sm border-gray-100 hover:shadow-md transition-all group border-l-4 border-l-primary/10 hover:border-l-primary">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
              #{order.id.slice(-7).toUpperCase()}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <Clock className="h-3 w-3" />
              <span>Hace {timeText}</span>
            </div>
          </div>
          <OrderCardMenu order={order} handleUpdateStatus={handleUpdateStatus} onViewDetails={onViewDetails} />
        </div>

        <div className="space-y-1">
          <p className="font-bold text-sm text-gray-900 leading-tight truncate">{order.customerName}</p>
          <div className="flex flex-wrap gap-1.5">
            {isMesa ? (
              <Badge variant="outline" className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 border-blue-200">Mesa {mesaNumber}</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] font-black uppercase bg-orange-50 text-orange-700 border-orange-200">
                {order.tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recogida'}
              </Badge>
            )}
            <Badge variant="outline" className="text-[9px] font-black uppercase bg-gray-50 text-gray-600 border-gray-200">Pendiente de Pago</Badge>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-dashed">
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <Package className="h-3 w-3" />
                {order.items?.length || 1} { (order.items?.length || 1) === 1 ? 'ítem' : 'ítems' }
            </div>
            <span className="font-black text-primary text-sm">{formatCurrency(order.total || order.subtotal)}</span>
        </div>
      </CardContent>
      <CardFooter className="p-2 pt-0 flex gap-1">
        <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 h-8 text-[9px] font-bold uppercase gap-1.5 hover:bg-primary/5 hover:text-primary"
            onClick={() => window.open(`/dashboard/pedidos/print/${order.id}`, '_blank')}
        >
            <Printer className="h-3 w-3" /> Comanda
        </Button>
        <Button 
            onClick={() => handleUpdateStatus(order.id, 'Entregado')}
            variant="ghost" 
            size="sm" 
            className="flex-1 h-8 text-[9px] font-bold uppercase gap-1.5 hover:bg-green-50 hover:text-green-700"
        >
            <CheckCircle2 className="h-3 w-3" /> Entregar
        </Button>
      </CardFooter>
    </Card>
  );
}
