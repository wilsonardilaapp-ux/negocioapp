'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ContactMessage } from '@/models/notification';
import { Loader2, Mail, Phone, Instagram, Facebook, ShieldCheck, HeartHandshake, History, ArrowLeft, Send } from "lucide-react";
import Link from 'next/link';
import { TikTokIcon, WhatsAppIcon } from '@/components/icons';
import Footer from '@/components/layout/footer';


// Schema for the contact form
const contactSchema = z.object({
  name: z.string().min(3, "Tu nombre es requerido."),
  email: z.string().email("Por favor, introduce un correo válido."),
  whatsapp: z.string().optional(),
  company: z.string().optional(),
  subject: z.enum(["Soporte técnico", "Información de planes", "Facturación", "Alianzas", "Otro"], { required_error: "Debes seleccionar un asunto." }),
  body: z.string().min(20, "Tu mensaje debe tener al menos 20 caracteres."),
});

type ContactFormData = z.infer<typeof contactSchema>;

// Contact Page Component
export default function ContactoPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    if (!firestore) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo conectar a la base de datos." });
        return;
    }

    try {
      const submissionData: Omit<ContactMessage, 'id'> = {
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        subject: data.subject,
        body: data.body,
        read: false,
        replied: false,
        createdAt: new Date().toISOString(),
        source: 'webform',
      };

      const messagesCollection = collection(firestore, 'contactMessages');
      await addDocumentNonBlocking(messagesCollection, submissionData);

      toast({
        title: "¡Mensaje Enviado!",
        description: "Gracias por contactarnos. Te responderemos pronto.",
        className: "bg-green-100 text-green-800 border-green-300",
      });
      reset();
    } catch (error) {
      console.error("Error submitting form: ", error);
      toast({
        variant: "destructive",
        title: "Hubo un error",
        description: "No se pudo enviar tu mensaje. Por favor, intenta de nuevo.",
      });
    }
  };

  const contactInfo = [
    { icon: Mail, text: "soporte@zentry.com", href: "mailto:soporte@zentry.com" },
    { icon: WhatsAppIcon, text: "+57 300 123 4567", href: "https://wa.me/573001234567" },
    { icon: Instagram, text: "@ZentryApp", href: "#" },
    { icon: Facebook, text: "ZentryApp", href: "#" },
    { icon: TikTokIcon, text: "@ZentryApp", href: "#" },
  ];

  return (
    <div className="w-full bg-gray-50/50">
      {/* Header with Back Button */}
      <header className="py-4 bg-white border-b">
        <div className="container mx-auto px-4">
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">Estamos aquí para ayudarte</h1>
          <p className="mt-4 text-lg text-gray-600">
            ¿Tienes una pregunta o necesitas ayuda? Nuestro equipo está listo para asistirte. Respondemos en menos de 24 horas.
          </p>
        </section>

        {/* Form and Contact Info Grid */}
        <div className="grid md:grid-cols-3 gap-12">
          {/* Form */}
          <div className="md:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Envíanos un mensaje</CardTitle>
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
                      <Label htmlFor="whatsapp">WhatsApp/Teléfono</Label>
                      <Input id="whatsapp" {...register('whatsapp')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Empresa</Label>
                      <Input id="company" {...register('company')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Asunto *</Label>
                    <Controller
                        name="subject"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="subject"><SelectValue placeholder="Selecciona un motivo..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Soporte técnico">Soporte técnico</SelectItem>
                                    <SelectItem value="Información de planes">Información de planes</SelectItem>
                                    <SelectItem value="Facturación">Facturación</SelectItem>
                                    <SelectItem value="Alianzas">Alianzas</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Mensaje *</Label>
                    <Textarea id="body" rows={6} {...register('body')} />
                    {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                    {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactInfo.map(info => (
                  <a key={info.text} href={info.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors">
                    <info.icon className="h-5 w-5 text-gray-500" />
                    <span>{info.text}</span>
                  </a>
                ))}
                <div className="flex items-center gap-3 pt-2 border-t">
                    <p className="font-semibold text-sm">Horario: L-V 8am-6pm (CO)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Soporte Rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                 <Button variant="outline" asChild className="w-full justify-start"><Link href="/faq">Preguntas frecuentes</Link></Button>
                 <Button variant="outline" asChild className="w-full justify-start"><Link href="/ayuda">Centro de ayuda</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trust Section */}
        <section className="text-center mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="flex flex-col items-center gap-2">
                    <History className="h-8 w-8 text-primary"/>
                    <p className="font-semibold">Respuesta en menos de 24h</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="h-8 w-8 text-primary"/>
                    <p className="font-semibold">Tus datos están seguros</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <HeartHandshake className="h-8 w-8 text-primary"/>
                    <p className="font-semibold">Soporte personalizado</p>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mt-20 bg-white py-16 rounded-lg shadow-sm">
            <h2 className="text-3xl font-bold text-gray-900">¿Listo para transformar tu negocio?</h2>
            <p className="mt-2 text-gray-600 max-w-xl mx-auto">Únete a miles de negocios que ya están creciendo de forma más inteligente con Zentry.</p>
            <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" asChild><Link href="/register">Empieza gratis hoy</Link></Button>
                <Button size="lg" variant="outline" asChild><Link href="/#precios">Ver planes y precios</Link></Button>
            </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
    