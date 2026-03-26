
'use client';

import { useFirebase } from '@/firebase';

export interface UserHookResult {
  user: any | null; // Replace 'any' with your User type
  isUserLoading: boolean;
  userError: Error | null;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
