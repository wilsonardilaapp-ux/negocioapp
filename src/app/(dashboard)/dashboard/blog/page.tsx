'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Frown } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc, type Timestamp } from 'firebase/firestore';
import type { BlogPost } from '@/models/blog-post';
import { PostsTable } from '@/components/blog/posts-table';
import type { Module } from '@/models/module';
import { useSubscription } from '@/hooks/useSubscription';
import BlogLimitBanner from './components/BlogLimitBanner';

export default function BlogPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const blogModuleQuery = useMemoFirebase(() => 
    !firestore ? null : doc(firestore, 'modules', 'blog'), 
  [firestore]);
  
  const { data: blogModule, isLoading: isModuleLoading } = useDoc<Module>(blogModuleQuery);

  // This query now fetches posts without ordering to avoid composite index issues.
  // Sorting will be handled on the client-side.
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
        // Handle both string and Timestamp formats for date
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt) : (a.createdAt as Timestamp).toDate()) : new Date(0);
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt) : (b.createdAt as Timestamp).toDate()) : new Date(0);
        return dateB.getTime() - dateA.getTime(); // Descending order
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
