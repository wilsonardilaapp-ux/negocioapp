'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AdminNotification } from '@/models/notification';
import MessageList from './components/MessageList';

export default function MessagesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const notificationsQuery = useMemoFirebase(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, `businesses/${user.uid}/notifications`), orderBy('createdAt', 'desc'));
    }, [user?.uid, firestore]);

    const { data: notifications, isLoading } = useCollection<AdminNotification>(notificationsQuery);
    
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Bandeja de Entrada</CardTitle>
                    <CardDescription>
                        Notificaciones y mensajes importantes enviados por el administrador de la plataforma.
                    </CardDescription>
                </CardHeader>
            </Card>
            <MessageList notifications={notifications || []} isLoading={isLoading} />
        </div>
    );
}
