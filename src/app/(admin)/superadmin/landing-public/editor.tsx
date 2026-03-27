
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import EditorLandingForm from '@/components/landing-page/editor-landing-form';
import SuperAdminEditorLandingPreview from '@/components/landing-page/superadmin-editor-landing-preview';
import { useToast } from '@/hooks/use-toast';
import { saveLandingConfig } from '@/actions/save-landing-config';

// This is now a CLIENT component that receives its data from its parent server component.
export function LandingPageEditor({ initialData }: { initialData: LandingPageData }) {
  // The state is managed entirely on the client, initialized with server-fetched data.
  const [data, setData] = useState<LandingPageData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // If the server-fetched data changes (e.g., on a hard refresh or revalidation), update the local state.
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Calls the server action to save the data reliably.
      const result = await saveLandingConfig(data);

      if (result.success) {
        toast({
          title: '¡Guardado con Éxito!',
          description: 'Los cambios se han guardado correctamente en la base de datos.',
        });
        // After a successful save, refresh the server components to get the latest data.
        router.refresh();
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
