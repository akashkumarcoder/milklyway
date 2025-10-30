import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  QueryConstraint, 
  getDocs,
  DocumentData,
  Query,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseFirestoreOptions {
  cacheKey?: string;
  cacheDuration?: number; // in minutes
  realtime?: boolean; // whether to use realtime updates
}

export function useFirestore<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  options: UseFirestoreOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  const fetchData = useCallback(async () => {
    // Clean up any previous subscription before starting a new one
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

      try {
        // Check cache if cacheKey is provided
        if (options.cacheKey) {
          const cached = sessionStorage.getItem(options.cacheKey);
          if (cached) {
            const { data: cachedData, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            const maxAge = (options.cacheDuration || 5) * 60 * 1000; // Default 5 minutes

            if (age < maxAge) {
              setData(cachedData);
              setLoading(false);
              return;
            }
          }
        }

        // Create query
        const q = query(collection(db, collectionName), ...constraints);

        if (options.realtime) {
          // Use realtime updates
          unsubscribeRef.current = onSnapshot(q, 
            (snapshot) => {
              const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as T[];

              // Update cache if cacheKey is provided
              if (options.cacheKey) {
                sessionStorage.setItem(options.cacheKey, JSON.stringify({
                  data: results,
                  timestamp: Date.now()
                }));
              }

              setData(results);
              setError(null);
              setLoading(false);
            },
            (err) => {
              console.error('Firestore realtime error:', err);
              setError(err);
              setLoading(false);
            }
          );
        } else {
          // Use one-time fetch
          const querySnapshot = await getDocs(q);
          const results = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];

          // Update cache if cacheKey is provided
          if (options.cacheKey) {
            sessionStorage.setItem(options.cacheKey, JSON.stringify({
              data: results,
              timestamp: Date.now()
            }));
          }

          setData(results);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Firestore query error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, JSON.stringify(constraints), options.cacheKey, options.cacheDuration, options.realtime, reloadToken]);

  useEffect(() => {
    fetchData();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    setLoading(true);
    setReloadToken(Date.now());
  }, []);

  return { data, loading, error, refetch };
}

// Helper function to create a cache key
export function createCacheKey(prefix: string, params: Record<string, any> = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('_');
  return `${prefix}_${sortedParams}`;
}