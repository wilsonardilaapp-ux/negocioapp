'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Order } from '@/models/order';
import { PackingCard } from '@/components/empaque/packing-card';
import { Loader2, PackageSearch } from 'lucide-react';

export default function EmpaquePage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, `businesses/${user.uid}/orders`),
            where('orderStatus', '==', 'En proceso'),
            orderBy('orderDate', 'asc')
        );
    }, [firestore, user]);

    const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

    const handleMarkAsPacked = (orderId: string) => {
        if (!user || !firestore) return;
        const orderRef = doc(firestore, `businesses/${user.uid}/orders`, orderId);
        updateDocumentNonBlocking(orderRef, { orderStatus: 'Enviado' });
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Empaque</CardTitle>
                    <CardDescription>
                        Pedidos listos para ser empacados. Al marcar como "Empacado", el estado cambiará a "Enviado".
                    </CardDescription>
                </CardHeader>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2 text-muted-foreground">Cargando pedidos para empaque...</p>
                </div>
            ) : orders && orders.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {orders.map(order => (
                        <PackingCard key={order.id} order={order} onPack={handleMarkAsPacked} />
                    ))}
                </div>
            ) : (
                <Card className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <PackageSearch className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">Todo está empacado</h3>
                    <p className="mt-2 text-muted-foreground">No hay pedidos listos para empaque en este momento.</p>
                </Card>
            )}
        </div>
    );
}
