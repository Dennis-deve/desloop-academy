import type { Lesson } from '@/types';

export interface OfflineLesson {
  id: string;
  courseId: string;
  courseTitle: string;
  lesson: Lesson;
  savedAt: string;
}
const DB_NAME = 'desloop-offline-demo';
const STORE = 'lessons';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Offline storage is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open offline storage.'));
  });
}
function transaction<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore,
    finish: (value: T) => void,
    fail: (error: Error) => void,
  ) => void,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const finish = (value: T) => {
          db.close();
          resolve(value);
        };
        const fail = (error: Error) => {
          db.close();
          reject(error);
        };
        operation(store, finish, fail);
      }),
  );
}
export const offlineService = {
  save(item: OfflineLesson) {
    return transaction<void>('readwrite', (store, finish, fail) => {
      const request = store.put(item);
      request.onsuccess = () => finish();
      request.onerror = () => fail(new Error('Could not save this lesson.'));
    });
  },
  list() {
    return transaction<OfflineLesson[]>('readonly', (store, finish, fail) => {
      const request = store.getAll();
      request.onsuccess = () => finish(request.result as OfflineLesson[]);
      request.onerror = () => fail(new Error('Could not load saved lessons.'));
    });
  },
  remove(id: string) {
    return transaction<void>('readwrite', (store, finish, fail) => {
      const request = store.delete(id);
      request.onsuccess = () => finish();
      request.onerror = () => fail(new Error('Could not remove this lesson.'));
    });
  },
  clear() {
    return transaction<void>('readwrite', (store, finish, fail) => {
      const request = store.clear();
      request.onsuccess = () => finish();
      request.onerror = () => fail(new Error('Could not clear offline lessons.'));
    });
  },
};
