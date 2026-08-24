'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  History, 
  Trash2, 
  Calendar as CalendarIcon, 
  Loader2,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Invoice, VerticalType } from '@/types/billing';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InvoiceActionsMenu } from './InvoiceActionsMenu';

interface InvoiceHistoryTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  businessType: VerticalType;
}

export default function InvoiceHistoryTable({ invoices, isLoading, businessType }: InvoiceHistoryTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Estados de Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [consumptionFilter, setConsumptionFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selección Múltiple
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lógica de Filtrado en Memoria
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.consecutiveNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesConsumption = consumptionFilter === 'all' || inv.tipoConsumo === consumptionFilter;
      const matchesPayment = paymentFilter === 'all' || inv.paymentMethod === paymentFilter;
      
      let matchesDate = true;
      if (dateFrom && dateTo) {
        const invDate = new Date(inv.createdAt).toISOString().split('T')[0];
        matchesDate = invDate >= dateFrom && invDate <= dateTo;
      }

      return matchesSearch && matchesConsumption && matchesPayment && matchesDate;
    });
  }, [invoices, searchTerm, consumptionFilter, paymentFilter, dateFrom, dateTo]);

  // Handlers de Selección
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!user || !firestore || selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(firestore);
      selectedIds.forEach(id => {
        batch.delete(doc(firestore, `businesses/${user.uid}/invoices`, id));
      });
      await batch.commit();
      toast({ title: "Registros eliminados", description: `Se han borrado ${selectedIds.length} facturas.` });
      setSelectedIds([]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <Card className="rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <History size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Historial de Ventas</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-white border-2">
                    REGISTROS: {filteredInvoices.length}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nombre o FV-..." 
                  className="pl-10 h-10 bg-white border-2 rounded-xl focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {selectedIds.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-10 rounded-xl font-black gap-2 shadow-lg shadow-red-100 animate-in zoom-in duration-300">
                        <Trash2 size={16} />
                        ELIMINAR ({selectedIds.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Confirmar eliminación masiva?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vas a eliminar {selectedIds.length} registros de facturación de forma permanente. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 rounded-xl font-bold">
                        {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : "Sí, eliminar ahora"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            )}
          </div>
        </div>

        {/* Toolbar de Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-dashed">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tipo de Consumo</Label>
                <Select value={consumptionFilter} onValueChange={setConsumptionFilter}>
                    <SelectTrigger className="h-9 bg-white border-2 rounded-xl text-xs font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="llevar">Para Llevar</SelectItem>
                        <SelectItem value="domicilio">Domicilio</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Método de Pago</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="h-9 bg-white border-2 rounded-xl text-xs font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="nequi">Nequi</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Rango de Fechas</Label>
                <div className="flex items-center gap-2">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-white border-2 rounded-xl text-xs" />
                    <span className="text-muted-foreground">-</span>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-white border-2 rounded-xl text-xs" />
                    <Button variant="secondary" size="sm" className="h-9 font-black text-[10px] uppercase px-4 rounded-xl">
                        <Filter size={12} className="mr-1" /> Filtrar
                    </Button>
                </div>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[40px] pl-6">
                  <Checkbox 
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Nro Factura</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Cliente</TableHead>
                {businessType === 'Restaurante' && <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Mesa</TableHead>}
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Método</TableHead>
                {businessType !== 'Retail' && <TableHead className="text-[10px] font-black uppercase tracking-widest">Atendido Por</TableHead>}
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Monto</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                      <Loader2 className="animate-spin" />
                      <span className="text-xs font-bold uppercase">Cargando Historial...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className={cn(
                    "hover:bg-slate-50/50 transition-colors group",
                    selectedIds.includes(inv.id) && "bg-primary/5"
                  )}>
                    <TableCell className="pl-6">
                      <Checkbox 
                        checked={selectedIds.includes(inv.id)} 
                        onCheckedChange={() => toggleSelectOne(inv.id)} 
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">{inv.consecutiveNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 uppercase">{inv.customer.name}</span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <CalendarIcon size={10} />
                          {format(new Date(inv.createdAt), "hh:mm a", { locale: es })}
                        </span>
                      </div>
                    </TableCell>
                    {businessType === 'Restaurante' && (
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-slate-50 font-bold border-slate-200">
                            {inv.mesa || '--'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 border-none">
                        {inv.paymentMethod}
                      </Badge>
                    </TableCell>
                    {businessType !== 'Retail' && (
                      <TableCell className="text-xs font-bold text-slate-500 italic">
                        {inv.atendidoPor || 'General'}
                      </TableCell>
                    )}
                    <TableCell className="text-right pr-6">
                      <span className="text-sm font-black text-primary">{formatCurrency(inv.total)}</span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <InvoiceActionsMenu invoice={inv} businessType={businessType} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-20">Sin registros encontrados</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}