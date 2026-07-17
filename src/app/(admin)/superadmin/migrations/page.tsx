'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ChevronRight,
  Trash2,
  Package
} from 'lucide-react';
import { repairProductRatings, type MigrationSummary, cleanupKardexTestData } from '@/actions/migrations';
import { useToast } from '@/hooks/use-toast';

export default function MigrationsPage() {
  const [businessId, setBusinessId] = useState('TPV0qjSyoINCYA3ScBfz2HXDSlM2');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const { toast } = useToast();

  const handleRunMigration = async () => {
    if (!businessId.trim()) {
      toast({ variant: 'destructive', title: "Business ID requerido" });
      return;
    }

    setIsProcessing(true);
    setSummary(null);
    
    try {
      const result = await repairProductRatings(businessId);
      if (result.success && result.summary) {
        setSummary(result.summary);
        toast({ title: "Migración completada" });
      } else {
        toast({ 
          variant: 'destructive', 
          title: "Error en la migración", 
          description: result.error 
        });
      }
    } catch (e: any) {
      toast({ 
        variant: 'destructive', 
        title: "Error crítico", 
        description: e.message 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanupTestItem = async () => {
    if (!businessId.trim()) {
      toast({ variant: 'destructive', title: "Business ID requerido" });
      return;
    }

    if (!confirm("¿Estás seguro? Se eliminará el producto TEST-PROD-001 y todos sus movimientos permanentemente.")) {
      return;
    }

    setIsCleaning(true);
    try {
      const result = await cleanupKardexTestData(businessId);
      if (result.success) {
        toast({ 
          title: "Limpieza Completada", 
          description: `Se eliminó el ítem y ${result.count} movimientos asociados.` 
        });
      } else {
        toast({ 
          variant: 'destructive', 
          title: "Fallo en limpieza", 
          description: result.error 
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error de servidor", description: e.message });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Mantenimiento y Migraciones</CardTitle>
              <CardDescription>Ejecuta scripts de reparación de datos y sincronización masiva.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-muted bg-muted/5">
        <CardHeader>
          <CardTitle className="text-lg">Configuración de Contexto</CardTitle>
          <CardDescription>Define el ID del negocio sobre el cual actuarán las herramientas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="business-id">Business ID (Firestore ID)</Label>
            <Input 
              id="business-id"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="ID de Firestore..."
              className="bg-white font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* REPARACIÓN DE RATINGS */}
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Reparar Ratings
            </CardTitle>
            <CardDescription className="text-xs">
              Recalcula agregados desde /votes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleRunMigration} 
              disabled={isProcessing}
              className="w-full font-bold"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Ejecutar Script
            </Button>
          </CardContent>
        </Card>

        {/* LIMPIEZA KARDEX */}
        <Card className="border-red-200 bg-red-50/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <Trash2 className="h-4 w-4" />
              Limpiar TEST-PROD-001
            </CardTitle>
            <CardDescription className="text-xs">
              Elimina producto de prueba y movimientos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive"
              onClick={handleCleanupTestItem} 
              disabled={isCleaning}
              className="w-full font-bold"
            >
              {isCleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              Borrar Datos Prueba
            </Button>
          </CardContent>
        </Card>
      </div>

      {summary && (
        <Card className="border-green-200 bg-green-50/20">
          <CardContent className="pt-6">
            <h3 className="font-black text-gray-900 mb-4 uppercase text-xs tracking-widest">Resumen de Reparación</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border rounded-lg text-center">
                <p className="text-xl font-black">{summary.totalProcessed}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Procesados</p>
              </div>
              <div className="p-3 bg-white border rounded-lg text-center">
                <p className="text-xl font-black text-green-600">{summary.repaired}</p>
                <p className="text-[10px] text-green-600/70 uppercase font-bold">Corregidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Nota de Seguridad</AlertTitle>
        <AlertDescription className="text-xs">
          Estas herramientas ejecutan operaciones atómicas mediante Batches. La limpieza de datos de prueba es irreversible.
        </AlertDescription>
      </Alert>
    </div>
  );
}
