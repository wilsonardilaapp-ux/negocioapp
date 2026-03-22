
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HardDrive, Upload, Clock, CheckCircle, XCircle, RefreshCw, PlusCircle, Database } from 'lucide-react';
import type { Backup } from '@/models/backup';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const BackupStatusIcon = ({ status }: { status: Backup['status'] }) => {
    switch (status) {
        case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-600" />;
        case 'FAILED': return <XCircle className="w-5 h-5 text-red-600" />;
        case 'RUNNING': return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
        case 'PENDING': return <Clock className="w-5 h-5 text-gray-400" />;
        default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
};

export default function BackupsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const businessId = user?.uid;

    const backupsQuery = useMemoFirebase(() => {
        if (!firestore || !businessId) return null;
        return query(collection(firestore, `businesses/${businessId}/backups`), orderBy('createdAt', 'desc'), limit(10));
    }, [firestore, businessId]);

    const { data: recentBackups, isLoading } = useCollection<Backup>(backupsQuery);

    const stats = useMemo(() => {
        const totalSize = recentBackups?.reduce((acc, b) => acc + (b.sizeBytes || 0), 0) || 0;
        const successfulBackups = recentBackups?.filter(b => b.status === 'COMPLETED').length || 0;
        const failedBackups = recentBackups?.filter(b => b.status === 'FAILED').length || 0;
        return {
            totalBackups: recentBackups?.length || 0,
            successfulBackups,
            failedBackups,
            totalSize,
            storageUsed: 123456789, // Mock data
            storageTotal: 1073741824, // Mock data (1GB)
        };
    }, [recentBackups]);

    const handleCreateBackup = (type: 'FULL') => {
        alert(`Funcionalidad para crear backup de tipo ${type} no implementada.`);
        setShowCreateModal(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl font-bold">Gestión de Copias de Seguridad</CardTitle>
                        <CardDescription>Administra y monitorea los respaldos de tu negocio.</CardDescription>
                    </div>
                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Backup</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crear Backup Manual</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <p>Selecciona el tipo de backup que deseas iniciar. Esta acción se ejecutará en segundo plano.</p>
                                <Button className="w-full" variant="outline" onClick={() => handleCreateBackup('FULL')}>
                                    <Database className="w-4 h-4 mr-2" />
                                    Backup Completo
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Backups</p><p className="text-2xl font-bold">{stats.totalBackups}</p></div><HardDrive className="w-8 h-8 text-muted-foreground" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Exitosos</p><p className="text-2xl font-bold text-green-600">{stats.successfulBackups}</p></div><CheckCircle className="w-8 h-8 text-green-600" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Fallidos</p><p className="text-2xl font-bold text-red-600">{stats.failedBackups}</p></div><XCircle className="w-8 h-8 text-red-600" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Tamaño Total</p><p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p></div><Upload className="w-8 h-8 text-muted-foreground" /></div></CardContent></Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Uso de Almacenamiento</CardTitle></CardHeader>
                <CardContent><div className="space-y-2"><div className="flex justify-between text-sm"><span>{formatBytes(stats.storageUsed)} usado</span><span>{formatBytes(stats.storageTotal)} total</span></div><Progress value={(stats.storageUsed / stats.storageTotal) * 100} /></div></CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Backups Recientes</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoading ? <p className="text-center p-8">Cargando backups...</p> : 
                        recentBackups && recentBackups.length > 0 ? (
                            recentBackups.map((backup: Backup) => (
                                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <BackupStatusIcon status={backup.status} />
                                        <div>
                                            <p className="font-medium">{backup.name}</p>
                                            <p className="text-sm text-muted-foreground">{new Date(backup.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant={backup.type === 'FULL' ? 'default' : 'secondary'}>{backup.type}</Badge>
                                        <span className="text-sm">{formatBytes(backup.sizeBytes || 0)}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground p-8">No hay backups recientes para este negocio.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
