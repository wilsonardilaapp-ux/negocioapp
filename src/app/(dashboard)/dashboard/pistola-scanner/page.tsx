'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine } from 'lucide-react';

export default function PistolaScannerClientPage() {

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pistola Escáner</CardTitle>
                <CardDescription>Gestión de dispositivos de escaneo para tu negocio.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                    <div className="p-4 bg-secondary rounded-full">
                        <ScanLine className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold">Módulo en Construcción</h3>
                    <p className="text-muted-foreground max-w-sm">
                        La funcionalidad para gestionar tus pistolas de escaneo desde este panel estará disponible próximamente.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
