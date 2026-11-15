
const DB_NAME = "MiBibliotecaSimple";
const DB_VERSION = 1;

let db;

function openDatabase() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {

      const database = event.target.result;

      if (!database.objectStoreNames.contains("books")) {
        database.createObjectStore("books", {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!database.objectStoreNames.contains("yearlyReads")) {

        const store = database.createObjectStore("yearlyReads", {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("year", "year", {
          unique: false
        });

      }

    };

    request.onsuccess = event => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);

  });

}

function addBook(book) {

  return new Promise((resolve, reject) => {

    const request = db.transaction("books", "readwrite")
      .objectStore("books")
      .add(book);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });

}

function getBooks() {

  return new Promise((resolve, reject) => {

    const request = db.transaction("books", "readonly")
      .objectStore("books")
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });

}

function updateBook(book) {

  return new Promise((resolve, reject) => {

    const request = db.transaction("books", "readwrite")
      .objectStore("books")
      .put(book);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);

  });

}

function deleteBook(id) {

  return new Promise((resolve, reject) => {

    const request = db.transaction("books", "readwrite")
      .objectStore("books")
      .delete(Number(id));

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);

  });

}

function addYearlyRead(bookId, year) {

  return new Promise((resolve, reject) => {

    const request = db.transaction("yearlyReads", "readwrite")
      .objectStore("yearlyReads")
      .add({
        bookId: Number(bookId),
        year: Number(year)
      });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });

}

function getYearlyReads(year) {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction("yearlyReads", "readonly");
    const index = transaction.objectStore("yearlyReads").index("year");
    const request = index.getAll(Number(year));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });

}

function deleteYearlyRead(id) {

  return new Promise((resolve, reject) => {

    const request = db.transaction("yearlyReads", "readwrite")
      .objectStore("yearlyReads")
      .delete(Number(id));

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);

  });

}
