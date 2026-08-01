'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { getWishlist, saveWishlist } from '@/lib/storage/driveStorage';
import type { Wishlist, WishlistItem } from '@/types/wishlist';

export function useWishlist() {
  const { driveStorage, loading: driveLoading } = useGoogleDrive();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wishlistRef = useRef(wishlist);
  useEffect(() => {
    wishlistRef.current = wishlist;
  }, [wishlist]);

  useEffect(() => {
    if (!driveStorage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getWishlist(driveStorage);
        if (!cancelled) setWishlist(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load wishlist');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [driveStorage]);

  const addItem = useCallback(
    async (item: Omit<WishlistItem, 'id' | 'addedAt'>): Promise<WishlistItem> => {
      if (!driveStorage) throw new Error('Not authenticated');

      const newItem: WishlistItem = {
        ...item,
        id: crypto.randomUUID(),
        addedAt: new Date().toISOString(),
      };

      const previousWishlist = wishlistRef.current;

      setWishlist((prev) => {
        return {
          items: [newItem, ...(prev?.items ?? [])],
        };
      });

      try {
        const updatedList: Wishlist = {
          items: [newItem, ...(previousWishlist?.items ?? [])],
        };
        await saveWishlist(driveStorage, updatedList);
        return newItem;
      } catch (err) {
        setWishlist(previousWishlist);
        throw err;
      }
    },
    [driveStorage]
  );

  const removeItem = useCallback(
    async (id: string): Promise<void> => {
      if (!driveStorage) throw new Error('Not authenticated');

      const previousWishlist = wishlistRef.current;

      setWishlist((prev) => {
        if (!prev) return prev;
        return {
          items: prev.items.filter((item) => item.id !== id),
        };
      });

      try {
        const updatedList: Wishlist = {
          items: (previousWishlist?.items ?? []).filter((item) => item.id !== id),
        };
        await saveWishlist(driveStorage, updatedList);
      } catch (err) {
        setWishlist(previousWishlist);
        throw err;
      }
    },
    [driveStorage]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<WishlistItem, 'id' | 'addedAt'>>): Promise<WishlistItem> => {
      if (!driveStorage) throw new Error('Not authenticated');

      const previousWishlist = wishlistRef.current;
      const currentItem = previousWishlist?.items.find((i) => i.id === id);
      if (!currentItem) throw new Error('Item not found');

      const updatedItem = { ...currentItem, ...updates };

      setWishlist((prev) => {
        if (!prev) return prev;
        return {
          items: prev.items.map((item) => (item.id === id ? updatedItem : item)),
        };
      });

      try {
        const updatedList: Wishlist = {
          items: (previousWishlist?.items ?? []).map((item) => (item.id === id ? updatedItem : item)),
        };
        await saveWishlist(driveStorage, updatedList);
        return updatedItem;
      } catch (err) {
        setWishlist(previousWishlist);
        throw err;
      }
    },
    [driveStorage]
  );

  return {
    wishlist,
    loading: loading || driveLoading,
    error,
    addItem,
    removeItem,
    updateItem,
  };
}
