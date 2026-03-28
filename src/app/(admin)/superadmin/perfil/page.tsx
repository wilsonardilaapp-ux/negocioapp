'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser, useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword } from 'firebase/auth';
import Image from 'next/image';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Pencil, UploadCloud, Trash2 } from 'lucide-react';
import type { User as UserProfile } from '@/models/user';
import type { GlobalConfig } from '@/models/global-config';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  title: z.string().optional(),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    ),
  ]);
};

const MediaUploader = ({
    label,
    mediaUrl,
    onUpload,
    onRemove,
    dimensions,
    isUploading,
    aspectRatio = 'aspect-video',
    isIcon = false,
}: {
    label: string;
    mediaUrl: string | null | undefined;
    onUpload: (file: File) => void;
    onRemove: () => void;
    dimensions: string;
    isUploading: boolean;
    aspectRatio?: string;
    isIcon?: boolean;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await onUpload(file);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div
                className={cn(
                    "relative w-full border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 group",
                    mediaUrl && isIcon ? 'h-24' : (!mediaUrl ? 'h-32' : aspectRatio)
                )}
                onClick={() => !mediaUrl && fileInputRef.current?.click()}
                >
                {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mediaUrl ? (
                    <>
                         {isIcon ? (
                            <div className="relative w-16 h-16 mx-auto">
                                <Image src={mediaUrl} alt={label} fill sizes="4rem" className="object-contain" />
                            </div>
                        ) : (
                            <Image src={mediaUrl} alt={label} layout="fill" sizes="100%" className="object-contain rounded-md" />
                        )}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </>
                ) : (
                    <div className="cursor-pointer">
                        <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm font-semibold">Subir {label}</p>
                        <p className="text-xs text-muted-foreground">{dimensions}</p>
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.ico" />
        </div>
    );
};

const fallbackGlobalConfig: GlobalConfig = {
    id: 'system',
    maintenance: false,
    logoURL: '',
    bannerUrl: '',
    faviconUrl: '',
    theme: 'default',
    supportEmail: 'support@example.com',
    defaultLimits: 100,
    allowUserRegistration: true,
};

export default function SuperAdminProfilePage() {
  const { user, isUserLoading, profile } = useUser(); // Use the profile from the context
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const globalConfigDocRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'system'), [firestore]);
  const { data: globalConfigData, isLoading: isGlobalConfigLoading } = useDoc<GlobalConfig>(globalConfigDocRef);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors, isSubmitting: isChangingPassword }, reset: resetPasswordForm } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if(profile) {
        reset({
            name: profile.name || '',
            title: profile.title || '',
            phone: profile.phone || '',
        });
    }
  }, [profile, reset]);

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    if (!user || !firestore) return;
    const userProfileRef = doc(firestore, 'users', user.uid);
    const dataToSave: Partial<UserProfile> = {
        name: data.name,
        title: data.title,
        phone: data.phone,
        email: profile?.email || user.email!,
        role: 'super_admin',
        status: 'active',
        createdAt: profile?.createdAt || new Date().toISOString(),
    };
    
    setDocumentNonBlocking(userProfileRef, dataToSave, { merge: true });

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
      
      setUploadingField('avatar');
      toast({ title: "Subiendo imagen...", description: "Por favor, espera." });

      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          await new Promise((resolve, reject) => {
              reader.onloadend = async () => {
                  const mediaDataUri = reader.result as string;
                  try {
                      const result = await withTimeout(uploadMedia({ mediaDataUri }), 15000);
                      const userProfileRef = doc(firestore, 'users', user.uid);
                      setDocumentNonBlocking(userProfileRef, { photoURL: result.secure_url }, { merge: true });
                      toast({ title: 'Avatar actualizado!' });
                      resolve(result);
                  } catch(e) {
                      reject(e);
                  }
              };
              reader.onerror = reject;
          });
      } catch (error: any) {
          const errorMessage = error.message === 'TIMEOUT' 
              ? "La subida tardó demasiado. Revisa tu conexión."
              : error.message || "Ocurrió un error desconocido.";
          toast({ variant: 'destructive', title: 'Error al subir', description: errorMessage });
      } finally {
          setUploadingField(null);
      }
  };

  const handleMediaUpload = async (file: File, field: keyof GlobalConfig) => {
    if (!globalConfigDocRef) return;
    
    setUploadingField(field);
    toast({ title: "Subiendo imagen...", description: "Esto puede tardar un momento." });

    try {
        const readFileAsDataURL = (fileToRead: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(fileToRead);
            });
        };

        const mediaDataUri = await readFileAsDataURL(file);
        const result = await withTimeout(uploadMedia({ mediaDataUri }), 15000);
        await setDocumentNonBlocking(globalConfigDocRef, { [field]: result.secure_url }, { merge: true });
        toast({ title: "Imagen actualizada", description: `La imagen de ${field} ha sido guardada.` });

    } catch (error: any) {
        const errorMessage = error.message === 'TIMEOUT'
            ? "La subida tardó demasiado. Revisa tu conexión."
            : error.message || "Ocurrió un error desconocido.";
        toast({ variant: 'destructive', title: "Error al subir", description: errorMessage });
    } finally {
        setUploadingField(null);
    }
  };

  const handleRemoveMedia = async (field: keyof GlobalConfig) => {
    if (!globalConfigDocRef) return;
    await setDocumentNonBlocking(globalConfigDocRef, { [field]: null }, { merge: true });
  };

  const isLoading = isUserLoading || isGlobalConfigLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const globalConfig = globalConfigData ?? fallbackGlobalConfig;

  if (!user || !profile) {
    return <div>No se pudo cargar el perfil del usuario o la configuración global.</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.photoURL || user.photoURL || undefined} alt={profile.name} />
              <AvatarFallback className="text-3xl">
                {profile.name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8 group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingField === 'avatar'}
            >
                {uploadingField === 'avatar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <Badge variant="destructive">{profile.role === 'super_admin' ? 'Super Administrador' : profile.role}</Badge>
              <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>{profile.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6 items-start">
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
                        <Label htmlFor="title">Cargo / Título</Label>
                        <Input id="title" placeholder="Ej: Administrador" {...register('title')} />
                        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" placeholder="Ej: +57 300 123 4567" {...register('phone')} />
                        {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" value={user.email || ''} readOnly disabled />
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
          <div className="space-y-6">
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
            
            <Card>
              <CardHeader>
                <CardTitle>Identidad Visual de la Plataforma</CardTitle>
                <CardDescription>Gestiona el logo y banner que se usarán en la aplicación.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MediaUploader
                  label="Logo de la Aplicación"
                  mediaUrl={globalConfig.logoURL}
                  onUpload={(file) => handleMediaUpload(file, 'logoURL')}
                  onRemove={() => handleRemoveMedia('logoURL')}
                  dimensions="Recomendado: 400x100px"
                  isUploading={uploadingField === 'logoURL'}
                  aspectRatio="aspect-[4/1]"
                />
                <MediaUploader
                  label="Banner Principal"
                  mediaUrl={globalConfig.bannerUrl}
                  onUpload={(file) => handleMediaUpload(file, 'bannerUrl')}
                  onRemove={() => handleRemoveMedia('bannerUrl')}
                  dimensions="Recomendado: 1200x400px"
                  isUploading={uploadingField === 'bannerUrl'}
                  aspectRatio="aspect-[3/1]"
                />
                <MediaUploader
                  label="Favicon"
                  mediaUrl={globalConfig.faviconUrl}
                  onUpload={(file) => handleMediaUpload(file, 'faviconUrl')}
                  onRemove={() => handleRemoveMedia('faviconUrl')}
                  dimensions="Cuadrado: 32x32 o 64x64"
                  isUploading={uploadingField === 'faviconUrl'}
                  aspectRatio="aspect-square"
                  isIcon={true}
                />
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
}
