'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, enableNetwork } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserProfile } from '@/models/user';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  profile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  profile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  profile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const SUPER_ADMIN_EMAILS = ['allseosoporte@gmail.com'];

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    profile: null,
    isUserLoading: true,
    userError: null,
  });
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (firestore) {
      // Ensure the network is enabled. It's safe to call this multiple times.
      enableNetwork(firestore)
        .then(() => {
          console.log("Firestore network connection enabled.");
        })
        .catch((error) => {
          console.error("Error enabling Firestore network: ", error);
        });
    }
  }, [firestore]);

  useEffect(() => {
    if (!auth || !firestore) { 
      setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: new Error("Auth/Firestore service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        let profile: UserProfile | null = null;
        
        if (currentUser) {
            try {
                const userDocRef = doc(firestore, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    profile = userDocSnap.data() as UserProfile;
                } else if (SUPER_ADMIN_EMAILS.includes(currentUser.email || '')) {
                   profile = {
                     id: currentUser.uid,
                     name: currentUser.displayName || 'Super Admin',
                     email: currentUser.email!,
                     role: 'super_admin',
                     status: 'active',
                     createdAt: new Date().toISOString(),
                     lastLogin: new Date().toISOString(),
                   };
                }
            } catch (error) {
                console.error("Profile fetch failed, using fallback. Error:", error);
                 if (SUPER_ADMIN_EMAILS.includes(currentUser.email || '')) {
                    profile = {
                        id: currentUser.uid,
                        name: currentUser.displayName || 'Super Admin',
                        email: currentUser.email!,
                        role: 'super_admin',
                        status: 'active',
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                    };
                }
            }
        }
        setUserAuthState({ user: currentUser, profile, isUserLoading: false, userError: null });
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth, firestore]);

  useEffect(() => {
    if (userAuthState.isUserLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');
    const role = userAuthState.profile?.role;

    if (userAuthState.user) {
        if (role === 'super_admin') {
            if (isAuthPage || isDashboardPage) {
                router.replace('/superadmin');
            }
        } else {
            if (isAuthPage || isSuperAdminPage) {
                router.replace('/dashboard');
            }
        }
    } else {
        if (isDashboardPage || isSuperAdminPage) {
            router.replace('/login');
        }
    }
  }, [userAuthState, pathname, router]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      profile: userAuthState.profile,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return context as Omit<FirebaseContextState, 'areServicesAvailable'> & { firebaseApp: FirebaseApp, firestore: Firestore, auth: Auth };
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  const memoized = useMemo(factory, deps);
  if(typeof memoized === 'object' && memoized !== null) {
    (memoized as any).__memo = true;
  }
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, profile, isUserLoading, userError } = useFirebase();
  return { user, profile, isUserLoading, userError };
};
