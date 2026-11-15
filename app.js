
// ========================================
// MI BIBLIOTECA KINDLE
// APLICACIÓN PRINCIPAL
// ========================================

let books = [];
let currentFilter = "Todos";
let editingId = null;

const form = document.getElementById("bookForm");
const bookList = document.getElementById("bookList");
const search = document.getElementById("search");

const $ = id => document.getElementById(id);

// CREAR ELEMENTOS DE FORMA SEGURA

function element(tag, className, text) {

  const el = document.createElement(tag);

  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;

  return el;
}

// INICIALIZAR

async function initializeApp() {

  try {

    await openDatabase();

    $("dbStatus").textContent =
      "BASE DE DATOS LOCAL CONECTADA";

    await loadLibrary();

  } catch (error) {

    console.error(error);

    $("dbStatus").textContent =
      "ERROR: NO SE PUEDE ABRIR LA BASE DE DATOS";

    alert("No se pudo abrir IndexedDB en este navegador.");

  }
}

// CARGAR LIBROS

async function loadLibrary() {

  books = await getBooks();

  books.sort((a, b) =>
    b.id - a.id
  );

  render();

}

// REGISTRAR O ACTUALIZAR

form.addEventListener("submit", async function(event) {

  event.preventDefault();

  const totalPages = Number($("totalPages").value || 0);
  const pagesRead = Number($("pagesRead").value || 0);

  const book = {

    title: $("title").value.trim(),
    author: $("author").value.trim(),

    genre: $("genre").value,
    publisher: $("publisher").value.trim(),
    isbn: $("isbn").value.trim(),

    status: $("status").value,
    rating: Number($("rating").value),

    totalPages,
    pagesRead,

    startDate: $("startDate").value,
    finishDate: $("finishDate").value,

    approximateDate: $("approximateDate").checked,

    notes: $("notes").value.trim()

  };

  if (!book.title || !book.author) {
    alert("Debes introducir título y autor.");
    return;
  }

  if (
    totalPages < 0 ||
    pagesRead < 0 ||
    (totalPages > 0 && pagesRead > totalPages)
  ) {
    alert("Comprueba el número de páginas.");
    return;
  }

  if (
    book.startDate &&
    book.finishDate &&
    book.finishDate < book.startDate
  ) {
    alert("La fecha de finalización no puede ser anterior al inicio.");
    return;
  }

  try {

    if (editingId !== null) {

      await updateBook(editingId, book);

    } else {

      await addBook(book);

    }

    resetForm();
    await loadLibrary();

    alert("Libro guardado correctamente.");

  } catch (error) {

    console.error(error);
    alert("No se pudo guardar el libro: " + error.message);

  }

});

// REINICIAR FORMULARIO

function resetForm() {

  form.reset();

  editingId = null;

  $("formTitle").textContent = "AÑADIR UN LIBRO";
  $("saveButton").textContent = "GUARDAR LIBRO";
  $("cancelEdit").hidden = true;

}

// CANCELAR EDICIÓN

$("cancelEdit").addEventListener("click", resetForm);

// EDITAR LIBRO

async function editBook(id) {

  const book = await getBook(id);

  if (!book) return;

  editingId = id;

  $("title").value = book.title;
  $("author").value = book.author;

  $("genre").value = book.genre || "";
  $("publisher").value = book.publisher || "";
  $("isbn").value = book.isbn || "";

  $("status").value = book.status;
  $("rating").value = book.rating;

  $("totalPages").value = book.totalPages || "";
  $("pagesRead").value = book.pagesRead || 0;

  $("startDate").value = book.startDate || "";
  $("finishDate").value = book.finishDate || "";

  $("approximateDate").checked =
    Boolean(book.approximateDate);

  $("notes").value = book.notes || "";

  $("formTitle").textContent = "EDITAR LIBRO";
  $("saveButton").textContent = "GUARDAR CAMBIOS";
  $("cancelEdit").hidden = false;

  $("formSection").scrollIntoView();

}

// ELIMINAR LIBRO

async function removeBook(id) {

  if (!confirm("¿Quieres eliminar este libro?")) return;

  try {

    await deleteBook(id);
    await loadLibrary();

  } catch (error) {

    alert("No se pudo eliminar el libro.");

  }

}

// CAMBIAR ESTADO

async function changeStatus(id, status) {

  const changes = { status };

  if (status === "Terminado") {

    const book = await getBook(id);

    if (!book.finishDate) {
      changes.finishDate = new Date().toISOString().slice(0, 10);
    }

  }

  try {

    await updateBook(id, changes);
    await loadLibrary();

  } catch (error) {

    alert("No se pudo actualizar el estado.");

  }

}

// CAMBIAR VALORACIÓN

async function changeRating(id, rating) {

  try {

    await updateBook(id, {
      rating: Number(rating)
    });

    await loadLibrary();

  } catch (error) {

    alert("No se pudo guardar la valoración.");

  }

}

// CAMBIAR PÁGINAS

