
"use client";

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, initiateEmailSignUp, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { User } from '@/models/user';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const userSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  email: z.string().email("Correo electrónico no válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  role: z.enum(['cliente_admin', 'staff', 'super_admin']),
});

const editUserSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  role: z.enum(['cliente_admin', 'staff', 'super_admin']),
});


export default function UsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting: isAdding } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
        name: '',
        email: '',
        password: '',
        role: 'cliente_admin' as const,
    }
  });
  
  const { register: registerEdit, handleSubmit: handleSubmitEdit, control: controlEdit, reset: resetEdit, formState: { errors: errorsEdit, isSubmitting: isEditing } } = useForm({
      resolver: zodResolver(editUserSchema),
  });

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const filteredUsers = useMemoFirebase(() => {
    return users?.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];
  }, [users, searchTerm]);
  
  const onAddSubmit = async (data: z.infer<typeof userSchema>) => {
    if (!auth || !firestore) return;
    try {
        const userCredential = await initiateEmailSignUp(auth, data.email, data.password);
        const newAuthUser = userCredential.user;

        const userDocRef = doc(firestore, 'users', newAuthUser.uid);
        const newUserDoc: User = {
            id: newAuthUser.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };
        await setDoc(userDocRef, newUserDoc);

        toast({
            title: 'Usuario Creado',
            description: `El usuario ${data.name} ha sido creado con éxito.`,
        });
        
        reset();
        setAddDialogOpen(false);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al crear usuario',
            description: error.message || 'No se pudo crear el usuario. Verifique el correo o la contraseña.',
        });
    }
  };
  
  const onEditSubmit = async (data: z.infer<typeof editUserSchema>) => {
    if (!firestore || !editingUser) return;
    const userDocRef = doc(firestore, 'users', editingUser.id);
    updateDocumentNonBlocking(userDocRef, data);
    toast({
        title: 'Usuario Actualizado',
        description: `Los datos de ${data.name} han sido actualizados.`,
    });
    setEditDialogOpen(false);
    setEditingUser(null);
  }
  
  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user);
    resetEdit({ name: user.name, role: user.role });
    setEditDialogOpen(true);
  }
  
  const handleStatusChange = (user: User) => {
    if (!firestore) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const userDocRef = doc(firestore, 'users', user.id);
    updateDocumentNonBlocking(userDocRef, { status: newStatus });
    toast({
        title: 'Estado Cambiado',
        description: `El usuario ${user.name} ahora está ${newStatus}.`,
    });
  }
  
  const handleDeleteUser = async (user: User) => {
    if (!firestore) return;
    try {
        const userDocRef = doc(firestore, 'users', user.id);
        await deleteDoc(userDocRef);
        toast({
            title: 'Usuario Eliminado',
            description: `El usuario ${user.name} ha sido eliminado.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al eliminar',
            description: error.message || "No se pudo eliminar el usuario.",
        });
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'cliente_admin':
        return 'default';
       case 'staff':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>
                Gestiona los usuarios de la plataforma.
                </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Completa el formulario para registrar un nuevo usuario en la plataforma.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                   <div className="relative">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-7 h-7 w-7" 
                        onClick={() => setShowPassword(prev => !prev)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="role">Rol</Label>
                    <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cliente_admin">Cliente Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
                  </div>
                   <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isAdding}>
                        {isAdding ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(user.role)}>{user.role.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleOpenEditDialog(user)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(user)}>Cambiar estado</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará el usuario de la base de datos, pero no de la autenticación de Firebase.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user)} className="bg-destructive hover:bg-destructive/90">
                                    Sí, eliminar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                           </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    {/* Edit User Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
        <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
            Modifica los detalles del usuario. El correo electrónico no se puede cambiar.
            </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
            <div>
            <Label htmlFor="edit-name">Nombre Completo</Label>
            <Input id="edit-name" {...registerEdit('name')} />
            {errorsEdit.name && <p className="text-sm text-destructive mt-1">{errorsEdit.name.message}</p>}
            </div>
            <div>
            <Label>Correo Electrónico</Label>
            <Input value={editingUser?.email ?? ''} disabled />
            </div>
            <div>
            <Label htmlFor="edit-role">Rol</Label>
            <Controller
                name="role"
                control={controlEdit}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="edit-role">
                            <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cliente_admin">Cliente Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
            {errorsEdit.role && <p className="text-sm text-destructive mt-1">{errorsEdit.role.message}</p>}
            </div>
            <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isEditing}>
                {isEditing ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            </DialogFooter>
        </form>
        </DialogContent>
    </Dialog>
    </>
  );
}
