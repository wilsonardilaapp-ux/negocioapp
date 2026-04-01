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

const contactSchema = z.object({
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres.'),
  body: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres.'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactoClientePage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, profile } = useUser();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
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
        read: false,
        replied: false,
        createdAt: new Date().toISOString(),
        source: 'client_contact',
        userId: user.uid,
      };

      const messagesCollection = collection(firestore, 'contactMessages');
      await addDocumentNonBlocking(messagesCollection, submissionData);

      toast({
        title: 'Mensaje Enviado',
        description: 'Tu mensaje ha sido enviado al administrador. Te responderán pronto.',
      });

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
          Envía un mensaje al equipo de soporte de la plataforma. Recibirás una respuesta en tu panel o por correo.
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
            {isSubmitting ? 'Enviando...' : 'Enviar Mensaje a Soporte'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
