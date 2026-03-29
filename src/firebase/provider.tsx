'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, enableNetwork, onSnapshot, Unsubscribe } from 'firebase/firestore';
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

    let profileUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        // First, clean up any previous profile listener
        if (profileUnsubscribe) {
            profileUnsubscribe();
            profileUnsubscribe = undefined;
        }

        if (currentUser) {
            const userDocRef = doc(firestore, 'users', currentUser.uid);

            // Set up a real-time listener for the user's profile document
            profileUnsubscribe = onSnapshot(
                userDocRef,
                (userDocSnap) => {
                    let profile: UserProfile | null = null;
                    if (userDocSnap.exists()) {
                        profile = userDocSnap.data() as UserProfile;
                    } else if (SUPER_ADMIN_EMAILS.includes(currentUser.email || '')) {
                        // Fallback for super admin if profile doc doesn't exist for some reason
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
                    // Update state with the current user and their real-time profile
                    setUserAuthState({ user: currentUser, profile, isUserLoading: false, userError: null });
                },
                (error) => {
                    console.error("FirebaseProvider: Profile onSnapshot error:", error);
                    setUserAuthState({ user: currentUser, profile: null, isUserLoading: false, userError: error });
                }
            );

        } else {
            // User is logged out
            setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        if (profileUnsubscribe) profileUnsubscribe();
        setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: error });
      }
    );

    // Cleanup function for the main useEffect
    return () => {
        authUnsubscribe();
        if (profileUnsubscribe) {
            profileUnsubscribe();
        }
    };
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
