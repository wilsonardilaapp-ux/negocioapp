const fs = require('fs');
const path = require('path');

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`[BACKUP CREADO] ${backupPath}`);
  }
}

console.log('=== IMPLEMENTANDO "VER DETALLES" Y "PREVIEW" EN BLOG ===\n');

// 1. CREAR src/components/blog/post-details-modal.tsx (NUEVO)
const modalPath = path.join('src', 'components', 'blog', 'post-details-modal.tsx');
const modalContent = `'use client';

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
`;

fs.writeFileSync(modalPath, modalContent, 'utf8');
console.log(`[CREADO] ${modalPath}`);


// 2. MODIFICAR src/components/blog/posts-table.tsx (EXISTENTE)
const tablePath = path.join('src', 'components', 'blog', 'posts-table.tsx');
backupFile(tablePath);

let tableContent = fs.readFileSync(tablePath, 'utf8');

// A. Imports requeridos
if (!tableContent.includes('PostDetailsModal')) {
  tableContent = `import { useState } from 'react';\nimport { PostDetailsModal } from './post-details-modal';\n` + tableContent;
}

// B. Agregar iconos Eye y ExternalLink
if (!tableContent.includes('Eye,')) {
  tableContent = tableContent.replace('import { MoreHorizontal, Edit, Trash2', 'import { MoreHorizontal, Edit, Trash2, Eye, ExternalLink');
}

// C. Estado para el modal de detalles
const routerAnchor = 'const router = useRouter();';
const stateLogic = `const router = useRouter();
  const [detailsPost, setDetailsPost] = useState<BlogPost | null>(null);

  const handlePreview = (post: BlogPost) => {
    if (!post.slug) return;
    const businessId = (post as any).businessId;
    const url = businessId ? \`/blog/\${businessId}/\${post.slug}\` : \`/blog/\${post.slug}\`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };`;

if (!tableContent.includes('const [detailsPost, setDetailsPost]')) {
  tableContent = tableContent.replace(routerAnchor, stateLogic);
}

// D. Insertar "Ver detalles" y "Preview" en el DropdownMenuContent
const oldMenuHeader = `<DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(post.id)}>
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>`;

const newMenuHeader = `<DropdownMenuContent align="end">
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
                    </DropdownMenuItem>`;

if (tableContent.includes(oldMenuHeader)) {
  tableContent = tableContent.replace(oldMenuHeader, newMenuHeader);
  console.log('✅ Menú desplegable actualizado con "Ver detalles" y "Preview".');
}

// E. Renderizar PostDetailsModal al final del componente
const closingAnchor = `    </div>
  );
}`;

const modalMount = `      {/* Modal de solo lectura: Ver Detalles */}
      <PostDetailsModal
        post={detailsPost}
        isOpen={!!detailsPost}
        onClose={() => setDetailsPost(null)}
      />
    </div>
  );
}`;

if (!tableContent.includes('<PostDetailsModal')) {
  tableContent = tableContent.replace(closingAnchor, modalMount);
  console.log('✅ <PostDetailsModal /> montado al final de PostsTable.');
}

fs.writeFileSync(tablePath, tableContent, 'utf8');
console.log('\n=== IMPLEMENTACIÓN FINALIZADA CON ÉXITO ===');
