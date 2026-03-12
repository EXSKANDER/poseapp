import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Playlist } from '@/types/models';
import { STORAGE_KEYS } from '@/constants/storage-keys';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.playlists);
        if (stored) {
          setPlaylists(JSON.parse(stored));
        }
      } catch {
        // ignore read errors
      }
      setLoaded(true);
    };
    load();
  }, []);

  const persist = useCallback(async (next: Playlist[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.playlists, JSON.stringify(next));
    } catch {
      // ignore write errors
    }
  }, []);

  const createPlaylist = useCallback(
    (name: string): Playlist => {
      const now = new Date().toISOString();
      const playlist: Playlist = {
        id: Date.now().toString(),
        name: name.trim(),
        poseIds: [],
        createdAt: now,
        updatedAt: now,
      };
      const next = [...playlists, playlist];
      setPlaylists(next);
      persist(next);
      return playlist;
    },
    [playlists, persist],
  );

  const renamePlaylist = useCallback(
    (playlistId: string, newName: string) => {
      const next = playlists.map((p) =>
        p.id === playlistId
          ? { ...p, name: newName.trim(), updatedAt: new Date().toISOString() }
          : p,
      );
      setPlaylists(next);
      persist(next);
    },
    [playlists, persist],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      const next = playlists.filter((p) => p.id !== playlistId);
      setPlaylists(next);
      persist(next);
    },
    [playlists, persist],
  );

  const addToPlaylist = useCallback(
    (playlistId: string, poseId: string) => {
      const next = playlists.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.poseIds.includes(poseId)) return p;
        return {
          ...p,
          poseIds: [...p.poseIds, poseId],
          updatedAt: new Date().toISOString(),
        };
      });
      setPlaylists(next);
      persist(next);
    },
    [playlists, persist],
  );

  const removeFromPlaylist = useCallback(
    (playlistId: string, poseId: string) => {
      const next = playlists.map((p) => {
        if (p.id !== playlistId) return p;
        return {
          ...p,
          poseIds: p.poseIds.filter((id) => id !== poseId),
          updatedAt: new Date().toISOString(),
        };
      });
      setPlaylists(next);
      persist(next);
    },
    [playlists, persist],
  );

  return {
    playlists,
    loaded,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
  };
}
