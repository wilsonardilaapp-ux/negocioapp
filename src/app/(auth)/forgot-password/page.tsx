"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Loader2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Introduce un correo electrónico válido." }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const [isSent, setIsSent] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, values.email);
      
      // BLINDAJE DE SEGURIDAD: Mensaje idéntico tanto si el correo existe como si no.
      toast({
        title: "Correo de recuperación enviado",
        description: "Si tu cuenta está registrada en Markix, recibirás un enlace para restablecer tu contraseña en unos minutos.",
      });
      setIsSent(true);
    } catch (error: any) {
      // Manejo silencioso de errores de Firebase para evitar enumeración de usuarios
      // Solo mostramos error real si es un problema técnico (ej. red)
      if (error.code === 'auth/network-request-failed') {
          toast({
            variant: "destructive",
            title: "Error de conexión",
            description: "No se pudo contactar con el servidor. Inténtalo de nuevo más tarde.",
          });
          return;
      }

      // Para cualquier otro error (usuario no encontrado, etc.), procedemos con la respuesta genérica y éxito visual
      toast({
        title: "Correo de recuperación enviado",
        description: "Si tu cuenta está registrada en Markix, recibirás un enlace para restablecer tu contraseña en unos minutos.",
      });
      setIsSent(true);
    }
  }

  if (isSent) {
    return (
         <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-headline">Revisa tu correo</CardTitle>
                <CardDescription>
                  Si el correo proporcionado está asociado a una cuenta activa en Markix, hemos enviado las instrucciones para restablecer tu acceso.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button className="w-full" asChild>
                    <Link href="/login">Volver a inicio de sesión</Link>
                </Button>
            </CardFooter>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-headline">Recuperar Contraseña</CardTitle>
        <CardDescription>
          Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="nombre@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Volver a inicio de sesión
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
