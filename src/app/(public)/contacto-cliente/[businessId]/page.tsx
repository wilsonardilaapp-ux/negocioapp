'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams } from 'next/navigation';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from '@/firebase';
import { sendClientMessage } from '@/actions/send-client-message';
import { Loader2, Send } from "lucide-react";
import Header from "@/components/layout/header";
import { doc, getDoc } from 'firebase/firestore';
import type { LandingPageData } from '@/models/landing-page';


const contactClientSchema = z.object({
  name: z.string().min(3, "Tu nombre es requerido."),
  email: z.string().email("Por favor, introduce un correo válido."),
  phone: z.string().optional(),
  subject: z.string().min(5, "El asunto es requerido."),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres."),
});

type ContactClientFormData = z.infer<typeof contactClientSchema>;

export default function ContactoClientePage() {
    const { toast } = useToast();
    const { user } = useUser();
    const params = useParams();
    const businessId = params.businessId as string;
    const firestore = useFirestore();

    const [navigation, setNavigation] = React.useState<LandingPageData['navigation'] | null>(null);

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactClientFormData>({
        resolver: zodResolver(contactClientSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            subject: '',
            message: '',
        }
    });
    
    React.useEffect(() => {
        if(user) {
            reset({
                name: user.displayName || '',
                email: user.email || '',
            });
        }
    }, [user, reset]);

    React.useEffect(() => {
      if (!firestore) return;

      const getNavData = async () => {
        try {
          // First, get the main business ID from global config, just like /servicios page
          const configSnap = await getDoc(doc(firestore, "globalConfig", "system"));
          const mainBusinessId = configSnap.exists() ? configSnap.data().mainBusinessId : null;

          if (mainBusinessId) {
            // Then, get the navigation data from that main business's landing page
            const landingSnap = await getDoc(doc(firestore, "businesses", mainBusinessId, "landingPages", "main"));
            if (landingSnap.exists()) {
                const navData = (landingSnap.data() as LandingPageData).navigation;
                setNavigation(navData);
            }
          }
        } catch (error) {
          console.error("Error fetching main navigation data for client contact page:", error);
        }
      };

      getNavData();
    }, [firestore]);


    const onSubmit = async (data: ContactClientFormData) => {
        if (!businessId) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo identificar el negocio a contactar.",
            });
            return;
        }

        const result = await sendClientMessage({
            businessId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
            message: data.message,
        });

        if (result.success) {
            toast({
                title: "¡Mensaje Enviado!",
                description: "Tu mensaje fue enviado correctamente. El negocio se pondrá en contacto contigo pronto.",
            });
            reset();
        } else {
            toast({
                variant: "destructive",
                title: "Hubo un error",
                description: result.error || "No se pudo enviar tu mensaje.",
            });
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50/50">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16">
                <div className="w-full max-w-2xl mx-auto">
                    <Card className="shadow-lg">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl">Contáctanos</CardTitle>
                            <CardDescription>Envíanos tu mensaje y te responderemos lo antes posible.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <CardContent className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nombre completo *</Label>
                                        <Input id="name" {...register('name')} />
                                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Correo electrónico *</Label>
                                        <Input id="email" type="email" {...register('email')} />
                                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono (Opcional)</Label>
                                        <Input id="phone" type="tel" {...register('phone')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Asunto *</Label>
                                        <Input id="subject" {...register('subject')} />
                                        {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Mensaje *</Label>
                                    <Textarea id="message" rows={6} {...register('message')} />
                                    {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </main>
        </div>
    );
}
