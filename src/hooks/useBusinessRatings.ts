
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { DirectoryRating } from '@/models/directory-rating';

export function useBusinessRatings() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ratingsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'directoryRatings'),
      where('businessId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: ratings, isLoading, error } = useCollection<DirectoryRating>(ratingsQuery);

  return {
    ratings: ratings || [],
    isLoading,
    error,
  };
}
