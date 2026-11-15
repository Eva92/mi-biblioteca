
let books = [];
let editingId = null;

const $ = id => document.getElementById(id);

function makeElement(tag, text, className) {

  const element = document.createElement(tag);

  element.textContent = text;

  if (className) element.className = className;

  return element;

}

// NAVEGACIÓN

$("showBooks").onclick = () => {

  $("booksSection").hidden = false;
  $("yearSection").hidden = true;

  $("showBooks").classList.add("active");
  $("showYear").classList.remove("active");

};

$("showYear").onclick = async () => {

  $("booksSection").hidden = true;
  $("yearSection").hidden = false;

  $("showYear").classList.add("active");
  $("showBooks").classList.remove("active");

  await renderYear();

};

// INICIO

async function init() {

  try {

    await openDatabase();

    $("dbStatus").textContent = "BASE DE DATOS CONECTADA";

    const yearSelect = $("year");
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 10; year <= currentYear + 1; year++) {

      const option = makeElement("option", String(year));
      option.value = year;

      if (year === currentYear) option.selected = true;

      yearSelect.appendChild(option);

    }

    await renderBooks();
    await renderSelector();

  } catch (error) {

    console.error(error);

    $("dbStatus").textContent = "ERROR DE BASE DE DATOS";

    alert("No se pudo abrir la base de datos.");

  }

}

// GUARDAR LIBRO

$("bookForm").onsubmit = async event => {

  event.preventDefault();

  const book = {

    title: $("title").value.trim(),
    author: $("author").value.trim(),
    status: $("status").value,
    notes: $("notes").value.trim()

  };

  if (!book.title || !book.author) return;

  try {

    if (editingId !== null) {

      const existing = books.find(b => b.id === editingId);

      await updateBook({
        ...existing,
        ...book
      });

    } else {

      await addBook(book);

    }

    resetForm();

    await renderBooks();
    await renderSelector();

    alert("Libro guardado.");

  } catch (error) {

    alert("Error al guardar el libro.");

  }

};

// LIMPIAR FORMULARIO

function resetForm() {

  $("bookForm").reset();

  editingId = null;

  $("cancelEdit").hidden = true;

}

$("cancelEdit").onclick = resetForm;

// MOSTRAR LIBROS

async function renderBooks() {

  books = await getBooks();

  const list = $("bookList");
  const query = $("search").value.toLowerCase().trim();

  list.innerHTML = "";

  const filtered = books.filter(book =>
    (book.title + " " + book.author)
      .toLowerCase()
      .includes(query)
  );

  if (!filtered.length) {

    list.appendChild(
      makeElement("p", "No hay libros registrados.", "empty")
    );

  }

  filtered.forEach(book => {

    const card = makeElement("article", "", "book");

    card.appendChild(
      makeElement("h3", book.title)
    );

    card.appendChild(
      makeElement("p", "Autor: " + book.author)
    );

    card.appendChild(
      makeElement("p", "Estado: " + book.status)
    );

    if (book.notes) {
      card.appendChild(
        makeElement("p", "Notas: " + book.notes)
      );
    }

    const actions = makeElement("div", "", "book-actions");

    const edit = makeElement("button", "EDITAR");

    edit.onclick = () => {

      editingId = book.id;

      $("title").value = book.title;
      $("author").value = book.author;
      $("status").value = book.status;
      $("notes").value = book.notes;

      $("cancelEdit").hidden = false;

      $("booksSection").scrollIntoView();

    };

    const remove = makeElement("button", "ELIMINAR");

    remove.onclick = async () => {

      if (!confirm("¿Eliminar este libro?")) return;

      await deleteBook(book.id);

      await renderBooks();
      await renderSelector();
      await renderYear();

    };

    actions.append(edit, remove);
    card.appendChild(actions);

    list.appendChild(card);

  });

}

$("search").oninput = renderBooks;

// SELECTOR DE LIBROS

async function renderSelector() {

  books = await getBooks();

  const selector = $("bookSelector");

  selector.innerHTML = "";

  books.forEach(book => {

    const option = makeElement(
      "option",
      book.title + " — " + book.author
    );

    option.value = book.id;

    selector.appendChild(option);

  });

  $("addYearBook").disabled = books.length === 0;

}

// AÑADIR LIBRO AL AÑO

$("addYearBook").onclick = async () => {

  const bookId = Number($("bookSelector").value);
  const year = Number($("year").value);

  if (!bookId) {
    alert("Selecciona un libro.");
    return;
  }

  try {

    const currentReads = await getYearlyReads(year);

    if (currentReads.some(read => read.bookId === bookId)) {
      alert("Este libro ya está en las lecturas del año.");
      return;
    }

    await addYearlyRead(bookId, year);

    await renderYear();

    alert("Libro añadido al historial anual.");

  } catch (error) {

    alert("No se pudo añadir el libro.");

  }

};

