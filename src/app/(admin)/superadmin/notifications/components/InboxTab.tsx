'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailQuestion } from "lucide-react";

export default function InboxTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Bandeja de Entrada</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                 <MailQuestion className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Aún no implementado</h3>
                <p className="text-muted-foreground max-w-sm">
                   Esta sección mostrará los mensajes recibidos desde el formulario de contacto público y las respuestas de los clientes.
                </p>
            </CardContent>
        </Card>
    );
}
