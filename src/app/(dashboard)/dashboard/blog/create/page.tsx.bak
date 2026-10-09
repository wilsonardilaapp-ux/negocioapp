'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPost } from '@/actions/blog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ArrowLeft, Bot, Lock, UploadCloud, Trash2 } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { BlogPost } from '@/models/blog-post';
import { useSubscription } from '@/hooks/useSubscription';
import Image from 'next/image';
import { uploadMedia } from '@/ai/flows/upload-media-flow';


export default function CreatePostPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isPending, startTransition] = useTransition();
    const [content, setContent] = useState('');
    
    // State for image uploader
    const [imageUrl, setImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const { plan, isFree, canAddBlogPosts, limits, isLoading: isSubscriptionLoading } = useSubscription();

    const postsQuery = useMemoFirebase(() => 
        !user || !firestore ? null : query(collection(firestore, 'blog_posts'), where('businessId', '==', user.uid)), 
    [user, firestore]);

    const { data: posts, isLoading: arePostsLoading } = useCollection<BlogPost>(postsQuery);

    const totalPosts = posts?.length ?? 0;
    const isLoading = isSubscriptionLoading || arePostsLoading;

    useEffect(() => {
        if (!isLoading && isFree && !canAddBlogPosts(totalPosts)) {
            // User is at their limit, but might have navigated here directly.
        }
    }, [isLoading, isFree, canAddBlogPosts, totalPosts, router]);
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const mediaDataUri = reader.result as string;
            try {
                const result = await uploadMedia({ mediaDataUri });
                setImageUrl(result.secure_url);
                toast({ title: 'Imagen subida con éxito.' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error al subir', description: error.message });
            } finally {
                setIsUploading(false);
            }
        };
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!imageUrl) {
            toast({
                variant: 'destructive',
                title: 'Imagen Requerida',
                description: 'Por favor, sube o proporciona una URL para la imagen destacada.',
            });
            return;
        }

        const formData = new FormData(event.currentTarget);
        formData.set('content', content);
        formData.set('imageUrl', imageUrl);
        
        if(user) {
            formData.set('businessId', user.uid);
        }

        startTransition(async () => {
            const result = await createPost(formData);
            if (result.success) {
                toast({ title: 'Éxito', description: result.message });
                router.push('/dashboard/blog');
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> Cargando...</div>
    }
    
    if (isFree && !canAddBlogPosts(totalPosts)) {
        return (
             <Card className="text-center">
                <CardHeader>
                    <Lock className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle className="mt-4 text-2xl font-bold">Límite de Posts Alcanzado</CardTitle>
                    <CardDescription>
                        Has utilizado {totalPosts} de {limits.blogPosts} posts disponibles en tu plan {plan.toUpperCase()}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-6">Para crear más artículos, por favor, actualiza tu plan.</p>
                    <div className="flex justify-center gap-4">
                         <Button asChild variant="secondary">
                            <Link href="/dashboard/blog">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al Blog
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/dashboard/subscription">Actualizar a PRO →</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">Crear Nuevo Post</h1>
                <p className="text-muted-foreground">Rellena los campos para publicar un nuevo artículo.</p>
            </div>
            <div className="flex gap-2">
                 <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/blog">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Cancelar
                    </Link>
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isPending ? 'Guardando...' : 'Guardar Post'}
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm">
                     <CardContent className="p-6">
                        <Label htmlFor="title" className="text-base font-semibold">Título del Post</Label>
                        <Input id="title" name="title" placeholder="El título de tu increíble artículo" required className="mt-2 text-lg h-12" />
                    </CardContent>
                </Card>
                 <Card className="shadow-sm">
                     <CardContent className="p-6">
                        <Label className="text-base font-semibold">Contenido Principal</Label>
                        <div className="mt-2">
                            <RichTextEditor value={content} onChange={setContent} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Columna Derecha */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Estado</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="isActive">Publicar</Label>
                            <Switch id="isActive" name="isActive" defaultChecked />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Límite de Posts</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground mb-2">Cargando límite...</p>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-2">
                               {isFree 
                                    ? `Has creado ${totalPosts} de ${limits.blogPosts} posts permitidos.`
                                    : 'Tu plan incluye posts ilimitados ∞'}
                            </p>
                        )}
                        <Progress value={isFree ? (totalPosts / limits.blogPosts) * 100 : 100} />
                    </CardContent>
                </Card>

                 <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Imagen Destacada</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div 
                            className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center p-2 group bg-muted/50 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : imageUrl ? (
                                <>
                                    <Image src={imageUrl} alt="Imagen destacada" fill sizes="100%" className="object-contain rounded-md" />
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                                    <p className="mt-2 text-sm font-semibold">Subir imagen</p>
                                    <p className="text-xs text-muted-foreground">O pega una URL abajo</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

                        <div>
                            <Label htmlFor="imageUrl-input">URL de la Imagen</Label>
                            <Input 
                                id="imageUrl-input" 
                                name="imageUrl" 
                                value={imageUrl} 
                                onChange={(e) => setImageUrl(e.target.value)} 
                                placeholder="https://ejemplo.com/imagen.jpg"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Configuración SEO</CardTitle>
                        <CardDescription>Optimiza tu post para motores de búsqueda.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="seoTitle">Meta Título</Label>
                            <Input id="seoTitle" name="seoTitle" />
                        </div>
                        <div>
                            <Label htmlFor="seoDescription">Meta Descripción</Label>
                            <Input id="seoDescription" name="seoDescription" />
                        </div>
                         <div>
                            <Label htmlFor="seoKeywords">Keywords (separadas por coma)</Label>
                            <Input id="seoKeywords" name="seoKeywords" />
                        </div>
                        <Button variant="outline" className="w-full" type="button">
                            <Bot className="mr-2 h-4 w-4 text-emerald-600" />
                            Generar con IA
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    </form>
  );
}
