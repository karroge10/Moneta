'use client';

/**
 * Lightweight IndexedDB helpers for simple key/value caching.
 * All operations are guarded to fail-softly if IndexedDB is unavailable.
 */

const DB_NAME = 'moneta-cache';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

function isIndexedDBAvailable() {
  return typeof indexedDB !== 'undefined';
}

async function getDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return null;

  return new Promise((resolve, reject) => {
    const openReq = indexedDB.open(DB_NAME, DB_VERSION);

    openReq.onupgradeneeded = () => {
      const db = openReq.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    openReq.onsuccess = () => resolve(openReq.result);
    openReq.onerror = () => reject(openReq.error);
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[idb] get failed', err);
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[idb] set failed', err);
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[idb] delete failed', err);
  }
}

