'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InboxTab from "./components/InboxTab";
import SendNotificationTab from "./components/SendNotificationTab";
import PaymentRemindersTab from "./components/PaymentRemindersTab";
import { Mail, Send, History } from "lucide-react";

export default function NotificationsPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Centro de Notificaciones</CardTitle>
                    <CardDescription>
                        Comunícate con tus clientes, gestiona mensajes y envía recordatorios de pago.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="send" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="inbox"><Mail className="mr-2 h-4 w-4" />Mensajes Entrantes</TabsTrigger>
                    <TabsTrigger value="send"><Send className="mr-2 h-4 w-4" />Enviar Notificación</TabsTrigger>
                    <TabsTrigger value="reminders"><History className="mr-2 h-4 w-4" />Recordatorios de Pago</TabsTrigger>
                </TabsList>
                <TabsContent value="inbox" className="mt-4">
                    <InboxTab />
                </TabsContent>
                <TabsContent value="send" className="mt-4">
                    <SendNotificationTab />
                </TabsContent>
                <TabsContent value="reminders" className="mt-4">
                    <PaymentRemindersTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
