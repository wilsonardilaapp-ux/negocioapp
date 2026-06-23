
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
import type { Business } from "@/models/business";
import { Search, ShieldAlert, Globe, Star, LayoutPanelTop } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BusinessDirectoryAdminPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  // Ahora consultamos directamente la colección de negocios
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
      public: businesses.filter(e => e.directoryEnabled && e.directoryStatus === 'approved').length,
      approved: businesses.filter(e => e.directoryStatus === 'approved').length,
      hidden: businesses.filter(e => e.directoryStatus === 'hidden').length,
    };
  }, [businesses]);

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
            <CardTitle className="text-3xl font-black tracking-tight">Moderación del Directorio</CardTitle>
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
