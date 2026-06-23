
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
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
import { Search, ShieldAlert, Globe, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export default function BusinessDirectoryAdminPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  const directoryQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "businessDirectory"), orderBy("updatedAt", "desc"));
  }, [firestore]);

  const { data: entries, isLoading } = useCollection<BusinessDirectoryEntry>(directoryQuery);

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
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-3xl font-black tracking-tight">Moderación del Directorio</CardTitle>
          <CardDescription>
            Gestiona la visibilidad, verificación y estatus de los negocios en el directorio público de Zentry.
          </CardDescription>
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
