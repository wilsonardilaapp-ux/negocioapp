'use client';

import React, { Suspense } from 'react';
import { useUser } from '@/firebase';
import { ChatbotMenuConfigContent } from '@/components/public-menu-chatbot/ChatbotMenuConfigContent';
import { Loader2 } from 'lucide-react';

export default function ChatbotMenuConfigPage() {
    const { user } = useUser();

    if (!user) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ChatbotMenuConfigContent businessId={user.uid} />
        </Suspense>
    );
}
