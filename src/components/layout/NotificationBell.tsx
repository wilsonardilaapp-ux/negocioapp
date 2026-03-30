'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import type { AdminNotification } from '@/models/notification';

export function NotificationBell() {
    const { user } = useUser();
    const firestore = useFirestore();

    const unreadQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `businesses/${user.uid}/notifications`),
            where('read', '==', false)
        );
    }, [user, firestore]);

    const { data: unreadNotifications } = useCollection<AdminNotification>(unreadQuery);
    const unreadCount = unreadNotifications?.length ?? 0;

    return (
        <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/dashboard/messages" aria-label="Notificaciones">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-xs">
                        {unreadCount}
                    </Badge>
                )}
            </Link>
        </Button>
    );
}
