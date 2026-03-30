'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function PaymentRemindersTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recordatorios de Pago</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                 <Clock className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Aún no implementado</h3>
                <p className="text-muted-foreground max-w-sm">
                   Aquí podrás ver y gestionar los recordatorios de pago manuales y automáticos para tus clientes.
                </p>
            </CardContent>
        </Card>
    );
}
