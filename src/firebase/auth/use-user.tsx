'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { User as UserProfile } from '@/models/user';

// --- LISTA BLANCA ESTRICTA DE SUPER ADMINISTRADORES ---
// Solo estos correos pueden tener acceso total a la infraestructura SaaS.
const SUPER_ADMIN_EMAILS = [
  'allseosoporte@gmail.com',
  'admin@zentry.com',
  'admin@ecosalud.com'
];

export function useUser() {
  const { auth, firestore, isNetworkEnabled } = useFirebase();
  const [authState, setAuthState] = useState<{ user: User | null; isLoading: boolean; error: Error | null; }>({
    user: null,
    isLoading: true,
    error: null,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Effect 1: Monitorear cambios en Firebase Auth
  useEffect(() => {
    if (!auth || !isNetworkEnabled) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthState({ user, isLoading: false, error: null });
    }, (error) => {
        setAuthState({ user: null, isLoading: false, error });
    });

    return () => unsubscribe();
  }, [auth, isNetworkEnabled]);

  // Effect 2: Obtener Perfil y Auto-Corrección de Roles
  useEffect(() => {
    if (!firestore || !authState.user) {
        setProfile(null);
        setProfileLoading(false);
        return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', authState.user.uid);
    const userEmail = authState.user.email || '';

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // --- LÓGICA DE SEGURIDAD: AUTOSANACIÓN DE ROLES ---
            // Si el usuario es super_admin en DB pero su email NO está en la lista blanca: DEGRADAR.
            if (data.role === 'super_admin' && !SUPER_ADMIN_EMAILS.includes(userEmail)) {
                console.warn(`[Seguridad] El usuario ${userEmail} no está autorizado como super_admin. Degradando a cliente_admin.`);
                const correctedProfile = { ...data, role: 'cliente_admin' as const };
                setProfile(correctedProfile);
                // Corregir en la base de datos de forma no bloqueante
                updateDocumentNonBlocking(userDocRef, { role: 'cliente_admin' });
            } else {
                setProfile(data);
            }
            setProfileLoading(false);
        } else if (authState.user) {
            try {
                // Auto-creación de perfil si no existe
                const isAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
                const assignedRole = isAdmin ? 'super_admin' : 'cliente_admin';
                
                const newProfile: UserProfile = {
                    id: authState.user.uid,
                    name: authState.user.displayName || 'Usuario',
                    email: userEmail,
                    role: assignedRole,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                };
                
                await setDoc(userDocRef, newProfile, { merge: true });
                setProfile(newProfile);
            } catch (e) {
                console.error("Error al crear perfil automático:", e);
            } finally {
                setProfileLoading(false);
            }
        }
    }, (error) => {
        console.error("Error en el listener de perfil:", error);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, authState.user]);

  // Effect 3: Lógica de Redirección Automática por Rol
  useEffect(() => {
    if (authState.isLoading || isProfileLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');

    if (authState.user) {
        const role = profile?.role;

        if (role === 'super_admin') {
            if (isAuthPage || isDashboardPage) {
                router.replace('/superadmin');
            }
        } else {
            // Usuarios cliente_admin o staff
            if (isAuthPage || isSuperAdminPage) {
                router.replace('/dashboard');
            }
        }
    } else {
        if (isDashboardPage || isSuperAdminPage) {
            router.replace('/login');
        }
    }
  }, [authState.isLoading, authState.user, profile, isProfileLoading, pathname, router]);

  return {
    user: authState.user,
    profile: profile,
    isUserLoading: authState.isLoading,
    isProfileLoading: isProfileLoading,
    userError: authState.error,
  };
}