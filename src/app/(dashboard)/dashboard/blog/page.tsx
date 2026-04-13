
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Frown, Save, Loader2, Image as ImageIcon, UploadCloud, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, type Timestamp, getDoc } from 'firebase/firestore';
import type { BlogPost, BlogAppearanceConfig } from '@/models/blog-post';
import { PostsTable } from '@/components/blog/posts-table';
import type { Module } from '@/models/module';
import { useSubscription } from '@/hooks/useSubscription';
import BlogLimitBanner from './components/BlogLimitBanner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { deletePost } from '@/actions/blog';

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

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div
                className={cn(
                  "relative w-full border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 group",
                  mediaUrl ? (isIcon ? "w-24 h-24" : `${aspectRatio} max-w-[800px] mx-auto`) : (isIcon ? "w-24 h-24" : "h-20")
                )}
                onClick={() => !mediaUrl && fileInputRef.current?.click()}
                >
                {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mediaUrl ? (
                    <>
                        <Image 
                            src={mediaUrl} 
                            alt={label} 
                            fill 
                            sizes={isIcon ? "96px" : "800px"}
                            className="object-cover rounded-md"
                        />
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="icon" className="h-7 w-7 bg-background" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
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
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onUpload(e.target.files[0])} className="hidden" accept="image/*" />
        </div>
    );
};

