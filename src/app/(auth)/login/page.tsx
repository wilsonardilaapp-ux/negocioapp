'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, initiateEmailSignIn } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { GlobalConfig } from '@/models/global-config';
import { useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const SUPER_ADMIN_UID = "qy2fh98JgYhZnWz682JuPX4A7fU2";

const loginSchema = z.object({
  email: z.string().email({ message: "Introduce un correo electrónico válido." }),
  password: z.string().min(1, { message: "La contraseña es obligatoria." }),
});

const LoadingScreen = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando y verificando sesión...</p>
      </div>
    </div>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [showPassword, setShowPassword] = useState(false);

  const configDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'globalConfig', 'system');
  }, [firestore]);

  const { data: config, isLoading: isConfigLoading } = useDoc<GlobalConfig>(configDocRef);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (!auth) return;
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
      toast({
        title: "Inicio de sesión exitoso",
        description: "Serás redirigido a tu panel.",
      });
      // The FirebaseProvider's onAuthStateChanged will handle the redirection.
    } catch (error: any) {
      // Log the specific Firebase error code to the developer console for debugging
      console.error("Login Error:", error.code, error.message);
      
      toast({
        variant: "destructive",
        title: "Error de Autenticación",
        description: "Credenciales incorrectas. Por favor, verifica tu correo y contraseña.",
      });
    }
  }

  // If auth state is loading or user is already logged in, show loading screen.
  // The provider will handle the redirection.
  if (isUserLoading || user) {
    return <LoadingScreen />;
  }

  // If not loading and no user, show the login form.
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-headline">Acceder a tu Cuenta</CardTitle>
        <CardDescription>
          Introduce tu correo y contraseña para continuar.
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                    <div className="flex items-baseline justify-between">
                        <FormLabel>Contraseña</FormLabel>
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tu contraseña"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-auto p-1 text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      </span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Accediendo..." : "Acceder"}
            </Button>
            <div className="text-sm text-muted-foreground">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="underline text-primary hover:text-primary/80">
                Regístrate aquí
              </Link>
              .
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
