'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BusinessRatingsStats } from '@/components/directory/ratings/BusinessRatingsStats';
import { BusinessRatingsList } from '@/components/directory/ratings/BusinessRatingsList';
import { useBusinessRatings } from '@/hooks/useBusinessRatings';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Star, FileSpreadsheet, FileText } from 'lucide-react';
import type { Business } from '@/models/business';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function BusinessRatingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { ratings, isLoading: isRatingsLoading } = useBusinessRatings();
  const [isExporting, setIsExporting] = useState(false);

  // Cargamos el documento del negocio para obtener la calificación real consolidada
  const businessDocRef = useMemoFirebase(() => 
    user ? doc(firestore, 'businesses', user.uid) : null,
    [user, firestore]
  );
  
  const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessDocRef);

  const isLoading = isRatingsLoading || isBusinessLoading;

  // --- HANDLERS DE EXPORTACIÓN ---

  const handleExportExcel = () => {
    if (!business || !ratings) return;
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen de Reputación
      const summaryData = [
        ["RESUMEN DE REPUTACIÓN Y SATISFACCIÓN"],
        ["Fecha de generación:", new Date().toLocaleString()],
        [],
        ["Métrica", "Valor"],
        ["Calificación Promedio", business.rating || 5.0],
        ["Total de Opiniones", business.reviewCount || 0],
        [],
        ["DISTRIBUCIÓN DE ESTRELLAS"],
        ["5 Estrellas", business.ratingDistribution?.["5"] || 0],
        ["4 Estrellas", business.ratingDistribution?.["4"] || 0],
        ["3 Estrellas", business.ratingDistribution?.["3"] || 0],
        ["2 Estrellas", business.ratingDistribution?.["2"] || 0],
        ["1 Estrella", business.ratingDistribution?.["1"] || 0]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

      // Hoja 2: Listado de Opiniones
      const listData = ratings.map(r => ({
        "Cliente": r.userName,
        "Calificación": r.rating,
        "Comentario": r.comment,
        "Fecha": format(new Date(r.createdAt), "dd/MM/yyyy HH:mm"),
        "Respuesta Administrativa": r.adminResponse || "N/A",
        "Respuesta Negocio": r.businessResponse || "N/A",
        "Origen": r.authType === 'registered' ? 'Usuario Registrado' : 'Invitado'
      }));
      const wsList = XLSX.utils.json_to_sheet(listData);
      XLSX.utils.book_append_sheet(wb, wsList, "Opiniones Detalladas");

      XLSX.writeFile(wb, `Reporte_Reputacion_${business.name.replace(/\s+/g, '_')}.xlsx`);
      toast({ title: "Excel generado", description: "El reporte de reputación ha sido descargado." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error al exportar", description: "No se pudo generar el archivo Excel." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (!business || !ratings) return;
    setIsExporting(true);
    try {
      const docPdf = new jsPDF();
      const bizName = business.name || 'Markix Business';
      const now = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

      // 1. Encabezado Corporativo
      docPdf.setFontSize(20);
      docPdf.setTextColor(40);
      docPdf.text("REPORTE EJECUTIVO DE REPUTACIÓN", 14, 22);
      
      docPdf.setFontSize(10);
      docPdf.setTextColor(100);
      docPdf.text(`Negocio: ${bizName.toUpperCase()}`, 14, 30);
      docPdf.text(`Fecha de emisión: ${now}`, 14, 35);

      // 2. Resumen de Satisfacción (KPIs)
      docPdf.setFontSize(14);
      docPdf.setTextColor(40);
      docPdf.text("1. Métricas de Satisfacción", 14, 48);

      (docPdf as any).autoTable({
        startY: 53,
        head: [['Indicador', 'Valor']],
        body: [
          ['Calificación Promedio', `${(business.rating || 5.0).toFixed(1)} / 5.0`],
          ['Total de Valoraciones', (business.reviewCount || 0).toString()],
          ['Distribución Positiva (4-5*)', ((business.ratingDistribution?.["4"] || 0) + (business.ratingDistribution?.["5"] || 0)).toString()]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // 3. Tabla de Opiniones
      const nextY = (docPdf as any).lastAutoTable.finalY + 15;
      docPdf.text("2. Listado de Opiniones de Clientes", 14, nextY);

      const tableData = ratings.map(r => [
        r.userName,
        `${r.rating} ⭐`,
        r.comment,
        format(new Date(r.createdAt), 'dd/MM/yyyy')
      ]);

      (docPdf as any).autoTable({
        startY: nextY + 5,
        head: [['CLIENTE', 'RATING', 'RESEÑA', 'FECHA']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 8 },
        columnStyles: {
          2: { cellWidth: 80 }
        }
      });

      docPdf.save(`Reputacion_${bizName.replace(/\s+/g, '_')}.pdf`);
      toast({ title: "PDF generado", description: "El reporte ejecutivo está listo." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error al exportar PDF" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Valoraciones del Directorio</CardTitle>
              <CardDescription>
                Gestiona las opiniones de tus clientes y mejora tu reputación en el directorio de negocios.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportExcel}
              disabled={isExporting || ratings.length === 0}
              className="font-bold border-primary text-primary hover:bg-primary/5"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={isExporting || ratings.length === 0}
              className="font-bold border-primary text-primary hover:bg-primary/5"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
              PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      <BusinessRatingsStats 
        ratings={ratings} 
        businessRating={business?.rating}
        businessReviewCount={business?.reviewCount}
        businessDistribution={business?.ratingDistribution}
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado de Opiniones</CardTitle>
          <CardDescription>Consulta lo que tus clientes dicen sobre tu negocio.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessRatingsList ratings={ratings} />
        </CardContent>
      </Card>
    </div>
  );
}