async function changePages(id, value) {

  const book = await getBook(id);

  if (!book) return;

  const pages = Number(value);

  if (
    !Number.isInteger(pages) ||
    pages < 0 ||
    (book.totalPages > 0 && pages > book.totalPages)
  ) {
    alert("Número de páginas no válido.");
    return;
  }

  try {

    await updateBook(id, {
      pagesRead: pages
    });

    await loadLibrary();

  } catch (error) {

    alert("No se pudieron actualizar las páginas.");

  }

}

// BUSCADOR Y FILTROS

search.addEventListener("input", render);

$("filter").addEventListener("change", function() {

  currentFilter = this.value;
  render();

});

$("genreFilter").addEventListener("change", render);

$("historyYear").addEventListener("change", renderHistory);

// MOSTRAR COLECCIÓN

function render() {

  const query = search.value.toLowerCase().trim();
  const genre = $("genreFilter").value;

  const filtered = books.filter(book => {

    const matchesSearch =
      (book.title + " " + book.author)
      .toLowerCase()
      .includes(query);

    const matchesStatus =
      currentFilter === "Todos" ||
      book.status === currentFilter;

    const matchesGenre =
      genre === "Todos" ||
      book.genre === genre;

    return matchesSearch && matchesStatus && matchesGenre;

  });

  bookList.innerHTML = "";

  if (filtered.length === 0) {

    bookList.appendChild(
      element("p", "empty", "NO HAY LIBROS PARA MOSTRAR")
    );

  }

  filtered.forEach(book => {

    const card = element("article", "book");

    card.appendChild(
      element("h3", "", book.title)
    );

    card.appendChild(
      element("p", "author", "Autor: " + book.author)
    );

    card.appendChild(
      element("span", "status", book.status)
    );

    card.appendChild(
      element(
        "p",
        "book-info",
        "Género: " + (book.genre || "Sin especificar")
      )
    );

    if (book.publisher) {
      card.appendChild(
        element("p", "book-info", "Editorial: " + book.publisher)
      );
    }

    if (book.isbn) {
      card.appendChild(
        element("p", "book-info", "ISBN: " + book.isbn)
      );
    }

    card.appendChild(
      element(
        "div",
        "stars",
        "★".repeat(book.rating) +
        "☆".repeat(5 - book.rating)
      )
    );

    if (book.totalPages > 0) {

      card.appendChild(
        element(
          "p",
          "book-info",
          `Páginas: ${book.pagesRead} de ${book.totalPages}`
        )
      );

      const progress = element("div", "book-progress");
      const fill = document.createElement("div");

      fill.style.width =
        Math.min(100, book.pagesRead / book.totalPages * 100) + "%";

      progress.appendChild(fill);
      card.appendChild(progress);

    }

    if (book.startDate) {

      card.appendChild(
        element("p", "book-info", "Inicio: " + book.startDate)
      );

    }

    if (book.finishDate) {

      card.appendChild(
        element(
          "p",
          "book-info",
          "Finalización: " + book.finishDate +
          (book.approximateDate ? " (aproximada)" : "")
        )
      );

    }

    if (book.approximateDate && !book.finishDate && book.startDate) {

      card.appendChild(
        element("p", "book-info", "Fecha aproximada")
      );

    }

    if (book.notes) {

      card.appendChild(
        element("div", "notes", book.notes)
      );

    }

    const actions = element("div", "book-actions");

    const statusSelect = document.createElement("select");

    ["Pendiente", "Leyendo", "Terminado"].forEach(value => {

      const option = element("option", "", value);
      option.value = value;
      statusSelect.appendChild(option);

    });

    statusSelect.value = book.status;

    statusSelect.addEventListener("change", () => {
      changeStatus(book.id, statusSelect.value);
    });

    const ratingSelect = document.createElement("select");

    for (let i = 0; i <= 5; i++) {

      const option = element(
        "option",
        "",
        i === 0 ? "Sin valorar" : "⭐".repeat(i)
      );

      option.value = i;
      ratingSelect.appendChild(option);

    }

    ratingSelect.value = book.rating;

    ratingSelect.addEventListener("change", () => {
      changeRating(book.id, ratingSelect.value);
    });

    const editButton = element("button", "", "EDITAR");

    editButton.addEventListener("click", () => {
      editBook(book.id);
    });

    const deleteButton = element("button", "delete", "ELIMINAR");

    deleteButton.addEventListener("click", () => {
      removeBook(book.id);
    });

    actions.append(
      statusSelect,
      ratingSelect,
      editButton,
      deleteButton
    );

    card.appendChild(actions);

    if (book.totalPages > 0) {

      const pageInput = document.createElement("input");

      pageInput.type = "number";
      pageInput.min = "0";
      pageInput.max = String(book.totalPages);
      pageInput.value = book.pagesRead;
      pageInput.setAttribute("aria-label", "Páginas leídas");

      const pageButton = element(
        "button",
        "",
        "ACTUALIZAR PÁGINAS"
      );

      pageButton.addEventListener("click", () => {
        changePages(book.id, pageInput.value);
      });

      card.append(pageInput, pageButton);

    }

    bookList.appendChild(card);

  });

  updateGenreOptions();
  updateHistoryYears();
  updateStats();

}

// ACTUALIZAR GÉNEROS

