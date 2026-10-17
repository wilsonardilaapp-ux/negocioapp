'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { useFirebase } from '../provider';
import { updateDocumentNonBlocking } from '../non-blocking-updates';
import type { User as UserProfile } from '../../models/user';

// --- LISTA BLANCA ESTRICTA DE SUPER ADMINISTRADORES ---
export const SUPER_ADMIN_EMAILS = [
  'allseosoporte@gmail.com',
  'admin@zentry.com',
  'admin@ecosalud.com',
  'alexjfweb@gmail.com'
];

/**
 * Determina el estado de actividad basado en la última fecha de uso.
 */
const getActivityStatus = (lastActiveAtISO: string): string => {
  const now = new Date();
  const lastActive = new Date(lastActiveAtISO);
  const diffInDays = (now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24);

  if (diffInDays < 3) return 'active';
  if (diffInDays <= 7) return 'at_risk';
  return 'dormant';
};

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
        console.error("Auth State Error:", error);
        setAuthState({ user: null, isLoading: false, error });
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [auth, isNetworkEnabled]);

  // 2. Obtener Perfil y Autosanación de Roles (Estabilizado por UID)
  useEffect(() => {
    const userId = authState.user?.uid;
    if (!firestore || !userId) {
        if (!authState.isLoading && !authState.user) {
            setProfileLoading(false);
        }
        return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', userId);
    const userEmail = authState.user?.email?.toLowerCase().trim() || '';

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isAuthorizedAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
            
            if (data.role === 'super_admin' && !isAuthorizedAdmin) {
                console.warn(`[Seguridad] Degradando usuario no autorizado: ${userEmail}`);
                setProfile({ ...data, role: 'cliente_admin' as const });
                updateDocumentNonBlocking(userDocRef, { role: 'cliente_admin' });
            } else if (data.role !== 'super_admin' && isAuthorizedAdmin) {
                console.log(`[Seguridad] Elevando privilegios para admin autorizado: ${userEmail}`);
                setProfile({ ...data, role: 'super_admin' as const });
                updateDocumentNonBlocking(userDocRef, { role: 'super_admin' });
            } else {
                setProfile(data);
            }
        } else {
            const isAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
            const newProfile: UserProfile = {
                id: userId,
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
        console.error("Firestore Profile Listener Error:", error);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, authState.user?.uid, authState.isLoading]);

  // 3. Activity Tracker para Negocios
  useEffect(() => {
    if (!firestore || !authState.user || !profile || profile.role !== 'cliente_admin') return;

    const trackActivity = async () => {
        try {
            const businessId = authState.user!.uid;
            const businessRef = doc(firestore, 'businesses', businessId);
            const businessSnap = await getDoc(businessRef);

            if (businessSnap.exists()) {
                const data = businessSnap.data();
                const lastActiveAt = data.lastActiveAt;
                const now = new Date();
                
                let shouldUpdate = true;
                if (lastActiveAt) {
                    const lastDate = new Date(lastActiveAt);
                    const diffInMinutes = (now.getTime() - lastDate.getTime()) / (1000 * 60);
                    if (diffInMinutes < 10) shouldUpdate = false;
                }

                if (shouldUpdate) {
                    const nowISO = now.toISOString();
                    updateDocumentNonBlocking(businessRef, {
                        lastActiveAt: nowISO,
                        activityStatus: getActivityStatus(nowISO)
                    });
                }
            }
        } catch (e) {
            console.error("[ActivityTracker] Error:", e);
        }
    };

    if (!authState.isLoading && !isProfileLoading) trackActivity();
  }, [firestore, authState.user?.uid, authState.isLoading, profile?.role, isProfileLoading]);

  // 4. Lógica de Redirección Robusta
  useEffect(() => {
    if (authState.isLoading || isProfileLoading || isRedirecting.current) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');

    if (!authState.user) {
        if (isDashboardPage || isSuperAdminPage) {
            isRedirecting.current = true;
            router.replace('/login');
        }
        return;
    }

    if (profile) {
        const isAdmin = profile.role === 'super_admin';
        if (isAdmin) {
            if (isAuthPage || isDashboardPage || pathname === '/') {
                isRedirecting.current = true;
                router.replace('/superadmin');
            }
        } else {
            if (isAuthPage || isSuperAdminPage) {
                isRedirecting.current = true;
                router.replace('/dashboard');
            }
        }
    }

    const timer = setTimeout(() => { isRedirecting.current = false; }, 1000);
    return () => clearTimeout(timer);
  }, [authState.isLoading, authState.user?.uid, profile?.role, isProfileLoading, pathname, router]);

  return {
    user: authState.user,
    profile: profile,
    isUserLoading: authState.isLoading || (!!authState.user && isProfileLoading),
    isProfileLoading: isProfileLoading,
    userError: authState.error,
  };
}
