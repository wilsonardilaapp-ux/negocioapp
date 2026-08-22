'use client';

import React, { Suspense } from 'react';
import { ChatbotMenuConfigContent } from '@/components/public-menu-chatbot/ChatbotMenuConfigContent';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * @fileOverview Página de "túnel" para que el Super Admin gestione el bot de plataforma.
 * Se ubica en el área de /superadmin/ para evitar las reglas de redirección del dashboard.
 */
export default function PlatformBotContentPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/superadmin/chatbot-ia">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Contenido del Asistente de Plataforma</h2>
                    <p className="text-sm text-muted-foreground">Estás editando la base de conocimiento oficial de Markix.</p>
                </div>
            </div>

            <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <ChatbotMenuConfigContent businessId="platform-bot" />
            </Suspense>
        </div>
    );
}
