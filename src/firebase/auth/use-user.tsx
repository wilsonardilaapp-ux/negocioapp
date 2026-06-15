
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, type Unsubscribe } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { User as UserProfile } from '@/models/user';

interface UserAuthState {
  user: User | null;
  profile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// EMAILS CON ACCESO TOTAL DE ADMINISTRADOR
const SUPER_ADMIN_EMAILS = [
  'allseosoporte@gmail.com',
  'admin@zentry.com',
  'admin@ecosalud.com',
  'pcuser@gmail.com'
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

  // Effect 1: Monitorear cambios en Firebase Auth
  useEffect(() => {
    if (!auth || !isNetworkEnabled) {
        setAuthState({ user: null, isLoading: false, error: null });
        return;
    };
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthState({ user, isLoading: false, error: null });
    }, (error) => {
        console.error("useUser: onAuthStateChanged error:", error);
        setAuthState({ user: null, isLoading: false, error });
    });

    return () => unsubscribe();
  }, [auth, isNetworkEnabled]);

  // Effect 2: Obtener Perfil y Auto-Recuperación
  useEffect(() => {
    if (!firestore || !authState.user) {
        setProfile(null);
        setProfileLoading(false);
        return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', authState.user.uid);

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setProfileLoading(false);
        } else if (authState.user) {
            // Lógica de auto-recuperación de perfil
            try {
                const businessDocRef = doc(firestore, 'businesses', authState.user.uid);
                const businessSnap = await getDoc(businessDocRef);

                if (businessSnap.exists()) {
                    const businessData = businessSnap.data();
                    const newUserProfile: UserProfile = {
                        id: authState.user.uid,
                        name: businessData.ownerName || authState.user.displayName || 'Usuario Recuperado',
                        email: authState.user.email!,
                        role: SUPER_ADMIN_EMAILS.includes(authState.user.email || '') ? 'super_admin' : 'cliente_admin',
                        status: 'active',
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                    };
                    
                    await setDoc(userDocRef, newUserProfile);
                    setProfile(newUserProfile);
                } else if (SUPER_ADMIN_EMAILS.includes(authState.user.email || '')) {
                    // Si es un admin conocido pero no tiene doc, creamos perfil virtual para permitir acceso
                    const adminProfile: UserProfile = {
                        id: authState.user.uid,
                        name: authState.user.displayName || 'Super Admin',
                        email: authState.user.email!,
                        role: 'super_admin',
                        status: 'active',
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                    };
                    setProfile(adminProfile);
                } else {
                    setProfile(null);
                }
            } catch (healError) {
                console.error("Error durante auto-recuperación de perfil:", healError);
                setProfile(null);
            } finally {
                setProfileLoading(false);
            }
        }
    }, (error) => {
        console.error("useUser: Profile onSnapshot error:", error);
        setProfile(null);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, authState.user]);

  // Effect 3: Lógica de Redirección Automática
  const isUserLoading = authState.isLoading || isProfileLoading;
  
  useEffect(() => {
    if (isUserLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');

    if (authState.user) {
        const role = profile?.role;
        
        if (role === 'super_admin') {
            if (isAuthPage || isDashboardPage) {
                router.replace('/superadmin');
            }
        } else if (role === 'cliente_admin' || role === 'staff') {
            if (isAuthPage || isSuperAdminPage) {
                router.replace('/dashboard');
            }
        } else if (isAuthPage) {
            // Redirección de emergencia si se logueó pero no hay perfil/rol definido aún
            router.replace('/dashboard');
        }
    } else {
        // No hay usuario logueado
        if (isDashboardPage || isSuperAdminPage) {
            router.replace('/login');
        }
    }
  }, [isUserLoading, authState.user, profile, pathname, router]);

  return {
    user: authState.user,
    profile: profile,
    isUserLoading: isUserLoading,
    userError: authState.error,
  };
}
