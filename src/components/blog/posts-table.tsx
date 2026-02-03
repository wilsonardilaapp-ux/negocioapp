
'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Loader2, FileEdit } from 'lucide-react';
import type { BlogPost } from '@/models/blog-post';
import { useRouter } from 'next/navigation';

interface PostsTableProps {
  posts: BlogPost[];
  isLoading: boolean;
  basePath: string; // e.g., '/superadmin/blog' or '/dashboard/blog'
}

export function PostsTable({ posts, isLoading, basePath }: PostsTableProps) {
  const router = useRouter();

  const handleEdit = (postId: string) => {
    router.push(`${basePath}/edit/${postId}`);
  };
  
  // En una futura implementación, esto llamaría a una server action para eliminar
  const handleDelete = (postId: string) => {
    alert(`Funcionalidad para eliminar el post ${postId} no implementada.`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-4 p-10 min-h-[300px]">
        <FileEdit className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Aún no hay publicaciones</h3>
        <p className="text-muted-foreground max-w-sm">
          Haz clic en "Crear Nuevo Post" para empezar a compartir tu contenido con el mundo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha de Creación</TableHead>
            <TableHead>Negocio</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="font-medium">{post.title}</TableCell>
              <TableCell>
                <Badge variant={post.isActive ? 'default' : 'secondary'}>
                  {post.isActive ? 'Activo' : 'Borrador'}
                </Badge>
              </TableCell>
              <TableCell>
                {post.createdAt ? new Date(post.createdAt as string).toLocaleDateString() : 'N/A'}
              </TableCell>
              <TableCell>
                {(post as any).businessId ? <Badge variant="outline">Cliente</Badge> : <Badge variant="outline">Global</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(post.id)}>
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(post.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
