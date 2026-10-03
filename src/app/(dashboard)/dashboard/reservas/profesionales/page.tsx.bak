'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  PlusCircle, 
  Loader2, 
  Search,
  UserCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { StaffCard } from '@/components/reservas/StaffCard';
import { StaffForm } from '@/components/reservas/StaffForm';
import type { BookingStaff, BookingService } from '@/models/booking';
import { createPortal } from 'react-dom';

/**
 * @fileOverview Página administrativa para la gestión del equipo de profesionales.
 */

export default function ProfesionalesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<BookingStaff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const staffQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return collection(firestore, `businesses/${user.uid}/bookingStaff`);
  }, [user?.uid, firestore]);

  const servicesQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return collection(firestore, `businesses/${user.uid}/bookingServices`);
  }, [user?.uid, firestore]);

  const { data: staffList, isLoading: isStaffLoading } = useCollection<BookingStaff>(staffQuery);
  const { data: services, isLoading: isServicesLoading } = useCollection<BookingService>(servicesQuery);

  const filteredStaff = (staffList || []).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.specialty && s.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (staff: BookingStaff | null = null) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (data: Omit<BookingStaff, 'id'>) => {
    if (!user || !firestore) return;
    try {
      if (editingStaff) {
        const docRef = doc(firestore, `businesses/${user.uid}/bookingStaff`, editingStaff.id);
        await setDocumentNonBlocking(docRef, data, { merge: true });
      } else {
        const colRef = collection(firestore, `businesses/${user.uid}/bookingStaff`);
        const newDocRef = doc(colRef);
        await setDocumentNonBlocking(newDocRef, {
          ...data,
          id: newDocRef.id
        });
      }
      setIsModalOpen(false);
      toast({ title: '¡Éxito!', description: 'El profesional ha sido registrado correctamente.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar' });
    }
  };

  const handleToggleStatus = async (staff: BookingStaff) => {
    if (!user || !firestore) return;
    try {
      const docRef = doc(firestore, `businesses/${user.uid}/bookingStaff`, staff.id);
      await updateDocumentNonBlocking(docRef, { isActive: !staff.isActive });
      toast({ title: `Estado actualizado` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!user || !firestore) return;
    try {
      const docRef = doc(firestore, `businesses/${user.uid}/bookingStaff`, id);
      await deleteDocumentNonBlocking(docRef);
      toast({ title: 'Registro eliminado', variant: 'destructive' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  };

  const isLoading = isStaffLoading || isServicesLoading;

  const headerActions = mounted && document.getElementById('reservas-header-actions') 
    ? createPortal(
        <Button onClick={() => handleOpenModal()} className="font-bold shadow-md h-12 px-6">
          <PlusCircle className="mr-2 h-5 w-5" />
          Nuevo Profesional
        </Button>,
        document.getElementById('reservas-header-actions')!
      ) 
    : null;

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-500">
      {headerActions}
      <div className="flex items-center gap-4 max-w-md mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar por nombre o especialidad..." 
            className="pl-10 h-11 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Sincronizando equipo...</p>
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((staff) => (
            <StaffCard 
              key={staff.id} 
              staff={staff} 
              allServices={services || []}
              onEdit={handleOpenModal}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteStaff}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20 border-2">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="p-4 bg-white rounded-3xl shadow-sm border">
              <UserCheck className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-800">No hay profesionales registrados</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Añade a los miembros de tu equipo y marca qué servicios puede realizar cada uno.
              </p>
            </div>
            <Button onClick={() => handleOpenModal()} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5 h-12 px-8 rounded-xl">
              Registrar mi primer profesional
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => !isStaffLoading && setIsModalOpen(open)}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden rounded-2xl border-none">
          <DialogHeader className="p-8 pb-2">
            <DialogTitle className="text-2xl font-black">{editingStaff ? 'Editar Profesional' : 'Nuevo Profesional'}</DialogTitle>
            <DialogDescription className="text-sm font-medium">
              Define quién es y qué servicios puede prestar en tu negocio.
            </DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-8">
            <StaffForm 
              existingStaff={editingStaff} 
              services={services || []}
              onSave={handleSaveStaff}
              onClose={() => setIsModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
