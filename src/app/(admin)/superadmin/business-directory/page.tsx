"use client";

import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, setDoc, arrayUnion, arrayRemove, updateDoc } from "firebase/firestore";
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
import { Search, ShieldAlert, Globe, Star, LayoutPanelTop, Share2, Copy, Tags, Loader2, X, Plus, Trash2, GripVertical } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente para ítem de categoría arrastrable
function SortableCategoryItem({ 
  id, 
  idx, 
  cat, 
  state, 
  isProcessing, 
  updateLocalEdit, 
  handleSaveEdit, 
  handleDeleteCategory, 
  removeSubFromExisting, 
  addSubToExisting 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="border-2 shadow-sm overflow-hidden mb-4 bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
                <div {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-muted rounded text-muted-foreground transition-colors">
                    <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nombre</Label>
                    <Input 
                        value={state.name} 
                        onChange={(e) => updateLocalEdit(idx, "name", e.target.value)}
                        className="font-bold"
                    />
                </div>
            </div>
            <div className="flex gap-1 pt-4">
                <Button size="sm" onClick={() => handleSaveEdit(idx, cat)} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(cat)} disabled={isProcessing}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Subcategorías</Label>
            <div className="flex flex-wrap gap-2 mb-2">
                {state.subcategories.map((sub: string, sIdx: number) => (
                    <Badge key={sIdx} variant="outline" className="gap-1 pl-2 pr-1 h-6 text-[11px] bg-muted/20">
                        {sub}
                        <button onClick={() => removeSubFromExisting(idx, sub)} className="rounded-full hover:bg-muted p-0.5">
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </Badge>
                ))}
            </div>
            <div className="flex gap-2">
                <Input 
                    placeholder="Nueva sub..." 
                    className="h-8 text-xs" 
                    value={state.tempSub}
                    onChange={(e) => updateLocalEdit(idx, "tempSub", e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubToExisting(idx))}
                />
                <Button size="sm" variant="outline" className="h-8" onClick={() => addSubToExisting(idx)}>
                    +
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BusinessDirectoryAdminPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // --- ESTADOS GESTIÓN DE CATEGORÍAS ---
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [tempSubcategory, setTempSubcategory] = useState("");
  const [newCategorySubcategories, setNewCategorySubcategories] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado local para edición de categorías existentes (por índice)
  const [editStates, setEditStates] = useState<Record<number, { name: string, subcategories: string[], tempSub: string }>>({});

  // Suscripción a la configuración global de categorías
  const categoriesConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, "globalConfig", "directoryCategories"), [firestore]);
  const { data: catConfig } = useDoc<any>(categoriesConfigRef);
  const existingCategories = (catConfig?.categories || []) as any[];

  // Inicializar estados de edición cuando se abre el modal o cambia la data
  useEffect(() => {
    if (isManageCategoriesOpen && existingCategories.length > 0) {
      const initialEditStates: any = {};
      existingCategories.forEach((cat, idx) => {
        initialEditStates[idx] = { 
            name: cat.name, 
            subcategories: [...(cat.subcategories || [])],
            tempSub: "" 
        };
      });
      setEditStates(initialEditStates);
    }
  }, [isManageCategoriesOpen, existingCategories]);

  // Sensores para DND
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- LÓGICA DE DIRECTORIO ---
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

  // --- HANDLERS CATEGORÍAS ---

  const addSubToNew = () => {
    if (tempSubcategory.trim()) {
        setNewCategorySubcategories(prev => [...prev, tempSubcategory.trim()]);
        setTempSubcategory("");
    }
  };

  const removeSubFromNew = (val: string) => {
    setNewCategorySubcategories(prev => prev.filter(s => s !== val));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !firestore) return;
    setIsProcessing(true);
    try {
      const configRef = doc(firestore, "globalConfig", "directoryCategories");
      const categoryObject = {
        name: newCategoryName.trim(),
        subcategories: newCategorySubcategories
      };

      await setDoc(configRef, {
        categories: arrayUnion(categoryObject)
      }, { merge: true });

      toast({ title: "Categoría creada" });
      setNewCategoryName("");
      setNewCategorySubcategories([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!firestore) return;
    setIsProcessing(true);
    try {
      const configRef = doc(firestore, "globalConfig", "directoryCategories");
      await updateDoc(configRef, {
        categories: arrayRemove(cat)
      });
      toast({ title: "Categoría eliminada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = async (idx: number, originalCat: any) => {
    if (!firestore || !editStates[idx]) return;
    setIsProcessing(true);
    try {
      const configRef = doc(firestore, "globalConfig", "directoryCategories");
      const updatedCat = {
        name: editStates[idx].name,
        subcategories: editStates[idx].subcategories
      };

      // Firestore no permite actualizar un item de array directamente por índice.
      // Removemos el original e insertamos el nuevo.
      await updateDoc(configRef, { categories: arrayRemove(originalCat) });
      await updateDoc(configRef, { categories: arrayUnion(updatedCat) });

      toast({ title: "Cambios guardados" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && firestore && existingCategories) {
      const oldIndex = existingCategories.findIndex((_, i) => `cat-${i}` === active.id);
      const newIndex = existingCategories.findIndex((_, i) => `cat-${i}` === over?.id);
      
      const newOrder = arrayMove(existingCategories, oldIndex, newIndex);
      
      setIsProcessing(true);
      try {
        const configRef = doc(firestore, "globalConfig", "directoryCategories");
        await setDoc(configRef, { categories: newOrder }, { merge: true });
        toast({ title: "Orden actualizado" });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const updateLocalEdit = (idx: number, field: string, value: any) => {
    setEditStates(prev => ({
        ...prev,
        [idx]: { ...prev[idx], [field]: value }
    }));
  };

  const addSubToExisting = (idx: number) => {
    const val = editStates[idx]?.tempSub?.trim();
    if (val) {
        const currentSubs = editStates[idx].subcategories;
        updateLocalEdit(idx, "subcategories", [...currentSubs, val]);
        updateLocalEdit(idx, "tempSub", "");
    }
  };

  const removeSubFromExisting = (idx: number, val: string) => {
    const currentSubs = editStates[idx].subcategories;
    updateLocalEdit(idx, "subcategories", currentSubs.filter(s => s !== val));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directoryUrl);
    toast({
      title: "Enlace copiado",
      description: "La URL del directorio está lista para compartir.",
    });
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
            <Button onClick={() => setIsManageCategoriesOpen(true)} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                <Tags className="mr-2 h-4 w-4" />
                Gestionar Categorías
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIÁLOGO GESTIÓN DE CATEGORÍAS (TODO EN UNO) */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-black">Gestionar Categorías</DialogTitle>
            <DialogDescription>
                Crea nuevas categorías o administra las existentes y sus subcategorías.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 px-6 overflow-y-auto">
            <div className="space-y-10 py-4">
                {/* SECCIÓN 1: CREAR NUEVA */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <Plus className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-lg">Nueva Categoría</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-2">
                            <Label>Nombre con Emoji</Label>
                            <Input 
                                placeholder="Ej. 🏥 Salud y Medicina" 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                disabled={isProcessing}
                            />
                        </div>

                        <div className="space-y-4">
                            <Label>Subcategorías</Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Ej. Clínicas" 
                                    value={tempSubcategory}
                                    onChange={(e) => setTempSubcategory(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubToNew())}
                                    disabled={isProcessing}
                                />
                                <Button type="button" variant="outline" onClick={addSubToNew} disabled={isProcessing || !tempSubcategory.trim()}>
                                    Añadir
                                </Button>
                            </div>

                            {newCategorySubcategories.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
                                    {newCategorySubcategories.map((sub, index) => (
                                        <Badge key={index} variant="secondary" className="gap-1 pl-2 pr-1 h-7">
                                            {sub}
                                            <button onClick={() => removeSubFromNew(sub)} className="rounded-full hover:bg-muted p-0.5">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <Button onClick={handleCreateCategory} disabled={isProcessing || !newCategoryName.trim()} className="w-full">
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Categoría Completa
                    </Button>
                </section>

                {/* SECCIÓN 2: EXISTENTES (Con Drag & Drop) */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <Tags className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-lg">Categorías Existentes (Arrastra para reordenar)</h3>
                    </div>

                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                            {existingCategories.length > 0 ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={existingCategories.map((_, i) => `cat-${i}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {existingCategories.map((cat, idx) => {
                                            const state = editStates[idx];
                                            if (!state) return null;

                                            return (
                                                <SortableCategoryItem
                                                    key={`cat-${idx}`}
                                                    id={`cat-${idx}`}
                                                    idx={idx}
                                                    cat={cat}
                                                    state={state}
                                                    isProcessing={isProcessing}
                                                    updateLocalEdit={updateLocalEdit}
                                                    handleSaveEdit={handleSaveEdit}
                                                    handleDeleteCategory={handleDeleteCategory}
                                                    removeSubFromExisting={removeSubFromExisting}
                                                    addSubToExisting={addSubToExisting}
                                                />
                                            );
                                        })}
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed">
                                    <p className="text-muted-foreground text-sm">No hay categorías configuradas.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </section>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t">
            <Button variant="ghost" onClick={() => setIsManageCategoriesOpen(false)}>Cerrar Panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}