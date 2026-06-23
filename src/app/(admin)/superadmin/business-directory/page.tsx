
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, writeBatch } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import type { BusinessDirectoryEntry } from "@/models/business-directory";
import type { Business } from "@/models/business";
import { Search, ShieldAlert, Globe, Star, LayoutPanelTop, RefreshCw, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function BusinessDirectoryAdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Consulta de entradas actuales del directorio
  const directoryQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "businessDirectory"), orderBy("updatedAt", "desc"));
  }, [firestore]);

  // Consulta de TODOS los negocios del sistema para sincronización
  const businessesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "businesses");
  }, [firestore]);

  const { data: entries, isLoading } = useCollection<BusinessDirectoryEntry>(directoryQuery);
  const { data: allBusinesses } = useCollection<Business>(businessesQuery);

  const handleSync = async () => {
    if (!firestore || !allBusinesses || !entries) return;
    setIsSyncing(true);
    try {
      const batch = writeBatch(firestore);
      let newEntriesCount = 0;

      for (const business of allBusinesses) {
        // Verificar si el negocio ya tiene una entrada en el directorio
        const exists = entries.some(e => e.businessId === business.id);
        if (!exists) {
          const newEntryRef = doc(collection(firestore, "businessDirectory"));
          const newEntry: BusinessDirectoryEntry = {
            id: newEntryRef.id,
            businessId: business.id,
            name: business.name,
            description: business.description || "Nuevo negocio registrado en la plataforma.",
            logoUrl: business.logoURL || null,
            category: 'Otro',
            tags: [],
            isVerified: false,
            featured: false,
            rating: 5,
            reviewCount: 0,
            listingDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending',
            publicProfile: false, // Por defecto oculto hasta moderación
          };
          batch.set(newEntryRef, newEntry);
          newEntriesCount++;
        }
      }

      if (newEntriesCount > 0) {
        await batch.commit();
        toast({ 
            title: "Sincronización Completada", 
            description: `Se han añadido ${newEntriesCount} negocios para moderación.` 
        });
      } else {
        toast({ 
            title: "Directorio al día", 
            description: "No se encontraron nuevos negocios para sincronizar." 
        });
      }
    } catch (e: any) {
      toast({ 
          variant: "destructive", 
          title: "Error de Sincronización", 
          description: e.message 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!searchTerm) return entries;
    const term = searchTerm.toLowerCase();
    return entries.filter(e => 
      e.name.toLowerCase().includes(term) || 
      e.category.toLowerCase().includes(term) ||
      e.businessId.toLowerCase().includes(term)
    );
  }, [entries, searchTerm]);

  const stats = useMemo(() => {
    if (!entries) return { total: 0, public: 0, verified: 0, featured: 0 };
    return {
      total: entries.length,
      public: entries.filter(e => e.publicProfile && e.status === 'published').length,
      verified: entries.filter(e => e.isVerified).length,
      featured: entries.filter(e => e.featured).length,
    };
  }, [entries]);

  const kpiData = [
    { title: "Total Registros", value: stats.total, icon: Search, color: "text-blue-600" },
    { title: "Públicos", value: stats.public, icon: Globe, color: "text-green-600" },
    { title: "Verificados", value: stats.verified, icon: ShieldAlert, color: "text-indigo-600" },
    { title: "Destacados", value: stats.featured, icon: Star, color: "text-amber-600" },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-3xl font-black tracking-tight">Moderación del Directorio</CardTitle>
            <CardDescription>
              Gestiona la visibilidad, verificación y estatus de los negocios en el directorio público de Zentry.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
                variant="outline" 
                onClick={handleSync} 
                disabled={isSyncing || isLoading}
                className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
            >
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar Negocios
            </Button>
            <Button asChild variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                <Link href="/superadmin/business-directory/ads">
                <LayoutPanelTop className="mr-2 h-4 w-4" />
                Gestionar Publicidad (Ads)
                </Link>
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

      <Card>
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
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
