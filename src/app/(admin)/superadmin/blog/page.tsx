
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { BlogPost } from '@/models/blog-post';
import { PostsTable } from '@/components/blog/posts-table';

export default function BlogPage() {
  const firestore = useFirestore();

  // El superadmin ve todos los posts, ordenados por fecha
  const postsQuery = useMemoFirebase(() => 
    !firestore 
      ? null 
      : query(collection(firestore, 'blog_posts'), orderBy('createdAt', 'desc')),
    [firestore]
  );

  const { data: posts, isLoading } = useCollection<BlogPost>(postsQuery);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Blog Profesional</CardTitle>
            <CardDescription>
              Gestiona todas las publicaciones de la plataforma desde aquí.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/superadmin/blog/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Nuevo Post
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
         <CardHeader>
            <CardTitle>Publicaciones</CardTitle>
            <CardDescription>Listado de todos los artículos de la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <PostsTable posts={posts || []} isLoading={isLoading} basePath="/superadmin/blog" />
        </CardContent>
      </Card>
    </div>
  );
}
