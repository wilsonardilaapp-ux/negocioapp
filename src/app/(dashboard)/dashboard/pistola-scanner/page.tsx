
// src/app/(dashboard)/dashboard/pistola-scanner/page.tsx
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { pistolasScannerMock, codigosSimulados } from '@/mocks/pistolasScannerMock';
import type { PistolaScanner, ResumenDispositivos, FiltroEstado, FormularioPistolaScanner } from '@/models/pistolaScanner';
import TarjetaDispositivo from './components/TarjetaDispositivo';
import ModalAgregarPistola from './components/ModalAgregarPistola';
import PanelConfiguracion from './components/PanelConfiguracion';
import { PlusCircle, Scan, Plug, PlugZap, Settings2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PistolaScannerPage() {
    const [pistolas, setPistolas] = useState<PistolaScanner[]>(pistolasScannerMock);
    const [selectedPistolaId, setSelectedPistolaId] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<FiltroEstado>('todos');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [modalAbierto, setModalAbierto] = useState<boolean>(false);
    const [ultimaLecturaSimulada, setUltimaLecturaSimulada] = useState<string | null>(null);
    const { toast } = useToast();

    const resumenDispositivos = useMemo((): ResumenDispositivos => {
        return {
            total: pistolas.length,
            conectados: pistolas.filter(p => p.estado === 'conectado').length,
            desconectados: pistolas.filter(p => p.estado === 'desconectado').length,
            configurando: pistolas.filter(p => p.estado === 'configurando').length,
        };
    }, [pistolas]);

    const filteredPistolas = useMemo(() => {
        return pistolas.filter(p => {
            const estadoMatch = filtro === 'todos' || p.estado === filtro;
            const searchMatch = searchTerm === '' ||
                p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.numeroSerie.toLowerCase().includes(searchTerm.toLowerCase());
            return estadoMatch && searchMatch;
        });
    }, [pistolas, filtro, searchTerm]);

    const handleConfigurar = useCallback((id: string) => {
        setSelectedPistolaId(id);
    }, []);

    const handleProbar = useCallback((id: string) => {
        const pistola = pistolas.find(p => p.id === id);
        toast({
            title: `Probando ${pistola?.nombre}`,
            description: "La prueba de conexión se ha iniciado.",
        });
    }, [pistolas, toast]);

    const handleGuardarConfig = useCallback((id: string, config: PistolaScanner['configuracion']) => {
        setPistolas(prev => prev.map(p => (p.id === id ? { ...p, configuracion: config } : p)));
        toast({
            title: "Configuración Guardada",
            description: "Los ajustes de la pistola han sido actualizados.",
        });
    }, [toast]);
    
    const handleDesconectar = useCallback((id: string) => {
        setPistolas(prev => prev.map(p => (p.id === id ? { ...p, estado: 'desconectado' } : p)));
        toast({
            title: "Dispositivo Desconectado",
            variant: "destructive",
        });
    }, [toast]);
    
    const handleEliminar = useCallback((id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este dispositivo? Esta acción no se puede deshacer.')) {
            setPistolas(prev => prev.filter(p => p.id !== id));
            setSelectedPistolaId(null);
            toast({
                title: "Dispositivo Eliminado",
            });
        }
    }, [toast]);

    const handleSimularLectura = useCallback((id: string) => {
        const codigo = codigosSimulados[Math.floor(Math.random() * codigosSimulados.length)];
        setUltimaLecturaSimulada(codigo);
        setPistolas(prev => prev.map(p => p.id === id ? { ...p, ultimaLectura: new Date(), lecturasHoy: p.lecturasHoy + 1 } : p));
        toast({
            title: "Lectura Simulada",
            description: `Código leído: ${codigo}`,
        });
    }, []);

    const handleAgregarPistola = useCallback((datos: FormularioPistolaScanner) => {
        const nuevaPistola: PistolaScanner = {
            id: String(Date.now()),
            ...datos,
            estado: 'desconectado',
            lecturasHoy: 0,
            erroresHoy: 0,
            firmware: 'v1.0.0',
            bateria: 100,
            ultimaLectura: null,
            configuracion: pistolasScannerMock[0].configuracion, // Default config
            creadoEn: new Date(),
        };
        setPistolas(prev => [nuevaPistola, ...prev]);
        setModalAbierto(false);
        toast({
            title: "Pistola Agregada",
            description: `Se ha añadido "${datos.nombre}" a la lista de dispositivos.`,
        });
    }, [toast]);
    
    const selectedPistola = useMemo(() => pistolas.find(p => p.id === selectedPistolaId), [pistolas, selectedPistolaId]);

    const kpis = [
        { title: "Total de Dispositivos", value: resumenDispositivos.total, icon: Scan },
        { title: "Conectados", value: resumenDispositivos.conectados, icon: Plug },
        { title: "Desconectados", value: resumenDispositivos.desconectados, icon: PlugZap },
        { title: "Configurando", value: resumenDispositivos.configurando, icon: Settings2 },
    ];

    if (selectedPistolaId && selectedPistola) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => setSelectedPistolaId(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al listado
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración de: {selectedPistola.nombre}</CardTitle>
                        <CardDescription>Ajusta los parámetros y realiza pruebas para este dispositivo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PanelConfiguracion
                            pistola={selectedPistola}
                            onGuardar={handleGuardarConfig}
                            onDesconectar={handleDesconectar}
                            onEliminar={handleEliminar}
                            onSimularLectura={handleSimularLectura}
                            ultimaLecturaSimulada={ultimaLecturaSimulada}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Pistolas de Escaneo</CardTitle>
                    <CardDescription>Administra los dispositivos de escaneo de códigos de barras de tu taller.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map(kpi => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Dispositivos Registrados</CardTitle>
                            <CardDescription>Visualiza y gestiona todas las pistolas escáner.</CardDescription>
                        </div>
                        <Button onClick={() => setModalAbierto(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Pistola
                        </Button>
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                        <Input
                            placeholder="Buscar por nombre, modelo o serie..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            {(['todos', 'conectado', 'desconectado', 'configurando'] as FiltroEstado[]).map(f => (
                                <Button
                                    key={f}
                                    variant={filtro === f ? 'default' : 'outline'}
                                    onClick={() => setFiltro(f)}
                                    className="capitalize"
                                >
                                    {f}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPistolas.map(pistola => (
                            <TarjetaDispositivo
                                key={pistola.id}
                                pistola={pistola}
                                onConfigurar={handleConfigurar}
                                onProbar={handleProbar}
                            />
                        ))}
                    </div>
                     {filteredPistolas.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No se encontraron dispositivos con los filtros actuales.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <ModalAgregarPistola
                abierto={modalAbierto}
                onCerrar={() => setModalAbierto(false)}
                onGuardar={handleAgregarPistola}
            />
        </div>
    );
}
