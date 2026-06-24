'use client';

import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { useToast } from "@/hooks/use-toast";
import type { DirectoryRating, RatingStatus } from "@/models/directory-rating";
import { Star } from "lucide-react";
import { updateBusinessAggregates } from "@/actions/directory-ratings";

export default function GlobalRatingsModerationPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const ratingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "directoryRatings"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: ratings, isLoading } = useCollection<DirectoryRating>(ratingsQuery);

  const handleUpdateStatus = async (id: string, status: RatingStatus) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, "directoryRatings", id);
      await updateDocumentNonBlocking(docRef, { 
        status,
        updatedAt: new Date().toISOString()
      });

      // Si se aprueba, actualizamos los indicadores globales del negocio afectado
      if (status === 'published') {
        const rating = ratings?.find(r => r.id === id);
        if (rating?.businessId) {
            await updateBusinessAggregates(rating.businessId);
        }
      }

      toast({
        title: "Estado actualizado",
        description: `La valoración ha sido marcada como ${status}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado.",
      });
    }
  };

  const handleAdminResponse = async (id: string, response: string) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, "directoryRatings", id);
      await updateDocumentNonBlocking(docRef, { 
        adminResponse: response,
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Respuesta guardada",
        description: "La respuesta administrativa se ha registrado correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la respuesta.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Gestionar Valoraciones del Directorio</CardTitle>
              <CardDescription>
                Moderación global de opiniones y respuestas en toda la plataforma.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable 
            columns={columns({ 
              onUpdateStatus: handleUpdateStatus, 
              onAdminResponse: handleAdminResponse 
            })} 
            data={ratings || []} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
