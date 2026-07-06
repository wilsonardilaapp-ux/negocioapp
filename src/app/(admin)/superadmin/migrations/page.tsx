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
  ChevronRight 
} from 'lucide-react';
import { repairProductRatings, type MigrationSummary } from '@/actions/migrations';
import { useToast } from '@/hooks/use-toast';

export default function MigrationsPage() {
  const [businessId, setBusinessId] = useState('TPV0qjSyoINCYA3ScBfz2HXDSlM2');
  const [isProcessing, setIsProcessing] = useState(false);
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

      <Card className="border-amber-200 bg-amber-50/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Reparación de Ratings Desincronizados
          </CardTitle>
          <CardDescription>
            Este script recalcula los agregados de calificación leyendo la subcolección /votes. 
            Corrige el bug donde los votos se guardaban pero no se sumaban al producto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-id">Business ID del Negocio a Reparar</Label>
            <div className="flex gap-2">
              <Input 
                id="business-id"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="ID de Firestore..."
                className="bg-white font-mono"
              />
              <Button 
                onClick={handleRunMigration} 
                disabled={isProcessing}
                className="font-bold shrink-0"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Ejecutar Reparación
              </Button>
            </div>
          </div>

          {summary && (
            <div className="mt-6 p-6 bg-white border rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="font-black text-gray-900 mb-4 uppercase text-xs tracking-widest">Resumen de la operación</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-black">{summary.totalProcessed}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Procesados</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center border border-green-100">
                  <p className="text-2xl font-black text-green-600">{summary.repaired}</p>
                  <p className="text-[10px] text-green-600/70 uppercase font-bold">Corregidos</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
                  <p className="text-2xl font-black text-blue-600">{summary.alreadyCorrect}</p>
                  <p className="text-[10px] text-blue-600/70 uppercase font-bold">Correctos</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
                  <p className="text-2xl font-black text-gray-400">{summary.noVotes}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Sin Votos</p>
                </div>
              </div>

              {summary.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Se encontraron errores:</p>
                  <ul className="list-disc list-inside">
                    {summary.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              
              <div className="mt-4 flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 p-2 rounded">
                <CheckCircle2 className="h-4 w-4" />
                Catálogo denormalizado sincronizado correctamente.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Nota de Seguridad</AlertTitle>
        <AlertDescription>
          Este script es idempotente. Puedes correrlo varias veces sobre el mismo negocio y los resultados serán consistentes. 
          No afecta a la subcolección de votos, solo lee de ella.
        </AlertDescription>
      </Alert>
    </div>
  );
}
