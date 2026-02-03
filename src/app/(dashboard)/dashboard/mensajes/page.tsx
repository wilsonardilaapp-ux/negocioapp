"use client";

import { useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
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

export default function MensajesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const submissionsRef = collection(firestore, `businesses/${user.uid}/contactSubmissions`);
    return query(submissionsRef, orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: submissions, isLoading } = useCollection<ContactSubmission>(submissionsQuery);

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `businesses/${user.uid}/contactSubmissions`, submissionId);
    await deleteDoc(docRef);
  };
  
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mensajes de Contacto</CardTitle>
          <CardDescription>Revisa los mensajes enviados desde tu formulario de contacto.</CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Bandeja de Entrada</CardTitle>
            <CardDescription>Aquí puedes ver todos los mensajes recibidos.</CardDescription>
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
