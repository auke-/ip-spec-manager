import { Injectable } from '@angular/core';
import { SpecType, SuwimlServiceProperties } from '../models/gitlab.models';

export interface CachedProjectMetadata {
  projectId: number;
  defaultBranch: string;
  latestCommitSha: string;
  specType: SpecType;
  currentTag: string;
  operations?: string[];
  suwimlHeaderVersion?: string;
  serviceProperties?: SuwimlServiceProperties;
  cachedAt: number; // Unix ms
  lastVerifiedAt?: number; // Unix ms
}

export interface StorageStats {
  count: number;
  storageType: 'indexeddb' | 'localstorage' | 'memory';
}

@Injectable({
  providedIn: 'root'
})
export class ProjectCacheService {
  private readonly DB_NAME = 'gitlab_spec_cache_db';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'project_metadata';
  private readonly LOCAL_STORAGE_PREFIX = 'gitlab_spec_proj_';
  private readonly LOCAL_STORAGE_INDEX_KEY = 'gitlab_spec_proj_ids';

  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDbAvailable = true;
  private memoryFallback = new Map<number, CachedProjectMetadata>();

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isIndexedDbAvailable = false;
      return Promise.reject(new Error('IndexedDB is not available in this environment'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME, { keyPath: 'projectId' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          this.isIndexedDbAvailable = false;
          reject(request.error);
        };
      } catch (err) {
        this.isIndexedDbAvailable = false;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  async get(projectId: number): Promise<CachedProjectMetadata | null> {
    // 1. Try IndexedDB
    if (this.isIndexedDbAvailable) {
      try {
        const db = await this.initDb();
        return await new Promise<CachedProjectMetadata | null>((resolve) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.get(projectId);
          req.onsuccess = () => resolve((req.result as CachedProjectMetadata) || null);
          req.onerror = () => resolve(null);
        });
      } catch {
        // Fall through to fallback
      }
    }

    // 2. Try LocalStorage fallback
    try {
      const raw = localStorage.getItem(`${this.LOCAL_STORAGE_PREFIX}${projectId}`);
      if (raw) {
        return JSON.parse(raw) as CachedProjectMetadata;
      }
    } catch {
      // ignore
    }

    // 3. Try In-memory fallback
    return this.memoryFallback.get(projectId) || null;
  }

  async getAll(): Promise<Map<number, CachedProjectMetadata>> {
    const map = new Map<number, CachedProjectMetadata>();

    // 1. Try IndexedDB
    if (this.isIndexedDbAvailable) {
      try {
        const db = await this.initDb();
        const records = await new Promise<CachedProjectMetadata[]>((resolve) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result as CachedProjectMetadata[]) || []);
          req.onerror = () => resolve([]);
        });

        for (const item of records) {
          map.set(item.projectId, item);
        }
        return map;
      } catch {
        // Fall through to fallback
      }
    }

    // 2. Try LocalStorage fallback
    try {
      const idsRaw = localStorage.getItem(this.LOCAL_STORAGE_INDEX_KEY);
      if (idsRaw) {
        const ids = JSON.parse(idsRaw) as number[];
        for (const id of ids) {
          const raw = localStorage.getItem(`${this.LOCAL_STORAGE_PREFIX}${id}`);
          if (raw) {
            const parsed = JSON.parse(raw) as CachedProjectMetadata;
            map.set(parsed.projectId, parsed);
          }
        }
        if (map.size > 0) return map;
      }
    } catch {
      // ignore
    }

    // 3. In-memory fallback
    return new Map(this.memoryFallback);
  }

  async set(record: CachedProjectMetadata): Promise<void> {
    this.memoryFallback.set(record.projectId, record);

    if (this.isIndexedDbAvailable) {
      try {
        const db = await this.initDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        return;
      } catch {
        // Fall through to LocalStorage
      }
    }

    try {
      localStorage.setItem(`${this.LOCAL_STORAGE_PREFIX}${record.projectId}`, JSON.stringify(record));
      const idsRaw = localStorage.getItem(this.LOCAL_STORAGE_INDEX_KEY);
      const ids: number[] = idsRaw ? JSON.parse(idsRaw) : [];
      if (!ids.includes(record.projectId)) {
        ids.push(record.projectId);
        localStorage.setItem(this.LOCAL_STORAGE_INDEX_KEY, JSON.stringify(ids));
      }
    } catch {
      // In-memory already updated
    }
  }

  async setBatch(records: CachedProjectMetadata[]): Promise<void> {
    for (const r of records) {
      this.memoryFallback.set(r.projectId, r);
    }

    if (this.isIndexedDbAvailable) {
      try {
        const db = await this.initDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          for (const item of records) {
            store.put(item);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        return;
      } catch {
        // Fall through to LocalStorage
      }
    }

    try {
      const idsRaw = localStorage.getItem(this.LOCAL_STORAGE_INDEX_KEY);
      const ids: number[] = idsRaw ? JSON.parse(idsRaw) : [];
      for (const r of records) {
        localStorage.setItem(`${this.LOCAL_STORAGE_PREFIX}${r.projectId}`, JSON.stringify(r));
        if (!ids.includes(r.projectId)) {
          ids.push(r.projectId);
        }
      }
      localStorage.setItem(this.LOCAL_STORAGE_INDEX_KEY, JSON.stringify(ids));
    } catch {
      // In-memory updated
    }
  }

  async delete(projectId: number): Promise<void> {
    this.memoryFallback.delete(projectId);

    if (this.isIndexedDbAvailable) {
      try {
        const db = await this.initDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.delete(projectId);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch {
        // ignore
      }
    }

    try {
      localStorage.removeItem(`${this.LOCAL_STORAGE_PREFIX}${projectId}`);
      const idsRaw = localStorage.getItem(this.LOCAL_STORAGE_INDEX_KEY);
      if (idsRaw) {
        const ids = (JSON.parse(idsRaw) as number[]).filter(id => id !== projectId);
        localStorage.setItem(this.LOCAL_STORAGE_INDEX_KEY, JSON.stringify(ids));
      }
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    this.memoryFallback.clear();

    if (this.isIndexedDbAvailable) {
      try {
        const db = await this.initDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch {
        // ignore
      }
    }

    try {
      const idsRaw = localStorage.getItem(this.LOCAL_STORAGE_INDEX_KEY);
      if (idsRaw) {
        const ids = JSON.parse(idsRaw) as number[];
        for (const id of ids) {
          localStorage.removeItem(`${this.LOCAL_STORAGE_PREFIX}${id}`);
        }
        localStorage.removeItem(this.LOCAL_STORAGE_INDEX_KEY);
      }
    } catch {
      // ignore
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    if (this.isIndexedDbAvailable) {
      try {
        const db = await this.initDb();
        const count = await new Promise<number>((resolve) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.count();
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        });
        return { count, storageType: 'indexeddb' };
      } catch {
        // Fallback
      }
    }

    try {
      const idsRaw = localStorage.getItem(this.LOCAL_STORAGE_INDEX_KEY);
      if (idsRaw) {
        const ids = JSON.parse(idsRaw) as number[];
        return { count: ids.length, storageType: 'localstorage' };
      }
    } catch {
      // fallback
    }

    return { count: this.memoryFallback.size, storageType: 'memory' };
  }
}
