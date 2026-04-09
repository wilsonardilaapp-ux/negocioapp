
// src/app/(dashboard)/dashboard/pistola-scanner/components/BadgeEstado.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { EstadoDispositivo } from '@/models/pistolaScanner';

interface BadgeEstadoProps {
    estado: EstadoDispositivo;
}

export const BadgeEstado: React.FC<BadgeEstadoProps> = ({ estado }) => {
    const getVariant = (): 'default' | 'secondary' | 'destructive' => {
        switch (estado) {
            case 'conectado':
                return 'default';
            case 'configurando':
                return 'secondary';
            case 'desconectado':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <Badge variant={getVariant()} className="capitalize">
            {estado}
        </Badge>
    );
};
