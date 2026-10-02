'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { obtenerCopilotoRetencion, CopilotoRetencionOutput } from './jevEngineRetencion';
import { JevModalReconquista } from './JevModalReconquista';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Crown, Send, Loader2 } from 'lucide-react';
import type { ClienteRetencionJev } from './contextAggregatorRetencion';

interface JevSeccionRiesgoProps {
  businessId?: string;
}

export function JevSeccionClientesEnRiesgo({ businessId }: JevSeccionRiesgoProps) {
  const [data, setData] = useState<CopilotoRetencionOutput | null>(null);
  const [seleccionadosIds, setSeleccionadosIds] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientesModal, setClientesModal] = useState<ClienteRetencionJev[]>([]);
  const [isLoading, startTransition] = useTransition();

  const cargarDatos = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const res = await obtenerCopilotoRetencion(businessId);
        setData(res);
      } catch (e) {
        console.error('[JEV SECCION RIESGO] Error:', e);
      }
    });
  };

  useEffect(() => {
    if (businessId && !data) {
      cargarDatos();
    }
  }, [businessId]);

  if (!businessId || !data || data.clientesEnRiesgo.length === 0) {
    return null;
  }

  const listaRiesgo = data.clientesEnRiesgo;

  const todosSeleccionados = listaRiesgo.every((c) => seleccionadosIds[c.id]);

  const handleToggleSelectAll = (checked: boolean) => {
    const nuevo: Record<string, boolean> = {};
    if (checked) {
      listaRiesgo.forEach((c) => {
        nuevo[c.id] = true;
      });
    }
    setSeleccionadosIds(nuevo);
  };

  const handleToggleSelectOne = (id: string, checked: boolean) => {
    setSeleccionadosIds((prev) => ({ ...prev, [id]: checked }));
  };

  const handleAbrirModalIndividual = (cliente: ClienteRetencionJev) => {
    setClientesModal([cliente]);
    setIsModalOpen(true);
  };

  const handleAbrirModalMasivo = () => {
    const seleccionados = listaRiesgo.filter((c) => seleccionadosIds[c.id]);
    setClientesModal(seleccionados);
    setIsModalOpen(true);
  };

  const countSeleccionados = listaRiesgo.filter((c) => seleccionadosIds[c.id]).length;

  return (
    <div className="space-y-4 my-8">
      <Card className="border-2 border-emerald-100 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-emerald-50/40 border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Clientes en Riesgo de Abandono ({listaRiesgo.length})
              </CardTitle>
              <CardDescription>
                Detección proactiva de inactividad basada en ciclos de compra habituales.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border">
                <Checkbox
                  id="select-all-riesgo"
                  checked={todosSeleccionados}
                  onCheckedChange={(c) => handleToggleSelectAll(!!c)}
                />
                <label htmlFor="select-all-riesgo" className="text-xs font-bold cursor-pointer">
                  Seleccionar todos
                </label>
              </div>

              <Button
                onClick={handleAbrirModalMasivo}
                disabled={countSeleccionados === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar a seleccionados ({countSeleccionados})</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listaRiesgo.map((cliente) => {
              const isSelected = !!seleccionadosIds[cliente.id];

              return (
                <div
                  key={cliente.id}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-3 bg-white ${
                    isSelected ? 'border-emerald-500 bg-emerald-50/10 shadow-xs' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleToggleSelectOne(cliente.id, !!c)}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-gray-900">{cliente.nombre}</span>
                            {cliente.esVIP && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[9px] px-1.5 py-0 h-4">
                                <Crown className="w-2.5 h-2.5" /> VIP
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{cliente.telefono}</p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold uppercase ${
                          cliente.nivelRiesgo === 'critico'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {cliente.nivelRiesgo}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-700 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-snug">
                      {cliente.motivoRiesgo}
                    </p>

                    <div className="grid grid-cols-2 text-xs text-muted-foreground pt-1 border-t">
                      <div>Gasto Hist.: <strong className="text-gray-900">${cliente.gastoHistorico.toLocaleString('es-CO')}</strong></div>
                      <div>Pedidos: <strong className="text-gray-900">{cliente.frecuencia}</strong></div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAbrirModalIndividual(cliente)}
                    className="w-full text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5 h-8"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enviar Mensaje</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal Único de Reconquista */}
      <JevModalReconquista
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        businessId={businessId}
        clientes={clientesModal}
        onRemoveCliente={(id) => setClientesModal((prev) => prev.filter((c) => c.id !== id))}
      />
    </div>
  );
}
