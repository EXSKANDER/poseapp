import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Favourite } from '@/types/models';
import { STORAGE_KEYS } from '@/constants/storage-keys';

export function useFavourites() {
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.favourites);
        if (stored) {
          setFavourites(JSON.parse(stored));
        }
      } catch {
        // ignore read errors
      }
      setLoaded(true);
    };
    load();
  }, []);

  const persist = useCallback(async (next: Favourite[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.favourites, JSON.stringify(next));
    } catch {
      // ignore write errors
    }
  }, []);

  const isFavourite = useCallback(
    (poseId: string) => favourites.some((f) => f.poseId === poseId),
    [favourites],
  );

  const addFavourite = useCallback(
    (poseId: string) => {
      if (isFavourite(poseId)) return;
      const entry: Favourite = { poseId, addedAt: new Date().toISOString() };
      const next = [...favourites, entry];
      setFavourites(next);
      persist(next);
    },
    [favourites, isFavourite, persist],
  );

  const removeFavourite = useCallback(
    (poseId: string) => {
      const next = favourites.filter((f) => f.poseId !== poseId);
      setFavourites(next);
      persist(next);
    },
    [favourites, persist],
  );

  const toggleFavourite = useCallback(
    (poseId: string) => {
      if (isFavourite(poseId)) {
        removeFavourite(poseId);
      } else {
        addFavourite(poseId);
      }
    },
    [isFavourite, addFavourite, removeFavourite],
  );

  const favouriteIds = favourites.map((f) => f.poseId);

  return {
    favourites,
    favouriteIds,
    loaded,
    isFavourite,
    addFavourite,
    removeFavourite,
    toggleFavourite,
  };
}
