'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { DataTable } from "./data-table";
import { columns } from "./columns";
import type { ContactSubmission } from "@/models/contact-submission";
import { useToast } from '@/hooks/use-toast';

export default function MensajesClientesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const submissionsRef = collection(firestore, `businesses/${user.uid}/contactSubmissions`);
    return query(submissionsRef, orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: submissions, isLoading } = useCollection<ContactSubmission>(submissionsQuery);

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!firestore || !user) return;
    try {
        const docRef = doc(firestore, `businesses/${user.uid}/contactSubmissions`, submissionId);
        await deleteDoc(docRef);
        toast({ title: "Mensaje eliminado", description: "El mensaje ha sido eliminado con éxito." });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo eliminar el mensaje.",
        });
    }
  };
  
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mensajes de Clientes</CardTitle>
          <CardDescription>Revisa los mensajes enviados desde el formulario de contacto de tu landing page.</CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Bandeja de Entrada</CardTitle>
            <CardDescription>Aquí puedes ver todos los mensajes recibidos de tus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
            <DataTable 
                columns={columns({ handleDeleteSubmission })} 
                data={submissions || []} 
                isLoading={isLoading} 
            />
        </CardContent>
      </Card>
    </div>
  );
}
