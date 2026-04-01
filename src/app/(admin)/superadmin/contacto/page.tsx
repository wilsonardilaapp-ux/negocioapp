'use client';

import { useState } from "react";
import { useFirestore, useUser, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import type { ContactMessage } from "@/models/notification";
import { useToast } from "@/hooks/use-toast";

export default function ContactoAdminPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const messagesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'contactMessages'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: messages, isLoading } = useCollection<ContactMessage>(messagesQuery);

    const handleDeleteMessage = async (messageId: string) => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(doc(firestore, 'contactMessages', messageId));
            toast({ title: "Mensaje eliminado", description: "El mensaje ha sido eliminado con éxito." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el mensaje." });
        }
    };

    const handleUpdateMessage = async (messageId: string, data: Partial<ContactMessage>) => {
         if (!firestore) return;
        try {
            await updateDocumentNonBlocking(doc(firestore, 'contactMessages', messageId), data);
        } catch (error) {
            console.error("Error updating message:", error);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bandeja de Entrada de Contacto</CardTitle>
                    <CardDescription>
                        Administra los mensajes recibidos desde el formulario de contacto principal.
                    </CardDescription>
                </CardHeader>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <DataTable
                        columns={columns({ handleDeleteMessage, handleUpdateMessage })}
                        data={messages || []}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
