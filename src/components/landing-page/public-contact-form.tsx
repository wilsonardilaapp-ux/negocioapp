'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { FormSection } from '@/models/landing-page';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ContactSubmission } from '@/models/contact-submission';
import { useMemo } from 'react';

interface PublicContactFormProps {
  formConfig: FormSection;
  businessId: string;
}

export function PublicContactForm({ formConfig, businessId }: PublicContactFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Dynamically generate Zod schema from formConfig
  const formSchema = useMemo(() => {
    const schemaObject: { [key: string]: z.ZodType<any, any> } = {};
    formConfig.fields.forEach(field => {
      let zodType;
      switch (field.type) {
        case 'email':
          zodType = z.string().email({ message: 'Por favor, introduce un correo electrónico válido.' });
          break;
        case 'textarea':
          zodType = z.string().min(10, { message: 'El mensaje es demasiado corto.' });
          break;
        case 'tel':
             zodType = z.string(); // Optional phone number
             break;
        default:
          zodType = z.string().min(1, { message: `El campo ${field.label} es requerido.` });
      }
      if (!field.required) {
        zodType = zodType.optional().or(z.literal(""));
      }
      schemaObject[field.id] = zodType;
    });
    return z.object(schemaObject);
  }, [formConfig.fields]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: { [key: string]: string }) => {
    if (!firestore) return;

    const nameField = formConfig.fields.find(f => f.label.toLowerCase().includes('nombre'))?.id;
    const emailField = formConfig.fields.find(f => f.type === 'email')?.id;
    const whatsappField = formConfig.fields.find(f => f.type === 'tel' || f.label.toLowerCase().includes('whatsapp'))?.id;
    const messageField = formConfig.fields.find(f => f.type === 'textarea')?.id;

    const messageContent = messageField ? data[messageField] : 'Sin mensaje.';
    const whatsappValue = whatsappField ? data[whatsappField] : undefined;
      
    const submissionData: Omit<ContactSubmission, 'id'> = {
      businessId: businessId,
      formId: 'main', 
      sender: nameField ? data[nameField] : 'No especificado',
      email: emailField ? data[emailField] : 'no-reply@example.com',
      message: messageContent,
      date: new Date().toISOString(),
      ...(whatsappValue && { whatsapp: whatsappValue }),
    };
    
    const submissionsCollection = collection(firestore, `businesses/${businessId}/contactSubmissions`);
    addDocumentNonBlocking(submissionsCollection, submissionData);

    toast({
      title: "Mensaje Enviado",
      description: "¡Gracias por contactarnos! Te responderemos pronto.",
    });

    reset();
  };

  return (
    <section id="contact" className="py-16 px-4 bg-background w-full">
      <div className="md:max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Formulario de Contacto</CardTitle>
            <CardDescription>Ponte en contacto con nosotros.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {formConfig.fields.map(field => {
                const error = errors[field.id];
                if (field.type === 'textarea') {
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>{field.label}{field.required && ' *'}</Label>
                      <Textarea id={field.id} placeholder={field.placeholder} required={field.required} {...register(field.id)} className="text-base py-3 px-4" />
                      {error && <p className="text-sm text-destructive">{error.message as string}</p>}
                    </div>
                  );
                }
                return (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}{field.required && ' *'}</Label>
                    <Input id={field.id} type={field.type} placeholder={field.placeholder} required={field.required} {...register(field.id)} className="text-base py-3 px-4 h-12" />
                    {error && <p className="text-sm text-destructive">{error.message as string}</p>}
                  </div>
                );
              })}
              <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </section>
  );
}
