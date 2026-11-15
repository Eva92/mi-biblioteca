
// ========================================
// MI BIBLIOTECA KINDLE
// BASE DE DATOS INDEXEDDB
// ========================================

const DB_NAME = "MiBibliotecaKindle";
const DB_VERSION = 1;

let db = null;
let dbPromise = null;

// ABRIR BASE DE DATOS

function openDatabase() {

  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {

    if (!window.indexedDB) {
      dbPromise = null;
      reject(new Error("IndexedDB no está disponible."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function(event) {

      const database = event.target.result;

      if (!database.objectStoreNames.contains("books")) {

        const store = database.createObjectStore("books", {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("title", "title", {
          unique: false
        });

        store.createIndex("author", "author", {
          unique: false
        });

        store.createIndex("status", "status", {
          unique: false
        });

      }
    };

    request.onsuccess = function(event) {

      db = event.target.result;

      db.onversionchange = function() {
        db.close();
        db = null;
        dbPromise = null;
      };

      resolve(db);

    };

    request.onerror = function() {
      dbPromise = null;
      reject(request.error);
    };

    request.onblocked = function() {
      console.warn("La base de datos está bloqueada.");
    };

  });

  return dbPromise;
}

// VALIDAR LIBRO

function validateBook(book) {

  const statuses = [
    "Pendiente",
    "Leyendo",
    "Terminado"
  ];

  if (!book || typeof book !== "object") {
    throw new Error("Registro no válido.");
  }

  if (
    typeof book.title !== "string" ||
    !book.title.trim() ||
    typeof book.author !== "string" ||
    !book.author.trim()
  ) {
    throw new Error("El título y autor son obligatorios.");
  }

  if (!statuses.includes(book.status)) {
    throw new Error("Estado de lectura no válido.");
  }

  const rating = Number(book.rating || 0);
  const pages = Number(book.totalPages || 0);
  const read = Number(book.pagesRead || 0);

  if (
    !Number.isInteger(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    throw new Error("Valoración incorrecta.");
  }

  if (
    !Number.isInteger(pages) ||
    !Number.isInteger(read) ||
    pages < 0 ||
    read < 0 ||
    (pages > 0 && read > pages)
  ) {
    throw new Error("Número de páginas incorrecto.");
  }

  return true;
}

// AÑADIR LIBRO

async function addBook(book) {

  await openDatabase();
  validateBook(book);

  const newBook = {
    title: book.title.trim(),
    author: book.author.trim(),
    genre: book.genre || "",
    publisher: book.publisher || "",
    isbn: book.isbn || "",
    status: book.status,
    rating: Number(book.rating || 0),
    totalPages: Number(book.totalPages || 0),
    pagesRead: Number(book.pagesRead || 0),
    startDate: book.startDate || "",
    finishDate: book.finishDate || "",
    approximateDate: Boolean(book.approximateDate),
    notes: book.notes || "",
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {

    const transaction = db.transaction("books", "readwrite");
    const request = transaction.objectStore("books").add(newBook);

    let newId;

    request.onsuccess = () => {
      newId = request.result;
    };

    transaction.oncomplete = () => resolve(newId);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

  });
}

// OBTENER TODOS LOS LIBROS

async function getBooks() {

  await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction("books", "readonly");
    const request = transaction.objectStore("books").getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });
}

// OBTENER UN LIBRO

async function getBook(id) {

  await openDatabase();

  return new Promise((resolve, reject) => {

    const request = db.transaction("books", "readonly")
      .objectStore("books")
      .get(Number(id));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });
}

// ACTUALIZAR LIBRO

async function updateBook(id, changes) {

  await openDatabase();

  const current = await getBook(id);

  if (!current) {
    throw new Error("No se encuentra el libro.");
  }

  const updated = {
    ...current,
    ...changes,
    id: current.id,
    updatedAt: new Date().toISOString()
  };

  validateBook(updated);

  return new Promise((resolve, reject) => {

    const transaction = db.transaction("books", "readwrite");

    transaction.objectStore("books").put(updated);

    transaction.oncomplete = () => resolve(updated);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

  });
}

// ELIMINAR LIBRO

async function deleteBook(id) {

  await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction("books", "readwrite");

    transaction.objectStore("books").delete(Number(id));

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

  });
}

// EXPORTAR BIBLIOTECA

async function exportBooks() {
  return await getBooks();
}

// IMPORTAR BIBLIOTECA
// Los registros se incorporan sin borrar los existentes.

async function importBooks(importedBooks) {

  await openDatabase();

  if (!Array.isArray(importedBooks)) {
    throw new Error("El archivo no contiene una lista válida.");
  }

  if (importedBooks.length > 10000) {
    throw new Error("El archivo contiene demasiados libros.");
  }

  const cleanBooks = importedBooks.map(book => {

    validateBook(book);

    return {
      title: book.title.trim(),
      author: book.author.trim(),
      genre: book.genre || "",
      publisher: book.publisher || "",
      isbn: book.isbn || "",
      status: book.status,
      rating: Number(book.rating || 0),
      totalPages: Number(book.totalPages || 0),
      pagesRead: Number(book.pagesRead || 0),
      startDate: book.startDate || "",
      finishDate: book.finishDate || "",
      approximateDate: Boolean(book.approximateDate),
      notes: book.notes || "",
      createdAt: book.createdAt || new Date().toISOString()
    };

  });

  return new Promise((resolve, reject) => {

    const transaction = db.transaction("books", "readwrite");
    const store = transaction.objectStore("books");

    cleanBooks.forEach(book => store.add(book));

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

  });
}
