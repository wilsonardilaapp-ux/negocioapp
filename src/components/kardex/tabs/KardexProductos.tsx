'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ItemInventario, EstadoStock, TipoItem, NuevoItemForm } from '@/types/kardex.types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ItemForm from '../ItemForm';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

interface KardexProductosProps {
    items: ItemInventario[];
    registrarOActualizarItem: (data: NuevoItemForm) => void;
}

export default function KardexProductos({ items, registrarOActualizarItem }: KardexProductosProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState<TipoItem | 'all'>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NuevoItemForm | null>(null);

    const categories = [...new Set(items.map(p => p.categoria))];
    const statuses: EstadoStock[] = ['normal', 'bajo', 'agotado', 'sobre_stock'];
    
    const filteredItems = items.filter(p => {
        const searchMatch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = filterCategory === 'all' || p.categoria === filterCategory;
        const statusMatch = filterStatus === 'all' || p.estado === filterStatus;
        const typeMatch = filterType === 'all' || p.tipoItem === filterType;
        return searchMatch && categoryMatch && statusMatch && typeMatch;
    });

    const getStatusBadgeVariant = (status: EstadoStock): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch(status) {
            case 'normal': return 'default';
            case 'bajo': return 'secondary';
            case 'agotado': return 'destructive';
            case 'sobre_stock': return 'outline';
            default: return 'secondary';
        }
    };

    const handleOpenDialog = (item: ItemInventario | null) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const handleSaveItem = (data: NuevoItemForm) => {
        registrarOActualizarItem(data);
        setIsDialogOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Listado de Ítems de Inventario</CardTitle>
                            <CardDescription>Consulta y gestiona todos tus productos e insumos.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Ítem</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <Input placeholder="Buscar por nombre o código..." className="max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <Select value={filterType} onValueChange={(v) => setFilterType(v as TipoItem | 'all')}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los Tipos</SelectItem><SelectItem value="producto">Producto</SelectItem><SelectItem value="insumo">Insumo</SelectItem></SelectContent></Select>
                        <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoría" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem>{statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="rounded-md border">
                        <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Categoría</TableHead><TableHead>Unidad</TableHead><TableHead>Stock Actual</TableHead><TableHead>Stock Mín.</TableHead><TableHead>Costo Unit.</TableHead><TableHead>Valor Total</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                            {filteredItems.length > 0 ? filteredItems.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.codigo}</TableCell><TableCell className="font-medium">{p.nombre}</TableCell><TableCell className="capitalize">{p.tipoItem}</TableCell><TableCell>{p.categoria}</TableCell><TableCell>{p.unidadMedida}</TableCell><TableCell>{p.stockActual}</TableCell><TableCell>{p.stockMinimo}</TableCell><TableCell>{formatCurrency(p.costoUnitario)}</TableCell><TableCell>{formatCurrency(p.stockActual * p.costoUnitario)}</TableCell><TableCell><Badge variant={getStatusBadgeVariant(p.estado)} className="capitalize">{p.estado.replace('_', ' ')}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)}><Edit className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (<TableRow><TableCell colSpan={11} className="h-24 text-center">No se encontraron ítems.</TableCell></TableRow>)}
                        </TableBody></Table>
                    </div>
                </CardContent>
            </Card>

             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar Ítem' : 'Crear Nuevo Ítem'}</DialogTitle>
                        <DialogDescription>Completa los detalles de tu producto o insumo.</DialogDescription>
                    </DialogHeader>
                    <ItemForm 
                        existingItem={editingItem}
                        onSave={handleSaveItem}
                        onClose={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
