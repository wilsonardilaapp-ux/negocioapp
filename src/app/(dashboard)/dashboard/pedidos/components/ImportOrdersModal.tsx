'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Save 
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus, TipoEntrega } from '@/models/order';

interface ImportRow {
  Cliente?: string;
  Email?: string;
  WhatsApp?: string;
  Dirección?: string;
  Producto?: string;
  Cantidad?: number | string;
  Precio_Unitario?: number | string;
  Total?: number | string;
  Fecha?: string;
  Estado?: string;
  error?: string;
  isValid: boolean;
}

interface ImportOrdersModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export function ImportOrdersModal({ isOpen, onOpenChange }: ImportOrdersModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const data = [
      ["Cliente", "Email", "WhatsApp", "Dirección", "Producto", "Cantidad", "Precio_Unitario", "Total", "Fecha", "Estado"],
      ["Juan Pérez", "juan@ejemplo.com", "3001234567", "Calle 123 #45-67", "Hamburguesa Clásica", 2, 15000, 30000, "2024-03-27", "Entregado"],
      ["María García", "maria@ejemplo.com", "3007654321", "Av Principal 10-20", "Pizza Pepperoni", 1, 25000, 25000, "2024-03-28", "Pendiente"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Pedidos");
    XLSX.writeFile(wb, "Plantilla_Importacion_Pedidos.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          toast({ variant: 'destructive', title: 'Archivo vacío', description: 'El archivo no contiene registros.' });
          return;
        }

        const processed: ImportRow[] = data.map((row: any) => {
          const name = String(row.Cliente || '').trim();
          const email = String(row.Email || '').trim();
          const whatsapp = String(row.WhatsApp || '').trim();
          const product = String(row.Producto || '').trim();
          const qty = parseInt(String(row.Cantidad || '1'), 10);
          const price = parseFloat(String(row.Precio_Unitario || '0'));
          const total = parseFloat(String(row.Total || '0'));
          const date = String(row.Fecha || '').trim();
          const status = String(row.Estado || 'Pendiente').trim();

          const errors = [];
          if (!name) errors.push("Cliente requerido");
          if (!product) errors.push("Producto requerido");
          if (isNaN(total) || total <= 0) errors.push("Total inválido");
          if (!date || isNaN(Date.parse(date))) errors.push("Fecha inválida (AAAA-MM-DD)");

          return {
            Cliente: name,
            Email: email,
            WhatsApp: whatsapp,
            Dirección: row.Dirección,
            Producto: product,
            Cantidad: qty,
            Precio_Unitario: price,
            Total: total,
            Fecha: date,
            Estado: status,
            isValid: errors.length === 0,
            error: errors.join(", ")
          };
        });

        setImportRows(processed);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error de lectura', description: 'El archivo no tiene el formato correcto.' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!user || !firestore) return;
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const chunks = chunkArray(validRows, 500);
      const ordersColRef = collection(firestore, `businesses/${user.uid}/orders`);

      for (const chunk of chunks) {
        const batch = writeBatch(firestore);
        chunk.forEach(row => {
          const orderRef = doc(ordersColRef);
          const orderId = orderRef.id;
          
          const newOrder: Order = {
            id: orderId,
            businessId: user.uid,
            customerName: row.Cliente!,
            customerEmail: row.Email || '',
            customerPhone: row.WhatsApp || '',
            customerAddress: row.Dirección || 'Recogida en tienda',
            items: [{
              productId: 'import-manual',
              productName: row.Producto!,
              quantity: Number(row.Cantidad),
              unitPrice: Number(row.Precio_Unitario),
              subtotal: Number(row.Total)
            }],
            subtotal: Number(row.Total),
            total: Number(row.Total),
            discountAmount: 0,
            discountLabel: '',
            packagingCost: 0,
            deliveryFee: 0,
            vatAmount: 0,
            paymentMethod: 'manual',
            orderDate: new Date(row.Fecha!).toISOString(),
            orderStatus: (row.Estado as OrderStatus) || 'Pendiente',
            tipoEntrega: (row.Dirección ? 'domicilio' : 'recoger_en_tienda') as TipoEntrega,
            origin: 'import_manual'
          };
          batch.set(orderRef, newOrder);
        });
        await batch.commit();
      }

      toast({ title: 'Importación exitosa', description: `Se han cargado ${validRows.length} pedidos correctamente.` });
      onOpenChange(false);
      setImportRows([]);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fallo en la importación', description: 'Ocurrió un error al guardar los datos.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isImporting && onOpenChange(open)}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Pedidos Históricos
          </DialogTitle>
          <DialogDescription>
            Carga tus ventas externas mediante un archivo Excel o CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-dashed border-primary/20">
            <div className="space-y-1">
              <p className="text-sm font-bold">1. Descarga la plantilla oficial</p>
              <p className="text-xs text-muted-foreground">Usa este formato para asegurar que los datos se lean correctamente.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="font-bold border-primary text-primary hover:bg-primary/5">
              <Download className="mr-2 h-4 w-4" /> Bajar Plantilla
            </Button>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-bold">2. Sube tu archivo</Label>
            <div 
              className="relative aspect-[21/5] border-2 border-dashed rounded-xl flex items-center justify-center bg-background cursor-pointer hover:bg-muted/30 transition-colors group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Seleccionar Excel / CSV</span>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
            </div>
          </div>

          {importRows.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">3. Vista Previa de Datos</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {importRows.filter(r => r.isValid).length} Válidos
                  </Badge>
                  {importRows.some(r => !r.isValid) && (
                    <Badge variant="destructive">
                      {importRows.filter(r => !r.isValid).length} Errores
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map((row, i) => (
                      <TableRow key={i} className={cn(!row.isValid && "bg-red-50/50")}>
                        <TableCell className="text-sm font-medium">{row.Cliente || '-'}</TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">{row.Producto || '-'}</TableCell>
                        <TableCell className="text-right text-sm font-bold">${Number(row.Total || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{row.Fecha || '-'}</TableCell>
                        <TableCell className="text-right">
                          {!row.isValid ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-4 w-4 text-red-500 ml-auto" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{row.error}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-muted/20 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting}>Cancelar</Button>
          <Button 
            onClick={confirmImport} 
            disabled={isImporting || importRows.filter(r => r.isValid).length === 0}
            className="font-bold px-8 shadow-lg shadow-primary/20"
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Confirmar e Importar ({importRows.filter(r => r.isValid).length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}