function updateGenreOptions() {

  const select = $("genreFilter");
  const previous = select.value;

  const genres = [...new Set(
    books.map(book => book.genre).filter(Boolean)
  )].sort();

  select.innerHTML = "";

  const all = element("option", "", "Todos los géneros");
  all.value = "Todos";
  select.appendChild(all);

  genres.forEach(genre => {

    const option = element("option", "", genre);
    option.value = genre;
    select.appendChild(option);

  });

  select.value = genres.includes(previous) ? previous : "Todos";

}

// ACTUALIZAR ESTADÍSTICAS

function updateStats() {

  const total = books.length;

  const reading = books.filter(
    book => book.status === "Leyendo"
  ).length;

  const finished = books.filter(
    book => book.status === "Terminado"
  ).length;

  const pending = books.filter(
    book => book.status === "Pendiente"
  ).length;

  const pages = books.reduce(
    (sum, book) => sum + book.pagesRead,
    0
  );

  const rated = books.filter(book => book.rating > 0);

  const average = rated.length
    ? (rated.reduce((sum, book) => sum + book.rating, 0) /
       rated.length).toFixed(1)
    : "0";

  const percentage = total
    ? Math.round(finished / total * 100)
    : 0;

  $("total").textContent = total;
  $("reading").textContent = reading;
  $("finished").textContent = finished;
  $("pending").textContent = pending;

  $("pagesTotal").textContent = pages;
  $("averageRating").textContent = average + " / 5";

  $("progressText").textContent =
    percentage + "% de libros terminados";

  $("progressBar").style.width = percentage + "%";

  $("progressDetail").textContent =
    finished + " de " + total + " libros completados";

}

// HISTORIAL POR AÑO

function getReadingYear(book) {

  const date = book.finishDate || book.startDate;

  return date ? date.slice(0, 4) : "Sin fecha";

}

function updateHistoryYears() {

  const select = $("historyYear");
  const previous = select.value;

  const years = [...new Set(
    books
      .map(getReadingYear)
      .filter(year => year !== "Sin fecha")
  )].sort().reverse();

  select.innerHTML = "";

  const all = element("option", "", "Todos los años");
  all.value = "Todos";
  select.appendChild(all);

  years.forEach(year => {

    const option = element("option", "", year);
    option.value = year;
    select.appendChild(option);

  });

  const noDate = books.some(
    book => getReadingYear(book) === "Sin fecha"
  );

  if (noDate) {

    const option = element("option", "", "Sin fecha");
    option.value = "Sin fecha";
    select.appendChild(option);

  }

  select.value =
    previous === "Todos" ||
    years.includes(previous) ||
    (previous === "Sin fecha" && noDate)
      ? previous
      : "Todos";

  renderHistory();

}

function renderHistory() {

  const container = $("historyList");
  const year = $("historyYear").value;

  container.innerHTML = "";

  const history = books.filter(book => {

    const bookYear = getReadingYear(book);

    return book.status === "Terminado" &&
      (year === "Todos" || bookYear === year);

  });

  history.sort((a, b) =>
    (b.finishDate || b.startDate || "")
      .localeCompare(a.finishDate || a.startDate || "")
  );

  if (!history.length) {

    container.appendChild(
      element("p", "empty", "NO HAY LECTURAS TERMINADAS EN ESTE PERÍODO")
    );

    return;

  }

  const groups = {};

  history.forEach(book => {

    const key = getReadingYear(book);

    if (!groups[key]) groups[key] = [];

    groups[key].push(book);

  });

  Object.keys(groups).sort().reverse().forEach(key => {

    const group = element("div", "history-year");

    group.appendChild(
      element("h3", "", key === "Sin fecha" ? key : "AÑO " + key)
    );

    groups[key].forEach(book => {

      const item = element(
        "div",
        "history-book",
        book.title + " — " + book.author
      );

      group.appendChild(item);

    });

    container.appendChild(group);

  });

}

// EXPORTAR COPIA DE SEGURIDAD

$("exportBtn").addEventListener("click", async function() {

  try {

    const data = await exportBooks();

    const backup = {
      application: "Mi Biblioteca Kindle",
      version: 1,
      exportDate: new Date().toISOString(),
      books: data
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "MiBibliotecaKindle-backup.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    alert("Copia de seguridad preparada.");

  } catch (error) {

    console.error(error);
    alert("No se pudo exportar la biblioteca.");

  }

});

// IMPORTAR COPIA DE SEGURIDAD

$("importBtn").addEventListener("click", async function() {

  const file = $("importFile").files[0];

  if (!file) {
    alert("Selecciona primero un archivo JSON.");
    return;
  }

  if (!confirm(
    "Se añadirán los libros de la copia a tu biblioteca actual. ¿Continuar?"
  )) return;

  try {

    const content = await file.text();
    const backup = JSON.parse(content);

    const importedBooks = Array.isArray(backup)
      ? backup
      : backup.books;

    await importBooks(importedBooks);

    $("importFile").value = "";

    await loadLibrary();

    alert("Biblioteca importada correctamente.");

  } catch (error) {

    console.error(error);

    alert("No se pudo importar: " + error.message);

  }

});

// INICIAR

initializeApp();
