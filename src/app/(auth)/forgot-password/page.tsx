
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
      toast({
        title: "Correo de recuperación enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
      setIsSent(true);
    } catch (error: any) {
      // Firebase returns 'auth/user-not-found' but for security we don't expose this.
      // We show a generic success message as a good practice.
       toast({
        title: "Correo de recuperación enviado",
        description: "Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.",
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
                Se ha enviado un enlace para restablecer tu contraseña a tu dirección de correo electrónico.
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
