
'use client';

import { useState, useTransition, useEffect } from 'react';
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
import { Save, Loader2, ArrowLeft, Bot } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { useDoc, useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Module } from '@/models/module';
import type { BlogPost } from '@/models/blog-post';

export default function CreatePostPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [isPending, startTransition] = useTransition();
    const [content, setContent] = useState('');
    
    const firestore = useFirestore();

    const blogModuleQuery = useMemoFirebase(() => !firestore ? null : doc(firestore, 'modules', 'blog'), [firestore]);
    
    // Query for posts created by the current user.
    // NOTE: This assumes a `businessId` field on blog posts. If not present, this needs adjustment.
    // For now, we will query all posts and show the global limit.
    const postsQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'blog_posts'), [firestore]);

    const { data: blogModule, isLoading: isModuleLoading } = useDoc<Module>(blogModuleQuery);
    const { data: posts, isLoading: arePostsLoading } = useCollection<BlogPost>(postsQuery);

    const postLimit = blogModule?.limit ?? 50; 
    const postCount = posts?.length ?? 0;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set('content', content);
        
        // Add businessId to the form data
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

    const isLoading = isModuleLoading || arePostsLoading;

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
                               Has creado {postCount} de {postLimit === -1 ? '∞' : postLimit} posts permitidos.
                            </p>
                        )}
                        <Progress value={isLoading || postLimit === -1 ? 0 : (postCount / postLimit) * 100} />
                    </CardContent>
                </Card>

                 <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Imagen Destacada</CardTitle></CardHeader>
                    <CardContent>
                        <Label htmlFor="imageUrl">URL de la Imagen</Label>
                        <Input id="imageUrl" name="imageUrl" placeholder="https://ejemplo.com/imagen.jpg" required />
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
