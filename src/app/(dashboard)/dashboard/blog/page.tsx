'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Frown, Save, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

function BlogHeaderEditor({ businessId }: { businessId: string }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [config, setConfig] = useState<Partial<BlogAppearanceConfig>>({ title: '', content: '', iconName: 'BookOpen' });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
                <CardDescription>Personaliza el título, descripción y el ícono que ven tus visitantes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="blog-title">Título</Label>
                    <Input id="blog-title" value={config.title || ''} onChange={e => setConfig(c => ({...c, title: e.target.value}))} />
                </div>
                <div>
                    <Label htmlFor="blog-content">Descripción</Label>
                    <Textarea id="blog-content" value={config.content || ''} onChange={e => setConfig(c => ({...c, content: e.target.value}))} />
                </div>
                <div>
                    <Label htmlFor="blog-icon">Nombre del Ícono (Lucide-React)</Label>
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
          <PostsTable posts={posts || []} isLoading={arePostsLoading} basePath="/dashboard/blog" />
        </CardContent>
      </Card>
    </div>
  );
}