function BlogHeaderEditor({ businessId }: { businessId: string }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [config, setConfig] = useState<Partial<BlogAppearanceConfig>>({ title: '', content: '', iconName: 'BookOpen', bannerUrl: null, iconUrl: null });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingField, setUploadingField] = useState<'bannerUrl' | 'iconUrl' | null>(null);

    const settingsDocRef = useMemoFirebase(() =>
        doc(firestore, `businesses/${businessId}/settings`, 'blog_appearance'),
        [firestore, businessId]
    );

    useEffect(() => {
        const fetchConfig = async () => {
            if (settingsDocRef) {
                const docSnap = await getDoc(settingsDocRef);
                if (docSnap.exists()) {
                    setConfig(docSnap.data() as BlogAppearanceConfig);
                }
            }
            setIsLoading(false);
        };
        fetchConfig();
    }, [settingsDocRef]);

    const handleImageUpload = async (file: File, field: 'bannerUrl' | 'iconUrl') => {
        setUploadingField(field);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise<void>((resolve, reject) => {
                reader.onloadend = async () => {
                    const mediaDataUri = reader.result as string;
                    try {
                        const result = await uploadMedia({ mediaDataUri });
                        setConfig(c => ({...c, [field]: result.secure_url}));
                        toast({ title: 'Imagen subida con éxito' });
                        resolve();
                    } catch(e) {
                        reject(e);
                    }
                };
                reader.onerror = reject;
            });
        } catch(error: any) {
             toast({ variant: 'destructive', title: 'Error al subir', description: error.message || 'No se pudo cargar la imagen.' });
        } finally {
            setUploadingField(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDocumentNonBlocking(settingsDocRef, config, { merge: true });
            toast({ title: 'Configuración guardada.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al guardar.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <Card><CardContent className="p-6"><Loader2 className="animate-spin h-6 w-6" /></CardContent></Card>;
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración de la Cabecera del Blog</CardTitle>
                <CardDescription>Personaliza el título, descripción y el icono que ven tus visitantes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="blog-title">Título</Label>
                    <Input id="blog-title" value={config.title || ''} onChange={e => setConfig(c => ({...c, title: e.target.value}))} />
                </div>
                <div>
                    <Label htmlFor="blog-content">Descripción</Label>
                    <RichTextEditor
                        value={config.content || ''}
                        onChange={value => setConfig(c => ({...c, content: value}))}
                    />
                </div>
                 <div>
                    <MediaUploader
                        label="Banner del Blog"
                        mediaUrl={config.bannerUrl}
                        onUpload={(file) => handleImageUpload(file, 'bannerUrl')}
                        onRemove={() => setConfig(c => ({...c, bannerUrl: null}))}
                        isUploading={uploadingField === 'bannerUrl'}
                        dimensions="Recomendado: 1200x400px"
                        aspectRatio="aspect-[3/1]"
                    />
                </div>
                 <div>
                    <MediaUploader
                        label="Ícono del Blog (imagen)"
                        mediaUrl={config.iconUrl}
                        onUpload={(file) => handleImageUpload(file, 'iconUrl')}
                        onRemove={() => setConfig(c => ({...c, iconUrl: null}))}
                        isUploading={uploadingField === 'iconUrl'}
                        dimensions="Recomendado: 128x128px"
                        aspectRatio="aspect-square"
                        isIcon={true}
                    />
                </div>
                <div>
                    <Label htmlFor="blog-icon">Nombre del Ícono (si no hay imagen)</Label>
                    <Input id="blog-icon" value={config.iconName || ''} onChange={e => setConfig(c => ({...c, iconName: e.target.value}))} placeholder="Ej: BookOpen" />
                     <p className="text-xs text-muted-foreground mt-1">Busca un nombre de ícono en lucide.dev. Si no se encuentra, se usará uno por defecto.</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Configuración
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function BlogPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const blogModuleQuery = useMemoFirebase(() => 
    !firestore ? null : doc(firestore, 'modules', 'blog'), 
  [firestore]);
  
  const { data: blogModule, isLoading: isModuleLoading } = useDoc<Module>(blogModuleQuery);

  const postsQuery = useMemoFirebase(() => 
    !firestore || !user
      ? null 
      : query(collection(firestore, 'blog_posts'), where('businessId', '==', user.uid)),
    [firestore, user]
  );
  
  const { data: unsortedPosts, isLoading: arePostsLoading } = useCollection<BlogPost>(postsQuery);

  const posts = useMemo(() => {
    if (!unsortedPosts) return [];
    return [...unsortedPosts].sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt) : (a.createdAt as Timestamp).toDate()) : new Date(0);
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt) : (b.createdAt as Timestamp).toDate()) : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
  }, [unsortedPosts]);

  const { plan, isFree, canAddBlogPosts, limits, isLoading: isSubscriptionLoading } = useSubscription();
  
  const totalPosts = posts?.length ?? 0;
  const isLoading = isModuleLoading || arePostsLoading || isSubscriptionLoading;

  const handleDeletePost = async (postId: string) => {
    const result = await deletePost(postId);
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
      // The useCollection hook will automatically update the UI on deletion
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  if (isLoading) {
      return <div>Cargando...</div>
  }

  if (!blogModule || blogModule.status === 'inactive') {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Módulo de Blog Desactivado</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                  <Frown className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
                  <p className="text-muted-foreground max-w-sm">
                      El módulo de "Blog" no está activo en tu plan. Por favor, contacta al administrador de la plataforma para más información.
                  </p>
              </CardContent>
          </Card>
      );
  }

  const canCreate = canAddBlogPosts(totalPosts);

  return (
    <div className="flex flex-col gap-6">
      {user?.uid && <BlogHeaderEditor businessId={user.uid} />}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Tu Blog</CardTitle>
            <CardDescription>
              Gestiona los artículos y publicaciones para tu negocio.
            </CardDescription>
          </div>
          <Button asChild disabled={isFree && !canCreate}>
            <Link href="/dashboard/blog/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Nuevo Post
            </Link>
          </Button>
        </CardHeader>
      </Card>
      
      {isFree && <BlogLimitBanner currentPosts={totalPosts} maxPosts={limits.blogPosts} plan={plan} />}

      <Card>
         <CardHeader>
            <CardTitle>Tus Publicaciones</CardTitle>
            <CardDescription>Listado de todos tus artículos.</CardDescription>
        </CardHeader>
        <CardContent>
          <PostsTable posts={posts || []} isLoading={arePostsLoading} basePath="/dashboard/blog" onDeletePost={handleDeletePost} />
        </CardContent>
      </Card>
    </div>
  );
}
