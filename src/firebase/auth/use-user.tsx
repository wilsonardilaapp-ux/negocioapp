'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { User as UserProfile } from '@/models/user';

// --- LISTA BLANCA ESTRICTA DE SUPER ADMINISTRADORES ---
export const SUPER_ADMIN_EMAILS = [
  'allseosoporte@gmail.com',
  'admin@zentry.com',
  'admin@ecosalud.com',
  'alexjfweb@gmail.com'
];

export function useUser() {
  const { auth, firestore, isNetworkEnabled } = useFirebase();
  const [authState, setAuthState] = useState<{ user: User | null; isLoading: boolean; error: Error | null; }>({
    user: null,
    isLoading: true,
    error: null,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const isRedirecting = useRef(false);

  // 1. Monitorear cambios en Firebase Auth
  useEffect(() => {
    if (!auth || !isNetworkEnabled) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthState({ user, isLoading: false, error: null });
        if (!user) {
            setProfile(null);
            setProfileLoading(false);
        }
    }, (error) => {
        setAuthState({ user: null, isLoading: false, error });
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [auth, isNetworkEnabled]);

  // 2. Obtener Perfil y Autosanación de Roles
  useEffect(() => {
    if (!firestore || !authState.user) return;

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', authState.user.uid);
    const userEmail = authState.user.email?.toLowerCase().trim() || '';

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // --- LÓGICA DE SEGURIDAD: AUTOSANACIÓN ---
            const isAuthorizedAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
            
            if (data.role === 'super_admin' && !isAuthorizedAdmin) {
                console.warn(`[Seguridad] Degradando usuario no autorizado: ${userEmail}`);
                const correctedProfile = { ...data, role: 'cliente_admin' as const };
                setProfile(correctedProfile);
                updateDocumentNonBlocking(userDocRef, { role: 'cliente_admin' });
            } else if (data.role !== 'super_admin' && isAuthorizedAdmin) {
                // Auto-ascensión si está en la lista blanca pero no tiene el rol
                const correctedProfile = { ...data, role: 'super_admin' as const };
                setProfile(correctedProfile);
                updateDocumentNonBlocking(userDocRef, { role: 'super_admin' });
            } else {
                setProfile(data);
            }
        } else {
            // Auto-creación si el documento no existe
            const isAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
            const newProfile: UserProfile = {
                id: authState.user!.uid,
                name: authState.user!.displayName || 'Usuario',
                email: userEmail,
                role: isAdmin ? 'super_admin' : 'cliente_admin',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile, { merge: true });
            setProfile(newProfile);
        }
        setProfileLoading(false);
    }, (error) => {
        console.error("Error en listener de perfil:", error);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, authState.user]);

  // 3. Lógica de Redirección Robusta
  useEffect(() => {
    if (authState.isLoading || isProfileLoading || isRedirecting.current) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');

    // Caso: No hay usuario autenticado
    if (!authState.user) {
        if (isDashboardPage || isSuperAdminPage) {
            isRedirecting.current = true;
            router.replace('/login');
        }
        return;
    }

    // Caso: Usuario autenticado con perfil cargado
    if (profile) {
        const role = profile.role;
        const isAdmin = role === 'super_admin';

        if (isAdmin) {
            // Super Admin solo debe estar en /superadmin
            if (isAuthPage || isDashboardPage) {
                isRedirecting.current = true;
                router.replace('/superadmin');
            }
        } else {
            // Cliente/Staff solo debe estar en /dashboard
            if (isAuthPage || isSuperAdminPage) {
                isRedirecting.current = true;
                router.replace('/dashboard');
            }
        }
    }

    // Resetear flag de redirección tras el ciclo de renderizado
    const timer = setTimeout(() => {
        isRedirecting.current = false;
    }, 500);
    
    return () => clearTimeout(timer);

  }, [authState.isLoading, authState.user, profile, isProfileLoading, pathname, router]);

  return {
    user: authState.user,
    profile: profile,
    isUserLoading: authState.isLoading,
    isProfileLoading: isProfileLoading,
    userError: authState.error,
  };
}
