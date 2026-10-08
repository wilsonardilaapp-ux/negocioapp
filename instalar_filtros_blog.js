const fs = require('fs');
const path = require('path');

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`[BACKUP CREADO] ${backupPath}`);
  }
}

console.log('=== INSTALACIÓN DE FILTROS EN BLOG PROFESIONAL ===\n');

// 1. CREAR src/components/blog/blog-filters.tsx (NUEVO)
const filtersPath = path.join('src', 'components', 'blog', 'blog-filters.tsx');
const filtersContent = `'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';

export interface BlogFilterState {
  search: string;
  status: string; // 'all' | 'active' | 'draft'
  business: string; // 'all' | 'Cliente' | 'Global'
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  sort: string; // 'recent' | 'oldest' | 'title-asc' | 'title-desc'
}

interface BlogFiltersProps {
  filters: BlogFilterState;
  onFilterChange: (filters: BlogFilterState) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  businessOptions: string[];
}

export function BlogFilters({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  businessOptions,
}: BlogFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sincronizar input local con filtros externos (por ejemplo al limpiar)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce de 300 ms en la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.business !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sort !== 'recent';

  return (
    <div className="space-y-3 pb-2">
      {/* Fila 1: Búsqueda y Selects de Estado / Negocio / Orden */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Barra de búsqueda con icono */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Controles de Filtro */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select Estado */}
          <Select
            value={filters.status}
            onValueChange={(val) => onFilterChange({ ...filters, status: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estado: Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
            </SelectContent>
          </Select>

          {/* Select Negocio */}
          <Select
            value={filters.business}
            onValueChange={(val) => onFilterChange({ ...filters, business: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Negocio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Negocio: Todos</SelectItem>
              {businessOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Select Orden */}
          <Select
            value={filters.sort}
            onValueChange={(val) => onFilterChange({ ...filters, sort: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[145px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="title-asc">Título A-Z</SelectItem>
              <SelectItem value="title-desc">Título Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fila 2: Rango de Fechas, Contador y Limpiar Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-border/60 text-xs">
        {/* Filtros de Fecha */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground font-medium text-[11px]">Fecha:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">Desde:</span>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
              className="h-8 text-xs w-[130px] p-1.5"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">Hasta:</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
              className="h-8 text-xs w-[130px] p-1.5"
            />
          </div>

          {/* Botón Limpiar filtros */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Contador de Resultados */}
        <div className="text-muted-foreground text-[11px] font-medium self-end sm:self-auto">
          Mostrando <strong className="text-foreground">{filteredCount}</strong> de <strong className="text-foreground">{totalCount}</strong> publicaciones
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filtersPath, filtersContent, 'utf8');
console.log(`[CREADO] ${filtersPath}`);


// 2. MODIFICAR src/components/blog/posts-table.tsx (EXISTENTE - RESPALDO .bak)
const tablePath = path.join('src', 'components', 'blog', 'posts-table.tsx');
backupFile(tablePath);

let tableContent = fs.readFileSync(tablePath, 'utf8');

// A. Agregar prop isFiltered opcional a la interfaz
if (!tableContent.includes('isFiltered?: boolean')) {
  tableContent = tableContent.replace(
    'onDeletePost: (postId: string) => Promise<void>;',
    'onDeletePost: (postId: string) => Promise<void>;\n  isFiltered?: boolean;'
  );
}

// B. Agregar isFiltered a los parámetros de desestructuración
if (!tableContent.includes('isFiltered = false')) {
  tableContent = tableContent.replace(
    'export function PostsTable({ posts, isLoading, basePath, onDeletePost }: PostsTableProps)',
    'export function PostsTable({ posts, isLoading, basePath, onDeletePost, isFiltered = false }: PostsTableProps)'
  );
}

// C. Manejar el estado vacío cuando hay filtros activos
const emptyCheck = `  if (posts.length === 0) {
    if (isFiltered) {
      return (
        <div className="rounded-md border p-12 text-center text-muted-foreground font-medium text-sm">
          No se encontraron publicaciones con esos filtros
        </div>
      );
    }`;

if (!tableContent.includes('if (isFiltered)')) {
  tableContent = tableContent.replace('  if (posts.length === 0) {', emptyCheck);
  fs.writeFileSync(tablePath, tableContent, 'utf8');
  console.log(`[MODIFICADO ADITIVO] ${tablePath} actualizado con soporte para estado vacío de filtros.`);
}


// 3. MODIFICAR src/app/(admin)/superadmin/blog/page.tsx (EXISTENTE - RESPALDO .bak)
const pagePath = path.join('src', 'app', '(admin)', 'superadmin', 'blog', 'page.tsx');
backupFile(pagePath);

let pageContent = fs.readFileSync(pagePath, 'utf8');

// A. Importar useMemo, useState y BlogFilters
if (!pageContent.includes('BlogFilters')) {
  pageContent = `import { useState, useMemo } from 'react';\nimport { BlogFilters, type BlogFilterState } from '@/components/blog/blog-filters';\n` + pageContent;
}

// B. Inyectar estado de filtros y lógica de useMemo dentro de BlogPage
const anchorPage = 'export default function BlogPage() {';
const filterLogic = `export default function BlogPage() {
  const [filters, setFilters] = useState<BlogFilterState>({
    search: '',
    status: 'all',
    business: 'all',
    dateFrom: '',
    dateTo: '',
    sort: 'recent',
  });

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      business: 'all',
      dateFrom: '',
      dateTo: '',
      sort: 'recent',
    });
  };`;

if (!pageContent.includes('const [filters, setFilters]')) {
  pageContent = pageContent.replace(anchorPage, filterLogic);
}

// C. Inyectar filteredPosts y businessOptions
const postsQueryAnchor = `  const { data: posts, isLoading } = useCollection<BlogPost>(postsQuery);`;
const memoLogic = `  const { data: posts, isLoading } = useCollection<BlogPost>(postsQuery);

  // Valores únicos de negocio existentes en los posts cargados
  const businessOptions = useMemo(() => {
    if (!posts) return [];
    const set = new Set<string>();
    posts.forEach((p: any) => {
      set.add(p.businessId ? 'Cliente' : 'Global');
    });
    return Array.from(set);
  }, [posts]);

  // Filtrado y ordenamiento en memoria sin duplicar estado
  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    const normalize = (t: string) => (t || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");

    return posts.filter((post: any) => {
      // 1. Filtro por búsqueda de título
      if (filters.search.trim()) {
        const queryNorm = normalize(filters.search.trim());
        const titleNorm = normalize(post.title || '');
        if (!titleNorm.includes(queryNorm)) return false;
      }

      // 2. Filtro por estado
      if (filters.status === 'active' && !post.isActive) return false;
      if (filters.status === 'draft' && post.isActive) return false;

      // 3. Filtro por negocio
      if (filters.business !== 'all') {
        const neg = post.businessId ? 'Cliente' : 'Global';
        if (neg !== filters.business) return false;
      }

      // 4. Filtro por fechas (no excluye si los campos de fecha están vacíos)
      if (filters.dateFrom || filters.dateTo) {
        let postDate: Date | null = null;
        if (post.createdAt) {
          if (typeof post.createdAt.toDate === 'function') {
            postDate = post.createdAt.toDate();
          } else {
            const d = new Date(post.createdAt);
            if (!isNaN(d.getTime())) postDate = d;
          }
        }
        if (!postDate) return false; // si se fijó fecha y el post tiene fecha inválida, se excluye

        const ymd = postDate.toISOString().slice(0, 10);
        if (filters.dateFrom && ymd < filters.dateFrom) return false;
        if (filters.dateTo && ymd > filters.dateTo) return false;
      }

      return true;
    }).sort((a: any, b: any) => {
      // 5. Ordenamiento
      if (filters.sort === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (filters.sort === 'title-desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (filters.sort === 'oldest') {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime() || 0;
        const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime() || 0;
        return da - db;
      }
      // 'recent' por defecto
      const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime() || 0;
      const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime() || 0;
      return db - da;
    });
  }, [posts, filters]);

  const isFiltered =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.business !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sort !== 'recent';`;

if (!pageContent.includes('const filteredPosts = useMemo')) {
  pageContent = pageContent.replace(postsQueryAnchor, memoLogic);
}

// D. Insertar <BlogFilters /> entre CardHeader y PostsTable
const tableCardAnchor = `<CardContent>`;
const replacementContent = `<CardContent className="space-y-4">
          <BlogFilters
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            totalCount={posts?.length || 0}
            filteredCount={filteredPosts.length}
            businessOptions={businessOptions}
          />`;

if (pageContent.includes(tableCardAnchor) && !pageContent.includes('<BlogFilters')) {
  pageContent = pageContent.replace(tableCardAnchor, replacementContent);
  pageContent = pageContent.replace('posts={posts || []}', 'posts={filteredPosts}\n            isFiltered={isFiltered}');
  fs.writeFileSync(pagePath, pageContent, 'utf8');
  console.log(`[MODIFICADO ADITIVO] ${pagePath} actualizado con BlogFilters integrado.`);
}

console.log('\n=== INSTALACIÓN COMPLETADA CON ÉXITO ===');
