'use client';

import { useState } from 'react';
import { PostDetailsModal } from './post-details-modal';

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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Eye, ExternalLink, Loader2, FileEdit } from 'lucide-react';
import type { BlogPost } from '@/models/blog-post';
import { useRouter } from 'next/navigation';

interface PostsTableProps {
  posts: BlogPost[];
  isLoading: boolean;
  basePath: string; // e.g., '/superadmin/blog' or '/dashboard/blog'
  onDeletePost: (postId: string) => Promise<void>;
  isFiltered?: boolean;
}

function formatPostDate(value: any): string {
  if (!value) return '—';
  try {
    let date: Date | null = null;
    if (typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    if (!date || isNaN(date.getTime())) {
      return '—';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

export function PostsTable({ posts, isLoading, basePath, onDeletePost, isFiltered = false }: PostsTableProps) {
  const router = useRouter();
  const [detailsPost, setDetailsPost] = useState<BlogPost | null>(null);

  const handlePreview = (post: BlogPost) => {
    if (!post.slug) return;
    const businessId = (post as any).businessId || 'global';
    const url = `/blog/${businessId}/${post.slug}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEdit = (postId: string) => {
    router.push(`${basePath}/edit/${postId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    if (isFiltered) {
      return (
        <div className="rounded-md border p-12 text-center text-muted-foreground font-medium text-sm">
          No se encontraron publicaciones con esos filtros
        </div>
      );
    }
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
                {formatPostDate(post.createdAt)}
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
                    {/* 1. Ver detalles */}
                    <DropdownMenuItem onClick={() => setDetailsPost(post)}>
                      <Eye className="mr-2 h-4 w-4" /> Ver detalles
                    </DropdownMenuItem>

                    {/* 2. Preview */}
                    <DropdownMenuItem 
                      onClick={() => handlePreview(post)}
                      disabled={!post.slug || !post.isActive}
                      title={!post.isActive ? 'Publica el post para ver la vista previa' : undefined}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> Preview
                    </DropdownMenuItem>

                    {/* 3. Editar */}
                    <DropdownMenuItem onClick={() => handleEdit(post.id)}>
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                           <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                         </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro de eliminar esta publicación?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El post "{post.title}" será eliminado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDeletePost(post.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Modal de solo lectura: Ver Detalles */}
      <PostDetailsModal
        post={detailsPost}
        isOpen={!!detailsPost}
        onClose={() => setDetailsPost(null)}
      />
    </div>
  );
}
