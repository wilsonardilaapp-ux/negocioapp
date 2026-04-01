'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ContactMessage } from '@/models/notification';
import { Loader2, Send } from 'lucide-react';

const contactAdminSchema = z.object({
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres.'),
  body: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres.'),
});

type ContactAdminFormData = z.infer<typeof contactAdminSchema>;

export default function ContactoAdminPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, profile } = useUser();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactAdminFormData>({
    resolver: zodResolver(contactAdminSchema),
  });
  
  const SUPPORT_PHONE_NUMBER = '+573017395484'; // Número de soporte de destino

  const onSubmit = async (data: ContactAdminFormData) => {
    if (!firestore || !user || !profile) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo verificar la sesión de usuario.' });
      return;
    }

    try {
      const submissionData: Omit<ContactMessage, 'id'> = {
        name: profile.name || user.email!,
        email: user.email!,
        subject: data.subject,
        body: data.body,
        read: false, // El mensaje se marca como no leído para que aparezca en la bandeja
        replied: false,
        createdAt: new Date().toISOString(),
        source: 'admin_form', // Diferenciamos el origen
        userId: user.uid,
      };

      const messagesCollection = collection(firestore, 'contactMessages');
      await addDocumentNonBlocking(messagesCollection, submissionData);

      toast({
        title: 'Mensaje Registrado y Listo para Enviar',
        description: 'Tu mensaje ha sido guardado y se abrirá en WhatsApp.',
      });

      // Abrir WhatsApp con el mensaje pre-llenado
      const whatsappMessage = `*Asunto:* ${data.subject}\n\n*Mensaje:*\n${data.body}\n\n--- Enviado por: ${profile.name} (${user.email}) ---`;
      const whatsappUrl = `https://wa.me/${SUPPORT_PHONE_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappUrl, '_blank');

      reset();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar tu mensaje.' });
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Contactar a Soporte</CardTitle>
        <CardDescription>
          Envía un mensaje al equipo de soporte. Tu mensaje quedará registrado en la bandeja de entrada y se abrirá en WhatsApp para enviarlo.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tu Nombre</Label>
              <Input value={profile?.name || ''} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>Tu Correo</Label>
              <Input value={user?.email || ''} readOnly disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input id="subject" {...register('subject')} />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Mensaje</Label>
            <Textarea id="body" rows={8} {...register('body')} />
            {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="ml-auto">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSubmitting ? 'Enviando...' : 'Registrar y Abrir WhatsApp'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
