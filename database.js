
const Database = (() => {

  const DB_NAME = "MiBibliotecaDB";
  const DB_VERSION = 1;

  let db = null;

  function open() {
    return new Promise((resolve, reject) => {

      if (!window.indexedDB) {
        reject(new Error("IndexedDB no disponible"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

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

          store.createIndex("year", "year", {
            unique: false
          });

          store.createIndex("bookId", "bookId", {
            unique: false
          });
        }
      };

      request.onsuccess = () => {
        db = request.result;

        db.onversionchange = () => {
          db.close();
          db = null;
        };

        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

    });
  }

  function getAll(storeName) {
    return new Promise((resolve, reject) => {

      if (!db) {
        reject(new Error("Base de datos cerrada"));
        return;
      }

      const transaction = db.transaction(
        storeName,
        "readonly"
      );

      const request = transaction
        .objectStore(storeName)
        .getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

    });
  }

  function save(storeName, data) {
    return new Promise((resolve, reject) => {

      if (!db) {
        reject(new Error("Base de datos cerrada"));
        return;
      }

      const transaction = db.transaction(
        storeName,
        "readwrite"
      );

      const request = transaction
        .objectStore(storeName)
        .put(data);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);

    });
  }

  function removeBook(id) {
    return new Promise((resolve, reject) => {

      const transaction = db.transaction(
        ["books", "readings"],
        "readwrite"
      );

      transaction.objectStore("books").delete(id);

      const readings = transaction.objectStore("readings");
      const index = readings.index("bookId");

      const cursor = index.openCursor(
        IDBKeyRange.only(id)
      );

      cursor.onsuccess = () => {
        const item = cursor.result;

        if (item) {
          item.delete();
          item.continue();
        }
      };

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);

    });
  }

  function removeReading(id) {
    return new Promise((resolve, reject) => {

      const transaction = db.transaction(
        "readings",
        "readwrite"
      );

      transaction.objectStore("readings").delete(id);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);

    });
  }

  async function exportData() {
    return {
      application: "Mi Biblioteca",
      version: 1,
      exportDate: new Date().toISOString(),
      books: await getAll("books"),
      readings: await getAll("readings")
    };
  }

  function importData(data) {

    if (
      !data ||
      !Array.isArray(data.books) ||
      !Array.isArray(data.readings)
    ) {
      return Promise.reject(
        new Error("Formato de copia incorrecto")
      );
    }

    const bookIds = {};

    for (let i = 0; i < data.books.length; i++) {
      const book = data.books[i];

      if (
        !book ||
        typeof book.id !== "string" ||
        !book.id ||
        typeof book.title !== "string" ||
        typeof book.author !== "string" ||
        ["pendiente", "leyendo", "leido", "abandonado"]
          .indexOf(book.status) === -1
      ) {
        return Promise.reject(
          new Error("Hay libros con datos incorrectos")
        );
      }

      if (bookIds[book.id]) {
        return Promise.reject(
          new Error("Hay libros duplicados")
        );
      }

      bookIds[book.id] = true;
    }

    const readingIds = {};

    for (let i = 0; i < data.readings.length; i++) {
      const reading = data.readings[i];

      if (
        !reading ||
        typeof reading.id !== "string" ||
        typeof reading.bookId !== "string" ||
        !bookIds[reading.bookId] ||
        !Number.isInteger(Number(reading.year))
      ) {
        return Promise.reject(
          new Error("Hay lecturas con datos incorrectos")
        );
      }

      if (readingIds[reading.id]) {
        return Promise.reject(
          new Error("Hay lecturas duplicadas")
        );
      }

      readingIds[reading.id] = true;
    }

    return new Promise((resolve, reject) => {

      const transaction = db.transaction(
        ["books", "readings"],
        "readwrite"
      );

      const books = transaction.objectStore("books");
      const readings = transaction.objectStore("readings");

      books.clear();
      readings.clear();

      data.books.forEach(book => books.put(book));
      data.readings.forEach(reading => readings.put(reading));

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);

    });
  }

  return {
    open,

    getBooks: () => getAll("books"),
    getReadings: () => getAll("readings"),

    saveBook: book => save("books", book),
    deleteBook: removeBook,

    addReading: reading => save("readings", reading),
    deleteReading: removeReading,

    exportData,
    importData

  };

})();
