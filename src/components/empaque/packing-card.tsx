'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, User, Phone, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Order } from '@/models/order';
import { cn } from '@/lib/utils';

interface PackingCardProps {
  order: Order;
  onPack: (orderId: string) => void;
}

export function PackingCard({ order, onPack }: PackingCardProps) {
    const [timeElapsed, setTimeElapsed] = useState('');
    const [urgencyColor, setUrgencyColor] = useState('border-transparent');

    useEffect(() => {
        const updateTimer = () => {
            const minutes = Math.floor((Date.now() - new Date(order.orderDate).getTime()) / 60000);
            setTimeElapsed(formatDistanceToNow(new Date(order.orderDate), { addSuffix: true, locale: es }));
            
            if (minutes >= 10) {
                setUrgencyColor('border-red-500');
            } else if (minutes >= 5) {
                setUrgencyColor('border-yellow-500');
            } else {
                setUrgencyColor('border-transparent');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [order.orderDate]);
    
    return (
        <Card className={cn("flex flex-col", urgencyColor, "border-2")}>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-3">
                <div className='space-y-1.5'>
                    <CardTitle>Pedido #{order.id.slice(0, 5).toUpperCase()}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{timeElapsed}</span>
                    </div>
                </div>
                <Badge variant={order.customerAddress ? 'default' : 'secondary'}>
                    {order.customerAddress ? 'DOMICILIO' : 'RESTAURANTE'}
                </Badge>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <div className="space-y-2 text-sm border-t pt-3">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className='font-medium'>{order.customerName}</span>
                    </div>
                    {order.customerPhone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>{order.customerPhone}</span>
                        </div>
                    )}
                    {order.customerAddress && (
                        <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                            <span>{order.customerAddress}</span>
                        </div>
                    )}
                </div>
                <div className="border-t pt-3">
                    <p className="font-medium text-sm mb-1">Item a empacar:</p>
                    <div className="p-2 bg-muted rounded-md">
                        <p className="font-semibold">{order.quantity}x {order.productName}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={() => onPack(order.id)}>
                    <Package className="mr-2 h-4 w-4" />
                    Marcar como Empacado
                </Button>
            </CardFooter>
        </Card>
    );
}