// MOSTRAR HISTORIAL ANUAL

async function renderYear() {

  const year = Number($("year").value);

  const reads = await getYearlyReads(year);
  books = await getBooks();

  const list = $("yearList");

  list.innerHTML = "";

  let count = 0;

  for (const read of reads) {

    const book = books.find(b => b.id === read.bookId);

    if (!book) continue;

    count++;

    const card = makeElement("article", "", "year-book");

    card.appendChild(
      makeElement("strong", book.title)
    );

    card.appendChild(
      makeElement("p", book.author)
    );

    const remove = makeElement(
      "button",
      "QUITAR DEL AÑO"
    );

    remove.onclick = async () => {

      if (!confirm("¿Quitar este libro de las lecturas del año?")) return;

      await deleteYearlyRead(read.id);

      await renderYear();

    };

    card.appendChild(remove);

    list.appendChild(card);

  }

  $("yearTotal").textContent =
    count + (count === 1 ? " libro registrado" : " libros registrados");

  if (!count) {

    list.appendChild(
      makeElement("p", "Todavía no has añadido lecturas a este año.", "empty")
    );

  }

}

$("year").onchange = renderYear;

// ARRANCAR

init();

// ======================================
// NAVEGACIÓN DE COPIAS DE SEGURIDAD
// ======================================

$("showBackup").onclick = () => {

  $("booksSection").hidden = true;
  $("yearSection").hidden = true;
  $("backupSection").hidden = false;

  $("showBooks").classList.remove("active");
  $("showYear").classList.remove("active");
  $("showBackup").classList.add("active");

};


// ======================================
// EXPORTAR HISTORIAL TXT
// ======================================

$("exportBackup").onclick = async () => {

  try {

    const allBooks = await getBooks();

    // Obtener todas las lecturas de los años disponibles
    const transaction = db.transaction(
      "yearlyReads",
      "readonly"
    );

    const request = transaction
      .objectStore("yearlyReads")
      .getAll();

    const allReads = await new Promise((resolve, reject) => {

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

    });

    const backup = {
      application: "Mi Biblioteca Kindle",
      format: "MiBibliotecaBackup",
      version: 1,
      exportDate: new Date().toISOString(),
      books: allBooks,
      yearlyReads: allReads
    };

    const content =
      "COPIA DE SEGURIDAD - MI BIBLIOTECA\n" +
      "No modificar el contenido de este archivo.\n\n" +
      JSON.stringify(backup, null, 2);

    const blob = new Blob(
      ["\uFEFF", content],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "MiBiblioteca-Historial.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 5000);

    $("backupMessage").textContent =
      "Copia de seguridad preparada.";

  } catch (error) {

    console.error(error);

    $("backupMessage").textContent =
      "No se pudo guardar el historial.";

  }

};


// ======================================
// RESTAURAR HISTORIAL TXT
// ======================================

$("importBackup").onclick = async () => {

  const file = $("importBackupFile").files[0];

  if (!file) {

    alert("Selecciona primero un archivo TXT.");
    return;

  }

  if (!confirm(
    "ATENCIÓN: la restauración sustituirá todos los libros y lecturas actuales. ¿Deseas continuar?"
  )) return;

  try {

    const text = await file.text();

    const start = text.indexOf("{");

    if (start === -1) {
      throw new Error("Archivo no válido");
    }

    const backup = JSON.parse(text.slice(start));

    if (
      backup.format !== "MiBibliotecaBackup" ||
      backup.version !== 1 ||
      !Array.isArray(backup.books) ||
      !Array.isArray(backup.yearlyReads)
    ) {
      throw new Error("Formato de copia no compatible");
    }

    const validIds = new Set(
      backup.books.map(book => book.id)
    );

    const validBooks = backup.books.every(book =>
      Number.isInteger(book.id) &&
      typeof book.title === "string" &&
      typeof book.author === "string" &&
      typeof book.status === "string" &&
      typeof book.notes === "string"
    );

    const validReads = backup.yearlyReads.every(read =>
      Number.isInteger(read.id) &&
      Number.isInteger(read.year) &&
      validIds.has(read.bookId)
    );

    if (!validBooks || !validReads) {
      throw new Error("Los registros no son válidos");
    }

    await restoreBackup(backup);

    await renderBooks();
    await renderSelector();
    await renderYear();

    $("backupMessage").textContent =
      "Historial restaurado correctamente.";

    $("importBackupFile").value = "";

    alert("Tu biblioteca ha sido restaurada.");

  } catch (error) {

    console.error(error);

    $("backupMessage").textContent =
      "No se pudo restaurar. Comprueba que el TXT sea una copia válida.";

  }

};
