'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Printer } from '@/models/printer';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const printerSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  type: z.enum(['thermal', 'inkjet', 'laser']),
  connection: z.enum(['usb', 'network', 'bluetooth', 'wifi']),
  ipAddress: z.string().optional(),
  port: z.preprocess(val => Number(val) || undefined, z.number().optional()),
  paperWidth: z.preprocess(Number, z.union([z.literal(58), z.literal(80)])),
  isDefault: z.boolean(),
});

type PrinterFormData = z.infer<typeof printerSchema>;

interface PrinterFormProps {
    existingPrinter?: Printer | null;
    onClose: () => void;
}

export default function PrinterForm({ existingPrinter, onClose }: PrinterFormProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<PrinterFormData>({
        resolver: zodResolver(printerSchema),
        defaultValues: {
            name: existingPrinter?.name || '',
            type: existingPrinter?.type || 'thermal',
            connection: existingPrinter?.connection || 'network',
            ipAddress: existingPrinter?.ipAddress || '',
            port: existingPrinter?.port || 9100,
            paperWidth: existingPrinter?.paperWidth || 80,
            isDefault: existingPrinter?.isDefault || false,
        }
    });
    
    const connectionType = watch('connection');

    const onSubmit = (data: PrinterFormData) => {
        if (!user || !firestore) return;
        
        const printerId = existingPrinter?.id || doc(collection(firestore, `businesses/${user.uid}/printers`)).id;
        const printerDocRef = doc(firestore, `businesses/${user.uid}/printers`, printerId);
        
        const printerToSave: Omit<Printer, 'id'> = {
            name: data.name,
            type: data.type,
            connection: data.connection,
            ipAddress: data.connection === 'network' ? data.ipAddress : undefined,
            port: data.connection === 'network' ? data.port : undefined,
            paperWidth: data.paperWidth,
            isDefault: data.isDefault,
            status: 'offline', // Default status
            lastUsed: existingPrinter?.lastUsed,
        };

        setDocumentNonBlocking(printerDocRef, printerToSave, { merge: true });

        toast({
            title: `Impresora ${existingPrinter ? 'actualizada' : 'creada'}`,
            description: `La impresora "${data.name}" se ha guardado correctamente.`,
        });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...register('name')} placeholder="Ej: Cocina, Barra, Caja" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Controller name="type" control={control} render={({ field }) => (
                    <div><Label>Tipo</Label><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="thermal">Térmica (POS)</SelectItem><SelectItem value="inkjet">Inyección de Tinta</SelectItem><SelectItem value="laser">Láser</SelectItem></SelectContent></Select></div>
                )} />
                <Controller name="connection" control={control} render={({ field }) => (
                    <div><Label>Conexión</Label><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="network">Red (IP)</SelectItem><SelectItem value="usb">USB</SelectItem><SelectItem value="bluetooth">Bluetooth</SelectItem><SelectItem value="wifi">WiFi</SelectItem></SelectContent></Select></div>
                )} />
            </div>

            {connectionType === 'network' && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2"><Label htmlFor="ipAddress">Dirección IP</Label><Input id="ipAddress" {...register('ipAddress')} placeholder="192.168.1.100" /></div>
                    <div><Label htmlFor="port">Puerto</Label><Input id="port" type="number" {...register('port')} /></div>
                </div>
            )}
            
            <Controller name="paperWidth" control={control} render={({ field }) => (
                 <div><Label>Ancho del Papel</Label><Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="58">58mm</SelectItem><SelectItem value="80">80mm</SelectItem></SelectContent></Select></div>
            )} />

            <div className="flex items-center space-x-2">
                <Controller name="isDefault" control={control} render={({ field }) => (<Switch id="isDefault" checked={field.value} onCheckedChange={field.onChange} />)} />
                <Label htmlFor="isDefault">Impresora por defecto</Label>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Guardando...' : existingPrinter ? 'Guardar Cambios' : 'Crear Impresora'}
                </Button>
            </div>
        </form>
    );
}
