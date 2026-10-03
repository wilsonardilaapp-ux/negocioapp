'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';
import { guardarContactosImportados } from './jevEngineClientesNuevos';
import { useToast } from '@/hooks/use-toast';

interface JevModalImportarProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess: () => void;
}

export function JevModalImportarContactos({ isOpen, onClose, businessId, onSuccess }: JevModalImportarProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [filasParsed, setFilasParsed] = useState<{ nombre: string; telefono: string; email?: string }[]>([]);
  const [omitirDuplicados, setOmitirDuplicados] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('Por favor selecciona un archivo con formato .CSV');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
        if (lines.length <= 1) {
          setErrorMsg('El archivo CSV está vacío o solo contiene la cabecera.');
          return;
        }

        // Parsear CSV simple (nombre,telefono,email)
        const parsed: { nombre: string; telefono: string; email?: string }[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 2 && cols[0] && cols[1]) {
            parsed.push({
              nombre: cols[0],
              telefono: cols[1],
              email: cols[2] || undefined,
            });
          }
        }

        if (parsed.length > 500) {
          setErrorMsg(`El archivo tiene ${parsed.length} filas. El límite máximo es de 500 registros por subida.`);
          setFilasParsed([]);
          return;
        }

        setFilasParsed(parsed);
      } catch (err) {
        setErrorMsg('Error al leer el archivo CSV. Verifica la codificación.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmarImportacion = async () => {
    if (!businessId || filasParsed.length === 0) return;
    setIsProcessing(true);

    try {
      const res = await guardarContactosImportados({
        businessId,
        filas: filasParsed,
        omitirDuplicados,
      });

      toast({
        title: '✅ Importación exitosa',
        description: `Se importaron ${res.importados} contacto(s) (${res.duplicadosOmitidos} duplicados omitidos).`,
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error en la importación',
        description: e.message || 'No se pudo guardar la lista.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-6 rounded-3xl bg-white shadow-2xl border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Importar Contactos (CSV)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sube un archivo CSV con columnas: <code className="font-bold">nombre, telefono, email</code> (máx. 500 filas).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center space-y-2 bg-gray-50/50 hover:bg-gray-50 transition">
            <Upload className="w-8 h-8 mx-auto text-emerald-600 opacity-80" />
            <div className="text-xs font-semibold text-gray-700">
              {file ? file.name : 'Arrastra tu archivo CSV o haz clic para buscarlo'}
            </div>
            <Input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-upload" />
            <Button type="button" variant="outline" size="sm" asChild className="font-bold text-xs">
              <label htmlFor="csv-upload" className="cursor-pointer">Seleccionar Archivo</label>
            </Button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {filasParsed.length > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Archivo válido: {filasParsed.length} contacto(s) listos para importar.</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="chk-dup"
                  checked={omitirDuplicados}
                  onCheckedChange={(c) => setOmitirDuplicados(!!c)}
                />
                <label htmlFor="chk-dup" className="font-medium cursor-pointer">
                  Omitir contactos duplicados por número de teléfono
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button
            onClick={handleConfirmarImportacion}
            disabled={isProcessing || filasParsed.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirmar e Importar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
