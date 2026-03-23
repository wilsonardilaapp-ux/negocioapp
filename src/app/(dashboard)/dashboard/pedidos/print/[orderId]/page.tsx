'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import type { Order } from '@/models/order';
import type { InvoiceSettings } from '@/models/invoice-settings';
import { initialInvoiceSettings } from '@/models/invoice-settings';
import type { Business } from '@/models/business';
import { InvoiceTemplate, type OrderType } from '@/components/invoice/InvoiceTemplate';

const PrintInvoicePage = () => {
    const params = useParams();
    const orderId = params.orderId as string;
    const { user } = useUser();
    const firestore = useFirestore();

    // Data fetching
    const orderDocRef = useMemoFirebase(() => 
        (user && firestore && orderId) ? doc(firestore, `businesses/${user.uid}/orders`, orderId) : null,
        [user, firestore, orderId]
    );
    const settingsDocRef = useMemoFirebase(() => 
        (user && firestore) ? doc(firestore, `businesses/${user.uid}/invoiceSettings`, 'main') : null,
        [user, firestore]
    );
    const businessDocRef = useMemoFirebase(() => 
        (user && firestore) ? doc(firestore, 'businesses', user.uid) : null,
        [user, firestore]
    );

    const { data: order, isLoading: isOrderLoading } = useDoc<Order>(orderDocRef);
    const { data: savedSettings, isLoading: isSettingsLoading } = useDoc<InvoiceSettings>(settingsDocRef);
    const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessDocRef);

    const settings = savedSettings ?? initialInvoiceSettings;

    // Trigger print when data is loaded
    useEffect(() => {
        if (!isOrderLoading && !isSettingsLoading && !isBusinessLoading && order && settings) {
            setTimeout(() => {
                window.print();
            }, 500); // Delay to ensure styles and images are loaded
        }
    }, [isOrderLoading, isSettingsLoading, isBusinessLoading, order, settings]);

    // Adapt data for the template
    const adaptedOrder = useMemo((): OrderType | null => {
        if (!order || !business) return null;

        const deliveryFee = business.deliveryFee ?? 0;
        const packagingFee = business.packagingFee ?? 0;
        
        // The current order model only has one item.
        const items = [{
            name: order.productName,
            quantity: order.quantity,
            price: order.unitPrice,
        }];

        // Subtotal in the order model might be just for the item, let's recalculate for clarity.
        const itemsSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = itemsSubtotal + deliveryFee + packagingFee;

        return {
            invoiceNumber: order.id.slice(-8).toUpperCase(),
            dateTime: new Date(order.orderDate).toLocaleString('es-CO'),
            client: {
                name: order.customerName,
                address: order.customerAddress,
                phone: order.customerPhone,
            },
            paymentMethod: order.paymentMethod,
            estimatedDelivery: 'N/A', // Not available
            items: items,
            deliveryFee: deliveryFee,
            packaging: packagingFee,
            subtotal: itemsSubtotal,
            total: total,
        };
    }, [order, business]);
    
    const isLoading = isOrderLoading || isSettingsLoading || isBusinessLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg">Preparando factura para imprimir...</p>
            </div>
        );
    }
    
    if (!order || !adaptedOrder) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <p className="text-lg text-destructive">Error: No se pudo cargar la información de la factura.</p>
            </div>
        );
    }

    return (
        <div className="bg-white">
            <InvoiceTemplate config={settings} order={adaptedOrder} />
        </div>
    );
};

export default PrintInvoicePage;