/**
 * Persistent Screen Recording Storage using Browser IndexedDB.
 * Allows exam screen recordings to persist locally across page refreshes,
 * navigation, and between student and teacher user sessions.
 */

const DB_NAME = 'verity_exam_proctoring';
const DB_VERSION = 1;
const STORE_NAME = 'screen_recordings';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'attemptId' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Save an exam screen recording Blob to IndexedDB
 */
export async function persistRecording(attemptId, blob, metadata = {}) {
  if (!attemptId || !blob) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        attemptId,
        blob,
        duration: metadata.duration || 0,
        createdAt: new Date().toISOString(),
        studentName: metadata.studentName || '',
        assessmentTitle: metadata.assessmentTitle || '',
        mimeType: blob.type || 'video/webm',
      };

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (err) {
    console.warn('Could not persist screen recording to IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieve a screen recording from IndexedDB by attemptId
 */
export async function getPersistedRecording(attemptId) {
  if (!attemptId) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(attemptId);

      getReq.onsuccess = () => {
        const result = getReq.result;
        if (!result || !result.blob) {
          resolve(null);
          return;
        }
        const url = URL.createObjectURL(result.blob);
        resolve({
          ...result,
          url,
        });
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('Could not retrieve screen recording from IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieve all persisted recordings
 */
export async function getAllPersistedRecordings() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []).map((rec) => ({
          ...rec,
          url: rec.blob ? URL.createObjectURL(rec.blob) : null,
        }));
        resolve(records);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not fetch recordings from IndexedDB:', err);
    return [];
  }
}
