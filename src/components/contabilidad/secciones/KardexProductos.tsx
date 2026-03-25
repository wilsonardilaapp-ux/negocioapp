
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Producto, EstadoStock } from "@/types/inventario.types";

interface KardexProductosProps {
    productos: Producto[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function KardexProductos({ productos }: KardexProductosProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const categories = [...new Set(productos.map(p => p.categoria))];
    const statuses: EstadoStock[] = ['normal', 'bajo', 'agotado', 'sobre_stock'];
    
    const filteredProductos = productos.filter(p => {
        const searchMatch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = filterCategory === 'all' || p.categoria === filterCategory;
        const statusMatch = filterStatus === 'all' || p.estado === filterStatus;
        return searchMatch && categoryMatch && statusMatch;
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Listado de Productos</CardTitle>
                <CardDescription>Consulta y filtra tu inventario actual.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                    <Input 
                        placeholder="Buscar por nombre o código..." 
                        className="max-w-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Stock Actual</TableHead>
                                <TableHead>Stock Mínimo</TableHead>
                                <TableHead>Costo Unitario</TableHead>
                                <TableHead>Valor Total</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProductos.length > 0 ? filteredProductos.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.codigo}</TableCell>
                                    <TableCell className="font-medium">{p.nombre}</TableCell>
                                    <TableCell>{p.categoria}</TableCell>
                                    <TableCell>{p.stockActual}</TableCell>
                                    <TableCell>{p.stockMinimo}</TableCell>
                                    <TableCell>{formatCurrency(p.costoUnitario)}</TableCell>
                                    <TableCell>{formatCurrency(p.stockActual * p.costoUnitario)}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(p.estado)} className="capitalize">
                                            {p.estado.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">No se encontraron productos.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
