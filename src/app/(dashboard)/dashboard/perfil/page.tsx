
'use client';

import { useState, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword } from 'firebase/auth';
import Image from 'next/image';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, UploadCloud, Pencil, Trash2 } from 'lucide-react';
import type { Business } from '@/models/business';
import type { Subscription } from '@/models/subscription';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const profileSchema = z.object({
  name: z.string().min(3, { message: "El nombre del negocio debe tener al menos 3 caracteres." }),
  contactEmail: z.string().email({ message: "Introduce un correo electrónico válido." }),
  phone: z.string().optional(),
  description: z.string().optional(),
  vatRate: z.preprocess(val => val === '' ? undefined : Number(val), z.number().min(0).optional()),
  deliveryFee: z.preprocess(val => val === '' ? undefined : Number(val), z.number().min(0).optional()),
  packagingFee: z.preprocess(val => val === '' ? undefined : Number(val), z.number().min(0).optional()),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

const MediaUploader = ({
    label,
    mediaUrl,
    onUpload,
    onRemove,
    dimensions,
    isUploading
}: {
    label: string;
    mediaUrl: string | null | undefined;
    onUpload: (file: File) => void;
    onRemove: () => void;
    dimensions: string;
    isUploading: boolean;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="relative group aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center p-2">
                {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mediaUrl ? (
                    <>
                        <Image src={mediaUrl} alt={label} layout="fill" sizes="100%" className="object-contain rounded-md" />
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm font-semibold">Subir {label}</p>
                        <p className="text-xs text-muted-foreground">{dimensions}</p>
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onUpload(e.target.files[0])} className="hidden" accept="image/*,.ico" />
        </div>
    );
};


export default function ClientProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const businessDocRef = useMemoFirebase(() => user ? doc(firestore, 'businesses', user.uid) : null, [firestore, user]);
  const subscriptionDocRef = useMemoFirebase(() => user ? doc(firestore, `businesses/${user.uid}/subscription`, 'current') : null, [firestore, user]);
  
  const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessDocRef);
  const { data: subscription, isLoading: isSubLoading } = useDoc<Subscription>(subscriptionDocRef);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      name: business?.name || '',
      contactEmail: business?.contactEmail || user?.email || '',
      phone: business?.phone || '',
      description: business?.description || '',
      vatRate: business?.vatRate ?? 0,
      deliveryFee: business?.deliveryFee ?? 0,
      packagingFee: business?.packagingFee ?? 0,
    }
  });
  
  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors, isSubmitting: isChangingPassword }, reset: resetPasswordForm } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    if (!businessDocRef) return;
    setDocumentNonBlocking(businessDocRef, data, { merge: true });
    toast({
      title: 'Perfil Actualizado',
      description: 'La información de tu negocio ha sido guardada con éxito.',
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
  
  const handleMediaUpload = async (file: File, field: keyof Business) => {
    if (!businessDocRef) return;
    setUploadingField(field);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const mediaDataUri = reader.result as string;
        try {
            const result = await uploadMedia({ mediaDataUri });
            setDocumentNonBlocking(businessDocRef, { [field]: result.secure_url }, { merge: true });
            toast({ title: "Imagen actualizada", description: `Tu ${field} ha sido guardado.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error al subir", description: error.message });
        } finally {
            setUploadingField(null);
        }
    };
  };

  const handleRemoveMedia = (field: keyof Business) => {
    if (!businessDocRef) return;
    setDocumentNonBlocking(businessDocRef, { [field]: null }, { merge: true });
  };
  
  const handleDeleteAccount = () => {
    // Placeholder for deletion logic
    toast({
        variant: 'destructive',
        title: 'Acción no implementada',
        description: 'La eliminación de la cuenta se implementará en una futura actualización.',
    });
  };
  
  const isLoading = isUserLoading || isBusinessLoading || isSubLoading;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={business?.avatarUrl || business?.logoURL} alt={business?.name} />
            <AvatarFallback className="text-3xl">{business?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold">{business?.name}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <Badge variant={subscription?.plan === 'free' ? 'secondary' : 'default'} className="capitalize">{subscription?.plan || 'Free'}</Badge>
              <Badge variant={subscription?.status === 'active' ? 'default' : 'destructive'} className="capitalize">{subscription?.status || 'Inactive'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onProfileSubmit)}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Negocio</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email de Contacto</Label>
                  <Input id="contactEmail" type="email" {...register('contactEmail')} />
                  {errors.contactEmail && <p className="text-sm text-destructive mt-1">{errors.contactEmail.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" {...register('phone')} />
                </div>
                <div>
                  <Label htmlFor="description">Descripción Corta</Label>
                  <Textarea id="description" {...register('description')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                   <div>
                      <Label htmlFor="vatRate">I.V.A (%)</Label>
                      <Input id="vatRate" type="number" {...register('vatRate')} placeholder="ej. 19" />
                  </div>
                  <div>
                      <Label htmlFor="deliveryFee">Domicilio ($)</Label>
                      <Input id="deliveryFee" type="number" {...register('deliveryFee')} placeholder="ej. 5000" />
                  </div>
                  <div>
                      <Label htmlFor="packagingFee">Paquete ($)</Label>
                      <Input id="packagingFee" type="number" {...register('packagingFee')} placeholder="ej. 1000"/>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Identidad de Marca</CardTitle>
                  <CardDescription>Sube las imágenes que representan a tu negocio.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <MediaUploader
                      label="Logo"
                      mediaUrl={business?.logoURL}
                      onUpload={(file) => handleMediaUpload(file, 'logoURL')}
                      onRemove={() => handleRemoveMedia('logoURL')}
                      dimensions="Cuadrado (e.g., 512x512)"
                      isUploading={uploadingField === 'logoURL'}
                  />
                  <MediaUploader
                      label="Avatar"
                      mediaUrl={business?.avatarUrl}
                      onUpload={(file) => handleMediaUpload(file, 'avatarUrl')}
                      onRemove={() => handleRemoveMedia('avatarUrl')}
                      dimensions="Cuadrado (e.g., 200x200)"
                      isUploading={uploadingField === 'avatarUrl'}
                  />
                  <MediaUploader
                      label="Banner"
                      mediaUrl={business?.bannerUrl}
                      onUpload={(file) => handleMediaUpload(file, 'bannerUrl')}
                      onRemove={() => handleRemoveMedia('bannerUrl')}
                      dimensions="Rectangular (e.g., 1200x400)"
                      isUploading={uploadingField === 'bannerUrl'}
                  />
                  <MediaUploader
                      label="Favicon"
                      mediaUrl={business?.faviconUrl}
                      onUpload={(file) => handleMediaUpload(file, 'faviconUrl')}
                      onRemove={() => handleRemoveMedia('faviconUrl')}
                      dimensions="Pequeño (e.g., 32x32)"
                      isUploading={uploadingField === 'faviconUrl'}
                  />
              </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
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
                    Último acceso: {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}
                </p>
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="outline" disabled={isChangingPassword}>
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Actualizar Contraseña
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta acción es irreversible. Se eliminarán todos los datos de tu negocio, incluyendo productos, páginas y configuraciones.
              </p>
            </CardContent>
            <CardFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Eliminar mi cuenta</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán permanentemente todos los datos de tu cuenta.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                                Sí, eliminar mi cuenta
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
