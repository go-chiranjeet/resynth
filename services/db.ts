export const saveFilesToDB = (files: File[]): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ResSynthDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.put(files, 'current_files');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getFilesFromDB = (): Promise<File[] | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ResSynthDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        resolve(null);
        return;
      }
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const getReq = store.get('current_files');
      getReq.onsuccess = () => {
        const result = getReq.result;
        if (Array.isArray(result)) {
          resolve(result);
        } else if (result instanceof File) {
          // Backward compatibility
          resolve([result]);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearFilesFromDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ResSynthDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        resolve(true);
        return;
      }
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.delete('current_files');
      store.delete('current_file'); // Clear old single file if it exists
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};
