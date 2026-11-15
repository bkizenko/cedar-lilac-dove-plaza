/** Tiered save storage (bigger-maps lane).
 *
 * Contract: a synchronous `getItem/setItem` surface (`SaveStorage`) so every existing save path keeps working, backed by
 * localStorage for ordinary saves and by IndexedDB for any value that would not fit (or that exceeds OVERFLOW_CHARS).
 * - Small saves are byte-for-byte what they were: written to localStorage under the same keys (SAVE_KEY unchanged).
 * - A large value is held in an in-memory mirror, written to IndexedDB, and only THEN is a small pointer
 *   `hwidb1:<length>` written to localStorage under the same key. Until the IndexedDB write resolves, reads return the
 *   pending value, so the in-session view is always the newest write, and the localStorage key keeps its last durable value.
 * - Old saves (plain or compressed envelope text in localStorage) load unchanged; nothing is migrated until that slot is next written.
 * - `hydrateSaveStorage()` must be awaited once at boot (GameApp does); it loads every pointed-to value into the mirror.
 * Named failure paths (all observable via saveStorageStatus()): 'idb-unavailable' (no IndexedDB, e.g. private mode: a value that does
 * not fit localStorage then throws the original QuotaExceededError so autosave reports failure instead of pretending),
 * 'idb-write-failed' (value stays readable this session, localStorage keeps the previous durable value), 'idb-read-failed' and
 * 'idb-missing-value' (pointer present but data absent: getItem returns the pointer text, which no parser accepts, so hasSave() stays true
 * and the village is held for recovery rather than a fresh world replacing it), 'pointer-write-failed'. */
import type {SaveStorage} from './save';
export const OVERFLOW_CHARS = 2_000_000;
export const POINTER_PREFIX = 'hwidb1:';
export type IdbPort = {get(key: string): Promise<string | undefined>; put(key: string, value: string): Promise<void>; delete(key: string): Promise<void>};
export type SaveStoreFailure = 'idb-unavailable' | 'idb-write-failed' | 'idb-read-failed' | 'idb-missing-value' | 'pointer-write-failed';
export type SaveStoreStatus = {backend: 'localStorage' | 'indexedDB' | 'localStorage+indexedDB'; failures: {kind: SaveStoreFailure; key: string; message: string}[]; pending: number; idbKeys: string[]};
type Backing = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>;
const isQuota = (e: unknown) => !!e && typeof e === 'object' && 'name' in e && (e as {name?: string}).name === 'QuotaExceededError';
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function createIndexedDbPort(name = 'hearthwild-saves', store = 'slots'): IdbPort | null {
  if (typeof indexedDB === 'undefined') return null;
  let opened: Promise<IDBDatabase> | undefined;
  const open = () => (opened ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(store); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  }));
  const run = async <T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode), request = work(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  };
  return {
    get: async key => (await run<unknown>('readonly', s => s.get(key))) as string | undefined,
    put: async (key, value) => { await run('readwrite', s => s.put(value, key)); },
    delete: async key => { await run('readwrite', s => s.delete(key)); },
  };
}

