'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "../../hooks/use-toast";
import { useFirestore, addDocumentNonBlocking } from '../../firebase';
import { collection } from 'firebase/firestore';
import type { ContactMessage } from '../../models/notification';
import { Loader2, Mail, Phone, Instagram, Facebook, ShieldCheck, HeartHandshake, History, Send } from "lucide-react";
import Link from 'next/link';
import { TikTokIcon, WhatsAppIcon } from '../icons';

const countryCodes = [
    { code: "+57", name: "Colombia" },
    { code: "+52", name: "Mexico" },
    { code: "+54", name: "Argentina" },
    { code: "+56", name: "Chile" },
    { code: "+51", name: "Peru" },
    { code: "+1", name: "United States" },
    { code: "+34", name: "Spain" },
    { code: "+593", name: "Ecuador" },
    { code: "+58", name: "Venezuela" },
];

const contactSchema = z.object({
  name: z.string().min(3, "Tu nombre es requerido."),
  email: z.string().email("Por favor, introduce un correo válido."),
  countryCode: z.string().optional(),
  whatsapp: z.string().optional(),
  company: z.string().optional(),
  subject: z.enum(["Soporte técnico", "Información de planes", "Facturación", "Alianzas", "Otro"], { required_error: "Debes seleccionar un asunto." }),
  body: z.string().min(20, "Tu mensaje debe tener al menos 20 caracteres."),
}).refine(data => {
    if (data.whatsapp && !data.countryCode) return false;
    return true;
}, {
    message: "Por favor, selecciona un código de país.",
    path: ["countryCode"],
}).refine(data => {
    if (data.countryCode && !data.whatsapp) return false;
    return true;
}, {
    message: "Por favor, introduce un número.",
    path: ["whatsapp"],
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactFormSpanish() {
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
      const fullWhatsapp = data.countryCode && data.whatsapp ? `${data.countryCode}${data.whatsapp.replace(/\s/g, '')}` : undefined;

      const submissionData: Omit<ContactMessage, 'id' | 'replied' | 'read'> = {
        name: data.name,
        email: data.email,
        whatsapp: fullWhatsapp,
        subject: data.subject,
        body: data.body,
        createdAt: new Date().toISOString(),
        source: 'webform',
      };
      
      if (data.company) {
        (submissionData as any).company = data.company;
      }

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
    { icon: WhatsAppIcon, text: "3228831634", href: "https://api.whatsapp.com/send?phone=3228831634" },
    { icon: Instagram, text: "@ZentryApp", href: "#" },
    { icon: Facebook, text: "ZentryApp", href: "#" },
    { icon: TikTokIcon, text: "@ZentryApp", href: "#" },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-12">
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
                    <Label>WhatsApp/Teléfono</Label>
                    <div className="flex gap-2">
                      <Controller
                        name="countryCode"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="País" />
                            </SelectTrigger>
                            <SelectContent>
                              {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.name})</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Input id="whatsapp" {...register('whatsapp')} placeholder="300 123 4567" className="flex-1" />
                    </div>
                    {errors.countryCode && <p className="text-sm text-destructive">{errors.countryCode.message}</p>}
                    {errors.whatsapp && <p className="text-sm text-destructive">{errors.whatsapp.message}</p>}
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
  );
}
