'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import type { Invoice } from '@/types/billing';
import type { InvoiceSettings } from '@/models/invoice-settings';
import { initialInvoiceSettings } from '@/models/invoice-settings';
import type { Business } from '@/models/business';
import { InvoiceTemplate, type OrderType } from '@/components/invoice/InvoiceTemplate';

/**
 * @fileOverview Página dedicada a la impresión térmica de facturas del POS.
 * Utiliza el motor InvoiceTemplate para garantizar compatibilidad con 58mm/80mm.
 */
const PrintPOSInvoicePage = () => {
    const params = useParams();
    const invoiceId = params.invoiceId as string;
    const { user } = useUser();
    const firestore = useFirestore();

    // 1. Obtener Datos
    const invoiceRef = useMemoFirebase(() => 
        (user && firestore && invoiceId) ? doc(firestore, `businesses/${user.uid}/invoices`, invoiceId) : null,
        [user, firestore, invoiceId]
    );
    const settingsRef = useMemoFirebase(() => 
        (user && firestore) ? doc(firestore, `businesses/${user.uid}/invoiceSettings`, 'main') : null,
        [user, firestore]
    );
    const businessRef = useMemoFirebase(() => 
        (user && firestore) ? doc(firestore, 'businesses', user.uid) : null,
        [user, firestore]
    );

    const { data: invoice, isLoading: loadingInv } = useDoc<Invoice>(invoiceRef);
    const { data: savedSettings, isLoading: loadingSet } = useDoc<InvoiceSettings>(settingsRef);
    const { data: business, isLoading: loadingBiz } = useDoc<Business>(businessRef);

    const settings = savedSettings ?? initialInvoiceSettings;

    // 2. Disparar Impresión
    useEffect(() => {
        if (!loadingInv && !loadingSet && !loadingBiz && invoice && settings) {
            // Pequeño delay para asegurar carga de fuentes/QR
            const timer = setTimeout(() => {
                window.print();
                // Opcional: Cerrar ventana tras imprimir
                // window.close();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loadingInv, loadingSet, loadingBiz, invoice, settings]);

    // 3. Adaptar Modelo POS a Plantilla Universal
    const adaptedOrder = useMemo((): OrderType | null => {
        if (!invoice || !business) return null;

        return {
            invoiceNumber: invoice.consecutiveNumber,
            dateTime: new Date(invoice.createdAt).toLocaleString('es-CO'),
            client: {
                name: invoice.customer.name,
                address: invoice.customer.address || 'Venta POS',
                phone: invoice.customer.phone || 'N/A',
            },
            paymentMethod: invoice.paymentMethod.toUpperCase(),
            estimatedDelivery: 'ENTREGA INMEDIATA',
            items: invoice.items.map(i => ({
                name: i.name,
                quantity: i.quantity,
                price: i.unitPrice
            })),
            subtotal: invoice.subtotal,
            deliveryFee: 0,
            packaging: 0,
            total: invoice.total
        };
    }, [invoice, business]);
    
    const isLoading = loadingInv || loadingSet || loadingBiz;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-black uppercase tracking-widest text-slate-400">Preparando Ticket...</p>
            </div>
        );
    }
    
    if (!invoice || !adaptedOrder) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white p-10 text-center">
                <p className="text-lg font-bold text-red-600 uppercase">Error: No se pudo cargar el registro de venta.</p>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <style type="text/css" media="print">
            {`
                @page { size: auto; margin: 0mm; }
                body { margin: 0; padding: 0; background: white !important; }
                header, footer, nav, aside { display: none !important; }
            `}
            </style>
            <div className="flex justify-center pt-4">
                <InvoiceTemplate 
                    config={settings} 
                    order={adaptedOrder} 
                    businessId={user?.uid} 
                />
            </div>
        </div>
    );
};

export default PrintPOSInvoicePage;
