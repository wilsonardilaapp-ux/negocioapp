'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Printer } from "@/models/printer";
import { useUser, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Loader2, Edit, Trash2, TestTube, Wifi, Usb, Bluetooth } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PrinterListProps {
    printers: Printer[];
    isLoading: boolean;
    onEdit: (printer: Printer) => void;
}

export default function PrinterList({ printers, isLoading, onEdit }: PrinterListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleSetDefault = (printerId: string, isCurrentlyDefault: boolean) => {
        if (isCurrentlyDefault || !user || !firestore) return;
        // Logic to unset other defaults and set the new one
        printers.forEach(p => {
            const printerDocRef = doc(firestore, `businesses/${user.uid}/printers`, p.id);
            if (p.id === printerId) {
                updateDocumentNonBlocking(printerDocRef, { isDefault: true });
            } else if (p.isDefault) {
                updateDocumentNonBlocking(printerDocRef, { isDefault: false });
            }
        });
        toast({ title: 'Impresora por defecto actualizada.' });
    };

    const handleDelete = (printerId: string) => {
        if (!user || !firestore) return;
        const printerDocRef = doc(firestore, `businesses/${user.uid}/printers`, printerId);
        deleteDocumentNonBlocking(printerDocRef);
        toast({ title: "Impresora eliminada", variant: 'destructive' });
    };

    const handleTestPrint = (printerName: string) => {
        toast({ title: 'Enviando prueba de impresión...', description: `Se ha enviado una página de prueba a "${printerName}".` });
    };

    const connectionIcons = {
        network: <Wifi className="h-4 w-4" />,
        usb: <Usb className="h-4 w-4" />,
        bluetooth: <Bluetooth className="h-4 w-4" />,
        wifi: <Wifi className="h-4 w-4" />,
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (printers.length === 0) {
        return (
            <Card>
                <CardContent className="p-10 text-center">
                    <p className="text-muted-foreground">No hay impresoras configuradas. Haz clic en "Añadir Impresora" para empezar.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {printers.map(printer => (
                <Card key={printer.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">{printer.name}</CardTitle>
                        <Switch
                            checked={printer.isDefault}
                            onCheckedChange={() => handleSetDefault(printer.id, printer.isDefault)}
                            id={`default-${printer.id}`}
                            title="Marcar como predeterminada"
                        />
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline" className="capitalize">{printer.type}</Badge>
                            <Badge variant="secondary" className="capitalize flex items-center gap-1">{connectionIcons[printer.connection]} {printer.connection}</Badge>
                            <Badge variant="secondary">{printer.paperWidth}mm</Badge>
                        </div>
                        {printer.connection === 'network' && (
                            <p className="text-xs text-muted-foreground">{printer.ipAddress}:{printer.port}</p>
                        )}
                        <div className="flex gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm" onClick={() => handleTestPrint(printer.name)}><TestTube className="mr-2 h-4 w-4" /> Probar</Button>
                            <Button variant="outline" size="sm" onClick={() => onEdit(printer)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción eliminará la impresora "{printer.name}" y no se puede deshacer.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(printer.id)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
