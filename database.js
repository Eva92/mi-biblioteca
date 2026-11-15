
const Database = (() => {
  const DB_NAME = "MiBibliotecaDB";
  const VERSION = 1;
  let db;

  function open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB no disponible"));
        return;
      }

      const request = indexedDB.open(DB_NAME, VERSION);

      request.onupgradeneeded = event => {
        const database = event.target.result;

        if (!database.objectStoreNames.contains("books")) {
          database.createObjectStore("books", {
            keyPath: "id"
          });
        }

        if (!database.objectStoreNames.contains("readings")) {
          const store = database.createObjectStore("readings", {
            keyPath: "id"
          });

          store.createIndex("year", "year", { unique: false });
          store.createIndex("bookId", "bookId", { unique: false });
        }
      };

      request.onsuccess = () => {
        db = request.result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  function request(storeName, mode, action) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const operation = action(transaction.objectStore(storeName));

      operation.onsuccess = () => resolve(operation.result);
      operation.onerror = () => reject(operation.error);
    });
  }

  function all(store) {
    return request(store, "readonly", s => s.getAll());
  }

  function getBooks() {
    return all("books");
  }

  function getReadings() {
    return all("readings");
  }

  function saveBook(book) {
    return request("books", "readwrite", s => s.put(book));
  }

  function deleteBook(id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ["books", "readings"], "readwrite"
      );

      transaction.objectStore("books").delete(id);

      const readings = transaction.objectStore("readings");
      const index = readings.index("bookId");
      const cursor = index.openCursor(IDBKeyRange.only(id));

      cursor.onsuccess = () => {
        const item = cursor.result;
        if (item) {
          item.delete();
          item.continue();
        }
      };

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function addReading(reading) {
    return request("readings", "readwrite", s => s.add(reading));
  }

  function deleteReading(id) {
    return request("readings", "readwrite", s => s.delete(id));
  }

  async function exportData() {
    return {
      version: 1,
      books: await getBooks(),
      readings: await getReadings()
    };
  }

  function importData(data) {
    if (!data || !Array.isArray(data.books) ||
        !Array.isArray(data.readings)) {
      return Promise.reject(new Error("Copia no válida"));
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ["books", "readings"], "readwrite"
      );

      const books = transaction.objectStore("books");
      const readings = transaction.objectStore("readings");

      books.clear();
      readings.clear();

      data.books.forEach(book => books.put(book));
      data.readings.forEach(reading => readings.put(reading));

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  return {
    open,
    getBooks,
    getReadings,
    saveBook,
    deleteBook,
    addReading,
    deleteReading,
    exportData,
    importData
  };
})();
