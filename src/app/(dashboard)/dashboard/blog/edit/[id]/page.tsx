'use client';

import { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { updatePost } from '@/actions/blog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ArrowLeft, Bot, Copy, Check, Facebook, Twitter, Linkedin, Download } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { BlogPost } from '@/models/blog-post';
import { WhatsAppIcon, XIcon, InstagramIcon, TikTokIcon, YoutubeIcon } from '@/components/icons';

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [copied, setCopied] = useState(false);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    
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
    
    const publicUrl = useMemo(() => {
        if (typeof window !== 'undefined' && post?.slug) {
            return `${window.location.origin}/blog/${post.slug}`;
        }
        return '';
    }, [post?.slug]);

    const handleCopy = () => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        toast({ title: 'Enlace copiado al portapapeles' });
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadQR = () => {
        if (!qrCodeRef.current) return;
        html2canvas(qrCodeRef.current, { backgroundColor: null }).then((canvas) => {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `qr-post-${post?.id || 'post'}.png`;
            link.href = dataUrl;
            link.click();
        }).catch(function (error) {
            console.error('Error generando QR:', error);
            toast({
              variant: 'destructive',
              title: 'Error al descargar QR',
              description: 'No se pudo generar la imagen del código QR.',
            });
        });
    };
    
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
                    <CardHeader><CardTitle className="text-base">Enlace Público</CardTitle></CardHeader>
                    <CardContent>
                        <Label htmlFor="publicUrl">URL del Post</Label>
                        <div className="flex items-center space-x-2 mt-2">
                            <Input id="publicUrl" value={publicUrl} readOnly />
                            <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar enlace">
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {publicUrl && (
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Compartir en redes sociales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                            <Button asChild variant="outline" size="sm">
                                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer">
                                    <Facebook className="mr-2" /> Facebook
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer">
                                    <WhatsAppIcon className="mr-2" /> WhatsApp
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer">
                                    <XIcon className="mr-2" /> Twitter/X
                                </a>
                            </Button>
                             <Button asChild variant="outline" size="sm">
                                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer">
                                    <Linkedin className="mr-2" /> LinkedIn
                                </a>
                            </Button>
                             <Button asChild variant="outline" size="sm">
                                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
                                    <InstagramIcon className="mr-2" /> Instagram
                                </a>
                            </Button>
                             <Button asChild variant="outline" size="sm">
                                <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer">
                                    <TikTokIcon className="mr-2" /> TikTok
                                </a>
                            </Button>
                             <Button asChild variant="outline" size="sm">
                                <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">
                                    <YoutubeIcon className="mr-2" /> YouTube
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {publicUrl && (
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Código QR del Enlace Público</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div ref={qrCodeRef} className="bg-white p-4 rounded-md border">
                                <QRCode value={publicUrl} size={150} />
                            </div>
                            <Button onClick={handleDownloadQR} className="w-full">
                                <Download className="mr-2 h-4 w-4" />
                                Descargar Código QR
                            </Button>
                        </CardContent>
                    </Card>
                )}
                
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
