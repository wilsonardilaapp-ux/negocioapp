'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer as PrinterIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Printer } from '@/models/printer';
import PrinterForm from './components/PrinterForm';
import PrinterList from './components/PrinterList';

export default function PrintersPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

    const printersQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `businesses/${user.uid}/printers`), orderBy('name'));
    }, [user, firestore]);

    const { data: printers, isLoading } = useCollection<Printer>(printersQuery);

    const handleOpenForm = (printer: Printer | null) => {
        setEditingPrinter(printer);
        setIsFormOpen(true);
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Gestión de Impresoras</CardTitle>
                        <CardDescription>
                            Configura las impresoras para tickets, facturas y órdenes de cocina.
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Impresora
                    </Button>
                </CardHeader>
            </Card>

            <PrinterList
                printers={printers || []}
                isLoading={isLoading}
                onEdit={handleOpenForm}
            />

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingPrinter ? 'Editar Impresora' : 'Añadir Nueva Impresora'}</DialogTitle>
                        <DialogDescription>
                            Completa los detalles de la impresora.
                        </DialogDescription>
                    </DialogHeader>
                    <PrinterForm
                        existingPrinter={editingPrinter}
                        onClose={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
