'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import EditorLandingForm from '@/components/landing-page/editor-landing-form';
import SuperAdminEditorLandingPreview from '@/components/landing-page/superadmin-editor-landing-preview';
import { useToast } from '@/hooks/use-toast';
import { saveLandingConfig } from '@/actions/save-landing-config';

// Este es un Componente de Cliente que recibe los datos iniciales del servidor.
export function LandingPageEditor({ initialData }: { initialData: LandingPageData }) {
  // El estado local (`data`) es la "fuente de la verdad" para el editor y la vista previa en tiempo real.
  const [data, setData] = useState<LandingPageData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Usamos una referencia para asegurarnos de que el estado solo se inicialice una vez.
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
        isFirstLoad.current = false;
        setData(initialData);
    }
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // La acción de servidor se encarga de guardar y de invalidar la caché.
      const result = await saveLandingConfig(data);

      if (result.success) {
        toast({
          title: '¡Guardado con Éxito!',
          description: 'Los cambios se han guardado y publicado correctamente.',
        });
      } else {
        throw new Error(result.error || 'Ocurrió un error desconocido en el servidor.');
      }
    } catch (error: any) {
      console.error("Error al llamar saveLandingConfig:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: `No se pudieron guardar los cambios. Error: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-6">
        <Card className="p-6 flex justify-between items-center bg-card shadow">
            <div>
                <CardTitle className="text-2xl font-bold">Editor de Landing Page Pública</CardTitle>
                <CardDescription>Modifica el contenido de la página de inicio principal de la aplicación.</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
            </Button>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2"><EditorLandingForm data={data} setData={setData} /></div>
            <div className="lg:col-span-1"><SuperAdminEditorLandingPreview data={data} /></div>
        </div>
    </div>
  );
}
