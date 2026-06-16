'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { User as UserProfile } from '@/models/user';

// EMAILS CON ACCESO TOTAL DE ADMINISTRADOR DE PLATAFORMA
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
            try {
                // BYPASS INMEDIATO PARA ADMINS DE PLATAFORMA
                if (SUPER_ADMIN_EMAILS.includes(authState.user.email || '')) {
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
                    setDoc(userDocRef, adminProfile, { merge: true }).catch(() => {});
                } else {
                    const businessDocRef = doc(firestore, 'businesses', authState.user.uid);
                    const businessSnap = await getDoc(businessDocRef);

                    if (businessSnap.exists()) {
                        const businessData = businessSnap.data();
                        const newUserProfile: UserProfile = {
                            id: authState.user.uid,
                            name: businessData.ownerName || authState.user.displayName || 'Usuario',
                            email: authState.user.email!,
                            role: 'cliente_admin',
                            status: 'active',
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString(),
                        };
                        setDoc(userDocRef, newUserProfile).catch(() => {});
                        setProfile(newUserProfile);
                    }
                }
            } finally {
                setProfileLoading(false);
            }
        }
    }, () => {
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, authState.user]);

  // Effect 3: Lógica de Redirección Automática
  useEffect(() => {
    if (authState.isLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');

    if (authState.user) {
        const userEmail = authState.user.email || '';
        const isPlatformAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
        const role = profile?.role;

        // Redirección basada en rol
        if (role) {
            if (role === 'super_admin' && (isAuthPage || isDashboardPage)) {
                router.replace('/superadmin');
            } else if ((role === 'cliente_admin' || role === 'staff') && (isAuthPage || isSuperAdminPage)) {
                router.replace('/dashboard');
            }
        } else if (isAuthPage && !isProfileLoading) {
            // Si el login terminó pero no hay perfil aún, enviar a dashboard
            router.replace('/dashboard');
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