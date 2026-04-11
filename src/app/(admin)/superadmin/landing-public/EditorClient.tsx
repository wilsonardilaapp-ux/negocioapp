'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import EditorLandingForm from '@/components/landing-page/editor-landing-form';
import SuperAdminEditorLandingPreview from '@/components/landing-page/superadmin-editor-landing-preview';
import { useToast } from '@/hooks/use-toast';
import { saveLandingConfig } from '@/actions/save-landing-config';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SubscriptionPlan } from '@/models/subscription-plan';

interface EditorClientProps {
  initialData: LandingPageData | null;
}

export default function LandingEditorClient({ initialData }: EditorClientProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [formData, setFormData] = useState<LandingPageData | null>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const plansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'plans'), [firestore]);
  const { data: plans, isLoading: loadingPlans } = useCollection<SubscriptionPlan>(plansQuery);
  
  // EFECTO VITAL: Si refrescas y el servidor trae datos nuevos, actualiza el form
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSave = async () => {
    if (!formData) {
        toast({ variant: "destructive", title: "Error", description: "No hay datos para guardar." });
        return;
    }
    setIsSaving(true);
    try {
      const result = await saveLandingConfig(formData);
      if (result.success) {
        toast({ title: '¡Guardado con Éxito!', description: 'Los cambios se han publicado.' });
      } else {
        throw new Error(result.error || 'Ocurrió un error desconocido.');
      }
    } catch (error: any) {
      console.error("Error al guardar:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!formData) {
      return (
          <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2">Cargando datos del editor...</p>
          </div>
      )
  }

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
        <div className="lg:col-span-2">
          <EditorLandingForm 
            data={formData} 
            setData={setFormData as React.Dispatch<React.SetStateAction<LandingPageData>>}
            plans={plans || []}
            loadingPlans={loadingPlans}
          />
        </div>
        <div className="lg:col-span-1"><SuperAdminEditorLandingPreview data={formData} /></div>
      </div>
    </div>
  );
}
