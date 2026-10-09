'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BlogPost } from '@/models/blog-post';
import { Calendar, Globe, Building2, Tag, FileText, Image as ImageIcon } from 'lucide-react';

interface PostDetailsModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
}

export function formatSafeDate(dateVal: any): string {
  if (!dateVal) return '—';
  let d: Date;
  if (typeof dateVal.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal.seconds) {
    d = new Date(dateVal.seconds * 1000);
  } else {
    d = new Date(dateVal);
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PostDetailsModal({ post, isOpen, onClose }: PostDetailsModalProps) {
  if (!post) return null;

  const negocio = (post as any).businessId ? 'Cliente' : 'Global';
  const fechaSegura = formatSafeDate(post.createdAt);
  const autor = (post as any).author || (post as any).authorName || '—';
  const extracto = post.seoDescription || (post as any).excerpt || '—';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-xl font-bold leading-snug text-foreground">
              {post.title || 'Publicación sin título'}
            </DialogTitle>
            <Badge variant={post.isActive ? 'default' : 'secondary'} className="shrink-0 text-xs uppercase font-bold">
              {post.isActive ? 'Activo' : 'Borrador'}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Detalles técnicos y contenido completo de la publicación (Modo solo lectura)
          </DialogDescription>
        </DialogHeader>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 text-xs pr-1">
          {/* Metadatos en cuadrícula */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-lg border border-border">
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha Creación
              </span>
              <p className="font-medium text-foreground">{fechaSegura}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Negocio
              </span>
              <p className="font-medium text-foreground">{negocio}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                <Globe className="h-3.5 w-3.5 text-primary" /> Slug
              </span>
              <p className="font-mono text-[11px] text-foreground truncate" title={post.slug}>
                {post.slug || '—'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                <Tag className="h-3.5 w-3.5 text-primary" /> Autor
              </span>
              <p className="font-medium text-foreground">{autor}</p>
            </div>

            {post.businessId && (
              <div className="space-y-0.5 sm:col-span-2">
                <span className="text-muted-foreground font-semibold text-[11px]">ID de Negocio</span>
                <p className="font-mono text-[10px] text-foreground truncate">{post.businessId}</p>
              </div>
            )}
          </div>

          {/* Imagen destacada */}
          {post.imageUrl && (
            <div className="space-y-1.5">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Imagen Destacada
              </span>
              <div className="relative w-full h-44 rounded-lg overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Extracto / Descripción SEO */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-semibold">Extracto / Descripción SEO:</span>
            <p className="p-2.5 rounded-md bg-muted/30 border text-foreground leading-relaxed italic">
              {extracto}
            </p>
          </div>

          {/* Contenido Completo */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Contenido del Post:
            </span>
            <div className="p-3.5 rounded-md bg-background border text-foreground max-h-56 overflow-y-auto leading-relaxed prose prose-sm max-w-none">
              {post.content ? (
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              ) : (
                <p className="text-muted-foreground italic">Sin contenido registrado.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="px-5 font-semibold">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
