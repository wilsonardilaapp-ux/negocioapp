
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { updatePost } from '@/actions/blog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ArrowLeft, Bot } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { BlogPost } from '@/models/blog-post';

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    const firestore = useFirestore();
    const postId = params.id as string;

    const postDocRef = useMemoFirebase(() => {
        if (!firestore || !postId) return null;
        return doc(firestore, 'blog_posts', postId);
    }, [firestore, postId]);

    const { data: post, isLoading } = useDoc<BlogPost>(postDocRef);
    
    const [content, setContent] = useState('');

    useEffect(() => {
        if (post) {
            setContent(post.content || '');
        }
    }, [post]);
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> Cargando post...</div>
    }

    if (!post) {
        return <div className="text-center">Post no encontrado.</div>
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set('content', content);
        formData.set('id', postId); // Asegurarnos de pasar el ID

        startTransition(async () => {
            const result = await updatePost(formData);
            if (result.success) {
                toast({ title: 'Éxito', description: result.message });
                router.push('/dashboard/blog');
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">Editar Post</h1>
                <p className="text-muted-foreground">Modifica los campos y guarda los cambios.</p>
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
                    {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm">
                     <CardContent className="p-6">
                        <Label htmlFor="title" className="text-base font-semibold">Título del Post</Label>
                        <Input id="title" name="title" defaultValue={post.title} required className="mt-2 text-lg h-12" />
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
                            <Switch id="isActive" name="isActive" defaultChecked={post.isActive} />
                        </div>
                    </CardContent>
                </Card>
                
                 <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Imagen Destacada</CardTitle></CardHeader>
                    <CardContent>
                        <Label htmlFor="imageUrl">URL de la Imagen</Label>
                        <Input id="imageUrl" name="imageUrl" defaultValue={post.imageUrl} required />
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
                            <Input id="seoTitle" name="seoTitle" defaultValue={post.seoTitle} />
                        </div>
                        <div>
                            <Label htmlFor="seoDescription">Meta Descripción</Label>
                            <Input id="seoDescription" name="seoDescription" defaultValue={post.seoDescription} />
                        </div>
                         <div>
                            <Label htmlFor="seoKeywords">Keywords (separadas por coma)</Label>
                            <Input id="seoKeywords" name="seoKeywords" defaultValue={post.seoKeywords?.join(', ')} />
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

