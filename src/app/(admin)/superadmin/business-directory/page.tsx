"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import type { Business } from "@/models/business";
import { Search, ShieldAlert, Globe, Star, LayoutPanelTop, Share2, Copy, FolderPlus, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { 
  FacebookIcon, 
  InstagramIcon, 
  TikTokIcon, 
  WhatsAppIcon, 
  XIcon 
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function BusinessDirectoryAdminPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Estados para la nueva funcionalidad de categorías
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Resolución dinámica de la URL del directorio
  const directoryUrl = typeof window !== 'undefined' ? `${window.location.origin}/directorio` : '';

  const businessesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "businesses"), orderBy("name", "asc"));
  }, [firestore]);

  const { data: businesses, isLoading } = useCollection<Business>(businessesQuery);

  const filteredEntries = useMemo(() => {
    if (!businesses) return [];
    if (!searchTerm) return businesses;
    const term = searchTerm.toLowerCase();
    return businesses.filter(e => 
      e.name.toLowerCase().includes(term) || 
      (e.category && e.category.toLowerCase().includes(term)) ||
      e.id.toLowerCase().includes(term)
    );
  }, [businesses, searchTerm]);

  const stats = useMemo(() => {
    if (!businesses) return { total: 0, public: 0, approved: 0, hidden: 0 };
    return {
      total: businesses.length,
      public: businesses.filter(e => e.directoryEnabled === true).length,
      approved: businesses.filter(e => e.directoryStatus === 'approved').length,
      hidden: businesses.filter(e => e.directoryStatus === 'hidden' || e.directoryStatus === 'suspended').length,
    };
  }, [businesses]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directoryUrl);
    toast({
      title: "Enlace copiado",
      description: "La URL del directorio está lista para compartir.",
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim() || !firestore) return;
    setIsSavingCategory(true);
    try {
      const configRef = doc(firestore, "globalConfig", "directoryCategories");
      await updateDoc(configRef, {
        categories: arrayUnion(newCategory.trim())
      });
      toast({ 
        title: "Categoría creada", 
        description: `Se ha añadido "${newCategory}" a la lista oficial.` 
      });
      setNewCategory("");
      setIsCreateCategoryOpen(false);
    } catch (error: any) {
      console.error("Error al crear categoría:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudo guardar la nueva categoría." 
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const kpiData = [
    { title: "Total Negocios", value: stats.total, icon: Search, color: "text-blue-600" },
    { title: "Visibles", value: stats.public, icon: Globe, color: "text-green-600" },
    { title: "Aprobados", value: stats.approved, icon: ShieldAlert, color: "text-indigo-600" },
    { title: "Ocultos", value: stats.hidden, icon: Star, color: "text-amber-600" },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-3xl font-black tracking-tight text-gray-900">Moderación del Directorio</CardTitle>
            <CardDescription>
              Gestiona la visibilidad y el estatus de los negocios directamente desde la base central.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                <Link href="/superadmin/business-directory/ads">
                <LayoutPanelTop className="mr-2 h-4 w-4" />
                Gestionar Publicidad (Ads)
                </Link>
            </Button>
            {/* BOTÓN CREAR CATEGORÍA */}
            <Button onClick={() => setIsCreateCategoryOpen(true)} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                <FolderPlus className="mr-2 h-4 w-4" />
                Crear Categoría
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className={cn("h-4 w-4", kpi.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{isLoading ? "..." : kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Listado de Negocios</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nombre o categoría..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={filteredEntries} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>

      {/* SECCIÓN: COMPARTIR DIRECTORIO */}
      <Card className="border-primary/20 bg-primary/5 shadow-lg overflow-hidden border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary text-white rounded-xl shadow-md">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-gray-900">Compartir Directorio Zentry</CardTitle>
              <CardDescription className="text-gray-600">Aumenta el tráfico de la plataforma difundiendo el directorio en tus redes sociales.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <div className="relative group">
                <Input 
                  value={directoryUrl} 
                  readOnly 
                  className="bg-white font-mono text-sm h-12 pr-12 focus-visible:ring-primary border-primary/20 shadow-inner"
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 top-1 h-10 w-10 hover:bg-primary/10 text-primary transition-colors"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" className="bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none h-12 px-6 shadow-md transition-transform hover:scale-105">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(directoryUrl)}`} target="_blank" rel="noopener noreferrer">
                  <FacebookIcon className="h-5 w-5 mr-2" /> Facebook
                </a>
              </Button>

              <Button asChild variant="outline" className="bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-95 border-none h-12 px-6 shadow-md transition-transform hover:scale-105">
                <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
                  <InstagramIcon className="h-5 w-5 mr-2" /> Instagram
                </a>
              </Button>

              <Button asChild variant="outline" className="bg-black text-white hover:bg-black/90 border-none h-12 px-6 shadow-md transition-transform hover:scale-105">
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(directoryUrl)}&text=${encodeURIComponent('🚀 ¡Explora los mejores negocios en el Directorio Zentry! Encuentra servicios verificados y profesionales en un solo lugar.')}`} target="_blank" rel="noopener noreferrer">
                  <XIcon className="h-4 w-4 mr-2" /> Twitter/X
                </a>
              </Button>

              <Button asChild variant="outline" className="bg-black text-white hover:bg-black/90 border-none h-12 px-6 shadow-md transition-transform hover:scale-105">
                <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer">
                  <TikTokIcon className="h-5 w-5 mr-2" /> TikTok
                </a>
              </Button>

              <Button asChild variant="outline" className="bg-[#25D366] text-white hover:bg-[#25D366]/90 border-none h-12 px-6 shadow-md transition-transform hover:scale-105">
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🚀 ¡Mira el nuevo Directorio de Negocios Zentry! Encuentra todo lo que necesitas aquí: ${directoryUrl}`)}`} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-5 w-5 mr-2" /> WhatsApp
                </a>
              </Button>

              <Button asChild variant="outline" className="bg-[#E60023] text-white hover:bg-[#E60023]/90 border-none h-12 px-6 shadow-md transition-transform hover:scale-105">
                <a href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(directoryUrl)}&description=${encodeURIComponent('Directorio Zentry - Negocios y Servicios Verificados')}`} target="_blank" rel="noopener noreferrer">
                  <PinterestIcon className="h-5 w-5 mr-2" /> Pinterest
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIALOGO CREAR CATEGORÍA */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Categoría</DialogTitle>
            <DialogDescription>
              Escribe el nombre de la categoría para añadirla al sistema del directorio.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre de la Categoría</Label>
              <Input 
                id="category-name"
                placeholder="Ej. Spa, Veterinaria, Consultoría..." 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                disabled={isSavingCategory}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateCategoryOpen(false)} disabled={isSavingCategory}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={isSavingCategory || !newCategory.trim()}>
              {isSavingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Añadir Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PinterestIcon(props: any) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      height="1em" 
      width="1em" 
      {...props}
    >
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-1.038 1.411-5.966 1.411-5.966s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.305 2.169 1.482 2.169 1.778 0 3.144-1.875 3.144-4.579 0-2.393-1.72-4.068-4.176-4.068-2.847 0-4.518 2.135-4.518 4.341 0 .859.331 1.781.745 2.281a.238.213 0 01.063.226c-.031.129-.101.516-.131.642-.031.123-.105.151-.231.094-1.002-.465-1.632-1.921-1.632-3.098 0-3.447 2.503-6.613 7.222-6.613 3.793 0 6.74 2.704 6.74 6.315 0 3.766-2.373 6.797-5.665 6.797-1.106 0-2.146-.574-2.502-1.258 0 0-.547 2.083-.68 2.591-.247.946-.913 2.133-1.358 2.853a12.022 12.022 0 003.671.575c6.62 0 11.988-5.367 11.988-11.987.001-6.62-5.368-11.987-11.988-11.987z" />
    </svg>
  );
}
