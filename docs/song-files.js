export const MAX_SONG_FILE_BYTES = 10 * 1024 * 1024;
export function filePath(owner, songId, fileId, name) {
  if (!/^[0-9a-f-]{36}$/i.test(owner) || !/^[a-zA-Z0-9_-]{1,200}$/.test(songId) || !/^[a-zA-Z0-9_-]{1,200}$/.test(fileId)) throw new Error("Invalid attachment owner or song.");
  return owner + "/" + songId + "/" + fileId + "-" + name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.{2,}/g, "-").slice(0, 120);
}
export async function deviceFile(operation, key, blob) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("faithful-repertoire-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error("Device file storage is unavailable."));
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("files", operation === "get" ? "readonly" : "readwrite");
      const store = transaction.objectStore("files"), request = operation === "put" ? store.put(blob, key) : operation === "delete" ? store.delete(key) : store.get(key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(new Error("Device file storage failed or is full."));
      transaction.onabort = () => reject(new Error("Device file storage failed or is full."));
    });
  } finally { db.close(); }
}
