'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword } from 'firebase/auth';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera } from 'lucide-react';
import type { User as UserProfile } from '@/models/user';
import { uploadMedia } from '@/ai/flows/upload-media-flow';

const profileSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  phone: z.string().optional(),
  title: z.string().optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export default function SuperAdminProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
      if (!isUserLoading) setIsProfileLoading(false);
      return;
    }
    
    let isMounted = true;
    const fetchProfile = async () => {
      setIsProfileLoading(true);
      const SUPER_ADMIN_EMAILS = ['allseosoporte@gmail.com'];
      
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (isMounted) {
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else if (SUPER_ADMIN_EMAILS.includes(user.email ?? '')) {
            const fallbackProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || 'Super Admin',
              email: user.email!,
              role: 'super_admin',
              status: 'active',
              createdAt: user.metadata.creationTime || new Date().toISOString(),
              lastLogin: user.metadata.lastSignInTime || new Date().toISOString(),
            };
            setUserProfile(fallbackProfile);
          } else {
            setUserProfile(null);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (isMounted) setUserProfile(null);
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    };

    fetchProfile();

    return () => { isMounted = false; };
  }, [user, firestore, isUserLoading]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });
  
  useEffect(() => {
    if(userProfile) {
        reset({
            name: userProfile.name || '',
            phone: (userProfile as any)?.phone || '',
            title: (userProfile as any)?.title || '',
        });
    }
  }, [userProfile, reset]);

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors, isSubmitting: isChangingPassword }, reset: resetPasswordForm } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    if (!user || !firestore) return;
    const userProfileRef = doc(firestore, 'users', user.uid);
    setDocumentNonBlocking(userProfileRef, data, { merge: true });
    
    setUserProfile(prev => prev ? { ...prev, ...data } as UserProfile : null);

    toast({
      title: 'Perfil Actualizado',
      description: 'Tu información ha sido guardada con éxito.',
    });
  };
  
  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
      if (!user) {
          toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para cambiar la contraseña.' });
          return;
      }
      try {
          await updatePassword(user, data.newPassword);
          toast({ title: 'Contraseña actualizada', description: 'Tu contraseña ha sido cambiada con éxito.' });
          resetPasswordForm();
      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Error al cambiar contraseña',
              description: 'Esta operación es sensible y requiere un inicio de sesión reciente. Por favor, vuelve a iniciar sesión e inténtalo de nuevo.',
          });
      }
  };
  
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !user || !firestore) return;
      
      setIsUploading(true);
      toast({ title: "Subiendo imagen...", description: "Por favor, espera." });

      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = async () => {
              const userProfileRef = doc(firestore, 'users', user.uid);
              const mediaDataUri = reader.result as string;
              const result = await uploadMedia({ mediaDataUri });
              setDocumentNonBlocking(userProfileRef, { photoURL: result.secure_url }, { merge: true });
              setUserProfile(prev => prev ? { ...prev, photoURL: result.secure_url } as UserProfile & { photoURL?: string } : null);
              toast({ title: 'Avatar actualizado!' });
          };
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error al subir', description: error.message });
      } finally {
          setIsUploading(false);
      }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!user || !userProfile) {
    return <div>No se pudo cargar el perfil del usuario.</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24">
              <AvatarImage src={(userProfile as any).photoURL || user.photoURL || undefined} alt={userProfile.name} />
              <AvatarFallback className="text-3xl">
                {userProfile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8 group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold">{userProfile.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <Badge variant="destructive">{userProfile.role === 'super_admin' ? 'Super Administrador' : userProfile.role}</Badge>
              <Badge variant={userProfile.status === 'active' ? 'default' : 'secondary'}>{userProfile.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tus datos personales.</CardDescription>
            </CardHeader>
             <form onSubmit={handleSubmit(onProfileSubmit)}>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input id="name" {...register('name')} />
                        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" value={user.email || ''} readOnly disabled />
                    </div>
                    <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" {...register('phone')} />
                    </div>
                    <div>
                        <Label htmlFor="title">Cargo / Título</Label>
                        <Input id="title" {...register('title')} />
                    </div>
                </CardContent>
                 <div className="p-6 pt-0">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </div>
            </form>
          </Card>
           <Card>
            <CardHeader>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>Gestiona la seguridad de tu cuenta.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
                <CardContent className="space-y-4">
                     <div>
                        <Label htmlFor="newPassword">Nueva Contraseña</Label>
                        <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
                        {passwordErrors.newPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input id="confirmPassword" type="password" {...registerPassword('confirmPassword')} />
                        {passwordErrors.confirmPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword.message}</p>}
                    </div>
                     <p className="text-xs text-muted-foreground">
                        Último acceso: {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}
                    </p>
                </CardContent>
                <div className="p-6 pt-0">
                    <Button type="submit" variant="outline" disabled={isChangingPassword}>
                         {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Actualizar Contraseña
                    </Button>
                </div>
            </form>
          </Card>
      </div>
    </div>
  );
}
