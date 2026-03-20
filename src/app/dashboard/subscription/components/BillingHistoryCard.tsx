
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download } from "lucide-react";
import { format } from "date-fns";

export interface BillingRecord {
  id: string;
  date: Date;
  description: string;
  amount: number;
  status: 'paid' | 'open' | 'uncollectible' | 'void' | 'draft';
  invoiceUrl: string | null;
}

interface BillingHistoryCardProps {
  billingHistory: BillingRecord[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

const statusConfig = {
    paid: { label: 'Pagado', variant: 'default' as const },
    open: { label: 'Pendiente', variant: 'secondary' as const },
    uncollectible: { label: 'Incobrable', variant: 'destructive' as const },
    void: { label: 'Anulado', variant: 'outline' as const },
    draft: { label: 'Borrador', variant: 'secondary' as const },
}

export default function BillingHistoryCard({ billingHistory, isLoading }: BillingHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Facturación</CardTitle>
        <CardDescription>Aquí puedes ver tus pagos y descargar tus facturas.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : billingHistory.length === 0 ? (
          <div className="text-center py-10 px-4">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No hay historial de pagos</h3>
            <p className="mt-1 text-sm text-muted-foreground">Los pagos aparecerán aquí cuando actives un plan de pago.</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Factura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{record.description}</TableCell>
                    <TableCell>{formatCurrency(record.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[record.status]?.variant || 'secondary'}>
                        {statusConfig[record.status]?.label || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.invoiceUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={record.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