export class TieredSaveStorage implements SaveStorage {
  private mirror = new Map<string, string>();
  private pending = new Map<string, string>();
  private chain: Promise<void> = Promise.resolve();
  private failures: SaveStoreStatus['failures'] = [];
  private backing: () => Backing | null;
  private idb: IdbPort | null;
  private overflowChars: number;
  constructor(backing: () => Backing | null, idb: IdbPort | null, overflowChars: number = OVERFLOW_CHARS) { this.backing = backing; this.idb = idb; this.overflowChars = overflowChars; }
  private fail(kind: SaveStoreFailure, key: string, error: unknown) {
    this.failures.push({kind, key, message: message(error)});
    if (this.failures.length > 20) this.failures.shift();
    console.warn(`Save storage ${kind} (${key}): ${message(error)}`);
  }
  private local() { return this.backing(); }
  getItem(key: string): string | null {
    const pending = this.pending.get(key);
    if (pending !== undefined) return pending;
    const raw = this.local()?.getItem(key) ?? null;
    if (raw === null || !raw.startsWith(POINTER_PREFIX)) return raw;
    const value = this.mirror.get(key);
    if (value !== undefined && String(value.length) === raw.slice(POINTER_PREFIX.length)) return value;
    this.fail('idb-missing-value', key, 'pointer present but the IndexedDB value is not loaded or does not match its length');
    return raw; // unparseable on purpose: hasSave() stays true, loaders refuse, the copy is kept
  }
  setItem(key: string, value: string): void {
    const local = this.local();
    if (!local) throw new Error('localStorage is unavailable');
    const big = value.length > this.overflowChars;
    if (!big) {
      try { local.setItem(key, value); } catch (error) {
        if (!isQuota(error)) throw error;
        if (!this.idb) { this.fail('idb-unavailable', key, error); throw error; }
        this.toIdb(key, value); return;
      }
      if (this.mirror.has(key) || this.pending.has(key)) { this.mirror.delete(key); this.pending.delete(key); this.enqueue(async () => { try { await this.idb?.delete(key); } catch (e) { this.fail('idb-write-failed', key, e); } }); }
      return;
    }
    if (!this.idb) { // no IndexedDB: an oversized value still gets one chance in localStorage, and fails loudly if it does not fit
      try { local.setItem(key, value); return; } catch (error) { this.fail('idb-unavailable', key, error); throw error; }
    }
    this.toIdb(key, value);
  }
  removeItem(key: string): void { this.local()?.removeItem?.(key); this.mirror.delete(key); this.pending.delete(key); this.enqueue(async () => { try { await this.idb?.delete(key); } catch (e) { this.fail('idb-write-failed', key, e); } }); }
  private toIdb(key: string, value: string) {
    this.pending.set(key, value);
    this.enqueue(async () => {
      if (this.pending.get(key) !== value) return; // superseded by a newer write
      try {
        await this.idb!.put(key, value);
      } catch (error) { this.fail('idb-write-failed', key, error); return; } // stays pending (readable this session); localStorage keeps its last durable value
      if (this.pending.get(key) !== value) return;
      try { this.local()?.setItem(key, POINTER_PREFIX + value.length); } catch (error) { this.fail('pointer-write-failed', key, error); return; }
      this.mirror.set(key, value); this.pending.delete(key);
    });
  }
  private enqueue(job: () => Promise<void>) { this.chain = this.chain.then(job, job); }
  /** Resolves when every queued IndexedDB write has settled (tests, page-hide flush). */
  flush(): Promise<void> { return this.chain; }
  /** Load every pointed-to value into the mirror. Safe to call again (storage events from other tabs). */
  async hydrate(keys?: readonly string[]): Promise<void> {
    const local = this.local();
    if (!local) return;
    const list = keys ?? this.pointerKeys();
    for (const key of list) {
      const raw = local.getItem(key);
      if (!raw || !raw.startsWith(POINTER_PREFIX)) continue;
      if (!this.idb) { this.fail('idb-unavailable', key, 'a save lives in IndexedDB but IndexedDB is unavailable'); continue; }
      try { const value = await this.idb.get(key); if (value === undefined) this.fail('idb-missing-value', key, 'IndexedDB has no value for this pointer'); else this.mirror.set(key, value); } catch (error) { this.fail('idb-read-failed', key, error); }
    }
  }
  private pointerKeys(): string[] {
    const out: string[] = [], local = this.local() as (Backing & {length?: number; key?: (i: number) => string | null}) | null;
    if (!local || typeof local.length !== 'number' || !local.key) return out;
    for (let i = 0; i < local.length; i++) { const k = local.key(i); if (k && local.getItem(k)?.startsWith(POINTER_PREFIX)) out.push(k); }
    return out;
  }
  status(): SaveStoreStatus {
    const idbKeys = [...new Set([...this.mirror.keys(), ...this.pending.keys()])];
    return {backend: idbKeys.length ? 'localStorage+indexedDB' : 'localStorage', failures: [...this.failures], pending: this.pending.size, idbKeys};
  }
}

const browserLocal = (): Backing | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
/** The one save storage every save path uses. */
export const saveStorage = new TieredSaveStorage(browserLocal, (() => { try { return createIndexedDbPort(); } catch { return null; } })());
export const hydrateSaveStorage = () => saveStorage.hydrate();
export const saveStorageStatus = () => saveStorage.status();
