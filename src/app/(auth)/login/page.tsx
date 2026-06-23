
'use client';

import { useState } from 'react';
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
import { useAuth, useUser, initiateEmailSignIn } from '@/firebase';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "Introduce un correo electrónico válido." }),
  password: z.string().min(1, { message: "La contraseña es obligatoria." }),
});

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    
    // Normalización estricta: minúsculas y sin espacios
    const normalizedEmail = values.email.toLowerCase().trim();

    try {
      await initiateEmailSignIn(auth, normalizedEmail, values.password);
    } catch (error: any) {
      console.error("Login Error:", error.code);
      setIsSubmitting(false);
      
      let description = "Revisa tu correo y contraseña.";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Credenciales incorrectas. Si nunca te has registrado en este entorno, por favor crea una cuenta primero.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Demasiados intentos. Intenta más tarde o restablece tu contraseña.";
      } else if (error.code === 'auth/operation-not-allowed') {
        description = "El acceso con contraseña no está habilitado en la consola de Firebase.";
      }

      toast({
        variant: "destructive",
        title: "Error de acceso",
        description,
      });
    }
  }

  if (user || isUserLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Verificando sesión...</p>
        </div>
    );
  }

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-3xl font-black tracking-tight text-primary">Zentry</CardTitle>
        <CardDescription>Accede con tu cuenta de administrador</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="nombre@ejemplo.com" 
                      autoComplete="email"
                      {...field} 
                    />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Contraseña</FormLabel>
                    <Link href="/forgot-password" title="Recuperar acceso" className="text-xs text-primary hover:underline font-medium">
                        ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full font-bold h-12 text-lg shadow-sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando...</>
              ) : (
                "Acceder al Sistema"
              )}
            </Button>
            
            <div className="relative w-full py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">¿Eres nuevo?</span>
              </div>
            </div>

            <Button variant="outline" className="w-full h-11 font-semibold" asChild>
                <Link href="/register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crea tu Cuenta Gratis
                </Link>
            </Button>
            
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 mt-2">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-tight">
                <strong>Nota:</strong> Si cambiaste tu rol o es tu primera vez, asegúrate de haber usado el formulario de registro para que se creen tus credenciales.
              </p>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
